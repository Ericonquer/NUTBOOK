// 检查视图（second view / inspector）回归：
//
// Task 0a（同源只读 + revision 合同）：
//  1. 最终 bundle 提供 readOnly inspector 模式：ProseMirror editable=false、
//     contenteditable=false 兜底、无任何编辑辅助 UI、输入/撤销无副作用。
//  2. 同一 Markdown 在 readOnly 与正式编辑实例下首屏几何逐元素一致（同源渲染）。
//  3. 宿主加载链：snapshot → 隐藏挂载（正文卡 visibility:hidden，loading 层覆盖）
//     → Milkdown ready / 图片就绪 / 显示前三次 revision 复核全部通过才显示；
//     任一不一致销毁旧实例并重读（有限深度），旧正文绝不短暂可见。
//
// Task 0b/1/2/3（生命周期与两栏）：
//  4. 选择竞态：selection token 推进使旧选择失效；行选择/键选/Enter 打开。
//  5. 分栏：无最小钳制 + 固定 10px 分隔条 hit target + 键盘/双击重置 40/60。
//  6. 离开检查视图/打开文件销毁 inspector，列排序重置。
//  7. HTML 只消费既有 thumbnail 状态：ready 即显示、session stale 带遮罩、
//     失败/引擎不可用为状态层 + 重试，不把旧图当 current ready。
//
// GUI 验收反馈（2026-08-28 第 2 批）：
//  8. 分隔条 1:1 跟随指针；左右栏同款外框；斑马纹；类型列居中；
//     来源列只表达 project/skill；列宽拖拽 + 持久化；右栏单一框体 +
//     详情扩展 + 底部打开横条；MD 预览 0.75 缩放 + 「更多」框内滚动；
//     渐隐层贴边无缝。

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { chromium } from "playwright";

const INDEX_HTML = readFileSync("dist/index.html", "utf8");
const BUNDLE = readFileSync("dist/assets/markdown-editor.js", "utf8");
const I18N = readFileSync("dist/i18n.js", "utf8");
const MAIN_RUST = readFileSync("src-tauri/src/main.rs", "utf8");
const PREVIEW_RUST = readFileSync("src-tauri/src/commands/preview.rs", "utf8");
const DOCUMENT_RUST = readFileSync("src-tauri/src/core/document.rs", "utf8");
const MODELS_RUST = readFileSync("src-tauri/src/models/item.rs", "utf8");
const MORE_OVERLAY = readFileSync("dist/inspector-more-overlay.html", "utf8");

function extractFunctionSource(source, startMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start !== -1, `function source not found: ${startMarker}`);
  // 形参可能带默认值（如 options = {}）：定位签名收尾 ") {" 处的 {
  // 而不是第一个 {，再做括号配对。
  const signatureEnd = source.indexOf(") {", start);
  assert.ok(signatureEnd !== -1, `function signature close not found: ${startMarker}`);
  const brace = signatureEnd + 2;
  let depth = 0;
  let i = brace;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  assert.ok(depth === 0, `unbalanced braces for ${startMarker}`);
  return source.slice(start, i + 1);
}

// ── 1. 旧列表视图被检查视图取代，不残留双实现 ─────────────────────────────
assert.doesNotMatch(INDEX_HTML, /appState\.homeLayout === "list"/, "the old thumbnail list view must be replaced by the inspector view");
assert.doesNotMatch(INDEX_HTML, /\.main-shell\.home-mode\.list-layout/, "old list-layout CSS must not survive");
assert.match(INDEX_HTML, /id="inspectorShell" class="inspector-shell"/, "inspector shell must exist in the home markup");
assert.match(INDEX_HTML, /homeLayout: loadHomeLayoutPreference\(\)/, "the home grid/inspector choice must restore from a user preference");
assert.match(INDEX_HTML, /splitRatio: loadInspectorSplitRatioPreference\(\)/, "the inspector split ratio must restore from a user preference");
assert.match(INDEX_HTML, /homeLayout = previousLayout === "grid" \? "inspector" : "grid"/, "the view toggle must cycle grid ↔ inspector");
assert.match(I18N, /inspectorView:\s*"已切换为检查视图"/, "zh status must name the inspector view");
assert.match(I18N, /inspectorView:\s*"Switched to inspector view"/, "en status must name the inspector view");
assert.match(INDEX_HTML, /icon\.textContent = inspectorActive \? "grid_view" : "view_agenda"/, "the toggle icon must reflect grid ↔ inspector");

// ── 2. Task 0a：只读挂载 + 三时点 revision 复核链 ─────────────────────────
const loadSrc = extractFunctionSource(INDEX_HTML, "async function loadInspectorPreview(item) {");
assert.match(loadSrc, /invoke\("get_item_inspector_snapshot", \{ itemId: item\.id \}\)/, "inspector must read a revision-keyed backend snapshot");
assert.match(loadSrc, /await mountInspectorMarkdownPreview\(item, normalized, token\)/, "snapshot must mount through the read-only inspector");
assert.match(loadSrc, /await waitForInspectorImages\(token\)/, "local images must be ready before first screen shows");
assert.equal((loadSrc.match(/await verifyInspectorRevision\(item, normalized, token\)/g) || []).length, 3, "the plan contract requires re-verification at Milkdown-ready, images-ready and pre-display");
assert.match(
  loadSrc,
  /settleInspectorRevision\(item, normalized, token, await verifyInspectorRevision\(item, normalized, token\)\)\) return;[\s\S]*?settleInspectorRevision\(item, normalized, token, await verifyInspectorRevision\(item, normalized, token\)\)\) return;[\s\S]*?settleInspectorRevision\(item, normalized, token, await verifyInspectorRevision\(item, normalized, token\)\)\) return;\s*revealInspectorMarkdownPreview\(\);/,
  "the preview may only be revealed after the third (pre-display) recheck passes"
);

