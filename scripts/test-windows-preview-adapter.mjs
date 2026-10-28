// Exercise the actual Windows screenshot adapter with an existing local engine.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright-core';
const browser=process.env.NUTBOOK_CHROME_PATH||(process.platform==='win32'?[process.env['ProgramFiles(x86)'],process.env.ProgramFiles].filter(Boolean).map(p=>join(p,'Microsoft/Edge/Application/msedge.exe')).find(existsSync):null)||chromium.executablePath();
const root=await mkdtemp(join(tmpdir(),'nutbook-preview-adapter-'));
const server=createServer((_,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><body><div id="a" style="position:fixed;inset:0;background:red"></div><div id="b" style="display:none;position:fixed;inset:0;background:blue"></div></body>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 const hashes=[];
 for(const selected of ['a','b']){
  const output=join(root,selected+'.png');
  const request={browser,url:`http://nb-capture-0123456789abcdef0123456789abcdef.localhost:${server.address().port}/`,output,init:'window.__NUTBOOK_CAPTURE_PURPOSE__="static";',setup:`(()=>{document.getElementById('a').style.display=${JSON.stringify(selected==='a'?'block':'none')};document.getElementById('b').style.display=${JSON.stringify(selected==='b'?'block':'none')};})()`};
  const child=spawn(process.execPath,['scripts/wechat/capture-presentation.mjs'],{stdio:['pipe','ignore','pipe'],windowsHide:true});let error='';child.stderr.on('data',x=>error+=x);child.stdin.end(JSON.stringify(request));
  const timeout=setTimeout(()=>child.kill(),20000);const code=await new Promise(resolve=>child.on('exit',resolve));clearTimeout(timeout);assert.equal(code,0,error);
  const bytes=await readFile(output);assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),2048);assert.equal(bytes.readUInt32BE(20),1152);hashes.push(createHash('sha256').update(bytes).digest('hex'));
 }
 assert.notEqual(hashes[0],hashes[1],'selected pages must produce different frames');
 console.log('Actual preview adapter: selected frames, PNG dimensions and clean exit passed');
}finally{await new Promise(resolve=>server.close(resolve));}
