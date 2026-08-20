import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

// 真实 DB 数据（A0 验收 shared item），不硬编码 item id，统一用 fixture.id。
const fixture = JSON.parse(readFileSync("/tmp/a11-fixture.json", "utf8"));
const MAIN_ID = fixture.id;

const svgData = (fill) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="${fill}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
};

const server = spawn(process.execPath, [
  "node_modules/vite/bin/vite.js", "dist",
  "--host", "127.0.0.1", "--port", "4176", "--strictPort"
], { stdio: "ignore" });

const origin = "http://127.0.0.1:4176";
for (let i = 0; i < 80; i++) {
  try { const r = await fetch(origin); if (r.ok) break; } catch {}
  await new Promise(r => setTimeout(r, 50));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.error("page error:", e.stack || e.message));
page.on("console", (msg) => { if (msg.type() === "error") console.log("[console.error]", msg.text()); });

// 测试数据：多自定义标签 + 2 Project + 2 Skill（验证 +N）、浅图/深图视觉样本。
const multiBadgeItem = {
  id: MAIN_ID + 1000,
  libraryId: fixture.library_id,
  filePath: "/Users/hayley/.claude/skills/a11-multi-source-item/output/multi-source-card.md",
  relativePath: "multi-source-card.md",
  fileName: "multi-source-card.md",
  fileExt: "md",
  fileType: "markdown",
  fileSize: 100,
  modifiedAt: "1786720150",
  title: null,
  summary: "多来源测试卡片",
  pathState: "valid",
  isFavorite: 0,
  lastOpenedAt: null,
  skillBinding: null,
  sourceBadges: [
    { kind: "project", sourceId: "project:101", label: "第一验收项目来源", isOwner: false, available: true },
    { kind: "project", sourceId: "project:102", label: "第二验收项目来源", isOwner: true, available: true },
    { kind: "skill", sourceId: "skill:firstacceptanceskill", label: "First Acceptance Skill", isOwner: true, available: true },
    { kind: "skill", sourceId: "skill:secondacceptanceskill", label: "Second Acceptance Skill", isOwner: false, available: true }
  ],
  tags: [
    { id: 801, name: "验收标签甲", color: null },
    { id: 802, name: "验收标签乙", color: null },
    { id: 803, name: "验收标签丙", color: null }
  ],
  thumbnail: null
};
const lightItem = {
  ...multiBadgeItem,
  id: MAIN_ID + 1001,
  fileName: "light-image-card.md",
  relativePath: "light-image-card.md",
  summary: "浅图视觉样本",
  sourceBadges: fixture.sourceBadges,
  tags: fixture.tags,
  thumbnail: { path: svgData("#ffffff"), status: "ready" }
};
const darkItem = {
  ...multiBadgeItem,
  id: MAIN_ID + 1002,
  fileName: "dark-image-card.md",
  relativePath: "dark-image-card.md",
  summary: "深图视觉样本",
  sourceBadges: fixture.sourceBadges,
  tags: fixture.tags,
  thumbnail: { path: svgData("#16161a"), status: "ready" }
};
// 真实 GUI 反馈：无自定义标签时来源徽标与类型徽标作为一个组靠右。
const noCustomItem = {
  ...multiBadgeItem,
  id: MAIN_ID + 1003,
  fileName: "no-custom-tag-card.md",
  relativePath: "no-custom-tag-card.md",
  summary: "无自定义标签样本",
  sourceBadges: [
    { kind: "project", sourceId: "project:66", label: "用于验证Nutbook项目来源标签超长省略显示行为的中文验收项目", isOwner: false, available: true }
  ],
  tags: [],
  thumbnail: null
};

await page.addInitScript((data) => {
  const { fixture, multiBadgeItem, lightItem, darkItem, noCustomItem } = data;
  const allLibraries = fixture.allLibraries.map((l) => ({
    id: l.id, name: l.name, rootPath: l.root_path, sourceKind: l.source_kind,
    pathState: l.path_state,
    isActive: l.is_active !== 0, isOwner: false,
    createdAt: "2026-08-15T00:00:00Z", updatedAt: "2026-08-15T00:00:00Z",
    lastScannedAt: null, skillBinding: null
  }));
  const items = [];
  for (const o of fixture.contextItems) items.push({...o, sourceBadges: [], tags: []});
  const main = {
    id: fixture.id, libraryId: fixture.library_id,
    filePath: fixture.file_path, relativePath: fixture.relative_path,
    fileName: fixture.file_name, fileExt: fixture.file_ext, fileType: fixture.file_type,
    fileSize: fixture.file_size, modifiedAt: fixture.modified_at,
    title: fixture.title, summary: fixture.summary, pathState: fixture.path_state,
    isFavorite: fixture.is_favorite === 1, lastOpenedAt: fixture.last_opened_at,
    skillBinding: null, sourceBadges: fixture.sourceBadges,
    tags: fixture.tags, thumbnail: null
  };
  items.unshift(main);
  items.push(multiBadgeItem, lightItem, darkItem, noCustomItem);
  window.__TAURI_INTERNALS__ = {
    invoke: async (cmd, args) => {
      if (cmd === "list_libraries") return allLibraries;
      if (cmd === "list_items") {
        return { items: items, total: items.length, page: 1, pageSize: 30, hasMore: false };
      }
      if (cmd === "list_item_tags") return {};
      if (cmd === "list_tags") return fixture.tags.map(t => ({...t, color: t.color || "#888", createdAt: t.created_at, updatedAt: t.updated_at, usageCount: 1}));
      if (cmd === "list_ignored_items") return [];
      if (cmd === "get_recent_searches_v1") return [];
      if (cmd === "sync_filesystem_state") return {};
      return null;
    },
    transformCallback: () => 0,
    metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main", windowLabel: "main" } }
  };
}, { fixture, multiBadgeItem, lightItem, darkItem, noCustomItem });

