// PR C / Task C1：canonical `<!-- nutbook-cover -->` 封面身份与无损往返。
//
// 单文件 Markdown 封面身份的唯一状态源是正文顶层的 canonical marker：
//
// ```md
// <!-- nutbook-cover -->
// ![文档封面](./assets/cover.jpg)
// ```
//
// 本模块提供与前端编辑器（`src/markdown-editor.js` 的 markdownCoverImageRemark /
// markdown_cover_image schema）共享同一 canonical 语义的后端解析/序列化/诊断：
//
// 1. 只识别正文顶层精确 marker，且 marker 后必须紧随独立图片块（允许
//    Markdown 语义上无节点的空行，但不得跨过 heading / paragraph / 其他正文
//    节点寻找图片）。
// 2. 图片块可以是普通 Markdown image、链接包裹的单图片，或现有 portable
//    GitHub HTML 图片（`<p align=...><img ...></p>` / `<a ...><img></a>` /
//    独立 `<img>` 块）。
// 3. 封面身份保留原图片 node kind、raw source、src、alt、title、link、
//    width、alignment 与所在文档位置；不占用 image title，不把普通 image
//    强制迁移为 portable_image。
// 4. 一个文档只有一个有效封面身份。外部源码出现多个有效 marker 时返回
//    duplicate 诊断，不静默采用第一条，不自动晋升另一条。
// 5. marker 对应资源缺失、路径越界或当前无法读取时保留 cover 身份并暴露
//    结构化诊断；本模块（C1）不执行文件复制、删除或自动修复。
// 6. serializer 输出 marker 后紧随原图片语法；未修改排版时回放 raw source，
//    包括转义 alt、空格路径、单/双引号 title、linked image、portable HTML
//    的缩进/属性、http/https URL、LF/CRLF。
//
// 前端与后端共用同一组 `card-revisions` fixture 做等价性测试；Rust 端与
// 前端 mdast 同一 AST 语义：用 pulldown-cmark 解析正文并按 doc 顶层块
// 判定 marker + 紧随独立图片块，不靠行级状态机（C1 三轮复审）。

use std::ops::Range;
use std::path::{Component, Path, PathBuf};

use pulldown_cmark::{Event, Options, Parser, Tag, TagEnd};

use crate::core::document;
use crate::core::document_title;

/// 图片块种类（保留原 image node kind，不因封面身份迁移语法）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CoverImageKind {
    /// 普通 Markdown 独立图片块 `![alt](src "title")`
    Plain,
    /// 链接包裹的单图片 `[![alt](src)](href "title")`
    Linked,
    /// 现有 portable GitHub HTML 图片块
    Portable,
}

impl CoverImageKind {
    pub fn as_str(self) -> &'static str {
        match self {
            CoverImageKind::Plain => "image",
            CoverImageKind::Linked => "linked-image",
            CoverImageKind::Portable => "portable-image",
        }
    }
}

/// 结构化封面身份。`raw_source` 是图片块原始源码（不含 marker），
/// 序列化未修改时优先回放它以保证无损。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CoverImage {
    pub node_kind: CoverImageKind,
    pub raw_source: String,
    pub src: String,
    pub alt: String,
    pub title: Option<String>,
    pub link_href: Option<String>,
    pub link_title: Option<String>,
    pub width: Option<u32>,
    pub alignment: Option<String>,
    /// marker 所在行（1-based）。
    pub line: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CoverDiagnosticKind {
    /// 外部源码出现多个有效 marker：阻断视觉修改，卡片回退默认标题 SVG。
    Duplicate,
    /// marker 对应本地资源不存在（当前无法读取）。
    MissingResource,
    /// 本地路径解析后逃逸允许目录（`..` 越界）。
    EscapedPath,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CoverDiagnostic {
    pub kind: CoverDiagnosticKind,
    pub line: usize,
    pub message: String,
}

#[derive(Debug, Clone, Default)]
pub struct CoverParse {
    /// 唯一有效封面身份；duplicate / 无 marker 时为 None。
    pub cover: Option<CoverImage>,
    pub diagnostics: Vec<CoverDiagnostic>,
}

pub const COVER_MARKER: &str = "<!-- nutbook-cover -->";

/// 解析 canonical 封面元数据。
///
/// `base_dir` 可选：提供时对本地相对 src 做 missing / escaped 检查
/// （只诊断，不复制、不删除、不修复）。
///
/// 顶层语义与前端 mdast 一致：用 pulldown-cmark 把正文解析为真实 Markdown
/// 事件流并切分为 doc 顶层块（HTML block / paragraph / heading / list 等），
/// 只在「顶层 HTML block 的值恰好等于 marker」时，把紧随其后的顶层块作为
/// 图片候选。marker 出现在 fenced code、缩进代码、blockquote、list、table
/// 或任意 HTML block 内部（如 `<div>` 内）都不会被识别为封面（C1 三轮复审：
/// 必须基于 AST，不能靠行状态机）。
pub fn parse_cover_metadata(raw: &str, base_dir: Option<&Path>) -> CoverParse {
    // 与 document_title.rs 同一 frontmatter 剥离语义：frontmatter 内容不进入正文 AST。
    let (body, frontmatter_lines) = document_title::strip_frontmatter(raw);
    let line_starts = line_starts(body);
    let events: Vec<(Event<'_>, Range<usize>)> = Parser::new_ext(
        body,
        // 与前端 Milkdown 对齐（commonmark + gfm）：启用 strikethrough，
        // 与 document_title.rs 的标题解析同一 Options。
        Options::ENABLE_STRIKETHROUGH,
    )
    .into_offset_iter()
    .collect();
    let blocks = top_level_blocks(&events);
    let mut candidates: Vec<CoverImage> = Vec::new();
    for (index, block) in blocks.iter().enumerate() {
        if !block_is_cover_marker(block) {
            continue;
        }
        let Some(next) = blocks.get(index + 1) else {
            continue;
        };
        let Some(image) = cover_image_from_block(next, body) else {
            continue;
        };
        let marker_line = line_of_start(block.range_start, &line_starts, frontmatter_lines);
        candidates.push(image.with_line(marker_line));
    }

    let mut parse = CoverParse::default();
    match candidates.len() {
        0 => {}
        1 => {
            let mut cover = candidates.remove(0);
            if let Some(base_dir) = base_dir {
                if let Some(diagnostic) = local_resource_diagnostic(&cover, base_dir) {
                    parse.diagnostics.push(diagnostic);
                }
            }
            // 规范化 width/alignment 展示（raw_source 始终保真）。
            cover.width = normalize_width(cover.width);
            cover.alignment = normalize_alignment(cover.alignment.as_deref());
            parse.cover = Some(cover);
        }
        count => {
            parse.diagnostics.push(CoverDiagnostic {
                kind: CoverDiagnosticKind::Duplicate,
                line: candidates[0].line,
                message: format!(
                    "document declares {count} valid `{COVER_MARKER}` cover markers; \
                     only one cover identity is allowed"
                ),
            });
        }
    }
    parse
}

/// body 中每一行的起始字节偏移（0-based）。
fn line_starts(body: &str) -> Vec<usize> {
    let mut starts = vec![0];
    for (index, line) in body.split_inclusive('\n').enumerate() {
        starts.push(line.len() + starts[index]);
    }
    starts
}

/// 字节偏移所在行号（1-based，含 frontmatter 行偏移）。
fn line_of_start(offset: usize, line_starts: &[usize], frontmatter_lines: usize) -> usize {
    line_starts
        .partition_point(|&start| start <= offset)
        .saturating_sub(1)
        + frontmatter_lines
        + 1
}

/// doc 顶层块（depth 0 的 Start 到对应 End；块级 HTML 由 HtmlBlock 包裹）。
struct Block<'a> {
    range_start: usize,
    range_end: usize,
    events: &'a [(Event<'a>, Range<usize>)],
}

