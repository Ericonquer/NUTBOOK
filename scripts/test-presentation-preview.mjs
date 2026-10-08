import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

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
  console.log("Presentation preview: three visible slides use the 1024px layout in a 224px rail.");
} finally {
  await browser.close();
}
