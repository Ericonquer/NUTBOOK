import {createHash} from 'node:crypto';
import {deliverDraft} from './delivery.mjs';

async function observation(context){
 const page=context.pages().filter(p=>{try{const u=new URL(p.url());return u.origin==='https://mp.weixin.qq.com'&&u.pathname==='/cgi-bin/appmsg';}catch{return false;}}).at(-1);
 if(!page)return null;
 const value=await page.evaluate(()=>{
  const b=document.querySelector('.rich_media_content .ProseMirror');if(!b)return null;
  return {title:document.querySelector('[name=title] .ProseMirror')?.textContent,html:b.innerHTML,summary:document.querySelector('#js_description')?.value,cover:document.querySelector('.js_cover_preview_new')?.style.backgroundImage};
 });
 return value?createHash('sha256').update(JSON.stringify(value)).digest('hex'):null;
}

// Called once per user send/retry. Never repeat a creation after an uncertain failure.
export async function deliverWechatWithRetry(options,{deliver=deliverDraft,observe=observation}={}){
 let retained=options.journal;
 const checkpoint=async value=>{retained=value;await options.checkpoint(value);};
 try{return await deliver({...options,checkpoint});}
 catch(error){
  if(options.signal?.aborted)throw error;
  if(!retained?.editUrl||!['editing','saved','verified'].includes(retained.stage))throw error;
  const unavailable=error.message==='DRAFT_UNAVAILABLE';
  const incomplete=['DRAFT_CONTENT_MISMATCH','DRAFT_INCOMPLETE','COVER_NOT_SAVED','DRAFT_IMAGES_NOT_LOADED'].includes(error.message);
  if(!unavailable&&!incomplete)throw error;
  const current=incomplete?await observe(options.context):null;
  if(unavailable||(current&&retained.failedObservation===current)){
   await options.archive(retained);
   options.progress?.({stage:'recovering'});
   // This invocation has no automatic retry: a new failed creation stays inspectable.
   return deliver({...options,journal:null,checkpoint});
  }
  if(current){
   const changed=!!retained.failedObservation;
   if(changed)throw Error('DRAFT_CHANGED');
   await checkpoint({...retained,failedObservation:current});
  }
  throw error;
 }
}
