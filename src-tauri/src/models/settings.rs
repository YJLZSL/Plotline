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
}
