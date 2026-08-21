// B3 follow-up: an open Markdown tab owns one live Milkdown/ProseMirror
// session. Switching tabs detaches/reattaches that exact root so PM history is
// retained; closing the tab destroys the session and a reopen starts clean.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const INDEX_HTML = readFileSync("dist/index.html", "utf8");
const BUNDLE = readFileSync("dist/assets/markdown-editor.js", "utf8");

function functionSection(name, nextName) {
  let start = INDEX_HTML.indexOf(`function ${name}`);
  let end = INDEX_HTML.indexOf(`function ${nextName}`, start + 1);
  assert.ok(start >= 0 && end > start, `${name} must be followed by ${nextName}`);
  if (INDEX_HTML.slice(start - 6, start) === "async ") start -= 6;
  if (INDEX_HTML.slice(end - 6, end) === "async ") end -= 6;
  return INDEX_HTML.slice(start, end);
}

const SESSION_FUNCTIONS = functionSection("suspendActiveMarkdownEditor", "loadMarkdownEditorApi");
const MOUNT_FUNCTION = functionSection("mountMarkdownEditor", "focusMarkdownEditorFromPendingSelection");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent('<main id="viewer"><section class="content-card"><div id="milkdownEditorRoot" class="milkdown-editor-root"></div></section></main>');
await page.addScriptTag({ content: BUNDLE, type: "module" });
await page.waitForFunction(() => Boolean(window.NutbookMarkdownEditor?.create));

await page.evaluate(({ sessionFunctions, mountFunction }) => {
  const markdown = (title, body) => `# ${title}\n\n${body}\n`;
  window.__markdown = markdown;
  window.__tabs = new Map([
    ["a", {
      id: "a",
      item: { fileName: "a.md" },
      preview: { fileType: "markdown", raw: markdown("A0", "alpha"), title: "A0" },
      draft: markdown("A0", "alpha"),
      markdownBaseline: markdown("A0", "alpha"),
      isDirty: false
    }],
    ["b", {
      id: "b",
      item: { fileName: "b.md" },
      preview: { fileType: "markdown", raw: markdown("B0", "beta"), title: "B0" },
      draft: markdown("B0", "beta"),
      markdownBaseline: markdown("B0", "beta"),
      isDirty: false
    }]
  ]);
  window.appState = {
    activeTabId: "a",
    activeMarkdownEditor: null,
    activeMarkdownEditorTabId: null,
    markdownEditorSessions: new Map(),
    markdownEditorMountToken: 0,
    markdownEditorShouldFocus: false,
    markdownEditorError: "",
    markdownPreferences: { tableToolsEnabled: true },
    language: "zh-CN",
    markdownEditMode: "rich"
  };
  window.els = { viewerBody: document.getElementById("viewer") };
  window.getOpenTab = (id) => window.__tabs.get(id) || null;
  window.hideMarkdownLinkTooltip = () => {};
  window.t = (key) => key;
  window.setStatus = () => {};
  window.logMarkdownPerf = () => {};
  window.loadMarkdownEditorApi = async () => window.NutbookMarkdownEditor;
  window.resolveMarkdownImageUrl = (src) => src;
  window.insertMarkdownImageAssetForTab = async () => null;
  window.deleteMarkdownImageAssetForTab = async () => false;
  window.scheduleMarkdownOutlineRefresh = () => {};
  window.syncMarkdownTitleInputFromDocument = () => {};
  window.markdownScrollForTab = () => 0;
  window.assignMarkdownOutlineTargets = () => {};
  window.setupMarkdownOutline = () => {};
  window.setupMarkdownCodeCopyButton = () => {};
  window.setupMarkdownImageResources = () => {};
  window.restoreMarkdownScroll = () => {};
  window.normalizeDetailedError = (error) => String(error?.message || error);
  window.markdownEditorFailedStatus = (error) => String(error);
  window.renderViewer = () => {};
  window.isMarkdownTabDirty = (tab) => {
    const baseline = tab.markdownBaseline ?? tab.preview.raw ?? "";
    return Boolean(tab.isDirty) || (tab.draft ?? tab.preview.raw ?? "") !== baseline;
  };
  (0, eval)(`${sessionFunctions}\n${mountFunction}\nwindow.__mountMarkdownEditor = mountMarkdownEditor;window.__suspendActiveMarkdownEditor = suspendActiveMarkdownEditor;window.__destroyMarkdownEditorSession = destroyMarkdownEditorSession;`);
}, { sessionFunctions: SESSION_FUNCTIONS, mountFunction: MOUNT_FUNCTION });

