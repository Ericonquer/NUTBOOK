import {createProjection} from './projection.mjs';
import {snapshotObject} from './object-snapshot.mjs';
const clamp=v=>Math.max(0,Math.min(1,v));
function random(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function fragmentMesh(width,height,count,seed){
 const rng=random(seed),cols=Math.max(2,Math.min(16,Math.round(Math.sqrt(count*width/height/2)))),rows=Math.max(1,Math.min(16,Math.round(count/(cols*2)))),points=[];
 for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)points.push([(x+(x&&x<cols?(rng()-.5)*.45:0))*width/cols,(y+(y&&y<rows?(rng()-.5)*.45:0))*height/rows]);
 const fragments=[];const add=vertices=>{const cx=vertices.reduce((s,v)=>s+v[0],0)/3,cy=vertices.reduce((s,v)=>s+v[1],0)/3;fragments.push({vertices,cx,cy,dx:(rng()-.5)*2,dy:rng(),rotation:(rng()-.5)*.18,delay:rng()*.12});};
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=points[y*(cols+1)+x],b=points[y*(cols+1)+x+1],c=points[(y+1)*(cols+1)+x],d=points[(y+1)*(cols+1)+x+1];if((x+y)%2){add([a,b,c]);add([b,d,c]);}else{add([a,b,d]);add([a,d,c]);}}
 return fragments;
}
// Radial cracks share every edge; corner rays keep the outer contour rectangular.
export function glassMesh(width,height,count,seed){
 const rng=random(seed),origin=[width*(.42+rng()*.16),height*(.36+rng()*.2)],angles=[[0,0],[width,0],[width,height],[0,height]].map(([x,y])=>Math.atan2(y-origin[1],x-origin[0]));
 const rays=Math.max(4,Math.round(count/3)-4);for(let i=0;i<rays;i++)angles.push((i+(rng()-.5)*.5)*Math.PI*2/rays-Math.PI);angles.sort((a,b)=>a-b);
 const edge=angles.map(a=>{const x=Math.cos(a),y=Math.sin(a),distance=Math.min(x>0?(width-origin[0])/x:x<0?-origin[0]/x:Infinity,y>0?(height-origin[1])/y:y<0?-origin[1]/y:Infinity);return [origin[0]+x*distance,origin[1]+y*distance];}),ring=edge.map(([x,y])=>{const q=.28+rng()*.22;return [origin[0]+(x-origin[0])*q,origin[1]+(y-origin[1])*q];}),parts=[];
 const add=vertices=>{const cx=vertices.reduce((n,v)=>n+v[0],0)/3,cy=vertices.reduce((n,v)=>n+v[1],0)/3,[a,b,c]=vertices,area=Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2,mass=Math.max(.25,Math.sqrt(area/(width*height/Math.max(8,count)))),distance=Math.hypot(cx-origin[0],cy-origin[1]),angle=Math.atan2(cy-origin[1],cx-origin[0]),speed=(130+rng()*130)/Math.sqrt(mass);
 parts.push({vertices,cx,cy,mass,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-70,spin:(rng()-.5)*5/mass,pitch:(rng()-.5)*6/mass,drag:.14+.18/mass,delay:.015+distance/Math.hypot(width,height)*.12});};
 for(let i=0;i<edge.length;i++){const j=(i+1)%edge.length;add([origin,ring[i],ring[j]]);add([ring[i],edge[i],edge[j]]);add([ring[i],edge[j],ring[j]]);}return parts;
}
// Closed-form linear drag + constant gravity: random access and replay share one state.
export function glassState(part,seconds,strength=1){
 const t=Math.max(0,seconds),k=part.drag,decay=Math.exp(-k*t),travel=(1-decay)/k,gravity=1700;
 return {x:part.vx*strength*travel,y:part.vy*strength*travel+gravity/k*(t-travel),angle:part.spin*travel,tilt:part.pitch*travel,vy:part.vy*strength*decay+gravity/k*(1-decay)};
}
export function glassLifetime(parts,rect,strength,height=innerHeight){
 let seconds=1;for(let i=0;i<60;i++){if(parts.every(part=>rect.top+part.cy+glassState(part,seconds,strength).y-Math.hypot(rect.width,rect.height)>=height))return seconds;seconds+=.15;}throw Error('碎片离场时间计算失败');
}
export function prepareFragments(element,action){
 const {rect,canvas}=snapshotObject(element),projection=createProjection(element),exit=action.templateId==='exit.fragment-fall',pieces=exit?glassMesh(rect.width,rect.height,action.params.pieces,action.seed):fragmentMesh(rect.width,rect.height,action.params.pieces,action.seed),strength=action.params.strength,physicalDuration=exit?glassLifetime(pieces,rect,strength):0;
 const glint=exit?document.createElement('canvas'):null;if(glint){glint.width=canvas.width;glint.height=canvas.height;const brush=glint.getContext('2d');brush.drawImage(canvas,0,0);brush.globalCompositeOperation='source-in';brush.fillStyle='#fff';brush.fillRect(0,0,glint.width,glint.height);}
 return {hide(){projection.set(exit?{}:{opacity:0});},render(time,ctx){const p=clamp(time/action.params.durationMs);if(p>=1){projection.set(exit?{opacity:0}:{});return;}const release=exit?0:clamp((p-.94)/.06);projection.set({opacity:release});ctx.save();
 for(const part of pieces){const t=clamp((p-part.delay)/(1-part.delay)),q=Math.pow(1-t,3),state=exit?glassState(part,t*physicalDuration,strength):null,dx=exit?state.x:part.dx*q*(24+rect.width*.12)*strength,dy=exit?state.y:-(12+part.dy*24+rect.height*.1)*q*strength;
 ctx.save();ctx.globalAlpha=exit?1:(1-release)*clamp(t/.18);ctx.translate(rect.left+part.cx+dx,rect.top+part.cy+dy);ctx.rotate(exit?state.angle:part.rotation*q*strength);if(exit)ctx.scale(Math.cos(state.tilt),Math.cos(state.tilt*.67));ctx.beginPath();part.vertices.forEach(([x,y],i)=>i?ctx.lineTo(x-part.cx,y-part.cy):ctx.moveTo(x-part.cx,y-part.cy));ctx.closePath();ctx.clip();ctx.drawImage(canvas,0,0,canvas.width,canvas.height,-part.cx,-part.cy,rect.width,rect.height);
 if(glint&&t>0){ctx.globalAlpha=.2*Math.pow(Math.abs(Math.sin(state.tilt)),10);ctx.drawImage(glint,0,0,glint.width,glint.height,-part.cx,-part.cy,rect.width,rect.height);}ctx.restore();}
 ctx.restore();},dispose(){projection.dispose();canvas.width=canvas.height=0;if(glint)glint.width=glint.height=0;}};
}
