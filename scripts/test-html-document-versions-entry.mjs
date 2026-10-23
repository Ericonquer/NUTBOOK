import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('dist/index.html','utf8');
const extract=name=>{
 const source=html.match(new RegExp(`async function ${name}\\([^]*?\\n      \\}`))?.[0];
 assert.ok(source,name);return source;
};
for(const allow of [true,false]) {
 const calls=[];
 const context=vm.createContext({
  getActiveTab:()=>({id:41,preview:{fileType:'html-runtime'}}),
  confirmHtmlEditLeaveIfNeeded:async id=>{calls.push(['leave',id]);return allow;},
  openSettingsOverlay:async (...args)=>calls.push(args),
 });
 await vm.runInContext(extract('openDocumentVersions')+'\nopenDocumentVersions()',context);
 assert.deepEqual(calls,allow?[['leave',41],['versions','history',41]]:[['leave',41]],'direct history respects save/discard/cancel and targets the current file');
}
let oldClose,hostClosed=0;
const context=vm.createContext({
 appState:{settingsOverlayMode:'history'},
 invoke:async()=>({revision:'baseline'}), normalizeError:String,
 closeSettingsOverlay:()=>hostClosed++,
 NutbookVersions:{open:async ctx=>{oldClose?.();oldClose=ctx.restoreFocus;assert.equal(ctx.target.itemId,41);assert.equal(ctx.allowSaveAs,true);assert.equal(ctx.dirty(),false);assert.equal(await ctx.expectedHash(),'baseline');await ctx.applied({fileHash:'restored'});assert.equal(await ctx.expectedHash(),'restored');}},
});
vm.runInContext('let singleHtmlHistoryEpoch=0;'+extract('openSingleHtmlHistory'),context);
await vm.runInContext('openSingleHtmlHistory(41)',context);
await vm.runInContext('openSingleHtmlHistory(41)',context);
assert.equal(hostClosed,0,'replacing an old preview cannot close the new host');
oldClose();assert.equal(hostClosed,1,'closing the current preview closes the host');
console.log('HTML history direct-file routing and replacement/close ownership passed (VM)');
for (const mode of ['normal','editing-before','editing-during','closed-during']) {
 const tab={id:41,preview:{fileType:'html-runtime'}};
 const state={htmlEditSession:mode==='editing-before'?{itemId:41}:null,runtimePatchAppliedKeys:new Map([[41,'old']])};
 let rendered=0;
 const ctx=vm.createContext({
  appState:state,getOpenTab:()=>tab,
  invoke:async command=>{if(command==='get_item_preview'){if(mode==='editing-during')state.htmlEditSession={itemId:41};if(mode==='closed-during')tab.closed=true;}return {fresh:true};},
  normalizeItemDetail:v=>v,normalizePreview:v=>v,normalizeItemSummary:v=>v,renderTabs:()=>rendered++,
 });
 await vm.runInContext(extract('refreshHtmlHistoryTab')+'\nrefreshHtmlHistoryTab(41)',ctx);
 assert.equal(rendered,mode==='normal'?1:0,'a late restore refresh cannot mutate a reopened editor or closed tab');
 assert.equal(state.runtimePatchAppliedKeys.has(41),mode!=='normal');
}
console.log('HTML restore metadata refresh protects new editing sessions and closed tabs');
