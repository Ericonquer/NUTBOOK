use std::fs;

use sha2::{Digest, Sha256};

use crate::{
    core::document_title::DocumentTitle,
    errors::AppError,
    models::{
        HtmlPreviewPayload, ItemContentRevision, ItemDetail, MarkdownInspectorSnapshot,
        MarkdownPreviewPayload, PreviewPayload,
    },
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
pub(crate) struct PortableHtmlTag {
    pub(crate) name: String,
    pub(crate) closing: bool,
    pub(crate) self_closing: bool,
    pub(crate) attributes: Vec<(String, String)>,
}

pub(crate) fn parse_portable_html_tag(input: &str, cursor: &mut usize) -> Option<PortableHtmlTag> {
    let bytes = input.as_bytes();
    if bytes.get(*cursor) != Some(&b'<') {
        return None;
    }
    *cursor += 1;
    let closing = bytes.get(*cursor) == Some(&b'/');
    if closing {
        *cursor += 1;
    }
    let name_start = *cursor;
    while bytes
        .get(*cursor)
        .is_some_and(|value| value.is_ascii_alphanumeric() || *value == b'-')
    {
        *cursor += 1;
    }
    if *cursor == name_start {
        return None;
    }
    let name = input[name_start..*cursor].to_ascii_lowercase();
    let mut attributes = Vec::new();
    let mut self_closing = false;

    loop {
        while bytes.get(*cursor).is_some_and(|value| value.is_ascii_whitespace()) {
            *cursor += 1;
        }
        match bytes.get(*cursor) {
            Some(b'>') => {
                *cursor += 1;
                break;
            }
            Some(b'/') if bytes.get(*cursor + 1) == Some(&b'>') => {
                self_closing = true;
                *cursor += 2;
                break;
            }
            None => return None,
            _ if closing => return None,
            _ => {}
        }

        let attribute_start = *cursor;
        while bytes.get(*cursor).is_some_and(|value| {
            value.is_ascii_alphanumeric() || matches!(*value, b'-' | b'_' | b':')
        }) {
            *cursor += 1;
        }
        if *cursor == attribute_start {
            return None;
        }
        let attribute_name = input[attribute_start..*cursor].to_ascii_lowercase();
        while bytes.get(*cursor).is_some_and(|value| value.is_ascii_whitespace()) {
            *cursor += 1;
        }
        if bytes.get(*cursor) != Some(&b'=') {
            return None;
        }
        *cursor += 1;
        while bytes.get(*cursor).is_some_and(|value| value.is_ascii_whitespace()) {
            *cursor += 1;
        }
        let quote = *bytes.get(*cursor)?;
        if !matches!(quote, b'\'' | b'"') {
            return None;
        }
        *cursor += 1;
        let value_start = *cursor;
        while bytes.get(*cursor).is_some_and(|value| *value != quote) {
            *cursor += 1;
        }
        if bytes.get(*cursor) != Some(&quote) {
            return None;
        }
        let value = input[value_start..*cursor].to_string();
        *cursor += 1;
        if attributes.iter().any(|(existing, _)| existing == &attribute_name) {
            return None;
        }
        attributes.push((attribute_name, value));
    }

    Some(PortableHtmlTag {
        name,
        closing,
        self_closing,
        attributes,
    })
}

pub(crate) fn skip_portable_html_whitespace(input: &str, cursor: &mut usize) {
    while input
        .as_bytes()
        .get(*cursor)
        .is_some_and(|value| value.is_ascii_whitespace())
    {
        *cursor += 1;
    }
}

pub(crate) fn portable_tag_attribute<'a>(tag: &'a PortableHtmlTag, name: &str) -> Option<&'a str> {
    tag.attributes
        .iter()
        .find_map(|(attribute, value)| (attribute == name).then_some(value.as_str()))
}

fn portable_tag_has_only_attributes(tag: &PortableHtmlTag, allowed: &[&str]) -> bool {
    tag.attributes
        .iter()
        .all(|(name, _)| allowed.contains(&name.as_str()))
}

fn portable_image_url_is_safe_candidate(value: &str, allow_mailto: bool) -> bool {
    let value = value.trim();
    if value.is_empty()
        || value.starts_with("//")
        || value.chars().any(|character| character.is_control())
    {
        return false;
    }
    let Some(separator) = value.find(':') else {
        return true;
    };
    let scheme = &value[..separator];
    if scheme.is_empty()
        || !scheme
            .chars()
            .enumerate()
            .all(|(index, character)| {
                if index == 0 {
                    character.is_ascii_alphabetic()
                } else {
                    character.is_ascii_alphanumeric() || matches!(character, '+' | '-' | '.')
                }
            })
    {
        return true;
    }
    scheme.eq_ignore_ascii_case("http")
        || scheme.eq_ignore_ascii_case("https")
        || (allow_mailto && scheme.eq_ignore_ascii_case("mailto"))
}

fn portable_image_tag_is_valid(tag: &PortableHtmlTag) -> bool {
    if tag.name != "img" || tag.closing || !portable_tag_has_only_attributes(tag, &["src", "alt", "title", "width"]) {
        return false;
    }
    let Some(src) = portable_tag_attribute(tag, "src") else {
        return false;
    };
    if !portable_image_url_is_safe_candidate(src, false) {
        return false;
    }
    if let Some(width) = portable_tag_attribute(tag, "width") {
        if width.parse::<u16>().ok().filter(|value| (1..=8192).contains(value)).is_none() {
            return false;
        }
    }
    true
}

fn portable_anchor_tag_is_valid(tag: &PortableHtmlTag) -> bool {
    tag.name == "a"
        && !tag.closing
        && !tag.self_closing
        && portable_tag_has_only_attributes(tag, &["href", "title"])
        && portable_tag_attribute(tag, "href")
            .is_some_and(|href| portable_image_url_is_safe_candidate(href, true))
}

