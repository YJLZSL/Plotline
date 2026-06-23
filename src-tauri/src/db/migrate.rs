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
        assert_eq!(v, 6, "迁移 001-006 均应已应用");
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
        assert_eq!(v, 6, "重复执行迁移不应改变版本号");
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
        assert_eq!(v, 6, "迁移 006 应使版本号变为 6");
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
}
