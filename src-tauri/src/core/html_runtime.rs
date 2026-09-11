use crate::{
    core::content_session::RuntimeKey,
    errors::AppError,
    models::{
        HtmlEditToolbarFormatState, HtmlRuntimeSessionPayload, ItemDetail, ItemSourceBadge,
        RuntimeHostBounds, Tag,
    },
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::HashMap,
    fs::OpenOptions,
    io::Write,
    path::PathBuf,
    sync::{atomic::{AtomicI64, Ordering}, Mutex, OnceLock},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{
    webview::{NewWindowResponse, WebviewBuilder},
    Manager,
};

#[cfg(target_os = "macos")]
use block2::RcBlock;
#[cfg(target_os = "macos")]
use objc2_app_kit::{NSResponder, NSWindow, NSWindowDidEnterFullScreenNotification, NSWindowDidExitFullScreenNotification};
#[cfg(target_os = "macos")]
use objc2_foundation::{NSNotification, NSNotificationCenter};
#[cfg(target_os = "macos")]
use objc2_web_kit::WKWebView;

const HTML_FULLSCREEN_TITLE_PREFIX: &str = "__NUTBOOK_TOGGLE_FULLSCREEN__:";
const HTML_CONTROLS_ACTION_PREFIX: &str = "__NUTBOOK_HTML_CONTROLS__:";
const HTML_FIND_ACTION_PREFIX: &str = "__NUTBOOK_HTML_FIND__:";
const HTML_FIND_RESULT_PREFIX: &str = "__NUTBOOK_HTML_FIND_RESULT__:";
const HTML_FIND_SHORTCUT_PREFIX: &str = "__NUTBOOK_HTML_FIND_SHORTCUT__:";
const HTML_EDIT_RUNTIME_ACTION_PREFIX: &str = "__NUTBOOK_HTML_EDIT_RUNTIME__:";
const HTML_RUNTIME_VIEW_STATE_PREFIX: &str = "__NUTBOOK_HTML_RUNTIME_VIEW_STATE__:";
const HTML_EDIT_TOOLBAR_ACTION_PREFIX: &str = "__NUTBOOK_HTML_EDIT_TOOLBAR__:";
const HTML_EDIT_TOOLBAR_DIAGNOSTIC_PREFIX: &str = "__NUTBOOK_HTML_EDIT_TOOLBAR_DIAGNOSTIC__:";
const HTML_EDIT_LEAVE_ACTION_PREFIX: &str = "__NUTBOOK_HTML_EDIT_LEAVE__:";
const HTML_EDIT_LEAVE_READY_PREFIX: &str = "__NUTBOOK_HTML_EDIT_LEAVE_READY__:";
const SETTINGS_OVERLAY_ACTION_PREFIX: &str = "__NUTBOOK_SETTINGS_OVERLAY__:";
const INSPECTOR_MORE_OVERLAY_ACTION_PREFIX: &str = "__NUTBOOK_INSPECTOR_MORE_OVERLAY__:";
const HTML_EDIT_DEBUG_LOG_PATH: &str = "/tmp/nutbook-html-edit-debug.log";
static PRESENTATION_PREVIEW_INSTANCES: OnceLock<Mutex<HashMap<i64, String>>> = OnceLock::new();
#[cfg(target_os = "macos")]
static HTML_FULLSCREEN_FOCUS_ITEM_ID: AtomicI64 = AtomicI64::new(0);
#[cfg(target_os = "macos")]
static HTML_FULLSCREEN_FOCUS_OBSERVER: OnceLock<()> = OnceLock::new();

fn presentation_preview_instances() -> &'static Mutex<HashMap<i64, String>> {
    PRESENTATION_PREVIEW_INSTANCES.get_or_init(|| Mutex::new(HashMap::new()))
}

fn presentation_preview_instance_matches(item_id: i64, instance_id: &str) -> bool {
    presentation_preview_instances().lock().ok().and_then(|instances| instances.get(&item_id).cloned()).as_deref() == Some(instance_id)
}

/// Temporary Phase 1 format-action diagnostic. This stays at the host boundary so it
/// remains readable when a child runtime webview covers the main UI.
pub fn log_html_edit_debug(event: &str, details: impl AsRef<str>) {
    let timestamp_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default();
    let details = details.as_ref().replace(['\n', '\r'], " ");
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(HTML_EDIT_DEBUG_LOG_PATH)
    {
        let _ = writeln!(file, "ts_ms={timestamp_ms} event={event} {details}");
    }
}

pub fn html_edit_debug_payload_fields(payload: &Value) -> String {
    let field = |name: &str| {
        payload
            .get(name)
            .and_then(Value::as_str)
            .map(str::to_owned)
            .or_else(|| payload.get(name).and_then(Value::as_i64).map(|value| value.to_string()))
            .or_else(|| payload.get(name).and_then(Value::as_u64).map(|value| value.to_string()))
            .or_else(|| payload.get(name).and_then(Value::as_bool).map(|value| value.to_string()))
            .unwrap_or_else(|| "-".to_string())
    };
    let format_state = payload.get("formatState").unwrap_or(&Value::Null);
    let format_field = |name: &str| {
        format_state
            .get(name)
            .and_then(Value::as_str)
            .map(str::to_owned)
            .or_else(|| format_state.get(name).and_then(Value::as_bool).map(|value| value.to_string()))
            .unwrap_or_else(|| "-".to_string())
    };
    format!(
        "item={} source_item={} event={} action={} type={} session={} generation={} active_tab={} has_tab={} file_type={} command={} applied={} dirty={} revision={} history_cursor={} saved_history_cursor={} history_length={} change_ids={} inserted_ids={} inserted_baseline_ids={} selected_data_id={} format_edit_role={} format_can_format={} format_toolbar_visible={} visible_format_commands={} enabled_format_commands={}",
        field("itemId"),
        field("sourceItemId"),
        field("event"),
        field("action"),
        field("type"),
        field("runtimeSessionId"),
        field("generation"),
        field("activeTabId"),
        field("hasTab"),
        field("fileType"),
        field("command"),
        field("applied"),
        field("dirty"),
        field("documentRevision"),
        field("historyCursor"),
        field("savedHistoryCursor"),
        field("historyLength"),
        field("changeIds"),
        field("insertedIds"),
        field("insertedBaselineIds"),
        field("selectedDataId"),
        format_field("editRole"),
        format_field("canFormat"),
        field("formatToolbarVisible"),
        payload
            .get("visibleFormatCommands")
            .map(Value::to_string)
            .unwrap_or_else(|| "-".to_string()),
        payload
            .get("enabledFormatCommands")
            .map(Value::to_string)
            .unwrap_or_else(|| "-".to_string())
    )
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct HtmlControlsActionPayload {
    item_id: i64,
    action: String,
    tag_id: Option<i64>,
    name: Option<String>,
    expanded: Option<bool>,
    layout_mode: Option<String>,
    text: Option<String>,
    x: Option<f64>,
    y: Option<f64>,
    width: Option<f64>,
    height: Option<f64>,
    seq: Option<u64>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct HtmlFindActionPayload {
    /// revision 83（P2-R80b）：身份既可能是正式 item 的数字，也可能是外部临时
    /// host 的字符串 `external:<sessionId>`（`RuntimeKey` 两域）。
    ///
    /// 旧实现定死 `i64`：外部 overlay 的**全部**动作（query/next/prev/close）
    /// 都会在标题桥反序列化处失败，而该分支是 `if let Ok(..)` 且没有 else
    /// 兜底 —— 失败即静默丢弃，main 侧永远收不到动作，正文查找恒 0/0。
    /// 权威比较仍在 main 侧（`tab.id === payload.itemId` +
    /// `appState.htmlFind.itemId === payload.itemId`），本结构只承载原样转发。
    item_id: serde_json::Value,
    action: String,
    query: String,
    replacement: String,
    case_sensitive: bool,
    replace_expanded: bool,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct InspectorMoreOverlayActionPayload {
    item_id: i64,
    selection_token: u64,
    action: String,
    delta_y: Option<f64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HtmlRuntimeSession {
    /// P2（Codex revision 32「有界 A」）：资源身份。`Item` = 正式资料库条目；
    /// `External` = 外部临时会话（加入前没有 itemId）。承载层（webview label、
    /// 会话登记、桥裁决）统一以它为键；正式 item 命令的对外签名保持不变。
    pub key: RuntimeKey,
    /// 独立 runtime 窗口 label（`html-player-{seg}`）。
    pub label: String,
    pub title: String,
    pub runtime_url: String,
    /// 会话代次：正式 item 会话为 0（沿用 P1 行为）；外部会话为 external
    /// 会话的 generation，用于桥与身份校验。
    pub generation: u64,
}

impl HtmlRuntimeSession {
    pub fn from_item(item: &ItemDetail, runtime_url: String) -> Result<Self, AppError> {
        if item.summary.file_type != "html" {
            return Err(AppError::UnsupportedFileType);
        }

        Ok(Self {
            key: RuntimeKey::Item(item.summary.id),
            label: html_runtime_window_label(item.summary.id),
            title: item.summary.file_name.clone(),
            runtime_url,
            generation: 0,
        })
    }

    /// P2：外部临时会话的内嵌 host 会话。`session_id` / `generation` 必须来自
    /// 后端有效会话登记（由调用方校验），**不接受**前端或内容页面自报。
    pub fn from_external(
        session_id: &str,
        generation: u64,
        title: String,
        runtime_url: String,
    ) -> Self {
        let key = RuntimeKey::External(session_id.to_string());
        Self {
            label: html_runtime_host_label_for(&key),
            key,
            title,
            runtime_url,
            generation,
        }
    }

    /// 正式 item 会话的 DTO。外部会话没有 itemId —— 这里**不**伪造 `0` 哨兵，
    /// 拿不到 item 身份即报错（外部会话走独立载荷）。
    pub fn to_payload(&self, detached: bool) -> Result<HtmlRuntimeSessionPayload, AppError> {
        Ok(HtmlRuntimeSessionPayload {
            item_id: self.key.item_id().ok_or(AppError::InvalidParams)?,
            label: self.label.clone(),
            title: self.title.clone(),
            runtime_url: self.runtime_url.clone(),
            detached,
        })
    }
}

pub fn open_html_runtime_window(
    app: &tauri::AppHandle,
    session: &HtmlRuntimeSession,
) -> Result<bool, AppError> {
    if let Some(window) = app.get_webview_window(&session.label) {
        let _ = window.set_focus();
        let _ = window.eval(&format!(
            "window.location.replace({:?});",
            session.runtime_url
        ));
        return Ok(true);
    }

    build_detached_runtime_window(app, session)?;

    Ok(true)
}

/// R9/R11：宿主创建内容 webview 后登记会话身份（role / item / origin /
/// session / generation）。登记失败不影响创建（fail-open 于登记、fail-closed
/// 于校验：无登记的内容面后续 invoke/标题桥会被拒绝）。
fn register_content_session<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    label: &str,
    role: crate::core::content_session::ContentSurfaceRole,
    key: RuntimeKey,
    runtime_url: &str,
    runtime_session_id: &str,
    generation: u64,
    view_state_surface_token: u64,
) {
    let Some(state) = app.try_state::<crate::state::AppState>() else {
        return;
    };
    let origin = crate::core::content_session::origin_of_url(runtime_url).unwrap_or_default();
    let _ = state.content_sessions.register(
        label,
        crate::core::content_session::ContentSessionRecord {
            role,
            key,
            origin,
            runtime_session_id: runtime_session_id.to_string(),
            generation,
            view_state_surface_token,
        },
    );
}

pub fn close_html_runtime_window(
    app: &tauri::AppHandle,
    item_id: i64,
) -> Result<bool, AppError> {
    let mut closed = false;

    // PR C Phase 1（D1 合同撤销时机 + R11）：关闭标签即撤销该 item 的全部
    // scoped 内容能力（host / player / presentation / preview 资源）并注销
    // 会话登记。普通切 tab 只隐藏/销毁 surface，不走本路径，不撤销活 tab。
    if let Some(state) = app.try_state::<crate::state::AppState>() {
        for key in [
            format!("html-runtime:{item_id}:host"),
            format!("html-runtime:{item_id}:player"),
            format!("html-runtime:{item_id}:presentation"),
            format!("preview:{item_id}"),
        ] {
            state.drop_scoped_server(&key);
        }
        state.content_sessions.unregister(html_runtime_window_label(item_id).as_str());
        state
            .content_sessions
            .unregister(html_runtime_host_label(item_id).as_str());
        state
            .content_sessions
            .unregister(html_presentation_preview_label(item_id).as_str());
        state.content_sessions.unregister_item(item_id);
    }

    if let Some(main_webview) = app.get_webview("main") {
        recover_main_webview_focus(&main_webview);
    }

    let label = html_runtime_window_label(item_id);
    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.set_fullscreen(false);
        window.close().map_err(|_| AppError::InternalError)?;
        closed = true;
    }

    let host_label = html_runtime_host_label(item_id);
    if let Some(webview) = app.get_webview(&host_label) {
        let _ = webview.set_bounds(runtime_host_rect(RuntimeHostBounds {
            x: 0.0,
            y: 0.0,
            width: 1.0,
            height: 1.0,
        }));
        let _ = webview.hide();
        webview.close().map_err(|_| AppError::InternalError)?;
        closed = true;
    }

    let presentation_preview_label = html_presentation_preview_label(item_id);
    if let Some(webview) = app.get_webview(&presentation_preview_label) {
        let _ = webview.set_bounds(runtime_host_rect(RuntimeHostBounds {
            x: 0.0,
            y: 0.0,
            width: 1.0,
            height: 1.0,
        }));
        let _ = webview.hide();
        webview.close().map_err(|_| AppError::InternalError)?;
        closed = true;
    }

    // A stale find surface may still exist if its close action raced with tab
    // teardown. Close it with the owning tab as a final lifecycle guard.
    let find_overlay_label = html_find_overlay_label(item_id);
    if let Some(webview) = app.get_webview(&find_overlay_label) {
        let _ = webview.set_bounds(runtime_host_rect(RuntimeHostBounds {
            x: 0.0,
            y: 0.0,
            width: 1.0,
            height: 1.0,
        }));
        let _ = webview.hide();
        webview.close().map_err(|_| AppError::InternalError)?;
        closed = true;
    }
    let controls_label = html_runtime_controls_label(item_id);
    if let Some(webview) = app.get_webview(&controls_label) {
        let _ = webview.eval("window.__NUTBOOK_RESET_TRANSIENT_STATE__?.();");
        let _ = webview.hide();
        webview.close().map_err(|_| AppError::InternalError)?;
        closed = true;
    }

    if close_html_edit_toolbar_overlay(app, item_id)? {
        closed = true;
    }
    if close_html_edit_leave_confirm_overlay(app, item_id)? {
        closed = true;
    }
    Ok(closed)
}

pub fn attach_html_runtime_host(
    app: &tauri::AppHandle,
    window: &tauri::Window,
    session: &HtmlRuntimeSession,
    bounds: RuntimeHostBounds,
    view_state_surface_token: u64,
    view_state: Option<Value>,
) -> Result<bool, AppError> {
    let host_label = html_runtime_host_label_for(&session.key);
    if let Some(webview) = app.get_webview(&host_label) {
        webview
            .set_bounds(runtime_host_rect(bounds))
            .map_err(|_| AppError::InternalError)?;
        let _ = webview.show();
        return Ok(true);
    }

    let builder = build_runtime_webview_builder(
        app,
        &host_label,
        session,
        view_state_surface_token,
        view_state.as_ref(),
    )?;
    let webview = window
        .add_child(
            builder,
            tauri::LogicalPosition::new(bounds.x, bounds.y),
            tauri::LogicalSize::new(bounds.width, bounds.height),
        )
        .map_err(|_| AppError::InternalError)?;
    webview
        .set_bounds(runtime_host_rect(bounds))
        .map_err(|_| AppError::InternalError)?;

    // R9：登记内嵌 host 会话身份。
    register_content_session(
        app,
        &host_label,
        crate::core::content_session::ContentSurfaceRole::RuntimeHost,
        session.key.clone(),
        &session.runtime_url,
        "",
        0,
        view_state_surface_token,
    );

    Ok(true)
}

/// P2（Codex revision 32「有界 A」细线）：外部阅读态内嵌 host。
///
/// 与正式 item host **共用同一承载层**（同 `WebviewBuilder` 形态、同
/// compatibility 脚本、同 `on_new_window` / 标题处理器、同一登记表与桥裁决），
/// 差异只有三处，且都由外部身份决定：
/// - label 由 `RuntimeKey::External` 派生（`html-host-ext-<uuid>`）；
/// - 登记角色 `ExternalHost`：桥消息类型一律拒绝，因此外部内容面拿不到任何
///   编辑 / conversion / sidecar / editable-copy / commit 能力（加入本身不
///   升级权限）；
/// - 不注入常驻 view-state 脚本（surface token 恒 0）。位置保留改为**一次性
///   回放**：切走前由 `capture_external_html_view_state_command` 抓一份快照，
///   再次激活建 child 时经 `external_view_state_restore_script` 注入（P2-R92a，
///   与 promotion 共用同一状态模型）。
///
/// `view_state` 只在**建 child 时**有意义（已存在的 surface 走 bounds-only
/// 早退分支，忽略该参数）：surface 一旦存在，其位置由页面自身维持。
pub fn attach_external_html_runtime_host(
    app: &tauri::AppHandle,
    window: &tauri::Window,
    session: &HtmlRuntimeSession,
    bounds: RuntimeHostBounds,
    view_state: Option<Value>,
) -> Result<bool, AppError> {
    let host_label = html_runtime_host_label_for(&session.key);
    if let Some(webview) = app.get_webview(&host_label) {
        webview
            .set_bounds(runtime_host_rect(bounds))
            .map_err(|_| AppError::InternalError)?;
        let _ = webview.show();
        return Ok(true);
    }

    let builder =
        build_external_runtime_webview_builder(app, &host_label, session, view_state.as_ref())?;
    let webview = window
        .add_child(
            builder,
            tauri::LogicalPosition::new(bounds.x, bounds.y),
            tauri::LogicalSize::new(bounds.width, bounds.height),
        )
        .map_err(|_| AppError::InternalError)?;
    webview
        .set_bounds(runtime_host_rect(bounds))
        .map_err(|_| AppError::InternalError)?;

    // P2：登记外部阅读态会话身份。generation 为 external 会话代次（宿主注入），
    // surface token 恒 0（未注入 view-state 脚本）。
    register_content_session(
        app,
        &host_label,
        crate::core::content_session::ContentSurfaceRole::ExternalHost,
        session.key.clone(),
        &session.runtime_url,
        "",
        session.generation,
        0,
    );

    Ok(true)
}

pub fn set_html_runtime_host_visibility(
    app: &tauri::AppHandle,
    item_id: i64,
    visible: bool,
) -> Result<bool, AppError> {
    set_runtime_host_visibility_for(app, &RuntimeKey::Item(item_id), visible)
}

/// P2：外部阅读态 host 的显示 / 隐藏。与 item host 完全同一生命周期语义
/// （隐藏即 1x1 + close + 注销登记；再次激活时按新 surface 重新挂载）。
pub fn set_external_html_runtime_host_visibility(
    app: &tauri::AppHandle,
    session_id: &str,
    visible: bool,
) -> Result<bool, AppError> {
    set_runtime_host_visibility_for(
        app,
        &RuntimeKey::External(session_id.to_string()),
        visible,
    )
}

fn set_runtime_host_visibility_for(
    app: &tauri::AppHandle,
    key: &RuntimeKey,
    visible: bool,
) -> Result<bool, AppError> {
    let label = html_runtime_host_label_for(key);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };

    if visible {
        webview.show().map_err(|_| AppError::InternalError)?;
    } else {
        let _ = webview.set_bounds(runtime_host_rect(RuntimeHostBounds {
            x: 0.0,
            y: 0.0,
            width: 1.0,
            height: 1.0,
        }));
        let _ = webview.hide();
        // Inactive document hosts cannot remain registered as hidden child
        // WebViews: opening four or more HTML tabs reproducibly poisons the
        // window compositor and spreads black backing to hosts and controls.
        webview.close().map_err(|_| AppError::InternalError)?;
        // R9：surface 销毁即注销其会话登记（活 tab 的 scoped capability
        // 保留至 close 标签，符合 Codex 撤销时机合同）。
        if let Some(state) = app.try_state::<crate::state::AppState>() {
            state.content_sessions.unregister(&label);
        }
    }

    Ok(true)
}

/// P2：关闭外部临时会话的内嵌 host，并**撤销**其全部 scoped 内容能力。
///
/// 调用时机（计划 §6.3）：关闭标签 / 替换 session / 来源失效 / promotion
/// 完成旧 host teardown。普通切 tab 不走本路径（只 hide/close surface，
/// 不撤销 capability）。
///
/// 顺序（P2-R1，Codex revision 45）：**先完整 teardown（1x1 → hide → close），
/// 成功后才撤销 capability**。close 失败时 capability 保持原样——旧 host 仍
/// 可用、前端可整体重试拆除；若先撤销再 close，失败会把旧 host 留在「能力已
/// 失、进程尚在」的半关闭态，无法恢复也不可重试。
pub fn close_external_html_runtime_host(
    app: &tauri::AppHandle,
    session_id: &str,
) -> Result<bool, AppError> {
    let key = RuntimeKey::External(session_id.to_string());
    let label = html_runtime_host_label_for(&key);
    let mut closed = false;

    if let Some(webview) = app.get_webview(&label) {
        let _ = webview.set_bounds(runtime_host_rect(RuntimeHostBounds {
            x: 0.0,
            y: 0.0,
            width: 1.0,
            height: 1.0,
        }));
        let _ = webview.hide();
        webview.close().map_err(|_| AppError::InternalError)?;
        closed = true;
    }

    // 旧 surface 已确认销毁，现在撤销 capability：晚到的请求只会拿到墓碑响应，
    // 晚到的桥消息因登记已注销而被拒；重试也不会重新建立旧能力。
    // revision 71：与正式 item 关闭路径同一最终护栏——遗留 find surface 若
    // close action 与拆除竞争，随本会话一并 1x1 → hide → close 收敛。
    let find_overlay_label = html_find_overlay_label_for(&key);
    if let Some(webview) = app.get_webview(&find_overlay_label) {
        let _ = webview.set_bounds(runtime_host_rect(RuntimeHostBounds {
            x: 0.0,
            y: 0.0,
            width: 1.0,
            height: 1.0,
        }));
        let _ = webview.hide();
        webview.close().map_err(|_| AppError::InternalError)?;
        closed = true;
    }

    if let Some(state) = app.try_state::<crate::state::AppState>() {
        state.revoke_external_content_capabilities(session_id);
    }

    if let Some(main_webview) = app.get_webview("main") {
        recover_main_webview_focus(&main_webview);
    }

    Ok(closed)
}

/// The presentation rail has its own read-only child WebView.  It intentionally
/// stays separate from the editable runtime: hiding it never reloads or changes
/// the document being edited on the right.
pub fn set_html_presentation_preview_visibility(
    app: &tauri::AppHandle,
    item_id: i64,
    preview_instance_id: &str,
    visible: bool,
) -> Result<bool, AppError> {
    if !presentation_preview_instance_matches(item_id, preview_instance_id) { return Ok(false); }
    let label = html_presentation_preview_label(item_id);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };

    if visible {
        webview.show().map_err(|_| AppError::InternalError)?;
    } else {
        let _ = webview.set_bounds(runtime_host_rect(RuntimeHostBounds {
            x: 0.0,
            y: 0.0,
            width: 1.0,
            height: 1.0,
        }));
        webview.hide().map_err(|_| AppError::InternalError)?;
    }
    Ok(true)
}

