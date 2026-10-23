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
 await page.setContent('<iframe sandbox="" title="History"></iframe>');
 await page.locator('iframe').evaluate((frame,html)=>{frame.srcdoc=html;},readFileSync(path,'utf8'));
 const frame=page.frameLocator('iframe');
 await frame.getByRole('heading',{name:'A',exact:true}).waitFor();
 await frame.locator('img').evaluate(img=>img.decode());
 assert.equal(await frame.locator('img').evaluate(img=>img.naturalWidth),10);
 assert.equal(await frame.locator('h1').evaluate(el=>getComputedStyle(el).color),'rgb(0, 0, 255)');
 for (const width of [320, 700]) {
  await page.locator('iframe').evaluate((el,width)=>{el.style.width=width+'px';},width);
  assert.ok(await frame.locator('h1').evaluate(el=>el.getBoundingClientRect().left)>=24,'heading must retain the left reading inset');
  assert.ok(await frame.locator('img').evaluate(el=>el.getBoundingClientRect().left)>=24,'image must retain the left reading inset');
  assert.equal(await frame.locator('body').evaluate(el=>getComputedStyle(el).paddingRight),'24px');
 }
 assert.equal(await frame.locator('script,iframe,form,[onerror],a[href]').count(),0);
 assert.equal(await page.frames().find(f=>f.parentFrame()).evaluate(()=>window.BAD),undefined);
 const child=page.frames().find(frame=>frame.parentFrame());
 assert.equal(await child.evaluate(async()=>{const fonts=await document.fonts.load('20px HistorySymbols','home');return fonts.length===1&&fonts[0].status==='loaded';}),true,'historical font must decode in an opaque sandbox, without a live font file');
 assert.deepEqual(foreign,[]);
 console.log('HTML archived CSS/image + inert sandbox browser checks passed; not native WKWebView');
} finally { await browser.close(); }
