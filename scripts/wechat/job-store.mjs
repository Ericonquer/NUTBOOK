import {mkdir,readFile,open,rename,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';

export async function atomicJson(path,value){
  const temp=`${path}.${randomUUID()}.tmp`;
  try{
    const file=await open(temp,'wx',0o600);
    try{await file.writeFile(JSON.stringify(value));await file.sync();}finally{await file.close();}
    await rename(temp,path);
  }finally{await unlink(temp).catch(()=>{});}
}

/** Concurrent sends of the same job fail closed, including after a crashed lock owner. */
export async function lockJob(directory,id){
  if(!/^[a-zA-Z0-9_-]{1,80}$/.test(id))throw Error('INVALID_JOB_ID');
  await mkdir(directory,{recursive:true,mode:0o700});
  const path=join(directory,`${id}.lock`);
  let file;
  try{file=await open(path,'wx',0o600);}catch(e){
    if(e.code!=='EEXIST')throw e;
    // Recover only a dead owner with a durable known draft. Ambiguous creation stays blocked.
    const recoveryPath=join(directory,`${id}.recovery`);
    let recovery;
    try{recovery=await open(recoveryPath,'wx',0o600);}catch{throw Error('JOB_LOCKED: recovery already in progress');}
    try{
      const owner=JSON.parse(await readFile(path,'utf8'));
      if(!Number.isInteger(owner.pid)||owner.pid<=0)throw Error('JOB_LOCKED: invalid owner');
      let dead=false;try{process.kill(owner.pid,0);}catch(error){dead=error.code==='ESRCH';}
      const journal=await readJournal(join(directory,`${id}.json`));
      if(!dead||!['editing','saved','verified'].includes(journal?.stage)||!journal?.editUrl)throw Error('JOB_LOCKED: another send or interrupted creation needs inspection');
      await unlink(path);
      file=await open(path,'wx',0o600);
    }finally{await recovery.close();await unlink(recoveryPath).catch(()=>{});}
  }
  await file.writeFile(JSON.stringify({pid:process.pid}));await file.close();
  return async()=>unlink(path);
}
export async function readJournal(path){
  try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}
}

export const recoverableDraftErrors=new Set(['DRAFT_UNAVAILABLE','DRAFT_CONTENT_MISMATCH','DRAFT_INCOMPLETE','COVER_NOT_SAVED','DRAFT_IMAGES_NOT_LOADED','DRAFT_SAVE_UNCONFIRMED']);

/** Explicit recovery only; preserve the old receipt and never reset ambiguous creation. */
export async function replaceUnavailableDraft(directory,id,digest){
 const path=join(directory,`${id}.json`);
 const journal=await readJournal(path);
 const status=await readJournal(join(directory,`${id}.status.json`));
 if(journal?.digest!==digest || !['editing','saved','verified'].includes(journal?.stage) || status?.jobId!==id || !recoverableDraftErrors.has(status?.error) || status?.running!==false)throw Error('RECREATE_NOT_ALLOWED');
 await atomicJson(join(directory,`${id}.previous-${randomUUID()}.json`),journal);
 await unlink(path);
}
