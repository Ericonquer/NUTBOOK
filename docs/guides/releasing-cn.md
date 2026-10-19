# 发布流程

[返回 README](../../README-CN.md) · [English](./releasing.md)

提交 PR 或推送 release tag 前，请先切换到 Node 22（安装 `.nvmrc` 指定版本后执行
`nvm use`），并且每次 clone 后先执行一次：

```bash
npm run setup-hooks
```

该命令安装本地 pre-push 门禁。门禁会拒绝脏工作区、检查本次实际推送范围的空白错误，
然后运行 `npm run check:push`：干净依赖安装、Chromium 运行面测试、前端 / i18n、回归
以及 Rust 检查和测试。需要在不推送时主动检查，可直接运行该命令。本地无法模拟原生
Windows 的打包输入链路；这部分由下面的显式发布预检负责。

发布构建改为手动触发，创建 tag 不会自动消耗打包分钟。PR 合并后，先从目标 `main`
提交运行 **Release preflight**：它会在原生 Windows 上验证 `beforeBuild` 的 CLI 资源，
并在原生 macOS 上做 release 编译。通过后才创建一个指向该确切提交、不可变的 `vX.Y.Z`
tag，再以该 tag 手动运行 **Build desktop app**。构建会拒绝没有同一提交预检的 tag，复用
依赖与编译中间物缓存，打包前清理缓存的安装包，并由唯一最终节点写入 Release。请在仓库
设置中保护 `v*` tag，禁止 force update。

## Release 说明固定格式

生产安装包仅携带锁定的 Playwright 驱动（约 13 MB 未压缩）、描述文件、检查/安装脚本和 worker；不得下载或打包 Node、Chromium。系统 Node.js 22 / 24 和浏览器优先复用，缺少浏览器时仅通过用户明确执行的命令安装到默认共享缓存。自动测试的浏览器准备与生产打包分开。核验最终资源包含 publishing-runtime 的驱动及脚本，不得有 wechat-runtime、Node 或浏览器树，并报告实际包体增量。

沿用 1.3.0 的双语导航结构，不直接把自动生成的变更列表作为最终正文。

1. 首行使用 `# NUTBOOK X.Y.Z`，紧接 `[中文](#user-content-zh) | [English](#user-content-en)`。
2. 中文先行：独立的 `<a id="zh"></a>`、`## 中文`、`### 新增功能`、`### 安装说明`。
3. 用 `---` 分隔；英文部分使用 `<a id="en"></a>`、`## English`、`### What's new`、`### Installation`。
4. 两种语言分别包含功能变化、三平台安装包名称、SHA-256 校验与首次安装说明、上一版本到当前版本的完整变更链接。
5. 保留历史版本导航的 `user-content-` 前缀。编辑后回读远端草稿，检查导航与锚点、章节顺序、版本号、附件名和链接。
6. 无协议变更时，不在发布说明中额外强调协议；不得凭模板更改现有声明。格式和安装包校验完成前保持草稿；上传成功不等于正式发布。
