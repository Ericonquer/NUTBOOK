# PR C 验收样本：HTML 外部打开与运行边界

由 `node scripts/seed-pr-c-html-open-sample.mjs` 生成，重复执行会清空重建。

## 目录

| 路径 | 用途 |
| --- | --- |
| `bundle/index.html` | 最小闭环主样本：多文件、子目录资源、脚本演示分页、滚动锚点 |
| `bundle/sections/appendix.html` | 同 bundle 内第二个 HTML。引用 `../assets`：single-file **与 external-open** 入口越出直接父目录，预期**被拒**；folder root（接入 `bundle/` 或样本根）预期**恢复**（Codex R4） |
| `standalone/*.html` | 6 个独立单文件 HTML，覆盖第 9 节切换 / 关闭 / find / controls / 最小化恢复 |
| `remote/remote-resources.html` | 含远程 CDN 资源 + 普通导航入口（当前页 `<a>` / `target=_blank` 新标签 / `window.open` 按钮）：确认未新增域名白名单、离线优雅降级，并覆盖 Codex C-GUI-3a 的普通导航补测 |
| `advanced/presentation-bridge.html` | 双入口合同样本：view-state（`whenReady` 函数 / `getActivePageId` / `subscribe` / `goTo`）+ 演示预览（`bridge.pages` + 唯一 `data-nutbook-page-id`），页面内置按宿主真实调用方式的行为自检（Codex R4/R6） |
| `advanced/base.html` / `root-relative.html` / `css-import.html` / `module.html` | `<base>`、根相对 `/`、CSS `@import`/`url()`、ES module 资源形态，作为 scoped origin 后续验收入口（Codex R4） |
| `probe/probe.html` | 运行边界对抗探针，实测 `/fs`、`asset://`、内部 origin、通用 invoke 可达性 |
| `SCOPE-ROOT-CANARY.txt` | 样本根内的正向对照诱饵：**以 folder 入口**（添加文件夹接入样本根）打开时必须可读；single-file / external-open 入口下 `../` 越出授权 root，读不到才是预期。读不到 folder 也读不到说明修复过头 |
| `../pr-c-html-open-outside/OUTSIDE-CANARY.txt` | 样本根**之外**的兄弟目录，两种 scope 模型下都必须被拦（唯一有判别力的越界诱饵） |

## Phase 0：基线可达面量取（修复前）

**送样路径注意**：Phase 0 阶段 `.html` 尚未注册文件关联（那正是 PR C 要加的），
且原生拖放会经 `plan_external_path` -> `supported_markdown_path` 对非 Markdown 返回 `UnsupportedFileType`。
所以此刻**不能**用系统「打开方式」或拖放送样，只能走已有的资料库入口：

1. 用明确路径的当前构建启动 NUTBOOK，记录 app 路径与构建时间。
2. 用「添加文件夹」接入本样本目录 `src-tauri/tests/fixtures/pr-c-html-open`（或用「添加文件」单独加 `probe/probe.html`）。
3. 在探针顶部「本次接入模式」下拉里手选**你实际使用的真实入口** —— 三种互不通用：
   `folder`（添加文件夹接入样本根）、`single-file`（添加文件单独加 `probe.html`）、
   `external-open`（外部临时系统打开：访达双击 / 用其他应用打开 `probe.html`）。
   **下拉只决定判定预期值，不改变任何授权范围** —— 真实权限由入口本身决定。
   **未选择时探针拒绝运行**（默认不假设为 folder）：不同入口的授权 root 不同，选错会把预期 404 误报成 `BROKEN`。
4. 从资料库打开 `probe.html`，它会在真实 HTML 正文 child 里运行。
5. 读顶部汇总：`REACHABLE` 计数即当前越界可达面。逐项抄下 T01–T15（含 T04b/T09b/T09c）判定，
   **AMBIGUOUS / SKIPPED 必须原样记录，不得当成通过或拦截**（Codex R2）。
