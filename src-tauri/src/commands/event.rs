use tauri::{AppHandle, Manager, State};

use crate::commands::with_db;
use crate::error::AppResult;
use crate::models::{
    ConnectEventsInput, CreateEventInput, Event, EventConnection, UpdateEventInput,
};
use crate::AppState;

#[tauri::command]
pub fn list_events(state: State<'_, AppState>, workspace_id: String) -> AppResult<Vec<Event>> {
    with_db!(state, |conn| {
        crate::services::event::list(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn create_event(state: State<'_, AppState>, input: CreateEventInput) -> AppResult<Event> {
    if input.title.trim().is_empty() {
        return Err(crate::error::AppError::InvalidInput(
            "事件标题不能为空".into(),
        ));
    }
    with_db!(state, |conn| {
        crate::services::event::create(conn, input)
    })
}

#[tauri::command]
pub fn update_event(state: State<'_, AppState>, input: UpdateEventInput) -> AppResult<Event> {
    with_db!(state, |conn| {
        crate::services::event::update(conn, input)
    })
}

#[tauri::command]
pub fn delete_event(state: State<'_, AppState>, id: String) -> AppResult<()> {
    with_db!(state, |conn| crate::services::event::delete(conn, &id))
}

#[tauri::command]
pub fn connect_events(state: State<'_, AppState>, input: ConnectEventsInput) -> AppResult<()> {
    with_db!(state, |conn| {
        crate::services::event::connect(conn, input)
    })
}

#[tauri::command]
pub fn disconnect_events(
    state: State<'_, AppState>,
    source_id: String,
    target_id: String,
) -> AppResult<()> {
    with_db!(state, |conn| {
        crate::services::event::disconnect(conn, &source_id, &target_id)
    })
}

#[tauri::command]
pub fn list_event_connections(
    state: State<'_, AppState>,
    workspace_id: String,
) -> AppResult<Vec<EventConnection>> {
    with_db!(state, |conn| {
        crate::services::event::list_connections(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn check_consistency(
    state: State<'_, AppState>,
    workspace_id: String,
) -> AppResult<Vec<crate::services::consistency::Conflict>> {
    let events = with_db!(state, |conn| {
        crate::services::event::list(conn, &workspace_id)
    })?;
    Ok(crate::services::consistency::check_event_conflicts(&events))
}

#[tauri::command]
pub fn upload_event_image(
    app: AppHandle,
    event_id: String,
    workspace_id: String,
    source_path: String,
) -> AppResult<String> {
    let src = std::path::Path::new(&source_path);
    let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("png");
    let file_name = format!("{}.{}.{}", event_id, uuid::Uuid::new_v4(), ext);

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| crate::error::AppError::Internal(format!("无法获取应用数据目录: {e}")))?;
    let dest_dir = app_data_dir.join("images").join(&workspace_id).join("events").join(&event_id);
    std::fs::create_dir_all(&dest_dir)
        .map_err(|e| crate::error::AppError::Internal(format!("创建图片目录失败: {e}")))?;

    let dest = dest_dir.join(&file_name);
    std::fs::copy(src, &dest).map_err(|e| crate::error::AppError::Internal(format!("复制图片失败: {e}")))?;

    Ok(format!("images/{}/{}/events/{}/{}", workspace_id, event_id, event_id, file_name))
}
