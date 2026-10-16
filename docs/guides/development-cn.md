# 开发指南

[返回 README](../../README-CN.md) · [English](./development.md)

### Nutbook CLI

NUTBOOK 会把随应用提供的 CLI 部署到应用数据目录，但不会自动加入 `PATH`：

* macOS：`~/Library/Application Support/com.hayley.nutbook/cli/nutbook`

* Windows：`%LOCALAPPDATA%\com.hayley.nutbook\cli\nutbook.exe`

每个修改状态的命令只接受一个路径：

```text
nutbook add <path> [--json]
nutbook remove <path> [--json]
nutbook add-project <path> [--json]
nutbook remove-project <path> [--json]
nutbook doctor [--json]
```

`doctor` 只读。文件和文件夹操作支持与 NUTBOOK 相同的 Markdown / HTML 格式，并且永远不会删除源文件。

### 从源码运行

适合开发者、测试者，或希望本地构建的人。

| 依赖           | 建议版本         | 用途                          |
| ------------ | ------------ | --------------------------- |
| Node.js      | 22.x         | 安装前端依赖、构建 Markdown 编辑器和前端资源 |
| npm          | 随 Node.js 安装 | 执行前端构建脚本                    |
| Rust / Cargo | stable       | 编译和检查 Tauri 后端              |
| Tauri CLI    | 2.x          | 启动或构建桌面应用                   |

```bash
git clone https://github.com/Ericonquer/NUTBOOK.git
cd NUTBOOK
npm ci
npm run build:frontend
cargo check --manifest-path src-tauri/Cargo.toml
```

Markdown 编辑器构建会执行兼容补丁，请不要跳过 `npm run build:frontend`。


### 启动开发版

```bash
npm run dev
```

该入口使用 `src-tauri/tauri.dev.conf.json`，让开发版以 `com.hayley.nutbook.dev` 和 `NUTBOOK Dev` 的独立身份运行，不注册 Markdown / HTML 文件关联。直接运行 `cargo tauri dev` 会读取正式版基础配置；日常开发请使用 `npm run dev`。

### 更新功能演示

安装本地 `ffmpeg` 和 Playwright Chromium 后，可用以下脚本重新录制。支持 `cn` / `en`；两种语言分别操作各自的界面和示例内容。

```bash
node scripts/render-readme-features.mjs en export
node scripts/render-readme-features.mjs en formatting
node scripts/render-readme-features.mjs en presenter
node scripts/render-readme-features.mjs en home
node scripts/render-readme-motion.mjs en
```

录制使用当前前端与隔离示例数据；保存、复制和多窗口接口由录制工具模拟。用于介绍界面操作，真实文件保存、系统剪贴板和双屏行为需单独验收。