6. 点「复制结果 JSON」，把 JSON 回填到 `docs/handoffs/active/default-file-open-pr-c.md`。
7. 手动项**成对**观察：先点「对照」再点对应越界按钮；对照也空白 = 渲染问题，对照有内容而越界空白 = 真拦截。
   popup / iframe / 导航三组各一次；iframe 组加测 asset 渲染路径按钮。

这条路径打开的是**正式 HTML item**，走 `commands/preview.rs` 的 `/fs` URL。
外部打开路径（系统「打开方式」/ 拖放 / 五秒提示 / 临时标签）属于 PR C 新增，
在 Phase 2 实现后再按本文末尾「最小闭环」章节量取；**该入口对应下拉里的 `external-open`**，
其授权 root 是 `probe.html` 的直接父目录（与 single-file 相同），不是样本根 —— 量取时不要记成 `folder`。

### 三种真实入口与入口标签纪律（Codex R92b）

探针的「本次接入模式」下拉必须与真实入口一一对应，三种互不通用：

| 下拉值 | 真实入口 | 授权 root（scope root） |
| --- | --- | --- |
| `folder` | 资料库「添加文件夹」接入样本根 `pr-c-html-open/` | 样本根 `pr-c-html-open/` |
| `single-file` | 资料库「添加文件」单独加 `probe/probe.html` | `probe.html` 的直接父目录 `probe/` |
| `external-open` | 外部临时系统打开（访达双击 / 用其他应用打开 `probe.html`） | `probe.html` 的直接父目录 `probe/` |

纪律：

1. **默认不伪装成 folder**：下拉初始为「请选择本次真实入口…」；未选择时探针**拒绝运行**并红字提示，不自动按 folder 跑。
2. **下拉只决定判定预期值，不改变授权范围**。真实权限由入口本身决定；把入口记错只会让判定口径错，不会改变实际行为。
3. **记错入口的典型后果**：用 external-open / single-file 打开却记成 `folder`，`T04b`（`../SCOPE-ROOT-CANARY.txt`）实际 404 会被误当成 `BROKEN`（红线失败）。正确口径下这是**预期 404 = `ABSENT`（通过）**。
4. 三种入口的判定结果**分开记录**，不得混用同一份 JSON 作为两种入口的证据。

### 判定词

| 判定 | 颜色 | 含义 | 计入验收？ |
| --- | --- | --- | --- |
| `REACHABLE` | 红 | 越界成功且 canary 内容校验通过 | 是（必须为 0） |
| `BLOCKED` | 绿 | **明确拒绝**（400/401/403、ACL 拒绝文案） | 计数仅供参考 |
| `OK` | 绿 | 正向对照读到且 canary 标记校验通过 | 是（必须按预期） |
| `BROKEN` | 红 | 正向对照失败（修复过头切断正常资源） | 是（必须为 0） |
| `AMBIGUOUS` | 黄 | 404/500、网络/CORS 失败、200 但内容与标记不符 —— 未知状态，**不得当成拦截** | 是（必须为 0） |
| `SKIPPED` | 灰 | 目标无法推导或未执行 | 是（必须为 0） |
| `RETIRED` | 绿 | **显式声明的预期 404**：退休的旧 `/fs` 路由在服务端已不存在，单独表示「旧路由不可用」 | 否（真读到 canary 仍记 `REACHABLE`） |
| `ABSENT` | 绿 | **显式声明的预期 404**：归一化后落在授权 root 内、且该路径不存在的映射（仅 T04b 的 single-file / external-open 入口、T06s / T07） | 否（同上） |
| `INFO` | 灰 | 存在性观察（convertFileSrc / invoke 符号），不构成越权 | 否 |

验收口径（Codex R2，Codex C-GUI-2 修正）：

