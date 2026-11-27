import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

// Exercise the real board, dialog and navigation. Only the native delivery and
// storage commands are substituted here. OS registration needs a desktop run.
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    window.pendingCapture = false;
    window.notes = [];
    const invoke = async (cmd, args) => {
      switch (cmd) {
        case "take_pending_nut_capture": {
          const pending = window.pendingCapture;
          window.pendingCapture = false;
          return pending;
        }
        case "nuts_boards": return [{ id: "default", name: "随手记" }];
        case "nuts_board_cards": return window.notes;
        case "nuts_board_note":
          window.notes.push({ id: "note-1", kind: "note", excerpt: args.markdown, title: args.markdown, ...args });
          return "note-1";
        case "list_items": return { items: [], total: 0 };
        default: return [];
      }
    };
    window.__TAURI_INTERNALS__ = { invoke, transformCallback: () => 1 };
  });
  await page.goto(pathToFileURL(resolve("dist/index.html")).href);
  const capture = () => page.evaluate(async () => {
    window.pendingCapture = true;
    await window.__NUTBOOK_CAPTURE__();
  });
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
  await page.evaluate(() => window.__NUTBOOK_REQUEST_APP_EXIT__());
  await field.waitFor({ state: "hidden" });
  await page.reload();
  await capture();
  assert.equal(await field.inputValue(), "待补充的观察");
  console.log("NUT capture dialog, repeat activation, composition, save and quit/reopen passed.");
} finally {
  await browser.close();
}
