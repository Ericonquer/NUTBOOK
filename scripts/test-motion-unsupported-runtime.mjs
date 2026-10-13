import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFileSync,writeFileSync,mkdtempSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'nutbook-motion-unsupported-'));
const base=readFileSync('integrations/nbskill/templates/motion-presentation.html','utf8');
const marker='<script type="application/json" id="nutbook-motion-config" data-id="nutbook-motion-config">';
const start=base.indexOf(marker)+marker.length,end=base.indexOf('</script>',start);
const cases=[['version',base.replace('data-nutbook-motion-contract="nutbook-motion/v1"','data-nutbook-motion-contract="nutbook-motion/v99"')],['config',base.slice(0,start)+'{broken-json'+base.slice(end)]];
copyFileSync('integrations/nbskill/templates/presentation-mark.svg',join(dir,'presentation-mark.svg'));
const browser=await chromium.launch({headless:true});
try{
 for(const [reason,source] of cases){
  const file=join(dir,reason+'.html');writeFileSync(file,source);
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route(/^https?:/,route=>route.abort());await page.goto(pathToFileURL(file).href);
  assert.equal(await page.evaluate(()=>window.__NUTBOOK_MOTION_SUPPORT__.reason),reason);
  assert.equal(await page.locator('[data-nutbook-motion-layer]').count(),0);
  assert.equal(await page.locator('[data-id="opening-title"]').evaluate(el=>getComputedStyle(el).opacity),'1');
  await page.evaluate(()=>window.__TAURI_INTERNALS__={invoke:async()=>true});await page.addScriptTag({path:resolve('dist/assets/html-edit-runtime.js')});
  await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.enter({itemId:1,runtimeSessionId:'unsupported-test',generation:1,inlineToolbar:true,locale:'zh-CN'}));
  assert.equal(await page.locator('[data-nutbook-motion-panel]').count(),0);
  await page.locator('[data-id="opening-title"]').fill('正文仍能安全编辑');
  const snapshot=await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.getSnapshot());
  assert.ok(!snapshot.changes['nutbook-motion-config']);
  const changes=join(dir,reason+'-changes.json');writeFileSync(changes,JSON.stringify(snapshot.changes));
  execFileSync('cargo',['run','--quiet','--manifest-path','src-tauri/Cargo.toml','--example','commit_motion_acceptance','--',file,changes],{encoding:'utf8'});
  const saved=readFileSync(file,'utf8');
  const configOf=text=>text.slice(text.indexOf(marker)+marker.length,text.indexOf('</script>',text.indexOf(marker)+marker.length));
  assert.equal(configOf(saved),configOf(source),'unsupported config survives body save byte-for-byte');
  assert.ok(saved.includes('正文仍能安全编辑'));await page.reload();
  assert.equal(await page.locator('[data-id="opening-title"]').textContent(),'正文仍能安全编辑');assert.deepEqual(errors,[]);await page.close();
 }
 console.log(`Unsupported versions/broken JSON remain readable, body-saveable and config-preserving: ${dir}`);
}finally{await browser.close();}
