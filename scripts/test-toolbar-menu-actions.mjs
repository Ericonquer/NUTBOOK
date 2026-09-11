import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const indexHtml = readFileSync("dist/index.html", "utf8");
const runtimeOverlayHtml = readFileSync("dist/runtime-overlay.html", "utf8");
const htmlFindOverlayHtml = readFileSync("dist/html-find-overlay.html", "utf8");
const runtimeRust = readFileSync("src-tauri/src/core/html_runtime.rs", "utf8");

assert.doesNotMatch(
  indexHtml,
  /<div class="home-header-copy">\s*<div class="section-label" data-i18n-key="nav\.browse">浏览<\/div>/,
  "the home heading must not repeat the sidebar's Browse label"
);
assert.match(
  indexHtml,
  /<section class="nav-shell">\s*<div class="section-label" data-i18n-key="nav\.browse">浏览<\/div>/,
  "the sidebar navigation group label must remain available"
);

const markdownFavoritePath = indexHtml.match(/id="documentFavoriteButton"[\s\S]*?<path class="star-icon-path" d="([^"]+)"/)?.[1];
const htmlFavoritePath = runtimeOverlayHtml.match(/<path id="favoritePath" d="([^"]+)"[^>]*stroke-width="([^"]+)"/) || [];
assert.ok(markdownFavoritePath, "Markdown favorite path must exist");
assert.equal(htmlFavoritePath[1], markdownFavoritePath, "HTML and Markdown favorite icons must use the same drawn geometry");
assert.equal(htmlFavoritePath[2], "1.5", "HTML and Markdown favorite icons must use the same stroke weight");

assert.match(
  indexHtml,
  /<article class="item-card[^>]*" data-open-item="\$\{item\.id\}">[\s\S]*?<button class="card-remove"[\s\S]*?<button class="card-favorite[^>]*"[\s\S]*?<button class="item-card-open" type="button" data-open-trigger="\$\{item\.id\}"/,
  "file-card open, remove, and favorite actions must be sibling buttons"
);
assert.doesNotMatch(
  indexHtml,
  /<article class="item-card[^>]*"[^>]*role="button"/,
  "file cards must not expose a nested role=button around remove/favorite controls"
);
assert.match(
  indexHtml,
  /class="card-remove"[^>]*aria-label="\$\{escapeAttribute\(t\("actions\.removeFromNutbook"\)\)\}"[\s\S]*?<span class="card-action-tooltip">\$\{appState\.altKeyPressed \? t\("actions\.delete"\) : t\("actions\.remove"\)\}<\/span>/,
  "file-card remove labels and tooltips must follow the active language"
);
assert.match(
  indexHtml,
  /class="card-favorite[^>]*aria-label="\$\{escapeAttribute\(t\(item\.isFavorite \? "actions\.unfavoriteFile" : "actions\.favoriteFile"\)\)\}"[\s\S]*?<span class="card-action-tooltip">\$\{t\("actions\.favorite"\)\}<\/span>/,
  "file-card favorite labels and tooltips must follow the active language"
);
assert.match(
  indexHtml,
  /\.settings-tab\[data-programmatic-focus\]:focus[\s\S]*?outline:\s*none\s*!important/,
  "the initial programmatic settings-tab focus must not render a pointer-style black box"
);
assert.match(
  functionSource("focusSelectedSettingsTab"),
  /dataset\.programmaticFocus = "true"[\s\S]*?addEventListener\("blur"[\s\S]*?focus\(\{ preventScroll: true \}\)/,
  "settings must preserve initial focus while restoring ordinary keyboard focus after blur"
);
assert.match(
  indexHtml,
  /<span class="nav-tooltip" data-i18n-key="nav\.settings">设置<\/span>/,
  "the settings tooltip must be explicitly translated instead of relying on legacy text scanning"
);

const fingerprintContext = {
  appState: { language: "zh-CN", altKeyPressed: false },
  JSON
};
vm.createContext(fingerprintContext);
vm.runInContext(`${functionSource("itemsFingerprint")}; globalThis.itemsFingerprint = itemsFingerprint;`, fingerprintContext);
const fingerprintItems = [{ id: 1, fileName: "demo.md", title: "Demo", pathState: "valid", isFavorite: false, thumbnail: null, tags: [], sourceBadges: [] }];
const chineseFingerprint = fingerprintContext.itemsFingerprint(fingerprintItems);
fingerprintContext.appState.language = "en-US";
const englishFingerprint = fingerprintContext.itemsFingerprint(fingerprintItems);
assert.notEqual(chineseFingerprint, englishFingerprint, "language changes must invalidate file-card render snapshots");
assert.match(
  functionSource("updateInterfaceLanguage"),
  /appState\.isSettingsOverlay && propagateToMain[\s\S]*?action:\s*"language-change"[\s\S]*?language:\s*appState\.language/,
  "a settings child webview must report its language change to the main webview"
);
assert.match(
  indexHtml,
  /window\.__NUTBOOK_UPDATE_INTERFACE_LANGUAGE__\s*=\s*\(language\)\s*=>\s*updateInterfaceLanguage\(language, \{ propagateToMain: false \}\)/,
  "the main webview must expose a non-looping language refresh entry point"
);
assert.match(
  runtimeRust,
  /"language-change"[\s\S]*?window\.__NUTBOOK_UPDATE_INTERFACE_LANGUAGE__\?\.\(\{language_json\}\);/,
  "the settings overlay host bridge must forward language changes to the main webview"
);

function functionSource(name) {
  const marker = `function ${name}`;
  const markerStart = indexHtml.indexOf(marker);
  assert.ok(markerStart >= 0, `${name} must exist`);
  const start = indexHtml.slice(Math.max(0, markerStart - 6), markerStart) === "async "
    ? markerStart - 6
    : markerStart;
  const signatureEnd = indexHtml.indexOf(") {", start);
  assert.ok(signatureEnd >= 0, `${name} must have a block body`);
  const bodyStart = signatureEnd + 2;
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < indexHtml.length; index += 1) {
    const char = indexHtml[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote) {
      if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return indexHtml.slice(start, index + 1);
    }
  }
  throw new Error(`Unable to parse ${name}`);
}

// A destination change must converge every stale HTML child, not only the tab
// that happened to be active when navigation began. Otherwise A/B/C opens can
// leave native siblings above a later Markdown tab or the home DOM.
// P2：正式 item HTML 在 runtimeSessions，外部临时 HTML 在 tabs；两类都要收敛。
const switchEvents = [];
const switchCoordinator = {
  appState: {
    runtimeControlsOverlayExpanded: true,
    runtimeControlsOverlayMode: "more",
    activeRuntimeHostId: 41,
    runtimeHostLastBoundsKey: "41:old",
    runtimeNavigationEpoch: 0,
    runtimeSessions: [
      { id: 41, preview: { fileType: "html-runtime" } },
      { id: 42, preview: { fileType: "html-runtime" } },
      { id: 43, preview: { fileType: "html-runtime" } }
    ],
    tabs: [
      {
        id: "external:ext-a",
        sourceMode: "external",
        external: { sessionId: "ext-a" },
        preview: { fileType: "html-runtime-external" }
      }
    ]
  },
  isRuntimeHostTab: (tab) => Boolean(tab)
    && (tab.preview?.fileType === "html-runtime" || tab.preview?.fileType === "html-runtime-external"),
  isExternalRuntimeTab: (tab) => Boolean(tab) && tab.preview?.fileType === "html-runtime-external",
  externalRuntimeTabForId: (tabId) => switchCoordinator.appState.tabs.find(
    (tab) => tab.id === tabId && tab.preview?.fileType === "html-runtime-external"
  ) || null,
  getOpenTab: (itemId) => switchCoordinator.appState.runtimeSessions.find((session) => session.id === itemId)
    || switchCoordinator.appState.tabs.find((tab) => tab.id === itemId)
    || null,
  cancelHtmlRemoveConfirmOverlay: async () => { switchEvents.push("cancel-confirm"); },
  cleanupRuntimeHostSync: () => { switchEvents.push("invalidate-sync"); },
  cancelPendingRuntimeSurfaceHide: (itemId) => { switchEvents.push(`cancel:${itemId}`); },
  nextRuntimeSurfaceToken: (itemId) => { switchEvents.push(`token:${itemId}`); return itemId; },
  syncHtmlEditReadonlyPatchSurfaceToken: async (itemId) => { switchEvents.push(`sync:${itemId}`); },
  hideRuntimeSessionSurfaces: async (itemId, options) => {
    assert.equal(options.force, true);
    assert.equal(options.token, itemId);
    assert.equal(options.navigationEpoch, 1);
    assert.equal(options.keepItemId, null);
    switchEvents.push(`hide:${itemId}`);
  },
  scheduleRuntimeSurfaceHide: async (itemId) => { switchEvents.push(`recheck:${itemId}`); }
};
vm.createContext(switchCoordinator);
vm.runInContext([
  functionSource("syncRuntimeSurfaceHideToken"),
  functionSource("nextRuntimeNavigationEpoch"),
  functionSource("isRuntimeNavigationCurrent"),
  functionSource("convergeInactiveRuntimeSurfaces"),
  functionSource("scheduleRuntimeCleanupAfterTabSwitch")
].join("\n"), switchCoordinator);
await switchCoordinator.scheduleRuntimeCleanupAfterTabSwitch(41, null);
assert.deepEqual(
  switchEvents.filter((event) => event.startsWith("hide:")),
  ["hide:41", "hide:42", "hide:43", "hide:external:ext-a"],
  "home navigation must hide all registered HTML runtime surfaces, including external temporary HTML tabs"
);
assert.equal(switchCoordinator.appState.activeRuntimeHostId, null);
assert.equal(switchCoordinator.appState.runtimeHostLastBoundsKey, null);

// 外部临时 HTML 的 surface 生命周期：切走 → 切回（真实 attach 让 child 再次可见）
// → 再切走，必须**再次** hide。「已隐藏」记账只在 hide 时写入、必须在 surface
// 重新可见时清除，否则第二次切走会被 hideRuntimeSessionSurfaces 的「已隐藏」
// 短路吞掉，外部 child 永久残留在最上层（切标签残留覆盖层回归）。
const externalSurfaceEvents = [];
const externalSurfaceApp = {
  runtimeSurfacesSuspended: false,
  runtimeControlsOverlayExpanded: false,
  runtimeControlsOverlayMode: "default",
  runtimeSessions: [],
  tabs: [{
    id: "external:ext-a",
    sourceMode: "external",
    external: { sessionId: "ext-a", generation: 1, attachReady: true },
    preview: { fileType: "html-runtime-external" }
  }],
  activeTabId: "external:ext-a",
  activeRuntimeHostId: "external:ext-a",
  runtimeHostLastBoundsKey: "external:ext-a:10:60:800:600",
  runtimeHostLastHeight: 600,
  activeHtmlRuntimeUrl: null,
  runtimeViewStateSurfaceTokens: new Map(),
  runtimeNavigationEpoch: 0,
  runtimeSurfaceTokens: new Map(),
  runtimeHiddenSurfaceIds: new Set(),
  // revision 71：外部 surface 收敛会检查/关闭打开中的 find surface；
  // 本场景 find 未打开，桩记录调用即可。
  htmlFind: { itemId: null, query: "", caseSensitive: false, replaceExpanded: false, count: "0/0" },
  htmlFindOverlayEpoch: 0,
  htmlFindOverlaySyncLane: Promise.resolve(),
  htmlFindOverlayLastContentKey: null,
  htmlFindOverlayLastBoundsKey: null
};
const externalSurfaceContext = {
  appState: externalSurfaceApp,
  document: {
    getElementById: (id) => (id === "runtimeHostMount"
      ? { getBoundingClientRect: () => ({ left: 10, top: 60, width: 800, height: 600 }) }
      : null)
  },
  els: { documentToolbar: null },
  getOpenTab: (id) => externalSurfaceApp.tabs.find((tab) => tab.id === id)
    || externalSurfaceApp.runtimeSessions.find((session) => session.id === id)
    || null,
  getActiveTab: () => externalSurfaceApp.tabs.find((tab) => tab.id === externalSurfaceApp.activeTabId) || null,
  invoke: async (command) => {
    externalSurfaceEvents.push(command);
    return { runtimeUrl: "http://127.0.0.1:9/ext" };
  },
  syncHtmlEditReadonlyPatchSurfaceToken: async () => {},
  ensureRuntimeHostResizeObserver: () => {},
  closeActiveHtmlFind: async () => { externalSurfaceEvents.push("close-find"); },
  syncActiveHtmlFindLayoutBounds: async () => { externalSurfaceEvents.push("find-bounds"); },
  // R92a：切走前的固定脚本采集（跨进程边界，桩掉；本组只关心 hide/attach 顺序）。
  captureExternalHtmlViewState: async () => null,
  setStatus: () => {},
  normalizeError: (error) => String(error)
};
vm.createContext(externalSurfaceContext);
vm.runInContext([
  functionSource("nextRuntimeNavigationEpoch"),
  functionSource("isRuntimeNavigationCurrent"),
  functionSource("nextRuntimeSurfaceToken"),
  functionSource("currentRuntimeSurfaceToken"),
  functionSource("isExternalRuntimeTab"),
  functionSource("externalRuntimeTabForId"),
  functionSource("isRuntimeHostTab"),
  functionSource("isRuntimeSurfaceActive"),
  functionSource("isRuntimeSurfaceHideCurrent"),
  // R92a：hide 前采集的序号 / 落库 / 会话清理（真实源码，跨进程采集已桩掉）。
  functionSource("nextExternalViewStateCaptureSeq"),
  functionSource("commitExternalViewStateSnapshot"),
  functionSource("clearExternalViewStateWaiters"),
  functionSource("syncRuntimeSurfaceHideToken"),
  functionSource("setRuntimeHostVisibility"),
  functionSource("hideRuntimeSessionSurfaces"),
  functionSource("isRuntimeHostSyncCurrent"),
  functionSource("hideStaleRuntimeHostSync"),
  functionSource("runtimeHostBounds"),
  functionSource("syncActiveExternalRuntimeHost"),
  functionSource("convergeInactiveRuntimeSurfaces")
].join("\n"), externalSurfaceContext);

const EXT_SURFACE_HIDE = "set_external_html_runtime_host_visibility_command";
const EXT_SURFACE_ATTACH = "attach_external_html_runtime_host_command";
const extSurfaceHides = () => externalSurfaceEvents.filter((event) => event === EXT_SURFACE_HIDE).length;
const extSurfaceTab = externalSurfaceApp.tabs[0];

await externalSurfaceContext.convergeInactiveRuntimeSurfaces(
  null,
  externalSurfaceContext.nextRuntimeNavigationEpoch()
);
assert.equal(extSurfaceHides(), 1, "切走后外部临时 HTML surface 必须 hide");
assert.ok(
  externalSurfaceApp.runtimeHiddenSurfaceIds.has(extSurfaceTab.id),
  "切走后外部 surface 必须记账为「已隐藏」"
);

externalSurfaceApp.activeTabId = extSurfaceTab.id;
await externalSurfaceContext.syncActiveExternalRuntimeHost(null, extSurfaceTab);
assert.equal(
  externalSurfaceEvents.filter((event) => event === EXT_SURFACE_ATTACH).length,
  1,
  "切回外部标签必须重新 attach surface"
);
assert.ok(
  !externalSurfaceApp.runtimeHiddenSurfaceIds.has(extSurfaceTab.id),
  "外部 surface 重新可见后必须清除「已隐藏」记账（否则后续切走被短路）"
);

await externalSurfaceContext.convergeInactiveRuntimeSurfaces(
  null,
  externalSurfaceContext.nextRuntimeNavigationEpoch()
);
assert.equal(
  extSurfaceHides(),
  2,
  "外部 surface 重新 attach 后再切走必须再次 hide，不得因陈旧记账被短路"
);
assert.match(functionSource("openItem"), /const navigationEpoch = nextRuntimeNavigationEpoch\(\)[\s\S]*?isCurrentItemOpenToken\(itemId, openToken, navigationEpoch\)/, "each file-open intent must own a global navigation epoch");
assert.match(functionSource("openItem"), /previousTabId !== itemId[\s\S]*?cleanupRuntimeHostSync\(\);[\s\S]*?convergeInactiveRuntimeSurfaces\(null, navigationEpoch\)/, "a new file intent must remove the old native surface before its async preview finishes");
assert.match(functionSource("isCurrentItemOpenToken"), /isRuntimeNavigationCurrent\(navigationEpoch\)/, "a per-item token alone must not permit an older cross-item open to land");
assert.match(functionSource("openHtmlRuntimeSession"), /isCurrentItemOpenToken\(detail\.id, openToken, navigationEpoch\)\) \{[\s\S]*?await releaseRuntimeResourceHolder\(detail\.id, leaseId\);/, "a stale same-item completion must release its own holder lease (reclaim only when the holder ledger empties — a newer owner's lease blocks the close)");
assert.match(
  indexHtml,
  /async function showAllFilesHome[\s\S]*?appState\.activeTabId = null;[\s\S]*?await scheduleRuntimeCleanupAfterTabSwitch\(previousTabId, null\);[\s\S]*?await loadItems\(\);[\s\S]*?renderTabs\(\);[\s\S]*?renderViewer\(\);/,
  "side-nav All Files must await native runtime cleanup before loading and rendering home"
);

// Runtime geometry has one long-lived ResizeObserver per mount. Re-observing
// the same target after every sync re-delivers the initial size and creates a
// self-scheduling native WebView mutation loop.
const resizeEvents = [];
class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback;
    resizeEvents.push("create");
  }
  observe(target) { resizeEvents.push(`observe:${target.id}`); }
  disconnect() { resizeEvents.push("disconnect"); }
}
const resizeCoordinator = {
  appState: { runtimeHostResizeObserver: null, runtimeHostResizeObserverTarget: null },
  ResizeObserver: FakeResizeObserver,
  scheduleRuntimeHostSync: () => resizeEvents.push("schedule")
};
vm.createContext(resizeCoordinator);
vm.runInContext(`${functionSource("ensureRuntimeHostResizeObserver")}; globalThis.ensureRuntimeHostResizeObserver = ensureRuntimeHostResizeObserver;`, resizeCoordinator);
const mountA = { id: "mount-a" };
const mountB = { id: "mount-b" };
resizeCoordinator.ensureRuntimeHostResizeObserver(mountA);
resizeCoordinator.ensureRuntimeHostResizeObserver(mountA);
assert.deepEqual(resizeEvents, ["create", "observe:mount-a"], "the same runtime mount must never be disconnected and observed again by its own sync");
resizeCoordinator.appState.runtimeHostResizeObserver.callback();
assert.equal(resizeEvents.filter((event) => event === "schedule").length, 1, "one ResizeObserver delivery must schedule one host sync");
resizeCoordinator.ensureRuntimeHostResizeObserver(mountB);
assert.deepEqual(resizeEvents.slice(-2), ["disconnect", "observe:mount-b"], "a replaced mount must move the single observer subscription exactly once");
assert.match(
  functionSource("hideInactiveRuntimeHosts"),
  /if \(options\.invalidate !== false\) cleanupRuntimeHostSync\(\);/,
  "the active sync must not tear down its own ResizeObserver while hiding inactive tabs"
);

