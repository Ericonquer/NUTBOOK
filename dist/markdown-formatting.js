/* P0 formatting workspace: isolated from the source editor and HTML runtime. */
(function () {
  const messages = {
    'zh-CN': { title: '排版发布', trial: '公众号 · P0 验证版', source: '创建发布稿时的原文', draft: '发布稿', preview: 'Nutbook 预览', save: '保存发布稿', back: '返回阅读', copy: '复制图文', copied: '已复制，请到公众号后台粘贴检查', busy: '正在处理…', dirty: '未保存', saved: '已保存', image: '插入图片', imageHelp: '正文空行左侧「＋」→ 图片，选择 PNG / JPEG / WebP（≤10 MB）；图片随发布稿保存。', localOnly: '验证版支持本地图片。网络图片尚未接入安全下载，不会自动请求。', imageError: '图片无法转换，请检查路径、格式和大小：', copyError: '图文复制失败；稿件仍保留。', compose: '请先完成中文输入', fallback: '编辑器加载失败，已切换为 Markdown 源码编辑', changed: '原文件已变化，发布稿仍保留创建时快照。', gate: '公众号会再次处理样式和图片，请保存草稿后检查预览。X、微博和更多主题尚未开放。', invalid: '发布稿格式不支持，未覆盖已有文件', conflict: '保存失败（可能存在版本冲突），当前稿件仍保留：', failedImages: '以下图片未能转换，已阻止图文复制。请修复后重试：', editor: '发布稿编辑区', theme: '主题：简洁', sourceReadonly: '原文只读', tooLarge: '图片超出限制：单张 10 MB、总计 24 MB、边长 8192 像素。', insertHelp: '图片使用正文空行左侧的「＋ → 图片」插入。', saveError: '保存失败，当前稿件仍保留。', loading: '正在打开排版工作区…', references: '参考链接', linkNote: '普通外链能否点击以公众号后台为准；文末会保留网址。' },
    'en-US': { title: 'Format for publishing', trial: 'WeChat · P0 validation', source: 'Source snapshot at draft creation', draft: 'Publishing draft', preview: 'Nutbook preview', save: 'Save publishing draft', back: 'Back to reading', copy: 'Copy rich content', copied: 'Copied. Paste into the WeChat editor and check.', busy: 'Processing…', dirty: 'Unsaved', saved: 'Saved', image: 'Insert image', imageHelp: 'Use “+ → Image” beside an empty paragraph. Choose PNG / JPEG / WebP (≤10 MB). Images are saved with the draft.', localOnly: 'This validation build supports local images. Remote images are not requested until safe downloading is available.', imageError: 'Cannot convert image; check path, format and size: ', copyError: 'Rich copy failed. Your draft is retained.', compose: 'Finish composing text first', fallback: 'Editor failed to load. Markdown source editing is available.', changed: 'The source file changed. The original draft snapshot is retained.', gate: 'WeChat processes styles and images again. Save your platform draft and check its preview. X, Weibo and more themes are not available yet.', invalid: 'Unsupported draft format. The existing file was not overwritten.', conflict: 'Save failed (possible revision conflict). Your draft is retained: ', failedImages: 'Copy blocked because these images could not be converted. Fix them and retry:', editor: 'Publishing draft editor', theme: 'Theme: Simple', sourceReadonly: 'Read-only source', tooLarge: 'Image limit exceeded: 10 MB each, 24 MB total, 8192 pixels per side.', insertHelp: 'Insert images using “+ → Image” beside an empty paragraph.', saveError: 'Save failed. Your draft is retained.', loading: 'Opening the formatting workspace…', references: 'References', linkNote: 'Clickable external links depend on the WeChat editor. URLs are also retained at the end.' }
  };
  let active = null;
  let openGeneration = 0;
  const styleMap = {
    h1: 'font-size:26px;font-weight:700;margin:28px 0 18px;color:#222;line-height:36.4px;',
    h2: 'font-size:22px;font-weight:700;margin:26px 0 16px;color:#222;line-height:33px;',
    h3: 'font-size:19px;font-weight:700;margin:24px 0 14px;line-height:28.5px;',
    p: 'margin:0 0 18px;line-height:28.8px;',
    blockquote: 'margin:18px 0;padding:8px 16px;border-left:3px solid #88a28b;color:#555;background:#f6f8f6;',
    pre: 'white-space:pre-wrap;overflow-wrap:anywhere;padding:16px;background:#f4f4f4;border-radius:6px;font-size:13px;line-height:20.8px;',
    code: 'font-family:monospace;background:#f4f4f4;font-size:14px;',
    table: 'border-collapse:collapse;width:100%;font-size:14px;margin:18px 0;',
    th: 'border:1px solid #ddd;padding:8px;background:#f4f4f4;text-align:left;',
    td: 'border:1px solid #ddd;padding:8px;',
    img: 'max-width:100%;height:auto;display:block;margin:18px auto;',
    li: 'margin:6px 0;line-height:28.8px;',
    a: 'color:#456c53;text-decoration:underline;'
  };
  function text(key) { return (messages[active?.language] || messages['zh-CN'])[key]; }
  function element(tag, label, attrs = {}) {
    const node = document.createElement(tag);
    if (label) node.textContent = label;
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  }
  function button(label, action) {
    const node = element('button', label, { type: 'button', title: label, 'aria-label': label });
    node.addEventListener('click', action);
    return node;
  }
  function current(s) { return active === s && s.root.isConnected; }
  function flush(s) {
    if (s.composing) throw new Error(text('compose'));
    s.data.markdown = s.editor ? s.editor.getMarkdown() : s.fallback.value;
    return s.data.markdown;
  }
  function serialized(s) { return JSON.stringify({ markdown: s.data.markdown }); }
  function updateState(s) { s.status.textContent = s.revision && serialized(s) === s.baseline ? text('saved') : text('dirty'); }
  function dispose(s) {
    clearTimeout(s.timer);
    s.generation++;
    s.editor?.destroy?.();
    s.root.remove();
    if (active === s) active = null;
  }
  function inlineHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    template.content.querySelectorAll('script,style,iframe,object,embed,form,input,button,link,meta').forEach(n => n.remove());
    template.content.querySelectorAll('*').forEach(node => {
      [...node.attributes].forEach(attr => {
        if (!['src', 'href', 'alt', 'title', 'colspan', 'rowspan'].includes(attr.name)) node.removeAttribute(attr.name);
      });
      for (const attr of ['src', 'href']) {
        const value = node.getAttribute(attr);
        if (value && (attr === 'href' ? !/^(https?:|mailto:|#)/i.test(value.trim()) : /^(?:javascript|vbscript|file|blob):/i.test(value.trim()))) node.removeAttribute(attr);
      }
      const style = styleMap[node.tagName.toLowerCase()];
      if (style) node.setAttribute('style', style);
    });
    // Remove network/local sources while still in inert template content.
    template.content.querySelectorAll('img').forEach(img => {
      img.setAttribute('data-original-src', img.getAttribute('src') || '');
      img.removeAttribute('src');
    });
    const section = element('section', '', { style: 'font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;line-height:28.8px;color:#333;overflow-wrap:anywhere;' });
    section.append(template.content);
    return section;
  }
  async function imageData(s, src) {
    if (s.data.assets[src]) {
      if (!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(s.data.assets[src])) throw new Error(text('imageError'));
      return s.data.assets[src];
    }
    if (/^data:image\/(png|jpeg|webp);base64,/i.test(src)) return src;
    if (/^[a-z][a-z\d+.-]*:/i.test(src) || src.startsWith('//')) throw new Error(text('localOnly'));
    const data = await s.bridge.invoke('read_formatting_image', { itemId: s.id, src });
    if (!current(s)) throw new Error('superseded');
    const total = Object.values(s.data.assets).reduce((sum, value) => sum + value.length, 0) + data.length;
    if (total > 32 * 1024 * 1024) throw new Error(text('tooLarge'));
    s.data.assets[src] = data;
    return data;
  }
  function retainLinkAddresses(section) {
    const urls = new Map();
    for (const anchor of section.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href');
      if (!/^https?:\/\//i.test(href)) continue;
      let number = urls.get(href);
      if (!number) { number = urls.size + 1; urls.set(href, number); }
      anchor.after(element('span', `[${number}]`, { style: 'font-size:12px;line-height:28.8px;color:#666;' }));
    }
    if (!urls.size) return;
    section.append(element('h3', text('references'), { style: styleMap.h3 }));
    for (const [url, number] of urls) {
      // Literal text survives even if the platform removes the anchor element.
      section.append(element('p', `[${number}] ${url}`, { style: styleMap.p }));
    }
  }
  async function convert(s, markdown) {
    const html = await s.bridge.invoke('render_formatting_markdown', { markdown });
    if (!current(s)) throw new Error('superseded');
    const section = inlineHtml(html);
    retainLinkAddresses(section);
    const errors = [];
    // Serial conversion bounds peak memory and avoids duplicate resource reads.
    for (const img of section.querySelectorAll('img')) {
      const src = img.getAttribute('data-original-src') || '';
      img.removeAttribute('data-original-src');
      try { img.setAttribute('src', await imageData(s, src)); }
      catch (_) { img.removeAttribute('src'); img.alt = `${text('imageError')}${src}`; errors.push(src); }
    }
    return { section, errors };
  }
  async function preview(s) {
    const generation = ++s.generation;
    try {
      const markdown = flush(s);
      updateState(s);
      const result = await convert(s, markdown);
      if (!current(s) || s.generation !== generation || s.data.markdown !== markdown) return;
      const top = s.preview.scrollTop;
      s.preview.replaceChildren(result.section);
      s.preview.scrollTop = top;
      s.errors.textContent = result.errors.length ? `${text('failedImages')}\n${result.errors.join('\n')}` : '';
    } catch (error) { if (current(s) && s.generation === generation) s.errors.textContent = String(error.message || error); }
  }
  function schedule(s) {
    clearTimeout(s.timer);
    s.timer = setTimeout(() => { if (current(s) && !s.composing) preview(s); }, 220);
  }
  async function save() {
    const s = active;
    if (!s || s.saving) return false;
    s.saving = true;
    s.saveButton.disabled = true;
    try {
      const markdown = flush(s);
      // Freeze a complete content+resource snapshot. Edits during I/O remain dirty.
      await convert(s, markdown);
      if (!current(s)) return false;
      const data = JSON.parse(JSON.stringify({ ...s.data, markdown }));
      const revision = await s.bridge.invoke('save_formatting_draft', { itemId: s.id, expectedRevision: s.revision, draft: data });
      if (!current(s)) return false;
      s.revision = revision;
      s.baseline = JSON.stringify({ markdown });
      flush(s);
      updateState(s);
      return true;
    } catch (error) {
      if (current(s)) s.errors.textContent = text('conflict') + s.bridge.error(error);
      return false;
    } finally { s.saving = false; s.saveButton.disabled = false; }
  }
  async function leave(id) {
    openGeneration++;
    const s = active;
    if (!s || (id != null && s.id !== id)) return true;
    if (s.leaving) return s.leaving;
    s.leaving = (async () => {
      try {
        flush(s);
        if (s.saving) return false;
        if (serialized(s) !== s.baseline || !s.revision) {
          const choice = await s.bridge.confirm(`${s.name} · ${text('draft')}`);
          if (choice === 'continue') return false;
          if (choice === 'save') {
            if (!(await save())) return false;
            // Input can continue during I/O. Do not exit with a newer unsaved edit.
            flush(s);
            if (serialized(s) !== s.baseline) return false;
          }
        }
        dispose(s);
        s.bridge.restore();
        return true;
      } catch (error) { s.errors.textContent = error.message; return false; }
    })();
    const result = await s.leaving;
    s.leaving = null;
    return result;
  }
  function plainText(section) {
    const clone = section.cloneNode(true);
    clone.querySelectorAll('br').forEach(n => n.replaceWith('\n'));
    clone.querySelectorAll('td,th').forEach(n => n.append('\t'));
    clone.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,pre,blockquote,tr').forEach(n => n.append('\n\n'));
    clone.querySelectorAll('img').forEach(n => n.replaceWith(n.alt || ''));
    return clone.textContent.replace(/\n{3,}/g, '\n\n').trim();
  }
  async function copy(s) {
    if (s.copying) return;
    clearTimeout(s.timer);
    s.copying = true;
    s.copyButton.disabled = true;
    s.status.textContent = text('busy');
    try {
      const markdown = flush(s);
      // Start clipboard write inside the user gesture; conversion resolves the
      // frozen HTML promise. No text-only success fallback is permitted.
      if (!s.bridge.nativeClipboard && (!window.ClipboardItem || !navigator.clipboard?.write)) throw new Error(text('copyError'));
      const prepared = convert(s, markdown).then(result => {
        if (result.errors.length) throw new Error(`${text('failedImages')}\n${result.errors.join('\n')}`);
        if (!current(s)) throw new Error('superseded');
        return result.section;
      });
      if (s.bridge.nativeClipboard) {
        const node = await prepared;
        if (!current(s)) return;
        const result = await s.bridge.invoke('write_formatting_clipboard', {
          html: node.outerHTML, plain: plainText(node)
        });
        if (!result?.verified) throw new Error(text('copyError'));
      } else {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': prepared.then(node => new Blob([node.outerHTML], { type: 'text/html' })),
          'text/plain': prepared.then(node => new Blob([plainText(node)], { type: 'text/plain' }))
        })]);
      }
      if (current(s)) s.status.textContent = text('copied');
    } catch (error) { if (current(s)) s.errors.textContent = `${text('copyError')} ${s.bridge.error(error)}`; }
    finally { s.copying = false; s.copyButton.disabled = false; }
  }
  function chooseImage(s) {
    return new Promise(resolve => {
      const input = element('input', '', { type: 'file', accept: 'image/png,image/jpeg,image/webp' });
      input.addEventListener('cancel', () => resolve(null), { once: true });
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file || !current(s)) return resolve(null);
        try {
          if (file.size > 10 * 1024 * 1024) throw new Error(text('tooLarge'));
          const data = await new Promise((ok, fail) => { const reader = new FileReader(); reader.onload = () => ok(reader.result); reader.onerror = fail; reader.readAsDataURL(file); });
          const image = new Image();
          image.src = data;
          await image.decode();
          if (image.width > 8192 || image.height > 8192) throw new Error(text('tooLarge'));
          if (!current(s)) return resolve(null);
          const src = `nutbook-image-${crypto.randomUUID()}.${file.name.split('.').pop()}`;
          if (Object.values(s.data.assets).reduce((sum, value) => sum + value.length, data.length) > 32 * 1024 * 1024) throw new Error(text('tooLarge'));
          s.data.assets[src] = data;
          resolve({ relativePath: src, fileName: file.name });
        } catch (error) { s.errors.textContent = s.bridge.error(error); resolve(null); }
      }, { once: true });
      input.click();
    });
  }
  async function open(bridge, tab) {
    if (active) return;
    const opening = ++openGeneration;
    const loaded = await bridge.invoke('load_formatting_draft', { itemId: tab.id });
    if (bridge.activeId() !== tab.id || opening !== openGeneration || active) return;
    if (loaded.draft && (loaded.draft.version !== 1 || typeof loaded.draft.markdown !== 'string' || typeof loaded.draft.source !== 'string' || !loaded.draft.assets || typeof loaded.draft.assets !== 'object')) throw new Error(messages[bridge.language()]?.invalid || messages['zh-CN'].invalid);
    const raw = loaded.source ?? tab.preview.raw ?? '';
    const data = loaded.draft || { version: 1, source: raw, markdown: raw, assets: {} };
    const root = element('div', '', { class: 'formatting-workspace' });
    const s = { id: tab.id, name: tab.item.fileName, language: bridge.language(), bridge, data, root, revision: loaded.revision, generation: 0, composing: false, editor: null, fallback: null };
    active = s;
    bridge.suspend();
    const header = element('header', '', { class: 'formatting-header' });
    header.append(element('strong', `${s.name} · ${text('trial')}`));
    s.status = element('span', '', { role: 'status', 'aria-live': 'polite' });
    s.saveButton = button(text('save'), save);
    s.copyButton = button(text('copy'), () => copy(s));
    header.append(s.status, s.saveButton, s.copyButton, button(text('back'), () => leave(s.id)));
    const tools = element('div', '', { class: 'formatting-tools' });
    tools.append(element('span', text('theme')), button(text('image'), async () => { if (!(await s.editor?.insertImageAsset?.())) s.errors.textContent = text('insertHelp'); }));
    const body = element('div', '', { class: 'formatting-columns' });
    const left = element('section', '', { class: 'formatting-left' });
    const tabs = element('div', '', { class: 'formatting-tools' });
    const mount = element('div', '', { class: 'formatting-editor milkdown-editor-root', 'aria-label': text('editor') });
    const original = element('textarea', '', { readonly: '', 'aria-label': text('source'), class: 'formatting-source', hidden: '' });
    original.value = data.source;
    tabs.append(button(text('draft'), () => { original.hidden = true; mount.hidden = false; s.editor?.focus?.(); }), button(text('source'), () => { original.hidden = false; mount.hidden = true; }));
    left.append(tabs, element('p', text('imageHelp'), { class: 'formatting-hint' }), mount, original);
    const right = element('section', '', { class: 'formatting-right' });
    right.append(element('strong', text('preview')));
    s.preview = element('article', '', { class: 'formatting-preview' });
    right.append(s.preview);
    body.append(left, right);
    s.errors = element('div', '', { class: 'formatting-errors', role: 'alert' });
    const hint = element('p', `${text('gate')} ${text('localOnly')} ${text('linkNote')}`, { class: 'formatting-hint' });
    root.append(header, tools, body, s.errors, hint);
    bridge.container.replaceChildren(root);
    mount.addEventListener('compositionstart', () => { s.composing = true; });
    mount.addEventListener('compositionend', () => { s.composing = false; schedule(s); });
    try {
      const api = await bridge.editor();
      if (!current(s)) return;
      const editor = await api.create({ root: mount, markdown: data.markdown, fileName: s.name, language: s.language,
        resolveImageSrc: src => s.data.assets[src] || (/^data:image\/(png|jpeg|webp);base64,/i.test(src) ? src : (/^(https?:)?\/\//i.test(src) ? 'data:image/png;base64,' : bridge.resolveImage(src, tab))),
        onInsertImageAsset: () => chooseImage(s),
        onChange: value => { if (current(s)) { s.data.markdown = value; updateState(s); schedule(s); } }
      });
      if (!current(s)) { editor.destroy?.(); return; }
      s.editor = editor;
      s.data.markdown = editor.getMarkdown();
    } catch (error) {
      if (!current(s)) return;
      s.errors.textContent = text('fallback');
      s.fallback = element('textarea', '', { class: 'formatting-source', 'aria-label': text('editor') });
      s.fallback.value = data.markdown;
      mount.replaceChildren(s.fallback);
      s.fallback.addEventListener('input', () => { s.data.markdown = s.fallback.value; updateState(s); schedule(s); });
    }
    s.baseline = serialized(s);
    if (data.source !== raw) hint.textContent += ` ${text('changed')}`;
    await preview(s);
  }
  window.NutbookFormatting = { open, leave, save, activeId: () => active?.id ?? null, label: language => messages[language]?.title || messages['zh-CN'].title };
})();
