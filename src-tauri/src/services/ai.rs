use std::collections::HashSet;

use chrono::Utc;
use futures_util::StreamExt;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use uuid::Uuid;

use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};

use crate::error::{AppError, AppResult};
use crate::models::{
    AiActionType, AiChatContext, AiChunk, AiConversationHistoryEntry, AiInsertInput,
    AiInsertResult, AiKvEntry, AiMessage, AiModelInfo, AiRagChunk, AiRole, AiScoredEntity,
    AiSearchResult, AiSession, AiShortcutInput, AiShortcutResult, AiStreamEvent,
    CreateAiMessageInput, CreateAiSessionInput,
};

const DEFAULT_SYSTEM_PROMPT: &str =
    "你是 Plotline 的 AI 创作助手，熟悉叙事写作、角色塑造、大纲结构和视觉小说。请用中文简洁回答，并使用 Markdown 格式（**粗体**、*斜体*、`代码`、列表、标题、引用）以便界面正确渲染。";
pub const MAX_HISTORY_MESSAGES: usize = 10;
pub const MAX_RAG_CHUNKS: usize = 5;
const MAX_CHUNK_TOKENS: usize = 2000;
const MAX_CONTEXT_DESC_LEN: usize = 800;

pub fn create_session(conn: &Connection, input: CreateAiSessionInput) -> AppResult<AiSession> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let title = input.title.unwrap_or_else(|| "新会话".into());
    conn.execute(
        "INSERT INTO ai_sessions (id, workspace_id, title, summary, created_at, updated_at)
         VALUES (?1, ?2, ?3, '', ?4, ?5)",
        params![id, input.workspace_id, title, now, now],
    )?;
    get_session(conn, &id)
}

pub fn list_sessions(conn: &Connection, workspace_id: &str) -> AppResult<Vec<AiSession>> {
    let mut stmt = conn.prepare(
        "SELECT id, workspace_id, title, summary, created_at, updated_at
         FROM ai_sessions WHERE workspace_id=?1 ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        Ok(AiSession {
            id: row.get(0)?,
            workspace_id: row.get(1)?,
            title: row.get(2)?,
            summary: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
        })
    })?;
    rows.collect::<Result<_, _>>().map_err(Into::into)
}

pub fn get_session(conn: &Connection, id: &str) -> AppResult<AiSession> {
    conn.query_row(
        "SELECT id, workspace_id, title, summary, created_at, updated_at
         FROM ai_sessions WHERE id=?1",
        params![id],
        |row| {
            Ok(AiSession {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                title: row.get(2)?,
                summary: row.get(3)?,
                created_at: row.get(4)?,
                updated_at: row.get(5)?,
            })
        },
    )
    .map_err(|e| crate::error::map_not_found(e, format!("AI 会话 {} 不存在", id)))
}

pub fn delete_session(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn.execute("DELETE FROM ai_sessions WHERE id=?1", params![id])?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("AI 会话 {} 不存在", id)));
    }
    Ok(())
}

pub fn add_message(
    conn: &Connection,
    session_id: &str,
    role: AiRole,
    content: &str,
) -> AppResult<AiMessage> {
    get_session(conn, session_id)?;
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    let tx = conn.unchecked_transaction()?;
    tx.execute(
        "INSERT INTO ai_messages (id, session_id, role, content, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, session_id, role.to_string(), content, now],
    )?;
    tx.execute(
        "UPDATE ai_sessions SET updated_at=?1 WHERE id=?2",
        params![now, session_id],
    )?;
    tx.commit()?;
    get_message(conn, &id)
}

pub fn add_message_from_input(
    conn: &Connection,
    input: CreateAiMessageInput,
) -> AppResult<AiMessage> {
    add_message(conn, &input.session_id, input.role, &input.content)
}

fn get_message(conn: &Connection, id: &str) -> AppResult<AiMessage> {
    conn.query_row(
        "SELECT id, session_id, role, content, created_at FROM ai_messages WHERE id=?1",
        params![id],
        |row| {
            Ok(AiMessage {
                id: row.get(0)?,
                session_id: row.get(1)?,
                role: parse_role(&row.get::<_, String>(2)?),
                content: row.get(3)?,
                created_at: row.get(4)?,
            })
        },
    )
    .map_err(|e| crate::error::map_not_found(e, format!("AI 消息 {} 不存在", id)))
}

fn parse_role(s: &str) -> AiRole {
    match s {
        "user" => AiRole::User,
        "assistant" => AiRole::Assistant,
        _ => AiRole::System,
    }
}

