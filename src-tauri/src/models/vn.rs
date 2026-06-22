use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VnScene {
    pub id: String,
    pub workspace_id: String,
    pub title: String,
    pub background: String,
    pub outline_node_id: Option<String>,
    pub sort_order: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VnLine {
    pub id: String,
    pub scene_id: String,
    pub sort_order: i64,
    pub line_type: String, // dialog / narration / choice
    pub character_id: Option<String>,
    pub speaker_name: String,
    pub text: String,
    pub emotion: String,
    pub choice_label: String,
    pub choice_target_scene_id: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVnSceneInput {
    pub workspace_id: String,
    pub title: String,
    pub background: Option<String>,
    pub outline_node_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVnSceneInput {
    pub id: String,
    pub title: Option<String>,
    pub background: Option<String>,
    pub outline_node_id: Option<Option<String>>,
    pub sort_order: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVnLineInput {
    pub scene_id: String,
    pub line_type: Option<String>,
    pub character_id: Option<String>,
    pub speaker_name: Option<String>,
    pub text: Option<String>,
    pub emotion: Option<String>,
    pub choice_label: Option<String>,
    pub choice_target_scene_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVnLineInput {
    pub id: String,
    pub line_type: Option<String>,
    pub character_id: Option<Option<String>>,
    pub speaker_name: Option<String>,
    pub text: Option<String>,
    pub emotion: Option<String>,
    pub choice_label: Option<String>,
    pub choice_target_scene_id: Option<Option<String>>,
    pub sort_order: Option<i64>,
}
