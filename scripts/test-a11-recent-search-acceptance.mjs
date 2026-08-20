import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

// 真实 DB 数据（A0 验收 shared item），不硬编码 item id，统一用 fixture.id。
// A2 验收：最近搜索历史机制（Acceptance Path E）。搜索相关性由 mock 后端按
// fileName/summary/searchText 过滤模拟；历史词为确定性词。
const fixture = JSON.parse(readFileSync("/tmp/a11-fixture.json", "utf8"));
const MAIN_ID = fixture.id;

const server = spawn(process.execPath, [
  "node_modules/vite/bin/vite.js", "dist",
  "--host", "127.0.0.1", "--port", "4182", "--strictPort"
], { stdio: "ignore" });

const origin = "http://127.0.0.1:4182";
for (let i = 0; i < 80; i++) {
  try { const r = await fetch(origin); if (r.ok) break; } catch {}
  await new Promise(r => setTimeout(r, 50));
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => console.error("page error:", e.stack || e.message));
page.on("console", (msg) => { if (msg.type() === "error") console.log("[console.error]", msg.text()); });

// ---- mock 数据：真实 fixture 项 + 确定性搜索词 ----
const itemFrom = (id, fileName, fileType, extra = {}) => {
  const src = fixture.contextItems.find((c) => c.id === id);
  return {
    id,
    libraryId: fixture.library_id,
    filePath: src ? src.file_path : `/mock/${fileName}`,
    relativePath: src ? src.relative_path : fileName,
    fileName: src ? src.file_name : fileName,
    fileExt: src ? src.file_ext : (fileType === "html" ? "html" : "md"),
    fileType,
    fileSize: 100,
    modifiedAt: "1786720150",
    title: null,
    summary: src ? src.summary : null,
    pathState: "valid",
    isFavorite: 0,
    lastOpenedAt: null,
    skillBinding: null,
    sourceBadges: [],
    tags: [],
    thumbnail: null,
    ...extra
  };
};

const mainItem = {
  id: MAIN_ID,
  libraryId: fixture.library_id,
  filePath: fixture.file_path,
  relativePath: fixture.relative_path,
  fileName: fixture.file_name,
  fileExt: fixture.file_ext,
  fileType: fixture.file_type,
  fileSize: fixture.file_size,
  modifiedAt: fixture.modified_at,
  title: fixture.title,
  summary: fixture.summary,
  pathState: fixture.path_state,
  isFavorite: fixture.is_favorite === 1,
  lastOpenedAt: fixture.last_opened_at,
  skillBinding: null,
  sourceBadges: fixture.sourceBadges,
  tags: fixture.tags,
  thumbnail: null,
  // 模拟真实正文全文（真实文件正文含「内部来源验收丙」，与计划中 4.1 的
  // 「项目来源验收甲号」不同——以真实正文词为准，见 MEMORY 记录）。
  searchText: "共享来源卡片正文：内部来源验收丙"
};

const items = [
  mainItem,
  itemFrom(3922, "search-revision-alpha.md", "markdown"),
  itemFrom(3923, "search-revision-beta.md", "markdown"),
  itemFrom(3924, "search-shared-card.html", "html"),
  itemFrom(3927, "project-only-card.html", "html"),
  itemFrom(3926, "README.md", "markdown"),
  itemFrom(3905, "portable-markdown-images.md", "markdown")
];

const SEARCH_WORDS = ["revision-alpha", "revision-beta", "shared-card", "内部来源验收丙"];
const NO_MATCH_WORD = "zzz-no-match-zzz";
const FAIL_WORD = "backend-fail-xyz";

