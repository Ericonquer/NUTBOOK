import assert from 'node:assert/strict';
import {createPreparationGate} from '../src/motion/preparation.mjs';
let time=0,id=0;const timers=new Map(),events=[];
const gate=createPreparationGate({now:()=>time,setTimer:(fn,delay)=>{timers.set(++id,{fn,at:time+delay});return id;},clearTimer:id=>timers.delete(id),status:(...event)=>events.push(event)});
function tick(delta){time+=delta;for(const [id,timer] of [...timers])if(timer.at<=time){timers.delete(id);timer.fn();}}
let release,built=0;
const never=new Promise(resolve=>release=resolve);
const cancelled=gate.run(never,()=>{built++;return [];});tick(200);assert.equal(events.at(-1)[0],'progress');gate.cancel();assert.equal(await cancelled,null);release();await Promise.resolve();assert.equal(built,0);assert.equal(timers.size,0);
const timeout=gate.run(new Promise(()=>{}),()=>{built++;return [];});tick(2000);assert.equal(await timeout,null);assert.equal(events.at(-1)[0],'timeout');assert.equal(timers.size,0);
let disposed=0;
const late=await gate.run(Promise.resolve(),()=>{time+=2001;return [{adapter:{dispose(){disposed++;}}}];});assert.equal(late,null);assert.equal(disposed,1);
const superseded=gate.run(new Promise(()=>{}),()=>[]);const replacement=gate.run(Promise.resolve(),()=>[]);assert.equal(await superseded,null);assert.deepEqual(await replacement,[]);assert.equal(gate.state().pending,false);
const rejected=await gate.run(Promise.reject(new Error('resource failed')),()=>[]);assert.equal(rejected,null);assert.equal(events.at(-1)[0],'error');assert.equal(timers.size,0);
console.log('Preparation deadlines, immediate cancellation, supersession, rejection and late cleanup passed');
