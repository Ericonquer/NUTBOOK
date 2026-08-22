//! 权威 Markdown 文档标题解析（PR B / Task B3）。
//!
//! 这是 Markdown 标题语义的单一权威来源：后端 preview title、未来的默认封面
//! （B4）以及前端 Milkdown / 源码 fallback 的标题修改都以此契约为准。
//!
//! 标题语义固定为：
//!
//! 1. 完整跳过 YAML frontmatter（`---` 开头到闭合 `---`），同时保留原始
//!    source offset，locator 行号换算回原始文档行号。
//! 2. 跳过 fenced code、缩进代码（四空格），包括反引号与波浪线 fence。
//! 3. 跳过普通 raw HTML block（任意长度，无 32 行上限）。
//! 4. 跳过 blockquote 与 list 内的 H1（只接受正文顶层标题）。
//! 5. 接受正文顶层第一个有效 ATX H1。
//! 6. 接受正文顶层 Setext H1（文本行 + 紧跟的 `===` 行）。
//! 7. 接受受控 `<div align="...">` / `aligned_text_block` 内的 H1。
//! 8. 多 H1 只采用第一个有效标题，后续 H1 不得被修改。
//! 9. 空 H1 不算有效标题；继续寻找下一个有效 H1，没有则 fallback。
//! 10. display text 来自 CommonMark AST/event 的 Text、Code、链接标签、
//!     图片 alt 等语义（pulldown-cmark 事件），不通过简单字符删除正则冒充
//!     AST 语义，也不存在手写 tokenizer 的递归/栈溢出风险。
//! 11. 没有有效 H1 时回退文件名。
//! 12. frontmatter 中的 `title:` 或形似 `# H1` 的内容都不是正文标题。
//!
//! 前端实现位于 `src/markdown-document-title.js`（micromark AST），两者针对
//! 同一组共享语料（`src-tauri/tests/fixtures/card-revisions/`）做等价性测试。

use pulldown_cmark::{Event, HeadingLevel, Options, Parser, Tag};
use serde::Serialize;
use std::ops::Range;

/// 标题来源类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DocumentTitleSource {
    AtxH1,
    SetextH1,
    AlignedH1,
    FileName,
}

/// 可修改标题对应的源节点/位置种类。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TitleLocatorKind {
    /// 单行 ATX H1，`title_line` 即该行。
    AtxLine,
    /// Setext H1，`start_line` 为文本行，`end_line` 为 `===` 行。
    SetextLines,
    /// aligned `<div align="...">` 块，`start_line` 为 `<div` 行，
    /// `end_line` 为 `</div>` 行，`title_line` 为内部 H1 行。
    AlignedLines,
}

/// 标题的源位置定位信息（0-based 行号，相对原始文档含 frontmatter）。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct TitleLocator {
    pub kind: TitleLocatorKind,
    /// 定位块起始行（inclusive）。
    pub start_line: usize,
    /// 定位块结束行（inclusive；Setext 为 `===` 行，aligned 为 `</div>` 行）。
    pub end_line: usize,
    /// 标题文本所在行（aligned 时为 wrapper 内部的 H1 行）。
    pub title_line: usize,
}

/// 文档标题解析结果。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct DocumentTitle {
    pub display_text: String,
    pub source: DocumentTitleSource,
    pub is_file_name_fallback: bool,
    /// 无有效 H1 时（文件名 fallback）为 `None`。
    pub locator: Option<TitleLocator>,
}

/// 顶层块（doc 直接子节点），用于标题扫描与 aligned wrapper 检测。
struct Block<'a> {
    /// 字节范围（相对 body）。
    range_start: usize,
    range_end: usize,
    /// 块内事件切片（含 Start/End）。
    events: &'a [(Event<'a>, Range<usize>)],
}

impl<'a> Block<'a> {
    /// 该块本身是否就是 heading（首个事件必须是 Heading Start；
    /// 否则 blockquote/list 等容器块内嵌的 heading 会被误判为顶层标题）。
    fn is_heading(&self) -> bool {
        matches!(self.events.first(), Some((Event::Start(Tag::Heading { .. }), _)))
    }

    fn heading_level(&self) -> Option<HeadingLevel> {
        self.events.iter().find_map(|(event, _)| match event {
            Event::Start(Tag::Heading { level, .. }) => Some(*level),
            _ => None,
        })
    }

