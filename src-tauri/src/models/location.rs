use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Location {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub description: String,
    pub pos_x: f64,
    pub pos_y: f64,
    pub color: String,
    pub icon: String,
    pub linked_event_id: Option<String>,
    pub character_ids: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocationLink {
    pub source_id: String,
    pub target_id: String,
    pub label: String,
    pub source_name: String,
    pub target_name: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateLocationInput {
    pub workspace_id: String,
    pub name: String,
    pub description: Option<String>,
    pub pos_x: Option<f64>,
    pub pos_y: Option<f64>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub linked_event_id: Option<String>,
    pub character_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateLocationInput {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub pos_x: Option<f64>,
    pub pos_y: Option<f64>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub linked_event_id: Option<Option<String>>,
    pub character_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkLocationsInput {
    #[allow(dead_code)]
    pub workspace_id: String,
    pub source_id: String,
    pub target_id: String,
    pub label: Option<String>,
}
