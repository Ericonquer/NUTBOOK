// Native WebView2 WebDriver, using the same capabilities as Tauri's official adapter.
// No frontend/backend mocks, injected test commands, or packaged runtime dependencies.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const reportDir=resolve(process.env.NUTBOOK_SMOKE_REPORT||'windows-smoke-report');mkdirSync(reportDir,{recursive:true});
const report={commit:process.env.GITHUB_SHA||'local',checks:[],success:false};
let session,driver,appProcess,debugEndpoint,devtools;const browserDiagnostics=[];let deadline;const logs=[],appLogs=[];
function capture(stream,buffer){stream?.on('data',chunk=>{buffer.push(String(chunk).slice(0,4096));if(buffer.length>200)buffer.shift();});}
const endpoint='http://127.0.0.1:9515';
const policyBackups=[];
// WebView2 ignores user-scoped debug overrides in elevated hosts (Microsoft,
// security.md). GitHub Windows runners use High IL; policy is app-scoped and
// restored in finally, never installed by or bundled with the product.
function reg(args){return spawnSync('reg.exe',[...args,'/reg:64'],{windowsHide:true,encoding:'utf8',timeout:3000});}
function setMachineOverride(section,name,value){
 const key=String.raw`HKLM\Software\Policies\Microsoft\Edge\WebView2`+'\\'+section;
 const old=reg(['QUERY',key,'/v',name]);
 const found=old.status===0?old.stdout.match(/\b(REG_SZ|REG_EXPAND_SZ)[ \t]+([^\r\n]*)/):null;
 if(old.status===0&&!found)throw Error('Cannot preserve existing WebView2 override');
 if(old.status!==0&&!/unable to find|cannot find|not found/i.test(old.stdout+old.stderr))throw Error('Cannot read WebView2 machine override');
 const write=reg(['ADD',key,'/v',name,'/t','REG_SZ','/d',value,'/f']);
 assert.equal(write.status,0,write.stderr||write.error?.message);
 policyBackups.push({key,name,type:found?.[1],value:found?.[2]});
}

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
 const root=mkdtempSync(join(tmpdir(),'NUTBOOK 验收 #100% '));report.fixtureRoot=root;mkdirSync(join(root,'docs','assets'),{recursive:true});
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
 // Keep the explicit debug port outside Windows' dynamic allocation range,
 // so the application's own port-0 IPC listener cannot claim it first.
 const debugPort=9222,portServer=createServer();
 await new Promise((ok,fail)=>{portServer.once('error',fail);portServer.listen(debugPort,'127.0.0.1',ok);});
 await new Promise(ok=>portServer.close(ok));report.debugPort=debugPort;
 debugEndpoint=`http://127.0.0.1:${debugPort}`;
 const groups=spawnSync('whoami.exe',['/groups','/fo','csv','/nh'],{windowsHide:true,encoding:'utf8',timeout:3000});
 assert.equal(groups.status,0,groups.stderr||groups.error?.message);
 report.hostHighIntegrity=groups.stdout.includes('S-1-16-12288');
 const debugArguments=`--remote-debugging-port=${debugPort} --remote-debugging-address=127.0.0.1`;
 const appEnv={...process.env,HOME:'',NUTBOOK_APP_DATA_DIR:join(root,'app-data'),TAURI_WEBVIEW_AUTOMATION:'true',WEBVIEW2_USER_DATA_FOLDER:join(root,'webview-data')};
 if(report.hostHighIntegrity){
   report.browserOverrideSource='app-specific-machine-policy';
   for(const name of ['NUTBOOK.exe','com.hayley.nutbook']){
     setMachineOverride('AdditionalBrowserArguments',name,debugArguments);
     setMachineOverride('UserDataFolder',name,join(root,'webview-data'));
   }
   for(const key of Object.keys(appEnv))if(key.toUpperCase()==='WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS')delete appEnv[key];
 }else{
   report.browserOverrideSource='environment';appEnv.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=debugArguments;
 }
 appProcess=spawn(binary,[md],{env:appEnv,windowsHide:false,stdio:['ignore','pipe','pipe']});
 for(const stream of [appProcess.stdout,appProcess.stderr])capture(stream,appLogs);
 report.appPid=appProcess.pid;
 appProcess.on('error',e=>appLogs.push(e.message));
 appProcess.on('exit',(code,signal)=>{report.appExit={code,signal};});
 deadline=setTimeout(()=>{driver.kill();},180000);
 const stableCli=join(root,'app-data','cli','nutbook.exe');
 await wait('stable-cli-deployed',()=>existsSync(stableCli));
 const version=spawnSync(stableCli,['--version'],{windowsHide:true,encoding:'utf8',timeout:3000});
 assert.equal(version.status,0,version.error?.message||version.stderr);
 const expectedVersion=JSON.parse(readFileSync('src-tauri/tauri.conf.json','utf8')).version;
 assert.equal(version.stdout.trim(),'nutbook '+expectedVersion);report.applicationVersion=expectedVersion;
 report.checks.push({name:'stable-cli-version'});
 const endpointFile=join(root,'app-data','cli-ipc.json');
 await wait('application-ipc-created',()=>existsSync(endpointFile));
 {const endpoint=JSON.parse(readFileSync(endpointFile,'utf8'));report.applicationIpc={port:endpoint.port,pid:endpoint.pid};assert.notEqual(endpoint.port,debugPort,'IPC and debug port must be distinct');}
 await wait('native-webview-debug-ready',async()=>{
   const response=await fetch(debugEndpoint+'/json/list',{signal:AbortSignal.timeout(2000)});
   const targets=await response.json();report.targets=targets.map(({id,type,url,title})=>({id,type,url,title}));
   return targets.some(target=>target.type==='page'&&target.url!=='about:blank');
 },15000);
 // Observe the real browser's network/security errors, including opaque
 // sandboxed history frames. No product test hook or policy relaxation.
 const mainTarget=(await fetch(debugEndpoint+'/json/list').then(r=>r.json())).find(target=>target.type==='page'&&target.url!=='about:blank');
 devtools=new WebSocket(mainTarget.webSocketDebuggerUrl);
 await new Promise((ok,fail)=>{const timer=setTimeout(()=>fail(Error('DevTools diagnostics connection timeout')),3000);devtools.addEventListener('open',()=>{clearTimeout(timer);ok();},{once:true});devtools.addEventListener('error',()=>{clearTimeout(timer);fail(Error('DevTools diagnostics connection failed'));},{once:true});});
 let devtoolsId=0;
 const command=(method,params={},sessionId)=>devtools.send(JSON.stringify({id:++devtoolsId,method,params,...(sessionId?{sessionId}:{})}));
 devtools.addEventListener('message',event=>{
   const message=JSON.parse(String(event.data));
   if(message.method==='Target.attachedToTarget'){
     command('Log.enable',{},message.params.sessionId);command('Network.enable',{},message.params.sessionId);
   }
   if(message.error||message.method==='Log.entryAdded'||message.method==='Network.loadingFailed'||(message.method==='Network.responseReceived'&&message.params.response.status>=400)){
     browserDiagnostics.push(JSON.stringify(message).slice(0,4096));if(browserDiagnostics.length>200)browserDiagnostics.shift();
   }
 });
 command('Log.enable');command('Network.enable');command('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:false,flatten:true});
 const created=await request('POST','/session',{capabilities:{alwaysMatch:{browserName:'webview2','ms:edgeChromium':true,'ms:edgeOptions':{debuggerAddress:`127.0.0.1:${debugPort}`}}}});
 session=created.sessionId;assert(session,'WebDriver session missing');
 const mainHandle=await request('GET',`/session/${session}/window`);
 await wait('markdown-editor',async()=>{await prompt();return execute(`return !!document.querySelector('.ProseMirror');`);});
 await execute(`document.querySelector('[data-join-external-tab]')?.click();`);
 await wait('joined-library',()=>execute(`return getActiveTab()?.sourceMode==='library'||getActiveTab()?.external?.joined===true;`));
 await wait('local-svg-loaded',()=>execute(`return [...document.querySelectorAll('.ProseMirror img')].some(img=>img.complete&&img.naturalWidth>0&&img.getBoundingClientRect().width>0&&img.getBoundingClientRect().height>0&&!img.src.startsWith('data:'));`));
 const element=await request('POST',`/session/${session}/element`,{using:'css selector',value:'.ProseMirror'});
 const elementId=element['element-6066-11e4-a52e-4f735466cecf'];assert(elementId);
 const marker='Windows 保存重开 '+Date.now();
 await request('POST',`/session/${session}/element/${elementId}/value`,{text:'\uE009\uE010\uE000\n'+marker+'\n'});
 // Exercise the real OS clipboard -> editor paste -> Tauri asset writer path.
 // Windows PowerShell/Forms are runner tooling, never product dependencies.
 const clipboard=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-STA','-Command',
   "$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $image=New-Object System.Drawing.Bitmap 16,16; $graphics=[System.Drawing.Graphics]::FromImage($image); try {$graphics.Clear([System.Drawing.Color]::Purple); [System.Windows.Forms.Clipboard]::SetImage($image); if(-not [System.Windows.Forms.Clipboard]::ContainsImage()){throw 'Clipboard image missing'}} finally {$graphics.Dispose();$image.Dispose()}"],
   {windowsHide:true,encoding:'utf8',timeout:5000});
 assert.equal(clipboard.status,0,clipboard.error?.message||clipboard.stderr);
 await request('POST',`/session/${session}/element/${elementId}/value`,{text:'\uE009v\uE000'});
 await wait('clipboard-png-loaded',()=>execute(`const images=[...document.querySelectorAll('.ProseMirror img:not(.ProseMirror-separator)')];return images.length===2&&images.every(img=>img.complete&&img.naturalWidth>0&&img.getBoundingClientRect().width>0);`));
 await request('POST',`/session/${session}/element/${elementId}/value`,{text:'\uE009s\uE000'});
 await wait('saved-to-disk',async()=>readFileSync(md,'utf8').includes(marker));
 const pastedRef=readFileSync(md,'utf8').match(/!\[[^\]]*\]\(([^)]+\.png)\)/)?.[1];assert(pastedRef,'saved Markdown must reference the pasted PNG');
 const pastedFile=resolve(root,'docs',decodeURIComponent(pastedRef));
 assert(pastedFile.startsWith(resolve(root,'docs')+'\\'),'paste asset must stay in document directory');
 assert.equal(readFileSync(pastedFile).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 report.checks.push({name:'pasted-png-persisted'});
 // Disk durability precedes the save coordinator's refreshed baseline and busy release.
 // Close only after the real save UI has settled; do not answer an unsaved prompt.
 await wait('save-settled',()=>execute(`const tab=getActiveTab();return !!tab&&!isMarkdownTabDirty(tab)&&document.querySelector('#documentPrimaryButton')?.getAttribute('aria-busy')!=='true';`));
 await execute(`document.querySelector('.tab-chip.active [data-close-tab]')?.click();`);
 await wait('tab-closed',()=>execute(`return !getActiveTab()&&!document.querySelector('#confirmScrim.open');`));
 await wait('library-card-image',()=>execute(`return [...document.querySelectorAll('[data-open-item] img')].some(img=>img.complete&&img.naturalWidth>0&&img.getBoundingClientRect().width>0&&img.getBoundingClientRect().height>0);`));
 await nativeOpen(md);
 await wait('saved-reopened',async()=>{await prompt();return execute(`return document.querySelector('.ProseMirror')?.textContent.includes(arguments[0]);`,[marker]);});
 // Run history independently so its failure still preserves the HTML result.
 try {
 // Open actual product history UI, then inspect its sandboxed archived iframe via WebDriver.
 await execute(`document.querySelector('#documentMoreButton').click();`);
 await wait('history-menu',()=>execute(`const b=document.querySelector('[data-document-action="document-versions"]');if(!b)return false;b.click();return true;`));
 await wait('history-version-list',()=>execute(`const b=document.querySelector('.nutbook-history [data-list] button');if(!b)return false;b.click();return true;`));
 await wait('history-frame',()=>execute(`return !!document.querySelector('.nutbook-history iframe[data-frame]');`));
 const frame=await request('POST',`/session/${session}/element`,{using:'css selector',value:'.nutbook-history iframe[data-frame]'});
 await request('POST',`/session/${session}/frame`,{id:frame});
 await wait('archived-image-loaded',()=>execute(`const images=[...document.images];return images.length>=2&&images.every(img=>img.complete&&img.naturalWidth>0&&img.getBoundingClientRect().width>0&&img.getBoundingClientRect().height>0);`));
 const archivedUrl=await execute(`return document.images[0].src;`);
 await request('POST',`/session/${session}/frame`,{id:null});
 await execute(`document.querySelector('.nutbook-history [data-close]').click();`);
 await wait('history-closed',()=>execute(`return !document.querySelector('.nutbook-history');`));
 const revoked=await request('POST',`/session/${session}/execute/async`,{script:`const done=arguments[arguments.length-1],image=new Image();image.onload=()=>done(false);image.onerror=()=>done(true);image.src=arguments[0];`,args:[archivedUrl]});
 assert.equal(revoked,true,'closed history image grant must stop loading');report.checks.push({name:'history-image-revoked'});
 }catch(error){
   report.historyFailure=error.stack;
   try{report.historyFailureImages=await execute(`return [...document.images].map(img=>({src:img.src,width:img.naturalWidth}));`);const png=await request('GET',`/session/${session}/screenshot`);writeFileSync(join(reportDir,'history-failure.png'),Buffer.from(png,'base64'));}catch{}
   await request('POST',`/session/${session}/frame`,{id:null});
   await execute(`document.querySelector('.nutbook-history [data-close]')?.click();`);
   await wait('history-failure-cleanup',()=>execute(`return !document.querySelector('.nutbook-history');`));
 }
 // Real filesystem -> backend scan -> home cards beyond the first backend page.
 const many=join(root,'pagination');mkdirSync(many);
 for(let i=1;i<=205;i++)writeFileSync(join(many,`page-${String(i).padStart(3,'0')}.md`),`# Pagination ${i}\n\nWindows page ${i}.\n`);
 await request('POST',`/session/${session}/execute/async`,{script:`const done=arguments[arguments.length-1];(async()=>{const library=await invoke('select_library',{rootPath:arguments[0],name:'Pagination 205',sourceKind:'folder'});await invoke('scan_library',{libraryId:library.id,mode:'full'});await loadLibraries();await showAllFilesHome();return true;})().then(done,error=>done({error:String(error)}));`,args:[many]}).then(result=>assert.equal(result,true));
 await wait('all-files-beyond-100',()=>execute(`const files=appState.items.filter(x=>x.fileName.startsWith('page-'));return files.length===205&&files.every(x=>!!document.querySelector('[data-open-item="'+x.id+'"]'));`));
 for(const number of ['101','205']){
   await execute(`const item=appState.items.find(x=>x.fileName==='page-${number}.md');document.querySelector('[data-open-trigger="'+item.id+'"]').click();`);
   await wait('pagination-open-'+number,()=>execute(`return getActiveTab()?.item?.fileName==='page-${number}.md'&&!!document.querySelector('.ProseMirror')&&document.querySelector('.ProseMirror').textContent.includes('Pagination ${Number(number)}');`));
   await request('POST',`/session/${session}/execute/async`,{script:`const done=arguments[arguments.length-1];showAllFilesHome().then(()=>done(true),error=>done({error:String(error)}));`,args:[]}).then(result=>assert.equal(result,true));
 }
 await nativeOpen(html);
 // Native child surfaces are distinct WebDriver targets. Never substitute main DOM/HTTP success.
 await wait('html-child-script',async()=>{
   const handles=await request('GET',`/session/${session}/window/handles`);
   for(const handle of handles){await request('POST',`/session/${session}/window`,{handle});await prompt();if(await execute(`return window.innerWidth>300&&window.innerHeight>200&&document.visibilityState==='visible'&&document.querySelector('#ready')?.textContent==='SCRIPT READY'&&!!document.querySelector('#native-html')&&getComputedStyle(document.body).getPropertyValue('--smoke-css').trim()==='ready'&&[...document.images].some(img=>img.complete&&img.naturalWidth>0&&img.getBoundingClientRect().width>0&&img.getBoundingClientRect().height>0);`)){report.htmlTarget=await execute(`return {url:location.href,topLevel:window.top===window,width:innerWidth,height:innerHeight,visibility:document.visibilityState};`);assert.equal(report.htmlTarget.topLevel,true);assert(report.htmlTarget.url.startsWith('http://nutbook-content.'),'HTML assertion must observe the native content surface');return true;}}
   return false;
 },20000);
 // Exporter-produced deck, real native minimize/restore, unsaved live DOM.
 await request('POST',`/session/${session}/window`,{handle:mainHandle});
 const deck=join(root,'exported-presentation.html');
 writeFileSync(deck,readFileSync('src-tauri/tests/fixtures/html-edit/exported-presentation-minimize.html'));
 await nativeOpen(deck);
 await wait('presentation-joined',async()=>{await prompt();return execute(`if(getActiveTab()?.item?.fileName!=='exported-presentation.html')return false;document.querySelector('[data-join-external-tab]')?.click();return getActiveTab()?.sourceMode==='library'||getActiveTab()?.external?.joined===true;`);});
 await wait('presentation-source-ready',async()=>{
   for(const handle of await request('GET',`/session/${session}/window/handles`)){
     try{await request('POST',`/session/${session}/window`,{handle});if(await execute(`return document.readyState==='complete'&&!!document.querySelector('.cover-title[data-id]')&&!!window.__NUTBOOK_PRESENTATION__;`))return true;}catch{}
   }return false;
 });
 await request('POST',`/session/${session}/window`,{handle:mainHandle});
 await execute(`window.__smokeEditEvents=[];const original=window.__NUTBOOK_HANDLE_HTML_EDIT_RUNTIME_MESSAGE__;window.__NUTBOOK_HANDLE_HTML_EDIT_RUNTIME_MESSAGE__=function(data){window.__smokeEditEvents.push({type:data?.type,itemId:data?.itemId,sourceItemId:data?.sourceItemId,session:data?.runtimeSessionId,generation:data?.generation,hasProtocol:data?.hasProtocol,managedSourceAllowed:data?.managedSourceAllowed});if(window.__smokeEditEvents.length>100)window.__smokeEditEvents.shift();return original(data);};`);
 await wait('presentation-edit-entry',()=>execute(`const button=document.querySelector('#documentPrimaryButton');if(!button||button.disabled)return false;button.click();return true;`));
 let editHandle;
 await wait('presentation-edit-ready',async()=>{
   for(const handle of await request('GET',`/session/${session}/window/handles`)){
     try{await request('POST',`/session/${session}/window`,{handle});
     if(await execute(`return !!window.__NUTBOOK_HTML_EDIT__?.isEditing()&&!!document.querySelector('#nutbook-html-edit-inline-toolbar')&&!!document.querySelector('.cover-title[contenteditable]');`)){editHandle=handle;return true;}}catch{}
   }return false;
 });
 await execute(`window.__smokeEditorIdentity='keep-live-editor';`);
 const titleElement=await request('POST',`/session/${session}/element`,{using:'css selector',value:'.cover-title[contenteditable]'});
 await request('POST',`/session/${session}/element/${titleElement['element-6066-11e4-a52e-4f735466cecf']}/value`,{text:'\uE009a\uE000Unsaved minimize acceptance'});
 // Resolve HWND exactly once while visible. Process.MainWindowHandle can
 // select a different window after minimization; re-querying can "restore"
 // an unrelated non-minimized window and falsely leave the real app hidden.
 const hwnd=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`(Get-Process -Id ${appProcess.pid}).MainWindowHandle.ToInt64()`],{windowsHide:true,encoding:'utf8',timeout:5000});
 assert.equal(hwnd.status,0,hwnd.stderr||hwnd.error?.message);
 const nativeHwnd=hwnd.stdout.trim();assert(/^[1-9][0-9]*$/.test(nativeHwnd),'Expected a non-zero application HWND');report.nativeWindowHandle=nativeHwnd;
 const windowState=(minimized)=>{
   const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',
     `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class NutbookWindow { [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int n); [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h); [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p); }'; $h=[IntPtr]::new([long]${nativeHwnd}); [uint32]$owner=0; [NutbookWindow]::GetWindowThreadProcessId($h,[ref]$owner) | Out-Null; if(-not [NutbookWindow]::IsWindow($h) -or $owner -ne ${appProcess.pid}){throw 'Application HWND changed ownership'}; [NutbookWindow]::ShowWindow($h,${minimized?6:9}) | Out-Null; if([NutbookWindow]::IsIconic($h) -ne $${minimized?'true':'false'}){throw 'Native window state mismatch'}`],{windowsHide:true,encoding:'utf8',timeout:5000});
   assert.equal(result.status,0,result.stderr||result.error?.message);
 };
 for(let cycle=0;cycle<6;cycle++){
   await request('POST',`/session/${session}/window`,{handle:mainHandle});
   windowState(true);
   await wait('presentation-minimized-'+cycle,()=>execute(`return appState.runtimeSurfacesSuspended;`));
   windowState(false);
   await wait('presentation-restored-'+cycle,()=>execute(`return !appState.runtimeSurfacesSuspended&&!!appState.htmlEditSession?.presentation?.pages?.length;`));
   await request('POST',`/session/${session}/window`,{handle:editHandle});
   await wait('presentation-still-editable-'+cycle,()=>execute(`const toolbar=document.querySelector('#nutbook-html-edit-inline-toolbar');return window.__smokeEditorIdentity==='keep-live-editor'&&window.__NUTBOOK_HTML_EDIT__?.isEditing()&&document.querySelector('.cover-title[contenteditable]')?.textContent.includes('Unsaved minimize acceptance')&&!!toolbar&&toolbar.isConnected;`));
   const toolbarElement=await request('POST',`/session/${session}/element`,{using:'css selector',value:'#nutbook-html-edit-inline-toolbar'});
   const shadow=await request('GET',`/session/${session}/element/${toolbarElement['element-6066-11e4-a52e-4f735466cecf']}/shadow`);
   const saveButton=await request('POST',`/session/${session}/shadow/${shadow['shadow-6066-11e4-a52e-4f735466cecf']}/element`,{using:'css selector',value:'[data-intent=save]'});
   assert.equal(await request('GET',`/session/${session}/element/${saveButton['element-6066-11e4-a52e-4f735466cecf']}/displayed`),true,'Restored inline toolbar Save button must be visible');
 }
 await request('POST',`/session/${session}/element/${titleElement['element-6066-11e4-a52e-4f735466cecf']}/value`,{text:'\uE009s\uE000'});
 await request('POST',`/session/${session}/window`,{handle:mainHandle});
 await wait('presentation-saved-after-restore',()=>execute(`return !!appState.htmlEditSession&&!appState.htmlEditSession.dirty&&!appState.htmlEditSession.saveInFlight;`));
 assert(readFileSync(deck,'utf8').includes('Unsaved minimize acceptance'),'Restored edit must persist to the original exported file');
 writeFileSync(join(reportDir,'saved-presentation.html'),readFileSync(deck));
 await request('POST',`/session/${session}/execute/async`,{script:`const done=arguments[arguments.length-1];(async()=>{const id=getActiveTab().id;await exitHtmlEditMode();await closeOpenTab(id);})().then(()=>done(true),error=>done({error:String(error)}));`,args:[]}).then(result=>assert.equal(result,true));
 await request('POST',`/session/${session}/execute/async`,{script:`const done=arguments[arguments.length-1];showAllFilesHome().then(()=>done(true),error=>done({error:String(error)}));`,args:[]}).then(result=>assert.equal(result,true));
 await execute(`const item=appState.items.find(item=>item.fileName==='exported-presentation.html');if(!item)throw Error('Saved presentation card missing');document.querySelector('[data-open-trigger="'+item.id+'"]').click();`);
 await wait('presentation-reopened-after-restore',async()=>{
   for(const handle of await request('GET',`/session/${session}/window/handles`)){
     try{await request('POST',`/session/${session}/window`,{handle});
     if(await execute(`return !!document.querySelector('.cover-title')?.textContent.includes('Unsaved minimize acceptance');`))return true;}catch{}
   }return false;
 });
 // Check the related leave decisions and home lifecycle using real buttons.
 const findEditingDeck=async(label)=>{
   let found;
   await wait(label,async()=>{for(const handle of await request('GET',`/session/${session}/window/handles`)){try{await request('POST',`/session/${session}/window`,{handle});if(await execute(`return !!window.__NUTBOOK_HTML_EDIT__?.isEditing()&&!!document.querySelector('.cover-title[contenteditable]');`)){found=handle;return true;}}catch{}}return false;});
   return found;
 };
 const enterDeckEdit=async(label)=>{
   await wait(label+'-document',async()=>{for(const handle of await request('GET',`/session/${session}/window/handles`)){try{await request('POST',`/session/${session}/window`,{handle});if(await execute(`return document.readyState==='complete'&&!!document.querySelector('.cover-title')&&!window.__NUTBOOK_HTML_EDIT__;`))return true;}catch{}}return false;});
   await request('POST',`/session/${session}/window`,{handle:mainHandle});
   await wait(label+'-entry',()=>execute(`const button=document.querySelector('#documentPrimaryButton');if(!button||button.disabled)return false;button.click();return true;`));
   return findEditingDeck(label);
 };
 const typeTitle=async(text)=>{
   const element=await request('POST',`/session/${session}/element`,{using:'css selector',value:'.cover-title[contenteditable]'});
   await request('POST',`/session/${session}/element/${element['element-6066-11e4-a52e-4f735466cecf']}/value`,{text:'\uE009a\uE000'+text});
 };
 const finishEdit=async()=>{
   const element=await request('POST',`/session/${session}/element`,{using:'css selector',value:'#nutbook-html-edit-inline-toolbar'});
   const shadow=await request('GET',`/session/${session}/element/${element['element-6066-11e4-a52e-4f735466cecf']}/shadow`);
   const button=await request('POST',`/session/${session}/shadow/${shadow['shadow-6066-11e4-a52e-4f735466cecf']}/element`,{using:'css selector',value:'[data-intent=done]'});
   await request('POST',`/session/${session}/element/${button['element-6066-11e4-a52e-4f735466cecf']}/click`,{});
 };
 const chooseLeave=async(choice)=>{
   await wait('presentation-confirm-'+choice,async()=>{for(const handle of await request('GET',`/session/${session}/window/handles`)){try{await request('POST',`/session/${session}/window`,{handle});if(await execute(`return !!document.querySelector('#${choice}Button');`)){const button=await request('POST',`/session/${session}/element`,{using:'css selector',value:'#'+choice+'Button'});await request('POST',`/session/${session}/element/${button['element-6066-11e4-a52e-4f735466cecf']}/click`,{});return true;}}catch{}}return false;});
 };
 await enterDeckEdit('presentation-edit-after-reopen');
 await typeTitle('Unsaved confirmation acceptance');
 await finishEdit();await chooseLeave('keep');
 await findEditingDeck('presentation-continue-editing');
 assert(await execute(`return document.querySelector('.cover-title').textContent.includes('Unsaved confirmation acceptance');`));
 await finishEdit();await chooseLeave('discard');
 await request('POST',`/session/${session}/window`,{handle:mainHandle});
 await wait('presentation-discard-exited',()=>execute(`return !appState.htmlEditSession;`));
 assert(!readFileSync(deck,'utf8').includes('Unsaved confirmation acceptance'));
 assert(readFileSync(deck,'utf8').includes('Unsaved minimize acceptance'));
 await enterDeckEdit('presentation-edit-after-discard');
 await typeTitle('Saved confirmation acceptance');
 await finishEdit();await chooseLeave('save');
 await request('POST',`/session/${session}/window`,{handle:mainHandle});
 await wait('presentation-save-exited',()=>execute(`return !appState.htmlEditSession;`));
 assert(readFileSync(deck,'utf8').includes('Saved confirmation acceptance'));
 await request('POST',`/session/${session}/execute/async`,{script:`const done=arguments[arguments.length-1];(async()=>{await closeOpenTab(getActiveTab().id);await showAllFilesHome();})().then(()=>done(true),error=>done({error:String(error)}));`,args:[]}).then(result=>assert.equal(result,true));
 windowState(true);
 await wait('home-minimized',()=>execute(`return appState.runtimeSurfacesSuspended;`));
 windowState(false);
 await wait('home-restored',()=>execute(`return !appState.runtimeSurfacesSuspended&&appState.activeTabId==null&&document.querySelectorAll('[data-open-item]').length>=205;`));
 await wait('home-no-content-overlay',async()=>!(await fetch(debugEndpoint+'/json/list',{signal:AbortSignal.timeout(2000)}).then(r=>r.json())).some(target=>target.url?.startsWith('http://nutbook-content.')));
 if(report.historyFailure)throw Error('History path failed: '+report.historyFailure);
 report.success=true;
 writeFileSync(join(reportDir,'driver.log'),logs.join('\n'));
}catch(error){report.error=error.stack;process.exitCode=1;
 if(session)try{report.surfaceStates=[];for(const handle of await request('GET',`/session/${session}/window/handles`)){await request('POST',`/session/${session}/window`,{handle});report.surfaceStates.push(await execute(`return {url:location.href,title:document.title,coverTitle:document.querySelector('.cover-title')?.textContent,hidden:document.hidden,editor:window.__NUTBOOK_HTML_EDIT__?.isEditing(),toolbar:!!document.querySelector('#nutbook-html-edit-inline-toolbar'),host:typeof appState==='undefined'?null:{activeId:appState.activeTabId,suspended:appState.runtimeSurfacesSuspended,session:appState.htmlEditSession?{itemId:appState.htmlEditSession.itemId,sessionId:appState.htmlEditSession.runtimeSessionId,generation:appState.htmlEditSession.generation,dirty:appState.htmlEditSession.dirty,pages:appState.htmlEditSession.presentation?.pages?.length}:null,primaryDisabled:document.querySelector('#documentPrimaryButton')?.disabled,status:document.querySelector('#statusText')?.textContent,editEvents:window.__smokeEditEvents,pendingSuspend:!!appState.runtimeSurfaceSuspendPromise,lifecycleEpoch:appState.runtimeSurfaceLifecycleEpoch}};`));}}catch{}
 if(debugEndpoint)try{report.failureTargets=await fetch(debugEndpoint+'/json/list',{signal:AbortSignal.timeout(2000)}).then(r=>r.json());}catch{}if(session){try{report.failureState=await execute(`return {url:location.href,activeTab:typeof getActiveTab==='function'?(()=>{const tab=getActiveTab();return tab?{id:tab.id,dirty:tab.isDirty,computedDirty:isMarkdownTabDirty(tab),baseline:tab.markdownBaseline,draft:tab.draft,editor:markdownContentForTab(tab)}:null})():null,saveBusy:document.querySelector('#documentPrimaryButton')?.getAttribute('aria-busy'),images:[...document.images].map(img=>({src:img.src,complete:img.complete,width:img.naturalWidth,rect:img.getBoundingClientRect().toJSON()}))};`);}catch{}try{const png=await request('GET',`/session/${session}/screenshot`);writeFileSync(join(reportDir,'failure.png'),Buffer.from(png,'base64'));}catch{}}}
