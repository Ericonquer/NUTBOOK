// promotion 拆建路径的行为测试（P2-R1 / P2-R2 / P2-R2c / P2-R1b / P2-R3，
// Codex revision 45 / 48 / 51 / 54）。
//
// 要求：真实前端函数 + 注入失败/并发，不能只加源码 indexOf 断言。
// 做法：从 dist 抽取 promoteExternalHtmlTab / joinExternalSession /
// isExternalRuntimeTab / externalTabHasJoinEntry 的**真实源码**，在 vm 沙箱里
// 只替换跨进程边界（invoke / view-state 采集）为可控桩，驱动真实异步流程并
// 断言可观察结果。
//
// revision 51 契约（同一标签贯穿全生命周期，绑定与导航意图独立）：
// - 状态机：临时 → 已提交待拆除(teardown) → 已提交待挂载(mount) →
//   失败可重试(failed) / 正式就绪（同一对象原位迁移）→ 已关闭。
// - 资源等待期间用户点回同一存活标签 → 按最新当前意图呈现正式内容
//   （当前选中才挂载；不读陈旧快照、不依赖 epoch）。
// - 登记失败：失败占位标签保留在标签列表（重试入口对用户可见可达），
//   重试只重新登记/挂载，不重复 join，viewState 不被空结果覆盖。
// revision 54→58 契约（P2-R3 / P2-R3a 正式资源所有权闭环）：
// open_html_window 建立/复用 item 级 scoped server——「没有 host」≠「没有
// 资源」；itemOpenTokens 递增只证明「有新打开尝试开始」（openItem 在可用性
// 检查之前就推进 token，之后可能失败/被取消），**不证明接管**。所有权由
// 持有者台账（runtimeResourceHolders acquire/confirm/release）承载，
// 用**有状态资源桩**（分配/存活/撤销）验证责任归属：
// - 开始即登记（pending）：in-flight 占用，A 放弃时不得误关 in-flight B；
// - 取得即确认（holding），迁移成功 lease 转正挂正式标签记录；
// - 放弃即释放、最后持有者回收（台账空才 close_html_window）；
// - B token 推进但登记前失败 / 被导航取消 → A 放弃时资源必须回收（58 点名
//   交错：token 推进 ≠ 接管）；
// - B 确实取得资源（confirm / 正式记录）→ A 放弃绝不误关；
// - 撤销调用失败 setStatus 可见，不得吞异常声称完成。
// revision 62 契约（P2-R3b / P2-R3c 台账接线缺口）：
// - R3b：真实 openHtmlRuntimeSession 在 open reject 时必须释放本次 pending
//   lease（幽灵持有者会挡住他人「台账空 → 回收」判定）；
// - R3c：正式关闭（closeOpenTab）与登记/接管共享同一生命周期协调——只释放
//   本次持有权、最后持有者才回收；在途 close 期间新 acquire 串行等待，
//   拆除完成后登记，随后的 open 重建全新 server（不绑定垂死 URL）。
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const indexHtml = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");

// --- 真实源码抽取：从函数关键字切片到平衡块尾（保留函数头） ---
function functionSource(name, { isAsync = false } = {}) {
  const head = isAsync ? `async function ${name}(` : `function ${name}(`;
  const anchor = indexHtml.indexOf(head);
  assert.notEqual(anchor, -1, `缺少函数 ${name}`);
  const signatureEnd = indexHtml.indexOf(") {", anchor);
  assert.notEqual(signatureEnd, -1, `函数签名不完整: ${name}`);
  const brace = signatureEnd + 2;
  let depth = 0;
  for (let index = brace; index < indexHtml.length; index += 1) {
    const char = indexHtml[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return indexHtml.slice(anchor, index + 1);
    }
  }
  throw new Error(`未闭合的函数: ${name}`);
}

// 真实源码抽取：`window.<name> = async (...) => { ... }` 形式的全局桥赋值。
function assignmentArrowSource(globalName) {
  const asyncAnchor = indexHtml.indexOf(`window.${globalName} = async`);
  // revision 83：同一抽取器兼顾 async 与普通箭头函数全局赋值。
  const anchor = asyncAnchor !== -1 ? asyncAnchor : indexHtml.indexOf(`window.${globalName} = (`);
  assert.notEqual(anchor, -1, `缺少全局赋值 ${globalName}`);
  const arrow = indexHtml.indexOf("=> {", anchor);
  assert.notEqual(arrow, -1, `全局赋值缺少函数体: ${globalName}`);
  const brace = arrow + 3;
  let depth = 0;
  for (let index = brace; index < indexHtml.length; index += 1) {
    const char = indexHtml[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return indexHtml.slice(anchor, index + 1) + ";";
    }
  }
  throw new Error(`未闭合的全局赋值: ${globalName}`);
}

// 真实源码抽取：`window.<name> = function ...` 形式的全局桥赋值。
function assignmentSource(globalName) {
  const anchor = indexHtml.indexOf(`window.${globalName} = function`);
  assert.notEqual(anchor, -1, `缺少全局赋值 ${globalName}`);
  const signatureEnd = indexHtml.indexOf(") {", anchor);
  assert.notEqual(signatureEnd, -1, `全局赋值签名不完整: ${globalName}`);
  const brace = signatureEnd + 2;
  let depth = 0;
  for (let index = brace; index < indexHtml.length; index += 1) {
    const char = indexHtml[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return indexHtml.slice(anchor, index + 1) + ";";
    }
  }
  throw new Error(`未闭合的全局赋值: ${globalName}`);
}

const DETAIL = { id: 7, fileName: "a.html", fileType: "html" };const SESSION_PAYLOAD = { title: "a.html", runtimeUrl: "http://127.0.0.1:9/x", label: "html-runtime-7", detached: false };
const happyInvoke = (cmd) => {
  if (cmd === "get_item_detail") return DETAIL;
  if (cmd === "open_html_window") return SESSION_PAYLOAD;
  return null;
};

// P2-R3 有状态资源桩：分配 / 存活 / 撤销（open_html_window 对 item 级 scoped
// server 是 ensure-alive 复用语义；close_html_window 全撤销）。断言资源生命
// 周期，而非只数 UI 打开次数。
function makeResourceTracker() {
  const items = new Map();
  return {
    items,
    open(itemId) {
      const entry = items.get(itemId) || { allocs: 0, alive: false, closeCalls: 0 };
      entry.allocs += 1;
      entry.alive = true;
      items.set(itemId, entry);
      return SESSION_PAYLOAD;
    },
    close(itemId) {
      const entry = items.get(itemId);
      if (!entry || !entry.alive) return false;
      entry.alive = false;
      entry.closeCalls += 1;
      return true;
    },
    state(itemId) {
      return items.get(itemId) || null;
    }
  };
}

// 资源桩版 invokeImpl：open/close 走资源生命周期，其余命令透传 fallback。
const trackedInvoke = (tracker, fallback = () => null) => (cmd, payload) => {
  if (cmd === "open_html_window") return tracker.open(payload.itemId);
  if (cmd === "close_html_window") return tracker.close(payload.itemId);
  return fallback(cmd, payload);
};

function makeContext({ invokeImpl, captureImpl }) {
  const records = { invoke: [], invokeArgs: [], status: [], cleaned: 0, hidden: [], loads: 0, hostSyncs: 0, focusCalls: 0 };
  const appState = {
    tabs: [],
    runtimeSessions: [],
    items: [],
    activeTabId: null,
    isEditing: false,
    runtimeHiddenSurfaceIds: new Set(),
    runtimeSurfaceTokens: new Map(),
    runtimeViewStateSurfaceTokens: new Map(),
    activeRuntimeHostId: null,
    runtimeHostLastBoundsKey: null,
    itemOpenTokens: new Map(),
    runtimeNavigationEpoch: 0,
    externalViewStateWaiters: new Map(),
    markdownScrollByTab: new Map(),
    markdownOutlineCollapsedByTab: new Map(),
    runtimeResourceHolders: new Map(),
    runtimeResourceLeaseSeq: 0,
    runtimeResourceClosing: new Map(),
    // openHtmlRuntimeSession 绑定路径所需状态（R3b 用真实函数）
    runtimePatchAppliedKeys: new Set(),
    activeHtmlRuntimeUrl: null,
    markdownEditMode: "rich",
    markdownEditorError: "",
    runtimeControlsOverlayExpanded: false,
    runtimeControlsOverlayMode: "default",
    // revision 71：find surface 收敛（真实 hideRuntimeSessionSurfaces /
    // closeActiveHtmlFind 在沙箱内运行所需状态）。
    htmlFind: { itemId: null, query: "", caseSensitive: false, replaceExpanded: false, count: "0/0" },
    htmlFindOverlayEpoch: 0,
    htmlFindOverlaySyncLane: Promise.resolve(),
    htmlFindOverlayLastContentKey: null,
    htmlFindOverlayLastBoundsKey: null
  };
  const sandbox = {
    appState,
    console,
    // 跨进程边界：可控桩
    invoke: async (cmd, payload) => {
      records.invoke.push(cmd);
      records.invokeArgs.push([cmd, payload]);
      return invokeImpl(cmd, payload);
    },
    captureExternalHtmlViewState: captureImpl,
    // 主进程面 / 渲染面：桩（本测试边界之外）
    cleanupRuntimeHostSync: () => { records.cleaned += 1; },
    // revision 71：hideRuntimeSessionSurfaces / closeActiveHtmlFind /
    // setRuntimeHostVisibility 均为真实源码；只桩掉其外围。
    refreshHtmlRuntimeViewState: async () => false,
    setRuntimeControlsOverlayVisibility: async () => true,
    recordHtmlFindHistory: () => {},
    normalizeItemDetail: (detail) => detail,
    normalizeItemSummary: (detail) => ({ id: detail.id, fileName: detail.fileName }),
    setStatus: (message, tone) => { records.status.push([message, tone]); },
    t: (key) => key,
    normalizeError: (error) => String(error),
    loadItems: async () => { records.loads += 1; },
    renderTabs: () => {},
    renderViewer: () => {},
    scheduleRuntimeHostSync: () => { records.hostSyncs += 1; },
    focusMainWebviewSoon: () => { records.focusCalls += 1; },
    getActiveTab: () =>
      [...appState.tabs, ...appState.runtimeSessions].find((tab) => tab.id === appState.activeTabId) || null,
    recordExternalHintQuietly: () => {},
    // closeOpenTab（正式标签关闭路径，P2-R3 场景④）所需的周边桩
    getOpenTab: (tabId) =>
      [...appState.tabs, ...appState.runtimeSessions].find((tab) => tab.id === tabId) || null,
    getOpenTabs: () => [...appState.tabs, ...appState.runtimeSessions],
    captureActiveMarkdownScroll: () => {},
    captureActiveMarkdownDraft: () => {},
    syncHtmlEditReadonlyPatchSurfaceToken: async () => {},
    releaseRuntimeShellState: async () => {},
    hideInactiveRuntimeHosts: async () => {},
    isRuntimeHostTab: (tab) => Boolean(tab)
      && (tab.preview?.fileType === "html-runtime" || tab.preview?.fileType === "html-runtime-external"),
    // openHtmlRuntimeSession（P2-R3b 真实函数）依赖
    isCurrentItemOpenToken: () => true,
    setSidebarCollapsed: () => {},
    convergeInactiveRuntimeSurfaces: async () => true
  };
  const context = vm.createContext(sandbox);
  const sources = [
    functionSource("nextItemOpenToken"),
    functionSource("invalidateItemOpenToken"),
    functionSource("nextRuntimeSurfaceToken"),
    functionSource("currentRuntimeSurfaceToken"),
    functionSource("acquireRuntimeResourceHolder", { isAsync: true }),
    functionSource("waitRuntimeCloseSettled", { isAsync: true }),
    functionSource("runWhenRuntimeCloseSettled", { isAsync: true }),
    functionSource("confirmRuntimeResourceHolder"),
    functionSource("releaseRuntimeResourceHolder", { isAsync: true }),
    functionSource("transferLeaseToExistingTab"),
    functionSource("isExternalRuntimeTab"),
    functionSource("externalRuntimeTabForId"),
    functionSource("externalTabHasJoinEntry"),
    functionSource("isRuntimeSurfaceActive"),
    functionSource("isRuntimeSurfaceHideCurrent"),
    functionSource("isRuntimeNavigationCurrent"),
    functionSource("setRuntimeHostVisibility", { isAsync: true }),
    // R92a：hide 前采集的位置快照裁决（序号 / 落库 / 会话清理）。
    functionSource("nextExternalViewStateCaptureSeq"),
    functionSource("commitExternalViewStateSnapshot"),
    functionSource("clearExternalViewStateWaiters"),
    functionSource("closeActiveHtmlFind", { isAsync: true }),
    functionSource("setHtmlFindOverlayVisibilityFor"),
    functionSource("hideRuntimeSessionSurfaces", { isAsync: true }),
    functionSource("promoteExternalHtmlTab", { isAsync: true }),
    functionSource("joinExternalSession", { isAsync: true }),
    functionSource("closeExternalHtmlTab", { isAsync: true }),
    functionSource("closeOpenTab", { isAsync: true }),
    functionSource("openHtmlRuntimeSession", { isAsync: true })
  ];
  vm.runInContext(sources.join("\n"), context);
  return { context, sandbox, appState, records };
}

