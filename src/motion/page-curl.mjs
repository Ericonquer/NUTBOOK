import {snapshotObject} from './object-snapshot.mjs';
import {createProjection} from './projection.mjs';
export function preparePageCurl(element,action){
 const {rect,canvas}=snapshotObject(element),projection=createProjection(element),reverse=action.params.direction===1;
 const texture=document.createElement('canvas');texture.width=canvas.width;texture.height=canvas.height;const brush=texture.getContext('2d');if(reverse){brush.translate(texture.width,0);brush.scale(-1,1);}brush.drawImage(canvas,0,0);
 const paper=document.createElement('canvas');paper.width=texture.width;paper.height=texture.height;const paperBrush=paper.getContext('2d');paperBrush.drawImage(texture,0,0);paperBrush.globalCompositeOperation='source-atop';paperBrush.fillStyle='rgba(240,236,225,.88)';paperBrush.fillRect(0,0,paper.width,paper.height);
 return {hide(){projection.set({});},render(time,ctx){const p=Math.max(0,Math.min(1,time/action.params.durationMs));if(p<=0){projection.set({});return;}projection.set({opacity:0});if(p>=1)return;
  const q=p*p*(3-2*p),radius=rect.width*action.params.curl,edge=rect.width*(1-q)-Math.PI*radius*q,perspective=rect.width*3;
  ctx.save();ctx.translate(rect.left,rect.top);if(reverse){ctx.translate(rect.width,0);ctx.scale(-1,1);}
  const flat=Math.max(0,Math.min(rect.width,edge));if(flat>0)ctx.drawImage(texture,0,0,flat/rect.width*texture.width,texture.height,0,0,flat,rect.height);
  const start=Math.max(0,edge),end=Math.min(rect.width,edge+Math.PI*radius),step=rect.width/192;
  // The returning paper back faces the viewer and covers the outer half of the roll.
  for(let cursor=start;cursor<end;cursor+=step){const a=cursor,x=Math.min(end,cursor+step),theta=((a+x)/2-edge)/radius,z=radius*(1-Math.cos(theta)),scale=perspective/(perspective+z),left=edge+radius*Math.sin((a-edge)/radius),right=edge+radius*Math.sin((x-edge)/radius),w=Math.abs(right-left)*scale;if(w<.02)continue;
   const dx=Math.min(left,right),dy=(rect.height-rect.height*scale)/2,h=rect.height*scale;
   ctx.save();ctx.beginPath();ctx.rect(dx,dy,w+.35,h);ctx.clip();ctx.filter=`brightness(${1-.24*Math.sin(theta)**2})`;ctx.drawImage(theta>Math.PI/2?paper:texture,a/rect.width*texture.width,0,(x-a)/rect.width*texture.width,texture.height,dx,dy,w+.35,h);
   ctx.restore();
  }
  ctx.restore();
 },dispose(){projection.dispose();canvas.width=canvas.height=texture.width=texture.height=paper.width=paper.height=0;}};
}
