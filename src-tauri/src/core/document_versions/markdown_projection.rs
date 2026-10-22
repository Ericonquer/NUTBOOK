//! Lossless source-token relocation for Markdown history projections.
//! Parser spans select real image nodes / reference definitions; a small URL
//! token lexer works only inside those spans. No rendered DOM or global replace.
use super::{HistoryError, Result};
use crate::core::document::validate_portable_image_html_structure;
use pulldown_cmark::{Event, LinkType, Options, Parser, Tag};
use std::{collections::BTreeMap, ops::Range};
fn unsupported(message: &str) -> HistoryError {
    HistoryError::Invalid(format!("Markdown relocation: {message}"))
}
fn whitespace(bytes: &[u8], cursor: &mut usize) {
    while bytes.get(*cursor).is_some_and(u8::is_ascii_whitespace) {
        *cursor += 1;
    }
}
fn close_label(bytes: &[u8], cursor: &mut usize) -> Result<()> {
    if bytes.get(*cursor) != Some(&b'[') {
        return Err(unsupported("missing label"));
    }
    let mut depth = 1usize;
    *cursor += 1;
    while *cursor < bytes.len() {
        match bytes[*cursor] {
            b'\\' => {
                *cursor += 2;
                continue;
            }
            b'[' => depth += 1,
            b']' => {
                depth -= 1;
                if depth == 0 {
                    *cursor += 1;
                    return Ok(());
                }
            }
            _ => {}
        }
        *cursor += 1;
    }
    Err(unsupported("unterminated image label"))
}
fn destination(bytes: &[u8], cursor: &mut usize) -> Result<Range<usize>> {
    whitespace(bytes, cursor);
    if bytes.get(*cursor) == Some(&b'<') {
        *cursor += 1;
        let start = *cursor;
        while *cursor < bytes.len() {
            match bytes[*cursor] {
                b'\\' => {
                    *cursor += 2;
                    continue;
                }
                b'>' => return Ok(start..*cursor),
                _ => *cursor += 1,
            }
        }
        return Err(unsupported("unterminated angle URL"));
    }
    let start = *cursor;
    let mut depth = 0usize;
    while *cursor < bytes.len() {
        match bytes[*cursor] {
            b'\\' => {
                *cursor += 2;
                continue;
            }
            b'(' => depth += 1,
            b')' if depth == 0 => break,
            b')' => depth -= 1,
            byte if byte.is_ascii_whitespace() => break,
            _ => {}
        }
        *cursor += 1;
    }
    Ok(start..*cursor)
}
fn inline_destination(source: &str) -> Result<Range<usize>> {
    let bytes = source.as_bytes();
    let mut cursor = usize::from(bytes.first() == Some(&b'!'));
    close_label(bytes, &mut cursor)?;
    if bytes.get(cursor) != Some(&b'(') {
        return Err(unsupported("unsupported inline image syntax"));
    }
    cursor += 1;
    destination(bytes, &mut cursor)
}
fn definition_destination(source: &str) -> Result<Range<usize>> {
    let bytes = source.as_bytes();
    let mut cursor = 0;
    whitespace(bytes, &mut cursor);
    close_label(bytes, &mut cursor)?;
    if bytes.get(cursor) != Some(&b':') {
        return Err(unsupported("unsupported image definition"));
    }
    cursor += 1;
    destination(bytes, &mut cursor)
}
fn html_src_tokens(source: &str) -> Result<Vec<(String, Range<usize>)>> {
    if !validate_portable_image_html_structure(source.trim()) {
        return Err(unsupported("raw HTML is outside the portable whitelist"));
    }
    let bytes = source.as_bytes();
    let mut cursor = 0;
    let mut result = Vec::new();
    while cursor < bytes.len() {
        if bytes[cursor] != b'<' {
            cursor += 1;
            continue;
        }
        cursor += 1;
        if bytes.get(cursor) == Some(&b'/') {
            cursor += 1;
        }
        while bytes
            .get(cursor)
            .is_some_and(|b| b.is_ascii_alphanumeric() || *b == b'-')
        {
            cursor += 1;
        }
        loop {
            whitespace(bytes, &mut cursor);
            match bytes.get(cursor) {
                Some(b'>') => {
                    cursor += 1;
                    break;
                }
                Some(b'/') => {
                    cursor += 2;
                    break;
                }
                None => return Err(unsupported("unterminated HTML")),
                _ => {}
            }
            let start = cursor;
            while bytes
                .get(cursor)
                .is_some_and(|b| b.is_ascii_alphanumeric() || [b'-', b'_', b':'].contains(b))
            {
                cursor += 1;
            }
            let name = source[start..cursor].to_ascii_lowercase();
            if cursor == start {
                return Err(unsupported("HTML attribute"));
            }
            whitespace(bytes, &mut cursor);
            if bytes.get(cursor) != Some(&b'=') {
                return Err(unsupported("HTML value"));
            }
            cursor += 1;
            whitespace(bytes, &mut cursor);
            let quote = *bytes.get(cursor).ok_or_else(|| unsupported("HTML quote"))?;
            if quote != b'\'' && quote != b'"' {
                return Err(unsupported("unquoted HTML"));
            }
            cursor += 1;
            let value = cursor;
            while bytes.get(cursor).is_some_and(|b| *b != quote) {
                cursor += 1;
            }
            if bytes.get(cursor) != Some(&quote) {
                return Err(unsupported("HTML quote"));
            }
            if name == "src" {
                result.push((source[value..cursor].to_owned(), value..cursor));
            }
            cursor += 1;
        }
    }
    Ok(result)
}
/// Replacement URLs must be generated relative URLs without syntax delimiters.
/// This deliberately refuses arbitrary user-provided text as a path fragment.
pub fn relocate_markdown(source: &str, replacements: &BTreeMap<String, String>) -> Result<String> {
    if replacements.values().any(|s| {
        s.is_empty()
            || s.bytes().any(|b| {
                b.is_ascii_whitespace()
                    || [b'"', b'\'', b'<', b'>', b'(', b')', b'\\', b'&'].contains(&b)
            })
    }) {
        return Err(unsupported("unsafe generated URL"));
    }
    let parser = Parser::new_ext(source, Options::all());
    let definition_parser = Parser::new_ext(source, Options::all());
    let mut edits: BTreeMap<(usize, usize), String> = BTreeMap::new();
    for (event, span) in parser.into_offset_iter() {
        match event {
            Event::Start(Tag::Image {
                link_type,
                dest_url,
                id,
                ..
            }) => {
                let Some(replacement) = replacements.get(dest_url.as_ref()) else {
                    continue;
                };
                let token = if link_type == LinkType::Inline {
                    let token = inline_destination(&source[span.clone()])?;
                    (span.start + token.start)..(span.start + token.end)
                } else {
                    let def = definition_parser
                        .reference_definitions()
                        .get(&id)
                        .ok_or_else(|| unsupported("unresolved image reference"))?;
                    let token = definition_destination(&source[def.span.clone()])?;
                    (def.span.start + token.start)..(def.span.start + token.end)
                };
                edits.insert((token.start, token.end), replacement.clone());
            }
            Event::Html(raw) | Event::InlineHtml(raw) if raw.contains("src") => {
                for (reference, token) in html_src_tokens(&raw)? {
                    if let Some(replacement) = replacements.get(&reference) {
                        edits.insert(
                            (span.start + token.start, span.start + token.end),
                            replacement.clone(),
                        );
                    }
                }
            }
            _ => {}
        }
    }
    let mut result = source.to_owned();
    let mut previous = source.len();
    for ((start, end), replacement) in edits.into_iter().rev() {
        if start > end
            || end > previous
            || !source.is_char_boundary(start)
            || !source.is_char_boundary(end)
        {
            return Err(unsupported("overlapping source spans"));
        }
        result.replace_range(start..end, &replacement);
        previous = start;
    }
    Ok(result)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rewrites_only_image_url_tokens_and_used_reference_definition() {
        let source="# 标题\r\n\r\n<!-- nutbook-cover -->\r\n![a \\] b](<image%20one.svg> 'keep title')\r\n\r\n![ref][FOO]\r\n\r\n[foo]: image%20one.svg \"引用标题\"\r\n\r\nimage%20one.svg\r\n\r\n```md\r\n![code](image%20one.svg)\r\n```\r\n";
        let map = BTreeMap::from([(
            "image%20one.svg".into(),
            ".nutbook-restored-test/image.svg".into(),
        )]);
        let rewritten = relocate_markdown(source, &map).unwrap();
        assert_eq!(
            rewritten,
            source
                .replacen("<image%20one.svg>", "<.nutbook-restored-test/image.svg>", 1)
                .replacen(
                    "[foo]: image%20one.svg",
                    "[foo]: .nutbook-restored-test/image.svg",
                    1
                )
        );
        assert_eq!(relocate_markdown(&rewritten, &map).unwrap(), rewritten);
    }
    #[test]
    fn portable_attributes_alt_alignment_links_and_marker_are_preserved() {
        let source="<!-- nutbook-cover -->\n\n<p align=\"center\"><a href=\"https://example.com\"><img src='image.svg' alt='image.svg' width=\"120\"></a></p>\n";
        let map = BTreeMap::from([(
            "image.svg".into(),
            ".nutbook-restored-test/image.svg".into(),
        )]);
        assert_eq!(
            relocate_markdown(source, &map).unwrap(),
            source.replacen(
                "src='image.svg'",
                "src='.nutbook-restored-test/image.svg'",
                1
            )
        );
        assert!(relocate_markdown("<img src=\"image.svg\" onerror=\"alert(1)\">", &map).is_err());
        assert!(relocate_markdown(
            source,
            &BTreeMap::from([("image.svg".into(), "bad\"path".into())])
        )
        .is_err());
    }
}
