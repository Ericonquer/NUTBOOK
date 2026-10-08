import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const rust = readFileSync('src-tauri/src/core/html_runtime.rs', 'utf8');
const start = rust.indexOf('  const isEditableShortcutTarget =');
const end = rust.indexOf("  document.addEventListener('keydown', handleRuntimeShortcut", start);
let editing = false;
const context = {
  Node: { ELEMENT_NODE: 1 },
  window: { __NUTBOOK_HTML_EDIT__: { isEditing: () => editing } },
  document: { title: 'original' },
  requestRuntimeFullscreen() {}, isRuntimeFullscreen: () => false, isEscapeKey: () => false,
};
vm.createContext(context);
vm.runInContext(rust.slice(start, end) + '\nglobalThis.handle = handleRuntimeShortcut;', context);
function press(overrides = {}) {
  context.document.title = 'original';
  const event = { key: 's', code: 'KeyS', target: { nodeType: 1, closest: () => null }, preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {}, ...overrides };
  context.handle(event);
  return context.document.title;
}
assert.match(press(), /^__NUTBOOK_PRESENTATION_SHORTCUT__:/);
assert.match(press({ key: 'S' }), /^__NUTBOOK_PRESENTATION_SHORTCUT__:/);
for (const overrides of [{ metaKey: true }, { ctrlKey: true }, { altKey: true }, { repeat: true }, { isComposing: true }, { key: 'Process' }, { target: { nodeType: 1, closest: () => ({}) } }]) {
  assert.equal(press(overrides), 'original', JSON.stringify(overrides));
}
editing = true;
assert.equal(press(), 'original');
editing = false;
context.window.__NUTBOOK_NATIVE_PRESENTATION_ACTIVE__ = true;
assert.equal(press(), 'original');

const host = readFileSync('dist/index.html', 'utf8');
const callback = host.match(/window\.__NUTBOOK_OPEN_NATIVE_PRESENTATION__ = \(itemId\) => \{[\s\S]*?\n      \};/)[0];
let opened = 0;
const hostContext = { window: {}, getActiveTab: () => ({ id: 42 }), appState: { runtimeSurfacesSuspended: false }, openNativePresentationPreparation: async () => { opened++; } };
vm.createContext(hostContext);
vm.runInContext(callback, hostContext);
hostContext.window.__NUTBOOK_OPEN_NATIVE_PRESENTATION__(99);
assert.equal(opened, 0, 'inactive host must not open preparation');
hostContext.window.__NUTBOOK_OPEN_NATIVE_PRESENTATION__(42);
assert.equal(opened, 1);
hostContext.appState.runtimeSurfacesSuspended = true;
hostContext.window.__NUTBOOK_OPEN_NATIVE_PRESENTATION__(42);
assert.equal(opened, 1, 'suspended host must not open preparation');
assert.match(rust, /if is_presentation_shortcut \{ "__NUTBOOK_OPEN_NATIVE_PRESENTATION__" \}/);
console.log('Native presentation shortcut behavior checks passed.');
