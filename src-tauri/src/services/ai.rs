use std::collections::HashSet;

use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::models::{
    AiChunk, AiKvEntry, AiMessage, AiRole, AiSearchResult, AiSession, CreateAiMessageInput,
    CreateAiSessionInput,
};

const DEFAULT_SYSTEM_PROMPT: &str = "你是 Plotline 的 AI 创作助手，熟悉叙事写作、角色塑造、大纲结构和视觉小说。请用中文简洁回答。";
pub const MAX_HISTORY_MESSAGES: usize = 10;
pub const MAX_RAG_CHUNKS: usize = 5;
const MAX_CHUNK_TOKENS: usize = 800;

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
    .map_err(|_| AppError::NotFound(format!("AI 会话 {} 不存在", id)))
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
    .map_err(|_| AppError::NotFound(format!("AI 消息 {} 不存在", id)))
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
    kv_get(conn, &entry.workspace_id, &entry.key).map(|e| e.unwrap())
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
        insert_chunk(&tx, workspace_id, "character", &character.id, &content, character.updated_at)?;
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
        insert_chunk(&tx, workspace_id, "event", &event.id, &content, event.updated_at)?;
    }

    for node in crate::services::outline::list(conn, workspace_id)? {
        let content = format!(
            "大纲节点：{}\n类型：{}\n内容：{}\n状态：{}",
            node.title, node.r#type, node.content, node.status
        );
        insert_chunk(&tx, workspace_id, "outline", &node.id, &content, node.updated_at)?;
    }

    for note in crate::services::note::list(conn, workspace_id)? {
        let content = format!("笔记：{}\n内容：{}\n标签：{}", note.title, note.content, note.tags.join(", "));
        insert_chunk(&tx, workspace_id, "note", &note.id, &content, note.updated_at)?;
    }

    for scene in crate::services::vn::list_scenes(conn, workspace_id)? {
        let content = format!("VN 场景：{}\n背景：{}", scene.title, scene.background);
        insert_chunk(&tx, workspace_id, "vn_scene", &scene.id, &content, scene.updated_at)?;
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
        let content = format!("VN 台词（{}）\n说话人：{}\n情绪：{}\n内容：{}", line_type, speaker, emotion, text);
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
        params![id, workspace_id, source_type, source_id, truncated, updated_at],
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

fn extract_terms(text: &str) -> Vec<String> {
    let mut terms = Vec::new();
    let lowered = text.to_lowercase();
    let parts: Vec<&str> = lowered
        .split(|c: char| c.is_whitespace() || is_punctuation(c))
        .filter(|s| !s.is_empty())
        .collect();

    for part in parts {
        if part.chars().all(|c| c.is_ascii_alphanumeric()) {
            terms.push(part.to_string());
            if part.len() >= 2 {
                let chars: Vec<char> = part.chars().collect();
                for w in chars.windows(2) {
                    terms.push(format!("{}{}", w[0], w[1]));
                }
            }
        } else {
            let chars: Vec<char> = part.chars().collect();
            for c in &chars {
                terms.push(c.to_string());
            }
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
            '，' | '。' | '、' | '；' | '：' | '？' | '！' | '"' | '\'' | '（' | '）'
                | '《' | '》' | '【' | '】' | '…' | '—' | '–' | '～'
        )
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
    let mut values: Vec<rusqlite::types::Value> =
        vec![workspace_id.to_string().into()];
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

pub async fn call_chat_api(
    settings: &crate::models::AppSettings,
    history: &[AiMessage],
    user_message: &str,
    chunks: &[AiSearchResult],
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

    let mut messages: Vec<OpenAiMessage> = Vec::new();
    messages.push(OpenAiMessage {
        role: "system",
        content: DEFAULT_SYSTEM_PROMPT.to_string(),
    });

    if !chunks.is_empty() {
        let context = chunks
            .iter()
            .map(|c| format!("[{}] {}", c.chunk.source_type, c.chunk.content))
            .collect::<Vec<_>>()
            .join("\n---\n");
        messages.push(OpenAiMessage {
            role: "system",
            content: format!("以下是与用户问题相关的工作区资料：\n{}", context),
        });
    }

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

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", settings.ai_api_key))
        .json(&OpenAiChatRequest {
            model: &settings.ai_model,
            messages,
        })
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("AI 请求失败: {}", e)))?;

    if !response.status().is_success() {
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "未知错误".into());
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::migrate;
    use crate::models::{
        CreateCharacterInput, CreateEventInput, CreateOutlineNodeInput, CreateTrackInput,
        CreateWorkspaceInput,
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
                cover_color: None,
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
}
