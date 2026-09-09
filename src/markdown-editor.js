import { Editor, defaultValueCtx, editorViewCtx, editorViewOptionsCtx, prosePluginsCtx, rootCtx, serializerCtx } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { closeHistory, redo, undo } from "@milkdown/kit/prose/history";
import { keymap } from "@milkdown/kit/prose/keymap";
import { liftListItem } from "@milkdown/kit/prose/schema-list";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { Plugin, Selection, TextSelection } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";
import { $nodeSchema, $remark } from "@milkdown/kit/utils";
import { setBlockType, toggleMark } from "prosemirror-commands";
import { fromMarkdown } from "mdast-util-from-markdown";
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
import {
  parseDocumentTitle,
  setDocumentTitleInSource
} from "./markdown-document-title.js";
import { findDocumentMatches, replacementPlan } from "./markdown-find-engine.js";

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

function isSkillMarkdownFileName(fileName = "") {
  const baseName = String(fileName || "").split(/[\\/]/).pop() || "";
  return baseName.toLowerCase() === "skill.md";
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
  code: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.4 6.6-3.2 3.4 3.2 3.4M12.6 6.6l3.2 3.4-3.2 3.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  cover: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 5.2h11a1.3 1.3 0 0 1 1.3 1.3v8a1.3 1.3 0 0 1-1.3 1.3h-11a1.3 1.3 0 0 1-1.3-1.3v-8a1.3 1.3 0 0 1 1.3-1.3Z" fill="none" stroke="currentColor" stroke-width="1.45"/><path d="M4.3 13.4 7 10.7l2.2 2 2.9-3.4 3.6 4.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.4 7.6h3.4M14.1 5.9v3.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`
};

const IMAGE_ALIGN_ICON_SVG = {
  left: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M4 8h8.5M4 11.5h12M4 15h8.5" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>`,
  center: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M6.2 8h7.6M4 11.5h12M6.2 15h7.6" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>`,
  right: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4.5h12M7.5 8H16M4 11.5h12M7.5 15H16" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/></svg>`,
  coverSet: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 5.2h11a1.3 1.3 0 0 1 1.3 1.3v8a1.3 1.3 0 0 1-1.3 1.3h-11a1.3 1.3 0 0 1-1.3-1.3v-8a1.3 1.3 0 0 1 1.3-1.3Z" fill="none" stroke="currentColor" stroke-width="1.45"/><path d="M4.3 13.4 7 10.7l2.2 2 2.9-3.4 3.6 4.1" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.4 7.6h3.4M14.1 5.9v3.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
  coverRemove: `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4.5 5.2h11a1.3 1.3 0 0 1 1.3 1.3v8a1.3 1.3 0 0 1-1.3 1.3h-11a1.3 1.3 0 0 1-1.3-1.3v-8a1.3 1.3 0 0 1 1.3-1.3Z" fill="none" stroke="currentColor" stroke-width="1.45"/><path d="m7 9.3 6 6M13 9.3l-6 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
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
const MARKDOWN_COVER_MARKER = "<!-- nutbook-cover -->";
const MARKDOWN_COVER_IMAGE_NODE_NAME = "markdown_cover_image";
const ALIGNED_TEXT_NODE_NAME = "aligned_text_block";
const TEXT_ALIGNMENTS = Object.freeze(["center", "right"]);

/**
 * 在 ProseMirror 文档中定位第一个有效顶层 H1（B3 权威标题契约）。
 *
 * - 只接受 doc 直接子节点的 heading level 1，或 `aligned_text_block` 内部的
 *   heading level 1；blockquote / list 等嵌套块内的 H1 不是文档标题。
 * - 空 H1（textContent 为空）跳过，继续找下一个。
 * - 多 H1 只返回第一个有效标题。
 *
 * @returns {{ pos: number, node: import("prosemirror-model").Node }|null}
 */
function findFirstEffectiveHeading(doc, schema) {
  const headingType = schema.nodes.heading;
  if (!headingType) {
    return null;
  }
  let found = null;
  doc.descendants((node, pos, parent) => {
    if (found) {
      return false;
    }
    if (parent === doc) {
      if (node.type === headingType && node.attrs.level === 1 && node.textContent.trim()) {
        found = { pos, node };
        return false;
      }
      // 只深入 aligned_text_block 检查内部 heading；其他嵌套容器（blockquote、
      // list）内部的 H1 不参与标题判定。
      return node.type.name === ALIGNED_TEXT_NODE_NAME;
    }
    if (
      parent.type.name === ALIGNED_TEXT_NODE_NAME &&
      node.type === headingType &&
      node.attrs.level === 1 &&
      node.textContent.trim()
    ) {
      found = { pos, node };
    }
    return false;
  });
  return found;
}

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

function parseAlignedTextOpenTag(rawSource = "") {
  const raw = String(rawSource || "").trim();
  if (!raw || typeof DOMParser !== "function" || !/^<div(?:\s|>)/i.test(raw)) return null;
  const documentNode = new DOMParser().parseFromString(`<!doctype html><body>${raw}</div></body>`, "text/html");
  const roots = meaningfulHtmlChildren(documentNode.body);
  if (roots.length !== 1 || roots[0].nodeType !== Node.ELEMENT_NODE) return null;
  const element = roots[0];
  if (element.tagName !== "DIV" || meaningfulHtmlChildren(element).length > 0) return null;
  const attributeNames = element.getAttributeNames();
  if (attributeNames.length !== 1 || attributeNames[0].toLowerCase() !== "align") return null;
  const alignment = String(element.getAttribute("align") || "").toLowerCase();
  return TEXT_ALIGNMENTS.includes(alignment) ? alignment : null;
}

function isAlignedTextCloseTag(rawSource = "") {
  return /^<\/div\s*>$/i.test(String(rawSource || "").trim());
}

function markdownNodeContainsUnsupportedAlignedContent(node) {
  if (!node || typeof node !== "object") return false;
  if (["html", "image", "portableImage", "alignedTextBlock"].includes(node.type)) return true;
  return Array.isArray(node.children) && node.children.some(markdownNodeContainsUnsupportedAlignedContent);
}

function convertAlignedTextBlocks(tree) {
  if (!Array.isArray(tree?.children)) return;
  const children = tree.children;
  for (let index = 0; index <= children.length - 3; index += 1) {
    const opening = children[index];
    const content = children[index + 1];
    const closing = children[index + 2];
    if (opening?.type !== "html" || closing?.type !== "html") continue;
    if (!content || !["paragraph", "heading"].includes(content.type)) continue;
    const alignment = parseAlignedTextOpenTag(opening.value);
    if (!alignment || !isAlignedTextCloseTag(closing.value)) continue;
    if (markdownNodeContainsUnsupportedAlignedContent(content)) continue;
    children.splice(index, 3, {
      type: "alignedTextBlock",
      alignment,
      sourceSyntax: "github-div-align",
      children: [content]
    });
  }
}

const alignedTextRemark = $remark("alignedTextRemark", () => () => (tree) => {
  convertAlignedTextBlocks(tree);
});

const alignedTextSchema = $nodeSchema(ALIGNED_TEXT_NODE_NAME, () => ({
  group: "block",
  content: "paragraph | heading",
  defining: true,
  attrs: {
    alignment: { default: "center", validate: "string" },
    sourceSyntax: { default: "github-div-align", validate: "string" }
  },
  parseDOM: [{
    tag: 'div[data-type="aligned-text-block"]',
    getAttrs: (element) => {
      const alignment = String(element.dataset.nutbookTextAlignment || "").toLowerCase();
      return TEXT_ALIGNMENTS.includes(alignment)
        ? { alignment, sourceSyntax: "github-div-align" }
        : false;
    }
  }],
  toDOM: (node) => {
    const alignment = TEXT_ALIGNMENTS.includes(node.attrs.alignment) ? node.attrs.alignment : "center";
    return ["div", {
      class: `nutbook-aligned-text-block nutbook-text-align-${alignment}`,
      "data-type": "aligned-text-block",
      "data-nutbook-text-alignment": alignment
    }, 0];
  },
  parseMarkdown: {
    match: (node) => node.type === "alignedTextBlock",
    runner: (state, node, type) => {
      state
        .openNode(type, {
          alignment: node.alignment,
          sourceSyntax: "github-div-align"
        })
        .next(node.children)
        .closeNode();
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === ALIGNED_TEXT_NODE_NAME,
    runner: (state, node) => {
      const alignment = String(node.attrs.alignment || "").toLowerCase();
      if (!TEXT_ALIGNMENTS.includes(alignment) || node.childCount !== 1) {
        throw new Error("Invalid aligned text block");
      }
      state
        .addNode("html", undefined, `<div align="${alignment}">`)
        .next(node.content)
        .addNode("html", undefined, "</div>");
    }
  }
}));

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

// ---------------------------------------------------------------------------
// PR C / Task C1：canonical `<!-- nutbook-cover -->` 封面身份
//
// 只识别正文顶层精确 marker + 紧随其后的独立图片块（普通 Markdown image /
// 链接包裹的单图片 / portable GitHub HTML 图片）。封面只是图片身份，不改变
// 图片在正文中的位置、语法或排版；serializer 未修改排版时回放 raw source。
// ---------------------------------------------------------------------------

function isCoverMarkerHtml(node) {
  return node?.type === "html" && String(node?.value || "").trim() === MARKDOWN_COVER_MARKER;
}

function sliceRawSource(raw, node) {
  const start = node?.position?.start?.offset;
  const end = node?.position?.end?.offset;
  if (raw && Number.isInteger(start) && Number.isInteger(end) && end > start && end <= raw.length) {
    return raw.slice(start, end);
  }
  return null;
}

// 判定 mdast 节点是否为「独立图片块」，返回结构化封面身份字段（含 raw source）。
function coverImageBlockFromMdast(node, raw) {
  if (!node || typeof node !== "object") return null;
  if (node.type === "portableImage") {
    return {
      nodeKind: "portable-image",
      src: node.src || "",
      alt: node.alt || "",
      title: node.title || "",
      alignment: node.alignment || "",
      displayWidthPx: node.displayWidthPx ?? null,
      linkHref: node.linkHref || "",
      linkTitle: node.linkTitle || "",
      rawSource: sliceRawSource(raw, node) || node.rawSource || ""
    };
  }
  if (node.type !== "paragraph") return null;
  if (!Array.isArray(node.children) || node.children.length !== 1) return null;
  const child = node.children[0];
  if (child?.type === "image") {
    return {
      nodeKind: "image",
      src: child.url || "",
      alt: child.alt || "",
      title: child.title || "",
      alignment: imageAlignmentFromTitle(child.title || ""),
      displayWidthPx: null,
      linkHref: "",
      linkTitle: "",
      rawSource: sliceRawSource(raw, node) || ""
    };
  }
  if (
    child?.type === "link"
    && Array.isArray(child.children)
    && child.children.length === 1
    && child.children[0]?.type === "image"
  ) {
    const image = child.children[0];
    return {
      nodeKind: "linked-image",
      src: image.url || "",
      alt: image.alt || "",
      title: image.title || "",
      alignment: imageAlignmentFromTitle(image.title || ""),
      displayWidthPx: null,
      linkHref: child.url || "",
      linkTitle: child.title || "",
      rawSource: sliceRawSource(raw, node) || ""
    };
  }
  return null;
}

// 收集「顶层 marker + 紧随独立图片块」候选（remark 与 preflight 共用同一语义）。
function collectCoverCandidates(tree, raw) {
  const children = tree?.children;
  if (!Array.isArray(children)) return [];
  const candidates = [];
  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (!isCoverMarkerHtml(node)) continue;
    const block = coverImageBlockFromMdast(children[index + 1], raw);
    if (!block) continue;
    candidates.push({ markerIndex: index, blockIndex: index + 1, block });
  }
  return candidates;
}

// 合并顶层 marker + 紧随独立图片块为 `markdownCoverImage`；多个有效 marker
// 不合并（保持原样、可编辑修复）并返回 duplicate 诊断；stray marker 不跨正文。
function transformCoverImageBlocks(tree, raw) {
  const diagnostics = [];
  if (!Array.isArray(tree?.children)) return diagnostics;
  const candidates = collectCoverCandidates(tree, raw);
  if (candidates.length > 1) {
    diagnostics.push({ kind: "duplicate", count: candidates.length });
    return diagnostics;
  }
  if (candidates.length !== 1) return diagnostics;
  const { markerIndex, blockIndex, block } = candidates[0];
  tree.children.splice(markerIndex, 2, {
    type: "markdownCoverImage",
    ...block,
    markerRaw: MARKDOWN_COVER_MARKER,
    presentationDirty: false
  });
  return diagnostics;
}

// 编辑器创建前的 duplicate 预检（AST 语义，与 remark 同一候选收集逻辑）。
// 命中时 createMilkdownEditor 抛错，宿主现有 catch 进入源码 fallback 人工修复。
function preflightCoverMarkers(markdown) {
  const tree = fromMarkdown(String(markdown || ""));
  // 与 remark 管线同一转换：portable GitHub HTML 必须先转成 portableImage 节点，
  // 否则两份 portable cover 的 html 节点不会被 coverImageBlockFromMdast 识别。
  visitPortableImageHtml(tree);
  const count = collectCoverCandidates(tree, null).length;
  return { count, duplicate: count > 1 };
}

function escapeCoverAlt(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\]/g, "\\]")
    .replace(/\n/g, " ");
}

function serializeCoverTitle(value) {
  return `"${String(value || "").replace(/"/g, '\\"')}"`;
}

