use std::{
    io::Read,
    path::Path,
    time::{Duration, Instant},
};

use html5ever::{parse_document, tendril::TendrilSink};
use markup5ever_rcdom::{Handle, NodeData, RcDom};
use rusqlite::{params, OptionalExtension};
use url::Url;

use super::{open, Result};
use crate::core::image_import::{fetch_raster, public_web_request};

#[derive(Default)]
struct Metadata {
    title: Option<String>,
    social_title: Option<String>,
    image: Option<String>,
}

fn metadata(node: &Handle, result: &mut Metadata) {
    if let NodeData::Element { name, attrs, .. } = &node.data {
        match name.local.as_ref() {
            "title" if result.title.is_none() => {
                result.title = node
                    .children
                    .borrow()
                    .iter()
                    .find_map(|child| match &child.data {
                        NodeData::Text { contents } => Some(contents.borrow().to_string()),
                        _ => None,
                    });
            }
            "meta" => {
                let attrs = attrs.borrow();
                let attr = |key: &str| {
                    attrs
                        .iter()
                        .find(|a| a.name.local.as_ref() == key)
                        .map(|a| a.value.as_ref())
                };
                let key = attr("property").or_else(|| attr("name"));
                if let Some(content) = attr("content").map(str::trim).filter(|s| !s.is_empty()) {
                    match key {
                        Some("og:title") => result.social_title = Some(content.into()),
                        Some("twitter:title") if result.social_title.is_none() => {
                            result.social_title = Some(content.into())
                        }
                        Some("og:image") if result.image.is_none() => {
                            result.image = Some(content.into())
                        }
                        Some("twitter:image") if result.image.is_none() => {
                            result.image = Some(content.into())
                        }
                        _ => {}
                    }
                }
            }
            "body" => return,
            _ => {}
        }
    }
    for child in node.children.borrow().iter() {
        metadata(child, result);
    }
}

fn fetch_page(mut url: Url) -> Result<(Metadata, Url)> {
    let deadline = Instant::now() + Duration::from_secs(8);
    for _ in 0..4 {
        let response = public_web_request(&url, deadline, "text/html,application/xhtml+xml")?;
        if (300..400).contains(&response.status()) {
            let next = response
                .header("Location")
                .ok_or("Missing redirect address")?;
            let next = url.join(next).map_err(|e| e.to_string())?;
            if url.scheme() == "https" && next.scheme() != "https" {
                return Err("Insecure redirect blocked".into());
            }
            url = next;
            continue;
        }
        if !response.header("Content-Type").is_some_and(|value| {
            value.starts_with("text/html") || value.starts_with("application/xhtml+xml")
        }) {
            return Err("Link did not return an HTML page".into());
        }
        let mut bytes = Vec::new();
        response
            .into_reader()
            .take(512 * 1024)
            .read_to_end(&mut bytes)
            .map_err(|e| e.to_string())?;
        let source = String::from_utf8_lossy(&bytes);
        let dom = parse_document(RcDom::default(), Default::default()).one(source.as_ref());
        let mut result = Metadata::default();
        metadata(&dom.document, &mut result);
        return Ok((result, url));
    }
    Err("Too many redirects".into())
}

fn is_verification_title(title: &str) -> bool {
    let title = title.trim().to_ascii_lowercase();
    matches!(
        title.as_str(),
        "百度安全验证"
            | "安全验证"
            | "just a moment..."
            | "access denied"
            | "attention required! | cloudflare"
    )
}

pub fn refresh(data_dir: &Path, id: &str) -> Result<bool> {
    let db = open(data_dir)?;
    let raw: Option<String> = db
        .query_row(
            "SELECT markdown FROM board_cards WHERE id = ?1 AND kind = 'link'
         AND NOT EXISTS (SELECT 1 FROM nuts_link_previews WHERE card_id = ?1)",
            [id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    let Some(raw) = raw else { return Ok(false) };
    let url = Url::parse(&raw).map_err(|e| e.to_string())?;
    let (meta, url) = fetch_page(url)?;
    if [meta.title.as_deref(), meta.social_title.as_deref()]
        .into_iter()
        .flatten()
        .any(is_verification_title)
    {
        return Ok(false);
    }
    let title = meta
        .social_title
        .or(meta.title)
        .map(|s| s.split_whitespace().collect::<Vec<_>>().join(" "))
        .filter(|s| !s.is_empty())
        .map(|s| s.chars().take(220).collect::<String>());
    let image = meta
        .image
        .and_then(|value| url.join(&value).ok())
        .and_then(|image_url| fetch_raster(image_url.as_str()).ok())
        .filter(|data| data.len() <= 512 * 1024);
    if title.is_none() && image.is_none() {
        return Ok(false);
    }
    let written = db
        .execute(
            "INSERT OR IGNORE INTO nuts_link_previews (card_id, title, image)
         SELECT id, ?2, ?3 FROM board_cards WHERE id = ?1 AND markdown = ?4",
            params![id, title, image, raw],
        )
        .map_err(|e| e.to_string())?;
    Ok(written != 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn recognizes_verification_titles_without_matching_article_titles() {
        assert!(is_verification_title(" 百度安全验证 "));
        assert!(is_verification_title("Just a moment..."));
        assert!(!is_verification_title("百度安全验证功能使用指南"));
    }

    #[test]
    fn reads_social_metadata_and_decodes_title_entities() {
        let dom = parse_document(RcDom::default(), Default::default()).one(
            "<title>Fallback</title><meta property='og:title' content='课堂 &amp; 观察'>\
             <meta property='og:image' content='/cover.jpg'><body><title>Ignored</title>",
        );
        let mut result = Metadata::default();
        metadata(&dom.document, &mut result);
        assert_eq!(result.title.as_deref(), Some("Fallback"));
        assert_eq!(result.social_title.as_deref(), Some("课堂 & 观察"));
        assert_eq!(result.image.as_deref(), Some("/cover.jpg"));
    }
}
