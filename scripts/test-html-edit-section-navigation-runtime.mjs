import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const converterPath = path.resolve("dist/assets/html-edit-converter.js");
const runtimePath = path.resolve("dist/assets/html-edit-runtime.js");
const fixturePath = path.resolve("src-tauri/tests/fixtures/html-edit/phase2b-vertical-sections.html");

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 720 } });
  await page.goto(pathToFileURL(fixturePath).href);
  await page.locator("img").waitFor();
  await page.addScriptTag({ path: converterPath });
  const converted = await page.evaluate(() => window.__NUTBOOK_HTML_EDIT_CONVERTER__.convert());
  assert.equal(converted.structureProfile, "vertical-sections-v1");
  assert.equal(converted.sectionCount, 3);

  await page.setContent(converted.protocolizedHtml);
  await page.evaluate(() => {
    window.__phase2bMessages = [];
    window.__phase2bKeys = [];
    window.addEventListener("keydown", (event) => window.__phase2bKeys.push({ key: event.key, defaultPrevented: event.defaultPrevented }), true);
    window.__TAURI_INTERNALS__ = {
      invoke: async (command, args) => {
        if (command === "html_edit_runtime_message_command") window.__phase2bMessages.push(args.payload);
        return true;
      }
    };
  });
  await page.addScriptTag({ path: runtimePath });
  await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.enter({
    itemId: 42,
    runtimeSessionId: "phase2b-session",
    generation: 7,
    inlineToolbar: false,
    patch: { changes: {} },
    runtimeAssetUrls: {}
  }));

  const initial = await page.evaluate(() => ({
    presentation: window.__NUTBOOK_HTML_EDIT__.presentationSnapshot(),
    sections: window.__NUTBOOK_HTML_EDIT__.sectionNavigationSnapshot(),
    ready: window.__phase2bMessages.find((message) => message.type === "html_edit_ready")
  }));
  assert.equal(initial.presentation, null, "converted vertical HTML must never activate PresentationAdapter");
  assert.equal(initial.sections.pages.length, 3);
  assert.equal(initial.ready.itemId, 42);
  assert.equal(initial.ready.runtimeSessionId, "phase2b-session");
  assert.equal(initial.ready.generation, 7);
  assert.equal(initial.ready.sectionNavigation.pages.length, 3);

  const secondId = initial.sections.pages[1].id;
  assert.equal(await page.evaluate((pageId) => window.__NUTBOOK_HTML_EDIT__.goToSection({
    itemId: 42,
    runtimeSessionId: "phase2b-session",
    generation: 7,
    pageId,
    requestId: "go-second",
    requestEpoch: 0
  }), secondId), true);
  await page.waitForFunction(() => window.__phase2bMessages.some((message) => message.type === "html_edit_section_navigation_result" && message.requestId === "go-second" && message.ok));
  assert.equal(await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.sectionNavigationSnapshot().activePageId), secondId);

  const thirdId = initial.sections.pages[2].id;
  await page.evaluate((pageId) => {
    const target = document.querySelector(`[data-nutbook-page-id="${CSS.escape(pageId)}"]`);
    window.scrollTo({ top: target.offsetTop, behavior: "auto" });
  }, thirdId);
  await page.waitForFunction((pageId) => window.__phase2bMessages.some((message) => message.type === "html_edit_section_navigation_changed" && message.pageId === pageId), thirdId);

  const staleAccepted = await page.evaluate((pageId) => window.__NUTBOOK_HTML_EDIT__.goToSection({
    itemId: 42,
    runtimeSessionId: "stale-session",
    generation: 7,
    pageId,
    requestId: "stale"
  }), initial.sections.pages[0].id);
  assert.equal(staleAccepted, false, "stale session navigation must be rejected");

  const firstId = initial.sections.pages[0].id;
  await page.evaluate(({ firstId, secondId }) => {
    window.__NUTBOOK_HTML_EDIT__.goToSection({ itemId: 42, runtimeSessionId: "phase2b-session", generation: 7, pageId: firstId, requestId: "superseded", requestEpoch: 0 });
    window.__NUTBOOK_HTML_EDIT__.goToSection({ itemId: 42, runtimeSessionId: "phase2b-session", generation: 7, pageId: secondId, requestId: "newer", requestEpoch: 0 });
  }, { firstId, secondId });
  await page.waitForFunction(() => window.__phase2bMessages.some((message) => message.type === "html_edit_section_navigation_result" && message.requestId === "superseded" && !message.ok && message.reason === "superseded"));
  await page.waitForFunction(() => window.__phase2bMessages.some((message) => message.type === "html_edit_section_navigation_result" && message.requestId === "newer" && message.ok));

  assert.equal(await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.refreshSectionNavigation({
    itemId: 42,
    runtimeSessionId: "phase2b-session",
    generation: 7,
    requestEpoch: 3
  })), true);
  await page.waitForFunction(() => window.__phase2bMessages.some((message) => message.type === "html_edit_section_navigation_ready" && message.requestEpoch === 3));
  assert.equal(await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.refreshSectionNavigation({
    itemId: 42,
    runtimeSessionId: "phase2b-session",
    generation: 7,
    requestEpoch: 2
  })), false, "out-of-order refreshes must not roll the runtime epoch backward");
  assert.equal(await page.evaluate((pageId) => window.__NUTBOOK_HTML_EDIT__.goToSection({
    itemId: 42,
    runtimeSessionId: "phase2b-session",
    generation: 7,
    pageId,
    requestId: "after-stale-refresh",
    requestEpoch: 3
  }), firstId), true, "the current epoch must remain usable after a stale refresh");

  const keyResult = await page.evaluate(() => {
    const space = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    window.dispatchEvent(space);
    const fullscreen = new KeyboardEvent("keydown", { key: "f", bubbles: true, cancelable: true });
    window.dispatchEvent(fullscreen);
    const save = new KeyboardEvent("keydown", { key: "s", metaKey: true, bubbles: true, cancelable: true });
    window.dispatchEvent(save);
    return { space: space.defaultPrevented, fullscreen: fullscreen.defaultPrevented, save: save.defaultPrevented };
  });
  assert.deepEqual(keyResult, { space: false, fullscreen: false, save: true }, "section profile must preserve source navigation keys while retaining editor save");

  const compositionEvidence = await page.evaluate(() => {
    const field = document.querySelector('[data-nutbook-editing="text"]');
    const before = window.__phase2bMessages.filter((message) => message.type === "html_edit_document_changed").length;
    field.focus();
    field.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
    field.textContent += "中文";
    field.dispatchEvent(new InputEvent("input", { data: "中文", inputType: "insertCompositionText", isComposing: true, bubbles: true }));
    const during = window.__phase2bMessages.filter((message) => message.type === "html_edit_document_changed").length;
    field.dispatchEvent(new CompositionEvent("compositionend", { data: "中文" }));
    const after = window.__phase2bMessages.filter((message) => message.type === "html_edit_document_changed").length;
    return { before, during, after };
  });
  assert.equal(compositionEvidence.during, compositionEvidence.before, "plain-text IME composition must not mutate selection/history mid-composition");
  assert.equal(compositionEvidence.after, compositionEvidence.before + 1, "plain-text IME composition must commit once at compositionend");

  // Capture the baseline and detach the adapter in one task. A smooth scroll
  // can otherwise emit between separate Playwright evaluations, which tests
  // scheduling rather than exit cleanup on Linux.
  const changesBeforeExit = await page.evaluate(() => {
    const changes = window.__phase2bMessages.filter((message) => message.type === "html_edit_section_navigation_changed").length;
    window.__NUTBOOK_HTML_EDIT__.exit({ runtimeSessionId: "phase2b-session", discard: true });
    window.scrollTo({ top: 0, behavior: "auto" });
    return changes;
  });
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.sectionNavigationSnapshot()), null);
  assert.equal(await page.evaluate(() => window.__phase2bMessages.filter((message) => message.type === "html_edit_section_navigation_changed").length), changesBeforeExit, "exit must disconnect structure observers and scroll listeners");

  await page.setContent(`<!doctype html><html data-nutbook-structure-profile="vertical-sections-v1"><body>
    <div id="scroller" style="height:300px;overflow-y:auto">
      <section data-nutbook-page-id="one" data-nutbook-page-title="One" data-nutbook-page-kind="section" style="height:420px"><div data-id="one-copy" data-editable="text">One</div></section>
      <section data-nutbook-page-id="two" data-nutbook-page-title="Two" data-nutbook-page-kind="section" style="height:420px"><div data-id="two-copy" data-editable="text">Two</div></section>
    </div>
  </body></html>`);
  await page.evaluate(() => {
    window.__phase2bMessages = [];
    window.__TAURI_INTERNALS__ = { invoke: async (_command, args) => { window.__phase2bMessages.push(args.payload); return true; } };
  });
  await page.addScriptTag({ path: runtimePath });
  await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.enter({ itemId: 9, runtimeSessionId: "element-root", generation: 2, patch: { changes: {} } }));
  assert.equal((await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.sectionNavigationSnapshot())).pages.length, 2, "one direct element scroll root must be supported");

  await page.setContent(`<!doctype html><html data-nutbook-structure-profile="vertical-sections-v1"><head><style>
    html,body{height:100%;overflow-x:hidden} body{margin:0}
    section{height:100vh;scroll-snap-align:start}
  </style></head><body>
    <section data-nutbook-page-id="body-one" data-nutbook-page-title="Body one" data-nutbook-page-kind="scroll-snap"><div data-id="body-copy-1" data-editable="text">One</div></section>
    <section data-nutbook-page-id="body-two" data-nutbook-page-title="Body two" data-nutbook-page-kind="scroll-snap"><div data-id="body-copy-2" data-editable="text">Two</div></section>
  </body></html>`);
  await page.evaluate(() => {
    window.__phase2bMessages = [];
    window.__TAURI_INTERNALS__ = { invoke: async (_command, args) => { window.__phase2bMessages.push(args.payload); return true; } };
  });
  await page.addScriptTag({ path: runtimePath });
  await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.enter({ itemId: 10, runtimeSessionId: "body-root", generation: 1, patch: { changes: {} } }));
  assert.equal(await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.goToSection({
    itemId: 10,
    runtimeSessionId: "body-root",
    generation: 1,
    pageId: "body-two",
    requestId: "body-second",
    requestEpoch: 0
  })), true);
  await page.waitForFunction(() => window.__phase2bMessages.some((message) => message.type === "html_edit_section_navigation_result" && message.requestId === "body-second" && message.ok));
  assert.ok(await page.evaluate(() => document.body.scrollTop > 0), "body scroll roots must move independently from document.scrollingElement");
} finally {
  await browser.close();
}

console.log("HTML edit section navigation runtime checks passed");
