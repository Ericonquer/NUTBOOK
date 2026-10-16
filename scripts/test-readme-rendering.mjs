import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';

const root = process.cwd();
const mime = { '.png': 'image/png', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.md': 'text/plain' };
const server = http.createServer((request, response) => {
  const file = resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
  if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  try { response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'text/plain' }).end(readFileSync(file)); }
  catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
try {
  for (const file of ['README.md', 'README-CN.md']) {
    const markdown = readFileSync(file, 'utf8');
    assert.match(readFileSync('LICENSE', 'utf8'), /Apache License[\s\S]*Version 2\.0/);
    assert.match(markdown, /NUTBOOK is licensed under the Apache License 2\.0/);
    assert.match(markdown, /THIRD\\_PARTY\\_LICENSES\.md/);
    assert.doesNotMatch(markdown, /\[MIT\]/);
    assert.match(markdown, /<https:\/\/github\.com\/user-attachments\/assets\/45dcfef4-44c4-4ec1-888a-c47404995a72>/);
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    await page.goto(`${origin}/${file}`);
    await page.setContent('<style>#editor{width:1000px}.nutbook-text-align-center{text-align:center}</style><div id="editor"></div>');
    await page.addScriptTag({ content: readFileSync('dist/assets/markdown-editor.js', 'utf8'), type: 'module' });
    await page.waitForFunction(() => window.NutbookMarkdownEditor?.create);
    const result = await page.evaluate(async markdown => {
      const root = document.getElementById('editor');
      window.editor = await NutbookMarkdownEditor.create({ root, markdown, resolveImageSrc: src => new URL(src, location.href).href });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return {
        raw: [...root.querySelectorAll('span[data-type="html"]')].map(node => node.textContent),
        aligned: [...root.querySelectorAll('[data-type="aligned-text-block"]')].map(node => getComputedStyle(node).textAlign),
        baseline: editor.getBaselineMarkdown()
      };
    }, markdown);
    assert.deepEqual(result.raw, [], `${file}: unsupported HTML must not appear as source text`);
    assert.deepEqual(result.aligned, ['center', 'center', 'center', 'center'], `${file}: title, positioning, benefit and links must be centered`);
    assert.match(result.baseline, /Apache License 2\.0/);
    assert.match(result.baseline, /45dcfef4-44c4-4ec1-888a-c47404995a72/);
    // The editor also mounts empty image-control placeholders; count authored images separately.
    const expectedImages = (markdown.match(/!\[/g) || []).length + 1;
    await page.waitForFunction(expected => {
      const images = [...document.querySelectorAll('#editor img')].filter(image => image.getAttribute('src'));
      return images.length === expected && images.every(image => image.complete && image.naturalWidth > 0);
    }, expectedImages);
    await page.close();
    console.log(`${file}: actual editor render, images, alignment, license and product video passed`);
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
