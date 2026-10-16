import assert from 'node:assert/strict';
import {compileTimeline} from '../src/motion/timeline.mjs';
import {stepState,validStepState,nextStepPlan} from '../src/motion/steps.mjs';
const timeline=compileTimeline([{id:'a',targetId:'a',trigger:'click',delayMs:300,params:{durationMs:500}},{id:'b',targetId:'b',trigger:'click',delayMs:0,params:{durationMs:500}}]);
let state=stepState(timeline,'p',0,0,'finished');assert.equal(state.stepId,null);state=nextStepPlan(timeline,state);assert.equal(state.stepIndex,1);assert.equal(state.logicalTimeMs,0);state=nextStepPlan(timeline,state);assert.equal(state.playbackStatus,'finished');assert.equal(state.logicalTimeMs,800);state=nextStepPlan(timeline,state);assert.equal(state.stepIndex,2);state=nextStepPlan(timeline,state);assert.equal(nextStepPlan(timeline,state),null);
assert.ok(validStepState(state,timeline,'p',0));for(const patch of [{pageId:'other'},{motionRevision:1},{stepId:'other'},{stepIndex:99},{logicalTimeMs:Infinity},{backgroundTimeMs:1}])assert.equal(validStepState({...state,...patch},timeline,'p',0),false);
console.log('Step completion, advancement, delayed starts and state identity checks passed');

const background={...stepState(timeline,'p',0,0,'finished'),backgroundTimeMs:1234};assert.equal(validStepState(background,timeline,'p',0,true),true);assert.equal(nextStepPlan(timeline,background).backgroundTimeMs,1234);assert.equal(validStepState({...background,backgroundTimeMs:-1},timeline,'p',0,true),false);

const {controlStepPlan}=await import('../src/motion/steps.mjs');
const live={...stepState(timeline,'p',1,0),logicalTimeMs:450,backgroundTimeMs:1200};
assert.equal(controlStepPlan(timeline,live,'pause').logicalTimeMs,450);
assert.equal(controlStepPlan(timeline,live,'pause').backgroundTimeMs,1200);
assert.equal(controlStepPlan(timeline,{...live,playbackStatus:'paused'},'resume').playbackStatus,'playing');
assert.deepEqual(controlStepPlan(timeline,live,'replay'),stepState(timeline,'p',0,0));
const sought=controlStepPlan(timeline,live,'seek',900);assert.equal(sought.stepIndex,2);assert.equal(sought.logicalTimeMs,900);assert.equal(sought.playbackStatus,'paused');assert.equal(sought.backgroundTimeMs,900);
assert.equal(controlStepPlan(timeline,live,'seek',800).stepIndex,2);
assert.equal(controlStepPlan(timeline,live,'seek',1300).logicalTimeMs,1300);
for(const time of [-1,1301,NaN,Infinity])assert.throws(()=>controlStepPlan(timeline,live,'seek',time));
assert.throws(()=>controlStepPlan(timeline,live,'unknown'));
assert.deepEqual(live,{...stepState(timeline,'p',1,0),logicalTimeMs:450,backgroundTimeMs:1200},'planning cannot mutate live state');
console.log('Pause/resume/replay/absolute seek planning and boundary checks passed');
