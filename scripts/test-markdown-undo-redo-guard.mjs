// B3 复审 P1：标题输入框与 ProseMirror 的 undo 路由重新划分。
//
// 固定语义：
// 1. 焦点在标题输入框且标题尚未提交（未 Enter/blur）：undo/redo 只作用于
//    输入框自身的原生文本 history，不触碰 ProseMirror。
// 2. 标题提交后（Enter/blur → setDocumentTitle 一次 PM transaction，焦点回到
//    编辑器）：一次 ⌘Z 直接撤销该 transaction，一次 ⇧⌘Z 恢复。
// 3. 焦点在 ProseMirror：只使用 PM history；PM 栈空时绝不回退
//    document.execCommand（WKWebView contenteditable 原生栈污染 PM state，
//    导致重复 H1）。
// 4. 其他普通 input/textarea：保持原生表单 undo。
// 5. 无 H1 文档 undo 删除插入的 H1 后，标题输入框立即恢复文件名 fallback。
//
// 从 dist/index.html 提取真实 handleNativeEditHistory 函数 + 真实 bundle
// 编辑器 + execCommand spy 做行为级验证。
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import assert from "node:assert";

const INDEX_HTML = readFileSync("dist/index.html", "utf8");
const BUNDLE = readFileSync("dist/assets/markdown-editor.js", "utf8");

// 提取真实函数（自维护标题输入 history + handleNativeEditHistory）
const fnMatch = INDEX_HTML.match(/async function handleNativeEditHistory\(action\) \{[\s\S]*?\n      \}/);
const sessionMatch = INDEX_HTML.match(/function markdownTitleInputSession\(input\) \{[\s\S]*?\n      \}/);
const setTitleValueMatch = INDEX_HTML.match(/function setTitleInputValue\(input, value\) \{[\s\S]*?\n      \}/);
const undoTitleMatch = INDEX_HTML.match(/function undoMarkdownTitleInput\(\) \{[\s\S]*?\n      \}/);
const redoTitleMatch = INDEX_HTML.match(/function redoMarkdownTitleInput\(\) \{[\s\S]*?\n      \}/);
const autosizeMatch = INDEX_HTML.match(/function autosizeMarkdownTitleInput\(input\) \{[\s\S]*?\n      \}/);
const setupTitleMatch = INDEX_HTML.match(/function setupMarkdownTitleInput\(tab\) \{[\s\S]*?\n      \}/);
assert.ok(
  fnMatch && sessionMatch && setTitleValueMatch && undoTitleMatch && redoTitleMatch && autosizeMatch && setupTitleMatch,
  "all title history functions must exist in dist/index.html"
);
const FN_SOURCE = fnMatch[0];

const MARKDOWN = `# 普通 H1 文档\n\n这是一份带普通一级标题的 Markdown 验收语料。\n\n## 背景\n\n正文内容。\n`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(
  `<textarea id="markdownTitleInput" rows="1">普通 H1 文档</textarea><div id="editor" class="milkdown-editor-root"></div>`
);
await page.addScriptTag({ content: BUNDLE, type: "module" });
await page.waitForFunction(() => Boolean(window.NutbookMarkdownEditor?.create));

