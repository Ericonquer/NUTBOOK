// PR B 外部打开：入口可用性与反例回归（Codex review R1）。
//
// 覆盖 Codex R1 的六项阻塞在前端/后端的可失败回归：
//  1. 入口必须真的启动：listenRaw 在只有 __TAURI_INTERNALS__（withGlobalTauri
//     未启用）的运行面必须可用；订阅完成（await）后才 ready；拖放不再依赖
//     window.__TAURI__.webview。用 Node VM 在真实运行条件下执行协调器函数。
//  2. 资源冲突：只清理本操作 lease 内的新建资源，用户既有文件必须存活；
//     目标 no-clobber；symlink 不穿透。
//  3. 加入提交门：关闭先完成时零入库；commit 先完成时保留库状态且不复活标签。
//  4. 另存副本跨目录走同一资源后端。
//  5. 另存为：快照在 picker 之后取、dirty 不盲清、watcher 失败可重试。
//  6. leave 裁决在有任何副作用的解析之前（两阶段 resolve）。
//
// Codex review R2 追加：
//  7. 单文件来源原子发布：库行+item 行同一事务、提交门回调在事务内裁决，
//     提交门外不可见；不再用「先建库 + 事后回滚」的补偿式写法。
//  8. retarget 清除旧 itemId 绑定；前端另存为成功后清 joined/itemId。
//  9. 跨目录另存收敛 draft/history 引用资源（historyResourcePaths），
//     durable 后失败按写出副本恢复（written_copy_elsewhere）；前端短编辑锁。

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const INDEX_HTML = readFileSync("dist/index.html", "utf8");
const I18N_JS = readFileSync("dist/i18n.js", "utf8");
const EXTERNAL_RS = readFileSync("src-tauri/src/core/external_open.rs", "utf8");
const COMMANDS_RS = readFileSync("src-tauri/src/commands/external.rs", "utf8");
const MAIN_RS = readFileSync("src-tauri/src/main.rs", "utf8");
const DRAG_CAPABILITY = readFileSync("src-tauri/capabilities/main-event.json", "utf8");
const SCAN_RS = readFileSync("src-tauri/src/core/scan_coordinator.rs", "utf8");
const DB_RS = readFileSync("src-tauri/src/db/mod.rs", "utf8");
const EDITOR_JS = readFileSync("src/markdown-editor.js", "utf8");

function extractFunctionSource(source, startMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start !== -1, `function source not found: ${startMarker}`);
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

