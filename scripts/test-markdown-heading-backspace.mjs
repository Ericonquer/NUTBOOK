import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage();
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({content:readFileSync('dist/assets/markdown-editor.js','utf8'),type:'module'});
  await page.waitForFunction(()=>window.NutbookMarkdownEditor);
  const mount=async md=>page.evaluate(async md=>{
    window.ed?.destroy();
    window.ed=await NutbookMarkdownEditor.create({root:document.querySelector('#root'),markdown:md,resolveImageSrc:()=> 'data:image/png;base64,'});
    const h=document.querySelector('.ProseMirror h3');
    document.querySelector('.ProseMirror').focus();
    const range=document.createRange();range.setStart(h,0);range.collapse(true);
    getSelection().removeAllRanges();getSelection().addRange(range);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    return ed.getMarkdown();
  },md);
  for(const md of ['### 标题','上一段\n\n### 标题','![图](./a.png)\n\n### 标题','<img src="./a.png" alt="图" width="100">\n\n### 标题']) {
    const baseline=await mount(md);
    await page.keyboard.press('Backspace');
    if(md.startsWith('###')) {
      assert.equal(await page.evaluate(()=>ed.getMarkdown()),baseline,'document start must not downgrade');
    } else if(md.startsWith('上一段')) {
      assert.match(await page.evaluate(()=>ed.getMarkdown()),/上一段标题/,'backspace joins previous prose');
      assert.equal(await page.evaluate(()=>ed.undo()),true);
      assert.equal(await page.evaluate(()=>ed.getMarkdown()),baseline);
      assert.equal(await page.evaluate(()=>ed.redo()),true);
      assert.match(await page.evaluate(()=>ed.getMarkdown()),/上一段标题/);
    } else {
      assert.equal(await page.evaluate(()=>ed.getMarkdown()),baseline,'first press selects image without deleting content');
      assert.equal(await page.locator('.ProseMirror-selectednode').count(),1);
      await page.keyboard.press('Backspace');
      assert.doesNotMatch(await page.evaluate(()=>ed.getMarkdown()),/a.png/);
      assert.equal(await page.locator('.ProseMirror h3').textContent(),'标题');
      assert.equal(await page.evaluate(()=>ed.undo()),true);
      assert.equal(await page.evaluate(()=>ed.getMarkdown()),baseline);
    }
  }
  await mount('### 标题');
  await page.evaluate(async()=>{const text=document.querySelector('.ProseMirror h3').firstChild;const r=document.createRange();r.setStart(text,1);r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  await page.keyboard.press('Backspace');
  assert.equal(await page.locator('.ProseMirror h3').textContent(),'题','inside heading deletes a character');
  assert.equal(await page.evaluate(()=>ed.undo()),true);
  assert.match(await page.evaluate(()=>ed.getMarkdown()),/### 标题/);
  await page.evaluate(async()=>{const text=document.querySelector('.ProseMirror h3').firstChild;const r=document.createRange();r.setStart(text,1);r.setEnd(text,2);getSelection().removeAllRanges();getSelection().addRange(r);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  await page.keyboard.press('Backspace');
  assert.equal(await page.locator('.ProseMirror h3').textContent(),'标','selected text deletes normally');
  // Insert a real empty paragraph before the heading through the editor key path.
  const baseline=await mount('### 标题');
  await page.keyboard.press('Enter');
  // Enter at the start creates an empty paragraph before the original heading.
  await page.evaluate(()=>{const h=document.querySelector('.ProseMirror h3');const r=document.createRange();r.setStart(h,0);r.collapse(true);getSelection().removeAllRanges();getSelection().addRange(r);});
  assert.equal(await page.locator('.ProseMirror > p').count(),1);
  await page.keyboard.press('Backspace');
  assert.equal(await page.locator('.ProseMirror > p').count(),0,'backspace removes preceding empty paragraph');
  assert.equal(await page.locator('.ProseMirror h3').textContent(),'标题');
  assert.equal(await page.evaluate(()=>ed.undo()),true);
  assert.equal(await page.locator('.ProseMirror > p').count(),1,'undo restores empty paragraph');
  console.log('Heading Backspace: document start, blank line, prose, images and undo/redo passed.');
} finally {await browser.close();}
