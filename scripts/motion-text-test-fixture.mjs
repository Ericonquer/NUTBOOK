import {readFileSync,writeFileSync} from 'node:fs';
import {registry} from '../src/motion/contract.mjs';
import {presentationTextIds} from '../src/motion/text-library.mjs';
// Human acceptance files are editable. Normalize only the private test copy,
// so an already-applied action or changed parameter cannot invalidate its baseline.
export function writeTextTestFixture(file){
 const source=readFileSync('docs/presentations/motion-gallery/p2-text-review.html','utf8'),pattern=/(<script type="application\/json" id="nutbook-motion-config" data-id="nutbook-motion-config">)([\s\S]*?)(<\/script>)/,match=source.match(pattern);if(!match)throw Error('Missing motion sample config');const config=JSON.parse(match[2]);if(config.pages.length!==15)throw Error('Expected fifteen review pages');
 config.pages.forEach((page,i)=>{const templateId=presentationTextIds[i],template=registry.templates[templateId];page.actions=[{id:`p2-test-${i}`,targetId:page.id+'-title',templateId,templateVersion:template.version,params:{...Object.fromEntries(Object.entries(template.params).map(([k,r])=>[k,r.default])),durationMs:2400},seed:42,trigger:'withPrevious',delayMs:0}];page.background=null;page.transition=null;});
 writeFileSync(file,source.replace(pattern,(_,open,_body,close)=>open+JSON.stringify(config)+close));
}
