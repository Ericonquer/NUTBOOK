// Data-only contract. DOM probing is a separate, more restrictive boundary.
import registry from './registry.json' with { type: 'json' };
export { registry };
export const CONTRACT = 'nutbook-motion/v1';
const idPattern = /^[A-Za-z0-9_:-]{1,80}$/;
const fail = (path) => { throw new TypeError(`Invalid motion contract: ${path}`); };
function object(value, keys, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path);
  if (Object.keys(value).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(value, key))) fail(path);
}
function id(value, path) { if (typeof value !== 'string' || !idPattern.test(value)) fail(path); }
function list(value, max, path) { if (!Array.isArray(value) || value.length > max) fail(path); }
function uniqueIds(values, path) {
  const seen = new Set();
  for (const value of values) { id(value, path); if (seen.has(value)) fail(path); seen.add(value); }
  return seen;
}
export function validateConfig(config) {
  object(config, ['contract', 'pages'], 'root');
  if (config.contract !== CONTRACT) fail('version');
  list(config.pages, 128, 'pages');
  if (!config.pages.length) fail('pages');
  uniqueIds(config.pages.map(page => page.id), 'page.id');
  const targets = new Set(), actions = new Set();
  for (const page of config.pages) {
    object(page, ['id', 'capabilities', 'targets', 'actions', 'background', 'transition'], 'page');
    const caps = page.capabilities;
    object(caps, ['containsVideo', 'containsEmbeddedFrame', 'supportsDomTransition', 'supportsFilterTransition', 'mediaTargetIds', 'embeddedTargetIds'], 'capabilities');
    for (const key of ['containsVideo', 'containsEmbeddedFrame', 'supportsDomTransition', 'supportsFilterTransition']) if (typeof caps[key] !== 'boolean') fail(key);
    list(page.targets, 256, 'targets'); list(page.actions, 256, 'actions');
    const localTargets = new Map();
    for (const target of page.targets) {
      object(target, ['id', 'kind'], 'target'); id(target.id, 'target.id');
      if (!['text', 'image', 'group', 'video', 'embedded'].includes(target.kind) || targets.has(target.id)) fail('target');
      targets.add(target.id); localTargets.set(target.id, target.kind);
    }
    for (const [key, kind, flag] of [['mediaTargetIds', 'video', 'containsVideo'], ['embeddedTargetIds', 'embedded', 'containsEmbeddedFrame']]) {
      list(caps[key], 256, key); const ids = uniqueIds(caps[key], key);
      for (const targetId of ids) if (localTargets.get(targetId) !== kind) fail(key);
      for (const [targetId, targetKind] of localTargets) if (targetKind === kind && !ids.has(targetId)) fail(key);
      if (caps[flag] !== (ids.size > 0)) fail(flag);
    }
    // Only implemented adapters may be saved. Future registry entries cannot
    // silently become usable merely by naming them in a document.
    if (page.background !== null || page.transition !== null) fail('unsupported page slot');
    const slots = new Set();
    for (const action of page.actions) {
      object(action, ['id', 'targetId', 'templateId', 'templateVersion', 'params', 'seed', 'trigger', 'delayMs'], 'action');
      id(action.id, 'action.id'); if (actions.has(action.id)) fail('duplicate action'); actions.add(action.id);
      const template = registry.templates[action.templateId];
      if (!template || action.templateVersion !== template.version || !template.targets.includes(localTargets.get(action.targetId))) fail('template target');
      const slot = `${action.targetId}:${template.category}`;
      if (slots.has(slot)) fail('duplicate slot'); slots.add(slot);
      if (!['click', 'withPrevious', 'afterPrevious'].includes(action.trigger)) fail('trigger');
      if (!Number.isInteger(action.seed) || action.seed < 0 || action.seed > 4294967295) fail('seed');
      if (!Number.isFinite(action.delayMs) || action.delayMs < 0 || action.delayMs > 60000) fail('delay');
      object(action.params, Object.keys(template.params).filter(key => !template.params[key].optional || Object.hasOwn(action.params, key)), 'params');
      for (const [key, rule] of Object.entries(template.params)) {
        const value = Object.hasOwn(action.params,key) ? action.params[key] : (rule.optional ? rule.default : undefined);
        if (!Number.isFinite(value) || value < rule.min || value > rule.max || (rule.integer && !Number.isInteger(value))) fail(`params.${key}`);
      }
    }
  }
  if (new TextEncoder().encode(stableJson(config)).byteLength > 262144) fail('size');
  return config;
}
export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
// Presence is a union; support is an intersection. Probes never grant a
// capability that the source did not declare.
export function effectiveCapabilities(declared, probed) {
  return {
    containsVideo: declared.containsVideo || probed.containsVideo,
    containsEmbeddedFrame: declared.containsEmbeddedFrame || probed.containsEmbeddedFrame,
    supportsDomTransition: declared.supportsDomTransition && probed.supportsDomTransition,
    supportsFilterTransition: declared.supportsFilterTransition && probed.supportsFilterTransition
  };
}
