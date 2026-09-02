use crate::{
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
    sync::{Mutex, OnceLock},
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{
    webview::{NewWindowResponse, WebviewBuilder},
    Manager,
};

#[cfg(target_os = "macos")]
use objc2_app_kit::{NSResponder, NSView, NSWindow, NSWindowOrderingMode};
#[cfg(target_os = "macos")]
use objc2_web_kit::WKWebView;

const HTML_FULLSCREEN_TITLE_PREFIX: &str = "__NUTBOOK_TOGGLE_FULLSCREEN__:";
const HTML_CONTROLS_ACTION_PREFIX: &str = "__NUTBOOK_HTML_CONTROLS__:";
const HTML_FIND_ACTION_PREFIX: &str = "__NUTBOOK_HTML_FIND__:";
const HTML_FIND_RESULT_PREFIX: &str = "__NUTBOOK_HTML_FIND_RESULT__:";
const HTML_FIND_SHORTCUT_PREFIX: &str = "__NUTBOOK_HTML_FIND_SHORTCUT__:";
const HTML_EDIT_RUNTIME_ACTION_PREFIX: &str = "__NUTBOOK_HTML_EDIT_RUNTIME__:";
const HTML_EDIT_TOOLBAR_ACTION_PREFIX: &str = "__NUTBOOK_HTML_EDIT_TOOLBAR__:";
const HTML_EDIT_TOOLBAR_DIAGNOSTIC_PREFIX: &str = "__NUTBOOK_HTML_EDIT_TOOLBAR_DIAGNOSTIC__:";
const HTML_EDIT_LEAVE_ACTION_PREFIX: &str = "__NUTBOOK_HTML_EDIT_LEAVE__:";
const HTML_EDIT_LEAVE_READY_PREFIX: &str = "__NUTBOOK_HTML_EDIT_LEAVE_READY__:";
const SETTINGS_OVERLAY_ACTION_PREFIX: &str = "__NUTBOOK_SETTINGS_OVERLAY__:";
const INSPECTOR_MORE_OVERLAY_ACTION_PREFIX: &str = "__NUTBOOK_INSPECTOR_MORE_OVERLAY__:";
const HTML_EDIT_DEBUG_LOG_PATH: &str = "/tmp/nutbook-html-edit-debug.log";
static PRESENTATION_PREVIEW_INSTANCES: OnceLock<Mutex<HashMap<i64, String>>> = OnceLock::new();
static TOPBAR_TOOLTIP_OWNER: OnceLock<Mutex<Option<i64>>> = OnceLock::new();
static RUNTIME_CONTROLS_OWNER: OnceLock<Mutex<Option<i64>>> = OnceLock::new();

fn runtime_controls_owner() -> &'static Mutex<Option<i64>> {
    RUNTIME_CONTROLS_OWNER.get_or_init(|| Mutex::new(None))
}

fn presentation_preview_instances() -> &'static Mutex<HashMap<i64, String>> {
    PRESENTATION_PREVIEW_INSTANCES.get_or_init(|| Mutex::new(HashMap::new()))
}

fn topbar_tooltip_owner() -> &'static Mutex<Option<i64>> {
    TOPBAR_TOOLTIP_OWNER.get_or_init(|| Mutex::new(None))
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
    item_id: i64,
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
    pub item_id: i64,
    pub label: String,
    pub title: String,
    pub runtime_url: String,
}

impl HtmlRuntimeSession {
    pub fn from_item(item: &ItemDetail, runtime_url: String) -> Result<Self, AppError> {
        if item.summary.file_type != "html" {
            return Err(AppError::UnsupportedFileType);
        }

        Ok(Self {
            item_id: item.summary.id,
            label: html_runtime_window_label(item.summary.id),
            title: item.summary.file_name.clone(),
            runtime_url,
        })
    }