await page.goto(origin, { waitUntil: "networkidle" });
await page.waitForSelector('.item-card', { timeout: 8000 });
await page.waitForSelector(`[data-open-item="${MAIN_ID}"]`, { timeout: 5000 });

const cardSel = `[data-open-item="${MAIN_ID}"]`;

// ---- 辅助函数：rgba 解析 / alpha 合成 / 对比度 ----
function srgbToLin(c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function luminance(rgb) { return 0.2126 * srgbToLin(rgb[0]) + 0.7152 * srgbToLin(rgb[1]) + 0.0722 * srgbToLin(rgb[2]); }
function parseColor(s) {
  const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
}
// 前景 rgba 合成到背景 rgb 上，返回合成 rgb；必须处理 alpha。
function composite(fg, bg) {
  const a = fg.a;
  return [
    Math.round(fg.r * a + bg[0] * (1 - a)),
    Math.round(fg.g * a + bg[1] * (1 - a)),
    Math.round(fg.b * a + bg[2] * (1 - a))
  ];
}
function contrastRatio(rgbA, rgbB) {
  const la = luminance(rgbA), lb = luminance(rgbB);
  const lighter = Math.max(la, lb), darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}
function isLight(rgb) { return (rgb[0] + rgb[1] + rgb[2]) / 3 > 200; }

// ---- 1. 常态背景浅色且接近不透明 ----
const normalStyle = await page.evaluate((sel) => {
  const parseColor = (s) => {
    const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
  };
  const badge = document.querySelector(`${sel} .source-badge-project`);
  const cs = getComputedStyle(badge);
  return {
    bg: cs.backgroundColor, color: cs.color, border: cs.borderColor,
    cursor: cs.cursor, alpha: parseColor(cs.backgroundColor).a
  };
}, cardSel);
console.log("[normal style]", JSON.stringify(normalStyle));
const normalBg = parseColor(normalStyle.bg);
assert.ok(normalBg.a >= 0.9, `badge bg must be near-opaque (alpha ${normalBg.a})`);
assert.ok(isLight([normalBg.r, normalBg.g, normalBg.b]), "badge bg must be light (near-white/light-gray)");
assert.notEqual(normalStyle.color, "rgb(255, 255, 255)", "badge text must not be white-on-dark");
console.log("[ok] 1. normal badge bg is light and near-opaque");

// ---- 2. 文字对实际合成背景对比度 >= 4.5（rgba alpha 合成到底层）----
const contrastInfo = await page.evaluate((sel) => {
  const parseColor = (s) => {
    const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
  };
  const badge = document.querySelector(`${sel} .source-badge-project`);
  const cs = getComputedStyle(badge);
  const fg = parseColor(cs.color);
  // 找到 badge 背后最近的非透明背景（thumb-wrap / thumb 的实际底色）
  let el = badge.parentElement;
  let bg = [255, 255, 255];
  while (el) {
    const b = parseColor(getComputedStyle(el).backgroundColor);
    if (b && b.a > 0) { bg = [b.r, b.g, b.b]; break; }
    el = el.parentElement;
  }
  const badgeBg = parseColor(cs.backgroundColor);
  const composited = [
    Math.round(badgeBg.r * badgeBg.a + bg[0] * (1 - badgeBg.a)),
    Math.round(badgeBg.g * badgeBg.a + bg[1] * (1 - badgeBg.a)),
    Math.round(badgeBg.b * badgeBg.a + bg[2] * (1 - badgeBg.a))
  ];
  return { fg, composited, bg, ratio: 0 };
}, cardSel);
contrastInfo.ratio = contrastRatio(contrastInfo.fg ? [contrastInfo.fg.r, contrastInfo.fg.g, contrastInfo.fg.b] : [0,0,0], contrastInfo.composited);
console.log("[contrast composited]", JSON.stringify(contrastInfo, null, 2));
assert.ok(contrastInfo.ratio >= 4.5, `contrast must be >= 4.5:1, got ${contrastInfo.ratio.toFixed(2)}`);
console.log("[ok] 2. badge text contrast >= 4.5:1 against composited bg");

// ---- 3. hover 后背景/边框比常态加深 ----
await page.hover(`${cardSel} .source-badge-project`);
const hoverStyle = await page.evaluate((sel) => {
  const parseColor = (s) => {
    const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
  };
  const badge = document.querySelector(`${sel} .source-badge-project`);
  const cs = getComputedStyle(badge);
  const bg = parseColor(cs.backgroundColor);
  const border = parseColor(cs.borderColor);
  return { bg: cs.backgroundColor, border: cs.borderColor, bgAvg: (bg.r + bg.g + bg.b) / 3, borderAlpha: border.a };
}, cardSel);
const hoverBgAvg = hoverStyle.bgAvg;
const normalBgAvg = (normalBg.r + normalBg.g + normalBg.b) / 3;
assert.ok(hoverBgAvg < normalBgAvg, `hover bg must be darker than normal (${hoverBgAvg} < ${normalBgAvg})`);
assert.ok(hoverStyle.borderAlpha > normalStyle.alpha * 0.14 || parseColor(hoverStyle.border).a > 0.2,
  "hover border must deepen");
console.log("[ok] 3. hover deepens bg and border");

// ---- 4. 卡片 :focus-visible 后同样加深 ----
await page.evaluate((sel) => {
  document.querySelector(sel).focus({ focusVisible: true });
}, cardSel);
const focusVisible = await page.evaluate((sel) => document.querySelector(sel).matches(":focus-visible"), cardSel);
assert.ok(focusVisible, "card must match :focus-visible after keyboard focus");
const focusStyle = await page.evaluate((sel) => {
  const parseColor = (s) => {
    const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] !== undefined ? +m[4] : 1 };
  };
  const badge = document.querySelector(`${sel} .source-badge-project`);
  const cs = getComputedStyle(badge);
  const bg = parseColor(cs.backgroundColor);
  return { bg: cs.backgroundColor, border: cs.borderColor, bgAvg: (bg.r + bg.g + bg.b) / 3, borderAlpha: parseColor(cs.borderColor).a };
}, cardSel);
assert.ok(focusStyle.bgAvg < normalBgAvg, `focus-visible bg must deepen (${focusStyle.bgAvg} < ${normalBgAvg})`);
assert.ok(focusStyle.borderAlpha > 0.2, `focus-visible border must deepen (${focusStyle.borderAlpha})`);
assert.ok(focusStyle.bgAvg >= 150, "focus must NOT flip to deep black bg with white text");
console.log("[ok] 4. card :focus-visible deepens bg/border without dark flip");