1. **只有确定结论才算通过** —— 三类：「明确拒绝（4xx 明确码 / ACL 文案）」、「2xx + canary 校验通过」、「显式声明的预期 404（`RETIRED` / `ABSENT`）」。
2. `404`、`5xx`、网络/CORS 失败、`REACHABLE = 0` **都不得自动当成安全通过**；除上述显式声明外一律记 `AMBIGUOUS`（计失败）。
3. Phase 1 修复后，`REACHABLE / BROKEN / AMBIGUOUS / SKIPPED` 合计必须为 0；`RETIRED` / `ABSENT` 是显式声明的预期 404，不计失败。
4. `RETIRED` 只用于退休路由项（T03–T06）；`ABSENT` 只用于定义清楚的「归一化后落授权 root 内不存在路径」项，且探针细节里必须记录**最终请求 URL / 授权 root / canary 名**。预期 404 **不得掩盖真实泄露**：真读到 canary 仍记 `REACHABLE`。

### 预期基线（逐项，三种真实入口预期独立）

三种真实入口：**folder**（添加文件夹接入样本根）、**single-file**（添加文件单独加 `probe.html`）、
**external-open**（外部临时系统打开：访达双击 / 用其他应用打开 `probe.html`）。
single-file 与 external-open 的授权 root 相同（= 被打开 HTML 的直接父目录 `probe/`），逐项预期一致；
**只有 T04b 的 folder 与非 folder 预期相反**，其余各项三种入口预期相同。

以下预期由 `src-tauri/src/core/local_server.rs` 与 `capabilities/main-event.json` 的代码事实推出。
若实测与预期不符，说明勘察结论有误，必须先修正判断再进 Phase 1，不得直接开始改代码。

| 项 | folder 入口预期 | single-file 入口预期 | external-open 入口预期 | 依据 |
| --- | --- | --- | --- | --- |
| T01 | `REACHABLE` | 同左 | 同左 | `/fs/<绝对路径>` 方案下 location 暴露绝对路径 |
| T02 | `OK` | 同左 | 同左 | 同目录资源（相对 URL）任何 scope 模型 / 入口下都界内 |
| T03 | `REACHABLE`（hosts 启发式） | 同左 | 同左 | `/fs` 无根边界校验 |
| T04 | `REACHABLE` | 同左 | 同左 | 绝对路径任意读；样本根外兄弟目录三种入口都界外 |
| T04b | `OK`（must-read，修复前后都应可读） | `REACHABLE`（基线无 root 隔离，应可读；修复后按 must-block 方向记 `ABSENT`，Codex R5 / C-GUI-2） | `REACHABLE`（同 single-file：授权 root 也是 `probe.html` 直接父目录 `probe/`，基线应可读；修复后按 `ABSENT`） | `../` 越出直接父目录：判定方向由运行时快照的**入口**决定，folder 与非 folder 相反 |
| T05 | `REACHABLE` | 同左 | 同左 | 与 T04 同源（浏览器归一化字面 `..`） |
| T06 | `REACHABLE`（引擎差异探针） | 同左 | 同左 | 归因见下注；**服务端解码顺序证据只在 Rust 原始套接字用例** |
| T06s / T07 | `REACHABLE`（相对穿越后继，三种入口） | 同左 | 同左 | 不依赖绝对路径，scoped origin 下仍可执行（Codex R7 退休映射：T04/T05→T07，T06→T06s） |
| T07 | `REACHABLE` | 同左 | 同左 | 相对 `../../` 归一化后落到样本根外 |
| T08 | `BLOCKED`（HTTP 400） | 同左 | 同左 | `strip_prefix("/fs/")` 失败返回 `invalid request` |
| T09 / T09b | **待实测（Codex R1）** | 同左 | 同左 | 目标都在 asset scope `$HOME/**` 内；403 只在 scope 外才有意义 |
| T09c | 待实测（onerror 单独出现时 `AMBIGUOUS` 需人工判读） | 同左 | 同左 | img 渲染 + 同 URL fetch 联合判定：onload=REACHABLE；onerror+fetch 明确拒绝=BLOCKED；其余 AMBIGUOUS（Codex R7） |
| T10 / T11 | `INFO` | 同左 | 同左 | 存在性观察不计入验收（计划允许 invoke 符号存在） |
| T10b | 待实测（界内 canary + canary 标记） | 同左 | 同左 | convertFileSrc 真实读取检测 |
| T12–T14 | `REACHABLE`（越权成立） | 同左 | 同左 | 无 app ACL manifest，自有命令不设防；T13 即整库泄露 |
| T15 | `BLOCKED` | 同左 | 同左 | `main-event.json` 限定 `webviews: ["main"]`，插件命令走上游 ACL |

