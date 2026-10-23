#!/usr/bin/env node

import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname,"..");
const sourcePath = path.join(projectRoot, "assets/readme-demo/nutbook-quick-start.html");
const outputDir = path.join(projectRoot,"assets/readme-demo");
const fps = 12;
const viewport = { width: 1280, height: 720 };
const gifWidth = 1200;
const requestedLocale = process.argv.find((value) => value === "cn" || value === "en");
const requestedFlow = process.argv.find((value) => ["agent", "markdown", "html", "export", "presenter", "formatting", "home"].includes(value));
const checkOnly = process.argv.includes("--check");

const locales = [
  { code: "zh-CN", slug: "cn" },
  { code: "en-US", slug: "en" },
].filter((locale) => !requestedLocale || locale.slug === requestedLocale);

const flows = ["agent", "markdown", "html", "export", "presenter", "formatting", "home"].filter((flow) => !requestedFlow || flow === requestedFlow);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function startStaticServer() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const resolved = path.resolve(projectRoot, `.${pathname}`);
    if (!resolved.startsWith(`${projectRoot}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    fs.readFile(pathname === "/assets/readme-demo/nutbook-quick-start.html" ? path.join(projectRoot,"assets/readme-demo/nutbook-quick-start.html") : resolved, (error, body) => {
      if (error) {
        response.writeHead(error.code === "ENOENT" ? 404 : 500).end(error.code || "Read error");
        return;
      }
      response.writeHead(200, { "Content-Type": mimeTypes[path.extname(resolved)] || "application/octet-stream" });
      response.end(body);
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} failed\n${result.stderr || result.stdout}`);
  }
}

