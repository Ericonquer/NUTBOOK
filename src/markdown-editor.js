import { Editor, defaultValueCtx, editorViewCtx, prosePluginsCtx, rootCtx, serializerCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { redo, undo } from "@milkdown/kit/prose/history";
import { keymap } from "@milkdown/kit/prose/keymap";
import { liftListItem } from "@milkdown/kit/prose/schema-list";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { Plugin, TextSelection } from "@milkdown/kit/prose/state";
import { setBlockType, toggleMark } from "prosemirror-commands";
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  deleteColumn,
  deleteRow,
  isInTable
} from "prosemirror-tables";
import "@milkdown/kit/prose/tables/style/tables.css";
import "@milkdown/kit/prose/view/style/prosemirror.css";

const instances = new WeakMap();

const CODE_BLOCK_LANGUAGES = [
  { value: "", label: "Plain Text" },
  { value: "markdown", label: "Markdown" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "js", label: "JavaScript" },
  { value: "ts", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "shell", label: "Shell" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "sql", label: "SQL" }
];

function escapeOptionText(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function codeLanguageOptions(currentValue = "") {
  const current = String(currentValue || "").trim();
  const known = CODE_BLOCK_LANGUAGES.some((language) => language.value === current);
  if (!current || known) return CODE_BLOCK_LANGUAGES;
  return [
    ...CODE_BLOCK_LANGUAGES,
    { value: current, label: current }
  ];
}

function destroyExisting(root) {
  const existing = instances.get(root);
  if (!existing) return;
  existing.destroy();
  instances.delete(root);
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function selectionIsInList(selection) {
  const $from = selection?.$from;
  if (!$from) return false;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const name = $from.node(depth)?.type?.name;
    if (name === "list_item" || name === "listItem") return true;
  }
  return false;
}

function isAtStartOfListParagraph(state) {
  const { selection } = state;
  if (!selection?.empty) return false;
  const { $from } = selection;
  if (!$from.parent?.isTextblock || $from.parentOffset !== 0) return false;
  return selectionIsInList(selection);
}

function liftListItemAtParagraphStart(state, dispatch, view) {
  if (!isAtStartOfListParagraph(state)) return false;
  const listItem = state.schema.nodes.list_item || state.schema.nodes.listItem;
  if (!listItem) return false;
  return liftListItem(listItem)(state, dispatch, view);
}

function pastePlainTextWhenLeavingList() {
  return new Plugin({
    props: {
      handlePaste(view, event) {
        const plainText = event.clipboardData?.getData("text/plain");
        const html = event.clipboardData?.getData("text/html") || "";
        if (!plainText || !html || selectionIsInList(view.state.selection)) return false;
        const looksLikeListPaste = /<(ol|ul|li)\b/i.test(html) || /data-list-type=/i.test(html);
        if (!looksLikeListPaste) return false;
        event.preventDefault();
        view.dispatch(view.state.tr.insertText(plainText).scrollIntoView());
        return true;
      }
    }
  });
}

function localImageSrcPlugin(resolveImageSrc) {
  if (typeof resolveImageSrc !== "function") return null;

  const normalizeImage = (image) => {
    const originalSrc = image.dataset.nutbookOriginalSrc || image.getAttribute("src") || "";
    const resolvedSrc = resolveImageSrc(originalSrc);
    if (!resolvedSrc || resolvedSrc === image.getAttribute("src")) return;
    image.dataset.nutbookOriginalSrc = originalSrc;
    image.setAttribute("src", resolvedSrc);
  };
  const normalizeImages = (root) => {
    root.querySelectorAll("img[src]").forEach(normalizeImage);
  };

  return new Plugin({
    view(view) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            if (node.matches?.("img[src]")) {
              normalizeImage(node);
            }
            node.querySelectorAll?.("img[src]").forEach(normalizeImage);
          });
        });
      });
      observer.observe(view.dom, { childList: true, subtree: true });
      const frame = requestAnimationFrame(() => normalizeImages(view.dom));
      return {
        destroy() {
          observer.disconnect();
          cancelAnimationFrame(frame);
        }
      };
    }
  });
}

