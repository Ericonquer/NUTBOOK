import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync("dist/index.html", "utf8");
const i18n = readFileSync("dist/i18n.js", "utf8");
const htmlEditLeaveConfirm = readFileSync("dist/html-edit-leave-confirm.html", "utf8");
const markdownEditor = readFileSync("src/markdown-editor.js", "utf8");
const htmlEditRuntime = readFileSync("dist/assets/html-edit-runtime.js", "utf8");

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
  "HTML edit leave flow must observe child-overlay attachment failures"
);
assert.match(
  htmlEditLeaveOverlay[1],
  /payload:\s*\{\s*itemId:\s*session\.itemId,/,
  "HTML edit leave flow must pass the named Rust payload argument"
);
assert.match(
  indexHtml,
  /invoke\("close_html_edit_leave_confirm_overlay_command", \{\s*payload:\s*\{\s*itemId\s*\}\s*\}\)/,
  "HTML edit leave flow must pass the named Rust payload when closing the child overlay"
);
assert.match(
  htmlEditLeaveOverlay[1],
  /throw error;/,
  "HTML edit leave flow must leave editing active and report a child-overlay attachment failure instead of replacing the host overlay with a DOM or native dialog"
);
assert.match(
  indexHtml,
  /document\.addEventListener\("visibilitychange", \(\) => \{\n          if \(appState\.htmlEditLeavePromptOpen\) return;/,
  "focus changes while the independent leave overlay is open must not suspend the runtime beneath it"
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
  /appState\.htmlEditToolbarVisible = false;[\s\S]*refocusActiveRuntimeHost\(itemId\);/,
  "leaving HTML edit mode must restore runtime focus so F can exit presentation mode"
);

assert.match(i18n, /leavePrompt: "有未保存的修改"/, "Chinese leave-confirm title must be translated");
assert.match(i18n, /leavePrompt: "Unsaved changes"/, "English leave-confirm title must be translated");
assert.match(i18n, /discardAndExit: "不保存退出"/, "Chinese leave-confirm discard action must be translated");
assert.match(i18n, /discardAndExit: "Discard and Exit"/, "English leave-confirm discard action must be translated");
assert.match(indexHtml, /const width = Math\.min\(456, Math\.max\(360, window\.innerWidth - 32\)\);/, "leave-confirm overlay must reserve enough width for English actions");
assert.match(htmlEditLeaveConfirm, /width: min\(424px, calc\(100vw - 16px\)\);/, "leave-confirm card must use the wider host bounds");
assert.match(htmlEditLeaveConfirm, /\.actions \{[\s\S]*flex-wrap: wrap;/, "leave-confirm actions must wrap instead of overflowing on narrow windows");

assert.match(
  htmlEditRuntime,
  /function editableRichTextElements\(\)[\s\S]*?getAttribute\("data-editable"\) === "rich-text"/,
  "HTML edit runtime must scan rich-text fields separately from plaintext fields"
);
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
  /function applyFormat\(payload\)[\s\S]*?runtimeSessionId !== STATE\.sessionId[\s\S]*?VALID_FORMAT_COMMANDS[\s\S]*?restoreSavedSelection/,
  "format commands must be session-scoped, restore runtime-owned selection, and be allowlisted"
);
assert.match(
  htmlEditRuntime,
  /document\.addEventListener\("selectionchange", onSelectionChange, true\);[\s\S]*?document\.addEventListener\("beforeinput", onBeforeInput, true\);/,
  "rich editing must track selection and intercept paste before DOM insertion"
);
assert.match(
  htmlEditRuntime,
  /function onBeforeInput\(event\)[\s\S]*?event\.inputType === "insertFromDrop"[\s\S]*?event\.preventDefault\(\)[\s\S]*?event\.inputType !== "insertFromPaste"/,
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
  /compositionstart[\s\S]*?onCompositionStart[\s\S]*?compositionend[\s\S]*?onCompositionEnd[\s\S]*?if \(element\.getAttribute\("data-editable"\) === "rich-text" && !STATE\.composing\) normalizeRichTextField/,
  "rich IME composition must defer normalization until composition ends"
);
assert.match(
  htmlEditRuntime,
  /function richBaselineOf\(element\)[\s\S]*?html:[\s\S]*?textAlign:[\s\S]*?getComputedStyle/,
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
  /getComputedStyle\(field\)\.textAlign/,
  "format state must report the effective text alignment instead of inline style only"
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
  /function htmlEditReadonlyPatchScript\(patch, surfaceToken\) \{[\s\S]*?change\.type === 'text'[\s\S]*?element\.textContent[\s\S]*?change\.type === 'rich_text'[\s\S]*?element\.innerHTML/,
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
  /function htmlEditReadonlyPatchScript\(patch, surfaceToken\)[\s\S]*?__NUTBOOK_HTML_PATCH_SURFACE_TOKEN__[\s\S]*?function isCurrentSurface\(\)[\s\S]*?isCurrentSurface\(\)[\s\S]*?setTimeout/,
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
  /function htmlEditReadonlyPatchScript\(patch, surfaceToken\)[\s\S]*?existingSurfaceToken[\s\S]*?incomingSurfaceToken[\s\S]*?incomingSurfaceToken >= existingSurfaceToken[\s\S]*?__NUTBOOK_HTML_PATCH_SURFACE_TOKEN__ = incomingSurfaceToken/,
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
  /html_edit_state_changed[\s\S]*?session\.selectedDataId = data\.selectedDataId \|\| null;[\s\S]*?session\.formatState = data\.formatState \|\| null;/,
  "host state must retain runtime-selected field and computed formatting state"
);
assert.match(
  indexHtml,
  /data\?\.action === "format"[\s\S]*?window\.__NUTBOOK_HTML_EDIT__\.applyFormat\([\s\S]*?runtimeSessionId/,
  "toolbar actions must cross the host boundary only through the active runtime session"
);
assert.doesNotMatch(
  indexHtml,
  /<iframe[^>]+html-edit-toolbar/i,
  "HTML edit toolbar must remain a child-overlay boundary, never an iframe fallback"
);

console.log("Nutbook regression guards passed.");
