-- 初始 schema：工作区、轨道、事件、角色、关系、大纲、笔记、设置
-- 启用 WAL 提升并发写入性能
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workspaces (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    template      TEXT NOT NULL DEFAULT 'blank',
    cover_color   TEXT NOT NULL DEFAULT '#C68A3E',
    settings_json TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tracks (
    id            TEXT PRIMARY KEY,
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    color         TEXT NOT NULL,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    is_visible    INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tracks_workspace ON tracks(workspace_id, sort_order);

CREATE TABLE IF NOT EXISTS events (
    id            TEXT PRIMARY KEY,
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    track_id      TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    date_type     TEXT NOT NULL DEFAULT 'relative',
    date_value    TEXT NOT NULL DEFAULT '',
    sort_order    INTEGER NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'draft',
    color         TEXT,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_workspace_track
    ON events(workspace_id, track_id, sort_order);

CREATE TABLE IF NOT EXISTS characters (
    id            TEXT PRIMARY KEY,
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    aliases       TEXT NOT NULL DEFAULT '[]',
    avatar        TEXT,
    description   TEXT NOT NULL DEFAULT '',
    appearance    TEXT NOT NULL DEFAULT '',
    backstory     TEXT NOT NULL DEFAULT '',
    goals         TEXT NOT NULL DEFAULT '',
    conflicts     TEXT NOT NULL DEFAULT '',
    arc           TEXT NOT NULL DEFAULT '',
    tags          TEXT NOT NULL DEFAULT '[]',
    color         TEXT NOT NULL DEFAULT '#F4B6C2',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_characters_workspace ON characters(workspace_id);

CREATE TABLE IF NOT EXISTS event_characters (
    event_id      TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    character_id  TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, character_id)
);

CREATE TABLE IF NOT EXISTS character_relationships (
    id            TEXT PRIMARY KEY,
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source_id     TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    target_id     TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    type          TEXT NOT NULL DEFAULT 'friend',
    description   TEXT NOT NULL DEFAULT '',
    strength      INTEGER NOT NULL DEFAULT 3
);

CREATE TABLE IF NOT EXISTS event_connections (
    source_id     TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    target_id     TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    type          TEXT NOT NULL DEFAULT 'causal',
    PRIMARY KEY (source_id, target_id)
);

CREATE TABLE IF NOT EXISTS outline_nodes (
    id            TEXT PRIMARY KEY,
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    type          TEXT NOT NULL DEFAULT 'chapter',
    title         TEXT NOT NULL,
    content       TEXT NOT NULL DEFAULT '',
    parent_id     TEXT REFERENCES outline_nodes(id) ON DELETE CASCADE,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    event_id      TEXT REFERENCES events(id) ON DELETE SET NULL,
    status        TEXT NOT NULL DEFAULT 'draft',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outline_workspace_parent
    ON outline_nodes(workspace_id, parent_id, sort_order);

CREATE TABLE IF NOT EXISTS notes (
    id            TEXT PRIMARY KEY,
    workspace_id  TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
    folder_id     TEXT REFERENCES notes(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    content       TEXT NOT NULL DEFAULT '',
    tags          TEXT NOT NULL DEFAULT '[]',
    is_folder     INTEGER NOT NULL DEFAULT 0,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_workspace ON notes(workspace_id, folder_id, sort_order);

CREATE TABLE IF NOT EXISTS app_settings (
    id                       INTEGER PRIMARY KEY CHECK (id = 1),
    theme                    TEXT NOT NULL DEFAULT 'light',
    accent_color             TEXT NOT NULL DEFAULT '#C68A3E',
    language                 TEXT NOT NULL DEFAULT 'zh-CN',
    editor_font              TEXT NOT NULL DEFAULT 'JetBrains Mono',
    ui_font                  TEXT NOT NULL DEFAULT 'Inter',
    font_size                INTEGER NOT NULL DEFAULT 14,
    backup_path              TEXT NOT NULL DEFAULT '',
    auto_backup              INTEGER NOT NULL DEFAULT 1,
    backup_interval_hours    INTEGER NOT NULL DEFAULT 24,
    default_view             TEXT NOT NULL DEFAULT 'timeline',
    timeline_zoom            TEXT NOT NULL DEFAULT 'month'
);

INSERT OR IGNORE INTO app_settings (id) VALUES (1);
