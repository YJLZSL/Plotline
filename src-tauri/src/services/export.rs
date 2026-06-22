use rusqlite::Connection;

use crate::error::AppResult;

/// 导出整个工作区为 Markdown 叙事文档。
pub fn export_workspace_markdown(conn: &Connection, workspace_id: &str) -> AppResult<String> {
    let workspace = crate::services::workspace::get(conn, workspace_id)?;
    let tracks = crate::services::track::list(conn, workspace_id)?;
    let events = crate::services::event::list(conn, workspace_id)?;
    let characters = crate::services::character::list(conn, workspace_id)?;
    let outline = crate::services::outline::list(conn, workspace_id)?;
    let notes = crate::services::note::list(conn, workspace_id)?;

    let mut md = String::new();
    md.push_str(&format!("# {}\n\n", workspace.name));
    if !workspace.description.is_empty() {
        md.push_str(&format!("{}\n\n", workspace.description));
    }

    md.push_str("## 角色\n\n");
    for c in characters {
        md.push_str(&format!("### {}\n\n", c.name));
        if !c.description.is_empty() {
            md.push_str(&format!("{}\n\n", c.description));
        }
    }

    md.push_str("## 时间线\n\n");
    for t in tracks {
        md.push_str(&format!("### {}\n\n", t.name));
        for e in events.iter().filter(|e| e.track_id == t.id) {
            md.push_str(&format!(
                "#### {}（{} - {}）\n\n{}\n\n",
                e.title,
                e.date_value,
                status_label(&e.status),
                if e.description.is_empty() {
                    "（无描述）".into()
                } else {
                    e.description.clone()
                }
            ));
        }
    }

    md.push_str("## 大纲\n\n");
    append_outline_nodes(&mut md, &outline, None, 0);

    md.push_str("## 笔记\n\n");
    for n in notes.iter().filter(|n| !n.is_folder) {
        md.push_str(&format!("### {}\n\n{}\n\n", n.title, n.content));
    }

    Ok(md)
}

/// 导出大纲为 Markdown 文档。
pub fn export_outline_markdown(conn: &Connection, workspace_id: &str) -> AppResult<String> {
    let workspace = crate::services::workspace::get(conn, workspace_id)?;
    let outline = crate::services::outline::list(conn, workspace_id)?;

    let mut md = String::new();
    md.push_str(&format!("# {} - 大纲\n\n", workspace.name));
    append_outline_nodes(&mut md, &outline, None, 0);
    Ok(md)
}

fn append_outline_nodes(
    md: &mut String,
    nodes: &[crate::models::OutlineNode],
    parent_id: Option<&str>,
    depth: usize,
) {
    let prefix = "#".repeat(depth + 2);
    for n in nodes
        .iter()
        .filter(|n| n.parent_id.as_deref() == parent_id)
        .enumerate()
    {
        let (idx, node) = n;
        md.push_str(&format!(
            "{} {}. {}\n\n",
            prefix,
            idx + 1,
            node.title
        ));
        if !node.content.is_empty() {
            md.push_str(&format!("{}\n\n", node.content));
        }
        append_outline_nodes(md, nodes, Some(&node.id), depth + 1);
    }
}

fn status_label(status: &str) -> &'static str {
    match status {
        "done" => "完成",
        "revise" => "待修改",
        _ => "草稿",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::CreateWorkspaceInput;

    fn in_memory_db() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        crate::db::migrate::run(&conn).unwrap();
        conn
    }

    #[test]
    fn workspace_markdown_includes_title_and_outline() {
        let conn = in_memory_db();
        crate::services::workspace::create(
            &conn,
            CreateWorkspaceInput {
                name: "测试故事".into(),
                description: Some("一个测试".into()),
                template: Some("blank".into()),
                cover_color: None,
            },
        )
        .unwrap();

        let ws = crate::services::workspace::list(&conn).unwrap().pop().unwrap();
        let md = export_workspace_markdown(&conn, &ws.id).unwrap();
        assert!(md.contains("# 测试故事"));
        assert!(md.contains("一个测试"));
        assert!(md.contains("## 角色"));
        assert!(md.contains("## 时间线"));
        assert!(md.contains("## 大纲"));
    }

    #[test]
    fn outline_markdown_contains_workspace_name() {
        let conn = in_memory_db();
        crate::services::workspace::create(
            &conn,
            CreateWorkspaceInput {
                name: "大纲测试".into(),
                description: None,
                template: Some("blank".into()),
                cover_color: None,
            },
        )
        .unwrap();

        let ws = crate::services::workspace::list(&conn).unwrap().pop().unwrap();
        let md = export_outline_markdown(&conn, &ws.id).unwrap();
        assert!(md.contains("# 大纲测试 - 大纲"));
    }
}