pub fn close_html_presentation_preview(
    app: &tauri::AppHandle,
    item_id: i64,
    preview_instance_id: &str,
) -> Result<bool, AppError> {
    if !presentation_preview_instance_matches(item_id, preview_instance_id) { return Ok(false); }
    let label = html_presentation_preview_label(item_id);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };
    let _ = webview.set_bounds(runtime_host_rect(RuntimeHostBounds {
        x: 0.0,
        y: 0.0,
        width: 1.0,
        height: 1.0,
    }));
    let _ = webview.hide();
    webview.close().map_err(|_| AppError::InternalError)?;
    // R9：演示预览销毁即注销会话登记。
    if let Some(state) = app.try_state::<crate::state::AppState>() {
        state.content_sessions.unregister(&label);
    }
    if let Ok(mut instances) = presentation_preview_instances().lock() { instances.remove(&item_id); }
    Ok(true)
}

pub fn set_html_presentation_preview_active(
    app: &tauri::AppHandle,
    item_id: i64,
    preview_instance_id: &str,
    page_id: &str,
    follow: bool,
    focus: bool,
) -> Result<bool, AppError> {
    if !presentation_preview_instance_matches(item_id, preview_instance_id) { return Ok(false); }
    let Some(webview) = app.get_webview(&html_presentation_preview_label(item_id)) else { return Ok(false); };
    webview.eval(&format!("window.__NUTBOOK_PRESENTATION_PREVIEW__?.select?.({page_id:?}, {follow});"))
        .map_err(|_| AppError::InternalError)?;
    if focus {
        webview.set_focus().map_err(|_| AppError::InternalError)?;
    }
    Ok(true)
}

pub fn attach_html_presentation_preview(
    app: &tauri::AppHandle,
    window: &tauri::Window,
    session: &HtmlRuntimeSession,
    bounds: RuntimeHostBounds,
    runtime_session_id: &str,
    generation: u64,
    active_page_id: &str,
    preview_instance_id: &str,
) -> Result<bool, AppError> {
    if preview_instance_id.is_empty() { return Err(AppError::InvalidParams); }
    // 演示预览是正式 item 专属能力（外部阅读态细线不提供）；无 item 身份
    // 即拒绝，而不是伪造一个 itemId。
    let item_id = session.key.item_id().ok_or(AppError::InvalidParams)?;
    let label = html_presentation_preview_label(item_id);
    presentation_preview_instances()
        .lock()
        .map_err(|_| AppError::InternalError)?
        .insert(item_id, preview_instance_id.to_string());
    if let Some(webview) = app.get_webview(&label) {
        webview
            .set_bounds(runtime_host_rect(bounds))
            .map_err(|_| AppError::InternalError)?;
        // Refresh the message lease when this child WebView is reused by a new
        // editor session; source markup itself remains loaded and read-only.
        let update_script = presentation_preview_update_script(
            runtime_session_id,
            generation,
            active_page_id,
            preview_instance_id,
        );
        webview.eval(&update_script).map_err(|_| AppError::InternalError)?;
        // R9：复用 surface 换代时同步登记新会话身份。演示预览未注入
        // view-state 脚本，surface token 恒为 0（view-state 回报一律拒绝）。
        register_content_session(
            app,
            &label,
            crate::core::content_session::ContentSurfaceRole::PresentationPreview,
            session.key.clone(),
            &session.runtime_url,
            runtime_session_id,
            generation,
            0,
        );
        return Ok(true);
    }

    let builder = build_presentation_preview_webview_builder(
        app,
        &label,
        session,
        runtime_session_id,
        generation,
        active_page_id,
        preview_instance_id,
    )?;
    let webview = window
        .add_child(
            builder,
            tauri::LogicalPosition::new(bounds.x, bounds.y),
            tauri::LogicalSize::new(bounds.width, bounds.height),
        )
        .map_err(|_| AppError::InternalError)?;
    webview
        .set_bounds(runtime_host_rect(bounds))
        .map_err(|_| AppError::InternalError)?;
    // R9：登记演示预览会话身份（绑定 runtime_session_id/generation）。
    // 未注入 view-state 脚本，surface token 恒为 0。
    register_content_session(
        app,
        &label,
        crate::core::content_session::ContentSurfaceRole::PresentationPreview,
        session.key.clone(),
        &session.runtime_url,
        runtime_session_id,
        generation,
        0,
    );
    // A child must prove that it mounted usable cards before it covers the
    // structural fallback rail in the main WebView.
    webview.hide().map_err(|_| AppError::InternalError)?;
    Ok(true)
}

pub fn attach_html_runtime_controls_overlay(
    app: &tauri::AppHandle,
    window: &tauri::Window,
    session: &HtmlRuntimeSession,
    bounds: RuntimeHostBounds,
    is_favorite: bool,
    is_fullscreen: bool,
    is_editing: bool,
    is_primary_busy: bool,
    custom_tag: Option<Tag>,
    available_tags: Vec<Tag>,
    skill_tag: Option<String>,
    type_tag: Option<String>,
    custom_tags: Vec<Tag>,
    source_badges: Vec<ItemSourceBadge>,
    file_name: String,
) -> Result<bool, AppError> {
    attach_controls_overlay(
        app,
        window,
        session.key.item_id().ok_or(AppError::InvalidParams)?,
        bounds,
        is_favorite,
        is_fullscreen,
        is_editing,
        is_primary_busy,
        custom_tag,
        available_tags,
        skill_tag,
        type_tag,
        custom_tags,
        source_badges,
        file_name,
    )
}

pub fn attach_controls_overlay(
    app: &tauri::AppHandle,
    window: &tauri::Window,
    item_id: i64,
    bounds: RuntimeHostBounds,
    is_favorite: bool,
    is_fullscreen: bool,
    is_editing: bool,
    is_primary_busy: bool,
    custom_tag: Option<Tag>,
    available_tags: Vec<Tag>,
    skill_tag: Option<String>,
    type_tag: Option<String>,
    custom_tags: Vec<Tag>,
    source_badges: Vec<ItemSourceBadge>,
    file_name: String,
) -> Result<bool, AppError> {
    let overlay_label = html_runtime_controls_label(item_id);
    if let Some(webview) = app.get_webview(&overlay_label) {
        let set_bounds_result = webview.set_bounds(runtime_host_rect(bounds.clone()));
        set_bounds_result.map_err(|_| AppError::InternalError)?;
        let _ = webview.eval(&html_runtime_controls_overlay_update_script(
            item_id,
            is_favorite,
            is_fullscreen,
            is_editing,
            is_primary_busy,
            custom_tag.clone(),
            available_tags.clone(),
            skill_tag.clone(),
            type_tag.clone(),
            custom_tags.clone(),
            source_badges.clone(),
            file_name.clone(),
        ));
        let _ = webview.show();
        return Ok(true);
    }

    let builder = build_runtime_controls_overlay_builder(
        app,
        &overlay_label,
        item_id,
        is_favorite,
        is_fullscreen,
        is_editing,
        is_primary_busy,
        custom_tag,
        available_tags,
        skill_tag,
        type_tag,
        custom_tags,
        source_badges,
        file_name,
    )?;
    let webview = window
        .add_child(
            builder,
            tauri::LogicalPosition::new(bounds.x, bounds.y),
            tauri::LogicalSize::new(bounds.width, bounds.height),
        )
        .map_err(|_| AppError::InternalError)?;
    let set_bounds_result = webview.set_bounds(runtime_host_rect(bounds.clone()));
    set_bounds_result.map_err(|_| AppError::InternalError)?;
    Ok(true)
}

pub fn set_html_runtime_controls_overlay_visibility(
    app: &tauri::AppHandle,
    item_id: i64,
    visible: bool,
) -> Result<bool, AppError> {
    let label = html_runtime_controls_label(item_id);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };

    if visible {
        webview.show().map_err(|_| AppError::InternalError)?;
    } else {
        let _ = webview.eval("window.__NUTBOOK_RESET_TRANSIENT_STATE__?.();");
        let _ = webview.hide();
        webview.close().map_err(|_| AppError::InternalError)?;
    }

    Ok(true)
}

/// Document find has its own small child surface.  The established controls
/// island remains dedicated to tags and document actions.
///
/// revision 71：身份由 `RuntimeKey` 决定（Item / External 共用同一承载）；
/// `identity` 是回传给 main 的查找面板身份（Item = 数字 item id，External =
/// 前端稳定标签身份字符串 `external:<sessionId>`），原样内嵌进 overlay 初始
/// 状态与 action 回报，main 侧只做等值比对。
pub fn attach_html_find_overlay(
    app: &tauri::AppHandle,
    window: &tauri::Window,
    key: &RuntimeKey,
    identity: serde_json::Value,
    bounds: RuntimeHostBounds,
    can_replace: bool,
    replace_expanded: bool,
    query: String,
    count: String,
    case_sensitive: bool,
    labels: std::collections::BTreeMap<String, String>,
    history: Vec<String>,
) -> Result<bool, AppError> {
    let label = html_find_overlay_label_for(key);
    let update = html_find_overlay_init_script(
        identity,
        can_replace,
        replace_expanded,
        &query,
        &count,
        case_sensitive,
        &labels,
        &history,
        true,
    );
    if let Some(webview) = app.get_webview(&label) {
        webview.set_bounds(runtime_host_rect(bounds)).map_err(|_| AppError::InternalError)?;
        let _ = webview.eval(&update);
        webview.show().map_err(|_| AppError::InternalError)?;
        return Ok(true);
    }
    let builder = WebviewBuilder::new(&label, tauri::WebviewUrl::App(PathBuf::from("html-find-overlay.html")))
        .initialization_script(&update)
        .background_color(tauri::webview::Color(0, 0, 0, 0))
        .transparent(true)
        .focused(true)
        .on_document_title_changed(html_find_overlay_action_handler(app));
    let webview = window.add_child(builder, tauri::LogicalPosition::new(bounds.x, bounds.y), tauri::LogicalSize::new(bounds.width, bounds.height)).map_err(|_| AppError::InternalError)?;
    webview.set_bounds(runtime_host_rect(bounds)).map_err(|_| AppError::InternalError)?;
    Ok(true)
}

/// Update only the find panel's document state. Geometry, native visibility,
/// and focus are owned by their separate lifecycle paths.
pub fn update_html_find_overlay(
    app: &tauri::AppHandle,
    key: &RuntimeKey,
    identity: serde_json::Value,
    can_replace: bool,
    replace_expanded: bool,
    query: String,
    count: String,
    case_sensitive: bool,
    labels: std::collections::BTreeMap<String, String>,
    history: Vec<String>,
) -> Result<bool, AppError> {
    let label = html_find_overlay_label_for(key);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };
    webview
        .eval(&html_find_overlay_init_script(
            identity,
            can_replace,
            replace_expanded,
            &query,
            &count,
            case_sensitive,
            &labels,
            &history,
            false,
        ))
        .map_err(|_| AppError::InternalError)?;
    Ok(true)
}

/// Resize an existing find child without replaying update/show/focus. This is
/// deliberately a no-op when the surface has already been closed.
pub fn set_html_find_overlay_bounds(
    app: &tauri::AppHandle,
    key: &RuntimeKey,
    bounds: RuntimeHostBounds,
) -> Result<bool, AppError> {
    let label = html_find_overlay_label_for(key);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };
    webview
        .set_bounds(runtime_host_rect(bounds))
        .map_err(|_| AppError::InternalError)?;
    Ok(true)
}

pub fn set_html_find_overlay_visibility(app: &tauri::AppHandle, key: &RuntimeKey, visible: bool) -> Result<bool, AppError> {
    let label = html_find_overlay_label_for(key);
    let Some(webview) = app.get_webview(&label) else { return Ok(false); };
    if visible {
        webview.show().map_err(|_| AppError::InternalError)?;
    } else {
        let _ = webview.hide();
        webview.close().map_err(|_| AppError::InternalError)?;
    }
    Ok(true)
}

pub fn attach_inspector_more_overlay(
    app: &tauri::AppHandle,
    window: &tauri::Window,
    item_id: i64,
    selection_token: u64,
    bounds: RuntimeHostBounds,
    expanded: bool,
    label: String,
) -> Result<bool, AppError> {
    let overlay_label = inspector_more_overlay_label(item_id);
    if let Some(webview) = app.get_webview(&overlay_label) {
        webview
            .set_bounds(runtime_host_rect(bounds))
            .map_err(|_| AppError::InternalError)?;
        webview
            .eval(&inspector_more_overlay_update_script(
                item_id,
                selection_token,
                expanded,
                &label,
            ))
            .map_err(|_| AppError::InternalError)?;
        webview.show().map_err(|_| AppError::InternalError)?;
        return Ok(true);
    }

    let builder = build_inspector_more_overlay_builder(
        app,
        &overlay_label,
        item_id,
        selection_token,
        expanded,
        &label,
    )?;
    let webview = window
        .add_child(
            builder,
            tauri::LogicalPosition::new(bounds.x, bounds.y),
            tauri::LogicalSize::new(bounds.width, bounds.height),
        )
        .map_err(|_| AppError::InternalError)?;
    webview
        .set_bounds(runtime_host_rect(bounds))
        .map_err(|_| AppError::InternalError)?;
    Ok(true)
}

pub fn close_inspector_more_overlay(
    app: &tauri::AppHandle,
    item_id: i64,
) -> Result<bool, AppError> {
    let label = inspector_more_overlay_label(item_id);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };
    let _ = webview.hide();
    webview.close().map_err(|_| AppError::InternalError)?;
    Ok(true)
}

pub fn attach_html_edit_toolbar_overlay(
    app: &tauri::AppHandle,
    window: &tauri::Window,
    item_id: i64,
    bounds: RuntimeHostBounds,
    runtime_session_id: String,
    generation: u64,
    dirty: bool,
    selected_data_id: Option<String>,
    format_state: HtmlEditToolbarFormatState,
) -> Result<bool, AppError> {
    let overlay_label = html_edit_toolbar_label(item_id);
    if let Some(webview) = app.get_webview(&overlay_label) {
        webview
            .set_bounds(runtime_host_rect(bounds.clone()))
            .map_err(|_| AppError::InternalError)?;
        let update_result = webview.eval(&html_edit_toolbar_update_script(
            &runtime_session_id,
            generation,
            dirty,
            selected_data_id.as_deref(),
            &format_state,
        ));
        log_html_edit_debug(
            "toolbar-update-eval",
            format!(
                "session={runtime_session_id} generation={generation} dirty={dirty} selected_data_id={} format_edit_role={} format_can_format={} result={}",
                selected_data_id.as_deref().unwrap_or("-"),
                format_state.edit_role,
                format_state.can_format,
                if update_result.is_ok() { "ok" } else { "error" }
            ),
        );
        let _ = webview.show();
        return Ok(true);
    }

    let builder = build_html_edit_toolbar_builder(
        app,
        &overlay_label,
        item_id,
        &runtime_session_id,
        generation,
        dirty,
        selected_data_id.as_deref(),
        &format_state,
    )?;
    let webview = window
        .add_child(
            builder,
            tauri::LogicalPosition::new(bounds.x, bounds.y),
            tauri::LogicalSize::new(bounds.width, bounds.height),
        )
        .map_err(|_| AppError::InternalError)?;
    webview
        .set_bounds(runtime_host_rect(bounds))
        .map_err(|_| AppError::InternalError)?;
    Ok(true)
}

pub fn set_html_edit_toolbar_overlay_visibility(
    app: &tauri::AppHandle,
    item_id: i64,
    visible: bool,
) -> Result<bool, AppError> {
    let label = html_edit_toolbar_label(item_id);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };

    if visible {
        webview.show().map_err(|_| AppError::InternalError)?;
    } else {
        let _ = webview.hide();
        webview.close().map_err(|_| AppError::InternalError)?;
    }

    Ok(true)
}

pub fn close_html_edit_toolbar_overlay(
    app: &tauri::AppHandle,
    item_id: i64,
) -> Result<bool, AppError> {
    let label = html_edit_toolbar_label(item_id);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };

    let _ = webview.hide();
    webview.close().map_err(|_| AppError::InternalError)?;
    Ok(true)
}

