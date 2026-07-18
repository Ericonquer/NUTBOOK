// Phase 1C conversion runs only in the HTML content WebView. It deliberately
// reads the live page but writes protocol attributes into a detached clone.
(() => {
  const EXCLUDED = "script,style,noscript,svg,canvas,iframe,video";
  const RICH = new Set(["H1", "H2", "H3", "H4", "P", "UL", "OL"]);
  const visible = (node) => {
    const style = getComputedStyle(node); const rect = node.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity || 1) > 0 && rect.width > 8 && rect.height > 8;
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
    const used = new Set([...document.querySelectorAll("[data-id]")].map((node) => node.getAttribute("data-id")));
    const nextId = (kind) => { let ordinal = 1; let id; do { id = `nutbook-${kind}-${ordinal++}`; } while (used.has(id)); used.add(id); return id; };
    const summary = { textCount: 0, imageCount: 0, backgroundImageCount: 0 };
    // A rich-text root must contain blocks. Marking a <p> or <h1> itself as
    // contenteditable makes block replacement/list commands invalid, so group
    // adjacent readable blocks into a detached wrapper instead.
    const grouped = new Set();
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
        if (richGroupable(child) && !child.hasAttribute("data-id") && visible(child)) run.push(child); else flush();
      }
      flush();
    }
    for (const node of document.querySelectorAll("h1,h2,h3,h4,p,div")) {
      if (node.matches(EXCLUDED) || node.closest(EXCLUDED) || node.hasAttribute("data-id") || !visible(node) || !node.textContent.trim()) continue;
      if (grouped.has(node)) continue;
      if (node.tagName === "DIV" && (node.querySelector("h1,h2,h3,h4,p,li,div") || node.textContent.trim().length < 8)) continue;
      const target = cloneNodes.get(node); if (!target) continue;
      target.setAttribute("data-id", nextId("text"));
      target.setAttribute("data-editable", RICH.has(node.tagName) && richSafe(node) ? "rich-text" : "text");
      if (target.getAttribute("data-editable") === "rich-text") { normalizeRichClone(target); target.setAttribute("data-edit-role", "content"); }
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
    return { ok: true, protocolizedHtml: doctype + clone.documentElement.outerHTML, ...summary };
  }
  window.__NUTBOOK_HTML_EDIT_CONVERTER__ = { convert };
})();
