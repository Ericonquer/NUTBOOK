import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const version='22.22.2';
export async function nodeDistribution(){
 if(process.env.NUTBOOK_NODE_DISTRIBUTION){
  const directory=resolve(process.env.NUTBOOK_NODE_DISTRIBUTION);
  const binary=join(directory,process.platform==='win32'?'node.exe':'bin/node');
  if(execFileSync(binary,['--version'],{encoding:'utf8'}).trim()!==`v${version}`)throw Error('Wrong standalone Node version');
  if(process.platform==='darwin'){
   const deps=execFileSync('otool',['-L',binary],{encoding:'utf8'}).split('\n').slice(1).map(s=>s.trim()).filter(Boolean);
   if(deps.some(s=>!s.startsWith('/usr/lib/')&&!s.startsWith('/System/Library/')))throw Error('Node has non-system dynamic dependencies');
  }
  return {binary,license:join(directory,'LICENSE')};
 }
 const name=`node-v${version}-${process.platform==='win32'?'win':process.platform}-${process.arch}`;
 const extension=process.platform==='win32'?'zip':'tar.gz';
 const cache=resolve('src-tauri/.cache/wechat-node');await mkdir(cache,{recursive:true});
 const binary=join(cache,name,process.platform==='win32'?'node.exe':'bin/node');
 try{await access(binary);return {binary,license:join(cache,name,'LICENSE')};}catch{}
 const base=`https://nodejs.org/dist/v${version}/`;
 const download=async file=>{const response=await fetch(base+file);if(!response.ok)throw Error(`Cannot download official Node: ${response.status}`);return Buffer.from(await response.arrayBuffer());};
 const checksums=(await download('SHASUMS256.txt')).toString();
 const archiveName=`${name}.${extension}`;
 const expected=checksums.split('\n').map(line=>line.trim().split(/\s+/)).find(parts=>parts[1]===archiveName)?.[0];
 if(!expected)throw Error('Official Node checksum missing');
 const bytes=await download(archiveName);
 if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('Official Node archive checksum mismatch');
 const archive=join(cache,archiveName);await writeFile(archive,bytes);
 execFileSync('tar',['-xf',archive,'-C',cache]);
 if(execFileSync(binary,['--version'],{encoding:'utf8'}).trim()!==`v${version}`)throw Error('Extracted Node version mismatch');
 return {binary,license:join(cache,name,'LICENSE')};
}