await page.addInitScript((data) => {
  const { fixture, items, MAIN_ID } = data;
  const allLibraries = fixture.allLibraries.map((l) => ({
    id: l.id, name: l.name, rootPath: l.root_path, sourceKind: l.source_kind,
    pathState: l.path_state,
    isActive: l.is_active !== 0, isOwner: false,
    createdAt: "2026-08-15T00:00:00Z", updatedAt: "2026-08-15T00:00:00Z",
    lastScannedAt: null, skillBinding: null
  }));
  // 调用跟踪：验收断言「删除不搜索」「历史点击重搜」「后端失败不记录」。
  window.__a2Calls = [];
  window.__a2SearchText = (item) => [
    item.fileName || "", item.summary || "", item.title || "", item.searchText || ""
  ].join(" ").toLowerCase();

  window.__TAURI_INTERNALS__ = {
    invoke: async (cmd, args = {}) => {
      // 应用侧 invoke 经 commandVariants 包装：list_items 收到 { query: args }，
      // 多数其他命令收到 { payload: args }，少量命令直接传裸 args。统一解包读取。
      const p = (args && typeof args === "object" && "payload" in args && args.payload && typeof args.payload === "object")
        ? args.payload
        : (args || {});
      const q = (p && typeof p === "object" && "query" in p && p.query && typeof p.query === "object")
        ? p.query
        : p;
      if (cmd === "list_libraries") return allLibraries;
      if (cmd === "list_items") {
        const keyword = String(q.keyword || "").toLowerCase();
        window.__a2Calls.push({ cmd: "list_items", keyword, fileTypes: q.fileTypes || null, tagIds: q.tagIds || null });
        if (keyword === "backend-fail-xyz") {
          throw new Error("simulated backend failure for A2 acceptance");
        }
        let out = items;
        if (keyword) {
          out = items.filter((item) => window.__a2SearchText(item).includes(keyword));
        }
        if (Array.isArray(q.fileTypes) && q.fileTypes.length) {
          out = out.filter((item) => q.fileTypes.includes(item.fileType));
        }
        if (Array.isArray(q.tagIds) && q.tagIds.length) {
          out = out.filter((item) => (item.tags || []).some((t) => q.tagIds.includes(t.id)));
        }
        return { items: out, total: out.length, page: 1, pageSize: 30, hasMore: false };
      }
      if (cmd === "list_item_tags") return {};
      if (cmd === "list_tags") {
        return fixture.tags.map((t) => ({ ...t, color: t.color || "#888", createdAt: t.created_at, updatedAt: t.updated_at, usageCount: 1 }));
      }
      if (cmd === "list_ignored_items") return [];
      if (cmd === "sync_filesystem_state") return {};
      if (cmd === "mark_item_opened") return null;
      if (cmd === "get_item_detail") {
        const item = items.find((i) => i.id === Number(q.itemId ?? p.itemId)) || items[0];
        return { ...item, sourceText: item.searchText || "", rawText: item.searchText || "" };
      }
      if (cmd === "get_item_preview") {
        const item = items.find((i) => i.id === Number(q.itemId ?? p.itemId)) || items[0];
        return {
          fileType: "markdown",
          itemId: item.id,
          title: null,
          raw: `# ${item.fileName}\n\n内部来源验收丙 正文。`,
          html: "<h1>文档标题</h1><p>内部来源验收丙 正文。</p>",
          baseDir: "",
          editable: true
        };
      }
      return null;
    },
    transformCallback: () => 0,
    metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main", windowLabel: "main" } }
  };
}, { fixture, items, MAIN_ID });

// ---- 工具函数 ----
const history = () => page.evaluate(() => {
  try {
    return JSON.parse(window.localStorage.getItem("nutbook.recentSearches.v1") || "[]");
  } catch {
    return [];
  }
});
const listItemsCalls = () => page.evaluate(() => window.__a2Calls.filter((c) => c.cmd === "list_items"));
const popupOpen = () => page.evaluate(() => document.getElementById("recentSearchPopup")?.classList.contains("open") || false);
const popupWords = () => page.evaluate(() =>
  [...document.querySelectorAll("#recentSearchPopup .recent-search-text")].map((n) => n.textContent)
);
const popupActiveIndex = () => page.evaluate(() =>
  [...document.querySelectorAll("#recentSearchPopup .recent-search-option")].findIndex((n) => n.classList.contains("active"))
);
const waitHistory = (expected) => page.waitForFunction((want) => {
  try {
    const got = JSON.parse(window.localStorage.getItem("nutbook.recentSearches.v1") || "[]");
    return JSON.stringify(got) === JSON.stringify(want);
  } catch {
    return false;
  }
}, expected, { timeout: 4000 });
const waitCards = (count) => page.waitForFunction((want) =>
  document.querySelectorAll('.item-card').length === want, count, { timeout: 4000 });
