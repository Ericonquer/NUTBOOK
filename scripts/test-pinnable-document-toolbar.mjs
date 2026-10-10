import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { chromium } from 'playwright';
const helpers = {};
vm.createContext(helpers);
vm.runInContext(readFileSync('dist/document-toolbar.js', 'utf8'), helpers);
const toolbar = helpers.NutbookDocumentToolbar;
const plain = value => JSON.parse(JSON.stringify(value));
assert.deepEqual(plain(toolbar.normalize({ markdown: ['remove-from-nutbook', 'export-markdown', 'export-markdown', 'format-markdown'], html: ['format-markdown', 'toggle-runtime-presentation'] })), { markdown: ['export-markdown', 'format-markdown'], html: ['toggle-runtime-presentation'] });
assert.deepEqual(plain(toolbar.read({ getItem() { throw Error('unavailable'); } })), { markdown: [], html: [] });
assert.deepEqual([900, 700, 500, 400].map(toolbar.capacity), [3, 2, 1, 0]);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(`${process.cwd()}/dist/index.html`).href);
  await page.evaluate(() => {
    localStorage.removeItem('nutbook.documentToolbar.v1');
    documentToolbarPreferences.markdown = [];
    documentToolbarPreferences.html = [];
    appState.tabs = [{ id: 981, sourceMode: 'library', preview: { fileType: 'markdown', raw: '# Toolbar acceptance' }, detail: { fileHash: 'sample' }, item: { fileName: 'sample.md' }, isDirty: false }];
    appState.activeTabId = 981;
    document.querySelector('.main-shell').classList.remove('home-mode');
    renderDocumentMoreMenu();
    openDocumentMoreMenu();
  });
  for (const id of ['format-markdown', 'export-markdown-center', 'export-markdown']) {
    await page.locator(`[data-pin-action="${id}"]`).click();
    assert.equal(await page.locator('#documentMoreMenu').getAttribute('aria-hidden'), 'false');
  }
  assert.equal(await page.locator('[data-pinned-action]').count(), 3);
  assert.equal(await page.locator('[data-pin-action="remove-from-nutbook"]').count(), 0);
  assert.equal(await page.locator('[data-document-action]').count(), 4);
  await page.keyboard.press('Escape');
  await page.locator('[data-pinned-action="export-markdown-center"]').click();
  assert.equal(await page.locator('#exportScrim').evaluate(node => node.classList.contains('open')), true);
  await page.evaluate(() => closeMarkdownExportDialog());
  // Capacity changes hide shortcuts without changing the saved order.
  for (const [width, count] of [[700, 2], [550, 1], [430, 0], [1100, 3]]) {
    await page.evaluate(width => {
      const bar = document.querySelector('.document-toolbar');
      bar.style.width = width + 'px'; bar.style.boxSizing = 'border-box';
      renderPinnedDocumentActions(documentActionOptions());
    }, width);
    assert.equal(await page.locator('[data-pinned-action]').count(), count);
  }
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('nutbook.documentToolbar.v1')));
  assert.equal(stored.markdown.length, 3);
  await page.reload();
  assert.deepEqual(await page.evaluate(() => documentToolbarPreferences.markdown), stored.markdown);
  await page.evaluate(() => {
    appState.tabs = [{ id: 982, sourceMode: 'library', preview: { fileType: 'html-runtime' }, item: { tags: [] } }];
    appState.activeTabId = 982;
    document.querySelector('.main-shell').classList.remove('home-mode');
    toggleDocumentToolbarPin('html', 'prepare-native-presentation');
    toggleDocumentToolbarPin('html', 'toggle-runtime-presentation');
  });
  assert.equal(await page.evaluate(() => documentToolbarPreferences.markdown.length), 3);
  assert.equal(await page.evaluate(() => documentToolbarPreferences.html.length), 2);
  const payload = await page.evaluate(() => runtimeControlsOverlayState(getActiveTab(), false));
  assert.equal(payload.toolbar.pinned.length, 2);
  const child = await browser.newPage({ viewport: { width: 450, height: 260 } });
  child.on('pageerror', error => errors.push(error.message));
  await child.addInitScript(payload => { window.__NUTBOOK_RUNTIME_CONTROLS__ = payload; }, payload);
  await child.goto(pathToFileURL(`${process.cwd()}/dist/runtime-overlay.html`).href);
  assert.equal(await child.locator('#pinnedActions button').count(), 2);
  const icons = await child.locator('#pinnedActions button').evaluateAll(nodes => nodes.map(node => node.querySelector('svg').innerHTML));
  assert.notEqual(icons[0], icons[1]);
  // Exercise the actual child title bridge, emulate host acknowledgement only.
  await child.evaluate(() => {
    window.pinActions = [];
    new MutationObserver(() => {
      if (!document.title.startsWith('__NUTBOOK_HTML_CONTROLS__:')) return;
      const action = JSON.parse(document.title.slice('__NUTBOOK_HTML_CONTROLS__:'.length));
      if (action.action === 'toggle-toolbar-pin') window.pinActions.push(action);
    }).observe(document.querySelector('title'), { childList:true, subtree:true, characterData:true });
  });
  await child.locator('#moreButton').click();
  await child.locator('.toolbar-pin').first().waitFor({ state: 'visible' });
  const pinGeometry = await child.locator('.toolbar-pin').first().evaluate(button => ({ width: button.getBoundingClientRect().width, padding: getComputedStyle(button).padding, icon: button.querySelector('svg').getBoundingClientRect().width }));
  assert.deepEqual(pinGeometry, { width:30, padding:'0px', icon:18 });
  await child.locator('.toolbar-pin').first().hover();
  const tipLayout = await child.locator('.toolbar-pin').first().evaluate(button => { const tip = button.querySelector('.tip'); return { text:tip.textContent, right:tip.getBoundingClientRect().right, buttonLeft:button.getBoundingClientRect().left, top:tip.getBoundingClientRect().top, bottom:tip.getBoundingClientRect().bottom, buttonTop:button.getBoundingClientRect().top, buttonBottom:button.getBoundingClientRect().bottom, z:getComputedStyle(tip).zIndex }; });
  assert.equal(tipLayout.text, '取消固定');
  assert.ok(tipLayout.right < tipLayout.buttonLeft);
  assert.ok(tipLayout.top >= tipLayout.buttonTop && tipLayout.bottom <= tipLayout.buttonBottom);
  assert.equal(tipLayout.z, '40');
  await child.locator('.toolbar-pin').first().click();
  await child.waitForFunction(() => window.pinActions.length === 1);
  assert.equal(await child.evaluate(() => window.pinActions[0].name), 'prepare-native-presentation');
  assert.equal(await child.locator('#menu').getAttribute('aria-hidden'), 'false');
  await child.evaluate(payload => window.__NUTBOOK_UPDATE_OVERLAY_STATE__({ ...payload, isEditing:true }), payload);
  assert.equal(await child.locator('#pinnedActions button:disabled').count(), 2);
  assert.equal(await child.locator('.toolbar-pin:disabled').count(), 0);
  await child.evaluate(payload => window.__NUTBOOK_UPDATE_OVERLAY_STATE__({ ...payload, language:'en-US', toolbar:{ ...payload.toolbar, capacity:1 } }), payload);
  assert.equal(await child.locator('#pinnedActions button').count(), 1);
  assert.equal(await child.locator('#pinnedActions button').getAttribute('aria-label'), 'Presentation mode');
  await child.locator('#pinnedActions button').click();
  assert.equal(await child.locator('#nativePresentationProgress').isVisible(), true);
  assert.deepEqual(errors, []);
  console.log('pinnable document toolbar passed (Chromium; native WKWebView acceptance pending).');
} finally { await browser.close(); }
