# Nutbook Release 更新检查设计

日期：2026-05-23

## 目标

为 Nutbook 增加一个轻量级更新检查机制：检查 GitHub Releases 是否有更新版本，并在发现新版本时，在侧栏 logo 旁显示一个小提醒。

这个功能是「更新提示」，不是自动下载或自动安装更新。

## 范围

本次包含：

- 检查 Nutbook 的 GitHub Releases。
- 对比最新 Release 版本和当前打包版本。
- 在「偏好设定」里新增「自动检查更新」开关。
- 在偏好开启时，应用启动后自动检查更新。
- 支持用户在设置里手动检查更新。
- 有新版本时，在侧栏 logo 右上角显示小气泡。
- 点击小气泡或设置里的入口，打开对应 GitHub Release 页面。

本次不包含：

- 检查 commit、分支或 GitHub Actions 产物。
- 自动下载、安装或应用更新。
- Tauri updater 签名、更新 manifest、回滚、安装器编排。
- HTML runtime overlay 改动。

## 更新源

Nutbook 只检查 GitHub Releases。

默认仓库：

```text
https://github.com/leeeric202666-prog/NUTBOOK
```

后端查询 GitHub latest release endpoint。后续如果需要排除 prerelease，可以改为查询 Releases API 列表并筛选；当前版本先以 GitHub 最新 Release 为准。

初版不检查 commit。

## 版本比较

当前版本来自 Tauri 应用包版本。当前可见打包版本是 `src-tauri/tauri.conf.json` 里的 `0.3.0`。

Release tag 可能带 `v` 前缀，例如 `v0.3.1`。比较前需要规范化：

- 去掉首尾空白。
- 去掉开头的 `v` 或 `V`。
- 解析语义化版本里的数字段。

如果解析失败，后端返回不确定状态，不显示更新气泡。

## 用户偏好

在「设置 > 偏好设定」里新增一行：

- 标题：`自动检查更新`
- 描述：`启动时自动检查 GitHub Releases，有新版本时在侧栏 logo 旁提示。`
- 控件：开关
- 默认值：开启

这个偏好属于应用级设置，应存到 Tauri app data 目录里的 JSON 文件，不只放在 `localStorage`。

建议文件名：

```text
update-settings.json
```

建议结构：

```json
{
  "autoCheckEnabled": true,
  "lastCheckedAt": "2026-05-23T00:00:00Z",
  "lastKnownLatestVersion": "0.3.1",
  "lastKnownReleaseUrl": "https://github.com/leeeric202666-prog/NUTBOOK/releases/tag/v0.3.1"
}
```

## 检查时机

自动检查行为：

- 主应用完成启动后延迟几秒再检查，避免影响首屏和资料库加载。
- 只有 `autoCheckEnabled` 为 `true` 时才自动检查。
- 自动检查最多每天一次。
- 用户在设置里手动点击「检查更新」时，绕过每天一次的限制。

网络失败不应影响启动。只有用户手动检查，或打开更新偏好区域时，才在设置里显示轻量提示。

## 后端命令

新增一个小的 `updates` command 模块，职责包括：

- 读取更新设置。
- 保存更新设置。
- 检查 GitHub Releases。
- 比较当前版本和最新版本。

建议命令：

```text
get_update_settings
set_auto_check_updates_enabled
check_for_updates
open_external_url_command
```

`open_external_url_command` 已存在，打开 Release 页面时复用它。

`check_for_updates` 建议响应结构：

```json
{
  "currentVersion": "0.3.0",
  "latestVersion": "0.3.1",
  "releaseUrl": "https://github.com/leeeric202666-prog/NUTBOOK/releases/tag/v0.3.1",
  "hasUpdate": true,
  "checkedAt": "2026-05-23T00:00:00Z",
  "status": "available"
}
```

可能状态：

- `available`：发现新版本。
- `current`：当前已是最新版本。
- `disabled`：自动检查关闭。
- `unavailable`：无法得到可比较版本。
- `error`：检查失败。

后端应返回结构化错误或 `error` 状态，不应 panic。

## HTTP 依赖

使用轻量 Rust HTTP client。推荐 `ureq`，因为本功能只需要简单的同步 GET 请求和 JSON 解析。

请求应设置明确的 User-Agent，例如：

```text
Nutbook Update Checker
```

## 前端状态

在 `appState` 中新增更新相关状态：

- `updateSettings`
- `updateStatus`
- `updateCheckInFlight`
- `updateCheckFeedback`

启动流程：

1. 加载更新设置。
2. 如果自动检查开启，且未触发每天一次限制，则安排延迟检查。
3. 将结果写入 `appState`。
4. 重新渲染设置页和 logo 气泡。

手动检查流程：

1. 用户点击「检查更新」。
2. 前端调用 `check_for_updates`，并传入强制或手动检查标记。
3. 设置页展示检查中、已是最新、有更新或检查失败状态。

## Logo 气泡

仅当 `hasUpdate` 为 `true` 时，在侧栏 logo 右上角显示黑色圆角小气泡。

侧栏展开时显示：

```text
New beta
```

侧栏收纳时显示：

```text
NB
```

气泡应相对现有 brand / logo 容器定位，让它自然跟随展开和收纳状态。

这个气泡不走 HTML runtime overlay。它属于普通侧栏 UI，应留在主 DOM。

点击气泡打开检测到的 GitHub Release 页面。

## 设置 UI

在「设置 > 偏好设定」里展示：

- `当前版本`
- 如果已检测到，展示最新版本。
- `检查更新` 按钮。
- 只有存在 Release URL 时，展示 `打开 Release`。
- 失败文案只显示在设置里。

主侧栏只显示小气泡，不显示网络错误或冗长更新文案。

## 错误处理

启动后的自动检查：

- 失败时保持静默，只在 app state 里保存可恢复状态。
- 不显示全局 toast 或状态提示，除非用户主动触发检查。

手动检查：

- 在设置里显示简洁反馈。
- 如果之前已有可用 Release 结果，失败时保留旧结果。

Release 版本格式异常：

- 不显示气泡。
- 返回 `unavailable` 或 `error`，并在设置里给出清晰原因。

## 验证

前端相关修改至少运行：

```bash
npm run build:frontend
npm run check:frontend
```

Tauri / Rust 相关修改至少运行：

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

如果新增 i18n key，还需要运行：

```bash
npm run check:i18n
```

手动验证：

- 自动检查默认开启。
- 关闭自动检查后，重启仍保持关闭。
- 手动检查不受自动检查开关影响。
- 后端报告有新版本时，气泡出现。
- 气泡能跟随侧栏展开和收纳状态。
- 点击气泡能打开 Release URL。
- 网络失败不影响应用启动。
