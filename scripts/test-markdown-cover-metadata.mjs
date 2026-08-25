// PR C / Task C1 回归测试：canonical `<!-- nutbook-cover -->` 元数据与无损往返。
//
// 真实挂载 dist/assets/markdown-editor.js（Playwright + Chromium），验证：
// - 普通 / linked / portable / remote 四类独立图片块的封面 wrapper 识别
// - 非顶层 / 非独立图片（inline、跨 heading）拒绝；stray marker 不跨正文
// - duplicate marker 阻断 Milkdown，交由宿主 source fallback 修复
// - missing 资源仍保留封面身份（语法层）；越界/missing 的磁盘级诊断由
//   Rust `markdown_cover` 模块以真实文件系统验证
// - raw source 往返：转义 alt、空格路径、单/双引号 title、portable 缩进、
//   http/https URL、CRLF；canonical → ProseMirror → serialize → ProseMirror 幂等
// - A→B 身份转移：一次 dispatch / 一个 history step / 单次 undo / redo
// - selection、baseline、composition 拒绝、无图片删除回调
// - marker 不影响标题解析；C1 阶段卡片仍使用 markdown-default-cover（Rust 侧）

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const bundle = readFileSync("dist/assets/markdown-editor.js", "utf8");
const fixtureDir = "src-tauri/tests/fixtures/card-revisions";
const fixture = (name) => readFileSync(`${fixtureDir}/${name}`, "utf8");

// P1-3 复现环境：计算样式断言必须命中 dist/index.html 里真实存在的 CSS 规则，
// 不能只测 class 存在。提取 `.markdown-cover-image-block` 规则块注入测试页。
const hostHtml = readFileSync("dist/index.html", "utf8");
const coverCssMatch = hostHtml.match(
  /\.milkdown-editor-root \.markdown-cover-image-block[\s\S]*?\.markdown-cover-image-block\.ProseMirror-selectednode \{\s*outline:\s*none;\s*\}/m
);
assert.ok(coverCssMatch, "dist/index.html must contain the .markdown-cover-image-block CSS rules");
const coverCss = coverCssMatch[0];

