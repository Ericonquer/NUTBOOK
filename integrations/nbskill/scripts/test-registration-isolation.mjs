#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
const run = promisify(execFile);
const register = fileURLToPath(new URL("register.mjs", import.meta.url));
const validate = fileURLToPath(new URL("validate.mjs", import.meta.url));
const supersede = fileURLToPath(new URL("supersede.mjs", import.meta.url));
const root = mkdtempSync(join(tmpdir(), "nbskill-registration-isolation-"));
mkdirSync(join(root, ".agent-outputs"));
const path = join(root, ".agent-outputs/manifest.json");
const oldEntry = (id, file) => ({ id, path: file, state: "active", skill: { name: "writer" }, kind: "document" });
const oldEntries = [
  { ...oldEntry("old-a", "moved/a.md"), relatedFiles: [{ path: "moved/cover.png", role: "asset" }] },
  oldEntry("old-b", "moved/b.md"),
  { ...oldEntry("legacy", "moved/legacy.html"), editContract: "nutbook-html/v1", savePolicy: "managed-source" },
  { ...oldEntry("retired", "retired.md"), state: "removed", relatedFiles: [{ path: "moved/data.csv", role: "data" }] },
];
const seed = (entries = oldEntries) => writeFileSync(path, JSON.stringify({ schemaVersion: 1, projectRoot: ".", entries }));
writeFileSync(join(root, "new.md"), "# New deliverable\n");
writeFileSync(join(root, "new.html"), '<html data-nutbook-edit-contract="nutbook-html/v1"><body><p data-id="text" data-editable="text">New</p></body></html>');
const invoke = (id = "new", file = "new.md", extra = []) => run(process.execPath, [register, "--project-root", root, "--id", id, "--path", file, "--skill", "writer", "--kind", "document", ...extra]);
seed();
const registered = await invoke();
assert.equal(registered.stdout, "");
assert.equal(registered.stderr, "");
assert.deepEqual(JSON.parse(readFileSync(path)).entries.slice(0, oldEntries.length), oldEntries, "all stale entries and attachments are preserved exactly");
const beforeRetry = statSync(path, { bigint: true }).mtimeNs;
assert.equal((await invoke()).stderr, "");
assert.equal(statSync(path, { bigint: true }).mtimeNs, beforeRetry, "quiet no-op registration does not rewrite manifest");
const concurrent = await Promise.allSettled([invoke("new-html", "new.html"), invoke("parallel", "new.md", ["--title", "parallel"])]);
assert.equal(concurrent[0].status, "fulfilled");
assert.equal(concurrent[1].status, "rejected", "duplicate active path must fail");
const goodEntries = JSON.parse(readFileSync(path)).entries;
assert.equal(goodEntries.filter(entry => entry.id === "new-html").length, 1);
await assert.rejects(run(process.execPath, [validate, "--project-root", root]), /ENOENT/, "explicit full-project diagnostics remain strict");
seed();
await run(process.execPath, [supersede, "--project-root", root, "--old-id", "old-a", "--new-id", "replacement", "--path", "new.md", "--skill", "writer", "--kind", "document"]);
const replaced = JSON.parse(readFileSync(path));
assert.equal(replaced.entries[0].state, "superseded");
assert.deepEqual(replaced.entries.slice(1, oldEntries.length), oldEntries.slice(1), "supersede also preserves unrelated stale entries");

async function rejectsUnchanged(id, file, extra = [], entries = oldEntries) {
  seed(entries);
  const before = readFileSync(path, "utf8");
  await assert.rejects(invoke(id, file, extra));
  assert.equal(readFileSync(path, "utf8"), before);
}
await rejectsUnchanged("missing", "missing.md");
await rejectsUnchanged("asset-missing", "new.md", ["--related", "missing.png:asset"]);
await rejectsUnchanged("unsafe-new", "../outside.md");
await rejectsUnchanged("unsafe-old", "new.md", [], [{ ...oldEntries[0], path: "../outside.md" }]);
await rejectsUnchanged("duplicate", "new.md", [], [...oldEntries, { ...oldEntries[0] }]);
writeFileSync(join(root, "bad.html"), "<html><body>Uneditable</body></html>");
await rejectsUnchanged("bad-html", "bad.html");
symlinkSync(tmpdir(), join(root, "escape"));
await rejectsUnchanged("outside-old", "new.md", [], [oldEntry("old", "escape/missing-nbskill.md")]);
symlinkSync(join(root, "missing-target"), join(root, "dangling"));
await rejectsUnchanged("dangling-old", "new.md", [], [oldEntry("old", "dangling/file.md")]);
// Updating an existing ID validates its own attachments, even if the old ones
// are absent; metadata cannot turn a broken current delivery into success.
await rejectsUnchanged("current", "new.md", ["--related", "missing.png:asset"], [...oldEntries, oldEntry("current", "new.md")]);
seed([...oldEntries, { ...oldEntry("current", "new.md"), relatedFiles: [{ path: "gone.png", role: "asset" }] }]);
await invoke("current", "new.md");
assert.equal(JSON.parse(readFileSync(path)).entries.at(-1).relatedFiles, undefined);
writeFileSync(path, "{broken");
await assert.rejects(invoke());
assert.equal(readFileSync(path, "utf8"), "{broken");
console.log("nbskill registration isolation: stale primaries/attachments stay silent; current delivery, conflicts and safety remain strict");
