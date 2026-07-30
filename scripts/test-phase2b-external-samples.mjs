import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const manifestPath = path.resolve("src-tauri/tests/fixtures/html-edit/phase2b-external-samples.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const converterPath = path.resolve("dist/assets/html-edit-converter.js");
const runtimePath = path.resolve("dist/assets/html-edit-runtime.js");
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route(/^https?:\/\//, (route) => route.abort("blockedbyclient"));
  for (const sample of manifest.samples) {
    assert.ok(fs.existsSync(sample.path), `external sample is missing: ${sample.path}`);
    const bytes = fs.readFileSync(sample.path);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), sample.sha256, `external sample changed: ${sample.path}`);
    await page.goto(pathToFileURL(sample.path).href);
    await page.addScriptTag({ path: converterPath });
    const result = await page.evaluate(() => window.__NUTBOOK_HTML_EDIT_CONVERTER__.convert());
    assert.equal(result.ok, true, `external sample must convert: ${sample.path}`);
    assert.equal(result.structureProfile, "vertical-sections-v1", `external sample must receive the vertical profile: ${sample.path}`);
    assert.equal(result.sectionCount, sample.expectedSectionCount, `section count changed: ${sample.path}`);
    assert.ok(result.sections.every((section) => section.kind === sample.expectedKind), `section kind changed: ${sample.path}`);
    await page.setContent(result.protocolizedHtml);
    const uncoveredText = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((node) => {
      if (node.closest("[data-editable],script,style,noscript,svg,canvas,iframe,video")) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity || 1) <= 0 || rect.width <= 8 || rect.height <= 8) return false;
      const ownText = [...node.childNodes].filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent || "").join(" ").replace(/\s+/g, " ").trim();
      return ownText.length > 0;
    }).map((node) => ({
      tag: node.tagName,
      className: String(node.className || ""),
      text: [...node.childNodes].filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent || "").join(" ").replace(/\s+/g, " ").trim()
    })));
    if (sample.path.includes("agent-architecture-slides")) {
      assert.ok(uncoveredText.every((entry) => entry.className === "quote-mark"), `only decorative quote marks may remain uncovered: ${JSON.stringify(uncoveredText)}`);
    }
    await page.evaluate(() => {
      window.__phase2bMessages = [];
      window.__TAURI_INTERNALS__ = {
        invoke: async (command, args) => {
          if (command === "html_edit_runtime_message_command") window.__phase2bMessages.push(args.payload);
          return true;
        }
      };
    });
    await page.addScriptTag({ path: runtimePath });
    await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.enter({
      itemId: 72,
      runtimeSessionId: "external-sample",
      generation: 1,
      inlineToolbar: false,
      patch: { changes: {} },
      runtimeAssetUrls: {}
    }));
    const lastPageId = result.sections.at(-1).id;
    await page.evaluate(() => {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
    assert.equal(await page.evaluate((pageId) => window.__NUTBOOK_HTML_EDIT__.goToSection({
      itemId: 72,
      runtimeSessionId: "external-sample",
      generation: 1,
      pageId,
      requestId: "external-last",
      requestEpoch: 0
    }), lastPageId), true, `last section navigation must be accepted: ${sample.path}`);
    await page.waitForTimeout(2200);
    const navigationEvidence = await page.evaluate((pageId) => {
      const target = document.querySelector(`[data-nutbook-page-id="${CSS.escape(pageId)}"]`);
      return {
        documentScrollTop: document.scrollingElement?.scrollTop,
        bodyScrollTop: document.body.scrollTop,
        targetTop: target?.getBoundingClientRect().top,
        activePageId: window.__NUTBOOK_HTML_EDIT__.sectionNavigationSnapshot()?.activePageId,
        results: window.__phase2bMessages.filter((message) => message.type === "html_edit_section_navigation_result")
      };
    }, lastPageId);
    assert.ok(navigationEvidence.results.some((message) =>
      message.requestId === "external-last"
      && message.pageId === lastPageId
      && message.ok
    ), `last section navigation did not settle: ${sample.path}\n${JSON.stringify(navigationEvidence)}`);
    if (sample.expectedScrollRoot === "body") assert.ok(navigationEvidence.bodyScrollTop > 0, `body scroll root did not move: ${sample.path}`);
    else assert.ok(navigationEvidence.documentScrollTop > 0, `document scroll root did not move: ${sample.path}`);
    assert.equal((await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.sectionNavigationSnapshot())).activePageId, lastPageId);
  }
} finally {
  await browser.close();
}

console.log("Phase 2B external sample checks passed");
