/** Headless delivery session. Only authentication and an explicit View action open a window. */
import {join} from 'node:path';
import {readJournal,atomicJson} from './job-store.mjs';
export function createBrowserSession({chromium,executablePath,directory,rememberLogin,signal,progress=()=>{},onMode=()=>{},homeUrl='https://mp.weixin.qq.com/',isAuthenticated=url=>new URL(url).pathname.includes('/cgi-bin/home'),waitForAuthentication}){
 let context=null,owner=null,closed=false,switching=false,memoryState,authenticated=false;
 let finish;const finished=new Promise(resolve=>{finish=resolve;});
 const assertOpen=()=>{if(closed||signal?.aborted)throw Error('CANCELLED');};
 async function stop(){if(closed)return;closed=true;if(rememberLogin&&authenticated&&context){try{await atomicJson(join(directory,'auth.json'),await context.storageState());}catch{}}await context?.close().catch(()=>{});await owner?.close().catch(()=>{});finish();}
 signal?.addEventListener('abort',stop,{once:true});
 async function launch(headless){
  assertOpen();onMode(headless);switching=true;
  try{
   if(context){
    memoryState=await context.storageState();
    await context.close();await owner?.close().catch(()=>{});context=null;owner=null;
   }
   assertOpen();
   const options={headless,executablePath,...(!headless?{viewport:null}:{})};
   let next,spawned;
   if(rememberLogin)next=await chromium.launchPersistentContext(join(directory,'profile'),options);
   else{spawned=await chromium.launch(options);try{next=await spawned.newContext({...(!headless?{viewport:null}:{}),...(memoryState?{storageState:memoryState}:{})});}catch(error){await spawned.close();throw error;}}
   if(closed||signal?.aborted){await next.close();await spawned?.close();throw Error('CANCELLED');}
   context=next;owner=next.browser()||spawned;
   if(memoryState&&rememberLogin){
    await next.addCookies(memoryState.cookies||[]);
   }
   next.on('close',()=>{if(context===next&&!switching&&!closed){closed=true;finish();}});
  }finally{switching=false;}
 }
 async function connect(){
  if(rememberLogin)memoryState=await readJournal(join(directory,'auth.json'));
  progress({stage:'connecting'});await launch(true);
  let page=await context.newPage();await page.goto(homeUrl,{waitUntil:'domcontentloaded'});
  if(!await isAuthenticated(page.url(),page)){
   // No platform write has happened; relaunching for authentication cannot duplicate a draft.
   await launch(false);page=await context.newPage();await page.goto(homeUrl,{waitUntil:'domcontentloaded'});
   if(!await isAuthenticated(page.url(),page)){
    progress({stage:'waiting_for_scan'});
    if(waitForAuthentication)await waitForAuthentication(page);
    else await page.waitForURL(url=>isAuthenticated(url.href),{timeout:600000});
   }
   assertOpen();await launch(true);page=await context.newPage();await page.goto(homeUrl,{waitUntil:'domcontentloaded'});
   if(!await isAuthenticated(page.url(),page))throw Error('LOGIN_NOT_REUSABLE');
  }
  authenticated=true;
  if(rememberLogin)await atomicJson(join(directory,'auth.json'),await context.storageState());
  await page.close();progress({stage:'connected'});return context;
 }
 async function show(){
  assertOpen();
  const pages=context.pages();const target=pages.at(-1)?.url()||homeUrl;
  await launch(false);const page=await context.newPage();await page.goto(target,{waitUntil:'domcontentloaded'});await page.bringToFront();
 }
 return {get context(){return context;},connect,show,close:stop,waitForClose:()=>finished,dispose:()=>signal?.removeEventListener('abort',stop)};
}
