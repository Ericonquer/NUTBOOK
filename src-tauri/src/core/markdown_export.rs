use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{core::{document::{portable_image_html_candidate, sanitize_portable_image_html}, markdown_cover::{parse_cover_metadata, COVER_MARKER}, markdown_render::render_markdown_html, scoped_content_server::percent_decode}, errors::AppError};

pub const READING_TEMPLATE: &str = "reading";
pub const READING_LIGHT_TEMPLATE: &str = "reading-light";
pub const READING_DARK_TEMPLATE: &str = "reading-dark";
pub const PRESENTATION_LIGHT_TEMPLATE: &str = "presentation-light";
pub const PRESENTATION_DARK_TEMPLATE: &str = "presentation-dark";
pub const PRESENTATION_OUTPUT_STATIC: &str = "static";
pub const PRESENTATION_OUTPUT_DYNAMIC: &str = "dynamic";
const NUTBOOK_DEFAULT_MOTION_PRESET: &str = "nutbook-default";
const MAX_SINGLE_IMAGE_BYTES: u64 = 10 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES: u64 = 50 * 1024 * 1024;
const FALLBACK_READING_LIGHT_TEMPLATE: &str = include_str!("../../resources/export-templates/markdown-reading-light.html");
const FALLBACK_READING_DARK_TEMPLATE: &str = include_str!("../../resources/export-templates/markdown-reading-dark.html");
const FALLBACK_PRESENTATION_LIGHT_TEMPLATE: &str = include_str!("../../resources/export-templates/markdown-presentation-light.html");
const FALLBACK_PRESENTATION_DARK_TEMPLATE: &str = include_str!("../../resources/export-templates/markdown-presentation-dark.html");
const PRESENTATION_BRIDGE_SCRIPT: &str = include_str!("../../resources/export-templates/presentation-bridge.js");
const NUTBOOK_LOGO_BYTES: &[u8] = include_bytes!("../../../assets/nutbook-logo.png");

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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum VisualRhythm {
    Anchor,    // 低密度定调 — 封面/章节封面/尾页
    Dense,     // 高密度核心内容 — 文字/列表/数据页
    Breathing, // 中低密度过渡 — 结论/过渡/图片页
}

