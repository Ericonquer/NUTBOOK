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
 const page=(journal&&context.pages().find(p=>p.url()===journal.editUrl))||await context.newPage();page.setDefaultTimeout(20000);
 for(const other of context.pages())if(other!==page&&journal&&other.url()===journal.editUrl)await other.close();
 const abort=()=>page.close().catch(()=>{});signal?.addEventListener('abort',abort,{once:true});
 let state=journal?structuredClone(journal):null, saveReceipt;
 async function persist(stage){state={...state,digest,stage};await checkpoint(state);}
 async function verify(){
  report('verifying');await page.reload({waitUntil:'domcontentloaded'});await page.locator(title).waitFor();
  await page.waitForFunction(({selector,total})=>{
   const b=document.querySelector(selector);const imgs=[...(b?.querySelectorAll('section img[src]')||[])];
   return !!b&&imgs.length===total&&imgs.every(i=>i.complete&&i.naturalWidth>0);
  },{selector:composer,total:prepared.markers.length},{timeout:30000});
  const result=await page.evaluate(({composer,title,markers})=>{
   const b=document.querySelector(composer);const clone=b.cloneNode(true);clone.querySelectorAll('section').forEach(e=>e.remove());
   return {title:document.querySelector(title)?.value,text:clone.textContent.replace(/\s+/g,''),markers:markers.some(m=>b.textContent.includes(m.marker)),images:[...b.querySelectorAll('section img[src]')].map(i=>i.src),cover:[...document.querySelectorAll('main img[src]')].some(i=>!i.closest(composer)&&i.src.includes('/media/')&&i.complete&&i.naturalWidth>0)};
  },{composer,title,markers:prepared.markers});
  if(result.title!==job.title||result.text!==prepared.text||result.markers||job.coverId&&!result.cover)throw Error('DRAFT_VERIFICATION_FAILED');
  // Persisted X media URLs may be recreated blob URLs. Compare decoded pixel samples in order.
  const ordered=await page.evaluate(async({selector,expected})=>{
   async function pixels(src){const i=new Image();i.src=src;await i.decode();const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');x.drawImage(i,0,0,16,16);return [...x.getImageData(0,0,16,16).data];}
   const actual=[...document.querySelectorAll(selector+' section img[src]')];
   for(let n=0;n<expected.length;n++){
    const a=await pixels(actual[n].src),b=await pixels(expected[n]);let error=0;for(let k=0;k<a.length;k++)if(k%4!==3)error+=Math.abs(a[k]-b[k]);
    if(error/(16*16*3)>30)return false;
   }return true;
  },{selector:composer,expected:prepared.markers.map(m=>{const i=job.images.find(i=>i.id===m.id);return `data:${i.mime};base64,${i.base64}`;})});
  if(!ordered)throw Error('IMAGE_ORDER_MISMATCH');
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
  report('writing');await page.locator(title).fill(job.title);
  const body=page.locator(composer+'[contenteditable="true"]');await body.click();await body.press(process.platform==='darwin'?'Meta+a':'Control+a');await page.keyboard.press('Backspace');
  saveReceipt=observeXContentSave(page,prepared.text,prepared.markers.length);
  for(let n=0;n<prepared.parts.length;n++){
   const part=prepared.parts[n];
   await body.focus();await body.press(process.platform==='darwin'?'Meta+ArrowDown':'Control+End');
   if(part.plain.trim())await body.evaluate((el,part)=>{const dt=new DataTransfer();dt.setData('text/html',part.html);dt.setData('text/plain',part.plain);el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:dt}));},part);
   if(!part.imageId)continue;
   report('uploading_images',{current:n+1,total:prepared.markers.length});
   await body.press(process.platform==='darwin'?'Meta+ArrowDown':'Control+End');await page.keyboard.press('Enter');
   await page.getByRole('button',{name:mediaName}).click();await page.getByRole('menuitem',{name:/^媒体$|^Media$/}).click();
   const dialog=page.getByRole('dialog');await dialog.locator('input[type="file"]').setInputFiles(file(job.images.find(i=>i.id===part.imageId)));
   const apply=page.getByRole('button',{name:/^应用$|^Apply$/});if(await apply.count())await apply.click();
   await waitForXImage(page,composer,n+1,prepared.markers.length);
  }
  report('saving');await saveReceipt.wait();
  if(job.coverId){
   report('cover');const coverReceipt=page.waitForResponse(r=>/\/ArticleEntityUpdateCoverMedia(?:\?|$)/.test(r.url())&&r.status()===200).then(r=>r.json());coverReceipt.catch(()=>{});await page.locator('input[type="file"]').first().setInputFiles(file(job.images.find(i=>i.id===job.coverId)));
   const apply=page.getByRole('button',{name:/^应用$|^Apply$/});await apply.waitFor();await apply.click();await apply.waitFor({state:'hidden'});const receipt=await coverReceipt;if(receipt.errors?.length)throw Error('COVER_SAVE_REJECTED');
  }
  report('saving');
  // Reload verification is the authority; checkpoint stays editing until autosave is proven.
  const result=await verify();return result;
 }finally{saveReceipt?.dispose();signal?.removeEventListener('abort',abort);}
}
function file(image){return {name:`${image.id}.${image.mime.split('/')[1]}`,mimeType:image.mime,buffer:Buffer.from(image.base64,'base64')};}

