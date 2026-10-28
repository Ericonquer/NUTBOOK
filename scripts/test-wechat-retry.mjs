import assert from 'node:assert/strict';
import {deliverWechatWithRetry} from './wechat/retry-delivery.mjs';
for(const kind of ['same','changed','unknown','network','deleted']){
 let calls=0,archives=0,written;
 const options={journal:{stage:'saved',editUrl:'known',failedObservation:'old'},checkpoint:async x=>written=x,archive:async()=>archives++};
 const deps={observe:async()=>kind==='same'?'old':'new',deliver:async o=>{
  calls++;if(calls===2){assert.equal(o.journal,null);return {verified:true};}
  throw Error(kind==='network'?'NETWORK_ERROR':kind==='deleted'?'DRAFT_UNAVAILABLE':'DRAFT_CONTENT_MISMATCH');
 }};
 if(kind==='unknown')delete options.journal.failedObservation;
 if(['same','deleted'].includes(kind)){assert.equal((await deliverWechatWithRetry(options,deps)).verified,true);assert.equal(archives,1);assert.equal(calls,2);}
 else {await assert.rejects(deliverWechatWithRetry(options,deps),kind==='changed'?/DRAFT_CHANGED/:kind==='network'?/NETWORK_ERROR/:/DRAFT_CONTENT_MISMATCH/);assert.equal(archives,0);assert.equal(calls,1);}
 if(kind==='unknown')assert.equal(written.failedObservation,'new');
 if(kind==='changed')assert.equal(written,undefined,'changed content must not become an automatic-recovery baseline');
}
console.log('Retry: unchanged/removed drafts recover once; changed, unknown and network states preserve original.');
