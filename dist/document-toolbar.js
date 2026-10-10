(function () {
  const key = 'nutbook.documentToolbar.v1';
  const allowed = { markdown: ['format-markdown', 'export-markdown-center', 'export-markdown'], html: ['prepare-native-presentation', 'toggle-runtime-presentation'] };
  const svg = (path) => `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
  const icons = {
    pin: svg('<path d="m7 3 6 0-1 5 3 3H5l3-3-1-5ZM10 11v6"/>'),
    fullscreen: svg('<path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4"/>'),
    exitFullscreen: svg('<path d="M3 7h4V3m6 0v4h4M7 17v-4H3m10 4v-4h4"/>'),
    presentation: svg('<rect x="3" y="4" width="14" height="9" rx="1.5"/><path d="M10 13v4m-3 0h6"/>')
  };
  function normalize(value) {
    return Object.fromEntries(Object.entries(allowed).map(([type, ids]) => [type, [...new Set(Array.isArray(value?.[type]) ? value[type] : [])].filter(id => ids.includes(id)).slice(0, 3)]));
  }
  function read(storage) { try { return normalize(JSON.parse((storage || globalThis.localStorage).getItem(key))); } catch { return normalize(null); } }
  function save(storage, value) { storage.setItem(key, JSON.stringify(normalize(value))); }
  function capacity(width) { return width >= 760 ? 3 : width >= 620 ? 2 : width >= 480 ? 1 : 0; }
  function labels(language) { return language === 'en-US' ? { pin: 'Pin to toolbar', unpin: 'Unpin from toolbar', limit: 'Up to 3 shortcuts. Unpin one first.', unavailable: 'Unavailable while editing' } : { pin: '固定到工具栏', unpin: '取消固定', limit: '最多固定 3 项，请先取消一项', unavailable: '编辑时暂不可用' }; }
  globalThis.NutbookDocumentToolbar = { allowed, icons, normalize, read, save, capacity, labels };
})();
