# Release 更新检查实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 按设计文档实现基于 GitHub Releases 的「自动检查更新」机制，并在有新版本时显示侧栏 logo 气泡。

**架构：** 后端新增独立 `updates` 模块，负责设置持久化、Release 请求和版本比较；前端只负责偏好 UI、启动检查调度和徽标展示。更新检查不接入 Tauri updater，不检查 commit，不触碰 HTML runtime overlay。

**技术栈：** Tauri v2 command、Rust `serde` / `ureq`、现有 `dist/index.html` 单页宿主 UI、现有 Settings 偏好列表。

---

## 文件结构

- 创建：`src-tauri/src/models/update.rs`，定义更新设置和检查响应 payload。
- 创建：`src-tauri/src/core/update.rs`，封装版本比较、Release 解析、设置读写和网络检查。
- 创建：`src-tauri/src/commands/updates.rs`，暴露 Tauri commands。
- 修改：`src-tauri/src/models/mod.rs`、`src-tauri/src/core/mod.rs`、`src-tauri/src/commands/mod.rs`，注册新模块。
- 修改：`src-tauri/src/state/mod.rs`，保存 `update-settings.json` 路径并提供设置方法。
- 修改：`src-tauri/src/main.rs`，注册更新 commands。
- 修改：`src-tauri/Cargo.toml` / `Cargo.lock`，添加 `ureq`。
- 修改：`dist/index.html`，新增更新状态、设置行、启动检查、logo 气泡和 mock command。

## 任务 1：后端版本比较与设置模型

**文件：**
- 创建：`src-tauri/src/models/update.rs`
- 创建：`src-tauri/src/core/update.rs`
- 修改：`src-tauri/src/models/mod.rs`
- 修改：`src-tauri/src/core/mod.rs`

- [ ] **步骤 1：编写失败的 Rust 单元测试**

在 `src-tauri/src/core/update.rs` 中添加测试，覆盖：

```rust
#[test]
fn compare_versions_handles_v_prefix_and_numeric_parts() {
    assert_eq!(compare_release_versions("0.3.0", "v0.3.1"), Some(std::cmp::Ordering::Greater));
    assert_eq!(compare_release_versions("0.3.1", "v0.3.1"), Some(std::cmp::Ordering::Equal));
    assert_eq!(compare_release_versions("0.4.0", "v0.3.9"), Some(std::cmp::Ordering::Less));
}

#[test]
fn default_update_settings_enable_auto_check() {
    let settings = UpdateSettings::default();
    assert!(settings.auto_check_enabled);
    assert!(settings.last_checked_at.is_none());
}
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
cargo test --manifest-path src-tauri/Cargo.toml update -- --nocapture
```

预期：失败，原因是 `core::update` 或对应类型尚未定义。

- [ ] **步骤 3：实现最小模型和版本比较**

实现 `UpdateSettings`、`UpdateCheckStatus`、`UpdateCheckResponse`、`GitHubRelease` 和 `compare_release_versions()`。

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
cargo test --manifest-path src-tauri/Cargo.toml update -- --nocapture
```

预期：新增测试通过。

## 任务 2：后端设置持久化与检查 command

**文件：**
- 修改：`src-tauri/src/core/update.rs`
- 创建：`src-tauri/src/commands/updates.rs`
- 修改：`src-tauri/src/state/mod.rs`
- 修改：`src-tauri/src/commands/mod.rs`
- 修改：`src-tauri/src/main.rs`
- 修改：`src-tauri/Cargo.toml`

- [ ] **步骤 1：编写失败的 Rust 单元测试**

在 `src-tauri/src/core/update.rs` 添加设置读写测试：

```rust
#[test]
fn update_settings_round_trip_persists_auto_check_preference() {
    let path = std::env::temp_dir().join(format!(
        "nutbook-update-settings-{}.json",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("time should be valid")
            .as_nanos()
    ));
    let mut settings = UpdateSettings::default();
    settings.auto_check_enabled = false;
    settings.last_checked_at = Some("2026-05-24T00:00:00Z".to_string());

    save_update_settings(&path, &settings).expect("settings should save");
    let loaded = load_update_settings(&path).expect("settings should load");

    assert!(!loaded.auto_check_enabled);
    assert_eq!(loaded.last_checked_at.as_deref(), Some("2026-05-24T00:00:00Z"));
    let _ = std::fs::remove_file(path);
}
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
cargo test --manifest-path src-tauri/Cargo.toml update -- --nocapture
```

预期：失败，原因是读写函数尚未实现。

- [ ] **步骤 3：实现设置读写、Release 检查和 commands**

实现：

- `load_update_settings()`
- `save_update_settings()`
- `build_update_response()`
- `fetch_latest_github_release()`
- `get_update_settings`
- `set_auto_check_updates_enabled`
- `check_for_updates`

`check_for_updates` 接收 `force` 和 `checked_at`，网络失败返回 `status: "error"` 的响应，不 panic。

- [ ] **步骤 4：注册命令并运行测试**

运行：

```bash
cargo test --manifest-path src-tauri/Cargo.toml update -- --nocapture
```

预期：新增测试通过。

## 任务 3：前端设置页、启动检查和 logo 气泡

**文件：**
- 修改：`dist/index.html`

- [ ] **步骤 1：添加前端状态和 mock command**

新增：

- `updateSettings`
- `updateStatus`
- `updateCheckInFlight`
- `updateCheckFeedback`

mock command 返回当前版本和无更新状态。

- [ ] **步骤 2：添加设置 UI 和事件**

在「偏好设定」里新增「自动检查更新」开关、`检查更新`、`打开 Release`、当前版本和最新版本状态。

- [ ] **步骤 3：添加启动自动检查**

启动后加载更新设置，并在每天一次限制允许时延迟执行 `check_for_updates`。

- [ ] **步骤 4：添加 logo 气泡**

在 `.brand-copy` 内新增 `updateBadge`，有新版本时显示；展开显示 `New beta`，收纳显示 `NB`。

- [ ] **步骤 5：运行前端检查**

运行：

```bash
npm run check:frontend
```

预期：JS 语法检查通过。

## 任务 4：整体验证

**文件：**
- 修改：所有相关实现文件

- [ ] **步骤 1：运行前端构建和检查**

运行：

```bash
npm run build:frontend
npm run check:frontend
```

预期：命令退出码为 0。

- [ ] **步骤 2：运行 i18n 检查**

运行：

```bash
npm run check:i18n
```

预期：命令退出码为 0。

- [ ] **步骤 3：运行 Rust 检查**

运行：

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

预期：命令退出码为 0。

- [ ] **步骤 4：复核范围**

确认实现只检查 GitHub Releases，不检查 commit；不自动下载更新；不修改 HTML runtime overlay；设置偏好持久化在 Tauri app data。
