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
const releasePreflight = read(".github/workflows/release-preflight.yml");
const releaseWorkflow = read(".github/workflows/build-app.yml");
const publishWorkflow = read(".github/workflows/publish-release.yml");
const prePushHook = read(".githooks/pre-push");

assert.equal(read(".nvmrc").trim(), "22", ".nvmrc must pin the CI Node major");
assert.equal(packageJson.engines?.node, ">=22 <23", "package metadata must reject Node majors other than CI's Node 22");
assert.equal(packageLock.packages?.[""]?.engines?.node, ">=22 <23", "the lockfile must preserve the Node major contract");
assert.equal(packageJson.scripts?.["check:ci"], "node scripts/check-ci.mjs quality");
assert.equal(packageJson.scripts?.["check:ci:windows"], "node scripts/check-ci.mjs windows");
assert.equal(packageJson.scripts?.["check:release-preflight:windows"], "node scripts/check-ci.mjs release-windows");
assert.equal(packageJson.scripts?.["check:push"], "node scripts/check-ci.mjs push");
assert.equal(packageJson.scripts?.["setup-hooks"], "git config core.hooksPath .githooks");
assert.match(packageJson.scripts?.["check:regressions"] ?? "", /^node scripts\/test-ci-preflight\.mjs && /, "regressions must enforce the CI gate contract first");

assert.match(preflight, /const EXPECTED_NODE_MAJOR = 22;/, "the local gate must reject a mismatched Node major");
assert.match(preflight, /const RELEASE_WINDOWS_COMMANDS/, "the release-only Windows package-input gate must be explicit");
assert.match(preflight, /\["npx", \["playwright", "install", "chromium"\]\]/, "the local quality gate must install Chromium");
assert.match(preflight, /\["npm", \["run", "check:regressions"\]\]/, "the local quality gate must include regressions");
assert.match(preflight, /\["cargo", \["test", "--manifest-path", "src-tauri\/Cargo.toml", "--test", "html_edit", "--", "--nocapture"\]\]/, "the quality gate must include HTML edit integration tests");
assert.match(preflight, /process\.platform === "win32"/, "the runner must select Windows-compatible npm executables");
assert.match(preflight, /\? `\$\{command\}\.cmd`/, "Windows npm and npx commands must use their .cmd shims");
assert.match(preflight, /shell:\s*process\.platform === "win32"/, "Windows .cmd shims must run through cmd.exe rather than direct spawn");
const releaseWindows = preflight.slice(preflight.indexOf("const RELEASE_WINDOWS_COMMANDS"), preflight.indexOf("const commandsByMode"));
assert.match(releaseWindows, /\["npm", \["run", "prepare:nutbook-cli"\]\]/, "release preflight must execute Tauri's beforeBuild CLI preparation path");
assert.match(releaseWindows, /\["cargo", \["check", "--release", "--manifest-path", "src-tauri\/Cargo.toml", "--bins"\]\]/, "release preflight must compile all release binaries");

assert.match(ciWorkflow, /pull_request:/, "PRs must have a remote CI gate");
assert.doesNotMatch(ciWorkflow, /push:\s*\n\s*branches:/, "merged main must not repeat the full PR matrix");
for (const expected of ["PR quality and runtime tests", "PR macOS release compile", "PR Windows release compile"]) {
  assert.match(ciWorkflow, new RegExp(`name: ${expected}`), `CI must retain ${expected}`);
}
assert.match(ciWorkflow, /runs-on: ubuntu-latest/, "the complete frontend/runtime suite belongs on the cheaper Linux runner");
assert.match(ciWorkflow, /uses: actions\/cache@v4/, "CI must cache Rust dependencies and intermediates");
assert.match(ciWorkflow, /RUST_VERSION: 1\.98\.0/, "CI must pin the Rust compiler used by its cache");
assert.match(ciWorkflow, /dtolnay\/rust-toolchain@1\.98\.0/, "CI must not use a moving Rust toolchain");
assert.match(ciWorkflow, /src-tauri\/target\/release\/deps/, "CI Rust cache must include release compile intermediates");
assert.doesNotMatch(ciWorkflow, /src-tauri\/target\s*\n/, "CI must not cache the whole target directory, which could include installers");

