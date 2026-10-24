use comrak::{parse_document, format_html, Arena, ComrakOptions, nodes::{AstNode, NodeValue}};

use crate::core::document::{aligned_text_html_candidate, aligned_text_markdown, portable_image_html_candidate, sanitize_portable_image_html};

pub fn render_markdown_html(raw: &str) -> String {
    render_markdown(raw, false)
}

pub fn render_formatting_html(raw: &str) -> String {
    render_markdown(raw, true)
}

fn render_markdown(raw: &str, preserve_alignment: bool) -> String {
    let lines = raw.lines().collect::<Vec<_>>();
    let mut prepared = String::new();
    let mut replacements = Vec::new();
    let mut index = 0;
    let mut fence: Option<(char, usize)> = None;
    while index < lines.len() {
        let line = lines[index];
        let trimmed = line.trim_start();
        let marker = trimmed.chars().next().unwrap_or(' ');
        let marker_count = trimmed.chars().take_while(|ch| *ch == marker).count();
        if let Some((active, count)) = fence {
            if marker == active && marker_count >= count && trimmed.chars().skip(marker_count).all(char::is_whitespace) {
                fence = None;
            }
        } else if (marker == '`' || marker == '~') && marker_count >= 3 {
            fence = Some((marker, marker_count));
        }
        if fence.is_none() && !line.starts_with("    ") && !line.starts_with('\t') {
            if preserve_alignment {
                if let Some((candidate, consumed)) = aligned_text_html_candidate(&lines, index) {
                    if let Some((alignment, inner)) = aligned_text_markdown(&candidate) {
                        let mut token = format!("NUTBOOKALIGNEDTEXTBLOCK{}END", replacements.len());
                        while raw.contains(&token) { token.push('X'); }
                        prepared.push_str(&format!("\n\n{token}\n\n"));
                        replacements.push((token, format!("<div align=\"{alignment}\">{}</div>", render_markdown_html(&inner))));
                        index += consumed;
                        continue;
                    }
                }
            }
            if let Some((candidate, consumed)) = portable_image_html_candidate(&lines, index) {
                if let Some(html) = sanitize_portable_image_html(&candidate) {
                    let mut token = format!("NUTBOOKPORTABLEIMAGEBLOCK{}END", replacements.len());
                    while raw.contains(&token) {
                        token.push('X');
                    }
                    prepared.push_str("\n\n");
                    prepared.push_str(&token);
                    prepared.push_str("\n\n");
                    replacements.push((token, html));
                    index += consumed;
                    continue;
                }
            }
        }
        prepared.push_str(line);
        prepared.push('\n');
        index += 1;
    }
    let arena = Arena::new();
    let options = markdown_options();
    let document = parse_document(&arena, &prepared, &options);
    repair_inline_compatibility(&arena, document, &prepared);
    let mut html = Vec::new();
    format_html(document, &options, &mut html).expect("rendering into memory");
    let mut rendered = String::from_utf8(html).expect("Markdown HTML is UTF-8");
    for (token, html) in replacements {
        rendered = rendered.replace(&format!("<p>{token}</p>"), &html);
    }
    rendered
}

// Operate on parsed nodes: code and escaped literal examples never become HTML.
fn repair_inline_compatibility<'a>(arena: &'a Arena<AstNode<'a>>, document: &'a AstNode<'a>, source: &str) {
    let mut line_offsets = vec![0];
    for (index, byte) in source.bytes().enumerate() { if byte == b'\n' { line_offsets.push(index + 1); } }
    for node in document.descendants().collect::<Vec<_>>() {
        let value = node.data.borrow().value.clone();
        match value {
            NodeValue::HtmlInline(ref html) if plain_break(html) => {
                node.data.borrow_mut().value = NodeValue::LineBreak;
            }
            NodeValue::HtmlBlock(ref html) if plain_break(&html.literal) => {
                node.data.borrow_mut().value = NodeValue::Paragraph;
                node.append(arena.alloc(AstNode::from(NodeValue::LineBreak)));
            }
            NodeValue::Link(_) => {
                let (Some(before), Some(after)) = (node.previous_sibling(), node.next_sibling()) else { continue; };
                let (NodeValue::Text(prefix), NodeValue::Text(suffix)) = (before.data.borrow().value.clone(), after.data.borrow().value.clone()) else { continue; };
                if !prefix.ends_with("**") || !suffix.starts_with("**") { continue; }
                let position = node.data.borrow().sourcepos;
                let (Some(start_line), Some(end_line)) = (position.start.line.checked_sub(1).and_then(|i| line_offsets.get(i)), position.end.line.checked_sub(1).and_then(|i| line_offsets.get(i))) else { continue; };
                let start = start_line + position.start.column.saturating_sub(1);
                let end = end_line + position.end.column;
                if start < 2 || source.get(start - 2..start) != Some("**") || source.get(end..end + 2) != Some("**") { continue; }
                if start.checked_sub(3).and_then(|i| source.as_bytes().get(i)).is_some_and(|b| *b == b'*') || source.as_bytes().get(end + 2) == Some(&b'*') { continue; }
                let escapes = source[..start - 2].bytes().rev().take_while(|b| *b == b'\\').count();
                if escapes % 2 != 0 { continue; }
                before.data.borrow_mut().value = NodeValue::Text(prefix[..prefix.len() - 2].into());
                after.data.borrow_mut().value = NodeValue::Text(suffix[2..].into());
                let strong = arena.alloc(AstNode::from(NodeValue::Strong));
                node.insert_before(strong); strong.append(node);
            }
            _ => {}
        }
    }
}

