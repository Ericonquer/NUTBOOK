import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
for(const match of readFileSync('dist/index.html','utf8').matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
const browser=await chromium.launch({headless:true,ignoreDefaultArgs:["--hide-scrollbars"]});
try{
 const page=await browser.newPage({viewport:{width:1158,height:862}}),errors=[];
 page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(10000);
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(pathToFileURL(`${process.cwd()}/dist/index.html`).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof renderSettingsPanel==='function');
 await page.evaluate(()=>{
  appState.language='zh-CN';appState.isSettingsOpen=true;appState.settingsTab='libraries';appState.settingsLibrarySection='files';
  appState.libraries=[
   {id:501,name:'工作区',rootPath:'/Users/me/Workspace',sourceKind:'folder',pathState:'valid'},
   {id:502,name:'客户案例.md',rootPath:'/Users/me/Workspace/samples/客户案例.md',sourceKind:'file',pathState:'valid'},
   {id:503,name:'演示案例.html',rootPath:'/Users/me/Documents/output/文章/演示案例.html',sourceKind:'file',pathState:'missing'},
   {id:504,name:'项目产物',rootPath:'/Users/me/projects/project/output',sourceKind:'agent_project',pathState:'valid'}
  ];
  appState.ignoredItems=[{itemId:601,fileName:'已移除.md',filePath:'/Users/me/Workspace/archive/已移除.md',libraryName:'工作区',createdAt:'2026-10-22'}];
  renderSettingsPanel();
 });
 const aligned=async selector=>{const button=await page.locator(selector).boundingBox(),table=await page.locator('#settingsLibraryList .source-manager-table').boundingBox();assert.ok(Math.abs(button.x+button.width-table.x-table.width)<2,'add button aligns with the table edge');};
 await aligned('[data-settings-add-file]');
 const rows=page.locator('#settingsLibraryList .source-manager-row');
 assert.equal(await rows.count(),2);
 assert.notEqual(await rows.first().locator('.source-manager-symbol').innerHTML(),await rows.last().locator('.source-manager-symbol').innerHTML(),'Markdown and HTML have distinct glyphs');
 const paths=await rows.locator('.settings-row-path').allTextContents();
 assert.deepEqual(paths,['工作区 / samples','output / 文章']);
 assert.equal(await rows.first().locator('.settings-row-path').getAttribute('title'),'/Users/me/Workspace/samples/客户案例.md');
 assert.equal(await rows.locator('[data-settings-scan-library="502"]').count(),1);
 assert.equal(await rows.locator('[data-settings-delete-library="502"]').count(),1);
 assert.match(await rows.last().textContent(),/路径失效/);
 assert.equal(await rows.last().locator('[data-settings-scan-library="503"]').getAttribute('title'),'修正路径');
 assert.equal(await rows.first().locator('.settings-row-path').evaluate(node=>getComputedStyle(node).whiteSpace),'nowrap');
 await page.locator('.settings-modal').screenshot({path:'/tmp/nutbook-file-management-desktop.png'});
 await page.setViewportSize({width:700,height:862});
 await page.locator('.settings-modal').screenshot({path:'/tmp/nutbook-file-management-narrow.png'});
 await page.setViewportSize({width:1158,height:862});
 await page.evaluate(()=>{appState.settingsSourceSearch='/Users/me/Documents';renderSettingsPanel();});
 assert.equal(await rows.count(),1,'search still matches the complete absolute path');
 await page.evaluate(()=>{appState.settingsSourceSearch='';appState.settingsLibrarySection='folders';renderSettingsPanel();});
 assert.equal(await page.locator('#settingsLibraryList [data-settings-scan-library="501"]').count(),1);await aligned('[data-settings-add-folder]');
 await page.evaluate(()=>{appState.settingsLibrarySection='projects';renderSettingsPanel();});
 assert.equal(await page.locator('#settingsLibraryList .source-manager-row [data-settings-open-artifact-access="projects"]').count(),1);
 await page.evaluate(()=>{appState.settingsLibrarySection='removed';renderSettingsPanel();});
 assert.equal(await page.locator('#settingsIgnoredList [data-settings-restore-ignored="601"]').count(),1);
 assert.equal(await page.locator('#settingsIgnoredList [data-settings-ignored-select="601"]').count(),1);
 assert.equal(await page.locator('#settingsIgnoredList .settings-row-path').textContent(),'工作区 / archive');
 assert.equal(await page.evaluate(()=>appState.libraries.find(item=>item.id===502).rootPath),'/Users/me/Workspace/samples/客户案例.md','display shortening must never rewrite source identity');
 await page.evaluate(()=>{appState.settingsLibrarySection='files';for(let n=0;n<40;n++)appState.libraries.push({id:700+n,name:`file-${n}.md`,rootPath:`/Users/me/Workspace/many/file-${n}.md`,sourceKind:'file',pathState:'valid'});renderSettingsPanel();});
 const viewport=page.locator('#settingsLibraryList > .settings-list-viewport');
 await aligned('[data-settings-add-file]');assert.equal(await viewport.evaluate(node=>getComputedStyle(node,'::-webkit-scrollbar').width),'6px');
 const metrics=await viewport.evaluate(node=>({height:node.clientHeight,scroll:node.scrollHeight}));
 assert.ok(metrics.scroll>metrics.height+100,`long source list must overflow its scroll viewport: ${JSON.stringify(metrics)}`);
 const box=await viewport.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.wheel(0,600);
 await page.waitForFunction(()=>document.querySelector('#settingsLibraryList > .settings-list-viewport').scrollTop>0);
 await page.locator('.settings-modal').screenshot({path:'/tmp/nutbook-source-thin-scrollbar.png'});
 await viewport.evaluate(node=>node.scrollTop=node.scrollHeight);
 const last=await page.locator('#settingsLibraryList .source-manager-row').last().boundingBox();
 assert.ok(last.y+last.height<=box.y+box.height+1,'last source row must be reachable');
 await page.evaluate(()=>{const item=appState.libraries.find(library=>library.id===502);item.rootPath='/Users/me/'+('long-directory-name'.repeat(20))+'/sample.html';renderSettingsPanel();});
 await page.locator('[data-settings-delete-library="502"]').click();
 await page.locator('.confirm-detail-value').waitFor();
 const detail=await page.locator('.confirm-detail').evaluate(node=>({width:node.clientWidth,scroll:node.scrollWidth}));
 assert.ok(detail.scroll<=detail.width,'confirmation path must fit inside its detail panel');
 const value=await page.locator('.confirm-detail-value').evaluate(node=>({width:node.clientWidth,scroll:node.scrollWidth,text:node.textContent}));
 assert.ok(value.scroll<=value.width,'even an unbroken long path wraps inside its panel');
 assert.equal(value.text,await page.evaluate(()=>appState.libraries.find(item=>item.id===502).rootPath));
 assert.equal(await page.locator('.confirm-detail-label').evaluate(node=>getComputedStyle(node).whiteSpace),'nowrap');
 await page.locator('.confirm-card').screenshot({path:'/tmp/nutbook-remove-source-path.png'});
 await page.locator('[data-confirm-cancel]').click();
 assert.equal(await page.evaluate(()=>appState.libraries.some(item=>item.id===502)),true,'cancelling must keep the source');
 assert.deepEqual(errors,[]);
 console.log('file management layout/path/action regressions passed (not native GUI acceptance)');
}finally{await browser.close();}
