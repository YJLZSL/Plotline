use chrono::Utc;
use rusqlite::{params, Connection};
use serde_json::Value;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::{CreateWorkspaceInput, UpdateWorkspaceInput, Workspace, WorkspaceBundle};

fn parse_settings(s: &str) -> Value {
    serde_json::from_str(s).unwrap_or_else(|e| {
        log::warn!("[workspace] corrupted settings JSON, defaulting to null: {e}");
        Value::Null
    })
}

pub fn list(conn: &Connection) -> AppResult<Vec<Workspace>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, template, cover_color, settings_json,
                created_at, updated_at
         FROM workspaces ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        let settings_str: String = row.get(5)?;
        let settings = parse_settings(&settings_str);
        Ok(Workspace {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            template: row.get(3)?,
            cover_color: row.get(4)?,
            settings,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;
    rows.collect::<Result<_, _>>().map_err(Into::into)
}

pub fn get(conn: &Connection, id: &str) -> AppResult<Workspace> {
    conn.query_row(
        "SELECT id, name, description, template, cover_color, settings_json,
                created_at, updated_at
         FROM workspaces WHERE id=?1",
        params![id],
        |row| {
            let settings_str: String = row.get(5)?;
            let settings = parse_settings(&settings_str);
            Ok(Workspace {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                template: row.get(3)?,
                cover_color: row.get(4)?,
                settings,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| crate::error::map_not_found(e, format!("工作区 {} 不存在", id)))
}

pub fn create(conn: &Connection, input: CreateWorkspaceInput) -> AppResult<Workspace> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let now_str = now.to_rfc3339();
    let template = input.template.unwrap_or_else(|| "blank".into());
    let cover_color = input.cover_color.unwrap_or_else(|| "#C68A3E".into());
    conn.execute(
        "INSERT INTO workspaces (id, name, description, template, cover_color, settings_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, '{}', ?6, ?7)",
        params![
            id,
            input.name,
            input.description.unwrap_or_default(),
            template,
            cover_color,
            now_str,
            now_str,
        ],
    )?;
    seed_template(conn, &id, &template)?;
    get(conn, &id)
}

fn seed_template(conn: &Connection, workspace_id: &str, template: &str) -> AppResult<()> {
    let now_str = Utc::now().to_rfc3339();
    match template {
        "hero-journey" => {
            let tracks = [
                ("主线", "#F4B6C2"),
                ("召唤", "#B6D4F4"),
                ("试炼", "#B6F4C8"),
                ("归来", "#F4E4B6"),
            ];
            for (i, (name, color)) in tracks.iter().enumerate() {
                let tid = Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO tracks (id, workspace_id, name, color, sort_order, is_visible, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)",
                    params![tid, workspace_id, name, color, i as i64, now_str],
                )?;
            }
            Ok(())
        }
        "three-act" => {
            let tracks = [
                ("第一幕 - 建置", "#F4B6C2"),
                ("第二幕 - 冲突", "#B6D4F4"),
                ("第三幕 - 解决", "#B6F4C8"),
            ];
            for (i, (name, color)) in tracks.iter().enumerate() {
                let tid = Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO tracks (id, workspace_id, name, color, sort_order, is_visible, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6)",
                    params![tid, workspace_id, name, color, i as i64, now_str],
                )?;
            }
            Ok(())
        }
        _ => {
            let tid = Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO tracks (id, workspace_id, name, color, sort_order, is_visible, created_at)
                 VALUES (?1, ?2, ?3, ?4, 0, 1, ?5)",
                params![tid, workspace_id, "主线", "#F4B6C2", now_str],
            )?;
            Ok(())
        }
    }
}

pub fn update(conn: &Connection, input: UpdateWorkspaceInput) -> AppResult<Workspace> {
    let existing = get(conn, &input.id)?;
    let name = input.name.unwrap_or(existing.name);
    let description = input.description.unwrap_or(existing.description);
    let cover_color = input.cover_color.unwrap_or(existing.cover_color);
    let settings = input.settings.unwrap_or(existing.settings);
    let settings_str = serde_json::to_string(&settings)?;
    let now_str = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE workspaces SET name=?1, description=?2, cover_color=?3, settings_json=?4, updated_at=?5
         WHERE id=?6",
        params![name, description, cover_color, settings_str, now_str, input.id],
    )?;
    get(conn, &input.id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM workspaces WHERE id=?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("工作区 {} 不存在", id)));
    }
    Ok(())
}

