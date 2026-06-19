use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{core::markdown_render::render_markdown_html, errors::AppError};

pub const READING_TEMPLATE: &str = "reading";
pub const READING_LIGHT_TEMPLATE: &str = "reading-light";
pub const READING_DARK_TEMPLATE: &str = "reading-dark";
pub const PRESENTATION_LIGHT_TEMPLATE: &str = "presentation-light";
pub const PRESENTATION_DARK_TEMPLATE: &str = "presentation-dark";
const MAX_SINGLE_IMAGE_BYTES: u64 = 10 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES: u64 = 50 * 1024 * 1024;
const FALLBACK_READING_LIGHT_TEMPLATE: &str = include_str!("../../resources/export-templates/markdown-reading-light.html");
const FALLBACK_READING_DARK_TEMPLATE: &str = include_str!("../../resources/export-templates/markdown-reading-dark.html");
const FALLBACK_PRESENTATION_LIGHT_TEMPLATE: &str = include_str!("../../resources/export-templates/markdown-presentation-light.html");
const FALLBACK_PRESENTATION_DARK_TEMPLATE: &str = include_str!("../../resources/export-templates/markdown-presentation-dark.html");
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PresentationDensity {
    Master,
    Balanced,
    Report,
}

impl PresentationDensity {
    fn key(self) -> &'static str {
        match self {
            Self::Master => "master",
            Self::Balanced => "balanced",
            Self::Report => "report",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PresentationHtmlExportPreferences {
    pub aspect_ratio: String,
    pub density: PresentationDensity,
    pub output_kind: String,
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

pub fn fallback_reading_light_template() -> &'static str {
    FALLBACK_READING_LIGHT_TEMPLATE
}

pub fn fallback_reading_dark_template() -> &'static str {
    FALLBACK_READING_DARK_TEMPLATE
}

pub fn fallback_presentation_light_template() -> &'static str {
    FALLBACK_PRESENTATION_LIGHT_TEMPLATE
}

pub fn fallback_presentation_dark_template() -> &'static str {
    FALLBACK_PRESENTATION_DARK_TEMPLATE
}

