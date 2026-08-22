// PR B / Task B3：Markdown 标题状态源的确定性回归测试。
//
// 第一部分（node 纯函数）：直接 import `src/markdown-document-title.js`，
// 验证权威标题解析与源码 fallback 变换，与 Rust `document_title.rs` 共享
// 同一组 `card-revisions` 语料与同一组期望值。
//
// 第二部分（playwright + 真实 bundle）：加载构建后的
// `dist/assets/markdown-editor.js`，验证 Milkdown 标题事务：
// 一次 transaction / 单个 history 步骤 / undo/redo / aligned wrapper 保留 /
// 多 H1 只改第一个 / 无 H1 插入 / 不重挂载 / baseline 不重置。

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import {
  headingDisplayText,
  parseDocumentTitle,
  setDocumentTitleInSource
} from "../src/markdown-document-title.js";

const FIXTURE_DIR = "src-tauri/tests/fixtures/card-revisions";
const fixture = (name) => readFileSync(`${FIXTURE_DIR}/${name}`, "utf8");

// ============================================================
// 第一部分：纯函数（与 Rust document_title.rs 同一契约）
// ============================================================

function assertParsed(raw, fileName, expectedText, expectedSource) {
  const parsed = parseDocumentTitle(raw, fileName);
  assert.equal(parsed.displayText, expectedText, `display text mismatch for ${fileName}`);
  assert.equal(parsed.source, expectedSource, `source mismatch for ${fileName}`);
  assert.equal(parsed.isFileNameFallback, false, `must not fall back for ${fileName}`);
  assert.ok(parsed.locator, `locator must exist for ${fileName}`);
  return parsed;
}

// 9 份共享语料，期望值与 Rust 测试逐一相同。
assertParsed(
  fixture("markdown-default-cover.md"),
  "markdown-default-cover.md",
  "普通 H1 文档",
  "atx-h1"
);
assertParsed(
  fixture("markdown-frontmatter-fake-h1.md"),
  "markdown-frontmatter-fake-h1.md",
  "正文真正的标题",
  "atx-h1"
);
assertParsed(
  fixture("markdown-code-fence-h1.md"),
  "markdown-code-fence-h1.md",
  "代码块里的假 H1 不是标题",
  "atx-h1"
);
assertParsed(
  fixture("markdown-setext-h1.md"),
  "markdown-setext-h1.md",
  "Setext 一级标题用下划线式语法表示",
  "setext-h1"
);
assertParsed(
  fixture("markdown-aligned-h1.md"),
  "markdown-aligned-h1.md",
  "居中容器内的 H1",
  "aligned-h1"
);
assertParsed(
  fixture("markdown-multiple-h1.md"),
  "markdown-multiple-h1.md",
  "第一个有效 H1 才是标题",
  "atx-h1"
);
assertParsed(
  fixture("markdown-long-cjk-title.md"),
  "markdown-long-cjk-title.md",
  "这是一个用于验证超长中文标题换行与截断行为的验收样本标题，它的长度必须明显超过卡片封面可用宽度，从而检验标题封面在 CJK 文本下按字符边界确定性换行、缩小字号或截断且不溢出卡片",
  "atx-h1"
);
assertParsed(
  fixture("markdown-long-latin-title.md"),
  "markdown-long-latin-title.md",
  "The Definitive Guide to Building a Very Long Latin Document Title That Will Absolutely Exceed Any Reasonable Card Thumbnail Width On The Home Screen Grid",
  "atx-h1"
);

const noH1 = parseDocumentTitle(fixture("markdown-no-h1.md"), "markdown-no-h1.md");
assert.equal(noH1.displayText, "markdown-no-h1.md");
assert.equal(noH1.source, "file-name");
assert.equal(noH1.isFileNameFallback, true);
assert.equal(noH1.locator, null);

// frontmatter 假标题与 `# 注释` 行都不是正文标题。
assertParsed(
  "---\ntitle: Frontmatter 里的假标题\n# 这不是正文标题，是 frontmatter 注释\n---\n\n# 正文真正的标题\n",
  "fallback.md",
  "正文真正的标题",
  "atx-h1"
);

