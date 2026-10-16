import {textGlyphs} from './text-effects.mjs';
export function snapshotObject(element){
 const dpr=Math.min(2,devicePixelRatio||1),image=element instanceof HTMLImageElement;
 const prepared=image?null:textGlyphs(element),glyphs=prepared?.glyphs;
 const r=image?element.getBoundingClientRect():{left:Math.min(...glyphs.map(g=>g.rect.left)),top:Math.min(...glyphs.map(g=>g.rect.top)),right:Math.max(...glyphs.map(g=>g.rect.right)),bottom:Math.max(...glyphs.map(g=>g.rect.bottom))};
 const rect={left:r.left,top:r.top,width:r.width??r.right-r.left,height:r.height??r.bottom-r.top};
 if(rect.width<=0||rect.height<=0){prepared?.dispose();throw Error('对象没有可见范围');}
 if(Math.ceil(rect.width*dpr)*Math.ceil(rect.height*dpr)>16777216){prepared?.dispose();throw Error('对象过大，请缩小后再使用碎片效果');}
 const canvas=document.createElement('canvas');canvas.width=Math.ceil(rect.width*dpr);canvas.height=Math.ceil(rect.height*dpr);const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
 try{if(image){if(!element.complete||!element.naturalWidth)throw Error('图片尚未就绪');const style=getComputedStyle(element),fit=style.objectFit;let w=rect.width,h=rect.height;if(['contain','cover','scale-down','none'].includes(fit)){const scale=fit==='none'?1:fit==='cover'?Math.max(w/element.naturalWidth,h/element.naturalHeight):Math.min(fit==='scale-down'?1:Infinity,w/element.naturalWidth,h/element.naturalHeight);w=element.naturalWidth*scale;h=element.naturalHeight*scale;}const pos=style.objectPosition.split(' ').map(v=>parseFloat(v)/100);ctx.drawImage(element,(rect.width-w)*(Number.isFinite(pos[0])?pos[0]:.5),(rect.height-h)*(Number.isFinite(pos[1])?pos[1]:.5),w,h);}else for(const g of glyphs)ctx.drawImage(g.image,g.rect.left-rect.left,g.rect.top-rect.top,g.rect.width,g.rect.height);}
 catch(error){canvas.width=canvas.height=0;throw error;}finally{prepared?.dispose();}
 return {rect,canvas};
}
