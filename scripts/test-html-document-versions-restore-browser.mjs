// Called by the Rust recovery test while its scoped server is live.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const url=process.argv[2];
assert.match(url,/^http:\/\/127\.0\.0\.1:\d+\//);
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 await page.waitForFunction(()=>window.__VERSION_SAMPLE_SCRIPT_EXECUTED__===true);
 await page.locator('img').evaluate(img=>img.decode());
 assert.equal(await page.locator('h1').textContent(),'HTML 版本验收 A');
 assert.equal(await page.locator('img').evaluate(img=>getComputedStyle(img).width),'240px');
 assert.equal(await page.locator('.card').evaluate(el=>getComputedStyle(el).paddingTop),'24px');
 assert.ok(await page.locator('img').evaluate(img=>img.naturalWidth)>0);
 assert.match(await page.locator('#script-status').textContent(),/正常阅读脚本已执行/);
 assert.deepEqual(errors,[]);
 console.log('Restored HTML CSS cycle, image and ES-module execution passed after history clear; not native WKWebView');
} finally {await browser.close();}
