// A1.1-PERF 前端合同测试（Vite mock，真实 DB fixture）：
// 1. 自动刷新 single-flight：慢请求期间不产生第二个 list_items，并发峰值 = 1
// 2. 来源/标签/缩略图变化仍能刷新（fingerprint 变化 → 整表更新）
// 3. 本地缩略图 URL 正确显示（绝对路径 → /fs/...）
// 4. 关闭/重开（重新加载页面 + 相同数据）后缩略图仍显示
// 5. 无变化自动刷新不整表重建（innerHTML 不变）
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync("/tmp/a11-fixture.json", "utf8"));
const MAIN_ID = fixture.id;

const server = spawn(process.execPath, [
  "node_modules/vite/bin/vite.js", "dist",
  "--host", "127.0.0.1", "--port", "4179", "--strictPort"
], { stdio: "ignore" });

const origin = "http://127.0.0.1:4179";
for (let i = 0; i < 80; i++) {
  try { const r = await fetch(origin); if (r.ok) break; } catch {}
  await new Promise(r => setTimeout(r, 50));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.error("page error:", e.stack || e.message));

// ---- 可编程 mock：记录 list_items 调用、并发峰值，支持延迟 resolve ----
await page.addInitScript((data) => {
  const allLibraries = data.allLibraries.map(l => ({ id: l.id, name: l.name, rootPath: l.root_path, sourceKind: l.source_kind, pathState: l.path_state, isActive: l.is_active !== 0, isOwner: false, createdAt: "2026-08-15T00:00:00Z", updatedAt: "2026-08-15T00:00:00Z", lastScannedAt: null, skillBinding: null }));
  const items = data.contextItems.map(o => ({ ...o, sourceBadges: [], tags: [] }));
  items.unshift({ id: data.id, libraryId: data.library_id, filePath: data.file_path, relativePath: data.relative_path, fileName: data.file_name, fileExt: data.file_ext, fileType: data.file_type, fileSize: data.file_size, modifiedAt: data.modified_at, title: data.title, summary: data.summary, pathState: data.path_state, isFavorite: data.is_favorite === 1, lastOpenedAt: data.last_opened_at, skillBinding: null, sourceBadges: data.sourceBadges, tags: data.tags, thumbnail: null });
  // 主卡带本地文件路径缩略图（绝对路径 → 前端应转 /fs/...）
  const main = items[0];
  main.thumbnail = { path: "/Users/example/.cache/thumbnails/item-" + data.id + ".png", status: "ready", width: 800, height: 450 };
  window.__PERF_MOCK__ = {
    resolveFirst: () => { if (window.__PERF_MOCK__._firstPending) { const r = window.__PERF_MOCK__._firstPending; window.__PERF_MOCK__._firstPending = null; r(); } },
    _firstPending: null,
    _currentItems: items
  };
  window.__PERF_STATS__ = { calls: 0, concurrent: 0, maxConcurrent: 0, pendingResolve: null };
  window.__TAURI_INTERNALS__ = {
    invoke: async (cmd, args) => {
      if (cmd === "list_libraries") return allLibraries;
      if (cmd === "list_items") {
        window.__PERF_STATS__.calls += 1;
        window.__PERF_STATS__.concurrent += 1;
        window.__PERF_STATS__.maxConcurrent = Math.max(window.__PERF_STATS__.maxConcurrent, window.__PERF_STATS__.concurrent);
        let respond = () => {
          window.__PERF_STATS__.concurrent -= 1;
        };
        const payload = window.__PERF_MOCK__._currentItems;
        // 第一次调用可被 hold 住（single-flight 测试）
        if (window.__PERF_STATS__.calls === 1 && window.__PERF_MOCK__._holdFirst) {
          await new Promise((resolve) => {
            window.__PERF_MOCK__._firstPending = resolve;
            window.__PERF_STATS__.pendingResolve = resolve;
          });
        }
        respond();
        return { items: payload, total: payload.length, page: 1, pageSize: 100, hasMore: false };
      }
      if (cmd === "list_tags") return data.tags.map(t => ({ ...t, color: t.color || "#888", createdAt: t.created_at, updatedAt: t.updated_at, usageCount: 1 }));
      if (cmd === "list_item_tags") return {};
      if (cmd === "list_ignored_items") return [];
      if (cmd === "get_recent_searches_v1") return [];
      if (cmd === "sync_filesystem_state") return {};
      if (cmd === "get_local_server_origin") return "http://127.0.0.1:4179";
      if (cmd === "list_libraries") return allLibraries;
      return null;
    },
    transformCallback: () => 0,
    metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main", windowLabel: "main" } }
  };
}, fixture);

