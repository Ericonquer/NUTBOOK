(function () {
  const VALID_FORMAT_COMMANDS = new Set([
    "bold", "italic", "paragraph", "heading-1", "heading-2", "heading-3", "heading-4",
    "align-left", "align-center", "align-right", "unordered-list", "ordered-list"
  ]);
  const SHORT_FORMAT_COMMANDS = new Set(["bold", "italic", "align-left", "align-center", "align-right"]);
  const ALLOWED_RICH_TAGS = new Set(["P", "BR", "STRONG", "EM", "H1", "H2", "H3", "H4", "UL", "OL", "LI"]);
  const ALLOWED_SHORT_RICH_TAGS = new Set(["BR", "STRONG", "EM"]);
  const STATE = {
    sessionId: "", editing: false, dirty: false, selectedDataId: null,
    baseline: new Map(), changes: new Map(), savedSelection: null, formatState: emptyFormatState(), composing: false,
    inlineToolbar: null, inlineToolbarEnabled: false, inlineToolbarDock: "bottom", inlineToolbarDrag: null, locale: "", saveNotice: "",
    documentRevision: 0, lastCommittedChangesJson: "{}", isMutatingDocument: false, imageButtons: [], sourceHashes: new Map()
  };

  function emptyFormatState(editRole = "plain") {
    return { canFormat: false, bold: false, italic: false, block: "paragraph", textAlign: "left", list: null, editRole };
  }
  // NUTBOOK_HTML_EDIT_DOCKING_START
  function normalizeInlineToolbarDock(dock) { return dock === "left" || dock === "right" || dock === "bottom" ? dock : "bottom"; }
  function resolveInlineToolbarDock({ left, right, viewportWidth, edgeInset, snapDistance }) {
    const leftDistance = Math.abs(left - edgeInset);
    const rightDistance = Math.abs(viewportWidth - edgeInset - right);
    const nearLeft = leftDistance <= snapDistance;
    const nearRight = rightDistance <= snapDistance;
    if (nearLeft && nearRight) return leftDistance <= rightDistance ? "left" : "right";
    if (nearLeft) return "left";
    if (nearRight) return "right";
    return "bottom";
  }
  function clampInlineToolbarOffset(value, toolbarSize, viewportSize, inset) {
    return Math.max(inset, Math.min(value, Math.max(inset, viewportSize - toolbarSize - inset)));
  }
  // NUTBOOK_HTML_EDIT_DOCKING_END
  function editableElements() { return Array.from(document.querySelectorAll("[data-editable][data-id]")); }
  function editRoleOf(element) {
    const role = element.getAttribute("data-edit-role");
    if (role === "short" || role === "content" || role === "plain") return role;
    return element.getAttribute("data-editable") === "rich-text" ? "content" : "plain";
  }
  function isRichEditRole(role) { return role === "short" || role === "content"; }
  function editableTextElements() { return editableElements().filter((element) => element.getAttribute("data-editable") === "text" && editRoleOf(element) === "plain"); }
  function editableRichTextElements() { return editableElements().filter((element) => element.getAttribute("data-editable") === "rich-text" && isRichEditRole(editRoleOf(element))); }
  function editableImageElements() { return Array.from(document.querySelectorAll('img[data-editable="image"][data-id]')); }
  function editableBackgroundImageElements() { return Array.from(document.querySelectorAll('[data-editable="background-image"][data-id]')); }
  function scanEditableElements() {
    const seen = new Set(); const duplicates = [];
    for (const element of [...editableTextElements(), ...editableRichTextElements(), ...editableImageElements(), ...editableBackgroundImageElements()]) { const id = element.getAttribute("data-id") || ""; if (seen.has(id)) duplicates.push(id); seen.add(id); }
    return { count: editableElements().length, duplicates };
  }
  function textOf(element) { return element.textContent || ""; }
  function selectorFor(dataId) { return `[data-id="${CSS.escape(dataId)}"]`; }
  function canonicalHash(value) { let hash = 2166136261; for (const char of String(value || "")) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(16); }
  async function sha256HexUtf8(value) { const bytes = new TextEncoder().encode(String(value || "")); const digest = await crypto.subtle.digest("SHA-256", bytes); return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
  function normalizeTextAlign(value) { return value === "center" || value === "right" ? value : "left"; }
  function effectiveTextAlign(element) { return normalizeTextAlign(getComputedStyle(element).textAlign); }
  function readRichValue(element) {
    return {
      html: element.innerHTML,
      textAlign: effectiveTextAlign(element)
    };
  }
  function readEditableValue(element) { return isRichEditRole(editRoleOf(element)) ? readRichValue(element) : textOf(element); }
  function richBaselineOf(element) { return readRichValue(element); }
  function applyRichBaseline(element, baseline) {
    element.innerHTML = baseline.html;
    element.style.textAlign = baseline.textAlign;
  }
  function isAllowedRichAlignmentAttribute(node, role) {
    return role === "content"
      && /^(P|H[1-4])$/.test(node.tagName)
      && node.attributes.length === 1
      && ["text-align:left", "text-align:center", "text-align:right"].includes(node.getAttribute("style"));
  }
  function isValidatedRichHtml(html, role = "content") {
    if (typeof html !== "string") return false;
    const holder = document.createElement("div"); holder.innerHTML = html;
    for (const node of holder.querySelectorAll("*")) {
      if (!(role === "short" ? ALLOWED_SHORT_RICH_TAGS : ALLOWED_RICH_TAGS).has(node.tagName) || (node.attributes.length && !isAllowedRichAlignmentAttribute(node, role))) return false;
    }
    return holder.innerHTML === html;
  }

  async function enter(payload) {
    STATE.sessionId = payload.runtimeSessionId; STATE.editing = true; STATE.dirty = false; STATE.selectedDataId = null;
    STATE.documentRevision = 0; STATE.lastCommittedChangesJson = "{}"; STATE.isMutatingDocument = false;
    STATE.inlineToolbarEnabled = Boolean(payload.inlineToolbar);
    STATE.locale = payload.locale || document.documentElement.lang || navigator.language || "";
    STATE.baseline.clear(); STATE.changes.clear(); STATE.sourceHashes.clear(); clearSavedSelection(); STATE.inlineToolbarDock = "bottom"; STATE.inlineToolbarDrag = null;
    installEditAffordanceStyles();
    for (const element of editableTextElements()) setupEditable(element, "text");
    for (const element of editableRichTextElements()) setupEditable(element, "rich-text");
    await initializeTextSourceHashes();
    await setupEditableImages();
    installShortcutCapture();
    document.addEventListener("selectionchange", onSelectionChange, true);
    document.addEventListener("beforeinput", onBeforeInput, true);
    applyPatch(payload.patch, payload.runtimeAssetUrls || {}); STATE.lastCommittedChangesJson = stableChangesJson(collectChanges()); if (STATE.inlineToolbarEnabled) mountInlineToolbar(); notifyReady();
  }
  async function initializeTextSourceHashes() {
    const elements = [...editableTextElements(), ...editableRichTextElements()];
    for (let index = 0; index < elements.length; index += 1) {
      const element = elements[index]; const id = element.getAttribute("data-id");
      const source = isRichEditRole(editRoleOf(element)) ? (STATE.baseline.get(id)?.html || "") : (STATE.baseline.get(id) || "");
      STATE.sourceHashes.set(id, await sha256HexUtf8(source));
      if (index % 8 === 7) await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  async function setupEditableImages() {
    const elements = [...editableImageElements(), ...editableBackgroundImageElements()];
    for (let index = 0; index < elements.length; index += 1) {
      const element = elements[index]; const id = element.getAttribute("data-id"); const editableType = element.matches("img") ? "image" : "background-image";
      const baseline = await imageBaselineOf(element, editableType);
      STATE.baseline.set(id, baseline); element.setAttribute("data-nutbook-editing", "image");
      if (editableType === "image" && !hasSupportedPictureSources(element)) {
        element.setAttribute("data-nutbook-image-readonly", "picture-source-candidates");
        continue;
      }
      element.addEventListener("click", onImageEditClick, true);
      addImageAffordance(element, editableType); if (index % 8 === 7) await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  function pictureSources(image) { const picture = image.closest("picture"); return !picture ? [] : Array.from(picture.children).filter((node) => node.tagName === "SOURCE" && node.hasAttribute("srcset")); }
  function hasSingleSourceUrl(value) { return typeof value === "string" && value.trim() && !value.includes(",") && !/\s[0-9]+(?:w|x)(?:\s|$)/.test(value); }
  function hasSupportedPictureSources(image) { return pictureSources(image).every((source) => hasSingleSourceUrl(source.getAttribute("srcset") || "")); }
  function validatePictureSourceSet(image, expectedSources) {
    const baseline = STATE.baseline.get(image.getAttribute("data-id")); const sources = pictureSources(image);
    if (!sources.length) return !expectedSources || !expectedSources.length;
    return Array.isArray(expectedSources) && sources.length === expectedSources.length && sources.length === (baseline?.pictureSources || []).length
      && sources.every((source, index) => hasSingleSourceUrl(source.getAttribute("srcset") || "")
        && expectedSources[index]?.index === index
        && expectedSources[index]?.originalSrcsetHash === baseline.pictureSources[index]?.originalSrcsetHash);
  }
  async function imageBaselineOf(element, editableType) {
    if (editableType === "background-image") { const style = element.getAttribute("style") || ""; return { type: editableType, originalStyle: style, currentStyle: style, originalStyleHash: await sha256HexUtf8(style) }; }
    const sources = pictureSources(element); const sourceBaselines = await Promise.all(sources.map(async (source, index) => { const srcset = source.getAttribute("srcset") || ""; return { index, originalSrcset: srcset, currentSrcset: srcset, originalSrcsetHash: await sha256HexUtf8(srcset) }; }));
    const src = element.getAttribute("src") || ""; const inlineStyle = element.getAttribute("style") || ""; return { type: editableType, originalSrc: src, currentSrc: src, originalInlineStyle: inlineStyle, currentInlineStyle: inlineStyle, originalSrcHash: await sha256HexUtf8(src), pictureSources: sourceBaselines };
  }
  function imageTargetState(element) { return !element.getAttribute("src") && element.getAttribute("data-image-slot") === "empty" ? "empty" : element.hasAttribute("data-nutbook-asset-relative-path") ? "imported" : "source"; }
  function isEmptyImageSlot(element) { return element.getAttribute("data-image-slot") === "empty"; }
  function imageSlotHeight(element) { const height = Math.round(element.parentElement?.getBoundingClientRect().height || 0); return Math.min(320, Math.max(120, height || 180)); }
  function constrainImportedImageLayout(element) {
    if (!element?.matches?.('img[data-editable="image"]')) return;
    element.style.setProperty("max-width", "100%", "important");
    element.style.setProperty("box-sizing", "border-box", "important");
    if (!isEmptyImageSlot(element)) return;
    element.style.setProperty("display", "block", "important");
    element.style.setProperty("width", "100%", "important");
    element.style.setProperty("height", `${imageSlotHeight(element)}px`, "important");
    element.style.setProperty("object-fit", "cover", "important");
  }
  function findEditableImageTarget(dataId, editableType) { const element = document.querySelector(selectorFor(dataId)); return element && ((editableType === "image" && element.matches('img[data-editable="image"]')) || (editableType === "background-image" && element.matches('[data-editable="background-image"]'))) ? element : null; }
  function onImageEditClick(event) { if (event.target !== event.currentTarget) return; const element = event.currentTarget; requestImageReplacement(element, element.matches("img") ? "image" : "background-image"); }
  function requestImageReplacement(element, editableType) { if (!STATE.editing) return; const dataId = element.getAttribute("data-id"); emitHostMessage({ type: "html_edit_asset_replace_requested", runtimeSessionId: STATE.sessionId, dataId, editableType, targetState: imageTargetState(element) }); }
  function addImageAffordance(element, editableType) { const button = document.createElement("button"); button.type = "button"; button.className = "nutbook-html-edit-image-action"; button.textContent = imageTargetState(element) === "empty" ? "插入图片" : "替换图片"; button.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); requestImageReplacement(element, editableType); }); element.insertAdjacentElement("afterend", button); STATE.imageButtons.push(button); }
  function isAllowedAssetRelativePath(path) { return /^\.nutbook\/html-edit\/assets\/html-edit-[A-Za-z0-9-]+\/[a-f0-9]{64}\.(png|jpe?g|gif|webp)$/.test(String(path || "")); }
  function writeRuntimeImageUrl(element, editableType, runtimeUrl) { if (editableType === "background-image") element.style.backgroundImage = `url(${JSON.stringify(runtimeUrl)})`; else element.setAttribute("src", runtimeUrl); }
  function applyImportedAsset({ runtimeSessionId, dataId, editableType, relativePath, runtimeUrl }) { if (!STATE.editing || runtimeSessionId !== STATE.sessionId) return false; const element = findEditableImageTarget(dataId, editableType); if (!element || !isAllowedAssetRelativePath(relativePath) || !/^https?:\/\//.test(String(runtimeUrl || ""))) return false; if (editableType === "image") { const baseline = STATE.baseline.get(dataId); const currentSources = pictureSources(element); if (!canApplyPictureSources(element, currentSources, baseline?.pictureSources || [])) return false; constrainImportedImageLayout(element); writeRuntimeImageUrl(element, editableType, runtimeUrl); applyPictureSources(element, runtimeUrl, currentSources, baseline?.pictureSources || []); } else writeRuntimeImageUrl(element, editableType, runtimeUrl); element.setAttribute("data-nutbook-asset-relative-path", relativePath); recomputeChanges(); STATE.documentRevision += 1; emitHostMessage({ type: "html_edit_document_changed", ...stateSnapshot() }); return true; }
  function canApplyPictureSources(image, currentSources, originalSources) { const sources = pictureSources(image); return sources.length === currentSources.length && sources.length === originalSources.length && sources.every((source, index) => source.getAttribute("srcset") === currentSources[index].getAttribute("srcset")); }
  function applyPictureSources(image, runtimeUrl, currentSources, originalSources) { if (!canApplyPictureSources(image, currentSources, originalSources)) return null; for (const source of pictureSources(image)) source.setAttribute("srcset", runtimeUrl); return originalSources.map((source) => ({ index: source.index, originalSrcsetHash: source.originalSrcsetHash })); }
  function setupEditable(element, type) {
    const id = element.getAttribute("data-id"); const role = editRoleOf(element);
    STATE.baseline.set(id, type === "rich-text" ? richBaselineOf(element) : textOf(element));
    element.setAttribute("contenteditable", type === "rich-text" ? "true" : "plaintext-only");
    element.setAttribute("data-nutbook-editing", type);
    element.setAttribute("data-nutbook-edit-role-label", editRoleLabel(role));
    if (element.hasAttribute("aria-description")) {
      element.setAttribute("data-nutbook-had-aria-description", "true");
      element.setAttribute("data-nutbook-original-aria-description", element.getAttribute("aria-description") || "");
    }
    element.setAttribute("aria-description", editRoleLabel(role));
    element.addEventListener("focus", onFocus, true); element.addEventListener("input", onInput, true); element.addEventListener("blur", onBlur, true);
    element.addEventListener("compositionstart", onCompositionStart, true); element.addEventListener("compositionend", onCompositionEnd, true);
  }
  function normalizeExitOptions(options) { return typeof options === "string" ? { runtimeSessionId: options, discard: false } : { runtimeSessionId: options?.runtimeSessionId || "", discard: Boolean(options?.discard) }; }
  function exit(options = {}) {
    const exitOptions = normalizeExitOptions(options); if (exitOptions.runtimeSessionId && exitOptions.runtimeSessionId !== STATE.sessionId) return;
    for (const element of [...editableTextElements(), ...editableRichTextElements()]) {
      const id = element.getAttribute("data-id"); const type = isRichEditRole(editRoleOf(element)) ? "rich-text" : "text";
      if (exitOptions.discard && STATE.baseline.has(id)) { if (type === "rich-text") applyRichBaseline(element, STATE.baseline.get(id)); else element.textContent = STATE.baseline.get(id); }
      element.removeAttribute("contenteditable"); element.removeAttribute("data-nutbook-editing");
      element.removeAttribute("data-nutbook-edit-role-label");
      if (element.getAttribute("data-nutbook-had-aria-description") === "true") element.setAttribute("aria-description", element.getAttribute("data-nutbook-original-aria-description") || "");
      else element.removeAttribute("aria-description");
      element.removeAttribute("data-nutbook-had-aria-description"); element.removeAttribute("data-nutbook-original-aria-description");
      element.removeEventListener("focus", onFocus, true); element.removeEventListener("input", onInput, true); element.removeEventListener("blur", onBlur, true);
      element.removeEventListener("compositionstart", onCompositionStart, true); element.removeEventListener("compositionend", onCompositionEnd, true);
    }
    for (const element of [...editableImageElements(), ...editableBackgroundImageElements()]) {
      const id = element.getAttribute("data-id"); const baseline = STATE.baseline.get(id);
      if (exitOptions.discard && baseline) restoreImageBaseline(element, baseline);
      element.removeAttribute("data-nutbook-editing"); element.removeEventListener("click", onImageEditClick, true); element.removeEventListener("focus", onImageEditClick, true);
    }
    STATE.imageButtons.splice(0).forEach((button) => button.remove());
    unmountInlineToolbar(); removeEditAffordanceStyles();
    STATE.editing = false; STATE.dirty = false; STATE.selectedDataId = null; STATE.changes.clear(); STATE.composing = false; STATE.isMutatingDocument = false; STATE.inlineToolbarDock = "bottom"; STATE.inlineToolbarDrag = null; clearSavedSelection();
    document.title = STATE.runtimeTitle || document.location.pathname.split("/").pop() || "Nutbook Runtime";
    window.removeEventListener("keydown", onKeyDownCapture, true); document.removeEventListener("selectionchange", onSelectionChange, true); document.removeEventListener("beforeinput", onBeforeInput, true);
  }
  function normalizeMarkSavedOptions(options) { return typeof options === "string" ? { runtimeSessionId: options, expectedChangesJson: "" } : { runtimeSessionId: options?.runtimeSessionId || "", expectedChangesJson: options?.expectedChangesJson || "" }; }
  function markSaved(options = {}) {
    const saveOptions = normalizeMarkSavedOptions(options); if (saveOptions.runtimeSessionId && saveOptions.runtimeSessionId !== STATE.sessionId) return false;
    recomputeChanges();
    if (saveOptions.expectedChangesJson && stableChangesJson(collectChanges()) !== saveOptions.expectedChangesJson) { reportState(); return false; }
    for (const element of [...editableTextElements(), ...editableRichTextElements()]) STATE.baseline.set(element.getAttribute("data-id"), readEditableValue(element));
    for (const element of [...editableImageElements(), ...editableBackgroundImageElements()]) {
      const id = element.getAttribute("data-id"); const baseline = STATE.baseline.get(id); if (!baseline) continue;
      if (baseline.type === "image") { baseline.currentSrc = element.getAttribute("src") || ""; baseline.currentInlineStyle = element.getAttribute("style") || ""; baseline.pictureSources.forEach((source, index) => { source.currentSrcset = pictureSources(element)[index]?.getAttribute("srcset") || ""; }); }
      else baseline.currentStyle = element.getAttribute("style") || "";
    }
    STATE.dirty = false; STATE.changes.clear(); STATE.lastCommittedChangesJson = stableChangesJson({}); STATE.documentRevision += 1; STATE.saveNotice = "saved"; syncInlineToolbar();
    emitHostMessage({ type: "html_edit_document_changed", ...stateSnapshot() }); return true;
  }
  function onFocus(event) { const field = event.currentTarget; STATE.selectedDataId = field.getAttribute("data-id"); STATE.formatState = emptyFormatState(editRoleOf(field)); updateSavedSelection(); syncInlineToolbar(); }
  function onBlur() { syncInlineToolbar(); }
  function onSelectionChange() { if (!STATE.editing || STATE.isMutatingDocument) return; updateSavedSelection(); syncInlineToolbar(); }
  function mountInlineToolbar() {
    if (STATE.inlineToolbar) return;
    const host = document.createElement("div"); host.id = "nutbook-html-edit-inline-toolbar";
    const root = host.attachShadow({ mode: "closed" });
    document.documentElement.append(host); STATE.inlineToolbar = { host, root }; window.addEventListener("resize", onInlineToolbarViewportChange); buildInlineToolbar(); syncInlineToolbar();
  }
  function inlineCommandsForRole(role) {
    if (role === "short") return ["bold", "italic", "align-left", "align-center", "align-right"];
    if (role === "content") return ["bold", "italic", "paragraph", "heading-1", "heading-2", "heading-3", "heading-4", "align-left", "align-center", "align-right", "unordered-list", "ordered-list"];
    return [];
  }
  function inlineToolbarText(key) {
    const chinese = String(STATE.locale || "").toLowerCase().startsWith("zh");
    const copy = chinese
      ? { toolbar: "HTML 编辑工具栏", move: "移动工具栏", save: "保存", saved: "已保存", done: "完成", textEditing: "文本编辑", bold: "加粗", italic: "斜体", paragraph: "正文", "heading-1": "一级标题", "heading-2": "二级标题", "heading-3": "三级标题", "heading-4": "四级标题", "align-left": "左对齐", "align-center": "居中", "align-right": "右对齐", "unordered-list": "无序列表", "ordered-list": "有序列表" }
      : { toolbar: "HTML Edit Toolbar", move: "Move toolbar", save: "Save", saved: "Saved", done: "Done", textEditing: "Text editing", bold: "Bold", italic: "Italic", paragraph: "Paragraph", "heading-1": "Heading 1", "heading-2": "Heading 2", "heading-3": "Heading 3", "heading-4": "Heading 4", "align-left": "Align Left", "align-center": "Align Center", "align-right": "Align Right", "unordered-list": "Bullet List", "ordered-list": "Ordered List" };
    return copy[key] || key;
  }
  function inlineToolbarIcon(command) {
    const icons = {
      bold: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4h4.3c2 0 3.2 1 3.2 2.6 0 1.1-.6 1.9-1.5 2.2 1.3.3 2.1 1.3 2.1 2.7 0 1.9-1.4 3.2-3.6 3.2H6V4Zm2.2 4h1.9c.8 0 1.2-.4 1.2-1.1 0-.7-.5-1.1-1.3-1.1H8.2V8Zm0 5h2.1c.9 0 1.5-.5 1.5-1.3 0-.9-.6-1.3-1.6-1.3h-2V13Z" fill="currentColor"/></svg>',
      italic: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M9.1 4h6l-.3 1.7h-1.9l-1.8 8.6H13L12.7 16h-6l.3-1.7h1.9l1.8-8.6H8.8L9.1 4Z" fill="currentColor"/></svg>',
      paragraph: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15V5h5.2a3.1 3.1 0 0 1 0 6H5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "heading-1": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14.7 15V8.2l-1.7.9" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "heading-2": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.1 9.1c.4-.7 1-1 1.9-1 1.1 0 1.9.7 1.9 1.7 0 .8-.5 1.4-1.4 2.1l-2.3 2.1h3.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "heading-3": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.2 8.7c.4-.4 1-.6 1.7-.6 1.1 0 1.9.6 1.9 1.5 0 .8-.6 1.3-1.4 1.4.9.1 1.6.7 1.6 1.6 0 1-.9 1.8-2.1 1.8-.8 0-1.5-.2-2-.7" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "heading-4": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16.2 14.5V8.2l-3.5 4.3h4.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      "align-left": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M4 8h8.5M4 11.5h12M4 15h8.5" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>',
      "align-center": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M6.2 8h7.6M4 11.5h12M6.2 15h7.6" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>',
      "align-right": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M7.5 8H16M4 11.5h12M7.5 15H16" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>',
      "unordered-list": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 6h8M8 10h8M8 14h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="4.8" cy="6" r="1" fill="currentColor"/><circle cx="4.8" cy="10" r="1" fill="currentColor"/><circle cx="4.8" cy="14" r="1" fill="currentColor"/></svg>',
      "ordered-list": '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 6h8M8 10h8M8 14h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4.3 7V4.5l-.8.4M3.5 9.2c.2-.3.6-.5 1-.5.7 0 1.1.4 1.1 1 0 .4-.3.8-.8 1.2l-1.2.9h2M3.6 13.2c.2-.2.5-.3.9-.3.7 0 1.1.3 1.1.8 0 .4-.3.7-.8.8.6.1 1 .4 1 .9 0 .6-.5 1-1.3 1-.4 0-.8-.1-1.1-.3" fill="none" stroke="currentColor" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    };
    return icons[command] || "";
  }
  function selectedInlineToolbarRole() {
    const field = STATE.selectedDataId && document.querySelector(selectorFor(STATE.selectedDataId));
    return field ? editRoleOf(field) : "plain";
  }
  function buildInlineToolbar() {
    const toolbar = STATE.inlineToolbar; if (!toolbar) return;
    const tooltip = (key) => `<span class="tooltip" role="tooltip">${inlineToolbarText(key)}</span>`;
    const commandButtons = Array.from(VALID_FORMAT_COMMANDS).map((command) => `<button class="command" data-command="${command}" aria-label="${inlineToolbarText(command)}">${inlineToolbarIcon(command)}${tooltip(command)}</button>`).join("");
    toolbar.root.innerHTML = `<style>:host{all:initial}.bar{position:fixed;z-index:2147483646;display:flex;flex-wrap:wrap;justify-content:center;width:max-content;max-width:calc(100vw - 32px);gap:6px;align-items:center;overflow:visible;padding:8px;background:#fff;border:1px solid #e4e4e7;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.18);font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.bar[data-dock="bottom"]{left:50%;bottom:20px;transform:translateX(-50%)}.bar[data-dock="left"]{left:16px;top:50%;transform:translateY(-50%)}.bar[data-dock="right"]{right:16px;top:50%;transform:translateY(-50%)}.bar[data-dragging="true"]{cursor:grabbing}.commands{display:flex;min-width:0;gap:2px;flex-wrap:wrap;justify-content:center;overflow:visible}.bar button{position:relative;border:0;border-radius:7px;background:#ededed;color:#000;padding:7px 9px;cursor:pointer;white-space:nowrap;transition:background .16s ease,transform .16s ease,box-shadow .16s ease}.bar button:not([disabled]):hover,.bar button:not([disabled]):focus-visible{background:#e2e2e2;transform:translateY(-1px);outline:none}.bar .drag-handle{width:24px;min-width:24px;padding:0;background:transparent;cursor:grab;touch-action:none;font-size:15px;line-height:28px}.bar .drag-handle:hover,.bar .drag-handle:focus-visible{background:#e9e9e9}.bar .command{width:28px;min-width:28px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:transparent}.bar .command:hover,.bar .command:focus-visible{background:#e9e9e9}.bar .command svg{width:16px;height:16px;display:block}.bar button[hidden]{display:none}.bar button[disabled]{cursor:default;opacity:.45}.bar .primary{background:#000;color:#fff}.bar .primary:hover,.bar .primary:focus-visible{background:#252525}.tooltip{position:absolute;z-index:2;left:50%;bottom:calc(100% + 8px);transform:translate(-50%,3px);padding:5px 7px;border-radius:6px;background:#1d1d1f;color:#fff;font-size:11px;font-weight:500;line-height:1.2;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .14s ease,transform .14s ease}.bar button:hover .tooltip,.bar button:focus-visible .tooltip{opacity:1;transform:translate(-50%,0)}.status{color:#71717a;padding:0 3px;white-space:nowrap}</style><div class="bar" role="toolbar" aria-label="${inlineToolbarText("toolbar")}"><button class="drag-handle" data-intent="drag-handle" type="button" aria-label="${inlineToolbarText("move")}">${tooltip("move")}<span aria-hidden="true">⠿</span></button><div class="commands">${commandButtons}<span class="status" data-text-editing hidden>${inlineToolbarText("textEditing")}</span></div><span class="status" data-saved hidden role="status" aria-live="polite">${inlineToolbarText("saved")}</span><button data-intent="save" class="primary" aria-label="${inlineToolbarText("save")}">${inlineToolbarText("save")}${tooltip("save")}</button><button data-intent="done" aria-label="${inlineToolbarText("done")}">${inlineToolbarText("done")}${tooltip("done")}</button></div>`;
    const saveButton = toolbar.root.querySelector('[data-intent="save"]');
    const doneButton = toolbar.root.querySelector('[data-intent="done"]');
    const dragHandle = toolbar.root.querySelector('[data-intent="drag-handle"]');
    dragHandle.innerHTML = `${tooltip("move")}<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="6" cy="5" r="1.25" fill="currentColor"/><circle cx="10" cy="5" r="1.25" fill="currentColor"/><circle cx="14" cy="5" r="1.25" fill="currentColor"/><circle cx="6" cy="10" r="1.25" fill="currentColor"/><circle cx="10" cy="10" r="1.25" fill="currentColor"/><circle cx="14" cy="10" r="1.25" fill="currentColor"/><circle cx="6" cy="15" r="1.25" fill="currentColor"/><circle cx="10" cy="15" r="1.25" fill="currentColor"/><circle cx="14" cy="15" r="1.25" fill="currentColor"/></svg>`;
    dragHandle.innerHTML = `${tooltip("move")}<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="7" cy="5" r="1.35" fill="currentColor"/><circle cx="13" cy="5" r="1.35" fill="currentColor"/><circle cx="7" cy="10" r="1.35" fill="currentColor"/><circle cx="13" cy="10" r="1.35" fill="currentColor"/><circle cx="7" cy="15" r="1.35" fill="currentColor"/><circle cx="13" cy="15" r="1.35" fill="currentColor"/></svg>`;
    const dragPalette = document.createElement("style");
    dragPalette.textContent = ".bar .drag-handle{color:#9ca3af;width:20px;min-width:20px;height:24px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:transparent}.bar .drag-handle svg{width:14px;height:14px}.bar .drag-handle:hover,.bar .drag-handle:focus-visible{color:#3f3f46;background:#f4f4f5}.bar[data-dock=\"left\"],.bar[data-dock=\"right\"]{flex-direction:column;flex-wrap:nowrap;max-height:calc(100vh - 32px);padding:6px 4px;gap:4px}.bar[data-dock=\"left\"] .commands,.bar[data-dock=\"right\"] .commands{flex-direction:column;flex-wrap:nowrap;overflow-y:auto;overflow-x:visible;min-height:0;max-height:calc(100vh - 132px);align-items:center}.bar[data-dock=\"left\"] button[data-intent],.bar[data-dock=\"right\"] button[data-intent]{flex:0 0 auto}.bar[data-dock=\"left\"] .status,.bar[data-dock=\"right\"] .status{display:none}";
    dragPalette.textContent += ".bar[data-dock=\"left\"] .drag-handle svg,.bar[data-dock=\"right\"] .drag-handle svg{transform:rotate(90deg)}.bar[data-dock=\"left\"] .commands,.bar[data-dock=\"right\"] .commands{overflow-y:auto;overflow-x:hidden;scrollbar-width:none}.bar[data-dock=\"left\"] .commands::-webkit-scrollbar,.bar[data-dock=\"right\"] .commands::-webkit-scrollbar{display:none}.bar .action-icon{width:28px;min-width:28px;height:28px;padding:0;display:inline-flex;align-items:center;justify-content:center}.bar .action-icon svg{width:16px;height:16px}";
    dragPalette.textContent += ".bar[data-dock=\"left\"] .tooltip{left:calc(100% + 8px);top:50%;bottom:auto;transform:translate(3px,-50%)}.bar[data-dock=\"left\"] button:hover .tooltip,.bar[data-dock=\"left\"] button:focus-visible .tooltip{transform:translate(0,-50%)}.bar[data-dock=\"right\"] .tooltip{left:auto;right:calc(100% + 8px);top:50%;bottom:auto;transform:translate(-3px,-50%)}.bar[data-dock=\"right\"] button:hover .tooltip,.bar[data-dock=\"right\"] button:focus-visible .tooltip{transform:translate(0,-50%)}";
    dragPalette.textContent += ".bar[data-dock=\"left\"] .tooltip,.bar[data-dock=\"right\"] .tooltip{display:none}.bar button[disabled] .tooltip{display:none}.side-tooltip{position:fixed;z-index:2147483647;padding:5px 7px;border-radius:6px;background:#1d1d1f;color:#fff;font:500 11px/1.2 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;white-space:nowrap;pointer-events:none}";
    toolbar.root.append(dragPalette);
    const sideTooltip = document.createElement("div"); sideTooltip.className = "side-tooltip"; sideTooltip.setAttribute("data-side-tooltip", ""); sideTooltip.hidden = true; toolbar.root.append(sideTooltip);
    saveButton.classList.add("action-icon"); doneButton.classList.add("action-icon");
    saveButton.innerHTML = `${tooltip("save")}<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3h8l3 3v11H4V3h1ZM7 3v6h6V5.5L12 3M7 17v-5h6v5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>`;
    doneButton.innerHTML = `${tooltip("done")}<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 10 3.1 3.1L15.5 5.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    dragHandle.addEventListener("pointerdown", startInlineToolbarDrag);
    dragHandle.addEventListener("pointermove", moveInlineToolbarDrag);
    dragHandle.addEventListener("pointerup", finishInlineToolbarDrag);
    dragHandle.addEventListener("pointercancel", finishInlineToolbarDrag);
    toolbar.root.querySelectorAll("button[data-command]").forEach((button) => {
      button.addEventListener("pointerdown", (event) => { event.preventDefault(); });
      button.addEventListener("click", (event) => { event.preventDefault(); applyInlineFormat(button.dataset.command); });
    });
    toolbar.root.querySelectorAll("button").forEach((button) => {
      button.addEventListener("pointerenter", showInlineToolbarSideTooltip);
      button.addEventListener("pointerleave", hideInlineToolbarSideTooltip);
      button.addEventListener("focus", showInlineToolbarSideTooltip);
      button.addEventListener("blur", hideInlineToolbarSideTooltip);
    });
    saveButton.addEventListener("click", () => emitHostMessage({ type: "html_edit_save_requested_from_runtime", runtimeSessionId: STATE.sessionId }));
    doneButton.addEventListener("click", (event) => { event.preventDefault(); emitHostMessage({ type: "html_edit_done_requested_from_runtime", ...stateSnapshot() }); });
  }
  function syncInlineToolbar() {
    const root = STATE.inlineToolbar?.root; if (!root) return;
    const selected = STATE.selectedDataId && document.querySelector(selectorFor(STATE.selectedDataId));
    const isTextSelected = selected?.getAttribute("data-editable") === "text" || selected?.getAttribute("data-editable") === "rich-text";
    const role = selectedInlineToolbarRole(); const commands = new Set(inlineCommandsForRole(role)); const canFormat = STATE.formatState.canFormat && commands.size > 0;
    root.querySelectorAll("button[data-command]").forEach((button) => { button.hidden = !commands.has(button.dataset.command); button.disabled = !canFormat; });
    root.querySelector("[data-text-editing]").hidden = commands.size > 0 || !isTextSelected;
    root.querySelector("[data-saved]").hidden = STATE.saveNotice !== "saved";
    syncInlineToolbarPosition();
  }
  function syncInlineToolbarPosition() {
    const bar = STATE.inlineToolbar?.root.querySelector(".bar"); if (!bar) return;
    bar.dataset.dock = normalizeInlineToolbarDock(STATE.inlineToolbarDock); hideInlineToolbarSideTooltip(); delete bar.dataset.dragging;
    bar.style.removeProperty("left"); bar.style.removeProperty("right"); bar.style.removeProperty("top"); bar.style.removeProperty("bottom"); bar.style.removeProperty("transform");
  }
  function showInlineToolbarSideTooltip(event) {
    const dock = normalizeInlineToolbarDock(STATE.inlineToolbarDock); if (dock === "bottom") return;
    const root = STATE.inlineToolbar?.root; const tooltipLayer = root?.querySelector("[data-side-tooltip]"); if (!tooltipLayer) return;
    const button = event.currentTarget; const label = button.getAttribute("aria-label") || ""; if (!label) return;
    const rect = button.getBoundingClientRect(); tooltipLayer.textContent = label; tooltipLayer.hidden = false; tooltipLayer.style.top = `${rect.top + rect.height / 2}px`;
    if (dock === "left") { tooltipLayer.style.left = `${rect.right + 8}px`; tooltipLayer.style.transform = "translateY(-50%)"; }
    else { tooltipLayer.style.left = `${rect.left - 8}px`; tooltipLayer.style.transform = "translate(-100%,-50%)"; }
  }
  function hideInlineToolbarSideTooltip() { const tooltipLayer = STATE.inlineToolbar?.root?.querySelector("[data-side-tooltip]"); if (tooltipLayer) tooltipLayer.hidden = true; }
  function startInlineToolbarDrag(event) {
    if (!STATE.editing || event.button !== 0) return;
    const bar = STATE.inlineToolbar?.root.querySelector(".bar"); if (!bar) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    STATE.inlineToolbarDrag = { pointerId: event.pointerId, bar }; bar.dataset.dragging = "true";
  }
  function moveInlineToolbarDrag(event) {
    const drag = STATE.inlineToolbarDrag; if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault(); const rect = drag.bar.getBoundingClientRect();
    const left = clampInlineToolbarOffset(event.clientX - rect.width / 2, rect.width, window.innerWidth, 16);
    const top = clampInlineToolbarOffset(event.clientY - rect.height / 2, rect.height, window.innerHeight, 16);
    drag.bar.style.left = `${left}px`; drag.bar.style.top = `${top}px`; drag.bar.style.right = "auto"; drag.bar.style.bottom = "auto"; drag.bar.style.transform = "none";
  }
  function finishInlineToolbarDrag(event) {
    const drag = STATE.inlineToolbarDrag; if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault(); const rect = drag.bar.getBoundingClientRect();
    STATE.inlineToolbarDock = event.type === "pointercancel" ? "bottom" : resolveInlineToolbarDock({ left: rect.left, right: rect.right, viewportWidth: window.innerWidth, edgeInset: 16, snapDistance: 48 });
    STATE.inlineToolbarDrag = null; syncInlineToolbarPosition();
  }
  function onInlineToolbarViewportChange() { if (STATE.editing && !STATE.inlineToolbarDrag) syncInlineToolbarPosition(); }
  function unmountInlineToolbar() { window.removeEventListener("resize", onInlineToolbarViewportChange); STATE.inlineToolbar?.host?.remove(); STATE.inlineToolbar = null; STATE.inlineToolbarEnabled = false; STATE.inlineToolbarDrag = null; }
  function rangeIsInsideField(field, range) { return sameRichTextField(range) === field; }
  function selectNodeContents(node) { const selection = window.getSelection(); const next = document.createRange(); next.selectNodeContents(node); selection.removeAllRanges(); selection.addRange(next); }
  function rangeExactlySelectsMark(range, mark) {
    const markRange = document.createRange(); markRange.selectNodeContents(mark);
    return range.compareBoundaryPoints(Range.START_TO_START, markRange) === 0
      && range.compareBoundaryPoints(Range.END_TO_END, markRange) === 0;
  }
  function rangeSelectsEntireMarkText(range, mark) {
    if (!mark.textContent || range.toString() !== mark.textContent) return false;
    const markRange = document.createRange(); markRange.selectNodeContents(mark);
    return range.compareBoundaryPoints(Range.START_TO_START, markRange) >= 0
      && range.compareBoundaryPoints(Range.END_TO_END, markRange) <= 0;
  }
  function closestInlineMark(node, field, tagName) {
    let current = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    while (current && current !== field) {
      if (current.tagName === tagName.toUpperCase()) return current;
      current = current.parentElement;
    }
    return null;
  }
  function unwrapInlineMark(mark) {
    const nodes = Array.from(mark.childNodes); if (!nodes.length) { mark.remove(); return; }
    mark.replaceWith(...nodes);
    const selection = window.getSelection(); const range = document.createRange();
    range.setStartBefore(nodes[0]); range.setEndAfter(nodes[nodes.length - 1]);
    selection.removeAllRanges(); selection.addRange(range);
  }
  function mergeNestedInlineMarks(field) {
    for (const tagName of ["strong", "em"]) {
      for (const nested of Array.from(field.querySelectorAll(`${tagName} ${tagName}`))) nested.replaceWith(...nested.childNodes);
    }
  }
  function rangeCoversNodeContents(range, node) {
    const nodeRange = document.createRange(); nodeRange.selectNodeContents(node);
    return range.compareBoundaryPoints(Range.START_TO_START, nodeRange) <= 0
      && range.compareBoundaryPoints(Range.END_TO_END, nodeRange) >= 0;
  }
  function normalizeSelectedText(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
  function rangeCoversSelectedBlocks(range, blocks) {
    if (blocks.every((block) => rangeCoversNodeContents(range, block))) return true;
    return normalizeSelectedText(range.toString()) === normalizeSelectedText(blocks.map((block) => block.textContent).join(" "));
  }
  function blockContentsAreEntirelyMarked(block, tagName) {
    const children = Array.from(block.childNodes).filter((node) => node.nodeType !== Node.TEXT_NODE || node.textContent.trim());
    return children.length === 1 && children[0].nodeType === Node.ELEMENT_NODE && children[0].tagName === tagName.toUpperCase();
  }
  function toggleInlineMarkAcrossSelectedBlocks(field, range, tagName) {
    const blocks = selectedDirectBlocks(field, range).filter((block) => /^(P|H[1-4])$/.test(block.tagName));
    if (!blocks.length || !rangeCoversSelectedBlocks(range, blocks)) return false;
    const removeMark = blocks.every((block) => blockContentsAreEntirelyMarked(block, tagName));
    for (const block of blocks) {
      if (removeMark) block.firstElementChild.replaceWith(...block.firstElementChild.childNodes);
      else { const mark = document.createElement(tagName); mark.append(...Array.from(block.childNodes)); block.append(mark); }
    }
    selectContentsAcross(blocks[0], blocks[blocks.length - 1]); return true;
  }
  function toggleInlineMark(field, range, tagName) {
    if (range.collapsed || !rangeIsInsideField(field, range)) return false;
    if (toggleInlineMarkAcrossSelectedBlocks(field, range, tagName)) return true;
    const startMark = closestInlineMark(range.startContainer, field, tagName);
    const endMark = closestInlineMark(range.endContainer, field, tagName);
    if (startMark && startMark === endMark && (rangeExactlySelectsMark(range, startMark) || rangeSelectsEntireMarkText(range, startMark))) {
      unwrapInlineMark(startMark); return true;
    }
    const fragment = range.extractContents(); const mark = document.createElement(tagName); mark.append(fragment); range.insertNode(mark);
    mergeNestedInlineMarks(field); selectNodeContents(mark); return true;
  }
  function directChild(field, node) {
    let current = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    while (current && current.parentElement !== field) current = current.parentElement;
    return current?.parentElement === field ? current : null;
  }
  function boundaryChild(field, container, offset, edge) {
    if (container === field) {
      const nodes = Array.from(field.childNodes); const step = edge === "end" ? -1 : 1;
      for (let index = edge === "end" ? offset - 1 : offset; index >= 0 && index < nodes.length; index += step) {
        if (nodes[index].nodeType === Node.ELEMENT_NODE) return nodes[index];
      }
      return null;
    }
    const child = directChild(field, container); if (!child) return null;
    const isText = container.nodeType === Node.TEXT_NODE;
    if (edge === "end" && ((isText && offset === 0) || (!isText && offset === 0))) return child.previousElementSibling || child;
    if (edge === "start" && isText && offset === container.textContent.length) return child.nextElementSibling || child;
    return child;
  }
  function selectedDirectBlocks(field, range) {
    const children = Array.from(field.children).filter((node) => /^(P|H[1-4]|UL|OL)$/.test(node.tagName));
    const first = boundaryChild(field, range.startContainer, range.startOffset, "start");
    const last = boundaryChild(field, range.endContainer, range.endOffset, "end");
    const startIndex = children.indexOf(first); const endIndex = children.indexOf(last);
    return startIndex < 0 || endIndex < startIndex ? [] : children.slice(startIndex, endIndex + 1);
  }
  function selectContentsAcross(first, last) {
    const selection = window.getSelection(); const next = document.createRange();
    next.setStartBefore(first); next.setEndAfter(last); selection.removeAllRanges(); selection.addRange(next);
  }
  function replaceSelectedBlocks(field, range, tagName) {
    if (editRoleOf(field) !== "content") return false;
    const blocks = selectedDirectBlocks(field, range).filter((block) => /^(P|H[1-4])$/.test(block.tagName)); if (!blocks.length) return false;
    const replacements = blocks.map((block) => {
      const replacement = document.createElement(tagName);
      const alignment = block.getAttribute("style"); if (alignment) replacement.setAttribute("style", alignment);
      replacement.append(...Array.from(block.childNodes)); block.replaceWith(replacement); return replacement;
    });
    selectContentsAcross(replacements[0], replacements[replacements.length - 1]); return true;
  }
  function setInlineBlockAlignment(field, range, align) {
    if (editRoleOf(field) === "short") { field.style.textAlign = align; return true; }
    const blocks = selectedDirectBlocks(field, range).filter((block) => /^(P|H[1-4])$/.test(block.tagName)); if (!blocks.length) return false;
    for (const block of blocks) block.setAttribute("style", `text-align:${align}`);
    selectContentsAcross(blocks[0], blocks[blocks.length - 1]); return true;
  }
  function areContiguousSiblings(nodes) {
    return nodes.every((node, index) => index === 0 || nodes[index - 1].nextElementSibling === node);
  }
  function toggleList(field, range, tagName) {
    if (editRoleOf(field) !== "content") return false;
    const selected = selectedDirectBlocks(field, range);
    const directLists = selected.filter((node) => /^(UL|OL)$/.test(node.tagName));
    const blocks = selected.filter((node) => /^(P|H[1-4])$/.test(node.tagName));
    if (directLists.length === 1 && selected.length === 1) {
      const list = directLists[0];
      if (list.tagName === tagName.toUpperCase()) {
        const paragraphs = Array.from(list.children).filter((item) => item.tagName === "LI").map((item) => { const paragraph = document.createElement("p"); paragraph.append(...Array.from(item.childNodes)); return paragraph; });
        if (!paragraphs.length) return false;
        list.replaceWith(...paragraphs); selectContentsAcross(paragraphs[0], paragraphs[paragraphs.length - 1]); return true;
      }
      const replacement = document.createElement(tagName); replacement.append(...Array.from(list.childNodes)); list.replaceWith(replacement); selectNodeContents(replacement); return true;
    }
    if (directLists.length || !blocks.length || !blocks.every((block) => block.tagName === "P") || !areContiguousSiblings(blocks)) return false;
    const list = document.createElement(tagName);
    for (const block of blocks) { const item = document.createElement("li"); item.append(...Array.from(block.childNodes)); list.append(item); }
    blocks[0].replaceWith(list); for (const block of blocks.slice(1)) block.remove();
    selectNodeContents(list); return true;
  }
  function textOffsetForBoundary(field, container, offset) {
    const range = document.createRange(); range.selectNodeContents(field); range.setEnd(container, offset); return range.toString().length;
  }
  function boundaryForTextOffset(field, offset) {
    const walker = document.createTreeWalker(field, NodeFilter.SHOW_TEXT); let consumed = 0; let node;
    while ((node = walker.nextNode())) { const next = consumed + node.textContent.length; if (offset <= next) return { node, offset: Math.max(0, offset - consumed) }; consumed = next; }
    return { node: field, offset: field.childNodes.length };
  }
  function captureFieldSelectionBookmark(field) {
    const selection = window.getSelection(); const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!range || sameRichTextField(range) !== field) return null;
    const selectedBlocks = selectedDirectBlocks(field, range);
    if (selectedBlocks.length && rangeCoversSelectedBlocks(range, selectedBlocks)) {
      const children = Array.from(field.children); const first = children.indexOf(selectedBlocks[0]); const last = children.indexOf(selectedBlocks[selectedBlocks.length - 1]);
      if (first >= 0 && last >= first) return { kind: "blocks", first, last };
    }
    return { start: textOffsetForBoundary(field, range.startContainer, range.startOffset), end: textOffsetForBoundary(field, range.endContainer, range.endOffset) };
  }
  function restoreFieldSelectionBookmark(field, bookmark) {
    if (!bookmark) return;
    if (bookmark.kind === "blocks") {
      const children = Array.from(field.children); const first = children[bookmark.first]; const last = children[bookmark.last];
      if (first && last) { selectContentsAcross(first, last); return; }
    }
    const start = boundaryForTextOffset(field, bookmark.start); const end = boundaryForTextOffset(field, bookmark.end); const range = document.createRange();
    range.setStart(start.node, start.offset); range.setEnd(end.node, end.offset);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
  }
  function commitDocumentMutation(field, mutate = null) {
    if (!STATE.editing || STATE.isMutatingDocument || STATE.composing) return false;
    STATE.isMutatingDocument = true;
    try {
      const applied = mutate ? Boolean(mutate()) : true;
      if (!applied) return false;
      const selectionBookmark = captureFieldSelectionBookmark(field);
      if (isRichEditRole(editRoleOf(field))) normalizeRichTextField(field);
      restoreFieldSelectionBookmark(field, selectionBookmark);
      updateSavedSelection(); syncInlineToolbar(); recomputeChanges();
      const changesJson = stableChangesJson(collectChanges());
      if (changesJson === STATE.lastCommittedChangesJson) return false;
      STATE.lastCommittedChangesJson = changesJson; STATE.documentRevision += 1;
      emitHostMessage({ type: "html_edit_document_changed", ...stateSnapshot() });
      return true;
    } finally {
      STATE.isMutatingDocument = false;
    }
  }
  function withRichFieldMutation(field, mutate) { return commitDocumentMutation(field, mutate); }
  function applyInlineFormat(command) {
    if (STATE.composing || !VALID_FORMAT_COMMANDS.has(command)) return false;
    const field = restoreSavedSelection(); if (!field || !STATE.savedSelection || STATE.savedSelection.range.collapsed) return false;
    const role = editRoleOf(field); if (!(role === "short" ? SHORT_FORMAT_COMMANDS : VALID_FORMAT_COMMANDS).has(command)) return false;
    const range = STATE.savedSelection.range;
    return withRichFieldMutation(field, () => {
      if (command === "bold" || command === "italic") return toggleInlineMark(field, range, command === "bold" ? "strong" : "em");
      if (command === "paragraph" || command.startsWith("heading-")) return replaceSelectedBlocks(field, range, command === "paragraph" ? "p" : `h${command.slice(-1)}`);
      if (command.startsWith("align-")) return setInlineBlockAlignment(field, range, command.slice(6));
      return toggleList(field, range, command === "unordered-list" ? "ul" : "ol");
    });
  }
  function sameRichTextField(range) {
    if (!range) return null;
    const start = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
    const end = range.endContainer.nodeType === Node.ELEMENT_NODE ? range.endContainer : range.endContainer.parentElement;
    const startField = start?.closest?.('[data-nutbook-editing="rich-text"]');
    const endField = end?.closest?.('[data-nutbook-editing="rich-text"]');
    return startField && startField === endField ? startField : null;
  }
  function updateSavedSelection() {
    const selection = window.getSelection(); const range = selection?.rangeCount ? selection.getRangeAt(0) : null; const field = sameRichTextField(range);
    if (!field) return;
    STATE.savedSelection = { fieldId: field.getAttribute("data-id"), range: range.cloneRange() };
    STATE.selectedDataId = STATE.savedSelection.fieldId; STATE.formatState = computeFormatState(field, range);
  }
  function clearSavedSelection() { STATE.savedSelection = null; STATE.selectedDataId = null; STATE.formatState = emptyFormatState(); }
  function computeFormatState(field, range) {
    let node = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
    const ancestors = []; for (; node && node !== field; node = node.parentElement) ancestors.push(node);
    const blockElement = ancestors.find((entry) => /^(P|H[1-4])$/.test(entry.tagName)); const blockTag = blockElement?.tagName?.toLowerCase() || "p";
    const listTag = ancestors.find((entry) => entry.tagName === "UL" || entry.tagName === "OL")?.tagName?.toLowerCase() || null;
    return { canFormat: !range.collapsed, bold: ancestors.some((entry) => entry.tagName === "STRONG" || entry.tagName === "B"), italic: ancestors.some((entry) => entry.tagName === "EM" || entry.tagName === "I"), block: blockTag === "p" ? "paragraph" : `heading-${blockTag.slice(1)}`, textAlign: normalizeTextAlign(getComputedStyle(blockElement || field).textAlign), list: listTag === "ul" ? "unordered-list" : listTag === "ol" ? "ordered-list" : null, editRole: editRoleOf(field) };
  }
  function onCompositionStart(event) { if (isRichEditRole(editRoleOf(event.currentTarget))) STATE.composing = true; }
  function onCompositionEnd(event) { const element = event.currentTarget; if (!isRichEditRole(editRoleOf(element))) return; STATE.composing = false; commitDocumentMutation(element); }
  function onInput(event) {
    const element = event.currentTarget;
    if (isRichEditRole(editRoleOf(element))) {
      if (STATE.composing) return;
    }
    commitDocumentMutation(element);
  }
  function updateChange(element) {
    const id = element.getAttribute("data-id"); const role = editRoleOf(element);
    if (element.matches?.('img[data-editable="image"]')) {
      const baseline = STATE.baseline.get(id); const relativePath = element.getAttribute("data-nutbook-asset-relative-path");
      if (!baseline || !relativePath || (element.getAttribute("src") || "") === baseline.currentSrc) STATE.changes.delete(id);
      else {
        const pictureSources = baseline.pictureSources.map((source) => ({ index: source.index, originalSrcsetHash: source.originalSrcsetHash }));
        const change = { type: "image", selector: selectorFor(id), originalSrcHash: baseline.originalSrcHash, src: relativePath, alt: element.getAttribute("alt") || "" };
        if (pictureSources.length) change.pictureSources = pictureSources;
        STATE.changes.set(id, change);
      }
      STATE.dirty = STATE.changes.size > 0; return;
    }
    if (element.matches?.('[data-editable="background-image"]')) { const baseline = STATE.baseline.get(id); const relativePath = element.getAttribute("data-nutbook-asset-relative-path"); if (!baseline || !relativePath || (element.getAttribute("style") || "") === baseline.currentStyle) STATE.changes.delete(id); else STATE.changes.set(id, { type: "background-image", selector: selectorFor(id), originalStyleHash: baseline.originalStyleHash, src: relativePath }); STATE.dirty = STATE.changes.size > 0; return; }
    if (isRichEditRole(role)) {
      const value = readRichValue(element); const original = STATE.baseline.get(id) || { html: "", textAlign: "left" };
      if (value.html === original.html && value.textAlign === original.textAlign) STATE.changes.delete(id); else { const change = { type: "rich_text", selector: selectorFor(id), originalTextHash: STATE.sourceHashes.get(id) || "", html: value.html, editRole: role }; if (value.textAlign !== original.textAlign) change.textAlign = value.textAlign; STATE.changes.set(id, change); }
    } else { const value = textOf(element); const original = STATE.baseline.get(id) || ""; if (value === original) STATE.changes.delete(id); else STATE.changes.set(id, { type: "text", selector: selectorFor(id), originalTextHash: STATE.sourceHashes.get(id) || "", text: value, editRole: role }); }
    STATE.dirty = STATE.changes.size > 0; if (STATE.dirty) STATE.saveNotice = "";
  }
  function recomputeChanges() { for (const element of [...editableTextElements(), ...editableRichTextElements(), ...editableImageElements(), ...editableBackgroundImageElements()]) updateChange(element); }
  function collectChanges() { return Object.fromEntries(STATE.changes.entries()); }
  function stableChangesJson(value) {
    const normalize = (entry) => {
      if (Array.isArray(entry)) return entry.map(normalize);
      if (!entry || typeof entry !== "object") return entry;
      const sorted = {};
      for (const key of Object.keys(entry).sort()) sorted[key] = normalize(entry[key]);
      return sorted;
    };
    return JSON.stringify(normalize(value));
  }
  function applyPatch(patch, runtimeAssetUrls = {}) {
    if (!patch?.changes) return;
    for (const [id, change] of Object.entries(patch.changes)) {
      const element = document.querySelector(selectorFor(id)); if (!element) continue;
      const role = editRoleOf(element);
      if (change.type === "text" && role === "plain") element.textContent = change.text || "";
      if ((change.type === "image" || change.type === "background-image") && change.src && runtimeAssetUrls[change.src]) {
        const editableType = change.type === "image" ? "image" : "background-image";
        if (editableType === "image" && !validatePictureSourceSet(element, change.pictureSources || [])) {
          emitHostMessage({ type: "html_edit_patch_field_result", runtimeSessionId: STATE.sessionId, dataId: id, patchRevision: patch.patchRevision || 0, status: "skipped", reason: "picture_source_mismatch" });
          continue;
        }
        if (!applyImportedAsset({ runtimeSessionId: STATE.sessionId, dataId: id, editableType, relativePath: change.src, runtimeUrl: runtimeAssetUrls[change.src] })) {
          emitHostMessage({ type: "html_edit_patch_field_result", runtimeSessionId: STATE.sessionId, dataId: id, patchRevision: patch.patchRevision || 0, status: "skipped", reason: "picture_source_mismatch" });
          continue;
        }
        const baseline = STATE.baseline.get(id);
        if (baseline?.type === "image") { baseline.currentSrc = element.getAttribute("src") || ""; baseline.currentInlineStyle = element.getAttribute("style") || ""; baseline.pictureSources.forEach((source, index) => { source.currentSrcset = pictureSources(element)[index]?.getAttribute("srcset") || ""; }); }
        if (baseline?.type === "background-image") baseline.currentStyle = element.getAttribute("style") || "";
      }
      const patchRole = change.editRole || "content";
      if ((change.type === "rich_text" || change.type === "rich-text") && isRichEditRole(role) && patchRole === role && isValidatedRichHtml(change.html, role)) { const baseline = STATE.baseline.get(id) || readRichValue(element); element.innerHTML = change.html; element.style.textAlign = change.textAlign ? normalizeTextAlign(change.textAlign) : baseline.textAlign; normalizeRichTextField(element); }
      if (!element.matches?.('[data-editable="image"], [data-editable="background-image"]')) STATE.baseline.set(id, readEditableValue(element));
    }
  }
  function restoreImageBaseline(element, baseline) { if (baseline.type === "image") { if (baseline.currentSrc) element.setAttribute("src", baseline.currentSrc); else element.removeAttribute("src"); element.setAttribute("style", baseline.currentInlineStyle || ""); pictureSources(element).forEach((source, index) => { source.setAttribute("srcset", baseline.pictureSources[index]?.currentSrcset || source.getAttribute("srcset") || ""); }); } else element.setAttribute("style", baseline.currentStyle); element.removeAttribute("data-nutbook-asset-relative-path"); }
  function onBeforeInput(event) {
    if (!STATE.editing || (event.inputType !== "insertFromPaste" && event.inputType !== "insertFromDrop")) return;
    const selection = window.getSelection(); const range = selection?.rangeCount ? selection.getRangeAt(0) : null; const field = sameRichTextField(range);
    if (!field) return;
    if (event.inputType === "insertFromDrop") { event.preventDefault(); return; }
    if (event.inputType !== "insertFromPaste") return;
    event.preventDefault();
    const plainText = event.dataTransfer?.getData("text/plain") || event.clipboardData?.getData("text/plain") || "";
    commitDocumentMutation(field, () => {
      range.deleteContents(); const textNode = document.createTextNode(plainText); range.insertNode(textNode);
      const caret = document.createRange(); caret.setStartAfter(textNode); caret.collapse(true); selection.removeAllRanges(); selection.addRange(caret);
      return true;
    });
  }
  function restoreSavedSelection() {
    const saved = STATE.savedSelection; if (!saved || !saved.range) return null;
    const expectedField = document.querySelector(selectorFor(saved.fieldId)); if (!expectedField) return null;
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(saved.range.cloneRange());
    const field = selection.rangeCount ? sameRichTextField(selection.getRangeAt(0)) : null;
    if (!field || field !== expectedField) { selection.removeAllRanges(); clearSavedSelection(); return null; }
    return field;
  }
  function applyFormat(payload) {
    if (STATE.composing || !payload || payload.runtimeSessionId !== STATE.sessionId || !VALID_FORMAT_COMMANDS.has(payload.command)) return false;
    return applyInlineFormat(payload.command);
  }
  function normalizeRichTextField(field) {
    field.querySelectorAll("script,style,template,u").forEach((node) => node.remove());
    field.querySelectorAll("b").forEach((node) => { const replacement = document.createElement("strong"); replacement.innerHTML = node.innerHTML; node.replaceWith(replacement); });
    field.querySelectorAll("i").forEach((node) => { const replacement = document.createElement("em"); replacement.innerHTML = node.innerHTML; node.replaceWith(replacement); });
    for (const node of Array.from(field.querySelectorAll("*"))) {
      if (!ALLOWED_RICH_TAGS.has(node.tagName)) { node.replaceWith(...node.childNodes); continue; }
      const alignment = /^(P|H[1-4])$/.test(node.tagName) ? normalizeTextAlign(node.style.textAlign) : null;
      const hadStyle = node.hasAttribute("style");
      for (const attribute of Array.from(node.attributes)) node.removeAttribute(attribute.name);
      if (hadStyle && alignment) node.setAttribute("style", `text-align:${alignment}`);
    }
    if (editRoleOf(field) === "short") normalizeShortRichTextField(field);
  }
  function normalizeShortRichTextField(field) {
    for (const node of Array.from(field.querySelectorAll("*"))) {
      if (!ALLOWED_SHORT_RICH_TAGS.has(node.tagName)) node.replaceWith(...node.childNodes);
    }
  }
  function editRoleLabel(role) {
    const chinese = (document.documentElement.lang || "").toLowerCase().startsWith("zh");
    if (role === "short") return chinese ? "短文本，可加粗、斜体和对齐" : "Short text — emphasis and alignment";
    if (role === "content") return chinese ? "正文，可设置段落和列表" : "Body text — paragraphs and lists";
    return chinese ? "文本，可直接编辑" : "Text — editable";
  }
  function installEditAffordanceStyles() {
    if (document.getElementById("nutbook-html-edit-affordance")) return;
    const style = document.createElement("style"); style.id = "nutbook-html-edit-affordance";
    style.textContent = '[data-nutbook-editing]{outline:2px dashed #c5bbbb;outline-offset:3px;border-radius:8px;cursor:text;position:relative}[data-nutbook-editing]:hover{outline-color:#a99f9f;background:#f3f3f5}[data-nutbook-editing]:focus{outline-color:#000;box-shadow:0 4px 12px rgba(26,28,29,.12)}[data-nutbook-editing="image"]{cursor:pointer}.nutbook-html-edit-image-action{margin:6px;border:1px solid #bbb;border-radius:6px;background:#fff;padding:5px 8px;font:12px sans-serif;cursor:pointer}';
    document.head.append(style);
  }
  function removeEditAffordanceStyles() { document.getElementById("nutbook-html-edit-affordance")?.remove(); }
  function installShortcutCapture() { window.removeEventListener("keydown", onKeyDownCapture, true); window.addEventListener("keydown", onKeyDownCapture, true); }
  function onKeyDownCapture(event) { if (!STATE.editing) return; const key = event.key; const blocked = ["f", "F", "s", "S", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", "Enter"]; if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === "s") { event.preventDefault(); event.stopImmediatePropagation(); emitHostMessage({ type: "html_edit_save_requested_from_runtime", runtimeSessionId: STATE.sessionId }); return; } if (event.metaKey || event.ctrlKey || event.altKey || isEditableEventTarget(event.target)) return; if (blocked.includes(key)) { event.preventDefault(); event.stopImmediatePropagation(); } }
  function isEditableEventTarget(target) { for (let node = target; node; node = node.parentElement) if (node.getAttribute?.("data-nutbook-editing")) return true; return false; }
  function stateSnapshot() { return { runtimeSessionId: STATE.sessionId, documentRevision: STATE.documentRevision, dirty: STATE.dirty, selectedDataId: STATE.selectedDataId, formatState: STATE.formatState, changes: collectChanges() }; }
  function getSnapshot() { recomputeChanges(); return stateSnapshot(); }
  function reportState(options = {}) {
    const requestId = typeof options === "string" ? options : options?.requestId || "";
    emitHostMessage({ type: "html_edit_state_snapshot", requestId, ...getSnapshot() });
  }
  function notifyReady() { emitHostMessage({ type: "html_edit_ready", runtimeSessionId: STATE.sessionId, ...scanEditableElements(), shortcutsIntercepted: true }); }
  function emitHostMessage(payload) {
    const invoke = window.__TAURI_INTERNALS__?.invoke;
    if (typeof invoke === "function") {
      Promise.resolve(invoke("html_edit_runtime_message_command", { payload })).catch(() => {
        if (!STATE._messageSeq) STATE._messageSeq = 0;
        document.title = `__NUTBOOK_HTML_EDIT_RUNTIME__:${JSON.stringify({ ...payload, _s: ++STATE._messageSeq })}`;
      });
      return;
    }
    if (!STATE._messageSeq) STATE._messageSeq = 0;
    document.title = `__NUTBOOK_HTML_EDIT_RUNTIME__:${JSON.stringify({ ...payload, _s: ++STATE._messageSeq })}`;
  }
  window.__NUTBOOK_HTML_EDIT__ = { scanEditableElements, isEditing: () => STATE.editing, enter, exit, markSaved, rebaseSaved: markSaved, collectChanges, applyPatch, applyFormat, applyImportedAsset, getSnapshot, reportState, emitHostMessage };
})();
