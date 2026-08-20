import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// 真实 DB 数据（A0 验收 shared item），不硬编码 item id，统一用 fixture.id。
const fixture = JSON.parse(readFileSync("/tmp/a11-fixture.json", "utf8"));
const MAIN_ID = fixture.id;
const FILE_PATH = fixture.file_path;

const server = spawn(process.execPath, [
  "node_modules/vite/bin/vite.js", "dist",
  "--host", "127.0.0.1", "--port", "4177", "--strictPort"
], { stdio: "ignore" });

const origin = "http://127.0.0.1:4177";
for (let i = 0; i < 80; i++) {
  try { const r = await fetch(origin); if (r.ok) break; } catch {}
  await new Promise(r => setTimeout(r, 50));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1362, height: 900 } });
page.on("pageerror", (e) => console.error("page error:", e.stack || e.message));
page.on("console", (msg) => { if (msg.type() === "error") console.log("[console.error]", msg.text().slice(0, 300)); });

// 文档工具栏验收 item：3 自定义标签 + 2 Project（1 长中文）+ 2 Skill（1 长英文 + available=false）。
const docItem = {
  id: MAIN_ID,
  libraryId: fixture.library_id,
  filePath: fixture.file_path,
  relativePath: fixture.relative_path,
  fileName: fixture.file_name,
  fileExt: "md",
  fileType: "markdown",
  fileSize: fixture.file_size,
  modifiedAt: fixture.modified_at,
  title: null,
  summary: "Markdown 工具栏来源徽标验收",
  pathState: fixture.path_state,
  isFavorite: 0,
  lastOpenedAt: null,
  skillBinding: null,
  sourceBadges: [
    { kind: "project", sourceId: "project:doc1", label: "用于验证Nutbook项目来源标签超长省略显示行为的中文验收项目来源名称", isOwner: false, available: true },
    { kind: "project", sourceId: "project:doc2", label: "第二验收项目来源", isOwner: true, available: true },
    { kind: "skill", sourceId: "skill:firstlongacceptanceskill", label: "First Extraordinarily Long English Acceptance Skill Name For Ellipsis", isOwner: true, available: false },
    { kind: "skill", sourceId: "skill:secondacceptanceskill", label: "Second Acceptance Skill", isOwner: false, available: true }
  ],
  tags: [
    { id: 901, name: "验收标签甲", color: null },
    { id: 902, name: "验收标签乙", color: null },
    { id: 903, name: "验收标签丙", color: null }
  ],
  thumbnail: null
};

