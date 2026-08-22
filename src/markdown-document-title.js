// 权威 Markdown 文档标题解析（前端实现，PR B / Task B3）。
//
// 与 `src-tauri/src/core/document_title.rs` 针对同一组共享语料
// （`src-tauri/tests/fixtures/card-revisions/`）做等价性测试。
// Rust 端使用 pulldown-cmark，前端使用 micromark + mdast-util-from-markdown
// （同一代 CommonMark 语义），display text / source / locator 语义一致：
//
// 1. 完整跳过 YAML frontmatter，locator 行号换算回原始文档行号。
// 2. 跳过 fenced code（反引号与波浪线）与缩进代码。
// 3. 跳过普通 raw HTML block（任意长度）。
// 4. 跳过 blockquote 与 list 内的 H1（只接受正文顶层标题）。
// 5. 接受正文顶层第一个有效 ATX H1。
// 6. 接受正文顶层 Setext H1。
// 7. 接受受控 `<div align="...">` 内的 H1。
// 8. 多 H1 只采用第一个有效标题。
// 9. 空 H1 不算有效标题，继续找下一个。
// 10. display text 来自 mdast AST 的 text / inlineCode / link 标签 / image
//     alt / emphasis / strong 语义，不存在手写 tokenizer 的递归风险。
// 11. 无有效 H1 回退文件名/fallback。
// 12. frontmatter 内的 `title:` 或 `# H1` 都不是正文标题。

import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmStrikethrough } from "micromark-extension-gfm-strikethrough";
import { gfmStrikethroughFromMarkdown } from "mdast-util-gfm-strikethrough";

// 与真实 Milkdown 对齐：Milkdown 使用 commonmark + gfm。这里启用与 Rust
// （pulldown-cmark Options::ENABLE_STRIKETHROUGH）对应的 GFM inline 扩展，
// 使 `~~删除线~~` 在两端解析为同一 AST 语义（B3 复审 GFM 契约）。
const AST_EXTENSIONS = [gfmStrikethrough()];
const MDAST_EXTENSIONS = [gfmStrikethroughFromMarkdown()];

/**
 * 解析权威文档标题。
 * @param {string} markdown
 * @param {string} fallbackTitle 无有效 H1 时的回退文本
 * @returns {{ displayText: string, source: string, isFileNameFallback: boolean, locator: object|null }}
 */
export function parseDocumentTitle(markdown, fallbackTitle = "Markdown") {
  const raw = String(markdown || "");
  const { body, frontmatterLines } = stripFrontmatter(raw);
  const tree = fromMarkdown(body, { extensions: AST_EXTENSIONS, mdastExtensions: MDAST_EXTENSIONS });
  const children = tree.children || [];

  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (node.type !== "heading" || node.depth !== 1) continue;
    const display = headingDisplayText(node.children);
    if (!display) continue; // 空 H1 不算有效标题

    const prev = children[index - 1];
    const next = children[index + 1];
    if (
      prev &&
      next &&
      prev.type === "html" &&
      isAlignedOpen(prev.value) &&
      next.type === "html" &&
      isAlignedClose(next.value)
    ) {
      return {
        displayText: display,
        source: "aligned-h1",
        isFileNameFallback: false,
        locator: {
          kind: "aligned-lines",
          startLine: mdastLine(prev.position, frontmatterLines),
          endLine: mdastEndLine(next.position, frontmatterLines),
          titleLine: mdastLine(node.position, frontmatterLines)
        }
      };
    }

    const startLine = mdastLine(node.position, frontmatterLines);
    const endLine = mdastEndLine(node.position, frontmatterLines);
    if (startLine === endLine) {
      // ATX：heading 的 source range 只有一行。
      return {
        displayText: display,
        source: "atx-h1",
        isFileNameFallback: false,
        locator: { kind: "atx-line", startLine, endLine, titleLine: startLine }
      };
    }
    // Setext：heading 的 source range 覆盖文本行 + `===` underline 行。
    return {
      displayText: display,
      source: "setext-h1",
      isFileNameFallback: false,
      locator: { kind: "setext-lines", startLine, endLine, titleLine: startLine }
    };
  }

  return {
    displayText: String(fallbackTitle || "Markdown"),
    source: "file-name",
    isFileNameFallback: true,
    locator: null
  };
}

