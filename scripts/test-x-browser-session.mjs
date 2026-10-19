import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
import {createXBrowserSession,waitForXAuthentication} from './wechat/x-browser-session.mjs';
const require=createRequire(new URL('../src-tauri/generated-resources/publishing-runtime/worker/run.mjs',import.meta.url));
const {chromium}=require('playwright-core');
const directory=await mkdtemp(join(tmpdir(),'nutbook-x-session-test-'));
let homes=0,gates=0,ready;let firstReady=new Promise(resolve=>{ready=resolve;});
const server=createServer((req,res)=>{
 if(req.url==='/ready'){ready();res.end('ok');return;}
 if(req.url==='/late'){res.setHeader('Content-Type','text/html');res.end('<a data-testid="AppTabBar_Profile_Link">Late authenticated page</a>');return;}
 if(req.url==='/home'){
  homes++;const login=homes===1||req.headers.cookie?.includes('fixture_login=present');
  if(homes===1)res.setHeader('Set-Cookie','fixture_login=present; Max-Age=3600; HttpOnly; Path=/');
  res.setHeader('Content-Type','text/html');res.end(`${login?'<a data-testid="AppTabBar_Profile_Link">Local authenticated fixture</a>':'Local login required'}<script>localStorage.setItem('fixture','persisted');fetch('/ready')</script>`);return;
 }
 res.end('fixture');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const homeUrl=`http://127.0.0.1:${server.address().port}/home`;
const sessions=[];
try{
 let attachments=0;const client={connectOverCDP:async(...args)=>{attachments++;return chromium.connectOverCDP(...args);}};
 let session=createXBrowserSession({chromium:client,directory,rememberLogin:true,homeUrl,progress:event=>{
  if(event.stage==='waiting_for_x_login'){gates++;assert.equal(attachments,0,'manual login must precede automation attachment');firstReady.then(async()=>{await assert.rejects(readFile(join(directory,'profile/DevToolsActivePort')),/ENOENT/);session.confirmLogin();});}
 }});sessions.push(session);
 const context=await session.connect();console.log('Local first login transition passed');
 assert.equal(homes,2,'continue must restart once after cooperative quit, preserving the login cookie');
 assert.equal(attachments,1);assert.equal(gates,1);
 assert.ok((await context.cookies(homeUrl)).some(c=>c.name==='fixture_login'));
 const page=context.pages().find(p=>p.url()===homeUrl);assert.ok(page);
 assert.equal(await page.evaluate(()=>localStorage.getItem('fixture')),'persisted');
 const late=await context.newPage();
 const pending=waitForXAuthentication({pages:()=>[late]},homeUrl,p=>p.locator('[data-testid="AppTabBar_Profile_Link"]').waitFor().then(()=>true));
 await late.goto(homeUrl.replace('/home','/late'));assert.equal(await pending,true,'about:blank at attachment must wait for initial navigation');await late.close();
 const before=(await readFile(join(directory,'profile/DevToolsActivePort'),'utf8'));
 await session.show();assert.equal(await readFile(join(directory,'profile/DevToolsActivePort'),'utf8'),before,'View must retain the same browser');
 await session.close();session.dispose();
 session=createXBrowserSession({chromium:client,directory,rememberLogin:true,homeUrl,progress:event=>{if(event.stage==='waiting_for_x_login')throw Error('Retained login unexpectedly requested');}});sessions.push(session);
 const reused=await session.connect();console.log('Local retained login passed');
 assert.equal(gates,1);assert.equal(homes,3);assert.ok((await reused.cookies(homeUrl)).some(c=>c.name==='fixture_login'));
 await session.close();session.dispose();
 const controller=new AbortController();let cancelled;
 cancelled=createXBrowserSession({chromium:client,directory:join(directory,'cancel'),rememberLogin:false,homeUrl,signal:controller.signal,progress:event=>{if(event.stage==='waiting_for_x_login')controller.abort();}});sessions.push(cancelled);
 await assert.rejects(cancelled.connect(),/CANCELLED/);await cancelled.close();cancelled.dispose();
 console.log('Real ordinary Chrome + localhost passed: manual login has no debug endpoint, cooperative quit/reopen preserves Cookie/storage, second send reuses login, View does not restart, cancel before attach exits cleanly. No X requests.');
}finally{for(const s of sessions){await s.close().catch(()=>{});s.dispose();}await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