// CommonMark link destination 编码：裸 destination 不允许 ASCII 空格，
// 含空白/尖括号的路径必须用 `<...>` 包裹（内部 `<` `>` 转义），裸形式
// 中的括号转义以保证重解析得到同一 src。此编码是结构化重建（raw source
// 不可用或排版被修改）时的保底路径。
function serializeCoverDestination(value) {
  const raw = String(value || "");
  if (!raw) return raw;
  if (/[\s<>]/.test(raw)) {
    return `<${raw.replace(/</g, "\\<").replace(/>/g, "\\>").replace(/\n/g, " ")}>`;
  }
  return raw.replace(/[()]/g, (match) => `\\${match}`);
}

// 结构化重建图片块语法（仅当 raw source 不可用或排版被修改时使用）。
// plain/linked 图片的对齐 token（nutbook-align=…）写入 title，与普通图片的
// alignment 语义一致，保证「+ → 封面图」新图默认居中在保存后仍保持。
function serializeCoverImageBody(attrs = {}) {
  if (attrs.nodeKind === "portable-image") return serializePortableImageHtml(attrs);
  const alignmentToken = ["left", "center", "right"].includes(attrs.alignment)
    ? `nutbook-align=${attrs.alignment}`
    : "";
  const titleParts = [attrs.title, alignmentToken].filter(Boolean);
  const title = titleParts.length ? ` ${serializeCoverTitle(titleParts.join(" "))}` : "";
  const image = `![${escapeCoverAlt(attrs.alt)}](${serializeCoverDestination(attrs.src)}${title})`;
  if (attrs.nodeKind === "linked-image") {
    const linkTitle = attrs.linkTitle ? ` ${serializeCoverTitle(attrs.linkTitle)}` : "";
    return `[${image}](${serializeCoverDestination(attrs.linkHref)}${linkTitle})`;
  }
  return image;
}

const markdownCoverImageSchema = $nodeSchema(MARKDOWN_COVER_IMAGE_NODE_NAME, () => ({
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  defining: true,
  isolating: true,
  attrs: {
    nodeKind: { default: "image", validate: "string" },
    src: { default: "", validate: "string" },
    alt: { default: "", validate: "string" },
    title: { default: "", validate: "string" },
    alignment: { default: "", validate: "string" },
    displayWidthPx: { default: null, validate: "number|null" },
    linkHref: { default: "", validate: "string" },
    linkTitle: { default: "", validate: "string" },
    rawSource: { default: "", validate: "string" },
    markerRaw: { default: MARKDOWN_COVER_MARKER, validate: "string" },
    presentationDirty: { default: false, validate: "boolean" }
  },
  parseDOM: [{
    tag: 'div[data-type="markdown-cover-image"]',
    getAttrs: (element) => {
      const image = element.querySelector("img[src]");
      const anchor = image?.closest("a[href]");
      return {
        nodeKind: element.dataset.nutbookNodeKind || "image",
        src: image?.dataset.nutbookOriginalSrc || image?.getAttribute("src") || "",
        alt: image?.getAttribute("alt") || "",
        title: image?.getAttribute("title") || "",
        alignment: element.dataset.nutbookImageAlign || "",
        displayWidthPx: parsePortableImageWidth(element.dataset.nutbookDisplayWidth),
        linkHref: anchor?.getAttribute("href") || "",
        linkTitle: anchor?.getAttribute("title") || "",
        rawSource: element.dataset.nutbookRawSource || "",
        markerRaw: MARKDOWN_COVER_MARKER,
        presentationDirty: element.dataset.nutbookPresentationDirty === "true"
      };
    }
  }],
  toDOM: (node) => {
    const attrs = node.attrs;
    const alignment = ["left", "center", "right"].includes(attrs.alignment) ? attrs.alignment : "";
    const displayWidthPx = parsePortableImageWidth(attrs.displayWidthPx);
    const imageAttributes = {
      src: attrs.src,
      alt: attrs.alt,
      title: attrs.title || null,
      class: "nutbook-cover-image",
      "data-nutbook-cover-image": "true",
      "data-nutbook-node-kind": attrs.nodeKind,
      "data-nutbook-image-align": alignment,
      "data-nutbook-display-width": displayWidthPx == null ? "" : String(displayWidthPx)
    };
    // portable 封面继承原图片的 alignment / displayWidthPx 视觉（居中、宽度上限），
    // 打开文档时排版不得变化。
    if (displayWidthPx != null) {
      imageAttributes.style = `width:auto;height:auto;max-width:min(${displayWidthPx}px, 100%)`;
    }
    const image = ["img", imageAttributes];
    const media = attrs.linkHref
      ? ["a", { href: attrs.linkHref, title: attrs.linkTitle || null }, image]
      : image;
    // .markdown-cover-media 是相对定位容器：wrapper 用 text-align 对齐并占满行宽，
    // media 容器宽度跟随图片，badge（::after）挂 media 容器，保证居中/右对齐时
    // 徽标仍落在图片左上角。
    // 关键：media 必须收缩到图片「渲染宽度」而非自然宽。inline-block 的 media 其
    // shrink-to-fit 宽度取的是图片自然宽（img 的 max-width 上限只约束渲染宽、不收缩
    // 首选宽），居中时 media 被居中、图片在 media 内居中，徽标锚定 media 左缘会落到
    // 图片左侧。给 media 套用与 img 相同的上限即可让两者等宽、徽标压在图片上。
    const mediaAttrs = { class: "markdown-cover-media", "data-cover-badge": coverBadgeText() };
    if (displayWidthPx != null) {
      mediaAttrs.style = `max-width:min(${displayWidthPx}px, 100%)`;
    }
    return ["div", {
      class: `markdown-cover-image-block${alignment ? ` nutbook-image-align-${alignment}` : ""}`,
      "data-type": "markdown-cover-image",
      "data-nutbook-cover": "true",
      "data-nutbook-node-kind": attrs.nodeKind,
      "data-nutbook-image-align": alignment,
      "data-nutbook-display-width": displayWidthPx == null ? "" : String(displayWidthPx)
    }, ["div", mediaAttrs, media]];
  },
  parseMarkdown: {
    match: (node) => node.type === "markdownCoverImage",
    runner: (state, node, type) => {
      state.addNode(type, {
        nodeKind: node.nodeKind || "image",
        src: node.src || "",
        alt: node.alt || "",
        title: node.title || "",
        alignment: node.alignment || "",
        displayWidthPx: node.displayWidthPx ?? null,
        linkHref: node.linkHref || "",
        linkTitle: node.linkTitle || "",
        rawSource: node.rawSource || "",
        markerRaw: MARKDOWN_COVER_MARKER,
        presentationDirty: false
      });
    }
  },
  toMarkdown: {
    match: (node) => node.type.name === MARKDOWN_COVER_IMAGE_NODE_NAME,
    runner: (state, node) => {
      const attrs = node.attrs;
      const body = !attrs.presentationDirty && attrs.rawSource
        ? attrs.rawSource
        : serializeCoverImageBody(attrs);
      state.addNode("html", undefined, `${MARKDOWN_COVER_MARKER}\n${body}`);
    }
  }
}));

// 轻量「封面」身份徽标文案（模块级 i18n，toDOM 静态渲染用；装饰性不进入
// 可访问性树，封面状态由图片工具栏「取消封面」aria-label/tooltip 表达）。
function coverBadgeText() {
  const i18n = typeof window !== "undefined" ? window.NutbookI18n : null;
  return i18n?.lookup?.("markdown.coverBadge", i18n.currentLanguage?.()) || "封面";
}

// 从 ProseMirror 文档定位唯一封面 wrapper 节点。
function findCoverImageNode(state) {
  let found = null;
  state?.doc?.descendants?.((node, pos) => {
    if (node.type.name === MARKDOWN_COVER_IMAGE_NODE_NAME) {
      found = { node, pos };
      return false;
    }
    return true;
  });
  return found;
}

// 封面身份切换会把 paragraph / portable block 与 cover atom 互换。即使两套 CSS
// 的视觉尺寸一致，不同 WebView 的 inline baseline / scroll anchoring 仍可能让正在
// 操作的图片在屏幕上偏移几像素；A→B 转移还会同时改写目标上方的旧封面。以目标
// 图片为视觉锚点，并只补偿最近的真实滚动容器，避免把身份修改变成导航动作。
function captureImageViewportAnchor(view, pos) {
  const nodeDom = view?.nodeDOM?.(pos);
  const element = nodeDom instanceof Element
    ? (nodeDom.matches("img") ? nodeDom : nodeDom.querySelector("img"))
    : null;
  if (!element) return null;
  let scrollParent = element.parentElement;
  while (scrollParent) {
    const style = getComputedStyle(scrollParent);
    const overflowY = style.overflowY;
    if ((overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay")
      && scrollParent.scrollHeight > scrollParent.clientHeight) {
      break;
    }
    scrollParent = scrollParent.parentElement;
  }
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    scrollParent,
    windowX: window.scrollX,
    windowY: window.scrollY
  };
}

function restoreImageViewportAnchor(view, anchor, pos) {
  if (!anchor) return;
  const nodeDom = view?.nodeDOM?.(pos);
  const element = nodeDom instanceof Element
    ? (nodeDom.matches("img") ? nodeDom : nodeDom.querySelector("img"))
    : null;
  if (!element) return;
  const rect = element.getBoundingClientRect();
  const deltaX = rect.left - anchor.left;
  const deltaY = rect.top - anchor.top;
  if (anchor.scrollParent?.isConnected) {
    if (Math.abs(deltaX) > 0.5) anchor.scrollParent.scrollLeft += deltaX;
    if (Math.abs(deltaY) > 0.5) anchor.scrollParent.scrollTop += deltaY;
    return;
  }
  if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
    window.scrollTo(anchor.windowX + deltaX, anchor.windowY + deltaY);
  }
}

function coverAttrsFromPortable(node) {
  return {
    nodeKind: "portable-image",
    src: node.attrs.src || "",
    alt: node.attrs.alt || "",
    title: node.attrs.title || "",
    alignment: node.attrs.alignment || "",
    displayWidthPx: node.attrs.displayWidthPx ?? null,
    linkHref: node.attrs.linkHref || "",
    linkTitle: node.attrs.linkTitle || "",
    rawSource: node.attrs.rawSource || "",
    presentationDirty: node.attrs.presentationDirty || false
  };
}