pub fn list_messages(
    conn: &Connection,
    session_id: &str,
    limit: Option<usize>,
) -> AppResult<Vec<AiMessage>> {
    let limit = limit.unwrap_or(100);
    let mut stmt = conn.prepare(
        "SELECT id, session_id, role, content, created_at
         FROM ai_messages WHERE session_id=?1 ORDER BY created_at ASC LIMIT ?2",
    )?;
    let rows = stmt.query_map(params![session_id, limit as i64], |row| {
        Ok(AiMessage {
            id: row.get(0)?,
            session_id: row.get(1)?,
            role: parse_role(&row.get::<_, String>(2)?),
            content: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;
    rows.collect::<Result<_, _>>().map_err(Into::into)
}

pub fn kv_get(conn: &Connection, workspace_id: &str, key: &str) -> AppResult<Option<AiKvEntry>> {
    let mut stmt = conn.prepare(
        "SELECT workspace_id, key, value, updated_at FROM ai_kv WHERE workspace_id=?1 AND key=?2",
    )?;
    let mut rows = stmt.query_map(params![workspace_id, key], |row| {
        Ok(AiKvEntry {
            workspace_id: row.get(0)?,
            key: row.get(1)?,
            value: row.get(2)?,
            updated_at: row.get(3)?,
        })
    })?;
    rows.next().transpose().map_err(Into::into)
}

pub fn kv_set(conn: &Connection, entry: AiKvEntry) -> AppResult<AiKvEntry> {
    let now = Utc::now();
    conn.execute(
        "INSERT INTO ai_kv (workspace_id, key, value, updated_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(workspace_id, key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
        params![entry.workspace_id, entry.key, entry.value, now],
    )?;
    kv_get(conn, &entry.workspace_id, &entry.key)?.ok_or_else(|| {
        AppError::Internal("kv_set upsert succeeded but kv_get returned None".into())
    })
}

pub fn get_cached_response(conn: &Connection, key: &str) -> AppResult<Option<String>> {
    let now = Utc::now();
    conn.execute("DELETE FROM ai_cache WHERE expires_at < ?1", params![now])?;
    let mut stmt = conn.prepare("SELECT value FROM ai_cache WHERE key = ?1")?;
    let mut rows = stmt.query_map(params![key], |row| row.get::<_, String>(0))?;
    rows.next().transpose().map_err(Into::into)
}

pub fn set_cached_response(
    conn: &Connection,
    key: &str,
    value: &str,
    ttl_seconds: u64,
) -> AppResult<()> {
    let now = Utc::now();
    let expires_at = now + chrono::Duration::seconds(ttl_seconds as i64);
    conn.execute(
        "INSERT INTO ai_cache (key, value, created_at, expires_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, created_at=excluded.created_at, expires_at=excluded.expires_at",
        params![key, value, now, expires_at],
    )?;
    Ok(())
}

pub fn invalidate_ai_cache_for_workspace(
    conn: &Connection,
    workspace_id: &str,
) -> AppResult<()> {
    conn.execute(
        "DELETE FROM ai_cache WHERE key LIKE ?1",
        params![format!("ai:cache:{}:%", workspace_id)],
    )?;
    Ok(())
}

pub fn append_conversation_history(
    conn: &Connection,
    session_id: &str,
    role: AiRole,
    content: &str,
) -> AppResult<AiConversationHistoryEntry> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now();
    conn.execute(
        "INSERT INTO ai_conversation_history (id, session_id, role, content, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, session_id, role.to_string(), content, now],
    )?;
    get_conversation_history_entry(conn, &id)
}

fn get_conversation_history_entry(conn: &Connection, id: &str) -> AppResult<AiConversationHistoryEntry> {
    conn.query_row(
        "SELECT id, session_id, role, content, created_at FROM ai_conversation_history WHERE id = ?1",
        params![id],
        |row| {
            Ok(AiConversationHistoryEntry {
                id: row.get(0)?,
                session_id: row.get(1)?,
                role: parse_role(&row.get::<_, String>(2)?),
                content: row.get(3)?,
                created_at: row.get(4)?,
            })
        },
    )
    .map_err(|e| crate::error::map_not_found(e, format!("AI 对话历史 {} 不存在", id)))
}

pub fn get_conversation_history(
    conn: &Connection,
    session_id: &str,
    limit: Option<usize>,
) -> AppResult<Vec<AiConversationHistoryEntry>> {
    let limit = limit.unwrap_or(100);
    let mut stmt = conn.prepare(
        "SELECT id, session_id, role, content, created_at
         FROM ai_conversation_history WHERE session_id = ?1
         ORDER BY created_at ASC LIMIT ?2",
    )?;
    let rows = stmt.query_map(params![session_id, limit as i64], |row| {
        Ok(AiConversationHistoryEntry {
            id: row.get(0)?,
            session_id: row.get(1)?,
            role: parse_role(&row.get::<_, String>(2)?),
            content: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;
    rows.collect::<Result<_, _>>().map_err(Into::into)
}

fn hash_cache_key_material(material: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    material.hash(&mut hasher);
    hasher.finish()
}

pub fn make_cache_key(
    workspace_id: &str,
    action: AiActionType,
    context_material: &str,
) -> String {
    format!(
        "ai:cache:{}:{}:{}",
        workspace_id,
        action,
        hash_cache_key_material(context_material)
    )
}

pub fn retrieve_relevant_entities(
    conn: &Connection,
    workspace_id: &str,
    query: &str,
    limit: Option<usize>,
) -> AppResult<Vec<AiScoredEntity>> {
    let terms = extract_terms(query);
    if terms.is_empty() {
        return Ok(Vec::new());
    }
    let limit = limit.unwrap_or(5);

    let mut scores: HashMap<String, (AiScoredEntity, i64)> = HashMap::new();

    retrieve_character_entities(conn, workspace_id, &terms, &mut scores)?;
    retrieve_location_entities(conn, workspace_id, &terms, &mut scores)?;
    retrieve_event_entities(conn, workspace_id, &terms, &mut scores)?;
    retrieve_outline_entities(conn, workspace_id, &terms, &mut scores)?;

    let mut results: Vec<AiScoredEntity> = scores.into_values().map(|(entity, _)| entity).collect();
    results.sort_by(|a, b| b.score.cmp(&a.score));
    results.truncate(limit);
    Ok(results)
}

fn retrieve_character_entities(
    conn: &Connection,
    workspace_id: &str,
    terms: &[String],
    scores: &mut HashMap<String, (AiScoredEntity, i64)>,
) -> AppResult<()> {
    let cases: Vec<String> = terms
        .iter()
        .map(|t| format!("CASE WHEN LOWER(name || ' ' || COALESCE(description,'') || ' ' || COALESCE(appearance,'') || ' ' || COALESCE(backstory,'') || ' ' || COALESCE(goals,'') || ' ' || COALESCE(conflicts,'') || ' ' || COALESCE(arc,'') || ' ' || COALESCE(aliases,'') || ' ' || COALESCE(tags,'')) LIKE LOWER('{}') ESCAPE '\\' THEN 1 ELSE 0 END", escape_like(t)))
        .collect();
    let where_clauses: Vec<String> = terms
        .iter()
        .map(|t| format!("LOWER(name || ' ' || COALESCE(description,'') || ' ' || COALESCE(appearance,'') || ' ' || COALESCE(backstory,'') || ' ' || COALESCE(goals,'') || ' ' || COALESCE(conflicts,'') || ' ' || COALESCE(arc,'') || ' ' || COALESCE(aliases,'') || ' ' || COALESCE(tags,'')) LIKE LOWER('{}') ESCAPE '\\'", escape_like(t)))
        .collect();
    let sql = format!(
        "SELECT id, name, description, {} AS score
         FROM characters
         WHERE workspace_id = ?1 AND ({})",
        cases.join(" + "),
        where_clauses.join(" OR ")
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        let id: String = row.get(0)?;
        let name: String = row.get(1)?;
        let summary: String = row.get(2)?;
        let score: i64 = row.get(3)?;
        Ok((id, name, summary, score))
    })?;
    for row in rows {
        let (id, name, summary, score) = row?;
        let entity = AiScoredEntity {
            id: id.clone(),
            entity_type: "character".into(),
            name,
            summary,
            score,
        };
        scores.insert(id, (entity, score));
    }
    Ok(())
}

fn retrieve_location_entities(
    conn: &Connection,
    workspace_id: &str,
    terms: &[String],
    scores: &mut HashMap<String, (AiScoredEntity, i64)>,
) -> AppResult<()> {
    let cases: Vec<String> = terms
        .iter()
        .map(|t| format!("CASE WHEN LOWER(name || ' ' || COALESCE(description,'')) LIKE LOWER('{}') ESCAPE '\\\\' THEN 1 ELSE 0 END", escape_like(t)))
        .collect();
    let where_clauses: Vec<String> = terms
        .iter()
        .map(|t| format!("LOWER(name || ' ' || COALESCE(description,'')) LIKE LOWER('{}') ESCAPE '\\\\'", escape_like(t)))
        .collect();
    let sql = format!(
        "SELECT id, name, description, {} AS score
         FROM locations
         WHERE workspace_id = ?1 AND ({})",
        cases.join(" + "),
        where_clauses.join(" OR ")
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        let id: String = row.get(0)?;
        let name: String = row.get(1)?;
        let summary: String = row.get(2)?;
        let score: i64 = row.get(3)?;
        Ok((id, name, summary, score))
    })?;
    for row in rows {
        let (id, name, summary, score) = row?;
        let entity = AiScoredEntity {
            id: id.clone(),
            entity_type: "location".into(),
            name,
            summary,
            score,
        };
        scores.insert(id, (entity, score));
    }
    Ok(())
}

fn retrieve_event_entities(
    conn: &Connection,
    workspace_id: &str,
    terms: &[String],
    scores: &mut HashMap<String, (AiScoredEntity, i64)>,
) -> AppResult<()> {
    let cases: Vec<String> = terms
        .iter()
        .map(|t| format!("CASE WHEN LOWER(title || ' ' || COALESCE(description,'')) LIKE LOWER('{}') ESCAPE '\\\\' THEN 1 ELSE 0 END", escape_like(t)))
        .collect();
    let where_clauses: Vec<String> = terms
        .iter()
        .map(|t| format!("LOWER(title || ' ' || COALESCE(description,'')) LIKE LOWER('{}') ESCAPE '\\\\'", escape_like(t)))
        .collect();
    let sql = format!(
        "SELECT id, title, description, {} AS score
         FROM events
         WHERE workspace_id = ?1 AND ({})",
        cases.join(" + "),
        where_clauses.join(" OR ")
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        let id: String = row.get(0)?;
        let name: String = row.get(1)?;
        let summary: String = row.get(2)?;
        let score: i64 = row.get(3)?;
        Ok((id, name, summary, score))
    })?;
    for row in rows {
        let (id, name, summary, score) = row?;
        let entity = AiScoredEntity {
            id: id.clone(),
            entity_type: "event".into(),
            name,
            summary,
            score,
        };
        scores.insert(id, (entity, score));
    }
    Ok(())
}

fn retrieve_outline_entities(
    conn: &Connection,
    workspace_id: &str,
    terms: &[String],
    scores: &mut HashMap<String, (AiScoredEntity, i64)>,
) -> AppResult<()> {
    let cases: Vec<String> = terms
        .iter()
        .map(|t| format!("CASE WHEN LOWER(title || ' ' || COALESCE(content,'')) LIKE LOWER('{}') ESCAPE '\\\\' THEN 1 ELSE 0 END", escape_like(t)))
        .collect();
    let where_clauses: Vec<String> = terms
        .iter()
        .map(|t| format!("LOWER(title || ' ' || COALESCE(content,'')) LIKE LOWER('{}') ESCAPE '\\\\'", escape_like(t)))
        .collect();
    let sql = format!(
        "SELECT id, title, content, {} AS score
         FROM outline_nodes
         WHERE workspace_id = ?1 AND ({})",
        cases.join(" + "),
        where_clauses.join(" OR ")
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![workspace_id], |row| {
        let id: String = row.get(0)?;
        let name: String = row.get(1)?;
        let summary: String = row.get(2)?;
        let score: i64 = row.get(3)?;
        Ok((id, name, summary, score))
    })?;
    for row in rows {
        let (id, name, summary, score) = row?;
        let entity = AiScoredEntity {
            id: id.clone(),
            entity_type: "outline".into(),
            name,
            summary,
            score,
        };
        scores.insert(id, (entity, score));
    }
    Ok(())
}

fn escape_like(term: &str) -> String {
    term.replace('\\', "\\\\").replace('%', "\\%").replace('_', "\\_")
}

pub fn index_workspace(conn: &Connection, workspace_id: &str) -> AppResult<()> {
    let tx = conn.unchecked_transaction()?;

    tx.execute(
        "DELETE FROM ai_chunks WHERE workspace_id=?1",
        params![workspace_id],
    )?;

    let now = Utc::now();

    for character in crate::services::character::list(conn, workspace_id)? {
        let content = format!(
            "角色：{}\n别名：{}\n描述：{}\n外貌：{}\n背景：{}\n目标：{}\n冲突：{}\n弧线：{}\n标签：{}",
            character.name,
            character.aliases.join(", "),
            character.description,
            character.appearance,
            character.backstory,
            character.goals,
            character.conflicts,
            character.arc,
            character.tags.join(", "),
        );
        insert_chunk(
            &tx,
            workspace_id,
            "character",
            &character.id,
            &content,
            character.updated_at,
        )?;
    }

    for event in crate::services::event::list(conn, workspace_id)? {
        let content = format!(
            "事件：{}\n描述：{}\n日期：{}（{}）\n状态：{}\n关联角色：{}",
            event.title,
            event.description,
            event.date_value,
            event.date_type,
            event.status,
            event.character_ids.join(", "),
        );
        insert_chunk(
            &tx,
            workspace_id,
            "event",
            &event.id,
            &content,
            event.updated_at,
        )?;
    }

    for node in crate::services::outline::list(conn, workspace_id)? {
        let content = format!(
            "大纲节点：{}\n类型：{}\n内容：{}\n状态：{}",
            node.title, node.r#type, node.content, node.status
        );
        insert_chunk(
            &tx,
            workspace_id,
            "outline",
            &node.id,
            &content,
            node.updated_at,
        )?;
    }

    for note in crate::services::note::list(conn, workspace_id)? {
        let content = format!(
            "笔记：{}\n内容：{}\n标签：{}",
            note.title,
            note.content,
            note.tags.join(", ")
        );
        insert_chunk(
            &tx,
            workspace_id,
            "note",
            &note.id,
            &content,
            note.updated_at,
        )?;
    }

    for scene in crate::services::vn::list_scenes(conn, workspace_id)? {
        let content = format!("VN 场景：{}\n背景：{}", scene.title, scene.background);
        insert_chunk(
            &tx,
            workspace_id,
            "vn_scene",
            &scene.id,
            &content,
            scene.updated_at,
        )?;
    }

    let mut stmt = tx.prepare(
        "SELECT id, scene_id, sort_order, line_type, character_id, speaker_name, text,
                emotion, choice_label, choice_target_scene_id, created_at
         FROM vn_lines WHERE scene_id IN (SELECT id FROM vn_scenes WHERE workspace_id=?1)
         ORDER BY scene_id, sort_order, created_at",
    )?;
    let lines = stmt.query_map(params![workspace_id], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(5)?,
            row.get::<_, String>(6)?,
            row.get::<_, String>(7)?,
            row.get::<_, String>(3)?,
        ))
    })?;
    let lines: Vec<_> = lines.collect::<Result<_, _>>()?;
    drop(stmt);
    for (id, _scene_id, speaker, text, emotion, line_type) in lines {
        let content = format!(
            "VN 台词（{}）\n说话人：{}\n情绪：{}\n内容：{}",
            line_type, speaker, emotion, text
        );
        insert_chunk(&tx, workspace_id, "vn_line", &id, &content, now)?;
    }

    let summary = build_workspace_summary(conn, workspace_id)?;
    tx.execute(
        "INSERT INTO ai_kv (workspace_id, key, value, updated_at)
         VALUES (?1, 'workspace_summary', ?2, ?3)
         ON CONFLICT(workspace_id, key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
        params![workspace_id, summary, now],
    )?;

    tx.commit()?;
    Ok(())
}

fn build_workspace_summary(conn: &Connection, workspace_id: &str) -> AppResult<String> {
    let characters = crate::services::character::list(conn, workspace_id)?;
    let events = crate::services::event::list(conn, workspace_id)?;
    let outline = crate::services::outline::list(conn, workspace_id)?;
    let notes = crate::services::note::list(conn, workspace_id)?;
    let scenes = crate::services::vn::list_scenes(conn, workspace_id)?;
    Ok(format!(
        "角色 {} 个，事件 {} 个，大纲节点 {} 个，笔记 {} 条，VN 场景 {} 个。",
        characters.len(),
        events.len(),
        outline.len(),
        notes.len(),
        scenes.len()
    ))
}

fn insert_chunk(
    conn: &Connection,
    workspace_id: &str,
    source_type: &str,
    source_id: &str,
    content: &str,
    updated_at: chrono::DateTime<Utc>,
) -> AppResult<()> {
    let id = Uuid::new_v4().to_string();
    let truncated = truncate_text(content, MAX_CHUNK_TOKENS);
    conn.execute(
        "INSERT INTO ai_chunks (id, workspace_id, source_type, source_id, content, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            id,
            workspace_id,
            source_type,
            source_id,
            truncated,
            updated_at
        ],
    )?;

    let terms = extract_terms(&truncated);
    for term in terms {
        conn.execute(
            "INSERT OR IGNORE INTO ai_chunk_terms (chunk_id, term) VALUES (?1, ?2)",
            params![id, term],
        )?;
    }
    Ok(())
}

fn truncate_text(text: &str, max_tokens: usize) -> String {
    let chars_per_token = 2;
    let max_chars = max_tokens * chars_per_token;
    if text.chars().count() <= max_chars {
        text.to_string()
    } else {
        text.chars().take(max_chars).collect::<String>() + "…"
    }
}

fn truncate_string(text: &str, max_len: usize) -> String {
    if text.chars().count() <= max_len {
        text.to_string()
    } else {
        text.chars().take(max_len).collect::<String>() + "…"
    }
}

fn is_han(c: char) -> bool {
    ('\u{4e00}'..='\u{9fff}').contains(&c)
}

fn extract_terms(text: &str) -> Vec<String> {
    let mut terms = Vec::new();
    let lowered = text.to_lowercase();
    let chars: Vec<char> = lowered.chars().collect();

    // Extract continuous Han characters (length >= 2) and their 2-grams
    let mut i = 0;
    while i < chars.len() {
        if is_han(chars[i]) {
            let start = i;
            while i < chars.len() && is_han(chars[i]) {
                i += 1;
            }
            let han: String = chars[start..i].iter().collect();
            if han.chars().count() >= 2 {
                terms.push(han.clone());
                let han_chars: Vec<char> = han.chars().collect();
                for w in han_chars.windows(2) {
                    terms.push(format!("{}{}", w[0], w[1]));
                }
            }
        } else {
            i += 1;
        }
    }

    // English / numbers split by non-alphanumeric
    let parts: Vec<&str> = lowered
        .split(|c: char| !c.is_ascii_alphanumeric())
        .filter(|s| !s.is_empty())
        .collect();

    for part in parts {
        terms.push(part.to_string());
        if part.len() >= 2 {
            let chars: Vec<char> = part.chars().collect();
            for w in chars.windows(2) {
                terms.push(format!("{}{}", w[0], w[1]));
            }
        }
    }

    let unique: HashSet<String> = terms.into_iter().collect();
    unique.into_iter().collect()
}

fn is_punctuation(c: char) -> bool {
    c.is_ascii_punctuation()
        || matches!(
            c,
            '，' | '。'
                | '、'
                | '；'
                | '：'
                | '？'
                | '！'
                | '"'
                | '\''
                | '（'
                | '）'
                | '《'
                | '》'
                | '【'
                | '】'
                | '…'
                | '—'
                | '–'
                | '～'
        )
}

pub fn rag_chunks_to_search_results(chunks: &[AiRagChunk]) -> Vec<AiSearchResult> {
    chunks
        .iter()
        .map(|c| AiSearchResult {
            chunk: AiChunk {
                id: format!("{}:{}", c.source_type, c.source_id),
                workspace_id: String::new(),
                source_type: c.source_type.clone(),
                source_id: c.source_id.clone(),
                content: c.content.clone(),
                updated_at: Utc::now(),
            },
            score: c.score,
        })
        .collect()
}

pub fn search_chunks(
    conn: &Connection,
    workspace_id: &str,
    query: &str,
    limit: Option<usize>,
) -> AppResult<Vec<AiSearchResult>> {
    let terms = extract_terms(query);
    if terms.is_empty() {
        return Ok(Vec::new());
    }
    let limit = limit.unwrap_or(5) as i64;

    let placeholders: Vec<&str> = terms.iter().map(|_| "?").collect();
    let sql = format!(
        "SELECT c.id, c.workspace_id, c.source_type, c.source_id, c.content, c.updated_at,
                COUNT(t.term) as score
         FROM ai_chunks c
         JOIN ai_chunk_terms t ON t.chunk_id = c.id
         WHERE c.workspace_id=? AND t.term IN ({})
         GROUP BY c.id
         ORDER BY score DESC, c.updated_at DESC
         LIMIT ?",
        placeholders.join(",")
    );

    let mut stmt = conn.prepare(&sql)?;
    let mut values: Vec<rusqlite::types::Value> = vec![workspace_id.to_string().into()];
    values.extend(terms.iter().map(|t| t.clone().into()));
    values.push(limit.into());
    let rows = stmt.query_map(rusqlite::params_from_iter(values), |row| {
        Ok(AiSearchResult {
            chunk: AiChunk {
                id: row.get(0)?,
                workspace_id: row.get(1)?,
                source_type: row.get(2)?,
                source_id: row.get(3)?,
                content: row.get(4)?,
                updated_at: row.get(5)?,
            },
            score: row.get(6)?,
        })
    })?;
    rows.collect::<Result<_, _>>().map_err(Into::into)
}

#[derive(Debug, Serialize)]
struct OpenAiMessage<'a> {
    role: &'a str,
    content: String,
}

