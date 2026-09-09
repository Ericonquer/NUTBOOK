// Codex review R4：Markdown 外部保存锁与事务级资源追踪——真实调用链回归。
//
// 与 entry-bridge 的 VM/静态断言不同，本脚本用 Playwright + Chromium 挂载
// 真实构建产物（dist/assets/markdown-editor.js），在真实 Milkdown/ProseMirror
// 运行面上验证 Codex R4 的三个阻塞：
//
//  R4-1 可达资源追踪必须挂在真实 PM 事务入口：milkdown listener 的 updated
//       由 200ms debounce 驱动（依赖源码已核验），「插图后立即撤销」窗口内
//       updated 调用次数为 0。本测试复刻该探针：走真实插图链路（插入菜单
//       按钮 → runInsertImageAsset → 空段插入图片节点事务）后立即执行真实
//       undo 命令（runHistoryCommand → prosemirror-history undo → view.dispatch
//       bound 方法），在 debounced updated 从未触发的窗口内（onChange 计数
//       恒为 0）断言可达集合仍含该引用。
//  R4-2 锁定/解锁绝不触碰 view.dispatch（构造器 bound 方法）：旧实现
//       `delete view.dispatch` 后，undo 命令内部裸调用 dispatch 时
//       this=undefined 直接 TypeError。本测试做 lock→unlock→真实 undo/redo
//       命令闭环，断言零异常且撤销/重做真实生效；锁定期间程序化事务
//       （setDocumentTitle）经 filterTransaction 事务门被过滤。
//  R4-3 IME 组合中锁定不得超时强锁：compositionend 是唯一权威落定信号。
//       真实组合（compositionstart，期间持续 compositionupdate）超过 2s 兜底
//       期限时 lockEditing 返回 busy、编辑器保持可编辑（组合输入不被保存
//       链路截断）；compositionend 到达后才能锁上；锁上期间输入被真实阻断。
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const BUNDLE = readFileSync("dist/assets/markdown-editor.js", "utf8");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(String(error?.message || error)));

await page.setContent(`<div id="editor" class="milkdown-editor-root"></div>`);
await page.addScriptTag({ content: BUNDLE, type: "module" });
await page.waitForFunction(() => Boolean(window.NutbookMarkdownEditor?.create));

async function freshEditor({ markdown = "", onInsertImageAsset = null } = {}) {
  await page.evaluate(() => {
    window.__ed?.destroy?.();
    document.getElementById("editor").innerHTML = "";
    window.__ed = null;
  });
  await page.evaluate(async (options) => {
    window.__changeCalls = 0;
    window.__ed = await window.NutbookMarkdownEditor.create({
      root: document.getElementById("editor"),
      markdown: options.markdown,
      onChange: () => { window.__changeCalls += 1; },
      onInsertImageAsset: options.hasAssetHook
        ? async () => ({ relativePath: "assets/manual.png", fileName: "manual.png" })
        : null
    });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    document.querySelector("#editor .ProseMirror").focus();
  }, { markdown, hasAssetHook: Boolean(onInsertImageAsset) });
}

const getMd = () => page.evaluate(() => window.__ed.getMarkdown());
const getRefs = () => page.evaluate(() => window.__ed.getEverReferencedResources());
const changeCalls = () => page.evaluate(() => window.__changeCalls);
const clickInsertImage = async () => {
  // 插入菜单走 pointerdown 事件委托（真实用户路径），不是 click。
  const dispatched = await page.evaluate(() => {
    const button = document.querySelector('button[data-insert-command="image"]');
    if (!button) return false;
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    return true;
  });
  assert.ok(dispatched, "the real insert-menu image button must exist in the mounted editor");
};

// ── R4-1：真实插图事务 → 立即真实 undo —— 去抖窗口外引用仍在可达集合 ──
await freshEditor({ markdown: "", onInsertImageAsset: true });
// 插图与 undo 在同一个宏任务内完成（微任务级轮询等插图事务落盘后立刻 undo）：
// 200ms 去抖的 updated 在本场景下根本没有机会被调度（Codex 探针
// 「插图后立即 undo：updatedCalls=0」的等价强证明）。
const r41 = await page.evaluate(async () => {
  const button = document.querySelector('button[data-insert-command="image"]');
  button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
  let inserted = false;
  for (let i = 0; i < 10000; i += 1) {
    if (window.__ed.getMarkdown().includes("manual.png")) { inserted = true; break; }
    await Promise.resolve();
  }
  if (!inserted) return { inserted: false };
  const undoHandled = window.__ed.undo();
  return {
    inserted: true,
    undoHandled,
    refs: window.__ed.getEverReferencedResources(),
    md: window.__ed.getMarkdown()
  };
});
assert.equal(r41.inserted, true, "the real insert path (insert menu -> runInsertImageAsset) must insert the image");
assert.equal(r41.undoHandled, true, "undo must be handled by the real PM history command");
assert.ok(!r41.md.includes("manual.png"), "after undo the document must not reference the image (Codex probe precondition)");
assert.ok(
  r41.refs.includes("assets/manual.png"),
  "R4-1: the hand-inserted-then-undone image ref must be tracked at the real transaction entry (zero debounced updates in between)"
);
// 让去抖周期彻底过去，集合与正文仍满足「可达但不在当前正文」。
await page.waitForTimeout(400);
assert.ok((await getRefs()).includes("assets/manual.png"), "R4-1: the ref survives the debounce cycle");
assert.ok(!(await getMd()).includes("manual.png"), "R4-1: the undone image stays out of the document body");

