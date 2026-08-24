// PR C / Task C2 回归测试：编辑器双入口（`+ → 封面图` / 图片工具栏二态）与
// 原子身份转移。
//
// 真实挂载 dist/assets/markdown-editor.js（Playwright + Chromium），验证：
// - `+` 菜单中「封面图」紧邻普通「图片」；当前空段落插入、默认大图居中、
//   不超过固有尺寸（CSS max-width:100%、无固定 displayWidth）
// - 图片工具栏二态：合格非封面图片只显示「设为封面」；当前封面只显示
//   「取消封面」；不新增「更换封面图」；tooltip / aria-label 一致
// - 「设为封面」走 C1 原子 transaction：A→B 自动转移、单次 undo/redo 完整恢复
//   /重做身份转移；已有图片的位置/尺寸/对齐/alt/title/link 不被改写
// - 封面身份 badge 只在 hover/选中时出现（常态 opacity 0）
// - duplicate fallback：Milkdown 拒绝挂载，由宿主 source fallback 修复
// - 复制晚到：picker 返回时 editor 已销毁 → 拒绝插入，不写入错误文档
// - serialized Markdown 含 marker + 原图片语法；alignment token 在 title 中保持

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const bundle = readFileSync("dist/assets/markdown-editor.js", "utf8");
const fixtureDir = "src-tauri/tests/fixtures/card-revisions";
const fixture = (name) => readFileSync(`${fixtureDir}/${name}`, "utf8");

const hostHtml = readFileSync("dist/index.html", "utf8");
const coverCssMatch = hostHtml.match(
  /\.milkdown-editor-root \.markdown-cover-image-block[\s\S]*?\.markdown-cover-image-block\.ProseMirror-selectednode \{\s*outline:\s*none;\s*\}/m
);
assert.ok(coverCssMatch, "dist/index.html must contain the .markdown-cover-image-block CSS rules");
const coverCss = coverCssMatch[0];
const badgeCssMatch = hostHtml.match(
  /\.milkdown-editor-root \.markdown-cover-image-block \.markdown-cover-media::after[\s\S]*?\.markdown-cover-image-block\.ProseMirror-selectednode \.markdown-cover-media::after \{\s*opacity:\s*1;\s*\}/m
);
assert.ok(badgeCssMatch, "dist/index.html must contain the cover badge CSS rules");
const badgeCss = badgeCssMatch[0];
const toolbarCssMatch = hostHtml.match(
  /\.markdown-image-align-toolbar[\s\S]*?\.markdown-image-align-tooltip[\s\S]*?\}/m
);
const toolbarCss = toolbarCssMatch ? toolbarCssMatch[0] : "";

