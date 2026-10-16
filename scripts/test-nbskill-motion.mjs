import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, copyFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {validateEditableHtmlContract, validatePresentationHtmlContract, validateMotionHtmlContract} from '../integrations/nbskill/scripts/manifest-lib.mjs';

const source=readFileSync('integrations/nbskill/templates/motion-presentation.html','utf8');
validateEditableHtmlContract(source);
validatePresentationHtmlContract(source);
validateMotionHtmlContract(source);
assert.ok(!source.includes('@keyframes rise'), 'new motion documents start static');
const marker='<script type="application/json" id="nutbook-motion-config" data-id="nutbook-motion-config">';
const start=source.indexOf(marker)+marker.length, end=source.indexOf('</script>',start);
const config=JSON.parse(source.slice(start,end));
assert.ok(config.pages.every(page=>!page.actions.length && page.background===null && page.transition===null));
function mutated(edit) {
  const next=structuredClone(config);edit(next);
  return source.slice(0,start)+JSON.stringify(next)+source.slice(end);
}
for (const invalid of [
  mutated(c=>c.contract='nutbook-motion/v2'),
  mutated(c=>c.pages[0].targets[0].id='missing-target'),
  mutated(c=>c.pages[0].targets[0].kind='image'),
  mutated(c=>c.pages[0].targets.push(c.pages[1].targets[0])),
  mutated(c=>c.pages.reverse()),
  source.replace('data-nutbook-motion-contract="nutbook-motion/v1"',''),
  source.replace('</section>','<video data-id="undeclared-video"></video></section>'),
  source.replace('</body>',source.slice(source.indexOf(marker),end+9)+'</body>'),
]) assert.throws(()=>validateMotionHtmlContract(invalid));
validateMotionHtmlContract(readFileSync('integrations/nbskill/templates/presentation.html','utf8'));

// Exercise the shipped registrar too, not just a validator imported by the test.
const dir=mkdtempSync(join(tmpdir(),'nbskill-motion-package-'));
copyFileSync('integrations/nbskill/templates/motion-presentation.html',join(dir,'index.html'));
copyFileSync('integrations/nbskill/templates/presentation-mark.svg',join(dir,'presentation-mark.svg'));
const registrar=resolve('integrations/nbskill/scripts/register.mjs');
execFileSync(process.execPath,[registrar,'--project-root',dir,'--id','motion-sample','--path','index.html','--skill','test-producer','--kind','presentation','--related','presentation-mark.svg:asset']);
const manifestPath=join(dir,'.agent-outputs/manifest.json'), before=readFileSync(manifestPath,'utf8');
writeFileSync(join(dir,'index.html'),mutated(c=>c.pages[0].targets[0].id='missing-target'));
assert.throws(()=>execFileSync(process.execPath,[registrar,'--project-root',dir,'--id','motion-sample','--path','index.html','--skill','test-producer','--kind','presentation'],{stdio:'pipe'}));
assert.equal(readFileSync(manifestPath,'utf8'),before,'failed registration preserves manifest');
console.log(`nbskill motion package checks passed: ${dir}`);
