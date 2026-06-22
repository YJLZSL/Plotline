use serde_json::Value;
use tauri::State;

use crate::commands::with_db;
use crate::error::AppResult;
use crate::models::{CreateWorkspaceInput, UpdateWorkspaceInput, Workspace, WorkspaceBundle};
use crate::AppState;

#[tauri::command]
pub fn list_workspaces(state: State<'_, AppState>) -> AppResult<Vec<Workspace>> {
    with_db!(state, |conn| crate::services::workspace::list(conn))
}

#[tauri::command]
pub fn get_workspace(state: State<'_, AppState>, id: String) -> AppResult<Workspace> {
    with_db!(state, |conn| crate::services::workspace::get(conn, &id))
}

#[tauri::command]
pub fn create_workspace(
    state: State<'_, AppState>,
    input: CreateWorkspaceInput,
) -> AppResult<Workspace> {
    if input.name.trim().is_empty() {
        return Err(crate::error::AppError::InvalidInput("名称不能为空".into()));
    }
    with_db!(state, |conn| {
        crate::services::workspace::create(conn, input)
    })
}

#[tauri::command]
pub fn update_workspace(
    state: State<'_, AppState>,
    input: UpdateWorkspaceInput,
) -> AppResult<Workspace> {
    with_db!(state, |conn| {
        crate::services::workspace::update(conn, input)
    })
}

#[tauri::command]
pub fn delete_workspace(state: State<'_, AppState>, id: String) -> AppResult<()> {
    with_db!(state, |conn| crate::services::workspace::delete(conn, &id))
}

#[tauri::command]
pub fn export_workspace(state: State<'_, AppState>, id: String) -> AppResult<Value> {
    let bundle = with_db!(state, |conn| {
        crate::services::workspace::export_bundle(conn, &id)
    })?;
    serde_json::to_value(bundle).map_err(Into::into)
}

#[tauri::command]
pub fn import_workspace(
    state: State<'_, AppState>,
    bundle: WorkspaceBundle,
) -> AppResult<Workspace> {
    if bundle.workspace.name.trim().is_empty() {
        return Err(crate::error::AppError::InvalidInput("工作区名称不能为空".into()));
    }
    with_db!(state, |conn| {
        crate::services::workspace::import_bundle(conn, bundle)
    })
}