    /// 块内所有文本事件拼接（Text / Code / SoftBreak / HardBreak / 图片 alt）。
    /// 内部空白原样保留（与 CommonMark HTML 渲染前的事件流一致），仅 trim 首尾。
    fn plain_text(&self) -> String {
        let mut out = String::new();
        for (event, _) in self.events {
            match event {
                Event::Text(text) => out.push_str(text),
                Event::Code(code) => out.push_str(code),
                Event::SoftBreak | Event::HardBreak => out.push(' '),
                // Image 的 alt 由 pulldown-cmark 以 Text 事件发射；inline HTML
                // 不是文本，不参与 display。
                Event::InlineHtml(_) | Event::Html(_) => {}
                _ => {}
            }
        }
        out.trim().to_string()
    }

    /// raw HTML block 的纯文本（trim 后用于 aligned `<div align>` 检测）。
    fn html_text(&self) -> String {
        let mut out = String::new();
        for (event, _) in self.events {
            match event {
                Event::Text(text) => out.push_str(text),
                Event::Html(text) => out.push_str(text),
                _ => {}
            }
        }
        out.trim().to_string()
    }

    fn is_aligned_open(&self) -> bool {
        let text = self.html_text().to_ascii_lowercase();
        text == r#"<div align="center">"# || text == r#"<div align="right">"#
    }

    fn is_aligned_close(&self) -> bool {
        self.html_text().to_ascii_lowercase() == "</div>"
    }
}

impl DocumentTitle {
    /// 解析 Markdown 的权威文档标题。
    pub fn parse(raw: &str, fallback_file_name: &str) -> DocumentTitle {
        let (body, frontmatter_lines) = strip_frontmatter(raw);
        let line_starts = line_starts(body);
        let events: Vec<(Event<'_>, Range<usize>)> = Parser::new_ext(
            body,
            // 与真实 Milkdown 对齐（commonmark + gfm）：启用 GFM inline 扩展，
            // 使 `~~删除线~~` 与前端 micromark 解析为同一语义
            // （B3 复审 GFM 契约）。只启用 strikethrough，不做表格/任务列表等
            // 块级 GFM 扩展——标题解析不涉及它们。
            Options::ENABLE_STRIKETHROUGH,
        )
        .into_offset_iter()
        .collect();

        let blocks = top_level_blocks(&events);
        // range.start 指向行首时归本行（<=）；range.end 通常含行尾换行符
        // （指向下一行行首），用严格小于归本行。
        let line_of_start = |offset: usize| {
            line_starts.partition_point(|&start| start <= offset).saturating_sub(1) + frontmatter_lines
        };
        let line_of_end = |offset: usize| {
            line_starts.partition_point(|&start| start < offset).saturating_sub(1) + frontmatter_lines
        };

        for (index, block) in blocks.iter().enumerate() {
            if !block.is_heading() || block.heading_level() != Some(HeadingLevel::H1) {
                continue;
            }
            let display = block.plain_text();
            if display.is_empty() {
                continue; // 空 H1 不算有效标题，继续找下一个
            }
            let start_line = line_of_start(block.range_start);
            let end_line = line_of_end(block.range_end);

            // aligned `<div align="...">` 内的 H1：wrapper 前/后各紧邻一个
            // 顶层 raw HTML 块（CommonMark 中 `<div ...>` 是 HTML block type 6，
            // `</div>` 是 type 7，pulldown-cmark 将两者解析为相邻 HtmlBlock）。
            if index > 0
                && index + 1 < blocks.len()
                && blocks[index - 1].is_aligned_open()
                && blocks[index + 1].is_aligned_close()
            {
                return DocumentTitle {
                    display_text: display,
                    source: DocumentTitleSource::AlignedH1,
                    is_file_name_fallback: false,
                    locator: Some(TitleLocator {
                        kind: TitleLocatorKind::AlignedLines,
                        start_line: line_of_start(blocks[index - 1].range_start),
                        end_line: line_of_end(blocks[index + 1].range_end),
                        title_line: start_line,
                    }),
                };
            }

            // ATX / Setext：heading 事件的 source range 单行（ATX）或多行
            // （Setext 覆盖文本行 + `===` underline 行）。
            if start_line == end_line {
                return DocumentTitle {
                    display_text: display,
                    source: DocumentTitleSource::AtxH1,
                    is_file_name_fallback: false,
                    locator: Some(TitleLocator {
                        kind: TitleLocatorKind::AtxLine,
                        start_line,
                        end_line,
                        title_line: start_line,
                    }),
                };
            }
            return DocumentTitle {
                display_text: display,
                source: DocumentTitleSource::SetextH1,
                is_file_name_fallback: false,
                locator: Some(TitleLocator {
                    kind: TitleLocatorKind::SetextLines,
                    start_line,
                    end_line,
                    title_line: start_line,
                }),
            };
        }

        DocumentTitle {
            display_text: fallback_file_name.to_string(),
            source: DocumentTitleSource::FileName,
            is_file_name_fallback: true,
            locator: None,
        }
    }
}

