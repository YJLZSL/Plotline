use std::path::Path;

use rusqlite::Connection;

use crate::error::{AppError, AppResult};

/// SQLite 数据库句柄。Tauri 状态中用 Mutex 包装保证单写者。
pub struct Database {
    pub conn: Connection,
}

impl Database {
    pub fn open(path: &Path) -> AppResult<Self> {
        let conn = Connection::open(path).map_err(|e| AppError::Db(e.to_string()))?;
        conn.pragma_update(None, "journal_mode", "WAL")
            .map_err(|e| AppError::Db(e.to_string()))?;
        conn.pragma_update(None, "foreign_keys", "ON")
            .map_err(|e| AppError::Db(e.to_string()))?;
        super::migrate::run(&conn)?;
        Ok(Self { conn })
    }
}