const lastCallKeyword = () => page.evaluate(() => {
  const calls = window.__a2Calls.filter((c) => c.cmd === "list_items");
  return calls[calls.length - 1]?.keyword || "";
});
// 确定性清空输入：evaluate + 显式 input 事件，避免 Playwright fill 在值未变化时
// 不派发 input（真实键盘删除总是会派发）。
const clearSearch = async () => {
  await page.evaluate(() => {
    const el = document.getElementById("searchInput");
    if (el.value !== "") {
      el.value = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
  await page.waitForTimeout(120);
};
const focusTopSearch = async () => {
  // 先 blur 再 click：Escape 后输入框可能仍保持 focus，click 已聚焦元素不会
  // 重新触发 focus 事件，popup 就不会打开。
  await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
  await page.click("#searchInput", { position: { x: 10, y: 6 } });
  await page.waitForTimeout(50);
};
const openPopup = async () => {
  await focusTopSearch();
  await clearSearch();
  await page.waitForFunction(() => document.getElementById("recentSearchPopup")?.classList.contains("open"), null, { timeout: 3000 });
};
let expectedHistory = [];
const enterSearch = async (word) => {
  // 与 recordRecentSearch 相同的语义：大小写不敏感去重、最新在前、最多三条。
  // 以真实当前历史为基准（删除操作会移除词条，Node 侧变量可能过期）。
  const current = await history();
  expectedHistory = [word, ...current.filter((w) => w.toLowerCase() !== word.toLowerCase())].slice(0, 3);
  await page.fill("#searchInput", word);
  await page.keyboard.press("Enter");
  await waitHistory(expectedHistory);
};
const selectFileType = (value) => page.evaluate((v) => {
  const sel = document.getElementById("fileTypeSelect");
  sel.value = v;
  sel.dispatchEvent(new Event("change", { bubbles: true }));
}, value);
const toggleTagFilter = () => page.evaluate(() => {
  const node = document.querySelector("[data-tag-id]");
  if (node) node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});

await page.goto(origin, { waitUntil: "networkidle" });
await page.waitForSelector('.item-card', { timeout: 8000 });
await page.waitForSelector(`[data-open-item="${MAIN_ID}"]`, { timeout: 5000 });

// ================= Path E-1/E-2：Enter 记录、最多三条、重复置顶去重 =================
assert.equal(await popupOpen(), false, "popup must start closed");
for (const word of SEARCH_WORDS) {
  await enterSearch(word);
}
assert.deepEqual(await history(), ["内部来源验收丙", "shared-card", "revision-beta"], "after 4 Enter searches only the latest 3 survive, newest first");
console.log("[ok] E-1: 4 Enter searches keep only the latest 3");

// 重复搜索旧词：置顶且不重复。
await enterSearch("shared-card");
assert.deepEqual(await history(), ["shared-card", "内部来源验收丙", "revision-beta"], "repeating an old word must move it to the front without duplicating");
console.log("[ok] E-2: repeating an old word moves it to the front, deduped");

// ================= Path E-3：重启后历史保持 =================
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector('.item-card', { timeout: 8000 });
assert.deepEqual(await history(), ["shared-card", "内部来源验收丙", "revision-beta"], "history must survive a restart (localStorage)");
console.log("[ok] E-3: history persists across restart");

// ================= Path E-4：共享 coordinator，两框同一历史 =================
// 真实产品只有顶栏搜索框可见（home-search 输入框是 value 同步的隐藏副本，
// 见 dist CSS `.home-search { display:none }`）；两框共享同一个 popup 与存储。
await openPopup();
assert.deepEqual(await popupWords(), ["shared-card", "内部来源验收丙", "revision-beta"], "topbar search box must show the shared history on focus");
assert.equal(await page.evaluate(() => document.getElementById("searchInput").getAttribute("aria-expanded")), "true", "topbar input must expose aria-expanded=true");
assert.equal(
  await page.evaluate(() => document.getElementById("homeSearchInput").getAttribute("aria-controls")),
  "recentSearchPopup",
  "the hidden home input must point at the same shared popup"
);
await page.keyboard.press("Escape");
await page.waitForTimeout(50);
assert.equal(await popupOpen(), false, "Escape must close the popup");
assert.equal(await page.evaluate(() => document.activeElement === document.getElementById("searchInput")), true, "Escape must keep focus on the search input");
// 两个输入框 value 保持同步（syncSearchInputs），输入词不重复触发记录。
await page.fill("#searchInput", "sync-check");
assert.equal(
  await page.evaluate(() => document.getElementById("homeSearchInput").value),
  "sync-check",
  "typing in the visible box must sync the hidden home box"
);
await clearSearch();
console.log("[ok] E-4: one shared popup and storage for both search boxes; values stay in sync");

// ================= Path E-5：点击历史同步两框并刷新真实搜索结果 =================
const callsBeforeClick = (await listItemsCalls()).length;
await page.click("#recentSearchPopup .recent-search-option[data-recent-index='0']");
// 点击后立即执行一次新搜索并渲染唯一命中卡片。
await waitCards(1);
assert.equal(
  await page.evaluate(() => document.getElementById("searchInput").value === "shared-card" && document.getElementById("homeSearchInput").value === "shared-card"),
  true,
  "clicking a history item must sync both search inputs"
);
assert.equal((await listItemsCalls()).length, callsBeforeClick + 1, "clicking a history item must execute exactly one new search");
assert.equal(await lastCallKeyword(), "shared-card", "the latest executed search must be the clicked history word");
assert.equal(await page.evaluate(() => Boolean(document.querySelector('[data-open-item="3924"]'))), true, "the matching card must be search-shared-card.html (3924)");
assert.equal(await popupOpen(), false, "popup must close after applying a history item");
console.log("[ok] E-5: clicking history syncs both inputs and refreshes results");

// ================= Path E-6：删除中间一条，列表保持打开、结果不变 =================
await openPopup();
assert.deepEqual(await popupWords(), ["shared-card", "内部来源验收丙", "revision-beta"], "clearing the input while focused must reopen the popup");
const callsBeforeDelete = (await listItemsCalls()).length;
const cardsBeforeDelete = await page.evaluate(() => document.querySelectorAll('.item-card').length);
await page.click("#recentSearchPopup .recent-search-option[data-recent-index='1'] .recent-search-remove");
await page.waitForTimeout(80);
assert.equal(await popupOpen(), true, "deleting one item must keep the popup open");
assert.deepEqual(await popupWords(), ["shared-card", "revision-beta"], "the deleted middle item must disappear from the popup");
assert.deepEqual(await history(), ["shared-card", "revision-beta"], "the deleted word must be removed from storage");
assert.equal((await listItemsCalls()).length, callsBeforeDelete, "deleting must not execute a search");
assert.equal(await page.evaluate(() => document.querySelectorAll('.item-card').length), cardsBeforeDelete, "current search results must stay unchanged after delete");
console.log("[ok] E-6: deleting the middle item keeps the list open and results unchanged");

// ================= Path E-7：清空/切语言/类型/标签不污染、不翻译历史词 =================
await page.keyboard.press("Escape");
const snapshotBefore = await history();
// 切语言：popup 文案跟随语言，历史词保持原文。
await page.evaluate(() => window.NutbookI18n.setLanguage("en-US"));
await openPopup();
assert.equal(
  await page.evaluate(() => document.getElementById("recentSearchPopup").getAttribute("aria-label")),
  "Recent searches",
  "popup chrome must follow the selected language"
);
assert.deepEqual(await popupWords(), ["shared-card", "revision-beta"], "history words must never be translated");
assert.deepEqual(await history(), snapshotBefore, "language switch must not pollute history storage");
await page.keyboard.press("Escape");
await page.evaluate(() => window.NutbookI18n.setLanguage("zh-CN"));
assert.deepEqual(await history(), snapshotBefore, "switching back must keep history intact");
// 文件类型筛选（select 位于 hidden-controls，直接派发 change）。
await selectFileType("markdown");
await page.waitForTimeout(120);
assert.deepEqual(await history(), snapshotBefore, "file type filter must not pollute history");
// 标签筛选（真实 fixture 自定义标签按钮，位于 hidden tag panel，直接派发 click）。
const hasTagButton = await page.evaluate(() => Boolean(document.querySelector("[data-tag-id]")));
if (hasTagButton) {
  await toggleTagFilter();
  await page.waitForTimeout(120);
  assert.deepEqual(await history(), snapshotBefore, "tag filter must not pollute history");
}
// 清空筛选，恢复全量列表，历史仍一致。
await selectFileType("");
if (hasTagButton) {
  await toggleTagFilter();
}
await page.waitForTimeout(120);
assert.deepEqual(await history(), snapshotBefore, "clearing filters must not pollute history");
console.log("[ok] E-7: clearing / language / type / tag changes never pollute or translate history words");

// ================= Path E-8：IME 确认 Enter 不搜索不记录；零结果记录；后端失败不记录 =================
await openPopup();
const callsBeforeIme = (await listItemsCalls()).length;
const historyBeforeIme = await history();
// 中文 IME 候选确认：compositionstart 后按 Enter（isComposingSearch=true），不应搜索。
await page.evaluate(() => document.getElementById("searchInput").dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true })));
await page.keyboard.press("Enter");
await page.waitForTimeout(100);
assert.equal((await listItemsCalls()).length, callsBeforeIme, "IME-confirming Enter must not trigger a search");
assert.deepEqual(await history(), historyBeforeIme, "IME-confirming Enter must not record a broken word");
// isComposing=true 的真实 IME 确认 Enter：同样忽略。
await page.evaluate(() => document.getElementById("searchInput").dispatchEvent(new KeyboardEvent("keydown", {
  key: "Enter", isComposing: true, bubbles: true, cancelable: true
})));
await page.waitForTimeout(80);
assert.equal((await listItemsCalls()).length, callsBeforeIme, "isComposing Enter must not trigger a search");
// key === "Process" / keyCode 229 同样忽略。
await page.evaluate(() => document.getElementById("searchInput").dispatchEvent(new KeyboardEvent("keydown", {
  key: "Process", keyCode: 229, bubbles: true, cancelable: true
})));
await page.waitForTimeout(80);
assert.equal((await listItemsCalls()).length, callsBeforeIme, "Process/229 keydown must not trigger a search");
await page.evaluate(() => document.getElementById("searchInput").dispatchEvent(new CompositionEvent("compositionend", { bubbles: true })));
await page.waitForTimeout(80);
// 零结果搜索：真实成功，可记录。
await enterSearch(NO_MATCH_WORD);
await waitCards(0);
assert.ok((await history()).includes(NO_MATCH_WORD), "zero-result search counts as success and must be recorded");
// 后端失败：不记录。
await page.fill("#searchInput", FAIL_WORD);
await page.keyboard.press("Enter");
await page.waitForTimeout(250);
assert.ok(!(await history()).includes(FAIL_WORD), "backend failure must not be recorded");
assert.equal(await page.evaluate(() => document.getElementById("searchInput").value), FAIL_WORD, "failed search keeps the draft text");
console.log("[ok] E-8: IME/Process/229 ignored; zero-result recorded; backend failure not recorded");

