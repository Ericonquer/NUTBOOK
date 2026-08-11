#!/usr/bin/env node

import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(projectRoot, "assets/readme-demo/nutbook-quick-start.html");
const outputDir = path.dirname(sourcePath);
const fps = 15;
const viewport = { width: 1280, height: 720 };
const gifWidth = 960;
const requestedLocale = process.argv.find((value) => value === "cn" || value === "en");
const requestedFlow = process.argv.find((value) => ["agent", "markdown", "html"].includes(value));
const checkOnly = process.argv.includes("--check");

const locales = [
  { code: "zh-CN", slug: "cn" },
  { code: "en-US", slug: "en" },
].filter((locale) => !requestedLocale || locale.slug === requestedLocale);

const flows = ["agent", "markdown", "html"].filter((flow) => !requestedFlow || flow === requestedFlow);

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
    fs.readFile(resolved, (error, body) => {
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
    await this.page.screenshot({ path: path.join(this.framesDir, filename), animations: "disabled" });
    this.index += 1;
  }

  async checkpoint() {
    if (!this.checkOnly) return;
    const filename = `frame-${String(this.index).padStart(4, "0")}.png`;
    await this.page.screenshot({ path: path.join(this.framesDir, filename), animations: "disabled" });
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
  await product.locator("#confirmScrim.open").waitFor({ state: "hidden" });
  await recorder.hold(.85);

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

async function renderOne(browser, origin, locale, flow) {
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
  await page.waitForFunction(() => window.__ready === true, { timeout: 30_000 });
  const product = page.frames().find((frame) => frame.url().includes("/dist/index.html"));
  if (!product) throw new Error("Nutbook product frame is unavailable");
  const runtime = page.frames().find((frame) => frame.url().includes("readme-editable-presentation.html"));
  const controls = page.frames().find((frame) => frame.url().includes("runtime-overlay.html"));
  const recorder = new Recorder(page, framesDir, { checkOnly });

  if (flow === "agent") await renderAgentFlow(page, product, recorder);
  if (flow === "markdown") await renderMarkdownFlow(page, product, recorder, locale);
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
  const gifPath = path.join(outputDir, `nutbook-${flow === "agent" ? "agent-access" : flow === "markdown" ? "markdown-edit" : "html-edit"}-${locale.slug}.gif`);
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
