import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { validateConfig } from "./motion/contract.mjs";

const ROOT_KEYS = new Set(["schemaVersion", "projectRoot", "entries"]);
const ENTRY_KEYS = new Set(["id", "path", "state", "skill", "kind", "title", "generatedAt", "relatedFiles", "editContract", "savePolicy", "supersededBy"]);
const SKILL_KEYS = new Set(["name", "version"]);
const RELATED_KEYS = new Set(["path", "role"]);
const PRIMARY_EXTENSIONS = new Set([".md", ".markdown", ".html", ".htm"]);
const HTML_EXTENSIONS = new Set([".html", ".htm"]);
const EDITABLE_TYPES = new Set(["text", "rich-text", "image", "background-image"]);
const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
const SHORT_RICH_TAGS = new Set(["br", "strong", "em", "code"]);
const CONTENT_RICH_TAGS = new Set(["p", "br", "strong", "em", "code", "h1", "h2", "h3", "h4", "ul", "ol", "li"]);
const ALIGNED_RICH_TAGS = new Set(["p", "h1", "h2", "h3", "h4"]);

function tagAttributes(token) {
  const attributes = new Map();
  const nameEnd = token.search(/\s|\/?\s*>/u);
  const source = nameEnd >= 0 ? token.slice(nameEnd) : "";
  const pattern = /\s([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/gu;
  for (const match of source.matchAll(pattern)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? "");
  }
  return attributes;
}

function visibleTextSnippet(value) {
  const text = value.replace(/\s+/gu, " ").trim();
  return text ? text.slice(0, 80) : "";
}

function validateRichTextDescendant(token, name, target, label) {
  const allowedTags = target.editRole === "short" ? SHORT_RICH_TAGS : CONTENT_RICH_TAGS;
  if (!allowedTags.has(name)) {
    throw new Error(`${label} rich-text target ${target.id} contains markup Nutbook cannot preserve: <${name}>`);
  }
  const attributes = tagAttributes(token);
  if (!attributes.size) return;
  const style = attributes.get("style");
  const validAlignment = target.editRole === "content"
    && ALIGNED_RICH_TAGS.has(name)
    && attributes.size === 1
    && /^text-align:(?:left|center|right)$/u.test(style || "");
  if (!validAlignment) {
    throw new Error(`${label} rich-text target ${target.id} contains attributes Nutbook cannot preserve on <${name}>`);
  }
}

export function validateEditableHtmlContract(source, label = "HTML") {
  const sanitized = source
    .replace(/<!--[\s\S]*?-->/gu, "")
    .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/giu, "");
  const tagPattern = /<![^>]*>|<\/?[A-Za-z][^>]*>/gu;
  const stack = [];
  const ids = new Set();
  let rootMarkerFound = false;
  let targetCount = 0;
  let cursor = 0;

  const inBody = () => stack.some((frame) => frame.tag === "body");
  const activeTarget = () => [...stack].reverse().find((frame) => frame.targetType);
  for (const match of sanitized.matchAll(tagPattern)) {
    const text = sanitized.slice(cursor, match.index);
    const snippet = visibleTextSnippet(text);
    if (snippet && inBody() && !activeTarget()?.coversText) {
      throw new Error(`${label} has visible text outside an editable target: ${snippet}`);
    }
    cursor = match.index + match[0].length;
    const token = match[0];
    if (token.startsWith("<!")) continue;
    const closing = /^<\//u.test(token);
    const name = token.match(/^<\/?([A-Za-z][^\s/>]*)/u)?.[1]?.toLowerCase();
    if (!name) continue;
    if (closing) {
      const index = stack.map((frame) => frame.tag).lastIndexOf(name);
      if (index >= 0) stack.splice(index);
      continue;
    }

    const parentTarget = activeTarget();
    const attributes = tagAttributes(token);
    const targetType = attributes.get("data-editable") || null;
    if (parentTarget?.targetType === "text") {
      throw new Error(`${label} text target ${parentTarget.id} must not contain child elements`);
    }
    if (targetType && parentTarget) throw new Error(`${label} contains nested editable targets`);
    if (!targetType && parentTarget?.targetType === "rich-text") {
      validateRichTextDescendant(token, name, parentTarget, label);
    }
    if (name === "html" && attributes.get("data-nutbook-edit-contract") === "nutbook-html/v1") {
      rootMarkerFound = true;
    }
    let target = null;
    if (targetType) {
      if (!EDITABLE_TYPES.has(targetType)) throw new Error(`${label} has unsupported data-editable type: ${targetType}`);
      const id = attributes.get("data-id") || "";
      if (!id) throw new Error(`${label} editable target is missing data-id`);
      if (ids.has(id)) throw new Error(`${label} has duplicate editable data-id: ${id}`);
      ids.add(id);
      const editRole = attributes.get("data-edit-role") || "";
      if (targetType === "rich-text" && !new Set(["short", "content"]).has(editRole)) {
        throw new Error(`${label} rich-text target ${id} requires data-edit-role short or content`);
      }
      if (targetType === "image" && name !== "img") throw new Error(`${label} image target ${id} must be an img element`);
      target = { id, targetType, editRole, coversText: targetType === "text" || targetType === "rich-text" };
      targetCount += 1;
    }
    if ((inBody() || name === "body") && name === "img" && targetType !== "image") {
      throw new Error(`${label} has an image outside an editable image target`);
    }
    if (!VOID_ELEMENTS.has(name) && !/\/\s*>$/u.test(token)) {
      stack.push({ tag: name, ...(target || {}) });
    }
  }
  const trailing = visibleTextSnippet(sanitized.slice(cursor));
  if (trailing && inBody() && !activeTarget()?.coversText) {
    throw new Error(`${label} has visible text outside an editable target: ${trailing}`);
  }
  if (!rootMarkerFound) throw new Error(`${label} is missing the nutbook-html/v1 root marker`);
  if (!targetCount) throw new Error(`${label} has no editable targets`);
}

