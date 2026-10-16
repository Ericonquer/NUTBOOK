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