// 宿主依赖 stub + execCommand spy + 真实函数注入
await page.evaluate(({ fnSource, sessionSrc, setValSrc, undoSrc, redoSrc, autosizeSrc, setupSrc }) => {
  window.appState = { htmlEditSession: null, activeMarkdownEditor: null, markdownTitleInputComposing: false };
  window.getActiveTab = () => ({ id: "tab-1", preview: { fileType: "markdown" }, item: { fileName: "doc.md" } });
  window.invoke = async () => false;
  window.currentMarkdownDisplayTitle = () => "显示标题";
  window.commitMarkdownDocumentTitle = () => {};
  window.markdownContentForTab = () => "";
  window.updateMarkdownStatusHint = () => {};
  window.__execCalls = [];
  const originalExec = document.execCommand.bind(document);
  document.execCommand = (...args) => {
    window.__execCalls.push(args[0]);
    return originalExec(...args);
  };
  // 定义真实函数（函数声明 eval 后显式挂到 window，供后续独立 evaluate 调用）
  const titleInputEditSessions = new WeakMap();
  eval(autosizeSrc);
  window.autosizeMarkdownTitleInput = autosizeMarkdownTitleInput;
  eval(sessionSrc);
  window.markdownTitleInputSession = markdownTitleInputSession;
  eval(setValSrc);
  window.setTitleInputValue = setTitleInputValue;
  eval(undoSrc);
  window.undoMarkdownTitleInput = undoMarkdownTitleInput;
  eval(redoSrc);
  window.redoMarkdownTitleInput = redoMarkdownTitleInput;
  eval(setupSrc);
  window.setupMarkdownTitleInput = setupMarkdownTitleInput;
  eval(`${fnSource}\nwindow.__handleNativeEditHistory = handleNativeEditHistory;`);
  // 用真实 setupMarkdownTitleInput 初始化标题输入框（挂 input 快照监听）
  window.__setupTitleInput = (tab) => setupMarkdownTitleInput(tab);
  window.__setupTitleInput({ id: "tab-1", preview: { fileType: "markdown" }, item: { fileName: "doc.md" } });
}, {
  fnSource: FN_SOURCE,
  sessionSrc: sessionMatch[0],
  setValSrc: setTitleValueMatch[0],
  undoSrc: undoTitleMatch[0],
  redoSrc: redoTitleMatch[0],
  autosizeSrc: autosizeMatch[0],
  setupSrc: setupTitleMatch[0]
});
await page.waitForFunction(() => typeof window.__handleNativeEditHistory === "function");