async function mount(tabId, shouldFocus = false) {
  await page.evaluate(async ({ tabId, shouldFocus }) => {
    window.appState.activeTabId = tabId;
    window.appState.markdownEditorShouldFocus = shouldFocus;
    window.els.viewerBody.innerHTML = '<section class="content-card"><div id="milkdownEditorRoot" class="milkdown-editor-root"></div></section>';
    await window.__mountMarkdownEditor(window.__tabs.get(tabId));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, { tabId, shouldFocus });
}

async function suspend() {
  await page.evaluate(() => {
    const tab = window.__tabs.get(window.appState.activeMarkdownEditorTabId);
    tab.draft = window.appState.activeMarkdownEditor.getMarkdown();
    tab.isDirty = tab.draft !== tab.markdownBaseline;
    window.__suspendActiveMarkdownEditor();
  });
}

await mount("a");
const aOriginalPm = await page.evaluate(() => {
  window.__aOriginalPm = document.querySelector(".ProseMirror");
  return Boolean(window.__aOriginalPm);
});
assert.ok(aOriginalPm, "tab A must mount a real ProseMirror editor");

await page.evaluate(async () => {
  window.appState.activeMarkdownEditor.setDocumentTitle("A1 saved");
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const tab = window.__tabs.get("a");
  tab.draft = window.appState.activeMarkdownEditor.getMarkdown();
  tab.markdownBaseline = tab.draft;
  tab.isDirty = false;
});
await suspend();

await mount("b");
await page.evaluate(async () => {
  window.appState.activeMarkdownEditor.setDocumentTitle("B1 unsaved");
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
});
await suspend();

await mount("a", true);
const resumedA = await page.evaluate(() => ({
  samePm: document.querySelector(".ProseMirror") === window.__aOriginalPm,
  focused: Boolean(document.activeElement?.closest?.(".milkdown-editor-root")),
  title: window.appState.activeMarkdownEditor.getDocumentTitle(),
  sessionCount: window.appState.markdownEditorSessions.size
}));
assert.equal(resumedA.samePm, true, "tab switch must reattach the exact same ProseMirror DOM");
assert.equal(resumedA.focused, true, "returning through a tab click must restore editor focus");
assert.equal(resumedA.title, "A1 saved");
assert.equal(resumedA.sessionCount, 2, "each open Markdown tab must own an isolated live session");

const tableToolsHotToggle = await page.evaluate(() => {
  const editor = window.appState.activeMarkdownEditor;
  editor.setTableToolsEnabled(false);
  const afterDisable = document.querySelectorAll(".markdown-table-toolbar").length;
  editor.setTableToolsEnabled(true);
  const afterEnable = document.querySelectorAll(".markdown-table-toolbar").length;
  return { afterDisable, afterEnable, title: editor.getDocumentTitle() };
});
assert.deepEqual(
  tableToolsHotToggle,
  { afterDisable: 0, afterEnable: 1, title: "A1 saved" },
  "table-tool preference must hot-toggle on the live session without rebuilding its document"
);

const undoA = await page.evaluate(() => {
  const handled = window.appState.activeMarkdownEditor.undo();
  const tab = window.__tabs.get("a");
  return { handled, title: window.appState.activeMarkdownEditor.getDocumentTitle(), dirty: tab.isDirty };
});
assert.deepEqual(undoA, { handled: true, title: "A0", dirty: true }, "undo after tab switch must reach the pre-save title and become dirty");

const redoA = await page.evaluate(() => {
  const handled = window.appState.activeMarkdownEditor.redo();
  const tab = window.__tabs.get("a");
  return { handled, title: window.appState.activeMarkdownEditor.getDocumentTitle(), dirty: tab.isDirty };
});
assert.deepEqual(redoA, { handled: true, title: "A1 saved", dirty: false }, "redo to the saved baseline must become clean again");
await suspend();

await mount("b");
const isolatedB = await page.evaluate(() => ({
  titleBeforeUndo: window.appState.activeMarkdownEditor.getDocumentTitle(),
  undoHandled: window.appState.activeMarkdownEditor.undo(),
  aDraft: window.__tabs.get("a").draft
}));
assert.equal(isolatedB.titleBeforeUndo, "B1 unsaved");
assert.equal(isolatedB.undoHandled, true, "tab B must retain its own history");
assert.match(isolatedB.aDraft, /^# A1 saved/m, "undo in tab B must not mutate tab A");
await suspend();

await page.evaluate(() => window.__destroyMarkdownEditorSession("a"));
const afterClose = await page.evaluate(() => ({
  hasSession: window.appState.markdownEditorSessions.has("a"),
  oldRootConnected: window.__aOriginalPm.isConnected
}));
assert.deepEqual(afterClose, { hasSession: false, oldRootConnected: false }, "closing tab A must destroy its live session");

await mount("a");
const reopenedA = await page.evaluate(() => ({
  samePm: document.querySelector(".ProseMirror") === window.__aOriginalPm,
  title: window.appState.activeMarkdownEditor.getDocumentTitle(),
  undoHandled: window.appState.activeMarkdownEditor.undo()
}));
assert.equal(reopenedA.samePm, false, "reopening a closed tab must create a new editor instance");
assert.equal(reopenedA.title, "A1 saved");
assert.equal(reopenedA.undoHandled, false, "reopened tab history must start empty");

await browser.close();
console.log("markdown tab session history test passed.");
