use tauri::State;

use crate::commands::with_db;
use crate::error::{AppError, AppResult};
use crate::models::{
    CreateVnLineInput, CreateVnSceneInput, UpdateVnLineInput, UpdateVnSceneInput, VnLine, VnScene,
};
use crate::AppState;

#[tauri::command]
pub fn list_vn_scenes(state: State<'_, AppState>, workspace_id: String) -> AppResult<Vec<VnScene>> {
    with_db!(state, |conn| {
        crate::services::vn::list_scenes(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn create_vn_scene(state: State<'_, AppState>, input: CreateVnSceneInput) -> AppResult<VnScene> {
    if input.title.trim().is_empty() {
        return Err(AppError::InvalidInput("场景标题不能为空".into()));
    }
    with_db!(state, |conn| {
        crate::services::vn::create_scene(conn, input)
    })
}

#[tauri::command]
pub fn update_vn_scene(state: State<'_, AppState>, input: UpdateVnSceneInput) -> AppResult<VnScene> {
    with_db!(state, |conn| {
        crate::services::vn::update_scene(conn, input)
    })
}

#[tauri::command]
pub fn delete_vn_scene(state: State<'_, AppState>, id: String) -> AppResult<()> {
    with_db!(state, |conn| crate::services::vn::delete_scene(conn, &id))
}

#[tauri::command]
pub fn list_vn_lines(state: State<'_, AppState>, scene_id: String) -> AppResult<Vec<VnLine>> {
    with_db!(state, |conn| {
        crate::services::vn::list_lines(conn, &scene_id)
    })
}

#[tauri::command]
pub fn create_vn_line(state: State<'_, AppState>, input: CreateVnLineInput) -> AppResult<VnLine> {
    with_db!(state, |conn| {
        crate::services::vn::create_line(conn, input)
    })
}

#[tauri::command]
pub fn update_vn_line(state: State<'_, AppState>, input: UpdateVnLineInput) -> AppResult<VnLine> {
    with_db!(state, |conn| {
        crate::services::vn::update_line(conn, input)
    })
}

#[tauri::command]
pub fn delete_vn_line(state: State<'_, AppState>, id: String) -> AppResult<()> {
    with_db!(state, |conn| crate::services::vn::delete_line(conn, &id))
}

#[tauri::command]
pub fn list_all_vn_lines(
    state: State<'_, AppState>,
    workspace_id: String,
) -> AppResult<Vec<VnLine>> {
    with_db!(state, |conn| {
        crate::services::vn::list_all_lines(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn export_vn_renpy(state: State<'_, AppState>, workspace_id: String) -> AppResult<String> {
    with_db!(state, |conn| {
        crate::services::vn::export_renpy(conn, &workspace_id)
    })
}