assert.match(releasePreflight, /workflow_dispatch:/, "release preflight must be an explicit release-candidate action");
assert.match(releasePreflight, /Release preflight \/ Windows package inputs/, "release preflight needs the native Windows package-input job");
assert.match(releasePreflight, /npm run check:release-preflight:windows/, "the native Windows preflight must run the real beforeBuild input path");
assert.match(releasePreflight, /nutbook\.exe/, "the native Windows preflight must assert the copied .exe resource");
assert.match(releasePreflight, /Release preflight \/ macOS release compile/, "release preflight must retain a native macOS release compile");
assert.match(releasePreflight, /key: release-rust-/, "release preflight must populate the Rust cache reused by packaging");
assert.match(releasePreflight, /RUST_VERSION: 1\.98\.0/, "release preflight must pin the Rust compiler");

assert.match(releaseWorkflow, /workflow_dispatch:/, "packaging must only run when explicitly requested");
assert.doesNotMatch(releaseWorkflow, /push:\s*\n\s*tags:/, "pushing a tag must not spend packaging minutes automatically");
assert.match(releaseWorkflow, /actions: read/, "the exact release-preflight gate needs Actions read permission");
assert.match(releaseWorkflow, /release-preflight\.yml\/runs/, "release must query the dedicated preflight workflow, not unrelated check names");
assert.match(releaseWorkflow, /\.head_sha == \$commit/, "release must require a preflight for exactly the tagged commit");
assert.match(releaseWorkflow, /Release preflight \/ Windows package inputs/, "release must require the real Windows package-input job");
assert.match(releaseWorkflow, /Release preflight \/ macOS release compile/, "release must require the macOS preflight job");
assert.match(releaseWorkflow, /TAURI_CLI_VERSION: 2\.11\.2/, "release must pin the Tauri CLI version");
assert.match(releaseWorkflow, /RUST_VERSION: 1\.98\.0/, "release must pin the Rust compiler");
assert.match(releaseWorkflow, /cargo install tauri-cli --version/, "release must install the pinned Tauri CLI, not a floating latest version");
assert.match(releaseWorkflow, /Restore Rust build cache shared with release preflight/, "package builds must reuse preflight Rust intermediates");
assert.match(releaseWorkflow, /key: tauri-cli-/, "the pinned Tauri CLI must have its own cache key");
assert.match(releaseWorkflow, /Remove cached release outputs before packaging/, "release must remove stale cached installers before build");
assert.match(releaseWorkflow, /Remove release outputs before cache save/, "release must never cache installers or generated CLI resources");
assert.match(releaseWorkflow, /permissions:\s*\n\s*contents: read/, "build matrix jobs must not receive release-write permission");
assert.match(releaseWorkflow, /Upload verified package for the single release uploader/, "builders must hand off packages through short-lived artifacts");
assert.match(releaseWorkflow, /retention-days: 1/, "build artifacts must be short lived");
assert.match(releaseWorkflow, /Re-download published draft assets and verify bytes/, "draft upload must be verified by hashing downloaded release bytes");
assert.match(releaseWorkflow, /shasum -a 256/, "release verification must calculate installer checksums");

assert.match(publishWorkflow, /gh release download "\$TAG" --pattern "\$asset"/, "publishing must download each installer again");
assert.match(publishWorkflow, /actual_checksum=.*shasum -a 256/, "publishing must rehash downloaded installer bytes");
assert.match(publishWorkflow, /test "\$expected_checksum" = "\$actual_checksum"/, "publishing must compare the checksum to the installer bytes");

assert.match(prePushHook, /git diff-tree --check/, "pre-push must reject whitespace errors for a new remote ref");
assert.match(prePushHook, /git diff --check/, "pre-push must inspect the exact pushed range");
assert.match(prePushHook, /local_sha.*head_sha/, "pre-push must reject a ref other than the checked-out HEAD");
assert.match(prePushHook, /git diff --quiet/, "pre-push must reject a dirty worktree that cannot be the pushed revision");
assert.match(prePushHook, /npm run check:push/, "pre-push must run the complete local quality gate");

console.log("CI, release, and local pre-push contracts passed.");