// ── R4-2：lock → unlock 后真实 keymap/undo 命令链零异常 ──
await freshEditor({ markdown: "", onInsertImageAsset: true });
await clickInsertImage();
await page.waitForFunction(() => window.__ed.getMarkdown().includes("manual.png"), null, { timeout: 3000 });
assert.equal(await page.evaluate(() => window.__ed.lockEditing()), true, "lock without composition must succeed");
assert.equal(await page.evaluate(() => window.__ed.isEditingLocked()), true);
assert.equal(
  await page.evaluate(() => document.querySelector("#editor .ProseMirror").getAttribute("contenteditable")),
  "false",
  "locking must close the real PM editable boundary (contenteditable=false)"
);
// 锁定期间：键盘输入与程序化事务都被真实阻断。
await page.keyboard.type("锁定期间输入");
assert.ok(
  !(await getMd()).includes("锁定期间输入"),
  "no input may reach the document while locked"
);
await page.evaluate(() => window.__ed.setDocumentTitle("锁定期间标题"));
assert.ok(
  !(await getMd()).includes("# 锁定期间标题"),
  "R4-2: programmatic transactions must be filtered by the transaction gate while locked"
);
// 解锁不触碰 view.dispatch，随后真实 undo/redo 命令必须照常工作。
await page.evaluate(() => window.__ed.unlockEditing());
assert.equal(
  await page.evaluate(() => document.querySelector("#editor .ProseMirror").getAttribute("contenteditable")),
  "true",
  "unlocking must restore the PM editable boundary"
);
assert.equal(await page.evaluate(() => window.__ed.undo()), true, "R4-2: the real undo command must run after lock/unlock without TypeError");
assert.ok(!(await getMd()).includes("manual.png"), "R4-2: undo actually reverted the image insertion");
assert.equal(await page.evaluate(() => window.__ed.redo()), true, "R4-2: the real redo command must run after lock/unlock");
assert.ok((await getMd()).includes("manual.png"), "R4-2: redo actually restored the image insertion");
assert.deepEqual(pageErrors, [], "R4-2: no page errors (the old delete-view.dispatch bug threw TypeError inside the command chain)");

// ── R4-3：真实组合输入超过 2s 兜底期限 → busy，绝不截断组合 ──
await freshEditor({ markdown: "正文。\n" });
await page.evaluate(() => {
  const dom = document.querySelector("#editor .ProseMirror");
  dom.dispatchEvent(new CompositionEvent("compositionstart", { data: "" }));
  // 持续 compositionupdate 模拟进行中的 IME 组合（真实 IME 会持续派发）。
  window.__updates = setInterval(() => {
    dom.dispatchEvent(new CompositionEvent("compositionupdate", { data: "拼" }));
  }, 200);
  window.__lockPromise = window.__ed.lockEditing();
});
await page.waitForTimeout(500);
assert.equal(await page.evaluate(() => window.__ed.isEditingLocked()), false, "R4-3: the editor must stay unlocked while the composition is ongoing");
assert.equal(
  await page.evaluate(() => document.querySelector("#editor .ProseMirror").getAttribute("contenteditable")),
  "true",
  "R4-3: the composition input must not be truncated by the save chain (still editable)"
);
const busyResult = await page.evaluate(() => window.__lockPromise);
await page.evaluate(() => clearInterval(window.__updates));
assert.equal(busyResult, false, "R4-3: lockEditing past the 2s deadline must return busy, never force-lock");
assert.equal(await page.evaluate(() => window.__ed.isEditingLocked()), false, "R4-3: still unlocked after the busy verdict");
// 组合结束后（compositionend）才允许锁上，且锁定真实阻断输入。
await page.evaluate(() => {
  document.querySelector("#editor .ProseMirror").dispatchEvent(new CompositionEvent("compositionend", { data: "拼音" }));
});
const lockedAfterEnd = await page.evaluate(() => window.__ed.lockEditing());
assert.equal(lockedAfterEnd, true, "R4-3: after compositionend the lock must succeed");
assert.equal(await page.evaluate(() => window.__ed.isEditingLocked()), true);
await page.keyboard.type("锁定输入");
assert.ok(!(await getMd()).includes("锁定输入"), "R4-3: input is blocked once the lock is really held");
await page.evaluate(() => window.__ed.unlockEditing());
assert.deepEqual(pageErrors, [], "no page errors across the composition scenarios");

// ── 无组合时锁立即成功（快速路径未被拖慢）──
await freshEditor({ markdown: "正文。\n" });
const quickLockStart = Date.now();
assert.equal(await page.evaluate(() => window.__ed.lockEditing()), true);
assert.ok(Date.now() - quickLockStart < 1500, "locking without composition must not wait for the deadline");
await page.evaluate(() => window.__ed.unlockEditing());

await browser.close();
console.log("markdown external save lock / transaction tracking tests passed (Codex R4).");
