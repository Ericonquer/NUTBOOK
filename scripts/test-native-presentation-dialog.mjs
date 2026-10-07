import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const indexHtml = readFileSync("dist/index.html", "utf8");
function functionSource(name) {
  const start = indexHtml.indexOf(`      ${["openNativePresentationPreparation", "hideRuntimeHostForNativePresentation"].includes(name) ? "async " : ""}function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const bodyStart = indexHtml.indexOf("{", indexHtml.indexOf(") {", start));
  let depth = 0, quote = "", escaped = false;
  for (let i = bodyStart; i < indexHtml.length; i += 1) {
    const char = indexHtml[i];
    if (escaped) { escaped = false; continue; }
    if (quote) { if (char === "\\") escaped = true; else if (char === quote) quote = ""; continue; }
    if (char === '"' || char === "'" || char === "`") { quote = char; continue; }
    if (char === "{") depth += 1;
    if (char === "}" && --depth === 0) return indexHtml.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

const harness = `
  document.body.insertAdjacentHTML("afterbegin", '<span id="nativeAudienceBannerText"></span>');
  let nativePresentationDialog = null, nativePresentationSessionId = null, nativePresentationTipTimer = null, nativePresentationPreparingItemId = null;
  const appState = { language: "zh-CN", isTauri: true, htmlEditSession: null, nativePresentationItemId: null, runtimeFullscreenItemId: null };
  const els = { appShell: document.createElement("div") };
  const getActiveTab = () => ({ id: 41, preview: { fileType: "html-runtime" } });
  const nativePresentationText = (zh, en) => appState.language === "en-US" ? en : zh;
  const escapeHtml = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
  const escapeAttribute = escapeHtml;
  const setStatus = () => {};
  const scheduleRuntimeHostSync = () => {};
  const cleanupRuntimeHostSync = () => {};
  const hideRuntimeSessionSurfaces = async () => { window.hideCalls = (window.hideCalls || 0) + 1; };
  const probeNativePresentation = async () => {
    window.probeCalls = (window.probeCalls || 0) + 1;
    if (window.testProbeDeferred) await new Promise(resolve => { window.releaseProbe = resolve; });
    return window.testProbe === null ? null : ({ pages: [{ id: "one", title: "开场" }, { id: "two", title: "后续" }], activePageId: window.testActivePage, notes: {} });
  };
  const invoke = async (command, args) => {
    if (command === "native_presentation_monitors") return window.testMonitors;
    if (command === "native_presentation_legacy_info") return window.testLegacy;
    if (command === "get_item_content_revision") return { revision: "sample-hash" };
    if (command === "start_native_presentation") { window.startPayload = args.payload; return { sessionId: "test-session" }; }
    return null;
  };
  ${functionSource("removeNativePresentationDialog")}
  const restoreAfterNativePresentation = () => { window.restoreCalls = (window.restoreCalls || 0) + 1; removeNativePresentationDialog(); appState.nativePresentationItemId = null; };
  ${functionSource("hideRuntimeHostForNativePresentation")}
  ${functionSource("nativePresentationModalShell")}
  ${functionSource("openNativePresentationPreparation")}
  window.openTestPresentationDialog = openNativePresentationPreparation;
  window.preparingPresentationItemId = () => nativePresentationPreparingItemId;
  window.audienceMode = () => els.appShell.classList.contains("native-audience-mode");
`;

const browser = await chromium.launch({ headless: true });
try {
  for (const scenario of [
    { active: "one", monitors: [{ id: "primary", name: "Monitor #41059", width: 2940, height: 1912, primary: true }], expectedAction: "开始演示" },
    { active: "two", monitors: [{ id: "primary", name: "内建显示器", width: 1440, height: 900 }, { id: "external", name: "外接显示器", width: 1920, height: 1080 }], expectedAction: "从当前页开始" }
  ]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.clock.install();
    await page.addStyleTag({ content: ':root { --surface:#f9f9fb; --surface-variant:#f3f3f5; --surface-muted:#eeeef0; --paper:#fff; --ink:#1a1c1d; --ink-soft:#5e5e63; --line:#e2e2e4; --line-strong:#cfcfd3; --accent:#000; --shadow:0 12px 28px rgba(26,28,29,.06); --font-ui:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC",system-ui,sans-serif; }' });
    await page.evaluate(({ active, monitors, source }) => {
      window.testActivePage = active;
      window.testMonitors = monitors;
      Math.random = () => 0;
      (0, eval)(source);
      return window.openTestPresentationDialog();
    }, { active: scenario.active, monitors: scenario.monitors, source: harness });
    const panel = page.locator(".native-presentation-panel");
    assert.equal(await panel.locator("h2").textContent(), "演示模式");
    assert.equal(await panel.locator(".native-page-count").textContent(), "2 页");
    assert.equal(await panel.locator('button[data-native-action="close"]').getAttribute("aria-label"), "关闭演示模式");
    assert.equal(await panel.locator(".native-tip").count(), 1);
    assert.equal(await panel.locator(".native-guidance").count(), 0, "display guidance rotates with the other tips");
    assert.match(await panel.locator("#nativePresentationTip").textContent(), /NUTBOOK 窗口/);
    await page.clock.runFor(6000);
    assert.match(await panel.locator("#nativePresentationTip").textContent(), /备注可在 HTML/);
    await page.clock.runFor(6000);
    assert.match(await panel.locator("#nativePresentationTip").textContent(), /共享 NUTBOOK 窗口|NUTBOOK 窗口将在/, "display guidance has higher frequency");
    assert.equal(await panel.locator("button.primary").count(), 1, "only the main start action should be primary");
    assert.equal(await panel.locator('button[data-native-action="start-current"]').textContent(), scenario.expectedAction);
    assert.ok((await panel.boundingBox()).width <= 560, "the setup dialog should stay compact");
    assert.equal(await panel.evaluate(node => getComputedStyle(node).backgroundColor), "rgb(243, 243, 245)", "use the shared paper surface");
    if (process.env.NUTBOOK_AUDIT_SHOTS) await page.screenshot({ path: `${process.env.NUTBOOK_AUDIT_SHOTS}/presentation-dialog-${scenario.monitors.length}.png` });
    assert.equal(await panel.locator("select").count(), 0, "native floating select menu should not be used");
    const trigger = panel.locator(".native-monitor-trigger");
    if (scenario.monitors.length === 1) assert.equal(await trigger.locator("#nativePresentationMonitorLabel").textContent(), "主屏幕 · 2940×1912");
    const menu = panel.locator(".native-monitor-menu");
    assert.equal(await trigger.getAttribute("aria-expanded"), "false");
    assert.ok((await trigger.locator("svg").boundingBox()).width >= 20, "display choice needs a legible chevron");
    await trigger.click();
    assert.equal(await trigger.getAttribute("aria-expanded"), "true");
    assert.equal(await menu.locator('[role="option"]').count(), scenario.monitors.length);
    const triggerBox = await trigger.boundingBox();
    const menuBox = await menu.boundingBox();
    assert.ok(menuBox.y >= triggerBox.y + triggerBox.height, "display choices should open below the trigger");
    assert.ok(Math.abs(menuBox.x - triggerBox.x) <= 1, "display choices should align with the trigger");
    if (scenario.monitors.length === 1) {
      await page.keyboard.press("Escape");
      assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      assert.equal(await panel.locator('button[data-native-action="start-first"]').count(), 0, "the first slide needs one start action");
      await panel.locator('button[data-native-action="start-current"]').click();
      assert.deepEqual(await page.evaluate(() => [window.startPayload.monitorId, window.startPayload.startPageId]), ["primary", "one"]);
    } else {
      await menu.locator('[data-monitor-id="external"]').click();
      assert.equal(await trigger.getAttribute("aria-expanded"), "false");
      assert.match(await trigger.textContent(), /外接显示器/);
      assert.equal(await panel.locator('button[data-native-action="start-first"]').count(), 1);
      await panel.locator('button[data-native-action="start-first"]').click();
      assert.deepEqual(await page.evaluate(() => [window.startPayload.monitorId, window.startPayload.startPageId]), ["external", "one"]);
    }
    assert.equal(await panel.count(), 0, "the setup dialog must leave the shared NUTBOOK audience window unobstructed");
    assert.equal(await page.evaluate(() => window.audienceMode()), true);
    if (scenario.monitors.length === 1) {
      assert.match(await page.locator("#nativeAudienceBannerText").textContent(), /观众窗口/);
    }
    await page.close();
  }
  for (const legacy of [null, { eligible: true, pageCount: 24 }]) {
    const page = await browser.newPage();
    await page.evaluate(({ source, legacy }) => {
      window.testProbe = null;
      window.testLegacy = legacy;
      (0, eval)(source);
      return window.openTestPresentationDialog();
    }, { source: harness, legacy });
    const panel = page.locator(".native-presentation-panel");
    assert.equal(await page.evaluate(() => window.hideCalls), 1, "the HTML child must be hidden before showing a host dialog");
    assert.equal(await panel.count(), 1);
    if (legacy) {
      assert.match(await panel.locator("h2").textContent(), /升级旧演示副本/);
      await panel.locator('[data-native-action="cancel"]').click();
    } else {
      assert.equal(await panel.locator("h2").textContent(), "无法启动演示");
      assert.match(await panel.textContent(), /全屏查看/);
      await panel.locator('[data-native-action="close"]').click();
    }
    assert.equal(await page.evaluate(() => window.restoreCalls), 1, "closing the dialog must restore the HTML document");
    assert.equal(await panel.count(), 0);
    await page.close();
  }
  {
    const page = await browser.newPage();
    const concurrent = await page.evaluate(source => {
      window.testProbe = null;
      window.testLegacy = null;
      window.testProbeDeferred = true;
      (0, eval)(source);
      window.firstOpen = window.openTestPresentationDialog();
      window.secondOpen = window.openTestPresentationDialog();
      return { probeCalls: window.probeCalls, preparingItemId: window.preparingPresentationItemId() };
    }, harness);
    assert.deepEqual(concurrent, { probeCalls: 1, preparingItemId: 41 }, "a second click during probing must not start another presentation setup");
    await page.evaluate(async () => { window.releaseProbe(); await Promise.all([window.firstOpen, window.secondOpen]); });
    assert.equal(await page.evaluate(() => window.hideCalls), 1, "the unsupported document must open only one dialog");
    assert.equal(await page.locator(".native-presentation-panel").count(), 1);
    await page.locator('[data-native-action="close"]').click();
    assert.equal(await page.evaluate(() => window.restoreCalls), 1);
    await page.close();
  }
  {
    const page = await browser.newPage({ viewport: { width: 1080, height: 680 } });
    const css = indexHtml.slice(indexHtml.indexOf("<style>") + 7, indexHtml.indexOf("</style>"));
    await page.setContent('<div class="app-shell native-audience-rehearsal"><div class="native-audience-banner"><span>观众窗口 · 在线会议请共享此 NUTBOOK 窗口</span></div></div>');
    await page.addStyleTag({ content: css });
    const banner = page.locator(".native-audience-banner");
    const text = banner.locator("span");
    const textBox = await text.boundingBox();
    assert.ok(Math.abs(textBox.x + textBox.width / 2 - 540) < 2, "audience label should be centered in the window, clear of macOS traffic lights");
    assert.ok(textBox.x >= 140, "audience label must not cover title bar controls");
    assert.equal(await banner.locator("button").count(), 0, "the audience banner should only identify the shared window");
    await page.locator(".app-shell").evaluate(node => node.classList.add("native-audience-screenfill"));
    assert.equal(await banner.isVisible(), false, "native fullscreen must not reserve a visible audience control strip");
    await page.locator(".app-shell").evaluate(node => node.classList.remove("native-audience-screenfill"));
    assert.equal(await banner.isVisible(), true, "leaving fullscreen should restore the audience label");
    await page.close();
  }
} finally {
  await browser.close();
}
console.log("Native presentation setup dialog checks passed");
