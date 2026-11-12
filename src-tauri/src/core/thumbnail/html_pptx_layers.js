async (mode, index) => {
  const state = window.__nutbookPptxCapture;
  if (!state) throw Error("Slide objects unavailable");
  state.style?.remove();
  state.selected?.removeAttribute("data-nutbook-pptx-isolate");
  const maskImages = mode === "background";
  const maskText = maskImages || mode === "dark-matte" || mode === "light-matte";
  for (const node of state.images) node.toggleAttribute("data-nutbook-pptx-mask", maskImages);
  for (const node of [...state.tables, ...state.charts]) node.toggleAttribute("data-nutbook-pptx-mask", maskText);
  for (const node of state.texts) node.toggleAttribute("data-nutbook-pptx-mask-text", maskText);
  for (const node of state.highlights) node.toggleAttribute("data-nutbook-pptx-mask-highlight", maskText);
  for (const node of state.boxes) node.toggleAttribute("data-nutbook-pptx-mask-box", maskText);
  if (mode === "restore") {
    delete window.__nutbookPptxCapture;
    return;
  }
  const hideText = `
    [data-nutbook-pptx-mask-text], [data-nutbook-pptx-mask-text] * {
      -webkit-text-fill-color: transparent!important;
      -webkit-text-stroke-color: transparent!important;
      text-shadow: none!important;
      text-decoration-color: transparent!important;
    }
    [data-nutbook-pptx-mask-highlight], [data-nutbook-pptx-mask-box] {
      background-color: transparent!important;
      box-shadow: none!important;
    }
    [data-nutbook-pptx-mask-box] { border-color: transparent!important; }
  `;
  state.style = document.createElement("style");
  const hideObjects = '[data-nutbook-pptx-mask],[data-nutbook-pptx-mask] *{visibility:hidden!important}';
  if (maskImages) {
    state.style.textContent = hideText + hideObjects;
  } else if (maskText) {
    state.selected = state.images[index];
    state.selected.setAttribute("data-nutbook-pptx-isolate", "");
    const filter = mode === "dark-matte" ? "brightness(0)" : "brightness(0) invert(1)";
    state.style.textContent = hideText + hideObjects + `[data-nutbook-pptx-isolate]{filter:${filter}!important}`;
  } else {
    state.selected = state.images[index];
    state.selected.setAttribute("data-nutbook-pptx-isolate", "");
    state.style.textContent = `
      html, body {background: transparent!important}
      body *, body *::before, body *::after {visibility:hidden!important}
      [data-nutbook-pptx-isolate], [data-nutbook-pptx-isolate] *,
      [data-nutbook-pptx-isolate]::before, [data-nutbook-pptx-isolate]::after {
        visibility:visible!important
      }
    `;
  }
  document.head.append(state.style);
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}
