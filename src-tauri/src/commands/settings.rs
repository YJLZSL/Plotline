use tauri::State;

use crate::commands::with_db;
use crate::error::AppResult;
use crate::models::{AppSettings, UpdateSettingsInput};
use crate::AppState;

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> AppResult<AppSettings> {
    with_db!(state, crate::services::settings::read_settings)
}

#[tauri::command]
pub fn update_settings(
    state: State<'_, AppState>,
    input: UpdateSettingsInput,
) -> AppResult<AppSettings> {
    with_db!(state, |conn| crate::services::settings::merge_settings(conn, input))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrate;

    fn test_conn() -> rusqlite::Connection {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        migrate::run(&conn).unwrap();
        conn
    }

    #[test]
    fn default_font_theme_is_sans() {
        let settings = AppSettings::default();
        assert_eq!(settings.font_theme, "sans");
        assert!(!settings.ai_enabled);
        assert!(settings.splash_enabled);
    }

    #[test]
    fn reads_default_settings_from_migrated_db() {
        let conn = test_conn();
        let settings = crate::services::settings::read_settings(&conn).unwrap();
        assert_eq!(settings.theme, "light");
        assert_eq!(settings.font_theme, "sans");
        assert_eq!(settings.accent_color, "#C68A3E");
        assert_eq!(settings.splash_duration_ms, 2500);
    }

    #[test]
    fn writes_and_reads_font_theme() {
        let conn = test_conn();
        let mut settings = crate::services::settings::read_settings(&conn).unwrap();
        settings.font_theme = "pixel".into();
        crate::services::settings::write_settings(&conn, &settings).unwrap();

        let updated = crate::services::settings::read_settings(&conn).unwrap();
        assert_eq!(updated.font_theme, "pixel");
    }

    #[test]
    fn update_settings_merges_font_theme() {
        let conn = test_conn();
        let input = UpdateSettingsInput {
            font_theme: Some("mono".into()),
            ..Default::default()
        };

        let merged = crate::services::settings::merge_settings(&conn, input).unwrap();
        assert_eq!(merged.font_theme, "mono");
        assert_eq!(merged.theme, "light");
    }
}