function centerOf(box) {
  if (!box) throw new Error("Could not resolve an interaction target");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function easeOutExpo(value) {
  return value >= 1 ? 1 : 1 - (2 ** (-10 * value));
}

class Recorder {
  constructor(page, framesDir, options = {}) {
    this.page = page;
    this.framesDir = framesDir;
    this.checkOnly = Boolean(options.checkOnly);
    this.index = 0;
    this.cursor = { x: 1185, y: 92 };
  }

  async shot() {
    if (this.checkOnly && this.index > 0) return;
    const filename = `frame-${String(this.index).padStart(4, "0")}.png`;
    await this.page.screenshot({ path: path.join(this.framesDir, filename), animations: "disabled", ...(this.page.__recordClip ? {clip:this.page.__recordClip}: {}) });
    this.index += 1;
  }

  async checkpoint() {
    if (!this.checkOnly) return;
    const filename = `frame-${String(this.index).padStart(4, "0")}.png`;
    await this.page.screenshot({ path: path.join(this.framesDir, filename), animations: "disabled", ...(this.page.__recordClip ? {clip:this.page.__recordClip}: {}) });
    this.index += 1;
  }

  async hold(seconds) {
    if (this.checkOnly) {
      await this.checkpoint();
      return;
    }
    const count = Math.max(1, Math.round(seconds * fps));
    for (let index = 0; index < count; index += 1) await this.shot();
  }

  async setCursor(point, opacity = 1) {
    this.cursor = point;
    await this.page.evaluate(({ x, y, opacity: alpha }) => window.__demo.setCursor(x, y, alpha), { ...point, opacity });
  }

  async moveTo(point, seconds = .75) {
    if (!point) throw new Error("Cannot animate to a missing target");
    const from = this.cursor;
    if (this.checkOnly) {
      await this.setCursor(point);
      await this.checkpoint();
      return;
    }
    const count = Math.max(2, Math.round(seconds * fps));
    const bend = Math.min(54, Math.max(18, Math.abs(point.x - from.x) * .08));
    const controlA = { x: from.x - bend, y: from.y + (point.y - from.y) * .36 };
    const controlB = { x: point.x + bend, y: from.y + (point.y - from.y) * .72 };
    for (let index = 0; index < count; index += 1) {
      const raw = index / (count - 1);
      const t = easeOutExpo(raw);
      const inverse = 1 - t;
      const x = inverse ** 3 * from.x + 3 * inverse ** 2 * t * controlA.x + 3 * inverse * t ** 2 * controlB.x + t ** 3 * point.x;
      const y = inverse ** 3 * from.y + 3 * inverse ** 2 * t * controlA.y + 3 * inverse * t ** 2 * controlB.y + t ** 3 * point.y;
      await this.setCursor({ x, y }, Math.min(1, raw * 5));
      await this.shot();
    }
    this.cursor = point;
  }

  async ring(point, seconds = .34) {
    if (this.checkOnly) {
      await this.page.evaluate(({ x, y }) => window.__demo.setClickRing(x, y, .45, 1.35), point);
      await this.checkpoint();
      await this.page.evaluate(() => window.__demo.hideClickRing());
      return;
    }
    const count = Math.max(2, Math.round(seconds * fps));
    for (let index = 0; index < count; index += 1) {
      const t = index / (count - 1);
      await this.page.evaluate(({ x, y, opacity, scale }) => window.__demo.setClickRing(x, y, opacity, scale), {
        ...point,
        opacity: 1 - t,
        scale: .35 + easeOutExpo(t) * 1.8,
      });
      await this.shot();
    }
    await this.page.evaluate(() => window.__demo.hideClickRing());
  }

  async click(locator, options = {}) {
    await locator.waitFor({ state: "visible" });
    const point = centerOf(await locator.boundingBox());
    await this.moveTo(point, options.moveSeconds ?? .72);
    await locator.click(options.clickOptions || {});
    await this.ring(point, options.ringSeconds ?? .34);
    return point;
  }

  async type(locator, text, options = {}) {
    const chunkSize = options.chunkSize || 3;
    for (let index = 0; index < text.length; index += chunkSize) {
      await locator.pressSequentially(text.slice(index, index + chunkSize), { delay: 16 });
      await this.hold(options.chunkHold ?? .07);
    }
  }

  async drag(from, to, seconds = .8) {
    await this.moveTo(from, .55);
    await this.page.mouse.move(from.x, from.y);
    await this.page.mouse.down();
    const count = this.checkOnly ? 2 : Math.max(3, Math.round(seconds * fps));
    for (let index = 1; index <= count; index += 1) {
      const t = easeOutExpo(index / count);
      const point = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
      await this.page.mouse.move(point.x, point.y);
      await this.setCursor(point);
      await this.shot();
    }
    await this.page.mouse.up();
    this.cursor = to;
    await this.ring(to, .25);
  }
}

async function renderAgentFlow(page, product, recorder) {
  await recorder.hold(.75);
  await recorder.click(product.locator("#emptyStateOpenArtifactAccessButton"));
  await product.locator("#settingsScrim.open").waitFor({ state: "visible" });
  await recorder.hold(.6);

  await recorder.click(product.locator("#settingsRefreshNbskillStatusButton"));
  await product.locator("#confirmScrim.open [data-confirm-ok]").waitFor({ state: "visible" });
  await recorder.hold(.45);
  await recorder.click(product.locator("#confirmScrim.open [data-confirm-ok]"), { moveSeconds: .6 });
  await product.locator('.agent-integration-help-card').waitFor({state:'visible'});
  await recorder.hold(1);
  await recorder.click(product.locator('[data-agent-integration-close]'));
  await product.locator('#confirmScrim.open').waitFor({state:'hidden'});
  await recorder.click(product.locator("#settingsDiscoverAgentsButton"));
  await recorder.hold(.45);
  await product.locator("#settingsAgentProjectList").getByText("sample-agent-project", { exact: true }).waitFor({ state: "visible" });
  await recorder.hold(.9);

  await recorder.click(product.locator('[data-settings-artifact-section="skills"]'));
  await recorder.hold(.55);
  await recorder.click(product.locator('[data-settings-refresh-skills="true"]'), { moveSeconds: .58 });
  await recorder.hold(.42);
  await product.locator("#settingsSkillList").getByText("html-ppt", { exact: true }).waitFor({ state: "visible" });
  await recorder.hold(1.3);
}

async function renderMarkdownFlow(page, product, recorder, locale) {
  const evidence = locale.code === "en-US" ? "The observation notes are still being refined." : "课堂观察记录仍在持续补充。";
  const addition = locale.code === "en-US" ? " Evidence can be refined here." : " 证据可以在这里继续补充。";
  const outlineLabel = locale.code === "en-US" ? "Classroom evidence" : "课堂证据";

  await recorder.hold(.75);
  await recorder.click(product.locator("[data-toggle-markdown-outline]"), { moveSeconds: .55 });
  await recorder.hold(.38);
  await recorder.click(product.locator("[data-toggle-markdown-outline]"), { moveSeconds: .45 });
  await recorder.hold(.35);
  await recorder.click(product.locator("[data-markdown-outline-jump]").filter({ hasText: outlineLabel }).first(), { moveSeconds: .62 });
  await recorder.hold(.55);

  const paragraph = product.locator(".ProseMirror > p").filter({ hasText: evidence }).first();
  await recorder.click(paragraph, { moveSeconds: .62 });
  await paragraph.press("End");
  await recorder.type(paragraph, addition, { chunkSize: locale.code === "en-US" ? 4 : 2, chunkHold: .055 });
  await recorder.hold(.32);

  const paragraphBox = await paragraph.boundingBox();
  if (!paragraphBox) throw new Error("Markdown paragraph is not visible for selection");
  const selectionStart = { x: paragraphBox.x + Math.min(220, paragraphBox.width * .38), y: paragraphBox.y + Math.min(18, paragraphBox.height / 2) };
  const selectionEnd = { x: paragraphBox.x + 54, y: selectionStart.y };
  await recorder.drag(selectionStart, selectionEnd, .55);
  const bold = product.locator('.markdown-format-toolbar.visible [data-format-command="bold"]');
  await bold.waitFor({ state: "visible" });
  await recorder.hold(.38);
  await recorder.click(bold, { moveSeconds: .46 });
  await recorder.hold(.42);

  const caretLocal = await paragraph.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let last = null;
    while (walker.nextNode()) last = walker.currentNode;
    if (!last) return null;
    const range = document.createRange();
    range.setStart(last, last.textContent.length);
    range.collapse(true);
    const rect = range.getBoundingClientRect();
    const fallback = element.getBoundingClientRect();
    return { x: rect.right || fallback.right - 4, y: (rect.top + rect.bottom) / 2 || (fallback.top + fallback.bottom) / 2 };
  });
  const productBox = await page.locator("#productFrame").boundingBox();
  if (!caretLocal || !productBox) throw new Error("Markdown caret target is unavailable");
  const caretPoint = { x: productBox.x + caretLocal.x, y: productBox.y + caretLocal.y };
  await recorder.moveTo(caretPoint, .48);
  await page.mouse.click(caretPoint.x, caretPoint.y);
  await recorder.ring(caretPoint);
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  const insertTrigger = product.locator(".markdown-insert-menu.visible .markdown-insert-trigger");
  await insertTrigger.waitFor({ state: "visible" });
  await recorder.hold(.28);
  await recorder.click(insertTrigger, { moveSeconds: .42 });
  await recorder.click(product.locator('.markdown-insert-menu.open [data-insert-command="image"]'), { moveSeconds: .42 });
  const image = product.locator('.ProseMirror img[src*="classroom-collaboration-photo-bw"]');
  await image.waitFor({ state: "visible" });
  await recorder.hold(.55);
  await image.hover();
  const medium = product.locator('.markdown-image-align-toolbar.visible [data-image-size="medium"]');
  await medium.waitFor({ state: "visible" });
  await recorder.click(medium, { moveSeconds: .48 });
  await image.hover();
  const center = product.locator('.markdown-image-align-toolbar.visible [data-image-align="center"]');
  await center.waitFor({ state: "visible" });
  await recorder.click(center, { moveSeconds: .55 });
  await recorder.hold(1.05);
}