impl VisualRhythm {
    fn class_name(self) -> &'static str {
        match self {
            Self::Anchor => "rhythm-anchor",
            Self::Dense => "rhythm-dense",
            Self::Breathing => "rhythm-breathing",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PresentationHtmlExportPreferences {
    pub aspect_ratio: String,
    pub density: PresentationDensity,
    pub output_kind: String,
}

impl PresentationHtmlExportPreferences {
    fn is_dynamic(&self) -> bool {
        self.output_kind == PRESENTATION_OUTPUT_DYNAMIC
    }
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

/// The cover marker identifies an image in the source document; exported pages
/// should render the image without displaying that source-only metadata.
fn strip_export_cover_marker(markdown: &str) -> String {
    let Some(cover) = parse_cover_metadata(markdown, None).cover else {
        return markdown.to_string();
    };
    markdown
        .split_inclusive('\n')
        .enumerate()
        .filter_map(|(index, line)| {
            (index + 1 != cover.line || line.trim() != COVER_MARKER).then_some(line)
        })
        .collect()
}

pub fn render_reading_html(input: MarkdownHtmlExportInput) -> Result<MarkdownHtmlExportOutput, AppError> {
    if input.template_html.trim().is_empty() {
        return Err(AppError::InvalidParams);
    }

    let export_markdown = strip_export_cover_marker(&input.markdown);
    let title = first_markdown_h1(&export_markdown).unwrap_or_else(|| input.title.clone());
    let body_markdown = remove_first_markdown_h1(&export_markdown);
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
    let content = protocolize_editable_markup(&content, "nutbook-reading-content", None);
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

fn protocolize_editable_markup(markup: &str, field_prefix: &str, page_id: Option<&str>) -> String {
    let mut output = String::with_capacity(markup.len() + 512);
    let mut offset = 0usize;
    let mut field_index = 0usize;
    let mut skip_stack: Vec<(String, bool)> = Vec::new();

    while let Some(relative_start) = markup[offset..].find('<') {
        let start = offset + relative_start;
        output.push_str(&markup[offset..start]);
        let Some(relative_end) = markup[start..].find('>') else {
            output.push_str(&markup[start..]);
            break;
        };
        let end = start + relative_end + 1;
        let tag = &markup[start..end];
        let trimmed = tag.trim_start_matches('<').trim();

        if trimmed.starts_with('!') || trimmed.starts_with('?') {
            output.push_str(tag);
            offset = end;
            continue;
        }

        let closing = trimmed.starts_with('/');
        let name_start = if closing { 1 } else { 0 };
        let name = trimmed[name_start..]
            .split(|character: char| character.is_ascii_whitespace() || character == '>' || character == '/')
            .next()
            .unwrap_or("")
            .to_ascii_lowercase();
        let void = matches!(name.as_str(), "img" | "br" | "hr" | "meta" | "link" | "input");

        if closing {
            output.push_str(tag);
            if !void {
                let _ = skip_stack.pop();
            }
            offset = end;
            continue;
        }

        let inherited_skip = skip_stack.last().map(|(_, skip)| *skip).unwrap_or(false);
        let class_is_protected = tag.contains("deck-footer")
            || tag.contains("footer-logo")
            || tag.contains("thanks-logo")
            || tag.contains("export-warnings")
            || tag.contains("export-outline")
            || tag.contains("code-copy")
            || tag.contains("presentation-controls");
        let protected = inherited_skip
            || class_is_protected
            || matches!(name.as_str(), "pre" | "code" | "table" | "blockquote" | "footer" | "a");
        let is_slide = page_id.is_some() && name == "section" && tag.contains("class=\"slide");
        let candidate = !protected
            && matches!(name.as_str(), "h1" | "h2" | "h3" | "h4" | "p" | "ul" | "ol" | "img")
            && !editable_element_has_readonly_descendant(markup, end, &name);

        if is_slide || candidate {
            let tag_without_end = &tag[..tag.len() - 1];
            let self_closing = tag_without_end.trim_end().ends_with('/');
            let attribute_end = if self_closing {
                tag_without_end.rfind('/').expect("self-closing tag has slash")
            } else {
                tag_without_end.len()
            };
            let mut replacement = tag_without_end[..attribute_end].to_string();
            if is_slide {
                replacement.push_str(" data-nutbook-page-id=\"");
                replacement.push_str(page_id.expect("page id is present for slides"));
                replacement.push('"');
            }
            if candidate {
                field_index += 1;
                let role = if matches!(name.as_str(), "h1" | "h2" | "h3" | "h4") || tag.contains("kicker") {
                    "short"
                } else {
                    "content"
                };
                replacement.push_str(" data-id=\"");
                replacement.push_str(field_prefix);
                replacement.push_str(&format!("-field-{field_index:03}\""));
                if name == "img" {
                    replacement.push_str(" data-editable=\"image\"");
                } else {
                    replacement.push_str(" data-editable=\"rich-text\" data-edit-role=\"");
                    replacement.push_str(role);
                    replacement.push('"');
                }
            }
            if self_closing {
                replacement.push_str(" /");
            }
            replacement.push('>');
            output.push_str(&replacement);
        } else {
            output.push_str(tag);
        }

        if !void {
            skip_stack.push((name, protected));
        }
        offset = end;
    }

    if offset < markup.len() {
        output.push_str(&markup[offset..]);
    }
    output
}

fn editable_element_has_readonly_descendant(markup: &str, content_start: usize, name: &str) -> bool {
    if name == "img" {
        return false;
    }
    let closing = format!("</{name}");
    let Some(relative_end) = markup[content_start..].find(&closing) else {
        return true;
    };
    let content = &markup[content_start..content_start + relative_end];
    // Images are independent editable targets. A rich-text parent containing one
    // gains image editor attributes at runtime, making an untouched paragraph
    // look changed and producing HTML the rich-text sanitizer rejects on save.
    ["<a ", "<a>", "<code", "<pre", "<table", "<blockquote", "<ul", "<ol", "<img"]
        .iter()
        .any(|needle| content.contains(needle))
}

fn presentation_page_id(index: usize) -> String {
    format!("nutbook-page-{index:03}")
}

pub fn render_presentation_html(
    mut input: MarkdownHtmlExportInput,
    preferences: PresentationHtmlExportPreferences,
) -> Result<MarkdownHtmlExportOutput, AppError> {
    if input.template_html.trim().is_empty() {
        return Err(AppError::InvalidParams);
    }
    if !input.template_html.contains("{{presentation_bridge_script}}")
        || !input.template_html.contains("nutbook-presentation-notes")
        || !input.template_html.contains("{{slides_html}}")
    {
        return Err(AppError::InvalidParams);
    }

    input.markdown = strip_export_cover_marker(&input.markdown);

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
    if slide_total > 500 {
        return Err(AppError::InvalidParams);
    }
    let warnings_html = render_warnings(&embedder.warnings);
    let aspect_class = match preferences.aspect_ratio.as_str() {
        "4-3" => "aspect-4-3",
        _ => "aspect-16-9",
    };
    let motion_styles = if preferences.is_dynamic() {
        PRESENTATION_MOTION_STYLES
    } else {
        ""
    };
    let motion_script = if preferences.is_dynamic() {
        PRESENTATION_MOTION_SCRIPT
    } else {
        ""
    };
    let motion_preset_attr = if preferences.is_dynamic() {
        format!(r#" data-motion-preset="{NUTBOOK_DEFAULT_MOTION_PRESET}""#)
    } else {
        String::new()
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
        .replace("{{motion_styles}}", motion_styles)
        .replace("{{motion_script}}", motion_script)
        .replace("{{presentation_bridge_script}}", PRESENTATION_BRIDGE_SCRIPT)
        .replace("{{motion_preset_attr}}", &motion_preset_attr)
        .replace("{{generated_at}}", &escape_html_text(&input.generated_at))
        .replace("{{source_file}}", &escape_html_text(&input.source_file))
        .replace("{{logo_data_uri}}", &nutbook_logo_data_uri())
        .replace("{{warnings}}", &warnings_html);

    validate_generated_presentation_html(&html, slide_total)?;

    Ok(MarkdownHtmlExportOutput {
        html,
        warnings: embedder.warnings,
    })
}

fn validate_generated_presentation_html(html: &str, slide_total: usize) -> Result<(), AppError> {
    let ids = html.match_indices("data-nutbook-page-id=\"")
        .filter_map(|(offset, marker)| html[offset + marker.len()..].split('"').next())
        .collect::<Vec<_>>();
    if ids.len() != slide_total
        || ids.iter().any(|id| id.is_empty())
        || ids.iter().collect::<std::collections::HashSet<_>>().len() != ids.len()
        || html.matches("data-editable=").count() < slide_total
        || !html.contains("capabilities: { managedPresenter: true }")
        || !html.contains("setManagedMode(enabled)")
        || !html.contains("id=\"nutbook-presentation-notes\">{\"version\":1,\"pages\":{}}</script>")
        || html.contains("{{presentation_bridge_script}}")
    {
        return Err(AppError::InvalidParams);
    }
    Ok(())
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

const PRESENTATION_MOTION_STYLES: &str = r#"
    /* nutbook-motion-styles: nutbook-default */
    @keyframes nutbookMotionRise {
      from { opacity: 0; transform: translateY(18px); }
      to { opacity: 1; transform: none; }
    }
    @keyframes nutbookMotionImage {
      from { opacity: 0; transform: translateY(14px) scale(0.985); }
      to { opacity: 1; transform: none; }
    }
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .kicker,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .cover-title,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .chapter-index,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .chapter-title,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .statement-rule,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .statement-title,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .statement-note,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .slide-title,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .slide-subtitle,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .slide-content,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .topic-card,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .list-card-intro,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .list-card,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .list-card-outro,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .presentation-quote,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .presentation-step,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .comparison-panel,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .presentation-big-number,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .summary-item,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .figure-copy,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .figure-media,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .table-frame,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .code-intro,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .code-frame,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .code-outro,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide .thanks-content {
      opacity: 0;
      transform: translateY(18px);
    }
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .kicker,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .cover-title,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .chapter-index,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .chapter-title,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .statement-rule,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .statement-title,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .statement-note,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .slide-title,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .slide-subtitle,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .slide-content,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .topic-card,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .list-card-intro,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .list-card,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .list-card-outro,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .presentation-quote,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .presentation-step,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .comparison-panel,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .presentation-big-number,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .summary-item,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .figure-copy,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .table-frame,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .code-intro,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .code-frame,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .code-outro,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .thanks-content {
      animation: nutbookMotionRise 560ms cubic-bezier(.2,.7,.2,1) both;
    }
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .figure-media {
      animation: nutbookMotionImage 620ms cubic-bezier(.2,.7,.2,1) both;
    }
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .kicker,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .chapter-index {
      animation-delay: 40ms;
    }
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .cover-title,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .chapter-title,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .statement-title,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .slide-title {
      animation-delay: 90ms;
    }
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .slide-subtitle,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .statement-note,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .slide-content,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .table-frame,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .code-intro,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .code-frame,
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .figure-copy {
      animation-delay: 150ms;
    }
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .topic-card:nth-child(1),
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .list-card:nth-child(1) { animation-delay: 120ms; }
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .topic-card:nth-child(2),
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .list-card:nth-child(2) { animation-delay: 180ms; }
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .topic-card:nth-child(3),
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .list-card:nth-child(3) { animation-delay: 240ms; }
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .topic-card:nth-child(4),
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .list-card:nth-child(4) { animation-delay: 300ms; }
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .topic-card:nth-child(n+5),
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .list-card:nth-child(n+5) { animation-delay: 360ms; }
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .presentation-step:nth-child(1),
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .summary-item:nth-child(1) { animation-delay: 120ms; }
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .presentation-step:nth-child(2),
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .summary-item:nth-child(2) { animation-delay: 180ms; }
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .presentation-step:nth-child(3),
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .summary-item:nth-child(3) { animation-delay: 240ms; }
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .presentation-step:nth-child(n+4),
    body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide.is-active.is-motion-active .summary-item:nth-child(n+4) { animation-delay: 300ms; }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; transition: none !important; }
      body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide * {
        opacity: 1 !important;
        transform: none !important;
      }
    }
    @media print {
      *, *::before, *::after { animation: none !important; transition: none !important; }
      body[data-output-kind="dynamic"][data-motion-preset="nutbook-default"] .slide * {
        opacity: 1 !important;
        transform: none !important;
      }
    }
"#;

const PRESENTATION_MOTION_SCRIPT: &str = r#"<script id="nutbook-motion-script">
    (() => {
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      function prefersReducedMotion() {
        return Boolean(reduceMotion?.matches);
      }
      window.NutbookPresentationMotion = {
        replay(slide) {
          if (!slide || prefersReducedMotion()) return;
          slide.classList.remove("is-motion-active");
          void slide.offsetWidth;
          slide.classList.add("is-motion-active");
        },
        sync(slide) {
          if (!slide || !prefersReducedMotion()) return;
          slide.classList.add("is-motion-active");
        }
      };
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

        let decoded_src = decode_image_source(&src);
        let image_path = if Path::new(&decoded_src).is_absolute() {
            PathBuf::from(&decoded_src)
        } else {
            self.source_dir.join(&decoded_src)
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

fn decode_image_source(src: &str) -> String {
    let unescaped = src.replace("&amp;", "&").replace("&quot;", "\"").replace("&#39;", "'");
    percent_decode(&unescaped).unwrap_or(unescaped)
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
    let src = decode_image_source(&src);
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
    let src = src.strip_prefix('<').and_then(|value| value.strip_suffix('>')).unwrap_or(src);
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
    // Audit results are internal diagnostics. Only actionable export warnings,
    // such as missing embedded images, belong in the rendered document.
    let _audit_warnings = audit_slide_plan(&plans);
    // Compute rhythm sequence
    let rhythms = assign_rhythm_sequence(&plans);
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
                rhythms.get(index).copied().flatten(),
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
    directive: PresentationDirective,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
struct PresentationDirective {
    layout: Option<String>,
    reveal: Option<String>,
    emphasis: Option<usize>,
    section: bool,
}

impl PresentationDirective {
    fn merge(&mut self, other: Self) {
        if other.layout.is_some() {
            self.layout = other.layout;
        }
        if other.reveal.is_some() {
            self.reveal = other.reveal;
        }
        if other.emphasis.is_some() {
            self.emphasis = other.emphasis;
        }
        self.section |= other.section;
    }

    fn is_empty(&self) -> bool {
        self.layout.is_none() && self.reveal.is_none() && self.emphasis.is_none() && !self.section
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum PresentationBlock {
    Paragraph(String),
    List(Vec<String>),
    /// Enhanced list variant — preserves per-item label/body/children structure.
    /// Produced by `upgrade_rich_list()` when a list has structured items.
    /// Consumers that don't need semantic info continue matching `List(Vec<String>)`.
    RichList(PresentationRichList),
    Quote(String),
    Heading { level: u8, title: String },
    Image(String),
    Table { markdown: String, rows: usize, cols: usize, max_line_chars: usize },
    Code { language: Option<String>, body: String, lines: usize, max_line_chars: usize },
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct RichListItem {
    label: String,
    body: String,
    children: Vec<RichListItem>,
    ordered: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct PresentationRichList {
    items: Vec<RichListItem>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum RelationKind {
    Parallel,
    Sequence,
    Hierarchy,
    Cycle,
    Comparison,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Confidence {
    High,
    Medium,
    Low,
}

/// Lightweight semantic group — the output of the post-parse semantic pass.
/// Provides layout-relevant facts without replacing `PresentationSlidePlan`.
#[derive(Debug, Clone)]
struct SemanticGroup {
    headline: String,
    members: Vec<SemanticMember>,
    relation: RelationKind,
    confidence: Confidence,
}

#[derive(Debug, Clone)]
struct SemanticMember {
    label: String,
    evidence: Vec<PresentationBlock>,
    children: Vec<SemanticMember>,
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
enum ListCardArrangement {
    StackedGrid,
    SideBySideStack,
}

impl ListCardArrangement {
    fn key(self) -> &'static str {
        match self {
            Self::StackedGrid => "stacked-grid",
            Self::SideBySideStack => "side-by-side-stack",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
enum CardHeightBand {
    Compact,
    Standard,
    Relaxed,
}

impl CardHeightBand {
    fn pixels(self) -> usize {
        match self {
            Self::Compact => 76,
            Self::Standard => 96,
            Self::Relaxed => 116,
        }
    }

    fn clamp_step_from(self, previous: Self) -> Self {
        let max_rank = previous as i8 + 1;
        if self as i8 > max_rank {
            match max_rank {
                0 => Self::Compact,
                1 => Self::Standard,
                _ => Self::Relaxed,
            }
        } else {
            self
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct ListCardLayoutPlan {
    arrangement: ListCardArrangement,
    columns: usize,
    card_height: CardHeightBand,
    minimum_card_height: CardHeightBand,
    gap: usize,
    group_width_percent: usize,
    vertical_centered: bool,
    estimated_fill_per_mille: usize,
    score: i32,
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
    Overview { chapter: String, title: String, items: Vec<String> },
    TopicCards { chapter: String, cards: Vec<TopicCardPlan> },
    Text { chapter: String, title: String, subtitle: Option<String>, markdown: String },
    ListCards {
        chapter: String,
        title: String,
        intro: Option<String>,
        cards: Vec<ListCardPlan>,
        outro: Option<String>,
        layout: Option<ListCardLayoutPlan>,
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
    SectionTransition { title: String },
    Quote { chapter: String, title: String, markdown: String },
    Process { chapter: String, title: String, steps: Vec<ListCardPlan> },
    Cycle { chapter: String, title: String, items: Vec<ListCardPlan> },
    Hierarchy { chapter: String, title: String, roots: Vec<ListCardPlan> },
    Comparison { chapter: String, title: String, left: Vec<ListCardPlan>, right: Vec<ListCardPlan> },
    BigNumber { chapter: String, title: String, number: String, supporting: String },
    Summary { chapter: String, title: String, items: Vec<ListCardPlan> },
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

fn parse_presentation_directive(line: &str) -> Option<PresentationDirective> {
    let value = line.trim().strip_prefix("<!-- nutbook:")?.strip_suffix("-->")?.trim();
    let (key, value) = value.split_once(char::is_whitespace)?;
    let value = value.trim();
    let mut directive = PresentationDirective::default();
    match key {
        "layout" if matches!(value, "auto" | "quote" | "process" | "comparison" | "big-number" | "summary" | "cards" | "text") => {
            directive.layout = Some(value.to_string());
        }
        "reveal" if matches!(value, "auto" | "none" | "step") => {
            directive.reveal = Some(value.to_string());
        }
        "emphasis" => {
            directive.emphasis = value.parse::<usize>().ok().filter(|index| *index > 0);
        }
        "section" if value == "true" => directive.section = true,
        _ => return None,
    }
    Some(directive)
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
        directive: PresentationDirective::default(),
    };
    let mut raw_topic = String::new();
    let mut skipped_first_h1 = false;
    let mut pending_directive = PresentationDirective::default();

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
            directive: PresentationDirective::default(),
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
        if let Some(directive) = parse_presentation_directive(line) {
            pending_directive.merge(directive);
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
                        directive: std::mem::take(&mut pending_directive),
                    };
                    continue;
                }
                3 => {
                    flush_topic(&mut current_topic, &mut raw_topic, &mut current_chapter);
                    current_topic = PresentationTopic {
                        title: heading,
                        blocks: Vec::new(),
                        directive: std::mem::take(&mut pending_directive),
                    };
                    continue;
                }
                _ => {}
            }
        }
        if !line.trim().is_empty() && raw_topic.trim().is_empty() && !pending_directive.is_empty() {
            current_topic.directive.merge(std::mem::take(&mut pending_directive));
        }
        raw_topic.push_str(line);
        raw_topic.push('\n');
    }
    if !pending_directive.is_empty() && raw_topic.trim().is_empty() {
        current_topic.directive.merge(pending_directive);
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
                directive: PresentationDirective::default(),
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
        if !line.starts_with("    ") && !line.starts_with('\t') {
            if let Some((candidate, consumed)) = portable_image_html_candidate(&lines, index) {
                if sanitize_portable_image_html(&candidate).is_some() {
                    blocks.push(PresentationBlock::Image(candidate));
                    index += consumed;
                    continue;
                }
            }
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
        && !(!lines[index].starts_with("    ") && !lines[index].starts_with('\t')
            && portable_image_html_candidate(lines, index).is_some_and(|(candidate, _)| sanitize_portable_image_html(&candidate).is_some()))
        && !lines[index].trim_start().starts_with('>')
        && markdown_heading(lines[index]).is_none()
    {
        parts.push(lines[index].trim());
        index += 1;
    }
    (parts.join(" "), index)
}

// ---------------------------------------------------------------
// Rich list upgrade — post-parse, pre-plan
// ---------------------------------------------------------------

/// Try to upgrade a `List(Vec<String>)` to `RichList` when items have
/// detectable label/body structure (`**label** desc` or `label：desc`).
/// Non-structured lists remain as `List` and continue through existing logic.
fn upgrade_rich_list(items: &[String]) -> Option<PresentationRichList> {
    let mut cursor = 0usize;
    let base_indent = items.first().map_or(0, |item| list_item_indent(item));
    let rich_items = parse_rich_list_level(items, &mut cursor, base_indent);
    // Every overview label must be readable. A partial promotion would create
    // blank or fabricated labels on the overview slide.
    let labeled = rich_items.iter().filter(|i| !i.label.is_empty()).count();
    if labeled != rich_items.len() {
        return None;
    }
    Some(PresentationRichList { items: rich_items })
}

fn parse_rich_list_level(items: &[String], cursor: &mut usize, level_indent: usize) -> Vec<RichListItem> {
    let mut output = Vec::new();
    while let Some(raw) = items.get(*cursor) {
        let indent = list_item_indent(raw);
        if indent < level_indent || indent > level_indent {
            break;
        }
        let mut item = parse_rich_list_item(raw);
        *cursor += 1;
        if let Some(next) = items.get(*cursor) {
            let child_indent = list_item_indent(next);
            if child_indent > indent {
                item.children = parse_rich_list_level(items, cursor, child_indent);
            }
        }
        output.push(item);
    }
    output
}

fn parse_rich_list_item(item: &str) -> RichListItem {
    let stripped = strip_list_marker(item).trim().to_string();
    // **label** + body
    if let Some(rest) = stripped.strip_prefix("**") {
        if let Some((label, after)) = rest.split_once("**") {
            let body = after.trim_start_matches([':', '：', ' ', '-']).trim().to_string();
            return RichListItem { label: label.trim().to_string(), body, children: vec![], ordered: ordered_list_marker(item).is_some() };
        }
    }
    // label：body or label: body
    if let Some((label, body)) = stripped.split_once('：').or_else(|| stripped.split_once(": ")) {
        return RichListItem { label: label.trim().to_string(), body: body.trim().to_string(), children: vec![], ordered: ordered_list_marker(item).is_some() };
    }
    // Single short line — treat whole thing as label
    let text = markdown_inline_to_text(&stripped);
    if text.chars().count() <= 48 && !text.contains("。") {
        return RichListItem { label: text, body: String::new(), children: vec![], ordered: ordered_list_marker(item).is_some() };
    }
    // Couldn't extract — empty label signals skip
    RichListItem { label: String::new(), body: stripped, children: vec![], ordered: ordered_list_marker(item).is_some() }
}

/// Run semantic grouping pass on a topic's blocks.
/// Returns `Some(SemanticGroup)` when a list-backed group is detected at high confidence,
/// `None` to fall through to existing planning logic.
fn semantic_grouping_pass(topic: &PresentationTopic) -> Option<SemanticGroup> {
    // Check: topic must have exactly one top-level list (possibly with surrounding paragraphs as evidence)
    let list_blocks: Vec<&PresentationBlock> = topic.blocks.iter().filter(|b| matches!(b, PresentationBlock::List(_) | PresentationBlock::RichList(_))).collect();
    if list_blocks.len() != 1 {
        return None;
    }
    let list_block = list_blocks[0];
    let items: &[String] = match list_block {
        PresentationBlock::List(items) => items,
        PresentationBlock::RichList(rich) => return upgrade_group_from_rich_list(rich, topic),
        _ => return None,
    };
    // Overview-detail needs 3-6 roots; relationship layouts may use two roots.
    if items.len() < 2 || items.len() > 6 {
        return None;
    }
    // Try to upgrade to RichList and then evaluate
    if let Some(rich) = upgrade_rich_list(items) {
        // Temporarily insert RichList into a synthetic topic blocks for evaluation
        let mut eval_blocks = topic.blocks.clone();
        if let Some(pos) = eval_blocks.iter().position(|b| matches!(b, PresentationBlock::List(_))) {
            eval_blocks[pos] = PresentationBlock::RichList(rich);
        }
        let eval_topic = PresentationTopic { blocks: eval_blocks, ..topic.clone() };
        // Find the rich list again and evaluate
        for block in &eval_topic.blocks {
            if let PresentationBlock::RichList(r) = block {
                return upgrade_group_from_rich_list(r, &eval_topic);
            }
        }
    }
    None
}

fn upgrade_group_from_rich_list(rich: &PresentationRichList, topic: &PresentationTopic) -> Option<SemanticGroup> {
    if rich.items.is_empty() {
        return None;
    }
    let items = &rich.items;
    // Only preserve evidence whose ownership is explicit in the Markdown item.
    // A paragraph after a multi-item list is topic-level copy, not safe member evidence.
    let evidence_map = assign_evidence_to_items(items, &topic.blocks);
    // Build members
    let members: Vec<SemanticMember> = items.iter().map(|item| {
        let mut evidence = (!item.body.trim().is_empty())
            .then(|| PresentationBlock::Paragraph(item.body.clone()))
            .into_iter()
            .collect::<Vec<_>>();
        evidence.extend(evidence_map.get(&item.label).cloned().unwrap_or_default());
        SemanticMember { label: item.label.clone(), evidence, children: item.children.iter().map(|c| SemanticMember { label: c.label.clone(), evidence: vec![], children: vec![] }).collect() }
    }).collect();
    let (relation, confidence) = detect_relation_kind(items, topic);
    // Low confidence → don't use semantic grouping, fall through to existing logic
    if confidence == Confidence::Low {
        return None;
    }
    Some(SemanticGroup {
        headline: topic.title.clone(),
        members,
        relation,
        confidence,
    })
}

fn semantic_member_to_card(member: &SemanticMember) -> ListCardPlan {
    let mut body_markdown = blocks_to_markdown(&member.evidence, None, None);
    if !member.children.is_empty() {
        let children = member
            .children
            .iter()
            .map(|child| format!("- {}", child.label))
            .collect::<Vec<_>>()
            .join("\n");
        if !body_markdown.trim().is_empty() {
            body_markdown.push_str("\n\n");
        }
        body_markdown.push_str(&children);
    }
    ListCardPlan {
        title: member.label.clone(),
        body_markdown,
    }
}

fn semantic_relation_plan(chapter: &str, topic: &PresentationTopic) -> Option<PresentationSlidePlan> {
    let group = semantic_grouping_pass(topic)?;
    if group.confidence != Confidence::High {
        return None;
    }
    let cards = group.members.iter().map(semantic_member_to_card).collect::<Vec<_>>();
    match group.relation {
        RelationKind::Sequence => Some(PresentationSlidePlan::Process {
            chapter: chapter.to_string(),
            title: group.headline,
            steps: cards,
        }),
        RelationKind::Cycle if (3..=5).contains(&cards.len()) => Some(PresentationSlidePlan::Cycle {
            chapter: chapter.to_string(),
            title: group.headline,
            items: cards,
        }),
        // Nested Markdown is document structure, not enough evidence for a
        // diagram. Automatic hierarchy routing is disabled; this remains for
        // a future explicit hierarchy directive.
        RelationKind::Hierarchy
            if topic.directive.layout.as_deref() == Some("hierarchy")
                && cards.len() >= 2
                && group.members.iter().all(|member| !member.children.is_empty()) =>
        {
            Some(PresentationSlidePlan::Hierarchy {
                chapter: chapter.to_string(),
                title: group.headline,
                roots: cards,
            })
        }
        RelationKind::Comparison if cards.len() >= 2 && cards.len() % 2 == 0 => {
            let midpoint = cards.len() / 2;
            Some(PresentationSlidePlan::Comparison {
                chapter: chapter.to_string(),
                title: group.headline,
                left: cards[..midpoint].to_vec(),
                right: cards[midpoint..].to_vec(),
            })
        }
        RelationKind::Parallel | RelationKind::Cycle | RelationKind::Comparison | RelationKind::Hierarchy => None,
    }
}

/// Assign explanatory blocks (paragraphs, lists, images, tables, code) that follow
/// each list item as that item's evidence. Uses proximity: blocks between item N+1
/// and item N belong to item N.
fn assign_evidence_to_items(_items: &[RichListItem], _blocks: &[PresentationBlock]) -> std::collections::HashMap<String, Vec<PresentationBlock>> {
    // The flat block stream does not retain a trustworthy parent for paragraphs
    // after a multi-item list. Returning no mapping is safer than inventing one.
    std::collections::HashMap::new()
}

fn detect_relation_kind(items: &[RichListItem], topic: &PresentationTopic) -> (RelationKind, Confidence) {
    let all_ordered = items.iter().all(|i| i.ordered);
    let all_same = items.iter().all(|i| i.body.is_empty());
    let all_structured = items.iter().all(|i| !i.label.trim().is_empty() && !i.body.trim().is_empty());
    let text = topic.blocks.iter().map(|b| match b { PresentationBlock::Paragraph(p) => p.clone(), _ => String::new() }).collect::<Vec<_>>().join(" ");
    let title = topic.title.to_lowercase();
    let combined = format!("{} {}", title, text).to_lowercase();
    // Check nested hierarchy
    let has_nested = items.iter().any(|i| !i.children.is_empty());
    if has_nested && items.len() >= 2 {
        return (RelationKind::Hierarchy, Confidence::High);
    }
    // Check cycle keywords
    if (3..=5).contains(&items.len()) && items.iter().all(|i| i.body.is_empty()) {
        let title_signals_cycle = title.contains("闭环") || title.contains("循环") || title.contains("迭代") || title.contains("复盘");
        let explicit_cycle_intro = text.contains("循环如下") || text.contains("形成闭环") || text.contains("进入下一轮");
        if title_signals_cycle || explicit_cycle_intro {
            return (RelationKind::Cycle, Confidence::High);
        }
    }
    // Ordered lists alone are common document structure. Only route to a
    // process slide when the author also supplied an explicit process cue.
    if combined.contains("步骤") || combined.contains("流程") || combined.contains("先后") {
        return (RelationKind::Sequence, Confidence::High);
    }
    if all_ordered {
        return (RelationKind::Sequence, Confidence::Low);
    }
    // Check comparison
    if items.len() >= 2 && items.len() <= 8 && items.len() % 2 == 0 {
        if combined.contains("对比") || combined.contains("优缺点") || combined.contains("前后") {
            return (RelationKind::Comparison, Confidence::High);
        }
    }
    // Parallel — all items same structure, no other signal
    if all_same || all_structured || (items.len() >= 3 && items.iter().all(|i| !i.body.contains("。"))) {
        return (RelationKind::Parallel, Confidence::Medium);
    }
    (RelationKind::Parallel, Confidence::Low)
}

/// Evaluate whether a topic should be split into overview + detail pages.
/// Returns `Some((overview_markdown, detail_markdowns))` or `None` to fall through.
fn try_overview_detail_split(
    topic: &PresentationTopic,
    budget: PresentationPageBudget,
    _preferences: &PresentationHtmlExportPreferences,
) -> Option<(String, Vec<(String, String)>)> {
    let group = semantic_grouping_pass(topic)?;
    // Only Parallel/Sequence at Medium+ confidence qualify for overview-detail
    if !matches!(group.relation, RelationKind::Parallel | RelationKind::Sequence) {
        return None;
    }
    if group.confidence == Confidence::Low {
        return None;
    }
    if group.members.len() < 3 || group.members.len() > 6 {
        return None;
    }
    // Rule 6: each member must have ~70 chars or sub-content
    let has_evidence = |m: &SemanticMember| -> bool {
        let text_chars: usize = m.evidence.iter().map(|b| match b {
            PresentationBlock::Paragraph(p) => markdown_text_chars(p),
            PresentationBlock::List(items) => items.iter().map(|i| markdown_text_chars(i)).sum(),
            PresentationBlock::RichList(r) => r.items.iter().map(|i| i.label.chars().count() + i.body.chars().count()).sum(),
            PresentationBlock::Code { body, .. } => body.chars().count(),
            PresentationBlock::Table { .. } => 70,
            PresentationBlock::Image(_) => 70,
            _ => 0,
        }).sum();
        text_chars >= 70 || !m.children.is_empty()
    };
    let qualified: Vec<usize> = group.members.iter().enumerate().filter(|(_, m)| has_evidence(m)).map(|(i, _)| i).collect();
    if qualified.len() < 2 {
        return None;
    }
    // Rule 3: check for catch-all items
    for m in &group.members {
        let lower = m.label.to_lowercase();
        if lower.contains("其他") || lower.contains("注意事项") || lower.contains("补充") {
            return None;
        }
    }
    // Rule 3: check label length similarity (CV < 0.5)
    let lengths: Vec<f64> = group.members.iter().map(|m| m.label.chars().count() as f64).collect();
    let mean: f64 = lengths.iter().sum::<f64>() / lengths.len() as f64;
    if mean > 0.0 {
        let variance: f64 = lengths.iter().map(|l| (l - mean).powi(2)).sum::<f64>() / lengths.len() as f64;
        if variance.sqrt() / mean > 0.5 {
            return None;
        }
    }
    // Rule 7: baseline page count check
    let total_text: usize = group.members.iter().map(|m| m.label.chars().count() + m.evidence.iter().map(|b| {
        match b { PresentationBlock::Paragraph(p) => markdown_text_chars(p), PresentationBlock::List(items) => items.iter().map(|i| markdown_text_chars(i)).sum(), PresentationBlock::RichList(r) => r.items.iter().map(|i| i.label.chars().count() + i.body.chars().count()).sum(), PresentationBlock::Code { body, .. } => body.chars().count(), PresentationBlock::Table { markdown, .. } => markdown_text_chars(markdown), PresentationBlock::Image(_) => 50, _ => 0 }
    }).sum::<usize>()).sum();
    let baseline_pages = (total_text / budget.max_paragraph_chars.max(1)).max(1);
    let candidate_pages = 1 + qualified.len(); // overview + detail pages
    if candidate_pages > baseline_pages + 3 || candidate_pages > 5 {
        return None;
    }
    // Build overview — headline + member labels
    let overview_md = group.members.iter().enumerate().map(|(i, m)| format!("{}. {}", i + 1, m.label)).collect::<Vec<_>>().join("\n");
    // Build detail pages
    let mut details = Vec::new();
    for (_i, &idx) in qualified.iter().enumerate() {
        let m = &group.members[idx];
        let detail_md = m.evidence.iter().map(|b| match b {
            PresentationBlock::Paragraph(p) => p.clone(),
            PresentationBlock::List(items) => items.join("\n"),
            PresentationBlock::RichList(r) => r.items.iter().map(|ri| format!("- **{}** {}", ri.label, ri.body)).collect::<Vec<_>>().join("\n"),
            PresentationBlock::Code { language, body, .. } => {
                let lang = language.as_deref().unwrap_or("");
                format!("```{lang}\n{body}\n```")
            }
            PresentationBlock::Table { markdown, .. } => markdown.clone(),
            PresentationBlock::Image(md) => md.clone(),
            _ => String::new(),
        }).collect::<Vec<_>>().join("\n\n");
        let label = format!("{} — {}", group.headline, m.label);
        details.push((label, detail_md));
    }
    Some((overview_md, details))
}

// ---------------------------------------------------------------
// Rhythm assignment — post-plan, pre-render
// ---------------------------------------------------------------

fn assign_rhythm_sequence(slides: &[PresentationSlidePlan]) -> Vec<Option<VisualRhythm>> {
    let mut rhythms: Vec<Option<VisualRhythm>> = Vec::with_capacity(slides.len());
    for (i, slide) in slides.iter().enumerate() {
        let rhythm = match slide {
            // Cover/Chapter → anchor
            PresentationSlidePlan::Cover { .. } => Some(VisualRhythm::Anchor),
            PresentationSlidePlan::Chapter { .. } => Some(VisualRhythm::Anchor),
            // Thanks / Summary / SectionTransition → breathing
            PresentationSlidePlan::Thanks => Some(VisualRhythm::Breathing),
            PresentationSlidePlan::Summary { .. } => Some(VisualRhythm::Breathing),
            PresentationSlidePlan::SectionTransition { .. } => Some(VisualRhythm::Breathing),
            // Last content slide → breathing
            _ if i == slides.len().saturating_sub(2) && !matches!(slides.last(), Some(PresentationSlidePlan::Thanks)) => {
                Some(VisualRhythm::Breathing)
            }
            // Mid-slides: boundary check for consecutive dense
            _ => {
                // Default: dense, but break if 4+ consecutive dense
                let last_n: Vec<Option<VisualRhythm>> = rhythms.iter().rev().take(4).copied().collect();
                let consecutive_dense = last_n.iter().take_while(|r| **r == Some(VisualRhythm::Dense)).count();
                if consecutive_dense >= 3 {
                    Some(VisualRhythm::Breathing)
                } else {
                    Some(VisualRhythm::Dense)
                }
            }
        };
        rhythms.push(rhythm);
    }
    // Ensure final non-Thanks slide is breathing, not dense
    if rhythms.len() >= 2 {
        let last_content = rhythms.len().saturating_sub(2);
        if rhythms[last_content] == Some(VisualRhythm::Dense) {
            rhythms[last_content] = Some(VisualRhythm::Breathing);
        }
    }
    rhythms
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
    apply_list_card_layouts(&mut slides, preferences);
    slides
}

// ---------------------------------------------------------------
// Post-evaluation audit — detects layout/rthythm/density issues
// ---------------------------------------------------------------

fn audit_slide_plan(slides: &[PresentationSlidePlan]) -> Vec<String> {
    let mut warnings = Vec::new();
    if slides.len() < 3 { return warnings; }
    let mut consecutive_text = 0usize;
    for slide in slides {
        if matches!(slide, PresentationSlidePlan::Text { .. }) {
            consecutive_text += 1;
        } else {
            consecutive_text = 0;
        }
        if consecutive_text > 4 {
            warnings.push("More than 4 consecutive Text slides — consider adding visual breaks.".to_string());
            break;
        }
    }
    let char_counts: Vec<usize> = slides.iter().filter_map(|s| match s {
        PresentationSlidePlan::Text { markdown, .. } => Some(markdown.len()),
        PresentationSlidePlan::ListCards { cards, .. } => Some(cards.iter().map(|c| c.title.len() + c.body_markdown.len()).sum()),
        _ => None,
    }).collect();
    if char_counts.len() >= 3 {
        let mean = char_counts.iter().sum::<usize>() as f64 / char_counts.len() as f64;
        if mean > 0.0 {
            let variance = char_counts.iter().map(|c| (*c as f64 - mean).powi(2)).sum::<f64>() / char_counts.len() as f64;
            let cv = variance.sqrt() / mean;
            if cv > 0.6 {
                warnings.push(format!("Content density CV is {:.2} — consider rebalancing.", cv));
            }
        }
    }
    let kinds: Vec<&str> = slides.iter().map(|s| match s {
        PresentationSlidePlan::Cover { .. } => "cover",
        PresentationSlidePlan::Chapter { .. } => "chapter",
        PresentationSlidePlan::Overview { .. } => "overview",
        PresentationSlidePlan::Text { .. } => "text",
        PresentationSlidePlan::ListCards { .. } => "list-cards",
        PresentationSlidePlan::TopicCards { .. } => "topic-cards",
        PresentationSlidePlan::Figure { .. } => "figure",
        PresentationSlidePlan::Table { .. } => "table",
        PresentationSlidePlan::Code { .. } => "code",
        PresentationSlidePlan::Quote { .. } => "quote",
        PresentationSlidePlan::Process { .. } => "process",
        PresentationSlidePlan::Cycle { .. } => "cycle",
        PresentationSlidePlan::Hierarchy { .. } => "hierarchy",
        PresentationSlidePlan::Comparison { .. } => "comparison",
        PresentationSlidePlan::BigNumber { .. } => "big-number",
        PresentationSlidePlan::Summary { .. } => "summary",
        PresentationSlidePlan::SectionTransition { .. } => "section-transition",
        PresentationSlidePlan::Statement { .. } => "statement",
        PresentationSlidePlan::Thanks => "thanks",
    }).collect();
    if kinds.len() >= 10 {
        let unique: std::collections::HashSet<&str> = kinds.iter().rev().take(10).copied().collect();
        if unique.len() < 3 {
            warnings.push(format!("Only {} slide kinds in last 10 slides — low layout diversity.", unique.len()));
        }
    }
    warnings
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
            let topic = &chapter.topics[index];
            if topic.directive.section {
                slides.push(PresentationSlidePlan::SectionTransition {
                    title: topic.title.clone(),
                });
            }
            if topic.directive.layout.as_deref().map_or(true, |layout| layout == "auto") {
                if let Some(plan) = semantic_relation_plan(&chapter.title, topic) {
                    slides.push(plan);
                    index += 1;
                    continue;
                }
            }
            // P0-0: Try overview-detail split for structured lists
            if preferences.density != PresentationDensity::Master && topic.directive.layout.as_deref().map_or(true, |l| l == "auto") {
                if let Some((overview_md, details)) = try_overview_detail_split(topic, budget, preferences) {
                    let chapter_title = chapter.title.clone();
                    let topic_title = topic.title.clone();
                    slides.push(PresentationSlidePlan::Overview {
                        chapter: chapter_title.clone(),
                        title: topic_title.clone(),
                        items: overview_items_from_markdown(&overview_md),
                    });
                    for (detail_title, detail_md) in details {
                        slides.push(PresentationSlidePlan::Text {
                            chapter: chapter_title.clone(),
                            title: detail_title.clone(),
                            subtitle: None,
                            markdown: detail_md,
                        });
                    }
                    index += 1;
                    continue;
                }
            }
            if let Some(plan) = semantic_plan_for_topic(&chapter.title, topic, preferences) {
                slides.push(plan);
                index += 1;
                continue;
            }
            if !has_list_topic && topic.directive.is_empty() {
                if let Some((cards, next_index)) = collect_topic_cards(&chapter.topics, index, budget.max_cards, preferences) {
                    if topic_cards_need_overview_detail(&cards) {
                        slides.push(PresentationSlidePlan::Overview {
                            chapter: chapter.title.clone(),
                            title: chapter.title.clone(),
                            items: cards.iter().map(|card| card.title.clone()).collect(),
                        });
                        for card in cards {
                            slides.push(PresentationSlidePlan::Text {
                                chapter: chapter.title.clone(),
                                title: card.title,
                                subtitle: None,
                                markdown: card.summary_markdown,
                            });
                        }
                    } else {
                        slides.push(PresentationSlidePlan::TopicCards {
                            chapter: chapter.title.clone(),
                            cards,
                        });
                    }
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
        .any(|block| matches!(block, PresentationBlock::List(_) | PresentationBlock::RichList(_)))
}

fn semantic_plan_for_topic(
    chapter: &str,
    topic: &PresentationTopic,
    _preferences: &PresentationHtmlExportPreferences,
) -> Option<PresentationSlidePlan> {
    if topic.blocks.iter().any(|block| matches!(block, PresentationBlock::Image(_) | PresentationBlock::Table { .. } | PresentationBlock::Code { .. })) {
        return None;
    }
    let forced = topic.directive.layout.as_deref().filter(|layout| *layout != "auto");
    let auto = if forced.is_none() {
        detect_semantic_layout(topic)
    } else {
        None
    };
    let layout = forced.or(auto)?;
    let all_markdown = blocks_to_markdown(&topic.blocks, None, None);
    let list_items = topic
        .blocks
        .iter()
        .filter_map(|block| match block {
            PresentationBlock::List(items) => Some(items.clone()),
            PresentationBlock::RichList(rich) => Some(rich.items.iter().map(|i| { if i.body.is_empty() { i.label.clone() } else { format!("**{}** {}", i.label, i.body) } }).collect::<Vec<_>>()),
            _ => None,
        })
        .flatten()
        .collect::<Vec<_>>();
    match layout {
        "quote" => topic.blocks.iter().find_map(|block| match block { PresentationBlock::Quote(value) => Some(PresentationSlidePlan::Quote {
            chapter: chapter.to_string(), title: topic.title.clone(), markdown: value.clone(),
        }), _ => None }),
        "process" if (3..=6).contains(&list_items.len()) => Some(PresentationSlidePlan::Process {
            chapter: chapter.to_string(), title: topic.title.clone(), steps: list_items_to_cards(&list_items),
        }),
        "comparison" if (2..=8).contains(&list_items.len()) && list_items.len() % 2 == 0 => {
            let midpoint = list_items.len() / 2;
            Some(PresentationSlidePlan::Comparison {
                chapter: chapter.to_string(), title: topic.title.clone(),
                left: list_items_to_cards(&list_items[..midpoint]), right: list_items_to_cards(&list_items[midpoint..]),
            })
        }
        "big-number" => extract_primary_number(&all_markdown).map(|number| PresentationSlidePlan::BigNumber {
            chapter: chapter.to_string(), title: topic.title.clone(), number,
            supporting: markdown_inline_to_text(&all_markdown),
        }),
        "summary" if (2..=4).contains(&list_items.len()) => Some(PresentationSlidePlan::Summary {
            chapter: chapter.to_string(), title: topic.title.clone(), items: list_items_to_cards(&list_items),
        }),
        _ => None,
    }
}

fn topic_list_item_count(topic: &PresentationTopic) -> Option<usize> {
    for block in &topic.blocks {
        match block {
            PresentationBlock::List(items) => return Some(items.len()),
            PresentationBlock::RichList(rich) => return Some(rich.items.len()),
            _ => continue,
        }
    }
    None
}

fn detect_semantic_layout(topic: &PresentationTopic) -> Option<&'static str> {
    let has_quote = topic.blocks.iter().any(|block| matches!(block, PresentationBlock::Quote(_)));
    if has_quote && topic.blocks.len() == 1 {
        return Some("quote");
    }
    let text = blocks_to_markdown(&topic.blocks, None, None);
    let title = normalized_title_text(&topic.title).to_lowercase();
    if let Some(item_count) = topic_list_item_count(topic) {
        if (3..=6).contains(&item_count) && (title.contains("实施流程") || text.contains("流程如下") || text.contains("分为以下步骤")) {
            return Some("process");
        }
        if (2..=8).contains(&item_count) && item_count % 2 == 0 && (title.contains("方案对比") || text.contains("优缺点对照") || text.contains("以下进行对比")) {
            return Some("comparison");
        }
        if (2..=4).contains(&item_count) && (title.contains("核心结论") || text.contains("总结如下") || text.contains("关键 takeaway")) {
            return Some("summary");
        }
        return None;
    }
    // A bare number is too ambiguous for automatic emphasis: dates, versions
    // and section identifiers are common in Markdown. Big-number slides must
    // be explicitly requested with a presentation directive.
    None
}

fn extract_primary_number(value: &str) -> Option<String> {
    let start = value.char_indices().find_map(|(index, ch)| ch.is_ascii_digit().then_some(index))?;
    let tail = &value[start..];
    let end = tail
        .char_indices()
        .take_while(|(_, ch)| ch.is_ascii_digit() || matches!(ch, '.' | ',' | '%' | '％'))
        .last()
        .map(|(index, ch)| index + ch.len_utf8())?;
    Some(tail[..end].to_string())
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
        if !topic.directive.is_empty() || detect_semantic_layout(topic).is_some() || !is_short_card_topic(topic, preferences) {
            break;
        }
        let summary_markdown = topic_card_summary(topic, preferences);
        if topic_card_contains_multiple_children(&summary_markdown) {
            break;
        }
        cards.push(TopicCardPlan {
            title: topic.title.clone(),
            summary_markdown,
        });
        index += 1;
    }
    (cards.len() >= 2 && topic_cards_have_balanced_copy(&cards)).then_some((cards, index))
}

fn topic_cards_have_balanced_copy(cards: &[TopicCardPlan]) -> bool {
    let lengths = cards
        .iter()
        .map(|card| markdown_text_chars(&card.summary_markdown))
        .collect::<Vec<_>>();
    let Some(shortest) = lengths.iter().copied().min() else {
        return false;
    };
    let longest = lengths.iter().copied().max().unwrap_or(0);
    shortest > 0 && longest.saturating_sub(shortest) <= 48
}

fn topic_cards_need_overview_detail(cards: &[TopicCardPlan]) -> bool {
    (3..=4).contains(&cards.len())
        && cards
            .iter()
            .all(|card| markdown_text_chars(&card.summary_markdown) >= 72)
}

fn topic_card_contains_multiple_children(markdown: &str) -> bool {
    markdown
        .lines()
        .filter(|line| is_markdown_list_item(line))
        .take(2)
        .count()
        >= 2
}

fn overview_items_from_markdown(markdown: &str) -> Vec<String> {
    markdown
        .lines()
        .map(|line| {
            line.trim_start_matches(|ch: char| ch.is_ascii_digit() || matches!(ch, '.' | '、' | ' '))
                .trim()
                .to_string()
        })
        .filter(|item| !item.is_empty())
        .collect()
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
            PresentationBlock::List(_) | PresentationBlock::RichList(_) => return false,
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
                let text_chars: usize = text_blocks.iter().map(|b| match b { PresentationBlock::Paragraph(p) => p.chars().count(), PresentationBlock::List(items) => items.iter().map(|i| i.chars().count()).sum(), _ => 0 }).sum();
                let layout = figure_layout_for_markdown(markdown, source_dir);
                // Lookahead: if text is small (< 100 chars), merge as aside instead of flushing
                let aside_markdown = if !text_blocks.is_empty() && (layout == FigureLayout::Side || text_chars < 100) {
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
    preferences: &PresentationHtmlExportPreferences,
    slides: &mut Vec<PresentationSlidePlan>,
) {
    if cards.len() < 2 || !list_cards_have_balanced_copy(&cards) {
        push_list_cards_as_text(chapter, title, intro, cards, outro, preferences, slides);
        return;
    }
    let capacity_hint = list_layout_capacity_hint(intro.as_deref(), &cards, outro.as_deref(), preferences);
    let counts = landscape_card_chunks_with_capacity(&cards, outro.is_some(), capacity_hint);
    if counts.len() <= 1 {
        slides.push(PresentationSlidePlan::ListCards {
            chapter: chapter.to_string(),
            title: title.to_string(),
            intro,
            cards,
            outro,
            layout: None,
        });
        return;
    }

    let mut start = 0usize;
    let last_index = counts.len().saturating_sub(1);
    for (chunk_index, count) in counts.into_iter().enumerate() {
        let end = (start + count).min(cards.len());
        let chunk_intro = (chunk_index == 0).then(|| intro.clone()).flatten();
        let chunk_outro = (chunk_index == last_index).then(|| outro.clone()).flatten();
        let chunk_cards = cards[start..end].to_vec();
        if !list_cards_have_balanced_copy(&chunk_cards) {
            push_list_cards_as_text(
                chapter,
                title,
                chunk_intro,
                chunk_cards,
                chunk_outro,
                preferences,
                slides,
            );
            start = end;
            continue;
        }
        slides.push(PresentationSlidePlan::ListCards {
            chapter: chapter.to_string(),
            title: title.to_string(),
            intro: chunk_intro,
            cards: chunk_cards,
            outro: chunk_outro,
            layout: None,
        });
        start = end;
    }
}

fn list_cards_have_balanced_copy(cards: &[ListCardPlan]) -> bool {
    let Some(first) = cards.first() else {
        return false;
    };
    let has_body = !first.body_markdown.trim().is_empty();
    cards
        .iter()
        .all(|card| !card.body_markdown.trim().is_empty() == has_body)
}

fn push_list_cards_as_text(
    chapter: &str,
    title: &str,
    intro: Option<String>,
    cards: Vec<ListCardPlan>,
    outro: Option<String>,
    preferences: &PresentationHtmlExportPreferences,
    slides: &mut Vec<PresentationSlidePlan>,
) {
    let mut blocks = Vec::new();
    if let Some(intro) = intro.filter(|value| !value.trim().is_empty()) {
        blocks.push(PresentationBlock::Paragraph(intro));
    }
    if !cards.is_empty() {
        blocks.push(PresentationBlock::List(
            cards
                .into_iter()
                .map(|card| {
                    if card.body_markdown.trim().is_empty() {
                        format!("- {}", card.title)
                    } else {
                        format!("- **{}** {}", card.title, card.body_markdown)
                    }
                })
                .collect(),
        ));
    }
    if let Some(outro) = outro.filter(|value| !value.trim().is_empty()) {
        blocks.push(PresentationBlock::Paragraph(outro));
    }
    for (subtitle, markdown) in text_slide_markdown(&blocks, preferences) {
        slides.push(PresentationSlidePlan::Text {
            chapter: chapter.to_string(),
            title: title.to_string(),
            subtitle,
            markdown,
        });
    }
}

fn landscape_card_chunks_with_capacity(
    cards: &[ListCardPlan],
    has_outro: bool,
    capacity_hint: Option<usize>,
) -> Vec<usize> {
    let limit = capacity_hint.unwrap_or_else(|| landscape_card_limit(cards, has_outro));
    if cards.len() <= limit {
        return vec![cards.len()];
    }
    let mut chunks = balanced_card_chunks(cards.len(), limit);
    if chunks.len() > 1 && chunks.last() == Some(&1) {
        let tail = chunks.pop();
        if let (Some(tail), Some(previous)) = (tail, chunks.last_mut()) {
            *previous += tail;
        }
    }
    chunks
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

fn list_layout_capacity_hint(
    intro: Option<&str>,
    cards: &[ListCardPlan],
    outro: Option<&str>,
    preferences: &PresentationHtmlExportPreferences,
) -> Option<usize> {
    if plan_list_card_layout(intro, cards, outro, preferences).is_some() {
        return None;
    }
    if cards.len() == 7 && cards.iter().any(|card| !card.body_markdown.trim().is_empty()) {
        return Some(4);
    }
    for capacity in (2..cards.len()).rev() {
        let counts = balanced_card_chunks(cards.len(), capacity);
        let mut start = 0usize;
        let all_chunks_fit = counts.into_iter().enumerate().all(|(index, count)| {
            let end = (start + count).min(cards.len());
            let chunk_intro = (index == 0).then_some(intro).flatten();
            let chunk_outro = (end == cards.len()).then_some(outro).flatten();
            let fits = plan_list_card_layout(chunk_intro, &cards[start..end], chunk_outro, preferences).is_some();
            start = end;
            fits
        });
        if all_chunks_fit {
            return Some(capacity);
        }
    }
    Some(2)
}

fn apply_list_card_layouts(
    slides: &mut [PresentationSlidePlan],
    preferences: &PresentationHtmlExportPreferences,
) {
    let mut previous: Option<ListCardLayoutPlan> = None;
    for slide in slides {
        let PresentationSlidePlan::ListCards {
            intro,
            cards,
            outro,
            layout,
            ..
        } = slide else {
            previous = None;
            continue;
        };
        let mut planned = plan_list_card_layout(intro.as_deref(), cards, outro.as_deref(), preferences)
            .unwrap_or_else(|| fallback_list_card_layout(cards, preferences));
        if let Some(previous) = previous {
            let adjusted = planned.card_height.clamp_step_from(previous.card_height);
            if adjusted >= planned.minimum_card_height {
                planned.card_height = adjusted;
            }
        }
        previous = Some(planned.clone());
        *layout = Some(planned);
    }
}

fn fallback_list_card_layout(
    cards: &[ListCardPlan],
    preferences: &PresentationHtmlExportPreferences,
) -> ListCardLayoutPlan {
    let columns = match cards.len() {
        0 | 1 => 1,
        2 | 3 => cards.len(),
        4 => 2,
        _ => 1,
    };
    ListCardLayoutPlan {
        arrangement: ListCardArrangement::StackedGrid,
        columns,
        card_height: CardHeightBand::Relaxed,
        minimum_card_height: CardHeightBand::Relaxed,
        gap: 14,
        group_width_percent: 100,
        vertical_centered: true,
        estimated_fill_per_mille: 0,
        score: layout_score(0, layout_frame(preferences).1, 0, 200),
    }
}

fn plan_list_card_layout(
    intro: Option<&str>,
    cards: &[ListCardPlan],
    outro: Option<&str>,
    preferences: &PresentationHtmlExportPreferences,
) -> Option<ListCardLayoutPlan> {
    let mut candidates = Vec::new();
    if let Some(columns) = stacked_grid_columns(cards, preferences) {
        if let Some(plan) = plan_stacked_grid_layout(intro, cards, outro, columns, preferences) {
            candidates.push(plan);
        }
    }
    if side_by_side_is_candidate(cards) {
        if let Some(plan) = plan_side_by_side_layout(intro, cards, outro, preferences) {
            candidates.push(plan);
        }
    }
    candidates
        .into_iter()
        .max_by_key(|plan| (plan.score, matches!(plan.arrangement, ListCardArrangement::StackedGrid)))
}

fn stacked_grid_columns(
    cards: &[ListCardPlan],
    preferences: &PresentationHtmlExportPreferences,
) -> Option<usize> {
    let count = cards.len();
    if !(1..=6).contains(&count) {
        return None;
    }
    if count == 1 {
        return Some(1);
    }
    if count <= 3 {
        return Some(count);
    }
    let all_short = cards.iter().all(|card| {
        card.body_markdown.trim().is_empty()
            && estimated_wrapped_lines(&card.title, candidate_card_width(count, count, preferences), 9) <= 1
    });
    match count {
        4 if all_short => Some(4),
        4 => Some(2),
        5 if all_short => Some(5),
        5 => None,
        6 => Some(3),
        _ => None,
    }
}

fn side_by_side_is_candidate(cards: &[ListCardPlan]) -> bool {
    cards.len() >= 4
        && (cards.len() >= 6
            || cards.iter().any(|card| !card.body_markdown.trim().is_empty())
            || cards.iter().any(|card| card.title.chars().count() > 18))
}

fn layout_frame(preferences: &PresentationHtmlExportPreferences) -> (usize, usize) {
    if preferences.aspect_ratio == "4-3" {
        (748, 555)
    } else {
        (1048, 555)
    }
}

fn candidate_card_width(
    _count: usize,
    columns: usize,
    preferences: &PresentationHtmlExportPreferences,
) -> usize {
    let (width, _) = layout_frame(preferences);
    let gaps = columns.saturating_sub(1) * 14;
    (width.saturating_sub(gaps) / columns.max(1)).max(160)
}

fn estimated_wrapped_lines(value: &str, width: usize, average_char_width: usize) -> usize {
    let chars_per_line = (width / average_char_width.max(1)).max(1);
    markdown_text_chars(value).div_ceil(chars_per_line).max(1)
}

fn estimated_copy_height(intro: Option<&str>, outro: Option<&str>, width: usize) -> usize {
    [intro, outro]
        .into_iter()
        .flatten()
        .map(|value| estimated_wrapped_lines(value, width, 8) * 24)
        .sum()
}

fn band_for_cards(
    cards: &[ListCardPlan],
    width: usize,
    arrangement: ListCardArrangement,
) -> Option<(CardHeightBand, usize)> {
    let (title_line_height, body_line_height, padding) = match arrangement {
        ListCardArrangement::StackedGrid => (22, 19, 34),
        ListCardArrangement::SideBySideStack => (19, 18, 20),
    };
    let max_text_height = cards
        .iter()
        .map(|card| {
            estimated_wrapped_lines(&card.title, width, 9) * title_line_height
                + (!card.body_markdown.trim().is_empty()) as usize
                    * estimated_wrapped_lines(&card.body_markdown, width, 8)
                    * body_line_height
        })
        .max()
        .unwrap_or(0);
    [CardHeightBand::Compact, CardHeightBand::Standard, CardHeightBand::Relaxed]
        .into_iter()
        .filter(|band| band.pixels() >= max_text_height + padding)
        .find_map(|band| {
            let fill = max_text_height * 1000 / band.pixels().saturating_sub(padding).max(1);
            (fill >= 300).then_some((band, fill))
        })
}

fn plan_stacked_grid_layout(
    intro: Option<&str>,
    cards: &[ListCardPlan],
    outro: Option<&str>,
    columns: usize,
    preferences: &PresentationHtmlExportPreferences,
) -> Option<ListCardLayoutPlan> {
    let (_, frame_height) = layout_frame(preferences);
    let width = candidate_card_width(cards.len(), columns, preferences);
    let (band, fill) = band_for_cards(cards, width, ListCardArrangement::StackedGrid)?;
    let rows = cards.len().div_ceil(columns);
    let gap = 14;
    let group_height = rows * band.pixels() + rows.saturating_sub(1) * gap;
    let copy_height = estimated_copy_height(intro, outro, width * columns + gap * columns.saturating_sub(1));
    let occupied = 68 + copy_height + group_height;
    (occupied <= frame_height).then(|| ListCardLayoutPlan {
        arrangement: ListCardArrangement::StackedGrid,
        columns,
        card_height: band,
        minimum_card_height: band,
        gap,
        group_width_percent: 100,
        vertical_centered: true,
        estimated_fill_per_mille: fill,
        score: layout_score(occupied, frame_height, fill, 0),
    })
}

fn plan_side_by_side_layout(
    intro: Option<&str>,
    cards: &[ListCardPlan],
    outro: Option<&str>,
    preferences: &PresentationHtmlExportPreferences,
) -> Option<ListCardLayoutPlan> {
    let (frame_width, frame_height) = layout_frame(preferences);
    let group_width_percent = if preferences.aspect_ratio == "4-3" { 54 } else { 58 };
    let card_width = frame_width * group_width_percent / 100;
    let (band, fill) = band_for_cards(cards, card_width, ListCardArrangement::SideBySideStack)?;
    let gap = 14;
    let group_height = cards.len() * band.pixels() + cards.len().saturating_sub(1) * gap;
    let copy_height = estimated_copy_height(intro, outro, frame_width * 34 / 100);
    let occupied = 68 + group_height.max(copy_height);
    (occupied <= frame_height).then(|| ListCardLayoutPlan {
        arrangement: ListCardArrangement::SideBySideStack,
        columns: 1,
        card_height: band,
        minimum_card_height: band,
        gap,
        group_width_percent,
        vertical_centered: true,
        estimated_fill_per_mille: fill,
        score: layout_score(occupied, frame_height, fill, 14),
    })
}

fn layout_score(occupied: usize, frame_height: usize, fill: usize, arrangement_penalty: i32) -> i32 {
    let occupancy = occupied * 1000 / frame_height.max(1);
    let occupancy_penalty = (occupancy as i32 - 650).unsigned_abs() as i32;
    let fill_penalty = (fill as i32 - 510).unsigned_abs() as i32;
    2_000 - occupancy_penalty - fill_penalty - arrangement_penalty
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
    let prefix = match plain_blocks.as_slice() {
        [PresentationBlock::Paragraph(value)] => value.clone(),
        [PresentationBlock::Heading { title, .. }] => format!("**{title}**"),
        _ => return None,
    };
    let prefix_chars = markdown_text_chars(&prefix);
    if prefix_chars > presentation_budget(preferences).max_paragraph_chars {
        return None;
    }
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

fn should_render_as_list_cards(items: &[String]) -> bool {
    !items.iter().any(|item| is_link_only_list_item(item))
        && !has_multiple_nested_list_items(items)
}

fn has_multiple_nested_list_items(items: &[String]) -> bool {
    items.iter().any(|item| list_item_indent(item) > 0)
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
                let avg_item_chars = markdown_text_chars(&take_items.join("")) / take_items.len().max(1);
                let has_nested_items = take_items.iter().any(|item| list_item_indent(item) > 0);
                let chunk_size = if has_nested_items {
                    budget.max_list_items
                } else if avg_item_chars < 30 {
                    budget.max_list_items * 2
                } else if avg_item_chars > 80 {
                    (budget.max_list_items / 2).max(2)
                } else {
                    budget.max_list_items
                };
                for chunk in take_items.chunks(chunk_size) {
                    let chunk_chars: usize = chunk.iter().map(|item| markdown_text_chars(item)).sum();
                    let exceeds_nested_row_budget = has_nested_items
                        && current_items + chunk.len() > budget.max_list_items;
                    if (current_chars + chunk_chars > budget.max_paragraph_chars || exceeds_nested_row_budget)
                        && !current.is_empty()
                    {
                        push_current(&mut slides, &mut subtitle, &mut current, &mut current_chars, &mut current_items);
                    }
                    current.extend(chunk.iter().cloned());
                    current_chars += chunk_chars;
                    current_items += chunk.len();
                }
            }
            PresentationBlock::RichList(rich) => {
                let items: Vec<String> = rich.items.iter().map(|item| {
                    if item.body.is_empty() { item.label.clone() } else { format!("- **{}** {}", item.label, item.body) }
                }).collect();
                let avg_item_chars = markdown_text_chars(&items.join("")) / items.len().max(1);
                let chunk_size = if avg_item_chars < 30 { budget.max_list_items * 2 } else if avg_item_chars > 80 { (budget.max_list_items / 2).max(2) } else { budget.max_list_items };
                for chunk in items.chunks(chunk_size) {
                    let chunk_chars: usize = chunk.iter().map(|item| markdown_text_chars(item)).sum();
                    if current_chars + chunk_chars > budget.max_paragraph_chars && !current.is_empty() {
                        push_current(&mut slides, &mut subtitle, &mut current, &mut current_chars, &mut current_items);
                    }
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
        let combined_list_items = [&slides[last_index - 1].1, &slides[last_index].1]
            .into_iter()
            .flat_map(|markdown| markdown.lines())
            .filter(|line| is_markdown_list_item(line))
            .count();
        let has_nested_list_items = [&slides[last_index - 1].1, &slides[last_index].1]
            .into_iter()
            .flat_map(|markdown| markdown.lines())
            .any(|line| is_markdown_list_item(line) && list_item_indent(line) > 0);
        if has_nested_list_items && combined_list_items > budget.max_list_items {
            break;
        }
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
            PresentationBlock::RichList(rich) => {
                for item in &rich.items {
                    let prefix = if item.body.is_empty() { item.label.clone() } else { format!("**{}** {}", item.label, item.body) };
                    output.push(prefix);
                }
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
    rhythm: Option<VisualRhythm>,
) -> String {
    let active = if index == 1 { " is-active" } else { "" };
    let rhythm_cls = rhythm.map(|r| format!(" {}", r.class_name())).unwrap_or_default();
    let rendered = match plan {
        PresentationSlidePlan::Cover { title } => format!(
            r#"<section class="slide cover density-{density}{active}{rhythm_cls}" data-slide-kind="cover" data-density="{density}" data-slide-index="{index}" data-page-index="{index}" data-title="{title_attr}">
  <div class="cover-copy">
    <p class="kicker">Markdown Presentation</p>
    <h1 class="cover-title">{title}</h1>
  </div>
  <div class="deck-footer"><span>{source}</span><span>{index}/{total}</span></div>
</section>"#,
            density = preferences.density.key(),
            active = active,
            rhythm_cls = rhythm_cls,
            index = index,
            title_attr = escape_html_attr(title),
            title = escape_html_text(title),
            source = escape_html_text(&input.source_file),
            total = total,
        ),
        PresentationSlidePlan::Chapter { title } => format!(
            r#"<section class="slide chapter density-{density}{active}{rhythm_cls}" data-slide-kind="chapter" data-density="{density}" data-slide-index="{index}" data-page-index="{index}" data-title="{title_attr}">
  <div class="chapter-copy">
    <span class="chapter-index">Chapter · {label}</span>
    <h2 class="chapter-title">{title}</h2>
  </div>
  <div class="deck-footer"><span>{source}</span><span>{index}/{total}</span></div>
</section>"#,
            density = preferences.density.key(),
            active = active,
            rhythm_cls = rhythm_cls,
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
                r#"<section class="slide statement density-{density}{active}{rhythm_cls}" data-slide-kind="statement" data-density="{density}" data-topic-title="{title_attr}" data-slide-index="{index}" data-page-index="{index}" data-title="{title_attr}">
  <p class="kicker">{chapter}</p>
  <div class="statement-rule"></div>
  <h2 class="statement-title">{title}</h2>
  {note}
  <div class="deck-footer"><span>{source}</span><span>{index}/{total}</span></div>
</section>"#,
                density = preferences.density.key(),
                active = active,
                rhythm_cls = rhythm_cls,
                index = index,
                title_attr = escape_html_attr(title),
                chapter = escape_html_text(chapter),
                title = escape_html_text(title),
                note = note_html,
                source = escape_html_text(&input.source_file),
                total = total,
            )
        }
        PresentationSlidePlan::Overview { chapter, title, items } => {
            let cards_html = items
                .iter()
                .enumerate()
                .map(|(item_index, item)| {
                    format!(
                        r#"<article class="overview-card"><span class="overview-card-index">{:02}</span><h3>{}</h3></article>"#,
                        item_index + 1,
                        escape_html_text(item),
                    )
                })
                .collect::<Vec<_>>()
                .join("");
            render_content_slide(
                "overview",
                preferences,
                active,
                index,
                total,
                input,
                chapter,
                title,
                None,
                &format!(r#"<div class="overview-card-grid" data-card-count="{}">{cards_html}</div>"#, items.len()),
                &rhythm_cls,
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
                r#"<section class="slide topic-cards density-{density}{active}{rhythm_cls}" data-slide-kind="topic-cards" data-density="{density}" data-slide-index="{index}" data-page-index="{index}" data-title="{chapter_attr}">
  <p class="kicker">{chapter}</p>
  <div class="topic-card-grid" data-card-count="{count}">{cards}</div>
  <div class="deck-footer"><span>{source}</span><span>{index}/{total}</span></div>
</section>"#,
                density = preferences.density.key(),
                active = active,
                rhythm_cls = rhythm_cls,
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
            let text_layout_cls = if markdown.len() > 400 { " layout-compact" } else { "" };
            let text_extra = format!("{}{}", rhythm_cls, text_layout_cls);
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
                &text_extra,
            )
        }
        PresentationSlidePlan::ListCards {
            chapter,
            title,
            intro,
            cards,
            outro,
            layout,
        } => {
            let layout = layout.as_ref().expect("list-card layouts are planned before rendering");
            let label_only = cards.len() >= 2
                && cards.iter().all(|card| card.body_markdown.trim().is_empty());
            let label_card_cls = if label_only
                && cards.iter().all(|card| markdown_text_chars(&card.title) <= 28)
            {
                " label-card"
            } else {
                ""
            };
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
                        r#"<article class="list-card{label_card_cls}"><h3 class="list-card-title">{title}</h3><div class="list-card-body">{body}</div></article>"#,
                        label_card_cls = label_card_cls,
                        title = escape_html_text(&card.title),
                        body = body,
                    )
                })
                .collect::<Vec<_>>()
                .join("");
            let lc_extra = rhythm_cls.to_string();
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
                &render_list_card_layout_with_fragments(layout, &intro_html, &cards_html, &outro_html, cards.len()),
                &lc_extra,
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
            let figure_extra = rhythm_cls.clone();
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
                &figure_extra,
            )
        }
        PresentationSlidePlan::Table { chapter, title, markdown, mode } => {
            let content = render_markdown_html(markdown);
            let table_extra = format!("{} layout-wide", rhythm_cls);
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
                &table_extra,
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
            let code_extra = format!("{} layout-wide", rhythm_cls);
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
                &code_extra,
            )
        }
        PresentationSlidePlan::SectionTransition { title } => format!(
            r#"<section class="slide section-transition density-{density}{active}{rhythm_cls}" data-slide-kind="section-transition" data-density="{density}" data-slide-index="{index}" data-page-index="{index}" data-title="{title_attr}">
  <div class="chapter-copy"><span class="chapter-index">Section</span><h2 class="chapter-title">{title}</h2></div>
  <div class="deck-footer"><span>{source}</span><span>{index}/{total}</span></div>
</section>"#,
            density = preferences.density.key(), active = active, rhythm_cls = rhythm_cls, index = index, title_attr = escape_html_attr(title),
            title = escape_html_text(title), source = escape_html_text(&input.source_file), total = total,
        ),
        PresentationSlidePlan::Quote { chapter, title, markdown } => render_content_slide(
            "quote", preferences, active, index, total, input, chapter, title, None,
            &format!(r#"<blockquote class="presentation-quote">{}</blockquote>"#, embedder.embed_images(&render_markdown_html(markdown))),
            &rhythm_cls,
        ),
        PresentationSlidePlan::Process { chapter, title, steps } => {
            let steps_html = steps.iter().enumerate().map(|(step_index, step)| format!(
                r#"<article class="presentation-step"><span class="presentation-step-number">{:02}</span><h3>{}</h3><p>{}</p></article>"#,
                step_index + 1, escape_html_text(&step.title), escape_html_text(&step.body_markdown),
            )).collect::<Vec<_>>().join("");
            render_content_slide("process", preferences, active, index, total, input, chapter, title, None,
                &format!(r#"<div class="presentation-process">{steps_html}</div>"#), &rhythm_cls)
        }
        PresentationSlidePlan::Cycle { chapter, title, items } => {
            let items_html = items.iter().enumerate().map(|(item_index, item)| {
                let angle = item_index * 360 / items.len().max(1);
                format!(
                    r#"<article class="presentation-cycle-item" style="--cycle-angle: {angle}deg"><h3>{}</h3><p>{}</p></article>"#,
                    escape_html_text(&item.title),
                    escape_html_text(&item.body_markdown),
                )
            }).collect::<Vec<_>>().join("");
            render_content_slide("cycle", preferences, active, index, total, input, chapter, title, None,
                &format!(r#"<div class="presentation-cycle"><span class="presentation-cycle-core">循环</span>{items_html}</div>"#), &rhythm_cls)
        }
        PresentationSlidePlan::Hierarchy { chapter, title, roots } => {
            let roots_html = roots.iter().map(|root| format!(
                r#"<article class="presentation-hierarchy-root"><h3>{}</h3><div>{}</div></article>"#,
                escape_html_text(&root.title),
                embedder.embed_images(&render_markdown_html(&root.body_markdown)),
            )).collect::<Vec<_>>().join("");
            render_content_slide("hierarchy", preferences, active, index, total, input, chapter, title, None,
                &format!(r#"<div class="presentation-hierarchy">{roots_html}</div>"#), &rhythm_cls)
        }
        PresentationSlidePlan::Comparison { chapter, title, left, right } => {
            let render_side = |label: &str, cards: &[ListCardPlan]| format!(
                r#"<section class="comparison-panel"><p class="comparison-label">{label}</p>{}</section>"#,
                cards.iter().map(|card| format!(r#"<article><h3>{}</h3><p>{}</p></article>"#, escape_html_text(&card.title), escape_html_text(&card.body_markdown))).collect::<Vec<_>>().join(""),
            );
            render_content_slide("comparison", preferences, active, index, total, input, chapter, title, None,
                &format!(r#"<div class="presentation-comparison">{}{}</div>"#, render_side("A", left), render_side("B", right)), &rhythm_cls)
        }
        PresentationSlidePlan::BigNumber { chapter, title, number, supporting } => render_content_slide(
            "big-number", preferences, active, index, total, input, chapter, title, None,
            &format!(r#"<div class="presentation-big-number"><strong>{}</strong><p>{}</p></div>"#, escape_html_text(number), escape_html_text(supporting)),
            &rhythm_cls,
        ),
        PresentationSlidePlan::Summary { chapter, title, items } => {
            let items_html = items.iter().enumerate().map(|(item_index, item)| format!(
                r#"<article class="summary-item"><span>{:02}</span><h3>{}</h3><p>{}</p></article>"#,
                item_index + 1, escape_html_text(&item.title), escape_html_text(&item.body_markdown),
            )).collect::<Vec<_>>().join("");
            render_content_slide("summary", preferences, active, index, total, input, chapter, title, None,
                &format!(r#"<div class="presentation-summary">{items_html}</div>"#), &rhythm_cls)
        }
        PresentationSlidePlan::Thanks => format!(
            r#"<section class="slide thanks density-{density}{active}{rhythm_cls}" data-slide-kind="thanks" data-density="{density}" data-slide-index="{index}" data-page-index="{index}" data-title="Thanks">
  <div class="thanks-content">
    <h2>Thanks</h2>
    <p><span>by</span><img class="thanks-logo" src="{{{{logo_data_uri}}}}" alt="NUTBOOK"></p>
  </div>
  <div class="deck-footer"><span>{source}</span><span>{index}/{total}</span></div>
</section>"#,
            density = preferences.density.key(),
            active = active,
            rhythm_cls = rhythm_cls,
            index = index,
            source = escape_html_text(&input.source_file),
            total = total,
        ),
    };
    let page_id = presentation_page_id(index);
    protocolize_editable_markup(&rendered, &page_id, Some(&page_id))
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
    extra_cls: &str,
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
        r#"<section class="slide {kind} density-{density}{active}{extra_cls}" data-slide-kind="{kind}" data-density="{density}" data-topic-title="{title_attr}" data-slide-index="{index}" data-page-index="{index}" data-title="{title_attr}">
  {kicker}
  <h2 class="slide-title">{title}</h2>
  {subtitle}
  {body}
  <div class="deck-footer"><span>{source}</span><span>{index}/{total}</span></div>
</section>"#,
        kind = kind,
        density = preferences.density.key(),
        active = active,
        extra_cls = extra_cls,
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

fn render_list_card_layout_with_fragments(
    layout: &ListCardLayoutPlan,
    intro_html: &str,
    cards_html: &str,
    outro_html: &str,
    card_count: usize,
) -> String {
    let style = format!(
        "--card-cols: {}; --card-row-height: {}px; --card-gap: {}px; --group-width: {}%; --group-offset: 0px;",
        layout.columns,
        layout.card_height.pixels(),
        layout.gap,
        layout.group_width_percent,
    );
    let vertical_position = if layout.vertical_centered { "centered" } else { "flow" };
    if layout.arrangement == ListCardArrangement::SideBySideStack {
        return format!(
            r#"<div class="list-card-flow" data-vertical-position="{vertical_position}" style="{style}"><div class="list-card-layout" data-layout="{layout}"><div class="list-card-copy">{intro}{outro}</div><div class="list-card-grid" data-card-count="{count}">{cards}</div></div></div>"#,
            layout = layout.arrangement.key(),
            style = style,
            vertical_position = vertical_position,
            intro = intro_html,
            outro = outro_html,
            count = card_count,
            cards = cards_html,
        );
    }
    format!(
        r#"<div class="list-card-flow" data-vertical-position="{vertical_position}" style="{style}"><div class="list-card-layout" data-layout="{layout}"><div class="list-card-copy">{intro}</div><div class="list-card-grid" data-card-count="{count}">{cards}</div></div>{outro}</div>"#,
        layout = layout.arrangement.key(),
        style = style,
        vertical_position = vertical_position,
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
        assign_evidence_to_items, default_markdown_html_file_name, fallback_presentation_dark_template,
        fallback_presentation_light_template, fallback_reading_dark_template, fallback_reading_light_template, parse_presentation_blocks,
        landscape_card_chunks_with_capacity, list_layout_capacity_hint, plan_list_card_layout,
        presentation_budget, render_presentation_html, render_reading_html, should_render_as_list_cards, text_slide_markdown,
        semantic_relation_plan, try_overview_detail_split, MarkdownHtmlExportInput, MarkdownHtmlExportPreferences, PresentationBlock,
        PresentationDensity, PresentationDirective, PresentationHtmlExportPreferences, PresentationRichList,
        PresentationSlidePlan, PresentationTopic, ReadingWidth, RichListItem, ListCardArrangement,
        ListCardPlan,
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

    fn contains_tag_text(html: &str, tag: &str, class_name: Option<&str>, text: &str) -> bool {
        let opening = match class_name {
            Some(class_name) => format!(r#"<{tag} class="{class_name}""#),
            None => format!("<{tag}"),
        };
        let closing = format!(">{text}</{tag}>");
        html.match_indices(&opening).any(|(index, _)| {
            let remainder = &html[index..];
            remainder.find('>').is_some_and(|end| remainder[end..].starts_with(&closing))
        })
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
    fn reading_templates_show_modified_time_without_source_file_below_title() {
        for template_html in [fallback_reading_light_template(), fallback_reading_dark_template()] {
            let output = render_reading_html(MarkdownHtmlExportInput {
                title: "Document".to_string(),
                source_file: "ai-generated-name.md".to_string(),
                source_path: temp_path("metadata").with_extension("md"),
                markdown: "# Document\n\nBody".to_string(),
                generated_at: "修改时间：2026-09-23 10:00".to_string(),
                template_html: template_html.to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            })
            .expect("reading html should render");
            assert!(output.html.contains("<div>修改时间：2026-09-23 10:00</div>"));
            assert!(!output.html.contains("ai-generated-name.md"));
        }
    }

    #[test]
    fn reading_html_emits_editable_protocol_without_marking_protected_blocks() {
        let input = || MarkdownHtmlExportInput {
            title: "Protocol reading".to_string(),
            source_file: "protocol.md".to_string(),
            source_path: temp_path("reading-protocol").with_extension("md"),
            markdown: "# Protocol reading\n\nA plain paragraph.\n\n- First item\n- Second item\n\n> Quoted text\n\n[Read only link](https://example.com)\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```text\nlet value = 1;\n```".to_string(),
            generated_at: "now".to_string(),
            template_html: fallback_reading_light_template().to_string(),
            preferences: MarkdownHtmlExportPreferences::default(),
        };

        for template in [fallback_reading_light_template(), fallback_reading_dark_template()] {
            let mut next = input();
            next.template_html = template.to_string();
            let output = render_reading_html(next).expect("reading html should render");
            assert!(output.html.contains(r#"data-nutbook-editable-protocol="1""#));
            assert!(output.html.contains(r#"data-nutbook-artifact-kind="reading""#));
            assert!(output.html.contains(r#"data-id="nutbook-reading-title" data-editable="rich-text" data-edit-role="short""#));
            assert!(output.html.contains(r#"data-id="nutbook-reading-content-field-001""#));
            assert!(output.html.contains("<blockquote>\n<p>Quoted text</p>\n</blockquote>"));
            assert!(output.html.contains(r#"<a href="https://example.com">Read only link</a>"#));
            assert!(output.html.contains(r#"<table>"#));
            assert!(output.html.contains(r#"<pre><code class="language-text">let value = 1;"#));
            assert!(!output.html.contains("<table data-id="));
            assert!(!output.html.contains("<pre data-id="));
            assert!(!output.html.contains("<a data-id="));
        }
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
    fn encoded_chinese_and_portable_images_embed_in_reading_and_presentation() {
        let root = temp_path("encoded-portable-images");
        let assets = root.join("assets");
        fs::create_dir_all(&assets).expect("assets should be created");
        fs::write(assets.join("Codex 图像.png"), png_header(900, 500)).expect("image should be written");
        fs::write(assets.join("other.png"), png_header(900, 500)).expect("image should be written");
        let markdown = "# 很长的中文演示标题需要在封面换行\n\n![封面](<./assets/Codex 图像.png>)\n\n## 图片\n\n<p align=\"center\"><img src=\"./assets/other.png\" alt=\"Other\" width=\"480\"></p>";
        let input = MarkdownHtmlExportInput {
            title: "Fallback".to_string(),
            source_file: "note.md".to_string(),
            source_path: root.join("note.md"),
            markdown: markdown.to_string(),
            generated_at: "修改时间：2026-09-23 10:00".to_string(),
            template_html: fallback_reading_light_template().to_string(),
            preferences: MarkdownHtmlExportPreferences::default(),
        };
        let reading = render_reading_html(input.clone()).expect("reading should render");
        assert_eq!(reading.html.matches("src=\"data:image/png;base64,").count(), 3); // logo and two document images
        assert!(reading.warnings.is_empty(), "{:?}", reading.warnings);
        let presentation = render_presentation_html(
            MarkdownHtmlExportInput { template_html: fallback_presentation_light_template().to_string(), ..input },
            PresentationHtmlExportPreferences { aspect_ratio: "16-9".to_string(), density: PresentationDensity::Balanced, output_kind: "static".to_string() },
        ).expect("presentation should render");
        assert!(presentation.html.matches("src=\"data:image/png;base64,").count() >= 2);
        assert!(presentation.warnings.is_empty(), "{:?}", presentation.warnings);
        assert!(presentation.html.contains("data-figure-layout="));
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn valid_cover_marker_is_hidden_in_reading_and_presentation_exports() {
        let markdown = "# Cover\n\n<!-- nutbook-cover -->\n\n![Cover](./assets/cover.png)\n\n## Body\n\nText";
        let root = temp_path("cover-marker");
        fs::create_dir_all(root.join("assets")).expect("assets should be created");
        fs::write(root.join("assets/cover.png"), png_header(900, 500)).expect("cover should be written");
        let input = MarkdownHtmlExportInput {
            title: "Cover".to_string(),
            source_file: "cover.md".to_string(),
            source_path: root.join("cover.md"),
            markdown: markdown.to_string(),
            generated_at: "修改时间：2026-09-23 10:00".to_string(),
            template_html: fallback_reading_light_template().to_string(),
            preferences: MarkdownHtmlExportPreferences::default(),
        };
        let reading = render_reading_html(input.clone()).expect("reading should render");
        assert!(!reading.html.contains("nutbook-cover"));
        assert!(reading.html.contains("src=\"data:image/png;base64,"));
        let presentation = render_presentation_html(
            MarkdownHtmlExportInput { template_html: fallback_presentation_light_template().to_string(), ..input },
            PresentationHtmlExportPreferences { aspect_ratio: "16-9".to_string(), density: PresentationDensity::Balanced, output_kind: "static".to_string() },
        ).expect("presentation should render");
        assert!(!presentation.html.contains("nutbook-cover"));
        assert!(presentation.html.matches("src=\"data:image/png;base64,").count() >= 2);
        assert!(presentation.html.contains("data-figure-layout="));
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn cover_marker_stripping_preserves_non_metadata_text() {
        let markdown = "# Cover\n\n```html\n<!-- nutbook-cover -->\n```\n\n<!-- nutbook-cover -->\n\nOrdinary text\n\n![Later](later.png)";
        let stripped = super::strip_export_cover_marker(markdown);
        assert_eq!(stripped, markdown, "code and orphan markers are source text, not cover metadata");
        let valid = "# Cover\n\n<!-- nutbook-cover -->\n\n<p align=\"center\"><img src=\"cover.png\" alt=\"Cover\"></p>\n";
        assert_eq!(super::strip_export_cover_marker(valid), "# Cover\n\n\n<p align=\"center\"><img src=\"cover.png\" alt=\"Cover\"></p>\n");
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
    fn presentation_html_emits_page_protocol_and_bridge_for_all_templates() {
        let input = || MarkdownHtmlExportInput {
            title: "Protocol deck".to_string(),
            source_file: "protocol.md".to_string(),
            source_path: temp_path("presentation-protocol").with_extension("md"),
            markdown: "# Protocol deck\n\n## First page\n\nA paragraph.\n\n- Card one\n- Card two\n\n## Second page\n\n> Read only quote\n\n```text\nlet value = 1;\n```".to_string(),
            generated_at: "now".to_string(),
            template_html: fallback_presentation_light_template().to_string(),
            preferences: MarkdownHtmlExportPreferences::default(),
        };

        for template in [fallback_presentation_light_template(), fallback_presentation_dark_template()] {
            for output_kind in ["static", "dynamic"] {
                let mut next = input();
                next.template_html = template.to_string();
                let output = render_presentation_html(next, PresentationHtmlExportPreferences {
                    aspect_ratio: "16-9".to_string(),
                    density: PresentationDensity::Balanced,
                    output_kind: output_kind.to_string(),
                }).expect("presentation html should render");

                assert!(output.html.contains(r#"data-nutbook-editable-protocol="1""#));
                assert!(output.html.contains(r#"data-nutbook-artifact-kind="presentation""#));
                assert!(output.html.contains(r#"data-nutbook-page-id="nutbook-page-001""#));
                assert!(output.html.contains("window.__NUTBOOK_PRESENTATION__"));
                assert!(output.html.contains("goTo(pageId)"));
                assert!(output.html.contains("setEditMode(enabled)"));
                assert!(output.html.contains("subscribe(listener)"));
                assert!(output.html.contains(r#"data-id="nutbook-page-001-field-001""#));
                assert!(output.html.contains("Read only quote"));
                assert!(output.html.contains("<pre class=\"code-frame"));
                assert!(!output.html.contains("<blockquote class=\"presentation-quote\" data-id="));
                assert!(!output.html.contains("<pre class=\"code-frame data-id="));
                assert!(!output.html.contains("{{"));
                assert!(!output.html.contains("{{presentation_bridge_script}}"));
                assert!(output.html.contains("setManagedMode(enabled)"));
                assert!(output.html.contains("nutbook-presentation-notes\">{\"version\":1,\"pages\":{}}"));

                let page_ids = output.html.match_indices("data-nutbook-page-id=\"")
                    .filter_map(|(index, needle)| output.html[index + needle.len()..].split('"').next())
                    .collect::<Vec<_>>();
                assert!(page_ids.len() >= 3);
                assert_eq!(page_ids.len(), page_ids.iter().collect::<std::collections::HashSet<_>>().len());
            }
        }
    }

    #[test]
    fn presentation_missing_local_image_keeps_warning_and_protocol() {
        let output = render_presentation_html(MarkdownHtmlExportInput {
            title: "Missing image".to_string(),
            source_file: "missing.md".to_string(),
            source_path: temp_path("presentation-missing-image").with_extension("md"),
            markdown: "# Missing image\n\n## Figure\n\n![Unavailable](./not-found.png)".to_string(),
            generated_at: "now".to_string(),
            template_html: fallback_presentation_light_template().to_string(),
            preferences: MarkdownHtmlExportPreferences::default(),
        }, PresentationHtmlExportPreferences {
            aspect_ratio: "16-9".to_string(),
            density: PresentationDensity::Balanced,
            output_kind: "static".to_string(),
        }).expect("missing resource is a warning, not protocol failure");
        assert!(!output.warnings.is_empty());
        assert!(output.html.contains("missing-image"));
        assert!(output.html.contains("nutbook-presentation-notes"));
        assert!(output.html.contains("managedPresenter: true"));
    }

    #[test]
    fn presentation_html_static_and_dynamic_motion_are_isolated() {
        let input = || MarkdownHtmlExportInput {
            title: "Motion Deck".to_string(),
            source_file: "motion.md".to_string(),
            source_path: temp_path("presentation-motion").with_extension("md"),
            markdown: "# Motion Deck\n\n## Problem\n\n- Too many files\n- Hard to present\n\n## Visual\n\n![Hero](hero.png)\n\n## Code\n\n```text\nstatus = ready\n```".to_string(),
            generated_at: "修改时间：2026-06-18 10:00".to_string(),
            template_html: fallback_presentation_light_template().to_string(),
            preferences: MarkdownHtmlExportPreferences::default(),
        };

        let static_output = render_presentation_html(
            input(),
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("static presentation html should render");
        let dynamic_output = render_presentation_html(
            input(),
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "dynamic".to_string(),
            },
        )
        .expect("dynamic presentation html should render");

        assert!(static_output.html.contains(r#"data-output-kind="static""#));
        assert!(!static_output.html.contains("nutbook-default"));
        assert!(!static_output.html.contains("data-motion-preset"));
        assert!(!static_output.html.contains("{{"));
        assert!(!static_output.html.contains("{{presentation_bridge_script}}"));

        assert!(dynamic_output.html.contains(r#"data-output-kind="dynamic""#));
        assert!(dynamic_output.html.contains(r#"data-motion-preset="nutbook-default""#));
        assert!(dynamic_output.html.contains("nutbook-motion-styles"));
        assert!(dynamic_output.html.contains("nutbook-motion-script"));
        assert!(dynamic_output.html.contains("prefers-reduced-motion: reduce"));
        assert!(dynamic_output.html.contains("matchMedia"));
        assert!(!dynamic_output.html.contains("{{"));
        assert!(!dynamic_output.html.contains("{{presentation_bridge_script}}"));
    }

    #[test]
    fn presentation_html_dark_template_supports_dynamic_motion() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Dark Motion".to_string(),
                source_file: "dark.md".to_string(),
                source_path: temp_path("presentation-dark-motion").with_extension("md"),
                markdown: "# Dark Motion\n\n## First\n\nContent.".to_string(),
                generated_at: "修改时间：2026-06-18 10:00".to_string(),
                template_html: fallback_presentation_dark_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "4-3".to_string(),
                density: PresentationDensity::Master,
                output_kind: "dynamic".to_string(),
            },
        )
        .expect("dark dynamic presentation html should render");

        assert!(output.html.contains(r#"data-output-kind="dynamic""#));
        assert!(output.html.contains(r#"data-motion-preset="nutbook-default""#));
        assert!(output.html.contains("nutbook-motion-styles"));
        assert!(!output.html.contains("{{"));
        assert!(!output.html.contains("{{presentation_bridge_script}}"));
    }

    #[test]
    fn presentation_html_card_frames_follow_template_sizing() {
        let topic_output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Scenarios".to_string(),
                source_file: "scenarios.md".to_string(),
                source_path: temp_path("presentation-equal-topic-cards").with_extension("md"),
                markdown: "# Scenarios\n\n## 典型场景\n\n### 阅读一份 AI 生成的竞品分析报告\n\n把竞品分析报告收进 NUTBOOK 后，可以通过缩略图快速识别内容。\n\n### 修改一份学术研究的 AI 分析报告\n\n对于论文解读、研究综述、实验结论等 Markdown 文件，NUTBOOK 提供即时轻编辑能力。\n\n### 在会议或提案中展示 HTML 文档\n\n如果 AI 生成的是 HTML 演示文档，NUTBOOK 可以直接预览和全屏展示。".to_string(),
                generated_at: "修改时间：2026-06-19 10:00".to_string(),
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
        let list_output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Steps".to_string(),
                source_file: "steps.md".to_string(),
                source_path: temp_path("presentation-equal-list-cards").with_extension("md"),
                markdown: "# Steps\n\n## 操作步骤\n\n1. 打开系统设置，找到隐私与安全性，并确认本地文件访问权限。\n2. 选择导出中心的展示 HTML 输出。\n3. 检查导出的 HTML 是否可以翻页、全屏、打印。\n4. 分享文件给会议参与者。".to_string(),
                generated_at: "修改时间：2026-06-19 10:00".to_string(),
                template_html: fallback_presentation_dark_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("list presentation html should render");

        assert!(topic_output.html.contains(r#"data-slide-kind="topic-cards""#));
        assert!(topic_output.html.contains(".topic-card-grid { margin-top: 20px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); grid-auto-rows: minmax(0, 1fr); gap: 13px; align-items: stretch; }"));
        assert!(topic_output.html.contains(".topic-card { height: 100%;"));
        assert!(list_output.html.contains(r#"data-slide-kind="list-cards""#));
        assert!(list_output.html.contains(".list-card-grid { display: grid; width: var(--group-width); grid-template-columns: repeat(var(--card-cols), minmax(0, 1fr)); grid-auto-rows: minmax(var(--card-row-height), max-content); gap: var(--card-gap); align-items: stretch; }"));
        assert!(list_output.html.contains(".list-card { min-height: var(--card-row-height);"));
    }

    #[test]
    fn presentation_html_fullscreen_control_has_visible_tooltip() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Controls".to_string(),
                source_file: "controls.md".to_string(),
                source_path: temp_path("presentation-controls-tooltip").with_extension("md"),
                markdown: "# Controls\n\n## First\n\nContent.".to_string(),
                generated_at: "修改时间：2026-06-19 10:00".to_string(),
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

        assert!(output.html.contains(r#"class="presentation-control-button-wrap""#));
        assert!(output.html.contains(r#"class="presentation-control-tooltip""#));
        assert!(output.html.contains(r#"data-fullscreen aria-label="全屏演示" title="全屏演示""#));
        assert!(output.html.contains(r#"<span class="presentation-control-tooltip">全屏演示</span>"#));
        assert!(output.html.contains(".presentation-control-button-wrap:hover .presentation-control-tooltip"));
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

        assert!(contains_tag_text(&output.html, "h1", Some("cover-title"), "内文标题"));
        assert!(!contains_tag_text(&output.html, "h1", Some("cover-title"), "README.md"));
        assert!(!contains_tag_text(&output.html, "h2", Some("slide-title"), "内文标题"));
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
    fn presentation_html_keeps_cover_chapter_table_and_titles_on_the_design_baseline() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "设计基线".to_string(),
                source_file: "baseline.md".to_string(),
                source_path: temp_path("presentation-design-baseline").with_extension("md"),
                markdown: "# 设计基线\n\n## 第一章\n\n### 数据概览\n\n| 指标 | 数值 |\n| - | - |\n| 完成度 | 80% |".to_string(),
                generated_at: "修改时间：2026-06-21 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("baseline presentation html should render");

        assert!(output.html.contains(r#"data-slide-kind="cover""#));
        assert!(output.html.contains(r#"data-slide-kind="chapter""#));
        assert!(output.html.contains(r#"data-slide-kind="table""#));
        assert!(!output.html.contains("mod-mask-gradient"));
        assert!(!output.html.contains("mod-overlay-color"));

        for template in [fallback_presentation_light_template(), fallback_presentation_dark_template()] {
            assert!(!template.contains("rhythm-anchor .slide-title"));
            assert!(!template.contains("rhythm-dense .slide-title"));
            assert!(!template.contains("rhythm-breathing .slide-title"));
            assert!(!template.contains("layout-wide .slide-title"));
            assert!(!template.contains("mod-mask-gradient"));
            assert!(!template.contains("mod-overlay-color"));
        }
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

        assert_eq!(list_card_counts(&output.html), vec![4, 3]);
        assert_eq!(output.html.matches(r#"data-slide-kind="list-cards""#).count(), 2);

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
        assert!(contains_tag_text(&output.html, "h3", Some("list-card-title"), "1. 用户能把当前 Markdown 导出为可独立打开的 HTML"));
        assert!(contains_tag_text(&output.html, "h3", Some("list-card-title"), "4. 导出中心入口清晰可见"));
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
        assert!(contains_tag_text(&output.html, "h3", Some("list-card-title"), "1. 将“项目目录”统一改为“Workspace 工作区目录”"));
        assert!(output.html.contains("QSkills 不只服务代码项目"));
        assert!(contains_tag_text(&output.html, "h3", Some("list-card-title"), "7. 补齐 Tauri v2 权限、文件路径、打包签名风险"));
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

        assert!(contains_tag_text(&output.html, "h2", Some("slide-title"), "2. 产品目标"));
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
        // Small text before an image is merged as aside (lookahead merge, P2-2)
        assert!(output.html.contains(r#"class="figure-copy"#));
        assert!(output.html.contains("这张图应该单独展示"));
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
        assert!(contains_tag_text(&output.html, "h2", Some("statement-title"), "1. 内容统一管理"));
        assert!(contains_tag_text(&output.html, "h2", Some("statement-title"), "2. 强化阅读体验"));
        assert!(!contains_tag_text(&output.html, "h2", Some("statement-title"), "接入 skill 产物目录"));
        assert!(!contains_tag_text(&output.html, "h2", Some("statement-title"), "统一管理 Markdown / HTML 内容"));
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

        assert!(contains_tag_text(&output.html, "h2", Some("statement-title"), "商业人群"));
        assert!(contains_tag_text(&output.html, "h2", Some("statement-title"), "高校与研究人群"));
        assert!(contains_tag_text(&output.html, "h2", Some("statement-title"), "内容策划"));
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

        assert!(contains_tag_text(&output.html, "h2", Some("statement-title"), "我最近有个很荒诞的感受。"));
        assert!(!contains_tag_text(&output.html, "h2", Some("statement-title"), "AI 让我的电脑变成了“垃圾场”"));
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
        assert!(contains_tag_text(&output.html, "h3", None, "摘要"));
        assert!(contains_tag_text(&output.html, "h3", None, "结论"));
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
        assert!(contains_tag_text(&output.html, "h3", None, "阅读报告"));
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
        assert!(contains_tag_text(&output.html, "h3", Some("list-card-title"), "1. 打开系统设置"));
        assert!(!contains_tag_text(&output.html, "h3", Some("list-card-title"), "方式一：DMG 安装（推荐）"));
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

        assert!(contains_tag_text(&output.html, "h2", Some("statement-title"), "阅读一份 AI 生成的 竞品分析报告"));
        assert!(!contains_tag_text(&output.html, "h2", Some("statement-title"), "把 竞品分析报告.md 导出成 HTML 演示。"));
        assert!(!contains_tag_text(&output.html, "h2", Some("statement-title"), "保留关键信息"));
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

        assert!(contains_tag_text(&output.html, "h2", Some("statement-title"), "NUTBOOK 是不是知识库？"));
        assert!(contains_tag_text(&output.html, "h2", Some("statement-title"), "能不能管理普通文件？"));
        assert!(contains_tag_text(&output.html, "h2", Some("statement-title"), "现在适合团队大规模协作吗？"));
        assert!(!contains_tag_text(&output.html, "h2", Some("statement-title"), "常见问题"));
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

        assert!(dense.html.contains(r#"data-layout="side-by-side-stack""#));
        assert!(short.html.contains(r#"data-layout="stacked-grid""#));
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
    fn presentation_html_routes_directives_to_distinct_semantic_layouts() {
        let parsed = super::parse_presentation_document("## 演示\n\n<!-- nutbook:layout quote -->\n### 观点\n> 好的演示先给观众一个明确判断。", "Layouts");
        assert_eq!(parsed.chapters[0].topics[0].directive.layout.as_deref(), Some("quote"));
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Layouts".to_string(),
                source_file: "layouts.md".to_string(),
                source_path: temp_path("presentation-semantic-layouts").with_extension("md"),
                markdown: "# Layouts\n\n## 演示\n\n<!-- nutbook:layout quote -->\n### 观点\n> 好的演示先给观众一个明确判断。\n\n<!-- nutbook:layout process -->\n### 路径\n1. 收集资料\n2. 组织观点\n3. 开始表达\n\n<!-- nutbook:layout comparison -->\n### 对比\n- 手工整理\n- 自动归档\n- 零散文件\n- 集中资料库\n\n<!-- nutbook:layout big-number -->\n### 成效\n导出耗时降低 70%。\n\n<!-- nutbook:layout summary -->\n### 总结\n- 结构清晰\n- 节奏稳定\n- 离线可用".to_string(),
                generated_at: "修改时间：2026-06-20 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("semantic presentation html should render");

        for kind in ["quote", "process", "comparison", "big-number", "summary"] {
            assert!(output.html.contains(&format!(r#"data-slide-kind="{kind}""#)), "missing {kind} layout");
        }
        assert!(!output.html.contains("nutbook:layout"));
    }

    #[test]
    fn presentation_html_keeps_card_layouts_whole_during_dynamic_export() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Report".to_string(),
                source_file: "report.md".to_string(),
                source_path: temp_path("presentation-directive-report").with_extension("md"),
                markdown: "# Report\n\n## 结论\n\n<!-- nutbook:section true -->\n<!-- nutbook:layout process -->\n### 下一步\n1. 定义范围\n2. 实施规则\n3. 验证结果".to_string(),
                generated_at: "修改时间：2026-06-20 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Report,
                output_kind: "dynamic".to_string(),
            },
        )
        .expect("report presentation html should render");

        assert!(output.html.contains(r#"data-slide-kind="section-transition""#));
        assert!(output.html.contains(r#"data-slide-kind="process""#));
        assert!(!output.html.contains("data-fragment-count"));
        assert!(!output.html.contains("data-step-index"));
        assert!(output.html.contains(".presentation-step"));
    }

    #[test]
    fn presentation_html_routes_strong_semantic_cues_without_directives() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "Automatic".to_string(),
                source_file: "automatic.md".to_string(),
                source_path: temp_path("presentation-automatic-layouts").with_extension("md"),
                markdown: "# Automatic\n\n## 展示\n\n### 实施流程\n流程如下：\n\n1. 收集资料\n2. 组织观点\n3. 开始表达\n\n### 方案对比\n优缺点对照：\n\n- 手工整理\n- 自动归档\n- 零散文件\n- 集中资料库\n\n### 核心结论\n- 结构清晰\n- 节奏稳定\n- 离线可用".to_string(),
                generated_at: "修改时间：2026-06-20 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("automatic semantic presentation html should render");

        for kind in ["process", "comparison", "summary"] {
            assert!(output.html.contains(&format!(r#"data-slide-kind="{kind}""#)), "missing {kind} layout");
        }
    }

    #[test]
    fn overview_detail_uses_each_structured_list_items_inline_body() {
        let topic = PresentationTopic {
            title: "能力构成".to_string(),
            blocks: vec![PresentationBlock::List(vec![
                "- **采集**：".to_string() + &"收集来源并保留上下文。".repeat(8),
                "- **整理**：".to_string() + &"按主题归档并关联资料。".repeat(8),
                "- **展示**：".to_string() + &"以适合阅读的形式输出。".repeat(8),
            ])],
            directive: PresentationDirective::default(),
        };
        let preferences = PresentationHtmlExportPreferences {
            aspect_ratio: "16-9".to_string(),
            density: PresentationDensity::Balanced,
            output_kind: "static".to_string(),
        };

        let (overview, details) = try_overview_detail_split(&topic, presentation_budget(&preferences), &preferences)
            .expect("structured inline list bodies should produce overview and detail slides");

        assert!(overview.contains("采集"));
        assert_eq!(details.len(), 3);
        assert!(details[0].1.contains("收集来源并保留上下文"));
        assert!(details[1].1.contains("按主题归档并关联资料"));
        assert!(details[2].1.contains("以适合阅读的形式输出"));
    }

    #[test]
    fn presentation_html_expands_three_independent_scenarios_into_overview_and_details() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "NUTBOOK 典型场景".to_string(),
                source_file: "scenarios.md".to_string(),
                source_path: temp_path("presentation-scenarios").with_extension("md"),
                markdown: "# NUTBOOK 典型场景\n\n## 典型场景\n\n### 阅读一份 AI 生成的竞品分析报告\n\n把竞品分析报告收进 NUTBOOK 后，可以通过缩略图快速识别内容，在更适合阅读的 Markdown 视图中查看结构、表格和重点信息，并用收藏或标签把它归到对应项目下。\n\n### 修改一份学术研究的 AI 分析报告\n\n对于论文解读、研究综述、实验结论等 Markdown 文件，NUTBOOK 提供即时轻编辑能力。你可以在阅读过程中修正 AI 表述、补充引用线索、整理段落，而不必切换到复杂编辑器。\n\n### 在会议或提案中展示 HTML 文档\n\n如果 AI 生成的是 HTML 演示文档，NUTBOOK 可以直接预览和全屏展示。对于带 JavaScript 交互的页面，也可以保留交互效果，更适合现场讲解、项目提案和课堂展示。".to_string(),
                generated_at: "修改时间：2026-06-21 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("scenario presentation should render");

        assert_eq!(output.html.matches(r#"data-slide-kind="overview""#).count(), 1);
        assert_eq!(output.html.matches(r#"class="overview-card""#).count(), 3);
        assert_eq!(output.html.matches(r#"data-slide-kind="text""#).count(), 3);
        assert!(!output.html.contains(r#"data-slide-kind="topic-cards""#));
        assert!(!output.html.contains("Content density CV"));
        assert!(!output.html.contains(r#"<section class="export-warnings">"#));
        for title in [
            "阅读一份 AI 生成的竞品分析报告",
            "修改一份学术研究的 AI 分析报告",
            "在会议或提案中展示 HTML 文档",
        ] {
            assert!(contains_tag_text(&output.html, "h2", Some("slide-title"), title));
        }
    }

    #[test]
    fn semantic_grouping_does_not_assign_a_shared_following_paragraph_to_a_member() {
        let items = vec![
            RichListItem { label: "采集".to_string(), body: "说明".to_string(), children: vec![], ordered: false },
            RichListItem { label: "整理".to_string(), body: "说明".to_string(), children: vec![], ordered: false },
            RichListItem { label: "展示".to_string(), body: "说明".to_string(), children: vec![], ordered: false },
        ];
        let blocks = vec![
            PresentationBlock::RichList(PresentationRichList { items: items.clone() }),
            PresentationBlock::Paragraph("这是面向整组能力的统一说明，不属于任何单项。".to_string()),
        ];

        assert!(assign_evidence_to_items(&items, &blocks).is_empty());
    }

    #[test]
    fn hierarchy_layout_requires_children_for_every_root() {
        let topic = PresentationTopic {
            title: "模块选择".to_string(),
            blocks: vec![PresentationBlock::RichList(PresentationRichList {
                items: vec![
                    RichListItem {
                        label: "推荐用途".to_string(),
                        body: String::new(),
                        children: vec![RichListItem {
                            label: "研究路线".to_string(),
                            body: String::new(),
                            children: vec![],
                            ordered: false,
                        }],
                        ordered: false,
                    },
                    RichListItem {
                        label: "方案".to_string(),
                        body: String::new(),
                        children: vec![],
                        ordered: false,
                    },
                ],
            })],
            directive: PresentationDirective::default(),
        };

        assert!(semantic_relation_plan("模块", &topic).is_none());
    }

    #[test]
    fn card_pagination_never_leaves_a_single_card_tail() {
        let cards = (0..5)
            .map(|index| ListCardPlan {
                title: format!("项目{}", index + 1),
                body_markdown: String::new(),
            })
            .collect::<Vec<_>>();

        assert_eq!(landscape_card_chunks_with_capacity(&cards, false, Some(2)), vec![2, 3]);
    }

    #[test]
    fn nested_text_lists_use_the_standard_page_budget() {
        let blocks = vec![PresentationBlock::List(vec![
            "- 能力一".to_string(),
            "  - 子项一".to_string(),
            "  - 子项二".to_string(),
            "- 能力二".to_string(),
            "  - 子项三".to_string(),
            "  - 子项四".to_string(),
            "- 能力三".to_string(),
            "  - 子项五".to_string(),
        ])];

        let slides = text_slide_markdown(&blocks, &layout_preferences("16-9"));
        assert_eq!(slides.len(), 2);
    }

    #[test]
    fn overview_detail_rejects_a_six_item_topic_that_would_expand_to_seven_pages() {
        let items = (1..=6)
            .map(|index| format!("- **能力{index}**：{}", "这是一段足够长的独立说明。".repeat(7)))
            .collect::<Vec<_>>();
        let topic = PresentationTopic {
            title: "能力清单".to_string(),
            blocks: vec![PresentationBlock::List(items)],
            directive: PresentationDirective::default(),
        };
        let preferences = PresentationHtmlExportPreferences {
            aspect_ratio: "16-9".to_string(),
            density: PresentationDensity::Balanced,
            output_kind: "static".to_string(),
        };

        assert!(try_overview_detail_split(&topic, presentation_budget(&preferences), &preferences).is_none());
    }

    #[test]
    fn presentation_templates_enlarge_bold_copy_and_center_card_content() {
        for template in [fallback_presentation_light_template(), fallback_presentation_dark_template()] {
            assert!(template.contains("font-size: calc(1em + 2px)"));
            assert!(template.contains(".topic-card { height: 100%; min-height: 0; padding: 20px; display: flex; flex-direction: column; justify-content: center;"));
            assert!(template.contains(".list-card { min-height: var(--card-row-height); padding: 17px 18px; display: flex; flex-direction: column; justify-content: center;"));
        }
    }

    #[test]
    fn presentation_templates_anchor_side_copy_and_keep_card_rows_content_driven() {
        for template in [fallback_presentation_light_template(), fallback_presentation_dark_template()] {
            assert!(template.contains(".list-card-layout[data-layout=\"side-by-side-stack\"] .list-card-copy { display: flex; flex-direction: column; justify-content: flex-start; }"));
            assert!(template.contains("grid-auto-rows: minmax(var(--card-row-height), max-content);"));
            assert!(template.contains(".list-card { min-height: var(--card-row-height);"));
            assert!(!template.contains(".list-card { height: 100%; min-height: var(--card-row-height);"));
        }
    }

    #[test]
    fn nested_lists_with_multiple_children_fall_back_to_normal_content_pages() {
        let items = vec![
            "- 产品能力".to_string(),
            "  - 文件管理".to_string(),
            "  - 标签分类".to_string(),
            "- 展示能力".to_string(),
            "  - HTML 预览".to_string(),
            "  - 全屏演示".to_string(),
        ];

        assert!(!should_render_as_list_cards(&items));
    }

    #[test]
    fn presentation_html_centers_short_label_only_list_card_grids() {
        let output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "能力".to_string(),
                source_file: "capabilities.md".to_string(),
                source_path: temp_path("presentation-label-grid").with_extension("md"),
                markdown: "# 能力\n\n## 核心能力\n\n当前重点支持：\n\n- 接入本地文件夹和单文件\n- 接入 skill 产物目录\n- 统一管理 Markdown / HTML 内容\n- 收藏重要内容\n- 用标签进行分类\n- 按来源、最近、收藏等方式浏览内容".to_string(),
                generated_at: "修改时间：2026-06-21 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("label grid presentation should render");

        assert_eq!(list_card_counts(&output.html), vec![6]);
        assert_eq!(output.html.matches(r#"class="list-card label-card""#).count(), 6);
        assert!(output.html.contains(r#"data-layout="stacked-grid""#));
        assert!(output.html.contains("--card-cols: 3; --card-row-height: 76px; --card-gap: 14px; --group-width: 100%; --group-offset: 0px;"));
        assert!(output.html.contains(".list-card.label-card { align-items: center; text-align: center; }"));
        assert!(output.html.contains(".list-card.label-card .list-card-title { margin: 0; }"));
        assert!(output.html.contains("grid-template-columns: repeat(var(--card-cols), minmax(0, 1fr));"));
        assert!(output.html.contains("min-height: var(--card-row-height);"));
        assert!(!output.html.contains("relaxed-label-grid"));
        assert!(!output.html.contains(".list-card-grid.label-grid[data-card-count"));
    }

    #[test]
    fn presentation_html_routes_five_short_labels_to_a_single_row_and_long_or_seven_labels_to_a_vertical_stack() {
        let five_item_output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "标签".to_string(),
                source_file: "labels.md".to_string(),
                source_path: temp_path("presentation-five-labels").with_extension("md"),
                markdown: "# 标签\n\n## 快捷入口\n\n- 收集\n- 整理\n- 搜索\n- 展示\n- 分享".to_string(),
                generated_at: "修改时间：2026-06-21 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("five short labels should render");
        assert!(five_item_output.html.contains(r#"data-layout="stacked-grid""#));
        assert!(five_item_output.html.contains("--card-cols: 5;"));

        let long_five_item_output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "标签".to_string(),
                source_file: "labels.md".to_string(),
                source_path: temp_path("presentation-five-long-labels").with_extension("md"),
                markdown: "# 标签\n\n## 快捷入口\n\n这组能力适合在阅读过程中继续整理。\n\n- 把来自多个工具的内容统一收集并保留完整上下文\n- 按项目整理资料并建立可追溯的关联关系\n- 搜索需要继续处理且尚未完成归档的内容\n- 浏览最近修改、收藏和来自不同来源的资料\n- 分享可以在其他设备直接打开的完整产物".to_string(),
                generated_at: "修改时间：2026-06-21 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("five long labels should render");
        assert!(long_five_item_output.html.contains(r#"data-layout="side-by-side-stack""#));

        let seven_item_output = render_presentation_html(
            MarkdownHtmlExportInput {
                title: "标签".to_string(),
                source_file: "labels.md".to_string(),
                source_path: temp_path("presentation-seven-labels").with_extension("md"),
                markdown: "# 标签\n\n## 快捷入口\n\n- 收集内容\n- 整理内容\n- 搜索内容\n- 浏览内容\n- 收藏内容\n- 标注内容\n- 分享内容".to_string(),
                generated_at: "修改时间：2026-06-21 10:00".to_string(),
                template_html: fallback_presentation_light_template().to_string(),
                preferences: MarkdownHtmlExportPreferences::default(),
            },
            PresentationHtmlExportPreferences {
                aspect_ratio: "16-9".to_string(),
                density: PresentationDensity::Balanced,
                output_kind: "static".to_string(),
            },
        )
        .expect("seven labels should render");
        assert!(seven_item_output.html.contains(r#"data-layout="side-by-side-stack""#));
        assert!(seven_item_output.html.contains(".list-card-layout[data-layout=\"side-by-side-stack\"] .list-card-grid { width: 100%; grid-template-columns: 1fr; }"));
    }

    #[test]
    fn physical_list_layout_routes_counts_by_content_and_aspect_ratio() {
        let short = |count| {
            (0..count)
                .map(|index| ListCardPlan {
                    title: format!("项目{}", index + 1),
                    body_markdown: String::new(),
                })
                .collect::<Vec<_>>()
        };
        let explained = (0..5)
            .map(|index| ListCardPlan {
                title: format!("能力{}", index + 1),
                body_markdown: "这是一段足够长的解释文字，用于验证左右结构会为每个项目保留可读空间。".to_string(),
            })
            .collect::<Vec<_>>();

        let wide = layout_preferences("16-9");
        assert_eq!(plan_list_card_layout(None, &short(3), None, &wide).expect("three cards should fit").arrangement, ListCardArrangement::StackedGrid);
        assert_eq!(plan_list_card_layout(None, &short(3), None, &wide).expect("three cards should fit").columns, 3);
        assert_eq!(plan_list_card_layout(None, &short(4), None, &wide).expect("four cards should fit").columns, 4);
        assert_eq!(plan_list_card_layout(Some("背景说明"), &explained, None, &wide).expect("five explained cards should fit").arrangement, ListCardArrangement::SideBySideStack);
        assert_eq!(plan_list_card_layout(None, &short(5), None, &wide).expect("five short cards should fit").columns, 5);

        let classic = layout_preferences("4-3");
        assert_eq!(list_layout_capacity_hint(Some("背景说明"), &explained, None, &classic), None);
        assert_eq!(plan_list_card_layout(Some("背景说明"), &explained, None, &classic).expect("classic side layout should fit").arrangement, ListCardArrangement::SideBySideStack);
    }

    #[test]
    fn physical_list_layout_preflight_splits_explained_seven_items_four_plus_three() {
        let cards = (0..7)
            .map(|index| ListCardPlan {
                title: format!("能力{}", index + 1),
                body_markdown: "每项都有一段解释，单页右侧纵向排列会明显挤压正文。".to_string(),
            })
            .collect::<Vec<_>>();
        let preferences = layout_preferences("16-9");

        assert_eq!(list_layout_capacity_hint(None, &cards, None, &preferences), Some(4));
        assert_eq!(landscape_card_chunks_with_capacity(&cards, false, Some(4)), vec![4, 3]);
    }

    fn layout_preferences(aspect_ratio: &str) -> PresentationHtmlExportPreferences {
        PresentationHtmlExportPreferences {
            aspect_ratio: aspect_ratio.to_string(),
            density: PresentationDensity::Balanced,
            output_kind: "static".to_string(),
        }
    }

    #[test]
    fn semantic_relation_routes_cycle_and_hierarchy_to_distinct_slide_plans() {
        let cycle_topic = PresentationTopic {
            title: "持续迭代闭环".to_string(),
            blocks: vec![PresentationBlock::List(vec![
                "- 收集反馈".to_string(),
                "- 调整方案".to_string(),
                "- 验证结果".to_string(),
            ])],
            directive: PresentationDirective::default(),
        };
        let hierarchy_topic = PresentationTopic {
            title: "能力层级".to_string(),
            blocks: vec![PresentationBlock::List(vec![
                "- 内容层".to_string(),
                "  - Markdown 解析".to_string(),
                "  - HTML 渲染".to_string(),
                "- 交互层".to_string(),
                "  - 演示控制".to_string(),
            ])],
            directive: PresentationDirective::default(),
        };

        assert!(matches!(semantic_relation_plan("方法", &cycle_topic), Some(PresentationSlidePlan::Cycle { .. })));
        assert!(semantic_relation_plan("方法", &hierarchy_topic).is_none());
    }

    #[test]
    fn default_file_name_uses_html_extension() {
        assert_eq!(default_markdown_html_file_name("Quarterly Plan.md"), "Quarterly Plan.html");
    }
}
