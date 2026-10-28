const response=await fetch('/assets/data.json');
const data=await response.json();
// The editable copy persists this field in its source. Do not overwrite a
// saved user value when the module runs again after save/reopen.
const status=document.querySelector('#status');
if (!status.hasAttribute('data-editable')) {
  status.textContent=`PASS：模块、根路径资源、fetch ${data.canary}`;
}
