# HTML Motion v1：数据、保存与运行合同

状态：P0–P2已有本地提交；P3/P4实现及自动回归已收口，现有40项可选效果、8种转场。用户确认当前效果范围足够，单屏恢复动画和物理双屏退出已用户实测通过。P4界面按用户截图反馈完成调整；最终安装包、目标环境与跨机器离线验收属于P5，尚未执行。历史候选与过程记录不作为当前补数要求，不自动提交、推送或发布。

## 文件与版本

正文沿用 `nutbook-html/v1`。HTML 根须声明 `data-nutbook-motion-contract="nutbook-motion/v1"`，且有唯一 `script#nutbook-motion-config[type="application/json"][data-id="nutbook-motion-config"]`。配置根为 `{contract:"nutbook-motion/v1",pages:[...]}`。未知版本拒绝动效保存；实验版保持独立，不自动迁移。

机器可读 schema 为 `src/motion/schema.json`；模板参数权威表为 `src/motion/registry.json`。JS 校验在 `src/motion/contract.mjs`，Rust 校验在 `src-tauri/src/core/motion.rs`，两者使用同一个 registry 和有效样本 `tests/fixtures/motion/valid.json`。JSON Schema 之外的跨实体约束由两个校验器执行。

所有对象拒绝未知字段。配置最多 256 KiB、128 页，每页最多 256 个目标和动作；ID 是 1–80 个 ASCII 字母、数字、`_`、`-`、`:`。对象键递归排序，数组顺序保留；动作数组即播放顺序。配置不包含代码、URL、CSS 或选择器。

当前生成器内嵌的 runtime 遇未知正式根版本或不可解析/不可校验配置时，显示兼容说明，不创建动画画布或编辑面板；正文沿普通编辑合同工作，源配置保留。`__NUTBOOK_MOTION_SUPPORT__` 记录 supported/reason，故障不静默忽略。已生成的历史 HTML 携带旧 runtime，不自动升级它们；因此新版提示不应被外推为所有旧运行库都已具有该 UI。实验根版本仍留给其原运行库，不自动改写。

实验版另存正式副本入口尚未实施：现有实验 particles/impact/light 中，仅文字粒子有正式候选适配器，后两者不能无损映射。迁移必须明确列出效果差异、保留原件；在对应 UI/映射验收前，拒绝把重写合同标记或删除未知动作当作迁移完成。

## 页面、目标与动作

每页包含 `id`、`capabilities`、`targets`、`actions`、`background`、`transition`。新文档 `actions:[]`，背景与转场为 null，默认静态。当前 registry 含字形粒子、重力撞击、聚光强调、粒子消散、流动渐变及幕布揭示六个候选，已有编辑/保存/播放适配器。候选不代表视觉合格或发布；未实现的模板配置仍被拒绝。

目标声明 `{id,kind}`，kind 为 text/image/group/video/embedded。页面 ID、目标 ID、动作 ID 各自唯一；目标 ID 跨页唯一。动作包含 `id,targetId,templateId,templateVersion,params,seed,trigger,delayMs`。目标须属于同页并兼容模板；同一目标每个动作槽只容许一个动作；文字与进场共用 entrance 槽，强调和退场独立。seed 为 uint32，delayMs 在 0–60000 范围；trigger 为 click/withPrevious/afterPrevious。第一项相对本页开始解释，后续触发与点击步骤语义见正式计划 §5。

能力包含 containsVideo/containsEmbeddedFrame/supportsDomTransition/supportsFilterTransition，以及 mediaTargetIds/embeddedTargetIds。媒体列表与相应目标声明必须完全匹配。有效存在性取声明与实测并集，支持能力取交集。转场运行时同时探测两页 DOM 与资源；媒体存在性取并集、支持能力取交集，不把 schema 校验当作运行能力证明。

## 保存边界

正式配置沿用 `motion-config` change type，与正文共用 source hash、path lease、journal 和原子替换。Rust 保存时核对根合同、唯一配置节点、原配置以及所有目标真实 DOM 身份。编辑配置不能修改页面顺序、目标声明或能力；动作允许从空数组套用、替换或删除。

text 必须是可编辑 text/rich-text 节点，image 必须是可编辑 img，group 必须显式声明 `data-nutbook-motion-group="true"`；video/embedded 分别对应 video/iframe。每个目标须在声明页面内；页面中实际出现的视频/iframe 必须完整列入能力目标列表。缺失、跨页、重声明、未知模板、非法参数和外部源冲突均拒绝写盘，原文件保持不变。

canvas、临时文字层、面板及播放时间不入配置。正式 runtime 已加入现有编辑桥；Chromium 操作面板和正文后使用 Rust 提交文件，并重开核查。宿主 invoke 在该测试中为模拟接收，仍非 Nutbook 原生 IPC 验收。

## 参数、中文合成与保存确认

滑块 input 为临时预览，change 或离散命令收敛为一个动效历史动作。撤销/重做、快照读取、切对象和切页先收敛未提交拖动；撤销或读取保存快照结束本次拖动，忽略松手前的晚到 input，避免重新写回已撤销参数。失败的提交保留 draft，不静默删除。正文 A→调参 B 后仅移动焦点，仍先撤 B；正文 C 后先撤 C。正式动效文档恢复正文历史时不抢走其他字段或滑块焦点，dirty 基于保存 baseline 的规范化变化。

中文合成开始前收敛已有参数，合成期间停止动效准备、不重建正文，禁止直接 API 撤销/重做、定时历史捕获和保存确认。快照携带 composing，宿主保存协调器先读取新快照，再决定是否需要保存；composing=true 时不进入 clean 或 commit 分支。合成结束后恢复正文提交。当前浏览器测试用合成事件与文字节点模拟，并非原生中文输入法验收。

快照先 flush 参数，再读取 revision/dirty/changes，三者必须属于同一状态。markSaved 先验证会话、收敛当前参数，再核对已保存 revision；迟到确认不能把后续编辑清为已保存。撤销离开保存 baseline 后 dirty，重做到 baseline 后 clean。参数文本输入框的本地草稿例外及宿主转发命令去重仍待相应入口实施，不把当前仅滑块的测试外推到未实现输入框。

## 权威时钟

`src/motion/clock.mjs` 以逻辑毫秒驱动唯一 rAF，提供 play/pause/seek/replay/suspend/resume/dispose。暂停和后台暂停保持时间，恢复不补播后台间隔；取消和 dispose 递增 generation，拒绝晚到帧回调。适配器未来只接收 render(time)，不得自建播放时钟。

本模块的可注入 scheduler 用于确定性测试；runtime 已接入 document visibilitychange 与 pagehide，宿主最小化/恢复与 child 生命周期仍待实测，不能宣称完成对应验收。

## 内嵌资源与预算

P0 仅一个文字粒子候选，代码、参数 registry 与运行模块全部内嵌；新动作只改配置，不新增外部 shader/纹理/代码引用。因此当前资源保存以既有单份 HTML source journal＋原子替换为事务边界；不另造一个尚无资源的目录事务。未来模板新增外部资产前，必须补受控资源包、HTML最后提交和失败恢复路径。

