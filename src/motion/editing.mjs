// Document mutations stay pure so a bulk edit is one existing history transaction.
import {registry,templateSlot} from './contract.mjs';
export function compatibleTargets(page,ids,template){const selected=new Set(ids);return page.targets.filter(target=>selected.has(target.id)&&template.targets.includes(target.kind));}
export function selectedTextTargets(page,ids){return compatibleTargets(page,ids,{targets:['text']});}
export function applyTemplate(config,pageId,ids,templateId,makeId,rememberedParams){
 const template=registry.templates[templateId];if(!template)throw new TypeError('Unknown template');
 const next=structuredClone(config),page=next.pages.find(page=>page.id===pageId),compatible=compatibleTargets(page,ids,template);
 for(const target of compatible){
  const params=structuredClone(rememberedParams||Object.fromEntries(Object.entries(template.params).map(([key,rule])=>[key,rule.default])));
  const existing=page.actions.find(action=>action.targetId===target.id&&templateSlot(registry.templates[action.templateId])===templateSlot(template));
  if(existing){existing.templateId=templateId;existing.templateVersion=template.version;existing.params=params;continue;}
  page.actions.push({id:makeId(target.id),targetId:target.id,templateId,templateVersion:template.version,params,seed:42,trigger:'click',delayMs:0});
 }
 return {config:next,applied:compatible.length,skipped:ids.length-compatible.length};
}
export function applyTextTemplate(config,pageId,ids,template,makeId){return applyTemplate(config,pageId,ids,'text.glyph-particles',makeId);}
export function changeSelectedActions(config,pageId,ids,change,category){
 const next=structuredClone(config),page=next.pages.find(page=>page.id===pageId),selected=new Set(ids);
 for(const action of page.actions)if(selected.has(action.targetId)&&(!category||registry.templates[action.templateId].category===category))change(action);
 return next;
}

export function applyPageTemplate(config,pageId,templateId,makeId,rememberedParams){
 const template=registry.templates[templateId];if(!template||!['background','transition'].includes(template.category))throw new TypeError('Unsupported page template');
 const next=structuredClone(config),page=next.pages.find(page=>page.id===pageId),params=structuredClone(rememberedParams||Object.fromEntries(Object.entries(template.params).map(([key,rule])=>[key,rule.default])));
 page[template.category]={id:page[template.category]?.id||makeId(),templateId,templateVersion:template.version,params,seed:page[template.category]?.seed??42};return {config:next,applied:1,skipped:0};
}
