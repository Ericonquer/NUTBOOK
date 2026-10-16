// A separate, explicitly animated benchmark artifact. Never regenerates user files.
import {readFileSync,writeFileSync,copyFileSync,existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
const output=resolve(process.argv[2] || 'docs/presentations/motion-gallery/archive/performance.html');
let source=readFileSync('integrations/nbskill/templates/motion-presentation.html','utf8');
const marker='<script type="application/json" id="nutbook-motion-config" data-id="nutbook-motion-config">';
const start=source.indexOf(marker)+marker.length,end=source.indexOf('</script>',start);
const config=JSON.parse(source.slice(start,end));
config.pages[0].actions=[{id:'benchmark-title',targetId:'opening-title',templateId:'text.glyph-particles',templateVersion:1,params:{durationMs:1800,strength:1,density:180,hue:210},seed:42,trigger:'click',delayMs:0}];
source=source.slice(0,start)+JSON.stringify(config)+source.slice(end);
source=source.replace('<title>演示稿示例</title>','<title>动效性能测量</title>').replace('演示稿标题','动效性能测量').replace('简述核心观点','标准参数 · 独立重播 · 保留慢帧');
source=source.replace('</body>', String.raw`
<aside style="position:fixed;left:16px;bottom:16px;z-index:20;width:min(620px,90vw);max-height:50vh;overflow:auto;background:#171b2bee;border:1px solid #818ca4;padding:12px;font-size:13px">
 <p data-id="bench-help" data-editable="text" style="font-size:14px">稳态测量：预热2秒＋采集10秒，重复3次。标准尺寸1280×720、DPR1。窗口切后台或切页将作废当前测量。帧间隔不是显示器实际呈现时延。</p>
 <label><span data-id="bench-meta-label" data-editable="text">环境记录（补齐 machine、os、power、displayMode）</span><textarea data-bench-meta aria-label="环境记录 JSON" rows="3" style="width:100%"></textarea></label>
 <label><span data-id="bench-hash-label" data-editable="text">选择本 HTML 计算源 hash</span><input data-bench-source type="file" accept=".html" aria-label="选择本 HTML 计算源 hash"></label>
 <button data-bench-start data-id="bench-start-label" data-editable="text" title="测量三轮稳态性能" aria-label="测量三轮稳态性能">测量三轮稳态性能</button>
 <button data-bench-stop data-id="bench-stop-label" data-editable="text" title="取消当前测量" aria-label="取消当前测量">取消当前测量</button>
 <button data-bench-export data-id="bench-export-label" data-editable="text" title="导出性能 JSON" aria-label="导出性能 JSON">导出性能 JSON</button>
 <input data-bench-status readonly aria-label="测量进度" value="等待测量；缺少环境信息会标记标准条件不完整" style="width:100%">
 <textarea data-bench-result readonly aria-label="性能 JSON，可复制保存" rows="3" style="width:100%"></textarea>
</aside>
<script>
(()=>{
 const q=s=>document.querySelector(s),api=window.__NUTBOOK_MOTION__,runs=[];
 q('[data-bench-meta]').value=JSON.stringify({machine:'',os:'',power:'',displayMode:'single',preset:'standard',sourceHash:''});
 let cancelled=false,running=false;
 const status=text=>q('[data-bench-status]').value=text;
 const exportData=()=>{q('[data-bench-result]').value=JSON.stringify({version:1,runs,standardPassed:runs.length===3&&runs.every(r=>r.valid&&r.thresholdMet&&r.standardSetupEligible)},null,2);};
 q('[data-bench-source]').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());const meta=JSON.parse(q('[data-bench-meta]').value);meta.sourceHash=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');q('[data-bench-meta]').value=JSON.stringify(meta);status('源 hash 已计算，请确认选择的是当前样本');}catch(error){status(String(error));}};
 q('[data-bench-start]').onclick=async()=>{
  if(running)return;running=true;cancelled=false;runs.length=0;q('[data-bench-start]').disabled=true;
  try{const metadata=JSON.parse(q('[data-bench-meta]').value);metadata.webview=navigator.userAgent;
   for(let i=0;i<3&&!cancelled;i++){status('测量 '+(i+1)+'/3：预热2秒＋采集10秒');const report=await api.measureSteady({metadata});runs.push(report);exportData();if(!report.valid)break;}
   status(cancelled?'已取消；数据保留':runs.length===3?'测量完成；请查看 JSON 的标准条件与每轮结果':'测量作废；请查看原因后重测');
  }catch(error){status(String(error));}finally{running=false;q('[data-bench-start]').disabled=false;exportData();}
 };
 q('[data-bench-stop]').onclick=()=>{cancelled=true;api.cancelMeasurement();api.pause();};
 q('[data-bench-export]').onclick=()=>{exportData();const blob=new Blob([q('[data-bench-result]').value],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='nutbook-motion-performance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
})();
</script>
</body>`);
writeFileSync(output,source,{flag:'wx'});
const image=join(dirname(output),'presentation-mark.svg');if(!existsSync(image))copyFileSync('integrations/nbskill/templates/presentation-mark.svg',image);
console.log(`Created independent performance sample: ${output}`);