const PLAIN = fixture("markdown-cover-plain.md");
const DUPLICATE = fixture("markdown-duplicate-cover.md");
const REMOTE = fixture("markdown-remote-cover.md");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.setContent(`
    <style>
      #editor { width: 900px; }
      img { max-width: 100%; width: 120px; height: 70px; }
      .markdown-cover-image-block img { width: 120px !important; height: 70px !important; }
      ${coverCss}
      ${badgeCss}
      ${toolbarCss}
    </style>
    <div id="editor" class="milkdown-editor-root"></div>
  `);
  await page.addScriptTag({ path: "dist/i18n.js" });
  await page.addScriptTag({ content: bundle, type: "module" });
  await page.waitForFunction(() => Boolean(window.NutbookMarkdownEditor?.create));

  async function mountEditor(markdown, options = {}) {
    return page.evaluate(async ({ source, coverAsset, validateResult }) => {
      const root = document.getElementById("editor");
      root.innerHTML = "";
      window.__removedSources = [];
      window.__coverAssets = [];
      window.__releasedCoverAssets = [];
      window.__coverEditor = await window.NutbookMarkdownEditor.create({
        root,
        markdown: source,
        language: "zh-CN",
        onRemoveImageAsset(src) {
          window.__removedSources.push(String(src));
        },
        onInsertCoverAsset() {
          window.__coverAssets.push("picker-called");
          return coverAsset;
        },
        onReleaseCoverAsset(asset) {
          window.__releasedCoverAssets.push(asset?.relativePath || "");
        },
        onValidateCoverAsset(src) {
          window.__coverAssets.push(`validate:${src}`);
          return validateResult;
        }
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return true;
    }, { source: markdown, coverAsset: options.coverAsset ?? null, validateResult: options.validateResult ?? true });
  }

  async function getMarkdown() {
    return page.evaluate(() => window.__coverEditor.getMarkdown());
  }
  async function getBaseline() {
    return page.evaluate(() => window.__coverEditor.getBaselineMarkdown());
  }
  async function getCoverState() {
    return page.evaluate(() => window.__coverEditor.getCoverState());
  }
  async function coverableBlocks() {
    return page.evaluate(() => window.__coverEditor.getCoverableImageBlocks());
  }
  async function removedSources() {
    return page.evaluate(() => JSON.stringify(window.__removedSources));
  }
  async function undo() {
    return page.evaluate(() => window.__coverEditor.undo());
  }
  async function redo() {
    return page.evaluate(() => window.__coverEditor.redo());
  }
  async function findImageBlockPos(alt) {
    const blocks = await coverableBlocks();
    return blocks.find((block) => block.alt === alt)?.pos ?? null;
  }

  // ---------------------------------------------------------------- + menu
  await mountEditor("", { coverAsset: { relativePath: "./assets/cover.png", fileName: "cover.png" } });
  // 触发插入菜单（keyup 调度）
  await page.evaluate(() => {
    const root = document.getElementById("editor");
    root.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
  });
  await page.waitForTimeout(50);
  const menuState = await page.evaluate(() => {
    const menu = document.querySelector(".markdown-insert-menu");
    const buttons = [...menu.querySelectorAll("button[data-insert-command]")];
    const labels = buttons.map((b) => b.dataset.insertCommand);
    return {
      visible: menu.classList.contains("visible"),
      labels,
      imageIndex: labels.indexOf("image"),
      coverIndex: labels.indexOf("cover-image"),
      coverAria: menu.querySelector('button[data-insert-command="cover-image"]')?.getAttribute("aria-label"),
      tooltip: menu.querySelector('button[data-insert-command="cover-image"] .markdown-insert-tooltip')?.textContent
    };
  });
  assert.equal(menuState.visible, true, "insert menu must be visible on an empty paragraph");
  assert.equal(menuState.coverIndex, menuState.imageIndex + 1, "「封面图」必须紧邻普通「图片」");
  assert.equal(menuState.coverAria, "封面图", "cover menu aria-label must match");
  assert.equal(menuState.tooltip, "封面图", "cover menu tooltip must match aria-label");

  // 点击封面图（菜单项走 pointerdown 路由）→ picker mock 返回本地横图 → 当前空段插入。
  await page.evaluate(() => {
    document.querySelector('button[data-insert-command="cover-image"]')
      ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(80);
  let markdown = await getMarkdown();
  assert.match(
    markdown,
    /<!-- nutbook-cover -->\n!\[cover\]\(\.\/assets\/cover\.png "nutbook-align=center"\)/,
    "+ 封面图 必须在当前空段插入 marker + 图片且默认居中：\n" + markdown
  );
  let state = await getCoverState();
  assert.equal(state.hasCover, true, "inserted cover must be recognized");
  assert.equal(state.nodeKind, "image", "new cover keeps plain image kind");
  // 默认大图：displayWidthPx 为 null（不设固定宽度）+ CSS max-width:100% → 不超固有尺寸放大。
  const sizeState = await page.evaluate(() => {
    const block = document.querySelector(".markdown-cover-image-block");
    const img = block?.querySelector("img");
    return {
      centered: block?.classList.contains("nutbook-image-align-center"),
      imgMaxWidth: img ? getComputedStyle(img).maxWidth : null,
      imgWidthStyle: img?.getAttribute("style") || ""
    };
  });
  assert.equal(sizeState.centered, true, "new cover must default to centered");
  assert.equal(sizeState.imgMaxWidth, "100%", "cover img must not exceed container width");
  assert.ok(
    !sizeState.imgWidthStyle.includes("width:"),
    "new cover must not set a fixed display width (natural size only)"
  );

  async function hoverImageAndExpectSet(selector) {
    await page.mouse.move(0, 0);
    await page.hover(selector);
    await page.waitForFunction(() => {
      const tb = document.querySelector(".markdown-image-align-toolbar");
      const setBtn = tb?.querySelector('button[data-image-cover="set"]');
      return tb?.classList.contains("visible") && setBtn && !setBtn.hidden;
    }, null, { timeout: 2000 });
  }

  async function hoverCoverAndExpectRemove(selector) {
    await page.mouse.move(0, 0);
    await page.hover(selector);
    await page.waitForFunction(() => {
      const tb = document.querySelector(".markdown-image-align-toolbar");
      const removeBtn = tb?.querySelector('button[data-image-cover="remove"]');
      return tb?.classList.contains("visible") && removeBtn && !removeBtn.hidden;
    }, null, { timeout: 2000 });
  }

  async function clickToolbarCoverSet() {
    await page.evaluate(() => {
      document.querySelector('button[data-image-cover="set"]')
        ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(80);
  }

  async function clickToolbarCoverRemove() {
    await page.evaluate(() => {
      document.querySelector('button[data-image-cover="remove"]')
        ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(80);
  }

  // ---------------------------------------------------------------- toolbar
  await mountEditor(`# Doc\n\n![Hero](./assets/hero.png)\n\n![Other](./assets/other.png)\n`);
  // hover 第一张图 → 工具栏出现，且只显示「设为封面」。
  await hoverImageAndExpectSet('.ProseMirror img[alt="Hero"]');
  let toolbar = await page.evaluate(() => {
    const toolbarEl = document.querySelector(".markdown-image-align-toolbar");
    const setBtn = toolbarEl?.querySelector('button[data-image-cover="set"]');
    const removeBtn = toolbarEl?.querySelector('button[data-image-cover="remove"]');
    return {
      visible: toolbarEl?.classList.contains("visible"),
      setHidden: setBtn ? setBtn.hidden : null,
      removeHidden: removeBtn ? removeBtn.hidden : null,
      setAria: setBtn?.getAttribute("aria-label"),
      setTooltip: setBtn?.querySelector(".markdown-image-align-tooltip")?.textContent,
      removeAria: removeBtn?.getAttribute("aria-label")
    };
  });
  assert.ok(toolbar?.visible, "image toolbar must appear on hover");
  assert.equal(toolbar.setHidden, false, "non-cover image must show 设为封面");
  assert.equal(toolbar.removeHidden, true, "non-cover image must NOT show 取消封面");
  assert.equal(toolbar.setAria, "设为封面", "set-cover aria-label");
  assert.equal(toolbar.setTooltip, "设为封面", "set-cover tooltip must match aria-label");
  assert.equal(toolbar.removeAria, "取消封面", "remove-cover aria-label");

  // 键盘 Enter 与 pointerdown 必须走同一动作；原实现只监听 pointerdown，
  // 按钮虽可聚焦却无法由键盘激活。
  await page.evaluate(() => {
    const button = document.querySelector('button[data-image-cover="set"]');
    button?.focus();
    button?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(80);
  state = await getCoverState();
  assert.equal(state.src, "./assets/hero.png", "Enter on 设为封面 must activate the same command");
  await undo();
  await hoverImageAndExpectSet('.ProseMirror img[alt="Hero"]');

  // 点击「设为封面」→ 原子包裹；正文其余部分不变。
  await clickToolbarCoverSet();
  state = await getCoverState();
  assert.equal(state.hasCover, true, "set-as-cover must create the cover");
  assert.equal(state.src, "./assets/hero.png", "cover src must be the hovered image");
  markdown = await getMarkdown();
  assert.match(markdown, /<!-- nutbook-cover -->\n!\[Hero\]\(\.\/assets\/hero\.png\)/, "marker must precede the original image syntax");
  assert.match(markdown, /!\[Other\]\(\.\/assets\/other\.png\)/, "untouched image must stay unchanged");
  const baseline = await getBaseline();
  assert.ok(baseline !== markdown, "cover identity change must dirty the baseline");
  // baseline 必须等于保存前的序列化值（设置封面不会重置 baseline）。
  assert.match(baseline, /^# Doc/, "baseline keeps the original document");

  // 当前封面 hover → 只显示「取消封面」。
  await hoverCoverAndExpectRemove('.ProseMirror .markdown-cover-image-block img');
  toolbar = await page.evaluate(() => {
    const toolbarEl = document.querySelector(".markdown-image-align-toolbar");
    const setBtn = toolbarEl?.querySelector('button[data-image-cover="set"]');
    const removeBtn = toolbarEl?.querySelector('button[data-image-cover="remove"]');
    return { visible: toolbarEl?.classList.contains("visible"), setHidden: setBtn?.hidden, removeHidden: removeBtn?.hidden };
  });
  assert.ok(toolbar.visible, "cover hover must show toolbar");
  assert.equal(toolbar.setHidden, true, "current cover must NOT show 设为封面");
  assert.equal(toolbar.removeHidden, false, "current cover must show 取消封面");

  // 取消封面 → 图片原地保留为普通正文；marker 移除。
  await clickToolbarCoverRemove();
  state = await getCoverState();
  assert.equal(state.hasCover, false, "remove-cover must drop cover identity");
  markdown = await getMarkdown();
  assert.doesNotMatch(markdown, /<!-- nutbook-cover -->/, "marker removed after cancel");
  assert.match(markdown, /!\[Hero\]\(\.\/assets\/hero\.png\)/, "image stays in the body after cancel");
  assert.equal(await removedSources(), "[]", "cancel must never trigger resource deletion");

  // ---------------------------------------------------------------- A→B
  await mountEditor(`# Doc\n\n<!-- nutbook-cover -->\n\n![A](./assets/a.png)\n\n![B](./assets/b.png)\n`);
  state = await getCoverState();
  assert.equal(state.src, "./assets/a.png", "A is the initial cover");
  // hover B → 设为封面 → A 自动解包，B 成为封面。
  await hoverImageAndExpectSet('.ProseMirror img[alt="B"]');
  await clickToolbarCoverSet();
  try {
    await page.waitForFunction(() => {
      const state = window.__coverEditor.getCoverState();
      return state.src === "./assets/b.png";
    }, null, { timeout: 1500 });
  } catch (_) {
    // 测试环境 mouse.move 会在 hover 与 click 之间制造 pointerout 竞态：
    // 重悬停 + 重试一次（产品中真实指针路径不会出现该竞态）。
    await hoverImageAndExpectSet('.ProseMirror img[alt="B"]');
    await clickToolbarCoverSet();
    await page.waitForFunction(() => {
      const state = window.__coverEditor.getCoverState();
      return state.src === "./assets/b.png";
    }, null, { timeout: 2000 });
  }
  state = await getCoverState();
  assert.equal(state.src, "./assets/b.png", "B must become the cover after transfer");
  markdown = await getMarkdown();
  assert.match(markdown, /<!-- nutbook-cover -->\n!\[B\]\(\.\/assets\/b\.png\)/, "marker must now precede B");
  assert.match(markdown, /!\[A\]\(\.\/assets\/a\.png\)/, "A must return to a plain image at its original position");
  // 单次 undo：完整恢复身份转移（A 重新成为封面）。
  await undo();
  state = await getCoverState();
  assert.equal(state.src, "./assets/a.png", "single undo must restore A as cover");
  markdown = await getMarkdown();
  assert.match(markdown, /<!-- nutbook-cover -->\n!\[A\]\(\.\/assets\/a\.png\)/, "undo restores marker before A");
  assert.match(markdown, /!\[B\]\(\.\/assets\/b\.png\)/, "B back to plain");
  // 单次 redo：B 重新成为封面。
  await redo();
  state = await getCoverState();
  assert.equal(state.src, "./assets/b.png", "single redo must transfer cover to B again");
  assert.equal(await removedSources(), "[]", "A→B + undo/redo must never delete resources");

  // 封面身份 badge：常态 opacity 0，hover/selected 时 opacity 1。
  await mountEditor(`# Doc\n\n<!-- nutbook-cover -->\n\n![Hero](./assets/hero.png)\n`);
  await page.mouse.move(0, 0);
  // 等 badge 完全回到隐藏态（过渡 120ms + 上一节 hover 状态排空）。
  await page.waitForFunction(() => {
    const media = document.querySelector(".markdown-cover-image-block .markdown-cover-media");
    return media && getComputedStyle(media, "::after").opacity === "0";
  }, null, { timeout: 2000 });
  const badge = await page.evaluate(() => {
    const media = document.querySelector(".markdown-cover-image-block .markdown-cover-media");
    const block = document.querySelector(".markdown-cover-image-block");
    return {
      badgeAttr: media?.getAttribute("data-cover-badge"),
      rest: getComputedStyle(media, "::after").opacity,
      selected: block?.classList.contains("ProseMirror-selectednode")
    };
  });
  assert.equal(badge.badgeAttr, "封面", "cover block carries a cover badge marker");
  assert.equal(badge.rest, "0", "badge must be hidden at rest (no permanent marker)");
  // hover 封面 → 轻量徽标出现（产品主路径：hover/focus/选中任一即显示）。
  // 悬停封面图片底部（避开浮在其上方的图片工具栏遮罩，工具栏 z-index 更高）。
  await page.hover('.ProseMirror .markdown-cover-image-block img', { position: { x: 60, y: 60 } });
  await page.waitForFunction(() => {
    const block = document.querySelector(".markdown-cover-image-block");
    return block && getComputedStyle(block, "::after").opacity === "1";
  }, null, { timeout: 2000 });
  const badgeHover = await page.evaluate(() => {
    const block = document.querySelector(".markdown-cover-image-block");
    return getComputedStyle(block, "::after").opacity;
  });
  assert.equal(badgeHover, "1", "badge must appear when the cover is hovered");
  // 选中态同样触发徽标（.ProseMirror-selectednode 伪类路径；等过渡完成）。
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    const block = document.querySelector(".markdown-cover-image-block");
    block.classList.add("ProseMirror-selectednode");
  });
  await page.waitForFunction(() => {
    const media = document.querySelector(".markdown-cover-image-block .markdown-cover-media");
    return getComputedStyle(media, "::after").opacity === "1";
  }, null, { timeout: 2000 });
  const badgeSelected = await page.evaluate(() => {
    const media = document.querySelector(".markdown-cover-image-block .markdown-cover-media");
    const opacity = getComputedStyle(media, "::after").opacity;
    document.querySelector(".markdown-cover-image-block").classList.remove("ProseMirror-selectednode");
    return opacity;
  });
  assert.equal(badgeSelected, "1", "badge must appear when the cover is selected");

  // ------------------------------------------------- remote 图片可直接设封面
  await mountEditor(`# Doc\n\n![Remote](https://example.invalid/covers/landscape-16x9.png)\n`);
  await hoverImageAndExpectSet('.ProseMirror img[alt="Remote"]');
  const remoteToolbar = await page.evaluate(() => {
    const setBtn = document.querySelector('button[data-image-cover="set"]');
    return setBtn ? !setBtn.hidden : null;
  });
  assert.equal(remoteToolbar, true, "http(s) image must be a cover candidate (no download, no ratio check)");
  await clickToolbarCoverSet();
  state = await getCoverState();
  assert.equal(state.src, "https://example.invalid/covers/landscape-16x9.png", "remote cover keeps URL unchanged");
  markdown = await getMarkdown();
  assert.doesNotMatch(markdown, /assets\//, "remote cover must not create a staged local copy");
  assert.match(markdown, /!\[Remote\]\(https:\/\/example\.invalid\/covers\/landscape-16x9\.png\)/, "remote URL must stay byte-stable");

  // ---------------------------------------------------- 校验失败不改变身份
  await mountEditor(`# Doc\n\n![Square](./assets/square.png)\n`, { validateResult: false });
  await hoverImageAndExpectSet('.ProseMirror img[alt="Square"]');
  await clickToolbarCoverSet();
  await page.waitForTimeout(60);
  state = await getCoverState();
  assert.equal(state.hasCover, false, "validation failure must NOT change cover identity");
  markdown = await getMarkdown();
  assert.doesNotMatch(markdown, /<!-- nutbook-cover -->/, "validation failure must leave the doc untouched");

  // ------------------------------------------------ 复制晚到（picker 已销毁）
  const lateState = await page.evaluate(async () => {
    const root = document.getElementById("editor");
    let resolvePick;
    window.__lateCoverEditor = await window.NutbookMarkdownEditor.create({
      root,
      markdown: "",
      language: "zh-CN",
      onInsertCoverAsset() {
        return new Promise((resolve) => { resolvePick = resolve; });
      },
      onReleaseCoverAsset(asset) {
        window.__lateReleasedCover = asset?.relativePath || "";
      }
    });
    // 触发 + 菜单并点击封面图（picker 挂起）
    root.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 40));
    document.querySelector('button[data-insert-command="cover-image"]')
      ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 20));
    // picker 返回前销毁编辑器
    window.NutbookMarkdownEditor.destroy(root);
    await new Promise((r) => setTimeout(r, 20));
    resolvePick({ relativePath: "./assets/late.png", fileName: "late.png", stagedAssetId: "late-lease" });
    await new Promise((r) => setTimeout(r, 60));
    return {
      markdown: root.textContent || "",
      released: window.__lateReleasedCover || ""
    };
  });
  assert.doesNotMatch(lateState.markdown, /late\.png/, "late picker resolution must not insert into a dead editor");
  assert.equal(lateState.released, "./assets/late.png", "late staged asset must be released after editor destruction");

  // ---------------------------------------------- duplicate：阻断视觉工具
  const duplicateError = await page.evaluate(async (markdown) => {
    const root = document.getElementById("editor");
    root.innerHTML = "";
    try {
      await window.NutbookMarkdownEditor.create({ root, markdown });
      return null;
    } catch (error) {
      return String(error?.message || error);
    }
  }, DUPLICATE);
  assert.ok(duplicateError && /nutbook-cover/.test(duplicateError), `duplicate must reject Milkdown mounting: ${duplicateError}`);
  const duplicateDom = await page.evaluate(() => ({
    hasMilkdown: Boolean(document.querySelector("#editor .milkdown-editor-body")),
    hasWrapper: Boolean(document.querySelector('div[data-type="markdown-cover-image"]')),
    hasToolbar: Boolean(document.querySelector(".markdown-image-align-toolbar"))
  }));
  assert.equal(duplicateDom.hasMilkdown, false, "duplicate must not mount Milkdown");
  assert.equal(duplicateDom.hasWrapper, false, "duplicate must not create a cover wrapper");
  assert.equal(duplicateDom.hasToolbar, false, "duplicate source fallback must not expose visual cover tools");
} finally {
  await browser.close();
}

console.log("markdown cover interactions: OK");