// ── 1. 事件桥：运行时解析，不依赖 window.__TAURI__ ─────────────────────────
assert.match(
  INDEX_HTML,
  /function listenRaw\(event, handler, target\) \{[\s\S]*?window\.__TAURI__\?\.event\?\.listen[\s\S]*?window\.__TAURI_INTERNALS__[\s\S]*?plugin:event\|listen/,
  "listenRaw must resolve at runtime and fall back to plugin:event|listen via __TAURI_INTERNALS__"
);
assert.doesNotMatch(
  INDEX_HTML,
  /const listenRaw = window\.__TAURI__\?\.event\?\.listen;/,
  "listenRaw must not be captured once at load time (it is undefined without withGlobalTauri)"
);

const coordinatorSrc = extractFunctionSource(INDEX_HTML, "async function startExternalOpenCoordinator() {");
assert.match(
  coordinatorSrc,
  /await Promise\.all\(\[[\s\S]*?listenRaw\(/,
  "subscriptions must be awaited before the ready gate"
);
assert.match(
  coordinatorSrc,
  /await invoke\("external_open_ready"\)/,
  "ready must be reported to the backend after subscriptions succeed"
);
assert.match(
  coordinatorSrc,
  /startExternalOpenDrainFallback\(\)/,
  "a failed subscription must fall back to an observable polling path, not a silent return"
);
// 诊断清理后（gui_drag_capability_fix 验收通过）：拖放投递权单一归属 Rust
// 原生层，前端不得再订阅 tauri://drag-drop（也无 nutbook-drag-diag 回显）。
assert.doesNotMatch(
  INDEX_HTML,
  /listenRaw\("tauri:\/\/drag-drop"/,
  "drag-drop delivery is owned by the Rust native enqueue; the JS side must not subscribe to tauri://drag-drop"
);
assert.doesNotMatch(
  INDEX_HTML,
  /nutbook-drag-diag|dragDiagLog|showDragDiagnostic|drag_diag_log/,
  "temporary drag diagnostics must be fully removed from the frontend"
);
assert.doesNotMatch(
  INDEX_HTML,
  /window\.__TAURI__\?\.webview\?\.getCurrentWebview/,
  "drag and drop must not depend on the un-injected __TAURI__.webview bridge"
);

// ── 2. 两阶段 resolve：leave 裁决在副作用之前 ──────────────────────────────
assert.match(
  INDEX_HTML,
  /payload: \{ path, phase: "inspect" \}/,
  "the external open flow must start with a read-only inspect phase"
);
assert.match(
  INDEX_HTML,
  /await ensureCanLeaveActiveTabForExternalOpen\(\)/,
  "the leave decision must still gate every external activation"
);
assert.match(
  INDEX_HTML,
  /payload: \{ path, phase: "open" \}/,
  "the side-effecting resolve (session + watcher) must only run after the leave is granted"
);
assert.match(
  COMMANDS_RS,
  /let inspect_only = payload\.phase\.as_deref\(\) == Some\("inspect"\)/,
  "the command must honour the inspect phase"
);
assert.match(
  COMMANDS_RS,
  /\/\/ inspect 阶段到此为止：零副作用（无 session、无 watcher、无入库）。[\s\S]*?if inspect_only \{/,
  "inspect must return before creating a session or watcher"
);
assert.match(
  EXTERNAL_RS,
  /pub fn plan_external_path\(state: &AppState, raw_path: &str\) -> Result<ExternalPathPlan, AppError>/,
  "the read-only classification must live in core (testable without a Tauri handle)"
);

// ── 3. 资源 lease / no-clobber / symlink ───────────────────────────────────
assert.match(EXTERNAL_RS, /pub struct ResourceCopyLease/, "resource copies must be tracked by a lease");
assert.doesNotMatch(
  EXTERNAL_RS,
  /fn cleanup_copied_resources\(/,
  "cleanup must never be derived from the document body (it would delete pre-existing user files)"
);
assert.match(
  EXTERNAL_RS,
  /copy_referenced_local_resources\([\s\S]*?lease: &mut ResourceCopyLease,/,
  "the resource backend must take the lease explicitly"
);
assert.match(
  EXTERNAL_RS,
  /if metadata\.file_type\(\)\.is_symlink\(\) \{\s*return Err\(AppError::InvalidParams\);/,
  "a symlink target must be rejected instead of written through"
);
assert.match(
  EXTERNAL_RS,
  /fn write_new_file_no_clobber\(destination: &Path, bytes: &\[u8\]\)/,
  "resource creation must be no-clobber (O_EXCL)"
);
assert.match(EXTERNAL_RS, /create_new\(true\)/, "resource creation must use O_EXCL semantics");

// ── 4. 加入提交门 ─────────────────────────────────────────────────────────
assert.match(EXTERNAL_RS, /pub fn begin_join\(/, "the join must open a commit gate");
assert.match(EXTERNAL_RS, /pub fn finish_join\(/, "the join must close the commit gate in one place");
assert.match(
  EXTERNAL_RS,
  /fn join_with_commit_gate\([\s\S]*?is_joinable\(&session_id, session\.generation\)/,
  "the commit gate must re-check session liveness before and inside the locked write path"
);
assert.doesNotMatch(
  EXTERNAL_RS,
  /fn rollback_created_library\(/,
  "R2-1: rollback compensation must be gone - publication is atomic, not compensated"
);
assert.match(
  DB_RS,
  /pub fn create_single_file_source_atomic<F: FnOnce\(\) -> bool>\(/,
  "R2-1: the library row and the first scan item row must publish in one transaction with the gate callback inside"
);
assert.match(
  EXTERNAL_RS,
  /create_single_file_source_atomic\(/,
  "R2-1: the single-file join must publish through the atomic transaction"
);
assert.match(
  DB_RS,
  /if !precondition\(\) \{\s*return Ok\(SingleFileSourcePublish::Aborted\);/,
  "R2-1: the commit-gate callback must run inside the transaction before any write"
);
assert.doesNotMatch(
  EXTERNAL_RS,
  /join_via_single_file_source[\s\S]{0,900}?\.upsert_library\(/,
  "R2-1: the new source must not be published outside the commit gate (pre-lock upsert is the R2 finding)"
);
assert.match(
  SCAN_RS,
  /pub fn apply_delta_if<F: FnOnce\(\) -> bool>\(/,
  "the join gate must delegate to an apply_delta variant that re-checks liveness inside the library->db lock order (no outer db lock: ABBA vs delete_library)"
);
assert.match(
  SCAN_RS,
  /pub fn run_scan_if<F: FnOnce\(\) -> bool>\(/,
  "single-file join must scan through the same locked-precondition variant"
);
assert.doesNotMatch(
  EXTERNAL_RS,
  /join_with_commit_gate[\s\S]{0,400}?db_write_lock\(\)/,
  "join_with_commit_gate must NOT acquire the global db write lock itself (lock-order inversion vs delete_library)"
);

// ── 5. 另存副本 / 另存为 ───────────────────────────────────────────────────
assert.match(
  EXTERNAL_RS,
  /if !same_directory\(&source_dir, &target_dir\) \{\s*copy_referenced_local_resources\(/,
  "save-copy must copy referenced resources when the target directory differs"
);
assert.match(
  EXTERNAL_RS,
  /Some\(app\) => state[\s\S]*?ensure_dir_watch\(session_id, app\.clone\(\)\)\s*\.is_ok\(\),/,
  "a watcher failure after the body is durable must degrade, not roll back the body"
);
assert.match(EXTERNAL_RS, /watch_attached: bool/, "save-as must report whether the watcher is attached");
assert.match(MAIN_RS, /commands::external::external_session_attach_watch,/, "the watch retry command must be registered");
assert.match(
  INDEX_HTML,
  /invoke\("external_session_attach_watch"/,
  "the frontend must retry attaching the watcher instead of re-saving"
);
const saveAsSrc = extractFunctionSource(INDEX_HTML, "async function externalSaveAs(tab) {");
assert.match(
  saveAsSrc,
  /content = markdownContentForTab\(tab\);/,
  "the save-as snapshot must be taken after the picker returns"
);
assert.match(
  saveAsSrc,
  /tab\.isDirty = latest !== content;/,
  "edits produced during the save must stay dirty instead of being silently dropped"
);
assert.match(
  saveAsSrc,
  /const saveLock = await acquireExternalSaveLock\(tab\);\s*if \(!saveLock\) return;/,
  "R3-1: the save window must hold a lock on the tab's real editor instance (or fail the save)"
);
assert.match(
  saveAsSrc,
  /releaseExternalSaveLock\(tab, saveLock\)/,
  "R3-1: the captured lock object (not the global textarea) must be released"
);
const lockSrc = extractFunctionSource(INDEX_HTML, "async function acquireExternalSaveLock(tab) {");
assert.match(
  lockSrc,
  /appState\.activeMarkdownEditorTabId[\s\S]*?editor\?\.lockEditing/,
  "R3-1: the lock must target the tab's real Milkdown editor instance, not a global element"
);
assert.doesNotMatch(
  lockSrc,
  /\.blur\(|saveLockRestore/,
  "R3-1: blur/focus restoration must be gone - the lock is a PM permission boundary, not a focus trick"
);
assert.doesNotMatch(
  lockSrc,
  /editorArea[\s\S]*?readOnly[\s\S]*?editor\?\.lockEditing/,
  "R3-1: the fallback textarea must only be locked when there is no editor instance"
);
assert.match(
  lockSrc,
  /const locked = await editor\.lockEditing\(\);\s*\/\/ R4-3[^\n]*\n\s*if \(locked !== true\) \{/,
  "R4-3: a busy (composition-ongoing) lock must abort the save window instead of proceeding"
);
assert.match(
  lockSrc,
  /saveLockCompositionBusy/,
  "R4-3: the busy abort must surface a retryable toast/status, not a silent failure"
);
assert.doesNotMatch(
  lockSrc,
  /addEventListener\("compositionstart"/,
  "R5: the lock function must not install temporary composition-state listeners (it would miss an already-ongoing composition)"
);
assert.match(
  lockSrc,
  /if \(isTrackedTextareaComposing\(textarea\)\) \{/,
  "R5: the lock must read the composition state that the mount-time persistent tracker maintains"
);
assert.match(
  INDEX_HTML,
  /setupExternalTextareaCompositionTracking\(editorArea\);/,
  "R5: the fallback textarea must be tracked persistently from mount time, not at save time"
);
assert.match(
  INDEX_HTML,
  /__externalCompositionTracking\?\.dispose\?\.\(\)/,
  "R5: re-render must dispose the replaced textarea's tracking listeners"
);
assert.match(
  lockSrc,
  /const waitTimer = window\.setTimeout\(\(\) => finish\(false\), 2000\);\s*\}\);\s*if \(!compositionSettled\) \{/,
  "R4-3: the textarea fallback must treat the composition deadline as busy, never force readOnly mid-composition"
);
assert.match(
  EDITOR_JS,
  /async lockEditing\(\) \{[\s\S]*?view\.composing[\s\S]*?serializeCurrentDocument\(\)[\s\S]*?view\.setProps\(\{ editable: \(\) => false \}\);\s*return true;/,
  "R3-1: lockEditing must wait for the authoritative PM composition state, flush, then close the editable boundary"
);
assert.match(
  EDITOR_JS,
  /const timer = setTimeout\(\(\) => finish\(false\), 2000\);\s*\}\);\s*if \(!compositionSettled\) return false;/,
  "R4-3: the composition deadline must return busy (compositionend is the only authoritative settle signal), never force-lock"
);
assert.match(
  EDITOR_JS,
  /if \(!compositionSettled\) return false;\s*\/\/ compositionend 已到[\s\S]*?await new Promise\(\(resolve\) => setTimeout\(resolve, 0\)\);[\s\S]*?if \(destroyed\) return false;\s*if \(view\.composing\) return false;/,
  "R4-3: after compositionend, one macrotask must pass and PM composition state re-checked before locking"
);
assert.match(
  EDITOR_JS,
  /unlockEditing\(\) \{[\s\S]*?view\.setProps\(\{ editable: \(\) => true \}\);/,
  "R3-1: unlock must restore PM editability"
);
assert.doesNotMatch(
  EDITOR_JS,
  /view\.dispatch\s*=/,
  "R4-2: the editor must never assign view.dispatch (the constructor-bound method must stay untouched)"
);
assert.doesNotMatch(
  EDITOR_JS,
  /delete view\.dispatch/,
  "R4-2: deleting view.dispatch breaks the bound method - keymap commands would throw (this=undefined)"
);
assert.match(
  EDITOR_JS,
  /const lockGatePlugin = new Plugin\(\{\s*filterTransaction: \(\) => !editingLocked\s*\}\);/,
  "R4-2: programmatic dispatch must be gated by a PM filterTransaction, not by replacing the bound dispatch"
);
assert.match(
  EDITOR_JS,
  /ctx\.update\(prosePluginsCtx, \(plugins\) => \[\s*\/\/ R4-1[^\n]*\n\s*resourceTrackingPlugin,\s*\/\/ R4-2[^\n]*\n\s*lockGatePlugin,/,
  "R4-1/R4-2: tracking and the lock gate must be registered as real PM plugins on the editor"
);
assert.match(
  EDITOR_JS,
  /const handleUndoRedoShortcut = \(event\) => \{\s*if \(event\.isComposing \|\| event\.key === "Process"\) return;\s*if \(editingLocked\) return;/,
  "R3-1: the root-capture undo/redo shortcut must be inert while locked"
);
assert.match(
  EDITOR_JS,
  /"Mod-z": \(state, dispatch, view\) => \(editingLocked \? false : undo\(state, dispatch, view\)\)/,
  "R3-1: the keymap undo/redo commands must be inert while locked"
);
assert.match(
  saveAsSrc,
  /historyResourcePaths: collectExternalHistoryResourcePaths\(tab, content\)/,
  "R2-3: draft/undo-history referenced resources must be sent for convergence"
);
assert.match(
  EDITOR_JS,
  /function trackDocumentImageRefs\(state\) \{[\s\S]*?everReferencedResources\.add\(src\);/,
  "R3-2: the editor must track image refs per transaction into an ever-referenced set"
);
assert.match(
  EDITOR_JS,
  /const resourceTrackingPlugin = new Plugin\(\{\s*state:\s*\{\s*init: \(_, state\) => \{\s*trackDocumentImageRefs\(state\);/,
  "R4-1: transaction tracking must live in a real PM plugin state.init"
);
assert.match(
  EDITOR_JS,
  /apply: \(tr, _value, _oldState, newState\) => \{\s*if \(tr\.docChanged\) trackDocumentImageRefs\(newState\);/,
  "R4-1: every transaction (incl. undo/redo and addToHistory=false) must be tracked synchronously in plugin state.apply"
);
assert.doesNotMatch(
  EDITOR_JS,
  /trackDocumentImageRefs\(getEditorView\(\)\?\.state\);/,
  "R4-1: tracking must not depend on the milkdown listener's 200ms debounced updated() callback"
);
assert.match(
  EDITOR_JS,
  /getEverReferencedResources\(\) \{\s*return \[\.\.\.everReferencedResources\];/,
  "R3-2: the undo/redo reachable ref set must be exposed to the host"
);
const collectSrc = extractFunctionSource(INDEX_HTML, "function collectExternalHistoryResourcePaths(tab, content) {");
assert.match(
  collectSrc,
  /editor\?\.getEverReferencedResources\?\.\(\)/,
  "R3-2: collection must union the editor's transaction-level reachable set (hand-typed-then-undone refs included)"
);
assert.match(
  collectSrc,
  /tab\.external\.everReferencedResources/,
  "R3-2: collection must union the tab-level observed set (persists across tab switches)"
);
assert.match(
  INDEX_HTML,
  /onChange\(value\) \{\s*tab\.draft = value;\s*\/\/ R3-2[^\n]*\n\s*recordExternalMarkdownRefs\(tab, value\);/,
  "R3-2: every editor-notified state must be recorded into the reachable set"
);
assert.match(
  INDEX_HTML,
  /window\.recordExternalMarkdownRefs\?\.\(tab, tab\.draft\);/,
  "R3-2: textarea-fallback drafts must also feed the reachable set (optional call keeps slice-eval sandboxes working)"
);
assert.doesNotMatch(
  EXTERNAL_RS,
  /fs::canonicalize\(raw\) else \{ continue \}/,
  "R3-3: missing history resources must not be silently skipped"
);
assert.match(
  EXTERNAL_RS,
  /let canonical = fs::canonicalize\(raw\)\s*\.map_err\(\|_\| AppError::InvalidParams\)\?;\s*if !canonical\.starts_with\(&canonical_dir\) \{\s*return Err\(AppError::InvalidParams\);/,
  "R3-3: missing/out-of-dir history resources must hard-fail so the original session is preserved"
);
assert.match(EXTERNAL_RS, /fn review_save_as_rejects_history_resources_outside_source_dir/, "R3-3 regression: out-of-dir history resources reject the save");
assert.match(EXTERNAL_RS, /fn review_save_as_rejects_missing_history_resources/, "R3-3 regression: missing history resources reject the save");
assert.doesNotMatch(EXTERNAL_RS, /fn review_save_as_skips_history_resources_outside_source_dir/, "R3-3: the old skip-behavior test must be gone");
assert.match(
  saveAsSrc,
  /written_copy_elsewhere/,
  "R2-3: a durable write with failed retarget must surface as written-copy-elsewhere, not an error"
);
assert.match(
  saveAsSrc,
  /tab\.external\.joined = false;[\s\S]*?tab\.external\.itemId = null;/,
  "R2-2: a retargeted tab must drop the old itemId binding"
);
assert.match(
  EXTERNAL_RS,
  /WrittenCopyElsewhere \{ new_path: String \}/,
  "R2-3: the backend must keep the session on the original path when retarget fails after the durable write"
);
assert.match(
  COMMANDS_RS,
  /#\[serde\(default\)\]\s*pub history_resource_paths: Vec<String>/,
  "R2-3: history resource paths must be accepted by the save commands"
);
assert.match(
  INDEX_HTML,
  /if \(tab\.external\.saveLock\) \{[\s\S]*?external\.saveLockBusy/,
  "R2-3: image insertion must be refused while the save lock is held (no new images mid-copy)"
);
assert.ok(
  (I18N_JS.match(/saveLockCompositionBusy:/g) || []).length === 2,
  "R4-3: the retryable busy message must exist in both locales"
);

// ── 6. Node VM：真实运行条件下执行协调器 ───────────────────────────────────
const BRIDGE_SOURCES = [
  "function listenRaw(event, handler, target) {",
  "async function startExternalOpenCoordinator() {",
  "function startExternalOpenDrainFallback() {",
  "function stopExternalOpenDrainFallback() {",
  "function scheduleExternalInboxPump() {",
  "async function pumpExternalOpenInbox() {",
  // 请求级 single-flight：请求循环在 gate 上等提示裁决 + 导航屏障。
  "function waitForExternalRequestGate() {",
  "function notifyExternalRequestGate() {",
]
  .map((marker) => extractFunctionSource(INDEX_HTML, marker))
  .join("\n");

const COORDINATOR_STATE = extractFunctionSource(INDEX_HTML, "const externalOpenCoordinator = {");
const FLOW_SOURCES = [
  "async function handleExternalOpenRequest(request) {"
]
  .map((marker) => extractFunctionSource(INDEX_HTML, marker))
  .join("\n");

function buildContext({ bridgeAvailable, drainRequests = [] }) {
  const invoked = [];
  const callbacks = new Map();
  const intervals = [];
  const handled = [];
  const ctx = {
    console,
    Promise,
    Error,
    Array,
    Boolean,
    Number,
    JSON,
    invoked,
    handled,
    intervals,
    drainQueue: drainRequests.slice(),
    callbacks,
    appState: { isTauri: true, tabs: [], activeTabId: null },
    window: {
      __TAURI_INTERNALS__: bridgeAvailable
        ? {
            invoke: async (command, args) => {
              invoked.push({ command, args });
              if (command === "plugin:event|listen") {
                return args.event === "tauri://drag-drop" ? 4 : 1;
              }
              if (command === "plugin:event|unlisten") return undefined;
              if (command === "external_open_drain") {
                const requests = ctx.drainQueue.shift() || [];
                return { requests, watermark: 1 };
              }
              if (command === "external_open_ready") return undefined;
              return undefined;
            },
            transformCallback: (fn) => {
              const id = callbacks.size + 1;
              callbacks.set(id, fn);
              return id;
            },
            metadata: { currentWebview: { label: "main", windowLabel: "main" } }
          }
        : undefined,
      setInterval: (fn, ms) => {
        intervals.push(ms);
        return intervals.length;
      },
      clearInterval: () => {}
    },
    setStatus: () => {},
    normalizeError: (error) => String(error?.message || error),
    t: (key) => key,
    invoke: async (command, args) => {
      invoked.push({ command, args });
      if (command === "external_open_drain") {
        const requests = ctx.drainQueue.shift() || [];
        return { requests, watermark: 1 };
      }
      return undefined;
    },
    handleExternalSessionChangedEvent: () => {},
    handleExternalSessionBoundEvent: () => {},
    handleExternalOpenRequest: async (request) => {
      handled.push(request);
    }
  };
  return ctx;
}

async function runCoordinator(context) {
  vm.createContext(context);
  vm.runInContext(
    `${COORDINATOR_STATE}\n${BRIDGE_SOURCES}\nglobalThis.startExternalOpenCoordinator = startExternalOpenCoordinator;\nglobalThis.externalOpenCoordinator = externalOpenCoordinator;`,
    context
  );
  await vm.runInContext("startExternalOpenCoordinator()", context);
  return context;
}

// 6a. 只有 __TAURI_INTERNALS__（真实运行面）→ 入口真的启动，ready 可达。
const okContext = await runCoordinator(
  buildContext({
    bridgeAvailable: true,
    drainRequests: [[{ requestId: 1, source: "cold_start", orderedPaths: ["/tmp/a.md"] }], []]
  })
);
const listenCommands = okContext.invoked.filter((entry) => entry.command === "plugin:event|listen");
assert.deepEqual(
  listenCommands.map((entry) => entry.args.event).sort(),
  // 诊断清理后：coordinator 只订阅三个外部通道；tauri://drag-drop 的投递权
  // 在 Rust 原生层（enqueue_native_drop），前端不再订阅。
  ["nutbook-external-open", "nutbook-external-session-bound", "nutbook-external-session-changed"].sort(),
  "exactly the three external channels must be subscribed through the INTERNALS bridge"
);
assert.ok(
  okContext.invoked.some((entry) => entry.command === "external_open_ready"),
  "ready must be reported"
);
assert.ok(
  okContext.invoked.some((entry) => entry.command === "external_open_drain"),
  "the inbox must be drained after ready"
);
assert.equal(
  listenCommands.filter((entry) => entry.args.event === "tauri://drag-drop").length,
  0,
  "the JS side must not subscribe to tauri://drag-drop (Rust native enqueue owns drag delivery)"
);
const readyIndex = okContext.invoked.findIndex((entry) => entry.command === "external_open_ready");
const channelListenIndexes = okContext.invoked
  .map((entry, index) => ({ entry, index }))
  .filter(({ entry }) => entry.command === "plugin:event|listen")
  .map(({ index }) => index);
assert.equal(channelListenIndexes.length, 3, "three external channels must be subscribed");
assert.ok(
  readyIndex > Math.max(...channelListenIndexes),
  "ready must happen after every external-channel subscription resolved"
);
assert.equal(okContext.handled.length, 1, "the cold-start request must reach the coordinator");
assert.equal(okContext.handled[0].orderedPaths[0], "/tmp/a.md");
assert.equal(okContext.externalOpenCoordinator.readyReached, true, "the entry must be observably ready");
assert.equal(okContext.externalOpenCoordinator.fallbackTimer, null, "no polling fallback when the bridge works");

// 6b. 原生拖放（诊断清理后）：前端既不订阅 tauri://drag-drop，也不调用
// external_open_enqueue——投递权单一归属 Rust 原生 enqueue（6g 静态锚点 +
// Rust 单测覆盖），JS 侧零参与。
assert.ok(
  !okContext.invoked.some((entry) => entry.command === "external_open_enqueue"),
  "JS must never call external_open_enqueue — Rust native enqueue owns drag-drop delivery"
);

// 6f. Codex 合同第 1 条：最小事件 capability——只授予 main webview 的
// listen/unlisten；不用 windows（会扩散到 HTML child）、不用 core:default 兜底。
{
  const capability = JSON.parse(DRAG_CAPABILITY);
  assert.deepEqual(capability.webviews, ["main"], "capability must target only the main webview");
  assert.ok(
    !("windows" in capability),
    "capability must not use windows — that would extend the grant to HTML child surfaces"
  );
  assert.equal(capability.local, true, "capability must be local-only");
  assert.deepEqual(
    [...capability.permissions].sort(),
    ["core:event:allow-listen", "core:event:allow-unlisten"],
    "capability must grant exactly listen/unlisten, no core:default or broader fallback"
  );
}

// 6g. Codex 复核（2026-09-09 P1/P2）：原生 Drop 由 Rust 统一 enqueue——
// 校验（空路径/格式/运行面归属）全部先于任何副作用；唯一权威入口是
// WebviewEvent 臂；猜测性时间去重已整体移除。
{
  const allowlist = /pub fn native_drop_surface_allowed\(label: &str\) -> bool \{[\s\S]*?strip_prefix\("html-host-"\)[\s\S]*?parse::<i64>\(\)/;
  assert.match(COMMANDS_RS, allowlist, "native drop allowlist must accept main + html-host-<i64> surfaces only");
  // 副作用顺序：is_empty + allowlist + 已登记 webview 且宿主 main 全部通过
  // 之后，才允许 global_inbox().enqueue（Codex P1：归属失败只挡 emit 但
  // 请求已入队的旧缺陷不得回归）。同一函数体内三个检查必须都出现在
  // enqueue 之前。
  {
    const fnStart = COMMANDS_RS.indexOf("pub fn enqueue_native_drop<R: tauri::Runtime>(");
    assert.ok(fnStart !== -1, "enqueue_native_drop must be runtime-generic for mock-runtime unit tests");
    const fnBody = COMMANDS_RS.slice(fnStart, COMMANDS_RS.indexOf("\n}", fnStart));
    const enqueueAt = fnBody.indexOf('global_inbox().enqueue("drag-drop"');
    assert.ok(enqueueAt !== -1, "enqueue_native_drop must enqueue into the global inbox");
    const emptyCheck = fnBody.indexOf("if paths.is_empty()");
    const allowCheck = fnBody.indexOf("native_drop_surface_allowed(label)");
    const mainCheck = fnBody.indexOf('webview.window().label() == "main"');
    for (const [name, at] of [["empty-path check", emptyCheck], ["format allowlist", allowCheck], ["registered-on-main check", mainCheck]]) {
      assert.ok(at !== -1, `enqueue_native_drop must contain the ${name}`);
      assert.ok(
        at < enqueueAt,
        `the ${name} must precede the inbox enqueue (checks before all side effects, Codex P1)`
      );
    }
  }
  assert.doesNotMatch(
    COMMANDS_RS,
    /NATIVE_DROP_DEDUPE_WINDOW_MS|LAST_NATIVE_DROP|enqueue_native_drop_paths/,
    "the speculative time-based dedupe and its split testable core must be fully removed (Codex P2)"
  );
  assert.doesNotMatch(
    COMMANDS_RS,
    /fn native_drop_surface_registered/,
    "the ownership check must live inline before the enqueue side effect, not behind a helper called after enqueue"
  );
  // 唯一权威入口：只有 WebviewEvent DragDrop 臂转发 Drop（真实运行面无
  // 双臂派发证据，WindowEvent 臂 + 时间去重的猜测方案不得回归）。
  const dropArmCount = (MAIN_RS.match(/DragDropEvent::Drop \{ paths, \.\. \} = &drag/g) ?? []).length;
  assert.equal(dropArmCount, 1, "exactly one authoritative DragDrop arm (WebviewEvent) must forward Drop to native enqueue");
  assert.match(
    MAIN_RS,
    /tauri::RunEvent::WebviewEvent \{[\s\S]*?DragDrop\(drag\)[\s\S]*?DragDropEvent::Drop \{ paths, \.\. \} = &drag[\s\S]*?enqueue_native_drag_drop\(app, &label, paths\);/,
    "the authoritative Drop entry must be the WebviewEvent arm"
  );
  assert.doesNotMatch(
    MAIN_RS,
    /RunEvent::WindowEvent \{[\s\S]{0,200}?WindowEvent::DragDrop|WindowEvent::DragDrop/,
    "the WindowEvent DragDrop arm must stay removed (single authoritative entry)"
  );
  assert.doesNotMatch(
    MAIN_RS,
    /drag_diag|nutbook-drag-diag|inspect_and_register_drag_types/,
    "temporary drag diagnostics and the unproven drag-type registration patch must be removed from main.rs"
  );
  assert.doesNotMatch(
    COMMANDS_RS,
    /drag_diag/,
    "temporary drag diagnostics must be removed from external.rs"
  );
}

// 6c. 桥完全不可用 → 不能假装成功：ready 不可达且进入可观测降级。
const brokenContext = await runCoordinator(buildContext({ bridgeAvailable: false, drainRequests: [[]] }));
assert.equal(brokenContext.externalOpenCoordinator.readyReached, false, "a dead bridge must not claim ready");
assert.equal(
  brokenContext.externalOpenCoordinator.bridgeError,
  "tauri-event-bridge-unavailable",
  "the failure must be reported, not swallowed"
);
assert.ok(brokenContext.intervals.length >= 1, "a dead bridge must start the polling fallback");
assert.ok(
  !brokenContext.invoked.some((entry) => entry.command === "external_open_ready"),
  "ready must never be reported when subscriptions failed"
);

// 6d. leave 被拒绝 → 零副作用：只有 inspect，没有 open 阶段解析。
const leaveContext = buildContext({ bridgeAvailable: true, drainRequests: [[]] });
leaveContext.ingestFolderCalls = 0;
leaveContext.openItemCalls = 0;
leaveContext.openExternalCalls = 0;
leaveContext.ensureCanLeaveActiveTabForExternalOpen = async () => false;
leaveContext.ingestFolderWithConfirmation = async () => {
  leaveContext.ingestFolderCalls += 1;
};
leaveContext.openItem = async () => {
  leaveContext.openItemCalls += 1;
};
leaveContext.openExternalSessionFromResponse = async () => {
  leaveContext.openExternalCalls += 1;
};
leaveContext.showExternalMultiFileNotice = () => {};
leaveContext.invoke = async (command, args) => {
  leaveContext.invoked.push({ command, args });
  if (command === "external_session_resolve") {
    return {
      kind: "external",
      generation: 1,
      sessionId: "ext-1",
      itemId: null,
      promptRequired: false,
      diskChanged: false,
      path: args.payload.path,
      fileName: "a.md",
      resolution: "outside"
    };
  }
  return undefined;
};
vm.createContext(leaveContext);
vm.runInContext(
  `${FLOW_SOURCES}\nglobalThis.handleExternalOpenRequest = handleExternalOpenRequest;`,
  leaveContext
);
await vm.runInContext(
  'handleExternalOpenRequest({ requestId: 1, source: "system_open", orderedPaths: ["/tmp/a.md"] })',
  leaveContext
);
const resolveCalls = leaveContext.invoked.filter((entry) => entry.command === "external_session_resolve");
assert.equal(resolveCalls.length, 1, "a denied leave must stop after the read-only inspect");
assert.equal(resolveCalls[0].args.payload.phase, "inspect", "only the inspect phase may run before the leave decision");
assert.equal(leaveContext.openItemCalls, 0, "no item may be opened when the leave is denied");
assert.equal(leaveContext.openExternalCalls, 0, "no external session may be created when the leave is denied");
assert.equal(leaveContext.ingestFolderCalls, 0, "no folder ingest may start when the leave is denied");

// 6e. R2-3 前端回归：撤销历史可达状态的资源必须并入 historyResourcePaths；
// 复制期间新插入的图片（insertedResources）同样并入。
const historyHelpers = [
  "function extractExternalRelativeImageRefs(text) {",
  "function collectExternalHistoryResourcePaths(tab, content) {"
]
  .map((marker) => extractFunctionSource(INDEX_HTML, marker))
  .join("\n");
const historyContext = {
  console,
  Set,
  Array,
  String,
  RegExp,
  Object,
  appState: { activeMarkdownEditorTabId: null, activeMarkdownEditor: null }
};
historyContext.tab = {
  external: {
    path: "/Users/me/docs/note.md",
    insertedResources: new Set(["/Users/me/docs/assets/late.png"])
  },
  preview: { raw: "![old](assets/old.png)" },
  markdownBaseline: "![old](assets/old.png)",
  draft: null,
  item: { filePath: "/Users/me/docs/note.md" }
};
vm.createContext(historyContext);
vm.runInContext(
  `${historyHelpers}\nglobalThis.collect = collectExternalHistoryResourcePaths;`,
  historyContext
);
const historyPaths = await vm.runInContext(
  "collect(globalThis.tab, '正文不含 late 图')",
  historyContext
);
assert.ok(
  historyPaths.includes("/Users/me/docs/assets/old.png"),
  "undo-reachable original-content resources must be included"
);
assert.ok(
  historyPaths.includes("/Users/me/docs/assets/late.png"),
  "resources inserted during the session must be included even if the current body no longer references them"
);
assert.ok(
  !historyPaths.some((value) => !value.startsWith("/Users/me/docs/")),
  "relative refs must resolve inside the original document directory"
);

// 6f. R3-2 编辑器侧反例：手敲/粘贴图片后撤销——事务级追踪集合必须仍含该
// 引用（undo/redo 的落点都曾是某事务后的 doc 状态），外链引用不入集合。
const trackSrc = [
  "const isTrackableResourceRef = (value) =>"
].map((marker) => {
  const start = EDITOR_JS.indexOf(marker);
  assert.ok(start !== -1, `editor snippet not found: ${marker}`);
  // isTrackableResourceRef 的箭头函数体在下一行：切到本语句末尾的分号。
  const stmtEnd = EDITOR_JS.indexOf(";", start);
  return EDITOR_JS.slice(start, stmtEnd + 1);
}).join("\n");
const trackFunction = extractFunctionSource(EDITOR_JS, "function trackDocumentImageRefs(state) {");
const trackContext = { Set, RegExp, Object, String };
vm.createContext(trackContext);
vm.runInContext(
  // everReferencedResources 在编辑器模块是实例级 const；VM 语境按同名绑定补齐，
  // 被提取的 trackDocumentImageRefs 闭包可见。
  `const everReferencedResources = new Set();\n${trackSrc}\n${trackFunction}\nglobalThis.track = trackDocumentImageRefs;\nglobalThis.refs = everReferencedResources;`,
  trackContext
);
await vm.runInContext(
  "track({ doc: { descendants(cb) { cb({ attrs: { src: 'assets/manual.png' } }); cb({ attrs: { src: 'https://cdn.example/x.png' } }); cb({ attrs: {} }); } } })",
  trackContext
);
const trackedRefs = await vm.runInContext("[...refs]", trackContext);
assert.ok(
  trackedRefs.includes("assets/manual.png"),
  "a hand-typed image ref must be tracked into the ever-referenced set even after undo"
);
assert.ok(
  !trackedRefs.some((value) => /^(https?:|data:|file:)/i.test(value)),
  "external refs must not enter the local resource set"
);

// 6g. R3-2 宿主侧反例（Codex R3 探针的等价回归）：手敲图片后撤销的当前状态
// ——正文/baseline/draft 均不含图片且未经插图 picker，可达集合仍必须包含
// 该图片（宿主 recordExternalMarkdownRefs 观察并集 + 编辑器事务集合并集）。
const hostHelpers = [
  "function extractExternalRelativeImageRefs(text) {",
  "function recordExternalMarkdownRefs(tab, markdown) {",
  "function collectExternalHistoryResourcePaths(tab, content) {"
]
  .map((marker) => extractFunctionSource(INDEX_HTML, marker))
  .join("\n");
const hostContext = {
  console, Set, Map, Array, String, RegExp, Object,
  // 编辑器实例缺席（非活动 tab）时的降级路径：仅 tab 级观察集合参与并集。
  appState: { activeMarkdownEditorTabId: null, activeMarkdownEditor: null }
};
// Codex R3 探针场景：手敲图片（经 record 观察到）后撤销——四份静态文本均不含图片。
hostContext.tab = {
  external: { path: "/Users/me/docs/note.md" },
  preview: { raw: "撤销后的正文，不含图片" },
  markdownBaseline: "撤销后的正文，不含图片",
  draft: null,
  item: { filePath: "/Users/me/docs/note.md" }
};
vm.createContext(hostContext);
vm.runInContext(`${hostHelpers}\nglobalThis.record = recordExternalMarkdownRefs;\nglobalThis.collect = collectExternalHistoryResourcePaths;`, hostContext);
await vm.runInContext(
  "record(globalThis.tab, '![x](assets/manual.png)')",
  hostContext
);
await vm.runInContext(
  "record(globalThis.tab, '撤销后的正文，不含图片')",
  hostContext
);
const undonePaths = await vm.runInContext(
  "collect(globalThis.tab, '撤销后的正文，不含图片')",
  hostContext
);
assert.ok(
  undonePaths.includes("/Users/me/docs/assets/manual.png"),
  "a hand-typed-then-undone image ref must still be collected (undo/redo reachable)"
);
assert.ok(
  !undonePaths.some((value) => !value.startsWith("/Users/me/docs/")),
  "reachable refs must resolve inside the original document directory"
);

// 6h. R5 fallback textarea 反例（Codex R5 探针的等价回归，覆盖实际宿主函数）：
// compositionstart 发生在 acquire 之前（锁函数不再临时补装监听）→ 挂载时的
// 持久跟踪必须捕获该状态 → 未 compositionend 时 busy（保持可编辑），结束后
// 重试可锁；超时一律 busy；重复 setup 幂等；dispose 后状态不再更新。
const lockHelpers = [
  "function setupExternalTextareaCompositionTracking(textarea) {",
  "function isTrackedTextareaComposing(textarea) {",
  "async function acquireExternalSaveLock(tab) {",
  "function releaseExternalSaveLock(tab, lock) {"
]
  .map((marker) => extractFunctionSource(INDEX_HTML, marker))
  .join("\n");
const lockContext = {
  console, Promise, Error, Object,
  document: null,
  appState: { activeMarkdownEditorTabId: null, activeMarkdownEditor: null, activeTabId: "t1" },
  showToast: (key) => { lockContext.lastToast = key; },
  setStatus: () => {},
  t: (key) => key
};
lockContext.window = {
  // 可控计时器：测试不用真等 2s，手动触发超时。
  setTimeout: (fn, ms) => { lockContext.timers.push(fn); return lockContext.timers.length; },
  clearTimeout: () => {}
};
lockContext.timers = [];
lockContext.clearTimeout = () => {};
const textareaStub = new EventTarget();
textareaStub.value = "源码草稿";
lockContext.document = { getElementById: (id) => (id === "editorArea" ? textareaStub : null) };
lockContext.textarea = textareaStub;
lockContext.tab = { id: "t1", external: { path: "/Users/me/docs/note.md" } };
vm.createContext(lockContext);
vm.runInContext(
  `${lockHelpers}\nglobalThis.setup = setupExternalTextareaCompositionTracking;\nglobalThis.isComposing = isTrackedTextareaComposing;\nglobalThis.acquire = acquireExternalSaveLock;\nglobalThis.release = releaseExternalSaveLock;`,
  lockContext
);
// 挂载：真实宿主在渲染编辑器时调用 setup。
await vm.runInContext("globalThis.tracking = setup(globalThis.textarea)", lockContext);
assert.ok(
  await vm.runInContext("setup(globalThis.textarea) === globalThis.tracking", lockContext),
  "R5: setup must be idempotent (one tracker per textarea)"
);
// Codex 反例场景：组合先于另存请求已经开始。
textareaStub.dispatchEvent(new Event("compositionstart"));
assert.ok(
  await vm.runInContext("isComposing(globalThis.textarea)", lockContext),
  "R5: the mount-time tracker must observe a composition that started before the save request"
);
// 组合进行中发起另存 → 锁在等待落定；2s 假计时器触发 → busy（绝不强锁）。
const busyPromise = vm.runInContext("acquire(globalThis.tab)", lockContext);
const pendingTimers = [...lockContext.timers];
lockContext.timers.length = 0;
for (const timerFn of pendingTimers) timerFn();
assert.equal(await busyPromise, null, "R5: the composition deadline must be busy, never force readOnly");
assert.equal(
  lockContext.lastToast,
  "external.saveLockCompositionBusy",
  "R5: the busy abort must surface the retryable message"
);
assert.equal(textareaStub.readOnly, undefined, "R5: the textarea must stay editable while composition is ongoing");
// 等待期内 compositionend 到达 → 落定并成功锁定。
const waitingPromise = vm.runInContext("acquire(globalThis.tab)", lockContext);
await new Promise((resolve) => setTimeout(resolve, 0));
textareaStub.dispatchEvent(new Event("compositionend"));
const acquiredLock = await waitingPromise;
assert.ok(acquiredLock, "R5: after compositionend the waiting save must settle and acquire the lock");
assert.equal(textareaStub.readOnly, true, "R5: the acquired lock must readOnly the fallback textarea");
await vm.runInContext("release(globalThis.tab, globalThis.acquiredLock)", Object.assign(lockContext, { acquiredLock }));
assert.equal(textareaStub.readOnly, false, "R5: release must restore editability");
// dispose：清理后状态不再更新（挂载点在重渲染前的显式清理语义）。
await vm.runInContext("tracking.dispose()", lockContext);
textareaStub.dispatchEvent(new Event("compositionstart"));
assert.ok(
  !(await vm.runInContext("isComposing(globalThis.textarea)", lockContext)),
  "R5: after dispose the tracking must be gone"
);

// ---- 人工验收返修（GUI round 1）：标签激活 / 提示位置 / 加号样式 ----
// 1) 标签点击分支必须双类型解析：纯数字转 Number，external:* 保留字符串，
//    禁止无条件 Number(dataset.tabId)（旧根因：NaN 覆盖 activeTabId）。
assert.match(
  INDEX_HTML,
  /const rawTabId = node\.dataset\.tabId;\s*const tabId = \/\^-?\?\\d\+\$\/\.test\(rawTabId\) \? Number\(rawTabId\) : rawTabId;/,
  "GUI-1: tab click must parse data-tab-id as number-or-string (external:* must stay a string)"
);
assert.doesNotMatch(
  INDEX_HTML,
  /const tabId = Number\(node\.dataset\.tabId\);/,
  "GUI-1: the old unconditional Number(dataset.tabId) root cause must not return"
);
// 2) 五秒意图提示：定位必须基于主内容区（viewerBody）顶部居中，不得回到左下角。
assert.match(
  INDEX_HTML,
  /viewerBody\?\.getBoundingClientRect\?\.\(\)/,
  "GUI-2: the open prompt must position itself from the main content area rect"
);
assert.doesNotMatch(
  INDEX_HTML,
  /\.external-open-prompt \{[^}]*align-items: flex-end/,
  "GUI-2: the open prompt must not return to the bottom-left placement"
);
// 3) 标签加号：透明融入样式 + 首次一次性动画标记；tooltip/aria 文案沿用 joinAction。
assert.match(
  INDEX_HTML,
  /\.tab-chip \.tab-join-button \{[^}]*background: transparent;/,
  "GUI-3: the tab join button must be transparent and blend into the tab chip"
);
assert.match(
  INDEX_HTML,
  /joinHintPending = !externalOpenCoordinator\.joinHintShown/,
  "GUI-3: the join hint animation must fire only on first render"
);
assert.match(
  INDEX_HTML,
  /class="tab-join-button\$\{joinHintPending \? " join-hint" : ""\}"/,
  "GUI-3: the join-hint class must be conditional in the rendered tab markup"
);
assert.match(
  INDEX_HTML,
  /data-join-external-tab=.*aria-label="\$\{escapeHtml\(t\("external\.joinAction"\)\)\}"><span class="material-symbols-outlined">add<\/span><span class="tab-join-tooltip" role="tooltip">\$\{escapeHtml\(t\("external\.joinAction"\)\)\}<\/span>/,
  "GUI-r4: the join button must render the in-app tooltip span with the same joinAction text as aria-label"
);
assert.doesNotMatch(
  INDEX_HTML,
  /tab-join-button[^`]*title="/,
  "GUI-r4: the join button must not use the native title tooltip (double-tooltip with the in-app span)"
);
assert.match(
  INDEX_HTML,
  /\.tab-chip \.tab-join-button \.tab-join-tooltip \{[^}]*background: rgba\(24, 24, 27, 0\.96\);[^}]*color: #fff;/,
  "GUI-r4: the join tooltip must follow the NUTBOOK dark-tooltip visual (black bg / white text)"
);

// 4) 人工验收第 2 轮：意图提示轻遮罩 + external 打开收拢侧栏。
//    遮罩必须按主内容区 rect 定位、不拦截交互（pointer-events: none）。
assert.match(
  INDEX_HTML,
  /\.external-open-prompt-scrim \{[^}]*pointer-events: none;/,
  "GUI-r2: the intent prompt scrim must exist and never block interaction"
);
assert.match(
  INDEX_HTML,
  /overlay\.insertBefore\(scrim, promptCard\);/,
  "GUI-r2: the scrim must be positioned from the viewerBody rect before the card"
);
assert.match(
  INDEX_HTML,
  /const positionPromptElements = \(\) => \{[\s\S]*?positionPromptElements\(\);[\s\S]*?addEventListener\("transitionend", onShellSettled/,
  "GUI-r2: prompt positioning must re-run after the sidebar collapse transition settles"
);
assert.match(
  INDEX_HTML,
  /removeEventListener\("transitionend", onShellSettled\)/,
  "GUI-r2: the reposition listener must be cleaned up when the prompt finishes"
);
assert.match(
  INDEX_HTML,
  /function activateExternalTab\(tab\) \{[\s\S]*?setSidebarCollapsed\(true\);[\s\S]*?renderTabs\(\);/,
  "GUI-r2: activating an external tab must collapse the sidebar like indexed opens"
);

// ---- 人工验收第 5 轮：boot 覆盖激活 / 保存后脏标记 / 拖入无反应 ----
// 1) boot 收尾不得无条件回「所有文件」首页（external drain 早已激活标签）。
assert.match(
  INDEX_HTML,
  /appState\.isBooting = false;[\s\S]{0,400}?if \(!getActiveTab\(\)\) \{\s*await showAllFilesHome\(\{/,
  "GUI-r5: boot must not unconditionally return to the all-files home when an external open already activated a tab"
);
// 2) external 保存成功必须推进 markdownBaseline（isMarkdownTabDirty 取
//    markdownBaseline ?? preview.raw，只更新 preview.raw 会让关闭仍提示未保存）。
assert.match(
  INDEX_HTML,
  /response\?\.status === "saved"[\s\S]{0,400}?tab\.markdownBaseline = content;\s*tab\.isDirty = false;/,
  "GUI-r5: a successful external save must advance markdownBaseline (isMarkdownTabDirty prefers markdownBaseline over preview.raw)"
);
assert.match(
  INDEX_HTML,
  /overwriteResponse\?\.status === "saved"[\s\S]{0,200}?tab\.markdownBaseline = content;/,
  "GUI-r5: the overwrite branch must advance markdownBaseline too"
);
// 3) 拖放投递权单一归属 Rust 原生层：前端不再有 drag-drop 订阅/诊断探针
//（顶部与 6b/6g 的 doesNotMatch 断言已覆盖，这里不再重复旧 wireExternalDragDrop 锚点）。

// 4) §3.3/验收16：提示未裁决时手动导航先取消提示——cancelled 终态不写
// 已提示记录；导航入口（切标签/回首页/关标签/条目卡片/showAllFilesHome）
// 必须先调取消钩子。
assert.match(
  INDEX_HTML,
  /function cancelExternalOpenPromptForNavigation\(\) \{[\s\S]*?if \(!externalOpenCoordinator\.promptActive\) return;[\s\S]*?externalOpenCoordinator\.promptCancel\?\.\(\);/,
  "the navigation-cancel hook must no-op when no prompt is active and otherwise delegate to the prompt cancel entry"
);
assert.match(
  INDEX_HTML,
  /externalOpenCoordinator\.promptCancel = \(\) => finish\("cancelled"\);/,
  "the active prompt must expose a cancel entry"
);
// 5) 裁决副作用收口：只有「仅打开」写已提示记录（§3.3：cancelled 不写，重新
// 发起时后端仍判定需要提示 → 重新提示）。P2：三种终态都要放行 HTML 临时
// host 的首次 attach，否则取消后标签会停在永久占位（计划 §6.2）。
assert.match(
  INDEX_HTML,
  /async function settleExternalPromptAdjudication\(tab, action\) \{[\s\S]*?if \(action === "join"\) \{[\s\S]*?\} else if \(action === "open-only"\) \{[\s\S]*?external_session_mark_opened_only[\s\S]*?\}[\s\S]*?releaseExternalRuntimeAttach\(tab\);/,
  "the cancelled terminal state must NOT write the opened-only hint record (§3.3: re-open re-prompts)"
);
assert.doesNotMatch(
  INDEX_HTML,
  /settleExternalPromptAdjudication\(tab, action\) \{[\s\S]*?if \(!action \|\| action === "cancelled"\) return;/,
  "the cancelled terminal state must not early-return before releasing the first HTML attach (§6.2)"
);
assert.ok(
  (INDEX_HTML.match(/cancelExternalOpenPromptForNavigation\(\);/g) ?? []).length >= 5,
  "every manual navigation entry (tab click / home click ×2 / close click / item card / showAllFilesHome) must cancel the prompt first"
);
// §3.3：取消不写已提示记录 → 同路径重新请求时，已存在标签也必须重新提示。
assert.match(
  INDEX_HTML,
  /const existing = resolved\.sessionId \? findExternalTabBySessionId\(resolved\.sessionId\) : null;[\s\S]{0,1200}?if \(resolved\.promptRequired\) \{\s*const action = await showExternalOpenPrompt\(existing\);\s*await settleExternalPromptAdjudication\(existing, action\);/,
  "a repeat request for the same path must re-prompt when the backend still requires it (cancelled requests leave no hint record)"
);

// ---- Codex 复核（2026-09-09 P1③ R2）：请求级 single-flight ----
// 提示裁决必须可等待：inbox 请求循环在 gate 上等「当前提示裁决 + 导航屏障」
// 完成后才开始下一请求的解析/激活——A 提示未决时 B 不得激活，可见提示与
// 活动文件永远匹配；取消后导航先完成再处理 B；不丢后续请求。
// 1) 旧提示队列调度器必须已删除（两套独立调度收敛为 inbox 单一调度）。
assert.doesNotMatch(
  INDEX_HTML,
  /function pumpExternalOpenPrompt|function queueExternalOpenPrompt/,
  "the prompt-queue scheduler must be gone — the inbox request loop is the single scheduler"
);
// 2) 提示裁决可等待：showExternalOpenPrompt 返回 promise，finish 只清理并
//    resolve；副作用（join / 仅打开写记录）由等待方在裁决后执行。
assert.match(
  INDEX_HTML,
  /const adjudicated = new Promise\(\(resolve\) => \{\s*resolveAdjudication = resolve;\s*\}\);[\s\S]*?resolveAdjudication\(action\);[\s\S]*?return adjudicated;/,
  "the prompt must expose an awaitable adjudication promise resolved by finish"
);
// 3) inbox 请求循环：每个请求开始前先过 gate。
assert.match(
  INDEX_HTML,
  /for \(const request of requests\) \{[\s\S]*?await waitForExternalRequestGate\(\);\s*await handleExternalOpenRequest\(request\);\s*\}/,
  "the inbox loop must gate every request on prompt adjudication + navigation barrier completion"
);
// 4) 新请求沿原入口重新做 leave/HTML surfaces 收敛（gate 放行后）。
assert.match(
  INDEX_HTML,
  /async function handleExternalOpenRequest\(request\) \{[\s\S]*?if \(!\(await ensureCanLeaveActiveTabForExternalOpen\(\)\)\) \{\s*return;\s*\}/,
  "the next request must redo the leave/HTML-surface convergence through the original entry before activating"
);
// 5) 导航屏障：取消先置位、settle 唤醒 gate。
assert.match(
  INDEX_HTML,
  /function cancelExternalOpenPromptForNavigation\(\) \{[\s\S]*?externalOpenCoordinator\.promptNavInFlight = true;\s*externalOpenCoordinator\.promptCancel\?\.\(\);/,
  "the navigation-cancel hook must mark navigation in flight BEFORE cancelling (the request loop stays gated until settle)"
);
assert.match(
  INDEX_HTML,
  /function settleExternalOpenPromptNavigation\(\) \{\s*externalOpenCoordinator\.promptNavInFlight = false;\s*notifyExternalRequestGate\(\);\s*\}/,
  "navigation settlement must clear the in-flight flag and release the gated request loop"
);
assert.ok(
  (INDEX_HTML.match(/settleExternalOpenPromptNavigation\(\);/g) ?? []).length >= 6,
  "every manual navigation entry (tab click / home click ×2 / close click / item card / showAllFilesHome) must settle the single-flight in a finally"
);
assert.match(
  INDEX_HTML,
  /async function showAllFilesHome\(options = \{\}\) \{[\s\S]*?try \{\s*await showAllFilesHomeBody\(options\);\s*\} finally \{\s*settleExternalOpenPromptNavigation\(\);/,
  "showAllFilesHome must settle the single-flight even when the leave confirmation aborts the navigation"
);

// VM 行为切片：真实 pumpExternalOpenInbox + 请求 gate 的请求级 single-flight
//（Codex 反例口径，非仅静态锚点）——
//   a) A 提示未决时 B 不得被处理（不解析/不激活，可见提示与活动文件匹配）；
//   b) 取消后导航屏障（navInFlight）继续挡住 B，settle 后 B 才被处理（不丢请求）。
const requestGateHelpers = [
  "async function pumpExternalOpenInbox() {",
  "function waitForExternalRequestGate() {",
  "function notifyExternalRequestGate() {",
  "function settleExternalOpenPromptNavigation() {"
]
  .map((marker) => extractFunctionSource(INDEX_HTML, marker))
  .join("\n");

{
  const ctx = {
    console,
    externalOpenCoordinator: {
      draining: false,
      pendingPump: false,
      watermark: 0,
      promptActive: false,
      promptNavInFlight: false,
      promptCancel: null,
      requestGateWaiters: []
    },
    handled: [],
    drainCalls: 0,
    invoke: async (command) => {
      if (command !== "external_open_drain") throw new Error(`unexpected invoke: ${command}`);
      ctx.drainCalls += 1;
      if (ctx.drainCalls === 1) {
        return { requests: [{ orderedPaths: ["/tmp/a.md"] }, { orderedPaths: ["/tmp/b.md"] }], watermark: 2 };
      }
      return { requests: [], watermark: 2 };
    },
    // 请求 A：模拟 openExternalSessionFromResponse 的可等待裁决——激活后
    // 打开提示并 await 裁决；promptCancel 即导航取消入口。
    handleExternalOpenRequest: async (request) => {
      const path = request.orderedPaths[0];
      ctx.handled.push(path);
      if (path !== "/tmp/a.md") return;
      ctx.externalOpenCoordinator.promptActive = true;
      await new Promise((resolve) => {
        ctx.externalOpenCoordinator.promptCancel = () => {
          ctx.externalOpenCoordinator.promptActive = false;
          resolve("cancelled");
        };
      });
    },
    scheduleExternalInboxPump: () => {}
  };
  vm.createContext(ctx);
  const pumpDone = vm.runInContext(`${requestGateHelpers}\npumpExternalOpenInbox()`, ctx);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(
    [...ctx.handled],
    ["/tmp/a.md"],
    "while prompt A is pending, request B must not be resolved or activated (request-level single-flight)"
  );
  // 用户点 home：导航 handler 开头取消提示——A 裁决为 cancelled，但导航尚未
  // 收敛（navInFlight=true），B 必须继续被挡住。
  await vm.runInContext(`
    externalOpenCoordinator.promptNavInFlight = true;
    externalOpenCoordinator.promptCancel?.();
  `, ctx);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(
    [...ctx.handled],
    ["/tmp/a.md"],
    "after cancellation the navigation barrier must keep gating B until navigation settles"
  );
  // 导航收敛（settle）：B 才被处理——不丢请求。
  await vm.runInContext("settleExternalOpenPromptNavigation()", ctx);
  await pumpDone;
  assert.deepEqual(
    [...ctx.handled],
    ["/tmp/a.md", "/tmp/b.md"],
    "settlement must release request B exactly once (no lost work)"
  );
}

const DEFAULT_APPS_RS = readFileSync("src-tauri/src/commands/default_apps.rs", "utf8");

// ── §7.2 文件默认应用（2026-09-09 返修：真实查询 + 显式设为默认） ───────────
// 1) 行位置：在代码块主题行之后（用户指令：不能插在语言与代码块两个选择框中间）。
{
  const codeBlockIndex = INDEX_HTML.indexOf('id="settingsCodeBlockThemeSelect"');
  const defaultAppIndex = INDEX_HTML.indexOf("data-default-app-row");
  assert.ok(codeBlockIndex !== -1 && defaultAppIndex !== -1, "both preference rows must exist");
  assert.ok(
    defaultAppIndex > codeBlockIndex,
    "the default-file-apps row must sit below the code-block-theme row"
  );
}
// 2) 旧灯泡图标按钮行必须移除（名称/位置/语义全部按新合同重做）。
assert.doesNotMatch(INDEX_HTML, /data-default-apps-open/, "the old icon-button row must be gone");
assert.match(I18N_JS, /defaultOpenApps: "文件默认应用"/, "the row must be renamed to 文件默认应用");
// 3) 状态必须来自系统真实查询命令 default_app_status，而不是引导 done。
assert.match(
  INDEX_HTML,
  /async function refreshDefaultAppStatus\(\) \{[\s\S]*?await invoke\("default_app_status"\)/,
  "the status display must query default_app_status (real system handler lookup)"
);
assert.match(
  DEFAULT_APPS_RS,
  /fn query_extension_handlers\([\s\S]*?URLForApplicationToOpenURL[\s\S]*?bundleIdentifier/,
  "Rust must resolve the real handler via NSWorkspace and compare bundle identifiers"
);
assert.match(
  DEFAULT_APPS_RS,
  /query_extension_handlers\(&app, &\["md", "markdown"\]\)/,
  "the markdown group must check .md and .markdown separately"
);
assert.match(
  DEFAULT_APPS_RS,
  /let html = query_html_viewer_handler\(\)\?;/,
  "the html group must query its dedicated Viewer-role handler"
);
assert.match(
  DEFAULT_APPS_RS,
  /LSSetDefaultRoleHandlerForContentType[\s\S]*?public\.html[\s\S]*?LS_ROLES_VIEWER/,
  "setting HTML must use the public.html Viewer role, rather than changing URL schemes"
);
assert.match(
  DEFAULT_APPS_RS,
  /fn query_html_viewer_handler\([\s\S]*?LSCopyDefaultRoleHandlerForContentType/,
  "HTML status must read the same Viewer-role handler that the setter changes"
);
assert.match(
  DEFAULT_APPS_RS,
  /mod default_app_status_tests[\s\S]*?DefaultAppGroupStatus::Partial/,
  "the per-extension aggregation (partial default) must carry a unit test"
);
// 4) 异步结果不得覆盖已离开的视图：serial + 行可见性双守卫。
assert.match(
  INDEX_HTML,
  /const serial = \+\+defaultAppStatusSerial;[\s\S]*?if \(serial !== defaultAppStatusSerial \|\| !isDefaultAppRowVisible\(\)\) return;/,
  "async status results must be dropped when the view was left or a newer query exists"
);
assert.match(
  INDEX_HTML,
  /function isDefaultAppRowVisible\(\) \{[\s\S]*?row\.offsetParent !== null/,
  "visibility must be decided by the row's actual layout presence"
);
// 5) 从系统返回时刷新（窗口重新获得前台）。
assert.match(
  INDEX_HTML,
  /window\.addEventListener\("focus", \(\) => \{[\s\S]{0,600}?refreshDefaultAppStatus\(\)\.catch/,
  "regaining foreground must refresh the default-app status"
);
// 6) 设为默认：显式点击主路径 + 取消/失败不标成功 + 失败展示 Finder 备用说明。
assert.match(
  INDEX_HTML,
  /async function setDefaultAppFromPreferences\(group\) \{[\s\S]*?if \(group !== "markdown" && group !== "html"\) return;[\s\S]*?if \(group === "html" && !isWindowsPlatform\(\)\) \{[\s\S]*?showDefaultAppFinderFallbackDialog\("html"\);[\s\S]*?return;[\s\S]*?await invoke\("set_default_app", \{ kind: group \}\)[\s\S]*?await refreshDefaultAppStatus\(\);[\s\S]*?removeAttribute\("hidden"\)/,
  "macOS HTML must open its Finder guide directly; the Markdown and Windows paths must still invoke the system action, re-query status, and reveal fallback on failure"
);
assert.match(
  INDEX_HTML,
  /code === "DEFAULT_APP_ACTION_CANCELLED"[\s\S]*?defaultAppSetCancelled/,
  "user cancellation in the system dialog must show the neutral cancelled message, never a success state"
);
assert.match(
  INDEX_HTML,
  /if \(status === "default"\) \{[\s\S]{0,260}?return view\("ok", true, `\$\{name\} ✓`, hintKey\);/,
  "the already-default pill must render disabled with a check — macOS has no way to unset the default, so a clickable pill there would promise an action that cannot happen"
);
assert.match(
  INDEX_HTML,
  /if \(group === "html"\) \{[\s\S]{0,280}?return view\(status === "default" \? "ok" : "idle", false, label, "settings\.defaultAppHtmlGuideAction"\);/,
  "the HTML pill must remain actionable in every queried state because it opens the Finder guide, not an unavailable unset-default action"
);
assert.match(
  INDEX_HTML,
  /if \(status === "notDefault"\) \{[\s\S]{0,200}?return view\("idle", false, `\$\{name\} ＋`, hintKey\);/,
  "the not-default pill must be the actionable one (white pill + ink outline + plus sign)"
);
assert.match(
  INDEX_HTML,
  /if \(defaultAppSetting === group\) \{[\s\S]{0,420}?return view\(\s*"busy",\s*true,/,
  "only the clicked group may enter the busy state (defaultAppSetting stores the group name, not a boolean)"
);
assert.match(
  DEFAULT_APPS_RS,
  /setDefaultApplicationAtURL_toOpenContentTypeOfFileAtURL_completionHandler/,
  "the Markdown path must use NSWorkspace's file-probe confirmation flow"
);
assert.match(
  DEFAULT_APPS_RS,
  /if kind == "html" \{[\s\S]{0,160}?set_default_html_viewer_handler\(\)/,
  "the HTML group must take the dedicated Viewer-role path"
);
assert.match(
  DEFAULT_APPS_RS,
  /fn set_default_html_viewer_handler\(\)[\s\S]*?LSSetDefaultRoleHandlerForContentType[\s\S]*?public\.html[\s\S]*?LS_ROLES_VIEWER/,
  "HTML must change only public.html's Viewer role"
);
assert.match(
  DEFAULT_APPS_RS,
  /match default_app_probe_extension_for_kind\(kind\.as_str\(\)\) \{[\s\S]{0,200}?Some\(extension\) => set_default_app_macos\(&app, extension\)[\s\S]{0,260}?None => Err\(AppError::InvalidParams\),/,
  "Markdown must use its file probe and unknown kinds must be rejected"
);
assert.doesNotMatch(
  DEFAULT_APPS_RS,
  /"html" => Err\(AppError::UnsupportedFileType\)/,
  "the old html-rejection branch must be gone, otherwise the HTML pill could never work"
);
// 剥离 // 注释行后再做「不得出现」断言，避免合同注释里的键名误中。
const DEFAULT_APPS_RS_CODE = DEFAULT_APPS_RS
  .split("\n")
  .filter((line) => !line.trim().startsWith("//"))
  .join("\n");
assert.doesNotMatch(
  DEFAULT_APPS_RS_CODE,
  /external_default_app_guide|guide_status/,
  "default-app status must not be derived from the onboarding guide state"
);
// 7) Finder 引导降级为备用：应用内弹窗图文步骤（不只写进代表文件）+ 定位优先真实文件。
assert.match(
  INDEX_HTML,
  /function showDefaultAppFinderFallbackDialog\(group = defaultAppFallbackGroup\) \{[\s\S]*?default-app-fallback-figure[\s\S]*?defaultAppFinderStep1[\s\S]*?defaultAppFinderStep4/,
  "the Finder fallback must be an in-app dialog with an illustrated 4-step walkthrough, opened for a specific group"
);
assert.match(
  INDEX_HTML,
  /function defaultAppFinderFigureSvg\(group\) \{[\s\S]{0,160}?const \{ ext \} = defaultAppFinderGroupCopy\(group\);[\s\S]*?<svg viewBox="0 0 560 118"/,
  "the fallback dialog must carry an inline SVG figure whose extension label comes from the group"
);
assert.match(
  INDEX_HTML,
  /assets\/default-app-finder-guide\.png[\s\S]*?data-fallback-figure-img/,
  "the dialog must show the generated real-look diagram image (Codex-generated asset) as the primary figure"
);
assert.match(
  INDEX_HTML,
  /figureImg\?\.addEventListener\("error", [\s\S]{0,200}?defaultAppFinderFigureSvg\(group\)/,
  "the dialog must fall back to the built-in SVG wireframe (parameterised by group) when the diagram asset is missing"
);
assert.doesNotMatch(
  INDEX_HTML,
  /data-fallback-action="finder"|function openDefaultAppsFinderFallback/,
  "the plain-text guide-file path must be gone from the frontend (md guide file is dropped; Rust command stays)"
);
assert.match(
  I18N_JS,
  /defaultAppFallbackTitle: "备用方法：在 Finder 中设置"/,
  "the fallback dialog must exist in-app, not only inside the representative file"
);
assert.doesNotMatch(
  I18N_JS,
  /defaultAppOpenFinderAction/,
  "the dropped guide-file button must not keep a live i18n key"
);
assert.match(
  COMMANDS_RS,
  /NUTBOOK-文件默认应用\.md/,
  "the representative file must use the new naming"
);
assert.match(
  COMMANDS_RS,
  /\.status\(\)[\s\S]*?!status\.success\(\)/,
  "system-launch operations must check the actual completion status and surface errors"
);
// 7b) GUI 反馈 R3：状态收进右侧两枚胶囊按钮本体。原先「描述行内徽章 + 右侧
//     独立『设为默认』按钮」把同一件事表达了两遍，且已默认态用墨水填充太黑。
assert.match(
  INDEX_HTML,
  /class="preference-control default-app-actions" data-default-app-actions>[\s\S]{0,220}?data-default-app-action="markdown"><\/button>[\s\S]{0,120}?data-default-app-action="html"><\/button>/,
  "the control slot must hold one pill button per format group, right-aligned as a pair"
);
assert.match(
  INDEX_HTML,
  /for \(const group of \["markdown", "html"\]\) \{[\s\S]{0,200}?actionsEl\.querySelector\(`\[data-default-app-action="\$\{group\}"\]`\)/,
  "both pills must be driven from the real queried status, per group"
);
assert.match(
  INDEX_HTML,
  /button\.className = `default-app-button default-app-button--\$\{tone\}`;/,
  "each pill must take its tone class from the per-group state"
);
assert.match(
  INDEX_HTML,
  /button\.setAttribute\("aria-label", hint\);[\s\S]{0,90}?button\.setAttribute\("title", hint\);/,
  "the pill's accessible name and its tooltip must come from the same state sentence"
);
assert.match(
  INDEX_HTML,
  /return view\("idle", false, name, "settings\.defaultAppWindowsAction"\);/,
  "on Windows both pills must stay actionable and open the system settings page (the backend cannot report a real handler there)"
);
assert.match(
  INDEX_HTML,
  /return view\("muted", true, name, "settings\.defaultAppStatusUnknown"\);/,
  "an unconfirmable status must disable the pill instead of faking a check mark"
);
assert.match(
  INDEX_HTML,
  /data-default-app-show-fallback="true"[\s\S]*?showDefaultAppFinderFallbackDialog\(defaultAppFallbackGroup\);/,
  "the fallback hint row must open the illustrated dialog for the group that actually failed"
);
assert.doesNotMatch(
  INDEX_HTML,
  /defaultAppHtmlPendingNote|data-default-app-html-note/,
  "the stale 'HTML coming in a future version' line must be gone: HTML is settable now"
);
// 7c) GUI 反馈 R3：胶囊几何 + 单色 Ink & Paper 体系；弹窗层级压过设置窗口。
assert.doesNotMatch(
  INDEX_HTML,
  /#005[cC]9[eE]/,
  "the pills and the fallback figure must be strictly monochromatic (no blue-bottle blue anywhere)"
);
assert.match(
  INDEX_HTML,
  /\.default-app-button \{[\s\S]{0,420}?border-radius: 999px;/,
  "the pills must be capsule-shaped (radius = half the height), not rounded rectangles"
);
assert.match(
  INDEX_HTML,
  /\.default-app-button--idle \{[\s\S]{0,220}?border-color: var\(--ink, #1a1c1d\);[\s\S]{0,180}?background: var\(--paper, #ffffff\);/,
  "the actionable pill must be white with an ink outline: state is expressed by the outline, not by a black fill"
);
assert.match(
  INDEX_HTML,
  /\.default-app-button--ok,[\s\S]{0,140}?\.default-app-button--muted,[\s\S]{0,140}?\.default-app-button--busy \{[\s\S]{0,220}?color: var\(--ink-soft, #5e5e63\);/,
  "default / unconfirmed / in-flight must all render as the same disabled grey pill"
);
assert.match(
  INDEX_HTML,
  /\.default-app-button--warn \{[\s\S]{0,180}?border: 1px dashed var\(--ink, #1a1c1d\);/,
  "a partial group must keep its own visually distinct (dashed) state instead of merging into 'default'"
);
assert.doesNotMatch(
  INDEX_HTML,
  /\.default-app-badge/,
  "the replaced badge classes must not linger in the stylesheet"
);
assert.match(
  INDEX_HTML,
  /\.external-open-prompt\.default-app-fallback-overlay,\s*\.external-open-prompt\.default-app-guide-overlay\s*\{[\s\S]{0,200}?z-index: 560;/,
  "both default-app dialogs must stack above the settings window (z-index 540); their two-class selectors are required because injectExternalOpenStyles() re-injects .external-open-prompt (z-index 90) later in the DOM, which would override a same-specificity static rule"
);
assert.doesNotMatch(
  INDEX_HTML,
  /^      \.default-app-fallback-overlay \{/m,
  "the single-class overlay selector must not come back: it loses to the runtime-injected .external-open-prompt style"
);
assert.match(
  INDEX_HTML,
  /\.default-app-fallback-figure img \{[\s\S]{0,160}?width: 100%;/,
  "the generated diagram image must fill the dialog figure area"
);
assert.match(
  INDEX_HTML,
  /overlay\.className = "external-open-prompt default-app-fallback-overlay";/,
  "the fallback dialog must use the modal overlay modifier (scrim + centered), not the bare prompt style"
);
// 8) 状态文案只允许四种（不显示其他应用名称）。
for (const key of ["defaultAppStatusDefault", "defaultAppStatusNotDefault", "defaultAppStatusPartial", "defaultAppStatusUnknown"]) {
  assert.match(I18N_JS, new RegExp(`${key}: "`), `i18n key ${key} must exist in both locales`);
}

// ── Codex R4 返修（2026-09-09）：async 主线程边界 + Windows 分流 + 取消分类 ──
// 9) P1：命令必须 async；主线程只发起（fire-and-forget），等待经通道发生在
//    async runtime 线程——同步 recv 会冻结整个应用（系统确认待决时无响应）。
assert.match(
  DEFAULT_APPS_RS,
  /pub async fn set_default_app\(/,
  "set_default_app must be an async command (main thread must never block on the system adjudication)"
);
assert.match(
  DEFAULT_APPS_RS,
  /async fn set_default_app_macos\(app: &tauri::AppHandle, extension: &'static str\)[\s\S]*?tauri::async_runtime::channel[\s\S]*?app\.run_on_main_thread\(move \|\| \{[\s\S]*?setDefaultApplicationAtURL_toOpenContentTypeOfFileAtURL_completionHandler/,
  "the AppKit launch must stay on the main thread and only start the request, never wait there"
);
assert.match(
  DEFAULT_APPS_RS,
  /rx\.recv\(\)\.await\.unwrap_or\(Err\(AppError::InternalError\)\)/,
  "the adjudication wait must await the async channel, never a blocking recv on the main thread"
);
// 函数体内不得有同步 recv（主线程阻塞路径必须消失）；同步 mpsc 仅允许
// 留在快速的本地 handler 查询里（无系统对话框等待）。
const SET_MACOS_BODY = DEFAULT_APPS_RS.slice(
  DEFAULT_APPS_RS.indexOf("async fn set_default_app_macos("),
  DEFAULT_APPS_RS.indexOf("/// 逐扩展名查询")
);
assert.ok(
  SET_MACOS_BODY.length > 200 && !SET_MACOS_BODY.includes("std::sync::mpsc") && !/recv\(\)\s*\./.test(SET_MACOS_BODY.replace("recv().await", "")),
  "set_default_app_macos must not contain a blocking std-mpsc wait (Codex R4: main-thread recv froze the app during the system dialog)"
);
// 10) P2 取消分支可达：按 NSError 实际 domain/code 分类（NSUserCancelledError），
//     并带延迟回调/取消/失败的行为测试（非源码字符串断言）。
assert.match(
  DEFAULT_APPS_RS,
  /fn settle_default_app_adjudication\([\s\S]*?"NSCocoaErrorDomain" && raw\.code == 3072/,
  "user cancellation must be identified from the actual NSError domain/code, not mapped into a generic failure"
);
assert.match(
  DEFAULT_APPS_RS,
  /mod default_app_set_tests[\s\S]*?delayed_completion_is_awaited_via_channel_not_polled/,
  "delayed completion / cancel / failure must carry behavioral tests on the classification + channel path"
);
// 11) P2 Windows 分流：主路径直接打开 ms-settings:defaultapps 并返回 SystemSettings。
assert.match(
  DEFAULT_APPS_RS,
  /#\[cfg\(target_os = "windows"\)\][\s\S]{0,400}?ms-settings:defaultapps[\s\S]{0,600}?Ok\(SetDefaultAppMode::SystemSettings\)/,
  "the Windows main path must open ms-settings:defaultapps and return the SystemSettings mode"
);
assert.match(
  DEFAULT_APPS_RS,
  /enum SetDefaultAppMode[\s\S]*?SystemDialog[\s\S]*?SystemSettings/,
  "the command must return its platform mode so the frontend splits hints (systemDialog vs systemSettings)"
);
// 12) 前端分流：Windows 文案 + Finder 备用说明永不出现；首次引导同源分流。
assert.match(
  INDEX_HTML,
  /function isWindowsPlatform\(\) \{[\s\S]*?\/win\/i\.test\(platform\)/,
  "the frontend must detect the Windows platform for the settings-page flow"
);
assert.match(
  INDEX_HTML,
  /const outcome = await invoke\("set_default_app", \{ kind: group \}\);[\s\S]*?outcome === "systemSettings"[\s\S]*?defaultAppWindowsOpened/,
  "a Windows set-default must surface the ms-settings hint based on the raw string outcome (serde enum shape)"
);
assert.match(
  INDEX_HTML,
  /if \(failed && !cancelled && !isWindowsPlatform\(\)\) \{[\s\S]*?removeAttribute\("hidden"\)/,
  "the Finder fallback note must only appear on genuine macOS failures (never on cancel, never on Windows)"
);
assert.match(
  INDEX_HTML,
  /t\(isWindows \? "external\.guideBodyWindows" : "external\.guideBody"\)/,
  "the onboarding guide must split its body copy per platform (Windows opens the settings page)"
);
assert.match(
  I18N_JS,
  /defaultAppWindowsOpening: "正在打开系统「默认应用」设置页…"/,
  "the Windows in-progress status must exist in zh"
);
assert.match(
  I18N_JS,
  /defaultAppWindowsOpened: "已在系统设置中打开「默认应用」页面；请在系统页面中将 NUTBOOK 设为 Markdown（\.md \/ \.markdown）与 HTML（\.html \/ \.htm）的默认应用。"/,
  "the Windows opened hint must name both format groups, not just Markdown"
);
assert.match(
  I18N_JS,
  /guideBodyWindows: "点击「设为默认」将打开系统「默认应用」设置页/,
  "the Windows guide body must exist in zh"
);
// R3 新增：分组按钮需要的文案必须两种语言都有。
for (const key of ["defaultAppPartialSuffix", "defaultAppWindowsAction", "defaultAppWindowsHint"]) {
  assert.equal(
    [...I18N_JS.matchAll(new RegExp(`${key}: "`, "g"))].length,
    2,
    `i18n key ${key} must exist in both locales`
  );
}
// HTML 分组可设之后，任何「HTML 将在后续版本提供」的残留都必须消失。
assert.doesNotMatch(
  I18N_JS,
  /defaultAppHtmlPendingNote|后续版本提供|coming in a future version/,
  "the stale 'HTML coming in a future version' copy must be gone from both locales"
);
// Finder 备用说明必须按组参数化，否则 HTML 组的引导会写着 .md。
// 用 `[^\n]*` 而不是 `[^"]*`：英文文案里的转义引号也是引号字符。
for (const key of ["defaultAppFinderIntro", "defaultAppFinderStep1", "defaultAppFinderStep4"]) {
  assert.equal(
    [...I18N_JS.matchAll(new RegExp(`${key}: "[^\\n]*\\{ext\\}`, "g"))].length,
    2,
    `${key} must carry an {ext} placeholder in both locales so the guide names the group's own extension`
  );
}
assert.equal(
  [...I18N_JS.matchAll(/defaultAppFinderIntro: "[^\n]*\{format\}/g)].length,
  2,
  "the fallback guide intro must carry a {format} placeholder in both locales"
);
assert.match(
  INDEX_HTML,
  /formatTranslation\("settings\.defaultAppFinderStep1", \{ ext \}\)[\s\S]{0,400}?formatTranslation\("settings\.defaultAppFinderStep4", \{ ext \}\)/,
  "the fallback dialog must actually interpolate the group's extension into the steps"
);

// 13) VM 行为切片：状态→按钮映射 + set-default 平台分流（Codex R4 要求行为
//     测试，非仅源码锚点）。R3 把徽章换成胶囊按钮之后，这里直接断言按钮的
//     tone / disabled / 文案 / 提示语：
//       a) macOS 四态映射（已默认禁用、未默认可点、部分虚线、无法确认禁用）；
//       b) Windows：两枚都可点、都不给状态符号；
//       c) 非 Tauri：两枚都禁用；
//       d) 设置中只让被点的那一枚 busy，另一枚保持真实状态；
//       e) Windows 成功 / 失败：ms-settings 提示，Finder 备用说明永不出现；
//       f) macOS 失败：Finder 备用说明出现并记住失败的是哪一组；
//       g) macOS 取消：中性取消提示，Finder 说明不出现；成功后总是重查真实状态。
const defaultAppHelpers = [
  "function defaultAppGroupStatusKey(status) {",
  "function isWindowsPlatform() {",
  "function renderDefaultAppStatusRow() {",
  "async function setDefaultAppFromPreferences(group) {"
]
  .map((marker) => extractFunctionSource(INDEX_HTML, marker))
  .join("\n");

// 一行的假 DOM：两个真按钮桩 + 两处说明行；说明行的显隐由 ctx 记录成可断言
// 的事实，不再靠读 innerHTML 串。
function makeDefaultAppRow({ buttons, isTauri = true, windows = false, status = null, setting = null, fallbackGroup = "markdown" }) {
  const ctx = {
    console,
    navigator: { platform: windows ? "Win32" : "MacIntel" },
    appState: { isTauri },
    defaultAppStatus: status,
    defaultAppSetting: setting,
    defaultAppFallbackGroup: fallbackGroup,
    defaultAppStatusSerial: 0,
    finderNoteRevealed: false,
    finderGuideGroups: [],
    windowsNoteHidden: false,
    statuses: [],
    invoked: [],
    refreshed: 0,
    t: (key) => key,
    setStatus: (message, kind) => ctx.statuses.push({ message, kind }),
    normalizeError: (error) => String(error?.code || error),
    showDefaultAppFinderFallbackDialog: (group) => ctx.finderGuideGroups.push(group),
    invoke: async () => null,
    refreshDefaultAppStatus: async () => { ctx.refreshed += 1; }
  };
  const actionsEl = {
    querySelector: (sel) => {
      const match = /^\[data-default-app-action="(\w+)"\]$/.exec(sel);
      return match ? buttons[match[1]] || null : null;
    }
  };
  ctx.els = {
    settingsPreferenceList: {
      querySelector: (sel) => {
        if (sel !== "[data-default-app-row]") return null;
        return {
          querySelector: (inner) => {
            if (inner === "[data-default-app-actions]") return actionsEl;
            if (inner === "[data-default-app-finder-note]") {
              return {
                removeAttribute: (name) => {
                  if (name === "hidden") ctx.finderNoteRevealed = true;
                }
              };
            }
            if (inner === "[data-default-app-windows-note]") {
              return {
                get hidden() { return ctx.windowsNoteHidden; },
                set hidden(value) { ctx.windowsNoteHidden = value; }
              };
            }
            return null;
          }
        };
      }
    }
  };
  return ctx;
}

function makeDefaultAppButton(group) {
  return {
    group,
    className: "",
    textContent: "",
    disabled: false,
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    getAttribute(name) { return name === "data-default-app-action" ? this.group : null; }
  };
}

function makeDefaultAppButtons() {
  return { markdown: makeDefaultAppButton("markdown"), html: makeDefaultAppButton("html") };
}

async function runRenderScenario(options) {
  const buttons = makeDefaultAppButtons();
  const ctx = makeDefaultAppRow({ ...options, buttons });
  vm.createContext(ctx);
  await vm.runInContext(`${defaultAppHelpers}\nrenderDefaultAppStatusRow()`, ctx);
  return { ctx, buttons };
}

// 点击某一组 → 完整走一遍 setDefaultAppFromPreferences。
// 结束后按钮停在「被点的那一枚 busy、另一枚保持真实状态」的快照上（产码在
// finally 之后只重查状态，不再重绘），所以可以直接断言 busy 外观。
async function runSetDefaultScenario({ windows = false, invokeError, outcome, group = "markdown", status = null }) {
  const buttons = makeDefaultAppButtons();
  const ctx = makeDefaultAppRow({
    buttons,
    windows,
    status: status ?? { markdown: "notDefault", html: "unknown" }
  });
  const baseInvoke = ctx.invoke;
  ctx.invoke = async (command, args) => {
    ctx.invoked.push([command, args]);
    if (invokeError) throw invokeError;
    return outcome ?? baseInvoke(command, args);
  };
  vm.createContext(ctx);
  await vm.runInContext(`${defaultAppHelpers}\nsetDefaultAppFromPreferences(${JSON.stringify(group)})`, ctx);
  return { ctx, buttons };
}

{
  // a) macOS 状态映射：Markdown 只能执行真实的“设为默认”操作；HTML 一律打开
  // Finder 指引，所以即使已默认也保持可点，不能把 Markdown 的禁用规则套过去。
  const both = await runRenderScenario({ status: { markdown: "default", html: "default" } });
  assert.equal(both.buttons.markdown.className, "default-app-button default-app-button--ok", "Markdown: an already-default group must render the checked pill");
  assert.equal(both.buttons.markdown.disabled, true, "Markdown: macOS has no unset-default API, so the already-default pill must be disabled");
  assert.equal(both.buttons.markdown.textContent, "Markdown ✓", "Markdown: the default pill must show the check");
  assert.equal(both.buttons.markdown.attributes.title, "settings.defaultAppStatusDefault", "Markdown: the tooltip must be the real status sentence");

  assert.equal(both.buttons.html.className, "default-app-button default-app-button--ok", "HTML: an already-default group must render the checked pill");
  assert.equal(both.buttons.html.disabled, false, "HTML: the Finder guide must stay available even after HTML is already default");
  assert.equal(both.buttons.html.textContent, "HTML ✓", "HTML: the default pill must show the check");
  assert.equal(both.buttons.html.attributes.title, "settings.defaultAppHtmlGuideAction", "HTML: the tooltip must describe the Finder guide action");

  const notDefault = await runRenderScenario({ status: { markdown: "notDefault", html: "default" } });
  assert.equal(
    notDefault.buttons.markdown.className,
    "default-app-button default-app-button--idle",
    "a not-default group must render the actionable pill (white + ink outline)"
  );
  assert.equal(notDefault.buttons.markdown.disabled, false, "the not-default pill must be clickable");
  assert.equal(notDefault.buttons.markdown.textContent, "Markdown ＋", "the not-default pill must show the plus sign");
  assert.equal(
    notDefault.buttons.markdown.attributes["aria-label"],
    "settings.defaultAppSetAction",
    "the actionable pill must describe the action, not the status"
  );
  assert.equal(
    notDefault.buttons.html.className,
    "default-app-button default-app-button--ok",
    "the other group must keep its own state"
  );
  assert.equal(notDefault.buttons.html.disabled, false, "the HTML Finder guide must stay actionable while HTML is already default");

  const partial = await runRenderScenario({ status: { markdown: "partial", html: "notDefault" } });
  assert.equal(
    partial.buttons.markdown.className,
    "default-app-button default-app-button--warn",
    "a partial group must keep its own dashed state"
  );
  assert.equal(partial.buttons.markdown.disabled, false, "a partial group is still fixable, so its pill must be clickable");
  assert.equal(
    partial.buttons.markdown.textContent,
    "Markdown settings.defaultAppPartialSuffix",
    "the partial pill must spell out the partial state via an i18n key (harness expands keys verbatim), not merge into default"
  );
  assert.equal(
    partial.buttons.markdown.attributes.title,
    "settings.defaultAppStatusPartial",
    "the partial pill must explain the group-internal inconsistency"
  );

  const unknown = await runRenderScenario({ status: { markdown: "unknown", html: "unknown" } });
  assert.equal(unknown.buttons.markdown.className, "default-app-button default-app-button--muted", "Markdown: an unconfirmable status must render the grey pill");
  assert.equal(unknown.buttons.markdown.disabled, true, "Markdown: an unconfirmable status must never be clickable");
  assert.equal(unknown.buttons.markdown.textContent, "Markdown", "Markdown: no status symbol may be invented when status is unknown");
  assert.equal(unknown.buttons.html.className, "default-app-button default-app-button--idle", "HTML: the Finder guide remains available when status is unknown");
  assert.equal(unknown.buttons.html.disabled, false, "HTML: an unknown status must not hide the Finder guide");
  assert.equal(unknown.buttons.html.textContent, "HTML ＋", "HTML: unknown status must not invent a check mark");
  assert.equal(unknown.buttons.html.attributes.title, "settings.defaultAppHtmlGuideAction", "HTML: unknown status must still describe the Finder guide action");

  const loading = await runRenderScenario({ status: null });
  assert.equal(
    loading.buttons.markdown.attributes.title,
    "settings.defaultAppStatusLoading",
    "before the first query returns, the tooltip must say it is still checking"
  );

  // b) Windows：后端读不到真实 handler，两枚都可点、都不带状态符号。
  const onWindows = await runRenderScenario({ windows: true, status: { markdown: "unknown", html: "unknown" } });
  for (const group of ["markdown", "html"]) {
    const button = onWindows.buttons[group];
    assert.equal(button.className, "default-app-button default-app-button--idle", `${group}: on Windows both pills must stay actionable`);
    assert.equal(
      button.disabled,
      false,
      `${group}: on Windows both pills must be clickable (they open the system settings page)`
    );
    assert.equal(
      button.textContent,
      group === "markdown" ? "Markdown" : "HTML",
      `${group}: Windows must not show a check mark it cannot verify`
    );
    assert.equal(
      button.attributes.title,
      "settings.defaultAppWindowsAction",
      `${group}: the Windows pill must say it opens the system page`
    );
  }
  assert.equal(onWindows.ctx.windowsNoteHidden, false, "the Windows row hint must be revealed on Windows");
  assert.equal(onWindows.ctx.finderNoteRevealed, false, "a status query alone must never reveal the Finder fallback note");

  // c) 非 Tauri（浏览器直开 dist）：两枚都禁用，说明行全部收起。
  const dev = await runRenderScenario({ isTauri: false, status: null });
  for (const group of ["markdown", "html"]) {
    assert.equal(dev.buttons[group].disabled, true, `${group}: without Tauri neither pill may pretend to work`);
  }
  assert.equal(dev.ctx.windowsNoteHidden, true, "the Windows hint must stay hidden outside Tauri");

  // d) 设置中：只让被点的那一枚 busy，另一枚保持真实状态。
  const inFlight = await runRenderScenario({ setting: "markdown", status: { markdown: "notDefault", html: "default" } });
  assert.equal(
    inFlight.buttons.markdown.className,
    "default-app-button default-app-button--busy",
    "only the clicked group may enter the busy tone"
  );
  assert.equal(inFlight.buttons.markdown.disabled, true, "the busy pill must not be clickable twice");
  assert.equal(inFlight.buttons.markdown.textContent, "Markdown", "the busy pill must not keep an action symbol");
  assert.equal(
    inFlight.buttons.html.className,
    "default-app-button default-app-button--ok",
    "the other group must keep its real queried status while a set is in flight"
  );
}

{
  // e) Windows 成功：SystemSettings 提示，无 Finder 说明，重查状态。
  //    fixture 用后端真实 serde 形状：无载荷 enum → 字符串 "systemSettings"
  //   （Codex R5：旧 fixture {mode:"systemSettings"} 掩盖了协议不一致）。
  const a = await runSetDefaultScenario({
    windows: true,
    outcome: "systemSettings",
    status: { markdown: "unknown", html: "unknown" }
  });
  assert.deepEqual(
    a.ctx.statuses.map((entry) => [entry.message, entry.kind]),
    [["settings.defaultAppWindowsOpened", "info"]],
    "Windows success must surface the ms-settings hint, not the macOS dialog wording"
  );
  assert.deepEqual(
    a.ctx.invoked.map(([command, args]) => [command, args.kind]),
    [["set_default_app", "markdown"]],
    "the clicked pill must invoke set_default_app with its own group, never a hard-coded one"
  );
  assert.equal(a.ctx.finderNoteRevealed, false, "Windows must never reveal the Finder fallback note");
  // 进行中：被点的那一枚进 busy，另一枚保持真实状态（Windows 下即 idle 可点）。
  assert.equal(
    a.buttons.markdown.className,
    "default-app-button default-app-button--busy",
    "while the set is in flight the clicked pill must show the busy tone"
  );
  assert.equal(
    a.buttons.markdown.attributes.title,
    "settings.defaultAppWindowsOpening",
    "the busy pill must carry the platform's in-progress hint"
  );
  assert.equal(a.buttons.html.disabled, false, "the untouched group must keep its own state while the other is being set");
  assert.equal(a.ctx.refreshed, 1, "status must be re-queried after the system settings page opens");

  // f) Windows 失败：错误提示，仍无 Finder 说明。
  const b = await runSetDefaultScenario({
    windows: true,
    invokeError: { code: "DEFAULT_APP_ACTION_FAILED" },
    status: { markdown: "unknown", html: "unknown" }
  });
  assert.ok(
    b.ctx.statuses.some((entry) => entry.kind === "error"),
    "a Windows failure must surface the error"
  );
  assert.equal(b.ctx.finderNoteRevealed, false, "a Windows failure must not reveal the Finder fallback note");

  // g) macOS HTML：此路线不再调用会同时改 HTTP/HTTPS 的系统默认设置 API，
  //    而是直接打开按 .html 说明的 Finder 引导；状态为何都不影响入口可用。
  const c = await runSetDefaultScenario({
    group: "html",
    status: { markdown: "notDefault", html: "notDefault" }
  });
  assert.deepEqual(c.ctx.finderGuideGroups, ["html"], "the macOS HTML pill must open the .html Finder guide directly");
  assert.deepEqual(c.ctx.invoked, [], "the macOS HTML guide must not invoke the system default-app setter");
  assert.equal(c.ctx.finderNoteRevealed, false, "opening the HTML guide is a primary action, not a failed fallback");
  assert.equal(c.ctx.refreshed, 0, "the HTML guide does not change a system association, so it must not re-query status");

  // h) macOS 取消：中性取消提示，Finder 说明不出现；重查保留真实状态。
  const d = await runSetDefaultScenario({
    invokeError: { code: "DEFAULT_APP_ACTION_CANCELLED" },
    status: { markdown: "notDefault", html: "unknown" }
  });
  assert.deepEqual(
    d.ctx.statuses.map((entry) => [entry.message, entry.kind]),
    [["settings.defaultAppSetCancelled", "warn"]],
    "a macOS cancellation must show the neutral cancelled message only"
  );
  assert.equal(d.ctx.finderNoteRevealed, false, "a cancellation must not be treated as a system failure");
  assert.equal(d.ctx.refreshed, 1, "the real status must be re-queried even after cancellation");

  // i) 未知组名必须在 invoke 之前被挡掉：拼错的 group 不得改到别的格式关联。
  const forged = await runSetDefaultScenario({ group: "pdf" });
  assert.deepEqual(forged.ctx.invoked, [], "an unknown group must be rejected before invoke");
  assert.equal(forged.ctx.refreshed, 0, "a rejected group must not trigger a status re-query either");
}

// 14) Codex R5：返回协议一致性——前端两处消费点都直接比较字符串（serde 无
//     载荷 enum 的真实形状），并补首次引导分流的 VM 行为切片。
assert.doesNotMatch(
  INDEX_HTML,
  /outcome\?\.mode/,
  "the invoke return is a plain string enum; reading outcome.mode always misses (Codex R5 protocol mismatch)"
);
assert.match(
  INDEX_HTML,
  /if \(outcome === "systemSettings"\) \{\s*setStatus\(t\("settings\.defaultAppWindowsOpened"\), "info"\);/,
  "the preferences set-default flow must compare the raw string outcome"
);
assert.match(
  INDEX_HTML,
  /outcome === "systemSettings"\s*\?\s*t\("settings\.defaultAppWindowsOpened"\)\s*:\s*t\("external\.guideSetDoneStatus"\)/,
  "the onboarding guide flow must split its success hint on the raw string outcome too"
);

// 首次引导 VM 行为切片：真实 showDefaultAppGuideOverlay + 假 DOM——
//   a) Windows：主按钮点击后显示 ms-settings 提示（不落入 macOS 已请求文案）；
//   b) macOS：主按钮点击后显示「已请求设为默认」文案。
const guideHelper = [
  extractFunctionSource(INDEX_HTML, "function isWindowsPlatform() {"),
  extractFunctionSource(INDEX_HTML, "function showDefaultAppGuideOverlay() {")
].join("\n");

async function runGuideScenario({ windows, outcome }) {
  const statuses = [];
  let clickHandler = null;
  const overlay = {
    className: "",
    innerHTML: "",
    removed: false,
    querySelector: (sel) => ({
      checked: true,
      addEventListener: (type, fn) => {
        if (sel === '[data-guide-action="open"]' && type === "click") clickHandler = fn;
      }
    }),
    remove: () => { overlay.removed = true; }
  };
  const ctx = {
    console,
    navigator: { platform: windows ? "Win32" : "MacIntel" },
    isWindowsPlatformGlobalPatched: false,
    document: {
      createElement: () => overlay,
      body: { appendChild: () => {} }
    },
    injectExternalOpenStyles: () => {},
    escapeHtml: (value) => value,
    t: (key) => key,
    setStatus: (message, kind) => statuses.push({ message, kind }),
    invoke: async (command, args) => {
      ctx.invoked.push([command, args]);
      return "systemSettings" === outcome || "systemDialog" === outcome ? outcome : outcome;
    },
    invoked: []
  };
  vm.createContext(ctx);
  await vm.runInContext(`${guideHelper}\nshowDefaultAppGuideOverlay()`, ctx);
  assert.equal(
    overlay.className,
    "external-open-prompt default-app-guide-overlay",
    "the first-run default-app guide must use the window-level overlay layer"
  );
  assert.ok(clickHandler, "the guide primary button must register a click handler");
  await clickHandler();
  return { statuses, ctx };
}

assert.match(
  INDEX_HTML,
  /\.external-open-prompt\.default-app-fallback-overlay,\s*\.external-open-prompt\.default-app-guide-overlay\s*\{[\s\S]*?z-index:\s*560;[\s\S]*?align-items:\s*center;[\s\S]*?pointer-events:\s*auto;/,
  "both default-app dialogs must override the injected external-prompt content layer"
);

{
  const win = await runGuideScenario({ windows: true, outcome: "systemSettings" });
  assert.deepEqual(
    win.statuses.map((entry) => [entry.message, entry.kind]),
    [["settings.defaultAppWindowsOpened", "ok"]],
    "the Windows guide must surface the ms-settings hint, never the macOS requested-status wording"
  );
  const mac = await runGuideScenario({ windows: false, outcome: "systemDialog" });
  assert.deepEqual(
    mac.statuses.map((entry) => [entry.message, entry.kind]),
    [["external.guideSetDoneStatus", "ok"]],
    "the macOS guide must keep the requested-default wording"
  );
}

console.log("external open entry bridge and R1/R2/R3/R5/GUI regression checks passed");
