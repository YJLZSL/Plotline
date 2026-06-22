-- 为 VN 增加素材引用字段
ALTER TABLE vn_scenes ADD COLUMN background_asset_path TEXT;
ALTER TABLE vn_scenes ADD COLUMN bgm_path TEXT;

ALTER TABLE vn_lines ADD COLUMN sprite_asset_path TEXT;
ALTER TABLE vn_lines ADD COLUMN voice_path TEXT;
