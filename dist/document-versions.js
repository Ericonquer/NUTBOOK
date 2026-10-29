/* Local document history UI. Owns no editor state and never edits content DOM. */
(() => {
  let current = null;
  function fitHtmlPreview(host, frame, canvas = null) {
    host.classList.add('vh-html-preview');
    frame.classList.add('vh-html-view');
    const fit = () => {
      const width = host.clientWidth - 48, height = host.clientHeight - 48;
      if (width <= 0 || height <= 0) return;
      const viewport = canvas?.width || Math.max(800, width);
      const scale = canvas ? Math.min(width / canvas.width, height / canvas.height) : width / viewport;
      frame.style.width = `${viewport}px`;
      frame.style.height = `${canvas?.height || height / scale}px`;
      frame.style.transform = `scale(${scale})`;
      frame.style.left = `${24 + (canvas ? (width - canvas.width * scale) / 2 : 0)}px`;
      frame.style.top = `${24 + (canvas ? (height - canvas.height * scale) / 2 : 0)}px`;
    };
    const observer = new ResizeObserver(fit);
    observer.observe(host); fit();
    return () => { observer.disconnect(); host.classList.remove('vh-html-preview'); };
  }
  function authoredCanvas(dom, pages) {
    if (!pages.length) return null;
    const rules=[];
    for(const style of dom.querySelectorAll('style')){
      try { const sheet=new CSSStyleSheet();sheet.replaceSync(style.textContent);for(const rule of sheet.cssRules)if(rule.selectorText)rules.push(rule); } catch (_) {}
    }
    for(let node=pages[0].parentElement;node&&node!==dom.documentElement;node=node.parentElement){
      let width='',height='';
      for(const rule of rules){try{if(node.matches(rule.selectorText)){width=rule.style.width||width;height=rule.style.height||height;}}catch(_){}}
      width=node.style.width||width;height=node.style.height||height;
      if(/^\d+(?:\.\d+)?px$/.test(width)&&/^\d+(?:\.\d+)?px$/.test(height)){
        const w=parseFloat(width),h=parseFloat(height);if(w>=300&&h>=200&&w<=10000&&h<=10000)return {width:w,height:h};
      }
    }
    return null;
  }
  // Parse only the backend's inert projection. The sandbox never runs scripts.
  function htmlPages(html) {
    const dom = new DOMParser().parseFromString(html, 'text/html');
    let pages = [...dom.querySelectorAll('[data-nutbook-page-id]')];
    if (!pages.length) {
      for (const selector of ['section.slide', 'section.page', '.slides > section']) {
        const candidates = [...dom.querySelectorAll(selector)];
        if (candidates.length > 1) { pages = candidates; break; }
      }
    }
    for (const [index, page] of pages.entries()) {
      page.setAttribute('data-vh-page', String(index));
    }
    return { dom, pages, canvas: authoredCanvas(dom,pages) };
  }
  function pageHtml(model, index) {
    const copy = model.dom.cloneNode(true);
    const selector = '[data-vh-page]';
    for (const page of copy.querySelectorAll(selector)) {
      const selected = Number(page.getAttribute('data-vh-page')) === index;
      page.classList.toggle('active', selected);
      page.classList.toggle('present', selected);
      page.hidden = !selected;
      if (!selected) page.style.setProperty('display', 'none', 'important');
      else if (page.style.display === 'none') page.style.removeProperty('display');
      if (selected) { page.style.setProperty('visibility', 'visible', 'important'); page.style.setProperty('opacity', '1', 'important'); }
    }
    const style = copy.createElement('style');
    style.textContent = '*{animation:none!important;transition:none!important} [data-vh-page][hidden]{display:none!important}';
    copy.head.append(style);
    return '<!doctype html>' + copy.documentElement.outerHTML;
  }
  function annotatedPreview(previewHtml, beforeHtml, afterHtml) {
    const parse=html=>new DOMParser().parseFromString(html,'text/html');
    const reference=html=>{const template=document.createElement('template');template.innerHTML=html;return {body:template.content};};
    const preview=parse(previewHtml),before=reference(beforeHtml),after=reference(afterHtml);
    const blocks=dom=>[...dom.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p,li,td,th,img')].filter(n=>n.tagName==='IMG'||(!n.querySelector('h1,h2,h3,h4,h5,h6,p,li,td,th')&&n.textContent.trim()));
    const old=blocks(before),next=blocks(after),shown=blocks(preview);
    const key=n=>n.dataset.id?'id:'+n.dataset.id:n.tagName==='IMG'?'image:'+n.getAttribute('src')+':'+n.getAttribute('alt'):n.textContent.trim();
    const boundary=(node,offset)=>{const walk=preview.createTreeWalker(node,NodeFilter.SHOW_TEXT);let text,last=null;while((text=walk.nextNode())){last=text;if(offset<=text.length)return [text,offset];offset-=text.length;}return last?[last,last.length]:[node,node.childNodes.length];};
    const mark=(node,value)=>{
      if(node.tagName==='IMG'){node.setAttribute('data-vh-image-change','');node.setAttribute('title','图片引用已更改 / Image reference changed');return;}
      const original=node.textContent;let prefix=0,suffix=0;
      while(prefix<original.length&&prefix<value.length&&original[prefix]===value[prefix])prefix++;
      while(suffix<original.length-prefix&&suffix<value.length-prefix&&original[original.length-1-suffix]===value[value.length-1-suffix])suffix++;
      if(prefix&&/[\uD800-\uDBFF]/.test(original[prefix-1]))prefix--;
      if(suffix&&/[\uDC00-\uDFFF]/.test(original[original.length-suffix]))suffix--;
      const range=preview.createRange(),[start,so]=boundary(node,prefix),[end,eo]=boundary(node,original.length-suffix);range.setStart(start,so);range.setEnd(end,eo);
      const fragment=preview.createDocumentFragment(),removed=range.extractContents();
      if(original.length-prefix-suffix){const del=preview.createElement('del');del.className='vh-inline-removed';del.append(removed);fragment.append(del);}
      const added=value.slice(prefix,value.length-suffix);if(added&&original.length-prefix-suffix){const arrow=preview.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.style.color='#999';arrow.textContent=' → ';fragment.append(arrow);}if(added){const ins=preview.createElement('ins');ins.className='vh-inline-added';ins.textContent=added;fragment.append(ins);}range.insertNode(fragment);
    };
    let i=0,j=0,lastAnchor=null;
    const apply=(a,b)=>{const node=shown[a];if(!node)return;if(!b)mark(node,'');else if(old[a].tagName==='IMG'){if(old[a].getAttribute('src')!==b.getAttribute('src'))mark(node,'');}else if(old[a].textContent!==b.textContent)mark(node,b.textContent);lastAnchor=node;};
    const insert=(node,anchor)=>{const element=preview.createElement(node.tagName==='IMG'?'p':node.tagName.toLowerCase()),ins=preview.createElement('ins');ins.className='vh-inline-added';ins.textContent=node.tagName==='IMG'?'新增图片 / New image: '+(node.getAttribute('alt')||node.getAttribute('src')||''):node.textContent;element.append(ins);if(anchor?.parentNode)anchor.before(element);else if(lastAnchor?.parentNode)lastAnchor.after(element);else preview.body.append(element);lastAnchor=element;};
    // Bounded sequence alignment keeps large documents responsive.
    if(old.length*next.length>500000){for(let n=0;n<old.length;n++)apply(n,next[n]);}
    else{
      const grid=Array.from({length:old.length+1},()=>new Uint32Array(next.length+1));
      for(let a=old.length-1;a>=0;a--)for(let b=next.length-1;b>=0;b--)grid[a][b]=key(old[a])===key(next[b])?grid[a+1][b+1]+1:Math.max(grid[a+1][b],grid[a][b+1]);
      while(i<old.length||j<next.length){
        if(i<old.length&&j<next.length&&key(old[i])===key(next[j])){apply(i,next[j]);i++;j++;continue;}
        const removed=[],added=[];
        while(i<old.length||j<next.length){if(i<old.length&&j<next.length&&key(old[i])===key(next[j]))break;if(j<next.length&&(i===old.length||grid[i][j+1]>=grid[i+1][j]))added.push(next[j++]);else removed.push(i++);}
        let r=0,n=0;while(r<removed.length||n<added.length){if(r===removed.length){insert(added[n++],shown[i]);continue;}if(n===added.length){apply(removed[r++],null);continue;}const oldImage=old[removed[r]].tagName==='IMG',newImage=added[n].tagName==='IMG';if(oldImage&&!newImage){insert(added[n++],shown[removed[r]]);continue;}if(!oldImage&&newImage){apply(removed[r++],null);continue;}apply(removed[r++],added[n++]);}
      }
    }
    const style=preview.createElement('style');style.textContent='.vh-inline-removed{background:#fbe7df!important;color:#9c492f!important;text-decoration:line-through!important;border-radius:2px;box-decoration-break:clone}.vh-inline-added{background:#deeee4!important;color:#164f34!important;text-decoration:none!important;border-radius:2px;box-decoration-break:clone}[data-vh-image-change]{outline:3px solid #d29340!important;outline-offset:4px}';preview.head.append(style);
    return '<!doctype html>'+preview.documentElement.outerHTML;
  }
  let preferenceMenuId=0;
  const words = {
    'zh-CN': {title:'版本历史',close:'关闭版本历史',empty:'还没有保存版本',source:'只读源码',preview:'静态预览',restore:'恢复此版本',remove:'删除此版本',clear:'清空此文档历史',limit:'容量上限（MB，十进制）',apply:'保存额度',used:'历史用量',incomplete:'依赖不完整；预览只使用历史中保存的资源',missing:'原文件不可用，历史仍保留',confirmDelete:'删除历史不会删除原文件。共享对象仍被引用时不会释放其空间。',confirmRestore:'恢复前的当前内容也会保留为版本。是否继续？',dirty:'当前有未保存内容，请选择如何继续恢复。',saveRestore:'保存并恢复',discardRestore:'放弃并恢复',cancel:'取消',confirm:'确认',restored:'已恢复此版本。',initial:'原始版',save:'保存版',restoredKind:'恢复版',choose:'选择一个版本',capacityNote:'降低额度不删除历史；进行中的保存可能使新额度暂时超限。',confirmIncomplete:'该版本缺少部分依赖。仅恢复已保存的内容？',error:'操作失败，草稿保留：'},
    'en-US': {title:'Version history',close:'Close version history',empty:'No saved versions yet',source:'Read-only source',preview:'Static preview',restore:'Restore this version',remove:'Delete this version',clear:'Clear this document’s history',limit:'Capacity limit (decimal MB)',apply:'Save limit',used:'History usage',incomplete:'Incomplete dependencies; preview uses archived resources only',missing:'Source unavailable; history retained',confirmDelete:'Deleting history does not delete the source. Shared objects remain while referenced.',confirmRestore:'The current content will also be retained. Continue?',dirty:'There are unsaved changes. Choose how to continue restoring.',saveRestore:'Save and restore',discardRestore:'Discard and restore',cancel:'Cancel',confirm:'Confirm',restored:'Version restored.',initial:'Initial',save:'Saved',restoredKind:'Restored',choose:'Choose a version',capacityNote:'Lowering the limit does not delete history. In-flight saves may temporarily exceed the new limit.',confirmIncomplete:'This version has incomplete dependencies. Restore captured content only?',error:'Operation failed; draft retained: '}
  };
  const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function dependencyInfo(snapshot) {
    const entries=Object.entries(snapshot.dependencies).filter(([,dep])=>dep.state!=='captured');
    const uncertain=entries.filter(([path,dep])=>path.startsWith('html:warning:')&&dep.reason==='script runtime dependencies cannot be proven statically');
    const actionable=entries.filter(entry=>!uncertain.includes(entry));
    return {entries,uncertain,actionable,missing:actionable.filter(([,dep])=>dep.state==='missing-at-save')};
  }
  function renderDependencyInfo(warning,snapshot,incomplete,en) {
    const info=dependencyInfo(snapshot),excluded=info.actionable.filter(([path,dep])=>!path.startsWith('html:warning:')&&dep.state!=='missing-at-save').length;
    warning.replaceChildren();warning.open=false;warning.hidden=!incomplete&&!info.entries.length;
    if(warning.hidden)return;
    const summary=document.createElement('summary'),detail=document.createElement('div');
    if(info.missing.length) {
      summary.textContent=en?`${info.missing.length} ${snapshot.html?'resource(s)':'image(s)'} not found at save`:`${info.missing.length} ${snapshot.html?'项资源':'张图片'}未找到`;
    } else if(excluded) {
      summary.textContent=en?`${excluded} resource(s) not archived`:`${excluded} 项资源未归档`;
    } else if(info.entries.length) {
      summary.textContent=en?'About static preview':'静态预览说明';
    } else {
      summary.textContent=en?'Some content cannot be previewed':'部分内容无法预览';
    }
    const lines=[];
    if(info.missing.length)lines.push((en?'Missing when saved: ':'保存时未找到：')+info.missing.map(([path])=>path).join('、'));
    const other=info.actionable.filter(([path,dep])=>dep.state!=='missing-at-save'&&!path.startsWith('html:warning:'));
    if(other.length)lines.push((en?'Files not retained in this version: ':'此版本未保留的文件：')+other.map(([path])=>path).join('、'));
    if(info.entries.some(([path])=>path.startsWith('html:warning:')))lines.push(en?'This preview shows the saved static page without running animations or interactive scripts. Some special references may not be reproduced; these notes do not mean the source file is missing.':'这里只显示保存的静态页面，不播放动画或运行交互。部分特殊引用可能无法还原；这不等于原文件丢失。');
    summary.title=summary.textContent;detail.textContent=lines.join('\n');warning.append(summary,detail);
  }
  async function open(ctx) {
    if(current) await current.close();
    const w=words[ctx.language()]||words['zh-CN'];
    const dialog=document.createElement(ctx.container?'div':'dialog');dialog.className='nutbook-history'+(ctx.container?' vh-embedded':'');dialog.setAttribute('aria-label',w.title);dialog.dataset.i18nSkip='true';
    dialog.innerHTML=`<header><div><h2>${w.title}</h2></div><button type="button" data-close title="${w.close}" aria-label="${w.close}">×</button></header><div class="vh-prompt" data-prompt hidden></div><div class="vh-layout"><nav data-list aria-label="${w.title}"></nav><section class="vh-main"><div class="vh-toolbar"><div class="vh-actions vh-tabs"><button data-highlight aria-pressed="true">${ctx.language()==='en-US'?'Highlight changes':'标注差异'}</button><button data-mode="preview" aria-pressed="true">${w.preview}</button><button data-mode="source" aria-pressed="false">${w.source}</button></div><div class="vh-pager" data-pages hidden><button type="button" data-page-prev><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button><input data-page type="text" inputmode="numeric" autocomplete="off" spellcheck="false"><span data-page-count></span><button type="button" data-page-next><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button></div><details data-warning class="vh-dependency" hidden></details></div><p class="vh-change-legend" data-change-legend hidden></p><p class="vh-page-title" data-page-title hidden></p><div class="vh-preview" data-frame-host></div><textarea class="vh-view" data-source readonly spellcheck="false" aria-label="${w.source}" hidden></textarea></section></div><footer class="vh-actions"><button data-restore class="vh-primary" disabled>${w.restore}</button><button data-save-as disabled></button><button data-delete disabled>${w.remove}</button><button data-clear class="vh-danger" disabled>${w.clear}</button></footer><p class="vh-status" data-status role="status" aria-live="polite"></p>`;
    if(ctx.onBack){const back=dialog.querySelector('[data-close]');const label=ctx.language()==='en-US'?'Back to files':'返回文件列表';back.classList.add('vh-return');back.title=label;back.setAttribute('aria-label',label);back.innerHTML=`<span aria-hidden="true">←</span> ${ctx.language()==='en-US'?'Back':'返回'}`;}
    const saveAsButton=dialog.querySelector('[data-save-as]');saveAsButton.textContent=ctx.language()==='en-US'?'Save version as…':'另存此版本…';saveAsButton.hidden=!ctx.readOnly&&!ctx.allowSaveAs;
    if(ctx.readOnly)dialog.querySelector('[data-restore]').hidden=true;
    (ctx.container||document.body).append(dialog);if(!ctx.container){const heading=dialog.querySelector('h2');heading.tabIndex=-1;dialog.showModal();heading.focus({preventScroll:true});}
    let disposed=false,generation=0,session=null,data=null,doc=null,version=null,busy=false,promptFocus=null,pendingPrompt=null,fitCleanup=null,pageModel=null,pageIndex=0,pageId=null,syncPager=()=>{};
    const $=s=>dialog.querySelector(s),status=s=>$('[data-status]').textContent=s;
    const buttonTitles=()=>dialog.querySelectorAll('button').forEach(b=>{if(!b.title)b.title=b.textContent;if(!b.getAttribute('aria-label'))b.setAttribute('aria-label',b.textContent);});buttonTitles();
    const revoke=async()=>{pageModel=null;syncPager=()=>{};$('[data-pages]').hidden=true;$('[data-page-title]').hidden=true;generation++;fitCleanup?.();fitCleanup=null;$('[data-frame-host]').replaceChildren();if(session){const id=session;session=null;await ctx.invoke('close_document_version_preview',{sessionId:id});}};
    const run=async(fn)=>{if(busy||disposed)return;promptFocus=document.activeElement;busy=true;$('[data-page]').disabled=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){status(w.error+ctx.error(e));}finally{busy=false;if(!disposed){dialog.querySelectorAll('button').forEach(b=>b.disabled=false);$('[data-restore]').disabled=!version||!(doc?.id===data?.activeDocumentId&&data?.restoreAllowed!==false&&ctx.canRestore(doc));$('[data-save-as]').disabled=!version;$('[data-delete]').disabled=!version;$('[data-clear]').disabled=!doc?.versions?.length;syncPager();promptFocus?.focus();promptFocus=null;}}};
    const prompt=async(message,choices)=>new Promise(resolve=>{
      const p=$('[data-prompt]'),previous=promptFocus||document.activeElement,id='vh-confirm-'+(++preferenceMenuId);
      const siblings=[...dialog.children].filter(node=>node!==p).map(node=>[node,node.inert]);
      siblings.forEach(([node])=>node.inert=true);
      p.hidden=false;p.innerHTML=`<section class="vh-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="${id}" aria-describedby="${id}-message"><h3 id="${id}">${ctx.language()==='en-US'?'Confirm action':'请确认操作'}</h3><p id="${id}-message">${esc(message)}</p><div class="vh-confirm-actions"></div></section>`;
      const finish=value=>{pendingPrompt=null;p.onkeydown=null;p.hidden=true;p.replaceChildren();siblings.forEach(([node,inert])=>node.inert=inert);promptFocus=previous;resolve(value);};pendingPrompt=()=>finish(choices[0][0]);
      for(const[value,label]of choices){const b=document.createElement('button');b.type='button';b.textContent=label;b.title=label;b.setAttribute('aria-label',label);if(value===choices.at(-1)[0]&&value!==false&&value!=='cancel')b.className='vh-primary';b.onclick=()=>finish(value);p.querySelector('.vh-confirm-actions').append(b);}
      p.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish(choices[0][0]);}else if(e.key==='Tab'){const buttons=[...p.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}};
      p.querySelector('button')?.focus();
    });
    const select=async(d,v)=>{await revoke();doc=d;version=v;renderList();if(!v)return;const seq=++generation;const response=await ctx.invoke('get_document_version_preview',{payload:{documentId:d.id,versionId:v.id,generation:seq}});if(disposed||generation!==seq){await ctx.invoke('close_document_version_preview',{sessionId:response.sessionId});return;}session=response.sessionId;if(!response.html)throw new Error(ctx.language()==='en-US'?'Archived preview unavailable':'历史预览内容不可用');const frame=document.createElement('iframe');frame.className='vh-view';frame.dataset.frame='';frame.setAttribute('sandbox','');frame.referrerPolicy='no-referrer';frame.title=w.preview;frame.addEventListener('load',()=>{if(!disposed&&generation===seq&&frame.isConnected){status('');}});frame.addEventListener('error',()=>{if(generation===seq&&frame.isConnected){status(ctx.language()==='en-US'?'Preview could not load.':'预览未能加载。');}});pageModel=v.snapshot.html?htmlPages(response.html):null;
      const picker=$('[data-page]'),previous=$('[data-page-prev]'),next=$('[data-page-next]'),en=ctx.language()==='en-US';
      previous.title=en?'Previous page':'上一页';next.title=en?'Next page':'下一页';previous.setAttribute('aria-label',previous.title);next.setAttribute('aria-label',next.title);
      picker.title=en?'Page number · Enter to jump':'页码 · 按 Enter 跳转';picker.setAttribute('aria-label',picker.title);
      const canCompare=typeof data.currentHtml==='string'&&d.id===data.activeDocumentId;
      const renderFrame=()=>{let html=pageModel?.pages.length?pageHtml(pageModel,pageIndex):response.html;if(canCompare&&$('[data-highlight]').getAttribute('aria-pressed')==='true')html=annotatedPreview(html,response.sourceHtml||response.html,data.currentHtml);frame.srcdoc=html;};
      $('[data-highlight]').hidden=!canCompare;
      const legend=$('[data-change-legend]');legend.hidden=!canCompare;legend.textContent=(en?'Red strike: previous content · Green: current content':'红色删除线：旧内容 · 绿色：当前内容')+' · '+new Date(v.saved_at).toLocaleString(ctx.language())+' → '+(data.currentModifiedAt?new Date(data.currentModifiedAt).toLocaleString(ctx.language()):(en?'current file':'当前文件'));
      $('[data-highlight]').onclick=()=>{$('[data-highlight]').setAttribute('aria-pressed',String($('[data-highlight]').getAttribute('aria-pressed')!=='true'));legend.hidden=$('[data-highlight]').getAttribute('aria-pressed')!=='true';renderFrame();};
      const showPager=()=>{const hidden=!pageModel?.pages.length||$('[data-mode="source"]').getAttribute('aria-pressed')==='true';$('[data-pages]').hidden=hidden;$('[data-page-title]').hidden=hidden;};showPager();
      syncPager=()=>{};
      if(pageModel?.pages.length){
        const matched=pageModel.pages.findIndex(p=>(p.getAttribute('data-nutbook-page-id')||p.id)===pageId);
        pageIndex=matched>=0?matched:Math.min(pageIndex,pageModel.pages.length-1);
        const sizePageInput=()=>{const digits=Math.max(3,Math.min(16,Math.max(picker.value.length,String(pageModel.pages.length).length)));picker.style.width=`calc(${digits}ch + 20px)`;};
        picker.oninput=sizePageInput;
        syncPager=()=>{picker.value=String(pageIndex+1);sizePageInput();picker.disabled=busy;picker.removeAttribute('aria-invalid');previous.disabled=busy||pageIndex===0;next.disabled=busy||pageIndex===pageModel.pages.length-1;$('[data-page-count]').textContent='/ '+pageModel.pages.length;const title=pageModel.pages[pageIndex].querySelector('h1,h2,h3')?.textContent.trim().replace(/\s+/g,' ')||'';$('[data-page-title]').textContent=title;$('[data-page-title]').title=title;pageId=pageModel.pages[pageIndex].getAttribute('data-nutbook-page-id')||pageModel.pages[pageIndex].id||null;};syncPager();
        const go=index=>{if(busy||disposed||index<0||index>=pageModel.pages.length)return;pageIndex=index;syncPager();status('');renderFrame();};
        previous.onclick=()=>go(pageIndex-1);next.onclick=()=>go(pageIndex+1);
        picker.onkeydown=event=>{event.stopPropagation();if(event.isComposing)return;if(event.key==='Enter'){event.preventDefault();const value=picker.value.trim();if(!/^[1-9]\d*$/.test(value)||!Number.isSafeInteger(Number(value))||Number(value)>pageModel.pages.length){picker.setAttribute('aria-invalid','true');status(en?`Enter a page from 1 to ${pageModel.pages.length}.`:`请输入 1–${pageModel.pages.length} 之间的页码。`);return;}go(Number(value)-1);}else if(event.key==='Escape'){event.preventDefault();syncPager();status('');}};
        picker.onblur=()=>{if(picker.getAttribute('aria-invalid')==='true')status('');syncPager();};
        renderFrame();
      }else{picker.oninput=null;picker.onkeydown=null;picker.onblur=null;previous.onclick=null;next.onclick=null;renderFrame();}$('[data-frame-host]').replaceChildren(frame);if(v.snapshot.html)fitCleanup=fitHtmlPreview($('[data-frame-host]'),frame,pageModel?.canvas);$('[data-source]').value=response.source;
      renderDependencyInfo($('[data-warning]'),v.snapshot,response.incomplete,ctx.language()==='en-US');};
    function renderList(){const nav=$('[data-list]');nav.replaceChildren();for(const d of (data?.documents||[]).filter(d=>d.id===(ctx.documentId||data.activeDocumentId))){const heading=document.createElement('p');heading.textContent=d.canonical_path.split(/[\\/]/).pop()+(data.availability?.[d.id]===false?' · '+w.missing:'');heading.title=d.canonical_path;heading.className='vh-document';nav.append(heading);for(const v of [...d.versions].reverse()){const b=document.createElement('button');b.type='button';const kind=v.kind==='initial'?w.initial:v.kind==='restore'?w.restoredKind:w.save;const date=new Date(v.saved_at).toLocaleString(ctx.language(),{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});b.innerHTML=`<span class="vh-kind">${esc(kind)}</span><time>${esc(date)}</time>`;b.setAttribute('aria-current',String(version?.id===v.id));b.title=b.textContent;b.onclick=()=>run(()=>select(d,v));nav.append(b);}}if(!nav.children.length)nav.textContent=w.empty;}
    const refresh=async()=>{data=await ctx.invoke('list_document_versions',{payload:ctx.target||{}});if(disposed)return;const selected=data.documents.find(d=>d.id===(doc?.id||data.activeDocumentId));doc=selected||null;version=doc?.versions.find(v=>v.id===version?.id)||null;renderList();};
    const close=async()=>{if(disposed)return;disposed=true;pendingPrompt?.();current=null;window.removeEventListener('keydown',keys,true);if(ctx.container)dialog.remove();await revoke().catch(()=>{});if(!ctx.container)dialog.close();dialog.remove();ctx.restoreFocus?.();};current={close,embedded:Boolean(ctx.container)};
    const exitPreview=async()=>{if(busy||disposed)return;await close();if(ctx.onBack&&(!ctx.isActive||ctx.isActive()))await ctx.onBack();};
    $('[data-close]').onclick=exitPreview;dialog.addEventListener('cancel',e=>{e.preventDefault();void exitPreview();});
    dialog.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{const source=b.dataset.mode==='source';dialog.querySelectorAll('[data-mode]').forEach(tab=>tab.setAttribute('aria-pressed',String(tab===b)));$('[data-frame-host]').hidden=source;$('[data-source]').hidden=!source;$('[data-pages]').hidden=source||!pageModel?.pages.length;$('[data-page-title]').hidden=source||!pageModel?.pages.length;});
    $('[data-delete]').onclick=()=>run(async()=>{if(await prompt(w.confirmDelete,[[false,w.cancel],[true,w.confirm]])){await revoke();await ctx.invoke('delete_document_versions',{payload:{documentId:doc.id,versionId:version.id,confirmed:true}});version=null;await refresh();}});
    $('[data-clear]').onclick=()=>run(async()=>{if(await prompt(w.confirmDelete,[[false,w.cancel],[true,w.confirm]])){await revoke();await ctx.invoke('delete_document_versions',{payload:{documentId:doc.id,versionId:null,confirmed:true}});version=null;await refresh();}});
    $('[data-save-as]').onclick=()=>run(async()=>{
      const selectedDoc=doc,selectedVersion=version;if(!selectedVersion)return;
      const incomplete=Object.values(selectedVersion.snapshot.dependencies).some(d=>d.state!=='captured');
      if(dependencyInfo(selectedVersion.snapshot).actionable.length&&!await prompt(ctx.language()==='en-US'?'Some resources were not archived. Save the content and available resources anyway?':'部分资源未存入历史。是否继续另存正文和已保存的资源？',[[false,w.cancel],[true,ctx.language()==='en-US'?'Continue saving':'继续另存']]))return;
      const path=await ctx.invoke('save_document_version_as',{payload:{documentId:selectedDoc.id,versionId:selectedVersion.id,allowIncomplete:incomplete}});
      if(!path||disposed)return;
      status((ctx.language()==='en-US'?'Saved. Add the file to open it: ':'已另存，可通过“添加文件”打开：')+path);
    });
    $('[data-restore]').onclick=()=>run(async()=>{
      const selectedDoc=doc,selectedVersion=version;let dirty=ctx.dirty();
      const choice=dirty?await prompt(w.dirty,[['cancel',w.cancel],['discard',w.discardRestore],['save',w.saveRestore]]):await prompt(w.confirmRestore,[['cancel',w.cancel],['discard',w.confirm]]);
      if(choice==='cancel')return;if(choice==='save'&&!await ctx.save()){status(w.error+(ctx.language()==='en-US'?'Save did not complete':'保存未完成'));return;}
      const incomplete=Object.values(selectedVersion.snapshot.dependencies).some(d=>d.state!=='captured');
      if(dependencyInfo(selectedVersion.snapshot).actionable.length&&!await prompt(w.confirmIncomplete,[[false,w.cancel],[true,w.confirm]]))return;
      await revoke();const result=await ctx.invoke('restore_document_version',{payload:{documentId:selectedDoc.id,versionId:selectedVersion.id,target:ctx.target,expectedHash:await ctx.expectedHash(),allowIncomplete:incomplete}});
      await ctx.applied(result);await refresh();if(version)await select(doc,version);status(w.restored);
    });
    // Let the modal own shortcuts; never dispatch editor/global history actions.
    const keys=e=>{if(!disposed&&(e.metaKey||e.ctrlKey)&&['s','w','z','y','k'].includes(e.key.toLowerCase())){e.preventDefault();e.stopImmediatePropagation();}};window.addEventListener('keydown',keys,true);dialog.addEventListener('close',()=>window.removeEventListener('keydown',keys,true),{once:true});
    await run(async()=>{await refresh();const active=data.documents.find(d=>d.id===(ctx.documentId||data.activeDocumentId));if(active?.versions?.length)await select(active,active.versions.at(-1));});
  }
  async function mountLibrary(container,ctx){
    if(current)await current.close();
    const en=ctx.language()==='en-US',w=words[ctx.language()]||words['zh-CN'];
    if(ctx.isActive&&!ctx.isActive())return;
    const dialog=document.createElement('div');dialog.className='nutbook-history vh-library vh-embedded';dialog.dataset.i18nSkip='true';
    const title=en?'Version history':'版本历史';dialog.setAttribute('aria-label',title);
    dialog.innerHTML=`<header class="vh-library-heading"><div><h2>${title}<span class="vh-summary-count" data-library-count></span></h2><p class="vh-muted">${en?'Browse saved versions and free up history storage.':'查看已保存的文件版本，按需清理历史。'}</p></div></header><div data-library-storage></div><div class="vh-prompt" data-library-prompt hidden></div><div class="vh-library-scroll"><table><thead><tr><th>${en?'File':'文件'}</th><th>${en?'Saved versions':'历史版本'}</th><th title="${en?'Shared resources may count toward multiple files.':'共享资源可能计入多个文件。'}">${en?'Storage':'占用空间'}</th><th class="vh-action-heading">${en?'Actions':'操作'}</th></tr></thead><tbody data-library-list></tbody></table><div data-library-empty hidden><strong>${en?'No versions saved yet':'还没有文件历史'}</strong><p>${en?'Saved versions will appear here after you edit and save a file.':'编辑并保存文件后，可以在这里查看历史版本。'}</p></div></div><footer class="vh-muted"><span>${en?'Total storage counts shared resources once.':'总用量已对共享资源去重。'}</span></footer><p class="vh-status" data-library-status role="status"></p>`;
    container.replaceChildren(dialog);let disposed=false,busy=false,pendingConfirm=null,actionFocus=null;
    const $=selector=>dialog.querySelector(selector);
    const close=async()=>{if(disposed)return;disposed=true;pendingConfirm?.();current=null;dialog.remove();};current={close,embedded:true};

    const run=async action=>{if(busy||disposed)return;actionFocus=document.activeElement;busy=true;dialog.querySelectorAll('.vh-file-actions button').forEach(button=>button.disabled=true);try{await action();}catch(error){$('[data-library-status]').textContent=ctx.error(error);}finally{busy=false;if(!disposed){dialog.querySelectorAll('.vh-file-actions button').forEach(button=>button.disabled=button.dataset.noVersions==='true'||button.dataset.unavailable==='true');actionFocus?.focus();}}};
    const confirm=message=>new Promise(resolve=>{
      const prompt=$('[data-library-prompt]'),id='vh-library-confirm-'+(++preferenceMenuId),siblings=[...dialog.children].filter(node=>node!==prompt).map(node=>[node,node.inert]);siblings.forEach(([node])=>node.inert=true);
      prompt.hidden=false;prompt.innerHTML=`<section class="vh-confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="${id}"><h3 id="${id}">${en?'Confirm action':'请确认操作'}</h3><p>${esc(message)}</p><div class="vh-confirm-actions"></div></section>`;
      const finish=value=>{pendingConfirm=null;prompt.onkeydown=null;prompt.hidden=true;prompt.replaceChildren();siblings.forEach(([node,inert])=>node.inert=inert);resolve(value);};pendingConfirm=()=>finish(false);
      for(const[value,label]of [[false,w.cancel],[true,w.confirm]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.title=label;if(value)button.className='vh-primary';button.onclick=()=>finish(value);prompt.querySelector('.vh-confirm-actions').append(button);}
      prompt.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finish(false);}else if(event.key==='Tab'){event.preventDefault();const buttons=[...prompt.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);buttons[(index+1)%buttons.length].focus();}};prompt.querySelector('button').focus();
    });
    const load=async()=>{
      const data=await ctx.invoke('list_document_versions',{payload:{}});if(disposed)return;
      const bytes=value=>value<1000000?(value/1000).toFixed(1)+' KB':(value/1000000).toFixed(value%1000000?1:0)+' MB';
      $('[data-library-count]').textContent=`${data.documents.length} ${en?'files':'份文件'}`;
      await mountStorageSettings($('[data-library-storage]'),{...ctx,historyData:data,locationHost:dialog.querySelector('.vh-library-heading')});if(disposed)return;
      const list=$('[data-library-list]');list.replaceChildren();$('[data-library-empty]').hidden=data.documents.length>0;
      for(const doc of data.documents){
        const row=document.createElement('tr'),name=doc.canonical_path.split(/[\\/]/).pop();
        const size=data.documentBytes?.[doc.id];
        const status=data.sourceStatus?.[doc.id]||(data.availability?.[doc.id]===false?'inaccessible':'available');
        const sourceMessages=en?{
          missing:['File not found at original path','The file may have been moved, renamed or deleted. Saved versions are still kept.'],
          replaced:['File at this path has been replaced','A file exists at the original path, but its identity has changed, possibly after an external editor saved it. These versions belong to the earlier file and are still kept.'],
          inaccessible:['Cannot access original file','The original file cannot currently be checked. Check folder permissions and whether the drive is connected. Saved versions are still kept.']
        }:{
          missing:['原路径找不到文件','文件可能已移动、改名或删除。已保存的历史版本仍然保留。'],
          replaced:['原路径文件已被替换','原路径仍有文件，但文件身份已变化，可能由其他编辑器替换保存。这些历史属于替换前的文件，仍然保留。'],
          inaccessible:['暂时无法访问原文件','当前无法核验原文件，请检查文件夹权限或磁盘是否连接。已保存的历史版本仍然保留。']
        };
        const sourceMessage=sourceMessages[status];
        const segments=doc.canonical_path.split(/[\\/]/).filter(Boolean),parent=segments.slice(-3,-1).join(' / ');
        const last=doc.versions.at(-1),date=last?new Date(last.saved_at).toLocaleString(ctx.language(),{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'—';
        row.innerHTML=`<td><div class="vh-file-cell"><span class="vh-file-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M8 12h8M8 16h6"/></svg></span><div class="vh-file-copy"><span class="vh-file-name" title="${esc(doc.canonical_path)}">${esc(name)}</span><span class="vh-file-location" title="${esc(doc.canonical_path)}">${esc(parent)}</span>${sourceMessage?`<span class="vh-file-unavailable" tabindex="0" title="${esc(sourceMessage[1])}" aria-label="${esc(sourceMessage.join('。'))}">${esc(sourceMessage[0])}</span>`:''}</div></div></td><td><span class="vh-version-count">${doc.versions.length} ${en?(doc.versions.length===1?'version':'versions'):'个版本'}</span><time class="vh-last-saved" title="${esc(last?.saved_at||'')}">${esc(date)}</time></td><td class="vh-reference-bytes">${size==null?'—':bytes(size)}</td><td class="vh-file-actions"></td>`;
        const actions=row.querySelector('.vh-file-actions');
        const view=document.createElement('button');view.textContent=en?'View':'查看';view.title=en?'View this file’s versions':'查看此文件的历史';view.onclick=()=>{if(busy||!doc.versions.length)return;void close().then(()=>open({...ctx,container,target:{},documentId:doc.id,readOnly:true,canRestore:()=>false,onBack:()=>mountLibrary(container,ctx)}));};view.disabled=!doc.versions.length;view.dataset.noVersions=String(!doc.versions.length);actions.append(view);
        const clear=document.createElement('button');clear.textContent=en?'Clear':'清理';clear.title=w.clear;clear.className='vh-clear-file';clear.onclick=()=>run(async()=>{if(!doc.versions.length)return;if(await confirm((en?'Clear history for ':'清空历史：')+name+'？ '+w.confirmDelete)){await ctx.invoke('delete_document_versions',{payload:{documentId:doc.id,versionId:null,confirmed:true}});await load();}});clear.disabled=!doc.versions.length;clear.dataset.noVersions=String(!doc.versions.length);actions.append(clear);list.append(row);
      }
    };
    await run(load);

  }
  async function mountStorageSettings(container,ctx) {
    const w=words[ctx.language()]||words['zh-CN'];
    const en=ctx.language()==='en-US';
    container.dataset.i18nSkip='true';
    const openLabel=en?'Open history storage location':'打开历史存储位置';
    container.innerHTML=`<div class="preference-row history-preference-row"><div class="preference-copy"><div class="preference-title">${en?'History storage':'历史存储'}</div><div class="preference-desc" data-history-usage></div><div class="preference-desc history-retention-note"><span>${en?'Existing history is kept.':'降低上限不会删除已有历史。'}</span><button class="settings-inline-link" data-history-open title="${openLabel}" aria-label="${openLabel}">${openLabel}</button></div><p class="preference-desc" role="status" data-history-status></p></div><div class="history-usage-progress"><progress data-history-progress max="1" value="0" aria-label="${w.used}"></progress></div><div class="preference-control history-preference-control"><span title="${w.capacityNote}">${en?'Capacity limit':'容量上限'}</span><button type="button" class="preference-select history-capacity-trigger" data-history-preset aria-haspopup="listbox" aria-expanded="false" aria-label="${w.limit}" title="${w.limit}"></button><div class="history-capacity-menu" data-history-options popover role="listbox" aria-label="${w.limit}">${[['500','500 MB'],['1000','1 GB'],['2000','2 GB'],['custom',en?'Custom':'自定义']].map(([value,label])=>`<button type="button" role="option" data-history-option="${value}" title="${label}">${label}</button>`).join('')}</div><input class="preference-select" data-history-limit type="text" inputmode="numeric" aria-label="${en?'Custom limit (MB)':'自定义容量（MB）'}" placeholder="MB" hidden><button class="default-app-button" data-history-apply title="${w.apply}" disabled>${w.apply}</button></div></div>`;
    const data=ctx.historyData||await ctx.invoke('list_document_versions',{payload:{}});
    if(!container.isConnected)return;
    const input=container.querySelector('[data-history-limit]'),preset=container.querySelector('[data-history-preset]');
    const megabytes=String(data.limitBytes/1000000);input.value=megabytes;preset.value=['500','1000','2000'].includes(megabytes)?megabytes:'custom';input.hidden=preset.value!=='custom';
    const menu=container.querySelector('[data-history-options]'),options=[...menu.querySelectorAll('[data-history-option]')];
    menu.id='history-capacity-'+(++preferenceMenuId);preset.setAttribute('aria-controls',menu.id);
    const apply=container.querySelector('[data-history-apply]');
    const updateApply=()=>{const valid=/^[1-9]\d*$/.test(input.value)&&Number.isSafeInteger(Number(input.value));apply.disabled=!valid||Number(input.value)===Number(megabytes);};
    input.addEventListener('input',updateApply);updateApply();
    const sync=()=>{preset.textContent=options.find(option=>option.dataset.historyOption===preset.value)?.textContent+' ▾';options.forEach(option=>option.setAttribute('aria-selected',String(option.dataset.historyOption===preset.value)));};sync();
    const showMenu=()=>{menu.showPopover();const rect=preset.getBoundingClientRect();menu.style.left=Math.min(rect.left,window.innerWidth-menu.offsetWidth-12)+'px';menu.style.top=(rect.bottom+6+menu.offsetHeight>window.innerHeight?Math.max(12,rect.top-menu.offsetHeight-6):rect.bottom+6)+'px';options.find(option=>option.getAttribute('aria-selected')==='true')?.focus();};
    preset.onclick=()=>menu.matches(':popover-open')?menu.hidePopover():showMenu();
    preset.onkeydown=event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();showMenu();}};
    menu.addEventListener('toggle',()=>preset.setAttribute('aria-expanded',String(menu.matches(':popover-open'))));
    options.forEach(option=>option.onclick=()=>{preset.value=option.dataset.historyOption;input.hidden=preset.value!=='custom';if(input.hidden)input.value=preset.value;updateApply();sync();menu.hidePopover();if(input.hidden)preset.focus();else input.focus();});
    menu.onkeydown=event=>{const index=options.indexOf(document.activeElement);let next=index;if(event.key==='ArrowDown')next=(index+1)%options.length;else if(event.key==='ArrowUp')next=(index+options.length-1)%options.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=options.length-1;else if(event.key==='Escape'){event.preventDefault();menu.hidePopover();preset.focus();return;}else return;event.preventDefault();options[next]?.focus();};
    const used=data.usedBytes>0&&data.usedBytes<1000000?(data.usedBytes/1000).toFixed(1)+' KB':(data.usedBytes/1000000).toFixed(2)+' MB';
    container.querySelector('[data-history-usage]').innerHTML=`<strong>${esc(used)}</strong><span> / ${data.limitBytes/1000000} MB</span>`;
    const progress=container.querySelector('[data-history-progress]');progress.max=data.limitBytes;progress.value=Math.min(data.usedBytes,data.limitBytes);progress.setAttribute('aria-valuetext',`${used} / ${data.limitBytes/1000000} MB`);
    const locationButton=container.querySelector('[data-history-open]');
    if(ctx.locationHost?.isConnected){ctx.locationHost.querySelector('[data-history-open]')?.remove();locationButton.textContent=en?'Open history':'打开历史';locationButton.className='default-app-button';ctx.locationHost.append(locationButton);}
    locationButton.onclick=()=>ctx.invoke('open_document_history_location',{}).catch(e=>{container.querySelector('[data-history-status]').textContent=ctx.error(e);});
    container.querySelector('[data-history-apply]').onclick=async()=>{
      const button=container.querySelector('[data-history-apply]'),input=container.querySelector('[data-history-limit]'),status=container.querySelector('[data-history-status]');
      if(!/^[1-9]\d*$/.test(input.value)||!Number.isSafeInteger(Number(input.value))){status.textContent=w.limit;return;}
      button.disabled=true;input.disabled=true;preset.disabled=true;
      try{await ctx.invoke('set_version_history_limit',{megabytes:Number(input.value)});await mountStorageSettings(container,{...ctx,historyData:null});}catch(e){status.textContent=ctx.error(e);input.disabled=false;preset.disabled=false;updateApply();}
    };
  }
  globalThis.NutbookVersions={open,mountLibrary,mountStorageSettings,closeEmbedded:()=>current?.embedded?current.close():undefined,isOpen:()=>Boolean(current),close:()=>current?.close()};
})();
