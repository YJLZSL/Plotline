use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutlineNode {
    pub id: String,
    pub workspace_id: String,
    pub r#type: String,
    pub title: String,
    pub content: String,
    pub parent_id: Option<String>,
    pub sort_order: i64,
    pub event_id: Option<String>,
    pub status: String,
    pub cover_image: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateOutlineNodeInput {
    pub workspace_id: String,
    pub r#type: Option<String>,
    pub title: String,
    pub content: Option<String>,
    pub parent_id: Option<String>,
    pub event_id: Option<String>,
    pub cover_image: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateOutlineNodeInput {
    pub id: String,
    pub title: Option<String>,
    pub content: Option<String>,
    pub event_id: Option<Option<String>>,
    pub status: Option<String>,
    pub cover_image: Option<Option<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveOutlineNodeInput {
    pub id: String,
    pub parent_id: Option<String>,
    pub sort_order: i64,
}