/// 导出工作区为完整 Bundle。
pub fn export_bundle(conn: &Connection, workspace_id: &str) -> AppResult<WorkspaceBundle> {
    let scenes = crate::services::vn::list_scenes(conn, workspace_id)?;
    let mut lines = Vec::new();
    for scene in &scenes {
        lines.extend(crate::services::vn::list_lines(conn, &scene.id)?);
    }
    Ok(WorkspaceBundle {
        version: 2,
        workspace: get(conn, workspace_id)?,
        tracks: crate::services::track::list(conn, workspace_id)?,
        events: crate::services::event::list(conn, workspace_id)?,
        characters: crate::services::character::list(conn, workspace_id)?,
        relationships: crate::services::character::list_relationships(conn, workspace_id)?,
        event_connections: crate::services::event::list_connections(conn, workspace_id)?,
        outline_nodes: crate::services::outline::list(conn, workspace_id)?,
        notes: crate::services::note::list(conn, workspace_id)?,
        locations: crate::services::location::list(conn, workspace_id)?,
        location_links: crate::services::location::list_links(conn, workspace_id)?,
        vn_scenes: scenes,
        vn_lines: lines,
    })
}

/// 从 Bundle 导入：用新 ID 重建所有数据，避免冲突。
pub fn import_bundle(conn: &Connection, mut bundle: WorkspaceBundle) -> AppResult<Workspace> {
    let now = Utc::now();
    let now_str = now.to_rfc3339();
    let new_ws_id = Uuid::new_v4().to_string();

    let tx = conn.unchecked_transaction()?;

    let new_ws = Workspace {
        id: new_ws_id.clone(),
        name: format!("{}（导入）", bundle.workspace.name),
        description: bundle.workspace.description.clone(),
        template: bundle.workspace.template.clone(),
        cover_color: bundle.workspace.cover_color.clone(),
        settings: bundle.workspace.settings.clone(),
        created_at: now,
        updated_at: now,
    };
    tx.execute(
        "INSERT INTO workspaces (id, name, description, template, cover_color, settings_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            new_ws.id,
            new_ws.name,
            new_ws.description,
            new_ws.template,
            new_ws.cover_color,
            serde_json::to_string(&new_ws.settings)?,
            now_str,
            now_str,
        ],
    )?;

    let mut track_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for t in bundle.tracks.drain(..) {
        let new_id = Uuid::new_v4().to_string();
        track_map.insert(t.id.clone(), new_id.clone());
        tx.execute(
            "INSERT INTO tracks (id, workspace_id, name, color, sort_order, is_visible, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                new_id,
                new_ws_id,
                t.name,
                t.color,
                t.sort_order,
                t.is_visible as i64,
                now_str
            ],
        )?;
    }

    let mut char_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for c in bundle.characters.drain(..) {
        let new_id = Uuid::new_v4().to_string();
        char_map.insert(c.id.clone(), new_id.clone());
        tx.execute(
            "INSERT INTO characters
             (id, workspace_id, name, aliases, avatar, description, appearance, backstory,
              goals, conflicts, arc, tags, color, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                new_id,
                new_ws_id,
                c.name,
                serde_json::to_string(&c.aliases)?,
                c.avatar,
                c.description,
                c.appearance,
                c.backstory,
                c.goals,
                c.conflicts,
                c.arc,
                serde_json::to_string(&c.tags)?,
                c.color,
                now_str,
                now_str,
            ],
        )?;
    }

    let mut event_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for ev in bundle.events.drain(..) {
        let new_id = Uuid::new_v4().to_string();
        event_map.insert(ev.id.clone(), new_id.clone());
        let new_track = track_map.get(&ev.track_id).cloned().unwrap_or_default();
        tx.execute(
            "INSERT INTO events
             (id, workspace_id, track_id, title, description, date_type, date_value,
              sort_order, status, color, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                new_id,
                new_ws_id,
                new_track,
                ev.title,
                ev.description,
                ev.date_type,
                ev.date_value,
                ev.sort_order,
                ev.status,
                ev.color,
                now_str,
                now_str,
            ],
        )?;
        for cid in ev.character_ids.iter() {
            if let Some(new_cid) = char_map.get(cid) {
                tx.execute(
                    "INSERT OR IGNORE INTO event_characters (event_id, character_id) VALUES (?1, ?2)",
                    params![new_id, new_cid],
                )?;
            }
        }
    }

    for rel in bundle.relationships.drain(..) {
        let new_source = char_map.get(&rel.source_id).cloned().unwrap_or_default();
        let new_target = char_map.get(&rel.target_id).cloned().unwrap_or_default();
        let new_id = Uuid::new_v4().to_string();
        tx.execute(
            "INSERT INTO character_relationships
             (id, workspace_id, source_id, target_id, type, description, strength)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                new_id,
                new_ws_id,
                new_source,
                new_target,
                rel.r#type,
                rel.description,
                rel.strength
            ],
        )?;
    }

    for ec in bundle.event_connections.drain(..) {
        let new_source = event_map.get(&ec.source_id).cloned().unwrap_or_default();
        let new_target = event_map.get(&ec.target_id).cloned().unwrap_or_default();
        tx.execute(
            "INSERT OR IGNORE INTO event_connections (source_id, target_id, type) VALUES (?1, ?2, ?3)",
            params![new_source, new_target, ec.connection_type],
        )?;
    }

    let mut note_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    for n in &bundle.notes {
        note_map.insert(n.id.clone(), Uuid::new_v4().to_string());
    }
    let note_ws_id = Some(new_ws_id.clone());
    for n in bundle.notes.drain(..) {
        let new_id = note_map
            .get(&n.id)
            .cloned()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let new_folder = n.folder_id.and_then(|fid| note_map.get(&fid).cloned());
        tx.execute(
            "INSERT INTO notes
             (id, workspace_id, folder_id, title, content, tags, is_folder, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                new_id,
                note_ws_id,
                new_folder,
                n.title,
                n.content,
                serde_json::to_string(&n.tags)?,
                n.is_folder as i64,
                n.sort_order,
                now_str,
                now_str,
            ],
        )?;
    }

    let mut outline_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    for o in &bundle.outline_nodes {
        outline_map.insert(o.id.clone(), Uuid::new_v4().to_string());
    }
    for o in bundle.outline_nodes.drain(..) {
        let new_id = outline_map
            .get(&o.id)
            .cloned()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let new_event = o.event_id.and_then(|eid| event_map.get(&eid).cloned());
        let new_parent = o.parent_id.and_then(|pid| outline_map.get(&pid).cloned());
        tx.execute(
            "INSERT INTO outline_nodes
             (id, workspace_id, type, title, content, parent_id, sort_order, event_id, status, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                new_id,
                new_ws_id,
                o.r#type,
                o.title,
                o.content,
                new_parent,
                o.sort_order,
                new_event,
                o.status,
                now_str,
                now_str,
            ],
        )?;
    }

    let mut location_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    for loc in &bundle.locations {
        location_map.insert(loc.id.clone(), Uuid::new_v4().to_string());
    }
    for loc in bundle.locations.drain(..) {
        let new_id = location_map
            .get(&loc.id)
            .cloned()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let new_linked_event = loc
            .linked_event_id
            .and_then(|eid| event_map.get(&eid).cloned());
        let new_char_ids: Vec<String> = loc
            .character_ids
            .iter()
            .filter_map(|cid| char_map.get(cid).cloned())
            .collect();
        tx.execute(
            "INSERT INTO locations
             (id, workspace_id, name, description, pos_x, pos_y, color, icon,
              linked_event_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                new_id,
                new_ws_id,
                loc.name,
                loc.description,
                loc.pos_x,
                loc.pos_y,
                loc.color,
                loc.icon,
                new_linked_event,
                now_str,
                now_str,
            ],
        )?;
        for cid in new_char_ids {
            tx.execute(
                "INSERT OR IGNORE INTO location_characters (location_id, character_id) VALUES (?1, ?2)",
                params![new_id, cid],
            )?;
        }
    }

    for link in bundle.location_links.drain(..) {
        let new_source = location_map
            .get(&link.source_id)
            .cloned()
            .unwrap_or_default();
        let new_target = location_map
            .get(&link.target_id)
            .cloned()
            .unwrap_or_default();
        tx.execute(
            "INSERT OR IGNORE INTO location_links (source_id, target_id, label) VALUES (?1, ?2, ?3)",
            params![new_source, new_target, link.label],
        )?;
    }

    let mut scene_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    for scene in &bundle.vn_scenes {
        scene_map.insert(scene.id.clone(), Uuid::new_v4().to_string());
    }
    for scene in bundle.vn_scenes.drain(..) {
        let new_id = scene_map
            .get(&scene.id)
            .cloned()
            .unwrap_or_else(|| Uuid::new_v4().to_string());
        let new_outline = scene
            .outline_node_id
            .and_then(|oid| outline_map.get(&oid).cloned());
        tx.execute(
            "INSERT INTO vn_scenes
             (id, workspace_id, title, background, background_asset_path, bgm_path,
              outline_node_id, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                new_id,
                new_ws_id,
                scene.title,
                scene.background,
                scene.background_asset_path,
                scene.bgm_path,
                new_outline,
                scene.sort_order,
                now_str,
                now_str,
            ],
        )?;
    }

    for line in bundle.vn_lines.drain(..) {
        let new_id = Uuid::new_v4().to_string();
        let new_scene = scene_map
            .get(&line.scene_id)
            .cloned()
            .unwrap_or_default();
        let new_character = line
            .character_id
            .and_then(|cid| char_map.get(&cid).cloned());
        let new_choice_target = line
            .choice_target_scene_id
            .and_then(|sid| scene_map.get(&sid).cloned());
        tx.execute(
            "INSERT INTO vn_lines
             (id, scene_id, sort_order, line_type, character_id, speaker_name, text,
              emotion, choice_label, choice_target_scene_id, sprite_asset_path, voice_path, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                new_id,
                new_scene,
                line.sort_order,
                line.line_type,
                new_character,
                line.speaker_name,
                line.text,
                line.emotion,
                line.choice_label,
                new_choice_target,
                line.sprite_asset_path,
                line.voice_path,
                now_str,
            ],
        )?;
    }

    tx.commit()?;
    Ok(new_ws)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrate::run;
    use crate::models::{Event, Note, OutlineNode, Track};
    use tempfile::NamedTempFile;

    fn test_conn() -> Connection {
        let file = NamedTempFile::new().unwrap();
        let conn = Connection::open(file.path()).unwrap();
        conn.pragma_update(None, "foreign_keys", "ON").unwrap();
        run(&conn).unwrap();
        conn
    }

    fn now() -> chrono::DateTime<Utc> {
        Utc::now()
    }

    fn sample_bundle() -> WorkspaceBundle {
        let t = now();
        let ws = Workspace {
            id: "old-ws".into(),
            name: "测试工作区".into(),
            description: "".into(),
            template: "blank".into(),
            cover_color: "#C68A3E".into(),
            settings: serde_json::json!({}),
            created_at: t,
            updated_at: t,
        };
        let track = Track {
            id: "t1".into(),
            workspace_id: "old-ws".into(),
            name: "主线".into(),
            color: "#F4B6C2".into(),
            sort_order: 0,
            is_visible: true,
            created_at: t,
        };
        let event = Event {
            id: "e1".into(),
            workspace_id: "old-ws".into(),
            track_id: "t1".into(),
            title: "开端".into(),
            description: "".into(),
            date_type: "point".into(),
            date_value: "".into(),
            sort_order: 0,
            status: "draft".into(),
            color: None,
            character_ids: vec![],
            connected_event_ids: vec![],
            created_at: t,
            updated_at: t,
        };
        let folder_note = Note {
            id: "n-folder".into(),
            workspace_id: Some("old-ws".into()),
            folder_id: None,
            title: "素材夹".into(),
            content: "".into(),
            tags: vec![],
            is_folder: true,
            sort_order: 0,
            created_at: t,
            updated_at: t,
        };
        let child_note = Note {
            id: "n-child".into(),
            workspace_id: Some("old-ws".into()),
            folder_id: Some("n-folder".into()),
            title: "灵感".into(),
            content: "记下点东西".into(),
            tags: vec!["idea".into()],
            is_folder: false,
            sort_order: 1,
            created_at: t,
            updated_at: t,
        };
        let parent_outline = OutlineNode {
            id: "o-parent".into(),
            workspace_id: "old-ws".into(),
            r#type: "chapter".into(),
            title: "第一章".into(),
            content: "".into(),
            parent_id: None,
            sort_order: 0,
            event_id: None,
            status: "draft".into(),
            created_at: t,
            updated_at: t,
        };
        let child_outline = OutlineNode {
            id: "o-child".into(),
            workspace_id: "old-ws".into(),
            r#type: "section".into(),
            title: "第一节".into(),
            content: "".into(),
            parent_id: Some("o-parent".into()),
            sort_order: 0,
            event_id: None,
            status: "draft".into(),
            created_at: t,
            updated_at: t,
        };
        WorkspaceBundle {
            version: 2,
            workspace: ws,
            tracks: vec![track],
            events: vec![event],
            characters: vec![],
            relationships: vec![],
            event_connections: vec![],
            outline_nodes: vec![parent_outline, child_outline],
            notes: vec![folder_note, child_note],
            locations: vec![],
            location_links: vec![],
            vn_scenes: vec![],
            vn_lines: vec![],
        }
    }

    #[test]
    fn import_preserves_note_workspace_id() {
        let conn = test_conn();
        let bundle = sample_bundle();
        let old_ws_id = bundle.workspace.id.clone();
        let new_ws = import_bundle(&conn, bundle).unwrap();

        let notes = crate::services::note::list(&conn, &new_ws.id).unwrap();
        assert_eq!(notes.len(), 2);
        for n in &notes {
            assert_eq!(
                n.workspace_id,
                Some(new_ws.id.clone()),
                "imported notes must belong to the new workspace, not the old one"
            );
            assert_ne!(
                n.workspace_id,
                Some(old_ws_id.clone()),
                "imported notes must NOT keep the old workspace_id"
            );
        }
    }

    #[test]
    fn import_preserves_note_folder_hierarchy() {
        let conn = test_conn();
        let bundle = sample_bundle();
        let new_ws = import_bundle(&conn, bundle).unwrap();

        let notes = crate::services::note::list(&conn, &new_ws.id).unwrap();
        let folder = notes
            .iter()
            .find(|n| n.is_folder)
            .expect("folder note missing");
        let child = notes
            .iter()
            .find(|n| !n.is_folder)
            .expect("child note missing");
        assert!(
            child.folder_id.is_some(),
            "child note should have a folder_id after import"
        );
        assert_eq!(
            child.folder_id,
            Some(folder.id.clone()),
            "child note folder_id should point to the remapped folder note id"
        );
    }

    #[test]
    fn import_preserves_outline_parent_hierarchy() {
        let conn = test_conn();
        let bundle = sample_bundle();
        let new_ws = import_bundle(&conn, bundle).unwrap();

        let nodes = crate::services::outline::list(&conn, &new_ws.id).unwrap();
        assert_eq!(nodes.len(), 2, "both outline nodes should be imported");
        let parent = nodes
            .iter()
            .find(|n| n.title == "第一章")
            .expect("parent node missing");
        let child = nodes
            .iter()
            .find(|n| n.title == "第一节")
            .expect("child node missing");
        assert!(parent.parent_id.is_none(), "parent should have no parent");
        assert_eq!(
            child.parent_id,
            Some(parent.id.clone()),
            "child outline node parent_id should point to the remapped parent id"
        );
    }

    #[test]
    fn import_generates_new_workspace_id() {
        let conn = test_conn();
        let bundle = sample_bundle();
        let old_id = bundle.workspace.id.clone();
        let new_ws = import_bundle(&conn, bundle).unwrap();
        assert_ne!(new_ws.id, old_id, "imported workspace should get a new ID");
        assert!(
            new_ws.name.contains("导入"),
            "imported name should have suffix"
        );
    }

    #[test]
    fn import_preserves_locations_vn_and_links() {
        let conn = test_conn();
        let mut bundle = sample_bundle();
        let t = now();

        let character = crate::models::Character {
            id: "c1".into(),
            workspace_id: "old-ws".into(),
            name: "艾莉丝".into(),
            aliases: vec![],
            avatar: None,
            description: "".into(),
            appearance: "".into(),
            backstory: "".into(),
            goals: "".into(),
            conflicts: "".into(),
            arc: "".into(),
            tags: vec![],
            color: "".into(),
            event_ids: vec![],
            created_at: t,
            updated_at: t,
        };
        bundle.characters.push(character);

        let loc_a = crate::models::Location {
            id: "loc-a".into(),
            workspace_id: "old-ws".into(),
            name: "王城".into(),
            description: "首都".into(),
            pos_x: 120.0,
            pos_y: 80.0,
            color: "#C68A3E".into(),
            icon: "🏰".into(),
            linked_event_id: Some("e1".into()),
            character_ids: vec!["c1".into()],
            created_at: t,
            updated_at: t,
        };
        let loc_b = crate::models::Location {
            id: "loc-b".into(),
            workspace_id: "old-ws".into(),
            name: "酒馆".into(),
            description: "".into(),
            pos_x: 200.0,
            pos_y: 150.0,
            color: "#A86A2C".into(),
            icon: "🍺".into(),
            linked_event_id: None,
            character_ids: vec![],
            created_at: t,
            updated_at: t,
        };
        bundle.locations.push(loc_a);
        bundle.locations.push(loc_b);
        bundle.location_links.push(crate::models::LocationLink {
            source_id: "loc-a".into(),
            target_id: "loc-b".into(),
            label: "主街道".into(),
            source_name: "王城".into(),
            target_name: "酒馆".into(),
        });

        let scene = crate::models::VnScene {
            id: "vs1".into(),
            workspace_id: "old-ws".into(),
            title: "开场".into(),
            background: "酒馆".into(),
            background_asset_path: Some("assets/old-ws/bg.png".into()),
            bgm_path: Some("assets/old-ws/bgm.ogg".into()),
            outline_node_id: None,
            sort_order: 0,
            created_at: t,
            updated_at: t,
        };
        bundle.vn_scenes.push(scene);
        bundle.vn_lines.push(crate::models::VnLine {
            id: "vl1".into(),
            scene_id: "vs1".into(),
            sort_order: 0,
            line_type: "dialog".into(),
            character_id: Some("c1".into()),
            speaker_name: "艾莉丝".into(),
            text: "欢迎来到王城。".into(),
            emotion: "".into(),
            choice_label: "".into(),
            choice_target_scene_id: None,
            sprite_asset_path: Some("assets/old-ws/sprite.png".into()),
            voice_path: None,
            created_at: t,
        });

        let new_ws = import_bundle(&conn, bundle).unwrap();

        let locations = crate::services::location::list(&conn, &new_ws.id).unwrap();
        assert_eq!(locations.len(), 2, "both locations should be imported");
        let linked_event_id = locations.iter().find(|l| l.name == "王城").unwrap().linked_event_id.clone();
        assert!(
            linked_event_id.is_some(),
            "linked event id should be remapped"
        );
        let links = crate::services::location::list_links(&conn, &new_ws.id).unwrap();
        assert_eq!(links.len(), 1, "location link should be imported");
        assert_eq!(links[0].label, "主街道");

        let scenes = crate::services::vn::list_scenes(&conn, &new_ws.id).unwrap();
        assert_eq!(scenes.len(), 1, "VN scene should be imported");
        assert_eq!(scenes[0].background_asset_path, Some("assets/old-ws/bg.png".into()));
        let lines = crate::services::vn::list_lines(&conn, &scenes[0].id).unwrap();
        assert_eq!(lines.len(), 1, "VN line should be imported");
        assert_eq!(lines[0].text, "欢迎来到王城。");
        assert_eq!(lines[0].sprite_asset_path, Some("assets/old-ws/sprite.png".into()));
    }
}
