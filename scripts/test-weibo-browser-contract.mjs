import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {loadWeiboDraft,WEIBO_HOME,prepareWeiboBody,waitForWeiboAuthentication} from './wechat/weibo-delivery.mjs';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();let navigations=0,id='123',code=100000;
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
}finally{await browser.close();}