// ---- 5. cursor default；6. label text-align left ----
const labelInfo = await page.evaluate((sel) => {
  const badge = document.querySelector(`${sel} .source-badge-project`);
  const label = badge.querySelector(".source-badge-label");
  const cs = getComputedStyle(label);
  return {
    badgeCursor: getComputedStyle(badge).cursor,
    labelDisplay: cs.display,
    labelAlign: cs.textAlign,
    labelOverflow: cs.textOverflow,
    labelWhiteSpace: cs.whiteSpace
  };
}, cardSel);
assert.equal(labelInfo.badgeCursor, "default", "non-interactive badge must have cursor default");
assert.equal(labelInfo.labelAlign, "left", "inner label must be text-align left");
assert.equal(labelInfo.labelDisplay, "block", "inner label must be display block");
assert.equal(labelInfo.labelOverflow, "ellipsis", "inner label must ellipsize");
assert.equal(labelInfo.labelWhiteSpace, "nowrap", "inner label must be nowrap");
console.log("[ok] 5+6. cursor default, label block/left/ellipsis/nowrap");

// ---- 7. 首字符 Range 位于标签可视内容区左侧 ----
const firstChar = await page.evaluate((sel) => {
  const label = document.querySelector(`${sel} .source-badge-project .source-badge-label`);
  const lr = label.getBoundingClientRect();
  const range = document.createRange();
  range.setStart(label.firstChild, 0);
  range.setEnd(label.firstChild, 1);
  const r = range.getBoundingClientRect();
  return {
    labelLeft: lr.left, labelRight: lr.right,
    firstLeft: r.left, firstRight: r.right,
    visibleLeft: r.left >= lr.left - 0.5,
    visibleRight: r.right <= lr.right + 0.5
  };
}, cardSel);
console.log("[first char]", JSON.stringify(firstChar));
assert.ok(firstChar.visibleLeft && firstChar.visibleRight, "first char must be fully inside the visible label area");
assert.ok(firstChar.firstLeft - firstChar.labelLeft < 6, "first char must sit at the left edge (not centered)");
console.log("[ok] 7. first char visible at label left edge");

// ---- 8. 长名称末尾溢出（scrollWidth 溢出 + 视觉截图）----
const overflowInfo = await page.evaluate((sel) => {
  const label = document.querySelector(`${sel} .source-badge-project .source-badge-label`);
  const lr = label.getBoundingClientRect();
  return {
    clientW: label.clientWidth, scrollW: label.scrollWidth,
    rect: { x: lr.x, y: lr.y, width: lr.width, height: lr.height }
  };
}, cardSel);
console.log("[overflow]", JSON.stringify(overflowInfo));
assert.ok(overflowInfo.scrollW > overflowInfo.clientW, "long name must overflow the label (proving ellipsis)");
await page.screenshot({ path: "/tmp/a11-ellipsis-project.png", clip: overflowInfo.rect });
console.log("[ok] 8. long name overflows at the tail; screenshot /tmp/a11-ellipsis-project.png");

// ---- 9. 可见徽标不横向溢出 row（chip-tooltip 是 hover 浮层，绝对定位不计入布局宽度）----
const rowInfo = await page.evaluate((sel) => {
  const row = document.querySelector(`${sel} .thumb-chip-row`);
  const rowRect = row.getBoundingClientRect();
  const visibleBadges = Array.from(row.children).filter((c) => getComputedStyle(c).position !== "absolute");
  const overflows = visibleBadges
    .map((c) => {
      const r = c.getBoundingClientRect();
      return {
        cls: c.className,
        fitsLeft: r.left >= rowRect.left - 0.5,
        fitsRight: r.right <= rowRect.right + 0.5
      };
    })
    .filter((o) => !(o.fitsLeft && o.fitsRight));
  return { clientW: row.clientWidth, scrollW: row.scrollWidth, overflows };
}, cardSel);
console.log("[row]", JSON.stringify(rowInfo));
assert.equal(rowInfo.overflows.length, 0, `visible badges must fit inside the row: ${JSON.stringify(rowInfo.overflows)}`);
console.log("[ok] 9. visible badges have no horizontal overflow inside the row");

// ---- 10. 标签之间无 bounding-box 重叠 ----
const overlap = await page.evaluate((sel) => {
  const row = document.querySelector(`${sel} .thumb-chip-row`);
  const chips = Array.from(row.children);
  const rects = chips.map((c) => { const r = c.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, cls: c.className }; });
  const overlaps = [];
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      const hit = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      if (hit) overlaps.push([a.cls, b.cls]);
    }
  }
  return { overlaps, rects };
}, cardSel);
assert.equal(overlap.overlaps.length, 0, `chips must not overlap: ${JSON.stringify(overlap.overlaps)}`);
console.log("[ok] 10. no bounding-box overlap between chips");

