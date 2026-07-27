import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";

const indexHtml = readFileSync("dist/index.html", "utf8");
const i18n = readFileSync("dist/i18n.js", "utf8");
const htmlEditLeaveConfirm = readFileSync("dist/html-edit-leave-confirm.html", "utf8");
const htmlEditToolbar = readFileSync("dist/html-edit-toolbar.html", "utf8");
const runtimeOverlay = readFileSync("dist/runtime-overlay.html", "utf8");
const markdownEditor = readFileSync("src/markdown-editor.js", "utf8");
const htmlEditRuntime = readFileSync("dist/assets/html-edit-runtime.js", "utf8");
const richTextFixture = readFileSync("src-tauri/tests/fixtures/html-edit/editable-rich-text.html", "utf8");
const htmlRuntimeRust = readFileSync("src-tauri/src/core/html_runtime.rs", "utf8");
const previewCommandsRust = readFileSync("src-tauri/src/commands/preview.rs", "utf8");
const mainRust = readFileSync("src-tauri/src/main.rs", "utf8");

assert.match(indexHtml, /attach_html_presentation_preview_command[\s\S]*?runtimeSessionId[\s\S]*?activePageId/, "presentation editing must attach a dedicated read-only preview child with the current session lease and page");
assert.match(indexHtml, /html_edit_presentation_preview_clicked[\s\S]*?selectHtmlEditPresentationPage/, "preview-card clicks must navigate through the established editor coordinator");
assert.match(indexHtml, /set_html_presentation_preview_visibility_command[\s\S]*?visible: false/, "leaving or hiding a runtime must hide the presentation preview child");
assert.match(indexHtml, /previewBoundsKey === key[\s\S]*?set_html_presentation_preview_visibility_command[\s\S]*?visible: true/, "restoring unchanged runtime bounds must re-show a suspended presentation preview child");
assert.match(indexHtml, /suspendRuntimeSurfaces[\s\S]*?preservePresentationPreview: true/, "minimising must preserve the read-only presentation preview child instead of hiding it");
assert.match(indexHtml, /resumeRuntimeSurfaces[\s\S]*?delete editSession\.presentation\.previewBoundsKey/, "restoring must force a preview child bounds update and ready handshake");
assert.match(indexHtml, /toggleActiveHtmlRuntimePresentationMode[\s\S]*?编辑模式下不可进入演示全屏/, "presentation fullscreen must be blocked while an HTML edit session is active");
assert.match(indexHtml, /html_edit_presentation_page_changed[\s\S]*?pendingPageId[\s\S]*?data\.pageId !== pendingPageId/, "late presentation page events must not overwrite a newer navigation intent");
assert.match(indexHtml, /html_edit_presentation_preview_ready[\s\S]*?follow: false, focus: true/, "entering or restoring an edit session must focus the ready presentation rail without forcing it to scroll");
assert.match(indexHtml, /action === "edit"[\s\S]*?confirmHtmlEditLeaveIfNeeded/, "the runtime overlay edit action must become a safe exit path while editing");
assert.match(htmlRuntimeRust, /html-presentation-preview-\{item_id\}/, "presentation previews must use a stable child-WebView label");
assert.match(htmlRuntimeRust, /isEditing: \{\}/, "runtime control overlay state must carry the HTML edit-mode guard");
assert.match(i18n, /htmlEdit:[\s\S]*?exit: "退出编辑"/, "HTML editing must expose a localized explicit exit action");
assert.match(htmlRuntimeRust, /nb-preview-canvas[\s\S]*?cloneNode\(true\)[\s\S]*?scale/, "presentation previews must render a scaled DOM clone rather than wait for a screenshot");
assert.match(htmlRuntimeRust, /\.nb-preview-stage\{[^}]*display:block[^}]*height:104px!important/, "preview stages must use an explicit height so host-WebView button layout cannot collapse the scaled canvas");
assert.match(htmlRuntimeRust, /nb-preview-meta[\s\S]*?pageMeta\.title/, "visual preview cards must retain page number, title, and kind metadata");
assert.match(htmlRuntimeRust, /nb-preview-canvas\.deck[\s\S]*?data-nutbook-page-id/, "preview clones must restore deck positioning without overriding source slide alignment");
assert.match(htmlRuntimeRust, /\.nb-preview-card\{[^}]*text-align:initial/, "preview-card button defaults must not center inherited deck text");
assert.match(htmlRuntimeRust, /padding:58px 76px 62px!important/, "a narrow preview child must restore desktop slide padding");
assert.match(htmlRuntimeRust, /keepCardVisible[\s\S]*?root\.scrollTop/, "a preview child must keep keyboard-navigated cards visible without browser focus scrolling");
assert.match(htmlRuntimeRust, /manualScrollUntil[\s\S]*?wheel/, "manual rail scrolling must temporarily suppress automatic active-card following");
assert.match(htmlRuntimeRust, /select = \(id, follow = false\)[\s\S]*?if \(follow\) keepCardVisible/, "only an explicit navigation intent may auto-follow the active preview card");
assert.match(htmlRuntimeRust, /Array\.from\(document\.body\.children\)[\s\S]*?display", "none"/, "preview boot must isolate exported deck controls outside the deck shell");
assert.match(htmlRuntimeRust, /document\.addEventListener\("keydown"[\s\S]*?ArrowDown[\s\S]*?html_edit_presentation_preview_navigate/, "a focused preview rail must relay vertical navigation without taking over presentation shortcuts");

function runtimeSection(name, nextName) {
  const start = htmlEditRuntime.indexOf(`  function ${name}`);
  const end = htmlEditRuntime.indexOf(`  function ${nextName}`, start + 1);
  assert.ok(start >= 0 && end > start, `${name} must be followed by ${nextName}`);
  return htmlEditRuntime.slice(start, end);
}

for (const marker of [
  "editableImageElements", "editableBackgroundImageElements", "pictureSources", "originalSrcsetHash",
  "applyPictureSources", "html_edit_asset_replace_requested", "html_edit_patch_field_result",
  "applyImportedAsset", "runtimeAssetUrls", "data-nutbook-asset-relative-path", "originalSrcHash", "sha256HexUtf8"
]) {
  assert.match(htmlEditRuntime, new RegExp(marker), `HTML image runtime must include ${marker}`);
}
const imageRequest = runtimeSection("requestImageReplacement", "imageActionIcon");
assert.match(imageRequest, /targetState/, "image replace requests must report target state");
assert.doesNotMatch(imageRequest, /currentSrc|FileReader/, "image replace requests must not leak URLs or read files");
const importedAsset = runtimeSection("applyImportedAsset", "canApplyPictureSources");
assert.doesNotMatch(importedAsset, /FileReader|clientX|clientY/, "imported assets must not use FileReader or free-coordinate insertion");
const runtimeSha256 = htmlEditRuntime.match(/async function sha256HexUtf8\(value\) \{([^\n]+)\}/);
assert.ok(runtimeSha256, "runtime must define a Web Crypto SHA-256 function");
const sha256HexUtf8 = new Function("crypto", "TextEncoder", `return async function sha256HexUtf8(value) {${runtimeSha256[1]}};`)(webcrypto, TextEncoder);
assert.equal(await sha256HexUtf8(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
assert.equal(await sha256HexUtf8("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
assert.match(htmlEditRuntime, /source\.getAttribute\("srcset"\)[\s\S]*?originalSrcsetHash: await sha256HexUtf8\(srcset\)/, "picture source hashes must use the raw HTML attribute, not a browser-resolved runtime URL");
assert.doesNotMatch(htmlEditRuntime, /originalSrcsetHash: await sha256HexUtf8\(source\.srcset\)/, "picture source hashes must survive a changed local-server origin");
assert.match(
  htmlEditRuntime,
  /function constrainImportedImageLayout\(element\) \{[\s\S]*?max-width[\s\S]*?object-fit/,
  "imported images must receive a runtime layout guard before their source is replaced"
);
assert.match(
  htmlEditRuntime,
  /function imageSlotHeight\(element\) \{[\s\S]*?Math\.min\(320, Math\.max\(120,/,
  "an empty image slot must retain a bounded display height rather than grow to the image's natural size"
);
assert.match(
  htmlEditRuntime,
  /function restoreImageBaseline\(element, baseline\) \{[\s\S]*?if \(baseline\.currentSrc\) element\.setAttribute\("src", baseline\.currentSrc\); else element\.removeAttribute\("src"\)/,
  "discarding an imported empty slot must restore its original missing src attribute"
);
assert.match(
  htmlEditRuntime,
  /function onImageEditClick\(event\) \{[\s\S]*?event\.target !== event\.currentTarget[\s\S]*?return/,
  "clicking or focusing a text field inside an editable background image must not reopen the image picker"
);
assert.match(
  htmlEditRuntime,
  /const pictureSources = baseline\.pictureSources\.map\([\s\S]*?if \(sourceChanged && pictureSources\.length\) change\.pictureSources = pictureSources;/,
  "ordinary images must omit pictureSources instead of persisting an invalid empty responsive-source set"
);
assert.match(
  htmlEditRuntime,
  /data-nutbook-plain-text-hint[\s\S]*?纯文本：不支持格式[\s\S]*?\[data-nutbook-editing="text"\]:focus::after/,
  "focusing a pure-text field must show an object-bound formatting limitation label instead of widening the toolbar"
);
assert.match(indexHtml, /assetRequestId[\s\S]*?assetRequestEpoch[\s\S]*?activeAssetRequestId/, "asset imports must retain request identity and epoch");
assert.match(indexHtml, /session\.assetRequestEpoch \+= 1[\s\S]*?invalidate_html_edit_session_lease/, "leaving a tab must invalidate pending image results before the lease");
assert.match(indexHtml, /open_html_edit_image_file_dialog[\s\S]*?import_html_edit_asset[\s\S]*?applyImportedAsset/, "host must pick, import, then apply an asset through the runtime");
for (const code of ["ASSET_INVALID_TYPE", "ASSET_TOO_LARGE", "INVALID_SESSION"]) {
  assert.match(indexHtml, new RegExp(code), `host must map ${code} to a recoverable image-import message`);
}
assert.match(indexHtml, /html_edit_patch_field_result[\s\S]*?picture_source_mismatch/, "host must surface a field-level picture source mismatch");
assert.match(indexHtml, /function htmlEditReadonlyPatchScript\(patch, runtimeAssetUrls, surfaceToken\)[\s\S]*?change\.type === 'image'[\s\S]*?runtimeAssetUrls\[change\.src\]/, "readonly replay must use only runtime URL mappings for image patches");
for (const marker of ["beginInsertedImageDraft", "commitInsertedImageDraft", "cancelInsertedImageDraft", "requestInsertedImageReplacement", "deleteInsertedImage", "deletedInsertedImageIds", "clampFrameToCanvas", "serializeFramePermille", "applyInsertedImageAsset", "insertedImageBaseline"]) {
  assert.match(htmlEditRuntime, new RegExp(marker), `Phase 1D runtime must include ${marker}`);
}
assert.match(htmlEditRuntime, /data-intent="insert-image-frame"/, "HTML toolbar must expose an insert-frame action in the runtime WebView");
assert.match(htmlEditRuntime, /document\.documentElement\.append\(host\)[\s\S]*?attachShadow\(\{ mode: "closed" \}\)/, "inserted frames must use a root-level closed shadow host");
assert.match(htmlEditRuntime, /html_edit_inserted_image_confirmed/, "picker must start only after explicit frame confirmation");
assert.match(htmlEditRuntime, /html_edit_inserted_image_replace_requested/, "inserted images must use a separate replace intent");
assert.match(htmlEditRuntime, /const materialized = current\.leftPermille != null \? \{ \.\.\.current, \.\.\.insertedFrameFromPermille\(current\) \} : current;[\s\S]*?serializeFramePermille\(materialized\)/, "replacing a reopened inserted image must retain its permille geometry");
assert.match(htmlEditRuntime, /STATE\.insertedImages\.size === 1\) selectInsertedImage\(STATE\.insertedImages\.keys\(\)\.next\(\)\.value\)/, "a single reopened inserted image must be selected for immediate handle access");
assert.match(indexHtml, /html_edit_inserted_image_confirmed[\s\S]*?open_html_edit_image_file_dialog[\s\S]*?applyInsertedImageAsset/, "host must pick, import, and apply confirmed frames");
assert.match(indexHtml, /html_edit_inserted_image_replace_requested/, "host must handle inserted-image replacement");
assert.match(indexHtml, /change\?\.type === "inserted-image" && change\.deleted === true[\s\S]*?delete merged\[fieldId\]/, "saving a deleted inserted image must remove it from the sidecar patch");
assert.match(indexHtml, /function layoutInsertedImages\(holder\)[\s\S]*?scroll\.scrollTop \|\| window\.scrollY[\s\S]*?document\.addEventListener\('scroll', holder\.layout, true\)/, "readonly inserted images must relayout from the actual scroll root after every document scroll");
assert.match(indexHtml, /holder\.scheduleLayout = function \(\) \{[\s\S]*?setTimeout\(holder\.layout, 260\)[\s\S]*?new ResizeObserver\(holder\.scheduleLayout\)[\s\S]*?image\.onload = holder\.scheduleLayout/, "readonly inserted images must settle after late page and image layout without requiring a scroll");
assert.match(htmlEditRuntime, /window\.__NUTBOOK_INSERTED_IMAGE_READONLY__\?\.dispose\?\.\(\)/, "entering edit mode must dispose the readonly inserted-image layer");
assert.match(indexHtml, /holder\.dispose = function \(\) \{[\s\S]*?document\.removeEventListener\('scroll', holder\.layout, true\)[\s\S]*?delete window\.__NUTBOOK_INSERTED_IMAGE_READONLY__/, "readonly inserted-image disposal must remove its scroll listener and layer");
assert.match(htmlEditRuntime, /document\.addEventListener\("scroll", STATE\.insertedImageScrollHandler, true\)/, "editing inserted images must relayout for document-level scrolling");
assert.match(htmlEditRuntime, /zIndex: "2147483645"[\s\S]*?\.bar\{position:fixed;z-index:2147483647/, "the editing toolbar must remain above the inserted-image canvas while scrolling");

assert.match(
  htmlEditRuntime,
  /function mountInlineToolbar\(/,
  "rich-text formatting must mount inside the runtime document"
);
assert.match(
  htmlEditRuntime,
  /attachShadow\(\{ mode: "closed" \}\)/,
  "the runtime toolbar must isolate its UI from the artifact page"
);
assert.match(
  htmlEditRuntime,
  /function toggleInlineMark\(field, range, tagName\)/,
  "bold and italic must use deterministic inline marks instead of browser editing commands"
);
assert.match(
  htmlEditRuntime,
  /function rangeExactlySelectsMark\(range, mark\)/,
  "repeating an inline format command must be able to recognize its exact mark selection"
);
assert.match(
  htmlEditRuntime,
  /function rangeSelectsEntireMarkText\(range, mark\)/,
  "repeating an inline format command must also recognize a text-node range covering a mark"
);
assert.match(
  htmlEditRuntime,
  /function unwrapInlineMark\(mark\)/,
  "repeating an inline format command must remove the existing mark instead of nesting it"
);
assert.match(
  htmlEditRuntime,
  /function replaceSelectedBlocks\(field, range, tagName\)/,
  "content formatting must replace only selected top-level text blocks"
);
assert.match(
  htmlEditRuntime,
  /function toggleList\(field, range, tagName\)/,
  "content formatting must transform only supported paragraph runs into lists"
);
const inlineFormat = htmlEditRuntime.match(/function applyInlineFormat\(command\) \{([\s\S]*?)\n  \}/);
assert.ok(inlineFormat, "the inline toolbar must own its format command path");
assert.doesNotMatch(
  inlineFormat[1],
  /document\.execCommand/,
  "the inline toolbar command path must not use browser editing commands"
);
assert.match(
  htmlEditRuntime,
  /function buildInlineToolbar\(\)/,
  "the inline toolbar must build a persistent command surface"
);
assert.doesNotMatch(
  htmlEditRuntime,
  /function onSelectionChange\(\) \{[^}]*renderInlineToolbar\(\)/,
  "selection changes must not recreate the toolbar and invalidate its command target"
);
assert.match(
  htmlEditRuntime,
  /function syncInlineToolbar\(\)[\s\S]*?button\.hidden = false; button\.disabled = !commands\.has\(button\.dataset\.command\) \|\| !canFormat/,
  "selection changes must update existing command availability without recreating the toolbar"
);
assert.match(
  htmlEditRuntime,
  /if \(directLists\.length === 1 && selected\.length === 1\) \{[\s\S]*?list\.tagName === tagName\.toUpperCase\(\)[\s\S]*?document\.createElement\(tagName\)/,
  "a selected list must toggle off when unchanged and switch directly when another list type is requested"
);
assert.match(
  htmlEditRuntime,
  /function inlineCommandsForRole\(role\)/,
  "short and content fields must have explicit, distinct command sets"
);
assert.match(
  htmlEditRuntime,
  /button\.hidden = false; button\.disabled = !commands\.has\(button\.dataset\.command\) \|\| !canFormat;/,
  "the HTML toolbar must retain every format command and disable only commands unsupported by the current object"
);
assert.match(
  htmlEditRuntime,
  /\.bar button\[disabled\] \.tooltip\{display:none\}/,
  "disabled format commands must retain the existing no-tooltip behavior"
);
assert.match(
  htmlEditRuntime,
  /function inlineToolbarText\(key\)/,
  "the inline toolbar must localize its own labels inside the runtime document"
);
assert.match(
  htmlEditRuntime,
  /function inlineToolbarIcon\(command\)/,
  "the inline toolbar must use the established SVG command icon set"
);
assert.match(
  htmlEditRuntime,
  /M6 4h4\.3c2 0 3\.2 1 3\.2 2\.6/,
  "the inline bold icon must match the Markdown floating toolbar"
);
assert.match(
  htmlEditRuntime,
  /M4 4\.5h12M4 8h8\.5M4 11\.5h12M4 15h8\.5/,
  "the inline alignment icons must match the Markdown editor icon family"
);
assert.match(
  htmlEditRuntime,
  /paragraph: '<svg[^>]*><path d="M5 15V5h5\.2a3\.1 3\.1 0 0 1 0 6H5"/,
  "the paragraph icon must use the same compact stroke language as heading icons"
);
assert.match(
  htmlEditRuntime,
  /class="tooltip"/,
  "each HTML edit toolbar command must expose a visible hover and keyboard-focus tooltip"
);
assert.match(
  htmlEditRuntime,
  /transition:background .16s ease,transform .16s ease/,
  "HTML edit toolbar buttons must have the same responsive hover treatment as editor controls"
);
assert.doesNotMatch(
  htmlEditRuntime,
  /\.commands\{[^}]*overflow-x:auto/,
  "the command group must not scroll and clip the tooltip layer"
);
assert.match(
  htmlEditRuntime,
  /\.commands\{[^}]*flex-wrap:wrap[^}]*overflow:visible/,
  "the command group must wrap on narrow screens while allowing tooltips to escape"
);
assert.match(
  htmlEditRuntime,
  /width:max-content/,
  "the inline toolbar must shrink to its visible command set"
);
assert.match(
  indexHtml,
  /function usesInlineHtmlEditToolbarForSession\(/,
  "inline sessions must bypass the legacy child-webview toolbar"
);
assert.match(
  indexHtml,
  /inlineToolbar: Boolean\(appState\.htmlEditSession\?\.runtimeSessionId === runtimeSessionId[\s\S]*?locale: appState\.language/,
  "the host must pass its current locale into the runtime toolbar"
);
assert.match(
  indexHtml,
  /function htmlEditLeaveConfirmBounds\(\) \{[\s\S]*?x: 0,[\s\S]*?y: 0,[\s\S]*?width: window\.innerWidth,[\s\S]*?height: window\.innerHeight/,
  "the leave-confirm child webview must cover the full runtime so its backdrop cannot form a small rectangular substrate"
);
assert.match(
  htmlEditRuntime,
  /function reportState\(options = \{\}\)[\s\S]*html_edit_state_snapshot/,
  "the runtime must be able to report a fresh state snapshot before a leave decision"
);
assert.match(
  indexHtml,
  /async function refreshHtmlEditRuntimeState\(session, minimumRevision = session\?\.documentRevision \?\? 0\)/,
  "the host must ask the runtime state source to refresh before treating a clean session as safe to leave"
);
assert.match(
  htmlEditLeaveConfirm,
  /backdrop-filter: blur\(10px\)/,
  "the native leave-confirm overlay must own its full-screen backdrop treatment"
);
assert.match(
  htmlEditLeaveConfirm,
  /__NUTBOOK_HTML_EDIT_LEAVE_READY__:/,
  "the leave-confirm child webview must report that its visible document is ready"
);
assert.match(
  runtimeOverlay,
  /els\.editButton\.addEventListener\("pointerdown", activateEditMode\);/,
  "HTML runtime edit must emit on pointerdown before an overlay bounds sync can swallow click"
);
assert.match(
  htmlEditRuntime,
  /button\.addEventListener\("pointerdown", \(event\) => \{ event\.preventDefault\(\); \}\);[\s\S]*?button\.addEventListener\("click", \(event\) => \{ event\.preventDefault\(\); (?:const applied = )?applyInlineFormat\(button\.dataset\.command\);/,
  "format commands must execute on click while pointerdown only preserves the runtime selection"
);
assert.match(
  htmlEditRuntime,
  /function buildInlineToolbar\(\)[\s\S]*?function syncInlineToolbar\(\)/,
  "the inline toolbar must be mounted once and updated in place instead of being rebuilt during selection changes"
);
assert.doesNotMatch(
  htmlEditRuntime,
  /function applyFormat\(payload\)[\s\S]*?document\.execCommand/,
  "all inline formatting must use the one runtime-owned mutation path rather than a second execCommand implementation"
);
const updateChange = runtimeSection("updateChange(element)", "recomputeChanges()");
assert.doesNotMatch(
  updateChange,
  /normalizeRichTextField|richHtmlOf/,
  "reading document changes must not normalize or otherwise mutate the rich-text DOM"
);
const recomputeChanges = runtimeSection("recomputeChanges()", "collectChanges()");
assert.doesNotMatch(
  recomputeChanges,
  /normalizeRichTextField|richHtmlOf/,
  "recomputing changes must be a pure read"
);
assert.match(
  htmlEditRuntime,
  /function readRichValue\(element\) \{\s*return \{\s*html: element\.innerHTML,\s*textAlign: effectiveTextAlign\(element\)\s*\};\s*\}/,
  "rich-text reads must use a DOM-pure value helper"
);
assert.match(
  htmlEditRuntime,
  /function commitDocumentMutation\(field, mutate = null\) \{[\s\S]*?captureFieldSelectionBookmark\(field\)[\s\S]*?normalizeRichTextField\(field\)[\s\S]*?restoreFieldSelectionBookmark\(field, selectionBookmark\)[\s\S]*?recomputeChanges\(\)[\s\S]*?STATE\.documentRevision \+= 1;[\s\S]*?type: "html_edit_document_changed"/,
  "one document mutation must normalize once, restore its selection, and publish a revisioned snapshot"
);
assert.match(
  htmlEditRuntime,
  /function withRichFieldMutation\(field, mutate\) \{[\s\S]*?commitDocumentMutation\(field, mutate\)/,
  "format-only mutations must use the single document transaction"
);
for (const [handlerName, nextName] of [["onFocus(event)", "onBlur()"], ["onBlur()", "onSelectionChange()"], ["onSelectionChange()", "mountInlineToolbar()"]]) {
  const handler = runtimeSection(handlerName, nextName);
  assert.doesNotMatch(handler, /reportState|recomputeChanges|commitDocumentMutation|normalizeRichTextField/, `${handlerName} must only update runtime-local selection or toolbar state`);
}
for (const [handlerName, nextName] of [["onInput(event)", "updateChange(element)"], ["onCompositionEnd(event)", "onInput(event)"], ["onBeforeInput(event)", "restoreSavedSelection()"]]) {
  const handler = runtimeSection(handlerName, nextName);
  assert.match(handler, /commitDocumentMutation/, `${handlerName} must commit document changes through the single transaction`);
}
assert.match(
  htmlEditRuntime,
  /function stateSnapshot\(\) \{[\s\S]*?documentRevision: STATE\.documentRevision/,
  "every document snapshot must carry its revision"
);
assert.match(
  htmlEditRuntime,
  /function selectedDirectBlocks\(field, range\)[\s\S]*?Array\.from\(field\.children\)/,
  "block commands must resolve an explicit contiguous direct-child block set instead of expanding arbitrary descendants"
);
assert.match(
  htmlRuntimeRust,
  /runtime_type\s*\.map\(\|value\| value\.starts_with\("html_edit_"\)\)[\s\S]*?"runtime-title"[\s\S]*?"runtime-forward"/,
  "the host boundary must log every HTML edit runtime message, including done and snapshot requests"
);
assert.match(
  htmlEditRuntime,
  /function emitHostMessage\(payload\) \{[\s\S]*?window\.__TAURI_INTERNALS__\?\.invoke[\s\S]*?invoke\("html_edit_runtime_message_command", \{ payload \}\)/,
  "runtime messages must use Tauri IPC so formatted HTML is never encoded in document.title"
);
assert.match(
  htmlEditRuntime,
  /function stableChangesJson\(value\)/,
  "the runtime must define a canonical rich-text change serializer"
);
assert.match(
  htmlEditRuntime,
  /saveOptions\.expectedDocumentRevision !== null && STATE\.documentRevision !== saveOptions\.expectedDocumentRevision/,
  "markSaved must reject a stale save acknowledgement after the runtime document advances"
);
assert.match(
  previewCommandsRust,
  /pub fn html_edit_runtime_message_command\([\s\S]*?window\.__NUTBOOK_HANDLE_HTML_EDIT_RUNTIME_MESSAGE__/,
  "the runtime IPC command must forward the full payload to the main WebView"
);
assert.doesNotMatch(
  htmlEditRuntime,
  /messageQueue|messageInFlight|ackHostMessage/,
  "the runtime must not depend on an ACK queue after a title-change callback"
);
assert.doesNotMatch(
  htmlRuntimeRust,
  /ackHostMessage|runtime-ack/,
  "the host must forward title messages without evaluating an ACK back into the same callback"
);
assert.match(
  previewCommandsRust,
  /payload\.script\.contains\("\.reportState\("\)[\s\S]*?"state-refresh"[\s\S]*?payload\.script\.contains\("\.__NUTBOOK_HTML_EDIT__\.exit\("\)[\s\S]*?"leave"/,
  "runtime eval diagnostics must distinguish leave-state refreshes from actual editor exit requests"
);
assert.match(
  htmlEditRuntime,
  /(?:\[data-intent="done"\]\'\)|doneButton)\.addEventListener\("click", \(event\) => \{ event\.preventDefault\(\); emitHostMessage\(\{ type: "html_edit_done_requested_from_runtime", \.\.\.stateSnapshot\(\) \}\); \}\);/,
  "Done must report the already committed snapshot without recomputing or mutating the document"
);
assert.match(
  indexHtml,
  /function htmlEditRuntimeSnapshotScript\(runtimeSessionId, requestId\)[\s\S]*?window\.setTimeout\(function \(\) \{[\s\S]*?\.reportState\(\{ requestId:/,
  "leave-state refresh must run from the runtime event loop rather than re-entrantly inside native eval"
);
assert.match(
  indexHtml,
  /htmlEditRuntimeSnapshotScript[\s\S]*?runtimeSnapshotMissing:[\s\S]*?if \(data\.runtimeSnapshotMissing\) \{[\s\S]*?resolveStateRefresh\(false, -1\);/,
  "a missing runtime object must be reported explicitly so leave diagnostics do not confuse it with a clean snapshot"
);
assert.match(
  previewCommandsRust,
  /payload\.script\.contains\("\.reportState\("\)[\s\S]*?"state-refresh"/,
  "runtime eval diagnostics must identify queued snapshot requests"
);
assert.match(
  indexHtml,
  /async function confirmHtmlEditLeaveIfNeeded\(tabId = appState\.activeTabId, options = \{\}\) \{[\s\S]*?if \(!htmlEditLeaveRequiresSave\(session\)\)/,
  "leave must decide from the latest accepted transaction snapshot rather than blocking on an unreliable child-webview pull refresh"
);
assert.doesNotMatch(
  indexHtml.match(/async function confirmHtmlEditLeaveIfNeeded\([\s\S]*?\n      \}/)?.[0] || "",
  /refreshHtmlEditRuntimeState/,
  "close-tab and Done leave paths must not be locked by an extra runtime refresh"
);
assert.match(
  mainRust,
  /RunEvent::WindowEvent\s*\{[\s\S]*?WindowEvent::CloseRequested\s*\{\s*api,[\s\S]*?api\.prevent_close\(\)/,
  "native main-window close must wait for the HTML edit leave decision"
);
assert.match(
  mainRust,
  /RunEvent::ExitRequested\s*\{\s*api,[\s\S]*?api\.prevent_exit\(\)/,
  "native application quit must wait for the HTML edit leave decision"
);
assert.match(
  indexHtml,
  /__NUTBOOK_REQUEST_HTML_EDIT_APP_EXIT__\s*=[\s\S]*?confirmHtmlEditLeaveIfNeeded\(session\.itemId, \{ source: "app-exit" \}\)[\s\S]*?invoke\("finalize_html_edit_app_exit_command"\)/,
  "the app-close bridge must reuse save/discard/keep and only finalize after it permits leaving"
);
assert.match(
  indexHtml.match(/async function saveActiveHtmlEditPatch\(\) \{[\s\S]*?\n      \}/)?.[0] || "",
  /await refreshHtmlEditRuntimeState\(session, session\.documentRevision\)/,
  "save must refresh the child runtime before it decides a newly imported image is clean"
);
assert.match(
  indexHtml,
  /function htmlEditLeaveRequiresSave\(session\) \{\s*return Boolean\(session\?\.dirty \|\| session\?\.requiresPatchReconciliation\);/,
  "a clean DOM with an older persisted patch must still follow the save-or-discard leave path"
);
assert.match(
  indexHtml,
  /const candidatePersistedChanges = mergeHtmlEditPatchChanges\(session\.persistedChanges, session\.changes\);[\s\S]*?const changesForSave = candidatePersistedChanges;[\s\S]*?commit_html_edit[\s\S]*?changes: changesForSave/,
  "every source commit must send the full canonical snapshot rather than erase untouched persisted fields"
);

assert.doesNotMatch(
  indexHtml,
  /html_edit_format_applied/,
  "format diagnostics must never be able to overwrite the canonical document state"
);
assert.match(
  htmlEditToolbar,
  /selectedDataId[\s\S]*?formatState/,
  "temporary toolbar diagnostics must carry the selected field and format role in its title payload"
);

const filesystemSync = indexHtml.match(/async function maybeSyncFilesystemState\(force = false\) \{([\s\S]*?)\n      \}/);
assert.ok(filesystemSync, "filesystem sync function should exist");
assert.doesNotMatch(
  filesystemSync[1],
  /await loadLibraries\(\)/,
  "filesystem sync must not await loadLibraries and recursively await itself"
);
assert.match(
  indexHtml,
  /if \(appState\.activeLibraryId && !isLibraryPathMissing\(appState\.activeLibraryId\)\) \{\n          await scanLibrary\(\{ silent: true \}\);/,
  "boot should not scan an invalid library path after filesystem sync"
);
assert.match(
  indexHtml,
  /-webkit-line-clamp:\s*2;/,
  "file-card names should be clamped to two lines"
);
const gridItemMainRule = indexHtml.match(/\.main-shell\.home-mode \.item-main \{([^}]+)\}/);
assert.ok(gridItemMainRule, "grid file-card body rule should exist");
const gridItemMainMinHeight = gridItemMainRule[1].match(/min-height:\s*(\d+)px;/);
assert.ok(gridItemMainMinHeight, "grid file-card body should have an explicit min-height");
assert.ok(
  Number(gridItemMainMinHeight[1]) >= 44,
  "grid file-card body must have min-height 44px"
);
const gridItemMainPadding = gridItemMainRule[1].match(/padding:\s*8px\s+12px;/);
assert.ok(gridItemMainPadding, "grid file-card body should have padding 8px 12px");
assert.match(
  indexHtml,
  /\.main-shell\.home-mode \.item-card-title \{[^}]*font-size:\s*12px;[^}]*line-height:\s*1\.4;/,
  "file-card title should have font-size 12px line-height 1.4"
);
assert.match(
  indexHtml,
  /\.main-shell\.home-mode \.item-card \{[^}]*min-height:\s*188px;/,
  "grid file-card should have min-height 188px to prevent descender clipping"
);
for (const updater of [
  "updateInsertMenu",
  "updateFormatToolbar",
  "updateTableToolbar",
  "updateCodeLanguageControls"
]) {
  assert.match(
    markdownEditor,
    new RegExp(`function ${updater}\\(\\) \\{[\\s\\S]*?if \\([^\\n]*isEditorComposing\\(\\)\\) return;`),
    `${updater} must not mutate editor-adjacent DOM while IME composition is active`
  );
}
assert.match(
  indexHtml,
  /window\.addEventListener\("keydown", \(event\) => \{\n        if \(event\.isComposing \|\| event\.key === "Process"\) return;/,
  "global keyboard shortcuts must ignore IME composition"
);
assert.match(
  indexHtml,
  /const isMarkdownEditorKeyEvent = Boolean\(event\.target\?\.closest\?\.\("\.milkdown-editor-root \.ProseMirror"\)\);[\s\S]*?if \(isMarkdownEditorKeyEvent\) return;/,
  "global keyboard shortcuts must leave ordinary Milkdown typing entirely to the editor"
);
assert.match(
  markdownEditor,
  /function splitSkillFrontmatterForEditor\(markdown = ""\)/,
  "Milkdown editor should split leading SKILL frontmatter before parsing"
);
assert.match(
  markdownEditor,
  /ctx\.set\(defaultValueCtx, editorMarkdown\);/,
  "Milkdown default value should receive markdown body without frontmatter"
);
assert.match(
  markdownEditor,
  /data-frontmatter-field="description"/,
  "SKILL frontmatter panel should expose editable description field"
);
assert.match(
  markdownEditor,
  /serializeSkillFrontmatterForEditor\(skillFrontmatter\)/,
  "Milkdown serialization should use the editable SKILL frontmatter state"
);
assert.match(
  markdownEditor,
  /function extractSkillTriggersFromDescription\(description = ""\)/,
  "SKILL editor should recognize legacy Triggers text inside description"
);
assert.match(
  markdownEditor,
  /function cleanSkillDescription\(description = ""\)/,
  "SKILL editor should not duplicate Triggers text inside description"
);

const htmlEditLeaveOverlay = indexHtml.match(/async function showHtmlEditLeaveConfirmOverlay\(session\) \{([\s\S]*?)\n      \}/);
assert.ok(htmlEditLeaveOverlay, "HTML edit leave overlay flow should exist");
assert.match(
  htmlEditLeaveOverlay[1],
  /await invoke\("attach_html_edit_leave_confirm_overlay_command"/,
  "HTML edit leave flow must use the established child-overlay attachment path"
);
assert.match(
  htmlEditLeaveOverlay[1],
  /payload:\s*\{\s*itemId:\s*session\.itemId,/,
  "HTML edit leave flow must pass the named Rust payload argument"
);
assert.match(
  htmlEditLeaveOverlay[1],
  /throw error;/,
  "HTML edit leave flow must leave editing active and report a child-overlay attachment failure"
);
assert.match(
  indexHtml,
  /document\.addEventListener\("visibilitychange", \(\) => \{\n          if \(appState\.htmlEditLeavePromptOpen\) return;/,
  "focus changes while the independent leave overlay is open must not suspend the runtime beneath it"
);
assert.match(
  indexHtml,
  /window\.addEventListener\("focus", \(\) => \{\n          if \(!document\.hidden\) scheduleRuntimeHostSync\(\);\n        \}\);/,
  "restoring a macOS window must re-sync the child runtime after the host regains focus"
);
assert.match(
  indexHtml,
  /window\.addEventListener\("resize", \(\) => \{\n          if \(!document\.hidden\) scheduleRuntimeHostSync\(\);\n        \}\);/,
  "a restored host layout must re-sync the child runtime bounds after resize"
);

const runtimeHostSync = indexHtml.match(/async function syncActiveRuntimeHost\(runId = null\) \{([\s\S]*?)\n      \}/);
assert.ok(runtimeHostSync, "runtime host synchronization should exist");
assert.doesNotMatch(
  runtimeHostSync[1],
  /attach_html_edit_leave_confirm_overlay_command/,
  "only the leave-intent coordinator may attach the HTML edit confirmation overlay"
);

const runtimeSuspend = indexHtml.match(/async function suspendRuntimeSurfaces\(\) \{([\s\S]*?)\n      \}/);
assert.ok(runtimeSuspend, "runtime surface suspension should exist");
assert.match(
  runtimeSuspend[1],
  /appState\.activeRuntimeHostId = null;\n        appState\.runtimeHostLastBoundsKey = null;/,
  "suspending runtime surfaces must invalidate the hidden host cache"
);
const runtimeResume = indexHtml.match(/async function resumeRuntimeSurfaces\(\) \{([\s\S]*?)\n      \}/);
assert.ok(runtimeResume, "runtime surface resume should be asynchronous");
assert.match(
  runtimeResume[1],
  /const suspendPromise = appState\.runtimeSurfaceSuspendPromise;[\s\S]*await suspendPromise;/,
  "runtime resume must wait for the previous hide IPC before reattaching the active host"
);
assert.match(
  indexHtml,
  /async function hideStaleRuntimeHostSync\(runId, itemId\) \{[\s\S]*await hideRuntimeSessionSurfaces\(itemId, \{ force: true, token \}\);/,
  "a stale host attach must be explicitly hidden after its IPC completes"
);
assert.match(
  runtimeHostSync[1],
  /await invoke\("attach_html_runtime_host_command", \{[\s\S]*?\n          if \(await hideStaleRuntimeHostSync\(runId, tab\.id\)\) return;/,
  "host attach must clean up if the active runtime changed while IPC was in flight"
);
const htmlEditExit = indexHtml.match(/async function exitHtmlEditMode\(itemOrOptions = \{\}\) \{([\s\S]*?)\n      \}/);
assert.ok(htmlEditExit, "HTML edit exit flow should exist");
assert.match(
  htmlEditExit[1],
  /appState\.htmlEditToolbarVisible = false;[\s\S]*runtimePatchAppliedKeys\.delete\(itemId\);[\s\S]*await applyHtmlEditPatchToRuntime\(itemId\)[\s\S]*refocusActiveRuntimeHost\(itemId\);/,
  "leaving HTML edit mode must recreate the removed readonly image layer before returning focus"
);

assert.match(i18n, /leavePrompt: "有未保存的修改"/, "Chinese leave-confirm title must be translated");
assert.match(i18n, /leavePrompt: "Unsaved changes"/, "English leave-confirm title must be translated");
assert.match(i18n, /discardAndExit: "不保存退出"/, "Chinese leave-confirm discard action must be translated");
assert.match(i18n, /discardAndExit: "Discard and Exit"/, "English leave-confirm discard action must be translated");
assert.match(htmlEditLeaveConfirm, /width: min\(424px, calc\(100vw - 16px\)\);/, "leave-confirm card must use the wider host bounds");
assert.match(htmlEditLeaveConfirm, /\.actions \{[\s\S]*flex-wrap: wrap;/, "leave-confirm actions must wrap instead of overflowing on narrow windows");

assert.match(
  htmlEditRuntime,
  /function editableRichTextElements\(\)[\s\S]*?isRichEditRole\(editRoleOf\(element\)\)/,
  "HTML edit runtime must identify rich fields from their role rather than a second conflicting attribute"
);
assert.match(
  htmlEditRuntime,
  /function editRoleOf\(element\)[\s\S]*?getAttribute\("data-edit-role"\)/,
  "HTML edit runtime must read each field's explicit edit role"
);
assert.match(
  htmlEditRuntime,
  /SHORT_FORMAT_COMMANDS[\s\S]*?"bold"[\s\S]*?"italic"[\s\S]*?"align-left"[\s\S]*?"align-center"[\s\S]*?"align-right"/,
  "short fields must expose only emphasis and alignment commands"
);
assert.match(
  htmlEditRuntime,
  /function applyInlineFormat\(command\)[\s\S]*?role === "short" \? SHORT_FORMAT_COMMANDS : VALID_FORMAT_COMMANDS\)\.has\(command\)\) return false/,
  "short fields must reject block and list commands before mutation"
);
assert.match(
  htmlEditRuntime,
  /function normalizeShortRichTextField\(field\)[\s\S]*?ALLOWED_SHORT_RICH_TAGS/,
  "short fields must normalize away block and list structure"
);
assert.match(
  htmlEditRuntime,
  /data-nutbook-edit-role-label[\s\S]*?data-nutbook-editing="rich-text"[\s\S]*?outline:/,
  "editing fields must expose a visible nontechnical role label and shared edit affordance"
);
assert.match(
  htmlEditRuntime,
  /editRole: role/,
  "HTML edit patches must retain the field role for role-aware persistence"
);
assert.match(
  htmlEditRuntime,
  /const patchRole = change\.editRole \|\| "content"[\s\S]*?patchRole === role/,
  "legacy role-less rich patches must remain content-only while new patches are role-bound"
);
assert.match(richTextFixture, /data-id="article-title"[^>]*data-edit-role="short"|data-edit-role="short"[^>]*data-id="article-title"/, "acceptance fixture must expose a short rich title");
assert.match(richTextFixture, /data-id="article-body"[^>]*data-edit-role="content"|data-edit-role="content"[^>]*data-id="article-body"/, "acceptance fixture must expose a content rich body");
assert.match(richTextFixture, /<button[^>]*data-edit-role="short"[^>]*data-id="article-action"/, "acceptance fixture must expose a short rich button");
assert.match(
  htmlEditRuntime,
  /element\.setAttribute\("contenteditable", type === "rich-text" \? "true" : "plaintext-only"\);/,
  "plaintext and rich-text fields must use distinct contenteditable modes"
);
assert.match(
  htmlEditRuntime,
  /STATE\.savedSelection[\s\S]*?cloneRange\(\)[\s\S]*?sameRichTextField/,
  "only a cloned selection within one rich-text field may be retained for formatting"
);
assert.match(
  htmlEditRuntime,
  /function onBlur\(\) \{ syncInlineToolbar\(\); \}/,
  "blur should update only the runtime toolbar without publishing document state"
);
assert.match(
  htmlEditRuntime,
  /function applyFormat\(payload\)[\s\S]*?runtimeSessionId !== STATE\.sessionId[\s\S]*?VALID_FORMAT_COMMANDS[\s\S]*?applyInlineFormat/,
  "format commands must be session-scoped, restore runtime-owned selection, and be allowlisted"
);
assert.match(
  htmlEditRuntime,
  /function withRichFieldMutation\(field, mutate\) \{ return commitDocumentMutation\(field, mutate\); \}/,
  "semantic bold and block formatting must use the canonical runtime-owned mutation transaction"
);
assert.match(
  htmlEditRuntime,
  /function selectedDirectBlocks\(field, range\)[\s\S]*?function setInlineBlockAlignment\(field, range, align\)[\s\S]*?block\.setAttribute\("style", `text-align:\$\{align\}`\)[\s\S]*?setInlineBlockAlignment\(field, range, command\.slice\(6\)\)/,
  "content alignment must apply to the selected block range instead of the entire rich-text field"
);
assert.match(
  htmlEditRuntime,
  /function isAllowedRichAlignmentAttribute\(node, role\)[\s\S]*?\["text-align:left", "text-align:center", "text-align:right"\][\s\S]*?node\.setAttribute\("style", `text-align:\$\{alignment\}`\)/,
  "runtime rich-text normalization must preserve only canonical block alignment styles"
);
assert.match(
  htmlEditRuntime,
  /function computeFormatState\(field, range\)[\s\S]*?editRole:\s*editRoleOf\(field\)/,
  "runtime format state must report the selected field role to the host"
);
assert.match(
  htmlEditRuntime,
  /function computeFormatState\(field, range\)[\s\S]*?canFormat:\s*isRichEditRole\(editRoleOf\(field\)\)[\s\S]*?editRole:\s*editRoleOf\(field\)/,
  "placing a caret in rich text must enable the commands that work without a text range"
);
assert.match(
  htmlEditRuntime,
  /function updateSavedSelection\(\)[\s\S]*?STATE\.formatState = computeFormatState\(field, range\);/,
  "a restored rich-text selection must publish its field role and formatting state to the toolbar"
);
assert.match(
  htmlEditRuntime,
  /function updateSavedSelection\(\)[\s\S]*?if \(!field\) return;/,
  "switching to the child toolbar must retain the runtime-owned selection until formatting restores it"
);
assert.match(
  htmlEditRuntime,
  /outline:2px dashed #c5bbbb;outline-offset:3px;border-radius:8px;cursor:text;position:relative.*outline-color:#a99f9f;background:#f3f3f5.*outline-color:#000;box-shadow:0 4px 12px/,
  "editing affordances must use the monochrome DESIGN.md dashed outline, off-white hover, black focus, and no visual role badge"
);
assert.doesNotMatch(
  htmlEditRuntime,
  /\[data-nutbook-editing\]::after|#2d76ff|rgba\(45,118,255/,
  "editing affordances must not inject blue styling or a pseudo-element role label"
);
assert.match(
  indexHtml,
  /function acceptHtmlEditDocumentSnapshot\(session, data\)[\s\S]*?data\.formatState && typeof data\.formatState === "object"\) session\.formatState = data\.formatState[\s\S]*?function defaultHtmlEditToolbarFormatState\(\)[\s\S]*?editRole:\s*"plain"/,
  "host HTML edit sessions must preserve the runtime field role through canonical snapshots"
);
assert.match(
  htmlEditToolbar,
  /const SHORT_FORMAT_COMMANDS = new Set\(\["bold", "italic", "align-left", "align-center", "align-right"\]\);[\s\S]*?function activeEditRole\(\)[\s\S]*?editRole === "short"/,
  "toolbar must select the short-text command allowlist from format state"
);
assert.match(
  htmlEditToolbar,
  /\.format-commands button\[hidden\], \.format-divider\[hidden\] \{ display: none; \}/,
  "hidden short-text commands must be visually removed even though toolbar buttons use inline-flex"
);
assert.match(
  htmlEditToolbar,
  /:root\[data-edit-role="short"\] \.toolbar \{ width: min\(352px,[\s\S]*?document\.documentElement\.dataset\.editRole = editRole;/,
  "toolbar island width must visibly contract for short-text editing without relying on delayed child-webview resizing"
);
assert.match(
  htmlEditToolbar,
  /formatCommands\.hidden = !isRichTextRole;[\s\S]*?textEditingState\.hidden = isRichTextRole/,
  "plain-text editing must replace formatting commands with an editing-state label"
);
assert.match(i18n, /textEditing: "文本编辑"/, "Chinese plain-text toolbar state must be translated");
assert.match(i18n, /textEditing: "Text editing"/, "English plain-text toolbar state must be translated");
assert.match(htmlEditToolbar, /\.\/i18n\.js\?v=20260715-html-edit-roles/, "toolbar must reload its i18n bundle when role state copy changes");
assert.match(
  htmlEditRuntime,
  /document\.addEventListener\("selectionchange", onSelectionChange, true\);[\s\S]*?document\.addEventListener\("beforeinput", onBeforeInput, true\);/,
  "rich editing must track selection and intercept paste before DOM insertion"
);
assert.match(
  htmlEditRuntime,
  /function onBeforeInput\(event\)[\s\S]*?event\.inputType !== "insertFromPaste" && event\.inputType !== "insertFromDrop"[\s\S]*?event\.inputType === "insertFromDrop"[\s\S]*?event\.preventDefault\(\)[\s\S]*?event\.inputType !== "insertFromPaste"/,
  "drops must always be blocked while paste is allowed only through the rich-text plaintext path"
);
assert.match(
  htmlEditRuntime,
  /range\.insertNode\(textNode\)[\s\S]*?caret\.setStartAfter\(textNode\)[\s\S]*?caret\.collapse\(true\)[\s\S]*?selection\.addRange\(caret\)/,
  "rich plaintext paste must leave the caret after the inserted text"
);
assert.match(
  htmlEditRuntime,
  /const selection = window\.getSelection\(\);[\s\S]*?const range = selection\?\.rangeCount \? selection\.getRangeAt\(0\) : null;/,
  "rich paste must use one declared selection instance for both range replacement and caret restoration"
);
assert.match(
  htmlEditRuntime,
  /function onCompositionEnd\(event\) \{[\s\S]*?STATE\.composing = false;[\s\S]*?commitDocumentMutation\(element\)[\s\S]*?function onInput\(event\) \{[\s\S]*?if \(STATE\.composing\) return;/,
  "rich IME composition must defer its one document transaction until composition ends"
);
assert.doesNotMatch(
  htmlEditRuntime,
  /skipNextRichInput/,
  "IME completion must not leave a flag that can swallow the next ordinary input event"
);
assert.match(
  htmlEditRuntime,
  /function richBaselineOf\(element\) \{ return readRichValue\(element\); \}/,
  "rich baselines must include canonical HTML and effective alignment"
);
assert.match(
  htmlEditRuntime,
  /change\.textAlign \? normalizeTextAlign\(change\.textAlign\) : baseline\.textAlign/,
  "replaying a rich patch without alignment must reset to the saved rich baseline instead of leaving stale inline alignment"
);
assert.match(
  htmlEditRuntime,
  /selection\.addRange\(saved\.range\.cloneRange\(\)\)[\s\S]*?sameRichTextField\(selection\.getRangeAt\(0\)\)/,
  "saved range must be cloned, attached, and then revalidated before formatting"
);
assert.match(
  htmlEditRuntime,
  /getComputedStyle\(blockElement \|\| field\)\.textAlign/,
  "format state must report the selected block's effective text alignment instead of the entire rich-text field"
);
assert.match(
  htmlEditRuntime,
  /block: blockTag === "p" \? "paragraph" : `heading-\$\{blockTag\.slice\(1\)\}`[\s\S]*?list: listTag === "ul" \? "unordered-list" : listTag === "ol" \? "ordered-list" : null/,
  "format state must use the same heading and list command values accepted by the formatter"
);
assert.match(
  htmlEditRuntime,
  /type: "rich_text"[\s\S]*?innerHTML[\s\S]*?normalizeRichTextField/,
  "rich-text patches must preserve validated canonical HTML"
);
assert.match(
  indexHtml,
  /function htmlEditReadonlyPatchScript\(patch, runtimeAssetUrls, surfaceToken\) \{[\s\S]*?change\.type === 'text'[\s\S]*?element\.textContent[\s\S]*?change\.type === 'rich_text'[\s\S]*?element\.innerHTML/,
  "readonly runtime patching must keep text and validated rich-text fields separate"
);
assert.match(
  indexHtml,
  /runtimePatchSurfaceLanes\.get\(itemId\)[\s\S]*?runtimePatchAppliedKeys\.get\(itemId\)[\s\S]*?patchRevision/,
  "readonly patches must serialize each item's revisions so an old response cannot overwrite a newer patch"
);
assert.match(
  indexHtml,
  /function isRuntimePatchSurfaceCurrent\(itemId, generation, surfaceToken\)[\s\S]*?htmlEditSessionGeneration/,
  "readonly patch replay must guard against an edit-session generation becoming active mid-flight"
);
assert.match(
  indexHtml,
  /const surfaceToken = currentRuntimeSurfaceToken\(itemId\);[\s\S]*?isRuntimePatchSurfaceCurrent\(itemId, generation, surfaceToken\)[\s\S]*?await invoke\("get_html_edit_patch"[\s\S]*?isRuntimePatchSurfaceCurrent\(itemId, generation, surfaceToken\)[\s\S]*?await invoke\("eval_html_runtime_script_command"[\s\S]*?isRuntimePatchSurfaceCurrent\(itemId, generation, surfaceToken\)/,
  "readonly replay must reject stale same-item work when its runtime surface token changes during fetch or eval"
);
const closeHtmlRuntime = indexHtml.match(/async function closeOpenTab\(tabId\) \{([\s\S]*?)\n      \}/);
assert.ok(closeHtmlRuntime, "HTML runtime close flow should exist");
assert.doesNotMatch(
  closeHtmlRuntime[1],
  /runtimeSurfaceTokens\.delete\(tabId\)/,
  "closing an HTML runtime must not reset its per-item surface token"
);
assert.match(
  indexHtml,
  /function nextRuntimeSurfaceToken\(itemId\) \{[\s\S]*?runtimeSurfaceTokens\.get\(itemId\) \|\| 0\) \+ 1/,
  "reopened runtime surfaces must receive a monotonic per-item token"
);
assert.match(
  indexHtml,
  /data-nutbook-original-text-align[\s\S]*?change\.textAlign \|\| baselineTextAlign/,
  "readonly replay must retain an original alignment baseline when a newer patch clears alignment"
);
assert.match(
  indexHtml,
  /function htmlEditReadonlyPatchScript\(patch, runtimeAssetUrls, surfaceToken\)[\s\S]*?__NUTBOOK_HTML_PATCH_SURFACE_TOKEN__[\s\S]*?function isCurrentSurface\(\)[\s\S]*?isCurrentSurface\(\)[\s\S]*?setTimeout/,
  "readonly injected retries must recheck their surface token before every deferred mutation"
);
assert.match(
  indexHtml,
  /function syncHtmlEditReadonlyPatchSurfaceToken\(itemId, surfaceToken\)[\s\S]*?writeHtmlEditReadonlyPatchSurfaceToken/,
  "surface-token invalidation must be visible inside the child runtime"
);
assert.match(
  indexHtml,
  /runtimePatchSurfaceLanes: new Map\(\)/,
  "surface-token IPC writes must be serialized per runtime item"
);
assert.match(
  indexHtml,
  /function enqueueHtmlEditReadonlyPatchSurfaceLane\(itemId, work\)[\s\S]*?runtimePatchSurfaceLanes\.get\(itemId\)[\s\S]*?previous\.catch\(\(\) => \{\}\)\.then\(work\)[\s\S]*?runtimePatchSurfaceLanes\.set\(itemId, lane\)/,
  "surface-token IPC writes must run in per-item order"
);
assert.match(
  indexHtml,
  /existingSurfaceToken[\s\S]*?nextSurfaceToken >= existingSurfaceToken[\s\S]*?__NUTBOOK_HTML_PATCH_SURFACE_TOKEN__ = nextSurfaceToken/,
  "child runtime must refuse an out-of-order older surface token"
);
assert.match(
  indexHtml,
  /async function markRuntimeSurfaceActive\(itemId\)[\s\S]*?await syncHtmlEditReadonlyPatchSurfaceToken[\s\S]*?await markRuntimeSurfaceActive\(tab\.id\)/,
  "active surface transitions must await runtime-visible token invalidation"
);
for (const transition of ["hideStaleRuntimeHostSync", "suspendRuntimeSurfaces", "scheduleRuntimeSurfaceHide", "hideInactiveRuntimeHosts"]) {
  const transitionBody = indexHtml.match(new RegExp(`(?:async )?function ${transition}\\([^)]*\\) \\{([\\s\\S]*?)\\n      \\}`));
  assert.ok(transitionBody, `${transition} should exist`);
  assert.match(
    transitionBody[1],
    /await syncHtmlEditReadonlyPatchSurfaceToken/,
    `${transition} must await runtime-visible token invalidation before hiding a surface`
  );
}
assert.match(
  indexHtml,
  /function htmlEditReadonlyPatchScript\(patch, runtimeAssetUrls, surfaceToken\)[\s\S]*?existingSurfaceToken[\s\S]*?incomingSurfaceToken[\s\S]*?incomingSurfaceToken >= existingSurfaceToken[\s\S]*?__NUTBOOK_HTML_PATCH_SURFACE_TOKEN__ = incomingSurfaceToken/,
  "readonly patch injection must never downgrade an already newer runtime-visible token"
);
assert.match(
  indexHtml,
  /runtimePatchSurfaceLanes: new Map\(\)[\s\S]*?runtimePatchSurfaceLanes\.get\(itemId\)[\s\S]*?runtimePatchSurfaceLanes\.set\(itemId, lane\)/,
  "patch eval and token invalidation must share one per-item serialized lane"
);
assert.match(
  indexHtml,
  /const surfaceToken = currentRuntimeSurfaceToken\(itemId\);[\s\S]*?await writeHtmlEditReadonlyPatchSurfaceToken\(itemId, surfaceToken\);[\s\S]*?runtimePatchAppliedKeys\.get\(itemId\)/,
  "runtime-visible token synchronization must happen before same-revision replay early returns"
);
assert.match(
  indexHtml,
  /function acceptHtmlEditDocumentSnapshot\(session, data\)[\s\S]*?session\.selectedDataId = data\.selectedDataId \|\| null;[\s\S]*?session\.formatState = data\.formatState;/,
  "host state must retain runtime-selected field and computed formatting state only through canonical snapshots"
);
assert.match(
  indexHtml,
  /window\.__NUTBOOK_HANDLE_HTML_EDIT_RUNTIME_MESSAGE__[\s\S]*?session\.runtimeSessionId !== data\.runtimeSessionId[\s\S]*?!isCurrentHtmlEditSession\(session\)/,
  "runtime state must bind its session id to the active host item and generation"
);
assert.match(
  indexHtml,
  /window\.__NUTBOOK_HANDLE_HTML_EDIT_TOOLBAR_ACTION__[\s\S]*?data\?\.runtimeSessionId !== session\.runtimeSessionId[\s\S]*?Number\(data\?\.generation\) !== session\.generation/,
  "legacy toolbar actions must still validate runtime session identity before save or Done"
);
assert.doesNotMatch(
  indexHtml,
  /window\.__NUTBOOK_HANDLE_HTML_EDIT_TOOLBAR_ACTION__[\s\S]*?data\?\.action === "format"/,
  "format actions must remain inside the runtime WebView rather than crossing the host toolbar boundary"
);
assert.match(
  indexHtml,
  /attach_html_edit_toolbar_overlay_command[\s\S]*?runtimeSessionId: session\.runtimeSessionId,[\s\S]*?generation: session\.generation,[\s\S]*?formatState: session\.formatState \|\| defaultHtmlEditToolbarFormatState\(\)/,
  "toolbar sync must forward the current session identity and formatting state"
);
assert.match(
  htmlEditToolbar,
  /runtimeSessionId: null,[\s\S]*?generation: null,[\s\S]*?state\.runtimeSessionId = next\.runtimeSessionId;[\s\S]*?state\.generation = next\.generation;[\s\S]*?payload\.runtimeSessionId = state\.runtimeSessionId;[\s\S]*?payload\.generation = state\.generation;/,
  "toolbar actions must retain and emit their runtime session identity"
);
assert.match(
  htmlEditToolbar,
  /function emitFormatFromPointerDown\(event\)[\s\S]*?event\.preventDefault\(\);[\s\S]*?emit\("format", \{ command \}\);[\s\S]*?button\.addEventListener\("pointerdown", emitFormatFromPointerDown\);/,
  "format intent must be sent on pointerdown before cross-webview focus loss can hide the toolbar button"
);
assert.match(
  htmlEditToolbar,
  /const FORMAT_COMMANDS = \[[\s\S]*?command: "bold", key: "htmlEdit\.format\.bold"[\s\S]*?command: "italic", key: "htmlEdit\.format\.italic"[\s\S]*?command: "paragraph", key: "htmlEdit\.format\.paragraph"[\s\S]*?command: "heading-1", key: "htmlEdit\.format\.heading1"[\s\S]*?command: "heading-4", key: "htmlEdit\.format\.heading4"[\s\S]*?command: "align-left", key: "htmlEdit\.format\.alignLeft"[\s\S]*?command: "align-right", key: "htmlEdit\.format\.alignRight"[\s\S]*?command: "unordered-list", key: "htmlEdit\.format\.bulletList"[\s\S]*?command: "ordered-list", key: "htmlEdit\.format\.orderedList"/,
  "toolbar format commands must use an explicit command-to-i18n mapping"
);
assert.match(
  htmlEditToolbar,
  /<button[^>]*data-format-command="bold"[^>]*type="button"[^>]*aria-label=""[^>]*title=""[^>]*>[\s\S]*?<svg[\s\S]*?<button[^>]*data-format-command="ordered-list"[^>]*type="button"[^>]*aria-label=""[^>]*title=""[^>]*>[\s\S]*?<svg/,
  "toolbar must provide inline-SVG, accessible buttons from bold through ordered list"
);
assert.match(
  htmlEditToolbar,
  /state\.formatState = next\.formatState \|\| defaultFormatState\(\);[\s\S]*?button\.disabled = !canFormat;[\s\S]*?button\.setAttribute\("aria-pressed", String\(isActive\)\);[\s\S]*?emit\("format", \{ command \}\);/,
  "format controls must follow runtime availability and active state, then emit a format action"
);
assert.match(
  htmlEditToolbar,
  /\.format-commands \{[\s\S]*?overflow-x: auto;[\s\S]*?\.actions \{[\s\S]*?flex: 0 0 auto;/,
  "narrow toolbar format commands must scroll while save and done remain visible"
);
assert.match(
  htmlEditToolbar,
  /htmlEdit\.format\.formatUnavailable/,
  "disabled format controls must expose the unavailable-format explanation"
);
for (const key of [
  "bold", "italic", "paragraph", "heading1", "heading2", "heading3", "heading4",
  "alignLeft", "alignCenter", "alignRight", "bulletList", "orderedList", "formatUnavailable"
]) {
  assert.match(i18n, new RegExp(`htmlEdit: \\{[\\s\\S]*?format: \\{[\\s\\S]*?${key}:`), `Chinese HTML edit format key ${key} should exist`);
  const englishHtmlEdit = i18n.slice(i18n.indexOf('toolbar: "HTML Edit Toolbar"'));
  assert.match(englishHtmlEdit, new RegExp(`format: \\{[\\s\\S]*?${key}:`), `English HTML edit format key ${key} should exist`);
}
assert.match(
  indexHtml,
  /function htmlEditToolbarBounds\(formatState\) \{[\s\S]*?formatState\?\.editRole === "content" \? 640 : formatState\?\.editRole === "short" \? 360 : 260;[\s\S]*?Math\.min\(preferredWidth, window\.innerWidth - 16\)[\s\S]*?const height = 56;/,
  "HTML edit toolbar bounds must adapt to the selected field's command set while remaining a compact island"
);
assert.match(
  htmlEditToolbar,
  /\.toolbar \{[\s\S]*?width: min\(632px, calc\(100vw - 8px\)\);[\s\S]*?\.format-commands \{[\s\S]*?overflow-x: auto;[\s\S]*?\.actions \{[\s\S]*?flex: 0 0 auto;/,
  "wide toolbars must show the full command set, while narrow toolbars preserve visible save and done actions"
);
assert.doesNotMatch(
  indexHtml,
  /<iframe[^>]+html-edit-toolbar/i,
  "HTML edit toolbar must remain a child-overlay boundary, never an iframe fallback"
);

console.log("Nutbook regression guards passed.");
