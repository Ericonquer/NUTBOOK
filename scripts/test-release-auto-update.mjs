import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const workflow = readFileSync(new URL("../.github/workflows/release-build.yml", import.meta.url), "utf8");
const publishWorkflow = readFileSync(new URL("../.github/workflows/publish-release.yml", import.meta.url), "utf8");
const updateCore = readFileSync(new URL("../src-tauri/src/core/update.rs", import.meta.url), "utf8");
const updateModels = readFileSync(new URL("../src-tauri/src/models/update.rs", import.meta.url), "utf8");
const updateCommands = readFileSync(new URL("../src-tauri/src/commands/updates.rs", import.meta.url), "utf8");
const windowCommands = readFileSync(new URL("../src-tauri/src/commands/window.rs", import.meta.url), "utf8");
const runtimeCore = readFileSync(new URL("../src-tauri/src/core/html_runtime.rs", import.meta.url), "utf8");
const indexHtml = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
const dmgSettings = readFileSync(new URL("./dmgbuild-settings.py", import.meta.url), "utf8");

assert.match(workflow, /permissions:\s*\n\s*contents: write/, "release workflow needs permission to publish only after verification");
assert.match(workflow, /prepare-release:[\s\S]*?gh release create "\$tag" --repo "\$GITHUB_REPOSITORY" --draft/, "release creation must start as a draft without relying on checkout context");
assert.match(
  workflow,
  /finalize-release:[\s\S]*?needs: \[prepare-release, build\][\s\S]*?test "\$\(find release -maxdepth 1 -type f \| wc -l \| tr -d '\[:space:\]'\)" -eq 6[\s\S]*?gh release upload "\$TAG" --repo "\$GITHUB_REPOSITORY" release\/\* --clobber[\s\S]*?Re-download published draft assets and verify bytes/,
  "the build workflow must verify six staged assets, upload them once, then verify the draft release bytes",
);
assert.doesNotMatch(workflow, /gh release edit/, "building a tag must not publish without a person confirming it");
assert.match(publishWorkflow, /workflow_dispatch:[\s\S]*?tag:/, "publishing requires an explicit tag selection");
assert.match(publishWorkflow, /test "\$\(jq -r \.isDraft <<<"\$release"\)" = "true"[\s\S]*?gh release edit "\$TAG" --repo "\$GITHUB_REPOSITORY" --draft=false --prerelease=false/, "only the manual publish workflow may publish a complete draft");
assert.match(workflow, /NUTBOOK_\$\{version\}_x64\.dmg[\s\S]*?NUTBOOK_\$\{version\}_aarch64\.dmg[\s\S]*?NUTBOOK_\$\{version\}_x64-setup\.exe/, "finalize must require all platform installers");
assert.match(workflow, /grep -Eq '\^\[0-9a-f\]\{64\}\$'/, "checksums must be lowercase SHA-256 sidecars");

assert.match(updateModels, /struct UpdateCandidate[\s\S]*?asset_key/, "frontend update metadata must expose an opaque asset key");
assert.match(updateModels, /struct GitHubRelease[\s\S]*?pub body: String/, "release metadata must include GitHub's release notes body");
assert.match(updateModels, /struct UpdateCheckResponse[\s\S]*?release_notes/, "the update response must expose release notes separately from the installer candidate");
assert.match(updateCore, /download_and_verify_update[\s\S]*?fetch_github_release_by_tag[\s\S]*?asset_key != spec\.key/, "backend must re-fetch the fixed release and reject a mismatched platform key");
assert.match(updateCore, /checked_asset\(&release, &format!\("\{expected_name\}\.sha256"\)\)/, "installer download requires a matching checksum asset");
assert.match(updateCore, /fs::rename\(&temporary_path, &final_path\)/, "verified installer must be atomically published into the cache");
assert.match(updateCore, /if result\.is_err\(\)[\s\S]*?remove_file\(&temporary_path\)/, "failed downloads must remove partial files");
assert.match(updateCommands, /download_and_install_update[\s\S]*?open_downloaded_installer/, "the command may open only the installer returned by the controlled download path");
assert.doesNotMatch(windowCommands, /#\[tauri::command\][\s\S]{0,160}open_downloaded_installer/, "opening a local installer must not be exposed as a Tauri command");

assert.match(indexHtml, /openSettingsOverlay\("preferences", "update"\)/, "the update badge must open the host-layer update dialog");
assert.match(indexHtml, /settingsOverlayMode === "update"/, "the update dialog must have a child-webview-safe overlay mode");
assert.match(runtimeCore, /matches!\(mode, Some\("panel"\) \| Some\("update"\)\)/, "the host overlay must size the update dialog above an HTML runtime");
assert.match(indexHtml, /download_and_install_update", \{ payload: \{ tag: candidate\.tag, assetKey: candidate\.assetKey \} \}/, "frontend must not pass a URL, hash, or local path to the installer command");
assert.match(indexHtml, /function scheduleAutomaticUpdateCheck\(\)[\s\S]*?updateStartupCheckScheduled/, "automatic update checks must have one startup coordinator");
assert.doesNotMatch(indexHtml, /function maybeCheckUpdatesForPreferences/, "opening preferences must not force a separate update check");
assert.match(indexHtml, /update-modal-notes[\s\S]*?settings\.updateNotes/, "available updates must show release notes in the dialog");
assert.match(indexHtml, /settings\.viewFullReleaseNotes/, "the dialog action must name the full release notes");
assert.match(indexHtml, /querySelectorAll\("\[data-update-open-dialog\]"\)/, "every update entry point in the preference row must be clickable");
assert.doesNotMatch(indexHtml, /\$\{appState\.updateStatus\?\.hasUpdate \? `\s*<div class="preference-row">/, "an available update must stay in the original automatic-update preference row");
assert.match(dmgSettings, /files = \[application\][\s\S]*?symlinks = \{"Applications": "\/Applications"\}/, "the DMG must expose the app and Applications destination");
assert.match(dmgSettings, /icon_size = 128[\s\S]*?appname: \(180, 170\),[\s\S]*?"Applications": \(480, 170\)/, "the headless DMG must preserve the approved large Finder icon layout");
assert.match(dmgSettings, /intentionally has no background image/, "the DMG must use the native Finder canvas without a custom background or arrow");

console.log("Release auto-update contract checks passed.");
