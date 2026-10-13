// Unsupported motion is inert. The document and its config remain untouched.
export function showUnsupportedMotion(reason) {
  window.__NUTBOOK_MOTION_SUPPORT__ = Object.freeze({ supported: false, reason });
  const host=document.createElement('div');host.dataset.nutbookMotionUnsupported='';
  host.style.cssText='position:fixed;right:16px;top:16px;z-index:2147483646;max-width:min(360px,calc(100vw - 32px))';
  const ui=host.attachShadow({mode:'open'});
  ui.innerHTML='<style>p{margin:0;padding:12px;background:#fff;color:#222;border:1px solid #ddd;border-radius:10px;font:13px/1.5 -apple-system,BlinkMacSystemFont,sans-serif}</style><p role="status"></p>';
  ui.querySelector('p').textContent=reason==='version'
    ? '当前版本无法编辑此文件的动画。正文仍可阅读和编辑，动画配置会保留。'
    : '此文件的动画配置无法读取，已停用动画编辑。正文仍可阅读和编辑，请保留原文件。';
  document.documentElement.append(host);
  window.addEventListener('pagehide',()=>host.remove(),{once:true});
}
