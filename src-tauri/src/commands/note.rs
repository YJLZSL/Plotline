use tauri::State;

use crate::commands::with_db;
use crate::error::AppResult;
use crate::models::{CreateNoteInput, Note, UpdateNoteInput};
use crate::AppState;

#[tauri::command]
pub fn list_notes(state: State<'_, AppState>, workspace_id: String) -> AppResult<Vec<Note>> {
    with_db!(state, |conn| {
        crate::services::note::list(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn create_note(state: State<'_, AppState>, input: CreateNoteInput) -> AppResult<Note> {
    if input.title.trim().is_empty() {
        return Err(crate::error::AppError::InvalidInput("笔记标题不能为空".into()));
    }
    with_db!(state, |conn| {
        crate::services::note::create(conn, input)
    })
}

#[tauri::command]
pub fn update_note(state: State<'_, AppState>, input: UpdateNoteInput) -> AppResult<Note> {
    with_db!(state, |conn| {
        crate::services::note::update(conn, input)
    })
}

#[tauri::command]
pub fn delete_note(state: State<'_, AppState>, id: String) -> AppResult<()> {
    with_db!(state, |conn| crate::services::note::delete(conn, &id))
}
