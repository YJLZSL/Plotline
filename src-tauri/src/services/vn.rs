use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::{
    CreateVnLineInput, CreateVnSceneInput, UpdateVnLineInput, UpdateVnSceneInput, VnLine, VnScene,
};

pub fn list_scenes(conn: &Connection, workspace_id: &str) -> AppResult<Vec<VnScene>> {
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, title, background, outline_node_id, sort_order,
                created_at, updated_at
         FROM vn_scenes WHERE workspace_id=?1 ORDER BY sort_order ASC, created_at ASC",
    )?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        Ok(VnScene {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            title: row.get(2)?,
            background: row.get(3)?,
            outline_node_id: row.get(4)?,
            sort_order: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    })?;
    rows.collect::<Result<_, _>>().map_err(Into::into)
}

fn get_scene(conn: &Connection, id: &str) -> AppResult<VnScene> {
    conn.query_row(
        "SELECT id, workspace_id, title, background, outline_node_id, sort_order,
                created_at, updated_at
         FROM vn_scenes WHERE id=?1",
        params![id],
        |row| {
            Ok(VnScene {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                title: row.get(2)?,
                background: row.get(3)?,
                outline_node_id: row.get(4)?,
                sort_order: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    )
    .map_err(|_| AppError::NotFound(format!("场景 {} 不存在", id)))
    .map_err(Into::into)
}

pub fn create_scene(conn: &Connection, input: CreateVnSceneInput) -> AppResult<VnScene> {
    let id = Uuid::new_v4().to_string();
    let now_str = Utc::now().to_rfc3339();
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM vn_scenes WHERE workspace_id=?1",
            params![input.workspace_id],
            |r| r.get(0),
        )
        .unwrap_or(0);
    conn.execute(
        "INSERT INTO vn_scenes
         (id, workspace_id, title, background, outline_node_id, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            id,
            input.workspace_id,
            input.title,
            input.background.unwrap_or_default(),
            input.outline_node_id,
            count,
            now_str,
            now_str,
        ],
    )?;
    get_scene(conn, &id)
}

pub fn update_scene(conn: &Connection, input: UpdateVnSceneInput) -> AppResult<VnScene> {
    let existing = get_scene(conn, &input.id)?;
    let now_str = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE vn_scenes SET title=?1, background=?2, outline_node_id=?3, sort_order=?4,
             updated_at=?5 WHERE id=?6",
        params![
            input.title.unwrap_or(existing.title),
            input.background.unwrap_or(existing.background),
            input
                .outline_node_id
                .unwrap_or(existing.outline_node_id),
            input.sort_order.unwrap_or(existing.sort_order),
            now_str,
            input.id,
        ],
    )?;
    get_scene(conn, &input.id)
}

pub fn delete_scene(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM vn_scenes WHERE id=?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("场景 {} 不存在", id)));
    }
    Ok(())
}

pub fn list_lines(conn: &Connection, scene_id: &str) -> AppResult<Vec<VnLine>> {
    let mut stmt = conn.prepare(
        "SELECT id, scene_id, sort_order, line_type, character_id, speaker_name, text,
                emotion, choice_label, choice_target_scene_id, created_at
         FROM vn_lines WHERE scene_id=?1 ORDER BY sort_order ASC, created_at ASC",
    )?;
    let rows = stmt.query_map(params![scene_id], |row| {
        Ok(VnLine {
            id: row.get(0)?,
            scene_id: row.get(1)?,
            sort_order: row.get(2)?,
            line_type: row.get(3)?,
            character_id: row.get(4)?,
            speaker_name: row.get(5)?,
            text: row.get(6)?,
            emotion: row.get(7)?,
            choice_label: row.get(8)?,
            choice_target_scene_id: row.get(9)?,
            created_at: row.get(10)?,
        })
    })?;
    rows.collect::<Result<_, _>>().map_err(Into::into)
}

fn get_line(conn: &Connection, id: &str) -> AppResult<VnLine> {
    conn.query_row(
        "SELECT id, scene_id, sort_order, line_type, character_id, speaker_name, text,
                emotion, choice_label, choice_target_scene_id, created_at
         FROM vn_lines WHERE id=?1",
        params![id],
        |row| {
            Ok(VnLine {
                id: row.get(0)?,
                scene_id: row.get(1)?,
                sort_order: row.get(2)?,
                line_type: row.get(3)?,
                character_id: row.get(4)?,
                speaker_name: row.get(5)?,
                text: row.get(6)?,
                emotion: row.get(7)?,
                choice_label: row.get(8)?,
                choice_target_scene_id: row.get(9)?,
                created_at: row.get(10)?,
            })
        },
    )
    .map_err(|_| AppError::NotFound(format!("台词 {} 不存在", id)))
    .map_err(Into::into)
}

pub fn create_line(conn: &Connection, input: CreateVnLineInput) -> AppResult<VnLine> {
    let id = Uuid::new_v4().to_string();
    let now_str = Utc::now().to_rfc3339();
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM vn_lines WHERE scene_id=?1",
            params![input.scene_id],
            |r| r.get(0),
        )
        .unwrap_or(0);
    conn.execute(
        "INSERT INTO vn_lines
         (id, scene_id, sort_order, line_type, character_id, speaker_name, text,
          emotion, choice_label, choice_target_scene_id, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            id,
            input.scene_id,
            count,
            input.line_type.unwrap_or_else(|| "dialog".into()),
            input.character_id,
            input.speaker_name.unwrap_or_default(),
            input.text.unwrap_or_default(),
            input.emotion.unwrap_or_default(),
            input.choice_label.unwrap_or_default(),
            input.choice_target_scene_id,
            now_str,
        ],
    )?;
    get_line(conn, &id)
}