// Every structured Tauri command must cross the shared invoke adapter with
// the named `payload` argument expected by its Rust command signature.
const commandVariantContext = {};
vm.createContext(commandVariantContext);
vm.runInContext(`${functionSource("commandVariants")}; globalThis.commandVariants = commandVariants;`, commandVariantContext);
assert.doesNotMatch(
  functionSource("runRuntimeHostSync"),
  /prewarm_html_(?:find|runtime_controls)_overlay_command|awaitRuntimeControlsPrewarm/,
  "opening an HTML document must not pre-create transparent child surfaces"
);
assert.doesNotMatch(indexHtml, /prewarm_html_(?:find|runtime_controls)_overlay_command/, "the frontend must not retain failed transparent-child prewarm commands");
assert.doesNotMatch(runtimeRust, /pub fn prewarm_html_(?:find|runtime_controls)_overlay/, "the native runtime must not retain failed transparent-child prewarm paths");

// Find content updates are serialized and deduplicated. Only explicit open may
// use the attach/show/focus path; render/result updates must stay eval-only.
let resolveFindAttach;
const findInvocations = [];
const findCoordinator = {
  appState: {
    htmlFind: { itemId: 41, query: "松塔协议", caseSensitive: false, replaceExpanded: false, count: "0/0" },
    htmlFindOverlayEpoch: 1,
    htmlFindOverlaySyncLane: Promise.resolve(),
    htmlFindOverlayLastContentKey: null,
    htmlFindOverlayLastBoundsKey: null,
    htmlEditSession: null
  },
  getActiveTab: () => ({ id: 41, preview: { fileType: "html-runtime" } }),
  isHtmlFindTab: (tab) => Boolean(tab)
    && (tab.preview?.fileType === "html-runtime" || tab.preview?.fileType === "html-runtime-external"),
  isExternalRuntimeTab: (tab) => Boolean(tab) && tab.preview?.fileType === "html-runtime-external",
  getOpenTab: (id) => (id === 41 ? { id: 41, preview: { fileType: "html-runtime" } } : null),
  htmlFindLabels: () => ({ query: "搜索正文内容" }),
  readHtmlFindHistory: () => [],
  htmlFindOverlayBounds: () => ({ x: 880, y: 104, width: 560, height: 76 }),
  invoke: async (command, args) => {
    findInvocations.push({ command, args });
    if (command === "attach_html_find_overlay_command") {
      await new Promise((resolve) => { resolveFindAttach = resolve; });
    }
    return true;
  }
};
vm.createContext(findCoordinator);
vm.runInContext([
  functionSource("activeHtmlFindContentPayload"),
  functionSource("htmlFindContentKey"),
  functionSource("queueActiveHtmlFindSurfaceSync"),
  functionSource("updateActiveHtmlFindContent")
].join("\n"), findCoordinator);
const openingFind = findCoordinator.queueActiveHtmlFindSurfaceSync({ attach: true });
while (!resolveFindAttach) await new Promise((resolve) => setTimeout(resolve, 0));
const renderingFind = findCoordinator.updateActiveHtmlFindContent();
resolveFindAttach(true);
await Promise.all([openingFind, renderingFind]);
assert.deepEqual(
  findInvocations.map((entry) => entry.command),
  ["attach_html_find_overlay_command"],
  "a render queued behind an identical explicit open must not replay find update/show/focus"
);
findCoordinator.appState.htmlFindOverlayLastContentKey = null;
findCoordinator.invoke = async () => false;
assert.equal(await findCoordinator.updateActiveHtmlFindContent(), false, "a missing native find child must report an unsatisfied content update");
assert.equal(findCoordinator.appState.htmlFindOverlayLastContentKey, null, "a failed native update must not poison the retry key");
assert.match(indexHtml, /__NUTBOOK_HANDLE_HTML_FIND_ACTION__[\s\S]*?appState\.htmlFind\.itemId !== payload\.itemId\) return;/, "a title message arriving after close must not resurrect the find owner");
assert.match(htmlFindOverlayHtml, /const focusQuery = Boolean\(next\.focusQuery\)[\s\S]*?if \(focusQuery\) requestAnimationFrame\(\(\) => query\.focus\(\)\)/, "only an explicit focusQuery update may focus the native find input");
assert.doesNotMatch(htmlFindOverlayHtml, /renderHistory\(\); requestAnimationFrame\(\(\) => query\.focus\(\)\)/, "ordinary find state updates must not steal focus");
assert.match(htmlFindOverlayHtml, /if \(focusQuery\) \{ delete panel\.dataset\.closing; armHoverReset\(\); \}/, "every explicit find show must reset closing state and suppress stale hover retained while hidden");
assert.match(htmlFindOverlayHtml, /const closeFind = \(\) => \{ panel\.dataset\.closing = 'true'; document\.activeElement\?\.blur\?\.\(\); armHoverReset\(\); emit\('close'\); \}/, "find close must synchronously clear focus and paint state before the host hide IPC");
assert.match(htmlFindOverlayHtml, /data-suppress-hover="true"[\s\S]*?button:hover \.tip \{ opacity: 0;/, "stale find-button hover must not paint its tooltip after reuse");
assert.match(htmlFindOverlayHtml, /hoverResetOrigin[\s\S]*?Math\.hypot\(event\.screenX - hoverResetOrigin\.x, event\.screenY - hoverResetOrigin\.y\) > 4\) releaseHoverReset\(\)/, "hover suppression must release only after a new physical pointer movement");
assert.match(htmlFindOverlayHtml, /\.panel\s*\{[^}]*background:\s*#fff;/, "the native find panel must paint an opaque first frame over the HTML child webview");
assert.doesNotMatch(htmlFindOverlayHtml, /\.panel\s*\{[^}]*background:\s*rgba\(/, "the native find panel must not depend on translucent child-webview compositing");
assert.match(functionSource("htmlFindOverlayBounds"), /runtimeScrollbarGutter = 14[\s\S]*?viewer\.right - runtimeScrollbarGutter/, "the native find panel right edge must reserve the nested HTML WebView scrollbar gutter");
assert.match(runtimeRust, /pub fn update_html_find_overlay[\s\S]*?\.eval\([\s\S]*?Ok\(true\)/, "find content updates must use the eval-only host path");
assert.match(runtimeRust, /pub fn set_html_find_overlay_bounds[\s\S]*?\.set_bounds\([\s\S]*?Ok\(true\)/, "an explicit find layout change must use the bounds-only host path");
assert.match(functionSource("syncActiveRuntimeHost"), /await syncActiveHtmlFindLayoutBounds\(tab, runId\)/, "window/runtime resize must keep an open find surface aligned through the bounds-only path");
assert.match(functionSource("syncActiveHtmlFindLayoutBounds"), /set_html_find_overlay_bounds_command[\s\S]*?!isRuntimeHostSyncCurrent\(runId, tab\.id\)/, "find resize must reject stale bounds results through the active runtime run guard");
assert.doesNotMatch(functionSource("syncActiveHtmlFindLayoutBounds"), /attach_html_find_overlay_command|update_html_find_overlay_command|set_html_find_overlay_visibility_command|openActiveHtmlFind/, "find resize must not attach, update, show, hide, focus, or reopen the surface");
const controlsVisibilitySource = runtimeRust.match(/pub fn set_html_runtime_controls_overlay_visibility[\s\S]*?\n}\n\n\/\/\/ Document find/)?.[0] || "";
assert.match(controlsVisibilitySource, /webview\.hide\(\)/, "inactive HTML controls must be hidden");
assert.match(controlsVisibilitySource, /webview\.close\(\)/, "inactive HTML controls must be destroyed instead of retained as a hidden shared child");
assert.match(runtimeRust, /pub fn html_runtime_controls_label\(item_id: i64\)[\s\S]*?format!\("html-controls-\{item_id\}"\)/, "each HTML tab must own a distinct controls child");
const closeRuntimeSource = runtimeRust.match(/pub fn close_html_runtime_window[\s\S]*?\n}\n\npub fn attach_html_runtime_host/)?.[0] || "";
assert.match(closeRuntimeSource, /html_runtime_controls_label\(item_id\)[\s\S]*?webview\.hide\(\)[\s\S]*?webview\.close\(\)/, "closing an HTML tab must destroy its per-item controls child");
assert.doesNotMatch(runtimeRust, /runtime_controls_owner|RUNTIME_CONTROLS_OWNER|html-controls-active/, "the rolled-back controls lifecycle must not retain a window-scoped owner or shared label");
const controlsAttachSource = runtimeRust.match(/pub fn attach_controls_overlay[\s\S]*?\n}\n\npub fn set_html_runtime_controls_overlay_visibility/)?.[0] || "";
assert.doesNotMatch(controlsAttachSource, /raise_webview_view_native/, "per-item controls must rely on create-after-host ordering instead of native sibling raises");
const findVisibilitySource = runtimeRust.match(/pub fn set_html_find_overlay_visibility[\s\S]*?\n}\n\npub fn attach_inspector_more_overlay/)?.[0] || "";
assert.match(findVisibilitySource, /webview\.hide\(\)[\s\S]*?webview\.close\(\)/, "closing find must destroy the child instead of retaining prewarm-era hide-only state");
assert.doesNotMatch(findVisibilitySource, /raise_webview_view_native/, "find must rely on explicit create-after-controls ordering instead of native sibling raises");
assert.doesNotMatch(indexHtml, /attach_html_find_trigger_tooltip_command|set_html_find_trigger_tooltip_visibility_command|htmlTopbarTooltipWarm|html-runtime-topbar-tooltips|data-native-tooltip/, "HTML topbar tooltips must not create or retain native child WebViews");
assert.doesNotMatch(runtimeRust, /TOPBAR_TOOLTIP_OWNER|topbar_tooltip_owner|html_topbar_tooltip_label|raise_webview_view_native|html-find-trigger-tooltip/, "the native topbar tooltip owner, renderer, and raise path must be fully removed");
assert.match(indexHtml, /class="topbar-search-tooltip"/, "the document search entry must retain its DOM tooltip fallback");
assert.match(indexHtml, /class="topbar-button-tooltip"/, "the add-folder and add-file entries must retain their DOM tooltip fallbacks");

