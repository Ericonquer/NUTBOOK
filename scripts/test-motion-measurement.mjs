import assert from 'node:assert/strict';
import {createMotionMeasurement, nearestRank} from '../src/motion/measurement.mjs';
assert.equal(nearestRank([]),null);
assert.equal(nearestRank(Array.from({length:20},(_,i)=>i+1)),19);
let time=0,id=0,background=false;
const frames=new Map();
const metric=createMotionMeasurement({now:()=>time,requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:id=>frames.delete(id),hidden:()=>background,environment:()=>({width:1280,height:720,dpr:1})});
function tick(delta=16){time+=delta;const current=[...frames.values()];frames.clear();for(const fn of current)fn(time);}
const first=metric.start({warmupMs:32,durationMs:100,metadata:{sourceHash:'test'}});
tick();tick();metric.recordRender(2);tick();metric.reset('replay');tick(80);tick();
const report=await first;
assert.deepEqual(report.frameIntervalsMs,[16,16,80,16]);
assert.equal(report.p95FrameIntervalMs,80);assert.equal(report.thresholdMet,false);
assert.equal(report.resetBoundaries.length,1);assert.deepEqual(report.renderCpuMs,[2]);
const latency=metric.latency('hot-param',1);
time+=2;metric.submitted(1);
// Same browser rAF batch timestamp must not complete the latency.
const callback=[...frames.values()][0];frames.clear();callback(time-2);
assert.equal(metric.state().pendingLatencies,1);
tick();assert.equal((await latency).latencyMs,18);
const timeout=metric.latency('cold-apply',2);tick(2001);assert.equal((await timeout).reason,'timeout');
const hiddenRun=metric.start({warmupMs:0,durationMs:100});tick();background=true;tick();
assert.equal((await hiddenRun).valid,false);background=false;
const cancelled=metric.start();const stale=[...frames.values()][0];metric.dispose();stale(time+10000);
assert.equal((await cancelled).invalidReasons[0],'cancelled');assert.equal(frames.size,0);
assert.equal(metric.state().disposed,true);
console.log('Motion measurement: nearest-rank, slow frames, reset boundaries, latency, background and disposal passed');
