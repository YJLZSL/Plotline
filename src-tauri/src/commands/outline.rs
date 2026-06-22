use tauri::State;

use crate::commands::with_db;
use crate::error::AppResult;
use crate::models::{
    CreateOutlineNodeInput, MoveOutlineNodeInput, OutlineNode, UpdateOutlineNodeInput,
};
use crate::AppState;

#[tauri::command]
pub fn list_outline_nodes(
    state: State<'_, AppState>,
    workspace_id: String,
) -> AppResult<Vec<OutlineNode>> {
    with_db!(state, |conn| {
        crate::services::outline::list(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn create_outline_node(
    state: State<'_, AppState>,
    input: CreateOutlineNodeInput,
) -> AppResult<OutlineNode> {
    if input.title.trim().is_empty() {
        return Err(crate::error::AppError::InvalidInput("节点标题不能为空".into()));
    }
    with_db!(state, |conn| {
        crate::services::outline::create(conn, input)
    })
}

#[tauri::command]
pub fn update_outline_node(
    state: State<'_, AppState>,
    input: UpdateOutlineNodeInput,
) -> AppResult<OutlineNode> {
    with_db!(state, |conn| {
        crate::services::outline::update(conn, input)
    })
}

#[tauri::command]
pub fn delete_outline_node(state: State<'_, AppState>, id: String) -> AppResult<()> {
    with_db!(state, |conn| crate::services::outline::delete(conn, &id))
}

#[tauri::command]
pub fn move_outline_node(
    state: State<'_, AppState>,
    input: MoveOutlineNodeInput,
) -> AppResult<OutlineNode> {
    with_db!(state, |conn| {
        crate::services::outline::move_node(conn, input)
    })
}