#[derive(Debug, Serialize)]
struct OpenAiChatRequest<'a> {
    model: &'a str,
    messages: Vec<OpenAiMessage<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stream: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct OpenAiChoice {
    message: OpenAiResponseMessage,
}

#[derive(Debug, Deserialize)]
struct OpenAiResponseMessage {
    content: String,
}

#[derive(Debug, Deserialize)]
struct OpenAiChatResponse {
    choices: Vec<OpenAiChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAiStreamResponse {
    choices: Vec<OpenAiStreamChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAiStreamChoice {
    delta: OpenAiStreamDelta,
}

#[derive(Debug, Deserialize, Default)]
struct OpenAiStreamDelta {
    #[serde(default)]
    content: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAiModel {
    id: String,
    owned_by: Option<String>,
}

#[derive(Debug, Deserialize)]
struct OpenAiModelList {
    data: Vec<OpenAiModel>,
}

fn build_context_block(context: &AiChatContext) -> String {
    let mut parts: Vec<String> = Vec::new();

    if let Some(summary) = context.workspace_summary.as_ref().filter(|s| !s.is_empty()) {
        parts.push(format!("【工作区摘要】\n{}", summary));
    }

    if let Some(timeline) = context.timeline.as_ref().filter(|t| !t.is_empty()) {
        let lines: Vec<String> = timeline
            .iter()
            .map(|item| {
                let desc = item
                    .description
                    .as_deref()
                    .map(|d| format!(" — {}", truncate_string(d, MAX_CONTEXT_DESC_LEN)))
                    .unwrap_or_default();
                format!(
                    "- [{}] {}（{}）{}",
                    item.track_name,
                    item.title,
                    item.date_value.as_deref().unwrap_or("未设日期"),
                    desc
                )
            })
            .collect();
        parts.push(format!("【时间轴】共 {} 条\n{}", timeline.len(), lines.join("\n")));
    }

    if let Some(characters) = context.characters.as_ref().filter(|c| !c.is_empty()) {
        let lines: Vec<String> = characters
            .iter()
            .map(|item| {
                let role = item
                    .role
                    .as_deref()
                    .map(|r| format!(" [{}]", r))
                    .unwrap_or_default();
                let desc = item
                    .description
                    .as_deref()
                    .map(|d| format!(" — {}", truncate_string(d, MAX_CONTEXT_DESC_LEN)))
                    .unwrap_or_default();
                format!("- {}{}{}", item.name, role, desc)
            })
            .collect();
        parts.push(format!("【角色】共 {} 个\n{}", characters.len(), lines.join("\n")));
    }

    if let Some(locations) = context.locations.as_ref().filter(|l| !l.is_empty()) {
        let lines: Vec<String> = locations
            .iter()
            .map(|item| {
                let desc = item
                    .description
                    .as_deref()
                    .map(|d| format!(" — {}", truncate_string(d, MAX_CONTEXT_DESC_LEN)))
                    .unwrap_or_default();
                format!("- {}{}", item.name, desc)
            })
            .collect();
        parts.push(format!("【地点】共 {} 个\n{}", locations.len(), lines.join("\n")));
    }

    if let Some(outline) = context.outline.as_ref().filter(|o| !o.is_empty()) {
        let lines: Vec<String> = outline
            .iter()
            .map(|item| {
                let indent = "  ".repeat(item.level.max(0) as usize);
                format!("{}{}", indent, item.title)
            })
            .collect();
        parts.push(format!("【大纲】共 {} 个节点\n{}", outline.len(), lines.join("\n")));
    }

    if let Some(notes) = context.notes.as_ref().filter(|n| !n.is_empty()) {
        let lines: Vec<String> = notes
            .iter()
            .map(|item| {
                let summary = item
                    .summary
                    .as_deref()
                    .map(|s| format!(" — {}", truncate_string(s, MAX_CONTEXT_DESC_LEN)))
                    .unwrap_or_default();
                format!("- {}{}", item.title, summary)
            })
            .collect();
        parts.push(format!("【笔记】共 {} 条\n{}", notes.len(), lines.join("\n")));
    }

    if let Some(Some(entity)) = context.selected_entity.as_ref() {
        let content = entity
            .content
            .as_deref()
            .map(|c| format!("\n内容：{}", truncate_string(c, MAX_CONTEXT_DESC_LEN)))
            .unwrap_or_default();
        parts.push(format!(
            "【选中对象】\n类型：{}\n名称：{}（ID：{}）{}",
            entity.r#type, entity.label, entity.id, content
        ));
    }

    if parts.is_empty() {
        String::new()
    } else {
        format!("当前工作区上下文：\n{}\n请基于以上背景作答。", parts.join("\n\n"))
    }
}

fn build_messages<'a>(
    settings: &'a crate::models::AppSettings,
    history: &'a [AiMessage],
    user_message: &'a str,
    chunks: &'a [AiSearchResult],
    context: Option<&'a AiChatContext>,
) -> Vec<OpenAiMessage<'a>> {
    let mut messages: Vec<OpenAiMessage<'a>> = Vec::new();
    let override_prompt = context
        .and_then(|c| c.system_prompt_override.as_deref())
        .filter(|s| !s.trim().is_empty());

    let system_prompt = if let Some(prompt) = override_prompt {
        prompt.trim()
    } else if settings.ai_system_prompt.trim().is_empty() {
        DEFAULT_SYSTEM_PROMPT
    } else {
        settings.ai_system_prompt.trim()
    };

    let mut system_parts: Vec<String> = vec![system_prompt.to_string()];

    if let Some(ctx) = context {
        let block = build_context_block(ctx);
        if !block.is_empty() {
            system_parts.push(block);
        }
    }

    if !chunks.is_empty() {
        let rag_context = chunks
            .iter()
            .map(|c| format!("[{}] {}", c.chunk.source_type, c.chunk.content))
            .collect::<Vec<_>>()
            .join("\n---\n");
        system_parts.push(format!("以下是与用户问题相关的工作区资料：\n{}", rag_context));
    }

    messages.push(OpenAiMessage {
        role: "system",
        content: system_parts.join("\n\n"),
    });

    for msg in history {
        if msg.role == AiRole::System {
            continue;
        }
        messages.push(OpenAiMessage {
            role: match msg.role {
                AiRole::User => "user",
                AiRole::Assistant => "assistant",
                AiRole::System => "system",
            },
            content: msg.content.clone(),
        });
    }

    messages.push(OpenAiMessage {
        role: "user",
        content: user_message.to_string(),
    });

    messages
}

pub async fn call_chat_api(
    settings: &crate::models::AppSettings,
    history: &[AiMessage],
    user_message: &str,
    chunks: &[AiSearchResult],
    context: Option<&AiChatContext>,
) -> AppResult<String> {
    if settings.ai_base_url.trim().is_empty() {
        return Err(AppError::InvalidInput("请先配置 API 基础地址".into()));
    }
    if settings.ai_model.trim().is_empty() {
        return Err(AppError::InvalidInput("请先配置模型名称".into()));
    }
    if settings.ai_api_key.trim().is_empty() {
        return Err(AppError::InvalidInput("请先配置 API Key".into()));
    }

    let base_url = settings.ai_base_url.trim().trim_end_matches('/');
    let url = format!("{}/chat/completions", base_url);

    let messages = build_messages(settings, history, user_message, chunks, context);

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", settings.ai_api_key))
        .json(&OpenAiChatRequest {
            model: &settings.ai_model,
            messages,
            stream: None,
        })
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("AI 请求失败: {}", e)))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_else(|_| "未知错误".into());
        return Err(AppError::Internal(format!("AI API 错误: {}", body)));
    }

    let payload: OpenAiChatResponse = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("解析 AI 响应失败: {}", e)))?;

    payload
        .choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| AppError::Internal("AI 响应为空".into()))
}

