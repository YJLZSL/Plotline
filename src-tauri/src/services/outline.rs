use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::{
    CreateOutlineNodeInput, MoveOutlineNodeInput, OutlineNode, UpdateOutlineNodeInput,
};

pub fn list(conn: &Connection, workspace_id: &str) -> AppResult<Vec<OutlineNode>> {
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, type, title, content, parent_id, sort_order,
                event_id, status, created_at, updated_at
         FROM outline_nodes WHERE workspace_id=?1 ORDER BY sort_order ASC",
    )?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        Ok(OutlineNode {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            r#type: row.get(2)?,
            title: row.get(3)?,
            content: row.get(4)?,
            parent_id: row.get(5)?,
            sort_order: row.get(6)?,
            event_id: row.get(7)?,
            status: row.get(8)?,
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    })?;
    rows.collect::<Result<_, _>>().map_err(Into::into)
}

fn get(conn: &Connection, id: &str) -> AppResult<OutlineNode> {
    conn.query_row(
        "SELECT id, workspace_id, type, title, content, parent_id, sort_order,
                event_id, status, created_at, updated_at
         FROM outline_nodes WHERE id=?1",
        params![id],
        |row| {
            Ok(OutlineNode {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                r#type: row.get(2)?,
                title: row.get(3)?,
                content: row.get(4)?,
                parent_id: row.get(5)?,
                sort_order: row.get(6)?,
                event_id: row.get(7)?,
                status: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        },
    )
    .map_err(|_| AppError::NotFound(format!("大纲节点 {} 不存在", id)))
}

pub fn create(conn: &Connection, input: CreateOutlineNodeInput) -> AppResult<OutlineNode> {
    let id = Uuid::new_v4().to_string();
    let now_str = Utc::now().to_rfc3339();
    let ntype = input.r#type.unwrap_or_else(|| "chapter".into());
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM outline_nodes WHERE workspace_id=?1 AND IFNULL(parent_id, '')=IFNULL(?2, '')",
            params![input.workspace_id, input.parent_id],
            |r| r.get(0),
        )
        .unwrap_or(0);
    conn.execute(
        "INSERT INTO outline_nodes
         (id, workspace_id, type, title, content, parent_id, sort_order, event_id, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'draft', ?9, ?10)",
        params![
            id,
            input.workspace_id,
            ntype,
            input.title,
            input.content.unwrap_or_default(),
            input.parent_id,
            count,
            input.event_id,
            now_str,
            now_str,
        ],
    )?;
    get(conn, &id)
}

pub fn update(conn: &Connection, input: UpdateOutlineNodeInput) -> AppResult<OutlineNode> {
    let existing = get(conn, &input.id)?;
    let title = input.title.unwrap_or(existing.title);
    let content = input.content.unwrap_or(existing.content);
    let event_id = input.event_id.unwrap_or(existing.event_id);
    let status = input.status.unwrap_or(existing.status);
    let now_str = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE outline_nodes SET title=?1, content=?2, event_id=?3, status=?4, updated_at=?5
         WHERE id=?6",
        params![title, content, event_id, status, now_str, input.id],
    )?;
    get(conn, &input.id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM outline_nodes WHERE id=?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("大纲节点 {} 不存在", id)));
    }
    Ok(())
}

pub fn move_node(conn: &Connection, input: MoveOutlineNodeInput) -> AppResult<OutlineNode> {
    let now_str = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE outline_nodes SET parent_id=?1, sort_order=?2, updated_at=?3 WHERE id=?4",
        params![input.parent_id, input.sort_order, now_str, input.id],
    )?;
    get(conn, &input.id)
}
