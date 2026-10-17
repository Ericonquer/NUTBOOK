import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {deliverXDraft,validateXResume,xContentMatches} from './wechat/x-delivery.mjs';
import {validateJob} from './wechat/delivery.mjs';
assert.throws(()=>validateXResume({digest:'a',stage:'creating'},'a'),/AMBIGUOUS_CREATE/);
assert.throws(()=>validateXResume({digest:'b',stage:'editing'},'a'),/JOB_CONTENT_CHANGED/);
assert.throws(()=>validateXResume({digest:'a',stage:'editing',editUrl:'https://evil.test/1'},'a'),/INVALID_CHECKPOINT_URL/);
const receipt=(text,media=[])=>({data:{articleentity_update_content_state:{content_state:{blocks:[{text}],entityMap:media.map(mediaId=>({value:{data:{mediaItems:[{mediaId}]}}}))}}}});
assert.equal(xContentMatches(receipt('Before After',['1','2']),'BeforeAfter',2),true);
assert.equal(xContentMatches(receipt('Before After',['1']),'BeforeAfter',2),false,'one-image save cannot finish a two-image send');
assert.equal(xContentMatches(receipt('Before marker After',['1','2']),'BeforeAfter',2),false);
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext();
 const url='https://x.com/compose/articles/edit/123';
 await context.route('https://x.com/**',route=>{
  if(route.request().method()==='POST')return route.fulfill({contentType:'application/json',body:JSON.stringify(receipt('BeforeboldAfter'))});
  return route.fulfill({contentType:'text/html',body:`<main><textarea placeholder="Add a title"></textarea><div data-testid="composer" contenteditable="true" role="textbox"></div></main><script>
  const body=document.querySelector('[data-testid=composer]'), title=document.querySelector('textarea');
  title.value=localStorage.title||'';body.innerHTML=localStorage.body||'';
  title.addEventListener('input',()=>localStorage.title=title.value);
  body.addEventListener('paste',e=>{e.preventDefault();const parsed=new DOMParser().parseFromString(e.clipboardData.getData('text/html'),'text/html');body.innerHTML=(parsed.querySelector('section')||parsed.body).innerHTML;localStorage.body=body.innerHTML;fetch('/i/api/graphql/fixture/ArticleEntityUpdateContent',{method:'POST',body:'{}'});});
  </script>`});
 });
 const job={version:1,id:'fixture',title:'Saved title',summary:'',html:'<section><p>Before<strong>bold</strong>After</p></section>',images:[]};
 let journal={digest:validateJob(job),stage:'editing',editUrl:url};
 const result=await deliverXDraft({context,job,journal,checkpoint:async value=>{journal=value;}});
 assert.equal(result.verified,true);assert.equal(journal.stage,'verified');
 assert.equal(await context.pages().at(-1).locator('[data-testid=composer] strong').textContent(),'bold');
 console.log('X adapter regression passed: root contenteditable entry, platform save receipt, reopened content, and ambiguous/foreign checkpoint guards. Local browser fixture only.');
}finally{await browser.close();}