// ---- 11. MD/HTML 和 +N 完整可见且不可压缩 ----
const fixedChips = await page.evaluate((sel) => {
  const card = document.querySelector(sel);
  const type = card.querySelector(".thumb-badge-type");
  const typeCs = getComputedStyle(type);
  const result = { type: { text: type.textContent.trim(), scrollW: type.scrollWidth, clientW: type.clientWidth, flexShrink: typeCs.flexShrink, flexGrow: typeCs.flexGrow } };
  card.querySelectorAll(".source-badge-more, .tag-chip-more").forEach((m) => {
    const cs = getComputedStyle(m);
    result[m.className] = { text: m.textContent.trim(), scrollW: m.scrollWidth, clientW: m.clientWidth, flexShrink: cs.flexShrink, flexGrow: cs.flexGrow };
  });
  return result;
}, cardSel);
console.log("[fixed chips]", JSON.stringify(fixedChips));
assert.ok(fixedChips.type.text === "MD" || fixedChips.type.text === "HTML", "type badge must be fully rendered");
assert.ok(fixedChips.type.scrollW <= fixedChips.type.clientW, "type badge must not clip its own text");
assert.equal(fixedChips.type.flexShrink, "0", "type badge must be flex 0 0 auto (no shrink)");
for (const [k, v] of Object.entries(fixedChips)) {
  if (k === "type") continue;
  assert.equal(v.flexShrink, "0", `${k} must not shrink`);
  assert.equal(v.flexGrow, "0", `${k} must not grow`);
  assert.ok(v.scrollW <= v.clientW, `${k} must be fully visible`);
}
console.log("[ok] 11. MD/HTML and +N fully visible and non-compressible");

// ---- 12. 多自定义标签、多 Project、多 Skill 的顺序和 +N 正确 ----
const multiOrder = await page.evaluate((sel) => {
  const card = document.querySelector(sel);
  const row = card.querySelector(".thumb-chip-row");
  const visibleText = (el) => {
    const label = el.querySelector(".source-badge-label, .tag-chip-label");
    if (label) return label.textContent.trim();
    return Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent)
      .join("")
      .trim();
  };
  return Array.from(row.children).map((el) => ({
    cls: el.className, text: visibleText(el), title: el.getAttribute("title") || ""
  }));
}, `[data-open-item="${MAIN_ID + 1000}"]`);
console.log("[multi order]", JSON.stringify(multiOrder, null, 2));
const multiClasses = multiOrder.map((n) => n.cls);
// 自定义标签压缩成 primary +N：1 个主 tag-chip + 1 个 tag-chip-more
assert.equal(multiClasses.filter((c) => c.includes("tag-chip") && !c.includes("tag-chip-more")).length, 1,
  "custom tags must compress to one primary tag-chip");
assert.equal(multiClasses.filter((c) => c.includes("tag-chip-more")).length, 1,
  "custom tags must compress extras into one +N chip");
const customMoreIdx = multiClasses.findIndex((c) => c.includes("tag-chip-more"));
assert.ok(multiOrder[customMoreIdx].text === "+2", "custom +N must show +2 for 3 tags");
const tagIdx = multiClasses.findIndex((c) => c.includes("tag-chip"));
assert.equal(multiClasses.filter((c) => c.includes("source-badge-more")).length, 2, "two +N: one project, one skill");
const projectPrimaryIdx = multiClasses.findIndex((c) => c.includes("source-badge-project"));
const projectMoreIdx = multiClasses.findIndex((c) => c.includes("source-badge-more"));
const skillIdx = multiClasses.findIndex((c) => c.includes("source-badge-skill"));
assert.ok(multiOrder[projectMoreIdx].text === "+1", "project +N must show +1 for 2 projects");
assert.ok(multiOrder[skillIdx] && multiOrder[skillIdx].text.startsWith("First"), "first skill shown as primary");
assert.ok(projectPrimaryIdx > tagIdx, "project comes after custom tags");
assert.ok(skillIdx > projectPrimaryIdx, "skill comes after project");
console.log("[ok] 12. multi custom/project/skill order and +N correct (custom primary +2)");