T15 与 T12–T14 的反差本身就是 §6.4 的证据：受 ACL 管的被拦，不受 ACL 管的全通。

归因注记（Codex R3）：浏览器与 URL 解析器**会**把 `%2e%2e` 和字面 `..` 一起归一化，
浏览器侧 T05/T06/T07 的成功只能证明「归一化后的地址可读」。
「服务端先 percent-decode 再 `std::fs::read`」的顺序缺陷，唯一证据是
`src-tauri/tests/pr_c_baseline_boundary_characterization.rs` 的原始套接字用例（`%2e%2e` 原样上线路）。
因此修复验收以 Rust 用例为准，浏览器探针只作端到端复证。

### 目标配置、退休映射与验收门限（Codex R7）

**目标配置**：探针顶部「样本目录绝对路径」在 location 仍暴露绝对路径时自动预填。
Phase 1 换 scoped origin 后 location 不再暴露绝对路径，asset 组（T09/T09b/T09c/T10b）
与穿越组（T04/T05/T06）需要该路径构造目标 —— 手填 `pr-c-html-open/probe` 的绝对路径即可，
留空则相应项记 SKIPPED。

**退休映射**（scoped origin 下 /fs 绝对路径探针不再有意义，明确退休并由后继用例逐项覆盖）：

| 退休项 | 后继 | 说明 |
| --- | --- | --- |
| T04（/fs 绝对路径越界读） | T07 | 相对 `../../` 穿越，新旧 origin 都可执行 |
| T05（字面 `..`） | T07 | 浏览器归一化后与 T04 同源 |
| T06（`%2e%2e`） | T06s | 相对 `%2e%2e` 形式，保留引擎差异探针角色 |
| T03（/fs 读 hosts） | 退休 | 绝对路径形态专属；服务端行为由 Rust 用例覆盖 |

**验收门限**（Codex R7 二次复核修正）：

- **全局失败规则**：任何分组的 `REACHABLE`（实际未授权读取/调用成功）一律计失败 ——
  包括退休项实际执行出的 REACHABLE 与可选项（T16/T17）的 REACHABLE。
- **Phase 1 修复门限**：必测项（T02/T04b/T06s/T07/T09/T09b/T09c/T10b/T12–T15）
  **加上实际执行的退休项**，`REACHABLE / BROKEN / AMBIGUOUS / SKIPPED` 合计必须为 0。
  退休项（T03–T06）**只豁免 SKIPPED（未执行）**：基线态 T03/T04 实跑 REACHABLE 代表
  旧 `/fs` 仍可读，不能被 T07 的拒绝抵消（Codex 二次复核：旧逻辑把退休项所有结果过滤掉是漏洞）。
- INFO（T10/T11）不计入；可选项（T16/T17，按 id 前缀归类，实际 id 形如 `T16-1a`）的
  非 REACHABLE 结果单列展示，不入门限。
- **区分两个阶段的口径**：基线（d160278）下 T03/T04 实跑 REACHABLE 属于特征化漏洞，
  门限未达标是预期，不代表回归；Phase 1 修复后才要求门限归零。

### 历史实测（2026-09-09，`src-tauri/target/release/bundle/macos/NUTBOOK.app`，**修正前探针**）

走资料库入口打开 `probe/probe.html`（正式 HTML item + `commands/preview.rs` 的 `/fs` URL）。
以下结果由旧版探针取得，**部分结论已被 Codex R1/R3 修正**，保留作历史记录：