/// 剥离 YAML frontmatter，返回 (body, frontmatter 行数)。
///
/// 语义与 `document.rs::split_markdown_frontmatter` 一致：首行 trim 后必须
/// 恰好是 `---`，然后找到下一个 trim 后为 `---` 的行作为闭合。body 从闭合行
/// 之后的第一个字符开始。
fn strip_frontmatter(raw: &str) -> (&str, usize) {
    let mut lines = raw.lines();
    let first = match lines.next() {
        Some(line) => line.trim(),
        None => return (raw, 0),
    };
    if first != "---" {
        return (raw, 0);
    }
    for (index, line) in raw.lines().enumerate().skip(1) {
        if line.trim() == "---" {
            let body_line = index + 1; // 0-based 原始行号
            let body_start = byte_offset_of_line(raw, body_line);
            return (&raw[body_start..], body_line);
        }
    }
    (raw, 0)
}

/// 第 `line_index`（0-based）行的起始字节偏移。
fn byte_offset_of_line(raw: &str, line_index: usize) -> usize {
    let mut offset = 0;
    for (index, line) in raw.split_inclusive('\n').enumerate() {
        if index == line_index {
            return offset;
        }
        offset += line.len();
    }
    raw.len()
}

/// body 中每一行的起始字节偏移（0-based）。
fn line_starts(body: &str) -> Vec<usize> {
    let mut starts = vec![0];
    for (index, line) in body.split_inclusive('\n').enumerate() {
        starts.push(line.len() + starts[index]);
    }
    starts
}

