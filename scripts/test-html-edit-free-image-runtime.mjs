import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const messages = [];
  await page.goto(pathToFileURL(path.resolve("src-tauri/tests/fixtures/html-edit/editable-free-image.html")).href);
  await page.evaluate(() => { window.__phase1dMessages = []; window.__TAURI_INTERNALS__ = { invoke: async (_command, value) => { window.__phase1dMessages.push(value.payload); return true; } }; });
  await page.addScriptTag({ path: path.resolve("dist/assets/html-edit-runtime.js") });
  await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.enter({ runtimeSessionId: "phase1d", inlineToolbar: true, locale: "zh-CN", patch: { changes: {} }, runtimeAssetUrls: {} }));
  await page.locator('[data-id="free-title"]').click();
  await page.waitForTimeout(20);
  assert.equal((await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.getSnapshot())).formatState.canFormat, true, "placing a caret in rich text must enable its toolbar commands without requiring a selection");
  assert.equal(await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.applyFormat({ runtimeSessionId: "phase1d", command: "bold" })), true, "bold must become a usable typing state at a collapsed rich-text caret");
  await page.keyboard.type("X");
  assert.match(await page.locator('[data-id="free-title"]').innerHTML(), /<strong>X<\/strong>/, "typing after a collapsed-caret bold command must preserve the chosen format");
  await page.locator('[data-id="free-kicker"]').click();
  await page.waitForTimeout(20);
  const plainTextSnapshot = await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.getSnapshot());
  assert.equal(plainTextSnapshot.formatState.canFormat, false, "pure text must remain explicitly non-formatable instead of exposing inert format commands");
  assert.equal(await page.locator('[data-id="free-kicker"]').getAttribute("data-nutbook-plain-text-hint"), "纯文本：不支持格式", "focused pure text must expose the compact object-bound format limitation label");
  assert.match(await page.locator('[data-id="free-kicker"]').evaluate((element) => getComputedStyle(element, "::after").content), /纯文本：不支持格式/, "the pure-text hint must render from the focused field edge rather than inside the toolbar");
  assert.equal(await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.beginInsertedImageDraft()), true, "runtime must enter draw mode");
  await page.mouse.move(250, 380); await page.mouse.down(); await page.mouse.move(500, 560); await page.mouse.up();
  await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.commitInsertedImageDraft());
  await page.waitForTimeout(50);
  const confirmation = await page.evaluate(() => window.__phase1dMessages.find((entry) => entry?.type === "html_edit_inserted_image_confirmed"));
  assert.ok(confirmation?.insertedImageId?.startsWith("inserted-image-"), "explicit confirmation must request one generated insertion id");
  const applied = await page.evaluate(({ id }) => window.__NUTBOOK_HTML_EDIT__.applyInsertedImageAsset({ runtimeSessionId: "phase1d", insertedImageId: id, assetRequestId: "test", relativePath: ".nutbook/html-edit/assets/html-edit-test/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png", runtimeUrl: "http://127.0.0.1:4567/image.png" }), { id: confirmation.insertedImageId });
  assert.equal(applied, true, "confirmed draft must accept a guarded imported asset");
  const changes = await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.collectChanges());
  assert.equal(changes[confirmation.insertedImageId].type, "inserted-image");
  assert.ok(changes[confirmation.insertedImageId].widthPermille > 0 && changes[confirmation.insertedImageId].heightPermille > 0, "persisted geometry must be non-zero permille");
  const markSaved = await page.evaluate(() => {
    const normalize = (value) => Array.isArray(value) ? value.map(normalize) : (!value || typeof value !== "object") ? value : Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalize(value[key])]));
    return window.__NUTBOOK_HTML_EDIT__.markSaved({ runtimeSessionId: "phase1d", expectedChangesJson: JSON.stringify(normalize(window.__NUTBOOK_HTML_EDIT__.collectChanges())) });
  });
  assert.equal(markSaved, true, "saving an inserted image must rebase the runtime baseline");
  const savedSnapshot = await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.getSnapshot());
  assert.equal(savedSnapshot.dirty, false, "a successfully saved inserted image must no longer request another save");
  await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.exit({ runtimeSessionId: "phase1d", discard: true }));
  assert.equal(await page.locator("#nutbook-html-edit-inserted-image-layer").count(), 0, "discard must remove the runtime-only insertion layer");
  const savedChange = changes[confirmation.insertedImageId];
  await page.evaluate(({ id, change }) => window.__NUTBOOK_HTML_EDIT__.enter({ runtimeSessionId: "phase1d-reopen", inlineToolbar: false, locale: "zh-CN", patch: { changes: { [id]: change } }, runtimeAssetUrls: { [change.src]: "http://127.0.0.1:4567/image.png" } }), { id: confirmation.insertedImageId, change: savedChange });
  assert.equal(await page.evaluate((id) => window.__NUTBOOK_HTML_EDIT__.requestInsertedImageReplacement(id), confirmation.insertedImageId), undefined, "replacement intent should be accepted for a persisted inserted image");
  const replacementIntent = await page.evaluate(() => window.__phase1dMessages.filter((entry) => entry?.type === "html_edit_inserted_image_replace_requested").at(-1));
  assert.equal(replacementIntent?.insertedImageId, confirmation.insertedImageId, "replacement must identify the selected inserted frame");
  const replacementApplied = await page.evaluate(({ id }) => window.__NUTBOOK_HTML_EDIT__.applyInsertedImageAsset({ runtimeSessionId: "phase1d-reopen", insertedImageId: id, assetRequestId: "replacement", relativePath: ".nutbook/html-edit/assets/html-edit-test/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png", runtimeUrl: "http://127.0.0.1:4567/replacement.png" }), { id: confirmation.insertedImageId });
  assert.equal(replacementApplied, true, "a persisted inserted image must accept its guarded replacement asset");
  const replaced = await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.collectChanges());
  assert.match(replaced[confirmation.insertedImageId].src, /b{64}\.png$/, "replacement must update the persisted relative asset path");
  assert.equal(replaced[confirmation.insertedImageId].leftPermille, savedChange.leftPermille, "replacement must retain a reopened frame's horizontal geometry");
  assert.equal(replaced[confirmation.insertedImageId].topPermille, savedChange.topPermille, "replacement must retain a reopened frame's vertical geometry");
  await page.mouse.move(300, 450); await page.mouse.down(); await page.mouse.move(340, 470); await page.mouse.up();
  const moved = await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.collectChanges());
  assert.notEqual(moved[confirmation.insertedImageId].leftPermille, savedChange.leftPermille, "reopened permille-only frames must materialize before moving");
  assert.equal(await page.evaluate((id) => window.__NUTBOOK_HTML_EDIT__.deleteInsertedImage(id), confirmation.insertedImageId), true, "a persisted inserted image must be deletable");
  const deletion = await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.collectChanges());
  assert.deepEqual(deletion[confirmation.insertedImageId], { type: "inserted-image", selector: `[data-nutbook-inserted-image-id="${confirmation.insertedImageId}"]`, insertedImageId: confirmation.insertedImageId, deleted: true }, "deleting a persisted frame must produce a saveable tombstone");
  await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.exit({ runtimeSessionId: "phase1d-reopen", discard: true }));

  const indexHtml = fs.readFileSync("dist/index.html", "utf8");
  const readonlyFactory = indexHtml.match(/function htmlEditReadonlyPatchScript\(patch, runtimeAssetUrls, surfaceToken\) \{([\s\S]*?)\n      \}\n\n      function enqueueHtmlEditReadonlyPatchSurfaceLane/);
  assert.ok(readonlyFactory, "readonly patch factory must be present");
  await page.evaluate((source) => {
    window.__phase1dReadonlyPatch = Function(`${source}\nreturn htmlEditReadonlyPatchScript;`)();
  }, `function htmlEditReadonlyPatchScript(patch, runtimeAssetUrls, surfaceToken) {${readonlyFactory[1]}\n}`);
  await page.evaluate(({ id, change }) => {
    const script = window.__phase1dReadonlyPatch({ changes: { [id]: change } }, { [change.src]: "http://127.0.0.1:4567/image.png" }, 1);
    Function(script)();
  }, { id: confirmation.insertedImageId, change: savedChange });
  await page.waitForTimeout(20);
  const beforeLayoutSettles = await page.evaluate((id) => window.__NUTBOOK_INSERTED_IMAGE_READONLY__.frames[id].node.style.top, confirmation.insertedImageId);
  await page.evaluate(() => { const spacer = document.createElement("div"); spacer.style.height = "600px"; document.body.append(spacer); });
  await page.waitForTimeout(320);
  const afterLayoutSettles = await page.evaluate((id) => window.__NUTBOOK_INSERTED_IMAGE_READONLY__.frames[id].node.style.top, confirmation.insertedImageId);
  assert.notEqual(afterLayoutSettles, beforeLayoutSettles, "readonly inserted images must relayout after late page layout without requiring a scroll");
  const beforeScroll = afterLayoutSettles;
  await page.evaluate(() => window.scrollTo(0, 160));
  await page.waitForTimeout(20);
  const afterScroll = await page.evaluate((id) => window.__NUTBOOK_INSERTED_IMAGE_READONLY__.frames[id].node.style.top, confirmation.insertedImageId);
  assert.notEqual(afterScroll, beforeScroll, "readonly inserted images must move with document scrolling instead of floating in the viewport");
  await page.evaluate(({ id, change }) => window.__NUTBOOK_HTML_EDIT__.enter({ runtimeSessionId: "phase1d-no-duplicate", inlineToolbar: false, locale: "zh-CN", patch: { changes: { [id]: change } }, runtimeAssetUrls: { [change.src]: "http://127.0.0.1:4567/image.png" } }), { id: confirmation.insertedImageId, change: savedChange });
  assert.equal(await page.evaluate(() => window.__NUTBOOK_INSERTED_IMAGE_READONLY__), undefined, "entering edit mode must remove the readonly image layer before mounting editable frames");
  await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.exit({ runtimeSessionId: "phase1d-no-duplicate", discard: true }));
} finally {
  await browser.close();
}

console.log("HTML free-image runtime browser checks passed");