function coverAttrsFromImage(node) {
  const title = node.attrs.title || "";
  return {
    nodeKind: "image",
    src: node.attrs.src || "",
    alt: node.attrs.alt || "",
    title,
    alignment: imageAlignmentFromTitle(title),
    displayWidthPx: null,
    linkHref: "",
    linkTitle: "",
    rawSource: ""
  };
}

// Milkdown 的 link 是 mark（非 node）：linked image 在 ProseMirror 里表现为
// image 节点带 link mark。此 helper 返回 image 上的 link mark（若有）。
function imageLinkMark(image) {
  if (!image?.marks) return null;
  for (let index = 0; index < image.marks.length; index += 1) {
    if (image.marks[index].type.name === "link") return image.marks[index];
  }
  return null;
}

function coverAttrsFromLinkedImage(image, linkMark) {
  const title = image.attrs.title || "";
  return {
    nodeKind: "linked-image",
    src: image.attrs.src || "",
    alt: image.attrs.alt || "",
    title,
    alignment: imageAlignmentFromTitle(title),
    displayWidthPx: null,
    linkHref: linkMark?.attrs.href || "",
    linkTitle: linkMark?.attrs.title || "",
    rawSource: ""
  };
}

function createCoverNode(schema, attrs) {
  const type = schema.nodes[MARKDOWN_COVER_IMAGE_NODE_NAME];
  return type.create({
    ...attrs,
    markerRaw: MARKDOWN_COVER_MARKER,
    presentationDirty: attrs.presentationDirty ?? false
  });
}

// 解包封面时重建原图片块（保留 node kind、alt、title、link、尺寸与对齐）。
function rebuildImageBlock(schema, attrs) {
  const imageType = schema.nodes.image;
  const paragraph = schema.nodes.paragraph;
  if (attrs.nodeKind === "portable-image") {
    return schema.nodes[PORTABLE_IMAGE_NODE_NAME].create({ ...attrs, presentationDirty: false });
  }
  const image = imageType.create({ src: attrs.src, alt: attrs.alt, title: attrs.title || null });
  if (attrs.nodeKind === "linked-image") {
    // link 在 Milkdown schema 中是 mark，不是 node。
    const linkMark = schema.marks.link;
    if (linkMark) {
      return paragraph.create(null, image.mark([linkMark.create({ href: attrs.linkHref, title: attrs.linkTitle || null })]));
    }
  }
  return paragraph.create(null, image);
}

// 定位 pos 处的独立图片块（普通图片段落 / 链接图片段落 / portable 块）。
function independentImageBlockAt(state, pos) {
  const schema = state.schema;
  const imageType = schema.nodes.image;
  const portableType = schema.nodes[PORTABLE_IMAGE_NODE_NAME];
  const paragraphType = schema.nodes.paragraph;
  if (!imageType || !paragraphType || !portableType) return null;
  const safePos = Math.max(0, Math.min(Number(pos) || 0, state.doc.content.size));
  // 顶层 atom 块（如 portable-image-block）的起始位置 resolve 会停在 doc 层
  // （atom 没有内部位置，resolve 偏移后仍是 depth 0），depth 向上遍历找不到块；
  // 改用 nodeAt 直接取到该起始位置处的块本身，再取其完整边界。
  const direct = state.doc.nodeAt(safePos);
  if (direct) {
    if (direct.type === portableType) {
      return { blockStart: safePos, blockEnd: safePos + direct.nodeSize, attrs: coverAttrsFromPortable(direct) };
    }
    if (direct.type === paragraphType && direct.childCount === 1) {
      const child = direct.firstChild;
      if (child.type === imageType) {
        const linkMark = imageLinkMark(child);
        return {
          blockStart: safePos,
          blockEnd: safePos + direct.nodeSize,
          attrs: linkMark ? coverAttrsFromLinkedImage(child, linkMark) : coverAttrsFromImage(child)
        };
      }
    }
  }
  // pos 落在块「内部」（如 image 节点的 pos 而非所在段落 pos）时，向上找容器。
  let $pos = state.doc.resolve(safePos);
  for (let depth = $pos.depth; depth >= 1; depth -= 1) {
    const node = $pos.node(depth);
    if (node.type === portableType) {
      return {
        blockStart: $pos.before(depth),
        blockEnd: $pos.after(depth),
        attrs: coverAttrsFromPortable(node)
      };
    }
    if (node.type === paragraphType && node.childCount === 1) {
      const child = node.firstChild;
      if (child.type === imageType) {
        const linkMark = imageLinkMark(child);
        return {
          blockStart: $pos.before(depth),
          blockEnd: $pos.after(depth),
          attrs: linkMark ? coverAttrsFromLinkedImage(child, linkMark) : coverAttrsFromImage(child)
        };
      }
      return null;
    }
  }
  return null;
}

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
    // 封面 wrapper 是 atom，src 只存在于 attrs；封面身份变化（包裹/解包/
    // A→B 转移）不得触发资源删除回调。
    if (node.type?.name === MARKDOWN_COVER_IMAGE_NODE_NAME && node.attrs?.src) {
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
      // 封面身份 transaction 会同步重建一到两张图片；由该低频操作显式触发，
      // 确保首次布局前已将相对 src 改写为宿主可加载 URL。普通输入不触发扫描。
      const normalizeAfterIdentityChange = () => normalizeImages(view.dom);
      view.dom.addEventListener("nutbook:normalize-local-images", normalizeAfterIdentityChange);
      return {
        destroy() {
          observer.disconnect();
          cancelAnimationFrame(frame);
          view.dom.removeEventListener("nutbook:normalize-local-images", normalizeAfterIdentityChange);
        }
      };
    }
  });
}

// 16.47 方案A（滚动跳变根因修复）：宿主不再向 ProseMirror 内容区写入
// 标题隐藏类与大纲定位属性——宿主的 setAttribute/classList 写入会被
// PM DOMObserver 读回为外部输入，触发 sameDoc 全树重绘，图片重建导致
// scrollHeight 塌缩并被 WKWebView 双重钳制 scrollTop（详见 MEMORY.md 16.47）。
// 改由本 decoration plugin 依据文档结构派生视图层属性：
// - 文档顺序首个 H1 → 追加 markdown-document-title-source 类（位于
//   aligned_text_block 内时不加；该 H1 不参与大纲序号）；
// - 其余 h1~h6 按文档顺序获得 data-markdown-outline-index。
// 语义与宿主原 assignMarkdownOutlineTargets 对编辑器容器的处理逐条一致；
// 装饰只作用于视图 DOM，不进入 Markdown 序列化，也不会形成宿主外部写入被
// DOMObserver 再次读回的 mutation 回环。
function collectMarkdownOutlineDecorations(doc) {
  const decorations = [];
  let skippedDocumentTitle = false;
  let outlineIndex = 0;
  const walk = (node, from, insideAlignedBlock) => {
    node.forEach((child, offset) => {
      const childFrom = from + offset + 1;
      const childInsideAlignedBlock = insideAlignedBlock || child.type.name === ALIGNED_TEXT_NODE_NAME;
      if (child.type.name === "heading") {
        const childTo = childFrom + child.nodeSize;
        if (Number(child.attrs.level) === 1 && !skippedDocumentTitle) {
          skippedDocumentTitle = true;
          if (!childInsideAlignedBlock) {
            decorations.push(Decoration.node(childFrom, childTo, { class: "markdown-document-title-source" }));
          }
        } else {
          decorations.push(Decoration.node(childFrom, childTo, { "data-markdown-outline-index": String(outlineIndex) }));
          outlineIndex += 1;
        }
        return;
      }
      if (child.childCount) {
        walk(child, childFrom, childInsideAlignedBlock);
      }
    });
  };
  walk(doc, -1, false);
  return decorations;
}

function markdownOutlineDecorationPlugin() {
  return new Plugin({
    state: {
      init: (_, state) => DecorationSet.create(state.doc, collectMarkdownOutlineDecorations(state.doc)),
      apply: (tr, value) => (
        tr.docChanged
          ? DecorationSet.create(tr.doc, collectMarkdownOutlineDecorations(tr.doc))
          : value
      )
    },
    props: {
      decorations(state) {
        return this.getState(state);
      }
    }
  });
}

function proseNodeContainsImage(node) {
  if (!node) return false;
  if (["image", PORTABLE_IMAGE_NODE_NAME].includes(node.type?.name)) return true;
  let found = false;
  node.descendants?.((child) => {
    if (["image", PORTABLE_IMAGE_NODE_NAME].includes(child.type?.name)) {
      found = true;
      return false;
    }
    return !found;
  });
  return found;
}

function alignedTextSelectionState(state, selection = state?.selection) {
  if (!state || !selection || selection.empty || selection.from >= selection.to) {
    return { supported: false, targets: [], alignment: "" };
  }
  const paragraph = state.schema.nodes.paragraph;
  const heading = state.schema.nodes.heading;
  const alignedType = state.schema.nodes[ALIGNED_TEXT_NODE_NAME];
  if (!paragraph || !heading || !alignedType) {
    return { supported: false, targets: [], alignment: "" };
  }

  const targets = [];
  let unsupported = false;
  state.doc.forEach((node, pos) => {
    const nodeContentStart = pos + (node.type === alignedType ? 2 : 1);
    if (selection.from >= pos + node.nodeSize || selection.to <= nodeContentStart) return;
    if (node.type === paragraph || node.type === heading) {
      if (proseNodeContainsImage(node)) {
        unsupported = true;
        return;
      }
      targets.push({ pos, node, alignment: "left" });
      return;
    }
    if (node.type === alignedType) {
      const child = node.childCount === 1 ? node.child(0) : null;
      if (!child || ![paragraph, heading].includes(child.type) || proseNodeContainsImage(child)) {
        unsupported = true;
        return;
      }
      const alignment = TEXT_ALIGNMENTS.includes(node.attrs.alignment) ? node.attrs.alignment : "";
      if (!alignment) {
        unsupported = true;
        return;
      }
      targets.push({ pos, node, alignment });
      return;
    }
    unsupported = true;
  });

  if (unsupported || !targets.length) {
    return { supported: false, targets: [], alignment: "" };
  }
  const firstAlignment = targets[0].alignment;
  const alignment = targets.every((target) => target.alignment === firstAlignment) ? firstAlignment : "";
  return { supported: true, targets, alignment };
}

