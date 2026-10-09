import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await page.setContent('<div id="viewer" style="height:700px"></div>');
  await page.addStyleTag({ content: readFileSync('dist/markdown-formatting.css', 'utf8') });
  await page.addScriptTag({ content: readFileSync('dist/markdown-formatting.js', 'utf8') });
  await page.evaluate(() => {
    window.fixture = { saved: null, revision: null, calls: [], choice: 'continue', destroyed: 0, restored: 0, value: 'original' };
    window.bridge = {
      language: () => 'en-US', activeId: () => 1, container: document.querySelector('#viewer'),
      suspend() {}, restore() { fixture.restored++; }, error: e => e.message || String(e), resolveImage: src => src,
      confirm: async () => fixture.choice,
      editor: async () => ({ create: async options => {
        const input = document.createElement('textarea'); input.value = options.markdown;
        input.setAttribute('data-fixture-editor', ''); options.root.append(input);
        input.addEventListener('input', () => { fixture.value = input.value; options.onChange(input.value); });
        fixture.input = input;
        return { getMarkdown: () => input.value, destroy: () => { fixture.destroyed++; }, focus: () => input.focus() };
      } }),
      invoke: async (command, args) => {
        fixture.calls.push(command);
        if (command === 'load_formatting_draft') return { draft: fixture.saved, revision: fixture.revision };
        if (command === 'render_formatting_markdown') return args.markdown.includes('missing') ? '<p>text</p><img src="missing.png">' : '<h1>Heading</h1>'+Array.from({length:70}, (_,i)=>`<p>Paragraph ${i} ${args.markdown}</p>`).join('');
        if (command === 'read_formatting_image') throw new Error('missing');
        if (command === 'save_formatting_draft') {
          if (fixture.failSave) throw new Error('EDIT_CONFLICT');
          fixture.saved = structuredClone(args.draft); fixture.revision = 'revision-1';
          if (fixture.pauseSave) await new Promise(resolve => { fixture.resolveSave = resolve; });
          return fixture.revision;
        }
        throw new Error(command);
      }
    };
    window.tab = { id:1, item:{fileName:'acceptance.md'}, preview:{raw:'original'} };
  });
  await page.evaluate(() => NutbookFormatting.open(bridge, tab));
  const input = page.locator('[data-fixture-editor]');
  await input.fill('edited');
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.querySelector('.formatting-preview').scrollTop = 800; });
  await input.fill('edited twice');
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => document.querySelector('.formatting-preview').scrollTop), 800, 'preview updates retain scroll position');
  assert.equal(await page.evaluate(() => fixture.destroyed), 0, 'typing never remounts the editor');
  await page.getByRole('button', { name:'Source snapshot at draft creation', exact:true }).click();
  assert.equal(await page.locator('.formatting-source[readonly]').inputValue(), 'original');
  await page.getByRole('button', { name:'Publishing draft', exact:true }).click();
  assert.equal(await input.inputValue(), 'edited twice');
  await page.evaluate(() => { fixture.failSave = true; });
  assert.equal(await page.evaluate(() => NutbookFormatting.save()), false);
  assert.equal(await input.inputValue(), 'edited twice');
  await page.evaluate(() => { fixture.failSave = false; fixture.pauseSave = true; window.saving = NutbookFormatting.save(); });
  await page.waitForFunction(() => fixture.resolveSave);
  await input.fill('new text during save');
  await page.evaluate(() => fixture.resolveSave());
  assert.equal(await page.evaluate(() => saving), true);
  assert.equal(await page.locator('[role=status]').textContent(), 'Unsaved', 'late save must not clear newer edits');
  assert.equal(await page.evaluate(() => fixture.saved.markdown), 'edited twice', 'saved revision is frozen');
  assert.equal(await page.evaluate(() => NutbookFormatting.leave(1)), false, 'continue keeps the session');
  await page.evaluate(() => { fixture.choice = 'discard'; });
  assert.equal(await page.evaluate(() => NutbookFormatting.leave(1)), true);
  assert.equal(await page.evaluate(() => tab.preview.raw), 'original', 'publishing never writes source');
  await page.evaluate(() => { fixture.pauseSave = false; return NutbookFormatting.open(bridge, tab); });
  assert.equal(await input.inputValue(), 'edited twice', 'reopen restores persisted draft');
  // Choosing Save on leave cannot discard input typed while the save is in flight.
  await input.fill('save on leave');
  await page.evaluate(() => {
    fixture.choice = 'save'; fixture.pauseSave = true; fixture.resolveSave = null;
    window.leavingWithSave = NutbookFormatting.leave(1);
  });
  await page.waitForFunction(() => fixture.resolveSave);
  await input.fill('newer edit while leaving');
  await page.evaluate(() => fixture.resolveSave());
  assert.equal(await page.evaluate(() => leavingWithSave), false, 'leave keeps newer unsaved input');
  assert.equal(await input.inputValue(), 'newer edit while leaving');
  assert.equal(await page.evaluate(() => fixture.saved.markdown), 'save on leave');
  await page.evaluate(() => { fixture.pauseSave = false; fixture.choice = 'continue'; });
  await input.fill('missing');
  await page.waitForTimeout(300);
  assert.match(await page.locator('[role=alert]').textContent(), /missing.png/);
  await input.dispatchEvent('compositionstart');
  assert.equal(await page.evaluate(() => NutbookFormatting.save()), false, 'save refuses composition');
  await input.dispatchEvent('compositionend');
  await page.evaluate(() => { fixture.choice = 'discard'; return NutbookFormatting.leave(1); });
  // Async opening must not appear after a leave invalidated its generation.
  await page.evaluate(() => {
    const invoke = bridge.invoke;
    fixture.originalInvoke = invoke;
    bridge.invoke = async (cmd,args) => { if (cmd === 'load_formatting_draft') await new Promise(resolve => { fixture.resolveOpen = resolve; }); return invoke(cmd,args); };
    window.opening = NutbookFormatting.open(bridge,tab);
  });
  await page.waitForFunction(() => fixture.resolveOpen);
  await page.evaluate(async () => { await NutbookFormatting.leave(1); fixture.resolveOpen(); await opening; });
  assert.equal(await page.locator('.formatting-workspace').count(), 0, 'stale open is discarded');
  await page.addScriptTag({ content: readFileSync('dist/assets/markdown-editor.js', 'utf8'), type: 'module' });
  await page.waitForFunction(() => Boolean(window.NutbookMarkdownEditor?.create));
  await page.evaluate(async () => {
    bridge.invoke = fixture.originalInvoke;
    bridge.editor = async () => window.NutbookMarkdownEditor;
    fixture.saved = null; fixture.revision = null;
    await NutbookFormatting.open(bridge, tab);
    window.ClipboardItem = class { constructor(data) { this.data = data; } };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write: async items => {
      const item = items[0];
      const html = await item.data['text/html'];
      const plain = await item.data['text/plain'];
      fixture.clipboard = { html: await html.text(), plain: await plain.text() };
    } } });
  });
  assert.equal(await page.locator('.formatting-workspace .ProseMirror').count(), 1, 'real Milkdown mounts');
  await page.locator('.formatting-workspace .ProseMirror').click();
  await page.keyboard.press('End');
  await page.keyboard.type(' edit in Milkdown');
  await page.getByRole('button', { name:'Copy rich content', exact:true }).click();
  await page.waitForFunction(() => fixture.clipboard);
  assert.match(await page.evaluate(() => fixture.clipboard.html), /font-size:26px/);
  assert.match(await page.evaluate(() => fixture.clipboard.plain), /Heading\n\nParagraph/);
  assert.match(await page.evaluate(() => fixture.clipboard.html), /edit in Milkdown/, 'immediate copy flushes editor');
  assert.equal(await page.evaluate(() => NutbookFormatting.save()), true);
  assert.match(await page.evaluate(() => fixture.saved.markdown), /edit in Milkdown/);
  // Native transport receives the same frozen HTML and must acknowledge readback.
  await page.evaluate(() => {
    const invoke = bridge.invoke;
    bridge.nativeClipboard = true;
    bridge.invoke = async (command, args) => {
      if (command === 'render_formatting_markdown') return '<h1>Heading</h1><p>中文 <a href="https://example.com">普通链接</a></p><pre><code>const a = 1;</code></pre><img src="second.png">';
      if (command === 'read_formatting_image') return 'data:image/png;base64,aGVsbG8=';
      if (command === 'write_formatting_clipboard') {
        fixture.nativeClipboard = args;
        return { verified: !fixture.nativeReject };
      }
      return invoke(command, args);
    };
  });
  await page.getByRole('button', { name:'Copy rich content', exact:true }).click();
  await page.waitForFunction(() => fixture.nativeClipboard);
  const nativeHtml = await page.evaluate(() => fixture.nativeClipboard.html);
  assert.match(nativeHtml, /src="data:image\/png;base64,aGVsbG8="/);
  assert.doesNotMatch(nativeHtml, /line-height:\s*\d+(?:\.\d+)?;/, 'export cannot use unitless line-height');
  assert.match(nativeHtml, /line-height:36\.4px/);
  assert.match(nativeHtml, /line-height:20\.8px/);
  assert.match(nativeHtml, /href="https:\/\/example.com"/, 'ordinary links retain href');
  assert.match(nativeHtml, /\[1\] https:\/\/example.com/, 'literal URL survives platform anchor removal');
  await page.evaluate(() => { fixture.nativeReject = true; });
  await page.getByRole('button', { name:'Copy rich content', exact:true }).click();
  await page.waitForFunction(() => document.querySelector('[role=alert]').textContent.includes('Rich copy failed'));
  assert.match(await page.locator('[role=alert]').textContent(), /Rich copy failed/, 'failed native readback never claims success');
  await page.evaluate(() => NutbookFormatting.leave(1));
  console.log('Formatting clipboard: explicit pixel line heights, inline images and native readback failures passed (transport harness).');
  console.log('Markdown formatting workspace: scroll, source isolation, save conflict, late save, reopen, IME and stale opening passed (browser harness; not native/platform acceptance).');
} finally { await browser.close(); }