构建 runtime 先在内存完成 bundle，检查未压缩≤2 MiB、可安全内嵌后才原子替换资源文件。Rust正式动效生成器在写盘前检查 runtime≤2 MiB、单HTML≤3 MiB，超限返回独立错误，导出 UI 给出减小图片的说明。普通导出和用户现有文件的保存不因该生成预算自动改变。nbskill动效样板同时检查HTML/runtime及样板＋本地SVG≤10 MiB。

`scripts/audit-motion-package.mjs` 核查指定验收目录的有效主文件，统计落盘字节、每份HTML/运行库、去重本地依赖与总包≤10 MiB，拒绝缺失文件、绝对/远程引用、目录逃逸；不下载资源或修复用户文件。它针对当前生成资产的静态引用，不替代任意用户脚本网络行为分析或实际断网打开。已有样本继续保留各自runtime版本，不为统一体积数据重生成用户文件。

## 性能测量底座

`src/motion/measurement.mjs` 仅在显式测量时启动集中 rAF 采样器。`__NUTBOOK_MOTION__.measureSteady()` 默认预热2000ms、采集10000ms；短效果独立重播并记录重置边界，保留跨预热边界的长帧。提交帧间隔与 render CPU 耗时分别记录，p95 使用 nearest-rank。帧间隔不代表物理显示器呈现时延。后台、尺寸/DPR改变、切页、编辑态切换、取消均使当前结果作废；dispose 清理采样器及延迟确认。

`measureInteraction(kind,dispatch)` 从派发套用/参数事件前计时，匹配对应 revision 的有效渲染后，等下一批 rAF 再完成。不能把同批回调当作下一帧；超2000ms标为失败。首次套用主动显示静止粒子预览，参数拖动继续保持当前归一化位置。冷套用需全新 runtime、空动作、未准备 adapter；热测量使用同一页连续调参。计时器与下面的准备取消/恢复机制分别处理测量结果和用户状态。

## 准备、取消与本次渲染模式

`src/motion/preparation.mjs` 为字体/资源准备提供200ms进度与2000ms截止时间。取消、取代与超时立即结束等待，不依赖底层资源 Promise 自己返回；晚到结果不得附着。同步构建无法抢占主线程，但返回后核对总准备时间，超时释放刚建的所有 adapter，不提交画面；部分构建失败也释放已建部分。当前六类候选共用准备与资源清理边界，编排后同时播放超过三个前景动作时拒绝并说明原因，不静默跳过。

超时/失败保留语义正文。编辑时进度与失败提示合并在动效面板顶部，仅在准备中显示取消、失败后显示重新尝试/减少卡顿后重试/先看正文；日常调参不展示三个临时观看模式按钮。阅读时才使用右上角临时恢复提示，成功后自动收起。低负载将有效粒子数限制80、DPR限制1；标准DPR上限2；静态不准备动效。有效降载参数不进入动作JSON或编辑历史，退出并重开后恢复标准；显式重播按保存设置重新尝试。降载只从失败恢复入口触发，不能借标准原参数冒报标准测量结果。准备中转入后台取消旧结果，恢复后按原编辑/阅读状态重新准备；已有播放则继续使用时钟暂停/恢复。

独立 `docs/presentations/motion-gallery/archive/recovery.html` 为当前入口样本：打开→工具栏编辑→套用文字动效→调参→保存/重开；准备失败时从面板内重试。字体挂起、取消、超时、低负载重试、后台失效与部分资源释放已有自动回归；原生最小化/恢复、慢资源视觉反馈以及新模式入口仍待真实运行面确认，不用浏览器注入取代原生验收。

独立真实样本 `docs/presentations/motion-gallery/archive/performance.html` 可从资料库打开，运行3轮稳态、取消、复制或下载 JSON；环境记录与所选源文件 SHA-256 随结果输出。标准条件缺失、未知电源状态、非1280×720/DPR1、非标准参数/时长不会标为标准条件满足。Chromium 回归脚本另跑20次全新 runtime 首次套用及30次热调参。当前样本仅覆盖单个文字动作，不代表背景＋三个前景、转场、最大参数、双屏或原生平台性能通过。新增测量代码不自动注入用户已经编辑的旧样本。

## 原生演示步骤协议（P1 实施，原生验收待确认）

probe 增加可选 `motion:{contract,supportsSteps}`，旧页面缺省为 None，继续现有页面导航。新版 runtime 声明 `supportsSteps:true`；Rust 从磁盘校验正式 JSON、目标身份及页面列表后建立步骤会话。旧 runtime 的 false 能力继续页面导航。会话与 view 使用可选 `motionState`，不把 pending 意图当作已执行状态。

`src-tauri/src/core/motion_protocol.rs` 定义 `MotionPlaybackState`：pageId、stepId、stepIndex、playbackStatus、logicalTimeMs、backgroundTimeMs、motionRevision。stepIndex=0 为页面初始态，stepId=null；1起的步骤必须有稳定 ID。时间为非负有限数值，步骤≤256。`type:"motion-applied"` ACK 与原页面 ACK 分开；pending 校验 session/generation/sequence/page/step/revision 的完全匹配，且 sequence 大于最后已确认序号。重复、乱序、旧 generation、跨页、旧 revision 均拒绝。

已接入原生 intent 串行路由、同序号重试、250ms 观众状态校准、恢复最后确认状态和演讲者 current child 的 seek/render。浏览器运行 Rust 生成脚本并以真实 Rust 会话校验报告；这不是 Tauri IPC、WKWebView 或物理双屏验收，后者仍待确认。

## P0 收口与范围（2026-10-13）

用户已在当前预览版完成正式路径验收：Markdown → 导出 HTML 演示 → 支持动效编辑 → 打开 → 工具栏进入编辑与唤醒动效面板 → 套用字形粒子 → 调参/彩色与黑白明度/恢复默认 → 保存 → 关闭重开 → 进入全屏/退出/再次进入。用户确认完整流程无问题，同意收口 P0。此前 nbskill 样板、中文输入及面板拖动路径也由用户确认。该结论限于本机当前预览版，不代表最终安装包、Windows 或双屏验收。

本期完成正式 v1 数据合同、字形粒子候选、统一时钟、准备取消/超时与晚到资源释放、测量底座、Markdown 正式导出与仓库 nbskill 双入口、编辑历史和源文件保存、未知正式版本保护及生成资源预算。参数范围与默认值以 registry 为准；colorMode=0 为彩色，1 为黑白，lightness 控制 0..100 明度；兼容旧 colorMode=2 的白色设置。缺省字段保留旧文件效果。

进入编辑时面板默认收起；工具栏 SVG 按钮打开/收起，tooltip 与 aria-expanded 同步。收起提交参数草稿到历史，不改变保存基线。复位图标位于颜色行右侧，hover/键盘聚焦显示“恢复默认参数”，支持撤销；其最终布局随完整面板再调整。顶部整块可拖动并支持方向键，小窗口内容可滚动，不新增 native surface。

阅读态进入全屏重播当前页，重复宿主焦点通知不重播，退出全屏不主动重播；全屏尺寸更新重新准备画面，仍尊重减少动态效果偏好。旧独立 HTML 内嵌运行代码不自动升级。

