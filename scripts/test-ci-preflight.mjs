import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");
const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));
const preflight = read("scripts/check-ci.mjs");
const ciWorkflow = read(".github/workflows/ci.yml");
const releaseWorkflow = read(".github/workflows/build-app.yml");

assert.equal(read(".nvmrc").trim(), "22", ".nvmrc must pin the CI Node major");
assert.equal(packageJson.engines?.node, ">=22 <23", "package metadata must reject Node majors other than CI's Node 22");
assert.equal(packageLock.packages?.[""]?.engines?.node, ">=22 <23", "the lockfile must preserve the Node major contract");
assert.equal(packageJson.scripts?.["check:ci"], "node scripts/check-ci.mjs quality");
assert.equal(packageJson.scripts?.["check:ci:windows"], "node scripts/check-ci.mjs windows");
assert.match(packageJson.scripts?.["check:regressions"] ?? "", /^node scripts\/test-ci-preflight\.mjs && /, "regressions must enforce the CI gate contract first");

assert.match(preflight, /const EXPECTED_NODE_MAJOR = 22;/, "the local gate must reject a mismatched Node major");
assert.match(preflight, /\["npm", \["ci"\]\]/, "both CI gates must start from a clean npm install");
assert.match(preflight, /\["npx", \["playwright", "install", "chromium"\]\]/, "the quality gate must install the same Chromium runtime as CI");
assert.match(preflight, /\["npm", \["run", "check:regressions"\]\]/, "the quality gate must include runtime regressions");
assert.match(preflight, /\["cargo", \["test", "--manifest-path", "src-tauri\/Cargo.toml", "--test", "html_edit", "--", "--nocapture"\]\]/, "the quality gate must include HTML edit integration tests");
assert.match(preflight, /process\.platform === "win32"/, "the runner must select Windows-compatible npm executables");
assert.match(preflight, /\? `\$\{command\}\.cmd`/, "Windows npm and npx commands must use their .cmd shims");
assert.match(preflight, /shell:\s*process\.platform === "win32"/, "Windows .cmd shims must run through cmd.exe rather than direct spawn");
assert.match(preflight, /\["cargo", \["check", "--release", "--manifest-path", "src-tauri\/Cargo.toml", "--bins"\]\]/, "the quality gate must compile release-profile binaries before a tag can discover cfg errors");
const windowsCommands = preflight.slice(
  preflight.indexOf("const WINDOWS_COMMANDS"),
  preflight.indexOf("const commandsByMode"),
);
assert.match(windowsCommands, /\["npm", \["run", "prepare:nutbook-cli"\]\]/, "the Windows gate must execute the release beforeBuild CLI preparation path");
assert.match(windowsCommands, /\["cargo", \["check", "--release", "--manifest-path", "src-tauri\/Cargo.toml", "--bin", "NUTBOOK"\]\]/, "the Windows gate must compile the Tauri desktop binary in release mode");

const qualityJob = ciWorkflow.slice(ciWorkflow.indexOf("quality:"), ciWorkflow.indexOf("windows-check:"));
const windowsJob = ciWorkflow.slice(ciWorkflow.indexOf("windows-check:"));
assert.match(qualityJob, /node-version: 22/, "the macOS CI job must use Node 22");
assert.match(windowsJob, /node-version: 22/, "the Windows CI job must use Node 22");
assert.match(ciWorkflow, /name: Run local-equivalent quality gate\s+run: npm run check:ci/, "the macOS CI job must call the shared quality runner");
assert.match(ciWorkflow, /name: Run local-equivalent Windows gate\s+run: npm run check:ci:windows/, "the Windows CI job must call the shared Windows runner");
assert.doesNotMatch(ciWorkflow, /name: Install Chromium/, "CI commands must not drift outside the shared quality runner");

assert.match(releaseWorkflow, /permissions:\s*\n\s*contents: write\s*\n\s*checks: read/, "release preparation needs read-only access to commit checks");
assert.match(releaseWorkflow, /node-version: 22/, "packaging must use the same Node major as CI");
const gateStart = releaseWorkflow.indexOf("- name: Require successful CI checks for tagged commit");
const draftStart = releaseWorkflow.indexOf("gh release create \"$tag\" --draft");
assert.ok(gateStart >= 0, "release preparation must have a CI status gate");
assert.ok(draftStart > gateStart, "the CI status gate must run before draft Release creation");
const gate = releaseWorkflow.slice(gateStart, draftStart);
assert.match(gate, /check-runs/, "the release gate must inspect check runs on the tagged commit");
assert.match(gate, /git rev-list -n 1 "\$tag"/, "the release gate must inspect the commit behind the tag");
assert.match(gate, /Quality and runtime tests/, "the release gate must require the quality job");
assert.match(gate, /Windows compile check/, "the release gate must require the Windows job");
assert.match(gate, /"\$status" != "completed"/, "the release gate must reject an incomplete check");
assert.match(gate, /"\$conclusion" != "success"/, "the release gate must reject an unsuccessful check");

console.log("CI preflight and release-gate contract checks passed.");
