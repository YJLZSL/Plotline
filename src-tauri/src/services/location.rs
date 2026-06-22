use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::{
    CreateLocationInput, LinkLocationsInput, Location, LocationLink, UpdateLocationInput,
};

pub fn list(conn: &Connection, workspace_id: &str) -> AppResult<Vec<Location>> {
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, name, description, pos_x, pos_y, color, icon,
                linked_event_id, created_at, updated_at
         FROM locations WHERE workspace_id=?1 ORDER BY created_at ASC",
    )?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        Ok(Location {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            pos_x: row.get(4)?,
            pos_y: row.get(5)?,
            color: row.get(6)?,
            icon: row.get(7)?,
            linked_event_id: row.get(8)?,
            character_ids: Vec::new(),
            created_at: row.get(9)?,
            updated_at: row.get(10)?,
        })
    })?;
    let mut locations: Vec<Location> = rows.collect::<Result<_, _>>()?;
    // 加载角色关联
    for loc in &mut locations {
        loc.character_ids = list_character_ids(conn, &loc.id)?;
    }
    Ok(locations)
}

fn list_character_ids(conn: &Connection, location_id: &str) -> AppResult<Vec<String>> {
    let mut stmt =
        conn.prepare("SELECT character_id FROM location_characters WHERE location_id=?1")?;
    let rows = stmt.query_map(params![location_id], |r| r.get::<_, String>(0))?;
    rows.collect::<Result<_, _>>().map_err(Into::into)
}

fn get(conn: &Connection, id: &str) -> AppResult<Location> {
    let mut loc = conn
        .query_row(
            "SELECT id, workspace_id, name, description, pos_x, pos_y, color, icon,
                    linked_event_id, created_at, updated_at
             FROM locations WHERE id=?1",
            params![id],
            |row| {
                Ok(Location {
                    id: row.get(0)?,
                    workspace_id: row.get(1)?,
                    name: row.get(2)?,
                    description: row.get(3)?,
                    pos_x: row.get(4)?,
                    pos_y: row.get(5)?,
                    color: row.get(6)?,
                    icon: row.get(7)?,
                    linked_event_id: row.get(8)?,
                    character_ids: Vec::new(),
                    created_at: row.get(9)?,
                    updated_at: row.get(10)?,
                })
            },
        )
        .map_err(|_| AppError::NotFound(format!("地点 {} 不存在", id)))?;
    loc.character_ids = list_character_ids(conn, id)?;
    Ok(loc)
}

pub fn create(conn: &Connection, input: CreateLocationInput) -> AppResult<Location> {
    let id = Uuid::new_v4().to_string();
    let now_str = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO locations
         (id, workspace_id, name, description, pos_x, pos_y, color, icon,
          linked_event_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id,
            input.workspace_id,
            input.name,
            input.description.unwrap_or_default(),
            input.pos_x.unwrap_or(200.0),
            input.pos_y.unwrap_or(200.0),
            input.color.unwrap_or_else(|| "#C68A3E".into()),
            input.icon.unwrap_or_else(|| "📍".into()),
            input.linked_event_id,
            now_str,
            now_str,
        ],
    )?;
    if let Some(cids) = input.character_ids {
        sync_characters(conn, &id, &cids)?;
    }
    get(conn, &id)
}

pub fn update(conn: &Connection, input: UpdateLocationInput) -> AppResult<Location> {
    let existing = get(conn, &input.id)?;
    let now_str = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE locations SET name=?1, description=?2, pos_x=?3, pos_y=?4, color=?5,
             icon=?6, linked_event_id=?7, updated_at=?8 WHERE id=?9",
        params![
            input.name.unwrap_or(existing.name),
            input.description.unwrap_or(existing.description),
            input.pos_x.unwrap_or(existing.pos_x),
            input.pos_y.unwrap_or(existing.pos_y),
            input.color.unwrap_or(existing.color),
            input.icon.unwrap_or(existing.icon),
            input.linked_event_id.unwrap_or(existing.linked_event_id),
            now_str,
            input.id,
        ],
    )?;
    if let Some(cids) = input.character_ids {
        sync_characters(conn, &input.id, &cids)?;
    }
    get(conn, &input.id)
}

fn sync_characters(conn: &Connection, location_id: &str, ids: &[String]) -> AppResult<()> {
    conn.execute(
        "DELETE FROM location_characters WHERE location_id=?1",
        params![location_id],
    )?;
    for cid in ids {
        conn.execute(
            "INSERT OR IGNORE INTO location_characters (location_id, character_id) VALUES (?1, ?2)",
            params![location_id, cid],
        )?;
    }
    Ok(())
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM locations WHERE id=?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("地点 {} 不存在", id)));
    }
    Ok(())
}

pub fn list_links(conn: &Connection, workspace_id: &str) -> AppResult<Vec<LocationLink>> {
    let mut stmt = conn.prepare(
        "SELECT ll.source_id, ll.target_id, ll.label, s.name, t.name
         FROM location_links ll
         JOIN locations s ON s.id = ll.source_id
         JOIN locations t ON t.id = ll.target_id
         WHERE s.workspace_id=?1",
    )?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        Ok(LocationLink {
            source_id: row.get(0)?,
            target_id: row.get(1)?,
            label: row.get(2)?,
            source_name: row.get(3)?,
            target_name: row.get(4)?,
        })
    })?;
    rows.collect::<Result<_, _>>().map_err(Into::into)
}

