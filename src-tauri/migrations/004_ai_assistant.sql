-- v1.4 迁移：AI 助手（会话、KV 缓存、RAG 倒排索引）与启动动画设置

-- ===== AI 会话 =====
CREATE TABLE IF NOT EXISTS ai_sessions (
    id            TEXT PRIMARY KEY,
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title         TEXT NOT NULL DEFAULT '',
    summary       TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_workspace ON ai_sessions(workspace_id, updated_at);

-- ===== AI 消息 =====
CREATE TABLE IF NOT EXISTS ai_messages (
    id            TEXT PRIMARY KEY,
    session_id    TEXT NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
    role          TEXT NOT NULL DEFAULT 'user',  -- system / user / assistant
    content       TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON ai_messages(session_id, created_at);

-- ===== AI KV 缓存（会话摘要、快照等） =====
CREATE TABLE IF NOT EXISTS ai_kv (
    workspace_id  TEXT NOT NULL,
    key           TEXT NOT NULL,
    value         TEXT NOT NULL DEFAULT '',
    updated_at    TEXT NOT NULL,
    PRIMARY KEY (workspace_id, key)
);

-- ===== RAG 文档块 =====
CREATE TABLE IF NOT EXISTS ai_chunks (
    id            TEXT PRIMARY KEY,
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_type   TEXT NOT NULL,  -- character / event / outline / note / vn_scene / vn_line
    source_id     TEXT NOT NULL,
    content       TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_chunks_workspace ON ai_chunks(workspace_id, source_type);
CREATE INDEX IF NOT EXISTS idx_ai_chunks_source ON ai_chunks(source_type, source_id);

-- ===== RAG 倒排索引（轻量级关键词） =====
CREATE TABLE IF NOT EXISTS ai_chunk_terms (
    chunk_id      TEXT NOT NULL REFERENCES ai_chunks(id) ON DELETE CASCADE,
    term          TEXT NOT NULL,
    PRIMARY KEY (chunk_id, term)
);

CREATE INDEX IF NOT EXISTS idx_ai_chunk_terms_term ON ai_chunk_terms(term);

-- ===== 设置扩展 =====
ALTER TABLE app_settings ADD COLUMN ai_provider       TEXT NOT NULL DEFAULT 'openai';
ALTER TABLE app_settings ADD COLUMN ai_model          TEXT NOT NULL DEFAULT '';
ALTER TABLE app_settings ADD COLUMN ai_api_key        TEXT NOT NULL DEFAULT '';
ALTER TABLE app_settings ADD COLUMN ai_base_url       TEXT NOT NULL DEFAULT '';
ALTER TABLE app_settings ADD COLUMN ai_enabled        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE app_settings ADD COLUMN ai_rag_enabled    INTEGER NOT NULL DEFAULT 1;
ALTER TABLE app_settings ADD COLUMN splash_enabled    INTEGER NOT NULL DEFAULT 1;
ALTER TABLE app_settings ADD COLUMN splash_duration_ms INTEGER NOT NULL DEFAULT 2500;