// 反引号与波浪线 fence。
assert.equal(
  parseDocumentTitle("# 真标题\n\n```\n# 假标题\n```\n", "f.md").displayText,
  "真标题"
);
assert.equal(
  parseDocumentTitle("# 真标题\n\n~~~\n# 假标题\n~~~\n", "f.md").displayText,
  "真标题"
);

// 普通 raw HTML（无空行分隔）内的 H1 不是标题。
assert.equal(
  parseDocumentTitle("<div>\n# 假标题\n</div>\n\n# 真标题\n", "f.md").displayText,
  "真标题"
);
// CommonMark 语义：`<div align="left">` 是 HTML block type 6，在空行处结束；
// 随后的 `# 不受控的假标题` 是独立顶层 ATX heading（非 raw HTML 内部）。
assert.equal(
  parseDocumentTitle('<div align="left">\n\n# 不受控的假标题\n\n</div>\n\n# 真标题\n', "f.md").displayText,
  "不受控的假标题"
);

// blockquote / list 内 H1 跳过。
assert.equal(
  parseDocumentTitle("> # 引用里的假标题\n\n- # 列表里的假标题\n\n1. # 有序列表里的假标题\n\n# 真标题\n", "f.md").displayText,
  "真标题"
);

// 空 H1 跳过，继续找下一个有效标题。
const emptyH1 = parseDocumentTitle("#   \n\n# 有效的标题\n", "f.md");
assert.equal(emptyH1.displayText, "有效的标题");
assert.equal(emptyH1.locator.titleLine, 2);

// 多 H1 只取第一个。
assert.equal(parseDocumentTitle("# 第一个\n\n# 第二个\n", "f.md").displayText, "第一个");

// inline 纯文本（与 Rust pulldown-cmark 一致）。
assert.equal(
  parseDocumentTitle("# **加粗** *斜体* `代码` [链接文本](https://example.com) ![alt 图片](img.png)\n", "f.md").displayText,
  "加粗 斜体 代码 链接文本 alt 图片"
);
assert.equal(parseDocumentTitle("# \\*不是强调\\*\n", "f.md").displayText, "*不是强调*");
assert.equal(parseDocumentTitle("# \\[字面括号\\]\n", "f.md").displayText, "[字面括号]");
assert.equal(parseDocumentTitle("# a <span>标签</span> b\n", "f.md").displayText, "a 标签 b");
assert.equal(parseDocumentTitle("# 看 <https://example.com> 这里\n", "f.md").displayText, "看 https://example.com 这里");
assert.equal(parseDocumentTitle("# **a *b* c**\n", "f.md").displayText, "a b c");
// GFM 删除线（B3 复审 GFM 契约，与 Rust ENABLE_STRIKETHROUGH + Milkdown gfm 一致）。
assert.equal(parseDocumentTitle("# ~~删除线标题~~\n", "f.md").displayText, "删除线标题");
assert.equal(parseDocumentTitle("# 前 ~~中~~ 后\n", "f.md").displayText, "前 中 后");
assert.equal(headingDisplayText([{ type: "text", value: "  " }]), "");

// 引用式链接（mdast linkReference）：display 取 label 文本。
assert.equal(
  parseDocumentTitle("# [标题文本][ref-id]\n\n[ref-id]: https://example.com\n", "f.md").displayText,
  "标题文本"
);
// 未闭合 `[` 与 `![`：不得无限递归，按字面文本处理。
assert.equal(parseDocumentTitle("# 未闭合 [ bracket\n", "f.md").displayText, "未闭合 [ bracket");
assert.equal(parseDocumentTitle("# 图片 ![alt\n", "f.md").displayText, "图片 ![alt");
// closing ATX hashes 不出现在 display text。
assert.equal(parseDocumentTitle("# 标题 ###\n", "f.md").displayText, "标题");
// HTML entity：CommonMark 语义解码（两端一致）。
assert.equal(parseDocumentTitle("# a &amp; b\n", "f.md").displayText, "a & b");
assert.equal(parseDocumentTitle("# `code &amp; space` 结尾\n", "f.md").displayText, "code &amp; space 结尾");
// email / URL autolink。
assert.equal(parseDocumentTitle("# 联系 <me@example.com>\n", "f.md").displayText, "联系 me@example.com");
assert.equal(
  parseDocumentTitle("# 看 <https://example.com/x>\n", "f.md").displayText,
  "看 https://example.com/x"
);