pub fn link(conn: &Connection, input: LinkLocationsInput) -> AppResult<()> {
    conn.execute(
        "INSERT INTO location_links (source_id, target_id, label) VALUES (?1, ?2, ?3)
         ON CONFLICT(source_id, target_id) DO UPDATE SET label = excluded.label",
        params![input.source_id, input.target_id, input.label.unwrap_or_default()],
    )?;
    Ok(())
}

pub fn unlink(conn: &Connection, source_id: &str, target_id: &str) -> AppResult<()> {
    conn.execute(
        "DELETE FROM location_links WHERE source_id=?1 AND target_id=?2",
        params![source_id, target_id],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrate::run;
    use tempfile::NamedTempFile;

    fn test_conn() -> Connection {
        let file = NamedTempFile::new().unwrap();
        let conn = Connection::open(file.path()).unwrap();
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();
        run(&conn).unwrap();
        conn.execute(
            "INSERT INTO workspaces (id, name, created_at, updated_at) VALUES ('w1', 'w', 't', 't')",
            [],
        )
        .unwrap();
        conn
    }

    #[test]
    fn should_create_and_list_location() {
        let conn = test_conn();
        let loc = create(
            &conn,
            CreateLocationInput {
                workspace_id: "w1".into(),
                name: "王城".into(),
                description: None,
                pos_x: Some(100.0),
                pos_y: Some(50.0),
                color: None,
                icon: None,
                linked_event_id: None,
                character_ids: None,
            },
        )
        .unwrap();
        assert_eq!(loc.name, "王城");
        assert_eq!(loc.pos_x, 100.0);
        let list = list(&conn, "w1").unwrap();
        assert_eq!(list.len(), 1);
    }

    #[test]
    fn should_sync_character_ids_on_update() {
        let conn = test_conn();
        conn.execute(
            "INSERT INTO characters (id, workspace_id, name, created_at, updated_at) \
             VALUES ('c1', 'w1', '主角', 't', 't')",
            [],
        )
        .unwrap();
        let loc = create(
            &conn,
            CreateLocationInput {
                workspace_id: "w1".into(),
                name: "酒馆".into(),
                description: None,
                pos_x: None,
                pos_y: None,
                color: None,
                icon: None,
                linked_event_id: None,
                character_ids: Some(vec!["c1".into()]),
            },
        )
        .unwrap();
        assert_eq!(loc.character_ids, vec!["c1".to_string()]);
        // 清空
        let updated = update(
            &conn,
            UpdateLocationInput {
                id: loc.id.clone(),
                name: None,
                description: None,
                pos_x: None,
                pos_y: None,
                color: None,
                icon: None,
                linked_event_id: None,
                character_ids: Some(vec![]),
            },
        )
        .unwrap();
        assert!(updated.character_ids.is_empty());
    }

    #[test]
    fn should_link_and_list_locations() {
        let conn = test_conn();
        let a = create(
            &conn,
            CreateLocationInput {
                workspace_id: "w1".into(),
                name: "A".into(),
                description: None,
                pos_x: None,
                pos_y: None,
                color: None,
                icon: None,
                linked_event_id: None,
                character_ids: None,
            },
        )
        .unwrap();
        let b = create(
            &conn,
            CreateLocationInput {
                workspace_id: "w1".into(),
                name: "B".into(),
                description: None,
                pos_x: None,
                pos_y: None,
                color: None,
                icon: None,
                linked_event_id: None,
                character_ids: None,
            },
        )
        .unwrap();
        link(
            &conn,
            LinkLocationsInput {
                workspace_id: "w1".into(),
                source_id: a.id.clone(),
                target_id: b.id.clone(),
                label: Some("道路".into()),
            },
        )
        .unwrap();
        let links = list_links(&conn, "w1").unwrap();
        assert_eq!(links.len(), 1);
        assert_eq!(links[0].source_name, "A");
        assert_eq!(links[0].target_name, "B");
        assert_eq!(links[0].label, "道路");
    }

    #[test]
    fn should_update_link_label() {
        let conn = test_conn();
        let a = create(
            &conn,
            CreateLocationInput {
                workspace_id: "w1".into(),
                name: "A".into(),
                description: None,
                pos_x: None,
                pos_y: None,
                color: None,
                icon: None,
                linked_event_id: None,
                character_ids: None,
            },
        )
        .unwrap();
        let b = create(
            &conn,
            CreateLocationInput {
                workspace_id: "w1".into(),
                name: "B".into(),
                description: None,
                pos_x: None,
                pos_y: None,
                color: None,
                icon: None,
                linked_event_id: None,
                character_ids: None,
            },
        )
        .unwrap();
        link(
            &conn,
            LinkLocationsInput {
                workspace_id: "w1".into(),
                source_id: a.id.clone(),
                target_id: b.id.clone(),
                label: Some("old".into()),
            },
        )
        .unwrap();
        link(
            &conn,
            LinkLocationsInput {
                workspace_id: "w1".into(),
                source_id: a.id.clone(),
                target_id: b.id.clone(),
                label: Some("new".into()),
            },
        )
        .unwrap();
        let links = list_links(&conn, "w1").unwrap();
        assert_eq!(links.len(), 1);
        assert_eq!(links[0].label, "new");
    }

    #[test]
    fn should_delete_location() {
        let conn = test_conn();
        let loc = create(
            &conn,
            CreateLocationInput {
                workspace_id: "w1".into(),
                name: "废弃".into(),
                description: None,
                pos_x: None,
                pos_y: None,
                color: None,
                icon: None,
                linked_event_id: None,
                character_ids: None,
            },
        )
        .unwrap();
        delete(&conn, &loc.id).unwrap();
        let list = list(&conn, "w1").unwrap();
        assert!(list.is_empty());
    }
}