async function createMilkdownEditor({ root, markdown = "", fileName = "", language = null, onChange = null, onEdit = null, tableToolsEnabled = true, resolveImageSrc = null, onInsertImageAsset = null, onInsertCoverAsset = null, onReleaseCoverAsset = null, onValidateCoverAsset = null, onRemoveImageAsset = null, onImageSizeError = null, onCoverChange = null, readOnly = false }) {
  if (!root) {
    throw new Error("Milkdown root is required");
  }

  const i18n = window.NutbookI18n;
  const t = (key) => i18n?.lookup?.(key, language || i18n.currentLanguage?.()) ?? key;

  destroyExisting(root);
  root.innerHTML = "";
  const documentFrontmatter = splitSkillFrontmatterForEditor(markdown);
  const skillFrontmatter = isSkillMarkdownFileName(fileName) ? documentFrontmatter : null;
  const editorMarkdown = documentFrontmatter ? documentFrontmatter.body : markdown;
  // PR C / C1：duplicate marker 是阻断式文档诊断——文档必须仍可打开，并进入
  // 现有源码 fallback 进行人工修复。这里抛错让宿主现有 catch 切到源码编辑，
  // 不挂载 Milkdown（用户能看到 marker 文本、可手工修复）。C2 不得把该合同
  // 放宽成视觉编辑器内的不可见/不可可靠修复状态。
  const coverPreflight = preflightCoverMarkers(editorMarkdown);
  if (coverPreflight.duplicate) {
    throw new Error(
      `document declares ${coverPreflight.count} valid \`<!-- nutbook-cover -->\` markers; `
      + "only one cover identity is allowed — repair the source before editing"
    );
  }
  const editorMount = document.createElement("div");
  editorMount.className = "milkdown-editor-body";
  const frontmatterPanel = renderSkillFrontmatterPanel(skillFrontmatter);
  if (frontmatterPanel) {
    root.appendChild(frontmatterPanel);
    if (readOnly) {
      // 检查视图：frontmatter 是首屏视觉的一部分，但控件必须不可编辑、不进 Tab 序。
      frontmatterPanel.querySelectorAll("input,textarea").forEach((control) => {
        control.disabled = true;
        control.tabIndex = -1;
      });
    }
  }
  root.appendChild(editorMount);
  if (readOnly) {
    // 最后一道 DOM 保护：只读实现本体是创建期的插件/事件边界（见下），
    // contenteditable=false 只兜底拦截残余的浏览器编辑入口。
    editorMount.setAttribute("contenteditable", "false");
    editorMount.setAttribute("spellcheck", "false");
  }

  let currentMarkdown = markdown;
  let userInteracted = false;
  let hasDocumentChanges = false;
  let destroyed = false;
  let editorReady = false;
  let formatToolbar = null;
  let formatToolbarFrame = null;
  let formatToolbarVisible = false;
  let formatToolbarSelection = null;
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
  // Codex review R3-1：编辑锁——真实 ProseMirror 权限边界（editable prop +
  // dispatch 闸 + undo/redo 守卫），不是 blur / 延迟模拟。
  let editingLocked = false;
  // Codex review R3-2：撤销/重做可达资源集合。撤销/重做的任何落点都曾是
  // 某个事务后的 doc 状态，因此按事务粒度累积「出现过的图片引用」
  // （只增不减）即为可达全集的等价追踪；集合由 getEverReferencedResources()
  // 暴露给宿主做跨目录另存的资源收敛。
  const everReferencedResources = new Set();
  const isTrackableResourceRef = (value) =>
    typeof value === "string" && value && !/^(https?:|data:|file:|#|\/)/i.test(value);
  function trackDocumentImageRefs(state) {
    state?.doc?.descendants?.((node) => {
      const src = node.attrs?.src ?? node.attrs?.url;
      if (isTrackableResourceRef(src)) everReferencedResources.add(src);
      return true;
    });
  }
  // Codex review R4-1：可达资源追踪必须挂在 ProseMirror 真实事务入口。
  // 依赖核验：milkdown listener 的 updated 由 debounce(...,200) 驱动
  // （@milkdown/plugin-listener/lib/index.js debouncedHandler），且 prevDoc.eq(doc)
  // 时不通知——「插图后立即撤销」的窗口内 updated 调用次数为 0，手敲/粘贴的
  // 图片引用会漏。插件 state.apply 是每个事务（含 undo/redo、addToHistory=false
  // 的事务）的同步入口，任何事务后的 doc 状态都会被累积进只增不减的集合。
  const resourceTrackingPlugin = new Plugin({
    state: {
      init: (_, state) => {
        trackDocumentImageRefs(state);
        return null;
      },
      apply: (tr, _value, _oldState, newState) => {
        if (tr.docChanged) trackDocumentImageRefs(newState);
        return null;
      }
    }
  });
  // Codex review R4-2：事务门。锁定期间一律过滤事务（PM 的
  // EditorState.applyTransaction 原生支持，事务被滤掉时状态零变化）。
  // 不再替换/删除 view.dispatch——那是 EditorView 构造器 `this.dispatch =
  // this.dispatch.bind(this)` 创建的 bound 方法，delete 后 keymap 命令内部
  // 裸调用 dispatch 时 this=undefined 直接 TypeError（prosemirror-view
  // src/index.ts:75 已核验）。
  const lockGatePlugin = new Plugin({
    filterTransaction: () => !editingLocked
  });
  let findPanel = null;
  let findQueryInput = null;
  let replaceQueryInput = null;
  let findReplaceRow = null;
  let findState = { query: "", caseSensitive: false, current: 0, matches: [] };
  let findSelectionActive = false;
  let findPanelFrame = null;
  const FIND_HISTORY_KEY = "nutbook.markdownFindHistory.v1";
  const readFindHistory = () => {
    try {
      const values = JSON.parse(window.localStorage?.getItem(FIND_HISTORY_KEY) || "[]");
      return Array.isArray(values) ? values.filter((value) => typeof value === "string" && value.trim()).slice(0, 3) : [];
    } catch (_) { return []; }
  };
  const recordFindHistory = (value) => {
    const query = String(value || "").trim();
    if (!query) return;
    try {
      const next = [query, ...readFindHistory().filter((item) => item.toLocaleLowerCase() !== query.toLocaleLowerCase())].slice(0, 3);
      window.localStorage?.setItem(FIND_HISTORY_KEY, JSON.stringify(next));
    } catch (_) {}
  };
  // PR C / C1：canonical cover remark（在 portableImageRemark 之后执行，
  // 先让 GitHub HTML 图片成为 portableImage，再合并 comment + 独立图片块）。
  let coverDiagnostics = [];
  const coverImageRemark = $remark("coverImageRemark", () => () => (tree) => {
    coverDiagnostics = transformCoverImageBlocks(tree, editorMarkdown);
  });
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
  if (!readOnly) {
    setupSkillFrontmatterEditing(frontmatterPanel, skillFrontmatter, () => {
      markUserInteracted();
      hasDocumentChanges = true;
      scheduleMarkdownChangeSync(80);
    });
  }
  const interactionEvents = [];
  const findPlugin = new Plugin({
    state: {
      init: (_, state) => buildFindDecorations(state.doc),
      apply: (tr, decorations, _oldState, newState) => {
        if (tr.docChanged || tr.getMeta(findPlugin)) return buildFindDecorations(newState.doc);
        return decorations.map(tr.mapping, tr.doc);
      }
    },
    props: { decorations: (state) => findPlugin.getState(state) }
  });
  function buildFindDecorations(doc) {
    findState.matches = findDocumentMatches(doc, findState.query, { caseSensitive: findState.caseSensitive });
    if (findState.current >= findState.matches.length) findState.current = 0;
    const decorations = findState.matches.map((match, index) => Decoration.inline(
      match.from,
      match.to,
      { class: index === findState.current ? "nutbook-find-current" : "nutbook-find-match" }
    ));
    return DecorationSet.create(doc, decorations);
  }
  const handleUndoRedoShortcut = (event) => {
    if (event.isComposing || event.key === "Process") return;
    if (editingLocked) return;
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== "z") return;
    const view = getEditorView();
    if (!view) return;
    const handled = runHistoryCommand(event.shiftKey ? redo : undo);
    if (!handled) return;
    event.preventDefault();
    event.stopPropagation();
  };
  if (!readOnly) {
    root.addEventListener("keydown", handleUndoRedoShortcut, true);
  }

  const editorBuilder = Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, editorMount);
      ctx.set(defaultValueCtx, editorMarkdown);
      if (readOnly) {
        // 检查视图只读模式：ProseMirror 层直接关闭可编辑性——不是 CSS 伪装。
        // 编辑能力在创建期就被裁掉：无编辑工具、无 history、无输入规则副作用、
        // 无 dirty/baseline 监听、无宿主快捷键链路。
        ctx.update(editorViewOptionsCtx, (options) => ({
          ...options,
          editable: () => false
        }));
        ctx.update(prosePluginsCtx, () => [
          localImageSrcPlugin(resolveImageSrc),
          markdownOutlineDecorationPlugin()
        ].filter(Boolean));
      } else {
        ctx.update(prosePluginsCtx, (plugins) => [
          // R4-1：事务级同步追踪（真实 PM 事务入口，先于一切早退）。
          resourceTrackingPlugin,
          // R4-2：锁定期间的事务门（不替换 bound dispatch）。
          lockGatePlugin,
          keymap({
            // R3-1：锁定期间撤销/重做命令零效果（keydown 在 PM editHandlers
            // 已被 editable 关断，这里兜底 keymap 直连路径）。
            "Mod-z": (state, dispatch, view) => (editingLocked ? false : undo(state, dispatch, view)),
            "Shift-Mod-z": (state, dispatch, view) => (editingLocked ? false : redo(state, dispatch, view)),
            "Mod-y": (state, dispatch, view) => (editingLocked ? false : redo(state, dispatch, view)),
            "Backspace": liftListItemAtParagraphStart
          }),
          pastePlainTextWhenLeavingList(),
          markdownImageAssetRemovalPlugin(onRemoveImageAsset),
          localImageSrcPlugin(resolveImageSrc),
          markdownOutlineDecorationPlugin(),
          findPlugin,
          ...plugins
        ].filter(Boolean));
        ctx.update(listenerCtx, (listenerManager) => listenerManager
          .updated(() => {
            // R4-1：doc 状态追踪已由 resourceTrackingPlugin 在事务入口同步
            // 完成（listener 的 updated 走 200ms debounce，覆盖不了
            // 「插图→立即撤销」窗口），这里只保留宿主变更同步。
            if (!editorReady) return;
            hasDocumentChanges = true;
            scheduleMarkdownChangeSync();
          }));
      }
    })
    .use(alignedTextRemark)
    .use(portableImageRemark)
    .use(coverImageRemark)
    .use(commonmark)
    .use(gfm)
    .use(alignedTextSchema)
    .use(portableImageSchema)
    .use(markdownCoverImageSchema);
  // 只读模式不注册 history：撤销/重做是编辑能力，检查首屏不需要，
  // 也不能让 Cmd+Z 在预览里产生任何文档变化。.use 必须逐个链式调用。
  const editor = await (readOnly
    ? editorBuilder.use(listener)
    : editorBuilder.use(history).use(listener)).create();
  // R3-2：初始文档状态的引用同样计入可达集合（创建期即快照，不等首个事务）。
  editor.action((ctx) => {
    trackDocumentImageRefs(ctx.get(editorViewCtx)?.state);
  });

  const serializeCurrentDocument = () => {
    if (destroyed) return currentMarkdown;
    return editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const serializer = ctx.get(serializerCtx);
      const bodyMarkdown = serializer(view.state.doc);
      const serializedFrontmatter = skillFrontmatter
        ? serializeSkillFrontmatterForEditor(skillFrontmatter)
        : (documentFrontmatter?.raw || "");
      currentMarkdown = documentFrontmatter ? `${serializedFrontmatter}${bodyMarkdown}` : bodyMarkdown;
      return currentMarkdown;
    });
  };
  const baselineMarkdown = serializeCurrentDocument();
  lastNotifiedMarkdown = baselineMarkdown;

  queueMicrotask(() => {
    if (destroyed) return;
    editorReady = true;
    if (readOnly) {
      // 检查视图：不创建任何编辑辅助 UI（格式/表格/插入/图片对齐工具条、
      // 代码语言下拉），保持与正式打开页同一渲染管线的纯只读首屏。
      return;
    }
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
    if (destroyed) return null;
    return editor.action((ctx) => ctx.get(editorViewCtx));
  }

  function isEditorComposing() {
    return Boolean(getEditorView()?.composing);
  }

  function flushMarkdownChangeSync() {
    markdownChangeTimer = null;
    if (destroyed || !editorReady) return;
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

  function refreshFind({ scroll = false } = {}) {
    const view = getEditorView();
    if (!view) return;
    view.dispatch(view.state.tr.setMeta(findPlugin, true));
    updateFindPanel();
    scheduleFindPanelPosition();
    const current = findState.matches[findState.current];
    if (scroll && current) {
      findSelectionActive = true;
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, current.from, current.to)).scrollIntoView());
    }
  }

  function updateFindPanel() {
    if (!findPanel) return;
    const count = findPanel.querySelector("[data-find-count]");
    if (count) count.textContent = `${findState.matches.length ? findState.current + 1 : 0}/${findState.matches.length}`;
    const caseButton = findPanel.querySelector("[data-find-case]");
    if (caseButton) caseButton.classList.toggle("active", findState.caseSensitive);
    const history = findPanel.querySelector("[data-find-history]");
    if (history) {
      const values = readFindHistory();
      history.hidden = !values.length;
      history.innerHTML = values.length
        ? `<span class="markdown-find-history-label">${escapeOptionText(t("markdown.recentFinds"))}</span>${values.map((value, index) => `<button type="button" data-find-history-item="${index}" data-i18n-skip title="${escapeOptionText(value)}">${escapeOptionText(value)}</button>`).join("")}`
        : "";
      history.querySelectorAll("[data-find-history-item]").forEach((button) => button.addEventListener("click", () => {
        const value = values[Number(button.dataset.findHistoryItem)] || "";
        if (!value || !findQueryInput) return;
        findQueryInput.value = value;
        findState.query = value;
        findState.current = 0;
        refreshFind({ scroll: true });
      }));
    }
  }

  function updateFindPanelPosition() {
    if (!findPanel) return;
    const viewport = root.closest(".viewer-body") || root;
    const rect = viewport.getBoundingClientRect();
    findPanel.style.top = `${Math.max(8, rect.top + 12)}px`;
    findPanel.style.right = `${Math.max(12, window.innerWidth - rect.right + 12)}px`;
  }

  function scheduleFindPanelPosition() {
    if (!findPanel || findPanelFrame) return;
    findPanelFrame = requestAnimationFrame(() => {
      findPanelFrame = null;
      updateFindPanelPosition();
    });
  }

  function closeFind() {
    if (!findPanel) return;
    const view = getEditorView();
    if (view && !view.state.selection.empty) {
      view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, view.state.selection.from)));
    }
    recordFindHistory(findState.query);
    findSelectionActive = false;
    findState = { query: "", caseSensitive: false, current: 0, matches: [] };
    findPanel.remove();
    findPanel = null;
    findQueryInput = null;
    replaceQueryInput = null;
    findReplaceRow = null;
    refreshFind();
    getEditorView()?.focus();
  }

  function moveFind(step) {
    if (!findState.matches.length) return;
    findState.current = (findState.current + step + findState.matches.length) % findState.matches.length;
    refreshFind({ scroll: true });
  }

  function replaceCurrent() {
    const view = getEditorView();
    const match = findState.matches[findState.current];
    if (!view || !match) return;
    const marks = view.state.doc.resolve(match.from).marks();
    const tr = view.state.tr.replaceWith(match.from, match.to, view.state.schema.text(replaceQueryInput?.value || "", marks));
    view.dispatch(tr);
    markUserInteracted();
    refreshFind({ scroll: true });
  }

  function replaceAll() {
    const view = getEditorView();
    if (!view || !findState.matches.length) return;
    const replacement = replaceQueryInput?.value || "";
    let tr = view.state.tr;
    for (const match of replacementPlan(findState.matches)) {
      const marks = view.state.doc.resolve(match.from).marks();
      tr = tr.replaceWith(match.from, match.to, view.state.schema.text(replacement, marks));
    }
    view.dispatch(closeHistory(tr));
    markUserInteracted();
    refreshFind({ scroll: true });
  }

  function openFind({ showReplace = false, query = null, focus = true } = {}) {
    if (readOnly || destroyed) return;
    if (!findPanel) {
      findPanel = document.createElement("div");
      findPanel.className = "markdown-find-panel";
      findPanel.setAttribute("role", "dialog");
      findPanel.setAttribute("aria-label", t("markdown.find"));
      findPanel.innerHTML = `
        <div class="markdown-find-row">
          <input data-find-query type="search" autocomplete="off" placeholder="${escapeOptionText(t("markdown.findPlaceholder"))}" aria-label="${escapeOptionText(t("markdown.find"))}" />
          <button type="button" data-find-case aria-label="${escapeOptionText(t("markdown.matchCase"))}">Aa<span class="markdown-find-tooltip">${escapeOptionText(t("markdown.matchCase"))}</span></button>
          <span data-find-count aria-live="polite">0/0</span>
          <button type="button" data-find-prev aria-label="${escapeOptionText(t("markdown.previousMatch"))}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 12 5-5 5 5"/></svg><span class="markdown-find-tooltip">${escapeOptionText(t("markdown.previousMatch"))}</span></button>
          <button type="button" data-find-next aria-label="${escapeOptionText(t("markdown.nextMatch"))}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 8 5 5 5-5"/></svg><span class="markdown-find-tooltip">${escapeOptionText(t("markdown.nextMatch"))}</span></button>
          <button type="button" data-find-expand aria-label="${escapeOptionText(t("markdown.showReplace"))}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6h10m-4-3 4 3-4 3M17 14H7m4-3-4 3 4 3"/></svg><span class="markdown-find-tooltip">${escapeOptionText(t("markdown.showReplace"))}</span></button>
          <button type="button" data-find-close aria-label="${escapeOptionText(t("markdown.closeFind"))}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 6 8 8m0-8-8 8"/></svg><span class="markdown-find-tooltip">${escapeOptionText(t("markdown.closeFind"))}</span></button>
        </div>
        <div class="markdown-find-row markdown-find-replace" hidden>
          <input data-replace-query autocomplete="off" placeholder="${escapeOptionText(t("markdown.replacePlaceholder"))}" aria-label="${escapeOptionText(t("markdown.replace"))}" />
          <button type="button" data-find-replace aria-label="${escapeOptionText(t("markdown.replace"))}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10h10m-4-4 4 4-4 4"/><path d="M3 5h4M3 15h4"/></svg><span class="markdown-find-tooltip">${escapeOptionText(t("markdown.replace"))}</span></button>
          <button type="button" data-find-replace-all aria-label="${escapeOptionText(t("markdown.replaceAll"))}"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6h10m-4-3 4 3-4 3M3 14h10m-4-3 4 3-4 3"/><path d="M3 10h4"/></svg><span class="markdown-find-tooltip">${escapeOptionText(t("markdown.replaceAll"))}</span></button>
        </div>
        <div class="markdown-find-history" data-find-history data-i18n-skip hidden></div>`;
      root.appendChild(findPanel);
      findQueryInput = findPanel.querySelector("[data-find-query]");
      replaceQueryInput = findPanel.querySelector("[data-replace-query]");
      findReplaceRow = findPanel.querySelector(".markdown-find-replace");
      findQueryInput.addEventListener("input", () => { findState.query = findQueryInput.value; findState.current = 0; refreshFind({ scroll: true }); });
      findPanel.querySelector("[data-find-case]").addEventListener("click", () => { findState.caseSensitive = !findState.caseSensitive; findState.current = 0; refreshFind({ scroll: true }); });
      findPanel.querySelector("[data-find-prev]").addEventListener("click", () => moveFind(-1));
      findPanel.querySelector("[data-find-next]").addEventListener("click", () => moveFind(1));
      let findTooltipSuppressOrigin = null;
      findPanel.querySelector("[data-find-expand]").addEventListener("click", (event) => { findReplaceRow.hidden = !findReplaceRow.hidden; findTooltipSuppressOrigin = { x: event.clientX, y: event.clientY }; findPanel.classList.add("suppress-find-tooltips"); if (!findReplaceRow.hidden) replaceQueryInput.focus(); });
      findPanel.addEventListener("pointermove", (event) => { if (findTooltipSuppressOrigin && Math.hypot(event.clientX - findTooltipSuppressOrigin.x, event.clientY - findTooltipSuppressOrigin.y) > 4) { findTooltipSuppressOrigin = null; findPanel.classList.remove("suppress-find-tooltips"); } });
      findPanel.addEventListener("pointerleave", () => { findTooltipSuppressOrigin = null; findPanel.classList.remove("suppress-find-tooltips"); });
      findPanel.querySelector("[data-find-close]").addEventListener("click", closeFind);
      findPanel.querySelector("[data-find-replace]").addEventListener("click", replaceCurrent);
      findPanel.querySelector("[data-find-replace-all]").addEventListener("click", replaceAll);
      findPanel.addEventListener("keydown", (event) => {
        if (event.isComposing || event.keyCode === 229) return;
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeFind(); }
        if (event.key === "Enter") { event.preventDefault(); event.stopPropagation(); moveFind(event.shiftKey ? -1 : 1); }
      });
    }
    if (query !== null && findQueryInput) {
      findQueryInput.value = query;
      findState.query = query;
      findState.current = 0;
    }
    if (showReplace && findReplaceRow) findReplaceRow.hidden = false;
    refreshFind();
    updateFindPanelPosition();
    if (focus) findQueryInput?.focus();
  }

  const handleFindShortcut = (event) => {
    if (readOnly || event.isComposing || event.keyCode === 229 || !(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== "f") return;
    const view = getEditorView();
    if (!view || !root.contains(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    openFind();
  };
  if (!readOnly) root.addEventListener("keydown", handleFindShortcut, true);
  if (!readOnly) {
    window.addEventListener("scroll", scheduleFindPanelPosition, true);
    window.addEventListener("resize", scheduleFindPanelPosition);
  }
  if (!readOnly) {
    root.addEventListener("pointerdown", () => { findSelectionActive = false; }, true);
    root.addEventListener("keydown", (event) => {
      if (!findPanel?.contains(event.target)) findSelectionActive = false;
    }, true);
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

  // PR C / C2：`+ → 封面图` —— 在当前空段落插入 canonical 封面（marker + 图片），
  // 默认大图居中、不超过固有尺寸（displayWidthPx null + CSS max-width:100%）。
  // 已有封面 A 时在同一 transaction 内解包 A（A→C 身份转移，单步 undo/redo 完整
  // 恢复）；不移动 H1、不创建固定封面槽。picker/copy 晚到时校验 destroyed /
  // composition / 空段仍有效，失效则拒绝写入错误文档。
  async function runInsertCoverImage() {
    if (typeof onInsertCoverAsset !== "function") return false;
    const view = getEditorView();
    if (!view || !emptyParagraphSelection(view)) return false;
    insertMenuSelection = { from: view.state.selection.from };
    closeInsertMenu({ preserveSelection: true });
    let asset = null;
    try {
      asset = await onInsertCoverAsset();
    } catch (error) {
      console.warn("Markdown cover insert failed", error);
    }
    if (!asset?.relativePath || destroyed || isEditorComposing()) {
      if (asset?.stagedAssetId && typeof onReleaseCoverAsset === "function") {
        await onReleaseCoverAsset(asset);
      }
      insertMenuSelection = null;
      scheduleInsertMenuUpdate();
      return false;
    }
    const inserted = insertCoverAtEmptyParagraph(asset);
    if (!inserted && asset.stagedAssetId && typeof onReleaseCoverAsset === "function") {
      await onReleaseCoverAsset(asset);
    }
    return inserted;
  }

  // 在已捕获的空段插入封面 wrapper（与 setCoverImage 同一原子语义：单次 dispatch、
  // 单 history step；A→C 自动转移；composition/duplicate 拒绝）。
  function insertCoverAtEmptyParagraph(asset) {
    const view = getEditorView();
    if (!view || view.composing) return false;
    if (coverDiagnostics.some((d) => d.kind === "duplicate")) return false;
    restoreInsertSelection(view);
    const target = emptyParagraphSelection(view);
    if (!target) return false;
    const schema = view.state.schema;
    const wrapperType = schema.nodes[MARKDOWN_COVER_IMAGE_NODE_NAME];
    if (!wrapperType) return false;
    const coverNode = createCoverNode(schema, {
      nodeKind: "image",
      src: asset.relativePath,
      alt: imageAltFromFileName(asset.fileName || asset.relativePath),
      title: "",
      alignment: "center",
      displayWidthPx: null,
      linkHref: "",
      linkTitle: "",
      rawSource: ""
    });
    const existingCover = findCoverImageNode(view.state);
    const coverStart = existingCover?.pos ?? null;
    const coverEnd = existingCover
      ? existingCover.pos + existingCover.node.nodeSize
      : null;
    let tr = view.state.tr;
    let selectionAfter;
    if (existingCover && coverStart < target.blockStart) {
      // A 在前：先插入 C（A 的 pos 不受插入影响），再解包 A；selection 经 mapping 修正。
      tr = tr.replaceWith(target.blockStart, target.blockEnd, coverNode);
      const afterInsert = target.blockStart + coverNode.nodeSize;
      tr = tr.replaceWith(coverStart, coverEnd, rebuildImageBlock(schema, existingCover.node.attrs));
      selectionAfter = tr.mapping.map(afterInsert);
    } else {
      // A 在插入点之后（或不存在）：先解包 A（不影响插入点位置），再插入 C。
      if (existingCover) {
        tr = tr.replaceWith(coverStart, coverEnd, rebuildImageBlock(schema, existingCover.node.attrs));
      }
      tr = tr.replaceWith(target.blockStart, target.blockEnd, coverNode);
      selectionAfter = tr.mapping.map(target.blockStart + coverNode.nodeSize);
    }
    const selectionPos = Math.max(1, Math.min(selectionAfter, tr.doc.content.size));
    tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos), -1));
    view.dispatch(closeHistory(tr.scrollIntoView()));
    markUserInteracted();
    view.focus();
    hideInsertMenu();
    scheduleFormatToolbarUpdate();
    scheduleTableToolbarUpdate();
    scheduleInsertMenuUpdate();
    return true;
  }

  function runInsertCommand(command) {
    if (command === "image") {
      runInsertImageAsset();
      return true;
    }
    if (command === "cover-image") {
      runInsertCoverImage();
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
      // PR C / C2：「封面图」必须紧邻普通「图片」。
      { command: "cover-image", icon: INSERT_ICON_SVG.cover, label: t("markdown.insertCoverImage") },
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
      if (target || !["image", PORTABLE_IMAGE_NODE_NAME, MARKDOWN_COVER_IMAGE_NODE_NAME].includes(node.type?.name)) return !target;
      const dom = view.nodeDOM(pos);
      if (dom === imageElement || dom?.contains?.(imageElement)) {
        const $pos = view.state.doc.resolve(pos);
        const isCover = node.type?.name === MARKDOWN_COVER_IMAGE_NODE_NAME;
        const isPortable = node.type?.name === PORTABLE_IMAGE_NODE_NAME;
        const isStandalone = isCover || isPortable || ($pos.parent?.type?.name === "paragraph" && $pos.parent.childCount === 1);
        target = { element: imageElement, node, pos, isPortable, isCover, isStandalone };
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

  // PR C / C2：封面 wrapper 排版更新（对齐/尺寸）——保留封面身份，只改 wrapper
  // attrs；plain/linked 封面改为 portable 表达（与普通图片设对齐的既有行为一致）。
  function setCoverBlockPresentation(view, target, { alignment, displayWidthPx }) {
    const node = view.state.doc.nodeAt(target.pos);
    if (!node || node.type?.name !== MARKDOWN_COVER_IMAGE_NODE_NAME) return false;
    const tr = view.state.tr.setNodeAttribute(target.pos, "presentationDirty", true);
    tr.setNodeAttribute(target.pos, "nodeKind", "portable-image");
    tr.setNodeAttribute(target.pos, "alignment", alignment || "");
    tr.setNodeAttribute(target.pos, "displayWidthPx", displayWidthPx ?? null);
    view.dispatch(closeHistory(tr.scrollIntoView()));
    markUserInteracted();
    view.focus();
    scheduleImageAlignToolbarUpdate();
    return true;
  }

  async function setImageAlignment(alignment) {
    const view = getEditorView();
    if (!view || !activeImageTarget) return false;
    let target = { ...activeImageTarget, node: view.state.doc.nodeAt(activeImageTarget.pos) };
    if (!target.node || !target.isStandalone) return false;
    if (target.node.type?.name === MARKDOWN_COVER_IMAGE_NODE_NAME) {
      const displayWidthPx = target.node.attrs?.displayWidthPx ?? null;
      return setCoverBlockPresentation(view, target, { alignment, displayWidthPx });
    }
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
    if (target.node.type?.name === MARKDOWN_COVER_IMAGE_NODE_NAME) {
      try {
        const displayWidthPx = await displayWidthForPreset(target, size);
        return setCoverBlockPresentation(view, target, {
          alignment: target.node.attrs?.alignment || "",
          displayWidthPx
        });
      } catch (error) {
        reportImageSizeError(error);
        return false;
      }
    }
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

  // PR C / C2：封面身份操作结果回传宿主（成功/失败状态提示）。
  // result: { kind: "set" | "remove", ok: boolean, reason?: "validation" }
  // reason === "validation" 表示校验拒绝——宿主 validate 回调已输出具体原因，
  // 避免重复提示。
  function notifyCoverChange(result) {
    if (typeof onCoverChange === "function") onCoverChange(result);
  }

  // PR C / C2：把当前悬停/选中的合格图片设为封面。本地图片先经宿主校验
  // （canonical path / MIME / 尺寸 / 4:3..2:1 / SVG 安全；不重复 copy）；
  // http/https 在线图片不下载不校验比例即可包裹。校验失败不产生任何身份变化。
  async function setTargetAsCover() {
    const view = getEditorView();
    if (!view || !activeImageTarget) return false;
    let target = { ...activeImageTarget, node: view.state.doc.nodeAt(activeImageTarget.pos) };
    if (!target.node || !target.isStandalone) return false;
    if (target.node.type?.name === MARKDOWN_COVER_IMAGE_NODE_NAME) return false;
    const src = String(target.node.attrs?.src || "");
    if (typeof onValidateCoverAsset === "function" && !/^https?:\/\//i.test(src.trim())) {
      const ok = await onValidateCoverAsset(src);
      if (!ok) {
        notifyCoverChange({ kind: "set", ok: false, reason: "validation" });
        return false;
      }
    }
    const coverState = api.getCoverState();
    if (coverState.duplicate) return false;
    const viewNow = getEditorView();
    if (!viewNow || viewNow.composing) return false;
    const refreshed = findImageTargetFromElement(target.element, viewNow);
    if (!refreshed) return false;
    const committed = api.setCoverImage(refreshed.pos);
    notifyCoverChange({ kind: "set", ok: committed });
    return committed;
  }

  // PR C / C2：取消当前封面身份（图片原地保留为普通正文；不删除任何资源）。
  function removeCurrentCover() {
    if (api.getCoverState().duplicate) return false;
    const committed = api.removeCover();
    notifyCoverChange({ kind: "remove", ok: committed });
    return committed;
  }

  // 鼠标点击图片工具栏时 pointerdown 已阻止按钮抢走焦点，封面身份 transaction
  // 不应再次 focus 编辑器。键盘激活则不同：被激活的按钮会在二态切换后隐藏，需把
  // 焦点送回正文；直接使用 DOM focus({ preventScroll: true })，并同步恢复所有祖先
  // 滚动位置，规避 WKWebView 对 preventScroll 支持不完整时的选区轻微滚动。
  function focusEditorAfterKeyboardToolbarAction() {
    const view = getEditorView();
    if (!view?.dom?.isConnected) return;
    const scrollSnapshots = [];
    for (let element = view.dom.parentElement; element; element = element.parentElement) {
      scrollSnapshots.push({ element, left: element.scrollLeft, top: element.scrollTop });
    }
    const windowLeft = window.scrollX;
    const windowTop = window.scrollY;
    try {
      view.dom.focus({ preventScroll: true });
    } catch {
      view.dom.focus();
    }
    scrollSnapshots.forEach(({ element, left, top }) => {
      if (element.scrollLeft !== left) element.scrollLeft = left;
      if (element.scrollTop !== top) element.scrollTop = top;
    });
    if (window.scrollX !== windowLeft || window.scrollY !== windowTop) {
      window.scrollTo(windowLeft, windowTop);
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
      { type: "size", value: "large", icon: IMAGE_SIZE_ICON_SVG.large, label: t("markdown.imageSizeLarge") },
      // PR C / C2：封面二态工具。合格非封面图片只显示「设为封面」；
      // 当前封面只显示「取消封面」；不提供替换当前封面的第三态入口。
      { type: "cover", value: "set", icon: IMAGE_ALIGN_ICON_SVG.coverSet, label: t("markdown.setAsCover") },
      { type: "cover", value: "remove", icon: IMAGE_ALIGN_ICON_SVG.coverRemove, label: t("markdown.removeCover") }
    ];
    toolbar.innerHTML = items.map((item) => `
      <button type="button" data-image-${item.type}="${item.value}" aria-label="${item.label}">
        ${item.icon}
        <span class="markdown-image-align-tooltip">${item.label}</span>
      </button>
    `).join("");
    const activateToolbarButton = (button) => {
      if (!button || button.disabled || button.hidden) return false;
      if (button.dataset.imageCover === "set") {
        return setTargetAsCover().catch((error) => {
          reportImageSizeError(error);
          return false;
        });
      } else if (button.dataset.imageCover === "remove") {
        return removeCurrentCover();
      } else if (button.dataset.imageAlign) {
        return setImageAlignment(button.dataset.imageAlign).catch((error) => {
          reportImageSizeError(error);
          return false;
        });
      }
      return setImageSize(button.dataset.imageSize || "large").catch((error) => {
        reportImageSizeError(error);
        return false;
      });
    };
    toolbar.addEventListener("pointerdown", (event) => {
      const button = event.target.closest("button[data-image-align], button[data-image-size], button[data-image-cover]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      void activateToolbarButton(button);
    });
    // pointerdown 用于保住 ProseMirror 图片选择；键盘不会产生 pointer 事件，
    // 因此 Enter/Space 必须走等价路径。preventDefault 避免随后生成第二次 click。
    toolbar.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const button = event.target.closest("button[data-image-align], button[data-image-size], button[data-image-cover]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      Promise.resolve(activateToolbarButton(button)).finally(() => {
        focusEditorAfterKeyboardToolbarAction();
      });
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
    const image = event.target?.closest?.(".ProseMirror img");
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
    const node = activeImageTarget.node;
    const isCover = node.type?.name === MARKDOWN_COVER_IMAGE_NODE_NAME;
    const isPortable = isCover || node.type?.name === PORTABLE_IMAGE_NODE_NAME;
    const title = node.attrs?.title || "";
    const alignment = isPortable ? node.attrs?.alignment || "" : imageAlignmentFromTitle(title);
    const size = isPortable
      ? (node.attrs?.displayWidthPx == null ? "large" : "custom")
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
    // PR C / C2：封面二态——当前封面只显示「取消封面」；合格非封面独立图片
    // 只显示「设为封面」；两种状态互斥且都只有轻量身份（hover/focus/选中时
    // 工具栏出现本身即轻量表达，正文常态不显示永久徽标）。
    const setCoverButton = imageAlignToolbar.querySelector('button[data-image-cover="set"]');
    const removeCoverButton = imageAlignToolbar.querySelector('button[data-image-cover="remove"]');
    const isCurrentCover = isCover;
    const coverState = api.getCoverState();
    if (setCoverButton) {
      setCoverButton.disabled = !supportsBlockPresentation;
      const visible = supportsBlockPresentation && !isCurrentCover && !coverState.duplicate;
      setCoverButton.hidden = !visible;
    }
    if (removeCoverButton) {
      removeCoverButton.disabled = !supportsBlockPresentation;
      const visible = supportsBlockPresentation && isCurrentCover && !coverState.duplicate;
      removeCoverButton.hidden = !visible;
    }
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

  function selectionFromFormatSnapshot(view, snapshot = formatToolbarSelection) {
    if (!view || !snapshot) return view?.state.selection || null;
    const max = view.state.doc.content.size;
    const anchor = Math.max(0, Math.min(Number(snapshot.anchor), max));
    const head = Math.max(0, Math.min(Number(snapshot.head), max));
    return TextSelection.between(view.state.doc.resolve(anchor), view.state.doc.resolve(head));
  }

  function runTextAlignmentCommand(requestedAlignment) {
    const view = getEditorView();
    if (!view || !["left", ...TEXT_ALIGNMENTS].includes(requestedAlignment)) return false;
    const selection = selectionFromFormatSnapshot(view);
    const targetState = alignedTextSelectionState(view.state, selection);
    if (!targetState.supported) return false;
    const desiredAlignment = TEXT_ALIGNMENTS.includes(requestedAlignment) && targetState.alignment === requestedAlignment
      ? "left"
      : requestedAlignment;
    const alignedType = view.state.schema.nodes[ALIGNED_TEXT_NODE_NAME];
    let transaction = view.state.tr;
    let changed = false;
    let restoredAnchor = selection.anchor;
    let restoredHead = selection.head;

    const mapSelectionThroughReplacement = (from, oldSize, newSize, contentOffsetDelta) => {
      const oldTo = from + oldSize;
      const sizeDelta = newSize - oldSize;
      const mapPosition = (position) => {
        if (position <= from) return position;
        if (position >= oldTo) return position + sizeDelta;
        return position + contentOffsetDelta;
      };
      restoredAnchor = mapPosition(restoredAnchor);
      restoredHead = mapPosition(restoredHead);
    };

    [...targetState.targets].reverse().forEach((target) => {
      const node = transaction.doc.nodeAt(target.pos);
      if (!node) return;
      if (node.type === alignedType) {
        if (desiredAlignment === "left") {
          if (node.childCount !== 1) return;
          const child = node.child(0);
          mapSelectionThroughReplacement(target.pos, node.nodeSize, child.nodeSize, -1);
          transaction = transaction.replaceWith(target.pos, target.pos + node.nodeSize, child);
          changed = true;
          return;
        }
        if (node.attrs.alignment === desiredAlignment) return;
        transaction = transaction.setNodeMarkup(target.pos, alignedType, {
          alignment: desiredAlignment,
          sourceSyntax: "github-div-align"
        });
        changed = true;
        return;
      }
      if (desiredAlignment === "left") return;
      const wrapper = alignedType.create({
        alignment: desiredAlignment,
        sourceSyntax: "github-div-align"
      }, node);
      mapSelectionThroughReplacement(target.pos, node.nodeSize, wrapper.nodeSize, 1);
      transaction = transaction.replaceWith(target.pos, target.pos + node.nodeSize, wrapper);
      changed = true;
    });

    if (!changed) return false;
    const maxSelectionPosition = transaction.doc.content.size;
    const anchor = Math.max(0, Math.min(restoredAnchor, maxSelectionPosition));
    const head = Math.max(0, Math.min(restoredHead, maxSelectionPosition));
    transaction = transaction.setSelection(TextSelection.between(
      transaction.doc.resolve(anchor),
      transaction.doc.resolve(head)
    ));
    transaction = closeHistory(transaction);
    view.dispatch(transaction.scrollIntoView());
    markUserInteracted();
    view.focus();
    scheduleFormatToolbarUpdate();
    scheduleTableToolbarUpdate();
    scheduleInsertMenuUpdate();
    scheduleCodeLanguageControlsUpdate();
    return true;
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
      <span class="markdown-format-divider" aria-hidden="true"></span>
      <button type="button" data-text-align="left" aria-label="${t("markdown.alignLeft")}">
        ${IMAGE_ALIGN_ICON_SVG.left}
        <span class="markdown-format-tooltip">${t("markdown.alignLeft")}</span>
      </button>
      <button type="button" data-text-align="center" aria-label="${t("markdown.alignCenter")}">
        ${IMAGE_ALIGN_ICON_SVG.center}
        <span class="markdown-format-tooltip">${t("markdown.alignCenter")}</span>
      </button>
      <button type="button" data-text-align="right" aria-label="${t("markdown.alignRight")}">
        ${IMAGE_ALIGN_ICON_SVG.right}
        <span class="markdown-format-tooltip">${t("markdown.alignRight")}</span>
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
    toolbar.addEventListener("pointerdown", (event) => {
      const button = event.target.closest("button[data-text-align]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      if (button.getAttribute("aria-disabled") === "true") return;
      runTextAlignmentCommand(button.dataset.textAlign || "left");
    });
    toolbar.addEventListener("click", (event) => {
      const alignmentButton = event.target.closest("button[data-text-align]");
      if (alignmentButton) {
        event.preventDefault();
        event.stopPropagation();
        if (event.detail === 0 && alignmentButton.getAttribute("aria-disabled") !== "true") {
          runTextAlignmentCommand(alignmentButton.dataset.textAlign || "left");
        }
        return;
      }
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
    formatToolbarSelection = null;
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
    const selection = selectionFromFormatSnapshot(view);
    const alignmentState = alignedTextSelectionState(view.state, selection);
    formatToolbar.querySelectorAll("button[data-text-align]").forEach((button) => {
      const supported = alignmentState.supported;
      const value = button.dataset.textAlign;
      button.classList.toggle("active", supported && alignmentState.alignment === value);
      button.setAttribute("aria-disabled", supported ? "false" : "true");
      const tooltip = button.querySelector(".markdown-format-tooltip");
      if (tooltip) {
        tooltip.textContent = supported
          ? button.getAttribute("aria-label") || ""
          : t("markdown.textAlignBlockOnly");
      }
    });
  }

  function updateFormatToolbar() {
    formatToolbarFrame = null;
    if (!formatToolbar || !editorReady) return;
    // Find navigation selects a result solely for viewport positioning. It is
    // not a user formatting selection, so the contextual format toolbar must
    // stay hidden until the user moves the caret or selects text themselves.
    if (findPanel && findSelectionActive) {
      hideFormatToolbar();
      return;
    }
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

    formatToolbarSelection = {
      anchor: selection.anchor,
      head: selection.head
    };
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
    const toolbarWidth = formatToolbar.offsetWidth || 352;
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

  function teardownTableToolbar() {
    if (tableToolbarFrame) {
      cancelAnimationFrame(tableToolbarFrame);
      tableToolbarFrame = null;
    }
    if (!tableToolbar) return;
    ["keyup", "mouseup", "focusin", "pointerup"].forEach((eventName) => {
      root.removeEventListener(eventName, scheduleTableToolbarUpdate, true);
    });
    window.removeEventListener("scroll", scheduleTableToolbarUpdate, true);
    window.removeEventListener("resize", scheduleTableToolbarUpdate);
    tableToolbar.remove();
    tableToolbar = null;
    tableToolbarVisible = false;
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
    if (destroyed) return false;
    const handled = editor.action((ctx) => {
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
    if (handled) {
      // History commands are synchronous, so publish the resulting document to
      // the host before undo()/redo() returns. A zero-delay timer is not an
      // ordering guarantee relative to animation frames in Chromium and could
      // leave the tab title/dirty state stale after a tab switch.
      if (markdownChangeTimer) {
        clearTimeout(markdownChangeTimer);
        markdownChangeTimer = null;
      }
      flushMarkdownChangeSync();
    }
    return handled;
  }

  const api = {
    editor,
    /**
     * Codex review R3-1 / R4-2 / R4-3：真实编辑锁（主 Milkdown 运行面）。
     *
     * - 等 view.composing 结束（ProseMirror 的 composition 权威状态源），
     *   组合文本落定后才锁——不用 document.activeElement.isComposing 猜。
     *   R4-3：超时 ≠ 组合结束（compositionend 事件是唯一权威落定信号）。
     *   超时一律返回 false（busy，可重试），绝不强行锁定/序列化截断
     *   组合输入；compositionend 后让出一拍并复核，防止新组合被截断。
     * - flush：序列化当前 doc 并同步 lastNotifiedMarkdown，清掉 pending timer。
     * - `view.setProps({ editable: () => false })`：PM 真实权限边界——
     *   keydown/paste/drop/IME 全部在 editHandlers 里被 view.editable 关断，
     *   contenteditable 属性同步更新（已核对 prosemirror-view 实现）。
     * - 事务门（lockGatePlugin 的 filterTransaction）：程序化入口（工具条/
     *   封面操作/命令 dispatch）在锁定期间事务一律被过滤，零效果。
     *   R4-2：绝不替换/删除 view.dispatch——构造器 bound 方法一旦被
     *   delete，keymap 命令内部裸调用 dispatch 会丢 this 直接 TypeError。
     * 不 blur、不碰焦点、不改全局 textarea——锁定的是本实例。
     * 返回 true = 已锁定（含此前已锁）；false = busy/不可用，调用方应
     * 放弃本次保存窗口并保留编辑状态（可重试）。
     */
    async lockEditing() {
      if (destroyed || editingLocked) return true;
      const view = getEditorView();
      if (!view) return false;
      if (view.composing) {
        const compositionSettled = await new Promise((resolve) => {
          const dom = view.dom;
          let settled = false;
          const finish = (value) => {
            if (settled) return;
            settled = true;
            dom.removeEventListener("compositionend", onEnd);
            clearTimeout(timer);
            resolve(value);
          };
          const onEnd = () => finish(true);
          dom.addEventListener("compositionend", onEnd);
          // R4-3：超时不能代表组合结束（组合落定的权威信号只有
          // compositionend 事件）。超时一律视为未落定，返回 busy 交调用方
          // 重试，绝不强行锁定/序列化截断组合输入。
          const timer = setTimeout(() => finish(false), 2000);
        });
        if (!compositionSettled) return false;
        // compositionend 已到但 PM 可能还有一拍 DOM 落定：让出一个宏任务后
        // 复核，若又进入新组合同样视为未落定。
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (destroyed) return false;
        if (view.composing) return false;
      }
      if (destroyed) return false;
      if (markdownChangeTimer) {
        clearTimeout(markdownChangeTimer);
        markdownChangeTimer = null;
      }
      lastNotifiedMarkdown = serializeCurrentDocument();
      editingLocked = true;
      view.setProps({ editable: () => false });
      return true;
    },
    unlockEditing() {
      if (destroyed || !editingLocked) return;
      editingLocked = false;
      const view = getEditorView();
      if (view) {
        view.setProps({ editable: () => true });
      }
    },
    isEditingLocked() {
      return editingLocked;
    },
    // R3-2：撤销/重做可达资源引用集合（相对/非外链）快照。
    getEverReferencedResources() {
      return [...everReferencedResources];
    },
    getMarkdown() {
      if (markdownChangeTimer) {
        clearTimeout(markdownChangeTimer);
        markdownChangeTimer = null;
      }
      const value = serializeCurrentDocument();
      // 宿主主动读取文档（suspend/保存/切换 tab 时）意味着宿主已获知该内容。
      // 同步 lastNotifiedMarkdown，否则后续 undo/redo 的同步 flush 会因
      // value === lastNotifiedMarkdown 而跳过 onChange，导致宿主侧
      // tab.draft/isDirty/标题状态滞后（B3 tab session 回归）。
      lastNotifiedMarkdown = value;
      return value;
    },
    getBaselineMarkdown() {
      return baselineMarkdown;
    },
    /**
     * PR C / Task C1：封面身份 API（供 C2 的图片工具栏 / `+` 菜单直接调用）。
     *
     * - `setCoverImage(pos)`：把 pos 处的独立图片块包裹为封面；若当前已有封面
     *   A，则在同一个 transaction 内解包 A、包裹 B（A→B 身份转移）。
     * - `removeCover()`：仅移除 marker/wrapper，图片原地保留为普通正文。
     * - `getCoverState()`：读取当前封面身份与结构化诊断。
     *
     * 全部走一次 dispatch / 一个 ProseMirror history step；单次 undo/redo 完整
     * 恢复；不 remount、不重置 baseline、不破坏 selection；composition 期间
     * 拒绝执行；不触发图片删除或资源清理回调。
     */

    /**
     * 包裹 pos 处独立图片块为封面（或 A→B 身份转移）。
     * @param {number} targetPos 目标图片块内任一位置
     * @returns {boolean} 是否已提交
     */
    setCoverImage(targetPos) {
      if (destroyed) return false;
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        if (!view || view.composing) {
          return false;
        }
        // duplicate marker 阻断任何封面身份修改（宿主应已 fallback 到源码编辑，
        // 这里再防御一道，防止其他路径静默创建 wrapper）。
        if (coverDiagnostics.some((d) => d.kind === "duplicate")) {
          return false;
        }
        const state = view.state;
        const target = independentImageBlockAt(state, targetPos);
        if (!target) return false;
        const wrapperType = state.schema.nodes[MARKDOWN_COVER_IMAGE_NODE_NAME];
        if (!wrapperType) return false;
        const cover = findCoverImageNode(state);
        const targetStart = target.blockStart;
        const targetEnd = target.blockEnd;
        const viewportAnchor = captureImageViewportAnchor(view, targetStart);
        let tr = state.tr;
        if (cover) {
          // A→B：同一 transaction 解包 A、包裹 B。先处理位置靠后的节点，
          // 再用 tr.mapping 把靠前替换造成的位置漂移正确映射到新 doc。
          const coverStart = cover.pos;
          const coverEnd = cover.pos + cover.node.nodeSize;
          if (coverStart < targetStart) {
            // A 在前：先包裹 B，再解包 A（A 的 pos 不受 B 替换影响）。
            tr = tr.replaceWith(targetStart, targetEnd, createCoverNode(state.schema, target.attrs));
            tr = tr.replaceWith(coverStart, coverEnd, rebuildImageBlock(state.schema, cover.node.attrs));
          } else {
            // A 在 B 之后：先解包 A，再包裹 B（B 的 pos 不受 A 替换影响）。
            tr = tr.replaceWith(coverStart, coverEnd, rebuildImageBlock(state.schema, cover.node.attrs));
            tr = tr.replaceWith(targetStart, targetEnd, createCoverNode(state.schema, target.attrs));
          }
        } else {
          tr = tr.replaceWith(targetStart, targetEnd, createCoverNode(state.schema, target.attrs));
        }
        // 「设为封面」只改变图片身份，不是导航动作。ProseMirror 会把原 selection
        // 自动映射过 replace steps；不要把光标强制移到目标图片之后，也不要给事务
        // 打上 scrollIntoView meta。否则用户从图片工具栏执行时，正文会为了新的
        // selection 额外滚动一次，表现为页面重定向/抖动。
        view.dispatch(closeHistory(tr));
        // replace transaction 会同步重建节点 DOM；A→B 还会同时重建旧封面。
        // 若只等 localImageSrcPlugin 的 MutationObserver，WKWebView 会先用无法
        // 直接加载的相对 src 完成一次 0 高度布局，再在微任务中恢复图片，引发
        // 宿主滚动锚定。仅在低频封面身份操作后同步解析，避免普通输入时全量扫描。
        view.dom.dispatchEvent(new Event("nutbook:normalize-local-images"));
        const nextCover = findCoverImageNode(view.state);
        if (nextCover) restoreImageViewportAnchor(view, viewportAnchor, nextCover.pos);
        markUserInteracted();
        scheduleFormatToolbarUpdate();
        scheduleTableToolbarUpdate();
        scheduleInsertMenuUpdate();
        return true;
      });
    },
    /**
     * 取消当前封面：仅移除 marker/wrapper，图片原地保留为普通正文。
     * @returns {boolean} 是否已提交
     */
    removeCover() {
      if (destroyed) return false;
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        if (!view || view.composing) {
          return false;
        }
        if (coverDiagnostics.some((d) => d.kind === "duplicate")) {
          return false;
        }
        const cover = findCoverImageNode(view.state);
        if (!cover) return false;
        const viewportAnchor = captureImageViewportAnchor(view, cover.pos);
        const block = rebuildImageBlock(view.state.schema, cover.node.attrs);
        let tr = view.state.tr.replaceWith(
          cover.pos,
          cover.pos + cover.node.nodeSize,
          block
        );
        // 取消封面同样只改变身份；保留 transaction 自动映射后的 selection 和当前
        // viewport，避免工具栏操作引发一次无意的页面滚动。
        view.dispatch(closeHistory(tr));
        view.dom.dispatchEvent(new Event("nutbook:normalize-local-images"));
        restoreImageViewportAnchor(view, viewportAnchor, cover.pos);
        markUserInteracted();
        scheduleFormatToolbarUpdate();
        scheduleTableToolbarUpdate();
        scheduleInsertMenuUpdate();
        return true;
      });
    },
    /**
     * 读取当前封面身份与结构化诊断。
     * @returns {{hasCover:boolean, valid:boolean, duplicate:boolean,
     *   diagnostics:Array<{kind:string,count?:number}>, nodeKind:string|null,
     *   pos:number|null, src:string|null}}
     */
    getCoverState() {
      if (destroyed) {
        return { hasCover: false, valid: false, duplicate: false, diagnostics: [], nodeKind: null, pos: null, src: null };
      }
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const cover = findCoverImageNode(view.state);
        const duplicate = coverDiagnostics.some((d) => d.kind === "duplicate");
        return {
          hasCover: Boolean(cover),
          valid: Boolean(cover) && !duplicate,
          duplicate,
          diagnostics: coverDiagnostics.map((d) => ({ ...d })),
          nodeKind: cover?.node.attrs.nodeKind ?? null,
          pos: cover?.pos ?? null,
          src: cover?.node.attrs.src ?? null
        };
      });
    },
    /**
     * 枚举文档中所有合格「独立图片块」候选（不含当前封面 wrapper）。
     *
     * C2 的「设为封面」/hover 身份判定需要枚举候选；返回块起始 pos，
     * 可直接传给 `setCoverImage(pos)`。
     * @returns {Array<{pos:number, nodeKind:string, src:string, alt:string}>}
     */
    getCoverableImageBlocks() {
      if (destroyed) return [];
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const blocks = [];
        view.state.doc.descendants((node, pos) => {
          if (node.type.name === PORTABLE_IMAGE_NODE_NAME && node.attrs?.src) {
            blocks.push({ pos, nodeKind: "portable-image", src: String(node.attrs.src), alt: String(node.attrs.alt || "") });
            return true;
          }
          if (node.type.name === "paragraph" && node.childCount === 1) {
            const child = node.firstChild;
            if (child.type.name === "image") {
              // link 是 mark：带 link mark 的独立图片是 linked-image 候选。
              const linkMark = imageLinkMark(child);
              blocks.push({
                pos,
                nodeKind: linkMark ? "linked-image" : "image",
                src: String(child.attrs.src || ""),
                alt: String(child.attrs.alt || "")
              });
            }
          }
          return true;
        });
        return blocks;
      });
    },
    /**
     * 通过一次 ProseMirror transaction 修改文档标题（B3）。
     *
     * - 已有有效顶层 H1（含 `aligned_text_block` 内部 H1）→ 替换该 heading 文本。
     * - 无有效 H1 → 在正文首部插入 H1（YAML frontmatter 已被拆分到编辑器
     *   外，因此正文首部即 frontmatter 之后）。
     * - 一次 dispatch 进入 history，成为一个可撤销步骤。
     * - 不销毁、不重建、不重新挂载编辑器；不重置 baseline。
     *
     * @param {string} nextTitle
     * @returns {boolean} 是否已提交（空标题或正在 composition 时返回 false）
     */
    setDocumentTitle(nextTitle) {
      if (destroyed) return false;
      const title = String(nextTitle || "").trim();
      if (!title) {
        return false;
      }
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        if (!view || view.composing) {
          return false;
        }
        const state = view.state;
        const { doc } = state;
        const target = findFirstEffectiveHeading(doc, state.schema);
        if (target && target.node.textContent.trim() === title) {
          // 标题未变化：不 dispatch，避免产生"无变化"的 history 步骤。
          // （用户 blur 提交后再次 blur / 保存收敛路径可能以相同值重复提交，
          // 若每次都替换会堆出无意义 undo 条目——undo 一次无视觉变化，
          // 看起来"⌘Z 需要两次才恢复"。）
          return false;
        }
        let tr = state.tr;
        if (target) {
          const textNode = state.schema.text(title);
          const heading = target.node.type.create(target.node.attrs, textNode);
          tr = tr.replaceWith(target.pos, target.pos + target.node.nodeSize, heading);
        } else {
          const heading = state.schema.nodes.heading.create({ level: 1 }, state.schema.text(title));
          // 无有效 H1：插入到正文首部（frontmatter 已被拆分到编辑器外）。
          // Milkdown 的 doc content 从 pos 0 开始；空文档/空段落会被序列化为
          // `<br />`，因此空段落用 heading 替换，非空文档在 doc 开头插入。
          const first = doc.firstChild;
          if (first && first.type.name === "paragraph" && first.textContent.trim() === "") {
            tr = tr.replaceWith(0, first.nodeSize, heading);
          } else {
            tr = tr.insert(0, heading);
          }
        }
        // 标题修改必须是独立 history 步骤：close 当前 open event，
        // 防止与编辑器内的连续输入被 prosemirror-history 合并成一步。
        view.dispatch(closeHistory(tr));
        markUserInteracted();
        view.focus();
        return true;
      });
    },
    /**
     * 读取当前编辑器文档的权威标题（第一个有效顶层 H1 的纯文本）。
     * @returns {string|null} 无有效 H1 时返回 null
     */
    getDocumentTitle() {
      if (destroyed) return null;
      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        if (!view) {
          return null;
        }
        const target = findFirstEffectiveHeading(view.state.doc, view.state.schema);
        return target ? target.node.textContent.trim() : null;
      });
    },
    hasChanges() {
      return hasDocumentChanges || userInteracted;
    },
    setTableToolsEnabled(enabled) {
      if (destroyed) return;
      tableToolsEnabled = Boolean(enabled);
      if (tableToolsEnabled) {
        setupTableToolbar();
        scheduleTableToolbarUpdate();
      } else {
        teardownTableToolbar();
      }
    },
    undo() {
      return runHistoryCommand(undo);
    },
    redo() {
      return runHistoryCommand(redo);
    },
    openFind,
    closeFind,
    focus() {
      if (destroyed) return;
      editor.action((ctx) => {
        ctx.get(editorViewCtx).focus();
      });
    },
    blur() {
      if (destroyed) return;
      editor.action((ctx) => {
        ctx.get(editorViewCtx).dom.blur();
      });
    },
    focusAtText(anchorText, offsetHint = 0) {
      if (destroyed) return false;
      const normalizedAnchor = normalizeText(anchorText);
      if (!normalizedAnchor) {
        api.focus();
        return false;
      }

      return editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        let resolvedPos = null;
        view.state.doc.descendants((node, pos) => {
          if (resolvedPos !== null) return false;
          // 封面 wrapper / portable 等 atom 节点没有文本，跳过并继续，
          // 不能因首个块是 atom 就停止遍历。
          if (!node.isText) return true;
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
      destroyed = true;
      if (findPanel) findPanel.remove();
      root.removeEventListener("keydown", handleFindShortcut, true);
      window.removeEventListener("scroll", scheduleFindPanelPosition, true);
      window.removeEventListener("resize", scheduleFindPanelPosition);
      if (findPanelFrame) cancelAnimationFrame(findPanelFrame);
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
      teardownTableToolbar();
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
  },
  // 权威标题语义的静态入口（与 dist/assets/markdown-document-title.js 同一实现）。
  parseDocumentTitle,
  setDocumentTitleInSource
};
