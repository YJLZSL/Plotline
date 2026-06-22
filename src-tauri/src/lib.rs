mod commands;
mod db;
mod error;
mod models;
mod services;

use std::sync::Mutex;
use tauri::Manager;

use db::Database;

/// 应用全局状态：SQLite 连接（Mutex 保证单写者）。
pub struct AppState {
    pub db: Mutex<Database>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&app_data_dir).ok();
            let db_path = app_data_dir.join("plotline.db");
            let database = Database::open(&db_path).expect("failed to open database");
            app.manage(AppState {
                db: Mutex::new(database),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // workspace
            commands::workspace::list_workspaces,
            commands::workspace::get_workspace,
            commands::workspace::create_workspace,
            commands::workspace::update_workspace,
            commands::workspace::delete_workspace,
            commands::workspace::export_workspace,
            commands::workspace::import_workspace,
            // track
            commands::track::list_tracks,
            commands::track::create_track,
            commands::track::update_track,
            commands::track::delete_track,
            commands::track::reorder_tracks,
            // event
            commands::event::list_events,
            commands::event::create_event,
            commands::event::update_event,
            commands::event::delete_event,
            commands::event::connect_events,
            commands::event::disconnect_events,
            // character
            commands::character::list_characters,
            commands::character::get_character,
            commands::character::create_character,
            commands::character::update_character,
            commands::character::delete_character,
            commands::character::list_relationships,
            commands::character::create_relationship,
            commands::character::update_relationship,
            commands::character::delete_relationship,
            // outline
            commands::outline::list_outline_nodes,
            commands::outline::create_outline_node,
            commands::outline::update_outline_node,
            commands::outline::delete_outline_node,
            commands::outline::move_outline_node,
            // note
            commands::note::list_notes,
            commands::note::create_note,
            commands::note::update_note,
            commands::note::delete_note,
            // statistics
            commands::statistics::get_statistics,
            // settings
            commands::settings::get_settings,
            commands::settings::update_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
