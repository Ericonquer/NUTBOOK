# Nutbook Artifact Runtime 架构设计

> 面向当前项目的架构纠偏文档。目标不是继续修补 `iframe preview`，而是把 Nutbook 从“本地文件预览器”重定义为“AI 生成物管理与运行平台”。

## 1. 架构结论

Nutbook 的核心对象不再是“文件”，而是“Artifact（生成物）”。

当前至少有两类一等公民：

- `Markdown Artifact`
- `HTML Artifact`

两者共享资料库、搜索、标签、收藏、最近使用等管理能力，但**不共享同一条展示/运行链路**。

新的总原则：

- Markdown 是**内容型 Artifact**
- HTML 是**运行型 Artifact**
- 缩略图是**静态产物**
- HTML 不能再按“文档预览 iframe”理解

## 2. 为什么必须纠偏

前一版实现的问题，不是单点 bug，而是模型错误：

1. 把 `.html` 误当成“可预览文档”
2. 默认使用 `iframe` 承载 HTML
3. 试图用前端桥接修复 `fullscreen / window.open / presenter mode`
4. 试图用 live iframe 或 Quick Look 充当 HTML 缩略图

这些方案都不稳定，因为 `html-ppt` 这类页面本质上是“带运行时的本地 web artifact”，不是普通内容文件。

已验证的事实：

- 资源加载依赖标准浏览器 URL 语义
- `F / S / presenter mode / BroadcastChannel / window.open` 对宿主容器敏感
- 2026-04-23 的 `html-ppt` spike 已验证：`localhost + Tauri WebviewWindow + 兼容注入` 可以跑通演讲者模式与窗口级全屏
- live iframe 缩略图会动、会乱、会受运行时影响
- Quick Look 只能算文件预览，不等于真实 web runtime 截图

因此，**继续沿着“文件预览器”路线优化会持续返工。**

## 2.1 2026-04-23 HTML Runtime Spike 结论

本次用 `html-ppt` 真实样本完成了最小可行验证：

- 测试样本：`/Users/hayley/.openclaw/workspace/skills/html-ppt/examples/skill-usage-slides/index.html`
- 加载方式：Rust `LocalContentServer` 暴露为 `http://127.0.0.1:<port>/fs/...`
- 运行容器：Tauri `WebviewWindow` 独立 HTML Runtime Window
- `S` 演讲者模式：验证通过
- `F` 全屏：验证通过，但不是 DOM Fullscreen API，而是 Tauri 窗口级 fullscreen fallback

关键发现：

- `html-ppt` 的 `S` 依赖 `window.open('', ...)` + `document.write(...)` + `BroadcastChannel`
- 在 Tauri / WKWebView 中，`window.open('')` 会返回 `null`
- 将空 URL 改写为 `about:blank` 后，演讲者模式窗口可以成功弹出
- 当前 WKWebView 页面内没有暴露可用的 DOM Fullscreen API，诊断结果为 `request=no`
- 因此 `F` 需要由 Nutbook 注入层捕获，再交给 Rust 侧调用 Tauri window-level `set_fullscreen`

这次验证说明：

- `iframe preview` 路线仍然废弃
- `localhost server` 路线成立
- `Tauri WebviewWindow` 可以作为 HTML Artifact Runtime 的过渡容器
- 后续做 app 内标签页时，应复用同一套 Runtime 兼容策略，而不是回到普通 DOM iframe

当前仍未完成：

- 尚未实现主界面内多 WebView Runtime Host
- 尚未实现真实截图缩略图
- 当前诊断注入需要在正式化阶段拆成可关闭的 runtime compatibility layer

## 3. 新的产品定义

Nutbook 应定义为：

**本地 AI Artifact Manager**

职责分为两层：

- `Manager`
  - 管理资料库、索引、标签、搜索、收藏、最近使用
- `Runtime`
  - 负责按 Artifact 类型运行与展示内容

这意味着：

- 文件列表仍然存在
- 但“打开文件”不再等于“把文件塞进一个预览区”
- 对不同 Artifact 类型，打开动作应该进入不同 Runtime

## 4. 目标架构

### 4.1 顶层结构

```text
Nutbook Shell
  ├─ Sidebar / Search / Filters / Tags
  ├─ Artifact Tabs
  ├─ Artifact Grid / List
  └─ Runtime Host

Artifact Store
  ├─ Libraries
  ├─ Items index
  ├─ Tags / Favorites / Recent
  └─ Thumbnail cache

Runtime Layer
  ├─ Markdown Runtime
  └─ HTML Runtime

Support Services
  ├─ Local Content Server
  ├─ Thumbnail Job Service
  ├─ File Watcher
  └─ Skill Discovery (later)
```

### 4.2 Runtime 分层

#### Markdown Runtime

负责：

- 读取原文
- 渲染 HTML
- 编辑与保存
- 重新索引

特点：

- 可以继续运行在当前 Nutbook 主工作区内
- 属于内容阅读/编辑链

#### HTML Runtime

负责：

