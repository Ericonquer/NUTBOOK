let copySequence=0;
const clamp=value=>Math.max(0,Math.min(1,value));
function cloneSurface(source){
 const copy=source.cloneNode(true),canvases=copy.querySelectorAll('canvas');source.querySelectorAll('canvas').forEach((canvas,i)=>{canvases[i].width=canvas.width;canvases[i].height=canvas.height;if(canvas.width&&canvas.height)canvases[i].getContext('2d').drawImage(canvas,0,0);});
 const ids=new Map(),prefix=`slice-${++copySequence}-`;for(const node of [copy,...copy.querySelectorAll('[id]')])if(node.id){ids.set(node.id,prefix+node.id);node.id=prefix+node.id;}
 for(const node of [copy,...copy.querySelectorAll('*')])for(const attribute of [...node.attributes]){let value=attribute.value;for(const [oldId,newId]of ids){if(['href','xlink:href'].includes(attribute.name)&&value==='#'+oldId)value='#'+newId;value=value.replaceAll('url(#'+oldId+')','url(#'+newId+')').replaceAll('url("#'+oldId+'")','url("#'+newId+'")');}if(value!==attribute.value)node.setAttribute(attribute.name,value);}
 return copy;
}
export function renderLayeredSlices(layer,state,p,params){
 const vertical=params.direction>=2,key=`${params.slices}:${vertical}`;
 if(state.sliceKey!==key){state.slices?.forEach(s=>s.frame.remove());state.sliceKey=key;state.slices=[];state.stage.style.transform='none';
  for(let i=0;i<params.slices;i++){
   const frame=document.createElement('div'),front=document.createElement('div'),back=document.createElement('div'),frontContent=cloneSurface(state.front),backContent=cloneSurface(state.back),a=i/params.slices*100,b=(1-(i+1)/params.slices)*100;
   frame.dataset.nutbookTransitionSlice='';frame.style.cssText='position:absolute;inset:0;pointer-events:none;';frame.style.clipPath=vertical?`inset(-1px ${b}% -1px ${a}%)`:`inset(${a}% -1px ${b}% -1px)`;
   for(const [face,content,source]of [[front,frontContent,state.front],[back,backContent,state.back]]){face.style.cssText='position:absolute;inset:0;pointer-events:none';face.style.backgroundColor=source.style.backgroundColor;content.style.visibility='visible';face.append(content);}frame.append(front,back);state.stage.append(frame);state.slices.push({frame,front,back,frontContent,backContent});
  }
 }
 state.front.style.visibility=state.back.style.visibility='hidden';
 const sign=params.direction%2?-1:1,extent=vertical?layer.clientHeight:layer.clientWidth;
 for(const [i,{front,back,frontContent,backContent}]of state.slices.entries()){
  const delay=params.stagger*(i/(params.slices-1)),u=clamp((p-delay)/(1-params.stagger)),q=u*u*u*(u*(u*6-15)+10),travel=clamp(q+params.offset*Math.sin(Math.PI*q)*(i/(params.slices-1)-.5));
  for(const face of [front,back]){face.style.visibility='visible';face.style.opacity='1';}
  // Move entire opaque slices; both faces meet at one shared edge.
  // A reveal mask with tiny content drift reads as a wipe, not layered motion.
  frontContent.style.transform=backContent.style.transform='none';
  front.style.transform=`translate${vertical?'Y':'X'}(${-sign*extent*travel}px)`;
  back.style.transform=`translate${vertical?'Y':'X'}(${sign*extent*(1-travel)}px)`;
  front.style.maskImage=front.style.webkitMaskImage=back.style.maskImage=back.style.webkitMaskImage='none';
  const shade=Math.sin(Math.PI*u),blur=Math.min(36,Math.max(6,extent*params.feather));
  back.style.boxShadow=`${vertical?'0 '+(-sign*blur*.4)+'px':(-sign*blur*.4)+'px 0'} ${blur}px ${-blur*.45}px rgba(0,0,0,${.22*shade})`;
  front.style.filter=`brightness(${1-.035*shade})`;back.style.filter=`brightness(${1-.025*shade})`;
  if(u<=0){front.style.opacity='1';back.style.opacity='0';front.style.maskImage=front.style.webkitMaskImage='none';}
  if(u>=1){front.style.opacity='0';back.style.opacity='1';back.style.maskImage=back.style.webkitMaskImage='none';}
 }
 layer.style.opacity=p>=1?'0':'1';
}
