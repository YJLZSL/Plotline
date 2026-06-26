use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Event {
    pub id: String,
    pub workspace_id: String,
    pub track_id: String,
    pub title: String,
    pub description: String,
    pub date_type: String,
    pub date_value: String,
    pub sort_order: i64,
    pub status: String,
    pub color: Option<String>,
    pub location_id: Option<String>,
    pub image_urls: Vec<String>,
    pub character_ids: Vec<String>,
    pub connected_event_ids: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventConnection {
    pub source_id: String,
    pub target_id: String,
    pub source_title: String,
    pub target_title: String,
    pub connection_type: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEventInput {
    pub workspace_id: String,
    pub track_id: String,
    pub title: String,
    pub description: Option<String>,
    pub date_type: Option<String>,
    pub date_value: Option<String>,
    pub sort_order: Option<i64>,
    pub status: Option<String>,
    pub color: Option<String>,
    pub location_id: Option<String>,
    pub image_urls: Option<Vec<String>>,
    pub character_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEventInput {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub track_id: Option<String>,
    pub date_type: Option<String>,
    pub date_value: Option<String>,
    pub sort_order: Option<i64>,
    pub status: Option<String>,
    pub color: Option<Option<String>>,
    pub location_id: Option<Option<String>>,
    pub image_urls: Option<Vec<String>>,
    pub character_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectEventsInput {
    pub source_id: String,
    pub target_id: String,
    pub connection_type: Option<String>,
}