// 页面加载后由 evaluate 初始化 stats（避免 init script 里全局未定义）
await page.goto(origin, { waitUntil: "networkidle" });
// 初次加载（boot 会调 loadItems）后捕获数据
await page.waitForSelector(`[data-open-item="${MAIN_ID}"]`);
// 停掉自动定时器：全部用 hook 手动触发，避免 2.5s 定时器干扰并发计数
await page.evaluate(() => window.__nutbookAutoRefresh?.stop?.());
console.log("[ok] page booted with main card");

// 构造 payload：主卡（带文件路径缩略图）+ 3 个 contextItem
const payloadItems = await page.evaluate((id) => {
  const cards = Array.from(document.querySelectorAll("[data-open-item]"));
  return cards.map((card) => ({ id: Number(card.dataset.openItem) }));
}, MAIN_ID);
const ids = payloadItems.map((p) => p.id);
const itemsPayload = ids.map((id, i) => ({
  id,
  libraryId: fixture.library_id,
  filePath: `/fixture/perf-${id}.md`,
  relativePath: `perf-${id}.md`,
  fileName: `perf-${id}.md`,
  fileExt: "md",
  fileType: "markdown",
  fileSize: 100 + i,
  modifiedAt: "1786720150",
  title: null,
  summary: `perf item ${id}`,
  pathState: "valid",
  isFavorite: i % 2 === 0 ? 1 : 0,
  lastOpenedAt: null,
  skillBinding: null,
  sourceBadges: i === 0 ? fixture.sourceBadges : [],
  tags: i === 0 ? fixture.tags : [],
  thumbnail: i === 0 ? { path: `/Users/example/.cache/thumbnails/item-${id}.png`, status: "ready", width: 800, height: 450 } : null
}));

// ---- 5. 无变化不整表重建 ----
await page.evaluate((payload) => {
  window.__PERF_MOCK__._currentItems = payload;
}, itemsPayload);
await page.evaluate(() => { window.__nutbookAutoRefresh.trigger(); });
await page.waitForTimeout(400);
const html1 = await page.evaluate(() => document.getElementById("itemList").innerHTML);
await page.evaluate(() => { window.__nutbookAutoRefresh.trigger(); });
await page.waitForTimeout(400);
const html2 = await page.evaluate(() => document.getElementById("itemList").innerHTML);
assert.equal(html1, html2, "no-change refresh must not rebuild the list");
console.log("[ok] 1. no-change auto refresh does not rebuild innerHTML");

// ---- 3. 本地缩略图 URL 正确显示 ----
const thumbSrc = await page.evaluate((id) => {
  const img = document.querySelector(`[data-open-item="${id}"] .thumb`);
  return img ? img.getAttribute("src") : null;
}, MAIN_ID);
assert.ok(thumbSrc, "main card must render a thumbnail <img>");
assert.ok(
  thumbSrc.includes("/fs/") && thumbSrc.includes("item-" + MAIN_ID + ".png"),
  `thumbnail must use local server /fs/ URL, got: ${thumbSrc}`
);
console.log("[ok] 2. local thumbnail path converted to /fs/ URL:", thumbSrc);

