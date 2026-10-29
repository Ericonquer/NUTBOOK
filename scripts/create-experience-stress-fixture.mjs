import {mkdtempSync,writeFileSync,copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const root=mkdtempSync(join(tmpdir(),'nutbook-experience-1000-'));
copyFileSync('tests/fixtures/experience-bugfixes/image.svg',join(root,'image.svg'));
for(let index=0;index<1000;index++){
 const paragraph=('这是批量导入验收正文，包含中文搜索、段落和图片。'+index+'。').repeat(30);
 const md=index%2===0;
 writeFileSync(join(root,`sample-${String(index).padStart(4,'0')}.${md?'md':'html'}`),md?`# 导入样本 ${index}\n\n${paragraph}\n\n![图片](image.svg)\n`:`<!doctype html><meta charset="utf-8"><title>导入样本 ${index}</title><h1>导入样本 ${index}</h1><p>${paragraph}</p><img src="image.svg" width="240" height="160">`);
}
console.log(root);