async function renderHtmlFlow(page, runtime, controls, recorder, locale) {
  await recorder.hold(.8);
  await recorder.click(controls.locator("#moreButton"), { moveSeconds: .62, ringSeconds: .08 });
  await page.evaluate(() => window.__demo.setControlsExpanded(true));
  await recorder.click(controls.locator("#editButton"), { moveSeconds: .06, ringSeconds: .12 });
  await page.evaluate(() => window.__demo.setControlsExpanded(false));
  await page.evaluate(() => window.__demo.enterHtmlEdit());

  const toolbar = runtime.locator("#nutbook-html-edit-inline-toolbar");
  await toolbar.waitFor({ state: "attached" });
  const pageRail = page.frameLocator("#productFrame").locator("#presentationEditRail");
  await pageRail.waitFor({ state: "visible" });
  await recorder.hold(.65);

  const field = runtime.locator(`[data-id="${locale.code === "en-US" ? "opening-lead-en" : "opening-lead-zh"}"]`);
  await recorder.click(field, { moveSeconds: .68 });
  await field.press("Meta+A");
  const replacement = locale.code === "en-US" ? "Turn classroom evidence into the next shared decision." : "把课堂证据变成下一步共同决策。";
  await recorder.type(field, replacement, { chunkSize: locale.code === "en-US" ? 5 : 2, chunkHold: .05 });
  await recorder.hold(.28);

  const h2 = runtime.locator('#nutbook-html-edit-inline-toolbar button[data-command="heading-2"]');
  await h2.waitFor({ state: "visible" });
  await recorder.click(h2, { moveSeconds: .58 });
  await recorder.hold(.55);

  const insert = runtime.locator('#nutbook-html-edit-inline-toolbar button[data-intent="insert-image-frame"]');
  await recorder.click(insert, { moveSeconds: .58 });
  const imageSpace = runtime.locator(".image-space");
  const space = await imageSpace.boundingBox();
  if (!space) throw new Error("HTML image insertion area is not visible");
  const dragStart = { x: space.x + space.width * .12, y: space.y + space.height * .12 };
  const dragEnd = { x: space.x + space.width * .88, y: space.y + space.height * .86 };
  await recorder.drag(dragStart, dragEnd, .72);
  const confirm = runtime.locator("#nutbook-html-edit-inserted-image-layer .frame .controls button").filter({ hasText: locale.code === "en-US" ? "确认框选" : "确认框选" }).first();
  await confirm.waitFor({ state: "visible" });
  await recorder.click(confirm, { moveSeconds: .48 });
  const inserted = runtime.locator("#nutbook-html-edit-inserted-image-layer .frame img:not([hidden])");
  await inserted.waitFor({ state: "visible" });
  await recorder.hold(.75);

  const save = runtime.locator('#nutbook-html-edit-inline-toolbar button[data-intent="save"]');
  await recorder.click(save, { moveSeconds: .58 });
  await runtime.locator("#nutbook-html-edit-inline-toolbar [data-saved]").waitFor({ state: "visible" });
  await recorder.hold(.7);

  const secondPage = pageRail.locator(".presentation-edit-page").nth(1);
  await recorder.click(secondPage, { moveSeconds: .72 });
  await page.evaluate(() => window.__demo.goToHtmlPage("findings"));
  await runtime.locator('[data-nutbook-page-id="findings"].active').waitFor({ state: "visible" });
  await recorder.hold(1.05);
}

