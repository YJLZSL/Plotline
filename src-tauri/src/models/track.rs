use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Track {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub color: String,
    pub sort_order: i64,
    pub is_visible: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTrackInput {
    pub workspace_id: String,
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTrackInput {
    pub id: String,
    pub name: Option<String>,
    pub color: Option<String>,
    pub is_visible: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderTracksInput {
    pub workspace_id: String,
    pub ordered_ids: Vec<String>,
}
