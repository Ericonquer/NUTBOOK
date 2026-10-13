# HTML Motion v1：P0 数据与保存合同

状态：P0 底座已实现，产品闭环未验收。实施范围与退出条件以 `docs/plans/2026-10-12-html-motion-system-plan.md` 为准。本文不代表 P0 退出或模板交付。

## 文件与版本

正文沿用 `nutbook-html/v1`。HTML 根须声明 `data-nutbook-motion-contract="nutbook-motion/v1"`，且有唯一 `script#nutbook-motion-config[type="application/json"][data-id="nutbook-motion-config"]`。配置根为 `{contract:"nutbook-motion/v1",pages:[...]}`。未知版本拒绝动效保存；实验版保持独立，不自动迁移。

机器可读 schema 为 `src/motion/schema.json`；模板参数权威表为 `src/motion/registry.json`。JS 校验在 `src/motion/contract.mjs`，Rust 校验在 `src-tauri/src/core/motion.rs`，两者使用同一个 registry 和有效样本 `tests/fixtures/motion/valid.json`。JSON Schema 之外的跨实体约束由两个校验器执行。

所有对象拒绝未知字段。配置最多 256 KiB、128 页，每页最多 256 个目标和动作；ID 是 1–80 个 ASCII 字母、数字、`_`、`-`、`:`。对象键递归排序，数组顺序保留；动作数组即播放顺序。配置不包含代码、URL、CSS 或选择器。

当前生成器内嵌的 runtime 遇未知正式根版本或不可解析/不可校验配置时，显示兼容说明，不创建动画画布或编辑面板；正文沿普通编辑合同工作，源配置保留。`__NUTBOOK_MOTION_SUPPORT__` 记录 supported/reason，故障不静默忽略。已生成的历史 HTML 携带旧 runtime，不自动升级它们；因此新版提示不应被外推为所有旧运行库都已具有该 UI。实验根版本仍留给其原运行库，不自动改写。

实验版另存正式副本入口尚未实施：现有实验 particles/impact/light 中，仅文字粒子有正式候选适配器，后两者不能无损映射。迁移必须明确列出效果差异、保留原件；在对应 UI/映射验收前，拒绝把重写合同标记或删除未知动作当作迁移完成。

## 页面、目标与动作

每页包含 `id`、`capabilities`、`targets`、`actions`、`background`、`transition`。新文档 `actions:[]`，背景与转场为 null，默认静态。当前 registry 只有 `text.glyph-particles@1` 候选；已接通 Canvas2D 字形粒子渲染器与最小编辑面板，尚未通过原生 GUI 与视觉验收，不能计作合格模板。未来适配器未实现前，不接受对应配置。

目标声明 `{id,kind}`，kind 为 text/image/group/video/embedded。页面 ID、目标 ID、动作 ID 各自唯一；目标 ID 跨页唯一。动作包含 `id,targetId,templateId,templateVersion,params,seed,trigger,delayMs`。目标须属于同页并兼容模板；同一目标同一类别只容许一个动作。seed 为 uint32，delayMs 在 0–60000 范围；trigger 为 click/withPrevious/afterPrevious。第一项相对本页开始解释，后续触发与点击步骤语义见正式计划 §5。

能力包含 containsVideo/containsEmbeddedFrame/supportsDomTransition/supportsFilterTransition，以及 mediaTargetIds/embeddedTargetIds。媒体列表与相应目标声明必须完全匹配。有效存在性取声明与实测并集，支持能力取交集。运行时 DOM/资源探测及转场适配器尚未接入；不得把 schema 校验当作运行能力证明。

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

`src/motion/preparation.mjs` 为字体/资源准备提供200ms进度与2000ms截止时间。取消、取代与超时立即结束等待，不依赖底层资源 Promise 自己返回；晚到结果不得附着。同步构建无法抢占主线程，但返回后核对总准备时间，超时释放刚建的所有 adapter，不提交画面；部分构建失败也释放已建部分。当前仅文字粒子候选，页面超过三个前景动作保守拒绝并说明原因，不静默跳过。

超时/失败保留语义正文。编辑时进度与失败提示合并在动效面板顶部，仅在准备中显示取消、失败后显示重新尝试/减少卡顿后重试/先看正文；日常调参不展示三个临时观看模式按钮。阅读时才使用右上角临时恢复提示，成功后自动收起。低负载将有效粒子数限制80、DPR限制1；标准DPR上限2；静态不准备动效。有效降载参数不进入动作JSON或编辑历史，退出并重开后恢复标准；显式重播按保存设置重新尝试。降载只从失败恢复入口触发，不能借标准原参数冒报标准测量结果。准备中转入后台取消旧结果，恢复后按原编辑/阅读状态重新准备；已有播放则继续使用时钟暂停/恢复。

