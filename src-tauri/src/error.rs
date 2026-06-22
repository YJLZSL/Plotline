use serde::Serialize;

/// 统一错误类型，序列化为前端可识别的 `{ code, message }`。
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("数据库错误: {0}")]
    Db(String),

    #[error("数据未找到: {0}")]
    NotFound(String),

    #[error("参数无效: {0}")]
    InvalidInput(String),

    #[error("数据损坏: {0}")]
    Corrupt(String),

    #[error("IO 错误: {0}")]
    Io(String),

    #[error("序列化错误: {0}")]
    Serde(String),

    #[error("操作不允许: {0}")]
    Forbidden(String),

    #[error("内部错误: {0}")]
    Internal(String),
}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        match err {
            rusqlite::Error::QueryReturnedNoRows => {
                AppError::NotFound("记录不存在".into())
            }
            other => AppError::Db(other.to_string()),
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::Serde(err.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let code = match self {
            AppError::Db(_) => "DB_ERROR",
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::InvalidInput(_) => "INVALID_INPUT",
            AppError::Corrupt(_) => "CORRUPT",
            AppError::Io(_) => "IO_ERROR",
            AppError::Serde(_) => "SERDE_ERROR",
            AppError::Forbidden(_) => "FORBIDDEN",
            AppError::Internal(_) => "INTERNAL",
        };
        let mut s = serializer.serialize_struct("AppError", 2)?;
        s.serialize_field("code", code)?;
        s.serialize_field("message", &self.to_string())?;
        s.end()
    }
}

pub type AppResult<T> = Result<T, AppError>;
