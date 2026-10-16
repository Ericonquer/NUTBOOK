import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('dist/index.html','utf8'),a=source.indexOf('      async function rebuildCurrentLibraryHtmlThumbnails()'),b=source.indexOf('      function artifactRuntimeType',a),handler=source.slice(a,b);
async function run({switchLibrary=false,failSecond=false}={}){
 const state={activeLibraryId:7},queries=[],rebuilt=[];let loaded=0;
 const context={appState:state,t:x=>x,setThumbnailSettingsFeedback:()=>{},setStatus:()=>{},normalizeError:String,normalizeItemSummary:x=>x,showThumbnailRebuildResult:()=>({message:'result',tone:'info'}),runThumbnailSettingsOperation:async(_mode,task)=>task(),loadItems:async()=>loaded++,rebuildThumbnailsForItems:async items=>{rebuilt.push(...items);return {total:items.length,completed:items.length}},invoke:async(command,query)=>{
  assert.equal(command,'list_items');assert.equal(query.libraryId,7);assert.equal(query.sortBy,'modifiedAt','Rust list_items rejects snake_case sort values');assert.deepEqual(Array.from(query.fileTypes),['html','markdown']);queries.push(query.page);
  if(switchLibrary)state.activeLibraryId=8;
  if(failSecond&&query.page===2)throw Error('page fetch failed');
  return {items:Array.from({length:query.page===1?500:1},(_,i)=>({id:(query.page-1)*500+i+1})),hasMore:query.page===1};
 }};
 vm.createContext(context);vm.runInContext(handler+';globalThis.run=rebuildCurrentLibraryHtmlThumbnails;',context);const result=await context.run();return {queries,rebuilt,loaded,result};
}
const complete=await run();assert.deepEqual(complete.queries,[1,2]);assert.equal(complete.rebuilt.length,501);assert.equal(new Set(complete.rebuilt.map(x=>x.id)).size,501);assert.equal(complete.loaded,1);
const canceled=await run({switchLibrary:true});assert.equal(canceled.result.reason,'canceled');assert.equal(canceled.rebuilt.length,0);
const failed=await run({failSecond:true});assert.equal(failed.result,null);assert.equal(failed.rebuilt.length,0,'do not rebuild a partial library after page collection fails');
console.log('Library rebuild: valid Rust sort contract, all 501 documents, switch cancellation and fetch failure passed');
