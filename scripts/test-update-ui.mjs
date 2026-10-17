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

// The real update entry lives in a separate settings WebView, not main.
const capability = JSON.parse(fs.readFileSync('src-tauri/capabilities/settings-event-listen.json', 'utf8'));
assert.deepEqual(capability.webviews, ['settings-overlay']);
assert.deepEqual(capability.permissions, ['core:event:allow-listen', 'core:event:allow-unlisten']);
let progressHandler;
let finishDownload;
let downloadCalls = 0;
const modal = { innerHTML: '', querySelector() { return null; }, querySelectorAll() { return []; } };
const downloadContext = vm.createContext({
  appState: { isUpdateDialogOpen: true, updateStatus: { status: 'available', candidate: { tag: 'v1.4.0', assetKey: 'mac', size: 100 } }, updateSettings: {}, updateDownload: {} },
  els: { updateModal: modal },
  t: key => key, formatTranslation: key => key, escapeHtml: value => value, escapeAttribute: value => value,
  renderSettingsPanel() {}, setStatus() {},
  listenRaw: async (_, handler) => { progressHandler = handler; },
  invoke: async () => { downloadCalls++; await new Promise(resolve => { finishDownload = resolve; }); }
});
vm.runInContext(html.slice(html.indexOf('function normalizeError('), html.indexOf('function normalizeDetailedError(')), downloadContext);
vm.runInContext(html.slice(html.indexOf('function formatUpdateBytes('), html.indexOf('async function loadUpdateSettings(')), downloadContext);
const downloading = vm.runInContext('downloadAndInstallUpdate()', downloadContext);
await new Promise(resolve => setImmediate(resolve));
assert.match(modal.innerHTML, /settings.updateConnecting/);
assert.doesNotMatch(modal.innerHTML, /value="0"/, 'connection wait must be indeterminate');
progressHandler({ payload: { revision: 1, phase: 'downloading', tag: 'old', assetKey: 'mac', downloadedBytes: 90, totalBytes: 100 } });
assert.equal(downloadContext.appState.updateDownload.downloadedBytes, 0);
progressHandler({ payload: { revision: 2, phase: 'downloading', tag: 'v1.4.0', assetKey: 'mac', downloadedBytes: 50, totalBytes: 100 } });
assert.match(modal.innerHTML, /value="50"/);
finishDownload(); await downloading;
assert.match(modal.innerHTML, /disabled>settings.updateInstallerOpened/);
assert.equal(downloadContext.appState.updateDownload.error, '', 'successful download must have no error');
assert.doesNotMatch(modal.innerHTML, /role="alert"|未知错误/);
assert.doesNotMatch(modal.innerHTML, /settings.downloadAndInstall/);
await vm.runInContext('downloadAndInstallUpdate()', downloadContext);
assert.equal(downloadCalls, 1, 'completed action must not download again');
vm.runInContext('closeUpdateDialog(); appState.isUpdateDialogOpen = true; renderUpdateDialog()', downloadContext);
assert.match(modal.innerHTML, /settings.updateInstallerOpened/, 'same overlay reopen keeps completion state');
downloadContext.appState.updateDownload = {};
downloadContext.appState.updateDownloadProgressListening = false;
downloadContext.listenRaw = async () => { throw new Error('event permission denied'); };
await vm.runInContext('downloadAndInstallUpdate()', downloadContext);
assert.equal(downloadCalls, 1, 'subscription failure must not silently start a download');
assert.match(modal.innerHTML, /event permission denied/);
assert.match(modal.innerHTML, /settings.downloadAndInstall/);
console.log('Update download permission, progress and completion regressions passed.');

// Recreated dialogs hydrate host state, and stale snapshots cannot regress it.
downloadContext.appState.isTauri = true;
downloadContext.appState.updateDownload = {};
downloadContext.appState.updateDownloadProgressListening = false;
downloadContext.listenRaw = async (_, handler) => { progressHandler = handler; };
downloadContext.invoke = async () => ({ revision: 5, tag: 'v1.4.0', assetKey: 'mac', phase: 'downloading', downloadedBytes: 75, totalBytes: 100 });
await vm.runInContext('restoreUpdateDownloadProgress()', downloadContext);
assert.equal(downloadContext.appState.updateDownload.inProgress, true);
assert.match(modal.innerHTML, /value="75"/);
progressHandler({ payload: { revision: 4, tag: 'v1.4.0', assetKey: 'mac', phase: 'downloading', downloadedBytes: 50, totalBytes: 100 } });
assert.match(modal.innerHTML, /value="75"/, 'late snapshot/event cannot move progress backwards');
progressHandler({ payload: { revision: 6, tag: 'v1.4.0', assetKey: 'mac', phase: 'opened', downloadedBytes: 100, totalBytes: 100 } });
assert.match(modal.innerHTML, /disabled>settings.updateInstallerOpened/);
assert.equal(downloadContext.appState.updateDownload.error, '', 'successful download must have no error');
assert.doesNotMatch(modal.innerHTML, /role="alert"|未知错误/);
downloadContext.appState.updateDownload = {};
downloadContext.invoke = async () => ({ revision: 6, tag: 'v1.4.0', assetKey: 'mac', phase: 'opened', downloadedBytes: 100, totalBytes: 100 });
await vm.runInContext('restoreUpdateDownloadProgress()', downloadContext);
assert.match(modal.innerHTML, /disabled>settings.updateInstallerOpened/, 'fresh dialog restores terminal state from host');
assert.equal(downloadContext.appState.updateDownload.error, '', 'restored success must have no error');
assert.doesNotMatch(modal.innerHTML, /role="alert"|未知错误/);
progressHandler({ payload: { revision: 7, tag: 'v1.4.0', assetKey: 'mac', phase: 'error', error: 'installer open failed' } });
assert.match(modal.innerHTML, /installer open failed/);
assert.match(modal.innerHTML, /settings.downloadAndInstall/);
console.log('Host snapshot restoration and event ordering regressions passed.');

progressHandler({ payload: { revision: 8, tag: 'v1.4.0', assetKey: 'mac', phase: 'checksum_retry', downloadedBytes: 0, totalBytes: 100 } });
assert.equal(downloadContext.appState.updateDownload.inProgress, true);
assert.match(modal.innerHTML, /settings.updateChecksumRetry/);
assert.doesNotMatch(modal.innerHTML, /value="0"/);
progressHandler({ payload: { revision: 9, tag: 'v1.4.0', assetKey: 'mac', phase: 'error', error: 'cannot download checksum: Connection Failed: connection timed out' } });
assert.match(modal.innerHTML, /settings.updateChecksumUnavailable/);
assert.match(modal.innerHTML, /settings.downloadAndInstall/);
console.log('Checksum retry phase and actionable error regressions passed.');

for (const [index, phase] of ['metadata', 'checksum', 'checksum_retry', 'connecting', 'downloading', 'opening', 'opened'].entries()) {
  progressHandler({ payload: { revision: 10 + index, tag: 'v1.4.0', assetKey: 'mac', phase, error: null, downloadedBytes: phase === 'opened' ? 100 : 0, totalBytes: 100 } });
  assert.equal(downloadContext.appState.updateDownload.error, '', `${phase}: null is absence of error`);
  assert.doesNotMatch(modal.innerHTML, /role="alert"|未知错误/);
}
console.log('Production error normalization: every non-error phase stays clear.');
