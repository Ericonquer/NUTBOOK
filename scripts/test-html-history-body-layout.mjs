// Rust companion: real archived projection plus production history frame fitting.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const fixture=JSON.parse(readFileSync(process.argv[2],'utf8'));
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.route('http://archived.test/**',route=>{
  const path=decodeURIComponent(new URL(route.request().url()).pathname).slice(1);
  const bytes=path==='ordinary.html'?Buffer.from(fixture.source):fixture.rawFiles[path]&&Buffer.from(fixture.rawFiles[path]);
  return bytes?route.fulfill({body:bytes,contentType:path.endsWith('.css')?'text/css':path.endsWith('.svg')?'image/svg+xml':path.endsWith('.ttf')?'font/ttf':'text/html'}):route.abort();
 });
 await page.route('http://127.0.0.1:18439/**',route=>{
  const name=new URL(route.request().url()).pathname.slice(1),bytes=fixture.files[name];
  return bytes?route.fulfill({body:Buffer.from(bytes),contentType:name.endsWith('.svg')?'image/svg+xml':'text/css'}):route.abort();
 });
 await page.setContent('<style>'+readFileSync(new URL('../dist/document-versions.css',import.meta.url),'utf8')+'</style><iframe id="baseline" sandbox="" src="http://archived.test/ordinary.html" style="position:absolute;left:-3000px;width:800px;height:700px"></iframe>');
 await page.addScriptTag({content:readFileSync(new URL('../dist/document-versions.js',import.meta.url),'utf8')});
 await page.evaluate(async html=>{
  const version={id:'v',kind:'save',saved_at:'2026-10-23T00:00:00Z',snapshot:{html:{},dependencies:{}}};
  await NutbookVersions.open({target:{itemId:1},language:()=> 'en-US',canRestore:()=>false,dirty:()=>false,error:String,
   invoke:async command=>command==='list_document_versions'?{activeDocumentId:'d',documents:[{id:'d',canonical_path:'/ordinary.html',versions:[version]}]}:command==='get_document_version_preview'?{sessionId:'p',html,source:'source',incomplete:false}:null});
 },fixture.html);
 const raw=page.frameLocator('#baseline'),preview=page.frameLocator('.nutbook-history iframe');
 for(const frame of [raw,preview]){
  await frame.locator('img').evaluate(img=>img.decode());
  await frame.locator('body').evaluate(async()=>{await document.fonts.ready;});
 }
 const geometry=frame=>frame.locator('body').evaluate(el=>{
  const card=el.querySelector('.card'),p=card.querySelector('p'),range=document.createRange();range.selectNodeContents(p);
  const css=getComputedStyle(el),box=card.getBoundingClientRect();
  return{width:el.getBoundingClientRect().width,maxWidth:css.maxWidth,margin:css.margin,padding:css.padding,cardLeft:box.left,cardWidth:box.width,textRight:range.getBoundingClientRect().right,backgroundLeft:box.right-240};
 });
 let expected;
 for(const width of [650,1100,720]){
  await page.locator('.nutbook-history').evaluate((el,width)=>el.style.width=width+'px',width);
  await page.waitForFunction(()=>{
   const host=document.querySelector('[data-frame-host]'),frame=host.querySelector('iframe');
   return Math.abs(frame.getBoundingClientRect().width-(host.clientWidth-48))<1;
  });
  const viewport=await page.locator('.nutbook-history iframe').evaluate(el=>el.style.width);
  await page.locator('#baseline').evaluate((el,width)=>el.style.width=width,viewport);
  expected=await geometry(raw);
  assert.deepEqual(await geometry(preview),expected,'fitting changes only outer scale, never author layout');
  assert.equal(expected.maxWidth,'760px');
  assert.ok(expected.textRight<expected.backgroundLeft,'the sample background must not collide with its text');
  assert.equal(await preview.locator('body').getAttribute('class'),'report');
  assert.equal(await preview.locator('body').getAttribute('data-layout'),'reading');
 }
 await page.locator('[data-mode="source"]').click();await page.locator('[data-mode="preview"]').click();
 await preview.locator('img').evaluate(img=>img.decode());
 assert.deepEqual(await geometry(preview),expected);
 assert.equal(await preview.locator('h1').evaluate(el=>getComputedStyle(el).borderLeftWidth),'3px','head styles must not break body first-child selectors');
 await preview.locator('#history-tail').scrollIntoViewIfNeeded();
 assert.ok(await preview.locator('body').evaluate(()=>document.scrollingElement.scrollTop>1000),'ordinary HTML scrolls to its full archived body');
 await preview.locator('body').evaluate(()=>document.scrollingElement.scrollTop=0);
 await page.screenshot({path:'/tmp/nutbook-html-history-body-after.png'});
 console.log('Ordinary HTML author body geometry matches raw archive at 3 panel widths; background/text do not collide, roots and source/preview switch preserved');
}finally{await browser.close();}
