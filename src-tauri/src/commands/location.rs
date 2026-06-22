use tauri::State;

use crate::commands::with_db;
use crate::error::{AppError, AppResult};
use crate::models::{
    CreateLocationInput, LinkLocationsInput, Location, LocationLink, UpdateLocationInput,
};
use crate::AppState;

#[tauri::command]
pub fn list_locations(state: State<'_, AppState>, workspace_id: String) -> AppResult<Vec<Location>> {
    with_db!(state, |conn| {
        crate::services::location::list(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn create_location(state: State<'_, AppState>, input: CreateLocationInput) -> AppResult<Location> {
    if input.name.trim().is_empty() {
        return Err(AppError::InvalidInput("地点名称不能为空".into()));
    }
    with_db!(state, |conn| {
        crate::services::location::create(conn, input)
    })
}

#[tauri::command]
pub fn update_location(state: State<'_, AppState>, input: UpdateLocationInput) -> AppResult<Location> {
    with_db!(state, |conn| {
        crate::services::location::update(conn, input)
    })
}

#[tauri::command]
pub fn delete_location(state: State<'_, AppState>, id: String) -> AppResult<()> {
    with_db!(state, |conn| crate::services::location::delete(conn, &id))
}

#[tauri::command]
pub fn list_location_links(
    state: State<'_, AppState>,
    workspace_id: String,
) -> AppResult<Vec<LocationLink>> {
    with_db!(state, |conn| {
        crate::services::location::list_links(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn link_locations(state: State<'_, AppState>, input: LinkLocationsInput) -> AppResult<()> {
    if input.source_id == input.target_id {
        return Err(AppError::InvalidInput("不能连接到自身".into()));
    }
    with_db!(state, |conn| {
        crate::services::location::link(conn, input)
    })
}

#[tauri::command]
pub fn unlink_locations(
    state: State<'_, AppState>,
    source_id: String,
    target_id: String,
) -> AppResult<()> {
    with_db!(state, |conn| {
        crate::services::location::unlink(conn, &source_id, &target_id)
    })
}
