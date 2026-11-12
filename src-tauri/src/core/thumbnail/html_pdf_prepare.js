(async () => {
  const bridge = window.__NUTBOOK_PRESENTATION__;
  if (bridge?.version !== 1 || typeof bridge.whenReady !== "function"
      || typeof bridge.goTo !== "function") throw Error("Presentation bridge unavailable");
  if (await bridge.whenReady() === false) throw Error("Presentation is not ready");
  const pages = bridge.pages?.map(page => page.id);
  const roots = [...document.querySelectorAll("[data-nutbook-page-id]")];
  if (!pages?.length || pages.length > 100 || roots.length !== pages.length
      || pages.some(id => typeof id !== "string" || !id.trim() || id.length > 200)
      || new Set(pages).size !== pages.length
      || new Set(roots.map(root => root.dataset.nutbookPageId)).size !== pages.length
      || roots.some(root => !pages.includes(root.dataset.nutbookPageId))) {
    throw Error("Invalid presentation page list");
  }
  if (bridge.capabilities?.managedPresenter
      && (typeof bridge.setManagedMode !== "function" || await bridge.setManagedMode(true) === false)) {
    throw Error("Managed presentation mode unavailable");
  }
  return pages;
})()