fn consume_portable_closing_tag(input: &str, cursor: &mut usize, name: &str) -> bool {
    let Some(tag) = parse_portable_html_tag(input, cursor) else {
        return false;
    };
    tag.closing && !tag.self_closing && tag.name == name && tag.attributes.is_empty()
}

pub(crate) fn validate_portable_image_html_structure(input: &str) -> bool {
    let mut cursor = 0;
    skip_portable_html_whitespace(input, &mut cursor);
    let Some(first) = parse_portable_html_tag(input, &mut cursor) else {
        return false;
    };

    let mut wrapper = None;
    let mut current = first;
    if current.name == "p" {
        if current.closing
            || current.self_closing
            || !portable_tag_has_only_attributes(&current, &["align"])
            || !portable_tag_attribute(&current, "align").is_some_and(|alignment| {
                matches!(alignment.to_ascii_lowercase().as_str(), "left" | "center" | "right")
            })
        {
            return false;
        }
        wrapper = Some("p");
        skip_portable_html_whitespace(input, &mut cursor);
        let Some(next) = parse_portable_html_tag(input, &mut cursor) else {
            return false;
        };
        current = next;
    }

    let mut linked = false;
    if current.name == "a" {
        if !portable_anchor_tag_is_valid(&current) {
            return false;
        }
        linked = true;
        skip_portable_html_whitespace(input, &mut cursor);
        let Some(next) = parse_portable_html_tag(input, &mut cursor) else {
            return false;
        };
        current = next;
    }

    if !portable_image_tag_is_valid(&current) {
        return false;
    }
    skip_portable_html_whitespace(input, &mut cursor);
    if linked {
        if !consume_portable_closing_tag(input, &mut cursor, "a") {
            return false;
        }
        skip_portable_html_whitespace(input, &mut cursor);
    }
    if wrapper.is_some() {
        if !consume_portable_closing_tag(input, &mut cursor, "p") {
            return false;
        }
        skip_portable_html_whitespace(input, &mut cursor);
    }
    cursor == input.len()
}

fn sanitize_portable_image_html(input: &str) -> Option<String> {
    if !validate_portable_image_html_structure(input) {
        return None;
    }
    let mut builder = ammonia::Builder::new();
    builder
        .add_tag_attributes("p", &["align"])
        .link_rel(None);
    let sanitized = builder.clean(input).to_string();
    if !sanitized.contains("<img") || !sanitized.contains("src=") {
        return None;
    }
    if input.to_ascii_lowercase().contains("<a") && !sanitized.contains("href=") {
        return None;
    }
    Some(sanitized)
}

fn portable_image_html_candidate(lines: &[&str], start: usize) -> Option<(String, usize)> {
    let first = lines.get(start)?.trim_start().to_ascii_lowercase();
    let closing = if first.starts_with("<p") {
        Some("</p>")
    } else if first.starts_with("<a") {
        Some("</a>")
    } else if first.starts_with("<img") {
        None
    } else {
        return None;
    };
    let max_end = (start + 32).min(lines.len());
    for end in start..max_end {
        let line = lines[end].to_ascii_lowercase();
        if closing.is_none() || closing.is_some_and(|closing| line.contains(closing)) {
            let raw = lines[start..=end].join("\n");
            return Some((raw, end - start + 1));
        }
    }
    None
}

fn complete_portable_html_tag(input: &str) -> Option<PortableHtmlTag> {
    let mut cursor = 0;
    skip_portable_html_whitespace(input, &mut cursor);
    let tag = parse_portable_html_tag(input, &mut cursor)?;
    skip_portable_html_whitespace(input, &mut cursor);
    (cursor == input.len()).then_some(tag)
}

fn aligned_text_html_candidate(lines: &[&str], start: usize) -> Option<(String, usize)> {
    let first = lines.get(start)?.trim();
    if !first.to_ascii_lowercase().starts_with("<div") {
        return None;
    }
    let opening = complete_portable_html_tag(first)?;
    if opening.name != "div" || opening.closing || opening.self_closing {
        return None;
    }
    let max_end = (start + 32).min(lines.len());
    for end in (start + 1)..max_end {
        let Some(closing) = complete_portable_html_tag(lines[end].trim()) else {
            continue;
        };
        if closing.name == "div"
            && closing.closing
            && !closing.self_closing
            && closing.attributes.is_empty()
        {
            return Some((lines[start..=end].join("\n"), end - start + 1));
        }
    }
    None
}