- 通过标准 `http://127.0.0.1:<port>/...` URL 提供资源
- 用独立 Runtime 容器运行 HTML
- 管理 HTML session 生命周期
- 为后续演讲者模式、多窗口、外链资源、截图生成提供基础
- 兼容可运行 HTML 产物的关键浏览器能力，如 `window.open` 和 fullscreen

特点：

- 不再走普通 DOM iframe 预览模型
- 本质是“受控 web runtime”
- 对 `html-ppt` 这类页面，需要允许 runtime 注入小型 compatibility layer

## 5. 打开逻辑重定义

### 5.1 旧逻辑（废弃）

```text
点击 item
  -> get_item_preview
  -> 前端 iframe src
```

这个逻辑只适合简单静态 HTML，不适合可运行产物。

### 5.2 新逻辑（目标）

#### Markdown

```text
点击 Markdown Artifact
  -> get_item_detail
  -> get_item_preview
  -> 在主工作区内打开 Markdown 标签页
```

#### HTML

```text
点击 HTML Artifact
  -> get_item_detail
  -> resolve local runtime url
  -> 创建或激活 HTML session
  -> 在 HTML Runtime Host 中显示对应 webview
  -> 注入 HTML Runtime compatibility layer
```

### 5.3 HTML Runtime Compatibility Layer

HTML Runtime 允许注入一层最小兼容脚本，但它不是普通前端桥接补丁，而是 Runtime 的一部分。

当前已验证需要保留的兼容项：

- `window.open('')` 改写为 `window.open('about:blank')`
- 当页面内没有可用 DOM Fullscreen API 时，将 `F` 的全屏请求转为 Tauri window-level fullscreen

注意：

- 兼容层只服务 HTML Runtime Window / WebView Session
- 不应污染 Nutbook 主 UI
- 不应重新把 HTML 降级为 iframe preview

## 6. 标签页模型重写

Nutbook 顶部标签栏要保留，但语义必须变化：

- Markdown Tab = 内容标签页
- HTML Tab = Runtime Session 标签页

也就是说：

- 标签栏不是简单对应 DOM 面板
- 对 HTML 来说，标签页是在控制一个 webview session

### 6.1 目标状态

```text
TabManager
  ├─ MarkdownTabState
  └─ HtmlSessionState

HtmlSessionState
  ├─ item_id
  ├─ runtime_url
  ├─ title
  ├─ webview_id / window_id
  ├─ active
  └─ detached (future)
```

## 7. HTML Runtime Host 方案

### 7.1 推荐方案

**Nutbook Shell + 多 WebView 容器**

思路：

- Nutbook 自己保留左栏、顶部标签、文件卡片、搜索、设置等 UI
- 每个 HTML Artifact 打开时创建一个原生 WebView Session
- 标签切换时切换激活的 WebView

这是唯一接近“在 app 内看起来像标签页，同时又不把 HTML 降级为 iframe 文档”的方向。

### 7.2 过渡方案

在多 WebView Runtime Host 还没实现前，允许 HTML 先以**独立 Runtime Window** 打开。

这不是最终产品形态，但它比主界面 iframe 更接近真实运行环境。

2026-04-23 spike 已验证：

- 独立 Runtime Window 可以承载 `html-ppt`
- `S` 演讲者模式可通过 `window.open('about:blank')` 兼容跑通
- `F` 可通过 Tauri window-level fullscreen fallback 跑通
- 该方案可以作为 Phase 1 / Phase 2 的过渡实现

### 7.3 不再采用的方案

- 普通 DOM iframe 作为 HTML 主运行容器
- live iframe 作为 HTML 缩略图
- Quick Look 作为 HTML 截图替代

## 8. Local Content Server

这是 HTML Runtime 的基础服务。

职责：

- 暴露本地 HTML 及其资源为标准 HTTP 地址
- 保证相对路径、字体、CSS、JS、图片按浏览器语义解析

### 8.1 约束

- 单例 server
- 仅本机回环地址访问
- URL 只暴露本地 artifact 文件路径映射
- 不承担业务 API，只承担静态内容服务

### 8.2 目标接口语义

```text
http://127.0.0.1:<port>/fs/<absolute-path-encoded>
```

后续如需要更正式的 Artifact 目录结构，可再切为：

```text
/artifacts/<artifact-id>/dist/index.html
```

但 MVP 重构阶段不要求一步到位。

## 9. 缩略图架构重写

### 9.1 原则

HTML 缩略图必须是**静态截图产物**，而不是 live 运行中的 DOM。

### 9.2 新规则

- 列表卡片不再嵌 live iframe
- 不再依赖运行态 DOM 作为缩略图
- 缩略图生成由单独的 Job Service 负责
- UI 只消费最终 PNG/JPEG 文件

### 9.3 推荐技术路线

优先级：

1. `Playwright / Puppeteer` 打开 localhost URL 截图
2. 生成固定尺寸 PNG
3. 存入 `thumbnail_cache`

### 9.4 阶段性现实

当前机器没有现成 Playwright / Puppeteer，因此：

