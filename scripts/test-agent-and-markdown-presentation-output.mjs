import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const output = mkdtempSync(join(tmpdir(), "nutbook-presentation-output-"));
execFileSync("cargo", ["run", "--quiet", "--manifest-path", "src-tauri/Cargo.toml", "--example", "render_presentation_acceptance", "--", output], { stdio: "inherit" });
const indexHtml = readFileSync("dist/index.html", "utf8");
const start = indexHtml.indexOf("function nativePresentationProbeScript(");
const end = indexHtml.indexOf("async function probeNativePresentation(", start);
assert.ok(start >= 0 && end > start);
const buildProbeScript = new Function(`${indexHtml.slice(start, end)}; return nativePresentationProbeScript;`)();

let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const file of [
    resolve("docs/presentations/agent-presentation-sample/index.html"),
    ...["light-static", "light-dynamic", "dark-static", "dark-dynamic"].map(name => join(output, `${name}.html`)),
  ]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(pathToFileURL(file).href);
    const result = await page.evaluate(async () => {
      const bridge = window.__NUTBOOK_PRESENTATION__;
      const changes = [];
      const unsubscribe = bridge.subscribe(id => changes.push(id));
      const first = bridge.pages[0].id;
      const second = bridge.pages[1].id;
      await bridge.whenReady();
      const moved = await bridge.goTo(second);
      const visible = document.querySelector(".slide.is-active,.slide.active")?.dataset.nutbookPageId;
      await bridge.setManagedMode(true);
      const controlsHidden = getComputedStyle(document.querySelector(".presentation-controls,.controls")).display === "none";
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      const afterManagedKey = bridge.activePageId;
      await bridge.goTo(first);
      await bridge.setManagedMode(false);
      const controlsRestored = getComputedStyle(document.querySelector(".presentation-controls,.controls")).display !== "none";
      unsubscribe();
      return { first, second, pages: bridge.pages.length, capability: bridge.capabilities.managedPresenter, moved, visible, changes, afterManagedKey, controlsHidden, controlsRestored, editFields: document.querySelectorAll("[data-editable][data-id]").length, notes: JSON.parse(document.getElementById("nutbook-presentation-notes").textContent), imageLoaded: [...document.images].every(image => image.complete && image.naturalWidth > 0), motionAvailable: Boolean(window.NutbookPresentationMotion) };
    });
    assert.ok(result.pages >= 3, file);
    assert.equal(result.capability, true, file);
    assert.equal(result.moved, true, file);
    assert.equal(result.visible, result.second, file);
    assert.deepEqual(result.changes, [result.second, result.first], file);
    assert.equal(result.afterManagedKey, result.second, file);
    assert.equal(result.controlsHidden, true, file);
    assert.equal(result.controlsRestored, true, file);
    assert.ok(result.editFields >= result.pages, file);
    assert.equal(result.notes.version, 1, file);
    assert.equal(result.imageLoaded, true, file);
    if (file.endsWith("-dynamic.html")) assert.equal(result.motionAvailable, true, file);
    if (file.startsWith(output)) {
      const fullscreen = await page.evaluate(() => {
        let hostRequests = 0;
        window.__NUTBOOK_REQUEST_HOST_FULLSCREEN__ = () => { hostRequests += 1; };
        document.querySelector("[data-fullscreen]").click();
        delete window.__NUTBOOK_REQUEST_HOST_FULLSCREEN__;
        return { hostRequests, domFullscreen: Boolean(document.fullscreenElement) };
      });
      assert.deepEqual(fullscreen, { hostRequests: 1, domFullscreen: false }, `${file}: embedded fullscreen uses host window`);
    }

    await page.evaluate(script => {
      window.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
        if (command === "native_presentation_probe_command") window.__probePayload = args.payload;
        if (command === "html_edit_runtime_message_command") (window.__editMessages ||= []).push(args.payload);
        return true;
      } };
      (0, eval)(script);
    }, buildProbeScript(1, "output-probe"));
    await page.waitForFunction(() => Boolean(window.__probePayload));
    const probe = await page.evaluate(() => window.__probePayload);
    assert.equal(probe.unsupported, false, file);
    assert.equal(probe.pages.length, result.pages, file);
    assert.equal(probe.activePageId, result.first, file);
    assert.equal(probe.declared, true, file);
    await page.addScriptTag({ path: resolve("dist/assets/html-edit-runtime.js") });
    await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.enter({ itemId: 1, runtimeSessionId: "output-edit", generation: 1, inlineToolbar: true, locale: "zh-CN", patch: { changes: {} } }));
    await page.waitForFunction(() => window.__editMessages?.some(message => message?.type === "html_edit_ready"));
    const editReady = await page.evaluate(() => window.__editMessages.find(message => message?.type === "html_edit_ready"));
    assert.ok(editReady.count >= result.pages, file);
    assert.equal(editReady.presentation.pages.length, result.pages, file);
    if (file.startsWith(output)) {
      const editState = await page.evaluate(() => {
        const editor = window.__NUTBOOK_HTML_EDIT__;
        const initialChanges = editor.getSnapshot().changes;
        const nestedEditable = document.querySelector('[data-editable="rich-text"] [data-editable="image"]');
        const title = document.querySelector('[data-id="nutbook-page-001-field-002"]');
        title.textContent = "保存后的标题";
        title.dispatchEvent(new InputEvent("input", { bubbles: true }));
        return { initialChanges, nestedEditable: Boolean(nestedEditable), changes: editor.getSnapshot().changes };
      });
      assert.deepEqual(editState.initialChanges, {}, `${file}: entering edit mode must be clean`);
      assert.equal(editState.nestedEditable, false, `${file}: image must not be nested in rich text`);
      assert.deepEqual(Object.keys(editState.changes), ["nutbook-page-001-field-002"], `${file}: body edit must not change an image paragraph`);
    }
    await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.exit({ runtimeSessionId: "output-edit", discard: true }));
    await page.close();
  }

  for (const [name, expected] of [["missing-managed", "missing_managed_mode"], ["duplicate-page", "duplicate_page_id"], ["invalid-notes", "invalid_notes"]]) {
    const negative = await browser.newPage();
    await negative.goto(pathToFileURL(resolve(`docs/presentations/agent-presentation-sample/${name === "duplicate-page" ? "invalid-duplicate-page.html" : "index.html"}`)).href);
    await negative.evaluate(({ name, script }) => {
      if (name === "missing-managed") delete window.__NUTBOOK_PRESENTATION__.setManagedMode;
      if (name === "invalid-notes") document.getElementById("nutbook-presentation-notes").textContent = "{broken";
      window.__TAURI_INTERNALS__ = { invoke: async (command, args) => { if (command === "native_presentation_probe_command") window.__probePayload = args.payload; return true; } };
      (0, eval)(script);
    }, { name, script: buildProbeScript(2, `negative-${name}`) });
    await negative.waitForFunction(() => Boolean(window.__probePayload));
    assert.equal(await negative.evaluate(() => window.__probePayload.reason), expected);
    await negative.close();
  }
  console.log("Agent sample and four exported presentation outputs passed browser behavior and NUTBOOK probe checks");
} finally {
  await browser?.close();
  rmSync(output, { recursive: true, force: true });
}
