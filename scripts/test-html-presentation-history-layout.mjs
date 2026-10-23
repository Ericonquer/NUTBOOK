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
 // Exercise production page selection and identity retention across versions.
 await page.setContent('<style>'+readFileSync(new URL('../dist/document-versions.css',import.meta.url),'utf8')+'</style>');
 await page.addScriptTag({content:readFileSync(new URL('../dist/document-versions.js',import.meta.url),'utf8')});
 await page.evaluate(async html=>{
  const versions=['old','short','new'].map(id=>({id,kind:'save',saved_at:'2026-10-23T00:00:00Z',snapshot:{html:{},dependencies:{}}}));
  window.historyCalls=[];
  await NutbookVersions.open({language:()=> 'en-US',canRestore:()=>false,dirty:()=>false,error:String,
   invoke:async(command,args)=>{historyCalls.push(command);return command==='list_document_versions'?{activeDocumentId:'d',documents:[{id:'d',canonical_path:'/slides.html',versions}]}:command==='get_document_version_preview'?{sessionId:args.payload.versionId,html:args.payload.versionId==='short'?(()=>{const dom=new DOMParser().parseFromString(html,'text/html');dom.querySelector('[data-nutbook-page-id=finish]').remove();return '<!doctype html>'+dom.documentElement.outerHTML;})():args.payload.versionId==='old'?(()=>{const dom=new DOMParser().parseFromString(html,'text/html');const opening=dom.querySelector('[data-nutbook-page-id=opening]');opening.parentNode.append(opening);return '<!doctype html>'+dom.documentElement.outerHTML;})():html,source:'source',incomplete:false}:null;}});
 },html);
 const picker=page.locator('[data-page]'),production=page.frameLocator('.nutbook-history iframe');
 assert.equal(await page.locator('select').count(),0);
 assert.equal(await page.locator('[data-page-prev]').isDisabled(),true);
 await page.locator('[data-page-next]').click();
 await production.locator('[data-nutbook-page-id="workflow"]').waitFor({state:'visible'});
 assert.equal(await production.locator('[data-nutbook-page-id="opening"]').isVisible(),false);
 assert.equal(await production.locator('[data-nutbook-page-id="workflow"]').evaluate(el=>getComputedStyle(el).display),'flex');
 await page.locator('[data-list] button').last().click();
 await production.locator('[data-nutbook-page-id="workflow"]').waitFor({state:'visible'});
 assert.equal(await picker.inputValue(),'1','stable page ID survives reordered pages');
 await page.locator('[data-page-next]').click();
 await production.locator('[data-nutbook-page-id="finish"]').waitFor({state:'visible'});
 await page.locator('[data-list] button').nth(1).click();
 await production.locator('[data-nutbook-page-id="workflow"]').waitFor({state:'visible'});
 assert.equal(await page.locator('[data-page-count]').textContent(),'/ 2');
 assert.equal(await page.locator('[data-page-next]').isDisabled(),true);
 assert.equal(await picker.inputValue(),'2','deleted page falls back to a valid nearby page');
 for(const value of ['99','100','1000','999999']){
  await picker.fill(value);
  assert.equal(await picker.evaluate(el=>{const css=getComputedStyle(el),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=css.font;return el.clientWidth-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight)>=ctx.measureText(el.value).width+4;}),true,'typed page number must fit without clipping');
 }
 await picker.fill('99');await page.screenshot({path:'/tmp/nutbook-history-page-input-99.png'});
 for(const invalid of ['0','99','1.5','abc','999999999999999999999']){await picker.fill(invalid);await picker.press('Enter');assert.equal(await picker.getAttribute('aria-invalid'),'true');}
 await picker.press('Escape');assert.equal(await picker.inputValue(),'2');
 await picker.fill('1');await picker.press('Enter');
 await production.locator('[data-nutbook-page-id="opening"]').waitFor({state:'visible'});
 assert.equal(await page.locator('[data-page-prev]').isDisabled(),true);
 await picker.fill('2');await picker.press('Enter');
 await production.locator('[data-nutbook-page-id="workflow"]').waitFor({state:'visible'});
 await page.locator('[data-mode="source"]').click();assert.equal(await picker.isVisible(),false);
 await page.locator('[data-mode="preview"]').click();assert.equal(await picker.isVisible(),true);
 await production.locator('[data-nutbook-page-id="workflow"]').waitFor({state:'visible'});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.screenshot({path:'/tmp/nutbook-html-history-pages-after.png'});
 assert.equal(await production.locator('script').count(),0);
 await page.locator('[data-close]').click();
 assert.ok((await page.evaluate(()=>historyCalls)).filter(x=>x==='close_document_version_preview').length>=2);
 await page.evaluate(async html=>{
  const dom=new DOMParser().parseFromString(html,'text/html'),sample=dom.querySelector('[data-nutbook-page-id]');
  dom.querySelectorAll('[data-nutbook-page-id]').forEach(el=>el.remove());
  for(let i=0;i<120;i++){const slide=sample.cloneNode(true);slide.setAttribute('data-nutbook-page-id','page-'+i);slide.querySelector('h1').textContent='Page '+(i+1);dom.body.append(slide);}
  const version={id:'many',kind:'save',saved_at:'2026-10-23T00:00:00Z',snapshot:{html:{},dependencies:{}}};
  await NutbookVersions.open({language:()=> 'en-US',canRestore:()=>false,dirty:()=>false,error:String,invoke:async command=>command==='list_document_versions'?{activeDocumentId:'d',documents:[{id:'d',canonical_path:'/120-pages.html',versions:[version]}]}:command==='get_document_version_preview'?{sessionId:'many',html:'<!doctype html>'+dom.documentElement.outerHTML,source:'source',incomplete:false}:null});
 },html);
 assert.equal(await page.locator('.vh-pager button').count(),2);
 await picker.fill('120');await picker.press('Enter');
 await production.locator('[data-nutbook-page-id="page-119"]').waitFor({state:'visible'});
 assert.equal(await page.locator('[data-page-count]').textContent(),'/ 120');
 assert.equal(await page.locator('[data-page-next]').isDisabled(),true);
 assert.equal(await page.locator('[data-page-title]').textContent(),'Page 120');
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.screenshot({path:'/tmp/nutbook-html-history-pager-120.png'});
 await page.locator('[data-close]').click();
 console.log('Archived production preview: arrows, direct jump, invalid input, first/last boundaries, 120 pages, stable-ID comparison, source toggle and cleanup passed');
}finally{await browser.close();}
