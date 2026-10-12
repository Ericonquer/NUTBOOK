/* Shared draft editor for Markdown host DOM and the existing HTML controls surface. */
(function () {
  window.NutbookTagEditor = {
    mount(container, options) {
      let en = options.language === 'en-US';
      const text = (zh, english) => en ? english : zh;
      let selected = options.tags.map(tag => ({ id: tag.id, name: tag.name }));
      let primary = selected[0];
      let busy = false;
      const available = options.available.map(tag => ({ id: tag.id, name: tag.name }));
      container.replaceChildren();
      container.setAttribute('data-i18n-skip', '');
      container.classList.add('nb-tag-editor');
      const heading = document.createElement('div'); heading.className = 'tag-editor-title'; heading.textContent = text('自定义标签', 'Custom Tag');
      const search = document.createElement('input');
      search.className = 'tag-editor-search';
      search.placeholder = text('查找或新建标签', 'Find or create tag');
      search.setAttribute('aria-label', search.placeholder);
      const list = document.createElement('div'); list.className = 'tag-editor-list';
      const create = document.createElement('button'); create.type = 'button';
      create.textContent = text('＋ 新建', '＋ New');
      const error = document.createElement('div'); error.className = 'tag-editor-error'; error.setAttribute('role', 'alert');
      const footer = document.createElement('div'); footer.className = 'tag-editor-footer';
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = text('取消', 'Cancel');
      const save = document.createElement('button'); save.type = 'button'; save.textContent = text('确认', 'Confirm');
      cancel.title = cancel.textContent; save.title = save.textContent; create.title = create.textContent;
      create.className = 'tag-editor-create'; cancel.className = 'tag-editor-cancel'; save.className = 'tag-editor-save';
      const searchRow = document.createElement('div'); searchRow.className = 'tag-editor-search-row'; searchRow.append(search, create);
      footer.append(cancel, save); container.append(heading, searchRow, list, error, footer);
      function render() {
        create.hidden = !search.value.trim() || available.some(tag => tag.name === search.value.trim());
        list.replaceChildren();
        for (const tag of available.filter(tag => selected.some(entry => tag.id != null ? entry.id === tag.id : entry === tag) || tag.name.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()))) {
          const row = document.createElement('div'); row.className = 'tag-editor-row';
          const label = document.createElement('label');
          const check = document.createElement('input'); check.type = 'checkbox'; check.checked = selected.includes(tag) || selected.some(t => t.id != null && t.id === tag.id);
          // Reuse the selected object so primary identity survives a search/render.
          const entry = selected.find(t => tag.id != null ? t.id === tag.id : t === tag) || tag;
          check.disabled = busy;
          label.title = tag.name;
          label.append(check, document.createTextNode(tag.name));
          check.onchange = () => {
            if (check.checked) { selected.push(entry); if (!primary) primary = entry; }
            else { selected = selected.filter(t => t !== entry); if (primary === entry) primary = null; }
            render();
          };
          const main = document.createElement('button'); main.type = 'button';
          main.textContent = primary === entry ? text('主标签', 'Primary') : text('设为主标签', 'Set primary');
          main.disabled = busy || !check.checked; main.title = main.textContent;
          main.onclick = () => { primary = entry; render(); };
          row.append(label, main); list.append(row);
        }
      }
      search.oninput = render;
      function add() {
        const name = search.value.trim(); if (!name || busy) return;
        const existing = available.find(t => t.name === name);
        if (existing) {
          if (!selected.some(t => existing.id != null ? t.id === existing.id : t === existing)) selected.push(existing);
        } else { const tag = { name }; available.push(tag); selected.push(tag); }
        if (!primary && !options.tags.length) primary = selected[0];
        search.value = ''; render(); search.focus();
      }
      create.onclick = add;
      search.onkeydown = event => { if (event.key === 'Enter' && !event.isComposing) { event.preventDefault(); add(); } };
      cancel.onclick = () => { if (!busy) options.onCancel(); };
      save.onclick = async () => {
        if (busy) return;
        busy = true; search.disabled = create.disabled = cancel.disabled = save.disabled = true; error.textContent = ''; render();
        try {
          await options.onSave({ selections: selected.map(t => t.id != null ? { id: t.id } : { name: t.name }), primaryIndex: primary ? selected.indexOf(primary) : null });
          options.onCancel();
        } catch (reason) {
          error.textContent = text('保存失败：', 'Save failed: ') + String(reason);
        } finally {
          busy = false; search.disabled = create.disabled = cancel.disabled = save.disabled = false; render();
        }
      };
      container.onkeydown = event => { if (event.key === 'Escape' && !busy) { event.stopPropagation(); options.onCancel(); } };
      render();
      return {
        get busy() { return busy; },
        setLanguage(language) {
          const next = language === 'en-US'; if (en === next) return; en = next;
          heading.textContent = text('自定义标签', 'Custom Tag');
          search.placeholder = text('查找或新建标签', 'Find or create tag'); search.setAttribute('aria-label', search.placeholder);
          create.textContent = create.title = text('＋ 新建', '＋ New');
          cancel.textContent = cancel.title = text('取消', 'Cancel');
          save.textContent = save.title = text('确认', 'Confirm'); render();
        }
      };
    }
  };
})();