pub fn attach_html_edit_leave_confirm_overlay(
    app: &tauri::AppHandle,
    window: &tauri::Window,
    item_id: i64,
    bounds: RuntimeHostBounds,
    mode: &str,
    file_name: &str,
    request_id: &str,
) -> Result<bool, AppError> {
    let overlay_label = html_edit_leave_confirm_label(item_id);
    if let Some(webview) = app.get_webview(&overlay_label) {
        log_html_edit_debug(
            "leave-confirm-attach",
            format!("item={item_id} mode=reuse x={} y={} width={} height={}", bounds.x, bounds.y, bounds.width, bounds.height),
        );
        eprintln!("[html-edit-leave] reusing overlay for item {item_id}");
        webview
            .set_bounds(runtime_host_rect(bounds.clone()))
            .map_err(|_| AppError::InternalError)?;
        let _ = webview.show();
        return Ok(true);
    }

    let builder = build_html_edit_leave_confirm_builder(app, &overlay_label, item_id, mode, file_name, request_id)?;
    let webview = window
        .add_child(
            builder,
            tauri::LogicalPosition::new(bounds.x, bounds.y),
            tauri::LogicalSize::new(bounds.width, bounds.height),
        )
        .map_err(|error| {
            eprintln!("[html-edit-leave] add_child failed for item {item_id}: {error:?}");
            AppError::InternalError
        })?;
    webview
        .set_bounds(runtime_host_rect(bounds))
        .map_err(|error| {
            eprintln!("[html-edit-leave] set_bounds failed for item {item_id}: {error:?}");
            AppError::InternalError
        })?;
    log_html_edit_debug(
        "leave-confirm-attach",
        format!("item={item_id} mode=new label={overlay_label}"),
    );
    eprintln!("[html-edit-leave] attached for item {item_id}");
    Ok(true)
}

pub fn close_html_edit_leave_confirm_overlay(
    app: &tauri::AppHandle,
    item_id: i64,
) -> Result<bool, AppError> {
    let label = html_edit_leave_confirm_label(item_id);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };

    let _ = webview.hide();
    webview.close().map_err(|_| AppError::InternalError)?;
    Ok(true)
}

pub fn attach_settings_overlay(
    app: &tauri::AppHandle,
    window: &tauri::Window,
    bounds: RuntimeHostBounds,
    tab: Option<String>,
    mode: Option<String>,
) -> Result<bool, AppError> {
    let label = settings_overlay_label();
    let bounds = settings_overlay_bounds(window, bounds, mode.as_deref());
    if let Some(webview) = app.get_webview(&label) {
        webview
            .set_bounds(runtime_host_rect(bounds.clone()))
            .map_err(|_| AppError::InternalError)?;
        let _ = webview.eval(&settings_overlay_open_script(tab, mode));
        let _ = webview.show();
        let _ = webview.set_focus();
        return Ok(true);
    }

    let builder = build_settings_overlay_builder(app, &label, tab, mode)?;
    let webview = window
        .add_child(
            builder,
            tauri::LogicalPosition::new(bounds.x, bounds.y),
            tauri::LogicalSize::new(bounds.width, bounds.height),
        )
        .map_err(|_| AppError::InternalError)?;
    webview
        .set_bounds(runtime_host_rect(bounds))
        .map_err(|_| AppError::InternalError)?;
    let _ = webview.set_focus();
    Ok(true)
}

fn settings_overlay_bounds(
    window: &tauri::Window,
    bounds: RuntimeHostBounds,
    mode: Option<&str>,
) -> RuntimeHostBounds {
    if !matches!(mode, Some("panel") | Some("update")) {
        return bounds;
    }

    let Ok(size) = window.inner_size() else {
        return bounds;
    };
    let scale_factor = window.scale_factor().unwrap_or(1.0).max(1.0);
    RuntimeHostBounds {
        x: 0.0,
        y: 0.0,
        width: (size.width as f64 / scale_factor).max(1.0),
        height: (size.height as f64 / scale_factor).max(1.0),
    }
}

pub fn dispatch_html_runtime_shortcut(
    app: &tauri::AppHandle,
    item_id: i64,
    key: &str,
) -> Result<bool, AppError> {
    let label = html_runtime_host_label(item_id);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };

    let script = html_runtime_shortcut_script(key);

    webview.eval(&script).map_err(|_| AppError::InternalError)?;
    Ok(true)
}

fn html_runtime_shortcut_script(key: &str) -> String {
    let key_literal = format!("{key:?}");
    format!(
        r#"
(() => {{
  const shortcut = {key_literal};
  const shortcutMatch = /^(CmdOrCtrl\+)?(Shift\+)?(.+)$/.exec(shortcut);
  const key = shortcutMatch ? shortcutMatch[3] : shortcut;
  const hasCommandModifier = Boolean(shortcutMatch?.[1]);
  const hasShiftModifier = Boolean(shortcutMatch?.[2]);
  const keyCodeMap = {{
    ArrowLeft: 37,
    ArrowUp: 38,
    ArrowRight: 39,
    ArrowDown: 40,
    PageUp: 33,
    PageDown: 34,
    Home: 36,
    End: 35,
    Escape: 27,
    Enter: 13,
    " ": 32,
    Space: 32,
    s: 83,
    S: 83,
    f: 70,
    F: 70
  }};
  const codeMap = {{
    ArrowLeft: 'ArrowLeft',
    ArrowUp: 'ArrowUp',
    ArrowRight: 'ArrowRight',
    ArrowDown: 'ArrowDown',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    Home: 'Home',
    End: 'End',
    Escape: 'Escape',
    Enter: 'Enter',
    " ": 'Space',
    Space: 'Space'
  }};
  try {{
    window.__NUTBOOK_FOCUS_RUNTIME__?.();
  }} catch (_) {{}}
  const normalizedCode = codeMap[key] || (key.length === 1 ? `Key${{key.toUpperCase()}}` : key);
  const normalizedKeyCode = keyCodeMap[key] || (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0);
  const eventInit = {{
    key,
    code: normalizedCode,
    metaKey: hasCommandModifier,
    ctrlKey: hasCommandModifier,
    shiftKey: hasShiftModifier,
    bubbles: true,
    cancelable: true
  }};
  const defineLegacyKeyProps = (event) => {{
    try {{ Object.defineProperty(event, 'keyCode', {{ configurable: true, get: () => normalizedKeyCode }}); }} catch (_) {{}}
    try {{ Object.defineProperty(event, 'which', {{ configurable: true, get: () => normalizedKeyCode }}); }} catch (_) {{}}
  }};
  const target = document.activeElement || document.body || document.documentElement || window;
  const keydown = new KeyboardEvent('keydown', eventInit);
  const keyup = new KeyboardEvent('keyup', eventInit);
  defineLegacyKeyProps(keydown);
  defineLegacyKeyProps(keyup);
  // Dispatch once. Events sent to an element already bubble through document
  // and window; dispatching the same shortcut at all three levels executes
  // undo/redo multiple times for one native menu action.
  try {{ target?.dispatchEvent?.(keydown); }} catch (_) {{}}
  try {{ target?.dispatchEvent?.(keyup); }} catch (_) {{}}
}})();
"#
    )
}

pub fn eval_html_runtime_script(
    app: &tauri::AppHandle,
    item_id: i64,
    script: &str,
) -> Result<bool, AppError> {
    let label = html_runtime_host_label(item_id);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };

    webview.eval(script).map_err(|_| AppError::InternalError)?;
    Ok(true)
}

pub fn forward_html_runtime_view_state<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    payload: &Value,
) -> Result<bool, AppError> {
    if payload.get("type").and_then(Value::as_str) != Some("html_runtime_view_state")
        || payload.get("itemId").and_then(Value::as_i64).is_none()
        || payload.get("surfaceToken").and_then(Value::as_u64).filter(|value| *value > 0).is_none()
        || payload.get("sequence").and_then(Value::as_u64).is_none()
        || payload.get("scrollX").and_then(Value::as_f64).filter(|value| value.is_finite()).is_none()
        || payload.get("scrollY").and_then(Value::as_f64).filter(|value| value.is_finite()).is_none()
        || payload.get("hash").and_then(Value::as_str).filter(|value| value.len() <= 2048).is_none()
        || payload.get("presentationPageId").and_then(Value::as_str).map(|value| value.len() > 512).unwrap_or(false)
        || payload.get("requestId").and_then(Value::as_str).map(|value| value.len() > 160).unwrap_or(false)
    {
        return Err(AppError::InvalidParams);
    }

    let main_webview = app.get_webview("main").ok_or(AppError::InternalError)?;
    let payload_json = serde_json::to_string(payload).map_err(|_| AppError::InternalError)?;
    main_webview
        .eval(&format!(
            "window.__NUTBOOK_HANDLE_HTML_RUNTIME_VIEW_STATE__?.({payload_json});"
        ))
        .map_err(|_| AppError::InternalError)?;
    Ok(true)
}

pub fn focus_html_runtime_host(
    app: &tauri::AppHandle,
    item_id: i64,
    host_fullscreen: Option<bool>,
) -> Result<bool, AppError> {
    let label = html_runtime_host_label(item_id);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };

    let fullscreen_assignment = host_fullscreen
        .map(|enabled| {
            format!(
                "window.__NUTBOOK_HOST_FULLSCREEN__ = {};",
                if enabled { "true" } else { "false" }
            )
        })
        .unwrap_or_default();
    let _ = webview.eval(&format!(
        r#"
(() => {{
  try {{
    {fullscreen_assignment}
    window.__NUTBOOK_FOCUS_RUNTIME__?.();
  }} catch (_) {{}}
}})();
"#
    ));
    let _ = webview.window().set_focus();
    webview.set_focus().map_err(|_| AppError::InternalError)?;
    #[cfg(target_os = "macos")]
    {
        HTML_FULLSCREEN_FOCUS_ITEM_ID.store(item_id, Ordering::Release);
        install_html_fullscreen_focus_observer(app);
        recover_webview_focus_native(webview.clone());
    }
    Ok(true)
}

#[cfg(target_os = "macos")]
fn install_html_fullscreen_focus_observer(app: &tauri::AppHandle) {
    HTML_FULLSCREEN_FOCUS_OBSERVER.get_or_init(|| {
        let center = NSNotificationCenter::defaultCenter();
        // These are immutable AppKit framework notification names. objc2
        // exposes them as extern statics, so Rust 2024 requires the read to
        // be explicit even though AppKit owns their lifetime.
        let notification_names = unsafe {
            [
                NSWindowDidEnterFullScreenNotification,
                NSWindowDidExitFullScreenNotification,
            ]
        };
        for notification_name in notification_names {
            let app_handle = app.clone();
            let handler = RcBlock::new(move |_notification: std::ptr::NonNull<NSNotification>| {
                let item_id = HTML_FULLSCREEN_FOCUS_ITEM_ID.load(Ordering::Acquire);
                if item_id <= 0 {
                    return;
                }
                let Some(webview) = app_handle.get_webview(&html_runtime_host_label(item_id)) else {
                    return;
                };
                let _ = webview.window().set_focus();
                let _ = webview.set_focus();
                recover_webview_focus_native(webview);
            });
            // NSNotificationCenter owns the observer for the application
            // lifetime. Keep its token alive for the same lifetime rather
            // than registering per fullscreen transition.
            let observer = unsafe {
                center.addObserverForName_object_queue_usingBlock(
                    Some(notification_name),
                    None,
                    None,
                    &handler,
                )
            };
            std::mem::forget(observer);
        }
    });
}

pub fn focus_main_webview(
    app: &tauri::AppHandle,
) -> Result<bool, AppError> {
    let Some(webview) = app.get_webview("main") else {
        return Ok(false);
    };

    recover_main_webview_focus(&webview);
    Ok(true)
}

fn recover_main_webview_focus<R: tauri::Runtime>(
    webview: &tauri::Webview<R>,
) {
    let window = webview.window();
    let _ = window.show();
    let _ = window.set_focus();
    let _ = webview.set_focus();

    #[cfg(target_os = "macos")]
    {
        recover_webview_focus_native(webview.clone());
    }

    let app_handle = window.app_handle().clone();
    tauri::async_runtime::spawn(async move {
        std::thread::sleep(Duration::from_millis(180));
        if let Some(main_webview) = app_handle.get_webview("main") {
            let main_window = main_webview.window();
            let _ = main_window.set_focus();
            let _ = main_webview.set_focus();
            #[cfg(target_os = "macos")]
            {
                recover_webview_focus_native(main_webview.clone());
            }
        }
    });
}

#[cfg(target_os = "macos")]
fn recover_webview_focus_native<R: tauri::Runtime>(
    webview: tauri::Webview<R>,
) {
    let webview_for_main = webview.clone();
    let _ = webview.run_on_main_thread(move || {
        let _ = webview_for_main.with_webview(move |platform_webview| unsafe {
            let window: &NSWindow = &*platform_webview.ns_window().cast();
            let view: &WKWebView = &*platform_webview.inner().cast();
            let responder: &NSResponder = view;
            window.makeKeyAndOrderFront(None);
            // After fullscreen exits, WebKit can leave the former controls
            // child/IME responder installed. Explicitly clear it before
            // assigning the runtime WKWebView; a direct replacement may be
            // declined and makes the second F/Arrow appear to be lost.
            let _ = window.makeFirstResponder(None);
            let _ = responder.becomeFirstResponder();
            let _ = window.makeFirstResponder(Some(responder));
        });
    });
}

/// P2：承载层 label 一律由 `RuntimeKey` 决定。
///
/// `Item(id)` 分支与 P1 逐字一致（`html-host-7`、`html-player-7`）；
/// `External(sessionId)` 分支落 `html-host-ext-<uuid>`。两域互不冲突，且角色
/// 识别（`ContentSurfaceRole::from_label`）先判 `html-host-ext-`。
pub fn html_runtime_window_label_for(key: &RuntimeKey) -> String {
    format!("html-player-{}", key.label_segment())
}

pub fn html_runtime_host_label_for(key: &RuntimeKey) -> String {
    format!("html-host-{}", key.label_segment())
}

pub fn html_presentation_preview_label_for(key: &RuntimeKey) -> String {
    format!("html-presentation-preview-{}", key.label_segment())
}

pub fn html_runtime_controls_label_for(key: &RuntimeKey) -> String {
    format!("html-controls-{}", key.label_segment())
}

pub fn html_runtime_window_label(item_id: i64) -> String {
    html_runtime_window_label_for(&RuntimeKey::Item(item_id))
}

pub fn html_runtime_host_label(item_id: i64) -> String {
    html_runtime_host_label_for(&RuntimeKey::Item(item_id))
}

pub fn html_presentation_preview_label(item_id: i64) -> String {
    html_presentation_preview_label_for(&RuntimeKey::Item(item_id))
}

pub fn html_runtime_controls_label(item_id: i64) -> String {
    html_runtime_controls_label_for(&RuntimeKey::Item(item_id))
}

/// P2 / revision 71：find overlay 的 label 与其余承载层一致，由 `RuntimeKey`
/// 决定——`Item` 分支输出与原 label 完全一致（`html-find-7`），`External`
/// 输出 `html-find-ext-<sessionId>`（正式 item 路径零行为变化）。
pub fn html_find_overlay_label_for(key: &RuntimeKey) -> String {
    format!("html-find-{}", key.label_segment())
}

fn html_find_overlay_label(item_id: i64) -> String {
    html_find_overlay_label_for(&RuntimeKey::Item(item_id))
}

fn inspector_more_overlay_label(item_id: i64) -> String {
    format!("inspector-more-{item_id}")
}

pub fn html_edit_toolbar_label(item_id: i64) -> String {
    format!("html-edit-toolbar-{item_id}")
}

pub fn html_edit_leave_confirm_label(item_id: i64) -> String {
    format!("html-edit-leave-confirm-{item_id}")
}

fn settings_overlay_label() -> String {
    "settings-overlay".to_string()
}

fn runtime_host_rect(bounds: RuntimeHostBounds) -> tauri::Rect {
    tauri::Rect {
        position: tauri::Position::Logical(tauri::LogicalPosition::new(bounds.x, bounds.y)),
        size: tauri::Size::Logical(tauri::LogicalSize::new(bounds.width, bounds.height)),
    }
}

fn build_detached_runtime_window(
    app: &tauri::AppHandle,
    session: &HtmlRuntimeSession,
) -> Result<(), AppError> {
    let webview_url = tauri::WebviewUrl::External(
        session
            .runtime_url
            .parse()
            .map_err(|_| AppError::PreviewLoadFailed)?,
    );

    tauri::WebviewWindowBuilder::new(app, session.label.clone(), webview_url)
        .title(session.title.clone())
        .inner_size(1280.0, 820.0)
        .resizable(true)
        .initialization_script(html_runtime_compatibility_script())
        .on_new_window(detached_new_window_handler(app))
        .on_document_title_changed(detached_fullscreen_handler(session.title.clone()))
        .build()
        .map_err(|_| AppError::InternalError)?;

    // R9：登记 detached player 会话身份（origin 绑定 + 消息角色分权）。
    // detached player 不注入 view-state 脚本，surface token 恒为 0。
    register_content_session(
        app,
        &session.label,
        crate::core::content_session::ContentSurfaceRole::DetachedPlayer,
        session.key.clone(),
        &session.runtime_url,
        "",
        0,
        0,
    );

    Ok(())
}

fn build_runtime_webview_builder<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    label: &str,
    session: &HtmlRuntimeSession,
    view_state_surface_token: u64,
    view_state: Option<&Value>,
) -> Result<WebviewBuilder<R>, AppError> {
    let webview_url = tauri::WebviewUrl::External(
        session
            .runtime_url
            .parse()
            .map_err(|_| AppError::PreviewLoadFailed)?,
    );

    Ok(
        WebviewBuilder::new(label, webview_url)
            .initialization_script(html_runtime_compatibility_script())
            .initialization_script(&html_runtime_view_state_script(
                session.key.item_id().ok_or(AppError::InvalidParams)?,
                view_state_surface_token,
                view_state,
            ))
            .on_new_window(detached_new_window_handler(app))
            .on_document_title_changed(detached_embedded_fullscreen_handler(app)),
    )
}

/// P2：外部会话 host surface 的 scoped 服务器 key。
///
/// 与 item key（`html-runtime:{itemId}:host`）同构但处于独立命名空间；
/// `State::revoke_external_content_capabilities` 按
/// `html-runtime-ext:{sessionId}:` 前缀撤销，因此这里的形态必须与之一致。
pub fn external_runtime_scoped_key(session_id: &str) -> String {
    format!("html-runtime-ext:{session_id}:host")
}

/// P2 / 计划 §6.2：promotion（受控重建）前的一次性 view state 采集脚本。
///
/// 外部阅读态 host 按 Codex revision 32 §5 不注入常驻 view-state 脚本
/// （surface token 恒 0），所以不能用 `html_runtime_view_state_script` 的
/// `flush` 通道。这里只在拆除旧 child **之前**注入一段自包含、幂等、无副作用
/// 的脚本：读取滚动位置、URL hash 与演示桥当前页 id，经专用回报命令回传一次。
///
/// 演示页 id（revision 71）：页面可能提供公开 presentation bridge
/// （`window.__NUTBOOK_PRESENTATION__` version 1）。采集按官方 runtime 同一
/// 合同读取 `whenReady + getActivePageId`，但全程**有界**（whenReady ≤120ms、
/// getActivePageId ≤60ms，总上界 180ms，小于前端 260ms 等待超时）：
/// 桥缺失 / 挂起 / 抛错都按「无页 id」回报，绝不阻断滚动与 hash 采集。
///
/// 刻意不做的事：不注册全局对象、不监听事件、不写 history / 不改页面状态、
/// 不携带 surface token。它只把「拆之前那一瞬的滚动、hash 与页 id」送回去，
/// 回报命令自身按 External 角色 + 会话/代次校验（见 `commands::preview`）。
pub fn external_view_state_capture_script(
    session_id: &str,
    generation: u64,
    request_id: &str,
) -> String {
    let session_json = serde_json::to_string(session_id).unwrap_or_else(|_| "\"\"".to_string());
    let request_json = serde_json::to_string(request_id).unwrap_or_else(|_| "\"\"".to_string());
    format!(
        r#"
(() => {{
  try {{
    const invoke = window.__TAURI_INTERNALS__?.invoke;
    if (typeof invoke !== 'function') return;
    const clamp = (value) => Math.min(100000000, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0));
    const root = document.scrollingElement || document.documentElement || document.body;
    const viewState = {{
      scrollX: clamp(root?.scrollLeft ?? window.scrollX),
      scrollY: clamp(root?.scrollTop ?? window.scrollY),
      hash: String(location.hash || '').slice(0, 2048),
      presentationPageId: null
    }};
    const bridge = window.__NUTBOOK_PRESENTATION__;
    const bounded = (promise, ms) => Promise.race([
      Promise.resolve(promise),
      new Promise((resolve) => {{ window.setTimeout(() => resolve(undefined), ms); }})
    ]);
    const readPageId = async () => {{
      if (!bridge || bridge.version !== 1 || typeof bridge.getActivePageId !== 'function') return null;
      try {{
        if (typeof bridge.whenReady === 'function') await bounded(bridge.whenReady(), 120);
        const pageId = await bounded(bridge.getActivePageId(), 60);
        return typeof pageId === 'string' ? pageId.slice(0, 512) : null;
      }} catch (_) {{
        return null;
      }}
    }};
    readPageId().then((pageId) => {{
      if (typeof pageId === 'string') viewState.presentationPageId = pageId;
      Promise.resolve(invoke('external_html_view_state_report_command', {{ payload: {{
        sessionId: {session_json},
        generation: {generation},
        requestId: {request_json},
        viewState
      }} }})).catch(() => {{}});
    }});
  }} catch (_) {{}}
}})();
"#
    )
}

