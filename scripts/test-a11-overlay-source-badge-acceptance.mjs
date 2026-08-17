// A1.3 重新修复验收：HTML runtime controls overlay 来源徽标 + tooltip 边界。
// 直接加载 dist/runtime-overlay.html（与真实 GUI 相同的 child webview 页面），
// 用 viewport 高度模拟宿主 set_bounds 的异步结果：
//   - 40px（默认态）：badge tooltip 必须隐藏（当前 40px viewport 会被裁剪）
//   - 68px（hover 态）：badge tooltip 仍必须隐藏（门槛是 badge-tip 100px）
//   - 100px（badge-tip 态）：badge tooltip 显示且完整落在 viewport 内
// 同时验证 action 按钮 tooltip 兜底未被破坏、菜单开闭后继续 hover、窄窗口不溢出。
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = 4181;
const server = spawn(process.execPath, [
  "node_modules/vite/bin/vite.js", "dist",
  "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"
], { stdio: "ignore" });

const origin = `http://127.0.0.1:${PORT}`;
for (let i = 0; i < 80; i++) {
  try { const r = await fetch(origin); if (r.ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 50));
}

// 与主页卡片 / Markdown 工具栏同一 sourceBadges 语义的验收数据。
const OVERLAY_STATE = {
  itemId: 7001,
  isFavorite: false,
  isFullscreen: false,
  isEditing: false,
  customTag: { id: 1, name: "A0验收自定义标签" },
  customTags: [
    { id: 1, name: "A0验收自定义标签" },
    { id: 2, name: "超长自定义标签用于验收tooltip省略显示" }
  ],
  availableTags: [],
  skillTag: null,
  typeTag: "HTML",
  sourceBadges: [
    { kind: "project", sourceId: "project:1", label: "用于验证Nutbook项目来源标签超长省略显示行为的中文验收项目", isOwner: true, available: true },
    { kind: "project", sourceId: "project:2", label: "第二验收项目来源", isOwner: false, available: true },
    { kind: "skill", sourceId: "skill:long", label: "Extraordinarily Long English Skill Name For Nutbook Overlay Acceptance", isOwner: true, available: false }
  ]
};

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 40 } });
  page.on("pageerror", (e) => console.error("page error:", e.stack || e.message));
  await page.addInitScript((state) => {
    window.__NUTBOOK_RUNTIME_CONTROLS__ = state;
  }, OVERLAY_STATE);
  await page.goto(`${origin}/runtime-overlay.html`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelectorAll(".source-badge").length > 0);

  const tipOpacity = () => page.evaluate(() => {
    const el = document.querySelector(".source-badge-project .badge-tip");
    return el ? getComputedStyle(el).opacity : null;
  });

  // 1. 徽标渲染与顺序：自定义主标签 → 自定义 +1 → Project 主徽标 → 项目 +1 → Skill 主徽标 → 类型
  const chipTexts = await page.evaluate(() => {
    const visibleText = (el) => {
      const tip = el.querySelector ? el.querySelector(".badge-tip") : null;
      return (tip ? el.textContent.replace(tip.textContent || "", "") : el.textContent).trim();
    };
    const out = [];
    for (const child of document.querySelectorAll("#tagRow > *")) {
      if (child.getBoundingClientRect().width === 0) continue; // 隐藏的 customTagBtn 等
      if (child.id === "sourceBadgeChips") {
        for (const b of child.querySelectorAll(".source-badge")) out.push(visibleText(b));
      } else {
        out.push(visibleText(child));
      }
    }
    return out;
  });
  assert.ok(chipTexts.length >= 6, `chips should render, got ${JSON.stringify(chipTexts)}`);
  assert.match(chipTexts[0], /A0验收自定义标签/, `custom tag primary should render, got ${chipTexts[0]}`);
  assert.match(chipTexts[1], /^\+1$/, `custom tag +N should be +1, got ${chipTexts[1]}`);
  assert.match(chipTexts[2], /中文验收项目/, `project primary should render, got ${chipTexts[2]}`);
  assert.match(chipTexts[3], /^\+1$/, `project +N should be +1, got ${chipTexts[3]}`);
  assert.match(chipTexts[4], /English Skill Name/, `skill primary should render, got ${chipTexts[4]}`);
  assert.match(chipTexts[chipTexts.length - 1], /^HTML$/, `type chip should be last, got ${chipTexts[chipTexts.length - 1]}`);

  // 1b. 大窗口下自定义标签优先全量显示（不被截断、不被压缩）
  const customNameFit = await page.evaluate(() => {
    const el = document.querySelector("#customTagName");
    const chip = document.querySelector("#customTagBtn");
    const cr = chip.getBoundingClientRect();
    return { scrollW: el.scrollWidth, clientW: el.clientWidth, chipW: cr.width };
  });
  assert.ok(customNameFit.scrollW <= customNameFit.clientW + 0.5,
    `custom tag name must display fully at large viewport: ${JSON.stringify(customNameFit)}`);
  assert.ok(customNameFit.chipW >= 80, `custom chip must not be squeezed at large viewport: ${JSON.stringify(customNameFit)}`);

  // 1c. 大窗口下项目/技能徽标足够宽，至少看清一个完整单词（宽度 ≥ 110px，上限 120px 不多于一个词）
  const badgeWidths = await page.evaluate(() => {
    const w = (sel) => document.querySelector(sel).getBoundingClientRect().width;
    return { project: w(".source-badge-project"), skill: w(".source-badge-skill") };
  });
  assert.ok(badgeWidths.project >= 110 && badgeWidths.project <= 130,
    `project badge must be about one word wide at large viewport: ${JSON.stringify(badgeWidths)}`);
  assert.ok(badgeWidths.skill >= 110 && badgeWidths.skill <= 130,
    `skill badge must be about one word wide at large viewport: ${JSON.stringify(badgeWidths)}`);

  // 2. unavailable 徽标：虚线样式 + aria-label 带「来源不可用」
  const skillAria = await page.evaluate(() => document.querySelector(".source-badge-skill").getAttribute("aria-label"));
  assert.match(skillAria, /来源不可用/);
  const skillCls = await page.evaluate(() => document.querySelector(".source-badge-skill").className);
  assert.match(skillCls, /source-badge--unavailable/);

  // 3. 40px 默认 viewport：hover 徽标 → tooltip 必须隐藏（会被裁剪）
  await page.hover(".source-badge-project");
  await page.waitForTimeout(150);
  assert.equal(await tipOpacity(), "0", "badge tooltip must stay hidden at 40px (clipped viewport)");

  // 4. 68px hover 态：仍必须隐藏（门槛是 badge-tip 100px）
  await page.setViewportSize({ width: 1280, height: 68 });
  await page.waitForTimeout(200);
  assert.equal(await tipOpacity(), "0", "badge tooltip must stay hidden at 68px (hover mode is not enough)");

  // 5. 100px badge-tip 态：tooltip 显示，文本完整、完全落在 viewport 内
  await page.setViewportSize({ width: 1280, height: 100 });
  await page.waitForFunction(() => {
    const el = document.querySelector(".source-badge-project .badge-tip");
    return el && getComputedStyle(el).opacity === "1";
  }, null, { timeout: 3000 });
  const tipInfo = await page.evaluate(() => {
    const tip = document.querySelector(".source-badge-project .badge-tip");
    const rect = tip.getBoundingClientRect();
    return {
      text: tip.textContent.trim(),
      top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right,
      innerW: window.innerWidth, innerH: window.innerHeight
    };
  });
  assert.match(tipInfo.text, /中文验收项目/);
  assert.match(tipInfo.text, /第二验收项目来源/, "tooltip must list all project names");
  assert.ok(tipInfo.bottom <= tipInfo.innerH + 0.5, `tooltip bottom ${tipInfo.bottom} must fit viewport ${tipInfo.innerH}`);
  assert.ok(tipInfo.top >= -0.5, `tooltip top ${tipInfo.top} must be inside viewport`);
  assert.ok(tipInfo.left >= -0.5 && tipInfo.right <= tipInfo.innerW + 0.5, `tooltip horizontally clamped: ${JSON.stringify(tipInfo)}`);

  // 5b. 真实 GUI 时序：宿主每次 attach 都会 eval update script（同 item 重放），
  // 不得清掉 pendingTip；随后 set_bounds 落地（resize）→ tooltip 仍能显示。
  await page.setViewportSize({ width: 1280, height: 40 });
  await page.waitForTimeout(150);
  await page.hover(".source-badge-skill");
  await page.waitForTimeout(100); // pendingTip 已挂起，40px 下隐藏
  await page.evaluate((state) => {
    window.__NUTBOOK_UPDATE_OVERLAY_STATE__?.(state);
  }, OVERLAY_STATE);
  await page.setViewportSize({ width: 1280, height: 100 });
  await page.waitForFunction(() => {
    const el = document.querySelector(".source-badge-skill .badge-tip");
    return el && getComputedStyle(el).opacity === "1";
  }, null, { timeout: 3000 });

  // 6. 移到 action 按钮：badge tooltip 隐藏，action 按钮 tooltip 兜底仍然工作
  await page.hover("#favoriteButton");
  await page.waitForTimeout(150);
  assert.equal(await tipOpacity(), "0", "badge tooltip must hide when leaving the badge");
  const actionTipOpacity = await page.evaluate(() => getComputedStyle(document.querySelector("#favoriteButton .tip")).opacity);
  assert.equal(actionTipOpacity, "1", "action button tooltip fallback must still work");
  const actionTipRect = await page.evaluate(() => {
    const r = document.querySelector("#favoriteButton .tip").getBoundingClientRect();
    return { bottom: r.bottom, top: r.top };
  });
  assert.ok(actionTipRect.bottom <= 100.5, `action tip bottom ${actionTipRect.bottom} fits 100px viewport`);

  // 7. 更多菜单开/关后继续 hover 徽标 → tooltip 仍可显示
  await page.click("#moreButton");
  await page.waitForTimeout(120);
  const menuOpen = await page.evaluate(() => document.querySelector("#menu").classList.contains("open"));
  assert.equal(menuOpen, true, "more menu should open");
  await page.mouse.click(8, 8); // 点击菜单外关闭
  await page.waitForTimeout(120);
  const menuClosed = await page.evaluate(() => !document.querySelector("#menu").classList.contains("open"));
  assert.equal(menuClosed, true, "more menu should close");
  await page.hover(".source-badge-skill");
  await page.waitForFunction(() => {
    const el = document.querySelector(".source-badge-skill .badge-tip");
    return el && getComputedStyle(el).opacity === "1";
  }, null, { timeout: 3000 });
  const skillTipText = await page.evaluate(() => document.querySelector(".source-badge-skill .badge-tip").textContent.trim());
  assert.match(skillTipText, /Extraordinarily Long English Skill Name/);

  // 8. 缩回 40px（宿主收缩）→ 再扩到 100px：resize 重试路径稳定
  await page.setViewportSize({ width: 1280, height: 40 });
  await page.waitForTimeout(150);
  assert.equal(await tipOpacity(), "0", "badge tooltip must hide again when viewport collapses");
  await page.setViewportSize({ width: 1280, height: 100 });
  await page.waitForFunction(() => {
    const el = document.querySelector(".source-badge-skill .badge-tip");
    return el && getComputedStyle(el).opacity === "1";
  }, null, { timeout: 3000 });

  // 8b. 自定义标签 chip：同一门控，100px 下 tooltip 列全名（含 +N 的第二标签）
  await page.hover("#customTagBtn");
  await page.waitForFunction(() => {
    const el = document.querySelector("#customTagBtn .badge-tip");
    return el && getComputedStyle(el).opacity === "1";
  }, null, { timeout: 3000 });
  const customTipText = await page.evaluate(() => document.querySelector("#customTagBtn .badge-tip").textContent.trim());
  assert.match(customTipText, /A0验收自定义标签/);
  assert.match(customTipText, /超长自定义标签/, "custom tag tooltip must list all assigned tag names");
  const customTipRect = await page.evaluate(() => {
    const r = document.querySelector("#customTagBtn .badge-tip").getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, innerW: window.innerWidth, innerH: window.innerHeight };
  });
  assert.ok(customTipRect.bottom <= customTipRect.innerH + 0.5, `custom tip bottom ${customTipRect.bottom} must fit ${customTipRect.innerH}`);
  assert.ok(customTipRect.left >= -0.5 && customTipRect.right <= customTipRect.innerW + 0.5, `custom tip clamped: ${JSON.stringify(customTipRect)}`);

  // 9. 窄窗口（最小支持宽度）：不溢出 viewport、类型与 +N 仍可见
  await page.setViewportSize({ width: 420, height: 100 });
  await page.waitForTimeout(150);
  const narrow = await page.evaluate(() => {
    const row = document.querySelector(".row").getBoundingClientRect();
    const visibleText = (el) => {
      const tip = el.querySelector ? el.querySelector(".badge-tip") : null;
      return (tip ? el.textContent.replace(tip.textContent || "", "") : el.textContent).trim();
    };
    const chips = [];
    for (const child of document.querySelectorAll("#tagRow > *")) {
      if (child.getBoundingClientRect().width === 0) continue;
      if (child.id === "sourceBadgeChips") {
        for (const b of child.querySelectorAll(".source-badge")) {
          const r = b.getBoundingClientRect();
          chips.push({ text: visibleText(b), left: r.left, right: r.right, width: r.width });
        }
      } else {
        const r = child.getBoundingClientRect();
        chips.push({ text: visibleText(child), left: r.left, right: r.right, width: r.width });
      }
    }
    return { rowRight: row.right, innerW: window.innerWidth, chips };
  });
  assert.ok(narrow.rowRight <= narrow.innerW + 0.5, `row must not overflow narrow viewport: ${JSON.stringify(narrow)}`);
  for (const chip of narrow.chips) {
    assert.ok(chip.right <= narrow.innerW + 0.5, `chip "${chip.text}" must stay inside narrow viewport: ${JSON.stringify(chip)}`);
  }
  const typeChip = narrow.chips[narrow.chips.length - 1];
  assert.equal(typeChip.text, "HTML");

  console.log("=== A1.3 overlay source badge acceptance passed ===");
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill("SIGTERM");
}
