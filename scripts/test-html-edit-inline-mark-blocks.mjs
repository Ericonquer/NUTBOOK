import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const runtime = readFileSync("dist/assets/html-edit-runtime.js", "utf8");
const acceptanceFixture = readFileSync("src-tauri/tests/fixtures/html-edit/editable-rich-text.html", "utf8");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.setContent('<main data-editable="rich-text" data-edit-role="content" data-id="article-body"><p>从想法到可交付体验</p></main>');
  await page.addScriptTag({ content: runtime });
  await page.evaluate(() => {
    window.__TAURI_INTERNALS__ = { invoke: async () => true };
    window.__NUTBOOK_HTML_EDIT__.enter({ runtimeSessionId: "inline-mark-blocks", inlineToolbar: false, locale: "zh-CN", patch: { changes: {} } });
  });

  for (const command of ["heading-3", "paragraph"]) {
    await page.evaluate((nextCommand) => {
      const field = document.querySelector('[data-id="article-body"]');
      const range = document.createRange(); range.selectNodeContents(field);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
      if (!window.__NUTBOOK_HTML_EDIT__.applyFormat({ runtimeSessionId: "inline-mark-blocks", command: nextCommand })) throw new Error(`${nextCommand} was not applied`);
    }, command);
  }

  for (const command of ["bold", "italic"]) {
    await page.evaluate((nextCommand) => {
      const field = document.querySelector('[data-id="article-body"]');
      const range = document.createRange(); range.selectNodeContents(field);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
      if (!window.__NUTBOOK_HTML_EDIT__.applyFormat({ runtimeSessionId: "inline-mark-blocks", command: nextCommand })) throw new Error(`${nextCommand} was not applied`);
    }, command);

    const marked = await page.locator('[data-id="article-body"]').innerHTML();
    assert.equal(marked, `<p><${command === "bold" ? "strong" : "em"}>从想法到可交付体验</${command === "bold" ? "strong" : "em"}></p>`, `${command} must stay inside its paragraph after a heading round trip`);

    await page.evaluate((nextCommand) => {
      if (!window.__NUTBOOK_HTML_EDIT__.applyFormat({ runtimeSessionId: "inline-mark-blocks", command: nextCommand })) throw new Error(`${nextCommand} was not toggled off`);
    }, command);
    assert.equal(await page.locator('[data-id="article-body"]').innerHTML(), "<p>从想法到可交付体验</p>", `${command} must toggle back off after a heading round trip`);
  }

  await page.setContent(acceptanceFixture);
  await page.addScriptTag({ content: runtime });
  await page.evaluate(() => {
    window.__TAURI_INTERNALS__ = { invoke: async () => true };
    window.__NUTBOOK_HTML_EDIT__.enter({ runtimeSessionId: "fixture-heading", inlineToolbar: false, locale: "zh-CN", patch: { changes: {} } });
  });
  await page.evaluate(() => {
    const field = document.querySelector('[data-id="article-body"]');
    const heading = field.querySelector("h2");
    const range = document.createRange(); range.selectNodeContents(heading);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  for (const command of ["heading-3", "paragraph", "bold", "bold", "italic", "italic"]) {
    await page.evaluate((nextCommand) => {
      if (!window.__NUTBOOK_HTML_EDIT__.applyFormat({ runtimeSessionId: "fixture-heading", command: nextCommand })) throw new Error(`${nextCommand} was not applied to the fixture heading`);
    }, command);
  }
  assert.equal(await page.locator('[data-id="article-body"] > :first-child').evaluate((node) => node.outerHTML), "<p>从想法到可交付体验</p>", "the real acceptance fixture heading must survive heading, paragraph, bold, and italic round trips without invalid wrapper blocks");

  await page.setContent('<p data-editable="rich-text" data-edit-role="short" data-id="legacy-code">Run <code>nbskill</code> safely.</p>');
  await page.addScriptTag({ content: runtime });
  await page.evaluate(() => {
    window.__TAURI_INTERNALS__ = { invoke: async () => true };
    window.__NUTBOOK_HTML_EDIT__.enter({ runtimeSessionId: "legacy-inline-code", inlineToolbar: false, locale: "en-US", patch: { changes: {} } });
  });
  await page.evaluate(() => {
    const field = document.querySelector('[data-id="legacy-code"]');
    field.append(document.createTextNode(" Updated."));
    field.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: " Updated.", bubbles: true }));
  });
  assert.equal(
    await page.locator('[data-id="legacy-code"]').innerHTML(),
    "Run <code>nbskill</code> safely. Updated.",
    "editing an accepted v1 short rich-text field must preserve attribute-free inline code"
  );
} finally {
  await browser.close();
}

console.log("HTML edit inline mark block regression passed.");
