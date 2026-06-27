-- v2.7.0 迁移：AI KV Cache 与对话历史表

CREATE TABLE IF NOT EXISTS ai_cache (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    expires_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);

CREATE TABLE IF NOT EXISTS ai_conversation_history (
    id          TEXT PRIMARY KEY,
    session_id  TEXT NOT NULL,
    role        TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_conversation_history_session ON ai_conversation_history(session_id, created_at);