| 项 | 实测 | 修正后的解读 |
| --- | --- | --- |
| T01 | `REACHABLE` | 绝对路径泄露（结论不变） |
| T02 | `OK` | 正向对照成立（结论不变） |
| T03 | `REACHABLE` | `/fs` 读 `/etc/hosts` 成功（结论不变，仍受 hosts 启发式约束） |
| T04 / T06 / T07 | `REACHABLE` | 结论不变；但 T06 归因修正为「浏览器归一化后可读」 |
| T05 | `REACHABLE` | 与 T04 同源，不独立成立 |
| T08 | `BLOCKED` | HTTP 400，服务根不暴露（结论不变） |
| T09 | `BLOCKED`（403） | **只证明 scope 外目标（`/etc/hosts`）被拒**。scope `$HOME/**` 内的文件是否可读**未测**，不能下「asset 不是旁路」结论（Codex R1） |
| T10 / T10b | 可生成 URL，读取 403 | 同上；且 T10 存在性观察现降级为 `INFO` |
| T11 | `REACHABLE` | 现降级为 `INFO`：符号存在不等于越权（Codex R2） |
| T12 / T13 / T14 | `REACHABLE` | 特权命令全通，T13 泄露整库元数据与绝对路径（结论不变） |
| T15 | `BLOCKED` | `Command plugin:event|listen not allowed by ACL`（结论不变） |

**仍然成立的硬证据**：T15 被拦而 T12–T14 全通（§6.4）；T03/T04/T06/T07 全通（§6.3），
后者由 Rust 特征化测试独立复证（`%2e%2e` 原样上线路仍 200）。

已被撤销的结论：**「`asset://` 与 `convertFileSrc` 不是旁路」** —— 旧探针 T09 目标 `/etc/hosts`
在 asset scope（`$HOME/**`、`$TMP/**`）之外，403 不能外推到 scope 内文件。
新探针 T09/T09b/T09c/T10b 全部改用界内 canary 并校验内容标记，等待成对重测后再裁定 asset 面。

**D3 判定维持**：正式 item 路径下 T03/T04/T06 已 `REACHABLE`，
「只收口临时会话、正式 item 继续走 `/fs`」不成立，必须覆盖 `commands/preview.rs`（Codex 已裁决 D3=A）。

手动项历史观察：popup 弹出但空白、iframe 出现空白框、导航无反应。三者均**不能**据此判定为已拦截 ——
当时的样本没有界内对照，且导航按钮用 `window.confirm`（WKWebView 不保证弹出 JS 对话框，
静默返回 false 就表现为「点了没反应」）。已补对照按钮并去掉 confirm。
**成对重跑尚未执行**，在补测完成前不得引用这组观察作为「已拦截」证据（Codex R4）。

### 待补成对 GUI 量取清单（Codex P0 要求，修复结论的前提）

1. **asset 成对**（folder / single-file / external-open 三种入口各跑一遍；后两者授权 root 相同，可合并记录）：T09（asset fetch 界内）、
   T09b（asset fetch 样本根外）、T09c（img 渲染 + 同 URL fetch 联合判定）、T10b（convertFileSrc 界内）。
   T09 全 BLOCKED 才能裁定 asset 面可收口不触碰；任一 REACHABLE 即真实旁路，需在 Phase 1 设计里处理。
   T09c 单独 onerror 只记 AMBIGUOUS，不要求 img.onerror 单独证明权限拒绝（Codex R7）。
   **Phase 1 后重跑 asset 组必须先填「样本目录绝对路径」**，否则 SKIPPED 不构成验收。
2. **手动项成对**：对照 popup vs 越界 popup、对照 iframe vs 越界 iframe、asset 渲染 iframe、导航。
3. **旧 internal origin 无凭证探测**（Phase 1 换 scoped origin 后）：在配置面板填旧 origin 跑 T17 组。
4. **$TMP 补充目标**（可选）：在 `$TMPDIR` 自建 canary（首行写自定义标记），填入配置面板跑 T16 组，
   覆盖 asset scope 的第二个分支 `$TMP/**`。

量取时在探针顶部选对「接入模式」并把 JSON 连同模式一起回填 handoff。