finally{
 devtools?.close();writeFileSync(join(reportDir,'browser-diagnostics.json'),JSON.stringify(browserDiagnostics.map(line=>{try{return JSON.parse(line);}catch{return line;}}),null,2));
 clearTimeout(deadline);if(appProcess?.pid){
  const task=spawnSync('tasklist.exe',['/FI',`PID eq ${appProcess.pid}`,'/FO','CSV','/V'],{windowsHide:true,encoding:'utf8',timeout:3000});
  writeFileSync(join(reportDir,'process.txt'),task.stdout||task.error?.message||task.stderr||'no process');
  const diagnostic=spawnSync('pwsh.exe',['-NoProfile','-NonInteractive','-Command',"Get-CimInstance Win32_Process | Where-Object {$_.Name -match 'nutbook|msedgewebview2'} | Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Depth 3"],{windowsHide:true,encoding:'utf8',timeout:8000});
  writeFileSync(join(reportDir,'process-tree.json'),diagnostic.stdout||JSON.stringify({error:diagnostic.error?.message,stderr:diagnostic.stderr}));
 }
 if(session)try{await request('DELETE',`/session/${session}`);}catch{}
 for(const child of [appProcess,driver])if(child?.pid)spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
 for(const old of policyBackups.reverse()){
   const restored=old.type?reg(['ADD',old.key,'/v',old.name,'/t',old.type,'/d',old.value,'/f']):reg(['DELETE',old.key,'/v',old.name,'/f']);
   if(restored.status!==0){report.success=false;process.exitCode=1;(report.policyRestoreErrors??=[]).push({name:old.name,error:restored.stderr||restored.error?.message});}
 }
 writeFileSync(join(reportDir,'driver.log'),logs.join('\n'));
 writeFileSync(join(reportDir,'app.log'),appLogs.join('\n'));
 writeFileSync(join(reportDir,'report.json'),JSON.stringify(report,null,2));
}
assert(report.success,report.error||'Windows smoke failed');
