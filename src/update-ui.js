import { micromark } from 'micromark';

export function isNewer(current, latest) {
  const parse = (value) => /^v?\d+(\.\d+)*$/i.test(value || '') ? value.replace(/^v/i, '').split('.').map(Number) : null;
  const a = parse(current), b = parse(latest);
  if (!a || !b) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (b[i] || 0) > (a[i] || 0);
  }
  return false;
}

export function renderNotes(raw, language) {
  let text = String(raw || '');
  const zh = /^## 中文\s*$/m.exec(text), en = /^## English\s*$/m.exec(text);
  if (zh && en && zh.index < en.index) {
    text = language === 'en-US' ? text.slice(en.index) : text.slice(zh.index, en.index);
  }
  text = text.replace(/^\s*<a\s+(?:id|name)=["'][^"']+["']\s*>\s*<\/a>\s*$/gm, '')
    .replace(/^\[中文\]\([^\n]+\)\s*\|\s*\[English\]\([^\n]+\)\s*$/gm, '')
    .replace(/\n---\s*$/, '');
  // GitHub content is untrusted: never enable raw HTML or dangerous protocols.
  return micromark(text);
}
