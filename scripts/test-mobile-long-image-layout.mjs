// First generate artifacts with the ignored Rust long_image_mobile_export_evidence test.
import { chromium } from 'playwright';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const root = resolve(process.env.NUTBOOK_LONG_IMAGE_EVIDENCE || '/tmp/nutbook-mobile-export-review');
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [800, 1080, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(pathToFileURL(resolve(root, `layout-${width}.html`)).href);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode()));
    });
    const metrics = await page.evaluate(() => {
      const article = document.querySelector('article');
      const font = parseFloat(getComputedStyle(article).fontSize);
      const footer = document.querySelector('footer');
      const footerFont = parseFloat(getComputedStyle(footer).fontSize);
      const logo = footer.querySelector('.footer-logo').getBoundingClientRect();
      return { logoRatio: logo.width / footerFont, gapRatio: parseFloat(getComputedStyle(footer).gap) / footerFont, font, chars: article.getBoundingClientRect().width / font,
        height: document.documentElement.scrollHeight,
        overflow: document.documentElement.scrollWidth > innerWidth,
        end: article.textContent.includes('END-OF-MOBILE-EXPORT') };
    });
    assert(metrics.chars >= 20 && metrics.chars <= 24, JSON.stringify(metrics));
    assert(!metrics.overflow && metrics.end);
    assert(Math.abs(metrics.logoRatio - 74 / 12) < 0.01, 'footer logo must scale with footer text');
    assert(Math.abs(metrics.gapRatio - 7 / 12) < 0.01, 'footer gap must scale with footer text');
    for (const quality of ['standard', 'high']) {
      const files = (await readdir(root)).filter(name => name.startsWith(`mobile-${width}-${quality}`) && name.endsWith('.png')).sort();
      assert(files.length > 0);
      const scale = quality === 'high' ? 2 : 1;
      let totalHeight = 0;
      for (const name of files) {
        const png = await readFile(resolve(root, name));
        assert.equal(png.readUInt32BE(16), width * scale);
        const height = png.readUInt32BE(20);
        assert(height < 15000, `${name} exceeds the pixel budget`);
        if (files.length > 1) {
          const top = Math.floor(width * scale / 5);
          const bottom = Math.floor(width * scale / 8);
          const pixelPage = await browser.newPage();
          const safe = await pixelPage.evaluate(async ({ base64, top, bottom }) => {
            const image = new Image(); image.src = `data:image/png;base64,${base64}`;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth; canvas.height = 1;
            const ctx = canvas.getContext('2d');
            return [0, top - 1, image.naturalHeight - bottom, image.naturalHeight - 1].every(y => {
              ctx.drawImage(image, 0, y, image.naturalWidth, 1, 0, 0, canvas.width, 1);
              const pixels = ctx.getImageData(0, 0, canvas.width, 1).data;
              return pixels.every((value, index) => value === pixels[index % 4]);
            });
          }, { base64: png.toString('base64'), top, bottom });
          await pixelPage.close();
          assert(safe, `${name} has content in its safe margins`);
          totalHeight += height - top - bottom;
        } else { totalHeight += height; }
      }
      // The trimmed footer still lies below all document text. Detect missing tails.
      assert(totalHeight / scale >= metrics.height - 120, `truncated ${width}/${quality}: ${totalHeight / scale} < ${metrics.height}`);
    }
    console.log(`${width}: ${metrics.chars.toFixed(2)} CJK/line, ${metrics.height}px, standard/high PNG dimensions and tail passed`);
    await page.close();
  }
  // Show the actual exported PNG at phone width, rather than a re-rendered layout.
  const preview = await browser.newPage({ viewport: { width: 414, height: 1200 }, deviceScaleFactor: 2 });
  await preview.goto(pathToFileURL(resolve(root, 'layout-1080.html')).href);
  await preview.setContent(`<html><body style="margin:0;background:white"><img style="display:block;width:414px;height:auto" src="${pathToFileURL(resolve(root, 'mobile-1080-standard.png')).href}"></body></html>`);
  await preview.locator('img').evaluate(image => image.decode());
  await preview.screenshot({ path: resolve(root, 'phone-preview.png') });
  await preview.setViewportSize({ width: 414, height: 220 });
  await preview.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await preview.screenshot({ path: resolve(root, 'footer-preview.png') });
  const splitFile = (await readdir(root)).filter(name => name.startsWith('mobile-1080-high-02-of-') && name.endsWith('.png')).sort()[0];
  if (splitFile) {
    await preview.setViewportSize({ width: 414, height: 300 });
    await preview.setContent(`<html><body style="margin:0;background:white"><img style="display:block;width:414px;height:auto" src="${pathToFileURL(resolve(root, splitFile)).href}"></body></html>`);
    await preview.locator('img').evaluate(image => image.decode());
    await preview.evaluate(() => scrollTo(0, 0));
    await preview.screenshot({ path: resolve(root, 'split-top-preview.png') });
    await preview.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await preview.screenshot({ path: resolve(root, 'split-bottom-preview.png') });
  }
  await preview.close();
} finally { await browser.close(); }
