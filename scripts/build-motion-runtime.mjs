import {build} from 'esbuild';
import {writeFileSync,renameSync,rmSync} from 'node:fs';
const output='src-tauri/resources/export-templates/motion-runtime.js';
const result=await build({entryPoints:['src/motion/runtime.mjs'],bundle:true,format:'iife',target:'safari15',write:false,legalComments:'none'});
const bytes=result.outputFiles[0].contents;
if(bytes.length>2*1024*1024)throw new Error(`Motion runtime exceeds 2 MiB: ${bytes.length} bytes`);
if(/<\/script/i.test(result.outputFiles[0].text))throw new Error('Motion runtime cannot be safely embedded');
const temporary=`${output}.${process.pid}.tmp`;
try{writeFileSync(temporary,bytes,{flag:'wx'});renameSync(temporary,output);}finally{rmSync(temporary,{force:true});}

const capture=await build({entryPoints:['src/motion/static-capture.mjs'],bundle:true,format:'iife',target:'safari15',write:false,legalComments:'none'});
writeFileSync('src-tauri/resources/export-templates/motion-static-capture.js',capture.outputFiles[0].contents);
