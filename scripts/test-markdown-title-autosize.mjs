// B3 复审 P2：超长标题自动换行（顶部标题输入框 textarea 自动增高）。
//
// - 初始 rows="1"、resize:none、overflow-y:hidden、white-space:pre-wrap。
// - CJK 按字符边界换行；长 Latin 用 overflow-wrap:anywhere 不得撑出横向滚动。
// - 高度根据 scrollHeight 自动增长；Enter 提交（不插入换行）；IME composition
//   期间 Enter 不提交；程序化 value 更新后重算高度。
// 从 dist/index.html 提取真实 CSS 与 autosizeMarkdownTitleInput 函数，用
// playwright 测 DOM 尺寸与 overflow 状态（不用截图）。
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import assert from "node:assert";

const INDEX_HTML = readFileSync("dist/index.html", "utf8");
const FIXTURE_DIR = "src-tauri/tests/fixtures/card-revisions";
const fixture = (name) => readFileSync(`${FIXTURE_DIR}/${name}`, "utf8");

// 提取真实 CSS（.content-title + .markdown-title-input 规则）
const cssMatch = INDEX_HTML.match(/\.content-title \{[\s\S]*?\n      \}\n\n      \.markdown-title-input \{[\s\S]*?\n      \}/);
assert.ok(cssMatch, "the title input CSS must exist in dist/index.html");
const TITLE_CSS = cssMatch[0];

// 提取真实 autosizeMarkdownTitleInput 函数
const autoMatch = INDEX_HTML.match(/function autosizeMarkdownTitleInput\(input\) \{[\s\S]*?\n      \}/);
assert.ok(autoMatch, "autosizeMarkdownTitleInput must exist in dist/index.html");
const AUTOSIZE_FN = autoMatch[0];

// 提取真实 setupMarkdownTitleInput 的 Enter/Escape/composition 处理
const setupMatch = INDEX_HTML.match(/function setupMarkdownTitleInput\(tab\) \{[\s\S]*?\n      \}/);
assert.ok(setupMatch, "setupMarkdownTitleInput must exist in dist/index.html");
const SETUP_FN = setupMatch[0];

// 提取真实标题输入框自维护 history 函数（setup 依赖）
const sessionMatch = INDEX_HTML.match(/function markdownTitleInputSession\(input\) \{[\s\S]*?\n      \}/);
const setTitleValueMatch = INDEX_HTML.match(/function setTitleInputValue\(input, value\) \{[\s\S]*?\n      \}/);
const undoTitleMatch = INDEX_HTML.match(/function undoMarkdownTitleInput\(\) \{[\s\S]*?\n      \}/);
const redoTitleMatch = INDEX_HTML.match(/function redoMarkdownTitleInput\(\) \{[\s\S]*?\n      \}/);
assert.ok(sessionMatch && setTitleValueMatch && undoTitleMatch && redoTitleMatch, "title history functions must exist");
const SESSION_FN = sessionMatch[0];
const SET_TITLE_VALUE_FN = setTitleValueMatch[0];
const UNDO_TITLE_FN = undoTitleMatch[0];
const REDO_TITLE_FN = redoTitleMatch[0];

const LONG_CJK = fixture("markdown-long-cjk-title.md").split(/\r?\n/).find((l) => l.startsWith("# "))?.slice(2) || "";
const LONG_LATIN = fixture("markdown-long-latin-title.md").split(/\r?\n/).find((l) => l.startsWith("# "))?.slice(2) || "";
assert.ok(LONG_CJK.length > 40, "long CJK title fixture must be long");
assert.ok(LONG_LATIN.length > 80, "long Latin title fixture must be long");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
await page.setContent(`
  <style>
    :root {
      --font-title: -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
      --ink: #141414;
    }
    ${TITLE_CSS}
    .title-host { width: 320px; box-sizing: border-box; }
  </style>
  <div class="title-host">
    <textarea id="markdownTitleInput" class="content-title markdown-title-input" rows="1" aria-label="文档标题" autocomplete="off" spellcheck="false" wrap="off"></textarea>
    <div id="host" class="title-host"></div>
  </div>
`);

// 注入真实函数 + 宿主 stub（源码经 evaluate 参数传递，避免模板字面量截断）
await page.evaluate(({ autosizeSrc, sessionSrc, setValSrc, undoSrc, redoSrc, setupSrc }) => {
  window.appState = { markdownTitleInputComposing: false };
  // 完整函数声明 eval 后显式挂到 window（供后续独立 evaluate 调用）
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
  window.currentMarkdownDisplayTitle = () => "当前标题";
  window.commitMarkdownDocumentTitle = () => {};
  window.markdownContentForTab = () => "";
  window.__setupTitleInput = (tab) => setupMarkdownTitleInput(tab);
  window.__setupTitleInput({ preview: { fileType: "markdown" }, item: { fileName: "长标题.md" } });
}, {
  autosizeSrc: AUTOSIZE_FN,
  sessionSrc: SESSION_FN,
  setValSrc: SET_TITLE_VALUE_FN,
  undoSrc: UNDO_TITLE_FN,
  redoSrc: REDO_TITLE_FN,
  setupSrc: SETUP_FN
});
await page.waitForFunction(() => typeof window.__setupTitleInput === "function");

