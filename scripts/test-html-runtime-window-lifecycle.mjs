import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync("dist/index.html", "utf8");
function extract(name) {
  const start = source.indexOf(`async function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const bodyStart = source.indexOf("{", source.indexOf(") {", start));
  let depth = 0, quote = "", escaped = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const char = source[i];
    if (escaped) { escaped = false; continue; }
    if (quote) { if (char === "\\") escaped = true; else if (char === quote) quote = ""; continue; }
    if (char === '"' || char === "'" || char === "`") { quote = char; continue; }
    if (char === "{") depth += 1;
    if (char === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

let completeCapture, completeHide;
let hideStarted = false, syncCount = 0, cleanupCount = 0;
const capture = new Promise(resolve => { completeCapture = resolve; });
const hide = new Promise(resolve => { completeHide = resolve; });
const context = {
  appState: {
    runtimeSurfaceLifecycleEpoch: 0, runtimeSurfacesSuspended: false,
    runtimeSurfaceSuspendPromise: null, activeRuntimeHostId: 42,
    runtimeHostLastBoundsKey: "42:old", htmlEditSession: null,
    htmlRemoveConfirmItemId: null, tabs: [], runtimeSessions: [{ id: 42 }]
  },
  isCurrentHtmlEditSession: () => false,
  refreshHtmlRuntimeViewState: () => capture,
  cleanupRuntimeHostSync: () => { cleanupCount += 1; },
  nextRuntimeSurfaceToken: () => 1,
  syncHtmlEditReadonlyPatchSurfaceToken: async () => {},
  hideRuntimeSessionSurfaces: () => { hideStarted = true; return hide; },
  isExternalRuntimeTab: () => false,
  scheduleRuntimeHostSync: () => { syncCount += 1; },
  refreshHtmlEditSectionNavigation() {},
  Promise
};
vm.createContext(context);
vm.runInContext(`${extract("suspendRuntimeSurfaces")}; ${extract("resumeRuntimeSurfaces")}; globalThis.suspend = suspendRuntimeSurfaces; globalThis.resume = resumeRuntimeSurfaces;`, context);

const firstSuspend = context.suspend();
assert.equal(context.appState.runtimeSurfacesSuspended, true);
assert.equal(context.appState.activeRuntimeHostId, null, "a minimize intent must invalidate the host before asynchronous view-state capture");
assert.equal(context.appState.runtimeHostLastBoundsKey, null);
assert.equal(cleanupCount, 1);
assert.ok(context.appState.runtimeSurfaceSuspendPromise, "resume must have a concrete hide operation to await");

const firstResume = context.resume();
assert.equal(context.appState.runtimeSurfacesSuspended, true, "restore must keep new attaches blocked while hide is pending");
assert.equal(syncCount, 0);
completeCapture(false);
await new Promise(resolve => setImmediate(resolve));
assert.equal(hideStarted, true);

// Minimize again before the first restore finishes. The first restore must not
// reattach an HTML child over a still minimized main window.
const secondSuspend = context.suspend();
completeHide();
await Promise.all([firstSuspend, firstResume, secondSuspend]);
assert.equal(context.appState.runtimeSurfacesSuspended, true);
assert.equal(syncCount, 0);

await context.resume();
assert.equal(context.appState.runtimeSurfacesSuspended, false);
assert.equal(syncCount, 1);
console.log("HTML runtime window lifecycle checks passed");

// The active editor's child owns unsaved DOM/undo/inline toolbar. A minimize
// must not tear it down just because the host session survives in JS.
const editor = { itemId: 42, runtimeSessionId: 'editing-42', generation: 7 };
let teardown = 0;
const preserve = {
  appState: { runtimeSurfacesSuspended: true, htmlEditSession: editor, runtimeHiddenSurfaceIds: new Set(), activeRuntimeHostId: null },
  currentRuntimeSurfaceToken: () => 1,
  isRuntimeSurfaceActive: () => true,
  isRuntimeSurfaceHideCurrent: () => true,
  isCurrentHtmlEditSession: session => session === editor,
  externalRuntimeTabForId: () => null,
  getActiveTab: () => ({ id: 42 }),
  resetRuntimeControlsOverlaySync: () => {},
  setRuntimeControlsOverlayVisibility: async () => { teardown++; throw Error('teardown reached'); },
};
vm.createContext(preserve);
vm.runInContext(`${extract('hideRuntimeSessionSurfaces')}; globalThis.hide = hideRuntimeSessionSurfaces;`, preserve);
await preserve.hide(42, { force: true });
assert.equal(teardown, 0, 'minimize must retain the live current editor, including unsaved DOM');
preserve.appState.runtimeSurfacesSuspended = false;
preserve.appState.htmlFind = {};
await assert.rejects(preserve.hide(42, { force: true }), /teardown reached/);
assert.equal(teardown, 1, 'normal tab cleanup must retain its existing teardown path');
console.log('Minimized active editor retained; normal cleanup still tears down.');

// Readiness must use the existing authenticated title bridge when a native
// content surface has no direct IPC, or IPC rejects its transport.
for (const childInvoke of [undefined, () => Promise.reject(Error('IPC unavailable'))]) {
  let titleReports = 0;
  const readyContext = {
    appState: { htmlEditRuntimeDocumentReadyWaiters: new Map() },
    window: { setTimeout, clearTimeout }, Date, Math, Promise,
    invoke: async (_command, args) => {
      const childDocument = { readyState: 'complete', querySelector: () => ({}) };
      Object.defineProperty(childDocument, 'title', { set(value) {
        titleReports++;
        const payload = JSON.parse(value.slice('__NUTBOOK_HTML_EDIT_RUNTIME__:'.length));
        readyContext.appState.htmlEditRuntimeDocumentReadyWaiters.get(payload.requestId)?.(payload);
      }});
      vm.runInNewContext(args.script, { window: { __TAURI_INTERNALS__: childInvoke ? { invoke: childInvoke } : undefined }, document: childDocument, location: { href: 'http://nutbook-content.example.localhost/deck.html' }, Promise, JSON });
    }
  };
  vm.createContext(readyContext);
  vm.runInContext(`${extract('waitForHtmlEditableRuntimeDocument')}; globalThis.ready = waitForHtmlEditableRuntimeDocument;`, readyContext);
  assert.equal(await readyContext.ready(42, 'edit-42', 7, () => true), true);
  assert.equal(titleReports, 1);
}
console.log('Editable document readiness survives absent and rejecting child IPC.');
