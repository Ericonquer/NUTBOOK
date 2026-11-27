// Explicit native acceptance, separate from Chromium mock/DOM checks.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
assert(['darwin','win32'].includes(process.platform),'native protocol gate requires macOS or Windows');
const release=process.argv.includes('--release');
const evidence=process.env.NUTBOOK_SMOKE_REPORT;
if(evidence)mkdirSync(evidence,{recursive:true});
if(!process.argv.includes('--no-build')){
 const build=spawnSync('cargo',['build',...(release?['--release','--features','tauri/custom-protocol']:[]),'--manifest-path','src-tauri/Cargo.toml','--example','content_protocol_probe'],{stdio:'inherit'});
 assert.equal(build.status,0);
}
const binary=resolve(process.env.NUTBOOK_PROTOCOL_PROBE_BIN||`src-tauri/target/${release?'release':'debug'}/examples/content_protocol_probe${process.platform==='win32'?'.exe':''}`);
const root=mkdtempSync(join(tmpdir(),'nutbook-native-resource-'));
try {
 let previous='';
 for(let run=0;run<2;run++) {
  const output=join(root,`run-${run}.json`);
  const start=Date.now();
  console.log(`Starting native protocol probe ${run + 1}/2`);
  const result=spawnSync(binary,[],{encoding:'utf8',timeout:30000,env:{...process.env,NUTBOOK_PROTOCOL_PROBE_OUT:output,NUTBOOK_PROTOCOL_PROBE_OLD_URL:previous}});
  const stderr=result.stderr?.slice(-16000);
  if(stderr)process.stderr.write(stderr);
  console.log(`Native protocol probe ${run + 1}/2 returned after ${Date.now()-start} ms (status=${result.status}, signal=${result.signal})`);
  if(evidence){
   writeFileSync(join(evidence,`protocol-${run}-process.json`),JSON.stringify({status:result.status,signal:result.signal,error:result.error?.message,stderr},null,2));
   try{writeFileSync(join(evidence,`protocol-${run}.json`),readFileSync(output));}catch{}
  }
  assert.equal(result.status,0,result.error?.message||stderr);
  const report=JSON.parse(readFileSync(output,'utf8'));
  if(evidence)writeFileSync(join(evidence,`protocol-${run}.json`),JSON.stringify(report,null,2));
  assert.equal(report.ok,true,JSON.stringify(report));
  assert.equal(report.fd.sessions,10000);
  assert.ok(report.fd.after<=report.fd.before+2);
  assert.equal(report.oldAddressDenied,true);
  assert.equal(report.secureContext,true);
  if(process.platform==='win32'){assert.equal(report.mappedFrames?.opaqueSrcdoc,10);assert.equal(report.mappedFrames?.opaqueNavigated,10);}
  for(const key of ['css','module','image','fetch','crossDenied','resourceBurst','crypto','storage','revoked'])assert.equal(report[key],true,key);
  assert(report.fd.before>0,'resource counter must be real');
  previous=report.href;
  console.log(JSON.stringify({run,...report}));
 }
}finally{rmSync(root,{recursive:true,force:true});}
