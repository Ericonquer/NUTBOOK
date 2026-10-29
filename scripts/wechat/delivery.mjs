/** Local WeChat draft adapter. Caller owns browser lifecycle and private journal storage. */
import { createHash } from 'node:crypto';

export function validateJob(job) {
  if (!job || job.version !== 1 || !/^[a-zA-Z0-9_-]{1,80}$/.test(job.id || '')) throw Error('INVALID_JOB');
  if (typeof job.title !== 'string' || !job.title.trim() || [...job.title].length > 64) throw Error('INVALID_TITLE');
  if (typeof job.html !== 'string' || job.html.length > 2_000_000) throw Error('INVALID_BODY');
  if (typeof job.summary !== 'string' || [...job.summary].length > 120) throw Error('INVALID_SUMMARY');
  if (!Array.isArray(job.images) || job.images.length > 50) throw Error('INVALID_IMAGES');
  const ids = new Set();
  for (const image of job.images) {
    if (!image || !/^[a-zA-Z0-9_-]{1,80}$/.test(image.id || '') || ids.has(image.id)) throw Error('INVALID_IMAGE_ID');
    if (!['image/png','image/jpeg','image/webp','image/gif'].includes(image.mime) || typeof image.base64 !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.base64)) throw Error('INVALID_IMAGE');
    if (Buffer.from(image.base64, 'base64').length > 10 * 1024 * 1024) throw Error('IMAGE_TOO_LARGE');
    ids.add(image.id);
  }
  if (job.coverId && !ids.has(job.coverId)) throw Error('INVALID_COVER');
  return createHash('sha256').update(JSON.stringify(job)).digest('hex');
}

export function validateResume(journal, digest) {
  if (!journal) return;
  if (journal.digest !== digest) throw Error('JOB_CONTENT_CHANGED');
  if (journal.stage === 'creating') throw Error('AMBIGUOUS_CREATE: inspect the draft box before retrying');
  if (!journal.editUrl) throw Error('INVALID_CHECKPOINT');
  const url = new URL(journal.editUrl);
  if (url.origin !== 'https://mp.weixin.qq.com' || url.pathname !== '/cgi-bin/appmsg' || !url.searchParams.get('appmsgid')) throw Error('INVALID_CHECKPOINT_URL');
}

export function readUploadResult(response) {
  if(response?.base_resp?.ret!==0 || !/^\d+$/.test(String(response.content || ''))) throw Error('IMAGE_UPLOAD_REJECTED');
  const url=new URL(response.cdn_url);
  if(url.protocol!=='https:' || url.hostname!=='mmbiz.qpic.cn') throw Error('INVALID_UPLOADED_IMAGE_URL');
  return {fileId:String(response.content),url:url.href};
}

const bodySelector = '.rich_media_content .ProseMirror';
const titleSelector = '[name=title] .ProseMirror';

export async function waitForDraftEditor(page) {
  // A saved draft can disappear outside Nutbook; distinguish that terminal page from slow loading.
  await page.waitForFunction(selector => !!document.querySelector(selector) || /此草稿已被删除|此草稿已发表/.test(document.body?.innerText || ''), titleSelector, {timeout:20000});
  if (!await page.locator(titleSelector).count()) throw Error('DRAFT_UNAVAILABLE');
}

// Runs in the page on inert HTML; editor-only separator nodes are not article images.
export function inspectDraftHTML(html) {
  const t=document.createElement('template');t.innerHTML=html;
  return {text:(t.content.textContent||'').replace(/\s+/g,''),images:[...t.content.querySelectorAll('img')]
    .filter(i=>!i.classList.contains('ProseMirror-separator'))
    .map(i=>i.getAttribute('src')||i.getAttribute('data-src')||'').filter(Boolean)};
}
export function imageIdentity(src) {
  try {const u=new URL(src);return u.protocol==='https:'&&u.hostname==='mmbiz.qpic.cn' ? u.origin+u.pathname.replace(/\/(?:s?\d+)$/,'') : null;}catch{return null;}
}
export function sameImages(actual,expected) {
  return actual.length===expected.length&&actual.every((src,i)=>imageIdentity(src)&&imageIdentity(src)===imageIdentity(expected[i]));
}
export function readSaveFields(request) {
  const url=new URL(request.url());
  if(url.origin!=='https://mp.weixin.qq.com'||url.pathname!=='/cgi-bin/operate_appmsg'||!['create','update'].includes(url.searchParams.get('sub'))||request.method()!=='POST')return null;
  const type=request.headers()['content-type']||'',body=request.postData()||'';
  let fields;
  if(type.includes('application/x-www-form-urlencoded'))fields=Object.fromEntries(new URLSearchParams(body));
  else {
    const boundary=type.match(/boundary=(?:"([^"\r\n]*)"|([^;\s]+))/)?.slice(1).find(Boolean);
    if(!boundary)return null;
    fields={};
    for(const part of body.split('--'+boundary)){
      const split=part.indexOf('\r\n\r\n');if(split<0)continue;
      const name=part.slice(0,split).match(/content-disposition:[^\r\n]*\bname="([^"\r\n]+)"/i)?.[1];
      if(name)fields[name]=part.slice(split+4).replace(/\r\n$/,'');
    }
  }
  // The live editor uses save_type=1 for autosave; only a full manual save is a receipt.
  if(fields.save_type!=='0'||fields.count!=='1'||!fields.content0)return null;
  return fields;
}