fn plain_break(html: &str) -> bool {
    matches!(html.trim().to_ascii_lowercase().as_str(), "<br>" | "<br/>" | "<br />" | "<br >")
}

fn markdown_options() -> ComrakOptions<'static> {
    let mut options = ComrakOptions::default();
    options.extension.table = true;
    options.extension.strikethrough = true;
    options.extension.tasklist = true;
    options.extension.autolink = true;
    options.render.unsafe_ = false;
    options.render.escape = true;
    options
}

#[cfg(test)]
mod tests {
    use super::render_markdown_html;

    #[test]
    fn bold_links_next_to_chinese_hide_only_real_markers() {
        for source in [
            "叫**[NUTBOOK](https://example.com)**的软件",
            "叫[**NUTBOOK**](https://example.com)的软件",
            "**[NUTBOOK](https://example.com)**软件",
            "叫**[NUTBOOK][app]**的软件\n\n[app]: https://example.com",
        ] {
            for html in [render_markdown_html(source), super::render_formatting_html(source)] {
                assert!(html.contains("<strong>"), "{source}: {html}");
                assert!(html.contains("href=\"https://example.com\""), "{source}: {html}");
                assert!(!html.contains("**"), "{source}: {html}");
            }
        }
        for source in [r"叫\*\*[NUTBOOK](https://example.com)\*\*的软件", "`**[NUTBOOK](https://example.com)**`", "```md\n**[NUTBOOK](https://example.com)**\n```", "叫&#42;&#42;[NUTBOOK](https://example.com)&#42;&#42;的软件"] {
            let html = super::render_formatting_html(source);
            assert!(html.contains("**"), "literal example changed: {source}: {html}");
            assert!(!html.contains("<strong>"), "literal example changed: {source}: {html}");
        }
    }

    #[test]
    fn editor_empty_lines_and_hard_breaks_never_render_as_tags() {
        let source = "前段\n\n<br />\n\n**尾段**\n\n行内<br>换行";
        for html in [render_markdown_html(source), super::render_formatting_html(source)] {
            assert!(html.contains("<br"), "{html}");
            assert!(!html.contains("&lt;br"), "{html}");
            assert!(html.contains("<strong>尾段</strong>"), "{html}");
        }
        for source in ["`<br />`", "```html\n<br />\n```", r"\<br />", "<br onclick=\"alert(1)\">", "<script>alert(1)</script>"] {
            let html = super::render_formatting_html(source);
            assert!(html.contains("&lt;"), "unsafe or literal HTML changed: {source}: {html}");
        }
    }

    #[test]
    fn renders_gfm_tables_tasks_and_strikethrough() {
        let html = render_markdown_html(
            "| A | B |\n| - | - |\n| 1 | 2 |\n\n- [x] done\n\n~~removed~~",
        );

        assert!(html.contains("<table>"));
        assert!(html.contains("checkbox"));
        assert!(html.contains("<del>removed</del>"));
    }

    #[test]
    fn escapes_raw_html_by_default() {
        let html = render_markdown_html("<script>alert(1)</script>");

        assert!(html.contains("&lt;script&gt;alert(1)&lt;/script&gt;"));
        assert!(!html.contains("<script>"));
    }

    #[test]
    fn preserves_only_valid_portable_images_outside_code_fences() {
        let html = render_markdown_html("<p align=\"center\"><img src=\"./assets/figure.png\" alt=\"Figure\" width=\"480\"></p>\n\n```html\n<img src=\"inside.png\">\n```\n\n    <img src=\"indented.png\">\n\n<script>alert(1)</script>");
        assert!(html.contains("<img src=\"./assets/figure.png\""));
        assert!(html.contains("&lt;img src=&quot;inside.png&quot;&gt;"));
        assert!(html.contains("&lt;img src=&quot;indented.png&quot;&gt;"));
        assert!(html.contains("&lt;script&gt;alert(1)&lt;/script&gt;"));
    }
}

#[cfg(test)]
mod alignment_tests {
    use super::*;
    #[test]
    fn formatting_preserves_controlled_alignment_and_inline_marks() {
        let source = "<div align=\"center\">\n\n*caption* and **bold**\n\n</div>";
        let html = render_formatting_html(source);
        assert!(html.contains("<div align=\"center\"><p><em>caption</em> and <strong>bold</strong></p>"));
        assert!(render_markdown_html(source).contains("&lt;div"));
        assert!(render_formatting_html(&format!("```html\n{source}\n```" )).contains("&lt;div"));
        assert!(render_formatting_html("<div align=\"center\" onclick=\"bad()\">\n\ncaption\n\n</div>").contains("&lt;div"));
    }
}
