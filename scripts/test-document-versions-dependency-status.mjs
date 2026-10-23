import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 await page.setContent('<style>'+readFileSync('dist/document-versions.css','utf8')+'</style>');
 await page.addScriptTag({content:readFileSync('dist/document-versions.js','utf8')});
 for(const language of ['zh-CN','en-US']) {
  for(const kind of ['uncertain','mixed','unsupported','markdown']) {
   await page.evaluate(async({language,kind})=>{
    window.calls=[];
    const warning={'html:warning:script:0':{state:'not-captured',reason:'script runtime dependencies cannot be proven statically'}};
    const missing={'missing.png':{state:'missing-at-save',reason:'missing'}};
    const dependencies=kind==='uncertain'?warning:kind==='mixed'?{...warning,...missing}:kind==='unsupported'?{...warning,'html:warning:css:0':{state:'not-captured',reason:'escaped CSS'}}:missing;
    const snapshot={dependencies,...(kind!=='markdown'?{html:{}}:{})};
    const doc={id:'doc',canonical_path:'/sample.html',versions:[{id:'v',kind:'save',saved_at:'2026-10-23T00:00:00Z',snapshot}]};
    await NutbookVersions.open({language:()=>language,target:{itemId:1},allowSaveAs:true,canRestore:()=>true,dirty:()=>false,expectedHash:async()=> 'baseline',applied:async()=>{},error:String,
     invoke:async(command,args)=>{
      calls.push([command,args]);
      if(command==='list_document_versions')return {documents:[doc],activeDocumentId:'doc',restoreAllowed:true};
      if(command==='get_document_version_preview')return {sessionId:'session',html:'<p>Saved content</p>',source:'saved',incomplete:true};
      if(command==='restore_document_version')return {fileHash:'restored'};
      return null;
     }});
   },{language,kind});
   const summary=await page.locator('[data-warning] summary').textContent();
   if(kind==='uncertain') {
    assert.equal(summary,language==='zh-CN'?'脚本资源未核验':'Script resources not verified');
    await page.locator('[data-save-as]').click();
    await page.waitForFunction(()=>calls.some(([command])=>command==='save_document_version_as'));
    assert.equal(await page.locator('[data-prompt]').isVisible(),false,'uncertainty is informational, not a missing-file confirmation');
    assert.equal(await page.evaluate(()=>calls.find(([c])=>c==='save_document_version_as')[1].payload.allowIncomplete),true,'preserve backend resource validation');
   } else {
    assert.ok(summary.startsWith('1 '),'runtime uncertainty must not inflate missing/excluded counts');
    if(kind==='mixed'||kind==='markdown')assert.ok(summary.includes(language==='zh-CN'?'未找到':'not found'));
    await page.locator('[data-save-as]').click();
    await page.locator('[data-prompt]').waitFor({state:'visible'});
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>calls.some(([c])=>c==='save_document_version_as')),false,'missing/unsupported resources retain cancellation');
   }
   await page.locator('[data-restore]').click();
   await page.locator('[data-prompt] button').last().click();
   if(kind==='uncertain') {
    await page.waitForFunction(()=>calls.some(([c])=>c==='restore_document_version'));
   } else {
    await page.locator('[data-prompt]').waitFor({state:'visible'});
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>calls.some(([c])=>c==='restore_document_version')),false);
   }
   assert.equal(await page.locator('[data-warning]').textContent().then(t=>t.includes('html:warning:')),false);
   await page.evaluate(()=>NutbookVersions.close());
  }
 }
 console.log('Dependency status: uncertainty, missing files, unsupported references, and both locales passed');
}finally{await browser.close();}