pub fn update_line(conn: &Connection, input: UpdateVnLineInput) -> AppResult<VnLine> {
    let existing = get_line(conn, &input.id)?;
    conn.execute(
        "UPDATE vn_lines SET line_type=?1, character_id=?2, speaker_name=?3, text=?4,
             emotion=?5, choice_label=?6, choice_target_scene_id=?7, sort_order=?8
         WHERE id=?9",
        params![
            input.line_type.unwrap_or(existing.line_type),
            input
                .character_id
                .unwrap_or(existing.character_id),
            input.speaker_name.unwrap_or(existing.speaker_name),
            input.text.unwrap_or(existing.text),
            input.emotion.unwrap_or(existing.emotion),
            input.choice_label.unwrap_or(existing.choice_label),
            input
                .choice_target_scene_id
                .unwrap_or(existing.choice_target_scene_id),
            input.sort_order.unwrap_or(existing.sort_order),
            input.id,
        ],
    )?;
    get_line(conn, &input.id)
}

pub fn delete_line(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM vn_lines WHERE id=?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("台词 {} 不存在", id)));
    }
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
    fn should_create_scene_and_lines() {
        let conn = test_conn();
        let scene = create_scene(
            &conn,
            CreateVnSceneInput {
                workspace_id: "w1".into(),
                title: "开场".into(),
                background: Some("酒馆".into()),
                outline_node_id: None,
            },
        )
        .unwrap();
        assert_eq!(scene.title, "开场");
        assert_eq!(scene.background, "酒馆");

        let line = create_line(
            &conn,
            CreateVnLineInput {
                scene_id: scene.id.clone(),
                line_type: Some("dialog".into()),
                character_id: None,
                speaker_name: Some("旅人".into()),
                text: Some("你好。".into()),
                emotion: Some("neutral".into()),
                choice_label: None,
                choice_target_scene_id: None,
            },
        )
        .unwrap();
        assert_eq!(line.text, "你好。");
        assert_eq!(line.speaker_name, "旅人");

        let lines = list_lines(&conn, &scene.id).unwrap();
        assert_eq!(lines.len(), 1);
    }

    #[test]
    fn should_list_scenes_ordered_by_sort_order() {
        let conn = test_conn();
        let a = create_scene(
            &conn,
            CreateVnSceneInput {
                workspace_id: "w1".into(),
                title: "A".into(),
                background: None,
                outline_node_id: None,
            },
        )
        .unwrap();
        let b = create_scene(
            &conn,
            CreateVnSceneInput {
                workspace_id: "w1".into(),
                title: "B".into(),
                background: None,
                outline_node_id: None,
            },
        )
        .unwrap();
        update_scene(
            &conn,
            UpdateVnSceneInput {
                id: b.id.clone(),
                title: None,
                background: None,
                outline_node_id: None,
                sort_order: Some(0),
            },
        )
        .unwrap();
        update_scene(
            &conn,
            UpdateVnSceneInput {
                id: a.id.clone(),
                title: None,
                background: None,
                outline_node_id: None,
                sort_order: Some(1),
            },
        )
        .unwrap();
        let scenes = list_scenes(&conn, "w1").unwrap();
        assert_eq!(scenes[0].title, "B");
        assert_eq!(scenes[1].title, "A");
    }

    #[test]
    fn should_delete_scene_cascades_lines() {
        let conn = test_conn();
        let scene = create_scene(
            &conn,
            CreateVnSceneInput {
                workspace_id: "w1".into(),
                title: "临时".into(),
                background: None,
                outline_node_id: None,
            },
        )
        .unwrap();
        create_line(
            &conn,
            CreateVnLineInput {
                scene_id: scene.id.clone(),
                line_type: None,
                character_id: None,
                speaker_name: None,
                text: None,
                emotion: None,
                choice_label: None,
                choice_target_scene_id: None,
            },
        )
        .unwrap();
        delete_scene(&conn, &scene.id).unwrap();
        let lines = list_lines(&conn, &scene.id).unwrap();
        assert!(lines.is_empty());
    }

    #[test]
    fn should_update_line_text_and_type() {
        let conn = test_conn();
        let scene = create_scene(
            &conn,
            CreateVnSceneInput {
                workspace_id: "w1".into(),
                title: "S".into(),
                background: None,
                outline_node_id: None,
            },
        )
        .unwrap();
        let line = create_line(
            &conn,
            CreateVnLineInput {
                scene_id: scene.id,
                line_type: Some("narration".into()),
                character_id: None,
                speaker_name: None,
                text: Some("旁白".into()),
                emotion: None,
                choice_label: None,
                choice_target_scene_id: None,
            },
        )
        .unwrap();
        let updated = update_line(
            &conn,
            UpdateVnLineInput {
                id: line.id,
                line_type: Some("choice".into()),
                character_id: None,
                speaker_name: None,
                text: Some("选择A".into()),
                emotion: None,
                choice_label: Some("去森林".into()),
                choice_target_scene_id: None,
                sort_order: None,
            },
        )
        .unwrap();
        assert_eq!(updated.line_type, "choice");
        assert_eq!(updated.text, "选择A");
        assert_eq!(updated.choice_label, "去森林");
    }
}
