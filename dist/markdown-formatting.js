/* P0 formatting workspace: isolated from the source editor and HTML runtime. */
(function () {
  const messages = {
    'zh-CN': { title: '排版发布', workspaceTitle: 'Markdown 排版中心', trial: '公众号', source: '原文', draft: '发布稿', undo: '撤销', preview: 'Nutbook 预览', save: '保存发布稿', back: '返回阅读', copy: '复制到公众号', copyX: '复制到 X Articles', copiedX: '正文已复制', copyXError: '文字复制失败，当前稿件仍保留。', copied: '已复制，请到公众号后台粘贴检查', busy: '正在处理…', dirty: '未保存', saved: '已保存', image: '插入图片', imageHelp: '可粘贴截图、图片文件、以 PNG/JPEG/WebP 结尾的图片地址，或 Markdown 图片语法；单张 ≤10 MB。普通网址保留为链接。', localOnly: '图片随发布稿缓存保存。', imageError: '图片无法转换，请检查路径、格式和大小：', copyError: '图文复制失败；稿件仍保留。', compose: '请先完成中文输入', fallback: '编辑器加载失败，已切换为 Markdown 源码编辑', changed: '原文件已变化，发布稿仍保留创建时快照。', gate: '公众号会再次处理样式和图片，请保存草稿后检查预览。X Articles 复制正文格式；标题和图片单独添加。微博尚未开放。', invalid: '发布稿格式不支持，未覆盖已有文件', conflict: '保存失败（可能存在版本冲突），当前稿件仍保留：', failedImages: '以下图片未能转换，已阻止图文复制。请修复后重试：', editor: '发布稿编辑区', theme: '主题与排版', themeUnavailable: 'X 不支持主题', moreThemes: '更多模板将陆续加入', simple: '白纸', reading: '长文', tech: '留白', newspaper: '报纸', fine: '细线', minimal: '简约', size: '正文字号', leading: '行距', radius: '图片圆角', reset: '恢复主题默认', close: '收起主题面板', retry: '重试失败图片', phone: '切换手机宽度预览', help: '图片与复制说明', importBusy: '正在处理图片…', sourceReadonly: '原文只读', tooLarge: '图片超出限制：单张 10 MB、总计 24 MB、边长 8192 像素。', insertHelp: '可直接粘贴图片，或在正文空行使用插图按钮。', saveError: '保存失败，当前稿件仍保留。', loading: '正在打开排版工作区…', references: '参考链接', linkNote: '普通外链能否点击以公众号后台为准；文末会保留网址。' },
    'en-US': { title: 'Format', workspaceTitle: 'Markdown Formatting Center', trial: 'WeChat', source: 'Original', draft: 'Publishing draft', undo: 'Undo', preview: 'Nutbook preview', save: 'Save publishing draft', back: 'Back to reading', copy: 'Copy to WeChat', copyX: 'Copy to X Articles', copiedX: 'Body copied', copyXError: 'Text copy failed. Your draft is retained.', copied: 'Copied. Paste into the WeChat editor and check.', busy: 'Processing…', dirty: 'Unsaved', saved: 'Saved', image: 'Insert image', imageHelp: 'Paste a screenshot, image file, PNG/JPEG/WebP URL, or Markdown image syntax. ≤10 MB each. Other URLs remain links.', localOnly: 'Images are cached with the publishing draft.', imageError: 'Cannot convert image; check path, format and size: ', copyError: 'Rich copy failed. Your draft is retained.', compose: 'Finish composing text first', fallback: 'Editor failed to load. Markdown source editing is available.', changed: 'The source file changed. The original draft snapshot is retained.', gate: 'WeChat processes styles and images again. Save your platform draft and check its preview. X Articles copies formatted text; add the title and images separately. Weibo is not available yet.', invalid: 'Unsupported draft format. The existing file was not overwritten.', conflict: 'Save failed (possible revision conflict). Your draft is retained: ', failedImages: 'Copy blocked because these images could not be converted. Fix them and retry:', editor: 'Publishing draft editor', theme: 'Theme and formatting', themeUnavailable: 'Themes are unavailable in X', moreThemes: 'More templates coming soon', simple: 'Paper', reading: 'Longform', tech: 'Whitespace', newspaper: 'Newspaper', fine: 'Fine lines', minimal: 'Minimal', size: 'Font size', leading: 'Line spacing', radius: 'Image corners', reset: 'Reset theme', close: 'Close theme panel', retry: 'Retry failed images', phone: 'Toggle phone preview width', help: 'Image and copy help', importBusy: 'Importing image…', sourceReadonly: 'Read-only source', tooLarge: 'Image limit exceeded: 10 MB each, 24 MB total, 8192 pixels per side.', insertHelp: 'Paste an image, or use the image button in an empty paragraph.', saveError: 'Save failed. Your draft is retained.', loading: 'Opening the formatting workspace…', references: 'References', linkNote: 'Clickable external links depend on the WeChat editor. URLs are also retained at the end.' }
  };
  Object.assign(messages['zh-CN'], { weiboTab:'微博文章', weiboThemeUnavailable:'微博不支持主题', weiboNoTitle:'未找到一级标题，请在微博中填写标题', copyWeibo:'复制到微博文章', copiedWeibo:'已复制，请到微博文章粘贴检查', helpBrief:'图片可直接粘贴，单张 ≤10 MB。公众号、微博粘贴后请保存检查；微博标题单独复制。X 标题、图片单独添加，补图后删除占位；分隔线省略，代码和表格转为引用。', xMode:'X Articles 预览', wechatMode:'公众号预览', xTab:'X Articles', wechatTab:'公众号', copyTitle:'复制文章标题', copiedTitle:'标题已复制', copyImage:'复制此图片', copiedImage:'图片已复制', imageCopyError:'图片复制失败，请重试', xImages:'图片（按正文顺序）', xImage:'图片', xNotice:'X 预览仅供参考。分隔线省略，代码和表格转为引用文字；图片需单独复制到编号占位处，并删除占位文字。请保存 X 草稿后检查。', noTitle:'未找到一级标题，请在 X 中填写标题', imagePosition:'插图位置', xCode:'代码', xTable:'表格', xPending:'{count} 张图片待添加', xPendingOne:'1 张图片待添加'  });
  Object.assign(messages['en-US'], { weiboTab:'Weibo Articles', weiboThemeUnavailable:'Themes are unavailable in Weibo', weiboNoTitle:'No H1 title found. Enter a title in Weibo.', copyWeibo:'Copy to Weibo Article', copiedWeibo:'Copied. Paste into Weibo Articles and check.', helpBrief:'Paste images directly (≤10 MB each). Check saved WeChat and Weibo drafts; copy the Weibo title separately. In X, add the title and images separately, then remove image placeholders. Dividers are omitted; code and tables become quotes.', xMode:'X Articles preview', wechatMode:'WeChat preview', xTab:'X Articles', wechatTab:'WeChat', copyTitle:'Copy article title', copiedTitle:'Title copied', copyImage:'Copy this image', copiedImage:'Image copied', imageCopyError:'Image copy failed. Please retry.', xImages:'Images (in body order)', xImage:'Image', xNotice:'X preview is approximate. Dividers are omitted; code and tables become quoted text. Copy each image to its numbered placeholder, then remove the placeholder. Check your saved X draft.', noTitle:'No H1 title found. Enter a title in X.', imagePosition:'Image position', xCode:'Code', xTable:'Table', xPending:'{count} images to add', xPendingOne:'1 image to add'  });
  let active = null;
  let openGeneration = 0;
  const styleMap = {
    h1: 'font-size:32px;font-weight:700;margin:24px 0;color:#000;line-height:40px;letter-spacing:-0.02em;',
    h2: 'font-size:24px;font-weight:600;margin:32px 0 16px;color:#000;line-height:32px;letter-spacing:-0.01em;',
    h3: 'font-size:19px;font-weight:700;margin:24px 0 14px;line-height:28.5px;',
    p: 'margin:0 0 18px;line-height:28.8px;',
    blockquote: 'margin:18px 0;padding:8px 16px;border-left:3px solid #7e7576;color:#555;background:#f3f3f5;',
    pre: 'white-space:pre-wrap;overflow-wrap:anywhere;padding:16px;background:#f4f4f4;border-radius:6px;font-size:13px;line-height:20.8px;',
    code: 'font-family:monospace;background:#f4f4f4;font-size:14px;',
    table: 'border-collapse:collapse;width:100%;font-size:14px;margin:18px 0;',
    th: 'border:1px solid #ddd;padding:8px;background:#f4f4f4;text-align:left;',
    td: 'border:1px solid #ddd;padding:8px;',
    img: 'max-width:100%;height:auto;display:block;margin:18px auto;',
    li: 'margin:6px 0;line-height:28.8px;',
    a: 'color:#1a1c1d;text-decoration:underline;'
  };
  function text(key) { return (messages[active?.bridge.language() || active?.language] || messages['zh-CN'])[key]; }
  function labelKey(label) { return Object.entries(messages[active?.bridge.language() || active?.language] || messages['zh-CN']).find(([,value]) => value === label)?.[0]; }
  function element(tag, label, attrs = {}) {
    const node = document.createElement(tag);
    if (label) { node.textContent = label; const key = labelKey(label); if (key) node.dataset.formattingLabel = key; }
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (attrs['aria-label']) { const key = labelKey(attrs['aria-label']); if (key) node.dataset.formattingAria = key; }
    return node;
  }
  function button(label, action) {
    const node = element('button', label, { type: 'button', title: label, 'aria-label': label });
    node.addEventListener('click', action);
    return node;
  }
  const icons = {weibo: 'M11 3a3 3 0 0 1 3 3M11 1a5 5 0 0 1 5 5M12.5 8c1.3.7 1.5 1.5 1.1 2.5-.6 1.8-3.5 3.1-6.5 3.1S1.8 12.2 2 10.4c.1-1.4 1.9-3.7 3.6-4.6.8-.4 1.2-.1 1 .7l-.2.8c1.7-.7 3.5-1.1 4-.4.3.4 0 .9-.3 1.3M9.8 10.2c0 1.2-1.4 2.1-3.1 2.1s-2.9-.7-2.9-1.8 1.4-2 3.1-2 2.9.6 2.9 1.7ZM6 10.5h.01', plus: 'M8 3v10M3 8h10', wechat: 'M9.5 9.5a4 4 0 0 1-2 .5 5 5 0 0 1-1.8-.3L3.5 11l.4-2A3.6 3.6 0 0 1 2 6c0-2.2 2.1-4 4.8-4s4.7 1.6 4.7 3.7M14 10c0-1.8-1.8-3.2-4-3.2S6 8.2 6 10s1.8 3.2 4 3.2c.5 0 1-.1 1.4-.2l1.9 1-.3-1.6a3 3 0 0 0 1-2.4Z', x: 'M3 2.5h3l7 11h-3zM13 2.5 3 13.5', undo: 'M6 3 2.5 6.5 6 10M2.5 6.5H9a4 4 0 0 1 0 8', 'save': 'M3.5 2.5h6.8l3.2 3.2V13a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5ZM5 2.5v3.5h5V2.5M5 13.5V10h6v3.5', 'copy': 'M6 6h7.5v7.5H6zM10 6V2.5H2.5V10H6', 'back': 'M7 3.5 2.5 8 7 12.5M2.5 8h11', 'image': 'M4 2.5h8A1.5 1.5 0 0 1 13.5 4v8a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 12V4A1.5 1.5 0 0 1 4 2.5ZM3 12l3.5-3.5 2.5 2.5 2-2 2.5 2.5M6 5.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z', 'theme': 'M8 2a6 6 0 1 0 0 12h.7a1.4 1.4 0 0 0 .7-2.6 1.4 1.4 0 0 1 .6-2.6h2a2 2 0 0 0 2-2A5.4 5.4 0 0 0 8 2ZM4.5 6.5h.01M6.5 4h.01M10 4h.01M12 6h.01', 'source': 'M5.5 4 2 8l3.5 4M10.5 4 14 8l-3.5 4M9 2.5l-2 11', 'draft': 'M11 2.5 13.5 5 6 12.5l-3.2.7.7-3.2ZM9.8 3.7l2.5 2.5', 'close': 'M4 4l8 8M4 12l8-8', 'retry': 'M13.5 3.5V7H10M13.5 7a5.5 5.5 0 1 0-1 4.5', 'phone': 'M5 2h6a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1ZM7.5 11.5h1', 'help': 'M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM8 7v4M8 5h.01'};
  function iconButton(key, label, action) {
    const node = button(label, action);
    node.className = 'formatting-icon';
    node.removeAttribute('title');
    node.textContent = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svg.namespaceURI, 'path'); path.setAttribute('d', icons[key]); svg.append(path);
    node.append(svg, element('span', label, { class: 'formatting-tooltip', role: 'tooltip' }));
    return node;
  }
  function uniqueId() { return crypto.randomUUID?.() || [...crypto.getRandomValues(new Uint8Array(16))].map(n => n.toString(16).padStart(2, '0')).join(''); }
  const themeRules = {
  "base": [
    [
      "img",
      "max-width:100%;height:auto;display:block;margin:32px auto"
    ],
    [
      "",
      "margin:0 auto;overflow-wrap:anywhere;font-size:17px;line-height:1.8;color:#1a1c1d;padding:24px;max-width:680px;font-family:Inter,\"PingFang SC\",sans-serif"
    ],
    [
      "h1",
      "font-size:32px;line-height:1.3;margin:8px 0 32px;font-weight:600;letter-spacing:-.02em"
    ],
    [
      "h2",
      "font-size:24px;line-height:1.4;margin:40px 0 16px;font-weight:600"
    ],
    [
      "p",
      "margin:0 0 24px"
    ],
    [
      "ul",
      "padding-left:24px;margin:24px 0"
    ],
    [
      "ol",
      "padding-left:24px;margin:24px 0"
    ],
    [
      "li",
      "margin:12px 0"
    ],
    [
      "blockquote",
      "margin:32px 0;padding:16px 24px;border-left:2px solid #7e7576;color:#4c4546"
    ],
    [
      "pre",
      "white-space:pre-wrap;padding:24px;background:#eeeef0;border-radius:8px;font:14px/1.7 Menlo,monospace"
    ],
    [
      "code",
      "font-family:Menlo,monospace"
    ],
    [
      "a",
      "color:inherit;text-decoration:underline"
    ],
    [
      "table",
      "width:100%;border-collapse:collapse"
    ],
    [
      "th",
      "padding:12px;text-align:left;border-bottom:1px solid #cfc4c5"
    ],
    [
      "td",
      "padding:12px;text-align:left;border-bottom:1px solid #cfc4c5"
    ]
  ],
  "simple": [
    [
      "",
      "background:#f5f5f7;color:#737379;max-width:640px"
    ],
    [
      "h1",
      "color:#1a1c1d"
    ],
    [
      "h2",
      "color:#1a1c1d"
    ],
    [
      "strong",
      "color:#1a1c1d"
    ],
    [
      "blockquote",
      "border:0;text-align:center;color:#1a1c1d;font-weight:500;padding:24px 16px"
    ],
    [
      "pre",
      "background:#eeeef0"
    ]
  ],
  "reading": [
    [
      "",
      "max-width:664px;color:#252525"
    ],
    [
      "h1",
      "font-weight:700"
    ],
    [
      "h2",
      "font-weight:700"
    ],
    [
      "blockquote",
      "background:#f3f3f5;border-left:3px solid #1a1c1d"
    ],
    [
      "th",
      "background:#f3f3f5"
    ]
  ],
  "tech": [
    [
      "",
      "max-width:616px;padding:32px 24px 56px"
    ],
    [
      "h1",
      "text-align:center;font-weight:400;letter-spacing:.1em;font-size:28px;margin:24px 0 48px"
    ],
    [
      "h2",
      "font-size:20px;font-weight:400;letter-spacing:.06em;margin:48px 0 24px"
    ],
    [
      "p",
      "margin-bottom:36px;color:#5e5e63;line-height:2.2"
    ],
    [
      "blockquote",
      "border:0;text-align:center;font-size:15px;letter-spacing:.05em;margin:40px 0"
    ],
    [
      "li",
      "margin:20px 0"
    ]
  ],
  "newspaper": [
    [
      "",
      "background:#faf9f5;font-family:Georgia,\"Songti SC\",serif;color:#292929"
    ],
    [
      "h1",
      "font-size:34px;font-weight:400;text-align:center;letter-spacing:0;margin:16px 0 32px"
    ],
    [
      "h2",
      "font-size:25px;font-weight:400;text-align:center;border-block:1px solid #4c4546;padding:12px 0;font-style:italic"
    ],
    [
      "p",
      "text-indent:2em;text-align:justify;line-height:1.9"
    ],
    [
      "blockquote",
      "border:0;border-block:1px solid #7e7576;text-align:center;font-style:italic;padding:24px 16px"
    ],
    [
      "pre",
      "border:1px solid #7e7576;border-radius:0;background:transparent"
    ]
  ],
  "fine": [
    [
      "",
      "max-width:600px;color:#4c4546"
    ],
    [
      "h1",
      "font-size:25px;font-weight:400;letter-spacing:.12em;border-bottom:1px solid #cfc4c5;padding-bottom:24px"
    ],
    [
      "h2",
      "font-size:19px;letter-spacing:.08em;font-weight:500;border-block:1px solid #cfc4c5;background:#f9f9fb;padding:12px 0"
    ],
    [
      "blockquote",
      "border:1px solid #cfc4c5;font-size:15px;padding:20px"
    ],
    [
      "pre",
      "background:#2f3132;color:#f0f0f2;border-radius:0"
    ],
    [
      "th",
      "border:1px solid #cfc4c5"
    ],
    [
      "td",
      "border:1px solid #cfc4c5"
    ]
  ],
  "minimal": [
    [
      "",
      "background:#f7f7f9;max-width:624px;color:#707075;font-weight:300"
    ],
    [
      "h1",
      "font-size:38px;font-weight:300;line-height:1.25;letter-spacing:-.03em;color:#1a1c1d;margin:24px 0 40px"
    ],
    [
      "h2",
      "font-size:27px;font-weight:300;color:#1a1c1d;margin-top:48px"
    ],
    [
      "p",
      "line-height:1.65;margin-bottom:28px"
    ],
    [
      "blockquote",
      "text-align:center;border:0;font-weight:300;font-size:19px;color:#1a1c1d;margin:40px 0"
    ],
    [
      "strong",
      "font-weight:500;color:#1a1c1d"
    ]
  ]
};
  const themeDefaults = {
    simple: { size:17, leading:1.7, radius:8 }, reading: { size:17, leading:1.8, radius:8 },
    tech: { size:16, leading:2.2, radius:8 }, newspaper: { size:17, leading:1.9, radius:0 },
    fine: { size:16, leading:1.85, radius:0 }, minimal: { size:17, leading:1.65, radius:8 }
  };
  function settings(s) {
    const theme = Object.hasOwn(themeDefaults, s.data.settings?.theme) ? s.data.settings.theme : 'simple';
    return { ...themeDefaults[theme], ...s.data.settings, theme };
  }
  function applyTheme(s, section, pref = settings(s)) {
    for (const [selector, declarations] of [...themeRules.base, ...themeRules[pref.theme]]) {
      const nodes = selector ? section.querySelectorAll(selector) : [section];
      for (const node of nodes) node.style.cssText += ';' + declarations;
    }
    section.style.fontSize = `${pref.size}px`;
    section.style.lineHeight = `${pref.size * pref.leading}px`;
    section.querySelectorAll('p,li').forEach(node => {
      node.style.fontSize = `${pref.size}px`;
      node.style.lineHeight = `${pref.size * pref.leading}px`;
    });
    // Explicit line heights survive platform cleaning without changing their scale.
    for (const node of section.querySelectorAll('*')) {
      if (/^\d+(?:\.\d+)?$/.test(node.style.lineHeight)) {
        const size = parseFloat(node.style.fontSize) || pref.size;
        node.style.lineHeight = `${Number((size * Number(node.style.lineHeight)).toFixed(2))}px`;
      }
    }
    section.querySelectorAll('pre code').forEach(node => { node.style.background = 'transparent'; node.style.color = 'inherit'; });
    section.querySelectorAll('img').forEach(node => { node.style.borderRadius = `${pref.radius}px`; });
  }
  function current(s) { return active === s && s.root.isConnected; }
  function flush(s) {
    if (s.importing) throw new Error(text('importBusy'));
    if (s.composing) throw new Error(text('compose'));
    s.data.markdown = s.editor ? s.editor.getMarkdown() : s.fallback.value;
    return s.data.markdown;
  }
  function snapshotSerialized(markdown, pref) {
    return JSON.stringify({ markdown, settings: Object.fromEntries(Object.entries(pref).sort(([a],[b]) => a.localeCompare(b))) });
  }
  function serialized(s) { return snapshotSerialized(s.data.markdown, settings(s)); }
  function updateState(s) { s.status.textContent = s.revision && serialized(s) === s.baseline ? text('saved') : text('dirty'); }
  function dispose(s) {
    clearTimeout(s.timer);
    for (const requestId of s.networkRequests) s.bridge.invoke('cancel_formatting_image', { requestId }).catch(() => {});
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
    if (!current(s)) throw new Error('superseded');
    const cached = s.data.assets[src] || (/^data:/i.test(src) ? src : null);
    if (cached) {
      if (!s.validatedImages.has(cached)) {
        await s.bridge.invoke('validate_formatting_image_data', { data: cached });
        if (!current(s)) throw new Error('superseded');
        s.validatedImages.add(cached);
        s.editor?.refreshImageSources?.();
      }
      return cached;
    }
    if (s.imageFailures?.has(src)) throw new Error(s.imageFailures.get(src));
    if (s.imageRequests?.has(src)) return s.imageRequests.get(src);
    const remote = /^https?:\/\//i.test(src) || src.startsWith('//');
    if (!remote && /^[a-z][a-z\d+.-]*:/i.test(src)) throw new Error(text('imageError'));
    const request = (async () => {
    let data;
    const requestId = uniqueId();
    if (remote) { s.networkRequests.add(requestId); s.status.textContent = text('importBusy'); }
    try { data = await s.bridge.invoke(remote ? 'fetch_formatting_image' : 'read_formatting_image', remote ? { src: src.startsWith('//') ? `https:${src}` : src, requestId } : { itemId: s.id, src }); }
    catch (error) { s.imageFailures?.set(src, s.bridge.error(error)); throw error; }
    finally { s.networkRequests.delete(requestId); if (current(s) && !s.importing) updateState(s); }
    if (!current(s)) throw new Error('superseded');
    const total = Object.values(s.data.assets).reduce((sum, value) => sum + value.length, 0) + data.length;
    if (total > 32 * 1024 * 1024) throw new Error(text('tooLarge'));
    s.validatedImages.add(data);
    s.data.assets[src] = data;
    s.editor?.refreshImageSources?.();
    updateState(s);
    return data;
    })();
    s.imageRequests?.set(src, request);
    try { return await request; } finally { s.imageRequests?.delete(src); }
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
  async function convert(s, markdown, pref = settings(s), platform = 'wechat') {
    const html = await s.bridge.invoke('render_formatting_markdown', { markdown });
    if (!current(s)) throw new Error('superseded');
    const section = inlineHtml(html);
    if (platform === 'wechat') retainLinkAddresses(section);
    const errors = [];
    // Serial conversion bounds peak memory and avoids duplicate resource reads.
    for (const img of section.querySelectorAll('img')) {
      if (!current(s)) throw new Error('superseded');
      const src = img.getAttribute('data-original-src') || '';
      img.removeAttribute('data-original-src');
      try { img.setAttribute('src', await imageData(s, src)); }
      catch (error) { img.removeAttribute('src'); img.alt = `${text('imageError')}${src}`; errors.push(`${src}: ${s.bridge.error(error)}`); }
    }
    if (platform === 'wechat') applyTheme(s, section, pref);
    else {
      const title = section.querySelector(':scope > h1');
      section.dataset.articleTitle = title?.textContent.trim() || '';
      title?.remove();
      section.removeAttribute('style');
      section.querySelectorAll('[style]').forEach(node => node.removeAttribute('style'));
      // Keep each list item's text beside its marker in paste importers.
      section.querySelectorAll('li > p').forEach(node => node.replaceWith(...node.childNodes));
    }
    return { section, errors };
  }
  async function preview(s) {
    const generation = ++s.generation;
    try {
      const markdown = flush(s);
      updateState(s);
      if (s.mode === 'x') { await xPreview(s,markdown,generation); return; }
      if (s.mode === 'weibo') { await weiboPreview(s,markdown,generation); return; }
      const result = await convert(s, markdown);
      if (!current(s) || s.generation !== generation || s.data.markdown !== markdown) return;
      const top = s.preview.scrollTop;
      s.preview.replaceChildren(result.section);
      s.preview.scrollTop = top;
      s.retryButton.hidden = !result.errors.length;
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
      const pref = settings(s);
      // Freeze a complete content+resource snapshot. Edits during I/O remain dirty.
      await convert(s, markdown, pref);
      if (!current(s)) return false;
      const data = JSON.parse(JSON.stringify({ ...s.data, markdown, settings: pref }));
      s.persisting = true;
      const revision = await s.bridge.invoke('save_formatting_draft', { itemId: s.id, expectedRevision: s.revision, draft: data });
      if (!current(s)) return false;
      s.revision = revision;
      s.baseline = snapshotSerialized(markdown, pref);
      flush(s);
      updateState(s);
      return true;
    } catch (error) {
      if (current(s)) s.errors.textContent = text('conflict') + s.bridge.error(error);
      return false;
    } finally { s.saving = false; s.persisting = false; s.saveButton.disabled = false; }
  }
  async function leave(id) {
    openGeneration++;
    const s = active;
    if (!s || (id != null && s.id !== id)) return true;
    if (s.leaving) return s.leaving;
    s.leaving = (async () => {
      try {
        if (s.importing && !s.composing) s.data.markdown = s.editor ? s.editor.getMarkdown() : s.fallback.value; else flush(s);
        if (s.saving && s.persisting) return false;
        if (serialized(s) !== s.baseline || !s.revision || s.importing) {
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
  // Convert an inert rendered document, independently of WeChat themes.
  function xArticle(html) {
    const section = inlineHtml(html);
    const heading = [...section.children].find(node => node.tagName === 'H1');
    const title = heading?.textContent.trim() || '';
    heading?.remove();
    const images = [];
    // Standalone paragraphs preserve insertion boundaries through rich paste.
    // Re-query because splitting a paragraph may clone later inline images.
    let image;
    while ((image = section.querySelector('img'))) {
      const index = images.length + 1;
      const alt = image.alt.trim() || text('xImage');
      images.push({ src:image.getAttribute('data-original-src') || '', alt, index });
      const marker = element('p', `[${text('imagePosition')} ${index}: ${alt}]`);
      images[images.length-1].marker = marker;
      const paragraph = image.closest('p');
      if (paragraph) {
        const before = document.createRange(); before.selectNodeContents(paragraph); before.setEndBefore(image);
        const after = document.createRange(); after.selectNodeContents(paragraph); after.setStartAfter(image);
        const beforeParagraph = document.createElement('p'); beforeParagraph.append(before.cloneContents());
        const afterParagraph = document.createElement('p'); afterParagraph.append(after.cloneContents());
        paragraph.replaceWith(...(beforeParagraph.textContent.trim() || beforeParagraph.querySelector('img') ? [beforeParagraph] : []),marker,...(afterParagraph.textContent.trim() || afterParagraph.querySelector('img') ? [afterParagraph] : []));
      } else image.replaceWith(marker);
    }
    section.querySelectorAll('h1,h4,h5,h6').forEach(node => {
      const replacement = document.createElement(node.tagName === 'H1' ? 'h2' : 'h3');
      replacement.append(...node.childNodes); node.replaceWith(replacement);
    });
    section.querySelectorAll('pre,table').forEach(node => {
      const quote = document.createElement('blockquote');
      const value = node.tagName === 'TABLE'
        ? [...node.querySelectorAll('tr')].map(row => [...row.querySelectorAll('th,td')].map(cell => cell.textContent.trim()).join(' | ')).join('\n')
        : node.textContent;
      const lines = value.split('\n');
      lines.forEach((line,index) => { if (index) quote.append(document.createElement('br')); quote.append(document.createTextNode(line || '\u00a0')); });
      node.replaceWith(quote);
    });
    section.querySelectorAll('hr').forEach(node => node.remove());
    const allowed = new Set(['H2','H3','P','STRONG','B','EM','I','DEL','S','A','UL','OL','LI','BLOCKQUOTE','BR']);
    // Work inside-out so unknown wrappers cannot discard their children.
    [...section.querySelectorAll('*')].reverse().forEach(node => {
      const href = node.tagName === 'A' ? node.getAttribute('href') : null;
      [...node.attributes].forEach(attr => node.removeAttribute(attr.name));
      if (href && /^https?:\/\//i.test(href.trim())) node.setAttribute('href',href);
      else if (node.tagName === 'A') { node.replaceWith(...node.childNodes); return; }
      if (!allowed.has(node.tagName)) node.replaceWith(...node.childNodes);
    });
    section.removeAttribute('style');
    return { section, title, images };
  }
  function xPlain(section) {
    const clone = section.cloneNode(true);
    clone.querySelectorAll('a[href]').forEach(link => { if (link.textContent !== link.getAttribute('href')) link.append(` (${link.getAttribute('href')})`); });
    clone.querySelectorAll('li').forEach(item => item.prepend(item.parentElement.tagName === 'OL' ? `${[...item.parentElement.children].indexOf(item)+1}. ` : '• '));
    return plainText(clone);
  }
  async function writeRich(s, prepared, plain = plainText) {
    if (s.bridge.nativeClipboard) {
      const node = await prepared;
      if (!current(s)) throw new Error('superseded');
      const result = await s.bridge.invoke('write_formatting_clipboard', { html:node.innerHTML, plain:plain(node) });
      if (!result?.verified) throw new Error(text('copyError'));
    } else {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html':prepared.then(node => new Blob([node.innerHTML], {type:'text/html'})),
        'text/plain':prepared.then(node => new Blob([plain(node)], {type:'text/plain'}))
      })]);
    }
  }
  async function copyX(s) {
    if (s.copying) return;
    s.copying = true; s.copyXButton.disabled = true; s.copyWeiboButton.disabled = true; s.copyButton.disabled = true;
    s.status.textContent = text('busy');
    try {
      const markdown = flush(s);
      let imageCount = 0;
      const prepared = s.bridge.invoke('render_formatting_markdown', {markdown}).then(html => {
        if (!current(s)) throw new Error('superseded');
        const result = xArticle(html); imageCount = result.images.length;
        return result.section;
      });
      await writeRich(s,prepared,xPlain);
      if (current(s)) s.status.textContent = text('copiedX') + (imageCount ? ` · ${(imageCount === 1 ? text('xPendingOne') : text('xPending').replace('{count}',imageCount))}` : '');
    } catch (error) { if (current(s)) s.errors.textContent = `${text('copyXError')} ${s.bridge.error(error)}`; }
    finally { s.copying = false; s.copyXButton.disabled = false; s.copyWeiboButton.disabled = false; s.copyButton.disabled = false; }
  }
  async function copyWeibo(s) {
    if (s.copying || s.composing) return;
    s.copying = true;
    s.copyButton.disabled = s.copyXButton.disabled = s.copyWeiboButton.disabled = true;
    s.status.textContent = text('busy');
    try {
      const prepared = convert(s, flush(s), settings(s), 'weibo').then(result => {
        if (result.errors.length) throw new Error(`${text('failedImages')}\n${result.errors.join('\n')}`);
        result.section.removeAttribute('data-article-title');
        return result.section;
      });
      await writeRich(s, prepared);
      if (current(s)) s.status.textContent = text('copiedWeibo');
    } catch (error) { if (current(s)) s.errors.textContent = `${text('copyError')} ${s.bridge.error(error)}`; }
    finally { s.copying = false; s.copyButton.disabled = s.copyXButton.disabled = s.copyWeiboButton.disabled = false; }
  }
  async function copyXTitle(s, platform = 'x') {
    if (s.copying) return;
    s.copying = true;
    try {
      const markdown = flush(s);
      const html = await s.bridge.invoke('render_formatting_markdown', {markdown});
      if (!current(s)) return;
      const title = xArticle(html).title;
      if (!title) throw new Error(text(platform === 'weibo' ? 'weiboNoTitle' : 'noTitle'));
      if (s.bridge.copyText) await s.bridge.copyText(title); else await navigator.clipboard.writeText(title);
      if (current(s)) s.status.textContent = text('copiedTitle');
    } catch (error) { if (current(s)) s.errors.textContent = s.bridge.error(error); }
    finally { s.copying = false; }
  }
  async function copyXImage(s, image, button) {
    if (s.copying) return;
    s.copying = true; button.disabled = true;
    try {
      const prepared = imageData(s,image.src).then(async data => {
        if (!current(s)) throw new Error('superseded');
        if (s.bridge.nativeClipboard) return data;
        const blob = await (await fetch(data)).blob();
        const bitmap = await createImageBitmap(blob);
        try {
          const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
          canvas.getContext('2d').drawImage(bitmap,0,0);
          return await new Promise((resolve,reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error(text('imageCopyError'))),'image/png'));
        } finally { bitmap.close(); }
      });
      if (s.bridge.nativeClipboard) {
        const data = await prepared;
        if (!current(s)) return;
        const result = await s.bridge.invoke('write_formatting_image_clipboard',{data});
        if (!result?.verified) throw new Error(text('imageCopyError'));
      } else await navigator.clipboard.write([new ClipboardItem({'image/png':prepared})]);
      if (current(s)) s.status.textContent = text('copiedImage');
    } catch (error) { if (current(s)) s.errors.textContent = `${text('imageCopyError')}: ${s.bridge.error(error)}`; }
    finally { s.copying = false; button.disabled = false; }
  }
  async function xPreview(s,markdown,generation) {
    const html = await s.bridge.invoke('render_formatting_markdown',{markdown});
    if (!current(s) || s.generation !== generation || s.data.markdown !== markdown || s.mode !== 'x') return;
    const result = xArticle(html);
    const wrapper = element('section','',{class:'formatting-x-article'});
    const titleRow = element('div','',{class:'formatting-x-title'});
    titleRow.append(element('h1',result.title || text('noTitle')),iconButton('copy',text('copyTitle'),()=>copyXTitle(s)));
    wrapper.append(titleRow,result.section);
    const top = s.preview.scrollTop; s.preview.replaceChildren(wrapper); s.preview.scrollTop = top;
    s.retryButton.hidden = true; s.errors.textContent = '';
    if (!result.images.length) return;
    for (const image of result.images) {
      const row = element('figure','',{class:'formatting-x-image'});
      const thumbnail = element('img','',{alt:image.alt});
      const copyButton = iconButton('copy',text('copyImage'),()=>copyXImage(s,image,copyButton));
      const caption = element('figcaption','');
      caption.append(element('span',`${image.index}. ${image.alt}`),copyButton);
      row.append(thumbnail,caption); image.marker.replaceWith(row);
      try {
        const data = await imageData(s,image.src);
        if (!current(s) || s.generation !== generation) return;
        thumbnail.src = data;
      } catch (error) {
        if (!current(s) || s.generation !== generation) return;
        thumbnail.hidden = true;
        row.append(element('small',`${text('imageError')}${s.bridge.error(error)}`));
        s.retryButton.hidden = false;
      }
    }
  }
  async function weiboPreview(s, markdown, generation) {
    const result = await convert(s, markdown, settings(s), 'weibo');
    if (!current(s) || s.generation !== generation || s.data.markdown !== markdown || s.mode !== 'weibo') return;
    const wrapper = element('section', '', {class:'formatting-x-article formatting-weibo-article'});
    const titleRow = element('div', '', {class:'formatting-x-title'});
    titleRow.append(element('h1', result.section.dataset.articleTitle || text('weiboNoTitle')), iconButton('copy', text('copyTitle'), () => copyXTitle(s, 'weibo')));
    result.section.removeAttribute('data-article-title');
    wrapper.append(titleRow, result.section);
    const top = s.preview.scrollTop; s.preview.replaceChildren(wrapper); s.preview.scrollTop = top;
    s.retryButton.hidden = !result.errors.length;
    s.errors.textContent = result.errors.length ? `${text('failedImages')}\n${result.errors.join('\n')}` : '';
  }
  function updateThemeAvailability(s) {
    const unavailable = s.mode !== 'wechat';
    const key = s.mode === 'weibo' ? 'weiboThemeUnavailable' : unavailable ? 'themeUnavailable' : 'theme';
    s.themeButton.setAttribute('aria-disabled', String(unavailable));
    s.themeButton.dataset.formattingLabel = key;
    s.themeButton.dataset.formattingAria = key;
    s.themeButton.setAttribute('aria-label', text(key));
    const tooltip = s.themeButton.querySelector('.formatting-tooltip');
    tooltip.dataset.formattingLabel = key;
    tooltip.textContent = text(key);
  }
  function setPreviewMode(s,mode) {
    s.mode = mode;
    for (const [node, value] of [[s.wechatMode,'wechat'],[s.xMode,'x'],[s.weiboMode,'weibo']]) {
      node.setAttribute('aria-selected', String(mode === value)); node.tabIndex = mode === value ? 0 : -1;
    }
    s.themeName.hidden = mode !== 'wechat';
    updateThemeAvailability(s);
    if (mode !== 'wechat') { s.settingsPanel.hidden = true; s.themeButton.setAttribute('aria-expanded','false'); }
    preview(s);
  }
  function refreshLanguage() {
    const s = active;
    if (!s || !current(s)) return;
    s.language = s.bridge.language();
    for (const node of s.root.querySelectorAll('[data-formatting-label]')) {
      const label = text(node.dataset.formattingLabel);
      if (!node.querySelector('svg')) {
        const content = [...node.childNodes].find(child => child.nodeType === Node.TEXT_NODE);
        if (content) content.textContent = label;
      }
      if (node.hasAttribute('aria-label')) node.setAttribute('aria-label', label);
      if (node.hasAttribute('title')) node.setAttribute('title', label);
    }
    for (const node of s.root.querySelectorAll('[data-formatting-aria]')) node.setAttribute('aria-label', text(node.dataset.formattingAria));
    updateThemeAvailability(s);
    s.themeName.textContent = text(settings(s).theme);
    s.hint.textContent = text('helpBrief');
    if (s.data.source !== s.sourceAtOpen) s.hint.textContent += ` ${text('changed')}`;
    updateState(s);
    s.editor?.setLanguage?.(s.language);
    schedule(s);
  }
  async function copy(s) {
    if (s.copying) return;
    clearTimeout(s.timer);
    s.copying = true;
    s.copyButton.disabled = true; s.copyXButton.disabled = true; s.copyWeiboButton.disabled = true;
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
    finally { s.copying = false; s.copyButton.disabled = false; s.copyXButton.disabled = false; s.copyWeiboButton.disabled = false; }
  }
  async function importImage(s, file) {
    if (file.src) {
      s.imageFailures.delete(file.src);
      const data = await imageData(s, file.src);
      if (!current(s)) return null;
      return { relativePath: file.src, fileName: file.fileName || 'image' };
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error(`${text('imageError')}PNG / JPEG / WebP`);
    if (file.size > 10 * 1024 * 1024) throw new Error(text('tooLarge'));
    const data = await new Promise((ok, fail) => { const reader = new FileReader(); reader.onload = () => ok(reader.result); reader.onerror = () => fail(new Error(text('imageError'))); reader.readAsDataURL(file); });
    const image = new Image(); image.src = data; await image.decode();
    if (image.width > 8192 || image.height > 8192) throw new Error(text('tooLarge'));
    await s.bridge.invoke('validate_formatting_image_data', { data });
    if (!current(s)) return null;
    s.validatedImages.add(data);
    const src = `nutbook-image-${uniqueId()}.${file.type.split('/')[1]}`;
    if (Object.values(s.data.assets).reduce((sum, value) => sum + value.length, data.length) > 32 * 1024 * 1024) throw new Error(text('tooLarge'));
    s.data.assets[src] = data;
    return { relativePath: src, fileName: file.name || 'pasted-image' };
  }
  function chooseImage(s) {
    return new Promise((resolve, reject) => {
      const input = element('input', '', { type: 'file', accept: 'image/png,image/jpeg,image/webp' });
      input.addEventListener('cancel', () => resolve(null), { once: true });
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file || !current(s)) return resolve(null);
        try { resolve(await importImage(s, file)); }
        catch (error) { reject(error); }
      }, { once: true }); input.click();
    });
  }
  function themePanel(s) {
    const panel = element('aside', '', { class: 'formatting-settings', hidden: '', 'aria-label': text('theme') });
    const heading = element('div', '', { class: 'formatting-settings-head' });
    heading.append(element('strong', text('theme')), iconButton('close', text('close'), () => { panel.hidden = true; s.themeButton.setAttribute('aria-expanded', 'false'); s.themeButton.focus(); }));
    panel.append(heading);
    const themes = element('div', '', { class: 'formatting-themes' });
    const refresh = () => { themes.querySelectorAll('button[data-theme]').forEach(b => b.setAttribute('aria-pressed', b.dataset.theme === settings(s).theme)); s.themeName.textContent = text(settings(s).theme); s.themeName.dataset.formattingLabel = settings(s).theme; updateState(s); schedule(s); };
    for (const key of Object.keys(themeDefaults)) {
      const b = button(text(key), () => { s.data.settings = { theme:key, ...themeDefaults[key] }; controls.forEach(([name,input,output]) => { input.value = settings(s)[name]; output.value = input.value; }); refresh(); });
      b.dataset.theme = key; b.className = `formatting-theme formatting-theme-${key}`; b.setAttribute('aria-pressed', settings(s).theme === key); themes.append(b);
    }
    const upcoming = iconButton('plus', text('moreThemes'), () => {});
    upcoming.classList.add('formatting-theme-coming'); upcoming.setAttribute('aria-disabled', 'true'); themes.append(upcoming);
    const content = element('div', '', { class:'formatting-settings-content' });
    content.append(themes);
    const controls = [];
    const adjustmentRow = element('div', '', { class:'formatting-adjustments' });
    for (const [key, min, max, step] of [['size',14,20,1],['leading',1.6,2.6,0.05],['radius',0,16,2]]) {
      const label = element('label', '', { class: 'formatting-setting' });
      const output = element('output', String(settings(s)[key]));
      const input = element('input', '', { type: 'range', min, max, step, value: settings(s)[key], 'aria-label': text(key) });
      input.addEventListener('input', () => { s.data.settings = { ...settings(s), [key]: Number(input.value) }; output.value = input.value; refresh(); });
      label.append(element('span', text(key)), input, output); adjustmentRow.append(label); controls.push([key, input, output]);
    }
    const reset = iconButton('retry', text('reset'), () => { s.data.settings = { theme: settings(s).theme, ...themeDefaults[settings(s).theme] }; controls.forEach(([key,input,output]) => { input.value = settings(s)[key]; output.value = input.value; }); refresh(); });
    reset.classList.add('formatting-reset'); heading.insertBefore(reset, heading.lastElementChild);
    content.append(adjustmentRow);
    panel.append(content);
    return panel;
  }
  async function open(bridge, tab) {
    if (active) return;
    const opening = ++openGeneration;
    const loaded = await bridge.invoke('load_formatting_draft', { itemId: tab.id });
    if (bridge.activeId() !== tab.id || opening !== openGeneration || active) return;
    if (loaded.draft && (loaded.draft.version !== 1 || typeof loaded.draft.markdown !== 'string' || typeof loaded.draft.source !== 'string' || !loaded.draft.assets || typeof loaded.draft.assets !== 'object')) throw new Error(messages[bridge.language()]?.invalid || messages['zh-CN'].invalid);
    const raw = loaded.source ?? tab.preview.raw ?? '';
    const data = loaded.draft || { version: 1, source: raw, markdown: raw, assets: {} };
    const root = element('div', '', { class: 'formatting-workspace', 'data-i18n-skip':'' });
    const s = { id: tab.id, name: tab.item.fileName, language: bridge.language(), sourceAtOpen:raw, bridge, data, root, revision: loaded.revision, generation: 0, mode:'wechat', composing: false, editor: null, fallback: null, imageFailures: new Map(), imageRequests: new Map(), networkRequests: new Set(), validatedImages: new Set() };
    active = s;
    bridge.suspend();
    const header = element('header', '', { class: 'formatting-header' });
    const heading = element('strong', text('workspaceTitle')); heading.append(element('small', s.name, { class:'formatting-document-name' })); header.append(heading);
    s.status = element('span', '', { role: 'status', 'aria-live': 'polite' });
    s.saveButton = iconButton('save', text('save'), save);
    s.copyButton = iconButton('wechat', text('copy'), () => copy(s));
    s.copyXButton = iconButton('x', text('copyX'), () => copyX(s));
    s.copyWeiboButton = iconButton('weibo', text('copyWeibo'), () => copyWeibo(s));
    s.themeButton = iconButton('theme', text('theme'), () => { if (s.mode !== 'wechat') return; s.settingsPanel.hidden = !s.settingsPanel.hidden; s.themeButton.setAttribute('aria-expanded', String(!s.settingsPanel.hidden)); });
    s.themeButton.setAttribute('aria-expanded', 'false');
    s.undoButton = iconButton('undo', text('undo'), () => { if (!s.composing && !s.importing && !s.originalVisible) s.editor?.undo?.(); });
    header.append(s.status, s.undoButton, iconButton('image', text('image'), async () => { if (!(await s.editor?.insertImageAsset?.()) && !s.errors.textContent) s.errors.textContent = text('insertHelp'); }), s.themeButton, s.saveButton, s.copyButton, s.copyXButton, s.copyWeiboButton, iconButton('back', text('back'), () => leave(s.id)));
    const body = element('div', '', { class: 'formatting-columns' });
    const left = element('section', '', { class: 'formatting-left' });
    const tabs = element('div', '', { class: 'formatting-tools' });
    const mount = element('div', '', { class: 'formatting-editor milkdown-editor-root', 'aria-label': text('editor') });
    const editorOverlay = element('div', '', { class:'formatting-editor-overlay', 'data-markdown-shell-overlay':'' });
    const original = element('article', '', { 'aria-label': text('sourceReadonly'), class: 'formatting-original', hidden: '' });
    const tabList = element('div', '', { class:'formatting-tab-list', role:'tablist', 'aria-label':text('title') });
    const readonlyBadge = element('span', text('sourceReadonly'), { class:'formatting-readonly-badge', hidden:'' });
    const selectTab = async isOriginal => {
      s.originalVisible = isOriginal;
      original.hidden = !isOriginal; mount.hidden = isOriginal; editorOverlay.hidden = isOriginal; readonlyBadge.hidden = !isOriginal;
      s.undoButton.disabled = isOriginal || !s.editor;
      draftTab.setAttribute('aria-selected', String(!isOriginal)); sourceTab.setAttribute('aria-selected', String(isOriginal));
      draftTab.tabIndex = isOriginal ? -1 : 0; sourceTab.tabIndex = isOriginal ? 0 : -1;
      if (!isOriginal) { s.editor?.focus?.(); return; }
      if (s.originalPromise) return;
      original.textContent = text('loading');
      s.originalPromise = (async () => {
        try {
          const html = await s.bridge.invoke('render_formatting_markdown', { markdown:data.source });
          if (!current(s)) return;
          const section = inlineHtml(html);
          original.replaceChildren(section);
          for (const image of section.querySelectorAll('img')) {
            const src = image.getAttribute('data-original-src');
            try { const loaded = await imageData(s, src); if (!current(s)) return; image.src = loaded; }
            catch { if (current(s)) image.replaceWith(element('span', image.alt || text('imageError'))); }
          }
        } catch (error) { if (current(s)) { original.textContent = s.bridge.error(error); s.originalPromise = null; } }
      })();
      await s.originalPromise;
    };
    const draftTab = button(text('draft'), () => selectTab(false));
    const sourceTab = button(text('source'), () => selectTab(true));
    for (const [node,selected] of [[draftTab,true],[sourceTab,false]]) {
      node.className = 'formatting-tab'; node.setAttribute('role','tab'); node.setAttribute('aria-selected',String(selected)); node.tabIndex = selected ? 0 : -1;
      node.addEventListener('keydown', event => { if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? false : event.key === 'End' ? true : node === draftTab; selectTab(next); (next ? sourceTab : draftTab).focus(); } });
    }
    tabList.append(draftTab, sourceTab); tabs.append(tabList, readonlyBadge);
    left.append(tabs, mount, original, editorOverlay);
    const right = element('section', '', { class: 'formatting-right' });
    const previewHeader = element('div', '', { class: 'formatting-tools' });
    s.themeName = element('span', text(settings(s).theme), { class: 'formatting-theme-name' });
    const previewTabs = element('div','',{class:'formatting-tab-list',role:'tablist','aria-label':text('preview')});
    s.wechatMode = button(text('wechatTab'),()=>setPreviewMode(s,'wechat'));
    s.xMode = button(text('xTab'),()=>setPreviewMode(s,'x'));
    s.weiboMode = button(text('weiboTab'),()=>setPreviewMode(s,'weibo'));
    const platformTabs = [[s.wechatMode,'wechat'],[s.xMode,'x'],[s.weiboMode,'weibo']];
    for (const [node,mode] of platformTabs) {
      node.className = 'formatting-tab'; node.setAttribute('role','tab');
      node.setAttribute('aria-selected',String(mode === 'wechat')); node.tabIndex = mode === 'wechat' ? 0 : -1;
      node.addEventListener('keydown',event => {
        if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
          event.preventDefault();
          const index = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (platformTabs.findIndex(([,value]) => value === mode) + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
          setPreviewMode(s,platformTabs[index][1]); platformTabs[index][0].focus();
        }
      });
    }
    previewTabs.append(s.wechatMode,s.xMode,s.weiboMode);
    const previewActions = element('div','',{class:'formatting-preview-actions'});
    previewActions.append(s.themeName,iconButton('phone',text('phone'),()=>s.preview.classList.toggle('formatting-phone')));
    previewHeader.append(previewTabs,previewActions);
    right.append(previewHeader);
    s.preview = element('article', '', { class: 'formatting-preview' });
    right.append(s.preview);
    body.append(left, right);
    s.errors = element('div', '', { class: 'formatting-errors', role: 'alert' });
    const hint = element('p', text('helpBrief'), { class: 'formatting-hint', hidden: '' });
    header.append(iconButton('help', text('help'), () => { hint.hidden = !hint.hidden; }));
    s.retryButton = iconButton('retry', text('retry'), () => { s.imageFailures.clear(); preview(s); });
    s.retryButton.hidden = true; header.append(s.retryButton);
    s.settingsPanel = themePanel(s);
    s.hint = hint;
    root.append(header, s.settingsPanel, body, s.errors, hint);
    bridge.container.replaceChildren(root);
    root.addEventListener('keydown', event => { if (event.key === 'Escape' && !s.settingsPanel.hidden) { event.preventDefault(); event.stopPropagation(); s.settingsPanel.hidden = true; s.themeButton.setAttribute('aria-expanded', 'false'); s.themeButton.focus(); } });
    mount.addEventListener('compositionstart', () => { s.composing = true; });
    mount.addEventListener('compositionend', () => { s.composing = false; schedule(s); });
    try {
      const api = await bridge.editor();
      if (!current(s)) return;
      const editor = await api.create({ root: mount, markdown: data.markdown, fileName: s.name, language: s.language,
        isolateImages: true,
        resolveImageSrc: src => {
          const cached = s.data.assets[src] || (/^data:/i.test(src) ? src : null);
          if (cached) return s.validatedImages.has(cached) ? cached : 'data:image/png;base64,';
          return /^(https?:)?\/\//i.test(src) ? 'data:image/png;base64,' : bridge.resolveImage(src, tab);
        },
        onInsertImageAsset: () => chooseImage(s),
        onPasteImageAsset: file => importImage(s, file),
        onImagePasteStatus: (kind, message) => { if (!current(s)) return; s.importing = kind === 'busy'; if (kind === 'error') { s.errors.textContent = message; updateState(s); } else if (kind === 'busy') s.status.textContent = text('importBusy'); else { updateState(s); schedule(s); } },
        onChange: value => { if (current(s)) { s.data.markdown = value; updateState(s); schedule(s); } }
      });
      if (!current(s)) { editor.destroy?.(); return; }
      s.editor = editor;
      editor.rebindInsertMenuHost?.(editorOverlay);
      s.undoButton.disabled = Boolean(s.originalVisible);
      s.data.markdown = editor.getMarkdown();
    } catch (error) {
      if (!current(s)) return;
      s.errors.textContent = text('fallback');
      s.undoButton.disabled = true;
      s.fallback = element('textarea', '', { class: 'formatting-source', 'aria-label': text('editor') });
      s.fallback.value = data.markdown;
      mount.replaceChildren(s.fallback);
      s.fallback.addEventListener('input', () => { s.data.markdown = s.fallback.value; updateState(s); schedule(s); });
    }
    s.baseline = serialized(s);
    if (data.source !== raw) hint.textContent += ` ${text('changed')}`;
    await preview(s);
  }
  window.NutbookFormatting = { open, leave, save, refreshLanguage, activeId: () => active?.id ?? null, label: language => messages[language]?.title || messages['zh-CN'].title };
})();
