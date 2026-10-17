import assert from 'node:assert/strict';
import {validateJob,validateResume} from './wechat/delivery.mjs';
const job={version:1,id:'acceptance',title:'验收',summary:'',html:'<p>正文</p>',images:[]};
const digest=validateJob(job);
assert.throws(()=>validateResume({digest,stage:'creating'},digest),/AMBIGUOUS_CREATE/);
assert.throws(()=>validateResume({digest:'old'},digest),/JOB_CONTENT_CHANGED/);
assert.throws(()=>validateResume({digest,stage:'saved',editUrl:'https://example.com/?appmsgid=1'},digest),/INVALID_CHECKPOINT_URL/);
validateResume({digest,stage:'saved',editUrl:'https://mp.weixin.qq.com/cgi-bin/appmsg?appmsgid=1'},digest);
assert.throws(()=>validateJob({...job,coverId:'missing'}),/INVALID_COVER/);
assert.throws(()=>validateJob({...job,title:'文'.repeat(65)}),/INVALID_TITLE/);
assert.throws(()=>validateJob({...job,images:[{id:'a',mime:'image/png',base64:'AAAA'},{id:'a',mime:'image/png',base64:'AAAA'}]}),/INVALID_IMAGE_ID/);
console.log('WeChat job validation and ambiguous retry guards passed');
const {mkdtemp,readFile,rm}=await import('node:fs/promises');
const {tmpdir}=await import('node:os');
const {join}=await import('node:path');
const {atomicJson,lockJob,readJournal}=await import('./wechat/job-store.mjs');
const dir=await mkdtemp(join(tmpdir(),'nutbook-wechat-jobs-'));
try{
 const release=await lockJob(dir,job.id);
 await assert.rejects(lockJob(dir,job.id),/JOB_LOCKED/);
 const path=join(dir,'journal.json');await atomicJson(path,{digest,stage:'saved'});
 assert.deepEqual(await readJournal(path),{digest,stage:'saved'});
 assert.equal(await readJournal(join(dir,'missing')),null);
 await atomicJson(path,{digest,stage:'verified'});
 assert.equal(JSON.parse(await readFile(path)).stage,'verified');
 await release();const again=await lockJob(dir,job.id);await again();
}finally{await rm(dir,{recursive:true,force:true});}
console.log('Concurrent send lock and atomic recovery checkpoint passed');
const {readUploadResult}=await import('./wechat/delivery.mjs');
assert.deepEqual(readUploadResult({base_resp:{ret:0},content:'123',cdn_url:'https://mmbiz.qpic.cn/a/0'}),{fileId:'123',url:'https://mmbiz.qpic.cn/a/0'});
assert.throws(()=>readUploadResult({base_resp:{ret:1}}),/IMAGE_UPLOAD_REJECTED/);
assert.throws(()=>readUploadResult({base_resp:{ret:0},content:'123',cdn_url:'https://example.com/a'}),/INVALID_UPLOADED_IMAGE_URL/);
assert.throws(()=>readUploadResult({base_resp:{ret:0},content:'invalid',cdn_url:'https://mmbiz.qpic.cn/a'}),/IMAGE_UPLOAD_REJECTED/);
console.log('Upload response identity and host validation passed');
const staleDir=await mkdtemp(join(tmpdir(),'nutbook-wechat-stale-'));
try{
 const {spawnSync}=await import('node:child_process');
 const dead=spawnSync(process.execPath,['-e','process.exit(0)']);
 const {writeFile}=await import('node:fs/promises');
 await writeFile(join(staleDir,'stale.lock'),JSON.stringify({pid:dead.pid}));
 await atomicJson(join(staleDir,'stale.json'),{stage:'verified',editUrl:'https://mp.weixin.qq.com/cgi-bin/appmsg?appmsgid=1'});
 const release=await lockJob(staleDir,'stale');await release();
 await writeFile(join(staleDir,'ambiguous.lock'),JSON.stringify({pid:dead.pid}));
 await atomicJson(join(staleDir,'ambiguous.json'),{stage:'creating'});
 await assert.rejects(lockJob(staleDir,'ambiguous'),/needs inspection/);
 console.log('Dead verified-job lock recovery and ambiguous-creation protection passed');
}finally{await rm(staleDir,{recursive:true,force:true});}
const replacementDir=await mkdtemp(join(tmpdir(),'nutbook-wechat-replace-'));
try{
 const {replaceUnavailableDraft}=await import('./wechat/job-store.mjs');
 const path=join(replacementDir,`${job.id}.json`);
 const receipt={digest,stage:'verified',editUrl:'https://mp.weixin.qq.com/cgi-bin/appmsg?appmsgid=1'};
 await atomicJson(path,receipt);
 await assert.rejects(replaceUnavailableDraft(replacementDir,job.id,digest),/RECREATE_NOT_ALLOWED/);
 await atomicJson(join(replacementDir,`${job.id}.status.json`),{jobId:job.id,error:'DRAFT_UNAVAILABLE',running:false});
 await atomicJson(path,{...receipt,stage:'creating'});
 await assert.rejects(replaceUnavailableDraft(replacementDir,job.id,digest),/RECREATE_NOT_ALLOWED/);
 await atomicJson(path,receipt);
 await replaceUnavailableDraft(replacementDir,job.id,digest);
 assert.equal(await readJournal(path),null);
 const {readdir}=await import('node:fs/promises');
 const archive=(await readdir(replacementDir)).find(name=>name.includes('.previous-'));
 assert.deepEqual(await readJournal(join(replacementDir,archive)),receipt);
 await atomicJson(path,{...receipt,editUrl:'https://mp.weixin.qq.com/cgi-bin/appmsg?appmsgid=2'});
 assert.equal((await readJournal(path)).editUrl.endsWith('=2'),true);
 console.log('Explicit unavailable-draft replacement preserves receipt and refuses ambiguous reset.');
}finally{await rm(replacementDir,{recursive:true,force:true});}
