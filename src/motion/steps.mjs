export function stepState(timeline,pageId,index,revision,status='playing'){
 const step=timeline.steps[index];if(!step)throw new TypeError('Unknown motion step');
 return {pageId,stepId:step.id,stepIndex:index,playbackStatus:status,logicalTimeMs:status==='finished'?step.endMs:step.startMs,backgroundTimeMs:0,motionRevision:revision};
}
export function validStepState(state,timeline,pageId,revision,hasBackground=false){
 const step=timeline.steps[state?.stepIndex];
 return Boolean(step&&state.pageId===pageId&&state.motionRevision===revision&&state.stepId===step.id&&['static','playing','paused','finished'].includes(state.playbackStatus)&&Number.isFinite(state.logicalTimeMs)&&state.logicalTimeMs>=step.startMs&&state.logicalTimeMs<=step.endMs&&(hasBackground?Number.isFinite(state.backgroundTimeMs)&&state.backgroundTimeMs>=0:state.backgroundTimeMs===0)&&(state.playbackStatus!=='finished'||state.logicalTimeMs===step.endMs));
}
export function nextStepPlan(timeline,state){
 if(state.playbackStatus==='playing'||state.playbackStatus==='paused'&&state.logicalTimeMs<timeline.steps[state.stepIndex].endMs)return {...stepState(timeline,state.pageId,state.stepIndex,state.motionRevision,'finished'),backgroundTimeMs:state.backgroundTimeMs};
 if(state.stepIndex+1>=timeline.steps.length)return null;
 return {...stepState(timeline,state.pageId,state.stepIndex+1,state.motionRevision),backgroundTimeMs:state.backgroundTimeMs};
}

// Explicit playback controls produce plans; callers apply them only after authority accepts.
export function controlStepPlan(timeline,state,action,timeMs){
 if(!validStepState(state,timeline,state.pageId,state.motionRevision,true))throw new TypeError('Invalid motion state');
 if(action==='pause')return {...state,playbackStatus:'paused'};
 if(action==='resume'){const step=timeline.steps[state.stepIndex];return {...state,playbackStatus:state.logicalTimeMs<step.endMs?'playing':'finished'};}
 if(action==='replay')return stepState(timeline,state.pageId,0,state.motionRevision);
 if(action!=='seek'||!Number.isFinite(timeMs)||timeMs<0||timeMs>timeline.steps.at(-1).endMs)throw new TypeError('Invalid motion control');
 // At shared boundaries choose the later group, so its first frame is visible.
 let index=0;for(let i=0;i<timeline.steps.length;i++)if(timeline.steps[i].startMs<=timeMs)index=i;
 return {...stepState(timeline,state.pageId,index,state.motionRevision,'paused'),logicalTimeMs:timeMs,backgroundTimeMs:timeMs};
}
