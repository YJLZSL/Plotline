use rusqlite::Connection;

use crate::error::AppResult;
use crate::models::{AppSettings, UpdateSettingsInput};

pub fn read_settings(conn: &Connection) -> AppResult<AppSettings> {
    conn.query_row(
        "SELECT theme, accent_color, language, editor_font, ui_font, font_size,
                backup_path, auto_backup, backup_interval_hours, default_view, timeline_zoom,
                font_theme, ai_provider, ai_model, ai_api_key, ai_base_url,
                ai_enabled, ai_rag_enabled, ai_system_prompt, splash_enabled, splash_duration_ms,
                animations_enabled
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
                ai_provider: row.get(12)?,
                ai_model: row.get(13)?,
                ai_api_key: row.get(14)?,
                ai_base_url: row.get(15)?,
                ai_enabled: row.get::<_, i64>(16)? != 0,
                ai_rag_enabled: row.get::<_, i64>(17)? != 0,
                ai_system_prompt: row.get(18)?,
                splash_enabled: row.get::<_, i64>(19)? != 0,
                splash_duration_ms: row.get(20)?,
                animations_enabled: row.get::<_, i64>(21)? != 0,
            })
        },
    )
    .map_err(Into::into)
}

pub fn write_settings(conn: &Connection, s: &AppSettings) -> AppResult<()> {
    conn.execute(
        "UPDATE app_settings SET theme=?1, accent_color=?2, language=?3, editor_font=?4,
             ui_font=?5, font_size=?6, backup_path=?7, auto_backup=?8,
             backup_interval_hours=?9, default_view=?10, timeline_zoom=?11, font_theme=?12,
             ai_provider=?13, ai_model=?14, ai_api_key=?15, ai_base_url=?16,
             ai_enabled=?17, ai_rag_enabled=?18, ai_system_prompt=?19, splash_enabled=?20, splash_duration_ms=?21,
             animations_enabled=?22
         WHERE id=1",
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
            s.ai_provider,
            s.ai_model,
            s.ai_api_key,
            s.ai_base_url,
            s.ai_enabled as i64,
            s.ai_rag_enabled as i64,
            s.ai_system_prompt,
            s.splash_enabled as i64,
            s.splash_duration_ms,
            s.animations_enabled as i64,
        ],
    )?;
    Ok(())
}

pub fn merge_settings(conn: &Connection, input: UpdateSettingsInput) -> AppResult<AppSettings> {
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
        ai_provider: input.ai_provider.unwrap_or(existing.ai_provider),
        ai_model: input.ai_model.unwrap_or(existing.ai_model),
        ai_api_key: input.ai_api_key.unwrap_or(existing.ai_api_key),
        ai_base_url: input.ai_base_url.unwrap_or(existing.ai_base_url),
        ai_enabled: input.ai_enabled.unwrap_or(existing.ai_enabled),
        ai_rag_enabled: input.ai_rag_enabled.unwrap_or(existing.ai_rag_enabled),
        ai_system_prompt: input
            .ai_system_prompt
            .unwrap_or(existing.ai_system_prompt),
        splash_enabled: input.splash_enabled.unwrap_or(existing.splash_enabled),
        splash_duration_ms: input
            .splash_duration_ms
            .unwrap_or(existing.splash_duration_ms),
        animations_enabled: input
            .animations_enabled
            .unwrap_or(existing.animations_enabled),
    };
    write_settings(conn, &merged)?;
    Ok(merged)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrate;

    fn test_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        migrate::run(&conn).unwrap();
        conn
    }

    #[test]
    fn reads_default_settings_from_migrated_db() {
        let conn = test_conn();
        let settings = read_settings(&conn).unwrap();
        assert_eq!(settings.theme, "light");
        assert_eq!(settings.font_theme, "sans");
        assert_eq!(settings.accent_color, "#C68A3E");
        assert!(!settings.ai_enabled);
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
    fn reads_default_animations_enabled() {
        let conn = test_conn();
        let settings = read_settings(&conn).unwrap();
        assert!(settings.animations_enabled);
    }

    #[test]
    fn writes_and_reads_animations_enabled() {
        let conn = test_conn();
        let mut settings = read_settings(&conn).unwrap();
        settings.animations_enabled = false;
        write_settings(&conn, &settings).unwrap();

        let updated = read_settings(&conn).unwrap();
        assert!(!updated.animations_enabled);
    }

    #[test]
    fn merge_settings_updates_animations_enabled() {
        let conn = test_conn();
        let input = UpdateSettingsInput {
            animations_enabled: Some(false),
            ..Default::default()
        };
        let merged = merge_settings(&conn, input).unwrap();
        assert!(!merged.animations_enabled);

        let read_back = read_settings(&conn).unwrap();
        assert!(!read_back.animations_enabled);
    }
}