    pub fn to_payload(&self, detached: bool) -> HtmlRuntimeSessionPayload {
        HtmlRuntimeSessionPayload {
            item_id: self.item_id,
            label: self.label.clone(),
            title: self.title.clone(),
            runtime_url: self.runtime_url.clone(),
            detached,
        }
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

pub fn close_html_runtime_window(
    app: &tauri::AppHandle,
    item_id: i64,
) -> Result<bool, AppError> {
    let mut closed = false;

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

    // The find surface is kept alive (hidden) while its tab is open so Cmd+F
    // always shows an already-painted child; release it with the tab.
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
    if runtime_controls_owner().lock().ok().and_then(|owner| *owner) == Some(item_id) {
        let controls_label = html_runtime_controls_label(item_id);
        if let Some(webview) = app.get_webview(&controls_label) {
            let _ = webview.eval("window.__NUTBOOK_RESET_TRANSIENT_STATE__?.();");
            webview.hide().map_err(|_| AppError::InternalError)?;
            closed = true;
        }
        if let Ok(mut owner) = runtime_controls_owner().lock() {
            *owner = None;
        }
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
) -> Result<bool, AppError> {
    let host_label = html_runtime_host_label(session.item_id);
    if let Some(webview) = app.get_webview(&host_label) {
        webview
            .set_bounds(runtime_host_rect(bounds))
            .map_err(|_| AppError::InternalError)?;
        let _ = webview.show();
        return Ok(true);
    }

    let builder = build_runtime_webview_builder(app, &host_label, session)?;
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

pub fn set_html_runtime_host_visibility(
    app: &tauri::AppHandle,
    item_id: i64,
    visible: bool,
) -> Result<bool, AppError> {
    let label = html_runtime_host_label(item_id);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };

    if visible {
        webview.show().map_err(|_| AppError::InternalError)?;
    } else {
        webview.hide().map_err(|_| AppError::InternalError)?;
    }

    Ok(true)
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
    let label = html_presentation_preview_label(session.item_id);
    presentation_preview_instances()
        .lock()
        .map_err(|_| AppError::InternalError)?
        .insert(session.item_id, preview_instance_id.to_string());
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
        session.item_id,
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
    if let Ok(mut owner) = runtime_controls_owner().lock() {
        *owner = Some(item_id);
    }
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
        // The shared controls surface is created once (at the first HTML tab).
        // Hosts opened later are appended on top of it, and `show()` alone does
        // not restore sibling order — expanded menus/tips would paint behind
        // the active host. Raise the overlay above all hosts on every show.
        #[cfg(target_os = "macos")]
        raise_webview_view_native(webview.clone());
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
    let owner_now = runtime_controls_owner().lock().ok().and_then(|owner| *owner);
    if owner_now != Some(item_id) {
        return Ok(false);
    }
    let label = html_runtime_controls_label(item_id);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };

    if visible {
        webview.show().map_err(|_| AppError::InternalError)?;
        // Same sibling-order invariant as the reuse path in
        // `attach_controls_overlay`: hosts created after this surface sit
        // above it until it is explicitly raised.
        #[cfg(target_os = "macos")]
        raise_webview_view_native(webview.clone());
    } else {
        let _ = webview.eval("window.__NUTBOOK_RESET_TRANSIENT_STATE__?.();");
        // Keep the window-scoped controls child alive while no HTML owns it.
        // Recreating this transparent WebView on tab switch or after closing
        // the last HTML would expose WebKit's incomplete first backing layer.
        // `close_html_runtime_window` therefore only clears owner + hides it.
        webview.hide().map_err(|_| AppError::InternalError)?;
    }

    Ok(true)
}

/// Document find has its own small child surface.  The established controls
/// island remains dedicated to tags and document actions.
pub fn attach_html_find_overlay(
    app: &tauri::AppHandle,
    window: &tauri::Window,
    item_id: i64,
    bounds: RuntimeHostBounds,
    can_replace: bool,
    replace_expanded: bool,
    query: String,
    count: String,
    case_sensitive: bool,
    labels: std::collections::BTreeMap<String, String>,
    history: Vec<String>,
) -> Result<bool, AppError> {
    let label = html_find_overlay_label(item_id);
    let update = html_find_overlay_init_script(
        item_id,
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
        // Invariant: find must stay above the controls overlay. Controls now
        // raises itself on every show (see `attach_controls_overlay`), so a
        // find surface shown without raising can end up beneath it — two
        // stacked transparent children in the wrong order is exactly the
        // black-backing regime.
        #[cfg(target_os = "macos")]
        raise_webview_view_native(webview.clone());
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
    item_id: i64,
    can_replace: bool,
    replace_expanded: bool,
    query: String,
    count: String,
    case_sensitive: bool,
    labels: std::collections::BTreeMap<String, String>,
    history: Vec<String>,
) -> Result<bool, AppError> {
    let label = html_find_overlay_label(item_id);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };
    webview
        .eval(&html_find_overlay_init_script(
            item_id,
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
    item_id: i64,
    bounds: RuntimeHostBounds,
) -> Result<bool, AppError> {
    let label = html_find_overlay_label(item_id);
    let Some(webview) = app.get_webview(&label) else {
        return Ok(false);
    };
    webview
        .set_bounds(runtime_host_rect(bounds))
        .map_err(|_| AppError::InternalError)?;
    Ok(true)
}

pub fn set_html_find_overlay_visibility(app: &tauri::AppHandle, item_id: i64, visible: bool) -> Result<bool, AppError> {
    let label = html_find_overlay_label(item_id);
    let Some(webview) = app.get_webview(&label) else { return Ok(false); };
    if visible {
        webview.show().map_err(|_| AppError::InternalError)?;
        // Keep find above the controls overlay; see the reuse path in
        // `attach_html_find_overlay`.
        #[cfg(target_os = "macos")]
        raise_webview_view_native(webview.clone());
    } else {
        // Hide only: recreating this transparent child on the next Cmd+F
        // can expose WebKit's incomplete first backing layer on cold starts.
        // After its first explicit attach, keep the surface per open HTML item
        // and release it in `close_html_runtime_window` when the tab closes.
        webview.hide().map_err(|_| AppError::InternalError)?;
    }
    Ok(true)
}

pub fn attach_html_find_trigger_tooltip(app: &tauri::AppHandle, window: &tauri::Window, item_id: i64, tooltip_id: &str, bounds: RuntimeHostBounds, label: String, visible: bool) -> Result<bool, AppError> {
    // A moving WebKit child can leave an old backing layer behind.  Keep one
    // fixed surface per topbar trigger and only toggle visibility on hover.
    let overlay_label = html_topbar_tooltip_label(tooltip_id);
    if let Some(legacy_global) = app.get_webview("html-topbar-tooltip") {
        let _ = legacy_global.hide();
        let _ = legacy_global.close();
    }
    // Development hot reloads can leave the prior per-item tooltip surface
    // alive in the native window. Retire that legacy sibling before showing
    // the window-scoped renderer, otherwise both labels can paint at once.
    let legacy_label = format!("html-find-trigger-tooltip-{item_id}");
    if let Some(legacy) = app.get_webview(&legacy_label) {
        let _ = legacy.hide();
        let _ = legacy.close();
    }
    let label_json = serde_json::to_string(&label).unwrap_or_else(|_| "\"\"".to_string());
    let update = format!("window.__NUTBOOK_HTML_FIND_TRIGGER_TOOLTIP__?.update?.({label_json});");
    if let Some(webview) = app.get_webview(&overlay_label) {
        webview.set_bounds(runtime_host_rect(bounds)).map_err(|_| AppError::InternalError)?;
        let _ = webview.eval(&update);
        if visible {
            if let Ok(mut owner) = topbar_tooltip_owner().lock() { *owner = Some(item_id); }
            webview.show().map_err(|_| AppError::InternalError)?;
            #[cfg(target_os = "macos")]
            raise_webview_view_native(webview.clone());
        } else { let _ = webview.hide(); }
        return Ok(true);
    }
    let builder = WebviewBuilder::new(&overlay_label, tauri::WebviewUrl::App(PathBuf::from("html-find-trigger-tooltip.html")))
        .initialization_script(&format!("window.__NUTBOOK_HTML_FIND_TRIGGER_TOOLTIP_INITIAL__={label_json};"))
        .background_color(tauri::webview::Color(0, 0, 0, 0)).transparent(true).focused(false);
    let webview = window.add_child(builder, tauri::LogicalPosition::new(bounds.x, bounds.y), tauri::LogicalSize::new(bounds.width, bounds.height)).map_err(|_| AppError::InternalError)?;
    webview.set_bounds(runtime_host_rect(bounds)).map_err(|_| AppError::InternalError)?;
    if visible {
        if let Ok(mut owner) = topbar_tooltip_owner().lock() { *owner = Some(item_id); }
        #[cfg(target_os = "macos")]
        raise_webview_view_native(webview.clone());
    } else { let _ = webview.hide(); }
    Ok(true)
}

pub fn set_html_find_trigger_tooltip_visibility(app: &tauri::AppHandle, item_id: i64, tooltip_id: &str, visible: bool) -> Result<bool, AppError> {
    if visible {
        let label = html_topbar_tooltip_label(tooltip_id);
        let Some(webview) = app.get_webview(&label) else { return Ok(false); };
        if let Ok(mut owner) = topbar_tooltip_owner().lock() { *owner = Some(item_id); }
        webview.show().map_err(|_| AppError::InternalError)?;
    } else {
        let owns_tooltip = topbar_tooltip_owner().lock().ok().is_some_and(|owner| *owner == Some(item_id));
        if !owns_tooltip { return Ok(false); }
        if let Ok(mut owner) = topbar_tooltip_owner().lock() { *owner = None; }
        for surface_id in ["search", "folder", "file"] {
            if let Some(surface) = app.get_webview(&html_topbar_tooltip_label(surface_id)) {
                let _ = surface.hide();
            }
        }
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
        recover_webview_focus_native(webview.clone());
    }
    Ok(true)
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
            let _ = responder.becomeFirstResponder();
            let _ = window.makeFirstResponder(Some(responder));
        });
    });
}

