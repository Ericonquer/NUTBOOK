import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const source = fs.readFileSync("dist/assets/html-edit-converter.js", "utf8");
const fixture = fs.readFileSync("src-tauri/tests/fixtures/html-edit/plain-html-convertible.html", "utf8");
for (const token of ["detached clone", "protocol_present", "nutbook-${kind}-${ordinal++}", "simplePicture", "background-image", "vertical-sections-v1", "detectVerticalStructure"]) {
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
  assert.equal(result.structureProfile, null, "ordinary article fixture must not invent a section profile");

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

  await page.setContent(`<!doctype html><html><body>
    <div class="card"><span class="tag">标签</span><strong>独立标题</strong><p>卡片正文。</p></div>
    <div class="label">L1</div>
  </body></html>`);
  await page.addScriptTag({ path: converterPath });
  const leafTextResult = await page.evaluate(() => window.__NUTBOOK_HTML_EDIT_CONVERTER__.convert());
  assert.equal(leafTextResult.ok, true);
  assert.match(leafTextResult.protocolizedHtml, /<span class="tag" data-id="[^"]+" data-editable="text">标签<\/span>/, "standalone span copy must be editable");
  assert.match(leafTextResult.protocolizedHtml, /<strong data-id="[^"]+" data-editable="text">独立标题<\/strong>/, "standalone strong copy must be editable");
  assert.match(leafTextResult.protocolizedHtml, /<div class="label" data-id="[^"]+" data-editable="text">L1<\/div>/, "short meaningful leaf labels must be editable");

  await page.setContent(`<!doctype html><html><head><style>
    section{min-height:400px}.reveal{opacity:0}
  </style></head><body><main>
    <section><h2 class="reveal">动画标题一</h2><p>正文一</p></section>
    <section><h2 class="reveal">动画标题二</h2><p>正文二</p></section>
  </main></body></html>`);
  await page.addScriptTag({ path: converterPath });
  const revealResult = await page.evaluate(() => window.__NUTBOOK_HTML_EDIT_CONVERTER__.convert());
  assert.equal(revealResult.sectionCount, 2);
  assert.deepEqual(revealResult.sections.map((section) => section.title), ["动画标题一", "动画标题二"]);
  await page.setContent(revealResult.protocolizedHtml);
  assert.equal(await page.locator("h2").first().evaluate((node) => Boolean(node.closest("[data-editable]"))), true, "animation-hidden text inside accepted sections must not depend on conversion timing");

  const verticalFixturePath = path.resolve("src-tauri/tests/fixtures/html-edit/phase2b-vertical-sections.html");
  await page.goto(pathToFileURL(verticalFixturePath).href);
  await page.locator("img").waitFor();
  await page.addScriptTag({ path: converterPath });
  const verticalResult = await page.evaluate(() => window.__NUTBOOK_HTML_EDIT_CONVERTER__.convert());
  assert.equal(verticalResult.ok, true, "vertical acceptance artifact must be convertible");
  assert.equal(verticalResult.structureProfile, "vertical-sections-v1");
  assert.equal(verticalResult.sectionCount, 3, "one long semantic section must remain one structure entry");
  assert.deepEqual(verticalResult.sections.map((section) => section.title), ["从原件开始", "长段仍然只有一张结构卡", "保存并重开"]);
  assert.equal(new Set(verticalResult.sections.map((section) => section.id)).size, 3, "generated section IDs must be unique");
  assert.equal(await page.locator("[data-nutbook-page-id]").count(), 0, "detached structure conversion must not mutate live section roots");
  assert.match(verticalResult.protocolizedHtml, /data-nutbook-structure-profile="vertical-sections-v1"/);
  assert.match(verticalResult.protocolizedHtml, /data-nutbook-page-kind="section"/);
  assert.equal((verticalResult.protocolizedHtml.match(/data-nutbook-page-id=/g) || []).length, 3);

  await page.setContent(`<!doctype html><html><body><main>
    <section data-nutbook-page-id="duplicate"><h2>第一段</h2><p>正文一</p></section>
    <section data-nutbook-page-id="duplicate"><h2>第二段</h2><p>正文二</p></section>
  </main></body></html>`);
  await page.addScriptTag({ path: converterPath });
  const duplicateIdResult = await page.evaluate(() => window.__NUTBOOK_HTML_EDIT_CONVERTER__.convert());
  assert.equal(duplicateIdResult.sectionCount, 2);
  assert.deepEqual(duplicateIdResult.sections.map((section) => section.id), ["nutbook-section-1", "nutbook-section-2"], "duplicate source page IDs must be replaced deterministically");

  await page.setContent(`<!doctype html><html><body><main>
    <section><h2>Only section</h2><p>Still ordinary HTML.</p></section>
  </main></body></html>`);
  await page.addScriptTag({ path: converterPath });
  const singleSectionResult = await page.evaluate(() => window.__NUTBOOK_HTML_EDIT_CONVERTER__.convert());
  assert.equal(singleSectionResult.structureProfile, null, "fewer than two sections must stay ordinary HTML");
  assert.equal(singleSectionResult.sectionCount, 0);
} finally {
  await browser.close();
}

console.log("HTML edit converter browser checks passed");