// addInitScript 的函数体会被序列化到浏览器执行：所有依赖必须内联或经 data 参数传入，
// 不能引用 Node 模块作用域的自由变量（否则浏览器端 ReferenceError，文档无法打开）。
await page.addInitScript((data) => {
  const { fixture, docItem } = data;
  const allLibraries = fixture.allLibraries.map((l) => ({
    id: l.id, name: l.name, rootPath: l.root_path, sourceKind: l.source_kind,
    pathState: l.path_state,
    isActive: l.is_active !== 0, isOwner: false,
    createdAt: "2026-08-15T00:00:00Z", updatedAt: "2026-08-15T00:00:00Z",
    lastScannedAt: null, skillBinding: null
  }));
  const items = [];
  for (const o of fixture.contextItems) items.push({ ...o, sourceBadges: [], tags: [] });
  const main = {
    id: fixture.id, libraryId: fixture.library_id,
    filePath: fixture.file_path, relativePath: fixture.relative_path,
    fileName: fixture.file_name, fileExt: fixture.file_ext, fileType: fixture.file_type,
    fileSize: fixture.file_size, modifiedAt: fixture.modified_at,
    title: fixture.title, summary: fixture.summary, pathState: fixture.path_state,
    isFavorite: fixture.is_favorite === 1, lastOpenedAt: fixture.last_opened_at,
    skillBinding: null, sourceBadges: docItem.sourceBadges,
    tags: docItem.tags, thumbnail: null
  };
  items.unshift(main);

  // 可变的标签状态：模拟真实 set_item_tags / create_tag 生命周期。
  let currentTags = docItem.tags.map((t) => ({ ...t }));
  let nextTagId = 5000;
  const tagList = fixture.tags.map((t) => ({ ...t }));

  window.__TAURI_INTERNALS__ = {
    invoke: async (cmd, args = {}) => {
      // 应用侧 invoke 经 commandVariants 把多数命令实参包成 { payload: args }；
      // 少量命令直接传裸 args。统一解包后读取。
      const p = (args && typeof args === "object" && "payload" in args && args.payload && typeof args.payload === "object")
        ? args.payload
        : (args || {});
      if (cmd === "list_libraries") return allLibraries;
      if (cmd === "list_items") {
        main.tags = currentTags;
        return { items: items, total: items.length, page: 1, pageSize: 30, hasMore: false };
      }
      if (cmd === "list_item_tags") return {};
      if (cmd === "list_tags") {
        return tagList.map((t) => ({ ...t, color: t.color || "#888", createdAt: t.created_at, updatedAt: t.updated_at, usageCount: 1 }));
      }
      if (cmd === "list_ignored_items") return [];
      if (cmd === "get_recent_searches_v1") return [];
      if (cmd === "sync_filesystem_state") return {};
      if (cmd === "mark_item_opened") return null;
      if (cmd === "get_item_detail") {
        main.tags = currentTags;
        return main;
      }
      if (cmd === "get_item_preview") {
        return {
          fileType: "markdown",
          itemId: p.itemId ?? fixture.id,
          title: null,
          raw: "# 文档标题\n\n正文内容用于 Markdown 工具栏验收。",
          html: "<h1>文档标题</h1><p>正文内容用于 Markdown 工具栏验收。</p>",
          baseDir: "",
          editable: true
        };
      }
      if (cmd === "create_tag") {
        const tag = {
          id: nextTagId++,
          name: p.name || "未命名",
          color: null,
          created_at: "2026-08-15T00:00:00Z",
          updated_at: "2026-08-15T00:00:00Z"
        };
        tagList.push(tag);
        return tag;
      }
      if (cmd === "set_item_tags") {
        const ids = Array.isArray(p.tagIds) ? p.tagIds : [];
        currentTags = ids
          .map((id) => tagList.find((t) => t.id === id))
          .filter(Boolean)
          .map((t) => ({ id: t.id, name: t.name, color: t.color || null, created_at: t.created_at, updated_at: t.updated_at }));
        return { tags: currentTags };
      }
      return null;
    },
    transformCallback: () => 0,
    metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main", windowLabel: "main" } }
  };
}, { fixture, docItem });

await page.goto(origin, { waitUntil: "networkidle" });
await page.waitForSelector('.item-card', { timeout: 8000 });
await page.waitForSelector(`[data-open-item="${MAIN_ID}"]`, { timeout: 5000 });

// 从主页点击卡片，走真实 openItem → renderViewer → 宿主工具栏渲染。
await page.click(`[data-open-item="${MAIN_ID}"]`);
await page.waitForSelector('#breadcrumbTags .source-badge-project', { timeout: 8000 });
await page.waitForSelector('#breadcrumbTags .source-badge-skill', { timeout: 5000 });

const tagSel = "#breadcrumbTags";
const cardSel = `[data-open-item="${MAIN_ID}"]`;
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const shotDir = join(homedir(), "WorkBuddy", ts);
mkdirSync(shotDir, { recursive: true });
console.log("screenshots dir:", shotDir);