// revision 83（P2-R80a）：顶栏正文查找投影的唯一状态源是
// `activeDocumentSearchKind()` —— 正式/临时 Markdown 与正式/临时 HTML 四类
// 活动标签必须一致投影为 document scope。旧实现自写 `isMarkdown ||
// isHtmlRuntime`，漏掉 `html-runtime-external`：用户在临时 HTML 上看到资料库
// 输入框与正文 find surface 同时出现（截图证据）。
assert.match(
  functionSource("viewerToolbarState"),
  /const localFind = activeDocumentSearchKind\(\) !== null;/,
  "顶栏 scope 必须投影 activeDocumentSearchKind()，不得各写一套 fileType 判定"
);
assert.doesNotMatch(
  functionSource("viewerToolbarState"),
  /const localFind = isMarkdown \|\| isHtmlRuntime;/,
  "漏掉外部 runtime 的旧 scope 判定必须消失"
);
assert.match(
  functionSource("viewerToolbarState"),
  /isHtmlFindTab\(tab\) && appState\.htmlFind\.itemId === tab\?\.id/,
  "正文 find 面板的刷新条件必须与 scope 投影同源（临时 HTML 与正式 HTML 一致）"
);
assert.match(
  indexHtml,
  /\.topbar-search-field\[data-search-scope="document"\] \.search-input \{ display: none; \}/,
  "document scope 下原资料库输入框必须不可输入（隐藏）而不是与正文查找并存"
);

