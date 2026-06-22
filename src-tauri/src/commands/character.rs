use tauri::State;

use crate::commands::with_db;
use crate::error::AppResult;
use crate::models::{
    Character, CharacterRelationship, CreateCharacterInput, CreateRelationshipInput,
    UpdateCharacterInput, UpdateRelationshipInput,
};
use crate::AppState;

#[tauri::command]
pub fn list_characters(
    state: State<'_, AppState>,
    workspace_id: String,
) -> AppResult<Vec<Character>> {
    with_db!(state, |conn| {
        crate::services::character::list(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn get_character(state: State<'_, AppState>, id: String) -> AppResult<Character> {
    with_db!(state, |conn| crate::services::character::get(conn, &id))
}

#[tauri::command]
pub fn create_character(
    state: State<'_, AppState>,
    input: CreateCharacterInput,
) -> AppResult<Character> {
    if input.name.trim().is_empty() {
        return Err(crate::error::AppError::InvalidInput("角色名称不能为空".into()));
    }
    with_db!(state, |conn| {
        crate::services::character::create(conn, input)
    })
}

#[tauri::command]
pub fn update_character(
    state: State<'_, AppState>,
    input: UpdateCharacterInput,
) -> AppResult<Character> {
    with_db!(state, |conn| {
        crate::services::character::update(conn, input)
    })
}

#[tauri::command]
pub fn delete_character(state: State<'_, AppState>, id: String) -> AppResult<()> {
    with_db!(state, |conn| crate::services::character::delete(conn, &id))
}

#[tauri::command]
pub fn list_relationships(
    state: State<'_, AppState>,
    workspace_id: String,
) -> AppResult<Vec<CharacterRelationship>> {
    with_db!(state, |conn| {
        crate::services::character::list_relationships(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn create_relationship(
    state: State<'_, AppState>,
    input: CreateRelationshipInput,
) -> AppResult<CharacterRelationship> {
    with_db!(state, |conn| {
        crate::services::character::create_relationship(conn, input)
    })
}

#[tauri::command]
pub fn update_relationship(
    state: State<'_, AppState>,
    input: UpdateRelationshipInput,
) -> AppResult<CharacterRelationship> {
    with_db!(state, |conn| {
        crate::services::character::update_relationship(conn, input)
    })
}

#[tauri::command]
pub fn delete_relationship(state: State<'_, AppState>, id: String) -> AppResult<()> {
    with_db!(state, |conn| {
        crate::services::character::delete_relationship(conn, &id)
    })
}