自动检查与用户原生确认分别记录于本地 handoff。Chromium 行为回归、真实 Rust 写盘/重开、资源审计及 Rust 检查不能替代用户原生验收；测量器完成不代表双屏、最大参数或目标平台性能达标。

### 后续范围

P0 按当前用户确认范围收口：实验迁移/另存 UI 延后，保留所有原实验文件，不虚构迁移完成。当前继续 DOM/Canvas 候选，GSAP 未引入，许可适用性与候选技术探针留作后续引擎决策，不标为已通过。当前无数值文本草稿控件，无外部动效资产多文件事务；新增这些入口前需补相应合同与验证。

P1 保留六类贯通、完整分类与编排面板、点击/延迟步骤及原生演讲者同步。当前正式步骤链已实施，原生单屏/双屏真实步骤验收仍须完成。导出选项后续按“静态/动态/自定义”统一命名与对应行为。33 个最终目标未缩减，最终离线安装包和跨平台验收归发布阶段。

## P1 selection and bulk editing — initial implementation

P0 checkpoint: `9012432`. P1 branch: `codex/html-motion-p1`. Current implementation supports current-page object selection, compatible bulk edits, and all six candidate categories. Acceptance artifact: `docs/presentations/motion-gallery/archive/p1-selection.html`, registered through nbskill. Fresh Markdown motion exports use the same runtime.

The motion panel starts in object-selection mode. Click selects one declared object; Shift, Command or Control click toggles additional objects. Object clicks do not enter text editing. A separate temporary stylesheet draws selection outlines and is removed on close, exit and dispose. Text mode restores ordinary input; switching back to selection clears the text range and is blocked during IME composition.

Mixed selection reports compatible text objects and skipped non-text objects. All-incompatible selection disables Apply without creating history. Apply/replacement, remove, parameter edits, color and reset use one existing document-history transaction per bulk action. Replacement preserves action ID/order/trigger/delay. Cross-page selection and arbitrary grouping are not supported.

Controls display the first selected action; adjusting one parameter unifies that parameter on the selected actions. Mixed color/monochrome selection disables the hue/lightness slider until color mode is unified. All six candidate categories, action-list and step implementations are described below.

Automated verification covers immutable mutation/compatibility/identity, actual Chromium mouse multi-selection, single-step undo/redo, text mode, mixed color units and real Rust disk save/reopen. The selection/bulk-edit slice has user native confirmation; the action-list/timing slice also has separate user native confirmation.

## P1 action list and sequential preview

Current-page actions can be reordered with SVG controls. Each row selects its target and edits trigger plus bounded 0..60000 ms delay. Delay uses a range control; there is no uncommitted numeric text draft. One completed drag/trigger change/reorder uses one existing document-history transaction. Keyed rows preserve the actual slider node and keyboard focus across commits and undo/redo. Expanded-list size changes constrain the panel above the editing toolbar.

The pure timeline compiler resolves withPrevious against the preceding start and afterPrevious against the preceding end, plus delay. A first relative action starts relative to page entry. Click actions create stable groups; sequential preview places each new group after the preceding group's latest end. Step zero is the implicit initial group. Reordering recalculates timings without changing action IDs, targets or saved trigger/delay values. Dependencies are ordered and contain no arbitrary references, so cycles cannot be authored.

Rendering uses compiled start times, hides future targets without drawing their first particle frame, and restores semantic text at completion. The foreground budget uses peak simultaneous actions (maximum three), rather than total action count. Timeline results are cached per config/page and exposed as a copy. Delay, order and trigger persist through the existing atomic source commit.

Acceptance artifact: docs/presentations/motion-gallery/archive/p1-actions.html. The first two text actions demonstrate page-entry title playback followed by a delayed paragraph. Older user-edited acceptance artifacts are retained unchanged. Preview deliberately runs all groups continuously. This action-list slice has user native confirmation. The following step slice requires separate native acceptance.


## P1 formal step playback

Acceptance artifact: `docs/presentations/motion-gallery/archive/p1-steps.html`. Open in the current preview app, use the toolbar presentation entry (or S), then single-screen rehearsal. Editing-panel Replay remains a continuous preview; formal presentation starts at implicit step zero. A click, Space or forward key starts the next click group; an intent during playback completes the current group. Only a subsequent intent after the last group changes page. Backward navigation shows the destination page completed. Delays and relative starts remain within their click group. Reduced motion starts at the completed final group.

The native coordinator reserves a sequence, obtains a source-valid planned state, then sends Apply. It confirms only the applied audience ACK. Repeated forward intents queue (bounded at 32); a pending page selection converges to the latest requested page. A 2.5-second timeout retries the same sequence once without replaying an already applied action; failure at five seconds suspends the audience and retains the last confirmed state for explicit recovery. Page-ACK timeout also suspends formal playback. Old generations and unknown page/step/revision states are rejected. Restored audience generations receive the last confirmed logical time and step. Presenter mirror applies only confirmed audience states and reports ready after its latest applied state; next-page preview stays static.

Automated coverage: pure step transitions; Rust source identity and session/ACK validation; generated native audience and mirror scripts in Chromium; click/finish/page/back navigation; same-sequence retry without time reset; new-generation restoration; Rust validation of the recorded reports; presenter button labels and actions on the final slide. Existing 28-check P0 regression passed. IPC transport is mocked in the browser test. Native window lifecycle, actual IPC and physical dual-display synchronization remain user acceptance items; P1 automatic foundation is closed; native and visual product acceptance remains pending.


## 本次静态演示

演示准备入口对新版正式动效文档提供默认关闭的复选框。`staticMotion` 仅存于原生会话，不修改文档或保存 baseline。观众和当前页镜像在 runtime 启动前收到静态策略，不创建动效 projection；所有语义内容完整可见，不等待页内步骤，点击和按键直接翻页。原生恢复沿用该会话策略；结束后新会话默认正常动画。旧页面无此开关。当前页标识为静态预览。已自动验证准备入口、Rust 生成观众/mirror 脚本、直接导航、源配置不变及新会话恢复正常步骤；真实原生开关尚待用户验收。后续新增背景/转场/退场适配器必须继续遵守同一静态策略。

## 引擎候选决策与投影组合

