use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub accent_color: String,
    pub language: String,
    pub editor_font: String,
    pub ui_font: String,
    pub font_size: i64,
    pub backup_path: String,
    pub auto_backup: bool,
    pub backup_interval_hours: i64,
    pub default_view: String,
    pub timeline_zoom: String,
    pub font_theme: String,
    pub ai_provider: String,
    pub ai_model: String,
    pub ai_api_key: String,
    pub ai_base_url: String,
    pub ai_enabled: bool,
    pub ai_rag_enabled: bool,
    pub ai_system_prompt: String,
    pub splash_enabled: bool,
    pub splash_duration_ms: i64,
    pub animations_enabled: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "light".into(),
            accent_color: "#C68A3E".into(),
            language: "zh-CN".into(),
            editor_font: "JetBrains Mono".into(),
            ui_font: "Inter".into(),
            font_size: 14,
            backup_path: String::new(),
            auto_backup: true,
            backup_interval_hours: 24,
            default_view: "timeline".into(),
            timeline_zoom: "month".into(),
            font_theme: "sans".into(),
            ai_provider: "openai".into(),
            ai_model: String::new(),
            ai_api_key: String::new(),
            ai_base_url: String::new(),
            ai_enabled: false,
            ai_rag_enabled: true,
            ai_system_prompt: String::new(),
            splash_enabled: true,
            splash_duration_ms: 2500,
            animations_enabled: true,
        }
    }
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettingsInput {
    pub theme: Option<String>,
    pub accent_color: Option<String>,
    pub language: Option<String>,
    pub editor_font: Option<String>,
    pub ui_font: Option<String>,
    pub font_size: Option<i64>,
    pub backup_path: Option<String>,
    pub auto_backup: Option<bool>,
    pub backup_interval_hours: Option<i64>,
    pub default_view: Option<String>,
    pub timeline_zoom: Option<String>,
    pub font_theme: Option<String>,
    pub ai_provider: Option<String>,
    pub ai_model: Option<String>,
    pub ai_api_key: Option<String>,
    pub ai_base_url: Option<String>,
    pub ai_enabled: Option<bool>,
    pub ai_rag_enabled: Option<bool>,
    pub ai_system_prompt: Option<String>,
    pub splash_enabled: Option<bool>,
    pub splash_duration_ms: Option<i64>,
    pub animations_enabled: Option<bool>,
}
