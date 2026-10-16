// Shared page-local layer: no author attributes/styles are rewritten.
export function createBackgroundLayer(element,{low=false,preview=false}={}){
 const rect=element.getBoundingClientRect();if(rect.width<1||rect.height<1)throw Error('Background page is not visible');
 const canvas=document.createElement('canvas'),style=document.createElement('style'),dpr=low?1:Math.min(2,devicePixelRatio||1);canvas.dataset[preview?'nutbookTemplateBackground':'nutbookMotionBackground']=element.dataset.nutbookPageId;canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:-1';canvas.width=Math.ceil(rect.width*dpr);canvas.height=Math.ceil(rect.height*dpr);
 const position=getComputedStyle(element).position;style.dataset[preview?'nutbookTemplateBackgroundStyle':'nutbookMotionBackgroundStyle']='';style.textContent=`[data-nutbook-page-id="${element.dataset.nutbookPageId}"]{isolation:isolate!important;${position==='static'?'position:relative!important;':''}}`;document.head.append(style);element.prepend(canvas);
 return {canvas,rect,dpr,ctx:canvas.getContext('2d'),dispose(){canvas.remove();style.remove();canvas.width=canvas.height=0;}};
}
