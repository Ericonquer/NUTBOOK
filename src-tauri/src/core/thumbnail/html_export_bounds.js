async id => {
  await document.fonts.ready;
  await new Promise(resolve => requestAnimationFrame(resolve));
  const page = document.querySelector('[data-nutbook-page-id="' + CSS.escape(id) + '"]');
  if (!page || window.__NUTBOOK_PRESENTATION__.activePageId !== id) return null;
  const { x, y, width, height } = page.getBoundingClientRect();
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}
