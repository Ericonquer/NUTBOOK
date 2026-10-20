import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
const code=(await build({stdin:{contents:"export {textGlyphs,prepareTextEffect} from './src/motion/text-effects.mjs';export {freezePage,renderPageTransition} from './src/motion/transition.mjs';",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'probe'})).outputFiles[0].text;
for(const engine of process.argv.includes('--webkit') ? [chromium,webkit] : [chromium]){
 const browser=await engine.launch();try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 for(const [sx,sy]of [[1,1],[.5,.5],[.65,.65],[.5,.7]]){
 await page.setContent(`<style>body{margin:0}#deck{position:absolute;left:50%;top:50%;width:1920px;height:1080px;transform:translate(-50%,-50%) scale(${sx},${sy});transform-origin:center}.slide{position:absolute;inset:0;background:white}h1{position:absolute;left:100px;top:200px;font:96px/1.12 Arial;margin:0;color:#092c83}</style><main id="deck"><section class="slide" data-nutbook-page-id="a"><h1 data-id="title">开放 OpenLuckin</h1></section></main><canvas width="1280" height="800"></canvas>`);
 await page.addScriptTag({content:code});
 const result=await page.evaluate(()=>{
 const el=document.querySelector('h1'),before=el.outerHTML,range=document.createRange();range.selectNodeContents(el);const original=range.getBoundingClientRect(),prepared=probe.textGlyphs(el),font=parseFloat(prepared.glyphs[0].font),ctx=document.querySelector('canvas').getContext('2d');
 for(const id of ['text.blur-reveal','text.true-focus']){const effect=probe.prepareTextEffect(el,{templateId:id,seed:42,params:{durationMs:1800,blur:16,distance:0,staggerMs:0,preset:0,grouping:1,focusIndex:1,mode:0}});effect.render(600,ctx);effect.dispose();}
 const frozen=probe.freezePage(document.querySelector('.slide')),copy=frozen.layer.querySelector('h1'),r=document.createRange();r.selectNodeContents(copy);const projected=r.getBoundingClientRect(),shape=rect=>({x:rect.x,y:rect.y,width:rect.width,height:rect.height});
 probe.renderPageTransition(frozen.layer,0,{templateId:'transition.parallax',params:{direction:0,depth:.5}});
 const start=r.getBoundingClientRect();frozen.dispose();prepared.dispose();return {font,original:shape(original),projected:shape(projected),start:shape(start),clean:el.outerHTML===before,remaining:document.querySelectorAll('[data-nutbook-motion-projection],[data-nutbook-motion-transition]').length};
 });
 assert.ok(Math.abs(result.font-96*sy)<.01,JSON.stringify(result));
 for(const key of ['x','y','width','height']){assert.ok(Math.abs(result.original[key]-result.projected[key])<1,`${engine.name()} scale ${sx},${sy}: ${JSON.stringify(result)}`);assert.ok(Math.abs(result.original[key]-result.start[key])<1);}
 assert.equal(result.clean,true);assert.equal(result.remaining,0);
 }
 console.log(`${engine.name()}: scaled deck glyph typography and transition bounds, preview cleanup passed`);
 }finally{await browser.close();}
}