### P1 补测清单（Codex C-GUI-3，P1 收口前必须完成）

1. **asset 组三种入口**：T09/T09b/T09c/T10b 手填样本目录绝对路径后，folder / single-file / external-open **各跑一遍**。
   该面曾有真实旁路，**不得**用 Rust 编译通过或配置关闭替代真实 child 验证。
   → **已执行（2026-09-10）**：两种模式四项均 `AMBIGUOUS`、`gateFailures = 4`，裁定见下节
   「asset 面运行证据裁定」；**不需要重复这四项相同测试**（Codex revision 23）。
2. **远程资源与普通导航**：`remote/remote-resources.html` 与样本内普通 `http/https` 超链接各测一次，
   确认 scoped origin 与 ACL 修复没有破坏正常联网资源与导航；不新增风险确认。
   → 资源部分已测：CDN CSS / 远程图 / 远程 `fetch` 表现正常（见 handoff 第六段，属**截图间接证据**）。
   → **导航部分必须真点**：本样本已补三个入口（当前页 `<a>`、`target=_blank` 新标签、`window.open` 按钮）。
   资源加载成功**不能**替代导航验证（Codex C-GUI-3a）—— 需记录点击类型 / 目标 / 实际承载位置 / 是否到达，
   以及返回后本页是否仍可用（页内 `navLog` 写入 `sessionStorage`，返回后仍可见即证明本页未被销毁）。
3. **编码分隔符项 T06e**：跑完必须能读到「实际发出的 URL」（细节里的 `@ <最终 URL>`）与服务端响应；
   只换 URL 不核实响应不算覆盖。
4. **Windows 编译**：与 macOS GUI 验收分开记录，未验证就写「未验证」。
5. **证据措辞纪律**：编辑保存 / 切换恢复 / 旧 URL 失效三类记录保留为**原执行方（用户 / WorkBuddy 终端）的报告**，
   不冒充主审亲测；未捕获资源响应时不得写「已实测 HTTP 200/404」——截图差异与 1×1 占位文件都不构成状态码证据，
   需要确证加载时补响应捕获。

### asset 面运行证据裁定（Codex revision 23，2026-09-10）

**不得把下述裁定回写成 `gateFailures = 0`。** 探针在两种授权 root 下的原始结果就是
**`gateFailures = 4`**（T09/T09b/T09c/T10b 全 `AMBIGUOUS`，`globalReachable = 0`，
`gateSelfTest = PASS（17 例）`），此值必须原样保留。

主审裁定（Codex revision 23，对应 C-GUI-2 第 2 条）：保留探针的 `AMBIGUOUS` 原始结果，
由主审结合**当前禁用配置**、**同页 HTTP 正向正常**、**已知文件的 asset fetch 与 img 均失败**
三层证据，接受「本轮所测 asset 通道未能读取/渲染文件」这一运行面结论。

裁定边界（不得外推）：

- 只覆盖**当前受测 macOS 构建、两种授权 root 与所测通道**（asset fetch / `img` 渲染 / `convertFileSrc` 结果）；
- **不**声称已单独证明「协议未注册」，也**不**声称所有可能入口均不可达；
- **不同构建或路径不得自动继承**本裁定，须重新量取；
- 不因本裁定放宽门限：探针的 `AMBIGUOUS` 计失败规则、`gateSelfTest` 与全局 `REACHABLE` 规则均不变。

根因（已定位，非回归）：本分支 `tauri.conf.json` 的唯一改动是 `assetProtocol.enable: false`
且 `scope.allow` 清空，Tauri 因此不注册 `asset:` 协议；WKWebView 对该协议一律
`Load failed`、不返回 HTTP 状态码，探针严格通道不可能产出 `BLOCKED`。配置层与运行时的
分层证据见 handoff 第六段。

## Phase 1 之后：同一探针作回归

同样步骤重跑（folder / single-file / external-open 三种入口各一遍；后两者授权 root 相同，逐项预期一致），逐项验收：

