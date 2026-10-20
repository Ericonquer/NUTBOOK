import {renderLayeredSlices} from './layered-slices.mjs';
import {effectiveCapabilities} from './contract.mjs';
let snapshotSequence=0;
export function probeTransitionPage(page,element){
 const media=[...element.querySelectorAll('video')],frames=[...element.querySelectorAll('iframe')];
 return effectiveCapabilities(page.capabilities,{containsVideo:media.length>0,containsEmbeddedFrame:frames.length>0,supportsDomTransition:!element.querySelector('object,embed,svg image,svg foreignObject')&&![element,...element.querySelectorAll('*')].some(node=>node.shadowRoot),supportsFilterTransition:typeof CSS!=='undefined'&&CSS.supports('filter','blur(1px)')});
}
export function canSnapshotTransition(from,to,fromElement,toElement,templateId=from.transition?.templateId){if(!fromElement||!toElement)return false;const a=probeTransitionPage(from,fromElement),b=probeTransitionPage(to,toElement);return (CSS.supports('mask-image','linear-gradient(90deg,transparent,#000)')||CSS.supports('-webkit-mask-image','linear-gradient(90deg,transparent,#000)'))&&(templateId!=='transition.depth-travel'||a.supportsFilterTransition&&b.supportsFilterTransition)&&a.supportsDomTransition&&b.supportsDomTransition&&!a.containsVideo&&!b.containsVideo&&!a.containsEmbeddedFrame&&!b.containsEmbeddedFrame;}
export function freezePage(element,foregroundCanvas){
 const layer=document.createElement('div');layer.dataset.nutbookMotionTransition='';layer.setAttribute('aria-hidden','true');layer.inert=true;
 const body=getComputedStyle(document.body);layer.style.cssText='position:fixed;inset:0;z-index:2147483600;pointer-events:none;overflow:hidden;';layer.style.backgroundColor=body.backgroundColor;layer.style.backgroundImage=body.backgroundImage;
 const root=element.parentElement?.classList.contains('deck')?element.parentElement:element,activeId=element.dataset.nutbookPageId,prefix=`nutbook-transition-${++snapshotSequence}-`,ids=new Map([...root.querySelectorAll('[id]')].map((node,index)=>[node.id,`${prefix}${index}`]));if(root.id)ids.set(root.id,`${prefix}root`);
 const references=value=>value.replace(/url\((['"]?)([^)]*)\1\)/g,(all,quote,url)=>{const hash=url.lastIndexOf('#'),key=hash<0?'':url.slice(hash+1);return ids.has(key)?`url(#${ids.get(key)})`:all;});
 function clone(node){
  if(node.nodeType!==Node.ELEMENT_NODE)return node.cloneNode(false);
  if(['script','style','iframe','object','embed','link','meta','base','source'].includes(node.localName)||node.hasAttribute('data-nutbook-page-id')&&node.dataset.nutbookPageId!==activeId)return null;
  const copy=node instanceof HTMLImageElement?document.createElement('canvas'):node.cloneNode(false);for(const name of copy.getAttributeNames()){if(name.startsWith('data-')||name.startsWith('on')||['contenteditable','autofocus','tabindex'].includes(name))copy.removeAttribute(name);}
  if(node.matches('h1,h2,h3,p,img,[data-nutbook-fold-layer]')&&!node.parentElement?.closest('h1,h2,h3,p'))copy.dataset.nutbookTransitionDepth='';
  if(node.id)copy.id=ids.get(node.id);for(const name of ['href','xlink:href']){const value=copy.getAttribute(name);if(value?.startsWith('#')&&ids.has(value.slice(1)))copy.setAttribute(name,`#${ids.get(value.slice(1))}`);}
  const style=getComputedStyle(node);for(const key of style)copy.style.setProperty(key,references(style.getPropertyValue(key)),'important');copy.style.setProperty('animation','none','important');copy.style.setProperty('transition','none','important');copy.style.setProperty('pointer-events','none','important');
  if(node instanceof HTMLImageElement){
   const width=Math.max(1,node.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)),height=Math.max(1,node.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)),dpr=Math.min(2,devicePixelRatio||1);
   copy.width=Math.ceil(width*dpr);copy.height=Math.ceil(height*dpr);
   if(node.complete&&node.naturalWidth){const ctx=copy.getContext('2d');ctx.scale(dpr,dpr);let w=width,h=height;const fit=style.objectFit;
    if(['contain','cover','scale-down','none'].includes(fit)){const scale=fit==='none'?1:fit==='cover'?Math.max(width/node.naturalWidth,height/node.naturalHeight):Math.min(fit==='scale-down'?1:Infinity,width/node.naturalWidth,height/node.naturalHeight);w=node.naturalWidth*scale;h=node.naturalHeight*scale;}
    const pos=style.objectPosition.split(' ').map(v=>parseFloat(v)/100);ctx.drawImage(node,(width-w)*(Number.isFinite(pos[0])?pos[0]:.5),(height-h)*(Number.isFinite(pos[1])?pos[1]:.5),w,h);
   }
  }else if(node instanceof HTMLCanvasElement){copy.width=node.width;copy.height=node.height;if(node.width&&node.height)copy.getContext('2d').drawImage(node,0,0);}else{for(const child of node.childNodes){const cloned=clone(child);if(cloned)copy.append(cloned);}}
  return copy;
 }
 // Keep layout in author pixels and carry the axis-aligned canvas scale into
 // the viewport projection, including scale inherited from an unnamed ancestor.
 const copied=clone(root),rect=root.getBoundingClientRect();for(const [key,value]of Object.entries({position:'absolute',inset:'auto',left:`${rect.left}px`,top:`${rect.top}px`,width:`${root.offsetWidth}px`,height:`${root.offsetHeight}px`,'box-sizing':'border-box',margin:'0','transform-origin':'0 0',transform:`scale(${rect.width/root.offsetWidth},${rect.height/root.offsetHeight})`,opacity:'1'}))copied.style.setProperty(key,value,'important');layer.append(copied);
 if(foregroundCanvas){const canvas=document.createElement('canvas');canvas.width=foregroundCanvas.width;canvas.height=foregroundCanvas.height;canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';canvas.getContext('2d').drawImage(foregroundCanvas,0,0);canvas.dataset.nutbookTransitionDepth='';layer.append(canvas);}
 // Fixed DOM projections live outside the authored page; freeze their complete
 // surfaces too, then suspend originals until rollback renders or disposal.
 for(const surface of document.querySelectorAll('[data-nutbook-fold-layer]'))if(!surface.hidden&&surface.dataset.nutbookFoldPage===activeId){const frozen=clone(surface);if(frozen)layer.append(frozen);surface.style.visibility='hidden';}
 document.documentElement.append(layer);return {layer,dispose(){layer.remove();}};
}
export function renderCurtain(layer,progress,params){
 const p=Math.max(0,Math.min(1,progress)),q=p*p*(3-2*p);layer.style.opacity=p>=1?'0':'1';layer.style.clipPath='none';layer.style.maskImage='none';layer.style.webkitMaskImage='none';if(p<=0||p>=1)return;
 const direction=params.direction,feather=params.feather;
 if(params.shape===1){const cx=direction===0?0:direction===1?innerWidth:innerWidth/2,cy=direction===2?0:direction===3?innerHeight:innerHeight/2,edge=Math.max(innerWidth,innerHeight)*feather,far=Math.hypot(Math.max(cx,innerWidth-cx),Math.max(cy,innerHeight-cy)),radius=(far+2*edge)*q-edge;const value=`radial-gradient(circle at ${cx}px ${cy}px,transparent ${Math.max(0,radius-edge)}px,#000 ${Math.max(0,radius+edge)}px)`;layer.style.maskImage=value;layer.style.webkitMaskImage=value;return;}

 if(feather<=0){const insets=direction===0?`0 0 0 ${q*100}%`:direction===1?`0 ${q*100}% 0 0`:direction===2?`${q*100}% 0 0 0`:`0 0 ${q*100}% 0`;layer.style.clipPath=`inset(${insets})`;return;}
 const angle=[90,270,180,0][direction],edge=feather*100,front=q*(100+2*edge)-edge,value=`linear-gradient(${angle}deg,transparent ${front-edge}%,#000 ${front+edge}%)`;layer.style.maskImage=value;layer.style.webkitMaskImage=value;
}

// Two frozen faces share the existing navigation transaction and clock.
export const pairedTransitionIds=new Set(['transition.smooth-push','transition.cube-rotate','transition.page-flip','transition.layered-slices']);
const pairedScenes=new WeakMap();
export function attachTransitionTarget(layer,target){
 const stage=document.createElement('div'),front=document.createElement('div'),back=document.createElement('div');
 stage.style.cssText='position:absolute;inset:0;transform-style:preserve-3d;pointer-events:none';
 for(const [face,source]of [[front,layer],[back,target]]){
  face.style.cssText='position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;pointer-events:none;';
  face.style.backgroundColor=source.style.backgroundColor;face.style.backgroundImage=source.style.backgroundImage;
  while(source.firstChild)face.append(source.firstChild);
 }
 front.dataset.nutbookTransitionFace='outgoing';back.dataset.nutbookTransitionFace='incoming';stage.append(front,back);layer.append(stage);pairedScenes.set(layer,{stage,front,back});
}
function renderPairedTransition(layer,p,effect){
 const state=pairedScenes.get(layer);if(!state)throw Error('Paired transition requires destination snapshot');
 if(effect.templateId==='transition.layered-slices')return renderLayeredSlices(layer,state,p,effect.params);
 const {stage,front,back}=state,q=p*p*(3-2*p),direction=effect.params.direction,vertical=direction>=2,sign=direction%2?-1:1,extent=vertical?layer.clientHeight:layer.clientWidth;
 layer.style.opacity='1';layer.style.transform='none';layer.style.filter='none';layer.style.clipPath='none';
 layer.style.maskImage=layer.style.webkitMaskImage='none';front.style.opacity=back.style.opacity='1';front.style.filter=back.style.filter='none';
 if(effect.templateId==='transition.smooth-push'){
  stage.style.transform='none';front.style.transform=`translate${vertical?'Y':'X'}(${-sign*extent*q}px)`;back.style.transform=`translate${vertical?'Y':'X'}(${sign*extent*(1-q)}px)`;
 }else{
  const axis=vertical?'X':'Y',end=(vertical?1:-1)*sign*(effect.templateId==='transition.cube-rotate'?90:180),radius=effect.templateId==='transition.cube-rotate'?extent/2:0,perspective=Math.max(layer.clientWidth,layer.clientHeight)*effect.params.perspective;
  stage.style.transform=`perspective(${perspective}px) translateZ(${-radius}px) rotate${axis}(${end*q}deg)`;
  front.style.transform=`translateZ(${radius}px)`;back.style.transform=`rotate${axis}(${-end}deg) translateZ(${radius}px)`;
  front.style.filter=`brightness(${1-.18*Math.sin(q*Math.PI/2)})`;back.style.filter=`brightness(${.82+.18*Math.sin(q*Math.PI/2)})`;
 }
 // Exact endpoints avoid a residual backface/seam in WebKit.
 if(p<=0){front.style.opacity='1';back.style.opacity='0';}
 if(p>=1){layer.style.opacity='0';}
}

// Frozen surfaces only: no authored node or private animation clock is touched.
const sceneStates=new WeakMap();
export function renderPageTransition(layer,progress,effect){
 if(pairedTransitionIds.has(effect.templateId))return renderPairedTransition(layer,Math.max(0,Math.min(1,progress)),effect);
 if(effect.templateId==='transition.curtain-reveal')return renderCurtain(layer,progress,effect.params);
 const p=Math.max(0,Math.min(1,progress)),q=p*p*(3-2*p),params=effect.params;
 let state=sceneStates.get(layer);
 if(!state){const targets=[...layer.querySelectorAll('[data-nutbook-transition-depth]')].map(node=>({node,transform:node.style.transform==='none'?'':node.style.transform}));state={targets};sceneStates.set(layer,state);}
 layer.style.opacity=p>=1?'0':'1';layer.style.transform='none';layer.style.filter='none';layer.style.clipPath='none';layer.style.maskImage='none';layer.style.webkitMaskImage='none';
 for(const {node,transform}of state.targets)node.style.setProperty('transform',transform||'none','important');
 if(p<=0||p>=1)return;
 const direction=params.direction??0,sign=direction===0||direction===2?-1:1,vertical=direction>=2;
 if(effect.templateId==='transition.parallax'){
  const distance=(vertical?layer.clientHeight:layer.clientWidth)*q,move=sign*distance,dpr=devicePixelRatio||1,snap=value=>Math.round(value*dpr)/dpr;
  layer.style.transform=`translate${vertical?'Y':'X'}(${snap(move*(1-params.depth*.5))}px)`;
  for(const {node,transform}of state.targets)node.style.setProperty('transform',`${transform} translate${vertical?'Y':'X'}(${snap(move*params.depth)}px)`,'important');
  layer.style.opacity=String(1-Math.max(0,(q-.65)/.35));
 }else if(effect.templateId==='transition.depth-travel'){
  const scale=1+q*params.depth*(direction%2?-1:1);
  layer.style.transform=`scale(${scale})`;layer.style.filter=`blur(${params.blur*q}px)`;layer.style.opacity=String(1-q);
 }else if(effect.templateId==='transition.grain-dissolve'){
  // A direct vector clip has no per-frame image decode/load boundary in WKWebView.
  const width=layer.clientWidth,height=layer.clientHeight,cols=params.grain,rows=Math.min(128,Math.max(5,Math.round(cols*height/Math.max(1,width)))),key=[width,height,cols,rows,direction,effect.seed].join(':');
  if(state.grainKey!==key){state.grainKey=key;state.grains=[];const w=width/cols,h=height/rows;
   for(let y=0;y<rows;y++){const row=[];for(let x=0;x<cols;x++){
    let n=(Math.imul(x+1,374761393)^Math.imul(y+1,668265263)^(effect.seed>>>0))>>>0;n=Math.imul(n^(n>>>13),1274126177)>>>0;const noise=((n^(n>>>16))>>>0)/4294967296;
    const along=vertical?(y+.5)/rows:(x+.5)/cols,front=direction%2?1-along:along;
    row.push({x:x*w,y:y*h,w,h,threshold:.18+front*.42+noise*.22});
   }state.grains.push(row);}
  }
  const paths=[],number=v=>Math.round(v*10)/10,rect=(x,y,w,h)=>paths.push(`M${number(x)} ${number(y)}h${number(w)}v${number(h)}h${number(-w)}Z`);
  for(const row of state.grains){let run=null;
   const flush=()=>{if(run){rect(run.x,run.y,run.w+.15,run.h+.15);run=null;}};
   for(const cell of row){const area=Math.max(0,Math.min(1,(cell.threshold-q)/.18));
    if(area>=1){if(run)run.w+=cell.w;else run={...cell};continue;}
    flush();if(area>0){const scale=Math.sqrt(area),w=cell.w*scale,h=cell.h*scale;rect(cell.x+(cell.w-w)/2,cell.y+(cell.h-h)/2,w,h);}
   }flush();
  }
  layer.style.clipPath=`path("${paths.join('')||'M0 0Z'}")`;

 }else throw Error('Unsupported page transition: '+effect.templateId);
}

// A single transaction runs at a time. A newer page intent cancels preparation
// or composition, waits for rollback, then converges on the latest target.
export function createNavigationCoordinator(run){
 let active=null,queued=null,disposed=false;
 function pump(){if(active||!queued||disposed)return;const request=queued;queued=null;const listeners=new Set(),signal={cancelled:false,onCancel(fn){listeners.add(fn);return()=>listeners.delete(fn);},cancel(){if(signal.cancelled)return;signal.cancelled=true;for(const listener of listeners)listener();}};active={request,signal};Promise.resolve().then(()=>run(request.id,request.options,signal)).then(request.resolve,request.reject).finally(()=>{active=null;pump();});}
 return {goTo(id,options={}){if(disposed)return Promise.resolve(false);if(active?.request.id===id&&active.request.options.preview===options.preview&&!active.signal.cancelled)return active.request.promise;if(queued){queued.resolve(false);queued=null;}let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});queued={id,options,resolve,reject,promise};if(active)active.signal.cancel();pump();return promise;},cancel(){if(queued){queued.resolve(false);queued=null;}active?.signal.cancel();},dispose(){disposed=true;this.cancel();},state:()=>({active:active?.request.id||null,queued:queued?.id||null})};
}
