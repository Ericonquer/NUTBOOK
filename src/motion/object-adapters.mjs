import {createProjection} from './projection.mjs';
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
export function prepareSpotlight(element,action){
 const projection=createProjection(element),rect=effectBounds(element),dark=spotlightBackground(element)<140,cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
 const rx=Math.max(42,rect.width/2+Math.max(20,rect.height*.5)),ry=Math.max(36,rect.height*.85+12);
 return {hide(){projection.set({});},render(time,ctx){const p=clamp(time/action.params.durationMs),alpha=p<=0||p>=1?0:Math.pow(Math.sin(Math.PI*p),.65)*Math.min(.88,action.params.strength*.7);projection.set(dark&&alpha>0?{filter:`brightness(${1+alpha*.8})`}:{});if(alpha<=0)return;
 ctx.save();ctx.translate(cx,cy);ctx.scale(rx,ry);
 const gradient=ctx.createRadialGradient(0,0,0,0,0,1);
 if(dark){gradient.addColorStop(0,`rgba(255,255,255,${alpha*.52})`);gradient.addColorStop(.55,`rgba(255,255,255,${alpha*.48})`);gradient.addColorStop(.8,`rgba(255,255,255,${alpha*.26})`);gradient.addColorStop(1,'rgba(255,255,255,0)');}
 else{gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop(.65,'rgba(0,0,0,0)');gradient.addColorStop(1,`rgba(0,0,0,${alpha})`);}
 ctx.fillStyle=gradient;ctx.fillRect(-cx/rx,-cy/ry,innerWidth/rx,innerHeight/ry);ctx.restore();},dispose(){projection.dispose();}};
}
