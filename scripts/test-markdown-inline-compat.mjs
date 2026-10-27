import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
import {micromark} from 'micromark';
import {fromMarkdown} from 'mdast-util-from-markdown';
import {repairBoldLinks} from '../src/markdown-inline-compat.js';

const malformed = '我做了一款叫**[NUTBOOK](https://example.com/nutbook)**的软件。';
const tree = fromMarkdown(malformed); repairBoldLinks(tree, malformed);
assert.equal(tree.children[0].children[1].type, 'strong');
for (const source of ['叫\\*\\*[NUTBOOK](https://example.com)\\*\\*的软件', '`**[NUTBOOK](https://example.com)**`', '叫&#42;&#42;[NUTBOOK](https://example.com)&#42;&#42;的软件']) {
  const tree = fromMarkdown(source); const original = JSON.stringify(tree);
  repairBoldLinks(tree, source); assert.equal(JSON.stringify(tree), original, 'escaped/code examples are untouched');
}
const browser = await chromium.launch({headless:true});
try {
  const page = await browser.newPage();
  await page.setContent('<div id="editor"></div>');
  await page.addScriptTag({content:readFileSync('dist/assets/markdown-editor.js','utf8'),type:'module'});
  await page.waitForFunction(()=>Boolean(window.NutbookMarkdownEditor?.create));
  for (const initial of [malformed, '我做了一款叫[**NUTBOOK**](https://example.com/nutbook)的软件。', '**[NUTBOOK](https://example.com/nutbook)**软件', '叫**[NUTBOOK][app]**的软件。\n\n[app]: https://example.com/nutbook']) {
    let markdown = initial;
    for (let round = 0; round < 3; round++) {
      const result = await page.evaluate(async markdown => {
        window.compatEditor?.destroy();
        document.querySelector('#editor').replaceChildren();
        window.compatEditor = await NutbookMarkdownEditor.create({root:document.querySelector('#editor'),markdown,fileName:'bold-links.md',language:'en-US'});
        return {text:document.querySelector('.ProseMirror').textContent,link:document.querySelector('.ProseMirror strong a, .ProseMirror a strong')?.textContent,markdown:compatEditor.getMarkdown()};
      },markdown);
      assert.equal(result.link,'NUTBOOK');
      assert.doesNotMatch(result.text,/\*\*/);
      const html = micromark(result.markdown);
      assert.match(html,/<a href="https:\/\/example.com\/nutbook"><strong>NUTBOOK<\/strong><\/a>/,'serialized Markdown also works in a standard renderer');
      markdown = result.markdown;
    }
  }
  // Real rich-text paste produces the exact empty-paragraph HTML handled by
  // the backend regression; deleting that paragraph must remove it durably.
  await page.evaluate(()=>{
    const body=document.querySelector('.ProseMirror');body.focus();
    const range=document.createRange();range.selectNodeContents(body);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);
  });
  await page.keyboard.press('Backspace');
  await page.evaluate(()=>{
    const data=new DataTransfer();data.setData('text/html','<p>复制的段落</p><p><br></p><p><strong>尾段</strong></p>');data.setData('text/plain','复制的段落\n\n尾段');
    document.querySelector('.ProseMirror').dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));
  });
  await page.waitForFunction(()=>document.querySelector('.ProseMirror').textContent.includes('尾段'));
  const withGap=await page.evaluate(()=>compatEditor.getMarkdown());
  assert.match(withGap,/<br \/>/,'reproduce Milkdown empty-paragraph marker from rich paste');
  await page.locator('.ProseMirror p').last().evaluate(node=>{node.focus();getSelection().collapse(node.firstChild?.firstChild||node.firstChild||node,0);});
  await page.keyboard.press('Backspace');
  const withoutGap=await page.evaluate(()=>compatEditor.getMarkdown());
  assert.doesNotMatch(withoutGap,/<br \/>/,'deleting the blank paragraph removes its marker from saved Markdown');
  assert.doesNotMatch(await page.locator('.ProseMirror').textContent(),/<br/);
  assert.match(withoutGap,/复制的段落/);assert.match(withoutGap,/尾段/);
  await page.evaluate(()=>compatEditor.destroy());
  await page.exposeFunction('compatRender',markdown=>micromark(markdown,{allowDangerousHtml:true}));
  await page.addStyleTag({content:readFileSync('dist/markdown-formatting.css','utf8')});
  await page.addScriptTag({content:readFileSync('dist/markdown-formatting.js','utf8')});
  await page.evaluate(async source=>{
    document.querySelector('#editor').replaceChildren();
    window.ClipboardItem=class {constructor(data){this.data=data;}};
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write:async items=>{window.compatCopy={html:await (await items[0].data['text/html']).text(),plain:await (await items[0].data['text/plain']).text()};}}});
    const bridge={container:document.querySelector('#editor'),language:()=> 'en-US',activeId:()=>1,editor:async()=>NutbookMarkdownEditor,suspend(){},restore(){},confirm:async()=> 'discard',error:String,resolveImage:src=>src,
      invoke:async(command,args)=>{if(command==='load_formatting_draft')return {source,draft:null,revision:null};if(command==='render_formatting_markdown')return compatRender(args.markdown);throw Error(command);}};
    await NutbookFormatting.open(bridge,{id:1,item:{fileName:'bold-links.md'},preview:{raw:source}});
  },'# 标题\n\n'+malformed);
  assert.equal(await page.locator('.formatting-preview strong a, .formatting-preview a strong').textContent(),'NUTBOOK');
  await page.evaluate(()=>{
    const body=document.querySelector('.formatting-editor .ProseMirror');body.focus();getSelection().selectAllChildren(body);
    const data=new DataTransfer();data.setData('text/html','<h1>标题</h1><p>我做了一款叫<strong><a href="https://example.com/nutbook">NUTBOOK</a></strong>的软件。</p><p><br></p><p>尾段</p>');data.setData('text/plain','标题\n我做了一款叫NUTBOOK的软件。\n\n尾段');
    body.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));
  });
  await page.waitForFunction(()=>document.querySelector('.formatting-preview').textContent.includes('尾段'));
  assert.doesNotMatch(await page.locator('.formatting-preview').textContent(),/<br|\*\*/,'publishing preview shows formatting, not syntax');
  await page.getByRole('button',{name:'Copy body',exact:true}).click();
  await page.waitForFunction(()=>window.compatCopy);
  const copied=await page.evaluate(()=>compatCopy);
  assert.doesNotMatch(copied.plain,/<br|\*\*/,'clipboard plain text has no leaked markers');
  assert.doesNotMatch(copied.html,/&lt;br|\*\*/,'clipboard HTML has no escaped line-break tags or bold markers');
  assert.match(copied.html,/<strong/);assert.match(copied.html,/href="https:\/\/example.com\/nutbook"/);
  await page.evaluate(()=>{window.compatLeaving=NutbookFormatting.leave(1);});
  await page.getByRole('button',{name:'Discard changes',exact:true}).click();
  assert.equal(await page.evaluate(()=>compatLeaving),true);
  console.log('Inline compatibility: Chinese bold links, standard serialization, reopen, rich paste and blank-line deletion passed (real Milkdown browser; native UI pending).');
} finally {await browser.close();}