// 列表续行中的缩进 H1 与四空格缩进代码中的 `#` 不是顶层标题。
const listCont = parseDocumentTitle("- item\n    # 列表内假标题\n\n# 真标题\n", "f.md");
assert.equal(listCont.displayText, "真标题");
assert.equal(listCont.locator.titleLine, 3);
const indented = parseDocumentTitle("    # 缩进代码里的假标题\n\n# 真标题\n", "f.md");
assert.equal(indented.displayText, "真标题");
assert.equal(indented.locator.titleLine, 2);
assert.equal(
  parseDocumentTitle("- item\n\n    # 列表项内假标题\n\n# 真标题\n", "f.md").displayText,
  "真标题"
);

// 超过 32 行的 raw HTML block：内部 H1 不得被采用。
{
  const rows = Array.from({ length: 40 }, (_, i) => `<tr><td>行 ${i}</td></tr>`).join("\n");
  const longHtml = `<table>\n${rows}\n# 表格里的假标题\n</table>\n\n# 真标题\n`;
  assert.equal(parseDocumentTitle(longHtml, "f.md").displayText, "真标题");
}

// blockquote / list / raw HTML 之后的真实顶层 H1。
assert.equal(
  parseDocumentTitle("> # 引用假\n\n- # 列表假\n\n<div>\n# html 假\n</div>\n\n# 真标题\n", "f.md").displayText,
  "真标题"
);

// ---- setDocumentTitleInSource（源码 fallback 变换）----

// ATX H1：替换行，保留其他行与换行。
const atxRaw = "# 旧标题\n\n正文\n";
assert.equal(setDocumentTitleInSource(atxRaw, "新标题"), "# 新标题\n\n正文\n");

// Setext：只改文本行，保留 === 行。
const setextRaw = "旧 Setext 标题\n==========\n\n正文\n";
assert.equal(setDocumentTitleInSource(setextRaw, "新标题"), "新标题\n==========\n\n正文\n");

// aligned：保留 wrapper，只改内部 H1 行。
const alignedRaw = '<div align="center">\n\n# 旧居中标题\n\n</div>\n\n正文\n';
assert.equal(
  setDocumentTitleInSource(alignedRaw, "新标题"),
  '<div align="center">\n\n# 新标题\n\n</div>\n\n正文\n'
);

// 多 H1：只改第一个有效标题。
const multipleRaw = "# 第一个\n\n# 第二个\n";
assert.equal(
  setDocumentTitleInSource(multipleRaw, "新标题"),
  "# 新标题\n\n# 第二个\n"
);

// 无 H1：frontmatter 后插入。
const frontmatterRaw = "---\ntitle: 某标题\n---\n\n正文第一段\n";
assert.equal(
  setDocumentTitleInSource(frontmatterRaw, "新标题"),
  "---\ntitle: 某标题\n---\n\n# 新标题\n\n正文第一段\n"
);

// 无 H1 无 frontmatter：文档开头插入。
assert.equal(
  setDocumentTitleInSource("正文第一段\n", "新标题"),
  "# 新标题\n\n正文第一段\n"
);

// 空文档。
assert.equal(setDocumentTitleInSource("", "新标题"), "# 新标题\n");

// CRLF：保留换行风格。
const crlfRaw = "# 旧标题\r\n\r\n正文\r\n";
assert.equal(setDocumentTitleInSource(crlfRaw, "新标题"), "# 新标题\r\n\r\n正文\r\n");

