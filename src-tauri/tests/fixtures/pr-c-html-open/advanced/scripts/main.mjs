import { label } from "./dep.mjs";
const node = document.getElementById("moduleOut");
if (node) { node.textContent = "module 加载成功：" + label; }
