import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const targetPath = process.argv[2] || new URL("../src-tauri/tests/fixtures/html-edit/editable-basic.html", import.meta.url).pathname;
const runtimePath = new URL("../dist/assets/html-edit-runtime.js", import.meta.url).pathname;
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto(pathToFileURL(targetPath).href);
  await page.evaluate(() => {
    window.__historyMessages = [];
    window.__beforeInputOffsets = [];
    document.addEventListener("beforeinput", () => {
      const field = document.querySelector('[data-id="acceptance-title"]');
      const selection = window.getSelection();
      if (!selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      const prefix = document.createRange();
      prefix.selectNodeContents(field);
      prefix.setEnd(range.startContainer, range.startOffset);
      window.__beforeInputOffsets.push([...prefix.toString()].length);
    }, true);
    window.__TAURI_INTERNALS__ = {
      invoke: async (_command, value) => {
        window.__historyMessages.push(value.payload);
        return true;
      }
    };
  });
  await page.addScriptTag({ path: runtimePath });
  await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.enter({
    runtimeSessionId: "basic-history",
    inlineToolbar: false,
    locale: "zh-CN",
    patch: { changes: {} },
    runtimeAssetUrls: {}
  }));

  const title = page.locator('[data-id="acceptance-title"]');
  const body = page.locator('[data-id="acceptance-body"]');
  const originalTitle = await title.textContent();
  const originalBody = await body.textContent();
  const titleLength = [...originalTitle].length;

  await title.focus();
  await title.evaluate((field) => {
    const range = document.createRange();
    range.selectNodeContents(field);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.keyboard.press("Backspace");
    assert.equal([...await title.textContent()].length, titleLength - 1, `delete ${attempt + 1} must mutate the title`);
    await page.keyboard.press("Meta+z");
    assert.equal(await title.textContent(), originalTitle, `immediate undo ${attempt + 1} must restore the deleted character`);
    assert.equal(await body.textContent(), originalBody, `undo ${attempt + 1} must not rewrite the other text field`);
    const caret = await page.evaluate(() => {
      const field = document.querySelector('[data-id="acceptance-title"]');
      const selection = window.getSelection();
      if (!selection?.rangeCount) return null;
      const range = selection.getRangeAt(0);
      const prefix = document.createRange();
      prefix.selectNodeContents(field);
      prefix.setEnd(range.startContainer, range.startOffset);
      return { fieldId: range.startContainer.parentElement?.closest?.("[data-id]")?.getAttribute("data-id") || range.startContainer.getAttribute?.("data-id") || "", offset: [...prefix.toString()].length, collapsed: range.collapsed };
    });
    const beforeInputOffsets = await page.evaluate(() => [...window.__beforeInputOffsets]);
    assert.deepEqual(caret, { fieldId: "acceptance-title", offset: titleLength, collapsed: true }, `undo ${attempt + 1} must restore the caret to the deletion position; beforeinput offsets=${beforeInputOffsets.join(",")}`);
  }

  await page.keyboard.press("Backspace");
  await page.keyboard.press("Meta+z");
  await page.keyboard.press("Meta+Shift+z");
  assert.equal([...await title.textContent()].length, titleLength - 1, "redo must restore the deleted state");
  const redoCaretOffset = await page.evaluate(() => {
    const field = document.querySelector('[data-id="acceptance-title"]');
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const prefix = document.createRange();
    prefix.selectNodeContents(field);
    prefix.setEnd(range.startContainer, range.startOffset);
    return [...prefix.toString()].length;
  });
  assert.equal(redoCaretOffset, titleLength - 1, "redo must restore the caret after the deletion");
  await page.keyboard.press("Meta+z");

  await page.keyboard.press("Backspace");
  const saveRevision = await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.getSnapshot().documentRevision);
  assert.equal(await page.evaluate((revision) => window.__NUTBOOK_HTML_EDIT__.markSaved({ runtimeSessionId: "basic-history", expectedDocumentRevision: revision }), saveRevision), true, "saving with a pending text transaction must keep history arrays aligned");
  const savedTitle = await title.textContent();
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Meta+z");
  assert.equal(await title.textContent(), savedTitle, "undo after save must restore the saved text baseline");

  const historyEvents = await page.evaluate(() => window.__historyMessages.filter((message) => message?.type === "html_edit_history_debug").map((message) => message.event));
  assert.equal(historyEvents.filter((event) => event === "undo-applied").length, 11, "all rapid delete/undo cycles must advance history");
  assert.equal(historyEvents.includes("undo-unavailable"), false, "rapid delete/undo must never lose its pending transaction");
} finally {
  await browser.close();
}

console.log("HTML basic history runtime browser checks passed");
