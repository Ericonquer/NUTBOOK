// B3 GUI 验收修复（保存瞬间回旧标题）：⌘S 保存前必须把标题输入框未提交的
// 值 commit 进文档。用户输入新标题后直接按 ⌘S（未 Enter/blur）时，PM doc
// 尚未更新，若不先 commit，保存的将是旧标题，保存后 preview/输入框会
// "瞬间回到旧标题"。本测试从 dist/index.html 提取真实 saveActiveMarkdown
// 函数体，用真实编辑器实例验证收敛行为。
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import assert from "node:assert";

const BUNDLE = readFileSync("dist/assets/markdown-editor.js", "utf8");
const INDEX_HTML = readFileSync("dist/index.html", "utf8");
const MARKDOWN = `# 普通 H1 文档\n\n正文第一段。\n\n## 背景\n\n内容。\n`;

const saveMatch = INDEX_HTML.match(/async function saveActiveMarkdown\(\) \{[\s\S]*?\n      \}/);
assert.ok(saveMatch, "saveActiveMarkdown must exist in dist/index.html");
const SAVE_FN = saveMatch[0];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(`<input id="markdownTitleInput" value="普通 H1 文档" /><div id="editor" class="milkdown-editor-root"></div>`);
await page.addScriptTag({ content: BUNDLE, type: "module" });
await page.waitForFunction(() => Boolean(window.NutbookMarkdownEditor?.create));

await page.evaluate((saveFnSrc) => {
  window.__commitCalls = [];
  window.appState = {
    markdownTitleInputComposing: false,
    activeMarkdownEditorTabId: "tab-1",
    activeMarkdownEditor: null
  };
  window.getActiveTab = () => ({ id: "tab-1", preview: { fileType: "markdown" } });
  window.commitMarkdownDocumentTitle = (tab, input) => {
    window.__commitCalls.push(input.value);
    return window.appState.activeMarkdownEditor.setDocumentTitle(input.value);
  };
  // 真实 saveActiveMarkdown 走统一收敛函数：这里用与真实逻辑等价的聚焦收敛
  // （标题值不同 → 一次 PM transaction 提交；composition 中返回 false 阻止保存；
  // 值相同不产生无意义 commit）。
  window.convergePendingMarkdownTitle = (tab) => {
    if (window.appState.markdownTitleInputComposing) return false;
    const input = document.getElementById("markdownTitleInput");
    if (!input || document.activeElement !== input) return true;
    const nextTitle = String(input.value || "").trim();
    if (!nextTitle) return true;
    const current = window.appState.activeMarkdownEditor.getDocumentTitle();
    if (nextTitle === current) return true;
    commitMarkdownDocumentTitle(tab, input);
    return true;
  };
  window.saveMarkdownTab = async () => {
    window.__savedContent = window.appState.activeMarkdownEditor.getMarkdown();
    return true;
  };
  (0, eval)(`${saveFnSrc}\nwindow.__saveActiveMarkdown = saveActiveMarkdown;`);
}, SAVE_FN);
await page.waitForFunction(() => typeof window.__saveActiveMarkdown === "function");

await page.evaluate(async (markdown) => {
  const root = document.getElementById("editor");
  window.appState.activeMarkdownEditor = await window.NutbookMarkdownEditor.create({ root, markdown });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const input = document.getElementById("markdownTitleInput");
  input.focus();               // 焦点在 input，未 blur
  input.value = "测试新标题";   // 用户输入新标题
}, MARKDOWN);

assert.equal(
  await page.evaluate(() => window.appState.activeMarkdownEditor.getDocumentTitle()),
  "普通 H1 文档",
  "PM doc 尚未 commit 时仍为旧标题"
);
await page.evaluate(() => window.__saveActiveMarkdown());
assert.equal(await page.evaluate(() => window.__commitCalls.length), 1, "保存前必须 commit 一次标题输入框");
const saved = await page.evaluate(() => window.__savedContent);
assert.match(saved, /^# 测试新标题/, "保存内容必须包含新标题（而非旧标题）");
assert.equal(
  await page.evaluate(() => window.appState.activeMarkdownEditor.getDocumentTitle()),
  "测试新标题",
  "commit 后 PM doc 必须更新为新标题"
);

// 值相同 → 不 commit（避免无意义 history 步骤）
await page.evaluate(() => {
  const input = document.getElementById("markdownTitleInput");
  input.focus();
  input.value = "测试新标题";
  window.__commitCalls.length = 0;
});
await page.evaluate(() => window.__saveActiveMarkdown());
assert.equal(await page.evaluate(() => window.__commitCalls.length), 0, "值相同不得产生无意义 commit");

await browser.close();
console.log("markdown save title convergence passed.");
