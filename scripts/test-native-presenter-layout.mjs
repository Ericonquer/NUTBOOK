import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    const preview = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="576"><rect width="1024" height="576" fill="#142035"/><text x="60" y="130" fill="white" font-size="72">Slide</text></svg>')}`;
    window.__TAURI_INTERNALS__ = { invoke: async (command) => {
      if (command === "native_presentation_state") return {
        sessionId: "layout-check", language: "zh-CN", ready: true,
        pages: [{ id: "one", title: "开场" }, { id: "two", title: "下一页" }, { id: "three", title: "结束" }],
        activePageId: "one", notes: { one: [{ runs: [{ text: "当前页演讲备注", bold: false }] }] }
      };
      if (command === "native_presentation_thumbnail") return { dataUrl: preview };
      return true;
    } };
  });
  await page.goto(pathToFileURL(path.resolve("dist/native-presenter.html")).href);
  await page.waitForFunction(() => document.querySelectorAll(".preview-body img").length === 2);
  const previewBeforeThemeChange = await page.locator("#currentPreview img").getAttribute("src");
  assert.equal(await page.locator("#themeToggle").getAttribute("aria-label"), "切换到深色外观");
  await page.locator("#themeToggle").click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.equal(await page.locator("#themeToggle").getAttribute("aria-label"), "切换到浅色外观");
  assert.equal(await page.locator("#currentPreview img").getAttribute("src"), previewBeforeThemeChange, "theme must not alter the slide preview");
  assert.equal(await page.locator("#notes").textContent(), "当前页演讲备注");
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll(".preview-body img").length === 2);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark", "presenter theme must persist across window reloads");
  await page.locator("#themeToggle").click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");

  for (const [width, height] of [[1440, 900], [1080, 680]]) {
    await page.setViewportSize({ width, height });
    const rects = await page.evaluate(() => {
      const rect = selector => {
        const { x, y, width, height, bottom, right } = document.querySelector(selector).getBoundingClientRect();
        return { x, y, width, height, bottom, right };
      };
      return { current: rect("#currentPreview"), next: rect("#nextPreview"), notes: rect(".notes"), pages: rect(".pages"), caption: rect(".card .caption"), footer: rect("footer") };
    });
    assert.ok(rects.notes.y > rects.current.y, "notes must sit below the current slide");
    assert.ok(rects.next.x >= rects.current.right, "next slide must sit beside the current slide");
    assert.ok(rects.pages.y > rects.next.y, "page list must sit below the next slide");
    assert.ok(rects.next.height > 120, "next slide must remain visible at the minimum window height");
    assert.ok(rects.caption.height <= 32, "card captions must leave space for slide content");
    assert.ok(rects.footer.height <= 54, "the action bar must leave height for notes and slides");
    for (const name of ["current", "next", "notes", "pages"]) {
      assert.ok(rects[name].bottom <= rects.footer.y + 1, `${name} must stay above the footer at ${width}×${height}`);
    }
  }
} finally {
  await browser.close();
}

console.log("Native presenter layout checks passed");