/// Child WebViews are sibling NSViews. Showing an existing child does not
/// change sibling order, so explicitly move it above menus/controls
/// without making it first responder or stealing the user's pointer focus.
#[cfg(target_os = "macos")]
fn raise_webview_view_native<R: tauri::Runtime>(webview: tauri::Webview<R>) {
    let webview_for_main = webview.clone();
    let _ = webview.run_on_main_thread(move || {
        let _ = webview_for_main.with_webview(|platform_webview| unsafe {
            let view: &NSView = &*platform_webview.inner().cast();
            if let Some(superview) = view.superview() {
                superview.addSubview_positioned_relativeTo(view, NSWindowOrderingMode::Above, None);
            }
        });
    });
}

pub fn html_runtime_window_label(item_id: i64) -> String {
    format!("html-player-{item_id}")
}

pub fn html_runtime_host_label(item_id: i64) -> String {
    format!("html-host-{item_id}")
}

pub fn html_presentation_preview_label(item_id: i64) -> String {
    format!("html-presentation-preview-{item_id}")
}

pub fn html_runtime_controls_label(_item_id: i64) -> String {
    "html-controls-active".to_string()
}

fn html_find_overlay_label(item_id: i64) -> String {
    format!("html-find-{item_id}")
}

fn html_topbar_tooltip_label(tooltip_id: &str) -> String {
    let stable_id = match tooltip_id {
        "search" | "folder" | "file" => tooltip_id,
        _ => "search",
    };
    format!("html-topbar-tooltip-{stable_id}")
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

    Ok(())
}

