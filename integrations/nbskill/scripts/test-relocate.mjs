#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { activeHtmlContractIssues, readManifest } from "./manifest-lib.mjs";
const run = promisify(execFile);
const script = fileURLToPath(new URL("relocate.mjs", import.meta.url));
const root = mkdtempSync(join(tmpdir(), "nbskill-relocate-"));
mkdirSync(join(root, ".agent-outputs"));
mkdirSync(join(root, "output", "废稿"), { recursive: true });
const html = '<html data-nutbook-edit-contract="nutbook-html/v1"><body><p data-id="body" data-editable="text">Text</p></body></html>';
for (const [path, content] of [["a.md", "# A"], ["b.md", "# B"], ["c.html", html], ["asset.png", "image"]]) writeFileSync(join(root, "output", "废稿", path), content);
const manifestPath = join(root, ".agent-outputs", "manifest.json");
let movesSequence = 0;
const entry = (id, path) => ({ id, path, state: "active", skill: { name: "writer", version: "1.0" }, kind: "document", title: id, generatedAt: "2026-10-19T00:00:00Z" });
const original = { schemaVersion: 1, projectRoot: ".", entries: [
  { ...entry("a", "old/a.md"), relatedFiles: [{ path: "old/asset.png", role: "asset" }] },
  { ...entry("b", "old/b.md"), relatedFiles: [{ path: "old/asset.png", role: "asset" }] },
  { ...entry("c", "old/c.html"), editContract: "nutbook-html/v1", savePolicy: "managed-source" },
  { ...entry("retired", "old/retired.md"), state: "superseded", supersededBy: "a", relatedFiles: [{ path: "old/asset.png", role: "asset" }] },
] };
const moves = ["a.md", "b.md", "c.html", "asset.png"].map(name => ({ from: `old/${name}`, to: `output/废稿/${name}` }));
const seed = (manifest = original) => writeFileSync(manifestPath, JSON.stringify(manifest));
const invoke = async (mapping = moves, extra = []) => {
  // Each child owns an immutable input. Rewriting one shared moves.json can
  // truncate it while another concurrently launched child is reading it.
  const movesPath = join(root, `moves-${++movesSequence}.json`);
  writeFileSync(movesPath, JSON.stringify(mapping), { flag: "wx" });
  return run(process.execPath, [script, "--project-root", root, "--moves", movesPath, ...extra]);
};
seed();
const before = readFileSync(manifestPath, "utf8");
await invoke(moves, ["--dry-run"]);
assert.equal(readFileSync(manifestPath, "utf8"), before);
await invoke();
const repairedBytes = readFileSync(manifestPath, "utf8");
const repaired = JSON.parse(repairedBytes);
const expected = structuredClone(original);
for (const item of expected.entries) {
  item.path = moves.find(move => move.from === item.path)?.to || item.path;
  for (const related of item.relatedFiles || []) related.path = moves.find(move => move.from === related.path)?.to || related.path;
}
assert.deepEqual(repaired, expected, "only explicit references change, including shared retired attachments");
await Promise.all([invoke(), invoke()]);
assert.equal(readFileSync(manifestPath, "utf8"), repairedBytes, "concurrent retries are idempotent");

async function rejectsUnchanged(mapping, manifest = original) {
  seed(manifest);
  const bytes = readFileSync(manifestPath, "utf8");
  await assert.rejects(invoke(mapping));
  assert.equal(readFileSync(manifestPath, "utf8"), bytes, "failed batches preserve exact manifest bytes");
}
await rejectsUnchanged(moves.slice(0, -1)); // unresolved attachment
await rejectsUnchanged(moves.slice(1)); // unresolved primary
await rejectsUnchanged([...moves, { from: "unknown.md", to: "output/废稿/a.md" }]);
await rejectsUnchanged(moves.map(move => move.from.endsWith("b.md") ? { ...move, to: "output/废稿/a.md" } : move));
await rejectsUnchanged(moves.map(move => move.from.endsWith("b.md") ? { ...move, to: "output/missing.md" } : move));
await rejectsUnchanged([...moves, { from: "../outside.md", to: "output/废稿/b.md" }]);
await rejectsUnchanged([...moves, { from: "output/废稿/a.md", to: "old/a.md" }]);
const duplicate = structuredClone(original);
duplicate.entries.push(entry("duplicate", "output/废稿/a.md"));
await rejectsUnchanged(moves, duplicate);
symlinkSync(tmpdir(), join(root, "escape"));
await rejectsUnchanged(moves.map(move => move.from.endsWith("a.md") ? { ...move, from: "escape/missing-nbskill.md" } : move), { ...original, entries: original.entries.map(item => item.id === "a" ? { ...item, path: "escape/missing-nbskill.md" } : item) });
symlinkSync(join(root, "absent"), join(root, "dangling"));
await rejectsUnchanged([...moves, { from: "dangling/a.md", to: "output/废稿/retired.md" }]);
const outside = mkdtempSync(join(tmpdir(), "nbskill-relocate-outside-"));
writeFileSync(join(outside, "a.md"), "# outside");
symlinkSync(join(outside, "a.md"), join(root, "linked.md"));
await rejectsUnchanged(moves.map(move => move.from.endsWith("a.md") ? { ...move, to: "linked.md" } : move));
writeFileSync(join(root, "output/废稿/c.html"), "<html><body>Uneditable</body></html>");
seed();
await invoke();
assert.equal(activeHtmlContractIssues(readManifest(root), root).length, 1, "path-only recovery preserves and reports legacy HTML incompatibility");
writeFileSync(manifestPath, "{broken");
await assert.rejects(invoke());
assert.equal(readFileSync(manifestPath, "utf8"), "{broken");
console.log("nbskill batch relocation: primaries, shared attachments, retry, locking, containment, HTML and atomic failure passed");