pub async fn call_chat_api_stream(
    settings: &crate::models::AppSettings,
    history: &[AiMessage],
    user_message: &str,
    chunks: &[AiSearchResult],
    context: Option<&AiChatContext>,
    on_event: &Channel<AiStreamEvent>,
) -> AppResult<String> {
    if settings.ai_base_url.trim().is_empty() {
        return Err(AppError::InvalidInput("请先配置 API 基础地址".into()));
    }
    if settings.ai_model.trim().is_empty() {
        return Err(AppError::InvalidInput("请先配置模型名称".into()));
    }
    if settings.ai_api_key.trim().is_empty() {
        return Err(AppError::InvalidInput("请先配置 API Key".into()));
    }

    let base_url = settings.ai_base_url.trim().trim_end_matches('/');
    let url = format!("{}/chat/completions", base_url);

    let messages = build_messages(settings, history, user_message, chunks, context);

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", settings.ai_api_key))
        .json(&OpenAiChatRequest {
            model: &settings.ai_model,
            messages,
            stream: Some(true),
        })
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("AI 请求失败: {}", e)))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_else(|_| "未知错误".into());
        let _ = on_event.send(AiStreamEvent::Error(format!("AI API 错误: {}", body)));
        return Err(AppError::Internal(format!("AI API 错误: {}", body)));
    }

    let mut full = String::new();
    let mut buffer = String::new();
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::Internal(format!("读取流失败: {}", e)))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buffer.find('\n') {
            let line: String = buffer.drain(..=pos).collect();
            let line = line.trim();
            if line.is_empty() || !line.starts_with("data: ") {
                continue;
            }
            let data = &line["data: ".len()..];
            if data == "[DONE]" {
                let _ = on_event.send(AiStreamEvent::Done);
                return Ok(full);
            }
            match serde_json::from_str::<OpenAiStreamResponse>(data) {
                Ok(resp) => {
                    if let Some(content) = resp
                        .choices
                        .into_iter()
                        .next()
                        .and_then(|c| c.delta.content)
                    {
                        full.push_str(&content);
                        let _ = on_event.send(AiStreamEvent::Delta(content));
                    }
                }
                Err(e) => {
                    let _ = on_event.send(AiStreamEvent::Error(format!("解析流失败: {}", e)));
                }
            }
        }
    }

    let _ = on_event.send(AiStreamEvent::Done);
    Ok(full)
}

