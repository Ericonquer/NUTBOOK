// PR C / Task C2 GUI 检查修复回归测试：覆盖人工检查发现的问题。
//
// 1. 工具栏二态互斥：非封面图片只显示「设为封面」，当前封面只显示「取消封面」
//    （hidden 必须真实隐藏——button display:inline-flex 曾覆盖 hidden 属性）
// 2. 设置/取消封面有反馈：onCoverChange 回调携带 {kind, ok}，宿主据此提示
// 3. badge 跟随图片：居中/右对齐时「封面」徽标落在图片左上角，不在 wrapper 左缘
// 4. 取消封面后再设置：hover 仍显示「封面」徽标
// 5. `<!-- nutbook-cover -->` 不显示在正文（marker 渲染为不可见）
// 6. 设置封面真正生效：getCoverState().hasCover === true、wrapper 出现在 DOM
// 7. 封面身份切换不导航：格式化 alt 图片设为/取消封面时 viewport 保持稳定

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const bundle = readFileSync("dist/assets/markdown-editor.js", "utf8");
const hostHtml = readFileSync("dist/index.html", "utf8");
const acceptanceMarkdown = readFileSync(
  "src-tauri/tests/fixtures/card-revisions/markdown-cover-image.md",
  "utf8"
);

// 真实 GUI 保存会规范化普通 image alt；提交前必须保证 C0/C1 建立的格式化 alt
// 语料没有被验收副作用抹平，也没有把临时封面身份写回基线样本。
assert.match(acceptanceMarkdown, /!\[Emphasis \*bold\* alt\]\(\.\/assets\/cover-landscape\.png\)/);
assert.match(acceptanceMarkdown, /!\[Code `inline` alt\]\(\.\/assets\/cover-landscape\.png\)/);
assert.match(acceptanceMarkdown, /!\[Strike ~~gone~~ alt\]\(\.\/assets\/cover-landscape\.png\)/);
assert.equal(
  acceptanceMarkdown.match(/^<!-- nutbook-cover -->$/gm)?.length || 0,
  1,
  "acceptance fixture must keep only its original non-canonical marker"
);

