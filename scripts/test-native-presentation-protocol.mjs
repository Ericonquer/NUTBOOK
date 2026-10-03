import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const sample = resolve("docs/presentations/native-presentation-sample/index.html");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(pathToFileURL(sample).href);
  const result = await page.evaluate(async () => {
    const bridge = window.__NUTBOOK_PRESENTATION__;
    const changed = [];
    const unsubscribe = bridge.subscribe(id => changed.push(id));
    const ready = await bridge.whenReady();
    const managed = await bridge.setManagedMode(true);
    const moved = await bridge.goTo("workflow");
    const activeAfterMove = bridge.activePageId;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    const activeAfterManagedKey = bridge.activePageId;
    unsubscribe();
    const notes = JSON.parse(document.getElementById("nutbook-presentation-notes").textContent);
    return {
      version: bridge.version,
      capability: bridge.capabilities.managedPresenter,
      pages: bridge.pages.map(({ id }) => id), ready, managed, moved,
      activeAfterMove, activeAfterManagedKey, changed,
      visiblePage: document.querySelector(".page.active")?.dataset.nutbookPageId,
      localImageLoaded: document.querySelector("img")?.complete,
      notes: notes.pages.workflow[0].runs.map(run => run.text).join(""),
    };
  });
  assert.equal(result.version, 1);
  assert.equal(result.capability, true);
  assert.deepEqual(result.pages, ["opening", "workflow", "finish"]);
  assert.equal(result.ready, true);
  assert.equal(result.managed, true);
  assert.equal(result.moved, true);
  assert.equal(result.activeAfterMove, "workflow");
  assert.equal(result.activeAfterManagedKey, "workflow");
  assert.deepEqual(result.changed, ["workflow"]);
  assert.equal(result.visiblePage, "workflow");
  assert.equal(result.localImageLoaded, true);
  assert.match(result.notes, /演讲者备注/);

  const presenter = await browser.newPage({ viewport: { width: 1200, height: 820 } });
  await presenter.addInitScript(() => {
    const pages = [{ id: "opening", title: "Opening" }, { id: "workflow", title: "Workflow" }, { id: "finish", title: "Finish" }];
    let state = { sessionId: "test-session", itemId: 1, pages, activePageId: "opening", ready: true,
      notes: { opening: [{ type: "paragraph", runs: [{ text: "<img onerror=alert(1)>", bold: true }] }], workflow: [{ type: "paragraph", runs: [{ text: "second note", bold: false }] }] },
      pendingPageId: null, sequence: 0, error: null, rehearsal: false, timerElapsedMs: 0,
      timerRunning: true, targetMinutes: null, black: false, suspended: false, language: "en-US" };
    window.__TAURI_INTERNALS__ = { invoke: async (command, args) => {
      if (command === "native_presentation_state") return state;
      if (command === "native_presentation_thumbnail") throw new Error("no preview engine");
      if (command === "native_presentation_navigate") {
        state = { ...state, activePageId: args.payload.pageId, sequence: state.sequence + 1 };
        return state;
      }
      return state;
    } };
  });
  await presenter.goto(pathToFileURL(resolve("dist/native-presenter.html")).href);
  await presenter.waitForFunction(() => document.getElementById("pageCount")?.textContent === "1 / 3");
  assert.equal(await presenter.locator(".brand").textContent(), "NUTBOOK · Presenter");
  assert.equal(await presenter.locator("#notes img").count(), 0);
  await presenter.locator("#next").click();
  await presenter.waitForFunction(() => document.getElementById("pageCount")?.textContent === "2 / 3");
  assert.match(await presenter.locator("#notes").textContent(), /second note/);
  console.log("native presentation sample protocol passed");
} finally {
  await browser.close();
}
