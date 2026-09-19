use std::path::Component;

use serde_json::Value;
use tauri::Manager;

use crate::{
    core::{
        document::{
            content_hash, file_modified_at_string, load_document_payload, load_item_content_revision,
            load_markdown_inspector_snapshot, markdown_summary, render_markdown_as_html_for_file,
            MarkdownResourceContext,
        },
        document_title::DocumentTitle,
        html_runtime::{
            attach_controls_overlay, attach_external_html_runtime_host,
            attach_html_edit_leave_confirm_overlay, attach_html_edit_toolbar_overlay,
            attach_html_presentation_preview, attach_html_runtime_controls_overlay, attach_html_find_overlay, attach_html_runtime_host, attach_settings_overlay,
            attach_inspector_more_overlay, close_inspector_more_overlay,
            close_html_edit_leave_confirm_overlay, close_html_edit_toolbar_overlay,
            close_html_presentation_preview, close_html_runtime_window,
            dispatch_html_runtime_shortcut, eval_html_runtime_script, focus_html_runtime_host,
            external_view_state_capture_script, log_html_edit_debug,
            focus_main_webview, open_html_runtime_window,
            set_external_html_runtime_host_visibility,
            set_html_edit_toolbar_overlay_visibility,
            set_html_presentation_preview_visibility, set_html_presentation_preview_active,
            set_html_runtime_controls_overlay_bounds,
            set_html_runtime_controls_overlay_visibility, set_html_find_overlay_bounds,
            set_html_find_overlay_visibility,
            set_html_runtime_host_visibility, update_html_find_overlay,
            update_html_runtime_controls_overlay,
            forward_html_runtime_view_state,
            HtmlRuntimeSession,
        },
    },
    db::repositories::ItemRepository,
    errors::AppError,
    models::{
        AttachHtmlEditLeaveConfirmOverlayRequest, AttachHtmlEditToolbarOverlayRequest, AttachHtmlPresentationPreviewRequest, AttachHtmlRuntimeControlsOverlayRequest, AttachHtmlFindOverlayRequest,
        AttachHtmlRuntimeHostRequest, AttachInspectorMoreOverlayRequest, AttachSettingsOverlayRequest, CloseHtmlWindowRequest,
        AttachExternalHtmlRuntimeHostRequest, CaptureExternalHtmlViewStateRequest,
        AttachExternalHtmlFindOverlayRequest, ExternalHtmlFindActionRequest,
        CloseExternalHtmlRuntimeRequest,
        ExternalHtmlRuntimeSessionPayload, SetExternalHtmlRuntimeHostVisibilityRequest,
        SetExternalHtmlFindOverlayBoundsRequest, SetExternalHtmlFindOverlayVisibilityRequest,
        UpdateExternalHtmlFindOverlayRequest,
        CopyMarkdownCoverAssetRequest, CopyMarkdownCoverAssetResponse,
        CopyMarkdownImageAssetRequest, CopyMarkdownImageAssetResponse,
        DeleteMarkdownImageAssetRequest, DispatchHtmlRuntimeShortcutRequest,
        EvalHtmlRuntimeScriptRequest, ExportMarkdownRequest, FocusHtmlRuntimeHostRequest,
        GetItemPreviewRequest, HtmlRuntimeSessionPayload, ItemContentRevision, ItemDetail, OpenHtmlWindowRequest, PreviewPayload,
        MarkdownInspectorSnapshot,
        ReleaseMarkdownCoverLeaseRequest, ReleaseMarkdownCoverLeaseResponse,
        SaveMarkdownContentRequest, SaveMarkdownContentResponse,
        SetHtmlEditToolbarOverlayVisibilityRequest,
        SetHtmlRuntimeControlsOverlayBoundsRequest, SetHtmlRuntimeControlsOverlayVisibilityRequest,
        SetHtmlFindOverlayBoundsRequest, SetHtmlFindOverlayVisibilityRequest,
        UpdateHtmlFindOverlayRequest, UpdateHtmlRuntimeControlsOverlayRequest,
        HtmlPresentationPreviewControlRequest, SetHtmlPresentationPreviewActiveRequest,
        SetHtmlRuntimeHostVisibilityRequest, ValidateMarkdownCoverAssetRequest,
        ValidateMarkdownCoverAssetResponse,
    },
    state::AppState,
};

#[tauri::command]
pub fn get_item_preview(
    state: tauri::State<'_, AppState>,
    payload: GetItemPreviewRequest,
) -> Result<PreviewPayload, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    // PR C Phase 1（D1=A）：资源 URL 改走 per-item scoped origin。
    // HTML 的 preview_url 与 Markdown 图片共用 session key `preview:{item_id}`。
    let item_id = item.summary.id;
    let url = |path: &std::path::Path| -> String {
        state
            .scoped_file_url_for_item(&format!("preview:{item_id}"), &item, path)
            .unwrap_or_default()
    };
    let markdown_resource = markdown_resource_context_for_item(&state, &item)?;
    load_document_payload(&item, url, markdown_resource)
}

/// Build the complete context that the Markdown host needs to turn a local
/// image reference into an item-scoped URL.  A partial/empty context is the
/// source of the old broken-image `?` symptom, so setup failures are explicit
/// and safe instead of becoming an empty URL or a legacy `/fs` fallback.
fn markdown_resource_context_for_item(
    state: &AppState,
    item: &ItemDetail,
) -> Result<MarkdownResourceContext, AppError> {
    if item.summary.file_type != "markdown" {
        return Ok(MarkdownResourceContext::default());
    }

    let root = state
        .authorization_root_for_item(item)
        .map_err(|error| match error {
            AppError::LibraryNotFound => AppError::MarkdownResourceUnavailable(
                "MISSING_PREVIEW_CONTEXT: the Markdown source library is no longer available; reopen the library and retry"
                    .to_string(),
            ),
            other => other,
        })?;
    let canonical_root = root.canonicalize().map_err(|_| {
        AppError::MarkdownResourceUnavailable(
            "MISSING_PREVIEW_CONTEXT: the Markdown source root is unavailable; repair the library path and retry"
                .to_string(),
        )
    })?;
    if !canonical_root.is_dir() {
        return Err(AppError::MarkdownResourceUnavailable(
            "MISSING_PREVIEW_CONTEXT: the Markdown source root is not a directory; repair the library path and retry"
                .to_string(),
        ));
    }

    let canonical_item = std::path::Path::new(&item.summary.file_path)
        .canonicalize()
        .map_err(|_| {
            AppError::MarkdownResourceUnavailable(
                "MISSING_PREVIEW_CONTEXT: the Markdown source file is unavailable; reopen the item and retry"
                    .to_string(),
            )
        })?;
    if !canonical_item.starts_with(&canonical_root) {
        return Err(AppError::MarkdownResourceUnavailable(
            "REJECTED_RESOURCE_REQUEST: the Markdown source is outside its authorized library root"
                .to_string(),
        ));
    }
    let canonical_base = canonical_item.parent().ok_or_else(|| {
        AppError::MarkdownResourceUnavailable(
            "MISSING_PREVIEW_CONTEXT: the Markdown source has no usable parent directory; reopen the item and retry"
                .to_string(),
        )
    })?;

    let server = state
        .scoped_server(&format!("preview:{}", item.summary.id), &canonical_root)
        .map_err(|error| match error {
            // Preserve the existing actionable registry diagnosis and fail
            // closed.  It never grants another root or falls back to `/fs`.
            AppError::ScopedRegistryFailed(detail) => AppError::MarkdownResourceUnavailable(
                format!("SCOPED_SERVER_STARTUP_FAILED: scoped resource registry is unavailable ({detail})"),
            ),
            AppError::IoError | AppError::InvalidParams => AppError::MarkdownResourceUnavailable(
                "SCOPED_SERVER_STARTUP_FAILED: the item-scoped resource server could not start; retry after the library path is available"
                    .to_string(),
            ),
            other => other,
        })?;
    let origin = server.resource_base();
    if !origin.starts_with("http://127.0.0.1:") {
        return Err(AppError::MarkdownResourceUnavailable(
            "SCOPED_SERVER_STARTUP_FAILED: the item-scoped resource origin is invalid; reopen the item and retry"
                .to_string(),
        ));
    }

    Ok(MarkdownResourceContext {
        origin,
        root: canonical_root.to_string_lossy().to_string(),
        base_dir: canonical_base.to_string_lossy().to_string(),
    })
}

/// 检查视图 Markdown snapshot（raw + revision key）。只读预览的数据源；
/// 前端在挂载、图片就绪和显示前都要复核 revision，外部替换不得显示旧正文。
#[tauri::command]
pub fn get_item_inspector_snapshot(
    state: tauri::State<'_, AppState>,
    payload: GetItemPreviewRequest,
) -> Result<MarkdownInspectorSnapshot, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    let markdown_resource = markdown_resource_context_for_item(&state, &item)?;
    load_markdown_inspector_snapshot(&item, markdown_resource)
}

/// 廉价 revision 复核：只返回当前内容 hash，供检查视图丢弃晚到/过期实例。
#[tauri::command]
pub fn get_item_content_revision(
    state: tauri::State<'_, AppState>,
    payload: GetItemPreviewRequest,
) -> Result<ItemContentRevision, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    load_item_content_revision(&item)
}

#[tauri::command]
pub fn attach_inspector_more_overlay_command(
    app: tauri::AppHandle,
    window: tauri::Window,
    payload: AttachInspectorMoreOverlayRequest,
) -> Result<bool, AppError> {
    attach_inspector_more_overlay(
        &app,
        &window,
        payload.item_id,
        payload.selection_token,
        payload.bounds,
        payload.expanded,
        payload.label,
    )
}

#[tauri::command]
pub fn close_inspector_more_overlay_command(
    app: tauri::AppHandle,
    payload: CloseHtmlWindowRequest,
) -> Result<bool, AppError> {
    close_inspector_more_overlay(&app, payload.item_id)
}

#[tauri::command]
pub fn attach_settings_overlay_command(
    app: tauri::AppHandle,
    window: tauri::Window,
    payload: AttachSettingsOverlayRequest,
) -> Result<bool, AppError> {
    attach_settings_overlay(&app, &window, payload.bounds, payload.tab, payload.mode)
}

#[tauri::command]
pub fn close_html_presentation_preview_command(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: HtmlPresentationPreviewControlRequest,
) -> Result<bool, AppError> {
    if !state.html_edit_session_lease_matches(
        payload.item_id,
        &payload.runtime_session_id,
        payload.generation,
    )? {
        return Err(AppError::InvalidSession);
    }
    close_html_presentation_preview(&app, payload.item_id, &payload.preview_instance_id)
}

/// PR C Phase 1：缩略图缓存资源的 scoped origin 与 canonical root。
/// 只供 main 可信面拼接缩略图 URL；root 只含缩略图缓存文件。
/// （旧 get_local_server_origin 命令已随共享 /fs 服务器一并移除。）
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheResourceInfo {
    pub origin: String,
    pub root: String,
}

#[tauri::command]
pub fn get_cache_resource_info(
    state: tauri::State<'_, AppState>,
) -> Result<CacheResourceInfo, AppError> {
    let (origin, root) = state.cache_resource_info();
    Ok(CacheResourceInfo { origin, root })
}

/// PR C Phase 1（D1=A，R11 修订）：HTML runtime 会话的 scoped runtime URL。
/// 每个 surface（host / player / presentation）独立 scoped origin —— 同一
/// item 的不同内容面不再共享 origin，各 webview 的会话登记绑定各自 origin。
fn scoped_runtime_url_for_surface(
    state: &AppState,
    item: &ItemDetail,
    surface: &str,
) -> Result<String, AppError> {
    let item_id = item.summary.id;
    state.scoped_file_url_for_item(
        &format!("html-runtime:{item_id}:{surface}"),
        item,
        std::path::Path::new(&item.summary.file_path),
    )
}

/// 主 tab 与 controls overlay 使用的 host surface URL。
fn scoped_runtime_url(state: &AppState, item: &ItemDetail) -> Result<String, AppError> {
    scoped_runtime_url_for_surface(state, item, "host")
}

