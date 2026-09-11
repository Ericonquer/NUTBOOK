// 演示分页 + 计数器 + JSON 资源加载：验证脚本、相对资源、交互状态在临时会话中可用。
(function () {
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var current = 0;
  function render() {
    slides.forEach(function (node, index) {
      if (index === current) { node.removeAttribute("hidden"); } else { node.setAttribute("hidden", ""); }
    });
    var label = document.getElementById("pageLabel");
    if (label) { label.textContent = (current + 1) + " / " + slides.length; }
  }
  var prev = document.getElementById("prev");
  var next = document.getElementById("next");
  if (prev) { prev.addEventListener("click", function () { current = Math.max(0, current - 1); render(); }); }
  if (next) { next.addEventListener("click", function () { current = Math.min(slides.length - 1, current + 1); render(); }); }
  var count = 0;
  var bump = document.getElementById("bump");
  var counter = document.getElementById("counter");
  if (bump && counter) { bump.addEventListener("click", function () { count += 1; counter.textContent = String(count); }); }
  fetch("assets/data.json").then(function (r) { return r.json(); }).then(function (json) {
    var pre = document.getElementById("data");
    if (pre) { pre.textContent = JSON.stringify(json, null, 2); }
  }).catch(function (error) {
    var pre = document.getElementById("data");
    if (pre) { pre.textContent = "同目录 JSON 加载失败：" + String(error); }
  });
  render();
})();
