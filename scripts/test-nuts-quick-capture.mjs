import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, webkit } from "playwright";

// Exercise the real board, dialog and navigation. Only the native delivery and
// storage commands are substituted here. OS registration needs a desktop run.
const browser = await (process.env.NUTBOOK_CAPTURE_BROWSER === "webkit" ? webkit : chromium).launch();
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.notes = [];
    window.exitRequested = false;
    const invoke = async (cmd, args) => {
      switch (cmd) {
        case "nuts_boards": return [{ id: "default", name: "随手记" }];
        case "nuts_board_cards": return window.notes;
        case "nuts_board_note":
          window.notes.push({ id: "note-1", kind: "note", excerpt: args.markdown, title: args.markdown, ...args });
          return "note-1";
        case "finalize_html_edit_app_exit_command":
          window.exitRequested = true;
          return;
        case "list_items": return { items: [], total: 0 };
        default: return [];
      }
    };
    window.__TAURI_INTERNALS__ = { invoke, transformCallback: () => 1 };
  });
  await page.goto(pathToFileURL(resolve("dist/index.html")).href);
  const capture = async () => {
    await page.keyboard.press("Control+n");
    await page.locator("#nutsBoardInput").waitFor({ state: "visible" });
  };
  await capture();
  const field = page.locator("#nutsBoardInput");
  await field.waitFor({ state: "visible", timeout: 5000 });
  assert.equal(await field.evaluate(node => node === document.activeElement), true);
  await field.fill("下次观察分组讨论");
  await capture();
  assert.equal(await field.inputValue(), "下次观察分组讨论");
  await field.dispatchEvent("compositionstart");
  await field.press("Control+Enter");
  assert.equal(await page.evaluate(() => window.notes.length), 0);
  await field.dispatchEvent("compositionend");
  await field.press("Control+Enter");
  await page.locator(".nuts-note-card").getByText("下次观察分组讨论").waitFor({ timeout: 5000 });
  assert.deepEqual(await page.evaluate(() => window.notes.map(n => n.boardId)), ["default"]);
  await capture();
  await field.fill("待补充的观察");
  await page.locator("#nutsBoardCancel").click();
  await capture();
  assert.equal(await field.inputValue(), "待补充的观察");
  await page.evaluate(() => window.__NUTBOOK_REQUEST_APP_EXIT__());
  await page.waitForFunction(() => window.exitRequested);
  await page.reload();
  await capture();
  assert.equal(await field.inputValue(), "");
  const quick = await browser.newPage({ viewport: { width: 380, height: 328 } });
  await quick.addInitScript(() => {
    window.calls = [];
    window.captureEnglish = true;
    window.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      window.calls.push({ command, args });
      if (command === "nuts_boards") return [{ id: "default", name: "随手记" }];
      if (command === "quick_nut_generation") return 0;
      if (command === "quick_nut_language") return window.captureEnglish;
      return null;
    } };
  });
  await quick.goto(pathToFileURL(resolve("dist/quick-nut.html")).href);
  await quick.evaluate(() => window.__NUTBOOK_QUICK_NUT_OPEN__(1));
  const quickField = quick.locator("#quickNutText");
  assert.equal(await quickField.evaluate(node => node === document.activeElement), true);
  const quickPin = quick.locator("#quickNutPin");
  const quickSave = quick.locator("#quickNutSave");
  assert.equal(await quickSave.textContent(), "Save NUT");
  assert.equal(await quickSave.isDisabled(), true);
  const assertSaveFits = async text => {
    assert.equal(await quickSave.textContent(), text);
    const layout = await quickSave.evaluate(button => {
      const bounds = button.getBoundingClientRect();
      const text = document.createRange();
      text.selectNodeContents(button);
      const lines = Array.from(text.getClientRects());
      const footer = button.parentElement.getBoundingClientRect();
      return {
        lineCount: lines.length,
        textContained: lines.every(line => line.left >= bounds.left && line.right <= bounds.right &&
          line.top >= bounds.top && line.bottom <= bounds.bottom),
        footerContained: bounds.right <= footer.right,
      };
    });
    assert.deepEqual(layout, { lineCount: 1, textContained: true, footerContained: true });
  };
  await assertSaveFits("Save NUT");
  await quick.evaluate(async () => {
    window.captureEnglish = false;
    await window.__NUTBOOK_QUICK_NUT_OPEN__(1);
  });
  await assertSaveFits("收下 NUT");
  await quick.evaluate(async () => {
    window.captureEnglish = true;
    await window.__NUTBOOK_QUICK_NUT_OPEN__(1);
  });
  const colors = await quickSave.evaluate(button => {
    const style = getComputedStyle(button);
    return {
      text: style.color,
      fill: style.backgroundColor,
      opacity: style.opacity,
      panel: getComputedStyle(button.form).backgroundColor,
      body: getComputedStyle(document.body).backgroundColor,
    };
  });
  assert.deepEqual(colors, {
    text: "rgb(94, 94, 99)",
    fill: "rgb(238, 238, 240)",
    opacity: "1",
    panel: "rgb(249, 249, 251)",
    body: "rgba(0, 0, 0, 0)",
  });
  const tooltipOpacity = () => quickPin.evaluate(node => getComputedStyle(node, "::after").opacity);
  await quickPin.hover();
  assert.equal(await tooltipOpacity(), "1");
  await quick.mouse.move(2, 2);
  await quickField.focus();
  await quick.keyboard.press("Tab");
  await quickPin.focus();
  assert.equal(await quickPin.evaluate(node => node === document.activeElement), true);
  assert.equal(await tooltipOpacity(), "1");
  assert.equal(await quickPin.getAttribute("data-tooltip"), await quickPin.getAttribute("aria-label"));
  await quickField.fill("A desktop note");
  await assertSaveFits("Save NUT");
  await quickSave.click();
  await quick.waitForFunction(() => window.calls.some(entry => entry.args?.action === "hide"));
  assert.equal(await quick.evaluate(() => window.calls.filter(entry => entry.command === "nuts_board_note").length), 1);
  assert.equal(await quick.evaluate(() => document.getAnimations().length), 0);
  assert.equal(await quick.locator("#quickNutMark").count(), 0);
  await quick.evaluate(() => window.__NUTBOOK_QUICK_NUT_OPEN__(2));
  assert.equal(await quickField.inputValue(), "");
  await quick.locator("#quickNutPin").click();
  assert.equal(await quick.locator("#quickNutPin").getAttribute("aria-pressed"), "true");
  await quickField.fill("A pinned desktop note");
  await quick.locator("#quickNutSave").click();
  await quick.getByRole("button", { name: "New NUT" }).waitFor();
  assert.equal(await quickField.inputValue(), "A pinned desktop note");
  assert.equal(await quickField.getAttribute("readonly"), "");
  assert.equal(await quick.evaluate(() => window.calls.filter(entry => entry.args?.action === "hide").length), 1);
  await quick.locator("#quickNutClose").click();
  await quick.waitForFunction(() => window.calls.filter(entry => entry.args?.action === "hide").length === 2);
  assert.equal(await quick.evaluate(() => document.getAnimations().length), 0);
  console.log("Board capture and independent NUT window regressions passed.");
} finally {
  await browser.close();
}
