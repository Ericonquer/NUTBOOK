// Native WebView2 WebDriver, using the same capabilities as Tauri's official adapter.
// No frontend/backend mocks, injected test commands, or packaged runtime dependencies.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const reportDir=resolve(process.env.NUTBOOK_SMOKE_REPORT||'windows-smoke-report');mkdirSync(reportDir,{recursive:true});
const report={commit:process.env.GITHUB_SHA||'local',checks:[],success:false};
let session,driver,appProcess,debugEndpoint;let deadline;const logs=[],appLogs=[];
function capture(stream,buffer){stream?.on('data',chunk=>{buffer.push(String(chunk).slice(0,4096));if(buffer.length>200)buffer.shift();});}
const endpoint='http://127.0.0.1:9515';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function request(method,path,body){
 const response=await fetch(endpoint+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 const json=await response.json();if(!response.ok||json.value?.error)throw Error(JSON.stringify(json.value));return json.value;
}
async function execute(script,args=[]){return request('POST',`/session/${session}/execute/sync`,{script,args});}
async function wait(name,fn,limit=15000){const start=Date.now();let error;while(Date.now()-start<limit){try{if(await fn()){report.checks.push({name,ms:Date.now()-start});return;}}catch(e){error=e;}await pause(100);}throw Error(`${name}: timed out ${error?.message||''}`);}
async function nativeOpen(path){
 const result=await request('POST',`/session/${session}/execute/async`,{script:`const done=arguments[arguments.length-1];window.__TAURI_INTERNALS__.invoke('external_open_enqueue',{source:'cli',paths:[arguments[0]]}).then(()=>done(true),e=>done({error:String(e)}));`,args:[path]});assert.equal(result,true);
}
async function prompt(){await execute(`document.querySelector('[data-prompt-action="join"]')?.click();`);}
try{
 assert.equal(process.platform,'win32','native Windows smoke must not be skipped on another OS');
 const binary=resolve(process.env.NUTBOOK_SMOKE_APP||'src-tauri/target/release/NUTBOOK.exe');assert(existsSync(binary));
 const executable=readFileSync(binary);
 report.binarySha256=createHash('sha256').update(executable).digest('hex');
 report.binarySubsystem=executable.readUInt16LE(executable.readUInt32LE(0x3c)+24+68);
 assert.equal(report.binarySubsystem,2,'GUI application must use Windows GUI subsystem');
 const root=mkdtempSync(join(tmpdir(),'NUTBOOK 验收 #100% '));mkdirSync(join(root,'docs','assets'),{recursive:true});
 const md=join(root,'docs','sample.md'),html=join(root,'runtime.html');
 writeFileSync(join(root,'docs','assets','图 #100%.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="green"/></svg>');
 writeFileSync(md,'# Windows smoke\n\n![图片](assets/%E5%9B%BE%20%23100%25.svg)\n\n正文。\n');
 writeFileSync(join(root,'style.css'),'body{--smoke-css:ready}');
 writeFileSync(join(root,'data.json'),'{"ok":true}');
 writeFileSync(join(root,'module.js'),`const data=await fetch('/data.json').then(r=>r.json());document.getElementById('ready').textContent=data.ok?'SCRIPT READY':'FAIL';`);
 writeFileSync(html,'<!doctype html><html><head><link rel="stylesheet" href="/style.css"><script type="module" src="/module.js"></script></head><body><h1 id="native-html">HTML BODY</h1><p id="ready">pending</p><img src="/docs/assets/%E5%9B%BE%20%23100%25.svg"></body></html>');
 driver=spawn(process.env.NUTBOOK_WEBDRIVER||'msedgedriver.exe',['--port=9515','--host=127.0.0.1','--verbose'],{
   env:{...process.env,HOME:'',NUTBOOK_APP_DATA_DIR:join(root,'app-data'),TAURI_WEBVIEW_AUTOMATION:'true'},windowsHide:true,stdio:['ignore','pipe','pipe']});
 for(const stream of [driver.stdout,driver.stderr])capture(stream,logs);
 driver.on('error',e=>logs.push(e.message));
 await wait('driver-ready',async()=>!!await request('GET','/status'),10000);
 // Microsoft's attach route supports applications with multiple native WebViews.
 // Launch the real app ourselves so paths remain application argv and diagnostics are readable.
 const {createServer}=await import('node:net');
 const portServer=createServer();await new Promise((ok,fail)=>{portServer.once('error',fail);portServer.listen(0,'127.0.0.1',ok);});
 const debugPort=portServer.address().port;await new Promise(ok=>portServer.close(ok));
 debugEndpoint=`http://127.0.0.1:${debugPort}`;
 appProcess=spawn(binary,[md],{env:{...process.env,HOME:'',NUTBOOK_APP_DATA_DIR:join(root,'app-data'),NUTBOOK_STARTUP_TRACE:join(reportDir,'startup.log'),TAURI_WEBVIEW_AUTOMATION:'true',WEBVIEW2_USER_DATA_FOLDER:join(root,'webview-data'),WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:`--remote-debugging-port=${debugPort} --remote-debugging-address=127.0.0.1`},windowsHide:false,stdio:['ignore','pipe','pipe']});
 for(const stream of [appProcess.stdout,appProcess.stderr])capture(stream,appLogs);
 appProcess.on('error',e=>appLogs.push(e.message));
 appProcess.on('exit',(code,signal)=>{report.appExit={code,signal};});
 deadline=setTimeout(()=>{driver.kill();},180000);
 await wait('native-webview-debug-ready',async()=>{
   const response=await fetch(debugEndpoint+'/json/list',{signal:AbortSignal.timeout(2000)});
   const targets=await response.json();report.targets=targets.map(({id,type,url,title})=>({id,type,url,title}));
   return targets.some(target=>target.type==='page'&&target.url!=='about:blank');
 },15000);
 const created=await request('POST','/session',{capabilities:{alwaysMatch:{browserName:'webview2','ms:edgeChromium':true,'ms:edgeOptions':{debuggerAddress:`127.0.0.1:${debugPort}`}}}});
 session=created.sessionId;assert(session,'WebDriver session missing');
 await wait('markdown-editor',async()=>{await prompt();return execute(`return !!document.querySelector('.ProseMirror');`);});
 await execute(`document.querySelector('[data-join-external-tab]')?.click();`);
 await wait('joined-library',()=>execute(`return getActiveTab()?.sourceMode==='library'||getActiveTab()?.external?.joined===true;`));
 await wait('local-svg-loaded',()=>execute(`return [...document.querySelectorAll('.ProseMirror img')].some(img=>img.complete&&img.naturalWidth>0&&!img.src.startsWith('data:'));`));
 const element=await request('POST',`/session/${session}/element`,{using:'css selector',value:'.ProseMirror'});
 const elementId=element['element-6066-11e4-a52e-4f735466cecf'];assert(elementId);
 const marker='Windows 保存重开 '+Date.now();
 await request('POST',`/session/${session}/element/${elementId}/value`,{text:'\uE009\uE010\uE000\n'+marker});
 await request('POST',`/session/${session}/element/${elementId}/value`,{text:'\uE009s\uE000'});
 await wait('saved-to-disk',async()=>readFileSync(md,'utf8').includes(marker));
 await execute(`document.querySelector('.tab-chip.active [data-close-tab]')?.click();`);
 await wait('library-card-image',()=>execute(`return [...document.querySelectorAll('[data-open-item] img')].some(img=>img.complete&&img.naturalWidth>0);`));
 await nativeOpen(md);
 await wait('saved-reopened',async()=>{await prompt();return execute(`return document.querySelector('.ProseMirror')?.textContent.includes(arguments[0]);`,[marker]);});
 // Open actual product history UI, then inspect its sandboxed archived iframe via WebDriver.
 await execute(`document.querySelector('#documentMoreButton').click();`);
 await wait('history-menu',()=>execute(`const b=document.querySelector('[data-document-action="document-versions"]');if(!b)return false;b.click();return true;`));
 await wait('history-version-list',()=>execute(`const b=document.querySelector('.nutbook-history [data-list] button');if(!b)return false;b.click();return true;`));
 await wait('history-frame',()=>execute(`return !!document.querySelector('.nutbook-history iframe[data-frame]');`));
 const frame=await request('POST',`/session/${session}/element`,{using:'css selector',value:'.nutbook-history iframe[data-frame]'});
 await request('POST',`/session/${session}/frame`,{id:frame});
 await wait('archived-image-loaded',()=>execute(`return [...document.images].some(img=>img.complete&&img.naturalWidth>0);`));
 await request('POST',`/session/${session}/frame`,{id:null});
 await execute(`document.querySelector('.nutbook-history [data-close]').click();`);
 await wait('history-closed',()=>execute(`return !document.querySelector('.nutbook-history');`));
 await nativeOpen(html);
 // Native child surfaces are distinct WebDriver targets. Never substitute main DOM/HTTP success.
 await wait('html-child-script',async()=>{
   const handles=await request('GET',`/session/${session}/window/handles`);
   for(const handle of handles){await request('POST',`/session/${session}/window`,{handle});await prompt();if(await execute(`return document.querySelector('#ready')?.textContent==='SCRIPT READY'&&!!document.querySelector('#native-html')&&getComputedStyle(document.body).getPropertyValue('--smoke-css').trim()==='ready'&&[...document.images].some(img=>img.complete&&img.naturalWidth>0);`))return true;}
   return false;
 },20000);
 report.success=true;
 writeFileSync(join(reportDir,'driver.log'),logs.join('\n'));
}catch(error){report.error=error.stack;process.exitCode=1;if(debugEndpoint)try{report.failureTargets=await fetch(debugEndpoint+'/json/list',{signal:AbortSignal.timeout(2000)}).then(r=>r.json());}catch{}if(session){try{const png=await request('GET',`/session/${session}/screenshot`);writeFileSync(join(reportDir,'failure.png'),Buffer.from(png,'base64'));}catch{}}}
finally{
 clearTimeout(deadline);if(appProcess?.pid){const snapshot=spawn('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${appProcess.pid} -ErrorAction SilentlyContinue | Select-Object Id,ProcessName,Responding,MainWindowHandle,MainWindowTitle,CPU | ConvertTo-Json`],{windowsHide:true,stdio:['ignore','pipe','ignore']});let output='';snapshot.stdout.on('data',x=>output+=x);await Promise.race([new Promise(ok=>snapshot.on('exit',ok)),pause(3000)]);snapshot.kill();writeFileSync(join(reportDir,'process.json'),output);}
 if(session)try{await request('DELETE',`/session/${session}`);}catch{}
 for(const child of [appProcess,driver])if(child?.pid)spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
 writeFileSync(join(reportDir,'driver.log'),logs.join('\n'));
 writeFileSync(join(reportDir,'app.log'),appLogs.join('\n'));
 writeFileSync(join(reportDir,'report.json'),JSON.stringify(report,null,2));
}
assert(report.success,report.error||'Windows smoke failed');
