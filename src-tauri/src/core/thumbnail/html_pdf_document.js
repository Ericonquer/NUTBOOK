(width, height) => {
  const style = document.createElement("style");
  style.textContent = `
    @page { size: ${width}px ${height}px; margin: 0; }
    html, body { margin: 0; padding: 0; background: white; }
    section { position: relative; width: ${width}px; height: ${height}px; overflow: hidden; break-inside: avoid; break-after: page; }
    section:last-child { break-after: auto; }
    iframe { position: absolute; display: block; border: 0; }`;
  document.head.append(style);
  window.appendPrintPage = async (pageId, snapshot, width, height, viewportWidth, viewportHeight, x, y) => {
    const wrap = document.createElement("section");
    const frame = document.createElement("iframe");
    // Recreate the viewport used to measure responsive slides, and clip to
    // the slide itself rather than changing the iframe's layout viewport.
    Object.assign(frame.style, {
      width: viewportWidth + "px", height: viewportHeight + "px",
      left: -x + "px", top: -y + "px"
    });
    frame.setAttribute("sandbox", "allow-same-origin");
    const ready = new Promise(resolve => frame.addEventListener("load", resolve, { once: true }));
    frame.srcdoc = snapshot;
    wrap.append(frame);
    document.body.append(wrap);
    await ready;
    const doc = frame.contentDocument;
    if ([...doc.querySelectorAll('link[rel="stylesheet"]')].some(link => !link.disabled && !link.sheet)) {
      throw Error("Stylesheet unavailable: " + pageId);
    }
    await doc.fonts.ready;
    await Promise.all([...doc.images].map(async image => {
      image.loading = "eager";
      await image.decode();
    }));
    const backgrounds = new Set();
    for (const element of doc.body.querySelectorAll("*")) {
      if (!element.getClientRects().length) continue;
      const style = frame.contentWindow.getComputedStyle(element);
      for (const match of style.backgroundImage.matchAll(/url\("([^"]+)"\)/g)) backgrounds.add(match[1]);
    }
    await Promise.all([...backgrounds].map(async url => {
      const image = doc.createElement("img");
      image.src = url;
      try {
        await image.decode();
      } catch {
        throw Error("Background image unavailable: " + pageId);
      }
    }));
    if ([...doc.fonts].some(font => font.status === "error")) throw Error("Font unavailable: " + pageId);
    const rect = doc.querySelector("[data-nutbook-page-id]")?.getBoundingClientRect();
    if (!rect || Math.abs(rect.x - x) > 1 || Math.abs(rect.y - y) > 1
        || Math.abs(rect.width - width) > 1 || Math.abs(rect.height - height) > 1) {
      throw Error("Printed page does not fit the slide canvas: " + pageId);
    }
    return true;
  };
}