fn validate_ai_enabled(settings: &crate::models::AppSettings) -> AppResult<()> {
    if !settings.ai_enabled {
        return Err(AppError::Forbidden(
            "AI 助手未启用，请先在设置中开启".into(),
        ));
    }
    if settings.ai_base_url.trim().is_empty() {
        return Err(AppError::InvalidInput("请先配置 API 基础地址".into()));
    }
    if settings.ai_model.trim().is_empty() {
        return Err(AppError::InvalidInput("请先配置模型名称".into()));
    }
    if settings.ai_api_key.trim().is_empty() {
        return Err(AppError::InvalidInput("请先配置 API Key".into()));
    }
    Ok(())
}

fn cache_ttl_for_action(action: AiActionType) -> u64 {
    match action {
        AiActionType::SummarizeWorkspace => 300,
        AiActionType::CheckTimelineConsistency => 300,
        _ => 600,
    }
}

fn build_shortcut_context_block(
    context: Option<&AiChatContext>,
    entities: &[AiScoredEntity],
    action: AiActionType,
) -> String {
    let mut parts: Vec<String> = Vec::new();

    if let Some(ctx) = context {
        let block = build_context_block(ctx);
        if !block.is_empty() {
            parts.push(block);
        }
    }

    if !entities.is_empty() {
        let lines: Vec<String> = entities
            .iter()
            .map(|e| format!("- [{}] {}：{}", e.entity_type, e.name, truncate_string(&e.summary, MAX_CONTEXT_DESC_LEN)))
            .collect();
        parts.push(format!(
            "【相关实体】\n{}\n\n这些实体可能与当前任务有关，请酌情参考。",
            lines.join("\n")
        ));
    }

    if let AiActionType::OptimizeEvent = action {
        parts.push("请直接给出优化后的内容，并简要说明修改理由。".into());
    }

    parts.join("\n\n")
}

pub enum ShortcutPrep {
    Cached(AiShortcutResult),
    NeedApi {
        session_id: String,
        user_message: String,
        history: Vec<AiMessage>,
        entities: Vec<AiScoredEntity>,
        retrieved_chunks: usize,
        cache_key: String,
    },
}

pub fn prepare_shortcut(
    conn: &Connection,
    settings: &crate::models::AppSettings,
    input: AiShortcutInput,
) -> AppResult<ShortcutPrep> {
    let session_id = match input.session_id {
        Some(id) => id,
        None => create_session(
            conn,
            CreateAiSessionInput {
                workspace_id: input.workspace_id.clone(),
                title: Some(format!("AI {}", input.action)),
            },
        )?
        .id,
    };

    let user_message = crate::services::ai_prompts::user_prompt_for_action(input.action);
    add_message(conn, &session_id, AiRole::User, user_message)?;

    let query_hash = hash_cache_key_material(input.query.as_deref().unwrap_or(""));
    let context_json = input
        .context
        .as_ref()
        .map(|c| serde_json::to_string(c))
        .transpose()
        .map_err(|e| AppError::Internal(format!("序列化上下文失败: {}", e)))?
        .unwrap_or_default();
    let context_hash = hash_cache_key_material(&context_json);
    let workspace = crate::services::workspace::get(conn, &input.workspace_id)?;
    let updated_at = workspace.updated_at.to_rfc3339();
    let context_material = format!(
        "{}|{}|{}|{}",
        input.action, query_hash, context_hash, updated_at
    );
    let cache_key = make_cache_key(&input.workspace_id, input.action, &context_material);

    if let Some(cached) = get_cached_response(conn, &cache_key)? {
        let messages = {
            add_message(conn, &session_id, AiRole::Assistant, &cached)?;
            list_messages(conn, &session_id, None)?
        };
        append_conversation_history(conn, &session_id, AiRole::Assistant, &cached)?;
        return Ok(ShortcutPrep::Cached(AiShortcutResult {
            session_id,
            reply: cached,
            messages,
            cached: true,
            entities: Vec::new(),
            retrieved_chunks: 0,
        }));
    }

    let query = input
        .query
        .as_deref()
        .filter(|s| !s.is_empty())
        .unwrap_or(user_message);
    let entities = if settings.ai_rag_enabled {
        retrieve_relevant_entities(conn, &input.workspace_id, query, Some(5))?
    } else {
        Vec::new()
    };

    let history = get_conversation_history(conn, &session_id, Some(MAX_HISTORY_MESSAGES))?
        .into_iter()
        .map(|h| AiMessage {
            id: h.id,
            session_id: h.session_id,
            role: h.role,
            content: h.content,
            created_at: h.created_at,
        })
        .collect();

    Ok(ShortcutPrep::NeedApi {
        session_id,
        user_message: user_message.to_string(),
        history,
        entities,
        retrieved_chunks: entities.len(),
        cache_key,
    })
}

pub async fn call_shortcut_api(
    settings: &crate::models::AppSettings,
    action: AiActionType,
    history: &[AiMessage],
    user_message: &str,
    entities: &[AiScoredEntity],
    context: Option<&AiChatContext>,
) -> AppResult<String> {
    validate_ai_enabled(settings)?;

    let base_url = settings.ai_base_url.trim().trim_end_matches('/');
    let url = format!("{}/chat/completions", base_url);

    let system_prompt = crate::services::ai_prompts::system_prompt_for_action_with_markdown(action);
    let context_block = build_shortcut_context_block(context, entities, action);
    let mut system_content = system_prompt;
    if !context_block.is_empty() {
        system_content.push_str("\n\n");
        system_content.push_str(&context_block);
    }

    let mut messages: Vec<OpenAiMessage<'_>> = Vec::new();
    messages.push(OpenAiMessage {
        role: "system",
        content: system_content,
    });
    for msg in history.iter().filter(|m| m.role != AiRole::System) {
        messages.push(OpenAiMessage {
            role: match msg.role {
                AiRole::User => "user",
                AiRole::Assistant => "assistant",
                AiRole::System => "system",
            },
            content: msg.content.clone(),
        });
    }
    messages.push(OpenAiMessage {
        role: "user",
        content: user_message.to_string(),
    });

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", settings.ai_api_key))
        .json(&OpenAiChatRequest {
            model: &settings.ai_model,
            messages,
            stream: None,
        })
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("AI 请求失败: {}", e)))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_else(|_| "未知错误".into());
        return Err(AppError::Internal(format!("AI API 错误: {}", body)));
    }

    let payload: OpenAiChatResponse = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("解析 AI 响应失败: {}", e)))?;

    payload
        .choices
        .into_iter()
        .next()
        .map(|c| c.message.content)
        .ok_or_else(|| AppError::Internal("AI 响应为空".into()))
}

pub fn save_shortcut_result(
    conn: &Connection,
    session_id: &str,
    cache_key: &str,
    action: AiActionType,
    reply: &str,
    entities: Vec<AiScoredEntity>,
    retrieved_chunks: usize,
    user_message: &str,
) -> AppResult<AiShortcutResult> {
    set_cached_response(conn, cache_key, reply, cache_ttl_for_action(action))?;
    append_conversation_history(conn, session_id, AiRole::User, user_message)?;
    append_conversation_history(conn, session_id, AiRole::Assistant, reply)?;

    let messages = {
        add_message(conn, session_id, AiRole::Assistant, reply)?;
        list_messages(conn, session_id, None)?
    };

    Ok(AiShortcutResult {
        session_id: session_id.to_string(),
        reply: reply.to_string(),
        messages,
        cached: false,
        entities,
        retrieved_chunks,
    })
}

