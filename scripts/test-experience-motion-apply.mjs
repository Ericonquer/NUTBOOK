import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdtempSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const dir=mkdtempSync(join(tmpdir(),'nutbook-apply-once-'));
copyFileSync('integrations/nbskill/templates/motion-presentation.html',join(dir,'index.html'));
copyFileSync('integrations/nbskill/templates/presentation-mark.svg',join(dir,'presentation-mark.svg'));
const browser=await chromium.launch({headless:true});
try{
 for(const file of [join(dir,'index.html'),resolve('docs/presentations/motion-gallery/archive/p3-quiet-backgrounds-review.html')]) {
 const page=await browser.newPage({viewport:{width:1280,height:900}});await page.goto(pathToFileURL(file).href);
 await page.evaluate(()=>window.__TAURI_INTERNALS__={invoke:async()=>true});await page.addScriptTag({path:resolve('dist/assets/html-edit-runtime.js')});
 await page.evaluate(async()=>{await window.__NUTBOOK_HTML_EDIT__.enter({itemId:1,runtimeSessionId:'apply-once',generation:1,inlineToolbar:true,locale:'zh-CN'});window.__NUTBOOK_MOTION__.togglePanel();});
 const target=await page.evaluate(()=>window.__NUTBOOK_MOTION__.getConfig().pages[0].actions[0]?.targetId||document.querySelector('[data-nutbook-page-id] [data-id]').dataset.id);await page.locator(`[data-id="${target}"]`).click();const panel=page.locator('[data-nutbook-motion-panel]');await panel.locator('[data-apply]').click();
 await page.waitForFunction(()=>window.__NUTBOOK_MOTION__.state().playing);
 await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__NUTBOOK_MOTION__.state().playing),true,'playback survives the old refresh/seek path');
 const saved=await page.evaluate(()=>JSON.stringify(window.__NUTBOOK_MOTION__.getConfig()));
 await page.waitForFunction(()=>!window.__NUTBOOK_MOTION__.state().playing,{},{timeout:20000});
 const time=await page.evaluate(()=>window.__NUTBOOK_MOTION__.state().logicalTimeMs);await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>window.__NUTBOOK_MOTION__.state().logicalTimeMs),time,'apply plays once without looping');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.__NUTBOOK_MOTION__.getConfig())),saved,'playback does not mutate stored configuration');
 await panel.locator('[data-apply]').click();await page.waitForFunction(()=>window.__NUTBOOK_MOTION__.state().playing);
 await page.close();
 }
 console.log('New and existing HTML: Apply starts automatically, survives refresh, finishes once and replays on reapply (browser)');
}finally{await browser.close();}