独立 `docs/presentations/motion-gallery/recovery.html` 为当前入口样本：打开→工具栏编辑→套用文字动效→调参→保存/重开；准备失败时从面板内重试。字体挂起、取消、超时、低负载重试、后台失效与部分资源释放已有自动回归；原生最小化/恢复、慢资源视觉反馈以及新模式入口仍待真实运行面确认，不用浏览器注入取代原生验收。

独立真实样本 `docs/presentations/motion-gallery/performance.html` 可从资料库打开，运行3轮稳态、取消、复制或下载 JSON；环境记录与所选源文件 SHA-256 随结果输出。标准条件缺失、未知电源状态、非1280×720/DPR1、非标准参数/时长不会标为标准条件满足。Chromium 回归脚本另跑20次全新 runtime 首次套用及30次热调参。当前样本仅覆盖单个文字动作，不代表背景＋三个前景、转场、最大参数、双屏或原生平台性能通过。新增测量代码不自动注入用户已经编辑的旧样本。

## 原生演示步骤兼容协议（P0 定义）

probe 增加可选 `motion:{contract,supportsSteps}`，旧页面缺省为 None，继续现有页面导航。当前 runtime 声明 `supportsSteps:false`；Rust 不接受提前声明步骤支持。会话与 view 预留可选 `motionState`，当前为 None 且省略序列化，不把 pending 意图当作已执行状态。

`src-tauri/src/core/motion_protocol.rs` 定义 `MotionPlaybackState`：pageId、stepId、stepIndex、playbackStatus、logicalTimeMs、backgroundTimeMs、motionRevision。stepIndex=0 为页面初始态，stepId=null；1起的步骤必须有稳定 ID。时间为非负有限数值，步骤≤256。`type:"motion-applied"` ACK 与原页面 ACK 分开；pending 校验 session/generation/sequence/page/step/revision 的完全匹配，且 sequence 大于最后已确认序号。重复、乱序、旧 generation、跨页、旧 revision 均拒绝。

目前仅接入兼容 probe/会话字段与数据校验测试，尚未接通原生 intent 串行路由、超时重试、250ms权威校准、重连回放和演讲者 current child 的 seek/render；因此不能宣称真实步骤同步可用。P1 启用 supportsSteps 前必须完成这些链路及单/双屏真实验收。

## P0 收口与范围（2026-10-13）

用户已在当前预览版完成正式路径验收：Markdown → 导出 HTML 演示 → 支持动效编辑 → 打开 → 工具栏进入编辑与唤醒动效面板 → 套用字形粒子 → 调参/彩色与黑白明度/恢复默认 → 保存 → 关闭重开 → 进入全屏/退出/再次进入。用户确认完整流程无问题，同意收口 P0。此前 nbskill 样板、中文输入及面板拖动路径也由用户确认。该结论限于本机当前预览版，不代表最终安装包、Windows 或双屏验收。

本期完成正式 v1 数据合同、字形粒子候选、统一时钟、准备取消/超时与晚到资源释放、测量底座、Markdown 正式导出与仓库 nbskill 双入口、编辑历史和源文件保存、未知正式版本保护及生成资源预算。参数范围与默认值以 registry 为准；colorMode=0 为彩色，1 为黑白，lightness 控制 0..100 明度；兼容旧 colorMode=2 的白色设置。缺省字段保留旧文件效果。

进入编辑时面板默认收起；工具栏 SVG 按钮打开/收起，tooltip 与 aria-expanded 同步。收起提交参数草稿到历史，不改变保存基线。复位图标位于颜色行右侧，hover/键盘聚焦显示“恢复默认参数”，支持撤销；其最终布局随完整面板再调整。顶部整块可拖动并支持方向键，小窗口内容可滚动，不新增 native surface。

阅读态进入全屏重播当前页，重复宿主焦点通知不重播，退出全屏不主动重播；全屏尺寸更新重新准备画面，仍尊重减少动态效果偏好。旧独立 HTML 内嵌运行代码不自动升级。

自动检查与用户原生确认分别记录于本地 handoff。Chromium 行为回归、真实 Rust 写盘/重开、资源审计及 Rust 检查不能替代用户原生验收；测量器完成不代表双屏、最大参数或目标平台性能达标。

### 后续范围

P0 按当前用户确认范围收口：实验迁移/另存 UI 延后，保留所有原实验文件，不虚构迁移完成。当前继续 DOM/Canvas 候选，GSAP 未引入，许可适用性与候选技术探针留作后续引擎决策，不标为已通过。当前无数值文本草稿控件，无外部动效资产多文件事务；新增这些入口前需补相应合同与验证。

P1 保留六类贯通、完整分类与编排面板、点击/延迟步骤及原生演讲者同步。当前 supportsSteps=false；原生 intent 串行路由、超时/校准/重连与双屏真实步骤验收仍须完成，不能把协议字段校验当作可用功能。导出选项后续按“静态/动态/自定义”统一命名与对应行为。33 个最终目标未缩减，最终离线安装包和跨平台验收归发布阶段。
