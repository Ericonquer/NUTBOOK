use comrak::{markdown_to_html, ComrakOptions};

use crate::core::document::{portable_image_html_candidate, sanitize_portable_image_html};

pub fn render_markdown_html(raw: &str) -> String {
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
    let mut rendered = markdown_to_html(&prepared, &markdown_options());
    for (token, html) in replacements {
        rendered = rendered.replace(&format!("<p>{token}</p>"), &html);
    }
    rendered
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