#[tauri::command]
pub fn open_image_file_dialog(app: tauri::AppHandle, language: Option<String>) -> Option<String> {
    let mut dialog = rfd::FileDialog::new()
        .set_title(if language.as_deref() == Some("en-US") { "Choose Image" } else { "选择图片" })
        .add_filter(if language.as_deref() == Some("en-US") { "Images" } else { "图片" }, &["png", "jpg", "jpeg", "gif", "webp", "svg"]);
    if let Some(window) = app.get_webview_window("main") { dialog = dialog.set_parent(&window); }
    dialog.pick_file()
        .map(|path| path.to_string_lossy().to_string())
}

/// HTML edit imports intentionally exclude SVG. The Markdown image picker
/// continues to accept it, so this must remain a separate command.
#[tauri::command]
pub fn open_html_edit_image_file_dialog(app: tauri::AppHandle, language: Option<String>) -> Option<String> {
    let mut dialog = rfd::FileDialog::new()
        .set_title(if language.as_deref() == Some("en-US") { "Choose Image" } else { "选择图片" })
        .add_filter(if language.as_deref() == Some("en-US") { "Images" } else { "图片" }, &["png", "jpg", "jpeg", "gif", "webp"]);
    if let Some(window) = app.get_webview_window("main") { dialog = dialog.set_parent(&window); }
    dialog.pick_file()
        .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_html_window(
    state: tauri::State<'_, AppState>,
    payload: OpenHtmlWindowRequest,
) -> Result<HtmlRuntimeSessionPayload, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }

    let runtime_url = scoped_runtime_url(&state, &item)?;
    let session = HtmlRuntimeSession::from_item(&item, runtime_url)?;
    session.to_payload(false)
}

#[tauri::command]
pub fn open_html_detached_window(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: OpenHtmlWindowRequest,
) -> Result<HtmlRuntimeSessionPayload, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }

    let runtime_url = scoped_runtime_url_for_surface(&state, &item, "player")?;
    let session = HtmlRuntimeSession::from_item(&item, runtime_url)?;
    open_html_runtime_window(&app, &session)?;
    session.to_payload(true)
}

#[tauri::command]
pub fn attach_html_runtime_host_command(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
    payload: AttachHtmlRuntimeHostRequest,
) -> Result<HtmlRuntimeSessionPayload, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }

    let runtime_url = scoped_runtime_url(&state, &item)?;
    let session = HtmlRuntimeSession::from_item(&item, runtime_url)?;
    attach_html_runtime_host(
        &app,
        &window,
        &session,
        payload.bounds,
        payload.view_state_surface_token,
        payload.view_state,
    )?;
    session.to_payload(false)
}

/// P2（Codex revision 32「有界 A」）：解析外部临时 HTML 会话。
///
/// 身份与授权 root **全部**由后端有效会话解析，前端自报的路径 / itemId 一概
/// 不参与判定：
/// - `session_id` 必须命中 external 会话登记；
/// - 会话未关闭且 `generation` 一致（代次漂移 = 旧回调，必须拒绝）；
/// - 文件类型必须为 `html`；
/// - 授权 root = 登记 `raw_path` 的直接父目录（计划 §6.3，与单文件 item 同规则）。
fn external_html_runtime_session(
    state: &AppState,
    session_id: &str,
    generation: u64,
) -> Result<HtmlRuntimeSession, AppError> {
    let session = state
        .external_sessions
        .get(session_id)
        .ok_or(AppError::InvalidSession)?;
    if session.closed || session.generation != generation {
        return Err(AppError::InvalidSession);
    }
    if session.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }
    let path = std::path::PathBuf::from(&session.raw_path);
    let title = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("index.html")
        .to_string();
    let runtime_url = state.scoped_file_url_for_external(
        &crate::core::html_runtime::external_runtime_scoped_key(session_id),
        &path,
    )?;
    Ok(HtmlRuntimeSession::from_external(
        session_id,
        generation,
        title,
        runtime_url,
    ))
}

fn external_html_runtime_payload(
    session: &HtmlRuntimeSession,
) -> Result<ExternalHtmlRuntimeSessionPayload, AppError> {
    Ok(ExternalHtmlRuntimeSessionPayload {
        session_id: session
            .key
            .external_session_id()
            .ok_or(AppError::InvalidParams)?
            .to_string(),
        generation: session.generation,
        label: session.label.clone(),
        title: session.title.clone(),
        runtime_url: session.runtime_url.clone(),
    })
}

/// P2：挂载 / 复用外部临时 HTML 的内嵌 host（与正式 item host 同一承载层）。
///
/// P2-R92a：`viewState` 仅在**新建** child 时回放（surface 隐藏即被 close，
/// 再次激活必然重建）。已存在的 surface 走 bounds-only 早退，忽略该参数。
#[tauri::command]
pub fn attach_external_html_runtime_host_command(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
    payload: AttachExternalHtmlRuntimeHostRequest,
) -> Result<ExternalHtmlRuntimeSessionPayload, AppError> {
    let session = external_html_runtime_session(&state, &payload.session_id, payload.generation)?;
    attach_external_html_runtime_host(&app, &window, &session, payload.bounds, payload.view_state)?;
    external_html_runtime_payload(&session)
}

/// P2：外部临时 HTML host 的显示 / 隐藏（切 tab 用；隐藏即销毁 surface，
/// 不撤销 capability）。
#[tauri::command]
pub fn set_external_html_runtime_host_visibility_command(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: SetExternalHtmlRuntimeHostVisibilityRequest,
) -> Result<bool, AppError> {
    // 仍要求会话有效且代次一致：旧回调不得驱动新会话的 surface。
    external_html_runtime_session(&state, &payload.session_id, payload.generation)?;
    set_external_html_runtime_host_visibility(&app, &payload.session_id, payload.visible)
}

/// P2：关闭外部临时 HTML 会话 —— 销毁 host 并撤销其全部 scoped 内容能力
/// （计划 §6.3：关闭标签 / 取消请求 / 来源失效时撤销）。幂等：登记已消失或
/// surface 不存在时返回 false，不报错。
#[tauri::command]
pub fn close_external_html_runtime_command(
    app: tauri::AppHandle,
    payload: CloseExternalHtmlRuntimeRequest,
) -> Result<bool, AppError> {
    crate::core::html_runtime::close_external_html_runtime_host(&app, &payload.session_id)
}

/// P2 / 计划 §6.2：promotion 专用的一次性 view-state 回报裁决。
///
/// 与 item 阅读面的 `view_state_surface_matches` 刻意不同：外部阅读面**没有**
/// 注入常驻 view-state 脚本（surface token 恒 0），因此不能要求非零 token，
/// 否则拒掉一切合法回报。身份改由三件事实共同确定，缺一不可：
/// - 发送方登记角色必须是 `ExternalHost` —— 编辑面角色（RuntimeHost /
///   DetachedPlayer / PresentationPreview / RuntimePopup）即便 key 形状巧合也
///   不得使用这条通道；
/// - 登记 key 必须是 `External(..)`，且 payload 自报 sessionId 与之一致
///   （自报 itemId 一律不参与判定）；
/// - payload 自报 generation 必须等于登记代次且非零 —— 旧 surface 的晚到
///   回报被拒。
///
/// 该通道**只**授予「回传一次滚动 / URL hash 快照」的语义，不新增任何编辑、
/// 写入或 lease 能力；promotion 拆完旧 child 后登记即注销。
pub(crate) fn external_view_state_payload_authorized(
    record: &crate::core::content_session::ContentSessionRecord,
    payload: &Value,
) -> Result<(), AppError> {
    use crate::core::content_session::{ContentSurfaceRole, RuntimeKey};
    if record.role != ContentSurfaceRole::ExternalHost {
        return Err(AppError::InvalidSession);
    }
    let RuntimeKey::External(registered) = &record.key else {
        return Err(AppError::InvalidSession);
    };
    let claimed = payload
        .get("sessionId")
        .and_then(Value::as_str)
        .unwrap_or("");
    let generation = payload
        .get("generation")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    if claimed.is_empty() || claimed != registered || generation == 0 || generation != record.generation
    {
        return Err(AppError::InvalidSession);
    }
    Ok(())
}

/// P2 / 计划 §6.2：在拆除临时 child **之前**采集一次 view state。宿主只下发
/// 固定脚本（不接受前端任意脚本），采集内容仅滚动位置与 URL hash。
#[tauri::command]
pub fn capture_external_html_view_state_command(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: CaptureExternalHtmlViewStateRequest,
) -> Result<bool, AppError> {
    let session = external_html_runtime_session(&state, &payload.session_id, payload.generation)?;
    let label = crate::core::html_runtime::html_runtime_host_label_for(&session.key);
    let Some(webview) = app.get_webview(&label) else {
        // child 已被拆除（或从未挂载）：没有可采集的状态，不算错误。
        return Ok(false);
    };
    webview
        .eval(&external_view_state_capture_script(
            &payload.session_id,
            payload.generation,
            &payload.request_id,
        ))
        .map_err(|_| AppError::InternalError)?;
    Ok(true)
}

/// P2 / 计划 §6.2：外部 host 的 view-state 回报入口。必须来自已登记的内容面
/// （不存在「可信面无记录放行」的例外），再由专用裁决核对角色 / 会话 / 代次。
#[tauri::command]
pub fn external_html_view_state_report_command(
    app: tauri::AppHandle,
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    payload: Value,
) -> Result<bool, AppError> {
    let record = content_session_record(&state, &webview)?.ok_or(AppError::InvalidSession)?;
    external_view_state_payload_authorized(&record, &payload)?;
    let main_webview = app.get_webview("main").ok_or(AppError::InternalError)?;
    let payload_json = serde_json::to_string(&payload).map_err(|_| AppError::InternalError)?;
    main_webview
        .eval(&format!(
            "window.__NUTBOOK_HANDLE_EXTERNAL_RUNTIME_VIEW_STATE__?.({payload_json});"
        ))
        .map_err(|_| AppError::InternalError)?;
    Ok(true)
}

/// revision 71：外部 find surface 的面板身份（main 侧与 tab.id 等值比对）。
fn external_find_identity(session_id: &str) -> String {
    format!("external:{session_id}")
}

/// revision 71：外部临时 HTML 的正文查找 overlay。与正式 item 同一 child
/// 承载与 1x1 → hide → close 合同（`RuntimeKey::External` 派生独立 label），
/// 身份裁决 = sessionId + generation（与 host attach 同一函数）；外部会话
/// 不开放 HTML 编辑，`can_replace` 恒 false。
#[tauri::command]
pub fn attach_external_html_find_overlay_command(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
    payload: AttachExternalHtmlFindOverlayRequest,
) -> Result<bool, AppError> {
    let session = external_html_runtime_session(&state, &payload.session_id, payload.generation)?;
    attach_html_find_overlay(
        &app,
        &window,
        &session.key,
        serde_json::Value::String(external_find_identity(&payload.session_id)),
        payload.bounds,
        false,
        payload.replace_expanded,
        payload.query,
        payload.count,
        payload.case_sensitive,
        payload.labels,
        payload.history,
    )
}

/// 已创建的外部 find child 只更新内容状态，不改变原生几何、可见性或焦点。
#[tauri::command]
pub fn update_external_html_find_overlay_command(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: UpdateExternalHtmlFindOverlayRequest,
) -> Result<bool, AppError> {
    let session = external_html_runtime_session(&state, &payload.session_id, payload.generation)?;
    update_html_find_overlay(
        &app,
        &session.key,
        serde_json::Value::String(external_find_identity(&payload.session_id)),
        false,
        payload.replace_expanded,
        payload.query,
        payload.count,
        payload.case_sensitive,
        payload.labels,
        payload.history,
    )
}

/// resize 只更新已存在 find child 的原生几何（no-op 当 surface 已关闭）。
#[tauri::command]
pub fn set_external_html_find_overlay_bounds_command(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: SetExternalHtmlFindOverlayBoundsRequest,
) -> Result<bool, AppError> {
    let session = external_html_runtime_session(&state, &payload.session_id, payload.generation)?;
    set_html_find_overlay_bounds(&app, &session.key, payload.bounds)
}

#[tauri::command]
pub fn set_external_html_find_overlay_visibility_command(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: SetExternalHtmlFindOverlayVisibilityRequest,
) -> Result<bool, AppError> {
    let session = external_html_runtime_session(&state, &payload.session_id, payload.generation)?;
    set_html_find_overlay_visibility(&app, &session.key, payload.visible)
}

