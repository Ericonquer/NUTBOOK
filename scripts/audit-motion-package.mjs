import {readFileSync,realpathSync,statSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readManifestStrict} from '../integrations/nbskill/scripts/manifest-lib.mjs';

export function auditMotionArtifacts(directory,files){
 const root=realpathSync(directory),resources=new Map(),artifacts=[];
 function localFile(path){const real=realpathSync(path),rel=relative(root,real);if(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel))throw new Error(`Resource escapes artifact directory: ${path}`);if(!statSync(real).isFile())throw new Error(`Resource is not a file: ${path}`);resources.set(real,statSync(real).size);return real;}
 for(const file of files){
  const path=localFile(resolve(root,file)),source=readFileSync(path,'utf8'),htmlBytes=Buffer.byteLength(source);
  if(htmlBytes>3*1024*1024)throw new Error(`${file}: HTML exceeds 3 MiB (${htmlBytes} bytes)`);
  const config=source.match(/<script\b[^>]*id=["']nutbook-motion-config["'][^>]*>[\s\S]*?<\/script>/i);
  if(!config)throw new Error(`${file}: missing motion config`);
  const following=source.slice(config.index+config[0].length).match(/^\s*<script\b[^>]*>([\s\S]*?)<\/script>/i);
  if(!following||!following[1].includes('__NUTBOOK_MOTION__'))throw new Error(`${file}: missing inline motion runtime`);
  const runtimeBytes=Buffer.byteLength(following[1]);if(runtimeBytes>2*1024*1024)throw new Error(`${file}: runtime exceeds 2 MiB`);
  const markup=source.replace(/<!--[\s\S]*?-->/g,'').replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi,'<script $1></script>');
  const refs=[];
  for(const tag of markup.matchAll(/<(?:img|script|link|video|audio|source)\b[^>]*>/gi)){
   for(const attr of tag[0].matchAll(/\b(?:src|href|poster)\s*=\s*["']([^"']*)["']/gi))refs.push(attr[1]);
   for(const attr of tag[0].matchAll(/\bsrcset\s*=\s*["']([^"']*)["']/gi)){
    if(!attr[1].startsWith('data:'))for(const candidate of attr[1].split(','))refs.push(candidate.trim().split(/\s+/)[0]);
   }
  }
  for(const value of markup.matchAll(/@import\s+["']([^"']+)["']/gi))refs.push(value[1]);
  for(const value of markup.matchAll(/url\(\s*["']?([^\s)'"<>]+)["']?\s*\)/gi))refs.push(value[1]);
  const dependencies=[];
  for(const ref of new Set(refs)){
   if(!ref||ref.startsWith('#')||ref.startsWith('data:'))continue;
   if(/^(?:[a-z][a-z0-9+.-]*:|\/|\\)/i.test(ref))throw new Error(`${file}: non-portable resource ${ref}`);
   const asset=localFile(resolve(dirname(path),decodeURIComponent(ref.split(/[?#]/)[0])));dependencies.push({path:relative(root,asset),bytes:statSync(asset).size});
  }
  artifacts.push({path:file,htmlBytes,runtimeBytes,dependencies});
 }
 const totalBytes=[...resources.values()].reduce((sum,bytes)=>sum+bytes,0);
 if(totalBytes>10*1024*1024)throw new Error(`Acceptance package exceeds 10 MiB (${totalBytes} bytes)`);
 return {version:1,limits:{runtimeBytes:2*1024*1024,htmlBytes:3*1024*1024,packageBytes:10*1024*1024},totalBytes,artifacts,portableReferences:true,nativeAcceptance:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const root=resolve(process.argv[2]||'docs/presentations/motion-gallery'),manifest=readManifestStrict(root);
 console.log(JSON.stringify(auditMotionArtifacts(root,manifest.entries.filter(entry=>entry.state==='active'&&entry.kind==='presentation').map(entry=>entry.path)),null,2));
}
