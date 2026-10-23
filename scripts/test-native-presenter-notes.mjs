import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const browser = await chromium.launch({headless:true});
try {
 const page = await browser.newPage();
 await page.addInitScript(() => {
  window.calls=[]; window.failSave=false; window.holdSave=false;
  window.presenterState={sessionId:'notes-check',itemId:1,language:'zh-CN',ready:true,rehearsal:true,sequence:0,
   pages:[{id:'one',title:'Opening'},{id:'two',title:'Next'}],activePageId:'one',
   notes:{one:[{type:'paragraph',runs:[{text:'原始',bold:true},{text:'备注',bold:false}]}]}};
  window.__TAURI_INTERNALS__={invoke:async(command,args={})=>{
   calls.push([command,args]);
   if(command==='native_presentation_thumbnail')throw Error('no thumbnail needed');
   if(command==='native_presentation_state'||command==='native_presentation_notes_edit')return structuredClone(presenterState);
   if(command==='native_presentation_notes_save'){
    if(holdSave)await new Promise(resolve=>window.releaseSave=resolve);
    if(failSave)throw {code:'EDIT_CONFLICT'};
    presenterState.notes[args.payload.pageId]=args.payload.paragraphs; presenterState.notesRevision=(presenterState.notesRevision||0)+1;
    return structuredClone(presenterState);
   }
   if(command==='native_presentation_navigate'){
    presenterState.activePageId=args.payload.pageId;presenterState.sequence++;
    return structuredClone(presenterState);
   }
   if(command==='native_presentation_advance')return structuredClone(presenterState);
   return true;
  }};
 });
 await page.goto(pathToFileURL(path.resolve('dist/native-presenter.html')).href);
 const action=page.locator('#notesAction'),notes=page.locator('#notes'),dialog=page.locator('#notesLeaveDialog');
 await action.waitFor(); await page.waitForFunction(()=>!document.querySelector('#notesAction').disabled);
 assert.equal(await action.getAttribute('data-tooltip'),'编辑备注');
 assert.equal(await action.locator('svg').count(),1);
 const controls=await page.locator('.notes .caption button').evaluateAll(buttons=>buttons.map(button=>{const rect=button.getBoundingClientRect(),css=getComputedStyle(button);return [rect.width,rect.height,css.backgroundColor,css.borderRadius];}));
 assert.deepEqual(controls[0],controls[1]); assert.deepEqual(controls[1],controls[2]);
 await action.hover();
 await page.locator('#notesTooltip').waitFor({state:'visible'});
 assert.equal(await page.locator('#notesTooltip').textContent(),'编辑备注');
 await page.mouse.move(0,0); await page.locator('#notesTooltip').waitFor({state:'hidden'});
 await page.locator('#smallerNotes').focus();
 assert.equal(await page.locator('#notesTooltip').textContent(),'缩小备注字号');
 await page.locator('#smallerNotes').press('Escape');
 await page.locator('#notesTooltip').waitFor({state:'hidden'});
 await action.click();
 assert.equal(await action.getAttribute('aria-label'),'保存备注');
 assert.equal(await notes.getAttribute('contenteditable'),'true');
 assert.equal(await notes.locator('strong').textContent(),'原始');
 await notes.press('End'); await page.keyboard.type('临时补充');
 // Replay the native boundary-key sequence observed in the host diagnostic.
 const keyInput=await notes.evaluate(el=>{
  el.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',code:'ArrowRight',bubbles:true}));
  const boundary=new InputEvent('beforeinput',{inputType:'insertText',data:'\u001d',bubbles:true,cancelable:true});
  el.dispatchEvent(boundary);
  el.dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowRight',bubbles:true}));
  const ordinary=new InputEvent('beforeinput',{inputType:'insertText',data:'□',bubbles:true,cancelable:true});
  el.dispatchEvent(ordinary);
  return {blocked:boundary.defaultPrevented,ordinaryBlocked:ordinary.defaultPrevented};
 });
 assert.deepEqual(keyInput,{blocked:true,ordinaryBlocked:false},'block arrow-generated text only; keep literal square characters');
 const draft=await notes.innerText();
 await page.evaluate(()=>window.__NUTBOOK_NATIVE_PRESENTATION_STATE__(structuredClone(presenterState)));
 assert.equal(await notes.innerText(),draft,'timer/thumbnail/state callbacks must not replace the editing DOM');
 const before=await page.evaluate(()=>calls.filter(([c])=>c==='native_presentation_navigate'||c==='stop_native_presentation'||c==='native_presentation_toggle_fullscreen').length);
 await notes.press('ArrowRight'); await notes.press('Space'); await notes.press('f');
 await notes.dispatchEvent('compositionstart');
 await notes.dispatchEvent('keydown',{key:'Escape',isComposing:true});
 assert.equal(await notes.getAttribute('contenteditable'),'true','IME Escape cannot discard a composing draft');
 await notes.dispatchEvent('compositionend');
 assert.equal(await page.evaluate(()=>calls.filter(([c])=>c==='native_presentation_navigate'||c==='stop_native_presentation'||c==='native_presentation_toggle_fullscreen').length),before);
 await action.click();
 await page.waitForFunction(()=>document.querySelector('#notes').contentEditable==='false');
 assert.equal(await page.evaluate(()=>presenterState.notes.one[0].runs[0].bold),true,'saving preserves existing bold runs');
 await page.evaluate(()=>window.__NUTBOOK_NATIVE_PRESENTATION_STATE__({...structuredClone(presenterState),notesRevision:0,notes:{}}));
 assert.ok((await notes.innerText()).includes('临时补充'),'a late old-revision callback cannot replace saved notes');
 await action.click(); await notes.press('End'); await page.keyboard.type('未保存');
 await page.locator('#next').click(); await dialog.waitFor({state:'visible'});
 assert.equal(await page.evaluate(()=>document.activeElement.id),'notesLeaveTitle','opening the prompt must not paint a focus ring around its primary action');
 assert.equal(await page.locator('#notesSaveLeave').evaluate(el=>getComputedStyle(el).borderRadius),'999px');
 assert.equal(await page.evaluate(()=>calls.some(([c,a])=>c==='native_presentation_notes_edit'&&a.payload.promptOpen)),true,'retire native child before showing DOM confirmation');
 await page.locator('#notesKeepEditing').click(); await dialog.waitFor({state:'hidden'});
 assert.ok((await notes.innerText()).includes('未保存'));
 await page.locator('#next').click(); await page.locator('#notesDiscard').click();
 await page.waitForFunction(()=>presenterState.activePageId==='two');
 await page.locator('#previous').click(); await page.waitForFunction(()=>presenterState.activePageId==='one');
 assert.ok(!(await notes.innerText()).includes('未保存'));
 await action.click(); await notes.press('End'); await page.keyboard.type('失败保留');
 await page.evaluate(()=>window.failSave=true); await action.click();
 await page.waitForFunction(()=>!document.querySelector('#notesError').hidden);
 assert.equal(await notes.getAttribute('contenteditable'),'true');
 assert.ok((await notes.innerText()).includes('失败保留'));
 assert.ok((await page.locator('#notesError').innerText()).includes('外部修改'));
 await page.evaluate(()=>window.failSave=false);
 // A native close/audience request shares the same leave decision.
 await page.evaluate(()=>window.__NUTBOOK_PRESENTER_INTENT__({sessionId:'notes-check',intent:{kind:'end'}}));
 await dialog.waitFor({state:'visible'}); await page.keyboard.press('Escape'); await dialog.waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>calls.some(([c])=>c==='stop_native_presentation')),false);
 await page.evaluate(()=>window.__NUTBOOK_PRESENTER_INTENT__({sessionId:'notes-check',intent:{kind:'navigate',pageId:'two'}}));
 await page.locator('#notesSaveLeave').click(); await page.waitForFunction(()=>presenterState.activePageId==='two');
 assert.ok(await page.evaluate(()=>presenterState.notes.one.some(p=>p.runs.some(r=>r.text.includes('失败保留')))));
 // Esc cancels the local edit; it cannot end the presentation.
 await action.click(); await page.keyboard.type('放弃'); await notes.press('Escape');
 await page.waitForFunction(()=>document.querySelector('#notes').contentEditable==='false');
 assert.equal(await page.evaluate(()=>calls.some(([c])=>c==='stop_native_presentation')),false);
 // A second exit while the explicit save is in flight waits for that save.
 await action.click(); await page.keyboard.type('保存中退出');
 await page.evaluate(()=>window.holdSave=true); await action.click();
 await page.waitForFunction(()=>typeof releaseSave==='function');
 await page.locator('#end').click();
 assert.equal(await page.evaluate(()=>calls.some(([c])=>c==='stop_native_presentation')),false);
 await page.evaluate(()=>releaseSave());
 await page.waitForFunction(()=>calls.some(([c])=>c==='stop_native_presentation'));
 await page.evaluate(()=>window.__NUTBOOK_NATIVE_PRESENTATION_STATE__({...structuredClone(presenterState),language:'en-US'}));
 assert.equal(await action.getAttribute('data-tooltip'),'Edit notes');
 assert.equal(await notes.getAttribute('aria-label'),'Slide notes');
 const source=readFileSync('src-tauri/src/commands/native_presentation.rs','utf8');
 assert.match(source,/pub fn native_presentation_notes_save[\s\S]*?webview.label\(\) != PRESENTER_LABEL[\s\S]*?s.notes_editing && s.active_page_id == payload.page_id[\s\S]*?content_hash_bytes\(&source\) != session.source_hash[\s\S]*?publish_presenter_notes[\s\S]*?session.source_hash = content_hash_bytes[\s\S]*?session.notes.extend/);
 assert.match(source,/CloseRequested \{ api, .. \}[\s\S]*?request_notes_leave_if_editing[\s\S]*?api.prevent_close/);
 console.log('Presenter notes: SVG edit/save, rich runs, IME/shortcuts, callback preservation, leave decisions, conflict/retry and in-flight exit passed (mocked browser; native GUI still required)');
} finally {await browser.close();}
