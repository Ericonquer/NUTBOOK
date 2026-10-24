import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {deliverXDraft,validateXResume,xContentMatches,observeXContentSave,waitForXImage,waitForXEditorReady,resetXDraftBody,xOrderedMediaIds} from './wechat/x-delivery.mjs';
import {validateJob} from './wechat/delivery.mjs';
import {EventEmitter} from 'node:events';
assert.throws(()=>validateXResume({digest:'a',stage:'creating'},'a'),/AMBIGUOUS_CREATE/);
assert.throws(()=>validateXResume({digest:'b',stage:'editing'},'a'),/JOB_CONTENT_CHANGED/);
assert.throws(()=>validateXResume({digest:'a',stage:'editing',editUrl:'https://evil.test/1'},'a'),/INVALID_CHECKPOINT_URL/);
const receipt=(text,media=[])=>({data:{articleentity_update_content_state:{content_state:{blocks:[{type:'unstyled',text},...media.map((_,n)=>({type:'atomic',text:' ',entityRanges:[{offset:0,length:1,key:String(n)}]}))],entityMap:media.map((mediaId,n)=>({key:String(n),value:{type:'MEDIA',data:{mediaItems:[{mediaId}]}}}))}}}});
assert.equal(xContentMatches(receipt('Before After',['1','2']),'BeforeAfter',2),true);
assert.equal(xContentMatches(receipt('Before After',['1']),'BeforeAfter',2),false,'one-image save cannot finish a two-image send');
assert.equal(xContentMatches(receipt('Before marker After',['1','2']),'BeforeAfter',2),false);
assert.equal(xContentMatches(receipt('',['stale-media']),'',0),false,'empty text with old media is not a cleared draft');
const orderedState=receipt('body',['a','b']).data.articleentity_update_content_state.content_state;
orderedState.entityMap.reverse();assert.deepEqual(xOrderedMediaIds(orderedState),['a','b'],'entity-map storage order must not determine media order');
orderedState.entityMap[0].value.data.caption='User supplied caption';assert.deepEqual(xOrderedMediaIds(orderedState),['a','b'],'manual captions do not change media identity');
orderedState.blocks.reverse();assert.deepEqual(xOrderedMediaIds(orderedState),['b','a'],'actual block reorder is detected');
assert.equal(xOrderedMediaIds(receipt('body',['a','a']).data.articleentity_update_content_state.content_state),null,'duplicate IDs cannot prove order');