/// revision 74（P2-R71a）：对外部临时 host 的**结构化**查找动作下发。
/// 任意脚本文本入口已删除（hostile page 可包装 `__TAURI_INTERNALS__.invoke`
/// 截获自身会话标识后注入任意源码）：动作只允许 query / next / prev / close，
/// `replace` 一族在外部会话恒被拒绝；脚本源码由宿主固定模板构造
/// （见 `external_html_find_action_script`），页面参数仅以 JSON 字面量注入。
/// 会话 + 代次校验与其它 external 命令同一裁决，代次漂移或会话关闭一律
/// InvalidSession。
#[tauri::command]
pub fn external_html_find_action_command(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: ExternalHtmlFindActionRequest,
) -> Result<bool, AppError> {
    let session = external_html_runtime_session(&state, &payload.session_id, payload.generation)?;
    let session_id = session
        .key
        .external_session_id()
        .ok_or(AppError::InvalidParams)?
        .to_string();
    let script = crate::core::html_runtime::external_html_find_action_script(
        &session_id,
        &payload.action,
        &payload.query,
        payload.case_sensitive,
    )?;
    let label = crate::core::html_runtime::html_runtime_host_label_for(&session.key);
    let Some(webview) = app.get_webview(&label) else {
        // host 未挂载（未 attach 或已拆除）：没有执行面，不算错误。
        return Ok(false);
    };
    webview.eval(&script).map_err(|_| AppError::InternalError)?;
    Ok(true)
}

#[tauri::command]
pub fn attach_html_presentation_preview_command(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
    payload: AttachHtmlPresentationPreviewRequest,
) -> Result<bool, AppError> {
    if !state.html_edit_session_lease_matches(
        payload.item_id,
        &payload.runtime_session_id,
        payload.generation,
    )? {
        return Err(AppError::InvalidSession);
    }
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }
    let runtime_url = scoped_runtime_url_for_surface(&state, &item, "presentation")?;
    let session = HtmlRuntimeSession::from_item(&item, runtime_url)?;
    attach_html_presentation_preview(
        &app,
        &window,
        &session,
        payload.bounds,
        &payload.runtime_session_id,
        payload.generation,
        &payload.active_page_id, &payload.preview_instance_id,
    )
}

#[tauri::command]
pub fn set_html_presentation_preview_visibility_command(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: HtmlPresentationPreviewControlRequest,
) -> Result<bool, AppError> {
    if !state.html_edit_session_lease_matches(payload.item_id, &payload.runtime_session_id, payload.generation)? {
        return Err(AppError::InvalidSession);
    }
    set_html_presentation_preview_visibility(&app, payload.item_id, &payload.preview_instance_id, payload.visible)
}

#[tauri::command]
pub fn set_html_presentation_preview_active_command(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: SetHtmlPresentationPreviewActiveRequest,
) -> Result<bool, AppError> {
    if !state.html_edit_session_lease_matches(payload.item_id, &payload.runtime_session_id, payload.generation)? {
        return Err(AppError::InvalidSession);
    }
    set_html_presentation_preview_active(&app, payload.item_id, &payload.preview_instance_id, &payload.page_id, payload.follow, payload.focus)
}

#[tauri::command]
pub fn set_html_runtime_host_visibility_command(
    app: tauri::AppHandle,
    payload: SetHtmlRuntimeHostVisibilityRequest,
) -> Result<bool, AppError> {
    set_html_runtime_host_visibility(&app, payload.item_id, payload.visible)
}

#[tauri::command]
pub fn attach_html_runtime_controls_overlay_command(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
    payload: AttachHtmlRuntimeControlsOverlayRequest,
) -> Result<HtmlRuntimeSessionPayload, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }

    let runtime_url = scoped_runtime_url(&state, &item)?;
    let session = HtmlRuntimeSession::from_item(&item, runtime_url)?;
    attach_html_runtime_controls_overlay(
        &app,
        &window,
        &session,
        payload.bounds,
        payload.is_favorite,
        payload.is_fullscreen,
        payload.is_editing,
        payload.is_primary_busy,
        payload.custom_tag,
        payload.available_tags,
        payload.skill_tag,
        payload.type_tag,
        payload.custom_tags,
        payload.source_badges,
        item.summary.file_name.clone(),
        payload.language,
    )?;
    session.to_payload(false)
}

#[tauri::command]
pub fn set_html_runtime_controls_overlay_visibility_command(
    app: tauri::AppHandle,
    payload: SetHtmlRuntimeControlsOverlayVisibilityRequest,
) -> Result<bool, AppError> {
    set_html_runtime_controls_overlay_visibility(&app, payload.item_id, payload.visible)
}

#[tauri::command]
pub fn update_html_runtime_controls_overlay_command(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: UpdateHtmlRuntimeControlsOverlayRequest,
) -> Result<bool, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }
    update_html_runtime_controls_overlay(
        &app,
        payload.item_id,
        payload.is_favorite,
        payload.is_fullscreen,
        payload.is_editing,
        payload.is_primary_busy,
        payload.custom_tag,
        payload.available_tags,
        payload.skill_tag,
        payload.type_tag,
        payload.custom_tags,
        payload.source_badges,
        item.summary.file_name.clone(),
        payload.language,
    )
}

#[tauri::command]
pub fn set_html_runtime_controls_overlay_bounds_command(
    app: tauri::AppHandle,
    payload: SetHtmlRuntimeControlsOverlayBoundsRequest,
) -> Result<bool, AppError> {
    set_html_runtime_controls_overlay_bounds(&app, payload.item_id, payload.bounds)
}

#[tauri::command]
pub fn attach_html_find_overlay_command(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
    payload: AttachHtmlFindOverlayRequest,
) -> Result<bool, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" { return Err(AppError::UnsupportedFileType); }
    let key = crate::core::content_session::RuntimeKey::Item(payload.item_id);
    attach_html_find_overlay(&app, &window, &key, serde_json::Value::from(payload.item_id), payload.bounds, payload.can_replace, payload.replace_expanded, payload.query, payload.count, payload.case_sensitive, payload.labels, payload.history)
}

#[tauri::command]
pub fn update_html_find_overlay_command(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: UpdateHtmlFindOverlayRequest,
) -> Result<bool, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" { return Err(AppError::UnsupportedFileType); }
    let key = crate::core::content_session::RuntimeKey::Item(payload.item_id);
    update_html_find_overlay(
        &app,
        &key,
        serde_json::Value::from(payload.item_id),
        payload.can_replace,
        payload.replace_expanded,
        payload.query,
        payload.count,
        payload.case_sensitive,
        payload.labels,
        payload.history,
    )
}

#[tauri::command]
pub fn set_html_find_overlay_bounds_command(
    app: tauri::AppHandle,
    payload: SetHtmlFindOverlayBoundsRequest,
) -> Result<bool, AppError> {
    set_html_find_overlay_bounds(&app, &crate::core::content_session::RuntimeKey::Item(payload.item_id), payload.bounds)
}

#[tauri::command]
pub fn set_html_find_overlay_visibility_command(
    app: tauri::AppHandle,
    payload: SetHtmlFindOverlayVisibilityRequest,
) -> Result<bool, AppError> {
    set_html_find_overlay_visibility(&app, &crate::core::content_session::RuntimeKey::Item(payload.item_id), payload.visible)
}

#[tauri::command]
pub fn attach_html_edit_toolbar_overlay_command(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
    payload: AttachHtmlEditToolbarOverlayRequest,
) -> Result<bool, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }

    attach_html_edit_toolbar_overlay(
        &app,
        &window,
        payload.item_id,
        payload.bounds,
        payload.runtime_session_id,
        payload.generation,
        payload.dirty,
        payload.selected_data_id,
        payload.format_state,
    )
}

#[tauri::command]
pub fn attach_html_edit_leave_confirm_overlay_command(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
    payload: AttachHtmlEditLeaveConfirmOverlayRequest,
) -> Result<bool, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }

    attach_html_edit_leave_confirm_overlay(
        &app,
        &window,
        payload.item_id,
        payload.bounds,
        payload.mode.as_deref().unwrap_or("leave"),
        payload.file_name.as_deref().unwrap_or(""),
        payload.request_id.as_deref().unwrap_or(""),
    )
}

#[tauri::command]
pub fn set_html_edit_toolbar_overlay_visibility_command(
    app: tauri::AppHandle,
    payload: SetHtmlEditToolbarOverlayVisibilityRequest,
) -> Result<bool, AppError> {
    set_html_edit_toolbar_overlay_visibility(&app, payload.item_id, payload.visible)
}

#[tauri::command]
pub fn close_html_edit_toolbar_overlay_command(
    app: tauri::AppHandle,
    payload: CloseHtmlWindowRequest,
) -> Result<bool, AppError> {
    close_html_edit_toolbar_overlay(&app, payload.item_id)
}

#[tauri::command]
pub fn close_html_edit_leave_confirm_overlay_command(
    app: tauri::AppHandle,
    payload: CloseHtmlWindowRequest,
) -> Result<bool, AppError> {
    close_html_edit_leave_confirm_overlay(&app, payload.item_id)
}

#[tauri::command]
pub fn eval_html_runtime_script_command(
    app: tauri::AppHandle,
    payload: EvalHtmlRuntimeScriptRequest,
) -> Result<bool, AppError> {
    let action = if payload.script.contains(".applyFormat(") {
        "format"
    } else if payload.script.contains(".reportState(") || payload.script.contains(".getSnapshot()") {
        "state-refresh"
    } else if payload.script.contains(".__NUTBOOK_HTML_EDIT__.exit(") {
        "leave"
    } else {
        "runtime-script"
    };
    if action != "runtime-script" {
        log_html_edit_debug(
            "eval-request",
            format!("item={} action={action}", payload.item_id),
        );
    }
    let result = eval_html_runtime_script(&app, payload.item_id, &payload.script);
    if action != "runtime-script" {
        match &result {
            Ok(applied) => log_html_edit_debug(
                "eval-result",
                format!("item={} action={action} result=ok applied={applied}", payload.item_id),
            ),
            Err(error) => log_html_edit_debug(
                "eval-result",
                format!("item={} action={action} result=error error={error:?}", payload.item_id),
            ),
        }
    }
    result
}

/// R9：内容面 caller 授权。可信面（main / detached / 宿主 overlay）返回
/// None —— gate 已把关；内容面 label 必须有会话登记且当前 origin 未漂移
/// （导航离开注册 origin 即失效）。返回登记记录供命令级会话校验。
pub(crate) fn content_session_record(
    state: &AppState,
    webview: &tauri::Webview,
) -> Result<Option<crate::core::content_session::ContentSessionRecord>, AppError> {
    let label = webview.label();
    if crate::core::content_session::ContentSurfaceRole::from_label(label).is_none() {
        return Ok(None);
    }
    let record = state
        .content_sessions
        .get(label)
        .ok_or(AppError::InvalidSession)?;
    // R9-a：URL 获取失败必须拒绝 —— 与标题桥同一规则，不得跳过 origin 检查。
    let url = webview
        .url()
        .map_err(|_| AppError::InvalidSession)?
        .to_string();
    if url != "about:blank" {
        let current = crate::core::content_session::origin_of_url(&url)
            .ok_or(AppError::InvalidSession)?;
        if current != record.origin {
            return Err(AppError::InvalidSession);
        }
    }
    Ok(Some(record))
}

