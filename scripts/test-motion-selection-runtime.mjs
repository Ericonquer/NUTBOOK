import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdtempSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'nutbook-motion-selection-')),file=join(dir,'index.html');
copyFileSync('integrations/nbskill/templates/motion-presentation.html',file);copyFileSync('integrations/nbskill/templates/presentation-mark.svg',join(dir,'presentation-mark.svg'));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 const open=async()=>{await page.goto(pathToFileURL(file).href);await page.evaluate(()=>window.__TAURI_INTERNALS__={invoke:async()=>true});await page.addScriptTag({path:resolve('dist/assets/html-edit-runtime.js')});await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.enter({itemId:1,runtimeSessionId:'selection-test',generation:1,inlineToolbar:true,locale:'zh-CN'}));await page.evaluate(()=>window.__NUTBOOK_MOTION__.togglePanel());};
 const actions=()=>page.evaluate(()=>window.__NUTBOOK_MOTION__.getConfig().pages[0].actions);
 const undo=()=>page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.undoHistory());const redo=()=>page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.redoHistory());
 await open();const panel=page.locator('[data-nutbook-motion-panel]'),title=page.locator('[data-id="opening-title"]'),copy=page.locator('[data-id="opening-copy"]');
 for(const mode of ['select','text']){const button=panel.locator(`[data-${mode}-mode]`);assert.equal(await button.locator('svg').count(),1);await button.hover();assert.equal(await button.locator('[role=tooltip]').evaluate(el=>getComputedStyle(el).opacity),'1');}
 await title.click();await copy.click({modifiers:['Shift']});await page.locator('[data-id="opening-image"]').click({modifiers:['Shift']});
 assert.match(await panel.locator('[data-target]').textContent(),/3/);assert.match(await panel.locator('[data-status]').textContent(),/跳过 1 个不兼容对象/);
 assert.equal(await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.getSnapshot().dirty),false,'selection is not document content');
 await panel.locator('[data-apply]').click();assert.equal((await actions()).length,2);const identities=(await actions()).map(a=>a.id);
 await undo();assert.equal((await actions()).length,0,'bulk apply undoes in one transaction');await redo();assert.deepEqual((await actions()).map(a=>a.id),identities);
 await panel.locator('[data-param=density]').fill('260');assert.deepEqual((await actions()).map(a=>a.params.density),[260,260]);
 await undo();assert.deepEqual((await actions()).map(a=>a.params.density),[180,180]);await redo();
 await panel.locator('[data-color-mode]').selectOption('1', {force:true});await panel.locator('[data-param=hue]').fill('50');assert.deepEqual((await actions()).map(a=>a.params.lightness),[50,50]);
 await panel.locator('[data-reset]').click();assert.deepEqual((await actions()).map(a=>a.params.density),[180,180]);await undo();assert.deepEqual((await actions()).map(a=>a.params.density),[260,260]);
 await panel.locator('[data-remove]').click();assert.equal((await actions()).length,0);await undo();assert.equal((await actions()).length,2);
 // Same-slot replacement preserves the action IDs and is one reversible step.
 await panel.locator('[data-apply]').click();assert.deepEqual((await actions()).map(a=>a.id),identities);await undo();assert.deepEqual((await actions()).map(a=>a.params.density),[260,260]);
 await panel.locator('[data-text-mode]').click();assert.equal(await page.locator('[data-nutbook-motion-selection]').count(),0);
 const original=await title.textContent();await title.fill('正常编辑中文');await undo();assert.equal(await title.textContent(),original);assert.equal((await actions()).length,2);
 await panel.locator('[data-select-mode]').click();assert.equal(await page.evaluate(()=>window.getSelection().isCollapsed),true);await title.click();assert.equal(await page.evaluate(()=>document.activeElement?.dataset.id==='opening-title'),false,'selection mode must not leave the text caret active');
 await copy.click({modifiers:['Meta']});assert.match(await panel.locator('[data-target]').textContent(),/2 个/);
 await page.screenshot({path:join(dir,'selection.png')});
 const snapshot=await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.getSnapshot());writeFileSync(join(dir,'changes.json'),JSON.stringify(snapshot.changes));
 execFileSync('cargo',['run','--quiet','--manifest-path','src-tauri/Cargo.toml','--example','commit_motion_acceptance','--',file,join(dir,'changes.json')],{encoding:'utf8'});
 assert.ok(!readFileSync(file,'utf8').includes('data-nutbook-motion-selection'));
 await open();assert.equal((await actions()).length,2);assert.deepEqual((await actions()).map(a=>a.params.density),[260,260]);assert.deepEqual((await actions()).map(a=>a.params.lightness),[50,50]);
 await title.click();await panel.locator('[data-color-mode]').selectOption('0', {force:true});await copy.click({modifiers:['Shift']});
 assert.equal(await panel.locator('[data-param=hue]').isDisabled(),true,'mixed color modes cannot apply the wrong unit');
 await panel.locator('[data-color-mode]').selectOption('1', {force:true});assert.equal(await panel.locator('[data-param=hue]').isDisabled(),false);
 await page.locator('[data-id="opening-image"]').click();assert.equal(await panel.locator('[data-apply]').isDisabled(),true);
 const beforeUnsupported=JSON.stringify(await actions());await panel.locator('[data-apply]').click({force:true}).catch(()=>{});assert.equal(JSON.stringify(await actions()),beforeUnsupported);
 await page.locator('[data-id="opening-image"]').click({modifiers:['Shift']});assert.match(await panel.locator('[data-target]').textContent(),/0 个/);assert.equal(await panel.locator('[data-apply]').isDisabled(),true);
 await page.evaluate(()=>window.__NUTBOOK_PRESENTATION__.goTo('evidence'));assert.doesNotMatch(await panel.locator('[data-target]').textContent(),/3 个/);
 await page.evaluate(()=>window.__NUTBOOK_MOTION__.dispose());assert.equal(await page.locator('[data-nutbook-motion-selection]').count(),0);
 assert.deepEqual(errors,[]);console.log(`P1 mouse multi-select, compatibility, bulk undo/redo, text mode and Rust save/reopen passed: ${dir}`);
}finally{await browser.close();}
