# NUTBOOK 原生 HTML 演示协议 v1

标准 HTML 演示文档在页面加载时发布 `window.__NUTBOOK_PRESENTATION__`。用户从 HTML 的“更多”菜单点击“演示模式”后，NUTBOOK 探测能力与页面；探测通过才进入准备页。普通 HTML 保留原阅读与全屏行为。

## 页面桥

```js
window.__NUTBOOK_PRESENTATION__ = {
  version: 1,
  capabilities: { managedPresenter: true },
  pages: [{ id: "opening", title: "开场", index: 1 }],
  get activePageId() { return currentId; },
  async whenReady() { return true; },
  async goTo(id) { /* 调用文档自己的真实导航逻辑 */ return true; },
  subscribe(listener) { /* 实际页变化后调用 listener(id) */ return () => {}; },
  async setManagedMode(enabled) { /* 关闭或恢复文档自己的备注/弹窗/重复导航 */ return true; },
  async setEditMode(enabled) { /* 现有 HTML 编辑协议，若支持则保留 */ return true; }
};
```

`pages` 至少一页，ID 非空且唯一，并与真实页根的 `data-nutbook-page-id` 一致。`goTo` 的返回值只表示请求被接收；NUTBOOK 根据订阅事件或随后读取的 `activePageId` 确认实际页。文档自身的点击、动画和媒体继续在观众窗口运行；受管理模式应隐藏自己的演讲者弹窗、备注抽屉及重复键盘导航。

作者应在 `<html>` 写 `data-nutbook-artifact-kind="presentation"`，供探测失败时显示缺失接口、重复页 ID 或无效备注等具体原因。此标记和 manifest 的 `kind: presentation` 只表示意图，不能跳过运行时探测。受管理模式须关闭原文档的方向键、空格、PageUp/PageDown 和 F 导航；退出托管后恢复独立浏览器操作。`setManagedMode` 与 `setEditMode` 分开维护。Agent 产物还须满足完整 `nutbook-html/v1` 编辑字段合同；每个正文文本和图片使用稳定字段，不把整页容器设为富文本字段。可嵌入的共用桥源码在 [`presentation-bridge.js`](../../src-tauri/resources/export-templates/presentation-bridge.js)，nbskill 安装包提供已内嵌桥的离线模板与生成说明。

## 逐页备注

备注以文档内的 `<script type="application/json" id="nutbook-presentation-notes">` 保存。JSON 结构为 `{"version":1,"pages":{"page-id":[{"type":"paragraph","runs":[{"text":"说明"},{"text":"重点","bold":true}]}]}}`。页 ID 是唯一绑定键，顺序变化不改变备注归属。文本只能作为文本渲染；只允许段落和加粗，不执行 HTML。NUTBOOK 的 HTML 编辑模式提供当前页下方的备注面板，工具栏“添加备注”和 `⌘⇧N` 可切换；切页时面板跟随当前页。保存时备注与正文在同一次 HTML 提交中校验文件版本并落盘，保留未编辑的页及无关文档内容；冲突不得静默覆盖。阅读态与观众画面不显示备注，演讲者窗口自动显示当前页备注。

可从 NUTBOOK 正式“添加文件夹”入口加入 [`native-presentation-sample/index.html`](../presentations/native-presentation-sample/index.html) 验收三页、中文备注、本地 SVG 资源和 CSS 动画。
另可加入 [`agent-presentation-sample/index.html`](../presentations/agent-presentation-sample/index.html) 检查 nbskill 完整编辑字段，加入同目录的 `invalid-duplicate-page.html` 检查重复页 ID 的失败说明，以及从 [`markdown-export-sample/sample.md`](../presentations/markdown-export-sample/sample.md) 走导出中心的浅色／深色、静态／动态路径。Markdown 导出原有正文编辑字段保留，初始备注块为 `{"version":1,"pages":{}}`；两者在 HTML 编辑态保存、重开后应继续对应原页。源图片缺失沿用带警告占位导出，不代表协议失败。

## 旧 HTML-PPT 升级

首版仅识别仓库产品介绍演示使用的 `assets/runtime.js` 精确版本。用户在原件的“演示准备”入口明确选择升级后，NUTBOOK 在同目录创建 `<原名>.nutbook-presentation.html` 和 `assets/runtime.nutbook.js`；原 HTML 与原 runtime 不变。升级副本为真实 `.slide` 添加稳定 ID，并在复制的 runtime 内把桥接到原有 `go()` 导航函数。未知版本、目标已存在、源文件或 runtime 版本变化时拒绝升级。

未改过的旧备注继续保存在原页的 `<aside class="notes">` 中，编辑面板从该节点读取并显示；编辑后的页才在 JSON 数据块写入覆盖值。提供演示协议和备注数据块、但没有正文 `data-editable` 字段的文档仍可进入仅备注编辑模式。受管理演示模式隐藏旧备注抽屉和弹窗，演讲者窗口显示安全的文本与加粗结构。
