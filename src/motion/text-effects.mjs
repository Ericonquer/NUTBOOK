import {createProjection} from './projection.mjs';
import {numericText} from './text-library.mjs';
const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
const hash=(seed,index)=>{let n=(seed^Math.imul(index+1,2654435761))>>>0;n=Math.imul(n^(n>>>16),2246822507)>>>0;return (n^(n>>>13))>>>0;};
// Visible fragments exclude a preceding line's empty caret. Never split author nodes.
export function textGlyphs(element){
 const nodes=[],walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);let node,text='';while((node=walker.nextNode())){nodes.push({node,start:text.length,end:text.length+node.data.length});text+=node.data;}
 const textures=new Map(),glyphs=[],dpr=Math.min(2,devicePixelRatio||1);
 for(const {segment,index}of new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)){
  if(!segment.trim())continue;const first=nodes.find(n=>n.end>index),last=nodes.find(n=>n.end>=index+segment.length);if(!first||!last)continue;
  const range=document.createRange();range.setStart(first.node,index-first.start);range.setEnd(last.node,index+segment.length-last.start);
  const rect=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0).sort((a,b)=>b.width*b.height-a.width*a.height)[0];if(!rect)continue;
  const style=getComputedStyle(first.node.parentElement),font=style.font||`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,key=[segment,font,style.color,rect.width,rect.height].join('|');let image=textures.get(key);
  if(!image){image=document.createElement('canvas');image.width=Math.max(1,Math.ceil(rect.width*dpr));image.height=Math.max(1,Math.ceil(rect.height*dpr));const ctx=image.getContext('2d');ctx.scale(dpr,dpr);ctx.font=font;ctx.fillStyle=style.color;ctx.textBaseline='middle';ctx.fillText(segment,0,rect.height/2);textures.set(key,image);}
  glyphs.push({segment,index,rect,image,font,color:style.color,fontSize:parseFloat(style.fontSize)});
 }
 if(!glyphs.length)throw Error('当前文字没有可见字形');
 return {text,glyphs,dispose(){for(const image of textures.values())image.width=image.height=0;textures.clear();}};
}
function progress(time,duration,index,count,stagger,order,ranks){const rank=order===1?count-1-index:order===2?ranks[index]:index,delay=Math.min(stagger,(duration*.65)/Math.max(1,count-1));return clamp((time-rank*delay)/Math.max(1,duration-delay*(count-1)));}
function draw(ctx,g,dx=0,dy=0,alpha=1,sx=1,sy=1){if(alpha<=0)return;const r=g.rect;ctx.save();ctx.globalAlpha=alpha;ctx.translate(r.left+r.width/2+dx,r.top+r.height/2+dy);ctx.scale(sx,sy);ctx.drawImage(g.image,-r.width/2,-r.height/2,r.width,r.height);ctx.restore();}
function lineGroups(glyphs){const lines=[];for(const g of glyphs){let line=lines.find(l=>Math.abs(l.y-g.rect.top)<g.fontSize*.3);if(!line){line={y:g.rect.top,glyphs:[]};lines.push(line);}line.glyphs.push(g);}return lines;}
function wordGroups(text,glyphs){const parts=[...new Intl.Segmenter('zh',{granularity:'word'}).segment(text)].filter(p=>p.segment.trim());return parts.map(part=>glyphs.filter(g=>g.index>=part.index&&g.index<part.index+part.segment.length)).filter(g=>g.length);}
const bounds=glyphs=>({left:Math.min(...glyphs.map(g=>g.rect.left)),right:Math.max(...glyphs.map(g=>g.rect.right)),top:Math.min(...glyphs.map(g=>g.rect.top)),bottom:Math.max(...glyphs.map(g=>g.rect.bottom))});
// Trace the actual raster contour, including counters. Reveal follows its perimeter,
// rather than clipping the outline with a rotating wedge.
function contours(g){
 const w=g.image.width,h=g.image.height,data=g.image.getContext('2d').getImageData(0,0,w,h).data,edges=new Map();const on=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&data[(y*w+x)*4+3]>=96;
 const edge=(x,y,a,b)=>{const key=y*(w+1)+x;if(!edges.has(key))edges.set(key,[]);edges.get(key).push([a,b]);};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(on(x,y)){if(!on(x,y-1))edge(x,y,x+1,y);if(!on(x+1,y))edge(x+1,y,x+1,y+1);if(!on(x,y+1))edge(x+1,y+1,x,y+1);if(!on(x-1,y))edge(x,y+1,x,y);}
 const paths=[];let length=0;while(edges.size){let key=edges.keys().next().value;const points=[[key%(w+1),Math.floor(key/(w+1))]];while(edges.has(key)){const ends=edges.get(key),end=ends.pop();if(!ends.length)edges.delete(key);points.push(end);length++;key=end[1]*(w+1)+end[0];}paths.push(points);}return {paths,length};
}
function strokeContour(ctx,g,outline,fraction,width){let left=outline.length*fraction;ctx.save();ctx.translate(g.rect.left,g.rect.top);ctx.scale(g.rect.width/g.image.width,g.rect.height/g.image.height);ctx.lineWidth=width*g.image.width/g.rect.width;ctx.strokeStyle=g.color;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();for(const points of outline.paths){if(left<=0)break;ctx.moveTo(...points[0]);for(let i=1;i<points.length&&left>0;i++,left--)ctx.lineTo(...points[i]);}ctx.stroke();ctx.restore();}
function prepareLines(lines){return lines.map(line=>{const r=bounds(line.glyphs),canvas=document.createElement('canvas'),dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.ceil((r.right-r.left)*dpr);canvas.height=Math.ceil((r.bottom-r.top)*dpr);const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);for(const g of line.glyphs)ctx.drawImage(g.image,g.rect.left-r.left,g.rect.top-r.top,g.rect.width,g.rect.height);return {r,canvas};});}
function foldLine(ctx,line,u,params){
 const {r,canvas}=line,w=r.right-r.left,h=r.bottom-r.top,angle=(1-smooth(u))*params.foldAngle*Math.PI/180,slices=96,perspective=Math.max(90,h*2.5),project=v=>{const depth=(1-v)*h*Math.sin(angle),scale=perspective/(perspective+depth);return {y:r.bottom-(1-v)*h*Math.cos(angle)*scale,scale};};
 // One continuous hinged line: perspective changes across its height, never per glyph.
 for(let i=0;i<slices;i++){const a=project(i/slices),b=project((i+1)/slices),scale=(a.scale+b.scale)/2;ctx.save();ctx.globalAlpha=smooth(u/.18);ctx.drawImage(canvas,0,canvas.height*i/slices,canvas.width,canvas.height/slices,r.left+w*(1-scale)/2,a.y,w*scale,Math.max(.001,b.y-a.y));ctx.restore();}
}
function flap(ctx,g,u,axis,seed,index,preview=false){
 const r=g.rect,cycles=3,t=clamp(u)*cycles,cycle=Math.min(cycles-1,Math.floor(t)),phase=t-cycle,settled=u>.96,final=cycle===cycles-1,alphabet=[...'0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'],old=preview?g.segment:alphabet[hash(seed+cycle,index)%alphabet.length];
 const symbol=(s)=>{ctx.font=g.font;ctx.textBaseline='middle';ctx.fillStyle=g.color;ctx.fillText(s,r.left,r.top+r.height/2);};
 const board=(1-smooth((u-.82)/.18))*.9;ctx.save();ctx.fillStyle=`rgba(128,128,128,${board*.13})`;ctx.beginPath();ctx.roundRect(r.left-1,r.top+1,r.width+2,r.height-2,3);ctx.fill();ctx.restore();
 const half=(end,which,scale=1,shade=0)=>{ctx.save();ctx.beginPath();if(axis===0)ctx.rect(r.left,r.top+which*r.height/2,r.width,r.height/2);else ctx.rect(r.left+which*r.width/2,r.top,r.width/2,r.height);ctx.clip();if(scale!==1){ctx.translate(r.left+r.width/2,r.top+r.height/2);ctx.scale(axis===1?scale:1,axis===0?scale:1);ctx.translate(-r.left-r.width/2,-r.top-r.height/2);}if(end)draw(ctx,g);else symbol(old);if(shade){ctx.fillStyle=`rgba(0,0,0,${shade})`;ctx.fillRect(r.left,r.top,r.width,r.height);}ctx.restore();};
 if(settled){draw(ctx,g);return;}half(final,0);half(false,1);if(phase<.5)half(false,0,Math.cos(phase*Math.PI),.3*Math.sin(phase*Math.PI));else half(final,1,Math.sin((phase-.5)*Math.PI),.3*Math.cos((phase-.5)*Math.PI));
 ctx.save();ctx.strokeStyle=`rgba(128,128,128,${board*.4})`;ctx.lineWidth=.7;ctx.beginPath();if(axis===0){ctx.moveTo(r.left,r.top+r.height/2);ctx.lineTo(r.right,r.top+r.height/2);}else{ctx.moveTo(r.left+r.width/2,r.top);ctx.lineTo(r.left+r.width/2,r.bottom);}ctx.stroke();ctx.restore();
}
// Canvas filter is absent in WKWebView. Cached shadow rasters provide the same
// soft glyph levels on both engines, with no author DOM filter or per-frame allocation.
function softGlyphs(glyphs,maximum){
 const cache=new Map(),levels=4;
 for(const g of glyphs)if(!cache.has(g.image)){
  const dpr=g.image.width/g.rect.width,pad=Math.ceil(maximum*dpr*3),images=[null];
  for(let level=1;level<=levels;level++){const canvas=document.createElement('canvas');canvas.width=g.image.width+pad*2;canvas.height=g.image.height+pad*2;const ctx=canvas.getContext('2d');ctx.shadowColor=g.color;ctx.shadowBlur=maximum*dpr*level/levels;ctx.shadowOffsetX=10000;ctx.drawImage(g.image,pad-10000,pad);images.push(canvas);}
  cache.set(g.image,{images,pad:pad/dpr,dpr});
 }
 return {draw(ctx,g,fraction,dy=0,alpha=1){const scaled=clamp(fraction)*levels,low=Math.floor(scaled),high=Math.min(levels,low+1),mix=scaled-low,entry=cache.get(g.image);for(const [level,weight]of [[low,1-mix],[high,mix]]){if(weight<=0)continue;if(level===0){draw(ctx,g,0,dy,alpha*weight);continue;}ctx.save();ctx.globalAlpha=alpha*weight;const image=entry.images[level];ctx.drawImage(image,g.rect.left-entry.pad,g.rect.top-entry.pad+dy,image.width/entry.dpr,image.height/entry.dpr);ctx.restore();}},dispose(){for(const entry of cache.values())for(const image of entry.images)if(image)image.width=image.height=0;cache.clear();}};
}
export function prepareTextEffect(element,action,{invalidate=()=>{},preview=false}={}){
 const prepared=textGlyphs(element),glyphs=prepared.glyphs,projection=createProjection(element),params=action.params,kind=action.templateId.slice(5),outlines=new Map(),ranks=[],lines=lineGroups(glyphs),full=bounds(glyphs),groups=wordGroups(prepared.text,glyphs),groupIndex=new Map();groups.forEach((group,i)=>group.forEach(g=>groupIndex.set(g,i)));
 glyphs.map((_,i)=>i).sort((a,b)=>hash(action.seed,a)-hash(action.seed,b)).forEach((index,rank)=>ranks[index]=rank);
 const soft=['blur-reveal','true-focus'].includes(kind)&&params.blur>0?softGlyphs(glyphs,params.blur):null;
 const number=kind==='count-up'?numericText(prepared.text):null;if(kind==='count-up'&&!number){prepared.dispose();projection.dispose();throw Error('数字递增只支持单个数字，可带单位、小数和千位分隔符');}
 if(kind==='outline-write')for(const g of glyphs)if(!outlines.has(g.image))outlines.set(g.image,contours(g));
 const lineImages=kind==='fold-unfold'?prepareLines(lines):[],usesColor=['light-sweep','gradient','masked-heading'].includes(kind),scratch=usesColor?document.createElement('canvas'):null;
 if(scratch){scratch.width=Math.max(...glyphs.map(g=>g.image.width));scratch.height=Math.max(...glyphs.map(g=>g.image.height));}
 const lineIndex=new Map();lines.forEach((line,i)=>line.glyphs.forEach(g=>lineIndex.set(g,i)));
 const typeWeights=glyphs.map((g,i)=>1+(hash(action.seed,i)%100/100-.5)*(params.cadence??0)),weightSum=typeWeights.reduce((a,b)=>a+b,0);let sum=0;const typeAt=typeWeights.map(w=>{sum+=w;return sum/weightSum;});
 const emphasis=['pressure','light-sweep','gradient','true-focus'].includes(kind),focusUnits=(params.grouping===1?glyphs.map(g=>[g]):groups).slice(0,256),focusRects=focusUnits.map(bounds);let hovered=-1,active=false,disposed=false;
 const chosenRange=params.focusEnd>params.focusStart?glyphs.filter(g=>g.index<params.focusEnd&&g.index+g.segment.length>params.focusStart):[];
 if(chosenRange.length&&params.mode!==1){focusUnits.push(chosenRange);focusRects.push(bounds(chosenRange));}
 const focusedIndex=()=>params.mode===1?hovered:chosenRange.length?focusUnits.length-1:Math.min(focusUnits.length-1,params.focusIndex??0);
 const pointer=event=>{if(disposed||!active||params.mode!==1)return;const next=focusRects.findIndex(r=>event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom);if(next!==hovered){hovered=next;invalidate();}};
 const leave=()=>{if(hovered!==-1){hovered=-1;if(active&&!disposed)invalidate();}};
 const pointerOut=event=>{if(!event.relatedTarget)leave();};
 if(kind==='true-focus'&&params.mode===1){document.addEventListener('pointermove',pointer,{passive:true});document.addEventListener('pointerout',pointerOut,{passive:true});window.addEventListener('blur',leave);}

 return {persistent:kind==='true-focus',hide(){active=false;projection.set(emphasis?{}:{opacity:0});},render(time,ctx){const p=clamp(time/params.durationMs);if(p>=1&&kind!=='true-focus'){projection.set();return;}active=true;projection.set({opacity:0});ctx.save();
  if(kind==='fold-unfold'){lineImages.forEach((line,i)=>foldLine(ctx,line,progress(time,params.durationMs,i,lines.length,params.staggerMs*params.panels,0,[]),params));ctx.restore();return;}
  if(kind==='count-up'){const q=params.curve===0?p:params.curve===2?p*p*p:1-(1-p)**3,current=number.value*(params.startRatio+(1-params.startRatio)*q),g=glyphs[0];ctx.font=g.font;ctx.textBaseline='middle';ctx.fillStyle=g.color;ctx.fillText(number.format(current),full.left,g.rect.top+g.rect.height/2);ctx.restore();return;}
  let typed=0;
  for(const [index,g]of glyphs.entries()){
   const r=g.rect,u=progress(time,params.durationMs,index,glyphs.length,params.staggerMs??0,params.order??0,ranks),e=1-(1-u)**3,amplitude=g.fontSize*(params.strength??1);
   if(kind==='character-stagger'){const start=params.preset===1?.7:1;ctx.save();ctx.beginPath();ctx.rect(r.left-2,r.top-4,r.width+4,r.height+8);ctx.clip();draw(ctx,g,0,(1-e)*g.fontSize*.55,e,params.preset===1?1-(1-e)*.08:1,start+(1-start)*e);ctx.restore();}
   else if(kind==='decode-reveal'){
    if(u>=.72)draw(ctx,g);else if(u>0){const sets=['ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789','天地玄黄宇宙洪荒山川风雨日月星辰','01'],set=[...(sets[params.charset]||sets[0])],symbol=set[hash(action.seed+Math.floor(time/1000*params.iterations),index)%set.length];ctx.save();ctx.font=g.font;ctx.textBaseline='middle';ctx.fillStyle=g.color;ctx.globalAlpha=.6+.4*clamp(u*5);const width=ctx.measureText(symbol).width;ctx.fillText(symbol,r.left+(r.width-width)/2,r.top+r.height/2);ctx.restore();}
   }
   else if(kind==='split-flip')flap(ctx,g,u,params.axis,action.seed,index,preview);
   else if(kind==='outline-write'){strokeContour(ctx,g,outlines.get(g.image),clamp(u/params.fillAt),params.strokeWidth*(1-smooth((u-params.fillAt)/(1-params.fillAt))));draw(ctx,g,0,0,smooth((u-params.fillAt)/(1-params.fillAt)));}
   else if(kind==='echo-trail'){const travel=q=>-((1-clamp(q))**3)*g.fontSize*.7*params.strength;for(let layer=params.echoes;layer>0;layer--){const delayed=clamp(u-layer*params.spacing/params.durationMs);draw(ctx,g,travel(delayed),0,Math.pow(params.decay,layer)*(1-smooth(u))*.45);}draw(ctx,g,travel(u),0,smooth(u/.25));}
   else if(kind==='blur-reveal'){const q=params.preset===1?progress(time,params.durationMs,lineIndex.get(g),lines.length,params.staggerMs*3,0,[]):u;if(soft)soft.draw(ctx,g,1-smooth(q),(1-smooth(q))*params.distance,smooth(q/.45));else draw(ctx,g,0,(1-smooth(q))*params.distance,smooth(q/.45));}
   else if(kind==='typewriter'){if(p>=typeAt[index]*.9){draw(ctx,g);typed=index+1;}}
   else if(kind==='pressure'){const x=(r.left-full.left)/(Math.max(1,full.right-full.left)),center=params.direction===1?1.25-1.5*p:-.25+1.5*p,weight=Math.exp(-(((x-center)/params.width)**2))*Math.sin(Math.PI*p)*params.strength;draw(ctx,g,0,0,1,1+weight*.25,1+weight*.5);}
   else if(kind==='true-focus'){const selected=focusedIndex(),focused=selected<0||focusUnits[selected].includes(g),amount=smooth(p);if(soft)soft.draw(ctx,g,focused?0:amount,0,focused?1:1-.2*amount);else draw(ctx,g,0,0,focused?1:1-.2*amount);}
   else if(usesColor){
    const brush=scratch.getContext('2d');brush.clearRect(0,0,scratch.width,scratch.height);brush.globalCompositeOperation='source-over';brush.drawImage(g.image,0,0);brush.globalCompositeOperation='source-atop';
    if(kind==='light-sweep'){
     // White already sits at the channel ceiling. A fully opaque, neutral base
     // gives the traveling white band contrast; restore source color at the ends.
     const rgb=g.color.match(/[\d.]+/g)?.slice(0,3).map(Number)||[0,0,0],luminance=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722,envelope=smooth(p/.1)*(1-smooth((p-.86)/.14));
     if(luminance>180){brush.fillStyle=`rgba(0,0,0,${.3*envelope})`;brush.fillRect(0,0,scratch.width,scratch.height);}
     const center=full.left+(full.right-full.left+params.bandWidth*2)*p-params.bandWidth,angle=params.angle*Math.PI/180,local=(center-r.left-Math.tan(angle)*(r.top-full.top))*g.image.width/r.width,w=params.bandWidth*g.image.width/r.width,gradient=brush.createLinearGradient(local-w,0,local+w,Math.tan(angle)*g.image.height);gradient.addColorStop(0,'rgba(255,255,255,0)');gradient.addColorStop(.4,`rgba(230,230,230,${params.brightness*.4})`);gradient.addColorStop(.5,`rgba(255,255,255,${params.brightness})`);gradient.addColorStop(.6,`rgba(230,230,230,${params.brightness*.4})`);gradient.addColorStop(1,'rgba(255,255,255,0)');brush.fillStyle=gradient;brush.fillRect(0,0,scratch.width,scratch.height);
     // Keep glyph alpha intact; only the moving band receives a subtle halo.
     ctx.save();ctx.shadowColor='rgba(255,255,255,.95)';ctx.shadowBlur=g.fontSize*.09*Math.exp(-(((r.left+r.width/2-center)/params.bandWidth)**2))*params.brightness;ctx.drawImage(scratch,0,0,g.image.width,g.image.height,r.left,r.top,r.width,r.height);ctx.restore();
    }else{
     const shift=p*params.speed*Math.PI*2,x=(r.left-full.left)/Math.max(1,full.right-full.left),y=(r.top-full.top)/Math.max(1,full.bottom-full.top),mode=params.mode??1,hue=params.hue+(params.hue2-params.hue)*(.5+.5*Math.sin(shift+x*Math.PI*2+(mode===1?Math.cos(y*3+shift):mode===2?y*6:0))),gradient=brush.createLinearGradient(0,0,g.image.width,g.image.height);gradient.addColorStop(0,`hsl(${hue} 64% 50%)`);gradient.addColorStop(1,`hsl(${hue+25} 70% 62%)`);brush.fillStyle=gradient;brush.fillRect(0,0,scratch.width,scratch.height);ctx.save();if(kind==='masked-heading'){const q=progress(time,params.durationMs,groupIndex.get(g)??index,groups.length,params.staggerMs,0,[]),rise=(1-smooth(q))*r.height;ctx.beginPath();ctx.rect(r.left,r.top,r.width,r.height);ctx.clip();const release=smooth((p-.88)/.12);draw(ctx,g,0,rise,release);ctx.globalAlpha=1-release;ctx.drawImage(scratch,0,0,g.image.width,g.image.height,r.left,r.top+rise,r.width,r.height);}else{const release=smooth((p-.88)/.12);draw(ctx,g);ctx.globalAlpha=1-release;ctx.drawImage(scratch,0,0,g.image.width,g.image.height,r.left,r.top,r.width,r.height);}ctx.restore();
    }
   }
   // Saved, rejected early candidates are still readable; hidden from new selection.
   else if(kind==='elastic-warp'){draw(ctx,g,0,Math.sin(u*Math.PI*params.recovery)*Math.exp(-u*4)*(1-u)*amplitude*.3);}
   else if(kind==='depth-text'){const scale=1/(1+(1-e)*params.perspective/500);for(let layer=params.layers;layer>0;layer--)draw(ctx,g,layer*(1-e)*params.depth/params.layers,layer*(1-e)*params.depth/params.layers,(1-e)*.4,scale,scale);draw(ctx,g,0,0,Math.min(1,u*5),scale,scale);}
  }
  if(kind==='typewriter'&&params.cursor&&p<.94&&Math.floor(time/420)%2===0){const g=glyphs[Math.max(0,typed-1)],r=g.rect;ctx.fillStyle=g.color;ctx.fillRect(typed?r.right+2:r.left,r.top+r.height*.16,Math.max(1,g.fontSize*.035),r.height*.7);}
  if(kind==='true-focus'&&params.frame&&focusedIndex()>=0){const r=focusRects[focusedIndex()],fade=smooth(p),gap=5,size=7;ctx.strokeStyle=`rgba(110,110,110,${fade})`;ctx.lineWidth=1.5;ctx.beginPath();for(const [x,y,sx,sy]of [[r.left-gap,r.top-gap,1,1],[r.right+gap,r.top-gap,-1,1],[r.left-gap,r.bottom+gap,1,-1],[r.right+gap,r.bottom+gap,-1,-1]]){ctx.moveTo(x,y+sy*size);ctx.lineTo(x,y);ctx.lineTo(x+sx*size,y);}ctx.stroke();}
  ctx.restore();},dispose(){disposed=true;active=false;document.removeEventListener('pointermove',pointer);document.removeEventListener('pointerout',pointerOut);window.removeEventListener('blur',leave);projection.dispose();soft?.dispose();prepared.dispose();outlines.clear();for(const line of lineImages)line.canvas.width=line.canvas.height=0;if(scratch)scratch.width=scratch.height=0;}};
}
