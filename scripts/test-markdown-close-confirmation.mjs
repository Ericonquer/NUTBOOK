import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const externalOrigin = process.env.NUTBOOK_TEST_ORIGIN || "";
const origin = externalOrigin || "http://127.0.0.1:4175";
const server = externalOrigin ? null : spawn(process.execPath, [
  "node_modules/vite/bin/vite.js",
  "dist",
  "--host", "127.0.0.1",
  "--port", "4175",
  "--strictPort"
], { stdio: "ignore" });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (error) => console.error(`browser page error: ${error.stack || error.message}`));

async function waitForOrigin() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (server?.exitCode != null) throw new Error(`Markdown close test server exited with ${server.exitCode}`);
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch (_) {
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Markdown close test server did not start at ${origin}`);
}

async function openMarkdown() {
  await page.locator('[data-open-item="101"]').click();
  await page.locator('#milkdownEditorRoot .ProseMirror').waitFor({ state: "visible" });
}

async function appendText(text) {
  const editor = page.locator('#milkdownEditorRoot .ProseMirror');
  await editor.click();
  await page.keyboard.press("Meta+ArrowDown");
  await page.keyboard.type(text);
  await page.waitForTimeout(350);
  assert.match(await editor.innerText(), new RegExp(text.trim()), `the editor must contain ${text.trim()} before close`);
}

async function requestClose() {
  await page.locator('[data-close-tab="101"]').click();
  await page.waitForTimeout(150);
}

async function assertThreeWayDialog({ layout = "wide" } = {}) {
  const dialog = page.locator('#confirmScrim .markdown-close-confirm-card');
  await dialog.waitFor({ state: "attached" });
  assert.equal(await dialog.isVisible(), true, "the three-way Markdown close dialog must be visible");
  const state = await dialog.evaluate((element) => {
    const actions = element.querySelector(".markdown-close-confirm-actions");
    const buttons = [...element.querySelectorAll("[data-markdown-close-choice]")];
    const rects = buttons.map((button) => button.getBoundingClientRect());
    const actionsRect = actions?.getBoundingClientRect();
    const style = actions ? getComputedStyle(actions) : null;
    return {
      choices: buttons.map((button) => button.getAttribute("data-markdown-close-choice")),
      labels: buttons.map((button) => button.textContent.trim()),
      tops: rects.map((rect) => rect.top),
      widths: rects.map((rect) => rect.width),
      cardWidth: element.getBoundingClientRect().width,
      actionsWidth: actionsRect?.width || 0,
      buttonOverflow: buttons.map((button) => button.scrollWidth <= button.clientWidth),
      dialogOverflow: element.scrollWidth <= element.clientWidth,
      actionsOverflow: actions ? actions.scrollWidth <= actions.clientWidth : false,
      actionsDisplay: style?.display || "",
      actionsFlexWrap: style?.flexWrap || "",
      buttonFlex: buttons.map((button) => getComputedStyle(button).flex),
      buttonWhiteSpace: buttons.map((button) => getComputedStyle(button).whiteSpace)
    };
  });
  assert.deepEqual(state.choices, ["continue", "discard", "save"], "dirty Markdown must expose all three close decisions");
  assert.deepEqual(state.labels, ["Keep Editing", "Discard and Exit", "Save and Exit"], "English Markdown close labels must use the concise exit wording");
  assert.equal(state.dialogOverflow, true, `Markdown close dialog must not overflow its card: ${JSON.stringify(state)}`);
  assert.equal(state.actionsOverflow, true, `Markdown close action group must not overflow horizontally: ${JSON.stringify(state)}`);
  assert.deepEqual(state.buttonOverflow, [true, true, true], `Markdown close labels must fit their buttons: ${JSON.stringify(state)}`);
  assert.equal(state.actionsDisplay, "flex", `Markdown close actions must use the shared content-sized flex layout: ${JSON.stringify(state)}`);
  assert.equal(state.actionsFlexWrap, "wrap", `Markdown close actions must wrap safely at narrow widths: ${JSON.stringify(state)}`);
  assert.deepEqual(state.buttonFlex, ["0 0 auto", "0 0 auto", "0 0 auto"], `Markdown close buttons must remain content-sized: ${JSON.stringify(state)}`);
  assert.deepEqual(state.buttonWhiteSpace, ["nowrap", "nowrap", "nowrap"], "Markdown close labels must not wrap");
  if (layout === "wide") {
    assert.equal(new Set(state.tops.map((top) => Math.round(top))).size, 1, `wide Markdown close buttons must share one row: ${JSON.stringify(state)}`);
    assert.ok(state.cardWidth <= 420.5, `Markdown close card must use the HTML dialog width cap: ${JSON.stringify(state)}`);
    assert.ok(state.widths[1] > state.widths[0] && state.widths[1] > state.widths[2], `the longer English action must remain content-sized instead of equal-width: ${JSON.stringify(state)}`);
  } else {
    assert.ok(state.widths.every((width) => width < state.actionsWidth), `narrow Markdown close actions must never stretch across the full action row: ${JSON.stringify(state)}`);
  }
}

try {
  await waitForOrigin();
  await page.addInitScript(() => {
    window.localStorage.setItem("nutbook.language", "en-US");
  });
  await page.goto(`${origin}/?readmeDemo=1`, { waitUntil: "domcontentloaded" });
  try {
    await page.locator('[data-open-item="101"]').waitFor({ state: "visible", timeout: 10000 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      title: document.title,
      status: document.getElementById("statusText")?.textContent || "",
      body: document.body.innerText.slice(0, 1200)
    }));
    throw new Error(`mock Markdown item did not render: ${JSON.stringify(state)}`, { cause: error });
  }

  await openMarkdown();
  await appendText(" CONFLICT_SENTINEL");
  await page.evaluate(() => {
    window.__readmeDemoMarkdownSaveConflict = true;
  });
  await page.keyboard.press("Meta+s");
  await page.waitForFunction(() => document.getElementById("toast")?.classList.contains("open"));
  assert.match(
    await page.locator("#toast").innerText(),
    /外部修改|outside Nutbook/,
    "a real edit conflict must explain that the file changed outside Nutbook"
  );
  assert.match(
    await page.locator("#statusText").innerText(),
    /草稿已保留|draft was preserved/,
    "the conflict status must explain that the draft is preserved and how to recover"
  );
  assert.match(
    await page.locator('#milkdownEditorRoot .ProseMirror').innerText(),
    /CONFLICT_SENTINEL/,
    "a failed conflict save must preserve the current editor draft"
  );
  await page.evaluate(() => {
    window.__readmeDemoMarkdownSaveConflict = false;
  });
  await page.keyboard.press("Meta+z");
  await page.waitForTimeout(350);

  await appendText(" CONTINUE_SENTINEL");
  await requestClose();
  const firstCloseState = await page.evaluate(() => ({
    tabCount: document.querySelectorAll('[data-tab-id="101"]').length,
    dialogCount: document.querySelectorAll('#confirmScrim .confirm-card').length,
    status: document.getElementById("statusText")?.textContent || "",
    scrimClass: document.getElementById("confirmScrim")?.className || "",
    scrimDisplay: getComputedStyle(document.getElementById("confirmScrim")).display,
    dialogRect: document.querySelector('#confirmScrim .confirm-card')?.getBoundingClientRect().toJSON?.() || null
  }));
  assert.equal(firstCloseState.tabCount, 1, `dirty Markdown must not close before a decision: ${JSON.stringify(firstCloseState)}`);
  assert.equal(firstCloseState.dialogCount, 1, `dirty Markdown must show its decision dialog: ${JSON.stringify(firstCloseState)}`);
  await assertThreeWayDialog({ layout: "wide" });
  await page.locator('[data-markdown-close-choice="continue"]').click();
  assert.equal(await page.locator('[data-tab-id="101"]').count(), 1, "continue editing must keep the tab open");
  assert.match(await page.locator('#milkdownEditorRoot .ProseMirror').innerText(), /CONTINUE_SENTINEL/, "continue editing must preserve the draft");

  await page.setViewportSize({ width: 420, height: 900 });
  await requestClose();
  const secondCloseState = await page.evaluate(() => ({
    tabCount: document.querySelectorAll('[data-tab-id="101"]').length,
    dialogCount: document.querySelectorAll('#confirmScrim .confirm-card').length,
    status: document.getElementById("statusText")?.textContent || ""
  }));
  assert.equal(secondCloseState.dialogCount, 1, `the preserved dirty draft must prompt again: ${JSON.stringify(secondCloseState)}`);
  await assertThreeWayDialog({ layout: "narrow" });
  await page.locator('[data-markdown-close-choice="discard"]').click();
  await page.locator('[data-tab-id="101"]').waitFor({ state: "detached" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await openMarkdown();
  assert.doesNotMatch(await page.locator('#milkdownEditorRoot .ProseMirror').innerText(), /CONTINUE_SENTINEL/, "discard and close must restore the persisted source on reopen");

  await appendText(" SAVE_SENTINEL");
  await requestClose();
  await assertThreeWayDialog({ layout: "wide" });
  await page.locator('[data-markdown-close-choice="save"]').click();
  await page.locator('[data-tab-id="101"]').waitFor({ state: "detached" });
  await openMarkdown();
  assert.match(await page.locator('#milkdownEditorRoot .ProseMirror').innerText(), /SAVE_SENTINEL/, "save and close must persist the draft before reopening");

  await appendText(" UNDO_SENTINEL");
  await page.keyboard.press("Meta+z");
  await page.waitForTimeout(350);
  assert.doesNotMatch(await page.locator('#milkdownEditorRoot .ProseMirror').innerText(), /UNDO_SENTINEL/, "undo must restore the normalized baseline");
  await requestClose();
  await page.locator('[data-tab-id="101"]').waitFor({ state: "detached" });
  assert.equal(await page.locator('#confirmScrim .confirm-card').count(), 0, "undo-to-baseline must close without a false dirty confirmation");

  await openMarkdown();
  await appendText(" APP_EXIT_SENTINEL");
  await page.evaluate(() => {
    window.__readmeDemoAppExitFinalizeCount = 0;
    window.__NUTBOOK_REQUEST_HTML_EDIT_APP_EXIT__();
    window.__NUTBOOK_REQUEST_HTML_EDIT_APP_EXIT__();
  });
  await assertThreeWayDialog({ layout: "wide" });
  assert.equal(await page.locator('#confirmScrim .confirm-card').count(), 1, "repeated app-exit requests must share one in-flight confirmation");
  await page.locator('[data-markdown-close-choice="continue"]').click();
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => window.__readmeDemoAppExitFinalizeCount || 0), 0, "continue editing must not release the native app-exit guard");
  assert.match(await page.locator('#milkdownEditorRoot .ProseMirror').innerText(), /APP_EXIT_SENTINEL/, "canceling app exit must preserve the Markdown draft");

  await page.evaluate(() => window.__NUTBOOK_REQUEST_APP_EXIT__());
  await assertThreeWayDialog({ layout: "wide" });
  await page.locator('[data-markdown-close-choice="save"]').click();
  await page.waitForFunction(() => window.__readmeDemoAppExitFinalizeCount === 1);
  assert.match(await page.locator('#milkdownEditorRoot .ProseMirror').innerText(), /APP_EXIT_SENTINEL/, "save-before-exit must keep the visible editor content intact until the host exits");

  await appendText(" APP_EXIT_DISCARD_SENTINEL");
  await page.evaluate(() => window.__NUTBOOK_REQUEST_APP_EXIT__());
  await assertThreeWayDialog({ layout: "wide" });
  await page.locator('[data-markdown-close-choice="discard"]').click();
  await page.waitForFunction(() => window.__readmeDemoAppExitFinalizeCount === 2);
  assert.match(
    await page.locator('#milkdownEditorRoot .ProseMirror').innerText(),
    /APP_EXIT_DISCARD_SENTINEL/,
    "discard-before-exit must not erase the in-memory draft before the native host actually exits"
  );
} finally {
  await browser.close();
  server?.kill("SIGTERM");
}

console.log("Markdown close confirmation browser regression passed.");