export function validatePresentationHtmlContract(source, label = "HTML") {
  const htmlOpen = source.match(/<html\b[^>]*>/iu)?.[0] || "";
  if (tagAttributes(htmlOpen).get("data-nutbook-artifact-kind") !== "presentation") {
    throw new Error(`${label} is missing the presentation intent marker on <html>`);
  }
  const bodyMarkup = source.replace(/<!--[\s\S]*?-->/gu, "").replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/giu, "");
  const ids = [...bodyMarkup.matchAll(/<[^>]+\bdata-nutbook-page-id\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>/giu)]
    .map((match) => match[1] ?? match[2]);
  if (!ids.length || ids.length > 500 || ids.some((id) => !id.trim() || Buffer.byteLength(id) > 256) || new Set(ids).size !== ids.length) {
    throw new Error(`${label} has empty or duplicate data-nutbook-page-id values`);
  }
  const notes = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/giu)]
    .filter((match) => tagAttributes(`<script ${match[1]}>`).get("id") === "nutbook-presentation-notes");
  if (notes.length !== 1 || tagAttributes(`<script ${notes[0][1]}>`).get("type") !== "application/json") {
    throw new Error(`${label} needs one application/json nutbook-presentation-notes block`);
  }
  let parsed;
  try { parsed = JSON.parse(notes[0][2]); } catch { throw new Error(`${label} has invalid presentation notes JSON`); }
  if (parsed?.version !== 1 || !parsed.pages || typeof parsed.pages !== "object" || Array.isArray(parsed.pages)) {
    throw new Error(`${label} has invalid presentation notes structure`);
  }
  let noteBytes = 0;
  for (const [id, paragraphs] of Object.entries(parsed.pages)) {
    if (!ids.includes(id) || !Array.isArray(paragraphs) || paragraphs.length > 100 || paragraphs.some((item) => item?.type !== "paragraph" || !Array.isArray(item.runs) || item.runs.length > 100 || item.runs.some((run) => typeof run?.text !== "string" || Buffer.byteLength(run.text) > 10_000 || (run.bold !== undefined && typeof run.bold !== "boolean")))) {
      throw new Error(`${label} has invalid notes for page ${id}`);
    }
    for (const paragraph of paragraphs) for (const run of paragraph.runs) noteBytes += Buffer.byteLength(run.text);
    if (noteBytes > 512 * 1024) throw new Error(`${label} has presentation notes over 512 KiB`);
  }
  if (!/window\.__NUTBOOK_PRESENTATION__\s*=/u.test(source)
    || !/managedPresenter\s*:\s*true/u.test(source)
    || !/\bgoTo\s*\(/u.test(source)
    || !/\bsubscribe\s*\(/u.test(source)
    || !/\bsetManagedMode\s*\(/u.test(source)) {
    throw new Error(`${label} is missing a required presentation bridge declaration`);
  }
}

// Static declaration check only; NUTBOOK still probes the actual runtime DOM.
export function validateMotionHtmlContract(source, label = "HTML") {
  const cleaned = source.replace(/<!--[\s\S]*?-->/gu, "");
  const markup = cleaned.replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/giu, "");
  const root = tagAttributes(markup.match(/<html\b[^>]*>/iu)?.[0] || "");
  const blocks = [...cleaned.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/giu)]
    .filter(match => tagAttributes(`<script ${match[1]}>`).get('id') === 'nutbook-motion-config');
  if (!root.has('data-nutbook-motion-contract') && !blocks.length) return;
  if (root.get('data-nutbook-motion-contract') !== 'nutbook-motion/v1' || blocks.length !== 1) throw new Error(`${label} needs a supported motion root and one config block`);
  const attrs = tagAttributes(`<script ${blocks[0][1]}>`);
  if (attrs.get('type') !== 'application/json' || attrs.get('data-id') !== 'nutbook-motion-config' || Buffer.byteLength(blocks[0][2]) > 256 * 1024) throw new Error(`${label} has an invalid motion config block`);
  const config = JSON.parse(blocks[0][2]);
  validateConfig(config);
  const pages = [], targets = new Map(), stack = [];
  for (const match of markup.matchAll(/<\/?[A-Za-z][^>]*>/gu)) {
    const token = match[0], name = token.match(/^<\/?([^\s/>]+)/u)[1].toLowerCase();
    if (token.startsWith('</')) {
      const at = stack.map(frame => frame.name).lastIndexOf(name);
      if (at >= 0) stack.splice(at);
      continue;
    }
    const attributes = tagAttributes(token);
    let pageId = [...stack].reverse().find(frame => frame.pageId)?.pageId;
    if (attributes.has('data-nutbook-page-id')) {
      if (pageId) throw new Error(`${label} has nested motion pages`);
      pageId = attributes.get('data-nutbook-page-id'); pages.push(pageId);
    }
    const id = attributes.get('data-id');
    if (id) {
      if (targets.has(id)) throw new Error(`${label} has duplicate data-id ${id}`);
      targets.set(id, { name, attributes, pageId });
    }
    if (pageId && ['video', 'iframe'].includes(name)) {
      const page = config.pages.find(page => page.id === pageId);
      const ids = name === 'video' ? page?.capabilities.mediaTargetIds : page?.capabilities.embeddedTargetIds;
      if (!id || !ids?.includes(id)) throw new Error(`${label} has undeclared motion media`);
    }
    if (!VOID_ELEMENTS.has(name) && !/\/\s*>$/u.test(token)) stack.push({ name, pageId });
  }
  if (JSON.stringify(pages) !== JSON.stringify(config.pages.map(page => page.id))) throw new Error(`${label} motion pages must match DOM order`);
  for (const page of config.pages) for (const target of page.targets) {
    const node = targets.get(target.id), editable = node?.attributes.get('data-editable');
    const compatible = target.kind === 'text' ? ['text', 'rich-text'].includes(editable)
      : target.kind === 'image' ? node?.name === 'img' && editable === 'image'
      : target.kind === 'group' ? node?.attributes.get('data-nutbook-motion-group') === 'true'
      : node?.name === (target.kind === 'embedded' ? 'iframe' : 'video');
    if (!compatible || node.pageId !== page.id) throw new Error(`${label} motion target ${target.id} does not match its DOM page/type`);
  }
}