export async function verifyDraft(page,job,html,urls,{coverUrl,timeout=30000}={}) {
  await waitForDraftEditor(page);
  const expected=await page.evaluate(inspectDraftHTML,html);
  // The title can mount before the body has been restored. Wait on content, not time alone.
  try {
    await page.waitForFunction(({bodySelector,titleSelector,expected,urls,title,summary})=>{
      const b=document.querySelector(bodySelector);
      if(!b||document.querySelector(titleSelector)?.textContent!==title||document.querySelector('#js_description')?.value!==summary)return false;
      const identity=src=>{try{const u=new URL(src);return u.protocol==='https:'&&u.hostname==='mmbiz.qpic.cn'?u.origin+u.pathname.replace(/\/(?:s?\d+)$/,''):null;}catch{return null;}};
      const images=[...b.querySelectorAll('img')].filter(i=>!i.classList.contains('ProseMirror-separator')).map(i=>i.getAttribute('src')||i.getAttribute('data-src')||'').filter(Boolean);
      return (b.textContent||'').replace(/\s+/g,'')===expected.text&&images.length===urls.length&&images.every((src,i)=>identity(src)&&identity(src)===identity(urls[i]));
    },{bodySelector,titleSelector,expected,urls,title:job.title,summary:job.summary},{timeout});
  }catch{throw Error('DRAFT_CONTENT_MISMATCH');}
  const actual=await page.evaluate(({bodySelector,titleSelector})=>({
    html:document.querySelector(bodySelector)?.innerHTML||'',
    title:document.querySelector(titleSelector)?.textContent,
    summary:document.querySelector('#js_description')?.value,
    cover:document.querySelector('.js_cover_preview_new')?.style.backgroundImage||''
  }),{bodySelector,titleSelector});
  const body=await page.evaluate(inspectDraftHTML,actual.html);
  if(actual.title!==job.title||actual.summary!==job.summary||body.text!==expected.text||!sameImages(body.images,urls))throw Error('DRAFT_CONTENT_MISMATCH');
  if(job.coverId){
    const src=actual.cover.match(/url\(["']?(.*?)["']?\)/)?.[1];
    if(!imageIdentity(src)||(coverUrl&&imageIdentity(src)!==imageIdentity(coverUrl)))throw Error('COVER_NOT_SAVED');
  }
  try {
    await page.waitForFunction(selector=>{
      const b=document.querySelector(selector);return b&&[...b.querySelectorAll('img')]
        .filter(i=>!i.classList.contains('ProseMirror-separator')&&(i.getAttribute('src')||i.getAttribute('data-src')))
        .every(i=>i.complete&&i.naturalWidth>0);
    },bodySelector,{timeout});
  }catch{throw Error('DRAFT_IMAGES_NOT_LOADED');}
  const finalBody=await page.evaluate(selector=>document.querySelector(selector)?.innerHTML||'',bodySelector);
  const final=await page.evaluate(inspectDraftHTML,finalBody);
  if(final.text!==expected.text||!sameImages(final.images,urls))throw Error('DRAFT_CONTENT_MISMATCH');
  return {title:actual.title,imageCount:body.images.length,verified:true};
}

export async function saveDraft(page,job,html,urls,coverUrl,{timeout=30000}={}) {
  // A delayed response to a request already in flight must not satisfy this save.
  const started=new WeakSet();const onRequest=request=>started.add(request);
  page.on('request',onRequest);
  const expected=await page.evaluate(inspectDraftHTML,html);
  const id=new URL(page.url()).searchParams.get('appmsgid');
  const response=page.waitForResponse(async response=>{
    const request=response.request();if(!started.has(request))return false;
    const f=readSaveFields(request);if(!f||f.title0!==job.title||f.digest0!==job.summary)return false;
    if(id&&f.AppMsgId!==id)return false;
    if(coverUrl&&imageIdentity(f.cdn_url0)!==imageIdentity(coverUrl))return false;
    const body=await page.evaluate(inspectDraftHTML,f.content0);
    return body.text===expected.text&&sameImages(body.images,urls);
  },{timeout}).then(value=>({value}),error=>({error}));
  try {
    await page.getByText('保存为草稿',{exact:true}).click();
    const received=await response;
    if(received.error)throw Error('DRAFT_SAVE_UNCONFIRMED');
    const result=await received.value.json();
    if(!received.value.ok()||result.base_resp?.ret!==0||(result.ret!==undefined&&String(result.ret)!=='0'))throw Error('SAVE_REJECTED');
    if(result.appMsgId&&id&&String(result.appMsgId)!==id)throw Error('DRAFT_SAVE_UNCONFIRMED');
    const savedId=String(result.appMsgId||id||'');
    if(!/^[1-9]\d*$/.test(savedId))throw Error('DRAFT_SAVE_UNCONFIRMED');
    return savedId;
  }finally{page.off('request',onRequest);}
}

/** checkpoint must durably persist before resolving. No credentials or session tokens go to progress. */
export async function deliverDraft({context,job,journal=null,checkpoint,progress=()=>{},signal}) {
  const digest=validateJob(job);validateResume(journal,digest);
  const check=()=>{if(signal?.aborted)throw Error('CANCELLED');};
  const report=(stage,details={})=>{check();progress({stage,...details});};
  const pages=new Set();
  const stop=()=>{for(const p of pages)p.close().catch(()=>{});};
  signal?.addEventListener('abort',stop,{once:true});
  let editor, state=journal ? structuredClone(journal) : null;
  if(state?.editUrl){const url=new URL(state.editUrl);url.searchParams.delete('token');state.editUrl=url.href;}
  try {
    check();
    // Parse using an inert document before any platform side effect.
    const parser=await context.newPage();pages.add(parser);
    const parsed=await parser.evaluate(({html,ids})=>{
      const t=document.createElement('template');t.innerHTML=html;
      if(t.content.querySelector('script,iframe,object,embed,form,input,button,link,meta,style,svg'))throw Error('UNSAFE_HTML');
      for(const el of t.content.querySelectorAll('*'))for(const a of el.attributes){
        if(/^on/i.test(a.name)||/javascript\s*:/i.test(a.value))throw Error('UNSAFE_HTML');
      }
      const imageIds=[...t.content.querySelectorAll('img')].map(i=>i.getAttribute('data-nutbook-image'));
      if(imageIds.some(id=>!ids.includes(id)))throw Error('UNRESOLVED_IMAGE');
      return {imageIds};
    },{html:job.html,ids:job.images.map(i=>i.id)});
    await parser.close();pages.delete(parser);
    if(job.coverId&&!parsed.imageIds.includes(job.coverId))throw Error('COVER_MUST_BE_BODY_IMAGE');
    editor=await context.newPage();pages.add(editor);editor.setDefaultTimeout(20000);
    report('connecting');
    await editor.goto('https://mp.weixin.qq.com/',{waitUntil:'domcontentloaded'});
    if(!new URL(editor.url()).pathname.includes('/cgi-bin/home')){
      report('waiting_for_scan');
      await editor.waitForURL(u=>u.pathname.includes('/cgi-bin/home'),{timeout:600000});
    }
    check();
    const sessionToken=new URL(editor.url()).searchParams.get('token');
    if(!sessionToken)throw Error('LOGIN_SESSION_MISSING');
    if(state){
      const destination=new URL(state.editUrl);destination.searchParams.set('token',sessionToken);
      await editor.goto(destination.href,{waitUntil:'domcontentloaded'});
    } else {
      const href=await editor.locator('a').filter({hasText:'草稿箱'}).first().getAttribute('href');
      await editor.goto(new URL(href,editor.url()).href,{waitUntil:'domcontentloaded'});
      state={digest,stage:'creating'};await checkpoint(state); // Uncertain creation must never auto-retry.
      await editor.getByText('新的创作',{exact:true}).click();
      const next=context.waitForEvent('page',{timeout:20000}).then(page=>({page}),error=>({error}));
      await editor.locator('.weui-desktop-dropdown__list-ele__text').filter({hasText:/^文章$/}).click();
      const landing=editor;const opened=await next;if(opened.error)throw opened.error;editor=opened.page;pages.add(editor);editor.setDefaultTimeout(20000);
      await landing.close();pages.delete(landing);
    }
    if(['saved','verified'].includes(state?.stage))report('reusing');
    await waitForDraftEditor(editor);
    const savedUrl=()=>{const u=new URL(editor.url());u.searchParams.delete('token');return u.searchParams.get('appmsgid')?u.href:null;};
    if(state?.stage==='editing')throw Error('DRAFT_INCOMPLETE');
    if(['saved','verified'].includes(state?.stage)){
      report('reusing');const result=await verifyDraft(editor,job,state.html,state.urls,{coverUrl:state.coverUrl});await checkpoint({...state,stage:'verified'});return {...result,reused:true};
    }
    report('preparing');
    await editor.locator(titleSelector).fill(job.title);
    const body=editor.locator(bodySelector);
    // Upload through the real editor; replace the body with the frozen HTML only after all URLs exist.
    const mapping={};
    for(const image of job.images){
      check();report('uploading_images',{current:job.images.indexOf(image)+1,total:job.images.length});
      // The editor may replace a selected image or reuse a resource. Node counts are not upload receipts.
      const receipt=editor.waitForResponse(r=>new URL(r.url()).pathname==='/cgi-bin/filetransfer'&&r.request().method()==='POST',{timeout:60000}).then(response=>({response}),error=>({error}));
      await body.locator(':scope > :last-child').click();
      await editor.keyboard.press('ArrowDown');await editor.keyboard.press('End');
      await editor.locator('input[type=file]').setInputFiles({name:`${image.id}.${image.mime.split('/')[1]}`,mimeType:image.mime,buffer:Buffer.from(image.base64,'base64')});
      const received=await receipt;if(received.error)throw received.error;
      const uploaded=readUploadResult(await received.response.json());
      await body.locator(`img[data-imgfileid="${uploaded.fileId}"]`).first().waitFor();
      mapping[image.id]=uploaded.url;
      if(savedUrl()){state={...state,stage:'editing',editUrl:savedUrl()};await checkpoint(state);}
    }
    const html=await editor.evaluate(({html,mapping})=>{
      const t=document.createElement('template');t.innerHTML=html;
      for(const i of t.content.querySelectorAll('img')){i.src=mapping[i.getAttribute('data-nutbook-image')];i.removeAttribute('data-nutbook-image');}
      return t.innerHTML;
    },{html:job.html,mapping});
    report('writing');await body.click();await editor.keyboard.press('ControlOrMeta+a');
    await body.evaluate((el,html)=>{const d=new DataTransfer();d.setData('text/html',html);d.setData('text/plain','');el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:d,bubbles:true,cancelable:true}));},html);
    await editor.waitForFunction(({s,html})=>{
      const t=document.createElement('template');t.innerHTML=html;
      const norm=s=>(s||'').replace(/\s+/g,'');return norm(document.querySelector(s)?.textContent)===norm(t.content.textContent);
    },{s:bodySelector,html});
    await editor.locator('#js_description').fill(job.summary);
    if(job.coverId){
      report('cover');await editor.locator('.js_cover_btn_area').first().hover();
      await editor.locator('#js_cover_null .js_selectCoverFromContent').click();
      await editor.locator('.appmsg_content_img_item').nth(parsed.imageIds.indexOf(job.coverId)).click();
      await editor.getByRole('button',{name:'下一步',exact:true}).click();
      await editor.locator('.weui-desktop-dialog').filter({hasText:'编辑封面'}).getByRole('button',{name:'确认',exact:true}).click();
    }
    const urls=parsed.imageIds.map(id=>mapping[id]);
    let coverUrl;
    // WeChat crops/re-encodes the selected image into a new CDN resource.
    // The accepted preview, not the original body-image URL, is the save identity.
    if(job.coverId){
      try{await editor.waitForFunction(()=>{
        const raw=document.querySelector('.js_cover_preview_new')?.style.backgroundImage||'';
        return /url\(["']?https:\/\/mmbiz\.qpic\.cn\//.test(raw);
      });}catch{throw Error('COVER_NOT_SAVED');}
      coverUrl=await editor.evaluate(()=>document.querySelector('.js_cover_preview_new').style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]);
    }
    await verifyDraft(editor,job,html,urls,{coverUrl});
    report('saving');
    const savedId=await saveDraft(editor,job,html,urls,coverUrl);
    try{await editor.waitForURL(u=>u.searchParams.get('appmsgid')===savedId);}catch{throw Error('DRAFT_SAVE_UNCONFIRMED');}
    const editUrl=savedUrl();if(!editUrl)throw Error('SAVE_ID_MISSING');
    state={digest,stage:'saved',editUrl,html,coverUrl,urls:parsed.imageIds.map(id=>mapping[id])};await checkpoint(state);
    check();await editor.close();pages.delete(editor);
    editor=await context.newPage();pages.add(editor);
    report('verifying');const verifyUrl=new URL(editUrl);verifyUrl.searchParams.set('token',sessionToken);await editor.goto(verifyUrl.href,{waitUntil:'domcontentloaded'});
    const verified=await verifyDraft(editor,job,html,state.urls,{coverUrl});
    await checkpoint({...state,stage:'verified'});
    progress({stage:'verified'});return verified;
  } finally {signal?.removeEventListener('abort',stop);}
}
