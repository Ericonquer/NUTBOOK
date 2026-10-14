// Ordered actions have no arbitrary references, so dependencies cannot cycle.
// Preview flattens click groups; each click group begins after the preceding
// group has completed. Runtime step navigation is a separate native contract.
export function compileTimeline(actions) {
  const entries=[],steps=[{id:null,index:0,startMs:0,endMs:0,actionIds:[]}];let previous=null,step=steps[0],total=0;
  for(const action of actions){
    const duration=action.params.durationMs,delay=action.delayMs;
    if(!['click','withPrevious','afterPrevious'].includes(action.trigger)||!Number.isFinite(duration)||duration<=0||!Number.isFinite(delay)||delay<0||delay>60000)throw new TypeError('Invalid action timing');
    if(action.trigger==='click'){
      step={id:action.trigger==='click'?action.id:null,index:steps.length,startMs:total,endMs:total,actionIds:[]};steps.push(step);previous=null;
    }
    const anchor=previous?(action.trigger==='withPrevious'?previous.startMs:previous.endMs):step.startMs;
    const entry={id:action.id,targetId:action.targetId,startMs:anchor+delay,endMs:anchor+delay+duration,stepIndex:step.index};
    entries.push(entry);step.actionIds.push(action.id);step.endMs=Math.max(step.endMs,entry.endMs);total=Math.max(total,entry.endMs);previous=entry;
  }
  const events=entries.flatMap(entry=>[[entry.startMs,1],[entry.endMs,-1]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  let live=0,peakConcurrency=0;for(const [,delta]of events){live+=delta;peakConcurrency=Math.max(peakConcurrency,live);}
  return {entries,steps,durationMs:total,peakConcurrency};
}
export function setActionTiming(config,pageId,actionId,change){
  const next=structuredClone(config),action=next.pages.find(page=>page.id===pageId)?.actions.find(action=>action.id===actionId);
  if(!action)throw new TypeError('Action no longer exists');
  if(Object.hasOwn(change,'trigger')){if(!['click','withPrevious','afterPrevious'].includes(change.trigger))throw new TypeError('Invalid trigger');action.trigger=change.trigger;}
  if(Object.hasOwn(change,'delayMs')){if(!Number.isFinite(change.delayMs)||change.delayMs<0||change.delayMs>60000)throw new TypeError('Invalid delay');action.delayMs=change.delayMs;}
  return next;
}
export function moveAction(config,pageId,actionId,direction){
  if(direction!==-1&&direction!==1)throw new TypeError('Invalid move');
  const next=structuredClone(config),actions=next.pages.find(page=>page.id===pageId)?.actions;
  if(!actions)throw new TypeError('Page no longer exists');
  const index=actions.findIndex(action=>action.id===actionId),to=index+direction;
  if(index<0)throw new TypeError('Action no longer exists');
  if(to<0||to>=actions.length)return next;
  [actions[index],actions[to]]=[actions[to],actions[index]];return next;
}