enum AlignedTextInner<'a> {
    Heading { level: usize, title: &'a str },
    Paragraph(Vec<&'a str>),
}

fn aligned_text_paragraph_line_is_supported(line: &str) -> bool {
    let trimmed = line.trim();
    if trimmed.is_empty()
        || trimmed.contains("![")
        || trimmed.contains('<')
        || trimmed.starts_with('>')
        || trimmed.starts_with('|')
        || trimmed.starts_with("```")
        || trimmed.starts_with("~~~")
        || trimmed.starts_with("- ")
        || trimmed.starts_with("* ")
        || trimmed.starts_with("+ ")
    {
        return false;
    }
    let ordered = trimmed
        .split_once(['.', ')'])
        .is_some_and(|(prefix, suffix)| {
            !prefix.is_empty()
                && prefix.chars().all(|value| value.is_ascii_digit())
                && suffix.starts_with(char::is_whitespace)
        });
    !ordered && markdown_heading(trimmed).is_none()
}

fn parse_aligned_text_html(input: &str) -> Option<(&'static str, AlignedTextInner<'_>)> {
    let lines = input.lines().collect::<Vec<_>>();
    if lines.len() < 5 || !lines.get(1)?.trim().is_empty() || !lines.get(lines.len() - 2)?.trim().is_empty() {
        return None;
    }
    let opening = complete_portable_html_tag(lines.first()?.trim())?;
    if opening.name != "div"
        || opening.closing
        || opening.self_closing
        || !portable_tag_has_only_attributes(&opening, &["align"])
    {
        return None;
    }
    let alignment = match portable_tag_attribute(&opening, "align")?.to_ascii_lowercase().as_str() {
        "center" => "center",
        "right" => "right",
        _ => return None,
    };
    let closing = complete_portable_html_tag(lines.last()?.trim())?;
    if closing.name != "div" || !closing.closing || closing.self_closing || !closing.attributes.is_empty() {
        return None;
    }
    let content = &lines[2..lines.len() - 2];
    if content.is_empty() || content.iter().any(|line| line.trim().is_empty()) {
        return None;
    }
    if content.len() == 1 {
        if let Some((level, title)) = markdown_heading(content[0].trim()) {
            return Some((alignment, AlignedTextInner::Heading { level, title }));
        }
    }
    if content.iter().all(|line| aligned_text_paragraph_line_is_supported(line)) {
        return Some((alignment, AlignedTextInner::Paragraph(content.to_vec())));
    }
    None
}

fn render_aligned_text_html(input: &str) -> Option<(String, bool)> {
    let (alignment, inner) = parse_aligned_text_html(input)?;
    let (inner_html, contains_h1) = match inner {
        AlignedTextInner::Heading { level, title } => (
            format!("<h{level}>{}</h{level}>", escape_html(title.trim())),
            level == 1,
        ),
        AlignedTextInner::Paragraph(lines) => (
            format!(
                "<p>{}</p>",
                lines
                    .iter()
                    .map(|line| escape_html(line.trim()))
                    .collect::<Vec<_>>()
                    .join("<br>")
            ),
            false,
        ),
    };
    Some((format!(r#"<div align="{alignment}">{inner_html}</div>"#), contains_h1))
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

fn render_markdown_as_html_with_options(
    raw: &str,
    skip_first_h1: bool,
    show_skill_frontmatter: bool,
) -> String {
    let mut html = String::new();
    let mut paragraph = Vec::new();
    let mut skipped_first_h1 = false;
    let frontmatter = split_markdown_frontmatter(raw);
    let markdown_body;
    let raw = if let Some(frontmatter) = frontmatter.as_ref() {
        if show_skill_frontmatter {
            html.push_str(&render_frontmatter_html(frontmatter));
        }
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

    let lines = raw.lines().collect::<Vec<_>>();
    let mut line_index = 0;
    while line_index < lines.len() {
        let line = lines[line_index];
        let trimmed = line.trim();

        if trimmed.is_empty() {
            flush_paragraph(&mut html, &mut paragraph);
            line_index += 1;
            continue;
        }

        if let Some((portable_source, consumed)) = portable_image_html_candidate(&lines, line_index) {
            flush_paragraph(&mut html, &mut paragraph);
            if let Some(portable_html) = sanitize_portable_image_html(&portable_source) {
                html.push_str(&portable_html);
            } else {
                html.push_str("<p>");
                html.push_str(
                    &lines[line_index..line_index + consumed]
                        .iter()
                        .map(|line| escape_html(line.trim()))
                        .collect::<Vec<_>>()
                        .join("<br>"),
                );
                html.push_str("</p>");
            }
            line_index += consumed;
            continue;
        }

        if let Some((aligned_source, consumed)) = aligned_text_html_candidate(&lines, line_index) {
            flush_paragraph(&mut html, &mut paragraph);
            if let Some((aligned_html, contains_h1)) = render_aligned_text_html(&aligned_source) {
                html.push_str(&aligned_html);
                if contains_h1 {
                    skipped_first_h1 = true;
                }
            } else {
                html.push_str("<p>");
                html.push_str(
                    &lines[line_index..line_index + consumed]
                        .iter()
                        .map(|line| escape_html(line.trim()))
                        .collect::<Vec<_>>()
                        .join("<br>"),
                );
                html.push_str("</p>");
            }
            line_index += consumed;
            continue;
        }

        if let Some((level, title)) = markdown_heading(trimmed) {
            if skip_first_h1 && level == 1 && !skipped_first_h1 {
                skipped_first_h1 = true;
                line_index += 1;
                continue;
            }
            flush_paragraph(&mut html, &mut paragraph);
            html.push_str(&format!("<h{level}>{}</h{level}>", escape_html(title.trim())));
            line_index += 1;
            continue;
        }

        if let Some(image) = markdown_image(trimmed) {
            flush_paragraph(&mut html, &mut paragraph);
            html.push_str("<p");
            if let Some(alignment) = image.alignment {
                html.push_str(&format!(r#" align="{}""#, alignment));
            }
            html.push_str("><img");
            html.push_str(&format!(
                r#" src="{}" alt="{}""#,
                escape_html_attribute(image.src),
                escape_html_attribute(image.alt)
            ));
            if let Some(title) = image.title {
                html.push_str(&format!(r#" title="{}""#, escape_html_attribute(title)));
            }
            html.push_str("></p>");
            line_index += 1;
            continue;
        }

        paragraph.push(escape_html(trimmed));
        line_index += 1;
    }

    flush_paragraph(&mut html, &mut paragraph);
    html
}

pub fn render_markdown_as_html(raw: &str) -> String {
    render_markdown_as_html_with_options(raw, false, false)
}

pub fn render_markdown_body_as_html(raw: &str) -> String {
    render_markdown_as_html_with_options(raw, true, false)
}

fn is_skill_markdown_file_name(file_name: &str) -> bool {
    std::path::Path::new(file_name)
        .file_name()
        .and_then(|value| value.to_str())
        .map(|value| value.eq_ignore_ascii_case("SKILL.md"))
        .unwrap_or(false)
}

pub fn render_markdown_as_html_for_file(raw: &str, file_name: &str) -> String {
    render_markdown_as_html_with_options(raw, false, is_skill_markdown_file_name(file_name))
}

pub fn render_markdown_body_as_html_for_file(raw: &str, file_name: &str) -> String {
    render_markdown_as_html_with_options(raw, true, is_skill_markdown_file_name(file_name))
}

struct MarkdownImage<'a> {
    alt: &'a str,
    src: &'a str,
    title: Option<&'a str>,
    alignment: Option<&'static str>,
}

fn markdown_image(line: &str) -> Option<MarkdownImage<'_>> {
    let rest = line.strip_prefix("![")?;
    let (alt, rest) = rest.split_once("](")?;
    let body = rest.strip_suffix(')')?;
    let (src, title) = if let Some(without_closing_quote) = body.strip_suffix('"') {
        let title_start = without_closing_quote.rfind(" \"")?;
        (
            &without_closing_quote[..title_start],
            Some(&without_closing_quote[title_start + 2..]),
        )
    } else {
        (body, None)
    };
    if src.trim().is_empty() || src.contains(char::is_whitespace) {
        return None;
    }
    let alignment = title.and_then(|title| {
        title.split_whitespace().find_map(|token| match token {
            "nutbook-align=left" => Some("left"),
            "nutbook-align=center" => Some("center"),
            "nutbook-align=right" => Some("right"),
            _ => None,
        })
    });
    Some(MarkdownImage {
        alt,
        src,
        title,
        alignment,
    })
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

/// 权威 Markdown 文档标题（兼容包装，语义见 [`DocumentTitle`]）。
///
/// B3 起标题语义统一由 `DocumentTitle::parse` 提供；本函数保留旧签名供
/// preview/导出等既有调用点使用，不再维护独立的行扫描解析。
pub fn markdown_document_title(raw: &str, fallback_file_name: &str) -> String {
    DocumentTitle::parse(raw, fallback_file_name).display_text
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

/// 文件 modified_at 的统一序列化格式。
///
/// 使用 `${seconds}.${nanoseconds 九位补零}`（例如 `1755123456.123456789`），
/// 而不是 19 位纳秒整数：后者超出 JS Number 安全整数范围，前端
/// `formatTimestamp(value * 1000)` 会溢出。秒.纳秒小数形式既保留高精度
/// （同一秒内的修改也能区分），又能被前端安全解析为毫秒。
///
/// scanner（扫描索引）、Markdown 打开刷新、Markdown 保存三处必须全部使用
/// 此 helper，避免秒级/高精度值在读写之间来回振荡。
pub fn file_modified_at_string(metadata: &fs::Metadata) -> Result<String, AppError> {
    let modified = metadata.modified().map_err(|_| AppError::IoError)?;
    let duration = modified
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|_| AppError::IoError)?;
    Ok(format!("{}.{:09}", duration.as_secs(), duration.subsec_nanos()))
}

/// PR C Phase 1（D1=A）：Markdown 资源解析上下文。origin 为该 item 的
/// scoped origin（每 session 独立 loopback）；root/base_dir 均为 canonical
/// 绝对路径，前端在同一空间内做前缀匹配。origin 为空 = 未启用。
#[derive(Debug, Clone, Default)]
pub struct MarkdownResourceContext {
    pub origin: String,
    pub root: String,
    pub base_dir: String,
}

pub fn load_document_payload(
    item: &ItemDetail,
    html_preview_url: impl FnOnce(&std::path::Path) -> String,
    markdown_resource: MarkdownResourceContext,
) -> Result<PreviewPayload, AppError> {
    match item.summary.file_type.as_str() {
        "markdown" => {
            let raw = fs::read_to_string(&item.summary.file_path).map_err(|_| AppError::IoError)?;
            let html = render_markdown_body_as_html_for_file(&raw, &item.summary.file_name);
            let path = std::path::Path::new(&item.summary.file_path);
            let base_dir = path
                .parent()
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_default();

            Ok(PreviewPayload::Markdown(MarkdownPreviewPayload {
                item_id: item.summary.id,
                file_type: "markdown".to_string(),
                title: Some(markdown_document_title(&raw, &item.summary.file_name)),
                revision: content_hash(&raw),
                raw,
                html,
                base_dir,
                editable: true,
                resource_origin: markdown_resource.origin,
                resource_root: markdown_resource.root,
                resource_base_dir: markdown_resource.base_dir,
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

/// 检查视图 Markdown snapshot：读取当前 raw 并计算 revision key（sha256）。
/// 与 `load_document_payload` 同一文件读取边界，但不生成第二份 HTML 投影；
/// HTML 等其他类型明确不支持——检查视图只消费已收敛的卡片截图状态。
pub fn load_markdown_inspector_snapshot(
    item: &ItemDetail,
    markdown_resource: MarkdownResourceContext,
) -> Result<MarkdownInspectorSnapshot, AppError> {
    if item.summary.file_type != "markdown" {
        return Err(AppError::UnsupportedFileType);
    }
    let raw = fs::read_to_string(&item.summary.file_path).map_err(|_| AppError::IoError)?;
    let path = std::path::Path::new(&item.summary.file_path);
    let base_dir = path
        .parent()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_default();

    Ok(MarkdownInspectorSnapshot {
        item_id: item.summary.id,
        file_type: "markdown".to_string(),
        title: Some(markdown_document_title(&raw, &item.summary.file_name)),
        revision: content_hash(&raw),
        raw,
        base_dir,
        file_path: item.summary.file_path.clone(),
        file_name: item.summary.file_name.clone(),
        resource_origin: markdown_resource.origin,
        resource_root: markdown_resource.root,
        resource_base_dir: markdown_resource.base_dir,
    })
}

/// 廉价复核入口：只返回文件当前内容 revision。前端在编辑器 ready、图片就绪、
/// 显示前各调用一次；与 snapshot.revision 不一致即丢弃旧实例并重读。
pub fn load_item_content_revision(item: &ItemDetail) -> Result<ItemContentRevision, AppError> {
    let raw = fs::read_to_string(&item.summary.file_path).map_err(|_| AppError::IoError)?;
    Ok(ItemContentRevision {
        item_id: item.summary.id,
        revision: content_hash(&raw),
    })
}

#[cfg(test)]
mod tests {
    use super::{
        content_hash, markdown_summary, render_markdown_as_html,
        render_markdown_as_html_for_file, MarkdownResourceContext,
    };

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
                source_badges: vec![],
                tags: vec![],
                thumbnail: None,
                snippets: vec![],
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
    fn markdown_render_supports_legacy_image_presentation_tokens() {
        let html = render_markdown_as_html(
            "![Hero](./assets/readme-hero.svg \"nutbook-align=center nutbook-size=small\")",
        );
        assert_eq!(
            html,
            r#"<p align="center"><img src="./assets/readme-hero.svg" alt="Hero" title="nutbook-align=center nutbook-size=small"></p>"#
        );
    }

    #[test]
    fn markdown_render_supports_portable_github_image_html() {
        let html = render_markdown_as_html(
            "<p align=\"center\">\n  <img src=\"./assets/icon.png\" alt=\"Icon\" width=\"112\">\n</p>",
        );
        assert!(html.contains(r#"<p align="center">"#), "{html}");
        assert!(html.contains(r#"<img src="./assets/icon.png" alt="Icon" width="112">"#), "{html}");
        assert!(!html.contains("&lt;p"), "{html}");
    }

    #[test]
    fn markdown_render_supports_linked_portable_github_image_html() {
        let html = render_markdown_as_html(
            "<p align=\"right\">\n  <a href=\"https://github.com/Ericonquer/NUTBOOK\" title=\"Open\">\n    <img src=\"./assets/cover.png\" alt=\"Cover\" width=\"480\">\n  </a>\n</p>",
        );
        assert!(html.contains(r#"<p align="right">"#), "{html}");
        assert!(html.contains(r#"href="https://github.com/Ericonquer/NUTBOOK""#), "{html}");
        assert!(html.contains(r#"src="./assets/cover.png""#), "{html}");
    }

    #[test]
    fn markdown_render_rejects_portable_image_html_with_unknown_attributes() {
        let html = render_markdown_as_html(
            "<p class=\"custom\" align=\"center\">\n  <img src=\"./assets/icon.png\" alt=\"Icon\" width=\"112\">\n</p>",
        );
        assert!(html.contains("&lt;p class=\"custom\" align=\"center\"&gt;"), "{html}");
        assert!(html.contains("&lt;img src=\"./assets/icon.png\""), "{html}");
        assert!(!html.contains(r#"<p class="custom""#), "{html}");
    }

    #[test]
    fn markdown_render_rejects_dangerous_portable_image_urls() {
        let html = render_markdown_as_html(
            "<a href=\"javascript:alert(1)\"><img src=\"./assets/icon.png\" alt=\"Icon\"></a>",
        );
        assert!(html.contains("&lt;a href=\"javascript:alert(1)\"&gt;"), "{html}");
        assert!(!html.contains(r#"href="javascript:""#), "{html}");
    }

    #[test]
    fn markdown_render_loads_the_portable_image_acceptance_artifact() {
        let raw = include_str!(
            "../../tests/fixtures/markdown-portable-images/portable-markdown-images.md"
        );
        let html = render_markdown_as_html(raw);
        assert!(html.contains(r#"<p align="center">"#), "{html}");
        assert!(html.contains(r#"width="112""#), "{html}");
        assert!(html.contains(r#"<p align="right">"#), "{html}");
        assert!(html.contains(r#"width="480""#), "{html}");
        assert!(
            html.contains(r#"title="nutbook-align=center nutbook-size=small""#),
            "{html}"
        );
        assert!(html.contains("&lt;kbd&gt;Command&lt;/kbd&gt;"), "{html}");
        assert!(
            html.contains("&lt;p class=\"custom-image-frame\" align=\"center\"&gt;"),
            "{html}"
        );
    }

    #[test]
    fn markdown_render_supports_portable_text_alignment() {
        let html = render_markdown_as_html(
            "<div align=\"center\">\n\n## Centered heading\n\n</div>\n\n<div align=\"right\">\n\nRight paragraph.\n\n</div>",
        );
        assert!(
            html.contains(r#"<div align="center"><h2>Centered heading</h2></div>"#),
            "{html}"
        );
        assert!(
            html.contains(r#"<div align="right"><p>Right paragraph.</p></div>"#),
            "{html}"
        );
    }

    #[test]
    fn markdown_body_render_keeps_aligned_brand_h1_visible() {
        let html = super::render_markdown_body_as_html(
            "<div align=\"center\">\n\n# NUTBOOK Brand\n\n</div>\n\n# Later H1",
        );
        assert!(html.contains(r#"<div align="center"><h1>NUTBOOK Brand</h1></div>"#), "{html}");
        assert!(html.contains("<h1>Later H1</h1>"), "{html}");
    }

    #[test]
    fn markdown_render_rejects_unsafe_or_ambiguous_text_alignment_blocks() {
        let unknown_attribute = render_markdown_as_html(
            "<div class=\"custom\" align=\"center\">\n\nCentered text.\n\n</div>",
        );
        assert!(unknown_attribute.contains("&lt;div class=\"custom\" align=\"center\"&gt;"), "{unknown_attribute}");
        assert!(!unknown_attribute.contains(r#"<div align="center"><p>"#), "{unknown_attribute}");

        let multiple_blocks = render_markdown_as_html(
            "<div align=\"center\">\n\nFirst paragraph.\n\nSecond paragraph.\n\n</div>",
        );
        assert!(multiple_blocks.contains("&lt;div align=\"center\"&gt;"), "{multiple_blocks}");
        assert!(!multiple_blocks.contains(r#"<div align="center"><p>"#), "{multiple_blocks}");

        let inline_image = render_markdown_as_html(
            "<div align=\"right\">\n\nText ![Icon](./icon.png)\n\n</div>",
        );
        assert!(inline_image.contains("&lt;div align=\"right\"&gt;"), "{inline_image}");
        assert!(!inline_image.contains(r#"<div align="right"><p>"#), "{inline_image}");
    }

    #[test]
    fn markdown_render_loads_the_text_alignment_acceptance_artifact() {
        let raw = include_str!(
            "../../tests/fixtures/markdown-text-alignment/portable-text-alignment.md"
        );
        let html = render_markdown_as_html(raw);
        assert!(html.contains(r#"<div align="center"><h1>NUTBOOK Brand</h1></div>"#), "{html}");
        assert!(html.contains(r#"<div align="right"><p>This paragraph keeps"#), "{html}");
        assert!(html.contains("&lt;div class=\"custom-alignment\" align=\"center\"&gt;"), "{html}");
        assert!(html.contains("First paragraph in a rejected multi-block container."), "{html}");
    }

    #[test]
    fn markdown_render_presents_skill_frontmatter_as_metadata() {
        let html = render_markdown_as_html_for_file(
            "---\nname: skill-creator\ndescription: Create better skills\ntrigger_keywords:\n  - skill\n  - prompt\n---\n\n# Skill Creator\n\nBody",
            "SKILL.md",
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
        let html = render_markdown_as_html_for_file(
            "---\nname: agent-reach\ndescription: >\n  Search and read 17 platforms.\n  Use when user asks to search.\ntrigger_keywords: [search, youtube transcript]\n---\n\n# Agent Reach",
            "skill.md",
        );
        assert!(html.contains(
            r#"<span class="markdown-frontmatter-value">Search and read 17 platforms. Use when user asks to search.</span>"#
        ));
        assert!(html.contains(r#"<span class="markdown-frontmatter-value">search</span>"#));
        assert!(html.contains(r#"<span class="markdown-frontmatter-value">youtube transcript</span>"#));
    }

    #[test]
    fn markdown_render_extracts_skill_triggers_from_description() {
        let html = render_markdown_as_html_for_file(
            "---\nname: agent-reach\ndescription: >\n  Search and read 17 platforms.\n  Triggers: \"搜推特\", \"youtube transcript\", \"read this link\".\n---\n\n# Agent Reach",
            "/tmp/Example/SKILL.md",
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
        let html = render_markdown_as_html_for_file("---\nname: compact\n---", "SKILL.md");
        assert!(html.contains(r#"<span class="markdown-frontmatter-value">compact</span>"#));
        assert!(!html.contains("<p>---</p>"));
    }

    #[test]
    fn ordinary_markdown_frontmatter_never_renders_as_skill_metadata() {
        let raw = "---\nname: ordinary-report\ndescription: A normal document\ntrigger_keywords: [must, stay, hidden]\n---\n\n# Report\n\nBody";
        let html = render_markdown_as_html_for_file(raw, "review.md");
        assert!(!html.contains("SKILL 元信息"), "{html}");
        assert!(!html.contains("markdown-frontmatter"), "{html}");
        assert!(html.contains("<h1>Report</h1>"), "{html}");
        assert!(!html.contains("ordinary-report"), "{html}");
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
            MarkdownResourceContext::default(),
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
            MarkdownResourceContext::default(),
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
    fn inspector_snapshot_carries_revision_and_rejects_non_markdown() {
        let path = std::env::temp_dir().join("nutbook-inspector-snapshot.md");
        std::fs::write(&path, "# Inspector\n\nbody").expect("write markdown fixture");
        let detail = markdown_detail_for_test(
            path.to_string_lossy().to_string(),
            "nutbook-inspector-snapshot.md",
            None,
        );

        let resource = MarkdownResourceContext {
            origin: "http://127.0.0.1:43199".to_string(),
            root: "/canonical/library".to_string(),
            base_dir: path
                .parent()
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_default(),
        };
        let snapshot = super::load_markdown_inspector_snapshot(&detail, resource.clone())
            .expect("inspector snapshot");
        assert_eq!(snapshot.file_type, "markdown");
        assert_eq!(snapshot.raw, "# Inspector\n\nbody");
        assert_eq!(snapshot.revision, content_hash("# Inspector\n\nbody"));
        assert_eq!(snapshot.file_name, "nutbook-inspector-snapshot.md");
        assert_eq!(
            snapshot.base_dir,
            path.parent().map(|value| value.to_string_lossy().to_string()).unwrap_or_default()
        );
        assert_eq!(snapshot.resource_origin, resource.origin);
        assert_eq!(snapshot.resource_root, resource.root);
        assert_eq!(snapshot.resource_base_dir, resource.base_dir);

        // revision 复核入口必须与 snapshot 同源：同一内容得到同一 hash。
        let revision = super::load_item_content_revision(&detail).expect("revision");
        assert_eq!(revision.revision, snapshot.revision);

        // 外部替换后 revision 必须变化：这是“丢弃旧实例并重读”的判定依据。
        std::fs::write(&path, "# Replaced\n").expect("replace markdown fixture");
        let next = super::load_item_content_revision(&detail).expect("next revision");
        assert_ne!(next.revision, snapshot.revision);

        let _ = std::fs::remove_file(path);

        // 非 Markdown 明确失败：检查视图不得为 HTML 生成第二份内容投影。
        let html_detail = markdown_detail_for_test("/tmp/whatever.html".to_string(), "whatever.html", None);
        let html_detail = crate::models::ItemDetail {
            summary: crate::models::ItemSummary {
                file_type: "html".to_string(),
                ..html_detail.summary
            },
            ..html_detail
        };
        assert!(super::load_markdown_inspector_snapshot(
            &html_detail,
            MarkdownResourceContext::default()
        )
        .is_err());
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
                    source_badges: vec![],
                    tags: vec![],
                    thumbnail: None,
                    snippets: vec![],
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
            MarkdownResourceContext::default(),
        )
        .expect("html payload should build");

        match url {
            crate::models::PreviewPayload::Html(payload) => {
                assert_eq!(payload.preview_url, "http://127.0.0.1:4000/fs/tmp/my%20file.html");
            }
            _ => panic!("expected html payload"),
        }
    }

    // ------------------------------------------------------------------
    // PR C / C0：Markdown 封面图可验收基线
    // 只证明当前行为（comment/图片均为普通正文、无任何封面路径），不实现封面。
    // ------------------------------------------------------------------

    fn card_revision(file_name: &str) -> String {
        let path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/card-revisions")
            .join(file_name);
        std::fs::read_to_string(&path).expect("card-revision fixture must exist")
    }

    #[test]
    fn cover_fixtures_are_readable_by_the_current_render_chain() {
        for file_name in [
            "markdown-cover-image.md",
            "markdown-cover-plain.md",
            "markdown-cover-linked.md",
            "markdown-duplicate-cover.md",
            "markdown-missing-cover.md",
            "markdown-remote-cover.md",
            "markdown-portable-cover.md",
        ] {
            let raw = card_revision(file_name);
            let html = render_markdown_as_html_for_file(&raw, file_name);
            assert!(!html.is_empty(), "{file_name} must render");
        }
    }

    #[test]
    fn canonical_cover_comment_renders_as_plain_escaped_text() {
        // C0 characterization：canonical comment 对当前产品只是普通 HTML comment，
        // 渲染为转义正文文本，不产生任何封面 wrapper/UI。
        let html = render_markdown_as_html("<!-- nutbook-cover -->");
        assert_eq!(html, "<p>&lt;!-- nutbook-cover --&gt;</p>");
    }

    #[test]
    fn cover_image_fixture_keeps_plain_body_image_semantics() {
        let raw = card_revision("markdown-cover-image.md");
        let html = render_markdown_as_html_for_file(&raw, "markdown-cover-image.md");
        // comment 保持普通转义文本。
        assert!(html.contains("&lt;!-- nutbook-cover --&gt;"), "{html}");
        // 普通独立图片块保持 <p><img></p> 语义。
        assert!(
            html.contains(r#"<img src="./assets/cover-landscape.png" alt="Landscape 4:3">"#),
            "{html}"
        );
        // 带链接的独立图片块当前保持普通段落文本语义（不解析、不迁移、不成为封面）。
        assert!(
            html.contains("[![Linked landscape](./assets/cover-landscape.png)](https://example.invalid/album)"),
            "{html}"
        );
        // 安全/不安全 SVG、伪 MIME、超限资源、方图、竖图、极宽图全部只是普通图片行。
        for (src, alt) in [
            ("./assets/cover-landscape.svg", "Safe landscape SVG"),
            ("./assets/cover-unsafe.svg", "Unsafe SVG"),
            ("./assets/cover-fake-mime.png", "Fake MIME"),
            ("./assets/cover-oversized-dimensions.png", "Oversized dimensions"),
            ("./assets/cover-square.png", "Square"),
            ("./assets/cover-portrait.jpg", "Portrait"),
            ("./assets/cover-ultrawide.png", "Ultrawide"),
        ] {
            assert!(
                html.contains(&format!(r#"<img src="{src}" alt="{alt}">"#)),
                "{html}"
            );
        }
        // 当前渲染不出现任何封面专用 UI 标记。
        assert!(!html.contains("nutbook-cover-image"), "{html}");
        assert!(!html.contains("cover-wrapper"), "{html}");
    }

    #[test]
    fn cover_formatted_and_padded_alt_keep_current_plain_image_semantics() {
        // C0 characterization（alt 契约基线）：格式化 alt（emphasis/code/
        // strikethrough）与 padded alt 在当前渲染链路中保持普通正文图片语义，
        // 且 alt 字面被保留——不 trim 边缘空格、不丢失 markdown 标记。
        // C1 的 nutbook-cover 解析器必须允许 pulldown-cmark 在 Image 内产生的
        // emphasis/strong/strikethrough 容器、Code、break 等合法事件并收集纯
        // 文本语义，且不得 trim 最终 alt；本测试钉住当前渲染行为作为基线。
        let raw = card_revision("markdown-cover-image.md");
        let html = render_markdown_as_html_for_file(&raw, "markdown-cover-image.md");
        // 格式化 alt：字面标记保留（当前手写渲染器不做 alt 内 markdown 解析）。
        assert!(
            html.contains(r#"<img src="./assets/cover-landscape.png" alt="Emphasis *bold* alt">"#),
            "{html}"
        );
        assert!(
            html.contains(r#"<img src="./assets/cover-landscape.png" alt="Code `inline` alt">"#),
            "{html}"
        );
        assert!(
            html.contains(r#"<img src="./assets/cover-landscape.png" alt="Strike ~~gone~~ alt">"#),
            "{html}"
        );
        // padded alt：边缘空格保留，不得被 trim。
        assert!(
            html.contains(r#"<img src="./assets/cover-landscape.png" alt="  Padded alt  ">"#),
            "{html}"
        );
        // 仍只是普通正文图片，无任何封面路径。
        assert!(!html.contains("cover-wrapper"), "{html}");
        assert!(!html.contains("nutbook-cover-image"), "{html}");
    }

    #[test]
    fn cover_duplicate_fixture_keeps_both_comments_plain() {
        let raw = card_revision("markdown-duplicate-cover.md");
        let html = render_markdown_as_html_for_file(&raw, "markdown-duplicate-cover.md");
        // 两个独立段落的 comment（fixture 正文中的反引号引用文本不在此计数）。
        assert_eq!(
            html.matches("<p>&lt;!-- nutbook-cover --&gt;</p>").count(),
            2,
            "{html}"
        );
    }

    #[test]
    fn cover_missing_fixture_stays_openable_as_plain_image() {
        let raw = card_revision("markdown-missing-cover.md");
        let html = render_markdown_as_html_for_file(&raw, "markdown-missing-cover.md");
        assert!(
            html.contains(r#"<img src="./assets/does-not-exist.png" alt="Missing asset">"#),
            "{html}"
        );
    }

    #[test]
    fn cover_remote_fixture_keeps_url_as_plain_image() {
        let raw = card_revision("markdown-remote-cover.md");
        let html = render_markdown_as_html_for_file(&raw, "markdown-remote-cover.md");
        // http/https URL 保持普通 <img src> 语法；当前无远程封面路径。
        assert!(
            html.contains(
                r#"<img src="https://example.invalid/covers/landscape-16x9.png" alt="Remote landscape">"#
            ),
            "{html}"
        );
    }

    #[test]
    fn cover_portable_fixture_renders_as_plain_body_image_blocks() {
        let raw = card_revision("markdown-portable-cover.md");
        let html = render_markdown_as_html_for_file(&raw, "markdown-portable-cover.md");
        assert!(html.contains(r#"<p align="center">"#), "{html}");
        assert!(
            html.contains(
                r#"<img src="./assets/cover-landscape.png" alt="Portable centered landscape" width="480">"#
            ),
            "{html}"
        );
        assert!(html.contains(r#"<p align="right">"#), "{html}");
        assert!(
            html.contains(r#"href="https://example.invalid/album" title="Open album">"#),
            "{html}"
        );
        assert!(
            html.contains(
                r#"<img src="./assets/cover-landscape.png" alt="Linked portable landscape" width="320">"#
            ),
            "{html}"
        );
        assert!(!html.contains("cover-wrapper"), "{html}");
    }

    #[test]
    fn cover_assets_are_present_with_expected_mime_dimensions_and_safety() {
        // C0 资产完整性（窄 fixture 检查）：渲染链路不读取图片字节，因此必须
        // 直接验证真实文件存在、magic MIME、像素尺寸/比例与 SVG 风险语料。
        // 负面样本遵循「一次只错一个条件」：伪 MIME 仅扩展名与 magic 不一致
        // （比例合法 16:9），超限图仅像素尺寸超限（比例合法 16:9）。
        let assets_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/card-revisions/assets");

        for name in [
            "cover-landscape.png",
            "cover-landscape.svg",
            "cover-unsafe.svg",
            "cover-portrait.jpg",
            "cover-square.png",
            "cover-ultrawide.png",
            "cover-fake-mime.png",
            "cover-oversized-dimensions.png",
        ] {
            assert!(assets_dir.join(name).is_file(), "{name} must exist");
        }

        // PNG：magic 签名 + IHDR 宽高。
        let png_dimensions = |name: &str| -> (u32, u32) {
            let bytes = std::fs::read(assets_dir.join(name)).expect("read png");
            assert_eq!(&bytes[..8], b"\x89PNG\r\n\x1a\n", "{name} must be a real PNG");
            let width = u32::from_be_bytes(bytes[16..20].try_into().unwrap());
            let height = u32::from_be_bytes(bytes[20..24].try_into().unwrap());
            (width, height)
        };
        // JPEG：magic + SOF 段宽高（JPEG 中高在前、宽在后）。
        let jpeg_dimensions = |name: &str| -> (u32, u32) {
            let bytes = std::fs::read(assets_dir.join(name)).expect("read jpeg");
            assert_eq!(&bytes[..3], b"\xFF\xD8\xFF", "{name} must be a real JPEG");
            let mut cursor = 2usize;
            loop {
                assert!(bytes[cursor] == 0xFF, "{name}: expected marker");
                let marker = bytes[cursor + 1];
                let is_sof = (0xC0..=0xCF).contains(&marker)
                    && !matches!(marker, 0xC4 | 0xC8 | 0xCC);
                if is_sof {
                    let height = u16::from_be_bytes(bytes[cursor + 5..cursor + 7].try_into().unwrap());
                    let width = u16::from_be_bytes(bytes[cursor + 7..cursor + 9].try_into().unwrap());
                    return (width as u32, height as u32);
                }
                let length =
                    u16::from_be_bytes(bytes[cursor + 2..cursor + 4].try_into().unwrap()) as usize;
                cursor += 2 + length;
            }
        };
        let svg_text = |name: &str| -> String {
            std::fs::read_to_string(assets_dir.join(name)).expect("read svg")
        };

        // 比例/尺寸契约。
        assert_eq!(
            png_dimensions("cover-landscape.png"),
            (640, 480),
            "landscape PNG must be the 4:3 legal boundary"
        );
        assert_eq!(png_dimensions("cover-square.png"), (256, 256));
        let ultrawide = png_dimensions("cover-ultrawide.png");
        assert!(
            ultrawide.0 as f64 / ultrawide.1 as f64 > 2.0,
            "ultrawide must exceed 2:1"
        );
        let oversized = png_dimensions("cover-oversized-dimensions.png");
        assert_eq!(
            oversized,
            (4608, 2592),
            "oversized must keep the 16:9 legal aspect"
        );
        assert!(
            oversized.0 > 4096 && oversized.1 > 2048,
            "oversized must exceed common pixel limits without being a decompression bomb"
        );
        // 伪 MIME：扩展名 .png、magic 是 JPEG、比例合法（16:9）。
        assert_eq!(
            jpeg_dimensions("cover-fake-mime.png"),
            (640, 360),
            "fake MIME must be 16:9 JPEG bytes behind a .png extension"
        );
        assert_eq!(jpeg_dimensions("cover-portrait.jpg"), (360, 640));

        // 安全 SVG：禁止脚本/foreignObject/外部资源/动态字体。
        let safe_svg = svg_text("cover-landscape.svg");
        assert!(safe_svg.contains("<svg"), "safe svg must be an svg document");
        for risk in ["<script", "foreignObject", "@import", "@font-face", "<image", "href=\"http"] {
            assert!(!safe_svg.contains(risk), "safe svg must not contain {risk}");
        }
        // 不安全 SVG：必须包含全部四类风险语料。
        let unsafe_svg = svg_text("cover-unsafe.svg");
        for risk in [
            "<script",
            "foreignObject",
            "@import",
            "@font-face",
            "href=\"https://evil.example",
        ] {
            assert!(unsafe_svg.contains(risk), "unsafe svg must contain {risk}");
        }
    }
}
