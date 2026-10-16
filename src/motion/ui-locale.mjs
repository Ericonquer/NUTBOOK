import english from './ui-en.json';
let locale='zh-CN';
const subscribers=new Set(),escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const terms=new RegExp(Object.keys(english).sort((a,b)=>b.length-a.length).map(escape).join('|'),'g');
export const motionUiText=text=>locale.startsWith('en')?String(text).replace(terms,key=>english[key]):String(text);
export function setMotionUiLocale(value){locale=String(value||'zh-CN');for(const refresh of subscribers)refresh();}
// Only caller-owned UI shadows are admitted. Never traverse the document,
// assigned slot content, source attributes, input values, or saved config.
export function localizeMotionUi(root){
 const texts=new WeakMap(),attributes=new WeakMap(),names=['aria-label','title','placeholder'];let disposed=false;
 const skip=node=>node.parentElement?.closest('style,script,[data-i18n-skip]');
 function text(node){if(skip(node))return;let record=texts.get(node);if(!record||node.data!==record.rendered)record={source:node.data};const next=motionUiText(record.source);record.rendered=next;texts.set(node,record);if(node.data!==next)node.data=next;}
 function attribute(element,name){if(element.closest('[data-i18n-skip]')||!element.hasAttribute(name))return;let map=attributes.get(element);if(!map){map=new Map();attributes.set(element,map);}let record=map.get(name),value=element.getAttribute(name);if(!record||value!==record.rendered)record={source:value};const next=motionUiText(record.source);record.rendered=next;map.set(name,record);if(value!==next)element.setAttribute(name,next);}
 function walk(node){if(node.nodeType===3){text(node);return;}if(node.nodeType===1){if(node.matches('style,script,[data-i18n-skip]'))return;for(const name of names)attribute(node,name);}for(const child of node.childNodes)walk(child);}
 const refresh=()=>{if(!disposed)walk(root);};
 const observer=new MutationObserver(records=>{if(disposed)return;for(const record of records){if(record.type==='characterData')text(record.target);else if(record.type==='attributes')attribute(record.target,record.attributeName);else for(const node of record.addedNodes)walk(node);}});
 refresh();observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:names});subscribers.add(refresh);
 return {refresh,dispose(){disposed=true;observer.disconnect();subscribers.delete(refresh);}};
}
