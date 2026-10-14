import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdtempSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const output=mkdtempSync(join(tmpdir(),'nutbook-motion-formal-'));
const file=join(output,'index.html');
// Start with a static config only in the temporary test copy; preserve user source.
const input=process.argv[2] || 'integrations/nbskill/templates/motion-presentation.html';
const original=readFileSync(input,'utf8');
copyFileSync(join(dirname(input),'presentation-mark.svg'),join(output,'presentation-mark.svg'));
const marker='<script type="application/json" id="nutbook-motion-config" data-id="nutbook-motion-config">';
const start=original.indexOf(marker)+marker.length,end=original.indexOf('</script>',start);
const config=JSON.parse(original.slice(start,end));config.pages.forEach(p=>p.actions=[]);
writeFileSync(file,original.slice(0,start)+JSON.stringify(config)+original.slice(end));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});await page.route(/^https?:/,route=>route.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const open=async()=>{await page.goto(pathToFileURL(file).href);await page.evaluate(()=>window.__TAURI_INTERNALS__={invoke:async()=>true});await page.addScriptTag({path:resolve('dist/assets/html-edit-runtime.js')});await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.enter({itemId:1,runtimeSessionId:'formal-probe',generation:1,inlineToolbar:true,locale:'zh-CN'}));await page.evaluate(()=>window.__NUTBOOK_MOTION__.togglePanel());};
 if (process.argv[2]) {
  await page.goto(pathToFileURL(file).href);
  assert.equal(await page.evaluate(()=>window.__NUTBOOK_MOTION__.state().playing),false,'optional template starts static');
  assert.equal(await page.locator('img').evaluate(img=>img.complete && img.naturalWidth>0),true,'local asset survives clean directory copy');
  await page.evaluate(()=>{window.motionPageEvents=[];window.__NUTBOOK_PRESENTATION__.subscribe(id=>window.motionPageEvents.push(id));});
  await page.locator('[data-next]').click();
  assert.equal(await page.locator('.slide.active').getAttribute('data-nutbook-page-id'),'evidence');
  assert.deepEqual(await page.evaluate(()=>window.motionPageEvents),['evidence']);
  await page.evaluate(()=>window.__NUTBOOK_PRESENTATION__.setManagedMode(true));
  assert.equal(await page.locator('.controls').isVisible(),false);
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>window.__NUTBOOK_PRESENTATION__.activePageId),'evidence');
  assert.equal(await page.evaluate(()=>window.__NUTBOOK_PRESENTATION__.goTo('missing')),false);
  await page.evaluate(()=>window.__NUTBOOK_PRESENTATION__.setManagedMode(false));
  await page.locator('[data-prev]').click();
  assert.equal(await page.locator('.slide.active').getAttribute('data-nutbook-page-id'),'opening');
 }
 await open();assert.equal(await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.getSnapshot().dirty),false);
 const pausedPreparation=await page.evaluate(async()=>{
  let ready;const deferred=new Promise(resolve=>ready=resolve);
  Object.defineProperty(document.fonts,'ready',{configurable:true,value:deferred});
  try{const replay=window.__NUTBOOK_MOTION__.replay();window.__NUTBOOK_MOTION__.pause();ready();return {applied:await replay,playing:window.__NUTBOOK_MOTION__.state().playing};}
  finally{delete document.fonts.ready;}
 });
 assert.deepEqual(pausedPreparation,{applied:false,playing:false},'pause invalidates a late preparation result');
 const panel=page.locator('[data-nutbook-motion-panel]');await panel.locator('[data-apply]').click();
 assert.equal(await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.getSnapshot().dirty),true);
 const target=await page.evaluate(()=>window.__NUTBOOK_MOTION__.getConfig().pages[0].actions[0].targetId);
 await panel.locator('[data-param="strength"]').fill('1.5');
 await page.locator(`[data-id="${target}"]`).fill('中文👩‍💻与新观点');
 await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.undoHistory());
 assert.notEqual(await page.locator(`[data-id="${target}"]`).textContent(),'中文👩‍💻与新观点');
 assert.equal(await panel.locator('[data-param="strength"]').inputValue(),'1.5');
 await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.redoHistory());
 const beforePreview=await page.evaluate(()=>JSON.stringify(window.__NUTBOOK_HTML_EDIT__.getSnapshot().changes));
 await page.evaluate(()=>window.__NUTBOOK_MOTION__.seek(800));
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__NUTBOOK_HTML_EDIT__.getSnapshot().changes)),beforePreview,'preview cannot alter saved changes');
 const expected=await page.evaluate(()=>window.__NUTBOOK_MOTION__.canvas.toDataURL());
 for(const t of [0,100,400,800])await page.evaluate(t=>window.__NUTBOOK_MOTION__.seek(t),t);
 assert.equal(await page.evaluate(()=>window.__NUTBOOK_MOTION__.canvas.toDataURL()),expected);
 await panel.locator('[data-param="hue"]').fill('30');
 await page.waitForFunction(()=>window.__NUTBOOK_MOTION__.state().scheduledFrames===0);
 await page.evaluate(()=>window.__NUTBOOK_MOTION__.seek(800));
 assert.notEqual(await page.evaluate(()=>window.__NUTBOOK_MOTION__.canvas.toDataURL()),expected,'hue changes the visible particles');
 await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.undoHistory());
 assert.equal(await panel.locator('[data-param="hue"]').inputValue(),'210');
 await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.redoHistory());
 assert.equal(await panel.locator('[data-param="hue"]').inputValue(),'30');
 for(const lightness of ['0','50','100']){
  await panel.locator('[data-color-mode]').selectOption('1', {force:true});await panel.locator('[data-param="hue"]').fill(lightness);
  assert.equal(await panel.locator('[data-param="hue"]').isVisible(),true);
  await page.evaluate(()=>window.__NUTBOOK_MOTION__.seek(800));
  const pixels=await page.evaluate(()=>{const c=window.__NUTBOOK_MOTION__.canvas,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let visible=0,wrong=0;for(let i=0;i<d.length;i+=4){if(d[i+3]>20){visible++;if(d[i]!==d[i+1]||d[i]!==d[i+2])wrong++;}}return {visible,wrong};});
  assert.ok(pixels.visible>0);assert.equal(pixels.wrong,0,'monochrome particles have equal RGB channels');
 }
 await panel.locator('[data-reset]').click();
 assert.equal(await panel.locator('[data-color-mode]').inputValue(),'0');
 assert.equal(await panel.locator('[data-param="hue"]').inputValue(),'210');
 await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.undoHistory());
 assert.equal(await panel.locator('[data-color-mode]').inputValue(),'1');
 assert.equal(await panel.locator('[data-param="hue"]').inputValue(),'100');
 const snapshot=await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.getSnapshot());writeFileSync(join(output,'changes.json'),JSON.stringify(snapshot.changes));
 execFileSync('cargo',['run','--quiet','--manifest-path','src-tauri/Cargo.toml','--example','commit_motion_acceptance','--',file,join(output,'changes.json')],{encoding:'utf8'});
 const saved=readFileSync(file,'utf8');assert.ok(saved.includes('中文👩‍💻与新观点'));assert.ok(!saved.includes('contenteditable="'));
 await open();assert.equal(await page.locator(`[data-id="${target}"]`).textContent(),'中文👩‍💻与新观点');assert.equal(await panel.locator('[data-param="strength"]').inputValue(),'1.5');assert.equal(await panel.locator('[data-param="hue"]').inputValue(),'100');
 assert.equal(await panel.locator('[data-color-mode]').inputValue(),'1','color mode persists after disk save and reopen');
 await panel.locator('[data-param="strength"]').fill('0.5');await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.exit({runtimeSessionId:'formal-probe',discard:true}));
 assert.equal(await page.evaluate(()=>window.__NUTBOOK_MOTION__.getConfig().pages[0].actions[0].params.strength),1.5);assert.equal(await panel.count(),0);
 await page.waitForFunction(()=>!window.__NUTBOOK_MOTION__.state().preparing);
 await page.evaluate(()=>window.__NUTBOOK_MOTION__.pause());
 const beforeFullscreen=await page.evaluate(()=>window.__NUTBOOK_MOTION__.state().generation);
 await page.evaluate(()=>window.__NUTBOOK_MOTION__.fullscreenChanged(true));
 await page.waitForFunction(()=>window.__NUTBOOK_MOTION__.state().playing);
 assert.ok(await page.evaluate(()=>window.__NUTBOOK_MOTION__.state().generation)>beforeFullscreen);
 const firstFullscreen=await page.evaluate(()=>window.__NUTBOOK_MOTION__.state().generation);
 await page.evaluate(()=>window.__NUTBOOK_MOTION__.fullscreenChanged(true));
 assert.equal(await page.evaluate(()=>window.__NUTBOOK_MOTION__.state().generation),firstFullscreen,'duplicate host focus does not replay');
 await page.evaluate(()=>{window.__NUTBOOK_MOTION__.pause();window.__NUTBOOK_MOTION__.fullscreenChanged(false);});
 assert.equal(await page.evaluate(()=>window.__NUTBOOK_MOTION__.state().playing),false,'exit does not replay');
 await page.evaluate(()=>window.__NUTBOOK_MOTION__.fullscreenChanged(true));
 await page.waitForFunction(()=>window.__NUTBOOK_MOTION__.state().playing);
 await page.evaluate(()=>{window.__NUTBOOK_MOTION__.pause();window.dispatchEvent(new Event('resize'));});
 await page.waitForFunction(()=>window.__NUTBOOK_MOTION__.state().playing);
 assert.deepEqual(errors,[]);console.log(`Formal runtime + Rust disk commit checks passed: ${output}`);
}finally{await browser.close();}
