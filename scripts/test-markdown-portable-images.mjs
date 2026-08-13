import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const bundle = readFileSync("dist/assets/markdown-editor.js", "utf8");
const fixture = readFileSync("src-tauri/tests/fixtures/markdown-portable-images/portable-markdown-images.md", "utf8");
const iconDataUrl = `data:image/png;base64,${readFileSync("src-tauri/tests/fixtures/markdown-portable-images/assets/icon-112.png").toString("base64")}`;
const landscapeDataUrl = `data:image/png;base64,${readFileSync("src-tauri/tests/fixtures/markdown-portable-images/assets/landscape-large.png").toString("base64")}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.setContent(`
    <style>
      #editor { width: 900px; }
      .markdown-image-align-toolbar { position: absolute; }
      .markdown-image-align-toolbar:not(.visible) { display: none; }
      .markdown-image-align-toolbar button:disabled { opacity: .4; }
      .nutbook-image-align-center { margin-left: auto; margin-right: auto; }
      .portable-image-block { display: flex; width: 100%; }
      .portable-image-block.nutbook-image-align-center { justify-content: center; }
      .portable-image-block.nutbook-image-align-right { justify-content: flex-end; }
      img.nutbook-image-size-small { width: auto; max-width: min(160px, 100%); }
      img.nutbook-image-size-medium { width: auto; max-width: min(480px, 100%); }
      img.nutbook-image-size-large { width: auto; max-width: 100%; }
    </style>
    <div id="editor"></div>
  `);
  await page.addScriptTag({ content: bundle, type: "module" });
  await page.waitForFunction(() => Boolean(window.NutbookMarkdownEditor?.create));

  const initial = await page.evaluate(async ({ markdown, icon, landscape }) => {
    const root = document.getElementById("editor");
    window.__portableEditor = await window.NutbookMarkdownEditor.create({
      root,
      markdown,
      resolveImageSrc(src) {
        if (src.endsWith("icon-112.png")) return icon;
        if (src.endsWith("landscape-large.png")) return landscape;
        return src;
      }
    });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await Promise.all(Array.from(root.querySelectorAll("img")).map((image) => image.complete
      ? Promise.resolve()
      : new Promise((resolve) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      })));
    const baseline = window.__portableEditor.getBaselineMarkdown();
    return {
      portableCount: root.querySelectorAll('div[data-type="portable-image"]').length,
      htmlAtomText: Array.from(root.querySelectorAll('span[data-type="html"]')).map((node) => node.textContent).join("\n"),
      baseline,
      iconNaturalWidth: root.querySelector('img[alt="Centered 112 pixel icon"]')?.naturalWidth || 0,
      legacyWidth: root.querySelector('img[alt="Legacy centered icon"]')?.getBoundingClientRect().width || 0
    };
  }, { markdown: fixture, icon: iconDataUrl, landscape: landscapeDataUrl });

  assert.equal(initial.portableCount, 2, "the two whitelisted GitHub image blocks must become visual portable_image nodes");
  assert.match(initial.htmlAtomText, /<kbd>/, "ordinary inline HTML must stay on the existing HTML atom path");
  assert.match(initial.htmlAtomText, /custom-image-frame/, "a class-bearing image wrapper must fail closed instead of becoming a portable image");
  assert.match(initial.baseline, /<p align="center">\n  <img src="\.\/assets\/icon-112\.png" alt="Centered 112 pixel icon" width="112">\n<\/p>/, "an unedited GitHub image block must preserve its raw source");
  assert.equal(initial.iconNaturalWidth, 112, "the acceptance icon must exercise a real 112 pixel source image");
  assert.ok(initial.legacyWidth <= 112.5, `legacy small must not upscale the 112 pixel icon, got ${initial.legacyWidth}`);

  const migratedStandard = await page.evaluate(async () => {
    const root = document.getElementById("editor");
    const image = root.querySelector('img[alt="Standard landscape"]');
    image.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const small = root.querySelector('button[data-image-size="small"]');
    small.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 80));
    return window.__portableEditor.getMarkdown();
  });
  assert.match(migratedStandard, /<img src="\.\/assets\/landscape-large\.png" alt="Standard landscape" width="160">/, "editing a standalone Markdown image must migrate it to GitHub HTML with a 160 pixel cap");

  await page.evaluate(() => window.__portableEditor.undo());
  const afterUndo = await page.evaluate(() => window.__portableEditor.getMarkdown());
  assert.match(afterUndo, /!\[Standard landscape\]\(\.\/assets\/landscape-large\.png\)/, "ProseMirror undo must restore the original Markdown image node");

  const resizedSmallSource = await page.evaluate(async () => {
    const root = document.getElementById("editor");
    const image = root.querySelector('img[alt="Centered 112 pixel icon"]');
    image.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const medium = root.querySelector('button[data-image-size="medium"]');
    medium.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 80));
    return window.__portableEditor.getMarkdown();
  });
  assert.match(resizedSmallSource, /<p align="center">[\s\S]*?<img src="\.\/assets\/icon-112\.png" alt="Centered 112 pixel icon" width="112">[\s\S]*?<\/p>/, "a 112 pixel image must stay at 112 when the medium preset is selected");

  const inlineState = await page.evaluate(async () => {
    const root = document.getElementById("editor");
    const image = root.querySelector('img[alt="Inline icon"]');
    image.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return Array.from(root.querySelectorAll('.markdown-image-align-toolbar button')).every((button) => button.disabled);
  });
  assert.equal(inlineState, true, "an inline image with adjacent text must not expose block presentation actions");
} finally {
  await page.evaluate(() => window.__portableEditor?.destroy?.()).catch(() => {});
  await browser.close();
}

console.log("Markdown portable image regression passed.");
