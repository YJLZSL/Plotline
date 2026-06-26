-- 给事件添加图片字段（JSON 数组存储图片路径列表）
ALTER TABLE events ADD COLUMN image_urls TEXT NOT NULL DEFAULT '[]';