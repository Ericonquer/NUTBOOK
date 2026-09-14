// ---------------------------------------------------------------------------
// §7.2 文件默认应用：真实状态查询 + 用户显式「设为默认」（Codex 返修 2026-09-09）
// ---------------------------------------------------------------------------
// 合同要点：
// - 状态只反映系统真实 handler 查询；引导 done、点击成功或候选注册一律不得
//   当作默认成功（`external_default_app_guide_status` 只服务首次引导，不再
//   参与状态展示）。
// - 不显示其他应用名称，只返回 NUTBOOK 是否为默认。
// - 扩展名逐一核对：Markdown 组 [.md, .markdown]、HTML 组 [.html, .htm]；
//   同组结果不一致显示「部分已设为默认」，不能合并误报。
// - 设为默认是用户显式点击后的动作（macOS 由系统确认对话框授权），完成后由
//   前端重新查询真实状态；取消/失败不能标成功。
// - 两个格式组各自独立可设：kind = "markdown" / "html" 分别作用到对应 UTI，
//   组间互不牵连（不因设置 HTML 而改动 Markdown 的 handler）。
// - 不静默设置 handler；安装/升级路径绝不调用本模块的 set 命令。

use serde::Serialize;

use crate::errors::AppError;

/// Markdown 的真实文件探针扩展名。HTML 不能走 AppKit 的 content-type
/// 默认应用接口，否则 macOS 会一并改写网页协议。
#[cfg(target_os = "macos")]
pub(crate) fn default_app_probe_extension_for_kind(kind: &str) -> Option<&'static str> {
    match kind {
        "markdown" => Some("md"),
        _ => None,
    }
}

/// 扩展名检查文件目录（app-owned data 目录内，不入资料库/最近记录）。
#[cfg(target_os = "macos")]
const CHECK_FILE_DIR: &str = "default-app-checks";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DefaultAppGroupStatus {
    /// 组内全部扩展名的默认 handler 都是 NUTBOOK。
    Default,
    /// 组内全部扩展名的默认 handler 都不是 NUTBOOK（查询均成功）。
    NotDefault,
    /// 同组扩展名结果不一致（如 .md 已默认而 .markdown 未默认）。
    Partial,
    /// 任一扩展名查询失败或无 handler，无法确认。
    Unknown,
}

