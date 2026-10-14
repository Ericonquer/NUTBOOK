import {createProjection} from './projection.mjs';
// Projection only: semantic text nodes stay intact and editable.
const random = seed => { let n = seed >>> 0; return () => { n = (Math.imul(n,1664525)+1013904223)>>>0; return n/4294967296; }; };
export function sampleGlyphs(element) {
  const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
  if (rect.width < 1 || rect.height < 1) throw new Error('Target is not visible');
  const mask = document.createElement('canvas'); mask.width = Math.ceil(rect.width); mask.height = Math.ceil(rect.height);
  const context = mask.getContext('2d', {willReadFrequently:true});
  context.fillStyle = '#fff'; context.textBaseline = 'middle';
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const segmenter = new Intl.Segmenter(undefined,{granularity:'grapheme'});
  let node;
  while ((node = walker.nextNode())) {
    const computed = getComputedStyle(node.parentElement);
    context.font = computed.font || `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    for (const {segment,index} of segmenter.segment(node.data)) {
      if (!segment.trim()) continue;
      const range = document.createRange(); range.setStart(node,index); range.setEnd(node,index+segment.length);
      const bounds = range.getBoundingClientRect();
      context.fillText(segment,bounds.left-rect.left,bounds.top-rect.top+bounds.height/2);
    }
  }
  const pixels = context.getImageData(0,0,mask.width,mask.height).data, candidates=[];
  for(let y=0;y<mask.height;y+=2) for(let x=0;x<mask.width;x+=2) if(pixels[(y*mask.width+x)*4+3]>80) candidates.push([x,y]);
  if (!candidates.length) throw new Error('No readable glyph contour');
  return {rect,style,candidates,mask};
}
export function prepareGlyphParticles(element,action){
  const {rect,candidates}=sampleGlyphs(element);
  const rng=random(action.seed), points=Array.from({length:action.params.density},()=>{
    const [x,y]=candidates[Math.floor(rng()*candidates.length)];
    return {x,y,angle:rng()*Math.PI*2,radius:(100+rng()*450)*action.params.strength,size:1+rng()*2.3,color:150+Math.floor(rng()*100)};
  });
  const projection=createProjection(element);
  function restore() { projection.set(); }
  return {
    hide(){projection.set({opacity:0});},
    render(time,ctx) {
      const p=Math.max(0,Math.min(1,time/action.params.durationMs)),q=1-(1-p)**3,settle=Math.max(0,(p-.75)/.25);
      if(p>=1){restore();return;}
      projection.set({opacity:settle});
      ctx.save();ctx.globalCompositeOperation=action.params.colorMode?'source-over':'lighter';
      for(const point of points){const twist=(1-q)*4;
        ctx.fillStyle=action.params.colorMode?`hsla(0,0%,${action.params.lightness??(action.params.colorMode===2?100:0)}%,${1-settle})`:(action.params.hue??210)===210
          ? `rgba(${point.color},210,255,${1-settle})`
          : `hsla(${action.params.hue+(point.color-200)*.2},90%,72%,${1-settle})`;ctx.beginPath();
        ctx.arc(rect.left+point.x+Math.cos(point.angle+twist)*point.radius*(1-q),rect.top+point.y+Math.sin(point.angle+twist)*point.radius*(1-q),Math.max(.01,point.size*(1-settle)),0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }, dispose(){projection.dispose();}
  };
}

// Exit follows each contour point's threshold into a drifting, fading plume.
// It is not the entrance played backwards, and its terminal projection stays hidden.
export function prepareParticleExit(element,action){
 const {rect,candidates}=sampleGlyphs(element),projection=createProjection(element),rng=random(action.seed);
 const points=Array.from({length:action.params.density},()=>{const [x,y]=candidates[Math.floor(rng()*candidates.length)];return {x,y,threshold:x/rect.width*.45+rng()*.12,dx:30+rng()*220,dy:-20-rng()*160,size:.7+rng()*1.6};});
 return {hide(){projection.set();},render(time,ctx){const p=Math.max(0,Math.min(1,time/action.params.durationMs));projection.set({opacity:Math.max(0,1-p*4)});if(p>=1)return;ctx.save();for(const point of points){const age=Math.max(0,(p-point.threshold)/(1-point.threshold));ctx.globalAlpha=Math.max(0,1-age)*Math.min(1,p*4);ctx.fillStyle=action.params.colorMode?`hsl(0,0%,${action.params.lightness??(action.params.colorMode===2?100:0)}%)`:`hsl(${action.params.hue??210},85%,75%)`;ctx.beginPath();ctx.arc(rect.left+point.x+point.dx*age*action.params.strength,rect.top+point.y+point.dy*age*action.params.strength+age*age*50,point.size*(1-age*.7),0,Math.PI*2);ctx.fill();}ctx.restore();},dispose(){projection.dispose();}};
}
