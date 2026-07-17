import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync("dist/index.html", "utf8");
const i18n = readFileSync("dist/i18n.js", "utf8");
const htmlEditLeaveConfirm = readFileSync("dist/html-edit-leave-confirm.html", "utf8");
const markdownEditor = readFileSync("src/markdown-editor.js", "utf8");

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

console.log("Nutbook regression guards passed.");
