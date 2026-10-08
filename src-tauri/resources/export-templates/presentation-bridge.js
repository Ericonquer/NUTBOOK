// Embedded into each standalone presentation. Navigation remains owned by the deck.
window.createNutbookPresentationBridge = function createNutbookPresentationBridge(adapter) {
  const pages = adapter.pages.map((page, index) => ({ ...page, index: index + 1 }));
  const ids = new Set(pages.map((page) => page.id));
  if (!pages.length || ids.size !== pages.length || pages.some((page) => !page.id)) {
    throw new Error("Presentation pages need unique, non-empty IDs");
  }
  return {
    version: 1,
    capabilities: { managedPresenter: true },
    pages,
    get activePageId() { return adapter.activePageId(); },
    whenReady() { return Promise.resolve(adapter.whenReady?.() ?? true); },
    goTo(id) { return ids.has(id) ? adapter.goTo(id) : false; },
    subscribe(listener) { return adapter.subscribe(listener); },
    setManagedMode(enabled) { return adapter.setManagedMode(Boolean(enabled)); },
    setEditMode(enabled) { return adapter.setEditMode?.(Boolean(enabled)) ?? true; }
  };
};
