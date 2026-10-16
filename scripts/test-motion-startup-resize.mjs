import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {readFileSync,writeFileSync,mkdtempSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
// Exercise the saved-document runtime with the same synchronous resize cancellation
// observed in the physical-display startup log. No native window behavior is mocked.
const dir=mkdtempSync(join(tmpdir(),'nutbook-startup-resize-'));
const source=readFileSync('integrations/nbskill/templates/motion-presentation.html','utf8');
const runtime=readFileSync('src-tauri/resources/export-templates/motion-runtime.js','utf8');
const embedded=/<script>\s*\(\(\) => \{\s*\/\/ src\/motion\/[\s\S]*?<\/script>/;
assert.ok(embedded.test(source));
writeFileSync(join(dir,'index.html'),source.replace(embedded,()=>'<script>'+runtime+'</script>'));
copyFileSync('integrations/nbskill/templates/presentation-mark.svg',join(dir,'presentation-mark.svg'));
for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.goto(pathToFileURL(join(dir,'index.html')).href);
  const result=await page.evaluate(async()=>{
   const motion=window.__NUTBOOK_MOTION__;
   motion.pause();
   // Invalidate existing renderers so startup must await preparation.
   window.dispatchEvent(new Event('resize'));
   const initial=motion.startPresentation();
   window.dispatchEvent(new Event('resize'));
   window.dispatchEvent(new Event('resize'));
   const accepted=await initial;
   return {accepted,state:motion.playbackState(),runtime:motion.state()};
  });
  assert.equal(result.accepted,true,'startup adopts preparation of the identical state after resize');
  assert.equal(result.state.stepIndex,0);
  assert.equal(result.runtime.preparing,false);
  const cancelled=await page.evaluate(async()=>{
   const motion=window.__NUTBOOK_MOTION__;window.dispatchEvent(new Event('resize'));
   const pending=motion.startPresentation();motion.setEditMode(true);return pending;
  });
  assert.equal(cancelled,false,'entering editing cancels startup rather than reporting ready');
  console.log(`${engine.name()}: resize during startup settles, explicit cancellation stays cancelled`);
 }finally{await browser.close();}
}
