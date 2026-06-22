# 数据模型（Data Model）

> 本文档与 `src-tauri/src/models/` 与 `src/types/` 一一对应。
> 修改字段时，必须同步本文件、Rust struct、TS 类型、迁移文件。

---

## ER 概览

```
Workspace 1───* Track
Workspace 1───* Event *───* Character
                            │
Character 1───* CharacterRelationship *───1 Character
Workspace 1───* OutlineNode (self-ref tree)
Workspace 1───* Note
Workspace 1───* Location *───* Location  (via location_links)
Workspace 1───* VnScene 1───* VnLine
```

---

## 表结构

### workspaces
| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | UUID v4 |
| name | TEXT NOT NULL | |
| description | TEXT | 默认空串 |
| template | TEXT | blank/hero-journey/three-act/chronicle/biography |
| cover_color | TEXT | 主题色 hex |
| settings_json | TEXT | 工作区级设置 JSON |
| created_at | TEXT | ISO 8601 UTC |
| updated_at | TEXT | ISO 8601 UTC |

### tracks
| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | |
| workspace_id | TEXT FK | ON DELETE CASCADE |
| name | TEXT | |
| color | TEXT | 马卡龙色 hex |
| sort_order | INTEGER | |
| is_visible | INTEGER | 0/1 |
| created_at | TEXT | |

### events
| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | |
| workspace_id | TEXT FK | ON DELETE CASCADE |
| track_id | TEXT FK | ON DELETE CASCADE |
| title | TEXT | |
| description | TEXT | 富文本 HTML |
| date_type | TEXT | absolute/relative |
| date_value | TEXT | 绝对为 ISO date，相对为 "第N章/第N天" |
| sort_order | INTEGER | 同轨道内排序 |
| status | TEXT | draft/done/revise |
| color | TEXT NULL | 自定义颜色，NULL 表示跟轨道色 |
| created_at | TEXT | |
| updated_at | TEXT | |

索引：`idx_events_workspace_track (workspace_id, track_id, sort_order)`

### characters
| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | |
| workspace_id | TEXT FK | ON DELETE CASCADE |
| name | TEXT | |
| aliases | TEXT | JSON array string |
| avatar | TEXT NULL | base64 或路径 |
| description | TEXT | |
| appearance | TEXT | |
| backstory | TEXT | |
| goals | TEXT | |
| conflicts | TEXT | |
| arc | TEXT | |
| tags | TEXT | JSON array string |
| color | TEXT | |
| created_at | TEXT | |
| updated_at | TEXT | |

### event_characters（多对多）
| 字段 | 类型 | 说明 |
|---|---|---|
| event_id | TEXT FK | ON DELETE CASCADE |
| character_id | TEXT FK | ON DELETE CASCADE |
| PRIMARY KEY | (event_id, character_id) | |

### character_relationships
| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | |
| workspace_id | TEXT FK | |
| source_id | TEXT FK | |
| target_id | TEXT FK | |
| type | TEXT | family/love/enemy/mentor/friend/rival |
| description | TEXT | |
| strength | INTEGER | 1-5 |

### event_connections（事件因果/伏笔）
| 字段 | 类型 | 说明 |
|---|---|---|
| source_id | TEXT FK | ON DELETE CASCADE |
| target_id | TEXT FK | ON DELETE CASCADE |
| type | TEXT | causal/foreshadow |
| PRIMARY KEY | (source_id, target_id) | |

### outline_nodes
| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | |
| workspace_id | TEXT FK | |
| type | TEXT | volume/chapter/scene/event |
| title | TEXT | |
| content | TEXT | |
| parent_id | TEXT NULL | self-ref，根节点为 NULL |
| sort_order | INTEGER | |
| event_id | TEXT NULL | 关联事件 |
| status | TEXT | draft/done/revise |
| created_at | TEXT | |
| updated_at | TEXT | |

### notes
| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | |
| workspace_id | TEXT NULL | NULL 表示全局 |
| folder_id | TEXT NULL | self-ref |
| title | TEXT | |
| content | TEXT | Markdown |
| tags | TEXT | JSON array string |
| sort_order | INTEGER | |
| created_at | TEXT | |
| updated_at | TEXT | |

### locations（v1.3 故事地图）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | |
| workspace_id | TEXT FK | ON DELETE CASCADE |
| name | TEXT | 地点名称 |
| description | TEXT | |
| pos_x | INTEGER | SVG 画布 X 坐标 |
| pos_y | INTEGER | SVG 画布 Y 坐标 |
| color | TEXT | 地点色 |
| icon | TEXT | emoji 图标 |
| linked_event_id | TEXT NULL FK | 关联事件 |
| created_at | TEXT | |
| updated_at | TEXT | |

### location_links（v1.3 地点路径）
| 字段 | 类型 | 说明 |
|---|---|---|
| source_id | TEXT FK | ON DELETE CASCADE |
| target_id | TEXT FK | ON DELETE CASCADE |
| label | TEXT | 路径标签 |
| PRIMARY KEY | (source_id, target_id) | |

### vn_scenes（v1.6 视觉小说场景）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | |
| workspace_id | TEXT FK | ON DELETE CASCADE |
| title | TEXT | 场景标题 |
| background | TEXT | 背景描述/颜色（可选） |
| background_asset_path | TEXT NULL | 背景图资源相对路径 |
| bgm_path | TEXT NULL | 背景音乐资源相对路径 |
| outline_node_id | TEXT NULL FK | 关联大纲节点 |
| sort_order | INTEGER | |
| created_at | TEXT | |
| updated_at | TEXT | |

### vn_lines（v1.6 视觉小说台词）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | |
| scene_id | TEXT FK | ON DELETE CASCADE |
| sort_order | INTEGER | |
| line_type | TEXT | dialog/narration/choice |
| character_id | TEXT NULL FK | 说话角色 |
| speaker_name | TEXT | 自定义说话人 |
| text | TEXT | 台词/旁白文本 |
| emotion | TEXT | 情绪标签 |
| choice_label | TEXT | 选项标签 |
| choice_target_scene_id | TEXT NULL FK | 选项跳转目标 |
| sprite_asset_path | TEXT NULL | 角色立绘资源相对路径 |
| voice_path | TEXT NULL | 配音资源相对路径 |
| created_at | TEXT | |

### app_settings（全局，单行）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 永远为 1 |
| theme | TEXT | light/dark/sepia |
| accent_color | TEXT | |
| language | TEXT | zh-CN/zh-TW/en |
| editor_font | TEXT | |
| ui_font | TEXT | |
| font_size | INTEGER | 12-18 |
| backup_path | TEXT | |
| auto_backup | INTEGER | 0/1 |
| backup_interval_hours | INTEGER | |
| default_view | TEXT | timeline/characters/outline/statistics/notebook/map/vn |
| timeline_zoom | TEXT | year/month/day/hour |
| font_theme | TEXT | sans/mono/pixel（v1.3 新增） |

---

## 类型契约示例（Rust ↔ TS）

```rust
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub description: String,
    pub template: String,
    pub cover_color: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

```ts
export interface Workspace {
  id: string;
  name: string;
  description: string;
  template: WorkspaceTemplate;
  coverColor: string;
  createdAt: string;
  updatedAt: string;
}
```

---

> 文档版本：v1.3.0  
> 最后更新：2026-06-22
