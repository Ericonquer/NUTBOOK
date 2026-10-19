import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,readdir,writeFile,rm,stat,realpath,symlink,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {installRuntime} from './install-publishing-runtime.mjs';
import {discoverRuntime,systemBrowsers} from './discover-publishing-runtime.mjs';
const config=JSON.parse(await readFile('src-tauri/tauri.conf.json','utf8'));
assert.ok(!config.build.beforeBuildCommand.includes('prepare:wechat-runtime'));
assert.equal(config.bundle.resources['generated-resources/publishing-runtime/'],'publishing-runtime/');
assert.equal(config.bundle.resources['generated-resources/wechat-runtime/'],undefined);
execFileSync(process.execPath,['scripts/prepare-publishing-runtime.mjs']);
const source=resolve('src-tauri/generated-resources/publishing-runtime');
const bundle=JSON.parse(await readFile(join(source,'bundle.json'),'utf8'));
assert.equal(bundle.version,2);
assert.equal(bundle.playwrightVersion,JSON.parse(await readFile('package-lock.json','utf8')).packages['node_modules/playwright-core'].version);
assert.ok((await readdir(source)).every(name=>['.gitkeep','bundle.json','install.mjs','discover-publishing-runtime.mjs','worker','node_modules'].includes(name)));
let bytes=0;async function size(path){for(const name of await readdir(path)){const file=join(path,name),info=await stat(file);assert.ok(!['node','node.exe','Chromium.app','browser'].includes(name),'no bundled Node/browser');if(info.isDirectory())await size(file);else bytes+=info.size;}}
await size(source);assert.ok(bytes<20*1024*1024,'driver resources must stay below 20 MB');
const root=await mkdtemp(join(tmpdir(),'nutbook-shared-tools-'));
const fetchBefore=globalThis.fetch;let installs=0;
try{
 globalThis.fetch=()=>{throw Error('No network allowed during discovery or reuse');};
 if(process.platform!=='win32'){
  const alias=join(root,'aliased-discovery.mjs');await symlink(resolve('scripts/discover-publishing-runtime.mjs'),alias);
  const cli=JSON.parse(execFileSync(process.execPath,[alias],{encoding:'utf8'}));
  assert.equal(cli.driver.state,'invalid','CLI through symlink must execute, never silently return');
 }

 let browser=join(root,'fake-browser');await writeFile(browser,'fixture');browser=await realpath(browser);await chmod(browser,0o755);
 const candidates=[{path:join(root,'missing'),name:'Missing'},{path:browser,name:'Google Chrome'}];
 const core={executablePath:()=>join(root,'missing'),launch:()=>{throw Error('Discovery must NEVER launch a browser');}};
 const existing=await discoverRuntime({source,chromium:core,candidates,inspect:async path=>{assert.equal(path,browser);return {version:"155"};}});
 assert.equal(existing.ready,true);assert.equal(existing.browser.path,browser);assert.equal(existing.browser.state,'available');
 const readonly=await discoverRuntime({source,chromium:core,candidates});assert.equal(readonly.ready,true,'normal inspection must not launch browser');
 const failed=await discoverRuntime({source,chromium:core,candidates,inspect:async()=>{throw Error('POLICY_BLOCKED');}});
 assert.equal(failed.ready,false);assert.equal(failed.browser.state,'incompatible');
 const missing=await discoverRuntime({source,chromium:core,candidates:[],inspect:async()=>{throw Error('must not run');}});
 assert.equal(missing.browser.state,'missing');
 const wrongX=await discoverRuntime({source,platform:'x',chromium:core,candidates:[{path:browser,name:'Microsoft Edge'}],inspect:async()=>{throw Error('must not run');}});
 assert.equal(wrongX.ready,false);
 assert.ok(systemBrowsers('darwin',{},'/Users/test').some(entry=>entry.path.startsWith('/Applications/Google Chrome.app/')));
 const reused=await installRuntime(source,root,'wechat',{discover:async()=>existing,install:async()=>installs++});
 assert.equal(reused.ready,true);assert.equal(installs,0);
 await assert.rejects(installRuntime(source,root,'wechat',{discover:async()=>failed,install:async()=>installs++}),/No second browser/);
 await assert.rejects(installRuntime(source,root,'x',{discover:async()=>missing,install:async()=>installs++}),/Google Chrome/);
 assert.equal(installs,0);
 let checks=0;
 await installRuntime(source,root,'wechat',{discover:async()=>++checks===1?missing:existing,install:async()=>installs++});
 assert.equal(installs,1);assert.equal(checks,2);
 await writeFile(join(root,'keep.txt'),'existing user state');
 await assert.rejects(installRuntime(source,root,'wechat',{discover:async()=>missing,install:async()=>{throw Error('INTENTIONAL_OFFLINE');}}),/INTENTIONAL_OFFLINE/);
 assert.equal(await readFile(join(root,'keep.txt'),'utf8'),'existing user state');
}finally{globalThis.fetch=fetchBefore;await rm(root,{recursive:true,force:true});}
console.log(`Shared setup: ${bytes} driver bytes, no bundled Node/browser; reuse/no-network, browser verification, platform filtering, missing-only install and failure preservation passed.`);