/// P2-R92a：外部临时 HTML 的**回放**脚本（固定模板，随建 child 一次性注入）。
///
/// 与 `external_view_state_capture_script` 成对称一对，读的是同一份
/// `{scrollX, scrollY, hash, presentationPageId}` 形状。
///
/// 为什么必须走 `initialization_script`：外部 host 的隐藏语义是 **1x1 → hide →
/// close → 注销登记**（`set_runtime_host_visibility_for`），surface 被真正销毁；
/// 再次激活必然重建 child。因此回放只能发生在**建 child 的那一刻**——事后
/// eval 会落在正在导航的旧文档上，随导航一起丢弃，位置必然丢失。
///
/// 边界：只改滚动、URL hash 与演示桥当前页；不注册全局对象、不监听持久事件、
/// 不用 `pushState`（不污染历史）、不含任何页面可控插值（状态经 serde_json
/// 转义后作为字面量注入）。等待与轮询全程有界（就绪等待 ≤600 帧、滚动收敛
/// ≤300 帧、演示桥 whenReady/goTo 各 ≤120ms）；用户真实输入（滚轮 / 触摸 /
/// 翻页键）会立刻放弃回放，不与用户抢滚动。失败一律静默：只少一次位置恢复。
pub fn external_view_state_restore_script(view_state: &Value) -> String {
    let initial_json = serde_json::to_string(view_state).unwrap_or_else(|_| "null".to_string());
    r#"
(() => {
  const initial = __NUTBOOK_EXTERNAL_INITIAL_VIEW_STATE__;
  if (!initial || typeof initial !== 'object') return;
  const scrollRoot = () => document.scrollingElement || document.documentElement || document.body;
  const finitePosition = (value) => Math.min(100000000, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0));
  const targetX = finitePosition(initial.scrollX);
  const targetY = finitePosition(initial.scrollY);
  const targetHash = typeof initial.hash === 'string' && (initial.hash === '' || initial.hash.startsWith('#'))
    ? initial.hash.slice(0, 2048)
    : '';
  const targetPageId = typeof initial.presentationPageId === 'string'
    ? initial.presentationPageId.slice(0, 512)
    : null;
  try {
    if (location.hash !== targetHash) {
      history.replaceState(history.state, '', `${location.pathname}${location.search}${targetHash}`);
    }
  } catch (_) {}
  let cancelled = false;
  const cancel = (event) => {
    if (event && event.isTrusted === false) return;
    cancelled = true;
  };
  const bounded = (promise, ms) => Promise.race([
    Promise.resolve(promise),
    new Promise((resolve) => { window.setTimeout(() => resolve(undefined), ms); })
  ]);
  const applyPage = async () => {
    if (!targetPageId) return;
    const bridge = window.__NUTBOOK_PRESENTATION__;
    if (!bridge || bridge.version !== 1 || typeof bridge.goTo !== 'function') return;
    try {
      if (typeof bridge.whenReady === 'function') await bounded(bridge.whenReady(), 120);
      await bounded(bridge.goTo(targetPageId), 120);
    } catch (_) {}
  };
  let frame = 0;
  const applyScroll = () => {
    if (cancelled) return;
    const root = scrollRoot();
    const maxX = Math.max(0, Number(root?.scrollWidth || 0) - Number(root?.clientWidth || 0));
    const maxY = Math.max(0, Number(root?.scrollHeight || 0) - Number(root?.clientHeight || 0));
    window.scrollTo(Math.min(targetX, maxX), Math.min(targetY, maxY));
    if ((targetX <= maxX + 1 && targetY <= maxY + 1) || frame >= 300) return;
    frame += 1;
    requestAnimationFrame(applyScroll);
  };
  const start = () => {
    applyPage().then(() => applyScroll()).catch(() => {});
  };
  let waitFrames = 0;
  const waitReady = () => {
    if (cancelled) return;
    if (document.readyState !== 'loading' || waitFrames >= 600) {
      start();
      return;
    }
    waitFrames += 1;
    requestAnimationFrame(waitReady);
  };
  window.addEventListener('wheel', cancel, { passive: true });
  window.addEventListener('touchstart', cancel, { passive: true });
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) cancel(event);
  }, true);
  waitReady();
})();
"#
    .replace("__NUTBOOK_EXTERNAL_INITIAL_VIEW_STATE__", &initial_json)
}

/// revision 74（P2-R71a）：外部会话 find 选区清理脚本（固定文本，无可注入参数）。
pub const EXTERNAL_HTML_FIND_CLOSE_SCRIPT: &str =
    "document.getElementById('nutbook-html-find-selection')?.remove();";

/// revision 77（P2-R71b）：外部查找 `query` 的 UTF-8 字节上限（后端权威）。
///
/// 已知会话标识的 hostile page 可提交数 MB 级字符串：后端会把它序列化进
/// eval 脚本，页面再对全文做 `toLocaleLowerCase` 与循环 `indexOf` 扫描，
/// 造成 IPC / 内存 / 主线程放大。4096 字节（约 1300+ 汉字）远超正文查找
/// 任何真实用户路径（find 输入框单行短词），超限直接拒绝且不 eval；
/// 前端输入同步限制只是体验优化，不参与裁决。
pub const EXTERNAL_HTML_FIND_MAX_QUERY_BYTES: usize = 4096;

/// revision 74（P2-R71a）：外部临时 host 的**结构化**查找动作脚本。
///
/// 任意脚本文本入口（revision 72 的 eval 命令）已删除：hostile page 可在
/// capture 时机包装 `window.__TAURI_INTERNALS__.invoke` 截获自身会话标识，
/// 再用它把任意源码送进宿主 eval。此后页面只能驱动有限动作枚举——
/// `query` / `next` / `prev` / `close`——脚本源码永远由本函数的固定模板
/// 构造，页面参数仅以 serde_json 转义后的 JSON 字面量注入（字符串不可能
/// 逃逸出字面量）。`replace` / `replace_all` 一族在外部会话恒被拒绝
/// （§6.2 不开放编辑），未知动作 deny-by-default。
///
/// 查找逻辑与 main 投影的正式 item 脚本保持同一合同：跨演示页钩子
/// `window.__NUTBOOK_FIND_ACROSS_PRESENTATION_PAGES__` 优先，选区高亮
/// 复用 `#nutbook-html-find-selection`，结果经 `__NUTBOOK_HTML_FIND_RESULT__:`
/// 标题桥回传（itemId 固定为 `external:<sessionId>`，与标题桥 External
/// 分支的校验一致——页面无法替其它会话伪造结果）。
pub fn external_html_find_action_script(
    session_id: &str,
    action: &str,
    query: &str,
    case_sensitive: bool,
) -> Result<String, AppError> {
    if action == "close" {
        return Ok(EXTERNAL_HTML_FIND_CLOSE_SCRIPT.to_string());
    }
    if !matches!(action, "query" | "next" | "prev") {
        return Err(AppError::InvalidParams);
    }
    // revision 77（P2-R71b）：query 字节上限校验必须先于任何脚本构造——
    // 超限时本函数返回 Err，命令层不会对 host 执行任何 eval。
    if query.len() > EXTERNAL_HTML_FIND_MAX_QUERY_BYTES {
        return Err(AppError::InvalidParams);
    }
    let query_json = serde_json::to_string(query).unwrap_or_else(|_| "\"\"".to_string());
    let action_json = serde_json::to_string(action).unwrap_or_else(|_| "\"query\"".to_string());
    let item_json = serde_json::to_string(&format!("external:{session_id}"))
        .unwrap_or_else(|_| "\"\"".to_string());
    let backwards = action == "prev";
    Ok(format!(
        r#";(()=>{{const q={query_json},cs={case_sensitive},action={action_json},itemId={item_json};let style=document.getElementById('nutbook-html-find-selection');if(!style){{style=document.createElement('style');style.id='nutbook-html-find-selection';style.textContent='::selection{{background:rgba(255,159,67,.68)!important;color:inherit!important}}::-moz-selection{{background:rgba(255,159,67,.68)!important;color:inherit!important}}';document.head.append(style);}}const text=String(document.body?.innerText||"");const source=cs?text:text.toLocaleLowerCase();const needle=cs?q:q.toLocaleLowerCase();let total=0,at=0;while(needle&&(at=source.indexOf(needle,at))>=0){{total++;at+=Math.max(1,needle.length);}}let deferred=false;const report=(current=1)=>{{document.title='__NUTBOOK_HTML_FIND_RESULT__:'+JSON.stringify({{itemId,total,changed:0,current}});}};const revealSelection=()=>{{const selection=window.getSelection?.();if(!selection?.rangeCount)return;const node=selection.getRangeAt(0).commonAncestorContainer;const anchor=node?.nodeType===Node.ELEMENT_NODE?node:node?.parentElement;anchor?.scrollIntoView?.({{block:'nearest',inline:'nearest'}});}};const find=()=>{{const handled=window.__NUTBOOK_FIND_ACROSS_PRESENTATION_PAGES__?.({{query:q,caseSensitive:cs,backwards:{backwards},action,done:report}});if(handled){{deferred=true;return false;}}const matched=window.find(q,cs,{backwards},true,false,false,false);if(matched)revealSelection();return matched;}};find();if(!deferred)report();}})();"#
    ))
}

/// P2：外部阅读态内嵌 host 的 builder。与 `build_runtime_webview_builder`
/// 共用同一承载形态与处理器，唯一差别是**不注入常驻 view-state 脚本**（外部
/// 会话没有 item 身份，surface token 恒 0）。位置保留走一次性回放：由
/// `external_view_state_restore_script` 在建 child 时注入一份快照（P2-R92a），
/// 不注册常驻全局对象、不接管页面事件。
fn build_external_runtime_webview_builder<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    label: &str,
    session: &HtmlRuntimeSession,
    initial_view_state: Option<&Value>,
) -> Result<WebviewBuilder<R>, AppError> {
    let webview_url = tauri::WebviewUrl::External(
        session
            .runtime_url
            .parse()
            .map_err(|_| AppError::PreviewLoadFailed)?,
    );

    let mut builder = WebviewBuilder::new(label, webview_url)
        .initialization_script(html_runtime_compatibility_script())
        .on_new_window(detached_new_window_handler(app))
        .on_document_title_changed(detached_embedded_fullscreen_handler(app));
    // P2-R92a：hide 即销毁 surface，回放只能在建 child 时注入一次；无快照时
    // 完全不注入（旧行为：新 child 从初始位置开始）。
    if let Some(view_state) = initial_view_state {
        builder = builder.initialization_script(external_view_state_restore_script(view_state));
    }
    Ok(builder)
}

fn build_presentation_preview_webview_builder<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    label: &str,
    session: &HtmlRuntimeSession,
    runtime_session_id: &str,
    generation: u64,
    active_page_id: &str,
    preview_instance_id: &str,
) -> Result<WebviewBuilder<R>, AppError> {
    let webview_url = tauri::WebviewUrl::External(
        session
            .runtime_url
            .parse()
            .map_err(|_| AppError::PreviewLoadFailed)?,
    );
    Ok(
        WebviewBuilder::new(label, webview_url)
            .initialization_script(html_runtime_compatibility_script())
            .initialization_script(&presentation_preview_init_script(
                runtime_session_id,
                generation,
                active_page_id,
                preview_instance_id,
            ))
            .on_new_window(detached_new_window_handler(app))
            .on_document_title_changed(detached_embedded_fullscreen_handler(app)),
    )
}

fn presentation_preview_update_script(
    runtime_session_id: &str,
    generation: u64,
    active_page_id: &str,
    preview_instance_id: &str,
) -> String {
    format!(
        "window.__NUTBOOK_PRESENTATION_PREVIEW__?.updateSession?.({{runtimeSessionId:{runtime_session_id:?},generation:{generation},activePageId:{active_page_id:?},previewInstanceId:{preview_instance_id:?}}});"
    )
}

fn presentation_preview_init_script(
    runtime_session_id: &str,
    generation: u64,
    active_page_id: &str,
    preview_instance_id: &str,
) -> String {
    format!(r#"
(() => {{
  const initialSession = {{ runtimeSessionId: {runtime_session_id:?}, generation: {generation}, activePageId: {active_page_id:?}, previewInstanceId: {preview_instance_id:?} }};
  const titlePrefix = "__NUTBOOK_HTML_EDIT_RUNTIME__:";
  const report = async (type, pageId) => {{
    const state = window.__NUTBOOK_PRESENTATION_PREVIEW__?.state || initialSession;
    const payload = {{ type, pageId, runtimeSessionId: state.runtimeSessionId, generation: state.generation, previewInstanceId: state.previewInstanceId }};
    const invoke = window.__TAURI_INTERNALS__?.invoke;
    if (typeof invoke === "function") {{
      try {{ await invoke("html_edit_runtime_message_command", {{ payload }}); return; }} catch (_) {{}}
    }}
    document.title = titlePrefix + JSON.stringify(payload);
  }};
  const boot = async () => {{
    const bridge = window.__NUTBOOK_PRESENTATION__;
    if (!bridge || bridge.version !== 1 || !Array.isArray(bridge.pages) || typeof bridge.goTo !== "function") return;
    try {{ await bridge.whenReady?.(); await bridge.setEditMode?.(true); }} catch (_) {{ return; }}
    const pages = Array.from(document.querySelectorAll("[data-nutbook-page-id]")).filter((node) => node instanceof HTMLElement);
    const pageIds = pages.map((page) => page.dataset.nutbookPageId || "");
    if (!pages.length || pageIds.some((id) => !id) || new Set(pageIds).size !== pageIds.length) return;
    const deckRoot = pages[0].closest(".deck-shell") || pages[0].parentElement || document.body;
    const root = document.createElement("main");
    root.id = "nutbook-presentation-preview-root";
    root.setAttribute("aria-label", "演示页面缩略图");
    const style = document.createElement("style");
    style.textContent = `
      html,body{{margin:0!important;width:100%!important;height:100%!important;overflow:hidden!important;background:#f7f7f8!important;}}
      #nutbook-presentation-preview-root{{position:relative;z-index:2147483647;box-sizing:border-box;display:grid;align-content:start;gap:8px;width:100%;height:100%;overflow:auto;padding:12px 10px;background:#f7f7f8;}}
      .nb-preview-heading{{padding:3px 5px 4px;color:#696971;font:650 12px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}}
      .nb-preview-card{{display:block;box-sizing:border-box;width:100%;height:142px!important;padding:6px;border:1px solid transparent;border-radius:8px;background:transparent;color:#25252a;cursor:pointer;overflow:hidden;text-align:initial;}}
      .nb-preview-card:hover{{background:#eeeeF1;}} .nb-preview-card.is-active{{border-color:#222;background:#fff;}}
      .nb-preview-stage{{position:relative;display:block;width:100%;height:104px!important;overflow:hidden;border:1px solid #dedee3;border-radius:5px;background:#fff;}}
      .nb-preview-stage *{{pointer-events:none!important;}}
      .nb-preview-canvas{{position:absolute;inset:0 auto auto 0;width:1024px;height:576px;transform-origin:top left;overflow:hidden;}}
      .nb-preview-canvas.deck{{position:absolute!important;width:1024px!important;height:576px!important;aspect-ratio:16 / 9!important;}}
      .nb-preview-canvas > [data-nutbook-page-id]{{position:absolute!important;inset:0!important;width:1024px!important;height:576px!important;display:flex!important;visibility:visible!important;opacity:1!important;transform:none!important;transition:none!important;animation:none!important;pointer-events:none!important;}}
      /* The child preview is physically narrow, so source @media rules would
         otherwise turn every cloned desktop slide into its mobile layout. */
      .nb-preview-canvas > .slide{{padding:58px 76px 62px!important;}}
      .nb-preview-canvas .cover-title,.nb-preview-canvas .chapter-title{{font-size:58px!important;}}
      .nb-preview-canvas .slide-title{{font-size:40px!important;}}
      .nb-preview-canvas .slide-content{{font-size:19px!important;}}
      .nb-preview-placeholder{{display:grid;place-items:center;width:100%;height:100%;color:#777;font:600 11px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}}
      .nb-preview-meta{{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:5px;align-items:baseline;padding:4px 2px 0;color:#25252a;font:600 10px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left;}}
      .nb-preview-meta-index{{color:#777780;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}} .nb-preview-meta-title{{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}} .nb-preview-meta-kind{{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#85858c;font-size:9px;font-weight:550;}}
    `;
    // Exported decks often put controls beside (not inside) the deck shell.
    // Isolate every original body node so narrow child-WebView responsive
    // layout and native deck controls cannot leak into the thumbnail rail.
    Array.from(document.body.children).forEach((node) => {{
      if (node.tagName !== "SCRIPT") node.style.setProperty("display", "none", "important");
    }});
    document.head.append(style);
    document.body.append(root);
    const cards = new Map();
    const mount = (card) => {{
      if (card.dataset.mounted) return;
      const source = pages.find((page) => page.dataset.nutbookPageId === card.dataset.pageId);
      if (!source) return;
      const stage = card.querySelector(".nb-preview-stage");
      const canvas = document.createElement("span"); canvas.className = "nb-preview-canvas deck aspect-16-9";
      const clone = source.cloneNode(true);
      clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      clone.querySelectorAll("[contenteditable]").forEach((node) => node.removeAttribute("contenteditable"));
      canvas.append(clone); stage.replaceChildren(canvas);
      const fit = () => {{ canvas.style.transform = `scale(${{stage.clientWidth / 1024}})`; }};
      fit(); new ResizeObserver(fit).observe(stage);
      card.dataset.mounted = "true";
    }};
    const heading = document.createElement("div"); heading.className = "nb-preview-heading"; heading.textContent = `页面 · ${{pages.length}}`; root.append(heading);
    pages.forEach((page, index) => {{
      const id = page.dataset.nutbookPageId;
      const pageMeta = bridge.pages.find((entry) => entry?.id === id) || {{}};
      const card = document.createElement("button"); card.type = "button"; card.className = "nb-preview-card"; card.dataset.pageId = id;
      card.setAttribute("aria-label", `第 ${{index + 1}} 页`);
      card.innerHTML = '<span class="nb-preview-stage"><span class="nb-preview-placeholder">加载页面</span></span>';
      const meta = document.createElement("span"); meta.className = "nb-preview-meta";
      const metaIndex = document.createElement("span"); metaIndex.className = "nb-preview-meta-index"; metaIndex.textContent = String(pageMeta.index || index + 1);
      const metaTitle = document.createElement("span"); metaTitle.className = "nb-preview-meta-title"; metaTitle.textContent = String(pageMeta.title || "未命名页面");
      const metaKind = document.createElement("span"); metaKind.className = "nb-preview-meta-kind"; metaKind.textContent = String(pageMeta.kind || "presentation");
      meta.append(metaIndex, metaTitle, metaKind); card.append(meta);
      card.addEventListener("click", () => {{ card.blur(); report("html_edit_presentation_preview_clicked", id); }});
      root.append(card); cards.set(id, card);
    }});
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {{ if (entry.isIntersecting) mount(entry.target); }}), {{ root, rootMargin: "360px 0px" }});
    cards.forEach((card) => observer.observe(card));
    Array.from(cards.values()).slice(0, 4).forEach(mount);
    let manualScrollUntil = 0;
    const keepCardVisible = (card) => {{
      if (!card || performance.now() < manualScrollUntil) return;
      const top = card.offsetTop, bottom = top + card.offsetHeight;
      const viewTop = root.scrollTop, viewBottom = viewTop + root.clientHeight;
      if (top < viewTop) root.scrollTop = Math.max(0, top - 8);
      else if (bottom > viewBottom) root.scrollTop = Math.max(0, bottom - root.clientHeight + 8);
    }};
    root.addEventListener("wheel", () => {{ manualScrollUntil = performance.now() + 650; }}, {{ passive: true }});
    root.addEventListener("touchmove", () => {{ manualScrollUntil = performance.now() + 650; }}, {{ passive: true }});
    const select = (id, follow = false) => {{
      cards.forEach((card, pageId) => card.classList.toggle("is-active", pageId === id));
      if (follow) keepCardVisible(cards.get(id));
    }};
    try {{ select(initialSession.activePageId || await bridge.getActivePageId?.()); bridge.subscribe?.((id) => select(id)); }} catch (_) {{}}
    document.addEventListener("keydown", (event) => {{
      if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return;
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault(); event.stopImmediatePropagation();
      report("html_edit_presentation_preview_navigate", event.key === "ArrowUp" ? "previous" : "next");
    }}, true);
    window.__NUTBOOK_PRESENTATION_PREVIEW__ = {{ state: initialSession, updateSession(next) {{ this.state = next; select(next.activePageId); report("html_edit_presentation_preview_ready", next.activePageId); }}, select }};
    report("html_edit_presentation_preview_ready", initialSession.activePageId);
  }};
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {{ once: true }}); else boot();
}})();
"#)
}

