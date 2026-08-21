// B3 P0：未提交标题在退出/关闭时丢失。
//
// 标题 textarea 聚焦且尚未 blur/Enter 时，PM 仍是旧标题、dirty=false，
// 旧实现 confirmMarkdownAppExitIfNeeded 只 capture ProseMirror draft，导致
// 应用无提示退出、未保存的标题丢失。本测试从 dist/index.html 提取真实
// convergePendingMarkdownTitle / confirmMarkdownAppExitIfNeeded 及依赖链，
// 用真实 bundle 编辑器验证：
//   A. 标题框聚焦、只修改标题不 blur → 请求 app exit → 收敛后 dirty=true
//      → 出现三选一确认（save/discard/continue 三路都验证）；
//   B. save → 持久化（保存内容含新标题）；
//   C. discard → 不持久化（saveMarkdownTab 不被调用）；
//   D. continue → 阻止退出、标题输入框保留输入；
//   E. composition 中请求 exit → 阻止退出并给出可理解状态（无确认弹窗）。
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

const AUTOSIZE_FN = grab(/function autosizeMarkdownTitleInput\(input\) \{[\s\S]*?\n      \}/, "autosizeMarkdownTitleInput");
const SESSION_FN = grab(/function markdownTitleInputSession\(input\) \{[\s\S]*?\n      \}/, "markdownTitleInputSession");
const SETVAL_FN = grab(/function setTitleInputValue\(input, value\) \{[\s\S]*?\n      \}/, "setTitleInputValue");
const SETUP_FN = grab(/function setupMarkdownTitleInput\(tab\) \{[\s\S]*?\n      \}/, "setupMarkdownTitleInput");
const CURRENT_TITLE_FN = grab(/function currentMarkdownDisplayTitle\(tab\) \{[\s\S]*?\n      \}/, "currentMarkdownDisplayTitle");
const COMMIT_FN = grab(/function commitMarkdownDocumentTitle\(tab, input\) \{[\s\S]*?\n      \}/, "commitMarkdownDocumentTitle");
const CONVERGE_FN = grab(/function convergePendingMarkdownTitle\(tab\) \{[\s\S]*?\n      \}/, "convergePendingMarkdownTitle");
const CAPTURE_FN = grab(/function captureActiveMarkdownDraft\(\) \{[\s\S]*?\n      \}/, "captureActiveMarkdownDraft");
const DIRTY_FN = grab(/function isMarkdownTabDirty\(tab\) \{[\s\S]*?\n      \}/, "isMarkdownTabDirty");
const CONTENT_FOR_TAB_FN = grab(/function markdownContentForTab\(tab\) \{[\s\S]*?\n      \}/, "markdownContentForTab");
const CURRENT_CONTENT_FN = grab(/function currentMarkdownContent\(tab\) \{[\s\S]*?\n      \}/, "currentMarkdownContent");
const SOURCE_VALUE_FN = grab(/function sourceEditorValue\(tab\) \{[\s\S]*?\n      \}/, "sourceEditorValue");
const CONFIRM_EXIT_FN = grab(/async function confirmMarkdownAppExitIfNeeded\(\) \{[\s\S]*?\n      \}/, "confirmMarkdownAppExitIfNeeded");

const MARKDOWN = `# 原标题\n\n正文内容，用于退出收敛验收。\n`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(
  `<textarea id="markdownTitleInput" rows="1">原标题</textarea><div id="editor" class="milkdown-editor-root"></div>`
);
await page.addScriptTag({ content: BUNDLE, type: "module" });
await page.waitForFunction(() => Boolean(window.NutbookMarkdownEditor?.create));

const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error.stack || error.message)));