async function renderFormattingFlow(page, product, recorder, locale) {
 const en=locale.slug==='en';
 const added=en?' Check the evidence before publishing.':' 发布前再核对一次证据。';
 await product.evaluate(()=>{
  const original=NutbookFormatting.open;
  window.__formatRecord={saved:null,copied:null,delivery:{running:false,stage:"idle"},job:null};
  NutbookFormatting.open=(bridge,tab)=>original({...bridge,nativeClipboard:true,wechatDelivery:true,invoke:async(command,args)=>{
   // Recording-only mock: render production delivery UI without browser/account access.
   if(command==='publishing_runtime_status')return {ready:true,node:{state:'ready',version:'22'},browser:{state:'ready',name:'Google Chrome'},driver:{state:'ready'}};
   if(command==='wechat_delivery_status')return structuredClone(window.__formatRecord.delivery);
   if(command==='start_wechat_delivery'){window.__formatRecord.job=structuredClone(args.job);window.__formatRecord.delivery={running:true,stage:'connecting',platform:'wechat',jobId:args.job.id,runId:'readme-demo'};return structuredClone(window.__formatRecord.delivery);}
   if(command==='control_wechat_delivery')throw Error('Recording must stop at the success dialog');
   if(command==='load_formatting_draft')return {source:tab.preview.raw,draft:null,revision:null};
   if(command==='render_formatting_markdown'){
    const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
    return args.markdown.split(/\n\s*\n/).filter(Boolean).map(block=>{const m=block.match(/^(#{1,6})\s+(.*)/s);return m?`<h${m[1].length}>${esc(m[2])}</h${m[1].length}>`:`<p>${esc(block)}</p>`;}).join('');
   }
   if(command==='save_formatting_draft'){window.__formatRecord.saved=structuredClone(args.draft);return 'demo-revision-1';}
   if(command==='write_formatting_clipboard'){window.__formatRecord.copied=args;return {verified:true};}
   return bridge.invoke(command,args);
  }},tab);
 });
 await recorder.hold(.6);
 await recorder.click(product.locator('#documentMoreButton'));
 await recorder.click(product.locator('[data-document-action="format-markdown"]'));
 await product.locator('.formatting-workspace .ProseMirror').waitFor({state:'visible'});
 await recorder.hold(1);
 const paragraph=product.locator('.formatting-editor .ProseMirror p').filter({hasText:en?'The observation notes are still being refined.':'课堂观察记录仍在持续补充'}).first();
 await recorder.click(paragraph);
 const editor=product.locator('.formatting-editor .ProseMirror');await editor.focus();
 await paragraph.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);range.collapse(false);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);});
 await page.keyboard.insertText(added);await recorder.hold(.8);
 await recorder.click(product.getByRole('button',{name:en?'Theme and formatting':'主题与排版',exact:true}));
 await recorder.click(product.locator('[data-theme="newspaper"]'));await recorder.hold(1.1);
 await recorder.click(product.locator('[data-theme="tech"]'));await recorder.hold(1.1);
 await recorder.click(product.getByRole('button',{name:en?'Close theme panel':'收起主题面板',exact:true}));
 await recorder.click(product.getByRole('button',{name:en?'Save publishing draft':'保存发布稿',exact:true}));await recorder.hold(.7);
 await recorder.click(product.getByRole('button',{name:en?'Send to WeChat':'发送到公众号',exact:true}));
 const delivery=product.locator('dialog.formatting-delivery');await delivery.waitFor({state:'visible'});
 await delivery.getByRole('button',{name:en?'Save and send draft':'保存并发送草稿',exact:true}).waitFor({state:'visible'});
 await recorder.hold(1.2);
 await recorder.click(delivery.getByRole('button',{name:en?'Save and send draft':'保存并发送草稿',exact:true}));
 await product.waitForFunction(()=>!!window.__formatRecord.job);
 await recorder.hold(.7);
 for(const [stage,cn,english] of [['uploading_images','正在上传图片','Uploading images'],['writing','正在填写图文','Filling article'],['cover','正在设置封面','Setting cover'],['saving','正在保存公众号草稿','Saving WeChat draft'],['verifying','正在重开核对草稿','Reopening and verifying draft'],['verified','草稿已保存并核对','Draft saved and verified']]){
  await product.evaluate(stage=>{Object.assign(window.__formatRecord.delivery,{stage,running:stage!=='verified'});},stage);
  await delivery.locator('[role="status"]').filter({hasText:en?english:cn}).waitFor({state:'visible'});
  await recorder.hold(stage==='verified'?2:.65);
 }
 const result=await product.evaluate(()=>({saved:window.__formatRecord.saved?.markdown,job:window.__formatRecord.job,source:mockData.previews[101].raw,stage:window.__formatRecord.delivery.stage}));
 if(!result.saved?.includes(added.trim())||!result.job?.html.includes(added.trim())||result.source.includes(added.trim())||result.stage!=='verified')throw new Error('Draft/delivery/source isolation assertion failed');
 await recorder.checkpoint();

}

