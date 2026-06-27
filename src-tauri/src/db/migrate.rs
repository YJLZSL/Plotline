use rusqlite::Connection;

use crate::error::{AppError, AppResult};

/// 内嵌迁移文件。新增迁移时，追加 (version, sql) 元组。
const MIGRATIONS: &[(i64, &str)] = &[
    (1, include_str!("../../migrations/001_initial.sql")),
    (2, include_str!("../../migrations/002_map_and_vn.sql")),
    (3, include_str!("../../migrations/003_font_theme.sql")),
    (4, include_str!("../../migrations/004_ai_assistant.sql")),
    (5, include_str!("../../migrations/005_vn_assets.sql")),
    (6, include_str!("../../migrations/006_ai_system_prompt.sql")),
    (7, include_str!("../../migrations/007_workspace_updated_at_triggers.sql")),
    (8, include_str!("../../migrations/008_event_location.sql")),
    (9, include_str!("../../migrations/009_workspace_cover_image.sql")),
    (10, include_str!("../../migrations/010_outline_cover_image.sql")),
    (11, include_str!("../../migrations/011_event_images.sql")),
    (12, include_str!("../../migrations/012_novel_chapters.sql")),
    (13, include_str!("../../migrations/013_vn_sprites.sql")),
    (14, include_str!("../../migrations/014_reduce_motion.sql")),
    (15, include_str!("../../migrations/015_ai_cache.sql")),
    (16, include_str!("../../migrations/016_ai_cache_invalidation_triggers.sql")),
];

/// 创建 schema_migrations 表并依次执行迁移。
pub fn run(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );",
    )?;

    let current: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |r| r.get(0),
        )
        .unwrap_or(0);

    for (version, sql) in MIGRATIONS {
        if *version > current {
            log::info!("applying migration {}", version);
            conn.execute_batch(sql)
                .map_err(|e| AppError::Db(format!("migration {version} failed: {e}")))?;
            conn.execute(
                "INSERT INTO schema_migrations (version) VALUES (?1)",
                rusqlite::params![version],
            )?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::NamedTempFile;

    fn test_conn() -> Connection {
        let file = NamedTempFile::new().unwrap();
        let conn = Connection::open(file.path()).unwrap();
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();
        run(&conn).unwrap();
        conn
    }

    #[test]
    fn should_apply_initial_migration() {
        let conn = test_conn();
        let v: i64 = conn
            .query_row(
                "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(v, 16, "迁移 001-016 均应已应用");
    }

    #[test]
    fn should_create_workspaces_table() {
        let conn = test_conn();
        conn.execute(
            "INSERT INTO workspaces (id, name, created_at, updated_at) VALUES ('1', 'a', 't', 't')",
            [],
        )
        .unwrap();
        let name: String = conn
            .query_row("SELECT name FROM workspaces WHERE id='1'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(name, "a");
    }

    #[test]
    fn should_seed_app_settings() {
        let conn = test_conn();
        let theme: String = conn
            .query_row("SELECT theme FROM app_settings WHERE id=1", [], |r| {
                r.get(0)
            })
            .unwrap();
        assert_eq!(theme, "light");
    }

    #[test]
    fn should_be_idempotent() {
        let conn = test_conn();
        run(&conn).unwrap();
        let v: i64 = conn
            .query_row(
                "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(v, 16, "重复执行迁移不应改变版本号");
    }

    #[test]
    fn child_entity_change_updates_workspace_updated_at() {
        let conn = test_conn();
        conn.execute(
            "INSERT INTO workspaces (id, name, created_at, updated_at) VALUES ('w1', 'w', 't', 't')",
            [],
        )
        .unwrap();
        let before: String = conn
            .query_row("SELECT updated_at FROM workspaces WHERE id='w1'", [], |r| r.get(0))
            .unwrap();
        std::thread::sleep(std::time::Duration::from_millis(50));
        conn.execute(
            "INSERT INTO tracks (id, workspace_id, name, color, sort_order, is_visible, created_at)
             VALUES ('t1', 'w1', '主线', '#F4B6C2', 0, 1, 't')",
            [],
        )
        .unwrap();
        let after: String = conn
            .query_row("SELECT updated_at FROM workspaces WHERE id='w1'", [], |r| r.get(0))
            .unwrap();
        assert_ne!(
            before, after,
            "子表插入应联动更新 workspaces.updated_at"
        );
    }

    #[test]
    fn should_apply_map_and_vn_migration() {
        let conn = test_conn();
        let v: i64 = conn
            .query_row(
                "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(v, 16, "迁移 016 应使版本号变为 16");
        // 验证 locations 表存在
        conn.execute(
            "INSERT INTO workspaces (id, name, created_at, updated_at) VALUES ('w1', 'w', 't', 't')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO locations (id, workspace_id, name, created_at, updated_at) \
             VALUES ('l1', 'w1', '城', 't', 't')",
            [],
        )
        .unwrap();
        // 验证 vn_scenes / vn_lines 表存在
        conn.execute(
            "INSERT INTO vn_scenes (id, workspace_id, title, created_at, updated_at) \
             VALUES ('s1', 'w1', '开场', 't', 't')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO vn_lines (id, scene_id, created_at) VALUES ('ln1', 's1', 't')",
            [],
        )
        .unwrap();
        let name: String = conn
            .query_row("SELECT name FROM locations WHERE id='l1'", [], |r| r.get(0))
            .unwrap();
        assert_eq!(name, "城");
    }

    #[test]
    fn child_entity_change_clears_ai_cache() {
        let conn = test_conn();
        conn.execute(
            "INSERT INTO workspaces (id, name, created_at, updated_at) VALUES ('w1', 'w', 't', 't')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO ai_cache (key, value, created_at, expires_at) \
             VALUES ('ai:cache:w1:action:abc', 'cached', 't', '2099-01-01T00:00:00Z')",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO tracks (id, workspace_id, name, color, sort_order, is_visible, created_at) \
             VALUES ('t1', 'w1', '主线', '#F4B6C2', 0, 1, 't')",
            [],
        )
        .unwrap();

        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM ai_cache WHERE key = 'ai:cache:w1:action:abc'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(
            count, 0,
            "子实体插入应通过触发器清除对应工作区的 AI 缓存"
        );
    }
}