function makeExternalTab(id, { joined = false } = {}) {
  return {
    id,
    sourceMode: "external",
    closed: false,
    preview: { fileType: "html-runtime-external" },
    external: {
      sessionId: id.replace("external:", "sess-"),
      generation: 1,
      joined,
      itemId: joined ? 7 : null,
      promoting: false
    }
  };
}

const VIEW_STATE = { scrollX: 12, scrollY: 34, hash: "" };

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

// 当前激活身份能否解析到存活标签（Codex 51 验收判据）。
function currentTabResolves(appState) {
  return [...appState.tabs, ...appState.runtimeSessions].find((tab) => tab.id === appState.activeTabId) || null;
}

// 正式就绪绑定断言：同一 item 的正式标签记录就绪、viewState 保留。
function assertFormalBinding(appState, { sameObject = null } = {}) {
  const promoted = appState.runtimeSessions.find((entry) => entry.id === 7);
  assert.ok(promoted, "正式标签记录必须就绪");
  assert.ok(promoted.item && promoted.item.id === 7, "item 绑定必须正确");
  assert.equal(promoted.detail?.id, 7, "detail 必须就绪（激活挂载所需）");
  assert.equal(promoted.preview?.fileType, "html-runtime", "preview 必须是正式 runtime 形态");
  assert.ok(promoted.preview?.runtimeUrl, "preview 必须带 runtimeUrl（激活挂载所需）");
  assert.equal(promoted.viewState, VIEW_STATE, "viewState 必须随标签记录保留（切回可恢复滚动）");
  if (sameObject) {
    assert.equal(promoted, sameObject, "正式就绪必须是同一标签对象原位迁移（稳定标签身份）");
  }
  return promoted;
}

// 从「当前标签列表」中寻找用户实际可见的重试对象（Codex 51：不得只对
// 已移除的局部引用断言加号存在）。
function findVisibleRetryEntry(appState, context) {
  return [...appState.tabs, ...appState.runtimeSessions].find((tab) => context.externalTabHasJoinEntry(tab)) || null;
}

