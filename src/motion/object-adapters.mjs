import {createProjection} from './projection.mjs';
import {textGlyphs} from './text-effects.mjs';
const clamp=value=>Math.max(0,Math.min(1,value));
const noise=(seed,index)=>{let value=(seed^Math.imul(index+1,2654435761))>>>0;value=Math.imul(value^(value>>>16),2246822507)>>>0;return (value^(value>>>13))>>>0;};
export function effectBounds(element){
 if(element.matches('img,svg,video,canvas'))return element.getBoundingClientRect();
 const range=document.createRange();range.selectNodeContents(element);const rect=range.getBoundingClientRect();return rect.width&&rect.height?rect:element.getBoundingClientRect();
}
export function prepareGravityImpact(element,action,{viewportHeight=innerHeight}={}){
 const rect=effectBounds(element),projection=createProjection(element),{durationMs,strength,dustSize=1}=action.params;
 // Pre-render soft, irregular cloud textures once; playback only composites sprites.
 const textures=Array.from({length:4},(_,variant)=>{const surface=document.createElement('canvas');surface.width=surface.height=128;const brush=surface.getContext('2d');for(let i=0;i<9;i++){const n=noise(action.seed+variant*97,i),x=42+n%45,y=43+(n>>>8)%43,r=19+(n>>>16)%20;const gradient=brush.createRadialGradient(x,y,0,x,y,r);gradient.addColorStop(0,'rgba(153,146,134,.22)');gradient.addColorStop(.45,'rgba(166,159,146,.13)');gradient.addColorStop(1,'rgba(178,171,158,0)');brush.fillStyle=gradient;brush.fillRect(x-r,y-r,r*2,r*2);}return surface;});
 const dust=Array.from({length:32},(_,index)=>{const n=noise(action.seed,index);return {x:(n%1000)/1000,speed:28+(n>>>10)%100,size:14+(n>>>20)%18,delay:((n>>>5)%100)/800,phase:((n>>>12)%100)/16,texture:textures[index%textures.length]};});
 return {hide(){projection.set({opacity:0});},render(time,ctx){const p=clamp(time/durationMs),contact=.43,fall=clamp(p/contact),after=clamp((p-contact)/(1-contact));let y=-Math.min(viewportHeight*.42,320)*strength*(1-fall*fall);if(p>contact)y=-Math.abs(Math.sin(after*Math.PI*3))*Math.exp(-after*6)*26*strength;projection.set(p>=1?{}:{opacity:Math.min(1,fall*5),transform:`translateY(${y}px) scale(${1+.035*strength*Math.exp(-after*8)*Math.sin(after*Math.PI*5)},${1-.055*strength*Math.exp(-after*8)*Math.sin(after*Math.PI*5)})`});if(p<=contact||p>=1||dustSize===0)return;ctx.save();for(const point of dust){const t=clamp((after-point.delay)/(1-point.delay));if(t<=0)continue;const expansion=1-Math.exp(-t*4),spread=(point.x-.5)*rect.width*.7+Math.sign(point.x-.5)*point.speed*expansion*strength*dustSize,r=point.size*(.4+expansion*1.6)*dustSize,cx=rect.left+rect.width/2+spread+Math.sin(t*4+point.phase)*7*t*dustSize,cy=rect.bottom-point.speed*(t*.22+t*t*.18)*dustSize;ctx.globalAlpha=(1-Math.exp(-t*24))*Math.pow(1-t,2)*.65;ctx.drawImage(point.texture,cx-r,cy-r*.65,r*2,r*1.3);}ctx.restore();},dispose(){projection.dispose();textures.forEach(texture=>{texture.width=texture.height=0;});}};
}
// Resolve composited ancestor background; transparent containers inherit the surface below.
export function spotlightBackground(element){
 let color=[0,0,0],remaining=1;
 for(let node=element;node&&remaining>.001;node=node.parentElement){const values=getComputedStyle(node).backgroundColor.match(/[\d.]+/g)?.map(Number);if(!values||values.length<3)continue;const alpha=values[3]??1;for(let i=0;i<3;i++)color[i]+=values[i]*alpha*remaining;remaining*=1-alpha;}
 color=color.map(value=>value+255*remaining);return color[0]*.2126+color[1]*.7152+color[2]*.0722;
}
// Deterministic stage-light trajectory: travel, settle, then release to author styling.
export function spotlightFrame(rect,params,time,width=innerWidth,height=innerHeight){
 const p=clamp(time/params.durationMs),radius=Math.max(42,Math.hypot(rect.width,rect.height)/2+20)*(params.radiusScale??1),targetX=rect.left+rect.width/2,targetY=rect.top+rect.height/2,direction=params.direction??0;
 const startX=direction%2?width+radius:-radius,startY=direction<2?-radius:height+radius,t=clamp(p/.7),ease=1-Math.pow(1-t,3),fadeIn=clamp(p/.12),fadeOut=clamp((1-p)/.1);
 return {x:startX+(targetX-startX)*ease,y:startY+(targetY-startY)*ease,radius,alpha:Math.min(.88,params.strength*.7)*fadeIn*fadeOut};
}
export function prepareSpotlight(element,action){
 const projection=createProjection(element),rect=effectBounds(element),dark=spotlightBackground(element)<140,mask=dark&&element.textContent.trim()?textGlyphs(element):null;
 return {hide(){projection.set({});},render(time,ctx){
 const {x:cx,y:cy,radius,alpha}=spotlightFrame(rect,action.params,time),arrival=clamp(1-Math.hypot(cx-rect.left-rect.width/2,cy-rect.top-rect.height/2)/radius);
 projection.set(dark&&alpha*arrival>0?{filter:`brightness(${1+alpha*arrival*.5}) drop-shadow(0 0 ${2+alpha*arrival*4}px rgba(255,255,255,${alpha*arrival*.35}))`}:{});if(alpha<=0)return;
 ctx.save();const gradient=ctx.createRadialGradient(cx,cy,0,cx,cy,radius);gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop(.65,'rgba(0,0,0,0)');gradient.addColorStop(1,`rgba(0,0,0,${alpha*(dark?.9:1)})`);ctx.fillStyle=gradient;ctx.fillRect(0,0,innerWidth,innerHeight);
 if(dark){const light=ctx.createRadialGradient(cx,cy,0,cx,cy,radius);light.addColorStop(0,`rgba(255,255,255,${alpha*.5})`);light.addColorStop(.6,`rgba(255,255,255,${alpha*.3})`);light.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=light;ctx.fillRect(cx-radius,cy-radius,radius*2,radius*2);}ctx.restore();
 // Clear the light veil from glyphs as the beam reaches them, preserving sharp text.
 if(mask){ctx.save();ctx.globalCompositeOperation='destination-out';for(const g of mask.glyphs){const r=g.rect;ctx.globalAlpha=clamp((radius-Math.hypot(r.left+r.width/2-cx,r.top+r.height/2-cy))/(radius*.25));ctx.drawImage(g.image,r.left,r.top,r.width,r.height);}ctx.restore();}
 },dispose(){mask?.dispose();projection.dispose();}};
}
