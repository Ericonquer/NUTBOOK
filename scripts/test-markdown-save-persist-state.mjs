// B3 P1：renderAfter=false 的持久状态收敛。
//
// durable save 后无论 renderAfter true/false 都必须使首页持久 item 状态收敛
// （loadItems 至少一次）；loadItems 最多一次；renderAfter=false 不得重建当前
// Milkdown editor（不调 renderViewer，不销毁编辑器）。
// 行为场景：
//   A. 两个标签中保存并关闭一个 Markdown，另一个标签仍打开 → loadItems 调用
//      一次、appState.items 更新为新标题；
//   B. 回主页卡片标题已经是新标题（等价：items 列表项标题已更新）；
//   C. 关闭全部标签并选择保存（confirm 循环 → saveMarkdownTab(renderAfter:false)
//      每个 tab 一次）→ 主页 items 同样显示新标题；
//   D. 未保存 draft（放弃）、保存冲突、取消均不更新主页标题。
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import assert from "node:assert";

const INDEX_HTML = readFileSync("dist/index.html", "utf8");
const BUNDLE = readFileSync("dist/assets/markdown-editor.js", "utf8");

const grab = (pattern, name) => {
  const m = INDEX_HTML.match(pattern);
  assert.ok(m, `${name} must exist in dist/index.html`);
  return m[0];
};

const SAVE_TAB_FN = grab(/async function saveMarkdownTab\(tab, \{ renderAfter = true \} = \{\}\) \{[\s\S]*?\n      \}/, "saveMarkdownTab");
const AUTOSIZE_FN = grab(/function autosizeMarkdownTitleInput\(input\) \{[\s\S]*?\n      \}/, "autosizeMarkdownTitleInput");
const SESSION_FN = grab(/function markdownTitleInputSession\(input\) \{[\s\S]*?\n      \}/, "markdownTitleInputSession");
const SETVAL_FN = grab(/function setTitleInputValue\(input, value\) \{[\s\S]*?\n      \}/, "setTitleInputValue");
const CURRENT_CONTENT_FN = grab(/function currentMarkdownContent\(tab\) \{[\s\S]*?\n      \}/, "currentMarkdownContent");
const SOURCE_VALUE_FN = grab(/function sourceEditorValue\(tab\) \{[\s\S]*?\n      \}/, "sourceEditorValue");
const CONTENT_FOR_TAB_FN = grab(/function markdownContentForTab\(tab\) \{[\s\S]*?\n      \}/, "markdownContentForTab");
const CAPTURE_FN = grab(/function captureActiveMarkdownDraft\(\) \{[\s\S]*?\n      \}/, "captureActiveMarkdownDraft");
const DIRTY_FN = grab(/function isMarkdownTabDirty\(tab\) \{[\s\S]*?\n      \}/, "isMarkdownTabDirty");
const CURRENT_TITLE_FN = grab(/function currentMarkdownDisplayTitle\(tab\) \{[\s\S]*?\n      \}/, "currentMarkdownDisplayTitle");
const COMMIT_FN = grab(/function commitMarkdownDocumentTitle\(tab, input\) \{[\s\S]*?\n      \}/, "commitMarkdownDocumentTitle");
const CONVERGE_FN = grab(/function convergePendingMarkdownTitle\(tab\) \{[\s\S]*?\n      \}/, "convergePendingMarkdownTitle");
const CONFIRM_EXIT_FN = grab(/async function confirmMarkdownAppExitIfNeeded\(\) \{[\s\S]*?\n      \}/, "confirmMarkdownAppExitIfNeeded");

const MD1 = `# 标题一\n\n正文一。\n`;
const MD2 = `# 标题二\n\n正文二。\n`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(
  `<textarea id="markdownTitleInput" rows="1"></textarea><div id="editor" class="milkdown-editor-root"></div>`
);
await page.addScriptTag({ content: BUNDLE, type: "module" });
await page.waitForFunction(() => Boolean(window.NutbookMarkdownEditor?.create));

