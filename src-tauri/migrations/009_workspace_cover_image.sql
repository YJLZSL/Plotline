-- 为工作区增加封面图片字段（BASE64 或本地路径）。
ALTER TABLE workspaces ADD COLUMN cover_image TEXT;
