import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {pathToFileURL} from 'node:url';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(`${process.cwd()}/dist/index.html`).href);await page.waitForFunction(()=>typeof loadItems==='function'&&!appState.isBooting);
 await page.evaluate(async()=>{
  const seed=structuredClone(mockData.items[0]);window.originalInvoke=invoke;window.calls=[];window.starts=0;
  window.folder={id:880,name:'motion-lab',rootPath:'/stream/motion-lab',sourceKind:'folder',pathState:'valid',scanIncomplete:true};
  window.makeItems=count=>Array.from({length:count},(_,index)=>({...seed,id:index+1,libraryId:880,fileName:`batch-${String(index+1).padStart(4,'0')}.md`,title:`Batch ${index+1}`,fileType:'markdown',filePath:`/stream/motion-lab/batch-${index+1}.md`,relativePath:`batch-${index+1}.md`,isFavorite:false}));
  mockData.items=[];mockData.libraries=[];appState.libraries=[];appState.items=[];appState.activeLibraryId=null;appState.homeLayout='grid';appState.browseMode='all';appState.appliedSearch='';appState.isSettingsOpen=false;appState.homeTabOpen=true;appState.activeTabId=null;appState.tagBatchSelected.clear();
  invoke=async(command,args)=>{
   calls.push([command,args]);
   if(command==='start_folder_preflight')return {opId:99};
   if(command==='folder_preflight_status')return {status:'done',summary:{candidateCount:1000,skippedCount:0,mergeSingleFileCount:0,preserveSingleFileCount:0,opId:99,rootPath:folder.rootPath}};
   if(command==='start_folder_ingest'){starts++;window.statusNow={opId:300+starts,status:'running',total:1000,processed:0,committedCount:0};return {opId:300+starts};}
   if(command==='folder_ingest_status')return structuredClone(statusNow);
   if(command==='cancel_folder_ingest'){statusNow={...statusNow,status:'done',cancelRequested:true,response:{cancelled:true,committedCount:150,failedCount:0,library:folder,createdCount:150,mergedItemCount:0,preservedSingleFileCount:0}};return true;}
   if(command==='list_libraries')return structuredClone(mockData.libraries);
   return originalInvoke(command,args);
  };
  await loadItems();renderTabs();renderViewer();window.firstResolved=false;
  window.firstImport=ingestFolderWithConfirmation(folder.rootPath).then(()=>firstResolved=true);
 });
 await page.locator('[data-confirm-ok]').waitFor();await page.locator('[data-confirm-ok]').click();await page.waitForFunction(()=>starts===1&&!!appState.folderImportProgressSink);
 const publish=async count=>page.evaluate(count=>{mockData.libraries=[folder];mockData.items=makeItems(count);statusNow={opId:300+starts,status:'running',total:1000,processed:count,committedCount:count,library:folder};window.__NUTBOOK_HANDLE_FOLDER_IMPORT_PROGRESS__(structuredClone(statusNow));},count);
 await publish(50);await page.waitForFunction(()=>document.querySelectorAll('[data-open-item]').length===50);
 assert.equal(await page.evaluate(()=>firstResolved),false,'first batch is visible before the task completes');assert.equal(await page.locator('#itemList').evaluate(n=>n.classList.contains('empty-mode')),false);
 await page.locator('[data-open-item="1"]').dblclick();await page.waitForFunction(()=>getActiveTab()?.id===1);
 await publish(100);await page.waitForFunction(()=>appState.items.length===100);assert.equal(await page.evaluate(()=>getActiveTab()?.id),1,'later batches do not navigate away from an opened file');
 await page.evaluate(()=>showAllFilesHome());
 await page.locator('#itemList').evaluate(n=>n.scrollTop=250);const scroll=await page.locator('#itemList').evaluate(n=>n.scrollTop);await page.evaluate(()=>appState.tagBatchSelected.add(1));
 await publish(150);await page.waitForFunction(()=>document.querySelectorAll('[data-open-item]').length===150);assert.ok(Math.abs(await page.locator('#itemList').evaluate(n=>n.scrollTop)-scroll)<3,'append keeps the scroll anchor');assert.equal(await page.evaluate(()=>appState.tagBatchSelected.has(1)),true);
 await page.locator('#folderIngestCancelChip').click();await page.waitForFunction(()=>firstResolved);assert.equal(await page.locator('[data-open-item]').count(),150);assert.match(await page.locator('[data-task-message]').textContent(),/保留 150/);
 await page.evaluate(()=>{appState.isSettingsOpen=true;appState.settingsTab='libraries';appState.settingsLibrarySection='folders';renderSettingsPanel();});
 const warning=page.locator('[data-settings-scan-incomplete="880"]');await warning.waitFor();await warning.hover();await page.locator('#sourceScanTooltip').waitFor();assert.match(await page.locator('#sourceScanTooltip').textContent(),/点击“扫描”可继续/);
 await warning.focus();assert.equal(await page.locator('#sourceScanTooltip').isVisible(),true);await page.locator('.settings-modal').screenshot({path:'/tmp/nutbook-folder-incomplete-warning.png'});
 await page.locator('[data-settings-scan-library="880"]').click();await page.waitForFunction(()=>starts===2&&!!appState.folderImportProgressSink);assert.equal(await page.locator('[data-confirm-ok]').count(),0,'Scan resumes a known folder without a second connection confirmation');
 await page.evaluate(()=>{folder.scanIncomplete=false;mockData.libraries=[folder];mockData.items=makeItems(1000);statusNow={opId:302,status:'done',total:1000,committedCount:1000,library:folder,response:{cancelled:false,failedCount:0,committedCount:1000,library:folder,createdCount:850,mergedItemCount:0,preservedSingleFileCount:0}};window.__NUTBOOK_HANDLE_FOLDER_IMPORT_PROGRESS__(structuredClone(statusNow));});
 await page.waitForFunction(()=>!appState.folderImportInProgress&&appState.items.length===1000);assert.equal(await warning.count(),0,'completion removes the durable incomplete marker');assert.equal(await page.evaluate(()=>new Set(appState.items.map(n=>n.id)).size),1000);assert.equal(await page.evaluate(()=>calls.filter(([c])=>c==='scan_library').length),0,'incomplete Scan uses the streaming resume path');
 assert.deepEqual(errors,[]);console.log('Actual UI entry: first batch replaces empty state, files open during import, append preserves scroll/selection, cancel retains rows, warning tooltip and Scan resume clear on completion (mock transport, not native GUI)');
}finally{await browser.close();}