fn build_runtime_controls_overlay_builder<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    label: &str,
    item_id: i64,
    is_favorite: bool,
    is_fullscreen: bool,
    is_editing: bool,
    is_primary_busy: bool,
    custom_tag: Option<Tag>,
    available_tags: Vec<Tag>,
    skill_tag: Option<String>,
    type_tag: Option<String>,
    custom_tags: Vec<Tag>,
    source_badges: Vec<ItemSourceBadge>,
    file_name: String,
) -> Result<WebviewBuilder<R>, AppError> {
    let overlay_url = tauri::WebviewUrl::App(PathBuf::from("runtime-overlay.html"));
    let init_script = html_runtime_controls_overlay_init_script(
        item_id,
        is_favorite,
        is_fullscreen,
        is_editing,
        is_primary_busy,
        custom_tag,
        available_tags,
        skill_tag,
        type_tag,
        custom_tags,
        source_badges,
        file_name,
    );

    Ok(
        WebviewBuilder::new(label, overlay_url)
            .initialization_script(&init_script)
            .background_color(tauri::webview::Color(0, 0, 0, 0))
            .transparent(true)
            .focused(false)
            .on_document_title_changed(runtime_controls_overlay_action_handler(app)),
    )
}

fn build_inspector_more_overlay_builder<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    label: &str,
    item_id: i64,
    selection_token: u64,
    expanded: bool,
    label_text: &str,
) -> Result<WebviewBuilder<R>, AppError> {
    let overlay_url = tauri::WebviewUrl::App(PathBuf::from("inspector-more-overlay.html"));
    Ok(
        WebviewBuilder::new(label, overlay_url)
            .initialization_script(&inspector_more_overlay_init_script(
                item_id,
                selection_token,
                expanded,
                label_text,
            ))
            .background_color(tauri::webview::Color(0, 0, 0, 0))
            .transparent(true)
            .focused(false)
            .on_document_title_changed(inspector_more_overlay_action_handler(app)),
    )
}

fn inspector_more_overlay_init_script(
    item_id: i64,
    selection_token: u64,
    expanded: bool,
    label: &str,
) -> String {
    format!(
        "window.__NUTBOOK_INSPECTOR_MORE_OVERLAY_INITIAL__={{itemId:{item_id},selectionToken:{selection_token},expanded:{expanded},label:{label:?}}};window.__NUTBOOK_INSPECTOR_MORE_OVERLAY__?.update?.(window.__NUTBOOK_INSPECTOR_MORE_OVERLAY_INITIAL__);"
    )
}

fn inspector_more_overlay_update_script(
    item_id: i64,
    selection_token: u64,
    expanded: bool,
    label: &str,
) -> String {
    inspector_more_overlay_init_script(item_id, selection_token, expanded, label)
}

fn build_html_edit_toolbar_builder<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    label: &str,
    item_id: i64,
    runtime_session_id: &str,
    generation: u64,
    dirty: bool,
    selected_data_id: Option<&str>,
    format_state: &HtmlEditToolbarFormatState,
) -> Result<WebviewBuilder<R>, AppError> {
    let overlay_url = tauri::WebviewUrl::App(PathBuf::from("html-edit-toolbar.html"));
    Ok(
        WebviewBuilder::new(label, overlay_url)
            .initialization_script(&html_edit_toolbar_init_script(
                item_id,
                runtime_session_id,
                generation,
                dirty,
                selected_data_id,
                format_state,
            ))
            .background_color(tauri::webview::Color(0, 0, 0, 0))
            .transparent(true)
            .focused(false)
            .on_document_title_changed(html_edit_toolbar_action_handler(app)),
    )
}

fn build_html_edit_leave_confirm_builder<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    label: &str,
    item_id: i64,
    mode: &str,
    file_name: &str,
    request_id: &str,
) -> Result<WebviewBuilder<R>, AppError> {
    let overlay_url = tauri::WebviewUrl::App(PathBuf::from("html-edit-leave-confirm.html"));
    Ok(
        WebviewBuilder::new(label, overlay_url)
            .initialization_script(&html_edit_leave_confirm_init_script(item_id, mode, file_name, request_id))
            .background_color(tauri::webview::Color(0, 0, 0, 0))
            .transparent(true)
            .focused(true)
            .on_document_title_changed(html_edit_leave_confirm_action_handler(app)),
    )
}

fn build_settings_overlay_builder<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    label: &str,
    tab: Option<String>,
    mode: Option<String>,
) -> Result<WebviewBuilder<R>, AppError> {
    let overlay_url = tauri::WebviewUrl::App(PathBuf::from("index.html"));
    Ok(
        WebviewBuilder::new(label, overlay_url)
            .initialization_script(&settings_overlay_init_script(tab, mode))
            .background_color(tauri::webview::Color(0, 0, 0, 0))
            .transparent(true)
            .focused(true)
            .on_document_title_changed(settings_overlay_action_handler(app)),
    )
}

fn settings_overlay_action_handler<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> impl Fn(tauri::Webview<R>, String) + Send + 'static {
    let app_handle = app.clone();
    move |webview, title| {
        if let Some(raw_payload) = title.strip_prefix(SETTINGS_OVERLAY_ACTION_PREFIX) {
            if let Ok(payload) = serde_json::from_str::<Value>(raw_payload) {
                let language = payload
                    .get("action")
                    .and_then(Value::as_str)
                    .filter(|action| *action == "language-change")
                    .and_then(|_| payload.get("language"))
                    .and_then(Value::as_str)
                    .filter(|language| matches!(*language, "zh-CN" | "en-US"));
                if let Some(language) = language {
                    if let (Some(main_webview), Ok(language_json)) = (
                        app_handle.get_webview("main"),
                        serde_json::to_string(language),
                    ) {
                        let _ = main_webview.eval(&format!(
                            "window.__NUTBOOK_UPDATE_INTERFACE_LANGUAGE__?.({language_json});"
                        ));
                    }
                    let _ = webview.eval("document.title = 'Nutbook Settings';");
                    return;
                }
            }
        }
        if title == format!("{SETTINGS_OVERLAY_ACTION_PREFIX}close") {
            let _ = webview.hide();
            let _ = webview.close();
            if let Some(main_webview) = app_handle.get_webview("main") {
                let _ = main_webview.eval("window.__NUTBOOK_REFRESH_AFTER_SETTINGS__?.();");
            }
        }
    }
}

fn html_edit_toolbar_action_handler<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> impl Fn(tauri::Webview<R>, String) + Send + 'static {
    let app_handle = app.clone();
    move |webview, title| {
        if let Some(rest) = title.strip_prefix(HTML_EDIT_TOOLBAR_DIAGNOSTIC_PREFIX) {
            if let Ok(payload) = serde_json::from_str::<Value>(rest) {
                log_html_edit_debug("toolbar-render-state", html_edit_debug_payload_fields(&payload));
            } else {
                log_html_edit_debug("toolbar-render-state", "result=invalid-payload");
            }
            let _ = webview.eval("document.title = 'Nutbook HTML Edit Toolbar';");
            return;
        }
        if let Some(rest) = title.strip_prefix(HTML_EDIT_TOOLBAR_ACTION_PREFIX) {
            if let Ok(payload) = serde_json::from_str::<Value>(rest) {
                log_html_edit_debug("toolbar-title", html_edit_debug_payload_fields(&payload));
                eprintln!("[html-edit-toolbar] action payload: {payload}");
                if let Some(main_webview) = app_handle.get_webview("main") {
                    let payload_json = serde_json::to_string(&payload).unwrap_or_else(|_| "null".to_string());
                    let forwarding_result = main_webview.eval(&format!(
                        "window.__NUTBOOK_HANDLE_HTML_EDIT_TOOLBAR_ACTION__?.({});",
                        payload_json
                    ));
                    log_html_edit_debug(
                        "toolbar-forward",
                        format!(
                            "{} result={}",
                            html_edit_debug_payload_fields(&payload),
                            if forwarding_result.is_ok() { "ok" } else { "error" }
                        ),
                    );
                } else {
                    log_html_edit_debug(
                        "toolbar-forward",
                        format!("{} result=main-webview-missing", html_edit_debug_payload_fields(&payload)),
                    );
                }
            }
            let _ = webview.eval("document.title = 'Nutbook HTML Edit Toolbar';");
        }
    }
}

fn html_edit_leave_confirm_action_handler<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> impl Fn(tauri::Webview<R>, String) + Send + 'static {
    let app_handle = app.clone();
    move |webview, title| {
        if let Some(rest) = title.strip_prefix(HTML_EDIT_LEAVE_READY_PREFIX) {
            log_html_edit_debug("leave-confirm-ready", format!("label={} payload={rest}", webview.label()));
            let _ = webview.eval("document.title = 'Nutbook HTML Edit Leave Confirm';");
            return;
        }
        if let Some(rest) = title.strip_prefix(HTML_EDIT_LEAVE_ACTION_PREFIX) {
            if let Ok(payload) = serde_json::from_str::<Value>(rest) {
                let forwarding_succeeded = if let Some(main_webview) = app_handle.get_webview("main") {
                    let payload_json = serde_json::to_string(&payload).unwrap_or_else(|_| "null".to_string());
                    main_webview.eval(&format!(
                        "window.__NUTBOOK_HANDLE_HTML_EDIT_LEAVE_CONFIRM_ACTION__?.({});",
                        payload_json
                    )).is_ok()
                } else {
                    false
                };
                log_html_edit_debug(
                    "leave-confirm-choice",
                    format!(
                        "label={} payload={} result={}",
                        webview.label(),
                        html_edit_debug_payload_fields(&payload),
                        if forwarding_succeeded { "ok" } else { "error" }
                    ),
                );
            } else {
                log_html_edit_debug("leave-confirm-choice", format!("label={} payload=invalid", webview.label()));
            }
            let _ = webview.eval("document.title = 'Nutbook HTML Edit Leave Confirm';");
        }
    }
}

fn runtime_controls_overlay_action_handler<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> impl Fn(tauri::Webview<R>, String) + Send + 'static {
    let app_handle = app.clone();
    move |webview, title| {
        if let Some(rest) = title.strip_prefix(HTML_CONTROLS_ACTION_PREFIX) {
            if let Ok(payload) = serde_json::from_str::<HtmlControlsActionPayload>(rest) {
                if let Some(main_webview) = app_handle.get_webview("main") {
                    let payload_json = serde_json::to_string(&payload)
                        .unwrap_or_else(|_| "null".to_string());
                    let _ = main_webview.eval(&format!(
                        "window.__NUTBOOK_HANDLE_HTML_RUNTIME_CONTROLS_ACTION__?.({});",
                        payload_json
                    ));
                }
            }
            let _ = webview.eval("document.title = 'Nutbook HTML Controls';");
        }
    }
}

fn html_find_overlay_action_handler<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> impl Fn(tauri::Webview<R>, String) + Send + 'static {
    let app_handle = app.clone();
    move |webview, title| {
        if let Some(rest) = title.strip_prefix(HTML_FIND_ACTION_PREFIX) {
            if let Ok(payload) = serde_json::from_str::<HtmlFindActionPayload>(rest) {
                if let Some(main_webview) = app_handle.get_webview("main") {
                    if let Ok(payload_json) = serde_json::to_string(&payload) {
                        let _ = main_webview.eval(&format!(
                            "window.__NUTBOOK_HANDLE_HTML_FIND_ACTION__?.({payload_json});"
                        ));
                    }
                }
            }
            let _ = webview.eval("document.title = 'Nutbook HTML Find';");
        }
    }
}

fn inspector_more_overlay_action_handler<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> impl Fn(tauri::Webview<R>, String) + Send + 'static {
    let app_handle = app.clone();
    move |webview, title| {
        if let Some(rest) = title.strip_prefix(INSPECTOR_MORE_OVERLAY_ACTION_PREFIX) {
            if let Ok(payload) = serde_json::from_str::<InspectorMoreOverlayActionPayload>(rest) {
                if let Some(main_webview) = app_handle.get_webview("main") {
                    if let Ok(payload_json) = serde_json::to_string(&payload) {
                        let _ = main_webview.eval(&format!(
                            "window.__NUTBOOK_HANDLE_INSPECTOR_MORE_OVERLAY_ACTION__?.({payload_json});"
                        ));
                    }
                }
            }
            let _ = webview.eval("document.title = 'Nutbook Inspector More';");
        }
    }
}

fn detached_new_window_handler<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> impl Fn(url::Url, tauri::webview::NewWindowFeatures) -> NewWindowResponse<R> + Send + Sync + 'static {
    let app_handle = app.clone();
    move |url, features| {
        let label = format!(
            "html-runtime-popup-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|duration| duration.as_micros())
                .unwrap_or_default()
        );
        let builder = tauri::WebviewWindowBuilder::new(
            &app_handle,
            label,
            tauri::WebviewUrl::External(url.clone()),
        )
        .window_features(features)
        .title(url.as_str())
        .initialization_script(html_runtime_compatibility_script())
        .on_document_title_changed(|window, title| {
            if title.starts_with(HTML_FULLSCREEN_TITLE_PREFIX) {
                let next_fullscreen = !window.is_fullscreen().unwrap_or(false);
                let _ = window.set_fullscreen(next_fullscreen);
                let _ = window.set_title("Nutbook Runtime");
            }
        });

        match builder.build() {
            Ok(window) => {
                let _ = window.show();
                let _ = window.set_always_on_top(true);
                let _ = window.set_focus();
                let popup = window.clone();
                tauri::async_runtime::spawn(async move {
                    std::thread::sleep(Duration::from_millis(220));
                    let _ = popup.set_always_on_top(false);
                    let _ = popup.set_focus();
                });
                // R9：仅当弹窗 URL 的 origin 与某个已登记内容会话一致
                // （同 scoped origin 弹窗）时登记为该承载对象的内容面弹窗；
                // 远程弹窗不登记，后续 invoke/标题桥一律被拒绝。
                // P2：归属按 `RuntimeKey` 记录（item 或外部会话），弹窗角色本身
                // 无任何合法消息，登记只用于「这是宿主创建的内容面」事实。
                if let Some(state) = app_handle.try_state::<crate::state::AppState>() {
                    if let Some(origin) = crate::core::content_session::origin_of_url(url.as_str()) {
                        if let Some(key) = state.content_sessions.find_key_by_origin(&origin) {
                            let _ = state.content_sessions.register(
                                window.label(),
                                crate::core::content_session::ContentSessionRecord {
                                    role: crate::core::content_session::ContentSurfaceRole::RuntimePopup,
                                    key,
                                    origin,
                                    runtime_session_id: String::new(),
                                    generation: 0,
                                    view_state_surface_token: 0,
                                },
                            );
                        }
                    }
                }
                NewWindowResponse::Create { window }
            }
            Err(_) => NewWindowResponse::Allow,
        }
    }
}

fn detached_fullscreen_handler<R: tauri::Runtime>(
    fallback_title: String,
) -> impl Fn(tauri::WebviewWindow<R>, String) + Send + 'static {
    move |window, title| {
        if title.starts_with(HTML_FULLSCREEN_TITLE_PREFIX) {
            let next_fullscreen = !window.is_fullscreen().unwrap_or(false);
            let _ = window.set_fullscreen(next_fullscreen);
            let _ = window.set_title(&fallback_title);
        }
    }
}

/// R9：标题桥 fallback 与 invoke 通道共用的会话登记裁决。内容面 label
/// 必须有登记记录且当前 origin 未漂移（导航失效）；可信面返回 None。
///
/// R9-a（Codex 返修）：本函数的 `None` 一律按「拒绝」处理 —— 标题桥只挂在
/// 内容 webview 上，None 只可能是未登记 / 已注销 / 已导航离开 / **URL 获取
/// 失败**。获取当前 URL 失败同样拒绝，不得跳过 origin 检查放行。
pub(crate) fn title_bridge_record<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    webview: &tauri::Webview<R>,
) -> Option<crate::core::content_session::ContentSessionRecord> {
    let label = webview.label();
    if crate::core::content_session::ContentSurfaceRole::from_label(label).is_none() {
        return None;
    }
    let state = app.try_state::<crate::state::AppState>()?;
    let record = state.content_sessions.get(label)?;
    // R9-a：url() 失败必须拒绝（`?` 传播 None = 拒绝），不能静默跳过。
    let url = webview.url().ok()?.to_string();
    if url != "about:blank" {
        let current = crate::core::content_session::origin_of_url(&url)?;
        if current != record.origin {
            return None;
        }
    }
    Some(record)
}

/// revision 83（P2-R80b）：正文查找**结果**的身份裁决（窄、可单测）。
///
/// 结果标题桥（`__NUTBOOK_HTML_FIND_RESULT__:`）的发送方必须是登记的内容宿主
/// 角色（`RuntimeHost` / `ExternalHost`）——它们是唯一的查找执行面；player /
/// presentation preview / popup 不是，一律拒绝。身份必须与登记 key 对齐：
/// `Item(id)` 只接受数字 `id`，`External(session)` 只接受字符串
/// `external:<session>`（页面 JS 无法伪造 webview label 与登记记录）。
pub(crate) fn find_result_identity_matches(
    role: crate::core::content_session::ContentSurfaceRole,
    key: &crate::core::content_session::RuntimeKey,
    claimed_item_id: Option<&Value>,
) -> bool {
    use crate::core::content_session::{ContentSurfaceRole, RuntimeKey};
    // 角色与 key 域必须配对：label 由 key 派生（`html-host-<id>` /
    // `html-host-ext-<session>`），两者本不可能不一致 —— 不一致即视为不可信。
    match (role, key) {
        (ContentSurfaceRole::RuntimeHost, RuntimeKey::Item(item)) => claimed_item_id
            .and_then(Value::as_i64)
            .map(|claimed| claimed == *item)
            .unwrap_or(false),
        (ContentSurfaceRole::ExternalHost, RuntimeKey::External(session)) => claimed_item_id
            .and_then(Value::as_str)
            .map(|claimed| claimed == format!("external:{session}"))
            .unwrap_or(false),
        _ => false,
    }
}

