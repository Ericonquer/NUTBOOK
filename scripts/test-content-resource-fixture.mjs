import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const root='tests/fixtures/content-session-transport/alpha';
const original=readFileSync(`${root}/index.html`,'utf8');
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 for(const saved of [false,true]) {
  const source=saved?original.replace('<p id="status">等待模块与数据</p>','<p id="status" data-editable="text" data-id="status">SAVED USER CANARY</p>'):original;
  await page.route('http://nutbook-fixture.test/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/index.html')return route.fulfill({contentType:'text/html',body:source});
   const types={'.js':'text/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'};
   if(!/^\/assets\/[a-z]+\.(js|json|css|svg)$/.test(path))return route.abort();
   return route.fulfill({contentType:types[path.slice(path.lastIndexOf('.'))],body:readFileSync(root+path)});
  });
  await page.goto('http://nutbook-fixture.test/index.html');
  assert.equal(await page.locator('#status').innerText(),saved?'SAVED USER CANARY':'PASS：模块、根路径资源、fetch ALPHA');
  await page.unrouteAll();
 }
 console.log('Transport fixture runs modules/fetch without overwriting saved editable text.');
} finally {await browser.close();}
