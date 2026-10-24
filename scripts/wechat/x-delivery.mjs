/** X Articles draft adapter. UI writes only; never clicks Publish. */
import {validateJob} from './delivery.mjs';
export function validateXResume(journal,digest){
 if(!journal)return;
 if(journal.digest!==digest)throw Error('JOB_CONTENT_CHANGED');
 if(journal.stage==='creating')throw Error('AMBIGUOUS_CREATE');
 if(!['editing','saved','verified'].includes(journal.stage)||!/^https:\/\/x\.com\/compose\/articles\/edit\/\d+$/.test(journal.editUrl||''))throw Error('INVALID_CHECKPOINT_URL');
}
const composer='[data-testid="composer"]';
const title='textarea[placeholder="添加标题"], textarea[placeholder="Add a title"]';
const mediaName=/添加媒体内容|Add media/;
export async function deliverXDraft({context,job,journal,checkpoint,progress=()=>{},signal}){
 const digest=validateJob(job);validateXResume(journal,digest);
 const check=()=>{if(signal?.aborted)throw Error('CANCELLED');};
 const report=(stage,extra={})=>{check();progress({stage,...extra});};
 const parser=await context.newPage();
 let prepared;
 try{prepared=await parser.evaluate(({html,images,digest})=>{
  const t=document.createElement('template');t.innerHTML=html;
  if(t.content.querySelector('script,iframe,object,embed,form,input,button,link,meta,style,svg'))throw Error('UNSAFE_HTML');
  for(const el of t.content.querySelectorAll('*'))for(const a of el.attributes)if(/^on/i.test(a.name)||/javascript\s*:/i.test(a.value))throw Error('UNSAFE_HTML');
  t.content.querySelectorAll('hr').forEach(e=>e.remove());
  // DraftJS imports section/article as unknown blocks and flattens paragraphs.
  for(const shell of [...t.content.querySelectorAll('section,article')].reverse())shell.replaceWith(...shell.childNodes);
  const text=t.content.textContent.replace(/\s+/g,'');const markers=[],parts=[];
  const range=document.createRange();range.setStart(t.content,0);
  function fragment(){const div=document.createElement('div');div.append(range.cloneContents());document.body.append(div);const part={html:div.innerHTML,plain:div.innerText};div.remove();return part;}
  for(const img of t.content.querySelectorAll('img')){
   const id=img.getAttribute('data-nutbook-image');if(!images.some(i=>i.id===id))throw Error('UNRESOLVED_IMAGE');
   range.setEndBefore(img);parts.push({...fragment(),imageId:id});markers.push({id,marker:'NUTBOOK_UNUSED'});range.setStartAfter(img);
  }
  range.setEnd(t.content,t.content.childNodes.length);parts.push(fragment());
  return {text,markers,parts};
 },{html:job.html,images:job.images,digest});}finally{await parser.close();}
 const mimes=prepared.markers.map(m=>job.images.find(i=>i.id===m.id).mime);
 const page=(journal&&context.pages().find(p=>p.url()===journal.editUrl))||await context.newPage();page.setDefaultTimeout(20000);
 for(const other of context.pages())if(other!==page&&journal&&other.url()===journal.editUrl)await other.close();
 const abort=()=>page.close().catch(()=>{});signal?.addEventListener('abort',abort,{once:true});
 let state=journal?structuredClone(journal):null, saveReceipt;
 async function persist(stage){state={...state,digest,stage};await checkpoint(state);}
 async function verify(){
  report('verifying');
  if(!Array.isArray(state.mediaIds)||state.mediaIds.length!==prepared.markers.length)throw Error('X_MEDIA_IDENTITY_UNAVAILABLE');
  const persisted=await reloadXContent(page,state.editUrl);
  const ids=xOrderedMediaIds(persisted);
  if(!ids||ids.length!==state.mediaIds.length||ids.some((id,n)=>id!==state.mediaIds[n]))throw Error('IMAGE_ORDER_MISMATCH');
  if(!xContentMatches({data:{articleentity_update_content_state:{content_state:persisted}}},prepared.text,prepared.markers.length))throw Error('DRAFT_VERIFICATION_FAILED');
  await page.locator(title).waitFor();
  await waitForXEditorReady(page,{text:prepared.text,count:prepared.markers.length,mimes});
  const result=await page.evaluate(({composer,title,markers})=>{
   const b=document.querySelector(composer);const clone=b.cloneNode(true);clone.querySelectorAll('section').forEach(e=>e.remove());
   return {title:document.querySelector(title)?.value,text:clone.textContent.replace(/\s+/g,''),markers:markers.some(m=>b.textContent.includes(m.marker)),images:[...b.querySelectorAll('section img[src]')].map(i=>i.src),cover:[...document.querySelectorAll('main img[src]')].some(i=>!i.closest(composer)&&i.src.includes('/media/')&&i.complete&&i.naturalWidth>0)};
  },{composer,title,markers:prepared.markers});
  if(result.title!==job.title||result.text!==prepared.text||result.markers||job.coverId&&!result.cover)throw Error('DRAFT_VERIFICATION_FAILED');
  await persist('verified');report('verified');return {editUrl:state.editUrl,verified:true,imageCount:prepared.markers.length,reused:!!journal};
 }
 try{
  if(state){report('reusing');await page.goto(state.editUrl,{waitUntil:'domcontentloaded'});await page.locator(title).waitFor();if(['saved','verified'].includes(state.stage))return await verify();}
  else{
   report('connecting');await page.goto('https://x.com/compose/articles',{waitUntil:'domcontentloaded'});
   const create=page.getByRole('button',{name:/^(创建|Create)$/i});await create.waitFor();
   await persist('creating');await create.click();await page.waitForURL(/\/compose\/articles\/edit\/\d+$/);
   state.editUrl=page.url();await persist('editing');await page.locator(title).waitFor();
  }
  await waitForXEditorReady(page);
  await resetXDraftBody(page);
  state.mediaIds=[];await persist('editing');
  report('writing');await page.locator(title).fill(job.title);
  const body=page.locator(composer+'[contenteditable="true"]');
  saveReceipt=observeXContentSave(page,prepared.text,prepared.markers.length);
  let prefix='';
  for(let n=0;n<prepared.parts.length;n++){
   const part=prepared.parts[n];prefix+=part.plain.replace(/\s+/g,'');
   await body.focus();await body.press(process.platform==='darwin'?'Meta+ArrowDown':'Control+End');
   if(part.plain.trim())await body.evaluate((el,part)=>{const dt=new DataTransfer();dt.setData('text/html',part.html);dt.setData('text/plain',part.plain);el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:dt}));},part);
   if(!part.imageId)continue;
   report('uploading_images',{current:n+1,total:prepared.markers.length});
   const imageReceipt=observeXContentSave(page,prefix,n+1);
   try{
    await body.press(process.platform==='darwin'?'Meta+ArrowDown':'Control+End');await page.keyboard.press('Enter');
    await page.getByRole('button',{name:mediaName}).click();await page.getByRole('menuitem',{name:/^媒体$|^Media$/}).click();
    const dialog=page.getByRole('dialog');await dialog.locator('input[type="file"]').setInputFiles(file(job.images.find(i=>i.id===part.imageId)));
    const apply=page.getByRole('button',{name:/^应用$|^Apply$/});if(await apply.count())await apply.click();
    await waitForXImage(page,composer,n+1,prepared.markers.length,{mimes:mimes.slice(0,n+1)});
    // Visible media is not a completed transaction: X can later restore a
    // captured editor snapshot while hydrating saved media. Finish this save,
    // then reopen that exact prefix before starting the next edit. Navigation
    // disposes the previous document's pending hydration callbacks.
    report('saving',{current:n+1,total:prepared.markers.length});
    await imageReceipt.wait();
    const ids=imageReceipt.mediaIds();
    if(!ids||ids.length!==n+1||state.mediaIds.some((id,k)=>id!==ids[k]))throw Error('IMAGE_ORDER_MISMATCH');
    state.mediaIds=ids;await persist('editing');
    await page.reload({waitUntil:'domcontentloaded'});
    await waitForXEditorReady(page,{text:prefix,count:n+1,mimes:mimes.slice(0,n+1)});
   }finally{imageReceipt.dispose();}
  }
  report('saving');await saveReceipt.wait();
  if(saveReceipt.mediaIds()?.some((id,n)=>id!==state.mediaIds[n]))throw Error('IMAGE_ORDER_MISMATCH');
  if(job.coverId){
   report('cover');const coverReceipt=page.waitForResponse(r=>/\/ArticleEntityUpdateCoverMedia(?:\?|$)/.test(r.url())&&r.status()===200).then(r=>r.json());coverReceipt.catch(()=>{});await page.locator('input[type="file"]').first().setInputFiles(file(job.images.find(i=>i.id===job.coverId)));
   const apply=page.getByRole('button',{name:/^应用$|^Apply$/});await apply.waitFor();await apply.click();await apply.waitFor({state:'hidden'});const receipt=await coverReceipt;if(receipt.errors?.length)throw Error('COVER_SAVE_REJECTED');
  }
  report('saving');
  // Body and cover save receipts are confirmed. A failed final readback must
  // retry verification only, preserving captions added directly in X.
  await persist('saved');
  const result=await verify();return result;
 }finally{saveReceipt?.dispose();signal?.removeEventListener('abort',abort);}
}
function file(image){return {name:`${image.id}.${image.mime.split('/')[1]}`,mimeType:image.mime,buffer:Buffer.from(image.base64,'base64')};}

