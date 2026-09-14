// Markdown image resource normalization and line-start insert-menu layering.
// This is a focused contract test; native desktop WebView acceptance remains
// with the reviewer and is intentionally not claimed here.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync("dist/index.html", "utf8");
const markdownEditorSource = readFileSync("src/markdown-editor.js", "utf8");

const normalizeMatch = indexHtml.match(/function normalizePreview\(preview\) \{[\s\S]*?\n      \}/);
assert.ok(normalizeMatch, "normalizePreview must exist in dist/index.html");
const normalizePreview = new Function(`return (${normalizeMatch[0]})`)();

const camelPreview = normalizePreview({
  fileType: "markdown",
  itemId: 17,
  raw: "![图](./assets/icon.png)",
  html: "<p>preview</p>",
  baseDir: "/library/docs",
  resourceOrigin: "http://127.0.0.1:43117",
  resourceRoot: "/library",
  resourceBaseDir: "/library/docs"
});
assert.equal(camelPreview.resourceOrigin, "http://127.0.0.1:43117");
assert.equal(camelPreview.resourceRoot, "/library");
assert.equal(camelPreview.resourceBaseDir, "/library/docs");
assert.equal(camelPreview.resource_origin, camelPreview.resourceOrigin);
assert.equal(camelPreview.resource_root, camelPreview.resourceRoot);
assert.equal(camelPreview.resource_base_dir, camelPreview.resourceBaseDir);

const snakePreview = normalizePreview({
  file_type: "markdown",
  resource_origin: "http://127.0.0.1:43118",
  resource_root: "/library-two",
  resource_base_dir: "/library-two/notes"
});
assert.equal(snakePreview.resourceOrigin, "http://127.0.0.1:43118");
assert.equal(snakePreview.resourceRoot, "/library-two");
assert.equal(snakePreview.resourceBaseDir, "/library-two/notes");
assert.equal(snakePreview.resource_origin, snakePreview.resourceOrigin);
assert.equal(snakePreview.resource_root, snakePreview.resourceRoot);
assert.equal(snakePreview.resource_base_dir, snakePreview.resourceBaseDir);

// The image picker calls the shared adapter with `{ payload: request }`.
// Evaluate the real variant selector so a regression to
// `{ payload: { payload: request } }` fails here, before Tauri reports a
// misleading missing-field deserialization error.
const commandVariantsMatch = indexHtml.match(/function commandVariants\(command, args = \{\}\) \{[\s\S]*?\n      \}/);
assert.ok(commandVariantsMatch, "commandVariants must exist in dist/index.html");
const commandVariants = new Function(`return (${commandVariantsMatch[0]})`)();
const imageCopyRequest = {
  markdownFilePath: "/library/notes/readme.md",
  sourceImagePath: "/tmp/image.png"
};
const imageDeleteRequest = {
  markdownFilePath: "/library/notes/readme.md",
  imageSrc: "./assets/image.png"
};
for (const [command, request] of [
  ["copy_markdown_image_asset", imageCopyRequest],
  ["delete_markdown_image_asset", imageDeleteRequest]
]) {
  const wrapped = { payload: request };
  assert.deepEqual(
    commandVariants(command, wrapped),
    [wrapped],
    `${command} must preserve an existing payload without adding a second payload layer`
  );
  assert.deepEqual(
    commandVariants(command, request),
    [{ payload: request }],
    `${command} must wrap a bare request exactly once for compatibility`
  );
}

assert.match(
  indexHtml,
  /function resolveMarkdownImageUrl\(src, tab\)[\s\S]*?return toScopedResourceUrl\(targetPath, tab\);/,
  "Markdown image resolution must continue through the per-item scoped origin"
);
const imageResolverStart = indexHtml.indexOf("function resolveMarkdownImageUrl");
const imageResolverEnd = indexHtml.indexOf("function markdownImageAlignmentFromTitle", imageResolverStart);
assert.ok(imageResolverStart >= 0 && imageResolverEnd > imageResolverStart, "image resolver section must exist");
assert.doesNotMatch(
  indexHtml.slice(imageResolverStart, imageResolverEnd).replace(/\/\/.*$/gm, ""),
  /\/fs/,
  "Markdown image resolution must not restore the global /fs fallback"
);

assert.match(
  indexHtml,
  /\.markdown-document-main\s*\{[\s\S]*?position:\s*relative;[\s\S]*?z-index:\s*3;/,
  "the Markdown document column must establish a layer above the outline"
);
assert.match(
  indexHtml,
  /\.markdown-outline\s*\{[\s\S]*?z-index:\s*2;[\s\S]*?isolation:\s*isolate;/,
  "the outline layer contract must remain explicit"
);
assert.match(
  indexHtml,
  /\.markdown-insert-popover\s*\{[\s\S]*?left:\s*36px;[\s\S]*?top:\s*0;/,
  "the insert popover must be anchored to the right of the trigger"
);
assert.match(
  indexHtml,
  /\.markdown-document-overlay-host\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?z-index:\s*20;[\s\S]*?pointer-events:\s*none;/,
  "the insert menu needs a shell-level overlay host above outline/content stacking contexts"
);
assert.match(
  indexHtml,
  /data-markdown-shell-overlay/,
  "the Markdown document shell must render a dedicated overlay host"
);
assert.match(
  markdownEditorSource,
  /function resolveInsertMenuHost\(candidate = null\)[\s\S]*?shell\?\.querySelector\?\.\("\[data-markdown-shell-overlay\]"\)/,
  "the editor must resolve the sibling shell overlay host instead of relying on root.closest"
);
assert.match(
  markdownEditorSource,
  /insertMenuHost\s*=\s*resolveInsertMenuHost\(\);/,
  "fresh editor sessions must portal the insert menu to the shell overlay host"
);
assert.match(
  markdownEditorSource,
  /insertMenuHost\s*=\s*resolveInsertMenuHost\(host\);/,
  "preserved editor sessions must rebind the shell overlay host"
);
assert.doesNotMatch(
  markdownEditorSource,
  /root\.appendChild\(insertMenu\)/,
  "the insert menu must not remain a child of Milkdown root"
);
assert.match(
  markdownEditorSource,
  /rebindInsertMenuHost\(host = null\)/,
  "preserved editor sessions must be able to rebind the shell overlay host"
);

assert.equal(
  (indexHtml.match(/thumbnail-setup-card/g) || []).length,
  0,
  "thumbnail settings must not render permanent duplicate terminal/Agent setup cards"
);
assert.match(
  indexHtml,
  /id="settingsThumbnailInstallGuideButton"[\s\S]*?thumbnail-engine-help/,
  "the existing !/? help button must remain the thumbnail tutorial entry"
);
assert.match(
  indexHtml,
  /function showThumbnailInstallStepsDialog\(\)[\s\S]*?data-thumbnail-method="terminal"[\s\S]*?data-thumbnail-method="agent"/,
  "the sole thumbnail tutorial entry must keep both installation methods"
);
assert.match(
  indexHtml,
  /\.thumbnail-engine-help::after\s*\{[\s\S]*?left:\s*0;[\s\S]*?max-width:\s*min\(280px,\s*calc\(100vw - 96px\)\)/,
  "the thumbnail help tooltip must stay inside the settings surface"
);
assert.doesNotMatch(
  indexHtml,
  /\.thumbnail-engine-help::after\s*\{[^}]*left:\s*50%;/,
  "the thumbnail help tooltip must not be centered outside the narrow settings surface"
);

console.log("Markdown image resource normalization and insert-menu layering checks passed");
