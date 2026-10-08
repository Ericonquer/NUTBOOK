import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { isNewer, renderNotes } from '../src/update-ui.js';
assert.equal(isNewer('1.0.0', 'v1.2.0'), true);
assert.equal(isNewer('1.2.0', 'v1.2.0'), false);
assert.equal(isNewer('1.2.0', 'v1.1.0'), false);
assert.equal(isNewer('1.9.0', 'v1.10.0'), true);
assert.equal(isNewer('1.0.0', null), false);
const notes = '# NUTBOOK\n\n[中文](#user-content-zh) | [English](#user-content-en)\n\n<a id="zh"></a>\n\n## 中文\n\n- **新功能**\n\n---\n\n<a id="en"></a>\n\n## English\n\n- **Feature**';
assert.match(renderNotes(notes, 'zh-CN'), /<li><strong>新功能<\/strong>/);
assert.doesNotMatch(renderNotes(notes, 'zh-CN'), /English|<a id=|user-content/);
assert.match(renderNotes(notes, 'en-US'), /<strong>Feature<\/strong>/);
assert.doesNotMatch(renderNotes(notes, 'en-US'), /新功能/);
assert.doesNotMatch(renderNotes('<script>alert(1)</script>\n\n[x](javascript:alert(1))', 'zh-CN'), /<script>|href="javascript:/);
const html = fs.readFileSync('dist/index.html', 'utf8');
assert.match(html, /async function boot\(\)[\s\S]*?listenRaw\("update-settings-changed"/);
assert.match(html, /__NUTBOOK_OPEN_SETTINGS_OVERLAY__[\s\S]*?mode === "update"[\s\S]*?checkForUpdates/);
assert.match(fs.readFileSync('src-tauri/src/commands/updates.rs', 'utf8'), /save_update_settings\(&next_settings\)\?;\s*let _ = app.emit\("update-settings-changed"/);
const context = vm.createContext({ window: { NutbookUpdateUI: { isNewer } }, appState: { updateStatus: { currentVersion: '1.0.0' } }, invoke: async () => ({ autoCheckEnabled: true, lastKnownLatestVersion: 'v1.2.0', lastKnownReleaseUrl: 'https://github.com/Ericonquer/NUTBOOK/releases/tag/v1.2.0' }), renderSettingsPanel() {}, renderUpdateBadge() {}, renderUpdateDialog() {} });
for (const [start, end] of [['function normalizeUpdateSettings(', 'function mockUpdateEnabled('], ['function normalizeUpdateStatus(', 'function updateCheckDue('], ['async function loadUpdateSettings(', 'async function setAutoCheckUpdatesEnabled(']]) {
  vm.runInContext(html.slice(html.indexOf(start), html.indexOf(end)), context);
}
await vm.runInContext('loadUpdateSettings()', context);
assert.equal(context.appState.updateStatus.hasUpdate, true, 'cached newer release must restore the update badge');
context.appState.updateStatus.currentVersion = '1.2.0';
await vm.runInContext('loadUpdateSettings()', context);
assert.equal(context.appState.updateStatus.hasUpdate, false, 'installed release must clear a stale cached badge');
console.log('Update UI behavior checks passed.');