const mountSrc = extractFunctionSource(INDEX_HTML, "async function mountInspectorMarkdownPreview(item, snapshot, token) {");
assert.match(mountSrc, /readOnly: true/, "the inspector must create the editor in read-only mode");
assert.match(mountSrc, /loadMarkdownEditorApi\(\)/, "the inspector must reuse the same Milkdown bundle as the open page");
assert.match(mountSrc, /resolveMarkdownImageUrl\(src, tabLike\)/, "image URL resolution must be the same resolver as the open page");
assert.match(mountSrc, /markdownDocumentTitle\(snapshot\.raw/, "the title shell must use the authoritative title parser");
assert.match(mountSrc, /inspector-preview-pending" data-inspector-preview="1" inert/, "the mounted card must start hidden and inert until every recheck passes");
assert.match(mountSrc, /\$\{inspectorStateMarkup\("loading"\)\}/, "a loading state layer must cover the hidden mount");
assert.match(mountSrc, /querySelector\("#inspectorMilkdownRoot"\)/, "the editor root must be captured by reference so list rebuilds cannot hijack the mount");
assert.match(mountSrc, /root\?\.isConnected/, "a wiped mount root must abort instead of mounting into detached DOM");

const verifySrc = extractFunctionSource(INDEX_HTML, "async function verifyInspectorRevision(item, snapshot, token) {");
assert.match(verifySrc, /invoke\("get_item_content_revision", \{ itemId: item\.id \}\)/, "revision recheck must read the current content hash");
assert.doesNotMatch(verifySrc, /destroyInspectorEditorOnly|appState\.inspector\.status/, "the recheck itself must stay side-effect free (verdict only)");
const settleSrc = extractFunctionSource(INDEX_HTML, "async function settleInspectorRevision(item, snapshot, token, verdict) {");
assert.match(settleSrc, /destroyInspectorEditorOnly\(\)/, "a failed recheck must destroy the stale instance");
assert.match(settleSrc, /appState\.inspector\.loadDepth < 3/, "reload-on-mismatch must be depth-bounded");
assert.match(settleSrc, /appState\.inspector\.status = "unavailable"/, "exhausted reloads must land in the explicit unavailable state");
assert.match(settleSrc, /await loadInspectorPreview\(latest\)/, "a failed recheck must re-read a fresh snapshot");
const revealSrc = extractFunctionSource(INDEX_HTML, "function revealInspectorMarkdownPreview() {");
assert.match(revealSrc, /classList\.remove\("inspector-preview-pending"\)/, "reveal is the only path that makes the mounted card visible");
assert.match(revealSrc, /appState\.inspector\.status = "ready"/, "ready status must be granted by reveal only");
const previewRenderSrc = extractFunctionSource(INDEX_HTML, "function renderInspectorPreview() {");
assert.match(previewRenderSrc, /querySelector\("\[data-inspector-preview\]\.inspector-preview-pending"\)/, "a re-render during the hidden mount must not wipe the mounting editor root");

assert.match(loadSrc, /if \(item\.fileType !== "markdown"\) \{[\s\S]*?renderInspectorPreview\(\);[\s\S]*?return;/, "html items must project cached screenshot state instead of a markdown snapshot");
assert.match(INDEX_HTML, /command === "get_item_detail" \|\| command === "get_item_preview" \|\| command === "get_item_inspector_snapshot" \|\| command === "get_item_content_revision"/, "browser mock variants must cover the two inspector commands");
assert.match(MAIN_RUST, /commands::preview::get_item_inspector_snapshot,/, "the snapshot command must be registered");
assert.match(MAIN_RUST, /commands::preview::get_item_content_revision,/, "the revision command must be registered");
assert.match(DOCUMENT_RUST, /pub fn load_markdown_inspector_snapshot/, "the core snapshot loader must exist");
assert.match(DOCUMENT_RUST, /revision: content_hash\(&raw\)/, "snapshot revision must be the content hash");
assert.match(MODELS_RUST, /pub struct MarkdownInspectorSnapshot/, "the snapshot model must exist");
assert.match(PREVIEW_RUST, /if item\.summary\.file_type != "markdown" \{\s*return Err\(AppError::UnsupportedFileType\);/, "html files must be rejected by the markdown snapshot loader");

// ── 3. Task 0b/2：生命周期清理与选择竞态 ─────────────────────────────────
const applyLayoutSrc = extractFunctionSource(INDEX_HTML, "function applyHomeLayout() {");
assert.match(applyLayoutSrc, /destroyMarkdownInspector\(\)/, "leaving the inspector view must destroy the inspector");
assert.match(applyLayoutSrc, /appState\.inspector\.sortKey = "modifiedAt"/, "column sort must reset when leaving the inspector view");
assert.match(INDEX_HTML, /function renderItems\(\) \{\s*\/\/ 检查视图接管列表渲染[^\n]*\n\s*if \(appState\.homeLayout === "inspector"\) \{\s*renderInspectorItems\(\);\s*return;\s*\}/, "renderItems must delegate to the inspector list");
assert.match(INDEX_HTML, /selectionToken \+= 1/, "selection token must advance to invalidate late async results");
const selectSrc = extractFunctionSource(INDEX_HTML, "function selectInspectorItem(itemId");
assert.match(selectSrc, /appState\.inspector\.selectionToken \+= 1/, "selecting an item must invalidate the previous token");

// ── 4. Task 1：左栏固定列 + 排序 + 选中视觉 ──────────────────────────────
assert.match(INDEX_HTML, /data-inspector-sort="\$\{column\.key\}"/, "column headers must be sort buttons");
assert.match(INDEX_HTML, /sortDir = key === "modifiedAt" \? "desc" : "asc"/, "modified time defaults to descending, others ascending");
assert.match(INDEX_HTML, /\.inspector-row\.selected \{\s*background: #ececee;/, "selected row stays a restrained gray one step darker than the zebra stripes");
assert.match(INDEX_HTML, /\.inspector-row\.selected::before \{[\s\S]*?width: 2px;[\s\S]*?background: #000;/, "selected row keeps the 2px black accent bar");
assert.match(INDEX_HTML, /\.inspector-row:hover \{\s*background: #e8e8ea;/, "hover row uses the agreed deeper gray");
assert.match(INDEX_HTML, /role="listbox" aria-label="[^"]*" tabindex="0"/, "the row list must be a keyboard-focusable listbox");
assert.match(INDEX_HTML, /event\.key === "ArrowDown"/, "arrow keys must move the selection");
assert.match(INDEX_HTML, /event\.key === "Enter" && currentIndex >= 0/, "Enter must open the selected file");

// ── 5. 分栏：安全宽钳制 + 可恢复 hit target + 重置动作 ───────────────────
assert.match(INDEX_HTML, /id="inspectorSplitter" class="inspector-splitter" role="separator" aria-orientation="vertical" tabindex="0"/, "the splitter must be a keyboard-reachable separator");
assert.match(INDEX_HTML, /minmax\(0, \$\{leftPx\}px\) 10px minmax\(0, \$\{rightPx\}px\)/, "both pane tracks must use the same pixel measurement so margins cannot cross-track overlap");
assert.match(INDEX_HTML, /1 - leftPx \/ usable/, "dragging must track the pointer: left pane target = pointer x, right pane = remainder");
assert.match(INDEX_HTML, /const INSPECTOR_LEFT_MIN_PX = 280;/, "the left pane must keep a safe minimum width");
assert.match(INDEX_HTML, /const INSPECTOR_RIGHT_MIN_PX = 340;/, "the right pane must keep a safe minimum width");
const splitRatioSrc = extractFunctionSource(INDEX_HTML, "function applyInspectorSplitRatio() {");
assert.match(splitRatioSrc, /Math\.max\(minLeftPx, \(1 - ratio\) \* usable\)/, "the ratio must be clamped to the safe pane widths in one central place");
assert.match(splitRatioSrc, /usable - INSPECTOR_RIGHT_MIN_PX/, "the right pane minimum must feed the left pane clamp");
assert.match(splitRatioSrc, /const leftPx = Math\.round\(\(1 - ratio\) \* usable/, "the left track must be derived from the effective split ratio");
assert.match(splitRatioSrc, /const rightPx = Math\.max\(0, Math\.round\(\(usable - leftPx\)/, "the right track must consume the exact remaining measured width");
assert.match(splitRatioSrc, /return ratio;/, "the drag handler must receive the clamped ratio instead of overwriting its state with undefined");
assert.match(INDEX_HTML, /event\.key === "ArrowLeft"/, "the splitter supports left arrow keyboard adjust");
assert.match(INDEX_HTML, /event\.key === "ArrowRight"/, "the splitter supports right arrow keyboard adjust");
assert.match(INDEX_HTML, /splitter\?\.addEventListener\("dblclick", \(\) => \{\s*resetInspectorSplit\(\);/, "double-clicking the splitter resets 40/60");
assert.match(INDEX_HTML, /splitRatio = 0\.6;/, "reset restores the default 40/60 split");
assert.match(INDEX_HTML, /data-inspector-reset-split="1"/, "a discoverable reset action exists");
assert.match(INDEX_HTML, /data-inspector-reset-split="1"[^>]*aria-label="/, "the reset action must carry an aria label");
assert.match(INDEX_HTML, /data-inspector-reset-split="1"[\s\S]{0,220}?home-action-tooltip/, "the reset action must expose the in-app hover tooltip");
assert.match(INDEX_HTML, /function saveHomeLayoutPreference\(\)/, "switching the home layout must have a dedicated persistence boundary");
assert.match(INDEX_HTML, /function saveInspectorSplitRatioPreference\(\)/, "changing the split must have a dedicated persistence boundary");
assert.match(INDEX_HTML, /saveHomeLayoutPreference\(\);[\s\S]{0,160}?applyHomeLayout\(\);/, "the view toggle must save before the new home view is rendered");

// ── 6. 右栏首屏语义 ──────────────────────────────────────────────────────
assert.match(INDEX_HTML, /\.inspector-preview-scroll \{\s*position: absolute;\s*inset: 0;\s*z-index: 0;\s*overflow: hidden;/, "the first screen is top-cropped and never scrolls");
assert.match(INDEX_HTML, /linear-gradient\(to bottom, rgba\(255, 255, 255, 0\), var\(--paper\)\)/, "the crop must fade out instead of a solid bar");
assert.match(INDEX_HTML, /\.inspector-preview-card \{\s*max-width: 920px;\s*margin: 0 auto;\s*width: 100%;/, "preview content shares the open-page content width formula");
assert.match(INDEX_HTML, /\.inspector-preview-card\.inspector-preview-pending \{\s*visibility: hidden;/, "the hidden mount keeps normal-flow layout but stays invisible until all rechecks pass");
assert.match(INDEX_HTML, /\.inspector-preview-card a\[href\],[\s\S]*?pointer-events: none;/, "preview links and media must not be activatable");
assert.match(INDEX_HTML, /\.inspector-html-shot \{\s*display: block;\s*width: 100%;\s*height: auto;/, "html bitmaps scale with the pane width");

// ── 7. Task 3：HTML 截图状态投影 ─────────────────────────────────────────
const htmlPreviewSrc = extractFunctionSource(INDEX_HTML, "function renderInspectorHtmlPreview(item) {");
assert.match(htmlPreviewSrc, /thumb\?\.status === "ready" && thumb\.path/, "current ready screenshots display immediately");
assert.match(htmlPreviewSrc, /staleEntry\.state === "preview"/, "session-local stale previews stay masked");
assert.match(htmlPreviewSrc, /canGenerateDocumentThumbnails\(\)/, "stale masking requires an available engine");
assert.match(htmlPreviewSrc, /inspectorStateMarkup\("engineUnavailable"\)/, "engine-unavailable shows an explicit state");
assert.match(htmlPreviewSrc, /hideInspectorMoreButton\(\);/, "HTML projection must clear the Markdown-only more button on every render path");
const wireInspectorSrc = extractFunctionSource(INDEX_HTML, "function wireInspectorEvents() {");
assert.equal((wireInspectorSrc.match(/retryInspectorThumbnail\(\)/g) || []).length, 2, "both the preview body and the details bar must delegate retry to the shared entry");
assert.match(wireInspectorSrc, /els\.inspectorPreviewBody\?\.addEventListener\("click", \(event\) => \{[\s\S]*?data-inspector-retry-thumbnail[\s\S]*?retryInspectorThumbnail\(\);/, "the failed-state retry button lives in the preview body, so its click delegation must live there too");
const retrySrc = extractFunctionSource(INDEX_HTML, "function retryInspectorThumbnail() {");
assert.match(retrySrc, /ensureDocumentThumbnails\(\[item\]\)/, "retry must reuse the existing refresh queue");
assert.match(retrySrc, /_thumbFailed = false/, "retry must clear the session failure flag");
const updateCardSrc = extractFunctionSource(INDEX_HTML, "function updateCardThumbnail(item) {");
assert.match(updateCardSrc, /renderInspectorHtmlPreview\(selected\)/, "thumbnail convergence must refresh the selected html preview");

// ── 8. 状态层与 i18n ─────────────────────────────────────────────────────
for (const key of ["inspector.colName", "inspector.openFile", "inspector.resetSplit", "inspector.previewUnavailableTitle", "inspector.htmlRetry", "inspector.htmlEngineHint"]) {
  const name = key.split(".").pop();
  const occurrences = I18N.split(`        ${name}:`).length - 1;
  assert.ok(occurrences >= 2, `${key} must exist in both localization dictionaries`);
}

// ── 9. 宿主 revision 复核链（vm 沙箱执行真实函数体）────────────────────
// 计划 §验收 5：必须以“外部替换发生在 snapshot 读取、Milkdown ready、图片完成
// 三个时点”的测试证明 revision 复核有效；未通过全部复核前正文不得显示。
function buildFlowContext() {
  const ctx = {
    appState: {
      homeLayout: "inspector",
      inspector: { selectedItemId: 7, selectionToken: 5, loadDepth: 0, status: "loading", editor: null, snapshot: null, moreOverlay: { itemId: null, selectionToken: 0, expanded: false, syncRunId: 0, syncPromise: Promise.resolve() } },
      items: [{ id: 7, modifiedAt: "1", pathState: "valid", fileType: "markdown" }]
    },
    els: {
      inspectorShell: { hidden: false },
      inspectorPreviewBody: { scrollTop: 0, innerHTML: "", querySelector: () => null },
      inspectorPreviewStage: { classList: { contains: () => false, remove: () => {}, toggle: () => false } },
      mainShell: { classList: { contains: () => true } }
    },
    t: (key) => key,
    isItemPathMissing: () => false,
    renderInspectorPreview: () => { ctx.__renders += 1; },
    invoke: async (command, args) => {
      if (command === "get_item_inspector_snapshot") {
        ctx.__snapshotReads += 1;
        return { itemId: args.itemId, raw: `raw-${ctx.__snapshotReads}`, revision: ctx.__snapshotRevisions.shift() ?? "rev-stale" };
      }
      if (command === "get_item_content_revision") {
        const expected = ctx.__revisionQueue.shift();
        if (expected === null) throw new Error("revision read failed");
        return { itemId: args.itemId, revision: expected ?? "rev-current" };
      }
      throw new Error(`unexpected command: ${command}`);
    },
    mountInspectorMarkdownPreview: async (item, snapshot, token) => {
      ctx.__mounts.push({ revision: snapshot.revision, token });
      // 与真实 mount 同契约：挂载成功即把 editor 交给 inspector 状态。
      const editor = { destroy: () => { ctx.__editorDestroys += 1; } };
      ctx.appState.inspector.editor = editor;
      return editor;
    },
    waitForInspectorImages: async () => { ctx.__imageWaits += 1; },
    console: { warn: () => {} },
    __snapshotRevisions: [],
    __revisionQueue: [],
    __snapshotReads: 0,
    __mounts: [],
    __editorDestroys: 0,
    __imageWaits: 0,
    __reveals: 0,
    __destroys: 0,
    __renders: 0
  };
  return ctx;
}

const FLOW_SOURCES = [
  "function escapeHtml(value) {",
  "function syncInspectorMoreOverlay() {",
  "function setInspectorPreviewExpanded(expanded) {",
  "function hideInspectorMoreButton() {",
  "function isInspectorActive() {",
  "function isInspectorSelectionCurrent(itemId, token) {",
  "function destroyInspectorEditorOnly() {",
  "async function verifyInspectorRevision(item, snapshot, token) {",
  "async function settleInspectorRevision(item, snapshot, token, verdict) {",
  "function revealInspectorMarkdownPreview() {",
  "async function loadInspectorPreview(item) {"
].map((marker) => extractFunctionSource(INDEX_HTML, marker)).join("\n");

async function runFlowScenario(setup) {
  const context = buildFlowContext();
  vm.createContext(context);
  vm.runInContext(`${FLOW_SOURCES}\nglobalThis.loadInspectorPreview = loadInspectorPreview;`, context);
  vm.runInContext("syncInspectorMoreOverlay = () => {};", context);
  // 真实 destroy / reveal 保留副作用，仅额外计数（函数声明可再赋值）。
  vm.runInContext(`
    const __realDestroy = destroyInspectorEditorOnly;
    destroyInspectorEditorOnly = function () { globalThis.__destroys += 1; __realDestroy(); };
    const __realReveal = revealInspectorMarkdownPreview;
    revealInspectorMarkdownPreview = function () { globalThis.__reveals += 1; __realReveal(); };
  `, context);
  setup(context);
  await vm.runInContext("loadInspectorPreview(appState.items[0])", context);
  return context;
}

// 9a. 三个时点全部一致 → 恰好显示一次，无销毁。
const pass = await runFlowScenario((ctx) => {
  ctx.__snapshotRevisions = ["rev-1"];
  ctx.__revisionQueue = ["rev-1", "rev-1", "rev-1"];
});
assert.equal(pass.__mounts.length, 1, "a fully consistent load must mount exactly once");
assert.equal(pass.__reveals, 1, "a fully consistent load must reveal exactly once");
assert.equal(pass.__editorDestroys, 0, "a fully consistent load must never destroy a mounted editor instance");
assert.equal(pass.__destroys, 1, "only the pre-mount cleanup destroy may run (no recheck-driven destroy)");
assert.equal(pass.__imageWaits, 1, "image readiness must be awaited between rechecks 1 and 2");
assert.equal(pass.appState.inspector.status, "ready", "reveal must grant ready status");
assert.equal(pass.appState.inspector.loadDepth, 0, "a consistent load must not consume reload depth");

// 9b. 读取 → 挂载之间外部替换（复核 1 不一致）→ 销毁重读后显示新 revision。
const atMount = await runFlowScenario((ctx) => {
  ctx.__snapshotRevisions = ["rev-1", "rev-2"];
  ctx.__revisionQueue = ["rev-2", "rev-2", "rev-2", "rev-2"];
});
assert.equal(atMount.__mounts.length, 2, "a mismatch at recheck 1 must remount with a fresh snapshot");
assert.deepEqual(atMount.__mounts.map((mount) => mount.revision), ["rev-1", "rev-2"], "the remount must carry the new revision");
assert.equal(atMount.__editorDestroys, 1, "a mismatch at recheck 1 must destroy the stale editor instance");
assert.equal(atMount.__destroys, 3, "two load-entry cleanups plus one recheck-driven destroy");
assert.equal(atMount.__reveals, 1, "only the fresh snapshot may be revealed");
assert.equal(atMount.appState.inspector.loadDepth, 1, "the reload must consume depth");
assert.equal(atMount.appState.inspector.status, "ready", "the converging reload must still land ready");

// 9c. 图片就绪时外部替换（复核 2 不一致）→ 销毁重读。
const atImages = await runFlowScenario((ctx) => {
  ctx.__snapshotRevisions = ["rev-1", "rev-2"];
  ctx.__revisionQueue = ["rev-1", "rev-2", "rev-2", "rev-2", "rev-2"];
});
assert.equal(atImages.__mounts.length, 2, "a mismatch at recheck 2 must remount with a fresh snapshot");
assert.equal(atImages.__editorDestroys, 1, "a mismatch at recheck 2 must destroy the stale editor instance");
assert.equal(atImages.__reveals, 1, "the stale instance must never be revealed");
assert.equal(atImages.appState.inspector.loadDepth, 1, "the reload must consume depth");

// 9d. 显示前外部替换（复核 3 不一致）→ 销毁重读，旧正文零帧可见。
const preReveal = await runFlowScenario((ctx) => {
  ctx.__snapshotRevisions = ["rev-1", "rev-2"];
  ctx.__revisionQueue = ["rev-1", "rev-1", "rev-2", "rev-2", "rev-2", "rev-2"];
});
assert.equal(preReveal.__mounts.length, 2, "a mismatch at recheck 3 must remount with a fresh snapshot");
assert.equal(preReveal.__editorDestroys, 1, "a mismatch at recheck 3 must destroy the stale editor instance");
assert.equal(preReveal.__reveals, 1, "only the re-read snapshot may be revealed");

// 9e. revision 读取失败（unknown）→ 同样销毁重读（fail closed，不显示未复核内容）。
const unknownRead = await runFlowScenario((ctx) => {
  ctx.__snapshotRevisions = ["rev-1", "rev-1"];
  ctx.__revisionQueue = [null, "rev-1", "rev-1", "rev-1"];
});
assert.equal(unknownRead.__mounts.length, 2, "an unreadable revision must not be treated as a match");
assert.equal(unknownRead.__editorDestroys, 1, "an unreadable revision must destroy and re-read");
assert.equal(unknownRead.__reveals, 1, "the converging reload must still reveal once");

// 9f. 持续不一致 → 深度耗尽收敛 unavailable，绝不显示。
const exhausted = await runFlowScenario((ctx) => {
});
assert.equal(exhausted.__mounts.length, 4, "persistent mismatch must reload exactly until the depth cap (1 + 3)");
assert.equal(exhausted.__editorDestroys, 4, "every rejected instance must be destroyed");
assert.equal(exhausted.__reveals, 0, "a persistently stale file must never be revealed");
assert.equal(exhausted.appState.inspector.status, "unavailable", "exhausted reloads must land in the explicit unavailable state");
assert.equal(exhausted.appState.inspector.loadDepth, 3, "reload depth must cap at 3");

// 9g. 图片等待期间选择失效 → 静默停止：不销毁新状态、不重读、不显示。
const superseded = await runFlowScenario((ctx) => {
  ctx.__snapshotRevisions = ["rev-1"];
  ctx.__revisionQueue = ["rev-1"];
  ctx.waitForInspectorImages = async () => {
    ctx.appState.inspector.selectionToken += 1;
  };
});
assert.equal(superseded.__mounts.length, 1, "the superseded load must have mounted before losing the selection");
assert.equal(superseded.__reveals, 0, "a superseded load must never reveal");
assert.equal(superseded.__editorDestroys, 0, "a superseded load must not destroy the editor owned by the new selection");
assert.equal(superseded.__snapshotReads, 1, "a superseded load must not re-read the snapshot");

// ── 10. GUI 验收反馈修复（8 项体验问题）─────────────────────────────────
// 10.1 分隔条 1:1 跟随指针（旧实现把指针位置当右栏占比，方向相反）。
assert.match(wireInspectorSrc, /moveEvent\.clientX - shellRect\.left - 5/, "the pointer x must be centered on the 10px splitter column");
assert.match(wireInspectorSrc, /Math\.max\(1, shellRect\.width - 10\)/, "the fr budget must exclude the fixed splitter column");

// 10.2 左栏同款圆角外框，与右栏 preview-frame 成对。
assert.match(
  INDEX_HTML,
  /\.inspector-list-pane \{[\s\S]*?margin: 16px 0 12px 12px;[\s\S]*?border: 1px solid var\(--line\);[\s\S]*?border-radius: 14px;/,
  "the left list pane must wear the same frame as the right preview frame"
);

// 10.3 表格感斑马纹，且声明在 hover/selected 之前（同特异性下后者覆盖）。
assert.match(INDEX_HTML, /\.inspector-row:nth-child\(even\) \{\s*background: #f5f5f7;/, "even rows must carry the table-stripe fill");
const zebraIndex = INDEX_HTML.indexOf(".inspector-row:nth-child(even)");
const hoverIndex = INDEX_HTML.indexOf(".inspector-row:hover");
const selectedIndex = INDEX_HTML.indexOf(".inspector-row.selected");
assert.ok(zebraIndex !== -1 && zebraIndex < hoverIndex && hoverIndex !== -1 && selectedIndex !== -1 && selectedIndex < INDEX_HTML.indexOf(".inspector-row.selected::before"), "zebra must be declared before hover/selected so state colors still win");

// 10.4 类型列居中（表头与单元格一致）。
assert.match(INDEX_HTML, /\.inspector-cell-type \{[\s\S]*?text-align: center;/, "the type cell must be centered");
assert.match(INDEX_HTML, /\.inspector-list-head \.inspector-col-button\[data-inspector-sort="fileType"\] \{\s*justify-content: center;/, "the type header must be centered too");

// 10.5 来源列只表达 project/skill 徽标，本地文件回落「本地」。
const sourceLabelSrc = extractFunctionSource(INDEX_HTML, "function inspectorSourceLabel(item) {");
assert.match(sourceLabelSrc, /inspectorSourceBadges\(item\)\.join/, "the source column must list project/skill badges only");
assert.doesNotMatch(sourceLabelSrc, /item\.tags/, "user tags must not leak into the source column");
assert.match(sourceLabelSrc, /t\("inspector\.sourceLocal"\)/, "items without any source badge must fall back to the local label");
assert.match(I18N, /sourceLocal:\s*"本地"/, "zh must define the local-source fallback");
assert.match(I18N, /sourceLocal:\s*"Local"/, "en must define the local-source fallback");

// 10.6 表头列宽拖拽：只有三个真实的列间边界；每次拖拽只在相邻两列间转移宽度。
const listHeadSrc = extractFunctionSource(INDEX_HTML, "function renderInspectorListHead() {");
assert.match(listHeadSrc, /data-inspector-col-handle="\$\{column\.key\}"/, "resizable columns must expose a drag handle");
assert.match(listHeadSrc, /\{ key: "fileName"[^\n]*resizable: true \}/, "the name column must be directly resizable");
assert.match(listHeadSrc, /\{ key: "modifiedAt"[^\n]*resizable: false \}/, "the modified-at column is the absorber and carries no handle");
assert.match(INDEX_HTML, /nutbook\.inspector\.colWidths/, "custom column widths must persist to localStorage");
assert.match(
  INDEX_HTML,
  /const rowsWidth = els\.inspectorRows\?\.clientWidth \|\| paneWidth;[\s\S]*?const available = Math\.max\(176, rowsWidth - 66\);/,
  "persisted widths must be fitted to the real row content box, including both paddings and all three grid gaps"
);
assert.match(
  INDEX_HTML,
  /available < 234[\s\S]*?modifiedAt: 64[\s\S]*?widths \? 64 : 72/,
  "the time column must reserve the fitted default date width while allowing manual compaction"
);
assert.match(INDEX_HTML, /grid-template-columns: var\(--inspector-cols, minmax\(0, 1fr\) 56px 64px 82px\);\s*gap: 8px;\s*(?:\/\*[\s\S]*?\*\/\s*)?padding: 6px 8px 6px 22px;/, "the default tracks must reserve only compact source/date widths so title receives the remainder");
assert.match(INDEX_HTML, /grid-template-columns: var\(--inspector-cols, minmax\(0, 1fr\) 56px 64px 82px\);\s*gap: 8px;\s*align-items: center;/, "rows must share the same template so cells stay aligned");
const applyColumnsSrc = extractFunctionSource(INDEX_HTML, "function applyInspectorColumns() {");
assert.match(applyColumnsSrc, /fileName: Math\.max\(64, available - 192\), fileType: 56, source: 64, modifiedAt: 72/, "default widths must fit a full date and give all remaining width to the title");
assert.match(applyColumnsSrc, /const scale = preferredTotal > 0 \? available \/ preferredTotal : 1;/, "persisted widths must adapt proportionally when the pane size changes");
assert.match(INDEX_HTML, /\.inspector-col-button \{[\s\S]*?padding: 2px 0;/, "header buttons must carry no horizontal padding so labels line up with cell text");
assert.match(INDEX_HTML, /\.inspector-cell-name \{[\s\S]*?white-space: nowrap;/, "cells must never wrap into vertical letter stacks");
assert.match(INDEX_HTML, /\.inspector-cell-type \{[\s\S]*?white-space: nowrap;/, "type cells must stay on one line");
assert.match(INDEX_HTML, /function inspectorRowMarkup\(item\) \{[\s\S]*?const modifiedDate = formatInspectorListDate\(item\.modifiedAt \|\| ""\);[\s\S]*?const modifiedTime = formatInspectorListTime\(item\.modifiedAt \|\| ""\);/, "the list must render date and time as independently responsive fragments");
assert.match(INDEX_HTML, /function formatInspectorListDate\(value\) \{[\s\S]*?year: "numeric",[\s\S]*?month: "2-digit",[\s\S]*?day: "2-digit"/, "the list date formatter must intentionally omit hours and minutes");
assert.match(INDEX_HTML, /function formatInspectorListTime\(value\) \{[\s\S]*?hour: "2-digit",[\s\S]*?minute: "2-digit"/, "the list time formatter must keep hours and minutes available after widening");
assert.match(INDEX_HTML, /data-inspector-time-detail="true"[\s\S]*?\.inspector-cell-time-clock/, "the time fragment must appear only after the effective time column becomes wide enough");
assert.match(INDEX_HTML, /const requestedDelta = Math\.round\(moveEvent\.clientX - startX\)/, "dragging right must widen the left column naturally");
const colDragSrc = extractFunctionSource(INDEX_HTML, "els.inspectorListHead?.addEventListener(\"pointerdown\"");
assert.match(colDragSrc, /fileName: \[64, 560\]/, "the name column must keep a safe width range");
assert.match(colDragSrc, /fileType: \[40, 160\]/, "the type column must keep a safe width range");
assert.match(colDragSrc, /source: \[48, 260\]/, "the source column must keep a safe width range");
assert.match(colDragSrc, /modifiedAt: \[64, 220\]/, "the modified-at column must allow a user to compact it below the default full-date width");
assert.match(colDragSrc, /fileName: measure\("fileName", 180\)/, "the first drag must freeze the name column to px as well");
assert.match(colDragSrc, /const neighborKey = columnKeys\[columnKeys\.indexOf\(columnKey\) \+ 1\]/, "each handle must resolve only its immediate right neighbor");
assert.match(colDragSrc, /\[columnKey\]: next, \[neighborKey\]: nextNeighbor/, "a drag must update only the two columns on its boundary");
assert.match(wireInspectorSrc, /resetInspectorColumns\(\)/, "double-clicking a handle must reset the column widths");
assert.match(applyLayoutSrc, /applyInspectorColumns\(\)/, "entering the inspector view must apply the persisted column widths");
assert.match(wireInspectorSrc, /inspectorColDragUsed/, "a column drag must suppress the trailing sort click");

// 10.7 右栏单一框体：舞台 + 详情 + 打开横条同框；打开入口为底部通栏横条。
assert.match(
  INDEX_HTML,
  /<div id="inspectorPreviewFrame" class="inspector-preview-frame">\s*<div id="inspectorPreviewStage" class="inspector-preview-stage">[\s\S]*?<div id="inspectorDetails" class="inspector-details" data-i18n-skip><\/div>\s*<button type="button" id="inspectorOpenBar" class="inspector-open-bar" data-inspector-open="1" disabled><\/button>\s*<\/div>/,
  "preview stage, details and the open bar must live inside one framed container"
);
assert.match(wireInspectorSrc, /els\.inspectorOpenBar\?\.addEventListener\("click"/, "the bottom open bar must be wired directly");
assert.match(INDEX_HTML, /\.inspector-open-bar \{[\s\S]*?width: 100%;[\s\S]*?border-radius: 0 0 13px 13px;/, "the open bar must be a full-width bottom strip inside the frame");

// 10.8 详情区字段扩展（大小 / 修改时间 / 最近打开 / 所属库 / 合并标签 / 路径）。
const detailsSrc = extractFunctionSource(INDEX_HTML, "function renderInspectorDetails() {");
for (const marker of ["formatInspectorFileSize(item.fileSize)", "t(\"inspector.detailsOpened\")", "inspectorLibraryName(item)", "t(\"inspector.detailsTags\")", "t(\"inspector.detailsPath\")"]) {
  assert.match(detailsSrc, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `details must surface ${marker}`);
}
assert.match(detailsSrc, /const sourceBadgeChips = sourceBadges\.map/, "source badges must be projected into the shared tags row");
assert.match(detailsSrc, /\$\{sourceBadgeChips\.join\(""\)\}\$\{tagChips\.join\(""\)\}/, "source badges and custom tags must render in one shared row");
assert.doesNotMatch(detailsSrc, /t\("inspector\.detailsSource"\)/, "details must not render a duplicate source row");
assert.match(INDEX_HTML, /\.inspector-details-chips \.inspector-details-source-badge \{[\s\S]{0,240}?max-width: min\(196px, 100%\);/, "long source chips must be capped inside the tags row");
assert.match(INDEX_HTML, /\.inspector-details-chips \.inspector-details-source-badge \.source-badge-label \{[\s\S]{0,240}?text-overflow: ellipsis;[\s\S]{0,120}?white-space: nowrap;/, "long source labels must stay single-line and ellipsize");
assert.match(INDEX_HTML, /\.inspector-details-chips \{[\s\S]{0,260}?direction: ltr;[\s\S]{0,120}?text-align: left;/, "tag chips must override the generic rtl detail-value rule and start at the left edge");
assert.match(INDEX_HTML, /function formatInspectorFileSize\(bytes\)/, "a file size formatter must exist");
assert.match(INDEX_HTML, /openBar\.disabled = !item \|\| isItemPathMissing\(item\)/, "the open bar must stay disabled without a selectable item");
assert.match(detailsSrc, /const absolutePath = item\.filePath \|\| relativePath;/, "the path row must resolve to the file absolute path");
assert.match(detailsSrc, /<dd class="inspector-details-path" title="/, "the absolute path must be the visible row content (full path on title)");
assert.match(INDEX_HTML, /\.inspector-details-line dd\.inspector-details-path \{\s*direction: ltr;/, "the path row must stay LTR so absolute paths are not bidi-reordered");
assert.match(INDEX_HTML, /\.inspector-details-line dd\.inspector-details-path \{[\s\S]{0,320}?-webkit-line-clamp: 2;[\s\S]{0,320}?min-height: 3em;/, "the address row must reserve two lines and show long paths across both");
assert.match(detailsSrc, /\$\{libraryName \? `<div><dt>\$\{escapeHtml\(t\("inspector\.detailsLibrary"\)\)\}/, "the library row must be omitted entirely when no library resolves");
assert.doesNotMatch(detailsSrc, /libraryName \|\| "—"/, "the library row must not hardcode an em-dash placeholder");

// 10.9 MD 预览 0.75 缩放靠齐 HTML 截图字号 + 「更多/收起」框内滚动。
assert.match(mountSrc, /inspector-preview-card inspector-preview-text inspector-preview-pending/, "the md preview card must carry the text-scale class from mount time");
assert.match(INDEX_HTML, /\.inspector-preview-card\.inspector-preview-text \{[\s\S]*?width: 133\.333%;[\s\S]*?transform: scale\(0\.75\);/, "the md preview must scale 0.75 with a compensating width so content still fills the card");
assert.match(INDEX_HTML, /\.inspector-preview-stage\.inspector-preview-expanded \.inspector-preview-scroll \{\s*overflow-y: auto;/, "「更多」must unlock scrolling inside the stage");
assert.match(INDEX_HTML, /\.inspector-preview-stage\.inspector-preview-expanded \.inspector-preview-scroll \{\s*overflow-y: auto;\s*padding-bottom: 12px;/, "expanded scrolling must not retain a large bottom whitespace budget");
assert.match(INDEX_HTML, /\.inspector-preview-stage\.inspector-preview-expanded \.inspector-preview-fade \{\s*display: block;\s*height: 16px;/, "expanded scrolling must retain only a short fade without a controls row");
assert.doesNotMatch(INDEX_HTML, /id="inspectorMoreButton"|id="inspectorPreviewControls"/, "the root WebView must not own a more-button or reserve a controls row");
assert.match(INDEX_HTML, /function inspectorMoreOverlayBounds\(\)/, "the main page must calculate the native island from the live stage rect");
const moreBoundsSrc = extractFunctionSource(INDEX_HTML, "function inspectorMoreOverlayBounds() {");
assert.match(moreBoundsSrc, /stage\.left \+ stage\.width \/ 2 - size \/ 2/, "the more island must remain horizontally centered in the preview content");
assert.match(moreBoundsSrc, /stage\.bottom - inset - size/, "the more island must sit inside the preview content instead of on the details divider");
assert.match(moreBoundsSrc, /x: buttonX - 59, y: buttonY - 40, width: 152, height: 74/, "the native island bounds must be fixed before hover so WebKit never resizes it for a tooltip");
assert.doesNotMatch(moreBoundsSrc, /tooltipVisible/, "hover state must never participate in native island geometry");
assert.match(INDEX_HTML, /attach_inspector_more_overlay_command/, "the main page must attach the more control as a native overlay");
assert.match(INDEX_HTML, /close_inspector_more_overlay_command/, "leaving or replacing a preview must close the native island");
assert.match(INDEX_HTML, /selectionToken/, "overlay messages must carry a selection token so stale clicks are rejected");
assert.match(INDEX_HTML, /new ResizeObserver\(\(\) =>/, "the native island must follow split and frame size changes");
const hideMoreSrc = extractFunctionSource(INDEX_HTML, "function hideInspectorMoreButton() {");
assert.match(hideMoreSrc, /close_inspector_more_overlay_command/, "every reload must close the more island again");
assert.match(hideMoreSrc, /inspector-preview-expanded/, "hiding the more button must also clear the expanded stage state");
assert.match(wireInspectorSrc, /__NUTBOOK_HANDLE_INSPECTOR_MORE_OVERLAY_ACTION__/, "the native island must return its action to the main WebView");
assert.match(wireInspectorSrc, /setInspectorPreviewExpanded\(expanded\)/, "the returned action must toggle scrolling through the shared state transition");
assert.match(MORE_OVERLAY, /background: transparent/, "the native island must be transparent outside its button");
assert.match(MORE_OVERLAY, /width: 30px;[\s\S]{0,80}?height: 30px;/, "the island must render a compact circular control");
assert.match(MORE_OVERLAY, /__NUTBOOK_INSPECTOR_MORE_OVERLAY__:/, "the island must return clicks through its host action prefix");
assert.match(MORE_OVERLAY, /aria-expanded/, "the island must expose expanded state accessibly");
assert.match(MORE_OVERLAY, /id="tooltip" class="tooltip" role="tooltip"/, "the native island must render an in-island tooltip");
assert.match(MORE_OVERLAY, /tooltip\.classList\.toggle\("show"/, "the tooltip must follow the overlay hover/focus state");
assert.match(MORE_OVERLAY, /left: 61px;/, "the fixed island must keep its button centered");
assert.match(MORE_OVERLAY, /\.tooltip \{[\s\S]*?left: 50%;/, "the tooltip must be centered directly above the fixed button");
assert.doesNotMatch(MORE_OVERLAY, /action: "tooltip"|tooltip-visible/, "hover must stay within the child WebView and never request a native resize");
assert.doesNotMatch(wireInspectorSrc, /action === "tooltip"/, "the main WebView must not resync the native island on hover");
assert.match(MORE_OVERLAY, /window\.addEventListener\("wheel"/, "wheel input over the native island must be forwarded instead of swallowed");
assert.match(MORE_OVERLAY, /action: "scroll", deltaY/, "wheel input must carry the accumulated scroll delta to the host");
assert.match(wireInspectorSrc, /payload\?\.action === "scroll"/, "the main preview must consume forwarded overlay scrolling");
assert.match(wireInspectorSrc, /previewBody\.scrollTop \+= deltaY/, "forwarded overlay scrolling must move the real preview scroller");
assert.match(I18N, /showMore:\s*"显示更多内容"/, "zh must define the more tooltip copy");
assert.match(I18N, /showLess:\s*"收起内容"/, "zh must define the collapse tooltip copy");
assert.match(I18N, /showMore:\s*"Show more content"/, "en must define the more tooltip copy");
assert.match(I18N, /showLess:\s*"Collapse content"/, "en must define the collapse tooltip copy");

// 10.10 渐隐层贴住舞台内缘，不再留 1px 未遮盖缝。
assert.match(INDEX_HTML, /\.inspector-preview-fade \{\s*position: absolute;\s*left: 0;\s*right: 0;\s*bottom: 0;/, "the fade must sit flush with the stage edges");
assert.doesNotMatch(INDEX_HTML, /\.inspector-preview-fade \{[\s\S]{0,200}?bottom: 1px;/, "the old 1px inset gap must be gone");

// 10.11 新增 i18n keys 双语齐备。
for (const name of ["colResizeHint", "detailsSize", "detailsOpened", "detailsNeverOpened", "detailsLibrary", "detailsSource", "detailsTags", "detailsPath"]) {
  const occurrences = I18N.split(`        ${name}:`).length - 1;
  assert.ok(occurrences >= 2, `inspector.${name} must exist in both localization dictionaries`);
}


// ── 11. 最终 bundle 的只读运行面（真实 Chromium + 最终产物）───────────────
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.setContent(`
    <main>
      <div id="inspectorRoot" style="width: 860px;"></div>
      <div id="openRoot" style="width: 860px;"></div>
    </main>
    <style>
      /* 与宿主一致的标题隐藏/正文排版锚点 */
      #inspectorRoot .ProseMirror > h1:first-child,
      #openRoot .ProseMirror > h1:first-child { display: none; }
      .ProseMirror { outline: none; }
    </style>
  `);
  await page.addScriptTag({ content: BUNDLE, type: "module" });
  await page.waitForFunction(() => Boolean(window.NutbookMarkdownEditor?.create));

  const sampleMarkdown = [
    "# Inspector Title",
    "",
    "Paragraph with **bold**, *italic* and `inline code` text for measurement.",
    "",
    "## Second Level Heading",
    "",
    "- first bullet item",
    "- second bullet item",
    "",
    "> A blockquote line used in the first-screen geometry comparison.",
    "",
    "```js",
    "const answer = 42;",
    "console.log(answer);",
    "```",
    "",
    "| Column A | Column B |",
    "| --- | --- |",
    "| alpha | beta |",
    "",
    "![tiny](data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==)",
    ""
  ].join("\n");

  const results = await page.evaluate(async (markdown) => {
    const editorApi = window.NutbookMarkdownEditor;
    const resolveImageSrc = (src) => src;

    const make = async (rootId, readOnly) => {
      const root = document.getElementById(rootId);
      root.innerHTML = "";
      return editorApi.create({ root, markdown, fileName: "inspector.md", readOnly, resolveImageSrc });
    };
    const inspector = await make("inspectorRoot", true);
    const open = await make("openRoot", false);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const collect = (rootId) => {
      const proseMirror = document.querySelector(`#${rootId} .ProseMirror`);
      const entries = [...proseMirror.children]
        .filter((node) => getComputedStyle(node).display !== "none")
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            tag: node.tagName,
            top: rect.top,
            height: Math.round(rect.height * 10) / 10,
            width: Math.round(rect.width * 10) / 10
          };
        });
      // 两个挂载点在页面上是纵向堆叠的：top 取相对首个元素的距离，
      // 绝对高度/宽度仍然直接可比。
      const origin = entries.length ? entries[0].top : 0;
      return entries.map((entry) => ({
        tag: entry.tag,
        top: Math.round((entry.top - origin) * 10) / 10,
        height: entry.height,
        width: entry.width
      }));
    };

    // 只读隔离：模拟用户输入/撤销尝试。
    const before = inspector.getMarkdown();
    const readonlyProseMirror = document.querySelector("#inspectorRoot .ProseMirror");
    readonlyProseMirror.focus();
    document.execCommand("insertText", false, "MALLORY EDIT");
    const afterTyping = inspector.getMarkdown();
    readonlyProseMirror.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancellable: true }));
    const afterUndo = inspector.getMarkdown();

    const extraUi = {
      formatToolbar: Boolean(document.querySelector("#inspectorRoot .markdown-format-toolbar")),
      tableToolbar: Boolean(document.querySelector("#inspectorRoot .markdown-table-toolbar")),
      insertMenu: Boolean(document.querySelector("#inspectorRoot .markdown-insert-menu")),
      imageAlignToolbar: Boolean(document.querySelector("#inspectorRoot .markdown-image-align-toolbar")),
      selects: document.querySelectorAll("#inspectorRoot select").length
    };
    const imageReady = [...document.querySelectorAll("#inspectorRoot img")].every((img) => img.complete);

    const left = collect("inspectorRoot");
    const right = collect("openRoot");

    inspector.destroy();
    const inspectorHtmlAfterDestroy = Boolean(document.querySelector("#inspectorRoot .ProseMirror"));
    open.destroy();

    return {
      editables: {
        inspector: readonlyProseMirror.getAttribute("contenteditable"),
        open: "true"
      },
      extraUi,
      imageReady,
      hasChanges: inspector.hasChanges(),
      typingSuppressed: afterTyping === before && before.includes("**bold**"),
      undoSuppressed: afterUndo === before,
      inspectorHtmlAfterDestroy,
      left,
      right
    };
  }, sampleMarkdown);

  assert.equal(results.editables.inspector, "false", "the read-only ProseMirror must not be contenteditable");
  assert.equal(results.editables.open, "true", "the open-page editor stays editable");
  assert.equal(results.extraUi.formatToolbar, false, "no format toolbar in read-only mode");
  assert.equal(results.extraUi.tableToolbar, false, "no table toolbar in read-only mode");
  assert.equal(results.extraUi.insertMenu, false, "no insert menu in read-only mode");
  assert.equal(results.extraUi.imageAlignToolbar, false, "no image align toolbar in read-only mode");
  assert.equal(results.extraUi.selects, 0, "no code language selects in read-only mode");
  assert.equal(results.imageReady, true, "images resolve through the shared resolver");
  assert.equal(results.typingSuppressed, true, "execCommand typing must not change the read-only document");
  assert.equal(results.undoSuppressed, true, "undo must not change the read-only document (no history plugin)");
  assert.equal(results.hasChanges, false, "read-only sessions never report changes");
  assert.equal(results.inspectorHtmlAfterDestroy, false, "destroy removes the read-only DOM");

  // 首屏几何对比（readOnly vs 正式编辑实例，同宽）——同源渲染的第一性证据。
  assert.ok(results.left.length >= 6, "the first screen must include the full sample variety");
  assert.equal(results.left.length, results.right.length, "read-only and open-page instances must render the same structure");
  results.left.forEach((entry, index) => {
    const other = results.right[index];
    assert.equal(entry.tag, other.tag, `element ${index} type must match`);
    assert.ok(Math.abs(entry.top - other.top) <= 1, `element ${index} (${entry.tag}) top must match: ${entry.top} vs ${other.top}`);
    assert.ok(Math.abs(entry.height - other.height) <= 1, `element ${index} (${entry.tag}) height must match: ${entry.height} vs ${other.height}`);
    assert.ok(Math.abs(entry.width - other.width) <= 1, `element ${index} (${entry.tag}) width must match: ${entry.width} vs ${other.width}`);
  });

  // 真实首页 DOM 几何：截图曾暴露右栏 flex 子框跨越分隔条覆盖左栏，且 hidden
  // 的 HTML「更多」被作者样式 display:flex 重新显示为空白圆。必须直接测盒模型，
  // 不能仅匹配 grid/CSS 文本。
  const inspectorPage = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await inspectorPage.addInitScript(() => {
    localStorage.setItem("nutbook.inspector.colWidths", JSON.stringify({ fileName: 360, fileType: 160, source: 260, modifiedAt: 220 }));
  });
  await inspectorPage.goto(new URL("../dist/index.html", import.meta.url).href);
  await inspectorPage.waitForSelector(".item-card");
  await inspectorPage.click("#viewModeButtonHome");
  await inspectorPage.waitForSelector("#inspectorShell:not([hidden])");
  const inspectGeometry = () => inspectorPage.evaluate(() => {
    const rect = (selector) => {
      const value = document.querySelector(selector)?.getBoundingClientRect();
      return value && { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
    };
    return {
      list: rect(".inspector-list-pane"),
      splitter: rect("#inspectorSplitter"),
      preview: rect(".inspector-preview-pane"),
      rows: rect("#inspectorRows"),
      firstRow: rect(".inspector-row"),
      firstTime: rect(".inspector-row .inspector-cell-time"),
      head: rect("#inspectorListHead")
    };
  });
  const assertNoPaneOverlap = (geometry, label) => {
    assert.ok(geometry.list.right <= geometry.splitter.left + 0.5, `${label}: left pane must end at the splitter, not under the right pane`);
    assert.ok(geometry.splitter.right <= geometry.preview.left + 0.5, `${label}: right pane must begin after the splitter`);
  };
  let geometry = await inspectGeometry();
  assertNoPaneOverlap(geometry, "initial inspector layout");
  assert.ok(geometry.firstRow.right <= geometry.rows.right + 0.5, "a persisted wide column preference must not let the row background end before its last cell");
  assert.ok(geometry.firstTime.right <= geometry.firstRow.right + 0.5, "the time cell must remain inside the selected-row paint box");
  assert.ok(geometry.head.height >= 28, "the header must retain a full single-line text height");
  assert.doesNotMatch(INDEX_HTML, /inspectorMoreButton|inspectorPreviewControls/, "HTML must not leave a root-WebView more button or reserved controls row");
  assert.match(INDEX_HTML, /\.inspector-preview-frame \{[\s\S]{0,180}?min-width: 0;/, "the right flex frame must be allowed to shrink inside its grid track");
  assert.match(INDEX_HTML, /\.inspector-preview-stage \{[\s\S]{0,640}?overflow: hidden;[\s\S]{0,640}?contain: paint;/, "the stage must hard-clip transformed scrolling content before the native island boundary");
  assert.doesNotMatch(INDEX_HTML, /\.inspector-preview-stage \{[^}]*isolation: isolate;/, "the failed stage isolation choreography must stay deleted");
  assert.match(INDEX_HTML, /\.inspector-preview-scroll \{[\s\S]{0,180}?z-index: 0;/, "the scrolling content must remain in the root WebView below the native island");
  assert.match(INDEX_HTML, /\.inspector-preview-fade \{[\s\S]{0,220}?z-index: 1;/, "the fade remains above scrolling content without reserving a controls row");
  const splitter = geometry.splitter;
  await inspectorPage.mouse.move(splitter.left + 5, splitter.top + 120);
  await inspectorPage.mouse.down();
  await inspectorPage.mouse.move(splitter.left - 240, splitter.top + 120);
  await inspectorPage.mouse.up();
  geometry = await inspectGeometry();
  assertNoPaneOverlap(geometry, "after dragging the right pane left");
  await inspectorPage.close();
} finally {
  await browser.close();
}

console.log("test-inspector-view: all assertions passed");
