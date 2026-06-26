use chrono::Utc;
use rusqlite::{params, Connection};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::{
    CreateNovelChapterInput, NovelChapter, ReorderNovelChaptersInput, UpdateNovelChapterInput,
};

pub fn list(conn: &Connection, workspace_id: &str) -> AppResult<Vec<NovelChapter>> {
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, outline_node_id, title, content, word_count, status, sort_order, created_at, updated_at
         FROM novel_chapters WHERE workspace_id = ?1 ORDER BY sort_order, created_at",
    )?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        Ok(NovelChapter {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            outline_node_id: row.get(2)?,
            title: row.get(3)?,
            content: row.get(4)?,
            word_count: row.get(5)?,
            status: row.get(6)?,
            sort_order: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })?;
    rows.collect::<Result<_, _>>().map_err(Into::into)
}

fn get(conn: &Connection, id: &str) -> AppResult<NovelChapter> {
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, outline_node_id, title, content, word_count, status, sort_order, created_at, updated_at
         FROM novel_chapters WHERE id = ?1",
    )?;
    stmt.query_row(params![id], |row| {
        Ok(NovelChapter {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            outline_node_id: row.get(2)?,
            title: row.get(3)?,
            content: row.get(4)?,
            word_count: row.get(5)?,
            status: row.get(6)?,
            sort_order: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })
    .map_err(|e| crate::error::map_not_found(e, format!("小说章节 {} 不存在", id)))
}

fn count_words(text: &str) -> i64 {
    // 中文字符计数 + 英文单词计数
    let chinese_chars = text.chars().filter(|c| c.is_ascii() == false).count() as i64;
    let english_words = text
        .split_whitespace()
        .filter(|w| w.chars().any(|c| c.is_ascii_alphanumeric()))
        .count() as i64;
    chinese_chars + english_words
}

pub fn create(conn: &Connection, input: CreateNovelChapterInput) -> AppResult<NovelChapter> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let now_str = now.to_rfc3339();
    let content = input.content.unwrap_or_default();
    let word_count = count_words(&content);
    let status = input.status.unwrap_or_else(|| "draft".into());
    let sort_order = input.sort_order.unwrap_or(0);
    let tx = conn.unchecked_transaction()?;
    tx.execute(
        "INSERT INTO novel_chapters
         (id, workspace_id, outline_node_id, title, content, word_count, status, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            id,
            input.workspace_id,
            input.outline_node_id,
            input.title,
            content,
            word_count,
            status,
            sort_order,
            now_str,
            now_str,
        ],
    )?;
    tx.commit()?;
    get(conn, &id)
}

pub fn update(conn: &Connection, input: UpdateNovelChapterInput) -> AppResult<NovelChapter> {
    let existing = get(conn, &input.id)?;
    let title = input.title.unwrap_or(existing.title);
    let outline_node_id = input.outline_node_id.unwrap_or(existing.outline_node_id);
    let content = input.content.unwrap_or(existing.content);
    let word_count = count_words(&content);
    let status = input.status.unwrap_or(existing.status);
    let sort_order = input.sort_order.unwrap_or(existing.sort_order);
    let now_str = Utc::now().to_rfc3339();

    let tx = conn.unchecked_transaction()?;
    tx.execute(
        "UPDATE novel_chapters SET title=?1, outline_node_id=?2, content=?3, word_count=?4,
            status=?5, sort_order=?6, updated_at=?7 WHERE id=?8",
        params![
            title,
            outline_node_id,
            content,
            word_count,
            status,
            sort_order,
            now_str,
            input.id,
        ],
    )?;
    tx.commit()?;
    get(conn, &input.id)
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM novel_chapters WHERE id=?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("小说章节 {} 不存在", id)));
    }
    Ok(())
}

pub fn reorder(conn: &Connection, input: ReorderNovelChaptersInput) -> AppResult<Vec<NovelChapter>> {
    let tx = conn.unchecked_transaction()?;
    for (i, id) in input.chapter_ids.iter().enumerate() {
        tx.execute(
            "UPDATE novel_chapters SET sort_order=?1 WHERE id=?2 AND workspace_id=?3",
            params![i as i64, id, input.workspace_id],
        )?;
    }
    tx.commit()?;
    list(conn, &input.workspace_id)
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
    fn novel_chapter_crud() {
        let conn = in_memory_db();
        conn.execute(
            "INSERT INTO workspaces (id, name, description, template, cover_color, settings_json, created_at, updated_at)
             VALUES ('ws', 'WS', '', 'blank', '#C68A3E', '{}', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')",
            [],
        ).unwrap();

        let created = create(
            &conn,
            CreateNovelChapterInput {
                workspace_id: "ws".into(),
                outline_node_id: None,
                title: "第一章".into(),
                content: Some("这是第一章的内容。Hello world!".into()),
                status: None,
                sort_order: None,
            },
        )
        .unwrap();
        assert_eq!(created.title, "第一章");
        assert_eq!(created.word_count, 9); // 6 中文字 + 2 英文单词

        let listed = list(&conn, "ws").unwrap();
        assert_eq!(listed.len(), 1);

        let updated = update(
            &conn,
            UpdateNovelChapterInput {
                id: created.id.clone(),
                title: Some("第一章 修订".into()),
                outline_node_id: None,
                content: None,
                status: None,
                sort_order: None,
            },
        )
        .unwrap();
        assert_eq!(updated.title, "第一章 修订");

        delete(&conn, &created.id).unwrap();
        assert!(list(&conn, "ws").unwrap().is_empty());
    }

    #[test]
    fn novel_chapter_reorder() {
        let conn = in_memory_db();
        conn.execute(
            "INSERT INTO workspaces (id, name, description, template, cover_color, settings_json, created_at, updated_at)
             VALUES ('ws', 'WS', '', 'blank', '#C68A3E', '{}', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z')",
            [],
        ).unwrap();

        let c1 = create(
            &conn,
            CreateNovelChapterInput {
                workspace_id: "ws".into(),
                outline_node_id: None,
                title: "第一章".into(),
                content: None,
                status: None,
                sort_order: Some(0),
            },
        )
        .unwrap();
        let c2 = create(
            &conn,
            CreateNovelChapterInput {
                workspace_id: "ws".into(),
                outline_node_id: None,
                title: "第二章".into(),
                content: None,
                status: None,
                sort_order: Some(1),
            },
        )
        .unwrap();

        let reordered = reorder(
            &conn,
            ReorderNovelChaptersInput {
                workspace_id: "ws".into(),
                chapter_ids: vec![c2.id.clone(), c1.id.clone()],
            },
        )
        .unwrap();
        assert_eq!(reordered[0].id, c2.id);
        assert_eq!(reordered[1].id, c1.id);
    }
}
