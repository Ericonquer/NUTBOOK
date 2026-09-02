import assert from "node:assert/strict";
import test from "node:test";
import { findDocumentMatches, replacementPlan } from "../src/markdown-find-engine.js";

function text(value) { return { isText: true, text: value }; }
function atom(name = "image") { return { isAtom: true, type: { name } }; }
function block(parts) {
  return {
    isTextblock: true,
    descendants(callback) { parts.forEach(([node, pos]) => callback(node, pos)); }
  };
}
function doc(blocks) {
  return { descendants(callback) { blocks.forEach(([node, pos]) => callback(node, pos)); } };
}

test("does not join text across textblock or atom sentinels", () => {
  assert.deepEqual(findDocumentMatches(doc([[block([[text("松塔"), 0]]), 0], [block([[text("协议"), 0]]), 6]]), "松塔协议"), []);
  assert.deepEqual(findDocumentMatches(doc([[block([[text("松塔"), 0], [atom(), 2], [text("协议"), 3]]), 0]]), "松塔协议"), []);
});

test("matches adjacent marked text and returns descending replacement plan", () => {
  const matches = findDocumentMatches(doc([[block([[text("松塔"), 0], [text("协议 松塔协议"), 2]]), 0]]), "松塔协议");
  assert.deepEqual(matches, [{ from: 1, to: 5 }, { from: 6, to: 10 }]);
  assert.deepEqual(replacementPlan(matches), [{ from: 6, to: 10 }, { from: 1, to: 5 }]);
});
