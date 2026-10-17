/** Bundled delivery host. Browser windows are reserved for login and explicit draft viewing. */
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createInterface} from 'node:readline';
import {chromium} from 'playwright-core';
import {deliverDraft,validateJob,validateResume} from './delivery.mjs';
import {atomicJson,lockJob,readJournal,replaceUnavailableDraft} from './job-store.mjs';
import {deliverWeiboDraft,validateWeiboResume,WEIBO_HOME,isWeiboAuthenticated,waitForWeiboAuthentication} from './weibo-delivery.mjs';
import {deliverXDraft,validateXResume} from './x-delivery.mjs';
import {createXBrowserSession} from './x-browser-session.mjs';
import {createBrowserSession} from './browser-session.mjs';
const [jobFile,stateDirectory,...flags]=process.argv.slice(2);
if(!jobFile||!stateDirectory)throw Error('Usage: node scripts/wechat/run.mjs JOB_JSON PRIVATE_STATE_DIRECTORY');
const job=JSON.parse(await readFile(resolve(jobFile),'utf8'));
const digest=validateJob(job);
const platform=flags.includes('--platform=x')?'x':flags.includes('--platform=weibo')?'weibo':'wechat';
const adapter=platform==='x'?deliverXDraft:platform==='weibo'?deliverWeiboDraft:deliverDraft;
const validateCheckpoint=platform==='x'?validateXResume:platform==='weibo'?validateWeiboResume:validateResume;
const dir=resolve(stateDirectory);await mkdir(dir,{recursive:true,mode:0o700});
let release;
const controller=new AbortController();
process.once('SIGINT',()=>controller.abort());process.once('SIGTERM',()=>controller.abort());
const emit=value=>process.stdout.write(`${JSON.stringify(value)}\n`);
let session,delivering=true;
const input=createInterface({input:process.stdin});
input.on('line',line=>{
 if(line==='login')session?.confirmLogin?.();
 else if(line==='cancel'){controller.abort();session?.close();}
 else if(line==='view'&&!delivering)session?.show().catch(()=>emit({type:'view_error',message:'VIEW_UNAVAILABLE'}));
});
process.stdin.on('end',()=>{controller.abort();session?.close();});
try{
 release=await lockJob(dir,job.id);
 if(flags.includes('--recreate'))await replaceUnavailableDraft(dir,job.id,digest);
 const checkpointPath=join(dir,`${job.id}.json`);
 const journal=await readJournal(checkpointPath);validateCheckpoint(journal,digest);
 session=(platform==='x'?createXBrowserSession:createBrowserSession)({... (platform==='weibo'?{homeUrl:WEIBO_HOME,isAuthenticated:isWeiboAuthenticated,waitForAuthentication:waitForWeiboAuthentication}:{}),chromium,executablePath:process.env.NUTBOOK_CHROMIUM_EXECUTABLE||chromium.executablePath(),directory:dir,rememberLogin:flags.includes('--remember-login'),signal:controller.signal,progress:value=>emit({type:'progress',...value}),onMode:headless=>emit({type:'runtime_mode',headless})});
 const context=await session.connect();
 const result=await adapter({context,job,journal,signal:controller.signal,
  checkpoint:value=>atomicJson(checkpointPath,value),progress:value=>emit({type:'progress',...value})
 });
 delivering=false;emit({type:'result',...result});
 await session.waitForClose();
}catch(error){
 delivering=false;
 const message=String(error.message||error).split('\n')[0].replace(/https?:\/\/\S+/g,'[redacted URL]');
 emit({type:'error',message,cancelled:controller.signal.aborted});process.exitCode=1;
 // Failed headless work stays hidden. The user can explicitly choose View to inspect it.
 if(session?.context&&!controller.signal.aborted)await session.waitForClose();
}finally{await session?.close();session?.dispose();input.close();await release?.();}
