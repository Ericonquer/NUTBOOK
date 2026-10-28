// Real host coordinator, mock only the IPC boundary. Filesystem behavior is tested in Rust.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync('dist/index.html','utf8');
const start=source.indexOf('// >>> windows-resource-identity');
const end=source.indexOf('// <<< windows-resource-identity',start);
assert(start>=0&&end>start);
function harness(invoke){
 const calls=[];
 const api=new Function('appState','invoke','isExternalHttpUrl','markdownImageFilePath','toScopedResourceUrl','setStatus','t',
 source.slice(start,end)+'\nreturn {resolvePreviewResources,readResourceResolution,resolveMarkdownImageUrl,markdownEditorImageUrl,ensureMarkdownPreviewResources};')(
 {isTauri:true},async(cmd,args)=>{calls.push(args.payload);return invoke(args.payload);},x=>/^https?:/i.test(x),()=>'',()=>'',()=>{},x=>x);
 return {...api,calls};
}
const tab=()=>({id:7,preview:{resourceRoot:'C:\\library',resourceBaseDir:'C:\\library\\docs',resourceOrigin:'http://nutbook-content.0123456789abcdef0123456789abcdef.localhost'}});
const response=p=>p.references.map(reference=>({reference,state:'resolved',relativePath:'docs/'+reference.replace(/^\.\//,'')}));
{
 const h=harness(response),t=tab();await h.resolvePreviewResources(t,['assets/a.png']);
 assert.equal(h.calls[0].itemId,7);assert(!('root' in h.calls[0]));
 assert.equal(h.resolveMarkdownImageUrl('assets/a.png',t),'http://nutbook-content.0123456789abcdef0123456789abcdef.localhost/docs/assets/a.png');
 t.preview.resourceRoot='D:\\other';t.preview.resourceOrigin='http://127.0.0.1:4002';
 await h.resolvePreviewResources(t,['assets/a.png','assets/b.png']);
 assert.deepEqual(h.calls[1].references,['assets/a.png','assets/b.png']);
 assert.equal(h.resolveMarkdownImageUrl('assets/a.png',t),'http://127.0.0.1:4002/docs/assets/a.png');
 t.preview.resourceOrigin='http://127.0.0.1:4003';assert.equal(h.readResourceResolution(t,'assets/a.png'),undefined);
 await h.resolvePreviewResources(t,['assets/a.png']);
 assert.equal(h.resolveMarkdownImageUrl('assets/a.png',t),'http://127.0.0.1:4003/docs/assets/a.png');
}
{
 let release;const h=harness(p=>new Promise(resolve=>release=()=>resolve(response(p))));const t=tab();
 const pending=h.resolvePreviewResources(t,['assets/a.png']);t.preview.resourceOrigin='http://127.0.0.1:5000';release();
 assert.equal(await pending,false);assert.equal(h.readResourceResolution(t,'assets/a.png'),undefined);
}
{
 const h=harness(p=>[{reference:'assets/report%23.png',state:'ambiguous',relativePath:null}]);const t=tab();
 await h.resolvePreviewResources(t,['assets/report%23.png']);
 assert.equal(h.resolveMarkdownImageUrl('assets/report%23.png',t),'');
 assert(h.markdownEditorImageUrl('assets/report%23.png',t).startsWith('data:'));
 assert.equal(h.resolveMarkdownImageUrl('https://example.com/a.png',t),'https://example.com/a.png');
}
{
 const h=harness(p=>{assert(p.markdown.includes('![x][image]'));return [{reference:'assets/ref.png',state:'resolved',relativePath:'docs/assets/ref.png'}];});
 const t=tab();await h.ensureMarkdownPreviewResources(t,'![x][image]\n\n[image]: assets/ref.png');
 assert.equal(h.resolveMarkdownImageUrl('assets/ref.png',t),'http://nutbook-content.0123456789abcdef0123456789abcdef.localhost/docs/assets/ref.png');
}
{
 const h=harness(response),t=tab();t.external={sessionId:'external-test',generation:3};
 await h.resolvePreviewResources(t,['C:\\LIBRARY\\docs\\a.png']);
 assert.equal(h.calls[0].sessionId,'external-test');assert(!('itemId' in h.calls[0]));
 assert.equal(h.calls[0].generation,3);
}
console.log('Resource context, cache generations, stale replies, ambiguity and identity contracts passed');
