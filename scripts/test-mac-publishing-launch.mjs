/** Real system Chrome/LaunchServices against localhost only; no platform/account operations. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm,readdir,readFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
const packaged=process.env.NUTBOOK_TEST_PUBLISHING_WORKER_ROOT;
const worker=name=>packaged?pathToFileURL(join(packaged,name)).href:new URL('./wechat/'+name,import.meta.url).href;
const {chromium}=await import(packaged?pathToFileURL(join(packaged,'../node_modules/playwright-core/index.mjs')).href:'playwright-core');
const {createBrowserSession}=await import(worker('browser-session.mjs'));
const {findXChrome}=await import(worker('x-browser-session.mjs'));
const {applicationBundle,launchMacApplication,closeBrowserEndpoint,quitOwnedApplication}=await import(worker('mac-application.mjs'));
const exec=promisify(execFile);
if(process.platform!=='darwin'){console.log('macOS LaunchServices test skipped on other platforms');process.exit(0);}
const executablePath=await findXChrome();
assert.ok(applicationBundle(executablePath));
const root=await mkdtemp(join(tmpdir(),'nutbook-mac-launch-test-'));
const directory=join(root,'Application Support','中文发布');await mkdir(directory,{recursive:true});
const server=createServer((request,response)=>{
 if(request.url==='/login'){response.writeHead(200,{'Content-Type':'text/html','Set-Cookie':'logged=yes; Path=/; HttpOnly'});response.end("<script>localStorage.setItem('fixture-auth','kept');location.href='/cgi-bin/home'</script>");return;}
 if(request.url==='/'){if(request.headers.cookie?.includes('logged=yes')){response.writeHead(302,{Location:'/cgi-bin/home'});response.end();}else response.end('<button onclick="location.href=\'/login\'">Test login</button>');return;}
 response.end('<h1>Local authenticated page</h1>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const homeUrl=`http://127.0.0.1:${server.address().port}/`;
let session,login;const modes=[];
const options={chromium,executablePath,directory,homeUrl,rememberLogin:true,onMode:value=>modes.push(value),progress:event=>{if(event.stage==='waiting_for_scan')login=session.context.pages().at(-1).getByRole('button',{name:'Test login'}).click();}};
try{
 await assert.rejects(quitOwnedApplication(process.pid,executablePath,directory),/INVALID_BROWSER_OWNER/);
 session=createBrowserSession(options);await session.connect();await login;assert.deepEqual(modes,[true,false,true]);
 let stored=await session.context.newPage();await stored.goto(homeUrl);assert.equal(await stored.evaluate(()=>localStorage.getItem('fixture-auth')),'kept');await stored.close();
 await session.show();assert.equal(modes.at(-1),false);await session.close();
 modes.length=0;
 // connecting/connected are expected; a retained session must not ask for login.
 session=createBrowserSession({...options,progress:event=>assert.notEqual(event.stage,'waiting_for_scan')});
 await session.connect();assert.deepEqual(modes,[true]);await session.close();
 const ephemeral=join(directory,'ephemeral');
 session=createBrowserSession({...options,directory:ephemeral,rememberLogin:false});await session.connect();await login;
 stored=await session.context.newPage();await stored.goto(homeUrl);assert.equal(await stored.evaluate(()=>localStorage.getItem('fixture-auth')),'kept');await stored.close();await session.close();
 await assert.rejects(readdir(ephemeral),{code:'ENOENT'},'unchecked remember-login must not create persistent app data');
 const controller=new AbortController();
 session=createBrowserSession({...options,directory:ephemeral,rememberLogin:false,signal:controller.signal,progress:event=>{if(event.stage==='waiting_for_scan')controller.abort();}});
 await assert.rejects(session.connect(),/CANCELLED|closed|Target/);await session.close();await session.waitForClose();
 session=createBrowserSession({...options,directory:ephemeral,rememberLogin:false});await session.connect();await login;
 const protocol=await session.context.browser().newBrowserCDPSession();
 const {processInfo}=await protocol.send('SystemInfo.getProcessInfo');const pid=processInfo.find(item=>item.type==='browser').id;
 const command=(await exec('/bin/ps',['-p',String(pid),'-o','command='])).stdout;
 const temporary=command.match(/--user-data-dir=([^ ]+) /)[1];
 await protocol.send('Browser.close').catch(()=>{});await session.waitForClose();
 await assert.rejects(readdir(temporary),{code:'ENOENT'},'closing the browser also removes its temporary login profile');
 const earlyController=new AbortController();
 session=createBrowserSession({...options,directory:ephemeral,rememberLogin:false,signal:earlyController.signal,onMode:()=>setTimeout(()=>earlyController.abort(),100)});
 await assert.rejects(session.connect(),/CANCELLED|closed|Target/);await session.waitForClose();
 // Observe the OS process owner for a standalone LaunchServices instance.
 const profile=join(directory,'owner');let child;
 try{
  child=await launchMacApplication(executablePath,[`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','about:blank']);
  const {stdout}=await exec('/bin/ps',['-p',String(child.pid),'-o','ppid=']);assert.equal(Number(stdout.trim()),1,'LaunchServices owns browser instead of Node child process');
 }finally{if(child){let port;for(let n=0;n<150;n++){try{port=(await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];}catch{}if(port)break;await new Promise(resolve=>setTimeout(resolve,100));}if(port)await closeBrowserEndpoint('http://127.0.0.1:'+port);else await child.quit();await child.waitForExit();}}
 console.log('Real LaunchServices Chrome: local login/headless restore, retained profile, explicit View, temporary profile cleanup, cancellation and independent process parent passed. No platform requests.');
}finally{await session?.close();await rm(root,{recursive:true,force:true});await new Promise(resolve=>server.close(resolve));}
