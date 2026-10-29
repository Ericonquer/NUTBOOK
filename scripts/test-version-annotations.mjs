import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const js=readFileSync('dist/document-versions.js','utf8'),a=js.indexOf('  function annotatedPreview('),b=js.indexOf('  let preferenceMenuId=',a);
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1000,height:700}});await page.setContent('<div id="host"></div>');await page.addScriptTag({content:js.slice(a,b)+';window.annotate=annotatedPreview;'});
 const before='<html><head><style>body{font:20px/1.8 system-ui;padding:30px}h1{font-size:32px}</style></head><body><h1>版本验收 B</h1><p>这里保留<strong>原来的格式</strong>。</p><p>旧的说法。</p><img src="old.svg" alt="图片"></body></html>';
 const after='<h1>版本验收 Bcd</h1><p>这里保留<strong>原来的格式</strong>。</p><p>新的说法。</p><p>新增的段落。</p><img src="new.svg" alt="图片">';
 const image='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="70"><rect width="160" height="70" fill="#e5eee8"/><circle cx="80" cy="35" r="20" fill="#528368"/></svg>').toString('base64');
 const preview=before.replace('src="old.svg"',`src="${image}"`);
 const html=await page.evaluate(({preview,before,after})=>annotate(preview,before,after),{preview,before,after});
 await page.setContent(html);
 assert.equal(await page.locator('h1 ins').textContent(),'cd');assert.equal(await page.locator('strong').first().textContent(),'原来的格式');
 assert.ok(await page.locator('del').count());assert.ok((await page.locator('ins').allTextContents()).join('').includes('新增的段落'));
 assert.equal(await page.locator('img[data-vh-image-change]').count(),1);
 assert.equal(await page.locator('script').count(),0);
 await page.screenshot({path:'/tmp/nutbook-version-inline-annotations.png',clip:{x:0,y:0,width:1000,height:450}});
 const emoji=await page.evaluate(()=>annotate('<p>A😀B</p>','<p>A😀B</p>','<p>A😃B</p>'));
 assert.ok(emoji.includes('😃'));assert.ok(emoji.includes('😀'));
 console.log('Static preview inline red/green annotations, preserved formatting, image outline and emoji passed');
}finally{await browser.close();}
