use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::{CreateTrackInput, ReorderTracksInput, Track, UpdateTrackInput};

const TRACK_PALETTE: [&str; 6] = [
    "#F4B6C2", "#B6D4F4", "#B6F4C8", "#F4E4B6", "#D8B6F4", "#F4CBB6",
];

pub fn list(conn: &Connection, workspace_id: &str) -> AppResult<Vec<Track>> {
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, name, color, sort_order, is_visible, created_at
         FROM tracks WHERE workspace_id=?1 ORDER BY sort_order ASC",
    )?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        Ok(Track {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            name: row.get(2)?,
            color: row.get(3)?,
            sort_order: row.get(4)?,
            is_visible: row.get::<_, i64>(5)? != 0,
            created_at: row.get(6)?,
        })
    })?;
    rows.collect::<Result<_, _>>().map_err(Into::into)
}

fn get(conn: &Connection, id: &str) -> AppResult<Track> {
    conn.query_row(
        "SELECT id, workspace_id, name, color, sort_order, is_visible, created_at
         FROM tracks WHERE id=?1",
        params![id],
        |row| {
            Ok(Track {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                name: row.get(2)?,
                color: row.get(3)?,
                sort_order: row.get(4)?,
                is_visible: row.get::<_, i64>(5)? != 0,
                created_at: row.get(6)?,
            })
        },
    )
    .map_err(|_| AppError::NotFound(format!("轨道 {} 不存在", id)))
}

pub fn create(conn: &Connection, input: CreateTrackInput) -> AppResult<Track> {
    let id = Uuid::new_v4().to_string();
    let now_str = Utc::now().to_rfc3339();
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM tracks WHERE workspace_id=?1",
            params![input.workspace_id],
            |r| r.get(0),
        )
        .unwrap_or(0);
    let color = input
        .color
        .unwrap_or_else(|| TRACK_PALETTE[(count as usize) % TRACK_PALETTE.len()].into());
    conn.execute(
        "INSERT INTO tracks (id, workspace_id, name, color, sort_order, is_visible, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)",
        params![id, input.workspace_id, input.name, color, count, now_str],
    )?;
    get(conn, &id)
}

pub fn update(conn: &Connection, input: UpdateTrackInput) -> AppResult<Track> {
    let existing = get(conn, &input.id)?;
    let name = input.name.unwrap_or(existing.name);
    let color = input.color.unwrap_or(existing.color);
    let is_visible = input.is_visible.unwrap_or(existing.is_visible);
    conn.execute(
        "UPDATE tracks SET name=?1, color=?2, is_visible=?3 WHERE id=?4",
        params![name, color, is_visible as i64, input.id],
    )?;
    get(conn, &input.id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM tracks WHERE workspace_id=(SELECT workspace_id FROM tracks WHERE id=?1)",
        params![id],
        |r| r.get(0),
    )?;
    if count <= 1 {
        return Err(AppError::Forbidden("至少保留一个轨道".into()));
    }
    let affected = conn.execute("DELETE FROM tracks WHERE id=?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("轨道 {} 不存在", id)));
    }
    Ok(())
}

pub fn reorder(conn: &Connection, input: ReorderTracksInput) -> AppResult<Vec<Track>> {
    let tx = conn.unchecked_transaction()?;
    for (i, id) in input.ordered_ids.iter().enumerate() {
        tx.execute(
            "UPDATE tracks SET sort_order=?1 WHERE id=?2 AND workspace_id=?3",
            params![i as i64, id, input.workspace_id],
        )?;
    }
    tx.commit()?;
    list(conn, &input.workspace_id)
}
