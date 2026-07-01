import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync("dist/index.html", "utf8");
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

console.log("Nutbook regression guards passed.");