// ---- 4. 关闭/重开（重新加载 + 相同数据）后缩略图仍显示 ----
await page.reload({ waitUntil: "networkidle" });
await page.evaluate(() => window.__nutbookAutoRefresh?.stop?.());
await page.evaluate((payload) => {
  window.__PERF_STATS__ = { calls: 0, concurrent: 0, maxConcurrent: 0, pendingResolve: null };
  window.__PERF_MOCK__._currentItems = payload;
}, itemsPayload);
await page.evaluate(() => { window.__nutbookAutoRefresh.trigger(); });
await page.waitForTimeout(400);
const thumbAfterReload = await page.evaluate((id) => {
  const img = document.querySelector(`[data-open-item="${id}"] .thumb`);
  return img ? img.getAttribute("src") : null;
}, MAIN_ID);
assert.ok(
  thumbAfterReload && thumbAfterReload.includes("/fs/") && thumbAfterReload.includes("item-" + MAIN_ID + ".png"),
  `thumbnail must survive reload, got: ${thumbAfterReload}`
);
console.log("[ok] 3. thumbnail survives close/reopen (reload):", thumbAfterReload);

// ---- 2. 来源/标签/缩略图变化仍能刷新 ----
await page.evaluate((id) => {
  const items = window.__PERF_MOCK__._currentItems;
  const target = items.find((i) => i.id === id);
  target.sourceBadges = [{ kind: "skill", sourceId: "skill:changed", label: "Changed Skill Source", isOwner: true, available: true }];
  target.tags = [{ id: 999, name: "新增标签", color: null }];
  target.thumbnail = { path: `/Users/example/.cache/thumbnails/item-${id}.png`, status: "ready", width: 800, height: 450 };
}, MAIN_ID);
await page.evaluate(() => { window.__nutbookAutoRefresh.trigger(); });
await page.waitForTimeout(400);
const changed = await page.evaluate((id) => {
  const card = document.querySelector(`[data-open-item="${id}"]`);
  const skillBadge = card.querySelector(".source-badge-skill");
  const tagChip = card.querySelector(".tag-chip");
  return {
    hasSkill: !!skillBadge && skillBadge.textContent.includes("Changed Skill Source"),
    hasTag: !!tagChip && tagChip.textContent.includes("新增标签")
  };
}, MAIN_ID);
assert.ok(changed.hasSkill, "changed sourceBadges must refresh the UI");
assert.ok(changed.hasTag, "changed tags must refresh the UI");
console.log("[ok] 4. sourceBadges/tags changes refresh the UI");

// ---- 1. single-flight：慢请求期间不产生第二个 list_items ----
await page.evaluate(() => {
  window.__PERF_STATS__ = { calls: 0, concurrent: 0, maxConcurrent: 0, pendingResolve: null };
  window.__PERF_MOCK__._holdFirst = true;
});
await page.evaluate(() => { window.__nutbookAutoRefresh.trigger(); }); // 第一个：被 hold
await page.waitForTimeout(120);
const duringFirst = await page.evaluate(() => ({
  calls: window.__PERF_STATS__.calls,
  concurrent: window.__PERF_STATS__.concurrent
}));
assert.equal(duringFirst.calls, 1, "first refresh in flight");
await page.evaluate(() => { window.__nutbookAutoRefresh.trigger(); }); // 第二个：应合并为 pending，不新发
await page.waitForTimeout(200);
const afterSecondTrigger = await page.evaluate(() => ({
  calls: window.__PERF_STATS__.calls,
  inFlight: window.__nutbookAutoRefresh.state.inFlight,
  pending: window.__nutbookAutoRefresh.state.pending
}));
assert.equal(afterSecondTrigger.calls, 1, "second trigger must NOT start a second list_items while first is in flight");
assert.equal(afterSecondTrigger.inFlight, true, "first refresh still in flight");
assert.equal(afterSecondTrigger.pending, true, "second trigger must be merged as pending");
// 释放第一个 → pending 立即补跑（calls=2），并发峰值仍 = 1
await page.evaluate(() => window.__PERF_MOCK__.resolveFirst());
await page.waitForTimeout(400);
const finalStats = await page.evaluate(() => ({
  calls: window.__PERF_STATS__.calls,
  maxConcurrent: window.__PERF_STATS__.maxConcurrent
}));
assert.equal(finalStats.calls, 2, "pending refresh must run once after in-flight completes");
assert.equal(finalStats.maxConcurrent, 1, "max concurrent list_items must be 1");
console.log("[ok] 5. auto-refresh single-flight: calls=2, maxConcurrent=1");

console.log("\n=== A1.1-PERF frontend contracts passed ===");
await browser.close();
server.kill();
