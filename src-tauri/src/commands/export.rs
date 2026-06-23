use tauri::State;

use crate::commands::with_db;
use crate::error::AppResult;
use crate::AppState;

#[tauri::command]
pub fn export_workspace_markdown(
    state: State<'_, AppState>,
    workspace_id: String,
) -> AppResult<String> {
    with_db!(state, |conn| {
        crate::services::export::export_workspace_markdown(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn export_outline_markdown(
    state: State<'_, AppState>,
    workspace_id: String,
) -> AppResult<String> {
    with_db!(state, |conn| {
        crate::services::export::export_outline_markdown(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn export_workspace_pdf(
    state: State<'_, AppState>,
    workspace_id: String,
) -> AppResult<Vec<u8>> {
    with_db!(state, |conn| {
        crate::services::export::export_workspace_pdf(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn export_workspace_word(
    state: State<'_, AppState>,
    workspace_id: String,
) -> AppResult<Vec<u8>> {
    with_db!(state, |conn| {
        crate::services::export::export_workspace_word(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn export_workspace_epub(
    state: State<'_, AppState>,
    workspace_id: String,
) -> AppResult<Vec<u8>> {
    with_db!(state, |conn| {
        crate::services::export::export_workspace_epub(conn, &workspace_id)
    })
}
