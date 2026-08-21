// B3 GUI 验收修复（保存后无法撤销）：保存成功后重建 viewer 会销毁编辑器
// 与 PM history。本测试从 dist/index.html 提取真实 saveMarkdownTab 函数
// + 最小宿主依赖，验证保存后编辑器 DOM 未销毁、PM undo/redo 仍工作。
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import assert from "node:assert";

const INDEX_HTML = readFileSync("dist/index.html", "utf8");
const BUNDLE = readFileSync("dist/assets/markdown-editor.js", "utf8");

const saveMatch = INDEX_HTML.match(/async function saveMarkdownTab\(tab, \{ renderAfter = true \} = \{\}\) \{[\s\S]*?\n      \}/);
assert.ok(saveMatch, "saveMarkdownTab must exist");
const SAVE_TAB_FN = saveMatch[0];

const MARKDOWN = `# 普通 H1 文档\n\n这是一份带普通一级标题的 Markdown 验收语料。\n\n## 背景\n\n正文内容。\n`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(`<input id="markdownTitleInput" value="普通 H1 文档" /><div id="viewerBody"><div class="markdown-preview"></div><div id="editor" class="milkdown-editor-root"></div></div>`);
await page.addScriptTag({ content: BUNDLE, type: "module" });
await page.waitForFunction(() => Boolean(window.NutbookMarkdownEditor?.create));

await page.evaluate((saveFnSrc) => {
  window.appState = {
    activeMarkdownEditor: null,
    activeMarkdownEditorTabId: "tab-1",
    homeTabItem: null,
    homeTabOpen: false,
    items: []
  };
  window.tab = {
    id: "tab-1",
    preview: { fileType: "markdown", html: "<h1>普通 H1 文档</h1>", title: "普通 H1 文档", raw: "" },
    detail: { fileHash: null, modifiedAt: "2026-08-21T10:00:00" },
    item: { fileName: "default.md", modifiedAt: "2026-08-21T10:00:00" },
    draft: "",
    markdownBaseline: "",
    isDirty: false,
    isMarkdownDocumentTitleSource: false
  };
  window.getActiveTab = () => window.tab;
  window.getOpenTab = () => window.tab;
  window.invoke = async (cmd) => {
    if (cmd === "save_markdown_content") return { ok: true };
    if (cmd === "get_item_detail") {
      return {
        fileHash: "hash",
        modifiedAt: "2026-08-21T11:00:00",
        summary: { fileName: "default.md", modifiedAt: "2026-08-21T11:00:00" }
      };
    }
    if (cmd === "get_item_preview") {
      return {
        fileType: "markdown",
        html: "<h1>新标题</h1>",
        title: "新标题",
        raw: "# 新标题\n\n内容\n"
      };
    }
    return null;
  };
  window.sha256Hex = async () => "hash";
  window.normalizeItemDetail = (d) => d;
  window.normalizePreview = (p) => p;
  window.normalizeItemSummary = (s) => s || window.tab.item;
  window.markdownSavedStatus = () => "已保存";
  window.markdownSaveErrorStatus = () => "保存失败";
  window.markdownSaveConflict = () => false;
  window.normalizeError = (e) => String(e && e.message || e);
  window.t = (k) => k;
  window.setStatus = () => {};
  window.showToast = () => {};
  window.renderTabs = () => {};
  window.loadItems = async () => {};
  window.renderViewer = () => {
    window.__renderViewerCalled = (window.__renderViewerCalled || 0) + 1;
  };
  window.markdownDocumentTitle = (md, fb) => {
    const m = String(md || "").match(/^#\s+(.+)/m);
    return m ? m[1].trim() : fb;
  };
  window.markdownContentForTab = (tab) => {
    if (window.appState.activeMarkdownEditor?.getMarkdown) {
      return window.appState.activeMarkdownEditor.getMarkdown();
    }
    return tab.draft ?? tab.preview.raw ?? "";
  };
  window.formatTimestamp = () => "2026/08/21 11:00";
  window.normalizeDocumentTitle = (t) => t;
  window.autosizeMarkdownTitleInput = () => {};
  window.setTitleInputValue = (input, value) => { input.value = value; };
  window.__compileError = null;
  try {
    (0, eval)(`${saveFnSrc}\nwindow.__saveMarkdownTab = saveMarkdownTab;`);
  } catch (e) {
    window.__compileError = String(e && e.message || e);
  }
}, SAVE_TAB_FN);

const compileErr = await page.evaluate(() => window.__compileError);
assert.ok(!compileErr, `saveMarkdownTab eval 必须无错误：${compileErr}`);
await page.waitForFunction(() => typeof window.__saveMarkdownTab === "function");

const initial = await page.evaluate(async (markdown) => {
  const root = document.getElementById("editor");
  window.appState.activeMarkdownEditor = await window.NutbookMarkdownEditor.create({ root, markdown });
  window.appState.activeMarkdownEditorTabId = "tab-1";
  window.tab.draft = markdown;
  window.tab.preview.raw = markdown;
  window.tab.markdownBaseline = markdown;
  window.appState.activeMarkdownEditor.setDocumentTitle("新标题");
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__pmRef = root.querySelector(".ProseMirror");
  return {
    pmRef: Boolean(window.__pmRef),
    title: window.appState.activeMarkdownEditor.getDocumentTitle()
  };
}, MARKDOWN);
assert.equal(initial.title, "新标题", "setDocumentTitle 后 PM 标题应为新标题");
assert.ok(initial.pmRef, "必须能获取 ProseMirror DOM 引用");

const after = await page.evaluate(async () => {
  window.__renderViewerCalled = 0;
  await window.__saveMarkdownTab(window.tab, { renderAfter: true });
  const root = document.getElementById("editor");
  const newPmRef = root.querySelector(".ProseMirror");
  return {
    samePmRef: newPmRef === window.__pmRef,
    pmAfter: Boolean(newPmRef),
    renderViewerCalled: window.__renderViewerCalled,
    titleAfter: window.appState.activeMarkdownEditor.getDocumentTitle(),
    isDirty: window.tab.isDirty,
    baseline: window.tab.markdownBaseline
  };
});
assert.equal(after.renderViewerCalled, 0, "保存后 renderViewer 绝不能被调用（会重建编辑器丢失 history）");
assert.ok(after.samePmRef, "保存后 ProseMirror DOM 必须是同一个实例（编辑器未重建）");
assert.equal(after.titleAfter, "新标题", "保存后 PM 标题仍为新标题");
assert.equal(after.isDirty, false, "保存后 isDirty 应为 false");
assert.match(after.baseline, /^# 新标题/, "保存后 baseline 应更新为磁盘内容");

const undoResult = await page.evaluate(() => {
  const handled = window.appState.activeMarkdownEditor.undo?.();
  return { handled, title: window.appState.activeMarkdownEditor.getDocumentTitle() };
});
assert.equal(undoResult.handled, true, "保存后 editor.undo() 必须能撤销保存前的标题事务");
assert.equal(undoResult.title, "普通 H1 文档", "undo 后 PM 标题应恢复为旧标题");

const redoResult = await page.evaluate(() => {
  const handled = window.appState.activeMarkdownEditor.redo?.();
  return { handled, title: window.appState.activeMarkdownEditor.getDocumentTitle() };
});
assert.equal(redoResult.handled, true, "保存后 editor.redo() 必须能重做");
assert.equal(redoResult.title, "新标题", "redo 后 PM 标题应恢复为新标题");

await browser.close();
console.log("markdown save keeps editor history test passed.");