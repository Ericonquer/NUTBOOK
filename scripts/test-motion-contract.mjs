import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateConfig, stableJson, effectiveCapabilities } from '../src/motion/contract.mjs';
import { createMotionClock } from '../src/motion/clock.mjs';
const fixture = JSON.parse(readFileSync(new URL('../tests/fixtures/motion/valid.json', import.meta.url)));
assert.equal(validateConfig(fixture), fixture);
const tinted=structuredClone(fixture);tinted.pages[0].actions[0].params.hue=30;validateConfig(tinted);
const empty = structuredClone(fixture); empty.pages[0].actions = []; validateConfig(empty);
for (const mutate of [
  c => c.contract = 'nutbook-motion/v2',
  c => c.code = 'alert(1)',
  c => c.pages.push(structuredClone(c.pages[0])),
  c => c.pages[0].actions[0].targetId = 'missing',
  c => c.pages[0].actions[0].templateId = '__proto__',
  c => c.pages[0].actions[0].templateVersion = 2,
  c => c.pages[0].actions[0].params.durationMs = Infinity,
  c => c.pages[0].actions[0].params.density = 12.5,
  c => c.pages[0].actions[0].params.url = 'file:///secret',
  c => c.pages[0].actions[0].params.hue = -1,
  c => c.pages[0].actions[0].params.hue = 361,
  c => c.pages[0].actions[0].params.hue = null,
  c => c.pages[0].actions.push(structuredClone(c.pages[0].actions[0])),
  c => c.pages[0].capabilities.containsVideo = true,
  c => c.pages[0].targets.push({id:'video-1',kind:'video'}),
  c => delete c.pages[0].transition,
  c => c.pages[0].background = {code:'x'}
]) { const copy = structuredClone(fixture); mutate(copy); assert.throws(() => validateConfig(copy)); }
assert.equal(stableJson({z:1,a:{y:2,x:1}}), stableJson({a:{x:1,y:2},z:1}));
assert.deepEqual(effectiveCapabilities(fixture.pages[0].capabilities, {containsVideo:true,containsEmbeddedFrame:true,supportsDomTransition:false,supportsFilterTransition:true}), {containsVideo:true,containsEmbeddedFrame:true,supportsDomTransition:false,supportsFilterTransition:true});
let time = 0, sequence = 0; const scheduled = new Map(), rendered = [];
const clock = createMotionClock({render:t=>rendered.push(t),now:()=>time,requestFrame:fn=>{scheduled.set(++sequence,fn);return sequence;},cancelFrame:id=>scheduled.delete(id)});
const advance = delta => { time += delta; const callbacks = [...scheduled.values()]; scheduled.clear(); callbacks.forEach(fn=>fn()); };
clock.play(); clock.play(); assert.equal(scheduled.size,1);
advance(16); advance(84); assert.equal(rendered.at(-1),100);
clock.pause(); assert.equal(scheduled.size,0); clock.seek(100); assert.equal(rendered.at(-1),100);
clock.play(); advance(20); const cancelled = [...scheduled.values()][0]; clock.suspend(); advance(60000); assert.equal(clock.state().logicalTimeMs,120);
clock.resume(); cancelled(); assert.equal(scheduled.size,1); advance(10); assert.equal(rendered.at(-1),130);
clock.suspend(); clock.pause(); clock.resume(); assert.equal(scheduled.size,0);
clock.replay(); advance(15); assert.equal(rendered.at(-1),15);
const stale = [...scheduled.values()][0]; clock.dispose(); stale(); assert.equal(scheduled.size,0); assert.equal(clock.play(),false);
assert.throws(()=>clock.seek(NaN));
console.log('Motion contract rejection, capability intersection and clock lifecycle checks passed');
