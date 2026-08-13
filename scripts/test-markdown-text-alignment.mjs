import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const bundle = readFileSync("dist/assets/markdown-editor.js", "utf8");
const fixture = readFileSync("src-tauri/tests/fixtures/markdown-text-alignment/portable-text-alignment.md", "utf8");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
page.on("pageerror", (error) => console.error(`browser page error: ${error.stack || error.message}`));

async function selectRange(startText, endText = startText, endOffset = null) {
  return page.evaluate(async ({ startText, endText, endOffset }) => {
    const root = document.getElementById("editor");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let startNode = null;
    let endNode = null;
    while (walker.nextNode()) {
      const value = walker.currentNode.nodeValue || "";
      if (!startNode && value.includes(startText)) startNode = walker.currentNode;
      if (!endNode && value.includes(endText)) endNode = walker.currentNode;
    }
    if (!startNode || !endNode) throw new Error(`selection text not found: ${startText} -> ${endText}`);
    startNode.parentElement?.closest(".ProseMirror")?.focus({ preventScroll: true });
    const range = document.createRange();
    range.setStart(startNode, Math.max(0, startNode.nodeValue.indexOf(startText)));
    const resolvedEndOffset = endOffset == null
      ? endNode.nodeValue.indexOf(endText) + endText.length
      : endOffset;
    range.setEnd(endNode, Math.max(0, resolvedEndOffset));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
    startNode.parentElement?.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    startNode.parentElement?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      visible: root.querySelector(".markdown-format-toolbar")?.classList.contains("visible") || false,
      selected: selection.toString()
    };
  }, { startText, endText, endOffset });
}

async function applyAlignment(alignment) {
  return page.evaluate(async (alignment) => {
    const button = document.querySelector(`button[data-text-align="${alignment}"]`);
    if (!button) throw new Error(`alignment button missing: ${alignment}`);
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return window.__alignmentEditor.getMarkdown();
  }, alignment);
}

