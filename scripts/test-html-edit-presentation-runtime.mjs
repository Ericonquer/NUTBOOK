import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  await page.goto(pathToFileURL(path.resolve("src-tauri/tests/fixtures/html-edit/editable-free-image.html")).href);
  await page.setContent(`<!doctype html><body>
    <section data-nutbook-page-id="page-one"><h1 data-id="one-title" data-editable="rich-text">one</h1></section>
    <section data-nutbook-page-id="page-two" hidden><h1 data-id="two-title" data-editable="rich-text">two</h1></section>
    <script>
      let activePageId = "page-one", listener = null;
      window.__NUTBOOK_PRESENTATION__ = {
        pages: [{ id: "page-one", index: 1 }, { id: "page-two", index: 2 }],
        get activePageId() { return activePageId; },
        whenReady: () => Promise.resolve(),
        setEditMode: () => true,
        subscribe: (next) => { listener = next; return () => { listener = null; }; },
        goTo: (id) => { activePageId = id; for (const root of document.querySelectorAll("[data-nutbook-page-id]")) root.hidden = root.dataset.nutbookPageId !== id; listener?.(id); return true; }
      };
    </script>
  </body>`);
  await page.evaluate(() => { window.__TAURI_INTERNALS__ = { invoke: async () => true }; });
  await page.addScriptTag({ path: path.resolve("dist/assets/html-edit-runtime.js") });
  await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.enter({ runtimeSessionId: "presentation-keys", inlineToolbar: true, patch: { changes: {} }, runtimeAssetUrls: {} }));

  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => window.__NUTBOOK_HTML_EDIT__.presentationSnapshot()?.activePageId === "page-two");
  assert.equal(await page.locator('[data-nutbook-page-id="page-two"]').isHidden(), false, "ArrowDown outside an editor field must select the next presentation page");

  await page.locator('[data-id="two-title"]').click();
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(20);
  assert.equal(await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.presentationSnapshot()?.activePageId), "page-two", "ArrowUp inside a text field must remain available to the editor and not navigate the deck");
} finally {
  await browser.close();
}

console.log("HTML presentation keyboard runtime checks passed");