/// R9：标题桥编辑消息的会话/类型裁决（与 invoke 通道 payload_items_authorized
/// + verify_bridge_message 同一规则）。返回 true 表示允许转发到 main。
///
/// R9-a：`title_bridge_record` 返回 None（未登记 / 已注销 / 已导航离开 /
/// URL 失败）时**必须拒绝**。旧实现 `None => true` 是反向漏洞：已导航到
/// 远程页面的 host 仍挂着标题回调，凭非空 runtimeSessionId 即可把任意 JSON
/// 送入 main，绕过角色 / item / lease 校验。
pub(crate) fn title_bridge_message_authorized<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    webview: &tauri::Webview<R>,
    payload: &Value,
) -> bool {
    let message_type = payload.get("type").and_then(Value::as_str).unwrap_or("");
    let session_id = payload.get("runtimeSessionId").and_then(Value::as_str).unwrap_or("");
    let generation = payload.get("generation").and_then(Value::as_u64).unwrap_or(0);
    if session_id.is_empty() {
        return false;
    }
    // R8 补充：转换探针在 lease 注册**之前**发出（requestHtmlEdit 先探测
    // 再开转换会话），只含两个布尔位、无写能力，登记 + origin + 角色校验
    // 已足够；其余类型一律要求会话身份匹配。
    const PRE_LEASE_TYPES: [&str; 1] = ["html_edit_conversion_probe"];
    let Some(record) = title_bridge_record(app, webview) else {
        // R9-a：失败即拒绝 —— 不从 None 推导可信。
        return false;
    };
    if !record.role.allows_message_type(message_type) {
        return false;
    }
    // R10：item 校验与 invoke 通道共用同一规则（含副本结果 item 的服务端
    // 校验；state 获取失败同样拒绝）。
    let Some(state) = app.try_state::<crate::state::AppState>() else {
        return false;
    };
    if crate::commands::preview::payload_items_authorized(&state, &record, payload).is_err() {
        return false;
    }
    if PRE_LEASE_TYPES.contains(&message_type) {
        return true;
    }
    if !record.runtime_session_id.is_empty() {
        session_id == record.runtime_session_id && generation == record.generation
    } else {
        // P2：lease 只在 Item 身份下存在（外部阅读面没有 item，就不存在编辑
        // lease —— 该分支在当前角色表下已不可达，这里显式表达不留隐含语义）。
        match record.key.item_id() {
            Some(item_id) => state
                .html_edit_session_lease_matches(item_id, session_id, generation)
                .unwrap_or(false),
            None => false,
        }
    }
}

fn detached_embedded_fullscreen_handler<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> impl Fn(tauri::Webview<R>, String) + Send + 'static {
    let app_handle = app.clone();
    move |webview, title| {
        if let Some(rest) = title.strip_prefix(HTML_RUNTIME_VIEW_STATE_PREFIX) {
            // R8：view-state 桥走会话登记 + origin 裁决；JSON 严格解析后
            // 再序列化转发（不把原始字符串交给 eval）。
            // R9-c（Codex 返修）：登记存在不够 —— 标题桥必须与 invoke 通道
            // 共用发送方 item + 当前 surface 身份裁决，否则任何已登记内容页
            // 可伪造其他标签的 view-state（itemId/surfaceToken 均为可猜测的
            // 顺序号，main 侧只按 surfaceToken 匹配目标），覆盖其滚动位置、
            // hash 与演示恢复状态，并以大 sequence 压制后续真实回报。
            if let Some(record) = title_bridge_record(&app_handle, &webview) {
                if let Ok(payload) = serde_json::from_str::<Value>(rest) {
                    let authorized = app_handle
                        .try_state::<crate::state::AppState>()
                        .map(|state| {
                            crate::commands::preview::view_state_payload_authorized(
                                &state, &record, &payload,
                            )
                            .is_ok()
                        })
                        .unwrap_or(false);
                    if authorized {
                        let _ = forward_html_runtime_view_state(&app_handle, &payload);
                    }
                }
            }
            let _ = webview.eval("window.__NUTBOOK_RUNTIME_VIEW_STATE__?.ackTitle?.();");
            return;
        }
        if title.starts_with(HTML_FIND_SHORTCUT_PREFIX) {
            // revision 71：外部临时 host（`html-host-ext-<sessionId>`）与正式
            // item host 走同一 compatibility 脚本，Cmd+F 标题桥同样可达。
            // 身份派生自宿主 label（页面 JS 不可伪造）；main 侧
            // `__NUTBOOK_OPEN_HTML_FIND__` 仅在身份为当前活动 tab 时打开查找。
            let item_id = webview
                .label()
                .strip_prefix("html-host-")
                .and_then(|value| value.parse::<i64>().ok());
            let external_session = webview.label().strip_prefix("html-host-ext-");
            let forward_identity: Option<String> = if let Some(item_id) = item_id {
                Some(item_id.to_string())
            } else if let Some(session_id) = external_session {
                serde_json::to_string(&format!("external:{session_id}")).ok()
            } else {
                None
            };
            if let Some(identity_literal) = forward_identity {
                // R9：标题桥 fallback 与 invoke 通道同一裁决 —— 未登记或已
                // 导航离开注册 origin 的 webview 不能再驱动宿主 UI。
                if title_bridge_record(&app_handle, &webview).is_some() {
                    if let Some(main_webview) = app_handle.get_webview("main") {
                        let _ = main_webview.eval(&format!(
                            "window.__NUTBOOK_OPEN_HTML_FIND__?.({identity_literal});"
                        ));
                    }
                }
            }
            let _ = webview.eval("document.title = document.location.pathname.split('/').pop() || 'Nutbook Runtime';");
            return;
        }
        if let Some(rest) = title.strip_prefix(HTML_FIND_RESULT_PREFIX) {
            // R8：旧实现把 `:` 后的原始字符串直接插入 main.eval —— 内容页
            // 设置 title `__NUTBOOK_HTML_FIND_RESULT__:null);globalThis.x=true;//`
            // 即可在 main 执行任意语句，绕过整个 invoke 闸门。修复：内容必须
            // 先是合法 JSON 对象，再由 serde 序列化为字面量插入；发送方必须是
            // 登记的内容会话。
            // R9-c 分支清点：result payload 携带 itemId（查找脚本以被查页面
            // 的 item 回报），必须等于发送方登记 item，防止伪造他人 item 的
            // 查找计数（main 侧仅校验 itemId 与当前打开的查找面板一致）。
            if let Ok(payload) = serde_json::from_str::<Value>(rest) {
                if payload.is_object() {
                    if let Some(record) = title_bridge_record(&app_handle, &webview) {
                        // revision 83（P2-R80b）：身份裁决提取为窄 helper
                        // （角色 + RuntimeKey 双裁决，见单测矩阵）。语义与
                        // revision 71 一致——Item 只认自己的数字 itemId，
                        // External 只认 `external:<登记 sessionId>`。
                        let item_matches = find_result_identity_matches(
                            record.role,
                            &record.key,
                            payload.get("itemId"),
                        );
                        if item_matches {
                            if let Some(main_webview) = app_handle.get_webview("main") {
                                if let Ok(payload_json) = serde_json::to_string(&payload) {
                                    let _ = main_webview.eval(&format!(
                                        "window.__NUTBOOK_HANDLE_HTML_FIND_RESULT__?.({payload_json});"
                                    ));
                                }
                            }
                        }
                    }
                }
            }
            let _ = webview.eval("document.title = document.location.pathname.split('/').pop() || 'Nutbook Runtime';");
            return;
        }
        if let Some(rest) = title.strip_prefix(HTML_EDIT_RUNTIME_ACTION_PREFIX) {
            // R8：title fallback 与 invoke 通道同一裁决（JSON 解析 + 序列化
            // 转发 + 会话登记 + 角色/类型/lease 校验）。
            if let Ok(payload) = serde_json::from_str::<Value>(rest) {
                let message_type = payload.get("type").and_then(Value::as_str).unwrap_or("");
                let should_log = message_type.starts_with("html_edit_");
                let authorized = title_bridge_message_authorized(&app_handle, &webview, &payload);
                if should_log {
                    let host_item_id = webview
                        .label()
                        .strip_prefix("html-host-")
                        .unwrap_or("-");
                    log_html_edit_debug(
                        "runtime-title",
                        format!(
                            "host_item={} authorized={} {}",
                            host_item_id,
                            authorized,
                            html_edit_debug_payload_fields(&payload)
                        ),
                    );
                }
                if authorized {
                    if let Some(main_webview) = app_handle.get_webview("main") {
                        let payload_json = serde_json::to_string(&payload).unwrap_or_else(|_| "null".to_string());
                        let forwarding_result = main_webview.eval(&format!(
                            "window.__NUTBOOK_HANDLE_HTML_EDIT_RUNTIME_MESSAGE__?.({});",
                            payload_json
                        ));
                        if should_log {
                            log_html_edit_debug(
                                "runtime-forward",
                                format!(
                                    "host_item={} {} result={}",
                                    webview.label().strip_prefix("html-host-").unwrap_or("-"),
                                    html_edit_debug_payload_fields(&payload),
                                    if forwarding_result.is_ok() { "ok" } else { "error" }
                                ),
                            );
                        }
                    }
                }
            }
            return;
        }

        if title.starts_with(HTML_FULLSCREEN_TITLE_PREFIX) {
            let window = webview.window();
            let next_fullscreen = !window.is_fullscreen().unwrap_or(false);
            let runtime_focus_script = format!(
                "try {{ window.__NUTBOOK_HOST_FULLSCREEN__ = {}; window.__NUTBOOK_FOCUS_RUNTIME__?.(); }} catch (_) {{}}",
                if next_fullscreen { "true" } else { "false" }
            );
            if let Some(main_webview) = app_handle.get_webview("main") {
                let _ = main_webview.eval(
                    "try { if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur(); } catch (_) {}"
                );
            }
            let _ = window.set_fullscreen(next_fullscreen);
            if let Some(item_id) = webview
                .label()
                .strip_prefix("html-host-")
                .and_then(|value| value.parse::<i64>().ok())
            {
                if let Some(main_webview) = app_handle.get_webview("main") {
                    let _ = main_webview.eval(&format!(
                        "window.__NUTBOOK_SET_RUNTIME_FULLSCREEN__?.({item_id}, {});",
                        if next_fullscreen { "true" } else { "false" }
                    ));
                }
            }
            // The main WebView owns the post-layout host/controls sync and
            // returns focus once it has settled. Repeated native timer-based
            // focus steals can race that sync after the second fullscreen run.
            let _ = webview.eval(&runtime_focus_script);
            let _ = webview.eval(
                "document.title = document.title.replace(/^__NUTBOOK_TOGGLE_FULLSCREEN__:\\d+$/, document.location.pathname.split('/').pop() || 'Nutbook Runtime');"
            );
            return;
        }

    }
}

fn html_runtime_view_state_script(
    item_id: i64,
    surface_token: u64,
    initial_view_state: Option<&Value>,
) -> String {
    r#"
(() => {
  const itemId = __NUTBOOK_ITEM_ID__;
  const surfaceToken = __NUTBOOK_SURFACE_TOKEN__;
  const initialViewState = __NUTBOOK_INITIAL_VIEW_STATE__;
  const titlePrefix = '__NUTBOOK_HTML_RUNTIME_VIEW_STATE__:';
  let active = false;
  let sequence = 0;
  let reportTimer = 0;
  let fallbackTitle = null;
  let activePageId = null;
  let presentationSubscribed = false;
  let presentationProbeFrames = 0;
  let restoreRun = 0;
  let restoring = false;

  const scrollRoot = () => document.scrollingElement || document.documentElement || document.body;
  const finitePosition = (value) => Math.min(100000000, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0));
  const currentState = (requestId = null) => {
    const root = scrollRoot();
    return {
      type: 'html_runtime_view_state',
      itemId,
      surfaceToken,
      sequence: ++sequence,
      requestId: requestId || null,
      scrollX: finitePosition(root?.scrollLeft ?? window.scrollX),
      scrollY: finitePosition(root?.scrollTop ?? window.scrollY),
      hash: String(location.hash || '').slice(0, 2048),
      presentationPageId: typeof activePageId === 'string' ? activePageId.slice(0, 512) : null
    };
  };
  const fallbackReport = (payload) => {
    if (String(document.title || '').startsWith('__NUTBOOK_')) return;
    fallbackTitle = document.title;
    document.title = titlePrefix + JSON.stringify(payload);
  };
  const emit = (requestId = null) => {
    if (!active && !requestId) return;
    const payload = currentState(requestId);
    const invoke = window.__TAURI_INTERNALS__?.invoke;
    if (typeof invoke === 'function') {
      Promise.resolve(invoke('html_runtime_view_state_command', { payload })).catch(() => fallbackReport(payload));
    } else {
      fallbackReport(payload);
    }
  };
  const scheduleReport = () => {
    if (!active || restoring) return;
    window.clearTimeout(reportTimer);
    reportTimer = window.setTimeout(() => emit(), 90);
  };
  const flush = (requestId) => {
    window.clearTimeout(reportTimer);
    emit(String(requestId || ''));
  };
  const ensurePresentationBridge = async () => {
    const bridge = window.__NUTBOOK_PRESENTATION__;
    if (!bridge || bridge.version !== 1 || typeof bridge.goTo !== 'function') return null;
    if (!presentationSubscribed) {
      presentationSubscribed = true;
      try {
        await bridge.whenReady?.();
        const pageId = await bridge.getActivePageId?.();
        if (typeof pageId === 'string') activePageId = pageId;
        bridge.subscribe?.((nextPageId) => {
          if (typeof nextPageId !== 'string') return;
          activePageId = nextPageId;
          scheduleReport();
        });
      } catch (_) {}
    }
    return bridge;
  };
  const probePresentationBridge = () => {
    ensurePresentationBridge().then((bridge) => {
      if (bridge || presentationProbeFrames >= 300) return;
      presentationProbeFrames += 1;
      requestAnimationFrame(probePresentationBridge);
    });
  };
  const finishRestore = (run) => {
    if (run !== restoreRun) return;
    restoring = false;
    scheduleReport();
  };
  const cancelRestoreForUser = (event) => {
    if (!restoring || event?.isTrusted === false) return;
    restoreRun += 1;
    restoring = false;
    scheduleReport();
  };
  const restore = (rawState) => {
    active = true;
    const state = rawState && typeof rawState === 'object' ? rawState : null;
    if (!state) return;
    const run = ++restoreRun;
    restoring = true;
    const targetX = finitePosition(state.scrollX);
    const targetY = finitePosition(state.scrollY);
    const targetHash = typeof state.hash === 'string' && (state.hash === '' || state.hash.startsWith('#'))
      ? state.hash.slice(0, 2048)
      : '';
    const targetPageId = typeof state.presentationPageId === 'string'
      ? state.presentationPageId.slice(0, 512)
      : null;
    try {
      if (location.hash !== targetHash) {
        history.replaceState(history.state, '', `${location.pathname}${location.search}${targetHash}`);
      }
    } catch (_) {}
    let frame = 0;
    let pageApplied = !targetPageId;
    const apply = async () => {
      if (run !== restoreRun) return;
      if (!pageApplied) {
        const bridge = await ensurePresentationBridge();
        if (run !== restoreRun) return;
        if (bridge) {
          try { await bridge.whenReady?.(); await bridge.goTo(targetPageId); activePageId = targetPageId; } catch (_) {}
          pageApplied = true;
        }
      }
      const root = scrollRoot();
      const maxX = Math.max(0, Number(root?.scrollWidth || 0) - Number(root?.clientWidth || 0));
      const maxY = Math.max(0, Number(root?.scrollHeight || 0) - Number(root?.clientHeight || 0));
      window.scrollTo(Math.min(targetX, maxX), Math.min(targetY, maxY));
      const positionReady = targetX <= maxX + 1 && targetY <= maxY + 1;
      if ((positionReady && pageApplied) || frame >= 300) {
        finishRestore(run);
        return;
      }
      frame += 1;
      requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener('load', apply, { once: true });
  };

  window.__NUTBOOK_RUNTIME_VIEW_STATE__ = {
    restore,
    flush,
    ackTitle() {
      if (fallbackTitle != null && String(document.title || '').startsWith(titlePrefix)) document.title = fallbackTitle;
      fallbackTitle = null;
    }
  };
  if (initialViewState) {
    restore(initialViewState);
  } else if (Object.prototype.hasOwnProperty.call(window, '__NUTBOOK_PENDING_RUNTIME_VIEW_STATE__')) {
    const pendingState = window.__NUTBOOK_PENDING_RUNTIME_VIEW_STATE__;
    delete window.__NUTBOOK_PENDING_RUNTIME_VIEW_STATE__;
    restore(pendingState);
  }
  window.addEventListener('scroll', scheduleReport, { passive: true });
  document.addEventListener('scroll', scheduleReport, { passive: true, capture: true });
  window.addEventListener('hashchange', scheduleReport);
  window.addEventListener('wheel', cancelRestoreForUser, { passive: true });
  window.addEventListener('touchstart', cancelRestoreForUser, { passive: true });
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) cancelRestoreForUser(event);
  }, true);
  probePresentationBridge();
  window.setTimeout(() => { active = true; }, 250);
})();
"#
    .replace("__NUTBOOK_ITEM_ID__", &item_id.to_string())
    .replace("__NUTBOOK_SURFACE_TOKEN__", &surface_token.to_string())
    .replace(
        "__NUTBOOK_INITIAL_VIEW_STATE__",
        &initial_view_state
            .and_then(|state| serde_json::to_string(state).ok())
            .unwrap_or_else(|| "null".to_string()),
    )
}

pub fn html_runtime_compatibility_script() -> &'static str {
    r#"
