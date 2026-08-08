#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { activeHtmlContractIssues, readManifest } from "./manifest-lib.mjs";

const run = promisify(execFile);
const scripts = dirname(new URL(import.meta.url).pathname);
const register = join(scripts, "register.mjs");
const supersede = join(scripts, "supersede.mjs");
const validate = join(scripts, "validate.mjs");
const fixtureRoot = resolve("src-tauri/tests/fixtures/agent-artifact-discovery/projects/sample-agent-project");
const invalidVectors = resolve("src-tauri/tests/fixtures/agent-artifact-discovery/contract-vectors/invalid");

async function runNode(script, args) {
  return run(process.execPath, [script, ...args], { cwd: resolve(".") });
}

const root = mkdtempSync(join(tmpdir(), "nbskill-scripts-"));
mkdirSync(join(root, "docs"), { recursive: true });
mkdirSync(join(root, "assets"), { recursive: true });
writeFileSync(join(root, "docs", "report-v1.md"), "# v1\n");
writeFileSync(join(root, "docs", "report-v2.md"), "# v2\n");
writeFileSync(join(root, "docs", "parallel-a.md"), "# a\n");
writeFileSync(join(root, "docs", "parallel-b.md"), "# b\n");
writeFileSync(join(root, "assets", "cover.png"), "fixture");
writeFileSync(join(root, "docs", "complete.html"), `<!doctype html>
<html data-nutbook-edit-contract="nutbook-html/v1">
  <body>
    <h1 data-id="complete-title" data-editable="text">Complete title</h1>
    <div data-id="complete-body" data-editable="rich-text" data-edit-role="content"><p>Complete body</p></div>
    <img data-id="complete-cover" data-editable="image" src="../assets/cover.png" alt="Cover">
  </body>
</html>
`);
writeFileSync(join(root, "docs", "partial.html"), `<!doctype html>
<html data-nutbook-edit-contract="nutbook-html/v1">
  <body>
    <h1 data-id="partial-title" data-editable="text">Editable title</h1>
    <p>This visible paragraph was not marked editable.</p>
  </body>
</html>
`);
writeFileSync(join(root, "docs", "layout-rich.html"), `<!doctype html>
<html data-nutbook-edit-contract="nutbook-html/v1">
  <body>
    <section data-id="layout-section" data-editable="rich-text" data-edit-role="content">
      <h2 class="section-title">Layout-owned heading</h2>
      <div class="card">Layout-owned card</div>
    </section>
  </body>
</html>
`);
writeFileSync(join(root, "docs", "unsupported-inline.html"), `<!doctype html>
<html data-nutbook-edit-contract="nutbook-html/v1">
  <body>
    <p data-id="inline-copy" data-editable="rich-text" data-edit-role="short">Use <code class="mono">nbskill</code> safely.</p>
  </body>
</html>
`);
writeFileSync(join(root, "docs", "legacy-inline-code.html"), `<!doctype html>
<html data-nutbook-edit-contract="nutbook-html/v1">
  <body>
    <p data-id="legacy-inline-code" data-editable="rich-text" data-edit-role="short">Run <code>nbskill</code> safely.</p>
  </body>
</html>
`);

await runNode(register, ["--project-root", root, "--id", "report-v1", "--path", "docs/report-v1.md", "--skill", "report-writer", "--kind", "report", "--related", "assets/cover.png:asset"]);
let manifest = readManifest(root);
assert.equal(manifest.entries.length, 1);
assert.equal(manifest.entries[0].relatedFiles[0].path, "assets/cover.png");

await runNode(register, ["--project-root", root, "--id", "complete-html", "--path", "docs/complete.html", "--skill", "html-writer", "--kind", "document", "--related", "assets/cover.png:asset"]);
manifest = readManifest(root);
const completeHtml = manifest.entries.find((entry) => entry.id === "complete-html");
assert.equal(completeHtml.editContract, "nutbook-html/v1");
assert.equal(completeHtml.savePolicy, "managed-source");
await runNode(register, ["--project-root", root, "--id", "legacy-inline-code", "--path", "docs/legacy-inline-code.html", "--skill", "html-writer", "--kind", "document"]);
await assert.rejects(
  runNode(register, ["--project-root", root, "--id", "partial-html", "--path", "docs/partial.html", "--skill", "html-writer", "--kind", "document"]),
  /visible text outside an editable target/
);
assert.equal(readManifest(root).entries.some((entry) => entry.id === "partial-html"), false);
await assert.rejects(
  runNode(register, ["--project-root", root, "--id", "layout-rich", "--path", "docs/layout-rich.html", "--skill", "html-writer", "--kind", "document"]),
  /rich-text target layout-section contains attributes Nutbook cannot preserve/
);
await assert.rejects(
  runNode(register, ["--project-root", root, "--id", "unsupported-inline", "--path", "docs/unsupported-inline.html", "--skill", "html-writer", "--kind", "document"]),
  /rich-text target inline-copy contains attributes Nutbook cannot preserve on <code>/
);

await Promise.all([
  runNode(register, ["--project-root", root, "--id", "parallel-a", "--path", "docs/parallel-a.md", "--skill", "nbskill", "--kind", "document"]),
  runNode(register, ["--project-root", root, "--id", "parallel-b", "--path", "docs/parallel-b.md", "--skill", "nbskill", "--kind", "document"]),
]);
manifest = readManifest(root);
assert.deepEqual(new Set(manifest.entries.map((entry) => entry.id)), new Set(["report-v1", "complete-html", "legacy-inline-code", "parallel-a", "parallel-b"]));