/// R10（Codex 返修）：payload 内 item 身份校验 —— invoke 通道与标题桥共用。
/// - `sourceItemId`（发送方声明）：必须等于登记 item；
/// - `itemId`：默认也必须等于登记 item；唯一例外是
///   `html_edit_conversion_result` 的结果 item —— 前端把
///   `write_editable_html_copy` 的响应合入回报，此时 itemId 是新副本 item
///   而非源 item。副本归属不由前端自证：必须通过服务端校验
///   「该 item 确为登记 item 的 `.nutbook-editable.html` 副本」才放行，
///   不接受任意目的 item。
pub(crate) fn payload_items_authorized(
    state: &AppState,
    record: &crate::core::content_session::ContentSessionRecord,
    payload: &Value,
) -> Result<(), AppError> {
    use crate::core::content_session::RuntimeKey;
    let message_type = payload.get("type").and_then(Value::as_str).unwrap_or("");
    // P2（Codex revision 32 §3）：外部阅读面没有 item 身份，任何自报 item 都
    // 按伪造处理 —— 不允许「外部会话自称某个 itemId」骗过数据库路径，也不
    // 允许把加入前的临时内容挂到某个正式条目上。
    let RuntimeKey::Item(registered_item_id) = &record.key else {
        if payload.get("sourceItemId").and_then(Value::as_i64).is_some()
            || payload.get("itemId").and_then(Value::as_i64).is_some()
        {
            return Err(AppError::InvalidSession);
        }
        return Ok(());
    };
    if let Some(source) = payload.get("sourceItemId").and_then(Value::as_i64) {
        if source != *registered_item_id {
            return Err(AppError::InvalidSession);
        }
    }
    if let Some(item_id) = payload.get("itemId").and_then(Value::as_i64) {
        if item_id != *registered_item_id {
            let copy_ok = message_type == "html_edit_conversion_result"
                && item_is_editable_copy_of(state, *registered_item_id, item_id).unwrap_or(false);
            if !copy_ok {
                return Err(AppError::InvalidSession);
            }
        }
    }
    Ok(())
}

/// R10：服务端校验 `result_item_id` 是否为 `source_item_id` 的可编辑副本。
/// 目标推导与 `write_editable_html_copy` 保持同一规则：
/// `{源文件 stem}.nutbook-editable.html`，与源同目录、同 library。
pub(crate) fn item_is_editable_copy_of(
    state: &AppState,
    source_item_id: i64,
    result_item_id: i64,
) -> Result<bool, AppError> {
    let source = state.get_item_detail(source_item_id)?;
    if source.summary.file_type != "html" {
        return Ok(false);
    }
    let source_path = std::path::PathBuf::from(&source.summary.file_path);
    let expected = crate::commands::html_edit::editable_copy_path(&source_path)
        .ok_or(AppError::InvalidParams)?;
    let Ok(expected_canonical) = expected.canonicalize() else {
        // 预期副本路径不存在 → result 不可能是合法副本。
        return Ok(false);
    };
    let result = state.get_item_detail(result_item_id)?;
    if result.summary.file_type != "html" {
        return Ok(false);
    }
    let result_canonical = std::path::PathBuf::from(&result.summary.file_path)
        .canonicalize()
        .map_err(|_| AppError::ItemNotFound)?;
    Ok(result_canonical == expected_canonical)
}

/// R9-c（Codex 返修）：view-state 回报的完整入口裁决，invoke 通道与标题桥
/// 共用。两段缺一不可：
/// - item 归属（payload_items_authorized）：伪造他人 itemId 的回报拒绝；
/// - surface 身份（view_state_surface_matches）：payload.surfaceToken 必须
///   等于发送方登记的 surface token —— 旧 surface（换代后旧 token）、未注入
///   view-state 脚本的 surface 与伪造他人 token（token 为宿主顺序分配、可
///   被猜测，不构成凭证，必须与发送方身份绑定）全部拒绝。
pub(crate) fn view_state_payload_authorized(
    state: &AppState,
    record: &crate::core::content_session::ContentSessionRecord,
    payload: &Value,
) -> Result<(), AppError> {
    payload_items_authorized(state, record, payload)?;
    if !crate::core::content_session::view_state_surface_matches(record, payload) {
        return Err(AppError::InvalidSession);
    }
    Ok(())
}

#[tauri::command]
pub fn html_edit_runtime_message_command(
    app: tauri::AppHandle,
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    payload: Value,
) -> Result<bool, AppError> {
    let message_type = payload.get("type").and_then(Value::as_str).unwrap_or("");
    let runtime_session_id = payload
        .get("runtimeSessionId")
        .and_then(Value::as_str)
        .unwrap_or("");
    let generation = payload
        .get("generation")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    if !message_type.starts_with("html_edit_") || runtime_session_id.is_empty() {
        return Err(AppError::InvalidParams);
    }
    // R9：内容面按会话登记 + 角色类型分权裁决；可信面（record = None）放行。
    if let Some(record) = content_session_record(&state, &webview)? {
        use crate::core::content_session::RuntimeKey;
        payload_items_authorized(&state, &record, &payload)?;
        // P2（Codex revision 32 §4）：外部阅读面没有 item，也就没有 HTML 编辑
        // lease —— 加入本身不升级阅读权限。lease 只在 Item 身份下查询。
        let lease = match &record.key {
            RuntimeKey::Item(item_id) => state.html_edit_session_lease_matches(
                *item_id,
                runtime_session_id,
                generation,
            )?,
            RuntimeKey::External(_) => false,
        };
        crate::core::content_session::verify_bridge_message(
            Some(&record),
            None, // origin 已在 content_session_record 中复核
            record.key.item_id(),
            runtime_session_id,
            generation,
            message_type,
            if lease { Some((runtime_session_id, generation)) } else { None },
        )
        .map_err(|_| AppError::InvalidSession)?;
    }
    let main_webview = app.get_webview("main").ok_or(AppError::InternalError)?;
    let payload_json = serde_json::to_string(&payload).map_err(|_| AppError::InternalError)?;
    main_webview
        .eval(&format!(
            "window.__NUTBOOK_HANDLE_HTML_EDIT_RUNTIME_MESSAGE__?.({payload_json});"
        ))
        .map_err(|_| AppError::InternalError)?;
    log_html_edit_debug("runtime-ipc-forward", crate::core::html_runtime::html_edit_debug_payload_fields(&payload));
    Ok(true)
}

#[tauri::command]
pub fn html_runtime_view_state_command(
    app: tauri::AppHandle,
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    payload: Value,
) -> Result<bool, AppError> {
    // R9：view-state 桥同样过会话登记 + origin 复核；R9-c：item 归属与
    // surface 身份与标题桥共用同一裁决。
    if let Some(record) = content_session_record(&state, &webview)? {
        view_state_payload_authorized(&state, &record, &payload)?;
    }
    forward_html_runtime_view_state(&app, &payload)
}

#[tauri::command]
pub fn attach_markdown_controls_overlay_command(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
    payload: AttachHtmlRuntimeControlsOverlayRequest,
) -> Result<bool, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" && item.summary.file_type != "markdown" {
        return Err(AppError::UnsupportedFileType);
    }
    attach_controls_overlay(
        &app,
        &window,
        payload.item_id,
        payload.bounds,
        payload.is_favorite,
        payload.is_fullscreen,
        payload.is_editing,
        payload.is_primary_busy,
        payload.custom_tag,
        payload.available_tags,
        payload.skill_tag,
        payload.type_tag,
        payload.custom_tags,
        payload.source_badges,
        item.summary.file_name.clone(),
        payload.language,
    )?;
    Ok(true)
}

#[tauri::command]
pub fn close_html_window(
    app: tauri::AppHandle,
    payload: CloseHtmlWindowRequest,
) -> Result<bool, AppError> {
    close_html_runtime_window(&app, payload.item_id)
}

#[tauri::command]
pub fn close_markdown_overlay_command(
    app: tauri::AppHandle,
    payload: CloseHtmlWindowRequest,
) -> Result<bool, AppError> {
    close_html_runtime_window(&app, payload.item_id)
}

#[tauri::command]
pub fn set_window_fullscreen_command(
    window: tauri::Window,
    fullscreen: bool,
) -> Result<bool, AppError> {
    window
        .set_fullscreen(fullscreen)
        .map_err(|_| AppError::InternalError)?;
    Ok(true)
}

#[tauri::command]
pub fn is_window_minimized_command(window: tauri::Window) -> Result<bool, AppError> {
    window.is_minimized().map_err(|_| AppError::InternalError)
}

#[tauri::command]
pub fn dispatch_html_runtime_shortcut_command(
    app: tauri::AppHandle,
    payload: DispatchHtmlRuntimeShortcutRequest,
) -> Result<bool, AppError> {
    dispatch_html_runtime_shortcut(&app, payload.item_id, &payload.key)
}

#[tauri::command]
pub fn focus_html_runtime_host_command(
    app: tauri::AppHandle,
    payload: FocusHtmlRuntimeHostRequest,
) -> Result<bool, AppError> {
    focus_html_runtime_host(&app, payload.item_id, payload.host_fullscreen)
}

#[tauri::command]
pub fn focus_main_webview_command(
    app: tauri::AppHandle,
) -> Result<bool, AppError> {
    focus_main_webview(&app)
}

pub(crate) fn save_markdown_content_impl(
    state: &AppState,
    payload: SaveMarkdownContentRequest,
) -> Result<SaveMarkdownContentResponse, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "markdown" {
        return Err(AppError::UnsupportedFileType);
    }

    let current_raw = std::fs::read_to_string(&item.summary.file_path).map_err(|_| AppError::IoError)?;
    let current_hash = content_hash(&current_raw);
    if current_hash != payload.expected_file_hash {
        return Err(AppError::EditConflict);
    }

    if let Some(expected_modified_at) = payload.expected_modified_at.as_deref() {
        if expected_modified_at != item.summary.modified_at {
            return Err(AppError::EditConflict);
        }
    }

    std::fs::write(&item.summary.file_path, &payload.content).map_err(|_| AppError::MarkdownSaveFailed)?;
    let written_raw = std::fs::read_to_string(&item.summary.file_path).map_err(|_| AppError::IoError)?;
    let new_hash = content_hash(&written_raw);
    let rendered_html = render_markdown_as_html_for_file(&written_raw, &item.summary.file_name);
    let summary = markdown_summary(&written_raw);
    let modified_at = std::fs::metadata(&item.summary.file_path)
        .ok()
        .and_then(|metadata| file_modified_at_string(&metadata).ok())
        .unwrap_or_else(|| item.summary.modified_at.clone());

    state.update_markdown_item_content(
        payload.item_id,
        &summary,
        &modified_at,
        &new_hash,
        &written_raw,
        &written_raw,
        &rendered_html,
    )?;

    Ok(SaveMarkdownContentResponse {
        item_id: payload.item_id,
        modified_at,
        file_hash: Some(new_hash),
        summary: Some(summary),
        rendered_html: Some(rendered_html),
        saved: true,
    })
}

#[tauri::command]
pub fn save_markdown_content(
    state: tauri::State<'_, AppState>,
    payload: SaveMarkdownContentRequest,
) -> Result<SaveMarkdownContentResponse, AppError> {
    save_markdown_content_impl(&state, payload)
}

#[tauri::command]
pub fn export_markdown_file(
    state: tauri::State<'_, AppState>,
    payload: ExportMarkdownRequest,
) -> Result<bool, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "markdown" {
        return Err(AppError::UnsupportedFileType);
    }

    let content = item
        .source_text
        .clone()
        .unwrap_or_else(|| std::fs::read_to_string(&item.summary.file_path).unwrap_or_default());
    let default_name = markdown_export_default_file_name(
        &DocumentTitle::parse(&content, &item.summary.file_name).display_text,
        &item.summary.file_name,
    );
    let target = rfd::FileDialog::new()
        .set_file_name(&default_name)
        .add_filter("Markdown", &["md", "markdown"])
        .save_file()
        .ok_or(AppError::InvalidParams)?;

    std::fs::write(target, content).map_err(|_| AppError::IoError)?;
    Ok(true)
}

fn markdown_export_default_file_name(title: &str, fallback_file_name: &str) -> String {
    let fallback_path = std::path::Path::new(fallback_file_name);
    let extension = fallback_path
        .extension()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("md");
    let mut stem: String = title
        .chars()
        .map(|value| match value {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            value if value.is_control() => '_',
            value => value,
        })
        .collect::<String>()
        .trim()
        .trim_matches('.')
        .to_string();
    if stem.is_empty() {
        stem = fallback_path
            .file_stem()
            .and_then(|value| value.to_str())
            .filter(|value| !value.trim().is_empty())
            .unwrap_or("Markdown")
            .to_string();
    }
    format!("{stem}.{extension}")
}

const MARKDOWN_IMAGE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "gif", "webp", "svg"];

fn is_supported_markdown_image(path: &std::path::Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| {
            let normalized = extension.to_ascii_lowercase();
            MARKDOWN_IMAGE_EXTENSIONS.contains(&normalized.as_str())
        })
        .unwrap_or(false)
}