impl<'a> Block<'a> {
    /// 块内所有块级 HTML 值拼接（HtmlBlock 通常只有一个 Html 事件）。
    fn html_text(&self) -> String {
        let mut out = String::new();
        for (event, _) in self.events {
            if let Event::Html(text) = event {
                out.push_str(text);
            }
        }
        out
    }
}

/// 把事件流划分为 doc 顶层块。
fn top_level_blocks<'a>(events: &'a [(Event<'a>, Range<usize>)]) -> Vec<Block<'a>> {
    let mut blocks = Vec::new();
    let mut depth = 0usize;
    let mut start_idx = 0usize;
    let mut start_range = 0usize;
    for (index, (event, range)) in events.iter().enumerate() {
        match event {
            Event::Start(_) => {
                if depth == 0 {
                    start_idx = index;
                    start_range = range.start;
                }
                depth += 1;
            }
            Event::End(_) => {
                depth = depth.saturating_sub(1);
                if depth == 0 {
                    blocks.push(Block {
                        range_start: start_range,
                        range_end: range.end,
                        events: &events[start_idx..=index],
                    });
                }
            }
            _ => {}
        }
    }
    blocks
}

/// 顶层 HTML block 的值恰好等于 canonical marker。
fn block_is_cover_marker(block: &Block<'_>) -> bool {
    if !matches!(block.events.first(), Some((Event::Start(Tag::HtmlBlock), _))) {
        return false;
    }
    block.html_text().trim() == COVER_MARKER
}

/// 从顶层块提取封面图片身份（普通 / linked / portable）；非图片块返回 None。
fn cover_image_from_block(block: &Block<'_>, body: &str) -> Option<CoverImage> {
    let raw_source = body[block.range_start..block.range_end]
        .trim_end_matches(['\n', '\r'])
        .to_string();
    match block.events.first() {
        Some((Event::Start(Tag::Paragraph), _)) => parse_paragraph_image_block(block, raw_source),
        Some((Event::Start(Tag::HtmlBlock), _)) => {
            parse_portable_image_html_block(&block.html_text(), raw_source)
        }
        _ => None,
    }
}

/// paragraph 顶层块内的独立图片：`![alt](src "title")` 或链接包裹的单图片
/// `[![alt](src "title")](href "link_title")`；不得混排文本或其他 inline。
fn parse_paragraph_image_block(block: &Block<'_>, raw_source: String) -> Option<CoverImage> {
    let events = block.events;
    if events.len() < 4 {
        return None;
    }
    let mut index = 1; // 跳过 Start(Paragraph)
    let mut link_href: Option<String> = None;
    let mut link_title: Option<String> = None;
    if let Some((Event::Start(Tag::Link { dest_url, title, .. }), _)) = events.get(index) {
        link_href = Some(dest_url.to_string());
        link_title = (!title.is_empty()).then(|| title.to_string());
        index += 1;
    }
    let Some((Event::Start(Tag::Image { dest_url, title, .. }), _)) = events.get(index) else {
        return None;
    };
    let src = dest_url.to_string();
    let image_title = (!title.is_empty()).then(|| title.to_string());
    index += 1;
    let (alt, next_index) = collect_image_alt(events, index)?;
    index = next_index;
    if link_href.is_some() {
        if !matches!(events.get(index), Some((Event::End(TagEnd::Link), _))) {
            return None;
        }
        index += 1;
    }
    if !matches!(events.get(index), Some((Event::End(TagEnd::Paragraph), _)))
        || index + 1 != events.len()
    {
        return None;
    }
    let alignment = title_alignment_from_title(image_title.as_deref());
    Some(CoverImage {
        node_kind: if link_href.is_some() {
            CoverImageKind::Linked
        } else {
            CoverImageKind::Plain
        },
        raw_source,
        src,
        // alt 必须与前端 Milkdown 的 alt 文本逐字一致：pulldown-cmark 的
        // Image 内部事件已收集纯文本语义，最终 alt 不得 trim（保留边缘空格，
        // `![  padded alt  ]` 的结构化身份仍是 `  padded alt  `）。
        alt,
        title: image_title,
        link_href,
        link_title,
        width: None,
        alignment,
        line: 0,
    })
}

/// 收集 pulldown-cmark `Image` 内部事件为与前端 mdast `image.alt` 等价的文本。
///
/// 图片描述本身允许 emphasis / strong / strikethrough、code、link、inline HTML
/// 与嵌套 image。格式容器只贡献内部文本；inline HTML 按 mdast 原样进入 alt；
/// SoftBreak 保留 `\n`，HardBreak 不产生字符。嵌套 image 需要单独计深度，不能
/// 把它的 `End(Image)` 误当成当前外层图片结束。
fn collect_image_alt(
    events: &[(Event<'_>, Range<usize>)],
    mut index: usize,
) -> Option<(String, usize)> {
    let mut alt = String::new();
    let mut nested_image_depth = 0usize;

    while index < events.len() {
        match &events[index].0 {
            Event::Text(text) | Event::Code(text) | Event::InlineHtml(text) => {
                alt.push_str(text);
            }
            Event::SoftBreak => alt.push('\n'),
            Event::HardBreak => {}
            Event::Start(Tag::Image { .. }) => {
                nested_image_depth += 1;
            }
            Event::End(TagEnd::Image) if nested_image_depth > 0 => {
                nested_image_depth -= 1;
            }
            Event::End(TagEnd::Image) => return Some((alt, index + 1)),
            Event::Start(
                Tag::Emphasis | Tag::Strong | Tag::Strikethrough | Tag::Link { .. },
            )
            | Event::End(
                TagEnd::Emphasis | TagEnd::Strong | TagEnd::Strikethrough | TagEnd::Link,
            ) => {}
            _ => return None,
        }
        index += 1;
    }

    None
}

/// 从 image title 提取 `nutbook-align=(left|center|right)` token（与前端
/// `imageAlignmentFromTitle` 同一语义；对齐是封面身份的一部分）。
fn title_alignment_from_title(title: Option<&str>) -> Option<String> {
    let title = title?;
    let lower = title.to_ascii_lowercase();
    let needle = "nutbook-align=";
    let index = lower.find(needle)?;
    let value: String = lower[index + needle.len()..]
        .chars()
        .take_while(|ch| ch.is_ascii_alphanumeric())
        .collect();
    normalize_alignment(Some(&value))
}

/// portable GitHub HTML 图片块的严格解析。
///
/// 必须先通过 `document.rs::validate_portable_image_html_structure`（与编辑器/
/// 文档解析器同一严格结构 + URL 校验：拒绝 class 等非法属性、额外节点、
/// 危险 URL，src/alt/title/width、a href/title、p align 白名单），通过后再按
/// 已知结构提取 src/alt/title/width/alignment/link——校验严格，提取只发生在
/// 校验通过后（C1 三轮复审：不得用宽容的「找 `<img>` 提属性」冒充）。
fn parse_portable_image_html_block(input: &str, raw_source: String) -> Option<CoverImage> {
    if !document::validate_portable_image_html_structure(input) {
        return None;
    }
    let mut cursor = 0;
    document::skip_portable_html_whitespace(input, &mut cursor);
    let first = document::parse_portable_html_tag(input, &mut cursor)?;
    let mut alignment: Option<String> = None;
    let mut current = first;
    if current.name == "p" {
        alignment = document::portable_tag_attribute(&current, "align").map(str::to_string);
        document::skip_portable_html_whitespace(input, &mut cursor);
        current = document::parse_portable_html_tag(input, &mut cursor)?;
    }
    let mut link_href: Option<String> = None;
    let mut link_title: Option<String> = None;
    if current.name == "a" {
        link_href = document::portable_tag_attribute(&current, "href").map(str::to_string);
        link_title = document::portable_tag_attribute(&current, "title").map(str::to_string);
        document::skip_portable_html_whitespace(input, &mut cursor);
        current = document::parse_portable_html_tag(input, &mut cursor)?;
    }
    let src = document::portable_tag_attribute(&current, "src")?.to_string();
    let alt = document::portable_tag_attribute(&current, "alt")
        .unwrap_or("")
        .to_string();
    let title = document::portable_tag_attribute(&current, "title").map(str::to_string);
    let width = document::portable_tag_attribute(&current, "width")
        .and_then(|value| value.parse::<u32>().ok())
        .and_then(|value| normalize_width(Some(value)));
    Some(CoverImage {
        node_kind: CoverImageKind::Portable,
        raw_source,
        src,
        alt,
        title,
        link_href,
        link_title,
        width,
        alignment: alignment.and_then(|value| normalize_alignment(Some(&value))),
        line: 0,
    })
}

fn normalize_width(width: Option<u32>) -> Option<u32> {
    width.filter(|value| (1..=8192).contains(value))
}

fn normalize_alignment(alignment: Option<&str>) -> Option<String> {
    let value = alignment?.trim().to_ascii_lowercase();
    ["left", "center", "right"]
        .contains(&value.as_str())
        .then_some(value)
}

impl CoverImage {
    fn with_line(mut self, line: usize) -> Self {
        self.line = line;
        self
    }
}

/// 本地资源诊断：`..` / 绝对路径 / 符号链接逃逸出文档目录，或文件不存在。
/// 远程 URL 不检查（在线封面由 C2 处理）。
fn local_resource_diagnostic(cover: &CoverImage, base_dir: &Path) -> Option<CoverDiagnostic> {
    let src = cover.src.trim();
    if src.is_empty() || is_remote_url(src) {
        return None;
    }
    let raw_path = Path::new(src);
    // 绝对路径直接以 base_dir 为基准做越界判断；相对路径先 join。
    let resolved = if raw_path.is_absolute() {
        raw_path.to_path_buf()
    } else {
        base_dir.join(raw_path)
    };
    let normalized = normalize_path(&resolved);
    // 基准目录 canonicalize：符号链接解析后的真实边界。
    let base_canonical = base_dir
        .canonicalize()
        .unwrap_or_else(|_| base_dir.to_path_buf());
    // 符号链接逃逸：文件存在时用真实路径判断；不存在（含 broken link）时先用
    // 父目录的真实路径判断（macOS /var/folders → /private/var/folders 这类符号链接
    // 会令词法前缀比较把「文档目录内的缺失资源」误判为越界），最后才退回词法前缀，
    // 随后由 exists() 给出 MissingResource。
    let real = normalized.canonicalize().ok();
    let escaped = match real {
        Some(real) => !real.starts_with(&base_canonical),
        None => match normalized.parent().and_then(|parent| parent.canonicalize().ok()) {
            Some(parent_real) => !parent_real.starts_with(&base_canonical),
            None => !normalized.starts_with(&base_canonical),
        },
    };
    if escaped {
        return Some(CoverDiagnostic {
            kind: CoverDiagnosticKind::EscapedPath,
            line: cover.line,
            message: format!(
                "cover src `{src}` escapes the document directory `{}`",
                base_dir.display()
            ),
        });
    }
    if !normalized.exists() {
        return Some(CoverDiagnostic {
            kind: CoverDiagnosticKind::MissingResource,
            line: cover.line,
            message: format!("cover src `{src}` does not exist on disk"),
        });
    }
    None
}

fn is_remote_url(src: &str) -> bool {
    let scheme = src
        .split_once(':')
        .map(|(prefix, _)| prefix.to_ascii_lowercase())
        .unwrap_or_default();
    scheme == "http" || scheme == "https"
}

/// 规范化路径（解析 `.` / `..`），不做符号链接解析。
fn normalize_path(path: &Path) -> PathBuf {
    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                normalized.pop();
            }
            other => normalized.push(other.as_os_str()),
        }
    }
    normalized
}

/// 序列化 canonical 封面（marker 后紧随原图片语法）。
///
/// 返回的字符串再次 `parse_cover_metadata` 应得到同一封面身份（幂等）。
pub fn serialize_cover(cover: &CoverImage) -> String {
    format!("{COVER_MARKER}\n{}", cover.raw_source)
}

/// 收集文档中出现的全部图片 src（Markdown image destination 与 portable HTML
/// `<img src>`），用于 staged asset 释放时的引用保护（磁盘 baseline 侧）。
/// 只做保守收集，不做结构校验；dedup 保持出现顺序。
pub fn collect_document_image_srcs(raw: &str) -> Vec<String> {
    let (body, _) = document_title::strip_frontmatter(raw);
    let events: Vec<(Event<'_>, Range<usize>)> =
        Parser::new_ext(body, Options::ENABLE_STRIKETHROUGH)
            .into_offset_iter()
            .collect();
    let mut srcs: Vec<String> = Vec::new();
    for (event, _) in &events {
        if let Event::Start(Tag::Image { dest_url, .. }) = event {
            push_unique(&mut srcs, dest_url.to_string());
        }
        if let Event::Html(text) = event {
            collect_img_src_attrs(text, &mut srcs);
        }
    }
    srcs
}

fn push_unique(srcs: &mut Vec<String>, value: String) {
    if value.is_empty() || srcs.iter().any(|existing| existing == &value) {
        return;
    }
    srcs.push(value);
}

/// 从 HTML 事件文本中保守提取 `<img src="...">` 属性值（支持单/双引号）。
fn collect_img_src_attrs(html: &str, srcs: &mut Vec<String>) {
    let lower = html.to_ascii_lowercase();
    let mut search_from = 0usize;
    while let Some(relative) = lower[search_from..].find("<img") {
        let tag_start = search_from + relative;
        let Some(tag_end) = html[tag_start..].find('>') else {
            break;
        };
        let tag_end = tag_start + tag_end;
        let tag_lower = &lower[tag_start..tag_end];
        if let Some(attr_start) = tag_lower.find("src") {
            // 属性名边界：src 后必须紧跟空白或 =。
            let after = &tag_lower[attr_start + 3..];
            if after.starts_with('=') || after.starts_with(char::is_whitespace) {
                if let Some(quote_pos) = after.find(['\'', '"']) {
                    let quote = after.as_bytes()[quote_pos] as char;
                    if let Some(rest) = after.get(quote_pos + 1..) {
                        if let Some(value_end) = rest.find(quote) {
                            push_unique(srcs, rest[..value_end].trim().to_string());
                        }
                    }
                }
            }
        }
        search_from = tag_end + 1;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn fixture(name: &str) -> String {
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/card-revisions")
            .join(name);
        std::fs::read_to_string(&path).expect("card-revision fixture must exist")
    }

    fn card_revisions_dir() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/card-revisions")
    }

    #[test]
    fn plain_image_cover_round_trips_losslessly() {
        let raw = fixture("markdown-cover-image.md");
        let parse = parse_cover_metadata(&raw, Some(&card_revisions_dir()));
        // markdown-cover-image.md 的 marker 后隔 heading，不构成 canonical cover：
        // 它是「stray marker 不跨正文寻找图片」的负面样本。
        assert!(parse.cover.is_none(), "stray marker must not bind across a heading");
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
    }

    #[test]
    fn plain_remote_cover_is_recognized_and_stable() {
        let raw = fixture("markdown-remote-cover.md");
        let parse = parse_cover_metadata(&raw, Some(&card_revisions_dir()));
        let cover = parse.cover.expect("remote canonical cover must parse");
        assert_eq!(cover.node_kind, CoverImageKind::Plain);
        assert_eq!(cover.src, "https://example.invalid/covers/landscape-16x9.png");
        assert_eq!(cover.alt, "Remote landscape");
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
        // 幂等往返：serialize → 再解析 → 同一封面身份。
        let again = parse_cover_metadata(&serialize_cover(&cover), Some(&card_revisions_dir()));
        let again_cover = again.cover.expect("serialized cover must reparse");
        assert_eq!(again_cover.node_kind, cover.node_kind);
        assert_eq!(again_cover.src, cover.src);
        assert_eq!(again_cover.raw_source, cover.raw_source);
        assert!(again.diagnostics.is_empty(), "{:?}", again.diagnostics);
    }

    #[test]
    fn missing_resource_keeps_cover_identity_with_diagnostic() {
        let raw = fixture("markdown-missing-cover.md");
        let parse = parse_cover_metadata(&raw, Some(&card_revisions_dir()));
        let cover = parse.cover.expect("missing resource must keep cover identity");
        assert_eq!(cover.alt, "Missing asset");
        assert_eq!(cover.src, "./assets/does-not-exist.png");
        assert!(
            parse
                .diagnostics
                .iter()
                .any(|d| d.kind == CoverDiagnosticKind::MissingResource),
            "{:?}",
            parse.diagnostics
        );
    }

    #[test]
    fn duplicate_marker_blocks_cover_and_keeps_plain_parse() {
        let raw = fixture("markdown-duplicate-cover.md");
        let parse = parse_cover_metadata(&raw, Some(&card_revisions_dir()));
        assert!(parse.cover.is_none(), "duplicate must not silently pick the first");
        assert!(
            parse
                .diagnostics
                .iter()
                .any(|d| d.kind == CoverDiagnosticKind::Duplicate),
            "{:?}",
            parse.diagnostics
        );
    }

    #[test]
    fn linked_image_cover_preserves_href_and_title() {
        let raw = "<!-- nutbook-cover -->\n\n[![Linked landscape](./assets/cover-landscape.png)](https://example.invalid/album \"Open album\")\n\nbody";
        let parse = parse_cover_metadata(raw, None);
        let cover = parse.cover.expect("linked cover must parse");
        assert_eq!(cover.node_kind, CoverImageKind::Linked);
        assert_eq!(cover.src, "./assets/cover-landscape.png");
        assert_eq!(cover.alt, "Linked landscape");
        assert_eq!(cover.link_href.as_deref(), Some("https://example.invalid/album"));
        assert_eq!(cover.link_title.as_deref(), Some("Open album"));
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
        let again = parse_cover_metadata(&serialize_cover(&cover), None);
        assert_eq!(again.cover.expect("reparse").link_href, cover.link_href);
    }

    #[test]
    fn portable_cover_preserves_raw_indentation_and_attributes() {
        let raw = fixture("markdown-portable-cover.md");
        let parse = parse_cover_metadata(&raw, Some(&card_revisions_dir()));
        let cover = parse.cover.expect("portable cover must parse after marker adjustment");
        assert_eq!(cover.node_kind, CoverImageKind::Portable);
        assert_eq!(cover.src, "./assets/cover-landscape.png");
        assert_eq!(cover.alt, "Portable centered landscape");
        assert_eq!(cover.width, Some(480));
        assert_eq!(cover.alignment.as_deref(), Some("center"));
        assert!(cover.raw_source.contains("<p align=\"center\">\n  <img"), "{}", cover.raw_source);
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
        // 未修改排版时 serializer 回放 raw source（缩进/属性原样）。
        let serialized = serialize_cover(&cover);
        assert!(serialized.starts_with("<!-- nutbook-cover -->\n<p align=\"center\">\n"), "{serialized}");
        let again = parse_cover_metadata(&serialized, Some(&card_revisions_dir()));
        assert_eq!(again.cover.expect("reparse").raw_source, cover.raw_source);
    }

    #[test]
    fn escaped_path_is_diagnosed_without_dropping_identity() {
        let raw = "<!-- nutbook-cover -->\n\n![Escaped](../../secrets/cover.png)\n";
        let base = card_revisions_dir();
        let parse = parse_cover_metadata(raw, Some(&base));
        let cover = parse.cover.expect("escaped path must keep cover identity");
        assert_eq!(cover.src, "../../secrets/cover.png");
        assert!(
            parse
                .diagnostics
                .iter()
                .any(|d| d.kind == CoverDiagnosticKind::EscapedPath),
            "{:?}",
            parse.diagnostics
        );
    }

    #[test]
    fn marker_does_not_cross_paragraph_text_to_find_image() {
        let raw = "<!-- nutbook-cover -->\n\nsome body text\n\n![Later](./assets/cover-landscape.png)\n";
        let parse = parse_cover_metadata(raw, None);
        assert!(parse.cover.is_none(), "marker must not cross a paragraph");
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
    }

    #[test]
    fn escaped_alt_and_spaced_path_and_quoted_titles_round_trip() {
        let raw = "<!-- nutbook-cover -->\n\n![alt with \\[bracket\\]](<./assets/my cover.png> \"double title\")\n\n![single](./assets/single.png 'single title')\n";
        let parse = parse_cover_metadata(raw, None);
        let cover = parse.cover.expect("cover must parse");
        // AST 语义下 alt 是解码后的文本（与前端 mdast 一致）；raw_source 保留转义。
        assert_eq!(cover.alt, r"alt with [bracket]");
        assert_eq!(cover.src, "./assets/my cover.png");
        assert_eq!(cover.title.as_deref(), Some("double title"));
        // raw_source 保真：转义 alt、空格路径、双引号 title 原样回放。
        let serialized = serialize_cover(&cover);
        assert!(
            serialized.contains(r#"![alt with \[bracket\]](<./assets/my cover.png> "double title")"#),
            "{serialized}"
        );
        let again = parse_cover_metadata(&serialized, None);
        assert_eq!(again.cover.expect("reparse").raw_source, cover.raw_source);
    }

    #[test]
    fn formatted_alt_collects_plain_text_without_losing_cover_identity() {
        // C0 审查 P1 回归：alt 内的 emphasis/strong/strikethrough 容器与 Code 是
        // pulldown-cmark 在 Image 内部产生的合法事件。收集 alt 纯文本语义时必须
        // 跳过容器 Start/End 并继续收集内部 Text/Code，不能遇到容器就返回 None
        // 而丢失整张图的封面身份（前端编辑器可识别、后端却回退默认封面）。
        let raw = "<!-- nutbook-cover -->\n\n![a *bold* `code` ~~strike~~ 尾](./assets/cover-landscape.png)\n";
        let parse = parse_cover_metadata(raw, None);
        let cover = parse.cover.expect("formatted alt must keep cover identity");
        assert_eq!(cover.alt, "a bold code strike 尾");
        assert_eq!(cover.node_kind, CoverImageKind::Plain);
        assert_eq!(cover.src, "./assets/cover-landscape.png");
        // 幂等往返：serialize → 再解析 → 同一 alt 身份。
        let again = parse_cover_metadata(&serialize_cover(&cover), None);
        assert_eq!(
            again.cover.expect("reparse").alt,
            "a bold code strike 尾"
        );
    }

    #[test]
    fn nested_inline_alt_matches_frontend_mdast_semantics() {
        let cases = [
            (
                "![a [link](https://example.invalid) c](./assets/cover-landscape.png)",
                "a link c",
            ),
            (
                "![a <b>x</b> c](./assets/cover-landscape.png)",
                "a <b>x</b> c",
            ),
            (
                "![a ![nested](./assets/nested.png) c](./assets/cover-landscape.png)",
                "a nested c",
            ),
        ];

        for (image, expected_alt) in cases {
            let raw = format!("{COVER_MARKER}\n\n{image}\n");
            let parse = parse_cover_metadata(&raw, None);
            let cover = parse.cover.unwrap_or_else(|| {
                panic!("nested inline alt must keep cover identity: {image}")
            });
            assert_eq!(cover.alt, expected_alt, "{image}");
            assert_eq!(cover.node_kind, CoverImageKind::Plain, "{image}");
            assert_eq!(serialize_cover(&cover), format!("{COVER_MARKER}\n{image}"));
        }
    }

    #[test]
    fn image_alt_breaks_match_frontend_mdast_semantics() {
        let cases = [
            (
                "![a\nb c](./assets/cover-landscape.png)",
                "a\nb c",
            ),
            (
                "![a  \nb c](./assets/cover-landscape.png)",
                "ab c",
            ),
        ];

        for (image, expected_alt) in cases {
            let raw = format!("{COVER_MARKER}\n\n{image}\n");
            let parse = parse_cover_metadata(&raw, None);
            let cover = parse.cover.unwrap_or_else(|| {
                panic!("line break in alt must keep cover identity: {image:?}")
            });
            assert_eq!(cover.alt, expected_alt, "{image:?}");
            assert_eq!(cover.raw_source, image, "raw image syntax must stay byte-stable");
        }
    }

    #[test]
    fn padded_alt_is_not_trimmed() {
        // C0 审查 P2 回归：`![  padded alt  ]` 的结构化 alt 必须保留边缘空格
        // （前端 Milkdown 按 CommonMark 语义保留 alt 字面空格），不得 trim。
        let raw = "<!-- nutbook-cover -->\n\n![  Padded alt  ](./assets/cover-landscape.png)\n";
        let parse = parse_cover_metadata(raw, None);
        let cover = parse.cover.expect("padded alt must keep cover identity");
        assert_eq!(cover.alt, "  Padded alt  ");
        // raw_source 也保持原样（转义/空格保真）。
        assert_eq!(cover.raw_source, "![  Padded alt  ](./assets/cover-landscape.png)");
    }

    #[test]
    fn crlf_document_round_trips_with_cover_identity() {
        let raw = "# Title\r\n\r\n<!-- nutbook-cover -->\r\n\r\n![CRLF cover](./assets/cover-landscape.png)\r\n\r\nbody\r\n";
        let parse = parse_cover_metadata(raw, None);
        let cover = parse.cover.expect("CRLF cover must parse");
        assert_eq!(cover.src, "./assets/cover-landscape.png");
        assert!(!cover.raw_source.contains('\r'), "single-line image has no CR");
        let serialized = serialize_cover(&cover);
        let again = parse_cover_metadata(&serialized, None);
        let again_cover = again.cover.as_ref().expect("reparse");
        assert_eq!(again_cover.src, cover.src);
        assert_eq!(again_cover.raw_source, cover.raw_source);
    }

    #[test]
    fn crlf_portable_block_keeps_raw_source_newlines() {
        let raw = "<!-- nutbook-cover -->\r\n\r\n<p align=\"center\">\r\n  <img src=\"./assets/cover-landscape.png\" alt=\"CRLF portable\" width=\"480\">\r\n</p>\r\n";
        let parse = parse_cover_metadata(raw, None);
        let cover = parse.cover.expect("CRLF portable cover must parse");
        assert_eq!(cover.node_kind, CoverImageKind::Portable);
        assert!(cover.raw_source.contains("\r\n"), "{}", cover.raw_source);
        let serialized = serialize_cover(&cover);
        assert!(serialized.contains("\r\n"), "{serialized}");
        let again = parse_cover_metadata(&serialized, None);
        assert_eq!(again.cover.expect("reparse").raw_source, cover.raw_source);
    }

    #[test]
    fn marker_inside_fenced_code_is_not_a_cover() {
        let raw = "```markdown\n<!-- nutbook-cover -->\n\n![In code](./assets/cover-landscape.png)\n```\n\n<!-- nutbook-cover -->\n\n![Real](./assets/cover-landscape.png)\n";
        let parse = parse_cover_metadata(raw, None);
        let cover = parse.cover.expect("real top-level cover must parse");
        assert_eq!(cover.alt, "Real");
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
        // fence 内的 marker+image 不产生第二个候选，因此也不触发 duplicate。
    }

    #[test]
    fn marker_inside_tilde_fence_is_not_a_cover() {
        let raw = "~~~\n<!-- nutbook-cover -->\n\n![In code](./assets/cover-landscape.png)\n~~~\n";
        let parse = parse_cover_metadata(raw, None);
        assert!(parse.cover.is_none(), "fenced marker must not become a cover");
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
    }

    #[test]
    fn marker_inside_frontmatter_is_not_a_cover() {
        let raw = "---\ntitle: demo\n<!-- nutbook-cover -->\n---\n\n<!-- nutbook-cover -->\n\n![Real](./assets/cover-landscape.png)\n";
        let parse = parse_cover_metadata(raw, None);
        let cover = parse.cover.expect("top-level marker after frontmatter must parse");
        assert_eq!(cover.alt, "Real");
    }

    #[test]
    fn marker_inside_indented_code_is_not_a_cover() {
        let raw = "    <!-- nutbook-cover -->\n    ![Indented](./assets/cover-landscape.png)\n\nbody\n";
        let parse = parse_cover_metadata(raw, None);
        assert!(parse.cover.is_none(), "indented code marker must not become a cover");
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
    }

    #[test]
    fn portable_linked_block_distinguishes_anchor_and_image_titles() {
        let raw = "<p align=\"right\">\n  <a href=\"https://example.invalid/album\" title=\"Open album\">\n    <img src=\"./assets/cover-landscape.png\" alt=\"Linked portable\" title=\"Image tooltip\" width=\"320\">\n  </a>\n</p>";
        let parsed =
            parse_portable_image_html_block(raw, raw.to_string()).expect("portable block must parse");
        assert_eq!(parsed.title.as_deref(), Some("Image tooltip"), "img title must come from the <img> tag");
        assert_eq!(parsed.link_title.as_deref(), Some("Open album"), "link title must come from the <a> tag");
        assert_eq!(parsed.link_href.as_deref(), Some("https://example.invalid/album"));
        assert_eq!(parsed.width, Some(320));
        assert_eq!(parsed.alignment.as_deref(), Some("right"));
    }

    #[test]
    fn marker_inside_html_block_is_not_a_cover() {
        // `<div>` 是 HTML block type 1：marker 出现在块内部（值不等于纯 marker），
        // 编辑器（mdast）判定无封面，Rust 必须同样判定无封面。
        let raw = "<div>\n<!-- nutbook-cover -->\n\n![Inside HTML](./a.png)\n</div>\n";
        let parse = parse_cover_metadata(raw, None);
        assert!(parse.cover.is_none(), "marker inside an HTML block must not become a cover");
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
    }

    #[test]
    fn marker_between_html_blocks_is_not_a_cover() {
        // marker 与图片分别在不同 HTML block 之间且隔开正文节点 → 不跨块配对。
        let raw = "<div>one</div>\n\n<!-- nutbook-cover -->\n\n<div>two</div>\n";
        let parse = parse_cover_metadata(raw, None);
        assert!(parse.cover.is_none());
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
    }

    #[test]
    fn portable_block_with_disallowed_class_is_rejected() {
        // `<p class="x">` 带非法属性：编辑器拒绝 portable，Rust 必须同样拒绝。
        let raw = "<!-- nutbook-cover -->\n\n<p class=\"x\"><img src=\"./assets/a.png\" alt=\"x\"></p>\n";
        let parse = parse_cover_metadata(raw, None);
        assert!(parse.cover.is_none(), "portable with disallowed class must be rejected");
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
    }

    #[test]
    fn portable_block_with_extra_nodes_is_rejected() {
        // `<p>` 内 img 之外还有文本节点：编辑器拒绝，Rust 必须同样拒绝。
        let raw = "<!-- nutbook-cover -->\n\n<p align=\"center\"><img src=\"./assets/a.png\" alt=\"x\">extra</p>\n";
        let parse = parse_cover_metadata(raw, None);
        assert!(parse.cover.is_none(), "portable with extra nodes must be rejected");
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
    }

    #[test]
    fn portable_block_with_unsafe_url_is_rejected() {
        // `javascript:` / 相对协议 `//`：document.rs 的 URL 校验必须拒绝。
        for unsafe_src in ["javascript:alert(1)", "//evil.example/x.png"] {
            let raw = format!("<!-- nutbook-cover -->\n\n<img src=\"{unsafe_src}\" alt=\"x\">\n");
            let parse = parse_cover_metadata(&raw, None);
            assert!(parse.cover.is_none(), "unsafe portable URL must be rejected: {unsafe_src}");
            assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
        }
    }

    #[test]
    fn linked_image_cover_extracts_image_and_link_titles_separately() {
        let raw = "<!-- nutbook-cover -->\n\n[![Linked](./assets/a.png \"Image tooltip\")](https://example.invalid/album \"Open album\")\n";
        let parse = parse_cover_metadata(raw, None);
        let cover = parse.cover.expect("linked cover must parse");
        assert_eq!(cover.node_kind, CoverImageKind::Linked);
        assert_eq!(cover.src, "./assets/a.png");
        assert_eq!(cover.alt, "Linked");
        assert_eq!(cover.title.as_deref(), Some("Image tooltip"));
        assert_eq!(cover.link_href.as_deref(), Some("https://example.invalid/album"));
        assert_eq!(cover.link_title.as_deref(), Some("Open album"));
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
    }

    #[test]
    fn plain_image_cover_extracts_alignment_token_from_title() {
        let raw = "<!-- nutbook-cover -->\n\n![Centered](./assets/a.png \"caption nutbook-align=center\")\n";
        let parse = parse_cover_metadata(raw, None);
        let cover = parse.cover.expect("cover must parse");
        assert_eq!(cover.node_kind, CoverImageKind::Plain);
        assert_eq!(cover.alignment.as_deref(), Some("center"), "alignment token must be extracted like the frontend");
    }

    #[test]
    fn marker_inside_blockquote_or_list_is_not_a_cover() {
        let raw = "> <!-- nutbook-cover -->\n>\n> ![Quote](./assets/cover-landscape.png)\n\n- <!-- nutbook-cover -->\n  ![List](./assets/cover-landscape.png)\n";
        let parse = parse_cover_metadata(raw, None);
        assert!(parse.cover.is_none(), "blockquote/list marker must not be a cover");
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
    }

    #[test]
    fn frontmatter_content_with_marker_and_image_is_skipped() {
        // frontmatter 内容里出现 marker + image（作为 YAML 内容），不得被识别为
        // 封面，也不得与正文顶层封面构成 duplicate（opener `---` 行必须被跳过，
        // 不能在第一行就关闭 frontmatter 状态）。
        let raw = "---\ntitle: Demo\n<!-- nutbook-cover -->\n\n![In fm](./assets/cover-landscape.png)\n---\n\n<!-- nutbook-cover -->\n\n![Real](./assets/cover-landscape.png)\n";
        let parse = parse_cover_metadata(raw, None);
        let cover = parse.cover.expect("real top-level cover after frontmatter must parse");
        assert_eq!(cover.alt, "Real");
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
    }

    #[test]
    fn two_space_list_continuation_is_not_a_cover() {
        // CommonMark list item 的 continuation 可缩进两空格（marker 内容列）；
        // 其中的 marker/图片行不得误判为正文顶层封面。
        let raw = "- item one\n  <!-- nutbook-cover -->\n\n  ![List](./assets/cover-landscape.png)\n\nbody\n";
        let parse = parse_cover_metadata(raw, None);
        assert!(parse.cover.is_none(), "two-space list continuation must not become a cover");
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
    }

    #[test]
    fn absolute_path_outside_base_is_escaped() {
        // 绝对本地路径同样参与越界诊断，不得被直接跳过。
        let raw = "<!-- nutbook-cover -->\n\n![Abs](/tmp/nutbook-cover-absolute-outside.png)\n";
        let parse = parse_cover_metadata(raw, Some(&card_revisions_dir()));
        let cover = parse.cover.expect("absolute escaped path must keep identity");
        assert_eq!(cover.src, "/tmp/nutbook-cover-absolute-outside.png");
        assert!(
            parse
                .diagnostics
                .iter()
                .any(|d| d.kind == CoverDiagnosticKind::EscapedPath),
            "{:?}",
            parse.diagnostics
        );
    }

    #[test]
    fn absolute_path_inside_base_has_no_escaped_diagnostic() {
        let base = card_revisions_dir();
        let absolute = base.join("assets/cover-landscape.png").canonicalize().unwrap();
        let raw = format!("<!-- nutbook-cover -->\n\n![Abs]({})\n", absolute.display());
        let parse = parse_cover_metadata(&raw, Some(&base));
        let _cover = parse.cover.expect("in-base absolute path must keep identity");
        assert!(
            !parse
                .diagnostics
                .iter()
                .any(|d| d.kind == CoverDiagnosticKind::EscapedPath),
            "{:?}",
            parse.diagnostics
        );
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
    }

    #[cfg(unix)]
    #[test]
    fn symlink_escape_is_diagnosed() {
        // 符号链接解析后逃出文档目录 → EscapedPath（词法前缀不足以保证安全）。
        let outside = std::env::temp_dir().join(format!("nutbook-cover-outside-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&outside);
        std::fs::create_dir_all(&outside).expect("create outside dir");
        std::fs::write(outside.join("cover.png"), b"x").expect("write outside file");
        let base = std::env::temp_dir().join(format!("nutbook-cover-symlink-escape-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&base);
        std::fs::create_dir_all(&base).expect("create base dir");
        std::os::unix::fs::symlink(&outside, base.join("leak")).expect("create symlink");
        let raw = "<!-- nutbook-cover -->\n\n![Leak](leak/cover.png)\n";
        let parse = parse_cover_metadata(raw, Some(&base));
        let _cover = parse.cover.expect("symlink-escaped cover must keep identity");
        assert!(
            parse
                .diagnostics
                .iter()
                .any(|d| d.kind == CoverDiagnosticKind::EscapedPath),
            "{:?}",
            parse.diagnostics
        );
        let _ = std::fs::remove_dir_all(&base);
        let _ = std::fs::remove_dir_all(&outside);
    }

    #[cfg(unix)]
    #[test]
    fn symlink_inside_base_has_no_escaped_diagnostic() {
        let base = std::env::temp_dir().join(format!("nutbook-cover-symlink-inside-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&base);
        std::fs::create_dir_all(&base.join("assets")).expect("create assets");
        std::fs::write(base.join("assets/cover.png"), b"x").expect("write file");
        std::os::unix::fs::symlink(base.join("assets/cover.png"), base.join("alias.png")).expect("symlink");
        let raw = "<!-- nutbook-cover -->\n\n![Alias](alias.png)\n";
        let parse = parse_cover_metadata(raw, Some(&base));
        let _cover = parse.cover.expect("in-base symlink keeps identity");
        assert!(parse.diagnostics.is_empty(), "{:?}", parse.diagnostics);
        let _ = std::fs::remove_dir_all(&base);
    }

    #[test]
    fn cover_does_not_occupy_image_title_or_migrate_syntax() {
        let raw = "<!-- nutbook-cover -->\n\n![Keep title](./assets/cover-landscape.png \"作者标题\")\n";
        let parse = parse_cover_metadata(raw, None);
        let cover = parse.cover.expect("cover must parse");
        assert_eq!(cover.title.as_deref(), Some("作者标题"), "cover must not take the image title");
        assert_eq!(cover.node_kind, CoverImageKind::Plain, "plain image must stay plain");
        assert!(!cover.raw_source.contains("portable"), "{}", cover.raw_source);
    }
}
