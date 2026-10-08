import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.thumbnailRequests = [];
    window.livePreviewRequests = [];
    window.fullscreenRequests = [];
    window.timerActions = [];
    window.timerState = { timerElapsedMs: 0, timerRunning: false, timerHasStarted: false };
    const preview = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="576"><rect width="1024" height="576" fill="#142035"/><text x="60" y="130" fill="white" font-size="72">Slide</text></svg>')}`;
    const initialState = () => ({
      sessionId: "layout-check", language: "zh-CN", ready: true, rehearsal: true, sequence: 0,
      pages: [{ id: "one", title: "开场" }, { id: "two", title: "第二页" }, { id: "three", title: "第三页" }, { id: "four", title: "结束" }],
      activePageId: "one", notes: { one: [{ runs: [{ text: "当前页演讲备注", bold: false }] }] },
      ...window.timerState
    });
    window.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      if (command === "native_presentation_state") return initialState();
      if (command === "native_presentation_thumbnail") { window.thumbnailRequests.push(args.payload.pageId); return { dataUrl: preview }; }
      if (command === "native_presentation_live_preview") { window.livePreviewRequests.push(args.payload); return true; }
      if (command === "native_presentation_toggle_fullscreen") { window.fullscreenRequests.push(args.sessionId); return true; }
      if (command === "native_presentation_timer") {
        window.timerActions.push(args.payload.action);
        if (args.payload.action === "start" || args.payload.action === "resume") window.timerState = { timerElapsedMs: 0, timerRunning: true, timerHasStarted: true };
        if (args.payload.action === "pause") window.timerState.timerRunning = false;
        if (args.payload.action === "reset") window.timerState = { timerElapsedMs: 0, timerRunning: false, timerHasStarted: false };
        return initialState();
      }
      return true;
    } };
  });
  await page.goto(pathToFileURL(path.resolve("dist/native-presenter.html")).href);
  await page.waitForFunction(() => document.querySelectorAll(".preview-body img").length === 2);
  await page.waitForFunction(() => window.livePreviewRequests.length > 0);
  const firstLiveRequest = await page.evaluate(() => window.livePreviewRequests[0]);
  assert.equal(firstLiveRequest.sessionId, "layout-check");
  assert.deepEqual(
    [firstLiveRequest.viewportWidth, firstLiveRequest.viewportHeight],
    await page.evaluate(() => [innerWidth, innerHeight]),
    "the native child must receive the presenter's actual viewport for titlebar alignment"
  );
  assert.ok(firstLiveRequest.current.width > 300 && !firstLiveRequest.next,
    "only the current slide should get a live surface; next stays static");
  await page.evaluate(() => window.__NUTBOOK_LIVE_PREVIEW_READY__());
  assert.equal(await page.locator(".card .caption").nth(0).textContent(), "当前页 · 动态预览");
  assert.equal(await page.locator(".card .caption").nth(2).textContent(), "下一页 · 静态预览");
  await page.waitForFunction(() => window.thumbnailRequests.includes("three"));
  assert.equal(await page.locator("#reset").textContent(), "开始", "timer must wait for an explicit start or audience fullscreen");
  assert.equal(await page.locator("#pause").isDisabled(), true, "pause is unavailable before timing starts");
  await page.locator("#reset").click();
  assert.equal(await page.locator("#reset").textContent(), "重置");
  assert.equal(await page.locator("#pause").isEnabled(), true);
  await page.locator("#pause").click();
  assert.equal(await page.locator("#pause").textContent(), "继续");
  await page.locator("#pause").click();
  assert.equal(await page.locator("#pause").textContent(), "暂停");
  await page.locator("#reset").click();
  assert.equal(await page.locator("#reset").textContent(), "开始");
  assert.equal(await page.locator("#pause").isDisabled(), true);
  assert.deepEqual(await page.evaluate(() => window.timerActions), ["start", "pause", "resume", "reset"]);
  await page.keyboard.press("f");
  await page.keyboard.press("f");
  assert.deepEqual(await page.evaluate(() => window.fullscreenRequests), ["layout-check", "layout-check"],
    "F should toggle the audience fullscreen on both presses while the presenter has focus");
  assert.equal(await page.evaluate(() => window.thumbnailRequests.includes("three")), true,
    "the slide after next must be requested before advancing, so the next preview can be reused");
  await page.evaluate(() => { window.firstSlideImage = document.querySelector("#currentPreview img"); });
  const threePages = [{ id: "one", title: "开场" }, { id: "two", title: "第二页" }, { id: "three", title: "第三页" }, { id: "four", title: "结束" }];
  await page.evaluate(pages => window.__NUTBOOK_NATIVE_PRESENTATION_STATE__({
    sessionId: "layout-check", language: "zh-CN", ready: true, rehearsal: true, sequence: 0,
    pages, activePageId: "two", notes: {}
  }), threePages);
  await page.waitForFunction(() => window.livePreviewRequests.length >= 2);
  assert.equal(await page.locator("#currentPreview img").count(), 1, "forward navigation should use the prefetched next image");
  assert.equal(await page.locator("#nextPreview img").count(), 1,
    "forward navigation should reveal a prefetched next image without a loading flash");
  await page.evaluate(pages => window.__NUTBOOK_NATIVE_PRESENTATION_STATE__({
    sessionId: "layout-check", language: "zh-CN", ready: true, rehearsal: true, sequence: 0,
    pages, activePageId: "one", notes: {}
  }), threePages);
  assert.equal(await page.evaluate(() => document.querySelector("#currentPreview img") === window.firstSlideImage), true,
    "reverse navigation should reuse the decoded image without exposing a loading placeholder");
  assert.equal(await page.locator("#status").textContent(), "在线会议中请共享 NUTBOOK 窗口", "single-screen presenter should tell the user which window to share");
  await page.evaluate(() => window.__NUTBOOK_NATIVE_PRESENTATION_STATE__({
    sessionId: "layout-check", language: "zh-CN", ready: false, rehearsal: true, sequence: 0,
    pages: [{ id: "one", title: "开场" }, { id: "two", title: "下一页" }, { id: "three", title: "结束" }],
    activePageId: "one", notes: {}
  }));
  assert.equal(await page.locator("#status").textContent(), "在线会议中请共享 NUTBOOK 窗口", "a late pre-ready snapshot must not disable presenter controls");
  assert.equal(await page.locator("#next").isEnabled(), true);
  assert.equal(await page.locator("#notesHeight").count(), 0, "the redundant notes height slider should be gone");
  await page.evaluate(() => window.__NUTBOOK_NATIVE_PRESENTATION_STATE__({
    sessionId: "layout-check", language: "en-US", ready: true, rehearsal: true, sequence: 0,
    pages: [{ id: "one", title: "Opening" }], activePageId: "one", notes: {}
  }));
  assert.equal(await page.locator("#status").textContent(), "In online meetings, share the NUTBOOK window");
  await page.evaluate(() => window.__NUTBOOK_NATIVE_PRESENTATION_STATE__({
    sessionId: "layout-check", language: "zh-CN", ready: true, rehearsal: false, sequence: 0,
    pages: [{ id: "one", title: "开场" }], activePageId: "one", notes: {}
  }));
  assert.equal(await page.locator("#status").textContent(), "观众画面已就绪", "dual-screen mode should keep its ready status");
  await page.evaluate(() => localStorage.setItem("nutbook-native-presenter-layout", JSON.stringify({ notesBottomPercent: 34, theme: "light" })));
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll(".preview-body img").length === 2);
  assert.equal(await page.locator("#previewDivider").getAttribute("aria-valuenow"), "25", "the former default split should migrate to a larger slide");
  const previewBeforeThemeChange = await page.locator("#currentPreview img").getAttribute("src");
  assert.equal(await page.locator("#themeToggle").getAttribute("aria-label"), "切换到深色外观");
  await page.locator("#themeToggle").click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  assert.equal(await page.locator("#themeToggle").getAttribute("aria-label"), "切换到浅色外观");
  const themeButton = await page.locator("#themeToggle").boundingBox();
  assert.ok(themeButton.width <= 72 && themeButton.height <= 30, "the appearance toggle should stay compact");
  assert.equal(await page.locator("#currentPreview img").getAttribute("src"), previewBeforeThemeChange, "theme must not alter the slide preview");
  assert.equal(await page.locator("#notes").textContent(), "当前页演讲备注");
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll(".preview-body img").length === 2);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark", "presenter theme must persist across window reloads");
  if (process.env.NUTBOOK_AUDIT_SHOTS) await page.screenshot({ path: `${process.env.NUTBOOK_AUDIT_SHOTS}/presenter-dark.png` });
  await page.locator("#themeToggle").click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  assert.equal(await page.locator("#previewDivider").getAttribute("aria-valuenow"), "25", "the slide should receive more height by default");
  const dividerBeforeDrag = await page.locator("#previewDivider").boundingBox();
  await page.mouse.move(dividerBeforeDrag.x + dividerBeforeDrag.width / 2, dividerBeforeDrag.y + dividerBeforeDrag.height / 2);
  await page.mouse.down();
  await page.mouse.move(dividerBeforeDrag.x + dividerBeforeDrag.width / 2, dividerBeforeDrag.y - 75);
  await page.mouse.up();
  const draggedHeight = Number(await page.locator("#previewDivider").getAttribute("aria-valuenow"));
  assert.ok(draggedHeight > 25, "dragging the divider upward should enlarge the notes area");
  await page.locator("#previewDivider").focus();
  await page.keyboard.press("ArrowDown");
  assert.equal(Number(await page.locator("#previewDivider").getAttribute("aria-valuenow")), draggedHeight - 2, "keyboard resizing must not flip the slide");
  await page.reload();
  await page.waitForFunction(() => document.querySelectorAll(".preview-body img").length === 2);
  assert.equal(Number(await page.locator("#previewDivider").getAttribute("aria-valuenow")), draggedHeight - 2, "slide and notes split should persist");

  for (const [width, height] of [[1440, 900], [1080, 680]]) {
    await page.setViewportSize({ width, height });
    if (process.env.NUTBOOK_AUDIT_SHOTS && width === 1440) await page.screenshot({ path: `${process.env.NUTBOOK_AUDIT_SHOTS}/presenter-light.png` });
    const rects = await page.evaluate(() => {
      const rect = selector => {
        const { x, y, width, height, bottom, right } = document.querySelector(selector).getBoundingClientRect();
        return { x, y, width, height, bottom, right };
      };
      return { current: rect("#currentPreview"), next: rect("#nextPreview"), nextCard: rect(".card.next"), notes: rect(".notes"), pages: rect(".pages"), caption: rect(".card .caption"), footer: rect("footer") };
    });
    assert.ok(rects.notes.y > rects.current.y, "notes must sit below the current slide");
    assert.ok(rects.current.height > rects.notes.height, "the current slide must retain more room than notes");
    assert.ok(rects.next.x >= rects.current.right, "next slide must sit beside the current slide");
    assert.ok(rects.current.width > rects.next.width * 1.5, "the current slide should receive a larger share of the window");
    assert.ok(rects.pages.y > rects.next.y, "page list must sit below the next slide");
    assert.ok(rects.next.height > 120, "next slide must remain visible at the minimum window height");
    assert.ok(rects.nextCard.height < rects.pages.height, "the next slide must leave more height for the page list");
    assert.ok(rects.next.height <= rects.next.width * .6, "the next slide panel should not create large vertical letterboxing");
    assert.ok(rects.caption.height <= 32, "card captions must leave space for slide content");
    assert.ok(rects.footer.height <= 54, "the action bar must leave height for notes and slides");
    for (const name of ["current", "next", "notes", "pages"]) {
      assert.ok(rects[name].bottom <= rects.footer.y + 1, `${name} must stay above the footer at ${width}×${height}`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.__NUTBOOK_NATIVE_PRESENTATION_STATE__({
    sessionId: "layout-check", language: "zh-CN", ready: true, sequence: 0,
    pages: Array.from({ length: 30 }, (_, index) => ({ id: `page-${index + 1}`, title: `第 ${index + 1} 页` })),
    activePageId: "page-1", notes: {}
  }));
  assert.equal(await page.locator("#pages button").count(), 30);
  const pageList = page.locator("#pages");
  assert.ok(await pageList.evaluate(node => node.scrollHeight > node.clientHeight), "many pages must scroll inside the list");
  await pageList.evaluate(node => { node.scrollTop = node.scrollHeight; });
  assert.ok(await pageList.evaluate(node => node.scrollTop > 0), "the last page must be reachable without moving the whole presenter window");
  await page.evaluate(() => {
    const pages = Array.from({ length: 30 }, (_, index) => ({ id: `page-${index + 1}`, title: `第 ${index + 1} 页` }));
    const originalInvoke = window.__TAURI_INTERNALS__.invoke;
    let sequence = 0;
    let activePageId = "page-1";
    window.__TAURI_INTERNALS__.invoke = async (command, args) => {
      if (command !== "native_presentation_navigate") return originalInvoke(command, args);
      sequence += 1;
      const pending = { sessionId: "layout-check", language: "zh-CN", ready: true, pages,
        activePageId, pendingPageId: args.payload.pageId, sequence, notes: {} };
      window.__NUTBOOK_NATIVE_PRESENTATION_STATE__({ ...pending,
        activePageId: args.payload.pageId, pendingPageId: null });
      activePageId = args.payload.pageId;
      return pending;
    };
  });
  await page.locator("#pages button").nth(22).click();
  assert.equal(await page.locator("#pageCount").textContent(), "23 / 30", "a navigation ACK must not be overwritten by a late command response");
  assert.equal(await page.locator("#pages button").nth(22).isDisabled(), false, "the page list must unlock after the audience confirms navigation");
  assert.ok(await pageList.evaluate(node => node.scrollTop > 0), "navigation must preserve the long page list scroll position");
  await page.locator("#pages button").nth(23).click();
  assert.equal(await page.locator("#pageCount").textContent(), "24 / 30", "the next page must remain selectable after a fast ACK");
  await page.evaluate(() => window.__NUTBOOK_NATIVE_PRESENTATION_STATE__({
    sessionId: "layout-check", language: "zh-CN", ready: true,
    pages: Array.from({ length: 30 }, (_, index) => ({ id: `page-${index + 1}`, title: `第 ${index + 1} 页` })),
    activePageId: "page-23", pendingPageId: null, sequence: 1, notes: {}
  }));
  assert.equal(await page.locator("#pageCount").textContent(), "24 / 30", "a late ACK from an older navigation must not roll the presenter backward");

} finally {
  await browser.close();
}

console.log("Native presenter layout checks passed");