pub async fn list_models(base_url: &str, api_key: &str) -> AppResult<Vec<AiModelInfo>> {
    let base_url = base_url.trim().trim_end_matches('/');
    if base_url.is_empty() {
        return Err(AppError::InvalidInput("请先配置 API 基础地址".into()));
    }
    if api_key.trim().is_empty() {
        return Err(AppError::InvalidInput("请先配置 API Key".into()));
    }

    let url = format!("{}/models", base_url);
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("获取模型列表失败: {}", e)))?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_else(|_| "未知错误".into());
        return Err(AppError::Internal(format!("模型列表 API 错误: {}", body)));
    }

    let payload: OpenAiModelList = response
        .json()
        .await
        .map_err(|e| AppError::Internal(format!("解析模型列表失败: {}", e)))?;

    let mut models: Vec<AiModelInfo> = payload
        .data
        .into_iter()
        .map(|m| AiModelInfo {
            id: m.id,
            owned_by: m.owned_by,
        })
        .collect();
    models.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(models)
}

const CONNECTION_TEST_TIMEOUT_SECONDS: u64 = 15;

fn map_connection_test_http_status(status: reqwest::StatusCode, body: &str) -> String {
    match status.as_u16() {
        401 => "API Key 无效或已过期，请检查密钥是否复制完整".into(),
        403 => "账号没有访问该模型的权限，或 API Key 被禁用".into(),
        404 => "API 端点不存在，请检查 Base URL 是否正确".into(),
        429 => "请求过于频繁或余额不足，请稍后重试或检查账户额度".into(),
        500 | 502 | 503 | 504 => "AI 服务暂时不可用，请稍后重试".into(),
        _ => format!("AI 服务返回错误 (HTTP {})：{}", status, truncate_string(body, 200)),
    }
}

fn map_connection_test_request_error(err: &reqwest::Error) -> String {
    map_connection_test_request_error_kind(
        err.is_timeout(),
        err.is_connect(),
        err.is_request(),
        &err.to_string(),
    )
}

fn map_connection_test_request_error_kind(
    is_timeout: bool,
    is_connect: bool,
    is_request: bool,
    detail: &str,
) -> String {
    if is_timeout {
        "连接超时，请检查网络或代理设置".into()
    } else if is_connect {
        "无法连接到 AI 服务，请检查 Base URL 和网络/代理设置".into()
    } else if is_request {
        "请求发送失败，请检查网络连接".into()
    } else {
        format!("连接失败：{}", detail)
    }
}

fn validate_connection_input(
    input: &crate::models::AiConnectionTestInput,
) -> Option<crate::models::AiConnectionTestResult> {
    let base_url = input.base_url.trim().trim_end_matches('/');
    if base_url.is_empty() {
        Some(crate::models::AiConnectionTestResult {
            status: "error".into(),
            latency_ms: 0,
            message: "请先配置 API 基础地址".into(),
        })
    } else {
        None
    }
}

pub async fn test_connection(
    input: &crate::models::AiConnectionTestInput,
) -> AppResult<crate::models::AiConnectionTestResult> {
    if let Some(result) = validate_connection_input(input) {
        return Ok(result);
    }

    let base_url = input.base_url.trim().trim_end_matches('/');
    let api_key = input.api_key.trim();
    let url = format!("{}/models", base_url);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(CONNECTION_TEST_TIMEOUT_SECONDS))
        .build()
        .map_err(|e| AppError::Internal(format!("创建 HTTP 客户端失败: {}", e)))?;

    let start = std::time::Instant::now();
    let result = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await;
    let latency_ms = start.elapsed().as_millis() as u64;

    match result {
        Ok(response) => {
            if response.status().is_success() {
                Ok(crate::models::AiConnectionTestResult {
                    status: "ok".into(),
                    latency_ms,
                    message: format!("连接成功，延迟 {}ms", latency_ms),
                })
            } else {
                let status = response.status();
                let body = response
                    .text()
                    .await
                    .unwrap_or_else(|_| "未知错误".into());
                Ok(crate::models::AiConnectionTestResult {
                    status: "error".into(),
                    latency_ms,
                    message: map_connection_test_http_status(status, &body),
                })
            }
        }
        Err(err) => Ok(crate::models::AiConnectionTestResult {
            status: "error".into(),
            latency_ms,
            message: map_connection_test_request_error(&err),
        }),
    }
}

fn parse_title_body(content: &str) -> (String, String) {
    let lines: Vec<&str> = content.lines().collect();
    let title = lines
        .iter()
        .find(|l| !l.trim().is_empty())
        .map(|l| l.trim().to_string())
        .unwrap_or_else(|| "AI 生成内容".into());
    let body = lines
        .iter()
        .skip_while(|l| l.trim().is_empty())
        .skip(1)
        .copied()
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string();
    (title, body)
}