export function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`unexpected argument: ${token}`);
    const key = token.slice(2);
    if (key === "help" || key === "self-test" || key === "dry-run") {
      options[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`missing value for --${key}`);
    index += 1;
    if (key === "related") {
      options.related = [...(options.related || []), value];
    } else if (Object.hasOwn(options, key)) {
      throw new Error(`duplicate option: --${key}`);
    } else {
      options[key] = value;
    }
  }
  return options;
}

export function required(options, key) {
  const value = options[key];
  if (typeof value !== "string" || value.length === 0) throw new Error(`missing required option --${key}`);
  return value;
}

export function resolveProjectRoot(input) {
  const root = realpathSync(resolve(input));
  if (!statSync(root).isDirectory()) throw new Error(`project root is not a directory: ${root}`);
  return root;
}

export function manifestPath(projectRoot) {
  return join(projectRoot, ".agent-outputs", "manifest.json");
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
}

function rejectUnknownKeys(value, allowed, label) {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) throw new Error(`${label} contains unknown field: ${unknown[0]}`);
}

function validateRelativePath(value, label) {
  if (typeof value !== "string" || !value || value.length > 4096) throw new Error(`${label} must be a non-empty relative path`);
  if (value.includes("\0") || value.includes("\\") || isAbsolute(value) || /^[A-Za-z]:\//.test(value)) throw new Error(`${label} must use safe relative POSIX syntax`);
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) throw new Error(`${label} contains an unsafe path segment`);
}