const PLAIN = fixture("markdown-cover-plain.md");
const LINKED = fixture("markdown-cover-linked.md");
const PORTABLE = fixture("markdown-portable-cover.md");
const REMOTE = fixture("markdown-remote-cover.md");
const DUPLICATE = fixture("markdown-duplicate-cover.md");
const MISSING = fixture("markdown-missing-cover.md");
const MATRIX = fixture("markdown-cover-image.md");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.setContent(`
    <style>
      #editor { width: 900px; }
      img { max-width: 100%; }
      ${coverCss}
    </style>
    <div id="editor" class="milkdown-editor-root"></div>
  `);
  await page.addScriptTag({ content: bundle, type: "module" });
  await page.waitForFunction(() => Boolean(window.NutbookMarkdownEditor?.create));

  async function mountEditor(markdown, options = {}) {
    return page.evaluate(async ({ markdown: source, removedSources }) => {
      const root = document.getElementById("editor");
      window.__removedSources = [];
      window.__coverEditor = await window.NutbookMarkdownEditor.create({
        root,
        markdown: source,
        onRemoveImageAsset(src) {
          window.__removedSources.push(String(src));
        }
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return window.__removedSources.length ? window.__removedSources : [];
    }, { markdown, removedSources: options.removedSources || [] });
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

  async function getDocumentTitle() {
    return page.evaluate(() => window.__coverEditor.getDocumentTitle());
  }

  async function findImageBlockPos(alt) {
    const blocks = await page.evaluate(() => window.__coverEditor.getCoverableImageBlocks());
    return blocks.find((block) => block.alt === alt)?.pos ?? null;
  }

  // ---------------------------------------------------------------- plain
  await mountEditor(PLAIN);
  let state = await getCoverState();
  assert.equal(state.hasCover, true, "plain canonical cover must be recognized");
  assert.equal(state.valid, true, "plain cover must be valid");
  assert.equal(state.duplicate, false, "plain cover must not be duplicate");
  assert.equal(state.nodeKind, "image", "plain cover keeps the image node kind");
  assert.equal(state.src, "./assets/cover-landscape.png", "plain cover src preserved");
  let markdown = await getMarkdown();
  assert.match(markdown, /<!-- nutbook-cover -->\n!\[Plain landscape\]\(\.\/assets\/cover-landscape\.png\)/, "serializer emits marker immediately followed by the original image syntax");
  assert.match(markdown, /# Plain cover image/, "untouched body is preserved");
  assert.doesNotMatch(markdown, /nutbook-cover-image-block/, "cover identity must not leak into the saved markdown as UI markup");
  assert.equal(await getDocumentTitle(), "Plain cover image", "marker must not disturb the H1 title");
  const baseline = await getBaseline();
  assert.match(baseline, /<!-- nutbook-cover -->\n!\[Plain landscape\]/, "baseline reflects the canonical cover");

  // plain round trip: serialize → reparse → same identity and body
  await mountEditor(await getMarkdown());
  state = await getCoverState();
  assert.equal(state.hasCover, true, "plain round trip keeps the cover");
  assert.equal(state.src, "./assets/cover-landscape.png");
  assert.match(await getMarkdown(), /# Plain cover image/, "round trip preserves untouched body");

  // 前后端 alt 语义语料：这些都是合法的独立 Markdown image，编辑器必须识别
  // 封面并原样回放图片源码；Rust `markdown_cover` 用同一组语义断言结构化 alt。
  const nestedAltCases = [
    "![a [link](https://example.invalid) c](./assets/cover-landscape.png)",
    "![a <b>x</b> c](./assets/cover-landscape.png)",
    "![a ![nested](./assets/nested.png) c](./assets/cover-landscape.png)",
    "![a\nb c](./assets/cover-landscape.png)",
    "![a  \nb c](./assets/cover-landscape.png)"
  ];
  for (const imageSource of nestedAltCases) {
    await mountEditor(`<!-- nutbook-cover -->\n\n${imageSource}\n`);
    state = await getCoverState();
    assert.equal(state.hasCover, true, `valid nested alt must keep cover identity: ${JSON.stringify(imageSource)}`);
    assert.equal(state.src, "./assets/cover-landscape.png");
    markdown = await getMarkdown();
    assert.ok(
      markdown.includes(`<!-- nutbook-cover -->\n${imageSource}`),
      `nested alt raw source must round trip unchanged: ${JSON.stringify(markdown)}`
    );
  }

  // ---------------------------------------------------------------- linked
  await mountEditor(LINKED);
  state = await getCoverState();
  assert.equal(state.hasCover, true, "linked cover must be recognized");
  assert.equal(state.nodeKind, "linked-image", "linked cover keeps the linked-image kind");
  assert.equal(state.src, "./assets/cover-landscape.png");
  markdown = await getMarkdown();
  assert.match(markdown, /<!-- nutbook-cover -->\n\[!\[Linked landscape\]\(\.\/assets\/cover-landscape\.png\)\]\(https:\/\/example\.invalid\/album "Open album"\)/, "linked cover round trips href and title verbatim");
  assert.equal(await getDocumentTitle(), "Linked cover image");

  // linked cover removeCover：不得抛错，图片原地保留且链接不丢。
  const linkedRemoved = await page.evaluate(() => window.__coverEditor.removeCover());
  assert.equal(linkedRemoved, true, "linked cover removeCover must dispatch");
  state = await getCoverState();
  assert.equal(state.hasCover, false, "linked cover identity removed");
  markdown = await getMarkdown();
  assert.doesNotMatch(markdown, /<!-- nutbook-cover -->/, "marker removed from linked cover");
  assert.match(markdown, /\[!\[Linked landscape\]\(\.\/assets\/cover-landscape\.png\)\]\(https:\/\/example\.invalid\/album "Open album"\)/, "linked image keeps its href and title after removeCover");
  await page.evaluate(() => window.__coverEditor.undo());
  state = await getCoverState();
  assert.equal(state.hasCover, true, "one undo restores the linked cover");

  // 普通 linked image（无 marker）设为封面：外层链接必须保留。
  await mountEditor("before text\n\n[![Linked B](./assets/b.png)](https://example.invalid/album \"Open album\")\n");
  let linkedBlocks = await page.evaluate(() => window.__coverEditor.getCoverableImageBlocks());
  const linkedB = linkedBlocks.find((block) => block.alt === "Linked B");
  assert.ok(linkedB, "plain linked image must be a coverable candidate");
  assert.equal(linkedB.nodeKind, "linked-image", "candidate must be classified as linked-image");
  const linkedWrapped = await page.evaluate((pos) => window.__coverEditor.setCoverImage(pos), linkedB.pos);
  assert.equal(linkedWrapped, true, "wrapping a plain linked image must dispatch");
  state = await getCoverState();
  assert.equal(state.hasCover, true);
  assert.equal(state.nodeKind, "linked-image", "wrapped linked image keeps linked-image kind");
  assert.equal(state.src, "./assets/b.png");
  markdown = await getMarkdown();
  assert.match(markdown, /<!-- nutbook-cover -->\n\[!\[Linked B\]\(\.\/assets\/b\.png\)\]\(https:\/\/example\.invalid\/album "Open album"\)/, "the outer link must survive wrapping as cover");
  await page.evaluate(() => window.__coverEditor.undo());
  markdown = await getMarkdown();
  assert.match(markdown, /\[!\[Linked B\]\(\.\/assets\/b\.png\)\]\(https:\/\/example\.invalid\/album "Open album"\)/, "undo restores the plain linked image with its link");

  // ---------------------------------------------------------------- portable
  await mountEditor(PORTABLE);
  state = await getCoverState();
  assert.equal(state.hasCover, true, "portable cover must be recognized");
  assert.equal(state.nodeKind, "portable-image", "portable cover keeps the portable kind");
  markdown = await getMarkdown();
  assert.match(
    markdown,
    /<!-- nutbook-cover -->\n<p align="center">\n  <img src="\.\/assets\/cover-landscape\.png" alt="Portable centered landscape" width="480">\n<\/p>/,
    "portable raw source (indentation, attributes) must be replayed verbatim"
  );
  // portable round trip stability
  await mountEditor(markdown);
  state = await getCoverState();
  assert.equal(state.hasCover, true, "portable round trip keeps the cover");
  assert.match(await getMarkdown(), /<p align="center">\n  <img src="\.\/assets\/cover-landscape\.png" alt="Portable centered landscape" width="480">\n<\/p>/, "portable round trip is stable");
  assert.equal(await getDocumentTitle(), "Portable cover image");

  // portable 封面打开文档时排版不得变化：wrapper DOM 必须继承 alignment 与
  // displayWidthPx 的 class / style（居中、480px 上限）。封面 wrapper 居中机制为
  // block + text-align:center + inline-block media——不再用 flex + justify-content，
  // 以保留 inline 图片底部的 descender 间隙，使设封面前后与下文间距一致（PR C/C1 修复）。
  const portableDom = await page.evaluate(() => {
    const wrapper = document.querySelector('div[data-type="markdown-cover-image"]');
    const img = wrapper?.querySelector("img");
    const media = wrapper?.querySelector(".markdown-cover-media");
    const style = wrapper ? getComputedStyle(wrapper) : null;
    const mediaStyle = media ? getComputedStyle(media) : null;
    const wRect = wrapper?.getBoundingClientRect();
    const iRect = img?.getBoundingClientRect();
    const wrapperCenter = wRect ? wRect.left + wRect.width / 2 : 0;
    const imgCenter = iRect ? iRect.left + iRect.width / 2 : 0;
    return {
      wrapperClass: wrapper?.className || "",
      dataAlign: wrapper?.dataset?.nutbookImageAlign || "",
      dataWidth: wrapper?.dataset?.nutbookDisplayWidth || "",
      imgStyle: img?.getAttribute("style") || "",
      computedDisplay: style?.display || "",
      computedTextAlign: style?.textAlign || "",
      mediaDisplay: mediaStyle?.display || "",
      centerDelta: wRect && iRect ? Math.round(Math.abs(imgCenter - wrapperCenter)) : -1
    };
  });
  assert.match(portableDom.wrapperClass, /nutbook-image-align-center/, `portable cover must keep center alignment class: ${portableDom.wrapperClass}`);
  assert.equal(portableDom.dataAlign, "center", "wrapper data alignment must be center");
  assert.equal(portableDom.dataWidth, "480", "wrapper display width must stay 480");
  assert.match(portableDom.imgStyle, /max-width:\s*min\(480px, 100%\)/, `img must keep the 480px width cap: ${portableDom.imgStyle}`);
  // 居中机制改为 block + text-align:center + inline-block media（保留 descender 间隙）。
  assert.equal(portableDom.computedDisplay, "block", `cover wrapper must be block (descender gap preserved): ${portableDom.computedDisplay}`);
  assert.equal(portableDom.computedTextAlign, "center", `portable cover must center via text-align (CSS must hit dist rules): ${portableDom.computedTextAlign}`);
  assert.equal(portableDom.mediaDisplay, "inline-block", `media must be inline-block so text-align centers it: ${portableDom.mediaDisplay}`);
  assert.ok(portableDom.centerDelta <= 2, `portable cover image must be visually centered (centerDelta=${portableDom.centerDelta}px)`);

  // ---------------------------------------------------------------- remote
  await mountEditor(REMOTE);
  state = await getCoverState();
  assert.equal(state.hasCover, true, "remote cover must be recognized");
  assert.equal(state.nodeKind, "image");
  assert.equal(state.src, "https://example.invalid/covers/landscape-16x9.png", "remote URL preserved");
  markdown = await getMarkdown();
  assert.match(markdown, /<!-- nutbook-cover -->\n!\[Remote landscape\]\(https:\/\/example\.invalid\/covers\/landscape-16x9\.png\)/, "remote URL must not be rewritten");
  assert.equal(await getDocumentTitle(), "Remote cover image");

  // ------------------------------------------------- negative: stray marker
  // markdown-cover-image.md: marker 后隔 heading → 不构成封面（不跨正文寻图）
  await mountEditor(MATRIX);
  state = await getCoverState();
  assert.equal(state.hasCover, false, "marker must not bind an image across a heading");
  assert.equal(state.duplicate, false);
  markdown = await getMarkdown();
  assert.match(markdown, /<!-- nutbook-cover -->/, "stray marker text is preserved as plain content");
  assert.match(markdown, /## 普通独立图片块/, "matrix fixture body is untouched");

  // negative: inline image inside a paragraph is not a cover
  await mountEditor("<!-- nutbook-cover -->\n\nText ![inline](./assets/cover-landscape.png) more\n");
  state = await getCoverState();
  assert.equal(state.hasCover, false, "inline mixed image must be rejected");
  markdown = await getMarkdown();
  assert.match(markdown, /Text !\[inline\]\(\.\/assets\/cover-landscape\.png\) more/, "inline image line is preserved");

  // negative: marker followed by a paragraph, image later → not a cover
  await mountEditor("<!-- nutbook-cover -->\n\nsome body text\n\n![Later](./assets/cover-landscape.png)\n");
  state = await getCoverState();
  assert.equal(state.hasCover, false, "marker must not cross a paragraph to find an image");

  // ---------------------------------------------------------------- duplicate
  // duplicate 是阻断式文档诊断：createMilkdownEditor 必须拒绝挂载 Milkdown 并
  // 抛错，宿主现有 catch 进入源码 fallback 人工修复（用户能看到 marker 文本）。
  const dupError = await page.evaluate(async (markdown) => {
    const root = document.getElementById("editor");
    try {
      await window.NutbookMarkdownEditor.create({ root, markdown });
      return null;
    } catch (error) {
      return String(error?.message || error);
    }
  }, DUPLICATE);
  assert.ok(dupError && /nutbook-cover/.test(dupError), `duplicate must reject Milkdown mounting: ${dupError}`);
  const dupDom = await page.evaluate(() => ({
    hasMilkdown: Boolean(document.querySelector("#editor .milkdown-editor-body")),
    hasWrapper: Boolean(document.querySelector('div[data-type="markdown-cover-image"]'))
  }));
  assert.equal(dupDom.hasMilkdown, false, "duplicate must not mount Milkdown");
  assert.equal(dupDom.hasWrapper, false, "duplicate must not create a wrapper node");

  // P1-2：portable duplicate 同样必须阻断挂载——preflight 必须复用 portable
  // HTML → portableImage 的同一转换，裸 fromMarkdown 看不到 html 节点被识别。
  const portableDupRaw = [
    "<!-- nutbook-cover -->",
    "",
    '<p align="center">',
    '  <img src="./assets/cover-landscape.png" alt="Portable one" width="480">',
    "</p>",
    "",
    "<!-- nutbook-cover -->",
    "",
    '<p align="center">',
    '  <img src="./assets/cover-portrait.jpg" alt="Portable two" width="480">',
    "</p>"
  ].join("\n");
  const portableDupError = await page.evaluate(async (markdown) => {
    const root = document.getElementById("editor");
    try {
      await window.NutbookMarkdownEditor.create({ root, markdown });
      return null;
    } catch (error) {
      return String(error?.message || error);
    }
  }, portableDupRaw);
  assert.ok(portableDupError && /nutbook-cover/.test(portableDupError), `two portable covers must reject Milkdown mounting: ${portableDupError}`);
  const portableDupDom = await page.evaluate(() => ({
    hasMilkdown: Boolean(document.querySelector("#editor .milkdown-editor-body")),
    hasWrapper: Boolean(document.querySelector('div[data-type="markdown-cover-image"]'))
  }));
  assert.equal(portableDupDom.hasMilkdown, false, "portable duplicate must not mount Milkdown");
  assert.equal(portableDupDom.hasWrapper, false, "portable duplicate must not create a wrapper");

  // ---------------------------------------------------------------- missing
  // 语法层：missing 资源仍保留 wrapper / 封面身份；磁盘级 MissingResource 诊断
  // 由 Rust 模块用真实文件系统验证（本脚本不伪造 fs）。
  await mountEditor(MISSING);
  state = await getCoverState();
  assert.equal(state.hasCover, true, "missing resource must keep the cover identity (no silent demotion)");
  assert.equal(state.src, "./assets/does-not-exist.png");
  markdown = await getMarkdown();
  assert.match(markdown, /<!-- nutbook-cover -->\n!\[Missing asset\]\(\.\/assets\/does-not-exist\.png\)/, "missing cover keeps marker and image syntax");
  assert.equal(await getDocumentTitle(), "Missing cover image");

  // ------------------------------------------------- raw source edge cases
  // CommonMark 空格路径必须用尖括号包裹；转义 alt 与双引号 title 原样保留。
  const escapedRaw = "<!-- nutbook-cover -->\n\n![alt with \\[bracket\\]](<./assets/my cover.png> \"double title\")\n\n![single](./assets/single.png 'single title')\n";
  await mountEditor(escapedRaw);
  state = await getCoverState();
  assert.equal(state.hasCover, true, "escaped-alt cover must parse");
  assert.equal(state.src, "./assets/my cover.png", "spaced path preserved");
  markdown = await getMarkdown();
  assert.match(markdown, /!\[alt with \\\[bracket\\\]\]\(<\.\/assets\/my cover\.png> "double title"\)/, "escaped alt and double-quoted title are replayed verbatim");
  // Milkdown 全文序列化会把普通正文的单引号 title 规范化为双引号（既有基线行为，
  // 不是封面身份引入的重写）；title 文本必须保留。
  assert.match(markdown, /!\[single\]\(\.\/assets\/single\.png "single title"\)/, "single-quoted title text is preserved (quote style normalized by Milkdown)");

  // 封面生命周期（removeCover → undo）不得改写 marker 之外的正文：
  // remove 前与 undo 后的序列化结果必须完全一致。
  const beforeLifecycle = await getMarkdown();
  await page.evaluate(() => window.__coverEditor.removeCover());
  await page.evaluate(() => window.__coverEditor.undo());
  const afterLifecycle = await getMarkdown();
  assert.equal(afterLifecycle, beforeLifecycle, "cover lifecycle must leave untouched body byte-identical");

  // P1-1：已有图片设为封面（rawSource 为空 → 结构化重建）必须正确编码 destination。
  // 空格路径必须用尖括号包裹，序列化产物重新解析后仍构成同一封面身份。
  const spacedRaw = "before\n\n![Spaced](<./assets/my cover.png> \"title\")\n";
  await mountEditor(spacedRaw);
  const spacedPos = await findImageBlockPos("Spaced");
  assert.ok(spacedPos != null, "spaced-path image must be a coverable candidate");
  const spacedWrapped = await page.evaluate((pos) => window.__coverEditor.setCoverImage(pos), spacedPos);
  assert.equal(spacedWrapped, true, "wrapping a spaced-path image must dispatch");
  state = await getCoverState();
  assert.equal(state.hasCover, true, "cover identity established on the spaced-path image");
  assert.equal(state.src, "./assets/my cover.png", "spaced src preserved");
  markdown = await getMarkdown();
  assert.match(
    markdown,
    /<!-- nutbook-cover -->\n!\[Spaced\]\(<\.\/assets\/my cover\.png> "title"\)/,
    `fallback serializer must wrap spaced destination in angle brackets: ${markdown}`
  );
  // 重解析 round trip：序列化产物必须重新构成同一封面身份（不能 hasCover=false）。
  await mountEditor(markdown);
  state = await getCoverState();
  assert.equal(state.hasCover, true, "serialized spaced-path cover must reparse to a valid cover");
  assert.equal(state.src, "./assets/my cover.png", "round trip keeps spaced src");
  assert.equal(state.duplicate, false, "reparse of spaced cover must not be duplicate");

  // CRLF round trip: parse → serialize → reparse is stable and marker stays adjacent
  const crlfRaw = "# CRLF cover\r\n\r\n<!-- nutbook-cover -->\r\n\r\n![CRLF cover](./assets/cover-landscape.png)\r\n\r\nbody\r\n";
  await mountEditor(crlfRaw);
  state = await getCoverState();
  assert.equal(state.hasCover, true, "CRLF cover must parse");
  assert.equal(state.src, "./assets/cover-landscape.png");
  const crlfSerialized = await getMarkdown();
  assert.match(crlfSerialized, /<!-- nutbook-cover -->\n!\[CRLF cover\]\(\.\/assets\/cover-landscape\.png\)/, "marker stays adjacent to the image after CRLF round trip");
  await mountEditor(crlfSerialized);
  state = await getCoverState();
  assert.equal(state.hasCover, true, "CRLF round trip keeps the cover");
  assert.equal(state.src, "./assets/cover-landscape.png");

  // ------------------------------------------------- A→B identity transfer
  const abRaw = "<!-- nutbook-cover -->\n\n![A](./assets/a.png)\n\nsome text\n\n![B](./assets/b.png)\n";
  await mountEditor(abRaw);
  state = await getCoverState();
  assert.equal(state.hasCover, true, "A must start as the cover");
  assert.equal(state.src, "./assets/a.png");

  const bPos = await findImageBlockPos("B");
  assert.ok(bPos != null, "B image block must be a coverable candidate");
  const transferred = await page.evaluate((pos) => window.__coverEditor.setCoverImage(pos), bPos);
  assert.equal(transferred, true, "A→B transfer must dispatch");
  state = await getCoverState();
  assert.equal(state.hasCover, true);
  assert.equal(state.src, "./assets/b.png", "cover identity must move to B in a single dispatch");
  markdown = await getMarkdown();
  assert.match(markdown, /<!-- nutbook-cover -->\n!\[B\]\(\.\/assets\/b\.png\)/, "marker now precedes B");
  assert.match(markdown, /!\[A\]\(\.\/assets\/a\.png\)/, "A stays in the body as a plain image at its original position");
  assert.match(markdown, /some text/, "body between A and B is preserved");

  // baseline must be unchanged by the identity transaction
  const baselineAfterTransfer = await getBaseline();
  assert.match(baselineAfterTransfer, /<!-- nutbook-cover -->\n!\[A\]\(\.\/assets\/a\.png\)/, "baseline is not reset by the transfer");

  // single undo restores the full previous state
  await page.evaluate(() => window.__coverEditor.undo());
  state = await getCoverState();
  assert.equal(state.src, "./assets/a.png", "one undo restores A as the cover");
  markdown = await getMarkdown();
  assert.match(markdown, /<!-- nutbook-cover -->\n!\[A\]\(\.\/assets\/a\.png\)/, "one undo restores the marker before A");
  assert.match(markdown, /!\[B\]\(\.\/assets\/b\.png\)/, "B is a plain image again");

  // single redo reapplies the transfer
  await page.evaluate(() => window.__coverEditor.redo());
  state = await getCoverState();
  assert.equal(state.src, "./assets/b.png", "one redo moves the cover back to B");

  // A and B attributes are untouched across transfer + undo + redo
  markdown = await getMarkdown();
  assert.match(markdown, /!\[A\]\(\.\/assets\/a\.png\)/, "A alt/src unchanged");
  assert.match(markdown, /!\[B\]\(\.\/assets\/b\.png\)/, "B alt/src unchanged");

  // no image deletion callback during the whole identity lifecycle
  await new Promise((resolve) => setTimeout(resolve, 450));
  const removed = await page.evaluate(() => window.__removedSources || []);
  assert.deepEqual(removed, [], `identity transfer must not trigger image removal callbacks: ${removed.join(", ")}`);

  // selection stays usable after cover operations (document structure intact)
  const selectionAfterTransfer = await page.evaluate(() => window.__coverEditor.focusAtText("some text"));
  assert.equal(selectionAfterTransfer, true, "selection stays usable after cover operations");

  // ------------------------------------------------- composition guard
  await mountEditor(abRaw);
  const composingBlocked = await page.evaluate(() => {
    const proseMirror = document.querySelector("#editor .ProseMirror");
    proseMirror.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "中" }));
    const wrap = window.__coverEditor.setCoverImage(0);
    const remove = window.__coverEditor.removeCover();
    proseMirror.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "中" }));
    return { wrap, remove };
  });
  assert.equal(composingBlocked.wrap, false, "setCoverImage must be rejected during composition");
  assert.equal(composingBlocked.remove, false, "removeCover must be rejected during composition");

  // ------------------------------------------------- removeCover
  await mountEditor(PLAIN);
  state = await getCoverState();
  assert.equal(state.hasCover, true);
  const removedCover = await page.evaluate(() => window.__coverEditor.removeCover());
  assert.equal(removedCover, true, "removeCover must dispatch");
  state = await getCoverState();
  assert.equal(state.hasCover, false, "cover identity removed");
  markdown = await getMarkdown();
  assert.doesNotMatch(markdown, /<!-- nutbook-cover -->/, "marker removed by removeCover");
  assert.match(markdown, /!\[Plain landscape\]\(\.\/assets\/cover-landscape\.png\)/, "image stays in place after removing the cover");

  // single undo restores the cover
  await page.evaluate(() => window.__coverEditor.undo());
  state = await getCoverState();
  assert.equal(state.hasCover, true, "one undo restores the removed cover");
  markdown = await getMarkdown();
  assert.match(markdown, /<!-- nutbook-cover -->\n!\[Plain landscape\]/, "marker restored by undo");
  assert.equal(await getDocumentTitle(), "Plain cover image", "title unaffected by cover lifecycle");
} finally {
  await page.evaluate(() => window.__coverEditor?.destroy?.()).catch(() => {});
  await browser.close();
}

console.log("Markdown cover metadata regression passed.");