// ---- 1. 顺序：自定义 → Project → Skill → 类型 ----
const order = await page.evaluate((sel) => Array.from(document.querySelector(sel).children).map((el) => ({
  cls: el.className,
  text: (el.querySelector(".source-badge-label, .tag-chip-label")?.textContent || el.textContent || "").trim()
})), tagSel);
console.log("[order]", JSON.stringify(order, null, 2));
const classes = order.map((n) => n.cls);
const triggerIdx = classes.findIndex((c) => c.includes("breadcrumb-tag-trigger"));
const projectIdx = classes.findIndex((c) => c.includes("source-badge-project"));
const skillIdx = classes.findIndex((c) => c.includes("source-badge-skill"));
const typeIdx = classes.findIndex((c) => c.includes("meta-chip"));
assert.ok(triggerIdx >= 0 && projectIdx > triggerIdx, "Project must come after custom tag");
assert.ok(skillIdx > projectIdx, "Skill must come after Project");
assert.ok(typeIdx > skillIdx, "type must come after Skill");
console.log("[ok] 1. order custom → Project → Skill → type");

// ---- 2. 3 自定义标签 → primary + +2 ----
const customInfo = await page.evaluate((sel) => {
  // 可见文本：只取文本节点，排除隐藏 .chip-tooltip（display:none 的 tooltip 文本源）
  const visible = (el) => (el ? Array.from(el.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim() : "");
  const root = document.querySelector(sel);
  const trigger = root.querySelector(".breadcrumb-tag-trigger");
  const more = root.querySelector(".tag-chip-more");
  return {
    triggerText: trigger?.querySelector(".tag-chip-label")?.textContent.trim() || "",
    moreText: visible(more),
    tooltip: trigger?.querySelector(".chip-tooltip")?.textContent.trim() || ""
  };
}, tagSel);
assert.ok(customInfo.triggerText.length > 0, "custom primary must render");
assert.equal(customInfo.moreText, "+2", "3 custom tags must collapse to +2");
assert.ok(customInfo.tooltip.includes("验收标签丙"), "custom tooltip must list all names");
console.log("[ok] 2. custom primary + +2");

// ---- 3. 2 Project / 2 Skill → +1 ----
const sourceInfo = await page.evaluate((sel) => {
  const visible = (el) => (el ? Array.from(el.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim() : "");
  const root = document.querySelector(sel);
  const moreNodes = Array.from(root.querySelectorAll(".source-badge-more"));
  return {
    projectMore: visible(moreNodes[0]),
    skillMore: moreNodes.slice(1).map(visible)
  };
}, tagSel);
assert.equal(sourceInfo.projectMore, "+1", "2 projects must collapse to +1");
assert.ok(sourceInfo.skillMore.includes("+1"), "2 skills must collapse to +1");
console.log("[ok] 3. project/skill primary + +1");

// ---- 4. 长名称：第一字符可见 + 尾部 ellipsis ----
const ellipsis = await page.evaluate((sel) => {
  const grab = (cls) => {
    const label = document.querySelector(`${sel} ${cls} .source-badge-label`);
    if (!label) return null;
    const lr = label.getBoundingClientRect();
    const range = document.createRange();
    range.setStart(label.firstChild, 0);
    range.setEnd(label.firstChild, 1);
    const r = range.getBoundingClientRect();
    return { clientW: label.clientWidth, scrollW: label.scrollWidth, firstLeft: r.left, labelLeft: lr.left };
  };
  return { project: grab(".source-badge-project"), skill: grab(".source-badge-skill") };
}, tagSel);
for (const key of ["project", "skill"]) {
  assert.ok(ellipsis[key].scrollW > ellipsis[key].clientW, `${key} long name must ellipsize`);
  assert.ok(ellipsis[key].firstLeft - ellipsis[key].labelLeft < 6, `${key} first char must sit at left edge`);
}
console.log("[ok] 4. long names ellipsize at tail, first char visible");

// ---- 5. +N / 类型不可压缩 ----
const fixed = await page.evaluate((sel) => {
  const root = document.querySelector(sel);
  const result = {};
  root.querySelectorAll(".source-badge-more, .tag-chip-more, .meta-chip").forEach((m) => {
    const cs = getComputedStyle(m);
    result[m.className] = { flexShrink: cs.flexShrink, flexGrow: cs.flexGrow, scrollW: m.scrollWidth, clientW: m.clientWidth };
  });
  return result;
}, tagSel);
for (const [, v] of Object.entries(fixed)) {
  assert.equal(v.flexShrink, "0", "+N/type must not shrink");
  assert.equal(v.flexGrow, "0", "+N/type must not grow");
  assert.ok(v.scrollW <= v.clientW, "+N/type must be fully visible");
}
const typeText = await page.evaluate((sel) => document.querySelector(`${sel} .meta-chip`)?.textContent.trim(), tagSel);
assert.ok(typeText && typeText.toLowerCase().includes("markdown"), `type must be Markdown (got ${typeText})`);
console.log("[ok] 5. +N and type non-compressible");

// ---- 5b. 常态文字色与工具栏统一（var(--ink-soft)），hover 才加深 ----
const normalColor = await page.evaluate((sel) => getComputedStyle(document.querySelector(`${sel} .source-badge-project`)).color, tagSel);
await page.hover(`${tagSel} .source-badge-project`);
const hoverColor = await page.evaluate((sel) => getComputedStyle(document.querySelector(`${sel} .source-badge-project`)).color, tagSel);
await page.mouse.move(3, 3);
console.log("[badge colors]", JSON.stringify({ normal: normalColor, hover: hoverColor }));
// --ink-soft = #5e5e63 → rgb(94, 94, 99)；hover 加深为 #1f2329 → rgb(31, 35, 41)
assert.equal(normalColor, "rgb(94, 94, 99)", "toolbar badge text must use the toolbar secondary color var(--ink-soft)");
assert.equal(hoverColor, "rgb(31, 35, 41)", "toolbar badge text must darken only on hover");
console.log("[ok] 5b. badge text uses --ink-soft normally, darkens on hover");

// ---- 6. 无重叠 / 无横向越界 / 无第二排 ----
const layout = await page.evaluate((sel) => {
  const root = document.querySelector(sel);
  const rootRect = root.getBoundingClientRect();
  const chips = Array.from(root.children).map((el) => {
    const r = el.getBoundingClientRect();
    return { cls: el.className, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
  });
  return { rootRect, chips };
}, tagSel);
const overflow = layout.chips.filter((c) => c.right > layout.rootRect.right + 0.5);
assert.equal(overflow.length, 0, `no chip may overflow the toolbar: ${JSON.stringify(overflow)}`);
for (let i = 0; i < layout.chips.length; i++) {
  for (let j = i + 1; j < layout.chips.length; j++) {
    const a = layout.chips[i], b = layout.chips[j];
    const hit = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    assert.ok(!hit, `chips must not overlap: ${a.cls} vs ${b.cls}`);
  }
}
const tops = layout.chips.map((c) => c.top);
assert.ok(Math.max(...tops) - Math.min(...tops) < 2, "all chips must be on one row");
console.log("[ok] 6. no overlap / no overflow / one row");

// ---- 7. available=false + 无原生 title tooltip ----
const unavail = await page.evaluate((sel) => {
  const skill = document.querySelector(`${sel} .source-badge-skill`);
  return { cls: skill?.className || "", aria: skill?.getAttribute("aria-label") || "", title: skill?.getAttribute("title") || null };
}, tagSel);
assert.ok(unavail.cls.includes("source-badge--unavailable"), "available=false skill must carry unavailable class");
assert.ok(unavail.aria.includes("（来源不可用）"), "unavailable aria must note it");
assert.equal(unavail.title, null, "badges must not use native title tooltip");
console.log("[ok] 7. available=false visual + aria");

// ---- 8. 非交互徽标不增加 tab stop ----
const tabs = await page.evaluate((sel) => Array.from(document.querySelectorAll(`${sel} .source-badge, ${sel} .meta-chip`)).map((el) => ({
  cls: el.className, tabindex: el.getAttribute("tabindex"), role: el.getAttribute("role")
})), tagSel);
for (const t of tabs) {
  assert.equal(t.tabindex, null, `no tabindex on ${t.cls}`);
  assert.equal(t.role, null, `no role on ${t.cls}`);
}
console.log("[ok] 8. no nested tab stop");

// ---- 9. tooltip coordinator：快速切换 + stale rAF ----
await page.mouse.move(5, 5);
await page.mouse.move(10, 10);
await page.hover(`${tagSel} .source-badge-project`);
await page.waitForTimeout(200);
const tipProject = await page.evaluate((sel) => {
  const project = document.querySelector(`${sel} .source-badge-project`);
  const src = project?.querySelector(".chip-tooltip")?.textContent.trim();
  const floating = document.querySelector("body > .chip-tooltip--floating");
  if (!floating) return null;
  const cs = getComputedStyle(floating);
  return { opacity: cs.opacity, text: floating.textContent.trim(), match: !!src && floating.textContent.trim() === src };
}, tagSel);
assert.ok(tipProject && Number(tipProject.opacity) > 0, "project tooltip must be visible on hover");
assert.ok(tipProject.match, "floating tooltip text must match the badge chip-tooltip");
await page.hover(`${tagSel} .source-badge-skill`);
await page.waitForTimeout(60);
const visibleCount = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".chip-tooltip--floating")).filter((t) => Number(getComputedStyle(t).opacity) > 0).length
);
assert.equal(visibleCount, 1, "at most one tooltip during quick sweep");
await page.mouse.move(3, 3);
await page.waitForTimeout(250);
const afterEarly = await page.evaluate(() => {
  const floating = document.querySelector("body > .chip-tooltip--floating");
  return floating ? Number(getComputedStyle(floating).opacity) : 0;
});
assert.equal(afterEarly, 0, "tooltip must not resurrect after early mouseout");
console.log("[ok] 9. tooltip single instance + stale rAF");

