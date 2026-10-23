// Optional Rust-test companion: the actual scoped server stays alive throughout.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const [url,path]=process.argv.slice(2);
assert.match(url,/^http:\/\/127\.0\.0\.1:\d+\//);
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 const foreign=[];
 page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==new URL(url).origin)foreign.push(r.url());});
 await page.setContent('<style>'+readFileSync(new URL('../dist/document-versions.css',import.meta.url),'utf8')+'</style>');
 await page.addScriptTag({content:readFileSync(new URL('../dist/document-versions.js',import.meta.url),'utf8')});
 await page.evaluate(async html=>{
  const version={id:'v',kind:'save',saved_at:'2026-10-23T00:00:00Z',snapshot:{html:{},dependencies:{}}};
  await NutbookVersions.open({target:{itemId:1},language:()=> 'en-US',canRestore:()=>false,dirty:()=>false,error:String,
   invoke:async command=>command==='list_document_versions'?{activeDocumentId:'d',documents:[{id:'d',canonical_path:'/a.html',versions:[version]}]}:command==='get_document_version_preview'?{sessionId:'p',html,source:'source',incomplete:false}:null});
 },readFileSync(path,'utf8'));
 const frame=page.frameLocator('iframe');
 await frame.getByRole('heading',{name:'A',exact:true}).waitFor();
 await frame.locator('img').evaluate(img=>img.decode());
 assert.equal(await frame.locator('img').evaluate(img=>img.naturalWidth),10);
 assert.equal(await frame.locator('h1').evaluate(el=>getComputedStyle(el).color),'rgb(0, 0, 255)');
 for (const width of [650, 1100]) {
  await page.locator('.nutbook-history').evaluate((el,width)=>{el.style.width=width+'px';},width);
  await page.waitForFunction(()=>{
   const host=document.querySelector('[data-frame-host]'),frame=host.querySelector('iframe');
   return Math.abs(frame.getBoundingClientRect().width-(host.clientWidth-48))<1;
  });
  const host=await page.locator('[data-frame-host]').boundingBox(), heading=await frame.locator('h1').boundingBox(), image=await frame.locator('img').boundingBox();
  assert.ok(heading.x-host.x>=24,'trusted host supplies reading inset without changing author CSS');
  assert.ok(image.x-host.x>=24);
  assert.equal(await frame.locator('body').evaluate(el=>getComputedStyle(el).paddingRight),'0px','author padding remains intact');
 }
 assert.equal(await frame.locator('script,iframe,form,[onerror],a[href]').count(),0);
 assert.equal(await page.frames().find(f=>f.parentFrame()).evaluate(()=>window.BAD),undefined);
 const child=page.frames().find(frame=>frame.parentFrame());
 assert.equal(await child.evaluate(async()=>{const fonts=await document.fonts.load('20px HistorySymbols','home');return fonts.length===1&&fonts[0].status==='loaded';}),true,'historical font must decode in an opaque sandbox, without a live font file');
 assert.deepEqual(foreign,[]);
 console.log('HTML archived CSS/image + inert sandbox browser checks passed; not native WKWebView');
} finally { await browser.close(); }