function assertContainedExistingFile(projectRoot, value, label, allowMissing = false) {
  const absolute = join(projectRoot, ...value.split("/"));
  let canonical;
  try {
    canonical = realpathSync(absolute);
  } catch (error) {
    if (!allowMissing || error.code !== "ENOENT") throw error;
    // Walk existing ancestors, including symlinks, before accepting a missing
    // retirement target. A dangling/outside symlink is never a missing file.
    let ancestor = absolute;
    while (ancestor !== projectRoot) {
      try {
        lstatSync(ancestor);
        const resolved = realpathSync(ancestor);
        const rel = relative(projectRoot, resolved);
        if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`${label} resolves outside the project root`);
        if (!statSync(resolved).isDirectory()) throw new Error(`${label} ancestor is not a directory`);
        return;
      } catch (ancestorError) {
        if (ancestorError.code !== "ENOENT") throw ancestorError;
        // lstat succeeds for dangling symlinks; explicitly reject them.
        try { if (lstatSync(ancestor).isSymbolicLink()) throw new Error(`${label} has a dangling symlink`); }
        catch (linkError) { if (linkError.code !== "ENOENT") throw linkError; }
        ancestor = dirname(ancestor);
      }
    }
    return;
  }
  const rel = relative(projectRoot, canonical);
  if (!rel || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new Error(`${label} resolves outside the project root`);
  if (!statSync(canonical).isFile()) throw new Error(`${label} is not a file`);
}

function validateSkill(skill, label) {
  assertObject(skill, label);
  rejectUnknownKeys(skill, SKILL_KEYS, label);
  if (typeof skill.name !== "string" || !/^[a-z0-9][a-z0-9._-]{0,127}$/.test(skill.name)) throw new Error(`${label}.name is invalid`);
  if (skill.version !== undefined && (typeof skill.version !== "string" || !skill.version || skill.version.length > 64)) throw new Error(`${label}.version is invalid`);
}

export function validateRelocationPath(projectRoot, path, allowMissing = false) {
  validateRelativePath(path, "relocation path");
  assertContainedExistingFile(projectRoot, path, "relocation path", allowMissing);
}

