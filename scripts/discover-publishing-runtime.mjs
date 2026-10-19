/** Read-only local runtime probe. Never downloads, signs in, or opens a platform. */
import {access,readFile,readdir,realpath,stat} from 'node:fs/promises';
import {join,dirname,delimiter,isAbsolute,relative} from 'node:path';
import {homedir} from 'node:os';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {constants} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export async function inspectExecutable(path){
 if(!(await stat(path)).isFile())throw Error('NOT_A_FILE');
 await access(path,process.platform==='win32'?constants.F_OK:constants.X_OK);
 let version;
 if(process.platform==='darwin'&&path.includes('.app/Contents/MacOS/')){
  const plist=path.slice(0,path.indexOf('.app/Contents/MacOS/')+4)+'/Contents/Info.plist';
  const result=await exec('/usr/bin/plutil',['-extract','CFBundleShortVersionString','raw','-o','-',plist],{timeout:2000}).catch(()=>null);
  version=result?.stdout.trim();
 }
 return {version};
}
export function systemBrowsers(platform=process.platform,env=process.env,home=homedir()){
 const entries=[];
 const add=(path,name)=>entries.push({path,name});
 if(platform==='darwin'){
  for(const root of ['/Applications',join(home,'Applications')]){
   add(join(root,'Google Chrome.app/Contents/MacOS/Google Chrome'),'Google Chrome');
   add(join(root,'Microsoft Edge.app/Contents/MacOS/Microsoft Edge'),'Microsoft Edge');
   add(join(root,'Chromium.app/Contents/MacOS/Chromium'),'Chromium');
  }
 }else if(platform==='win32'){
  for(const root of [env.PROGRAMFILES,env['PROGRAMFILES(X86)'],env.LOCALAPPDATA].filter(Boolean)){
   add(join(root,'Google/Chrome/Application/chrome.exe'),'Google Chrome');
   add(join(root,'Microsoft/Edge/Application/msedge.exe'),'Microsoft Edge');
  }
 }else for(const root of [...(env.PATH||'').split(delimiter),'/usr/bin','/opt/google/chrome'].filter(Boolean)){
  for(const [name,label] of [['google-chrome','Google Chrome'],['google-chrome-stable','Google Chrome'],['chromium','Chromium'],['chromium-browser','Chromium'],['microsoft-edge','Microsoft Edge']])add(join(root,name),label);
 }
 return entries;
}
export async function legacyBrowsers(data){
 const entries=[];
 if(!data)return entries;
 const base=join(data,'publishing-runtime');
 for(const name of await readdir(base).catch(()=>[])){
  if(!/^[a-f0-9]{64}$/.test(name))continue;
  try{
   const root=await realpath(join(base,name));
   const meta=JSON.parse(await readFile(join(root,'runtime.json'),'utf8'));
   if(typeof meta.executable!=='string'||isAbsolute(meta.executable))continue;
   const path=await realpath(join(root,meta.executable));
   const rel=relative(root,path);if(rel.startsWith('..')||isAbsolute(rel))continue;
   entries.push({path,name:'Existing Chromium'});
  }catch{}
 }
 return entries;
}
export async function discoverRuntime({source,data,platform='wechat',chromium,candidates,inspect=inspectExecutable}={}){
 const major=Number(process.versions.node.split('.')[0]);
 if(![22,24].includes(major))return {ready:false,node:{state:'incompatible',version:process.version},browser:{state:'unchecked'}};
 if(!chromium){({chromium}=await import(pathToFileURL(join(source,'node_modules/playwright-core/index.mjs')).href));}
 const node={state:'ready',path:process.execPath,version:process.version};
 const list=candidates??[...systemBrowsers(),{path:chromium.executablePath(),name:'Shared Chromium'},...await legacyBrowsers(data)];
 const seen=new Set(),failures=[],browsers=[];
 for(const candidate of list){
  let path;try{path=await realpath(candidate.path);await access(path);}catch{continue;}
  if(seen.has(path))continue;seen.add(path);
  try{
   const metadata=await inspect(path);
   browsers.push({state:'available',path,name:candidate.name,...metadata,validation:'deferred_until_send'});
  }catch{failures.push({name:candidate.name,state:'incompatible'});}
 }
 const browser=browsers.find(candidate=>platform!=='x'||candidate.name==='Google Chrome');
 return {ready:!!browser,node,browser:browser||{state:failures.some(item=>platform!=='x'||item.name==='Google Chrome')?'incompatible':'missing',name:platform==='x'?'Google Chrome':'Chrome / Chromium / Edge'},browsers,failures};
}
if(process.argv[1]&&await realpath(process.argv[1]).catch(()=>'')===fileURLToPath(import.meta.url)){
 try{console.log(JSON.stringify(await discoverRuntime({source:dirname(fileURLToPath(import.meta.url)),data:process.argv[2],platform:process.argv[3]})));}
 catch{console.log(JSON.stringify({ready:false,node:{state:'ready',path:process.execPath,version:process.version},browser:{state:'unchecked'},driver:{state:'invalid'}}));}
}
