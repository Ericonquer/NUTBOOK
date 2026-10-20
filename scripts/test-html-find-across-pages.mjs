import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {chromium,webkit} from 'playwright';
const rust=readFileSync('src-tauri/src/core/html_runtime.rs','utf8');
const compat=rust.split('pub fn html_runtime_compatibility_script()')[1].split('r#"')[1].split('"#')[0];
const host=readFileSync('dist/index.html','utf8'),start=host.indexOf('const script = `;(()=>{const q=${JSON.stringify(query)}');
assert.ok(start>0);const template=host.slice(start+'const script = '.length,host.indexOf(';\n',start));
const makeScript=new Function('query','payload','backwards','action','replacement','tab','return '+template);
const dir=mkdtempSync(join(tmpdir(),'nutbook-find-pages-')),file=join(dir,'deck.html');
const bridge=readFileSync('src-tauri/resources/export-templates/presentation-bridge.js','utf8');
const fixture=`<!doctype html><html data-nutbook-edit-contract="nutbook-html/v1" data-nutbook-artifact-kind="presentation"><head><style>body{margin:0}.slide{display:none}.slide.active{display:block}</style></head><body><main><section class="slide active" data-nutbook-page-id="a"><p data-id="a-text" data-editable="text">coffee coffee</p></section><section class="slide" data-nutbook-page-id="b"><p data-id="b-text" data-editable="rich-text" data-edit-role="short">co<strong>ffee</strong> COFFEE</p></section><section class="slide" data-nutbook-page-id="c"><p data-id="c-text" data-editable="text">coffee</p><button>coffee</button></section></main><script>${bridge}\nconst pages=[...document.querySelectorAll('.slide')],subs=new Set();let active='a';window.__NUTBOOK_PRESENTATION__=createNutbookPresentationBridge({pages:pages.map(s=>({id:s.dataset.nutbookPageId,title:s.dataset.nutbookPageId})),activePageId:()=>active,goTo(id){active=id;pages.forEach(s=>s.classList.toggle('active',s.dataset.nutbookPageId===id));subs.forEach(fn=>fn(id));return true},subscribe(fn){subs.add(fn);return()=>subs.delete(fn)},setManagedMode(){return true},setEditMode(){return true}});</script></body></html>`;
writeFileSync(file,fixture);
for(const engine of process.argv.includes('--webkit') ? [chromium,webkit] : [chromium]){
 const browser=await engine.launch();try{const page=await browser.newPage();await page.goto(pathToFileURL(file).href);await page.addScriptTag({content:compat});
 const action=async(name,q='coffee',replacement='',cs=false)=>{await page.evaluate(()=>document.title='waiting');await page.evaluate(makeScript(q,{caseSensitive:cs},name==='prev',name,replacement,{id:1}));await page.waitForFunction(()=>document.title.startsWith('__NUTBOOK_HTML_FIND_RESULT__:'));return page.evaluate(()=>JSON.parse(document.title.split('__NUTBOOK_HTML_FIND_RESULT__:')[1]));};
 let result=await action('query');assert.equal(result.total,5);assert.equal(result.current,1);
 await action('next');assert.equal(await page.evaluate(()=>getSelection().anchorOffset),7);
 result=await action('next');assert.equal(result.current,3);assert.equal(await page.evaluate(()=>__NUTBOOK_PRESENTATION__.activePageId),'b');assert.equal(await page.evaluate(()=>getSelection().toString()),'coffee');
 result=await action('prev');assert.equal(result.current,2);assert.equal(await page.evaluate(()=>__NUTBOOK_PRESENTATION__.activePageId),'a');
 assert.equal((await action('query','missing')).total,0);
 assert.equal((await action('query','COFFEE','',true)).total,1);
 await page.evaluate(()=>window.__TAURI_INTERNALS__={invoke:async()=>true});await page.addScriptTag({path:resolve('dist/assets/html-edit-runtime.js')});await page.evaluate(()=>__NUTBOOK_HTML_EDIT__.enter({itemId:1,runtimeSessionId:'find',generation:1,inlineToolbar:true}));
 await action('query','COFFEE','',true);result=await action('replace','COFFEE','tea',true);assert.equal(result.changed,1);assert.equal(await page.locator('[data-id=b-text]').textContent(),'coffee tea');await page.evaluate(()=>__NUTBOOK_HTML_EDIT__.undoHistory());
 await action('query');result=await action('replace_all','coffee','tea');assert.equal(result.changed,5);assert.equal(result.total,0);assert.deepEqual(await page.locator('[data-editable]').allTextContents(),['tea tea','tea tea','tea']);
 await page.evaluate(()=>__NUTBOOK_HTML_EDIT__.undoHistory());assert.deepEqual(await page.locator('[data-editable]').allTextContents(),['coffee coffee','coffee COFFEE','coffee']);assert.equal(await page.locator('strong').textContent(),'ffee');
 await page.evaluate(()=>__NUTBOOK_HTML_EDIT__.redoHistory());assert.deepEqual(await page.locator('[data-editable]').allTextContents(),['tea tea','tea tea','tea']);
 if(engine===chromium){const changes=await page.evaluate(()=>__NUTBOOK_HTML_EDIT__.getSnapshot().changes),saved=join(dir,'saved.html'),json=join(dir,'changes.json');writeFileSync(saved,fixture);writeFileSync(json,JSON.stringify(changes));execFileSync('cargo',['run','--quiet','--manifest-path','src-tauri/Cargo.toml','--example','commit_motion_acceptance','--',saved,json],{stdio:'pipe'});const reopened=await browser.newPage();await reopened.goto(pathToFileURL(saved).href);assert.deepEqual(await reopened.locator('[data-editable]').allTextContents(),['tea tea','tea tea','tea']);await reopened.close();}
 await page.evaluate(()=>__NUTBOOK_HTML_EDIT__.exit({runtimeSessionId:'find',discard:true}));assert.deepEqual(await page.locator('[data-editable]').allTextContents(),['coffee coffee','coffee COFFEE','coffee']);
 console.log(`${engine.name()}: host find action across hidden pages, exact repeated/rich matches, all-page replacement, one undo/redo and discard passed`);
 }finally{await browser.close();}
}
