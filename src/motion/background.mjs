import {createBackgroundLayer} from './background-layer.mjs';
import {prepareGpuBackground} from './gpu-backgrounds.mjs';
import {prepareQuietBackground} from './quiet-backgrounds.mjs';
import {prepareSceneBackground} from './scene-backgrounds.mjs';
export function prepareBackground(element,effect,options={}){return ['background.gradient-waves','background.topography'].includes(effect.templateId)?prepareGpuBackground(element,effect,options):effect.templateId==='background.flowing-gradient'?prepareFlowingGradient(element,effect,options):['background.silk','background.dark-veil','background.threads','background.side-rays'].includes(effect.templateId)?prepareQuietBackground(element,effect,options):prepareSceneBackground(element,effect,options);}
// A page-local lower layer. Isolation keeps it above the author's background
// and below semantic content without rewriting any author attributes.
export function prepareFlowingGradient(element,effect,{low=false,preview=false}={}){
 const layer=createBackgroundLayer(element,{low,preview}),{rect,canvas,dpr}=layer;
 const ctx=canvas.getContext('2d'),{durationMs,strength,hue,hue2,speed,scale}=effect.params,phase=(effect.seed%997)/997*Math.PI*2;
 return {canvas,render(time){const t=((Math.max(0,time)*speed)%durationMs)/durationMs*Math.PI*2;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);for(let i=0;i<3;i++){const a=t+phase+i*Math.PI*2/3,cx=rect.width*(.5+.35*Math.sin(a)),cy=rect.height*(.5+.32*Math.cos(t+phase+i*1.7)),radius=Math.max(rect.width,rect.height)*(.45+.12*i)*scale,gradient=ctx.createRadialGradient(cx,cy,0,cx,cy,radius);const color=i===1?hue2:hue;gradient.addColorStop(0,`hsla(${color},75%,58%,${strength*(i===2?.55:.8)})`);gradient.addColorStop(1,`hsla(${color},75%,58%,0)`);ctx.fillStyle=gradient;ctx.fillRect(0,0,rect.width,rect.height);}},dispose(){layer.dispose();}};
}