// revision 84：`activeDocumentSearchKind()` 必须是活动标签 fileType 的纯函数。
// 用户实测「MD 打开后顶栏仍是资料库搜索，点一下才变正文搜索；HTML 一直正常」：
// Markdown 分支额外要求 `tab.id === appState.activeMarkdownEditorTabId`，而编辑器
// 挂载是异步的，`renderViewer()` 里的顶栏投影发生在挂载完成之前 → 投影停在
// 资料库 scope，直到下一个无关事件（keydown/keyup/收藏/render）才纠正。
// HTML 分支只看 fileType，所以从未复现。挂载状态属于**动作入口**（能否真的打开
// 查找面板），不属于**顶栏投影**。
assert.doesNotMatch(
  functionSource("activeDocumentSearchKind"),
  /activeMarkdownEditorTabId/,
  "顶栏 scope 判定不得并入编辑器挂载状态（revision 84：MD 打开后资料库搜索残留）"
);
assert.match(
  functionSource("activeDocumentSearchKind"),
  /if \(tab\?\.preview\?\.fileType === "markdown"\) return "markdown";/,
  "Markdown 的 scope 必须只由 fileType 决定，与编辑器是否已挂载无关"
);
assert.match(
  functionSource("openActiveDocumentFind"),
  /const editor = currentDocumentFindEditor\(\);\s*if \(!editor\) return false;/,
  "编辑器未挂载时必须拒绝认领本次交互，不得假装打开成功"
);