// ---- 12c. 最坏布局：3 custom + 2 project + 2 skill + type 无溢出/重叠/第二行，类型完整 ----
const worstLayout = await page.evaluate((sel) => {
  const card = document.querySelector(sel);
  const row = card.querySelector(".thumb-chip-row");
  const rowRect = row.getBoundingClientRect();
  const chips = Array.from(row.children).map((el) => {
    const r = el.getBoundingClientRect();
    return { cls: el.className, left: r.left, right: r.right, top: r.top, bottom: r.bottom, text: el.textContent.trim() };
  });
  const type = card.querySelector(".thumb-badge-type");
  const typeRect = type.getBoundingClientRect();
  return {
    row: { left: rowRect.left, right: rowRect.right, top: rowRect.top, bottom: rowRect.bottom },
    chips,
    type: { cls: type.className, text: type.textContent.trim(), left: typeRect.left, right: typeRect.right, top: typeRect.top, bottom: typeRect.bottom }
  };
}, `[data-open-item="${MAIN_ID + 1000}"]`);
console.log("[worst layout]", JSON.stringify(worstLayout, null, 2));
// 无溢出：非 type 的 chip 必须落在 row 内；type 是 row 最后一项，右缘对齐 row 右缘（允许 ≤ row.right）
const rowRight = worstLayout.row.right;
const overflowChips = worstLayout.chips.filter((c) => !c.cls.includes("thumb-badge-type") && c.right > rowRight + 0.5);
assert.equal(overflowChips.length, 0, `no chip may overflow row right: ${JSON.stringify(overflowChips)}`);
assert.ok(worstLayout.type.right <= rowRight + 0.5, "type badge must fit inside row");
// 无重叠：相邻 chip 不重叠（允许 gap > 0）
for (let i = 0; i < worstLayout.chips.length; i++) {
  for (let j = i + 1; j < worstLayout.chips.length; j++) {
    const a = worstLayout.chips[i], b = worstLayout.chips[j];
    const hit = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    assert.ok(!hit, `chips must not overlap: ${a.cls} vs ${b.cls}`);
  }
}
// 无第二行：所有 chip 同一行（top 基本一致）
const tops = worstLayout.chips.map((c) => c.top);
assert.ok(Math.max(...tops) - Math.min(...tops) < 2, "all chips must be on one row");
// 类型徽标完整可见且未被压缩
assert.equal(worstLayout.type.text, "MD", "type badge must render fully");
assert.ok(worstLayout.type.right <= worstLayout.row.right + 0.5, "type badge must fit inside row");
console.log("[ok] 12c. worst-case layout (3 custom/2 project/2 skill + type) has no overflow, no overlap, one row, type intact");

// ---- 12b. 无自定义标签：来源徽标与类型徽标作为一个组靠右对齐 ----
const alignInfo = await page.evaluate((ids) => {
  const grab = (id) => {
    const card = document.querySelector(`[data-open-item="${id}"]`);
    const row = card.querySelector(".thumb-chip-row");
    const type = card.querySelector(".thumb-badge-type");
    const cs = getComputedStyle(row);
    const project = row.querySelector(".source-badge-project");
    return {
      rowClass: row.className,
      justify: cs.justifyContent,
      typeLeft: type.getBoundingClientRect().left,
      projectRight: project ? project.getBoundingClientRect().right : null,
      rowRight: row.getBoundingClientRect().right
    };
  };
  return { withCustom: grab(ids.main), noCustom: grab(ids.noCustom) };
}, { main: MAIN_ID, noCustom: MAIN_ID + 1003 });
console.log("[align]", JSON.stringify(alignInfo, null, 2));
assert.equal(alignInfo.withCustom.rowClass, "thumb-chip-row", "row with custom tags must keep the default class (flex-start)");
assert.equal(alignInfo.withCustom.justify, "flex-start", "row with custom tags must justify flex-start");
assert.equal(alignInfo.noCustom.rowClass, "thumb-chip-row chip-row--align-end", "row without custom tags must add chip-row--align-end");
assert.equal(alignInfo.noCustom.justify, "flex-end", "row without custom tags must justify flex-end");
// 关键断言：project 徽标右边缘与 type 徽标左边缘之间没有大段空白（< 12px）。
const noCustomGap = alignInfo.noCustom.typeLeft - alignInfo.noCustom.projectRight;
assert.ok(noCustomGap >= 0 && noCustomGap < 12, `project badge must hug the type badge on the right (gap ${noCustomGap}px)`);
// 反向断言：有自定义时不应紧贴，project 与 type 之间应留有其他 chip 与空白。
assert.ok(alignInfo.withCustom.typeLeft - alignInfo.withCustom.projectRight > 12,
  "with custom tags present, project should NOT hug type (other chips + gap in between)");
console.log("[ok] 12b. no-custom row hugs type badge on the right; with-custom keeps left-anchored order");

// ---- 13. aria/tooltip：完整名称 + 区分项目/Skill 来源 + Nutbook chip-tooltip 替代系统 title ----
const ariaInfo = await page.evaluate((sel) => {
  const card = document.querySelector(sel);
  const project = card.querySelector(".source-badge-project");
  const skill = card.querySelector(".source-badge-skill");
  const type = card.querySelector(".thumb-badge-type");
  // 新结构：per-badge 的 chip-tooltip 是文本源（display:none），hover 时文本复制到全局 floating tooltip
  const projectText = project ? project.querySelector(".chip-tooltip")?.textContent.trim() : null;
  const skillText = skill ? skill.querySelector(".chip-tooltip")?.textContent.trim() : null;
  return {
    aria: card.getAttribute("aria-label"),
    projectTitle: project ? project.getAttribute("title") : null,
    skillTitle: skill ? skill.getAttribute("title") : null,
    typeTitle: type ? type.getAttribute("title") : null,
    projectTooltip: projectText,
    skillTooltip: skillText
  };
}, cardSel);
console.log("[aria]", JSON.stringify(ariaInfo, null, 2));
assert.ok(ariaInfo.aria.includes(fixture.sourceBadges[0].label), "aria must contain full project name");
assert.ok(ariaInfo.aria.includes(fixture.sourceBadges[1].label), "aria must contain full skill name");
assert.ok(ariaInfo.aria.includes("项目来源"), "aria must label project sources");
assert.ok(ariaInfo.aria.includes("Skill 来源"), "aria must label skill sources");
assert.equal(ariaInfo.projectTitle, null, "source badge must NOT use native title tooltip (replace with Nutbook chip-tooltip)");
assert.equal(ariaInfo.skillTitle, null, "source badge must NOT use native title tooltip (replace with Nutbook chip-tooltip)");
assert.equal(ariaInfo.typeTitle, null, "type badge must NOT use native title tooltip");
assert.ok(ariaInfo.projectTooltip && ariaInfo.projectTooltip.includes(fixture.sourceBadges[0].label),
  "project chip-tooltip must carry full name");
