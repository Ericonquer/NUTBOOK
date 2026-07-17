use std::path::Component;

use serde_json::Value;
use tauri::Manager;

use crate::{
    core::{
        document::{
            content_hash, load_document_payload, markdown_document_title, markdown_summary,
            render_markdown_as_html,
        },
        html_runtime::{
            attach_controls_overlay, attach_html_edit_leave_confirm_overlay, attach_html_edit_toolbar_overlay,
            attach_html_runtime_controls_overlay, attach_html_runtime_host, attach_settings_overlay,
            close_html_edit_leave_confirm_overlay, close_html_edit_toolbar_overlay, close_html_runtime_window,
            dispatch_html_runtime_shortcut, eval_html_runtime_script, focus_html_runtime_host,
            log_html_edit_debug,
            focus_main_webview, open_html_runtime_window,
            set_html_edit_toolbar_overlay_visibility,
            set_html_runtime_controls_overlay_visibility, set_html_runtime_host_visibility,
            HtmlRuntimeSession,
        },
    },
    db::repositories::ItemRepository,
    errors::AppError,
    models::{
        AttachHtmlEditLeaveConfirmOverlayRequest, AttachHtmlEditToolbarOverlayRequest, AttachHtmlRuntimeControlsOverlayRequest,
        AttachHtmlRuntimeHostRequest, AttachSettingsOverlayRequest, CloseHtmlWindowRequest,
        CopyMarkdownImageAssetRequest, CopyMarkdownImageAssetResponse,
        DeleteMarkdownImageAssetRequest, DispatchHtmlRuntimeShortcutRequest,
        EvalHtmlRuntimeScriptRequest, ExportMarkdownRequest, FocusHtmlRuntimeHostRequest,
        GetItemPreviewRequest, HtmlRuntimeSessionPayload, OpenHtmlWindowRequest, PreviewPayload,
        SaveMarkdownContentRequest, SaveMarkdownContentResponse,
        SetHtmlEditToolbarOverlayVisibilityRequest, SetHtmlRuntimeControlsOverlayVisibilityRequest,
        SetHtmlRuntimeHostVisibilityRequest,
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
        payload.custom_tag,
        payload.available_tags,
        payload.skill_tag,
        payload.type_tag,
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

    attach_html_edit_leave_confirm_overlay(&app, &window, payload.item_id, payload.bounds)
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
    log_html_edit_debug("runtime-ipc-forward", format!("type={message_type} session={runtime_session_id}"));
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
        payload.custom_tag,
        payload.available_tags,
        payload.skill_tag,
        payload.type_tag,
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

fn save_markdown_content_impl(
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
    let rendered_html = render_markdown_as_html(&written_raw);
    let summary = markdown_summary(&written_raw);
    let modified_at = std::fs::metadata(&item.summary.file_path)
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs().to_string())
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
        &markdown_document_title(&content, &item.summary.file_name),
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

#[cfg(test)]
mod tests {
    use std::{fs, time::{SystemTime, UNIX_EPOCH}};

    use crate::{
        core::document::{content_hash, load_document_payload},
        db::{repositories::{ItemRepository, LibraryRepository}, Database},
        models::{CopyMarkdownImageAssetRequest, DeleteMarkdownImageAssetRequest, IndexedItemRecord, Library, PreviewPayload, SaveMarkdownContentRequest},
        state::AppState,
    };

    use super::{copy_markdown_image_asset_impl, delete_markdown_image_asset_impl, markdown_export_default_file_name, save_markdown_content_impl};

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
}