// ================= Path E-9：ArrowUp/Down/Enter/Escape/Tab listbox 路径 =================
// history 现为 [zzz-no-match-zzz, shared-card, revision-beta]（最新在前）。
await openPopup();
assert.deepEqual(await popupWords(), [NO_MATCH_WORD, "shared-card", "revision-beta"]);
assert.equal(await popupActiveIndex(), 0, "first option must be active when the popup opens");
await page.keyboard.press("ArrowDown");
assert.equal(await popupActiveIndex(), 1, "ArrowDown must advance the active option");
await page.keyboard.press("ArrowDown");
assert.equal(await popupActiveIndex(), 2, "ArrowDown again must advance to the last option");
await page.keyboard.press("ArrowUp");
assert.equal(await popupActiveIndex(), 1, "ArrowUp must step back");
assert.equal(
  await page.evaluate(() => document.getElementById("searchInput").getAttribute("aria-activedescendant")),
  "recent-search-option-1",
  "the input must expose aria-activedescendant for the active option"
);
// Enter 激活高亮项：shared-card。
await page.keyboard.press("Enter");
await waitCards(1);
assert.equal(await popupOpen(), false, "Enter on an active history item must apply it and close the popup");
assert.equal(
  await page.evaluate(() => document.getElementById("searchInput").value),
  "shared-card",
  "Enter on an active history item must fill the input"
);
// 删除按钮：pointerdown 不 blur 输入框、click 不冒泡触发搜索。
await openPopup();
const callsBeforeDelBtn = (await listItemsCalls()).length;
await page.evaluate(() => {
  const btn = document.querySelector("#recentSearchPopup .recent-search-remove");
  btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
  btn.click();
});
await page.waitForTimeout(80);
assert.equal(
  await page.evaluate(() => document.activeElement === document.getElementById("searchInput")),
  true,
  "delete button pointerdown must not blur the search input"
);
assert.equal((await listItemsCalls()).length, callsBeforeDelBtn, "delete button click must not bubble into a search");
assert.deepEqual(await history(), ["shared-card", "revision-beta"], "the removed word must disappear from history");
// Escape 关闭并保持焦点。
await page.keyboard.press("Escape");
await page.waitForTimeout(50);
assert.equal(await popupOpen(), false, "Escape must close the popup");
assert.equal(await page.evaluate(() => document.activeElement === document.getElementById("searchInput")), true, "focus must stay on the search input after Escape");
// Tab 关闭并让焦点自然移动。
await openPopup();
await page.keyboard.press("Tab");
await page.waitForTimeout(50);
assert.equal(await popupOpen(), false, "Tab must close the popup");
assert.notEqual(await page.evaluate(() => document.activeElement === document.getElementById("searchInput")), true, "Tab must move focus away from the search input");
console.log("[ok] E-9: Arrow/Enter/Escape/Tab listbox path and delete-button isolation");

