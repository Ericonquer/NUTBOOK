import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {registry,validateConfig} from '../src/motion/contract.mjs';
const file='docs/presentations/motion-gallery/archive/p3-page-curl.html';if(existsSync(file))throw Error('Existing editable acceptance file must not be regenerated');
let source=readFileSync('integrations/nbskill/templates/motion-presentation.html','utf8');const pattern=/(<script type="application\/json" id="nutbook-motion-config"[^>]*>)([\s\S]*?)(<\/script>)/,config=JSON.parse(source.match(pattern)[2]);
for(const [i,page]of config.pages.entries()){
 if(i){const re=new RegExp('(<section\\b[^>]*data-nutbook-page-id="'+page.id+'"[\\s\\S]*?)(</section>)');source=source.replace(re,(_,a,b)=>a+`<img data-id="${page.id}-image" data-editable="image" src="./p3-fragment-image.png" alt="卷页图片">`+b);page.targets.push({id:page.id+'-image',kind:'image'});}
 page.background=null;page.transition=null;const t=registry.templates['exit.page-curl'];page.actions=[{id:page.id+'-curl',targetId:page.id+'-image',templateId:'exit.page-curl',templateVersion:1,params:Object.fromEntries(Object.entries(t.params).map(([k,r])=>[k,r.default])),seed:42,trigger:'click',delayMs:0}];if(i===1)page.actions[0].params.direction=1;if(i===2)page.actions[0].params.curl=.18;
}
source=source.replace('src="./presentation-mark.svg"','src="./p3-fragment-image.png"').replace('演示稿标题','图片卷页离场').replace('简述核心观点','从右侧卷起：原图纹理随曲面退出。').replace('关键证据','从左侧卷起').replace('一页只讲一个重点','保持图片原始方向，卷面带明暗与浅色纸背。').replace('>结论<','>更宽的卷面<').replace('让观众带走清晰的下一步','只让图片离场，正文保持可读。');validateConfig(config);source=source.replace(pattern,(_,a,_b,c)=>a+JSON.stringify(config)+c);writeFileSync(file,source,{flag:'wx'});console.log(file);