const coverCssMatch = hostHtml.match(
  /\.milkdown-editor-root \.markdown-cover-image-block[\s\S]*?\.markdown-cover-image-block\.ProseMirror-selectednode \{\s*outline:\s*none;\s*\}/m
);
assert.ok(coverCssMatch, "cover block CSS must exist");
const badgeCssMatch = hostHtml.match(
  /\.milkdown-editor-root \.markdown-cover-image-block \.markdown-cover-media::after[\s\S]*?\s*opacity:\s*1;\s*\}/m
);
assert.ok(badgeCssMatch, "media badge CSS must exist");
// 完整提取 toolbar 样式（含 .visible 与 .tooltip 规则）：tooltip 必须 absolute
// 悬浮（不撑高 toolbar），否则测试页里 tooltip 会撑开工具栏、遮挡图片底部。
const toolbarCssMatch = hostHtml.match(
  /\.markdown-image-align-toolbar[\s\S]*?\.markdown-image-align-tooltip[\s\S]*?\}/m
);
assert.ok(toolbarCssMatch, "toolbar CSS (incl. tooltip) must exist");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  await page.setContent(`
    <style>
      #editor { width: 900px; }
      img { max-width: 100%; width: 120px; height: 70px; }
      .markdown-cover-image-block img { width: 120px !important; height: 70px !important; }
      ${coverCssMatch[0]}
      ${badgeCssMatch[0]}
      ${toolbarCssMatch[0]}
    </style>
    <div id="editor" class="milkdown-editor-root"></div>
  `);
  await page.addScriptTag({ path: "dist/i18n.js" });
  await page.addScriptTag({ content: bundle, type: "module" });
  await page.waitForFunction(() => Boolean(window.NutbookMarkdownEditor?.create));

  async function mountEditor(markdown, options = {}) {
    return page.evaluate(async ({ source, validateResult }) => {
      const root = document.getElementById("editor");
      root.innerHTML = "";
      window.__coverChanges = [];
      window.__coverEditor = await window.NutbookMarkdownEditor.create({
        root,
        markdown: source,
        language: "zh-CN",
        onValidateCoverAsset() {
          return validateResult !== false;
        },
        onCoverChange(result) {
          window.__coverChanges.push(result);
        }
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, { source: markdown, validateResult: options.validateResult ?? true });
  }

  async function getCoverState() {
    return page.evaluate(() => window.__coverEditor.getCoverState());
  }

  async function coverChanges() {
    return page.evaluate(() => JSON.stringify(window.__coverChanges));
  }

  async function hoverImageAndExpectSet(selector) {
    await page.mouse.move(0, 0);
    await page.hover(selector);
    await page.waitForFunction(() => {
      const tb = document.querySelector(".markdown-image-align-toolbar");
      const setBtn = tb?.querySelector('button[data-image-cover="set"]');
      return tb?.classList.contains("visible") && setBtn && !setBtn.hidden;
    }, null, { timeout: 2000 });
  }

  async function hoverImageAndExpectRemove(selector) {
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

  // ---------------------------------------------------------------- 1+6
  // 问题 1：非封面图片只显示「设为封面」（remove 必须真实隐藏）
  // 问题 6：设置后 getCoverState().hasCover === true 且 wrapper 出现
  await mountEditor("# Doc\n\n![Hero](./assets/hero.png)\n\n![B](./assets/b.png)\n");
  await hoverImageAndExpectSet('.ProseMirror img[alt="Hero"]');
  const stateBefore = await page.evaluate(() => {
    const tb = document.querySelector(".markdown-image-align-toolbar");
    const setBtn = tb.querySelector('button[data-image-cover="set"]');
    const removeBtn = tb.querySelector('button[data-image-cover="remove"]');
    return {
      setHidden: setBtn.hidden,
      removeHidden: removeBtn.hidden,
      setDisplay: getComputedStyle(setBtn).display,
      removeDisplay: getComputedStyle(removeBtn).display
    };
  });
  assert.equal(stateBefore.setHidden, false, "non-cover image must show 设为封面");
  assert.notEqual(stateBefore.setDisplay, "none", "set button must be visually present");
  assert.equal(stateBefore.removeHidden, true, "non-cover image must hide 取消封面");
  assert.equal(stateBefore.removeDisplay, "none", "hidden remove button must be display:none (CSS must not override [hidden])");

  await clickToolbarCoverSet();
  let state = await getCoverState();
  assert.equal(state.hasCover, true, "setting a cover must actually commit the wrapper");
  assert.equal(state.src, "./assets/hero.png", "cover src must match the target image");
  assert.equal(await coverChanges(), '[{"kind":"set","ok":true}]', "set must notify onCoverChange with ok:true");

  // 封面 hover：只显示「取消封面」。
  await hoverImageAndExpectRemove('.ProseMirror .markdown-cover-image-block img');
  const stateCover = await page.evaluate(() => {
    const tb = document.querySelector(".markdown-image-align-toolbar");
    const setBtn = tb.querySelector('button[data-image-cover="set"]');
    const removeBtn = tb.querySelector('button[data-image-cover="remove"]');
    return { setHidden: setBtn.hidden, removeHidden: removeBtn.hidden };
  });
  assert.equal(stateCover.setHidden, true, "current cover must hide 设为封面");
  assert.equal(stateCover.removeHidden, false, "current cover must show 取消封面");

  // ---------------------------------------------------------------- 2
  // 问题 2：取消封面也有反馈。
  await clickToolbarCoverRemove();
  state = await getCoverState();
  assert.equal(state.hasCover, false, "remove must clear the cover identity");
  assert.equal(await coverChanges(), '[{"kind":"set","ok":true},{"kind":"remove","ok":true}]', "remove must notify onCoverChange with ok:true");

  // ---------------------------------------------------------------- 4
  // 问题 4：取消后再设置，hover 徽标仍出现。
  await hoverImageAndExpectSet('.ProseMirror img[alt="Hero"]');
  await clickToolbarCoverSet();
  state = await getCoverState();
  assert.equal(state.hasCover, true, "re-set must work after remove");
  await page.hover('.ProseMirror .markdown-cover-image-block img', { position: { x: 60, y: 60 } });
  await page.waitForFunction(() => {
    const media = document.querySelector(".markdown-cover-image-block .markdown-cover-media");
    return media && getComputedStyle(media, "::after").opacity === "1";
  }, null, { timeout: 2000 });
  const badgeAfterReset = await page.evaluate(() => {
    const media = document.querySelector(".markdown-cover-image-block .markdown-cover-media");
    return { attr: media.getAttribute("data-cover-badge"), opacity: getComputedStyle(media, "::after").opacity };
  });
  assert.equal(badgeAfterReset.attr, "封面", "re-set cover must carry the badge marker");
  assert.equal(badgeAfterReset.opacity, "1", "re-set cover must show the badge on hover");

  // ---------------------------------------------------------------- 3
  // 问题 3：居中/右对齐时 badge 落在图片左上角（media 容器相对定位），
  // 而非 wrapper 左缘。比较 badge 伪元素盒与图片盒的左偏移。
  const alignCases = ["center", "right"];
  for (const align of alignCases) {
    // 通过编辑器 api 直接改 alignment 太绕，改用 toolbar 对齐按钮。
    // 先移开再 hover 图片底部（y=60）避开浮在图片上方的工具栏，确保触发 pointerover。
    await page.mouse.move(0, 0);
    await page.waitForTimeout(60);
    await page.hover('.ProseMirror .markdown-cover-image-block img', { position: { x: 60, y: 60 } });
    await page.waitForFunction(() => document.querySelector(".markdown-image-align-toolbar")?.classList.contains("visible"), null, { timeout: 2000 });
    await page.evaluate((value) => {
      document.querySelector(`button[data-image-align="${value}"]`)
        ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    }, align);
    await page.waitForTimeout(80);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(80);
    await page.hover('.ProseMirror .markdown-cover-image-block img', { position: { x: 60, y: 60 } });
    await page.waitForFunction(() => {
      const media = document.querySelector(".markdown-cover-image-block .markdown-cover-media");
      return media && getComputedStyle(media, "::after").opacity === "1";
    }, null, { timeout: 2000 });
    const geometry = await page.evaluate(() => {
      const img = document.querySelector(".markdown-cover-image-block img");
      const media = document.querySelector(".markdown-cover-image-block .markdown-cover-media");
      const wrap = document.querySelector(".markdown-cover-image-block");
      const imgRect = img.getBoundingClientRect();
      const mediaRect = media.getBoundingClientRect();
      const wrapRect = wrap.getBoundingClientRect();
      const after = getComputedStyle(media, "::after");
      // 伪元素不可 getBoundingClientRect；用 media 盒 + after 的 top/left 计算。
      const badgeLeft = mediaRect.left + parseFloat(after.left || "8");
      const badgeTop = mediaRect.top + parseFloat(after.top || "8");
      return {
        imgLeft: imgRect.left,
        imgRight: imgRect.right,
        imgTop: imgRect.top,
        wrapLeft: wrapRect.left,
        badgeLeft: Math.round(badgeLeft),
        badgeTop: Math.round(badgeTop),
        deltaX: Math.round(badgeLeft - imgRect.left),
        deltaY: Math.round(badgeTop - imgRect.top),
        align: wrap.getAttribute("data-nutbook-image-align") || ""
      };
    });
    // badge 必须落在图片内左上角（badge 自带 8px 内边距），而不是 wrapper 左缘。
    assert.ok(geometry.deltaX >= 0 && geometry.deltaX <= 14, `[${align}] badge must sit inside the image top-left (deltaX=${geometry.deltaX})`);
    assert.ok(geometry.deltaY >= 0 && geometry.deltaY <= 14, `[${align}] badge must sit at the image top (deltaY=${geometry.deltaY})`);
    assert.ok(geometry.badgeLeft < geometry.imgRight - 20, `[${align}] badge must not overflow the image right edge`);
    assert.ok(
      geometry.badgeLeft - geometry.wrapLeft > 20,
      `[${align}] badge must follow the image, not the wrapper left edge (badgeLeft=${geometry.badgeLeft}, wrapLeft=${geometry.wrapLeft})`
    );
    // 回到左对齐避免污染后续
    await page.hover('.ProseMirror .markdown-cover-image-block img', { position: { x: 60, y: 60 } });
    await page.waitForFunction(() => document.querySelector(".markdown-image-align-toolbar")?.classList.contains("visible"), null, { timeout: 2000 });
    await page.evaluate(() => {
      document.querySelector('button[data-image-align="left"]')
        ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(60);
  }

  // ---------------------------------------------------------------- 7
  // 设为封面后 wrapper 必须与下一 block 保持 16px 视觉间距（与 ProseMirror
  // paragraph 一致）；否则 A→B 身份转移后两张图视觉上贴在一起。
  // 单独 mount 一段含多张图的 markdown，给 Code 设封面，验证几何间距。
  await mountEditor(`# Doc\n\n<!-- nutbook-cover -->\n\n![A](./assets/a.png)\n\n![B](./assets/b.png)\n\n![C](./assets/c.png)\n`);
  // hover 第二张图（Code/B），设为封面（A→B：原 cover 转移给 B）
  await page.mouse.move(0, 0);
  await page.waitForTimeout(60);
  await page.hover('.ProseMirror img[alt="B"]', { position: { x: 40, y: 40 } });
  await page.waitForFunction(() => document.querySelector('button[data-image-cover="set"]') && !document.querySelector('button[data-image-cover="set"]').hidden, null, { timeout: 2000 });
  await clickToolbarCoverSet();
  const afterSpacing = await page.evaluate(() => {
    const cover = document.querySelector(".markdown-cover-image-block img[alt='B']")?.closest(".markdown-cover-image-block");
    if (!cover) return { gap: 0, coverBottom: 0, nextTop: 0 };
    // 紧邻下一张图（不是 H2/H1）
    const allImgs = [...document.querySelectorAll(".ProseMirror > * img")];
    const coverRect = cover.getBoundingClientRect();
    const nextImg = allImgs.find((i) => !cover.contains(i) && i.getBoundingClientRect().top > coverRect.top + 1);
    if (!nextImg) return { gap: -1, coverBottom: coverRect.bottom };
    const nextRect = nextImg.getBoundingClientRect();
    return { gap: Math.round(nextRect.top - coverRect.bottom), coverBottom: Math.round(coverRect.bottom), nextTop: Math.round(nextRect.top), nextAlt: nextImg.getAttribute("alt") };
  });
  assert.ok(afterSpacing.gap >= 12, `A→B 后 cover wrapper 与下一图间距必须 ≥ 12px（实际 ${afterSpacing.gap}px），否则视觉上两张图贴在一起`);
  assert.equal(afterSpacing.nextAlt, "C", "下一张图必须是 C");

  // ---------------------------------------------------------------- 5
  // 问题 5：`<!-- nutbook-cover -->` 不得显示在正文可见文本中。
  await mountEditor("# Doc\n\n<!-- nutbook-cover -->\n\n![Hero](./assets/hero.png)\n");
  const visibleText = await page.evaluate(() => {
    const root = document.getElementById("editor");
    // 排除编辑器自身工具元素后取可见文本
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.parentElement?.closest(".markdown-image-align-toolbar, .milkdown-toolbar, [contenteditable=false]")) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode.nodeValue.trim());
    return texts.join(" | ");
  });
  assert.ok(!visibleText.includes("<!--"), `cover marker must not be visible in the body (got: ${visibleText.slice(0, 80)})`);
  assert.ok(!visibleText.includes("nutbook-cover"), `cover marker text must not leak (got: ${visibleText.slice(0, 80)})`);
  const state5 = await getCoverState();
  assert.equal(state5.hasCover, true, "marker+image doc must parse to a cover identity");

  // 孤立 marker（后面没有独立图片块）同样不得以可见文本泄漏——它只是文档
  // 损坏的残余，Milkdown 把 html comment 渲染为真实注释，编辑正文不可见。
  await mountEditor("# Doc\n\n<!-- nutbook-cover -->\n\nSome text\n");
  const orphanText = await page.evaluate(() => {
    const root = document.getElementById("editor");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.parentElement?.closest(".markdown-image-align-toolbar, [contenteditable=false]")) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode.nodeValue.trim());
    return texts.join(" | ");
  });
  assert.ok(!orphanText.includes("<!--"), "orphan cover marker must not leak as visible text");
  assert.ok(!orphanText.includes("nutbook-cover"), "orphan cover marker text must not leak");

  // ---------------------------------------------------------------- 8
  // 问题 2 精确版：portable 封面（<p align="center"><img></p>）取消后再设置必须成功。
  // 此前 independentImageBlockAt 对顶层 atom 块用 resolve(pos) 停在 depth 0，永远
  // 识别不到 portable 块，setCoverImage 返回 false → 宿主提示「设置封面失败」。
  await mountEditor(`<!-- nutbook-cover -->\n\n<p align="center">\n  <img src="./assets/cover-landscape.png" alt="Portable centered landscape" width="480">\n</p>\n\n## 普通图片\n\n![Plain](./assets/b.png)\n`);
  let pState = await getCoverState();
  assert.equal(pState.hasCover, true, "portable cover must be recognized on load");
  assert.equal(pState.nodeKind, "portable-image", "portable cover keeps portable kind");
  await page.evaluate(() => window.__coverEditor.removeCover());
  await page.waitForTimeout(80);
  pState = await getCoverState();
  assert.equal(pState.hasCover, false, "removeCover must clear the portable cover");
  const pReset = await page.evaluate(() => {
    const blocks = window.__coverEditor.getCoverableImageBlocks();
    const t = blocks.find((b) => (b.alt || "").startsWith("Portable centered landscape"));
    if (!t) return { ok: false, reason: "no portable candidate" };
    return { ok: window.__coverEditor.setCoverImage(t.pos) };
  });
  assert.equal(pReset.ok, true, `re-setting a portable cover after remove must succeed (got ${JSON.stringify(pReset)})`);
  pState = await getCoverState();
  assert.equal(pState.hasCover, true, "portable cover must be restored after re-set");
  assert.equal(pState.nodeKind, "portable-image", "re-set portable cover keeps portable kind");

  // ---------------------------------------------------------------- 9
  // 问题 1 精确版：格式化图片设封面前后，与下一张图的底部间距必须完全一致
  // （含 inline 图片的 descender 间隙）。此前 flex 盒模型丢失该间隙，设封面后
  // 从 16px 缩到约 12px。用 120x70 小图放大 descender 效果做精确比对。
  await mountEditor("# T\n\n![A alt](./assets/a.png)\n\n![B alt](./assets/b.png)\n");
  const gapBefore = await page.evaluate(() => {
    const a = document.querySelector('.ProseMirror img[alt="A alt"]');
    const b = document.querySelector('.ProseMirror img[alt="B alt"]');
    return Math.round(b.getBoundingClientRect().top - a.getBoundingClientRect().bottom);
  });
  const setA = await page.evaluate(() => {
    const blocks = window.__coverEditor.getCoverableImageBlocks();
    const t = blocks.find((b) => (b.alt || "").startsWith("A alt"));
    return window.__coverEditor.setCoverImage(t.pos);
  });
  await page.waitForTimeout(80);
  const gapAfter = await page.evaluate(() => {
    const cover = document.querySelector(".ProseMirror .markdown-cover-image-block");
    const b = document.querySelector('.ProseMirror img[alt="B alt"]');
    return Math.round(b.getBoundingClientRect().top - cover.getBoundingClientRect().bottom);
  });
  assert.equal(setA, true, "setting cover on A must succeed");
  assert.ok(gapBefore >= 14 && gapBefore <= 18, `normal image A→B gap baseline must be ~16px (got ${gapBefore})`);
  assert.ok(gapAfter >= 14 && gapAfter <= 18, `cover must NOT shrink the gap to ~12px (got ${gapAfter})`);
  assert.ok(Math.abs(gapAfter - gapBefore) <= 1, `cover must not change the A→B gap (before=${gapBefore}, after=${gapAfter}, delta=${gapAfter - gapBefore})`);

  // ---------------------------------------------------------------- 10
  // 问题 3 精确版（真实 portable 封面）：带宽度上限的居中/右对齐 portable 封面，
  // 「封面」徽标必须落在图片左上角，而不是偏到图片左侧。
  // 此前 media 是 inline-block，shrink-to-fit 取图片自然宽（>cap），居中时把图片推
  // 离 media 左缘，徽标(::after)锚定 media 左缘 → 落在图片左侧。修复：media 套用与
  // img 相同的上限，两者等宽，徽标压在图片上。
  // 注意：本测试页全局对 cover img 强制 width:120px !important（见上文 setContent），
  // 会掩盖 cap 场景，故先还原 width:auto 让 cover 渲染器注入的 inline max-width 上限生效。
  // 用与「问题 8」相同的 portable 封面源（data URI 不会被 portable 解析器识别为
  // 封面）。本测试页对 cover img 强制 width:120px !important（见 setContent），会
  // 掩盖 cap 场景，故这里把封面图宽确定性地设为 480px（等同「带 480 上限的真实图」
  // 的渲染宽），高度给 200px 保证可 hover。徽标定位只取决于左右/上下对齐，与高度无关。
  await page.addStyleTag({ content: ".markdown-cover-image-block img { width:480px !important; height:200px !important; }" });
  await mountEditor(`<!-- nutbook-cover -->\n\n<p align="center">\n  <img src="./assets/cover-landscape.png" alt="Capped portable landscape" width="480">\n</p>\n\n## 普通图片\n\n![Plain](./assets/b.png)\n`);
  for (const align of ["center", "right"]) {
    if (align !== "center") {
      await page.mouse.move(0, 0);
      await page.waitForTimeout(40);
      await page.hover('.ProseMirror .markdown-cover-image-block img', { position: { x: 60, y: 60 } });
      await page.waitForFunction(() => document.querySelector(".markdown-image-align-toolbar")?.classList.contains("visible"), null, { timeout: 2000 });
      await page.evaluate((value) => {
        document.querySelector(`button[data-image-align="${value}"]`)
          ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      }, align);
      await page.waitForTimeout(80);
    }
    await page.mouse.move(0, 0);
    await page.waitForTimeout(40);
    await page.hover('.ProseMirror .markdown-cover-image-block img', { position: { x: 60, y: 60 } });
    await page.waitForFunction(() => {
      const media = document.querySelector(".markdown-cover-image-block .markdown-cover-media");
      return media && getComputedStyle(media, "::after").opacity === "1";
    }, null, { timeout: 2000 });
    const geo = await page.evaluate(() => {
      const img = document.querySelector(".markdown-cover-image-block img");
      const media = document.querySelector(".markdown-cover-image-block .markdown-cover-media");
      const after = getComputedStyle(media, "::after");
      const iR = img.getBoundingClientRect();
      const mR = media.getBoundingClientRect();
      return {
        mediaW: Math.round(mR.width),
        badgeLeft: Math.round(mR.left + parseFloat(after.left || "8")),
        badgeTop: Math.round(mR.top + parseFloat(after.top || "8")),
        deltaX: Math.round((mR.left + parseFloat(after.left || "8")) - iR.left),
        deltaY: Math.round((mR.top + parseFloat(after.top || "8")) - iR.top),
        align: document.querySelector(".markdown-cover-image-block").getAttribute("data-nutbook-image-align") || ""
      };
    });
    assert.equal(geo.mediaW, 480, `[${align}] media must shrink to the 480px cap (got ${geo.mediaW})`);
    assert.ok(geo.deltaX >= 0 && geo.deltaX <= 14, `[${align}] badge must sit inside image top-left, not off to the left (deltaX=${geo.deltaX})`);
    assert.ok(geo.deltaY >= 0 && geo.deltaY <= 14, `[${align}] badge must sit at image top (deltaY=${geo.deltaY})`);
  }

  // ---------------------------------------------------------------- 11
  // 问题 11：portable image 先通过 toolbar 改为居中，再设为封面，封面序列化必须
  // 保持居中，不能回退到 rawSource 里的原始右对齐。
  // 此前 cover 序列化优先使用 rawSource，且 coverAttrsFromPortable / createCoverNode
  // 把 presentationDirty 强制重置为 false，导致 toolbar 改过的对齐在保存后丢失。
  await mountEditor(`# Portable cover image\n\n<!-- nutbook-cover -->\n\n<p align="center">\n  <img src="./assets/cover-landscape.png" alt="First portable cover" width="480">\n</p>\n\n## 带链接的 portable image\n\n<p align="right">\n  <a href="https://example.invalid/album" title="Open album">\n    <img src="./assets/cover-landscape.png" alt="Linked portable landscape" width="320">\n  </a>\n</p>\n`);
  // 把第二张 portable 图通过 toolbar 改为居中
  await page.evaluate(() => {
    const portable = document.querySelector('[data-type="portable-image"]');
    const img = portable?.querySelector("img");
    if (img) {
      img.scrollIntoView({ block: "center" });
      const rect = img.getBoundingClientRect();
      img.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
      img.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse", clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }));
    }
  });
  await page.waitForFunction(() => {
    const tb = document.querySelector(".markdown-image-align-toolbar");
    return tb?.classList.contains("visible") && tb.querySelector('button[data-image-align="center"]');
  }, null, { timeout: 2000 });
  await page.evaluate(() => {
    document.querySelector('button[data-image-align="center"]')
      ?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerType: "mouse" }));
  });
  await page.waitForTimeout(150);
  let mdAfterToolbarCenter = await page.evaluate(() => window.__coverEditor.getMarkdown());
  assert.ok(/## 带链接的 portable image[\s\S]*?<p align="center">/.test(mdAfterToolbarCenter), `toolbar center click must update portable alignment to center\n${mdAfterToolbarCenter}`);
  // 通过 toolbar 把该图设为封面
  await page.mouse.move(0, 0);
  await page.waitForTimeout(40);
  await page.hover('[data-type="portable-image"] img');
  await page.waitForFunction(() => {
    const tb = document.querySelector(".markdown-image-align-toolbar");
    return tb?.classList.contains("visible") && tb.querySelector('button[data-image-cover="set"]') && !tb.querySelector('button[data-image-cover="set"]').hidden;
  }, null, { timeout: 2000 });
  await clickToolbarCoverSet();
  let p11State = await getCoverState();
  assert.equal(p11State.hasCover, true, "problem 11: setting cover after toolbar center must succeed");
  let mdAfterCover = await page.evaluate(() => window.__coverEditor.getMarkdown());
  assert.ok(/<!-- nutbook-cover -->[\s\S]*?<p align="center">[\s\S]*?<a href="https:\/\/example\.invalid\/album"/.test(mdAfterCover), `problem 11: cover serialization must keep center alignment, not revert to rawSource right: ${mdAfterCover}`);

  // ---------------------------------------------------------------- 12
  // 用户验收遗留：格式化 alt 的三张图片通过工具栏设为/取消封面时，页面曾发生
  // 一次重定向滚动。封面身份 transaction 必须保留原 selection/viewport，不发送
  // scrollIntoView intent。将目标放在 viewport 底部能稳定暴露旧实现的跳动。
  await page.setViewportSize({ width: 1280, height: 420 });
  const spacer = Array.from({ length: 18 }, (_, index) => `段落 ${index + 1}：用于构造真实长文滚动面。`).join("\n\n");
  await mountEditor(`# Scroll stability\n\n${spacer}\n\n![Emphasis *bold* alt](./assets/a.png)\n\n${spacer}\n\n![Code \`inline\` alt](./assets/b.png)\n\n${spacer}\n\n![Strike ~~gone~~ alt](./assets/c.png)\n\n${spacer}\n`);
  for (const alt of ["Emphasis bold alt", "Code inline alt", "Strike gone alt"]) {
    const selector = `.ProseMirror img[alt="${alt}"]`;
    await page.evaluate((imageAlt) => {
      const image = document.querySelector(`.ProseMirror img[alt="${imageAlt}"]`);
      const targetTop = image.getBoundingClientRect().top + window.scrollY - (window.innerHeight - 86);
      window.scrollTo(0, Math.max(0, targetTop));
    }, alt);
    // 先把目标放到 viewport 底部，再 hover 并点击。若在 hover 后二次滚动，真实
    // pointer 会离开图片、工具栏可能正常关闭，测试会把用户输入缺失误判成实现失败。
    await hoverImageAndExpectSet(selector);
    const beforeSetScroll = await page.evaluate(() => Math.round(window.scrollY));
    await clickToolbarCoverSet();
    await page.waitForFunction((imageAlt) => Boolean(
      document.querySelector(`.ProseMirror .markdown-cover-image-block img[alt="${imageAlt}"]`)
    ), alt, { timeout: 2000 });
    const afterSetScroll = await page.evaluate(() => Math.round(window.scrollY));
    assert.ok(
      Math.abs(afterSetScroll - beforeSetScroll) <= 1,
      `${alt}: setting cover must not scroll the page (before=${beforeSetScroll}, after=${afterSetScroll})`
    );

    await hoverImageAndExpectRemove(`.ProseMirror .markdown-cover-image-block img[alt="${alt}"]`);
    const beforeRemoveScroll = await page.evaluate(() => Math.round(window.scrollY));
    await clickToolbarCoverRemove();
    await page.waitForFunction((imageAlt) => (
      Boolean(document.querySelector(`.ProseMirror img[alt="${imageAlt}"]`))
      && !document.querySelector(`.ProseMirror .markdown-cover-image-block img[alt="${imageAlt}"]`)
    ), alt, { timeout: 2000 });
    const afterRemoveScroll = await page.evaluate(() => Math.round(window.scrollY));
    assert.ok(
      Math.abs(afterRemoveScroll - beforeRemoveScroll) <= 1,
      `${alt}: removing cover must not scroll the page (before=${beforeRemoveScroll}, after=${afterRemoveScroll})`
    );
  }

  assert.equal(pageErrors.length, 0, "page must be error free: " + pageErrors.join("; "));
  console.log("markdown cover GUI issues: OK");
} finally {
  await browser.close();
}