const searchScopeScenarios = [
  {
    name: "临时 HTML",
    tab: { id: "external:s1", sourceMode: "external", external: { sessionId: "s1", generation: 1 }, preview: { fileType: "html-runtime-external" } },
    expected: "document"
  },
  {
    name: "正式 HTML",
    tab: { id: 41, preview: { fileType: "html-runtime" } },
    expected: "document"
  },
  {
    name: "临时 Markdown",
    tab: { id: "external:s2", sourceMode: "external", external: { sessionId: "s2", generation: 1 }, preview: { fileType: "markdown" } },
    expected: "document"
  },
  {
    name: "正式 Markdown",
    tab: { id: 7, preview: { fileType: "markdown" } },
    expected: "document"
  },
  {
    // revision 84 复现位：打开 Markdown 的瞬间编辑器还没挂载
    // （`activeMarkdownEditorTabId` 仍是上一个标签 / null），顶栏必须已经是
    // document scope，否则就是用户看到的「资料库搜索残留，点一下才变」。
    name: "正式 Markdown（编辑器尚未挂载）",
    tab: { id: 9, preview: { fileType: "markdown" } },
    editorMounted: false,
    expected: "document"
  },
  { name: "首页", tab: null, expected: "library" }
];
for (const scenario of searchScopeScenarios) {
  const attributes = new Map();
  const searchField = {
    setAttribute: (key, value) => attributes.set(key, String(value)),
    removeAttribute: (key) => attributes.delete(key),
    tabIndex: null
  };
  const tooltip = { textContent: "" };
  const searchInput = {
    placeholder: "",
    focused: true,
    setAttribute: (key, value) => attributes.set(`input:${key}`, String(value)),
    blur: () => { searchInput.focused = false; },
    closest: (selector) => (selector === ".topbar-search-field" ? searchField : null),
    parentElement: {
      querySelector: (selector) => (selector === ".topbar-search-tooltip" ? tooltip : null)
    }
  };
  const classList = { remove() {}, toggle() {} };
  const projectionContext = {
    appState: {
      activeMarkdownEditorTabId: scenario.editorMounted === false
        ? null
        : (scenario.tab?.preview?.fileType === "markdown" ? scenario.tab.id : null),
      htmlEditSession: null,
      htmlFind: { itemId: null }
    },
    els: {
      searchInput,
      documentPrimaryButton: { disabled: false, dataset: {}, classList, setAttribute() {} },
      documentPrimaryLabel: { style: {}, textContent: "" },
      documentPrimaryIcon: { innerHTML: "" },
      documentPrimaryTooltip: { textContent: "" },
      documentFavoriteButton: { disabled: false, classList },
      documentMoreButton: { disabled: false },
      toolbarActions: { classList }
    },
    document: { activeElement: searchInput },
    MENU_ICON_SVG: { save: "", htmlEditStart: "", htmlEditDone: "" },
    primaryActionBusyItemId: null,
    getActiveTab: () => scenario.tab,
    updateActiveHtmlFindContent: () => Promise.resolve(true),
    t: (key) => key
  };
  vm.createContext(projectionContext);
  vm.runInContext([
    functionSource("isRuntimeHostTab"),
    functionSource("isHtmlFindTab"),
    functionSource("activeDocumentSearchKind"),
    functionSource("viewerToolbarState")
  ].join("\n"), projectionContext);
  projectionContext.viewerToolbarState();
  assert.equal(
    attributes.get("data-search-scope"),
    scenario.expected,
    `${scenario.name}：顶栏 scope 必须与正文查找投影一致`
  );
  if (scenario.expected === "document") {
    assert.equal(searchInput.placeholder, "markdown.find", `${scenario.name}：placeholder 必须切到正文查找`);
    assert.equal(attributes.get("input:aria-label"), "markdown.find", `${scenario.name}：可访问名称必须切到正文查找`);
    assert.equal(attributes.get("role"), "button", `${scenario.name}：document scope 下顶栏入口必须是按钮语义`);
    assert.equal(searchField.tabIndex, 0, `${scenario.name}：document scope 下顶栏入口必须可键盘激活`);
    assert.equal(tooltip.textContent, "markdown.findBody", `${scenario.name}：tooltip 必须切到正文查找说明`);
    assert.equal(
      searchInput.focused,
      false,
      `${scenario.name}：进入 document scope 必须交还资料库输入框焦点，键入不得落进隐藏输入框`
    );
  } else {
    assert.equal(searchInput.placeholder, "home.searchPlaceholder", `${scenario.name}：首页必须保留资料库搜索`);
    assert.equal(attributes.get("input:aria-label"), "home.searchPlaceholder", `${scenario.name}：首页可访问名称保持资料库搜索`);
    assert.equal(attributes.get("role"), undefined, `${scenario.name}：首页不得带按钮角色`);
    assert.ok(tooltip.textContent.includes("（⌘K）"), `${scenario.name}：首页 tooltip 必须保留全局搜索提示`);
  }
}

