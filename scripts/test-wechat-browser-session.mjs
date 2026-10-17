import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {createBrowserSession} from './wechat/browser-session.mjs';
const server=createServer((request,response)=>{
 if(request.url==='/login'){response.writeHead(302,{'Set-Cookie':'logged=yes; Path=/; HttpOnly',Location:'/cgi-bin/home'});response.end();return;}
 if(request.url==='/'){if(request.headers.cookie?.includes('logged=yes')){response.writeHead(302,{Location:'/cgi-bin/home'});response.end();}else{response.end('<button onclick="location.href=\'/login\'">Test login</button>');}return;}
 response.end('<h1>Authenticated local fixture</h1>');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const homeUrl=`http://127.0.0.1:${server.address().port}/`;
const directory=await mkdtemp(join(tmpdir(),'nutbook-wechat-session-'));
let session;
const launches=[];
// Exercise real Chromium cookie/profile behavior without showing test fixture windows.
const factory={launch:options=>{launches.push(options.headless);return chromium.launch({...options,headless:true});},launchPersistentContext:(path,options)=>{launches.push(options.headless);return chromium.launchPersistentContext(path,{...options,headless:true});}};
try{
 let login;
 session=createBrowserSession({chromium:factory,directory,rememberLogin:true,homeUrl,progress:event=>{if(event.stage==='waiting_for_scan')login=session.context.pages().at(-1).getByRole('button',{name:'Test login'}).click();}});
 await session.connect();await login;
 assert.deepEqual(launches,[true,false,true],'expired session requests one visible login, then resumes headless');
 await session.close();
 launches.length=0;
 session=createBrowserSession({chromium:factory,directory,rememberLogin:true,homeUrl});
 await session.connect();
 assert.deepEqual(launches,[true],'retained login never requests a visible window');
 await session.show();assert.deepEqual(launches,[true,false],'only explicit View requests a window');
 await session.close();
 launches.length=0;
 const ephemeral=join(directory,'ephemeral');
 session=createBrowserSession({chromium:factory,directory:ephemeral,rememberLogin:false,homeUrl,progress:event=>{if(event.stage==='waiting_for_scan')login=session.context.pages().at(-1).getByRole('button',{name:'Test login'}).click();}});
 await session.connect();await login;
 assert.deepEqual(launches,[true,false,true]);
 await assert.rejects(readdir(ephemeral),{code:'ENOENT'},'ephemeral login is never written to a profile');
 await session.close();
 launches.length=0;
 const controller=new AbortController();
 session=createBrowserSession({chromium:factory,directory:ephemeral,rememberLogin:false,homeUrl,signal:controller.signal,progress:event=>{if(event.stage==='waiting_for_scan')controller.abort();}});
 await assert.rejects(session.connect());
 await session.waitForClose();
 console.log('Real Chromium local auth harness: retained headless login, scan-to-headless switch, explicit View, ephemeral memory-only state and scan cancellation passed.');
}finally{await session?.close();await rm(directory,{recursive:true,force:true});await new Promise(resolve=>server.close(resolve));}