fn build_runtime_webview_builder<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    label: &str,
    session: &HtmlRuntimeSession,
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
            .on_new_window(detached_new_window_handler(app))
            .on_document_title_changed(detached_embedded_fullscreen_handler(app)),
    )
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
                let owner_now = runtime_controls_owner()
                    .lock()
                    .ok()
                    .and_then(|owner| *owner);
                let is_current_owner = owner_now == Some(payload.item_id);
                if is_current_owner {
                    if let Some(main_webview) = app_handle.get_webview("main") {
                        let payload_json = serde_json::to_string(&payload)
                            .unwrap_or_else(|_| "null".to_string());
                        let _ = main_webview.eval(&format!(
                            "window.__NUTBOOK_HANDLE_HTML_RUNTIME_CONTROLS_ACTION__?.({});",
                            payload_json
                        ));
                    }
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

fn detached_embedded_fullscreen_handler<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> impl Fn(tauri::Webview<R>, String) + Send + 'static {
    let app_handle = app.clone();
    move |webview, title| {
        if title.starts_with(HTML_FIND_SHORTCUT_PREFIX) {
            if let Some(item_id) = webview.label().strip_prefix("html-host-").and_then(|value| value.parse::<i64>().ok()) {
                if let Some(main_webview) = app_handle.get_webview("main") {
                    let _ = main_webview.eval(&format!("window.__NUTBOOK_OPEN_HTML_FIND__?.({item_id});"));
                }
            }
            let _ = webview.eval("document.title = document.location.pathname.split('/').pop() || 'Nutbook Runtime';");
            return;
        }
        if let Some(rest) = title.strip_prefix(HTML_FIND_RESULT_PREFIX) {
            if let Some(main_webview) = app_handle.get_webview("main") {
                let _ = main_webview.eval(&format!(
                    "window.__NUTBOOK_HANDLE_HTML_FIND_RESULT__?.({rest});"
                ));
            }
            let _ = webview.eval("document.title = document.location.pathname.split('/').pop() || 'Nutbook Runtime';");
            return;
        }
        if let Some(rest) = title.strip_prefix(HTML_EDIT_RUNTIME_ACTION_PREFIX) {
            if let Ok(payload) = serde_json::from_str::<Value>(rest) {
                let runtime_type = payload.get("type").and_then(Value::as_str);
                let should_log = runtime_type
                    .map(|value| value.starts_with("html_edit_"))
                    .unwrap_or(false);
                if should_log {
                    let host_item_id = webview
                        .label()
                        .strip_prefix("html-host-")
                        .unwrap_or("-");
                    log_html_edit_debug(
                        "runtime-title",
                        format!(
                            "host_item={} {}",
                            host_item_id,
                            html_edit_debug_payload_fields(&payload)
                        ),
                    );
                }
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
            return;
        }

        if title.starts_with(HTML_FULLSCREEN_TITLE_PREFIX) {
            let window = webview.window();
            let next_fullscreen = !window.is_fullscreen().unwrap_or(false);
            let webview_label = webview.label().to_string();
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
            if !next_fullscreen {
                let app_handle_clone = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    for delay in [80_u64, 180, 360, 720, 1100] {
                        std::thread::sleep(Duration::from_millis(delay));
                        if let Some(runtime_webview) = app_handle_clone.get_webview(&webview_label) {
                            let _ = runtime_webview.window().set_focus();
                            let _ = runtime_webview.eval(
                                "try { window.__NUTBOOK_HOST_FULLSCREEN__ = false; window.__NUTBOOK_FOCUS_RUNTIME__?.(); } catch (_) {}"
                            );
                            let _ = runtime_webview.set_focus();
                        }
                    }
                });
            } else {
                let _ = webview.eval(&runtime_focus_script);
            }
            let _ = webview.eval(
                "document.title = document.title.replace(/^__NUTBOOK_TOGGLE_FULLSCREEN__:\\d+$/, document.location.pathname.split('/').pop() || 'Nutbook Runtime');"
            );
            return;
        }

    }
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
    item_id: i64,
    can_replace: bool,
    replace_expanded: bool,
    query: &str,
    count: &str,
    case_sensitive: bool,
    labels: &std::collections::BTreeMap<String, String>,
    history: &[String],
    focus_query: bool,
) -> String {
    let query = serde_json::to_string(query).unwrap_or_else(|_| "\"\"".to_string());
    let count = serde_json::to_string(count).unwrap_or_else(|_| "\"0/0\"".to_string());
    let labels = serde_json::to_string(labels).unwrap_or_else(|_| "{}".to_string());
    let history = serde_json::to_string(history).unwrap_or_else(|_| "[]".to_string());
    format!(
        "window.__NUTBOOK_HTML_FIND_INITIAL__={{itemId:{item_id},canReplace:{can_replace},replaceExpanded:{replace_expanded},query:{query},count:{count},caseSensitive:{case_sensitive},labels:{labels},history:{history},focusQuery:{focus_query}}};window.__NUTBOOK_HTML_FIND__?.update?.(window.__NUTBOOK_HTML_FIND_INITIAL__);"
    )
}

#[cfg(test)]
mod tests {
    use crate::models::{HtmlEditToolbarFormatState, ItemDetail, ItemSummary};

    use super::{
        html_edit_toolbar_label, html_edit_toolbar_update_script, html_runtime_compatibility_script,
        html_runtime_shortcut_script, html_runtime_window_label, presentation_preview_init_script,
        presentation_preview_update_script, HTML_EDIT_RUNTIME_ACTION_PREFIX, HtmlRuntimeSession,
    };

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

        assert_eq!(session.item_id, 42);
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

        let payload = session.to_payload(true);

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
}
