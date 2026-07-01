use std::fs;

use sha2::{Digest, Sha256};

use crate::{
    errors::AppError,
    models::{HtmlPreviewPayload, ItemDetail, MarkdownPreviewPayload, PreviewPayload},
};

fn escape_html(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn escape_html_attribute(input: &str) -> String {
    escape_html(input).replace('"', "&quot;")
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct MarkdownFrontmatter {
    fields: Vec<(String, Vec<String>)>,
    body: String,
}

fn split_markdown_frontmatter(raw: &str) -> Option<MarkdownFrontmatter> {
    let normalized = raw.replace("\r\n", "\n");
    let scan = if normalized.ends_with('\n') {
        normalized.clone()
    } else {
        format!("{normalized}\n")
    };
    let mut frontmatter_lines = Vec::new();
    let mut body_start = None;
    let mut line_start = 0;
    let mut line_number = 0;

    while line_start <= scan.len() {
        let Some(relative_line_end) = scan[line_start..].find('\n') else {
            break;
        };
        let line_end = line_start + relative_line_end;
        let line = &scan[line_start..line_end];
        line_number += 1;

        if line_number == 1 {
            if line.trim() != "---" {
                return None;
            }
        } else if line.trim() == "---" {
            body_start = Some((line_end + 1).min(normalized.len()));
            break;
        } else {
            frontmatter_lines.push(line.to_string());
        }

        line_start = line_end + 1;
    }

    if line_number == 0 || normalized.lines().next()?.trim() != "---" {
        return None;
    }

    let mut fields = Vec::<(String, Vec<String>)>::new();
    let mut current_field_index: Option<usize> = None;
    let mut current_block_field: Option<(usize, bool)> = None;

    for line in frontmatter_lines {
        let trimmed = line.trim();

        if let Some(value) = trimmed.strip_prefix("- ") {
            if let Some(index) = current_field_index {
                let value = trim_frontmatter_value(value);
                if !value.is_empty() {
                    fields[index].1.push(value);
                }
            }
            continue;
        }

        if line.starts_with(' ') || line.starts_with('\t') {
            if let Some((index, folded)) = current_block_field {
                let value = trimmed;
                if value.is_empty() {
                    continue;
                }
                if let Some(existing) = fields[index].1.first_mut() {
                    if !existing.is_empty() {
                        existing.push(if folded { ' ' } else { '\n' });
                    }
                    existing.push_str(value);
                }
            }
            continue;
        }

        let Some((key, raw_value)) = trimmed.split_once(':') else {
            current_field_index = None;
            current_block_field = None;
            continue;
        };
        let key = key.trim();
        if key.is_empty() {
            current_field_index = None;
            current_block_field = None;
            continue;
        }
        let raw_value = raw_value.trim();
        let field_index = fields.len();
        if raw_value == ">" || raw_value == "|" {
            fields.push((key.to_string(), vec![String::new()]));
            current_field_index = Some(field_index);
            current_block_field = Some((field_index, raw_value == ">"));
            continue;
        }

        fields.push((key.to_string(), parse_frontmatter_values(raw_value)));
        current_field_index = Some(field_index);
        current_block_field = None;
    }

    let body_start = body_start?;
    Some(MarkdownFrontmatter {
        fields,
        body: normalized[body_start..].trim_start_matches('\n').to_string(),
    })
}

fn trim_frontmatter_value(value: &str) -> String {
    value
        .trim()
        .trim_matches('"')
        .trim_matches('\'')
        .trim()
        .to_string()
}

fn parse_frontmatter_values(value: &str) -> Vec<String> {
    let trimmed = value.trim();
    if trimmed.starts_with('[') && trimmed.ends_with(']') {
        return trimmed[1..trimmed.len() - 1]
            .split(',')
            .map(trim_frontmatter_value)
            .filter(|value| !value.is_empty())
            .collect();
    }

    let value = trim_frontmatter_value(trimmed);
    if value.is_empty() {
        Vec::new()
    } else {
        vec![value]
    }
}

fn extract_skill_triggers_from_description(description: &str) -> Vec<String> {
    let Some((_, raw_triggers)) = description.split_once("Triggers:") else {
        return Vec::new();
    };
    raw_triggers
        .split(',')
        .map(|value| trim_frontmatter_value(value.trim_end_matches('.')))
        .filter(|value| !value.is_empty())
        .collect()
}

fn clean_skill_description(description: &str) -> String {
    if let Some((clean_description, _)) = description.split_once("Triggers:") {
        clean_description.trim().to_string()
    } else {
        description.trim().to_string()
    }
}

fn frontmatter_values(frontmatter: &MarkdownFrontmatter, key: &str) -> Vec<String> {
    if let Some((_, values)) = frontmatter
        .fields
        .iter()
        .find(|(candidate, _)| candidate == key)
    {
        if key == "description" {
            return values
                .iter()
                .map(|value| clean_skill_description(value))
                .filter(|value| !value.is_empty())
                .collect();
        }
        return values.clone();
    }
    if key == "trigger_keywords" {
        let description = frontmatter
            .fields
            .iter()
            .find(|(candidate, _)| candidate == "description")
            .and_then(|(_, values)| values.first())
            .cloned()
            .unwrap_or_default();
        return extract_skill_triggers_from_description(&description);
    }
    Vec::new()
}

fn markdown_body_without_frontmatter(raw: &str) -> String {
    split_markdown_frontmatter(raw)
        .map(|frontmatter| frontmatter.body)
        .unwrap_or_else(|| raw.to_string())
}

fn render_frontmatter_html(frontmatter: &MarkdownFrontmatter) -> String {
    let interesting_fields = ["name", "description", "trigger_keywords"];
    let rows: Vec<_> = frontmatter
        .fields
        .iter()
        .filter_map(|(key, _)| {
            if !interesting_fields.contains(&key.as_str()) {
                return None;
            }
            let values = frontmatter_values(frontmatter, key);
            if values.iter().any(|value| !value.trim().is_empty()) {
                Some((key.as_str(), values))
            } else {
                None
            }
        })
        .collect();
    if !frontmatter
        .fields
        .iter()
        .any(|(key, _)| key == "trigger_keywords")
    {
        let values = frontmatter_values(frontmatter, "trigger_keywords");
        if values.iter().any(|value| !value.trim().is_empty()) {
            let mut rows = rows;
            rows.push(("trigger_keywords", values));
            return render_frontmatter_rows_html(rows);
        }
    }
    if rows.is_empty() {
        return String::new();
    }

    render_frontmatter_rows_html(rows)
}

fn render_frontmatter_rows_html(rows: Vec<(&str, Vec<String>)>) -> String {
    let mut html = String::from(r#"<section class="markdown-frontmatter skill-frontmatter">"#);
    html.push_str(r#"<div class="markdown-frontmatter-label">SKILL 元信息</div>"#);
    for (key, values) in rows {
        html.push_str(r#"<div class="markdown-frontmatter-row">"#);
        html.push_str(&format!(
            r#"<span class="markdown-frontmatter-key">{}</span>"#,
            escape_html(key)
        ));
        html.push_str(r#"<span class="markdown-frontmatter-values">"#);
        for value in values.iter().filter(|value| !value.trim().is_empty()) {
            html.push_str(&format!(
                r#"<span class="markdown-frontmatter-value">{}</span>"#,
                escape_html(value)
            ));
        }
        html.push_str("</span></div>");
    }
    html.push_str("</section>");
    html
}

fn render_markdown_as_html_with_options(raw: &str, skip_first_h1: bool) -> String {
    let mut html = String::new();
    let mut paragraph = Vec::new();
    let mut skipped_first_h1 = false;
    let frontmatter = split_markdown_frontmatter(raw);
    let markdown_body;
    let raw = if let Some(frontmatter) = frontmatter.as_ref() {
        html.push_str(&render_frontmatter_html(frontmatter));
        markdown_body = frontmatter.body.as_str();
        markdown_body
    } else {
        raw
    };

    fn flush_paragraph(html: &mut String, paragraph: &mut Vec<String>) {
        if paragraph.is_empty() {
            return;
        }

        html.push_str("<p>");
        html.push_str(&paragraph.join("<br>"));
        html.push_str("</p>");
        paragraph.clear();
    }

    for line in raw.lines() {
        let trimmed = line.trim();

        if trimmed.is_empty() {
            flush_paragraph(&mut html, &mut paragraph);
            continue;
        }

        if let Some((level, title)) = markdown_heading(trimmed) {
            if skip_first_h1 && level == 1 && !skipped_first_h1 {
                skipped_first_h1 = true;
                continue;
            }
            flush_paragraph(&mut html, &mut paragraph);
            html.push_str(&format!("<h{level}>{}</h{level}>", escape_html(title.trim())));
            continue;
        }

        if let Some((alt, src)) = markdown_image(trimmed) {
            flush_paragraph(&mut html, &mut paragraph);
            html.push_str(&format!(
                r#"<p><img src="{}" alt="{}"></p>"#,
                escape_html_attribute(src),
                escape_html_attribute(alt)
            ));
            continue;
        }

        paragraph.push(escape_html(trimmed));
    }

    flush_paragraph(&mut html, &mut paragraph);
    html
}

pub fn render_markdown_as_html(raw: &str) -> String {
    render_markdown_as_html_with_options(raw, false)
}

pub fn render_markdown_body_as_html(raw: &str) -> String {
    render_markdown_as_html_with_options(raw, true)
}

fn markdown_image(line: &str) -> Option<(&str, &str)> {
    let rest = line.strip_prefix("![")?;
    let (alt, rest) = rest.split_once("](")?;
    let src = rest.strip_suffix(')')?;
    if src.trim().is_empty() || src.contains(char::is_whitespace) {
        return None;
    }
    Some((alt, src))
}

fn markdown_heading(line: &str) -> Option<(usize, &str)> {
    let level = line.chars().take_while(|value| *value == '#').count();
    if !(1..=6).contains(&level) {
        return None;
    }

    let rest = &line[level..];
    if !rest.starts_with(' ') {
        return None;
    }

    Some((level, rest))
}

pub fn markdown_h1_title(raw: &str) -> Option<String> {
    markdown_body_without_frontmatter(raw)
        .lines()
        .map(str::trim)
        .filter_map(|line| match markdown_heading(line) {
            Some((1, title)) => {
                let title = title.trim();
                if title.is_empty() {
                    None
                } else {
                    Some(title.to_string())
                }
            }
            _ => None,
        })
        .next()
}

pub fn markdown_document_title(raw: &str, fallback_file_name: &str) -> String {
    markdown_h1_title(raw).unwrap_or_else(|| fallback_file_name.to_string())
}

pub fn markdown_summary(raw: &str) -> String {
    markdown_body_without_frontmatter(raw)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(|line| line.trim_start_matches('#').trim())
        .find(|line| !line.is_empty())
        .unwrap_or("")
        .chars()
        .take(140)
        .collect()
}

pub fn content_hash(raw: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(raw.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn load_document_payload(
    item: &ItemDetail,
    html_preview_url: impl FnOnce(&std::path::Path) -> String,
) -> Result<PreviewPayload, AppError> {
    match item.summary.file_type.as_str() {
        "markdown" => {
            let raw = fs::read_to_string(&item.summary.file_path).map_err(|_| AppError::IoError)?;
            let html = render_markdown_body_as_html(&raw);
            let path = std::path::Path::new(&item.summary.file_path);
            let base_dir = path
                .parent()
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_default();

            Ok(PreviewPayload::Markdown(MarkdownPreviewPayload {
                item_id: item.summary.id,
                file_type: "markdown".to_string(),
                title: Some(markdown_document_title(&raw, &item.summary.file_name)),
                raw,
                html,
                base_dir,
                editable: true,
            }))
        }
        "html" => {
            let path = std::path::Path::new(&item.summary.file_path);
            let base_dir = path
                .parent()
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_default();

            Ok(PreviewPayload::Html(HtmlPreviewPayload {
                item_id: item.summary.id,
                file_type: "html".to_string(),
                title: item.summary.title.clone(),
                file_path: item.summary.file_path.clone(),
                preview_url: html_preview_url(path),
                document_html: None,
                base_dir,
                sandbox: false,
                allow_scripts: true,
                allow_external_resources: true,
                editable: false,
            }))
        }
        _ => Err(AppError::UnsupportedFileType),
    }
}

#[cfg(test)]
mod tests {
    use super::{content_hash, markdown_summary, render_markdown_as_html};

    fn markdown_detail_for_test(file_path: String, file_name: &str, title: Option<&str>) -> crate::models::ItemDetail {
        crate::models::ItemDetail {
            summary: crate::models::ItemSummary {
                id: 1,
                library_id: 1,
                file_path,
                relative_path: file_name.to_string(),
                file_name: file_name.to_string(),
                file_ext: "md".to_string(),
                file_type: "markdown".to_string(),
                file_size: 0,
                modified_at: "1".to_string(),
                title: title.map(str::to_string),
                summary: None,
                path_state: "valid".to_string(),
                is_favorite: false,
                last_opened_at: None,
                skill_binding: None,
                tags: vec![],
                thumbnail: None,
            },
            file_hash: None,
            extracted_title: None,
            source_text: None,
            raw_text: None,
            rendered_cache: None,
            created_at: "1".to_string(),
            updated_at: "1".to_string(),
        }
    }

    #[test]
    fn markdown_render_escapes_html() {
        let html = render_markdown_as_html("# <script>alert(1)</script>");
        assert!(html.contains("<h1>&lt;script&gt;alert(1)&lt;/script&gt;</h1>"));
        assert!(!html.contains("<script>"));
    }

    #[test]
    fn markdown_render_uses_heading_levels() {
        let html = render_markdown_as_html("# Title\n\n## Section\n\n### Detail\n\nbody");
        assert!(html.contains("<h1>Title</h1>"));
        assert!(html.contains("<h2>Section</h2>"));
        assert!(html.contains("<h3>Detail</h3>"));
        assert!(html.contains("<p>body</p>"));
    }

    #[test]
    fn markdown_body_render_skips_first_h1() {
        let html = super::render_markdown_body_as_html("# Title\n\nintro\n\n# Later");
        assert!(!html.contains("<h1>Title</h1>"));
        assert!(html.contains("<p>intro</p>"));
        assert!(html.contains("<h1>Later</h1>"));
    }

    #[test]
    fn markdown_render_supports_image_lines() {
        let html = render_markdown_as_html("![Hero](./assets/readme-hero.svg)");
        assert_eq!(html, r#"<p><img src="./assets/readme-hero.svg" alt="Hero"></p>"#);
    }

    #[test]
    fn markdown_render_presents_skill_frontmatter_as_metadata() {
        let html = render_markdown_as_html(
            "---\nname: skill-creator\ndescription: Create better skills\ntrigger_keywords:\n  - skill\n  - prompt\n---\n\n# Skill Creator\n\nBody",
        );
        assert!(html.contains(r#"<section class="markdown-frontmatter skill-frontmatter">"#));
        assert!(html.contains(r#"<span class="markdown-frontmatter-key">name</span>"#));
        assert!(html.contains(r#"<span class="markdown-frontmatter-value">skill-creator</span>"#));
        assert!(html.contains(r#"<span class="markdown-frontmatter-key">description</span>"#));
        assert!(html.contains(r#"<span class="markdown-frontmatter-value">Create better skills</span>"#));
        assert!(html.contains(r#"<span class="markdown-frontmatter-value">skill</span>"#));
        assert!(html.contains(r#"<span class="markdown-frontmatter-value">prompt</span>"#));
        assert!(!html.contains("<p>---</p>"));
        assert!(html.contains("<h1>Skill Creator</h1>"));
    }

    #[test]
    fn markdown_render_supports_folded_and_inline_skill_frontmatter_values() {
        let html = render_markdown_as_html(
            "---\nname: agent-reach\ndescription: >\n  Search and read 17 platforms.\n  Use when user asks to search.\ntrigger_keywords: [search, youtube transcript]\n---\n\n# Agent Reach",
        );
        assert!(html.contains(
            r#"<span class="markdown-frontmatter-value">Search and read 17 platforms. Use when user asks to search.</span>"#
        ));
        assert!(html.contains(r#"<span class="markdown-frontmatter-value">search</span>"#));
        assert!(html.contains(r#"<span class="markdown-frontmatter-value">youtube transcript</span>"#));
    }

    #[test]
    fn markdown_render_extracts_skill_triggers_from_description() {
        let html = render_markdown_as_html(
            "---\nname: agent-reach\ndescription: >\n  Search and read 17 platforms.\n  Triggers: \"搜推特\", \"youtube transcript\", \"read this link\".\n---\n\n# Agent Reach",
        );
        assert!(html.contains(
            r#"<span class="markdown-frontmatter-value">Search and read 17 platforms.</span>"#
        ));
        assert!(!html.contains(r#"<span class="markdown-frontmatter-value">Search and read 17 platforms. Triggers:"#));
        assert!(html.contains(r#"<span class="markdown-frontmatter-key">trigger_keywords</span>"#));
        assert!(html.contains(r#"<span class="markdown-frontmatter-value">搜推特</span>"#));
        assert!(html.contains(r#"<span class="markdown-frontmatter-value">youtube transcript</span>"#));
        assert!(html.contains(r#"<span class="markdown-frontmatter-value">read this link</span>"#));
    }

    #[test]
    fn markdown_render_supports_frontmatter_without_trailing_newline() {
        let html = render_markdown_as_html("---\nname: compact\n---");
        assert!(html.contains(r#"<span class="markdown-frontmatter-value">compact</span>"#));
        assert!(!html.contains("<p>---</p>"));
    }

    #[test]
    fn markdown_title_and_summary_skip_skill_frontmatter() {
        let raw = "---\nname: skill-creator\ndescription: Create better skills\ntrigger_keywords:\n  - skill\n---\n\n# Skill Creator\n\nBody";
        assert_eq!(super::markdown_document_title(raw, "SKILL.md"), "Skill Creator");
        assert_eq!(markdown_summary(raw), "Skill Creator");
    }

    #[test]
    fn markdown_summary_uses_first_non_empty_line() {
        assert_eq!(markdown_summary("\n# Hello World\n\nbody"), "Hello World");
    }

    #[test]
    fn markdown_preview_title_prefers_h1_over_item_title() {
        let path = std::env::temp_dir().join("nutbook-h1-preview.md");
        std::fs::write(&path, "# Real Document Title\n\nbody").expect("write markdown fixture");
        let preview = super::load_document_payload(
            &markdown_detail_for_test(path.to_string_lossy().to_string(), "nutbook-h1-preview.md", Some("nutbook-h1-preview.md")),
            |_| String::new(),
        )
        .expect("markdown payload should build");

        match preview {
            crate::models::PreviewPayload::Markdown(payload) => {
                assert_eq!(payload.title.as_deref(), Some("Real Document Title"));
            }
            _ => panic!("expected markdown payload"),
        }

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn markdown_preview_title_falls_back_to_file_name_without_h1() {
        let path = std::env::temp_dir().join("nutbook-no-h1.md");
        std::fs::write(&path, "## Section\n\nbody").expect("write markdown fixture");
        let preview = super::load_document_payload(
            &markdown_detail_for_test(path.to_string_lossy().to_string(), "nutbook-no-h1.md", None),
            |_| String::new(),
        )
        .expect("markdown payload should build");

        match preview {
            crate::models::PreviewPayload::Markdown(payload) => {
                assert_eq!(payload.title.as_deref(), Some("nutbook-no-h1.md"));
            }
            _ => panic!("expected markdown payload"),
        }

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn content_hash_is_stable() {
        assert_eq!(
            content_hash("abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn file_url_escapes_spaces() {
        let url = super::load_document_payload(
            &crate::models::ItemDetail {
                summary: crate::models::ItemSummary {
                    id: 1,
                    library_id: 1,
                    file_path: "/tmp/my file.html".to_string(),
                    relative_path: "my file.html".to_string(),
                    file_name: "my file.html".to_string(),
                    file_ext: "html".to_string(),
                    file_type: "html".to_string(),
                    file_size: 0,
                    modified_at: "1".to_string(),
                    title: None,
                    summary: None,
                    path_state: "valid".to_string(),
                    is_favorite: false,
                    last_opened_at: None,
                    skill_binding: None,
                    tags: vec![],
                    thumbnail: None,
                },
                file_hash: None,
                extracted_title: None,
                source_text: None,
                raw_text: None,
                rendered_cache: None,
                created_at: "1".to_string(),
                updated_at: "1".to_string(),
            },
            |path| format!("http://127.0.0.1:4000/fs{}", path.to_string_lossy().replace(' ', "%20")),
        )
        .expect("html payload should build");

        match url {
            crate::models::PreviewPayload::Html(payload) => {
                assert_eq!(payload.preview_url, "http://127.0.0.1:4000/fs/tmp/my%20file.html");
            }
            _ => panic!("expected html payload"),
        }
    }
}
