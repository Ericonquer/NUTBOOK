import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import http from 'node:http';
const {loadWeiboDraft,WEIBO_HOME,prepareWeiboBody,waitForWeiboAuthentication,captureWeiboJson}=await import(process.env.NUTBOOK_TEST_WEIBO_ADAPTER || './wechat/weibo-delivery.mjs');
let id='123',code=100000,receipts=0;
const server=http.createServer((req,res)=>{receipts++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({code,data:{id,title:'Persisted title'}}));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const local=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();let navigations=0;
 // Proxy intercepted API requests to a real loopback server; never contact Weibo.
 const originalRoute=page.route.bind(page),originalUnroute=page.unroute.bind(page),wrappers=new Map();
 page.unroute=(match,handler)=>originalUnroute(match,wrappers.get(handler)||handler);
 page.route=(match,handler)=>{if(typeof match!=='function')return originalRoute(match,handler);const wrapped=route=>handler(new Proxy(route,{get(target,key){
  if(key==='fetch')return options=>target.fetch({...options,url:local+new URL(target.request().url()).pathname});
  const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
 }}));wrappers.set(handler,wrapped);return originalRoute(match,wrapped);};
 await page.route('https://card.weibo.com/**',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/draft/load'))return route.fulfill({contentType:'application/json',body:JSON.stringify({code,data:{id,title:'Persisted title'}})});
  navigations++;
  return route.fulfill({contentType:'text/html; charset=utf-8',body:`<textarea placeholder="请输入标题"></textarea><div class="tiptap" contenteditable="true"><p>Body</p></div><script>fetch('/article/v5/aj/editor/draft/load').then(r=>r.json()).then(v=>document.querySelector('textarea').value=v.data.title)</script>`});
 });
 const prepared=await page.evaluate(prepareWeiboBody,{html:'<section><p>Before<img data-nutbook-image="i1">After</p></section>',images:[{id:'i1'}],token:'snapshot'});
 assert.match(prepared,/BeforeNUTBOOK_snapshot_IMAGE_i1_ENDAfter/);
 assert.ok(!prepared.includes('<img'),'body paste must not restart image uploads');
 await assert.rejects(page.evaluate(prepareWeiboBody,{html:'<script>bad</script>',images:[],token:'snapshot'}),/UNSAFE_HTML/);
 const target=WEIBO_HOME+'#/draft/123';
 assert.equal((await loadWeiboDraft(page,target)).id,'123');
 assert.equal((await loadWeiboDraft(page,target)).id,'123');
 assert.equal(navigations,2,'same draft URL must actually reload persisted state');
 id='999';await assert.rejects(loadWeiboDraft(page,target),/DRAFT_UNAVAILABLE/);
 id='123';code=100001;await assert.rejects(loadWeiboDraft(page,target),/DRAFT_UNAVAILABLE/);
 await page.route('https://weibo.com/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<button title="发微博">Compose</button>'}));
 await page.goto('https://weibo.com/newlogin');
 const authentication=waitForWeiboAuthentication(page);
 await page.goto('https://weibo.com/');
 await authentication;
 console.log('Weibo reload receipt identity and unavailable-draft behavior passed (local Chromium fixture).');
 assert.equal(receipts,4,'each load is executed once against the loopback server');
 code=100000;
 await page.route('https://card.weibo.com/receipt-probe',route=>route.fulfill({contentType:'text/html',body:`<button onclick="fetch('/article/v5/aj/editor/draft/create',{method:'POST'}).then(r=>r.json()).then(()=>location.href='/article/v5/editor#/draft/123')">Create</button>`}));
 await page.goto('https://card.weibo.com/receipt-probe');
 const created=await captureWeiboJson(page,r=>r.url().endsWith('/draft/create')&&r.request().method()==='POST',()=>page.getByRole('button',{name:'Create',exact:true}).click());
 await page.waitForURL('**/editor#/draft/123');
 assert.equal(created.data.id,'123','receipt remains available across document navigation');
 assert.equal(receipts,5,'create POST is sent exactly once');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