| 项 | folder 入口必须 | single-file 入口必须 | external-open 入口必须 |
| --- | --- | --- | --- |
| T01 | `BLOCKED` 或 SKIPPED 类（绝对路径不可见） | 同左 | 同左 |
| T02 | `OK`（canary 校验通过） | 同左 | 同左 |
| T03 / T04 / T05 / T06 | **`RETIRED`**（预期 404：旧 `/fs` 路由已移除；明确拒绝记 `BLOCKED` 亦可；**真读到 canary 一律 `REACHABLE` = 失败**） | 同左 | 同左 |
| T06s / T07 | **`ABSENT` 或 `BLOCKED`**（浏览器把 `..`/`%2e%2e` 归一化后 clamp 到 origin 根，映射到授权 root 内不存在的路径 → 预期 404；须记录最终 URL / root / canary。读到诱饵 = `REACHABLE`） | 同左 | 同左 |
| T06e | **`BLOCKED`**（403：`%2e%2e%2f` 把分隔符编进单段，浏览器不提前消除，服务端 decode 后含 `../` 应明确拒绝。404/网络失败记 `AMBIGUOUS`，不通过） | 同左 | 同左 |
| T04b | `OK`（must-read：folder root 界内没被修坏） | **`ABSENT`**（归一化后 `../` 被 clamp 到 origin 根 → 授权 root 内不存在的 `SCOPE-ROOT-CANARY.txt` → 预期 404；须记录最终 URL / root / canary。真读到 = `REACHABLE` = 失败） | **`ABSENT`**（同 single-file：external-open 的授权 root 也是 `probe.html` 直接父目录 `probe/`。**不得记成 `folder`，否则会把预期 404 误判成 `BROKEN`**） |
| T08 | `BLOCKED`（400） | 同左 | 同左 |
| T09 / T09b / T09c / T10b | 需先填「样本目录绝对路径」。**当前构建实测：两模式均 `AMBIGUOUS`（原始 `gateFailures = 4`），按「asset 面运行证据裁定」处理 —— 保留原始值，本表不据此判 `BLOCKED`**；T09c 为 img+fetch 联合判定 | 同左 | 同左（external-open 授权 root 与 single-file 相同） |
| T10 / T11 | `INFO`（不参与统计） | 同左 | 同左 |
| T12–T14 | `BLOCKED`（错误文案可辨识为权限拒绝，非崩栈/反序列化失败） | 同左 | 同左 |
| T15 | `BLOCKED` | 同左 | 同左 |
| T16 / T17（可选，需手填） | 结果单列，不计入门限 | 同左 | 同左 |

汇总口径（Codex R7 二次复核 + Codex C-GUI-2 修正）：

- **全局失败规则**：任何分组的 `REACHABLE`（实际未授权读取/调用成功）一律计失败，退休项与可选项也不例外。
- **Phase 1 修复门限**：必测项（T02/T04b/T06e/T06s/T07/T09/T09b/T09c/T10b/T12–T15）加上**实际执行的退休项**
  （T03–T06），要求 `BROKEN = 0`、`AMBIGUOUS = 0`、`SKIPPED = 0`；`REACHABLE` 已由全局规则覆盖。
- **确定通过只有三类**：明确拒绝（4xx 明确码 / ACL 文案）、2xx + canary 校验通过、**显式声明的预期 404**
  （退休路由 `RETIRED` / 归一化锁定 `ABSENT`）。除此之外的 404、5xx、网络/CORS 失败一律 `AMBIGUOUS`。
- **退休项（T03–T06）只豁免 `SKIPPED`**：`RETIRED` / `BLOCKED` 不计失败；实际执行出的
  `REACHABLE` / `AMBIGUOUS` / `BROKEN` 照常计失败（旧 `/fs` 仍可读必须暴露，不得被后继项的拒绝抵消）。
- **asset 组配置不得拉低门限**：填了「样本目录绝对路径」使退休项 T04 实跑时，其预期 404 记 `RETIRED`，
  不因此产生失败项；留空则记 `SKIPPED`，按退休项豁免规则处理。
