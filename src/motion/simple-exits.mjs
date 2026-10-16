import {createProjection} from './projection.mjs';
export function prepareSimpleExit(element,action){
 const projection=createProjection(element),params=action.params;
 return {hide(){projection.set({});},render(time){const p=Math.max(0,Math.min(1,time/params.durationMs)),q=p*p*(3-2*p);
  if(p<=0){projection.set({});return;}
  if(p>=1){projection.set({opacity:0});return;}
  if(action.templateId==='exit.blur-away')projection.set({opacity:1-q,filter:`blur(${params.blur*q}px)`});
  else if(action.templateId==='exit.directional-wipe'){
   const edge=-8+108*q,directions=['to right','to left','to bottom','to top'];projection.set({maskImage:`linear-gradient(${directions[params.direction]},transparent ${edge}%,#000 ${edge+8}%)`});
  }else if(action.templateId==='exit.depth-away')projection.set({opacity:1-q*q,transform:`perspective(1000px) translateZ(${-params.depth*q}px)`});
  else throw Error('Unsupported exit template');
 },dispose(){projection.dispose();}};
}
