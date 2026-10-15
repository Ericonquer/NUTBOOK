// UTF-16 offsets match Intl.Segmenter and span inline author nodes without rewriting them.
export function focusSelectionOffsets(element,selection=window.getSelection()){
 if(!element||!selection?.rangeCount||selection.isCollapsed)return null;
 const range=selection.getRangeAt(0);if(!element.contains(range.startContainer)||!element.contains(range.endContainer))return null;
 const prefix=document.createRange();prefix.selectNodeContents(element);prefix.setEnd(range.startContainer,range.startOffset);const start=prefix.toString().length;prefix.setEnd(range.endContainer,range.endOffset);const end=prefix.toString().length;
 return end>start&&end<=65535?{start,end}:null;
}
