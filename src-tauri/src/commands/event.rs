use tauri::State;

use crate::commands::with_db;
use crate::error::AppResult;
use crate::models::{ConnectEventsInput, CreateEventInput, Event, EventConnection, UpdateEventInput};
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
        return Err(crate::error::AppError::InvalidInput("事件标题不能为空".into()));
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