const findEntryScenarios = [
  {
    name: "Markdown 编辑器已挂载",
    tab: { id: 7, preview: { fileType: "markdown" } },
    editorMounted: true,
    expectedReturn: true,
    expectedEditorFindCalls: 1,
    expectedHtmlFindCalls: 0
  },
  {
    name: "Markdown 编辑器尚未挂载",
    tab: { id: 7, preview: { fileType: "markdown" } },
    editorMounted: false,
    expectedReturn: false,
    expectedEditorFindCalls: 0,
    expectedHtmlFindCalls: 0
  },
  {
    name: "临时 HTML 宿主",
    tab: { id: "external:s1", preview: { fileType: "html-runtime-external" } },
    editorMounted: false,
    expectedReturn: true,
    expectedEditorFindCalls: 0,
    expectedHtmlFindCalls: 1
  },
  {
    name: "首页无活动标签",
    tab: null,
    editorMounted: false,
    expectedReturn: false,
    expectedEditorFindCalls: 0,
    expectedHtmlFindCalls: 0
  }
];
for (const scenario of findEntryScenarios) {
  let editorFindCalls = 0;
  let htmlFindCalls = 0;
  const markdownEditor = {
    openFind: () => { editorFindCalls += 1; }
  };
  const entryContext = {
    appState: {
      activeMarkdownEditorTabId: scenario.editorMounted ? scenario.tab?.id ?? null : null,
      activeMarkdownEditor: scenario.editorMounted ? markdownEditor : null
    },
    getActiveTab: () => scenario.tab,
    openActiveHtmlFind: () => { htmlFindCalls += 1; return Promise.resolve(true); }
  };
  vm.createContext(entryContext);
  vm.runInContext([
    functionSource("currentDocumentFindEditor"),
    functionSource("activeDocumentSearchKind"),
    functionSource("openActiveDocumentFind")
  ].join("\n"), entryContext);
  const claimed = entryContext.openActiveDocumentFind();
  assert.equal(claimed, scenario.expectedReturn, `${scenario.name}：查找入口认领结果必须与可执行性一致`);
  assert.equal(editorFindCalls, scenario.expectedEditorFindCalls, `${scenario.name}：编辑器查找调用次数不符`);
  assert.equal(htmlFindCalls, scenario.expectedHtmlFindCalls, `${scenario.name}：HTML find surface 调用次数不符`);
}