const h1Count = () => page.evaluate(() => {
  const md = window.__ed.getMarkdown();
  return md.split(/\r?\n/).filter((l) => /^#\s+/.test(l.trimStart())).length;
});
const execCalls = () => page.evaluate(() => window.__execCalls.slice());
const titleValue = () => page.evaluate(() => document.getElementById("markdownTitleInput").value);

// 创建真实编辑器，并挂到宿主 appState（模拟 markdown tab 激活）
await page.evaluate(async (markdown) => {
  const root = document.getElementById("editor");
  window.__ed = await window.NutbookMarkdownEditor.create({ root, markdown });
  window.appState.activeMarkdownEditor = window.__ed;
  window.appState.activeMarkdownEditorTabId = "tab-1";
  window.getActiveTab = () => ({ id: "tab-1", preview: { fileType: "markdown" }, item: { fileName: "doc.md" } });
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}, MARKDOWN);

// ============================================================
// 场景 A（保留）：PM redo 栈空 + 焦点在 ProseMirror → 不 execCommand
// ============================================================
await page.evaluate(() => {
  window.__ed.setDocumentTitle("新标题"); // 标题事务入 PM history
  window.__execCalls.length = 0;
});
await page.evaluate(() => document.querySelector("#editor .ProseMirror").focus());
assert.equal(await h1Count(), 1, "A0: one H1 after setDocumentTitle");
const aResult = await page.evaluate(() => window.__handleNativeEditHistory("redo"));
assert.equal(aResult, false, "A1: redo with empty PM stack must return false");
assert.deepEqual(await execCalls(), [], "A2: execCommand must NOT be called while focus is in ProseMirror");
assert.equal(await h1Count(), 1, "A3: H1 count must stay 1");
console.log("场景A 通过：PM redo 空 + ProseMirror 焦点 → 不 execCommand，H1 恒为 1");

// ============================================================
// 场景 B（审查 A 路径）：标题框聚焦 + 真实输入 + ⌘Z 只撤销输入框字符，
// PM 文档和 H1 完全不变。
// ============================================================
await page.evaluate(() => {
  window.__ed.setDocumentTitle("H1 基值"); // 重置 PM 标题
  window.__execCalls.length = 0;
});
await page.focus("#markdownTitleInput");
await page.evaluate(() => { setTitleInputValue(document.getElementById("markdownTitleInput"), ""); });
await page.keyboard.type("未提交的标题输入");
await page.waitForTimeout(50);
const typedValue = await titleValue();
assert.equal(typedValue, "未提交的标题输入", "B0: 输入框应包含刚键入的字符");
const pmTitleBefore = await page.evaluate(() => window.__ed.getDocumentTitle());
const pmMdBefore = await page.evaluate(() => window.__ed.getMarkdown());
const bResult = await page.evaluate(() => window.__handleNativeEditHistory("undo"));
assert.equal(bResult, true, "B1: undo on uncommitted input must be handled by the title input history");
assert.deepEqual(await execCalls(), [], "B2: execCommand must NOT be called for uncommitted title input (self-managed history)");
assert.equal(await titleValue(), "未提交的标题输", "B3: undo must remove the last typed char from the input");
assert.equal(await page.evaluate(() => window.__ed.getDocumentTitle()), pmTitleBefore, "B4: PM doc title must NOT change");
assert.equal(await page.evaluate(() => window.__ed.getMarkdown()), pmMdBefore, "B5: PM markdown must NOT change");
assert.equal(await h1Count(), 1, "B6: H1 count unchanged");
console.log("场景B 通过：未提交输入时 ⌘Z 只撤销标题框字符，PM 文档与 H1 不变");

// ============================================================
// 场景 B2（用户反馈回归）：间隔输入 a b c 后 ⌘Z 逐字符回退（WKWebView
// 原生 undo 会把整个输入会话合并成一个单元，一次删光三个字母；自维护
// 快照栈按每次 input 事件为一个撤销步骤，⌘Z 一次只删一个字符）。
// ============================================================
await page.focus("#markdownTitleInput");
await page.evaluate(() => { setTitleInputValue(document.getElementById("markdownTitleInput"), ""); });
const pmTitleB2 = await page.evaluate(() => window.__ed.getDocumentTitle());
await page.keyboard.type("a");
await page.waitForTimeout(80);
await page.keyboard.type("b");
await page.waitForTimeout(80);
await page.keyboard.type("c");
await page.waitForTimeout(80);
assert.equal(await titleValue(), "abc", "B2-0: value must be abc after three spaced keystrokes");
await page.evaluate(() => window.__handleNativeEditHistory("undo"));
assert.equal(await titleValue(), "ab", "B2-1: first ⌘Z removes only the last char c");
await page.evaluate(() => window.__handleNativeEditHistory("undo"));
assert.equal(await titleValue(), "a", "B2-2: second ⌘Z removes b");
await page.evaluate(() => window.__handleNativeEditHistory("undo"));
assert.equal(await titleValue(), "", "B2-3: third ⌘Z removes a");
await page.evaluate(() => window.__handleNativeEditHistory("redo"));
assert.equal(await titleValue(), "a", "B2-4: ⇧⌘Z restores a");
await page.evaluate(() => window.__handleNativeEditHistory("redo"));
assert.equal(await titleValue(), "ab", "B2-5: ⇧⌘Z restores ab");
assert.equal(await page.evaluate(() => window.__ed.getDocumentTitle()), pmTitleB2, "B2-6: PM doc title unchanged");
assert.equal(await h1Count(), 1, "B2-7: H1 count unchanged");
console.log("场景B2 通过：间隔输入 abc 后 ⌘Z 逐字符回退（ab→a→空），⇧⌘Z 逐字符恢复，PM 不变");

// ============================================================
// 场景 C（审查 B 路径）：提交标题后一次 ⌘Z 恢复原标题，一次 ⇧⌘Z 回新，
// H1 恒为 1。
// ============================================================
await page.focus("#markdownTitleInput");
await page.evaluate(() => { document.getElementById("markdownTitleInput").value = "H1 基值"; }); // 与 PM 一致
await page.evaluate(() => {
  document.getElementById("markdownTitleInput").focus();
  document.getElementById("markdownTitleInput").value = "";
});
await page.keyboard.type("提交后新标题");
await page.waitForTimeout(50);
// Enter 提交（blur → commitMarkdownDocumentTitle 路径，测试里直接走 setDocumentTitle）
await page.evaluate(() => {
  document.getElementById("markdownTitleInput").blur();
  window.__execCalls.length = 0;
});
await page.evaluate(() => window.__ed.setDocumentTitle("提交后新标题"));
await page.waitForTimeout(50);
assert.equal(await page.evaluate(() => window.__ed.getDocumentTitle()), "提交后新标题", "C0: committed title in PM");
// 焦点回编辑器（真实 setDocumentTitle 内部 view.focus()）
await page.evaluate(() => document.querySelector("#editor .ProseMirror").focus());
const c1 = await page.evaluate(() => window.__handleNativeEditHistory("undo"));
assert.equal(c1, true, "C1: one undo must be handled by PM");
assert.equal(await page.evaluate(() => window.__ed.getDocumentTitle()), "H1 基值", "C2: one undo restores the original title");
const c2 = await page.evaluate(() => window.__handleNativeEditHistory("redo"));
assert.equal(c2, true, "C3: one redo must be handled by PM");
assert.equal(await page.evaluate(() => window.__ed.getDocumentTitle()), "提交后新标题", "C4: one redo restores the new title");
assert.equal(await h1Count(), 1, "C5: H1 count stays 1 across undo/redo");
assert.deepEqual(await execCalls(), [], "C6: no execCommand during PM undo/redo");
console.log("场景C 通过：已提交标题一次 ⌘Z 回旧、一次 ⇧⌘Z 回新，H1 恒为 1，零 execCommand");

// ============================================================
// 场景 D：连按 3 次 ⇧⌘Z（PM redo 空后落 guard），H1 恒为 1
// ============================================================
await page.evaluate(() => {
  window.__ed.setDocumentTitle("第三版");
  window.__execCalls.length = 0;
});
await page.evaluate(() => document.querySelector("#editor .ProseMirror").focus());
await page.evaluate(() => window.__handleNativeEditHistory("undo")); // PM undo 成功
for (let i = 0; i < 3; i += 1) {
  await page.evaluate(() => window.__handleNativeEditHistory("redo"));
  assert.equal(await h1Count(), 1, `D${i}: H1 count must stay 1 after ⇧⌘Z #${i + 1}`);
}
assert.deepEqual(await execCalls(), [], "D4: execCommand never called on ProseMirror focus");
console.log("场景D 通过：连续 3 次 ⇧⌘Z（含 PM 栈空落 guard），H1 恒为 1，execCommand 零调用");

// ============================================================
// 场景 E（B3 复审 P1）：无 H1 文档 undo 后 fallback 恢复文件名。
// ============================================================
await page.evaluate(() => {
  const root = document.getElementById("editor");
  window.__ed?.destroy?.();
  root.innerHTML = "";
  window.appState.activeMarkdownEditor = null;
  window.getActiveTab = () => ({ id: "tab-1", preview: { fileType: "markdown" }, item: { fileName: "markdown-no-h1.md" } });
  document.getElementById("markdownTitleInput").value = "markdown-no-h1.md";
});
await page.evaluate(async () => {
  const root = document.getElementById("editor");
  window.__ed = await window.NutbookMarkdownEditor.create({
    root,
    markdown: "## 二级标题\n\n正文内容，没有一级标题。\n"
  });
  window.appState.activeMarkdownEditor = window.__ed;
  window.appState.activeMarkdownEditorTabId = "tab-1";
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
});
assert.equal(await page.evaluate(() => window.__ed.getDocumentTitle()), null, "E0: no valid H1 → null");
assert.equal(await titleValue(), "markdown-no-h1.md", "E1: title input initially shows the file name");
// 输入新标题并提交（插入 H1）
await page.evaluate(() => window.__ed.setDocumentTitle("插入的标题"));
assert.equal(await page.evaluate(() => window.__ed.getDocumentTitle()), "插入的标题", "E2: H1 inserted");
assert.equal(await h1Count(), 1, "E3: one H1 after insert");
// 一次 undo：删除 H1，标题框立即恢复文件名
await page.evaluate(() => document.querySelector("#editor .ProseMirror").focus());
const eUndo = await page.evaluate(() => window.__handleNativeEditHistory("undo"));
assert.equal(eUndo, true, "E4: undo must be handled by PM");
assert.equal(await page.evaluate(() => window.__ed.getDocumentTitle()), null, "E5: undo removes the inserted H1");
assert.equal(await titleValue(), "markdown-no-h1.md", "E6: title input immediately restores the file name");
assert.equal(await h1Count(), 0, "E7: no H1 after undo");
// 一次 redo：恢复 H1 和标题框
const eRedo = await page.evaluate(() => window.__handleNativeEditHistory("redo"));
assert.equal(eRedo, true, "E8: redo must be handled by PM");
assert.equal(await page.evaluate(() => window.__ed.getDocumentTitle()), "插入的标题", "E9: redo restores the H1");
assert.equal(await titleValue(), "插入的标题", "E10: title input restored");
assert.equal(await h1Count(), 1, "E11: one H1 after redo");
// 二级标题、正文与 baseline 不受影响
const mdAfter = await page.evaluate(() => window.__ed.getMarkdown());
assert.match(mdAfter, /## 二级标题/, "E12: H2 preserved");
assert.match(mdAfter, /正文内容，没有一级标题。/, "E13: body preserved");
const baseline = await page.evaluate(() => window.__ed.getBaselineMarkdown());
assert.match(baseline, /## 二级标题/, "E14: baseline still the opened document");
console.log("场景E 通过：无 H1 文档 undo 删除 H1 后标题框立即恢复文件名，redo 恢复，正文/baseline 不受影响");

// ============================================================
// 场景 F（本轮 P1：IME 标题撤销栈）：compositionstart 保存组合前值，
// composition 中间 input 不入栈，compositionend 把整个组合结果记为一个
// undo 单元。原标题 → 中文组合"拼音" → 一次 undo 回原标题 → 一次 redo
// 回"拼音"；PM 文档在提交前完全不变。
// ============================================================
// 重建编辑器为普通 H1 文档，重置输入框
await page.evaluate(() => {
  const root = document.getElementById("editor");
  window.__ed?.destroy?.();
  root.innerHTML = "";
  window.appState.activeMarkdownEditor = null;
  window.getActiveTab = () => ({ id: "tab-1", preview: { fileType: "markdown" }, item: { fileName: "doc.md" } });
  setTitleInputValue(document.getElementById("markdownTitleInput"), "原标题");
});
await page.evaluate(async () => {
  const root = document.getElementById("editor");
  window.__ed = await window.NutbookMarkdownEditor.create({ root, markdown: "# 原标题\n\n正文内容。\n" });
  window.appState.activeMarkdownEditor = window.__ed;
  window.appState.activeMarkdownEditorTabId = "tab-1";
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
});
assert.equal(await page.evaluate(() => window.__ed.getDocumentTitle()), "原标题", "F0: PM title is the original");
await page.evaluate(() => {
  const input = document.getElementById("markdownTitleInput");
  input.focus();
  // compositionstart：记录组合前 value（"原标题"）
  input.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
  // composition 中间 input：value 变化但不得入栈（拼音候选等中间态）
  input.value = "拼";
  input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "拼", inputType: "insertCompositionText" }));
  input.value = "拼音";
  input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "拼音", inputType: "insertCompositionText" }));
  // compositionend：整个组合结果记为一个 undo 单元
  input.dispatchEvent(new CompositionEvent("compositionend", { data: "拼音" }));
});
await page.waitForTimeout(50);
assert.equal(await titleValue(), "拼音", "F1: composition result in the input");
// 一次 undo：回原标题（整个组合作为一个步骤）
const fUndo = await page.evaluate(() => window.__handleNativeEditHistory("undo"));
assert.equal(fUndo, true, "F2: undo must be handled by the title input history");
assert.equal(await titleValue(), "原标题", "F3: one undo restores the pre-composition value");
assert.equal(await page.evaluate(() => window.__ed.getDocumentTitle()), "原标题", "F4: PM doc unchanged before commit");
// 一次 redo：回"拼音"
const fRedo = await page.evaluate(() => window.__handleNativeEditHistory("redo"));
assert.equal(fRedo, true, "F5: redo must be handled by the title input history");
assert.equal(await titleValue(), "拼音", "F6: one redo restores the composition result");
assert.equal(await page.evaluate(() => window.__ed.getDocumentTitle()), "原标题", "F7: PM doc still unchanged (not committed)");
assert.equal(await h1Count(), 1, "F8: H1 count unchanged");
console.log("场景F 通过：IME 组合拼音作为单个 undo 单元，一次 undo 回原标题、一次 redo 回拼音，PM 提交前不变");

await browser.close();
console.log("markdown undo/redo routing tests passed.");
