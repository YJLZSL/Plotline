-- v1.3 迁移：故事地图（locations）与视觉小说剧本（vn_scenes / vn_lines）

-- ===== 故事地图地点 =====
CREATE TABLE IF NOT EXISTS locations (
    id            TEXT PRIMARY KEY,
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL DEFAULT '',
    pos_x         REAL NOT NULL DEFAULT 0,
    pos_y         REAL NOT NULL DEFAULT 0,
    color         TEXT NOT NULL DEFAULT '#C68A3E',
    icon          TEXT NOT NULL DEFAULT '📍',
    linked_event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_locations_workspace ON locations(workspace_id);

-- 地点与角色多对多（角色在哪些地点出现）
CREATE TABLE IF NOT EXISTS location_characters (
    location_id   TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    character_id  TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    PRIMARY KEY (location_id, character_id)
);

-- 地点之间的连线（路径/通道）
CREATE TABLE IF NOT EXISTS location_links (
    source_id     TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    target_id     TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    label         TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (source_id, target_id)
);

-- ===== 视觉小说剧本 =====
CREATE TABLE IF NOT EXISTS vn_scenes (
    id            TEXT PRIMARY KEY,
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title         TEXT NOT NULL,
    background    TEXT NOT NULL DEFAULT '',
    outline_node_id TEXT REFERENCES outline_nodes(id) ON DELETE SET NULL,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vn_scenes_workspace ON vn_scenes(workspace_id, sort_order);

-- 剧本台词行：对话 / 旁白 / 选项
CREATE TABLE IF NOT EXISTS vn_lines (
    id            TEXT PRIMARY KEY,
    scene_id      TEXT NOT NULL REFERENCES vn_scenes(id) ON DELETE CASCADE,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    line_type     TEXT NOT NULL DEFAULT 'dialog',  -- dialog / narration / choice
    character_id  TEXT REFERENCES characters(id) ON DELETE SET NULL,
    speaker_name  TEXT NOT NULL DEFAULT '',         -- 旁白或无关联角色时的名字
    text          TEXT NOT NULL DEFAULT '',
    emotion       TEXT NOT NULL DEFAULT '',          -- neutral / happy / sad / angry / surprised
    choice_label  TEXT NOT NULL DEFAULT '',
    choice_target_scene_id TEXT REFERENCES vn_scenes(id) ON DELETE SET NULL,
    created_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vn_lines_scene ON vn_lines(scene_id, sort_order);
