import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const indexHtml = readFileSync("dist/index.html", "utf8");
const start = indexHtml.indexOf("function nativePresentationProbeScript(");
const end = indexHtml.indexOf("async function probeNativePresentation(", start);
assert.ok(start >= 0 && end > start, "use the actual NUTBOOK probe script builder");
const buildProbeScript = new Function(`${indexHtml.slice(start, end)}; return nativePresentationProbeScript;`)();
const sample = path.resolve("docs/presentations/native-presentation-sample/long-pages.html");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
  await page.goto(pathToFileURL(sample).href);
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.evaluate(() => window.__NUTBOOK_PRESENTATION__.activePageId), "page-02", "the long sample must turn pages in ordinary viewing");
  await page.keyboard.press("ArrowLeft");
  assert.equal(await page.evaluate(() => window.__NUTBOOK_PRESENTATION__.activePageId), "page-01");
  await page.evaluate(() => window.__NUTBOOK_PRESENTATION__.setManagedMode(true));
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.evaluate(() => window.__NUTBOOK_PRESENTATION__.activePageId), "page-01", "managed mode must leave keyboard navigation to NUTBOOK");
  await page.evaluate(() => window.__NUTBOOK_PRESENTATION__.setManagedMode(false));
  await page.evaluate(script => {
    window.__editMessages = [];
    window.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      if (command === "native_presentation_probe_command") window.__probePayload = args.payload;
      if (command === "html_edit_runtime_message_command") window.__editMessages.push(args.payload);
      return true;
    } };
    (0, eval)(script);
  }, buildProbeScript(1, "long-sample-probe"));
  await page.waitForFunction(() => Boolean(window.__probePayload));
  const probed = await page.evaluate(() => ({
    pages: window.__probePayload.pages,
    notes: window.__probePayload.notes,
    editable: document.querySelectorAll("[data-editable][data-id]").length,
    noteBlock: document.getElementById("nutbook-presentation-notes")?.textContent
  }));
  assert.equal(probed.pages.length, 24);
  assert.equal(probed.pages[23].id, "page-24");
  assert.deepEqual(probed.notes, {});
  assert.equal(probed.editable, 24);
  assert.deepEqual(JSON.parse(probed.noteBlock), { version: 1, pages: {} });

  await page.addScriptTag({ path: path.resolve("dist/assets/html-edit-runtime.js") });
  await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.enter({
    itemId: 1, runtimeSessionId: "long-sample-edit", generation: 1,
    inlineToolbar: true, locale: "zh-CN", patch: { changes: {} }
  }));
  await page.waitForFunction(() => window.__editMessages.some(message => message?.type === "html_edit_ready"));
  const editReady = await page.evaluate(() => window.__editMessages.find(message => message?.type === "html_edit_ready"));
  assert.equal(editReady.count, 24);
  assert.equal(editReady.presentation.pages.length, 24);

  const ordinaryPage = await browser.newPage();
  await ordinaryPage.goto(pathToFileURL(path.resolve("src-tauri/tests/fixtures/folder-acceptance/dist/ai-report.html")).href);
  await ordinaryPage.evaluate(script => {
    window.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      if (command === "native_presentation_probe_command") window.__probePayload = args.payload;
      return true;
    } };
    (0, eval)(script);
  }, buildProbeScript(2, "ordinary-html-probe"));
  await ordinaryPage.waitForFunction(() => Boolean(window.__probePayload), undefined, { timeout: 1000 });
  assert.deepEqual(await ordinaryPage.evaluate(() => ({
    unsupported: window.__probePayload.unsupported,
    pages: window.__probePayload.pages,
    activePageId: window.__probePayload.activePageId
  })), { unsupported: true, pages: [], activePageId: "" }, "ordinary HTML should report unsupported immediately instead of waiting four seconds");
} finally {
  await browser.close();
}
console.log("Long presentation sample passes the NUTBOOK presentation and HTML edit probes");