assert.ok(ariaInfo.skillTooltip && ariaInfo.skillTooltip.includes(fixture.sourceBadges[1].label),
  "skill chip-tooltip must carry full name");
// 实际 hover 徽标后断言 chip-tooltip 可见（opacity>0），证明不是只读 title 属性。
// 先 blur 清掉卡片键盘 focus（focusin coordinator 会显示卡片级组合名，会覆盖 badge hover）；
// 再把鼠标移开再移回，确保 mouseover 真的触发（鼠标可能已停在 badge 上）。
await page.evaluate((sel) => { document.activeElement?.blur?.(); }, cardSel);
await page.mouse.move(5, 5);
await page.mouse.move(10, 10);
await page.hover(`${cardSel} .source-badge-project`);
await page.waitForTimeout(250);
const tooltipVisible = await page.evaluate((sel) => {
  // 新结构：tooltip 是单个全局 .chip-tooltip--floating 元素，hover 时由 JS 填充文本 + 定位
  const project = document.querySelector(`${sel} .source-badge-project`);
  const sourceText = project && project.querySelector(".chip-tooltip")?.textContent.trim();
  const floating = document.querySelector("body > .chip-tooltip--floating");
  if (!floating) return null;
  const cs = getComputedStyle(floating);
  const rect = floating.getBoundingClientRect();
  return {
    opacity: cs.opacity,
    visibility: cs.visibility,
    text: floating.textContent.trim(),
    pos: cs.position,
    display: cs.display,
    transition: cs.transition,
    left: cs.left,
    top: cs.top,
    rectLeft: rect.left, rectRight: rect.right, rectWidth: rect.width,
    viewportW: window.innerWidth,
    parentTag: floating.parentElement.tagName,
    sourceMatch: sourceText && floating.textContent.trim() === sourceText
  };
}, cardSel);
console.log("[chip-tooltip hover]", JSON.stringify(tooltipVisible));
assert.ok(tooltipVisible && Number(tooltipVisible.opacity) > 0, "chip-tooltip must be visible on hover (opacity > 0)");
assert.ok(tooltipVisible.text.includes(fixture.sourceBadges[0].label), "visible chip-tooltip must show full project name");
assert.equal(tooltipVisible.sourceMatch, true, "floating tooltip text must match the source badge's chip-tooltip text source");
assert.equal(tooltipVisible.parentTag, "BODY", "floating tooltip must be a direct child of body");
assert.equal(tooltipVisible.display, "block", "floating tooltip <span> must compute display:block so width/max-width/word-break apply");
assert.equal(tooltipVisible.transition, "none", `floating tooltip must compute transition:none (got "${tooltipVisible.transition}"); transitions + cancelAnimationFrame cause flicker`);
assert.ok(tooltipVisible.rectRight <= tooltipVisible.viewportW + 0.5,
  `floating tooltip must stay inside viewport (right=${tooltipVisible.rectRight}, viewportW=${tooltipVisible.viewportW})`);
assert.ok(tooltipVisible.rectLeft >= -0.5,
  `floating tooltip must stay inside viewport (left=${tooltipVisible.rectLeft})`);

// 卡片键盘 focus 不能在卡片上方出现长 tooltip（A1.3 用户反馈）：
// role=button 卡片 click 后会 focus，若 focus 触发卡片级拼接 tooltip，会遮挡。
// 完整来源名由 source-badge 自带 aria-label 提供给屏幕阅读器。
await page.mouse.move(2, 2);
await page.waitForTimeout(300);
await page.evaluate((sel) => { document.querySelector(sel).focus({ focusVisible: true }); }, cardSel);
await page.waitForTimeout(300);
const focusTooltip = await page.evaluate(() => {
  const floating = document.querySelector("body > .chip-tooltip--floating");
  const cs = floating ? getComputedStyle(floating) : null;
  return floating ? { opacity: cs.opacity, text: floating.textContent.trim(), visible: Number(cs.opacity) > 0 } : null;
});
console.log("[card focus tooltip]", JSON.stringify(focusTooltip));
assert.ok(!focusTooltip || !focusTooltip.visible, `card keyboard focus must NOT surface a long tooltip above the card (got opacity=${focusTooltip?.opacity})`);
const cardFocusStyle = await page.evaluate((sel) => {
  const card = document.querySelector(sel);
  const cs = getComputedStyle(card);
  return { borderColor: cs.borderColor, matched: card.matches(":focus-visible") };
}, cardSel);
console.log("[card focus style]", JSON.stringify(cardFocusStyle));
assert.ok(cardFocusStyle.matched, "card must enter :focus-visible state when focused by keyboard");
// 键盘 focus 后徽标自身没有 tab stop（badge 不加 tabindex）
const focusTabs = await page.evaluate((sel) => {
  const card = document.querySelector(sel);
  return Array.from(card.querySelectorAll(".source-badge, .tag-chip, .meta-chip")).map((el) => ({
    tabindex: el.getAttribute("tabindex"), role: el.getAttribute("role")
  }));
}, cardSel);
for (const t of focusTabs) {
  assert.equal(t.tabindex, null, "badges must not get tabindex (card is the single tab stop)");
  assert.equal(t.role, null, "badges must not be buttons");
}
console.log("[ok] 13b. card keyboard focus does NOT surface long tooltip; badges keep no tab stop; :focus-visible active");

