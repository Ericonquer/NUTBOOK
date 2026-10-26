// Windows preview adapter. Uses the already bundled Playwright driver and verified shared tools.
import { chromium } from 'playwright-core';
let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>2*1024*1024)throw Error('capture request too large');}
const request=JSON.parse(input);
const sourceUrl=new URL(request.url);
if(sourceUrl.protocol!=='http:'||!sourceUrl.port||sourceUrl.username||sourceUrl.password||!(sourceUrl.hostname==='127.0.0.1'||/^nb-capture-[a-f0-9]{32}\.localhost$/.test(sourceUrl.hostname)))throw Error('invalid capture origin');
const browser=await chromium.launch({executablePath:request.browser,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1024,height:576},deviceScaleFactor:2});
 page.setDefaultTimeout(10000);
 await page.addInitScript({content:request.init});
 await page.goto(request.url,{waitUntil:'domcontentloaded',timeout:10000});
 await page.evaluate(request.setup);
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.complete?null:new Promise(resolve=>{img.onload=img.onerror=resolve;})));});
 await page.screenshot({path:request.output,type:'png',animations:'disabled',timeout:10000});
}finally{await browser.close();}
