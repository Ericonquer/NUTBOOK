import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { chromium } from "playwright";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {pathToFileURL} from "node:url";

const source = readFileSync(new URL("../src-tauri/src/core/html_runtime.rs", import.meta.url), "utf8");
const region = source.slice(source.indexOf("fn presentation_preview_init_script("));
const match = region.match(/format!\(r#"([\s\S]*?)"#\)/);
assert.ok(match, "presentation preview initialization script exists");

let script = match[1];
for (const [key, value] of Object.entries({
  item_id: "6",
  "runtime_session_id:?": '"test-session"',
  generation: "1",
  "active_page_id:?": '"opening"',
  "preview_instance_id:?": '"test-preview"'
})) script = script.replaceAll(`{${key}}`, value);
script = script.replaceAll("{{", "{").replaceAll("}}", "}");

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 224, height: 850 } });
  await page.addInitScript({ content: script });
  await page.goto(new URL("../docs/presentations/native-presentation-sample/index.html", import.meta.url).href);
  await page.locator(".nb-preview-canvas iframe").last().waitFor();
  assert.equal(await page.locator(".nb-preview-canvas iframe").count(), 3);

  for (let index = 0; index < 3; index += 1) {
    const frame = page.frameLocator(".nb-preview-canvas iframe").nth(index);
    const metrics = await frame.locator("h1").evaluate((heading) => ({
      viewportWidth: document.documentElement.clientWidth,
      pageDisplay: getComputedStyle(heading.closest("[data-nutbook-page-id]")).display,
      fontSize: parseFloat(getComputedStyle(heading).fontSize),
      width: heading.getBoundingClientRect().width
    }));
    assert.equal(metrics.viewportWidth, 1024, `slide ${index + 1} keeps desktop viewport`);
    assert.notEqual(metrics.pageDisplay, "none", `slide ${index + 1} is visible`);
    assert.ok(metrics.fontSize >= 60, `slide ${index + 1} uses desktop typography`);
    assert.ok(metrics.width >= 500, `slide ${index + 1} has full slide layout`);
  }
  const dir=mkdtempSync(join(tmpdir(),'nutbook-fixed-preview-')),file=join(dir,'index.html');
  const bridge=readFileSync('src-tauri/resources/export-templates/presentation-bridge.js','utf8');
  writeFileSync(file,`<!doctype html><html><head><style>body{margin:0}#deck{position:absolute;left:50%;top:50%;width:1920px;height:1080px;transform:translate(-50%,-50%) scale(var(--deck-scale));transform-origin:center}.slide{display:none;position:absolute;inset:0;background:white}.slide.active{display:block}h1{font:150px Arial;width:1200px;margin:80px}</style></head><body><main id="deck"><section class="slide active" data-nutbook-page-id="opening"><h1>OpenLuckin</h1></section><section class="slide" data-nutbook-page-id="second"><h1>第二页</h1></section></main><script>${bridge}const slides=[...document.querySelectorAll('.slide')];let active='opening';document.documentElement.style.setProperty('--deck-scale',Math.min(innerWidth/1920,innerHeight/1080));window.__NUTBOOK_PRESENTATION__=createNutbookPresentationBridge({pages:slides.map(s=>({id:s.dataset.nutbookPageId,title:s.textContent})),activePageId:()=>active,goTo(id){active=id;slides.forEach(s=>s.classList.toggle('active',s.dataset.nutbookPageId===id));return true},setManagedMode(){return true},setEditMode(){return true}});</script></body></html>`);
  await page.goto(pathToFileURL(file).href);
  await page.locator('.nb-preview-canvas iframe').last().waitFor();
  for(let index=0;index<2;index++){
    const frame=page.frameLocator('.nb-preview-canvas iframe').nth(index);
    const metrics=await frame.locator('h1').evaluate(el=>({viewport:innerWidth,width:el.getBoundingClientRect().width,deck:document.querySelector('#deck').getBoundingClientRect().toJSON()}));
    assert.equal(metrics.viewport,1920,'fixed author canvas keeps its layout viewport');
    assert.equal(metrics.width,1200,'ancestor preview scale must not shrink text again');
    assert.ok(Math.abs(metrics.deck.x)<1&&Math.abs(metrics.deck.y)<1,'fixed deck is anchored to the snapshot origin');
  }
  await page.screenshot({path:join(dir,'fixed-preview.png')});
  console.log('Fixed canvas preview bounds and typography passed: '+dir);
  if(process.argv[2]){
    await page.goto(process.argv[2]);
    await page.locator('.nb-preview-canvas iframe').first().waitFor();
    const frame=page.frameLocator('.nb-preview-canvas iframe').first();
    await frame.locator('img').first().evaluate(async image=>{await image.decode();});
    const actual=await frame.locator('[data-nutbook-page-id]').evaluate(el=>({width:el.getBoundingClientRect().width,viewport:innerWidth,images:[...document.images].every(img=>img.complete&&img.naturalWidth>0)}));
    assert.equal(actual.width,1920);assert.equal(actual.viewport,1920);assert.equal(actual.images,true);
    await page.screenshot({path:'/tmp/nutbook-actual-edit-rail.png'});
    console.log('Actual deck thumbnail validated: '+JSON.stringify(actual));
  }
  console.log("Presentation preview: three visible slides use the 1024px layout in a 224px rail.");
} finally {
  await browser.close();
}
