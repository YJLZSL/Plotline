use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::{
    ConnectEventsInput, CreateEventInput, Event, EventConnection, UpdateEventInput,
};

fn parse_image_urls(json_str: &str) -> Vec<String> {
    serde_json::from_str(json_str).unwrap_or_default()
}

pub fn list(conn: &Connection, workspace_id: &str) -> AppResult<Vec<Event>> {
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, track_id, title, description, date_type, date_value,
                sort_order, status, color, location_id, image_urls, created_at, updated_at
         FROM events WHERE workspace_id = ?1 ORDER BY track_id, sort_order, created_at",
    )?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        let image_urls: String = row.get(11)?;
        Ok(Event {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            track_id: row.get(2)?,
            title: row.get(3)?,
            description: row.get(4)?,
            date_type: row.get(5)?,
            date_value: row.get(6)?,
            sort_order: row.get(7)?,
            status: row.get(8)?,
            color: row.get(9)?,
            location_id: row.get(10)?,
            image_urls: parse_image_urls(&image_urls),
            character_ids: Vec::new(),
            connected_event_ids: Vec::new(),
            created_at: row.get(12)?,
            updated_at: row.get(13)?,
        })
    })?;
    let mut events: Vec<Event> = rows.collect::<Result<_, _>>()?;
    for ev in events.iter_mut() {
        ev.character_ids = list_character_ids(conn, &ev.id)?;
        ev.connected_event_ids = list_connected_event_ids(conn, &ev.id)?;
    }
    Ok(events)
}

fn list_character_ids(conn: &Connection, event_id: &str) -> AppResult<Vec<String>> {
    let mut stmt = conn.prepare("SELECT character_id FROM event_characters WHERE event_id = ?1")?;
    let rows = stmt.query_map(params![event_id], |r| r.get::<_, String>(0))?;
    Ok(rows.collect::<Result<_, _>>()?)
}

fn list_connected_event_ids(conn: &Connection, event_id: &str) -> AppResult<Vec<String>> {
    let mut stmt = conn.prepare("SELECT target_id FROM event_connections WHERE source_id = ?1")?;
    let rows = stmt.query_map(params![event_id], |r| r.get::<_, String>(0))?;
    Ok(rows.collect::<Result<_, _>>()?)
}

fn get(conn: &Connection, id: &str) -> AppResult<Event> {
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, track_id, title, description, date_type, date_value,
                sort_order, status, color, location_id, image_urls, created_at, updated_at
         FROM events WHERE id = ?1",
    )?;
    let mut event = stmt
        .query_row(params![id], |row| {
            let image_urls: String = row.get(11)?;
            Ok(Event {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                track_id: row.get(2)?,
                title: row.get(3)?,
                description: row.get(4)?,
                date_type: row.get(5)?,
                date_value: row.get(6)?,
                sort_order: row.get(7)?,
                status: row.get(8)?,
                color: row.get(9)?,
                location_id: row.get(10)?,
                image_urls: parse_image_urls(&image_urls),
                character_ids: Vec::new(),
                connected_event_ids: Vec::new(),
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })
        .map_err(|e| crate::error::map_not_found(e, format!("事件 {} 不存在", id)))?;
    event.character_ids = list_character_ids(conn, id)?;
    event.connected_event_ids = list_connected_event_ids(conn, id)?;
    Ok(event)
}

pub fn create(conn: &Connection, input: CreateEventInput) -> AppResult<Event> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let now_str = now.to_rfc3339();
    let date_type = input.date_type.unwrap_or_else(|| "relative".into());
    let status = input.status.unwrap_or_else(|| "draft".into());
    let sort_order = input.sort_order.unwrap_or(0);
    let image_urls = serde_json::to_string(&input.image_urls.unwrap_or_default())?;
    let tx = conn.unchecked_transaction()?;
    tx.execute(
        "INSERT INTO events
         (id, workspace_id, track_id, title, description, date_type, date_value,
          sort_order, status, color, location_id, image_urls, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            id,
            input.workspace_id,
            input.track_id,
            input.title,
            input.description.unwrap_or_default(),
            date_type,
            input.date_value.unwrap_or_default(),
            sort_order,
            status,
            input.color,
            input.location_id,
            image_urls,
            now_str,
            now_str,
        ],
    )?;
    if let Some(cids) = input.character_ids {
        for cid in cids {
            tx.execute(
                "INSERT OR IGNORE INTO event_characters (event_id, character_id) VALUES (?1, ?2)",
                params![id, cid],
            )?;
        }
    }
    tx.commit()?;
    get(conn, &id)
}

