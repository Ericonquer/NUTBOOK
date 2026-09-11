// 禁用态主操作的解释性 tooltip 必须在真实浏览器里能被看到。
//
// 背景（两次 CSS-only 修复都失败后的决定）：disabled 按钮不参与命中测试，
// 部分引擎连祖先 :hover 都不点亮 → 纯 CSS 方案不可靠。实现改为「document 级
// mousemove + 按坐标判定 + 强制类」。这个测试因此不在源码里自洽，而是把 dist 里
// **真实的 CSS 规则与真实的函数**抽出来喂给真实浏览器，用真实鼠标移动量取
// computed opacity：移到按钮上必须 1，移开必须 0。
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { chromium } from "playwright";

const indexPath = new URL("../dist/index.html", import.meta.url);
const indexHtml = await readFile(indexPath, "utf8");

function extractBlock(source, startIndex) {
  let depth = 0;
  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(startIndex, index + 1);
    }
  }
  throw new Error("unterminated block");
}

function functionSource(name) {
  const anchor = indexHtml.indexOf(`function ${name}(`);
  assert.notEqual(anchor, -1, `缺少函数 ${name}`);
  // 从函数关键字开始切片（保留函数头），与 test-external-open-entry-bridge.mjs
  // 的 extractFunctionSource 同口径——只取 `{...}` 会把顶层 return 变成非法语句。
  const signatureEnd = indexHtml.indexOf(") {", anchor);
  assert.notEqual(signatureEnd, -1, `函数签名不完整: ${name}`);
  const brace = signatureEnd + 2;
  let depth = 0;
  for (let index = brace; index < indexHtml.length; index += 1) {
    const char = indexHtml[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return indexHtml.slice(anchor, index + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

// --- 真实 CSS：直接抽 dist 的规则，避免测试自己重抄一份失真 ---
function cssRule(selector) {
  const anchor = indexHtml.indexOf(selector);
  assert.notEqual(anchor, -1, `缺少 CSS 规则 ${selector}`);
  // 锚点位于规则选择器行的行首：从锚点切片到块尾，保留完整规则原文。
  // 不能只拼「传入的选择器 + 声明块」——分组选择器（`.a,\n.b {…}`）会被截成
  // `.a, {…}`，尾逗号非法、整条规则被浏览器丢弃，harness 随之失真。
  const brace = indexHtml.indexOf("{", anchor);
  let depth = 0;
  for (let index = brace; index < indexHtml.length; index += 1) {
    const char = indexHtml[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return indexHtml.slice(anchor, index + 1);
    }
  }
  throw new Error(`CSS 规则未闭合: ${selector}`);
}

const css = [
  cssRule(".document-action-button {"),
  cssRule(".document-action-tooltip,"),
  cssRule(".document-action-button:hover .document-action-tooltip,"),
  cssRule(".document-action-button:disabled {"),
  cssRule(".document-action-button.primary-action:disabled {"),
  cssRule(".document-action-wrap {"),
  cssRule(".document-action-wrap:hover .tooltip-explain .document-action-tooltip {"),
  cssRule(".document-action-button.tooltip-forced .document-action-tooltip {"),
  cssRule(".document-action-button.primary-action:disabled .document-action-tooltip {")
].join("\n");

// --- 真实 toolbar 标记：抽 dist 里 .toolbar-actions 那一段，不改结构 ---
const actionsAnchor = indexHtml.indexOf('<div class="toolbar-actions">');
assert.notEqual(actionsAnchor, -1, "缺少 toolbar-actions 标记");
const actionsMarkup = indexHtml.slice(actionsAnchor, indexHtml.indexOf("</div>\n", actionsAnchor));

const helperSource = functionSource("pointerWithinPrimaryButtonRect");
const controllerSource = functionSource("syncDisabledPrimaryTooltip");

const page = `
<!doctype html><html><head><meta charset="utf-8"><style>${css}
body { margin:0; font-family: sans-serif; }
.toolbar-actions { display:flex; align-items:center; gap:6px; margin:120px 0 0 60px; }
</style></head><body>
${actionsMarkup}
<script>
  const els = {
    documentPrimaryButton: document.getElementById("documentPrimaryButton"),
    documentPrimaryTooltip: document.getElementById("documentPrimaryTooltip")
  };
  ${helperSource}
  let lastPointerX = -1;
  let lastPointerY = -1;
  ${controllerSource}
  document.addEventListener("mousemove", (event) => {
    syncDisabledPrimaryTooltip(event.clientX, event.clientY);
  }, true);
  window.__setState = (disabled, text) => {
    els.documentPrimaryButton.disabled = disabled;
    els.documentPrimaryTooltip.textContent = text;
    els.documentPrimaryButton.classList.remove("tooltip-forced");
  };
<\/script>
</body></html>`;

const browser = await chromium.launch({ headless: true });
const pageHandle = await browser.newPage({ viewport: { width: 900, height: 700 } });
pageHandle.on("pageerror", (error) => console.error(`harness page error: ${error.stack || error.message}`));
pageHandle.on("console", (message) => {
  if (message.type() === "error") console.error(`harness console: ${message.text()}`);
});
await pageHandle.setContent(page, { waitUntil: "load" });

const opacity = () => pageHandle.evaluate(
  () => getComputedStyle(document.getElementById("documentPrimaryTooltip")).opacity
);

async function hoverButton() {
  const box = await pageHandle.locator("#documentPrimaryButton").boundingBox();
  await pageHandle.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
  await pageHandle.waitForTimeout(200);
}
async function moveAway() {
  await pageHandle.mouse.move(700, 600, { steps: 6 });
  await pageHandle.waitForTimeout(200);
}

// 1) 禁用 + 有解释文案 → 悬停必须显示，移开必须消失
await pageHandle.evaluate(() => window.__setState(true, "加入资料库后可编辑"));
await moveAway();
assert.equal(await opacity(), "0", "未悬停时 tooltip 必须不可见");
await hoverButton();
assert.equal(await opacity(), "1", "悬停禁用态主操作必须显示解释性 tooltip");
// 1b) 锚点必须在按钮左侧（R42 诊断定案：运行时内容表面盖在主 DOM 之上，
//     默认「按钮下方」锚点会伸进内容区被表面压住——元素有尺寸、opacity=1 却不可见）。
//     用几何量取而非 getComputedStyle：`left:auto` 的解析值在不同引擎可能回填 px。
const sideAnchor = await pageHandle.evaluate(() => {
  const tip = document.getElementById("documentPrimaryTooltip").getBoundingClientRect();
  const btn = document.getElementById("documentPrimaryButton").getBoundingClientRect();
  return { tipRight: tip.right, btnLeft: btn.left, tipTop: tip.top, btnTop: btn.top, btnBottom: btn.bottom };
});
assert.ok(sideAnchor.tipRight <= sideAnchor.btnLeft + 1, "禁用态 tooltip 必须整体位于按钮左侧（不能伸进被内容表面盖住的区域）");
assert.ok(
  sideAnchor.tipTop >= sideAnchor.btnTop - 2 && sideAnchor.tipTop <= sideAnchor.btnBottom,
  "禁用态 tooltip 必须垂直居中于按钮行带内"
);
await moveAway();
assert.equal(await opacity(), "0", "移开后 tooltip 必须消失");

// 2) 禁用但无文案：坐标控制器不得强制显示（tooltip-forced 类必须缺席）。
//    注：Chromium 的 CSS :hover 在 disabled 子树内仍然生效、无法按文案条件化，
//    空气泡只能靠「真实应用中禁用态主操作恒带解释文案」保证
//    （viewerToolbarState 的 external 分支恒设 htmlEdit.editDisabledTooltip）。
await pageHandle.evaluate(() => window.__setState(true, ""));
await hoverButton();
const forcedDuringEmptyHover = await pageHandle.evaluate(
  () => document.getElementById("documentPrimaryButton").classList.contains("tooltip-forced")
);
assert.equal(forcedDuringEmptyHover, false, "禁用且无文案时坐标控制器不得强制显示");

// 3) 启用态仍走原有 CSS :hover（本控制器不得接管）
await pageHandle.evaluate(() => window.__setState(false, "保存文档"));
await moveAway();
assert.equal(await opacity(), "0", "启用态未悬停时不可见");
await hoverButton();
assert.equal(await opacity(), "1", "启用态 tooltip 仍必须工作");

await browser.close();

// 4) 纯函数的边界：边缘 2px 内算命中，下方 6px（tooltip 区域）算命中，外侧不算
const rectContext = vm.createContext({});
vm.runInContext(helperSource, rectContext);
const rect = { left: 100, top: 100, right: 128, bottom: 128 };
assert.equal(rectContext.pointerWithinPrimaryButtonRect(rect, 114, 114, { bottomPad: 6 }), true, "中心必须命中");
assert.equal(rectContext.pointerWithinPrimaryButtonRect(rect, 98, 114, { bottomPad: 6 }), true, "左边缘 2px 内必须命中");
assert.equal(rectContext.pointerWithinPrimaryButtonRect(rect, 114, 133, { bottomPad: 6 }), true, "下方 6px（tooltip 区）必须仍算命中");
assert.equal(rectContext.pointerWithinPrimaryButtonRect(rect, 114, 140, { bottomPad: 6 }), false, "远离必须不命中");
assert.equal(rectContext.pointerWithinPrimaryButtonRect(null, 114, 114, { bottomPad: 6 }), false, "无 rect 不得命中");

console.log("disabled primary tooltip hover checks passed（真实浏览器量取 + 边界）：悬停显示 / 移开消失 / 无文案不显示 / 启用态不受影响");
