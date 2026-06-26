use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NovelChapter {
    pub id: String,
    pub workspace_id: String,
    pub outline_node_id: Option<String>,
    pub title: String,
    pub content: String,
    pub word_count: i64,
    pub status: String,
    pub sort_order: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNovelChapterInput {
    pub workspace_id: String,
    pub outline_node_id: Option<String>,
    pub title: String,
    pub content: Option<String>,
    pub status: Option<String>,
    pub sort_order: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNovelChapterInput {
    pub id: String,
    pub title: Option<String>,
    pub outline_node_id: Option<Option<String>>,
    pub content: Option<String>,
    pub status: Option<String>,
    pub sort_order: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderNovelChaptersInput {
    pub workspace_id: String,
    pub chapter_ids: Vec<String>,
}