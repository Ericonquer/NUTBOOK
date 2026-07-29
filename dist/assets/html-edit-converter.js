// Phase 1C conversion runs only in the HTML content WebView. It deliberately
// reads the live page but writes protocol attributes into a detached clone.
(() => {
  const EXCLUDED = "script,style,noscript,svg,canvas,iframe,video";
  const INTERACTIVE = "a,button,input,textarea,select,option,[role='button'],[contenteditable]";
  const RICH = new Set(["H1", "H2", "H3", "H4", "P", "UL", "OL"]);
  const visible = (node) => {
    const style = getComputedStyle(node); const rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0 && rect.width > 8 && rect.height > 8;
  };
  const renderable = (node) => {
    if (!(node instanceof HTMLElement) || node.hidden || node.inert || node.closest("template")) return false;
    const style = getComputedStyle(node); const rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 8 && rect.height > 8;
  };
  const hasProtocol = () => document.querySelector("[data-editable]");
  const RICH_INLINE = new Set(["STRONG", "EM", "BR", "SPAN"]);
  const presentationOnlyAttributes = (node) => [...node.attributes].every((attribute) => attribute.name === "style" || attribute.name.startsWith("data-darkmode-"));
  const richSafe = (node) => presentationOnlyAttributes(node)
    && !node.querySelector("a,[contenteditable],h5,h6,blockquote,table,pre,code")
    && [...node.querySelectorAll("*")].every((child) => RICH_INLINE.has(child.tagName) && presentationOnlyAttributes(child));
  const normalizeRichClone = (node) => {
    for (const current of [node, ...node.querySelectorAll("*")]) {
      for (const attribute of [...current.attributes]) {
        if (attribute.name === "style" || attribute.name.startsWith("data-darkmode-")) current.removeAttribute(attribute.name);
      }
    }
  };
  const simpleList = (node) => ["UL", "OL"].includes(node.tagName)
    && [...node.children].every((child) => child.tagName === "LI" && richSafe(child) && !child.querySelector("ul,ol"));
  const richGroupable = (node) => ["UL", "OL"].includes(node.tagName) ? simpleList(node) : RICH.has(node.tagName) && richSafe(node);
  const simplePicture = (img) => !img.closest("picture") || [...img.closest("picture").querySelectorAll(":scope > source[srcset]")].every((source) => {
    const srcset = (source.getAttribute("srcset") || "").trim();
    // A data URL has one URL delimiter comma, not a responsive candidate
    // list. Keep rejecting actual w/x descriptors and comma-separated URLs.
    return srcset.startsWith("data:") || !/[\s,]\s*\d+(?:w|x)\b|,/.test(srcset);
  });
  const normalizedText = (value, maxLength = 72) => {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
  };
  const isRenderableSection = (section) => {
    if (!(section instanceof HTMLElement) || section.tagName !== "SECTION" || section.hidden || section.inert || section.closest("template")) return false;
    const style = getComputedStyle(section);
    const rect = section.getBoundingClientRect();
    return style.display !== "none"
      && style.visibility !== "hidden"
      && Number(style.opacity || 1) > 0
      && style.position !== "fixed"
      && rect.width > 8
      && rect.height > 8;
  };
  const scrollSnapEnabled = (node) => {
    if (!node || node === document) return false;
    const value = getComputedStyle(node).scrollSnapType || "";
    return value && value !== "none";
  };
  const elementScrollRoot = (section) => {
    for (let node = section.parentElement; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) return node;
    }
    return document.scrollingElement;
  };
  const structureTitle = (section, index) => {
    const explicit = normalizedText(section.getAttribute("data-title"));
    if (explicit) return explicit;
    const heading = [...section.querySelectorAll("h1,h2,h3,h4")].find(renderable);
    const headingText = normalizedText(heading?.textContent);
    if (headingText) return headingText;
    const paragraph = [...section.querySelectorAll("p")].find(renderable);
    return normalizedText(paragraph?.textContent) || `第 ${index + 1} 段`;
  };
  const validPageId = (value) => /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(String(value || ""));
  function detectVerticalStructure(clone, cloneNodes) {
    const groups = new Map();
    for (const section of document.querySelectorAll("section")) {
      if (!isRenderableSection(section) || section.closest(EXCLUDED)) continue;
      const parent = section.parentElement;
      if (!parent) continue;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(section);
    }
    const candidates = [...groups.entries()].filter(([parent, sections]) => {
      if (sections.length < 2 || sections.some((section) => section.parentElement !== parent)) return false;
      return parent === document.body
        || parent.tagName === "MAIN"
        || scrollSnapEnabled(parent)
        || sections.every((section) => section.classList.contains("slide") || section.classList.contains("frame"))
        || sections.some((section) => scrollSnapEnabled(section) || (getComputedStyle(section).scrollSnapAlign || "") !== "none");
    }).map(([parent, sections]) => {
      const roots = new Set(sections.map(elementScrollRoot));
      const root = roots.size === 1 ? [...roots][0] : null;
      const snap = scrollSnapEnabled(parent)
        || scrollSnapEnabled(document.documentElement)
        || scrollSnapEnabled(document.body)
        || sections.some((section) => (getComputedStyle(section).scrollSnapAlign || "") !== "none");
      const priority = (snap ? 10000 : 0) + (parent.tagName === "MAIN" ? 1000 : 0) + (parent === document.body ? 500 : 0) + sections.length;
      return { parent, sections, root, snap, priority };
    }).filter((candidate) => candidate.root);
    candidates.sort((left, right) => right.priority - left.priority);
    const selected = candidates[0];
    if (!selected) return { structureProfile: null, sectionCount: 0, sections: [] };

    const allPageIds = [...document.querySelectorAll("[data-nutbook-page-id]")].map((node) => node.getAttribute("data-nutbook-page-id") || "");
    const pageIdCounts = new Map(allPageIds.map((id) => [id, allPageIds.filter((candidate) => candidate === id).length]));
    const usedPageIds = new Set(allPageIds.filter(validPageId));
    let generatedOrdinal = 1;
    const nextPageId = () => {
      let id;
      do { id = `nutbook-section-${generatedOrdinal++}`; } while (usedPageIds.has(id));
      usedPageIds.add(id);
      return id;
    };
    const sections = selected.sections.map((section, index) => {
      const sourceId = section.getAttribute("data-nutbook-page-id") || "";
      const id = validPageId(sourceId) && pageIdCounts.get(sourceId) === 1 ? sourceId : nextPageId();
      const title = structureTitle(section, index);
      const kind = selected.snap || (getComputedStyle(section).scrollSnapAlign || "") !== "none" ? "scroll-snap" : "section";
      const target = cloneNodes.get(section);
      if (!target) return null;
      target.setAttribute("data-nutbook-page-id", id);
      target.setAttribute("data-nutbook-page-title", title);
      target.setAttribute("data-nutbook-page-kind", kind);
      return { id, title, kind };
    }).filter(Boolean);
    if (sections.length !== selected.sections.length || sections.length < 2) return { structureProfile: null, sectionCount: 0, sections: [] };
    clone.documentElement.setAttribute("data-nutbook-structure-profile", "vertical-sections-v1");
    clone.documentElement.setAttribute("data-nutbook-structure-origin", "converted");
    return { structureProfile: "vertical-sections-v1", sectionCount: sections.length, sections };
  }
  function convert(payload) {
    if (hasProtocol()) return { ok: false, reason: "protocol_present" };
    const clone = document.implementation.createHTMLDocument(document.title);
    clone.documentElement.replaceWith(document.documentElement.cloneNode(true));
    // Paths become invalid as soon as a rich-text wrapper moves siblings in
    // the detached tree. Keep a source-node to clone-node identity map so
    // later image/background candidates still target their original clone.
    const cloneNodes = new Map();
    const mapCloneNodes = (sourceNode, cloneNode) => {
      cloneNodes.set(sourceNode, cloneNode);
      const sourceChildren = [...sourceNode.children];
      const cloneChildren = [...cloneNode.children];
      sourceChildren.forEach((child, index) => mapCloneNodes(child, cloneChildren[index]));
    };
    mapCloneNodes(document.documentElement, clone.documentElement);
    const structure = detectVerticalStructure(clone, cloneNodes);
    const editableCandidateVisible = (node) => {
      if (visible(node)) return true;
      const section = node.closest("section");
      return Boolean(section && cloneNodes.get(section)?.hasAttribute("data-nutbook-page-id") && renderable(node));
    };
    const used = new Set([...document.querySelectorAll("[data-id]")].map((node) => node.getAttribute("data-id")));
    const nextId = (kind) => { let ordinal = 1; let id; do { id = `nutbook-${kind}-${ordinal++}`; } while (used.has(id)); used.add(id); return id; };
    const summary = { textCount: 0, imageCount: 0, backgroundImageCount: 0 };
    // A rich-text root must contain blocks. Marking a <p> or <h1> itself as
    // contenteditable makes block replacement/list commands invalid, so group
    // adjacent readable blocks into a detached wrapper instead.
    const grouped = new Set();
    const selectedTextRoots = new Set();
    const coveredBy = (node, roots) => {
      for (let current = node; current; current = current.parentElement) if (roots.has(current)) return true;
      return false;
    };
    // Include body itself: export tools often place every article block directly
    // under it, so scanning only descendants would silently fall back to one
    // editable target per paragraph.
    for (const parent of document.querySelectorAll("body, body *")) {
      if (parent.matches(EXCLUDED) || parent.closest(EXCLUDED)) continue;
      const children = [...parent.children];
      let run = [];
      const flush = () => {
        if (!run.length) return;
        const parentClone = cloneNodes.get(parent);
        const indexes = run.map((node) => [...parent.children].indexOf(node));
        const first = indexes[0];
        if (!parentClone || first < 0) { run = []; return; }
        const wrapper = clone.createElement("div");
        wrapper.setAttribute("data-id", nextId("content"));
        wrapper.setAttribute("data-editable", "rich-text");
        wrapper.setAttribute("data-edit-role", "content");
        parentClone.insertBefore(wrapper, parentClone.children[first]);
        // Inserting the wrapper shifts every original index by one, and each
        // append removes a sibling. Resolve the complete target set before
        // moving any node; otherwise the second element of an adjacent run
        // points past the shrinking children collection and aborts conversion.
        const cloneTargets = indexes.map((index) => parentClone.children[index + 1]);
        for (const target of cloneTargets) wrapper.appendChild(target);
        normalizeRichClone(wrapper);
        run.forEach((node) => grouped.add(node));
        summary.textCount++; run = [];
      };
      for (const child of children) {
        if (richGroupable(child) && !child.hasAttribute("data-id") && editableCandidateVisible(child)) run.push(child); else flush();
      }
      flush();
    }
    for (const node of document.querySelectorAll("h1,h2,h3,h4,p,div,span,strong,small,li")) {
      const text = node.textContent.trim();
      if (node.matches(EXCLUDED) || node.closest(EXCLUDED) || node.closest(INTERACTIVE) || node.hasAttribute("data-id") || !editableCandidateVisible(node) || !text) continue;
      if (coveredBy(node, grouped) || coveredBy(node, selectedTextRoots)) continue;
      if (node.tagName === "DIV" && (node.querySelector("h1,h2,h3,h4,p,li,div") || text.length < 2)) continue;
      const target = cloneNodes.get(node); if (!target) continue;
      target.setAttribute("data-id", nextId("text"));
      target.setAttribute("data-editable", RICH.has(node.tagName) && richSafe(node) ? "rich-text" : "text");
      if (target.getAttribute("data-editable") === "rich-text") { normalizeRichClone(target); target.setAttribute("data-edit-role", "content"); }
      selectedTextRoots.add(node);
      summary.textCount++;
    }
    for (const img of document.querySelectorAll("img")) {
      if (img.hasAttribute("data-id") || img.closest(EXCLUDED) || !visible(img) || !img.naturalWidth || !img.naturalHeight || img.getBoundingClientRect().width < 32 || img.getBoundingClientRect().height < 32 || !simplePicture(img)) continue;
      const target = cloneNodes.get(img); if (!target) continue;
      target.setAttribute("data-id", nextId("image")); target.setAttribute("data-editable", "image"); summary.imageCount++;
    }
    for (const node of document.querySelectorAll("body *")) {
      if (node.hasAttribute("data-id") || node.closest(EXCLUDED) || !visible(node)) continue;
      const bg = getComputedStyle(node).backgroundImage;
      if (!/^url\(/.test(bg) || /gradient/i.test(bg) || node.getBoundingClientRect().width < 64 || node.getBoundingClientRect().height < 64) continue;
      const target = cloneNodes.get(node); if (!target) continue;
      target.setAttribute("data-id", nextId("background")); target.setAttribute("data-editable", "background-image"); summary.backgroundImageCount++;
    }
    if (!(summary.textCount + summary.imageCount + summary.backgroundImageCount)) return { ok: false, reason: "no_candidates" };
    const doctype = document.doctype ? `<!DOCTYPE ${document.doctype.name}>\n` : "<!DOCTYPE html>\n";
    return { ok: true, protocolizedHtml: doctype + clone.documentElement.outerHTML, ...summary, ...structure };
  }
  window.__NUTBOOK_HTML_EDIT_CONVERTER__ = { convert };
})();
