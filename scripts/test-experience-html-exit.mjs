import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('dist/index.html','utf8'),start=source.indexOf('      async function exitHtmlEditMode('),end=source.indexOf('      window.__NUTBOOK_HANDLE_HTML_EDIT_RUNTIME_MESSAGE__',start);
function harness(replaceSession=false){
 const calls=[],state={htmlEditSession:{itemId:7,runtimeSessionId:'old',generation:1,assetRequestEpoch:0},htmlEditSessionGeneration:1,activeTabId:7,activeRuntimeHostId:7,runtimeHostLastBoundsKey:'old',runtimePatchAppliedKeys:new Set([7])};
 const noop=()=>{};
 const context=vm.createContext({appState:state,cancelHtmlEditCleanRevisionWaiter:noop,nextHtmlEditSessionGeneration:()=>++state.htmlEditSessionGeneration,
  invoke:async(command,args)=>{calls.push([command,args]);if(replaceSession&&command==='invalidate_html_edit_session_lease'){state.htmlEditSession={itemId:7,runtimeSessionId:'new',generation:++state.htmlEditSessionGeneration};}return true;},
  resolveHtmlEditLeaveChoice:noop,closeHtmlEditLeaveConfirmOverlay:noop,renderHtmlEditPresentationRail:noop,renderHtmlEditSectionNavigationRail:noop,
  cleanupRuntimeHostSync:()=>calls.push(['invalidate-sync']),hideRuntimeSessionSurfaces:async(id,options)=>calls.push(['hide-surfaces',{id,options}]),scheduleRuntimeHostSync:()=>calls.push(['schedule-sync']),refocusActiveRuntimeHost:noop});
 vm.runInContext(source.slice(start,end)+';globalThis.exit=exitHtmlEditMode;',context);
 return {state,calls,exit:context.exit};
}
for(const discard of [false,true]){
 const h=harness();await h.exit({discard});
 assert.equal(h.state.activeTabId,7,'Done stays on the current document');assert.equal(h.state.htmlEditSession,null);
 const names=h.calls.map(([name])=>name);assert.ok(names.indexOf('invalidate-sync')<names.indexOf('hide-surfaces'));assert.ok(names.indexOf('hide-surfaces')<names.indexOf('schedule-sync'));
 assert.equal(h.state.activeRuntimeHostId,null,'next host sync must recreate the child with host-owned view state');
 assert.equal(h.calls.some(([,args])=>args?.script?.includes('location.reload')),false,'do not reload with stale initialization state');
}
const late=harness(true);await late.exit({discard:false});assert.equal(late.state.htmlEditSession.runtimeSessionId,'new');assert.equal(late.calls.some(([name])=>name==='hide-surfaces'),false,'late exit cannot close a newer editing session');
console.log('HTML Done keeps the document, rebuilds through host lifecycle and ignores stale exits (VM, not native GUI)');
