import {effectiveCapabilities} from './contract.mjs';
let snapshotSequence=0;
export function probeTransitionPage(page,element){
 const media=[...element.querySelectorAll('video')],frames=[...element.querySelectorAll('iframe')];
 return effectiveCapabilities(page.capabilities,{containsVideo:media.length>0,containsEmbeddedFrame:frames.length>0,supportsDomTransition:!element.querySelector('object,embed,svg image,svg foreignObject')&&![element,...element.querySelectorAll('*')].some(node=>node.shadowRoot),supportsFilterTransition:typeof CSS!=='undefined'&&CSS.supports('filter','blur(1px)')});
}
export function canSnapshotTransition(from,to,fromElement,toElement){if(!fromElement||!toElement)return false;const a=probeTransitionPage(from,fromElement),b=probeTransitionPage(to,toElement);return (CSS.supports('mask-image','linear-gradient(90deg,transparent,#000)')||CSS.supports('-webkit-mask-image','linear-gradient(90deg,transparent,#000)'))&&a.supportsDomTransition&&b.supportsDomTransition&&!a.containsVideo&&!b.containsVideo&&!a.containsEmbeddedFrame&&!b.containsEmbeddedFrame;}
export function freezePage(element,foregroundCanvas){
 const layer=document.createElement('div');layer.dataset.nutbookMotionTransition='';layer.setAttribute('aria-hidden','true');layer.inert=true;
 const body=getComputedStyle(document.body);layer.style.cssText='position:fixed;inset:0;z-index:2147483600;pointer-events:none;overflow:hidden;';layer.style.backgroundColor=body.backgroundColor;layer.style.backgroundImage=body.backgroundImage;
 const root=element.parentElement?.classList.contains('deck')?element.parentElement:element,activeId=element.dataset.nutbookPageId,prefix=`nutbook-transition-${++snapshotSequence}-`,ids=new Map([...root.querySelectorAll('[id]')].map((node,index)=>[node.id,`${prefix}${index}`]));if(root.id)ids.set(root.id,`${prefix}root`);
 const references=value=>value.replace(/url\((['"]?)([^)]*)\1\)/g,(all,quote,url)=>{const hash=url.lastIndexOf('#'),key=hash<0?'':url.slice(hash+1);return ids.has(key)?`url(#${ids.get(key)})`:all;});
 function clone(node){
  if(node.nodeType!==Node.ELEMENT_NODE)return node.cloneNode(false);
  if(['script','style','iframe','object','embed','link','meta','base','source'].includes(node.localName)||node.hasAttribute('data-nutbook-page-id')&&node.dataset.nutbookPageId!==activeId)return null;
  const copy=node instanceof HTMLImageElement?document.createElement('canvas'):node.cloneNode(false);for(const name of copy.getAttributeNames()){if(name.startsWith('data-')||name.startsWith('on')||['contenteditable','autofocus','tabindex'].includes(name))copy.removeAttribute(name);}
  if(node.id)copy.id=ids.get(node.id);for(const name of ['href','xlink:href']){const value=copy.getAttribute(name);if(value?.startsWith('#')&&ids.has(value.slice(1)))copy.setAttribute(name,`#${ids.get(value.slice(1))}`);}
  const style=getComputedStyle(node);for(const key of style)copy.style.setProperty(key,references(style.getPropertyValue(key)),'important');copy.style.setProperty('animation','none','important');copy.style.setProperty('transition','none','important');copy.style.setProperty('pointer-events','none','important');
  if(node instanceof HTMLImageElement){copy.width=node.naturalWidth||1;copy.height=node.naturalHeight||1;if(node.complete&&node.naturalWidth)copy.getContext('2d').drawImage(node,0,0);}else if(node instanceof HTMLCanvasElement){copy.width=node.width;copy.height=node.height;if(node.width&&node.height)copy.getContext('2d').drawImage(node,0,0);}else{for(const child of node.childNodes){const cloned=clone(child);if(cloned)copy.append(cloned);}}
  return copy;
 }
 const copied=clone(root),rect=root.getBoundingClientRect();for(const [key,value]of Object.entries({position:'absolute',inset:'auto',left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`,margin:'0',transform:'none',opacity:'1'}))copied.style.setProperty(key,value,'important');layer.append(copied);
 if(foregroundCanvas){const canvas=document.createElement('canvas');canvas.width=foregroundCanvas.width;canvas.height=foregroundCanvas.height;canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';canvas.getContext('2d').drawImage(foregroundCanvas,0,0);layer.append(canvas);}
 document.documentElement.append(layer);return {layer,dispose(){layer.remove();}};
}
export function renderCurtain(layer,progress,params){
 const p=Math.max(0,Math.min(1,progress)),q=p*p*(3-2*p);layer.style.opacity=p>=1?'0':'1';layer.style.clipPath='none';layer.style.maskImage='none';layer.style.webkitMaskImage='none';if(p<=0||p>=1)return;
 const direction=params.direction,feather=params.feather;
 if(params.shape===1){const cx=direction===0?0:direction===1?innerWidth:innerWidth/2,cy=direction===2?0:direction===3?innerHeight:innerHeight/2,edge=Math.max(innerWidth,innerHeight)*feather,far=Math.hypot(Math.max(cx,innerWidth-cx),Math.max(cy,innerHeight-cy)),radius=(far+2*edge)*q-edge;const value=`radial-gradient(circle at ${cx}px ${cy}px,transparent ${Math.max(0,radius-edge)}px,#000 ${Math.max(0,radius+edge)}px)`;layer.style.maskImage=value;layer.style.webkitMaskImage=value;return;}

 if(feather<=0){const insets=direction===0?`0 0 0 ${q*100}%`:direction===1?`0 ${q*100}% 0 0`:direction===2?`${q*100}% 0 0 0`:`0 0 ${q*100}% 0`;layer.style.clipPath=`inset(${insets})`;return;}
 const angle=[90,270,180,0][direction],edge=feather*100,front=q*(100+2*edge)-edge,value=`linear-gradient(${angle}deg,transparent ${front-edge}%,#000 ${front+edge}%)`;layer.style.maskImage=value;layer.style.webkitMaskImage=value;
}
// A single transaction runs at a time. A newer page intent cancels preparation
// or composition, waits for rollback, then converges on the latest target.
export function createNavigationCoordinator(run){
 let active=null,queued=null,disposed=false;
 function pump(){if(active||!queued||disposed)return;const request=queued;queued=null;const listeners=new Set(),signal={cancelled:false,onCancel(fn){listeners.add(fn);return()=>listeners.delete(fn);},cancel(){if(signal.cancelled)return;signal.cancelled=true;for(const listener of listeners)listener();}};active={request,signal};Promise.resolve().then(()=>run(request.id,request.options,signal)).then(request.resolve,request.reject).finally(()=>{active=null;pump();});}
 return {goTo(id,options={}){if(disposed)return Promise.resolve(false);if(active?.request.id===id&&active.request.options.preview===options.preview&&!active.signal.cancelled)return active.request.promise;if(queued){queued.resolve(false);queued=null;}let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});queued={id,options,resolve,reject,promise};if(active)active.signal.cancel();pump();return promise;},cancel(){if(queued){queued.resolve(false);queued=null;}active?.signal.cancel();},dispose(){disposed=true;this.cancel();},state:()=>({active:active?.request.id||null,queued:queued?.id||null})};
}
