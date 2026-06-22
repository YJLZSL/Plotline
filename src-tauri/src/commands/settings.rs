use tauri::State;

use crate::commands::with_db;
use crate::error::AppResult;
use crate::models::{AppSettings, UpdateSettingsInput};
use crate::AppState;

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> AppResult<AppSettings> {
    with_db!(state, |conn| read_settings(conn))
}

#[tauri::command]
pub fn update_settings(
    state: State<'_, AppState>,
    input: UpdateSettingsInput,
) -> AppResult<AppSettings> {
    with_db!(state, |conn| {
        let existing = read_settings(conn)?;
        let merged = AppSettings {
            theme: input.theme.unwrap_or(existing.theme),
            accent_color: input.accent_color.unwrap_or(existing.accent_color),
            language: input.language.unwrap_or(existing.language),
            editor_font: input.editor_font.unwrap_or(existing.editor_font),
            ui_font: input.ui_font.unwrap_or(existing.ui_font),
            font_size: input.font_size.unwrap_or(existing.font_size),
            backup_path: input.backup_path.unwrap_or(existing.backup_path),
            auto_backup: input.auto_backup.unwrap_or(existing.auto_backup),
            backup_interval_hours: input
                .backup_interval_hours
                .unwrap_or(existing.backup_interval_hours),
            default_view: input.default_view.unwrap_or(existing.default_view),
            timeline_zoom: input.timeline_zoom.unwrap_or(existing.timeline_zoom),
            font_theme: input.font_theme.unwrap_or(existing.font_theme),
        };
        write_settings(conn, &merged)?;
        Ok(merged)
    })
}

fn read_settings(conn: &rusqlite::Connection) -> AppResult<AppSettings> {
    conn.query_row(
        "SELECT theme, accent_color, language, editor_font, ui_font, font_size,
                backup_path, auto_backup, backup_interval_hours, default_view, timeline_zoom, font_theme
         FROM app_settings WHERE id=1",
        [],
        |row| {
            Ok(AppSettings {
                theme: row.get(0)?,
                accent_color: row.get(1)?,
                language: row.get(2)?,
                editor_font: row.get(3)?,
                ui_font: row.get(4)?,
                font_size: row.get(5)?,
                backup_path: row.get(6)?,
                auto_backup: row.get::<_, i64>(7)? != 0,
                backup_interval_hours: row.get(8)?,
                default_view: row.get(9)?,
                timeline_zoom: row.get(10)?,
                font_theme: row.get(11)?,
            })
        },
    )
    .map_err(Into::into)
}

fn write_settings(conn: &rusqlite::Connection, s: &AppSettings) -> AppResult<()> {
    conn.execute(
        "UPDATE app_settings SET theme=?1, accent_color=?2, language=?3, editor_font=?4,
            ui_font=?5, font_size=?6, backup_path=?7, auto_backup=?8,
            backup_interval_hours=?9, default_view=?10, timeline_zoom=?11, font_theme=?12 WHERE id=1",
        rusqlite::params![
            s.theme,
            s.accent_color,
            s.language,
            s.editor_font,
            s.ui_font,
            s.font_size,
            s.backup_path,
            s.auto_backup as i64,
            s.backup_interval_hours,
            s.default_view,
            s.timeline_zoom,
            s.font_theme,
        ],
    )?;
    Ok(())
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
    }

    #[test]
    fn reads_default_settings_from_migrated_db() {
        let conn = test_conn();
        let settings = read_settings(&conn).unwrap();
        assert_eq!(settings.theme, "light");
        assert_eq!(settings.font_theme, "sans");
        assert_eq!(settings.accent_color, "#C68A3E");
    }

    #[test]
    fn writes_and_reads_font_theme() {
        let conn = test_conn();
        let mut settings = read_settings(&conn).unwrap();
        settings.font_theme = "pixel".into();
        write_settings(&conn, &settings).unwrap();

        let updated = read_settings(&conn).unwrap();
        assert_eq!(updated.font_theme, "pixel");
    }

    #[test]
    fn update_settings_merges_font_theme() {
        let conn = test_conn();
        let input = UpdateSettingsInput {
            font_theme: Some("mono".into()),
            ..Default::default()
        };

        let existing = read_settings(&conn).unwrap();
        let merged = AppSettings {
            theme: input.theme.unwrap_or(existing.theme),
            accent_color: input.accent_color.unwrap_or(existing.accent_color),
            language: input.language.unwrap_or(existing.language),
            editor_font: input.editor_font.unwrap_or(existing.editor_font),
            ui_font: input.ui_font.unwrap_or(existing.ui_font),
            font_size: input.font_size.unwrap_or(existing.font_size),
            backup_path: input.backup_path.unwrap_or(existing.backup_path),
            auto_backup: input.auto_backup.unwrap_or(existing.auto_backup),
            backup_interval_hours: input
                .backup_interval_hours
                .unwrap_or(existing.backup_interval_hours),
            default_view: input.default_view.unwrap_or(existing.default_view),
            timeline_zoom: input.timeline_zoom.unwrap_or(existing.timeline_zoom),
            font_theme: input.font_theme.unwrap_or(existing.font_theme),
        };

        assert_eq!(merged.font_theme, "mono");
        assert_eq!(merged.theme, "light");
    }
}
