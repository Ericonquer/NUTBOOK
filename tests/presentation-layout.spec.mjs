import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

test.setTimeout(120_000);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function exportFixture(...modes) {
  return execFileSync(
    "cargo",
    ["run", "--quiet", "--example", "export_presentation_layout_fixture", ...(modes.length ? ["--", ...modes] : [])],
    { cwd: path.join(root, "src-tauri"), encoding: "utf8" },
  );
}

test("long Chinese cover title wraps inside the slide", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 675 });
  await page.setContent(exportFixture());
  const cover = page.locator(".slide .cover-title").first();
  await cover.evaluate((node) => {
    node.textContent = "做了十几年营销策划人后，我被AI逼着做了一个管理Markdown和HTML的软件";
  });
  const metrics = await cover.evaluate((node) => {
    const title = node.getBoundingClientRect();
    const slide = node.closest(".slide").getBoundingClientRect();
    return { titleRight: title.right, slideRight: slide.right, lines: title.height / Number.parseFloat(getComputedStyle(node).lineHeight), scrollWidth: node.scrollWidth, clientWidth: node.clientWidth };
  });
  expect(metrics.lines).toBeGreaterThan(1.5);
  expect(metrics.titleRight).toBeLessThanOrEqual(metrics.slideRight);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
});

test("full figure image stays above the footer as the slide narrows", async ({ page }) => {
  await page.setContent(exportFixture());
  await page.evaluate(() => {
    const slide = document.createElement("section");
    slide.className = "slide figure density-balanced is-active";
    slide.innerHTML = `<h2 class="slide-title">概览</h2><div class="figure-layout full"><div class="figure-media"><p><img alt="Cover" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'%3E%3C/svg%3E"></p></div></div><div class="deck-footer"><span>sample.md</span><span>3/3</span></div>`;
    document.querySelector(".deck").append(slide);
  });
  for (const [width, height] of [[1519, 960], [1200, 675], [900, 650], [720, 500]]) {
    await page.setViewportSize({ width, height });
    const metrics = await page.locator(".slide.figure.is-active").evaluate((slide) => {
      const image = slide.querySelector("img").getBoundingClientRect();
      const footer = slide.querySelector(".deck-footer").getBoundingClientRect();
      const frame = slide.getBoundingClientRect();
      return { imageTop: image.top, imageBottom: image.bottom, imageLeft: image.left, imageRight: image.right, footerTop: footer.top, frameTop: frame.top, frameLeft: frame.left, frameRight: frame.right };
    });
    expect(metrics.imageTop).toBeGreaterThanOrEqual(metrics.frameTop);
    expect(metrics.imageBottom).toBeLessThanOrEqual(metrics.footerTop);
    expect(metrics.imageLeft).toBeGreaterThanOrEqual(metrics.frameLeft);
    expect(metrics.imageRight).toBeLessThanOrEqual(metrics.frameRight);
  }
});

test("physical list layouts keep cards readable and balanced", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 675 });
  await page.setContent(exportFixture());

  const four = page.locator('.slide[data-topic-title="四项短文案"] .list-card-layout');
  const fourFlow = page.locator('.slide[data-topic-title="四项短文案"] .list-card-flow');
  await expect(four).toHaveAttribute("data-layout", "stacked-grid");
  await expect(fourFlow).toHaveAttribute("style", /--card-cols: 4;/);
  const fourGeometry = await fourFlow.evaluate((flow) => {
    const slide = flow.closest(".slide");
    const group = flow.getBoundingClientRect();
    const frame = slide.getBoundingClientRect();
    return {
      centerDelta: Math.abs(group.top + group.height / 2 - (frame.top + frame.height / 2)),
      frameHeight: frame.height,
    };
  });
  expect(fourGeometry.centerDelta).toBeLessThanOrEqual(fourGeometry.frameHeight * 0.16);

  const five = page.locator('.slide[data-topic-title="五项带解释"] .list-card-layout');
  const fiveFlow = page.locator('.slide[data-topic-title="五项带解释"] .list-card-flow');
  await expect(five).toHaveAttribute("data-layout", "side-by-side-stack");
  await expect(fiveFlow).toHaveAttribute("data-vertical-position", "centered");
  const fiveCards = five.locator(".list-card");
  await expect(fiveCards).toHaveCount(5);
  const fiveGeometry = await five.evaluate((layout) => {
    const slide = layout.closest(".slide");
    const card = layout.querySelector(".list-card");
    return {
      cardWidth: card.getBoundingClientRect().width,
      slideWidth: slide.getBoundingClientRect().width,
    };
  });
  expect(fiveGeometry.cardWidth).toBeLessThan(fiveGeometry.slideWidth * 0.7);

  for (const card of await fiveCards.all()) {
    const metrics = await card.evaluate((node) => ({
      height: node.getBoundingClientRect().height,
      scrollHeight: node.scrollHeight,
    }));
    expect(metrics.height).toBeGreaterThanOrEqual(76);
    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.height + 1);
  }

  const sevenCounts = await page
    .locator('.slide[data-topic-title="七项带解释"] .list-card-grid')
    .evaluateAll((grids) => grids.map((grid) => Number(grid.dataset.cardCount)));
  expect(sevenCounts).toEqual([4, 3]);
});

test("README list-card pages use the persisted physical layout plan", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 675 });
  await page.setContent(exportFixture("readme"));

  for (const title of ["1. 内容统一管理", "2. 强化阅读体验", "3. 强化展示能力", "当前支持什么"]) {
    const layouts = page.locator(`.slide[data-topic-title="${title}"] .list-card-layout`);
    expect(await layouts.count(), title).toBeGreaterThan(0);
    for (const layout of await layouts.all()) {
      await expect(layout).toHaveAttribute("data-layout", /stacked-grid|side-by-side-stack/);
      await expect(layout.locator("xpath=.." )).toHaveAttribute("style", /--card-row-height: (76|96|116)px;/);
    }
  }
});

test("4:3 keeps a chosen side-by-side layout as two columns", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 675 });
  await page.setContent(exportFixture("4-3"));

  const layout = page.locator('.slide[data-topic-title="五项带解释"] .list-card-layout');
  await expect(layout).toHaveAttribute("data-layout", "side-by-side-stack");
  const geometry = await layout.evaluate((node) => {
    const columns = getComputedStyle(node).gridTemplateColumns.trim().split(/\s+/);
    const copy = node.querySelector(".list-card-copy").getBoundingClientRect();
    const grid = node.querySelector(".list-card-grid").getBoundingClientRect();
    return { columns: columns.length, copyWidth: copy.width, gridWidth: grid.width };
  });
  expect(geometry.columns).toBe(2);
  expect(geometry.copyWidth).toBeGreaterThan(0);
  expect(geometry.gridWidth).toBeGreaterThan(0);
});
