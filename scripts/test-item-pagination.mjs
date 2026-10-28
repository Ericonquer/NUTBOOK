import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(`${process.cwd()}/dist/index.html`).href);
  await page.waitForFunction(() => typeof loadItems === 'function' && !appState.isBooting);
  await page.evaluate(async () => {
    window.savedInvoke = invoke;
    mockData.items = Array.from({ length: 205 }, (_, i) => ({ ...mockData.items[0], id: i + 1, fileName: `page-${i + 1}.md`, title: `page-${i + 1}`, fileType: 'markdown' }));
    appState.homeLayout = 'grid'; appState.browseMode = 'all'; appState.appliedSearch = '';
    window.pages = [];
    invoke = async (cmd, args) => { if (cmd === 'list_items') pages.push(args.page); return savedInvoke(cmd, args); };
    await loadItems();
  });
  assert.deepEqual(await page.evaluate(() => pages), [1, 2, 3]);
  assert.equal(await page.locator('[data-open-item]').count(), 205);
  assert.match(await page.locator('#listSummary').innerText(), /205/);
  for (const id of [101, 205]) {
    await page.locator(`[data-open-item="${id}"]`).dblclick();
    await page.waitForFunction(id => getActiveTab()?.id === id, id);
    await page.evaluate(() => showAllFilesHome());
  }
  // A later page failure must not silently publish a successful first page.
  await page.evaluate(async () => {
    invoke = async (cmd, args) => { if (cmd === 'list_items' && args.page === 2) throw Error('PAGE_2_FAILED'); return savedInvoke(cmd, args); };
    await loadItems();
  });
  assert.match(await page.locator('#itemList').innerText(), /PAGE_2_FAILED/);
  // A newer search must supersede an in-flight older page.
  await page.evaluate(async () => {
    let release, entered;
    const blocked = new Promise(resolve => { release = resolve; });
    const started = new Promise(resolve => { entered = resolve; });
    invoke = async (cmd, args) => {
      if (cmd === 'list_items' && !args.keyword && args.page === 2) { entered(); await blocked; }
      return savedInvoke(cmd, args);
    };
    const old = loadItems();
    await started;
    appState.appliedSearch = 'page-205';
    await loadItems(); release();
    window.oldResult = await old;
  });
  assert.equal(await page.evaluate(() => oldResult), 'stale');
  assert.deepEqual(await page.evaluate(() => appState.items.map(x => x.id)), [205]);
  console.log('205 real DOM cards, opening 101/205, later-page failure and stale search passed.');
} finally { await browser.close(); }
