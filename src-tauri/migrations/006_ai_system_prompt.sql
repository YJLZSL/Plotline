-- 新增 AI 系统提示词字段
ALTER TABLE app_settings ADD COLUMN ai_system_prompt TEXT NOT NULL DEFAULT '';
