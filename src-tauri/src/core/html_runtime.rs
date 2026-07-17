use crate::{
    errors::AppError,
    models::{HtmlRuntimeSessionPayload, ItemDetail, RuntimeHostBounds, Tag},
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;
use std::time::Duration;
use tauri::{
    webview::{NewWindowResponse, WebviewBuilder},
    Manager,
};

#[cfg(target_os = "macos")]
use objc2_app_kit::{NSResponder, NSWindow};
#[cfg(target_os = "macos")]
use objc2_web_kit::WKWebView;

const HTML_FULLSCREEN_TITLE_PREFIX: &str = "__NUTBOOK_TOGGLE_FULLSCREEN__:";
const HTML_CONTROLS_ACTION_PREFIX: &str = "__NUTBOOK_HTML_CONTROLS__:";
const HTML_EDIT_RUNTIME_ACTION_PREFIX: &str = "__NUTBOOK_HTML_EDIT_RUNTIME__:";
const HTML_EDIT_TOOLBAR_ACTION_PREFIX: &str = "__NUTBOOK_HTML_EDIT_TOOLBAR__:";
const SETTINGS_OVERLAY_ACTION_PREFIX: &str = "__NUTBOOK_SETTINGS_OVERLAY__:";

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

    let controls_label = html_runtime_controls_label(item_id);
    if let Some(webview) = app.get_webview(&controls_label) {
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

    if close_html_edit_toolbar_overlay(app, item_id)? {
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
        let _ = webview.eval(&format!(
            "window.location.replace({:?});",
            session.runtime_url
        ));
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

pub fn attach_html_runtime_controls_overlay(
    app: &tauri::AppHandle,
    window: &tauri::Window,
    session: &HtmlRuntimeSession,
    bounds: RuntimeHostBounds,
    is_favorite: bool,
    is_fullscreen: bool,
    custom_tag: Option<Tag>,
    available_tags: Vec<Tag>,
    skill_tag: Option<String>,
    type_tag: Option<String>,
) -> Result<bool, AppError> {
    attach_controls_overlay(
        app,
        window,
        session.item_id,
        bounds,
        is_favorite,
        is_fullscreen,
        custom_tag,
        available_tags,
        skill_tag,
        type_tag,
    )
}

pub fn attach_controls_overlay(
    app: &tauri::AppHandle,
    window: &tauri::Window,
    item_id: i64,
    bounds: RuntimeHostBounds,
    is_favorite: bool,
    is_fullscreen: bool,
    custom_tag: Option<Tag>,
    available_tags: Vec<Tag>,
    skill_tag: Option<String>,
    type_tag: Option<String>,
) -> Result<bool, AppError> {
    let overlay_label = html_runtime_controls_label(item_id);
    if let Some(webview) = app.get_webview(&overlay_label) {
        webview
            .set_bounds(runtime_host_rect(bounds.clone()))
            .map_err(|_| AppError::InternalError)?;
        let _ = webview.eval(&html_runtime_controls_overlay_update_script(
            item_id,
            is_favorite,
            is_fullscreen,
            custom_tag.clone(),
            available_tags.clone(),
            skill_tag.clone(),
            type_tag.clone(),
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
        custom_tag,
        available_tags,
        skill_tag,
        type_tag,
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

pub fn attach_html_edit_toolbar_overlay(
    app: &tauri::AppHandle,
    window: &tauri::Window,
    item_id: i64,
    bounds: RuntimeHostBounds,
    dirty: bool,
) -> Result<bool, AppError> {
    let overlay_label = html_edit_toolbar_label(item_id);
    if let Some(webview) = app.get_webview(&overlay_label) {
        webview
            .set_bounds(runtime_host_rect(bounds.clone()))
            .map_err(|_| AppError::InternalError)?;
        let _ = webview.eval(&html_edit_toolbar_update_script(dirty));
        let _ = webview.show();
        return Ok(true);
    }

    let builder = build_html_edit_toolbar_builder(app, &overlay_label, item_id, dirty)?;
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
    if mode != Some("panel") {
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

    let key_literal = format!("{key:?}");
    let script = format!(
        r#"
(() => {{
  const key = {key_literal};
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
  try {{ target?.dispatchEvent?.(keydown); }} catch (_) {{}}
  try {{ document.dispatchEvent(keydown); }} catch (_) {{}}
  try {{ window.dispatchEvent(keydown); }} catch (_) {{}}
  try {{ target?.dispatchEvent?.(keyup); }} catch (_) {{}}
  try {{ document.dispatchEvent(keyup); }} catch (_) {{}}
  try {{ window.dispatchEvent(keyup); }} catch (_) {{}}
}})();
"#
    );

    webview.eval(&script).map_err(|_| AppError::InternalError)?;
    Ok(true)
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
        recover_main_webview_focus_native(webview.clone());
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
                recover_main_webview_focus_native(main_webview.clone());
            }
        }
    });
}

#[cfg(target_os = "macos")]
fn recover_main_webview_focus_native<R: tauri::Runtime>(
    webview: tauri::Webview<R>,
) {
    let webview_for_main = webview.clone();
    let _ = webview.run_on_main_thread(move || {
        let _ = webview_for_main.with_webview(|platform_webview| unsafe {
            let window: &NSWindow = &*platform_webview.ns_window().cast();
            let view: &WKWebView = &*platform_webview.inner().cast();
            let responder: &NSResponder = view;
            window.makeKeyAndOrderFront(None);
            let _ = responder.becomeFirstResponder();
            let _ = window.makeFirstResponder(Some(responder));
        });
    });
}

pub fn html_runtime_window_label(item_id: i64) -> String {
    format!("html-player-{item_id}")
}

pub fn html_runtime_host_label(item_id: i64) -> String {
    format!("html-host-{item_id}")
}

pub fn html_runtime_controls_label(item_id: i64) -> String {
    format!("html-controls-{item_id}")
}

pub fn html_edit_toolbar_label(item_id: i64) -> String {
    format!("html-edit-toolbar-{item_id}")
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
            .on_document_title_changed(detached_embedded_fullscreen_handler()),
    )
}

fn build_runtime_controls_overlay_builder<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    label: &str,
    item_id: i64,
    is_favorite: bool,
    is_fullscreen: bool,
    custom_tag: Option<Tag>,
    available_tags: Vec<Tag>,
    skill_tag: Option<String>,
    type_tag: Option<String>,
) -> Result<WebviewBuilder<R>, AppError> {
    let overlay_url = tauri::WebviewUrl::App(PathBuf::from("runtime-overlay.html"));
    let init_script = html_runtime_controls_overlay_init_script(
        item_id,
        is_favorite,
        is_fullscreen,
        custom_tag,
        available_tags,
        skill_tag,
        type_tag,
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

fn build_html_edit_toolbar_builder<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    label: &str,
    item_id: i64,
    dirty: bool,
) -> Result<WebviewBuilder<R>, AppError> {
    let overlay_url = tauri::WebviewUrl::App(PathBuf::from("html-edit-toolbar.html"));
    Ok(
        WebviewBuilder::new(label, overlay_url)
            .initialization_script(&html_edit_toolbar_init_script(item_id, dirty))
            .background_color(tauri::webview::Color(0, 0, 0, 0))
            .transparent(true)
            .focused(false)
            .on_document_title_changed(html_edit_toolbar_action_handler(app)),
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
        if let Some(rest) = title.strip_prefix(HTML_EDIT_TOOLBAR_ACTION_PREFIX) {
            if let Ok(payload) = serde_json::from_str::<Value>(rest) {
                if let Some(main_webview) = app_handle.get_webview("main") {
                    let payload_json = serde_json::to_string(&payload).unwrap_or_else(|_| "null".to_string());
                    let _ = main_webview.eval(&format!(
                        "window.__NUTBOOK_HANDLE_HTML_EDIT_TOOLBAR_ACTION__?.({});",
                        payload_json
                    ));
                }
            }
            let _ = webview.eval("document.title = 'Nutbook HTML Edit Toolbar';");
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
                    let payload_json = serde_json::to_string(&payload).unwrap_or_else(|_| "null".to_string());
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

fn detached_embedded_fullscreen_handler<R: tauri::Runtime>()
-> impl Fn(tauri::Webview<R>, String) + Send + 'static {
    move |webview, title| {
        if let Some(rest) = title.strip_prefix(HTML_EDIT_RUNTIME_ACTION_PREFIX) {
            if let Ok(payload) = serde_json::from_str::<Value>(rest) {
                if let Some(main_webview) = webview.get_webview("main") {
                    let payload_json = serde_json::to_string(&payload).unwrap_or_else(|_| "null".to_string());
                    let _ = main_webview.eval(&format!(
                        "window.__NUTBOOK_HANDLE_HTML_EDIT_RUNTIME_MESSAGE__?.({});",
                        payload_json
                    ));
                }
            }
            let _ = webview.eval(
                "document.title = document.location.pathname.split('/').pop() || 'Nutbook Runtime';"
            );
            return;
        }

        if title.starts_with(HTML_FULLSCREEN_TITLE_PREFIX) {
            let window = webview.window();
            let next_fullscreen = !window.is_fullscreen().unwrap_or(false);
            let app_handle = window.app_handle().clone();
            let webview_label = webview.label().to_string();
            let runtime_focus_script = format!(
                "try {{ window.__NUTBOOK_HOST_FULLSCREEN__ = {}; window.__NUTBOOK_FOCUS_RUNTIME__?.(); }} catch (_) {{}}",
                if next_fullscreen { "true" } else { "false" }
            );
            if let Some(main_webview) = webview.get_webview("main") {
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
                if let Some(main_webview) = webview.get_webview("main") {
                    let _ = main_webview.eval(&format!(
                        "window.__NUTBOOK_SET_RUNTIME_FULLSCREEN__?.({item_id}, {});",
                        if next_fullscreen { "true" } else { "false" }
                    ));
                }
            }
            if !next_fullscreen {
                tauri::async_runtime::spawn(async move {
                    for delay in [80_u64, 180, 360, 720, 1100] {
                        std::thread::sleep(Duration::from_millis(delay));
                        if let Some(runtime_webview) = app_handle.get_webview(&webview_label) {
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
      ensureRuntimeFocusTarget()?.focus?.({ preventScroll: true });
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
    return Boolean(node.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
  };

  const handleRuntimeShortcut = (event) => {
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
    if (event.key === 'f' || event.key === 'F') {
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
    custom_tag: Option<Tag>,
    available_tags: Vec<Tag>,
    skill_tag: Option<String>,
    type_tag: Option<String>,
) -> String {
    let custom_tag_json = serde_json::to_string(&custom_tag).unwrap_or_else(|_| "null".to_string());
    let available_tags_json = serde_json::to_string(&available_tags).unwrap_or_else(|_| "[]".to_string());
    let skill_tag_json = serde_json::to_string(&skill_tag).unwrap_or_else(|_| "null".to_string());
    let type_tag_json = serde_json::to_string(&type_tag).unwrap_or_else(|_| "null".to_string());
    format!(
        "window.__NUTBOOK_RUNTIME_CONTROLS__ = {{ itemId: {item_id}, isFavorite: {}, isFullscreen: {}, customTag: {custom_tag_json}, availableTags: {available_tags_json}, skillTag: {skill_tag_json}, typeTag: {type_tag_json} }};",
        if is_favorite { "true" } else { "false" },
        if is_fullscreen { "true" } else { "false" }
    )
}

fn html_edit_toolbar_init_script(item_id: i64, dirty: bool) -> String {
    format!(
        "window.__NUTBOOK_HTML_EDIT_TOOLBAR__ = {{ itemId: {item_id}, dirty: {} }};",
        if dirty { "true" } else { "false" }
    )
}

pub fn html_edit_toolbar_update_script(dirty: bool) -> String {
    format!(
        "window.__NUTBOOK_HTML_EDIT_TOOLBAR_UPDATE__?.({{ dirty: {} }});",
        if dirty { "true" } else { "false" }
    )
}

fn settings_overlay_init_script(tab: Option<String>, mode: Option<String>) -> String {
    let tab_json = serde_json::to_string(&tab.unwrap_or_else(|| "skills".to_string()))
        .unwrap_or_else(|_| "\"skills\"".to_string());
    let mode_json = serde_json::to_string(&mode.unwrap_or_else(|| "menu".to_string()))
        .unwrap_or_else(|_| "\"menu\"".to_string());
    format!(
        "window.__NUTBOOK_SETTINGS_OVERLAY__ = true; window.__NUTBOOK_SETTINGS_OVERLAY_TAB__ = {tab_json}; window.__NUTBOOK_SETTINGS_OVERLAY_MODE__ = {mode_json};"
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
    custom_tag: Option<Tag>,
    available_tags: Vec<Tag>,
    skill_tag: Option<String>,
    type_tag: Option<String>,
) -> String {
    let custom_tag_json = serde_json::to_string(&custom_tag).unwrap_or_else(|_| "null".to_string());
    let available_tags_json = serde_json::to_string(&available_tags).unwrap_or_else(|_| "[]".to_string());
    let skill_tag_json = serde_json::to_string(&skill_tag).unwrap_or_else(|_| "null".to_string());
    let type_tag_json = serde_json::to_string(&type_tag).unwrap_or_else(|_| "null".to_string());
    format!(
        "window.__NUTBOOK_UPDATE_OVERLAY_STATE__?.({{ itemId: {item_id}, isFavorite: {}, isFullscreen: {}, customTag: {custom_tag_json}, availableTags: {available_tags_json}, skillTag: {skill_tag_json}, typeTag: {type_tag_json} }});",
        if is_favorite { "true" } else { "false" },
        if is_fullscreen { "true" } else { "false" }
    )
}

#[cfg(test)]
mod tests {
    use crate::models::{ItemDetail, ItemSummary};

    use super::{
        html_edit_toolbar_label, html_edit_toolbar_update_script, html_runtime_compatibility_script,
        html_runtime_window_label, HTML_EDIT_RUNTIME_ACTION_PREFIX, HtmlRuntimeSession,
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
                tags: vec![],
                thumbnail: None,
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
    fn html_edit_toolbar_update_script_forwards_dirty_state() {
        let script = html_edit_toolbar_update_script(true);

        assert!(script.contains("__NUTBOOK_HTML_EDIT_TOOLBAR_UPDATE__"));
        assert!(script.contains("dirty"));
        assert!(script.contains("true"));
    }

    #[test]
    fn html_runtime_compatibility_script_keeps_only_production_shims() {
        let script = html_runtime_compatibility_script();

        assert!(script.contains("about:blank"));
        assert!(script.contains("__NUTBOOK_TOGGLE_FULLSCREEN__"));
        assert_eq!(HTML_EDIT_RUNTIME_ACTION_PREFIX, "__NUTBOOK_HTML_EDIT_RUNTIME__:");
        assert!(script.contains("stopImmediatePropagation"));
        assert!(!script.contains("root.requestFullscreen"));
        assert!(!script.contains("__nutbook_runtime_diag__"));
        assert!(!script.contains("diagnostics mounted"));
    }
}