export function validateManifest(manifest, projectRoot, options = {}) {
  const validateActiveHtml = options.validateActiveHtml === true;
  const canonicalProjectRoot = realpathSync(projectRoot);
  assertObject(manifest, "manifest");
  rejectUnknownKeys(manifest, ROOT_KEYS, "manifest");
  if (manifest.schemaVersion !== 1) throw new Error("manifest.schemaVersion must be 1");
  if (manifest.projectRoot !== ".") throw new Error('manifest.projectRoot must be "."');
  if (!Array.isArray(manifest.entries)) throw new Error("manifest.entries must be an array");
  const ids = new Set();
  const activePaths = new Set();
  for (const [index, entry] of manifest.entries.entries()) {
    const label = `manifest.entries[${index}]`;
    assertObject(entry, label);
    // Registration checks the current delivery strictly, while preserving
    // unrelated stale references without making filesystem drift a blocker.
    const allowMissing = options.allowMissingFiles === true && !options.requiredFileIds?.has(entry.id);
    rejectUnknownKeys(entry, ENTRY_KEYS, label);
    if (typeof entry.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(entry.id)) throw new Error(`${label}.id is invalid`);
    if (ids.has(entry.id)) throw new Error(`duplicate entry id: ${entry.id}`);
    ids.add(entry.id);
    validateRelativePath(entry.path, `${label}.path`);
    if (!new Set(["active", "superseded", "removed"]).has(entry.state)) throw new Error(`${label}.state is invalid`);
    validateSkill(entry.skill, `${label}.skill`);
    if (!new Set(["document", "report", "presentation", "interactive"]).has(entry.kind)) throw new Error(`${label}.kind is invalid`);
    if (entry.title !== undefined && (typeof entry.title !== "string" || !entry.title || entry.title.length > 200)) throw new Error(`${label}.title is invalid`);
    if (entry.generatedAt !== undefined && (typeof entry.generatedAt !== "string" || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(entry.generatedAt) || !Number.isFinite(Date.parse(entry.generatedAt)))) throw new Error(`${label}.generatedAt must be RFC 3339`);
    const extension = extname(entry.path).toLowerCase();
    if (!PRIMARY_EXTENSIONS.has(extension)) throw new Error(`${label}.path must be Markdown or HTML`);
    if (entry.state === "active") {
      if (activePaths.has(entry.path)) throw new Error(`duplicate active path: ${entry.path}`);
      activePaths.add(entry.path);
      assertContainedExistingFile(canonicalProjectRoot, entry.path, `${label}.path`, allowMissing || entry.id === options.retiringId || options.relocatingPaths?.has(entry.path));
    } else if (options.relocatingPaths?.has(entry.path) || existsSync(join(projectRoot, ...entry.path.split("/")))) {
      assertContainedExistingFile(canonicalProjectRoot, entry.path, `${label}.path`, options.relocatingPaths?.has(entry.path));
    }
    const isHtml = HTML_EXTENSIONS.has(extension);
    if (entry.editContract !== undefined && entry.editContract !== "nutbook-html/v1") throw new Error(`${label}.editContract is invalid`);
    if (entry.editContract && !isHtml) throw new Error(`${label}.editContract requires HTML`);
    if (entry.savePolicy !== undefined && !new Set(["copy", "managed-source"]).has(entry.savePolicy)) throw new Error(`${label}.savePolicy is invalid`);
    if (entry.savePolicy === "managed-source" && entry.editContract !== "nutbook-html/v1") throw new Error(`${label}.managed-source requires nutbook-html/v1`);
    if (!isHtml && entry.savePolicy !== undefined) throw new Error(`${label}.savePolicy requires HTML`);
    if (validateActiveHtml && entry.state === "active" && isHtml) {
      if (entry.editContract !== "nutbook-html/v1" || entry.savePolicy !== "managed-source") {
        throw new Error(`${label} active HTML requires nutbook-html/v1 managed-source editing`);
      }
      const htmlPath = join(canonicalProjectRoot, ...entry.path.split("/"));
      const source = readFileSync(htmlPath, "utf8");
      validateEditableHtmlContract(source, `${label}.path`);
      if (entry.kind === "presentation") validatePresentationHtmlContract(source, `${label}.path`);
    }
    if (entry.state === "superseded") {
      if (typeof entry.supersededBy !== "string" || entry.supersededBy === entry.id) throw new Error(`${label}.supersededBy is invalid`);
    } else if (entry.supersededBy !== undefined) {
      throw new Error(`${label}.supersededBy is only valid for superseded entries`);
    }
    const relatedPaths = new Set();
    if (entry.relatedFiles !== undefined && !Array.isArray(entry.relatedFiles)) throw new Error(`${label}.relatedFiles must be an array`);
    for (const [relatedIndex, relatedFile] of (entry.relatedFiles || []).entries()) {
      const relatedLabel = `${label}.relatedFiles[${relatedIndex}]`;
      assertObject(relatedFile, relatedLabel);
      rejectUnknownKeys(relatedFile, RELATED_KEYS, relatedLabel);
      validateRelativePath(relatedFile.path, `${relatedLabel}.path`);
      if (!new Set(["asset", "data", "attachment"]).has(relatedFile.role)) throw new Error(`${relatedLabel}.role is invalid`);
      if (relatedFile.path === entry.path || relatedPaths.has(relatedFile.path)) throw new Error(`${relatedLabel}.path is duplicated`);
      relatedPaths.add(relatedFile.path);
      assertContainedExistingFile(canonicalProjectRoot, relatedFile.path, `${relatedLabel}.path`, allowMissing || options.relocatingPaths?.has(relatedFile.path));
    }
  }
  for (const entry of manifest.entries) {
    if (entry.state === "superseded" && !ids.has(entry.supersededBy)) throw new Error(`superseded target does not exist: ${entry.supersededBy}`);
  }
  return manifest;
}