pub fn render_reading_html(input: MarkdownHtmlExportInput) -> Result<MarkdownHtmlExportOutput, AppError> {
    if input.template_html.trim().is_empty() {
        return Err(AppError::InvalidParams);
    }

    let title = first_markdown_h1(&input.markdown).unwrap_or_else(|| input.title.clone());
    let body_markdown = remove_first_markdown_h1(&input.markdown);
    let rendered = if body_markdown.trim().is_empty() {
        String::new()
    } else {
        add_heading_ids(&render_markdown_html(&body_markdown), &body_markdown)
    };
    if rendered.trim().is_empty() && title.trim().is_empty() {
        return Err(AppError::InvalidParams);
    }

    let source_dir = input
        .source_path
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(PathBuf::new);
    let mut embedder = ImageEmbedder::new(source_dir);
    let outline_html = if input.preferences.outline {
        render_outline(&body_markdown)
    } else {
        String::new()
    };
    let outline_state_class = if !outline_html.is_empty() && input.preferences.width == ReadingWidth::Compact {
        "outline-collapsed"
    } else {
        ""
    };
    let content = if input.preferences.embed_images {
        embedder.embed_images(&rendered)
    } else {
        rendered
    };
    let warnings_html = render_warnings(&embedder.warnings);

    let html = input
        .template_html
        .replace("{{title}}", &escape_html_text(&title))
        .replace("{{content}}", &content)
        .replace("{{outline}}", &outline_html)
        .replace("{{outline_columns}}", if outline_html.is_empty() { "1fr" } else { "180px minmax(0, 1fr)" })
        .replace("{{outline_state_class}}", outline_state_class)
        .replace("{{outline_toggle_script}}", if outline_html.is_empty() { "" } else { OUTLINE_TOGGLE_SCRIPT })
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

pub fn render_presentation_html(
    input: MarkdownHtmlExportInput,
    preferences: PresentationHtmlExportPreferences,
) -> Result<MarkdownHtmlExportOutput, AppError> {
    if input.template_html.trim().is_empty() {
        return Err(AppError::InvalidParams);
    }

    let source_dir = input
        .source_path
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(PathBuf::new);
    let mut embedder = ImageEmbedder::new(source_dir);
    let slides = render_presentation_slides(&input, &preferences, &mut embedder);
    if slides.trim().is_empty() {
        return Err(AppError::InvalidParams);
    }
    let slide_total = slides.matches(r#"<section class="slide"#).count().max(1);
    let warnings_html = render_warnings(&embedder.warnings);
    let aspect_class = match preferences.aspect_ratio.as_str() {
        "4-3" => "aspect-4-3",
        _ => "aspect-16-9",
    };

    let html = input
        .template_html
        .replace("{{title}}", &escape_html_text(&input.title))
        .replace("{{slides}}", &slides)
        .replace("{{slides_html}}", &slides)
        .replace("{{slide_total}}", &slide_total.to_string())
        .replace("{{deck_class}}", aspect_class)
        .replace("{{aspect_ratio_class}}", aspect_class)
        .replace("{{aspect_ratio}}", &escape_html_attr(&preferences.aspect_ratio))
        .replace("{{density}}", preferences.density.key())
        .replace("{{output_kind}}", &escape_html_attr(&preferences.output_kind))
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
    .code-block { margin: 0 0 18px; overflow: hidden; border-radius: 8px; background: #2f3132; color: #f0f0f2; }
    .code-block pre { margin: 0; border-radius: 0; background: transparent; color: inherit; }
    .code-block pre code { background: transparent; color: inherit; }
    .code-toolbar { min-height: 42px; padding: 8px 10px 2px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; background: inherit; }
    .code-language { color: rgba(240,240,242,0.52); font-size: 12px; font-weight: 800; line-height: 1; letter-spacing: 0; text-transform: uppercase; }
    .code-copy-wrap { position: relative; display: inline-flex; align-items: center; }
    .code-copy-button { width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 8px; background: rgba(255,255,255,0.1); color: rgba(240,240,242,0.76); cursor: pointer; }
    .code-copy-button:hover { color: #f0f0f2; background: rgba(255,255,255,0.16); }
    .code-copy-button.copied { color: #f0f0f2; background: rgba(255,255,255,0.18); }
    .code-copy-button.failed { color: #f0f0f2; background: rgba(186,26,26,0.55); }
    .code-copy-icon { display: block; width: 16px; height: 16px; pointer-events: none; }
    .code-copy-tooltip { position: absolute; top: 1px; right: 38px; min-height: 28px; padding: 0 10px; display: inline-flex; align-items: center; white-space: nowrap; border-radius: 8px; background: rgba(24,24,28,0.94); color: #f0f0f2; font-size: 12px; font-weight: 700; line-height: 1; pointer-events: none; opacity: 0; transform: translateX(4px); transition: opacity 140ms ease, transform 140ms ease; }
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
      function codeLanguage(pre) {
        const code = pre.querySelector("code");
        const classes = [...(code?.classList || []), ...(pre.classList || [])];
        const found = classes.find((name) => name.startsWith("language-"));
        if (!found) return "text";
        return found.replace(/^language-/, "").trim() || "text";
      }
      document.querySelectorAll("pre").forEach((pre) => {
        if (pre.querySelector("[data-copy-code]")) return;
        if (pre.closest(".code-block")) return;
        const wrapper = document.createElement("div");
        wrapper.className = "code-block";
        const toolbar = document.createElement("div");
        toolbar.className = "code-toolbar";
        const language = document.createElement("span");
        language.className = "code-language";
        language.textContent = codeLanguage(pre);
        const buttonWrap = document.createElement("span");
        buttonWrap.className = "code-copy-wrap";
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
            const code = pre.querySelector("code");
            await copyText(code?.innerText || code?.textContent || pre.innerText || pre.textContent || "");
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
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(toolbar);
        wrapper.appendChild(pre);
        toolbar.appendChild(language);
        buttonWrap.appendChild(button);
        buttonWrap.appendChild(tooltip);
        toolbar.appendChild(buttonWrap);
      });
    })();
  </script>"#;

const OUTLINE_TOGGLE_SCRIPT: &str = r#"<script>
    (() => {
      const button = document.querySelector("[data-outline-toggle]");
      if (!button) return;
      const body = document.body;
      function sync() {
        const collapsed = body.classList.contains("outline-collapsed");
        button.setAttribute("aria-expanded", collapsed ? "false" : "true");
        button.setAttribute("aria-label", collapsed ? "展开大纲" : "收起大纲");
        button.title = collapsed ? "展开大纲" : "收起大纲";
      }
      button.addEventListener("click", () => {
        body.classList.toggle("outline-collapsed");
        sync();
      });
      sync();
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

fn figure_layout_for_markdown(markdown: &str, source_dir: &Path) -> FigureLayout {
    let Some(src) = markdown_image_src(markdown) else {
        return FigureLayout::Full;
    };
    if src.starts_with("data:") || src.starts_with("http://") || src.starts_with("https://") {
        return FigureLayout::Full;
    }
    let image_path = if Path::new(&src).is_absolute() {
        PathBuf::from(src)
    } else {
        source_dir.join(src)
    };
    let Some((width, height)) = image_dimensions(&image_path) else {
        return FigureLayout::Full;
    };
    if height == 0 {
        return FigureLayout::Full;
    }
    let ratio = width as f32 / height as f32;
    if ratio >= 1.35 {
        FigureLayout::Full
    } else {
        FigureLayout::Side
    }
}

fn markdown_image_src(markdown: &str) -> Option<String> {
    let trimmed = markdown.trim();
    let start = trimmed.find("](")? + 2;
    let rest = trimmed.get(start..)?;
    let end = rest.find(')')?;
    let src = rest.get(..end)?.trim();
    (!src.is_empty()).then(|| src.to_string())
}

fn image_dimensions(path: &Path) -> Option<(u32, u32)> {
    let bytes = fs::read(path).ok()?;
    png_dimensions(&bytes).or_else(|| jpeg_dimensions(&bytes))
}

fn png_dimensions(bytes: &[u8]) -> Option<(u32, u32)> {
    if bytes.len() < 24 || bytes.get(..8)? != [137, 80, 78, 71, 13, 10, 26, 10] {
        return None;
    }
    if bytes.get(12..16)? != b"IHDR" {
        return None;
    }
    let width = u32::from_be_bytes(bytes.get(16..20)?.try_into().ok()?);
    let height = u32::from_be_bytes(bytes.get(20..24)?.try_into().ok()?);
    Some((width, height))
}

fn jpeg_dimensions(bytes: &[u8]) -> Option<(u32, u32)> {
    if bytes.get(..2)? != [0xff, 0xd8] {
        return None;
    }
    let mut index = 2usize;
    while index + 9 < bytes.len() {
        if bytes[index] != 0xff {
            index += 1;
            continue;
        }
        let marker = bytes[index + 1];
        index += 2;
        if matches!(marker, 0xd8 | 0xd9) {
            continue;
        }
        let len = u16::from_be_bytes(bytes.get(index..index + 2)?.try_into().ok()?) as usize;
        if len < 2 || index + len > bytes.len() {
            return None;
        }
        if matches!(marker, 0xc0 | 0xc1 | 0xc2 | 0xc3) {
            let height = u16::from_be_bytes(bytes.get(index + 3..index + 5)?.try_into().ok()?) as u32;
            let width = u16::from_be_bytes(bytes.get(index + 5..index + 7)?.try_into().ok()?) as u32;
            return Some((width, height));
        }
        index += len;
    }
    None
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
        r#"<nav class="export-outline" aria-label="文档大纲"><div class="export-outline-header"><p class="export-outline-title">文档大纲</p><span class="export-outline-toggle-wrap"><button class="export-outline-toggle" type="button" data-outline-toggle aria-label="收起大纲" aria-expanded="true" title="收起/展开大纲"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l8 7-8 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><span class="export-outline-tooltip">收起/展开大纲</span></span></div><div class="export-outline-links">{}</div></nav>"#,
        items.join("")
    )
}

fn render_presentation_slides(
    input: &MarkdownHtmlExportInput,
    preferences: &PresentationHtmlExportPreferences,
    embedder: &mut ImageEmbedder,
) -> String {
    let document = parse_presentation_document(&input.markdown, &input.title);
    let source_dir = input
        .source_path
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(PathBuf::new);
    let plans = plan_presentation_slides(&document, input, preferences, &source_dir);
    let total = plans.len().max(1);
    let mut chapter_ordinal = 0usize;
    plans
        .iter()
        .enumerate()
        .map(|(index, plan)| {
            let chapter_label = if matches!(plan, PresentationSlidePlan::Chapter { .. }) {
                chapter_ordinal += 1;
                Some(chapter_ordinal)
            } else {
                None
            };
            render_presentation_slide(
                plan,
                index + 1,
                total,
                chapter_label,
                input,
                preferences,
                embedder,
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct PresentationDocument {
    title: String,
    chapters: Vec<PresentationChapter>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct PresentationChapter {
    title: String,
    topics: Vec<PresentationTopic>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct PresentationTopic {
    title: String,
    blocks: Vec<PresentationBlock>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum PresentationBlock {
    Paragraph(String),
    List(Vec<String>),
    Quote(String),
    Heading { level: u8, title: String },
    Image(String),
    Table { markdown: String, rows: usize, cols: usize, max_line_chars: usize },
    Code { language: Option<String>, body: String, lines: usize, max_line_chars: usize },
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct TopicCardPlan {
    title: String,
    summary_markdown: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ListCardPlan {
    title: String,
    body_markdown: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TableMode {
    Fit,
    ScrollY,
    ScrollX,
}

impl TableMode {
    fn class_name(self) -> &'static str {
        match self {
            Self::Fit => "table-fit",
            Self::ScrollY => "table-scroll-y",
            Self::ScrollX => "table-scroll-x",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum CodeMode {
    Fit,
    ScrollY,
}

impl CodeMode {
    fn class_name(self) -> &'static str {
        match self {
            Self::Fit => "code-fit",
            Self::ScrollY => "code-scroll-y",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum FigureLayout {
    Full,
    Side,
}

impl FigureLayout {
    fn key(self) -> &'static str {
        match self {
            Self::Full => "full",
            Self::Side => "side",
        }
    }

    fn class_name(self) -> &'static str {
        match self {
            Self::Full => "full",
            Self::Side => "side-by-side",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum PresentationSlidePlan {
    Cover { title: String },
    Chapter { title: String },
    Statement { chapter: String, title: String, note: Option<String> },
    TopicCards { chapter: String, cards: Vec<TopicCardPlan> },
    Text { chapter: String, title: String, subtitle: Option<String>, markdown: String },
    ListCards {
        chapter: String,
        title: String,
        intro: Option<String>,
        cards: Vec<ListCardPlan>,
        outro: Option<String>,
    },
    Figure { chapter: String, title: String, markdown: String, layout: FigureLayout, aside_markdown: Option<String> },
    Table { chapter: String, title: String, markdown: String, mode: TableMode },
    Code {
        chapter: String,
        title: String,
        language: Option<String>,
        code: String,
        mode: CodeMode,
        intro_markdown: Option<String>,
        outro_markdown: Option<String>,
    },
    Thanks,
}

#[derive(Debug, Clone, Copy)]
struct PresentationPageBudget {
    max_cards: usize,
    max_paragraph_chars: usize,
    max_list_items: usize,
    max_code_lines: usize,
}

fn presentation_budget(preferences: &PresentationHtmlExportPreferences) -> PresentationPageBudget {
    match preferences.density {
        PresentationDensity::Master => PresentationPageBudget {
            max_cards: 1,
            max_paragraph_chars: 120,
            max_list_items: 2,
            max_code_lines: 12,
        },
        PresentationDensity::Balanced => PresentationPageBudget {
            max_cards: presentation_card_limit(&preferences.aspect_ratio),
            max_paragraph_chars: 220,
            max_list_items: 5,
            max_code_lines: 20,
        },
        PresentationDensity::Report => PresentationPageBudget {
            max_cards: presentation_card_limit(&preferences.aspect_ratio),
            max_paragraph_chars: 500,
            max_list_items: 10,
            max_code_lines: 36,
        },
    }
}

fn presentation_card_limit(aspect_ratio: &str) -> usize {
    match aspect_ratio {
        "4-3" => 3,
        _ => 5,
    }
}

fn parse_presentation_document(markdown: &str, fallback_title: &str) -> PresentationDocument {
    let title = first_markdown_h1(markdown).unwrap_or_else(|| fallback_title.to_string());
    let overview_title = localized_overview_title(markdown, fallback_title);
    let mut chapters: Vec<PresentationChapter> = Vec::new();
    let mut current_chapter = PresentationChapter {
        title: overview_title.clone(),
        topics: Vec::new(),
    };
    let mut current_topic = PresentationTopic {
        title: overview_title.clone(),
        blocks: Vec::new(),
    };
    let mut raw_topic = String::new();
    let mut skipped_first_h1 = false;

    let flush_topic = |topic: &mut PresentationTopic, raw: &mut String, chapter: &mut PresentationChapter| {
        if !raw.trim().is_empty() {
            topic.blocks.extend(parse_presentation_blocks(raw));
        }
        if !topic.blocks.is_empty() {
            chapter.topics.push(topic.clone());
        }
        *topic = PresentationTopic {
            title: chapter.title.clone(),
            blocks: Vec::new(),
        };
        raw.clear();
    };

    let flush_chapter = |chapter: &mut PresentationChapter, chapters: &mut Vec<PresentationChapter>| {
        if !chapter.topics.is_empty() {
            chapters.push(chapter.clone());
        }
    };

    let mut active_fence: Option<(char, usize)> = None;
    for line in markdown.lines() {
        if let Some((marker, len)) = active_fence {
            raw_topic.push_str(line);
            raw_topic.push('\n');
            if is_code_fence_end(line, marker, len) {
                active_fence = None;
            }
            continue;
        }
        if let Some(fence) = parse_code_fence_start(line) {
            raw_topic.push_str(line);
            raw_topic.push('\n');
            active_fence = Some((fence.marker, fence.len));
            continue;
        }
        if let Some((level, heading)) = markdown_heading(line) {
            if level == 1 && !skipped_first_h1 && heading == title {
                skipped_first_h1 = true;
                continue;
            }
            match level {
                1 | 2 => {
                    flush_topic(&mut current_topic, &mut raw_topic, &mut current_chapter);
                    flush_chapter(&mut current_chapter, &mut chapters);
                    current_chapter = PresentationChapter {
                        title: heading.clone(),
                        topics: Vec::new(),
                    };
                    current_topic = PresentationTopic {
                        title: heading,
                        blocks: Vec::new(),
                    };
                    continue;
                }
                3 => {
                    flush_topic(&mut current_topic, &mut raw_topic, &mut current_chapter);
                    current_topic = PresentationTopic {
                        title: heading,
                        blocks: Vec::new(),
                    };
                    continue;
                }
                _ => {}
            }
        }
        raw_topic.push_str(line);
        raw_topic.push('\n');
    }
    flush_topic(&mut current_topic, &mut raw_topic, &mut current_chapter);
    flush_chapter(&mut current_chapter, &mut chapters);

    if chapters.is_empty() {
        let blocks = parse_presentation_blocks(markdown);
        chapters.push(PresentationChapter {
            title: overview_title.clone(),
            topics: vec![PresentationTopic {
                title: overview_title,
                blocks,
            }],
        });
    }

    PresentationDocument { title, chapters }
}

fn localized_overview_title(markdown: &str, fallback_title: &str) -> String {
    if contains_cjk(markdown) || contains_cjk(fallback_title) {
        "概览".to_string()
    } else {
        "Overview".to_string()
    }
}

fn contains_cjk(value: &str) -> bool {
    value.chars().any(|ch| matches!(ch as u32, 0x3400..=0x9FFF | 0xF900..=0xFAFF))
}

fn parse_presentation_blocks(markdown: &str) -> Vec<PresentationBlock> {
    let lines = markdown.lines().collect::<Vec<_>>();
    let mut blocks = Vec::new();
    let mut index = 0usize;
    while index < lines.len() {
        while index < lines.len() && lines[index].trim().is_empty() {
            index += 1;
        }
        if index >= lines.len() {
            break;
        }
        let line = lines[index];
        if is_markdown_thematic_break(line) {
            index += 1;
            continue;
        }
        if let Some((level, title)) = markdown_heading(line) {
            blocks.push(PresentationBlock::Heading { level, title });
            index += 1;
            continue;
        }
        if parse_code_fence_start(line).is_some() {
            let (block, next) = parse_code_block(&lines, index);
            blocks.push(block);
            index = next;
            continue;
        }
        if is_markdown_table_start(&lines, index) {
            let (block, next) = parse_table_block(&lines, index);
            blocks.push(block);
            index = next;
            continue;
        }
        if is_markdown_image_line(line) {
            blocks.push(PresentationBlock::Image(line.trim().to_string()));
            index += 1;
            continue;
        }
        if is_markdown_list_item(line) {
            let mut items = Vec::new();
            while index < lines.len() && is_markdown_list_item(lines[index]) {
                items.push(lines[index].to_string());
                index += 1;
            }
            blocks.push(PresentationBlock::List(items));
            continue;
        }
        if line.trim_start().starts_with('>') {
            let mut quote = Vec::new();
            while index < lines.len() && lines[index].trim_start().starts_with('>') {
                quote.push(lines[index].to_string());
                index += 1;
            }
            blocks.push(PresentationBlock::Quote(quote.join("\n")));
            continue;
        }
        let (paragraph, next) = collect_paragraph(&lines, index);
        if !paragraph.trim().is_empty() {
            blocks.push(PresentationBlock::Paragraph(paragraph));
        }
        index = next;
    }
    blocks
}

fn parse_code_block(lines: &[&str], start: usize) -> (PresentationBlock, usize) {
    let fence = parse_code_fence_start(lines[start]).unwrap_or(CodeFence {
        marker: '`',
        len: 3,
        language: None,
    });
    let language = fence.language.clone();
    let mut body = Vec::new();
    let mut index = start + 1;
    while index < lines.len() {
        if is_code_fence_end(lines[index], fence.marker, fence.len) {
            index += 1;
            break;
        }
        body.push(lines[index].to_string());
        index += 1;
    }
    let max_line_chars = body.iter().map(|line| line.chars().count()).max().unwrap_or(0);
    let lines_count = body.len();
    (
        PresentationBlock::Code {
            language,
            body: body.join("\n"),
            lines: lines_count,
            max_line_chars,
        },
        index,
    )
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct CodeFence {
    marker: char,
    len: usize,
    language: Option<String>,
}

fn parse_code_fence_start(line: &str) -> Option<CodeFence> {
    let trimmed = line.trim_start();
    let marker = trimmed.chars().next()?;
    if !matches!(marker, '`' | '~') {
        return None;
    }
    let len = trimmed.chars().take_while(|ch| *ch == marker).count();
    if len < 3 {
        return None;
    }
    let rest = trimmed.chars().skip(len).collect::<String>();
    let language = rest.trim();
    Some(CodeFence {
        marker,
        len,
        language: (!language.is_empty()).then(|| language.to_string()),
    })
}

fn is_code_fence_end(line: &str, marker: char, opening_len: usize) -> bool {
    let trimmed = line.trim_start();
    let len = trimmed.chars().take_while(|ch| *ch == marker).count();
    if len < opening_len {
        return false;
    }
    trimmed.chars().skip(len).all(char::is_whitespace)
}

fn parse_table_block(lines: &[&str], start: usize) -> (PresentationBlock, usize) {
    let mut block = Vec::new();
    let mut index = start;
    while index < lines.len() && lines[index].trim().contains('|') {
        block.push(lines[index].to_string());
        index += 1;
    }
    let cols = block
        .first()
        .map(|line| line.split('|').filter(|cell| !cell.trim().is_empty()).count())
        .unwrap_or(0);
    let rows = block.len().saturating_sub(2);
    let max_line_chars = block.iter().map(|line| line.chars().count()).max().unwrap_or(0);
    (
        PresentationBlock::Table {
            markdown: block.join("\n"),
            rows,
            cols,
            max_line_chars,
        },
        index,
    )
}

fn is_markdown_image_line(line: &str) -> bool {
    let trimmed = line.trim_start();
    trimmed.starts_with("![") && trimmed.contains("](")
}

fn collect_paragraph(lines: &[&str], start: usize) -> (String, usize) {
    let mut parts = Vec::new();
    let mut index = start;
    while index < lines.len()
        && !lines[index].trim().is_empty()
        && !is_markdown_list_item(lines[index])
        && !is_markdown_table_start(lines, index)
        && !is_markdown_thematic_break(lines[index])
        && parse_code_fence_start(lines[index]).is_none()
        && !is_markdown_image_line(lines[index])
        && !lines[index].trim_start().starts_with('>')
        && markdown_heading(lines[index]).is_none()
    {
        parts.push(lines[index].trim());
        index += 1;
    }
    (parts.join(" "), index)
}

fn plan_presentation_slides(
    document: &PresentationDocument,
    input: &MarkdownHtmlExportInput,
    preferences: &PresentationHtmlExportPreferences,
    source_dir: &Path,
) -> Vec<PresentationSlidePlan> {
    let mut slides = vec![PresentationSlidePlan::Cover {
        title: document.title.clone(),
    }];
    if preferences.density == PresentationDensity::Master {
        plan_master_slides(document, preferences, &mut slides);
    } else {
        plan_landscape_slides(document, preferences, source_dir, &mut slides);
        compact_report_slides(&mut slides, preferences);
    }
    slides.push(PresentationSlidePlan::Thanks);
    if slides.len() == 2 && input.markdown.trim().is_empty() {
        slides.insert(
            1,
            PresentationSlidePlan::Text {
                chapter: localized_overview_title(&input.markdown, &input.title),
                title: localized_overview_title(&input.markdown, &input.title),
                subtitle: None,
                markdown: String::new(),
            },
        );
    }
    slides
}

fn compact_report_slides(
    slides: &mut Vec<PresentationSlidePlan>,
    preferences: &PresentationHtmlExportPreferences,
) {
    if preferences.density != PresentationDensity::Report {
        return;
    }
    let budget = presentation_budget(preferences);
    let mut compacted: Vec<PresentationSlidePlan> = Vec::new();
    let mut active_chapter: Option<String> = None;
    for slide in std::mem::take(slides) {
        match slide {
            PresentationSlidePlan::Chapter { title } => {
                active_chapter = Some(title);
                continue;
            }
            PresentationSlidePlan::Text {
                chapter,
                title,
                subtitle,
                markdown,
            } => {
                let chapter_title = active_chapter.clone().unwrap_or(chapter);
                let normalized_markdown = report_section_markdown(&chapter_title, &title, subtitle.as_deref(), &markdown);

                if let Some(PresentationSlidePlan::Text {
                    title: previous_title,
                    markdown: previous_markdown,
                    ..
                }) = compacted.last_mut()
                {
                    let current_chars = markdown_text_chars(&normalized_markdown);
                    let combined_chars = markdown_text_chars(previous_markdown) + current_chars;
                    if previous_title == &chapter_title && current_chars <= 260 && combined_chars <= budget.max_paragraph_chars + 320 {
                        if !normalized_markdown.trim().is_empty() {
                            previous_markdown.push_str("\n\n");
                            previous_markdown.push_str(&normalized_markdown);
                        }
                        continue;
                    }
                }

                compacted.push(PresentationSlidePlan::Text {
                    chapter: chapter_title.clone(),
                    title: chapter_title,
                    subtitle: None,
                    markdown: normalized_markdown,
                });
            }
            _ => {
                compacted.push(slide);
            }
        }
    }
    *slides = compacted;
}

fn report_section_markdown(chapter: &str, title: &str, subtitle: Option<&str>, markdown: &str) -> String {
    let mut parts = Vec::new();
    if title != chapter && !title.trim().is_empty() {
        parts.push(format!("### {}", title.trim()));
    }
    if let Some(subtitle) = subtitle.filter(|value| !value.trim().is_empty()) {
        parts.push(format!("#### {}", subtitle.trim()));
    }
    if !markdown.trim().is_empty() {
        parts.push(markdown.trim().to_string());
    }
    parts.join("\n\n")
}

fn is_markdown_thematic_break(line: &str) -> bool {
    let trimmed = line.trim();
    if trimmed.len() < 3 {
        return false;
    }
    let mut chars = trimmed.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    matches!(first, '-' | '*' | '_') && trimmed.chars().all(|ch| ch == first)
}

fn plan_landscape_slides(
    document: &PresentationDocument,
    preferences: &PresentationHtmlExportPreferences,
    source_dir: &Path,
    slides: &mut Vec<PresentationSlidePlan>,
) {
    let budget = presentation_budget(preferences);
    for chapter in &document.chapters {
        slides.push(PresentationSlidePlan::Chapter {
            title: chapter.title.clone(),
        });
        let mut index = 0usize;
        let has_list_topic = chapter.topics.iter().any(topic_has_list_blocks);
        while index < chapter.topics.len() {
            if !has_list_topic {
                if let Some((cards, next_index)) = collect_topic_cards(&chapter.topics, index, budget.max_cards, preferences) {
                slides.push(PresentationSlidePlan::TopicCards {
                    chapter: chapter.title.clone(),
                    cards,
                });
                index = next_index;
                continue;
                }
            }
            plan_topic_landscape(&chapter.title, &chapter.topics[index], preferences, source_dir, slides);
            index += 1;
        }
    }
}

fn topic_has_list_blocks(topic: &PresentationTopic) -> bool {
    topic
        .blocks
        .iter()
        .any(|block| matches!(block, PresentationBlock::List(_)))
}

fn plan_master_slides(
    document: &PresentationDocument,
    _preferences: &PresentationHtmlExportPreferences,
    slides: &mut Vec<PresentationSlidePlan>,
) {
    for chapter in &document.chapters {
        slides.push(PresentationSlidePlan::Chapter {
            title: chapter.title.clone(),
        });
        for topic in &chapter.topics {
            for (title, note) in topic_statements(&chapter.title, topic) {
                slides.push(PresentationSlidePlan::Statement {
                    chapter: chapter.title.clone(),
                    title,
                    note,
                });
            }
        }
    }
}

fn topic_statements(chapter: &str, topic: &PresentationTopic) -> Vec<(String, Option<String>)> {
    let question_statements = master_question_statements(topic);
    if !question_statements.is_empty() {
        return question_statements;
    }

    if topic.title != chapter && !is_master_list_container_title(&topic.title) {
        let title = markdown_inline_to_text(&topic.title);
        let note = topic.blocks.iter().find_map(master_topic_note);
        return if title.trim().is_empty() {
            Vec::new()
        } else {
            vec![(title, note)]
        };
    }

    let list_statements = topic
        .blocks
        .iter()
        .filter_map(|block| match block {
            PresentationBlock::List(items) => Some(items),
            _ => None,
        })
        .flat_map(|items| items.iter().filter_map(master_list_statement))
        .collect::<Vec<_>>();
    if !list_statements.is_empty() {
        return list_statements;
    }

    let fallback_title = if topic.title == chapter {
        topic
            .blocks
            .iter()
            .find_map(master_block_statement_title)
            .unwrap_or_else(|| topic.title.clone())
    } else {
        topic.title.clone()
    };
    let title = markdown_inline_to_text(&fallback_title);
    let mut note = None;
    for block in &topic.blocks {
        match block {
            PresentationBlock::Paragraph(value) if note.is_none() => {
                let sentence = first_sentence(&markdown_inline_to_text(value));
                if sentence != fallback_title {
                    note = Some(truncate_text(&sentence, 54));
                }
                break;
            }
            PresentationBlock::List(items) if note.is_none() => {
                note = items
                    .first()
                    .map(|item| truncate_text(&markdown_inline_to_text(strip_list_marker(item)), 54));
                break;
            }
            PresentationBlock::Heading { title, .. } if note.is_none() => {
                note = Some(truncate_text(&markdown_inline_to_text(title), 54));
                break;
            }
            _ => {}
        }
    }
    if title.trim().is_empty() {
        Vec::new()
    } else {
        vec![(title, note)]
    }
}

fn master_question_statements(topic: &PresentationTopic) -> Vec<(String, Option<String>)> {
    if !is_master_question_container_title(&topic.title) {
        return Vec::new();
    }
    let mut statements = Vec::new();
    let mut index = 0usize;
    while index < topic.blocks.len() {
        let PresentationBlock::Paragraph(value) = &topic.blocks[index] else {
            index += 1;
            continue;
        };
        let Some(question) = master_question_title(value) else {
            index += 1;
            continue;
        };
        let note = topic
            .blocks
            .get(index + 1)
            .and_then(|block| match block {
                PresentationBlock::Paragraph(answer) if master_question_title(answer).is_none() => {
                    let sentence = first_sentence(&markdown_inline_to_text(answer));
                    if sentence.trim().is_empty() {
                        None
                    } else {
                        Some(truncate_text(&sentence, 54))
                    }
                }
                _ => None,
            });
        statements.push((question, note));
        index += 1;
    }
    statements
}

fn master_question_title(value: &str) -> Option<String> {
    let text = markdown_inline_to_text(value);
    let trimmed = text.trim();
    let question = trimmed
        .strip_prefix("Q:")
        .or_else(|| trimmed.strip_prefix("Q："))
        .or_else(|| trimmed.strip_prefix("问："))
        .or_else(|| trimmed.strip_prefix("问题："))?
        .trim();
    if question.is_empty() {
        None
    } else {
        Some(question.to_string())
    }
}

fn is_master_question_container_title(title: &str) -> bool {
    let normalized = markdown_inline_to_text(title)
        .trim_matches(|ch: char| ch.is_ascii_digit() || matches!(ch, '.' | '、' | ':' | '：' | '-' | ' '))
        .to_ascii_lowercase();
    matches!(
        normalized.as_str(),
        "常见问题" | "常见问答" | "问答" | "问题" | "faq" | "faqs" | "q&a" | "questions"
    )
}

fn master_topic_note(block: &PresentationBlock) -> Option<String> {
    match block {
        PresentationBlock::Paragraph(value) => {
            let sentence = first_sentence(&markdown_inline_to_text(value));
            if sentence.trim().is_empty() {
                None
            } else {
                Some(truncate_text(&sentence, 54))
            }
        }
        _ => None,
    }
}

fn is_master_list_container_title(title: &str) -> bool {
    let normalized = markdown_inline_to_text(title)
        .trim_matches(|ch: char| ch.is_ascii_digit() || matches!(ch, '.' | '、' | ':' | '：' | '-' | ' '))
        .to_ascii_lowercase();
    matches!(
        normalized.as_str(),
        "适合场景"
            | "典型场景"
            | "使用场景"
            | "应用场景"
            | "适合谁"
            | "当前支持"
            | "支持范围"
            | "包括"
            | "例如"
            | "scenarios"
            | "use cases"
            | "examples"
            | "for whom"
            | "supported"
    )
}

fn master_block_statement_title(block: &PresentationBlock) -> Option<String> {
    match block {
        PresentationBlock::Paragraph(value) => Some(first_sentence(&markdown_inline_to_text(value))),
        PresentationBlock::List(items) => items.iter().find_map(master_list_statement).map(|(title, _)| title),
        PresentationBlock::Heading { title, .. } => Some(markdown_inline_to_text(title)),
        _ => None,
    }
}

fn master_list_statement(item: &String) -> Option<(String, Option<String>)> {
    let stripped = strip_list_marker(item).trim();
    if stripped.is_empty() {
        return None;
    }
    if let Some(rest) = stripped.strip_prefix("**") {
        if let Some((title, after_title)) = rest.split_once("**") {
            let _ = after_title;
            return Some((markdown_inline_to_text(title.trim()), None));
        }
    }
    if stripped.starts_with('[') && stripped.contains("](") {
        if let Some((title, _)) = stripped.trim_start_matches('[').split_once("](") {
            return Some((markdown_inline_to_text(title.trim_matches('`').trim()), None));
        }
    }
    if let Some((title, body)) = stripped.split_once('：').or_else(|| stripped.split_once(": ")) {
        let _ = body;
        return Some((markdown_inline_to_text(title.trim()), None));
    }
    let first = first_sentence(&markdown_inline_to_text(stripped));
    Some((first, None))
}

fn first_sentence(value: &str) -> String {
    let trimmed = value.trim();
    for (index, ch) in trimmed.char_indices() {
        if matches!(ch, '。' | '！' | '？') || (matches!(ch, '.' | '!' | '?') && is_ascii_sentence_boundary(trimmed, index + ch.len_utf8())) {
            let end = index + ch.len_utf8();
            return trimmed[..end].trim().to_string();
        }
    }
    trimmed.to_string()
}

fn is_ascii_sentence_boundary(value: &str, next_index: usize) -> bool {
    value
        .get(next_index..)
        .and_then(|rest| rest.chars().next())
        .is_none_or(|next| next.is_whitespace())
}

fn collect_topic_cards(
    topics: &[PresentationTopic],
    start: usize,
    max_cards: usize,
    preferences: &PresentationHtmlExportPreferences,
) -> Option<(Vec<TopicCardPlan>, usize)> {
    let mut cards = Vec::new();
    let mut index = start;
    let card_limit = dynamic_topic_card_limit(topics, start, max_cards, preferences);
    while index < topics.len() && cards.len() < card_limit {
        let topic = &topics[index];
        if !is_short_card_topic(topic, preferences) {
            break;
        }
        cards.push(TopicCardPlan {
            title: topic.title.clone(),
            summary_markdown: topic_card_summary(topic, preferences),
        });
        index += 1;
    }
    (cards.len() >= 2).then_some((cards, index))
}

fn dynamic_topic_card_limit(
    topics: &[PresentationTopic],
    start: usize,
    max_cards: usize,
    preferences: &PresentationHtmlExportPreferences,
) -> usize {
    if preferences.aspect_ratio != "16-9" || preferences.density != PresentationDensity::Balanced {
        return max_cards;
    }
    let tiny_count = topics
        .iter()
        .skip(start)
        .take(8)
        .take_while(|topic| is_short_card_topic(topic, preferences) && topic_text_chars(topic) <= 28)
        .count();
    if tiny_count > max_cards {
        tiny_count
    } else {
        max_cards
    }
}

fn topic_text_chars(topic: &PresentationTopic) -> usize {
    topic
        .blocks
        .iter()
        .map(|block| match block {
            PresentationBlock::Paragraph(value) => value.chars().count(),
            PresentationBlock::List(items) => items.iter().map(|item| item.chars().count()).sum(),
            _ => 0,
        })
        .sum()
}

fn is_short_card_topic(topic: &PresentationTopic, preferences: &PresentationHtmlExportPreferences) -> bool {
    if preferences.density == PresentationDensity::Report {
        return false;
    }
    let budget = presentation_budget(preferences);
    let mut chars = 0usize;
    for block in &topic.blocks {
        match block {
            PresentationBlock::Paragraph(value) => chars += value.chars().count(),
            PresentationBlock::List(_) => return false,
            PresentationBlock::Heading { .. } => {}
            PresentationBlock::Quote(_) | PresentationBlock::Image(_) | PresentationBlock::Table { .. } | PresentationBlock::Code { .. } => {
                return false;
            }
        }
    }
    chars <= budget.max_paragraph_chars
}

fn topic_card_summary(topic: &PresentationTopic, preferences: &PresentationHtmlExportPreferences) -> String {
    let budget = presentation_budget(preferences);
    let mut output = Vec::new();
    for block in &topic.blocks {
        match block {
            PresentationBlock::Paragraph(value) if output.is_empty() => {
                output.push(truncate_text(value, budget.max_paragraph_chars));
            }
            PresentationBlock::List(items) => {
                output.extend(items.iter().take(budget.max_list_items).cloned());
            }
            _ => {}
        }
        if output.len() >= budget.max_list_items {
            break;
        }
    }
    output.join("\n\n")
}

fn plan_topic_landscape(
    chapter: &str,
    topic: &PresentationTopic,
    preferences: &PresentationHtmlExportPreferences,
    source_dir: &Path,
    slides: &mut Vec<PresentationSlidePlan>,
) {
    let budget = presentation_budget(preferences);
    let mut text_blocks = Vec::new();
    let mut index = 0usize;
    while index < topic.blocks.len() {
        let block = &topic.blocks[index];
        match block {
            PresentationBlock::Image(markdown) => {
                let layout = figure_layout_for_markdown(markdown, source_dir);
                let aside_markdown = if layout == FigureLayout::Side && !text_blocks.is_empty() {
                    let aside = blocks_to_markdown(
                        &text_blocks,
                        Some(budget.max_paragraph_chars),
                        Some(budget.max_list_items),
                    );
                    text_blocks.clear();
                    (!aside.trim().is_empty()).then_some(aside)
                } else {
                    flush_text_blocks(chapter, &topic.title, &mut text_blocks, preferences, slides);
                    None
                };
                slides.push(PresentationSlidePlan::Figure {
                    chapter: chapter.to_string(),
                    title: topic.title.clone(),
                    markdown: markdown.clone(),
                    layout,
                    aside_markdown,
                });
            }
            PresentationBlock::Table { markdown, rows, cols, max_line_chars } => {
                flush_text_blocks(chapter, &topic.title, &mut text_blocks, preferences, slides);
                slides.push(PresentationSlidePlan::Table {
                    chapter: chapter.to_string(),
                    title: topic.title.clone(),
                    markdown: markdown.clone(),
                    mode: table_mode(*rows, *cols, *max_line_chars),
                });
            }
            PresentationBlock::Code { language, body, lines, max_line_chars } => {
                let intro_markdown = code_intro_markdown(&mut text_blocks, *lines, *max_line_chars, preferences);
                if !text_blocks.is_empty() {
                    flush_text_blocks(chapter, &topic.title, &mut text_blocks, preferences, slides);
                }
                let outro_markdown = if intro_markdown.is_some() {
                    code_outro_markdown(
                        topic.blocks.get(index + 1),
                        topic.blocks.get(index + 2),
                        *lines,
                        *max_line_chars,
                        preferences,
                    )
                } else {
                    None
                };
                if outro_markdown.is_some() {
                    index += 1;
                }
                slides.push(PresentationSlidePlan::Code {
                    chapter: chapter.to_string(),
                    title: topic.title.clone(),
                    language: language.clone(),
                    code: body.clone(),
                    mode: code_mode(*lines, *max_line_chars, preferences),
                    intro_markdown,
                    outro_markdown,
                });
            }
            other => text_blocks.push(other.clone()),
        }
        index += 1;
    }
    flush_text_blocks(chapter, &topic.title, &mut text_blocks, preferences, slides);
}

fn code_intro_markdown(
    text_blocks: &mut Vec<PresentationBlock>,
    lines: usize,
    max_line_chars: usize,
    preferences: &PresentationHtmlExportPreferences,
) -> Option<String> {
    if lines > 8 || max_line_chars > 180 || text_blocks.is_empty() {
        return None;
    }
    let budget = presentation_budget(preferences);
    let mut start = text_blocks.len();
    let mut chars = 0usize;
    while start > 0 {
        let PresentationBlock::Paragraph(value) = &text_blocks[start - 1] else {
            break;
        };
        let paragraph_chars = markdown_text_chars(value);
        if paragraph_chars == 0 || chars + paragraph_chars > budget.max_paragraph_chars {
            break;
        }
        chars += paragraph_chars;
        start -= 1;
    }
    if start == text_blocks.len() || chars > budget.max_paragraph_chars {
        return None;
    }
    let intro_blocks = text_blocks.drain(start..).collect::<Vec<_>>();
    let intro = blocks_to_markdown(&intro_blocks, None, None);
    (!intro.trim().is_empty()).then_some(intro)
}

fn code_outro_markdown(
    next_block: Option<&PresentationBlock>,
    following_block: Option<&PresentationBlock>,
    lines: usize,
    max_line_chars: usize,
    preferences: &PresentationHtmlExportPreferences,
) -> Option<String> {
    if lines > 8 || max_line_chars > 180 {
        return None;
    }
    let budget = presentation_budget(preferences);
    match next_block {
        Some(PresentationBlock::Paragraph(value))
            if value.chars().count() <= budget.max_paragraph_chars / 2
                && !is_list_intro_paragraph(value, following_block) =>
        {
            Some(value.clone())
        }
        _ => None,
    }
}

fn is_list_intro_paragraph(value: &str, following_block: Option<&PresentationBlock>) -> bool {
    let trimmed = value.trim_end();
    (trimmed.ends_with('：') || trimmed.ends_with(':'))
        && matches!(following_block, Some(PresentationBlock::List(_)))
}

fn flush_text_blocks(
    chapter: &str,
    title: &str,
    blocks: &mut Vec<PresentationBlock>,
    preferences: &PresentationHtmlExportPreferences,
    slides: &mut Vec<PresentationSlidePlan>,
) {
    if blocks.is_empty() {
        return;
    }
    if preferences.density == PresentationDensity::Report {
        flush_plain_text_blocks(chapter, title, blocks, preferences, slides);
        blocks.clear();
        return;
    }
    let mut plain_blocks = Vec::new();
    let mut index = 0usize;
    while index < blocks.len() {
        if let Some((intro, items, outro, next_index)) = list_group_at(blocks, index) {
            let intro = match merge_plain_blocks_into_list_intro(&mut plain_blocks, intro.clone(), preferences) {
                Some(merged_intro) => merged_intro,
                None => {
                    flush_plain_text_blocks(chapter, title, &mut plain_blocks, preferences, slides);
                    intro
                }
            };
            push_list_card_slides(chapter, title, intro, list_items_to_cards(&items), outro, preferences, slides);
            index = next_index;
            continue;
        }
        plain_blocks.push(blocks[index].clone());
        index += 1;
    }
    flush_plain_text_blocks(chapter, title, &mut plain_blocks, preferences, slides);
    blocks.clear();
}

fn push_list_card_slides(
    chapter: &str,
    title: &str,
    intro: Option<String>,
    cards: Vec<ListCardPlan>,
    outro: Option<String>,
    _preferences: &PresentationHtmlExportPreferences,
    slides: &mut Vec<PresentationSlidePlan>,
) {
    let counts = landscape_card_chunks(&cards, outro.is_some());
    if counts.len() <= 1 {
        slides.push(PresentationSlidePlan::ListCards {
            chapter: chapter.to_string(),
            title: title.to_string(),
            intro,
            cards,
            outro,
        });
        return;
    }

    let mut start = 0usize;
    let last_index = counts.len().saturating_sub(1);
    for (chunk_index, count) in counts.into_iter().enumerate() {
        let end = (start + count).min(cards.len());
        slides.push(PresentationSlidePlan::ListCards {
            chapter: chapter.to_string(),
            title: title.to_string(),
            intro: (chunk_index == 0).then(|| intro.clone()).flatten(),
            cards: cards[start..end].to_vec(),
            outro: (chunk_index == last_index).then(|| outro.clone()).flatten(),
        });
        start = end;
    }
}

fn landscape_card_chunks(cards: &[ListCardPlan], has_outro: bool) -> Vec<usize> {
    let limit = landscape_card_limit(cards, has_outro);
    if cards.len() <= limit {
        return vec![cards.len()];
    }
    balanced_card_chunks(cards.len(), limit)
}

fn landscape_card_limit(cards: &[ListCardPlan], has_outro: bool) -> usize {
    let max_title_chars = cards.iter().map(|card| card.title.chars().count()).max().unwrap_or(0);
    if cards.len() <= 4 && cards.iter().all(|card| card.body_markdown.trim().is_empty()) && max_title_chars <= 90 {
        return cards.len().max(1);
    }
    let max_units = if has_outro { 13 } else { 16 };
    let max_card_units = cards.iter().map(estimated_card_units).max().unwrap_or(1);
    let limit = (max_units / max_card_units.max(1)).clamp(3, 8);
    limit.min(cards.len().max(1))
}

fn estimated_card_units(card: &ListCardPlan) -> usize {
    let title_lines = card.title.chars().count().div_ceil(26).max(1);
    let body_lines = markdown_text_chars(&card.body_markdown).div_ceil(52);
    title_lines + body_lines
}

fn balanced_card_chunks(total: usize, limit: usize) -> Vec<usize> {
    if total <= limit {
        return vec![total];
    }
    let pages = total.div_ceil(limit);
    let base = total / pages;
    let remainder = total % pages;
    (0..pages)
        .map(|index| base + usize::from(index < remainder))
        .collect()
}

fn merge_plain_blocks_into_list_intro(
    plain_blocks: &mut Vec<PresentationBlock>,
    intro: Option<String>,
    preferences: &PresentationHtmlExportPreferences,
) -> Option<Option<String>> {
    if plain_blocks.len() != 1 || !plain_blocks.iter().all(|block| matches!(block, PresentationBlock::Paragraph(_))) {
        return None;
    }
    let prefix_chars: usize = plain_blocks
        .iter()
        .map(|block| match block {
            PresentationBlock::Paragraph(value) => value.chars().count(),
            _ => 0,
        })
        .sum();
    if prefix_chars > presentation_budget(preferences).max_paragraph_chars {
        return None;
    }
    let prefix = blocks_to_markdown(plain_blocks, None, None);
    plain_blocks.clear();
    let merged = match intro {
        Some(value) if !value.trim().is_empty() => format!("{prefix}\n\n{value}"),
        _ => prefix,
    };
    Some(Some(merged))
}

fn flush_plain_text_blocks(
    chapter: &str,
    title: &str,
    blocks: &mut Vec<PresentationBlock>,
    preferences: &PresentationHtmlExportPreferences,
    slides: &mut Vec<PresentationSlidePlan>,
) {
    if blocks.is_empty() {
        return;
    }
    for (subtitle, markdown) in text_slide_markdown(blocks, preferences) {
        slides.push(PresentationSlidePlan::Text {
            chapter: chapter.to_string(),
            title: title.to_string(),
            subtitle,
            markdown,
        });
    }
    blocks.clear();
}

fn list_group_at(blocks: &[PresentationBlock], index: usize) -> Option<(Option<String>, Vec<String>, Option<String>, usize)> {
    let mut cursor = index;
    let intro = match blocks.get(cursor) {
        Some(PresentationBlock::Paragraph(value)) if matches!(blocks.get(cursor + 1), Some(PresentationBlock::List(_))) => {
            cursor += 1;
            Some(value.clone())
        }
        _ => None,
    };
    let mut items = Vec::new();
    while let Some(PresentationBlock::List(next_items)) = blocks.get(cursor) {
        items.extend(next_items.iter().cloned());
        cursor += 1;
        if next_items.len() == 1 && ordered_list_marker(&next_items[0]).is_some() {
            if let Some(PresentationBlock::Paragraph(value)) = blocks.get(cursor) {
                if let Some(item) = items.last_mut() {
                    item.push_str("\n\n");
                    item.push_str(value);
                }
                cursor += 1;
                continue;
            }
        }
    }
    if items.len() < 2 || !should_render_as_list_cards(&items) {
        return None;
    }
    let outro = match blocks.get(cursor) {
        Some(PresentationBlock::Paragraph(value)) if !matches!(blocks.get(cursor + 1), Some(PresentationBlock::List(_))) => {
            cursor += 1;
            Some(value.clone())
        }
        _ => None,
    };
    Some((intro, items, outro, cursor))
}

fn list_items_to_cards(items: &[String]) -> Vec<ListCardPlan> {
    let mut cards: Vec<ListCardPlan> = Vec::new();
    for item in items {
        if list_item_indent(item) > 0 {
            if let Some(card) = cards.last_mut() {
                let child = list_item_plain_text(item, false);
                if !child.trim().is_empty() {
                    if !card.body_markdown.trim().is_empty() {
                        card.body_markdown.push('\n');
                    }
                    card.body_markdown.push_str("- ");
                    card.body_markdown.push_str(&child);
                }
            }
            continue;
        }
        cards.push(list_item_to_card(item));
    }
    cards
}

fn list_card_layout(intro: Option<&str>, cards: &[ListCardPlan], outro: Option<&str>) -> &'static str {
    let copy_chars =
        intro.unwrap_or_default().chars().count() + outro.unwrap_or_default().chars().count();
    let body_chars: usize = cards.iter().map(|card| card.body_markdown.chars().count()).sum();
    let title_chars: usize = cards.iter().map(|card| card.title.chars().count()).sum();
    let avg_title_chars = title_chars / cards.len().max(1);
    let max_title_chars = cards.iter().map(|card| card.title.chars().count()).max().unwrap_or(0);
    if cards.len() > 6 {
        return "split";
    }
    if copy_chars == 0 && body_chars == 0 && cards.len() <= 4 {
        return "stacked";
    }
    if body_chars > 0 || avg_title_chars > 20 || max_title_chars > 30 {
        "split"
    } else {
        "stacked"
    }
}

fn should_render_as_list_cards(items: &[String]) -> bool {
    !items.iter().any(|item| is_link_only_list_item(item))
}

fn is_link_only_list_item(item: &str) -> bool {
    let stripped = strip_list_marker(item).trim();
    let Some(rest) = stripped.strip_prefix('[').or_else(|| stripped.strip_prefix("`[")) else {
        return false;
    };
    rest.contains("](") && rest.trim_end_matches('`').ends_with(')')
}

fn list_item_to_card(item: &str) -> ListCardPlan {
    let (head, following_body) = item.split_once("\n\n").map_or((item, ""), |(head, body)| (head, body.trim()));
    let stripped = strip_list_marker(head);
    let append_body = |body_markdown: String| {
        if following_body.is_empty() {
            body_markdown
        } else if body_markdown.trim().is_empty() {
            markdown_inline_to_text(following_body)
        } else {
            format!("{body_markdown}\n\n{}", markdown_inline_to_text(following_body))
        }
    };
    if let Some(rest) = stripped.strip_prefix("**") {
        if let Some((title, after_title)) = rest.split_once("**") {
            return ListCardPlan {
                title: list_item_title_text(head, title.trim()),
                body_markdown: append_body(markdown_inline_to_text(after_title.trim_start_matches([':', '：', ' ', '-']).trim())),
            };
        }
    }
    if let Some((title, body)) = stripped
        .split_once('：')
        .or_else(|| stripped.split_once(": "))
    {
        return ListCardPlan {
            title: list_item_title_text(head, title.trim()),
            body_markdown: append_body(markdown_inline_to_text(body.trim())),
        };
    }
    ListCardPlan {
        title: list_item_plain_text(head, true),
        body_markdown: append_body(String::new()),
    }
}

fn list_item_title_text(item: &str, title: &str) -> String {
    if let Some(marker) = ordered_list_marker(item) {
        format!("{marker} {}", markdown_inline_to_text(title))
    } else {
        markdown_inline_to_text(title)
    }
}

fn list_item_plain_text(item: &str, keep_ordered_marker: bool) -> String {
    let stripped = strip_list_marker(item);
    let text = markdown_inline_to_text(stripped.trim());
    if keep_ordered_marker {
        if let Some(marker) = ordered_list_marker(item) {
            return format!("{marker} {text}");
        }
    }
    text
}

fn ordered_list_marker(item: &str) -> Option<String> {
    let trimmed = item.trim_start();
    let (prefix, _) = trimmed.split_once(". ")?;
    (!prefix.is_empty() && prefix.chars().all(|ch| ch.is_ascii_digit())).then(|| format!("{prefix}."))
}

fn list_item_indent(item: &str) -> usize {
    item.chars().take_while(|ch| ch.is_whitespace()).count()
}

fn strip_list_marker(item: &str) -> &str {
    let trimmed = item.trim_start();
    for marker in ["- ", "* ", "+ "] {
        if let Some(rest) = trimmed.strip_prefix(marker) {
            return rest.trim();
        }
    }
    if let Some((prefix, rest)) = trimmed.split_once(". ") {
        if !prefix.is_empty() && prefix.chars().all(|ch| ch.is_ascii_digit()) {
            return rest.trim();
        }
    }
    trimmed
}

fn text_slide_markdown(
    blocks: &[PresentationBlock],
    preferences: &PresentationHtmlExportPreferences,
) -> Vec<(Option<String>, String)> {
    let budget = presentation_budget(preferences);
    let paragraph_split_limit = paragraph_split_limit(preferences, budget);
    let group_budget = semantic_group_budget(preferences, budget);
    let mut slides = Vec::new();
    let mut subtitle: Option<String> = None;
    let mut current = Vec::new();
    let mut current_chars = 0usize;
    let mut current_items = 0usize;

    let push_current = |slides: &mut Vec<(Option<String>, String)>, subtitle: &mut Option<String>, current: &mut Vec<String>, current_chars: &mut usize, current_items: &mut usize| {
        if !current.is_empty() {
            slides.push((subtitle.take(), current.join("\n\n")));
            current.clear();
            *current_chars = 0;
            *current_items = 0;
        }
    };

    let mut block_index = 0usize;
    while block_index < blocks.len() {
        if let Some((group_markdown, next_index)) = question_answer_group_at(blocks, block_index) {
            let chars = markdown_text_chars(&group_markdown);
            if current_chars + chars > group_budget && !current.is_empty() {
                push_current(&mut slides, &mut subtitle, &mut current, &mut current_chars, &mut current_items);
            }
            current.push(group_markdown);
            current_chars += chars;
            current_items += 1;
            block_index = next_index;
            continue;
        }

        let block = &blocks[block_index];
        match block {
            PresentationBlock::Heading { title, .. } => {
                push_current(&mut slides, &mut subtitle, &mut current, &mut current_chars, &mut current_items);
                subtitle = Some(title.clone());
            }
            PresentationBlock::Paragraph(value) => {
                let parts = split_paragraph_for_presentation(value, paragraph_split_limit);
                for part in parts {
                    let chars = part.chars().count();
                    if preferences.density == PresentationDensity::Master && !current.is_empty() {
                        continue;
                    }
                    if current_chars + chars > budget.max_paragraph_chars && !current.is_empty() {
                        if let Some(orphaned_heading) = pop_orphaned_numbered_heading(
                            &mut current,
                            &mut current_chars,
                            &mut current_items,
                        ) {
                            push_current(&mut slides, &mut subtitle, &mut current, &mut current_chars, &mut current_items);
                            current.push(orphaned_heading.clone());
                            current_chars += markdown_text_chars(&orphaned_heading);
                            current_items += 1;
                        } else {
                            push_current(&mut slides, &mut subtitle, &mut current, &mut current_chars, &mut current_items);
                        }
                    }
                    if current_chars + chars > budget.max_paragraph_chars && !current.is_empty() {
                        push_current(&mut slides, &mut subtitle, &mut current, &mut current_chars, &mut current_items);
                    }
                    current.push(part);
                    current_chars += chars;
                }
            }
            PresentationBlock::List(items) => {
                let take_items = if preferences.density == PresentationDensity::Master {
                    items.iter().take(budget.max_list_items).cloned().collect::<Vec<_>>()
                } else {
                    items.clone()
                };
                for chunk in take_items.chunks(budget.max_list_items.max(1)) {
                    if current_items + chunk.len() > budget.max_list_items && !current.is_empty() {
                        push_current(&mut slides, &mut subtitle, &mut current, &mut current_chars, &mut current_items);
                    }
                    let chunk_chars: usize = chunk.iter().map(|item| markdown_text_chars(item)).sum();
                    current.extend(chunk.iter().cloned());
                    current_chars += chunk_chars;
                    current_items += chunk.len();
                }
            }
            PresentationBlock::Quote(value) => {
                let quote_chars = markdown_text_chars(value);
                if !current.is_empty() && current_chars + quote_chars <= budget.max_paragraph_chars {
                    current.push(value.clone());
                    current_chars += quote_chars;
                    push_current(&mut slides, &mut subtitle, &mut current, &mut current_chars, &mut current_items);
                } else {
                    if !current.is_empty() {
                        push_current(&mut slides, &mut subtitle, &mut current, &mut current_chars, &mut current_items);
                    }
                    current.push(value.clone());
                    push_current(&mut slides, &mut subtitle, &mut current, &mut current_chars, &mut current_items);
                }
            }
            _ => {}
        }
        block_index += 1;
    }
    push_current(&mut slides, &mut subtitle, &mut current, &mut current_chars, &mut current_items);
    if slides.is_empty() {
        slides.push((subtitle, String::new()));
    }
    rebalance_short_tail_text_slides(&mut slides, preferences);
    slides
}

fn paragraph_split_limit(
    preferences: &PresentationHtmlExportPreferences,
    budget: PresentationPageBudget,
) -> usize {
    match preferences.density {
        PresentationDensity::Balanced => budget.max_paragraph_chars + 120,
        _ => budget.max_paragraph_chars,
    }
}

fn semantic_group_budget(
    preferences: &PresentationHtmlExportPreferences,
    budget: PresentationPageBudget,
) -> usize {
    match preferences.density {
        PresentationDensity::Balanced => budget.max_paragraph_chars + 100,
        _ => budget.max_paragraph_chars,
    }
}

fn question_answer_group_at(blocks: &[PresentationBlock], index: usize) -> Option<(String, usize)> {
    let PresentationBlock::Paragraph(question) = blocks.get(index)? else {
        return None;
    };
    master_question_title(question)?;

    let mut grouped = Vec::new();
    grouped.push(PresentationBlock::Paragraph(question.clone()));

    let mut cursor = index + 1;
    while let Some(block) = blocks.get(cursor) {
        match block {
            PresentationBlock::Paragraph(value) if master_question_title(value).is_some() => break,
            PresentationBlock::Paragraph(_) | PresentationBlock::List(_) | PresentationBlock::Quote(_) => {
                grouped.push(block.clone());
                cursor += 1;
            }
            _ => break,
        }
    }

    Some((blocks_to_markdown(&grouped, None, None), cursor))
}

fn pop_orphaned_numbered_heading(
    current: &mut Vec<String>,
    current_chars: &mut usize,
    current_items: &mut usize,
) -> Option<String> {
    let last = current.last()?;
    if !is_numbered_heading_list_item(last) {
        return None;
    }
    let orphaned = current.pop()?;
    *current_chars = current_chars.saturating_sub(markdown_text_chars(&orphaned));
    *current_items = current_items.saturating_sub(1);
    Some(orphaned)
}

fn is_numbered_heading_list_item(value: &str) -> bool {
    let trimmed = value.trim_start();
    let Some((prefix, rest)) = trimmed.split_once(". ") else {
        return false;
    };
    if prefix.is_empty() || !prefix.chars().all(|ch| ch.is_ascii_digit()) {
        return false;
    }
    let rest = rest.trim();
    if rest.is_empty() {
        return false;
    }
    if let Some(after_bold) = rest.strip_prefix("**").and_then(|value| value.split_once("**").map(|(_, after)| after)) {
        return after_bold.trim().is_empty();
    }
    markdown_inline_to_text(rest).chars().count() <= 48
}

fn rebalance_short_tail_text_slides(
    slides: &mut Vec<(Option<String>, String)>,
    preferences: &PresentationHtmlExportPreferences,
) {
    if preferences.density != PresentationDensity::Balanced || slides.len() < 2 {
        return;
    }
    let budget = presentation_budget(preferences);
    while slides.len() >= 2 {
        let last_index = slides.len() - 1;
        if slides[last_index].0.is_some() {
            break;
        }
        let previous_chars = markdown_text_chars(&slides[last_index - 1].1);
        let last_chars = markdown_text_chars(&slides[last_index].1);
        if last_chars == 0 || last_chars > 80 {
            break;
        }
        if previous_chars + last_chars > budget.max_paragraph_chars + 100 {
            break;
        }
        let (_, tail) = slides.pop().expect("last slide should exist");
        slides[last_index - 1].1.push_str("\n\n");
        slides[last_index - 1].1.push_str(&tail);
    }
}

fn markdown_text_chars(markdown: &str) -> usize {
    markdown_inline_to_text(markdown).chars().count()
}

fn split_paragraph_for_presentation(value: &str, max_chars: usize) -> Vec<String> {
    if value.chars().count() <= max_chars {
        return vec![value.to_string()];
    }
    let mut output = Vec::new();
    let mut current = String::new();
    for segment in value.split_inclusive(['。', '！', '？', '.', '!', '?']) {
        if current.chars().count() + segment.chars().count() > max_chars && !current.trim().is_empty() {
            output.push(current.trim().to_string());
            current.clear();
        }
        current.push_str(segment);
    }
    if !current.trim().is_empty() {
        output.push(current.trim().to_string());
    }
    if output.is_empty() {
        output.push(truncate_text(value, max_chars));
    }
    output
}

fn table_mode(rows: usize, cols: usize, max_line_chars: usize) -> TableMode {
    if cols > 6 || max_line_chars > 120 {
        TableMode::ScrollX
    } else if rows > 8 {
        TableMode::ScrollY
    } else {
        TableMode::Fit
    }
}

fn code_mode(lines: usize, max_line_chars: usize, preferences: &PresentationHtmlExportPreferences) -> CodeMode {
    let budget = presentation_budget(preferences);
    if lines > budget.max_code_lines || max_line_chars > 120 {
        CodeMode::ScrollY
    } else {
        CodeMode::Fit
    }
}

fn blocks_to_markdown(blocks: &[PresentationBlock], max_chars: Option<usize>, max_items: Option<usize>) -> String {
    let mut output = Vec::new();
    for block in blocks {
        match block {
            PresentationBlock::Paragraph(value) => output.push(max_chars.map_or_else(|| value.clone(), |max| truncate_text(value, max))),
            PresentationBlock::List(items) => {
                output.extend(items.iter().take(max_items.unwrap_or(items.len())).cloned());
            }
            PresentationBlock::Quote(value) => output.push(value.clone()),
            PresentationBlock::Heading { level, title } => {
                output.push(format!("{} {}", "#".repeat((*level).into()), title));
            }
            _ => {}
        }
    }
    output.join("\n\n")
}

fn render_presentation_slide(
    plan: &PresentationSlidePlan,
    index: usize,
    total: usize,
    chapter_label: Option<usize>,
    input: &MarkdownHtmlExportInput,
    preferences: &PresentationHtmlExportPreferences,
    embedder: &mut ImageEmbedder,
) -> String {
    let active = if index == 1 { " is-active" } else { "" };
    match plan {
        PresentationSlidePlan::Cover { title } => format!(
            r#"<section class="slide cover density-{density}{active}" data-slide-kind="cover" data-density="{density}" data-slide-index="{index}" data-page-index="{index}" data-title="{title_attr}">
  <div class="cover-copy">
    <p class="kicker">Markdown Presentation</p>
    <h1 class="cover-title">{title}</h1>
  </div>
  <div class="deck-footer"><span>{source}</span><span>{index}/{total}</span></div>
</section>"#,
            density = preferences.density.key(),
            active = active,
            index = index,
            title_attr = escape_html_attr(title),
            title = escape_html_text(title),
            source = escape_html_text(&input.source_file),
            total = total,
        ),
        PresentationSlidePlan::Chapter { title } => format!(
            r#"<section class="slide chapter density-{density}{active}" data-slide-kind="chapter" data-density="{density}" data-slide-index="{index}" data-page-index="{index}" data-title="{title_attr}">
  <div class="chapter-copy">
    <span class="chapter-index">Chapter · {label}</span>
    <h2 class="chapter-title">{title}</h2>
  </div>
  <div class="deck-footer"><span>{source}</span><span>{index}/{total}</span></div>
</section>"#,
            density = preferences.density.key(),
            active = active,
            index = index,
            label = format!("{:02}", chapter_label.unwrap_or(0)),
            title_attr = escape_html_attr(title),
            title = escape_html_text(title),
            source = escape_html_text(&input.source_file),
            total = total,
        ),
        PresentationSlidePlan::Statement { chapter, title, note } => {
            let note_html = note
                .as_ref()
                .filter(|value| !value.trim().is_empty())
                .map(|value| format!(r#"<p class="statement-note">{}</p>"#, escape_html_text(value)))
                .unwrap_or_default();
            format!(
                r#"<section class="slide statement density-{density}{active}" data-slide-kind="statement" data-density="{density}" data-topic-title="{title_attr}" data-slide-index="{index}" data-page-index="{index}" data-title="{title_attr}">
  <p class="kicker">{chapter}</p>
  <div class="statement-rule"></div>
  <h2 class="statement-title">{title}</h2>
  {note}
  <div class="deck-footer"><span>{source}</span><span>{index}/{total}</span></div>
</section>"#,
                density = preferences.density.key(),
                active = active,
                index = index,
                title_attr = escape_html_attr(title),
                chapter = escape_html_text(chapter),
                title = escape_html_text(title),
                note = note_html,
                source = escape_html_text(&input.source_file),
                total = total,
            )
        }
        PresentationSlidePlan::TopicCards { chapter, cards } => {
            let cards_html = cards
                .iter()
                .map(|card| {
                    let body = embedder.embed_images(&render_markdown_html(&card.summary_markdown));
                    format!(
                        r#"<article class="topic-card" data-topic-title="{title_attr}"><h3>{title}</h3><div class="topic-card-body">{body}</div></article>"#,
                        title_attr = escape_html_attr(&card.title),
                        title = escape_html_text(&card.title),
                        body = body,
                    )
                })
                .collect::<Vec<_>>()
                .join("");
            format!(
                r#"<section class="slide topic-cards density-{density}{active}" data-slide-kind="topic-cards" data-density="{density}" data-slide-index="{index}" data-page-index="{index}" data-title="{chapter_attr}">
  <p class="kicker">{chapter}</p>
  <div class="topic-card-grid" data-card-count="{count}">{cards}</div>
  <div class="deck-footer"><span>{source}</span><span>{index}/{total}</span></div>
</section>"#,
                density = preferences.density.key(),
                active = active,
                index = index,
                chapter_attr = escape_html_attr(chapter),
                chapter = escape_html_text(chapter),
                count = cards.len(),
                cards = cards_html,
                source = escape_html_text(&input.source_file),
                total = total,
            )
        }
        PresentationSlidePlan::Text { chapter, title, subtitle, markdown } => {
            let content = embedder.embed_images(&render_markdown_html(markdown));
            render_content_slide(
                "text",
                preferences,
                active,
                index,
                total,
                input,
                chapter,
                title,
                subtitle.as_deref(),
                &format!(r#"<div class="slide-content text-flow">{content}</div>"#),
            )
        }
        PresentationSlidePlan::ListCards {
            chapter,
            title,
            intro,
            cards,
            outro,
        } => {
            let layout = list_card_layout(intro.as_deref(), cards, outro.as_deref());
            let intro_html = intro
                .as_ref()
                .map(|value| {
                    format!(
                        r#"<div class="list-card-intro">{}</div>"#,
                        embedder.embed_images(&render_markdown_html(value))
                    )
                })
                .unwrap_or_default();
            let outro_html = outro
                .as_ref()
                .map(|value| {
                    format!(
                        r#"<div class="list-card-outro">{}</div>"#,
                        embedder.embed_images(&render_markdown_html(value))
                    )
                })
                .unwrap_or_default();
            let cards_html = cards
                .iter()
                .map(|card| {
                    let body = if card.body_markdown.trim().is_empty() {
                        String::new()
                    } else {
                        embedder.embed_images(&render_markdown_html(&card.body_markdown))
                    };
                    format!(
                        r#"<article class="list-card"><h3 class="list-card-title">{title}</h3><div class="list-card-body">{body}</div></article>"#,
                        title = escape_html_text(&card.title),
                        body = body,
                    )
                })
                .collect::<Vec<_>>()
                .join("");
            render_content_slide(
                "list-cards",
                preferences,
                active,
                index,
                total,
                input,
                chapter,
                title,
                None,
                &render_list_card_layout(layout, &intro_html, &cards_html, &outro_html, cards.len()),
            )
        }
        PresentationSlidePlan::Figure { chapter, title, markdown, layout, aside_markdown } => {
            let content = embedder.embed_images(&render_markdown_html(markdown));
            let aside_html = aside_markdown
                .as_ref()
                .filter(|value| !value.trim().is_empty())
                .map(|value| {
                    format!(
                        r#"<div class="figure-copy">{}</div>"#,
                        embedder.embed_images(&render_markdown_html(value))
                    )
                })
                .unwrap_or_default();
            render_content_slide(
                "figure",
                preferences,
                active,
                index,
                total,
                input,
                chapter,
                title,
                None,
                &format!(
                    r#"<div class="figure-layout {class_name}" data-figure-layout="{layout}">{aside}<div class="figure-media">{content}</div></div>"#,
                    class_name = layout.class_name(),
                    layout = layout.key(),
                    aside = aside_html,
                    content = content,
                ),
            )
        }
        PresentationSlidePlan::Table { chapter, title, markdown, mode } => {
            let content = render_markdown_html(markdown);
            render_content_slide(
                "table",
                preferences,
                active,
                index,
                total,
                input,
                chapter,
                title,
                None,
                &format!(
                    r#"<div class="table-frame {mode}" data-table-mode="{mode}">{content}</div>"#,
                    mode = mode.class_name(),
                    content = content,
                ),
            )
        }
        PresentationSlidePlan::Code { chapter, title, language, code, mode, intro_markdown, outro_markdown } => {
            let code_html = escape_html_text(code);
            let language_label = language.as_deref().unwrap_or("code");
            let intro_html = intro_markdown
                .as_ref()
                .filter(|value| !value.trim().is_empty())
                .map(|value| {
                    format!(
                        r#"<div class="code-intro">{}</div>"#,
                        embedder.embed_images(&render_markdown_html(value))
                    )
                })
                .unwrap_or_default();
            let outro_html = outro_markdown
                .as_ref()
                .filter(|value| !value.trim().is_empty())
                .map(|value| {
                    format!(
                        r#"<div class="code-outro">{}</div>"#,
                        embedder.embed_images(&render_markdown_html(value))
                    )
                })
                .unwrap_or_default();
            render_content_slide(
                "code",
                preferences,
                active,
                index,
                total,
                input,
                chapter,
                title,
                Some(language_label),
                &format!(
                    r#"{intro}<pre class="code-frame {mode}" data-code-mode="{mode}"><code>{code}</code></pre>{outro}"#,
                    intro = intro_html,
                    mode = mode.class_name(),
                    code = code_html,
                    outro = outro_html,
                ),
            )
        }
        PresentationSlidePlan::Thanks => format!(
            r#"<section class="slide thanks density-{density}{active}" data-slide-kind="thanks" data-density="{density}" data-slide-index="{index}" data-page-index="{index}" data-title="Thanks">
  <div class="thanks-content">
    <h2>Thanks</h2>
    <p><span>by</span><img class="thanks-logo" src="{{{{logo_data_uri}}}}" alt="NUTBOOK"></p>
  </div>
  <div class="deck-footer"><span>{source}</span><span>{index}/{total}</span></div>
</section>"#,
            density = preferences.density.key(),
            active = active,
            index = index,
            source = escape_html_text(&input.source_file),
            total = total,
        ),
    }
}

fn render_content_slide(
    kind: &str,
    preferences: &PresentationHtmlExportPreferences,
    active: &str,
    index: usize,
    total: usize,
    input: &MarkdownHtmlExportInput,
    chapter: &str,
    title: &str,
    subtitle: Option<&str>,
    body: &str,
) -> String {
    let subtitle_html = subtitle
        .filter(|value| !value.trim().is_empty())
        .map(|value| format!(r#"<p class="slide-subtitle">{}</p>"#, escape_html_text(value)))
        .unwrap_or_default();
    let kicker_html = if normalized_title_text(chapter) == normalized_title_text(title) {
        String::new()
    } else {
        format!(r#"<p class="kicker">{}</p>"#, escape_html_text(chapter))
    };
    format!(
        r#"<section class="slide {kind} density-{density}{active}" data-slide-kind="{kind}" data-density="{density}" data-topic-title="{title_attr}" data-slide-index="{index}" data-page-index="{index}" data-title="{title_attr}">
  {kicker}
  <h2 class="slide-title">{title}</h2>
  {subtitle}
  {body}
  <div class="deck-footer"><span>{source}</span><span>{index}/{total}</span></div>
</section>"#,
        kind = kind,
        density = preferences.density.key(),
        active = active,
        index = index,
        title_attr = escape_html_attr(title),
        kicker = kicker_html,
        title = escape_html_text(title),
        subtitle = subtitle_html,
        body = body,
        source = escape_html_text(&input.source_file),
        total = total,
    )
}

fn normalized_title_text(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn render_list_card_layout(
    layout: &str,
    intro_html: &str,
    cards_html: &str,
    outro_html: &str,
    card_count: usize,
) -> String {
    if layout == "split" {
        return format!(
            r#"<div class="list-card-layout split" data-layout="split"><div class="list-card-copy">{intro}{outro}</div><div class="list-card-grid" data-card-count="{count}">{cards}</div></div>"#,
            intro = intro_html,
            outro = outro_html,
            count = card_count,
            cards = cards_html,
        );
    }
    format!(
        r#"<div class="list-card-layout stacked" data-layout="stacked"><div class="list-card-copy">{intro}</div><div class="list-card-grid" data-card-count="{count}">{cards}</div></div>{outro}"#,
        intro = intro_html,
        count = card_count,
        cards = cards_html,
        outro = outro_html,
    )
}

fn is_markdown_list_item(line: &str) -> bool {
    let trimmed = line.trim_start();
    trimmed.starts_with("- ")
        || trimmed.starts_with("* ")
        || trimmed.starts_with("+ ")
        || trimmed
            .split_once(". ")
            .is_some_and(|(prefix, _)| !prefix.is_empty() && prefix.chars().all(|ch| ch.is_ascii_digit()))
}

fn truncate_text(value: &str, max_chars: usize) -> String {
    let count = value.chars().count();
    if count <= max_chars {
        return value.to_string();
    }
    let truncated = value.chars().take(max_chars.saturating_sub(1)).collect::<String>();
    format!("{truncated}…")
}

fn markdown_inline_to_text(value: &str) -> String {
    let chars = value.chars().collect::<Vec<_>>();
    let mut output = String::new();
    let mut index = 0usize;
    while index < chars.len() {
        let ch = chars[index];
        if ch == '!' && chars.get(index + 1) == Some(&'[') {
            if let Some((label, next)) = markdown_link_label(&chars, index + 1) {
                output.push_str(&markdown_inline_to_text(&label));
                index = next;
                continue;
            }
        }
        if ch == '[' {
            if let Some((label, next)) = markdown_link_label(&chars, index) {
                output.push_str(&markdown_inline_to_text(&label));
                index = next;
                continue;
            }
        }
        if matches!(ch, '`' | '*') {
            index += 1;
            continue;
        }
        if ch == '\\' {
            if let Some(next) = chars.get(index + 1) {
                output.push(*next);
                index += 2;
                continue;
            }
        }
        output.push(ch);
        index += 1;
    }
    output.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn markdown_link_label(chars: &[char], start: usize) -> Option<(String, usize)> {
    if chars.get(start) != Some(&'[') {
        return None;
    }
    let mut end = start + 1;
    while end < chars.len() && chars[end] != ']' {
        end += 1;
    }
    if chars.get(end) != Some(&']') || chars.get(end + 1) != Some(&'(') {
        return None;
    }
    let mut close = end + 2;
    while close < chars.len() && chars[close] != ')' {
        close += 1;
    }
    if chars.get(close) != Some(&')') {
        return None;
    }
    Some((chars[start + 1..end].iter().collect::<String>(), close + 1))
}

fn is_markdown_table_start(lines: &[&str], index: usize) -> bool {
    let Some(next) = lines.get(index + 1) else {
        return false;
    };
    let header = lines[index].trim();
    let separator = next.trim();
    header.contains('|')
        && separator.contains('|')
        && separator
            .chars()
            .all(|ch| ch == '|' || ch == '-' || ch == ':' || ch.is_whitespace())
}

fn first_markdown_h1(markdown: &str) -> Option<String> {
    markdown_headings_outside_code(markdown)
        .into_iter()
        .find_map(|(level, title)| (level == 1).then_some(title))
}

fn remove_first_markdown_h1(markdown: &str) -> String {
    let mut removed = false;
    let mut active_fence: Option<(char, usize)> = None;
    let mut lines = Vec::new();
    for line in markdown.lines() {
        if let Some((marker, len)) = active_fence {
            lines.push(line);
            if is_code_fence_end(line, marker, len) {
                active_fence = None;
            }
            continue;
        }
        if let Some(fence) = parse_code_fence_start(line) {
            active_fence = Some((fence.marker, fence.len));
            lines.push(line);
            continue;
        }
        if !removed && matches!(markdown_heading(line), Some((1, _))) {
            removed = true;
            continue;
        }
        lines.push(line);
    }
    lines.join("\n")
}

fn add_heading_ids(html: &str, markdown: &str) -> String {
    let mut output = html.to_string();
    for (level, title) in markdown_headings_outside_code(markdown) {
        let id = heading_id(&title);
        let open = format!("<h{level}>");
        let with_id = format!(r#"<h{level} id="{}">"#, escape_html_attr(&id));
        output = output.replacen(&open, &with_id, 1);
    }
    output
}

fn markdown_headings_outside_code(markdown: &str) -> Vec<(u8, String)> {
    let mut headings = Vec::new();
    let mut active_fence: Option<(char, usize)> = None;
    for line in markdown.lines() {
        if let Some((marker, len)) = active_fence {
            if is_code_fence_end(line, marker, len) {
                active_fence = None;
            }
            continue;
        }
        if let Some(fence) = parse_code_fence_start(line) {
            active_fence = Some((fence.marker, fence.len));
            continue;
        }
        if let Some(heading) = markdown_heading(line) {
            headings.push(heading);
        }
    }
    headings
}

fn markdown_heading(line: &str) -> Option<(u8, String)> {
    let trimmed = line.trim_start();
    let hashes = trimmed.chars().take_while(|value| *value == '#').count();
    if !(1..=6).contains(&hashes) {
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
        default_markdown_html_file_name, fallback_presentation_light_template, fallback_reading_light_template,
        parse_presentation_blocks, render_presentation_html, render_reading_html, text_slide_markdown,
        MarkdownHtmlExportInput, MarkdownHtmlExportPreferences, PresentationBlock, PresentationDensity,
        PresentationHtmlExportPreferences, ReadingWidth,
    };

    fn temp_path(name: &str) -> std::path::PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("nutbook-markdown-export-{name}-{nanos}"))
    }

    fn list_card_counts(html: &str) -> Vec<usize> {
        html.match_indices(r#"data-slide-kind="list-cards""#)
            .filter_map(|(index, needle)| {
                let section = html.get(index + needle.len()..)?;
                let count_index = section.find(r#"data-card-count=""#)?;
                let start = count_index + r#"data-card-count=""#.len();
                let rest = section.get(start..)?;
                let end = rest.find('"')?;
                rest.get(..end)?.parse::<usize>().ok()
            })
            .collect()
    }

    fn png_header(width: u32, height: u32) -> Vec<u8> {
        let mut bytes = vec![137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, b'I', b'H', b'D', b'R'];
        bytes.extend(width.to_be_bytes());
        bytes.extend(height.to_be_bytes());
        bytes.extend([8, 6, 0, 0, 0]);
        bytes
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

        assert!(!output.html.contains(r#"<h1 id="title">Title</h1>"#));
        assert!(output.html.contains("<blockquote>"));
        assert!(output.html.contains("<table>"));
        assert!(output.html.contains("<title>Title</title>"));
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
            template_html: fallback_reading_light_template().to_string(),
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
        assert!(output.html.contains("thead tr:first-child th:first-child { border-top-left-radius: 13px; }"));
        assert!(output.html.contains("thead tr:first-child th:last-child { border-top-right-radius: 13px; }"));
        assert!(output.html.contains("data-copy-code"));
        assert!(output.html.contains(r#"<svg class="code-copy-icon""#));
        assert!(output.html.contains(r#"button.setAttribute("aria-label", "复制代码")"#));
        assert!(output.html.contains(r#"tooltip.className = "code-copy-tooltip""#));
        assert!(output.html.contains(r#"tooltip.dataset.copyTooltip = "true""#));
        assert!(output.html.contains(r#"tooltip.textContent = "复制代码""#));
        assert!(output.html.contains(r#"tooltip.textContent = "复制成功""#));
        assert!(output.html.contains(r#"tooltip.classList.add("visible", "success")"#));
        assert!(output.html.contains(r#"wrapper.className = "code-block""#));
        assert!(output.html.contains(r#"toolbar.className = "code-toolbar""#));
        assert!(output.html.contains("wrapper.appendChild(toolbar)"));
        assert!(output.html.contains("wrapper.appendChild(pre)"));
        assert!(output.html.contains(r#"language.className = "code-language""#));
        assert!(output.html.contains("language.textContent = codeLanguage(pre)"));
        assert!(output.html.contains("toolbar.appendChild(language)"));
        assert!(output.html.contains(r#"return found.replace(/^language-/, "").trim() || "text";"#));
        assert!(output.html.contains(".code-block { margin: 0 0 18px; overflow: hidden; border-radius: 8px; background: #2f3132;"));
        assert!(output.html.contains(".code-block pre { margin: 0; border-radius: 0; background: transparent;"));
        assert!(output.html.contains(".code-block pre code { background: transparent; color: inherit; }"));
        assert!(output.html.contains(".code-toolbar { min-height: 42px; padding: 8px 10px 2px 14px; display: flex; align-items: center; justify-content: space-between;"));
        assert!(output.html.contains(".code-language { color: rgba(240,240,242,0.52); font-size: 12px; font-weight: 800;"));
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
            template_html: fallback_reading_light_template().to_string(),
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
            template_html: fallback_reading_light_template().to_string(),
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
            template_html: fallback_reading_light_template().to_string(),
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
        assert!(!output.html.contains(r##"href="#intro""##));
        assert!(!output.html.contains(r#"<h1 id="intro">Intro</h1>"#));
        assert!(output.html.contains(r##"href="#details""##));
        assert!(output.html.contains(r##"class="depth-3" href="#more""##));
    }

    #[test]
    fn reading_outline_can_collapse_and_defaults_collapsed_for_compact_width() {
        let output = render_reading_html(MarkdownHtmlExportInput {
            title: "Outline".to_string(),
            source_file: "outline.md".to_string(),
            source_path: temp_path("outline-compact").with_extension("md"),
            markdown: "# Intro\n\n## Part\n\n### More\n\nText".to_string(),
            generated_at: "修改时间：2026-06-15 10:00".to_string(),
            template_html: fallback_reading_light_template().to_string(),
            preferences: MarkdownHtmlExportPreferences {
                outline: true,
                width: ReadingWidth::Compact,
                ..MarkdownHtmlExportPreferences::default()
            },
        })
        .expect("reading html should render");

        assert!(output.html.contains(r#"<body class="outline-collapsed">"#));
        assert!(output.html.contains(r#"class="export-outline-toggle""#));
        assert!(output.html.contains(r#"class="export-outline-tooltip""#));
        assert!(output.html.contains("data-outline-toggle"));
        assert!(output.html.contains("outline-collapsed"));
    }

    #[test]
    fn reading_outline_starts_expanded_for_non_compact_width() {
        let output = render_reading_html(MarkdownHtmlExportInput {
            title: "Outline".to_string(),
            source_file: "outline.md".to_string(),
            source_path: temp_path("outline-wide").with_extension("md"),
            markdown: "# Intro\n\n## Part\n\n### More\n\nText".to_string(),
            generated_at: "修改时间：2026-06-15 10:00".to_string(),
            template_html: fallback_reading_light_template().to_string(),
            preferences: MarkdownHtmlExportPreferences {
                outline: true,
                width: ReadingWidth::Wide,
                ..MarkdownHtmlExportPreferences::default()
            },
        })
        .expect("reading html should render");

        assert!(output.html.contains(r#"<body class="">"#));
        assert!(output.html.contains(r#"class="export-outline-toggle""#));
        assert!(output.html.contains(r#"aria-expanded="true""#));
    }

    #[test]
    fn reading_template_prevents_content_from_expanding_page_frame() {
        let output = render_reading_html(MarkdownHtmlExportInput {
            title: "2026-05-22-markdown-export-center-design.md".to_string(),
            source_file: "2026-05-22-markdown-export-center-design.md".to_string(),
            source_path: temp_path("reading-overflow").with_extension("md"),
            markdown: "# Long\n\n```text\n点击更多菜单“导出...” -> 检查当前 Markdown tab -> 检查未保存修改 -> 必要时弹出二选一 -> 保存成功或无未保存修改 -> 打开导出弹窗\n```".to_string(),
            generated_at: "修改时间：2026-06-15 10:00".to_string(),
            template_html: fallback_reading_light_template().to_string(),
            preferences: MarkdownHtmlExportPreferences::default(),
        })
        .expect("reading html should render");

        assert!(output.html.contains("article { min-width: 0; overflow-wrap: break-word; }"));
        assert!(output.html.contains("header h1 { overflow-wrap: anywhere; }"));
        assert!(output.html.contains("pre { max-width: 100%;"));
    }

    #[test]
    fn presentation_html_builds_static_deck_with_slide_controls() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Quarterly Plan".to_string(),
                source_file: "plan.md".to_string(),
                source_path: temp_path("presentation").with_extension("md"),
                markdown: "# Quarterly Plan\n\nIntro paragraph.\n\n## Problem\n\n- Too many files\n- Hard to present\n\n### Evidence\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n## Next\n\nShip it.".to_string(),
                generated_at: "修改时间：2026-06-13 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains(r#"<main class="deck aspect-16-9""#));
        assert!(output.html.contains(r#"data-slide-kind="cover""#));
        assert!(output.html.contains(r#"data-density="balanced""#));
        assert!(!output.html.contains("overflow: auto"));
        assert!(output.html.contains("Quarterly Plan"));
        assert!(output.html.contains("Problem"));
        assert!(output.html.contains("data-presentation-controls"));
        assert!(output.html.contains("requestFullscreen"));
        assert!(!output.html.contains("brand-row"));
        assert!(!output.html.contains("修改时间：2026-06-13 10:00"));
        assert!(output.html.contains("Thanks"));
    }

    #[test]
    fn presentation_html_uses_first_heading_as_cover_title() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "README.md".to_string(),
                source_file: "README.md".to_string(),
                source_path: temp_path("presentation-title").with_extension("md"),
                markdown: "# 内文标题\n\n## 第一节\n\n正文".to_string(),
                generated_at: "修改时间：2026-06-13 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains(r#"<h1 class="cover-title">内文标题</h1>"#));
        assert!(!output.html.contains(r#"<h1 class="cover-title">README.md</h1>"#));
        assert!(!output.html.contains(r#"<h2 class="slide-title">内文标题</h2>"#));
    }

    #[test]
    fn presentation_html_splits_table_and_following_paragraph() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Keyboard".to_string(),
                source_file: "keyboard.md".to_string(),
                source_path: temp_path("presentation-table").with_extension("md"),
                markdown: "## HTML 演示\n\n| 快捷键 | 功能 | 说明 |\n| - | - | - |\n| F | 切换全屏 | 在 HTML 预览中进入展示 |\n| Esc | 退出全屏 | 当前 HTML 处于全屏时退出 |\n\nHTML 快捷键会优先交给当前打开的 HTML 页面处理。".to_string(),
                generated_at: "修改时间：2026-06-13 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains(r#"data-slide-kind="table""#));
        assert!(output.html.contains("table-fit"));
        assert!(output.html.contains(r#"data-slide-kind="text""#));
        assert!(output.html.contains("HTML 快捷键会优先交给当前打开的 HTML 页面处理"));
        assert!(!output.html.contains("HTML 演示（续）"));
    }

    #[test]
    fn presentation_html_keeps_short_code_with_intro_text() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Menu".to_string(),
                source_file: "menu.md".to_string(),
                source_path: temp_path("presentation-short-code-intro").with_extension("md"),
                markdown: "## 导出中心交互\n\n### 4.1 入口\n\nMarkdown 页面右上角更多菜单中新增或替换为：\n\n```text\n保存\n另存为\n导出...\n```\n\n后续说明应该独立处理。".to_string(),
                generated_at: "修改时间：2026-06-15 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert_eq!(output.html.matches(r#"data-slide-kind="code""#).count(), 1);
        let intro_index = output.html.find("Markdown 页面右上角更多菜单中新增或替换为").expect("intro should render");
        let code_index = output.html.find(r#"<pre class="code-frame"#).expect("code should render");
        assert!(!output.html[intro_index..code_index].contains(r#"<section class="slide"#));
        assert!(output.html.contains(r#"class="code-intro""#));
    }

    #[test]
    fn presentation_html_keeps_multiple_short_intro_paragraphs_with_code() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Summary".to_string(),
                source_file: "summary.md".to_string(),
                source_path: temp_path("presentation-code-multi-intro").with_extension("md"),
                markdown: "## 五、口语摘要层设计\n\n### 5.1 设计思路\n\n问题：OpenClaw 完整回复包含大量工具调用细节、代码片段、冗长解释，直接送给 TTS 播报体验很差。\n\n解决：在 Bridge 和 TTS 之间插入**口语摘要层**：\n\n```text\nOpenClaw 完整回复\n  ↓\n  ├→ [去格式化] → 去掉 markdown、代码块、URL、工具日志\n  └→ [TTS 流式] → 边合成边播放\n```".to_string(),
                generated_at: "修改时间：2026-06-15 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert_eq!(output.html.matches(r#"data-slide-kind="code""#).count(), 1);
        assert!(!output.html.contains(r#"data-slide-kind="text""#));
        let problem_index = output.html.find("问题：OpenClaw 完整回复").expect("problem should render");
        let solution_index = output.html.find("解决：在 Bridge 和 TTS").expect("solution should render");
        let code_index = output.html.find(r#"<pre class="code-frame"#).expect("code should render");
        assert!(!output.html[problem_index..solution_index].contains(r#"<section class="slide"#));
        assert!(!output.html[solution_index..code_index].contains(r#"<section class="slide"#));
        assert!(output.html.contains(r#"class="code-intro""#));
    }

    #[test]
    fn presentation_html_keeps_trailing_intro_with_code_after_previous_list() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Unsaved".to_string(),
                source_file: "unsaved.md".to_string(),
                source_path: temp_path("presentation-code-after-list").with_extension("md"),
                markdown: "## 导出中心交互\n\n### 4.3 未保存修改\n\n进入导出中心前检查当前 Markdown tab 是否存在未保存修改。\n\n- 当前内容来自 `markdownContentForTab(tab)`\n- baseline 使用现有 `markdownBaseline`\n\n如果有未保存修改，先显示应用级确认弹窗：\n\n```text\n当前 Markdown 有未保存修改。请先保存后再继续。\n\n保存并继续\n取消\n```".to_string(),
                generated_at: "修改时间：2026-06-15 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        let intro_index = output
            .html
            .find("如果有未保存修改，先显示应用级确认弹窗")
            .expect("intro should render");
        let code_index = output.html.find(r#"<pre class="code-frame"#).expect("code should render");
        assert!(!output.html[intro_index..code_index].contains(r#"<section class="slide"#));
        assert!(output.html.contains(r#"class="code-intro""#));
    }

    #[test]
    fn presentation_html_keeps_short_code_with_intro_and_following_note() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Template".to_string(),
                source_file: "template.md".to_string(),
                source_path: temp_path("presentation-short-code-note").with_extension("md"),
                markdown: "## HTML 模板\n\n### 5.1 模板目录\n\n模板必须包含 `<meta charset=\"UTF-8\">`。字体栈使用：\n\n```css\nfont-family: Inter, \"PingFang SC\", system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif;\n```\n\n独立 HTML 接受系统字体 fallback，不要求与 Nutbook 应用内像素级一致。".to_string(),
                generated_at: "修改时间：2026-06-15 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert_eq!(output.html.matches(r#"data-slide-kind="code""#).count(), 1);
        assert!(!output.html.contains(r#"data-slide-kind="text""#));
        let code_index = output.html.find(r#"<pre class="code-frame"#).expect("code should render");
        let note_index = output
            .html
            .find("独立 HTML 接受系统字体 fallback")
            .expect("following note should render");
        assert!(!output.html[code_index..note_index].contains(r#"<section class="slide"#));
        assert!(output.html.contains(r#"class="code-outro""#));
    }

    #[test]
    fn presentation_html_preserves_nested_fence_python_comments_as_code() {
        let markdown = "## 四、自定义唤醒词方案\n\n### 4.3 自定义唤醒词配置\n\n````markdown\n```python\n# config.py\nWAKE_WORD = \"来钳\"\n# Porcupine 模型路径\nWAKE_WORD_MODEL_PATH = \"./models/wake_word/lizi_mac.ppn\"\n```\n````";
        let blocks = parse_presentation_blocks(markdown);
        assert!(blocks.iter().any(|block| matches!(
            block,
            PresentationBlock::Code { body, .. }
                if body.contains("# config.py") && body.contains("# Porcupine 模型路径")
        )));
        assert!(!blocks.iter().any(|block| matches!(
            block,
            PresentationBlock::Heading { title, .. }
                if title == "config.py" || title == "Porcupine 模型路径"
        )));

        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Fence".to_string(),
                source_file: "fence.md".to_string(),
                source_path: temp_path("presentation-nested-fence").with_extension("md"),
                markdown: markdown.to_string(),
                generated_at: "修改时间：2026-06-15 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(!output.html.contains(r#"data-title="config.py""#));
        assert!(!output.html.contains(r#"data-title="Porcupine 模型路径""#));
    }

    #[test]
    fn presentation_html_keeps_intro_quote_together_and_omits_thematic_break() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Reference".to_string(),
                source_file: "reference.md".to_string(),
                source_path: temp_path("presentation-intro-quote-hr").with_extension("md"),
                markdown: "# AI 可编辑设计工具\n\n## 0. 一句话定位\n\n不要做一个单纯的“AI 出图工具”，而是做一个：\n\n> **本地-first 的 AI 视觉资产与可编辑设计编译器**\n> 从视觉灵感 / Prompt / 参考图 / Web UI / Skill 中检索灵感，调用模型生成设计。\n\n---\n\n## 1. 产品链路总览\n\n下一章。".to_string(),
                generated_at: "修改时间：2026-06-15 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        let intro_index = output.html.find("不要做一个单纯").expect("intro should render");
        let quote_index = output.html.find("本地-first").expect("quote should render");
        assert!(!output.html[intro_index..quote_index].contains(r#"<section class="slide"#));
        assert!(!output.html.contains("<hr"));
    }

    #[test]
    fn presentation_html_does_not_attach_list_intro_after_code_as_outro() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Template".to_string(),
                source_file: "template.md".to_string(),
                source_path: temp_path("presentation-code-before-list-intro").with_extension("md"),
                markdown: "## HTML 模板\n\n### 5.1 模板目录\n\n第一版建议建立模板目录：\n\n```text\nsrc-tauri/resources/export-templates/\n  markdown-reading-light.html\n```\n\n模板目录的意义：\n\n- 避免把大段 HTML/CSS 作为 Rust 字符串长期维护\n- 让导出模板成为 Tauri 后端资源".to_string(),
                generated_at: "修改时间：2026-06-15 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        let code_index = output.html.find(r#"<pre class="code-frame"#).expect("code should render");
        let list_intro_index = output.html.find("模板目录的意义").expect("list intro should render");
        assert!(output.html[code_index..list_intro_index].contains(r#"<section class="slide"#));
        assert!(!output.html.contains(r#"class="code-outro"><p>模板目录的意义："#));
        assert!(output.html.contains(r#"data-slide-kind="list-cards""#));
    }

    #[test]
    fn presentation_html_preserves_inline_markdown_in_text_slides() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Inline".to_string(),
                source_file: "inline.md".to_string(),
                source_path: temp_path("presentation-inline-markdown").with_extension("md"),
                markdown: "## 导出中心交互\n\n### 4.1 入口\n\n新的 `导出...` 是新增菜单项，进入 **Markdown 导出中心**。".to_string(),
                generated_at: "修改时间：2026-06-15 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains("<code>导出...</code>"));
        assert!(output.html.contains("<strong>Markdown 导出中心</strong>"));
    }

    #[test]
    fn presentation_html_splits_long_body_without_omission_notice() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Summary".to_string(),
                source_file: "summary.md".to_string(),
                source_path: temp_path("presentation-summary").with_extension("md"),
                markdown: "## 重点\n\n第一段应该保留，因为它承载这一页的核心观点。\n\n第二段可以保留一部分，但是过长的时候应该被截断以适合演示阅读。\n\n第三段不应该完整进入演示页面。\n\n第四段也不应该进入演示页面。\n\n- 关键点一\n- 关键点二\n- 关键点三\n- 关键点四\n- 关键点五\n- 关键点六".to_string(),
                generated_at: "修改时间：2026-06-13 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains(r#"data-slide-kind="text""#));
        assert!(output.html.contains("第一段应该保留"));
        assert!(output.html.contains("第四段也不应该进入演示页面"));
        assert!(output.html.contains("关键点六"));
        assert!(!output.html.contains("演示版已省略部分内容"));
        assert!(!output.html.contains("continued"));
    }

    #[test]
    fn presentation_html_merges_short_tail_text_slide_back() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Summary".to_string(),
                source_file: "summary.md".to_string(),
                source_path: temp_path("presentation-short-tail").with_extension("md"),
                markdown: "## 更新摘要\n\n本版本基于 v0.3 做了以下关键调整：\n\n1. **将“项目目录”统一改为“Workspace 工作区目录”**\n\nQSkills 不只服务代码项目，也服务营销、公关、内容创作、客户项目资料夹等工作目录。\n\n2. **将 P0 拆分为 P0a / P0b**\n\nP0a 先跑通最小闭环：导入 catalog → 浏览 Skill → 查看详情 → 安装到 Workspace → 记录状态 → 安全卸载。P0b 再扩展更多工具、Windows 多路径复制、批量部署等能力。\n\n3. **修正 Codex 默认路径策略**\n\nCodex P0a 默认使用官方 repo-scoped `.agents/skills`。`.codex/skills` 暂列为“待验证兼容路径”，不作为 P0a 默认写入目标。\n\n4. **引入 ToolAdapter 适配器模型**\n\n每个 AI 工具用独立配置描述：路径、策略、是否已验证、冲突处理方式。避免把 6 个工具路径硬编码进部署逻辑。\n\n5. **加入非破坏性部署原则**\n\nQSkills 绝不覆盖用户已有目录。所有部署行为必须写入 `.qskills-manifest.json`，卸载只删除 manifest 中记录的文件。\n\n6. **加入 SKILL.md 最低校验规则**\n\nSKILL.md 必须存在；建议包含 YAML frontmatter、`name`、`description`。缺少 description 时允许浏览，但部署前提示“可能无法被 AI 自动触发”。\n\n7. **补齐 Tauri v2 权限、文件路径、打包签名风险**\n\n前端不直接做任意文件系统写入，所有关键读写通过 Rust command 执行。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        let point_index = output
            .html
            .find("补齐 Tauri v2 权限、文件路径、打包签名风险")
            .expect("last point title should render");
        let tail_index = output
            .html
            .find("前端不直接做任意文件系统写入")
            .expect("tail should render");
        assert!(!output.html[point_index..tail_index].contains(r#"<section class="slide"#));
    }

    #[test]
    fn text_slide_markdown_keeps_numbered_heading_with_short_detail() {
        let preferences = PresentationHtmlExportPreferences {
            aspect_ratio: "16-9".to_string(),
            density: PresentationDensity::Balanced,
            output_kind: "static".to_string(),
        };
        let blocks = vec![
            PresentationBlock::Paragraph("前".repeat(210)),
            PresentationBlock::List(vec!["7. **补齐 Tauri v2 权限、文件路径、打包签名风险**".to_string()]),
            PresentationBlock::Paragraph("前端不直接做任意文件系统写入，所有关键读写通过 Rust command 执行。".to_string()),
        ];

        let slides = text_slide_markdown(&blocks, &preferences);

        assert_eq!(slides.len(), 1);
        assert!(slides[0].1.contains("补齐 Tauri v2 权限、文件路径、打包签名风险"));
        assert!(slides[0].1.contains("前端不直接做任意文件系统写入"));
    }

    #[test]
    fn text_slide_markdown_keeps_middle_numbered_headings_with_details() {
        let preferences = PresentationHtmlExportPreferences {
            aspect_ratio: "16-9".to_string(),
            density: PresentationDensity::Balanced,
            output_kind: "static".to_string(),
        };
        let blocks = vec![
            PresentationBlock::Paragraph("前".repeat(210)),
            PresentationBlock::List(vec!["3. **修正 Codex 默认路径策略**".to_string()]),
            PresentationBlock::Paragraph("Codex P0a 默认使用官方 repo-scoped `.agents/skills`。".to_string()),
            PresentationBlock::Paragraph("中".repeat(210)),
            PresentationBlock::List(vec!["5. **加入非破坏性部署原则**".to_string()]),
            PresentationBlock::Paragraph("QSkills 绝不覆盖用户已有目录。".to_string()),
        ];

        let slides = text_slide_markdown(&blocks, &preferences);
        let third_title_slide = slides
            .iter()
            .position(|(_, markdown)| markdown.contains("修正 Codex 默认路径策略"))
            .expect("third title should render");
        let third_detail_slide = slides
            .iter()
            .position(|(_, markdown)| markdown.contains("Codex P0a 默认使用官方"))
            .expect("third detail should render");
        let fifth_title_slide = slides
            .iter()
            .position(|(_, markdown)| markdown.contains("加入非破坏性部署原则"))
            .expect("fifth title should render");
        let fifth_detail_slide = slides
            .iter()
            .position(|(_, markdown)| markdown.contains("QSkills 绝不覆盖用户已有目录"))
            .expect("fifth detail should render");

        assert_eq!(third_title_slide, third_detail_slide);
        assert_eq!(fifth_title_slide, fifth_detail_slide);
    }

    #[test]
    fn text_slide_markdown_keeps_balanced_two_sentence_paragraph_together() {
        let preferences = PresentationHtmlExportPreferences {
            aspect_ratio: "16-9".to_string(),
            density: PresentationDensity::Balanced,
            output_kind: "static".to_string(),
        };
        let first_sentence = "It helps you bring scattered Markdown reports, HTML presentation documents, AI analysis results, and skill-generated artifacts into one local library.";
        let second_sentence = "With a better reading experience, clearer organization, and presentation-friendly viewing, NUTBOOK turns one-off AI outputs into reusable content assets.";
        let blocks = vec![PresentationBlock::Paragraph(format!("{first_sentence} {second_sentence}"))];

        let slides = text_slide_markdown(&blocks, &preferences);

        assert_eq!(slides.len(), 1);
        assert!(slides[0].1.contains(first_sentence));
        assert!(slides[0].1.contains(second_sentence));
    }

    #[test]
    fn text_slide_markdown_keeps_faq_question_with_answer() {
        let preferences = PresentationHtmlExportPreferences {
            aspect_ratio: "16-9".to_string(),
            density: PresentationDensity::Balanced,
            output_kind: "static".to_string(),
        };
        let blocks = vec![
            PresentationBlock::Paragraph("**Q: Is NUTBOOK a knowledge base?**".to_string()),
            PresentationBlock::Paragraph("No. The current version is closer to local AI artifact reading, presentation, organization, and accumulation.".to_string()),
            PresentationBlock::Paragraph("**Q: Can it manage ordinary files?**".to_string()),
            PresentationBlock::Paragraph("Yes. You can connect local folders and individual files, but the current design focuses on Markdown and HTML artifacts.".to_string()),
            PresentationBlock::Paragraph("**Q: How does it relate to AI tools?**".to_string()),
            PresentationBlock::Paragraph("AI tools generate content. NUTBOOK takes responsibility for the connected result after generation.".to_string()),
        ];

        let slides = text_slide_markdown(&blocks, &preferences);

        for (question, answer) in [
            ("Is NUTBOOK a knowledge base", "current version is closer"),
            ("Can it manage ordinary files", "connect local folders"),
            ("How does it relate to AI tools", "takes responsibility"),
        ] {
            let question_slide = slides
                .iter()
                .position(|(_, markdown)| markdown.contains(question))
                .expect("question should render");
            let answer_slide = slides
                .iter()
                .position(|(_, markdown)| markdown.contains(answer))
                .expect("answer should render");
            assert_eq!(question_slide, answer_slide, "{question} should stay with its answer");
        }
    }

    #[test]
    fn presentation_html_splits_landscape_list_cards_by_estimated_height() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Principles".to_string(),
                source_file: "principles.md".to_string(),
                source_path: temp_path("presentation-seven-cards").with_extension("md"),
                markdown: "## 部署策略\n\n### 核心原则\n\nQSkills 只管理自己创建的内容。\n\n- 不覆盖用户已有目录\n- 不删除 manifest 外的文件\n- 不把整个用户目录替换成 symlink\n- 不直接清空工具的 skills 根目录\n- 每个安装目标都写入 manifest\n- 卸载只按 manifest 删除对应 Skill 目录\n- 目录冲突时默认跳过".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains(r#"data-card-count="7""#));
        assert!(output.html.contains(r#"data-layout="split""#));
        assert_eq!(output.html.matches(r#"data-slide-kind="list-cards""#).count(), 1);

        let eleven = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Principles".to_string(),
                source_file: "principles.md".to_string(),
                source_path: temp_path("presentation-eleven-cards").with_extension("md"),
                markdown: "## 部署策略\n\n### 暂不做事项\n\n为了保证 P0a 快速落地，以下事项不做：\n\n- 不做 Git 仓库拉取\n- 不做 HTTP 下载\n- 不做远程更新\n- 不做用户登录\n- 不做统计上报\n- 不做权限分组\n- 不做管理员后台\n- 不做 Skill 在线编辑\n- 不做完整版本管理\n- 不默认支持所有 AI 工具\n- 不做危险的清空所有 Skills 目录".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        let counts = list_card_counts(&eleven.html);
        assert_eq!(counts, vec![6, 5]);
        assert_eq!(eleven.html.matches(r#"data-slide-kind="list-cards""#).count(), 2);
    }

    #[test]
    fn presentation_html_list_card_titles_strip_inline_markdown() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Cards".to_string(),
                source_file: "cards.md".to_string(),
                source_path: temp_path("presentation-inline-card").with_extension("md"),
                markdown: "## 设计\n\n### 入口\n\n- 入口放在 `Markdown` 页面的更多菜单中，显示为 `导出...`\n- 新 `导出...` 是新增菜单项，用于进入 Markdown 导出中心".to_string(),
                generated_at: "修改时间：2026-06-15 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains("入口放在 Markdown 页面的更多菜单中，显示为 导出..."));
        assert!(!output.html.contains("`Markdown`"));
        assert!(!output.html.contains("`导出...`"));
    }

    #[test]
    fn presentation_html_keeps_nested_list_items_inside_parent_card() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Confirm".to_string(),
                source_file: "confirm.md".to_string(),
                source_path: temp_path("presentation-nested-card").with_extension("md"),
                markdown: "## 交互\n\n### 设计结论\n\n- 有未保存修改时，点击 `另存为` 或进入导出中心前都要提示\n  - 保存并继续\n  - 取消\n- 无未保存修改时直接进入导出中心".to_string(),
                generated_at: "修改时间：2026-06-15 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains(r#"data-card-count="2""#));
        assert!(output.html.contains("保存并继续"));
        assert!(output.html.contains("取消"));
        assert!(!output.html.contains(r#"<h3 class="list-card-title">保存并继续</h3>"#));
        assert!(!output.html.contains(r#"<h3 class="list-card-title">取消</h3>"#));
    }

    #[test]
    fn presentation_html_preserves_ordered_list_numbers_in_cards() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Goals".to_string(),
                source_file: "goals.md".to_string(),
                source_path: temp_path("presentation-ordered-cards").with_extension("md"),
                markdown: "## 产品目标\n\n### 阶段目标\n\n1. 用户能把当前 Markdown 导出为可独立打开的 HTML\n2. MVP 阶段优先保证阅读型 HTML 与 Markdown 渲染一致\n3. 用户有未保存修改时，不会误导出旧内容\n4. 导出中心入口清晰可见".to_string(),
                generated_at: "修改时间：2026-06-15 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains(r#"data-card-count="4""#));
        assert_eq!(output.html.matches(r#"data-slide-kind="list-cards""#).count(), 1);
        assert!(output.html.contains(r#"<h3 class="list-card-title">1. 用户能把当前 Markdown 导出为可独立打开的 HTML</h3>"#));
        assert!(output.html.contains(r#"<h3 class="list-card-title">4. 导出中心入口清晰可见</h3>"#));
    }

    #[test]
    fn presentation_html_keeps_four_medium_ordered_cards_together() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Goals".to_string(),
                source_file: "goals.md".to_string(),
                source_path: temp_path("presentation-four-medium-cards").with_extension("md"),
                markdown: "## 2. 产品目标\n\nNutbook 当前已经能管理、阅读和轻编辑 Markdown。下一步需要增强导出能力。\n\n1. 用户能把当前 Markdown 导出为可独立打开的 HTML 文件。\n2. MVP 阶段优先保证阅读型 HTML 与 Nutbook Markdown 阅读页使用同一套 Markdown 渲染口径。\n3. 用户有未保存修改时，不会误导出旧内容；必须保存并继续，或取消当前动作。\n4. 后续 Markdown PDF、长图、水印、展示 HTML 和 AI 转演示 HTML 能接入同一个 Markdown 导出中心，而不是继续挤进更多菜单。".to_string(),
                generated_at: "修改时间：2026-06-15 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert_eq!(output.html.matches(r#"data-slide-kind="list-cards""#).count(), 1);
        assert!(output.html.contains(r#"data-card-count="4""#));
    }

    #[test]
    fn presentation_html_groups_ordered_items_with_explanations_into_cards() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "QSkills".to_string(),
                source_file: "qskills.md".to_string(),
                source_path: temp_path("presentation-ordered-explanations").with_extension("md"),
                markdown: "# QSkills\n\n## 0. v0.5 更新摘要\n\n本版本基于 v0.3 做了以下关键调整：\n\n1. **将“项目目录”统一改为“Workspace 工作区目录”**\n\nQSkills 不只服务代码项目，也服务营销、公关、内容创作、客户项目资料夹等工作目录。\n\n2. **将 P0 拆分为 P0a / P0b**\n\nP0a 先跑通最小闭环：导入 catalog → 浏览 Skill → 查看详情 → 安装到 Workspace → 记录状态 → 安全卸载。 P0b 再扩展更多工具、Windows 多路径复制、批量部署等能力。\n\n3. **修正 Codex 默认路径策略**\n\nCodex P0a 默认使用官方 repo-scoped `.agents/skills`。 `.codex/skills` 暂列为“待验证兼容路径”，不作为 P0a 默认写入目标。\n\n4. **引入 ToolAdapter 适配器模型**\n\n每个 AI 工具用独立配置描述：路径、策略、是否已验证、冲突处理方式。 避免把 6 个工具路径硬编码进部署逻辑。\n\n5. **加入非破坏性部署原则**\n\nQSkills 绝不覆盖用户已有目录。 所有部署行为必须写入 `.qskills-manifest.json`，卸载只删除 manifest 中记录的文件。\n\n6. **加入 SKILL.md 最低校验规则**\n\n`SKILL.md` 必须存在；建议包含 YAML frontmatter、`name`、`description`。 缺少 description 时允许浏览，但部署前提示“可能无法被 AI 自动触发”。\n\n7. **补齐 Tauri v2 权限、文件路径、打包签名风险**\n\n前端不直接做任意文件系统写入，所有关键读写通过 Rust command 执行。".to_string(),
                generated_at: "修改时间：2026-06-15 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains(r#"data-slide-kind="list-cards""#));
        assert_eq!(list_card_counts(&output.html), vec![4, 3]);
        assert!(output.html.contains(r#"<h3 class="list-card-title">1. 将“项目目录”统一改为“Workspace 工作区目录”</h3>"#));
        assert!(output.html.contains(r#"<div class="list-card-body"><p>QSkills 不只服务代码项目"#));
        assert!(output.html.contains(r#"<h3 class="list-card-title">7. 补齐 Tauri v2 权限、文件路径、打包签名风险</h3>"#));
        assert!(output.html.contains("前端不直接做任意文件系统写入"));
    }

    #[test]
    fn presentation_html_omits_repeated_kicker_when_chapter_matches_title() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Goals".to_string(),
                source_file: "goals.md".to_string(),
                source_path: temp_path("presentation-no-repeated-kicker").with_extension("md"),
                markdown: "## 2. 产品目标\n\n目标说明。\n\n- 第一项\n- 第二项".to_string(),
                generated_at: "修改时间：2026-06-15 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains(r#"<h2 class="slide-title">2. 产品目标</h2>"#));
        assert!(!output.html.contains(r#"<p class="kicker">2. 产品目标</p>"#));
    }

    #[test]
    fn presentation_html_uses_side_figure_layout_for_tall_and_square_images() {
        let root = temp_path("presentation-side-figure");
        fs::create_dir_all(&root).expect("root should be created");
        fs::write(root.join("tall.png"), png_header(600, 1200)).expect("tall image should be written");
        fs::write(root.join("square.png"), png_header(900, 900)).expect("square image should be written");
        let source_path = root.join("deck.md");

        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Figures".to_string(),
                source_file: "deck.md".to_string(),
                source_path,
                markdown: "## 图片策略\n\n### 竖图\n\n这张图适合和说明放在同一页。\n\n![Tall](tall.png)\n\n### 方图\n\n方图单独一页会显得空。\n\n![Square](square.png)".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert_eq!(output.html.matches(r#"data-figure-layout="side""#).count(), 2);
        assert!(output.html.contains(r#"class="figure-copy""#));
        assert!(output.html.contains("这张图适合和说明放在同一页"));
        assert!(output.html.contains("方图单独一页会显得空"));
    }

    #[test]
    fn presentation_html_uses_full_figure_layout_for_wide_images() {
        let root = temp_path("presentation-full-figure");
        fs::create_dir_all(&root).expect("root should be created");
        fs::write(root.join("wide.png"), png_header(1600, 700)).expect("wide image should be written");
        let source_path = root.join("deck.md");

        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Figures".to_string(),
                source_file: "deck.md".to_string(),
                source_path,
                markdown: "## 图片策略\n\n### 横图\n\n这张图应该单独展示。\n\n![Wide](wide.png)".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains(r#"data-figure-layout="full""#));
        let text_index = output.html.find("这张图应该单独展示").expect("text should render");
        let figure_index = output.html.find(r#"data-figure-layout="full""#).expect("figure should render");
        assert!(output.html[text_index..figure_index].contains(r#"<section class="slide"#));
    }

    #[test]
    fn presentation_html_density_and_card_limits_are_content_aware() {
        let markdown = "# Deck\n\n## 方案\n\n### 一\n\n一句话。\n\n### 二\n\n一句话。\n\n### 三\n\n一句话。\n\n### 四\n\n一句话。\n\n### 五\n\n一句话。\n\n### 六\n\n一句话。";
        let wide = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Wide".to_string(),
                source_file: "wide.md".to_string(),
                source_path: temp_path("presentation-wide").with_extension("md"),
                markdown: markdown.to_string(),
                generated_at: "修改时间：2026-06-13 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("wide presentation should render");
        let classic = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Classic".to_string(),
                source_file: "classic.md".to_string(),
                source_path: temp_path("presentation-classic").with_extension("md"),
                markdown: markdown.to_string(),
                generated_at: "修改时间：2026-06-13 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "4-3".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("classic presentation should render");
        let master = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Master".to_string(),
                source_file: "master.md".to_string(),
                source_path: temp_path("presentation-master").with_extension("md"),
                markdown: markdown.to_string(),
                generated_at: "修改时间：2026-06-13 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Master,
                output_kind: "static".to_string(),
            },
        )
        .expect("master presentation should render");

        assert!(wide.html.contains(r#"data-card-count="6""#));
        assert!(classic.html.contains(r#"data-card-count="3""#));
        assert!(master.html.contains(r#"data-density="master""#));
    }

    #[test]
    fn presentation_html_master_uses_statement_slides_not_content_cards() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Master".to_string(),
                source_file: "master.md".to_string(),
                source_path: temp_path("presentation-master-statement").with_extension("md"),
                markdown: "# Deck\n\n## 核心能力\n\n### 1. 内容统一管理\n\nNUTBOOK 会把 AI 产物作为一种独立内容类型来管理，而不是简单套一层文件浏览器。\n\n当前重点支持：\n\n- 接入本地文件夹和单文件\n- 接入 skill 产物目录\n- 统一管理 Markdown / HTML 内容\n\n### 2. 强化阅读体验\n\n让已经生成出来的内容更容易被阅读、识别和继续整理。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Master,
                output_kind: "static".to_string(),
            },
        )
        .expect("master presentation html should render");

        assert!(output.html.contains(r#"data-slide-kind="statement""#));
        assert!(!output.html.contains(r#"data-slide-kind="list-cards""#));
        assert!(!output.html.contains(r#"data-slide-kind="topic-cards""#));
        assert!(output.html.contains(r#"<h2 class="statement-title">1. 内容统一管理</h2>"#));
        assert!(output.html.contains(r#"<h2 class="statement-title">2. 强化阅读体验</h2>"#));
        assert!(!output.html.contains(r#"<h2 class="statement-title">接入 skill 产物目录</h2>"#));
        assert!(!output.html.contains(r#"<h2 class="statement-title">统一管理 Markdown / HTML 内容</h2>"#));
    }

    #[test]
    fn presentation_html_master_keeps_list_keys_without_explanations() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Master".to_string(),
                source_file: "master.md".to_string(),
                source_path: temp_path("presentation-master-list-keys").with_extension("md"),
                markdown: "## 适合谁\n\n### 适合场景\n\n- **商业人群**：阅读和整理竞品分析、市场调研、商业计划、客户方案、会议材料。\n- **高校与研究人群**：管理论文分析、文献综述、课题资料、学术报告和研究过程产物。\n- 内容策划：沉淀选题分析、脚本草稿、活动方案。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Master,
                output_kind: "static".to_string(),
            },
        )
        .expect("master presentation html should render");

        assert!(output.html.contains(r#"<h2 class="statement-title">商业人群</h2>"#));
        assert!(output.html.contains(r#"<h2 class="statement-title">高校与研究人群</h2>"#));
        assert!(output.html.contains(r#"<h2 class="statement-title">内容策划</h2>"#));
        assert!(!output.html.contains("客户方案、会议材料"));
        assert!(!output.html.contains("研究过程产物"));
        assert!(!output.html.contains("沉淀选题分析"));
    }

    #[test]
    fn presentation_html_master_does_not_repeat_chapter_title_as_statement() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Article".to_string(),
                source_file: "article.md".to_string(),
                source_path: temp_path("presentation-master-article").with_extension("md"),
                markdown: "# 文章\n\n## AI 让我的电脑变成了“垃圾场”\n\n我最近有个很荒诞的感受。\n\n我做了十几年新媒体营销策划和创意。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Master,
                output_kind: "static".to_string(),
            },
        )
        .expect("master presentation html should render");

        assert!(output.html.contains(r#"<h2 class="statement-title">我最近有个很荒诞的感受。</h2>"#));
        assert_eq!(output.html.matches(r#"<h2 class="statement-title">AI 让我的电脑变成了“垃圾场”</h2>"#).count(), 0);
    }

    #[test]
    fn presentation_html_report_uses_reading_slides_not_cards() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Report".to_string(),
                source_file: "report.md".to_string(),
                source_path: temp_path("presentation-report-reading").with_extension("md"),
                markdown: "# Deck\n\n## 核心能力\n\n### 1. 内容统一管理\n\nNUTBOOK 会把 AI 产物作为一种独立内容类型来管理，而不是简单套一层文件浏览器。\n\n当前重点支持：\n\n- 接入本地文件夹和单文件\n- 接入 skill 产物目录\n- 统一管理 Markdown / HTML 内容\n\n无论内容来自哪里，都可以被收进同一个本地资料库。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Report,
                output_kind: "static".to_string(),
            },
        )
        .expect("report presentation html should render");

        assert!(output.html.contains(r#"data-slide-kind="text""#));
        assert!(!output.html.contains(r#"data-slide-kind="chapter""#));
        assert!(!output.html.contains(r#"data-slide-kind="list-cards""#));
        assert!(!output.html.contains(r#"data-slide-kind="topic-cards""#));
        assert!(output.html.contains("接入 skill 产物目录"));
        assert!(output.html.contains("无论内容来自哪里"));
    }

    #[test]
    fn presentation_html_report_merges_short_reading_sections() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Report".to_string(),
                source_file: "report.md".to_string(),
                source_path: temp_path("presentation-report-compact").with_extension("md"),
                markdown: "# Deck\n\n## 第一章\n\n### 摘要\n\n只有一句话。\n\n### 结论\n\n再补一句话。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Report,
                output_kind: "static".to_string(),
            },
        )
        .expect("report presentation html should render");

        assert_eq!(output.html.matches(r#"data-slide-kind="text""#).count(), 1);
        assert!(output.html.contains(r#"data-title="第一章""#));
        assert!(output.html.contains("<h3>摘要</h3>"));
        assert!(output.html.contains("<h3>结论</h3>"));
        assert!(output.html.contains("只有一句话"));
        assert!(output.html.contains("再补一句话"));
    }

    #[test]
    fn presentation_html_report_does_not_merge_across_chapters() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Report".to_string(),
                source_file: "report.md".to_string(),
                source_path: temp_path("presentation-report-chapters").with_extension("md"),
                markdown: "# Deck\n\n## 适合谁\n\n这是一段适合谁的说明。\n\n## 典型场景\n\n### 阅读报告\n\n场景一。\n\n## 当前支持什么\n\n当前版本已经可以完成基础闭环。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Report,
                output_kind: "static".to_string(),
            },
        )
        .expect("report presentation html should render");

        assert!(output.html.contains(r#"data-title="适合谁""#));
        assert!(output.html.contains(r#"data-title="典型场景""#));
        assert!(output.html.contains(r#"data-title="当前支持什么""#));
        assert!(output.html.contains("<h3>阅读报告</h3>"));
    }

    #[test]
    fn presentation_html_localizes_implicit_overview_for_chinese_documents() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "README-CN.md".to_string(),
                source_file: "README-CN.md".to_string(),
                source_path: temp_path("presentation-cn-overview").with_extension("md"),
                markdown: "# NUTBOOK\n\n![NUTBOOK](hero.svg)\n\n这是一段中文概览。\n\n## 第一节\n\n正文".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains(r#"data-title="概览""#));
        assert!(!output.html.contains(r#"data-title="Overview""#));
    }

    #[test]
    fn presentation_html_does_not_put_empty_chapter_topic_into_cards() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Scenarios".to_string(),
                source_file: "scenarios.md".to_string(),
                source_path: temp_path("presentation-scenarios").with_extension("md"),
                markdown: "## 典型场景\n\n### 阅读一份 AI 生成的竞品分析报告\n\n一句话。\n\n### 修改一份学术研究的 AI 分析报告\n\n一句话。\n\n### 在会议或提案中展示 HTML 文档\n\n一句话。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains(r#"data-card-count="3""#));
        assert!(!output.html.contains(r#"<article class="topic-card" data-topic-title="典型场景"><h3>典型场景</h3><div class="topic-card-body"></div>"#));
    }

    #[test]
    fn presentation_html_keeps_six_tiny_topics_together_on_wide_slides() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Tiny".to_string(),
                source_file: "tiny.md".to_string(),
                source_path: temp_path("presentation-tiny").with_extension("md"),
                markdown: "## 六个观点\n\n### 一\n\n短。\n\n### 二\n\n短。\n\n### 三\n\n短。\n\n### 四\n\n短。\n\n### 五\n\n短。\n\n### 六\n\n短。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains(r#"data-card-count="6""#));
        assert_eq!(output.html.matches(r#"data-slide-kind="topic-cards""#).count(), 1);
    }

    #[test]
    fn presentation_html_turns_intro_lists_into_cards_without_splitting_intro() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Install".to_string(),
                source_file: "install.md".to_string(),
                source_path: temp_path("presentation-install").with_extension("md"),
                markdown: "## 安装方式\n\n### 方式一：DMG 安装（推荐）\n\n适合普通使用者。\n\n1. 下载当前发布的 `dmg` 安装包。\n2. 打开安装包后，把 `NUTBOOK` 拖入 `Applications` 文件夹。\n3. 首次打开时，macOS 可能会提示安全限制。\n\n如果遇到“无法打开”或“未受信任开发者”之类的提示，可以这样处理：\n\n1. **打开系统设置**：进入系统设置页面。\n2. **进入隐私与安全性**：找到被阻止的应用提示。\n3. **允许打开**：选择仍要打开。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains(r#"data-slide-kind="list-cards""#));
        assert!(output.html.contains(r#"<h3 class="list-card-title">1. 打开系统设置</h3>"#));
        assert!(!output.html.contains(r#"<h3 class="list-card-title">方式一：DMG 安装（推荐）</h3>"#));
        let guide_index = output
            .html
            .find("如果遇到“无法打开”或“未受信任开发者”之类的提示，可以这样处理")
            .expect("guide should render");
        let item_index = output.html.find("进入系统设置页面").expect("list detail should render");
        let section_between = output.html[guide_index..item_index].contains(r#"<section class="slide"#);
        assert!(!section_between, "guide and its list should stay on the same slide");
    }

    #[test]
    fn presentation_html_merges_blank_separated_list_items_before_carding() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Lists".to_string(),
                source_file: "lists.md".to_string(),
                source_path: temp_path("presentation-lists").with_extension("md"),
                markdown: "## 支持什么\n\n### 当前支持什么\n\n当前支持：\n\n* Skill 扫描并接入文件夹\n\n* 文件夹扫描录入\n\n* 单文件接入\n\n* Markdown 阅读 / 轻编辑".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains(r#"data-slide-kind="list-cards""#));
        assert!(output.html.contains(r#"data-card-count="4""#));
        assert_eq!(output.html.matches(r#"data-slide-kind="list-cards""#).count(), 1);
    }

    #[test]
    fn presentation_html_keeps_single_list_item_as_text() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Single".to_string(),
                source_file: "single.md".to_string(),
                source_path: temp_path("presentation-single-list").with_extension("md"),
                markdown: "## 注意\n\n### 构建提醒\n\n请注意：\n\n* Markdown 编辑器构建后会执行兼容补丁，请不要跳过 `npm run build:frontend`。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(!output.html.contains(r#"data-slide-kind="list-cards""#));
        assert!(output.html.contains("Markdown 编辑器构建后会执行兼容补丁"));
    }

    #[test]
    fn presentation_html_keeps_plain_list_card_titles_complete() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Sources".to_string(),
                source_file: "sources.md".to_string(),
                source_path: temp_path("presentation-plain-list-title").with_extension("md"),
                markdown: "## 来源\n\n### 这是什么\n\n这些内容可能来自：\n\n- 由 OpenClaw、Codex、Hermes、Claude Code 等自动化工具生成\n- 会议提案、项目汇报、HTML 演示页、交互式展示文档".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains("由 OpenClaw、Codex、Hermes、Claude Code 等自动化工具生成"));
        assert!(!output.html.contains("Claude Co…"));
    }

    #[test]
    fn presentation_html_master_uses_h3_statement_and_keeps_markdown_plain() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Master".to_string(),
                source_file: "master.md".to_string(),
                source_path: temp_path("presentation-master-plain").with_extension("md"),
                markdown: "## 典型场景\n\n### 阅读一份 `AI` 生成的 **竞品分析报告**\n\n- 把 `竞品分析报告.md` 导出成 HTML 演示。\n- **保留关键信息**：省略解释，只保留观点。\n- [打开预览](https://example.com)".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Master,
                output_kind: "static".to_string(),
            },
        )
        .expect("master presentation html should render");

        assert!(output.html.contains(r#"<h2 class="statement-title">阅读一份 AI 生成的 竞品分析报告</h2>"#));
        assert!(!output.html.contains(r#"<h2 class="statement-title">把 竞品分析报告.md 导出成 HTML 演示。</h2>"#));
        assert!(!output.html.contains(r#"<h2 class="statement-title">保留关键信息</h2>"#));
        assert!(!output.html.contains("`AI`"));
        assert!(!output.html.contains("**保留关键信息"));
        assert!(!output.html.contains("[打开预览]("));
    }

    #[test]
    fn presentation_html_master_keeps_each_faq_question() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "FAQ".to_string(),
                source_file: "faq.md".to_string(),
                source_path: temp_path("presentation-master-faq").with_extension("md"),
                markdown: "## 附录\n\n### 常见问题\n\n**Q：NUTBOOK 是不是知识库？**\n\n不是，当前版本更偏向本地 AI 产物的阅读、展示、整理和沉淀。\n\n**Q：能不能管理普通文件？**\n\n可以接入本地文件夹和单文件。\n\n**Q：现在适合团队大规模协作吗？**\n\n暂时不建议。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Master,
                output_kind: "static".to_string(),
            },
        )
        .expect("master faq presentation html should render");

        assert!(output.html.contains(r#"<h2 class="statement-title">NUTBOOK 是不是知识库？</h2>"#));
        assert!(output.html.contains(r#"<h2 class="statement-title">能不能管理普通文件？</h2>"#));
        assert!(output.html.contains(r#"<h2 class="statement-title">现在适合团队大规模协作吗？</h2>"#));
        assert!(!output.html.contains(r#"<h2 class="statement-title">常见问题</h2>"#));
    }

    #[test]
    fn presentation_html_master_marks_chapter_and_statement_as_distinct_roles() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Roles".to_string(),
                source_file: "roles.md".to_string(),
                source_path: temp_path("presentation-master-roles").with_extension("md"),
                markdown: "## 核心能力\n\n### 内容统一管理\n\n把 AI 产物集中管理。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Master,
                output_kind: "static".to_string(),
            },
        )
        .expect("master presentation html should render");

        assert!(output.html.contains(r#"class="slide chapter density-master"#));
        assert!(output.html.contains(r#"class="slide statement density-master"#));
        assert!(output.html.contains(r#"class="chapter-index">Chapter · 01</span>"#));
        assert!(output.html.contains(r#"class="statement-rule""#));
    }

    #[test]
    fn presentation_html_numbers_chapters_sequentially() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Chapters".to_string(),
                source_file: "chapters.md".to_string(),
                source_path: temp_path("presentation-chapters").with_extension("md"),
                markdown: "# 标题\n\n开头概览。\n\n## 第一章\n\n正文。\n\n## 第二章\n\n正文。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains("Chapter · 01"));
        assert!(output.html.contains("Chapter · 02"));
        assert!(output.html.contains("Chapter · 03"));
        assert!(!output.html.contains("Chapter · 04"));
    }

    #[test]
    fn presentation_html_keeps_following_summary_with_list_cards() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Summary".to_string(),
                source_file: "summary.md".to_string(),
                source_path: temp_path("presentation-list-summary").with_extension("md"),
                markdown: "## 能力\n\n### 当前支持\n\n当前支持：\n\n* 文件夹扫描录入\n* 单文件接入\n* 收藏与标签\n\n简单说，当前版本已经适合把常见的 AI 输出文件集中收进来、浏览、筛选、打开、展示和继续整理。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(output.html.contains(r#"class="list-card-outro""#));
        let list_index = output.html.find(r#"data-slide-kind="list-cards""#).expect("list cards should render");
        let summary_index = output
            .html
            .find("简单说，当前版本已经适合")
            .expect("summary should render");
        assert!(!output.html[list_index..summary_index].contains(r#"<section class="slide"#));
    }

    #[test]
    fn presentation_html_keeps_link_lists_as_text_not_broken_cards() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Links".to_string(),
                source_file: "links.md".to_string(),
                source_path: temp_path("presentation-links").with_extension("md"),
                markdown: "## Skill\n\n### 主动适配\n\n例如：\n\n* [`html-ppt-skill`](https://github.com/lewislulu/html-ppt-skill)\n* [`huashu-design`](https://github.com/alchaincyf/huashu-design)".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(!output.html.contains(r#"data-slide-kind="list-cards""#));
        assert!(output.html.contains(r#"<a href="https://github.com/lewislulu/html-ppt-skill">"#));
        assert!(!output.html.contains("[`html-ppt-skill`](https"));
    }

    #[test]
    fn presentation_html_keeps_mixed_link_lists_as_text() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Links".to_string(),
                source_file: "links.md".to_string(),
                source_path: temp_path("presentation-mixed-links").with_extension("md"),
                markdown: "## Skill\n\n### 主动适配\n\n例如：\n\n* [`html-ppt-skill`](https://github.com/lewislulu/html-ppt-skill)\n* [`huashu-design`](https://github.com/alchaincyf/huashu-design)\n* 其他生成 Markdown / HTML 报告的 skill".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(!output.html.contains(r#"data-slide-kind="list-cards""#));
        assert!(output.html.contains(r#"<a href="https://github.com/lewislulu/html-ppt-skill">"#));
        assert!(output.html.contains("其他生成 Markdown / HTML 报告的 skill"));
    }

    #[test]
    fn presentation_html_keeps_list_topics_out_of_topic_card_groups() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Abilities".to_string(),
                source_file: "abilities.md".to_string(),
                source_path: temp_path("presentation-list-topic-consistency").with_extension("md"),
                markdown: "## 核心能力\n\n### 1. 内容统一管理\n\n当前支持：\n\n- 接入文件夹\n- 接入单文件\n- 收藏重要内容\n\n### 2. 强化阅读体验\n\n阅读体验包括：\n\n- 文件缩略图\n- Markdown 阅读视图\n- HTML 页面预览".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert!(!output.html.contains(r#"data-slide-kind="topic-cards""#));
        assert_eq!(output.html.matches(r#"data-slide-kind="list-cards""#).count(), 2);
    }

    #[test]
    fn presentation_html_keeps_mixed_topics_consistent_after_list_topic() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Roadmap".to_string(),
                source_file: "roadmap.md".to_string(),
                source_path: temp_path("presentation-mixed-topic-consistency").with_extension("md"),
                markdown: "## 后续小版本顺序\n\n### 8.1 展示 HTML - Light\n\n在 `阅读 HTML` 稳定后，再实现 `展示 HTML - Light`。\n\n这一阶段再引入：\n\n- `Showcase Summary` 拆页策略\n- 左右键 / 空格翻页\n- 页码\n- 长文字页内展开\n- 长代码块和大表格详情弹层\n\n### 8.2 展示 HTML - Dark\n\n`展示 HTML - Dark` 是 Light 模板的深色投屏版本，应在 Light 模板的拆页和交互稳定后再启用。\n\n### 8.3 PDF 导出\n\nPDF 导出应优先复用 `阅读 HTML` 模板，再解决分页、字体、页边距和打印样式。".to_string(),
                generated_at: "修改时间：2026-06-15 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert_eq!(output.html.matches(r#"data-slide-kind="topic-cards""#).count(), 0);
        assert!(output.html.contains(r#"data-topic-title="8.1 展示 HTML - Light""#));
        assert!(output.html.contains(r#"data-topic-title="8.2 展示 HTML - Dark""#));
        assert!(output.html.contains(r#"data-topic-title="8.3 PDF 导出""#));
    }

    #[test]
    fn presentation_html_chooses_split_layout_for_dense_list_cards() {
        let dense = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Dense".to_string(),
                source_file: "dense.md".to_string(),
                source_path: temp_path("presentation-dense-layout").with_extension("md"),
                markdown: "## 支持范围\n\n### 当前支持\n\n当前版本已经可以完成一套基础的本地管理闭环：\n\n- Skill 扫描并接入文件夹，覆盖常见内容生成目录\n- 文件夹扫描录入，适合持续增长的项目资料\n- 单文件接入，用来快速收纳临时报告\n- Markdown 阅读 / 轻编辑，保留后续整理空间\n\n简单说，当前版本已经适合把常见的 AI 输出文件集中收进来。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("dense presentation html should render");
        let short = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Short".to_string(),
                source_file: "short.md".to_string(),
                source_path: temp_path("presentation-short-layout").with_extension("md"),
                markdown: "## 对象\n\n### 适合谁\n\n适合：\n\n- 商业人群\n- 高校人群\n- 内容策划\n- AI 用户\n- 研究人员\n- 项目经理".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("short presentation html should render");

        assert!(dense.html.contains(r#"data-layout="split""#));
        assert!(short.html.contains(r#"data-layout="stacked""#));
    }

    #[test]
    fn presentation_html_merges_topic_intro_with_following_list_cards() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Reading".to_string(),
                source_file: "reading.md".to_string(),
                source_path: temp_path("presentation-topic-intro-list").with_extension("md"),
                markdown: "## 核心能力\n\n### 2. 强化阅读体验\n\nNUTBOOK 的重点不是写作软件，而是让已经生成出来的内容更容易阅读。\n\n当前支持：\n\n- 文件缩略图\n- Markdown 阅读视图\n- HTML 页面预览\n\n它适合阅读 AI 产出的长报告，也适合做轻量修订。".to_string(),
                generated_at: "修改时间：2026-06-14 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("presentation html should render");

        assert_eq!(output.html.matches(r#"data-slide-kind="list-cards""#).count(), 1);
        assert_eq!(output.html.matches(r#"data-topic-title="2. 强化阅读体验""#).count(), 1);
        let intro_index = output.html.find("NUTBOOK 的重点不是写作软件").expect("intro should render");
        let list_index = output.html.find("文件缩略图").expect("list should render");
        let outro_index = output.html.find("它适合阅读 AI 产出的长报告").expect("outro should render");
        assert!(!output.html[intro_index..list_index].contains(r#"<section class="slide"#));
        assert!(!output.html[list_index..outro_index].contains(r#"<section class="slide"#));
    }

    #[test]
    fn default_file_name_uses_html_extension() {
        assert_eq!(default_markdown_html_file_name("Quarterly Plan.md"), "Quarterly Plan.html");
    }
}