(() => {
  const originalOpen = window.open;
  window.__NUTBOOK_HOST_FULLSCREEN__ = false;
  window.open = function(...args) {
    if (!args[0]) args[0] = 'about:blank';
    const opened = originalOpen.apply(window, args);
    return opened;
  };

  const rootElement = document.documentElement;
  const vendorFullscreenName = [
    'webkitRequestFullscreen',
    'webkitRequestFullScreen',
    'mozRequestFullScreen',
    'msRequestFullscreen'
  ].find((name) => typeof rootElement?.[name] === 'function' || typeof Element.prototype[name] === 'function');

  if (!Element.prototype.requestFullscreen && vendorFullscreenName) {
    Element.prototype.requestFullscreen = function(...args) {
      const vendorMethod = this[vendorFullscreenName] || Element.prototype[vendorFullscreenName];
      if (!vendorMethod) {
        return Promise.reject(new Error('vendor fullscreen method missing'));
      }
      return vendorMethod.apply(this, args);
    };
  }
  if (!document.exitFullscreen && document.webkitExitFullscreen) {
    document.exitFullscreen = function(...args) {
      return document.webkitExitFullscreen(...args);
    };
  }

  const ensureRuntimeFocusTarget = () => {
    try {
      const focusTarget = document.body || document.documentElement;
      if (focusTarget && !focusTarget.hasAttribute('tabindex')) {
        focusTarget.setAttribute('tabindex', '-1');
      }
      return focusTarget || null;
    } catch (_) {
      return null;
    }
  };

  const focusRuntimeTarget = () => {
    try {
      const active = document.activeElement;
      const editable = active && (
        active.isContentEditable ||
        active.matches?.('input, textarea, select, [data-nutbook-editing]')
      );
      (editable ? active : ensureRuntimeFocusTarget())?.focus?.({ preventScroll: true });
    } catch (_) {}
  };

  const revealFindSelection = () => {
    try {
      const selection = window.getSelection?.();
      if (!selection?.rangeCount) return;
      const node = selection.getRangeAt(0).commonAncestorContainer;
      const anchor = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
      anchor?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    } catch (_) {}
  };

  // Decks commonly keep their page state in a private `go()` closure. Native
  // window.find cannot move that state machine, so it only selects text on
  // the visible slide. Prefer a public presentation bridge; otherwise replay
  // the deck's own Arrow key handler rather than assuming a hash convention.
  const findAcrossPresentationPages = ({ query, caseSensitive, backwards, action, done }) => {
    const slides = Array.from(document.querySelectorAll('.slide'));
    if (slides.length < 2) return false;
    const needle = String(query || '');
    if (!needle) return false;
    const normalize = (value) => caseSensitive ? String(value || '') : String(value || '').toLocaleLowerCase();
    const sourceNeedle = normalize(needle);
    const matches = [];
    slides.forEach((slide, pageIndex) => {
      const text = normalize(slide.innerText || slide.textContent || '');
      let offset = 0;
      while (sourceNeedle && (offset = text.indexOf(sourceNeedle, offset)) >= 0) {
        matches.push(pageIndex);
        offset += Math.max(1, sourceNeedle.length);
      }
    });
    if (!matches.length) return false;
    const state = window.__NUTBOOK_PRESENTATION_FIND_STATE__ || {};
    const key = `${caseSensitive ? '1' : '0'}:${needle}`;
    let cursor;
    if (state.key !== key || action === 'query') {
      const activePage = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
      cursor = matches.findIndex((pageIndex) => pageIndex >= activePage);
      if (cursor < 0) cursor = 0;
    } else {
      cursor = Number(state.cursor || 0) + (backwards ? -1 : 1);
      cursor = (cursor + matches.length) % matches.length;
    }
    window.__NUTBOOK_PRESENTATION_FIND_STATE__ = { key, cursor };
    const targetPage = matches[cursor];
    const selectOnTargetPage = () => {
      window.find(needle, Boolean(caseSensitive), Boolean(backwards), true, false, false, false);
      revealFindSelection();
      done?.(cursor + 1);
    };
    const activePage = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
    if (targetPage === activePage) {
      selectOnTargetPage();
      return true;
    }
    const bridge = window.__NUTBOOK_PRESENTATION__;
    const targetPageId = slides[targetPage]?.dataset?.nutbookPageId;
    if (bridge?.version === 1 && targetPageId && bridge.goTo?.(targetPageId) !== false) {
      requestAnimationFrame(selectOnTargetPage);
      return true;
    }
    const direction = targetPage > activePage ? 'ArrowRight' : 'ArrowLeft';
    for (let step = 0; step < Math.abs(targetPage - activePage); step += 1) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: direction, code: direction, bubbles: true }));
    }
    requestAnimationFrame(() => requestAnimationFrame(selectOnTargetPage));
    return true;
  };

  const isRuntimeFullscreen = () => Boolean(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.webkitCurrentFullScreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );

  const refocusRuntimeSoon = () => {
    [60, 180, 420, 800].forEach((delay) => {
      setTimeout(focusRuntimeTarget, delay);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureRuntimeFocusTarget, { once: true });
  } else {
    ensureRuntimeFocusTarget();
  }
  window.addEventListener('pageshow', ensureRuntimeFocusTarget);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) ensureRuntimeFocusTarget();
  });
  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      if (!isRuntimeFullscreen()) {
        refocusRuntimeSoon();
      }
    }, true);
  });

  const requestRuntimeFullscreen = () => {
    // Embedded runtimes always delegate fullscreen to the host window.
    // Mixing DOM fullscreen and host fullscreen causes focus drift after exit.
    document.title = `__NUTBOOK_TOGGLE_FULLSCREEN__:${Date.now()}`;
    if (isRuntimeFullscreen()) {
      refocusRuntimeSoon();
    }
  };

  const isEscapeKey = (event) => (
    event.key === 'Escape' ||
    event.key === 'Esc' ||
    event.code === 'Escape' ||
    event.keyCode === 27 ||
    event.which === 27
  );

  const isEditableShortcutTarget = (target) => {
    const node = target?.nodeType === Node.ELEMENT_NODE ? target : target?.parentElement;
    if (!node) return false;
    return Boolean(node.closest?.('input, textarea, select, [contenteditable], [data-nutbook-editing]'));
  };

  const isNutbookHtmlEditActive = () => {
    try {
      return Boolean(window.__NUTBOOK_HTML_EDIT__?.isEditing?.());
    } catch (_) {
      return false;
    }
  };

  const handleRuntimeShortcut = (event) => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && String(event.key).toLowerCase() === 'f') {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      document.title = `__NUTBOOK_HTML_FIND_SHORTCUT__:${Date.now()}`;
      return;
    }
    if (isNutbookHtmlEditActive()) return;
    if (
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      typeof event.key === 'string' &&
      event.key.length === 1 &&
      !isEditableShortcutTarget(event.target)
    ) {
      // Prevent macOS input-method composition windows while still allowing the
      // page's own key handlers to receive slide shortcuts such as s/f/arrows.
      event.preventDefault();
    }
    if ((event.key === 'f' || event.key === 'F') && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      requestRuntimeFullscreen();
      return;
    }
    if (isEscapeKey(event) && window.__NUTBOOK_HOST_FULLSCREEN__) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      requestRuntimeFullscreen();
    }
  };

  document.addEventListener('keydown', handleRuntimeShortcut, true);
  window.addEventListener('keydown', handleRuntimeShortcut, true);
  document.addEventListener('keyup', (event) => {
    if (isNutbookHtmlEditActive()) return;
    if (!isEscapeKey(event) || !window.__NUTBOOK_HOST_FULLSCREEN__) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    requestRuntimeFullscreen();
  }, true);

  window.__NUTBOOK_FOCUS_RUNTIME__ = focusRuntimeTarget;
  window.__NUTBOOK_FIND_ACROSS_PRESENTATION_PAGES__ = findAcrossPresentationPages;
})();
"#
}

fn html_runtime_controls_overlay_init_script(
    item_id: i64,
    is_favorite: bool,
    is_fullscreen: bool,
    is_editing: bool,
    is_primary_busy: bool,
    custom_tag: Option<Tag>,
    available_tags: Vec<Tag>,
    skill_tag: Option<String>,
    type_tag: Option<String>,
    custom_tags: Vec<Tag>,
    source_badges: Vec<ItemSourceBadge>,
    file_name: String,
) -> String {
    let custom_tag_json = serde_json::to_string(&custom_tag).unwrap_or_else(|_| "null".to_string());
    let available_tags_json = serde_json::to_string(&available_tags).unwrap_or_else(|_| "[]".to_string());
    let skill_tag_json = serde_json::to_string(&skill_tag).unwrap_or_else(|_| "null".to_string());
    let type_tag_json = serde_json::to_string(&type_tag).unwrap_or_else(|_| "null".to_string());
    let custom_tags_json = serde_json::to_string(&custom_tags).unwrap_or_else(|_| "[]".to_string());
    let source_badges_json = serde_json::to_string(&source_badges).unwrap_or_else(|_| "[]".to_string());
    let file_name_json = serde_json::to_string(&file_name).unwrap_or_else(|_| "\"\"".to_string());
    format!(
        "window.__NUTBOOK_RUNTIME_CONTROLS__ = {{ itemId: {item_id}, isFavorite: {}, isFullscreen: {}, isEditing: {}, isPrimaryBusy: {}, customTag: {custom_tag_json}, availableTags: {available_tags_json}, skillTag: {skill_tag_json}, typeTag: {type_tag_json}, customTags: {custom_tags_json}, sourceBadges: {source_badges_json}, fileName: {file_name_json} }};",
        if is_favorite { "true" } else { "false" },
        if is_fullscreen { "true" } else { "false" },
        if is_editing { "true" } else { "false" },
        if is_primary_busy { "true" } else { "false" }
    )
}

fn html_edit_toolbar_init_script(
    item_id: i64,
    runtime_session_id: &str,
    generation: u64,
    dirty: bool,
    selected_data_id: Option<&str>,
    format_state: &HtmlEditToolbarFormatState,
) -> String {
    let payload = serde_json::json!({
        "itemId": item_id,
        "runtimeSessionId": runtime_session_id,
        "generation": generation,
        "dirty": dirty,
        "selectedDataId": selected_data_id,
        "formatState": format_state,
    });
    format!("window.__NUTBOOK_HTML_EDIT_TOOLBAR__ = {payload};")
}

fn html_edit_leave_confirm_init_script(item_id: i64, mode: &str, file_name: &str, request_id: &str) -> String {
    format!(
        "window.__NUTBOOK_HTML_EDIT_LEAVE_CONFIRM__ = {{ itemId: {item_id}, mode: {}, fileName: {}, requestId: {} }};",
        serde_json::to_string(mode).unwrap(),
        serde_json::to_string(file_name).unwrap(),
        serde_json::to_string(request_id).unwrap()
    )
}

pub fn html_edit_toolbar_update_script(
    runtime_session_id: &str,
    generation: u64,
    dirty: bool,
    selected_data_id: Option<&str>,
    format_state: &HtmlEditToolbarFormatState,
) -> String {
    let payload = serde_json::json!({
        "runtimeSessionId": runtime_session_id,
        "generation": generation,
        "dirty": dirty,
        "selectedDataId": selected_data_id,
        "formatState": format_state,
    });
    format!("window.__NUTBOOK_HTML_EDIT_TOOLBAR_UPDATE__?.({payload});")
}

fn settings_overlay_init_script(tab: Option<String>, mode: Option<String>) -> String {
    let tab_json = serde_json::to_string(&tab.unwrap_or_else(|| "skills".to_string()))
        .unwrap_or_else(|_| "\"skills\"".to_string());
    let mode_json = serde_json::to_string(&mode.unwrap_or_else(|| "menu".to_string()))
        .unwrap_or_else(|_| "\"menu\"".to_string());
    format!(
        "document.documentElement.dataset.nutbookSettingsOverlay = 'true'; const nutbookSettingsOverlayBootStyle = document.createElement('style'); nutbookSettingsOverlayBootStyle.textContent = 'html[data-nutbook-settings-overlay],html[data-nutbook-settings-overlay] body{{background:transparent!important}}html[data-nutbook-settings-overlay] body:not(.settings-overlay-mode) .app-shell,html[data-nutbook-settings-overlay] body:not(.settings-overlay-mode) .footer-bar{{visibility:hidden!important}}'; (document.head || document.documentElement).appendChild(nutbookSettingsOverlayBootStyle); window.__NUTBOOK_SETTINGS_OVERLAY__ = true; window.__NUTBOOK_SETTINGS_OVERLAY_TAB__ = {tab_json}; window.__NUTBOOK_SETTINGS_OVERLAY_MODE__ = {mode_json};"
    )
}

fn settings_overlay_open_script(tab: Option<String>, mode: Option<String>) -> String {
    let tab_json = serde_json::to_string(&tab.unwrap_or_else(|| "skills".to_string()))
        .unwrap_or_else(|_| "\"skills\"".to_string());
    let mode_json = serde_json::to_string(&mode.unwrap_or_else(|| "menu".to_string()))
        .unwrap_or_else(|_| "\"menu\"".to_string());
    format!("window.__NUTBOOK_OPEN_SETTINGS_OVERLAY__?.({tab_json}, {mode_json});")
}

fn html_runtime_controls_overlay_update_script(
    item_id: i64,
    is_favorite: bool,
    is_fullscreen: bool,
    is_editing: bool,
    is_primary_busy: bool,
    custom_tag: Option<Tag>,
    available_tags: Vec<Tag>,
    skill_tag: Option<String>,
    type_tag: Option<String>,
    custom_tags: Vec<Tag>,
    source_badges: Vec<ItemSourceBadge>,
    file_name: String,
) -> String {
    let custom_tag_json = serde_json::to_string(&custom_tag).unwrap_or_else(|_| "null".to_string());
    let available_tags_json = serde_json::to_string(&available_tags).unwrap_or_else(|_| "[]".to_string());
    let skill_tag_json = serde_json::to_string(&skill_tag).unwrap_or_else(|_| "null".to_string());
    let type_tag_json = serde_json::to_string(&type_tag).unwrap_or_else(|_| "null".to_string());
    let custom_tags_json = serde_json::to_string(&custom_tags).unwrap_or_else(|_| "[]".to_string());
    let source_badges_json = serde_json::to_string(&source_badges).unwrap_or_else(|_| "[]".to_string());
    let file_name_json = serde_json::to_string(&file_name).unwrap_or_else(|_| "\"\"".to_string());
    format!(
        "window.__NUTBOOK_UPDATE_OVERLAY_STATE__?.({{\"itemId\": {item_id}, \"isFavorite\": {}, \"isFullscreen\": {}, \"isEditing\": {}, \"isPrimaryBusy\": {}, \"customTag\": {custom_tag_json}, \"availableTags\": {available_tags_json}, \"skillTag\": {skill_tag_json}, \"typeTag\": {type_tag_json}, \"customTags\": {custom_tags_json}, \"sourceBadges\": {source_badges_json}, \"fileName\": {file_name_json}}});",
        if is_favorite { "true" } else { "false" },
        if is_fullscreen { "true" } else { "false" },
        if is_editing { "true" } else { "false" },
        if is_primary_busy { "true" } else { "false" }
    )
}

fn html_find_overlay_init_script(
    identity: serde_json::Value,
    can_replace: bool,
    replace_expanded: bool,
    query: &str,
    count: &str,
    case_sensitive: bool,
    labels: &std::collections::BTreeMap<String, String>,
    history: &[String],
    focus_query: bool,
) -> String {
    let identity_json = serde_json::to_string(&identity).unwrap_or_else(|_| "null".to_string());
    let query = serde_json::to_string(query).unwrap_or_else(|_| "\"\"".to_string());
    let count = serde_json::to_string(count).unwrap_or_else(|_| "\"0/0\"".to_string());
    let labels = serde_json::to_string(labels).unwrap_or_else(|_| "{}".to_string());
    let history = serde_json::to_string(history).unwrap_or_else(|_| "[]".to_string());
    format!(
        "window.__NUTBOOK_HTML_FIND_INITIAL__={{itemId:{identity_json},canReplace:{can_replace},replaceExpanded:{replace_expanded},query:{query},count:{count},caseSensitive:{case_sensitive},labels:{labels},history:{history},focusQuery:{focus_query}}};window.__NUTBOOK_HTML_FIND__?.update?.(window.__NUTBOOK_HTML_FIND_INITIAL__);"
    )
}

#[cfg(test)]
mod tests {
    use crate::models::{HtmlEditToolbarFormatState, ItemDetail, ItemSummary};

    use super::{
        external_html_find_action_script, external_view_state_capture_script,
        external_view_state_restore_script,
        find_result_identity_matches, html_edit_toolbar_label, html_edit_toolbar_update_script,
        html_find_overlay_init_script,
        html_find_overlay_label, html_find_overlay_label_for, html_runtime_compatibility_script,
        html_runtime_controls_label_for, html_runtime_host_label, html_runtime_host_label_for,
        html_presentation_preview_label_for, html_runtime_shortcut_script,
        html_runtime_view_state_script, html_runtime_window_label, html_runtime_window_label_for,
        presentation_preview_init_script,
        presentation_preview_update_script,
        EXTERNAL_HTML_FIND_CLOSE_SCRIPT, EXTERNAL_HTML_FIND_MAX_QUERY_BYTES,
        HTML_EDIT_RUNTIME_ACTION_PREFIX, HtmlFindActionPayload, HtmlRuntimeSession,
    };
    use crate::core::content_session::RuntimeKey;

