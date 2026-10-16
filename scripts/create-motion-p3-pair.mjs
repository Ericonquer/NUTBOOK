import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {registry,validateConfig} from '../src/motion/contract.mjs';
const file='docs/presentations/motion-gallery/archive/p3-fragment-pair.html';if(existsSync(file))throw Error('Existing editable acceptance file must not be regenerated');
let source=readFileSync('integrations/nbskill/templates/motion-presentation.html','utf8');const pattern=/(<script type="application\/json" id="nutbook-motion-config"[^>]*>)([\s\S]*?)(<\/script>)/,match=source.match(pattern),config=JSON.parse(match[2]);
for(const page of config.pages){page.actions=[];page.background=null;page.transition=null;}
const pair=(page,ids)=>{for(const [templateId,phase]of [['exit.fragment-fall','out']])for(const [i,targetId]of ids.entries()){const t=registry.templates[templateId];page.actions.push({id:`${page.id}-${phase}-${i}`,targetId,templateId,templateVersion:1,params:Object.fromEntries(Object.entries(t.params).map(([k,r])=>[k,r.default])),seed:42,trigger:i?'withPrevious':'click',delayMs:0});}};
pair(config.pages[0],['opening-title','opening-image']);pair(config.pages[1],['evidence-title','evidence-copy']);validateConfig(config);
source=source.replace(pattern,(_,open,_body,close)=>open+JSON.stringify(config)+close).replace('演示稿标题','打破旧有观念').replace('简述核心观点','玻璃破碎：先受冲击，再翻转下落').replace('关键证据','中文与🌱\n一起打破重组').replace('一页只讲一个重点','长段落与标点、English 123：保留原始纹理，碎片受重力与阻力影响下落。').replace('让观众带走清晰的下一步','编辑 → 动效 → 进场／退场；调参后保存关闭重开。').replace('>结论<','>P3 首对验收<').replace('src="./presentation-mark.svg"','src="./p3-fragment-image.png"');
writeFileSync(file,source,{flag:'wx'});copyFileSync('assets/app-icon.png','docs/presentations/motion-gallery/p3-fragment-image.png');console.log(file);
