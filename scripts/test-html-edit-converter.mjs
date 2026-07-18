import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const source = fs.readFileSync("dist/assets/html-edit-converter.js", "utf8");
const fixture = fs.readFileSync("src-tauri/tests/fixtures/html-edit/plain-html-convertible.html", "utf8");
for (const token of ["detached clone", "protocol_present", "nutbook-${kind}-${ordinal++}", "simplePicture", "background-image"]) {
  if (!source.includes(token)) throw new Error(`converter missing ${token}`);
}
for (const token of ["<h1>", "<picture>", "background-image", "<canvas"]) {
  if (!fixture.includes(token)) throw new Error(`fixture missing ${token}`);
}

// Exercise conversion in a real browser DOM. Adjacent readable blocks must be
// moved as one rich-text group without losing a sibling as the clone mutates.
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const fixturePath = path.resolve("src-tauri/tests/fixtures/html-edit/plain-html-convertible.html");
  const converterPath = path.resolve("dist/assets/html-edit-converter.js");
  await page.goto(pathToFileURL(fixturePath).href);
  assert.equal(await page.locator("[data-editable]").count(), 0, "fixture must start as ordinary HTML");
  await page.addScriptTag({ path: converterPath });
  const result = await page.evaluate(() => window.__NUTBOOK_HTML_EDIT_CONVERTER__.convert());
  assert.equal(result.ok, true, "convertible fixture must produce an editable copy");
  assert.ok(result.textCount > 0, "conversion must find editable text");
  assert.equal(result.imageCount, 1, "the supported picture image must become an editable image target");
  assert.equal(result.backgroundImageCount, 1, "the visible local background must become an editable target");
  assert.match(result.protocolizedHtml, /data-editable="rich-text"/, "adjacent blocks must produce rich-text protocol targets");
  assert.match(result.protocolizedHtml, /data-editable="rich-text"[^>]*><h1>[\s\S]*?<p>[\s\S]*?<ul><li>/, "a simple list adjacent to text must stay inside the same rich-text field");
  assert.doesNotMatch(result.protocolizedHtml, /<ul>\s*<div\b/, "a list must never be split by a wrapper inside its list container");
  assert.match(result.protocolizedHtml, /<picture><source[^>]*><img[^>]*data-editable="image"/, "the picture image must retain its source and receive the image protocol");
  assert.equal(await page.locator("[data-editable]").count(), 0, "detached conversion must not mutate the live preview DOM");

  await page.setContent(`<!doctype html><html><body>
    <h2 style="font-size:22px" data-darkmode-color="#c8c8c8">导出正文标题</h2>
    <p style="line-height:1.8" data-darkmode-color="#c8c8c8">第一段带有 <strong style="font-weight:700" data-darkmode-color="#6aadff">强调文本</strong>。</p>
    <p style="line-height:1.8" data-darkmode-color="#c8c8c8">第二段正文。</p>
  </body></html>`);
  await page.addScriptTag({ path: converterPath });
  const bodyDirectResult = await page.evaluate(() => window.__NUTBOOK_HTML_EDIT_CONVERTER__.convert());
  assert.equal(bodyDirectResult.ok, true, "body-direct exported text must be convertible");
  assert.equal(bodyDirectResult.textCount, 1, "adjacent body-direct blocks must become one rich-text field");
  assert.match(bodyDirectResult.protocolizedHtml, /data-editable="rich-text"[^>]*><h2>导出正文标题<\/h2><p>第一段带有 <strong>强调文本<\/strong>。<\/p><p>第二段正文。<\/p>/, "presentation-only export attributes must not split rich text");
} finally {
  await browser.close();
}

console.log("HTML edit converter browser checks passed");
