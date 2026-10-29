import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const html=readFileSync('dist/index.html','utf8'),start=html.indexOf('      function updateFolderTaskProgress('),end=html.indexOf('      function showFolderPreflightCancelChip(',start);
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1000,height:700}});const styles=html.slice(html.indexOf('<style>')+7,html.indexOf('</style>'));
 await page.setContent(`<style>${styles}</style><div class="app-shell"><aside class="sidebar"></aside><main>Native content starts here</main></div>`);
 await page.addScriptTag({content:'const currentLanguage=()=>"zh-CN";'+html.slice(start,end)+';window.updateTask=updateFolderTaskProgress;'});
 await page.evaluate(()=>updateTask({message:'正在准备 50/1000 份 · 第 2/20 批',processed:50,total:1000,cancel:()=>window.cancelled=true,cancelId:'folderIngestCancelChip'}));
 const card=page.locator('#folderTaskProgress');assert.equal(await card.isVisible(),true);assert.equal(await card.locator('progress').getAttribute('value'),'50');
 const side=await page.locator('.sidebar').boundingBox(),box=await card.boundingBox();assert.ok(box.x>=side.x&&box.x+box.width<=side.x+side.width,'progress stays outside the native content surface');
 await card.getByRole('button',{name:'取消',exact:true}).click();assert.equal(await page.evaluate(()=>window.cancelled),true);
 await page.evaluate(()=>updateTask({message:'导入完成：新增 1000 份',done:true}));await page.waitForTimeout(300);assert.equal(await card.isVisible(),true,'fast import leaves a persistent receipt');
 await page.screenshot({path:'/tmp/nutbook-import-progress-card.png'});
 await card.getByRole('button',{name:'关闭',exact:true}).click();assert.equal(await card.count(),0);
 console.log('Sidebar import progress, cancel and persistent completion receipt passed');
}finally{await browser.close();}
