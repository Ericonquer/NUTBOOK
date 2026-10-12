import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 680 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(`${process.cwd()}/dist/index.html`).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => typeof renderItems === 'function' && !appState.isBooting);
  await page.evaluate(() => {
    window.openedCards = [];
    openItem = async id => { openedCards.push(id); };
    const tags = Array.from({ length: 20 }, (_, index) => ({ id: index + 1, name: index ? `标签 ${index} 很长的中文标签 Long label` : '主标签' }));
    appState.tags = tags;
    const base = appState.items[0];
    if (!base) throw new Error('Browser demo must supply a real card model');
    appState.items = [1, 2, 3, 4].map(id => ({ ...base, id, tags, thumbnail: null }));
    appState.homeLayout = 'grid'; appState.lastItemsFingerprint = ''; renderItems();
  });
  for (const id of [1, 4]) {
    const trigger = page.locator(`[data-card-tags="${id}"]`);
    await trigger.click();
    const panel = page.locator(`[data-card-tags-panel="${id}"]`);
    assert.equal(await panel.isVisible(), true);
    const bounds = await panel.evaluate(node => {
      const panel = node.getBoundingClientRect(); const own = node.closest('.thumb-wrap').getBoundingClientRect();
      return { contained: panel.left >= own.left && panel.right <= own.right && panel.top >= own.top && panel.bottom <= own.bottom, scrolls: node.querySelector(".card-tags-list").scrollHeight > node.querySelector(".card-tags-list").clientHeight };
    });
    assert.equal(bounds.contained, true, 'Expanded panel must stay inside its own preview');
    assert.equal(bounds.scrolls, true, 'Many tags must scroll internally');
    await page.keyboard.press('Escape');
    assert.equal(await panel.isVisible(), false);
    assert.equal(await trigger.evaluate(node => document.activeElement === node), true);
  }
  assert.deepEqual(await page.evaluate(() => openedCards), [], 'Tag triggers never open a document');
  await page.locator('[data-card-tags="1"]').click();
  await page.evaluate(() => renderItems());
  assert.equal(await page.locator('[data-card-tags-panel="1"]').isVisible(), true, 'Unchanged periodic refresh must not discard an open panel');
  await page.locator('[data-open-item="2"] .item-card-title').click();
  assert.deepEqual(await page.evaluate(() => openedCards), [2], 'Expanded panel must not intercept a neighboring card');
  assert.equal(await page.locator('[data-card-tags-panel="1"]').isVisible(), false);

  await page.evaluate(() => {
    appState.items = appState.items.map(item => ({ ...item, tags: [{id:1,name:'Ai'},{id:2,name:'可复用'},{id:3,name:'标签验收青松'}], sourceBadges: ['project','skill'].flatMap(kind => [1,2].map(n => ({kind,label:kind + ' 很长的来源名称 ' + n,available:true}))) }));
    appState.lastItemsFingerprint = ''; renderItems();
  });
  const card = page.locator('.item-card').first();
  await card.hover();
  const row = card.locator('.thumb-chip-row');
  assert.equal(await row.evaluate(node => getComputedStyle(node).justifyContent), 'flex-end');
  assert.equal(await row.evaluate(node => [...node.children].every(child => { const r=child.getBoundingClientRect(), own=node.getBoundingClientRect(); return r.left >= own.left - 1 && r.right <= own.right + 1; })), true, 'All source types and custom count must fit one row');
  await card.locator('[data-card-tags]').click();
  const readability = await card.locator('.card-tags-panel').evaluate(node => {
    const list = node.querySelector('.card-tags-list');
    const buttons = [...node.querySelectorAll('button')];
    return { visible: list.scrollHeight <= list.clientHeight + 1, reachable: buttons.every(button => { const r=button.getBoundingClientRect(); return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('button') === button; }), size: getComputedStyle(list.querySelector('.tag-chip')).fontSize };
  });
  assert.deepEqual(readability, {visible:true, reachable:true, size:'10px'}, 'Three capsules must be readable and clear of favorite/remove controls');
  if (process.env.NUTBOOK_TAG_SNAPSHOTS) await card.screenshot({path:'/tmp/nutbook-card-tags-expanded.png'});
  await page.setViewportSize({width:1600,height:900});
  await card.locator('[data-card-tags]').click();
  const sameLine = await card.locator('.card-tags-list').evaluate(node => { const pills=[...node.children]; return Math.abs(pills[0].getBoundingClientRect().top-pills[1].getBoundingClientRect().top)<1; });
  assert.equal(sameLine,true,'Two short hidden tags must share a line when the card has room');
  const anchorCheck = await card.locator('.card-tags-panel').evaluate(node => {
    const trigger=node.closest('.thumb-wrap').querySelector('[data-card-tags]');
    const p=node.getBoundingClientRect(), t=trigger.getBoundingClientRect();
    return {arrow:Math.abs(p.left+parseFloat(node.style.getPropertyValue('--card-tag-arrow'))-(t.left+t.width/2))<1, count:node.querySelectorAll('[data-card-tag]').length, close:node.querySelector('[data-close-card-tags]').textContent};
  });
  assert.deepEqual(anchorCheck,{arrow:true,count:2,close:'⌄'});
  await page.keyboard.press('Escape');
  await page.evaluate(() => {
    appState.items[0].fileType='html'; appState.items[1].fileType='markdown';
    appState.lastItemsFingerprint=''; renderItems();
  });
  // Compare identical interaction states, independent of pointer placement after rerender.
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.activeElement?.blur());
  await page.waitForFunction(() => [...document.querySelectorAll('.item-card')].every(card => !card.matches(':hover, :focus-visible')));
  const skins = await page.locator('.item-card').evaluateAll(cards => cards.slice(0,2).map(card => {
    const pill=card.querySelector('.thumb-chip-row .tag-chip'), style=getComputedStyle(pill);
    return Object.fromEntries(['height','fontSize','fontFamily','lineHeight','fontWeight','borderRadius','padding','backgroundColor','borderColor','boxShadow'].map(key=>[key,style[key]]));
  }));
  assert.deepEqual(skins[0],skins[1],'HTML and Markdown card pills must use identical dimensions and skin');
  for (const index of [0,1]) {
    const target=page.locator('.item-card').nth(index);
    await target.hover();
    const hover=await target.evaluate(node=> {
      const pill=node.querySelector('.thumb-chip-row .tag-chip'), type=node.querySelector('.thumb-badge-type');
      const style=getComputedStyle(pill), other=getComputedStyle(type);
      return {background:style.backgroundColor,border:style.borderColor,typeBackground:other.backgroundColor,height:style.height,font:style.fontSize};
    });
    assert.equal(hover.background,'rgba(232, 235, 240, 0.98)');
    assert.equal(hover.background,hover.typeBackground,'Custom and type pills react together');
    assert.equal(hover.border,'rgba(31, 35, 40, 0.28)');
    assert.equal(hover.height,skins[index].height);
    assert.equal(hover.font,skins[index].fontSize);
  }


  // The shared editor's draft is isolated until confirmation, and failures retain it.
  await page.evaluate(() => {
    window.tagWrites = []; window.tagCancels = 0;
    const container = document.createElement('div'); container.id = 'tag-editor-test'; document.body.append(container);
    NutbookTagEditor.mount(container, { language: 'zh-CN', tags: [], available: [],
      onCancel: () => { tagCancels++; },
      onSave: async draft => { tagWrites.push(draft); throw new Error('failure canary'); }
    });
  });
  const editor = page.locator('#tag-editor-test');
  await editor.locator('input:not([type=checkbox])').fill('草稿不落库');
  await editor.getByRole('button', { name: '＋ 新建', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => tagWrites), []);
  await editor.locator('.tag-editor-search').fill('下一枚标签');
  assert.equal(await editor.locator('input[type=checkbox]').count(), 1, 'Searching must retain already selected draft tags');
  assert.equal(await editor.locator('input[type=checkbox]').isChecked(), true);
  await editor.getByRole('button', { name: '确认', exact: true }).click();
  await editor.getByRole('alert').filter({ hasText: 'failure canary' }).waitFor();
  assert.equal(await editor.locator('input[type=checkbox]').isChecked(), true);
  assert.equal(await editor.getByRole('button', { name: '确认', exact: true }).isEnabled(), true);
  await editor.getByRole('button', { name: '取消', exact: true }).click();
  assert.equal(await page.evaluate(() => tagCancels), 1);
  assert.equal(await page.evaluate(() => tagWrites.length), 1);

  const html = await browser.newPage();
  await html.addInitScript(() => { window.__NUTBOOK_RUNTIME_CONTROLS__ = { itemId: 9, typeTag: 'HTML', customTags: [], availableTags: [], language: 'zh-CN', toolbar: { pinned: [], capacity: 3, tagEditor: { session: '1:2' } } }; });
  await html.goto(pathToFileURL(`${process.cwd()}/dist/runtime-overlay.html`).href);
  await html.evaluate(() => { window.tagMessages = []; emit = payload => tagMessages.push(payload); });
  await html.locator('#addTagBtn').click();
  await html.locator('#tagMenuOptions input:not([type=checkbox])').fill('HTML 草稿');
  await html.getByRole('button', { name: '＋ 新建', exact: true }).click();
  await html.getByRole('button', { name: '确认', exact: true }).click();
  const request = await html.evaluate(() => tagMessages.find(message => message.action === 'save-tags'));
  assert.deepEqual(request.selections, [{ name: 'HTML 草稿' }]);
  assert.equal(request.tagSession, '1:2');
  assert.equal(await html.getByRole('button', { name: '确认', exact: true }).isEnabled(), false);
  await html.evaluate(requestId => {
    window.__NUTBOOK_UPDATE_OVERLAY_STATE__({ ...window.__NUTBOOK_RUNTIME_CONTROLS__, toolbar: { pinned: [], capacity: 3, tagEditor: { session: '1:2', saveResult: { requestId, itemId: 9, ok: false, error: 'persist failure' } } } });
  }, request.requestId);
  await html.getByRole('alert').filter({ hasText: 'persist failure' }).waitFor();
  assert.equal(await html.locator('#tagMenuOptions input[type=checkbox]').isChecked(), true);
  await html.getByRole('button', { name: '取消', exact: true }).click();
  assert.equal(await html.locator('#tagMenu').isVisible(), false);
  await html.locator('#addTagBtn').click();
  await html.locator('#tagMenu.open').waitFor();
  await html.locator('#tagMenuOptions .tag-editor-search').fill('失焦取消草稿');
  await html.getByRole('button', {name:'＋ 新建',exact:true}).click();
  await html.evaluate(()=>window.dispatchEvent(new Event('blur')));
  assert.equal(await html.locator('#tagMenu').isVisible(),false,'Sibling WebView focus loss must dismiss the tag draft');
  await html.locator('#addTagBtn').click();
  await html.locator('#tagMenu.open').waitFor();
  assert.equal(await html.getByText('失焦取消草稿',{exact:true}).count(),0,'Outside dismissal must discard unconfirmed draft');
  await html.getByRole('button',{name:'取消',exact:true}).click();
  await html.locator('#addTagBtn').click();
  await html.locator('#tagMenu.open').waitFor();
  await html.locator('#tagMenu').dispatchEvent('mouseleave');
  await html.locator('#tagMenu').dispatchEvent('mouseenter');
  await html.waitForTimeout(750);
  assert.equal(await html.locator('#tagMenu').isVisible(),true,'Returning to menu cancels leave dismissal');
  await html.locator('#tagMenu').dispatchEvent('mouseleave');
  await html.locator('#tagMenu').waitFor({state:'hidden'});
  // Exercise the real invocation adapter, rather than a permissive command mock.
  const wire = await page.evaluate(async () => {
    const calls = [];
    const request = { itemId: 9, selections: [{ name: '真实请求合同' }], primaryIndex: 0 };
    const run = new Function('invokeRaw', 'commandVariants', 'invokeMock', 'appState', 'return (' + invoke.toString() + ')');
    const send = run(async (command, args) => {
      if (command !== 'save_item_tags' || !args.payload || args.payload.payload) throw new Error('missing or nested payload');
      calls.push(args.payload); return { itemId: args.payload.itemId, tags: [] };
    }, commandVariants, () => { throw new Error('must use native adapter'); }, appState);
    await send('save_item_tags', request);
    await send('save_item_tags', { payload: request });
    return calls;
  });
  assert.equal(wire.length, 2);
  for (const payload of wire) assert.deepEqual(payload, { itemId: 9, selections: [{ name: '真实请求合同' }], primaryIndex: 0 });

  // Compare the same component under both real host style sheets.
  await page.evaluate(() => {
    document.getElementById('documentTagMenu').id = 'originalDocumentTagMenu';
    const menu = document.createElement('div'); menu.id = 'documentTagMenu'; menu.className = 'popover-menu document-tag-menu open';
    menu.style.position = 'fixed'; menu.style.left = '400px'; menu.style.top = '100px'; menu.style.zIndex = '10000'; document.body.append(menu);
    NutbookTagEditor.mount(menu, { language: 'zh-CN', tags: [{id:1,name:'已选标签'}], available:[{id:1,name:'已选标签'}], onCancel() {}, onSave: async () => {} });
  });
  await html.evaluate(() => {
    const state = { itemId:9, typeTag:'HTML', customTag:{id:1,name:'已选标签'}, customTags:[{id:1,name:'已选标签'}], availableTags:[{id:1,name:'已选标签'}], language:'zh-CN', toolbar:{pinned:[],capacity:3,tagEditor:{session:'1:2'}} };
    window.__NUTBOOK_UPDATE_OVERLAY_STATE__(state); openTagMenu();
  });
  await html.locator('#tagMenu.open').waitFor({state:'visible'});
  const styles = async (surface, root) => surface.locator(root).evaluate(node => {
    const properties = ['height','fontSize','fontFamily','lineHeight','fontWeight','padding','borderRadius','backgroundColor','color','borderColor','outlineStyle','boxShadow'];
    return ['.tag-editor-search','.tag-editor-create','.tag-editor-row input','.tag-editor-row button','.tag-editor-cancel','.tag-editor-save'].map(selector => {
      const style = getComputedStyle(node.querySelector(selector));
      return Object.fromEntries(properties.map(property => [property, style[property]]));
    });
  });
  await page.locator('#documentTagMenu .tag-editor-search').focus();
  await html.locator('#tagMenu .tag-editor-search').focus();
  assert.deepEqual(await styles(page, '#documentTagMenu'), await styles(html, '#tagMenu'), 'Both hosts must render identical focused input, checkbox and action styles');
  await html.evaluate(() => {
    const root=document.querySelector('#tagMenuOptions');
    NutbookTagEditor.mount(root,{language:'zh-CN',tags:[1,2,3].map(id=>({id,name:'标签'+id})),available:[1,2,3].map(id=>({id,name:'标签'+id})),onCancel(){},onSave:async()=>{}});
  });
  assert.equal(await html.locator('.tag-editor-list').evaluate(n=>n.scrollHeight<=n.clientHeight),true,'Three menu labels must be fully visible without scrolling');
  const checked = await html.locator('#tagMenu input[type=checkbox]').first().evaluate(node => getComputedStyle(node).backgroundColor);
  assert.equal(checked, 'rgb(34, 34, 34)', 'Checked control follows the monochrome product design');
  if (process.env.NUTBOOK_TAG_SNAPSHOTS) {
    await page.locator('#documentTagMenu .tag-editor-search').fill('新的标签');
    await html.locator('#tagMenu .tag-editor-search').fill('新的标签');
    await page.locator('#documentTagMenu').screenshot({path:'/tmp/nutbook-tag-menu-markdown.png'});
    await html.locator('#tagMenu').screenshot({path:'/tmp/nutbook-tag-menu-html.png'});
  }
  const overlayHeight = await page.evaluate(() => { appState.runtimeControlsOverlayMode = 'tags'; return runtimeControlsOverlayHeight(); });
  await html.setViewportSize({ width:350, height:overlayHeight });
  await html.evaluate(() => {
    closeTagMenu({force:true});
    const tags = Array.from({length:20}, (_, index) => ({id:index+1,name:'标签 '+index}));
    window.__NUTBOOK_UPDATE_OVERLAY_STATE__({itemId:9,typeTag:'HTML',customTags:tags,customTag:tags[0],availableTags:tags,language:'zh-CN',toolbar:{pinned:[],capacity:3,tagEditor:{session:'1:2'}}});
    openTagMenu();
    document.querySelector('#tagMenu .tag-editor-error').textContent = '保存失败，请重试。'.repeat(20);
  });
  await html.locator('#tagMenu.open').waitFor({state:'visible'});
  const geometry = await html.locator('#tagMenu').evaluate(node => {
    const menu = node.getBoundingClientRect(); const confirm = node.querySelector('.tag-editor-save').getBoundingClientRect();
    return {bottom:menu.bottom, viewport:innerHeight, reachable:confirm.bottom <= innerHeight && menu.left >= 0 && menu.right <= innerWidth};
  });
  assert.equal(geometry.reachable, true, 'Menu confirm must remain inside the native controls viewport: '+JSON.stringify(geometry));
  assert.deepEqual(errors, []);
  console.log('Custom tags browser DOM and draft regression passed (not native WebView acceptance).');
} finally { await browser.close(); }
