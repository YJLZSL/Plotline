pub mod character;
pub mod event;
pub mod export;
pub mod note;
pub mod outline;
pub mod settings;
pub mod statistics;
pub mod track;
pub mod workspace;

/// 从 Tauri 状态中获取数据库连接的辅助宏。
macro_rules! with_db {
    ($state:expr, $f:expr) => {{
        let state = $state;
        let db = state.db.lock().map_err(|e| {
            crate::error::AppError::Internal(format!("db lock poisoned: {e}"))
        })?;
        $f(&db.conn)
    }};
}

pub(crate) use with_db;