// ================= Path E-10：文档模式不渲染普通 DOM popup；返回主页无残留 =================
// 清空搜索恢复全量列表，再打开真实 Markdown 文档进入文档模式。
await clearSearch();
await page.waitForSelector(`[data-open-item="${MAIN_ID}"]`, { timeout: 4000 });
// 关闭可能打开的历史 popup，避免遮挡下方卡片。
await page.keyboard.press("Escape");
await page.waitForTimeout(50);
await page.click(`[data-open-item="${MAIN_ID}"]`);
await page.waitForSelector("#breadcrumbTags .source-badge-project", { timeout: 8000 });
assert.equal(
  await page.evaluate(() => document.getElementById("mainShell").classList.contains("home-mode")),
  false,
  "opening a document must leave home-mode"
);
// 文档模式下聚焦顶部搜索框：即使输入为空也绝不渲染 popup。
await page.click("#searchInput", { position: { x: 10, y: 6 } });
await page.waitForTimeout(120);
assert.equal(await popupOpen(), false, "document mode must never render the plain DOM history popup");
assert.equal(
  await page.evaluate(() => document.getElementById("searchInput").getAttribute("aria-expanded")),
  "false",
  "document mode must keep aria-expanded=false on the topbar input"
);
// 返回主页：历史正常显示且无残留。
await page.click("[data-home-tab]");
await page.waitForFunction(() => document.getElementById("mainShell").classList.contains("home-mode"), null, { timeout: 4000 });
await page.waitForSelector('.item-card', { timeout: 6000 });
await openPopup();
assert.deepEqual(await popupWords(), ["shared-card", "revision-beta"], "returning home must show the intact history with no residue");
console.log("[ok] E-10: document mode suppresses the DOM popup; returning home is clean");

await browser.close();
server.kill();
console.log("A2 recent-search acceptance passed.");