pub fn apply_output(conn: &Connection, input: &AiInsertInput) -> AppResult<AiInsertResult> {
    let (title, body) = parse_title_body(&input.content);
    match input.target.as_str() {
        "note" => {
            let note = crate::services::note::create(
                conn,
                crate::models::CreateNoteInput {
                    workspace_id: Some(input.workspace_id.clone()),
                    folder_id: None,
                    title: title.clone(),
                    content: Some(body),
                    tags: None,
                    is_folder: Some(false),
                },
            )?;
            Ok(AiInsertResult {
                target: "note".into(),
                id: note.id,
                title: note.title,
            })
        }
        "outline" | "outline_node" => {
            let node = crate::services::outline::create(
                conn,
                crate::models::CreateOutlineNodeInput {
                    workspace_id: input.workspace_id.clone(),
                    r#type: Some("scene".into()),
                    title: title.clone(),
                    content: Some(body),
                    parent_id: None,
                    event_id: None,
                    cover_image: None,
                },
            )?;
            Ok(AiInsertResult {
                target: input.target.clone(),
                id: node.id,
                title: node.title,
            })
        }
        "event" => {
            let track_id = match &input.track_id {
                Some(id) => id.clone(),
                None => {
                    let tracks = crate::services::track::list(conn, &input.workspace_id)?;
                    tracks.into_iter().next().map(|t| t.id).ok_or_else(|| {
                        AppError::InvalidInput("工作区没有可用轨道，无法创建事件".into())
                    })?
                }
            };
            let event = crate::services::event::create(
                conn,
                crate::models::CreateEventInput {
                    workspace_id: input.workspace_id.clone(),
                    track_id,
                    title: title.clone(),
                    description: Some(body),
                    date_type: None,
                    date_value: None,
                    sort_order: None,
                    status: None,
                    color: None,
                    location_id: None,
                    image_urls: None,
                    character_ids: None,
                },
            )?;
            Ok(AiInsertResult {
                target: "event".into(),
                id: event.id,
                title: event.title,
            })
        }
        "vn_scene" => {
            let scene = crate::services::vn::create_scene(
                conn,
                crate::models::CreateVnSceneInput {
                    workspace_id: input.workspace_id.clone(),
                    title: title.clone(),
                    background: None,
                    background_asset_path: None,
                    bgm_path: None,
                    outline_node_id: None,
                },
            )?;
            if !body.is_empty() {
                crate::services::vn::create_line(
                    conn,
                    crate::models::CreateVnLineInput {
                        scene_id: scene.id.clone(),
                        line_type: Some("narration".into()),
                        character_id: None,
                        speaker_name: None,
                        text: Some(body),
                        emotion: None,
                        choice_label: None,
                        choice_target_scene_id: None,
                        sprite_asset_path: None,
                        sprite_position: None,
                        voice_path: None,
                    },
                )?;
            }
            Ok(AiInsertResult {
                target: "vn_scene".into(),
                id: scene.id,
                title: scene.title,
            })
        }
        "character" => {
            let character = crate::services::character::create(
                conn,
                crate::models::CreateCharacterInput {
                    workspace_id: input.workspace_id.clone(),
                    name: title.clone(),
                    description: Some(body),
                    tags: None,
                    color: None,
                },
            )?;
            Ok(AiInsertResult {
                target: "character".into(),
                id: character.id,
                title: character.name,
            })
        }
        "location" => {
            let location = crate::services::location::create(
                conn,
                crate::models::CreateLocationInput {
                    workspace_id: input.workspace_id.clone(),
                    name: title.clone(),
                    description: Some(body),
                    pos_x: None,
                    pos_y: None,
                    color: None,
                    icon: None,
                    linked_event_id: None,
                    character_ids: None,
                },
            )?;
            Ok(AiInsertResult {
                target: "location".into(),
                id: location.id,
                title: location.name,
            })
        }
        _ => Err(AppError::InvalidInput(format!(
            "不支持的 AI 插入目标: {}",
            input.target
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrate;
    use crate::models::{
        AiChunk, CreateCharacterInput, CreateEventInput, CreateOutlineNodeInput, CreateTrackInput,
        CreateWorkspaceInput, UpdateWorkspaceInput,
    };

    fn in_memory_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        migrate::run(&conn).unwrap();
        conn
    }

    fn seed_workspace(conn: &Connection) -> String {
        let ws = crate::services::workspace::create(
            conn,
            CreateWorkspaceInput {
                name: "测试工作区".into(),
                description: None,
                template: None,
                template_id: None,
                cover_color: None,
                cover_image: None,
            },
        )
        .unwrap();

        let track = crate::services::track::create(
            conn,
            CreateTrackInput {
                workspace_id: ws.id.clone(),
                name: "主线".into(),
                color: None,
            },
        )
        .unwrap();

        crate::services::character::create(
            conn,
            CreateCharacterInput {
                workspace_id: ws.id.clone(),
                name: "艾莉丝".into(),
                description: Some("女主角，拥有火焰魔法".into()),
                tags: None,
                color: None,
            },
        )
        .unwrap();

        crate::services::event::create(
            conn,
            CreateEventInput {
                workspace_id: ws.id.clone(),
                track_id: track.id,
                title: "开场".into(),
                description: Some("艾莉丝在森林中醒来".into()),
                date_type: None,
                date_value: None,
                sort_order: None,
                status: None,
                color: None,
                location_id: None,
                image_urls: None,
                character_ids: None,
            },
        )
        .unwrap();

        crate::services::outline::create(
            conn,
            CreateOutlineNodeInput {
                workspace_id: ws.id.clone(),
                r#type: None,
                title: "第一幕".into(),
                content: Some("介绍世界观".into()),
                parent_id: None,
                event_id: None,
                cover_image: None,
            },
        )
        .unwrap();

        ws.id
    }

    #[test]
    fn should_create_and_list_sessions() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);
        let session = create_session(
            &conn,
            CreateAiSessionInput {
                workspace_id: ws_id.clone(),
                title: Some("会话 1".into()),
            },
        )
        .unwrap();
        assert_eq!(session.title, "会话 1");

        let sessions = list_sessions(&conn, &ws_id).unwrap();
        assert_eq!(sessions.len(), 1);

        add_message(&conn, &session.id, AiRole::User, "你好").unwrap();
        let messages = list_messages(&conn, &session.id, None).unwrap();
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].role, AiRole::User);
    }

    #[test]
    fn should_index_workspace_and_search_chunks() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);
        index_workspace(&conn, &ws_id).unwrap();

        let chunks = search_chunks(&conn, &ws_id, "艾莉丝", Some(5)).unwrap();
        assert!(!chunks.is_empty());
        let top = &chunks[0];
        assert!(top.chunk.content.contains("艾莉丝"));
        assert!(top.score >= 1);

        let summary = kv_get(&conn, &ws_id, "workspace_summary").unwrap().unwrap();
        assert!(summary.value.contains("角色"));
    }

    #[test]
    fn should_set_and_get_kv() {
        let conn = in_memory_db();
        let _ws_id = seed_workspace(&conn);
        kv_set(
            &conn,
            AiKvEntry {
                workspace_id: "ws".into(),
                key: "hello".into(),
                value: "world".into(),
                updated_at: Utc::now(),
            },
        )
        .unwrap();
        let entry = kv_get(&conn, "ws", "hello").unwrap().unwrap();
        assert_eq!(entry.value, "world");
    }

    #[test]
    fn should_format_context_block() {
        let context = AiChatContext {
            workspace_summary: Some("角色 2 个，事件 1 个。".into()),
            timeline: None,
            characters: Some(vec![
                crate::models::AiChatContextCharacterItem {
                    id: "c1".into(),
                    name: "艾莉丝".into(),
                    description: Some("女主角".into()),
                    role: Some("主角".into()),
                },
            ]),
            locations: None,
            outline: None,
            notes: None,
            selected_entity: Some(Some(crate::models::AiChatContextSelectedEntity {
                r#type: "event".into(),
                id: "e1".into(),
                label: "开场".into(),
                content: None,
            })),
            system_prompt_override: None,
            scope: None,
        };
        let block = build_context_block(&context);
        assert!(block.contains("工作区上下文"));
        assert!(block.contains("角色 2 个"));
        assert!(block.contains("艾莉丝"));
        assert!(block.contains("选中对象"));
    }

    #[test]
    fn should_apply_output_to_character_and_location() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);

        let character_result = apply_output(
            &conn,
            &AiInsertInput {
                workspace_id: ws_id.clone(),
                target: "character".into(),
                content: "新角色\n这是一个测试角色".into(),
                track_id: None,
            },
        )
        .unwrap();
        assert_eq!(character_result.target, "character");
        assert_eq!(character_result.title, "新角色");

        let location_result = apply_output(
            &conn,
            &AiInsertInput {
                workspace_id: ws_id.clone(),
                target: "location".into(),
                content: "新地点\n这是一个测试地点".into(),
                track_id: None,
            },
        )
        .unwrap();
        assert_eq!(location_result.target, "location");
        assert_eq!(location_result.title, "新地点");
    }

    #[test]
    fn should_build_messages_with_lifetimes() {
        let settings = crate::models::AppSettings {
            ai_system_prompt: "You are a helpful assistant.".into(),
            ..Default::default()
        };
        let history = vec![AiMessage {
            id: "m1".into(),
            session_id: "s1".into(),
            role: AiRole::Assistant,
            content: "previous".into(),
            created_at: Utc::now(),
        }];
        let chunks = vec![AiSearchResult {
            chunk: AiChunk {
                id: "k1".into(),
                workspace_id: "ws".into(),
                source_id: "e1".into(),
                source_type: "event".into(),
                content: "艾莉丝醒来".into(),
                updated_at: Utc::now(),
            },
            score: 1,
        }];
        let context = AiChatContext {
            workspace_summary: Some("测试工作区".into()),
            timeline: None,
            characters: None,
            locations: None,
            outline: None,
            notes: None,
            selected_entity: None,
            system_prompt_override: None,
            scope: None,
        };

        let messages = build_messages(
            &settings,
            &history,
            "hello",
            &chunks,
            Some(&context),
        );

        assert_eq!(messages.len(), 3);
        assert_eq!(messages[0].role, "system");
        assert!(messages[0].content.contains("helpful assistant"));
        assert!(messages[0].content.contains("测试工作区"));
        assert!(messages[0].content.contains("艾莉丝醒来"));
        assert_eq!(messages[1].role, "assistant");
        assert_eq!(messages[1].content, "previous");
        assert_eq!(messages[2].role, "user");
        assert_eq!(messages[2].content, "hello");
    }

    #[test]
    fn should_use_system_prompt_override_when_present() {
        let settings = crate::models::AppSettings {
            ai_system_prompt: "You are a helpful assistant.".into(),
            ..Default::default()
        };
        let context = AiChatContext {
            workspace_summary: None,
            timeline: None,
            characters: None,
            locations: None,
            outline: None,
            notes: None,
            selected_entity: None,
            system_prompt_override: Some("Override prompt.".into()),
            scope: None,
        };

        let messages = build_messages(
            &settings,
            &[],
            "hello",
            &[],
            Some(&context),
        );

        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0].role, "system");
        assert!(messages[0].content.contains("Override prompt."));
        assert!(!messages[0].content.contains("helpful assistant"));
    }

    #[test]
    fn should_map_connection_test_http_status_to_friendly_message() {
        assert!(map_connection_test_http_status(
            reqwest::StatusCode::UNAUTHORIZED,
            ""
        )
        .contains("API Key"));
        assert!(map_connection_test_http_status(
            reqwest::StatusCode::NOT_FOUND,
            ""
        )
        .contains("Base URL"));
        assert!(map_connection_test_http_status(
            reqwest::StatusCode::TOO_MANY_REQUESTS,
            ""
        )
        .contains("频繁"));
        assert!(map_connection_test_http_status(
            reqwest::StatusCode::INTERNAL_SERVER_ERROR,
            ""
        )
        .contains("暂时不可用"));
        let generic = map_connection_test_http_status(reqwest::StatusCode::BAD_REQUEST, "bad");
        assert!(generic.contains("400"));
        assert!(generic.contains("bad"));
    }

    #[test]
    fn should_map_connection_test_request_error_kind_to_friendly_message() {
        assert!(map_connection_test_request_error_kind(true, false, false, "")
            .contains("超时"));
        assert!(map_connection_test_request_error_kind(false, true, false, "")
            .contains("无法连接"));
        assert!(map_connection_test_request_error_kind(false, false, true, "")
            .contains("请求发送失败"));
        let fallback = map_connection_test_request_error_kind(false, false, false, "oops");
        assert!(fallback.contains("连接失败"));
        assert!(fallback.contains("oops"));
    }

    #[test]
    fn should_return_error_when_base_url_empty() {
        let input = crate::models::AiConnectionTestInput {
            base_url: "   ".into(),
            api_key: "sk-test".into(),
            model: None,
        };
        let result = validate_connection_input(&input).unwrap();
        assert_eq!(result.status, "error");
        assert_eq!(result.latency_ms, 0);
        assert!(result.message.contains("基础地址"));
    }

    #[test]
    fn should_cache_and_retrieve_response() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);
        let key = make_cache_key(&ws_id, AiActionType::SummarizeWorkspace, "ctx-v1");

        assert!(get_cached_response(&conn, &key).unwrap().is_none());

        set_cached_response(&conn, &key, "cached summary", 600).unwrap();

        let cached = get_cached_response(&conn, &key).unwrap();
        assert_eq!(cached.as_deref(), Some("cached summary"));
    }

    #[test]
    fn should_expire_cached_response() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);
        let key = make_cache_key(&ws_id, AiActionType::SummarizeWorkspace, "ctx-exp");

        set_cached_response(&conn, &key, "will expire", 1).unwrap();
        assert!(get_cached_response(&conn, &key).unwrap().is_some());

        std::thread::sleep(std::time::Duration::from_secs(2));

        let cached = get_cached_response(&conn, &key).unwrap();
        assert!(cached.is_none());
    }

    #[test]
    fn should_overwrite_cached_response() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);
        let key = make_cache_key(&ws_id, AiActionType::OptimizeEvent, "ctx-overwrite");

        set_cached_response(&conn, &key, "first", 600).unwrap();
        set_cached_response(&conn, &key, "second", 600).unwrap();

        let cached = get_cached_response(&conn, &key).unwrap();
        assert_eq!(cached.as_deref(), Some("second"));
    }

    #[test]
    fn should_retrieve_relevant_entities_for_character() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);

        let entities = retrieve_relevant_entities(&conn, &ws_id, "艾莉丝", Some(5)).unwrap();

        assert!(!entities.is_empty());
        let character = entities.iter().find(|e| e.entity_type == "character").unwrap();
        assert_eq!(character.name, "艾莉丝");
        assert!(character.score >= 1);
    }

    #[test]
    fn should_score_entities_by_term_frequency() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);

        let entities =
            retrieve_relevant_entities(&conn, &ws_id, "艾莉丝 森林", Some(5)).unwrap();

        let character = entities
            .iter()
            .find(|e| e.entity_type == "character" && e.name == "艾莉丝")
            .unwrap();
        let event = entities
            .iter()
            .find(|e| e.entity_type == "event" && e.name == "开场")
            .unwrap();

        assert!(character.score >= 1);
        assert!(event.score >= 1);
    }

    #[test]
    fn should_return_empty_for_irrelevant_query() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);

        let entities =
            retrieve_relevant_entities(&conn, &ws_id, "完全不存在的词", Some(5)).unwrap();
        assert!(entities.is_empty());
    }

    #[test]
    fn should_limit_rag_results() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);

        let entities = retrieve_relevant_entities(&conn, &ws_id, "艾莉丝", Some(1)).unwrap();
        assert_eq!(entities.len(), 1);
    }

    #[test]
    fn should_escape_special_chars_in_like_query() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);

        // Query containing LIKE wildcards should not crash or return false positives.
        let entities = retrieve_relevant_entities(&conn, &ws_id, "100% 未知_词", Some(5)).unwrap();
        assert!(entities.is_empty());
    }

    #[test]
    fn should_prepare_shortcut_return_need_api_without_cache() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);
        let mut settings = crate::models::AppSettings::default();
        settings.ai_enabled = true;
        settings.ai_rag_enabled = false;

        let input = AiShortcutInput {
            workspace_id: ws_id,
            session_id: None,
            action: AiActionType::OptimizeEvent,
            context: None,
            query: None,
        };

        let prep = prepare_shortcut(&conn, &settings, input).unwrap();
        match prep {
            ShortcutPrep::NeedApi {
                session_id,
                user_message,
                history,
                entities,
                cache_key,
            } => {
                assert!(!session_id.is_empty());
                assert!(!user_message.is_empty());
                assert!(entities.is_empty());
                assert!(!cache_key.is_empty());
                let _ = history;
            }
            _ => panic!("未命中缓存时应返回 NeedApi"),
        }
    }

    #[test]
    fn should_prepare_shortcut_return_cached_when_cache_exists() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);
        let mut settings = crate::models::AppSettings::default();
        settings.ai_enabled = true;
        settings.ai_rag_enabled = false;

        let input = AiShortcutInput {
            workspace_id: ws_id.clone(),
            session_id: None,
            action: AiActionType::SummarizeWorkspace,
            context: None,
            query: None,
        };

        let prep = prepare_shortcut(&conn, &settings, input.clone()).unwrap();
        let cache_key = match prep {
            ShortcutPrep::NeedApi { cache_key, .. } => cache_key,
            _ => panic!("首次调用应返回 NeedApi"),
        };

        set_cached_response(&conn, &cache_key, "cached reply", 600).unwrap();

        let prep2 = prepare_shortcut(&conn, &settings, input).unwrap();
        match prep2 {
            ShortcutPrep::Cached(result) => {
                assert_eq!(result.reply, "cached reply");
                assert!(result.cached);
                assert!(result.entities.is_empty());
            }
            _ => panic!("命中缓存后应返回 Cached"),
        }
    }

    #[test]
    fn should_invalidate_ai_cache_for_workspace() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);
        let other_ws = crate::services::workspace::create(
            &conn,
            CreateWorkspaceInput {
                name: "其他工作区".into(),
                description: None,
                template: None,
                template_id: None,
                cover_color: None,
                cover_image: None,
            },
        )
        .unwrap();

        let key1 = make_cache_key(&ws_id, AiActionType::SummarizeWorkspace, "ctx1");
        let key2 = make_cache_key(&other_ws.id, AiActionType::SummarizeWorkspace, "ctx2");
        set_cached_response(&conn, &key1, "ws1 cached", 600).unwrap();
        set_cached_response(&conn, &key2, "ws2 cached", 600).unwrap();

        invalidate_ai_cache_for_workspace(&conn, &ws_id).unwrap();

        assert!(get_cached_response(&conn, &key1).unwrap().is_none());
        assert_eq!(
            get_cached_response(&conn, &key2).unwrap().as_deref(),
            Some("ws2 cached")
        );
    }

    #[test]
    fn should_change_cache_key_after_workspace_updated() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);
        let mut settings = crate::models::AppSettings::default();
        settings.ai_enabled = true;
        settings.ai_rag_enabled = false;

        let input = AiShortcutInput {
            workspace_id: ws_id.clone(),
            session_id: None,
            action: AiActionType::SummarizeWorkspace,
            context: None,
            query: None,
        };

        let prep1 = prepare_shortcut(&conn, &settings, input.clone()).unwrap();
        let key1 = match prep1 {
            ShortcutPrep::NeedApi { cache_key, .. } => cache_key,
            _ => panic!("首次调用应返回 NeedApi"),
        };

        // 模拟工作区更新，updated_at 变化
        crate::services::workspace::update(
            &conn,
            crate::models::UpdateWorkspaceInput {
                id: ws_id.clone(),
                name: Some("已更新工作区".into()),
                description: None,
                cover_color: None,
                cover_image: None,
            },
        )
        .unwrap();

        let prep2 = prepare_shortcut(&conn, &settings, input).unwrap();
        let key2 = match prep2 {
            ShortcutPrep::NeedApi { cache_key, .. } => cache_key,
            _ => panic!("工作区更新后缓存键应变化，仍返回 NeedApi"),
        };

        assert_ne!(key1, key2);
    }

    #[test]
    fn should_search_chunks_with_chinese_2grams() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);
        index_workspace(&conn, &ws_id).unwrap();

        // "艾莉" 是 "艾莉丝" 的 2-gram，应能命中角色 chunks
        let chunks = search_chunks(&conn, &ws_id, "艾莉", Some(5)).unwrap();
        assert!(
            chunks.iter().any(|c| c.chunk.content.contains("艾莉丝")),
            "中文 2-gram 应能召回包含完整词的 chunk"
        );
    }

    #[test]
    fn should_truncate_long_chunk_content_to_max_chunk_tokens() {
        let conn = in_memory_db();
        let ws_id = seed_workspace(&conn);

        // 创建一个超长的角色描述
        let long_description = "a".repeat(MAX_CHUNK_TOKENS * 3);
        crate::services::character::create(
            &conn,
            CreateCharacterInput {
                workspace_id: ws_id.clone(),
                name: "超长描述角色".into(),
                description: Some(long_description.clone()),
                tags: None,
                color: None,
            },
        )
        .unwrap();

        index_workspace(&conn, &ws_id).unwrap();

        let chunks = search_chunks(&conn, &ws_id, "超长描述角色", Some(5)).unwrap();
        let chunk = chunks
            .iter()
            .find(|c| c.chunk.source_type == "character" && c.chunk.content.contains("超长描述角色"))
            .expect("应找到角色 chunk");

        // MAX_CHUNK_TOKENS * 2 个字符 + 1 个省略符
        assert!(
            chunk.chunk.content.chars().count() <= MAX_CHUNK_TOKENS * 2 + 1,
            "chunk 内容应被截断到 MAX_CHUNK_TOKENS 以内"
        );
        assert!(chunk.chunk.content.ends_with('…'));
    }
}
