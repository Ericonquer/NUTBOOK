(function () {
  const VALID_FORMAT_COMMANDS = new Set([
    "bold", "italic", "paragraph", "heading-1", "heading-2", "heading-3", "heading-4",
    "align-left", "align-center", "align-right", "unordered-list", "ordered-list"
  ]);
  const SHORT_FORMAT_COMMANDS = new Set(["bold", "italic", "align-left", "align-center", "align-right"]);
  const ALLOWED_RICH_TAGS = new Set(["P", "BR", "STRONG", "EM", "H1", "H2", "H3", "H4", "UL", "OL", "LI"]);
  const ALLOWED_SHORT_RICH_TAGS = new Set(["BR", "STRONG", "EM"]);
  const STATE = {
    sessionId: "", generation: 0, editing: false, dirty: false, selectedDataId: null,
    baseline: new Map(), changes: new Map(), savedSelection: null, formatState: emptyFormatState(), composing: false, pendingInlineMarks: new Map(),
    insertedImages: new Map(), insertedImageBaseline: new Map(), insertedImageSessionCreatedIds: new Set(), deletedInsertedImageIds: new Map(),
    selectedInsertedImageId: "", draftInsertedImage: null, insertFrameMode: false, insertedImageLayerHost: null, insertedImageLayerRoot: null,
    pendingInsertedImageRequest: null, insertedImageScrollHandler: null, insertedImageResizeObserver: null,
    inlineToolbar: null, inlineToolbarEnabled: false, inlineToolbarDock: "bottom", inlineToolbarDrag: null, locale: "", saveNotice: "",
    documentRevision: 0, lastCommittedChangesJson: "{}", isMutatingDocument: false, imageButtons: [], sourceHashes: new Map(), runtimeAssetUrls: new Map(),
    history: [], historyScopes: [], historySelections: [], historyCursor: -1, savedHistoryCursor: -1, historyTimer: null, pendingHistorySelection: null, pendingInputSelection: null, restoringHistory: false, lastHistoryJson: "", cropFrames: new Map(), activeCrop: null, activeInsertedImageCrop: null,
    itemId: 0, presentation: null, presentationUnsubscribe: null, activePresentationPageId: "",
    sectionNavigation: null
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
  function pageIdFor(element) { return element?.closest?.("[data-nutbook-page-id]")?.getAttribute("data-nutbook-page-id") || undefined; }
  function presentationPageRoot(pageId = STATE.activePresentationPageId) { return pageId ? document.querySelector(`[data-nutbook-page-id="${CSS.escape(pageId)}"]`) : null; }
  // A deck earns full editor navigation only by publishing this bridge in its
  // original source. Runtime injection cannot reach lexical deck closures, and
  // must not pretend otherwise by changing classes or swallowing keyboard input.
  async function activatePresentationAdapter() {
    const bridge = window.__NUTBOOK_PRESENTATION__;
    if (!bridge || typeof bridge.goTo !== "function" || typeof bridge.subscribe !== "function" || typeof bridge.setEditMode !== "function") return false;
    try {
      await bridge.whenReady?.();
      const rawPages = Array.isArray(bridge.pages) ? bridge.pages : [];
      const pages = rawPages.map((page, index) => typeof page === "string"
        ? { id: page, index: index + 1, title: "", kind: "" }
        : { id: page?.id, index: Number.isInteger(page?.index) ? page.index : index + 1, title: String(page?.title || ""), kind: String(page?.kind || "") });
      const ids = pages.map((page) => page.id).filter(Boolean);
      if (!ids.length || new Set(ids).size !== ids.length || ids.some((id) => !presentationPageRoot(id))) return false;
      const disabled = await bridge.setEditMode(true);
      if (disabled !== true) return false;
      STATE.presentation = { bridge, pages, pageIds: ids };
      STATE.activePresentationPageId = typeof bridge.activePageId === "string" && ids.includes(bridge.activePageId) ? bridge.activePageId : ids[0];
      STATE.presentationUnsubscribe = bridge.subscribe((nextPageId) => {
        if (!STATE.editing || !STATE.presentation?.pageIds.includes(nextPageId)) return;
        STATE.activePresentationPageId = nextPageId; layoutInsertedImages(); layoutImageActions();
        emitHostMessage({ type: "html_edit_presentation_page_changed", runtimeSessionId: STATE.sessionId, generation: STATE.generation, pageId: nextPageId });
      });
      return true;
    } catch (_) { try { await bridge?.setEditMode?.(false); } catch (_) {} return false; }
  }
  function deactivatePresentationAdapter() {
    const bridge = STATE.presentation?.bridge;
    try { STATE.presentationUnsubscribe?.(); } catch (_) {}
    STATE.presentationUnsubscribe = null; STATE.presentation = null; STATE.activePresentationPageId = "";
    try { bridge?.setEditMode?.(false); } catch (_) {}
  }
  function unsupportedSectionScrollStyle(element) {
    if (!element) return true;
    const style = getComputedStyle(element);
    return (style.transform && style.transform !== "none")
      || (style.filter && style.filter !== "none")
      || (style.perspective && style.perspective !== "none")
      || /\b(layout|paint|strict|content)\b/.test(style.contain || "");
  }
  function sectionScrollRoot(sections) {
    const roots = new Set();
    for (const section of sections) {
      let found = null;
      for (let node = section.parentElement; node && node !== document.documentElement; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
          if (found) return null;
          found = node;
        }
      }
      roots.add(found || document.scrollingElement);
    }
    if (roots.size !== 1) return null;
    const root = [...roots][0];
    if (!root) return null;
    if (root === document.scrollingElement) {
      if (unsupportedSectionScrollStyle(document.documentElement) || unsupportedSectionScrollStyle(document.body)) return null;
      return root;
    }
    if (!sections.every((section) => section.parentElement === root) || unsupportedSectionScrollStyle(root)) return null;
    return root;
  }
  function sectionNavigationSnapshot() {
    const navigation = STATE.sectionNavigation;
    return navigation ? { pages: navigation.pages, activePageId: navigation.activeSectionId, requestEpoch: navigation.requestEpoch } : null;
  }
  function sectionRootViewport(navigation) {
    return navigation.root === document.scrollingElement
      ? { top: 0, bottom: window.innerHeight, height: window.innerHeight }
      : navigation.root.getBoundingClientRect();
  }
  function settleSectionNavigation(navigation, ok, reason = "") {
    const pending = navigation.pendingNavigation;
    if (!pending) return;
    window.clearTimeout(pending.timeout);
    navigation.pendingNavigation = null;
    emitHostMessage({ type: "html_edit_section_navigation_result", requestId: pending.requestId, pageId: pending.sectionId, ok, reason, requestEpoch: navigation.requestEpoch });
  }
  function recomputeSectionActivity(options = {}) {
    const navigation = STATE.sectionNavigation;
    if (!STATE.editing || !navigation) return "";
    const viewport = sectionRootViewport(navigation);
    let best = null;
    for (const section of navigation.sections) {
      const rect = section.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(rect.bottom, viewport.bottom) - Math.max(rect.top, viewport.top));
      const ratio = visibleHeight / Math.max(1, Math.min(rect.height, viewport.height));
      const distance = Math.abs(rect.top - viewport.top);
      if (!best || ratio > best.ratio + 0.0001 || (Math.abs(ratio - best.ratio) <= 0.0001 && distance < best.distance)) best = { section, ratio, distance };
    }
    if (!best || best.ratio <= 0) return "";
    const pageId = best.section.getAttribute("data-nutbook-page-id") || "";
    if (!pageId) return "";
    const changed = navigation.activeSectionId !== pageId;
    navigation.activeSectionId = pageId;
    if (changed && options.emit !== false) emitHostMessage({ type: "html_edit_section_navigation_changed", pageId, requestEpoch: navigation.requestEpoch });
    if (navigation.pendingNavigation?.sectionId === pageId) settleSectionNavigation(navigation, true);
    return pageId;
  }
  function scheduleSectionActivity() {
    const navigation = STATE.sectionNavigation;
    if (!navigation || navigation.frame) return;
    navigation.frame = requestAnimationFrame(() => {
      if (STATE.sectionNavigation !== navigation) return;
      navigation.frame = 0;
      recomputeSectionActivity();
    });
  }
  function deactivateSectionNavigationAdapter() {
    const navigation = STATE.sectionNavigation;
    if (!navigation) return;
    navigation.observer?.disconnect();
    navigation.eventTarget.removeEventListener("scroll", navigation.scrollHandler, true);
    window.removeEventListener("resize", navigation.resizeHandler);
    if (navigation.frame) cancelAnimationFrame(navigation.frame);
    if (navigation.pendingNavigation) window.clearTimeout(navigation.pendingNavigation.timeout);
    STATE.sectionNavigation = null;
  }
  function activateSectionNavigationAdapter() {
    if (STATE.presentation || document.documentElement.getAttribute("data-nutbook-structure-profile") !== "vertical-sections-v1") return false;
    const roots = [...document.querySelectorAll("[data-nutbook-page-id]")];
    const ids = roots.map((root) => root.getAttribute("data-nutbook-page-id") || "");
    if (roots.length < 2 || ids.some((id) => !id) || new Set(ids).size !== ids.length || roots.some((root) => root.getClientRects().length === 0)) return false;
    const root = sectionScrollRoot(roots);
    if (!root) return false;
    const pages = roots.map((section, index) => ({
      id: ids[index],
      index: index + 1,
      title: String(section.getAttribute("data-nutbook-page-title") || `第 ${index + 1} 段`),
      kind: section.getAttribute("data-nutbook-page-kind") === "scroll-snap" ? "scroll-snap" : "section"
    }));
    const navigation = {
      root, eventTarget: root === document.scrollingElement ? document : root, sections: roots, pages, pageIds: ids, activeSectionId: "", requestToken: 0,
      pendingNavigation: null, requestEpoch: 0, observer: null, frame: 0,
      scrollHandler: scheduleSectionActivity, resizeHandler: scheduleSectionActivity
    };
    STATE.sectionNavigation = navigation;
    const observerRoot = root === document.scrollingElement ? null : root;
    if (typeof IntersectionObserver === "function") {
      navigation.observer = new IntersectionObserver(scheduleSectionActivity, { root: observerRoot, threshold: [0, 0.25, 0.5, 0.75, 1] });
      roots.forEach((section) => navigation.observer.observe(section));
    }
    navigation.eventTarget.addEventListener("scroll", navigation.scrollHandler, { passive: true, capture: true });
    window.addEventListener("resize", navigation.resizeHandler, { passive: true });
    recomputeSectionActivity({ emit: false });
    return true;
  }
  function refreshSectionNavigation({ itemId, runtimeSessionId, generation, requestEpoch } = {}) {
    const navigation = STATE.sectionNavigation;
    if (!navigation || Number(itemId) !== STATE.itemId || runtimeSessionId !== STATE.sessionId || Number(generation) !== STATE.generation) return false;
    const nextEpoch = Number.isInteger(requestEpoch) ? requestEpoch : navigation.requestEpoch + 1;
    if (nextEpoch < navigation.requestEpoch) return false;
    navigation.requestEpoch = nextEpoch;
    const activePageId = recomputeSectionActivity({ emit: false });
    emitHostMessage({ type: "html_edit_section_navigation_ready", sectionNavigation: sectionNavigationSnapshot(), requestEpoch: navigation.requestEpoch, activePageId });
    return true;
  }
  function goToSection({ itemId, runtimeSessionId, generation, pageId, requestId, requestEpoch } = {}) {
    const navigation = STATE.sectionNavigation;
    if (!navigation || Number(itemId) !== STATE.itemId || runtimeSessionId !== STATE.sessionId || Number(generation) !== STATE.generation || !navigation.pageIds.includes(pageId) || !requestId) return false;
    if (Number.isInteger(requestEpoch) && requestEpoch !== navigation.requestEpoch) return false;
    if (navigation.pendingNavigation) settleSectionNavigation(navigation, false, "superseded");
    const token = ++navigation.requestToken;
    const section = navigation.sections[navigation.pageIds.indexOf(pageId)];
    navigation.pendingNavigation = {
      token, requestId, sectionId: pageId,
      timeout: window.setTimeout(() => {
        if (STATE.sectionNavigation === navigation && navigation.pendingNavigation?.token === token) settleSectionNavigation(navigation, false, "timeout");
      }, 1800)
    };
    const top = navigation.root === document.scrollingElement
      ? navigation.root.scrollTop + section.getBoundingClientRect().top
      : navigation.root.scrollTop + section.getBoundingClientRect().top - navigation.root.getBoundingClientRect().top;
    navigation.root.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    scheduleSectionActivity();
    if (navigation.activeSectionId === pageId) settleSectionNavigation(navigation, true);
    return true;
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
    // Read-only patch replay uses its own closed-shadow layer.  Editing must
    // own the only inserted-image layer, otherwise reopening a saved document
    // shows the read-only image underneath its editable counterpart.
    window.__NUTBOOK_INSERTED_IMAGE_READONLY__?.dispose?.();
    STATE.itemId = Number(payload.itemId || 0); STATE.sessionId = payload.runtimeSessionId; STATE.generation = Number(payload.generation || 0); STATE.editing = true; STATE.dirty = false; STATE.selectedDataId = null;
    STATE.documentRevision = 0; STATE.lastCommittedChangesJson = "{}"; STATE.isMutatingDocument = false;
    STATE.inlineToolbarEnabled = Boolean(payload.inlineToolbar);
    STATE.locale = payload.locale || document.documentElement.lang || navigator.language || "";
    STATE.baseline.clear(); STATE.changes.clear(); STATE.sourceHashes.clear(); STATE.runtimeAssetUrls.clear(); STATE.pendingInlineMarks.clear(); STATE.insertedImages.clear(); STATE.insertedImageBaseline.clear(); STATE.insertedImageSessionCreatedIds.clear(); STATE.deletedInsertedImageIds.clear(); clearSavedSelection(); STATE.inlineToolbarDock = "bottom"; STATE.inlineToolbarDrag = null;
    await activatePresentationAdapter();
    if (!STATE.presentation) activateSectionNavigationAdapter();
    installEditAffordanceStyles();
    for (const element of editableTextElements()) setupEditable(element, "text");
    for (const element of editableRichTextElements()) setupEditable(element, "rich-text");
    await initializeTextSourceHashes();
    await setupEditableImages();
    installShortcutCapture();
    document.addEventListener("selectionchange", onSelectionChange, true);
    document.addEventListener("beforeinput", onBeforeInput, true);
    // A persisted layer is intentionally visual-only outside edit mode. Its
    // hydration switches it to visibility:hidden so it cannot become a dead
    // overlay while still retaining the exact layout rect used for persistence.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    hydrateStaticInsertedImages(); applyPatch(payload.patch, payload.runtimeAssetUrls || {}); if (STATE.insertedImages.size === 1) selectInsertedImage(STATE.insertedImages.keys().next().value); STATE.lastCommittedChangesJson = stableChangesJson(collectChanges()); resetHistory(); if (STATE.inlineToolbarEnabled) mountInlineToolbar(); notifyReady();
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
      const persistedCrop = editableType === "image" ? cropStateOf(element) : null;
      // Old v2 markup stored a focus value that its translate-based renderer
      // could not display at scale=1000. Preserve the pixels the user sees on
      // entry (the old centred cover view), then migrate the saved metadata;
      // do not re-render it into a different crop merely by entering edit.
      if (persistedCrop?.model === "v2" && !/\bobject-position\s*:/i.test(element.getAttribute("style") || "")) { writeCropState(element, { scale: 1000, x: 500, y: 500, model: "v2" }); element.setAttribute("data-nutbook-crop-style-migration", "1"); }
      const baseline = await imageBaselineOf(element, editableType);
      STATE.baseline.set(id, baseline); element.setAttribute("data-nutbook-editing", "image");
      if (editableType === "image" && !hasSupportedPictureSources(element)) {
        element.setAttribute("data-nutbook-image-readonly", "picture-source-candidates");
        continue;
      }
      element.addEventListener("click", onImageEditClick, true);
      addImageAffordance(element, editableType); if (index % 8 === 7) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    STATE.imageActionLayoutHandler = () => layoutImageActions();
    window.addEventListener("scroll", STATE.imageActionLayoutHandler, true); window.addEventListener("resize", STATE.imageActionLayoutHandler);
    layoutImageActions();
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
    const src = element.getAttribute("src") || ""; const inlineStyle = element.getAttribute("style") || ""; return { type: editableType, originalSrc: src, currentSrc: src, originalInlineStyle: inlineStyle, currentInlineStyle: inlineStyle, originalSrcHash: await sha256HexUtf8(src), pictureSources: sourceBaselines, crop: cropStateOf(element) };
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
  function onImageEditClick(event) { if (event.target !== event.currentTarget) return; const element = event.currentTarget; if (STATE.activeCrop?.element === element) { event.preventDefault(); event.stopImmediatePropagation(); return; } requestImageReplacement(element, element.matches("img") ? "image" : "background-image"); }
  function requestImageReplacement(element, editableType) { if (!STATE.editing) return; const dataId = element.getAttribute("data-id"); emitHostMessage({ type: "html_edit_asset_replace_requested", runtimeSessionId: STATE.sessionId, dataId, editableType, targetState: imageTargetState(element) }); }
  function imageActionIcon(name) { const icons = { replace: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="9" r="1.3" fill="currentColor"/><path d="m5.5 14 3.2-3 2.4 2.1 2-1.8 2 1.7M18.5 7.5v5m-2.5-2.5h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>', crop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v13a2 2 0 0 0 2 2h12M3 7h13a2 2 0 0 1 2 2v12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="square"/><path d="M3 3h5M3 3v5M21 21h-5m5 0v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 4h6m-8 3 1 13h8l1-13M10 11v5m4-5v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>', close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/></svg>', done: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.2 4.2L19 6.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' }; return icons[name] || ""; }
  function setImageActionIcon(button, icon, label) { button.classList.add("nutbook-html-edit-icon-action"); button.setAttribute("aria-label", label); button.setAttribute("data-tooltip", label); button.innerHTML = imageActionIcon(icon); button.style.width = "28px"; button.style.height = "28px"; button.style.padding = "0"; button.style.display = "inline-flex"; button.style.alignItems = "center"; button.style.justifyContent = "center"; button.style.background = "#111"; button.style.color = "#fff"; button.style.border = "0"; button.style.borderRadius = "7px"; const svg = button.querySelector("svg"); if (svg) { svg.style.width = "17px"; svg.style.height = "17px"; svg.style.display = "block"; svg.style.pointerEvents = "none"; } }
  // A replacement can remove/recreate a crop frame.  Keep the source element
  // as the stable identity and resolve its current frame on every layout;
  // retaining the old wrapper makes body-level fixed controls drift on scroll.
  function imageActionAnchor(element) { return element?.parentElement?.getAttribute("data-nutbook-crop-frame") === "1" ? element.parentElement : element; }
  function layoutImageActions() { for (const actions of STATE.imageButtons) { const anchor = imageActionAnchor(actions.__nutbookImageActionElement); if (!anchor?.isConnected || !actions.isConnected || (STATE.presentation && pageIdFor(anchor) !== STATE.activePresentationPageId)) { actions.style.display = "none"; continue; } const rect = anchor.getBoundingClientRect(); if (rect.width < 2 || rect.height < 2) { actions.style.display = "none"; continue; } actions.style.display = "inline-flex"; actions.style.left = `${Math.round(rect.left)}px`; actions.style.top = `${Math.round(rect.bottom + 7)}px`; } }
  function addImageAffordance(element, editableType) { const actions = document.createElement("span"); actions.className = "nutbook-html-edit-image-actions"; const replace = document.createElement("button"); replace.type = "button"; replace.className = "nutbook-html-edit-image-action"; setImageActionIcon(replace, "replace", imageTargetState(element) === "empty" ? "插入图片" : "替换图片"); replace.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); requestImageReplacement(element, editableType); }); actions.append(replace); if (editableType === "image") { const crop = document.createElement("button"); crop.type = "button"; crop.className = "nutbook-html-edit-image-action"; setImageActionIcon(crop, "crop", "裁切显示"); crop.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); beginImageCrop(element); }); actions.append(crop); } actions.__nutbookImageActionElement = element; document.body.append(actions); STATE.imageButtons.push(actions); layoutImageActions(); }
  // v2 keeps the source image's normal `cover` presentation as its zero point.
  // The old model scaled a `contain` image, which is why entering crop could
  // visibly jump to a tiny full image before the user had touched anything.
  // Phase 1E briefly wrote crop frames as `contain + transform` without the
  // crop data attributes.  Those documents are real user data, so treating
  // them as an uncropped image loses their baseline during save/undo.  Read
  // that exact old markup once and let a completed crop migrate it to v2.
  function legacyCropStateFromMarkup(element) { if (element.parentElement?.getAttribute("data-nutbook-crop-frame") !== "1") return null; const style = element.getAttribute("style") || ""; if (!/object-fit\s*:\s*contain\b/i.test(style)) return null; const scaleMatch = style.match(/scale\(\s*([\d.]+)\s*\)/i), translateMatch = style.match(/translate\(\s*([-\d.]+)%\s*,\s*([-\d.]+)%\s*\)/i); const scale = Math.max(1000, Math.min(4000, Math.round((Number(scaleMatch?.[1]) || 1) * 1000))); const factor = (scale - 1000) / 1000; const focus = (value) => factor > 0 ? Math.max(0, Math.min(1000, Math.round(500 - Number(value || 0) / (factor * 100) * 1000))) : 500; return { scale, x: focus(translateMatch?.[1]), y: focus(translateMatch?.[2]), model: "legacy" }; }
  function cropStateOf(element) { const hasPersistedState = ["image", "model", "scale", "x", "y"].some((name) => element.hasAttribute(`data-nutbook-crop-${name}`)); if (!hasPersistedState) return legacyCropStateFromMarkup(element); const read = (name, fallback) => { const value = Number(element.getAttribute(`data-nutbook-crop-${name}`)); return Number.isInteger(value) ? value : fallback; }; const scale = read("scale", 1000), x = read("x", 500), y = read("y", 500), model = element.getAttribute("data-nutbook-crop-model") === "v2" ? "v2" : "legacy"; if (scale === 1000 && x === 500 && y === 500 && model !== "v2") return null; return { scale: Math.max(1000, Math.min(4000, scale)), x: Math.max(0, Math.min(1000, x)), y: Math.max(0, Math.min(1000, y)), model }; }
  // `legacy` means contain-based geometry and v2 means cover-based geometry.
  // Equal numbers are not equal pixels across those models; otherwise an undo
  // can silently revive a shrunken full-image presentation.
  function cropStateEquals(a, b) { return (!a && !b) || Boolean(a && b && a.scale === b.scale && a.x === b.x && a.y === b.y && (a.model || "legacy") === (b.model || "legacy")); }
  function writeCropState(element, crop) { if (!crop) { element.removeAttribute("data-nutbook-crop-image"); element.removeAttribute("data-nutbook-crop-model"); element.removeAttribute("data-nutbook-crop-scale"); element.removeAttribute("data-nutbook-crop-x"); element.removeAttribute("data-nutbook-crop-y"); return; } element.setAttribute("data-nutbook-crop-image", "1"); element.setAttribute("data-nutbook-crop-model", "v2"); element.setAttribute("data-nutbook-crop-scale", String(crop.scale)); element.setAttribute("data-nutbook-crop-x", String(crop.x)); element.setAttribute("data-nutbook-crop-y", String(crop.y)); }
  function cropTransform(crop) { const factor = (crop.scale - 1000) / 1000; return `translate(${((500 - crop.x) / 1000 * factor * 100).toFixed(3)}%,${((500 - crop.y) / 1000 * factor * 100).toFixed(3)}%) scale(${(crop.scale / 1000).toFixed(3)})`; }
  function cropContentGeometry(element, frame, crop) { const viewport = frame.wrapper.getBoundingClientRect(); const naturalWidth = Math.max(1, element.naturalWidth || viewport.width), naturalHeight = Math.max(1, element.naturalHeight || viewport.height); const base = Math.max(viewport.width / naturalWidth, viewport.height / naturalHeight); const zoom = Math.max(1, (crop?.scale || 1000) / 1000); const width = naturalWidth * base * zoom, height = naturalHeight * base * zoom, focusX = Math.max(0, Math.min(1, (crop?.x ?? 500) / 1000)), focusY = Math.max(0, Math.min(1, (crop?.y ?? 500) / 1000)); return { viewport, width, height, left: (viewport.width - width) * focusX, top: (viewport.height - height) * focusY, x: Math.round(focusX * 1000), y: Math.round(focusY * 1000) }; }
  // Panning must never change scale. At the minimum cover scale there may be
  // no spare pixels on one axis; the user must enlarge with a handle first.
  function cropFromContentPosition(element, frame, crop, left, top) { const geometry = cropContentGeometry(element, frame, crop), horizontalRange = geometry.viewport.width - geometry.width, verticalRange = geometry.viewport.height - geometry.height; const x = Math.abs(horizontalRange) < .5 ? 500 : left / horizontalRange * 1000, y = Math.abs(verticalRange) < .5 ? 500 : top / verticalRange * 1000; return { scale: crop.scale, x: Math.max(0, Math.min(1000, Math.round(x))), y: Math.max(0, Math.min(1000, Math.round(y))), model: "v2" }; }
  // Resize the image itself, pinning the opposite image edge.  The frame is a
  // fixed viewport; it is deliberately never resized by crop handles.
  function cropImageFromHandle(element, frame, crop, handle, dx, dy) { const geometry = cropContentGeometry(element, frame, crop); const horizontal = handle.includes("e") ? dx : handle.includes("w") ? -dx : 0; const vertical = handle.includes("s") ? dy : handle.includes("n") ? -dy : 0; const ratio = horizontal && vertical ? (horizontal / Math.max(1, geometry.width) + vertical / Math.max(1, geometry.height)) / 2 : horizontal ? horizontal / Math.max(1, geometry.width) : vertical / Math.max(1, geometry.height); const scale = Math.max(1000, Math.min(4000, Math.round(crop.scale * (1 + ratio)))); const next = { ...crop, scale, model: "v2" }; const resized = cropContentGeometry(element, frame, next); const left = handle.includes("w") ? geometry.left + geometry.width - resized.width : geometry.left; const top = handle.includes("n") ? geometry.top + geometry.height - resized.height : geometry.top; return cropFromContentPosition(element, frame, next, left, top); }
  // Inserted-image crop keeps its accepted contain+transform persistence
  // model, but its editor geometry must describe the visible source bitmap,
  // not the fixed frame element that contains it.
  function insertedCropMinimumScale(frame) { const image = frame?.node?.querySelector(".viewport img"), rect = frame?.node?.querySelector(".viewport")?.getBoundingClientRect(); if (!image?.naturalWidth || !image?.naturalHeight || !rect?.width || !rect?.height) return 1000; const frameRatio = rect.width / rect.height, imageRatio = image.naturalWidth / image.naturalHeight; return Math.max(1000, Math.min(4000, Math.round(1000 * Math.max(frameRatio / imageRatio, imageRatio / frameRatio)))); }
  function insertedCropGeometry(frame, crop) { const viewportElement = frame?.node?.querySelector(".viewport"), image = viewportElement?.querySelector("img"), viewport = viewportElement?.getBoundingClientRect(); if (!viewport || !image?.naturalWidth || !image?.naturalHeight) return null; const scale = Math.max(1000, Math.min(4000, crop?.scale || 1000)) / 1000, containScale = Math.min(viewport.width / image.naturalWidth, viewport.height / image.naturalHeight), width = image.naturalWidth * containScale * scale, height = image.naturalHeight * containScale * scale, factor = scale - 1, translateX = (500 - (crop?.x ?? 500)) / 1000 * factor * viewport.width, translateY = (500 - (crop?.y ?? 500)) / 1000 * factor * viewport.height; return { viewport, width, height, left: (viewport.width - width) / 2 + translateX, top: (viewport.height - height) / 2 + translateY }; }
  function insertedCropFromContentPosition(frame, crop, left, top) { const geometry = insertedCropGeometry(frame, crop); if (!geometry) return crop; const clampedLeft = Math.max(geometry.viewport.width - geometry.width, Math.min(0, left)), clampedTop = Math.max(geometry.viewport.height - geometry.height, Math.min(0, top)), factor = crop.scale / 1000 - 1, baseLeft = (geometry.viewport.width - geometry.width) / 2, baseTop = (geometry.viewport.height - geometry.height) / 2; return { ...crop, x: Math.abs(factor * geometry.viewport.width) < .5 ? 500 : Math.max(0, Math.min(1000, Math.round(500 - (clampedLeft - baseLeft) / (factor * geometry.viewport.width) * 1000))), y: Math.abs(factor * geometry.viewport.height) < .5 ? 500 : Math.max(0, Math.min(1000, Math.round(500 - (clampedTop - baseTop) / (factor * geometry.viewport.height) * 1000))) }; }
  function insertedCropFromHandle(frame, crop, handle, dx, dy) { const geometry = insertedCropGeometry(frame, crop); if (!geometry) return crop; const horizontal = handle.includes("e") ? dx : handle.includes("w") ? -dx : 0, vertical = handle.includes("s") ? dy : handle.includes("n") ? -dy : 0, ratio = horizontal && vertical ? (horizontal / Math.max(1, geometry.width) + vertical / Math.max(1, geometry.height)) / 2 : horizontal ? horizontal / Math.max(1, geometry.width) : vertical / Math.max(1, geometry.height), scale = Math.max(insertedCropMinimumScale(frame), Math.min(4000, Math.round(crop.scale * (1 + ratio)))), next = { ...crop, scale }, resized = insertedCropGeometry(frame, next); if (!resized) return next; const left = handle.includes("w") ? geometry.left + geometry.width - resized.width : handle.includes("e") ? geometry.left : geometry.left + (geometry.width - resized.width) / 2, top = handle.includes("n") ? geometry.top + geometry.height - resized.height : handle.includes("s") ? geometry.top : geometry.top + (geometry.height - resized.height) / 2; return insertedCropFromContentPosition(frame, next, left, top); }
  function cropEntryState(element, frame) { const existing = cropStateOf(element); if (existing?.model === "v2") return existing; return { scale: 1000, x: 500, y: 500, model: "v2" }; }
  function cropFrameFor(element) { return STATE.cropFrames.get(element.getAttribute("data-id")); }
  function ensureCropFrame(element, savedRect = null) { const id = element.getAttribute("data-id"); const existing = cropFrameFor(element); if (existing) return existing; const parent = element.parentElement; const sourceFrame = parent?.getAttribute("data-nutbook-crop-frame") === "1" ? parent : null; const measured = element.getBoundingClientRect(); const replacementRect = savedRect || element.__nutbookReplacementFrameRect; const sourceRect = sourceFrame?.getBoundingClientRect(); const rect = replacementRect?.width > 1 && replacementRect?.height > 1 ? replacementRect : sourceRect?.width > 1 && sourceRect?.height > 1 ? sourceRect : measured; delete element.__nutbookReplacementFrameRect; const wrapper = sourceFrame || document.createElement("span"); const frame = { wrapper, created: !sourceFrame, originalStyle: element.getAttribute("style") || "", originalCrop: cropStateOf(element), controls: null, drag: null }; if (!sourceFrame) { wrapper.setAttribute("data-nutbook-crop-frame", "1"); element.before(wrapper); wrapper.append(element); } wrapper.style.setProperty("display", getComputedStyle(element).display === "block" ? "block" : "inline-block", "important"); wrapper.style.setProperty("position", "relative", "important"); wrapper.style.setProperty("overflow", "hidden", "important"); wrapper.style.setProperty("vertical-align", "top", "important"); wrapper.style.setProperty("width", `${Math.max(1, Math.round(rect.width))}px`, "important"); wrapper.style.setProperty("height", `${Math.max(1, Math.round(rect.height))}px`, "important");
    STATE.cropFrames.set(id, frame); return frame;
  }
  // The crop frame owns only geometry. Keep author styling (filters, borders,
  // radii, etc.) on the image; clearing it was why completing a crop changed
  // the original image appearance even when the crop itself was unchanged.
  function applyImageCrop(element, crop, options = {}) { const frame = ensureCropFrame(element); if (options.persist !== false) writeCropState(element, crop); const legacy = crop?.model === "legacy", position = crop ? `${crop.x / 10}% ${crop.y / 10}%` : "50% 50%"; element.style.removeProperty("all"); element.style.setProperty("position", "absolute", "important"); element.style.setProperty("inset", "0", "important"); element.style.setProperty("display", "block", "important"); element.style.setProperty("box-sizing", "border-box", "important"); element.style.setProperty("width", "100%", "important"); element.style.setProperty("height", "100%", "important"); element.style.setProperty("max-width", "none", "important"); element.style.setProperty("margin", "0", "important"); element.style.setProperty("object-fit", legacy ? "contain" : "cover", "important"); element.style.setProperty("object-position", position, "important"); element.style.setProperty("transform-origin", position, "important"); element.style.setProperty("transform", crop ? `scale(${(crop.scale / 1000).toFixed(3)})` : "none", "important"); frame.wrapper.classList.add("nutbook-html-edit-cropping"); }
  function decorateCropToolbar(toolbar) { if (toolbar.dataset.iconsReady === "1") return; toolbar.dataset.iconsReady = "1"; const hint = toolbar.querySelector("span"); if (hint) hint.remove(); const cancel = toolbar.querySelector('[data-action="cancel"]'), done = toolbar.querySelector('[data-action="done"]'); if (cancel) setImageActionIcon(cancel, "close", "取消裁切"); if (done) setImageActionIcon(done, "done", "完成裁切"); }
  function layoutCropContext(active, geometry) { const viewport = geometry.viewport, imageLeft = viewport.left + geometry.left, imageTop = viewport.top + geometry.top, imageRight = imageLeft + geometry.width, imageBottom = imageTop + geometry.height; const regions = { top: { left: imageLeft, top: imageTop, width: geometry.width, height: Math.max(0, viewport.top - imageTop) }, bottom: { left: imageLeft, top: viewport.bottom, width: geometry.width, height: Math.max(0, imageBottom - viewport.bottom) }, left: { left: imageLeft, top: Math.max(imageTop, viewport.top), width: Math.max(0, viewport.left - imageLeft), height: Math.max(0, Math.min(imageBottom, viewport.bottom) - Math.max(imageTop, viewport.top)) }, right: { left: viewport.right, top: Math.max(imageTop, viewport.top), width: Math.max(0, imageRight - viewport.right), height: Math.max(0, Math.min(imageBottom, viewport.bottom) - Math.max(imageTop, viewport.top)) } }; for (const [name, region] of Object.entries(regions)) { const part = active.overlay.querySelector(`[data-crop-context-part="${name}"]`), image = part?.querySelector("img"); if (!part || !image) continue; part.style.display = region.width > .5 && region.height > .5 ? "block" : "none"; Object.assign(part.style, { left: `${Math.round(region.left)}px`, top: `${Math.round(region.top)}px`, width: `${Math.round(region.width)}px`, height: `${Math.round(region.height)}px` }); Object.assign(image.style, { left: `${Math.round(imageLeft - region.left)}px`, top: `${Math.round(imageTop - region.top)}px`, width: `${Math.round(geometry.width)}px`, height: `${Math.round(geometry.height)}px` }); } }
  function layoutCropOverlay(active) { const geometry = cropContentGeometry(active.element, active.frame, active.crop), viewport = geometry.viewport, overlay = active.overlay; const stage = overlay.querySelector("[data-crop-viewport]"), image = overlay.querySelector("[data-crop-content]"), edge = overlay.querySelector("[data-crop-edge]"), crop = active.crop, position = `${crop.x / 10}% ${crop.y / 10}%`; layoutCropContext(active, geometry); Object.assign(stage.style, { left: `${Math.round(viewport.left)}px`, top: `${Math.round(viewport.top)}px`, width: `${Math.round(viewport.width)}px`, height: `${Math.round(viewport.height)}px` }); Object.assign(image.style, { left: "0", top: "0", width: "100%", height: "100%", objectFit: "cover", objectPosition: position, transformOrigin: position, transform: `scale(${(crop.scale / 1000).toFixed(3)})` }); Object.assign(edge.style, { left: `${Math.round(viewport.left + geometry.left)}px`, top: `${Math.round(viewport.top + geometry.top)}px`, width: `${Math.round(geometry.width)}px`, height: `${Math.round(geometry.height)}px` }); const toolbar = overlay.querySelector(".nutbook-html-edit-crop-toolbar"); decorateCropToolbar(toolbar); const showBelow = viewport.bottom + 48 < window.innerHeight, half = Math.ceil(toolbar.getBoundingClientRect().width / 2), left = Math.max(half + 8, Math.min(window.innerWidth - half - 8, viewport.left + viewport.width / 2)); Object.assign(toolbar.style, { left: `${Math.round(left)}px`, top: `${Math.round(showBelow ? viewport.bottom + 10 : viewport.top - toolbar.getBoundingClientRect().height - 10)}px`, bottom: "auto" }); }
  function restoreCropSourceVisibility(active) { if (active.sourceVisibility.value) active.element.style.setProperty("visibility", active.sourceVisibility.value, active.sourceVisibility.priority); else active.element.style.removeProperty("visibility"); }
  // The ordinary-image node is the interaction identity. During crop it is
  // hidden only while the overlay previews it; completion must restore and
  // mutate that same node, not replace it with a clone whose buttons retain
  // stale event closures.
  function endImageCrop(options = {}) { const active = STATE.activeCrop; if (!active) return; active.cleanup?.(); const crop = active.crop; const changed = !cropStateEquals(crop, active.originalCrop); if (options.cancel) restoreCropSourceVisibility(active); else if (changed) { const viewportRect = active.frame.wrapper.getBoundingClientRect(); const element = active.element; restoreCropSourceVisibility(active); const frame = ensureCropFrame(element, { width: viewportRect.width, height: viewportRect.height }); applyImageCrop(element, crop); frame.wrapper.classList.remove("nutbook-html-edit-cropping"); layoutImageActions(); recomputeChanges(); captureHistoryNow(`source:${element.getAttribute("data-id")}`); STATE.documentRevision += 1; emitHostMessage({ type: "html_edit_document_changed", ...stateSnapshot() }); } else restoreCropSourceVisibility(active); active.overlay.remove(); STATE.activeCrop = null; syncInlineToolbar(); }
  async function beginImageCrop(element) { if (!STATE.editing || STATE.activeCrop?.element === element) return; endImageCrop(); if (!element.complete) await new Promise((resolve) => element.addEventListener("load", resolve, { once: true })); if (!element.naturalWidth || !element.naturalHeight) return; const target = imageActionAnchor(element); const viewportRect = target.getBoundingClientRect(); if (viewportRect.width < 2 || viewportRect.height < 2) return; const frame = { wrapper: { getBoundingClientRect: () => imageActionAnchor(element)?.getBoundingClientRect() || viewportRect } }, existing = cropStateOf(element), crop = cropEntryState(element, frame); const overlay = document.createElement("div"), source = element.currentSrc || element.src; overlay.className = "nutbook-html-edit-crop-overlay nutbook-html-edit-source-crop-overlay"; overlay.innerHTML = `<div data-crop-context>${["top","bottom","left","right"].map((part) => `<span data-crop-context-part="${part}"><img src="${source}" alt=""></span>`).join("")}</div><div data-crop-viewport><img data-crop-content src="${source}" alt=""></div><div data-crop-edge><i data-handle="nw"></i><i data-handle="n"></i><i data-handle="ne"></i><i data-handle="e"></i><i data-handle="se"></i><i data-handle="s"></i><i data-handle="sw"></i><i data-handle="w"></i></div><div class="nutbook-html-edit-crop-toolbar"><span>拖动图片取景</span><button type="button" data-action="cancel">取消</button><button type="button" data-action="done">完成</button></div>`; overlay.style.zIndex = "2147483647"; document.body.append(overlay); const sourceVisibility = { value: element.style.getPropertyValue("visibility"), priority: element.style.getPropertyPriority("visibility") }; element.style.setProperty("visibility", "hidden", "important"); const active = STATE.activeCrop = { element, frame, overlay, crop, originalCrop: existing, drag: null, sourceVisibility }; layoutCropOverlay(active); const update = (next) => { active.crop = next; layoutCropOverlay(active); }; overlay.addEventListener("click", (event) => { const action = event.target.closest("[data-action]")?.getAttribute("data-action"); if (action) { event.preventDefault(); endImageCrop({ cancel: action === "cancel" }); } }); const start = (event, kind, handle = "") => { active.drag = { kind, handle, x: event.clientX, y: event.clientY, crop: active.crop, geometry: cropContentGeometry(element, frame, active.crop) }; event.preventDefault(); event.stopPropagation(); }; const content = overlay.querySelector("[data-crop-content]"), edge = overlay.querySelector("[data-crop-edge]"); const onContent = (event) => start(event, "pan"); const onEdge = (event) => { const handle = event.target.closest("[data-handle]"); if (handle) start(event, "zoom", handle.getAttribute("data-handle") || ""); }; content.addEventListener("pointerdown", onContent); edge.addEventListener("pointerdown", onEdge); const move = (event) => { const drag = active.drag; if (!drag) return; const dx = event.clientX - drag.x, dy = event.clientY - drag.y; if (drag.kind === "zoom") return update(cropImageFromHandle(element, frame, drag.crop, drag.handle, dx, dy)); update(cropFromContentPosition(element, frame, drag.crop, drag.geometry.left + dx, drag.geometry.top + dy)); }; const stop = () => { active.drag = null; }; const relayout = () => STATE.activeCrop === active && layoutCropOverlay(active); active.cleanup = () => { content.removeEventListener("pointerdown", onContent); edge.removeEventListener("pointerdown", onEdge); window.removeEventListener("pointermove", move, true); window.removeEventListener("pointerup", stop, true); window.removeEventListener("pointercancel", stop, true); window.removeEventListener("scroll", relayout, true); window.removeEventListener("resize", relayout, true); }; window.addEventListener("pointermove", move, true); window.addEventListener("pointerup", stop, true); window.addEventListener("pointercancel", stop, true); window.addEventListener("scroll", relayout, true); window.addEventListener("resize", relayout, true); }
  function isAllowedAssetRelativePath(path) { return /^\.nutbook\/html-edit\/assets\/html-edit-[A-Za-z0-9-]+\/[a-f0-9]{64}\.(png|jpe?g|gif|webp)$/.test(String(path || "")); }
  function writeRuntimeImageUrl(element, editableType, runtimeUrl) { if (editableType === "background-image") element.style.backgroundImage = `url(${JSON.stringify(runtimeUrl)})`; else element.setAttribute("src", runtimeUrl); }
  function removeCropStyles(element) { for (const property of ["all", "position", "inset", "left", "top", "display", "box-sizing", "width", "height", "max-width", "margin", "padding", "border", "border-radius", "box-shadow", "filter", "object-fit", "object-position", "transform-origin", "transform"]) element.style.removeProperty(property); }
  function resetImageCropForReplacement(element) { if (STATE.activeCrop?.element === element) endImageCrop({ cancel: true }); const frame = cropFrameFor(element); const sourceFrame = element.parentElement?.getAttribute("data-nutbook-crop-frame") === "1" ? element.parentElement : null; const wrapper = frame?.wrapper || sourceFrame; const rect = wrapper?.getBoundingClientRect() || element.getBoundingClientRect(); element.__nutbookReplacementFrameRect = { width: rect.width, height: rect.height }; const wasPersisted = Boolean(sourceFrame || (frame && !frame.created)); if (wrapper) { wrapper.before(element); wrapper.remove(); STATE.cropFrames.delete(element.getAttribute("data-id")); } removeCropStyles(element); writeCropState(element, null); if (wasPersisted) element.setAttribute("data-nutbook-crop-reset", "1"); else element.removeAttribute("data-nutbook-crop-reset"); }
  function applyImportedAsset({ runtimeSessionId, dataId, editableType, relativePath, runtimeUrl }) { if (!STATE.editing || runtimeSessionId !== STATE.sessionId) return false; const element = findEditableImageTarget(dataId, editableType); if (!element || !isAllowedAssetRelativePath(relativePath) || !/^https?:\/\//.test(String(runtimeUrl || ""))) return false; if (editableType === "image") { const baseline = STATE.baseline.get(dataId); const currentSources = pictureSources(element); if (!canApplyPictureSources(element, currentSources, baseline?.pictureSources || [])) return false; resetImageCropForReplacement(element); constrainImportedImageLayout(element); element.addEventListener("load", layoutImageActions, { once: true }); writeRuntimeImageUrl(element, editableType, runtimeUrl); applyPictureSources(element, runtimeUrl, currentSources, baseline?.pictureSources || []); layoutImageActions(); } else writeRuntimeImageUrl(element, editableType, runtimeUrl); STATE.runtimeAssetUrls.set(relativePath, runtimeUrl); element.setAttribute("data-nutbook-asset-relative-path", relativePath); recomputeChanges(); captureHistoryNow(`source:${dataId}`); STATE.documentRevision += 1; syncInlineToolbar(); emitHostMessage({ type: "html_edit_document_changed", ...stateSnapshot() }); return true; }
  function canApplyPictureSources(image, currentSources, originalSources) { const sources = pictureSources(image); return sources.length === currentSources.length && sources.length === originalSources.length && sources.every((source, index) => source.getAttribute("srcset") === currentSources[index].getAttribute("srcset")); }
  function applyPictureSources(image, runtimeUrl, currentSources, originalSources) { if (!canApplyPictureSources(image, currentSources, originalSources)) return null; for (const source of pictureSources(image)) source.setAttribute("srcset", runtimeUrl); return originalSources.map((source) => ({ index: source.index, originalSrcsetHash: source.originalSrcsetHash })); }
  function insertedCanvasEligible() { const page = presentationPageRoot(); if (STATE.presentation) { if (!page) return false; const style = getComputedStyle(page); return style.transform === "none" && style.perspective === "none" && style.filter === "none"; } const root = document.documentElement, body = document.body, style = (node) => getComputedStyle(node); const unsafe = (node) => { const value = style(node); return value.transform !== "none" || value.perspective !== "none" || value.filter !== "none" || /paint|strict|content/.test(value.contain || ""); }; const bodyPosition = style(body).position; return document.scrollingElement === root && !unsafe(root) && !unsafe(body) && (bodyPosition === "static" || bodyPosition === "relative"); }
  // Existing inserted frames are saved in this layer's own absolute-positioning
  // containing block.  Reconstructing that block from body/document metrics is
  // not reliable: author CSS can give body margins, padding, borders or unusual
  // sizing.  Keep the saved layer in layout (visibility:hidden) while editing
  // and use its measured rect as the single geometry source for both hydration
  // and the fixed runtime overlay.
  function insertedCanvas() { const page = presentationPageRoot(); if (STATE.presentation && page) { const rect = page.getBoundingClientRect(); return { width: rect.width, height: rect.height, scrollX: 0, scrollY: 0, originX: rect.left, originY: rect.top }; } const root = document.scrollingElement, body = document.body, bodyRect = body.getBoundingClientRect(), layerRect = staticInsertedImageLayer()?.getBoundingClientRect(); const scrollX = root.scrollLeft || window.scrollX || 0, scrollY = root.scrollTop || window.scrollY || 0; const hasSavedLayer = Number.isFinite(layerRect?.width) && layerRect.width > 0 && Number.isFinite(layerRect?.height) && layerRect.height > 0; return hasSavedLayer ? { width: layerRect.width, height: layerRect.height, scrollX, scrollY, originX: layerRect.left + scrollX, originY: layerRect.top + scrollY } : { width: Math.max(body.scrollWidth, body.clientWidth), height: Math.max(body.scrollHeight, body.clientHeight), scrollX, scrollY, originX: bodyRect.left + scrollX, originY: bodyRect.top + scrollY }; }
  function newInsertedImageId() { let id; do { id = `inserted-image-${crypto.randomUUID()}`; } while (STATE.insertedImages.has(id)); return id; }
  function clampFrameToCanvas(frame, canvas = insertedCanvas()) { const min = 48; const width = Math.min(canvas.width, Math.max(min, frame.width || min)); const height = Math.min(canvas.height, Math.max(min, frame.height || min)); return { ...frame, left: Math.max(0, Math.min(canvas.width - width, frame.left || 0)), top: Math.max(0, Math.min(canvas.height - height, frame.top || 0)), width, height }; }
  function serializeFramePermille(frame, canvas = insertedCanvas()) { const clamped = clampFrameToCanvas(frame, canvas); const ratio = (value, size) => Math.max(1, Math.min(1000, Math.round(value * 1000 / size))); const left = Math.max(0, Math.min(999, Math.round(clamped.left * 1000 / canvas.width))); const top = Math.max(0, Math.min(999, Math.round(clamped.top * 1000 / canvas.height))); const width = Math.max(1, Math.min(1000 - left, ratio(clamped.width, canvas.width))); const height = Math.max(1, Math.min(1000 - top, ratio(clamped.height, canvas.height))); return { leftPermille: left, topPermille: top, widthPermille: width, heightPermille: height }; }
  function insertedFrameFromPermille(change, canvas = insertedCanvas()) { return { left: change.leftPermille * canvas.width / 1000, top: change.topPermille * canvas.height / 1000, width: change.widthPermille * canvas.width / 1000, height: change.heightPermille * canvas.height / 1000 }; }
  function ensureInsertedImageLayer() { if (STATE.insertedImageLayerRoot) return true; if (!insertedCanvasEligible()) { emitHostMessage({ type: "html_edit_inserted_image_unsupported", runtimeSessionId: STATE.sessionId }); return false; } const host = document.createElement("div"); host.id = "nutbook-html-edit-inserted-image-layer"; for (const [key, value] of Object.entries({ position: "fixed", inset: "0", zIndex: "2147483645", overflow: "visible", pointerEvents: "none" })) host.style.setProperty(key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`), value, "important"); const root = host.attachShadow({ mode: "closed" }); root.innerHTML = `<style>:host{all:initial}.canvas{position:fixed;inset:0;pointer-events:none;font:12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.canvas.draw{pointer-events:auto;cursor:crosshair}.frame{position:fixed;box-sizing:border-box;border:2px dashed #111;background:rgba(255,255,255,.08);pointer-events:auto;cursor:move}.viewport{position:absolute;inset:0;overflow:hidden;pointer-events:auto}.viewport img{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:contain;pointer-events:none;transform-origin:center}.frame:not(.selected) .controls,.frame:not(.selected) .handle,.frame.cropping .controls,.frame.cropping .handle{display:none}.controls{position:absolute;left:0;top:calc(100% + 6px);display:flex;gap:4px}.controls button{all:initial;position:relative;box-sizing:border-box;background:#111;color:#fff;border-radius:6px;padding:5px 7px;font:600 12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}.controls button[data-tooltip]::after{content:attr(data-tooltip);position:absolute;left:50%;bottom:calc(100% + 7px);transform:translate(-50%,3px);padding:5px 7px;border-radius:6px;background:#111;color:#fff;font:500 11px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .14s ease,transform .14s ease}.controls button[data-tooltip]:hover::after,.controls button[data-tooltip]:focus-visible::after{opacity:1;transform:translate(-50%,0)}.handle{position:absolute;width:10px;height:10px;border:1px solid #111;background:#fff;border-radius:50%;margin:-6px;z-index:2;cursor:crosshair}.handle[data-handle="nw"]{left:0;top:0}.handle[data-handle="n"]{left:50%;top:0}.handle[data-handle="ne"]{right:0;top:0}.handle[data-handle="e"]{right:0;top:50%}.handle[data-handle="se"]{right:0;bottom:0}.handle[data-handle="s"]{left:50%;bottom:0}.handle[data-handle="sw"]{left:0;bottom:0}.handle[data-handle="w"]{left:0;top:50%}</style><div class="canvas"></div>`; document.documentElement.append(host); STATE.insertedImageLayerHost = host; STATE.insertedImageLayerRoot = root; STATE.insertedImageScrollHandler = () => { layoutInsertedImages(); layoutInsertedImageCropOverlay(); }; window.addEventListener("scroll", STATE.insertedImageScrollHandler, true); document.addEventListener("scroll", STATE.insertedImageScrollHandler, true); window.addEventListener("resize", STATE.insertedImageScrollHandler); STATE.insertedImageResizeObserver = new ResizeObserver(() => { layoutInsertedImages(); layoutInsertedImageCropOverlay(); }); STATE.insertedImageResizeObserver.observe(document.documentElement); STATE.insertedImageResizeObserver.observe(document.body); const canvas = root.querySelector(".canvas"); canvas.addEventListener("pointerdown", beginInsertedImagePointer); return true; }
  function removeInsertedImageLayer() { endInsertedImageCrop({ cancel: true }); STATE.insertedImageResizeObserver?.disconnect(); if (STATE.insertedImageScrollHandler) { window.removeEventListener("scroll", STATE.insertedImageScrollHandler, true); document.removeEventListener("scroll", STATE.insertedImageScrollHandler, true); window.removeEventListener("resize", STATE.insertedImageScrollHandler); } STATE.insertedImageLayerHost?.remove(); STATE.insertedImageLayerHost = null; STATE.insertedImageLayerRoot = null; STATE.insertedImageResizeObserver = null; STATE.insertedImageScrollHandler = null; STATE.selectedInsertedImageId = ""; STATE.draftInsertedImage = null; STATE.insertFrameMode = false; }
  function insertedCanvasElement() { return STATE.insertedImageLayerRoot?.querySelector(".canvas"); }
  function beginInsertedImageDraft() { if (!STATE.editing || !ensureInsertedImageLayer()) return false; STATE.insertFrameMode = true; insertedCanvasElement()?.classList.add("draw"); syncInlineToolbar(); return true; }
  function beginInsertedImagePointer(event) { if (!STATE.insertFrameMode || event.target !== event.currentTarget) return; const canvasElement = event.currentTarget; const canvas = insertedCanvas(); const start = { left: event.clientX + canvas.scrollX - canvas.originX, top: event.clientY + canvas.scrollY - canvas.originY }; const id = newInsertedImageId(); STATE.draftInsertedImage = { id, pageId: STATE.presentation ? STATE.activePresentationPageId : undefined, ...start, width: 48, height: 48, imported: false }; canvasElement.setPointerCapture(event.pointerId); const move = (next) => { if (next.pointerId !== event.pointerId || !STATE.draftInsertedImage?.id) return; const x = next.clientX + canvas.scrollX - canvas.originX, y = next.clientY + canvas.scrollY - canvas.originY; STATE.draftInsertedImage = clampFrameToCanvas({ ...STATE.draftInsertedImage, left: Math.min(start.left, x), top: Math.min(start.top, y), width: Math.abs(x - start.left), height: Math.abs(y - start.top) }, canvas); createOrUpdateInsertedImageFrame(STATE.draftInsertedImage); }; const finish = (next) => { if (next?.pointerId != null && next.pointerId !== event.pointerId) return; window.removeEventListener("pointermove", move, true); window.removeEventListener("pointerup", finish, true); window.removeEventListener("pointercancel", finish, true); canvasElement.removeEventListener("lostpointercapture", finish); if (canvasElement.hasPointerCapture?.(event.pointerId)) canvasElement.releasePointerCapture(event.pointerId); selectInsertedImage(id); }; window.addEventListener("pointermove", move, true); window.addEventListener("pointerup", finish, true); window.addEventListener("pointercancel", finish, true); canvasElement.addEventListener("lostpointercapture", finish); }
  function insertedCropState(frame) { const crop = frame?.crop; if (!crop || !Number.isInteger(crop.scale) || !Number.isInteger(crop.x) || !Number.isInteger(crop.y)) return null; const normalized = { scale: Math.max(1000, Math.min(4000, crop.scale)), x: Math.max(0, Math.min(1000, crop.x)), y: Math.max(0, Math.min(1000, crop.y)) }; return normalized.scale === 1000 && normalized.x === 500 && normalized.y === 500 ? null : normalized; }
  function insertedCropEntryState(frame) { const existing = insertedCropState(frame); return existing || { scale: insertedCropMinimumScale(frame), x: 500, y: 500 }; }
  function insertedCropToken(frame) { const crop = insertedCropState(frame); return crop ? `nutbook-inserted-crop:v1:${crop.scale}:${crop.x}:${crop.y}` : undefined; }
  function insertedCropTransform(frame, crop) { const viewport = frame.node?.querySelector(".viewport"); const rect = viewport?.getBoundingClientRect(); const factor = (crop.scale - 1000) / 1000; const width = Math.max(1, rect?.width || frame.width || 1); const height = Math.max(1, rect?.height || frame.height || 1); const x = (500 - crop.x) / 1000 * factor * width; const y = (500 - crop.y) / 1000 * factor * height; return `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${(crop.scale / 1000).toFixed(3)})`; }
  // No crop record means "show the frame's current cover view".  Switching it
  // to contain here was the source of the visible jump when crop mode opened.
  function applyInsertedImageCrop(frame) { const image = frame.node?.querySelector(".viewport img"); if (!image) return; const crop = insertedCropState(frame); image.style.objectFit = crop ? "contain" : "cover"; image.style.transform = crop ? insertedCropTransform(frame, crop) : ""; }
  function createOrUpdateInsertedImageFrame(frame) { if (!ensureInsertedImageLayer()) return null; const canvas = insertedCanvasElement(); let node = canvas.querySelector(`[data-nutbook-inserted-image-id="${frame.id}"]`); if (!node) { node = document.createElement("div"); node.className = "frame"; node.dataset.nutbookInsertedImageId = frame.id; node.innerHTML = `<div class="viewport"><img alt=""></div><div class="controls"></div>${["nw","n","ne","e","se","s","sw","w"].map((handle) => `<i class="handle" data-handle="${handle}"></i>`).join("")}`; node.addEventListener("pointerdown", (event) => startInsertedFrameDrag(event, frame.id)); canvas.append(node); } STATE.insertedImages.set(frame.id, { ...(STATE.insertedImages.get(frame.id) || {}), ...frame, crop: insertedCropState(frame) || null, node }); layoutInsertedImages(); return node; }
  function layoutInsertedImages() { const canvas = insertedCanvas(); for (const frame of STATE.insertedImages.values()) { const node = frame.node; if (!node) continue; if (STATE.presentation && frame.pageId !== STATE.activePresentationPageId) { node.style.display = "none"; continue; } node.style.display = "block"; const geometry = frame.leftPermille != null ? insertedFrameFromPermille(frame, canvas) : frame; const measured = Number.isFinite(frame.runtimeDocumentLeft) && Number.isFinite(frame.runtimeDocumentTop); node.style.left = `${measured ? frame.runtimeDocumentLeft - canvas.scrollX : geometry.left + canvas.originX - canvas.scrollX}px`; node.style.top = `${measured ? frame.runtimeDocumentTop - canvas.scrollY : geometry.top + canvas.originY - canvas.scrollY}px`; node.style.width = `${measured ? frame.runtimeWidth : geometry.width}px`; node.style.height = `${measured ? frame.runtimeHeight : geometry.height}px`; node.classList.toggle("selected", STATE.selectedInsertedImageId === frame.id); const image = node.querySelector(".viewport img"); image.hidden = !frame.imported; if (frame.runtimeUrl && image.getAttribute("src") !== frame.runtimeUrl) image.src = frame.runtimeUrl; image.alt = frame.alt || ""; applyInsertedImageCrop(frame); const controls = node.querySelector(".controls"); controls.replaceChildren(); const add = (label, action, icon = "") => { const button = document.createElement("button"); button.type = "button"; if (icon) setImageActionIcon(button, icon, label); else button.textContent = label; button.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); action(); }); controls.append(button); }; if (!frame.imported) { add("确认框选", () => commitInsertedImageDraft()); add("取消框选", () => cancelInsertedImageDraft()); } else { add("替换图片", () => requestInsertedImageReplacement(frame.id), "replace"); add("裁切显示", () => beginInsertedImageCrop(frame.id), "crop"); add("删除图片框", () => deleteInsertedImage(frame.id), "trash"); } } }
  function layoutInsertedImageCropOverlay() { const active = STATE.activeInsertedImageCrop; if (!active) return; const frame = STATE.insertedImages.get(active.id), crop = frame?.crop || active.crop, geometry = insertedCropGeometry(frame, crop); if (!geometry) return; const rect = geometry.viewport, overlay = active.overlay, viewport = overlay.querySelector("[data-crop-viewport]"), edge = overlay.querySelector("[data-crop-edge]"); layoutCropContext(active, geometry); Object.assign(viewport.style, { left: `${Math.round(rect.left)}px`, top: `${Math.round(rect.top)}px`, width: `${Math.round(rect.width)}px`, height: `${Math.round(rect.height)}px` }); Object.assign(edge.style, { left: `${Math.round(rect.left + geometry.left)}px`, top: `${Math.round(rect.top + geometry.top)}px`, width: `${Math.round(geometry.width)}px`, height: `${Math.round(geometry.height)}px` }); const toolbar = overlay.querySelector(".nutbook-html-edit-crop-toolbar"); if (!toolbar) return; decorateCropToolbar(toolbar); const showBelow = rect.bottom + 48 < window.innerHeight; const half = Math.ceil(toolbar.getBoundingClientRect().width / 2); const left = Math.max(half + 8, Math.min(window.innerWidth - half - 8, rect.left + rect.width / 2)); toolbar.style.position = "fixed"; toolbar.style.left = `${Math.round(left)}px`; toolbar.style.transform = "translateX(-50%)"; toolbar.style.top = showBelow ? `${Math.round(rect.bottom + 10)}px` : `${Math.round(rect.top - toolbar.getBoundingClientRect().height - 10)}px`; toolbar.style.bottom = "auto"; }
  function endInsertedImageCrop(options = {}) { const active = STATE.activeInsertedImageCrop; if (!active) return; const frame = STATE.insertedImages.get(active.id); active.cleanup?.(); active.overlay?.remove(); frame?.node?.classList.remove("cropping"); if (frame && options.cancel) { STATE.insertedImages.set(active.id, { ...frame, crop: active.originalCrop }); layoutInsertedImages(); } STATE.activeInsertedImageCrop = null; recomputeChanges(); captureHistoryNow(`inserted:${active.id}`); STATE.documentRevision += 1; syncInlineToolbar(); emitHostMessage({ type: "html_edit_document_changed", ...stateSnapshot() }); }
  function beginInsertedImageCrop(id, options = {}) { const current = STATE.insertedImages.get(id); if (!STATE.editing || !current?.imported || STATE.activeInsertedImageCrop?.id === id) return; const image = current.node?.querySelector(".viewport img"); if (!image?.complete || !image.naturalWidth || !image.naturalHeight) { image?.addEventListener("load", () => beginInsertedImageCrop(id, options), { once: true }); return; } endInsertedImageCrop(); const originalCrop = insertedCropState(current); const crop = insertedCropEntryState(current, options); STATE.insertedImages.set(id, { ...current, crop }); current.node?.classList.add("cropping"); const source = image.currentSrc || image.src || current.runtimeUrl || ""; const overlay = document.createElement("div"); overlay.className = "nutbook-html-edit-crop-overlay nutbook-html-edit-inserted-crop-overlay"; overlay.innerHTML = `<div data-crop-context>${["top","bottom","left","right"].map((part) => `<span data-crop-context-part="${part}"><img src="${source}" alt=""></span>`).join("")}</div><div data-crop-viewport></div><div data-crop-edge><i data-handle="nw"></i><i data-handle="n"></i><i data-handle="ne"></i><i data-handle="e"></i><i data-handle="se"></i><i data-handle="s"></i><i data-handle="sw"></i><i data-handle="w"></i></div><div class="nutbook-html-edit-crop-toolbar"><span>拖动图片取景</span><button type="button" data-action="cancel">取消</button><button type="button" data-action="done">完成</button></div>`; overlay.style.zIndex = "2147483647"; document.body.append(overlay); const active = STATE.activeInsertedImageCrop = { id, overlay, originalCrop, crop, drag: null, layoutFrame: 0 }; layoutInsertedImageCropOverlay(); layoutInsertedImages(); active.layoutFrame = requestAnimationFrame(() => { active.layoutFrame = 0; if (STATE.activeInsertedImageCrop === active) layoutInsertedImageCropOverlay(); }); const update = (next) => { const frame = STATE.insertedImages.get(id); if (!frame) return; active.crop = next; STATE.insertedImages.set(id, { ...frame, crop: next }); layoutInsertedImageCropOverlay(); layoutInsertedImages(); recomputeChanges(); STATE.documentRevision += 1; syncInlineToolbar(); emitHostMessage({ type: "html_edit_document_changed", ...stateSnapshot() }); };
    overlay.addEventListener("click", (event) => { const action = event.target?.closest?.("[data-action]")?.getAttribute("data-action"); if (action) { event.preventDefault(); event.stopPropagation(); endInsertedImageCrop({ cancel: action === "cancel" }); } }); const start = (event, kind, handle = "") => { const frame = STATE.insertedImages.get(id), currentCrop = frame?.crop || active.crop, geometry = insertedCropGeometry(frame, currentCrop); if (!frame || !geometry) return; active.drag = { kind, handle, x: event.clientX, y: event.clientY, crop: currentCrop, geometry }; event.preventDefault(); event.stopPropagation(); };
    const onFramePointerDown = (event) => { if (event.target.closest("button")) return; start(event, "pan"); }; const onOverlayPointerDown = (event) => { const handle = event.target.closest("[data-handle]"); if (handle) start(event, "zoom", handle.getAttribute("data-handle") || ""); }; const move = (event) => { const drag = active.drag, frame = STATE.insertedImages.get(id); if (!drag || !frame) return; const dx = event.clientX - drag.x, dy = event.clientY - drag.y; if (drag.kind === "zoom") update(insertedCropFromHandle(frame, drag.crop, drag.handle, dx, dy)); else update(insertedCropFromContentPosition(frame, drag.crop, drag.geometry.left + dx, drag.geometry.top + dy)); }; const stop = () => { active.drag = null; captureHistoryNow(`inserted:${id}`); }; const viewport = current.node?.querySelector(".viewport"); viewport?.addEventListener("pointerdown", onFramePointerDown, true); overlay.addEventListener("pointerdown", onOverlayPointerDown, true); active.cleanup = () => { if (active.layoutFrame) cancelAnimationFrame(active.layoutFrame); viewport?.removeEventListener("pointerdown", onFramePointerDown, true); overlay.removeEventListener("pointerdown", onOverlayPointerDown, true); window.removeEventListener("pointermove", move, true); window.removeEventListener("pointerup", stop, true); window.removeEventListener("pointercancel", stop, true); }; window.addEventListener("pointermove", move, true); window.addEventListener("pointerup", stop, true); window.addEventListener("pointercancel", stop, true); recomputeChanges(); }
  function selectInsertedImage(id) { STATE.selectedInsertedImageId = id; STATE.insertFrameMode = false; insertedCanvasElement()?.classList.remove("draw"); layoutInsertedImages(); syncInlineToolbar(); }
  function startInsertedFrameDrag(event, id) { if (!STATE.editing || STATE.activeInsertedImageCrop?.id === id || event.target.closest("button")) return; const frameElement = event.currentTarget; const stored = STATE.insertedImages.get(id) || STATE.draftInsertedImage; if (!stored) return; const canvas = insertedCanvas(); const frame = Number.isFinite(stored.runtimeDocumentLeft) ? { ...stored, left: stored.runtimeDocumentLeft - canvas.originX, top: stored.runtimeDocumentTop - canvas.originY, width: stored.runtimeWidth, height: stored.runtimeHeight } : stored.leftPermille != null ? { ...stored, ...insertedFrameFromPermille(stored, canvas) } : stored; event.stopPropagation(); selectInsertedImage(id); const handle = event.target.dataset.handle || ""; const start = { x: event.clientX, y: event.clientY, frame: { ...frame } }; let moved = false; frameElement.setPointerCapture(event.pointerId); const move = (next) => { if (next.pointerId !== event.pointerId) return; const dx = next.clientX - start.x, dy = next.clientY - start.y; if (dx === 0 && dy === 0) return; moved = true; let changed = { ...start.frame }; if (!handle) { changed.left += dx; changed.top += dy; } else { if (handle.includes("w")) { changed.left += dx; changed.width -= dx; } if (handle.includes("e")) changed.width += dx; if (handle.includes("n")) { changed.top += dy; changed.height -= dy; } if (handle.includes("s")) changed.height += dy; } changed = clampFrameToCanvas(changed, canvas); if (changed.imported) { Object.assign(changed, serializeFramePermille(changed, canvas)); changed.canvasWidth = Math.max(1, Math.round(canvas.width)); changed.canvasHeight = Math.max(1, Math.round(canvas.height)); changed.runtimeDocumentLeft = canvas.originX + changed.left; changed.runtimeDocumentTop = canvas.originY + changed.top; changed.runtimeWidth = changed.width; changed.runtimeHeight = changed.height; } STATE.insertedImages.set(id, { ...STATE.insertedImages.get(id), ...changed }); if (STATE.draftInsertedImage?.id === id) STATE.draftInsertedImage = { ...STATE.draftInsertedImage, ...changed }; layoutInsertedImages(); recomputeChanges(); }; const finish = (next) => { if (next?.pointerId != null && next.pointerId !== event.pointerId) return; window.removeEventListener("pointermove", move, true); window.removeEventListener("pointerup", finish, true); window.removeEventListener("pointercancel", finish, true); frameElement.removeEventListener("lostpointercapture", finish); if (frameElement.hasPointerCapture?.(event.pointerId)) frameElement.releasePointerCapture(event.pointerId); if (!moved) return; captureHistoryNow(`inserted:${id}`); STATE.documentRevision += 1; syncInlineToolbar(); emitHostMessage({ type: "html_edit_document_changed", ...stateSnapshot() }); }; window.addEventListener("pointermove", move, true); window.addEventListener("pointerup", finish, true); window.addEventListener("pointercancel", finish, true); frameElement.addEventListener("lostpointercapture", finish); }
  function commitInsertedImageDraft() { const draft = STATE.draftInsertedImage; if (!draft) return; STATE.pendingInsertedImageRequest = { id: draft.id, operation: "create" }; emitHostMessage({ type: "html_edit_inserted_image_confirmed", runtimeSessionId: STATE.sessionId, insertedImageId: draft.id }); }
  function cancelInsertedImageDraft() { const id = STATE.draftInsertedImage?.id; if (!id) return; STATE.insertedImages.get(id)?.node?.remove(); STATE.insertedImages.delete(id); STATE.draftInsertedImage = null; STATE.selectedInsertedImageId = ""; STATE.insertFrameMode = false; insertedCanvasElement()?.classList.remove("draw"); syncInlineToolbar(); }
  function resumeInsertedImageDraft({ runtimeSessionId, insertedImageId, assetRequestId } = {}) { if (runtimeSessionId !== STATE.sessionId || STATE.pendingInsertedImageRequest?.id !== insertedImageId) return false; STATE.pendingInsertedImageRequest = null; selectInsertedImage(insertedImageId); return true; }
  function requestInsertedImageReplacement(id) { const frame = STATE.insertedImages.get(id); if (!frame?.imported) return; STATE.pendingInsertedImageRequest = { id, operation: "replace" }; emitHostMessage({ type: "html_edit_inserted_image_replace_requested", runtimeSessionId: STATE.sessionId, insertedImageId: id }); }
  function deleteInsertedImage(id) { const frame = STATE.insertedImages.get(id); if (!frame) return false; frame.node?.remove(); STATE.insertedImages.delete(id); STATE.selectedInsertedImageId = ""; STATE.draftInsertedImage = STATE.draftInsertedImage?.id === id ? null : STATE.draftInsertedImage; STATE.pendingInsertedImageRequest = STATE.pendingInsertedImageRequest?.id === id ? null : STATE.pendingInsertedImageRequest; if (STATE.insertedImageBaseline.has(id)) STATE.deletedInsertedImageIds.set(id, frame.pageId || STATE.insertedImageBaseline.get(id)?.pageId); else STATE.insertedImageSessionCreatedIds.delete(id); recomputeChanges(); captureHistoryNow(`inserted:${id}`); STATE.documentRevision += 1; emitHostMessage({ type: "html_edit_document_changed", ...stateSnapshot() }); syncInlineToolbar(); return true; }
  function resumeInsertedImageReplacement({ runtimeSessionId, insertedImageId } = {}) { if (runtimeSessionId !== STATE.sessionId || STATE.pendingInsertedImageRequest?.id !== insertedImageId) return false; STATE.pendingInsertedImageRequest = null; return true; }
  function applyInsertedImageAsset({ runtimeSessionId, insertedImageId, assetRequestId, relativePath, runtimeUrl } = {}) { const pending = STATE.pendingInsertedImageRequest; if (!STATE.editing || runtimeSessionId !== STATE.sessionId || !pending || pending.id !== insertedImageId || (pending.assetRequestId && pending.assetRequestId !== assetRequestId) || !isAllowedAssetRelativePath(relativePath) || !/^https?:\/\//.test(String(runtimeUrl || ""))) return false; const current = STATE.insertedImages.get(insertedImageId); if (!current || (pending.operation === "create" && current.imported)) return false; const canvas = insertedCanvas(); const materialized = current.leftPermille != null ? { ...current, ...insertedFrameFromPermille(current) } : current; const next = { ...current, imported: true, relativePath, runtimeUrl, crop: null, canvasWidth: Math.max(1, Math.round(canvas.width)), canvasHeight: Math.max(1, Math.round(canvas.height)), ...serializeFramePermille(materialized) }; STATE.runtimeAssetUrls.set(relativePath, runtimeUrl); STATE.insertedImages.set(insertedImageId, next); STATE.draftInsertedImage = null; STATE.pendingInsertedImageRequest = null; if (!STATE.insertedImageBaseline.has(insertedImageId)) STATE.insertedImageSessionCreatedIds.add(insertedImageId); layoutInsertedImages(); recomputeChanges(); captureHistoryNow(`inserted:${insertedImageId}`); STATE.documentRevision += 1; syncInlineToolbar(); emitHostMessage({ type: "html_edit_document_changed", ...stateSnapshot() }); return true; }
  function setupEditable(element, type) {
    const id = element.getAttribute("data-id"); const role = editRoleOf(element);
    STATE.baseline.set(id, type === "rich-text" ? richBaselineOf(element) : textOf(element));
    element.setAttribute("contenteditable", type === "rich-text" ? "true" : "plaintext-only");
    element.setAttribute("data-nutbook-editing", type);
    element.setAttribute("data-nutbook-edit-role-label", editRoleLabel(role));
    if (type === "text" && role === "plain") element.setAttribute("data-nutbook-plain-text-hint", inlineToolbarText("plainText"));
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
    window.clearTimeout(STATE.historyTimer); STATE.historyTimer = null; STATE.history = []; STATE.historyScopes = []; STATE.historySelections = []; STATE.pendingHistorySelection = null; STATE.pendingInputSelection = null; STATE.historyCursor = -1; STATE.savedHistoryCursor = -1;
    for (const element of [...editableTextElements(), ...editableRichTextElements()]) {
      const id = element.getAttribute("data-id"); const type = isRichEditRole(editRoleOf(element)) ? "rich-text" : "text";
      if (exitOptions.discard && STATE.baseline.has(id)) { if (type === "rich-text") applyRichBaseline(element, STATE.baseline.get(id)); else element.textContent = STATE.baseline.get(id); }
      element.removeAttribute("contenteditable"); element.removeAttribute("data-nutbook-editing");
      element.removeAttribute("data-nutbook-edit-role-label");
      element.removeAttribute("data-nutbook-plain-text-hint");
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
    if (STATE.activeCrop) endImageCrop({ cancel: exitOptions.discard });
    if (exitOptions.discard) restoreInsertedImageBaseline();
    syncStaticInsertedImageLayer();
    STATE.imageButtons.splice(0).forEach((button) => button.remove());
    if (STATE.imageActionLayoutHandler) { window.removeEventListener("scroll", STATE.imageActionLayoutHandler, true); window.removeEventListener("resize", STATE.imageActionLayoutHandler); STATE.imageActionLayoutHandler = null; }
    removeInsertedImageLayer(); STATE.insertedImages.clear(); STATE.insertedImageBaseline.clear(); STATE.insertedImageSessionCreatedIds.clear(); STATE.deletedInsertedImageIds.clear(); STATE.runtimeAssetUrls.clear(); STATE.pendingInsertedImageRequest = null;
    unmountInlineToolbar(); removeEditAffordanceStyles(); deactivateSectionNavigationAdapter(); deactivatePresentationAdapter();
    STATE.editing = false; STATE.dirty = false; STATE.selectedDataId = null; STATE.changes.clear(); STATE.composing = false; STATE.pendingInlineMarks.clear(); STATE.isMutatingDocument = false; STATE.inlineToolbarDock = "bottom"; STATE.inlineToolbarDrag = null; clearSavedSelection();
    document.title = STATE.runtimeTitle || document.location.pathname.split("/").pop() || "Nutbook Runtime";
    window.removeEventListener("keydown", onKeyDownCapture, true); document.removeEventListener("selectionchange", onSelectionChange, true); document.removeEventListener("beforeinput", onBeforeInput, true);
  }
  function normalizeMarkSavedOptions(options) { return typeof options === "string" ? { runtimeSessionId: options, expectedDocumentRevision: null } : { runtimeSessionId: options?.runtimeSessionId || "", expectedDocumentRevision: Number.isInteger(options?.expectedDocumentRevision) ? options.expectedDocumentRevision : null }; }
  function markSaved(options = {}) {
    const saveOptions = normalizeMarkSavedOptions(options); if (saveOptions.runtimeSessionId && saveOptions.runtimeSessionId !== STATE.sessionId) return false;
    if (saveOptions.expectedDocumentRevision !== null && STATE.documentRevision !== saveOptions.expectedDocumentRevision) { reportHistoryDebug("mark-saved-revision-mismatch"); reportState(); return false; }
    recomputeChanges();
    for (const element of [...editableTextElements(), ...editableRichTextElements()]) STATE.baseline.set(element.getAttribute("data-id"), readEditableValue(element));
    for (const element of [...editableImageElements(), ...editableBackgroundImageElements()]) {
      const id = element.getAttribute("data-id"); const baseline = STATE.baseline.get(id); if (!baseline) continue;
      if (baseline.type === "image") { element.removeAttribute("data-nutbook-crop-reset"); element.removeAttribute("data-nutbook-crop-style-migration"); baseline.currentSrc = element.getAttribute("src") || ""; baseline.currentInlineStyle = element.getAttribute("style") || ""; baseline.crop = cropStateOf(element); baseline.pictureSources.forEach((source, index) => { source.currentSrcset = pictureSources(element)[index]?.getAttribute("srcset") || ""; }); }
      else baseline.currentStyle = element.getAttribute("style") || "";
    }
    STATE.insertedImageBaseline = new Map([...STATE.insertedImages.entries()].filter(([, frame]) => frame.imported).map(([id, frame]) => [id, insertedBaselineOf(frame)]));
    STATE.insertedImageSessionCreatedIds.clear(); STATE.deletedInsertedImageIds.clear();
    captureHistoryNow(); STATE.savedHistoryCursor = STATE.historyCursor;
    STATE.dirty = false; STATE.changes.clear(); STATE.lastCommittedChangesJson = stableChangesJson({}); STATE.documentRevision += 1; STATE.saveNotice = "saved"; syncInlineToolbar();
    emitHostMessage({ type: "html_edit_document_changed", ...stateSnapshot() }); reportHistoryDebug("mark-saved-applied"); return true;
  }
  function onFocus(event) {
    const field = event.currentTarget; const role = editRoleOf(field);
    STATE.selectedDataId = field.getAttribute("data-id"); STATE.formatState = emptyFormatState(role);
    if (isRichEditRole(role)) updateSavedSelection();
    syncInlineToolbar();
  }
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
      ? { toolbar: "HTML 编辑工具栏", move: "移动工具栏", save: "保存", saved: "已保存", done: "完成", insertImageFrame: "新建图片框", plainText: "纯文本：不支持格式", bold: "加粗", italic: "斜体", paragraph: "正文", "heading-1": "一级标题", "heading-2": "二级标题", "heading-3": "三级标题", "heading-4": "四级标题", "align-left": "左对齐", "align-center": "居中", "align-right": "右对齐", "unordered-list": "无序列表", "ordered-list": "有序列表" }
      : { toolbar: "HTML Edit Toolbar", move: "Move toolbar", save: "Save", saved: "Saved", done: "Done", insertImageFrame: "New image frame", plainText: "Plain text: formatting unavailable", bold: "Bold", italic: "Italic", paragraph: "Paragraph", "heading-1": "Heading 1", "heading-2": "Heading 2", "heading-3": "Heading 3", "heading-4": "Heading 4", "align-left": "Align Left", "align-center": "Align Center", "align-right": "Align Right", "unordered-list": "Bullet List", "ordered-list": "Ordered List" };
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
  function selectedInlineToolbarField() { return STATE.selectedDataId && document.querySelector(selectorFor(STATE.selectedDataId)); }
  function selectedInlineToolbarRole() {
    const field = selectedInlineToolbarField();
    return field ? editRoleOf(field) : "plain";
  }
  function buildInlineToolbar() {
    const toolbar = STATE.inlineToolbar; if (!toolbar) return;
    const tooltip = (key) => `<span class="tooltip" role="tooltip">${inlineToolbarText(key)}</span>`;
    const commandButtons = Array.from(VALID_FORMAT_COMMANDS).map((command) => `<button class="command" data-command="${command}" aria-label="${inlineToolbarText(command)}">${inlineToolbarIcon(command)}${tooltip(command)}</button>`).join("");
    toolbar.root.innerHTML = `<style>:host{all:initial}.bar{position:fixed;z-index:2147483647;display:flex;flex-wrap:wrap;justify-content:center;width:max-content;max-width:calc(100vw - 32px);gap:6px;align-items:center;overflow:visible;padding:8px;background:#fff;border:1px solid #e4e4e7;border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.18);font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.bar[data-dock="bottom"]{left:50%;bottom:20px;transform:translateX(-50%)}.bar[data-dock="left"]{left:16px;top:50%;transform:translateY(-50%)}.bar[data-dock="right"]{right:16px;top:50%;transform:translateY(-50%)}.bar[data-dragging="true"]{cursor:grabbing}.commands{display:flex;min-width:0;gap:2px;flex-wrap:wrap;justify-content:center;overflow:visible}.bar button{position:relative;border:0;border-radius:7px;background:#ededed;color:#000;padding:7px 9px;cursor:pointer;white-space:nowrap;transition:background .16s ease,transform .16s ease,box-shadow .16s ease}.bar button:not([disabled]):hover,.bar button:not([disabled]):focus-visible{background:#e2e2e2;transform:translateY(-1px);outline:none}.bar .drag-handle{width:24px;min-width:24px;padding:0;background:transparent;cursor:grab;touch-action:none;font-size:15px;line-height:28px}.bar .drag-handle:hover,.bar .drag-handle:focus-visible{background:#e9e9e9}.bar .command{width:28px;min-width:28px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:transparent}.bar .command:hover,.bar .command:focus-visible{background:#e9e9e9}.bar .command svg{width:16px;height:16px;display:block}.bar button[hidden]{display:none}.bar button[disabled]{cursor:default;opacity:.45}.bar .primary{background:#000;color:#fff}.bar .primary:hover,.bar .primary:focus-visible{background:#252525}.tooltip{position:absolute;z-index:2;left:50%;bottom:calc(100% + 8px);transform:translate(-50%,3px);padding:5px 7px;border-radius:6px;background:#1d1d1f;color:#fff;font-size:11px;font-weight:500;line-height:1.2;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .14s ease,transform .14s ease}.bar button:hover .tooltip,.bar button:focus-visible .tooltip{opacity:1;transform:translate(-50%,0)}.status{color:#71717a;padding:0 3px;white-space:nowrap}</style><div class="bar" role="toolbar" aria-label="${inlineToolbarText("toolbar")}"><button class="drag-handle" data-intent="drag-handle" type="button" aria-label="${inlineToolbarText("move")}">${tooltip("move")}<span aria-hidden="true">⠿</span></button><div class="commands">${commandButtons}</div><button data-intent="insert-image-frame" class="action-icon" aria-label="${inlineToolbarText("insertImageFrame")}">${tooltip("insertImageFrame")}<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="4" width="13" height="12" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="m5.5 13 3-3 2.2 2.1 1.6-1.6 2.2 2.5M7.2 7.6h.1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.5 2.5v4M14.5 4.5h4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button><span class="status" data-saved hidden role="status" aria-live="polite">${inlineToolbarText("saved")}</span><button data-intent="save" class="primary" aria-label="${inlineToolbarText("save")}">${inlineToolbarText("save")}${tooltip("save")}</button><button data-intent="done" aria-label="${inlineToolbarText("done")}">${inlineToolbarText("done")}${tooltip("done")}</button></div>`;
    const saveButton = toolbar.root.querySelector('[data-intent="save"]');
    const doneButton = toolbar.root.querySelector('[data-intent="done"]');
    toolbar.root.querySelector('[data-intent="insert-image-frame"]').addEventListener("click", () => beginInsertedImageDraft());
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
    const role = selectedInlineToolbarRole(); const commands = new Set(inlineCommandsForRole(role)); const canFormat = STATE.formatState.canFormat && commands.size > 0;
    root.querySelectorAll("button[data-command]").forEach((button) => { button.hidden = false; button.disabled = !commands.has(button.dataset.command) || !canFormat; });
    // Dirty is the only authoritative edit-state signal.  `saveNotice` is
    // merely a presentation hint and is not updated by every image-history
    // path (notably inserted-image drag and undo).
    root.querySelector("[data-saved]").hidden = STATE.dirty || STATE.saveNotice !== "saved";
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
  function sameEditableTextField(range) {
    if (!range) return null;
    const start = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer : range.startContainer.parentElement;
    const end = range.endContainer.nodeType === Node.ELEMENT_NODE ? range.endContainer : range.endContainer.parentElement;
    const selector = '[data-nutbook-editing="text"],[data-nutbook-editing="rich-text"]';
    const startField = start?.closest?.(selector);
    const endField = end?.closest?.(selector);
    return startField && startField === endField ? startField : null;
  }
  function captureFieldSelectionBookmark(field) {
    const selection = window.getSelection(); const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!range || sameEditableTextField(range) !== field) return null;
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
    const fieldId = field.getAttribute("data-id");
    const pendingInput = !mutate && STATE.pendingInputSelection?.fieldId === fieldId ? STATE.pendingInputSelection : null;
    const beforeSelection = pendingInput?.bookmark || captureFieldSelectionBookmark(field);
    STATE.pendingInputSelection = null;
    STATE.isMutatingDocument = true;
    try {
      const applied = mutate ? Boolean(mutate()) : true;
      if (!applied) return false;
      const selectionBookmark = captureFieldSelectionBookmark(field);
      if (isRichEditRole(editRoleOf(field))) normalizeRichTextField(field);
      restoreFieldSelectionBookmark(field, selectionBookmark);
      const afterSelection = captureFieldSelectionBookmark(field);
      updateSavedSelection(); syncInlineToolbar(); recomputeChanges();
      const changesJson = stableChangesJson(collectChanges());
      if (changesJson === STATE.lastCommittedChangesJson) return false;
      const pendingHistory = STATE.pendingHistorySelection;
      STATE.pendingHistorySelection = {
        fieldId,
        before: pendingHistory?.fieldId === fieldId ? pendingHistory.before : beforeSelection,
        after: afterSelection
      };
      STATE.lastCommittedChangesJson = changesJson; STATE.documentRevision += 1;
      emitHostMessage({ type: "html_edit_document_changed", ...stateSnapshot() });
      return true;
    } finally {
      STATE.isMutatingDocument = false;
    }
  }
  function withRichFieldMutation(field, mutate) { return commitDocumentMutation(field, mutate); }
  function pendingInlineMarks(field) { return STATE.pendingInlineMarks.get(field.getAttribute("data-id")) || new Set(); }
  function togglePendingInlineMark(field, tagName) {
    const id = field.getAttribute("data-id"); const marks = new Set(pendingInlineMarks(field));
    if (marks.has(tagName)) marks.delete(tagName); else marks.add(tagName);
    if (marks.size) STATE.pendingInlineMarks.set(id, marks); else STATE.pendingInlineMarks.delete(id);
    STATE.formatState = computeFormatState(field, STATE.savedSelection.range); syncInlineToolbar();
    return true;
  }
  function applyInlineFormat(command) {
    if (STATE.composing || !VALID_FORMAT_COMMANDS.has(command)) return false;
    const field = restoreSavedSelection(); if (!field || !STATE.savedSelection) return false;
    const role = editRoleOf(field); if (!(role === "short" ? SHORT_FORMAT_COMMANDS : VALID_FORMAT_COMMANDS).has(command)) return false;
    const range = STATE.savedSelection.range;
    if (range.collapsed && (command === "bold" || command === "italic")) return togglePendingInlineMark(field, command === "bold" ? "strong" : "em");
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
    const pendingMarks = pendingInlineMarks(field);
    return { canFormat: isRichEditRole(editRoleOf(field)), bold: pendingMarks.has("strong") || ancestors.some((entry) => entry.tagName === "STRONG" || entry.tagName === "B"), italic: pendingMarks.has("em") || ancestors.some((entry) => entry.tagName === "EM" || entry.tagName === "I"), block: blockTag === "p" ? "paragraph" : `heading-${blockTag.slice(1)}`, textAlign: normalizeTextAlign(getComputedStyle(blockElement || field).textAlign), list: listTag === "ul" ? "unordered-list" : listTag === "ol" ? "ordered-list" : null, editRole: editRoleOf(field) };
  }
  function onCompositionStart() { STATE.composing = true; }
  function onCompositionEnd(event) { STATE.composing = false; commitDocumentMutation(event.currentTarget); }
  function onInput(event) {
    const element = event.currentTarget;
    if (STATE.composing) return;
    commitDocumentMutation(element);
  }
  function updateChange(element) {
    const id = element.getAttribute("data-id"); const role = editRoleOf(element);
    if (element.matches?.('img[data-editable="image"]')) {
      const baseline = STATE.baseline.get(id); const relativePath = element.getAttribute("data-nutbook-asset-relative-path");
      const crop = cropStateOf(element); const cropReset = element.getAttribute("data-nutbook-crop-reset") === "1", cropStyleMigration = element.getAttribute("data-nutbook-crop-style-migration") === "1"; const sourceChanged = (element.getAttribute("src") || "") !== baseline?.currentSrc; const cropChanged = cropReset || cropStyleMigration || !cropStateEquals(crop, baseline?.crop);
      if (!baseline || (!sourceChanged && !cropChanged) || (sourceChanged && !relativePath)) STATE.changes.delete(id);
      else {
        const pictureSources = baseline.pictureSources.map((source) => ({ index: source.index, originalSrcsetHash: source.originalSrcsetHash }));
        const change = { type: "image", selector: selectorFor(id), originalSrcHash: baseline.originalSrcHash };
        if (sourceChanged) { change.src = relativePath; change.alt = element.getAttribute("alt") || ""; }
        if (cropReset) { change.leftPermille = 0; change.topPermille = 0; change.widthPermille = 0; } else if (cropChanged) { const rect = cropFrameFor(element)?.wrapper.getBoundingClientRect() || element.getBoundingClientRect(); change.leftPermille = crop?.scale ?? 1000; change.topPermille = crop?.x ?? 500; change.widthPermille = crop?.y ?? 500; change.canvasWidth = Math.max(1, Math.round(rect.width)); change.canvasHeight = Math.max(1, Math.round(rect.height)); }
        if (sourceChanged && pictureSources.length) change.pictureSources = pictureSources;
        if (pageIdFor(element)) change.pageId = pageIdFor(element);
        STATE.changes.set(id, change);
      }
      STATE.dirty = STATE.changes.size > 0; return;
    }
    if (element.matches?.('[data-editable="background-image"]')) { const baseline = STATE.baseline.get(id); const relativePath = element.getAttribute("data-nutbook-asset-relative-path"); if (!baseline || !relativePath || (element.getAttribute("style") || "") === baseline.currentStyle) STATE.changes.delete(id); else { const change = { type: "background-image", selector: selectorFor(id), originalStyleHash: baseline.originalStyleHash, src: relativePath }; if (pageIdFor(element)) change.pageId = pageIdFor(element); STATE.changes.set(id, change); } STATE.dirty = STATE.changes.size > 0; return; }
    if (isRichEditRole(role)) {
      const value = readRichValue(element); const original = STATE.baseline.get(id) || { html: "", textAlign: "left" };
      if (value.html === original.html && value.textAlign === original.textAlign) STATE.changes.delete(id); else { const change = { type: "rich_text", selector: selectorFor(id), originalTextHash: STATE.sourceHashes.get(id) || "", html: value.html, editRole: role }; if (value.textAlign !== original.textAlign) change.textAlign = value.textAlign; if (pageIdFor(element)) change.pageId = pageIdFor(element); STATE.changes.set(id, change); }
    } else { const value = textOf(element); const original = STATE.baseline.get(id) || ""; if (value === original) STATE.changes.delete(id); else { const change = { type: "text", selector: selectorFor(id), originalTextHash: STATE.sourceHashes.get(id) || "", text: value, editRole: role }; if (pageIdFor(element)) change.pageId = pageIdFor(element); STATE.changes.set(id, change); } }
    STATE.dirty = STATE.changes.size > 0; if (STATE.dirty) STATE.saveNotice = "";
  }
  function insertedBaselineOf(frame) { return { src: frame.relativePath, alt: frame.alt || "", leftPermille: frame.leftPermille, topPermille: frame.topPermille, widthPermille: frame.widthPermille, heightPermille: frame.heightPermille, canvasWidth: frame.canvasWidth, canvasHeight: frame.canvasHeight, pageId: frame.pageId, crop: insertedCropState(frame), runtimeUrl: frame.runtimeUrl, imported: true }; }
  function staticInsertedImageLayer() { const root = presentationPageRoot(); return STATE.presentation ? root?.querySelector(':scope > [data-nutbook-inserted-image-layer="1"]') : document.querySelector('[data-nutbook-inserted-image-layer="1"]'); }
  function hydrateStaticInsertedImages() { const layer = staticInsertedImageLayer(); if (!layer || !insertedCanvasEligible()) return; const images = [...layer.querySelectorAll('img[data-nutbook-inserted-image-id]')]; for (const image of images) { const id = image.getAttribute('data-nutbook-inserted-image-id'); const relativePath = image.getAttribute('data-nutbook-asset-relative-path'); const runtimeUrl = image.getAttribute('src') || ''; const crop = { scale: Number(image.getAttribute('data-nutbook-crop-scale')), x: Number(image.getAttribute('data-nutbook-crop-x')), y: Number(image.getAttribute('data-nutbook-crop-y')) }; const canvas = insertedCanvas(); if (!id || !isAllowedAssetRelativePath(relativePath)) continue; const layerRect = layer.getBoundingClientRect(); const visual = image.closest('[data-nutbook-inserted-image-frame]')?.getBoundingClientRect() || image.getBoundingClientRect(); const geometry = serializeFramePermille({ left: visual.left - layerRect.left, top: visual.top - layerRect.top, width: visual.width, height: visual.height }, canvas); STATE.runtimeAssetUrls.set(relativePath, runtimeUrl); const node = createOrUpdateInsertedImageFrame({ id, pageId: pageIdFor(layer), imported: true, relativePath, runtimeUrl, alt: image.getAttribute('alt') || '', ...geometry, crop: insertedCropState({ crop }), canvasWidth: Math.max(1, Math.round(canvas.width)), canvasHeight: Math.max(1, Math.round(canvas.height)) }); if (node) STATE.insertedImageBaseline.set(id, insertedBaselineOf(STATE.insertedImages.get(id))); }
    if (STATE.insertedImages.size) layer.style.setProperty('visibility', 'hidden', 'important');
  }
  function syncStaticInsertedImageLayer() { const layer = staticInsertedImageLayer(); if (!layer) return; layer.replaceChildren(); for (const [id, frame] of STATE.insertedImages) { if (!frame.imported || (STATE.presentation && frame.pageId !== STATE.activePresentationPageId)) continue; const crop = insertedCropState(frame); const wrapper = document.createElement('span'); wrapper.setAttribute('data-nutbook-inserted-image-frame', id); wrapper.style.cssText = `position:absolute;left:${frame.leftPermille / 10}%;top:${frame.topPermille / 10}%;width:${frame.widthPermille / 10}%;height:${frame.heightPermille / 10}%;overflow:hidden`; const image = document.createElement('img'); image.setAttribute('data-nutbook-inserted-image-id', id); image.setAttribute('data-nutbook-asset-relative-path', frame.relativePath); image.setAttribute('data-nutbook-left-permille', String(frame.leftPermille)); image.setAttribute('data-nutbook-top-permille', String(frame.topPermille)); image.setAttribute('data-nutbook-width-permille', String(frame.widthPermille)); image.setAttribute('data-nutbook-height-permille', String(frame.heightPermille)); image.setAttribute('data-nutbook-canvas-width', String(frame.canvasWidth)); image.setAttribute('data-nutbook-canvas-height', String(frame.canvasHeight)); if (crop) { image.setAttribute('data-nutbook-crop-scale', String(crop.scale)); image.setAttribute('data-nutbook-crop-x', String(crop.x)); image.setAttribute('data-nutbook-crop-y', String(crop.y)); } image.src = frame.runtimeUrl || image.src; image.alt = frame.alt || ''; image.style.cssText = `position:absolute;inset:0;display:block;width:100%;height:100%;max-width:none;box-sizing:border-box;border:0;box-shadow:none;object-fit:contain;transform-origin:center;transform:${crop ? cropTransform(crop) : 'none'}`; wrapper.append(image); layer.append(wrapper); } layer.style.removeProperty('visibility'); }
  function restoreInsertedImageBaseline() { for (const id of STATE.insertedImageSessionCreatedIds) { STATE.insertedImages.get(id)?.node?.remove(); STATE.insertedImages.delete(id); } for (const [id, baseline] of STATE.insertedImageBaseline) { const existing = STATE.insertedImages.get(id); createOrUpdateInsertedImageFrame({ ...(existing || {}), ...baseline, id }); } STATE.deletedInsertedImageIds.clear(); }
  function insertedChange(id, frame) { const change = { type: "inserted-image", selector: `[data-nutbook-inserted-image-id="${id}"]`, insertedImageId: id, src: frame.relativePath || frame.src || "", alt: frame.alt || "", leftPermille: frame.leftPermille, topPermille: frame.topPermille, widthPermille: frame.widthPermille, heightPermille: frame.heightPermille, canvasWidth: frame.canvasWidth, canvasHeight: frame.canvasHeight, originalStyleHash: insertedCropToken(frame) }; if (frame.pageId) change.pageId = frame.pageId; return change; }
  function updateInsertedImageChanges() { const changed = [...STATE.insertedImages].some(([id, frame]) => { const baseline = STATE.insertedImageBaseline.get(id); return frame.imported && (!baseline || stableChangesJson(insertedChange(id, frame)) !== stableChangesJson(insertedChange(id, baseline))); }) || STATE.deletedInsertedImageIds.size > 0; for (const [id, frame] of STATE.insertedImages) { if (!frame.imported) { STATE.changes.delete(id); continue; } if (changed) STATE.changes.set(id, insertedChange(id, frame)); else STATE.changes.delete(id); } for (const [id, pageId] of STATE.deletedInsertedImageIds) { const change = { type: "inserted-image", selector: `[data-nutbook-inserted-image-id="${id}"]`, insertedImageId: id, deleted: true }; if (pageId) change.pageId = pageId; STATE.changes.set(id, change); } }
  function editorHistorySnapshot() { const fields = [...editableTextElements(), ...editableRichTextElements(), ...editableImageElements(), ...editableBackgroundImageElements()].map((element) => { const frame = element.matches("img") ? cropFrameFor(element) : null; const rect = frame?.wrapper?.getBoundingClientRect(); return { id: element.getAttribute("data-id"), html: isRichEditRole(editRoleOf(element)) ? element.innerHTML : null, text: isRichEditRole(editRoleOf(element)) ? null : element.textContent || "", src: element.matches("img") ? element.getAttribute("src") || "" : null, pictureSrcsets: element.matches("img") ? pictureSources(element).map((source) => source.getAttribute("srcset") || "") : [], style: element.matches("img") || element.matches('[data-editable="background-image"]') || isRichEditRole(editRoleOf(element)) ? element.getAttribute("style") || "" : null, alt: element.matches("img") ? element.getAttribute("alt") || "" : null, asset: element.getAttribute("data-nutbook-asset-relative-path") || "", crop: element.matches("img") ? cropStateOf(element) : null, cropFrame: rect?.width > 1 && rect?.height > 1 ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null }; }); const inserted = [...STATE.insertedImages.entries()].map(([id, frame]) => ({ id, imported: frame.imported, relativePath: frame.relativePath, alt: frame.alt || "", leftPermille: frame.leftPermille, topPermille: frame.topPermille, widthPermille: frame.widthPermille, heightPermille: frame.heightPermille, canvasWidth: frame.canvasWidth, canvasHeight: frame.canvasHeight, pageId: frame.pageId, crop: insertedCropState(frame) })); return stableChangesJson({ fields, inserted }); }
  function resetHistory() { window.clearTimeout(STATE.historyTimer); const snapshot = editorHistorySnapshot(); STATE.history = [snapshot]; STATE.historyScopes = ["all"]; STATE.historySelections = [null]; STATE.pendingHistorySelection = null; STATE.pendingInputSelection = null; STATE.historyCursor = 0; STATE.savedHistoryCursor = 0; STATE.lastHistoryJson = snapshot; }
  function reportHistoryDebug(event) { emitHostMessage({ type: "html_edit_history_debug", event, runtimeSessionId: STATE.sessionId, documentRevision: STATE.documentRevision, dirty: STATE.dirty, historyCursor: STATE.historyCursor, savedHistoryCursor: STATE.savedHistoryCursor, historyLength: STATE.history.length, changeIds: [...STATE.changes.keys()].join(","), insertedIds: [...STATE.insertedImages.keys()].join(","), insertedBaselineIds: [...STATE.insertedImageBaseline.keys()].join(",") }); }
  // Image actions are restored by image identity. A snapshot still records the
  // whole document, but undoing one image must never replay another image.
  function captureHistoryNow(scope = "all") { if (STATE.restoringHistory) return; window.clearTimeout(STATE.historyTimer); STATE.historyTimer = null; const snapshot = editorHistorySnapshot(); if (snapshot === STATE.lastHistoryJson) { STATE.pendingHistorySelection = null; return; } const bytes = new TextEncoder().encode(snapshot).byteLength; if (bytes > 16 * 1024 * 1024) { STATE.pendingHistorySelection = null; return; } const selection = STATE.pendingHistorySelection; STATE.pendingHistorySelection = null; STATE.history.splice(STATE.historyCursor + 1); STATE.historyScopes.splice(STATE.historyCursor + 1); STATE.historySelections.splice(STATE.historyCursor + 1); STATE.history.push(snapshot); STATE.historyScopes.push(selection?.fieldId ? `source:${selection.fieldId}` : scope); STATE.historySelections.push(selection); while (STATE.history.length > 20 || STATE.history.reduce((total, entry) => total + new TextEncoder().encode(entry).byteLength, 0) > 16 * 1024 * 1024) { STATE.history.shift(); STATE.historyScopes.shift(); STATE.historySelections.shift(); STATE.historyCursor -= 1; STATE.savedHistoryCursor -= 1; } STATE.historyCursor = STATE.history.length - 1; STATE.lastHistoryJson = snapshot; }
  function scheduleHistoryCapture() { if (STATE.restoringHistory) return; window.clearTimeout(STATE.historyTimer); STATE.historyTimer = window.setTimeout(captureHistoryNow, 500); }
  function restoreHistoryCrop(element, field) { const currentFrame = cropFrameFor(element) || (element.parentElement?.getAttribute("data-nutbook-crop-frame") === "1" ? { wrapper: element.parentElement, created: false } : null); if (!field.crop) { if (currentFrame?.wrapper) { currentFrame.wrapper.before(element); currentFrame.wrapper.remove(); } STATE.cropFrames.delete(element.getAttribute("data-id")); writeCropState(element, null); return; } const savedRect = field.cropFrame?.width > 1 && field.cropFrame?.height > 1 ? field.cropFrame : null; if (!cropFrameFor(element) && currentFrame?.wrapper) STATE.cropFrames.set(element.getAttribute("data-id"), currentFrame); ensureCropFrame(element, savedRect); applyImageCrop(element, field.crop, { persist: false }); if (field.crop.model === "legacy") { element.setAttribute("data-nutbook-crop-image", "1"); element.removeAttribute("data-nutbook-crop-model"); element.setAttribute("data-nutbook-crop-scale", String(field.crop.scale)); element.setAttribute("data-nutbook-crop-x", String(field.crop.x)); element.setAttribute("data-nutbook-crop-y", String(field.crop.y)); } else writeCropState(element, field.crop); }
  function historySourceId(scope) { return String(scope || "").startsWith("source:") ? String(scope).slice("source:".length) : ""; }
  function historyInsertedId(scope) { return String(scope || "").startsWith("inserted:") ? String(scope).slice("inserted:".length) : ""; }
  function restoreHistorySelection(selection) { if (!selection?.fieldId || !selection.bookmark) return; const field = document.querySelector(selectorFor(selection.fieldId)); if (!field) return; field.focus({ preventScroll: true }); restoreFieldSelectionBookmark(field, selection.bookmark); if (isRichEditRole(editRoleOf(field))) updateSavedSelection(); }
  function restoreHistorySnapshot(snapshot, scope = "all", selection = null) { const state = JSON.parse(snapshot); const sourceId = historySourceId(scope), insertedId = historyInsertedId(scope); const runtimeUrls = new Map([...STATE.insertedImages.entries()].map(([id, frame]) => [id, frame.runtimeUrl])); const runtimeUrlFor = (frame) => STATE.runtimeAssetUrls.get(frame.relativePath) || runtimeUrls.get(frame.id) || staticInsertedImageLayer()?.querySelector(`[data-nutbook-inserted-image-id="${frame.id}"]`)?.getAttribute("src") || ""; const restoredInsertedIds = new Set((state.inserted || []).filter((frame) => frame.imported).map((frame) => frame.id)); STATE.restoringHistory = true; if (!insertedId) for (const field of state.fields || []) { if (sourceId && field.id !== sourceId) continue; const element = document.querySelector(selectorFor(field.id)); if (!element) continue; const role = editRoleOf(element); if (isRichEditRole(role)) element.innerHTML = field.html || ""; else if (!element.matches("img") && !element.matches('[data-editable="background-image"]')) element.textContent = field.text || ""; if (field.style !== null) element.setAttribute("style", field.style); if (element.matches("img")) { const restoredSrc = field.asset ? (STATE.runtimeAssetUrls.get(field.asset) || field.src || "") : (field.src || ""); element.setAttribute("src", restoredSrc); element.setAttribute("alt", field.alt || ""); pictureSources(element).forEach((source, index) => source.setAttribute("srcset", field.pictureSrcsets?.[index] || "")); restoreHistoryCrop(element, field); } field.asset ? element.setAttribute("data-nutbook-asset-relative-path", field.asset) : element.removeAttribute("data-nutbook-asset-relative-path"); } if (insertedId) { const current = STATE.insertedImages.get(insertedId); const desired = (state.inserted || []).find((frame) => frame.id === insertedId && frame.imported); current?.node?.remove(); STATE.insertedImages.delete(insertedId); if (desired) { createOrUpdateInsertedImageFrame({ ...desired, runtimeUrl: runtimeUrlFor(desired) }); STATE.deletedInsertedImageIds.delete(insertedId); if (!STATE.insertedImageBaseline.has(insertedId)) STATE.insertedImageSessionCreatedIds.add(insertedId); } else if (STATE.insertedImageBaseline.has(insertedId)) STATE.deletedInsertedImageIds.set(insertedId, STATE.insertedImageBaseline.get(insertedId)?.pageId); else STATE.insertedImageSessionCreatedIds.delete(insertedId); } else if (!sourceId) { for (const frame of STATE.insertedImages.values()) frame.node?.remove(); STATE.insertedImages.clear(); STATE.insertedImageSessionCreatedIds.clear(); STATE.deletedInsertedImageIds.clear(); for (const id of STATE.insertedImageBaseline.keys()) if (!restoredInsertedIds.has(id)) STATE.deletedInsertedImageIds.set(id, STATE.insertedImageBaseline.get(id)?.pageId); for (const frame of state.inserted || []) if (frame.imported) { createOrUpdateInsertedImageFrame({ ...frame, runtimeUrl: runtimeUrlFor(frame) }); if (!STATE.insertedImageBaseline.has(frame.id)) STATE.insertedImageSessionCreatedIds.add(frame.id); } } STATE.restoringHistory = false; restoreHistorySelection(selection); layoutImageActions(); recomputeChanges(); STATE.lastCommittedChangesJson = stableChangesJson(Object.fromEntries(STATE.changes.entries())); STATE.dirty = STATE.historyCursor !== STATE.savedHistoryCursor; STATE.documentRevision += 1; syncInlineToolbar(); emitHostMessage({ type: "html_edit_document_changed", ...stateSnapshot() }); }
  function undoHistory() { captureHistoryNow(); if (STATE.historyCursor <= 0) { reportHistoryDebug("undo-unavailable"); return false; } const scope = STATE.historyScopes[STATE.historyCursor] || "all"; const transition = STATE.historySelections[STATE.historyCursor]; STATE.historyCursor -= 1; STATE.lastHistoryJson = STATE.history[STATE.historyCursor]; restoreHistorySnapshot(STATE.lastHistoryJson, scope, transition?.fieldId ? { fieldId: transition.fieldId, bookmark: transition.before } : null); reportHistoryDebug("undo-applied"); return true; }
  function redoHistory() { captureHistoryNow(); if (STATE.historyCursor >= STATE.history.length - 1) return false; STATE.historyCursor += 1; STATE.lastHistoryJson = STATE.history[STATE.historyCursor]; const transition = STATE.historySelections[STATE.historyCursor]; restoreHistorySnapshot(STATE.lastHistoryJson, STATE.historyScopes[STATE.historyCursor] || "all", transition?.fieldId ? { fieldId: transition.fieldId, bookmark: transition.after } : null); return true; }
  function recomputeChanges() { for (const element of [...editableTextElements(), ...editableRichTextElements(), ...editableImageElements(), ...editableBackgroundImageElements()]) updateChange(element); updateInsertedImageChanges(); STATE.dirty = STATE.changes.size > 0; scheduleHistoryCapture(); }
  function collectChanges() { recomputeChanges(); return Object.fromEntries(STATE.changes.entries()); }
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
      if (change.type === "inserted-image") { if (!change.insertedImageId || change.insertedImageId !== id || !change.src || !runtimeAssetUrls[change.src]) continue; // A committed HTML layer is the source of truth. A leftover sidecar can
        // only restore a frame that is absent from that layer; it must never
        // overwrite the geometry we just hydrated from the saved document.
        if (STATE.insertedImageBaseline.has(id)) continue; const cropValues = String(change.originalStyleHash || "").match(/^nutbook-inserted-crop:v1:(\d+):(\d+):(\d+)$/); const crop = cropValues ? insertedCropState({ crop: { scale: Number(cropValues[1]), x: Number(cropValues[2]), y: Number(cropValues[3]) } }) : null; const node = createOrUpdateInsertedImageFrame({ id, pageId: change.pageId, imported: true, relativePath: change.src, runtimeUrl: runtimeAssetUrls[change.src], alt: change.alt || "", leftPermille: change.leftPermille, topPermille: change.topPermille, widthPermille: change.widthPermille, heightPermille: change.heightPermille, canvasWidth: change.canvasWidth, canvasHeight: change.canvasHeight, crop }); if (node) STATE.insertedImageBaseline.set(id, insertedBaselineOf(STATE.insertedImages.get(id))); continue; }
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
        if (baseline?.type === "image") { baseline.currentSrc = element.getAttribute("src") || ""; baseline.currentInlineStyle = element.getAttribute("style") || ""; baseline.crop = cropStateOf(element); baseline.pictureSources.forEach((source, index) => { source.currentSrcset = pictureSources(element)[index]?.getAttribute("srcset") || ""; }); }
        if (baseline?.type === "background-image") baseline.currentStyle = element.getAttribute("style") || "";
      }
      if (change.type === "image" && Number.isInteger(change.leftPermille) && Number.isInteger(change.topPermille) && Number.isInteger(change.widthPermille)) applyImageCrop(element, { scale: change.leftPermille, x: change.topPermille, y: change.widthPermille });
      const patchRole = change.editRole || "content";
      if ((change.type === "rich_text" || change.type === "rich-text") && isRichEditRole(role) && patchRole === role && isValidatedRichHtml(change.html, role)) { const baseline = STATE.baseline.get(id) || readRichValue(element); element.innerHTML = change.html; element.style.textAlign = change.textAlign ? normalizeTextAlign(change.textAlign) : baseline.textAlign; normalizeRichTextField(element); }
      if (!element.matches?.('[data-editable="image"], [data-editable="background-image"]')) STATE.baseline.set(id, readEditableValue(element));
    }
  }
  function restoreImageBaseline(element, baseline) { if (baseline.type === "image") { if (baseline.currentSrc) element.setAttribute("src", baseline.currentSrc); else element.removeAttribute("src"); element.setAttribute("style", baseline.currentInlineStyle || ""); pictureSources(element).forEach((source, index) => { source.setAttribute("srcset", baseline.pictureSources[index]?.currentSrcset || source.getAttribute("srcset") || ""); }); element.removeAttribute("data-nutbook-crop-style-migration"); } else element.setAttribute("style", baseline.currentStyle); element.removeAttribute("data-nutbook-asset-relative-path"); }
  function onBeforeInput(event) {
    if (!STATE.editing) return;
    const selection = window.getSelection(); const range = selection?.rangeCount ? selection.getRangeAt(0) : null; const editableField = sameEditableTextField(range);
    if (editableField) STATE.pendingInputSelection = { fieldId: editableField.getAttribute("data-id"), bookmark: captureFieldSelectionBookmark(editableField) };
    const field = sameRichTextField(range);
    if (!field) return;
    if (event.inputType === "insertText" && event.data && !STATE.composing && range.collapsed && pendingInlineMarks(field).size) {
      event.preventDefault();
      commitDocumentMutation(field, () => {
        range.deleteContents(); let inserted = document.createTextNode(event.data);
        for (const tagName of [...pendingInlineMarks(field)].reverse()) { const mark = document.createElement(tagName); mark.append(inserted); inserted = mark; }
        range.insertNode(inserted);
        const caret = document.createRange(); caret.setStartAfter(inserted); caret.collapse(true); selection.removeAllRanges(); selection.addRange(caret);
        return true;
      });
      return;
    }
    if (event.inputType !== "insertFromPaste" && event.inputType !== "insertFromDrop") return;
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
    style.textContent = '[data-nutbook-editing]{outline:2px dashed #c5bbbb;outline-offset:3px;border-radius:8px;cursor:text;position:relative}[data-nutbook-editing="text"]:hover,[data-nutbook-editing="rich-text"]:hover{outline-color:#a99f9f}[data-nutbook-editing]:focus{outline-color:currentColor;box-shadow:0 4px 12px rgba(26,28,29,.12)}[data-nutbook-editing="text"]:focus::after{content:attr(data-nutbook-plain-text-hint);position:absolute;z-index:3;right:0;bottom:calc(100% + 8px);box-sizing:border-box;min-height:24px;padding:4px 9px 4px 29px;border:1px solid #111;border-radius:999px;background:#fff url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 16 16%27%3E%3Ccircle cx=%278%27 cy=%278%27 r=%278%27 fill=%27%23000%27/%3E%3Cpath d=%27M8 3.6v5.1M8 11.7v.2%27 fill=%27none%27 stroke=%27%23fff%27 stroke-width=%271.5%27 stroke-linecap=%27round%27/%3E%3C/svg%3E") no-repeat 8px 50%;color:#111;font:500 12px/16px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;white-space:nowrap;pointer-events:none}[data-nutbook-editing="image"]{cursor:pointer}.nutbook-html-edit-image-actions{position:fixed;z-index:2147483646;display:inline-flex;gap:4px;margin:0}.nutbook-html-edit-image-action{border:1px solid #bbb;border-radius:6px;background:#fff;padding:5px 8px;font:12px sans-serif;cursor:pointer}.nutbook-html-edit-cropping{outline:2px solid #111;outline-offset:2px;cursor:grab}.nutbook-html-edit-crop-overlay{position:fixed;z-index:2147483646;box-sizing:border-box;border:2px solid #111;pointer-events:none}.nutbook-html-edit-crop-overlay [data-crop-viewport]{position:fixed;display:block;box-sizing:border-box;border:1px dashed rgba(17,17,17,.62);pointer-events:none}.nutbook-html-edit-crop-overlay .nutbook-html-edit-crop-toolbar{position:fixed;z-index:2147483647;left:50%;bottom:24px;transform:translateX(-50%);display:flex;gap:4px;align-items:center;padding:7px 8px;border-radius:8px;background:#111;color:#fff;white-space:nowrap;font:12px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.24);pointer-events:auto}.nutbook-html-edit-crop-toolbar button{border:1px solid #fff;border-radius:4px;background:#fff;color:#111;padding:4px 7px;font:12px sans-serif;cursor:pointer}.nutbook-html-edit-crop-toolbar button[data-action="done"]{background:#111;color:#fff}.nutbook-html-edit-crop-overlay i{position:absolute;display:block;width:10px;height:10px;box-sizing:border-box;border:1px solid #111;border-radius:1px;background:#fff;pointer-events:auto}.nutbook-html-edit-crop-overlay i[data-handle="nw"]{left:-6px;top:-6px;cursor:nwse-resize}.nutbook-html-edit-crop-overlay i[data-handle="n"]{left:calc(50% - 5px);top:-6px;cursor:ns-resize}.nutbook-html-edit-crop-overlay i[data-handle="ne"]{right:-6px;top:-6px;cursor:nesw-resize}.nutbook-html-edit-crop-overlay i[data-handle="e"]{right:-6px;top:calc(50% - 5px);cursor:ew-resize}.nutbook-html-edit-crop-overlay i[data-handle="se"]{right:-6px;bottom:-6px;cursor:nwse-resize}.nutbook-html-edit-crop-overlay i[data-handle="s"]{left:calc(50% - 5px);bottom:-6px;cursor:ns-resize}.nutbook-html-edit-crop-overlay i[data-handle="sw"]{left:-6px;bottom:-6px;cursor:nesw-resize}.nutbook-html-edit-crop-overlay i[data-handle="w"]{left:-6px;top:calc(50% - 5px);cursor:ew-resize}';
    document.head.append(style);
    // A presentation can expose dozens of independently editable blocks.
    // Permanent outlines turn those blocks into visual noise, so retain the
    // affordance only for the field under the pointer or keyboard focus.
    const quietAffordanceStyle = document.createElement("style"); quietAffordanceStyle.id = "nutbook-html-edit-affordance-quiet";
    quietAffordanceStyle.textContent = '[data-nutbook-editing]{outline:none!important}[data-nutbook-editing]::before{content:"";position:absolute;z-index:2;inset:-4px;border:1px dashed transparent;border-radius:10px;pointer-events:none}[data-nutbook-editing="text"]:hover::before,[data-nutbook-editing="rich-text"]:hover::before{border-color:currentColor;opacity:.62}[data-nutbook-editing]:focus::before{border:2px solid currentColor;box-shadow:0 0 0 1px rgba(128,128,128,.55),0 4px 12px rgba(26,28,29,.12)}';
    document.head.append(quietAffordanceStyle);
    const imageTooltipStyle = document.createElement("style"); imageTooltipStyle.textContent = '.nutbook-html-edit-icon-action{position:relative}.nutbook-html-edit-icon-action::after{content:attr(data-tooltip);position:absolute;z-index:2147483647;left:50%;bottom:calc(100% + 7px);transform:translate(-50%,3px);padding:5px 7px;border-radius:6px;background:#111;color:#fff;font:500 11px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .14s ease,transform .14s ease}.nutbook-html-edit-icon-action:hover::after,.nutbook-html-edit-icon-action:focus-visible::after{opacity:1;transform:translate(-50%,0)}.nutbook-html-edit-crop-toolbar button.nutbook-html-edit-icon-action{background:#111!important;color:#fff!important;border:0!important;padding:0!important}.nutbook-html-edit-source-crop-overlay,.nutbook-html-edit-inserted-crop-overlay{inset:0!important;border:0!important;overflow:visible!important}.nutbook-html-edit-source-crop-overlay [data-crop-context-part],.nutbook-html-edit-inserted-crop-overlay [data-crop-context-part]{position:fixed;display:block;overflow:hidden;pointer-events:none}.nutbook-html-edit-source-crop-overlay [data-crop-context-part] img,.nutbook-html-edit-inserted-crop-overlay [data-crop-context-part] img{position:absolute;display:block;max-width:none;object-fit:fill;opacity:.42;pointer-events:none}.nutbook-html-edit-source-crop-overlay [data-crop-viewport],.nutbook-html-edit-inserted-crop-overlay [data-crop-viewport]{position:fixed!important;display:block!important;overflow:hidden!important;border:1px dashed rgba(17,17,17,.62)!important;pointer-events:none!important}.nutbook-html-edit-source-crop-overlay [data-crop-viewport]{pointer-events:auto!important}.nutbook-html-edit-source-crop-overlay [data-crop-content]{position:absolute;display:block;max-width:none;object-fit:fill;pointer-events:auto}.nutbook-html-edit-source-crop-overlay [data-crop-edge],.nutbook-html-edit-inserted-crop-overlay [data-crop-edge]{position:fixed;box-sizing:border-box;border:2px solid #111;pointer-events:none}.nutbook-html-edit-source-crop-overlay [data-crop-edge] i,.nutbook-html-edit-inserted-crop-overlay [data-crop-edge] i{pointer-events:auto}'; document.head.append(imageTooltipStyle);
  }
  function removeEditAffordanceStyles() { document.getElementById("nutbook-html-edit-affordance")?.remove(); document.getElementById("nutbook-html-edit-affordance-quiet")?.remove(); }
  function installShortcutCapture() { window.removeEventListener("keydown", onKeyDownCapture, true); window.addEventListener("keydown", onKeyDownCapture, true); }
  function onKeyDownCapture(event) { if (!STATE.editing) return; const key = event.key; if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === "s") { event.preventDefault(); event.stopImmediatePropagation(); emitHostMessage({ type: "html_edit_save_requested_from_runtime" }); return; } if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === "z") { event.preventDefault(); event.stopImmediatePropagation(); if (event.repeat) return false; return event.shiftKey ? redoHistory() : undoHistory(); } if (STATE.presentation && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditableEventTarget(event.target) && (key === "ArrowUp" || key === "ArrowDown")) { event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) void goToAdjacentPresentationPage(key === "ArrowUp" ? -1 : 1); } }
  function isEditableEventTarget(target) { for (let node = target; node; node = node.parentElement) if (node.getAttribute?.("data-nutbook-editing")) return true; return false; }
  async function goToPresentationPage(pageId) {
    if (!STATE.presentation?.pageIds.includes(pageId)) return false;
    const result = await STATE.presentation.bridge.goTo(pageId);
    if (result === false) return false;
    STATE.activePresentationPageId = pageId; layoutInsertedImages(); layoutImageActions();
    return true;
  }
  async function goToAdjacentPresentationPage(offset) { const pages = STATE.presentation?.pageIds || []; const index = pages.indexOf(STATE.activePresentationPageId); const next = pages[index + offset]; return next ? goToPresentationPage(next) : false; }
  function presentationSnapshot() { return STATE.presentation ? { pages: STATE.presentation.pages, activePageId: STATE.activePresentationPageId } : null; }
  function stateSnapshot() { return { runtimeSessionId: STATE.sessionId, documentRevision: STATE.documentRevision, dirty: STATE.dirty, selectedDataId: STATE.selectedDataId, formatState: STATE.formatState, changes: collectChanges() }; }
  function getSnapshot() { recomputeChanges(); return stateSnapshot(); }
  function reportState(options = {}) {
    const requestId = typeof options === "string" ? options : options?.requestId || "";
    emitHostMessage({ type: "html_edit_state_snapshot", requestId, ...getSnapshot() });
  }
  function notifyReady() { emitHostMessage({ type: "html_edit_ready", ...scanEditableElements(), presentation: presentationSnapshot(), sectionNavigation: sectionNavigationSnapshot(), shortcutsIntercepted: true }); }
  function emitHostMessage(payload) {
    const message = { ...payload, itemId: STATE.itemId, runtimeSessionId: STATE.sessionId, generation: STATE.generation };
    const invoke = window.__TAURI_INTERNALS__?.invoke;
    if (typeof invoke === "function") {
      Promise.resolve(invoke("html_edit_runtime_message_command", { payload: message })).catch(() => {
        if (!STATE._messageSeq) STATE._messageSeq = 0;
        document.title = `__NUTBOOK_HTML_EDIT_RUNTIME__:${JSON.stringify({ ...message, _s: ++STATE._messageSeq })}`;
      });
      return;
    }
    if (!STATE._messageSeq) STATE._messageSeq = 0;
    document.title = `__NUTBOOK_HTML_EDIT_RUNTIME__:${JSON.stringify({ ...message, _s: ++STATE._messageSeq })}`;
  }
  window.__NUTBOOK_HTML_EDIT__ = { scanEditableElements, isEditing: () => STATE.editing, enter, exit, markSaved, rebaseSaved: markSaved, collectChanges, applyPatch, applyFormat, applyImportedAsset, beginInsertedImageDraft, commitInsertedImageDraft, cancelInsertedImageDraft, applyInsertedImageAsset, requestInsertedImageReplacement, resumeInsertedImageDraft, resumeInsertedImageReplacement, beginInsertedImageCrop, deleteInsertedImage, undoHistory, redoHistory, goToPresentationPage, goToAdjacentPresentationPage, presentationSnapshot, goToSection, refreshSectionNavigation, sectionNavigationSnapshot, getSnapshot, reportState, emitHostMessage };
})();
