/** Ordinary installed Chrome, headed only, with a normal, non-debug browser for manual login. */
import {spawn} from 'node:child_process';
import {access,mkdir,mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as pause} from 'node:timers/promises';
import {atomicJson,readJournal} from './job-store.mjs';
import {applicationBundle,launchMacApplication,closeBrowserEndpoint,quitOwnedApplication} from './mac-application.mjs';

export async function findXChrome(platform=process.platform,env=process.env){
 const candidates=platform==='darwin'?['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',join(env.HOME||'','Applications/Google Chrome.app/Contents/MacOS/Google Chrome')]:platform==='win32'?[join(env.PROGRAMFILES||'','Google/Chrome/Application/chrome.exe'),join(env['PROGRAMFILES(X86)']||'','Google/Chrome/Application/chrome.exe'),join(env.LOCALAPPDATA||'','Google/Chrome/Application/chrome.exe')]:['/usr/bin/google-chrome','/usr/bin/google-chrome-stable'];
 for(const path of candidates){try{await access(path);return path;}catch{}}
 throw Error('X_CHROME_REQUIRED');
}
// A cooperative close flushes cookies; only the owned private-profile process is touched.
export const quitOwnedChrome=quitOwnedApplication;
const closeChrome=closeBrowserEndpoint;
/** A newly attached Chrome tab can still be about:blank while its initial navigation starts. */
export async function waitForXAuthentication(context,homeUrl,isAuthenticated){
 const origin=new URL(homeUrl).origin;
 let pages=context.pages();
 if(!pages.length)pages=[await context.waitForEvent('page',{timeout:20000})];
 for(const page of pages){
  try{
   await page.waitForURL(url=>url.origin===origin,{timeout:20000,waitUntil:'domcontentloaded'});
   if(await isAuthenticated(page))return true;
  }catch(error){if(page.isClosed())continue;throw error;}
 }
 return false;
}
export function createXBrowserSession({chromium,directory,rememberLogin,signal,progress=()=>{},onMode=()=>{},homeUrl='https://x.com/home',isAuthenticated=page=>page.locator('[data-testid="AppTabBar_Profile_Link"]').waitFor({timeout:20000}).then(()=>true,()=>false)}){
 let context,browser,child,profile,endpoint,closed=false,loginResolve,closing,switching=false,stopping,launching,activeExecutable;
 let finish;const finished=new Promise(resolve=>{finish=resolve;});
 const check=()=>{if(closed||signal?.aborted)throw Error('CANCELLED');};
 const exited=()=>!child||child.exitCode!==null||child.signalCode!==null;
 async function stopChrome(){
  if(stopping)return stopping;
  stopping=(async()=>{
   switching=true;
   try{
    if(launching)await launching.catch(()=>{});
    if(!exited()){
     let requestError;
     try{if(endpoint)await closeChrome(endpoint);else await quitOwnedChrome(child.pid,activeExecutable,profile);}catch(error){requestError=error;}
     // The owned process exit is authoritative; a quit request can race an already exiting app.
     for(let n=0;n<100&&!exited();n++)await pause(100);
     if(!exited())throw requestError||Error('X_BROWSER_STILL_RUNNING');
    }
    child=null;context=null;browser=null;endpoint=null;
   }finally{switching=false;}
  })();
  try{await stopping;}finally{stopping=null;}
 }
 async function launch(executable,debug){
  activeExecutable=executable;
  await rm(join(profile,'DevToolsActivePort'),{force:true});
  check();endpoint=null;
  const args=[`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check',...(debug?['--remote-debugging-address=127.0.0.1','--remote-debugging-port=0']:[]),homeUrl];
  const launchedThroughWorkspace=!!applicationBundle(executable);
  if(launchedThroughWorkspace){launching=launchMacApplication(executable,args,{activates:true}).then(value=>(child=value));try{await launching;}finally{launching=null;}}else child=spawn(executable,args,{stdio:'ignore'});
  if(closed||signal?.aborted){await stopChrome();throw Error('CANCELLED');}
  let spawnError;child.once('error',error=>{spawnError=error;});child.once('exit',()=>{if(!switching&&!closed)finish();});
  if(!debug){if(!launchedThroughWorkspace)await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});check();return;}
  for(let n=0;n<200;n++){
   check();if(spawnError||exited())throw Error('X_BROWSER_START_FAILED');
   let port;try{port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];}catch{}
   if(/^\d+$/.test(port||'')){endpoint=`http://127.0.0.1:${port}`;return;}
   await pause(100);
  }
  throw Error('X_BROWSER_START_TIMEOUT');
 }
 async function attach(){
  check();if(context)return;
  browser=await chromium.connectOverCDP(endpoint);context=browser.contexts()[0];
  context.on('close',()=>{context=null;if(!switching&&!closed)finish();});
 }
 async function waitForLogin(){
  // Login happens without a debug endpoint. Then quit cooperatively to flush the same profile.
  await new Promise((resolve,reject)=>{
   const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);child?.removeListener('exit',exit);loginResolve=null;};
   const abort=()=>{cleanup();reject(Error('CANCELLED'));};
   const exit=()=>{cleanup();reject(Error('X_BROWSER_CLOSED'));};
   const timer=setTimeout(()=>{cleanup();reject(Error('X_LOGIN_TIMEOUT'));},600000);
   loginResolve=()=>{cleanup();resolve();};
   signal?.addEventListener('abort',abort,{once:true});child.once('exit',exit);
   progress({stage:'waiting_for_x_login'});
  });
  check();progress({stage:'connecting'});await stopChrome();check();await launch(activeExecutable,true);await attach();
 }
 async function signedIn(){return waitForXAuthentication(context,homeUrl,isAuthenticated);}
 async function connect(){
  check();const executable=process.env.NUTBOOK_X_CHROME_EXECUTABLE||await findXChrome();await mkdir(directory,{recursive:true,mode:0o700});
  profile=rememberLogin?join(directory,'profile'):await mkdtemp(join(tmpdir(),'nutbook-x-'));
  await mkdir(profile,{recursive:true,mode:0o700});onMode(false);progress({stage:'connecting'});
  const known=rememberLogin&&await readJournal(join(directory,'authenticated.json'));
  if(!known&&process.platform!=='darwin')throw Error('X_MANUAL_LOGIN_UNSUPPORTED');
  await launch(executable,!!known);
  if(known){
   await attach();
   if(!await signedIn()){await stopChrome();check();await launch(executable,false);await waitForLogin();}
  }else await waitForLogin();
  if(!await signedIn())throw Error('X_LOGIN_INCOMPLETE');
  if(rememberLogin)await atomicJson(join(directory,'authenticated.json'),{version:1});
  progress({stage:'connected'});return context;
 }
 async function close(){
  if(closing)return closing;closed=true;
  closing=(async()=>{
   loginResolve?.();
   await stopChrome();
   if(profile&&!rememberLogin)await rm(profile,{recursive:true,force:true});finish();
  })();return closing;
 }
 const abort=()=>{close().catch(()=>finish());};signal?.addEventListener('abort',abort,{once:true});
 return {get context(){return context;},connect,confirmLogin:()=>loginResolve?.(),show:async()=>{check();if(!context)throw Error('VIEW_UNAVAILABLE');await context.pages().at(-1)?.bringToFront();},close,waitForClose:()=>finished,dispose:()=>signal?.removeEventListener('abort',abort)};
}