// ---- 13c. A1.3 用户复审：鼠标 click 卡片（role=button 触发 focus）也不应在卡片上方出现长 tooltip ----
await page.evaluate((sel) => { document.querySelector(sel).blur(); }, cardSel);
await page.mouse.move(2, 2);
await page.waitForTimeout(80);
await page.click(cardSel);
await page.waitForTimeout(220);
const clickTip = await page.evaluate(() => {
  const floating = document.querySelector("body > .chip-tooltip--floating");
  const cs = floating ? getComputedStyle(floating) : null;
  return floating ? { opacity: cs.opacity, text: floating.textContent.trim(), visible: Number(cs.opacity) > 0 } : null;
});
console.log("[card click tooltip]", JSON.stringify(clickTip));
assert.ok(!clickTip || !clickTip.visible, `clicking a card must NOT surface a joined tooltip above it (got opacity=${clickTip?.opacity}, text="${clickTip?.text}")`);
// 清理：blur 卡片，恢复后续步骤
await page.evaluate((sel) => { document.querySelector(sel).blur(); }, cardSel);
await page.mouse.move(2, 2);
await page.waitForTimeout(80);
console.log("[ok] 13c. clicking a card does NOT surface long tooltip");

// ---- 14. 三状态同视口截图：常态 / hover / focus-visible ----
await page.evaluate((sel) => { document.querySelector(sel).blur(); }, cardSel);
await page.evaluate((sel) => { document.querySelector(sel).scrollIntoView({ block: "center" }); }, cardSel);
await page.screenshot({ path: "/tmp/a11-state-normal.png" });
await page.hover(`${cardSel} .source-badge-project`);
await page.screenshot({ path: "/tmp/a11-state-hover.png" });
await page.evaluate((sel) => { document.querySelector(sel).focus({ focusVisible: true }); }, cardSel);
await page.screenshot({ path: "/tmp/a11-state-focus.png" });
console.log("[ok] 14. three-state screenshots saved (normal/hover/focus)");

// ---- 视觉证据：浅图 / 深图 / 灰色 Markdown 封面 ----
const visualCards = [
  { id: MAIN_ID + 1001, name: "light" },
  { id: MAIN_ID + 1002, name: "dark" },
  { id: MAIN_ID, name: "gray" },
  { id: MAIN_ID + 1003, name: "no-custom" }
];
const evidence = { normalStyle, hoverStyle, focusStyle, firstChar, overflowInfo, rowInfo, overlap, fixedChips, multiOrder, alignInfo, ariaInfo, contrastInfo, visualCards };
for (const vc of visualCards) {
  await page.evaluate((id) => { document.querySelector(`[data-open-item="${id}"]`).scrollIntoView({ block: "center" }); }, vc.id);
  const box = await page.evaluate((id) => {
    const card = document.querySelector(`[data-open-item="${id}"]`);
    const row = card.querySelector(".thumb-chip-row");
    const type = card.querySelector(".thumb-badge-type");
    const target = row || type;
    const cr = card.getBoundingClientRect();
    const tr = target.getBoundingClientRect();
    return {
      x: Math.max(0, cr.x - 8),
      y: Math.max(0, tr.y - 10),
      width: cr.width + 16,
      height: tr.height + 36
    };
  }, vc.id);
  await page.screenshot({ path: `/tmp/a11-visual-${vc.name}.png`, clip: box });
}
writeFileSync("/tmp/a11-evidence.json", JSON.stringify(evidence, null, 2));
console.log("evidence written to /tmp/a11-evidence.json");

// ---- 15. tooltip coordinator 场景：跨卡快速移动 / mouseout 早于 rAF / 列表重建 ----
// 15a. 快速跨 10 张卡片移动：任何时刻至多一个 tooltip 可见，且不残留旧卡状态
await page.evaluate(() => window.scrollTo(0, 0));
const allCardIds = await page.evaluate(() =>
  Array.from(document.querySelectorAll(".item-card[data-open-item]")).map((c) => c.dataset.openItem)
);
const quickMoveIds = allCardIds.slice(0, 10);
for (const id of quickMoveIds) {
  const sel = `[data-open-item="${id}"]`;
  const badgeSel = await page.evaluate((s) => {
    const b = document.querySelector(`${s} .source-badge, ${s} .tag-chip, ${s} .meta-chip`);
    return b ? b.className : null;
  }, sel);
  if (!badgeSel) continue;
  const cls = badgeSel.split(" ")[0];
  await page.hover(`${sel} .${cls}`);
  await page.waitForTimeout(16);
}
const visibleTooltips = await page.evaluate(() => {
  const floating = document.querySelector("body > .chip-tooltip--floating");
  const allTips = Array.from(document.querySelectorAll(".chip-tooltip--floating"));
  return allTips.filter((t) => Number(getComputedStyle(t).opacity) > 0).length;
});
assert.ok(visibleTooltips <= 1, `at most one floating tooltip may be visible at a time (got ${visibleTooltips})`);
console.log("[ok] 15a. quick move across cards keeps at most one tooltip visible");

// 15b. mouseout 早于 rAF：立即移出后 tooltip 不得在 rAF 里复活
await page.mouse.move(5, 5);
await page.mouse.move(10, 10);
await page.hover(`${cardSel} .source-badge-project`);
await page.mouse.move(3, 3); // 立刻移出（早于 rAF）
await page.waitForTimeout(200);
const afterEarlyOut = await page.evaluate(() => {
  const floating = document.querySelector("body > .chip-tooltip--floating");
  if (!floating) return null;
  return { opacity: getComputedStyle(floating).opacity };
});
assert.ok(afterEarlyOut && Number(afterEarlyOut.opacity) === 0,
  `tooltip must not resurrect after mouseout before rAF (opacity ${afterEarlyOut?.opacity})`);
console.log("[ok] 15b. mouseout before rAF does not resurrect tooltip");

