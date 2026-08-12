#!/usr/bin/env node
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { activeHtmlContractIssues, parseArgs, readManifest, resolveProjectRoot, validateManifest } from "./manifest-lib.mjs";

function usage() {
  return "Usage: validate.mjs --project-root <path>\n       validate.mjs --self-test";
}

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
  } else if (options["self-test"]) {
    const root = mkdtempSync(join(tmpdir(), "nbskill-self-test-"));
    mkdirSync(join(root, "outputs"));
    writeFileSync(join(root, "outputs", "report.md"), "# nbskill self-test\n");
    writeFileSync(join(root, "outputs", "legacy-code.html"), '<!doctype html><html data-nutbook-edit-contract="nutbook-html/v1"><body><p data-id="legacy-code" data-editable="rich-text" data-edit-role="short">Run <code>nbskill</code>.</p></body></html>');
    const manifest = {
      schemaVersion: 1,
      projectRoot: ".",
      entries: [
        { id: "self-test", path: "outputs/report.md", state: "active", skill: { name: "nbskill" }, kind: "report" },
        { id: "legacy-code", path: "outputs/legacy-code.html", state: "active", skill: { name: "nbskill" }, kind: "document", editContract: "nutbook-html/v1", savePolicy: "managed-source" },
      ],
    };
    validateManifest(manifest, root);
    const issues = activeHtmlContractIssues(manifest, root);
    if (issues.length) throw new Error(issues[0].message);
    console.log("nbskill self-test passed");
  } else {
    const root = resolveProjectRoot(options["project-root"] || "");
    const manifest = readManifest(root);
    const issues = activeHtmlContractIssues(manifest, root);
    console.log(`valid nbskill manifest structure v${manifest.schemaVersion}: ${manifest.entries.length} entries`);
    if (issues.length) {
      for (const issue of issues) {
        console.error(`incompatible active HTML ${issue.id} (${issue.path}): ${issue.message}`);
      }
      throw new Error(`${issues.length} active HTML ${issues.length === 1 ? "artifact requires" : "artifacts require"} repair or scripted supersede`);
    }
    console.log(`valid nbskill editable HTML contracts: ${manifest.entries.filter((entry) => entry.state === "active" && /\.html?$/iu.test(entry.path)).length}`);
  }
} catch (error) {
  console.error(`nbskill validation failed: ${error.message}`);
  process.exitCode = 1;
}
