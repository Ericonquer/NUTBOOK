import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {registry,validateConfig} from '../src/motion/contract.mjs';
const file='docs/presentations/motion-gallery/archive/p3-simple-exits.html';if(existsSync(file))throw Error('Existing editable acceptance file must not be regenerated');
let source=readFileSync('integrations/nbskill/templates/motion-presentation.html','utf8');const pattern=/(<script type="application\/json" id="nutbook-motion-config"[^>]*>)([\s\S]*?)(<\/script>)/,config=JSON.parse(source.match(pattern)[2]);
const ids=['exit.blur-away','exit.directional-wipe','exit.depth-away'];
for(const [i,page]of config.pages.entries()){
 if(i){const re=new RegExp('(<section\\b[^>]*data-nutbook-page-id="'+page.id+'"[\\s\\S]*?)(</section>)');source=source.replace(re,(_,a,b)=>a+`<img data-id="${page.id}-image" data-editable="image" src="./presentation-mark.svg" alt="退场演示图片">`+b);page.targets.push({id:page.id+'-image',kind:'image'});}
 page.background=null;page.transition=null;page.actions=[page.id+'-title',page.id+'-image'].map((targetId,j)=>({id:page.id+'-exit-'+j,targetId,templateId:ids[i],templateVersion:1,params:Object.fromEntries(Object.entries(registry.templates[ids[i]].params).map(([k,r])=>[k,r.default])),seed:42,trigger:j?'withPrevious':'click',delayMs:0}));
}
source=source.replace('演示稿标题','柔焦隐去').replace('简述核心观点','中文、English 与🌱：轻轻虚化，安静离场。').replace('关键证据','定向擦除').replace('一页只讲一个重点','从边缘依次擦去，可选择四个方向。').replace('>结论<','>透视退远<').replace('让观众带走清晰的下一步','向画面深处退出，文字与图片保持完整。');
validateConfig(config);source=source.replace(pattern,(_,a,_b,c)=>a+JSON.stringify(config)+c);writeFileSync(file,source,{flag:'wx'});console.log(file);
