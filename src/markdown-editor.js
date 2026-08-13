import { Editor, defaultValueCtx, editorViewCtx, prosePluginsCtx, rootCtx, serializerCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { redo, undo } from "@milkdown/kit/prose/history";
import { keymap } from "@milkdown/kit/prose/keymap";
import { liftListItem } from "@milkdown/kit/prose/schema-list";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { Plugin, Selection, TextSelection } from "@milkdown/kit/prose/state";
import { $nodeSchema, $remark } from "@milkdown/kit/utils";
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
const SKILL_FRONTMATTER_FIELDS = ["name", "description", "trigger_keywords"];

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

function splitSkillFrontmatterForEditor(markdown = "") {
  const raw = String(markdown || "");
  const match = raw.match(/^---[ \t]*(?:\r?\n)([\s\S]*?)(?:\r?\n)---[ \t]*(?:\r?\n|$)/);
  if (!match) return null;
  return {
    raw: match[0],
    body: raw.slice(match[0].length),
    fields: parseSkillFrontmatterFields(match[1] || "")
  };
}

function trimFrontmatterValue(value = "") {
  return String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .trim();
}

function parseFrontmatterInlineValues(value = "") {
  const trimmed = String(value || "").trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1)
      .split(",")
      .map(trimFrontmatterValue)
      .filter(Boolean);
  }
  const cleanValue = trimFrontmatterValue(trimmed);
  return cleanValue ? [cleanValue] : [];
}

function extractSkillTriggersFromDescription(description = "") {
  const match = String(description || "").match(/(?:^|\s)Triggers:\s*([\s\S]+)$/i);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((value) => trimFrontmatterValue(value.replace(/\.$/, "")))
    .filter(Boolean);
}

function cleanSkillDescription(description = "") {
  return String(description || "")
    .replace(/\s*Triggers:\s*[\s\S]+$/i, "")
    .trim();
}

function parseSkillFrontmatterFields(frontmatter = "") {
  const fields = [];
  let currentIndex = -1;
  let blockIndex = -1;
  let blockFolded = false;
  String(frontmatter || "").split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith("- ")) {
      if (currentIndex >= 0) {
        const value = trimFrontmatterValue(trimmed.slice(2));
        if (value) fields[currentIndex].values.push(value);
      }
      return;
    }
    if (/^\s/.test(line) && blockIndex >= 0) {
      const value = trimmed;
      if (!value) return;
      const values = fields[blockIndex].values;
      values[0] = [values[0], value].filter(Boolean).join(blockFolded ? " " : "\n");
      return;
    }
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex < 0) {
      currentIndex = -1;
      blockIndex = -1;
      return;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!key) return;
    currentIndex = fields.length;
    if (rawValue === ">" || rawValue === "|") {
      fields.push({ key, values: [""] });
      blockIndex = currentIndex;
      blockFolded = rawValue === ">";
      return;
    }
    fields.push({ key, values: parseFrontmatterInlineValues(rawValue) });
    blockIndex = -1;
  });
  return fields;
}

function skillFrontmatterField(frontmatter, key) {
  return (frontmatter?.fields || []).find((field) => field.key === key) || null;
}

function skillFrontmatterValue(frontmatter, key) {
  const field = skillFrontmatterField(frontmatter, key);
  if (field && key === "description") {
    return (field.values || []).map(cleanSkillDescription).filter(Boolean);
  }
  if (field) return field.values || [];
  if (key === "trigger_keywords") {
    const description = skillFrontmatterField(frontmatter, "description")?.values?.[0] || "";
    return extractSkillTriggersFromDescription(description);
  }
  return [];
}

function setSkillFrontmatterValues(frontmatter, key, values) {
  if (!frontmatter) return;
  const cleanValues = values.map((value) => String(value || "").trim()).filter(Boolean);
  const existing = frontmatter.fields.find((field) => field.key === key);
  if (existing) {
    existing.values = cleanValues;
  } else {
    frontmatter.fields.push({ key, values: cleanValues });
  }
}

function frontmatterContentLines(rawFrontmatter = "") {
  return String(rawFrontmatter || "")
    .replace(/^---[ \t]*(?:\r?\n)?/, "")
    .replace(/(?:\r?\n)?---[ \t]*(?:\r?\n)?$/, "")
    .split(/\r?\n/);
}

function frontmatterEntries(rawFrontmatter = "") {
  const entries = [];
  let current = null;
  frontmatterContentLines(rawFrontmatter).forEach((line) => {
    const trimmed = line.trim();
    const isTopLevelField = trimmed && !/^\s/.test(line) && trimmed.includes(":");
    if (isTopLevelField) {
      current = {
        key: trimmed.slice(0, trimmed.indexOf(":")).trim(),
        lines: [line]
      };
      entries.push(current);
      return;
    }
    if (current) {
      current.lines.push(line);
    } else {
      entries.push({ key: "", lines: [line] });
    }
  });
  return entries;
}

function formatFrontmatterField(key, values = []) {
  const cleanValues = values.map((value) => String(value || "").trim()).filter(Boolean);
  if (key === "trigger_keywords") {
    if (!cleanValues.length) return [];
    return [ `${key}:`, ...cleanValues.map((value) => `  - ${value}`) ];
  }
  if (key === "description") {
    const value = cleanValues[0] || "";
    if (!value) return [];
    if (value.includes("\n")) {
      return [ `${key}: >`, ...value.split(/\r?\n/).map((line) => `  ${line.trim()}`) ];
    }
    return [`${key}: ${value}`];
  }
  const value = cleanValues[0] || "";
  return value ? [`${key}: ${value}`] : [];
}

function serializeSkillFrontmatterForEditor(frontmatter) {
  if (!frontmatter) return "";
  const seen = new Set();
  const lines = [];
  frontmatterEntries(frontmatter.raw).forEach((entry) => {
    if (SKILL_FRONTMATTER_FIELDS.includes(entry.key)) {
      seen.add(entry.key);
      lines.push(...formatFrontmatterField(entry.key, skillFrontmatterValue(frontmatter, entry.key)));
      return;
    }
    lines.push(...entry.lines);
  });
  SKILL_FRONTMATTER_FIELDS.forEach((key) => {
    if (seen.has(key)) return;
    lines.push(...formatFrontmatterField(key, skillFrontmatterValue(frontmatter, key)));
  });
  return `---\n${lines.filter((line, index, all) => line.trim() || all[index - 1]?.trim()).join("\n").trim()}\n---\n`;
}

function renderSkillFrontmatterPanel(frontmatter) {
  if (!frontmatter) return null;
  const panel = document.createElement("section");
  panel.className = "markdown-frontmatter skill-frontmatter";
  panel.setAttribute("contenteditable", "false");
  const name = skillFrontmatterValue(frontmatter, "name")[0] || "";
  const description = skillFrontmatterValue(frontmatter, "description")[0] || "";
  const triggerKeywords = skillFrontmatterValue(frontmatter, "trigger_keywords").join("\n");
  panel.innerHTML = `
    <div class="markdown-frontmatter-label">SKILL 元信息</div>
    <label class="markdown-frontmatter-row">
      <span class="markdown-frontmatter-key">name</span>
      <input class="markdown-frontmatter-input" data-frontmatter-field="name" value="${escapeOptionText(name)}" spellcheck="false" />
    </label>
    <label class="markdown-frontmatter-row">
      <span class="markdown-frontmatter-key">description</span>
      <textarea class="markdown-frontmatter-input markdown-frontmatter-textarea" data-frontmatter-field="description" rows="3">${escapeOptionText(description)}</textarea>
    </label>
    <label class="markdown-frontmatter-row">
      <span class="markdown-frontmatter-key">trigger_keywords</span>
      <textarea class="markdown-frontmatter-input markdown-frontmatter-textarea" data-frontmatter-field="trigger_keywords" rows="2" placeholder="每行一个关键词，也可以用逗号分隔">${escapeOptionText(triggerKeywords)}</textarea>
    </label>
  `;
  return panel;
}

