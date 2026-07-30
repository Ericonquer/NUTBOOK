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
  const cropTarget = page.locator('[data-id="free-existing-image"]');
  const beforeCrop = await cropTarget.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, objectFit: getComputedStyle(element).objectFit, transform: getComputedStyle(element).transform };
  });
  await page.locator('.nutbook-html-edit-image-actions button[data-tooltip="裁切显示"]').click();
  await page.waitForTimeout(20);
  const enteredCrop = await page.evaluate(() => {
    const image = document.querySelector('[data-id="free-existing-image"]');
    const viewport = document.querySelector('[data-crop-viewport]')?.getBoundingClientRect();
    const imageEdge = document.querySelector('[data-crop-edge]')?.getBoundingClientRect();
    return { objectFit: getComputedStyle(image).objectFit, objectPosition: getComputedStyle(image).objectPosition, transform: getComputedStyle(image).transform, viewport: { width: viewport?.width, height: viewport?.height }, imageEdge: { left: imageEdge?.left, top: imageEdge?.top, width: imageEdge?.width, height: imageEdge?.height } };
  });
  assert.equal(beforeCrop.objectFit, "cover", "the acceptance image must start as a cover presentation");
  assert.equal(enteredCrop.objectFit, "cover", "entering crop must retain cover instead of replacing it with contain");
  assert.equal(Math.round(enteredCrop.viewport.width), Math.round(beforeCrop.width), "the fixed crop viewport must retain the pre-click image width");
  assert.equal(Math.round(enteredCrop.viewport.height), Math.round(beforeCrop.height), "the fixed crop viewport must retain the pre-click image height");
  assert.ok(enteredCrop.transform === "none" || enteredCrop.transform === "matrix(1, 0, 0, 1, 0, 0)", "the first crop frame must preserve the pre-click image scale and focal point");
  assert.ok(enteredCrop.imageEdge.width > enteredCrop.viewport.width || enteredCrop.imageEdge.height > enteredCrop.viewport.height, "crop handles must follow the cover-rendered source image edge rather than the fixed viewport");
  assert.equal(await page.locator('[data-crop-context-part]').count(), 4, "crop mode must expose the full source image outside the fixed viewport as a reference layer");
  const eastHandle = await page.locator('.nutbook-html-edit-crop-overlay i[data-handle="e"]').boundingBox();
  assert.ok(eastHandle, "the image edge must expose an east resize handle");
  await page.mouse.move(eastHandle.x + eastHandle.width / 2, eastHandle.y + eastHandle.height / 2); await page.mouse.down(); await page.mouse.move(eastHandle.x + 70, eastHandle.y + eastHandle.height / 2); await page.mouse.up();
  const resizedCrop = await page.evaluate(() => { const image = document.querySelector('[data-crop-content]'); return { objectFit: getComputedStyle(image).objectFit, transform: getComputedStyle(image).transform }; });
  assert.notEqual(resizedCrop.transform, enteredCrop.transform, "dragging a crop handle must change the same scale transform that will be persisted");
  assert.equal(resizedCrop.objectFit, "cover", "the preview must use the same cover renderer as the committed image");
  const cropFrame = await cropTarget.boundingBox();
  await page.mouse.move(cropFrame.x + cropFrame.width / 2, cropFrame.y + cropFrame.height / 2); await page.mouse.down(); await page.mouse.move(cropFrame.x + cropFrame.width / 2 - 32, cropFrame.y + cropFrame.height / 2 + 18); await page.mouse.up();
  const pannedCrop = await page.evaluate(() => getComputedStyle(document.querySelector('[data-crop-content]')).objectPosition);
  assert.notEqual(pannedCrop, enteredCrop.objectPosition, "dragging the image must change the preview object-position while its viewport remains fixed");
  const pannedContent = await page.locator('.nutbook-html-edit-source-crop-overlay [data-crop-content]').boundingBox();
  await page.mouse.move(pannedContent.x + pannedContent.width / 2, pannedContent.y + pannedContent.height / 2);
  await page.mouse.down();
  await page.mouse.move(pannedContent.x + pannedContent.width / 2, pannedContent.y + pannedContent.height / 2 + 1000);
  await page.mouse.up();
  const topAlignedCrop = await page.evaluate(() => {
    const viewport = document.querySelector('[data-crop-viewport]').getBoundingClientRect();
    const imageEdge = document.querySelector('[data-crop-edge]').getBoundingClientRect();
    const contextTop = document.querySelector('[data-crop-context-part="top"]');
    const preview = document.querySelector('[data-crop-content]');
    return {
      viewportTop: Math.round(viewport.top),
      imageTop: Math.round(imageEdge.top),
      topContextVisible: getComputedStyle(contextTop).display !== "none",
      objectPosition: preview.style.objectPosition,
      transformOrigin: preview.style.transformOrigin,
    };
  });
  assert.equal(topAlignedCrop.imageTop, topAlignedCrop.viewportTop, "dragging to the top limit must align the source-image top edge exactly with the crop viewport");
  assert.equal(topAlignedCrop.topContextVisible, false, "no detached context strip may remain above a top-aligned source image");
  assert.match(topAlignedCrop.objectPosition, /50% 0%|0%$/, "the top limit must persist as a zero vertical object-position");
  assert.equal(topAlignedCrop.transformOrigin, topAlignedCrop.objectPosition, "preview object-position and zoom origin must describe the same focal point");
  await page.locator('.nutbook-html-edit-crop-toolbar button[data-action="done"]').click();
  const committedCrop = await page.evaluate(() => ({ scale: Number(document.querySelector('[data-id="free-existing-image"]').getAttribute("data-nutbook-crop-scale")), y: Number(document.querySelector('[data-id="free-existing-image"]').getAttribute("data-nutbook-crop-y")), model: document.querySelector('[data-id="free-existing-image"]').getAttribute("data-nutbook-crop-model"), change: window.__NUTBOOK_HTML_EDIT__.collectChanges()["free-existing-image"] }));
  assert.ok(committedCrop.scale > 1000, "completing crop must persist the resized image state");
  assert.equal(committedCrop.model, "v2", "completed crop must persist the cover-based crop model");
  assert.equal(committedCrop.change.leftPermille, committedCrop.scale, "the persisted image patch must carry the resized crop scale");
  assert.equal(committedCrop.y, 0, "a source image aligned to the top edge must keep the valid zero focal coordinate");
  assert.equal(committedCrop.change.widthPermille, 0, "serializing a top-aligned source crop must not replace zero with the center fallback");
  await page.locator('.nutbook-html-edit-image-actions button[data-tooltip="裁切显示"]').click();
  assert.equal(await page.locator('.nutbook-html-edit-source-crop-overlay').count(), 1, "an ordinary image must enter crop mode again after completing a prior crop");
  await page.locator('.nutbook-html-edit-crop-toolbar button[data-action="cancel"]').click();
  // Reproduce an HTML file saved by the early Phase 1E implementation: it
  // has a crop frame and contain transform, but no crop attributes at all.
  await cropTarget.evaluate((element) => {
    for (const name of ["image", "model", "scale", "x", "y"]) element.removeAttribute(`data-nutbook-crop-${name}`);
    element.setAttribute("style", "position:absolute;inset:0;display:block;width:100%;height:100%;max-width:none;margin:0;object-fit:contain;transform-origin:50% 50%;transform:translate(-2.528%,21.053%) scale(1.516)");
  });
  await page.locator('.nutbook-html-edit-image-actions button[data-tooltip="裁切显示"]').click();
  await page.locator('.nutbook-html-edit-crop-toolbar button[data-action="done"]').click();
  assert.equal(await cropTarget.getAttribute("data-nutbook-crop-model"), "v2", "completing attribute-less legacy markup must migrate it to cover-based v2 instead of reviving contain");
  assert.equal(await cropTarget.evaluate((element) => getComputedStyle(element).objectFit), "cover", "legacy contain markup must not return after the crop is completed");
  await page.locator('.nutbook-html-edit-image-actions button[data-tooltip="裁切显示"]').click();
  const zeroZoomContent = await page.locator('.nutbook-html-edit-source-crop-overlay [data-crop-content]').boundingBox();
  await page.mouse.move(zeroZoomContent.x + zeroZoomContent.width / 2, zeroZoomContent.y + zeroZoomContent.height / 2);
  await page.mouse.down();
  await page.mouse.move(zeroZoomContent.x + zeroZoomContent.width / 2, zeroZoomContent.y + zeroZoomContent.height / 2 - 8);
  const firstPanTransform = await page.locator('.nutbook-html-edit-source-crop-overlay [data-crop-content]').evaluate((element) => element.style.transform);
  await page.mouse.move(zeroZoomContent.x + zeroZoomContent.width / 2, zeroZoomContent.y + zeroZoomContent.height / 2 - 24);
  const secondPanTransform = await page.locator('.nutbook-html-edit-source-crop-overlay [data-crop-content]').evaluate((element) => element.style.transform);
  await page.mouse.up();
  await page.locator('.nutbook-html-edit-crop-toolbar button[data-action="done"]').click();
  assert.equal(Number(firstPanTransform.match(/scale\(([\d.]+)\)/)?.[1]), 1, "starting a pan must not implicitly enlarge the source image");
  assert.equal(secondPanTransform, firstPanTransform, "continued panning must not bounce between an implicit zoom and the starting scale");
  assert.equal(Number(await cropTarget.getAttribute("data-nutbook-crop-scale")), 1000, "panning must preserve scale; only crop handles may resize the source image");
  await page.route("http://127.0.0.1:4567/replaced-image.png", (route) => route.fulfill({ path: path.resolve("src-tauri/tests/fixtures/html-edit/editable-image-assets/hero.png") }));
  const ordinaryReplacement = { runtimeSessionId: "phase1d", dataId: "free-existing-image", editableType: "image", relativePath: ".nutbook/html-edit/assets/html-edit-test/cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.png", runtimeUrl: "http://127.0.0.1:4567/replaced-image.png" };
  assert.equal(await page.evaluate((payload) => window.__NUTBOOK_HTML_EDIT__.applyImportedAsset(payload), ordinaryReplacement), true, "replacing an ordinary image must create a history snapshot before later inserted-image operations");
  await page.waitForFunction(() => { const image = document.querySelector('[data-id="free-existing-image"]'); return image?.complete && image.naturalWidth > 0; });
  assert.equal(await cropTarget.getAttribute("src"), ordinaryReplacement.runtimeUrl, "ordinary replacement must update the source image before the inserted-image history scenario");
  const actionPosition = async () => page.evaluate(() => { const image = document.querySelector('[data-id="free-existing-image"]'), action = document.querySelector('.nutbook-html-edit-image-actions'); const imageRect = image.getBoundingClientRect(), actionRect = action.getBoundingClientRect(); return { imageBottom: Math.round(imageRect.bottom), imageLeft: Math.round(imageRect.left), actionTop: Math.round(actionRect.top), actionLeft: Math.round(actionRect.left) }; });
  const actionBeforeScroll = await actionPosition();
  assert.deepEqual({ actionTop: actionBeforeScroll.actionTop, actionLeft: actionBeforeScroll.actionLeft }, { actionTop: actionBeforeScroll.imageBottom + 7, actionLeft: actionBeforeScroll.imageLeft }, "replacement controls must initially anchor to the replaced ordinary image");
  await page.evaluate(() => { const spacer = document.createElement("div"); spacer.style.height = "900px"; document.body.append(spacer); window.scrollTo(0, 120); });
  await page.waitForTimeout(30);
  const actionAfterScroll = await actionPosition();
  assert.deepEqual({ actionTop: actionAfterScroll.actionTop, actionLeft: actionAfterScroll.actionLeft }, { actionTop: actionAfterScroll.imageBottom + 7, actionLeft: actionAfterScroll.imageLeft }, "replacement controls must follow the current image frame while scrolling");
  await page.locator('.nutbook-html-edit-image-actions button[data-tooltip="裁切显示"]').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(30);
  const cropStageAfterScroll = await page.evaluate(() => { const source = document.querySelector('[data-id="free-existing-image"]').getBoundingClientRect(), stage = document.querySelector('[data-crop-viewport]').getBoundingClientRect(); return { sourceTop: Math.round(source.top), sourceLeft: Math.round(source.left), sourceWidth: Math.round(source.width), sourceHeight: Math.round(source.height), stageTop: Math.round(stage.top), stageLeft: Math.round(stage.left), stageWidth: Math.round(stage.width), stageHeight: Math.round(stage.height) }; });
  assert.deepEqual({ top: cropStageAfterScroll.stageTop, left: cropStageAfterScroll.stageLeft, width: cropStageAfterScroll.stageWidth, height: cropStageAfterScroll.stageHeight }, { top: cropStageAfterScroll.sourceTop, left: cropStageAfterScroll.sourceLeft, width: cropStageAfterScroll.sourceWidth, height: cropStageAfterScroll.sourceHeight }, "the source crop preview must relayout over the replaced image after scrolling instead of leaving a second image behind");
  const replacementEastHandle = await page.locator('.nutbook-html-edit-source-crop-overlay i[data-handle="e"]').boundingBox();
  await page.mouse.move(replacementEastHandle.x + replacementEastHandle.width / 2, replacementEastHandle.y + replacementEastHandle.height / 2); await page.mouse.down(); await page.mouse.move(replacementEastHandle.x + 48, replacementEastHandle.y + replacementEastHandle.height / 2); await page.mouse.up();
  await page.locator('.nutbook-html-edit-crop-toolbar button[data-action="done"]').click();
  assert.equal(await cropTarget.getAttribute("data-nutbook-crop-model"), "v2", "completing crop after a replacement must apply the crop to the replaced ordinary image");
  await page.route("http://127.0.0.1:4567/image.png", (route) => route.fulfill({ path: path.resolve("src-tauri/tests/fixtures/html-edit/editable-image-assets/hero.png") }));
  assert.equal(await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.beginInsertedImageDraft()), true, "runtime must enter draw mode");
  await page.mouse.move(250, 380); await page.mouse.down(); await page.mouse.move(500, 560); await page.mouse.up();
  await page.evaluate(() => window.__NUTBOOK_HTML_EDIT__.commitInsertedImageDraft());
  await page.waitForTimeout(50);
  const confirmation = await page.evaluate(() => window.__phase1dMessages.find((entry) => entry?.type === "html_edit_inserted_image_confirmed"));
  assert.ok(confirmation?.insertedImageId?.startsWith("inserted-image-"), "explicit confirmation must request one generated insertion id");
  const applied = await page.evaluate(({ id }) => window.__NUTBOOK_HTML_EDIT__.applyInsertedImageAsset({ runtimeSessionId: "phase1d", insertedImageId: id, assetRequestId: "test", relativePath: ".nutbook/html-edit/assets/html-edit-test/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png", runtimeUrl: "http://127.0.0.1:4567/image.png" }), { id: confirmation.insertedImageId });
  assert.equal(applied, true, "confirmed draft must accept a guarded imported asset");
  const ordinaryBeforeInsertedUndo = await cropTarget.evaluate((element) => { const image = element.getBoundingClientRect(), frame = element.parentElement.getBoundingClientRect(); return { image: { left: image.left, top: image.top, width: image.width, height: image.height }, frame: { width: frame.width, height: frame.height } }; });
  assert.equal(await page.evaluate((id) => window.__NUTBOOK_HTML_EDIT__.deleteInsertedImage(id), confirmation.insertedImageId), true, "an inserted image can be deleted before undo validation");
  await page.keyboard.press("Meta+z");
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", metaKey: true, repeat: true })));
  const restoredInsertedChange = await page.evaluate((id) => window.__NUTBOOK_HTML_EDIT__.collectChanges()[id], confirmation.insertedImageId);
  assert.equal(restoredInsertedChange?.deleted, undefined, "one Cmd+Z press must restore the deleted inserted image");
  const ordinaryAfterInsertedUndo = await cropTarget.evaluate((element) => { const image = element.getBoundingClientRect(), frame = element.parentElement.getBoundingClientRect(); return { image: { left: image.left, top: image.top, width: image.width, height: image.height }, frame: { width: frame.width, height: frame.height } }; });
  assert.deepEqual(ordinaryAfterInsertedUndo, ordinaryBeforeInsertedUndo, "a repeated Cmd+Z keydown after undoing an inserted-image deletion must not cross into the ordinary image crop history");
  assert.equal(await cropTarget.getAttribute("src"), ordinaryReplacement.runtimeUrl, "undoing an inserted-image deletion must not restore the ordinary image's pre-replacement source");
  assert.equal(await cropTarget.getAttribute("data-nutbook-asset-relative-path"), ordinaryReplacement.relativePath, "undo must retain the ordinary image replacement asset identity");
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

  const insertedCropPage = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await insertedCropPage.goto(pathToFileURL(path.resolve("src-tauri/tests/fixtures/html-edit/editable-free-image.html")).href);
  await insertedCropPage.evaluate(() => { document.querySelector('[data-nutbook-inserted-image-layer="1"]')?.remove(); window.__phase1dMessages = []; window.__TAURI_INTERNALS__ = { invoke: async (_command, value) => { window.__phase1dMessages.push(value.payload); return true; } }; });
  await insertedCropPage.route("http://127.0.0.1:4567/image.png", (route) => route.fulfill({ path: path.resolve("src-tauri/tests/fixtures/html-edit/editable-image-assets/hero.png") }));
  await insertedCropPage.addScriptTag({ path: path.resolve("dist/assets/html-edit-runtime.js") });
  await insertedCropPage.evaluate(() => window.__NUTBOOK_HTML_EDIT__.enter({ runtimeSessionId: "inserted-crop", inlineToolbar: false, locale: "zh-CN", patch: { changes: {} }, runtimeAssetUrls: {} }));
  assert.equal(await insertedCropPage.evaluate(() => window.__NUTBOOK_HTML_EDIT__.beginInsertedImageDraft()), true, "isolated inserted-image crop acceptance must enter draw mode");
  await insertedCropPage.mouse.move(250, 280); await insertedCropPage.mouse.down(); await insertedCropPage.mouse.move(560, 500); await insertedCropPage.mouse.up();
  await insertedCropPage.evaluate(() => window.__NUTBOOK_HTML_EDIT__.commitInsertedImageDraft());
  await insertedCropPage.waitForTimeout(20);
  const insertedConfirmation = await insertedCropPage.evaluate(() => window.__phase1dMessages.find((entry) => entry?.type === "html_edit_inserted_image_confirmed"));
  assert.ok(insertedConfirmation?.insertedImageId, "isolated inserted-image crop acceptance must create a real frame");
  assert.equal(await insertedCropPage.evaluate(({ id }) => window.__NUTBOOK_HTML_EDIT__.applyInsertedImageAsset({ runtimeSessionId: "inserted-crop", insertedImageId: id, assetRequestId: "crop-test", relativePath: ".nutbook/html-edit/assets/html-edit-test/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png", runtimeUrl: "http://127.0.0.1:4567/image.png" }), { id: insertedConfirmation.insertedImageId }), true, "isolated inserted-image crop acceptance must import the source image");
  await insertedCropPage.waitForTimeout(50);
  await insertedCropPage.evaluate((id) => window.__NUTBOOK_HTML_EDIT__.beginInsertedImageCrop(id), insertedConfirmation.insertedImageId);
  await insertedCropPage.locator(".nutbook-html-edit-inserted-crop-overlay [data-crop-edge]").waitFor();
  const insertedCropEntry = await insertedCropPage.evaluate(() => {
    const viewport = document.querySelector(".nutbook-html-edit-inserted-crop-overlay [data-crop-viewport]").getBoundingClientRect();
    const edge = document.querySelector(".nutbook-html-edit-inserted-crop-overlay [data-crop-edge]").getBoundingClientRect();
    const contextImages = Array.from(document.querySelectorAll('.nutbook-html-edit-inserted-crop-overlay [data-crop-context-part]')).filter((part) => getComputedStyle(part).display !== "none").map((part) => {
      const image = part.querySelector("img").getBoundingClientRect();
      return { left: image.left, top: image.top, width: image.width, height: image.height };
    });
    return { viewport: { left: viewport.left, top: viewport.top, width: viewport.width, height: viewport.height }, edge: { left: edge.left, top: edge.top, width: edge.width, height: edge.height }, contextImages };
  });
  assert.ok(insertedCropEntry.edge.width > insertedCropEntry.viewport.width || insertedCropEntry.edge.height > insertedCropEntry.viewport.height, "inserted-image crop handles must surround the visible source bitmap rather than the fixed image frame");
  assert.equal(await insertedCropPage.locator(".nutbook-html-edit-inserted-crop-overlay [data-crop-context-part]").count(), 4, "inserted-image crop must render four synchronized outside-frame context regions");
  assert.ok(insertedCropEntry.contextImages.length > 0, "a cover-cropped inserted image must expose its overflow as translucent context");
  for (const image of insertedCropEntry.contextImages) assert.deepEqual({ left: Math.round(image.left), top: Math.round(image.top), width: Math.round(image.width), height: Math.round(image.height) }, { left: Math.round(insertedCropEntry.edge.left), top: Math.round(insertedCropEntry.edge.top), width: Math.round(insertedCropEntry.edge.width), height: Math.round(insertedCropEntry.edge.height) }, "each visible context strip must use the exact same source geometry as the crop handles");
  await insertedCropPage.evaluate(() => window.scrollBy(0, 60));
  await insertedCropPage.waitForTimeout(30);
  const insertedAfterScroll = await insertedCropPage.evaluate(() => {
    const viewport = document.querySelector(".nutbook-html-edit-inserted-crop-overlay [data-crop-viewport]").getBoundingClientRect();
    const edge = document.querySelector(".nutbook-html-edit-inserted-crop-overlay [data-crop-edge]").getBoundingClientRect();
    const contextImage = Array.from(document.querySelectorAll('.nutbook-html-edit-inserted-crop-overlay [data-crop-context-part]')).find((part) => getComputedStyle(part).display !== "none")?.querySelector("img")?.getBoundingClientRect();
    return { viewport: { top: viewport.top }, edge: { left: edge.left, top: edge.top, width: edge.width, height: edge.height }, contextImage: contextImage && { left: contextImage.left, top: contextImage.top, width: contextImage.width, height: contextImage.height } };
  });
  assert.equal(Math.round(insertedAfterScroll.viewport.top), Math.round(insertedCropEntry.viewport.top - 60), "inserted-image crop viewport and overlay must follow document scrolling");
  assert.deepEqual({ left: Math.round(insertedAfterScroll.contextImage.left), top: Math.round(insertedAfterScroll.contextImage.top), width: Math.round(insertedAfterScroll.contextImage.width), height: Math.round(insertedAfterScroll.contextImage.height) }, { left: Math.round(insertedAfterScroll.edge.left), top: Math.round(insertedAfterScroll.edge.top), width: Math.round(insertedAfterScroll.edge.width), height: Math.round(insertedAfterScroll.edge.height) }, "the translucent inserted-image reference must remain aligned after scrolling");
  const insertedEastHandle = await insertedCropPage.locator('.nutbook-html-edit-inserted-crop-overlay i[data-handle="e"]').boundingBox();
  await insertedCropPage.mouse.move(insertedEastHandle.x + insertedEastHandle.width / 2, insertedEastHandle.y + insertedEastHandle.height / 2); await insertedCropPage.mouse.down(); await insertedCropPage.mouse.move(insertedEastHandle.x + 60, insertedEastHandle.y + insertedEastHandle.height / 2); await insertedCropPage.mouse.up();
  const insertedResized = await insertedCropPage.locator(".nutbook-html-edit-inserted-crop-overlay [data-crop-edge]").boundingBox();
  assert.ok(insertedResized.width > insertedCropEntry.edge.width, "dragging an inserted-image edge handle outward must enlarge the source image and its handle frame together");
  const insertedViewport = await insertedCropPage.locator(".nutbook-html-edit-inserted-crop-overlay [data-crop-viewport]").boundingBox();
  await insertedCropPage.mouse.move(insertedViewport.x + insertedViewport.width / 2, insertedViewport.y + insertedViewport.height / 2); await insertedCropPage.mouse.down(); await insertedCropPage.mouse.move(insertedViewport.x + insertedViewport.width / 2 - 24, insertedViewport.y + insertedViewport.height / 2 + 12); await insertedCropPage.mouse.up();
  const insertedPanned = await insertedCropPage.evaluate(() => {
    const edge = document.querySelector(".nutbook-html-edit-inserted-crop-overlay [data-crop-edge]").getBoundingClientRect();
    const contextImage = Array.from(document.querySelectorAll('.nutbook-html-edit-inserted-crop-overlay [data-crop-context-part]')).find((part) => getComputedStyle(part).display !== "none")?.querySelector("img")?.getBoundingClientRect();
    return { edge: { left: edge.left, top: edge.top, width: edge.width, height: edge.height }, contextImage: contextImage && { left: contextImage.left, top: contextImage.top, width: contextImage.width, height: contextImage.height } };
  });
  assert.notEqual(Math.round(insertedPanned.edge.left), Math.round(insertedResized.x), "dragging inside an inserted-image frame must pan the source instead of moving the fixed viewport");
  assert.deepEqual({ left: Math.round(insertedPanned.contextImage.left), top: Math.round(insertedPanned.contextImage.top), width: Math.round(insertedPanned.contextImage.width), height: Math.round(insertedPanned.contextImage.height) }, { left: Math.round(insertedPanned.edge.left), top: Math.round(insertedPanned.edge.top), width: Math.round(insertedPanned.edge.width), height: Math.round(insertedPanned.edge.height) }, "the translucent inserted-image reference must remain aligned after panning");
  await insertedCropPage.locator('.nutbook-html-edit-inserted-crop-overlay .nutbook-html-edit-crop-toolbar button[data-action="done"]').click();
  await insertedCropPage.close();

  const replacementUndoPage = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await replacementUndoPage.goto(pathToFileURL(path.resolve("src-tauri/tests/fixtures/html-edit/editable-free-image.html")).href);
  await replacementUndoPage.evaluate(() => {
    document.querySelector('[data-nutbook-inserted-image-layer="1"]')?.remove();
    const image = document.querySelector('[data-id="free-existing-image"]');
    const frame = document.createElement("span");
    frame.setAttribute("data-nutbook-crop-frame", "1");
    frame.style.cssText = "display:block;position:relative;overflow:hidden;box-sizing:border-box;vertical-align:top;width:758px;height:230px";
    image.before(frame); frame.append(image);
    image.setAttribute("data-nutbook-crop-image", "1"); image.setAttribute("data-nutbook-crop-model", "v2"); image.setAttribute("data-nutbook-crop-scale", "1400"); image.setAttribute("data-nutbook-crop-x", "250"); image.setAttribute("data-nutbook-crop-y", "750");
    image.style.cssText = "position:absolute!important;inset:0!important;display:block!important;box-sizing:border-box!important;width:100%!important;height:100%!important;max-width:none!important;margin:0!important;object-fit:cover!important;object-position:25% 75%!important;transform-origin:25% 75%!important;transform:scale(1.4)!important";
    window.__phase1dMessages = []; window.__TAURI_INTERNALS__ = { invoke: async (_command, value) => { window.__phase1dMessages.push(value.payload); return true; } };
  });
  await replacementUndoPage.route("http://127.0.0.1:4567/history-replacement.png", (route) => route.fulfill({ path: path.resolve("src-tauri/tests/fixtures/html-edit/editable-image-assets/hero.png") }));
  await replacementUndoPage.addScriptTag({ path: path.resolve("dist/assets/html-edit-runtime.js") });
  await replacementUndoPage.evaluate(() => window.__NUTBOOK_HTML_EDIT__.enter({ runtimeSessionId: "replacement-undo", inlineToolbar: false, locale: "zh-CN", patch: { changes: {} }, runtimeAssetUrls: {} }));
  const savedCropGeometry = await replacementUndoPage.evaluate(() => {
    const image = document.querySelector('[data-id="free-existing-image"]'), frame = image.parentElement, rect = frame.getBoundingClientRect();
    return { width: Math.round(rect.width), height: Math.round(rect.height), overflow: getComputedStyle(frame).overflow, marker: frame.getAttribute("data-nutbook-crop-frame") };
  });
  const historyReplacement = { runtimeSessionId: "replacement-undo", dataId: "free-existing-image", editableType: "image", relativePath: ".nutbook/html-edit/assets/html-edit-test/dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd.png", runtimeUrl: "http://127.0.0.1:4567/history-replacement.png" };
  assert.equal(await replacementUndoPage.evaluate((payload) => window.__NUTBOOK_HTML_EDIT__.applyImportedAsset(payload), historyReplacement), true, "freshly reopened saved crop must accept a replacement");
  await replacementUndoPage.waitForFunction((runtimeUrl) => document.querySelector('[data-id="free-existing-image"]')?.getAttribute("src") === runtimeUrl, historyReplacement.runtimeUrl);
  assert.equal(await replacementUndoPage.evaluate(() => window.__NUTBOOK_HTML_EDIT__.undoHistory()), true, "freshly reopened saved crop must undo its replacement");
  const restoredCropGeometry = await replacementUndoPage.evaluate(() => {
    const image = document.querySelector('[data-id="free-existing-image"]'), frame = image.parentElement, rect = frame.getBoundingClientRect(), outside = document.elementFromPoint(Math.min(innerWidth - 1, rect.right + 8), rect.top + rect.height / 2);
    return { width: Math.round(rect.width), height: Math.round(rect.height), overflow: getComputedStyle(frame).overflow, marker: frame.getAttribute("data-nutbook-crop-frame"), imageEscapesClip: outside === image };
  });
  assert.deepEqual({ width: restoredCropGeometry.width, height: restoredCropGeometry.height, overflow: restoredCropGeometry.overflow, marker: restoredCropGeometry.marker }, savedCropGeometry, "undoing replacement after reopen must restore the persisted crop frame dimensions and clipping");
  assert.equal(restoredCropGeometry.imageEscapesClip, false, "the restored transformed image must not receive pointer hits outside its crop frame");
  await replacementUndoPage.close();
} finally {
  await browser.close();
}

console.log("HTML free-image runtime browser checks passed");
