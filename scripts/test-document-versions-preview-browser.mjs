// Called while the Rust test owns the actual preview server and session lease.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
const url=process.argv[2];
assert.match(url,/^http:\/\/127\.0\.0\.1:\d+\//);
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();const foreign=[];
 page.on('request',request=>{if(/^https?:/.test(request.url())&&!request.url().startsWith(new URL(url).origin+'/'))foreign.push(request.url());});
 await page.setContent('<iframe sandbox="" title="History"></iframe>');
 const html=readFileSync(process.argv[3],'utf8');
 await page.locator('iframe').evaluate((frame,html)=>frame.srcdoc=html,html);
 const frame=page.frameLocator('iframe');await frame.getByRole('heading',{name:'A',exact:true}).waitFor();
 const child=page.frames().find(candidate=>candidate.parentFrame());
 await child.waitForFunction(()=>document.querySelector('img')?.complete,null,{timeout:8000});
 assert.equal(await frame.locator('img').first().evaluate(img=>img.naturalWidth),10,'real sandbox preview must load the historical SVG');
 assert.equal(await frame.locator('script,[onerror],[onclick],a[href]').count(),0);
 assert.deepEqual(foreign,[]);
 console.log('real Rust preview server + browser sandbox image/security checks passed (not native WKWebView)');
}finally{await browser.close();}
