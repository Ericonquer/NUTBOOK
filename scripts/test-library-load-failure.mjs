import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const browser = await chromium.launch({headless:true});
try {
  const page=await browser.newPage();
  await page.goto(pathToFileURL(`${process.cwd()}/dist/index.html`).href);
  await page.waitForFunction(()=>typeof loadLibraries==='function'&&!appState.isBooting);
  await page.evaluate(async()=>{
    window.originalInvoke=invoke;
    invoke=async(command,args)=>{
      if(command==='list_libraries')throw new Error('SQLITE_CANTOPEN canary');
      return originalInvoke(command,args);
    };
    appState.homeLayout='grid';
    await loadLibraries(); await loadItems();
  });
  await page.locator('[data-retry-library-load]:visible').waitFor();
  assert.match(await page.locator('#itemList').innerText(),/SQLITE_CANTOPEN canary/);
  assert.doesNotMatch(await page.locator('#itemList').innerText(),/还没有文件|No files yet/);
  await page.evaluate(()=>{invoke=originalInvoke;});
  await page.locator('[data-retry-library-load]:visible').click();
  await page.waitForFunction(()=>!appState.libraryLoadError&&!appState.itemLoadError);
  await page.locator('[data-retry-library-load]:visible').waitFor({state:'hidden'});
  await page.evaluate(async()=>{
    invoke=async(command,args)=>{if(command==='list_items')throw new Error('ITEM_READ canary');return originalInvoke(command,args);};
    appState.homeLayout='inspector';applyHomeLayout();await loadItems();
  });
  await page.locator('[data-retry-library-load]:visible').waitFor();
  assert.match(await page.locator('#inspectorRows').innerText(),/ITEM_READ canary/);
  await page.evaluate(()=>{invoke=originalInvoke;});
  await page.locator('[data-retry-library-load]:visible').click();
  await page.waitForFunction(()=>!appState.libraryLoadError&&!appState.itemLoadError);
  console.log('Library/list errors stay distinct from empty libraries; grid/inspector retries recover.');
} finally {await browser.close();}
