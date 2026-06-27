-- v2.7.2: 工作区内容发生写操作时自动清除对应的 AI KV Cache，
-- 防止已缓存的 AI 响应继续返回过期的上下文。

-- workspaces 表没有 workspace_id 列，使用 id
CREATE TRIGGER IF NOT EXISTS trg_workspaces_update_ai_cache
AFTER UPDATE ON workspaces
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_workspaces_delete_ai_cache
AFTER DELETE ON workspaces
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || OLD.id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_characters_insert_ai_cache
AFTER INSERT ON characters
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_characters_update_ai_cache
AFTER UPDATE ON characters
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_characters_delete_ai_cache
AFTER DELETE ON characters
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || OLD.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_events_insert_ai_cache
AFTER INSERT ON events
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_events_update_ai_cache
AFTER UPDATE ON events
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_events_delete_ai_cache
AFTER DELETE ON events
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || OLD.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_tracks_insert_ai_cache
AFTER INSERT ON tracks
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_tracks_update_ai_cache
AFTER UPDATE ON tracks
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_tracks_delete_ai_cache
AFTER DELETE ON tracks
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || OLD.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_outline_nodes_insert_ai_cache
AFTER INSERT ON outline_nodes
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_outline_nodes_update_ai_cache
AFTER UPDATE ON outline_nodes
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_outline_nodes_delete_ai_cache
AFTER DELETE ON outline_nodes
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || OLD.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_notes_insert_ai_cache
AFTER INSERT ON notes
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_notes_update_ai_cache
AFTER UPDATE ON notes
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_notes_delete_ai_cache
AFTER DELETE ON notes
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || OLD.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_locations_insert_ai_cache
AFTER INSERT ON locations
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_locations_update_ai_cache
AFTER UPDATE ON locations
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_locations_delete_ai_cache
AFTER DELETE ON locations
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || OLD.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_vn_scenes_insert_ai_cache
AFTER INSERT ON vn_scenes
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_vn_scenes_update_ai_cache
AFTER UPDATE ON vn_scenes
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_vn_scenes_delete_ai_cache
AFTER DELETE ON vn_scenes
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || OLD.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_character_relationships_insert_ai_cache
AFTER INSERT ON character_relationships
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_character_relationships_update_ai_cache
AFTER UPDATE ON character_relationships
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || NEW.workspace_id || ':%';
END;

CREATE TRIGGER IF NOT EXISTS trg_character_relationships_delete_ai_cache
AFTER DELETE ON character_relationships
BEGIN
  DELETE FROM ai_cache WHERE key LIKE 'ai:cache:' || OLD.workspace_id || ':%';
END;
