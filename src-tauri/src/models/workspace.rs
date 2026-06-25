use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub description: String,
    pub template: String,
    pub cover_color: String,
    pub cover_image: Option<String>,
    pub event_count: i64,
    pub settings: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateWorkspaceInput {
    pub name: String,
    pub description: Option<String>,
    pub template: Option<String>,
    pub cover_color: Option<String>,
    pub cover_image: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateWorkspaceInput {
    pub id: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub cover_color: Option<String>,
    pub cover_image: Option<String>,
    pub settings: Option<serde_json::Value>,
}

/// 工作区导出/导入的完整数据包。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceBundle {
    pub version: u32,
    pub workspace: Workspace,
    pub tracks: Vec<crate::models::Track>,
    pub events: Vec<crate::models::Event>,
    pub characters: Vec<crate::models::Character>,
    pub relationships: Vec<crate::models::CharacterRelationship>,
    pub event_connections: Vec<crate::models::EventConnection>,
    pub outline_nodes: Vec<crate::models::OutlineNode>,
    pub notes: Vec<crate::models::Note>,
    pub locations: Vec<crate::models::Location>,
    pub location_links: Vec<crate::models::LocationLink>,
    pub vn_scenes: Vec<crate::models::VnScene>,
    pub vn_lines: Vec<crate::models::VnLine>,
}
