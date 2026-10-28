import {copyFileSync,cpSync,rmSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
const output=resolve('src-tauri/generated-resources/publishing-runtime');
// Generated workers must not retain scripts removed from source.
rmSync(join(output,'worker'),{recursive:true,force:true});
mkdirSync(join(output,'worker'),{recursive:true});
const lock=JSON.parse(readFileSync('package-lock.json','utf8')).packages['node_modules/playwright-core'];
if(!/^\d+\.\d+\.\d+$/.test(lock.version)||!lock.integrity.startsWith('sha512-'))throw Error('Invalid pinned Playwright package');
const files=[];
for(const name of readdirSync('scripts/wechat').filter(name=>name.endsWith('.mjs')).sort()){
 const path='worker/'+name;const bytes=readFileSync(join('scripts/wechat',name));
 copyFileSync(join('scripts/wechat',name),join(output,path));
 files.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});
}
copyFileSync('scripts/install-publishing-runtime.mjs',join(output,'install.mjs'));
copyFileSync('scripts/discover-publishing-runtime.mjs',join(output,'discover-publishing-runtime.mjs'));
rmSync(join(output,'node_modules/playwright-core'),{recursive:true,force:true});
mkdirSync(join(output,'node_modules'),{recursive:true});
cpSync('node_modules/playwright-core',join(output,'node_modules/playwright-core'),{recursive:true});
const descriptor={version:2,platform:process.platform,arch:process.arch,nodeMajors:[22,24],playwrightVersion:lock.version,playwrightIntegrity:lock.integrity,files};
descriptor.id=createHash('sha256').update(JSON.stringify(descriptor)).update(readFileSync('scripts/install-publishing-runtime.mjs')).update(readFileSync('scripts/discover-publishing-runtime.mjs')).digest('hex');
writeFileSync(join(output,'bundle.json'),JSON.stringify(descriptor,null,2)+'\n');
console.log('Prepared lightweight publishing setup (bundled driver only; no Node or browser): '+descriptor.id.slice(0,12));
