/** Weibo article draft adapter. No publishing action is exposed. */
import {validateJob} from './delivery.mjs';
// Read the body through the intercepted request before the page can navigate.
// Never retry a POST: an uncertain create must remain uncertain.
export async function captureWeiboJson(page,predicate,action,{timeout=20000}={}){
 let resolve,reject,timer,claimed=false;
 const receipt=new Promise((yes,no)=>{resolve=yes;reject=no;});
 receipt.catch(()=>{});
 const match=url=>url.protocol==='https:'&&(
  url.hostname==='card.weibo.com'&&/^\/article\/v5\/aj\/editor\/draft\/(create|load|save)$/.test(url.pathname)||
  url.hostname==='picupload.weibo.com'&&url.pathname==='/interface/pic_upload.php');
 const handler=async route=>{
  const request=route.request();
  if(claimed||!predicate({url:()=>request.url(),request:()=>request}))return route.fallback();
  claimed=true;
  let response;
  try{
   response=await route.fetch({timeout,maxRedirects:0,maxRetries:0});
   const body=await response.body();
   // Forward the exact bytes even if the receipt is not valid JSON.
   await route.fulfill({response,body});
   resolve(JSON.parse(body.toString('utf8')));
  }catch(error){
   reject(Error(`WEIBO_RECEIPT_${new URL(request.url()).pathname.split('/').at(-1).toUpperCase()}: ${error.message}`));
   await route.abort().catch(()=>{});
  }finally{await response?.dispose().catch(()=>{});}
 };
 await page.route(match,handler);
 timer=setTimeout(()=>reject(Error('WEIBO_RECEIPT_TIMEOUT')),timeout);
 try{const [,value]=await Promise.all([action(),receipt]);return value;}
 finally{clearTimeout(timer);await page.unroute(match,handler);}
}
export const WEIBO_HOME='https://card.weibo.com/article/v5/editor';
const bodySelector='.tiptap[contenteditable=true]';
const imageTool='.svg-icon-wrapper:has(path[d^="M18 4C18.6 4 19 4.4"])';
export function validateWeiboResume(journal,digest){
 if(!journal)return;
 if(journal.digest!==digest)throw Error('JOB_CONTENT_CHANGED');
 if(journal.stage==='creating')throw Error('AMBIGUOUS_CREATE');
 const url=new URL(journal.editUrl);
 if(url.origin!=='https://card.weibo.com'||url.pathname!=='/article/v5/editor'||!/^#\/draft\/\d+$/.test(url.hash))throw Error('INVALID_CHECKPOINT_URL');
}
export function readWeiboUpload(value, image){
 const pics=Object.values(value?.data?.pics||{});
 if(value?.code!=='A00006'||pics.length!==1||pics[0].ret!==1||!/^\w{1,100}$/.test(pics[0].pid||'')){
  // Product failure details, never the raw response, URL, PID or credentials.
  const code=value?.code!=null&&/^[A-Za-z0-9_-]{1,32}$/.test(String(value.code))?String(value.code):'unknown';
  const ret=/^-?\d{1,6}$/.test(String(pics[0]?.ret))?String(pics[0].ret):'unknown';
  const position=image&&Number.isInteger(image.current)&&Number.isInteger(image.total)?` image=${image.current}/${image.total}`:'';
  throw Error(`IMAGE_UPLOAD_REJECTED${position} code=${code} ret=${ret} count=${pics.length}`);
 }
 return pics[0].pid;
}
export async function isWeiboAuthenticated(url,page){
 if(new URL(url).origin!=='https://card.weibo.com')return false;
 try{await page.getByRole('button',{name:'写文章',exact:true}).waitFor({timeout:10000});return true;}catch{return false;}
}
export async function waitForWeiboAuthentication(page){
 await page.waitForFunction(()=>location.origin==='https://card.weibo.com'&&[...document.querySelectorAll('button')].some(e=>e.textContent.trim()==='写文章') || location.hostname==='weibo.com'&&location.pathname!=='/newlogin'&&!!document.querySelector('button[title="发微博"]'),null,{timeout:600000});
}
export async function loadWeiboDraft(page,url){
 const value=await captureWeiboJson(page,r=>new URL(r.url()).pathname==='/article/v5/aj/editor/draft/load',async()=>{
  if(page.url()===url)await page.reload({waitUntil:'domcontentloaded'});
  else await page.goto(url,{waitUntil:'domcontentloaded'});
 });
 if(value.code!==100000||!value.data?.id||String(value.data.id)!==new URL(url).hash.split('/').at(-1))throw Error('DRAFT_UNAVAILABLE');
 await page.getByPlaceholder('请输入标题',{exact:true}).waitFor();
 await page.waitForFunction(expected=>document.querySelector('textarea')?.value===expected,value.data.title||'');
 await page.locator(bodySelector).waitFor();
 return value.data;
}
async function saveDraft(page){
 const saved=await captureWeiboJson(page,r=>new URL(r.url()).pathname==='/article/v5/aj/editor/draft/save'&&r.request().method()==='POST',()=>page.getByRole('button',{name:'保存草稿',exact:true}).click());
 if(saved.code!==100000)throw Error('SAVE_REJECTED');
}
async function verify(page,job,html,urls){
 await page.waitForFunction(({selector,count})=>{const imgs=[...document.querySelectorAll(selector+' figure img[src]')];return imgs.length===count&&imgs.every(e=>e.complete&&e.naturalWidth>0);},{selector:bodySelector,count:urls.length},{timeout:30000});
 const actual=await page.evaluate(({selector,html})=>{const root=document.querySelector(selector),expected=document.createElement('template');expected.innerHTML=html;
  const clean=node=>{const clone=node.cloneNode(true);clone.querySelectorAll('.ProseMirror-widget,figcaption').forEach(e=>e.remove());return clone.textContent.replace(/[\s\u200b\u00a0]/g,'');};
  return {title:document.querySelector('textarea').value,summary:document.querySelectorAll('textarea')[1].value,textMatches:clean(root)===clean(expected.content),urls:[...root.querySelectorAll('figure img[src]')].map(e=>e.src),cover:document.querySelector('.cover-img')?.src||''};
 },{selector:bodySelector,html});
 if(actual.title!==job.title||actual.summary!==job.summary||!actual.textMatches||JSON.stringify(actual.urls)!==JSON.stringify(urls)||job.coverId&&!actual.cover)throw Error('DRAFT_VERIFICATION_FAILED');
 return {verified:true,title:actual.title,imageCount:urls.length};
}
export const prepareWeiboBody = ({html,images,token})=>{const t=document.createElement('template');t.innerHTML=html;
  if(t.content.querySelector('script,iframe,object,embed,form,input,button,link,meta,style,svg'))throw Error('UNSAFE_HTML');
  for(const e of t.content.querySelectorAll('*'))for(const a of e.attributes)if(/^on/i.test(a.name)||/javascript\s*:/i.test(a.value))throw Error('UNSAFE_HTML');
  for(const img of t.content.querySelectorAll('img')){const id=img.getAttribute('data-nutbook-image');if(!images.some(e=>e.id===id))throw Error('UNRESOLVED_IMAGE');img.replaceWith(document.createTextNode(`NUTBOOK_${token}_IMAGE_${id}_END`));}
  return t.innerHTML;
 };
export async function deliverWeiboDraft({context,job,journal,checkpoint,progress=()=>{},signal}){
 const digest=validateJob(job);validateWeiboResume(journal,digest);
 if([...job.title].length>32||[...job.summary].length>44)throw Error('WEIBO_TEXT_LIMIT');
 let state=journal,page=await context.newPage();page.setDefaultTimeout(20000);
 const check=()=>{if(signal?.aborted)throw Error('CANCELLED');};
 const report=(stage,details={})=>{check();progress({stage,...details});};
 const stop=()=>page.close().catch(()=>{});signal?.addEventListener('abort',stop,{once:true});
 try{
 const prepared=await page.evaluate(prepareWeiboBody,{html:job.html,images:job.images.map(({id})=>({id})),token:digest.slice(0,16)});
 if(state){report('reusing');await loadWeiboDraft(page,state.editUrl);if(['saved','verified'].includes(state.stage)){const result=await verify(page,job,state.html,state.urls);await checkpoint({...state,stage:'verified'});return {...result,reused:true};}}
 else{
  report('preparing');await page.goto(WEIBO_HOME,{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'写文章',exact:true}).waitFor();
  await checkpoint({digest,stage:'creating'});
  const created=await captureWeiboJson(page,r=>new URL(r.url()).pathname==='/article/v5/aj/editor/draft/create'&&r.request().method()==='POST',()=>page.getByRole('button',{name:'写文章',exact:true}).click({noWaitAfter:true}));
  if(created.code!==100000||!/^\d+$/.test(String(created.data?.id||'')))throw Error('CREATE_REJECTED');
  const editUrl=`${WEIBO_HOME}#/draft/${created.data.id}`;
  state={digest,stage:'editing',editUrl};await checkpoint(state);
  // Identity is durable before any navigation/hydration can fail.
  await page.waitForURL(url=>url.hash===`#/draft/${created.data.id}`);
  await loadWeiboDraft(page,editUrl);
 }
 const title=page.getByPlaceholder('请输入标题',{exact:true}),summary=page.getByPlaceholder('导语（选填）',{exact:true});
 report('writing');await title.fill('');await title.pressSequentially(job.title);await summary.fill('');if(job.summary)await summary.pressSequentially(job.summary);
 const body=page.locator(bodySelector);

 await body.click();await page.keyboard.press('ControlOrMeta+a');
 await body.evaluate((el,html)=>{el.focus();const data=new DataTransfer();data.setData('text/html',html);el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},prepared);
 const urls=[];
 for(const [index,image] of job.images.entries()){
  report('uploading_images',{current:index+1,total:job.images.length});
  await body.evaluate((el,marker)=>{el.focus();const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){const at=node.textContent.indexOf(marker);if(at>=0){const range=document.createRange();range.setStart(node,at);range.setEnd(node,at+marker.length);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);return;}}throw Error('IMAGE_POSITION_MISSING');},`NUTBOOK_${digest.slice(0,16)}_IMAGE_${image.id}_END`);
  await page.keyboard.press('Backspace');await page.locator(imageTool).click();
  const dialog=page.getByRole('dialog').filter({hasText:'图片库'});
  const chooser=page.waitForEvent('filechooser');await dialog.getByText('上传',{exact:true}).click();
  const uploaded=await captureWeiboJson(page,r=>new URL(r.url()).hostname==='picupload.weibo.com'&&new URL(r.url()).pathname==='/interface/pic_upload.php'&&r.request().method()==='POST',async()=>{
   await(await chooser).setFiles({name:`${image.id}.${image.mime.split('/')[1]}`,mimeType:image.mime,buffer:Buffer.from(image.base64,'base64')});
  },{timeout:60000});
  const pid=readWeiboUpload(uploaded,{current:index+1,total:job.images.length});
  const card=dialog.locator('.image-item').filter({has:page.locator(`img[src*="/${pid}."]`)});
  await card.waitFor();const url=await card.locator('img').getAttribute('src');
  if(!/^https:\/\/[^/]+\.sinaimg\.cn\//.test(url||''))throw Error('INVALID_UPLOADED_IMAGE_URL');
  await card.click();await dialog.getByRole('button',{name:'插入',exact:true}).click();urls.push(url);
 }
 const html=await page.evaluate(({html,images,urls})=>{const t=document.createElement('template');t.innerHTML=html;for(const img of t.content.querySelectorAll('img')){img.src=urls[images.findIndex(e=>e.id===img.getAttribute('data-nutbook-image'))];img.removeAttribute('data-nutbook-image');}return t.innerHTML;},{html:job.html,images:job.images.map(({id})=>({id})),urls});
 if(job.coverId){
  report('cover');await page.getByText('设置文章封面',{exact:true}).or(page.getByText('替换封面图',{exact:true})).click();
  const dialog=page.getByRole('dialog').filter({hasText:'正文图片'});await dialog.locator('.image-item').nth(job.images.findIndex(e=>e.id===job.coverId)).click();
  await dialog.getByRole('button',{name:'下一步',exact:true}).click();
  const crop=page.getByRole('dialog').filter({hasText:'图片裁剪'});
  await crop.locator('cropper-image img').waitFor();
  await page.waitForFunction(()=>{const img=document.querySelector('cropper-image')?.shadowRoot?.querySelector('img');return img?.complete&&img.naturalWidth>0;});
  await crop.locator('cropper-selection').evaluate(el=>{if(el.getBoundingClientRect().width<=0)throw Error('CROP_NOT_READY');});
  await crop.getByRole('button',{name:'确定',exact:true}).click();
  await crop.waitFor({state:'hidden'});
 }
 report('saving');await saveDraft(page);
 state={...state,stage:'saved',html,urls};await checkpoint(state);
 report('verifying');await loadWeiboDraft(page,state.editUrl);const result=await verify(page,job,html,urls);await checkpoint({...state,stage:'verified'});return result;
 }finally{signal?.removeEventListener('abort',stop);}
}
