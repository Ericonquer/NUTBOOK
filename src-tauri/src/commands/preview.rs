use std::path::Component;

use serde_json::Value;
use tauri::Manager;

use crate::{
    core::{
        document::{
            content_hash, file_modified_at_string, load_document_payload, markdown_summary,
            render_markdown_as_html_for_file,
        },
        document_title::DocumentTitle,
        html_runtime::{
            attach_controls_overlay, attach_html_edit_leave_confirm_overlay, attach_html_edit_toolbar_overlay,
            attach_html_presentation_preview, attach_html_runtime_controls_overlay, attach_html_runtime_host, attach_settings_overlay,
            close_html_edit_leave_confirm_overlay, close_html_edit_toolbar_overlay,
            close_html_presentation_preview, close_html_runtime_window,
            dispatch_html_runtime_shortcut, eval_html_runtime_script, focus_html_runtime_host,
            log_html_edit_debug,
            focus_main_webview, open_html_runtime_window,
            set_html_edit_toolbar_overlay_visibility,
            set_html_presentation_preview_visibility, set_html_presentation_preview_active,
            set_html_runtime_controls_overlay_visibility, set_html_runtime_host_visibility,
            HtmlRuntimeSession,
        },
    },
    db::repositories::ItemRepository,
    errors::AppError,
    models::{
        AttachHtmlEditLeaveConfirmOverlayRequest, AttachHtmlEditToolbarOverlayRequest, AttachHtmlPresentationPreviewRequest, AttachHtmlRuntimeControlsOverlayRequest,
        AttachHtmlRuntimeHostRequest, AttachSettingsOverlayRequest, CloseHtmlWindowRequest,
        CopyMarkdownCoverAssetRequest, CopyMarkdownCoverAssetResponse,
        CopyMarkdownImageAssetRequest, CopyMarkdownImageAssetResponse,
        DeleteMarkdownImageAssetRequest, DispatchHtmlRuntimeShortcutRequest,
        EvalHtmlRuntimeScriptRequest, ExportMarkdownRequest, FocusHtmlRuntimeHostRequest,
        GetItemPreviewRequest, HtmlRuntimeSessionPayload, OpenHtmlWindowRequest, PreviewPayload,
        ReleaseMarkdownCoverLeaseRequest, ReleaseMarkdownCoverLeaseResponse,
        SaveMarkdownContentRequest, SaveMarkdownContentResponse,
        SetHtmlEditToolbarOverlayVisibilityRequest, SetHtmlRuntimeControlsOverlayVisibilityRequest,
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
    load_document_payload(&item, |path| state.local_server_file_url(path))
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

#[tauri::command]
pub fn get_local_server_origin(
    state: tauri::State<'_, AppState>,
) -> Result<String, AppError> {
    Ok(state.local_server_origin())
}

#[tauri::command]
pub fn open_image_file_dialog() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("选择图片")
        .add_filter("图片", &["png", "jpg", "jpeg", "gif", "webp", "svg"])
        .pick_file()
        .map(|path| path.to_string_lossy().to_string())
}

/// HTML edit imports intentionally exclude SVG. The Markdown image picker
/// continues to accept it, so this must remain a separate command.
#[tauri::command]
pub fn open_html_edit_image_file_dialog() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("选择图片")
        .add_filter("图片", &["png", "jpg", "jpeg", "gif", "webp"])
        .pick_file()
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

    let runtime_url = state.local_server_file_url(std::path::Path::new(&item.summary.file_path));
    let session = HtmlRuntimeSession::from_item(&item, runtime_url)?;
    Ok(session.to_payload(false))
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

    let runtime_url = state.local_server_file_url(std::path::Path::new(&item.summary.file_path));
    let session = HtmlRuntimeSession::from_item(&item, runtime_url)?;
    open_html_runtime_window(&app, &session)?;
    Ok(session.to_payload(true))
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

    let runtime_url = state.local_server_file_url(std::path::Path::new(&item.summary.file_path));
    let session = HtmlRuntimeSession::from_item(&item, runtime_url)?;
    attach_html_runtime_host(&app, &window, &session, payload.bounds)?;
    Ok(session.to_payload(false))
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
    let runtime_url = state.local_server_file_url(std::path::Path::new(&item.summary.file_path));
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

    let runtime_url = state.local_server_file_url(std::path::Path::new(&item.summary.file_path));
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
    )?;
    Ok(session.to_payload(false))
}

#[tauri::command]
pub fn set_html_runtime_controls_overlay_visibility_command(
    app: tauri::AppHandle,
    payload: SetHtmlRuntimeControlsOverlayVisibilityRequest,
) -> Result<bool, AppError> {
    set_html_runtime_controls_overlay_visibility(&app, payload.item_id, payload.visible)
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

#[tauri::command]
pub fn html_edit_runtime_message_command(
    app: tauri::AppHandle,
    payload: Value,
) -> Result<bool, AppError> {
    let message_type = payload.get("type").and_then(Value::as_str).unwrap_or("");
    let runtime_session_id = payload
        .get("runtimeSessionId")
        .and_then(Value::as_str)
        .unwrap_or("");
    if !message_type.starts_with("html_edit_") || runtime_session_id.is_empty() {
        return Err(AppError::InvalidParams);
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
        core::document::{content_hash, load_document_payload},
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
        let payload = load_document_payload(&item, |_| "http://127.0.0.1:4000/fs/note.md".to_string())
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

        let payload = load_document_payload(&detail, |_| "http://127.0.0.1:4000/fs/note.md".to_string())
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
