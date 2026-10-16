import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {registry,validateConfig} from '../src/motion/contract.mjs';
const file='docs/presentations/motion-gallery/archive/p3-transitions.html';
if(existsSync(file))throw Error('Existing editable acceptance file must not be regenerated');
let source=readFileSync('integrations/nbskill/templates/motion-presentation.html','utf8');
const pattern=/(<script type="application\/json" id="nutbook-motion-config"[^>]*>)([\s\S]*?)(<\/script>)/,config=JSON.parse(source.match(pattern)[2]);
const opening=source.match(/<section\b[^>]*data-nutbook-page-id="opening"[\s\S]*?<\/section>/)[0];
const extra=opening.replaceAll('opening','closing').replace('演示稿标题','转场结束，正文保持清晰').replace('简述核心观点','回到上一页，再进入编辑调参并保存重开。');
source=source.replace(opening,opening.replace('演示稿标题','多层视差').replace('简述核心观点','点击翻页：正文和背景按不同距离离场。'));
source=source.replace('关键证据','景深穿越').replace('一页只讲一个重点','点击翻页：旧页推进并虚化，下一页清晰显现。').replace('>结论<','>颗粒溶解<').replace('让观众带走清晰的下一步','点击翻页：细小颗粒连续消退。');
const finish=source.match(/<section\b[^>]*data-nutbook-page-id="finish"[\s\S]*?<\/section>/)[0];source=source.replace(finish,finish+'\n'+extra);
const last=structuredClone(config.pages[0]);last.id='closing';last.targets=last.targets.map(t=>({...t,id:t.id.replaceAll('opening','closing')}));config.pages.push(last);
const ids=['transition.parallax','transition.depth-travel','transition.grain-dissolve'];
for(const [index,page]of config.pages.entries()){page.actions=[];page.background=null;page.transition=index<3?{id:'p3-transition-'+index,templateId:ids[index],templateVersion:1,params:Object.fromEntries(Object.entries(registry.templates[ids[index]].params).map(([k,r])=>[k,r.default])),seed:42}:null;}
validateConfig(config);source=source.replace(pattern,(_,a,_b,c)=>a+JSON.stringify(config)+c);writeFileSync(file,source,{flag:'wx'});console.log(file);