- 本阶段只确认缩略图服务是**必须的独立模块**
- 不再假装 Quick Look / iframe 能作为长期方案
- 真正截图链在下一实施阶段完成

## 10. 数据模型调整

当前数据库以 `items` 为中心，这一层可以保留，但产品语义要提升：

- `items` 继续作为索引记录
- 前端和运行层对外统一称为 `artifact`

建议增加逻辑模型：

```text
Artifact
  ├─ id
  ├─ type(markdown/html)
  ├─ source_path
  ├─ title
  ├─ tags
  ├─ thumbnail
  ├─ runtime_mode
  └─ open_strategy
```

其中：

- Markdown: `runtime_mode=embedded`
- HTML: `runtime_mode=runtime-webview`

## 11. 现有代码保留 / 废弃清单

### 11.1 保留

- Library 扫描
- SQLite 索引结构
- 标签、收藏、最近使用
- Markdown 保存链
- Watcher
- Localhost static serving 方向

### 11.2 废弃或降级

- `HTML = get_item_preview + iframe`
- `HTML live iframe thumbnail`
- `Quick Look thumbnail`
- 用前端桥接补 `F/S` 作为主方案

## 12. 新增后置能力：Skill 自动发现

这是合理能力，但应明确后置。

目标：

- 扫描 OpenClaw / Hermes 新安装 skill 的 `SKILL.md` 或 `skill.md`
- 识别其中约定的默认产物输出目录
- 自动把这些目录作为资料库候选或自动接入到 Nutbook

### 12.1 为什么后置

因为它依赖两个前提：

1. Nutbook 已经稳定区分 Artifact 类型与 Runtime
2. 已经定义好“skill 输出目录 -> artifact library”映射规则

### 12.2 未来推荐形态

新增 `Skill Discovery Service`

职责：

- 扫描 skill 元信息
- 解析默认产物路径
- 生成“建议接入资料库”列表
- 可选自动接入

### 12.3 与主架构不冲突

这项能力建立在新的 Artifact Manager 模型上，是自然扩展，不需要重新推翻架构。

## 13. 实施优先级

### Phase 1：架构纠偏

- 冻结旧 HTML iframe 方案
- 明确 HTML = Runtime Artifact
- 引入 Local Content Server
- 引入 HTML 独立窗口打开链
- 固化 `html-ppt` spike 结论：保留 `window.open('') -> about:blank` 与窗口级 fullscreen fallback
- 移除临时诊断 UI，将其整理为可开关的 Runtime 兼容层

### Phase 2：运行容器成立

- 实现 HTML Runtime Session 管理
- 让 HTML 与 Markdown 打开链正式分流
- 顶部标签模型升级为 `content tab + runtime session tab`

当前进展（2026-04-23）：

- `open_html_window` 已返回 Runtime Session payload，而不是简单布尔值
- 前端已将 HTML Runtime 会话从 Markdown 内容标签中拆出为 `runtimeSessions`
- 顶部标签栏通过统一视图同时展示 Markdown 内容标签和 HTML Runtime 标签
- 关闭 HTML Runtime 标签时，会同步关闭对应的独立 Runtime Window
- 现阶段 HTML 仍运行在独立窗口；app 内多 WebView Host 留到 Phase 4

### Phase 3：截图缩略图

- 接入真实浏览器截图链
- 替换所有 HTML 假缩略图 / live iframe 缩略图

当前进展（2026-04-23）：

- 已新增 `core::thumbnail`，把 HTML 缩略图生成从数据库层拆出
- 当前 backend 明确标记为 `placeholder-svg`
- 数据库层只负责读取 item 元信息、写入 `thumbnail_cache`
- 后续 Playwright / Puppeteer 截图 backend 可以替换 `build_placeholder_html_thumbnail` 所在边界，而不需要重写缓存逻辑
- 当前开发机已验证可用 Playwright 缓存的 Chrome for Testing 生成 `800x500` PNG 截图，但该缓存不能作为正式安装包依赖
- 已新增 backend 状态与 Chromium 发现入口；`Auto` 必须保留 `placeholder-svg` fallback，另一台 Mac 缺少截图引擎时不能影响主功能
- 已新增独立 `screenshot-chromium` backend 函数，输入 `chromium_path + url + viewport`，输出 PNG asset
- `Auto` backend 已接入截图优先策略：有 Chromium 与源 URL 时生成 PNG，失败或缺失时回退 `placeholder-svg`
- `screenshot-chromium` 有 ignored 手动测试覆盖，避免普通测试依赖本机浏览器

### Phase 4：App 内多 WebView 标签页

- 用真正 Runtime Host 替代“独立窗口临时方案”
- 让 HTML 回到你要的标签页体验

### Phase 5：Skill 自动发现

- 扫描 OpenClaw / Hermes skill
- 自动接入默认产物目录

## 14. 一句话决策

**Nutbook 不再是“本地文件预览器”，而是“本地 AI Artifact Manager”；Markdown 走内容链，HTML 走 Runtime 链，缩略图走截图链。**
