window.openNutbookNutsReview = async function ({ invoke, copy, markdownToHtml, wireExport, issueId, version, markdown, canEdit, pointerOpened, onQueued }) {
  const dialog = document.getElementById("nutsReviewDialog");
  if (dialog.open) return;
  const [header, layout, footer] = dialog.children;
  const [title, close] = header.children;
  const [article, sidebar] = layout.children;
  const [tools, commentsPane] = sidebar.children;
  const [select, whole, exportButton] = tools.children;
  const [list, form, hint] = commentsPane.children;
  const [selectionLabel, input, add, cancel] = form.children;
  const [status, submit, exportFeedback] = footer.children;
  exportFeedback.textContent = "";
  wireExport(exportButton, exportFeedback, issueId, version, false);
  const data = { issueId, version };
  const key = `nuts-review:${issueId}:${version}`;
  let comments = [];
  let saved = [];
  let anchor;
  let loading = true;
  let active = true;
  let sending = false;
  const selection = () => document.getSelection();
  const set = (element, zh, en) => {
    element.textContent = copy(zh, en);
    if (element.tagName === "BUTTON") element.title = element.textContent;
  };

  const icons = {
    close: '<path d="m6 6 8 8m0-8-8 8"/>',
    selection: '<path d="M3 4h14M3 8h8m2 6h6m-3-3v6"/>',
    whole: '<path d="M4 3h8l4 4v10H4zM8 11h5m-2.5-2.5v5"/>',
    remove: '<path d="M4 6h12M8 6V3h4v3M6 6l1 11h6l1-11M9 9v5m2-5v5"/>',
  };
  function iconButton(button, icon, zh, en) {
    const label = copy(zh, en);
    button.classList.add("nuts-review-icon");
    button.dataset.tooltip = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[icon]}</svg>`;
  }

  function focusComment(index) {
    const row = list.children[index];
    if (!row) return;
    row.scrollIntoView({ block: "nearest" });
    row.focus({ preventScroll: true });
  }

  function positionMarkers() {
    article.querySelectorAll(".nuts-review-marker").forEach(marker => marker.remove());
    const bounds = article.getBoundingClientRect();
    const positions = [...saved, ...comments].flatMap((comment, index) => {
      const rect = findRange(comment)?.getClientRects()[0];
      return rect ? [{ index, top: rect.top - bounds.top + article.scrollTop }] : [];
    }).sort((a, b) => a.top - b.top || a.index - b.index);
    let nextTop = 0;
    for (const { index, top } of positions) {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = "nuts-review-marker";
      marker.dataset.number = String(index + 1);
      marker.title = copy(`定位批注 ${index + 1}`, `Go to comment ${index + 1}`);
      marker.setAttribute("aria-label", marker.title);
      const markerTop = Math.max(top, nextTop);
      marker.style.top = `${markerTop}px`;
      nextTop = markerTop + 23;
      marker.onclick = () => focusComment(index);
      article.append(marker);
    }
  }

  function persist() {
    try { localStorage.setItem(key, JSON.stringify(comments)); } catch {}
  }

  function currentAnchor() {
    const selected = selection();
    if (!selected?.rangeCount || selected.isCollapsed) return;
    const range = selected.getRangeAt(0);
    if (!article.contains(range.startContainer) || !article.contains(range.endContainer)) return;
    const prefix = document.createRange();
    prefix.selectNodeContents(article);
    prefix.setEnd(range.startContainer, range.startOffset);
    const start = prefix.toString().length;
    const quote = range.toString();
    if (!quote.trim() || [...quote].length > 2000) return;
    return { start, end: start + quote.length, quote };
  }

  function findRange(comment) {
    if (!comment.quote || article.textContent.slice(comment.start, comment.end) !== comment.quote) return;
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let offset = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const end = offset + node.length;
      if (comment.start >= offset && comment.start < end) range.setStart(node, comment.start - offset);
      if (comment.end > offset && comment.end <= end) {
        range.setEnd(node, comment.end - offset);
        return range;
      }
      offset = end;
    }
  }

  function locate(comment) {
    const range = findRange(comment);
    if (!range) return;
    range.startContainer.parentElement.scrollIntoView({ block: "center" });
    selection()?.removeAllRanges();
    selection()?.addRange(range);
  }

  function render() {
    list.replaceChildren();
    const ranges = [];
    for (const [index, comment] of [...saved, ...comments].entries()) {
      const row = document.createElement("div");
      row.className = "nuts-review-comment";
      row.tabIndex = -1;
      const number = document.createElement("span");
      number.className = "nuts-review-number";
      number.textContent = String(index + 1);
      row.append(number);
      if (comment.quote) {
        const quote = document.createElement("button");
        quote.type = "button";
        quote.className = "nuts-review-quote";
        quote.textContent = comment.quote;
        quote.title = copy("定位原文", "Locate in draft");
        quote.onclick = () => locate(comment);
        const excerpt = document.createElement("blockquote");
        excerpt.className = "nuts-review-excerpt";
        excerpt.append(quote);
        row.append(excerpt);
        const range = findRange(comment);
        if (range) ranges.push(range);
      } else {
        const label = document.createElement("strong");
        set(label, "整篇意见", "Whole draft");
        row.append(label);
      }
      const body = document.createElement("p");
      body.textContent = comment.text;
      row.append(body);
      if (index >= saved.length) {
        const remove = document.createElement("button");
        remove.type = "button";
        iconButton(remove, "remove", "移除批注", "Remove comment");
        remove.onclick = () => {
          comments.splice(index - saved.length, 1);
          persist();
          render();
        };
        row.append(remove);
      }
      list.append(row);
    }
    if (globalThis.Highlight && CSS.highlights) CSS.highlights.set("nuts-review", new Highlight(...ranges));
    positionMarkers();
    submit.disabled = loading || sending || !comments.length || !form.hidden;
  }

  function edit(value) {
    anchor = value;
    whole.disabled = true;
    select.disabled = true;
    selectionLabel.textContent = anchor?.quote || copy("整篇意见", "Whole draft");
    form.hidden = false;
    input.focus();
    render();
  }

  function syncSelection() {
    const selected = currentAnchor();
    select.disabled = !selected || loading || sending || !form.hidden;
  }

  try { comments = canEdit ? JSON.parse(localStorage.getItem(key) || "[]") : []; } catch {}
  title.textContent = copy(`审阅 · 第 ${version} 版`, `Review · Version ${version}`);
  article.innerHTML = markdownToHtml(markdown);
  for (const paragraph of article.querySelectorAll("p")) {
    if (/^<!-- \/?nuts-review-references -->$/.test(paragraph.textContent.trim())) paragraph.hidden = true;
  }
  article.scrollTop = commentsPane.scrollTop = 0;
  list.replaceChildren();
  form.hidden = true;
  input.value = "";
  input.placeholder = copy("希望怎么改？", "What should change?");
  iconButton(close, "close", "返回议题", "Back to issue");
  iconButton(select, "selection", "批注选中文本", "Comment on selection");
  iconButton(whole, "whole", "整篇意见", "Whole-draft comment");
  set(add, "保存意见", "Save comment");
  set(cancel, "取消", "Cancel");
  input.setAttribute("aria-label", copy("修改意见", "Review comment"));
  set(submit, "提交并开放修订", "Submit and open revision");
  set(hint, "如果正在与 Agent 对话，也可以直接说明怎么改，请它把新版提交回此议题。", "You can also ask the agent in chat to revise and submit a new draft to this issue.");
  set(status, "正在读取批注…", "Loading comments…");
  select.hidden = whole.hidden = submit.hidden = hint.hidden = !canEdit;
  select.disabled = whole.disabled = submit.disabled = true;
  close.onclick = () => { if (!sending && !exportButton.disabled) dialog.close(); };
  dialog.oncancel = event => { if (sending || exportButton.disabled) event.preventDefault(); };
  dialog.addEventListener("close", () => {
    active = false;
    document.removeEventListener("selectionchange", syncSelection);
    CSS.highlights?.delete("nuts-review");
    resizeObserver.disconnect();
    if (pointerOpened && document.activeElement?.closest(".nuts-draft, .nuts-review-action")) {
      document.activeElement.blur();
    }
  }, { once: true });
  document.addEventListener("selectionchange", syncSelection);
  article.onclick = event => {
    if (!selection()?.isCollapsed || event.target.closest("a, button")) return;
    const caret = document.caretRangeFromPoint?.(event.clientX, event.clientY);
    if (!caret || !article.contains(caret.startContainer)) return;
    const prefix = document.createRange();
    prefix.selectNodeContents(article);
    prefix.setEnd(caret.startContainer, caret.startOffset);
    const offset = prefix.toString().length;
    const index = [...saved, ...comments].findIndex(comment =>
      comment.quote && offset >= comment.start && offset < comment.end && findRange(comment));
    if (index < 0) return;
    focusComment(index);
  };
  select.onpointerdown = event => event.preventDefault();
  select.onclick = () => {
    const selected = currentAnchor();
    if (selected) edit(selected);
  };
  whole.onclick = () => edit(undefined);
  cancel.onclick = () => {
    form.hidden = true;
    input.value = "";
    whole.disabled = false;
    render();
    syncSelection();
    whole.focus();
  };
  form.onsubmit = event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || comments.length >= 100) return;
    comments.push({ start: null, end: null, quote: null, ...anchor, text });
    persist();
    input.value = "";
    form.hidden = true;
    whole.disabled = false;
    render();
    syncSelection();
  };
  submit.onclick = async () => {
    if (sending || !comments.length) return;
    sending = true;
    close.disabled = whole.disabled = select.disabled = submit.disabled = true;
    try {
      await invoke("nuts_queue_review", { ...data, comments });
      comments = [];
      persist();
      dialog.close();
      await onQueued();
    } catch (error) {
      status.textContent = String(error);
    } finally {
      sending = false;
      close.disabled = whole.disabled = false;
      render();
      syncSelection();
    }
  };

  async function renderImages() {
    for (const paragraph of article.querySelectorAll("p")) {
      if (paragraph.childElementCount) continue;
      const match = /^!\[([^\]]*)\]\(((?:\.\/)?asset\/[^/\\()]+)\)$/.exec(paragraph.textContent.trim());
      if (!match) continue;
      const [, alt, url] = match;
      let source;
      try {
        source = await invoke("nuts_draft_image", { ...data, url });
      } catch {}
      if (!active) return;
      if (!source) continue;
      const original = document.createElement("span");
      original.hidden = true;
      original.textContent = paragraph.textContent;
      const image = document.createElement("img");
      image.alt = alt;
      image.addEventListener("load", positionMarkers, { once: true });
      image.src = source;
      paragraph.replaceChildren(original, image);
    }
  }

  const resizeObserver = new ResizeObserver(positionMarkers);
  dialog.showModal();
  resizeObserver.observe(article);
  void renderImages();
  try {
    saved = await invoke("nuts_review_history", data);
    if (active) status.textContent = "";
  } catch (error) {
    if (active) status.textContent = String(error);
  } finally {
    loading = false;
    if (active && dialog.open) {
      whole.disabled = false;
      render();
      syncSelection();
    }
  }
};