// fence 内的 `# 假标题` 不能被修改：无有效 H1 时插入在 frontmatter 后/文档首。
const fenceOnlyRaw = "```\n# 假标题\n```\n";
assert.equal(
  setDocumentTitleInSource(fenceOnlyRaw, "新标题"),
  "# 新标题\n\n```\n# 假标题\n```\n"
);

// 空标题不修改。
assert.equal(setDocumentTitleInSource("# 旧标题\n", "  "), "# 旧标题\n");

// ============================================================
// 第二部分：Milkdown 真实行为（构建后的 bundle）
// ============================================================

const bundle = readFileSync("dist/assets/markdown-editor.js", "utf8");
assert.match(bundle, /setDocumentTitle/, "the built markdown bundle must expose the B3 title API");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
// B3 复审 P1-4：任何浏览器未处理异常（pageerror）都必须让测试失败，
// 特别是 "MilkdownError: Context editorView not found"（延迟 timer/RAF/
// microtask 在 destroy 后继续访问已销毁的 editorView）。
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

async function createEditor(markdown) {
  return page.evaluate(async (markdown) => {
    const root = document.getElementById("editor");
    window.__titleEditor?.destroy?.();
    root.innerHTML = "";
    window.__titleEditor = await window.NutbookMarkdownEditor.create({ root, markdown });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.__pmBefore = root.querySelector(".ProseMirror");
    return {
      baseline: window.__titleEditor.getBaselineMarkdown(),
      documentTitle: window.__titleEditor.getDocumentTitle()
    };
  }, markdown);
}

async function getMarkdown() {
  return page.evaluate(() => window.__titleEditor.getMarkdown());
}

async function getDocumentTitle() {
  return page.evaluate(() => window.__titleEditor.getDocumentTitle());
}

async function setTitle(title) {
  return page.evaluate((title) => window.__titleEditor.setDocumentTitle(title), title);
}

async function undo() {
  return page.evaluate(() => window.__titleEditor.undo());
}

async function redo() {
  return page.evaluate(() => window.__titleEditor.redo());
}

async function pmElementSurvived() {
  return page.evaluate(() => {
    const current = document.querySelector(".ProseMirror");
    return Boolean(current) && current === window.__pmBefore;
  });
}

