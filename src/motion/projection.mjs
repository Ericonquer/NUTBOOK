// One temporary style per semantic target; multiple adapters compose without
// rewriting source attributes or overwriting one another's terminal state.
const targets=new WeakMap();
export function createProjection(element){
 let target=targets.get(element);
 if(!target){const style=document.createElement('style');if(element.closest('[data-nutbook-template-preview]'))style.dataset.nutbookTemplateProjection='';else style.dataset.nutbookMotionProjection='';document.head.append(style);target={style,baseTransform:getComputedStyle(element).transform,parts:new Map()};targets.set(element,target);}
 const token={};target.parts.set(token,{});let disposed=false;
 const flush=()=>{const parts=[...target.parts.values()],opacity=Math.min(1,...parts.map(part=>part.opacity??1)),transforms=parts.map(part=>part.transform).filter(Boolean),filters=parts.map(part=>part.filter).filter(Boolean),clips=parts.map(part=>part.clipPath).filter(Boolean);const masks=parts.map(part=>part.maskImage).filter(Boolean);const declarations=[];if(opacity<1)declarations.push(`opacity:${Math.max(0,opacity)}!important`);if(transforms.length)declarations.push(`transform:${target.baseTransform==='none'?'':target.baseTransform+' '}${transforms.join(' ')}!important`);if(filters.length)declarations.push(`filter:${filters.join(' ')}!important`);if(clips.length)declarations.push(`clip-path:${clips.at(-1)}!important`);if(masks.length)declarations.push(`-webkit-mask-image:${masks.at(-1)}!important;mask-image:${masks.at(-1)}!important`);target.style.textContent=declarations.length?`[data-id="${element.dataset.id}"]{${declarations.join(';')}}`:'';};
 return {set(part={}){if(disposed)return;target.parts.set(token,part);flush();},dispose(){if(disposed)return;disposed=true;target.parts.delete(token);if(target.parts.size)flush();else{target.style.remove();targets.delete(element);}}};
}
