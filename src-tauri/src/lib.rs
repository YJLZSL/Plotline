mod commands;
mod db;
mod error;
mod models;
mod services;

use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_updater::UpdaterExt;

use db::Database;

/// 应用全局状态：SQLite 连接（Mutex 保证单写者）。
pub struct AppState {
    pub db: Mutex<Database>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            // 启动后异步检查更新（应用内自动更新）
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                match app_handle.updater() {
                    Ok(updater) => {
                        if let Err(err) = updater.check().await {
                            log::warn!("[updater] 检查更新失败: {err}");
                        }
                    }
                    Err(err) => log::warn!("[updater] 初始化失败: {err}"),
                }
            });

            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
                log::warn!("[setup] create_dir_all failed: {e}");
            }
            let db_path = app_data_dir.join("plotline.db");

            // 启动时滚动备份当前数据库（首次启动时数据库尚未创建，备份会被跳过）。
            if db_path.exists() {
                match services::backup::backup_workspace_db(
                    &db_path,
                    services::backup::DEFAULT_MAX_BACKUPS,
                ) {
                    Ok(path) => log::info!("[backup] created {}", path.display()),
                    Err(err) => log::warn!("[backup] failed: {err}"),
                }
            }

            services::backup::start_auto_backup_scheduler(db_path.clone());

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
            commands::event::list_event_connections,
            commands::event::check_consistency,
            commands::event::upload_event_image,
            // export
            commands::export::export_workspace_markdown,
            commands::export::export_outline_markdown,
            commands::export::export_workspace_pdf,
            commands::export::export_workspace_word,
            commands::export::export_workspace_epub,
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
            // location (map)
            commands::location::list_locations,
            commands::location::create_location,
            commands::location::update_location,
            commands::location::delete_location,
            commands::location::list_location_links,
            commands::location::link_locations,
            commands::location::unlink_locations,
            // vn (visual novel)
            commands::vn::list_vn_scenes,
            commands::vn::create_vn_scene,
            commands::vn::update_vn_scene,
            commands::vn::delete_vn_scene,
            commands::vn::list_vn_lines,
            commands::vn::list_all_vn_lines,
            commands::vn::create_vn_line,
            commands::vn::update_vn_line,
            commands::vn::delete_vn_line,
            commands::vn::export_vn_renpy,
            commands::vn::check_vn_consistency,
            commands::vn::upload_vn_asset,
            // novel
            commands::novel::list_novel_chapters,
            commands::novel::create_novel_chapter,
            commands::novel::update_novel_chapter,
            commands::novel::delete_novel_chapter,
            commands::novel::reorder_novel_chapters,
            // statistics
            commands::statistics::get_statistics,
            // settings
            commands::settings::get_settings,
            commands::settings::update_settings,
            // ai
            commands::ai::create_ai_session,
            commands::ai::list_ai_sessions,
            commands::ai::get_ai_session,
            commands::ai::delete_ai_session,
            commands::ai::add_ai_message,
            commands::ai::list_ai_messages,
            commands::ai::ai_chat,
            commands::ai::ai_chat_stream,
            commands::ai::ai_index_workspace,
            commands::ai::ai_kv_get,
            commands::ai::ai_kv_set,
            commands::ai::list_ai_models,
            commands::ai::test_ai_connection,
            commands::ai::apply_ai_output,
            commands::ai::optimize_event,
            commands::ai::optimize_timeline_segment,
            commands::ai::summarize_workspace,
            commands::ai::check_timeline_consistency,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