try {
  await page.setContent(`<div id="editor"></div>`);
  await page.addScriptTag({ content: bundle, type: "module" });
  await page.waitForFunction(() => Boolean(window.NutbookMarkdownEditor?.create));

  // 1. 修改已有 H1：一次事务，getMarkdown 更新，undo/redo 同步。
  let created = await createEditor("# 旧标题\n\n正文段落\n");
  assert.match(created.baseline, /^# 旧标题/, "baseline must match input markdown");
  assert.equal(created.documentTitle, "旧标题", "getDocumentTitle must read the first H1");
  assert.equal(await setTitle("新标题"), true, "setDocumentTitle must commit");
  let markdown = await getMarkdown();
  assert.match(markdown, /^# 新标题/, "the H1 text must be replaced in the document");
  assert.match(markdown, /正文段落/, "unrelated body must be preserved");
  assert.equal(await pmElementSurvived(), true, "the editor must not be remounted by a title transaction");
  assert.equal(await getDocumentTitle(), "新标题");

  // 2. 一次修改 = 一个 history 步骤（创建时原始标题不在 history 内，
  //    因此三次修改需要三次 undo 才能回到原始）。
  await setTitle("第一版");
  await setTitle("第二版");
  markdown = await getMarkdown();
  assert.match(markdown, /^# 第二版/, "the second edit must be applied");
  await undo();
  markdown = await getMarkdown();
  assert.match(markdown, /^# 第一版/, "one undo must step back to the first edit");
  assert.equal(await getDocumentTitle(), "第一版", "undo must resync the title input");
  await undo();
  markdown = await getMarkdown();
  assert.match(markdown, /^# 新标题/, "two undos must reach the second history step");
  await undo();
  markdown = await getMarkdown();
  assert.match(markdown, /^# 旧标题/, "three undos must reach the original title");
  assert.equal(await getDocumentTitle(), "旧标题");
  await redo();
  markdown = await getMarkdown();
  assert.match(markdown, /^# 新标题/, "redo must restore the first step");
  await redo();
  markdown = await getMarkdown();
  assert.match(markdown, /^# 第一版/, "redo must restore the second step");
  await redo();
  markdown = await getMarkdown();
  assert.match(markdown, /^# 第二版/, "redo must restore the third step");

  // 2b. 反复 undo/redo 必须保持只有一个 H1，不能因重做复制/插入新 heading。
  //    这是 GUI 反馈"⇧⌘Z 重做会多一个标题"的回归保护。
  const headingCount = (text) => (text.match(/^# .+$/gm) || []).length;
  for (let i = 0; i < 6; i += 1) {
    await undo();
    markdown = await getMarkdown();
    assert.equal(headingCount(markdown), 1, `after undo #${i + 1} exactly one H1 must remain`);
    assert.match(markdown, /^# /m, `after undo #${i + 1} the single H1 must stay at the top`);
    await redo();
    markdown = await getMarkdown();
    assert.equal(headingCount(markdown), 1, `after redo #${i + 1} exactly one H1 must remain`);
    assert.match(markdown, /^# /m, `after redo #${i + 1} the single H1 must stay at the top`);
  }

  // 3. aligned H1：只改内部 heading，保留 wrapper；undo 恢复。
  await createEditor('<div align="center">\n\n# 居中旧标题\n\n</div>\n\n正文\n');
  assert.equal(await getDocumentTitle(), "居中旧标题", "aligned H1 must be recognized as the title");
  await setTitle("新居中标题");
  markdown = await getMarkdown();
  assert.match(markdown, /<div align="center">/, "the alignment wrapper must survive");
  assert.match(markdown, /# 新居中标题/, "the inner heading must be replaced");
  assert.doesNotMatch(markdown, /居中旧标题/, "the old inner text must be gone");
  await undo();
  markdown = await getMarkdown();
  assert.match(markdown, /# 居中旧标题/, "undo must restore the aligned heading");
  assert.match(markdown, /<div align="center">/, "the wrapper must survive undo");

  // 4. 多 H1：只改第一个有效标题，第二个不动。
  await createEditor("# 第一个\n\n# 第二个\n");
  await setTitle("新第一");
  markdown = await getMarkdown();
  assert.match(markdown, /^# 新第一/, "the first H1 must be updated");
  assert.match(markdown, /# 第二个/, "the second H1 must stay untouched");

  // 5. 无 H1：在正文首部插入（frontmatter 被拆分到编辑器外；frontmatter 后
  //    的空行映射为前导空 paragraph，插入时被 heading 替换，避免 `<br />` 脏输出）。
  await createEditor("---\ntitle: 某标题\n---\n\n正文第一段\n");
  assert.equal(await getDocumentTitle(), null, "no valid H1 must report null");
  await setTitle("插入的标题");
  markdown = await getMarkdown();
  assert.match(markdown, /^---\ntitle: 某标题\n---\n# 插入的标题/, "the H1 must be inserted right after the frontmatter");
  assert.doesNotMatch(markdown, /<br \/>/, "inserting a title must not produce a <br /> pollution");
  assert.match(markdown, /正文第一段/, "body must be preserved");
  await undo();
  markdown = await getMarkdown();
  assert.doesNotMatch(markdown, /# 插入的标题/, "undo must remove the inserted H1");
  assert.match(markdown, /正文第一段/, "undo must keep the body");

  // 6. 共享语料：Milkdown AST 与权威解析一致。
  const corpus = [
    ["markdown-default-cover.md", "普通 H1 文档"],
    ["markdown-frontmatter-fake-h1.md", "正文真正的标题"],
    ["markdown-code-fence-h1.md", "代码块里的假 H1 不是标题"],
    ["markdown-setext-h1.md", "Setext 一级标题用下划线式语法表示"],
    ["markdown-aligned-h1.md", "居中容器内的 H1"],
    ["markdown-multiple-h1.md", "第一个有效 H1 才是标题"],
    ["markdown-no-h1.md", null]
  ];
  for (const [name, expected] of corpus) {
    await createEditor(fixture(name));
    const actual = await getDocumentTitle();
    assert.equal(actual, expected, `Milkdown title mismatch for ${name}`);
  }

  // 7. baseline 不重置：标题事务前后 getBaselineMarkdown 一致。
  await createEditor("# 基线标题\n\n正文\n");
  const baselineBefore = await page.evaluate(() => window.__titleEditor.getBaselineMarkdown());
  await setTitle("改动后");
  const baselineAfter = await page.evaluate(() => window.__titleEditor.getBaselineMarkdown());
  assert.equal(baselineAfter, baselineBefore, "the normalized baseline must not be reset by a title transaction");

  // 7b. 相同标题重复提交不产生 history 步骤：undo 一次即恢复（修复
  // "保存后 ⌘Z 需要两次才恢复"——重复 blur/保存收敛以相同值提交时，
  // 旧实现会堆出无变化的 history 条目）。
  await createEditor("# 旧标题\n\n正文\n");
  const r1 = await setTitle("新标题");
  assert.equal(r1, true, "首次修改必须产生事务");
  const r2 = await setTitle("新标题");
  assert.equal(r2, false, "相同标题必须返回 false，不产生事务");
  await undo();
  let t = await getDocumentTitle();
  assert.equal(t, "旧标题", "一次 undo 必须直接回到旧标题（无中间无变化步骤）");
  await redo();
  t = await getDocumentTitle();
  assert.equal(t, "新标题", "一次 redo 必须直接回到新标题");
  await redo();
  t = await getDocumentTitle();
  assert.equal(t, "新标题", "redo 栈空后标题保持，不产生重复");

  // 8. 静态检查：宿主 bundle 不含旧 remount 路线调用（源码断言见 test-regressions）。
  assert.equal(
    await page.evaluate(() => typeof window.NutbookMarkdownEditor.parseDocumentTitle),
    "function",
    "the bundle must expose the shared document title parser"
  );

  // 9. B3 复审 P1-4：editorView 生命周期——undo/redo/保存后立即销毁或切换
  // 文档，以及连续 destroy/create，均不得触发 "editorView not found"
  // （destroy 前置 disposed guard；延迟回调检查 destroyed；pageerror 归零）。
  // undo 后同一 tick 销毁。
  await createEditor("# 生命线\n\n正文\n");
  await setTitle("第一改");
  await page.evaluate(() => { window.__titleEditor.undo(); window.__titleEditor.destroy(); });
  // redo 后立即切换文档。
  await createEditor("# 切换\n\n正文\n");
  await setTitle("切换改");
  await page.evaluate(() => { window.__titleEditor.redo(); });
  await createEditor("# 新文档\n\n正文\n");
  // 保存路径（getMarkdown 序列化）后立即关闭。
  await createEditor("# 保存关闭\n\n正文\n");
  await setTitle("保存改");
  await page.evaluate(() => { window.__titleEditor.getMarkdown(); window.__titleEditor.destroy(); });
  // 连续 destroy/create（旧实例延迟回调不得报错）。
  for (let i = 0; i < 3; i += 1) {
    await createEditor(`# 连续 ${i}\n\n正文\n`);
    await page.evaluate(() => window.NutbookMarkdownEditor.destroy(document.getElementById("editor")));
  }
  // 关闭重开后新 editor history 独立。
  await createEditor("# 独立历史\n\n正文\n");
  assert.equal(
    await page.evaluate(() => window.__titleEditor.undo()),
    false,
    "新实例 undo 栈必须为空（旧实例 history 不跨重开生效）"
  );
  await setTitle("新实例改");
  await undo();
  assert.equal(await getDocumentTitle(), "独立历史", "undo 只作用于新实例");
} finally {
  await page.evaluate(() => window.__titleEditor?.destroy?.()).catch(() => {});
  await browser.close();
  assert.deepEqual(
    pageErrors,
    [],
    `browser page errors must be strictly zero: ${pageErrors.join(" | ")}`
  );
}

console.log("Markdown document title regression passed.");