// 15b2. 同 badge 内部子元素间移动不得闪烁（A1.3 用户反馈：hover tooltip 闪烁）
// mouseover 委托在 badge 内部移动时 closest() 仍返回同一 badge；show() 必须跳过
// 同锚点+同文本+已可见的重复调用，否则 token++/opacity 0→1 反复闪烁。
await page.mouse.move(3, 3);
await page.waitForTimeout(80);
await page.hover(`${cardSel} .source-badge-project`);
await page.waitForTimeout(220);
const flickerSeq2 = [];
for (let i = 0; i < 6; i++) {
  await page.evaluate((sel) => {
    const badge = document.querySelector(`${sel} .source-badge-project`);
    const label = badge.querySelector(".source-badge-label");
    label?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    badge.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  }, cardSel);
  await page.waitForTimeout(30);
  const op = await page.evaluate(() => {
    const tip = document.querySelector("body > .chip-tooltip--floating");
    return tip ? Number(getComputedStyle(tip).opacity) : 0;
  });
  flickerSeq2.push(op);
}
console.log("[flicker seq card]", JSON.stringify(flickerSeq2));
assert.ok(flickerSeq2.every((op) => op === 1),
  `card tooltip must stay visible during intra-badge moves (no flicker): ${JSON.stringify(flickerSeq2)}`);
console.log("[ok] 15b2. intra-badge mouse moves do not flicker the card tooltip");

// 15c. 列表重建（innerHTML 替换）后 tooltip 隐藏且锚点不复活
// 鼠标先移开（避免重建后 hover 立即重新触发 mouseover），再直接替换列表 DOM：
// 旧锚点 badge 从 DOM 移除，MutationObserver 兜底应触发 hide。
await page.hover(`${cardSel} .source-badge-project`);
await page.waitForTimeout(200);
await page.mouse.move(3, 3);
await page.waitForTimeout(50);
await page.evaluate(() => {
  const list = document.getElementById("itemList") || document.querySelector(".item-list");
  if (list) {
    list.innerHTML = "";
  }
});
await page.waitForTimeout(300);
const afterRebuild = await page.evaluate(() => {
  const floating = document.querySelector("body > .chip-tooltip--floating");
  return {
    opacity: floating ? Number(getComputedStyle(floating).opacity) : null,
    observerRuns: window.__chipTooltipObserverRuns || 0,
    observerFired: window.__chipTooltipObserverFired === true,
    badgeConnected: !!(window.__nutbookChipTipController && window.__nutbookChipTipController.activeBadge && window.__nutbookChipTipController.activeBadge.isConnected)
  };
});
console.log("[rebuild]", JSON.stringify(afterRebuild));
assert.equal(afterRebuild.opacity, 0, `list rebuild must hide tooltip (opacity ${afterRebuild.opacity})`);
assert.ok(!afterRebuild.badgeConnected, "stale anchor badge must be disconnected after rebuild");
console.log("[ok] 15c. list rebuild hides tooltip, stale anchor does not resurrect");

// 15d. 顶部边缘 tooltip 向下翻转：锚点 badge 靠近视口顶部时，tooltip 应从上方翻到下方。
// 直接调用 coordinator.show()（用真实 badge + 长文本），把 badge 移到视口顶部后验证翻转。
// 15d. 顶部边缘 tooltip 向下翻转：锚点 badge 靠近视口顶部时，tooltip 应从上方翻到下方。
// 直接在 body 下创建一个 fixed 锚点 badge（避开 itemList 的 transform/padding 影响）。
await page.evaluate(() => {
  const ctrl = window.__nutbookChipTipController;
  if (!ctrl) return;
  const host = document.createElement("div");
  host.id = "chipTooltipTopAnchorHost";
  host.style.cssText = "position:fixed; top:4px; left:320px; z-index:1;";
  host.innerHTML = `
    <span class="source-badge source-badge-project">
      <span class="source-badge-label">用于验证顶部翻转项目来源标签超长</span>
      <span class="chip-tooltip">用于验证顶部翻转项目来源标签超长省略显示行为</span>
    </span>
  `;
  document.body.appendChild(host);
  const badge = host.querySelector(".source-badge-project");
  ctrl.show(badge, badge.querySelector(".chip-tooltip").textContent);
});
await page.waitForTimeout(250);
const topFlip = await page.evaluate(() => {
  const floating = document.querySelector("body > .chip-tooltip--floating");
  const badge = document.querySelector("#chipTooltipTopAnchorHost .source-badge-project");
  if (!floating || !badge) return null;
  const fr = floating.getBoundingClientRect();
  const br = badge.getBoundingClientRect();
  return {
    opacity: Number(getComputedStyle(floating).opacity),
    tipTop: fr.top, tipBottom: fr.bottom,
    badgeTop: br.top, badgeBottom: br.bottom,
    flippedDown: fr.top >= br.bottom
  };
});
console.log("[top flip]", JSON.stringify(topFlip));
assert.ok(topFlip && topFlip.opacity > 0, "tooltip must be visible on top-edge badge");
assert.ok(topFlip.flippedDown, `top-edge tooltip must flip downward (tipTop=${topFlip.tipTop} >= badgeBottom=${topFlip.badgeBottom})`);
assert.ok(topFlip.tipTop >= 0, "flipped tooltip must stay inside viewport top");
console.log("[ok] 15d. top-edge tooltip flips downward and stays in viewport");
await page.evaluate(() => {
  window.__nutbookChipTipController?.hide();
  document.getElementById("chipTooltipTopAnchorHost")?.remove();
});

console.log("\n=== A1.1 rework GUI acceptance passed (incl. tooltip coordinator scenarios) ===");

await browser.close();
server.kill();
