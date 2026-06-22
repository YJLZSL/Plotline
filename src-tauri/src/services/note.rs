use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::{CreateNoteInput, Note, UpdateNoteInput};

fn parse_json_array(s: &str) -> Vec<String> {
    serde_json::from_str(s).unwrap_or_default()
}

pub fn list(conn: &Connection, workspace_id: &str) -> AppResult<Vec<Note>> {
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, folder_id, title, content, tags, is_folder,
                sort_order, created_at, updated_at
         FROM notes WHERE workspace_id=?1 OR workspace_id IS NULL
         ORDER BY sort_order ASC",
    )?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        let tags_str: String = row.get(5)?;
        Ok(Note {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            folder_id: row.get(2)?,
            title: row.get(3)?,
            content: row.get(4)?,
            tags: parse_json_array(&tags_str),
            is_folder: row.get::<_, i64>(6)? != 0,
            sort_order: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })?;
    rows.collect::<Result<_, _>>().map_err(Into::into)
}

fn get(conn: &Connection, id: &str) -> AppResult<Note> {
    conn.query_row(
        "SELECT id, workspace_id, folder_id, title, content, tags, is_folder,
                sort_order, created_at, updated_at
         FROM notes WHERE id=?1",
        params![id],
        |row| {
            let tags_str: String = row.get(5)?;
            Ok(Note {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                folder_id: row.get(2)?,
                title: row.get(3)?,
                content: row.get(4)?,
                tags: parse_json_array(&tags_str),
                is_folder: row.get::<_, i64>(6)? != 0,
                sort_order: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        },
    )
    .map_err(|_| AppError::NotFound(format!("笔记 {} 不存在", id)))
}

pub fn create(conn: &Connection, input: CreateNoteInput) -> AppResult<Note> {
    let id = Uuid::new_v4().to_string();
    let now_str = Utc::now().to_rfc3339();
    let tags = serde_json::to_string(&input.tags.unwrap_or_default())?;
    let is_folder = input.is_folder.unwrap_or(false) as i64;
    conn.execute(
        "INSERT INTO notes
         (id, workspace_id, folder_id, title, content, tags, is_folder, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8, ?9)",
        params![
            id,
            input.workspace_id,
            input.folder_id,
            input.title,
            input.content.unwrap_or_default(),
            tags,
            is_folder,
            now_str,
            now_str,
        ],
    )?;
    get(conn, &id)
}

pub fn update(conn: &Connection, input: UpdateNoteInput) -> AppResult<Note> {
    let existing = get(conn, &input.id)?;
    let title = input.title.unwrap_or(existing.title);
    let content = input.content.unwrap_or(existing.content);
    let tags = input.tags.unwrap_or(existing.tags);
    let tags_str = serde_json::to_string(&tags)?;
    let now_str = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE notes SET title=?1, content=?2, tags=?3, updated_at=?4 WHERE id=?5",
        params![title, content, tags_str, now_str, input.id],
    )?;
    get(conn, &input.id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM notes WHERE id=?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("笔记 {} 不存在", id)));
    }
    Ok(())
}