export function validateEntryHtmlContract(entry, projectRoot, label = `entry ${entry?.id || "unknown"}`) {
  if (!entry || entry.state !== "active" || !HTML_EXTENSIONS.has(extname(entry.path || "").toLowerCase())) return;
  if (entry.editContract !== "nutbook-html/v1" || entry.savePolicy !== "managed-source") {
    throw new Error(`${label} active HTML requires nutbook-html/v1 managed-source editing`);
  }
  const canonicalProjectRoot = realpathSync(projectRoot);
  const htmlPath = join(canonicalProjectRoot, ...entry.path.split("/"));
  const source = readFileSync(htmlPath, "utf8");
  validateEditableHtmlContract(source, `${label}.path`);
  if (entry.kind === "presentation") validatePresentationHtmlContract(source, `${label}.path`);
  validateMotionHtmlContract(source, `${label}.path`);
}

export function activeHtmlContractIssues(manifest, projectRoot) {
  validateManifest(manifest, projectRoot);
  const issues = [];
  for (const entry of manifest.entries) {
    try {
      validateEntryHtmlContract(entry, projectRoot, `entry ${entry.id}`);
    } catch (error) {
      issues.push({ id: entry.id, path: entry.path, message: error.message });
    }
  }
  return issues;
}

export function validateActiveHtmlContracts(manifest, projectRoot) {
  const issues = activeHtmlContractIssues(manifest, projectRoot);
  if (issues.length) {
    throw new Error(issues.map((issue) => `${issue.id} (${issue.path}): ${issue.message}`).join("; "));
  }
  return manifest;
}

export function readManifest(projectRoot, options = {}) {
  const path = manifestPath(projectRoot);
  if (!existsSync(path)) return { schemaVersion: 1, projectRoot: ".", entries: [] };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`manifest is not valid JSON: ${error.message}`);
  }
  return validateManifest(parsed, projectRoot, options);
}

export function readManifestStrict(projectRoot) {
  const manifest = readManifest(projectRoot);
  return validateActiveHtmlContracts(manifest, projectRoot);
}

export function readManifestForSupersede(projectRoot, retiringId) {
  return readManifest(projectRoot, { retiringId, allowMissingFiles: true });
}