/// 平台无关聚合：`None` 表示该扩展名查询失败（任何失败 → Unknown）。
pub fn aggregate_group_status(per_extension: &[Option<bool>]) -> DefaultAppGroupStatus {
    if per_extension.is_empty() || per_extension.iter().any(|value| value.is_none()) {
        return DefaultAppGroupStatus::Unknown;
    }
    let total = per_extension.len();
    let defaults = per_extension
        .iter()
        .filter(|value| **value == Some(true))
        .count();
    match defaults {
        0 => DefaultAppGroupStatus::NotDefault,
        value if value == total => DefaultAppGroupStatus::Default,
        _ => DefaultAppGroupStatus::Partial,
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DefaultAppStatusPayload {
    pub markdown: DefaultAppGroupStatus,
    pub html: DefaultAppGroupStatus,
}

/// 查询 NUTBOOK 是否为 Markdown / HTML 组的系统默认应用（只读，无副作用）。
#[tauri::command]
pub fn default_app_status(app: tauri::AppHandle) -> Result<DefaultAppStatusPayload, AppError> {
    #[cfg(target_os = "macos")]
    {
        let _ = &app;
        let markdown =
            aggregate_group_status(&query_extension_handlers(&app, &["md", "markdown"])?);
        let html = query_html_viewer_handler()?;
        Ok(DefaultAppStatusPayload { markdown, html })
    }
    #[cfg(not(target_os = "macos"))]
    {
        // Windows（§7.3）：不读 UserChoice 伪造「已关联」状态；查询不支持
        // → 无法确认，前端展示中性状态。
        let _ = app;
        Ok(DefaultAppStatusPayload {
            markdown: DefaultAppGroupStatus::Unknown,
            html: DefaultAppGroupStatus::Unknown,
        })
    }
}

/// 「设为默认」动作的平台结果模式：前端据此分流后续提示（macOS 等待系统
/// 确认对话框裁决；Windows 直接打开系统设置页，不提供 Finder 说明）。
/// serde 无载荷 enum：invoke 返回字符串 "systemDialog" / "systemSettings"
/// （Codex R5：前端必须直接比较字符串，不得读 `.mode`）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SetDefaultAppMode {
    /// macOS：系统确认对话框已发起；命令在用户裁决完成后返回。
    SystemDialog,
    /// Windows：系统设置页（ms-settings:defaultapps）已打开，由用户在系统
    /// 页面手动设置；最终结果以之后的真实查询为准。
    SystemSettings,
}

/// A development build has a deliberately different bundle identity and no
/// declared file associations.  It must therefore never mutate LaunchServices
/// (or open the Windows default-app settings flow as if it were a releasable
/// handler).  Keep this check at the command boundary so every platform
/// setter is protected by the same contract.
fn default_app_mutation_allowed() -> bool {
    !cfg!(debug_assertions)
}

/// 系统回调携带的原始 NSError 信息（分类前的证据形态）。
#[cfg(target_os = "macos")]
#[derive(Debug, Clone)]
pub(crate) struct RawAdjudicationError {
    pub domain: String,
    pub code: i64,
    pub description: String,
}

/// 把系统回调的 NSError 分类为取消/失败（Codex R4：取消分支必须可达）。
/// `NSUserCancelledError`（NSCocoaErrorDomain code 3072）是 Apple 文档化的
/// 用户取消通用错误码；失败描述始终携带 domain/code，若 GUI 验收发现真实
/// 取消证据与该判定不符，按实际 domain/code 修正（不按本地化文案猜）。
#[cfg(target_os = "macos")]
pub(crate) fn settle_default_app_adjudication(
    error: Option<RawAdjudicationError>,
) -> Result<(), AppError> {
    match error {
        None => Ok(()),
        Some(raw) => {
            if raw.domain == "NSCocoaErrorDomain" && raw.code == 3072 {
                Err(AppError::DefaultAppActionCancelled)
            } else {
                Err(AppError::DefaultAppActionFailed(format!(
                    "{} ({}) {}",
                    raw.domain, raw.code, raw.description
                )))
            }
        }
    }
}

/// 用户显式点击「设为默认」后发起系统默认应用变更。
/// Markdown 走 AppKit；HTML 仅设置 public.html 的 Viewer role，以保留网页
/// 浏览器对 http / https 的 handler。
#[tauri::command]
pub async fn set_default_app(
    app: tauri::AppHandle,
    kind: String,
) -> Result<SetDefaultAppMode, AppError> {
    if !default_app_mutation_allowed() {
        return Err(AppError::DefaultAppActionFailed(
            "default app changes are disabled in development builds".to_string(),
        ));
    }
    #[cfg(target_os = "macos")]
    {
        if kind == "html" {
            return set_default_html_viewer_handler().map(|()| SetDefaultAppMode::SystemDialog);
        }
        match default_app_probe_extension_for_kind(kind.as_str()) {
            Some(extension) => set_default_app_macos(&app, extension)
                .await
                .map(|()| SetDefaultAppMode::SystemDialog),
            None => Err(AppError::InvalidParams),
        }
    }
    #[cfg(target_os = "windows")]
    {
        // Codex R4：Windows 主路径直接打开系统默认应用设置页（§7.3），
        // 不走 macOS 确认对话框，也不落回 Finder 说明。
        let _ = (app, kind);
        let status = std::process::Command::new("explorer.exe")
            .arg("ms-settings:defaultapps")
            .status()
            .map_err(|_| AppError::IoError)?;
        if !status.success() {
            return Err(AppError::DefaultAppActionFailed(
                "explorer.exe exited with failure".to_string(),
            ));
        }
        Ok(SetDefaultAppMode::SystemSettings)
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = (app, kind);
        Err(AppError::UnsupportedFileType)
    }
}

/// 按真实 Markdown 探针文件发起系统默认应用变更。
#[cfg(target_os = "macos")]
async fn set_default_app_macos(app: &tauri::AppHandle, extension: &'static str) -> Result<(), AppError> {
    use objc2_app_kit::NSWorkspace;
    use objc2_foundation::{NSBundle, NSError, NSString, NSURL};
    use tauri::async_runtime::channel;

    if !ensure_check_file(extension) {
        return Err(AppError::IoError);
    }
    let probe_path = check_file_path(extension).ok_or(AppError::IoError)?;

    let (tx, mut rx) = channel::<Result<(), AppError>>(1);
    // Codex R4 P1：AppKit 调用必须发生在主线程，但这里只「发起」请求并立即
    // 返回——绝不在主线程等待系统裁决（同步 recv 会冻结整个应用，系统确认
    // 对话框的完成链也依赖主线程）。等待发生在 async 命令的 runtime 线程。
    let dispatch_result = app.run_on_main_thread(move || {
        let workspace = NSWorkspace::sharedWorkspace();
        let app_url = NSBundle::mainBundle().bundleURL();
        let probe_url = NSURL::fileURLWithPath(&NSString::from_str(
            probe_path.to_string_lossy().as_ref(),
        ));
        // 系统确认对话框：error nil → 成功；取消（NSUserCancelledError）→
        // 中性取消；其余 → 失败并携带 domain/code 证据。完成后由前端重新
        // 查询真实状态兜底，取消/失败不会被标为成功。
        let completion = block2::RcBlock::new(move |error: *mut NSError| {
            let raw = unsafe {
                error.as_ref().map(|err| RawAdjudicationError {
                    domain: err.domain().to_string(),
                    code: err.code() as i64,
                    description: err.localizedDescription().to_string(),
                })
            };
            let _ = tx.blocking_send(settle_default_app_adjudication(raw));
        });
        workspace.setDefaultApplicationAtURL_toOpenContentTypeOfFileAtURL_completionHandler(
            &app_url,
            &probe_url,
            Some(&completion),
        );
    });
    if dispatch_result.is_err() {
        return Err(AppError::InternalError);
    }
    // 系统确认对话框可能长时间停留；不设短超时，用户裁决后回调必然到达，
    // 进程退出（用户放弃设置关窗）由前端 invoke 的生命周期兜底。
    rx.recv().await.unwrap_or(Err(AppError::InternalError))
}

/// 逐扩展名查询默认 handler 是否为 NUTBOOK 自身。任何单点失败 → `None`。
#[cfg(target_os = "macos")]
fn query_extension_handlers(
    app: &tauri::AppHandle,
    extensions: &[&str],
) -> Result<Vec<Option<bool>>, AppError> {
    use objc2_app_kit::NSWorkspace;
    use objc2_foundation::{NSBundle, NSURL};
    use std::sync::mpsc;

    let extensions: Vec<String> = extensions.iter().map(|value| value.to_string()).collect();
    let (tx, rx) = mpsc::channel::<Vec<Option<bool>>>();
    let dispatch_result = app.run_on_main_thread(move || {
        let workspace = NSWorkspace::sharedWorkspace();
        let current_bundle_id = NSBundle::mainBundle()
            .bundleIdentifier()
            .map(|value| value.to_string());
        let mut results = Vec::with_capacity(extensions.len());
        for extension in &extensions {
            // 检查文件只需要扩展名参与 Launch Services 解析；确保存在以获得
            // 稳定的 handler 查询行为。
            if !ensure_check_file(extension) {
                results.push(None);
                continue;
            }
            let Some(path) = check_file_path(extension) else {
                results.push(None);
                continue;
            };
            let url = NSURL::fileURLWithPath(&objc2_foundation::NSString::from_str(
                path.to_string_lossy().as_ref(),
            ));
            let handler = workspace.URLForApplicationToOpenURL(&url);
            let is_self = handler.and_then(|handler_url| {
                NSBundle::bundleWithURL(&handler_url)
                    .and_then(|bundle| bundle.bundleIdentifier())
                    .map(|bundle_id| Some(bundle_id.to_string()) == current_bundle_id.clone())
            });
            results.push(match is_self {
                Some(value) => Some(value),
                // 系统 handler 缺失（如 html 组无默认应用）→ 无法确认该扩展名。
                None => None,
            });
        }
        let _ = tx.send(results);
    });
    if dispatch_result.is_err() {
        return Err(AppError::InternalError);
    }
    rx.recv().map_err(|_| AppError::InternalError)
}

// AppKit 的 content-type setter 对 public.html 会污染全局网页 handler。这里
// 使用 LaunchServices 的 Viewer role，让 Finder 的 HTML 打开方式与浏览器的
// http / https URL scheme handler 保持分离。
#[cfg(target_os = "macos")]
const LS_ROLES_VIEWER: u32 = 0x0000_0002;

#[cfg(target_os = "macos")]
#[link(name = "CoreServices", kind = "framework")]
unsafe extern "C" {
    fn LSSetDefaultRoleHandlerForContentType(
        in_content_type: core_foundation::string::CFStringRef,
        in_role: u32,
        in_handler_bundle_id: core_foundation::string::CFStringRef,
    ) -> i32;
    fn LSCopyDefaultRoleHandlerForContentType(
        in_content_type: core_foundation::string::CFStringRef,
        in_role: u32,
    ) -> core_foundation::string::CFStringRef;
}

#[cfg(target_os = "macos")]
fn set_default_html_viewer_handler() -> Result<(), AppError> {
    use core_foundation::{base::TCFType, string::CFString};

    let content_type = CFString::new("public.html");
    let bundle_id = CFString::new("com.hayley.nutbook");
    let status = unsafe {
        LSSetDefaultRoleHandlerForContentType(
            content_type.as_concrete_TypeRef(),
            LS_ROLES_VIEWER,
            bundle_id.as_concrete_TypeRef(),
        )
    };
    if status == 0 {
        Ok(())
    } else {
        Err(AppError::DefaultAppActionFailed(format!(
            "LaunchServices viewer role error {status}"
        )))
    }
}

#[cfg(target_os = "macos")]
fn query_html_viewer_handler() -> Result<DefaultAppGroupStatus, AppError> {
    use core_foundation::{base::TCFType, string::CFString};

    let content_type = CFString::new("public.html");
    let handler = unsafe {
        LSCopyDefaultRoleHandlerForContentType(
            content_type.as_concrete_TypeRef(),
            LS_ROLES_VIEWER,
        )
    };
    if handler.is_null() {
        return Ok(DefaultAppGroupStatus::Unknown);
    }
    let handler = unsafe { CFString::wrap_under_create_rule(handler) };
    Ok(if handler.to_string() == "com.hayley.nutbook" {
        DefaultAppGroupStatus::Default
    } else {
        DefaultAppGroupStatus::NotDefault
    })
}

/// 在 app-owned data 目录内准备零字节检查文件（不入库、不记最近）。
#[cfg(target_os = "macos")]
fn check_file_path(extension: &str) -> Option<std::path::PathBuf> {
    let home = std::env::var_os("HOME")?;
    Some(
        std::path::PathBuf::from(home)
            .join("Library/Application Support/com.hayley.nutbook")
            .join(CHECK_FILE_DIR)
            .join(format!("nutbook-default-check.{extension}")),
    )
}

#[cfg(target_os = "macos")]
fn ensure_check_file(extension: &str) -> bool {
    let Some(path) = check_file_path(extension) else {
        return false;
    };
    if path.exists() {
        return true;
    }
    if let Some(parent) = path.parent() {
        if std::fs::create_dir_all(parent).is_err() {
            return false;
        }
    }
    std::fs::write(&path, b"").is_ok()
}

#[cfg(test)]
mod default_app_status_tests {
    use super::{aggregate_group_status, DefaultAppGroupStatus};

    #[test]
    fn group_status_aggregates_per_extension_results() {
        // 全部默认
        assert_eq!(
            aggregate_group_status(&[Some(true), Some(true)]),
            DefaultAppGroupStatus::Default
        );
        // 全部未默认（查询成功）
        assert_eq!(
            aggregate_group_status(&[Some(false), Some(false)]),
            DefaultAppGroupStatus::NotDefault
        );
        // 同组不一致 → 部分已设为默认（.md 默认、.markdown 未默认）
        assert_eq!(
            aggregate_group_status(&[Some(true), Some(false)]),
            DefaultAppGroupStatus::Partial
        );
        assert_eq!(
            aggregate_group_status(&[Some(false), Some(true)]),
            DefaultAppGroupStatus::Partial
        );
        // 任一查询失败 → 无法确认，不得猜测
        assert_eq!(
            aggregate_group_status(&[Some(true), None]),
            DefaultAppGroupStatus::Unknown
        );
        assert_eq!(
            aggregate_group_status(&[None]),
            DefaultAppGroupStatus::Unknown
        );
        assert_eq!(
            aggregate_group_status(&[]),
            DefaultAppGroupStatus::Unknown
        );
    }
}

#[cfg(test)]
mod default_app_mutation_tests {
    use super::default_app_mutation_allowed;

    #[cfg(debug_assertions)]
    #[test]
    fn development_builds_cannot_mutate_default_handlers() {
        assert!(!default_app_mutation_allowed());
    }

    #[cfg(not(debug_assertions))]
    #[test]
    fn release_builds_can_mutate_default_handlers() {
        assert!(default_app_mutation_allowed());
    }
}

// Codex R4：延迟回调 / 取消 / 失败的行为测试（非源码字符串断言）。
#[cfg(all(test, target_os = "macos"))]
mod default_app_set_tests {
    use super::{default_app_probe_extension_for_kind, settle_default_app_adjudication, RawAdjudicationError};
    use crate::errors::AppError;

    fn raw(domain: &str, code: i64) -> RawAdjudicationError {
        RawAdjudicationError {
            domain: domain.to_string(),
            code,
            description: "adjudication-error".to_string(),
        }
    }

    #[test]
    fn kind_maps_to_a_real_file_probe_per_group() {
        // HTML 走 LaunchServices Viewer role，不能走会污染网页协议的 AppKit
        // content-type setter。
        assert_eq!(
            default_app_probe_extension_for_kind("markdown"),
            Some("md")
        );
        assert_eq!(
            default_app_probe_extension_for_kind("html"),
            None
        );
    }

    #[test]
    fn unknown_kind_never_falls_back_to_a_group() {
        // 未知 kind 必须为 None（命令层转 InvalidParams），不得静默落到
        // Markdown 或 HTML，否则错误调用会改掉用户没指定的格式关联。
        for kind in ["", "Markdown", "HTML", "md", "pdf", "../html"] {
            assert_eq!(
                default_app_probe_extension_for_kind(kind),
                None,
                "kind {kind:?} must not resolve to a UTI"
            );
        }
    }

    #[test]
    fn success_and_user_cancel_are_distinguished() {
        // error nil → 成功
        assert!(settle_default_app_adjudication(None).is_ok());
        // 用户取消（Apple NSUserCancelledError）→ 中性取消，不当系统故障
        assert!(matches!(
            settle_default_app_adjudication(Some(raw("NSCocoaErrorDomain", 3072))),
            Err(AppError::DefaultAppActionCancelled)
        ));
    }

    #[test]
    fn genuine_failures_carry_domain_and_code_evidence() {
        let failed = settle_default_app_adjudication(Some(raw("NSOSStatusErrorDomain", -54)));
        match failed {
            Err(AppError::DefaultAppActionFailed(message)) => {
                assert!(message.contains("NSOSStatusErrorDomain"));
                assert!(message.contains("-54"));
            }
            other => panic!("expected DefaultAppActionFailed, got {other:?}"),
        }
        // 取消码但 domain 不符 → 仍按失败处理，证据不丢失
        let mismatch = settle_default_app_adjudication(Some(raw("OtherDomain", 3072)));
        assert!(matches!(
            mismatch,
            Err(AppError::DefaultAppActionFailed(_))
        ));
    }

    #[test]
    fn delayed_completion_is_awaited_via_channel_not_polled() {
        // 行为测试：completion 延迟到达时，等待方经通道挂起直至结果送达；
        // 产品实现中该等待位于 async 命令的 runtime 线程（主线程只发起）。
        tauri::async_runtime::block_on(async {
            let (tx, mut rx) = tauri::async_runtime::channel(1);
            let sender = std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(60));
                let _ = tx
                    .blocking_send(settle_default_app_adjudication(Some(raw(
                        "NSCocoaErrorDomain",
                        3072,
                    ))));
            });
            let started = std::time::Instant::now();
            let received = rx.recv().await.expect("completion result must arrive");
            assert!(started.elapsed() >= std::time::Duration::from_millis(50));
            assert!(matches!(
                received,
                Err(AppError::DefaultAppActionCancelled)
            ));
            sender.join().expect("sender thread must finish");
        });
    }
}