async function createMilkdownEditor({ root, markdown = "", language = null, onChange = null, onEdit = null, tableToolsEnabled = true, resolveImageSrc = null }) {
  if (!root) {
    throw new Error("Milkdown root is required");
  }

  const i18n = window.NutbookI18n;
  const t = (key) => i18n?.lookup?.(key, language || i18n.currentLanguage?.()) ?? key;

  destroyExisting(root);
  root.innerHTML = "";

  let currentMarkdown = markdown;
  let userInteracted = false;
  let hasDocumentChanges = false;
  let editorReady = false;
  let formatToolbar = null;
  let formatToolbarFrame = null;
  let formatToolbarVisible = false;
  let pendingLinkSelection = null;
  let tableToolbar = null;
  let tableToolbarFrame = null;
  let tableToolbarVisible = false;
  let codeLanguageLayer = null;
  let codeLanguageFrame = null;
  const codeLanguageControls = new Map();
  const markUserInteracted = () => {
    if (!userInteracted) {
      onEdit?.();
    }
    userInteracted = true;
  };
  const interactionEvents = ["beforeinput", "input", "paste", "keydown", "compositionend"];
  for (const eventName of interactionEvents) {
    root.addEventListener(eventName, markUserInteracted, true);
  }
  const handleUndoRedoShortcut = (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== "z") return;
    const view = getEditorView();
    if (!view) return;
    const command = event.shiftKey ? redo : undo;
    const handled = command(view.state, view.dispatch, view);
    if (!handled) return;
    event.preventDefault();
    event.stopPropagation();
    view.focus();
    scheduleFormatToolbarUpdate();
    scheduleTableToolbarUpdate();
    scheduleCodeLanguageControlsUpdate();
  };
  root.addEventListener("keydown", handleUndoRedoShortcut, true);

  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, root);
      ctx.set(defaultValueCtx, markdown);
      ctx.update(prosePluginsCtx, (plugins) => [
        keymap({
          "Mod-z": undo,
          "Shift-Mod-z": redo,
          "Mod-y": redo,
          "Backspace": liftListItemAtParagraphStart
        }),
        pastePlainTextWhenLeavingList(),
        localImageSrcPlugin(resolveImageSrc),
        ...plugins
      ].filter(Boolean));
      ctx.update(listenerCtx, (listenerManager) => listenerManager
        .updated(() => {
          if (!editorReady) return;
          hasDocumentChanges = true;
          scheduleFormatToolbarUpdate();
          scheduleTableToolbarUpdate();
          scheduleCodeLanguageControlsUpdate();
          if (!userInteracted) {
            onEdit?.();
          }
          userInteracted = true;
        })
        .markdownUpdated((_ctx, value) => {
          currentMarkdown = value;
          if (editorReady && value !== markdown) {
            hasDocumentChanges = true;
            scheduleFormatToolbarUpdate();
            scheduleTableToolbarUpdate();
            scheduleCodeLanguageControlsUpdate();
            if (!userInteracted) {
              onEdit?.();
            }
            userInteracted = true;
            onChange?.(value);
          }
        }));
    })
    .use(commonmark)
    .use(gfm)
    .use(history)
    .use(listener)
    .create();

  const serializeCurrentDocument = () => editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const serializer = ctx.get(serializerCtx);
    currentMarkdown = serializer(view.state.doc);
    return currentMarkdown;
  });
  const baselineMarkdown = serializeCurrentDocument();

  queueMicrotask(() => {
    editorReady = true;
    setupFormatToolbar();
    setupTableToolbar();
    setupCodeLanguageControls();
    scheduleFormatToolbarUpdate();
    scheduleTableToolbarUpdate();
    scheduleCodeLanguageControlsUpdate();
  });

  function getEditorView() {
    return editor.action((ctx) => ctx.get(editorViewCtx));
  }

  function findActiveTableElement(view) {
    if (!view || !isInTable(view.state)) return null;
    const { from } = view.state.selection;
    const domAtPos = view.domAtPos(from);
    const node = domAtPos.node?.nodeType === Node.ELEMENT_NODE
      ? domAtPos.node
      : domAtPos.node?.parentElement;
    return node?.closest?.("table") || null;
  }

  function runEditorCommand(command) {
    const view = getEditorView();
    if (!view) return false;
    const handled = command(view.state, view.dispatch, view);
    if (handled) {
      markUserInteracted();
      view.focus();
      scheduleFormatToolbarUpdate();
      scheduleTableToolbarUpdate();
    }
    return handled;
  }

  function getCodeBlockEntries(view) {
    if (!view) return [];
    const entries = [];
    view.state.doc.descendants((node, pos) => {
      if (node.type?.name === "code_block") {
        entries.push({ node, pos });
      }
      return true;
    });
    return entries;
  }

  function updateCodeBlockLanguage(pos, language) {
    const view = getEditorView();
    if (!view) return false;
    const target = view.state.doc.nodeAt(pos);
    if (!target || target.type?.name !== "code_block") return false;
    const nextLanguage = String(language || "").trim();
    const tr = view.state.tr.setNodeAttribute(pos, "language", nextLanguage);
    view.dispatch(tr);
    markUserInteracted();
    view.focus();
    scheduleCodeLanguageControlsUpdate();
    return true;
  }

  function createCodeLanguageSelect(pre, entry) {
    const select = document.createElement("select");
    select.className = "markdown-code-language-select";
    select.setAttribute("aria-label", t("markdown.codeLanguage"));
    const currentLanguage = entry.node.attrs?.language || "";
    select.innerHTML = codeLanguageOptions(currentLanguage).map((language) => (
      `<option value="${escapeOptionText(language.value)}">${escapeOptionText(language.label)}</option>`
    )).join("");
    select.value = currentLanguage;
    select.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });
    select.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    select.addEventListener("change", (event) => {
      event.preventDefault();
      event.stopPropagation();
      updateCodeBlockLanguage(Number(select.dataset.codeBlockPos), event.target.value);
    });
    codeLanguageLayer.appendChild(select);
    codeLanguageControls.set(pre, select);
    return select;
  }

  function setupCodeLanguageControls() {
    if (codeLanguageLayer) return;
    codeLanguageLayer = document.createElement("div");
    codeLanguageLayer.className = "markdown-code-language-layer";
    root.appendChild(codeLanguageLayer);
    ["keyup", "mouseup", "focusin", "pointerup", "input"].forEach((eventName) => {
      root.addEventListener(eventName, scheduleCodeLanguageControlsUpdate, true);
    });
    window.addEventListener("scroll", scheduleCodeLanguageControlsUpdate, true);
    window.addEventListener("resize", scheduleCodeLanguageControlsUpdate);
  }

  function updateCodeLanguageControls() {
    codeLanguageFrame = null;
    if (!codeLanguageLayer || !editorReady) return;
    const view = getEditorView();
    const editorRoot = root.querySelector(".ProseMirror");
    if (!view || !editorRoot) return;
    const rootRect = root.getBoundingClientRect();
    const pres = Array.from(editorRoot.querySelectorAll("pre"));
    const entries = getCodeBlockEntries(view);
    codeLanguageControls.forEach((select, pre) => {
      if (!pres.includes(pre)) {
        select.remove();
        codeLanguageControls.delete(pre);
      }
    });
    pres.forEach((pre, index) => {
      const entry = entries[index];
      if (!entry) return;
      const select = codeLanguageControls.get(pre) || createCodeLanguageSelect(pre, entry);
      select.dataset.codeBlockPos = String(entry.pos);
      const currentLanguage = entry.node.attrs?.language || "";
      if (![...select.options].some((option) => option.value === currentLanguage)) {
        select.innerHTML = codeLanguageOptions(currentLanguage).map((language) => (
          `<option value="${escapeOptionText(language.value)}">${escapeOptionText(language.label)}</option>`
        )).join("");
      }
      select.value = currentLanguage;
      const preRect = pre.getBoundingClientRect();
      const isVisible = preRect.bottom > rootRect.top && preRect.top < rootRect.bottom && pre.offsetParent !== null;
      select.style.display = isVisible ? "inline-flex" : "none";
      if (!isVisible) return;
      const left = Math.max(8, preRect.left - rootRect.left + 16);
      const top = Math.max(8, preRect.top - rootRect.top + 10);
      select.style.left = `${Math.round(left)}px`;
      select.style.top = `${Math.round(top)}px`;
    });
  }

  function scheduleCodeLanguageControlsUpdate() {
    if (!codeLanguageLayer) return;
    if (codeLanguageFrame) cancelAnimationFrame(codeLanguageFrame);
    codeLanguageFrame = requestAnimationFrame(updateCodeLanguageControls);
  }

  function runMarkCommand(markName) {
    const view = getEditorView();
    const mark = view?.state.schema.marks[markName];
    if (!mark) return false;
    return runEditorCommand(toggleMark(mark));
  }

  function hideLinkPopover() {
    if (!formatToolbar) return;
    formatToolbar.querySelector(".markdown-format-link-popover")?.classList.remove("open");
    pendingLinkSelection = null;
  }

  function showLinkPopover() {
    const view = getEditorView();
    const selection = view?.state.selection;
    if (!formatToolbar || !view || !selection || selection.empty) return false;
    pendingLinkSelection = { from: selection.from, to: selection.to };
    const popover = formatToolbar.querySelector(".markdown-format-link-popover");
    const input = formatToolbar.querySelector("[data-format-link-input]");
    if (!popover || !input) return false;
    popover.classList.add("open");
    input.value = "";
    window.setTimeout(() => input.focus(), 0);
    return true;
  }

  function applyLinkCommand(rawHref) {
    const href = String(rawHref || "").trim();
    if (!href) return false;
    const view = getEditorView();
    const linkMark = view?.state.schema.marks.link;
    if (!view || !linkMark || !pendingLinkSelection) return false;
    const from = Math.max(0, Math.min(pendingLinkSelection.from, view.state.doc.content.size));
    const to = Math.max(from, Math.min(pendingLinkSelection.to, view.state.doc.content.size));
    const transaction = view.state.tr
      .setSelection(TextSelection.create(view.state.doc, from, to))
      .addMark(from, to, linkMark.create({ href }));
    view.dispatch(transaction.scrollIntoView());
    markUserInteracted();
    view.focus();
    hideLinkPopover();
    scheduleFormatToolbarUpdate();
    scheduleTableToolbarUpdate();
    return true;
  }

  function removeLinkCommand() {
    const view = getEditorView();
    const linkMark = view?.state.schema.marks.link;
    const selection = view?.state.selection;
    if (!view || !linkMark || !selection || selection.empty) return false;
    const transaction = view.state.tr.removeMark(selection.from, selection.to, linkMark);
    view.dispatch(transaction.scrollIntoView());
    markUserInteracted();
    view.focus();
    hideLinkPopover();
    scheduleFormatToolbarUpdate();
    scheduleTableToolbarUpdate();
    return true;
  }

  function runHeadingCommand(value) {
    const view = getEditorView();
    if (!view) return false;
    const { nodes } = view.state.schema;
    if (value === "paragraph") {
      if (!nodes.paragraph) return false;
      return runEditorCommand(setBlockType(nodes.paragraph));
    }
    const level = Number(String(value || "").replace("h", ""));
    if (!nodes.heading || !Number.isFinite(level)) return false;
    return runEditorCommand(setBlockType(nodes.heading, { level }));
  }

  function markIsActive(view, markName) {
    const mark = view?.state.schema.marks[markName];
    if (!view || !mark) return false;
    const { from, to, empty, $from } = view.state.selection;
    if (empty) {
      return Boolean(mark.isInSet(view.state.storedMarks || $from.marks()));
    }
    return view.state.doc.rangeHasMark(from, to, mark);
  }

  function currentBlockValue(view) {
    if (!view) return "paragraph";
    const { $from } = view.state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth);
      if (node.type.name === "heading") {
        return `h${node.attrs?.level || 1}`;
      }
      if (node.type.name === "paragraph") {
        return "paragraph";
      }
    }
    return "paragraph";
  }

  function createFormatToolbar() {
    const toolbar = document.createElement("div");
    toolbar.className = "markdown-format-toolbar";
    toolbar.setAttribute("aria-label", t("markdown.formatTools"));
    toolbar.innerHTML = `
      <label class="markdown-format-heading-wrap">
        <select class="markdown-format-heading" aria-label="${t("markdown.headingLevel")}">
          <option value="paragraph">正文</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
          <option value="h4">H4</option>
        </select>
        <svg class="markdown-format-heading-caret" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.2 4.5 6 7.3l2.8-2.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </label>
      <button type="button" data-format-command="bold" aria-label="${t("markdown.bold")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4h4.3c2 0 3.2 1 3.2 2.6 0 1.1-.6 1.9-1.5 2.2 1.3.3 2.1 1.3 2.1 2.7 0 1.9-1.4 3.2-3.6 3.2H6V4Zm2.2 4h1.9c.8 0 1.2-.4 1.2-1.1 0-.7-.5-1.1-1.3-1.1H8.2V8Zm0 5h2.1c.9 0 1.5-.5 1.5-1.3 0-.9-.6-1.3-1.6-1.3h-2V13Z" fill="currentColor"/></svg>
        <span class="markdown-format-tooltip">⌘B</span>
      </button>
      <button type="button" data-format-command="italic" aria-label="${t("markdown.italic")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M9.1 4h6l-.3 1.7h-1.9l-1.8 8.6H13L12.7 16h-6l.3-1.7h1.9l1.8-8.6H8.8L9.1 4Z" fill="currentColor"/></svg>
        <span class="markdown-format-tooltip">⌘I</span>
      </button>
      <button type="button" data-format-command="code" aria-label="${t("markdown.inlineCode")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.2 6.4-3.3 3.5 3.3 3.5M12.8 6.4l3.3 3.5-3.3 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="markdown-format-tooltip">⌘E</span>
      </button>
      <button type="button" data-format-command="strike" aria-label="${t("markdown.strike")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10h10M7.1 13.3c.6 1 1.7 1.6 3.1 1.6 1.8 0 3-.9 3-2.2 0-1.1-.7-1.8-2.3-2.2l-1.8-.5C7.5 9.6 6.7 8.8 6.7 7.5c0-1.6 1.4-2.7 3.3-2.7 1.5 0 2.6.6 3.2 1.7" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>
        <span class="markdown-format-tooltip">⌥⌘X</span>
      </button>
      <button type="button" data-format-command="link" aria-label="${t("markdown.addLink")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8.2 6.7 9.4 5.5a3.3 3.3 0 0 1 4.7 4.7l-1.6 1.6a3.3 3.3 0 0 1-4.5.2M11.8 13.3l-1.2 1.2a3.3 3.3 0 0 1-4.7-4.7l1.6-1.6a3.3 3.3 0 0 1 4.5-.2" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="markdown-format-tooltip">${t("markdown.linkTooltip")}</span>
      </button>
      <div class="markdown-format-link-popover" aria-hidden="true">
        <input data-format-link-input type="text" placeholder="粘贴链接或文件路径" />
        <button type="button" data-format-link-apply>确认</button>
      </div>
    `;
    const commands = {
      bold: "strong",
      italic: "emphasis",
      code: "inlineCode",
      strike: "strike_through"
    };
    toolbar.addEventListener("mousedown", (event) => {
      if (event.target.closest("select") || event.target.closest("input")) return;
      event.preventDefault();
    });
    toolbar.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-format-command]");
      if (!button || button.getAttribute("aria-disabled") === "true") return;
      event.preventDefault();
      event.stopPropagation();
      if (button.dataset.formatCommand === "link") {
        if (button.classList.contains("active")) {
          removeLinkCommand();
          return;
        }
        showLinkPopover();
        return;
      }
      runMarkCommand(commands[button.dataset.formatCommand]);
    });
    toolbar.querySelector("[data-format-link-apply]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const input = toolbar.querySelector("[data-format-link-input]");
      applyLinkCommand(input?.value);
    });
    toolbar.querySelector("[data-format-link-input]")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        applyLinkCommand(event.currentTarget.value);
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        hideLinkPopover();
        getEditorView()?.focus();
      }
    });
    const linkInput = toolbar.querySelector("[data-format-link-input]");
    [
      "beforeinput",
      "input",
      "paste",
      "copy",
      "cut",
      "compositionstart",
      "compositionupdate",
      "compositionend",
      "keyup",
      "pointerdown",
      "mousedown",
      "mouseup",
      "click"
    ].forEach((eventName) => {
      linkInput?.addEventListener(eventName, (event) => event.stopPropagation());
    });
    toolbar.querySelector("select")?.addEventListener("change", (event) => {
      runHeadingCommand(event.target.value);
    });
    return toolbar;
  }

  function setupFormatToolbar() {
    if (formatToolbar) return;
    formatToolbar = createFormatToolbar();
    root.appendChild(formatToolbar);
    ["keyup", "mouseup", "focusin", "pointerup"].forEach((eventName) => {
      root.addEventListener(eventName, scheduleFormatToolbarUpdate, true);
    });
    document.addEventListener("selectionchange", scheduleFormatToolbarUpdate);
    window.addEventListener("scroll", scheduleFormatToolbarUpdate, true);
    window.addEventListener("resize", scheduleFormatToolbarUpdate);
    root.addEventListener("focusout", scheduleFormatToolbarHideAfterBlur, true);
  }

  function hideFormatToolbar() {
    if (!formatToolbar) return;
    hideLinkPopover();
    formatToolbar.classList.remove("visible");
    formatToolbarVisible = false;
  }

  function scheduleFormatToolbarHideAfterBlur() {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (!root.contains(active) && !formatToolbar?.contains(active)) {
        hideFormatToolbar();
      }
    }, 0);
  }

  function refreshFormatToolbarState(view) {
    if (!formatToolbar || !view) return;
    const markMap = {
      bold: "strong",
      italic: "emphasis",
      code: "inlineCode",
      strike: "strike_through",
      link: "link"
    };
    Object.entries(markMap).forEach(([command, markName]) => {
      const button = formatToolbar.querySelector(`[data-format-command="${command}"]`);
      if (!button) return;
      const supported = Boolean(view.state.schema.marks[markName]);
      button.classList.toggle("active", supported && markIsActive(view, markName));
      button.setAttribute("aria-disabled", supported ? "false" : "true");
    });
    const linkButton = formatToolbar.querySelector('[data-format-command="link"]');
    const linkTooltip = linkButton?.querySelector(".markdown-format-tooltip");
    const linkActive = Boolean(linkButton?.classList.contains("active"));
    linkButton?.setAttribute("aria-label", linkActive ? t("markdown.removeLink") : t("markdown.addLink"));
    if (linkTooltip) {
      linkTooltip.textContent = linkActive ? t("actions.remove") : t("markdown.linkTooltip");
    }
    const select = formatToolbar.querySelector("select");
    if (select) {
      select.value = currentBlockValue(view);
    }
  }

  function updateFormatToolbar() {
    formatToolbarFrame = null;
    if (!formatToolbar || !editorReady) return;
    const view = getEditorView();
    const selection = view?.state.selection;
    if (!view || !selection || selection.empty || !root.contains(view.dom)) {
      hideFormatToolbar();
      return;
    }
    if (isInTable(view.state)) {
      hideFormatToolbar();
      return;
    }
    const selectedText = view.state.doc.textBetween(selection.from, selection.to, " ").trim();
    if (!selectedText) {
      hideFormatToolbar();
      return;
    }

    refreshFormatToolbarState(view);

    const rootRect = root.getBoundingClientRect();
    let startRect = null;
    let endRect = null;
    try {
      startRect = view.coordsAtPos(selection.from);
      endRect = view.coordsAtPos(selection.to);
    } catch (_) {
      hideFormatToolbar();
      return;
    }
    const toolbarWidth = formatToolbar.offsetWidth || 248;
    const toolbarHeight = formatToolbar.offsetHeight || 38;
    const selectionLeft = Math.min(startRect.left, endRect.left);
    const selectionRight = Math.max(startRect.right || startRect.left, endRect.right || endRect.left);
    const selectionTop = Math.min(startRect.top, endRect.top);
    const selectionBottom = Math.max(startRect.bottom || startRect.top, endRect.bottom || endRect.top);
    const center = (selectionLeft + selectionRight) / 2;
    const left = Math.max(8, Math.min(center - rootRect.left - toolbarWidth / 2, rootRect.width - toolbarWidth - 8));
    let top = selectionTop - rootRect.top - toolbarHeight - 10;
    if (top < 8) {
      top = selectionBottom - rootRect.top + 10;
    }
    formatToolbar.style.left = `${Math.round(left)}px`;
    formatToolbar.style.top = `${Math.round(top)}px`;
    if (!formatToolbarVisible) {
      formatToolbar.classList.add("visible");
      formatToolbarVisible = true;
    }
  }

  function scheduleFormatToolbarUpdate() {
    if (!formatToolbar) return;
    if (formatToolbarFrame) cancelAnimationFrame(formatToolbarFrame);
    formatToolbarFrame = requestAnimationFrame(updateFormatToolbar);
  }

  function runTableCommand(command) {
    if (!tableToolsEnabled) return false;
    const view = getEditorView();
    if (!view || !isInTable(view.state)) return false;
    const handled = command(view.state, view.dispatch, view);
    if (handled) {
      markUserInteracted();
      view.focus();
      scheduleTableToolbarUpdate();
    }
    return handled;
  }

  function createTableToolbar() {
    const toolbar = document.createElement("div");
    toolbar.className = "markdown-table-toolbar";
    toolbar.setAttribute("aria-label", t("markdown.tableTools"));
    const icon = {
      "row-before": `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5h12M4 9.5h12M4 13.5h12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M10 2.8v4.1M7.9 4.8 10 2.7l2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      "row-after": `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5.5h12M4 9.5h12M4 13.5h12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M10 17.2v-4.1M7.9 15.2l2.1 2.1 2.1-2.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      "column-before": `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 4v12M9.5 4v12M13.5 4v12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M2.8 10h4.1M4.8 7.9 2.7 10l2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      "column-after": `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5.5 4v12M9.5 4v12M13.5 4v12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M17.2 10h-4.1M15.2 7.9l2.1 2.1-2.1 2.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      "delete-row": `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M4 10h12M4 14h12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="m7.7 7.7 4.6 4.6m0-4.6-4.6 4.6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`,
      "delete-column": `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v12M10 4v12M14 4v12" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="m7.7 7.7 4.6 4.6m0-4.6-4.6 4.6" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg>`
    };
    const labels = {
      "row-before": "上方插行",
      "row-after": "下方插行",
      "column-before": "左侧插列",
      "column-after": "右侧插列",
      "delete-row": "删除行",
      "delete-column": "删除列"
    };
    toolbar.innerHTML = `
      ${Object.keys(labels).map((command) => `
        <button type="button" data-table-command="${command}" aria-label="${labels[command]}">
          ${icon[command]}
          <span class="markdown-table-tooltip">${labels[command]}</span>
        </button>
      `).join("")}
    `;
    const commands = {
      "row-before": addRowBefore,
      "row-after": addRowAfter,
      "column-before": addColumnBefore,
      "column-after": addColumnAfter,
      "delete-row": deleteRow,
      "delete-column": deleteColumn
    };
    toolbar.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    toolbar.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-table-command]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      runTableCommand(commands[button.dataset.tableCommand]);
    });
    return toolbar;
  }

  function setupTableToolbar() {
    if (!tableToolsEnabled || tableToolbar) return;
    tableToolbar = createTableToolbar();
    root.appendChild(tableToolbar);
    ["keyup", "mouseup", "focusin", "pointerup"].forEach((eventName) => {
      root.addEventListener(eventName, scheduleTableToolbarUpdate, true);
    });
    window.addEventListener("scroll", scheduleTableToolbarUpdate, true);
    window.addEventListener("resize", scheduleTableToolbarUpdate);
  }

  function hideTableToolbar() {
    if (!tableToolbar) return;
    tableToolbar.classList.remove("visible");
    tableToolbarVisible = false;
  }

  function updateTableToolbar() {
    tableToolbarFrame = null;
    if (!tableToolbar || !tableToolsEnabled || !editorReady) return;
    const view = getEditorView();
    const table = findActiveTableElement(view);
    if (!table) {
      hideTableToolbar();
      return;
    }

    const rootRect = root.getBoundingClientRect();
    let cursorRect = null;
    try {
      cursorRect = view.coordsAtPos(view.state.selection.from);
    } catch (_) {
      cursorRect = table.getBoundingClientRect();
    }
    const toolbarWidth = tableToolbar.offsetWidth || 224;
    const toolbarHeight = tableToolbar.offsetHeight || 38;
    const cursorCenter = ((cursorRect.left || 0) + (cursorRect.right || cursorRect.left || 0)) / 2;
    const left = Math.max(6, Math.min(cursorCenter - rootRect.left - toolbarWidth / 2, rootRect.width - toolbarWidth - 6));
    let top = (cursorRect.top || 0) - rootRect.top - toolbarHeight - 10;
    if (top < 6) {
      top = (cursorRect.bottom || cursorRect.top || 0) - rootRect.top + 10;
    }
    tableToolbar.style.left = `${Math.round(left)}px`;
    tableToolbar.style.top = `${Math.round(top)}px`;
    if (!tableToolbarVisible) {
      tableToolbar.classList.add("visible");
      tableToolbarVisible = true;
    }
  }

  function scheduleTableToolbarUpdate() {
    if (!tableToolsEnabled || !tableToolbar) return;
    if (tableToolbarFrame) cancelAnimationFrame(tableToolbarFrame);
    tableToolbarFrame = requestAnimationFrame(updateTableToolbar);
  }

  function runHistoryCommand(command) {
    return editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const handled = command(view.state, view.dispatch, view);
      if (handled) {
        view.focus();
        scheduleFormatToolbarUpdate();
        scheduleTableToolbarUpdate();
        scheduleCodeLanguageControlsUpdate();
      }
      return handled;
    });
  }

  const api = {
    editor,
    getMarkdown() {
      return serializeCurrentDocument();
    },
    getBaselineMarkdown() {
      return baselineMarkdown;
    },
    hasChanges() {
      return hasDocumentChanges || userInteracted;
    },
    undo() {
      return runHistoryCommand(undo);
    },
    redo() {
      return runHistoryCommand(redo);
    },
    focus() {
      editor.action((ctx) => {
        ctx.get(editorViewCtx).focus();
      });
    },
    blur() {
      editor.action((ctx) => {
        ctx.get(editorViewCtx).dom.blur();
      });
    },
    focusAtText(anchorText, offsetHint = 0) {
      const normalizedAnchor = normalizeText(anchorText);
      if (!normalizedAnchor) {
        api.focus();
        return false;
      }

      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        let resolvedPos = null;
        view.state.doc.descendants((node, pos) => {
          if (!node.isText || resolvedPos !== null) return false;
          const text = node.text || "";
          const normalizedText = normalizeText(text);
          const normalizedIndex = normalizedText.indexOf(normalizedAnchor);
          if (normalizedIndex < 0 && !normalizedAnchor.includes(normalizedText)) return true;

          const rawIndex = text.indexOf(anchorText);
          const textOffset = rawIndex >= 0 ? rawIndex : 0;
          resolvedPos = Math.max(pos + 1, Math.min(pos + text.length, pos + 1 + textOffset + Math.max(0, offsetHint)));
          return false;
        });

        if (resolvedPos === null) {
          view.focus();
          return false;
        }

        view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, resolvedPos)).scrollIntoView());
        view.focus();
        return true;
      });
    },
    destroy() {
      if (formatToolbarFrame) {
        cancelAnimationFrame(formatToolbarFrame);
        formatToolbarFrame = null;
      }
      if (formatToolbar) {
        ["keyup", "mouseup", "focusin", "pointerup"].forEach((eventName) => {
          root.removeEventListener(eventName, scheduleFormatToolbarUpdate, true);
        });
        document.removeEventListener("selectionchange", scheduleFormatToolbarUpdate);
        window.removeEventListener("scroll", scheduleFormatToolbarUpdate, true);
        window.removeEventListener("resize", scheduleFormatToolbarUpdate);
        root.removeEventListener("focusout", scheduleFormatToolbarHideAfterBlur, true);
        formatToolbar.remove();
        formatToolbar = null;
      }
      if (codeLanguageFrame) {
        cancelAnimationFrame(codeLanguageFrame);
        codeLanguageFrame = null;
      }
      if (codeLanguageLayer) {
        ["keyup", "mouseup", "focusin", "pointerup", "input"].forEach((eventName) => {
          root.removeEventListener(eventName, scheduleCodeLanguageControlsUpdate, true);
        });
        window.removeEventListener("scroll", scheduleCodeLanguageControlsUpdate, true);
        window.removeEventListener("resize", scheduleCodeLanguageControlsUpdate);
        codeLanguageControls.forEach((select) => select.remove());
        codeLanguageControls.clear();
        codeLanguageLayer.remove();
        codeLanguageLayer = null;
      }
      if (tableToolbarFrame) {
        cancelAnimationFrame(tableToolbarFrame);
        tableToolbarFrame = null;
      }
      if (tableToolbar) {
        ["keyup", "mouseup", "focusin", "pointerup"].forEach((eventName) => {
          root.removeEventListener(eventName, scheduleTableToolbarUpdate, true);
        });
        window.removeEventListener("scroll", scheduleTableToolbarUpdate, true);
        window.removeEventListener("resize", scheduleTableToolbarUpdate);
        tableToolbar.remove();
        tableToolbar = null;
      }
      for (const eventName of interactionEvents) {
        root.removeEventListener(eventName, markUserInteracted, true);
      }
      root.removeEventListener("keydown", handleUndoRedoShortcut, true);
      editor.destroy();
      root.innerHTML = "";
      instances.delete(root);
    }
  };

  instances.set(root, api);
  return api;
}

window.NutbookMarkdownEditor = {
  create: createMilkdownEditor,
  destroy(root) {
    destroyExisting(root);
  }
};
