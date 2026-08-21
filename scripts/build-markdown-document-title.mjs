// 把 `src/markdown-document-title.js`（权威标题语义的单一前端实现）打包为
// IIFE 产物 `dist/assets/markdown-document-title.js`，供宿主 `dist/index.html`
// 以同步 `<script>` 方式加载（renderViewer 同步计算 shell title 时可用）。
//
// 使用项目已有的 esbuild（vite 依赖），不新增任何依赖。

import { build } from "esbuild";
import { resolve } from "node:path";

await build({
  entryPoints: [resolve("src/markdown-document-title.js")],
  outfile: resolve("dist/assets/markdown-document-title.js"),
  bundle: true,
  format: "iife",
  globalName: "NutbookDocumentTitle",
  target: "es2020",
  minify: false,
  sourcemap: false
});

console.log("Markdown document title asset built -> dist/assets/markdown-document-title.js");
