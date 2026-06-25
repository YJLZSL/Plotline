-- v2.3.0 迁移：为事件添加可选地点关联

ALTER TABLE events ADD COLUMN location_id TEXT REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_location ON events(location_id);
