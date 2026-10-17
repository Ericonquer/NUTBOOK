import assert from 'node:assert/strict';
import {readFile,readdir,lstat,realpath} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]||'src-tauri/generated-resources/wechat-runtime');
const metadata=JSON.parse(await readFile(join(root,'runtime.json')));
assert.equal(metadata.platform,process.platform);assert.equal(metadata.arch,process.arch);
async function inspect(directory){for(const entry of await readdir(directory)){const path=join(directory,entry);const stat=await lstat(path);if(stat.isSymbolicLink()){const target=await realpath(path);assert.ok(target.startsWith(root+sep),'runtime symlink must stay within runtime');}else if(stat.isDirectory())await inspect(path);}}
await inspect(root);
const node=join(root,metadata.node);
if(process.platform==='darwin'){
 const dependencies=execFileSync('otool',['-L',node],{encoding:'utf8'}).split('\n').slice(1).map(s=>s.trim()).filter(Boolean);
 assert.ok(dependencies.every(s=>s.startsWith('/usr/lib/')||s.startsWith('/System/Library/')),'Node must not depend on local package managers');
}
const code=`import {chromium} from ${JSON.stringify(pathToFileURL(join(root,'node_modules/playwright-core/index.mjs')).href)};
const browser=await chromium.launch({headless:true,executablePath:${JSON.stringify(join(root,metadata.executable))}});
try{const page=await browser.newPage();await page.setContent('<h1>Offline runtime</h1>');if(await page.locator('h1').innerText()!=='Offline runtime')throw Error('Runtime failed');console.log('Offline runtime passed');}finally{await browser.close();}`;
const env={...process.env,PATH:''};delete env.NODE_PATH;delete env.NODE_OPTIONS;
const output=execFileSync(node,['--input-type=module','-e',code],{cwd:tmpdir(),env,encoding:'utf8',timeout:30000});
assert.match(output,/Offline runtime passed/);
console.log('Bundled runtime: contained symlinks, system-only Node libraries, browser launch outside repository with empty PATH passed.');