/**
 * 源码文本模式的标题修改（Milkdown 不可用 / 源码编辑时使用）。
 * 与 Rust 契约一致：已有 H1 只改定位行；Setext 保留 === 行；aligned 保留
 * wrapper；多 H1 只改第一个有效标题；无 H1 在 frontmatter 后插入。
 * 保留换行风格与无关正文。
 * @param {string} markdown
 * @param {string} nextTitle
 * @param {{ newline?: string }} [options]
 * @returns {string}
 */
export function setDocumentTitleInSource(markdown, nextTitle, options = {}) {
  const title = String(nextTitle || "").trim();
  if (!title) {
    return String(markdown || "");
  }
  const raw = String(markdown || "");
  const newline = options.newline || (raw.includes("\r\n") ? "\r\n" : "\n");
  const lines = raw.split(/\r?\n/);
  const parsed = parseDocumentTitle(raw, "");

  if (parsed.locator) {
    const { kind, titleLine } = parsed.locator;
    if (kind === "setext-lines") {
      // 只替换文本行，保留 === underline。
      lines[titleLine] = title;
    } else {
      // ATX / aligned 内部 H1 行替换为 `# 标题`。
      lines[titleLine] = `# ${title}`;
    }
    return lines.join(newline);
  }

  const { frontmatterLines } = stripFrontmatter(raw);
  if (frontmatterLines > 0) {
    const prefix = lines.slice(0, frontmatterLines);
    const rest = lines.slice(frontmatterLines);
    // 吸收 frontmatter 后的前导空行，保证插入点位于正文首部且不产生双空行。
    let bodyStart = 0;
    while (bodyStart < rest.length && rest[bodyStart].trim() === "") {
      bodyStart += 1;
    }
    const body = rest.slice(bodyStart);
    return [...prefix, "", `# ${title}`, "", ...body].join(newline);
  }

  if (!raw.trim()) {
    return `# ${title}${newline}`;
  }
  return [`# ${title}`, "", ...lines].join(newline);
}

/**
 * 单行 Markdown inline 文本 → 纯文本（供文档导航 outline 等非权威展示用）。
 * 复用同一套 micromark AST 语义，不引入手写正则。
 * @param {string} input
 * @returns {string}
 */
export function inlineDisplayText(input) {
  const tree = fromMarkdown(String(input || ""), {
    extensions: AST_EXTENSIONS,
    mdastExtensions: MDAST_EXTENSIONS
  });
  const paragraph = tree.children?.[0];
  if (!paragraph) return "";
  return headingDisplayText(paragraph.children);
}

/**
 * 从 mdast heading children 提取纯文本（CommonMark AST 语义）。
 * @param {Array} children
 * @returns {string}
 */
export function headingDisplayText(children) {
  let out = "";
  for (const child of children || []) {
    switch (child.type) {
      case "text":
        out += child.value;
        break;
      case "inlineCode":
        out += child.value;
        break;
      case "link":
      case "linkReference":
        out += headingDisplayText(child.children);
        break;
      case "image":
        out += child.alt || "";
        break;
      case "emphasis":
      case "strong":
      case "delete":
        out += headingDisplayText(child.children);
        break;
      case "break":
        out += " ";
        break;
      case "html":
        // inline HTML 不是文本。
        break;
      default:
        break;
    }
  }
  return out.trim();
}

/**
 * 剥离 YAML frontmatter，返回 { body, frontmatterLines }。
 * frontmatterLines 为 frontmatter 所占原始行数（0 表示无 frontmatter）。
 */
function stripFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  if ((lines[0] || "").trim() !== "---") {
    return { body: raw, frontmatterLines: 0 };
  }
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      return { body: lines.slice(i + 1).join("\n"), frontmatterLines: i + 1 };
    }
  }
  return { body: raw, frontmatterLines: 0 };
}

/** mdast position（1-based）→ 原始文档 0-based 行号。 */
function mdastLine(position, frontmatterLines) {
  const line = position && position.start ? position.start.line : 1;
  return line - 1 + frontmatterLines;
}

/** mdast position 结束行 → 原始文档 0-based 行号。 */
function mdastEndLine(position, frontmatterLines) {
  const line = position && position.end ? position.end.line : 1;
  return line - 1 + frontmatterLines;
}

/** 受控 aligned `<div align="center">` / `<div align="right">`（整行标签）。 */
function isAlignedOpen(value) {
  const lower = String(value || "").trim().toLowerCase();
  return lower === '<div align="center">' || lower === '<div align="right">';
}

function isAlignedClose(value) {
  return String(value || "").trim().toLowerCase() === "</div>";
}