// The observation phase has no timeout. The bounded wait begins at the end
// of writing, and a receipt received before that barrier remains usable.
const events=new EventEmitter();
const timer=globalThis.setTimeout;let startedTimers=0;
globalThis.setTimeout=(...args)=>{startedTimers++;return timer(...args);};
const observed=observeXContentSave(events,'BeforeAfter',2);
assert.equal(startedTimers,0,'uploading must not start the final-save deadline');
globalThis.setTimeout=timer;
events.emit('response',{url:()=> 'https://x.com/i/api/graphql/fixture/ArticleEntityUpdateContent',status:()=>200,json:async()=>receipt('Before After',['1'])});
await new Promise(resolve=>setTimeout(resolve,25));
events.emit('response',{url:()=> 'https://x.com/i/api/graphql/fixture/ArticleEntityUpdateContent',status:()=>200,json:async()=>receipt('Before After',['1','2'])});
assert.equal(await observed.wait({timeout:20}),200,'full receipt captured during upload is retained');
observed.dispose();assert.equal(events.listenerCount('response'),0);
const incomplete=observeXContentSave(events,'BeforeAfter',2);
events.emit('response',{url:()=> 'https://x.com/i/api/graphql/fixture/ArticleEntityUpdateContent',status:()=>200,json:async()=>receipt('Before After',['1'])});
await assert.rejects(incomplete.wait({timeout:10}),/X_CONTENT_SAVE_TIMEOUT/);
incomplete.dispose();assert.equal(events.listenerCount('response'),0);
const rejected=observeXContentSave(events,'BeforeAfter',2);
events.emit('response',{url:()=> 'https://x.com/i/api/graphql/fixture/ArticleEntityUpdateContent',status:()=>200,json:async()=>({errors:[{}]})});
await assert.rejects(rejected.wait({timeout:20}),/BODY_SAVE_REJECTED/);rejected.dispose();
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext();
 const imagePage=await context.newPage();
 await imagePage.setContent('<div data-testid="composer"><section><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"></section></div>');
 await imagePage.locator('img').evaluate(image=>image.decode());
 await assert.rejects(waitForXImage(imagePage,'[data-testid="composer"]',3,12,{timeout:20}),/X_IMAGE_INSERT_TIMEOUT image=3\/12 observed=1 loaded=1/);
 await imagePage.setContent('<textarea placeholder="Add a title"></textarea><div data-testid="composer" contenteditable="true"><p>prefix</p></div><div data-testid="loading-blocker"></div>');
 await assert.rejects(waitForXEditorReady(imagePage,{text:'prefix',count:0,timeout:20}),/DRAFT_VERIFICATION_FAILED/,'hydrating editor cannot accept the next edit');
 await imagePage.locator('[data-testid="loading-blocker"]').evaluate(el=>el.remove());
 await waitForXEditorReady(imagePage,{text:'prefix',count:0,timeout:100});
 await assert.rejects(waitForXEditorReady(imagePage,{text:'missing',count:0,timeout:20}),/DRAFT_VERIFICATION_FAILED/,'reopened draft must retain the complete prefix');
 await imagePage.close();
 const url='https://x.com/compose/articles/edit/123';
 await context.route('https://x.com/**',route=>{
  if(route.request().url().includes('/ArticleEntityResultByRestId?'))return route.fulfill({contentType:'application/json',body:JSON.stringify({data:{article_result_by_rest_id:{result:{rest_id:'123',content_state:receipt('BeforeboldAfter').data.articleentity_update_content_state.content_state}}}})});
  if(route.request().method()==='POST')return route.fulfill({contentType:'application/json',body:JSON.stringify(receipt('BeforeboldAfter'))});
  return route.fulfill({contentType:'text/html',body:`<main><textarea placeholder="Add a title"></textarea><div data-testid="composer" contenteditable="true" role="textbox"></div></main><script>
  const body=document.querySelector('[data-testid=composer]'), title=document.querySelector('textarea');
  title.value=localStorage.title||'';body.innerHTML=localStorage.body||'';fetch('/i/api/graphql/fixture/ArticleEntityResultByRestId?variables='+encodeURIComponent(JSON.stringify({articleEntityId:'123'})));
  title.addEventListener('input',()=>localStorage.title=title.value);
  body.addEventListener('paste',e=>{e.preventDefault();const parsed=new DOMParser().parseFromString(e.clipboardData.getData('text/html'),'text/html');body.innerHTML=(parsed.querySelector('section')||parsed.body).innerHTML;localStorage.body=body.innerHTML;fetch('/i/api/graphql/fixture/ArticleEntityUpdateContent',{method:'POST',body:'{}'});});
  </script>`});
 });
 const job={version:1,id:'fixture',title:'Saved title',summary:'',html:'<section><p>Before<strong>bold</strong>After</p></section>',images:[]};
 let journal={digest:validateJob(job),stage:'editing',editUrl:url};
 const result=await deliverXDraft({context,job,journal,checkpoint:async value=>{journal=value;}});
 assert.equal(result.verified,true);assert.equal(journal.stage,'verified');
 assert.equal(await context.pages().at(-1).locator('[data-testid=composer] strong').textContent(),'bold');

 // Model the observed X lifecycle: a save hydrates media from a captured
 // editor snapshot and can overwrite subsequent edits. Only a saved-and-
 // reopened prefix may be used as the base for the next media insertion.
 const race=await browser.newContext();let reopens=0,emptySaves=0,uploads=0,readMode='normal',savedContent=receipt('',[]).data.articleentity_update_content_state.content_state;
 const gif=readFileSync('tests/fixtures/x-delivery/animated.gif').toString('base64');
 const video='data:video/webm;base64,'+readFileSync('tests/fixtures/x-delivery/animated.webm').toString('base64');
 await race.route('https://x.com/**',async route=>{
  if(route.request().url().includes('/ArticleEntityResultByRestId?')){
   const content=structuredClone(savedContent);
   if(readMode==='caption')content.entityMap.forEach(e=>e.value.data.caption='Manual caption');
   if(readMode==='reordered')[content.blocks[1],content.blocks[2]]=[content.blocks[2],content.blocks[1]];
   if(readMode==='missing')content.blocks.pop();
   if(readMode==='duplicate')content.blocks[2].entityRanges[0].key=content.blocks[1].entityRanges[0].key;
   return route.fulfill({contentType:'application/json',body:JSON.stringify({data:{article_result_by_rest_id:{result:{rest_id:readMode==='foreign'?'999':'123',content_state:content}}}})});
  }
  if(route.request().method()==='POST'){
   const saved=route.request().postDataJSON();if(!saved.text.trim()&&!saved.ids.length)emptySaves++;if(saved.upload)uploads++;
   savedContent=receipt(saved.text,saved.ids).data.articleentity_update_content_state.content_state;
   await new Promise(resolve=>setTimeout(resolve,80));
   return route.fulfill({contentType:'application/json',body:JSON.stringify(receipt(saved.text,saved.ids))});
  }
  reopens++;
  return route.fulfill({contentType:'text/html',body:`<main><textarea placeholder="Add a title"></textarea><div data-testid="composer" contenteditable="true"></div><button id="add">Add media</button><button role="menuitem" id="media">Media</button><div role="dialog"><input type="file"></div></main><script>
   const body=document.querySelector('[data-testid=composer]'),title=document.querySelector('textarea');let pendingRestore;
   body.innerHTML=localStorage.body||'';title.value=localStorage.title||'';fetch('/i/api/graphql/fixture/ArticleEntityResultByRestId?variables='+encodeURIComponent(JSON.stringify({articleEntityId:'123'})));
   title.oninput=()=>localStorage.title=title.value;
   function save(upload=false){localStorage.body=body.innerHTML;const clone=body.cloneNode(true);clone.querySelectorAll('section').forEach(e=>e.remove());return fetch('/i/api/graphql/fixture/ArticleEntityUpdateContent',{method:'POST',body:JSON.stringify({upload,text:clone.textContent,ids:[...body.querySelectorAll('section')].filter(s=>s.querySelector('img,video')).map((_,n)=>String(n))})});}
   body.addEventListener('input',()=>save());
   body.addEventListener('paste',e=>{e.preventDefault();const html=e.clipboardData.getData('text/html');if(/<section|<article/.test(html))throw Error('publication shell must be removed before DraftJS paste');pendingRestore?.();body.insertAdjacentHTML('beforeend',html);save();});
   document.querySelector('input').onchange=async e=>{const src=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(e.target.files[0]);});const captured=body.innerHTML;body.insertAdjacentHTML('beforeend',e.target.files[0].type==='image/gif'?'<section contenteditable="false"><video preload="auto" controls src="${video}"></video></section>':'<section contenteditable="false"><img src="'+src+'"></section>');pendingRestore=()=>{body.innerHTML=captured;pendingRestore=null;};save(true).then(()=>{setTimeout(()=>pendingRestore?.(),30);});};
  </script>`});
 });
 const images=await context.pages().at(-1).evaluate(()=>Array.from({length:12},(_,n)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=16;const ctx=canvas.getContext('2d');ctx.fillStyle='hsl('+n*30+' 100% 50%)';ctx.fillRect(0,0,16,16);return {id:'img'+n,mime:'image/png',base64:canvas.toDataURL().split(',')[1]};}));
 images[5]={id:'img5',mime:'image/gif',base64:gif};
 const raceJob={version:1,id:'hydration-race',title:'Saved title',summary:'',html:'<section>'+images.map((i,n)=>'<p>Part '+n+'</p><p><img data-nutbook-image="'+i.id+'"></p>').join('')+'<p>End</p></section>',images};
 const stale='<p>Old failed draft body</p>'+images.slice(0,4).map(i=>'<section contenteditable="false"><img src="data:'+i.mime+';base64,'+i.base64+'"></section>').join('')+'<p><br></p>';
 await race.addInitScript(seed=>{if(location.origin==='https://x.com'&&!localStorage.seeded){localStorage.body=seed;localStorage.seeded='yes';}},stale);
 const stages=[];
 let raceJournal={digest:validateJob(raceJob),stage:'editing',editUrl:url};

 const raceResult=await deliverXDraft({context:race,job:raceJob,journal:raceJournal,checkpoint:async value=>{raceJournal=value;stages.push(value.stage);}});
 assert.ok(stages.includes('saved'),'confirmed save must be checkpointed before final verification');
 assert.equal(raceResult.imageCount,12);assert.equal(raceResult.verified,true);assert.equal(raceJournal.stage,'verified');
 assert.equal(reopens,15,'existing failed draft, confirmed empty reopen, twelve saved media prefixes and final verification');
 assert.equal(emptySaves,1,'old text and all four old images must be saved as empty before any upload');
 assert.equal(uploads,12);
 assert.equal(await race.pages().at(-1).locator('[data-testid=composer] section video').count(),1,'animated GIF survives as playable video after reopen');
 assert.ok(await race.pages().at(-1).locator('section video').evaluate(v=>v.duration>=0.4),'animation duration is preserved');
 assert.equal(await race.pages().at(-1).locator('[data-testid=composer] section').filter({has:race.pages().at(-1).locator('img,video')}).count(),12,'all images survive late hydration and reopen');
 // A second explicit retry on the same now-populated draft must replace it,
 // preserving twelve final images instead of appending another twelve.
 const again=await deliverXDraft({context:race,job:raceJob,journal:{...raceJournal,stage:'editing'},checkpoint:async value=>{raceJournal=value;stages.push(value.stage);}});
 assert.equal(again.verified,true);assert.equal(emptySaves,2);assert.equal(uploads,24);
 assert.equal(await race.pages().at(-1).locator('[data-testid=composer] section').filter({has:race.pages().at(-1).locator('img,video')}).count(),12);
 readMode='caption';
 assert.equal((await deliverXDraft({context:race,job:raceJob,journal:raceJournal,checkpoint:async()=>{}})).verified,true,'read-only verification accepts manual captions');
 // Simulate a failed final verification: saved checkpoint rechecks only,
 // even when captions were manually added after the send.
 raceJournal={...raceJournal,stage:'saved'};
 for(readMode of ['reordered','missing','duplicate','foreign'])await assert.rejects(deliverXDraft({context:race,job:raceJob,journal:raceJournal,checkpoint:async()=>{}}),readMode==='foreign'?/DRAFT_VERIFICATION_FAILED/:/IMAGE_ORDER_MISMATCH/);
 readMode='caption';
 assert.equal((await deliverXDraft({context:race,job:raceJob,journal:raceJournal,checkpoint:async()=>{}})).verified,true,'saved draft with manual captions can be reverified without rewriting');
 assert.equal(uploads,24,'verification-only checks never resend media or reset a captioned draft');
 const mediaPage=await race.newPage();
 await mediaPage.setContent('<textarea placeholder="Add a title"></textarea><div data-testid="composer"><section><img src="data:image/gif;base64,'+gif+'"><video src="'+video+'" preload="auto"></video></section></div>');
 await waitForXEditorReady(mediaPage,{text:'',count:1,mimes:['image/gif']});
 await assert.rejects(waitForXEditorReady(mediaPage,{text:'',count:1,mimes:['image/png'],timeout:20}),/DRAFT_VERIFICATION_FAILED/,'static source must not silently become video');
 await mediaPage.locator('video').evaluate(v=>{v.removeAttribute('src');v.load();});
 await assert.rejects(waitForXEditorReady(mediaPage,{text:'',count:1,mimes:['image/gif'],timeout:20}),/DRAFT_VERIFICATION_FAILED/,'unloaded video cannot pass verification');
 await race.close();
 // A failed reset must stop before the first upload, whether the server
 // refuses the empty save or the reopened document resurrects stale content.
 for(const mode of ['save-rejected','reopen-stale','delete-ignored']){
  const failed=await browser.newContext();let clears=0,gets=0;
  await failed.route('https://x.com/**',route=>{
   if(route.request().method()==='POST'){clears++;return route.fulfill({contentType:'application/json',body:JSON.stringify(mode==='save-rejected'?{errors:[{}]}:receipt('',[]))});}
   gets++;return route.fulfill({contentType:'text/html',body:`<textarea placeholder="Add a title"></textarea><div data-testid="composer" contenteditable="true"><p>Stale body</p></div><script>document.querySelector('[data-testid=composer]').oninput=()=>fetch('/i/api/graphql/fixture/ArticleEntityUpdateContent',{method:'POST'});if('${mode}'==='delete-ignored')document.querySelector('[data-testid=composer]').onkeydown=e=>{if(e.key==='Backspace')e.preventDefault();};</script>`});
  });
  const failedPage=await failed.newPage();await failedPage.goto(url);
  await assert.rejects(resetXDraftBody(failedPage,{timeout:100}),mode==='save-rejected'?/BODY_SAVE_REJECTED/:/X_DRAFT_RESET_FAILED/);
  assert.equal(clears,mode==='delete-ignored'?0:1);assert.equal(gets,mode==='reopen-stale'?2:1);
  await failed.close();
 }

 console.log('X adapter regression passed: root contenteditable entry, platform save receipt, reopened content, and ambiguous/foreign checkpoint guards. Local browser fixture only.');
}finally{await browser.close();}
