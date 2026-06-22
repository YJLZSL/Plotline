-- v1.3 迁移：全局字体主题

ALTER TABLE app_settings ADD COLUMN font_theme TEXT NOT NULL DEFAULT 'sans';