// ---- 10. 路径语义：无资料库 crumb、无 wewrite output、路径 = filePath、title/aria 完整 ----
// 把真实 filePath 注入页面供断言（页面无法直接访问 Node fixture）。
await page.evaluate((fp) => { window.__NUTBOOK_TEST_FILE_PATH__ = fp; }, FILE_PATH);
const pathInfo2 = await page.evaluate(() => ({
  hasLibraryEl: !!document.getElementById("breadcrumbLibrary"),
  text: document.getElementById("breadcrumbItem")?.textContent || "",
  title: document.getElementById("breadcrumbItem")?.title || "",
  aria: document.getElementById("breadcrumbItem")?.getAttribute("aria-label") || "",
  toolbarText: document.querySelector(".document-toolbar")?.textContent || "",
  filePath: window.__NUTBOOK_TEST_FILE_PATH__ || ""
}));
console.log("[path]", JSON.stringify(pathInfo2));
assert.equal(pathInfo2.hasLibraryEl, false, "breadcrumbLibrary element must not exist");
assert.ok(!pathInfo2.toolbarText.includes("wewrite output"), "toolbar must not show the library crumb name");
assert.equal(pathInfo2.text, FILE_PATH, "path must be the item filePath");
assert.equal(pathInfo2.title, FILE_PATH, "title must hold the full path");
assert.equal(pathInfo2.aria, FILE_PATH, "aria-label must hold the full path");
console.log("[ok] 10. path semantics (no library crumb, full path in title/aria)");

