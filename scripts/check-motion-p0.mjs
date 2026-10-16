import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
if(Number(process.versions.node.split('.')[0])!==22)throw new Error('P0 checks require Node 22');
const output=mkdtempSync(join(tmpdir(),'nutbook-motion-p0-')),results=[];
const node=process.execPath;
const checks=[
 ['frontend-build','npm',['run','build:frontend']],
 ['frontend-check','npm',['run','check:frontend']],
 ['i18n','npm',['run','check:i18n']],
 ...['test-motion-contract','test-motion-measurement','test-motion-preparation','test-motion-host-save-guard','test-motion-package-budget','test-nbskill-motion','test-regressions'].map(name=>[name,node,[`scripts/${name}.mjs`]]),
 ['rust-contracts','cargo',['test','--manifest-path','src-tauri/Cargo.toml','--test','html_edit','--test','motion_contract']],
 ['rust-motion-protocol','cargo',['test','--manifest-path','src-tauri/Cargo.toml','motion_protocol','--lib']],
 ['rust-probe-compatibility','cargo',['test','--manifest-path','src-tauri/Cargo.toml','legacy_probe_omits_motion_extension','--lib']],
 ['rust-package','cargo',['test','--manifest-path','src-tauri/Cargo.toml','nbskill_package','--lib']],
 ['rust-check','cargo',['check','--manifest-path','src-tauri/Cargo.toml']],
 ['browser-edit-save',node,['scripts/test-motion-runtime.mjs','integrations/nbskill/templates/motion-presentation.html']],
 ...['test-motion-preview-behavior','test-motion-input-boundaries','test-motion-dispose-runtime','test-motion-panel-layout','test-motion-preparation-runtime','test-motion-unsupported-runtime','test-native-presentation-shortcut','test-native-presentation-dialog','test-html-edit-presentation-runtime','test-motion-performance-runtime'].map(name=>[name,node,[`scripts/${name}.mjs`]]),
 ['package-audit',node,['scripts/audit-motion-package.mjs']],
 ['diff-check','git',['diff','--check']],
];
try{
 for(const [name,command,args] of checks){
  console.log(`Checking ${name}…`);const started=Date.now();
  const result=spawnSync(command,args,{encoding:'utf8',env:{...process.env,PATH:process.env.PATH},maxBuffer:16*1024*1024});
  const log=join(output,`${name}.log`);writeFileSync(log,(result.stdout||'')+(result.stderr||'')+(result.error?.message||''));
  results.push({name,passed:result.status===0&&!result.error,durationMs:Date.now()-started,log});
  if(!results.at(-1).passed){console.error((result.stdout||'').slice(-2500)+(result.stderr||'').slice(-2500));throw new Error(`${name} failed; log: ${log}`);}
 }
 console.log(`P0 automated checks passed (${results.length}); native acceptance remains separate. Report: ${output}/summary.json`);
}finally{
 writeFileSync(join(output,'summary.json'),JSON.stringify({version:1,node:process.version,nativeAcceptance:false,passed:results.length===checks.length&&results.every(result=>result.passed),results},null,2));
}
