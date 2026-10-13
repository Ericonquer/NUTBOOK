import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
const output = resolve(process.env.NUTBOOK_MOTION_EVIDENCE || '/tmp/nutbook-motion-validation');
mkdirSync(output,{recursive:true});
const file=join(output,'index.html');copyFileSync('docs/presentations/motion-lab/index.html',file);copyFileSync('docs/presentations/motion-lab/hero.svg',join(output,'hero.svg'));
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  async function openEditor() {
    await page.goto(pathToFileURL(file).href);
    await page.evaluate(()=>{window.__TAURI_INTERNALS__={invoke:async()=>true};window.__motionMessages=[];});
    await page.addScriptTag({path:resolve('dist/assets/html-edit-runtime.js')});
    await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.enter({itemId:1,runtimeSessionId:'motion-probe',generation:1,inlineToolbar:true,locale:'zh-CN'}));
  }
  await openEditor();
  assert.equal(await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.getSnapshot().dirty),false);
  const isolated = await page.evaluate(() => {
    const editor=window.__NUTBOOK_HTML_EDIT__, motion=window.__NUTBOOK_MOTION__;
    for(let i=0;i<20;i++)motion.seek(i/20);
    const clean=!editor.getSnapshot().dirty;
    const invalid=motion.getConfig();invalid.entries.title.effect='custom-script';
    return {clean, rejected:!editor.commitMotionChange(invalid), controlsHidden:getComputedStyle(document.querySelector('.controls')).display==='none'};
  });
  assert.deepEqual(isolated,{clean:true,rejected:true,controlsHidden:true});
  // Use real panel controls rather than only the public motion API.
  const panel=page.locator('[data-motion-lab-panel]');
  await panel.locator('[data-effect]').selectOption('impact');
  assert.equal(await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.getSnapshot().dirty),true);
  await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.undoHistory());
  assert.equal(await page.evaluate(()=>window.__NUTBOOK_MOTION__.getConfig().entries.title.effect),'particles');
  assert.equal(await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.getSnapshot().dirty),false);
  await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.redoHistory());
  assert.equal(await panel.locator('[data-effect]').inputValue(),'impact');
  await panel.locator('[data-effect]').selectOption('particles');
  await panel.locator('[data-param="strength"]').fill('1.5');
  await panel.locator('[data-param="duration"]').fill('3.5');
  await page.locator('[data-id="particle-title"]').fill('让创意凝聚');
  // Source-scoped text undo must not undo a motion edit, or vice versa.
  await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.undoHistory());
  assert.equal(await page.locator('[data-id="particle-title"]').textContent(),'让想法凝聚');
  assert.equal(await panel.locator('[data-param="duration"]').inputValue(),'3.5');
  await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.redoHistory());
  const snapshot=await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.getSnapshot());
  assert.ok(snapshot.changes['nutbook-motion-config']);assert.ok(snapshot.changes['particle-title']);
  writeFileSync(join(output,'changes.json'),JSON.stringify(snapshot.changes));
  const result=JSON.parse(execFileSync('cargo',['run','--quiet','--manifest-path','src-tauri/Cargo.toml','--example','commit_motion_acceptance','--',file,join(output,'changes.json')],{encoding:'utf8'}));
  assert.ok(result.sourceFileHash);
  const source=readFileSync(file,'utf8');assert.ok(source.includes('让创意凝聚'));assert.ok(!source.includes('data-motion-lab-panel=""'));assert.ok(!source.includes('contenteditable="'));
  const acknowledged=await page.evaluate(revision=>window.__NUTBOOK_HTML_EDIT__.markSaved({runtimeSessionId:'motion-probe',expectedDocumentRevision:revision}),snapshot.documentRevision);
  assert.equal(acknowledged,true);assert.equal(await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.getSnapshot().dirty),false);
  await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.undoHistory());
  assert.equal(await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.getSnapshot().dirty),true);
  await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.redoHistory());
  assert.equal(await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.getSnapshot().dirty),false);
  await openEditor();
  assert.equal(await page.locator('[data-id="particle-title"]').textContent(),'让创意凝聚');
  assert.equal(await panel.locator('[data-param="duration"]').inputValue(),'3.5');
  assert.equal(await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.getSnapshot().dirty),false);
  await panel.locator('[data-param="strength"]').fill('0.5');
  await page.evaluate(()=>window.__NUTBOOK_HTML_EDIT__.exit({runtimeSessionId:'motion-probe',discard:true}));
  assert.equal(await page.evaluate(()=>window.__NUTBOOK_MOTION__.getConfig().entries.title.strength),1.5);
  assert.equal(await page.locator('[data-motion-lab-panel]').count(),0);
  // Seek, sequential simulation, and fresh-document rendering must agree pixel-for-pixel.
  for(const [id,t] of [['particles',1.2],['impact',1.4],['light',1.6]]) {
    await page.evaluate(async({id,t})=>{await window.__NUTBOOK_PRESENTATION__.goTo(id);window.__NUTBOOK_MOTION__.seek(t);},{id,t});
    const expected=await page.evaluate(()=>window.__NUTBOOK_MOTION__.canvas.toDataURL());
    await page.evaluate(t=>{for(let k=0;k<30;k++)window.__NUTBOOK_MOTION__.seek(t*k/29);},t);
    assert.equal(await page.evaluate(()=>window.__NUTBOOK_MOTION__.canvas.toDataURL()),expected,`${id}: path-independent render`);
    await page.reload();await page.evaluate(async({id,t})=>{await window.__NUTBOOK_PRESENTATION__.goTo(id);window.__NUTBOOK_MOTION__.seek(t);},{id,t});
    assert.equal(await page.evaluate(()=>window.__NUTBOOK_MOTION__.canvas.toDataURL()),expected,`${id}: fresh seeded render`);
    await page.screenshot({path:join(output,`${id}.png`)});
  }
  // A fixed-size frame probe, not a screen recording; contains only the scene.
  await page.evaluate(async()=>{await window.__NUTBOOK_PRESENTATION__.goTo('particles');document.querySelector('.controls').hidden=true;});
  const frames=join(output,'frames');mkdirSync(frames,{recursive:true});
  for(let f=0;f<48;f++){await page.evaluate(t=>window.__NUTBOOK_MOTION__.seek(t),f/16);await page.screenshot({path:join(frames,`${String(f).padStart(4,'0')}.png`)});}
  execFileSync('/opt/homebrew/bin/ffmpeg',['-y','-loglevel','error','-framerate','16','-i',join(frames,'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',join(output,'motion-probe.mp4')]);
  const video=JSON.parse(execFileSync('/opt/homebrew/bin/ffprobe',['-v','error','-show_streams','-of','json',join(output,'motion-probe.mp4')],{encoding:'utf8'}));
  assert.equal(video.streams[0].width,1280);assert.equal(video.streams[0].nb_frames,'48');
  await openEditor();await page.screenshot({path:join(output,'editor.png')});
  for(const id of ['impact','light']) {
    await page.evaluate(id=>window.__NUTBOOK_HTML_EDIT__.goToPresentationPage(id),id);
    await page.screenshot({path:join(output,`editor-${id}.png`)});
  }
  assert.equal(await panel.locator('[data-param="count"]').isVisible(),false);
  assert.equal(await panel.locator('[data-param="x"]').isVisible(),true);
  // Arrow keys in the shadow inspector must not navigate slides.
  await panel.locator('[data-param="strength"]').focus();await page.keyboard.press('ArrowUp');
  assert.equal(await page.evaluate(()=>window.__NUTBOOK_PRESENTATION__.activePageId),'light');
  await page.setViewportSize({width:900,height:600});
  assert.equal(await page.evaluate(()=>{const panel=document.querySelector('[data-motion-lab-panel]');const r=panel.getBoundingClientRect();return r.right<=innerWidth && r.top>=0;}),true);
  await page.screenshot({path:join(output,'editor-small.png')});
  assert.deepEqual(errors,[]);
  writeFileSync(join(output,'result.json'),JSON.stringify({browser:'Chromium headless',nativeWebView:'pending user verification',sourceCommit:'Rust real atomic commit',determinism:'three effects, sequential vs seek vs reload',video:{width:1280,height:720,frames:48,fps:16,duration:3},errors},null,2));
  console.log(`Motion validation passed. Evidence: ${output}`);
} finally {await browser.close();}