pub fn update(conn: &Connection, input: UpdateEventInput) -> AppResult<Event> {
    let existing = get(conn, &input.id)?;
    let title = input.title.unwrap_or(existing.title);
    let description = input.description.unwrap_or(existing.description);
    let track_id = input.track_id.unwrap_or(existing.track_id);
    let date_type = input.date_type.unwrap_or(existing.date_type);
    let date_value = input.date_value.unwrap_or(existing.date_value);
    let sort_order = input.sort_order.unwrap_or(existing.sort_order);
    let status = input.status.unwrap_or(existing.status);
    let color = input.color.unwrap_or(existing.color);
    let location_id = input.location_id.unwrap_or(existing.location_id);
    let image_urls = input.image_urls.map(|v| serde_json::to_string(&v).unwrap_or_default()).unwrap_or(serde_json::to_string(&existing.image_urls).unwrap_or_default());
    let now_str = Utc::now().to_rfc3339();

    let tx = conn.unchecked_transaction()?;
    tx.execute(
        "UPDATE events SET title=?1, description=?2, track_id=?3, date_type=?4,
            date_value=?5, sort_order=?6, status=?7, color=?8, location_id=?9, image_urls=?10, updated_at=?11 WHERE id=?12",
        params![
            title,
            description,
            track_id,
            date_type,
            date_value,
            sort_order,
            status,
            color,
            location_id,
            image_urls,
            now_str,
            input.id,
        ],
    )?;
    if let Some(cids) = input.character_ids {
        tx.execute(
            "DELETE FROM event_characters WHERE event_id=?1",
            params![input.id],
        )?;
        for cid in cids {
            tx.execute(
                "INSERT OR IGNORE INTO event_characters (event_id, character_id) VALUES (?1, ?2)",
                params![input.id, cid],
            )?;
        }
    }
    tx.commit()?;
    get(conn, &input.id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM events WHERE id=?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("事件 {} 不存在", id)));
    }
    Ok(())
}

pub fn connect(conn: &Connection, input: ConnectEventsInput) -> AppResult<()> {
    conn.execute(
        "INSERT OR IGNORE INTO event_connections (source_id, target_id, type) VALUES (?1, ?2, ?3)",
        params![
            input.source_id,
            input.target_id,
            input.connection_type.unwrap_or_else(|| "causal".into()),
        ],
    )?;
    Ok(())
}

pub fn disconnect(conn: &Connection, source_id: &str, target_id: &str) -> AppResult<()> {
    let affected = conn.execute(
        "DELETE FROM event_connections WHERE source_id=?1 AND target_id=?2",
        params![source_id, target_id],
    )?;
    if affected == 0 {
        return Err(AppError::NotFound(format!(
            "事件连接 {} -> {} 不存在",
            source_id, target_id
        )));
    }
    Ok(())
}

