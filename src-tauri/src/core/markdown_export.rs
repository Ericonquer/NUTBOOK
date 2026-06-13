use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{core::markdown_render::render_markdown_html, errors::AppError};

pub const READING_TEMPLATE: &str = "reading";
pub const READING_LIGHT_TEMPLATE: &str = "reading-light";
pub const READING_DARK_TEMPLATE: &str = "reading-dark";
const MAX_SINGLE_IMAGE_BYTES: u64 = 10 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES: u64 = 50 * 1024 * 1024;
const FALLBACK_READING_TEMPLATE: &str = include_str!("../../resources/export-templates/markdown-reading.html");
const FALLBACK_READING_LIGHT_TEMPLATE: &str = include_str!("../../resources/export-templates/markdown-reading-light.html");
const FALLBACK_READING_DARK_TEMPLATE: &str = include_str!("../../resources/export-templates/markdown-reading-dark.html");
const NUTBOOK_LOGO_BYTES: &[u8] = include_bytes!("../../../nutbook-logo.png");

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReadingWidth {
    Compact,
    Standard,
    Wide,
}

impl ReadingWidth {
    fn css_width(self) -> &'static str {
        match self {
            Self::Compact => "760px",
            Self::Standard => "880px",
            Self::Wide => "1040px",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MarkdownHtmlExportPreferences {
    pub embed_images: bool,
    pub code_copy: bool,
    pub outline: bool,
    pub width: ReadingWidth,
}

impl Default for MarkdownHtmlExportPreferences {
    fn default() -> Self {
        Self {
            embed_images: true,
            code_copy: true,
            outline: true,
            width: ReadingWidth::Standard,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MarkdownHtmlExportInput {
    pub title: String,
    pub source_file: String,
    pub source_path: PathBuf,
    pub markdown: String,
    pub generated_at: String,
    pub template_html: String,
    pub preferences: MarkdownHtmlExportPreferences,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MarkdownHtmlExportOutput {
    pub html: String,
    pub warnings: Vec<String>,
}

pub fn default_markdown_html_file_name(source_file: &str) -> String {
    let path = Path::new(source_file);
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("markdown");
    format!("{stem}.html")
}

pub fn fallback_reading_template() -> &'static str {
    FALLBACK_READING_TEMPLATE
}

pub fn fallback_reading_light_template() -> &'static str {
    FALLBACK_READING_LIGHT_TEMPLATE
}

pub fn fallback_reading_dark_template() -> &'static str {
    FALLBACK_READING_DARK_TEMPLATE
}

pub fn render_reading_html(input: MarkdownHtmlExportInput) -> Result<MarkdownHtmlExportOutput, AppError> {
    if input.template_html.trim().is_empty() {
        return Err(AppError::InvalidParams);
    }

    let rendered = add_heading_ids(&render_markdown_html(&input.markdown), &input.markdown);
    if rendered.trim().is_empty() {
        return Err(AppError::InvalidParams);
    }

    let source_dir = input
        .source_path
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(PathBuf::new);
    let mut embedder = ImageEmbedder::new(source_dir);
    let outline_html = if input.preferences.outline {
        render_outline(&input.markdown)
    } else {
        String::new()
    };
    let content = if input.preferences.embed_images {
        embedder.embed_images(&rendered)
    } else {
        rendered
    };
    let warnings_html = render_warnings(&embedder.warnings);

    let html = input
        .template_html
        .replace("{{title}}", &escape_html_text(&input.title))
        .replace("{{content}}", &content)
        .replace("{{outline}}", &outline_html)
        .replace("{{outline_columns}}", if outline_html.is_empty() { "1fr" } else { "180px minmax(0, 1fr)" })
        .replace("{{page_width}}", input.preferences.width.css_width())
        .replace("{{code_copy_styles}}", if input.preferences.code_copy { CODE_COPY_STYLES } else { "" })
        .replace("{{code_copy_script}}", if input.preferences.code_copy { CODE_COPY_SCRIPT } else { "" })
        .replace("{{generated_at}}", &escape_html_text(&input.generated_at))
        .replace("{{source_file}}", &escape_html_text(&input.source_file))
        .replace("{{logo_data_uri}}", &nutbook_logo_data_uri())
        .replace("{{warnings}}", &warnings_html);

    Ok(MarkdownHtmlExportOutput {
        html,
        warnings: embedder.warnings,
    })
}

const CODE_COPY_STYLES: &str = r#"
    .code-copy-button { position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 8px; background: rgba(255,255,255,0.1); color: rgba(240,240,242,0.76); cursor: pointer; }
    .code-copy-button:hover { color: #f0f0f2; background: rgba(255,255,255,0.16); }
    .code-copy-button.copied { color: #f0f0f2; background: rgba(255,255,255,0.18); }
    .code-copy-button.failed { color: #f0f0f2; background: rgba(186,26,26,0.55); }
    .code-copy-icon { display: block; width: 16px; height: 16px; pointer-events: none; }
    .code-copy-tooltip { position: absolute; top: 11px; right: 48px; min-height: 28px; padding: 0 10px; display: inline-flex; align-items: center; border-radius: 8px; background: rgba(24,24,28,0.94); color: #f0f0f2; font-size: 12px; font-weight: 700; line-height: 1; pointer-events: none; opacity: 0; transform: translateX(4px); transition: opacity 140ms ease, transform 140ms ease; }
    .code-copy-tooltip.visible,
    .code-copy-button:hover + .code-copy-tooltip,
    .code-copy-button:focus-visible + .code-copy-tooltip { opacity: 1; transform: translateX(0); }
    .code-copy-tooltip.success { background: #1a1c1d; }
    .code-copy-tooltip.failed { background: #ba1a1a; }
"#;

const CODE_COPY_SCRIPT: &str = r#"<script>
    (() => {
      async function copyText(text) {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          return;
        }
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      document.querySelectorAll("pre").forEach((pre) => {
        if (pre.querySelector("[data-copy-code]")) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "code-copy-button";
        button.dataset.copyCode = "true";
        button.setAttribute("aria-label", "复制代码");
        button.title = "复制代码";
        button.innerHTML = '<svg class="code-copy-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>';
        const tooltip = document.createElement("span");
        tooltip.className = "code-copy-tooltip";
        tooltip.dataset.copyTooltip = "true";
        tooltip.textContent = "复制代码";
        const resetButton = () => {
          button.classList.remove("copied", "failed");
          button.setAttribute("aria-label", "复制代码");
          button.title = "复制代码";
          tooltip.classList.remove("visible", "success", "failed");
          tooltip.textContent = "复制代码";
        };
        button.addEventListener("click", async () => {
          try {
            await copyText(pre.innerText || pre.textContent || "");
            button.classList.remove("failed");
            button.classList.add("copied");
            button.setAttribute("aria-label", "已复制");
            button.title = "已复制";
            tooltip.textContent = "复制成功";
            tooltip.classList.remove("failed");
            tooltip.classList.add("visible", "success");
            window.setTimeout(() => resetButton(), 900);
          } catch (_) {
            button.classList.remove("copied");
            button.classList.add("failed");
            button.setAttribute("aria-label", "复制失败");
            button.title = "复制失败";
            tooltip.textContent = "复制失败";
            tooltip.classList.remove("success");
            tooltip.classList.add("visible", "failed");
            window.setTimeout(() => resetButton(), 900);
          }
        });
        pre.appendChild(button);
        pre.appendChild(tooltip);
      });
    })();
  </script>"#;

struct ImageEmbedder {
    source_dir: PathBuf,
    total_bytes: u64,
    warnings: Vec<String>,
}

impl ImageEmbedder {
    fn new(source_dir: PathBuf) -> Self {
        Self {
            source_dir,
            total_bytes: 0,
            warnings: Vec::new(),
        }
    }

    fn embed_images(&mut self, html: &str) -> String {
        let mut output = String::with_capacity(html.len());
        let mut rest = html;

        while let Some(img_start) = rest.find("<img ") {
            output.push_str(&rest[..img_start]);
            let after_start = &rest[img_start..];
            let Some(tag_end) = after_start.find('>') else {
                output.push_str(after_start);
                return output;
            };
            let tag = &after_start[..=tag_end];
            output.push_str(&self.embed_image_tag(tag));
            rest = &after_start[tag_end + 1..];
        }

        output.push_str(rest);
        output
    }

    fn embed_image_tag(&mut self, tag: &str) -> String {
        let Some(src) = html_attr(tag, "src") else {
            return tag.to_string();
        };
        if src.starts_with("data:") || src.starts_with("http://") || src.starts_with("https://") {
            return tag.to_string();
        }

        let image_path = if Path::new(&src).is_absolute() {
            PathBuf::from(&src)
        } else {
            self.source_dir.join(&src)
        };

        match self.image_data_uri(&image_path) {
            Ok(data_uri) => replace_html_attr(tag, "src", &data_uri),
            Err(warning) => {
                self.warnings.push(warning);
                image_placeholder(tag, &src)
            }
        }
    }

    fn image_data_uri(&mut self, path: &Path) -> Result<String, String> {
        let mime = image_mime(path).ok_or_else(|| format!("图片格式不支持：{}", path.display()))?;
        let metadata = fs::metadata(path).map_err(|_| format!("图片无法读取：{}", path.display()))?;
        if !metadata.is_file() {
            return Err(format!("图片无法读取：{}", path.display()));
        }
        let len = metadata.len();
        if len > MAX_SINGLE_IMAGE_BYTES {
            return Err(format!("图片超过 10 MB：{}", path.display()));
        }
        if self.total_bytes.saturating_add(len) > MAX_TOTAL_IMAGE_BYTES {
            return Err(format!("图片总大小超过 50 MB：{}", path.display()));
        }
        let bytes = fs::read(path).map_err(|_| format!("图片无法读取：{}", path.display()))?;
        self.total_bytes += len;
        Ok(format!("data:{mime};base64,{}", base64_encode(&bytes)))
    }
}

fn image_mime(path: &Path) -> Option<&'static str> {
    match path.extension()?.to_str()?.to_ascii_lowercase().as_str() {
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "gif" => Some("image/gif"),
        "webp" => Some("image/webp"),
        "svg" => Some("image/svg+xml"),
        _ => None,
    }
}

fn html_attr(tag: &str, name: &str) -> Option<String> {
    let needle = format!("{name}=\"");
    let start = tag.find(&needle)? + needle.len();
    let end = tag[start..].find('"')? + start;
    Some(tag[start..end].to_string())
}

fn replace_html_attr(tag: &str, name: &str, value: &str) -> String {
    let needle = format!("{name}=\"");
    let Some(start) = tag.find(&needle).map(|index| index + needle.len()) else {
        return tag.to_string();
    };
    let Some(end) = tag[start..].find('"').map(|index| start + index) else {
        return tag.to_string();
    };
    format!("{}{}{}", &tag[..start], escape_html_attr(value), &tag[end..])
}

fn image_placeholder(tag: &str, src: &str) -> String {
    let alt = html_attr(tag, "alt").unwrap_or_default();
    format!(
        r#"<span class="missing-image" data-src="{}">图片未能内嵌：{}</span>"#,
        escape_html_attr(src),
        escape_html_text(&alt)
    )
}

fn render_outline(markdown: &str) -> String {
    let items = markdown
        .lines()
        .filter_map(markdown_heading)
        .map(|(level, title)| {
            let id = heading_id(&title);
            format!(
                r##"<a class="depth-{level}" href="#{}">{}</a>"##,
                escape_html_attr(&id),
                escape_html_text(&title)
            )
        })
        .collect::<Vec<_>>();
    if items.is_empty() {
        return String::new();
    }
    format!(
        r#"<nav class="export-outline" aria-label="文档大纲"><p class="export-outline-title">文档大纲</p>{}</nav>"#,
        items.join("")
    )
}

fn add_heading_ids(html: &str, markdown: &str) -> String {
    let mut output = html.to_string();
    for (level, title) in markdown.lines().filter_map(markdown_heading) {
        let id = heading_id(&title);
        let open = format!("<h{level}>");
        let with_id = format!(r#"<h{level} id="{}">"#, escape_html_attr(&id));
        output = output.replacen(&open, &with_id, 1);
    }
    output
}

fn markdown_heading(line: &str) -> Option<(u8, String)> {
    let trimmed = line.trim_start();
    let hashes = trimmed.chars().take_while(|value| *value == '#').count();
    if !(1..=3).contains(&hashes) {
        return None;
    }
    let rest = trimmed.get(hashes..)?;
    if !rest.starts_with(' ') {
        return None;
    }
    let title = rest
        .trim()
        .trim_end_matches('#')
        .trim()
        .to_string();
    if title.is_empty() {
        return None;
    }
    Some((hashes as u8, title))
}

fn heading_id(title: &str) -> String {
    let mut id = String::new();
    let mut previous_dash = false;
    for ch in title.chars() {
        if ch.is_alphanumeric() {
            for lower in ch.to_lowercase() {
                id.push(lower);
            }
            previous_dash = false;
        } else if !previous_dash {
            id.push('-');
            previous_dash = true;
        }
    }
    let id = id.trim_matches('-');
    if id.is_empty() {
        "section".to_string()
    } else {
        id.to_string()
    }
}

fn render_warnings(warnings: &[String]) -> String {
    if warnings.is_empty() {
        return String::new();
    }
    let items = warnings
        .iter()
        .map(|warning| format!("<li>{}</li>", escape_html_text(warning)))
        .collect::<Vec<_>>()
        .join("");
    format!(r#"<section class="export-warnings"><strong>导出提示</strong><ul>{items}</ul></section>"#)
}

fn nutbook_logo_data_uri() -> String {
    format!("data:image/png;base64,{}", base64_encode(NUTBOOK_LOGO_BYTES))
}

fn escape_html_text(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn escape_html_attr(value: &str) -> String {
    escape_html_text(value).replace('"', "&quot;")
}

fn base64_encode(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut output = String::with_capacity(bytes.len().div_ceil(3) * 4);

    for chunk in bytes.chunks(3) {
        let b0 = chunk[0];
        let b1 = *chunk.get(1).unwrap_or(&0);
        let b2 = *chunk.get(2).unwrap_or(&0);
        let n = ((b0 as u32) << 16) | ((b1 as u32) << 8) | (b2 as u32);
        output.push(TABLE[((n >> 18) & 0x3f) as usize] as char);
        output.push(TABLE[((n >> 12) & 0x3f) as usize] as char);
        output.push(if chunk.len() > 1 {
            TABLE[((n >> 6) & 0x3f) as usize] as char
        } else {
            '='
        });
        output.push(if chunk.len() > 2 {
            TABLE[(n & 0x3f) as usize] as char
        } else {
            '='
        });
    }

    output
}

#[cfg(test)]
mod tests {
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    use super::{
        default_markdown_html_file_name, fallback_reading_template, render_reading_html, MarkdownHtmlExportInput,
        MarkdownHtmlExportPreferences, ReadingWidth,
    };

    fn temp_path(name: &str) -> std::path::PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("nutbook-markdown-export-{name}-{nanos}"))
    }

    fn template() -> String {
        "<html><head><meta charset=\"UTF-8\"><title>{{title}}</title></head><body>{{warnings}}<article>{{content}}</article><footer>{{generated_at}} {{source_file}}</footer></body></html>".to_string()
    }

    #[test]
    fn reading_html_injects_rendered_markdown_and_metadata() {
        let source_path = temp_path("note").with_extension("md");
        let output = render_reading_html(MarkdownHtmlExportInput {
            title: "Plan <One>".to_string(),
            source_file: "plan.md".to_string(),
            source_path,
            markdown: "# Title\n\n> Quote\n\n| A | B |\n| - | - |\n| 1 | 2 |".to_string(),
            generated_at: "123".to_string(),
            template_html: template(),
            preferences: MarkdownHtmlExportPreferences::default(),
        })
        .expect("reading html should render");

        assert!(output.html.contains(r#"<h1 id="title">Title</h1>"#));
        assert!(output.html.contains("<blockquote>"));
        assert!(output.html.contains("<table>"));
        assert!(output.html.contains("<title>Plan &lt;One&gt;</title>"));
        assert!(output.html.contains("123 plan.md"));
        assert!(!output.html.contains("export-warnings"));
    }

    #[test]
    fn fallback_template_keeps_reading_styles_and_code_copy_script() {
        let output = render_reading_html(MarkdownHtmlExportInput {
            title: "Styled".to_string(),
            source_file: "styled.md".to_string(),
            source_path: temp_path("styled").with_extension("md"),
            markdown: "> Quote\n\n```rust\nfn main() {}\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |".to_string(),
            generated_at: "修改时间：2026-06-11 16:20".to_string(),
            template_html: fallback_reading_template().to_string(),
            preferences: MarkdownHtmlExportPreferences::default(),
        })
        .expect("reading html should render");

        assert!(output.html.contains("background: #f3f3f5"));
        assert!(output.html.contains("background: #ffffff"));
        assert!(!output.html.contains("#fffefa"));
        assert!(!output.html.contains("#f8f6ef"));
        assert!(output.html.contains("border-radius: 0 14px 14px 0"));
        assert!(output.html.contains("border-collapse: separate"));
        assert!(output.html.contains("border-radius: 14px"));
        assert!(output.html.contains("data-copy-code"));
        assert!(output.html.contains(r#"<svg class="code-copy-icon""#));
        assert!(output.html.contains(r#"button.setAttribute("aria-label", "复制代码")"#));
        assert!(output.html.contains(r#"tooltip.className = "code-copy-tooltip""#));
        assert!(output.html.contains(r#"tooltip.dataset.copyTooltip = "true""#));
        assert!(output.html.contains(r#"tooltip.textContent = "复制代码""#));
        assert!(output.html.contains(r#"tooltip.textContent = "复制成功""#));
        assert!(output.html.contains(r#"tooltip.classList.add("visible", "success")"#));
        assert!(!output.html.contains(r#"button.textContent = "复制""#));
        assert!(output.html.contains("navigator.clipboard"));
        assert!(output.html.contains("修改时间：2026-06-11 16:20"));
    }

    #[test]
    fn fallback_template_uses_embedded_logo_watermark() {
        let output = render_reading_html(MarkdownHtmlExportInput {
            title: "Logo".to_string(),
            source_file: "logo.md".to_string(),
            source_path: temp_path("logo").with_extension("md"),
            markdown: "# Logo".to_string(),
            generated_at: "修改时间：2026-06-11 16:20".to_string(),
            template_html: fallback_reading_template().to_string(),
            preferences: MarkdownHtmlExportPreferences::default(),
        })
        .expect("reading html should render");

        assert!(output.html.contains(r#"<footer><span>by</span><img"#));
        assert!(output.html.contains(r#"src="data:image/png;base64,"#));
        assert!(output.html.contains(r#"alt="NUTBOOK""#));
        assert!(!output.html.contains("by NUTBOOK"));
    }

    #[test]
    fn relative_png_images_are_embedded_as_data_urls() {
        let root = temp_path("image-root");
        fs::create_dir_all(&root).expect("root should be created");
        let image = root.join("hero.png");
        fs::write(&image, b"abc").expect("image should be written");
        let source_path = root.join("note.md");

        let output = render_reading_html(MarkdownHtmlExportInput {
            title: "Image".to_string(),
            source_file: "note.md".to_string(),
            source_path,
            markdown: "![Hero](hero.png)".to_string(),
            generated_at: "1".to_string(),
            template_html: template(),
            preferences: MarkdownHtmlExportPreferences::default(),
        })
        .expect("reading html should render");

        assert!(output.html.contains("src=\"data:image/png;base64,YWJj\""));
        assert!(output.warnings.is_empty());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn relative_svg_images_are_embedded_as_data_urls() {
        let root = temp_path("svg-root");
        fs::create_dir_all(&root).expect("root should be created");
        fs::write(root.join("icon.svg"), "<svg></svg>").expect("svg should be written");

        let output = render_reading_html(MarkdownHtmlExportInput {
            title: "Svg".to_string(),
            source_file: "note.md".to_string(),
            source_path: root.join("note.md"),
            markdown: "![Icon](icon.svg)".to_string(),
            generated_at: "1".to_string(),
            template_html: template(),
            preferences: MarkdownHtmlExportPreferences::default(),
        })
        .expect("reading html should render");

        assert!(output.html.contains("src=\"data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=\""));
        assert!(!output.html.contains("missing-image"));
        assert!(output.warnings.is_empty());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn reading_preferences_can_disable_image_embedding_and_code_copy() {
        let root = temp_path("preference-root");
        fs::create_dir_all(&root).expect("root should be created");
        fs::write(root.join("hero.png"), b"abc").expect("image should be written");

        let output = render_reading_html(MarkdownHtmlExportInput {
            title: "Preferences".to_string(),
            source_file: "note.md".to_string(),
            source_path: root.join("note.md"),
            markdown: "![Hero](hero.png)\n\n```js\nconsole.log(1)\n```".to_string(),
            generated_at: "1".to_string(),
            template_html: fallback_reading_template().to_string(),
            preferences: MarkdownHtmlExportPreferences {
                embed_images: false,
                code_copy: false,
                outline: false,
                width: ReadingWidth::Compact,
            },
        })
        .expect("reading html should render");

        assert!(output.html.contains(r#"src="hero.png""#));
        assert!(!output.html.contains("src=\"data:image/png;base64,YWJj\""));
        assert!(!output.html.contains("data-copy-code"));
        assert!(!output.html.contains("navigator.clipboard"));
        assert!(output.html.contains("width: min(760px"));
        assert!(!output.html.contains(r#"<nav class="export-outline""#));
        assert!(output.warnings.is_empty());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn reading_preferences_render_outline_and_wide_width() {
        let output = render_reading_html(MarkdownHtmlExportInput {
            title: "Outline".to_string(),
            source_file: "outline.md".to_string(),
            source_path: temp_path("outline").with_extension("md"),
            markdown: "# Intro\n\n## Details\n\n### More".to_string(),
            generated_at: "1".to_string(),
            template_html: fallback_reading_template().to_string(),
            preferences: MarkdownHtmlExportPreferences {
                embed_images: true,
                code_copy: true,
                outline: true,
                width: ReadingWidth::Wide,
            },
        })
        .expect("reading html should render");

        assert!(output.html.contains("width: min(1040px"));
        assert!(output.html.contains(r#"<nav class="export-outline""#));
        assert!(output.html.contains(r##"href="#intro""##));
        assert!(output.html.contains(r#"<h1 id="intro">Intro</h1>"#));
        assert!(output.html.contains(r##"class="depth-3" href="#more""##));
    }

    #[test]
    fn default_file_name_uses_html_extension() {
        assert_eq!(default_markdown_html_file_name("Quarterly Plan.md"), "Quarterly Plan.html");
    }
}
