use genpdf::Element;
use rusqlite::Connection;
use std::io::Write;

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
        md.push_str(&format!("{} {}. {}\n\n", prefix, idx + 1, node.title));
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

/// 将 Markdown 文本拆分为（标题级别，文本）块。级别 0 表示正文。
fn parse_markdown_blocks(md: &str) -> Vec<(usize, String)> {
    let mut blocks = Vec::new();
    let mut current = String::new();
    for line in md.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix('#') {
            let level = rest.chars().take_while(|c| *c == '#').count() + 1;
            let text = rest.trim_start_matches('#').trim().to_string();
            if !current.trim().is_empty() {
                blocks.push((0, current.trim().to_string()));
                current.clear();
            }
            blocks.push((level, text));
        } else if trimmed.is_empty() {
            if !current.trim().is_empty() {
                blocks.push((0, current.trim().to_string()));
                current.clear();
            }
        } else {
            if !current.is_empty() {
                current.push('\n');
            }
            current.push_str(trimmed);
        }
    }
    if !current.trim().is_empty() {
        blocks.push((0, current.trim().to_string()));
    }
    blocks
}

/// 导出工作区为 PDF。
///
/// 优先从系统字体目录加载支持中文的 TrueType 字体；如果找不到可用字体，返回明确错误。
pub fn export_workspace_pdf(conn: &Connection, workspace_id: &str) -> AppResult<Vec<u8>> {
    let md = export_workspace_markdown(conn, workspace_id)?;
    let workspace = crate::services::workspace::get(conn, workspace_id)?;
    let blocks = parse_markdown_blocks(&md);

    let font = load_cjk_font()?;
    let family = genpdf::fonts::FontFamily {
        regular: font.clone(),
        bold: font.clone(),
        italic: font.clone(),
        bold_italic: font.clone(),
    };

    let mut doc = genpdf::Document::new(family);
    doc.set_title(&workspace.name);
    doc.set_minimal_conformance();

    for (level, text) in blocks {
        let font_size: u8 = match level {
            1 => 22,
            2 => 18,
            3 => 15,
            _ => 11,
        };
        let paragraph = genpdf::elements::Paragraph::new(text).styled(
            genpdf::style::Style::new().with_font_size(font_size),
        );
        doc.push(paragraph);
        if level > 0 {
            doc.push(genpdf::elements::Break::new(1));
        }
    }

    let mut buf = Vec::new();
    doc.render(&mut buf)
        .map_err(|e| crate::error::AppError::Internal(format!("渲染 PDF 失败: {}", e)))?;
    Ok(buf)
}

/// 按优先级尝试加载系统中文字体。
fn load_cjk_font() -> AppResult<genpdf::fonts::FontData> {
    let mut candidates: Vec<std::path::PathBuf> = Vec::new();

    if let Ok(windir) = std::env::var("WINDIR") {
        let fonts_dir = std::path::Path::new(&windir).join("Fonts");
        candidates.push(fonts_dir.join("NotoSansSC-VF.ttf"));
        candidates.push(fonts_dir.join("Noto Sans SC (TrueType).otf"));
        candidates.push(fonts_dir.join("msyh.ttc"));
        candidates.push(fonts_dir.join("simsun.ttc"));
    }

    candidates.push(std::path::PathBuf::from("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"));
    candidates.push(std::path::PathBuf::from("/System/Library/Fonts/PingFang.ttc"));
    candidates.push(std::path::PathBuf::from("/System/Library/Fonts/STHeiti Light.ttc"));

    let mut last_err = String::new();
    for path in candidates {
        if !path.exists() {
            continue;
        }
        match genpdf::fonts::FontData::load(&path, None) {
            Ok(font) => return Ok(font),
            Err(e) => {
                last_err = format!("{}: {}", path.display(), e);
                continue;
            }
        }
    }

    Err(crate::error::AppError::Internal(format!(
        "未找到可用的中文字体（支持 TrueType 轮廓），请安装 Noto Sans CJK / 微软雅黑 / 苹方后重试。{}",
        if last_err.is_empty() {
            String::new()
        } else {
            format!(" 最后尝试: {}", last_err)
        }
    )))
}

/// 导出工作区为 Word (.docx)。
pub fn export_workspace_word(conn: &Connection, workspace_id: &str) -> AppResult<Vec<u8>> {
    let md = export_workspace_markdown(conn, workspace_id)?;
    let blocks = parse_markdown_blocks(&md);

    let mut docx = docx_rs::Docx::new();
    for (level, text) in blocks {
        let run = docx_rs::Run::new().add_text(text);
        let para = docx_rs::Paragraph::new().add_run(run);
        let para = if level == 1 {
            para.align(docx_rs::AlignmentType::Center)
        } else {
            para
        };
        docx = docx.add_paragraph(para);
    }
    let mut buf = std::io::Cursor::new(Vec::new());
    docx.build().pack(&mut buf).map_err(|e| {
        crate::error::AppError::Internal(format!("生成 DOCX 失败: {}", e))
    })?;
    Ok(buf.into_inner())
}