fn markdown_relative_asset_path(file_name: &str) -> String {
    format!("./assets/{}", file_name.replace('\\', "/"))
}

fn markdown_asset_path_from_src(markdown_path: &std::path::Path, image_src: &str) -> Result<std::path::PathBuf, AppError> {
    let src = image_src
        .split(['#', '?'])
        .next()
        .unwrap_or("")
        .trim()
        .replace('\\', "/");
    if src.is_empty()
        || src.starts_with('/')
        || src.starts_with("data:")
        || src.starts_with("blob:")
        || src.contains("://")
    {
        return Err(AppError::InvalidParams);
    }

    let relative = std::path::Path::new(&src);
    let mut components = relative.components();
    match components.next() {
        Some(Component::CurDir) => match components.next() {
            Some(Component::Normal(segment)) if segment == "assets" => {}
            _ => return Err(AppError::InvalidParams),
        },
        Some(Component::Normal(segment)) if segment == "assets" => {}
        _ => return Err(AppError::InvalidParams),
    }

    let mut asset_relative = std::path::PathBuf::new();
    for component in components {
        match component {
            Component::Normal(segment) => asset_relative.push(segment),
            _ => return Err(AppError::InvalidParams),
        }
    }
    if asset_relative.as_os_str().is_empty() {
        return Err(AppError::InvalidParams);
    }

    let markdown_dir = markdown_path.parent().ok_or(AppError::InvalidParams)?;
    let asset_path = markdown_dir.join("assets").join(asset_relative);
    if !is_supported_markdown_image(&asset_path) {
        return Err(AppError::UnsupportedFileType);
    }
    Ok(asset_path)
}

fn next_available_asset_path(assets_dir: &std::path::Path, source_path: &std::path::Path) -> Result<std::path::PathBuf, AppError> {
    let file_name = source_path
        .file_name()
        .and_then(|file_name| file_name.to_str())
        .filter(|file_name| !file_name.trim().is_empty())
        .ok_or(AppError::InvalidParams)?;
    let first_candidate = assets_dir.join(file_name);
    if !first_candidate.exists() {
        return Ok(first_candidate);
    }

    if let (Ok(source), Ok(existing)) = (source_path.canonicalize(), first_candidate.canonicalize()) {
        if source == existing {
            return Ok(first_candidate);
        }
    }

    let stem = source_path
        .file_stem()
        .and_then(|stem| stem.to_str())
        .filter(|stem| !stem.trim().is_empty())
        .unwrap_or("image");
    let extension = source_path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| format!(".{extension}"))
        .unwrap_or_default();

    for index in 2..10_000 {
        let candidate = assets_dir.join(format!("{stem}-{index}{extension}"));
        if !candidate.exists() {
            return Ok(candidate);
        }
    }

    Err(AppError::IoError)
}

pub fn copy_markdown_image_asset_impl(
    payload: CopyMarkdownImageAssetRequest,
) -> Result<CopyMarkdownImageAssetResponse, AppError> {
    let markdown_path = std::path::PathBuf::from(payload.markdown_file_path);
    let source_path = std::path::PathBuf::from(payload.source_image_path);
    if !source_path.is_file() {
        return Err(AppError::InvalidParams);
    }
    if !is_supported_markdown_image(&source_path) {
        return Err(AppError::UnsupportedFileType);
    }

    let markdown_dir = markdown_path.parent().ok_or(AppError::InvalidParams)?;
    let assets_dir = markdown_dir.join("assets");
    std::fs::create_dir_all(&assets_dir).map_err(|_| AppError::IoError)?;

    let target_path = next_available_asset_path(&assets_dir, &source_path)?;
    let same_file = match (source_path.canonicalize(), target_path.canonicalize()) {
        (Ok(source), Ok(target)) => source == target,
        _ => false,
    };
    if !same_file {
        std::fs::copy(&source_path, &target_path).map_err(|_| AppError::IoError)?;
    }

    let file_name = target_path
        .file_name()
        .and_then(|file_name| file_name.to_str())
        .ok_or(AppError::InvalidParams)?
        .to_string();

    Ok(CopyMarkdownImageAssetResponse {
        relative_path: markdown_relative_asset_path(&file_name),
        asset_path: target_path.to_string_lossy().to_string(),
        file_name,
    })
}

#[tauri::command]
pub fn copy_markdown_image_asset(
    payload: CopyMarkdownImageAssetRequest,
) -> Result<CopyMarkdownImageAssetResponse, AppError> {
    copy_markdown_image_asset_impl(payload)
}

pub fn delete_markdown_image_asset_impl(
    payload: DeleteMarkdownImageAssetRequest,
) -> Result<bool, AppError> {
    let markdown_path = std::path::PathBuf::from(payload.markdown_file_path);
    let asset_path = markdown_asset_path_from_src(&markdown_path, &payload.image_src)?;
    if !asset_path.exists() {
        return Ok(false);
    }
    if !asset_path.is_file() {
        return Err(AppError::InvalidParams);
    }
    std::fs::remove_file(&asset_path).map_err(|_| AppError::IoError)?;
    Ok(true)
}

#[tauri::command]
pub fn delete_markdown_image_asset(
    payload: DeleteMarkdownImageAssetRequest,
) -> Result<bool, AppError> {
    delete_markdown_image_asset_impl(payload)
}

// ------------------------------------------------------------------
// PR C / C2：Markdown 封面资源命令
//
// - copy_markdown_cover_asset：复制前完整校验（magic MIME / 扩展 / 字节 /
//   像素 / 4:3..2:1 / EXIF / SVG 安全）→ 复制到 assets/ → 注册 staged lease；
//   校验失败不留下半成品文件。
// - validate_markdown_cover_asset：已有正文本地图片设为封面时不重复 copy，
//   只校验 canonical path / 边界 / MIME / 尺寸 / 比例。
// - release_markdown_cover_lease：放弃/关闭/复制晚到时释放 staged lease，
//   只清理"本会话新建、磁盘 baseline 未引用、当前 draft 未引用"的文件。
// ------------------------------------------------------------------

fn cover_asset_validation_error(error: &crate::core::markdown_cover_assets::CoverReject) -> AppError {
    AppError::CoverAssetRejected(format!("{}: {}", error.kind, error.message))
}

/// 校验 Markdown 中本地 src 的 canonical 解析（越界/符号链接逃逸返回 None）。
fn resolve_markdown_local_src(
    markdown_file_path: &str,
    src: &str,
) -> Option<std::path::PathBuf> {
    let markdown_dir = std::path::Path::new(markdown_file_path).parent()?;
    crate::core::thumbnail::resolve_cover_asset_path(src, markdown_dir)
}