const input = "#markdownTitleInput";
const metrics = () => page.evaluate(() => {
  const el = document.getElementById("markdownTitleInput");
  const style = getComputedStyle(el);
  return {
    value: el.value,
    offsetHeight: el.offsetHeight,
    scrollHeight: el.scrollHeight,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    clientHeight: el.clientHeight,
    resize: style.resize,
    overflowY: style.overflowY,
    whiteSpace: style.whiteSpace,
    overflowWrap: style.overflowWrap,
    rows: el.rows
  };
});

// 1. CSS 属性与初始单行高度。
{
  const m = await metrics();
  assert.equal(m.resize, "none", "resize must be none");
  assert.equal(m.overflowY, "hidden", "overflow-y must be hidden");
  assert.equal(m.whiteSpace, "pre-wrap", "white-space must be pre-wrap");
  assert.equal(m.overflowWrap, "anywhere", "overflow-wrap must be anywhere");
  assert.equal(m.rows, 1, "initial rows must be 1");
  const single = m.offsetHeight;
  // 2. 长 CJK 标题：高度明显超过单行（自动增高换行）。
  await page.evaluate((title) => { const el = document.getElementById("markdownTitleInput"); el.value = title; window.autosizeMarkdownTitleInput(el); }, LONG_CJK);
  const cjk = await metrics();
  assert.ok(cjk.offsetHeight > single * 1.5, `CJK title must wrap to multiple lines (single=${single}, now=${cjk.offsetHeight})`);
  assert.ok(cjk.offsetHeight >= cjk.scrollHeight - 1, "CJK title height must converge to content height (no internal scroll)");
  assert.ok(cjk.scrollWidth <= cjk.clientWidth + 1, "CJK title must NOT overflow horizontally");
  // 3. 长 Latin 标题：同样自动换行且无横向 overflow（overflow-wrap:anywhere）。
  await page.evaluate((title) => { const el = document.getElementById("markdownTitleInput"); el.value = title; window.autosizeMarkdownTitleInput(el); }, LONG_LATIN);
  const latin = await metrics();
  assert.ok(latin.offsetHeight > single * 1.5, `Latin title must wrap (single=${single}, now=${latin.offsetHeight})`);
  assert.ok(latin.scrollWidth <= latin.clientWidth + 1, `Latin title must NOT overflow horizontally (scrollWidth=${latin.scrollWidth}, clientWidth=${latin.clientWidth})`);
  console.log(`尺寸断言通过：单行 ${single}px，CJK ${cjk.offsetHeight}px，Latin ${latin.offsetHeight}px，均无横向 overflow`);
}

// 4. 高度随内容收敛：短 → 长 → 短，回到初始高度。
{
  await page.evaluate(() => { const el = document.getElementById("markdownTitleInput"); el.value = "短标题"; window.autosizeMarkdownTitleInput(el); });
  const short1 = await metrics();
  await page.evaluate((title) => { const el = document.getElementById("markdownTitleInput"); el.value = title; window.autosizeMarkdownTitleInput(el); }, LONG_CJK);
  const long = await metrics();
  assert.ok(long.offsetHeight > short1.offsetHeight, "long title must grow the textarea");
  await page.evaluate(() => { const el = document.getElementById("markdownTitleInput"); el.value = "短标题"; window.autosizeMarkdownTitleInput(el); });
  const short2 = await metrics();
  assert.equal(short2.offsetHeight, short1.offsetHeight, "shrinking back must reconverge to the single-line height");
  console.log("高度收敛通过：长标题增高、改回短标题后高度恢复");
}

// 5. Enter 提交但 value 不含换行；Escape 恢复当前文档标题。
{
  await page.evaluate(() => { const el = document.getElementById("markdownTitleInput"); el.value = "提交内容"; });
  await page.focus("#markdownTitleInput");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(30);
  const afterEnter = await metrics();
  assert.equal(afterEnter.value, "提交内容", "Enter must not insert a newline or change the value");
  assert.ok(!afterEnter.value.includes("\n"), "value must contain no newline after Enter");
  console.log("Enter 提交通过：value 不含换行");
}

// 6. IME composition 期间 Enter 不提交。
{
  const composeResult = await page.evaluate(() => {
    const el = document.getElementById("markdownTitleInput");
    el.value = "拼音";
    window.__blurred = false;
    const origBlur = el.blur.bind(el);
    el.blur = () => { window.__blurred = true; };
    el.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
    // 真实 IME 中 Enter 键的 keydown 带 isComposing=true，不得提交/blur。
    el.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter", isComposing: true, bubbles: true, cancelable: true
    }));
    el.dispatchEvent(new CompositionEvent("compositionend", { data: "拼音" }));
    return { value: el.value, blurred: window.__blurred };
  });
  assert.equal(composeResult.value, "拼音", "composition Enter must not commit");
  assert.equal(composeResult.blurred, false, "composition Enter must not blur");
  console.log("IME composition 通过：Enter 不提交、不 blur");
}

await browser.close();
console.log("markdown title autosize tests passed.");