    /// P2 / §6.2：promotion 采集脚本只做「读一次滚动 + hash + 演示页 id 并
    /// 回报」，不得携带 surface token、不得注册常驻全局或监听事件。
    /// revision 71：演示页 id 经公开 presentation bridge 有界读取（120ms/60ms）。
    #[test]
    fn external_view_state_capture_script_is_one_shot_and_tokenless() {
        let script = external_view_state_capture_script("ext-1", 4, "req-9");
        assert!(script.contains("external_html_view_state_report_command"));
        assert!(script.contains("location.hash"));
        assert!(script.contains("scrollY"));
        // revision 71：演示页 id 经公开桥读取，随 viewState 一次性回传。
        assert!(script.contains("__NUTBOOK_PRESENTATION__"));
        assert!(script.contains("getActivePageId"));
        assert!(script.contains("presentationPageId"));
        assert!(script.contains("bounded(bridge.whenReady(), 120)"));
        assert!(script.contains("bounded(bridge.getActivePageId(), 60)"));
        assert!(!script.contains("__NUTBOOK_SURFACE_TOKEN__"));
        assert!(!script.contains("surfaceToken"));
        assert!(!script.contains("addEventListener"));
        assert!(!script.contains("__NUTBOOK_RUNTIME_VIEW_STATE__"));
        // 会话 id 与 requestId 必须走 JSON 字面量，注入引号不能逃逸。
        let escaped = external_view_state_capture_script("a\"b\\c", 1, "r\"1");
        assert!(escaped.contains(r#""a\"b\\c""#), "session id must be JSON-escaped");
        assert!(escaped.contains(r#""r\"1""#), "request id must be JSON-escaped");
    }

    /// P2-R92a：外部回放脚本必须「只恢复滚动 / hash / 演示页」，且随快照
    /// 注入的字面量不可逃逸。它不是常驻协议：不得注册全局对象、不得监听
    /// 持久事件（只监听用于让位给用户的输入事件）、不得 pushState。
    #[test]
    fn external_view_state_restore_script_restores_bounded_and_escapes_state() {
        let script = external_view_state_restore_script(&serde_json::json!({
            "scrollX": 4,
            "scrollY": 987,
            "hash": "#page-7",
            "presentationPageId": "bridge-b"
        }));
        assert!(script.contains("window.scrollTo"), "回放必须恢复滚动");
        assert!(script.contains("history.replaceState"), "回放必须恢复 hash（不新增历史条目）");
        assert!(script.contains("location.hash"));
        assert!(script.contains("__NUTBOOK_PRESENTATION__"));
        assert!(script.contains("bridge.goTo(targetPageId)"), "回放必须恢复演示页");
        // 有界：就绪等待与滚动收敛都有帧上限，不靠固定延时。
        assert!(script.contains("waitFrames >= 600"));
        assert!(script.contains("frame >= 300"));
        assert!(script.contains("bounded(bridge.whenReady(), 120)"));
        // 不是常驻协议：不注册全局、不携带 surface token。
        assert!(!script.contains("__NUTBOOK_RUNTIME_VIEW_STATE__"));
        assert!(!script.contains("__NUTBOOK_SURFACE_TOKEN__"));
        assert!(!script.contains("surfaceToken"));
        assert!(!script.contains("pushState"));
        // 快照经 JSON 字面量注入：注入引号 / 反斜杠不能逃逸出字面量。
        let escaped = external_view_state_restore_script(&serde_json::json!({
            "scrollY": 1,
            "hash": "#a\"b\\c",
            "presentationPageId": null
        }));
        assert!(escaped.contains(r#"#a\"b\\c"#), "hash 必须 JSON 转义");
        // 无快照时不产生脚本调用方——由 builder 决定不注入（此处仅固定形状）。
        let nullish = external_view_state_restore_script(&serde_json::Value::Null);
        assert!(nullish.contains("const initial = null;"), "null 快照应原样成为字面量并由脚本早退");
    }

    /// revision 71：find overlay label 由 RuntimeKey 派生——Item 分支与原
    /// label 完全一致，External 派生独立命名空间。
    #[test]
    fn html_find_overlay_label_matches_runtime_key() {
        assert_eq!(html_find_overlay_label_for(&RuntimeKey::Item(42)), "html-find-42");
        assert_eq!(html_find_overlay_label_for(&RuntimeKey::Item(7)), html_find_overlay_label(7));
        assert_eq!(
            html_find_overlay_label_for(&RuntimeKey::External("ext-abc-1".to_string())),
            "html-find-ext-abc-1"
        );
    }

    /// revision 71：find overlay 初始身份内嵌——Item 是数字字面量，External
    /// 是 JSON 字符串字面量（注入引号不能逃逸）。
    #[test]
    fn html_find_overlay_init_script_embeds_identity_literal() {
        let labels = std::collections::BTreeMap::new();
        let item_script = html_find_overlay_init_script(
            serde_json::Value::from(42), false, false, "q", "0/0", false, &labels, &[], true,
        );
        assert!(item_script.contains("itemId:42,"), "item 身份必须是数字字面量");
        let external_script = html_find_overlay_init_script(
            serde_json::Value::String("external:ext-1".to_string()),
            false, false, "q", "0/0", false, &labels, &[], true,
        );
        assert!(
            external_script.contains(r#"itemId:"external:ext-1","#),
            "外部身份必须是 JSON 字符串字面量"
        );
        let escaped = html_find_overlay_init_script(
            serde_json::Value::String("external:a\"b".to_string()),
            false, false, "q", "0/0", false, &labels, &[], true,
        );
        assert!(escaped.contains(r#"itemId:"external:a\"b","#), "外部身份必须 JSON 转义");
    }

    /// revision 74（P2-R71a）：外部查找动作 deny-by-default——只放行
    /// query / next / prev / close；replace 一族（§6.2 外部不开放编辑）与
    /// 任意其它动作（含 hostile 页面能想到的任意文本）必须被拒。
    #[test]
    fn external_html_find_action_script_rejects_non_find_actions() {
        for hostile in [
            "replace",
            "replace_all",
            "eval",
            "",
            "query;eval(1)",
            "window.alert(1)",
            "QUERY",
        ] {
            assert!(
                external_html_find_action_script("ext-1", hostile, "q", false).is_err(),
                "动作 {hostile:?} 必须被拒（deny-by-default）"
            );
        }
        assert!(external_html_find_action_script("ext-1", "query", "q", false).is_ok());
        assert!(external_html_find_action_script("ext-1", "next", "q", false).is_ok());
        assert!(external_html_find_action_script("ext-1", "prev", "q", false).is_ok());
        assert!(external_html_find_action_script("ext-1", "close", "", false).is_ok());
    }

    /// revision 74（P2-R71a）：固定模板 + JSON 字面量注入——hostile query
    /// 不能逃逸出字符串字面量，itemId 固定为登记会话，backwards 随动作映射，
    /// 外部脚本不含 replace/execCommand 分支。
    #[test]
    fn external_html_find_action_script_is_fixed_template_with_json_literals() {
        let hostile_query = "\"); window.__PWNED__ = 1; (\"";
        let script =
            external_html_find_action_script("ext-1", "query", hostile_query, true).unwrap();
        // 固定模板开头：参数只能以 const 声明进入，不存在裸插值面。
        assert!(script.starts_with(";(()=>{const q="));
        // hostile 载荷必须整体以 JSON 转义形式出现（引号被转义即无法闭合字面量）。
        let escaped = serde_json::to_string(hostile_query).unwrap();
        assert!(script.contains(&format!("const q={escaped},")));
        // itemId 固定为登记会话的字面量（标题桥 External 分支据此校验）。
        assert!(script.contains(r#"itemId="external:ext-1";"#));
        // query/next 向后查找为 false，prev 为 true（桥钩子对象属性 +
        // window.find 位置参数两处一致）。
        let next_script = external_html_find_action_script("ext-1", "next", "q", false).unwrap();
        assert_eq!(next_script.matches("backwards:false").count(), 1);
        assert!(next_script.contains("window.find(q,cs,false,true,false,false,false)"));
        let prev_script = external_html_find_action_script("ext-1", "prev", "q", false).unwrap();
        assert_eq!(prev_script.matches("backwards:true").count(), 1);
        assert!(prev_script.contains("window.find(q,cs,true,true,false,false,false)"));
        // 外部脚本不含替换能力（§6.2）：无 replacement / execCommand / insertText。
        assert!(!script.contains("replacement"));
        assert!(!script.contains("execCommand"));
        assert!(!script.contains("insertText"));
        // close 是固定文本，没有任何插值面。
        assert_eq!(
            external_html_find_action_script("ext-1", "close", "", false).unwrap(),
            EXTERNAL_HTML_FIND_CLOSE_SCRIPT
        );
        assert_eq!(
            external_html_find_action_script("a\"b", "close", "", false).unwrap(),
            EXTERNAL_HTML_FIND_CLOSE_SCRIPT
        );
    }

    /// revision 77（P2-R71b）：query 字节上限——边界内（含多字节）通过，
    /// 边界外（含多字节中文）拒绝且不产出脚本；close 不携带 query，超限
    /// query 不影响 close；未知 / replace 动作仍 deny-by-default。
    #[test]
    fn external_html_find_action_script_caps_query_bytes() {
        // 边界内恰好 4096 UTF-8 字节：1365 × 3 + 1。
        let at_limit = format!("{}a", "松".repeat(1365));
        assert_eq!(at_limit.len(), EXTERNAL_HTML_FIND_MAX_QUERY_BYTES);
        assert!(
            external_html_find_action_script("ext-1", "query", &at_limit, false).is_ok(),
            "边界内的多字节 query 必须通过"
        );
        // 纯 ASCII 超限 1 字节即拒绝。
        let over = "a".repeat(EXTERNAL_HTML_FIND_MAX_QUERY_BYTES + 1);
        assert!(external_html_find_action_script("ext-1", "query", &over, false).is_err());
        // 多字节超限：1366 × 3 = 4098 字节。
        let multibyte_over = "松".repeat(1366);
        assert_eq!(multibyte_over.len(), EXTERNAL_HTML_FIND_MAX_QUERY_BYTES + 2);
        assert!(external_html_find_action_script("ext-1", "next", &multibyte_over, false).is_err());
        assert!(external_html_find_action_script("ext-1", "prev", &multibyte_over, false).is_err());
        // close 不携带 query：超限 query 也不影响 close（close 无查找面）。
        assert!(external_html_find_action_script("ext-1", "close", &over, false).is_ok());
        // 未知 / replace 一族仍拒绝（不受上限校验影响）。
        assert!(external_html_find_action_script("ext-1", "replace", "q", false).is_err());
        assert!(external_html_find_action_script("ext-1", "replace_all", "q", false).is_err());
        assert!(external_html_find_action_script("ext-1", "eval", &over, false).is_err());
    }

    /// revision 83（P2-R80b）根因回归：find 动作载荷必须同时接受数字身份
    /// （正式 item）与字符串身份（外部临时 host 的 `external:<sessionId>`）。
    ///
    /// 旧实现 `item_id: i64` 会让外部 overlay 的每个动作在标题桥反序列化处
    /// 失败；该分支没有 else 兜底，失败即静默丢弃 —— 用户实测表现为正文
    /// 查找恒 `0/0`，而 promotion 后（数字身份）一切正常。
    #[test]
    fn html_find_action_payload_accepts_item_and_external_identity() {
        let item: HtmlFindActionPayload = serde_json::from_str(
            r#"{"itemId":42,"action":"query","query":"松塔","replacement":"","caseSensitive":false,"replaceExpanded":false}"#,
        )
        .expect("数字身份必须可反序列化");
        assert_eq!(item.item_id, serde_json::Value::from(42));
        assert_eq!(item.action, "query");
        assert_eq!(item.query, "松塔");

        let external: HtmlFindActionPayload = serde_json::from_str(
            r#"{"itemId":"external:ext-1","action":"query","query":"松塔","replacement":"","caseSensitive":true,"replaceExpanded":false}"#,
        )
        .expect("外部字符串身份必须可反序列化");
        assert_eq!(
            external.item_id,
            serde_json::Value::from("external:ext-1"),
            "外部身份原样承载（不解析成数字、不丢失字符串）"
        );
        assert!(external.case_sensitive);
        // 原样回传：main 侧读到的 itemId 必须与 tab.id 同形（字符串）。
        let round_trip: serde_json::Value =
            serde_json::to_value(&external).expect("载荷必须可序列化回前端");
        assert_eq!(round_trip.get("itemId").and_then(serde_json::Value::as_str), Some("external:ext-1"));
    }

    /// revision 83（P2-R80b）：查找结果身份裁决矩阵（角色 × RuntimeKey × 声明值）。
    #[test]
    fn find_result_identity_matches_role_and_key() {
        use crate::core::content_session::{ContentSurfaceRole, RuntimeKey};
        let external = RuntimeKey::External("ext-1".to_string());
        let item = RuntimeKey::Item(7);
        let text = |value: &str| serde_json::Value::from(value);
        let number = |value: i64| serde_json::Value::from(value);

        // 外部宿主：只认自己的字符串身份。
        assert!(find_result_identity_matches(
            ContentSurfaceRole::ExternalHost,
            &external,
            Some(&text("external:ext-1"))
        ));
        assert!(
            !find_result_identity_matches(
                ContentSurfaceRole::ExternalHost,
                &external,
                Some(&text("external:ext-2"))
            ),
            "错误会话必须拒绝"
        );
        assert!(
            !find_result_identity_matches(
                ContentSurfaceRole::ExternalHost,
                &external,
                Some(&number(1))
            ),
            "外部身份不接受数字 itemId"
        );
        assert!(
            !find_result_identity_matches(ContentSurfaceRole::ExternalHost, &external, None),
            "缺失 itemId 必须拒绝"
        );

        // 正式宿主：只认自己的数字 itemId。
        assert!(find_result_identity_matches(
            ContentSurfaceRole::RuntimeHost,
            &item,
            Some(&number(7))
        ));
        assert!(
            !find_result_identity_matches(ContentSurfaceRole::RuntimeHost, &item, Some(&text("7"))),
            "数字域不接受字符串形式"
        );
        assert!(
            !find_result_identity_matches(ContentSurfaceRole::RuntimeHost, &item, Some(&number(8))),
            "错误 item 必须拒绝"
        );
        assert!(
            !find_result_identity_matches(
                ContentSurfaceRole::RuntimeHost,
                &external,
                Some(&text("external:ext-1"))
            ),
            "key 域与声明值形态必须一致"
        );

        // 角色门：非宿主内容面不是查找执行面。
        for role in [
            ContentSurfaceRole::DetachedPlayer,
            ContentSurfaceRole::PresentationPreview,
            ContentSurfaceRole::RuntimePopup,
        ] {
            assert!(
                !find_result_identity_matches(role, &item, Some(&number(7))),
                "非宿主角色一律拒绝：{role:?}"
            );
            assert!(
                !find_result_identity_matches(role, &external, Some(&text("external:ext-1"))),
                "非宿主角色一律拒绝（外部身份）：{role:?}"
            );
        }
    }

    /// R8：恶意 title 后缀不是合法 JSON —— 解析失败即不转发，注入不成立。
    #[test]
    fn find_result_title_rejects_injection_suffix() {
        // Codex 复现的注入表达式：旧实现把 `:` 后原始字符串直接插入 main.eval。
        let malicious = "null);globalThis.__reviewInjection=true;//";
        assert!(
            serde_json::from_str::<serde_json::Value>(malicious).is_err(),
            "注入后缀必须解析失败"
        );
        // 合法 JSON 对象仍可通过（正常 find 结果）。
        assert!(
            serde_json::from_str::<serde_json::Value>(r#"{"matches":1,"query":"x"}"#).is_ok()
        );
        // 非对象 JSON（数组/标量）也不得转发。
        assert!(!serde_json::from_str::<serde_json::Value>("null").unwrap().is_object());
    }

    // R10 注：payload item 归属校验已统一到 `preview::payload_items_authorized`
    // （需 AppState 做服务端副本校验，无法在无 Tauri 状态的单测中直接调用）；
    // 副本路径推导规则的可测 seam 见 commands::html_edit::editable_copy_path 测试。

    /// R9：标题桥编辑消息的会话/类型裁决（借 detached_embedded_fullscreen_handler
    /// 所用的同一裁决函数，但需 AppHandle —— 这里只测纯类型层；完整裁决见
    /// content_session 模块测试）。
    #[test]
    fn edit_title_bridge_type_prefixes_are_enforced_by_role() {
        use crate::core::content_session::{ContentSessionRecord, ContentSurfaceRole};
        let record = ContentSessionRecord {
            role: ContentSurfaceRole::PresentationPreview,
            key: crate::core::content_session::RuntimeKey::Item(42),
            origin: "http://127.0.0.1:50000".into(),
            runtime_session_id: "s-1".into(),
            generation: 3,
            view_state_surface_token: 0,
        };
        // 角色类型分权在 verify_bridge_message 中；这里确认 record 数据形状
        // 与标题桥裁决输入一致（防止结构漂移）。
        assert!(record.role.allows_message_type("html_edit_presentation_preview_ready"));
        assert!(!record.role.allows_message_type("html_edit_conversion_result"));
        assert!(record.runtime_session_id == "s-1" && record.generation == 3);
    }

    fn html_item() -> ItemDetail {
        ItemDetail {
            summary: ItemSummary {
                id: 42,
                library_id: 1,
                file_path: "/tmp/deck/index.html".to_string(),
                relative_path: "deck/index.html".to_string(),
                file_name: "index.html".to_string(),
                file_ext: "html".to_string(),
                file_type: "html".to_string(),
                file_size: 1,
                modified_at: "1".to_string(),
                title: Some("Deck".to_string()),
                summary: None,
                path_state: "valid".to_string(),
                is_favorite: false,
                last_opened_at: None,
                skill_binding: None,
                source_badges: vec![],
                tags: vec![],
                thumbnail: None,
                snippets: vec![],
            },
            file_hash: None,
            extracted_title: None,
            source_text: None,
            raw_text: None,
            rendered_cache: None,
            created_at: "1".to_string(),
            updated_at: "1".to_string(),
        }
    }

    #[test]
    fn html_runtime_session_uses_stable_window_label() {
        let item = html_item();
        let session = HtmlRuntimeSession::from_item(
            &item,
            "http://127.0.0.1:4000/fs/tmp/deck/index.html".to_string(),
        )
        .expect("html item should build a runtime session");

        assert_eq!(session.key, RuntimeKey::Item(42));
        assert_eq!(session.key.item_id(), Some(42));
        assert_eq!(session.generation, 0);
        assert_eq!(session.label, "html-player-42");
        assert_eq!(session.title, "index.html");
        assert_eq!(
            session.runtime_url,
            "http://127.0.0.1:4000/fs/tmp/deck/index.html"
        );
    }

    #[test]
    fn html_runtime_session_exports_frontend_payload() {
        let item = html_item();
        let session = HtmlRuntimeSession::from_item(
            &item,
            "http://127.0.0.1:4000/fs/tmp/deck/index.html".to_string(),
        )
        .expect("html item should build a runtime session");

        let payload = session.to_payload(true).expect("item 会话必须能导出载荷");

        assert_eq!(payload.item_id, 42);
        assert_eq!(payload.label, "html-player-42");
        assert_eq!(payload.title, "index.html");
        assert_eq!(
            payload.runtime_url,
            "http://127.0.0.1:4000/fs/tmp/deck/index.html"
        );
        assert!(payload.detached);
    }

    #[test]
    fn html_runtime_window_label_is_stable() {
        assert_eq!(html_runtime_window_label(7), "html-player-7");
    }

    /// P2（Codex revision 32）：外部临时会话走同一承载层，但身份与标签落在
    /// 独立命名空间；并且**不**伪造 itemId（导出 item 载荷必须失败）。
    #[test]
    fn external_html_runtime_session_has_external_identity_only() {
        let session = HtmlRuntimeSession::from_external(
            "ext-9f8e7d6c",
            7,
            "index.html".to_string(),
            "http://127.0.0.1:4100/index.html".to_string(),
        );

        assert_eq!(session.key, RuntimeKey::External("ext-9f8e7d6c".to_string()));
        assert_eq!(session.key.item_id(), None);
        assert_eq!(session.generation, 7);
        assert_eq!(html_runtime_host_label_for(&session.key), "html-host-ext-9f8e7d6c");
        assert_eq!(session.label, "html-host-ext-9f8e7d6c");
        // 与正式 item host 标签不冲突（item 段是纯数字）。
        assert_ne!(
            html_runtime_host_label_for(&session.key),
            html_runtime_host_label(7)
        );
        // 不伪造 itemId：外部会话导不出 item 载荷。
        assert!(session.to_payload(false).is_err());
    }

    /// P2：label 兼容断言 —— item 分支必须与 P1 逐字一致（回归安全网）。
    #[test]
    fn runtime_key_labels_keep_item_output_byte_identical() {
        for item_id in [0_i64, 7, 42, 1_000_000] {
            assert_eq!(
                html_runtime_host_label_for(&RuntimeKey::Item(item_id)),
                format!("html-host-{item_id}")
            );
            assert_eq!(
                html_runtime_window_label_for(&RuntimeKey::Item(item_id)),
                format!("html-player-{item_id}")
            );
            assert_eq!(
                html_presentation_preview_label_for(&RuntimeKey::Item(item_id)),
                format!("html-presentation-preview-{item_id}")
            );
            assert_eq!(
                html_runtime_controls_label_for(&RuntimeKey::Item(item_id)),
                format!("html-controls-{item_id}")
            );
        }
    }

    #[test]
    fn html_edit_toolbar_label_is_stable() {
        assert_eq!(html_edit_toolbar_label(7), "html-edit-toolbar-7");
    }

    #[test]
    fn presentation_preview_scripts_keep_the_editor_lease_and_scaled_canvas() {
        let init = presentation_preview_init_script("html-edit-42-1", 7, "nutbook-page-003", "preview-1");
        let update = presentation_preview_update_script("html-edit-42-2", 8, "nutbook-page-004", "preview-2");

        assert!(init.contains("html-edit-42-1"));
        assert!(init.contains("nutbook-page-003"));
        assert!(init.contains("preview-1"));
        assert!(init.contains("html_edit_presentation_preview_clicked"));
        assert!(init.contains("html_edit_presentation_preview_navigate"));
        assert!(init.contains("nb-preview-canvas"));
        assert!(init.contains("scale("));
        assert!(update.contains("html-edit-42-2"));
        assert!(update.contains("nutbook-page-004"));
        assert!(update.contains("preview-2"));
    }

    #[test]
    fn html_edit_toolbar_update_script_forwards_dirty_state() {
        let script = html_edit_toolbar_update_script(
            "html-edit-42-123456",
            7,
            true,
            Some("article-body"),
            &HtmlEditToolbarFormatState {
                can_format: true,
                bold: true,
                italic: false,
                block: "h2".to_string(),
                text_align: "center".to_string(),
                list: Some("ul".to_string()),
                edit_role: "content".to_string(),
            },
        );

        assert!(script.contains("__NUTBOOK_HTML_EDIT_TOOLBAR_UPDATE__"));
        assert!(script.contains("dirty"));
        assert!(script.contains("true"));
        assert!(script.contains("runtimeSessionId"));
        assert!(script.contains("html-edit-42-123456"));
        assert!(script.contains("generation"));
        assert!(script.contains('7'));
        assert!(script.contains("formatState"));
        assert!(script.contains("canFormat"));
        assert!(script.contains("textAlign"));
        assert!(script.contains("selectedDataId"));
        assert!(script.contains("article-body"));
        assert!(script.contains("editRole"));
        assert!(script.contains("content"));
    }

    #[test]
    fn html_runtime_shortcut_dispatches_each_keyboard_event_once() {
        let script = html_runtime_shortcut_script("CmdOrCtrl+Z");

        assert_eq!(script.matches("dispatchEvent?.(keydown)").count(), 1);
        assert_eq!(script.matches("dispatchEvent?.(keyup)").count(), 1);
        assert!(!script.contains("document.dispatchEvent(keydown)"));
        assert!(!script.contains("window.dispatchEvent(keydown)"));
    }

    #[test]
    fn html_runtime_compatibility_script_keeps_only_production_shims() {
        let script = html_runtime_compatibility_script();

        assert!(script.contains("about:blank"));
        assert!(script.contains("__NUTBOOK_TOGGLE_FULLSCREEN__"));
        assert!(script.contains("[contenteditable]"));
        assert!(script.contains("__NUTBOOK_HTML_EDIT__?.isEditing"));
        assert!(script.contains("document.activeElement"));
        assert!(script.contains("active.isContentEditable"));
        assert_eq!(HTML_EDIT_RUNTIME_ACTION_PREFIX, "__NUTBOOK_HTML_EDIT_RUNTIME__:");
        assert!(script.contains("stopImmediatePropagation"));
        assert!(!script.contains("root.requestFullscreen"));
        assert!(!script.contains("__nutbook_runtime_diag__"));
        assert!(!script.contains("diagnostics mounted"));
    }

    #[test]
    fn html_runtime_view_state_script_captures_and_restores_serializable_state() {
        let initial_state = serde_json::json!({
            "scrollX": 12,
            "scrollY": 640,
            "hash": "#details",
            "presentationPageId": "page-3"
        });
        let script = html_runtime_view_state_script(42, 9, Some(&initial_state));

        assert!(script.contains("const itemId = 42"));
        assert!(script.contains("const surfaceToken = 9"));
        assert!(script.contains("#details"));
        assert!(script.contains("html_runtime_view_state_command"));
        assert!(script.contains("scrollX"));
        assert!(script.contains("scrollY"));
        assert!(script.contains("location.hash"));
        assert!(script.contains("presentationPageId"));
        assert!(script.contains("bridge.goTo(targetPageId)"));
        assert!(script.contains("window.scrollTo"));
        assert!(script.contains("cancelRestoreForUser"));
        assert!(!script.contains("localStorage"));
        assert!(!script.contains("sessionStorage"));
    }
}
