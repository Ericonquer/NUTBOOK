import assert from 'node:assert/strict';
const {validateWeiboResume,readWeiboUpload,captureWeiboJson,deliverWeiboDraft}=await import(process.env.NUTBOOK_TEST_WEIBO_ADAPTER || './wechat/weibo-delivery.mjs');
const digest='snapshot';
validateWeiboResume({digest,stage:'verified',editUrl:'https://card.weibo.com/article/v5/editor#/draft/123'},digest);
for(const editUrl of ['https://example.com/article/v5/editor#/draft/1','https://card.weibo.com/article/v5/editor#/publish/1','https://card.weibo.com/article/v5/editor#/draft/../1'])assert.throws(()=>validateWeiboResume({digest,stage:'saved',editUrl},digest),/INVALID_CHECKPOINT_URL/);
assert.throws(()=>validateWeiboResume({digest,stage:'creating'},digest),/AMBIGUOUS_CREATE/);
assert.throws(()=>validateWeiboResume({digest:'changed'},digest),/JOB_CONTENT_CHANGED/);
assert.equal(readWeiboUpload({code:'A00006',data:{pics:{pic_1:{ret:1,pid:'abc123'}}}}),'abc123');
assert.throws(()=>readWeiboUpload({code:'A00006',data:{pics:{pic_1:{ret:0,pid:'abc123'}}}}),/IMAGE_UPLOAD_REJECTED/);
assert.throws(()=>readWeiboUpload({code:'A00006',data:{pics:{pic_1:{ret:1,pid:'../../a'}}}}),/IMAGE_UPLOAD_REJECTED/);
console.log('Weibo receipt identity, checkpoint destination and ambiguous creation guards passed.');

let handler,reads=0,fulfilled=false,disposed=false,unrouted=false,fetchOptions;
const request={url:()=> 'https://card.weibo.com/article/v5/aj/editor/draft/create',method:()=> 'POST'};
const response={body:async()=>{reads++;return Buffer.from('{"code":100000,"data":{"id":"123"}}');},dispose:async()=>{disposed=true;}};
const page={route:async(match,fn)=>{handler=fn;assert.equal(match(new URL(request.url())),true);assert.equal(match(new URL('https://example.com/article/v5/aj/editor/draft/create')),false);},unroute:async()=>{unrouted=true;}};
const value=await captureWeiboJson(page,()=>true,async()=>{
 await handler({request:()=>request,fetch:async options=>{fetchOptions=options;return response;},fulfill:async({body})=>{assert.equal(reads,1);assert.match(body.toString(),/123/);fulfilled=true;},abort:async()=>{}});
 assert.equal(fulfilled,true,'page only receives response after body is retained');
});
assert.equal(value.data.id,'123');assert.equal(disposed,true);assert.equal(unrouted,true);
assert.equal(fetchOptions.maxRetries,0,'POST must never be retried');assert.equal(fetchOptions.maxRedirects,0,'login redirects must not be silently followed');
await assert.rejects(captureWeiboJson(page,()=>true,async()=>{
 await handler({request:()=>request,fetch:async()=>{throw Error('transport failed');},abort:async()=>{}});
}),/WEIBO_RECEIPT_CREATE: transport failed/);
await assert.rejects(captureWeiboJson(page,()=>true,async()=>{}, {timeout:10}),/WEIBO_RECEIPT_TIMEOUT/);
console.log('Weibo response interception, exact byte forwarding, no retry and cleanup passed.');

const checkpoints=[];
const createPage={...page,setDefaultTimeout(){},evaluate:async()=>'<p>Body</p>',goto:async()=>{},
 getByRole:()=>({waitFor:async()=>{},click:async()=>handler({request:()=>request,fetch:async()=>response,fulfill:async()=>{},abort:async()=>{}})}),
 waitForURL:async()=>{throw Error('navigation interrupted');}
};
await assert.rejects(deliverWeiboDraft({context:{newPage:async()=>createPage},job:{version:1,id:'test',title:'Title',summary:'',html:'<p>Body</p>',images:[]},checkpoint:async state=>checkpoints.push(state)}),/navigation interrupted/);
assert.deepEqual(checkpoints.map(s=>s.stage),['creating','editing']);
assert.equal(checkpoints[1].editUrl,'https://card.weibo.com/article/v5/editor#/draft/123','known identity is durable before navigation can fail');
console.log('Draft identity survives post-create navigation failure.');
