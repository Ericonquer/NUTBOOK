/** Headless delivery session. Only authentication and an explicit View action open a window. */
import {join} from 'node:path';
import {mkdir,mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {setTimeout as pause} from 'node:timers/promises';
import {applicationBundle,launchMacApplication,closeBrowserEndpoint} from './mac-application.mjs';
import {readJournal,atomicJson} from './job-store.mjs';
export function createBrowserSession({chromium,executablePath,directory,rememberLogin,signal,progress=()=>{},onMode=()=>{},homeUrl='https://mp.weixin.qq.com/',isAuthenticated=url=>new URL(url).pathname.includes('/cgi-bin/home'),waitForAuthentication}){
 let context=null,owner=null,closed=false,switching=false,memoryState,authenticated=false;
 let external=null,externalProfile=null,ephemeralProfile=null,opening=null,stopping=null,closing=null;
 let finish;const finished=new Promise(resolve=>{finish=resolve;});
 const assertOpen=()=>{if(closed||signal?.aborted)throw Error('CANCELLED');};
 async function stopCurrent(){
  if(stopping)return stopping;
  stopping=(async()=>{
   if(opening)await opening.catch(()=>{});
   if(external){
    const owned=external;
    if(owned.child.exitCode===null){
     // Cancellation can arrive before Chrome exposes CDP. Wait for that owned endpoint,
     // then close through Chrome itself; AppKit quit alone does not close a headless startup.
     if(!owned.endpoint){for(let n=0;n<150&&owned.child.exitCode===null;n++){
      let port;try{port=(await readFile(join(externalProfile,'DevToolsActivePort'),'utf8')).split('\n')[0];}catch{}
      if(/^\d+$/.test(port||'')){owned.endpoint=`http://127.0.0.1:${port}`;break;}
      await pause(100);
     }}
     if(owned.endpoint)await closeBrowserEndpoint(owned.endpoint).catch(()=>owned.child.quit());
     else await owned.child.quit();
     await owned.child.waitForExit();
    }
    external=null;
   }else{await context?.close().catch(()=>{});await owner?.close().catch(()=>{});}
   context=null;owner=null;
  })();
  try{await stopping;}finally{stopping=null;}
 }
 async function stop(){if(closing)return closing;closed=true;closing=(async()=>{if(rememberLogin&&authenticated&&context){try{await atomicJson(join(directory,'auth.json'),await context.storageState());}catch{}}try{await stopCurrent();if(ephemeralProfile)await rm(ephemeralProfile,{recursive:true,force:true});}finally{finish();}})();return closing;}
 const abort=()=>{stop().catch(()=>finish());};
 signal?.addEventListener('abort',abort,{once:true});
 async function launch(headless){
  assertOpen();onMode(headless);switching=true;
  try{
   if(context){
    memoryState=await context.storageState();
    await stopCurrent();
   }
   assertOpen();
   const options={headless,executablePath,...(!headless?{viewport:null}:{})};
   let next,spawned;
   if(applicationBundle(executablePath)&&chromium.connectOverCDP){
    if(!externalProfile){
     if(rememberLogin){externalProfile=join(directory,'profile');await mkdir(externalProfile,{recursive:true,mode:0o700});}
     else externalProfile=ephemeralProfile=await mkdtemp(join(tmpdir(),'nutbook-publishing-'));
    }
    await rm(join(externalProfile,'DevToolsActivePort'),{force:true});
    assertOpen();
    opening=launchMacApplication(executablePath,[`--user-data-dir=${externalProfile}`,'--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0',...(headless?['--headless=new']:[]),'about:blank'],{activates:!headless}).then(child=>(external={child,endpoint:null}));
    try{await opening;}finally{opening=null;}
    try{
     for(let n=0;n<150;n++){
      assertOpen();if(external.child.exitCode!==null)throw Error('BROWSER_START_FAILED');
      let port;try{port=(await readFile(join(externalProfile,'DevToolsActivePort'),'utf8')).split('\n')[0];}catch{}
      if(/^\d+$/.test(port||'')){external.endpoint=`http://127.0.0.1:${port}`;break;}
      await pause(100);
     }
     if(!external.endpoint)throw Error('BROWSER_START_TIMEOUT');
     assertOpen();spawned=await chromium.connectOverCDP(external.endpoint);next=spawned.contexts()[0];
    }catch(error){await stopCurrent();throw error;}
   }else if(rememberLogin)next=await chromium.launchPersistentContext(join(directory,'profile'),options);
   else{spawned=await chromium.launch(options);try{next=await spawned.newContext({...(!headless?{viewport:null}:{}),...(memoryState?{storageState:memoryState}:{})});}catch(error){await spawned.close();throw error;}}
   if(closed||signal?.aborted){if(external)await stopCurrent();else{await next.close();await spawned?.close();}throw Error('CANCELLED');}
   context=next;owner=next.browser()||spawned;
   if(memoryState&&(rememberLogin||external)){
    await next.addCookies(memoryState.cookies||[]);
   }
   next.on('close',()=>{if(context===next&&!switching&&!closed)stop().catch(()=>finish());});
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
 return {get context(){return context;},connect,show,close:stop,waitForClose:()=>finished,dispose:()=>signal?.removeEventListener('abort',abort)};
}
