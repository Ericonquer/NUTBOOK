import {localizeMotionUi} from './ui-locale.mjs';
import {attachTransitionTarget,pairedTransitionIds,canSnapshotTransition,freezePage,renderPageTransition,createNavigationCoordinator} from './transition.mjs';
export function installMotionNavigation(hooks){
 const {bridge}=hooks,original=bridge.goTo.bind(bridge);let operation=null,preview=null,notice=null,skipOnce=null,noticeLocale=null;
 const pageElement=id=>document.querySelector(`[data-nutbook-page-id="${id}"]`);
 const clearNotice=()=>{noticeLocale?.dispose();noticeLocale=null;notice?.remove();notice=null;};
 function showNotice(message,actions=[]){clearNotice();notice=document.createElement('div');notice.dataset.nutbookMotionNavigationFeedback='';notice.dataset.nutbookRuntimeControl='';notice.style.cssText='position:fixed;right:16px;top:16px;z-index:2147483646;max-width:min(380px,calc(100vw - 32px))';const ui=notice.attachShadow({mode:'open'});ui.innerHTML='<style>section{padding:12px;border:1px solid #ddd;border-radius:10px;background:#fff;color:#1a1c1d;box-shadow:0 8px 24px #0002;font:13px/1.5 -apple-system,BlinkMacSystemFont,sans-serif}p{margin:0 0 8px}button{font:inherit;border:0;border-radius:7px;background:#eeeef0;padding:6px 9px;margin-right:6px;cursor:pointer}button:focus-visible{outline:2px solid #222}</style><section><p role="status"></p></section>';ui.querySelector('p').textContent=message;for(const [label,action]of actions){const button=document.createElement('button');button.textContent=label;button.title=label;button.setAttribute('aria-label',label);button.onclick=action;ui.querySelector('section').append(button);}document.documentElement.append(notice);noticeLocale=localizeMotionUi(ui);}
 async function recover(id,direct,isPreview){clearNotice();if(isPreview){preview=null;return api.previewAt(.45,false);}if(direct)skipOnce=id;if(window.__NUTBOOK_NATIVE_PRESENTATION_REQUEST_PAGE__)return window.__NUTBOOK_NATIVE_PRESENTATION_REQUEST_PAGE__(id);if(await coordinator.goTo(id,{direct}))await hooks.playReady();}
 const coordinator=createNavigationCoordinator(async(id,options,signal)=>{
  if(signal.cancelled){preview?.readyResolve(false);preview=null;return false;}const config=hooks.getConfig(),fromId=bridge.activePageId,fromIndex=config.pages.findIndex(page=>page.id===fromId),toIndex=config.pages.findIndex(page=>page.id===id);if(toIndex<0)return false;if(fromId===id)return true;
  const from=config.pages[fromIndex],to=config.pages[toIndex],isPreview=Boolean(options.preview),direct=options.direct||skipOnce===id;skipOnce=null;
  if(direct){hooks.setStaticPage(id);return original(id);}
  if(hooks.isStatic()||(!hooks.isPresentation()&&!isPreview)||hooks.isEditing()&&!isPreview)return original(id);
  const fromElement=pageElement(fromId),toElement=pageElement(id),compatible=fromElement&&toElement&&canSnapshotTransition(from,to,fromElement,toElement);
  if(!compatible){if(isPreview){preview.readyResolve(false);preview=null;showNotice('这两页内容不支持转场预览，设置已保留。',[['关闭',clearNotice]]);return false;}if(from.transition)showNotice('这两页包含不兼容的内容，本次直接切页；转场设置已保留。',[['关闭',clearNotice]]);return original(id);}
  clearNotice();hooks.clearSelection();const captured=hooks.capture();let frozen=null,rolledBack=false,completed=false,resolveAnimation;
  const tx={fromId,targetId:id,preview:isPreview,captured,progress:options.progress??0,phase:'preparing',frozen,initial:null};operation=tx;
  hooks.detach();
  const rollback=()=>{if(rolledBack||completed)return;rolledBack=true;hooks.cancelPreparation();hooks.stopComposition();void original(fromId);hooks.restore(captured,{preview:isPreview});frozen?.dispose();if(preview?.sourceId===fromId){preview.readyResolve(false);preview=null;}operation=null;hooks.sync();void hooks.publishFreeze(hooks.currentState());};
  const cancel=()=>{rollback();resolveAnimation?.(false);};const off=signal.onCancel(cancel);
  try{
   frozen=freezePage(fromElement,hooks.foregroundCanvas());tx.frozen=frozen;
   await hooks.publishFreeze({...captured.playbackState,playbackStatus:'paused'});if(signal.cancelled)return false;
   if(await original(id)===false)throw Error('target_navigation_failed');if(signal.cancelled)return false;
   if(!await hooks.prepareTarget(toIndex<fromIndex&&!isPreview,isPreview))throw Error('target_preparation_failed');if(bridge.activePageId!==id&&!signal.cancelled)throw Error('target_page_changed');if(signal.cancelled)return false;
   tx.initial=hooks.currentState();tx.phase='composing';const effect=hooks.getConfig().pages.find(page=>page.id===fromId).transition;
   if(effect&&pairedTransitionIds.has(effect.templateId)){const target=freezePage(toElement,hooks.foregroundCanvas());try{attachTransitionTarget(frozen.layer,target.layer);}finally{target.dispose();}}
   const animate=Boolean(effect)&&(isPreview||toIndex===fromIndex+1&&!window.__NUTBOOK_MOTION_MIRROR__);
   const paint=p=>{tx.progress=p;renderPageTransition(frozen.layer,p,hooks.getConfig().pages.find(page=>page.id===fromId).transition);hooks.submitted(p);};
   if(isPreview){preview.readyResolve(true);if(!preview.autoplay){paint(preview.progress);tx.phase='preview-paused';}}
   if(animate){const finished=await new Promise(resolve=>{resolveAnimation=resolve;hooks.setComposition({duration:()=>hooks.getConfig().pages.find(page=>page.id===fromId).transition.params.durationMs,render:paint,finish:()=>resolve(true),state:tx});if(!isPreview||preview?.autoplay)hooks.playComposition();});if(!finished||signal.cancelled)return false;}
   if(isPreview){rollback();return true;}
   completed=true;hooks.stopComposition();hooks.renderInitial(tx.initial);hooks.release(captured);frozen.dispose();operation=null;hooks.sync();return true;
  }catch(error){rollback();if(!signal.cancelled){showNotice('目标页准备失败，已保留上一页。可以重试，或本次直接显示完整正文。',isPreview?[['重试预览',()=>void recover(id,false,true)],['关闭',clearNotice]]:window.__NUTBOOK_MOTION_MIRROR__?[['重试',()=>void recover(id,false,false)],['关闭',clearNotice]]:[['重试',()=>void recover(id,false,false)],['直接切页',()=>void recover(id,true,false)],['取消',clearNotice]]);}return false;
  }finally{off();if(signal.cancelled){if(!rolledBack)rollback();if(bridge.activePageId!==fromId)await original(fromId);}if(!completed&&!rolledBack)rollback();}
 });
 bridge.goTo=id=>coordinator.goTo(id);
 const api={get sourceId(){return preview?.sourceId||null;},get busy(){return Boolean(operation);},get previewing(){return Boolean(preview);},get initialState(){return operation?.initial||null;},get returnState(){return operation?.captured.playbackState||null;},get phase(){return operation?{fromId:operation.fromId,targetId:operation.targetId,phase:operation.phase,progress:operation.progress}:null;},
  async previewAt(progress,autoplay=false){const from=hooks.getConfig().pages.find(page=>page.id===(preview?.sourceId||bridge.activePageId)),index=hooks.getConfig().pages.indexOf(from),next=hooks.getConfig().pages[index+1];if(!from?.transition||!next){showNotice('当前页没有可预览的出页转场或下一页。',[['关闭',clearNotice]]);return false;}if(preview){preview.progress=progress;preview.autoplay=autoplay;if(operation?.phase==='preview-paused'||operation?.phase==='composing'){operation.phase=autoplay?'composing':'preview-paused';hooks.pauseComposition();renderPageTransition(operation.frozen.layer,progress,from.transition);operation.progress=progress;hooks.submitted(progress);if(autoplay)hooks.playComposition(progress*from.transition.params.durationMs);}return preview.ready;}
   let readyResolve;const ready=new Promise(resolve=>readyResolve=resolve);preview={sourceId:from.id,progress,autoplay,ready,readyResolve};hooks.sync();void coordinator.goTo(next.id,{preview:true,progress}).catch(()=>readyResolve(false));return ready;},
  cancel(){coordinator.cancel();clearNotice();},dispose(){coordinator.dispose();clearNotice();bridge.goTo=original;},state:()=>coordinator.state()};return api;
}
