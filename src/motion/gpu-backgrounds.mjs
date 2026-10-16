import {createBackgroundLayer} from './background-layer.mjs';
// Height-field direction adapted from React Bits Topography / GradientWaves.
// https://github.com/DavidHDev/react-bits/tree/main/src/content/Backgrounds
// Integrated with Nutbook's clock and 2D snapshot surface; no OGL/React runtime.
const TAU=Math.PI*2;
const vertex=`#version 300 es
in vec2 point;void main(){gl_Position=vec4(point,0.,1.);}`;
const common=`#version 300 es
precision highp float;
uniform vec2 resolution;uniform float cycle;uniform float richness;uniform float phase;uniform float lightMode;uniform vec3 lowColor;uniform vec3 midColor;uniform vec3 highColor;out vec4 pixel;
vec3 palette(float h){vec3 c=mix(lowColor,midColor,smoothstep(0.,.5,h));return mix(c,highColor,smoothstep(.5,1.,h));}
`;
const contours=common+`
uniform vec4 controlA;uniform vec4 controlB;uniform vec4 controlC;uniform vec4 controlD;
float curve(float x,vec4 c){float a=x*6.2831853;return .5*dot(c,vec4(sin(a),cos(a),sin(2.*a),cos(2.*a)));}
void main(){vec2 uv=gl_FragCoord.xy/resolution;vec2 a=vec2(curve(uv.x,controlA),curve(uv.x,controlB));vec2 b=vec2(curve(uv.y,controlC),curve(uv.y,controlD));float elevation=length(a-b);float f=elevation*(.8+3.*richness);float edge=min(fract(f),1.-fract(f));float aa=max(fwidth(f),.00001);float core=1.-smoothstep(.012-aa,.012+aa,edge);float bloom=1.-smoothstep(.012,.012+.22+aa,edge);float glow=bloom;float cover=clamp(core+glow*.55,0.,1.);cover=pow(cover,3.);vec3 tint=palette(clamp(elevation/7.5,0.,1.));float alpha=cover*(lightMode>.5?.48:.7);pixel=vec4(tint,alpha);}
`;
const waves=common+`
float heightAt(vec2 q,vec4 shift){float x=q.x+shift.x;x+=35.*sin((q.y+x)/20.+shift.y);float y=q.y-shift.z+20.*cos(q.x/23.+shift.w);vec2 frequency=vec2((.35+.5*richness)/7.,(.35+.5*richness)*.9/3.);return (sin(x*frequency.x)+sin(y*frequency.y))*(1.8+1.2*richness)+5.5;}
void main(){vec2 uv=gl_FragCoord.xy/resolution-.5;uv.x*=resolution.x/resolution.y;uv.y=-uv.y;float radius=length(uv),angle=radius*1.366;vec2 axis=radius>.00001?uv/radius:vec2(1.,0.);vec3 ray=vec3(-axis.y*sin(angle),-axis.x*sin(angle),-cos(angle));float c=cos(1.11),s=sin(1.11);ray=vec3(c*ray.x-s*ray.z,ray.y,s*ray.x+c*ray.z);vec3 origin=vec3(0.,0.,30.);vec4 shift=vec4(sin(cycle)*24.,sin(cycle)*3.+cos(cycle)*1.23,sin(cycle)*20.,sin(cycle)*3.5+cos(cycle)*1.41)+phase;float distance=0.;for(int i=0;i<24;i++){vec3 p=origin+ray*distance;float gap=p.z-heightAt(p.xy,shift);if(abs(gap)<.1)break;distance+=gap*.9;if(distance>120.||distance<0.){distance=120.;break;}}vec3 point=origin+ray*distance;float fog=clamp(15./max(distance,.001),0.,1.);float elevation=clamp((point.z-5.5)/(4.*(1.8+1.2*richness))+.5,0.,1.);vec3 surface=mix(lowColor,midColor,smoothstep(.12,.8,elevation));surface=mix(surface,highColor,pow(elevation,4.)*.8);vec3 tint=mix(lowColor,surface,fog);float top=1.-gl_FragCoord.y/resolution.y;float alpha=fog*(1.-smoothstep(90.,120.,distance))*.66*smoothstep(.35,.52,top);pixel=vec4(tint,alpha);}
`;
function lightPage(element){for(let node=element;node;node=node.parentElement){const c=getComputedStyle(node).backgroundColor.match(/[\d.]+/g)?.map(Number);if(c&&c.length>=3&&(c[3]??1)>.9)return c[0]*.2126+c[1]*.7152+c[2]*.0722>160;}return true;}
function rgb(hue,L){const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.fillStyle=`hsl(${hue} 90% ${L}%)`;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3).map(n=>n/255);}
export function prepareGpuBackground(element,effect,options={}){
 const layer=createBackgroundLayer(element,options),{canvas,ctx,rect}=layer,surface=document.createElement('canvas');surface.width=canvas.width;surface.height=canvas.height;let gl,program,buffer;const shaders=[];
 function release(){if(gl){for(const shader of shaders)gl.deleteShader(shader);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();}surface.width=surface.height=0;layer.dispose();}
 try{gl=surface.getContext('webgl2',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false,depth:false,stencil:false});if(!gl)throw Error('此背景需要 WebGL2，请检查图形加速后重试');
 const compile=(type,source)=>{const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('背景着色器编译失败：'+gl.getShaderInfoLog(shader));return shader;};program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,effect.templateId==='background.topography'?contours:waves));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('背景着色器连接失败');
 buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.useProgram(program);const location=gl.getAttribLocation(program,'point');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);const names=['resolution','cycle','richness','phase','lightMode','lowColor','midColor','highColor','controlA','controlB','controlC','controlD'],uniform=Object.fromEntries(names.map(name=>[name,gl.getUniformLocation(program,name)])),light=lightPage(element),p=effect.params,seed=effect.seed%997/997*TAU;
 gl.viewport(0,0,surface.width,surface.height);gl.uniform2f(uniform.resolution,surface.width,surface.height);gl.uniform1f(uniform.richness,p.strength/.8);gl.uniform1f(uniform.phase,seed);gl.uniform1f(uniform.lightMode,light?1:0);gl.uniform3fv(uniform.lowColor,rgb(p.hue,light?(effect.templateId==='background.gradient-waves'?40:62):52));gl.uniform3fv(uniform.midColor,rgb((p.hue+44)%360,light?(effect.templateId==='background.gradient-waves'?65:74):80));gl.uniform3fv(uniform.highColor,light?[.98,.98,1]:[1,1,1]);let disposed=false;
 return {canvas,renderer:'webgl2',render(time){if(disposed)return;if(gl.isContextLost())throw Error('背景图形上下文已丢失，请重新预览');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);if(p.strength===0)return;const t=p.motion===0?0:Math.max(0,time)*p.speed%p.durationMs/p.durationMs*TAU;gl.uniform1f(uniform.cycle,t);for(const [group,indices]of [[0,[1,-2,3,-4]],[1,[9,-8,7,-6]],[2,[5,2,5,-5]],[3,[-1,-3,8,9]]])gl.uniform4fv(uniform[['controlA','controlB','controlC','controlD'][group]],indices.map(i=>3*Math.sin(i+Math.sin(t)*Math.sin(i*.05)*2+(1-Math.cos(t))*Math.cos(i*.1)*.4+seed*.1)));gl.drawArrays(gl.TRIANGLES,0,3);ctx.drawImage(surface,0,0,canvas.width,canvas.height);},dispose(){if(disposed)return;disposed=true;release();}};
 }catch(error){release();throw error;}
}