const hostVisibilitySource = runtimeRust.match(/pub fn set_html_runtime_host_visibility[\s\S]*?\n}\n\n\/\/\/ The presentation rail/)?.[0] || "";
assert.match(hostVisibilitySource, /webview\.hide\(\)/, "inactive HTML hosts must be hidden");
assert.match(hostVisibilitySource, /set_bounds[\s\S]*?width:\s*1\.0[\s\S]*?height:\s*1\.0[\s\S]*?webview\.hide\(\)[\s\S]*?webview\.close\(\)/, "inactive HTML hosts must be collapsed, hidden, and destroyed instead of accumulating across tabs");
assert.doesNotMatch(indexHtml, /_runtimeSurfaceHideTimers|\[0,\s*80,\s*240,\s*520\]|scheduleRuntimeSurfaceHide/, "the desired-state coordinator must not retain the old delayed hide storm");
assert.match(functionSource("hideRuntimeSessionSurfaces"), /runtimeHiddenSurfaceIds\.has\(itemId\)[\s\S]*?!options\.recoverLateAttach[\s\S]*?return/, "an already hidden runtime must not receive duplicate native mutations");
assert.match(functionSource("hideRuntimeSessionSurfaces"), /refreshHtmlRuntimeViewState\(itemId\)[\s\S]*?setRuntimeHostVisibility\(itemId, false\)/, "the active HTML host must snapshot serializable view state before close-on-switch");
assert.match(functionSource("suspendRuntimeSurfaces"), /refreshHtmlRuntimeViewState\(activeRuntimeHostId\)[\s\S]*?activeRuntimeHostId = null/, "window suspension must snapshot the active HTML host before clearing its native owner");
assert.match(functionSource("syncActiveRuntimeHost"), /viewStateSurfaceToken:\s*htmlRuntimeViewStateSurfaceToken\(tab\.id\)[\s\S]*?viewState:\s*tab\.viewState \|\| null/, "a recreated HTML host must receive a new lifetime token and its tab-scoped view state in the attach request");
assert.match(indexHtml, /__NUTBOOK_HANDLE_HTML_RUNTIME_VIEW_STATE__[\s\S]*?surfaceToken !== htmlRuntimeViewStateSurfaceToken\(itemId\)[\s\S]*?return/, "late state from a destroyed host must be rejected by its lifetime token");
assert.match(runtimeRust, /html_runtime_view_state_script[\s\S]*?html_runtime_view_state_command[\s\S]*?presentationPageId[\s\S]*?bridge\.goTo\(targetPageId\)[\s\S]*?window\.scrollTo/, "the child runtime shim must capture and restore scroll, hash, and protocol presentation state");
assert.doesNotMatch(runtimeRust.match(/fn html_runtime_view_state_script[\s\S]*?pub fn html_runtime_compatibility_script/)?.[0] || "", /localStorage|sessionStorage/, "runtime view state must stay in the owning Nutbook tab session instead of modifying page storage");

// The remove-confirm coordinator must reject a late child-webview attach after
// the active tab changes, clear its blocking state, and close the stale overlay.
let activeTab = { id: 41, preview: { fileType: "html-runtime" } };
let resolveAttach;
const invoked = [];
const coordinator = {
  appState: {
    htmlRemoveConfirmItemId: null,
    htmlRemoveConfirmRequest: null,
    htmlRemoveConfirmRequestSequence: 0,
    runtimeSurfacesSuspended: false,
    items: [{ id: 41, fileName: "race.html" }]
  },
  getActiveTab: () => activeTab,
  getOpenTab: () => null,
  htmlEditLeaveConfirmBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
  waitForHtmlRuntimeOverlayPriority: async () => true,
  restoreHtmlRuntimeAfterBlockingOverlay: async () => true,
  invoke: async (command, args) => {
    invoked.push({ command, args });
    if (command === "attach_html_edit_leave_confirm_overlay_command") {
      return new Promise((resolve) => { resolveAttach = resolve; });
    }
    return true;
  }
};
vm.createContext(coordinator);
vm.runInContext([
  functionSource("isHtmlRemoveConfirmRequestCurrent"),
  functionSource("cancelHtmlRemoveConfirmOverlay"),
  functionSource("showHtmlRemoveConfirmOverlay")
].join("\n"), coordinator);

const pendingAttach = coordinator.showHtmlRemoveConfirmOverlay(41);
while (!resolveAttach) await new Promise((resolve) => setTimeout(resolve, 0));
activeTab = { id: 42, preview: { fileType: "markdown" } };
const cancelling = coordinator.cancelHtmlRemoveConfirmOverlay(41, { restore: false });
resolveAttach(true);
await cancelling;
assert.equal(await pendingAttach, false, "late remove-confirm attach must be rejected");
assert.equal(coordinator.appState.htmlRemoveConfirmItemId, null, "late attach must not leave a blocking item id");
assert.equal(coordinator.appState.htmlRemoveConfirmRequest, null, "late attach must release its request token");
assert.ok(
  invoked.filter((entry) => entry.command === "close_html_edit_leave_confirm_overlay_command").length >= 1,
  "late attach must close the stale child-webview overlay"
);

