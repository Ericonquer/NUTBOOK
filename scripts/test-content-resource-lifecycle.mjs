import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {pathToFileURL} from 'node:url';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 await page.goto(pathToFileURL(`${process.cwd()}/dist/index.html`).href);
 await page.waitForFunction(()=>typeof replaceTabPreview==='function'&&!appState.isBooting);
 const report=await page.evaluate(async()=>{
  const released=[];
  const original=invoke;
  appState.isTauri=true;
  invoke=async(command,args)=>{if(command==='release_document_resource'){released.push(args.origin);return true;}return original(command,args);};
  const tab={preview:{resourceOrigin:'old-generation'}};
  replaceTabPreview(tab,{resourceOrigin:'new-generation'});
  replaceTabPreview(tab,{resourceOrigin:'new-generation'});
  appState.inspector.snapshot={resourceOrigin:'inspector-generation'};
  destroyInspectorEditorOnly();
  await Promise.resolve();
  return {released,current:tab.preview.resourceOrigin};
 });
 assert.deepEqual(report.released,['old-generation','inspector-generation']);
 assert.equal(report.current,'new-generation');
 console.log('Superseded preview and inspector resources release their exact generation; current grant is retained.');
} finally {await browser.close();}
