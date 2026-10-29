import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const fixture=JSON.parse(readFileSync(process.argv[2],'utf8'));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.route('http://127.0.0.1:18439/**',route=>{const key=new URL(route.request().url()).pathname.slice(1),bytes=fixture.files[key];const type=key.endsWith('.svg')?'image/svg+xml':key.endsWith('.png')?'image/png':key.endsWith('.css')?'text/css':'application/octet-stream';return bytes?route.fulfill({body:Buffer.from(bytes),contentType:type}):route.fulfill({status:404,body:''});});
 await page.setContent('<style>'+readFileSync('dist/document-versions.css','utf8')+'</style>');
 await page.addScriptTag({path:'dist/document-versions.js'});
 await page.evaluate(async fixture=>{
  const v={id:'v',kind:'save',saved_at:'2026-10-29T00:00:00Z',snapshot:{html:{},dependencies:{'html:warning:0':{state:'excluded',reason:'script runtime dependencies cannot be proven statically'},'html:warning:1':{state:'excluded',reason:'unsupported resource reference'}}}};
  await NutbookVersions.open({target:{itemId:1},language:()=> 'zh-CN',error:String,canRestore:()=>false,dirty:()=>false,invoke:async command=>command==='list_document_versions'?{activeDocumentId:'d',currentHtml:fixture.source,documents:[{id:'d',canonical_path:'/fixed.html',versions:[v]}]}:command==='get_document_version_preview'?{sessionId:'p',html:fixture.html,source:fixture.source,sourceHtml:fixture.source,incomplete:true}:null});
 },fixture);
 await page.locator('.nutbook-history').evaluate(n=>{n.style.width='1300px';n.style.height='900px';});
 const frame=page.frameLocator('iframe');await frame.locator('#deck').waitFor();
 for(const width of [1300,900]){
  await page.locator('.nutbook-history').evaluate((n,width)=>n.style.width=width+'px',width);
  for(const index of [1,2]){
   await page.locator('[data-page]').fill(String(index));await page.locator('[data-page]').press('Enter');
   await frame.locator(`[data-vh-page="${index-1}"]`).waitFor();
   const host=await page.locator('[data-frame-host]').boundingBox();const deck=await frame.locator('#deck').boundingBox();
   assert.ok(deck.x>=host.x+20&&deck.y>=host.y+20,JSON.stringify({host,deck}));
   assert.ok(deck.x+deck.width<=host.x+host.width-20&&deck.y+deck.height<=host.y+host.height-20,JSON.stringify({host,deck}));
   assert.ok(Math.abs(deck.width/deck.height-1920/1080)<0.01);
   await page.locator('[data-highlight]').click();await page.locator('[data-highlight]').click();
  }
 }
 assert.match(await page.locator('[data-warning] summary').textContent(),/静态预览说明/);
 assert.doesNotMatch(await page.locator('[data-warning] summary').textContent(),/2.*资源/);
 await page.screenshot({path:'/tmp/nutbook-fixed-canvas-history.png'});
 console.log('Actual archived fixed canvas fully visible across pages, highlight toggle and narrow/wide panels; non-file notes not counted as missing resources');
}finally{await browser.close();}