/// 把事件流划分为 doc 顶层块（每个块 = 一个 depth 0 的 Start 到对应 End）。
fn top_level_blocks<'a>(
    events: &'a [(Event<'a>, Range<usize>)],
) -> Vec<Block<'a>> {
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn fixture(file_name: &str) -> String {
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/card-revisions")
            .join(file_name);
        std::fs::read_to_string(&path).expect("fixture must exist")
    }

    fn assert_title(
        raw: &str,
        file_name: &str,
        expected_text: &str,
        expected_source: DocumentTitleSource,
    ) {
        let title = DocumentTitle::parse(raw, file_name);
        assert_eq!(title.display_text, expected_text, "display text mismatch for {file_name}");
        assert_eq!(title.source, expected_source, "source mismatch for {file_name}");
        assert!(!title.is_file_name_fallback, "must not fall back for {file_name}");
        assert!(title.locator.is_some(), "locator must exist for {file_name}");
    }

    #[test]
    fn card_revision_fixtures_resolve_to_authoritative_titles() {
        assert_title(
            &fixture("markdown-default-cover.md"),
            "markdown-default-cover.md",
            "普通 H1 文档",
            DocumentTitleSource::AtxH1,
        );
        assert_title(
            &fixture("markdown-frontmatter-fake-h1.md"),
            "markdown-frontmatter-fake-h1.md",
            "正文真正的标题",
            DocumentTitleSource::AtxH1,
        );
        assert_title(
            &fixture("markdown-code-fence-h1.md"),
            "markdown-code-fence-h1.md",
            "代码块里的假 H1 不是标题",
            DocumentTitleSource::AtxH1,
        );
        assert_title(
            &fixture("markdown-setext-h1.md"),
            "markdown-setext-h1.md",
            "Setext 一级标题用下划线式语法表示",
            DocumentTitleSource::SetextH1,
        );
        assert_title(
            &fixture("markdown-aligned-h1.md"),
            "markdown-aligned-h1.md",
            "居中容器内的 H1",
            DocumentTitleSource::AlignedH1,
        );
        assert_title(
            &fixture("markdown-multiple-h1.md"),
            "markdown-multiple-h1.md",
            "第一个有效 H1 才是标题",
            DocumentTitleSource::AtxH1,
        );
        assert_title(
            &fixture("markdown-long-cjk-title.md"),
            "markdown-long-cjk-title.md",
            "这是一个用于验证超长中文标题换行与截断行为的验收样本标题，它的长度必须明显超过卡片封面可用宽度，从而检验标题封面在 CJK 文本下按字符边界确定性换行、缩小字号或截断且不溢出卡片",
            DocumentTitleSource::AtxH1,
        );
        assert_title(
            &fixture("markdown-long-latin-title.md"),
            "markdown-long-latin-title.md",
            "The Definitive Guide to Building a Very Long Latin Document Title That Will Absolutely Exceed Any Reasonable Card Thumbnail Width On The Home Screen Grid",
            DocumentTitleSource::AtxH1,
        );
    }

    #[test]
    fn no_h1_falls_back_to_file_name() {
        let raw = fixture("markdown-no-h1.md");
        let title = DocumentTitle::parse(&raw, "markdown-no-h1.md");
        assert_eq!(title.display_text, "markdown-no-h1.md");
        assert_eq!(title.source, DocumentTitleSource::FileName);
        assert!(title.is_file_name_fallback);
        assert!(title.locator.is_none());
    }

    #[test]
    fn frontmatter_title_and_fake_h1_are_ignored() {
        let raw = "---\ntitle: Frontmatter 里的假标题\n# 这不是正文标题，是 frontmatter 注释\n---\n\n# 正文真正的标题\n";
        let title = DocumentTitle::parse(raw, "fallback.md");
        assert_eq!(title.display_text, "正文真正的标题");
        assert_eq!(title.source, DocumentTitleSource::AtxH1);
        assert_eq!(title.locator.unwrap().title_line, 5);
    }

    #[test]
    fn backtick_and_tilde_fences_are_skipped() {
        let backtick = "# 真标题\n\n```\n# 假标题\n```\n";
        assert_eq!(DocumentTitle::parse(backtick, "f.md").display_text, "真标题");
        let tilde = "# 真标题\n\n~~~\n# 假标题\n~~~\n";
        assert_eq!(DocumentTitle::parse(tilde, "f.md").display_text, "真标题");
    }

    #[test]
    fn consecutive_fences_are_both_skipped() {
        let raw = "# 真标题\n\n```\n# 假1\n```\n\n```\n# 假2\n```\n";
        let title = DocumentTitle::parse(raw, "f.md");
        assert_eq!(title.display_text, "真标题");
        assert_eq!(title.locator.unwrap().title_line, 0);
    }

    #[test]
    fn raw_html_block_is_skipped() {
        let raw = "<div>\n# 假标题\n</div>\n\n# 真标题\n";
        let title = DocumentTitle::parse(raw, "f.md");
        assert_eq!(title.display_text, "真标题");
        assert_eq!(title.locator.unwrap().title_line, 4);
    }

    #[test]
    fn unsupported_aligned_div_h1_is_a_top_level_heading() {
        // CommonMark 语义：`<div align="left">` 是 HTML block type 6，在空行处
        // 结束；随后 `# 不受控的假标题` 是独立顶层 ATX heading（不是 raw HTML
        // 内部内容），应被采用。普通 raw HTML（无空行分隔）内的 H1 才被跳过
        // （见 raw_html_block_is_skipped）。
        let raw = "<div align=\"left\">\n\n# 不受控的假标题\n\n</div>\n\n# 真标题\n";
        let title = DocumentTitle::parse(raw, "f.md");
        assert_eq!(title.display_text, "不受控的假标题");
        assert_eq!(title.source, DocumentTitleSource::AtxH1);
    }

    #[test]
    fn blockquote_and_list_h1_are_skipped() {
        let raw = "> # 引用里的假标题\n\n- # 列表里的假标题\n\n1. # 有序列表里的假标题\n\n# 真标题\n";
        let title = DocumentTitle::parse(raw, "f.md");
        assert_eq!(title.display_text, "真标题");
    }

    #[test]
    fn setext_h1_is_accepted_and_located() {
        let raw = "Setext 标题\n==========\n\n正文\n";
        let title = DocumentTitle::parse(raw, "f.md");
        assert_eq!(title.display_text, "Setext 标题");
        assert_eq!(title.source, DocumentTitleSource::SetextH1);
        let locator = title.locator.unwrap();
        assert_eq!(locator.start_line, 0);
        assert_eq!(locator.end_line, 1);
        assert_eq!(locator.title_line, 0);
    }

    #[test]
    fn aligned_h1_is_accepted_and_wrapper_is_located() {
        let raw = "<div align=\"center\">\n\n# 居中标题\n\n</div>\n";
        let title = DocumentTitle::parse(raw, "f.md");
        assert_eq!(title.display_text, "居中标题");
        assert_eq!(title.source, DocumentTitleSource::AlignedH1);
        let locator = title.locator.unwrap();
        assert_eq!(locator.start_line, 0);
        assert_eq!(locator.end_line, 4);
        assert_eq!(locator.title_line, 2);
    }

    #[test]
    fn empty_h1_is_skipped_and_next_valid_wins() {
        let raw = "#   \n\n# 有效的标题\n";
        let title = DocumentTitle::parse(raw, "f.md");
        assert_eq!(title.display_text, "有效的标题");
        assert_eq!(title.locator.unwrap().title_line, 2);
    }

    #[test]
    fn multiple_h1_uses_only_the_first_valid() {
        let raw = "# 第一个\n\n# 第二个\n";
        let title = DocumentTitle::parse(raw, "f.md");
        assert_eq!(title.display_text, "第一个");
        assert_eq!(title.locator.unwrap().title_line, 0);
    }

    #[test]
    fn inline_markdown_yields_plain_display_text() {
        let raw = "# **加粗** *斜体* `代码` [链接文本](https://example.com) ![alt 图片](img.png)\n";
        let title = DocumentTitle::parse(raw, "f.md");
        assert_eq!(title.display_text, "加粗 斜体 代码 链接文本 alt 图片");
    }

    #[test]
    fn reference_link_and_unclosed_bracket_do_not_loop() {
        // 引用式链接：display 取标签文本。
        let ref_link = "# [标题文本][ref-id]\n\n[ref-id]: https://example.com\n";
        assert_eq!(DocumentTitle::parse(ref_link, "f.md").display_text, "标题文本");

        // 未闭合 `[`：不得无限递归，按字面文本处理。
        let unclosed = "# 未闭合 [ bracket\n";
        assert_eq!(DocumentTitle::parse(unclosed, "f.md").display_text, "未闭合 [ bracket");

        // 未闭合 `![` 同理。
        let unclosed_image = "# 图片 ![alt\n";
        assert_eq!(DocumentTitle::parse(unclosed_image, "f.md").display_text, "图片 ![alt");
    }

    #[test]
    fn inline_syntax_matches_commonmark_semantics() {
        // closing ATX hashes 不出现在 display text。
        assert_eq!(DocumentTitle::parse("# 标题 ###\n", "f.md").display_text, "标题");
        // HTML entity 按 CommonMark 语义解码（pulldown-cmark Text 事件已解码；
        // code span 内不解码，保持字面量）。
        assert_eq!(DocumentTitle::parse("# a &amp; b\n", "f.md").display_text, "a & b");
        assert_eq!(
            DocumentTitle::parse("# `code &amp; space` 结尾\n", "f.md").display_text,
            "code &amp; space 结尾"
        );
        // email autolink。
        assert_eq!(
            DocumentTitle::parse("# 联系 <me@example.com>\n", "f.md").display_text,
            "联系 me@example.com"
        );
        // URL autolink。
        assert_eq!(
            DocumentTitle::parse("# 看 <https://example.com/x>\n", "f.md").display_text,
            "看 https://example.com/x"
        );
        // 嵌套强调。
        assert_eq!(DocumentTitle::parse("# **a *b* c**\n", "f.md").display_text, "a b c");
        // 转义保留字面标点。
        assert_eq!(
            DocumentTitle::parse("# \\*不是强调\\*\n", "f.md").display_text,
            "*不是强调*"
        );
        // 行内代码保留原文。
        assert_eq!(
            DocumentTitle::parse("# `code with  space` 结尾\n", "f.md").display_text,
            "code with  space 结尾"
        );
        // GFM 删除线（与前端 micromark + Rust ENABLE_STRIKETHROUGH 对齐）。
        assert_eq!(
            DocumentTitle::parse("# ~~删除线标题~~\n", "f.md").display_text,
            "删除线标题"
        );
        assert_eq!(
            DocumentTitle::parse("# 前 ~~中~~ 后\n", "f.md").display_text,
            "前 中 后"
        );
    }

    #[test]
    fn list_continuation_and_indented_code_h1_are_not_titles() {
        // 列表续行中的缩进 H1 不是顶层标题。
        let list_cont = "- item\n    # 列表内假标题\n\n# 真标题\n";
        let title = DocumentTitle::parse(list_cont, "f.md");
        assert_eq!(title.display_text, "真标题");
        assert_eq!(title.locator.unwrap().title_line, 3);

        // 四空格缩进代码中的 `#` 不是标题。
        let indented = "    # 缩进代码里的假标题\n\n# 真标题\n";
        let title = DocumentTitle::parse(indented, "f.md");
        assert_eq!(title.display_text, "真标题");
        assert_eq!(title.locator.unwrap().title_line, 2);

        // 列表项内的普通 H1（非续行）。
        let list_inline = "- item\n\n    # 列表项内假标题\n\n# 真标题\n";
        assert_eq!(DocumentTitle::parse(list_inline, "f.md").display_text, "真标题");
    }

    #[test]
    fn long_raw_html_block_h1_is_not_a_title() {
        // 超过 32 行的 raw HTML block：内部 H1 不得被采用。
        let mut html = String::from("<table>\n");
        for i in 0..40 {
            html.push_str(&format!("<tr><td>行 {i}</td></tr>\n"));
        }
        html.push_str("# 表格里的假标题\n");
        html.push_str("</table>\n\n# 真标题\n");
        let title = DocumentTitle::parse(&html, "f.md");
        assert_eq!(title.display_text, "真标题");
    }

    #[test]
    fn adversarial_inputs_do_not_panic_or_loop() {
        // 大量未闭合标记、超长输入、连续分隔符等异常输入不得 panic/栈溢出。
        let inputs = [
            "# ".to_string(),
            "# [".to_string(),
            "# [a][b][c][d]".to_string(),
            "# !!!!".to_string(),
            "# **".to_string(),
            "# *a* *b* *c* *d* *e*".to_string(),
            "# <https://".to_string(),
            "# `".to_string(),
            "# ````code````".to_string(),
            "# [x](url [nested]".to_string(),
            "# ".repeat(200),
            format!("{}\n\n# 真标题\n", "# 假标题\n\n".repeat(500)),
        ];
        for input in inputs {
            let _ = DocumentTitle::parse(&input, "f.md");
        }
        assert_eq!(DocumentTitle::parse(&"# [", "f.md").display_text, "[");
    }

    // ------------------------------------------------------------------
    // PR C / C0：Markdown 封面图可验收基线（标题契约不受 comment/图片干扰）
    // ------------------------------------------------------------------

    #[test]
    fn cover_fixtures_keep_first_valid_h1_as_title() {
        // C0 characterization：canonical comment 与图片行不得占用标题，也不得
        // 干扰 H1/title contract；markdown-remote-cover.md 的 comment 紧跟独立
        // 远程图片块，构成 C1 的 canonical「comment + image」形态且全文只有一个
        // marker。comment 本身不是标题（见 canonical_comment_alone_is_not_a_title）。
        let cases: &[(&str, &str)] = &[
            ("markdown-cover-image.md", "Cover image document"),
            ("markdown-duplicate-cover.md", "Duplicate cover marker"),
            ("markdown-missing-cover.md", "Missing cover image"),
            ("markdown-remote-cover.md", "Remote cover image"),
            ("markdown-portable-cover.md", "Portable cover image"),
        ];
        for (file_name, expected) in cases {
            assert_title(
                &fixture(file_name),
                file_name,
                expected,
                DocumentTitleSource::AtxH1,
            );
        }
    }

    #[test]
    fn canonical_comment_alone_is_not_a_title() {
        // 只有 comment + 图片、没有 H1 的文档必须回退文件名，comment 不得成为标题。
        let raw = "<!-- nutbook-cover -->\n\n![Landscape](./assets/cover-landscape.png)\n";
        let title = DocumentTitle::parse(raw, "cover.md");
        assert_eq!(title.display_text, "cover.md");
        assert_eq!(title.source, DocumentTitleSource::FileName);
        assert!(title.is_file_name_fallback);
        assert!(title.locator.is_none());
    }
}
