import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const uncheckedRequests = [];
  page.on('request', request => { if (request.url().startsWith('https://example.com/')) uncheckedRequests.push(request.url()); });
  await page.setContent('<div id="viewer" style="height:700px"></div>');
  // Include the actual host cascade: the reading editor is hidden by default.
  const hostStyles = [...readFileSync('dist/index.html', 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]).join('\n');
  await page.addStyleTag({ content: hostStyles });
  await page.addStyleTag({ content: readFileSync('dist/markdown-formatting.css', 'utf8') });
  await page.addScriptTag({ content: readFileSync('dist/i18n.js', 'utf8') });
  await page.addScriptTag({ content: readFileSync('dist/markdown-formatting.js', 'utf8') });
  await page.evaluate(() => {
    window.fixture = { saved: null, revision: null, calls: [], choice: 'continue', destroyed: 0, restored: 0, value: 'original' };
    window.bridge = {
      language: () => fixture.language || 'en-US', copyText: async value => { fixture.xText = value; }, activeId: () => 1, container: document.querySelector('#viewer'),
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
        if (command === 'validate_formatting_image_data') return null;
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
  assert.equal(await page.locator('.formatting-editor').isVisible(), true, 'host styles must not hide publishing editor');
  await input.fill('edited');
  await page.waitForTimeout(300);
  await page.evaluate(() => { document.querySelector('.formatting-preview').scrollTop = 800; });
  await input.fill('edited twice');
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => document.querySelector('.formatting-preview').scrollTop), 800, 'preview updates retain scroll position');
  assert.equal(await page.evaluate(() => fixture.destroyed), 0, 'typing never remounts the editor');
  await page.getByRole('tab', { name:'Original', exact:true }).click();
  await page.waitForFunction(() => document.querySelector('.formatting-original h1'));
  assert.equal(await page.locator('.formatting-original [contenteditable=true]').count(), 0);
  assert.equal(await page.getByRole('tab', { name:'Original', exact:true }).getAttribute('aria-selected'), 'true');
  await page.getByRole('tab', { name:'Publishing draft', exact:true }).click();
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
  const phoneButton = page.getByRole('button', { name:'Toggle phone preview width', exact:true });
  await phoneButton.hover();
  const tooltipLayout = await phoneButton.evaluate(button => {
    const tip = button.querySelector('[role=tooltip]'); const r = tip.getBoundingClientRect();
    let clipped = false;
    for (let parent = tip.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent); const bounds = parent.getBoundingClientRect();
      if (['hidden','clip','auto','scroll'].includes(style.overflowX) && (r.left < bounds.left || r.right > bounds.right)) clipped = true;
      if (['hidden','clip','auto','scroll'].includes(style.overflowY) && (r.top < bounds.top || r.bottom > bounds.bottom)) clipped = true;
    }
    return { clipped, visible:getComputedStyle(tip).visibility, withinViewport:r.left >= 0 && r.right <= innerWidth };
  });
  assert.equal(tooltipLayout.clipped, false, 'phone tooltip stays outside clipping ancestors');
  assert.equal(tooltipLayout.visible, 'visible');
  assert.equal(tooltipLayout.withinViewport, true);
  const draftBeforeLocale = await page.locator('.ProseMirror').textContent();
  await page.evaluate(() => { fixture.language = 'zh-CN'; NutbookFormatting.refreshLanguage(); });
  assert.match(await page.locator('.formatting-header strong').textContent(), /Markdown 排版中心/);
  assert.equal(await page.getByRole('tab', { name:'发布稿', exact:true }).count(), 1);
  assert.equal(await page.locator('.markdown-insert-trigger').getAttribute('aria-label'), await page.evaluate(() => NutbookI18n.lookup('markdown.openInsertMenu','zh-CN')));
  assert.equal(await page.getByRole('button', { name:'复制到公众号', exact:true }).locator('[role=tooltip]').textContent(), '复制到公众号');
  await page.evaluate(() => { fixture.language = 'en-US'; NutbookFormatting.refreshLanguage(); });
  assert.match(await page.locator('.formatting-header strong').textContent(), /Markdown Formatting Center/);
  assert.equal(await page.getByRole('button', { name:'Copy to X Articles', exact:true }).locator('[role=tooltip]').textContent(), 'Copy to X Articles');
  assert.equal(await page.locator('.markdown-insert-trigger').getAttribute('aria-label'), await page.evaluate(() => NutbookI18n.lookup('markdown.openInsertMenu','en-US')));
  assert.equal(await page.locator('.ProseMirror').textContent(), draftBeforeLocale, 'locale changes never translate document text');
  assert.equal(await page.locator('.formatting-workspace .ProseMirror').count(), 1, 'real Milkdown mounts');
  assert.equal(await page.locator('.formatting-workspace .ProseMirror').isVisible(), true, 'real editor remains visible under host CSS');
  await page.locator('.ProseMirror p').last().click();
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.locator('.ProseMirror p').filter({ has: page.locator('br.ProseMirror-trailingBreak') }).last().click();
  await page.waitForTimeout(350);
  await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => document.querySelector('.formatting-editor-overlay .markdown-insert-menu.visible'));
  const insertBounds = await page.locator('.markdown-insert-trigger').evaluate(button => {
    const b = button.getBoundingClientRect(); const pane = button.closest('.formatting-left').getBoundingClientRect();
    return { inside:b.left >= pane.left && b.right <= pane.right && b.top >= pane.top && b.bottom <= pane.bottom,
      hittable:button.contains(document.elementFromPoint(b.left+b.width/2,b.top+b.height/2)) };
  });
  assert.equal(insertBounds.inside, true, 'insert trigger fits the publishing pane at an empty paragraph');
  assert.equal(insertBounds.hittable, true, 'insert trigger is not clipped or covered');
  await page.locator('.markdown-insert-trigger').click();
  assert.equal(await page.locator('.markdown-insert-menu.open').count(), 1);
  await page.locator('.ProseMirror').click();
  await page.keyboard.press('Control+z');

  await page.locator('.formatting-workspace .ProseMirror').click();
  await page.keyboard.press('End');
  await page.keyboard.type(' edit in Milkdown');
  await page.getByRole('button', { name:'Copy to WeChat', exact:true }).click();
  await page.waitForFunction(() => fixture.clipboard);
  assert.match(await page.evaluate(() => fixture.clipboard.html), /font-size:\s*32px/);
  assert.match(await page.evaluate(() => fixture.clipboard.plain), /Heading\n\nParagraph/);
  assert.match(await page.evaluate(() => fixture.clipboard.html), /edit in Milkdown/, 'immediate copy flushes editor');
  assert.equal(await page.evaluate(() => NutbookFormatting.save()), true);
  assert.match(await page.evaluate(() => fixture.saved.markdown), /edit in Milkdown/);
  await page.evaluate(async () => { await NutbookFormatting.leave(1); await NutbookFormatting.open(bridge, tab); });
  assert.equal(await page.locator('.formatting-workspace .ProseMirror').isVisible(), true, 'reopened real editor is visible');
  assert.match(await page.locator('.formatting-workspace .ProseMirror').textContent(), /edit in Milkdown/, 'real editor reopens saved publishing changes');
  await page.getByRole('tab', { name:'Original', exact:true }).click();
  assert.equal(await page.locator('.formatting-workspace .ProseMirror').isVisible(), false);
  assert.equal(await page.getByRole('button', { name:'Undo', exact:true }).isDisabled(), true);
  await page.waitForFunction(() => document.querySelector('.formatting-original h1'));
  assert.doesNotMatch(await page.locator('.formatting-original').textContent(), /edit in Milkdown/, 'rendered original stays separate from publishing edits');
  await page.getByRole('tab', { name:'Publishing draft', exact:true }).click();
  assert.equal(await page.locator('.formatting-workspace .ProseMirror').isVisible(), true);
  await page.evaluate(() => {
    fixture.preXInvoke = bridge.invoke;
    fixture.xHtml = '<h1>Article title</h1><p>中文 English <strong>bold</strong><em>italic</em><del>deleted</del><code>inline</code></p><h4>Small heading</h4><ul><li>one</li></ul><ol><li>numbered</li></ol><p><a href="https://example.com/article">Article</a><a href="javascript:alert(1)">unsafe</a></p><pre><code>const x = &lt;tag&gt;;\n  next();</code></pre><table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table><hr><img src="missing.png" alt="First image">';
    bridge.invoke = (command,args) => command === 'render_formatting_markdown' ? Promise.resolve(fixture.xHtml) : fixture.preXInvoke(command,args);
    fixture.clipboard = null;
  });
  const draftBeforeX = await page.locator('.ProseMirror').textContent();
  const phoneBeforeX = await phoneButton.boundingBox();
  await page.getByRole('tab', { name:'X Articles', exact:true }).click();
  await page.waitForFunction(() => document.querySelector('.formatting-x-title h1')?.textContent === 'Article title');
  const unavailableTheme = page.getByRole('button',{name:'Themes are unavailable in X',exact:true});
  assert.equal(await unavailableTheme.getAttribute('aria-disabled'),'true');
  assert.equal(await unavailableTheme.evaluate(node => getComputedStyle(node).cursor),'default');
  await unavailableTheme.hover();
  assert.equal(await unavailableTheme.locator('[role=tooltip]').textContent(),'Themes are unavailable in X');
  await unavailableTheme.dispatchEvent('click');
  assert.equal(await unavailableTheme.getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('.formatting-x-title h1').textContent(),'Article title');
  assert.equal((await phoneButton.boundingBox()).x,phoneBeforeX.x,'phone button remains at the right edge in both modes');
  assert.equal(await page.getByRole('tab',{name:'X Articles',exact:true}).getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('.formatting-x-article .formatting-x-image').count(),1);
  await page.getByRole('button', { name:'Copy article title', exact:true }).click();
  await page.waitForFunction(() => fixture.xText === 'Article title');
  await page.getByRole('button', { name:'Copy to X Articles', exact:true }).click();
  await page.waitForFunction(() => fixture.clipboard);
  const xPayload = await page.evaluate(() => fixture.clipboard);
  assert.match(xPayload.html,/<strong>bold<\/strong>/);
  assert.match(xPayload.html,/<h3>Small heading<\/h3>/);
  assert.match(xPayload.html,/<ol><li>numbered<\/li><\/ol>/);
  assert.match(xPayload.html,/href="https:\/\/example.com\/article"/);
  assert.match(xPayload.html,/const x = &lt;tag&gt;;<br>  next\(\);/);
  assert.match(xPayload.html,/A \| B<br>1 \| 2/);
  assert.match(xPayload.html,/<p>\[Image position 1: First image\]<\/p>/);
  assert.doesNotMatch(xPayload.html,/<hr|\[Divider\]|———/);
  assert.equal(await page.locator('.formatting-x-notice').count(),0,'help is outside article preview');
  assert.equal(await page.locator('[role=status]').textContent(),'Body copied · 1 image to add');
  assert.doesNotMatch(xPayload.html,/<section|<article/,'X clipboard must not wrap blocks in a container that flattens nested Draft blocks');
  assert.doesNotMatch(xPayload.html,/<img|<pre|<table|style=|class=|javascript:|Article title|References/);
  assert.match(xPayload.plain,/• one/);
  assert.match(xPayload.plain,/1\. numbered/);
  assert.match(xPayload.plain,/Article \(https:\/\/example.com\/article\)/);
  assert.equal(await page.locator('.ProseMirror').textContent(),draftBeforeX,'preview and copy never modify publishing content');
  await page.evaluate(() => {
    fixture.originalXHtml = fixture.xHtml;
    fixture.xHtml = '<h1>Title</h1><p>before <strong><img src="a.png" alt="A">middle <img src="b.png" alt="B"> after</strong></p><hr><p>end</p>';
    fixture.clipboard = null;
  });
  await page.getByRole('button',{name:'Copy to X Articles',exact:true}).click();
  await page.waitForFunction(() => fixture.clipboard);
  assert.deepEqual(await page.evaluate(() => {
    const doc = new DOMParser().parseFromString(fixture.clipboard.html,'text/html');
    return [...doc.body.children].map(node => [node.tagName,node.textContent.trim()]);
  }),[['P','before'],['P','[Image position 1: A]'],['P','middle'],['P','[Image position 2: B]'],['P','after'],['P','end']],'inline images split their paragraph without losing text or image order');
  await page.evaluate(() => { fixture.xHtml = '<h1>Title</h1><p>No images</p><hr>'; fixture.clipboard = null; });
  await page.getByRole('button',{name:'Copy to X Articles',exact:true}).click();
  await page.waitForFunction(() => fixture.clipboard && document.querySelector('[role=status]').textContent === 'Body copied');
  assert.doesNotMatch(await page.evaluate(() => fixture.clipboard.html),/<hr|Divider/);
  await page.evaluate(() => { fixture.xHtml = fixture.originalXHtml; });
  // Images use a distinct native PNG transport; failures cannot report success.
  await page.evaluate(() => {
    bridge.nativeClipboard = true;
    fixture.imageReject = false;
    const invoke = bridge.invoke;
    bridge.invoke = async (command,args) => {
      if (command === 'read_formatting_image') return 'data:image/png;base64,aGVsbG8=';
      if (command === 'write_formatting_image_clipboard') { fixture.imageClipboard = args.data; return {verified:!fixture.imageReject}; }
      return invoke(command,args);
    };
  });
  // The first preview intentionally failed loading; retry resolves the same cached source.
  await page.getByRole('button',{name:'Retry failed images',exact:true}).click();
  await page.waitForFunction(() => document.querySelector('.formatting-x-image img')?.getAttribute('src'));
  await page.getByRole('button',{name:'Copy this image',exact:true}).click();
  await page.waitForFunction(() => fixture.imageClipboard);
  assert.equal(await page.evaluate(() => fixture.imageClipboard),'data:image/png;base64,aGVsbG8=');
  await page.evaluate(() => { fixture.imageReject = true; });
  await page.getByRole('button',{name:'Copy this image',exact:true}).click();
  await page.waitForFunction(() => document.querySelector('[role=alert]').textContent.includes('Image copy failed'));
  await page.evaluate(() => { fixture.language = 'zh-CN'; NutbookFormatting.refreshLanguage(); });
  assert.equal(await page.getByRole('button',{name:'复制文章标题',exact:true}).count(),1);
  assert.equal(await page.getByRole('button',{name:'X 不支持主题',exact:true}).getAttribute('aria-disabled'),'true');
  await page.evaluate(() => { fixture.language = 'en-US'; NutbookFormatting.refreshLanguage(); });
  await page.getByRole('tab',{name:'WeChat',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Theme and formatting',exact:true}).isDisabled(),false);
  await page.evaluate(() => { bridge.invoke = fixture.preXInvoke; bridge.nativeClipboard = false; });
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
  await page.getByRole('button', { name:'Copy to WeChat', exact:true }).click();
  await page.waitForFunction(() => fixture.nativeClipboard);
  const nativeHtml = await page.evaluate(() => fixture.nativeClipboard.html);
  assert.match(nativeHtml, /src="data:image\/png;base64,aGVsbG8="/);
  assert.doesNotMatch(nativeHtml, /line-height:\s*\d+(?:\.\d+)?;/, 'export cannot use unitless line-height');
  assert.match(nativeHtml, /line-height:\s*41\.6px/);
  assert.match(nativeHtml, /23\.8px/);
  assert.match(nativeHtml, /href="https:\/\/example.com"/, 'ordinary links retain href');
  assert.match(nativeHtml, /\[1\] https:\/\/example.com/, 'literal URL survives platform anchor removal');
  await page.evaluate(() => { fixture.nativeClipboard = null; });
  await page.getByRole('button',{name:'Copy to X Articles',exact:true}).click();
  await page.waitForFunction(() => fixture.nativeClipboard);
  assert.doesNotMatch(await page.evaluate(() => fixture.nativeClipboard.html),/<section|<article|<h1/,'native X payload is an unwrapped block fragment too');
  assert.match(await page.evaluate(() => fixture.nativeClipboard.html),/<p>\[Image position 1:/);
  await page.evaluate(() => { fixture.nativeReject = true; });
  await page.getByRole('button', { name:'Copy to WeChat', exact:true }).click();
  await page.waitForFunction(() => document.querySelector('[role=alert]').textContent.includes('Rich copy failed'));
  assert.match(await page.locator('[role=alert]').textContent(), /Rich copy failed/, 'failed native readback never claims success');
  await page.evaluate(() => NutbookFormatting.leave(1));
  // Theme settings and image caches persist independently of the source.
  await page.evaluate(async () => {
    fixture.saved = null; fixture.revision = null; fixture.nativeReject = false;
    bridge.nativeClipboard = false;
    bridge.invoke = fixture.originalInvoke;
    await NutbookFormatting.open(bridge, tab);
  });
  await page.getByRole('button', { name:'Theme and formatting', exact:true }).click();
  const settingsLayout = await page.evaluate(() => {
    const panel = document.querySelector('.formatting-settings').getBoundingClientRect();
    const columns = document.querySelector('.formatting-columns').getBoundingClientRect();
    const workspace = document.querySelector('.formatting-workspace').getBoundingClientRect();
    const themes = document.querySelector('.formatting-themes');
    return { noOverlap:panel.bottom <= columns.top, fullWidth:Math.abs(panel.width-columns.width)<1,
      withinWorkspace:panel.left>=workspace.left && panel.right<=workspace.right,
      textOnly:!themes.querySelector('.formatting-theme-sample'),
      grouped:themes.getBoundingClientRect().right <= document.querySelector('.formatting-adjustments').getBoundingClientRect().left,
      stacked:getComputedStyle(document.querySelector('.formatting-adjustments')).flexDirection === 'column',
      thin:getComputedStyle(document.querySelector('.formatting-settings')).scrollbarWidth };
  });
  assert.equal(settingsLayout.noOverlap, true, 'theme settings occupy flow space above both columns');
  assert.equal(settingsLayout.fullWidth, true, 'theme settings do not consume preview width');
  assert.equal(settingsLayout.withinWorkspace, true);
  assert.equal(settingsLayout.textOnly, true);
  assert.equal(settingsLayout.grouped, true, 'templates are left of adjustments');
  assert.equal(settingsLayout.stacked, true, 'adjustments form a vertical group');
  assert.equal(settingsLayout.thin, 'thin');
  const upcoming = page.getByRole('button', { name:'More templates coming soon', exact:true });
  assert.equal(await upcoming.getAttribute('aria-disabled'), 'true');
  const themeBeforeUpcoming = await page.locator('.formatting-theme-name').textContent();
  await upcoming.evaluate(node => node.click());
  assert.equal(await page.locator('.formatting-theme-name').textContent(), themeBeforeUpcoming, 'future template placeholder never changes the current theme');
  assert.equal(await page.locator('.formatting-settings-head').getByRole('button', { name:'Reset theme', exact:true }).count(), 1);

  for (const [key, label, expectedColor, expectedFont] of [
    ['simple','Paper','rgb(245, 245, 247)','Inter'],
    ['reading','Longform','','Inter'],
    ['tech','Whitespace','','Inter'],
    ['newspaper','Newspaper','rgb(250, 249, 245)','Georgia'],
    ['fine','Fine lines','','Inter'],
    ['minimal','Minimal','rgb(247, 247, 249)','Inter']
  ]) {
    await page.getByRole('button', { name:label, exact:true }).click();
    await page.waitForFunction(({color,font}) => {
      const section = document.querySelector('.formatting-preview>section');
      return section?.style.background === color && section?.style.fontFamily.includes(font);
    }, { color:expectedColor, font:expectedFont });
    assert.equal(await page.evaluate(() => NutbookFormatting.save()), true);
    assert.equal(await page.evaluate(() => fixture.saved.settings.theme), key);
    await page.evaluate(() => { fixture.clipboard = null; });
    await page.getByRole('button', { name:'Copy to WeChat', exact:true }).click();
    await page.waitForFunction(() => fixture.clipboard);
    const output = await page.evaluate(() => {
      const template = document.createElement('template'); template.innerHTML = fixture.clipboard.html;
      const section = template.content.querySelector('section');
      return { background:section.style.background, font:section.style.fontFamily, html:fixture.clipboard.html };
    });
    assert.equal(output.background, expectedColor, `${label} copy uses the preview surface`);
    assert.ok(output.font.includes(expectedFont), `${label} copy preserves its font`);
    assert.doesNotMatch(output.html, /line-height:\s*\d+(?:\.\d+)?;/);
    await page.evaluate(async () => { await NutbookFormatting.leave(1); await NutbookFormatting.open(bridge, tab); });
    assert.equal(await page.locator('.formatting-theme-name').textContent(), label);
    await page.getByRole('button', { name:'Theme and formatting', exact:true }).click();
  }
  await page.getByRole('button', { name:'Longform', exact:true }).click();
  await page.getByRole('slider', { name:'Font size', exact:true }).fill('18');
  assert.equal(await page.evaluate(() => NutbookFormatting.save()), true);
  assert.equal(await page.evaluate(() => fixture.saved.settings.theme), 'reading');
  assert.equal(await page.evaluate(() => fixture.saved.settings.size), 18);
  await page.evaluate(async () => { await NutbookFormatting.leave(1); await NutbookFormatting.open(bridge, tab); });
  assert.equal(await page.locator('.formatting-theme-name').textContent(), 'Longform');
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 16; canvas.height = 16;
    fixture.png = canvas.toDataURL('image/png');
    const data = new DataTransfer();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    data.items.add(new File([blob], 'paste.png', { type:'image/png' }));
    const body = document.querySelector('.ProseMirror'); body.focus();
    const selection = getSelection(); selection.selectAllChildren(body); selection.collapseToEnd();
    body.dispatchEvent(new ClipboardEvent('paste', { clipboardData:data, bubbles:true, cancelable:true }));
  });
  await page.waitForFunction(() => document.querySelector('.ProseMirror img'));
  await page.evaluate(() => { fixture.language = 'zh-CN'; NutbookFormatting.refreshLanguage(); fixture.language = 'en-US'; NutbookFormatting.refreshLanguage(); });
  await page.getByRole('button', { name:'Undo', exact:true }).click();
  assert.equal(await page.locator('.ProseMirror img').count(), 0, 'toolbar undo uses editor image history');
  assert.equal(await page.locator('[role=status]').textContent(), 'Saved', 'undoing an image restores the saved document baseline despite retained history assets');
  await page.keyboard.press('Control+Shift+z');
  assert.equal(await page.locator('.ProseMirror img').count(), 1);
  assert.equal(await page.evaluate(() => NutbookFormatting.save()), true);
  assert.match(await page.evaluate(() => fixture.saved.markdown), /nutbook-image-/);
  assert.equal(await page.evaluate(() => Object.values(fixture.saved.assets).some(v => v === fixture.png)), true);
  await page.evaluate(async () => { await NutbookFormatting.leave(1); await NutbookFormatting.open(bridge, tab); });
  await page.waitForFunction(() => document.querySelector('.ProseMirror img')?.getAttribute('src')?.startsWith('data:image/png;base64,'));
  assert.match(await page.locator('.ProseMirror img').first().getAttribute('src'), /^data:image\/png;base64,/);
  // A remote image is fetched once, then remains usable offline after reopening.
  await page.evaluate(async () => {
    await NutbookFormatting.leave(1);
    fixture.saved = null; fixture.revision = null; fixture.remoteCalls = 0;
    tab.preview.raw = '![remote](https://example.com/photo.png)';
    const base = fixture.originalInvoke;
    bridge.invoke = async (cmd, args) => {
      if (cmd === 'render_formatting_markdown') return '<p><img src="https://example.com/photo.png" alt="remote"></p>';
      if (cmd === 'fetch_formatting_image') { fixture.remoteCalls++; if (fixture.offline) throw new Error('offline'); return fixture.png; }
      return base(cmd, args);
    };
    await NutbookFormatting.open(bridge, tab);
    await NutbookFormatting.save();
    await NutbookFormatting.leave(1);
    fixture.offline = true;
    await NutbookFormatting.open(bridge, tab);
  });
  assert.equal(uncheckedRequests.length, 0, 'editor DOM cannot request unchecked network image URLs');
  assert.equal(await page.evaluate(() => fixture.remoteCalls), 1, 'cached remote image does not refetch on save/reopen');
  assert.match(await page.locator('.formatting-preview img').getAttribute('src'), /^data:image\/png;base64,/);
  assert.equal(await page.locator('[role=alert]').textContent(), '');
  await page.evaluate(() => NutbookFormatting.leave(1));
  // A slow response cannot repopulate a disposed workspace; leave cancels it.
  await page.evaluate(() => {
    fixture.saved = null; fixture.revision = null; fixture.choice = 'discard'; fixture.cancelled = []; fixture.slowFetches = 0;
    bridge.invoke = async (cmd, args) => {
      if (cmd === 'load_formatting_draft') return { draft:null, revision:null, source:'![slow](https://example.com/slow.png)' };
      if (cmd === 'render_formatting_markdown') return '<img src="https://example.com/slow.png"><img src="https://example.com/next.png">';
      if (cmd === 'fetch_formatting_image') { fixture.slowFetches++; return new Promise(resolve => { fixture.finishRemote = () => resolve(fixture.png); }); }
      if (cmd === 'cancel_formatting_image') { fixture.cancelled.push(args.requestId); return true; }
      return fixture.originalInvoke(cmd,args);
    };
    window.remoteOpening = NutbookFormatting.open(bridge, tab);
  });
  await page.waitForFunction(() => fixture.finishRemote);
  assert.equal(await page.evaluate(() => NutbookFormatting.leave(1)), true);
  assert.equal(await page.evaluate(() => fixture.cancelled.length), 1);
  await page.evaluate(async () => { fixture.finishRemote(); await remoteOpening; });
  assert.equal(await page.locator('.formatting-workspace').count(), 0);
  assert.equal(await page.evaluate(() => fixture.slowFetches), 1, 'closing must not start later images in the queue');
  console.log('Formatting clipboard: explicit pixel line heights, inline images and native readback failures passed (transport harness).');
  console.log('Markdown formatting workspace: scroll, source isolation, save conflict, late save, reopen, IME and stale opening passed (browser harness; not native/platform acceptance).');
} finally { await browser.close(); }
