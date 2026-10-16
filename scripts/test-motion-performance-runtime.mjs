import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFileSync,writeFileSync,copyFileSync,mkdtempSync} from 'node:fs';
import {tmpdir,release,cpus} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {nearestRank} from '../src/motion/measurement.mjs';
const dir=mkdtempSync(join(tmpdir(),'nutbook-motion-performance-')),file=join(dir,'performance.html');
// Upgrade only the disposable test copy; keep authored benchmark and user files intact.
const original=readFileSync('docs/presentations/motion-gallery/archive/performance.html','utf8');
const marker='id="nutbook-motion-config"',runtimeStart=original.indexOf('<script>',original.indexOf('</script>',original.indexOf(marker)))+8,runtimeEnd=original.indexOf('</script>',runtimeStart);
const source=Buffer.from(original.slice(0,runtimeStart)+'\n'+readFileSync('src-tauri/resources/export-templates/motion-runtime.js','utf8')+'\n'+original.slice(runtimeEnd));
writeFileSync(file,source);copyFileSync('docs/presentations/motion-gallery/presentation-mark.svg',join(dir,'presentation-mark.svg'));
const metadata={machine:cpus()[0]?.model||'unverified',os:release(),power:'unverified',displayMode:'single',preset:'standard',sourceHash:createHash('sha256').update(source).digest('hex'),evidence:'Chromium-regression'};
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1,reducedMotion:'no-preference'}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));await page.route(/^https?:/,route=>route.abort());
 await page.goto(pathToFileURL(file).href);
 const metadataProbe=await page.evaluate(()=>window.__NUTBOOK_MOTION__.measureSteady({warmupMs:0,durationMs:150,metadata:{preset:'standard',validatedPreset:false}}));
 assert.equal(metadataProbe.metadata.validatedPreset,true,'runtime derives actual standard parameters');
 await page.evaluate(()=>{const api=window.__NUTBOOK_MOTION__,config=api.getConfig();config.pages[0].actions[0].params.density=181;document.getElementById('nutbook-motion-config').textContent=JSON.stringify(config);api.refresh();});
 const changedProbe=await page.evaluate(()=>window.__NUTBOOK_MOTION__.measureSteady({warmupMs:0,durationMs:150,metadata:{preset:'standard',validatedPreset:true}}));
 assert.equal(changedProbe.metadata.validatedPreset,false,'caller cannot label changed parameters as standard');
 assert.ok(changedProbe.setupIssues.includes('non-standard-parameters'));
 await page.goto(pathToFileURL(file).href);
 if(process.env.MOTION_METRICS_SMOKE==='1'){
  await page.locator('[data-bench-start]').click();await page.locator('[data-bench-stop]').click();
  await page.waitForFunction(()=>document.querySelector('[data-bench-status]').value.startsWith('已取消'));
  assert.equal(await page.evaluate(()=>window.__NUTBOOK_MOTION__.measurementState().scheduledFrames),0);
  console.log('Final runtime metadata, standard parameter derivation and cancellation checks passed');
 }else{
 await page.evaluate(()=>window.__TAURI_INTERNALS__={invoke:async()=>true});
 await page.addScriptTag({path:resolve('dist/assets/html-edit-runtime.js')});
 await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.enter({itemId:1,runtimeSessionId:'performance-test',generation:1,inlineToolbar:true,locale:'zh-CN'}));await page.evaluate(()=>window.__NUTBOOK_MOTION__.togglePanel());
 await page.locator('[data-nutbook-motion-panel]').locator('[data-remove]').click();
 const cold=await page.evaluate(()=>window.__NUTBOOK_MOTION__.measureInteraction('cold-apply',()=>document.querySelector('[data-nutbook-motion-panel]').shadowRoot.querySelector('[data-apply]').click()));
 assert.equal(cold.valid,true);assert.ok(cold.latencyMs>=0);
 const hot=await page.evaluate(()=>window.__NUTBOOK_MOTION__.measureInteraction('hot-param',()=>{const input=document.querySelector('[data-nutbook-motion-panel]').shadowRoot.querySelector('[data-param=density]');input.value='320';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}));
 assert.equal(hot.valid,true);assert.ok(hot.revision>cold.revision);
 const hotSamples=[];
 for(let i=0;i<30;i++)hotSamples.push(await page.evaluate(i=>window.__NUTBOOK_MOTION__.measureInteraction('hot-param',()=>{const input=document.querySelector('[data-nutbook-motion-panel]').shadowRoot.querySelector('[data-param=density]');input.value=i%2?'180':'181';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}),i));
 assert.ok(hotSamples.every(sample=>sample.valid));
 await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.exit({runtimeSessionId:'performance-test',discard:true}));
 await page.locator('[data-bench-meta]').fill(JSON.stringify(metadata));
 await page.locator('[data-bench-start]').click();
 await page.waitForFunction(()=>document.querySelector('[data-bench-status]').value.startsWith('测量完成'),{},{timeout:45000});
 const report=JSON.parse(await page.locator('[data-bench-result]').inputValue());
 assert.equal(report.runs.length,3);
 for(const run of report.runs){assert.equal(run.valid,true);assert.ok(run.frameIntervalsMs.length>100);assert.ok(run.renderCpuMs.length>0);assert.ok(run.resetBoundaries.length>1);assert.equal(run.environment.dpr,1);assert.equal(run.metadata.sourceHash,metadata.sourceHash);}
 const downloadPromise=page.waitForEvent('download');await page.locator('[data-bench-export]').click();const download=await downloadPromise;
 const downloaded=join(dir,'downloaded-performance.json');await download.saveAs(downloaded);
 assert.deepEqual(JSON.parse(readFileSync(downloaded,'utf8')),report,'downloaded JSON matches the visible report');
 const invalid=await page.evaluate(async()=>{const p=window.__NUTBOOK_MOTION__.measureSteady({warmupMs:0,durationMs:1000});setTimeout(()=>window.__NUTBOOK_PRESENTATION__.goTo('evidence'),100);return p;});
 assert.equal(invalid.valid,false);assert.ok(invalid.invalidReasons.includes('page-changed'));
 await page.evaluate(()=>window.__NUTBOOK_MOTION__.dispose());
 assert.equal(await page.evaluate(()=>window.__NUTBOOK_MOTION__.measurementState().scheduledFrames),0);
 assert.deepEqual(errors,[]);
 // Fresh runtime with no saved action: first apply cannot reuse a glyph adapter.
 const coldFile=join(dir,'cold.html'),coldSource=readFileSync('integrations/nbskill/templates/motion-presentation.html');writeFileSync(coldFile,coldSource);
 const coldSamples=[];
 for(let i=0;i<20;i++){
  const fresh=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1,reducedMotion:'no-preference'});
  try{await fresh.route(/^https?:/,route=>route.abort());await fresh.goto(pathToFileURL(coldFile).href);
   await fresh.evaluate(()=>window.__TAURI_INTERNALS__={invoke:async()=>true});await fresh.addScriptTag({path:resolve('dist/assets/html-edit-runtime.js')});
   await fresh.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.enter({itemId:1,runtimeSessionId:'cold-test',generation:1,inlineToolbar:true,locale:'zh-CN'}));await fresh.evaluate(()=>window.__NUTBOOK_MOTION__.togglePanel());
   coldSamples.push(await fresh.evaluate(()=>window.__NUTBOOK_MOTION__.measureInteraction('cold-apply',()=>document.querySelector('[data-nutbook-motion-panel]').shadowRoot.querySelector('[data-apply]').click())));
  }finally{await fresh.close();}
 }
 assert.ok(coldSamples.every(sample=>sample.valid));
 const summarize=(samples,p95Limit,maxLimit)=>({samples,p95Ms:nearestRank(samples.map(s=>s.latencyMs)),maxMs:Math.max(...samples.map(s=>s.latencyMs)),thresholdMet:samples.every(s=>s.valid&&s.latencyMs<=maxLimit)&&nearestRank(samples.map(s=>s.latencyMs))<=p95Limit});
 const latencyReport={cold:{...summarize(coldSamples,1000,2000),sourceHash:createHash('sha256').update(coldSource).digest('hex'),cacheReset:'fresh page runtime, empty actions, no prepared adapter'},hot:summarize(hotSamples,100,200)};
 writeFileSync(join(dir,'report.json'),JSON.stringify({coldInstrumentationProbe:cold,hotInstrumentationProbe:hot,latencyReport,...report,nativeAcceptance:false},null,2));
 console.log(`Motion performance runtime checks passed: ${dir}/report.json`);
 console.log(JSON.stringify(report.runs.map(r=>({p95FrameIntervalMs:r.p95FrameIntervalMs,p95RenderCpuMs:r.p95RenderCpuMs,frames:r.frameIntervalsMs.length,standardSetupEligible:r.standardSetupEligible}))));
 }
}finally{await browser.close();}
