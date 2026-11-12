pageId => {
  const copy = document.documentElement.cloneNode(true);
  const canvasCopies = copy.querySelectorAll("canvas");
  for (const [index, canvas] of [...document.querySelectorAll("canvas")].entries()) {
    if (!canvas.getClientRects().length) continue;
    const target = canvasCopies[index];
    const image = document.createElement("img");
    for (const attr of target.attributes) image.setAttribute(attr.name, attr.value);
    image.src = canvas.toDataURL();
    if (image.src === "data:,") throw Error("The canvas could not be captured: " + pageId);
    const css = getComputedStyle(canvas);
    image.style.width = css.width;
    image.style.height = css.height;
    target.replaceWith(image);
  }
  copy.querySelectorAll("script,iframe,object,embed,base,meta[http-equiv]").forEach(node => node.remove());
  copy.querySelectorAll("[data-nutbook-page-id]").forEach(node => {
    if (node.dataset.nutbookPageId !== pageId) node.remove();
  });
  const base = document.createElement("base");
  base.href = document.baseURI;
  copy.querySelector("head").prepend(base);
  const policy = document.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content = "default-src 'none'; style-src 'unsafe-inline' " + location.origin
    + "; img-src data: " + location.origin + "; font-src data: " + location.origin + "; base-uri " + location.origin;
  copy.querySelector("head").prepend(policy);
  const style = document.createElement("style");
  style.textContent = "html,body{overflow:hidden!important}*,*::before,*::after{animation:none!important;transition:none!important;print-color-adjust:exact}";
  copy.querySelector("head").append(style);
  return "<!doctype html>" + copy.outerHTML;
}
