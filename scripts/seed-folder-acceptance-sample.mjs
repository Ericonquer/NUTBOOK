// PR A（计划 4.5）：文件夹接入验收样本目录树生成器。
//
// 用法：node scripts/seed-folder-acceptance-sample.mjs
// 生成 samples/folder-acceptance/ 目录树（重复执行会先清空重建）。
//
// 目录树覆盖计划 4.5 要求：
// - 根目录 + 两层子目录的 Markdown / HTML；
// - dist/ 中的 AI 生成 HTML（必须被接入）；
// - .git / node_modules / target / .hidden 中的诱饵文件（不得被接入）；
// - HTML 引用的图片 / CSS / JS / JSON 资源；
// - locked/ 子目录：内含一个文件，验收时可用 chmod 000 模拟不可读；
// - 预先显式加入的 single-file source（含收藏 / 标签）与隐藏目录预加来源，
//   属于数据库状态，由本脚本输出的人工步骤说明完成。
//
// node_modules 不会被 Git 追踪：脚本负责现场生成，仓库只保存本脚本。

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sampleRoot = path.join(repoRoot, "src-tauri", "tests", "fixtures", "folder-acceptance");

fs.rmSync(sampleRoot, { recursive: true, force: true });

const write = (relative, content) => {
  const target = path.join(sampleRoot, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

// 1) 根目录与两层子目录的 Markdown / HTML。
write("overview.md", "# 验收根文档\n\n两层子目录与 dist 产物都应被接入。\n");
write("notes/first-layer.md", "# 第一层笔记\n\n子目录一层的 Markdown。\n");
write("notes/deep/second-layer.md", "# 第二层笔记\n\n子目录两层的 Markdown。\n");
write("notes/deep/second-layer.html", "<h1>第二层 HTML</h1><p>应被接入。</p>\n");

// 2) dist 目录：AI 生成 HTML 的真实产物位置，不得被排除规则误伤。
write(
  "dist/ai-report.html",
  [
    "<!doctype html>",
    "<html lang=\"zh-CN\">",
    "<head>",
    "  <meta charset=\"utf-8\">",
    "  <title>AI 生成报告</title>",
    "  <link rel=\"stylesheet\" href=\"assets/report.css\">",
    "</head>",
    "<body>",
    "  <h1>AI 生成报告</h1>",
    "  <img src=\"assets/cover.png\" alt=\"封面\">",
    "  <script src=\"assets/report.js\"></script>",
    "  <script type=\"application/json\" id=\"report-data\">{\"source\":\"ai\",\"tokens\":128}</script>",
    "</body>",
    "</html>",
    ""
  ].join("\n")
);
write("dist/assets/report.css", "body { font-family: sans-serif; color: #005C9E; }\n");
write("dist/assets/report.js", "console.log(\"ai-report\");\n");
write("dist/assets/report-data.json", "{ \"source\": \"ai\", \"tokens\": 128 }\n");
// 1x1 透明 PNG（资源文件，仅验证资源不被索引、HTML 正常打开）。
write(
  "dist/assets/cover.png",
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64"
  )
);

// 3) 排除目录诱饵：.git / node_modules / target / 隐藏目录。
write(".git/decoy-commit.md", "# git 诱饵\n\n不得被接入。\n");
write("node_modules/pkg/decoy-dep.md", "# 依赖诱饵\n\n不得被接入。\n");
write("target/debug/decoy-build.md", "# 构建诱饵\n\n不得被接入。\n");
write(".hidden/decoy-hidden.md", "# 隐藏诱饵\n\n不得被接入。\n");

// 4) 可模拟不可读 / 扫描失败的子目录。
write("locked/unreadable.md", "# 预检时变为不可读\n\n验收前对 locked 目录执行 chmod 000。\n");

fs.mkdirSync(path.join(sampleRoot, "single-file-staging"), { recursive: true });

console.log("样本目录树已生成：src-tauri/tests/fixtures/folder-acceptance/");
console.log("");
console.log("自动接入验收前的人工步骤（数据库状态，无法由脚本完成）：");
console.log("  1. 启动 NUTBOOK，把 src-tauri/tests/fixtures/folder-acceptance/overview.md 作为单文件来源加入，加收藏并打一个标签。");
console.log("  2. 把 src-tauri/tests/fixtures/folder-acceptance/.hidden/decoy-hidden.md 也作为单文件来源显式加入（验证保留来源）。");
console.log("  3. （可选故障注入）chmod 000 src-tauri/tests/fixtures/folder-acceptance/locked，验证 recoverable 跳过提示。");
console.log("  4. 从『添加文件夹』入口选择 src-tauri/tests/fixtures/folder-acceptance，核对预检计数：");
console.log("     预期接入 5（overview.md、first-layer.md、second-layer.md、second-layer.html、ai-report.html），");
console.log("     诱饵文件不计入；单文件合并 1（overview.md），保留独立来源 1（decoy-hidden.md）。");
console.log("  5. 验收 4.5 步骤 2–9：watcher 增量、取消 / 超限零写入、rename 收敛、等待同步恢复。");
console.log("");
console.log(`样本根目录：${sampleRoot}`);