try {
  await page.setContent(`
    <style>
      #editor { width: 900px; }
      .markdown-format-toolbar { position: absolute; display: inline-flex; }
      .markdown-format-toolbar:not(.visible) { pointer-events: none; opacity: 0; }
      .markdown-format-toolbar button[aria-disabled="true"] { opacity: .35; }
      .nutbook-aligned-text-block { width: 100%; }
      .nutbook-text-align-center { text-align: center; }
      .nutbook-text-align-right { text-align: right; }
    </style>
    <div id="editor"></div>
  `);
  await page.addScriptTag({ content: bundle, type: "module" });
  await page.waitForFunction(() => Boolean(window.NutbookMarkdownEditor?.create));
  const initial = await page.evaluate(async (markdown) => {
    const root = document.getElementById("editor");
    window.__alignmentEditor = await window.NutbookMarkdownEditor.create({ root, markdown });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const baseline = window.__alignmentEditor.getBaselineMarkdown();
    return {
      alignedCount: root.querySelectorAll('div[data-type="aligned-text-block"]').length,
      brandVisible: Boolean(root.querySelector('div[data-type="aligned-text-block"] h1')),
      rawHtml: Array.from(root.querySelectorAll('span[data-type="html"]')).map((node) => node.textContent).join("\n"),
      baseline,
      toolbarVisible: root.querySelector(".markdown-format-toolbar")?.classList.contains("visible") || false
    };
  }, fixture);

  assert.equal(initial.alignedCount, 4, "the four canonical containers must become editable aligned_text_block nodes");
  assert.equal(initial.brandVisible, true, "the canonical brand H1 must stay visible inside the body wrapper");
  assert.match(initial.rawHtml, /custom-alignment/, "unknown attributes must stay on the raw HTML fallback path");
  assert.match(initial.rawHtml, /<div align="center">/, "a multi-block container must stay on the raw HTML fallback path");
  assert.match(initial.baseline, /<div align="center">\n\n# NUTBOOK Brand\n\n<\/div>/, "canonical aligned source must round trip");
  assert.equal(initial.toolbarVisible, false, "a collapsed selection must not show the text formatting toolbar");

  const selectedHeading = await selectRange("Plain Body H2");
  assert.match(selectedHeading.selected, /Plain Body H2/, "the browser must create the requested non-empty heading selection");
  assert.equal(selectedHeading.visible, true, "a non-empty heading selection must show the formatting toolbar");
  let markdown = await applyAlignment("center");
  assert.match(markdown, /<div align="center">\n\n## Plain Body H2\n\n<\/div>/, "a selected heading must serialize as canonical GitHub HTML");
  const preservedSelection = await page.evaluate(() => ({
    selected: window.getSelection()?.toString() || "",
    toolbarVisible: document.querySelector(".markdown-format-toolbar")?.classList.contains("visible") || false,
    centerActive: document.querySelector('button[data-text-align="center"]')?.classList.contains("active") || false
  }));
  assert.match(preservedSelection.selected, /Plain Body H2/, "alignment must preserve the browser-visible text selection");
  assert.equal(preservedSelection.toolbarVisible, true, "alignment must keep the formatting toolbar visible");
  assert.equal(preservedSelection.centerActive, true, "the preserved selection must refresh the active alignment state");

  await page.getByText("A list item must stay unchanged.", { exact: true }).click();
  await page.waitForTimeout(100);
  assert.equal(
    await page.locator(".markdown-format-toolbar").evaluate((toolbar) => toolbar.classList.contains("visible")),
    false,
    "clicking elsewhere in the document must collapse the selection and hide the toolbar"
  );

  await selectRange("Plain Body H2");
  const activeCenter = await page.evaluate(() => document.querySelector('button[data-text-align="center"]')?.classList.contains("active"));
  assert.equal(activeCenter, true, "the selected aligned block must activate its toolbar state");
  markdown = await applyAlignment("center");
  assert.doesNotMatch(markdown, /<div align="center">\n\n## Plain Body H2\n\n<\/div>/, "clicking the active alignment must unwrap to ordinary Markdown");

  await selectRange("Plain Body H2");
  await page.evaluate(() => document.querySelector('button[data-text-align="right"]')?.focus());
  await page.keyboard.press("Enter");
  await page.waitForTimeout(80);
  markdown = await page.evaluate(() => window.__alignmentEditor.getMarkdown());
  assert.match(markdown, /<div align="right">\n\n## Plain Body H2\n\n<\/div>/, "keyboard activation must apply text alignment without a pointer event");
  await page.evaluate(() => window.__alignmentEditor.undo());

  await selectRange("Plain Body H2", "Plain paragraph target.");
  markdown = await applyAlignment("center");
  assert.match(markdown, /<div align="center">\n\n## Plain Body H2\n\n<\/div>[\s\S]*?<div align="center">\n\nPlain paragraph target\.\n\n<\/div>/, "one action must align every supported block in the selection");
  await page.evaluate(() => window.__alignmentEditor.undo());
  markdown = await page.evaluate(() => window.__alignmentEditor.getMarkdown());
  assert.doesNotMatch(markdown, /<div align="center">\n\n## Plain Body H2/, "one undo must revert the complete multi-block transaction");
  assert.doesNotMatch(markdown, /<div align="center">\n\nPlain paragraph target\./, "one undo must revert every block in the transaction");

  await selectRange("Plain Body H2", "Plain paragraph target.", 0);
  markdown = await applyAlignment("right");
  assert.match(markdown, /<div align="right">\n\n## Plain Body H2\n\n<\/div>/, "the selection must include its starting block");
  assert.doesNotMatch(markdown, /<div align="right">\n\nPlain paragraph target\./, "a selection ending at the next block start must not align that block");
  await page.evaluate(() => window.__alignmentEditor.undo());

  await selectRange("Plain paragraph target.", "A list item must stay unchanged.");
  const mixedDisabled = await page.evaluate(() => ({
    disabled: document.querySelector('button[data-text-align="center"]')?.getAttribute("aria-disabled"),
    tooltip: document.querySelector('button[data-text-align="center"] .markdown-format-tooltip')?.textContent
  }));
  assert.equal(mixedDisabled.disabled, "true", "a selection touching a list must disable text alignment");
  assert.match(mixedDisabled.tooltip || "", /正文和标题|paragraphs and headings|markdown\.textAlignBlockOnly/, "the disabled action must explain its supported scope");

  await selectRange("Inline image paragraph must be rejected:");
  const inlineDisabled = await page.evaluate(() => document.querySelector('button[data-text-align="right"]')?.getAttribute("aria-disabled"));
  assert.equal(inlineDisabled, "true", "a paragraph containing an inline image must disable text alignment");
} finally {
  await page.evaluate(() => window.__alignmentEditor?.destroy?.()).catch(() => {});
  await browser.close();
}

console.log("Markdown text alignment regression passed.");
