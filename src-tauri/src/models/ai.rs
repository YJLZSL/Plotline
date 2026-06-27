use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AiRole {
    System,
    User,
    Assistant,
}

impl std::fmt::Display for AiRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AiRole::System => write!(f, "system"),
            AiRole::User => write!(f, "user"),
            AiRole::Assistant => write!(f, "assistant"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiMessage {
    pub id: String,
    pub session_id: String,
    pub role: AiRole,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSession {
    pub id: String,
    pub workspace_id: String,
    pub title: String,
    pub summary: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAiSessionInput {
    pub workspace_id: String,
    pub title: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAiMessageInput {
    pub session_id: String,
    pub role: AiRole,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AiChatContext {
    pub workspace_summary: Option<String>,
    pub timeline: Option<Vec<AiChatContextTimelineItem>>,
    pub characters: Option<Vec<AiChatContextCharacterItem>>,
    pub locations: Option<Vec<AiChatContextLocationItem>>,
    pub outline: Option<Vec<AiChatContextOutlineItem>>,
    pub notes: Option<Vec<AiChatContextNoteItem>>,
    pub selected_entity: Option<Option<AiChatContextSelectedEntity>>,
    pub system_prompt_override: Option<String>,
    pub scope: Option<AiContextScope>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatContextTimelineItem {
    pub id: String,
    pub title: String,
    pub date_value: Option<String>,
    pub track_name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatContextCharacterItem {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatContextLocationItem {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatContextOutlineItem {
    pub id: String,
    pub title: String,
    pub level: i32,
    pub parent_id: Option<Option<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatContextNoteItem {
    pub id: String,
    pub title: String,
    pub summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatContextSelectedEntity {
    pub r#type: String,
    pub id: String,
    pub label: String,
    pub content: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatInput {
    pub workspace_id: String,
    pub session_id: Option<String>,
    pub message: String,
    pub use_rag: Option<bool>,
    pub context: Option<AiChatContext>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatResult {
    pub session_id: String,
    pub reply: String,
    pub messages: Vec<AiMessage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChunk {
    pub id: String,
    pub workspace_id: String,
    pub source_type: String,
    pub source_id: String,
    pub content: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSearchResult {
    pub chunk: AiChunk,
    pub score: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiKvEntry {
    pub workspace_id: String,
    pub key: String,
    pub value: String,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiInsertInput {
    pub workspace_id: String,
    pub target: String, // note | outline | event | vn_scene | character | location | outline_node
    pub content: String,
    pub track_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiInsertResult {
    pub target: String,
    pub id: String,
    pub title: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListAiModelsInput {
    pub base_url: String,
    pub api_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiModelInfo {
    pub id: String,
    pub owned_by: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiConnectionTestInput {
    pub base_url: String,
    pub api_key: String,
    pub model: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiConnectionTestResult {
    pub status: String,
    pub latency_ms: u64,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase", tag = "type", content = "data")]
pub enum AiStreamEvent {
    Delta(String),
    Error(String),
    Done,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCacheEntry {
    pub key: String,
    pub value: String,
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiConversationHistoryEntry {
    pub id: String,
    pub session_id: String,
    pub role: AiRole,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum AiContextScope {
    SelectedEntity,
    CurrentView,
    WholeWorkspace,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AiActionType {
    OptimizeEvent,
    OptimizeTimelineSegment,
    SummarizeWorkspace,
    CheckTimelineConsistency,
}

impl std::fmt::Display for AiActionType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AiActionType::OptimizeEvent => write!(f, "optimize_event"),
            AiActionType::OptimizeTimelineSegment => write!(f, "optimize_timeline_segment"),
            AiActionType::SummarizeWorkspace => write!(f, "summarize_workspace"),
            AiActionType::CheckTimelineConsistency => write!(f, "check_timeline_consistency"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiScoredEntity {
    pub id: String,
    pub entity_type: String,
    pub name: String,
    pub summary: String,
    pub score: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiShortcutInput {
    pub workspace_id: String,
    pub session_id: Option<String>,
    pub action: AiActionType,
    pub context: Option<AiChatContext>,
    pub query: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiShortcutResult {
    pub session_id: String,
    pub reply: String,
    pub messages: Vec<AiMessage>,
    pub cached: bool,
    pub entities: Vec<AiScoredEntity>,
}
