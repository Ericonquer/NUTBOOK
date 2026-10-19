#!/usr/bin/env node
// Explicit setup only. Reuse Node and browsers; download only a missing shared Chromium.
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {realpath} from 'node:fs/promises';
import {discoverRuntime} from './discover-publishing-runtime.mjs';
export async function installRuntime(source,data,platform='wechat',{discover=discoverRuntime,install}={}){
 if(![22,24].includes(Number(process.versions.node.split('.')[0])))throw Error('Install system Node.js 22 or 24 first. NUTBOOK does not install a second copy.');
 const status=await discover({source,data,platform});
 if(status.ready){console.log('Existing system tools found; nothing to install. Browser startup is checked when sending.');return status;}
 if(status.driver?.state==='invalid')throw Error('Publishing driver is damaged. Reinstall NUTBOOK.');
 if(platform==='x')throw Error('Install Google Chrome from google.com/chrome, then check again. Your existing browser is not replaced.');
 if(status.browser.state==='incompatible')throw Error('Existing browser could not be verified. Update it or ask your agent to diagnose it, then check again. No second browser was installed.');
 console.log('No compatible browser found. Installing only Chromium into the shared Playwright cache (estimated 150–250 MB download, 400–600 MB disk). Existing Node is reused.');
 if(install)await install();
 else await new Promise((accept,reject)=>{
  const env={...process.env};delete env.NODE_OPTIONS;delete env.NODE_PATH;delete env.PLAYWRIGHT_BROWSERS_PATH;
  const child=spawn(process.execPath,[join(source,'node_modules/playwright-core/cli.js'),'install','--no-shell','chromium'],{env,stdio:'inherit'});
  child.once('error',reject);child.once('exit',code=>code===0?accept():reject(Error('Browser installation failed: '+code)));
 });
 const checked=await discover({source,data,platform});
 if(!checked.ready)throw Error('Browser installed but verification failed. Existing tools were not replaced; check again or ask your agent to diagnose it.');
 console.log('Shared browser found. Return to NUTBOOK and check again.');return checked;
}
if(process.argv[1]&&await realpath(process.argv[1]).catch(()=>'')===fileURLToPath(import.meta.url)){
 try{
  delete process.env.PLAYWRIGHT_BROWSERS_PATH;
  const args=process.argv.slice(2);
  if(args[0]!=='--source'||args[2]!=='--target'||![4,6].includes(args.length)||(args.length===6&&args[4]!=='--platform'))throw Error('Usage: node install.mjs --source <setup directory> --target <app data directory> [--platform wechat|weibo|x]');
  const platform=args[5]||'wechat';if(!['wechat','weibo','x'].includes(platform))throw Error('Invalid platform');
  await installRuntime(args[1],args[3],platform);
 }catch(error){console.error('Publishing setup: '+error.message);process.exitCode=1;}
}