// Identity comes from referenced MEDIA entities in block order, never entity-map
// insertion order or a paused video's current frame. Captions are metadata.
export function xOrderedMediaIds(state){
 if(!Array.isArray(state?.blocks)||!state.entityMap||typeof state.entityMap!=='object')return null;
 const entries=Array.isArray(state.entityMap)?state.entityMap.map((e,n)=>[String(e.key??n),e.value]):Object.entries(state.entityMap);
 const entities=new Map(entries),ids=[];
 for(const block of state.blocks){
  const ranges=block.entityRanges??block.entity_ranges??[];
  if(block.type==='atomic'&&!ranges.length)return null;
  for(const range of ranges){
   const entity=entities.get(String(range.key));if(!entity)return null;
   if(!Array.isArray(entity.data?.mediaItems))continue;
   for(const media of entity.data.mediaItems){if(typeof media.mediaId!=='string'||!media.mediaId)return null;ids.push(media.mediaId);}
  }
 }
 return new Set(ids).size===ids.length?ids:null;
}
export function xContentMatches(data,text,imageCount){
 const state=data?.data?.articleentity_update_content_state?.content_state;
 const ids=xOrderedMediaIds(state);if(!ids)return false;
 const actual=state.blocks.map(b=>b.text).join('').replace(/\s+/g,'');
 return actual===text&&ids.length===imageCount;
}
export async function reloadXContent(page,editUrl,{timeout=30000}={}){
 const id=new URL(editUrl).pathname.split('/').at(-1);
 const response=page.waitForResponse(r=>{
  const url=new URL(r.url());if(!/\/ArticleEntityResultByRestId$/.test(url.pathname))return false;
  try{return String(JSON.parse(url.searchParams.get('variables')).articleEntityId)===id;}catch{return false;}
 },{timeout});response.catch(()=>{});
 await page.reload({waitUntil:'domcontentloaded'});
 const result=await response,data=await result.json();
 const article=data?.data?.article_result_by_rest_id?.result;
 if(result.status()!==200||data.errors?.length||String(article?.rest_id)!==id||!article.content_state)throw Error('DRAFT_VERIFICATION_FAILED');
 return article.content_state;
}
// Observe throughout writing, but start the acknowledgement deadline only
// after all text/media has been inserted. Long uploads cannot consume it early.
export function observeXContentSave(page,text,count){
 let resolve,reject,disposed=false,timer,mediaIds;
 const receipt=new Promise((yes,no)=>{resolve=yes;reject=no;});receipt.catch(()=>{});
 const onResponse=async response=>{
  if(disposed||!/\/ArticleEntityUpdateContent(?:\?|$)/.test(response.url()))return;
  try{
   const data=await response.json();if(disposed)return;
   if(response.status()!==200||data.errors?.length){reject(Error('BODY_SAVE_REJECTED'));return;}
   if(mediaIds===undefined&&xContentMatches(data,text,count)){mediaIds=xOrderedMediaIds(data.data.articleentity_update_content_state.content_state);resolve(response.status());}
  }catch{if(!disposed)reject(Error('X_SAVE_RECEIPT_UNREADABLE'));}
 };
 page.on('response',onResponse);
 return {
  wait:({timeout=30000}={})=>new Promise((yes,no)=>{
   timer=setTimeout(()=>no(Error('X_CONTENT_SAVE_TIMEOUT')),timeout);
   receipt.then(value=>{clearTimeout(timer);yes(value);},error=>{clearTimeout(timer);no(error);});
  }),
  mediaIds:()=>mediaIds?.slice(),
  dispose(){disposed=true;clearTimeout(timer);page.off('response',onResponse);reject(Error('CANCELLED'));}
 };
}

