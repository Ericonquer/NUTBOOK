import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {waitForDraftEditor} from './wechat/delivery.mjs';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();
 async function checkCopyAlignment(platform){
  const body=page.locator(`.formatting-preview [data-copy-platform="${platform}"]`);await body.waitFor();
  const title=page.locator('.formatting-preview button[aria-label="Copy article title"]');
  const a=await title.boundingBox(),b=await body.boundingBox();
  assert.ok(Math.abs(a.x+a.width-b.x-b.width)<1,'title and body copy buttons share a right edge');
  assert.ok(b.y>=a.y+a.height,'body copy belongs below the title row');
 }

 await page.setContent('<p>此草稿已被删除</p><p>此草稿已发表，可前往发表记录查看</p>');
 await assert.rejects(waitForDraftEditor(page),/DRAFT_UNAVAILABLE/);
 await page.setContent('<div name=title><div class=ProseMirror>Existing draft</div></div>');
 await waitForDraftEditor(page);
 await page.setContent('<main id="viewer"></main>');
 await page.addStyleTag({content:readFileSync('dist/markdown-formatting.css','utf8')});
 await page.addScriptTag({content:readFileSync('dist/markdown-formatting.js','utf8')});
 await page.evaluate(()=>{
  window.fixture={notifications:[],raw:'# Published title\n\nBody',saved:null,revision:null,png:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jO7sAAAAASUVORK5CYII='};
  window.bridge={wechatDelivery:true,notify:message=>fixture.notifications.push(message),language:()=> 'en-US',activeId:()=>1,container:document.querySelector('#viewer'),suspend(){},restore(){},error:e=>e.message||String(e),resolveImage:s=>s,confirm:async()=> 'discard',
   editor:async()=>({create:async options=>{
    const input=document.createElement('textarea');input.value=options.markdown;input.setAttribute('data-export-editor','');options.root.append(input);fixture.input=input;
    input.addEventListener('input',()=>options.onChange(input.value));
    return {getMarkdown:()=>input.value,destroy(){},focus(){}};
   }}),
   invoke:async(command,args)=>{
    if(command==='wechat_delivery_status')return fixture.deliveryState || {running:false,stage:'idle'};
    if(command==='start_wechat_delivery'){fixture.deliveryCalls=(fixture.deliveryCalls||0)+1;fixture.sent=structuredClone(args);fixture.deliveryState={jobId:args.job.id,runId:`run-${fixture.deliveryCalls}`,running:true,stage:'waiting_for_scan'};return fixture.deliveryState;}
    if(command==='control_wechat_delivery'){if(args.action==='cancel')fixture.deliveryState={...fixture.deliveryState,running:false,stage:'cancelled'};return null;}
    if(command==='load_formatting_draft')return {draft:fixture.saved,revision:fixture.revision,source:fixture.raw};
    if(command==='render_formatting_markdown')return `<h1>Published title</h1><p>Body <strong>bold</strong></p>${fixture.withImages ? `<p><img src="${fixture.png}"></p><p>Between images</p><p><img src="${fixture.png}"></p>` : ''}`;
    if(command==='validate_formatting_image_data')return null;
    if(command==='save_formatting_draft'){fixture.saved=structuredClone(args.draft);fixture.revision='r1';return 'r1';}
    throw Error(command);
   }};
 });
 await page.evaluate(()=>NutbookFormatting.open(bridge,{id:1,item:{fileName:'sample.md'},preview:{raw:fixture.raw}}));
 assert.equal(await page.locator('.formatting-header button[aria-haspopup=dialog]').count(),1);
 assert.equal(await page.locator('.formatting-header').getByRole('button',{name:'Copy body',exact:true}).count(),0);
 assert.equal(await page.locator('.formatting-preview').getByRole('button',{name:'Copy body',exact:true}).count(),1);
 await checkCopyAlignment('wechat');
 await assert.rejects(page.evaluate(()=>NutbookFormatting.prepareWechatDelivery({id:'job-1'})),/SAVE_DRAFT_BEFORE_DELIVERY/);
 assert.equal(await page.evaluate(()=>NutbookFormatting.save()),true);
 const result=await page.evaluate(()=>NutbookFormatting.prepareWechatDelivery({id:'job-1'}));
 assert.equal(result.title,'Published title');assert.equal(result.version,1);
 assert.equal(result.images.length,0);assert.ok(!result.html.includes('<h1'));
 assert.match(result.html,/<strong/);assert.match(result.html,/line-height/);
 assert.equal(await page.evaluate(()=>fixture.raw),'# Published title\n\nBody');
 await page.evaluate(()=>{fixture.withImages=true;});
 const illustrated=await page.evaluate(()=>NutbookFormatting.prepareWechatDelivery({id:'job-images',coverIndex:1}));
 assert.equal(illustrated.images.length,2);
 assert.equal(illustrated.coverId,'image-2');
 assert.ok(!illustrated.html.includes('data:image'));
 assert.match(illustrated.html,/data-nutbook-image="image-1"/);
 assert.match(illustrated.html,/data-nutbook-image="image-2"/);
 assert.equal(illustrated.images[0].mime,'image/png');
 assert.ok(illustrated.html.indexOf('image-1')<illustrated.html.indexOf('Between images'));
 assert.ok(illustrated.html.indexOf('Between images')<illustrated.html.indexOf('image-2'));
 await page.locator('[data-export-editor]').fill('changed after save');
 await assert.rejects(page.evaluate(()=>NutbookFormatting.prepareWechatDelivery({id:'job-2'})),/SAVE_DRAFT_BEFORE_DELIVERY/);
 await page.getByRole('button',{name:'Send to WeChat',exact:true}).click();
 assert.equal(await page.getByLabel('Keep WeChat signed in on this device').isChecked(),false);
 assert.equal(await page.getByLabel('Keep WeChat signed in on this device').evaluate(el=>getComputedStyle(el).accentColor),'rgb(0, 0, 0)');
 assert.equal(await page.locator('.formatting-delivery-heading .formatting-tooltip').evaluate(el=>getComputedStyle(el).visibility),'hidden');
 await page.keyboard.press('Tab');
 assert.equal(await page.locator('.formatting-delivery-heading .formatting-tooltip').evaluate(el=>getComputedStyle(el).visibility),'visible');
 await page.getByRole('button',{name:'Save and send draft',exact:true}).click();
 await page.waitForFunction(()=>fixture.sent);
 assert.equal(await page.evaluate(()=>fixture.sent.rememberLogin),false);
 assert.equal(await page.evaluate(()=>fixture.sent.job.images.length),2);
 assert.equal(await page.getByRole('button',{name:'Save and send draft',exact:true}).isDisabled(),true);
 assert.equal(await page.locator('.formatting-header [role=status]').textContent(),'Saved','sending without a new edit keeps the saved baseline');
 assert.equal(await page.getByRole('dialog',{name:'Send to WeChat'}).isVisible(),true);
 const box=await page.getByRole('dialog',{name:'Send to WeChat'}).boundingBox();
 const viewport=page.viewportSize();
 assert.ok(Math.abs(box.x+box.width/2-viewport.width/2)<2,'dialog must be centered');
 assert.equal(await page.locator('.formatting-delivery progress').getAttribute('max'),'6');
 await page.evaluate(()=>{fixture.deliveryState={...fixture.deliveryState,stage:'uploading_images',history:[{stage:'connecting'},{stage:'uploading_images',current:2,total:2}]};});
 await page.waitForFunction(()=>document.querySelector('.formatting-delivery [role=status]').textContent.includes('(2/2)'));
 assert.equal(await page.locator('.formatting-delivery-history').count(),0);
 await page.evaluate(()=>{fixture.deliveryState={...fixture.deliveryState,stage:'writing'};});
 await page.waitForFunction(()=>document.querySelector('.formatting-delivery [role=status]').textContent==='Filling article…');
 await page.getByRole('button',{name:'Close sending window',exact:true}).click();
 await page.waitForTimeout(900);
 assert.equal(await page.getByRole('dialog',{name:'Send to WeChat'}).isVisible(),false,'polling must not reopen a dismissed dialog');
 await page.getByRole('tab',{name:'X Articles',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.formatting-header button[aria-label="Send to WeChat"]').dataset.running==='true');
 await page.locator('[data-export-editor]').fill('new input while sending');
 assert.equal(await page.evaluate(()=>fixture.sent.job.title),'Published title');
 await page.getByRole('button',{name:'Send to WeChat',exact:true}).click();
 await page.getByRole('button',{name:'Cancel sending',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.formatting-delivery [role=status]').textContent.startsWith('Cancelled'));
 assert.equal(await page.evaluate(()=>fixture.deliveryCalls),1);
 assert.equal(await page.locator('[data-export-editor]').inputValue(),'new input while sending');
 await page.evaluate(()=>{fixture.deliveryState={...fixture.deliveryState,running:false,stage:'failed',error:'DRAFT_UNAVAILABLE'};});
 await page.getByRole('button',{name:'Close sending window',exact:true}).click();
 await page.getByRole('button',{name:'Send to WeChat',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.formatting-delivery-actions button').textContent==='Create a new draft');
 await page.getByRole('button',{name:'Create a new draft',exact:true}).click();
 await page.waitForFunction(()=>fixture.deliveryCalls===2);
 assert.equal(await page.evaluate(()=>fixture.sent.recreate),true);

 await page.getByRole('button',{name:'Close sending window',exact:true}).click();
 await page.evaluate(()=>NutbookFormatting.leave(1));
 await page.evaluate(()=>{fixture.deliveryState={...fixture.deliveryState,running:false,stage:'verified'};});
 await page.waitForFunction(()=>fixture.notifications.some(message=>message.startsWith('Draft saved')));
 const count=await page.evaluate(()=>fixture.notifications.filter(message=>message.startsWith('Draft saved')).length);
 await page.waitForTimeout(900);
 assert.equal(await page.evaluate(()=>fixture.notifications.filter(message=>message.startsWith('Draft saved')).length),count,'completion is notified only once after leaving the formatting workspace');
 assert.equal(await page.locator('.formatting-workspace').count(),0);
 await page.evaluate(()=>NutbookFormatting.open(bridge,{id:1,item:{fileName:'sample.md'},preview:{raw:fixture.raw}}));
 await page.evaluate(()=>NutbookFormatting.leave(1));
 console.log('Modal close/background completion notification and saved baseline after Send passed.');
 console.log('Send entry saves a frozen draft, prevents duplicate clicks, defaults to no login storage, and cancels without changing input (browser harness).');
 console.log('Saved publishing draft export preserves theme/body/title boundary; dirty input blocked (browser harness).');
}finally{await browser.close();}
