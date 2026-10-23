// Rust companion: inspect the actual sanitized, archived HTML rather than a mock.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const {html,files}=JSON.parse(readFileSync(process.argv[2],'utf8'));
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 await page.route('http://127.0.0.1:18439/**',route=>{
  const name=new URL(route.request().url()).pathname.slice(1),bytes=files[name];
  return bytes?route.fulfill({body:Buffer.from(bytes),contentType:name.endsWith('.svg')?'image/svg+xml':'text/css'}):route.abort();
 });
 await page.setContent('<iframe sandbox="" style="border:0;width:900px;height:620px"></iframe>');
 await page.locator('iframe').evaluate((frame,html)=>frame.srcdoc=html,html);
 const frame=page.frameLocator('iframe');
 await frame.locator('.page.active img').evaluate(img=>img.decode());
 for(const width of [560,900]) {
  await page.locator('iframe').evaluate((el,width)=>el.style.width=width+'px',width);
  const layout=await frame.locator('.page.active').evaluate(el=>{
   const copy=el.querySelector('.copy').getBoundingClientRect(),image=el.querySelector('img').getBoundingClientRect();
   return {display:getComputedStyle(el).display,copy:{left:copy.left,right:copy.right,top:copy.top,bottom:copy.bottom},image:{left:image.left,right:image.right,top:image.top,bottom:image.bottom}};
  });
  assert.equal(layout.display,'flex');
  assert.ok(layout.image.left>=layout.copy.right-1,'slide artwork stays beside the text, not below it');
  assert.ok(layout.image.top<layout.copy.bottom&&layout.image.bottom>layout.copy.top,'text and image share a horizontal layout');
  assert.equal(await frame.locator('.page:not(.active)').evaluateAll(els=>els.every(el=>getComputedStyle(el).display==='none')),true);
  assert.equal(await frame.locator('script').count(),0);
 }
 console.log('Archived presentation keeps semantic slide containers, side-by-side artwork and hidden inactive pages at narrow/wide widths');
}finally{await browser.close();}
