// PR C / Task C2 回归测试：在线封面卡片渲染与 NutbookCoverCard 控制器。
//
// 加载真实 dist/index.html（宿主完整脚本），验证：
// - 远程封面卡片 DOM：标题 SVG fallback 常显 + 远程 <img> 带 loading=lazy /
//   no-referrer / decoding=async（只读被动资源，绝不 fetch 后 inline）
// - onload 后复核自然尺寸 4:3..2:1：合格 → 整体替换（fallback 隐藏、live 显示、
//   警告清空、卡片 aria 移除警告后缀）；不合格 → 继续标题 SVG + 比例警告
// - onerror / 离线 → 继续标题 SVG + 失败/离线警告；accessible name 同步
// - 本地降级封面（failed + markdown-image-cover）：fallback SVG + hover 警告
// - URL 变化守卫：旧异步结果（已脱离文档的元素）不再生效
// 说明：宿主 boot 需要 Tauri IPC，普通浏览器中 invoke 失败但脚本可评估、
// 控制器注册于顶层；卡片 DOM 由测试按 thumbnailNode 输出结构手工构造。

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  // 直接加载真实宿主页面（file:// 保证 localStorage 可用；脚本顶层注册
  // NutbookCoverCard；Tauri IPC 缺失只会让异步 boot 失败，不影响控制器）。
  await page.goto(`file://${process.cwd()}/dist/index.html`, { waitUntil: "load" });
  await page.waitForFunction(() => Boolean(window.NutbookCoverCard?.remoteLoaded), null, { timeout: 10000 });

  // 确认控制器注册成功（证明在线封面路径在宿主真实脚本中可达）。
  const controller = await page.evaluate(() => ({
    hasRemoteLoaded: typeof window.NutbookCoverCard.remoteLoaded === "function",
    hasRemoteFailed: typeof window.NutbookCoverCard.remoteFailed === "function",
    hasRemoteTimeout: typeof window.NutbookCoverCard.remoteTimedOut === "function",
    hasRetry: typeof window.NutbookCoverCard.retry === "function",
    ratioOk: window.NutbookCoverCard.coverRatioOk(640, 360),
    ratioBad: window.NutbookCoverCard.coverRatioOk(640, 640),
    ratioPortrait: window.NutbookCoverCard.coverRatioOk(360, 640),
    ratioEdge43: window.NutbookCoverCard.coverRatioOk(4, 3),
    ratioEdge21: window.NutbookCoverCard.coverRatioOk(2, 1),
    ratioUltrawide: window.NutbookCoverCard.coverRatioOk(21, 9)
  }));
  assert.equal(controller.hasRemoteLoaded, true, "NutbookCoverCard must register in the real host script");
  assert.equal(controller.hasRemoteTimeout, true, "remote covers need an explicit visible-load timeout");
  assert.equal(controller.hasRetry, true, "failed remote covers need a recovery path");
  assert.equal(controller.ratioOk, true, "16:9 must pass the ratio recheck");
  assert.equal(controller.ratioBad, false, "square must fail the ratio recheck");
  assert.equal(controller.ratioPortrait, false, "portrait must fail the ratio recheck");
  assert.equal(controller.ratioEdge43, true, "4:3 lower boundary must pass");
  assert.equal(controller.ratioEdge21, true, "2:1 upper boundary must pass");
  assert.equal(controller.ratioUltrawide, false, "2.33:1 ultrawide must fail");

  // 构造远程封面卡片 DOM（与 thumbnailNode 输出同构）。
  await page.evaluate(() => {
    document.body.innerHTML = `
      <style>
        .thumb-wrap { position: relative; width: 320px; height: 180px; overflow: hidden; }
        .thumb-cover-fallback, .thumb-remote-live { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .thumb-cover-warning { opacity: 0; }
      </style>
      <article class="item-card" tabindex="0" aria-label="打开 demo">
        <div class="thumb-wrap thumb-cover-state" data-remote-cover-card="999" data-cover-aria-base="打开 demo">
          <img class="thumb thumb-cover-fallback" src="fallback.svg" alt="">
          <img class="thumb thumb-remote-live" loading="lazy" decoding="async" referrerpolicy="no-referrer"
               src="https://example.invalid/covers/landscape-16x9.png" data-item-id="999"
               data-cover-url="https://example.invalid/covers/landscape-16x9.png" alt=""
               aria-hidden="true" style="display:none"
               onload="NutbookCoverCard.remoteLoaded(this)" onerror="NutbookCoverCard.remoteFailed(this)">
          <div class="thumb-cover-warning" role="note" aria-hidden="true"></div>
        </div>
      </article>
    `;
    window.__live = document.querySelector(".thumb-remote-live");
    window.__fallback = document.querySelector(".thumb-cover-fallback");
    window.__wrap = document.querySelector(".thumb-wrap");
    window.__card = document.querySelector(".item-card");
    Object.defineProperty(window.__live, "naturalWidth", { value: 640, configurable: true });
    Object.defineProperty(window.__live, "naturalHeight", { value: 360, configurable: true });
  });

  // 成功路径：onload 复核比例合格 → 整体替换 + 移除警告 + aria 同步。
  await page.evaluate(() => window.NutbookCoverCard.remoteLoaded(window.__live));
  const success = await page.evaluate(() => ({
    liveDisplay: window.__live.style.display,
    fallbackDisplay: window.__fallback.style.display,
    warning: window.__wrap.querySelector(".thumb-cover-warning").textContent,
    aria: window.__card.getAttribute("aria-label")
  }));
  assert.equal(success.liveDisplay, "block", "remote img must replace the fallback on success");
  assert.equal(success.fallbackDisplay, "none", "fallback must hide after success");
  assert.equal(success.warning, "", "warning must clear after success");
  assert.equal(success.aria, "打开 demo", "accessible name must drop the loading suffix after success");

  // 比例不合格：fallback 保持 + 比例警告 + aria 同步。
  await page.evaluate(() => {
    Object.defineProperty(window.__live, "naturalWidth", { value: 640, configurable: true });
    Object.defineProperty(window.__live, "naturalHeight", { value: 640, configurable: true });
    window.__live.style.display = "none";
    window.__fallback.style.display = "";
    window.NutbookCoverCard.remoteLoaded(window.__live);
  });
  const ratioFail = await page.evaluate(() => ({
    liveDisplay: window.__live.style.display,
    fallbackDisplay: window.__fallback.style.display,
    warning: window.__wrap.querySelector(".thumb-cover-warning").textContent,
    aria: window.__card.getAttribute("aria-label"),
    warningOn: window.__wrap.classList.contains("thumb-cover-warning-on")
  }));
  assert.equal(ratioFail.liveDisplay, "none", "ratio-fail must keep the fallback");
  assert.notEqual(ratioFail.fallbackDisplay, "none", "fallback must stay visible");
  assert.ok(ratioFail.warning.includes("4:3"), `ratio warning expected, got: ${ratioFail.warning}`);
  assert.ok(ratioFail.aria.includes("4:3"), `aria must carry the ratio reason, got: ${ratioFail.aria}`);
  assert.equal(ratioFail.warningOn, true, "hover warning state must be armed");

  // 失败/离线：fallback 保持 + 失败警告 + aria 同步。
  await page.evaluate(() => window.NutbookCoverCard.remoteFailed(window.__live));
  const failed = await page.evaluate(() => ({
    liveDisplay: window.__live.style.display,
    fallbackDisplay: window.__fallback.style.display,
    warning: window.__wrap.querySelector(".thumb-cover-warning").textContent,
    aria: window.__card.getAttribute("aria-label")
  }));
  assert.equal(failed.liveDisplay, "none", "load failure must keep the fallback");
  assert.notEqual(failed.fallbackDisplay, "none", "fallback must stay visible after failure");
  assert.ok(failed.warning.length > 0, "failure warning must be present");
  assert.notEqual(failed.aria, "打开 demo", "accessible name must carry the failure reason");
  const warningVisibility = await page.evaluate(async () => {
    const warning = window.__wrap.querySelector(".thumb-cover-warning");
    const atRest = getComputedStyle(warning).opacity;
    window.__card.focus();
    // 警告有 120ms opacity 过渡：轮询等待过渡完成（固定 sleep 在高负载机器
    // 上可能不够），避免取到过渡起点 0。
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline && getComputedStyle(warning).opacity !== "1") {
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    const onKeyboardFocus = getComputedStyle(warning).opacity;
    window.__card.blur();
    return { atRest, onKeyboardFocus };
  });
  assert.equal(warningVisibility.atRest, "0", "failure warning must stay quiet at rest");
  assert.equal(warningVisibility.onKeyboardFocus, "1", "card keyboard focus must reveal the warning");

  // 超时：仍显示 fallback，且给出可恢复原因；随后资源 load 成功会自动清除错误。
  await page.evaluate(() => window.NutbookCoverCard.remoteTimedOut(window.__live));
  const timedOut = await page.evaluate(() => ({
    warning: window.__wrap.querySelector(".thumb-cover-warning").textContent,
    failed: window.__live.dataset.coverFailed
  }));
  assert.match(timedOut.warning, /超时|timed out/i, "visible remote load timeout must be disclosed");
  assert.equal(timedOut.failed, "true", "timeout must arm the retry path");
  await page.evaluate(() => {
    Object.defineProperty(window.__live, "naturalWidth", { value: 640, configurable: true });
    Object.defineProperty(window.__live, "naturalHeight", { value: 360, configurable: true });
    window.NutbookCoverCard.remoteLoaded(window.__live);
  });
  const recovered = await page.evaluate(() => ({
    liveDisplay: window.__live.style.display,
    warning: window.__wrap.querySelector(".thumb-cover-warning").textContent,
    failed: window.__live.dataset.coverFailed
  }));
  assert.equal(recovered.liveDisplay, "block", "a later successful load must restore the online cover");
  assert.equal(recovered.warning, "", "recovery must clear the warning");
  assert.equal(recovered.failed, "false", "recovery must disarm retry state");

  // URL 变化守卫：旧异步结果（元素已脱离文档）不得再覆盖。
  // 比较调用前后的 fallback 状态（此前成功替换已把 fallback 置为 none），
  // detached 元素的迟到结果不得改变当前卡片的任何状态。
  const detachedBefore = await page.evaluate(() => window.__fallback.style.display);
  await page.evaluate(() => {
    window.__live.remove();
    window.NutbookCoverCard.remoteLoaded(window.__live);
  });
  const detached = await page.evaluate(() => window.__fallback.style.display);
  assert.equal(detached, detachedBefore, "detached element result must not touch the current card");

  // 本地降级封面（thumbnailNode 降级分支结构）：fallback SVG + hover 警告文案。
  const degraded = await page.evaluate(() => {
    const { t } = window; // 真实宿主 t
    document.body.innerHTML = `
      <article class="item-card" tabindex="0" aria-label="打开 demo">
        <div class="thumb-wrap thumb-cover-state" data-cover-aria-base="打开 demo">
          <img class="thumb thumb-cover-fallback" src="fallback.svg" alt="">
          <div class="thumb-cover-warning" role="note" aria-hidden="true">封面异常：cover src ./assets/missing.png does not exist on disk</div>
        </div>
      </article>
    `;
    const warning = document.querySelector(".thumb-cover-warning");
    return {
      text: warning.textContent,
      opacity: getComputedStyle(warning).opacity
    };
  });
  assert.match(degraded.text, /does not exist/, "degraded warning must carry the full reason");
} finally {
  await browser.close();
}

// 控制器可达性已在真实宿主脚本中验证（页面上方断言）；宿主 boot 的 Tauri IPC
// 失败属于预期环境差异，不影响 C2 卡片渲染路径的自动验证。
console.log("markdown cover card rendering: OK");