// ---------------------------------------------------------------- P2-R1
// R1-1 close 拒绝 → 禁止正式挂载；保留标签与绑定；进入 failed 可重试态
{
  const { context, appState, records } = makeContext({
    invokeImpl: (cmd) => {
      if (cmd === "close_external_html_runtime_command") throw new Error("InternalError");
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const result = await context.promoteExternalHtmlTab(tab, 7);
  assert.equal(result, false, "拆除失败必须返回 false");
  assert.equal(
    records.invoke.includes("attach_html_runtime_host_command"), false,
    "close 失败禁止创建正式 host"
  );
  assert.ok(appState.tabs.includes(tab), "close 失败必须保留临时标签");
  assert.equal(tab.external.promotion?.phase, "failed", "必须进入 failed 可重试态");
  assert.equal(tab.external.promotion?.teardownDone, false, "拆除未完成必须可续走");
  assert.equal(tab.external.promoting, false, "promoting 必须复位以允许重试");
  assert.equal(
    records.invoke.includes("external_session_close"), false,
    "host teardown 未完成不得收口会话"
  );
  assert.ok(records.status.some(([message, tone]) => message.includes("promotionFailedStatus") && tone === "error"),
    "必须向用户显示可恢复失败");
  // 加号必须对用户真实可见：从当前标签列表中找重试对象。
  assert.equal(findVisibleRetryEntry(appState, context), tab, "失败态必须在当前标签列表中重现加号");
}

// R1-2 从拆除失败续走重试（经 joinExternalSession 真实入口）：
// 不重复提交资料库，重建为正式标签并接管焦点，viewState 保留
{
  const retry = makeContext({ invokeImpl: happyInvoke, captureImpl: async () => VIEW_STATE });
  const tab = makeExternalTab("external:s1", { joined: true });
  tab.external.promotion = { phase: "failed", itemId: 7, viewState: VIEW_STATE, teardownDone: false };
  retry.appState.tabs.push(tab);
  retry.appState.activeTabId = tab.id;
  await retry.context.joinExternalSession(tab);
  assert.equal(
    retry.records.invoke.includes("external_session_join"), false,
    "重试不得重复提交资料库（join 已 committed）"
  );
  assert.equal(
    retry.records.invoke.includes("close_external_html_runtime_command"), true,
    "拆除未完成的失败态重试必须续走拆除（teardown 幂等）"
  );
  assertFormalBinding(retry.appState, { sameObject: tab });
  assert.equal(retry.appState.activeTabId, 7, "重试时临时标签仍激活 → 正式标签接管焦点");
  assert.equal(
    retry.records.invoke.filter((cmd) => cmd === "open_html_window").length, 1,
    "重试只登记一次正式资源"
  );
}

// ---------------------------------------------------------------- P2-R2c
// R2c-1（Codex 51 点名场景）B → 加入中的文件：资源等待期间用户点回
// 仍显示的临时标签 → 按最新当前意图迁移并挂载，激活身份解析到存活标签
{
  let resolveResources;
  const { context, appState, records } = makeContext({
    invokeImpl: (cmd) => {
      if (cmd === "open_html_window") return new Promise((resolve) => { resolveResources = resolve; });
      if (cmd === "close_external_html_runtime_command" || cmd === "external_session_close") return true;
      if (cmd === "get_item_detail") return DETAIL;
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const done = context.promoteExternalHtmlTab(tab, 7);
  await tick();
  await tick();
  await tick();
  appState.activeTabId = "B"; // 用户切到 B（后台 promotion 开始）
  appState.runtimeNavigationEpoch += 1;
  await tick();
  appState.activeTabId = tab.id; // 用户明确点回「加入中的文件」
  appState.runtimeNavigationEpoch += 1;
  resolveResources(SESSION_PAYLOAD);
  await done;
  const promoted = assertFormalBinding(appState, { sameObject: tab });
  assert.equal(appState.activeTabId, promoted.id, "当前身份必须解析到正式标签");
  assert.equal(currentTabResolves(appState), promoted, "激活身份不得悬空（Codex 51 判据）");
  assert.ok(records.hostSyncs >= 1, "用户当前选中的标签必须挂载正式 host");
  assert.ok(records.focusCalls >= 1, "用户当前选中的标签必须接管焦点");
}

// R2c-2 首页 → 该文件：从首页点回加入中的标签 → 同样按当前意图挂载
{
  let resolveResources;
  const { context, appState, records } = makeContext({
    invokeImpl: (cmd) => {
      if (cmd === "open_html_window") return new Promise((resolve) => { resolveResources = resolve; });
      if (cmd === "close_external_html_runtime_command" || cmd === "external_session_close") return true;
      if (cmd === "get_item_detail") return DETAIL;
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const done = context.promoteExternalHtmlTab(tab, 7);
  await tick();
  await tick();
  await tick();
  appState.activeTabId = null; // 用户回首页
  appState.runtimeNavigationEpoch += 1;
  await tick();
  appState.activeTabId = tab.id; // 用户从首页点回该文件
  appState.runtimeNavigationEpoch += 1;
  resolveResources(SESSION_PAYLOAD);
  await done;
  const promoted = assertFormalBinding(appState, { sameObject: tab });
  assert.equal(currentTabResolves(appState), promoted, "首页点回 → 激活身份解析到正式标签");
  assert.ok(records.hostSyncs >= 1, "点回的标签必须挂载");
}

// R2c-3 等待期间再次切走：以 resolve 时刻的当前选中为准 → 后台完成，
// 不挂载、不抢焦点（仅用户当前选择的标签可挂载）
{
  let resolveResources;
  const { context, appState, records } = makeContext({
    invokeImpl: (cmd) => {
      if (cmd === "open_html_window") return new Promise((resolve) => { resolveResources = resolve; });
      if (cmd === "close_external_html_runtime_command" || cmd === "external_session_close") return true;
      if (cmd === "get_item_detail") return DETAIL;
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const done = context.promoteExternalHtmlTab(tab, 7);
  await tick();
  await tick();
  await tick();
  appState.activeTabId = "B";
  appState.runtimeNavigationEpoch += 1;
  await tick();
  appState.activeTabId = tab.id; // 点回
  await tick();
  appState.activeTabId = "B"; // 又切走
  appState.runtimeNavigationEpoch += 1;
  resolveResources(SESSION_PAYLOAD);
  await done;
  assertFormalBinding(appState);
  assert.equal(appState.activeTabId, "B", "用户已切走：不得改写焦点");
  assert.equal(records.hostSyncs, 0, "非当前选中标签不得挂载");
  assert.equal(records.focusCalls, 0, "非当前选中标签不得抢焦点");
  assert.ok(!appState.tabs.includes(tab), "迁移完成后临时标签不残留");
}

// R2c-4 等待中关闭该文件：关闭意图优先，不迁移、不复活
{
  let resolveResources;
  const { context, appState, records } = makeContext({
    invokeImpl: (cmd) => {
      if (cmd === "open_html_window") return new Promise((resolve) => { resolveResources = resolve; });
      if (cmd === "close_external_html_runtime_command" || cmd === "external_session_close") return true;
      if (cmd === "close_html_window") return true;
      if (cmd === "get_item_detail") return DETAIL;
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const done = context.promoteExternalHtmlTab(tab, 7);
  await tick();
  await tick();
  await tick();
  tab.closed = true; // 资源等待期间用户关闭
  resolveResources(SESSION_PAYLOAD);
  await done;
  assert.equal(appState.runtimeSessions.find((entry) => entry.id === 7), undefined,
    "资源期间已关闭：不得创建正式标签");
  assert.equal(records.hostSyncs, 0, "已关闭标签不得挂载");
}

// R2-5 采集期间标签被关闭：不拆除、不重建、不复活
{
  let resolveCapture;
  const { context, appState, records } = makeContext({
    invokeImpl: happyInvoke,
    captureImpl: () => new Promise((resolve) => { resolveCapture = resolve; })
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const done = context.promoteExternalHtmlTab(tab, 7);
  await tick();
  tab.closed = true;
  resolveCapture(null);
  await done;
  assert.equal(records.invoke.includes("close_external_html_runtime_command"), false,
    "采集期间已关闭：不得拆除旧 host");
  assert.equal(appState.runtimeSessions.find((entry) => entry.id === 7), undefined,
    "已关闭的标签不得复活为正式标签");
}

// ---------------------------------------------------------------- P2-R1b
// R1b-1 资源登记失败 → 失败占位标签保留在标签列表（Codex 51：移除后
// 加号对用户不可见，是假通过）
{
  const { context, appState, records } = makeContext({
    invokeImpl: (cmd) => {
      if (cmd === "open_html_window") throw new Error("InternalError");
      if (cmd === "get_item_detail") return DETAIL;
      return true;
    },
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const result = await context.promoteExternalHtmlTab(tab, 7);
  assert.equal(result, false, "资源登记失败必须返回 false");
  assert.equal(appState.runtimeSessions.find((entry) => entry.id === 7), undefined,
    "登记失败不得留下半就绪的正式标签");
  assert.ok(appState.tabs.includes(tab), "失败占位标签必须保留在标签列表（重试入口可见）");
  assert.equal(tab.external.promotion?.phase, "failed", "必须进入 failed 可重试态");
  assert.equal(tab.external.promotion?.teardownDone, true, "拆除已完成：重试只补登记/挂载");
  assert.equal(tab.external.promotion?.viewState, VIEW_STATE, "首次抓取的 viewState 必须保留");
  assert.equal(currentTabResolves(appState), tab, "激活身份必须仍解析到存活的失败占位标签");
  assert.equal(findVisibleRetryEntry(appState, context), tab, "加号必须在当前标签列表中真实可见");
  assert.equal(
    records.invoke.includes("attach_html_runtime_host_command"), false,
    "登记失败不得挂载"
  );
}

// R1b-2 从登记失败重试（经 joinExternalSession 真实入口）：不重复 join、
// viewState 不被空采集覆盖、重试成功后正式就绪
{
  const retry = makeContext({
    invokeImpl: happyInvoke,
    // host 已拆除：任何采集尝试都拿不到数据——证明 viewState 来自首次抓取。
    captureImpl: async () => null
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  tab.external.promotion = { phase: "failed", itemId: 7, viewState: VIEW_STATE, teardownDone: true };
  retry.appState.tabs.push(tab);
  retry.appState.items = [{ id: 7, fileName: "a.html" }];
  retry.appState.activeTabId = tab.id;
  await retry.context.joinExternalSession(tab);
  assert.equal(
    retry.records.invoke.includes("external_session_join"), false,
    "重试不得重复提交资料库"
  );
  assert.equal(
    retry.records.invoke.includes("close_external_html_runtime_command"), false,
    "拆除已完成的失败态重试不得重复拆除"
  );
  const promoted = assertFormalBinding(retry.appState, { sameObject: tab });
  assert.equal(promoted.viewState, VIEW_STATE, "重试不得把 viewState 覆盖为空");
  assert.equal(retry.appState.activeTabId, 7, "重试时用户仍看着该标签 → 正式标签接管");
}

// R1b-3 失败占位标签被关闭后不复活
{
  const retry = makeContext({ invokeImpl: happyInvoke, captureImpl: async () => null });
  const tab = makeExternalTab("external:s1", { joined: true });
  tab.external.promotion = { phase: "failed", itemId: 7, viewState: VIEW_STATE, teardownDone: true };
  retry.appState.tabs.push(tab);
  retry.appState.activeTabId = tab.id;
  tab.closed = true; // 用户关闭失败占位标签
  await retry.context.promoteExternalHtmlTab(tab, 7);
  assert.equal(retry.appState.runtimeSessions.find((entry) => entry.id === 7), undefined,
    "已关闭的失败占位标签不得复活为正式标签");
  assert.equal(retry.records.hostSyncs, 0, "已关闭标签不得挂载");
}

// ---------------------------------------------------------------- 单实例
// 已有正式 tab + 用户在 B：只更新绑定，不抢焦点、不重复挂载
{
  const { context, appState, records } = makeContext({
    invokeImpl: happyInvoke,
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  const existing = { id: 7, item: {}, detail: {}, preview: {}, viewState: null };
  appState.runtimeSessions.push(existing);
  appState.activeTabId = "B";
  await context.promoteExternalHtmlTab(tab, 7);
  assert.equal(appState.runtimeSessions.length, 1, "单实例：不得新建第二条正式标签");
  assert.equal(appState.runtimeSessions[0], existing, "必须是已有正式记录原位更新");
  assert.equal(existing.viewState, VIEW_STATE, "绑定必须带上抓到的 view state");
  assert.equal(appState.activeTabId, "B", "已有正式标签且用户在 B：不得改写焦点");
  assert.ok(!appState.tabs.includes(tab), "临时标签并入正式标签后移除");
  assert.equal(records.hostSyncs, 0, "用户不在场不得挂载");
}

// 已有正式 tab + 临时 tab 当前激活：正式标签接管焦点（§3.2 单实例）
{
  const { context, appState, records } = makeContext({
    invokeImpl: happyInvoke,
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  const existing = { id: 7, item: {}, detail: {}, preview: {}, viewState: null };
  appState.runtimeSessions.push(existing);
  appState.activeTabId = tab.id;
  await context.promoteExternalHtmlTab(tab, 7);
  assert.equal(appState.runtimeSessions.length, 1, "单实例：不得新建第二条正式标签");
  assert.equal(appState.activeTabId, 7, "临时标签当前激活 → 焦点迁到正式标签");
  assert.equal(currentTabResolves(appState), existing, "激活身份解析到已有正式标签");
  assert.ok(records.hostSyncs >= 1, "当前选中标签必须挂载");
}

// ---------------------------------------------------------------- 正常路径
// 全程激活：拆除 → 收口 → 同一对象迁移 + 激活挂载（顺序判定）
{
  const { context, appState, records } = makeContext({
    invokeImpl: happyInvoke,
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.items = [{ id: 7, fileName: "a.html" }];
  appState.activeTabId = tab.id;
  await context.promoteExternalHtmlTab(tab, 7);
  const closeAt = records.invoke.indexOf("close_external_html_runtime_command");
  const sessionCloseAt = records.invoke.indexOf("external_session_close");
  const openAt = records.invoke.indexOf("open_html_window");
  assert.ok(closeAt !== -1 && sessionCloseAt > closeAt, "必须先完成 host teardown 再收口会话");
  assert.ok(openAt > sessionCloseAt, "必须先拆除再登记正式资源（旧新 child 不得并存）");
  const promoted = assertFormalBinding(appState, { sameObject: tab });
  assert.equal(appState.activeTabId, promoted.id, "正式标签接管焦点");
  assert.equal(currentTabResolves(appState), promoted, "激活身份解析到正式标签");
  assert.ok(!appState.tabs.includes(tab), "临时位置不残留（同一对象已移入正式列表）");
  assert.equal(appState.isEditing, false, "激活正式 HTML 标签必须退出编辑态");
  assert.ok(records.hostSyncs >= 1, "激活后必须调度 host 挂载");
  assert.equal(tab.sourceMode, undefined, "迁移后不得残留临时标签标记");
  assert.equal(tab.external, undefined, "迁移后不得残留 external 记录");
}

// ---------------------------------------------------------------- 后台完成
// capture 期间切到 B 并停留：绑定就绪、不挂载、不抢焦点（激活才挂载）
{
  let resolveCapture;
  const { context, appState, records } = makeContext({
    invokeImpl: happyInvoke,
    captureImpl: () => new Promise((resolve) => { resolveCapture = resolve; })
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const done = context.promoteExternalHtmlTab(tab, 7);
  await tick();
  appState.activeTabId = "B"; // 用户切走并停留
  appState.runtimeNavigationEpoch += 1;
  resolveCapture(VIEW_STATE);
  await done;
  assertFormalBinding(appState, { sameObject: tab });
  assert.equal(appState.activeTabId, "B", "焦点语义：用户在 B 则不动焦点");
  assert.equal(records.hostSyncs, 0, "后台 promotion 不得挂载 host（激活才挂载）");
  assert.equal(records.focusCalls, 0, "后台 promotion 不得抢焦点");
}

// ---------------------------------------------------------------- 加号契约
// joined 无失败无加号 / failed 加号重现 / 挂载等待中（mount）无加号
{
  const { context } = makeContext({ invokeImpl: () => null, captureImpl: async () => null });
  const joined = makeExternalTab("external:s1", { joined: true });
  assert.equal(context.externalTabHasJoinEntry(joined), false, "已加入且无失败：无加号");
  const failed = makeExternalTab("external:s1", { joined: true });
  failed.external.promotion = { phase: "failed", itemId: 7, viewState: null, teardownDone: true };
  assert.equal(context.externalTabHasJoinEntry(failed), true, "失败可重试态：加号必须重现");
  const mounting = makeExternalTab("external:s1", { joined: true });
  mounting.external.promotion = { phase: "mount", itemId: 7, viewState: null, teardownDone: true };
  assert.equal(context.externalTabHasJoinEntry(mounting), false, "挂载等待中：无加号（防重复提交）");
  const markdown = makeExternalTab("external:m1");
  markdown.preview = { fileType: "markdown" };
  assert.equal(context.externalTabHasJoinEntry(markdown), true, "临时 Markdown 标签：有加号");
}

// ---------------------------------------------------------------- P2-R3a
// 有状态资源桩 + 持有者台账（真实 acquire/confirm/release 函数在 vm 内运行，
// 桩只模拟后端 server 的分配/存活/撤销生命周期）。

// R3-1 场景①：A 登记成功后标签已关闭 → A 是最后持有者 → 回收
{
  let resolveOpen;
  const tracker = makeResourceTracker();
  const { context, appState, records } = makeContext({
    invokeImpl: (cmd, payload) => {
      if (cmd === "close_external_html_runtime_command" || cmd === "external_session_close") return true;
      if (cmd === "close_html_window") return tracker.close(payload.itemId);
      if (cmd === "get_item_detail") return DETAIL;
      if (cmd === "open_html_window") {
        tracker.open(payload.itemId);
        return new Promise((resolve) => { resolveOpen = resolve; });
      }
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const done = context.promoteExternalHtmlTab(tab, 7);
  await tick(); await tick(); await tick(); await tick();
  assert.equal(tracker.state(7).alive, true, "登记后资源存活（pending→open resolve）");
  tab.closed = true; // 等待期间用户关闭
  resolveOpen(SESSION_PAYLOAD);
  await done;
  assert.equal(tracker.state(7).alive, false, "最后持有者放弃必须回收（不得留无主活动 origin）");
  assert.equal(tracker.state(7).closeCalls, 1, "必须恰好撤销一次");
  assert.equal(appState.runtimeResourceHolders.size, 0, "台账必须清空");
  assert.equal(appState.runtimeSessions.find((entry) => entry.id === 7), undefined,
    "已关闭标签不得创建正式标签");
  assert.equal(records.hostSyncs, 0, "已关闭标签不得挂载");
}

// R3-2 场景②：detail 拒绝而资源登记晚成功 → failed 占位 + 回收
{
  const tracker = makeResourceTracker();
  const { context, appState } = makeContext({
    invokeImpl: trackedInvoke(tracker, (cmd) => {
      if (cmd === "close_external_html_runtime_command" || cmd === "external_session_close") return true;
      if (cmd === "get_item_detail") throw new Error("InternalError");
      return null;
    }),
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const result = await context.promoteExternalHtmlTab(tab, 7);
  assert.equal(result, false, "detail 拒绝必须进入失败态");
  assert.equal(tracker.state(7).alive, false, "放弃时最后持有者必须回收");
  assert.ok(appState.tabs.includes(tab), "失败占位标签必须保留（重试入口可见）");
  assert.equal(tab.external.promotion?.phase, "failed", "必须进入 failed 可重试态");
  assert.equal(findVisibleRetryEntry(appState, context), tab, "加号必须在当前标签列表中真实可见");
}

// R3-3 in-flight 占用：B 已开始登记（pending）→ A 关闭放弃 → 台账非空
// 不回收（不得误关 in-flight B 的复用基础）；B 之后放弃才回收
{
  let resolveOpen;
  const tracker = makeResourceTracker();
  const { context, appState } = makeContext({
    invokeImpl: (cmd, payload) => {
      if (cmd === "close_external_html_runtime_command" || cmd === "external_session_close") return true;
      if (cmd === "close_html_window") return tracker.close(payload.itemId);
      if (cmd === "get_item_detail") return DETAIL;
      if (cmd === "open_html_window") {
        tracker.open(payload.itemId);
        return new Promise((resolve) => { resolveOpen = resolve; });
      }
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const done = context.promoteExternalHtmlTab(tab, 7);
  await tick(); await tick(); await tick(); await tick();
  const bLease = await context.acquireRuntimeResourceHolder(7); // B 开始登记（pending）
  tab.closed = true;
  resolveOpen(SESSION_PAYLOAD);
  await done;
  assert.equal(tracker.state(7).alive, true, "B pending 在册：A 放弃绝不回收（in-flight 占用）");
  assert.equal(tracker.state(7).closeCalls, 0, "台账非空不得调用撤销");
  await context.releaseRuntimeResourceHolder(7, bLease); // B 放弃 = 最后持有者
  assert.equal(tracker.state(7).alive, false, "B 放弃后台账空：最后放弃者回收");
}

// R3-4（Codex 58 点名交错）A 登记 → B token 推进但登记前失败 → A 放弃
// → 资源必须回收。token 递增不构成接管：openItem 在可用性检查前就推进
// token，失败后 B 从未 acquire，台账里只有 A。
{
  let resolveOpen;
  const tracker = makeResourceTracker();
  const { context, appState } = makeContext({
    invokeImpl: (cmd, payload) => {
      if (cmd === "close_external_html_runtime_command" || cmd === "external_session_close") return true;
      if (cmd === "close_html_window") return tracker.close(payload.itemId);
      if (cmd === "get_item_detail") return DETAIL;
      if (cmd === "open_html_window") {
        tracker.open(payload.itemId);
        return new Promise((resolve) => { resolveOpen = resolve; });
      }
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const done = context.promoteExternalHtmlTab(tab, 7);
  await tick(); await tick(); await tick(); await tick();
  appState.itemOpenTokens.set(7, 99); // B 推进 token，但随后登记前失败：从未 acquire
  tab.closed = true;
  resolveOpen(SESSION_PAYLOAD);
  await done;
  assert.equal(tracker.state(7).alive, false, "B 只推进 token 未取得资源：A 放弃必须回收（token ≠ 接管）");
  assert.equal(tracker.state(7).closeCalls, 1, "回收恰好一次");
  assert.equal(appState.runtimeResourceHolders.size, 0, "台账清空");
  assert.equal(appState.runtimeSessions.find((entry) => entry.id === 7), undefined,
    "不得凭 token 推进为 B 创建正式标签");
}

// R3-5（Codex 58 点名交错）A 登记 → B pending 后被导航取消（release）
// → A 关闭放弃 → A 成为最后持有者 → 回收
{
  let resolveOpen;
  const tracker = makeResourceTracker();
  const { context, appState } = makeContext({
    invokeImpl: (cmd, payload) => {
      if (cmd === "close_external_html_runtime_command" || cmd === "external_session_close") return true;
      if (cmd === "close_html_window") return tracker.close(payload.itemId);
      if (cmd === "get_item_detail") return DETAIL;
      if (cmd === "open_html_window") {
        tracker.open(payload.itemId);
        return new Promise((resolve) => { resolveOpen = resolve; });
      }
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const done = context.promoteExternalHtmlTab(tab, 7);
  await tick(); await tick(); await tick(); await tick();
  const bLease = await context.acquireRuntimeResourceHolder(7); // B 开始
  await context.releaseRuntimeResourceHolder(7, bLease);  // B 被取消：释放（pending 未 confirm，无回收语义冲突——A 仍在册）
  assert.equal(tracker.state(7).alive, true, "B 放弃时 A 仍在册：不得回收");
  tab.closed = true;
  resolveOpen(SESSION_PAYLOAD);
  await done;
  assert.equal(tracker.state(7).alive, false, "A 放弃后台账空：回收");
  assert.equal(appState.runtimeResourceHolders.size, 0, "台账清空");
}

// R3-6 B 确实取得资源（confirm）→ A 关闭放弃 → 台账非空不误关
{
  let resolveOpen;
  const tracker = makeResourceTracker();
  const { context, appState } = makeContext({
    invokeImpl: (cmd, payload) => {
      if (cmd === "close_external_html_runtime_command" || cmd === "external_session_close") return true;
      if (cmd === "close_html_window") return tracker.close(payload.itemId);
      if (cmd === "get_item_detail") return DETAIL;
      if (cmd === "open_html_window") {
        tracker.open(payload.itemId);
        return new Promise((resolve) => { resolveOpen = resolve; });
      }
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const done = context.promoteExternalHtmlTab(tab, 7);
  await tick(); await tick(); await tick(); await tick();
  const bLease = await context.acquireRuntimeResourceHolder(7); // B 开始
  resolveOpen(SESSION_PAYLOAD);
  context.confirmRuntimeResourceHolder(7, bLease);        // B open resolve 且继续：取得
  tab.closed = true;
  await done;
  assert.equal(tracker.state(7).alive, true, "B 实际持有：A 放弃绝不误关");
  assert.equal(tracker.state(7).closeCalls, 0, "台账非空不得调用撤销");
}

// R3-7 并入已有正式标签：existing 无 lease → adopt（显式所有权处理）；
// existing 已有 lease → A 放弃本 lease（台账仍非空，不回收）
{
  const tracker = makeResourceTracker();
  const { context, appState } = makeContext({
    invokeImpl: trackedInvoke(tracker, happyInvoke),
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  const existing = { id: 7, item: {}, detail: {}, preview: {}, viewState: null };
  appState.runtimeSessions.push(existing);
  appState.activeTabId = "B";
  await context.promoteExternalHtmlTab(tab, 7);
  assert.equal(appState.runtimeSessions.length, 1, "单实例：不得新建第二条正式标签");
  assert.ok(existing.resourceLeaseId, "existing 无 lease 时必须 adopt 本次 lease（显式所有权）");
  assert.equal(
    appState.runtimeResourceHolders.get(7).get(existing.resourceLeaseId)?.state, "holding",
    "adopt 后 lease 必须是 holding 态"
  );
  assert.equal(tracker.state(7).alive, true, "adopt 不触发回收（server 归 existing 持有）");
  assert.equal(tracker.state(7).closeCalls, 0, "不得误关");
  assert.ok(!appState.tabs.includes(tab), "临时标签并入正式标签后移除");

  // 变体：existing 已有 lease → 第二次并入只放弃自己的 lease
  const leaseBefore = existing.resourceLeaseId;
  const holdersBefore = appState.runtimeResourceHolders.get(7).size;
  const tab2 = makeExternalTab("external:s2", { joined: true });
  appState.tabs.push(tab2);
  appState.activeTabId = "B";
  await context.promoteExternalHtmlTab(tab2, 7);
  assert.equal(existing.resourceLeaseId, leaseBefore, "已有持有者：existing 的 lease 不得被改写");
  assert.equal(appState.runtimeResourceHolders.get(7).size, holdersBefore,
    "第二次并入只放弃自己的 lease：台账回到 existing 单持有者");
  assert.equal(tracker.state(7).closeCalls, 0, "绝不误关既有持有者");
}

// R3-8 场景④：A 迁移成功（lease 转正挂记录）→ 真实 closeOpenTab 关闭
// → 回收恰好一次
{
  const tracker = makeResourceTracker();
  const { context, appState } = makeContext({
    invokeImpl: trackedInvoke(tracker, happyInvoke),
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.items = [{ id: 7, fileName: "a.html" }];
  appState.activeTabId = tab.id;
  await context.promoteExternalHtmlTab(tab, 7);
  const promoted = assertFormalBinding(appState, { sameObject: tab });
  assert.ok(promoted.resourceLeaseId, "迁移成功必须把 lease 转正挂到正式标签记录");
  assert.equal(
    appState.runtimeResourceHolders.get(7).get(promoted.resourceLeaseId)?.state, "holding",
    "转正 lease 必须是 holding 态"
  );
  assert.equal(tracker.state(7).alive, true, "迁移时资源存活（持有而非释放）");
  const closed = await context.closeOpenTab(promoted.id);
  assert.equal(closed, true, "正式标签必须可关闭");
  assert.equal(tracker.state(7).alive, false, "正式标签关闭必须撤销 item 资源");
  assert.equal(tracker.state(7).closeCalls, 1, "回收恰好一次");
  assert.equal(appState.runtimeResourceHolders.size, 0, "关闭后台账清空（无僵尸 lease）");
  assert.equal(appState.runtimeSessions.length, 0, "关闭后正式标签记录移除");
  assert.equal(appState.activeTabId, null, "关闭激活标签后回首页");
}

// R3-9 撤销调用失败：setStatus 可见（不得吞异常声称完成），记账仍清
{
  let resolveOpen;
  const tracker = makeResourceTracker();
  const { context, appState, records } = makeContext({
    invokeImpl: (cmd, payload) => {
      if (cmd === "close_external_html_runtime_command" || cmd === "external_session_close") return true;
      if (cmd === "close_html_window") throw new Error("InternalError");
      if (cmd === "get_item_detail") return DETAIL;
      if (cmd === "open_html_window") {
        tracker.open(payload.itemId);
        return new Promise((resolve) => { resolveOpen = resolve; });
      }
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const done = context.promoteExternalHtmlTab(tab, 7);
  await tick(); await tick(); await tick(); await tick();
  tab.closed = true;
  resolveOpen(SESSION_PAYLOAD);
  await done;
  assert.ok(
    records.status.some(([message, tone]) => message.includes("资源撤销失败") && tone === "warn"),
    "撤销失败必须对用户可见（不得吞异常声称完成）"
  );
  assert.equal(appState.runtimeResourceHolders.size, 0, "记账已按放弃处理（防僵尸 lease）");
}
// ---------------------------------------------------------------- P2-R3b / P2-R3c（Codex 62 台账接线缺口）

// R3-10（R3b）：真实 openHtmlRuntimeSession 在 open reject 时必须释放本次
// pending lease——幽灵持有者会挡住其他意图的「台账空 → 回收」判定。
{
  const tracker = makeResourceTracker();
  const { context, appState, records } = makeContext({
    invokeImpl: (cmd, payload) => {
      if (cmd === "open_html_window") throw new Error("InternalError");
      if (cmd === "close_html_window") return tracker.close(payload.itemId);
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  await assert.rejects(
    () => context.openHtmlRuntimeSession(DETAIL, null, 1, 0),
    /InternalError/,
    "open reject 必须按原语义传播给调用方"
  );
  assert.equal(appState.runtimeResourceHolders.size, 0, "pending lease 必须释放（不得留幽灵持有者）");
  assert.equal(appState.runtimeResourceClosing.size, 0, "在途 close 记账必须清空");
  assert.equal(records.invoke.includes("close_html_window"), true,
    "释放后台账空：本次调用者是最后持有者，触发回收（open 失败后残迹拆除，幂等）");
}

// R3-11（R3b 交错）：A 真实打开成功（holding）→ B 真实打开 open reject
//（B pending 释放）→ 真实 closeOpenTab(A) → A 是最后持有者 → 回收。
// rev59 缺陷：B 的幽灵 pending 挡住回收，资源泄漏。
{
  const tracker = makeResourceTracker();
  let openFail = false;
  const { context, appState } = makeContext({
    invokeImpl: (cmd, payload) => {
      if (cmd === "open_html_window") {
        if (openFail) throw new Error("InternalError");
        return tracker.open(payload.itemId);
      }
      if (cmd === "close_html_window") return tracker.close(payload.itemId);
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  appState.items = [{ id: 7, fileName: "a.html" }];
  await context.openHtmlRuntimeSession(DETAIL, null, 1, 0);
  assert.equal(tracker.state(7).alive, true, "A 打开成功：资源存活");
  assert.equal(appState.runtimeResourceHolders.get(7).size, 1, "台账只有 A 一个持有者");

  openFail = true;
  await assert.rejects(() => context.openHtmlRuntimeSession(DETAIL, null, 2, 1), /InternalError/);
  assert.equal(appState.runtimeResourceHolders.get(7).size, 1,
    "B reject 后 pending 必须释放：台账仍只有 A（rev59 缺陷是 2 个）");

  await context.closeOpenTab(7);
  assert.equal(tracker.state(7).alive, false, "A 关闭 = 最后持有者：必须回收（不被幽灵 pending 挡住）");
  assert.equal(tracker.state(7).closeCalls, 1, "回收恰好一次");
  assert.equal(appState.runtimeResourceHolders.size, 0, "台账清空");
}

// R3-12（R3c）：A 正式标签持有 lease，B pending 且资源已登记 → 真实
// closeOpenTab(A) 只释放本次持有权，绝不撤销 B 的 in-flight 资源。
// rev59 缺陷：无条件 item 级 close，B 拿到已撤销的 URL。
{
  const tracker = makeResourceTracker();
  tracker.open(7); // B 的 open in-flight 已建立 server
  const { context, appState } = makeContext({
    invokeImpl: trackedInvoke(tracker, happyInvoke),
    captureImpl: async () => VIEW_STATE
  });
  const leaseA = await context.acquireRuntimeResourceHolder(7);
  context.confirmRuntimeResourceHolder(7, leaseA);
  const tabA = {
    id: 7, closed: false,
    preview: { fileType: "html-runtime" },
    item: { id: 7, fileName: "a.html" },
    detail: DETAIL, viewState: null, draft: "",
    resourceLeaseId: leaseA
  };
  appState.runtimeSessions.push(tabA);
  appState.activeTabId = 7;
  const leaseB = await context.acquireRuntimeResourceHolder(7); // B pending
  assert.equal(appState.runtimeResourceHolders.get(7).size, 2, "A holding + B pending");

  await context.closeOpenTab(7);
  assert.equal(tracker.state(7).alive, true, "B 在册：关闭 A 绝不能撤销资源（台账协调，不是无条件 close）");
  assert.equal(tracker.state(7).closeCalls, 0, "未发生任何撤销调用");
  assert.equal(appState.runtimeResourceHolders.get(7).has(leaseB), true, "B 的 pending lease 必须保留");
  assert.equal(appState.runtimeResourceHolders.get(7).has(leaseA), false, "A 的持有权已释放");
  assert.equal(appState.runtimeSessions.find((entry) => entry.id === 7), undefined, "A 的正式记录已移除");

  await context.releaseRuntimeResourceHolder(7, leaseB); // B 随后放弃 = 最后持有者
  assert.equal(tracker.state(7).alive, false, "B 放弃后台账空：回收");
}

// R3-13（R3c 串行化）：A 最后持有者 release（close 在途）→ B acquire
// 必须等待在途 close 完成后才登记 → B 的 open 重建全新 server。
{
  let resolveClose;
  const tracker = makeResourceTracker();
  tracker.open(7); // A 持有
  const { context, appState } = makeContext({
    invokeImpl: (cmd, payload) => {
      if (cmd === "close_html_window") {
        // 拆除在 IPC 发出时即刻生效（后端同步 teardown），完成时机由
        // resolveClose 延迟控制——串行化断言针对「B 不得在 close 完成前登记」。
        const result = tracker.close(payload.itemId);
        return new Promise((resolve) => { resolveClose = () => resolve(result); });
      }
      if (cmd === "open_html_window") return tracker.open(payload.itemId);
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  const leaseA = await context.acquireRuntimeResourceHolder(7);
  context.confirmRuntimeResourceHolder(7, leaseA);
  const releaseDone = context.releaseRuntimeResourceHolder(7, leaseA); // 回收 close 在途
  await tick();
  assert.equal(appState.runtimeResourceHolders.size, 0, "台账已清空（回收判定完成）");
  assert.equal(appState.runtimeResourceClosing.has(7), true, "在途 close 必须登记（串行化依据）");

  let bLeaseResolved = false;
  const bAcquire = context.acquireRuntimeResourceHolder(7).then((id) => {
    bLeaseResolved = true;
    return id;
  });
  await tick(); await tick();
  assert.equal(bLeaseResolved, false, "在途 close 未完成：B 不得提前登记（否则其 open 绑定垂死 URL）");

  resolveClose(true);
  await releaseDone;
  assert.equal(tracker.state(7).alive, false, "A 的 close 已完成");
  const leaseB = await bAcquire;
  assert.equal(bLeaseResolved, true, "close 完成后 B 才登记");
  assert.equal(appState.runtimeResourceHolders.get(7).get(leaseB)?.state, "pending", "B lease 已登记");
  tracker.open(7); // B 随后的 open_html_window 重建全新 server
  assert.equal(tracker.state(7).alive, true, "新持有者 open 重建：资源重新存活（有效 URL）");
}

// ---------------------------------------------------------------- P2-R3d（Codex 66：关闭中的记录不得被新打开接管后被旧关闭抹掉）

// R3-14（Codex 66 探针复现）：A 正式打开成功 → closeOpenTab(A) 停在 surface
// 清理 await → B（关闭开始后发起，token 符合关闭后新打开）打开同 item →
// 完整关闭事务串行化：B 等待事务落定后动作——新记录、新 active、资源有效
// 保留；旧关闭不得按 itemId 删除新实例、不得覆盖新导航。
{
  let releaseGate;
  const gate = new Promise((resolve) => { releaseGate = resolve; });
  const tracker = makeResourceTracker();
  const { context, appState } = makeContext({
    invokeImpl: trackedInvoke(tracker, happyInvoke),
    captureImpl: async () => VIEW_STATE
  });
  appState.items = [{ id: 7, fileName: "a.html" }];
  await context.openHtmlRuntimeSession(DETAIL, null, 1, 0);
  const recordA = appState.runtimeSessions[0];
  assert.equal(recordA.id, 7, "前置：A 正式记录就绪");

  // 关闭 A：卡在 surface 清理 await（事务登记已同步生效）
  context.syncHtmlEditReadonlyPatchSurfaceToken = async () => { await gate; };
  const closeDone = context.closeOpenTab(7);
  await tick();
  assert.ok(appState.runtimeResourceClosing.get(7), "关闭事务必须同步登记（串行化依据）");

  // B 在旧关闭 await 期间发起
  const bDone = context.openHtmlRuntimeSession(DETAIL, null, 2, 1);
  await tick(); await tick();
  assert.equal(appState.runtimeSessions.length, 1, "事务在途：B 不得提前并入/新建（串行化等待）");

  releaseGate(true);
  await closeDone;
  await bDone;

  const recordB = appState.runtimeSessions.find((entry) => entry.id === 7);
  assert.ok(recordB, "B 的新标签必须保留（不得被旧关闭按 itemId 抹掉）");
  assert.notEqual(recordB, recordA, "B 必须是独立新实例（非旧关闭的记录对象）");
  assert.ok(recordB.resourceLeaseId, "B 必须持有独立 lease");
  assert.equal(
    appState.runtimeResourceHolders.get(7).get(recordB.resourceLeaseId)?.state, "holding",
    "B 的 lease 必须是 holding 态"
  );
  assert.equal(tracker.state(7).alive, true, "B 的资源必须有效（B open 重建全新 server）");
  assert.equal(appState.activeTabId, 7, "B 完成后接管 active（旧关闭不得写回覆盖）");
  assert.equal(tracker.state(7).closeCalls, 1,
    "A 关闭时是当时台账的最后持有者（B 串行等待中尚未登记）：合法回收一次");

  // 最终关闭 B：最后持有者 → 再次回收
  await context.closeOpenTab(7);
  assert.equal(tracker.state(7).alive, false, "B 关闭 = 最后持有者：回收");
  assert.equal(tracker.state(7).closeCalls, 2, "两次回收（A 事务一次 + B 关闭一次）");
  assert.equal(appState.runtimeResourceHolders.size, 0, "台账清空");
}

// R3-15（R3d promotion 并入覆盖）：A 正式打开成功 → closeOpenTab(A) 停在
// surface 清理 await → promotion 在门闸期间发起 → 事务落定后 A 记录已按
// 对象移除，promotion 原位迁移为独立新实例（不得并入关闭中的记录）。
{
  let releaseGate;
  const gate = new Promise((resolve) => { releaseGate = resolve; });
  const tracker = makeResourceTracker();
  const { context, appState, records } = makeContext({
    invokeImpl: trackedInvoke(tracker, happyInvoke),
    captureImpl: async () => VIEW_STATE
  });
  appState.items = [{ id: 7, fileName: "a.html" }];
  await context.openHtmlRuntimeSession(DETAIL, null, 1, 0);
  const recordA = appState.runtimeSessions[0];

  context.syncHtmlEditReadonlyPatchSurfaceToken = async () => { await gate; };
  const closeDone = context.closeOpenTab(7);
  await tick();

  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id; // 用户正看着临时标签
  const promoDone = context.promoteExternalHtmlTab(tab, 7);
  await tick(); await tick();
  assert.equal(appState.runtimeSessions.length, 1, "事务在途：promotion 不得提前并入（串行化等待）");

  releaseGate(true);
  await closeDone;
  await promoDone;

  const promoted = appState.runtimeSessions.find((entry) => entry.id === 7);
  assert.ok(promoted, "promotion 的正式记录必须保留");
  assert.equal(promoted, tab, "同一标签对象原位迁移（未被旧关闭抹掉）");
  assert.notEqual(promoted, recordA, "不得并入关闭中的旧记录");
  assert.ok(promoted.resourceLeaseId, "promotion 必须持有独立 lease");
  assert.equal(
    appState.runtimeResourceHolders.get(7).get(promoted.resourceLeaseId)?.state, "holding",
    "promotion 的 lease 必须是 holding 态"
  );
  assert.equal(tracker.state(7).alive, true, "promotion 的资源必须有效（open 重建全新 server）");
  assert.equal(tracker.state(7).closeCalls, 1,
    "A 关闭时是当时台账的最后持有者（promotion 串行等待中尚未登记）：合法回收一次");
  assert.equal(appState.activeTabId, 7, "promotion 接管 active");

  await context.closeOpenTab(7);
  assert.equal(tracker.state(7).alive, false, "最终关闭 promotion 标签才回收");
  assert.equal(tracker.state(7).closeCalls, 2, "两次回收（A 事务一次 + promotion 关闭一次）");
}

// R3-16（Codex 67 复现）：正式打开在资源登记后等待同 item 的关闭事务；
// 等待期间导航意图失效，返回后必须释放本 lease，不能继续创建/激活陈旧正式标签。
{
  let releaseClose;
  let signalWaitEntered;
  const waitEntered = new Promise((resolve) => { signalWaitEntered = resolve; });
  const closeGate = new Promise((resolve) => { releaseClose = resolve; });
  const tracker = makeResourceTracker();
  let appState;
  const { context, records } = makeContext({
    invokeImpl: (cmd, payload) => {
      if (cmd === "open_html_window") {
        const result = tracker.open(payload.itemId);
        // acquire 的第一次等待已经结束；让 open 返回后面的第二次等待
        // 命中一个正在进行的关闭事务。
        appState.runtimeResourceClosing.set(7, closeGate);
        return result;
      }
      if (cmd === "close_html_window") return tracker.close(payload.itemId);
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  appState = context.appState;
  appState.itemOpenTokens.set(7, 1);
  context.isCurrentItemOpenToken = (itemId, token, navigationEpoch = null) =>
    appState.itemOpenTokens.get(itemId) === token
      && (navigationEpoch == null || appState.runtimeNavigationEpoch === navigationEpoch);
  const wait = context.waitRuntimeCloseSettled;
  context.waitRuntimeCloseSettled = async (itemId) => {
    if (appState.runtimeResourceClosing.has(itemId)) signalWaitEntered();
    return wait(itemId);
  };
  const done = context.openHtmlRuntimeSession(DETAIL, null, 1, 0);
  await waitEntered;
  assert.equal(appState.runtimeSessions.length, 0, "关闭等待中不得提前创建正式标签");
  // 用户切走/重新打开同 item，旧打开意图失效。
  appState.itemOpenTokens.set(7, 2);
  appState.runtimeNavigationEpoch = 1;
  releaseClose(true);
  await done;
  assert.equal(appState.runtimeSessions.length, 0,
    "关闭等待返回后仍已取消：不得复活陈旧正式标签");
  assert.equal(appState.activeTabId, null,
    "陈旧打开不得抢占当前激活身份");
  assert.equal(appState.runtimeResourceHolders.size, 0,
    "陈旧打开必须释放自己的 lease");
  assert.equal(tracker.state(7).alive, false,
    "陈旧打开是最后持有者时必须回收资源");
  assert.equal(records.invoke.filter((cmd) => cmd === "close_html_window").length, 1,
    "陈旧打开的资源回收恰好一次");
}

// R3-17（Codex 67 复现）：promotion 在等待关闭事务时用户关闭临时标签；
// 关闭完成后不得把已关闭对象迁移回正式 runtimeSessions。
{
  let releaseClose;
  let signalWaitEntered;
  const waitEntered = new Promise((resolve) => { signalWaitEntered = resolve; });
  const closeGate = new Promise((resolve) => { releaseClose = resolve; });
  const tracker = makeResourceTracker();
  let appState;
  const { context } = makeContext({
    invokeImpl: (cmd, payload) => {
      if (cmd === "close_external_html_runtime_command" || cmd === "external_session_close") return true;
      if (cmd === "get_item_detail") return DETAIL;
      if (cmd === "open_html_window") {
        const result = tracker.open(payload.itemId);
        // 使 promotion 的 mount 等待停住；此时才执行真实 closeExternalHtmlTab。
        appState.runtimeResourceClosing.set(7, closeGate);
        return result;
      }
      if (cmd === "close_html_window") return tracker.close(payload.itemId);
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  appState = context.appState;
  const wait = context.waitRuntimeCloseSettled;
  context.waitRuntimeCloseSettled = async (itemId) => {
    if (appState.runtimeResourceClosing.has(itemId)) signalWaitEntered();
    return wait(itemId);
  };
  const tab = makeExternalTab("external:closed-during-close-wait", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const promoDone = context.promoteExternalHtmlTab(tab, 7);
  await waitEntered;
  await context.closeExternalHtmlTab(tab.id, tab);
  assert.equal(tab.closed, true, "真实关闭入口必须先标记临时标签 closed");
  assert.equal(appState.tabs.includes(tab), false, "真实关闭入口必须移除临时标签");
  releaseClose(true);
  await promoDone;
  assert.equal(appState.runtimeSessions.length, 0,
    "promotion 等待返回后标签已关闭：不得复活正式标签");
  assert.equal(appState.runtimeResourceHolders.size, 0,
    "关闭中的 promotion 必须释放自己的 lease");
  assert.equal(tracker.state(7).alive, false,
    "关闭中的 promotion 是最后持有者时必须回收资源");
}

// R3-18（Codex 67 关闭协调窗口）：wait helper 读取到“当前无 close”后，
// 同一任务又登记关闭；acquire 必须重新观察并等待，不能在关闭事务中登记。
{
  let releaseClose;
  const closeGate = new Promise((resolve) => { releaseClose = resolve; });
  const { context, appState } = makeContext({
    invokeImpl: () => null,
    captureImpl: async () => VIEW_STATE
  });
  let resolved = false;
  const acquireDone = context.acquireRuntimeResourceHolder(7).then(() => {
    resolved = true;
  });
  // acquire 已进入 waitRuntimeCloseSettled；模拟同一同步任务内晚到的关闭登记。
  appState.runtimeResourceClosing.set(7, closeGate);
  await tick();
  assert.equal(resolved, false,
    "关闭在 wait 初始快照后登记：acquire 仍必须等待");
  releaseClose(true);
  appState.runtimeResourceClosing.delete(7);
  await acquireDone;
  assert.equal(resolved, true, "关闭落定后 acquire 才能登记 lease");
  assert.equal(appState.runtimeResourceHolders.get(7).size, 1,
    "等待结束后只登记一个 lease");
}

// R3-19（Codex 67 关闭替换窗口）：等待的旧 close 完成时，新的 close 已替换
// 登记；wait helper 必须继续等待新事务，避免绑定到仍在拆除的资源。
{
  let releaseFirst;
  let releaseSecond;
  const firstClose = new Promise((resolve) => { releaseFirst = resolve; });
  const secondClose = new Promise((resolve) => { releaseSecond = resolve; });
  const { context, appState } = makeContext({
    invokeImpl: () => null,
    captureImpl: async () => VIEW_STATE
  });
  appState.runtimeResourceClosing.set(7, firstClose);
  let resolved = false;
  const acquireDone = context.acquireRuntimeResourceHolder(7).then(() => {
    resolved = true;
  });
  releaseFirst(true);
  // 在 wait 的旧 promise 完成、其 continuation 运行前替换为新的 close。
  appState.runtimeResourceClosing.set(7, secondClose);
  await tick();
  assert.equal(resolved, false,
    "旧 close 完成但新 close 已登记：acquire 仍必须等待新事务");
  releaseSecond(true);
  appState.runtimeResourceClosing.delete(7);
  await acquireDone;
  assert.equal(resolved, true, "新 close 落定后 acquire 才能继续");
}

// R3-20（Codex 67 重复关闭）：同一正式标签的关闭事务尚未完成时再次点击
// 关闭，必须复用在途事务，不能覆盖 runtimeResourceClosing 并重复拆除窗口。
{
  let releaseSurface;
  const surfaceGate = new Promise((resolve) => { releaseSurface = resolve; });
  const tracker = makeResourceTracker();
  let syncCalls = 0;
  const { context, appState } = makeContext({
    invokeImpl: trackedInvoke(tracker, happyInvoke),
    captureImpl: async () => VIEW_STATE
  });
  appState.items = [{ id: 7, fileName: "a.html" }];
  await context.openHtmlRuntimeSession(DETAIL, null, 1, 0);
  context.syncHtmlEditReadonlyPatchSurfaceToken = async () => {
    syncCalls += 1;
    await surfaceGate;
  };
  const firstClose = context.closeOpenTab(7);
  await tick();
  const secondClose = context.closeOpenTab(7);
  await tick();
  assert.equal(syncCalls, 1,
    "同一标签重复关闭不得启动第二个拆除事务");
  releaseSurface(true);
  assert.equal(await firstClose, true, "首次关闭应完成");
  assert.equal(await secondClose, true, "重复关闭应等待并复用首次结果");
  assert.equal(tracker.state(7).closeCalls, 1,
    "重复关闭只能回收资源一次");
}

// R3-21：helper 已得出结果，但提交 continuation 前新增关闭任务。
{
  const { context, appState } = makeContext({ invokeImpl: () => null });
  let finish;
  const gate = new Promise(resolve => { finish = resolve; });
  const originalWait = context.waitRuntimeCloseSettled;
  let injected = false;
  context.waitRuntimeCloseSettled = async (id) => {
    const result = await originalWait(id);
    if (!injected) {
      injected = true;
      appState.runtimeResourceClosing.set(id, gate);
    }
    return result;
  };
  let committed = false;
  const pending = context.runWhenRuntimeCloseSettled(7, () => { committed = true; });
  await tick();
  assert.equal(committed, false, "提交前必须重查 helper 返回后新增的关闭任务");
  finish();
  await pending;
  assert.equal(committed, true);
}

// ---------------------------------------------------------------- revision 71
// 演示页状态与受控重建闭环：presentationPageId 全程保留、capture 超时降级、
// 旧 generation report 拒绝、临时态 find 与 promotion 的 surface 收敛。

// R71-1 演示页捕获并回放：capture 返回含 presentationPageId 的完整快照，
// 正式标签绑定必须原样保留（正式 host 重建时以此 goTo 页码）。
{
  const { context, appState } = makeContext({
    invokeImpl: happyInvoke,
    captureImpl: async () => ({ scrollX: 12, scrollY: 34, hash: "#p2", presentationPageId: "bridge-b" })
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  await context.promoteExternalHtmlTab(tab, 7);
  const promoted = appState.runtimeSessions.find((entry) => entry.id === 7);
  assert.ok(promoted, "正式标签记录必须就绪");
  assert.equal(promoted, tab, "同一标签对象原位迁移");
  assert.equal(promoted.viewState?.presentationPageId, "bridge-b", "演示页 id 必须随绑定保留（回放源）");
  assert.equal(promoted.viewState?.hash, "#p2", "hash 必须随绑定保留");
  assert.equal(promoted.viewState?.scrollY, 34, "滚动必须随绑定保留");
  assert.equal(appState.htmlFind.itemId, null, "find 记账不得残留");
}

// R71-2 capture 超时 / 无结果降级：采集失败按「无位置」处理，重建照常完成。
{
  const { context, appState } = makeContext({
    invokeImpl: happyInvoke,
    captureImpl: async () => null
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  await context.promoteExternalHtmlTab(tab, 7);
  const promoted = appState.runtimeSessions.find((entry) => entry.id === 7);
  assert.ok(promoted, "采集降级不得阻断重建");
  assert.equal(promoted.viewState ?? null, null, "无快照时 viewState 为空（重建不回放位置）");
}

// R71-3 真实 captureExternalHtmlViewState + 真实回报 handler：
// 成功捕获含演示页 id（scroll/hash/pageId 全量回传）。
function makeCaptureContext() {
  const appState = { externalViewStateWaiters: new Map() };
  const requests = [];
  const sandbox = {
    appState,
    console,
    window: { setTimeout, clearTimeout },
    setTimeout,
    clearTimeout,
    invoke: async (cmd, payload) => {
      requests.push(payload?.payload ?? payload);
      return true;
    }
  };
  const context = vm.createContext(sandbox);
  vm.runInContext([
    functionSource("normalizeHtmlRuntimeViewState"),
    functionSource("externalViewStateWaiterKey"),
    functionSource("captureExternalHtmlViewState", { isAsync: true }),
    functionSource("clearExternalViewStateWaiters"),
    assignmentSource("__NUTBOOK_HANDLE_EXTERNAL_RUNTIME_VIEW_STATE__")
  ].join("\n"), context);
  return { context, appState, requests, window: sandbox.window };
}

{
  const { context, requests, window } = makeCaptureContext();
  const tab = makeExternalTab("external:s1");
  const capturePromise = context.captureExternalHtmlViewState(tab, 200);
  await tick();
  assert.equal(requests.length, 1, "采集必须恰好下发一次固定脚本");
  const { sessionId, generation, requestId } = requests[0];
  assert.equal(sessionId, "sess-s1", "会话身份必须来自 tab.external");
  assert.equal(generation, 1, "代次必须来自 tab.external");
  window.__NUTBOOK_HANDLE_EXTERNAL_RUNTIME_VIEW_STATE__({
    sessionId,
    generation,
    requestId,
    viewState: { scrollX: 5, scrollY: 34, hash: "#p2", presentationPageId: "bridge-b" }
  });
  const captured = await capturePromise;
  assert.ok(captured, "合法回报必须兑现采集");
  assert.equal(captured.presentationPageId, "bridge-b", "演示页 id 必须随快照回传");
  assert.equal(captured.hash, "#p2", "hash 必须随快照回传");
  assert.equal(captured.scrollY, 34, "滚动必须随快照回传");
}

// R71-4 旧 generation report 被拒绝：晚到的旧代次回报找不到等待器即自然
// 丢弃，不得兑现本次采集、更不得伪造回放源。
{
  const { context, requests, window } = makeCaptureContext();
  const tab = makeExternalTab("external:s1");
  const capturePromise = context.captureExternalHtmlViewState(tab, 200);
  await tick();
  const { sessionId, generation, requestId } = requests[0];
  let settled = false;
  capturePromise.then(() => { settled = true; });
  window.__NUTBOOK_HANDLE_EXTERNAL_RUNTIME_VIEW_STATE__({
    sessionId,
    generation: generation + 1,
    requestId,
    viewState: { scrollY: 999, hash: "#stale", presentationPageId: "stale-page" }
  });
  await tick();
  assert.equal(settled, false, "旧代次回报必须被拒（不得兑现等待器）");
  window.__NUTBOOK_HANDLE_EXTERNAL_RUNTIME_VIEW_STATE__({
    sessionId,
    generation,
    requestId,
    viewState: { scrollY: 34, hash: "", presentationPageId: "bridge-b" }
  });
  const captured = await capturePromise;
  assert.equal(captured.presentationPageId, "bridge-b", "当前代次回报正常兑现");
}

// R71-5 伪造 requestId 与超时：一律按「无位置」降级，不阻断重建。
{
  const { context, requests, window } = makeCaptureContext();
  const tab = makeExternalTab("external:s1");
  const capturePromise = context.captureExternalHtmlViewState(tab, 30);
  await tick();
  const { sessionId, generation } = requests[0];
  window.__NUTBOOK_HANDLE_EXTERNAL_RUNTIME_VIEW_STATE__({
    sessionId,
    generation,
    requestId: "forged-request",
    viewState: { scrollY: 1, presentationPageId: "forged-page" }
  });
  await tick();
  const captured = await capturePromise;
  assert.equal(captured, null, "伪造 requestId 不兑现；等待器走超时降级");
}

// ------------------------------------------------------------------ R92a
// 外部临时 HTML 切换标签后滚动位置丢失（Codex revision 92 P1）。
//
// 已确认根因：外部 host 的隐藏语义是 1x1 → hide → close → 注销登记，**surface
// 被真正销毁**；重新激活必然重建 child。因此位置保留只能靠「hide 前采集一次 +
// 建 child 时经 attach 载荷回放」，与 promotion 共用同一状态模型。
//
// 本组测试覆盖裁定第 5 条要求的四条行为：
//   ① 切走时采集发生在 hide 之前，且快照落到该会话；
//   ② 再次激活时 attach 载荷带上最后一次有效快照（回放源）；
//   ③ 采集等待中关闭：不阻塞关闭、等待器被清理、晚到回报被丢弃；
//   ④ 晚到的旧一轮采集不得覆盖新一轮；promotion 只采集一次且不被覆盖。

// R92a-1 切走：采集必须在 hide 之前，且落库到 tab.external.viewState。
{
  const order = [];
  const { context, appState } = makeContext({
    invokeImpl: (cmd) => {
      if (cmd === "set_external_html_runtime_host_visibility_command") order.push("hide");
      return null;
    },
    captureImpl: async (tab) => {
      order.push(`capture:${tab.external.sessionId}`);
      return VIEW_STATE;
    }
  });
  const tab = makeExternalTab("external:s1");
  appState.tabs.push(tab);
  appState.activeTabId = "B"; // 用户已切到别的标签
  appState.activeRuntimeHostId = tab.id; // 该 surface 此刻仍在显示
  await context.hideRuntimeSessionSurfaces(tab.id, { force: true });
  assert.deepEqual(order, ["capture:sess-s1", "hide"], "位置采集必须发生在销毁 surface 之前");
  assert.equal(tab.external.viewState, VIEW_STATE, "快照必须落到会话（下次建 child 的唯一回放源）");
}

// R92a-2 切回：attach 载荷必须带上最后一次有效快照（回放源）。
function makeExternalHostSyncContext() {
  const records = { invokeArgs: [] };
  const appState = {
    tabs: [],
    runtimeSessions: [],
    activeTabId: null,
    activeRuntimeHostId: null,
    runtimeHostLastBoundsKey: null,
    runtimeHostLastHeight: 0,
    runtimeHiddenSurfaceIds: new Set(),
    runtimeHostSyncRunId: 1,
    runtimeHostSyncInFlight: false,
    runtimeHostSyncPending: false,
    activeHtmlRuntimeUrl: null,
    htmlFind: { itemId: null }
  };
  const sandbox = {
    appState,
    console,
    document: { getElementById: (id) => (id === "runtimeHostMount" ? { id } : null) },
    els: { documentToolbar: null },
    runtimeHostBounds: () => ({ x: 0, y: 0, width: 500, height: 320 }),
    ensureRuntimeHostResizeObserver: () => {},
    syncActiveHtmlFindLayoutBounds: async () => {},
    hideStaleRuntimeHostSync: async () => false,
    setStatus: () => {},
    normalizeError: (error) => String(error),
    getActiveTab: () =>
      [...appState.tabs, ...appState.runtimeSessions].find((tab) => tab.id === appState.activeTabId) || null,
    invoke: async (cmd, payload) => {
      records.invokeArgs.push([cmd, payload]);
      return { runtimeUrl: "http://127.0.0.1:9/x" };
    },
    isRuntimeHostTab: (tab) => Boolean(tab)
      && (tab.preview?.fileType === "html-runtime" || tab.preview?.fileType === "html-runtime-external")
  };
  const context = vm.createContext(sandbox);
  vm.runInContext([
    functionSource("isRuntimeHostSyncCurrent"),
    functionSource("syncActiveExternalRuntimeHost", { isAsync: true })
  ].join("\n"), context);
  return { context, appState, records };
}

{
  const { context, appState, records } = makeExternalHostSyncContext();
  const tab = makeExternalTab("external:s1");
  tab.external.attachReady = true;
  const snapshot = { scrollX: 0, scrollY: 420, hash: "#p3", presentationPageId: "bridge-c" };
  tab.external.viewState = snapshot;
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  await context.syncActiveExternalRuntimeHost(1, tab);
  const attach = records.invokeArgs.find(([cmd]) => cmd === "attach_external_html_runtime_host_command");
  assert.ok(attach, "激活必须挂载外部 host");
  assert.equal(attach[1].payload.sessionId, "sess-s1", "身份必须是会话而非 item");
  assert.equal(attach[1].payload.generation, 1, "代次必须随 attach 送入受限回放链路");
  assert.deepEqual(attach[1].payload.viewState, snapshot, "attach 必须带上最后一次有效快照");

  // 无快照时也必须显式送 null（后端据此不注入回放脚本，而不是沿用旧位置）。
  const fresh = makeExternalHostSyncContext();
  const freshTab = makeExternalTab("external:s2");
  freshTab.external.attachReady = true;
  fresh.appState.tabs.push(freshTab);
  fresh.appState.activeTabId = freshTab.id;
  await fresh.context.syncActiveExternalRuntimeHost(1, freshTab);
  const freshAttach = fresh.records.invokeArgs.find(([cmd]) => cmd === "attach_external_html_runtime_host_command");
  assert.equal(freshAttach[1].payload.viewState, null, "无快照必须显式 null（不恢复位置）");
}

// R92a-3a 采集等待中关闭：等待器被清理，晚到回报拿不到兑现对象（被丢弃）。
{
  const { context, appState, requests, window } = makeCaptureContext();
  const tab = makeExternalTab("external:s1");
  const capturePromise = context.captureExternalHtmlViewState(tab, 40);
  await tick();
  assert.equal(appState.externalViewStateWaiters.size, 1, "在途采集必须先注册等待器");
  const { sessionId, generation, requestId } = requests[0];
  // 关闭该会话：清理其全部等待器。
  context.clearExternalViewStateWaiters(sessionId);
  assert.equal(appState.externalViewStateWaiters.size, 0, "关闭必须清理该会话的在途等待器");
  // 晚到回报：形状与身份都合法，但兑现对象已被清理 → 必须被丢弃。
  window.__NUTBOOK_HANDLE_EXTERNAL_RUNTIME_VIEW_STATE__({
    sessionId,
    generation,
    requestId,
    viewState: { scrollY: 777, presentationPageId: "late-page" }
  });
  const captured = await capturePromise;
  assert.equal(captured, null, "已清理会话的晚到回报不得兑现采集");
  // 不存在的等待器 key 再被清理一次也不得抛错（幂等）。
  context.clearExternalViewStateWaiters(sessionId);
}

// R92a-3b 关闭路径本身：不采集、不被在途采集阻塞、不复活标签。
{
  let captures = 0;
  const { context, appState } = makeContext({
    invokeImpl: happyInvoke,
    captureImpl: async () => { captures += 1; return VIEW_STATE; }
  });
  const tab = makeExternalTab("external:s1");
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  const closed = await context.closeExternalHtmlTab(tab.id, tab);
  assert.equal(closed, true, "关闭必须完成，不被任何在途采集阻塞");
  assert.equal(captures, 0, "关闭路径不得再采集位置（会话即将撤销，采了也没人回放）");
  assert.equal(tab.external?.viewState ?? null, null, "关闭路径不得为已关闭会话落库位置");
  assert.equal(appState.tabs.includes(tab), false, "已关闭标签不得复活");
}

// R92a-4 快照裁决：晚到的旧一轮采集不得覆盖新一轮；null/超时不抹掉已有位置。
{
  const { context } = makeContext({ invokeImpl: happyInvoke, captureImpl: async () => VIEW_STATE });
  const tab = makeExternalTab("external:s1");
  tab.external.viewState = { scrollY: 10 };
  const staleSeq = context.nextExternalViewStateCaptureSeq(tab);
  const freshSeq = context.nextExternalViewStateCaptureSeq(tab);
  assert.equal(context.commitExternalViewStateSnapshot(tab, freshSeq, { scrollY: 900 }), true);
  assert.equal(
    context.commitExternalViewStateSnapshot(tab, staleSeq, { scrollY: 10 }),
    false,
    "落后于最新一轮的晚到快照必须被拒"
  );
  assert.equal(tab.external.viewState.scrollY, 900, "晚到的旧快照不得覆盖新状态");
  assert.equal(
    context.commitExternalViewStateSnapshot(tab, freshSeq + 1, null),
    false,
    "null/超时快照降级为无位置，但不落库"
  );
  assert.equal(tab.external.viewState.scrollY, 900, "失效快照不得抹掉上一次有效位置");
  tab.closed = true;
  assert.equal(
    context.commitExternalViewStateSnapshot(tab, freshSeq + 2, { scrollY: 1 }),
    false,
    "已关闭会话的晚到回报不得回写"
  );
  assert.equal(tab.external.viewState.scrollY, 900, "关闭后快照不得被复活");
}

// R92a-5 promotion：拆除前只采集一次（hide 侧跳过），既省一次 260ms 等待，
// 也保证切 tab 的采集永远无法覆盖 promotion 已抓到的位置（裁定第 4 条）。
{
  let captures = 0;
  const { context, appState } = makeContext({
    invokeImpl: happyInvoke,
    captureImpl: async () => { captures += 1; return VIEW_STATE; }
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  await context.promoteExternalHtmlTab(tab, 7);
  assert.equal(captures, 1, "promotion 拆除只允许一次采集（hide 不得二次采集）");
  const promoted = appState.runtimeSessions.find((entry) => entry.id === 7);
  assert.equal(promoted.viewState, VIEW_STATE, "promotion 快照必须原样保留到正式标签");
}

// R71-6 临时态 find + promotion：find surface 必须在拆除旧 child 之前按
// close 合同收敛（eval 清选区 → visibility false），不残留到正式 host。
{
  const { context, appState, records } = makeContext({
    invokeImpl: happyInvoke,
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  // 模拟临时态查找已打开（Cmd+F / 顶栏正文搜索）。
  appState.htmlFind = { itemId: tab.id, query: "松塔", caseSensitive: false, replaceExpanded: false, count: "2/5" };
  await context.promoteExternalHtmlTab(tab, 7);
  assert.equal(appState.htmlFind.itemId, null, "promotion 完成后 find 记账必须清空");
  const evalAt = records.invoke.indexOf("external_html_find_action_command");
  const visibilityAt = records.invoke.indexOf("set_external_html_find_overlay_visibility_command");
  const closeAt = records.invoke.indexOf("close_external_html_runtime_command");
  assert.ok(evalAt !== -1 && visibilityAt !== -1, "find 收敛必须走外部命令族");
  assert.ok(evalAt < closeAt && visibilityAt < closeAt, "find 收敛必须发生在拆除旧 child 之前");
  const promoted = appState.runtimeSessions.find((entry) => entry.id === 7);
  assert.ok(promoted, "find 收敛不得阻断 promotion");
}

// R71-7 等待中关闭 + find 打开：关闭意图优先，find surface 同步收敛且不复活。
{
  let resolveResources;
  const { context, appState, records } = makeContext({
    invokeImpl: (cmd) => {
      if (cmd === "open_html_window") return new Promise((resolve) => { resolveResources = resolve; });
      if (cmd === "close_external_html_runtime_command" || cmd === "external_session_close") return true;
      if (cmd === "get_item_detail") return DETAIL;
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  appState.htmlFind = { itemId: tab.id, query: "松塔", caseSensitive: false, replaceExpanded: false, count: "1/3" };
  const done = context.promoteExternalHtmlTab(tab, 7);
  await tick(); await tick(); await tick();
  tab.closed = true; // 资源等待期间用户关闭（此时 find 仍标记打开）
  resolveResources(SESSION_PAYLOAD);
  await done;
  assert.equal(appState.runtimeSessions.find((entry) => entry.id === 7), undefined,
    "已关闭标签不得创建正式标签");
  assert.equal(appState.htmlFind.itemId, null, "关闭路径不得残留 find 记账");
  assert.ok(records.invoke.includes("close_external_html_runtime_command"), "真实 closeExternalHtmlTab 已执行拆除");
}

// R71-8 临时态 find + 直接关闭标签：同一收敛合同（eval 清选区 → 关 find
// child → 拆 host），find child 不晚于 host 拆除残留。
{
  const { context, appState, records } = makeContext({
    invokeImpl: (cmd) => {
      if (cmd === "close_external_html_runtime_command" || cmd === "external_session_close") return true;
      return null;
    },
    captureImpl: async () => VIEW_STATE
  });
  const tab = makeExternalTab("external:s1", { joined: true });
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  appState.htmlFind = { itemId: tab.id, query: "松塔", caseSensitive: false, replaceExpanded: false, count: "0/3" };
  const closed = await context.closeExternalHtmlTab(tab.id, tab);
  assert.equal(closed, true, "外部标签必须可关闭");
  const evalAt = records.invoke.indexOf("external_html_find_action_command");
  const visibilityAt = records.invoke.indexOf("set_external_html_find_overlay_visibility_command");
  const closeAt = records.invoke.indexOf("close_external_html_runtime_command");
  assert.ok(evalAt !== -1 && visibilityAt !== -1 && evalAt < closeAt && visibilityAt < closeAt,
    "关闭标签时 find child 必须先于 host 拆除收敛");
  assert.equal(appState.htmlFind.itemId, null, "关闭后 find 记账清空");
}

// R74-1（P2-R71a）外部查找动作结构化：真实 find action handler 只向外部
// 会话发 {action, query, caseSensitive} 结构化载荷——脚本文本不再离开
// main 页，身份由宿主解析，且无双重 payload 包装（commandVariants 缺陷回归）。
function makeFindActionContext() {
  const appState = {
    tabs: [],
    runtimeSessions: [],
    activeTabId: null,
    htmlFind: { itemId: null, query: "", caseSensitive: false, replaceExpanded: false, count: "0/0" },
    htmlFindOverlayEpoch: 0,
    htmlFindOverlaySyncLane: Promise.resolve(),
    htmlFindOverlayLastContentKey: null,
    htmlFindOverlayLastBoundsKey: null
  };
  const invokes = [];
  const resultSyncs = [];
  const sandbox = {
    appState,
    console,
    window: {},
    invoke: async (cmd, args) => { invokes.push([cmd, args]); return true; },
    getActiveTab: () =>
      [...appState.tabs, ...appState.runtimeSessions].find((tab) => tab.id === appState.activeTabId) || null,
    getOpenTab: (tabId) =>
      [...appState.tabs, ...appState.runtimeSessions].find((tab) => tab.id === tabId) || null,
    recordHtmlFindHistory: () => {},
    updateActiveHtmlFindContent: () => { resultSyncs.push(appState.htmlFind.count); return Promise.resolve(true); }
  };
  const context = vm.createContext(sandbox);
  vm.runInContext([
    functionSource("isRuntimeHostTab"),
    functionSource("isHtmlFindTab"),
    functionSource("isExternalRuntimeTab"),
    functionSource("closeActiveHtmlFind", { isAsync: true }),
    functionSource("setHtmlFindOverlayVisibilityFor"),
    assignmentArrowSource("__NUTBOOK_HANDLE_HTML_FIND_ACTION__"),
    assignmentArrowSource("__NUTBOOK_HANDLE_HTML_FIND_RESULT__")
  ].join("\n"), context);
  return { context, appState, invokes, resultSyncs };
}

{
  const { context, appState, invokes } = makeFindActionContext();
  const tab = makeExternalTab("external:s1");
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  appState.htmlFind = { itemId: tab.id, query: "松塔", caseSensitive: false, replaceExpanded: false, count: "0/0" };
  await context.window.__NUTBOOK_HANDLE_HTML_FIND_ACTION__({
    itemId: tab.id, action: "query", query: "松塔", caseSensitive: false
  });
  const findCalls = invokes.filter(([cmd]) => cmd === "external_html_find_action_command");
  assert.equal(findCalls.length, 1, "外部查找必须恰好下发一次结构化动作");
  const [cmd, args] = findCalls[0];
  // vm 跨 realm 对象原型不同，用 JSON 往返后比较结构。
  assert.deepEqual(JSON.parse(JSON.stringify(args)), {
    payload: { sessionId: "sess-s1", generation: 1, action: "query", query: "松塔", caseSensitive: false }
  }, "结构化载荷只含动作枚举与参数，身份来自 tab.external");
  assert.equal(args.payload?.payload, undefined, "不得出现双重 payload 包装（commandVariants 缺陷回归）");
  assert.ok(!JSON.stringify(args).includes('"script"'), "载荷不得携带任何脚本文本");
}

// R74-2（P2-R71a）hostile replace 动作仍只发结构化载荷：后端 deny-by-default
// 拒绝（Rust 单测裁决），main 页没有也不需要任何脚本文本通道。
{
  const { context, appState, invokes } = makeFindActionContext();
  const tab = makeExternalTab("external:s1");
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  appState.htmlFind = { itemId: tab.id, query: "x", caseSensitive: false, replaceExpanded: false, count: "0/0" };
  await context.window.__NUTBOOK_HANDLE_HTML_FIND_ACTION__({
    itemId: tab.id, action: "replace", query: "x", replacement: "y"
  });
  const findCalls = invokes.filter(([cmd]) => cmd === "external_html_find_action_command");
  assert.equal(findCalls.length, 1, "replace 动作同样只走结构化命令");
  const [, args] = findCalls[0];
  assert.equal(args.payload.action, "replace", "动作原样上报，由宿主拒绝");
  assert.equal(args.payload.replacement, undefined, "replacement 不进入外部载荷");
  assert.ok(!JSON.stringify(args).includes('"script"'), "无脚本文本通道");
}

// R74-3 外部 find 关闭：close 动作结构化下发（清选区脚本由宿主固定模板
// 构造），先于 visibility false，无双重包装、无脚本文本。
{
  const { context, appState, invokes } = makeFindActionContext();
  const tab = makeExternalTab("external:s1");
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  appState.htmlFind = { itemId: tab.id, query: "松塔", caseSensitive: false, replaceExpanded: false, count: "1/3" };
  await context.closeActiveHtmlFind();
  const closeAt = invokes.findIndex(([cmd, args]) =>
    cmd === "external_html_find_action_command" && args?.payload?.action === "close");
  const visibilityAt = invokes.findIndex(([cmd]) => cmd === "set_external_html_find_overlay_visibility_command");
  assert.ok(closeAt !== -1 && visibilityAt !== -1 && closeAt < visibilityAt,
    "close 动作必须先于 find surface 隐藏");
  const [, args] = invokes[closeAt];
  assert.equal(args.payload.payload, undefined, "不得出现双重 payload 包装");
  assert.ok(!JSON.stringify(args).includes('"script"'), "清选区也不得携带脚本文本");
}

// R83-1（P2-R80b）外部查找**结果**闭环：动作下发后，宿主固定模板回报的
// 字符串身份结果必须落到 appState.htmlFind.count（用户实测 0/0 的断点在宿主
// 载荷把字符串身份按 i64 反序列化 —— Rust 单测已有 F2P 回归）；错误会话 /
// 数字身份 / 零命中的结果必须按合同处理。
{
  const { context, appState, invokes, resultSyncs } = makeFindActionContext();
  const tab = makeExternalTab("external:s1");
  appState.tabs.push(tab);
  appState.activeTabId = tab.id;
  appState.htmlFind = { itemId: tab.id, query: "远程", caseSensitive: false, replaceExpanded: false, count: "0/0" };
  await context.window.__NUTBOOK_HANDLE_HTML_FIND_ACTION__({
    itemId: tab.id, action: "query", query: "远程", caseSensitive: false
  });
  const queryCall = invokes.find(([cmd]) => cmd === "external_html_find_action_command");
  assert.ok(queryCall, "外部查找必须先下发结构化动作");
  assert.equal(queryCall[1].payload.itemId, undefined, "结构化载荷不携带身份（身份由宿主从 tab.external 解析）");
  assert.equal(queryCall[1].payload.sessionId, "sess-s1", "身份来自外部会话，而不是页面自报");

  // 合法结果：itemId 与 tab.id 同形（字符串）。
  context.window.__NUTBOOK_HANDLE_HTML_FIND_RESULT__({ itemId: tab.id, total: 3, current: 2 });
  assert.equal(appState.htmlFind.count, "2/3", "外部查找结果必须更新面板计数");
  assert.equal(resultSyncs.at(-1), "2/3", "计数更新必须驱动 find 面板同步");
  // 数字身份（正式 item 形态）不得改外部计数。
  context.window.__NUTBOOK_HANDLE_HTML_FIND_RESULT__({ itemId: 1, total: 9, current: 1 });
  assert.equal(appState.htmlFind.count, "2/3", "非本标签形态的结果必须丢弃");
  // 错误会话同样丢弃。
  context.window.__NUTBOOK_HANDLE_HTML_FIND_RESULT__({ itemId: "external:s9", total: 9, current: 1 });
  assert.equal(appState.htmlFind.count, "2/3", "错误会话的结果必须丢弃");
  // 零命中不得显示 1/0。
  context.window.__NUTBOOK_HANDLE_HTML_FIND_RESULT__({ itemId: tab.id, total: 0, current: 1 });
  assert.equal(appState.htmlFind.count, "0/0", "零命中必须显示 0/0");
}

console.log("promotion behavior checks passed：同标签状态机（teardown/mount/failed）+ 同对象原位迁移 / 当前选中才挂载 / 关闭意图优先 / 失败占位加号可见可达 / 重试不重复 join / 单实例合并 / P2-R3a 持有者台账（pending in-flight 占用、token≠接管、B 取消后 A 回收、confirm 持有不误关、adopt/放弃、迁移转正+closeOpenTab 回收、撤销失败可见）/ P2-R3b 真实打开 reject 释放 pending / P2-R3c 关闭走台账协调（B 在册不撤销）+ 在途 close 串行化 / P2-R3d 关闭事务串行化（B 在旧关闭 await 期间完成不会被抹掉、promotion 并入同判定）/ revision 71 演示页捕获并回放（pageId/hash/scroll 全量保留）、capture 超时与伪造 requestId 降级、旧 generation report 拒绝、find surface 在 promotion/关闭前后不残留 / revision 83 外部查找结果闭环（字符串身份计数更新、错误会话与数字身份丢弃、零命中 0/0） / revision 92 R92a 切换标签位置保留（hide 前采集 → attach 载荷回放、采集等待中关闭清理等待器且晚到回报被丢弃、旧序号快照不得覆盖新状态、无快照显式 null、promotion 只采集一次）");
