use tauri::State;

use crate::commands::with_db;
use crate::error::AppResult;
use crate::models::{CreateTrackInput, ReorderTracksInput, Track, UpdateTrackInput};
use crate::AppState;

#[tauri::command]
pub fn list_tracks(state: State<'_, AppState>, workspace_id: String) -> AppResult<Vec<Track>> {
    with_db!(state, |conn| {
        crate::services::track::list(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn create_track(state: State<'_, AppState>, input: CreateTrackInput) -> AppResult<Track> {
    if input.name.trim().is_empty() {
        return Err(crate::error::AppError::InvalidInput(
            "轨道名称不能为空".into(),
        ));
    }
    with_db!(state, |conn| {
        crate::services::track::create(conn, input)
    })
}

#[tauri::command]
pub fn update_track(state: State<'_, AppState>, input: UpdateTrackInput) -> AppResult<Track> {
    with_db!(state, |conn| {
        crate::services::track::update(conn, input)
    })
}

#[tauri::command]
pub fn delete_track(state: State<'_, AppState>, id: String) -> AppResult<()> {
    with_db!(state, |conn| crate::services::track::delete(conn, &id))
}

#[tauri::command]
pub fn reorder_tracks(
    state: State<'_, AppState>,
    input: ReorderTracksInput,
) -> AppResult<Vec<Track>> {
    with_db!(state, |conn| {
        crate::services::track::reorder(conn, input)
    })
}
