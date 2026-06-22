use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Character {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub aliases: Vec<String>,
    pub avatar: Option<String>,
    pub description: String,
    pub appearance: String,
    pub backstory: String,
    pub goals: String,
    pub conflicts: String,
    pub arc: String,
    pub tags: Vec<String>,
    pub color: String,
    pub event_ids: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCharacterInput {
    pub workspace_id: String,
    pub name: String,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCharacterInput {
    pub id: String,
    pub name: Option<String>,
    pub aliases: Option<Vec<String>>,
    pub avatar: Option<Option<String>>,
    pub description: Option<String>,
    pub appearance: Option<String>,
    pub backstory: Option<String>,
    pub goals: Option<String>,
    pub conflicts: Option<String>,
    pub arc: Option<String>,
    pub tags: Option<Vec<String>>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CharacterRelationship {
    pub id: String,
    pub workspace_id: String,
    pub source_id: String,
    pub target_id: String,
    pub r#type: String,
    pub description: String,
    pub strength: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRelationshipInput {
    pub workspace_id: String,
    pub source_id: String,
    pub target_id: String,
    pub relationship_type: Option<String>,
    pub description: Option<String>,
    pub strength: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRelationshipInput {
    pub id: String,
    pub relationship_type: Option<String>,
    pub description: Option<String>,
    pub strength: Option<i64>,
}
