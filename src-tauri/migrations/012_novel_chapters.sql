-- 创建小说章节表
CREATE TABLE IF NOT EXISTS novel_chapters (
    id          TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    outline_node_id TEXT REFERENCES outline_nodes(id) ON DELETE SET NULL,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL DEFAULT '',
    word_count  INTEGER NOT NULL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT 'draft',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_novel_chapters_workspace ON novel_chapters(workspace_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_novel_chapters_outline ON novel_chapters(outline_node_id);