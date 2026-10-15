import {registry} from './contract.mjs';
import {renderers} from './renderers.mjs';
import {prepareFlowingGradient} from './background.mjs';
import {renderCurtain} from './transition.mjs';
let sequence=0;
// Real adapters, isolated example nodes, and the caller's sole animation clock.
export function prepareTemplatePreview(host,templateId,{slot='template-preview',height=112}={}){
 const template=registry.templates[templateId];if(!template)throw Error('Unknown preview template');
 const key=`nutbook-template-preview-${++sequence}`,surface=document.createElement('div');surface.slot=slot;surface.dataset.nutbookTemplatePreview=templateId;surface.dataset.nutbookRuntimeControl='';surface.style.cssText='position:relative;isolation:isolate;overflow:hidden;height:'+height+'px;margin:0;border-radius:0;background:#f3f3f5;color:#1a1c1d;pointer-events:none;';
 const target=document.createElement('p');target.dataset.id=key;target.textContent=templateId==='text.count-up'?'12,345.67%':'NUTBOOK';target.style.cssText='position:absolute;left:12px;right:12px;top:calc(50% - 14px);margin:0;text-align:center;font:700 17px/1.5 -apple-system,PingFang SC,sans-serif;color:#1a1c1d;';surface.append(target);
 const canvas=document.createElement('canvas');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3';surface.append(canvas);host.append(surface);
 const params=Object.fromEntries(Object.entries(template.params).map(([key,rule])=>[key,rule.default])),action={id:key,targetId:key,templateId,templateVersion:template.version,params,seed:42};if(templateId==='text.true-focus'){params.grouping=1;params.focusIndex=3;params.mode=0;}let adapter,curtain;const rect=surface.getBoundingClientRect(),ctx=canvas.getContext('2d'),dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.ceil(rect.width*dpr);canvas.height=Math.ceil(rect.height*dpr);
 try{
  if(template.category==='background'){surface.dataset.nutbookPageId=key;adapter=prepareFlowingGradient(surface,action,{preview:true});}
  else if(template.category==='transition'){target.textContent='NUTBOOK';surface.style.background='#e2e2e4';curtain=document.createElement('div');curtain.textContent='NUTBOOK';curtain.style.cssText='position:absolute;inset:0;display:grid;place-items:center;background:#f3f3f5;font:700 17px sans-serif;color:#1a1c1d;';surface.append(curtain);}
  else adapter=renderers[templateId](target,action,{viewportHeight:rect.height,preview:true});
  return {templateId,duration:params.durationMs,render(time){ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);ctx.save();ctx.translate(-rect.left,-rect.top);if(curtain)renderCurtain(curtain,Math.min(1,time/params.durationMs),params);else adapter.render(templateId==='text.split-flip'?time<params.durationMs*.24?params.durationMs:(time-params.durationMs*.24)/.76:time,ctx);ctx.restore();},dispose(){adapter?.dispose();surface.remove();}};
 }catch(error){adapter?.dispose();surface.remove();throw error;}
}
