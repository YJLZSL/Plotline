use tauri::State;

use crate::commands::with_db;
use crate::error::AppResult;
use crate::models::{
    CreateNovelChapterInput, NovelChapter, ReorderNovelChaptersInput, UpdateNovelChapterInput,
};
use crate::AppState;

#[tauri::command]
pub fn list_novel_chapters(
    state: State<'_, AppState>,
    workspace_id: String,
) -> AppResult<Vec<NovelChapter>> {
    with_db!(state, |conn| {
        crate::services::novel::list(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn create_novel_chapter(
    state: State<'_, AppState>,
    input: CreateNovelChapterInput,
) -> AppResult<NovelChapter> {
    if input.title.trim().is_empty() {
        return Err(crate::error::AppError::InvalidInput(
            "章节标题不能为空".into(),
        ));
    }
    with_db!(state, |conn| { crate::services::novel::create(conn, input) })
}

#[tauri::command]
pub fn update_novel_chapter(
    state: State<'_, AppState>,
    input: UpdateNovelChapterInput,
) -> AppResult<NovelChapter> {
    with_db!(state, |conn| { crate::services::novel::update(conn, input) })
}

#[tauri::command]
pub fn delete_novel_chapter(state: State<'_, AppState>, id: String) -> AppResult<()> {
    with_db!(state, |conn| crate::services::novel::delete(conn, &id))
}

#[tauri::command]
pub fn reorder_novel_chapters(
    state: State<'_, AppState>,
    input: ReorderNovelChaptersInput,
) -> AppResult<Vec<NovelChapter>> {
    with_db!(state, |conn| { crate::services::novel::reorder(conn, input) })
}