function setupSkillFrontmatterEditing(panel, frontmatter, onEdited) {
  if (!panel || !frontmatter) return;
  panel.querySelectorAll("[data-frontmatter-field]").forEach((control) => {
    control.addEventListener("input", () => {
      const key = control.dataset.frontmatterField;
      const rawValue = control.value || "";
      const values = key === "trigger_keywords"
        ? rawValue.split(/[,\n]/).map((value) => value.trim()).filter(Boolean)
        : [rawValue.trim()];
      setSkillFrontmatterValues(frontmatter, key, values);
      onEdited?.();
    });
  });
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

const INSERT_ICON_SVG = {
  image: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 5.2h11a1.3 1.3 0 0 1 1.3 1.3v8a1.3 1.3 0 0 1-1.3 1.3h-11a1.3 1.3 0 0 1-1.3-1.3v-8a1.3 1.3 0 0 1 1.3-1.3Z" fill="none" stroke="currentColor" stroke-width="1.45"/><path d="m4 13.8 3.2-3.2 2.4 2.2 2.7-3.1 3.7 4.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><circle cx="13.4" cy="7.8" r="1.1" fill="currentColor"/></svg>`,
  h1: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14.7 15V8.2l-1.7.9" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  h2: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.1 9.1c.4-.7 1-1 1.9-1 1.1 0 1.9.7 1.9 1.7 0 .8-.5 1.4-1.4 2.1l-2.3 2.1h3.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  h3: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M13.2 8.7c.4-.4 1-.6 1.7-.6 1.1 0 1.9.6 1.9 1.5 0 .8-.6 1.3-1.4 1.4.9.1 1.6.7 1.6 1.6 0 1-.9 1.8-2.1 1.8-.8 0-1.5-.2-2-.7" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  h4: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5v10M10 5v10M4 10h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16.2 14.5V8.2l-3.5 4.3h4.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  list: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 6h8M8 10h8M8 14h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="4.8" cy="6" r="1" fill="currentColor"/><circle cx="4.8" cy="10" r="1" fill="currentColor"/><circle cx="4.8" cy="14" r="1" fill="currentColor"/></svg>`,
  orderedList: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 6h8M8 10h8M8 14h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4.3 7V4.5l-.8.4M3.5 9.2c.2-.3.6-.5 1-.5.7 0 1.1.4 1.1 1 0 .4-.3.8-.8 1.2l-1.2.9h2M3.6 13.2c.2-.2.5-.3.9-.3.7 0 1.1.3 1.1.8 0 .4-.3.7-.8.8.6.1 1 .4 1 .9 0 .6-.5 1-1.3 1-.4 0-.8-.1-1.1-.3" fill="none" stroke="currentColor" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  table: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 5h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM3.5 8.5h13M8 5v10M12.5 5v10" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/></svg>`,
  code: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.4 6.6-3.2 3.4 3.2 3.4M12.6 6.6l3.2 3.4-3.2 3.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

const IMAGE_ALIGN_ICON_SVG = {
  left: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M4 8h8.5M4 11.5h12M4 15h8.5" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>`,
  center: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M6.2 8h7.6M4 11.5h12M6.2 15h7.6" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>`,
  right: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M7.5 8H16M4 11.5h12M7.5 15H16" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>`
};

const IMAGE_SIZE_ICON_SVG = {
  small: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6.2" y="6.2" width="7.6" height="7.6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.55"/><path d="M8 11.8 9.5 10l1.1 1.2 1.2-1.5 1.5 2.1" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  medium: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4.8" y="4.8" width="10.4" height="10.4" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.55"/><path d="M6.8 12.8 9 10.5l1.4 1.5 1.7-2 2 2.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  large: `<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.5" y="3.5" width="13" height="13" rx="1.7" fill="none" stroke="currentColor" stroke-width="1.55"/><path d="M5.8 13.7 8.7 11l1.8 1.8 2.2-2.6 2.5 3.5" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

const IMAGE_ALIGNMENT_TOKEN = /(?:^|\s)nutbook-align=(left|center|right)(?=\s|$)/i;
const IMAGE_SIZE_TOKEN = /(?:^|\s)nutbook-size=(small|medium|large)(?=\s|$)/i;
const PORTABLE_IMAGE_NODE_NAME = "portable_image";
const PORTABLE_IMAGE_WIDTH_LIMITS = Object.freeze({ small: 160, medium: 480 });

function meaningfulHtmlChildren(node) {
  return Array.from(node?.childNodes || []).filter((child) => {
    return child.nodeType !== Node.TEXT_NODE || String(child.textContent || "").trim() !== "";
  });
}

function hasOnlyAttributes(element, allowedNames) {
  const allowed = new Set(allowedNames);
  return element.getAttributeNames().every((name) => allowed.has(name.toLowerCase()));
}

function isPortableImageUrl(value, kind = "src") {
  const url = String(value || "").trim();
  if (!url || /[\u0000-\u001f\u007f]/.test(url) || url.startsWith("//")) return false;
  const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase() || "";
  if (!scheme) return true;
  if (scheme === "http" || scheme === "https") return true;
  return kind === "href" && scheme === "mailto";
}

function parsePortableImageWidth(value) {
  if (value == null || value === "") return null;
  if (!/^\d+$/.test(String(value))) return null;
  const width = Number(value);
  return Number.isInteger(width) && width >= 1 && width <= 8192 ? width : null;
}

function parsePortableImageHtml(rawSource = "") {
  const raw = String(rawSource || "");
  if (!raw.trim() || typeof DOMParser !== "function") return null;
  const documentNode = new DOMParser().parseFromString(`<!doctype html><body>${raw}</body>`, "text/html");
  const roots = meaningfulHtmlChildren(documentNode.body);
  if (roots.length !== 1 || roots[0].nodeType !== Node.ELEMENT_NODE) return null;

  let root = roots[0];
  let alignment = "";
  if (root.tagName === "P") {
    if (!hasOnlyAttributes(root, ["align"])) return null;
    alignment = String(root.getAttribute("align") || "").toLowerCase();
    if (!["left", "center", "right"].includes(alignment)) return null;
    const children = meaningfulHtmlChildren(root);
    if (children.length !== 1 || children[0].nodeType !== Node.ELEMENT_NODE) return null;
    root = children[0];
  }

  let linkHref = "";
  let linkTitle = "";
  if (root.tagName === "A") {
    if (!hasOnlyAttributes(root, ["href", "title"])) return null;
    linkHref = String(root.getAttribute("href") || "").trim();
    linkTitle = String(root.getAttribute("title") || "");
    if (!isPortableImageUrl(linkHref, "href")) return null;
    const children = meaningfulHtmlChildren(root);
    if (children.length !== 1 || children[0].nodeType !== Node.ELEMENT_NODE) return null;
    root = children[0];
  }

  if (root.tagName !== "IMG" || !hasOnlyAttributes(root, ["src", "alt", "title", "width"])) return null;
  if (meaningfulHtmlChildren(root).length > 0) return null;
  const src = String(root.getAttribute("src") || "").trim();
  if (!isPortableImageUrl(src, "src")) return null;
  const rawWidth = root.getAttribute("width");
  const displayWidthPx = parsePortableImageWidth(rawWidth);
  if (rawWidth != null && displayWidthPx == null) return null;

  return {
    src,
    alt: String(root.getAttribute("alt") || ""),
    title: String(root.getAttribute("title") || ""),
    alignment,
    displayWidthPx,
    linkHref,
    linkTitle,
    sourceSyntax: "github-html",
    rawSource: raw,
    presentationDirty: false
  };
}

function escapePortableImageAttribute(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function serializePortableImageHtml(attrs = {}) {
  const imageAttributes = [
    `src="${escapePortableImageAttribute(attrs.src)}"`,
    `alt="${escapePortableImageAttribute(attrs.alt)}"`
  ];
  if (attrs.title) imageAttributes.push(`title="${escapePortableImageAttribute(attrs.title)}"`);
  const width = parsePortableImageWidth(attrs.displayWidthPx);
  if (width != null) imageAttributes.push(`width="${width}"`);
  const image = `<img ${imageAttributes.join(" ")}>`;
  const linkedImage = attrs.linkHref
    ? `<a href="${escapePortableImageAttribute(attrs.linkHref)}"${attrs.linkTitle ? ` title="${escapePortableImageAttribute(attrs.linkTitle)}"` : ""}>\n    ${image}\n  </a>`
    : image;
  const alignment = ["left", "center", "right"].includes(attrs.alignment) ? attrs.alignment : "";
  if (!alignment) {
    return attrs.linkHref
      ? `<a href="${escapePortableImageAttribute(attrs.linkHref)}"${attrs.linkTitle ? ` title="${escapePortableImageAttribute(attrs.linkTitle)}"` : ""}>\n  ${image}\n</a>`
      : image;
  }
  return `<p align="${alignment}">\n  ${linkedImage}\n</p>`;
}

function visitPortableImageHtml(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node.children)) node.children.forEach(visitPortableImageHtml);
  if (node.type !== "html" || typeof node.value !== "string") return;
  const parsed = parsePortableImageHtml(node.value);
  if (!parsed) return;
  Object.keys(node).forEach((key) => {
    if (key !== "position") delete node[key];
  });
  Object.assign(node, { type: "portableImage", ...parsed });
}

const portableImageRemark = $remark("portableImageRemark", () => () => (tree) => {
  visitPortableImageHtml(tree);
});

const portableImageSchema = $nodeSchema(PORTABLE_IMAGE_NODE_NAME, () => ({
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  defining: true,
  isolating: true,
  attrs: {
    src: { default: "", validate: "string" },
    alt: { default: "", validate: "string" },
    title: { default: "", validate: "string" },
    alignment: { default: "", validate: "string" },
    displayWidthPx: { default: null, validate: "number|null" },
    linkHref: { default: "", validate: "string" },
    linkTitle: { default: "", validate: "string" },
    sourceSyntax: { default: "github-html", validate: "string" },
    rawSource: { default: "", validate: "string" },
    presentationDirty: { default: false, validate: "boolean" }
  },
  parseDOM: [{
    tag: 'div[data-type="portable-image"]',
    getAttrs: (element) => {
      const image = element.querySelector("img[src]");
      const anchor = image?.closest("a[href]");
      return {
        src: image?.dataset.nutbookOriginalSrc || image?.getAttribute("src") || "",
        alt: image?.getAttribute("alt") || "",
        title: image?.getAttribute("title") || "",
        alignment: element.dataset.nutbookImageAlign || "",
        displayWidthPx: parsePortableImageWidth(element.dataset.nutbookDisplayWidth),
        linkHref: anchor?.getAttribute("href") || "",
        linkTitle: anchor?.getAttribute("title") || "",
        sourceSyntax: "github-html",
        rawSource: element.dataset.nutbookRawSource || "",
        presentationDirty: element.dataset.nutbookPresentationDirty === "true"
      };
    }
  }],
  toDOM: (node) => {
    const alignment = ["left", "center", "right"].includes(node.attrs.alignment) ? node.attrs.alignment : "";
    const displayWidthPx = parsePortableImageWidth(node.attrs.displayWidthPx);
    const imageAttributes = {
      src: node.attrs.src,
      alt: node.attrs.alt,
      title: node.attrs.title || null,
      class: "nutbook-portable-image",
      "data-nutbook-portable-image": "true",
      "data-nutbook-image-align": alignment,
      "data-nutbook-display-width": displayWidthPx == null ? "" : String(displayWidthPx)
    };
    if (displayWidthPx != null) {
      imageAttributes.style = `width:auto;height:auto;max-width:min(${displayWidthPx}px, 100%)`;
    }
    const image = ["img", imageAttributes];
    const media = node.attrs.linkHref
      ? ["a", { href: node.attrs.linkHref, title: node.attrs.linkTitle || null }, image]
      : image;
    return ["div", {
      class: `portable-image-block${alignment ? ` nutbook-image-align-${alignment}` : ""}`,
      "data-type": "portable-image",
      "data-nutbook-image-align": alignment,
      "data-nutbook-display-width": displayWidthPx == null ? "" : String(displayWidthPx),
      "data-nutbook-presentation-dirty": node.attrs.presentationDirty ? "true" : "false"
    }, media];
  },
  parseMarkdown: {
    match: (node) => node.type === "portableImage",
    runner: (state, node, type) => {
      state.addNode(type, {
        src: node.src || "",
        alt: node.alt || "",
        title: node.title || "",
        alignment: node.alignment || "",
        displayWidthPx: node.displayWidthPx ?? null,
        linkHref: node.linkHref || "",
        linkTitle: node.linkTitle || "",
        sourceSyntax: "github-html",
        rawSource: node.rawSource || "",
        presentationDirty: false
      });
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === PORTABLE_IMAGE_NODE_NAME,
    runner: (state, node) => {
      const html = !node.attrs.presentationDirty && node.attrs.rawSource
        ? node.attrs.rawSource
        : serializePortableImageHtml(node.attrs);
      state.addNode("html", undefined, html);
    }
  }
}));

function imageAlignmentFromTitle(title = "") {
  const match = String(title || "").match(IMAGE_ALIGNMENT_TOKEN);
  return match?.[1]?.toLowerCase() || "";
}

function imageSizeFromTitle(title = "") {
  const match = String(title || "").match(IMAGE_SIZE_TOKEN);
  return match?.[1]?.toLowerCase() || "large";
}

function cleanImageTitleTokens(title = "") {
  return String(title || "")
    .replace(IMAGE_ALIGNMENT_TOKEN, " ")
    .replace(IMAGE_SIZE_TOKEN, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleWithImageAlignment(title = "", alignment = "") {
  const cleanTitle = cleanImageTitleTokens(title);
  const size = imageSizeFromTitle(title);
  const sizeToken = size && size !== "large" ? `nutbook-size=${size}` : "";
  if (!alignment) return cleanTitle;
  return [cleanTitle, `nutbook-align=${alignment}`, sizeToken].filter(Boolean).join(" ");
}

function titleWithImageSize(title = "", size = "large") {
  const cleanTitle = cleanImageTitleTokens(title);
  const alignment = imageAlignmentFromTitle(title);
  const sizeToken = size && size !== "large" ? `nutbook-size=${size}` : "";
  return [cleanTitle, alignment ? `nutbook-align=${alignment}` : "", sizeToken].filter(Boolean).join(" ");
}

function applyMarkdownImageAlignment(image) {
  if (!image) return "";
  if (image.dataset.nutbookPortableImage === "true") {
    return image.dataset.nutbookImageAlign || "";
  }
  const alignment = imageAlignmentFromTitle(image.getAttribute("title") || "");
  const size = imageSizeFromTitle(image.getAttribute("title") || "");
  ["left", "center", "right"].forEach((value) => {
    image.classList.toggle(`nutbook-image-align-${value}`, alignment === value);
  });
  ["small", "medium", "large"].forEach((value) => {
    image.classList.toggle(`nutbook-image-size-${value}`, size === value);
  });
  image.dataset.nutbookImageAlign = alignment;
  image.dataset.nutbookImageSize = size;
  return alignment;
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

function collectImageSources(doc) {
  const sources = new Set();
  doc?.descendants?.((node) => {
    if (["image", PORTABLE_IMAGE_NODE_NAME].includes(node.type?.name) && node.attrs?.src) {
      sources.add(String(node.attrs.src));
    }
    return true;
  });
  return sources;
}

function markdownImageAssetRemovalPlugin(onRemoveImageAsset) {
  if (typeof onRemoveImageAsset !== "function") return null;
  return new Plugin({
    view(view) {
      let knownSources = collectImageSources(view.state.doc);
      let scanTimer = null;
      const scanForRemovedAssets = () => {
        scanTimer = null;
        const nextSources = collectImageSources(view.state.doc);
        knownSources.forEach((src) => {
          if (!nextSources.has(src)) {
            queueMicrotask(() => onRemoveImageAsset(src));
          }
        });
        knownSources = nextSources;
      };
      const scheduleScan = () => {
        if (scanTimer) clearTimeout(scanTimer);
        scanTimer = window.setTimeout(scanForRemovedAssets, 360);
      };
      return {
        update(nextView, oldState) {
          if (oldState.doc.eq(nextView.state.doc)) return;
          view = nextView;
          scheduleScan();
        },
        destroy() {
          if (scanTimer) {
            clearTimeout(scanTimer);
            scanTimer = null;
          }
        }
      };
    }
  });
}

function localImageSrcPlugin(resolveImageSrc) {
  const normalizeImage = (image) => {
    const originalSrc = image.dataset.nutbookOriginalSrc || image.getAttribute("src") || "";
    if (typeof resolveImageSrc === "function") {
      const resolvedSrc = resolveImageSrc(originalSrc);
      if (resolvedSrc && resolvedSrc !== image.getAttribute("src")) {
        image.dataset.nutbookOriginalSrc = originalSrc;
        image.setAttribute("src", resolvedSrc);
      }
    }
    applyMarkdownImageAlignment(image);
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

async function createMilkdownEditor({ root, markdown = "", language = null, onChange = null, onEdit = null, tableToolsEnabled = true, resolveImageSrc = null, onInsertImageAsset = null, onRemoveImageAsset = null, onImageSizeError = null }) {
  if (!root) {
    throw new Error("Milkdown root is required");
  }

  const i18n = window.NutbookI18n;
  const t = (key) => i18n?.lookup?.(key, language || i18n.currentLanguage?.()) ?? key;

  destroyExisting(root);
  root.innerHTML = "";
  const skillFrontmatter = splitSkillFrontmatterForEditor(markdown);
  const editorMarkdown = skillFrontmatter ? skillFrontmatter.body : markdown;
  const editorMount = document.createElement("div");
  editorMount.className = "milkdown-editor-body";
  const frontmatterPanel = renderSkillFrontmatterPanel(skillFrontmatter);
  if (frontmatterPanel) {
    root.appendChild(frontmatterPanel);
  }
  root.appendChild(editorMount);

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
  let insertMenu = null;
  let insertMenuFrame = null;
  let insertMenuVisible = false;
  let insertMenuOpen = false;
  let insertMenuSelection = null;
  let imageAlignToolbar = null;
  let imageAlignFrame = null;
  let activeImageTarget = null;
  let codeLanguageLayer = null;
  let codeLanguageFrame = null;
  let markdownChangeTimer = null;
  let lastNotifiedMarkdown = markdown;
  const codeLanguageControls = new Map();
  const markUserInteracted = () => {
    if (!userInteracted) {
      onEdit?.();
    }
    userInteracted = true;
    if (insertMenuVisible) {
      hideInsertMenu();
    }
  };
  setupSkillFrontmatterEditing(frontmatterPanel, skillFrontmatter, () => {
    markUserInteracted();
    hasDocumentChanges = true;
    scheduleMarkdownChangeSync(80);
  });
  const interactionEvents = [];
  const handleUndoRedoShortcut = (event) => {
    if (event.isComposing || event.key === "Process") return;
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
    scheduleInsertMenuUpdate();
    scheduleCodeLanguageControlsUpdate();
  };
  root.addEventListener("keydown", handleUndoRedoShortcut, true);

  const editor = await Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, editorMount);
      ctx.set(defaultValueCtx, editorMarkdown);
      ctx.update(prosePluginsCtx, (plugins) => [
        keymap({
          "Mod-z": undo,
          "Shift-Mod-z": redo,
          "Mod-y": redo,
          "Backspace": liftListItemAtParagraphStart
        }),
        pastePlainTextWhenLeavingList(),
        markdownImageAssetRemovalPlugin(onRemoveImageAsset),
        localImageSrcPlugin(resolveImageSrc),
        ...plugins
      ].filter(Boolean));
      ctx.update(listenerCtx, (listenerManager) => listenerManager
        .updated(() => {
          if (!editorReady) return;
          hasDocumentChanges = true;
          scheduleMarkdownChangeSync();
        }));
    })
    .use(portableImageRemark)
    .use(commonmark)
    .use(gfm)
    .use(portableImageSchema)
    .use(history)
    .use(listener)
    .create();

  const serializeCurrentDocument = () => editor.action((ctx) => {
    const view = ctx.get(editorViewCtx);
    const serializer = ctx.get(serializerCtx);
    const bodyMarkdown = serializer(view.state.doc);
    currentMarkdown = skillFrontmatter ? `${serializeSkillFrontmatterForEditor(skillFrontmatter)}${bodyMarkdown}` : bodyMarkdown;
    return currentMarkdown;
  });
  const baselineMarkdown = serializeCurrentDocument();
  lastNotifiedMarkdown = baselineMarkdown;

  queueMicrotask(() => {
    editorReady = true;
    setupFormatToolbar();
    setupTableToolbar();
    setupInsertMenu();
    setupImageAlignToolbar();
    setupCodeLanguageControls();
    scheduleFormatToolbarUpdate();
    scheduleTableToolbarUpdate();
    scheduleInsertMenuUpdate();
    scheduleCodeLanguageControlsUpdate();
  });

  function getEditorView() {
    return editor.action((ctx) => ctx.get(editorViewCtx));
  }

  function isEditorComposing() {
    return Boolean(getEditorView()?.composing);
  }

  function flushMarkdownChangeSync() {
    markdownChangeTimer = null;
    if (!editorReady) return;
    const view = getEditorView();
    if (view?.composing) {
      scheduleMarkdownChangeSync(180);
      return;
    }
    const value = serializeCurrentDocument();
    if (!userInteracted) {
      onEdit?.();
      userInteracted = true;
    }
    if (value !== lastNotifiedMarkdown) {
      lastNotifiedMarkdown = value;
      onChange?.(value);
    }
  }

  function scheduleMarkdownChangeSync(delay = 260) {
    if (!editorReady) return;
    if (markdownChangeTimer) clearTimeout(markdownChangeTimer);
    markdownChangeTimer = window.setTimeout(flushMarkdownChangeSync, delay);
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
      scheduleInsertMenuUpdate();
    }
    return handled;
  }

  function emptyParagraphSelection(view) {
    const selection = view?.state.selection;
    if (!view || !selection?.empty || isInTable(view.state) || selectionIsInList(selection)) return null;
    const { $from } = selection;
    if (!$from.parent?.isTextblock || $from.parent.type?.name !== "paragraph") return null;
    if ($from.parent.content?.size > 0) return null;
    if ($from.parent.textContent.trim()) return null;
    return {
      from: selection.from,
      blockStart: $from.before($from.depth),
      blockEnd: $from.after($from.depth)
    };
  }

  function activeEmptyParagraphElement(view) {
    const target = emptyParagraphSelection(view);
    if (!view || !target) return null;
    try {
      const blockDom = view.nodeDOM(target.blockStart);
      if (blockDom?.nodeType === Node.ELEMENT_NODE && blockDom.matches?.("p")) {
        return blockDom;
      }
      const domAtPos = view.domAtPos(target.from);
      const node = domAtPos.node?.nodeType === Node.ELEMENT_NODE
        ? domAtPos.node
        : domAtPos.node?.parentElement;
      return node?.closest?.("p") || null;
    } catch (_) {
      return null;
    }
  }

  function restoreInsertSelection(view) {
    if (!view || !insertMenuSelection) return false;
    const position = Math.max(1, Math.min(insertMenuSelection.from, view.state.doc.content.size));
    try {
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, position)));
      return true;
    } catch (_) {
      return false;
    }
  }

  function replaceEmptyParagraphWith(node, selectionOffset = null) {
    const view = getEditorView();
    if (!view) return false;
    restoreInsertSelection(view);
    const target = emptyParagraphSelection(view);
    if (!target) return false;
    const transaction = view.state.tr.replaceWith(target.blockStart, target.blockEnd, node);
    const requestedSelection = Number.isFinite(selectionOffset)
      ? target.blockStart + selectionOffset
      : target.blockStart + node.nodeSize;
    const selectionPos = Math.max(1, Math.min(requestedSelection, transaction.doc.content.size));
    transaction.setSelection(TextSelection.near(transaction.doc.resolve(selectionPos), Number.isFinite(selectionOffset) ? 1 : -1));
    view.dispatch(transaction.scrollIntoView());
    markUserInteracted();
    view.focus();
    hideInsertMenu();
    scheduleFormatToolbarUpdate();
    scheduleTableToolbarUpdate();
    scheduleCodeLanguageControlsUpdate();
    return true;
  }

  function runInsertHeading(level) {
    const view = getEditorView();
    if (!view) return false;
    restoreInsertSelection(view);
    const heading = view.state.schema.nodes.heading;
    if (!heading || !emptyParagraphSelection(view)) return false;
    hideInsertMenu();
    return runEditorCommand(setBlockType(heading, { level }));
  }

  function runInsertCodeBlock() {
    const view = getEditorView();
    if (!view) return false;
    restoreInsertSelection(view);
    const codeBlock = view.state.schema.nodes.code_block;
    if (!codeBlock || !emptyParagraphSelection(view)) return false;
    hideInsertMenu();
    return runEditorCommand(setBlockType(codeBlock, { language: "" }));
  }

  function runInsertBulletList() {
    const view = getEditorView();
    const nodes = view?.state.schema.nodes;
    const bulletList = nodes?.bullet_list || nodes?.bulletList;
    const listItem = nodes?.list_item || nodes?.listItem;
    const paragraph = nodes?.paragraph;
    if (!view || !bulletList || !listItem || !paragraph) return false;
    const listNode = bulletList.create(null, [
      listItem.create(null, paragraph.create())
    ]);
    return replaceEmptyParagraphWith(listNode, 3);
  }

  function runInsertOrderedList() {
    const view = getEditorView();
    const nodes = view?.state.schema.nodes;
    const orderedList = nodes?.ordered_list || nodes?.orderedList;
    const listItem = nodes?.list_item || nodes?.listItem;
    const paragraph = nodes?.paragraph;
    if (!view || !orderedList || !listItem || !paragraph) return false;
    const listNode = orderedList.create({ order: 1 }, [
      listItem.create(null, paragraph.create())
    ]);
    return replaceEmptyParagraphWith(listNode, 3);
  }

  function runInsertTable() {
    const view = getEditorView();
    const nodes = view?.state.schema.nodes;
    const table = nodes?.table;
    const tableRow = nodes?.table_row || nodes?.tableRow;
    const tableCell = nodes?.table_cell || nodes?.tableCell;
    const tableHeaderRow = nodes?.table_header_row || nodes?.tableHeaderRow;
    const tableHeader = nodes?.table_header || nodes?.tableHeader;
    if (!view || !table || !tableRow || !tableCell || !tableHeaderRow || !tableHeader) return false;
    restoreInsertSelection(view);
    const target = emptyParagraphSelection(view);
    if (!target) return false;
    const createCell = (cellType) => cellType.createAndFill?.() || cellType.create();
    const createCells = (cellType) => [0, 1, 2].map(() => createCell(cellType));
    const tableNode = table.create(null, [
      tableHeaderRow.create(null, createCells(tableHeader)),
      tableRow.create(null, createCells(tableCell)),
      tableRow.create(null, createCells(tableCell))
    ]);
    const transaction = view.state.tr.replaceWith(target.blockStart, target.blockEnd, tableNode);
    const selection = Selection.findFrom(transaction.doc.resolve(target.blockStart), 1, true);
    if (selection) {
      transaction.setSelection(selection);
    }
    view.dispatch(transaction.scrollIntoView());
    markUserInteracted();
    view.focus();
    hideInsertMenu();
    scheduleFormatToolbarUpdate();
    scheduleTableToolbarUpdate();
    scheduleCodeLanguageControlsUpdate();
    return true;
  }

  function imageAltFromFileName(fileName = "") {
    const baseName = String(fileName || "").split(/[\\/]/).pop() || "image";
    return baseName.replace(/\.[^.]+$/, "") || "image";
  }

  function runInsertImage(relativePath, fileName = "") {
    const view = getEditorView();
    const image = view?.state.schema.nodes.image;
    const paragraph = view?.state.schema.nodes.paragraph;
    if (!view || !image || !paragraph || !relativePath) return false;
    const imageNode = image.create({
      src: relativePath,
      alt: imageAltFromFileName(fileName || relativePath),
      title: ""
    });
    return replaceEmptyParagraphWith(paragraph.create(null, [imageNode]));
  }

  async function runInsertImageAsset() {
    if (typeof onInsertImageAsset !== "function") return false;
    const view = getEditorView();
    if (!view || !emptyParagraphSelection(view)) return false;
    insertMenuSelection = { from: view.state.selection.from };
    closeInsertMenu({ preserveSelection: true });
    let asset = null;
    try {
      asset = await onInsertImageAsset();
    } catch (error) {
      console.warn("Markdown image insert failed", error);
    }
    if (!asset?.relativePath) {
      insertMenuSelection = null;
      scheduleInsertMenuUpdate();
      return false;
    }
    return runInsertImage(asset.relativePath, asset.fileName);
  }

  function runInsertCommand(command) {
    if (command === "image") {
      runInsertImageAsset();
      return true;
    }
    if (command === "h1") return runInsertHeading(1);
    if (command === "h2") return runInsertHeading(2);
    if (command === "h3") return runInsertHeading(3);
    if (command === "h4") return runInsertHeading(4);
    if (command === "bullet-list") return runInsertBulletList();
    if (command === "ordered-list") return runInsertOrderedList();
    if (command === "table") return runInsertTable();
    if (command === "code-block") return runInsertCodeBlock();
    return false;
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
    ["keyup", "mouseup", "focusin", "pointerup"].forEach((eventName) => {
      root.addEventListener(eventName, scheduleCodeLanguageControlsUpdate, true);
    });
    window.addEventListener("scroll", scheduleCodeLanguageControlsUpdate, true);
    window.addEventListener("resize", scheduleCodeLanguageControlsUpdate);
  }

  function updateCodeLanguageControls() {
    codeLanguageFrame = null;
    if (!codeLanguageLayer || !editorReady) return;
    if (isEditorComposing()) return;
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

  function createInsertMenu() {
    const menu = document.createElement("div");
    menu.className = "markdown-insert-menu";
    menu.setAttribute("aria-label", t("markdown.insertMenu"));
    const items = [
      { command: "image", icon: INSERT_ICON_SVG.image, label: t("markdown.insertImage") },
      { command: "h1", icon: INSERT_ICON_SVG.h1, label: t("markdown.insertHeading1") },
      { command: "h2", icon: INSERT_ICON_SVG.h2, label: t("markdown.insertHeading2") },
      { command: "h3", icon: INSERT_ICON_SVG.h3, label: t("markdown.insertHeading3") },
      { command: "h4", icon: INSERT_ICON_SVG.h4, label: t("markdown.insertHeading4") },
      { command: "bullet-list", icon: INSERT_ICON_SVG.list, label: t("markdown.insertBulletList") },
      { command: "ordered-list", icon: INSERT_ICON_SVG.orderedList, label: t("markdown.insertOrderedList") },
      { command: "table", icon: INSERT_ICON_SVG.table, label: t("markdown.insertTable") },
      { command: "code-block", icon: INSERT_ICON_SVG.code, label: t("markdown.insertCodeBlock") }
    ];
    menu.innerHTML = `
      <button class="markdown-insert-trigger" type="button" aria-label="${t("markdown.openInsertMenu")}">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4.5v11M4.5 10h11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
      </button>
      <div class="markdown-insert-popover" role="menu" aria-hidden="true">
        ${items.map((item) => `
          <button type="button" role="menuitem" data-insert-command="${item.command}" aria-label="${item.label}">
            ${item.icon}
            <span class="markdown-insert-tooltip">${item.label}</span>
          </button>
        `).join("")}
      </div>
    `;
    menu.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    menu.querySelector(".markdown-insert-trigger")?.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const view = getEditorView();
      if (!view || !emptyParagraphSelection(view)) return;
      insertMenuSelection = { from: view.state.selection.from };
      insertMenuOpen = !insertMenuOpen;
      menu.classList.toggle("open", insertMenuOpen);
      menu.querySelector(".markdown-insert-popover")?.setAttribute("aria-hidden", insertMenuOpen ? "false" : "true");
      scheduleInsertMenuUpdate();
    });
    menu.addEventListener("pointerdown", (event) => {
      const button = event.target.closest("button[data-insert-command]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      runInsertCommand(button.dataset.insertCommand);
    });
    return menu;
  }

  function setupInsertMenu() {
    if (insertMenu) return;
    insertMenu = createInsertMenu();
    root.appendChild(insertMenu);
    ["keyup", "mouseup", "focusin", "pointerup"].forEach((eventName) => {
      root.addEventListener(eventName, scheduleInsertMenuUpdate, true);
    });
    root.addEventListener("keydown", scheduleInsertMenuUpdateAfterEnter, true);
    root.addEventListener("pointerdown", closeInsertMenuOnEditorPointerDown, true);
    window.addEventListener("scroll", scheduleInsertMenuUpdate, true);
    window.addEventListener("resize", scheduleInsertMenuUpdate);
    root.addEventListener("focusout", scheduleInsertMenuHideAfterBlur, true);
  }

  function scheduleInsertMenuUpdateAfterEnter(event) {
    if (event.key !== "Enter" || event.isComposing) return;
    window.setTimeout(scheduleInsertMenuUpdate, 0);
    window.setTimeout(scheduleInsertMenuUpdate, 80);
  }

  function closeInsertMenuOnEditorPointerDown(event) {
    if (!insertMenuOpen || insertMenu?.contains(event.target)) return;
    closeInsertMenu();
  }

  function closeInsertMenu({ preserveSelection = false } = {}) {
    insertMenuOpen = false;
    if (!preserveSelection) {
      insertMenuSelection = null;
    }
    insertMenu?.classList.remove("open");
    insertMenu?.querySelector(".markdown-insert-popover")?.setAttribute("aria-hidden", "true");
  }

  function hideInsertMenu() {
    if (!insertMenu) return;
    closeInsertMenu();
    insertMenu.classList.remove("visible");
    insertMenuVisible = false;
  }

  function scheduleInsertMenuHideAfterBlur() {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (!root.contains(active) && !insertMenu?.contains(active)) {
        hideInsertMenu();
      }
    }, 0);
  }

  function updateInsertMenu() {
    insertMenuFrame = null;
    if (!insertMenu || !editorReady) return;
    if (isEditorComposing()) return;
    const view = getEditorView();
    const target = emptyParagraphSelection(view);
    if (!view || !target || !root.contains(view.dom)) {
      hideInsertMenu();
      return;
    }

    let cursorRect = null;
    try {
      cursorRect = view.coordsAtPos(view.state.selection.from);
    } catch (_) {
      hideInsertMenu();
      return;
    }
    const rootRect = root.getBoundingClientRect();
    const paragraphRect = activeEmptyParagraphElement(view)?.getBoundingClientRect();
    const anchorLeft = paragraphRect?.left ?? cursorRect.left;
    const left = anchorLeft - rootRect.left - 34;
    const top = Math.max(4, cursorRect.top - rootRect.top + ((cursorRect.bottom - cursorRect.top) / 2) - 13);
    insertMenu.style.left = `${Math.round(left)}px`;
    insertMenu.style.top = `${Math.round(top)}px`;
    if (!insertMenuVisible) {
      insertMenu.classList.add("visible");
      insertMenuVisible = true;
    }
  }

  function scheduleInsertMenuUpdate() {
    if (!insertMenu) return;
    if (insertMenuFrame) cancelAnimationFrame(insertMenuFrame);
    insertMenuFrame = requestAnimationFrame(updateInsertMenu);
  }

  function findImageTargetFromElement(imageElement, view = getEditorView()) {
    if (!imageElement || !view) return null;
    let target = null;
    view.state.doc.descendants((node, pos) => {
      if (target || !["image", PORTABLE_IMAGE_NODE_NAME].includes(node.type?.name)) return !target;
      const dom = view.nodeDOM(pos);
      if (dom === imageElement || dom?.contains?.(imageElement)) {
        const $pos = view.state.doc.resolve(pos);
        const isPortable = node.type?.name === PORTABLE_IMAGE_NODE_NAME;
        const isStandalone = isPortable || ($pos.parent?.type?.name === "paragraph" && $pos.parent.childCount === 1);
        target = { element: imageElement, node, pos, isPortable, isStandalone };
        return false;
      }
      return true;
    });
    return target;
  }

  function portableAttrsFromTarget(target, overrides = {}) {
    const node = target?.node;
    if (!node) return null;
    if (node.type?.name === PORTABLE_IMAGE_NODE_NAME) {
      return {
        ...node.attrs,
        ...overrides,
        sourceSyntax: "github-html",
        presentationDirty: true
      };
    }
    return {
      src: node.attrs?.src || "",
      alt: node.attrs?.alt || "",
      title: cleanImageTitleTokens(node.attrs?.title || ""),
      alignment: imageAlignmentFromTitle(node.attrs?.title || ""),
      displayWidthPx: null,
      linkHref: "",
      linkTitle: "",
      sourceSyntax: "github-html",
      rawSource: "",
      presentationDirty: true,
      ...overrides
    };
  }

  function replaceImageTargetWithPortable(view, target, attrs) {
    if (!view || !target || !attrs) return false;
    const portableType = view.state.schema.nodes[PORTABLE_IMAGE_NODE_NAME];
    if (!portableType) return false;
    let transaction = view.state.tr;
    if (target.node.type?.name === PORTABLE_IMAGE_NODE_NAME) {
      transaction = transaction.setNodeMarkup(target.pos, portableType, attrs);
    } else {
      if (!target.isStandalone) return false;
      const $pos = view.state.doc.resolve(target.pos);
      const paragraph = $pos.parent;
      const paragraphPos = $pos.before($pos.depth);
      transaction = transaction.replaceWith(paragraphPos, paragraphPos + paragraph.nodeSize, portableType.create(attrs));
    }
    view.dispatch(transaction.scrollIntoView());
    markUserInteracted();
    hideImageAlignToolbar();
    view.focus();
    return true;
  }

  function imageNaturalWidth(image) {
    const current = Number(image?.naturalWidth || 0);
    if (current > 0) return Promise.resolve(current);
    if (!image) return Promise.reject(new Error("IMAGE_NOT_AVAILABLE"));
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (value, error = null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        image.removeEventListener("load", handleLoad);
        image.removeEventListener("error", handleError);
        if (error) reject(error);
        else resolve(value);
      };
      const handleLoad = () => {
        const width = Number(image.naturalWidth || 0);
        if (width > 0) finish(width);
        else finish(0, new Error("IMAGE_DIMENSIONS_UNAVAILABLE"));
      };
      const handleError = () => finish(0, new Error("IMAGE_LOAD_FAILED"));
      const timer = window.setTimeout(() => finish(0, new Error("IMAGE_DIMENSIONS_TIMEOUT")), 4000);
      image.addEventListener("load", handleLoad, { once: true });
      image.addEventListener("error", handleError, { once: true });
      if (image.complete) handleLoad();
    });
  }

  async function displayWidthForPreset(target, size) {
    if (size === "large") return null;
    const limit = PORTABLE_IMAGE_WIDTH_LIMITS[size];
    if (!limit) return null;
    const naturalWidth = await imageNaturalWidth(target?.element);
    return Math.min(limit, naturalWidth);
  }

  function reportImageSizeError(error) {
    if (typeof onImageSizeError === "function") {
      onImageSizeError(error);
    }
  }

  async function setImageAlignment(alignment) {
    const view = getEditorView();
    if (!view || !activeImageTarget) return false;
    let target = { ...activeImageTarget, node: view.state.doc.nodeAt(activeImageTarget.pos) };
    if (!target.node || !target.isStandalone) return false;
    let displayWidthPx = target.node.type?.name === PORTABLE_IMAGE_NODE_NAME
      ? target.node.attrs?.displayWidthPx ?? null
      : null;
    if (target.node.type?.name === "image") {
      const legacySize = imageSizeFromTitle(target.node.attrs?.title || "");
      if (legacySize !== "large") {
        try {
          displayWidthPx = await displayWidthForPreset(target, legacySize);
        } catch (error) {
          reportImageSizeError(error);
          return false;
        }
        const refreshed = findImageTargetFromElement(target.element, view);
        if (!refreshed || refreshed.node.attrs?.src !== target.node.attrs?.src) return false;
        target = refreshed;
      }
    }
    return replaceImageTargetWithPortable(view, target, portableAttrsFromTarget(target, { alignment, displayWidthPx }));
  }

  async function setImageSize(size) {
    const view = getEditorView();
    if (!view || !activeImageTarget) return false;
    let target = { ...activeImageTarget, node: view.state.doc.nodeAt(activeImageTarget.pos) };
    if (!target.node || !target.isStandalone) return false;
    try {
      const displayWidthPx = await displayWidthForPreset(target, size);
      const refreshed = findImageTargetFromElement(target.element, view);
      if (!refreshed || refreshed.node.attrs?.src !== target.node.attrs?.src) return false;
      target = refreshed;
      return replaceImageTargetWithPortable(view, target, portableAttrsFromTarget(target, { displayWidthPx }));
    } catch (error) {
      reportImageSizeError(error);
      return false;
    }
  }

  function createImageAlignToolbar() {
    const toolbar = document.createElement("div");
    toolbar.className = "markdown-image-align-toolbar";
    toolbar.setAttribute("aria-label", t("markdown.imageAlignTools"));
    const items = [
      { type: "align", value: "left", icon: IMAGE_ALIGN_ICON_SVG.left, label: t("markdown.alignLeft") },
      { type: "align", value: "center", icon: IMAGE_ALIGN_ICON_SVG.center, label: t("markdown.alignCenter") },
      { type: "align", value: "right", icon: IMAGE_ALIGN_ICON_SVG.right, label: t("markdown.alignRight") },
      { type: "size", value: "small", icon: IMAGE_SIZE_ICON_SVG.small, label: t("markdown.imageSizeSmall") },
      { type: "size", value: "medium", icon: IMAGE_SIZE_ICON_SVG.medium, label: t("markdown.imageSizeMedium") },
      { type: "size", value: "large", icon: IMAGE_SIZE_ICON_SVG.large, label: t("markdown.imageSizeLarge") }
    ];
    toolbar.innerHTML = items.map((item) => `
      <button type="button" data-image-${item.type}="${item.value}" aria-label="${item.label}">
        ${item.icon}
        <span class="markdown-image-align-tooltip">${item.label}</span>
      </button>
    `).join("");
    toolbar.addEventListener("pointerdown", (event) => {
      const button = event.target.closest("button[data-image-align], button[data-image-size]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      if (button.dataset.imageAlign) {
        setImageAlignment(button.dataset.imageAlign).catch(reportImageSizeError);
      } else {
        setImageSize(button.dataset.imageSize || "large").catch(reportImageSizeError);
      }
    });
    toolbar.addEventListener("pointerenter", () => {
      scheduleImageAlignToolbarUpdate();
    });
    toolbar.addEventListener("pointerleave", () => {
      window.setTimeout(() => {
        if (!imageAlignToolbar?.matches(":hover") && !activeImageTarget?.element?.matches?.(":hover")) {
          hideImageAlignToolbar();
        }
      }, 120);
    });
    return toolbar;
  }

  function setupImageAlignToolbar() {
    if (imageAlignToolbar) return;
    imageAlignToolbar = createImageAlignToolbar();
    root.appendChild(imageAlignToolbar);
    root.addEventListener("pointerover", handleImageAlignPointerOver, true);
    root.addEventListener("pointerout", handleImageAlignPointerOut, true);
    window.addEventListener("scroll", scheduleImageAlignToolbarUpdate, true);
    window.addEventListener("resize", scheduleImageAlignToolbarUpdate);
  }

  function handleImageAlignPointerOver(event) {
    const image = event.target?.closest?.(".milkdown-editor-root .ProseMirror img");
    if (!image || !root.contains(image)) return;
    const target = findImageTargetFromElement(image);
    if (!target) return;
    activeImageTarget = target;
    scheduleImageAlignToolbarUpdate();
  }

  function handleImageAlignPointerOut(event) {
    if (!activeImageTarget?.element) return;
    const next = event.relatedTarget;
    if (next && (activeImageTarget.element.contains(next) || imageAlignToolbar?.contains(next))) return;
    window.setTimeout(() => {
      if (!imageAlignToolbar?.matches(":hover") && !activeImageTarget?.element?.matches?.(":hover")) {
        hideImageAlignToolbar();
      }
    }, 120);
  }

  function hideImageAlignToolbar() {
    if (!imageAlignToolbar) return;
    imageAlignToolbar.classList.remove("visible");
    activeImageTarget = null;
  }

  function updateImageAlignToolbar() {
    imageAlignFrame = null;
    if (!imageAlignToolbar || !activeImageTarget?.element || !root.contains(activeImageTarget.element)) {
      hideImageAlignToolbar();
      return;
    }
    const view = getEditorView();
    const refreshedTarget = findImageTargetFromElement(activeImageTarget.element, view);
    if (!refreshedTarget) {
      hideImageAlignToolbar();
      return;
    }
    activeImageTarget = refreshedTarget;
    const title = activeImageTarget.node.attrs?.title || "";
    const isPortable = activeImageTarget.node.type?.name === PORTABLE_IMAGE_NODE_NAME;
    const alignment = isPortable ? activeImageTarget.node.attrs?.alignment || "" : imageAlignmentFromTitle(title);
    const size = isPortable
      ? (activeImageTarget.node.attrs?.displayWidthPx == null ? "large" : "custom")
      : imageSizeFromTitle(title);
    const supportsBlockPresentation = activeImageTarget.isStandalone;
    imageAlignToolbar.querySelectorAll("button[data-image-align], button[data-image-size]").forEach((button) => {
      button.disabled = !supportsBlockPresentation;
      const tooltip = button.querySelector(".markdown-image-align-tooltip");
      if (tooltip) {
        tooltip.textContent = supportsBlockPresentation
          ? button.getAttribute("aria-label") || ""
          : t("markdown.imageBlockOnly");
      }
    });
    imageAlignToolbar.querySelectorAll("button[data-image-align]").forEach((button) => {
      button.classList.toggle("active", button.dataset.imageAlign === alignment);
    });
    imageAlignToolbar.querySelectorAll("button[data-image-size]").forEach((button) => {
      button.classList.toggle("active", button.dataset.imageSize === size);
    });
    const rootRect = root.getBoundingClientRect();
    const imageRect = activeImageTarget.element.getBoundingClientRect();
    const toolbarWidth = imageAlignToolbar.offsetWidth || 108;
    const left = Math.max(8, Math.min(imageRect.left - rootRect.left + (imageRect.width / 2) - (toolbarWidth / 2), rootRect.width - toolbarWidth - 8));
    const top = Math.max(4, imageRect.top - rootRect.top + 8);
    imageAlignToolbar.style.left = `${Math.round(left)}px`;
    imageAlignToolbar.style.top = `${Math.round(top)}px`;
    imageAlignToolbar.classList.add("visible");
  }

  function scheduleImageAlignToolbarUpdate() {
    if (!imageAlignToolbar) return;
    if (imageAlignFrame) cancelAnimationFrame(imageAlignFrame);
    imageAlignFrame = requestAnimationFrame(updateImageAlignToolbar);
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
    if (isEditorComposing()) return;
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
    if (isEditorComposing()) return;
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
        scheduleInsertMenuUpdate();
        scheduleCodeLanguageControlsUpdate();
      }
      return handled;
    });
  }

  const api = {
    editor,
    getMarkdown() {
      if (markdownChangeTimer) {
        clearTimeout(markdownChangeTimer);
        markdownChangeTimer = null;
      }
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
      if (markdownChangeTimer) {
        clearTimeout(markdownChangeTimer);
        markdownChangeTimer = null;
      }
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
        ["keyup", "mouseup", "focusin", "pointerup"].forEach((eventName) => {
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
      if (insertMenuFrame) {
        cancelAnimationFrame(insertMenuFrame);
        insertMenuFrame = null;
      }
      if (insertMenu) {
        ["keyup", "mouseup", "focusin", "pointerup"].forEach((eventName) => {
          root.removeEventListener(eventName, scheduleInsertMenuUpdate, true);
        });
        root.removeEventListener("keydown", scheduleInsertMenuUpdateAfterEnter, true);
        root.removeEventListener("pointerdown", closeInsertMenuOnEditorPointerDown, true);
        window.removeEventListener("scroll", scheduleInsertMenuUpdate, true);
        window.removeEventListener("resize", scheduleInsertMenuUpdate);
        root.removeEventListener("focusout", scheduleInsertMenuHideAfterBlur, true);
        insertMenu.remove();
        insertMenu = null;
      }
      if (imageAlignFrame) {
        cancelAnimationFrame(imageAlignFrame);
        imageAlignFrame = null;
      }
      if (imageAlignToolbar) {
        root.removeEventListener("pointerover", handleImageAlignPointerOver, true);
        root.removeEventListener("pointerout", handleImageAlignPointerOut, true);
        window.removeEventListener("scroll", scheduleImageAlignToolbarUpdate, true);
        window.removeEventListener("resize", scheduleImageAlignToolbarUpdate);
        imageAlignToolbar.remove();
        imageAlignToolbar = null;
        activeImageTarget = null;
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
