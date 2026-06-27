use tauri::{ipc::Channel, State};

use crate::commands::with_db;
use crate::error::{AppError, AppResult};
use crate::models::{
    AiChatInput, AiChatResult, AiConnectionTestInput, AiConnectionTestResult, AiInsertInput,
    AiInsertResult, AiKvEntry, AiMessage, AiModelInfo, AiSession, AiStreamEvent,
    CreateAiMessageInput, CreateAiSessionInput, ListAiModelsInput,
};
use crate::services::settings::read_settings;
use crate::AppState;

#[tauri::command]
pub fn create_ai_session(
    state: State<'_, AppState>,
    input: CreateAiSessionInput,
) -> AppResult<AiSession> {
    with_db!(state, |conn| crate::services::ai::create_session(
        conn, input
    ))
}

#[tauri::command]
pub fn list_ai_sessions(
    state: State<'_, AppState>,
    workspace_id: String,
) -> AppResult<Vec<AiSession>> {
    with_db!(state, |conn| {
        crate::services::ai::list_sessions(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn get_ai_session(state: State<'_, AppState>, id: String) -> AppResult<AiSession> {
    with_db!(state, |conn| crate::services::ai::get_session(conn, &id))
}

#[tauri::command]
pub fn delete_ai_session(state: State<'_, AppState>, id: String) -> AppResult<()> {
    with_db!(state, |conn| crate::services::ai::delete_session(conn, &id))
}

#[tauri::command]
pub fn add_ai_message(
    state: State<'_, AppState>,
    input: CreateAiMessageInput,
) -> AppResult<AiMessage> {
    with_db!(state, |conn| {
        crate::services::ai::add_message_from_input(conn, input)
    })
}

#[tauri::command]
pub fn list_ai_messages(
    state: State<'_, AppState>,
    session_id: String,
) -> AppResult<Vec<AiMessage>> {
    with_db!(state, |conn| {
        crate::services::ai::list_messages(conn, &session_id, None)
    })
}

#[tauri::command]
pub async fn ai_chat(state: State<'_, AppState>, input: AiChatInput) -> AppResult<AiChatResult> {
    let user_message = input.message.trim().to_string();
    if user_message.is_empty() {
        return Err(AppError::InvalidInput("消息不能为空".into()));
    }

    let (settings, session_id, history, chunks) = {
        let db = state
            .db
            .lock()
            .map_err(|e| AppError::Internal(format!("db lock poisoned: {e}")))?;
        let settings = read_settings(&db.conn)?;
        if !settings.ai_enabled {
            return Err(AppError::Forbidden(
                "AI 助手未启用，请先在设置中开启".into(),
            ));
        }

        let session_id = match input.session_id {
            Some(id) => id,
            None => {
                crate::services::ai::create_session(
                    &db.conn,
                    CreateAiSessionInput {
                        workspace_id: input.workspace_id.clone(),
                        title: None,
                    },
                )?
                .id
            }
        };

        crate::services::ai::add_message(
            &db.conn,
            &session_id,
            crate::models::AiRole::User,
            &user_message,
        )?;

        let use_rag = input.use_rag.unwrap_or(true) && settings.ai_rag_enabled;
        let chunks = if use_rag {
            crate::services::ai::search_chunks(
                &db.conn,
                &input.workspace_id,
                &user_message,
                Some(crate::services::ai::MAX_RAG_CHUNKS),
            )?
        } else {
            Vec::new()
        };

        let history = crate::services::ai::list_messages(
            &db.conn,
            &session_id,
            Some(crate::services::ai::MAX_HISTORY_MESSAGES),
        )?;
        (settings, session_id, history, chunks)
    };

    let reply = crate::services::ai::call_chat_api(
        &settings,
        &history,
        &user_message,
        &chunks,
        input.context.as_ref(),
    )
    .await?;

    let messages = {
        let db = state
            .db
            .lock()
            .map_err(|e| AppError::Internal(format!("db lock poisoned: {e}")))?;
        crate::services::ai::add_message(
            &db.conn,
            &session_id,
            crate::models::AiRole::Assistant,
            &reply,
        )?;
        crate::services::ai::list_messages(&db.conn, &session_id, None)?
    };

    Ok(AiChatResult {
        session_id,
        reply,
        messages,
    })
}

#[tauri::command]
pub async fn ai_chat_stream(
    state: State<'_, AppState>,
    input: AiChatInput,
    on_event: Channel<AiStreamEvent>,
) -> AppResult<AiChatResult> {
    let user_message = input.message.trim().to_string();
    if user_message.is_empty() {
        return Err(AppError::InvalidInput("消息不能为空".into()));
    }

    let (settings, session_id, history, chunks) = {
        let db = state
            .db
            .lock()
            .map_err(|e| AppError::Internal(format!("db lock poisoned: {e}")))?;
        let settings = read_settings(&db.conn)?;
        if !settings.ai_enabled {
            return Err(AppError::Forbidden(
                "AI 助手未启用，请先在设置中开启".into(),
            ));
        }

        let session_id = match input.session_id {
            Some(id) => id,
            None => {
                crate::services::ai::create_session(
                    &db.conn,
                    CreateAiSessionInput {
                        workspace_id: input.workspace_id.clone(),
                        title: None,
                    },
                )?
                .id
            }
        };

        crate::services::ai::add_message(
            &db.conn,
            &session_id,
            crate::models::AiRole::User,
            &user_message,
        )?;

        let use_rag = input.use_rag.unwrap_or(true) && settings.ai_rag_enabled;
        let chunks = if use_rag {
            crate::services::ai::search_chunks(
                &db.conn,
                &input.workspace_id,
                &user_message,
                Some(crate::services::ai::MAX_RAG_CHUNKS),
            )?
        } else {
            Vec::new()
        };

        let history = crate::services::ai::list_messages(
            &db.conn,
            &session_id,
            Some(crate::services::ai::MAX_HISTORY_MESSAGES),
        )?;
        (settings, session_id, history, chunks)
    };

    let reply = crate::services::ai::call_chat_api_stream(
        &settings,
        &history,
        &user_message,
        &chunks,
        input.context.as_ref(),
        &on_event,
    )
    .await?;

    let messages = {
        let db = state
            .db
            .lock()
            .map_err(|e| AppError::Internal(format!("db lock poisoned: {e}")))?;
        crate::services::ai::add_message(
            &db.conn,
            &session_id,
            crate::models::AiRole::Assistant,
            &reply,
        )?;
        crate::services::ai::list_messages(&db.conn, &session_id, None)?
    };

    Ok(AiChatResult {
        session_id,
        reply,
        messages,
    })
}

#[tauri::command]
pub fn ai_index_workspace(state: State<'_, AppState>, workspace_id: String) -> AppResult<()> {
    with_db!(state, |conn| {
        crate::services::ai::index_workspace(conn, &workspace_id)
    })
}

#[tauri::command]
pub fn ai_kv_get(
    state: State<'_, AppState>,
    workspace_id: String,
    key: String,
) -> AppResult<Option<AiKvEntry>> {
    with_db!(state, |conn| crate::services::ai::kv_get(
        conn,
        &workspace_id,
        &key
    ))
}

#[tauri::command]
pub fn ai_kv_set(state: State<'_, AppState>, entry: AiKvEntry) -> AppResult<AiKvEntry> {
    with_db!(state, |conn| crate::services::ai::kv_set(conn, entry))
}

#[tauri::command]
pub async fn list_ai_models(input: ListAiModelsInput) -> AppResult<Vec<AiModelInfo>> {
    crate::services::ai::list_models(&input.base_url, &input.api_key).await
}

#[tauri::command]
pub async fn test_ai_connection(input: AiConnectionTestInput) -> AppResult<AiConnectionTestResult> {
    crate::services::ai::test_connection(&input).await
}

#[tauri::command]
pub fn apply_ai_output(
    state: State<'_, AppState>,
    input: AiInsertInput,
) -> AppResult<AiInsertResult> {
    with_db!(state, |conn| crate::services::ai::apply_output(
        conn, &input
    ))
}
