import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const indexHtml = readFileSync("dist/index.html", "utf8");
function functionSource(name) {
  const start = indexHtml.indexOf(`      ${name === "openNativePresentationPreparation" ? "async " : ""}function ${name}(`);
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
  let nativePresentationDialog = null, nativePresentationSessionId = null;
  const appState = { language: "zh-CN", isTauri: true, htmlEditSession: null, nativePresentationItemId: null, runtimeFullscreenItemId: null };
  const getActiveTab = () => ({ id: 41, preview: { fileType: "html-runtime" } });
  const nativePresentationText = (zh, en) => appState.language === "en-US" ? en : zh;
  const escapeHtml = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
  const escapeAttribute = escapeHtml;
  const setStatus = () => {};
  const hideRuntimeSessionSurfaces = async () => {};
  const probeNativePresentation = async () => ({ pages: [{ id: "one", title: "开场" }, { id: "two", title: "后续" }], activePageId: window.testActivePage, notes: {} });
  const invoke = async (command, args) => {
    if (command === "native_presentation_monitors") return window.testMonitors;
    if (command === "get_item_content_revision") return { revision: "sample-hash" };
    if (command === "start_native_presentation") { window.startPayload = args.payload; return { sessionId: "test-session" }; }
    return null;
  };
  ${functionSource("removeNativePresentationDialog")}
  const restoreAfterNativePresentation = () => { removeNativePresentationDialog(); appState.nativePresentationItemId = null; };
  ${functionSource("nativePresentationModalShell")}
  ${functionSource("openNativePresentationPreparation")}
  window.openTestPresentationDialog = openNativePresentationPreparation;
`;

const browser = await chromium.launch({ headless: true });
try {
  for (const scenario of [
    { active: "one", monitors: [{ id: "primary", name: "内建显示器", width: 1440, height: 900 }], expectedAction: "开始演示" },
    { active: "two", monitors: [{ id: "primary", name: "内建显示器", width: 1440, height: 900 }, { id: "external", name: "外接显示器", width: 1920, height: 1080 }], expectedAction: "从当前页开始" }
  ]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.evaluate(({ active, monitors, source }) => {
      window.testActivePage = active;
      window.testMonitors = monitors;
      (0, eval)(source);
      return window.openTestPresentationDialog();
    }, { active: scenario.active, monitors: scenario.monitors, source: harness });
    const panel = page.locator(".native-presentation-panel");
    assert.equal(await panel.locator("h2").textContent(), "演示模式");
    assert.equal(await panel.locator(".native-page-count").textContent(), "2 页");
    assert.equal(await panel.locator(".native-notes-hint").count(), 1);
    assert.equal(await panel.locator("button.primary").count(), 1, "only the main start action should be primary");
    assert.equal(await panel.locator('button[data-native-action="start-current"]').textContent(), scenario.expectedAction);
    assert.ok((await panel.boundingBox()).width <= 560, "the setup dialog should stay compact");
    if (scenario.monitors.length === 1) {
      assert.equal(await panel.locator("select").count(), 0, "a single display needs no dropdown");
      assert.equal(await panel.locator('button[data-native-action="start-first"]').count(), 0, "the first slide needs one start action");
      await panel.locator('button[data-native-action="start-current"]').click();
      assert.deepEqual(await page.evaluate(() => [window.startPayload.monitorId, window.startPayload.startPageId]), ["primary", "one"]);
    } else {
      await panel.locator("select").selectOption("external");
      assert.equal(await panel.locator('button[data-native-action="start-first"]').count(), 1);
      await panel.locator('button[data-native-action="start-first"]').click();
      assert.deepEqual(await page.evaluate(() => [window.startPayload.monitorId, window.startPayload.startPageId]), ["external", "one"]);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
console.log("Native presentation setup dialog checks passed");