/// 导出工作区为 EPUB 3。
pub fn export_workspace_epub(conn: &Connection, workspace_id: &str) -> AppResult<Vec<u8>> {
    let md = export_workspace_markdown(conn, workspace_id)?;
    let workspace = crate::services::workspace::get(conn, workspace_id)?;
    let blocks = parse_markdown_blocks(&md);

    let mut buf = std::io::Cursor::new(Vec::new());
    {
        let mut zip = zip::write::ZipWriter::new(&mut buf);
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);

        zip.start_file("mimetype", zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored))?;
        zip.write_all(b"application/epub+zip")?;

        zip.start_file("META-INF/container.xml", options)?;
        zip.write_all(CONTAINER_XML.as_bytes())?;

        let mut html = String::new();
        html.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        html.push_str("<!DOCTYPE html>\n<html xmlns=\"http://www.w3.org/1999/xhtml\">\n<head>\n");
        html.push_str(&format!("<title>{}</title>\n", escape_xml(&workspace.name)));
        html.push_str("<meta charset=\"UTF-8\"/>\n");
        html.push_str("</head>\n<body>\n");
        for (level, text) in &blocks {
            if *level > 0 {
                html.push_str(&format!("<h{}>{}</h{}>\n", level, escape_xml(text), level));
            } else {
                html.push_str(&format!("<p>{}</p>\n", escape_xml(text).replace('\n', "</p>\n<p>")));
            }
        }
        html.push_str("</body>\n</html>\n");

        zip.start_file("OEBPS/chapter1.xhtml", options)?;
        zip.write_all(html.as_bytes())?;

        zip.start_file("OEBPS/toc.ncx", options)?;
        zip.write_all(build_toc_ncx(&workspace.name, &blocks).as_bytes())?;

        zip.start_file("OEBPS/content.opf", options)?;
        zip.write_all(build_content_opf(&workspace.name).as_bytes())?;
    }
    Ok(buf.into_inner())
}

const CONTAINER_XML: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
"#;

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn build_toc_ncx(title: &str, blocks: &[(usize, String)]) -> String {
    let mut points = String::new();
    let mut idx = 1;
    for (level, text) in blocks {
        if *level > 0 {
            points.push_str(&format!(
                "<navPoint id=\"navpoint-{}\" playOrder=\"{}\"><navLabel><text>{}</text></navLabel><content src=\"chapter1.xhtml#h{}\"/></navPoint>\n",
                idx, idx, escape_xml(text), level
            ));
            idx += 1;
        }
    }
    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<ncx version="2005-1" xmlns="http://www.daisy.org/z3986/2005/ncx/">
  <head>
    <meta name="dtb:uid" content="plotline-{}"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>{}</text></docTitle>
  <navMap>
{}
  </navMap>
</ncx>
"#,
        uuid::Uuid::new_v4(), escape_xml(title), points
    )
}

fn build_content_opf(title: &str) -> String {
    let uid = uuid::Uuid::new_v4();
    let now = chrono::Utc::now().to_rfc3339();
    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>{}</dc:title>
    <dc:identifier id="bookid">{}</dc:identifier>
    <dc:language>zh-CN</dc:language>
    <meta property="dcterms:modified">{}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine toc="ncx">
    <itemref idref="chapter1"/>
  </spine>
</package>
"#,
        escape_xml(title), uid, now
    )
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
                cover_image: None,
            },
        )
        .unwrap();

        let ws = crate::services::workspace::list(&conn)
            .unwrap()
            .pop()
            .unwrap();
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
                cover_image: None,
            },
        )
        .unwrap();

        let ws = crate::services::workspace::list(&conn)
            .unwrap()
            .pop()
            .unwrap();
        let md = export_outline_markdown(&conn, &ws.id).unwrap();
        assert!(md.contains("# 大纲测试 - 大纲"));
    }

    #[test]
    fn workspace_pdf_is_non_empty() {
        let conn = in_memory_db();
        crate::services::workspace::create(
            &conn,
            CreateWorkspaceInput {
                name: "PDF 测试".into(),
                description: Some("测试描述".into()),
                template: Some("blank".into()),
                cover_color: None,
                cover_image: None,
            },
        )
        .unwrap();

        let ws = crate::services::workspace::list(&conn)
            .unwrap()
            .pop()
            .unwrap();
        match export_workspace_pdf(&conn, &ws.id) {
            Ok(bytes) => {
                assert!(!bytes.is_empty());
                assert_eq!(&bytes[0..4], b"%PDF");
            }
            Err(crate::error::AppError::Internal(msg))
                if msg.contains("未找到可用的中文字体") =>
            {
                // 当前环境没有可用中文字体，跳过本测试
            }
            Err(e) => panic!("导出 PDF 失败: {}", e),
        }
    }

    #[test]
    fn workspace_word_is_non_empty() {
        let conn = in_memory_db();
        crate::services::workspace::create(
            &conn,
            CreateWorkspaceInput {
                name: "Word 测试".into(),
                description: None,
                template: Some("blank".into()),
                cover_color: None,
                cover_image: None,
            },
        )
        .unwrap();

        let ws = crate::services::workspace::list(&conn)
            .unwrap()
            .pop()
            .unwrap();
        let bytes = export_workspace_word(&conn, &ws.id).unwrap();
        assert!(!bytes.is_empty());
        assert!(bytes.windows(4).any(|w| w == b"PK\x03\x04"));
    }

    #[test]
    fn workspace_epub_is_non_empty() {
        let conn = in_memory_db();
        crate::services::workspace::create(
            &conn,
            CreateWorkspaceInput {
                name: "EPUB 测试".into(),
                description: None,
                template: Some("blank".into()),
                cover_color: None,
                cover_image: None,
            },
        )
        .unwrap();

        let ws = crate::services::workspace::list(&conn)
            .unwrap()
            .pop()
            .unwrap();
        let bytes = export_workspace_epub(&conn, &ws.id).unwrap();
        assert!(!bytes.is_empty());
        assert!(bytes.windows(4).any(|w| w == b"PK\x03\x04"));
    }
}
