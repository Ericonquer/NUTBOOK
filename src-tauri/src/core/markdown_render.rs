use comrak::{markdown_to_html, ComrakOptions};

pub fn render_markdown_html(raw: &str) -> String {
    markdown_to_html(raw, &markdown_options())
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
}
