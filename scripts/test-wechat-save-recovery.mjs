import {deliverWechatWithRetry} from './wechat/retry-delivery.mjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inspectDraftHTML,verifyDraft,saveDraft,readSaveFields,validateJob,waitForDraftEditor,deliverDraft} from './wechat/delivery.mjs';
import {atomicJson,readJournal,replaceUnavailableDraft} from './wechat/job-store.mjs';
const browser=await chromium.launch({headless:true});
const dir=await mkdtemp(join(tmpdir(),'nutbook-wechat-recovery-'));
try {
 const page=await browser.newPage();
 const html='<p>完整正文，不能丢。</p>'+Array.from({length:5},(_,i)=>`<p><img src="https://mmbiz.qpic.cn/image${i}/0"></p>`).join('');
 const urls=Array.from({length:5},(_,i)=>`https://mmbiz.qpic.cn/image${i}/0`);
 const job={version:1,id:'recovery',title:'保存验收',summary:'摘要',html,images:[],coverId:'cover'};
 let posted=[];
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/cgi-bin/operate_appmsg'){
   posted.push(route.request().postData());
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({base_resp:{ret:0},ret:'0',appMsgId:123})});
  }
  return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<main></main>'});
 });
 await page.goto('https://mp.weixin.qq.com/cgi-bin/appmsg?appmsgid=123');
 async function editor(body=html,cover=urls[0]){
  await page.setContent('<div name="title"><div class="ProseMirror"></div></div><div class="rich_media_content"><div class="ProseMirror"></div></div><textarea id="js_description"></textarea><div class="js_cover_preview_new"></div><button>保存为草稿</button>');
  await page.evaluate(({job,body,cover})=>{
   document.querySelector('[name=title] .ProseMirror').textContent=job.title;
   const b=document.querySelector('.rich_media_content .ProseMirror');b.innerHTML=body+'<img class="ProseMirror-separator">';
   document.querySelector('#js_description').value=job.summary;
   document.querySelector('.js_cover_preview_new').style.backgroundImage=`url("${cover}")`;
   for(const img of b.querySelectorAll('img[src]')){Object.defineProperty(img,'complete',{value:true});Object.defineProperty(img,'naturalWidth',{value:100,configurable:true});}
  },{job,body,cover});
 }
 await editor();
 assert.equal((await page.evaluate(inspectDraftHTML,html)).images.length,5);
 assert.equal((await verifyDraft(page,job,html,urls,{coverUrl:urls[0],timeout:100})).verified,true);
 await editor(`<img src="${urls[0]}">`);
 await assert.rejects(verifyDraft(page,job,html,urls,{timeout:100}),/DRAFT_CONTENT_MISMATCH/);
 await editor(html,'');
 await assert.rejects(verifyDraft(page,job,html,urls,{coverUrl:urls[0],timeout:100}),/COVER_NOT_SAVED/);
 await editor(html,urls[1]);
 await assert.rejects(verifyDraft(page,job,html,urls,{coverUrl:urls[0],timeout:100}),/COVER_NOT_SAVED/);
 await editor();
 await page.evaluate(()=>{Object.defineProperty(document.querySelector('.rich_media_content img[src]'),'naturalWidth',{value:0,configurable:true});});
 await assert.rejects(verifyDraft(page,job,html,urls,{timeout:100}),/DRAFT_IMAGES_NOT_LOADED/);
 const fields={save_type:'0',count:'1',AppMsgId:'123',title0:job.title,digest0:job.summary,content0:html,cdn_url0:urls[0]};
 await editor();
 await page.evaluate(fields=>{
  window.send=async(f,sub='update')=>fetch('/cgi-bin/operate_appmsg?sub='+sub,{method:'POST',body:new URLSearchParams(f)});
  document.querySelector('button').onclick=async()=>{
   await send(fields,'can_pop_cartoon_original');
   await send({...fields,save_type:'1'});
   await send({...fields,content0:'<img src="https://mmbiz.qpic.cn/image0/0">'});
   await send({...fields,cdn_url0:'https://mmbiz.qpic.cn/wrong/0'});
   await send({...fields,AppMsgId:'456'});
   window.manualReleased=true;
   await send(fields);
  };
 },fields);
 await saveDraft(page,job,html,urls,urls[0],{timeout:2000});
 assert.equal(posted.length,6,'only complete manual save should resolve after five invalid responses');
 assert.equal(await page.evaluate(()=>window.manualReleased),true);
 // Multipart is the current live editor encoding.
 const boundary='fixture-boundary';
 const multipart=Object.entries(fields).map(([k,v])=>`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`).join('')+`--${boundary}--\r\n`;
 const request={url:()=> 'https://mp.weixin.qq.com/cgi-bin/operate_appmsg?sub=update',method:()=> 'POST',headers:()=>({'content-type':`multipart/form-data; boundary="${boundary}"`}),postData:()=>multipart};
 assert.deepEqual(readSaveFields(request),fields);
 assert.equal(readSaveFields({...request,url:()=> 'https://mp.weixin.qq.com/cgi-bin/operate_appmsg?sub=other'}),null);
 await page.evaluate(fields=>{document.querySelector('button').onclick=()=>send({...fields,save_type:'1'});},fields);
 await assert.rejects(saveDraft(page,job,html,urls,urls[0],{timeout:150}),/DRAFT_SAVE_UNCONFIRMED/);
 assert.equal(page.listenerCount('request'),0,'save listeners removed after failure');
 // Deleted-draft recovery uses durable evidence, including after an application restart.
 const digest=validateJob({...job,coverId:undefined});
 const receipt={digest,stage:'saved',editUrl:'https://mp.weixin.qq.com/cgi-bin/appmsg?appmsgid=123'};
 const checkpointPath=join(dir,'recovery.json'),status=join(dir,'recovery.status.json');
 for(const stage of ['editing','saved','verified']){
  await atomicJson(checkpointPath,{...receipt,stage});
  await atomicJson(status,{jobId:'recovery',running:false,error:'NETWORK_ERROR'});
  await assert.rejects(replaceUnavailableDraft(dir,'recovery',digest),/RECREATE_NOT_ALLOWED/);
  await page.setContent('<p>此草稿已被删除</p>');
  await assert.rejects(waitForDraftEditor(page),/DRAFT_UNAVAILABLE/);
  await atomicJson(status,{jobId:'recovery',running:false,error:'DRAFT_UNAVAILABLE'});
  await replaceUnavailableDraft(dir,'recovery',digest);
  assert.equal(await readJournal(checkpointPath),null);
 }
 assert.equal((await readdir(dir)).filter(x=>x.includes('.previous-')).length,3);
 await atomicJson(checkpointPath,{...receipt,stage:'creating'});
 await assert.rejects(replaceUnavailableDraft(dir,'recovery',digest),/RECREATE_NOT_ALLOWED/);
 await atomicJson(checkpointPath,receipt);
 await atomicJson(status,{jobId:'recovery',running:false,error:'DRAFT_CONTENT_MISMATCH'});
 await replaceUnavailableDraft(dir,'recovery',digest);
 // Exercise the complete adapter: existing corrupt draft -> external deletion -> explicit recreation -> reopen.
 const ctx=await browser.newContext();let remoteDeleted=false,remoteBody=html,remoteCover='',created=0,uploads=0;
 const fullJob={...job,html:html.replace(/src="https:\/\/mmbiz.qpic.cn\/image(\d)\/0"/g,(_,n)=>`data-nutbook-image="image-${n}"`),coverId:'image-0',images:urls.map((_,i)=>({id:`image-${i}`,mime:'image/png',base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jO7sAAAAASUVORK5CYII='}))};
 const fullDigest=validateJob(fullJob);
 let journal={digest:fullDigest,stage:'saved',editUrl:'https://mp.weixin.qq.com/cgi-bin/appmsg?appmsgid=123',html,urls};
 const checkpoint=async value=>{journal=value;};
 await ctx.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='mmbiz.qpic.cn')return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jO7sAAAAASUVORK5CYII=','base64')});
  if(u.pathname==='/cgi-bin/operate_appmsg'){
   const f=Object.fromEntries(new URLSearchParams(route.request().postData()));remoteBody=f.content0;remoteCover=f.cdn_url0;
   return route.fulfill({contentType:'application/json',body:JSON.stringify({base_resp:{ret:0},ret:'0',appMsgId:123})});
  }
  if(u.pathname==='/cgi-bin/filetransfer'){
   const i=uploads++;return route.fulfill({contentType:'application/json',body:JSON.stringify({base_resp:{ret:0},content:String(100+i),cdn_url:urls[i]})});
  }
  let body='';
  if(u.pathname==='/')body='<script>location.replace("/cgi-bin/home?token=fixture")</script>';
  else if(u.pathname==='/cgi-bin/home')body='<a href="/drafts">草稿箱</a>';
  else if(u.pathname==='/drafts')body='<button>新的创作</button><a class="weui-desktop-dropdown__list-ele__text" onclick="window.open(\'/cgi-bin/appmsg?appmsgid=123\')">文章</a>';
  else if(u.pathname==='/cgi-bin/appmsg'){
   if(remoteDeleted)body='<p>此草稿已被删除</p>';
   else {
    if(journal?.stage==='creating')created++;
    const content=journal?.stage==='creating'?'<p><br></p>':remoteBody;
    body=`<style>.rich_media_content img{width:120px;height:60px}.rich_media_content p{min-height:24px}</style><div name="title"><div class="ProseMirror" contenteditable="true">${job.title}</div></div><div class="rich_media_content"><div class="ProseMirror" contenteditable="true">${content}</div></div><textarea id="js_description">${job.summary}</textarea><input type="file"><div class="js_cover_preview_new" style='background-image:url("${remoteCover}")'></div><div class="js_cover_btn_area"><div id="js_cover_null"><button class="js_selectCoverFromContent">选择封面</button></div></div><div class="weui-desktop-dialog">编辑封面<button>下一步</button><button>确认</button></div><button id="save">保存为草稿</button><script>
     const b=document.querySelector('.rich_media_content .ProseMirror');
     b.addEventListener('paste',e=>{e.preventDefault();b.innerHTML=e.clipboardData.getData('text/html')});
     document.querySelector('input').onchange=async()=>{const r=await(await fetch('/cgi-bin/filetransfer',{method:'POST',body:'upload'})).json();b.insertAdjacentHTML('beforeend','<p><img data-imgfileid="'+r.content+'" src="'+r.cdn_url+'"></p>')};
     document.querySelector('.js_selectCoverFromContent').onclick=()=>{for(const img of b.querySelectorAll('img[src]')){const btn=document.createElement('button');btn.className='appmsg_content_img_item';btn.textContent='图片';btn.onclick=()=>window.chosenCover='https://mmbiz.qpic.cn/cropped-cover/0?wx_fmt=jpeg';document.body.append(btn)}};
     document.querySelector('.weui-desktop-dialog button:last-child').onclick=()=>document.querySelector('.js_cover_preview_new').style.backgroundImage='url("'+chosenCover+'")';
     document.querySelector('#save').onclick=()=>fetch('/cgi-bin/operate_appmsg?sub=update',{method:'POST',body:new URLSearchParams({save_type:'0',count:'1',AppMsgId:'123',title0:document.querySelector('[name=title] .ProseMirror').textContent,digest0:document.querySelector('textarea').value,content0:b.innerHTML,cdn_url0:window.chosenCover||${JSON.stringify(remoteCover)}})});
    </script>`;
   }
  }
  await route.fulfill({contentType:'text/html; charset=utf-8',body});
 });
 remoteBody=`<img src="${urls[0]}">`;
 await assert.rejects(deliverDraft({context:ctx,job:fullJob,journal,checkpoint}),/DRAFT_CONTENT_MISMATCH/);
 assert.equal(created,0);assert.equal(uploads,0,'retry must not overwrite incomplete remote draft');
 remoteDeleted=true;
 let archived=0;
 const result=await deliverWechatWithRetry({context:ctx,job:fullJob,journal,checkpoint,archive:async value=>{assert.equal(value.digest,fullDigest);archived++;journal=null;remoteDeleted=false;}});
 assert.equal(archived,1,'deleted draft is automatically recreated on ordinary retry');
 assert.equal(result.verified,true);assert.equal(result.imageCount,5);assert.equal(journal.stage,'verified');assert.match(journal.coverUrl,/cropped-cover/);assert.equal(created,1);assert.equal(uploads,5);
 // Simulate reload of the same saved document: verify without uploads or another creation.
 const repeated=await deliverDraft({context:ctx,job:fullJob,journal,checkpoint});
 assert.equal(repeated.reused,true);assert.equal(uploads,5);assert.equal(created,1);
 await ctx.close();
 console.log('WeChat: incomplete content/cover/load diagnostics, exact manual-save payload, autosave/wrong draft rejection, multipart, deletion recovery and ambiguous-create guards passed. Local browser fixture only; no platform access.');
}finally{await browser.close();await rm(dir,{recursive:true,force:true});}
