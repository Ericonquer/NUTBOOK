import assert from 'node:assert/strict';
import {registry} from '../src/motion/contract.mjs';
import {chromium} from 'playwright';
import {mkdtempSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const dir=mkdtempSync(join(tmpdir(),'nutbook-motion-static-')),file=join(dir,'index.html');
copyFileSync('integrations/nbskill/templates/presentation-mark.svg',join(dir,'presentation-mark.svg'));
let source=readFileSync('integrations/nbskill/templates/motion-presentation.html','utf8');
const marker='<script type="application/json" id="nutbook-motion-config" data-id="nutbook-motion-config">',a=source.indexOf(marker)+marker.length,b=source.indexOf('</script>',a),config=JSON.parse(source.slice(a,b));
config.pages[0].actions=['opening-title','opening-copy'].map((targetId,index)=>({id:`static-check-${index}`,targetId,templateId:'text.glyph-particles',templateVersion:1,params:{durationMs:1800,strength:1,density:180},seed:42,trigger:'click',delayMs:500}));
config.pages[0].actions[1].templateId='entrance.gravity-impact';config.pages[0].actions[1].params={durationMs:1800,strength:1};for(const [index,templateId]of ['emphasis.spotlight','exit.particle-dissolve'].entries())config.pages[0].actions.push({id:`static-other-${index}`,targetId:'opening-title',templateId,templateVersion:1,params:Object.fromEntries(Object.entries(registry.templates[templateId].params).map(([key,rule])=>[key,rule.default])),seed:42,trigger:'click',delayMs:0});
config.pages[0].background={id:'static-bg',templateId:'background.flowing-gradient',templateVersion:1,params:Object.fromEntries(Object.entries(registry.templates['background.flowing-gradient'].params).map(([key,rule])=>[key,rule.default])),seed:42};config.pages[0].transition={id:'static-curtain',templateId:'transition.curtain-reveal',templateVersion:1,params:Object.fromEntries(Object.entries(registry.templates['transition.curtain-reveal'].params).map(([key,rule])=>[key,rule.default])),seed:42};source=source.slice(0,a)+JSON.stringify(config)+source.slice(b);writeFileSync(file,source);
const generate=(folder,mode=[])=>execFileSync('cargo',['run','--quiet','--manifest-path','src-tauri/Cargo.toml','--example','generate_native_motion_acceptance','--',folder,...mode],{encoding:'utf8'});
generate(dir,['static']);const browser=await chromium.launch({headless:true});
try{
 const audience=await browser.newPage(),mirror=await browser.newPage();let seq=0;const errors=[];
 await audience.exposeFunction('motionReport',async p=>{if(p.type==='error')errors.push(p.error);if(p.type==='navigation-request')void audience.evaluate(seq=>window.__NUTBOOK_NATIVE_PRESENTATION_NAVIGATE__('evidence',seq),++seq);return true;});
 await audience.addInitScript(()=>window.__TAURI_INTERNALS__={invoke:async(command,args)=>command==='native_presentation_report'?window.motionReport(args.payload):true});
 await audience.addInitScript({path:join(dir,'audience.js')});await mirror.addInitScript({path:join(dir,'mirror.js')});
 await Promise.all([audience.goto(pathToFileURL(file).href),mirror.goto(pathToFileURL(file).href)]);
 await audience.waitForFunction(()=>window.__NUTBOOK_NATIVE_PRESENTATION_NAVIGATE__);await mirror.waitForFunction(()=>document.title.startsWith('__NUTBOOK_LIVE_PREVIEW_READY__'));
 for(const page of [audience,mirror]){
  for(const id of ['opening-title','opening-copy'])assert.equal(await page.locator(`[data-id=${id}]`).evaluate(el=>getComputedStyle(el).opacity),'1');
  assert.equal(await page.evaluate(()=>window.__NUTBOOK_MOTION__.playbackState()),null);assert.equal(await page.locator('[data-nutbook-motion-background]').count(),0,'static session never prepares a background');
  assert.equal(await page.locator('[data-nutbook-motion-transition]').count(),0,'static session never creates transition surfaces');assert.equal(await page.evaluate(()=>window.__NUTBOOK_MOTION__.state().playing),false);
 }
 await audience.mouse.click(30,500);await audience.waitForFunction(()=>window.__NUTBOOK_PRESENTATION__.activePageId==='evidence');
 await mirror.evaluate(()=>window.__NUTBOOK_LIVE_PREVIEW__.select('evidence'));await mirror.waitForFunction(()=>window.__NUTBOOK_PRESENTATION__.activePageId==='evidence');
 await audience.setViewportSize({width:1100,height:700});assert.equal(await audience.evaluate(()=>window.__NUTBOOK_MOTION__.state().playing),false);
 assert.equal(readFileSync(file,'utf8'),source,'static playback never writes the file');
 assert.deepEqual(await audience.evaluate(()=>window.__NUTBOOK_MOTION__.getConfig()),config,'saved animation config is unchanged');
 const normalDir=join(dir,'normal');generate(normalDir);const normal=await browser.newPage();await normal.addInitScript(()=>window.__TAURI_INTERNALS__={invoke:async()=>true});await normal.addInitScript({path:join(normalDir,'audience.js')});await normal.goto(pathToFileURL(file).href);await normal.waitForFunction(()=>window.__NUTBOOK_NATIVE_MOTION_PLAN__);
 assert.equal(await normal.locator('[data-id=opening-title]').evaluate(el=>getComputedStyle(el).opacity),'0','next normal session restores click-step initial state');
 assert.equal(await normal.evaluate(()=>window.__NUTBOOK_MOTION__.playbackState().stepIndex),0);
 assert.deepEqual(errors,[]);console.log(`Static audience/mirror, direct navigation, unchanged source/config and next-session reset passed: ${dir}`);
}finally{await browser.close();}