async function renderExportFlow(page, product, recorder) {
  await product.locator('#documentMoreButton').click();
  await product.locator('[data-document-action="export-markdown-center"]').click();
  await product.locator('#exportScrim.open').waitFor({state:'visible'});
  page.__recordClip={x:210,y:95,width:860,height:530};
  await recorder.hold(1.2);
  await recorder.click(product.locator('[data-export-html-mode="presentation"]'));
  await recorder.hold(1.2);
  if(await product.locator('[data-presentation-output]').count()!==3)throw Error('Current export controls missing');
  await recorder.click(product.locator('[data-presentation-output="motion-editable"]'));await recorder.hold(.8);
  await recorder.click(product.locator('[data-presentation-density="balanced"]'));
  await recorder.hold(.8);
  await recorder.click(product.locator('[data-export-format="pdf"]'));
  await recorder.hold(1.2);
  await recorder.click(product.locator('[data-export-format="image"]'));
  await recorder.hold(1.2);
  await recorder.click(product.locator('[data-image-width="1080"]'));
  await recorder.hold(1);
}


async function renderPresenter(browser, origin, locale) {
 const tempRoot=fs.mkdtempSync(path.join(os.tmpdir(),'nutbook-presenter-record-'));
 const framesDir=path.join(tempRoot,'frames');fs.mkdirSync(framesDir);
 const context=await browser.newContext({viewport,locale:locale.code});
 const sample=await context.newPage();
 await sample.goto(`${origin}/assets/readme-demo/readme-editable-presentation.html`);
 if(locale.slug==='en')await sample.evaluate(()=>{document.documentElement.lang='en-US';});
 const ids=['opening','findings','next']; const thumbs={};
 for(const id of ids){
  await sample.evaluate(id=>{document.querySelectorAll('.slide').forEach(el=>el.classList.toggle('active',el.dataset.nutbookPageId===id));},id);
  thumbs[id]='data:image/png;base64,'+(await sample.locator('.deck').screenshot()).toString('base64');
 }
 await sample.close();
 const page=await context.newPage();
 await page.addInitScript(({thumbs,language})=>{
 const en=language==='en-US';
  const pages=[{id:'opening',title:en?'Classroom collaboration':'课堂协作'},{id:'findings',title:en?'Key findings':'关键发现'},{id:'next',title:en?'Next step':'下一步'}];
  let state={sessionId:'article-demo',language,ready:true,rehearsal:true,sequence:0,pages,activePageId:'opening',notes:{opening:[{runs:[{text:en?'Opening: introduce the research question and classroom context.':'开场：先讲清研究问题，再介绍这次观察的课堂场景。'}]}],findings:[{runs:[{text:en?'Key point: faster preparation does not guarantee deeper discussion. Explain with classroom evidence.':'重点：准备更快，不等于讨论更深。结合课堂证据解释差别。'}]}],next:[{runs:[{text:en?'Close: review the evidence next class and update the research notes.':'收尾：下一节课重新检查证据，把讨论结果写回研究笔记。'}]}]},timerElapsedMs:0,timerRunning:false,timerHasStarted:false};
  window.__TAURI_INTERNALS__={invoke:async(command,args={})=>{
   if(command==='native_presentation_state')return structuredClone(state);
   if(command==='native_presentation_thumbnail')return {dataUrl:thumbs[args.payload.pageId]};
   if(command==='native_presentation_live_preview')return true;
   if(command==='native_presentation_navigate'){state={...state,activePageId:args.payload.pageId,sequence:state.sequence+1};return structuredClone(state);}
   if(command==='native_presentation_blackout'){state={...state,black:args.payload.black,sequence:state.sequence+1};return structuredClone(state);}
   if(command==='native_presentation_timer'){const a=args.payload.action;state={...state,timerRunning:a==='start'||a==='resume',timerHasStarted:a!=='reset',sequence:state.sequence+1};return structuredClone(state);}
   return true;
  }};
 },{thumbs,language:locale.code});
 await page.goto(`${origin}/dist/native-presenter.html`);
 await page.waitForFunction(()=>document.querySelectorAll('.preview-body img').length===2);
 await page.evaluate(()=>{
  const cursor=document.createElement('div');cursor.id='recording-cursor';cursor.style='position:fixed;left:0;top:0;z-index:99999;pointer-events:none;opacity:0;width:26px;height:34px';cursor.innerHTML='<svg viewBox="0 0 28 36"><path d="M3 2.5V28.5L9.7 22.4L14.3 33L19 31L14.2 20.6H24L3 2.5Z" fill="white" stroke="#111" stroke-width="2"/></svg>';document.body.append(cursor);
  const ring=document.createElement('div');ring.style='position:fixed;z-index:99998;pointer-events:none;border:2px solid #333;border-radius:50%;width:18px;height:18px;opacity:0';document.body.append(ring);
  window.__demo={setCursor(x,y,a){cursor.style.transform=`translate(${x}px,${y}px)`;cursor.style.opacity=a},hideCursor(){cursor.style.opacity=0},setClickRing(x,y,a,s){Object.assign(ring.style,{left:x+'px',top:y+'px',opacity:a,transform:`translate(-50%,-50%) scale(${s})`})},hideClickRing(){ring.style.opacity=0}};
 });
 const recorder=new Recorder(page,framesDir,{checkOnly});
 await recorder.hold(1.3);
 await recorder.click(page.locator('#reset'));await recorder.hold(.7);
 await recorder.click(page.locator('#next'));await recorder.hold(1.5);
 if(!await page.locator('#notes').textContent().then(s=>s.includes(locale.slug==='en'?'faster preparation':'准备更快')))throw new Error('notes did not follow page');
 await recorder.click(page.locator('#pages button').nth(2));await recorder.hold(1.3);
 await recorder.click(page.locator('#previous'));await recorder.hold(.8);
 await recorder.click(page.locator('#themeToggle'));await recorder.hold(1.2);
 await recorder.click(page.locator('#themeToggle'));await recorder.hold(.7);
 await page.evaluate(()=>window.__demo.hideCursor());await recorder.hold(.5);
 if(checkOnly){const outputPath=path.join(outputDir,'presenter-check.png');fs.copyFileSync(path.join(framesDir,`frame-${String(recorder.index-1).padStart(4,'0')}.png`),outputPath);await context.close();return {outputPath,sizeMb:'check',frames:recorder.index};}
 const palette=path.join(tempRoot,'palette.png'),input=path.join(framesDir,'frame-%04d.png'),outputPath=path.join(outputDir,`nutbook-native-presenter-${locale.slug}.gif`);
 run('ffmpeg',['-y','-loglevel','error','-framerate',String(fps),'-i',input,'-vf',`scale=${gifWidth}:-1:flags=lanczos,palettegen=stats_mode=diff`,palette]);
 run('ffmpeg',['-y','-loglevel','error','-framerate',String(fps),'-i',input,'-i',palette,'-lavfi',`scale=${gifWidth}:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,outputPath]);
 await context.close();fs.rmSync(tempRoot,{recursive:true,force:true});return {outputPath,sizeMb:(fs.statSync(outputPath).size/1024/1024).toFixed(2),frames:recorder.index};
}

async function renderHomepage(page, product, origin, locale) {
 const sample=await page.context().newPage();await sample.goto(`${origin}/assets/readme-demo/readme-editable-presentation.html`);
 if(locale.slug==='en')await sample.evaluate(()=>document.documentElement.lang='en-US');
 const thumbs=[];
 for(const id of ['opening','findings','next']){
  await sample.evaluate(id=>document.querySelectorAll('.slide').forEach(el=>el.classList.toggle('active',el.dataset.nutbookPageId===id)),id);
  thumbs.push('data:image/png;base64,'+(await sample.locator('.deck').screenshot()).toString('base64'));
 }
 await sample.close();
 const titles=locale.slug==='en'?['Market analysis','Classroom research','Project review']:['市场分析报告','课堂研究文档','项目复盘与行动计划'];
 const mdThumbs=['mock-cover-market.png','mock-cover-research.png','mock-cover-review.png'].map(name=>'data:image/png;base64,'+fs.readFileSync(path.join(outputDir,name)).toString('base64'));
 await product.evaluate(async ({thumbs,mdThumbs,titles,english})=>{
  window.__HOME_ASSETS={thumbs,mdThumbs,titles,english};
  await window.eval(`
   destroyAllMarkdownEditorSessions();
   const demo=window.__HOME_ASSETS;
   const names=[demo.titles[0],(demo.english?"Classroom presentation":"课堂协作演示"),demo.titles[1],(demo.english?"Key findings":"研究发现展示"),demo.titles[2],(demo.english?"Next actions":"下一步行动演示")];
   appState.items=names.map((title,i)=>({id:301+i,libraryId:1,fileName:title+(i%2?".html":".md"),relativePath:title+(i%2?".html":".md"),filePath:"/Demo/NUTBOOK/"+title+(i%2?".html":".md"),fileType:i%2?"html":"markdown",fileExt:i%2?"html":"md",title,summary:"可继续阅读、修改与展示的示例产物",fileSize:2048,modifiedAt:"1792022400",isFavorite:i===0||i===3,tags:[],thumbnail:{status:"ready",path:i%2?demo.thumbs[(i-1)/2]:demo.mdThumbs[i/2],width:1672,height:941,renderKind:i%2?"html-screenshot":"markdown-image-cover"},sourceBadges:[{kind:"project",label:demo.english?"Demo project":"演示项目",available:true}]}));
   mockData.items=structuredClone(appState.items);
   appState.tabs=[];appState.runtimeSessions=[];appState.activeTabId=null;appState.homeTabOpen=true;appState.homeLayout="grid";appState.browseMode="all";appState.activeTagFilterIds=[];
   renderNavState();renderTabs();renderViewer();renderItems();setSidebarCollapsed(false);
  `);
 },{thumbs,mdThumbs,titles,english:locale.slug==='en'});
 await page.evaluate(()=>window.__demo.hideCursor());
 await product.locator('.item-card').first().waitFor({state:'visible'});
 await product.waitForFunction(()=>[...document.querySelectorAll('.item-card img')].every(im=>im.complete&&im.naturalWidth>0));
 await product.waitForFunction(()=>Math.abs(document.querySelector('.sidebar').getBoundingClientRect().width-parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')))<0.5);
 const geometry=await product.evaluate(()=>{const logo=document.querySelector('.brand-logo').getBoundingClientRect();const toggle=document.querySelector('#toggleSidebarButton').getBoundingClientRect();return {logoRight:logo.right,toggleLeft:toggle.left,sidebarWidth:document.querySelector('.sidebar').getBoundingClientRect().width};});
 console.log('HOME_GEOMETRY',JSON.stringify(geometry));if(geometry.logoRight>geometry.toggleLeft)throw new Error('Logo and toggle overlap');
 const sidebar=await product.locator('.sidebar').boundingBox();if(!sidebar||sidebar.width<150)throw new Error('Sidebar is collapsed');
 const outputPath=path.join(outputDir,`nutbook-home-${locale.slug}.png`);await page.screenshot({path:outputPath});
 return {outputPath,sizeMb:(fs.statSync(outputPath).size/1024/1024).toFixed(2),frames:1};
}

async function renderOne(browser, origin, locale, flow) {
  if(flow === "presenter")return renderPresenter(browser,origin,locale);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `nutbook-readme-${flow}-${locale.slug}-`));
  const framesDir = path.join(tempRoot, "frames");
  fs.mkdirSync(framesDir);
  const context = await browser.newContext({ locale: locale.code, viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });

  await page.goto(`${origin}/assets/readme-demo/nutbook-quick-start.html?flow=${flow}&locale=${locale.code}`, { waitUntil: "load" });
  try { await page.waitForFunction(() => window.__ready === true, { timeout: 12_000 }); } catch(e) { console.error('BOOT_ERRORS',errors,await page.title());await page.screenshot({path:path.join(outputDir,'boot-failure.png')});throw e; }
  const product = page.frames().find((frame) => frame.url().includes("/dist/index.html"));
  if (!product) throw new Error("Nutbook product frame is unavailable");
  const runtime = page.frames().find((frame) => frame.url().includes("readme-editable-presentation.html"));
  const controls = page.frames().find((frame) => frame.url().includes("runtime-overlay.html"));

  if(flow==="home"){const result=await renderHomepage(page,product,origin,locale);await context.close();return result;}
  const recorder = new Recorder(page, framesDir, { checkOnly });

  if (flow === "agent") await renderAgentFlow(page, product, recorder);
  if (flow === "markdown") await renderMarkdownFlow(page, product, recorder, locale);
  if (flow === "export") await renderExportFlow(page, product, recorder);
  if (flow === "formatting") await renderFormattingFlow(page, product, recorder, locale);
  if (flow === "html") {
    if (!runtime || !controls) throw new Error("Nutbook HTML runtime frames are unavailable");
    await renderHtmlFlow(page, runtime, controls, recorder, locale);
  }
  await page.evaluate(() => window.__demo.hideCursor());
  await recorder.hold(.35);

  if (errors.length) throw new Error(errors.join("\n"));
  await context.close();

  if (checkOnly) {
    const lastFrame = path.join(framesDir, `frame-${String(Math.max(0, recorder.index - 1)).padStart(4, "0")}.png`);
    const checkPath = path.join(os.tmpdir(), `nutbook-readme-${flow}-${locale.slug}-check.png`);
    fs.copyFileSync(lastFrame, checkPath);
    fs.rmSync(tempRoot, { recursive: true, force: true });
    return { outputPath: checkPath, sizeMb: "check", frames: recorder.index };
  }

  const palettePath = path.join(tempRoot, "palette.png");
  const gifPath = path.join(outputDir, `nutbook-${flow === "agent" ? "agent-access" : flow === "markdown" ? "markdown-edit" : flow === "export" ? "markdown-export" : flow === "formatting" ? "markdown-formatting-v3" : "html-edit"}-${locale.slug}.gif`);
  const inputPattern = path.join(framesDir, "frame-%04d.png");
  const baseFilter = `fps=${fps},scale=${gifWidth}:-1:flags=lanczos`;
  run("ffmpeg", [
    "-y", "-loglevel", "error", "-framerate", String(fps), "-i", inputPattern,
    "-vf", `${baseFilter},palettegen=stats_mode=diff`, palettePath,
  ]);
  run("ffmpeg", [
    "-y", "-loglevel", "error", "-framerate", String(fps), "-i", inputPattern,
    "-i", palettePath,
    "-lavfi", `${baseFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
    gifPath,
  ]);

  fs.rmSync(tempRoot, { recursive: true, force: true });
  return {
    outputPath: gifPath,
    sizeMb: (fs.statSync(gifPath).size / 1024 / 1024).toFixed(2),
    frames: recorder.index,
  };
}

const { server, origin } = await startStaticServer();
const browser = await chromium.launch();
try {
  for (const locale of locales) {
    for (const flow of flows) {
      const result = await renderOne(browser, origin, locale, flow);
      console.log(`rendered ${path.relative(projectRoot, result.outputPath)} (${result.sizeMb} MB, ${result.frames} frames)`);
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
