use tauri::State;

use crate::commands::with_db;
use crate::error::AppResult;
use crate::services::statistics::Statistics;
use crate::AppState;

#[tauri::command]
pub fn get_statistics(
    state: State<'_, AppState>,
    workspace_id: String,
) -> AppResult<Statistics> {
    with_db!(state, |conn| {
        crate::services::statistics::get(conn, &workspace_id)
    })
}
