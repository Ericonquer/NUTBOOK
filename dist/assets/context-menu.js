(() => {
  let pending;
  window.__NUTBOOK_CONTEXT_ACTION__ = (token, action) => {
    if (!pending || pending.token !== token) return;
    const context = pending;
    pending = null;
    if (!context.target.isConnected) return;
    if (context.run) return Promise.resolve(context.run(action)).catch(console.error);
    if (action === 'undo' || action === 'redo') {
      const editor = window.__NUTBOOK_HTML_EDIT__;
      if (editor?.isEditing()) return action === 'undo' ? editor.undoHistory() : editor.redoHistory();
      context.target.focus?.();
      document.execCommand(action);
    }
    if (action === 'find') window.__TAURI_INTERNALS__?.invoke('context_find_in_document').catch(console.error);
  };
  window.addEventListener('contextmenu', (event) => {
    // A page-owned menu takes precedence. Do not interfere with its interaction.
    if (event.defaultPrevented) return;
    const invoke = window.__TAURI_INTERNALS__?.invoke;
    if (!invoke) return;
    const target = event.target instanceof Element ? event.target : document.body;
    const editable = target.closest('input, textarea, [contenteditable]');
    // The HTML editor owns a document-level editing session. Its selected
    // element need not itself carry contenteditable, so route every right
    // click in that session through Nutbook's compact editing menu instead
    // of letting WebKit expose unsupported replace/font/developer commands.
    const htmlEditing = Boolean(window.__NUTBOOK_HTML_EDIT__?.isEditing?.());
    const pageContext = window.__NUTBOOK_CONTEXT_PROVIDER__?.(target);
    const context = htmlEditing
      ? { kind: 'edit', target }
      : pageContext
      || (editable ? { kind: 'edit', target } : null)
      // Runtime child webviews do not host the main-page context provider.
      // Keep their read mode just as constrained as editing mode so WebKit's
      // query/translate/inspect and unsupported formatting menu never leaks.
      || (typeof window.__NUTBOOK_CONTEXT_PROVIDER__ === 'function' ? null : { kind: 'read', target });
    // The main app supplies a compact application menu for its remaining
    // chrome so WebView's development context menu never leaks into the UI.
    if (!context) return;
    const token = crypto.randomUUID();
    pending = { ...context, token, target };
    event.preventDefault();
    invoke('show_context_menu', {
      kind: context.kind, token, language: context.language || null,
      selected: Boolean(window.getSelection()?.toString()) || Boolean(editable && editable.selectionEnd > editable.selectionStart),
      favorite: context.favorite ?? null,
    }).catch((error) => { pending = null; console.error('Context menu failed', error); });
  });
})();
