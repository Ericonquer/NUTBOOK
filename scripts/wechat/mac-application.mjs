/** Launch macOS browser bundles through LaunchServices, keeping application responsibility with the browser. */
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {EventEmitter} from 'node:events';
import {setTimeout as pause} from 'node:timers/promises';
const exec=promisify(execFile);
export function applicationBundle(executable,platform=process.platform){
 if(platform!=='darwin'||!executable)return null;
 const marker='.app/Contents/MacOS/';const index=executable.indexOf(marker);
 return index<0?null:executable.slice(0,index+4);
}
async function owned(pid,executable,profile){
 const {stdout}=await exec('/bin/ps',['-p',String(pid),'-o','command='],{timeout:2000});
 const command=stdout.trim();
 if(!command.startsWith(executable+' ')||!command.includes(`--user-data-dir=${profile} `))throw Error('INVALID_BROWSER_OWNER');
}
export async function quitOwnedApplication(pid,executable,profile){
 if(process.platform!=='darwin'||!Number.isSafeInteger(pid)||pid<=0)throw Error('INVALID_BROWSER_OWNER');
 await owned(pid,executable,profile);
 const source=`ObjC.import('AppKit'); var app=$.NSRunningApplication.runningApplicationWithProcessIdentifier(${pid}); (!app || !app.finishedLaunching) ? 'starting' : (app.terminate ? 'requested' : 'refused');`;
 for(let n=0;n<50;n++){
  const {stdout}=await exec('/usr/bin/osascript',['-l','JavaScript','-e',source],{timeout:5000});
  if(stdout.trim()==='requested')return;
  if(stdout.trim()!=='starting')throw Error('BROWSER_CLOSE_FAILED');
  await pause(100);
 }
 throw Error('BROWSER_CLOSE_TIMEOUT');
}
export async function launchMacApplication(executable,args,{activates=false}={}){
 const bundle=applicationBundle(executable);if(!bundle)throw Error('MAC_BROWSER_BUNDLE_REQUIRED');
 const profileArg=args.find(arg=>arg.startsWith('--user-data-dir='));
 const profile=profileArg?.slice('--user-data-dir='.length);if(!profile)throw Error('PRIVATE_BROWSER_PROFILE_REQUIRED');
 // AppKit/LaunchServices API; not browser automation or an AppleScript "tell application" request.
 const source=`ObjC.import('AppKit'); function run(argv) { var error=Ref(); var options=$.NSWorkspaceLaunchNewInstance | $.NSWorkspaceLaunchWithoutAddingToRecents; if(argv[2]!=='activate') options|=$.NSWorkspaceLaunchWithoutActivation; var config=$.NSDictionary.dictionaryWithObjectForKey($(JSON.parse(argv[1])), $.NSWorkspaceLaunchConfigurationArguments); var app=$.NSWorkspace.sharedWorkspace.launchApplicationAtURLOptionsConfigurationError($.NSURL.fileURLWithPath($(argv[0])),options,config,error); if(!app)throw Error('LaunchServices failed'); return String(app.processIdentifier); }`;
 const {stdout}=await exec('/usr/bin/osascript',['-l','JavaScript','-e',source,bundle,JSON.stringify(args),activates?'activate':'background'],{timeout:15000});
 const pid=Number(stdout.trim());if(!Number.isSafeInteger(pid)||pid<=0)throw Error('INVALID_BROWSER_LAUNCH_PID: '+JSON.stringify(stdout.trim()));
 const child=new EventEmitter();child.pid=pid;child.exitCode=null;child.signalCode=null;
 let monitoring=false,finished=false;
 const finish=()=>{if(finished)return;finished=true;clearInterval(timer);child.exitCode=0;child.emit('exit',0,null);};
 const timer=setInterval(async()=>{if(monitoring||finished)return;monitoring=true;try{await owned(pid,executable,profile);}catch{finish();}finally{monitoring=false;}},250);timer.unref();
 child.waitForExit=async()=>{for(let n=0;n<100&&!finished;n++)await pause(100);if(!finished)throw Error('BROWSER_STILL_RUNNING');};
 child.quit=async()=>{if(finished)return;await quitOwnedApplication(pid,executable,profile).catch(async error=>{try{await owned(pid,executable,profile);}catch{finish();return;}throw error;});await child.waitForExit();};
 return child;
}
export async function closeBrowserEndpoint(endpoint){
 const version=await (await fetch(`${endpoint}/json/version`,{signal:AbortSignal.timeout(5000)})).json();
 const url=new URL(version.webSocketDebuggerUrl);
 if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw Error('INVALID_BROWSER_ENDPOINT');
 const socket=new WebSocket(url);
 await new Promise((resolve,reject)=>{
  let done=false;const timer=setTimeout(()=>finish(Error('BROWSER_CLOSE_TIMEOUT')),5000);
  function finish(error){if(done)return;done=true;clearTimeout(timer);socket.close();error?reject(error):resolve();}
  socket.onopen=()=>socket.send(JSON.stringify({id:1,method:'Browser.close'}));
  socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id===1)finish(message.error?Error('BROWSER_CLOSE_FAILED'):null);};
  socket.onclose=()=>finish();socket.onerror=()=>finish(Error('BROWSER_CLOSE_FAILED'));
 });
}