// Deterministic CPU projection of the same height fields for capture-only use.
// It never creates a GPU context or starts an animation clock.
export function prepareStaticGpuBackground(element,effect){
 const layer=createBackgroundLayer(element,{low:true}),{canvas,ctx}=layer,p=effect.params,light=lightPage(element),seed=effect.seed%997/997*TAU;
 const width=Math.min(1280,canvas.width),height=Math.max(1,Math.round(canvas.height*width/canvas.width)),image=ctx.createImageData(width,height),richness=p.strength/.8;
 const colors=[rgb(p.hue,light?(effect.templateId==='background.gradient-waves'?40:62):52),rgb((p.hue+44)%360,light?(effect.templateId==='background.gradient-waves'?65:74):80),light?[.98,.98,1]:[1,1,1]];
 const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)},mix=(a,b,t)=>a+(b-a)*t;
 const controls=[[1,-2,3,-4],[9,-8,7,-6],[5,2,5,-5],[-1,-3,8,9]].map(group=>group.map(i=>3*Math.sin(i+seed*.1)));
 const curve=(x,c)=>{const a=x*TAU;return .5*(c[0]*Math.sin(a)+c[1]*Math.cos(a)+c[2]*Math.sin(2*a)+c[3]*Math.cos(2*a))};
 const elevation=(x,y)=>Math.hypot(curve(x,controls[0])-curve(y,controls[2]),curve(x,controls[1])-curve(y,controls[3]));
 const topography=effect.templateId==='background.topography';let raster=null;
 // Keep q.x for the second cosine, matching the shader's independent coordinates.
 function heightAt(qx,qy){const x=qx+seed+35*Math.sin((qy+qx+seed)/20+1.23+seed),y=qy-seed+20*Math.cos(qx/23+1.41+seed);return (Math.sin(x*(.35+.5*richness)/7)+Math.sin(y*(.35+.5*richness)*.9/3))*(1.8+1.2*richness)+5.5;}
 return {canvas,render(){if(p.strength===0){ctx.clearRect(0,0,canvas.width,canvas.height);return;}for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const u=(x+.5)/width,v=1-(y+.5)/height;let color,alpha;
  if(topography){const e=elevation(u,v),f=e*(.8+3*richness),fraction=f-Math.floor(f),edge=Math.min(fraction,1-fraction),aa=Math.max(.00001,(Math.abs(elevation(u+1/width,v)-e)+Math.abs(elevation(u,v+1/height)-e))*(.8+3*richness));const core=1-smooth(.012-aa,.012+aa,edge),bloom=1-smooth(.012,.232+aa,edge),cover=Math.pow(Math.min(1,core+bloom*.55),3),h=Math.max(0,Math.min(1,e/7.5));color=colors[0].map((c,i)=>mix(mix(c,colors[1][i],smooth(0,.5,h)),colors[2][i],smooth(.5,1,h)));alpha=cover*(light?.48:.7);}
  else{const qx=(u-.5)*width/height,qy=-(v-.5),radius=Math.hypot(qx,qy),angle=radius*1.366,ax=radius>.00001?qx/radius:1,ay=radius>.00001?qy/radius:0,rx=-ay*Math.sin(angle),ry=-ax*Math.sin(angle),rz=-Math.cos(angle),c=Math.cos(1.11),s=Math.sin(1.11),dx=c*rx-s*rz,dz=s*rx+c*rz;let distance=0;for(let i=0;i<24;i++){const gap=30+dz*distance-heightAt(dx*distance,ry*distance);if(Math.abs(gap)<.1)break;distance+=gap*.9;if(distance>120||distance<0){distance=120;break}}const z=30+dz*distance,fog=Math.max(0,Math.min(1,15/Math.max(distance,.001))),e=Math.max(0,Math.min(1,(z-5.5)/(4*(1.8+1.2*richness))+.5));color=colors[0].map((low,i)=>mix(low,mix(mix(low,colors[1][i],smooth(.12,.8,e)),colors[2][i],Math.pow(e,4)*.8),fog));alpha=fog*(1-smooth(90,120,distance))*.66*smooth(.35,.52,1-v);}
  const at=(y*width+x)*4;for(let i=0;i<3;i++)image.data[at+i]=Math.round(color[i]*255);image.data[at+3]=Math.round(alpha*255);
 }ctx.clearRect(0,0,canvas.width,canvas.height);
 if(width===canvas.width&&height===canvas.height)ctx.putImageData(image,0,0);
 else{raster=document.createElement('canvas');raster.width=width;raster.height=height;raster.getContext('2d').putImageData(image,0,0);ctx.drawImage(raster,0,0,canvas.width,canvas.height);}
 },dispose(){layer.dispose();if(raster)raster.width=raster.height=0;}};
}
