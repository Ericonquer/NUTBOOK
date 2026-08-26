import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const indexHtml = readFileSync("dist/index.html", "utf8");
const runtimeOverlayHtml = readFileSync("dist/runtime-overlay.html", "utf8");
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

// Leaving an HTML runtime must synchronously converge the native host and
// controls before the destination DOM is rendered. Delayed retries remain a
// late-attach guard, not the primary cleanup path.
const switchEvents = [];
const switchCoordinator = {
  appState: {
    runtimeControlsOverlayExpanded: true,
    runtimeControlsOverlayMode: "more",
    activeRuntimeHostId: 41,
    runtimeHostLastBoundsKey: "41:old"
  },
  getOpenTab: (itemId) => itemId === 41 ? { id: 41, preview: { fileType: "html-runtime" } } : null,
  cancelHtmlRemoveConfirmOverlay: async () => { switchEvents.push("cancel-confirm"); },
  cleanupRuntimeHostSync: () => { switchEvents.push("invalidate-sync"); },
  cancelPendingRuntimeSurfaceHide: () => { switchEvents.push("cancel-pending-hide"); },
  nextRuntimeSurfaceToken: () => { switchEvents.push("advance-token"); return 9; },
  syncHtmlEditReadonlyPatchSurfaceToken: async () => { switchEvents.push("sync-token"); },
  hideRuntimeSessionSurfaces: async (_itemId, options) => {
    assert.equal(options.force, true);
    assert.equal(options.token, 9);
    switchEvents.push("force-hide");
  },
  scheduleRuntimeSurfaceHide: async () => { switchEvents.push("schedule-recheck"); }
};
vm.createContext(switchCoordinator);
vm.runInContext(functionSource("scheduleRuntimeCleanupAfterTabSwitch"), switchCoordinator);
await switchCoordinator.scheduleRuntimeCleanupAfterTabSwitch(41, null);
assert.deepEqual(switchEvents.slice(0, 6), [
  "cancel-confirm",
  "invalidate-sync",
  "cancel-pending-hide",
  "advance-token",
  "sync-token",
  "force-hide"
]);
assert.equal(switchCoordinator.appState.activeRuntimeHostId, null);
assert.equal(switchCoordinator.appState.runtimeHostLastBoundsKey, null);
assert.match(
  indexHtml,
  /async function showAllFilesHome[\s\S]*?appState\.activeTabId = null;[\s\S]*?await scheduleRuntimeCleanupAfterTabSwitch\(previousTabId, null\);[\s\S]*?await loadItems\(\);[\s\S]*?renderTabs\(\);[\s\S]*?renderViewer\(\);/,
  "side-nav All Files must await native runtime cleanup before loading and rendering home"
);

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
