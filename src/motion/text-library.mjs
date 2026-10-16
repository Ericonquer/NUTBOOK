// Product choices are separate from saved legacy candidates.
export const presentationTextIds=Object.freeze(['text.masked-heading','text.glyph-particles','text.split-flip','text.outline-write','text.fold-unfold','text.echo-trail','text.character-stagger','text.blur-reveal','text.typewriter','text.pressure','text.light-sweep','text.gradient','text.decode-reveal','text.true-focus','text.count-up']);
export function numericText(text){
 const match=text.match(/^(\s*[¥￥$€£]?\s*)([+-]?)(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(\s*(?:%|％|元|万元|亿元|万|亿|人|个|次|件|倍|年|天|小时|分钟|秒|km|kg|ms|GB|MB)?\s*)$/u);
 if(!match)return null;const [,prefix,sign,integer,fraction='',suffix]=match,value=Number(sign+integer.replaceAll(',','')+fraction);if(!Number.isFinite(value)||Math.abs(value)>Number.MAX_SAFE_INTEGER||fraction.length>7)return null;
 const decimals=Math.max(0,fraction.length-1),grouped=integer.includes(',');
 return {value,format(n){const fixed=Math.abs(n).toFixed(decimals),[whole,part]=fixed.split('.'),digits=grouped?whole.replace(/\B(?=(\d{3})+(?!\d))/g,','):whole.padStart(integer.length,'0');return prefix+(n<0?'-':sign==='+'?'+':'')+digits+(part===undefined?'':'.'+part)+suffix;}};
}
export const supportsTextEffect=(id,element)=>id!=='text.count-up'||Boolean(element&&numericText(element.textContent));

export function focusChoices(text,grouping=0){return [...new Intl.Segmenter('zh',{granularity:grouping===1?'grapheme':'word'}).segment(text)].filter(unit=>unit.segment.trim()).slice(0,256).map(unit=>unit.segment);}