pub fn list_connections(conn: &Connection, workspace_id: &str) -> AppResult<Vec<EventConnection>> {
    let mut stmt = conn.prepare(
        "SELECT ec.source_id, ec.target_id, ec.type, s.title, t.title
         FROM event_connections ec
         JOIN events s ON s.id = ec.source_id
         JOIN events t ON t.id = ec.target_id
         WHERE s.workspace_id = ?1 AND t.workspace_id = ?1
         ORDER BY s.sort_order, t.sort_order",
    )?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        Ok(EventConnection {
            source_id: row.get(0)?,
            target_id: row.get(1)?,
            connection_type: row.get(2)?,
            source_title: row.get(3)?,
            target_title: row.get(4)?,
        })
    })?;
    rows.collect::<Result<_, _>>().map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn in_memory_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        crate::db::migrate::run(&conn).unwrap();
        conn
    }

    #[test]
    fn event_loads_connected_event_ids() {
        let conn = in_memory_db();
        conn.execute(
            "INSERT INTO workspaces (id, name, description, template, cover_color, settings_json, created_at, updated_at)
             VALUES ('ws', 'WS', '', 'blank', '#C68A3E', '{}', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO tracks (id, workspace_id, name, color, sort_order, is_visible, created_at)
             VALUES ('t1', 'ws', 'T1', '#F4B6C2', 0, 1, '2024-01-01T00:00:00Z')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO events (id, workspace_id, track_id, title, description, date_type, date_value, sort_order, status, image_urls, created_at, updated_at)
             VALUES ('e1', 'ws', 't1', 'Source', '', 'relative', '', 0, 'draft', '[]', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO events (id, workspace_id, track_id, title, description, date_type, date_value, sort_order, status, image_urls, created_at, updated_at)
             VALUES ('e2', 'ws', 't1', 'Target', '', 'relative', '', 1, 'draft', '[]', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')",
            [],
        ).unwrap();
        connect(
            &conn,
            ConnectEventsInput {
                source_id: "e1".into(),
                target_id: "e2".into(),
                connection_type: Some("foreshadow".into()),
            },
        )
        .unwrap();

        let events = list(&conn, "ws").unwrap();
        let source = events.iter().find(|e| e.id == "e1").unwrap();
        assert_eq!(source.connected_event_ids, vec!["e2"]);
    }

    #[test]
    fn list_connections_returns_typed_connections() {
        let conn = in_memory_db();
        conn.execute(
            "INSERT INTO workspaces (id, name, description, template, cover_color, settings_json, created_at, updated_at)
             VALUES ('ws', 'WS', '', 'blank', '#C68A3E', '{}', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO tracks (id, workspace_id, name, color, sort_order, is_visible, created_at)
             VALUES ('t1', 'ws', 'T1', '#F4B6C2', 0, 1, '2024-01-01T00:00:00Z')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO events (id, workspace_id, track_id, title, description, date_type, date_value, sort_order, status, image_urls, created_at, updated_at)
             VALUES ('e1', 'ws', 't1', 'Source', '', 'relative', '', 0, 'draft', '[]', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO events (id, workspace_id, track_id, title, description, date_type, date_value, sort_order, status, image_urls, created_at, updated_at)
             VALUES ('e2', 'ws', 't1', 'Target', '', 'relative', '', 1, 'draft', '[]', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')",
            [],
        ).unwrap();
        connect(
            &conn,
            ConnectEventsInput {
                source_id: "e1".into(),
                target_id: "e2".into(),
                connection_type: Some("causal".into()),
            },
        )
        .unwrap();

        let conns = list_connections(&conn, "ws").unwrap();
        assert_eq!(conns.len(), 1);
        assert_eq!(conns[0].connection_type, "causal");
        assert_eq!(conns[0].source_title, "Source");
        assert_eq!(conns[0].target_title, "Target");
    }

    #[test]
    fn event_persists_location_id() {
        let conn = in_memory_db();
        conn.execute(
            "INSERT INTO workspaces (id, name, description, template, cover_color, settings_json, created_at, updated_at)
             VALUES ('ws', 'WS', '', 'blank', '#C68A3E', '{}', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO tracks (id, workspace_id, name, color, sort_order, is_visible, created_at)
             VALUES ('t1', 'ws', 'T1', '#F4B6C2', 0, 1, '2024-01-01T00:00:00Z')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO locations (id, workspace_id, name, pos_x, pos_y, color, icon, created_at, updated_at)
             VALUES ('l1', 'ws', 'City', 0, 0, '#C68A3E', '📍', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')",
            [],
        )
        .unwrap();

        let created = create(
            &conn,
            CreateEventInput {
                workspace_id: "ws".into(),
                track_id: "t1".into(),
                title: "Located".into(),
                description: None,
                date_type: None,
                date_value: None,
                sort_order: None,
                status: None,
                color: None,
                location_id: Some("l1".into()),
                image_urls: None,
                character_ids: None,
            },
        )
        .unwrap();
        assert_eq!(created.location_id, Some("l1".into()));

        let updated = update(
            &conn,
            UpdateEventInput {
                id: created.id.clone(),
                title: None,
                description: None,
                track_id: None,
                date_type: None,
                date_value: None,
                sort_order: None,
                status: None,
                color: None,
                location_id: Some(None),
                image_urls: None,
                character_ids: None,
            },
        )
        .unwrap();
        assert_eq!(updated.location_id, None);
    }
}
