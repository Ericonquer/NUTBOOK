import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent('<div id="editorRoot"></div>');
  await page.addScriptTag({ content: readFileSync('dist/assets/markdown-editor.js', 'utf8'), type: 'module' });
  await page.waitForFunction(() => window.NutbookMarkdownEditor?.create);
  await page.evaluate(() => {
    window.calls = []; window.statuses = [];
    window.mount = async (markdown = 'before after', readOnly = false) => {
      window.editor?.destroy();
      window.editor = await NutbookMarkdownEditor.create({ root: document.querySelector('#editorRoot'), markdown, language:'en-US', readOnly,
        resolveImageSrc: () => 'data:image/png;base64,',
        onInsertImageAsset: async () => ({ relativePath:'./assets/picker.png', fileName:'picker.png' }),
        onPasteImageAsset: async (input, { signal }) => {
          calls.push({ type: input.type, src: input.src, size: input.size });
          if (window.delay) await new Promise(resolve => { window.finish = resolve; signal.addEventListener('abort', () => { window.aborted = true; resolve(); }); });
          return { relativePath: './assets/pasted.png', fileName:'pasted.png' };
        }, onImagePasteStatus: (kind, message) => statuses.push({ kind, message })
      });
    };
    window.caret = (offset = 0) => {
      const body = document.querySelector('.ProseMirror'); body.focus();
      const text = body.querySelector('p')?.firstChild;
      const range = document.createRange(); range.setStart(text || body, offset); range.collapse(true);
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    };
    window.paste = async (text, image = false) => {
      const transfer = new DataTransfer();
      if (image) {
        const canvas = document.createElement('canvas'); canvas.width = 8; canvas.height = 8;
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        transfer.items.add(new File([blob], 'clipboard.png', { type:'image/png' }));
      } else transfer.setData('text/plain', text);
      document.querySelector('.ProseMirror').dispatchEvent(new ClipboardEvent('paste', { clipboardData:transfer, bubbles:true, cancelable:true }));
    };
    return mount();
  });
  await page.evaluate(() => { caret(7); return paste('', true); });
  await page.waitForFunction(() => editor.getMarkdown().includes('pasted.png'));
  assert.equal(await page.evaluate(() => calls[0].type), 'image/png');
  assert.match(await page.evaluate(() => editor.getMarkdown()), /before .*pasted\.png.*after/s, 'image lands at paste caret');
  assert.equal(await page.evaluate(() => editor.undo()), true);
  assert.doesNotMatch(await page.evaluate(() => editor.getMarkdown()), /pasted\.png/);
  assert.equal(await page.evaluate(() => editor.redo()), true);
  assert.match(await page.evaluate(() => editor.getMarkdown()), /pasted\.png/);
  await page.evaluate(async () => { await mount(); caret(0); await paste('https://example.com/article'); });
  assert.match(await page.locator('.ProseMirror').textContent(), /https:\/\/example.com\/article/);
  assert.equal(await page.evaluate(() => calls.length), 1, 'ordinary URL does not download');
  await page.evaluate(async () => { await mount(); caret(0); await paste('![cover](https://example.com/download?id=1)'); });
  await page.waitForFunction(() => calls.length === 2 && editor.getMarkdown().includes('pasted.png'));
  assert.equal(await page.evaluate(() => calls[1].src), 'https://example.com/download?id=1');
  await page.evaluate(async () => { await mount(); window.delay = true; caret(0); await paste('', true); });
  await page.waitForFunction(() => window.finish);
  assert.equal(await page.locator('.markdown-image-paste-progress').isVisible(), true, 'pending image has an inline progress marker');
  await page.keyboard.type('newer ');
  await page.evaluate(() => finish());
  await page.waitForFunction(() => statuses.some(s => s.message?.includes('Content changed')));
  assert.match(await page.evaluate(() => editor.getMarkdown()), /newer/);
  assert.equal(await page.locator('.markdown-image-paste-progress').count(), 0);
  assert.doesNotMatch(await page.evaluate(() => editor.getMarkdown()), /pasted.png/, 'late paste never overwrites newer content');
  await page.evaluate(async () => { window.finish = null; await mount(); caret(0); await paste('https://example.com/photo.png'); });
  await page.waitForFunction(() => window.finish);
  await page.evaluate(async () => { await mount('another editor'); window.delay = false; });
  assert.equal(await page.evaluate(() => window.aborted), true, 'destroy cancels in-flight import');
  assert.match(await page.evaluate(() => editor.getMarkdown()), /another editor/);
  const calls = await page.evaluate(() => window.calls.length);
  await page.evaluate(async () => { await mount('read only', true); await paste('', true); });
  assert.equal(await page.evaluate(() => window.calls.length), calls, 'read-only editor has no image paste capability');
  await page.evaluate(async () => { await mount(); caret(7); });
  assert.equal(await page.evaluate(() => editor.insertImageAsset()), true, 'toolbar inserts into an occupied paragraph');
  assert.match(await page.evaluate(() => editor.getMarkdown()), /before .*picker\.png.*after/s);
  assert.equal(await page.evaluate(() => editor.undo()), true);
  assert.doesNotMatch(await page.evaluate(() => editor.getMarkdown()), /picker\.png/);
  const hostFunction = readFileSync('dist/index.html', 'utf8').match(/async function pasteMarkdownImageAssetForTab\(tab, input, options = \{\}\) \{[\s\S]*?\n      \}/)[0];
  await page.evaluate(async code => {
    window.importForTab = eval(`(${code})`);
    window.appState = { activeTabId:7, activeMarkdownEditor:{} };
    window.hostCalls = [];
    window.invoke = async (cmd,args) => {
      hostCalls.push({cmd,args});
      if (cmd === 'fetch_formatting_image') return 'data:image/png;base64,aGVsbG8=';
      return { relativePath:'./assets/pasted.png', fileName:'pasted.png' };
    };
    window.hostTab = { id:7, item:{filePath:'/documents/source.md'}, sourceMode:'library' };
    window.hostFile = new File(['png bytes'], 'paste.png', { type:'image/png' });
    await importForTab(hostTab, hostFile);
  }, hostFunction);
  assert.equal(await page.evaluate(() => hostCalls.at(-1).cmd), 'paste_markdown_image_asset');
  assert.equal(await page.evaluate(() => hostCalls.at(-1).args.itemId), 7);
  await page.evaluate(async () => {
    hostTab.sourceMode = 'external'; hostTab.external = { sessionId:'external-7', generation:4, path:'/external/source.md' };
    await importForTab(hostTab, hostFile);
  });
  assert.equal(await page.evaluate(() => hostCalls.at(-1).cmd), 'external_session_paste_image');
  assert.equal(await page.evaluate(() => hostCalls.at(-1).args.generation), 4);
  assert.equal(await page.evaluate(() => hostTab.external.insertedResources.has('/external/assets/pasted.png')), true);
  await page.evaluate(() => {
    window.invoke = async (cmd,args) => { hostCalls.push({cmd,args}); if (cmd === 'fetch_formatting_image') return new Promise(resolve => { window.finishHost = resolve; }); return {}; };
    window.hostImport = importForTab(hostTab, { src:'https://example.com/p.png' }).then(() => false, () => true);
  });
  await page.waitForFunction(() => window.finishHost);
  const before = await page.evaluate(() => hostCalls.length);
  await page.evaluate(() => { appState.activeTabId = 8; finishHost('data:image/png;base64,aGVsbG8='); });
  assert.equal(await page.evaluate(() => hostImport), true);
  assert.equal(await page.evaluate(() => hostCalls.length), before, 'switching tabs during download cannot write assets');
  console.log('Real Milkdown image paste: caret, undo/redo, URL recognition, late input, destroy cancellation and read-only passed.');
} finally { await browser.close(); }
