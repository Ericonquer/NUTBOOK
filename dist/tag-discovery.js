/* Home-only tag discovery. Labels remain user data; preferences contain IDs only. */
(function () {
  const key = 'nutbook.tagDiscovery.v1';
  function read() {
    try { const value=JSON.parse(localStorage.getItem(key)||'{}'); return {expanded:value.expanded===true,pins:[...new Set((value.pins||[]).filter(Number.isInteger))]}; }
    catch (_) { return {expanded:false,pins:[]}; }
  }
  let preferences=read(), popup=null, owner=null, callbacks=null, rootFingerprint="", optionsFingerprint="";
  const text=(zh,en)=>callbacks.language()==='en-US'?en:zh;
  const button=(label,action,className='')=>{const node=document.createElement('button');node.type='button';node.textContent=label;node.className=className;node.title=label;node.onclick=action;return node;};
  function save() { localStorage.setItem(key,JSON.stringify(preferences)); }
  function close() { optionsFingerprint=""; popup?.remove(); popup=null; owner?.setAttribute('aria-expanded','false'); }
  function pin(id) {
    preferences=read(); preferences.pins=preferences.pins.includes(id)?preferences.pins.filter(value=>value!==id):[...preferences.pins,id]; save(); callbacks?.changed();
    if(popup) renderOptions();
  }
  function select(id,multi) { callbacks.select(id,multi); if(!multi) close(); }
  function renderOptions() {
    const list=popup.querySelector('.tag-discovery-options'), query=popup.querySelector('input').value.toLocaleLowerCase();
    const data=callbacks.data();
    const fingerprint=JSON.stringify([query,data.tags,data.selected,data.untagged,data.stats,preferences.pins,callbacks.language()]);
    if(optionsFingerprint===fingerprint)return;
    optionsFingerprint=fingerprint;
    list.replaceChildren();
    const add=(tag)=>{
      const row=document.createElement('div');row.className='tag-discovery-option';
      const label=document.createElement('label'), check=document.createElement('input');check.type='checkbox';check.checked=tag.id==null?data.untagged:data.selected.includes(tag.id);
      check.onchange=()=>select(tag.id,true);label.append(check,document.createTextNode(tag.name));
      const count=document.createElement('span');count.className='tag-discovery-count';count.textContent=data.stats?String(tag.id==null?data.stats.untagged:(data.stats.counts[tag.id]||0)):'—';label.append(count);row.append(label);
      if(tag.id!=null){const pinned=preferences.pins.includes(tag.id);const action=button('',()=>pin(tag.id),'tag-discovery-pin'+(pinned?' pinned':''));action.innerHTML='<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h6M8 3v5l-3 3v2h10v-2l-3-3V3M10 13v4"/></svg>';action.title=pinned?text('取消固定','Unpin'):text('固定标签','Pin tag');action.setAttribute('aria-label',action.title);const tip=document.createElement('span');tip.className='tag-pin-tooltip';tip.textContent=action.title;action.append(tip);action.removeAttribute('title');action.setAttribute('aria-pressed',String(pinned));row.append(action);}list.append(row);
    };
    add({id:null,name:text('未打标','Untagged')});
    data.tags.filter(tag=>tag.name.toLocaleLowerCase().includes(query)).forEach(add);
    if(list.children.length===1 && query){const empty=document.createElement('div');empty.className='tag-discovery-empty';empty.textContent=text('没有匹配标签','No matching tags');list.append(empty);}
  }
  function open(trigger) {
    if(popup){close();return;} owner=trigger;owner.setAttribute('aria-expanded','true');popup=document.createElement('div');popup.className='tag-discovery-popup';popup.setAttribute('role','dialog');popup.setAttribute('aria-label',text('全部标签','All tags'));popup.setAttribute('data-i18n-skip','');
    const header=document.createElement('div');header.className='tag-discovery-popup-header';header.textContent=text('同时满足所选标签','Match all selected tags');const exit=button('×',()=>{close();trigger.focus();});exit.title=text('关闭','Close');exit.setAttribute('aria-label',exit.title);header.append(exit);
    const search=document.createElement('input');search.type='search';search.placeholder=text('查找标签','Find tags');search.setAttribute('aria-label',search.placeholder);search.oninput=renderOptions;
    const list=document.createElement('div');list.className='tag-discovery-options';popup.append(header,search,list);document.body.append(popup);const rect=trigger.getBoundingClientRect();popup.style.left=Math.max(8,Math.min(innerWidth-296,rect.left))+'px';popup.style.top=Math.max(8,Math.min(rect.bottom+6,innerHeight-220))+'px';renderOptions();search.focus();
  }
  window.NutbookTagDiscovery={
    mount(root,config){callbacks=config;preferences=read();const data=config.data();
      const fingerprint=JSON.stringify([data,preferences,config.language()]);
      if(rootFingerprint===fingerprint){if(popup)renderOptions();return;}
      rootFingerprint=fingerprint;root.replaceChildren();root.setAttribute('data-i18n-skip','');
      const toggle=config.toggle;
      toggle.onclick=()=>{preferences=read();preferences.expanded=!preferences.expanded;save();config.changed();};
      toggle.setAttribute('aria-expanded',String(preferences.expanded));
      toggle.setAttribute('aria-pressed',String(preferences.expanded));
      const hint=preferences.expanded?text('收起标签','Collapse tags'):text('展开标签','Expand tags');
      toggle.setAttribute('aria-label',hint);toggle.querySelector('.home-action-tooltip').textContent=hint;
      root.hidden=!preferences.expanded;
      if(preferences.expanded){const row=document.createElement('div');row.className='tag-discovery-shortcuts';const valid=new Set(data.tags.map(tag=>tag.id));const pins=preferences.pins.filter(id=>valid.has(id));const ranked=data.stats?data.tags.filter(tag=>(data.stats.counts[tag.id]||0)>0&&!pins.includes(tag.id)).sort((a,b)=>(data.stats.counts[b.id]||0)-(data.stats.counts[a.id]||0)||a.name.localeCompare(b.name)):[];const ids=[...pins,...ranked.map(tag=>tag.id)].slice(0,8);
        for(const id of ids){const tag=data.tags.find(tag=>tag.id===id),active=data.selected.includes(id);const chip=button(tag.name,()=>select(id,true),'tag-discovery-chip'+(active?' active':''));chip.setAttribute('aria-pressed',String(active));const count=document.createElement('span');count.className='tag-discovery-count';count.textContent=data.stats?String(data.stats.counts[id]||0):'—';chip.append(count);row.append(chip);}
        const all=button(text('全部标签','All tags'),()=>open(all),'tag-discovery-all');all.setAttribute('aria-haspopup','dialog');all.setAttribute('aria-expanded',String(!!popup));owner=all;row.append(all);const files=button(text("选择文件","Select files"),()=>{close();config.selectFiles();},"tag-discovery-files");row.append(files);root.append(row);
        if(data.error){const error=document.createElement('span');error.className='tag-discovery-error';error.textContent=text('标签计数加载失败','Tag counts unavailable');const retry=button(text('重试','Retry'),()=>config.retry());error.append(retry);root.append(error);}
      } else close();
      if(popup)renderOptions();
    },prune(ids){preferences=read();const pins=preferences.pins.filter(id=>ids.includes(id));if(pins.length!==preferences.pins.length){preferences.pins=pins;save();}},isPinned:id=>read().pins.includes(id),togglePin:pin,close,
  };
  document.addEventListener('pointerdown',event=>{if(popup&&!popup.contains(event.target)&&!owner?.contains(event.target))close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&popup){const target=owner;close();target?.focus();event.preventDefault();}});
  window.addEventListener('resize',close);window.addEventListener('storage',event=>{if(event.key===key){preferences=read();callbacks?.changed();}});
})();
