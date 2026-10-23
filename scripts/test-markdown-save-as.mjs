import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html = readFileSync('dist/index.html', 'utf8');
const source = html.match(/async function exportActiveMarkdown\(\) \{[\s\S]*?\n      \}/)?.[0];
assert.ok(source);
for (const mode of ['cancel', 'saved', 'failed', 'draft-blocked', 'external']) {
  const calls = [];
  const tab = { id: 1, preview: { fileType: 'markdown' }, item: { fileName: 'sample.md' }, sourceMode: mode === 'external' ? 'external' : 'library' };
  const context = vm.createContext({
    getActiveTab: () => tab,
    ensureMarkdownSavedBeforeContinue: async () => { calls.push('converged'); return mode !== 'draft-blocked'; },
    invoke: async (command, args) => {
      assert.equal(command, 'export_markdown_file'); assert.equal(args.itemId, 1);
      calls.push('picker'); if (mode === 'failed') throw Error('full'); return mode === 'saved';
    },
    setStatus: (value, type) => calls.push(type),
    showToast: () => calls.push('toast'),
    t: value => value, markdownExportedStatus: value => value, normalizeError: String,
  });
  await vm.runInContext(`${source}\nexportActiveMarkdown()`, context);
  if (mode === 'cancel') assert.deepEqual(calls, ['converged', 'picker']);
  if (mode === 'saved') assert.deepEqual(calls, ['converged', 'picker', 'ok', 'toast']);
  if (mode === 'failed') assert.deepEqual(calls, ['converged', 'picker', 'error']);
  if (mode === 'draft-blocked') assert.deepEqual(calls, ['converged']);
  if (mode === 'external') assert.deepEqual(calls, ['warn']);
}
console.log('Markdown Save As: cancel/success/failure/draft/external entry behavior passed');

const restoreGate = html.match(/canRestore: doc => (Boolean\([^\n]+\)),/);
assert.ok(restoreGate, 'actual main history restore gate exists');
for (const target of [{itemId:1},{sessionId:'external',generation:1},{}]) {
  const context = vm.createContext({target,tab:{detail:{filePath:'/var/tmp/a.md'}},doc:{canonical_path:'/private/var/tmp/a.md'}});
  assert.equal(vm.runInContext(restoreGate[1],context),Object.keys(target).length>0,'path spelling must not override verified target identity');
}
assert.equal(vm.runInNewContext(restoreGate[1],{target:{itemId:1},doc:null}),false);
console.log('History target gate accepts canonical path aliases; active identity is enforced by history UI/backend');
