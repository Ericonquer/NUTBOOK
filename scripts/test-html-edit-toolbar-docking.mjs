import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const runtime = readFileSync("dist/assets/html-edit-runtime.js", "utf8");
const startMarker = "// NUTBOOK_HTML_EDIT_DOCKING_START";
const endMarker = "// NUTBOOK_HTML_EDIT_DOCKING_END";
const start = runtime.indexOf(startMarker);
const end = runtime.indexOf(endMarker);

assert.ok(start >= 0, "toolbar docking helpers must have a start marker");
assert.ok(end > start, "toolbar docking helpers must have an end marker");

const context = { Math };
vm.createContext(context);
vm.runInContext(runtime.slice(start + startMarker.length, end), context, {
  filename: "dist/assets/html-edit-runtime.js:toolbar-docking"
});

const { normalizeInlineToolbarDock, resolveInlineToolbarDock, clampInlineToolbarOffset } = context;

assert.equal(normalizeInlineToolbarDock("bottom"), "bottom");
assert.equal(normalizeInlineToolbarDock("left"), "left");
assert.equal(normalizeInlineToolbarDock("right"), "right");
assert.equal(normalizeInlineToolbarDock("floating"), "bottom");

assert.equal(resolveInlineToolbarDock({ left: 120, right: 520, viewportWidth: 640, edgeInset: 16, snapDistance: 48 }), "bottom");
assert.equal(resolveInlineToolbarDock({ left: 17, right: 617, viewportWidth: 640, edgeInset: 16, snapDistance: 48 }), "left");
assert.equal(resolveInlineToolbarDock({ left: 23, right: 623, viewportWidth: 640, edgeInset: 16, snapDistance: 48 }), "right");

assert.equal(clampInlineToolbarOffset(-100, 80, 400, 16), 16);
assert.equal(clampInlineToolbarOffset(900, 80, 400, 16), 304);
assert.equal(clampInlineToolbarOffset(32, 480, 400, 16), 16);

assert.match(runtime, /data-intent="drag-handle"/, "only a dedicated handle may start toolbar dragging");
assert.match(runtime, /dragHandle\.innerHTML = `\$\{tooltip\("move"\)\}<svg[^>]*viewBox="0 0 20 20"/, "the drag handle must use a visible inline SVG instead of a font-dependent glyph");
assert.match(runtime, /\.bar \.drag-handle\{[^}]*color:#9ca3af/, "the drag handle must be subdued at rest");
assert.match(runtime, /\.bar \.drag-handle:hover[^}]*color:#3f3f46/, "the drag handle must become clearer only on hover or keyboard focus");
assert.match(runtime, /flex-direction:column;flex-wrap:nowrap;max-height:calc\(100vh - 32px\)/, "side docks must become vertical toolbars");
assert.match(runtime, /flex-direction:column;flex-wrap:nowrap;overflow-y:auto/, "only side-dock commands may scroll vertically");
assert.match(runtime, /button\[data-intent\].*?flex:0 0 auto/, "save and Done must remain visible in side docks");
assert.match(runtime, /circle cx="7" cy="5"[^>]*\/><circle cx="13" cy="5"[^>]*\/><circle cx="7" cy="10"/, "the visible drag handle must use a compact six-dot grip");
assert.match(runtime, /\.bar\[data-dock=\\"left\\"\] \.drag-handle svg,.bar\[data-dock=\\"right\\"\] \.drag-handle svg\{transform:rotate\(90deg\)\}/, "side docks must rotate the six-dot grip into a horizontal handle");
assert.match(runtime, /overflow-y:auto;overflow-x:hidden;scrollbar-width:none/, "side command scrolling must not produce a horizontal or visible native scrollbar");
assert.match(runtime, /::-webkit-scrollbar\{display:none\}/, "WebKit side command scrollbars must stay hidden during docking");
assert.match(runtime, /saveButton\.innerHTML = `\$\{tooltip\("save"\)\}<svg/, "Save must use an inline SVG action icon");
assert.match(runtime, /doneButton\.innerHTML = `\$\{tooltip\("done"\)\}<svg/, "Done must use an inline SVG action icon");
assert.match(runtime, /\.bar\[data-dock=\\"left\\"\] \.tooltip\{left:calc\(100% \+ 8px\);top:50%;bottom:auto/, "left dock tooltips must open into the page, not over the toolbar");
assert.match(runtime, /\.bar\[data-dock=\\"right\\"\] \.tooltip\{left:auto;right:calc\(100% \+ 8px\);top:50%;bottom:auto/, "right dock tooltips must open into the page, not over the toolbar");
assert.match(runtime, /data-side-tooltip/, "side docks must provide a tooltip layer outside the scrolling command container");
assert.match(runtime, /sideTooltip\.className = "side-tooltip"/, "the root side-tooltip element must receive the fixed-position tooltip class");
assert.match(runtime, /showInlineToolbarSideTooltip/, "side-dock buttons must publish tooltip content into the root tooltip layer");
assert.match(runtime, /\.bar\[data-dock=\\"left\\"\] \.tooltip,.bar\[data-dock=\\"right\\"\] \.tooltip\{display:none\}/, "clipped per-button tooltips must be hidden in side docks");
assert.match(runtime, /\.bar button\[disabled\] \.tooltip\{display:none\}/, "disabled format buttons must never expose a tooltip in any dock position");
assert.match(runtime, /M5 3h8l3 3v11H4V3h1Z/, "Save must use a recognizable outlined save icon rather than a download arrow");
assert.match(runtime, /startInlineToolbarDrag/, "toolbar dragging must have a pointerdown entry point");
assert.match(runtime, /finishInlineToolbarDrag/, "toolbar dragging must resolve on pointerup or cancellation");
assert.match(runtime, /pointercancel/, "pointer cancellation must reset docking safely");
assert.doesNotMatch(runtime, /html_edit_[^"']*dock/, "dock state must never cross the runtime IPC boundary");
assert.doesNotMatch(runtime, /inlineToolbarDock[^\n]*changes/, "dock state must never enter a document patch");

console.log("HTML edit toolbar docking guards passed.");