2026-10-14 核查 [Webflow GSAP Software License §9](https://webflow.com/legal/product-terms)：条款明确限制部分可视化动画构建工具用途。Nutbook 的可视化套用/调参属于需要进一步确认适用性的产品形态；本工程决策暂不引入 GSAP，使用计划允许的自研 DOM/Canvas 适配路线，不宣称已获得 GSAP 分发授权或已通过 GSAP 产品 Gate。33 个模板目标不因此缩减。后续如取得明确适用许可，可在同一 prepare/render(time)/dispose 合同内重新评估，不增加独立时钟。

`projection.mjs` 每个语义目标只使用一个临时 stylesheet；适配器各自持有 token。透明度取各 token 的最小值，transform 叠加在作者原始 computed transform 后；清空某个动作不会抹掉另一个动作的终态。最后一个 token dispose 删除整个临时样式。原作者 DOM/属性保持不变；静态、编辑退出和 dispose 清理所有 token。字形粒子已迁移到该组合器。重力撞击、聚光适配器已登记进可套用 registry 和产品面板，并有可操作样本；仍属待视觉确认的候选。

## P1 对象类别贯通（候选，视觉/原生待验收）

目前可套用四个候选：字形粒子、重力撞击、聚光强调、粒子消散。分类/模板使用软件 DOM 下拉；浏览和选择不改变文档，仅套用提交一条历史。参数按实际模板规则展示；混合模板先套用统一再调参，防止把无效参数写入另一模板。动作列表显示效果名和对象名，点击定位精确类别。

文字和普通进场共用 entrance 槽，同槽替换保留 ID、顺序、触发和延迟；emphasis、exit 各自独立。JS、JSON Schema、Rust 与 nbskill 同步校验模板/参数，Rust 验证共槽冲突。编辑移除/调参/复位仅作用于当前类别；批量替换是一条历史。多适配器使用目标投影组合器，已完成进场不能复活已退场内容。静态与编辑清理投影后恢复完整语义正文。

重力使用确定性落体、阻尼回弹及接触烟尘；聚光使用柔和径向暗场；退场由字形轮廓随横向阈值解离、漂移与衰减，独立于进场轨迹。均由统一时钟定位，不新增 rAF。连续编辑/阅读预览自然结束时清理投影返回完整正文；正式步骤播放保留动作完成态。验收样本 `p1-objects.html`，人工清单 `acceptance.md`。已验证分类控件、兼容过滤、槽替换、独立类别、撤销、终态组合、语义节点身份及真实 Rust 保存重开；视觉质量和真实原生新增模板尚待确认。背景与转场见后续章节；六类候选的自动基础已收口，原生/视觉品质仍待验收。

## P1 页面背景与共享时钟

页面 background 可为 null 或 `{id,templateId,templateVersion,params,seed}`，当前仅接收 background.flowing-gradient@1。ID 与动作/其他页效果全局不重复；未知字段、模板/版本、参数越界和伪造类别在 JS、Schema、Rust、nbskill 均拒绝。背景不接受 targetId/trigger/delay；每页仅一个槽，套用/替换/移除与复位均为一条既有文档历史。

动效面板页面图标进入背景设置，也可从类别选择背景。参数为周期、浓度、两个色相、流速及尺度。背景使用页内下层 canvas 和临时 isolation stylesheet，保留作者属性、文字颜色与布局，不遮正文；静态会话及减少动态偏好不准备背景。后台、编辑进入、切页和 dispose 沿既有取消/资源清理路径。

同一个权威时钟驱动前景和背景。步骤逻辑时间在当前组结束处钳住，等待下一次点击时背景继续；backgroundTimeMs 单独序列化并由观众每 250ms 校准。下一步骤保留当前背景时间；重新播放/换页从零开始。暂停是显式状态，即使前景已完成也不会因镜像校准而重新启动背景。原生校验只容许声明背景的页面使用非零背景时间，同页校准/计划/ACK 拒绝背景时间倒退；新代际恢复使用最后确认时间。镜像 seek/render 已确认的背景时间，无独立推进器。

可打开样本 p1-background.html。已自动验证面板、参数、undo、Rust 原子保存/重开、布局与语义不变、确定性 seek、等待步骤/暂停/重建恢复、静态不准备背景，以及 Rust 生成控制脚本的背景校准和镜像延迟小于等于 500ms。浏览器 IPC 仍为模拟；物理双屏与真实 WKWebView 视觉/性能留待人工验收。

## P1 幕布揭示与页面事务

transition.curtain-reveal@1 提供时长、方向、直线/圆形及边缘柔化。编辑内预览保留源页编辑身份，调参在当前进度生效；重播完成、点击正文或取消恢复源页，不新增历史。转场参数仍通过统一历史与 Rust 保存。六类组合样本 p1-scenes.html。

正式演示前向相邻页使用离开页转场；返回与跳页直接切换，同页不重置。源页背景及前景按当前像素冻结；目标初始步骤与零时刻背景准备完成后，由同一权威时钟揭幕。目标准备失败保留旧页和资源，提供重试、直接显示完整正文或取消。不兼容媒体本次直切并保留配置。本次静态演示不准备转场。快速导航最后目标收敛，后台与 resize 取消合成并释放快照。

快照复制已解码图片和 canvas 像素，不重新请求图片 URL；清除执行脚本、事件、源身份，并重映射 SVG 引用。原生在转场完成前仍确认旧页；观众暂停状态冻结镜像，目标准备及切换完成后才确认新页。校准附递增样本序号，拒绝同一时间点乱序暂停/恢复。浏览器运行 Rust 生成脚本的测试不等于真实 WKWebView 或物理双屏验收。

## 原生暂停、重播与时间定位

演讲者底栏在正常动效会话显示暂停/继续 SVG、重播 SVG 与整页时间条，提供随状态更新的 tooltip/aria 名称；与演讲计时器独立。定位跨步骤采用页面绝对毫秒，共享边界选择后一组，定位后保持暂停；背景定位同一时刻。重播当前页从初始自动组与背景零时刻开始，仍保留之后的点击组。静态会话不显示这些控件。

命令仅接受演讲者来源；忙于翻页/待确认时不接受控制。观众从实时钟生成计划，Rust 按 intent 校验允许的时间后退/归零，应用 ACK 后才更新确认状态；普通前进与校准仍要求单调时间。旧序号报告不能覆盖新位置。应用前暂停时钟保证精确定位；同序号重试不重新应用。旧支持步骤的 HTML 可经已有 timeline/state/apply API 使用控制，无需改写原文件。

## 独立模板预览

动效卡片聚焦后在卡片内试播独立示例，六类均使用实际 renderer。示例节点属于临时控件，不进入正式目标、保存快照、baseline 或历史；切换类别、关闭、取消准备和退出释放资源。复用页面唯一 clock，背景也不另建调度器；进场使用相同运动函数按预览区域高度取景。卡片失焦恢复静态示意。窄窗口停靠底部并可收起，恢复宽窗口自动展开。

P1 自动基础汇总入口为 npm run check:motion:p1，包含既有 P0、数据/面板/历史/六类/正式导出/Rust 保存、原生生成脚本与 Rust ACK、静态六类、两类组合性能和未压缩资源预算。该入口不能证明 WKWebView、物理双屏和人工视觉品质；这些保留在集中验收清单。

## 动效选择界面对齐（2026-10-14）

恢复已确认 brainstorm v2 结构：元素效果/页面背景/页面转场三页签；元素进场（含文字效果）/强调/退场三个动作槽；搜索与效果卡片；独立参数区、预览与套用操作、底部播放顺序。点击卡片只读试播，套用才进入历史。现有分类和模板 select 只保留内部状态接口，不再展示为选择入口。本机默认参数仍属后续功能，界面不提供假成功入口。新版七份 P1 样本只升级内嵌 runtime，保留正文与配置；应用更新不意味着外部已有 HTML 的内嵌界面自动升级。

动效面板选择交互修订：顶层沿用 Markdown 排版中心的透明背景/底部黑色指示线样式，元素动作槽采用独立按钮层级。效果卡片内持有真实 renderer 静态帧，统一示例 NUTBOOK；键盘或指针聚焦后由页面唯一 clock 原位播放，失焦恢复静态。卡片资源使用独立 UI 标记，与正文投影/背景清理分别识别；搜索/切类取消准备，关闭或退出释放全部卡片资源。播放和套用位于所有参数之前，不再展开额外示例区域。

动作顺序中的每项默认收起，点击名称展开/收起开始方式与延迟；展开状态仅属于界面，不进入历史或保存。选择/文字编辑按钮同行的整页播放按钮（播放/暂停两态，暂停后继续原进度）连续预览整页已套用的对象动作及背景；套用同行的三角按钮仅预览当前选中对象在当前类别已套用的效果（多选同时从零播放），背景/转场类别则预览当前页对应效果。模板卡片聚焦试播独立示例，不借用整页播放按钮。元素播放、套用和移除同排；参数底部不再显示重复的重播和暂停控件。

重力撞击的烟尘按文字 Range 实际边界定位，图片仍按对象边界定位；可选 dustSize 为 0–3，默认 1，兼容旧配置。聚光强调根据目标祖先合成背景明度选择模式：浅底保留目标中心并压暗周围，深底仅照亮目标区域并提升目标亮度；光区按实际文字边界形成柔边椭圆，结束清理 filter。面板关闭按钮默认透明，仅 hover/键盘 focus 出现灰底。

背景与转场均提供三个错位方框的全部套用SVG；复制当前效果参数，转场跳过末页和不兼容页面，整批一次撤销。移除使用圆圈减号SVG。动效面板按钮统一软件tooltip，hover/focus可见，移除系统title避免双提示；播放文案为播放当前效果/播放整页动画/暂停整页动画。

## 屏幕适配与验收边界

每次开始或手动恢复演示重新枚举显示器。传输方式（AirPlay/物理线缆）不作为硬编码的屏幕定位条件。会话中的选择使用当次 monitor ID；运行中布局/分辨率改变时，以唯一屏幕名称匹配身份更新几何 ID，同名歧义不猜测，按失联处理并要求重新选择。监测器丢失时暂停并失效 pending 动作；恢复仍沿现有手动选屏入口并增加 generation。

窗口恢复保存“原屏身份 + 相对原屏的逻辑坐标/尺寸”，不保存当前观众屏坐标作恢复值。退出时重新枚举：原屏仍在则按相对位置恢复并限制在可见范围；原屏已断开或身份歧义则回退当前主屏。macOS 再按 NSScreen.visibleFrame 排除菜单栏/Dock。非 macOS 的原生屏幕工作区与实际窗口行为仍需目标平台验收。

macOS 定位在原生 UI 线程先完成 frame 设置并检查实际位置，再进入全屏。退出全屏通知之后跨主队列边界执行恢复，避免 Tao 样式/最大化恢复覆盖位置；不依赖固定延时或重试循环。操作 epoch 失效旧排队定位，防止旧会话恢复覆盖新开始/结束。无法确认目标位置时保留普通窗口和拖动条，并向演讲者提示失败。

跨屏缩放变化同步 child bounds，并触发正文 resize，以当前 viewport/DPR 重建动效画布和回放可序列化时间状态。不同刷新率仍使用逻辑时间，不为追求表面帧率改保存参数、自动删减粒子或加独立动画时钟。

已确认运行面为用户当前 AirPlay 扩展屏：自动放置和退出原主屏恢复通过。该环境观众 rAF 约33ms（约30fps），未判定渲染或无线链路根因；不作为物理直连性能通过。用户之后用自有小屏幕补物理直连，以及不同排列/缩放、断屏恢复。临时窗口日志及帧采样已移除。自动几何回归与浏览器协议测试不能替代真实拓扑/硬件验收。

P1作为进入P2前的代码阶段检查点提交，25组自动回归及当前AirPlay放置/退出恢复通过；物理直连、真实断屏恢复和不同设备性能对照待补测，不将此提交标为全部硬件验收完成。

## P2 文字库第二轮合同

用户确认从 React Bits 的必选清单筛选 15 个独立效果；以视觉表现为参考独立实现，不复制或改写组件源码。旧的模板数量目标被此名单取代。Scroll Float 合并为错落入场的轻盈浮升预设，Scroll Reveal 合并为柔焦显现的逐段显现预设；Fuzzy Text 暂缓。可选项及第二阶段 AI 不进入本批。

| 参考 | 产品中文名 | 模板 ID | 槽 |
| --- | --- | --- | --- |
| Masked Heading | 流彩显字 | text.masked-heading | 进场 |
| Particle Text | 粒子成字 | text.glyph-particles | 进场 |
| Split Flap Text | 翻牌显字 | text.split-flip | 进场 |
| Stroke Text | 勾勒成字 | text.outline-write | 进场 |
| Fold Text | 折页显字 | text.fold-unfold | 进场 |
| Echo Text | 叠影归位 | text.echo-trail | 进场 |
| Split Text | 错落入场 | text.character-stagger | 进场 |
| Blur Text | 柔焦显现 | text.blur-reveal | 进场 |
| Text Type | 逐字打出 | text.typewriter | 进场 |
| Text Pressure | 弹性字形 | text.pressure | 强调 |
| Shiny Text | 掠光强调 | text.light-sweep | 强调 |
| Gradient Text | 流彩文字 | text.gradient | 强调 |
| Decrypted Text | 解码显字 | text.decode-reveal | 进场 |
| True Focus | 逐词聚焦 | text.true-focus | 强调 |
| Count Up | 数字递增 | text.count-up | 进场 |

全部为 text 目标，按表中槽替换，沿用动作编排、唯一时钟、参数历史和源文件保存合同。新选项不再显示 text.elastic-warp、text.depth-text，旧保存文件仍能读取这两个 ID；不静默改写旧配置。已通过功能检查不等于获得视觉认可，全部继续保留 candidate 状态。

文字按 Intl.Segmenter 字素分组，使用跨 inline 节点的可见 Range 分片；排除换行边界空光标区域。原文节点不拆分，不改 textContent 或作者属性；临时画布属于 renderer 生命周期，一般效果终态恢复正文；固定/悬停聚焦保留投影到切换或结束预览，dispose 一律恢复并释放。柔焦和聚焦使用预生成的模糊字形，不能依赖 WKWebView 不支持的 Canvas filter。勾勒沿字形实际轮廓显现，不承诺中文笔顺；折页按文字行处理。掠光保留字形不透明度；浅色字在临时绘制层使用中性灰底与白色光带形成反差，收尾恢复作者字色，不修改源样式。聚光光圈从画面四角之一进入，前 70% 减速落到实际文字/图片范围中心，停留后于最后 10% 退光；深底照亮圆形光区并压暗周围，光层随行进位置扣除实际字形，避免白雾遮字。入光方向与光圈大小为可省略的新参数，旧文档兼容。掠光仅使用中性灰白反光，不着蓝色。

Text Pressure 将指针压力改为一次自动扫过再复原；True Focus 取消自动轮播，提供指定文字与鼠标悬停两种模式；支持词组或单字，指定模式点击“在正文选字”后，直接在原文本框拖选任意连续文字，保存 UTF-16 选区起止偏移（最大 65535）；不按分词列表挑选。选区可跨 inline 富文本节点，按字素完整投影；Esc 取消，键盘选区 Enter 确认。旧 focusIndex 仅保留读取兼容，不再显示为选框。过渡结束后保持聚焦，悬停离开恢复清晰；鼠标只改变临时播放投影，不写入文档。悬停响应实际正文窗口，不同步演讲者缩略区域与观众窗口的指针位置。数字递增仅接受一个有限数字，可带正负号、指定货币/单位、小数及千位分隔符；拒绝多数字句子和错误分隔，保留小数位/格式，不修改源文字。卡片数字示例使用数字，其余为 NUTBOOK。

正式入口：NUTBOOK 文件打开 docs/presentations/motion-gallery/archive/p2-text-review.html → 编辑 → 动效 → 选对象/套用 → 调参 → 播放 → 保存 → 关闭重开。15 页交替深浅底，第 15 页专门检查数值与格式。p2-text.html 保留作旧候选对照，不能据此判断第二轮视觉。正式 Markdown 导出器与 nbskill 同步使用当前运行库；旧外部 HTML 不自动升级。

用户已同意 P2 进入完整回归与提交收尾；单项确认与自动检查仍分开记录。P1 已完成另一副屏的投放、演讲者操作与退出恢复复测；断屏场景和目标显示器性能对照不从这些结果推定通过。

面板对象使用按页声明顺序生成的标题/文本框/图片等短编号，动作顺序也用同一标识，不注入正文摘要。所有参数选框排在滑条前，同组标签按短到长排列；叠影参数统一使用叠影名称。翻牌卡片使用可读 NUTBOOK 翻动，正文实际翻牌保留。

编辑套用与效果参数预览只准备当前类别的选中效果，防止同对象的其他动作露帧；动作顺序、开始方式与延迟调整仍按整页时间线预览，保留原有延迟。

## P3 首轮：玻璃破碎退场

用户否决碎片进场用途；`entrance.fragment-assemble` 从新选项撤下，仅保留旧配置读取。`exit.fragment-fall` 沿用 ID，中文名为「玻璃破碎」，版本 1，支持文字与图片。参数保持 `durationMs`（500–6000，默认1600）、`pieces`（整数8–160，默认48）、`strength`（0.2–2，默认1）。

共享边界的径向裂纹从受击点传递，碎片面积影响质量、初始冲量、空气阻力和转动惯性；使用恒定重力与线性阻力的解析运动，支持冷定位、倒序 seek 和重播，不依赖逐帧积分或额外时钟。平面翻转与短促反光表现玻璃碎片，保留原纹理，不提前淡出。准备时求出全部碎片落出画面的时间，再映射至用户时长；退场终态保持隐藏，dispose 恢复原样并释放位图。没有地面或碎片间碰撞。

只读采样文字和已解码图片，不拆节点、不改作者属性。单份快照限制16M像素，超限报告准备失败。

验收入口仍为 `docs/presentations/motion-gallery/archive/p3-fragment-pair.html`：演示第一次点击使标题与图片破碎落下；编辑 → 动效 → 退场「玻璃破碎」→ 调参、预览、保存关闭重开。样本已撤下自动拼合。当前只验收退场，P3 其他候选尚未实施。

### 折面收拢退场

`exit.fold-close` 版本1，支持文字与图片；时长500–6000（默认1400）、方向axis整数0/1（左右/上下对折）、透视距离0.6–3（默认1.6）。整个对象沿固定中线连续对折，使用共享只读快照的两个完整绘制面，由浏览器原生 3D 合成；禁止逐条切割近似透视，不逐字翻折、不弹跳、不整体等比缩小。翻页冻结时同时复制完整绘制面并挂起原层，取消恢复或结束时按既有生命周期恢复/释放。闭合终态隐藏，dispose恢复作者原节点与样式。

打开 `docs/presentations/motion-gallery/archive/p3-fold-close.html`：第一页标题与PNG左右合拢，第二页文字上下合拢；编辑 → 动效 → 退场「折面收拢」可调参、预览、保存关闭重开。用户已确认玻璃退场方向，新折面退场仍待原生视觉验收。

### 极光幕与粒子漂浮背景

`background.aurora` 与 `background.drifting-particles` 版本1，仅用于页面背景。共用既有播放时钟，支持确定性定位、循环、低负载模式和退出释放。纹理在准备阶段缓存，播放不重新生成像素纹理；作者文字颜色、节点与布局保持原样。

极光幕使用柔和曲线光带，支持双颜色、层数、宽度、浓度与周期。粒子漂浮使用固定种子的景深粒子，支持数量、大小、景深、四向漂移、颜色、浓度与周期；前景粒子移动较快，无闪烁。低负载模式降低纹理分辨率并限制粒子数量。

验收样本 `docs/presentations/motion-gallery/archive/p3-backgrounds.html` 包含两种背景各自的深浅底页面。从编辑 → 动效 → 页面背景调整、预览、套用全部、保存关闭重开；演示时检查正文可读性和连续运动。折面收拢已获用户“基本可用”确认；这两个背景仍待原生视觉验收。

原生反馈返修：粒子漂浮视觉未通过，`catalog:false` 撤下新选项，旧配置继续可读。极光取消额外整体透明度衰减，增强光带浓度与横纵流动幅度；零浓度保持无光带，最大浓度与默认值须有可测量差异。样本正文与用户参数不重置，前两页作为极光返修入口。

极光配色返修：每道缓存光幕沿横向使用主色→辅色→主色的连续渐变，默认主色相255、辅色相112（紫—鲜绿—紫）。通过 OKLCH 感知插值保留过渡亮度，窄亮部轻微抬亮；不再按层使用单色。已有保存的色相参数不迁移，点击恢复默认参数可使用新默认配色。

### 五种低干扰背景候选

新增版本1页面背景：`background.silk` 绢流、`background.dark-veil` 暗幕流光、`background.threads` 游丝、`background.side-rays` 侧光、`background.topography` 等高线。参考 React Bits 的视觉方向作演示适配，不启用鼠标追随、点击扰动或闪烁；不是原站 WebGL 实现的逐像素移植。

面板仅提供状态motion（0静态/1流动）、色相hue、浓度strength、速度speed四项。分布position、尺度scale、周期durationMs和各类detail保留在版本1数据合同中供预设与旧配置兼容，不再作为用户调节项。静态状态冻结背景自身，不影响元素动作。深浅底采用不同明度的背景颜色，不改作者文字颜色。

柔和材质使用单份小分辨率缓冲区（标准宽160、低负载宽96，高度按页面比例），按当前时刻直接计算并放大绘制；禁止在参数输入时同步预生成整组循环纹理。游丝实时绘制连续线束；等高线与渐层波澜使用下述 GPU 高度场；所有帧由现有时间输入确定，dispose清理页面层、样式和位图，无独立时钟。

验收入口 `docs/presentations/motion-gallery/archive/p3-quiet-backgrounds.html` 共15页，按上述顺序每种含深底标题、浅底长正文、深底图表。编辑→动效→页面背景→套用/调参→静态与分布→撤销重做→保存关闭重开；演示检查文本优先、缓慢运动和投屏效果。极光新配色已经用户视觉通过；粒子背景继续撤下，这五项仍待用户原生视觉确认。


五背景候选默认浓度0.55、速度1。侧光使用画外入射的连续柔和光场；游丝使用全幅连续噪声场，没有固定左端或聚拢扇出。新版验收文档使用当前默认参数；旧验收文档保留用户参数。等高线的 GPU 实现见下节。


浓度语义修正（五背景候选）：strength仍为版本1数据键，面板继续标为“浓度”，但不再乘到整层alpha。绢流/暗幕调整纹理空间频率，游丝调整实际绘制线条数，等高线调整等值轮廓数，侧光调整连续光场的条纹疏密与展开幅度；零值关闭背景，其他值使用固定可见度。统一色相/状态/浓度/速度四控件，无额外透明度控件。

游丝取消固定左端和单向展开，改为带种子的连续梯度噪声流场，整段保有间距和起伏，时钟沿闭合轨道采样以保持循环确定性。侧光从右上画外入射，冷暖光色按角度场连续混合，不用固定的独立黄/白光条；浅底使用高明度颜色，禁止沿用暗色纹理制造烟雾阴影。自动检查须验证归一化alpha几何变化、线条/轮廓实际数量变化和浅底光色，不得仅以非空像素当成浓度有效。

### 等高线辉光与渐层波澜

等高线与渐层波澜使用离屏 WebGL2 着色器，在页面 CSS 尺寸×DPR（标准上限2，低负载1）的实际像素上绘制，再复制到现有页面 Canvas2D 输出层。等高线由连续谐波高度场生成，使用 fwidth 抗锯齿轮廓、连续高度配色与柔和辉光，默认紫粉配色。浓度改变等值轮廓密度，不控制透明度。

`background.gradient-waves` 版本1，中文名「渐层波澜」；状态、色相、浓度、速度四项面板。GPU 有界求交产生透视波面，结合高度渐色和距离雾化，上部保留透明正文区。浓度改变波面空间频率与振幅。波面高度按振幅归一化后映射波谷、波身和波峰，避免高度值直接夹成同一亮色；浅底使用独立的波谷色深。循环起点具有非零运动速度，入页前半秒需可见变化。两项仍由现有循环时钟驱动，无鼠标互动、循环预烘焙或额外 RAF。输出层支持转场冻结，dispose 释放 GPU 程序、缓冲、上下文及 Canvas；无 WebGL2 时报告可恢复错误，不暗中使用低分辨率近似。编辑静态帧与播放中的图形异常均进入已有恢复界面。

新验收样本 `docs/presentations/motion-gallery/archive/p3-lit-backgrounds.html`：前3页等高线，后3页渐层波澜；各含深底标题、浅底长正文、深底图表。编辑→动效→页面背景→调节浓度/速度→静态→撤销重做→保存关闭重开。侧光本轮用户反馈“还差不多”，记为基本可用；新增两项待原生视觉确认。新版默认值样本为 `docs/presentations/motion-gallery/archive/p3-gpu-backgrounds.html`；原有样本只更新运行时，正文和配置保持不变。

极光幕与流动渐变的面板各显示四项：主色相、辅色相、不透明度、速度。周期与光带宽度/层数或尺度保留版本1数据兼容，但不再显示；此面板精简不改变已有动画表现，不把 alpha 参数标为浓度。

元素单独试播保留当前页已套用背景作为合成底层；仅筛选前景动作，不排除背景。试播期间及结束回到编辑静态帧后，背景均应可见；预览不修改保存配置。


### P3 页面转场补齐（2026-10-15）

用户确认已做P3基本验收，偏离原计划的舍弃项不追补；碎片拼合/粒子漂浮维持隐藏兼容。页面转场由遮幕揭页扩为四项：`transition.parallax` 多层视差、`transition.depth-travel` 景深穿越、`transition.grain-dissolve` 颗粒溶解。均为版本1，沿用page.transition槽、既有时长/seed、完整参数历史与原子保存。

多层视差按方向使冻结页面与语义正文按不同距离离场，depth控制层间距离。景深穿越以推近/拉远、推进幅度和虚化组合退去；实际两页filter capability均须支持。颗粒溶解使用seed确定的有界二维颗粒裁切，grain控制密度，direction控制消退顺序。最多128×128格，完整相邻格合并为行区间，仅消退边缘逐格缩小；缓存几何，不在每帧生成PNG/data URL。冻结层直接使用CSS path裁切，没有图片加载/解码环节，也不复制逐格DOM、不增加独立RAF或远程资源。前两项使用冻结层transform/filter；不修改作者正文或配置。

正式navigation与模板卡片使用同一模板分派；顺向相邻页播放，反向/跨页跳转、后台/resize取消、快速切页收敛、准备/快照失败恢复均沿既有事务规则。预览结束返回源页；dispose删除冻结层，WeakMap不保留已移除节点。源/目标背景保持原冻结合同。

验收样本`docs/presentations/motion-gallery/archive/p3-transitions.html`四页依次展示三种新增转场，末页无转场。新增项自动回归与原生视觉认可分开记录；本次不实现原计划剩余对象进场/碎片解构，不动缩略图链路。


演示退出恢复边界：演讲者Destroyed回调内不得执行NSWindow.zoom或同步动画恢复（可重入Tao事件锁）。原生窗口保留强引用，AppKit主队列异步应用显式frame；恢复可带动画，操作前后校验epoch，fullscreen退出的pending恢复保留动画标志。会话先原子取走以避免重复清理。单屏/物理双屏的窗口状态和残留验收单独记录，不以编译或单元测试代替。


### P3 实用退场补充（2026-10-16）

用户批准柔焦隐去exit.blur-away、定向擦除exit.directional-wipe、透视退远exit.depth-away。三者版本1，支持声明的完整text/image对象，沿用exit槽、时长、触发关系、统一时钟/历史与原子保存，结束opacity0，dispose恢复作者样式，不拆字或重写正文DOM。

柔焦用blur与淡出，定向擦除用四方向柔边渐隐遮罩，透视退远用固定透视距离下的负Z位移及淡出。参数分别为durationMs+blur/direction/depth，旧退场不改。样本motion-gallery/archive/p3-simple-exits.html三页文字/图片；用户从资料库打开，演示点击退场，编辑→动效→退场→套用/调参/重播→保存完成→关闭重开。生成器拒绝覆盖已存在样本。新增效果的原生视觉待用户确认，双屏退出已由用户确认实测通过。


### 图片卷页退场（2026-10-16）

exit.page-curl版本1，仅image目标，参数durationMs、direction（右/左卷起）、curl卷曲半径。从图片边缘推进连续圆柱卷面，最多192个纹理带，保留原图方向和透明区域，纸背由原alpha掩膜生成；透视压缩与曲面明暗，不是两平面折叠。复用已有Canvas/时钟/投影，确定性seek，终态隐藏源图，dispose释放快照/纸背。无新native surface/RAF/远程资源。样本motion-gallery/archive/p3-page-curl.html含左右卷及宽卷面图片，用户从资料库打开→演示点击→编辑/动效/退场/卷页→调参重播→保存完成→关闭重开。原生视觉待用户确认。

### P4 本机收藏与默认参数

收藏/默认参数通过宿主 motion_preferences 命令维护 app_data_dir/motion-preferences.json；content caller须绑定当前item且持有有效编辑lease，不能访问自选路径。逐操作锁内读改写、临时文件sync并原子rename，避免不同文档覆盖其他模板偏好。默认值按模板ID和version存完整合法参数，不写入HTML、不进入文档历史；读取遇到不兼容版本/参数回退出厂并提示。普通调参不改变默认值；设为默认要求所选同模板参数一致。恢复原始默认只影响未来套用，已有文档保留参数副本。收藏筛选与搜索共同作用，不改变文档。后台失败明确显示“偏好未保存，请重试”。

P4入口为 docs/presentations/motion-gallery/P4-验收.html。最小路径：Nutbook正式编辑→收藏/筛选→调参设默认→不保存退出→另文档套用→恢复默认；P4语言与偏好自动回归通过，物理双屏退出用户实测通过。常驻模式选择已删除，最终安装包及离线目标环境留P5。

### P3 页面转场第二批

新增 transition.smooth-push（平滑推页）、transition.cube-rotate（立方旋转）、transition.page-flip（整页翻转），均版本1，四方向及300–2000ms；后两项透视距离1.2–4倍视口尺度。共7种可选转场，原4种保留。新三项冻结前后两页（正文/图片/当前前景背景），在同一临时DOM舞台组合双面；推页同步位移，立方体共享旋转轴/相邻90度面，翻转为背靠背180度面，背面不镜像显示正文。精确端点，退出删除完整快照，无新native surface或私有时钟。

沿用原navigation事务、能力探测、统一clock及首帧准备；快速切页取消并回滚，编辑预览结束返回源页，反向/跨页直接到达，演讲者镜像跳过出页转场。P3-验收.html追加三页并维护备注/菜单身份，不重生成旧内容或配置。双浏览器seek/UIhistory/真实Rust保存重开/导航取消与原4转场回归，原生视觉仍需用户确认。错层切片仅后续品质候选，未加入目录。

### 错层切片

transition.layered-slices@1：默认5层宽切片（3–7），四方向、600–2400ms（默认1400），错开节奏0.04–0.3、位移0.03–0.2、柔边0.01–0.08。五阶连续缓动按片错开；前后两页整块切片作全幅同步推移，共享交接边界，错位参数微调各片位移差，柔边参数控制接触阴影宽度，不使用沿片揭幕遮罩。用户指出初版“小位移+分片揭幕”仍像擦除，已用真实整片运动替换。只在同一冻结双页舞台内组合，不另开时钟/窗口。复制canvas像素并为每片重命名DOM/SVG ID与引用，参数层数/轴改变重建时释放旧片，事务结束/取消整体删除。正文不以交界alpha叠印，结束精确归位。P3同文件追加一页；浏览器自动与Agent中间帧检查通过，原生视觉待用户。

### P4播放入口裁决

用户明确已删除且不接受标准/低负载/静态模式选择，动效面板不得重新加入该入口。正常播放直接使用动态效果；性能优化在实现内部处理，不通过增加模式选择要求用户理解。截图静态封面与现有错误恢复是独立边界，不作为常驻模式入口。

### P4 动效界面本地化

ui-locale.mjs/ui-en.json为可独立嵌入HTML的本地词典，覆盖可选效果名、参数/选项、动作列表、收藏/默认参数、tooltip、相关准备/导航失败提示。HTML编辑器getLocale/enter/updateLocale同步当前应用语言，关闭重开沿用当前语言；语言切换关闭未提交的自定义菜单，重置唯一tooltip，保留选择/参数/文档历史。搜索同时匹配原中文与当前英文，忽略大小写。

翻译只接收动效自有ShadowRoot，禁止遍历document、slot分配内容、作者DOM、输入value或配置。初次/显式语言切换扫描该小范围UI；平时只处理MutationObserver变动节点并缓存源文案，忽略style/script/data-i18n-skip，卸载断开观察器。保存仍携带稳定templateId/参数；中文正文、标题与文件名不翻译。截图静态封面边界保持不变。

P4实现与自动项已收尾：双浏览器全目录参数/说明的en→zh→en、英文搜索、偏好及失败回归、每引擎30次真实时钟连续切页覆盖8转场，无配置/历史污染或快照残留。偏好磁盘与样本演示preflight另有Rust验证。浏览器与模拟IPC不替代原生GUI/物理双屏；物理双屏由用户另行验收。跨机器离线和最终安装包留P5。


## 封面与演讲者静态预览

封面截图与演讲者下一页截图统一在作者脚本执行前声明静态截图用途：本机 Unix 截图通过 CDP document-start 声明，保留封面的 file:// 资源解析；scoped HTML 响应仅为截图副本注入 `__NUTBOOK_CAPTURE_PURPOSE__=static` 与旧运行库兼容标记 `__NUTBOOK_STATIC_PRESENTATION__=true`；CDP 另以 document-start 声明用途。新运行库截图时不初始化进退场、转场或动效时钟；宿主使用独立静帧渲染器，按当前配置和 seed 绘制背景的固定时刻，再固化为 PNG 图层。等高线和渐层波澜静帧使用相同高度场的 CPU 投影，不依赖 WebGL；其他背景共用原有 Canvas 2D 绘制。已有正式 HTML 使用旧静态标记，宿主注入截图专用渲染器，不自动重写源文件。正常阅读、编辑和观众播放不注入截图标记，保留真实准备错误与恢复操作。

HTML 封面缓存版本为 `html-card-v5-legacy-ready`，旧 ready 图片按既有 desired-key 校验失效、从正常封面队列重建。演讲者截图要求 bridge 导航与本地图片准备成功；CDP evaluate 异常或未返回成功不得继续缓存为预览图片。本边界不改窗口退出链路。


演讲者首个下一页截图优先于当前页备用图和相邻页预取；下一页完成或失败前不启动其余截图。应用进程内保留有上限的 PNG LRU（24 MiB、最多32张），按文档路径、正文和可校验的同目录图片内容、页ID及截图尺寸隔离，重复进入同一文档可复用。外部样式/脚本、CSS资源URL、媒体、srcset及越出父目录的依赖保守不缓存，不扩大资源读取权限。首次生成、文档/图片变化或应用重启后仍需准备；不把缓存命中等同于所有首次截图可立即显示。窗口退出与恢复链路不变。


截图还须收敛旧文档自身的动画：有限 CSS/WAAPI 入场直接到完成状态，循环动画暂停；退场不得把正文隐藏作为封面。较早正式运行库若不识别静态标记，截图副本先 dispose 恢复作者正文、取消粒子准备，再显示动态导出的正文片段。experimental-v1 使用自身 pause/seek(duration) 达到可读静帧，不能按正式 JSON schema 校验或迁移。上述操作仅作用于截图副本；源文件和普通播放不改。