- INFO（T10/T11）不计入；可选项（T16/T17，按 id 前缀归类）的非 `REACHABLE` 结果单列，不入门限。
- **门限逻辑自检**（探针汇总区内置，17 例合成行）须覆盖四类情形：预期退休路由 404、真正越界可读、
  缺配置（必测项 `SKIPPED`）、网络失败（`AMBIGUOUS`）；汇总区显示 `PASS（17 例）` 才算门限逻辑本身有效。
- asset 组（T09/T09b/T09c/T10b）在 scoped origin 下必须先填「样本目录绝对路径」才构成必测 ——
  留空跑出的 `SKIPPED` 不能作为 asset 面已验收的证据；**该面曾有真实旁路（asset:// 双模式四项全 REACHABLE），
  不得由 Rust 编译或配置关闭替代真实 child 验证**，必须用真实 child 补测 folder / single-file 两种授权 root。
  已补测（2026-09-10，两模式四项 `AMBIGUOUS`）；原始 `gateFailures = 4` 不得改写为 0，
  裁定与边界见「asset 面运行证据裁定（Codex revision 23）」。
- Rust 侧同步要求：特征化测试中标记 `PHASE1_MUST_INVERT` 的用例必须改写为拦截断言（不能删测试了事），
  `PHASE1_MUST_HOLD` 的用例必须继续通过；编码分隔符（`%2e%2e%2f`）的服务端解码/路径校验由原始套接字用例负责。

归因注记（Codex R3）：不要用「T05/T06 变绿」作为服务端修复的证明 —— 浏览器会把它们与普通穿越
一样归一化。服务端解码顺序与根边界校验的验收证据是 Rust 原始套接字用例的反转。

## 最小闭环（第 6.5 / 9 节）

1. 系统「打开方式」选 NUTBOOK 打开 `bundle/index.html`：应出现临时标签与五秒提示。
2. **提示期间按合同不与内容 child 交互**（提示显示前收敛旧正文，期间不 attach 新正文 child）：
   只观察提示本身，选择「仅打开」或等待倒计时结束后再交互（Codex R4 修正，不得在提示期间翻页）。
3. 提示结束后正常交互：翻页、点 `+1`、跳 `#tail` 锚点，确认脚本与资源都正常。
4. 点加号加入：确认受控重建后滚动位置、hash、演示页码都恢复，且新旧 child 不并存。
   页码恢复用 `advanced/presentation-bridge.html`（真实 `__NUTBOOK_PRESENTATION__` 合同）：
   翻到 bridge-b 后加入，重建应回到 bridge-b。
5. 关闭标签，再从资料库重开同一 item：确认正常打开。
6. 重复 1–5，分别用 `bundle/sections/appendix.html` 与 `standalone/*.html`。
   `appendix.html` **分入口预期**：single-file 与 external-open 入口下 `../assets` 越出直接父目录，样式/图片**应被拒**；
   以 folder root（接入 `bundle/` 或样本根）打开时**应恢复**。三种入口不得都要求加载成功（Codex R4）。
7. 三区域拖放（主列表 / 正文 / 空白区）各测一次。
8. 冷启动（App 未运行）与热启动（App 已运行）各测一次。
9. 打开 4–10 个 `standalone/*.html`，逐个切换、find 各自唯一关键词、开 controls、最小化后恢复。
10. `remote/remote-resources.html`：确认远程资源行为与基线一致，离线时优雅降级；
    并逐个点三个导航入口（当前页 `<a>` / `target=_blank` 新标签 / `window.open` 按钮），
    确认未被本次安全收口新增拦截（记录点击类型 / 目标 / 承载位置 / 是否到达 + 返回后本页仍可用）。
11. `advanced/` 资源形态样本（`base.html` / `root-relative.html` / `css-import.html` / `module.html`）：
    scoped origin 落地后逐一打开，确认 `<base>` 解析、根相对映射、CSS `@import`/`url()`、
    ES module 的相对语义与浏览器标准一致（作为后续 scoped origin 验收入口，Codex R4）。
