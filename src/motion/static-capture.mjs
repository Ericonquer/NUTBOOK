import {prepareBackground} from './background.mjs';
import {prepareStaticGpuBackground} from './gpu-backgrounds.mjs';
import {validateConfig} from './contract.mjs';
// Resolve authored CSS/WAAPI animations in the capture copy, without real-time waiting.
function settleAuthorAnimations(){
 for(const animation of document.getAnimations()){
  const target=animation.effect?.target;if(!(target instanceof Element))continue;
  const timing=animation.effect.getComputedTiming();
  if(Number.isFinite(timing.endTime)){
   try{animation.finish();}catch{animation.pause();animation.currentTime=timing.endTime;}
   // A finite exit must not leave semantic content invisible in its cover.
   if(Number(getComputedStyle(target).opacity)<.01){
    const frames=animation.effect.getKeyframes(),visible=frames.filter(frame=>Number.isFinite(Number(frame.opacity))).sort((a,b)=>Number(b.opacity)-Number(a.opacity))[0];
    if(visible&&Number(visible.opacity)>0){animation.pause();animation.currentTime=Number(animation.effect.getTiming().delay||0)+Number(timing.duration)*(visible.computedOffset??visible.offset??0);}
   }
  }else{animation.pause();animation.currentTime=0;}
 }
}
let surface=null;
window.__NUTBOOK_STATIC_CAPTURE__={async render(pageId){
 surface?.dispose();surface=null;
 const legacy=window.__NUTBOOK_MOTION__,contract=document.documentElement.dataset.nutbookMotionContract;
 if(contract==='nutbook-motion/experimental-v1'){
  legacy?.pause?.();if(legacy?.seek&&Number.isFinite(legacy.duration))legacy.seek(legacy.duration);
  settleAuthorAnimations();return {background:false,legacy:true};
 }
 // Earlier formal runtimes do not recognize the document-start capture flag.
 // Their dispose restores author text and cancels any pending particle preparation.
 legacy?.dispose?.();
 if(contract==='nutbook-motion/v1'&&document.body.dataset.outputKind==='dynamic'){
  const style=document.createElement('style');style.dataset.nutbookCaptureFragments='';
  style.textContent='body[data-output-kind="dynamic"] .fragment{opacity:1!important;transform:none!important;pointer-events:none!important}';
  if(!document.querySelector('[data-nutbook-capture-fragments]'))document.head.append(style);
 }
 settleAuthorAnimations();
 const node=document.querySelector('script#nutbook-motion-config');
 if(!node)return {background:false};
 const config=validateConfig(JSON.parse(node.textContent));
 const id=pageId||window.__NUTBOOK_PRESENTATION__?.activePageId;
 const page=config.pages.find(page=>page.id===id)||(!id?config.pages.find(page=>document.querySelector(`[data-nutbook-page-id="${CSS.escape(page.id)}"]`)?.getBoundingClientRect().width>0):null);
 if(!page)throw Error('static background page unavailable');
 if(!page.background)return {background:false,pageId:page.id};
 await document.fonts.ready;
 const element=document.querySelector(`[data-nutbook-page-id="${CSS.escape(page.id)}"]`);
 surface=['background.topography','background.gradient-waves'].includes(page.background.templateId)?prepareStaticGpuBackground(element,page.background):prepareBackground(element,page.background,{low:false});
 surface.render(0);
 const canvas=surface.canvas,pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
 let paintedPixels=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])paintedPixels++;
 if(page.background.params.strength>0&&!paintedPixels)throw Error('static background frame is empty');
 // Freeze the result as an immutable PNG layer; the capture surface no longer
 // depends on a live canvas backing store or the renderer's resource lifetime.
 const png=canvas.toDataURL('image/png'),image=new Image();image.src=png;await image.decode();
 const frozen=document.createElement('div');frozen.dataset.nutbookMotionBackground=page.id;
 frozen.style.cssText=canvas.style.cssText;frozen.style.backgroundImage=`url("${png}")`;frozen.style.backgroundSize='100% 100%';frozen.setAttribute('aria-hidden','true');
 const style=document.querySelector('[data-nutbook-motion-background-style]')?.cloneNode(true);
 surface.dispose();element.prepend(frozen);if(style)document.head.append(style);
 surface={dispose(){frozen.remove();style?.remove();}};

 return {background:true,paintedPixels,pageId:page.id,templateId:page.background.templateId};
}};
