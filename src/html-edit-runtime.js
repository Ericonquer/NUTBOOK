(function () {
  const STATE = {
    sessionId: "",
    editing: false,
    dirty: false,
    selectedDataId: null,
    baseline: new Map(),
    changes: new Map()
  };

  function editableElements() {
    return Array.from(document.querySelectorAll("[data-editable][data-id]"));
  }

  function scanEditableElements() {
    const seen = new Set();
    const duplicates = [];
    const elements = editableElements();
    for (const element of elements) {
      const id = element.getAttribute("data-id") || "";
      if (seen.has(id)) duplicates.push(id);
      seen.add(id);
    }
    return { count: elements.length, duplicates };
  }

  function textOf(element) {
    return element.textContent || "";
  }

  function selectorFor(dataId) {
    return `[data-id="${CSS.escape(dataId)}"]`;
  }

  function enter(payload) {
    STATE.sessionId = payload.runtimeSessionId;
    STATE.editing = true;
    STATE.dirty = false;
    STATE.selectedDataId = null;
    STATE.baseline.clear();
    STATE.changes.clear();

    for (const element of editableElements()) {
      if (element.getAttribute("data-editable") !== "text") continue;
      const id = element.getAttribute("data-id");
      STATE.baseline.set(id, textOf(element));
      element.setAttribute("contenteditable", "plaintext-only");
      element.setAttribute("data-nutbook-editing", "text");
      element.addEventListener("focus", onFocus, true);
      element.addEventListener("input", onInput, true);
      element.addEventListener("blur", onBlur, true);
    }
    installShortcutCapture();
    applyPatch(payload.patch);
    notifyReady();
  }

  function normalizeExitOptions(options) {
    if (typeof options === "string") {
      return { runtimeSessionId: options, discard: false };
    }
    if (options && typeof options === "object") {
      return {
        runtimeSessionId: options.runtimeSessionId || "",
        discard: Boolean(options.discard)
      };
    }
    return { runtimeSessionId: "", discard: false };
  }

  function exit(options = {}) {
    const exitOptions = normalizeExitOptions(options);
    if (exitOptions.runtimeSessionId && exitOptions.runtimeSessionId !== STATE.sessionId) return;
    for (const element of editableElements()) {
      const id = element.getAttribute("data-id");
      if (exitOptions.discard && element.getAttribute("data-editable") === "text" && STATE.baseline.has(id)) {
        element.textContent = STATE.baseline.get(id);
      }
      element.removeAttribute("contenteditable");
      element.removeAttribute("data-nutbook-editing");
      element.removeEventListener("focus", onFocus, true);
      element.removeEventListener("input", onInput, true);
      element.removeEventListener("blur", onBlur, true);
    }
    STATE.editing = false;
    STATE.dirty = false;
    STATE.selectedDataId = null;
    STATE.changes.clear();
    window.removeEventListener("keydown", onKeyDownCapture, true);
  }

  function normalizeMarkSavedOptions(options) {
    if (typeof options === "string") {
      return { runtimeSessionId: options, expectedChangesJson: "" };
    }
    if (options && typeof options === "object") {
      return {
        runtimeSessionId: options.runtimeSessionId || "",
        expectedChangesJson: options.expectedChangesJson || ""
      };
    }
    return { runtimeSessionId: "", expectedChangesJson: "" };
  }

  function markSaved(options = {}) {
    const saveOptions = normalizeMarkSavedOptions(options);
    if (saveOptions.runtimeSessionId && saveOptions.runtimeSessionId !== STATE.sessionId) return false;
    if (saveOptions.expectedChangesJson && JSON.stringify(collectChanges()) !== saveOptions.expectedChangesJson) {
      reportState();
      return false;
    }
    for (const element of editableElements()) {
      if (element.getAttribute("data-editable") !== "text") continue;
      const id = element.getAttribute("data-id");
      STATE.baseline.set(id, textOf(element));
    }
    STATE.dirty = false;
    STATE.changes.clear();
    reportState();
    return true;
  }

  function onFocus(event) {
    STATE.selectedDataId = event.currentTarget.getAttribute("data-id");
    reportState();
  }

  function onBlur() {
    STATE.selectedDataId = null;
    reportState();
  }

  function onInput(event) {
    const element = event.currentTarget;
    const id = element.getAttribute("data-id");
    const original = STATE.baseline.get(id) || "";
    const text = textOf(element);
    if (text === original) {
      STATE.changes.delete(id);
    } else {
      STATE.changes.set(id, {
        type: "text",
        selector: selectorFor(id),
        originalTextHash: "",
        text
      });
    }
    STATE.dirty = STATE.changes.size > 0;
    reportState();
  }

  function collectChanges() {
    return Object.fromEntries(STATE.changes.entries());
  }

  function applyPatch(patch) {
    if (!patch || !patch.changes) return;
    for (const [id, change] of Object.entries(patch.changes)) {
      if (change.type !== "text") continue;
      const element = document.querySelector(selectorFor(id));
      if (!element) continue;
      element.textContent = change.text || "";
      STATE.baseline.set(id, textOf(element));
    }
  }

  function installShortcutCapture() {
    window.removeEventListener("keydown", onKeyDownCapture, true);
    window.addEventListener("keydown", onKeyDownCapture, true);
  }

  function onKeyDownCapture(event) {
    if (!STATE.editing) return;
    const key = event.key;
    const blocked = ["f", "F", "s", "S", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", "Enter"];
    if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === "s") {
      event.preventDefault();
      event.stopPropagation();
      emitHostMessage({
        type: "html_edit_save_requested_from_runtime",
        runtimeSessionId: STATE.sessionId
      });
      return;
    }
    if (isEditableEventTarget(event.target)) return;
    if (blocked.includes(key)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function isEditableEventTarget(target) {
    for (let node = target; node; node = node.parentElement) {
      if (node.getAttribute && node.getAttribute("data-nutbook-editing")) return true;
    }
    return false;
  }

  function reportState() {
    emitHostMessage({
      type: "html_edit_state_changed",
      runtimeSessionId: STATE.sessionId,
      dirty: STATE.dirty,
      selectedDataId: STATE.selectedDataId,
      changes: collectChanges()
    });
  }

  function notifyReady() {
    emitHostMessage({
      type: "html_edit_ready",
      runtimeSessionId: STATE.sessionId,
      ...scanEditableElements(),
      shortcutsIntercepted: true
    });
  }

  function emitHostMessage(payload) {
    const previousTitle = document.title;
    const messageTitle = `__NUTBOOK_HTML_EDIT_RUNTIME__:${JSON.stringify(payload)}`;
    document.title = messageTitle;
    setTimeout(() => {
      if (document.title === messageTitle) {
        document.title = previousTitle;
      }
    }, 80);
  }

  window.__NUTBOOK_HTML_EDIT__ = {
    scanEditableElements,
    enter,
    exit,
    markSaved,
    rebaseSaved: markSaved,
    collectChanges,
    applyPatch
  };
})();