await runNode(supersede, ["--project-root", root, "--old-id", "report-v1", "--new-id", "report-v2", "--path", "docs/report-v2.md", "--skill", "report-writer", "--kind", "report"]);
manifest = readManifest(root);
assert.equal(manifest.entries.find((entry) => entry.id === "report-v1").supersededBy, "report-v2");
assert.equal(manifest.entries.find((entry) => entry.id === "report-v2").state, "active");

const legacyRoot = mkdtempSync(join(tmpdir(), "nbskill-legacy-supersede-"));
mkdirSync(join(legacyRoot, "output"), { recursive: true });
mkdirSync(join(legacyRoot, ".agent-outputs"), { recursive: true });
writeFileSync(join(legacyRoot, "output", "legacy.html"), `<!doctype html>
<html data-nutbook-edit-contract="nutbook-html/v1"><body>
  <h1 data-id="legacy-title" data-editable="text">Legacy title</h1>
  <p>Legacy unmarked text</p>
</body></html>
`);
writeFileSync(join(legacyRoot, "output", "replacement.html"), `<!doctype html>
<html data-nutbook-edit-contract="nutbook-html/v1"><body>
  <h1 data-id="replacement-title" data-editable="text">Replacement title</h1>
  <p data-id="replacement-copy" data-editable="rich-text" data-edit-role="short">Safe <strong>replacement</strong>.</p>
</body></html>
`);
writeFileSync(join(legacyRoot, "output", "recovery.md"), "# Recovery remains possible\n");
writeFileSync(join(legacyRoot, ".agent-outputs", "manifest.json"), `${JSON.stringify({
  schemaVersion: 1,
  projectRoot: ".",
  entries: [{
    id: "legacy-html",
    path: "output/legacy.html",
    state: "active",
    skill: { name: "legacy-writer" },
    kind: "document",
    editContract: "nutbook-html/v1",
    savePolicy: "managed-source",
  }],
}, null, 2)}\n`);
const legacyManifest = readManifest(legacyRoot);
assert.equal(legacyManifest.entries[0].id, "legacy-html", "legacy manifest structure remains readable");
assert.match(activeHtmlContractIssues(legacyManifest, legacyRoot)[0].message, /visible text outside an editable target/);
await assert.rejects(
  runNode(validate, ["--project-root", legacyRoot]),
  /active HTML artifact requires repair or scripted supersede/
);
await runNode(register, ["--project-root", legacyRoot, "--id", "recovery-note", "--path", "output/recovery.md", "--skill", "nbskill", "--kind", "document"]);
await runNode(supersede, ["--project-root", legacyRoot, "--old-id", "legacy-html", "--new-id", "replacement-html", "--path", "output/replacement.html", "--skill", "html-writer", "--kind", "document"]);
const repairedManifest = readManifest(legacyRoot);
assert.equal(repairedManifest.entries.find((entry) => entry.id === "legacy-html").state, "superseded");
assert.equal(repairedManifest.entries.find((entry) => entry.id === "replacement-html").state, "active");
assert.deepEqual(activeHtmlContractIssues(repairedManifest, legacyRoot), []);

const manifestFile = join(root, ".agent-outputs", "manifest.json");
writeFileSync(manifestFile, "{ broken json\n");
const corruptBytes = readFileSync(manifestFile, "utf8");
await assert.rejects(runNode(register, ["--project-root", root, "--id", "must-not-write", "--path", "docs/report-v2.md", "--skill", "nbskill", "--kind", "report"]));
assert.equal(readFileSync(manifestFile, "utf8"), corruptBytes, "a corrupt manifest must remain untouched");

const vectorRoot = mkdtempSync(join(tmpdir(), "nbskill-vectors-"));
cpSync(fixtureRoot, vectorRoot, { recursive: true, dereference: false });
for (const name of ["absolute-path.json", "duplicate-active-path.json", "duplicate-id.json", "invalid-save-policy.json", "managed-source-without-contract.json", "outside-symlink.json", "parent-traversal.json", "unknown-schema-version.json"]) {
  writeFileSync(join(vectorRoot, ".agent-outputs", "manifest.json"), readFileSync(join(invalidVectors, name)));
  assert.throws(() => readManifest(vectorRoot), `${name} must be rejected`);
}

const symlinkRoot = mkdtempSync(join(tmpdir(), "nbskill-symlink-"));
mkdirSync(join(symlinkRoot, "docs"));
const outside = join(tmpdir(), `nbskill-outside-${process.pid}.md`);
writeFileSync(outside, "outside\n");
symlinkSync(outside, join(symlinkRoot, "docs", "linked.md"));
mkdirSync(join(symlinkRoot, ".agent-outputs"));
writeFileSync(join(symlinkRoot, ".agent-outputs", "manifest.json"), JSON.stringify({ schemaVersion: 1, projectRoot: ".", entries: [{ id: "outside", path: "docs/linked.md", state: "active", skill: { name: "nbskill" }, kind: "document" }] }));
assert.throws(() => readManifest(symlinkRoot), /outside the project root/);

console.log("nbskill registrar, supersede, concurrency, corruption, and safety checks passed");