const browser = await chromium.launch({ headless: true });
try {
  const runtimePage = await browser.newPage();
  await runtimePage.addInitScript(() => {
    window.__NUTBOOK_RUNTIME_CONTROLS__ = {
      itemId: 41,
      fileName: "menu-actions.html",
      isFavorite: false,
      isFullscreen: false,
      isEditing: false,
      isPrimaryBusy: false,
      customTag: null,
      availableTags: [],
      skillTag: null,
      typeTag: "HTML",
      customTags: [],
      sourceBadges: []
    };
  });
  await runtimePage.goto(pathToFileURL(`${process.cwd()}/dist/runtime-overlay.html`).href);
  await runtimePage.waitForFunction(() => document.getElementById("moreButton")?.offsetParent !== null);

  const actionGeometry = await runtimePage.evaluate(() => {
    const geometry = (id) => {
      const button = document.getElementById(id);
      const icon = button?.querySelector(".icon-svg");
      const buttonRect = button?.getBoundingClientRect();
      const iconRect = icon?.getBoundingClientRect();
      const style = button ? getComputedStyle(button) : null;
      return {
        button: [buttonRect?.width, buttonRect?.height],
        icon: [iconRect?.width, iconRect?.height],
        padding: style?.padding
      };
    };
    return {
      favorite: geometry("favoriteButton"),
      more: geometry("moreButton")
    };
  });
  assert.deepEqual(actionGeometry.favorite, { button: [28, 28], icon: [18, 18], padding: "0px" });
  assert.deepEqual(actionGeometry.more, { button: [28, 28], icon: [18, 18], padding: "0px" });

  await runtimePage.locator("#moreButton").focus();
  await runtimePage.keyboard.press("ArrowDown");
  assert.equal(await runtimePage.locator("#moreButton").getAttribute("aria-expanded"), "true");
  // 焦点通过 requestAnimationFrame 从触发按钮移到首个 menuitem；CI 的帧调度
  // 可以晚于 keyboard.press 返回，必须等待真实焦点而非读取前一帧的按钮状态。
  await runtimePage.waitForFunction(() => document.activeElement?.id === "presentationOption");
  assert.equal(await runtimePage.evaluate(() => document.activeElement?.id), "presentationOption");
  await runtimePage.keyboard.press("ArrowDown");
  assert.equal(await runtimePage.evaluate(() => document.activeElement?.id), "removeOption");
  await runtimePage.keyboard.press("Escape");
  assert.equal(await runtimePage.locator("#moreButton").getAttribute("aria-expanded"), "false");
  assert.equal(await runtimePage.evaluate(() => document.activeElement?.id), "moreButton");

  await runtimePage.evaluate(() => {
    window.__NUTBOOK_UPDATE_OVERLAY_STATE__?.({
      ...window.__NUTBOOK_RUNTIME_CONTROLS__,
      isPrimaryBusy: true
    });
  });
  assert.equal(await runtimePage.locator("#editButton").isDisabled(), true);
  assert.equal(await runtimePage.locator("#editButton").getAttribute("aria-busy"), "true");

  const findPage = await browser.newPage({ viewport: { width: 560, height: 112 } });
  await findPage.addInitScript(() => {
    window.__NUTBOOK_HTML_FIND_INITIAL__ = {
      itemId: 41,
      canReplace: false,
      replaceExpanded: false,
      query: "",
      count: "0/0",
      caseSensitive: false,
      labels: { closeFind: "关闭查找" },
      history: [],
      focusQuery: false
    };
  });
  await findPage.goto(pathToFileURL(`${process.cwd()}/dist/html-find-overlay.html`).href);
  const closeFindButton = findPage.locator("[data-close]");
  const closeFindTip = findPage.locator("[data-close-find-tip]");
  await closeFindButton.hover();
  await findPage.waitForFunction(() => getComputedStyle(document.querySelector("[data-close-find-tip]")).opacity === "1");
  await closeFindButton.click();
  assert.equal(await findPage.locator(".panel").getAttribute("data-closing"), "true");
  assert.equal(await findPage.locator(".panel").getAttribute("data-suppress-hover"), "true");
  assert.equal(await closeFindTip.evaluate((tip) => getComputedStyle(tip).opacity), "0");
  await findPage.evaluate(() => window.__NUTBOOK_HTML_FIND__?.update({ focusQuery: true }));
  assert.equal(await findPage.locator(".panel").getAttribute("data-closing"), null);
  assert.equal(await findPage.locator(".panel").getAttribute("data-suppress-hover"), "true");
  assert.equal(await closeFindButton.evaluate((button) => getComputedStyle(button).backgroundColor), "rgba(0, 0, 0, 0)");
  assert.equal(await closeFindTip.evaluate((tip) => getComputedStyle(tip).opacity), "0");
  const findPanelBox = await findPage.locator(".panel").boundingBox();
  assert.ok(findPanelBox, "the find panel must have measurable pointer geometry");
  await findPage.mouse.move(findPanelBox.x + 18, findPanelBox.y + 18);
  await findPage.mouse.move(findPanelBox.x + 28, findPanelBox.y + 18);
  await findPage.waitForFunction(() => !document.querySelector(".panel")?.hasAttribute("data-suppress-hover"));
  await closeFindButton.hover();
  await findPage.waitForFunction(() => getComputedStyle(document.querySelector("[data-close-find-tip]")).opacity === "1");

  const confirmPage = await browser.newPage();
  await confirmPage.addInitScript(() => {
    window.__NUTBOOK_HTML_EDIT_LEAVE_CONFIRM__ = {
      itemId: 41,
      mode: "remove",
      fileName: "menu-actions.html",
      requestId: "remove-41-test"
    };
  });
  await confirmPage.goto(pathToFileURL(`${process.cwd()}/dist/html-edit-leave-confirm.html`).href);
  await confirmPage.waitForFunction(() => document.activeElement?.id === "keepButton");
  assert.equal(
    await confirmPage.locator("#keepButton").evaluate((button) => getComputedStyle(button).outlineStyle),
    "none",
    "the initially focused cancel button must not render a black focus box"
  );
  await confirmPage.evaluate(() => {
    window.__observedTitles = [];
    new MutationObserver(() => window.__observedTitles.push(document.title))
      .observe(document.querySelector("title"), { childList: true });
  });
  await confirmPage.keyboard.press("Shift+Tab");
  assert.equal(await confirmPage.evaluate(() => document.activeElement?.id), "saveButton");
  await confirmPage.keyboard.press("Tab");
  assert.equal(await confirmPage.evaluate(() => document.activeElement?.id), "keepButton");
  assert.notEqual(
    await confirmPage.locator("#keepButton").evaluate((button) => getComputedStyle(button).outlineStyle),
    "none",
    "keyboard navigation must restore the visible focus ring"
  );
  await confirmPage.keyboard.press("Escape");
  await confirmPage.waitForFunction(() => window.__observedTitles.some((title) => title.startsWith("__NUTBOOK_HTML_EDIT_LEAVE__:")));
  const emittedTitle = await confirmPage.evaluate(() => window.__observedTitles.find((title) => title.startsWith("__NUTBOOK_HTML_EDIT_LEAVE__:")));
  const payload = JSON.parse(emittedTitle.slice("__NUTBOOK_HTML_EDIT_LEAVE__:".length));
  assert.deepEqual(payload, {
    action: "remove-choice",
    choice: "cancel",
    itemId: 41,
    requestId: "remove-41-test"
  });
  assert.equal(await confirmPage.locator("#keepButton").isDisabled(), true, "confirm action must settle only once");
} finally {
  await browser.close();
}

console.log("toolbar menu actions passed.");