// ---- 11. 几何验收：1362 / 1280 / 最小支持窗口（1080） ----
// 路径以 #breadcrumbItem 自身矩形为准（不是 .breadcrumb 父容器）：
// 长路径必须在自身边界内省略，绝不越出 .breadcrumb、绝不与任一标签相交。
async function measureGeometry() {
  return page.evaluate(() => {
    const breadcrumb = document.querySelector(".breadcrumb");
    const tags = document.getElementById("breadcrumbTags");
    const actions = document.querySelector(".toolbar-actions");
    const toolbar = document.querySelector(".document-toolbar");
    const item = document.getElementById("breadcrumbItem");
    if (!breadcrumb || !tags || !actions || !toolbar || !item) return null;
    const b = breadcrumb.getBoundingClientRect();
    const ir = item.getBoundingClientRect();
    const t = tags.getBoundingClientRect();
    const a = actions.getBoundingClientRect();
    const tb = toolbar.getBoundingClientRect();
    const firstChip = tags.firstElementChild;
    const chipRects = Array.from(tags.children).map((el) => {
      const r = el.getBoundingClientRect();
      return { cls: el.className, left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });
    const itemCs = getComputedStyle(item);
    return {
      pathRight: b.right,
      itemRight: ir.right,
      itemLeft: ir.left,
      itemTop: ir.top,
      itemBottom: ir.bottom,
      firstTagLeft: firstChip ? firstChip.getBoundingClientRect().left : null,
      tagsRight: t.right,
      actionsLeft: a.left,
      actionsRight: a.right,
      toolbarLeft: tb.left,
      toolbarRight: tb.right,
      // 路径文字右缘 → 第一个标签左缘（真实间距，不是父容器间距）
      pathToTags: firstChip ? firstChip.getBoundingClientRect().left - ir.right : null,
      tagsToActions: a.left - t.right,
      itemOverflow: itemCs.textOverflow,
      itemScrollW: item.scrollWidth,
      itemClientW: item.clientWidth,
      chips: chipRects
    };
  });
}

const geoResults = {};
for (const [name, width, height, minPath, minActions] of [
  ["1362", 1362, 900, 24, 16],
  ["1280", 1280, 900, 24, 16],
  ["min1080", 1080, 680, 12, 12]
]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(120);
  const g = await measureGeometry();
  assert.ok(g, `geometry must be measurable at ${name}`);
  geoResults[name] = g;
  // 路径元素自身必须完全落在 .breadcrumb 边界内（禁止文字穿出覆盖标签）
  assert.ok(g.itemRight <= g.pathRight + 0.5, `${name}: breadcrumbItem right (${g.itemRight?.toFixed(1)}) must stay inside .breadcrumb (${g.pathRight?.toFixed(1)})`);
  assert.ok(g.itemLeft >= g.toolbarLeft, `${name}: breadcrumbItem left must not go before toolbar`);
  // 路径文字右缘 → 第一个标签左缘间距
  assert.ok(g.pathToTags >= minPath, `${name}: path→tags gap ${g.pathToTags?.toFixed(1)} must be >= ${minPath}`);
  // 路径矩形与任一标签矩形不相交
  for (const c of g.chips) {
    const xHit = g.itemRight > c.left + 0.5 && c.right > g.itemLeft + 0.5;
    const yHit = g.itemBottom > c.top + 0.5 && c.bottom > g.itemTop + 0.5;
    assert.ok(!(xHit && yHit), `${name}: breadcrumbItem must not intersect chip ${c.cls}`);
  }
  // 长路径：computed text-overflow 为 ellipsis 且 scrollWidth > clientWidth
  assert.equal(g.itemOverflow, "ellipsis", `${name}: breadcrumbItem must ellipsize`);
  assert.ok(g.itemScrollW > g.itemClientW, `${name}: long path must overflow its own box (scrollW ${g.itemScrollW} > clientW ${g.itemClientW})`);
  assert.ok(g.tagsToActions >= minActions, `${name}: tags→actions gap ${g.tagsToActions?.toFixed(1)} must be >= ${minActions}`);
  assert.ok(g.actionsRight <= g.toolbarRight + 0.5, `${name}: actions must not overflow toolbar`);
  for (let i = 0; i < g.chips.length; i++) {
    for (let j = i + 1; j < g.chips.length; j++) {
      const x = g.chips[i], y = g.chips[j];
      const hit = x.left < y.right && y.left < x.right && x.top < y.bottom && y.top < x.bottom;
      assert.ok(!hit, `${name}: chips must not overlap (${x.cls} vs ${y.cls})`);
    }
  }
  const gtops = g.chips.map((c) => c.top);
  assert.ok(Math.max(...gtops) - Math.min(...gtops) < 2, `${name}: chips must stay on one row`);
  if (name === "1362" || name === "min1080") {
    const clip = await page.evaluate(() => {
      const r = document.querySelector(".document-toolbar").getBoundingClientRect();
      return { x: Math.max(0, r.x - 4), y: Math.max(0, r.y - 4), width: r.width + 8, height: r.height + 8 };
    });
    await page.screenshot({ path: join(shotDir, `toolbar-${name}.png`), clip });
  }
  console.log(`[ok] 11. geometry ${name}: path→tags ${g.pathToTags?.toFixed(1)}px (item-right based), tags→actions ${g.tagsToActions?.toFixed(1)}px, itemEllipsis ${g.itemScrollW}->${g.itemClientW}`);
}
await page.setViewportSize({ width: 1362, height: 900 });
await page.waitForTimeout(120);

// ---- 12. 删除当前自定义标签（真实点击） ----
await page.hover(`${tagSel} [data-document-tag-trigger="current"]`);
await page.click(`${tagSel} [data-document-tag-remove]`);
await page.waitForSelector(`${tagSel} [data-document-tag-trigger="add"]`, { timeout: 5000 });
const afterDelete = await page.evaluate((sel) => ({
  hasAddTrigger: !!document.querySelector(`${sel} [data-document-tag-trigger="add"]`),
  tagChips: Array.from(document.querySelectorAll(`${sel} .tag-chip`)).map((el) => el.textContent.trim())
}), tagSel);
assert.ok(afterDelete.hasAddTrigger, "after delete the toolbar must show the add trigger (+ 标签)");
console.log("[ok] 12. delete custom tag → add placeholder shown");
{
  const clip = await page.evaluate(() => {
    const r = document.querySelector(".document-toolbar").getBoundingClientRect();
    return { x: Math.max(0, r.x - 4), y: Math.max(0, r.y - 4), width: r.width + 8, height: r.height + 8 };
  });
  await page.screenshot({ path: join(shotDir, "after-delete-toolbar.png"), clip });
}

// ---- 13. 添加“测试标签” ----
await page.click(`${tagSel} [data-document-tag-trigger="add"]`);
await page.waitForSelector("#documentTagNewInput", { timeout: 5000 });
await page.fill("#documentTagNewInput", "测试标签");
await page.click("#documentTagCreateButton");
await page.waitForSelector(`${tagSel} [data-document-tag-trigger="current"]`, { timeout: 5000 });
const afterAdd = await page.evaluate((sel) => {
  const trigger = document.querySelector(`${sel} [data-document-tag-trigger="current"]`);
  return { label: trigger?.querySelector(".tag-chip-label")?.textContent.trim() || "" };
}, tagSel);
assert.ok(afterAdd.label.includes("测试标签"), `toolbar must show 测试标签 after add (got ${afterAdd.label})`);
console.log("[ok] 13. add 测试标签 → toolbar shows it");

// ---- 14. 返回主页：卡片自定义主标签必须真实可见「测试…」（两个汉字 + 省略号） ----
await page.click("[data-home-tab]");
await page.waitForSelector(`${cardSel} .thumb-chip-row .tag-chip .tag-chip-label`, { timeout: 5000 });
const cardInfo = await page.evaluate((sel) => {
  const label = document.querySelector(`${sel} .thumb-chip-row .tag-chip .tag-chip-label`);
  const lr = label.getBoundingClientRect();
  const range = document.createRange();
  range.setStart(label.firstChild, 0);
  range.setEnd(label.firstChild, 1);
  const r1 = range.getBoundingClientRect();
  range.setStart(label.firstChild, 1);
  range.setEnd(label.firstChild, 2);
  const r2 = range.getBoundingClientRect();
  // 前两个字符的总宽度
  const twoRange = document.createRange();
  twoRange.setStart(label.firstChild, 0);
  twoRange.setEnd(label.firstChild, 2);
  const twoCharW = twoRange.getBoundingClientRect().width;
  // 同字号「…」字形宽度（CSS ellipsis 字符，DOM 中不存在，需实测）
  const probe = document.createElement("span");
  probe.style.cssText = `font-size:${getComputedStyle(label).fontSize};font-family:${getComputedStyle(label).fontFamily};position:absolute;visibility:hidden;white-space:nowrap;`;
  probe.textContent = "…";
  document.body.appendChild(probe);
  const ellipsisW = probe.getBoundingClientRect().width;
  probe.remove();
  const cs = getComputedStyle(label);
  return {
    text: label.textContent,
    labelLeft: lr.left, labelRight: lr.right,
    firstLeft: r1.left, firstRight: r1.right,
    secondLeft: r2.left, secondRight: r2.right,
    twoCharW, ellipsisW,
    overflow: cs.textOverflow, clientW: label.clientWidth, scrollW: label.scrollWidth
  };
}, cardSel);
console.log("[card]", JSON.stringify(cardInfo));
assert.ok(cardInfo.text.length > 0, "card custom tag must render text");
assert.ok(cardInfo.text !== "…" && cardInfo.text !== "", "card custom tag must NOT be a bare ellipsis");
assert.ok(cardInfo.text.includes("测") || cardInfo.text.startsWith("测试"), "card custom tag must start with the real tag text");
assert.ok(cardInfo.firstLeft >= cardInfo.labelLeft - 0.5, "first char glyph must be inside the visible area");
assert.ok(cardInfo.secondLeft >= cardInfo.labelLeft - 0.5, "second char glyph must be inside the visible area");
// 内容宽度必须足以同时容纳前两个字符 + 省略号（证明渲染后不是只有"测…"）
assert.ok(
  cardInfo.clientW >= cardInfo.twoCharW + cardInfo.ellipsisW - 1,
  `label content width ${cardInfo.clientW.toFixed(1)} must fit two chars (${cardInfo.twoCharW.toFixed(1)}) + ellipsis (${cardInfo.ellipsisW.toFixed(1)})`
);
assert.ok(cardInfo.clientW >= 30, `label content width must be >= 30px for 测试… (got ${cardInfo.clientW.toFixed(1)})`);
await page.screenshot({ path: join(shotDir, "home-card-after-add.png"), clip: await page.evaluate((sel) => {
  const card = document.querySelector(sel);
  const r = card.getBoundingClientRect();
  return { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: r.width + 16, height: r.height + 16 };
}, cardSel) });
console.log("[ok] 14. home card custom tag visibly renders 测试… (two chars + ellipsis inside content width)");

// ---- 15. 重开文档：工具栏仍显示“测试标签” ----
await page.click(cardSel);
await page.waitForSelector(`${tagSel} [data-document-tag-trigger="current"]`, { timeout: 8000 });
const reopenLabel = await page.evaluate((sel) => {
  const trigger = document.querySelector(`${sel} [data-document-tag-trigger="current"]`);
  return trigger?.querySelector(".tag-chip-label")?.textContent.trim() || "";
}, tagSel);
assert.ok(reopenLabel.includes("测试标签"), `reopened toolbar must show 测试标签 (got ${reopenLabel})`);
console.log("[ok] 15. reopen keeps the correct tag in the toolbar");

const evidence = { order, customInfo, sourceInfo, ellipsis, fixed, layout, unavail, pathInfo: pathInfo2, geoResults, cardInfo };
writeFileSync(join(shotDir, "evidence.json"), JSON.stringify(evidence, null, 2));
console.log("evidence written to", join(shotDir, "evidence.json"));

console.log("\n=== A1.2 Markdown document toolbar source badges acceptance passed ===");

await browser.close();
server.kill();
