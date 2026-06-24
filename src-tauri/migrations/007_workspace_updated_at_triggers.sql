-- v2.2.0: 子实体变更时联动更新工作区的 updated_at，
-- 使工作区列表的排序/时间戳能反映内容最近活动。

CREATE TRIGGER IF NOT EXISTS trg_tracks_insert_workspace
AFTER INSERT ON tracks
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_tracks_update_workspace
AFTER UPDATE ON tracks
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_tracks_delete_workspace
AFTER DELETE ON tracks
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = OLD.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_events_insert_workspace
AFTER INSERT ON events
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_events_update_workspace
AFTER UPDATE ON events
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_events_delete_workspace
AFTER DELETE ON events
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = OLD.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_characters_insert_workspace
AFTER INSERT ON characters
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_characters_update_workspace
AFTER UPDATE ON characters
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_characters_delete_workspace
AFTER DELETE ON characters
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = OLD.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_outline_nodes_insert_workspace
AFTER INSERT ON outline_nodes
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_outline_nodes_update_workspace
AFTER UPDATE ON outline_nodes
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_outline_nodes_delete_workspace
AFTER DELETE ON outline_nodes
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = OLD.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_notes_insert_workspace
AFTER INSERT ON notes
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_notes_update_workspace
AFTER UPDATE ON notes
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_notes_delete_workspace
AFTER DELETE ON notes
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = OLD.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_locations_insert_workspace
AFTER INSERT ON locations
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_locations_update_workspace
AFTER UPDATE ON locations
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_locations_delete_workspace
AFTER DELETE ON locations
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = OLD.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_vn_scenes_insert_workspace
AFTER INSERT ON vn_scenes
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_vn_scenes_update_workspace
AFTER UPDATE ON vn_scenes
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_vn_scenes_delete_workspace
AFTER DELETE ON vn_scenes
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = OLD.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_character_relationships_insert_workspace
AFTER INSERT ON character_relationships
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_character_relationships_update_workspace
AFTER UPDATE ON character_relationships
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.workspace_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_character_relationships_delete_workspace
AFTER DELETE ON character_relationships
BEGIN
  UPDATE workspaces SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = OLD.workspace_id;
END;
