import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";

const samplePath = "src-tauri/tests/fixtures/html-edit/editable-image.html";

assert.ok(
  existsSync(samplePath),
  "Phase 1B must provide a user-openable image-edit acceptance artifact"
);

const html = readFileSync(samplePath, "utf8");
const dataIds = [...html.matchAll(/\bdata-id="([^"]+)"/g)].map((match) => match[1]);
const offlineImagePaths = [
  "src-tauri/tests/fixtures/html-edit/editable-image-assets/hero.png",
  "src-tauri/tests/fixtures/html-edit/editable-image-assets/evidence.png",
  "src-tauri/tests/fixtures/html-edit/editable-image-assets/delivery.png",
];

assert.match(
  html,
  /<img\b[^>]*\bdata-editable="image"[^>]*\bdata-id="brief-hero"/,
  "the brief must include an explicitly editable hero image"
);
assert.match(
  html,
  /<img\b(?=[^>]*\bdata-editable="image")(?=[^>]*\bdata-image-slot="empty")(?=[^>]*\bdata-id="brief-insert-slot")(?![^>]*\bsrc=)[^>]*>/,
  "the brief must include one explicit empty image insertion slot"
);
const pictureSourceSrcsets = [...html.matchAll(/<source\b[^>]*\bsrcset="([^"]+)"[^>]*>/g)]
  .map((match) => match[1]);
assert.ok(pictureSourceSrcsets.length > 0, "the brief must include a picture source");
assert.ok(
  pictureSourceSrcsets.every((srcset) => !/\s[0-9]+(?:w|x)(?:\s*,|$)/.test(srcset)),
  "the Phase 1B picture source must use one URL without responsive descriptors"
);
assert.match(
  html,
  /<picture>\s*<source\b[^>]*\bsrcset="[^"]+"[^>]*>\s*<img\b[^>]*\bdata-editable="image"[^>]*\bdata-id="brief-evidence"/,
  "the brief must include an editable picture image with a direct responsive source"
);
assert.match(
  html,
  /\bdata-editable="background-image"[^>]*\bdata-id="brief-delivery-bg"/,
  "the brief must include an explicitly editable background image"
);
assert.equal(
  new Set(dataIds).size,
  dataIds.length,
  "all editable protocol ids must be unique"
);
assert.ok(dataIds.length >= 5, "the sample must retain text context alongside its three image targets");
assert.doesNotMatch(html, /https?:\/\//, "the sample must not depend on remote images, fonts, or scripts");
assert.doesNotMatch(html, /data:image\//, "the initial image state must use files that the HTML runtime can load");
for (const imagePath of offlineImagePaths) {
  assert.ok(existsSync(imagePath), `the offline acceptance image must exist: ${imagePath}`);
}
assert.match(html, /editable-image-assets\/hero\.png/, "the brief must include an offline hero image");
assert.match(html, /editable-image-assets\/evidence\.png/, "the brief must include an offline picture image");
assert.match(html, /editable-image-assets\/delivery\.png/, "the brief must include an offline background image");

console.log("HTML edit image acceptance artifact checks passed.");

const phase1dSamplePath = "src-tauri/tests/fixtures/html-edit/editable-free-image.html";
const phase1dExistingImagePath = "src-tauri/tests/fixtures/html-edit/editable-image-assets/hero.png";
assert.ok(existsSync(phase1dSamplePath), "Phase 1D must provide a user-openable free-image artifact");
assert.ok(existsSync(phase1dExistingImagePath) && statSync(phase1dExistingImagePath).size > 0, "Phase 1D must use a real offline existing image");
const phase1dHtml = readFileSync(phase1dSamplePath, "utf8");
assert.match(phase1dHtml, /data-editable="rich-text"/, "Phase 1D artifact needs editable text");
assert.match(phase1dHtml, /data-editable="image"[^>]*src="editable-image-assets\/hero\.png"/, "Phase 1D artifact needs an existing offline image target");
assert.match(phase1dHtml, /class="free-image-space"/, "Phase 1D artifact needs a visible free-image space");
assert.match(phase1dHtml, /img, button \{/, "Phase 1D artifact must exercise hostile source CSS isolation");
assert.doesNotMatch(phase1dHtml, /data-nutbook-inserted-image-id|<script\b|<iframe\b|https?:\/\//, "Phase 1D artifact must be offline and have no persisted insertion overlay");
console.log("HTML free-image Phase 1D acceptance artifact checks passed.");
