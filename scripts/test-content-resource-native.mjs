// Explicit native acceptance, separate from Chromium mock/DOM checks.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
if(process.platform!=='darwin')throw new Error('This gate currently requires native macOS/WKWebView; run platform-specific acceptance on Windows/Linux separately.');
const build=spawnSync('cargo',['build','--manifest-path','src-tauri/Cargo.toml','--example','content_protocol_probe'],{stdio:'inherit'});
assert.equal(build.status,0);
const root=mkdtempSync(join(tmpdir(),'nutbook-native-resource-'));
try {
 let previous='';
 for(let run=0;run<2;run++) {
  const output=join(root,`run-${run}.json`);
  const result=spawnSync('src-tauri/target/debug/examples/content_protocol_probe',[],{encoding:'utf8',timeout:30000,env:{...process.env,NUTBOOK_PROTOCOL_PROBE_OUT:output,NUTBOOK_PROTOCOL_PROBE_OLD_URL:previous}});
  assert.equal(result.status,0,result.stderr||result.error?.message);
  const report=JSON.parse(readFileSync(output,'utf8'));
  assert.equal(report.ok,true,JSON.stringify(report));
  assert.equal(report.fd.sessions,10000);
  assert.ok(report.fd.after<=report.fd.before+2);
  assert.equal(report.oldAddressDenied,true);
  previous=report.href;
  console.log(JSON.stringify({run,...report}));
 }
}finally{rmSync(root,{recursive:true,force:true});}
