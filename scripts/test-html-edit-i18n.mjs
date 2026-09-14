import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import vm from "node:vm";
import { chromium } from "playwright";

const runtimePath = "dist/assets/html-edit-runtime.js";
const indexPath = "dist/index.html";
const i18nPath = "dist/i18n.js";
const runtime = fs.readFileSync(runtimePath, "utf8");
const indexHtml = fs.readFileSync(indexPath, "utf8");
const i18nSource = fs.readFileSync(i18nPath, "utf8");

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(i18nSource, context, { filename: i18nPath });
const i18n = context.window.NutbookI18n;
assert.ok(i18n, "the shared i18n dictionary must load");
assert.equal(i18n.lookup("htmlEdit.confirmImageFrame", "zh-CN"), "确认框选");
assert.equal(i18n.lookup("htmlEdit.cancelImageFrame", "zh-CN"), "取消框选");
assert.equal(i18n.lookup("htmlEdit.confirmImageFrame", "en-US"), "Confirm frame");
assert.equal(i18n.lookup("htmlEdit.cancelImageFrame", "en-US"), "Cancel frame");

assert.match(runtime, /imageFrameLabels/, "the child runtime must retain explicit image-frame labels");
assert.match(runtime, /function updateLocale\(/, "the child runtime must expose a locale update hook");
assert.match(runtime, /add\(imageFrameLabel\("confirm"\)/, "draft confirm text must come from the runtime label helper");
assert.match(runtime, /add\(imageFrameLabel\("cancel"\)/, "draft cancel text must come from the runtime label helper");
assert.doesNotMatch(runtime, /add\("确认框选"/u, "draft confirm text must not be hard-coded at the render call site");
assert.doesNotMatch(runtime, /add\("取消框选"/u, "draft cancel text must not be hard-coded at the render call site");

assert.match(indexHtml, /function htmlEditRuntimeImageFrameLabels\(\)[\s\S]*?htmlEdit\.confirmImageFrame[\s\S]*?htmlEdit\.cancelImageFrame/u, "the host must source both labels from the shared dictionary");
assert.match(indexHtml, /imageFrameLabels:\s*htmlEditRuntimeImageFrameLabels\(\)/u, "initial runtime entry must receive translated frame labels");
assert.match(indexHtml, /function updateHtmlEditRuntimeLocale\([\s\S]*?updateLocale\?\./u, "the host must update an existing child runtime when the language changes");
assert.match(indexHtml, /activeHtmlEditSessionBeforeLanguageChange[\s\S]*?updateHtmlEditRuntimeLocale\(/u, "interface language changes must propagate to an active HTML edit session");

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto(pathToFileURL(path.resolve("src-tauri/tests/fixtures/html-edit/editable-free-image.html")).href);
  await page.evaluate(() => {
    // Open only this test's runtime shadows so Playwright can inspect the
    // controls; production keeps the same closed-shadow isolation.
    const attachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (options) {
      return attachShadow.call(this, { ...options, mode: "open" });
    };
    document.querySelector('[data-nutbook-inserted-image-layer="1"]')?.remove();
    window.__htmlEditI18nMessages = [];
    window.__TAURI_INTERNALS__ = {
      invoke: async (_command, value) => {
        window.__htmlEditI18nMessages.push(value?.payload);
        return true;
      }
    };
  });
  await page.addScriptTag({ path: path.resolve("dist/assets/html-edit-runtime.js") });
  await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.enter({
    runtimeSessionId: "html-edit-i18n",
    inlineToolbar: false,
    locale: "en-US",
    imageFrameLabels: { confirm: "Confirm frame", cancel: "Cancel frame" },
    patch: { changes: {} },
    runtimeAssetUrls: {}
  }));
  assert.equal(await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.beginInsertedImageDraft()), true, "the runtime must enter image-frame draw mode");
  await page.mouse.move(250, 380);
  await page.mouse.down();
  await page.mouse.move(500, 560);
  await page.mouse.up();

  const frame = page.locator("#nutbook-html-edit-inserted-image-layer .frame");
  await frame.waitFor();
  const frameId = await frame.getAttribute("data-nutbook-inserted-image-id");
  const buttons = frame.locator(".controls button");
  assert.equal(await buttons.count(), 2, "an unimported frame must expose exactly confirm and cancel controls");
  assert.deepEqual(await buttons.allTextContents(), ["Confirm frame", "Cancel frame"], "an en-US frame must render English labels");
  assert.ok(await buttons.nth(0).isVisible(), "the English confirm control must be visible");
  assert.ok(await buttons.nth(1).isVisible(), "the English cancel control must be visible");

  assert.equal(await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.updateLocale({
    runtimeSessionId: "html-edit-i18n",
    locale: "zh-CN",
    imageFrameLabels: { confirm: "确认框选", cancel: "取消框选" }
  })), true, "the runtime locale update must accept the active session");
  assert.equal(await frame.getAttribute("data-nutbook-inserted-image-id"), frameId, "locale updates must keep the existing frame node");
  assert.deepEqual(await buttons.allTextContents(), ["确认框选", "取消框选"], "the same existing frame must update its labels after a locale change");
} finally {
  await browser.close();
}

console.log("HTML edit image-frame i18n contract passed");
