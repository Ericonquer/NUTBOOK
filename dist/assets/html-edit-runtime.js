(function () {
  const VALID_FORMAT_COMMANDS = new Set([
    "bold", "italic", "paragraph", "heading-1", "heading-2", "heading-3", "heading-4",
    "align-left", "align-center", "align-right", "unordered-list", "ordered-list"
  ]);
  const ALLOWED_RICH_TAGS = new Set(["P", "BR", "STRONG", "EM", "H1", "H2", "H3", "H4", "UL", "OL", "LI"]);
  const STATE = {
    sessionId: "", editing: false, dirty: false, selectedDataId: null,
    baseline: new Map(), changes: new Map(), savedSelection: null, formatState: emptyFormatState()
  };

  function emptyFormatState() {
    return { canFormat: false, bold: false, italic: false, block: "paragraph", textAlign: "left", list: null };
  }
  function editableElements() { return Array.from(document.querySelectorAll("[data-editable][data-id]")); }
  function editableTextElements() { return editableElements().filter((element) => element.getAttribute("data-editable") === "text"); }
  function editableRichTextElements() { return editableElements().filter((element) => element.getAttribute("data-editable") === "rich-text"); }
  function scanEditableElements() {
    const seen = new Set(); const duplicates = [];
    for (const element of editableElements()) { const id = element.getAttribute("data-id") || ""; if (seen.has(id)) duplicates.push(id); seen.add(id); }
    return { count: editableElements().length, duplicates };
  }
  function textOf(element) { return element.textContent || ""; }
  function selectorFor(dataId) { return `[data-id="${CSS.escape(dataId)}"]`; }
  function canonicalHash(value) { let hash = 2166136261; for (const char of String(value || "")) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(16); }
  function richHtmlOf(element) { normalizeRichTextField(element); return element.innerHTML; }
  function isValidatedRichHtml(html) {
    if (typeof html !== "string") return false;
    const holder = document.createElement("div"); holder.innerHTML = html;
    for (const node of holder.querySelectorAll("*")) {
      if (!ALLOWED_RICH_TAGS.has(node.tagName) || node.attributes.length) return false;
    }
    return holder.innerHTML === html;
  }

  function enter(payload) {
    STATE.sessionId = payload.runtimeSessionId; STATE.editing = true; STATE.dirty = false; STATE.selectedDataId = null;
    STATE.baseline.clear(); STATE.changes.clear(); clearSavedSelection();
    for (const element of editableTextElements()) setupEditable(element, "text");
    for (const element of editableRichTextElements()) setupEditable(element, "rich-text");
    installShortcutCapture();
    document.addEventListener("selectionchange", onSelectionChange, true);
    document.addEventListener("beforeinput", onBeforeInput, true);
    applyPatch(payload.patch); notifyReady();
  }
  function setupEditable(element, type) {
    const id = element.getAttribute("data-id");
    STATE.baseline.set(id, type === "rich-text" ? richHtmlOf(element) : textOf(element));
    element.setAttribute("contenteditable", type === "rich-text" ? "true" : "plaintext-only");
    element.setAttribute("data-nutbook-editing", type);
    element.addEventListener("focus", onFocus, true); element.addEventListener("input", onInput, true); element.addEventListener("blur", onBlur, true);
  }
  function normalizeExitOptions(options) { return typeof options === "string" ? { runtimeSessionId: options, discard: false } : { runtimeSessionId: options?.runtimeSessionId || "", discard: Boolean(options?.discard) }; }
  function exit(options = {}) {
    const exitOptions = normalizeExitOptions(options); if (exitOptions.runtimeSessionId && exitOptions.runtimeSessionId !== STATE.sessionId) return;
    for (const element of editableElements()) {
      const id = element.getAttribute("data-id"); const type = element.getAttribute("data-editable");
      if (exitOptions.discard && STATE.baseline.has(id)) { if (type === "rich-text") element.innerHTML = STATE.baseline.get(id); else element.textContent = STATE.baseline.get(id); }
      element.removeAttribute("contenteditable"); element.removeAttribute("data-nutbook-editing");
      element.removeEventListener("focus", onFocus, true); element.removeEventListener("input", onInput, true); element.removeEventListener("blur", onBlur, true);
    }
    STATE.editing = false; STATE.dirty = false; STATE.selectedDataId = null; STATE.changes.clear(); clearSavedSelection();
    window.removeEventListener("keydown", onKeyDownCapture, true); document.removeEventListener("selectionchange", onSelectionChange, true); document.removeEventListener("beforeinput", onBeforeInput, true);
  }
  function normalizeMarkSavedOptions(options) { return typeof options === "string" ? { runtimeSessionId: options, expectedChangesJson: "" } : { runtimeSessionId: options?.runtimeSessionId || "", expectedChangesJson: options?.expectedChangesJson || "" }; }
  function markSaved(options = {}) {
    const saveOptions = normalizeMarkSavedOptions(options); if (saveOptions.runtimeSessionId && saveOptions.runtimeSessionId !== STATE.sessionId) return false;
    if (saveOptions.expectedChangesJson && JSON.stringify(collectChanges()) !== saveOptions.expectedChangesJson) { reportState(); return false; }
    for (const element of editableElements()) { const id = element.getAttribute("data-id"); STATE.baseline.set(id, element.getAttribute("data-editable") === "rich-text" ? richHtmlOf(element) : textOf(element)); }
    STATE.dirty = false; STATE.changes.clear(); reportState(); return true;
  }
  function onFocus(event) { STATE.selectedDataId = event.currentTarget.getAttribute("data-id"); updateSavedSelection(); reportState(); }
  function onBlur() { setTimeout(() => { updateSavedSelection(); reportState(); }, 0); }
  function onSelectionChange() { if (!STATE.editing) return; updateSavedSelection(); reportState(); }
  function sameRichTextField(range) {
    if (!range) return null;
    const start = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
    const end = range.endContainer.nodeType === Node.ELEMENT_NODE ? range.endContainer : range.endContainer.parentElement;
    const startField = start?.closest?.('[data-editable="rich-text"][data-nutbook-editing="rich-text"]');
    const endField = end?.closest?.('[data-editable="rich-text"][data-nutbook-editing="rich-text"]');
    return startField && startField === endField ? startField : null;
  }
  function updateSavedSelection() {
    const selection = window.getSelection(); const range = selection?.rangeCount ? selection.getRangeAt(0) : null; const field = sameRichTextField(range);
    if (!field) { clearSavedSelection(); return; }
    STATE.savedSelection = { fieldId: field.getAttribute("data-id"), range: range.cloneRange() };
    STATE.selectedDataId = STATE.savedSelection.fieldId; STATE.formatState = computeFormatState(field, range);
  }
  function clearSavedSelection() { STATE.savedSelection = null; STATE.selectedDataId = null; STATE.formatState = emptyFormatState(); }
  function computeFormatState(field, range) {
    let node = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
    const ancestors = []; for (; node && node !== field; node = node.parentElement) ancestors.push(node);
    const block = ancestors.find((entry) => /^(P|H[1-4])$/.test(entry.tagName))?.tagName?.toLowerCase() || "paragraph";
    const list = ancestors.find((entry) => entry.tagName === "UL" || entry.tagName === "OL")?.tagName?.toLowerCase() || null;
    return { canFormat: true, bold: ancestors.some((entry) => entry.tagName === "STRONG" || entry.tagName === "B"), italic: ancestors.some((entry) => entry.tagName === "EM" || entry.tagName === "I"), block: block === "p" ? "paragraph" : block, textAlign: field.style.textAlign || "left", list };
  }
  function onInput(event) { const element = event.currentTarget; if (element.getAttribute("data-editable") === "rich-text") normalizeRichTextField(element); updateChange(element); updateSavedSelection(); reportState(); }
  function updateChange(element) {
    const id = element.getAttribute("data-id"); const type = element.getAttribute("data-editable"); const value = type === "rich-text" ? richHtmlOf(element) : textOf(element); const original = STATE.baseline.get(id) || "";
    if (value === original) STATE.changes.delete(id); else if (type === "rich-text") { const change = { type: "rich_text", selector: selectorFor(id), originalTextHash: canonicalHash(original), html: value }; if (element.style.textAlign) change.textAlign = element.style.textAlign; STATE.changes.set(id, change); } else STATE.changes.set(id, { type: "text", selector: selectorFor(id), originalTextHash: canonicalHash(original), text: value });
    STATE.dirty = STATE.changes.size > 0;
  }
  function collectChanges() { return Object.fromEntries(STATE.changes.entries()); }
  function applyPatch(patch) {
    if (!patch?.changes) return;
    for (const [id, change] of Object.entries(patch.changes)) {
      const element = document.querySelector(selectorFor(id)); if (!element) continue;
      if (change.type === "text" && element.getAttribute("data-editable") === "text") element.textContent = change.text || "";
      if ((change.type === "rich_text" || change.type === "rich-text") && element.getAttribute("data-editable") === "rich-text" && isValidatedRichHtml(change.html)) { element.innerHTML = change.html; normalizeRichTextField(element); if (change.textAlign) element.style.textAlign = change.textAlign; }
      const value = element.getAttribute("data-editable") === "rich-text" ? richHtmlOf(element) : textOf(element); STATE.baseline.set(id, value);
    }
  }
  function onBeforeInput(event) {
    if (!STATE.editing || (event.inputType !== "insertFromPaste" && event.inputType !== "insertFromDrop")) return;
    const range = window.getSelection()?.rangeCount ? window.getSelection().getRangeAt(0) : null; const field = sameRichTextField(range);
    event.preventDefault(); if (!field) return;
    const plainText = event.dataTransfer?.getData("text/plain") || event.clipboardData?.getData("text/plain") || "";
    range.deleteContents(); range.insertNode(document.createTextNode(plainText)); normalizeRichTextField(field); updateChange(field); updateSavedSelection(); reportState();
  }
  function restoreSavedSelection() {
    const saved = STATE.savedSelection; if (!saved || !saved.range) return null;
    const field = document.querySelector(selectorFor(saved.fieldId)); if (!field || !sameRichTextField(saved.range) || sameRichTextField(saved.range) !== field) return null;
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(saved.range); return field;
  }
  function applyFormat(payload) {
    if (!payload || payload.runtimeSessionId !== STATE.sessionId || !VALID_FORMAT_COMMANDS.has(payload.command)) return false;
    const field = restoreSavedSelection(); if (!field || !STATE.savedSelection || STATE.savedSelection.range.collapsed) return false;
    const command = payload.command;
    if (command === "bold") document.execCommand("bold"); else if (command === "italic") document.execCommand("italic");
    else if (command === "paragraph" || command.startsWith("heading-")) document.execCommand("formatBlock", false, command === "paragraph" ? "p" : `h${command.slice(-1)}`);
    else if (command.startsWith("align-")) { field.style.textAlign = command.slice(6); }
    else document.execCommand(command === "unordered-list" ? "insertUnorderedList" : "insertOrderedList");
    normalizeRichTextField(field); updateChange(field); updateSavedSelection(); reportState(); return true;
  }
  function normalizeRichTextField(field) {
    field.querySelectorAll("script,style,template,u").forEach((node) => node.remove());
    field.querySelectorAll("b").forEach((node) => { const replacement = document.createElement("strong"); replacement.innerHTML = node.innerHTML; node.replaceWith(replacement); });
    field.querySelectorAll("i").forEach((node) => { const replacement = document.createElement("em"); replacement.innerHTML = node.innerHTML; node.replaceWith(replacement); });
    for (const node of Array.from(field.querySelectorAll("*"))) { if (!ALLOWED_RICH_TAGS.has(node.tagName)) node.replaceWith(...node.childNodes); else for (const attribute of Array.from(node.attributes)) node.removeAttribute(attribute.name); }
  }
  function installShortcutCapture() { window.removeEventListener("keydown", onKeyDownCapture, true); window.addEventListener("keydown", onKeyDownCapture, true); }
  function onKeyDownCapture(event) { if (!STATE.editing) return; const key = event.key; const blocked = ["f", "F", "s", "S", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", "Enter"]; if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === "s") { event.preventDefault(); event.stopImmediatePropagation(); emitHostMessage({ type: "html_edit_save_requested_from_runtime", runtimeSessionId: STATE.sessionId }); return; } if (event.metaKey || event.ctrlKey || event.altKey || isEditableEventTarget(event.target)) return; if (blocked.includes(key)) { event.preventDefault(); event.stopImmediatePropagation(); } }
  function isEditableEventTarget(target) { for (let node = target; node; node = node.parentElement) if (node.getAttribute?.("data-nutbook-editing")) return true; return false; }
  function reportState() { emitHostMessage({ type: "html_edit_state_changed", runtimeSessionId: STATE.sessionId, dirty: STATE.dirty, selectedDataId: STATE.selectedDataId, formatState: STATE.formatState, changes: collectChanges() }); }
  function notifyReady() { emitHostMessage({ type: "html_edit_ready", runtimeSessionId: STATE.sessionId, ...scanEditableElements(), shortcutsIntercepted: true }); }
  function emitHostMessage(payload) { const previousTitle = document.title; const messageTitle = `__NUTBOOK_HTML_EDIT_RUNTIME__:${JSON.stringify(payload)}`; document.title = messageTitle; setTimeout(() => { if (document.title === messageTitle) document.title = previousTitle; }, 80); }
  window.__NUTBOOK_HTML_EDIT__ = { scanEditableElements, isEditing: () => STATE.editing, enter, exit, markSaved, rebaseSaved: markSaved, collectChanges, applyPatch, applyFormat };
})();
