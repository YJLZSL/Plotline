use std::fs;
use std::path::{Path, PathBuf};

use chrono::Utc;

use crate::error::{AppError, AppResult};

/// 默认保留的最近备份份数。
pub const DEFAULT_MAX_BACKUPS: usize = 10;

/// 备份文件名前缀，便于在 `backups/` 内识别属于 Plotline 的文件。
const BACKUP_PREFIX: &str = "plotline-";
const BACKUP_SUFFIX: &str = ".db";

/// 在数据库文件同级目录下的 `backups/` 子目录中创建一份带 ISO8601 时间戳的备份，
/// 并将该目录裁剪到至多 `max_keep` 份。
///
/// - 当 `db_path` 不存在时返回 `AppError::NotFound`，调用方应将其视为"无需备份"。
/// - 复制失败、目录创建失败均归类为 `AppError::Io`。
/// - 清理旧备份失败仅写日志，不影响新备份成功后的返回结果。
pub fn backup_workspace_db(db_path: &Path, max_keep: usize) -> AppResult<PathBuf> {
    if !db_path.exists() {
        return Err(AppError::NotFound(format!(
            "数据库文件不存在: {}",
            db_path.display()
        )));
    }

    let parent = db_path
        .parent()
        .ok_or_else(|| AppError::InvalidInput("数据库路径缺少父目录".into()))?;
    let backups_dir = parent.join("backups");
    fs::create_dir_all(&backups_dir)?;

    let timestamp = Utc::now().format("%Y%m%dT%H%M%SZ").to_string();
    let target = backups_dir.join(format!("{BACKUP_PREFIX}{timestamp}{BACKUP_SUFFIX}"));

    fs::copy(db_path, &target)?;

    if let Err(err) = prune_old_backups(&backups_dir, max_keep) {
        log::warn!("[backup] prune failed: {err}");
    }

    Ok(target)
}

/// 按文件名升序排序后删除最旧的，只保留最新的 `max_keep` 份。
/// 命名包含 ISO8601 时间戳，文件名升序即时间升序。
pub fn prune_old_backups(backups_dir: &Path, max_keep: usize) -> AppResult<usize> {
    if !backups_dir.exists() {
        return Ok(0);
    }

    let mut entries: Vec<PathBuf> = fs::read_dir(backups_dir)?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| {
            if !path.is_file() {
                return false;
            }
            match path.file_name().and_then(|s| s.to_str()) {
                Some(name) => name.starts_with(BACKUP_PREFIX) && name.ends_with(BACKUP_SUFFIX),
                None => false,
            }
        })
        .collect();

    if entries.len() <= max_keep {
        return Ok(0);
    }

    entries.sort();
    let drop_count = entries.len() - max_keep;
    let mut removed = 0usize;
    for path in entries.iter().take(drop_count) {
        match fs::remove_file(path) {
            Ok(()) => removed += 1,
            Err(err) => log::warn!("[backup] remove {} failed: {err}", path.display()),
        }
    }
    Ok(removed)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread::sleep;
    use std::time::Duration;
    use tempfile::TempDir;

    fn touch(path: &Path) {
        fs::File::create(path).expect("create temp file");
    }

    #[test]
    fn first_backup_creates_directory_and_file() {
        let dir = TempDir::new().expect("tempdir");
        let db_path = dir.path().join("workspace.db");
        touch(&db_path);

        let backup =
            backup_workspace_db(&db_path, DEFAULT_MAX_BACKUPS).expect("backup should succeed");

        assert!(backup.exists(), "backup file should exist");
        assert!(
            dir.path().join("backups").is_dir(),
            "backups/ directory should exist"
        );
        let name = backup.file_name().unwrap().to_string_lossy().to_string();
        assert!(name.starts_with("plotline-"), "name should be prefixed");
        assert!(name.ends_with(".db"), "name should keep .db suffix");
    }

    #[test]
    fn missing_db_returns_not_found() {
        let dir = TempDir::new().expect("tempdir");
        let db_path = dir.path().join("does-not-exist.db");
        let err = backup_workspace_db(&db_path, DEFAULT_MAX_BACKUPS).unwrap_err();
        matches!(err, AppError::NotFound(_));
    }

    #[test]
    fn prune_keeps_only_latest_max_keep() {
        let dir = TempDir::new().expect("tempdir");
        let db_path = dir.path().join("workspace.db");
        touch(&db_path);

        for _ in 0..12 {
            backup_workspace_db(&db_path, DEFAULT_MAX_BACKUPS).expect("backup should succeed");
            // 时间戳精度为秒，需要短暂等待以避免文件名冲突。
            sleep(Duration::from_millis(1100));
        }

        let backups_dir = dir.path().join("backups");
        let count = fs::read_dir(&backups_dir)
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| e.path().is_file())
            .count();
        assert!(
            count <= DEFAULT_MAX_BACKUPS,
            "expected at most {DEFAULT_MAX_BACKUPS} backups, got {count}"
        );
    }

    #[test]
    fn prune_is_noop_when_under_threshold() {
        let dir = TempDir::new().expect("tempdir");
        let backups_dir = dir.path().join("backups");
        fs::create_dir_all(&backups_dir).unwrap();
        for i in 0..3 {
            touch(&backups_dir.join(format!("plotline-2025010{i}T000000Z.db")));
        }
        let removed = prune_old_backups(&backups_dir, 10).unwrap();
        assert_eq!(removed, 0);
    }
}