const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error.stack || error.message)));

await page.evaluate((fns) => {
  window.appState = {
    activeMarkdownEditor: null,
    activeMarkdownEditorTabId: null,
    activeTabId: null,
    markdownTitleInputComposing: false,
    items: []
  };
  window.els = { viewerBody: null };
  window.getActiveTab = () => window.appState.tabs.find((t) => t.id === window.appState.activeTabId) || null;
  window.getOpenTab = (id) => window.appState.tabs.find((t) => t.id === Number(id)) || null;
  window.getOpenTabs = () => window.appState.tabs.slice();
  window.isOpenTabSourceMissing = async () => false;
  window.sha256Hex = async () => "hash";
  window.normalizeItemDetail = (d) => d;
  window.normalizePreview = (p) => p;
  window.normalizeItemSummary = (s) => s?.summary || s || null;
  window.markdownSavedStatus = () => "已保存";
  window.markdownSaveErrorStatus = () => "保存失败";
  window.markdownSaveConflict = () => false;
  window.t = (key) => key;
  window.setStatus = () => {};
  window.showToast = () => {};
  window.renderTabs = () => {};
  window.formatTimestamp = () => "2026/08/21 12:00";
  window.markdownDocumentTitle = (md, fb) => {
    const m = String(md || "").match(/^#\s+(.+)/m);
    return m ? m[1].trim() : fb;
  };
  window.normalizeError = (e) => String(e && e.message || e);
  window.__loadItemsCalls = 0;
  window.loadItems = async () => {
    window.__loadItemsCalls += 1;
    // 模拟后端持久化后的最新列表：标题来自保存后状态（__newTitle）。
    window.appState.items = window.appState.tabs.map((t) => ({
      id: t.id,
      fileName: t.item.fileName,
      title: t.__newTitle || t.item.fileName
    }));
  };
  window.__invokeCalls = [];
  window.invoke = async (cmd, payload) => {
    window.__invokeCalls.push(cmd);
    if (cmd === "save_markdown_content") {
      if (window.__saveConflict) {
        const err = new Error("conflict: 文件已被修改");
        err.code = "MARKDOWN_SAVE_CONFLICT";
        throw err;
      }
      return { ok: true };
    }
    if (cmd === "get_item_detail") {
      const tab = window.appState.tabs.find((t) => t.id === payload.itemId);
      return {
        fileHash: "h-" + tab.id,
        modifiedAt: "2026-08-21T13:00:00",
        summary: { fileName: tab.item.fileName, modifiedAt: "2026-08-21T13:00:00" }
      };
    }
    if (cmd === "get_item_preview") {
      const tab = window.appState.tabs.find((t) => t.id === payload.itemId);
      const title = tab.__newTitle || tab.item.fileName;
      return {
        fileType: "markdown",
        html: `<h1>${title}</h1>`,
        title,
        raw: `# ${title}\n\n正文。\n`
      };
    }
    return null;
  };
  // 关闭确认：save / discard / continue 由测试控制
  window.__closeChoices = [];
  window.confirmMarkdownUnsavedClose = async (fileName) => {
    window.__closeChoices.push(fileName);
    return window.__nextCloseChoice || "continue";
  };
  // 真实函数定义
  const titleInputEditSessions = new WeakMap();
  for (const src of fns.list) eval(src);
  window.autosizeMarkdownTitleInput = autosizeMarkdownTitleInput;
  window.markdownTitleInputSession = markdownTitleInputSession;
  window.setTitleInputValue = setTitleInputValue;
  window.currentMarkdownContent = currentMarkdownContent;
  window.sourceEditorValue = sourceEditorValue;
  window.markdownContentForTab = markdownContentForTab;
  window.captureActiveMarkdownDraft = captureActiveMarkdownDraft;
  window.isMarkdownTabDirty = isMarkdownTabDirty;
  window.currentMarkdownDisplayTitle = currentMarkdownDisplayTitle;
  window.commitMarkdownDocumentTitle = commitMarkdownDocumentTitle;
  window.convergePendingMarkdownTitle = convergePendingMarkdownTitle;
  window.__saveMarkdownTab = saveMarkdownTab;
  window.__confirmMarkdownAppExitIfNeeded = confirmMarkdownAppExitIfNeeded;
  window.updateMarkdownStatusHint = () => {};
}, {
  list: [
    SAVE_TAB_FN, AUTOSIZE_FN, SESSION_FN, SETVAL_FN, CURRENT_CONTENT_FN,
    SOURCE_VALUE_FN, CONTENT_FOR_TAB_FN, CAPTURE_FN, DIRTY_FN, CURRENT_TITLE_FN,
    COMMIT_FN, CONVERGE_FN, CONFIRM_EXIT_FN
  ]
});
await page.waitForFunction(() => typeof window.__saveMarkdownTab === "function");

// 辅助：构造两个 tab（tab2 保持打开；tab1 保存并关闭）
const setupTabs = () => page.evaluate(({ md1, md2 }) => {
  const makeTab = (id, fileName, md, newTitle) => ({
    id,
    preview: { fileType: "markdown", title: newTitle, raw: md },
    item: { fileName, modifiedAt: "2026-08-21T12:00:00" },
    detail: { fileHash: "old-" + id, modifiedAt: "2026-08-21T12:00:00" },
    draft: md,
    markdownBaseline: md,
    isDirty: false,
    __newTitle: newTitle
  });
  window.appState.tabs = [
    makeTab(1, "doc-one.md", md1, "新标题一"),
    makeTab(2, "doc-two.md", md2, "标题二")
  ];
  window.appState.activeTabId = 1;
  window.appState.activeMarkdownEditorTabId = null;
  window.appState.items = [
    { id: 1, fileName: "doc-one.md", title: "标题一" },
    { id: 2, fileName: "doc-two.md", title: "标题二" }
  ];
  window.__nextItems = window.appState.items.slice();
  window.__loadItemsCalls = 0;
  window.__saveConflict = false;
}, { md1: MD1, md2: MD2 });

// ============================================================
// 场景 A + B：保存 tab1（renderAfter=false，模拟保存并关闭），tab2 仍打开；
// loadItems 一次、items 中 tab1 标题已更新为新标题（回主页卡片即新标题）。
// ============================================================
await setupTabs();
await page.evaluate(() => window.__saveMarkdownTab(window.appState.tabs[0], { renderAfter: false }));
assert.equal(await page.evaluate(() => window.__loadItemsCalls), 1, "A1: loadItems called exactly once (renderAfter=false)");
const itemsA = await page.evaluate(() => window.appState.items);
assert.equal(itemsA.find((i) => i.id === 1).title, "新标题一", "A2/B1: home card title for tab1 is the new title");
assert.equal(itemsA.find((i) => i.id === 2).title, "标题二", "A3: tab2 (still open) unaffected");
assert.equal(await page.evaluate(() => window.appState.tabs[0].isDirty), false, "A4: tab1 not dirty after save");
console.log("场景A/B 通过：renderAfter=false 保存 → loadItems 一次、主页 items 标题已收敛为新标题");

// ============================================================
// 场景 C：关闭全部标签并选择保存（confirm 循环 → 每个 dirty tab
// saveMarkdownTab(renderAfter:false) 一次），主页 items 显示新标题。
// ============================================================
await setupTabs();
await page.evaluate(() => {
  // 两个 tab 都有未保存标题修改（draft 与新标题一致，isDirty 置 true）
  window.appState.tabs[0].draft = "# 新标题一\n\n正文一。\n";
  window.appState.tabs[0].isDirty = true;
  window.appState.tabs[1].draft = "# 新标题二\n\n正文二。\n";
  window.appState.tabs[1].isDirty = true;
  window.appState.tabs[1].__newTitle = "新标题二";
  window.__nextItems = window.appState.items.slice();
  window.__closeChoices.length = 0;
  window.__nextCloseChoice = "save";
});
const confirmResult = await page.evaluate(() => window.__confirmMarkdownAppExitIfNeeded());
assert.equal(confirmResult, true, "C1: exit allowed after saving all");
assert.equal(await page.evaluate(() => window.__closeChoices.length), 2, "C2: two unsaved-close confirms (both dirty)");
assert.equal(await page.evaluate(() => window.__loadItemsCalls), 2, "C3: loadItems once per durable save (2 tabs)");
const itemsC = await page.evaluate(() => window.appState.items);
assert.equal(itemsC.find((i) => i.id === 1).title, "新标题一", "C4: home shows new title for tab1");
assert.equal(itemsC.find((i) => i.id === 2).title, "新标题二", "C5: home shows new title for tab2");
console.log("场景C 通过：关闭全部选保存 → 每个 tab save(renderAfter:false) 一次、主页 items 全为新标题");

// ============================================================
// 场景 D：放弃 / 冲突 / 取消均不更新主页标题
// ============================================================
// D-1 放弃（discard）：confirm 返回 discard → 不保存 → items 不变
await setupTabs();
await page.evaluate(() => {
  window.appState.tabs[0].draft = "# 新标题一\n\n正文一。\n";
  window.appState.tabs[0].isDirty = true;
  window.__closeChoices.length = 0;
  window.__nextCloseChoice = "discard";
});
const discardResult = await page.evaluate(() => window.__confirmMarkdownAppExitIfNeeded());
assert.equal(discardResult, true, "D1-1: exit allowed after discard");
assert.equal(await page.evaluate(() => window.__closeChoices.length), 1, "D1-2: one confirm shown");
const itemsD1 = await page.evaluate(() => window.appState.items);
assert.equal(itemsD1.find((i) => i.id === 1).title, "标题一", "D1-3: home title NOT updated after discard");

// D-2 冲突：save_markdown_content 抛冲突 → saveMarkdownTab 返回 false → loadItems 不被调用
await setupTabs();
await page.evaluate(() => {
  window.appState.tabs[0].draft = "# 新标题一\n\n正文一。\n";
  window.appState.tabs[0].isDirty = true;
  window.__saveConflict = true;
  window.__loadItemsCalls = 0;
});
const conflictSaved = await page.evaluate(() => window.__saveMarkdownTab(window.appState.tabs[0], { renderAfter: false }));
assert.equal(conflictSaved, false, "D2-1: save returns false on conflict");
assert.equal(await page.evaluate(() => window.__loadItemsCalls), 0, "D2-2: loadItems NOT called on failed save");
const itemsD2 = await page.evaluate(() => window.appState.items);
assert.equal(itemsD2.find((i) => i.id === 1).title, "标题一", "D2-3: home title NOT updated on conflict");

// D-3 取消（continue）：confirm 返回 continue → 阻止退出、不保存、items 不变
await setupTabs();
await page.evaluate(() => {
  window.appState.tabs[0].draft = "# 新标题一\n\n正文一。\n";
  window.appState.tabs[0].isDirty = true;
  window.__closeChoices.length = 0;
  window.__nextCloseChoice = "continue";
});
const continueResult = await page.evaluate(() => window.__confirmMarkdownAppExitIfNeeded());
assert.equal(continueResult, false, "D3-1: exit blocked on continue");
const itemsD3 = await page.evaluate(() => window.appState.items);
assert.equal(itemsD3.find((i) => i.id === 1).title, "标题一", "D3-2: home title NOT updated on cancel");
console.log("场景D 通过：放弃/冲突/取消均不更新主页标题");

assert.deepEqual(pageErrors, [], `pageerror must be 0: ${pageErrors.join("\n")}`);
await browser.close();
console.log("markdown save persist-state tests passed.");
