// Stable short UI identities follow the page's declared target order, never its text.
export function motionTargetLabel(page,id,resolve){
 const type=target=>target.kind==='text'?(/^H[1-6]$/.test(resolve(target.id)?.tagName||'')?'标题':'文本框'):({image:'图片',group:'组合',video:'视频',embedded:'嵌入内容'}[target.kind]||'对象');
 const target=page?.targets.find(target=>target.id===id);if(!target)return '对象';const name=type(target),peers=page.targets.filter(item=>type(item)===name);return `${name} ${peers.findIndex(item=>item.id===id)+1}`;
}