// 注入真实函数 + 宿主 stub
await page.evaluate((fns) => {
  window.appState = {
    activeMarkdownEditor: null,
    activeMarkdownEditorTabId: "tab-1",
    activeTabId: "tab-1",
    markdownTitleInputComposing: false,
    items: []
  };
  // 宿主 tab 对象
  const markdown = fns.markdown;
  window.tab = {
    id: "tab-1",
    preview: { fileType: "markdown", title: "原标题", raw: markdown },
    item: { fileName: "doc.md" },
    draft: markdown,
    markdownBaseline: markdown,
    isDirty: false
  };
  window.getOpenTab = (id) => (String(id) === "tab-1" ? window.tab : null);
  window.getOpenTabs = () => [window.tab];
  window.isOpenTabSourceMissing = async () => false;
  window.__saveCalls = [];
  window.saveMarkdownTab = async (tab, opts) => {
    window.__saveCalls.push({ content: tab.draft, renderAfter: opts?.renderAfter });
    return true;
  };
  window.__closeChoices = [];
  window.confirmMarkdownUnsavedClose = async (fileName) => {
    window.__closeChoices.push(fileName);
    return window.__nextCloseChoice || "continue";
  };
  window.setStatus = () => {};
  window.updateMarkdownStatusHint = () => {};
  window.markdownDocumentTitle = (md, fb) => {
    const m = String(md || "").match(/^#\s+(.+)/m);
    return m ? m[1].trim() : fb;
  };
  window.setMarkdownDocumentTitle = (md, title) => {
    const raw = String(md || "");
    const lines = raw.split(/\r?\n/);
    const idx = lines.findIndex((l) => /^#\s+/.test(l.trimStart()));
    if (idx >= 0) lines[idx] = `# ${String(title || "").trim()}`;
    else lines.unshift(`# ${String(title || "").trim()}`, "");
    return lines.join("\n");
  };
  // 真实函数定义（词法依赖 titleInputEditSessions 需同作用域）
  const titleInputEditSessions = new WeakMap();
  for (const src of fns.list) eval(src);
  window.autosizeMarkdownTitleInput = autosizeMarkdownTitleInput;
  window.markdownTitleInputSession = markdownTitleInputSession;
  window.setTitleInputValue = setTitleInputValue;
  window.setupMarkdownTitleInput = setupMarkdownTitleInput;
  window.currentMarkdownDisplayTitle = currentMarkdownDisplayTitle;
  window.commitMarkdownDocumentTitle = commitMarkdownDocumentTitle;
  window.convergePendingMarkdownTitle = convergePendingMarkdownTitle;
  window.captureActiveMarkdownDraft = captureActiveMarkdownDraft;
  window.isMarkdownTabDirty = isMarkdownTabDirty;
  window.markdownContentForTab = markdownContentForTab;
  window.currentMarkdownContent = currentMarkdownContent;
  window.sourceEditorValue = sourceEditorValue;
  window.__confirmMarkdownAppExitIfNeeded = confirmMarkdownAppExitIfNeeded;
  // 用真实 setup 初始化标题输入框
  window.setupMarkdownTitleInput(window.tab);
}, {
  list: [
    AUTOSIZE_FN, SESSION_FN, SETVAL_FN, SETUP_FN, CURRENT_TITLE_FN, COMMIT_FN,
    CONVERGE_FN, CAPTURE_FN, DIRTY_FN, CONTENT_FOR_TAB_FN, CURRENT_CONTENT_FN,
    SOURCE_VALUE_FN, CONFIRM_EXIT_FN
  ],
  markdown: MARKDOWN
});
await page.waitForFunction(() => typeof window.__confirmMarkdownAppExitIfNeeded === "function");

// 创建真实编辑器
await page.evaluate(async (markdown) => {
  const root = document.getElementById("editor");
  window.__ed = await window.NutbookMarkdownEditor.create({ root, markdown });
  window.appState.activeMarkdownEditor = window.__ed;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}, MARKDOWN);

const titleValue = () => page.evaluate(() => document.getElementById("markdownTitleInput").value);
const pmTitle = () => page.evaluate(() => window.__ed.getDocumentTitle());
const dirty = () => page.evaluate(() => window.isMarkdownTabDirty(window.tab));
const draftHasNewTitle = () => page.evaluate(() => window.tab.draft.includes("# 退出前新标题"));

// ============================================================
// 场景 A：标题框聚焦 + 只修改标题不 blur → 收敛后 dirty=true
// ============================================================
await page.evaluate(() => {
  const input = document.getElementById("markdownTitleInput");
  input.focus();
  window.setTitleInputValue(input, "退出前新标题"); // 用户输入，未 blur
});
assert.equal(await pmTitle(), "原标题", "A0: PM title is still the old one before convergence");
assert.equal(await dirty(), false, "A1: dirty=false before convergence (title not committed)");
const convergeResult = await page.evaluate(() => window.convergePendingMarkdownTitle(window.tab));
assert.equal(convergeResult, true, "A2: converge must succeed (not composing)");
assert.equal(await pmTitle(), "退出前新标题", "A3: PM title committed after convergence");
assert.ok(await draftHasNewTitle(), "A4: tab.draft contains the new title after convergence");
assert.equal(await dirty(), true, "A5: dirty=true after convergence");
assert.equal(await titleValue(), "退出前新标题", "A6: title input keeps the new title");
console.log("场景A 通过：标题框聚焦未 blur → 收敛提交标题、dirty=true，退出确认可触发");

// ============================================================
// 场景 B：三选一确认 → save → 持久化
// ============================================================
await page.evaluate(() => {
  window.__saveCalls.length = 0;
  window.__closeChoices.length = 0;
  window.__nextCloseChoice = "save";
});
const saveExit = await page.evaluate(() => window.__confirmMarkdownAppExitIfNeeded());
assert.equal(saveExit, true, "B1: exit allowed after save");
assert.equal(await page.evaluate(() => window.__closeChoices.length), 1, "B2: unsaved-close confirm shown once");
assert.equal(await page.evaluate(() => window.__saveCalls.length), 1, "B3: saveMarkdownTab called once");
assert.ok(
  await page.evaluate(() => window.__saveCalls[0].content.includes("# 退出前新标题")),
  "B4: saved content contains the new title"
);
console.log("场景B 通过：三选一选 save → 持久化新标题");

// ============================================================
// 场景 C：discard → 不持久化
// ============================================================
await page.evaluate(() => {
  window.__saveCalls.length = 0;
  window.__closeChoices.length = 0;
  window.__nextCloseChoice = "discard";
});
const discardExit = await page.evaluate(() => window.__confirmMarkdownAppExitIfNeeded());
assert.equal(discardExit, true, "C1: exit allowed after discard");
assert.equal(await page.evaluate(() => window.__saveCalls.length), 0, "C2: saveMarkdownTab NOT called on discard");
console.log("场景C 通过：三选一选 discard → 不持久化");

// ============================================================
// 场景 D：continue → 阻止退出、标题输入框保留输入
// ============================================================
await page.evaluate(() => {
  const input = document.getElementById("markdownTitleInput");
  input.focus();
  window.setTitleInputValue(input, "继续编辑标题");
  window.__closeChoices.length = 0;
  window.__nextCloseChoice = "continue";
});
const continueExit = await page.evaluate(() => window.__confirmMarkdownAppExitIfNeeded());
assert.equal(continueExit, false, "D1: exit blocked on continue");
assert.equal(await titleValue(), "继续编辑标题", "D2: title input keeps the typed value after continue");
console.log("场景D 通过：三选一选 continue → 阻止退出、输入保留");

// ============================================================
// 场景 E：composition 中请求 exit → 阻止退出、无确认弹窗、可理解状态
// ============================================================
await page.evaluate(() => {
  const input = document.getElementById("markdownTitleInput");
  window.setTitleInputValue(input, "原标题");
  input.focus();
  input.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
  input.value = "拼音候选";
  input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertCompositionText" }));
  window.__closeChoices.length = 0;
  window.__statusMessages = [];
  window.setStatus = (msg, kind) => window.__statusMessages.push({ msg, kind });
});
const composingExit = await page.evaluate(() => window.__confirmMarkdownAppExitIfNeeded());
assert.equal(composingExit, false, "E1: exit must be blocked while composing");
assert.equal(await page.evaluate(() => window.__closeChoices.length), 0, "E2: no unsaved-close confirm while composing");
const statusMsg = await page.evaluate(() => window.__statusMessages[0]?.msg || "");
assert.match(statusMsg, /输入法组合中/, "E3: understandable status message while composing");
console.log("场景E 通过：composition 中请求退出 → 阻止退出、无确认弹窗、给出可理解状态");

assert.deepEqual(pageErrors, [], `pageerror must be 0: ${pageErrors.join("\n")}`);
await browser.close();
console.log("markdown exit title convergence tests passed.");