export async function waitForXImage(page,selector,current,total,{timeout=20000,mimes}={}){
 try{
  const ready=await page.waitForFunction(xMediaState,{selector,count:current,mimes,wait:true},{timeout});await ready.dispose();
 }catch(error){
  if(error.name!=='TimeoutError')throw error;
  const state=await page.evaluate(xMediaState,{selector}).catch(()=>null);
  if(!state)throw Error('X_BROWSER_CLOSED');
  throw Error(`X_IMAGE_INSERT_TIMEOUT image=${current}/${total} observed=${state.observed} loaded=${state.loaded}`);
 }
}

// X persists animated GIFs as video elements (DraftTweetGif). Count each media
// once; poster/thumbnail images in that same section are not additional media.
export function xMediaState({selector,count,mimes,text,wait=false}){
 const b=document.querySelector(selector);
 const media=[...(b?.querySelectorAll('section img[src],section video')||[])].filter(i=>i.tagName==='VIDEO'||!i.closest('section').querySelector('video'));
 const ready=i=>i.tagName==='VIDEO'?i.readyState>=2&&i.videoWidth>0:i.complete&&i.naturalWidth>0;
 const loaded=media.filter(ready).length;
 let valid=!!b&&!document.querySelector('[data-testid="loading-blocker"]')&&(count===undefined||media.length===count)&&loaded===media.length;
 if(mimes)valid=valid&&media.every((i,n)=>i.tagName!=='VIDEO'||mimes[n]==='image/gif');
 if(text!==undefined&&b){const clone=b.cloneNode(true);clone.querySelectorAll('section').forEach(e=>e.remove());valid=valid&&clone.textContent.replace(/\s+/g,'')===text;}
 const state={observed:media.length,loaded,valid};return wait?(valid?state:false):state;
}
export async function waitForXEditorReady(page,{text,count,mimes,timeout=30000}={}){
 await page.locator(title).waitFor();
 try{
  const ready=await page.waitForFunction(xMediaState,{selector:composer,text,count,mimes,wait:true},{timeout});await ready.dispose();
 }catch(error){if(error.name==='TimeoutError')throw Error('DRAFT_VERIFICATION_FAILED');throw error;}
}

// A retry must not append to a partially written draft. Select the editor's
// complete DOM range (including noneditable media), then use its native
// delete/history path. Never assign innerHTML or change platform React state.
export async function resetXDraftBody(page,{timeout=30000}={}){
 // Native selection/deletion needs the draft tab active, especially when
 // Chrome opens Home while this existing draft is reused in another tab.
 await page.bringToFront();
 const body=page.locator(composer+'[contenteditable="true"]');
 const empty=await body.evaluate(el=>!el.textContent.trim()&&!el.querySelector('section,img,[data-block] [contenteditable="false"]'));
 if(empty)return;
 const receipt=observeXContentSave(page,'',0);
 try{
  await body.focus();
  await body.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);});
  await body.press('Backspace');
  await waitForXEditorReady(page,{text:'',count:0,timeout});
  await receipt.wait({timeout});
  await page.reload({waitUntil:'domcontentloaded'});
  await waitForXEditorReady(page,{text:'',count:0,timeout});
 }catch(error){
  if(['DRAFT_VERIFICATION_FAILED','X_CONTENT_SAVE_TIMEOUT'].includes(error.message))throw Error('X_DRAFT_RESET_FAILED');
  throw error;
 }finally{receipt.dispose();}
}