export function writeManifestAtomic(projectRoot, manifest, options = {}) {
  validateManifest(manifest, projectRoot, options);
  const destination = manifestPath(projectRoot);
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  if (existsSync(destination) && readFileSync(destination, "utf8") === serialized) return;
  mkdirSync(dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}-${randomUUID()}`;
  let fd;
  try {
    fd = openSync(temporary, "wx", 0o600);
    writeFileSync(fd, serialized, "utf8");
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(temporary, destination);
    try {
      const directoryFd = openSync(dirname(destination), "r");
      fsyncSync(directoryFd);
      closeSync(directoryFd);
    } catch {}
    readManifest(projectRoot, options);
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

export async function withManifestLock(projectRoot, operation) {
  const outputDirectory = join(projectRoot, ".agent-outputs");
  mkdirSync(outputDirectory, { recursive: true });
  const lockPath = join(outputDirectory, ".manifest.lock");
  const token = randomUUID();
  const ownerName = `owner-${token}.json`;
  const prepared = join(outputDirectory, `.manifest-lock-${token}`);
  const deadline = Date.now() + 10_000;
  let acquired = false;
  try {
    // Publish an already populated directory atomically. A denied owner write
    // or process exit during preparation cannot strand the shared lock path.
    mkdirSync(prepared, { mode: 0o700 });
    writeFileSync(join(prepared, ownerName), `${JSON.stringify({ pid: process.pid, hostname: hostname(), token, createdAt: new Date().toISOString() })}\n`, { flag: "wx", mode: 0o600 });
    while (!acquired) {
      try {
        renameSync(prepared, lockPath);
        acquired = true;
      } catch (error) {
        const collision = ["EEXIST", "ENOTEMPTY"].includes(error.code)
          || (process.platform === "win32" && ["EPERM", "EACCES"].includes(error.code) && existsSync(lockPath));
        if (!collision) throw error;
        recoverAbandonedManifestLock(lockPath);
        if (Date.now() >= deadline) throw new Error("manifest is busy in another process; retry registration after it finishes");
        await new Promise((resolveWait) => setTimeout(resolveWait, 25 + Math.floor(Math.random() * 50)));
      }
    }
    return await operation();
  } finally {
    // Only remove this attempt's unique marker, never another writer's owner.
    const directory = acquired ? lockPath : prepared;
    try { unlinkSync(join(directory, ownerName)); } catch (error) { if (error.code !== "ENOENT") throw error; }
    try { rmdirSync(directory); } catch (error) { if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(error.code)) throw error; }
  }
}

function recoverAbandonedManifestLock(lockPath) {
  try {
    const directory = lstatSync(lockPath);
    if (!directory.isDirectory() || directory.isSymbolicLink()) throw new Error("manifest lock must be a real directory");
    for (const name of readdirSync(lockPath)) {
      // Recognize legacy locks too; unknown contents are never removed.
      if (name !== "owner.json" && !/^owner-[0-9a-f-]{36}\.json$/u.test(name)) continue;
      const path = join(lockPath, name);
      let owner;
      try {
        if (!lstatSync(path).isFile() || lstatSync(path).isSymbolicLink()) continue;
        owner = JSON.parse(readFileSync(path, "utf8"));
      } catch (error) { if (error.code === "ENOENT" || error instanceof SyntaxError) continue; throw error; }
      if (!owner || !Number.isSafeInteger(owner.pid) || owner.pid <= 0 || (owner.hostname && owner.hostname !== hostname())) continue;
      try { process.kill(owner.pid, 0); continue; } catch (error) { if (error.code !== "ESRCH") continue; }
      // New owners have unique filenames and published locks are nonempty.
      // Concurrent recovery cannot unlink a replacement owner's marker, and
      // rmdir cannot remove a replacement lock while its owner is present.
      const current = lstatSync(lockPath);
      if (current.dev !== directory.dev || current.ino !== directory.ino) return;
      try { unlinkSync(path); } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    try { rmdirSync(lockPath); } catch (error) { if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(error.code)) throw error; }
  } catch (error) { if (error.code !== "ENOENT") throw error; }
}

export function entryFromOptions(options, idKey = "id") {
  const entry = {
    id: required(options, idKey),
    path: required(options, "path"),
    state: "active",
    skill: { name: required(options, "skill") },
    kind: required(options, "kind"),
  };
  if (options["skill-version"]) entry.skill.version = options["skill-version"];
  if (options.title) entry.title = options.title;
  if (options["generated-at"]) entry.generatedAt = options["generated-at"];
  if (options["edit-contract"]) entry.editContract = options["edit-contract"];
  if (options["save-policy"]) entry.savePolicy = options["save-policy"];
  if (HTML_EXTENSIONS.has(extname(entry.path).toLowerCase())) {
    if (entry.editContract && entry.editContract !== "nutbook-html/v1") throw new Error("HTML edit contract must be nutbook-html/v1");
    if (entry.savePolicy && entry.savePolicy !== "managed-source") throw new Error("nbskill HTML save policy must be managed-source");
    entry.editContract = "nutbook-html/v1";
    entry.savePolicy = "managed-source";
  }
  if (options.related) entry.relatedFiles = options.related.map((value) => {
    const separator = value.lastIndexOf(":");
    if (separator <= 0) throw new Error(`--related must use path:role: ${value}`);
    return { path: value.slice(0, separator), role: value.slice(separator + 1) };
  });
  return entry;
}

export function upsertActiveEntry(manifest, entry) {
  const existingIndex = manifest.entries.findIndex((candidate) => candidate.id === entry.id);
  if (existingIndex >= 0) {
    const existing = manifest.entries[existingIndex];
    if (existing.state !== "active" || existing.path !== entry.path) throw new Error(`entry id ${entry.id} is immutable; use supersede for a new path`);
    manifest.entries[existingIndex] = entry;
  } else {
    manifest.entries.push(entry);
  }
  return manifest;
}
