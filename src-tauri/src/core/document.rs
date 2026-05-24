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

pub fn render_markdown_as_html(raw: &str) -> String {
    let mut html = String::new();
    let mut paragraph = Vec::new();

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
            flush_paragraph(&mut html, &mut paragraph);
            html.push_str(&format!("<h{level}>{}</h{level}>", escape_html(title.trim())));
            continue;
        }

        paragraph.push(escape_html(trimmed));
    }

    flush_paragraph(&mut html, &mut paragraph);
    html
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

pub fn markdown_summary(raw: &str) -> String {
    raw.lines()
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
            let html = render_markdown_as_html(&raw);

            Ok(PreviewPayload::Markdown(MarkdownPreviewPayload {
                item_id: item.summary.id,
                file_type: "markdown".to_string(),
                title: item.summary.title.clone(),
                raw,
                html,
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
    fn markdown_summary_uses_first_non_empty_line() {
        assert_eq!(markdown_summary("\n# Hello World\n\nbody"), "Hello World");
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
