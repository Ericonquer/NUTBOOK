import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.goto(pathToFileURL(resolve('integrations/nbskill/templates/motion-presentation.html')).href);
 await page.evaluate(()=>window.__TAURI_INTERNALS__={invoke:async()=>true});await page.addScriptTag({path:resolve('dist/assets/html-edit-runtime.js')});
 await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.enter({itemId:1,runtimeSessionId:'dispose-test',generation:1,inlineToolbar:true,locale:'zh-CN'}));await page.evaluate(()=>window.__NUTBOOK_MOTION__.togglePanel());
 await page.locator('[data-nutbook-motion-panel]').locator('[data-apply]').click();
 const state=await page.evaluate(async()=>{const api=window.__NUTBOOK_MOTION__;await api.seek(500);api.dispose();const styles=document.head.querySelectorAll('style').length;const replay=await api.replay(),seek=await api.seek(500);api.setEditMode(true);return {styles,after:document.head.querySelectorAll('style').length,replay,seek,panels:document.querySelectorAll('[data-nutbook-motion-panel]').length,state:api.state()};});
 console.log(JSON.stringify(state));
 assert.equal(state.replay,false);assert.equal(state.seek,false);assert.equal(state.styles,state.after);assert.equal(state.panels,0);assert.equal(state.state.scheduledFrames,0);
 console.log('Disposed runtime rejects late replay/seek/edit without recreating resources');
}finally{await browser.close();}