pub fn copy_markdown_cover_asset_impl(
    state: &AppState,
    payload: CopyMarkdownCoverAssetRequest,
) -> Result<CopyMarkdownCoverAssetResponse, AppError> {
    let markdown_path = std::path::PathBuf::from(&payload.markdown_file_path);
    let source_path = std::path::PathBuf::from(&payload.source_image_path);
    if !source_path.is_file() {
        return Err(AppError::InvalidParams);
    }

    // IPC 参数必须绑定到当前 item 的真实磁盘路径，不能信任 renderer 任意传入的
    // markdown_file_path 后向旁路目录创建 assets/。canonical 比较同时收敛 macOS
    // `/var` → `/private/var` 等别名。
    let indexed_markdown_path = std::path::PathBuf::from(
        state.get_item_detail(payload.item_id)?.summary.file_path,
    );
    let requested_markdown = markdown_path
        .canonicalize()
        .map_err(|_| AppError::InvalidParams)?;
    let indexed_markdown = indexed_markdown_path
        .canonicalize()
        .map_err(|_| AppError::InvalidParams)?;
    if requested_markdown != indexed_markdown {
        return Err(AppError::InvalidParams);
    }

    // 复制前完整校验：失败不产生任何半成品（不复制、不注册 lease、不写 transaction）。
    let validated_source =
        crate::core::markdown_cover_assets::validate_local_cover_asset(&source_path)
            .map_err(|error| cover_asset_validation_error(&error))?;

    let markdown_dir = markdown_path.parent().ok_or(AppError::InvalidParams)?;
    let assets_dir = markdown_dir.join("assets");
    std::fs::create_dir_all(&assets_dir).map_err(|_| AppError::IoError)?;

    let target_path = next_available_asset_path(&assets_dir, &source_path)?;
    let same_file = match (source_path.canonicalize(), target_path.canonicalize()) {
        (Ok(source), Ok(target)) => source == target,
        _ => false,
    };
    let created_staged_file = !same_file;
    let validated = if created_staged_file {
        if std::fs::copy(&source_path, &target_path).is_err() {
            let _ = std::fs::remove_file(&target_path);
            return Err(AppError::IoError);
        }
        // 以真正落盘的 bytes 为最终状态源，避免源文件在校验与 copy 之间变化，
        // 或 copy 失败后留下未校验的半成品。
        match crate::core::markdown_cover_assets::validate_local_cover_asset(&target_path) {
            Ok(validated) => validated,
            Err(error) => {
                let _ = std::fs::remove_file(&target_path);
                return Err(cover_asset_validation_error(&error));
            }
        }
    } else {
        validated_source
    };

    let file_name = target_path
        .file_name()
        .and_then(|file_name| file_name.to_str())
        .ok_or(AppError::InvalidParams)?
        .to_string();
    let relative_path = markdown_relative_asset_path(&file_name);
    // 只有本命令实际新建的文件才是 staged asset。若用户直接选择文档自身
    // assets/ 里的现有图片，返回同一相对路径但绝不登记 lease；否则放弃/关闭会
    // 把已提交或正文共享资源误当临时文件删除。
    let staged_asset_id = if created_staged_file {
        let staged_asset_id = uuid::Uuid::new_v4().to_string();
        let lease = crate::state::CoverAssetLease {
            item_id: payload.item_id,
            markdown_canonical_path: requested_markdown.to_string_lossy().to_string(),
            tab_id: payload.tab_id.clone(),
            operation_generation: payload.operation_generation,
            staged_asset_id: staged_asset_id.clone(),
            staged_path: target_path.clone(),
            relative_src: relative_path.clone(),
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        if state.register_cover_asset_lease(lease).is_err() {
            let _ = std::fs::remove_file(&target_path);
            return Err(AppError::InternalError);
        }
        staged_asset_id
    } else {
        String::new()
    };

    Ok(CopyMarkdownCoverAssetResponse {
        relative_path,
        staged_asset_id,
        file_name,
        natural_width: validated.natural_width,
        natural_height: validated.natural_height,
    })
}

#[tauri::command]
pub fn copy_markdown_cover_asset(
    state: tauri::State<'_, AppState>,
    payload: CopyMarkdownCoverAssetRequest,
) -> Result<CopyMarkdownCoverAssetResponse, AppError> {
    copy_markdown_cover_asset_impl(&state, payload)
}

pub fn validate_markdown_cover_asset_impl(
    state: &AppState,
    payload: ValidateMarkdownCoverAssetRequest,
) -> Result<ValidateMarkdownCoverAssetResponse, AppError> {
    // 与 copy 命令保持相同的 item/path 绑定。校验虽不写盘，但也不能让 renderer
    // 借任意 markdown_file_path 探测资料库外的本地文件。
    let requested_markdown = std::path::PathBuf::from(&payload.markdown_file_path)
        .canonicalize()
        .map_err(|_| AppError::InvalidParams)?;
    let indexed_markdown = std::path::PathBuf::from(
        state.get_item_detail(payload.item_id)?.summary.file_path,
    )
    .canonicalize()
    .map_err(|_| AppError::InvalidParams)?;
    if requested_markdown != indexed_markdown {
        return Err(AppError::InvalidParams);
    }
    let Some(resolved) = resolve_markdown_local_src(&payload.markdown_file_path, &payload.src)
    else {
        return Ok(ValidateMarkdownCoverAssetResponse {
            valid: false,
            reason: Some(format!("cover src `{}` escapes the document directory", payload.src)),
            natural_width: None,
            natural_height: None,
        });
    };
    match crate::core::markdown_cover_assets::validate_local_cover_asset(&resolved) {
        Ok(asset) => Ok(ValidateMarkdownCoverAssetResponse {
            valid: true,
            reason: None,
            natural_width: Some(asset.natural_width),
            natural_height: Some(asset.natural_height),
        }),
        Err(error) => Ok(ValidateMarkdownCoverAssetResponse {
            valid: false,
            reason: Some(error.message),
            natural_width: None,
            natural_height: None,
        }),
    }
}

#[tauri::command]
pub fn validate_markdown_cover_asset(
    state: tauri::State<'_, AppState>,
    payload: ValidateMarkdownCoverAssetRequest,
) -> Result<ValidateMarkdownCoverAssetResponse, AppError> {
    validate_markdown_cover_asset_impl(&state, payload)
}

pub fn release_markdown_cover_lease_impl(
    state: &AppState,
    payload: ReleaseMarkdownCoverLeaseRequest,
) -> Result<ReleaseMarkdownCoverLeaseResponse, AppError> {
    // 磁盘 baseline 引用保护：读取当前磁盘 Markdown，收集其中出现的全部图片 src。
    let baseline_srcs = state
        .get_item_detail(payload.item_id)
        .ok()
        .and_then(|item| std::fs::read_to_string(item.summary.file_path).ok())
        .map(|raw| crate::core::markdown_cover::collect_document_image_srcs(&raw))
        .unwrap_or_default();
    let cleaned = state.release_cover_asset_leases(
        payload.item_id,
        &payload.tab_id,
        payload.operation_generation,
        &payload.draft_image_srcs,
        &baseline_srcs,
    )?;
    Ok(ReleaseMarkdownCoverLeaseResponse { cleaned })
}

#[tauri::command]
pub fn release_markdown_cover_lease(
    state: tauri::State<'_, AppState>,
    payload: ReleaseMarkdownCoverLeaseRequest,
) -> Result<ReleaseMarkdownCoverLeaseResponse, AppError> {
    release_markdown_cover_lease_impl(&state, payload)
}

#[cfg(test)]
mod tests {
    use std::{fs, time::{SystemTime, UNIX_EPOCH}};

    use crate::{
        core::document::{content_hash, load_document_payload, MarkdownResourceContext},
        db::{repositories::{ItemRepository, LibraryRepository}, Database},
        models::{CopyMarkdownImageAssetRequest, DeleteMarkdownImageAssetRequest, IndexedItemRecord, Library, PreviewPayload, SaveMarkdownContentRequest},
        state::AppState,
    };

    use super::{
        copy_markdown_cover_asset_impl, copy_markdown_image_asset_impl,
        delete_markdown_image_asset_impl, markdown_export_default_file_name,
        release_markdown_cover_lease_impl, save_markdown_content_impl,
        validate_markdown_cover_asset_impl,
    };
    use crate::errors::AppError;
    use crate::models::{
        CopyMarkdownCoverAssetRequest, ReleaseMarkdownCoverLeaseRequest,
        ValidateMarkdownCoverAssetRequest,
    };

    fn temp_path(name: &str) -> std::path::PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("nutbook-preview-{name}-{nanos}"))
    }

    fn external_session_record(
        session_id: &str,
        generation: u64,
    ) -> crate::core::content_session::ContentSessionRecord {
        crate::core::content_session::ContentSessionRecord {
            role: crate::core::content_session::ContentSurfaceRole::ExternalHost,
            key: crate::core::content_session::RuntimeKey::External(session_id.to_string()),
            origin: "http://127.0.0.1:1".to_string(),
            runtime_session_id: String::new(),
            generation,
            view_state_surface_token: 0,
        }
    }

    /// P2 / §6.2：promotion 采集回报的身份裁决 —— 外部阅读面没有常驻 view-state
    /// 脚本（token 恒 0），身份改由「角色 + External key + 自报会话/代次一致」
    /// 三件事实共同确定；编辑面角色与 Item 身份都不得走这条通道。
    #[test]
    fn external_view_state_report_requires_external_identity_and_current_generation() {
        use super::external_view_state_payload_authorized as authorize;
        use serde_json::json;

        let record = external_session_record("ext-1", 3);
        assert!(authorize(&record, &json!({ "sessionId": "ext-1", "generation": 3 })).is_ok());
        // 自报他人会话 / 旧代次 / 零代次 / 空会话：全部拒绝。
        assert!(authorize(&record, &json!({ "sessionId": "ext-2", "generation": 3 })).is_err());
        assert!(authorize(&record, &json!({ "sessionId": "ext-1", "generation": 2 })).is_err());
        assert!(authorize(&record, &json!({ "sessionId": "ext-1", "generation": 0 })).is_err());
        assert!(authorize(&record, &json!({ "sessionId": "", "generation": 3 })).is_err());
        // 只报 itemId（沿用 item 阅读面的形状）不构成合法回报。
        assert!(authorize(&record, &json!({ "itemId": 42, "generation": 3 })).is_err());

        // 编辑面角色即使 key 形状是 External 也不得使用这条通道。
        let mut forged_role = external_session_record("ext-1", 3);
        forged_role.role = crate::core::content_session::ContentSurfaceRole::RuntimeHost;
        assert!(authorize(&forged_role, &json!({ "sessionId": "ext-1", "generation": 3 })).is_err());

        // Item 身份的 host 同样不得使用。
        let mut item_identity = external_session_record("ext-1", 3);
        item_identity.key = crate::core::content_session::RuntimeKey::Item(7);
        assert!(authorize(&item_identity, &json!({ "sessionId": "ext-1", "generation": 3 })).is_err());
    }

    #[test]
    fn preview_payload_loads_markdown_file_contents() {
        let root = temp_path("root");
        fs::create_dir_all(&root).expect("root dir should be created");
        let markdown_path = root.join("note.md");
        fs::write(&markdown_path, "# Hello").expect("markdown file should be written");

        let db_path = temp_path("db").with_extension("sqlite3");
        let database = Database::new(&db_path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());

        state
            .upsert_library(Library {
                id: 1,
                name: "Preview".to_string(),
                root_path: root.to_string_lossy().to_string(),
                source_kind: "folder".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "now".to_string(),
                updated_at: "now".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be created");

        state
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: markdown_path.to_string_lossy().to_string(),
                    relative_path: "note.md".to_string(),
                    file_name: "note.md".to_string(),
                    file_ext: "md".to_string(),
                    file_type: "markdown".to_string(),
                    file_size: 7,
                    modified_at: "1".to_string(),
                    created_at: "now".to_string(),
                    updated_at: "now".to_string(),
                }],
            )
            .expect("item should be inserted");

        let item = state.get_item_detail(1).expect("detail should load");
        let payload = load_document_payload(&item, |_| "http://127.0.0.1:4000/fs/note.md".to_string(), MarkdownResourceContext::default())
            .expect("payload should load");

        match payload {
            PreviewPayload::Markdown(markdown) => {
                assert_eq!(markdown.title.as_deref(), Some("Hello"));
                assert_eq!(markdown.raw, "# Hello");
                assert!(!markdown.html.contains("<h1>Hello</h1>"));
                assert_eq!(markdown.base_dir, root.to_string_lossy());
            }
            PreviewPayload::Html(_) => panic!("expected markdown payload"),
        }

        let _ = fs::remove_file(db_path);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn markdown_preview_emits_complete_scoped_context_in_fresh_app_data_state() {
        let root = temp_path("scoped-context-root");
        let app_data = temp_path("scoped-context-app-data");
        fs::create_dir_all(&root).expect("root dir should be created");
        fs::create_dir_all(&app_data).expect("app data dir should be created");
        let markdown_path = root.join("note.md");
        fs::create_dir_all(root.join("assets")).expect("assets dir should be created");
        fs::write(&markdown_path, "# Hello\n\n![Hero](./assets/hero.png)")
            .expect("markdown file should be written");
        fs::write(root.join("assets").join("hero.png"), b"png")
            .expect("image file should be written");

        let database = Database::new(app_data.join("nutbook.sqlite3")).expect("db");
        let state = AppState::new(database, app_data.clone());
        state
            .upsert_library(Library {
                id: 1,
                name: "Scoped preview".to_string(),
                root_path: root.to_string_lossy().to_string(),
                source_kind: "folder".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "now".to_string(),
                updated_at: "now".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be created");
        state
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: markdown_path.to_string_lossy().to_string(),
                    relative_path: "note.md".to_string(),
                    file_name: "note.md".to_string(),
                    file_ext: "md".to_string(),
                    file_type: "markdown".to_string(),
                    file_size: 34,
                    modified_at: "1".to_string(),
                    created_at: "now".to_string(),
                    updated_at: "now".to_string(),
                }],
            )
            .expect("item should be inserted");

        let item = state.get_item_detail(1).expect("detail should load");
        // The sandbox running this unit suite does not permit loopback bind;
        // use the same complete context shape that the scoped server emits and
        // keep the actual bind/startup path covered by the production helper.
        let canonical_root = root.canonicalize().expect("canonical root");
        let context = MarkdownResourceContext {
            origin: "http://127.0.0.1:43199".to_string(),
            root: canonical_root.to_string_lossy().to_string(),
            base_dir: canonical_root.to_string_lossy().to_string(),
        };
        assert!(context.origin.starts_with("http://127.0.0.1:"), "{}", context.origin);
        assert_eq!(
            context.root,
            canonical_root.to_string_lossy()
        );
        assert_eq!(
            context.base_dir,
            canonical_root.to_string_lossy()
        );
        let payload = load_document_payload(&item, |_| String::new(), context)
            .expect("payload should load with scoped context");
        match payload {
            PreviewPayload::Markdown(markdown) => {
                assert!(markdown.resource_origin.starts_with("http://127.0.0.1:"));
                assert!(!markdown.resource_origin.contains("/fs"));
                assert_eq!(markdown.resource_root, canonical_root.to_string_lossy());
                assert_eq!(markdown.resource_base_dir, canonical_root.to_string_lossy());
            }
            PreviewPayload::Html(_) => panic!("expected markdown payload"),
        }

        drop(state);
        let _ = fs::remove_dir_all(app_data);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn save_markdown_content_writes_file_and_updates_db() {
        let root = temp_path("save-root");
        fs::create_dir_all(&root).expect("root dir should be created");
        let markdown_path = root.join("note.md");
        fs::write(&markdown_path, "# Hello").expect("markdown file should be written");

        let db_path = temp_path("save-db").with_extension("sqlite3");
        let database = Database::new(&db_path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());

        state
            .upsert_library(Library {
                id: 1,
                name: "Preview".to_string(),
                root_path: root.to_string_lossy().to_string(),
                source_kind: "folder".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "1".to_string(),
                updated_at: "1".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be created");

        state
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: markdown_path.to_string_lossy().to_string(),
                    relative_path: "note.md".to_string(),
                    file_name: "note.md".to_string(),
                    file_ext: "md".to_string(),
                    file_type: "markdown".to_string(),
                    file_size: 7,
                    modified_at: "1".to_string(),
                    created_at: "1".to_string(),
                    updated_at: "1".to_string(),
                }],
            )
            .expect("item should be inserted");

        let response = save_markdown_content_impl(
            &state,
            SaveMarkdownContentRequest {
                item_id: 1,
                content: "# Updated".to_string(),
                expected_file_hash: content_hash("# Hello"),
                expected_modified_at: Some("1".to_string()),
            },
        )
        .expect("save should succeed");

        assert_eq!(fs::read_to_string(&markdown_path).expect("file should read"), "# Updated");
        assert_eq!(response.summary.as_deref(), Some("Updated"));

        let detail = state.get_item_detail(1).expect("detail should load");
        assert_eq!(detail.source_text.as_deref(), Some("# Updated"));

        let _ = fs::remove_file(db_path);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn save_markdown_content_keeps_list_detail_and_payload_in_sync() {
        let root = temp_path("consistency-root");
        fs::create_dir_all(&root).expect("root dir should be created");
        let markdown_path = root.join("my note.md");
        fs::write(&markdown_path, "# Original").expect("markdown file should be written");

        let db_path = temp_path("consistency-db").with_extension("sqlite3");
        let database = Database::new(&db_path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());

        state
            .upsert_library(Library {
                id: 1,
                name: "Consistency".to_string(),
                root_path: root.to_string_lossy().to_string(),
                source_kind: "folder".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "1".to_string(),
                updated_at: "1".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be created");

        state
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: markdown_path.to_string_lossy().to_string(),
                    relative_path: "my note.md".to_string(),
                    file_name: "my note.md".to_string(),
                    file_ext: "md".to_string(),
                    file_type: "markdown".to_string(),
                    file_size: 10,
                    modified_at: "1".to_string(),
                    created_at: "1".to_string(),
                    updated_at: "1".to_string(),
                }],
            )
            .expect("item should be inserted");

        save_markdown_content_impl(
            &state,
            SaveMarkdownContentRequest {
                item_id: 1,
                content: "# Updated Title\n\nbody".to_string(),
                expected_file_hash: content_hash("# Original"),
                expected_modified_at: Some("1".to_string()),
            },
        )
        .expect("save should succeed");

        let list = state
            .list_items(&crate::models::ListItemsQuery {
                library_id: Some(1),
                ..crate::models::ListItemsQuery::default()
            })
            .expect("list should load");
        assert_eq!(list.items[0].summary.as_deref(), Some("Updated Title"));

        let detail = state.get_item_detail(1).expect("detail should load");
        assert_eq!(detail.summary.summary.as_deref(), Some("Updated Title"));
        assert_eq!(detail.source_text.as_deref(), Some("# Updated Title\n\nbody"));

        let payload = load_document_payload(&detail, |_| "http://127.0.0.1:4000/fs/note.md".to_string(), MarkdownResourceContext::default())
            .expect("payload should load");
        match payload {
            PreviewPayload::Markdown(markdown) => {
                assert_eq!(markdown.title.as_deref(), Some("Updated Title"));
                assert_eq!(markdown.raw, "# Updated Title\n\nbody");
                assert!(!markdown.html.contains("Updated Title"));
                assert!(markdown.html.contains("<p>body</p>"));
            }
            PreviewPayload::Html(_) => panic!("expected markdown payload"),
        }

        let _ = fs::remove_file(db_path);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn markdown_export_default_file_name_uses_sanitized_document_title() {
        assert_eq!(
            markdown_export_default_file_name("AI/Report: Draft?", "old-name.md"),
            "AI_Report_ Draft_.md"
        );
    }

    #[test]
    fn copy_markdown_image_asset_copies_to_sibling_assets() {
        let root = temp_path("asset-copy-root");
        let source_dir = temp_path("asset-copy-source");
        fs::create_dir_all(&root).expect("root dir should be created");
        fs::create_dir_all(&source_dir).expect("source dir should be created");
        let markdown_path = root.join("README.md");
        let image_path = source_dir.join("Hero Image.PNG");
        fs::write(&markdown_path, "# Readme").expect("markdown should be written");
        fs::write(&image_path, b"png bytes").expect("image should be written");

        let response = copy_markdown_image_asset_impl(CopyMarkdownImageAssetRequest {
            markdown_file_path: markdown_path.to_string_lossy().to_string(),
            source_image_path: image_path.to_string_lossy().to_string(),
        })
        .expect("copy should succeed");

        assert_eq!(response.relative_path, "./assets/Hero Image.PNG");
        assert_eq!(response.file_name, "Hero Image.PNG");
        assert_eq!(
            fs::read(root.join("assets").join("Hero Image.PNG")).expect("copied image should read"),
            b"png bytes"
        );

        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_dir_all(source_dir);
    }

    #[test]
    fn copy_markdown_image_asset_adds_suffix_for_name_collision() {
        let root = temp_path("asset-collision-root");
        let source_dir = temp_path("asset-collision-source");
        fs::create_dir_all(root.join("assets")).expect("assets dir should be created");
        fs::create_dir_all(&source_dir).expect("source dir should be created");
        let markdown_path = root.join("note.md");
        let source_path = source_dir.join("photo.jpg");
        fs::write(&markdown_path, "# Note").expect("markdown should be written");
        fs::write(root.join("assets").join("photo.jpg"), b"old").expect("old image should be written");
        fs::write(&source_path, b"new").expect("new image should be written");

        let response = copy_markdown_image_asset_impl(CopyMarkdownImageAssetRequest {
            markdown_file_path: markdown_path.to_string_lossy().to_string(),
            source_image_path: source_path.to_string_lossy().to_string(),
        })
        .expect("copy should succeed");

        assert_eq!(response.relative_path, "./assets/photo-2.jpg");
        assert_eq!(
            fs::read(root.join("assets").join("photo-2.jpg")).expect("copied image should read"),
            b"new"
        );
        assert_eq!(
            fs::read(root.join("assets").join("photo.jpg")).expect("existing image should remain"),
            b"old"
        );

        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_dir_all(source_dir);
    }

    #[test]
    fn copy_markdown_image_asset_reuses_existing_asset_file() {
        let root = temp_path("asset-reuse-root");
        fs::create_dir_all(root.join("assets")).expect("assets dir should be created");
        let markdown_path = root.join("note.md");
        let image_path = root.join("assets").join("diagram.svg");
        fs::write(&markdown_path, "# Note").expect("markdown should be written");
        fs::write(&image_path, "<svg></svg>").expect("svg should be written");

        let response = copy_markdown_image_asset_impl(CopyMarkdownImageAssetRequest {
            markdown_file_path: markdown_path.to_string_lossy().to_string(),
            source_image_path: image_path.to_string_lossy().to_string(),
        })
        .expect("reuse should succeed");

        assert_eq!(response.relative_path, "./assets/diagram.svg");
        assert_eq!(response.asset_path, image_path.to_string_lossy());

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn copy_markdown_image_asset_rejects_non_image_file() {
        let root = temp_path("asset-reject-root");
        let source_dir = temp_path("asset-reject-source");
        fs::create_dir_all(&root).expect("root dir should be created");
        fs::create_dir_all(&source_dir).expect("source dir should be created");
        let markdown_path = root.join("note.md");
        let source_path = source_dir.join("notes.txt");
        fs::write(&markdown_path, "# Note").expect("markdown should be written");
        fs::write(&source_path, "text").expect("source should be written");

        let error = copy_markdown_image_asset_impl(CopyMarkdownImageAssetRequest {
            markdown_file_path: markdown_path.to_string_lossy().to_string(),
            source_image_path: source_path.to_string_lossy().to_string(),
        })
        .expect_err("non-image should be rejected");

        assert_eq!(error.code(), "UNSUPPORTED_FILE_TYPE");
        assert!(!root.join("assets").exists());

        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_dir_all(source_dir);
    }

    #[test]
    fn delete_markdown_image_asset_removes_sibling_asset_file() {
        let root = temp_path("asset-delete-root");
        fs::create_dir_all(root.join("assets")).expect("assets dir should be created");
        let markdown_path = root.join("note.md");
        let image_path = root.join("assets").join("photo.png");
        fs::write(&markdown_path, "# Note").expect("markdown should be written");
        fs::write(&image_path, b"image").expect("image should be written");

        let deleted = delete_markdown_image_asset_impl(DeleteMarkdownImageAssetRequest {
            markdown_file_path: markdown_path.to_string_lossy().to_string(),
            image_src: "./assets/photo.png".to_string(),
        })
        .expect("delete should succeed");

        assert!(deleted);
        assert!(!image_path.exists());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn delete_markdown_image_asset_rejects_path_outside_assets() {
        let root = temp_path("asset-delete-reject-root");
        fs::create_dir_all(&root).expect("root dir should be created");
        let markdown_path = root.join("note.md");
        fs::write(&markdown_path, "# Note").expect("markdown should be written");

        let error = delete_markdown_image_asset_impl(DeleteMarkdownImageAssetRequest {
            markdown_file_path: markdown_path.to_string_lossy().to_string(),
            image_src: "../photo.png".to_string(),
        })
        .expect_err("outside assets path should be rejected");

        assert_eq!(error.code(), "INVALID_PARAMS");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn preview_payload_loads_html_with_http_url_and_base_dir() {
        let root = temp_path("html-root");
        fs::create_dir_all(&root).expect("root dir should be created");
        let html_path = root.join("my page.html");
        fs::write(&html_path, "<h1>Hello</h1>").expect("html file should be written");

        let db_path = temp_path("html-db").with_extension("sqlite3");
        let database = Database::new(&db_path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());

        state
            .upsert_library(Library {
                id: 1,
                name: "Html".to_string(),
                root_path: root.to_string_lossy().to_string(),
                source_kind: "folder".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "1".to_string(),
                updated_at: "1".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be created");

        state
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: html_path.to_string_lossy().to_string(),
                    relative_path: "my page.html".to_string(),
                    file_name: "my page.html".to_string(),
                    file_ext: "html".to_string(),
                    file_type: "html".to_string(),
                    file_size: 14,
                    modified_at: "1".to_string(),
                    created_at: "1".to_string(),
                    updated_at: "1".to_string(),
                }],
            )
            .expect("item should be inserted");

        let item = state.get_item_detail(1).expect("detail should load");
        let payload = load_document_payload(
            &item,
            |path| format!("http://127.0.0.1:4000/fs{}", path.to_string_lossy().replace(' ', "%20")),
            MarkdownResourceContext::default(),
        )
        .expect("payload should load");

        match payload {
            PreviewPayload::Html(html) => {
                assert!(html.preview_url.starts_with("http://127.0.0.1:4000/"));
                assert!(html.preview_url.contains("my%20page.html"));
                assert_eq!(html.base_dir, root.to_string_lossy().to_string());
            }
            PreviewPayload::Markdown(_) => panic!("expected html payload"),
        }

        let _ = fs::remove_file(db_path);
        let _ = fs::remove_dir_all(root);
    }

    // ---- PR C / C2：封面资源复制 / 校验 / staged lease ----

    fn card_revision_asset(name: &str) -> std::path::PathBuf {
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/card-revisions/assets")
            .join(name)
    }

    fn cover_lease_state() -> (std::path::PathBuf, std::path::PathBuf, AppState) {
        let root = temp_path("cover-lease-root");
        fs::create_dir_all(&root).expect("root");
        let markdown_path = root.join("note.md");
        fs::write(&markdown_path, "# Note").expect("markdown");
        // DB 放在本测试唯一 root 内，避免并行测试在同一毫秒生成相同 temp 名称。
        let db_path = root.join("cover-lease.sqlite3");
        let database = Database::new(&db_path).expect("db");
        let state = AppState::new(database, std::env::temp_dir());
        state
            .upsert_library(Library {
                id: 1,
                name: "Cover".to_string(),
                root_path: root.to_string_lossy().to_string(),
                source_kind: "folder".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "1".to_string(),
                updated_at: "1".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be created");
        state
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: markdown_path.to_string_lossy().to_string(),
                    relative_path: "note.md".to_string(),
                    file_name: "note.md".to_string(),
                    file_ext: "md".to_string(),
                    file_type: "markdown".to_string(),
                    file_size: 6,
                    modified_at: "1".to_string(),
                    created_at: "1".to_string(),
                    updated_at: "1".to_string(),
                }],
            )
            .expect("item should be inserted");
        (root, markdown_path, state)
    }

    #[test]
    fn copy_cover_asset_validates_before_copy_and_registers_lease() {
        let (root, markdown_path, state) = cover_lease_state();
        let response = copy_markdown_cover_asset_impl(
            &state,
            CopyMarkdownCoverAssetRequest {
                markdown_file_path: markdown_path.to_string_lossy().to_string(),
                source_image_path: card_revision_asset("cover-landscape.png")
                    .to_string_lossy()
                    .to_string(),
                item_id: 1,
                tab_id: "tab-1".to_string(),
                operation_generation: 3,
            },
        )
        .expect("legal landscape PNG must copy");
        assert!(response.relative_path.starts_with("./assets/"), "{:?}", response.relative_path);
        assert_eq!(response.natural_width, 640);
        assert_eq!(response.natural_height, 480);
        assert!(!response.staged_asset_id.is_empty());
        // staged 文件真实存在，且 lease 已登记（item + tab + generation 匹配）。
        let copied = root.join("assets").join(&response.file_name);
        assert!(copied.is_file(), "staged asset must exist on disk");
        assert!(
            state
                .cover_asset_lease_matches(1, "tab-1", 3, &response.staged_asset_id)
                .expect("lease query"),
            "lease must bind item/tab/generation"
        );
        assert!(
            !state
                .cover_asset_lease_matches(1, "tab-2", 3, &response.staged_asset_id)
                .expect("lease query"),
            "different tab must not match the lease"
        );
        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_file(temp_path("cover-lease-db").with_extension("sqlite3"));
    }

    #[test]
    fn copy_cover_asset_does_not_lease_or_delete_an_existing_document_asset() {
        let (root, markdown_path, state) = cover_lease_state();
        let assets = root.join("assets");
        fs::create_dir_all(&assets).expect("assets");
        let existing = assets.join("cover-landscape.png");
        fs::copy(card_revision_asset("cover-landscape.png"), &existing).expect("existing asset");

        let response = copy_markdown_cover_asset_impl(
            &state,
            CopyMarkdownCoverAssetRequest {
                markdown_file_path: markdown_path.to_string_lossy().to_string(),
                source_image_path: existing.to_string_lossy().to_string(),
                item_id: 1,
                tab_id: "tab-1".to_string(),
                operation_generation: 1,
            },
        )
        .expect("existing in-document asset remains a valid cover choice");

        assert_eq!(response.relative_path, "./assets/cover-landscape.png");
        assert!(response.staged_asset_id.is_empty(), "pre-existing assets are not staged");
        let cleaned = state
            .release_cover_asset_leases(1, "tab-1", 1, &[], &[])
            .expect("release");
        assert!(cleaned.is_empty());
        assert!(existing.is_file(), "release must never delete a pre-existing/shared asset");

        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_file(temp_path("cover-lease-db").with_extension("sqlite3"));
    }

    #[test]
    fn copy_cover_asset_rejects_a_markdown_path_not_owned_by_the_item() {
        let (root, _markdown_path, state) = cover_lease_state();
        let other = root.join("other.md");
        fs::write(&other, "# Other").expect("other markdown");
        let error = copy_markdown_cover_asset_impl(
            &state,
            CopyMarkdownCoverAssetRequest {
                markdown_file_path: other.to_string_lossy().to_string(),
                source_image_path: card_revision_asset("cover-landscape.png")
                    .to_string_lossy()
                    .to_string(),
                item_id: 1,
                tab_id: "tab-1".to_string(),
                operation_generation: 1,
            },
        )
        .expect_err("IPC path must match the indexed item path");
        assert!(matches!(error, AppError::InvalidParams));
        assert!(!other.parent().unwrap().join("assets").exists());

        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_file(temp_path("cover-lease-db").with_extension("sqlite3"));
    }

    #[test]
    fn copy_cover_asset_rejects_every_negative_sample_without_side_effects() {
        let cases = [
            ("cover-square.png", "aspect"),
            ("cover-portrait.jpg", "aspect"),
            ("cover-ultrawide.png", "aspect"),
            ("cover-fake-mime.png", "mime-mismatch"),
            ("cover-oversized-dimensions.png", "pixel-limit"),
            ("cover-unsafe.svg", "svg-unsafe-element"),
        ];
        for (name, expected_kind) in cases {
            let (root, markdown_path, state) = cover_lease_state();
            let error = copy_markdown_cover_asset_impl(
                &state,
                CopyMarkdownCoverAssetRequest {
                    markdown_file_path: markdown_path.to_string_lossy().to_string(),
                    source_image_path: card_revision_asset(name).to_string_lossy().to_string(),
                    item_id: 1,
                    tab_id: "tab-1".to_string(),
                    operation_generation: 1,
                },
            )
            .expect_err("negative sample must be rejected before copy");
            assert!(
                matches!(&error, AppError::CoverAssetRejected(message) if message.contains(expected_kind)),
                "{name}: unexpected error {error:?}"
            );
            // 失败不留下半成品：assets 目录不存在或为空、无 lease 登记。
            let assets = root.join("assets");
            assert!(
                !assets.exists() || fs::read_dir(&assets).map(|mut d| d.next().is_none()).unwrap_or(false),
                "{name}: failed copy must not leave staged files"
            );
            let _ = fs::remove_dir_all(root);
            let _ = fs::remove_file(temp_path("cover-lease-db").with_extension("sqlite3"));
        }
    }

    #[test]
    fn release_lease_keeps_draft_referenced_and_cleans_unreferenced_staged() {
        let (root, markdown_path, state) = cover_lease_state();
        let response = copy_markdown_cover_asset_impl(
            &state,
            CopyMarkdownCoverAssetRequest {
                markdown_file_path: markdown_path.to_string_lossy().to_string(),
                source_image_path: card_revision_asset("cover-landscape.png")
                    .to_string_lossy()
                    .to_string(),
                item_id: 1,
                tab_id: "tab-1".to_string(),
                operation_generation: 2,
            },
        )
        .expect("copy");
        let copied = root.join("assets").join(&response.file_name);

        // draft 引用 staged src → release 保留文件（可能是刚保存的封面）。
        let cleaned = state
            .release_cover_asset_leases(1, "tab-1", 2, &[response.relative_path.clone()], &[])
            .expect("release");
        assert!(cleaned.is_empty(), "draft-referenced staged file must be kept: {cleaned:?}");
        assert!(copied.is_file(), "file must survive when the draft references it");
        assert!(
            !state
                .cover_asset_lease_matches(1, "tab-1", 2, &response.staged_asset_id)
                .expect("lease query"),
            "lease registration must be released even when the file is kept"
        );

        // 无引用 staged → 物理清理。
        let response2 = copy_markdown_cover_asset_impl(
            &state,
            CopyMarkdownCoverAssetRequest {
                markdown_file_path: markdown_path.to_string_lossy().to_string(),
                source_image_path: card_revision_asset("cover-landscape.png")
                    .to_string_lossy()
                    .to_string(),
                item_id: 1,
                tab_id: "tab-1".to_string(),
                operation_generation: 2,
            },
        )
        .expect("copy again");
        let copied2 = root.join("assets").join(&response2.file_name);
        assert!(copied2.is_file());
        let cleaned = state
            .release_cover_asset_leases(1, "tab-1", 2, &[], &[])
            .expect("release");
        assert_eq!(cleaned, vec![response2.relative_path.clone()]);
        assert!(!copied2.exists(), "unreferenced staged asset must be cleaned");
        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_file(temp_path("cover-lease-db").with_extension("sqlite3"));
    }

    #[test]
    fn release_latest_generation_closes_older_leases_and_normalizes_references() {
        let (root, markdown_path, state) = cover_lease_state();
        let first = copy_markdown_cover_asset_impl(
            &state,
            CopyMarkdownCoverAssetRequest {
                markdown_file_path: markdown_path.to_string_lossy().to_string(),
                source_image_path: card_revision_asset("cover-landscape.png")
                    .to_string_lossy()
                    .to_string(),
                item_id: 1,
                tab_id: "tab-1".to_string(),
                operation_generation: 1,
            },
        )
        .expect("first copy");
        let second = copy_markdown_cover_asset_impl(
            &state,
            CopyMarkdownCoverAssetRequest {
                markdown_file_path: markdown_path.to_string_lossy().to_string(),
                source_image_path: card_revision_asset("cover-landscape.png")
                    .to_string_lossy()
                    .to_string(),
                item_id: 1,
                tab_id: "tab-1".to_string(),
                operation_generation: 2,
            },
        )
        .expect("second copy");
        let first_path = root.join("assets").join(&first.file_name);
        let second_path = root.join("assets").join(&second.file_name);

        // 保存/关闭最新 generation 必须一并收口旧 generation；引用写法去掉 `./`
        // 后仍指向同一文件，因此第一张保留，第二张未引用则清理。
        let first_without_dot = first.relative_path.trim_start_matches("./").to_string();
        let cleaned = state
            .release_cover_asset_leases(1, "tab-1", 2, &[first_without_dot], &[])
            .expect("release through latest generation");
        assert_eq!(cleaned, vec![second.relative_path.clone()]);
        assert!(first_path.is_file(), "normalized draft reference protects the first asset");
        assert!(!second_path.exists(), "unreferenced latest asset is cleaned");
        assert!(!state
            .cover_asset_lease_matches(1, "tab-1", 1, &first.staged_asset_id)
            .expect("first lease query"));
        assert!(!state
            .cover_asset_lease_matches(1, "tab-1", 2, &second.staged_asset_id)
            .expect("second lease query"));

        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_file(temp_path("cover-lease-db").with_extension("sqlite3"));
    }

    #[test]
    fn release_lease_respects_disk_baseline_reference() {
        let (root, markdown_path, state) = cover_lease_state();
        let response = copy_markdown_cover_asset_impl(
            &state,
            CopyMarkdownCoverAssetRequest {
                markdown_file_path: markdown_path.to_string_lossy().to_string(),
                source_image_path: card_revision_asset("cover-landscape.png")
                    .to_string_lossy()
                    .to_string(),
                item_id: 1,
                tab_id: "tab-1".to_string(),
                operation_generation: 4,
            },
        )
        .expect("copy");
        let copied = root.join("assets").join(&response.file_name);
        // 磁盘 baseline 已把 staged src 写入 Markdown（模拟保存后）→ 命令层读取
        // 磁盘 baseline 做引用保护，staged 文件不能清理。
        fs::write(
            &markdown_path,
            format!("# Note\n\n<!-- nutbook-cover -->\n\n![]({})\n", response.relative_path),
        )
        .expect("baseline write");
        let cleaned = release_markdown_cover_lease_impl(
            &state,
            ReleaseMarkdownCoverLeaseRequest {
                item_id: 1,
                tab_id: "tab-1".to_string(),
                operation_generation: 4,
                draft_image_srcs: vec![],
            },
        )
        .expect("release");
        assert!(cleaned.cleaned.is_empty(), "baseline-referenced staged file must be kept: {:?}", cleaned.cleaned);
        assert!(copied.is_file(), "committed cover must never be deleted");
        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_file(temp_path("cover-lease-db").with_extension("sqlite3"));
    }

    #[test]
    fn validate_cover_asset_checks_existing_document_image_without_copy() {
        let (root, markdown_path, state) = cover_lease_state();
        let markdown_dir = root.join("assets");
        fs::create_dir_all(&markdown_dir).expect("assets");
        // 合法横图 + 无效竖图。
        fs::copy(
            card_revision_asset("cover-landscape.png"),
            markdown_dir.join("ok.png"),
        )
        .expect("copy");
        fs::copy(
            card_revision_asset("cover-portrait.jpg"),
            markdown_dir.join("bad.jpg"),
        )
        .expect("copy");
        let ok = validate_markdown_cover_asset_impl(
            &state,
            ValidateMarkdownCoverAssetRequest {
                item_id: 1,
                markdown_file_path: markdown_path.to_string_lossy().to_string(),
                src: "./assets/ok.png".to_string(),
            },
        )
        .expect("validate");
        assert!(ok.valid, "legal in-document landscape must validate");
        assert_eq!(ok.natural_width, Some(640));
        let bad = validate_markdown_cover_asset_impl(
            &state,
            ValidateMarkdownCoverAssetRequest {
                item_id: 1,
                markdown_file_path: markdown_path.to_string_lossy().to_string(),
                src: "./assets/bad.jpg".to_string(),
            },
        )
        .expect("validate");
        assert!(!bad.valid, "portrait must be rejected");
        assert!(
            bad.reason.as_deref().unwrap_or("").contains("aspect"),
            "{:?}",
            bad.reason
        );
        // 越界 src → 拒绝。
        let escaped = validate_markdown_cover_asset_impl(
            &state,
            ValidateMarkdownCoverAssetRequest {
                item_id: 1,
                markdown_file_path: markdown_path.to_string_lossy().to_string(),
                src: "../../etc/passwd".to_string(),
            },
        )
        .expect("validate");
        assert!(!escaped.valid, "escaped src must be rejected");
        let other_markdown = root.join("other.md");
        fs::write(&other_markdown, "# Other").expect("other markdown");
        let mismatch = validate_markdown_cover_asset_impl(
            &state,
            ValidateMarkdownCoverAssetRequest {
                item_id: 1,
                markdown_file_path: other_markdown.to_string_lossy().to_string(),
                src: "./assets/ok.png".to_string(),
            },
        )
        .expect_err("validation path must match the indexed item path");
        assert!(matches!(mismatch, AppError::InvalidParams));
        // 校验不产生任何复制。
        assert!(!markdown_dir.join("ok-2.png").exists(), "validation must not copy");
        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_file(temp_path("cover-lease-db").with_extension("sqlite3"));
    }
}
