/* Inline management lives inside the existing Settings surface, including its native overlay. */
(function(){
 let root,config,active=null,busy=false,selected=new Set();
 const text=(zh,en)=>config.language==='en-US'?en:zh;
 const make=(tag,className,content)=>{const n=document.createElement(tag);n.className=className;if(content!=null)n.textContent=content;return n;};
 function button(label,action){const n=make('button','tag-management-action',label);n.type='button';n.title=label;n.disabled=busy;n.onclick=action;return n;}
 function render(){
  if(!root)return;root.replaceChildren();root.setAttribute('data-i18n-skip','');
  selected=new Set([...selected].filter(id=>config.tags.some(t=>t.id===id)));
  const cloud=make('div','tag-management-cloud');root.append(cloud);
  const pinSvg='<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h6l-1 5 3 4H5l3-4-1-5Z M10 12v5"/></svg>';
  for(const tag of config.tags){
   const row=make('div','tag-management-row');
   const name=button(tag.name,()=>{if(name.longPressed){name.longPressed=false;return;}selected.has(tag.id)?selected.delete(tag.id):selected.add(tag.id);active=null;render();});name.classList.add('tag-management-name');name.setAttribute('aria-pressed',String(selected.has(tag.id)));name.title=text(`长按重命名 · ${config.counts?.[tag.id]||0} 个文件`,`Hold to rename · ${config.counts?.[tag.id]||0} files`);
   const rename=()=>{active={id:tag.id,mode:'rename',name:tag.name,target:'',error:''};render();root.querySelector('.tag-management-inline-input')?.focus();};
   let timer;const stop=()=>clearTimeout(timer);name.onpointerdown=e=>{if(e.button===0)timer=setTimeout(()=>{name.longPressed=true;rename();},550);};name.onpointerup=stop;name.onpointerleave=stop;name.onpointercancel=stop;name.onkeydown=e=>{if(e.key==='F2'){e.preventDefault();e.stopPropagation();rename();}};
   const pinned=config.isPinned(tag.id);const pin=button(pinned?text('取消固定','Unpin'):text('固定标签','Pin tag'),()=>{config.pin(tag.id);render();});pin.innerHTML=pinSvg;pin.setAttribute('aria-label',pin.title);pin.setAttribute('aria-pressed',String(pinned));pin.classList.add('tag-management-pin');
   const remove=button(text('删除标签','Delete tag'),()=>{active={id:tag.id,mode:'delete',name:tag.name,error:''};render();});remove.textContent='×';remove.setAttribute('aria-label',remove.title);remove.classList.add('tag-management-remove');remove.disabled=busy||!config.counts;
   row.dataset.selected=String(selected.has(tag.id));
   if(active?.id===tag.id&&active.mode==='rename'){
    const input=make('input','tag-management-inline-input');input.value=active.name;input.disabled=busy;input.setAttribute('aria-label',text('标签名称','Tag name'));input.title=text('Enter 保存 · Esc 取消','Enter to save · Esc to cancel');input.style.width=Math.min(240,Math.max(45,active.name.length*13))+'px';
    let composing=false;input.oncompositionstart=()=>composing=true;input.oncompositionend=()=>composing=false;input.oninput=()=>{active.name=input.value;input.style.width=Math.min(240,Math.max(45,input.value.length*13))+'px';};
    input.onkeydown=async e=>{e.stopPropagation();if(e.isComposing||composing||e.keyCode===229)return;if(e.key==='Escape'){e.preventDefault();active=null;render();}else if(e.key==='Enter'){e.preventDefault();if(busy)return;if(!active.name.trim()){active.error=text('标签名称不能为空','Tag name cannot be empty');render();root.querySelector('.tag-management-inline-input')?.focus();return;}const operation={...active};busy=true;render();try{await config.mutate(operation);active=null;}catch(err){active={...operation,error:config.error(err)};}finally{busy=false;render();root.querySelector('.tag-management-inline-input')?.focus();}}};

    row.append(input);if(active.error){const error=make('span','tag-management-inline-error',active.error);error.setAttribute('role','alert');row.append(error);}
   }else row.append(name);
   if(selected.size>=2&&selected.values().next().value===tag.id){const keep=make('span','tag-management-keep','✓');keep.title=text('保留此标签','Keep this tag');keep.setAttribute('aria-label',keep.title);row.append(keep);}row.append(pin,remove);cloud.append(row);
  }
  const toolbar=make('div','tag-management-selection');
  const targetTag=config.tags.find(t=>t.id===selected.values().next().value);
  const merge=button(selected.size>=2?text(`合并到 ${targetTag.name}`,`Merge into ${targetTag.name}`):text('合并标签','Merge tags'),()=>{const ids=[...selected];active={id:ids[0],ids,mode:'merge',target:String(ids[0]),error:''};render();});merge.disabled=busy||selected.size<2||!config.counts;toolbar.append(merge,make('span','tag-management-hint',selected.size?text(`已选 ${selected.size} 个标签`,`${selected.size} tags selected`):text('点击多选 · 长按重命名','Click to select · Hold to rename')));root.append(toolbar);
  for(const tag of config.tags){
   if(active?.id===tag.id&&active.mode!=='rename'){
    const panel=make('div','tag-management-editor');panel.setAttribute('role','group');panel.setAttribute('aria-label',text('编辑标签','Edit tag'));
    if(active.mode==='rename'){
     const input=make('input','tag-management-input');input.value=active.name;input.disabled=busy;input.setAttribute('aria-label',text('标签名称','Tag name'));input.oninput=()=>active.name=input.value;panel.append(input);
     panel.append(make('div','tag-management-hint',text('去除首尾空格；大小写与内部空格保留，已有同名标签不能重复创建。','Trims outer spaces; case and inner spaces are preserved. Existing names cannot be duplicated.')));
    } else if(active.mode==='merge'){
     panel.classList.add('tag-management-merge-confirm');
     const target=config.tags.find(t=>t.id===Number(active.target));
     const sources=config.tags.filter(t=>active.ids.includes(t.id)&&t.id!==Number(active.target));
     panel.append(make('span','tag-management-merge-summary',text(`将「${sources.map(t=>t.name).join('、')}」并入「${target?.name||''}」`,`Merge “${sources.map(t=>t.name).join(', ')}” into “${target?.name||''}”`)));
     panel.append(make('span','tag-management-hint',text('文件保留','Files are kept')));
    } else panel.append(make('div','tag-management-hint',text(`将从 ${(config.counts ? (config.counts[tag.id]||0) : '—')} 个文件移除「${tag.name}」。只删除标签，文件保留。`,`Removes “${tag.name}” from ${(config.counts ? (config.counts[tag.id]||0) : '—')} files. Files are kept.`)));
    const error=make('div','tag-management-error',active.error);error.setAttribute('role','alert');panel.append(error);
    const actions=make('div','tag-management-actions');actions.append(button(text('取消','Cancel'),()=>{active=null;render();}),button(active.mode==='merge'?text('确认合并','Confirm merge'):text('确认','Confirm'),async()=>{
     if(busy)return;
     if(active.mode==='rename'&&!active.name.trim()||active.mode==='merge'&&!active.target){active.error=text('请填写名称或选择目标标签','Enter a name or select a target');render();return;}
     const operation={...active};busy=true;render();
     try{if(operation.mode==='merge'){await config.mutate(operation);selected.clear();}else await config.mutate(operation);active=null;}catch(e){active={...operation,error:config.error(e)};if(!config.tags.some(t=>t.id===active.id))active.id=Number(operation.target);}finally{busy=false;render();}
    }));panel.append(actions);root.append(panel);
   }
  }
  if(!config.tags.length)root.append(make('div','settings-empty',text('还没有标签','No tags yet')));
 }
 window.NutbookTagManagement={mount(node,options){root=node;config=options;if(active&&!busy&&!config.tags.some(t=>t.id===active.id))active=null;render();}};
})();