export function xContentMatches(data,text,imageCount){
 const state=data?.data?.articleentity_update_content_state?.content_state;if(!state)return false;
 const actual=state.blocks.map(b=>b.text).join('').replace(/\s+/g,'');
 const media=(state.entityMap||[]).flatMap(e=>e.value?.data?.mediaItems||[]);
 return actual===text&&media.length===imageCount&&media.every(i=>i.mediaId);
}
// Observe throughout writing, but start the acknowledgement deadline only
// after all text/media has been inserted. Long uploads cannot consume it early.
export function observeXContentSave(page,text,count){
 let resolve,reject,disposed=false,timer;
 const receipt=new Promise((yes,no)=>{resolve=yes;reject=no;});receipt.catch(()=>{});
 const onResponse=async response=>{
  if(disposed||!/\/ArticleEntityUpdateContent(?:\?|$)/.test(response.url()))return;
  try{
   const data=await response.json();if(disposed)return;
   if(response.status()!==200||data.errors?.length){reject(Error('BODY_SAVE_REJECTED'));return;}
   if(xContentMatches(data,text,count))resolve(response.status());
  }catch{if(!disposed)reject(Error('X_SAVE_RECEIPT_UNREADABLE'));}
 };
 page.on('response',onResponse);
 return {
  wait:({timeout=30000}={})=>new Promise((yes,no)=>{
   timer=setTimeout(()=>no(Error('X_CONTENT_SAVE_TIMEOUT')),timeout);
   receipt.then(value=>{clearTimeout(timer);yes(value);},error=>{clearTimeout(timer);no(error);});
  }),
  dispose(){disposed=true;clearTimeout(timer);page.off('response',onResponse);reject(Error('CANCELLED'));}
 };
}

export async function waitForXImage(page,selector,current,total,{timeout=20000}={}){
 try{
  await page.waitForFunction(({selector,count})=>{const imgs=[...document.querySelectorAll(selector+' section img[src]')];return imgs.length===count&&imgs.every(i=>i.complete&&i.naturalWidth>0);},{selector,count:current},{timeout});
 }catch(error){
  if(error.name!=='TimeoutError')throw error;
  const state=await page.evaluate(selector=>{const imgs=[...document.querySelectorAll(selector+' section img[src]')];return {observed:imgs.length,loaded:imgs.filter(i=>i.complete&&i.naturalWidth>0).length};},selector).catch(()=>null);
  if(!state)throw Error('X_BROWSER_CLOSED');
  throw Error(`X_IMAGE_INSERT_TIMEOUT image=${current}/${total} observed=${state.observed} loaded=${state.loaded}`);
 }
}
