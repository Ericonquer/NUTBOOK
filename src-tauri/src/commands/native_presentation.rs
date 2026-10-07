//! One native presentation per app. The audience is untrusted document HTML;
//! the presenter is a bundled app page. This module owns their shared lifetime.

use std::{
    collections::{HashMap, HashSet},
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    sync::OnceLock,
    time::{Duration, Instant},
};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use tauri::Manager;

#[cfg(target_os = "macos")]
use block2::RcBlock;
#[cfg(target_os = "macos")]
use std::sync::atomic::{AtomicBool, Ordering};
#[cfg(target_os = "macos")]
use objc2_app_kit::{NSAutoresizingMaskOptions, NSEvent, NSEventMask, NSEventModifierFlags, NSWindow, NSWindowCollectionBehavior, NSWindowDidEnterFullScreenNotification, NSWindowDidExitFullScreenNotification};
#[cfg(target_os = "macos")]
use objc2_foundation::{NSNotification, NSNotificationCenter};
#[cfg(target_os = "macos")]
use objc2_web_kit::WKWebView;

use crate::{
    core::{
        content_session::{origin_of_url, ContentSessionRecord, ContentSurfaceRole, RuntimeKey},
        html_edit::content_hash_bytes,
        html_runtime::{
            attach_html_runtime_host_for_presentation, html_runtime_host_label,
            set_html_runtime_host_visibility, HtmlRuntimeSession,
        },
        thumbnail::{
            capture_presentation_thumbnail_with_worker, find_local_chromium_executable,
            PresentationScreenshotInput, PresentationThumbnailWorkerInput,
        },
    },
    db::repositories::ItemRepository,
    errors::AppError,
    models::{ItemDetail, ListItemsQuery, RuntimeHostBounds},
    state::AppState,
};

const PRESENTER_LABEL: &str = "native-presentation-presenter";
const BLACKOUT_LABEL: &str = "native-presentation-blackout";
const AUDIENCE_BANNER_HEIGHT: f64 = 36.0;

fn audience_top_inset(rehearsal: bool, screen_filling: bool) -> f64 {
    if rehearsal && !screen_filling { AUDIENCE_BANNER_HEIGHT } else { 0.0 }
}
static AUDIENCE_RESIZE_OBSERVER: OnceLock<()> = OnceLock::new();
#[cfg(target_os = "macos")]
static AUDIENCE_FULLSCREEN_OBSERVER: OnceLock<()> = OnceLock::new();
#[cfg(target_os = "macos")]
static AUDIENCE_KEY_MONITOR: OnceLock<()> = OnceLock::new();
#[cfg(target_os = "macos")]
static AUDIENCE_MOUSE_MONITOR: OnceLock<()> = OnceLock::new();
#[cfg(target_os = "macos")]
static AUDIENCE_EXIT_HOVER: AtomicBool = AtomicBool::new(false);

const LEGACY_RUNTIME_HASH: &str =
    "cc3d67a8aef4af8529d0047810620b13212d950bbefffd4f5814f972a2cf6529";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresentationPage {
    pub id: String,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteRun {
    pub text: String,
    #[serde(default)]
    pub bold: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteParagraph {
    #[serde(rename = "type", default = "paragraph_type")]
    pub kind: String,
    pub runs: Vec<NoteRun>,
}

fn paragraph_type() -> String {
    "paragraph".into()
}

type PresentationNotes = HashMap<String, Vec<NoteParagraph>>;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresentationMonitor {
    pub id: String,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
    pub primary: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativePresentationView {
    pub session_id: String,
    pub item_id: i64,
    pub pages: Vec<PresentationPage>,
    pub notes: PresentationNotes,
    pub active_page_id: String,
    pub ready: bool,
    pub pending_page_id: Option<String>,
    pub sequence: u64,
    pub error: Option<String>,
    pub rehearsal: bool,
    pub timer_elapsed_ms: u64,
    pub timer_running: bool,
    pub timer_has_started: bool,
    pub target_minutes: Option<u32>,
    pub black: bool,
    pub suspended: bool,
    pub language: String,
}

#[derive(Debug, Clone)]
pub struct NativePresentationSession {
    pub id: String,
    pub item_id: i64,
    pub source_hash: String,
    pub pages: Vec<PresentationPage>,
    pub notes: PresentationNotes,
    pub active_page_id: String,
    pub ready: bool,
    pub pending_page_id: Option<String>,
    pub sequence: u64,
    pub error: Option<String>,
    pub rehearsal: bool,
    pub timer_elapsed: Duration,
    pub timer_started: Option<Instant>,
    pub timer_has_started: bool,
    pub timer_was_running_before_suspend: bool,
    pub target_minutes: Option<u32>,
    pub black: bool,
    pub suspended: bool,
    pub monitor_id: String,
    pub generation: u64,
    pub language: String,
    pub main_window_position: tauri::PhysicalPosition<i32>,
    pub main_window_size: tauri::PhysicalSize<u32>,
    pub main_window_fullscreen: bool,
    pub audience_fullscreen_requested: bool,
    pub audience_fullscreen_transitioning: bool,
    pub audience_fullscreen_initiated_by_presenter: bool,
    pub audience_editable_focus: bool,
    pub main_window_maximized: bool,
    pub main_window_title: String,
}

impl NativePresentationSession {
    fn view(&self) -> NativePresentationView {
        NativePresentationView {
            session_id: self.id.clone(),
            item_id: self.item_id,
            pages: self.pages.clone(),
            notes: self.notes.clone(),
            active_page_id: self.active_page_id.clone(),
            ready: self.ready,
            pending_page_id: self.pending_page_id.clone(),
            sequence: self.sequence,
            error: self.error.clone(),
            rehearsal: self.rehearsal,
            timer_elapsed_ms: (self.timer_elapsed
                + self
                    .timer_started
                    .map(|at| at.elapsed())
                    .unwrap_or_default())
            .as_millis()
            .min(u64::MAX as u128) as u64,
            timer_running: self.timer_started.is_some(),
            timer_has_started: self.timer_has_started,
            target_minutes: self.target_minutes,
            black: self.black,
            suspended: self.suspended,
            language: self.language.clone(),
        }
    }
}

impl NativePresentationSession {
    fn start_timer(&mut self) -> bool {
        if !self.ready || self.suspended || self.timer_started.is_some() { return false; }
        self.timer_started = Some(Instant::now());
        self.timer_has_started = true;
        true
    }

    fn pause_timer(&mut self) -> bool {
        let Some(started) = self.timer_started.take() else { return false; };
        self.timer_elapsed += started.elapsed();
        true
    }

    fn reset_timer(&mut self) {
        self.timer_elapsed = Duration::ZERO;
        self.timer_started = None;
        self.timer_has_started = false;
    }
}

fn monitor_id(monitor: &tauri::Monitor) -> String {
    format!(
        "{}:{}:{}:{}:{}",
        monitor.position().x,
        monitor.position().y,
        monitor.size().width,
        monitor.size().height,
        monitor.name().map(String::as_str).unwrap_or("")
    )
}

fn monitors(app: &tauri::AppHandle) -> Result<Vec<tauri::Monitor>, AppError> {
    app.available_monitors()
        .map_err(|_| AppError::InternalError)
}

#[tauri::command]
pub fn native_presentation_monitors(
    app: tauri::AppHandle,
) -> Result<Vec<PresentationMonitor>, AppError> {
    let primary = app.primary_monitor().map_err(|_| AppError::InternalError)?;
    Ok(monitors(&app)?
        .iter()
        .enumerate()
        .map(|(index, monitor)| PresentationMonitor {
            id: monitor_id(monitor),
            name: monitor
                .name()
                .cloned()
                .unwrap_or_else(|| format!("显示器 {}", index + 1)),
            width: monitor.size().width,
            height: monitor.size().height,
            scale_factor: monitor.scale_factor(),
            primary: primary
                .as_ref()
                .is_some_and(|p| monitor_id(p) == monitor_id(monitor)),
        })
        .collect())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyUpgradeInfo {
    pub eligible: bool,
    pub page_count: usize,
}

fn legacy_runtime_path(source: &Path) -> Result<PathBuf, AppError> {
    source
        .parent()
        .ok_or(AppError::InvalidParams)
        .map(|parent| parent.join("assets/runtime.js"))
}

fn known_legacy_source(html: &str, runtime: &[u8]) -> Option<usize> {
    if content_hash_bytes(runtime) != LEGACY_RUNTIME_HASH
        || html.matches("src=\"assets/runtime.js\"").count() != 1
        || !html.contains("<div class=\"deck\">")
        || html.contains("data-nutbook-page-id")
    {
        return None;
    }
    let count = html.matches("<section class=\"slide").count();
    if count < 2 || count > 500 {
        return None;
    }
    Some(count)
}

#[tauri::command]
pub fn native_presentation_legacy_info(
    state: tauri::State<'_, AppState>,
    item_id: i64,
) -> Result<LegacyUpgradeInfo, AppError> {
    let item = state.get_item_detail(item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }
    let source = Path::new(&item.summary.file_path)
        .canonicalize()
        .map_err(|_| AppError::IoError)?;
    let html = fs::read_to_string(&source).map_err(|_| AppError::IoError)?;
    let runtime = fs::read(legacy_runtime_path(&source)?).unwrap_or_default();
    let count = known_legacy_source(&html, &runtime);
    Ok(LegacyUpgradeInfo {
        eligible: count.is_some(),
        page_count: count.unwrap_or(0),
    })
}

fn replace_once(source: String, from: &str, to: &str) -> Result<String, AppError> {
    if source.matches(from).count() != 1 {
        return Err(AppError::InvalidParams);
    }
    Ok(source.replacen(from, to, 1))
}

fn adapted_legacy_runtime(raw: &str) -> Result<String, AppError> {
    let output = replace_once(raw.to_string(),
        "    const total = slides.length;",
        "    const total = slides.length;\n    const nativeSubscribers = new Set();\n    let nativeManaged = false;\n    let nativeEditing = false;")?;
    let output = replace_once(output,
        "      if (!fromRemote && bc) {\n        bc.postMessage({ type: 'go', idx: n });\n      }\n    }",
        "      if (!fromRemote && bc) {\n        bc.postMessage({ type: 'go', idx: n });\n      }\n      nativeSubscribers.forEach(listener => listener('slide-' + (idx + 1)));\n    }")?;
    let output = replace_once(
        output,
        "      notes.innerHTML = note ? note.innerHTML : '';",
        "      notes.innerHTML = nativeNoteHtmlForSlide(n) || (note ? note.innerHTML : '');",
    )?;
    let output = replace_once(
        output,
        "      if (e.metaKey||e.ctrlKey||e.altKey) return;",
        "      if (nativeManaged || nativeEditing || e.metaKey||e.ctrlKey||e.altKey) return;",
    )?;
    replace_once(
        output,
        "    window.addEventListener('hashchange', fromHash);",
        r#"    function nativeNoteHtmlForSlide(n) {
      try {
        const raw = document.getElementById('nutbook-presentation-notes')?.textContent || '{}';
        const paragraphs = JSON.parse(raw).pages?.['slide-' + (n + 1)];
        if (!Array.isArray(paragraphs)) return null;
        const escape = text => String(text).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
        return paragraphs.map(p => '<p>' + (p.runs || []).map(r => r.bold ? '<strong>' + escape(r.text) + '</strong>' : escape(r.text)).join('') + '</p>').join('');
      } catch (_) { return null; }
    }
    window.__NUTBOOK_PRESENTATION__ = {
      version: 1,
      capabilities: { managedPresenter: true },
      pages: slides.map((slide, i) => ({ id: 'slide-' + (i + 1), index: i + 1, title: slide.getAttribute('data-title') || 'Slide ' + (i + 1) })),
      get activePageId() { return 'slide-' + (idx + 1); },
      async whenReady() { return true; },
      async goTo(id) {
        const index = slides.findIndex(slide => slide.getAttribute('data-nutbook-page-id') === id);
        if (index < 0) return false;
        go(index); return true;
      },
      subscribe(listener) { nativeSubscribers.add(listener); return () => nativeSubscribers.delete(listener); },
      async setManagedMode(enabled) {
        nativeManaged = Boolean(enabled);
        document.documentElement.dataset.nutbookManagedPresentation = String(nativeManaged);
        toggleNotes(false); toggleOverview(false);
        if (nativeManaged && presenterWin && !presenterWin.closed) presenterWin.close();
        return true;
      },
      async setEditMode(enabled) { nativeEditing = Boolean(enabled); return true; }
    };
    window.addEventListener('hashchange', fromHash);"#,
    )
}

fn adapted_legacy_html(raw: &str, count: usize) -> Result<String, AppError> {
    let mut html = raw.to_string();
    let starts: Vec<usize> = html
        .match_indices("<section class=\"slide")
        .map(|(at, _)| at)
        .collect();
    if starts.len() != count {
        return Err(AppError::InvalidParams);
    }
    for (index, start) in starts.iter().enumerate().rev() {
        let end = html[*start..]
            .find('>')
            .map(|offset| start + offset)
            .ok_or(AppError::InvalidParams)?;
        html.insert_str(
            end,
            &format!(" data-nutbook-page-id=\"slide-{}\"", index + 1),
        );
    }
    html = replace_once(
        html,
        "src=\"assets/runtime.js\"",
        "src=\"assets/runtime.nutbook.js\"",
    )?;
    html = replace_once(html, "</body>",
        "<script type=\"application/json\" id=\"nutbook-presentation-notes\">{\"version\":1,\"pages\":{}}</script>\n<style>html[data-nutbook-managed-presentation=\"true\"] .notes-overlay,html[data-nutbook-managed-presentation=\"true\"] .overview,html[data-nutbook-managed-presentation=\"true\"] .keyboard-hint{display:none!important}</style>\n</body>")?;
    Ok(html)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyUpgradePayload {
    pub item_id: i64,
    pub expected_source_hash: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyUpgradeResult {
    pub item_id: i64,
    pub file_path: String,
}

#[tauri::command]
pub fn upgrade_native_presentation_legacy(
    state: tauri::State<'_, AppState>,
    payload: LegacyUpgradePayload,
) -> Result<LegacyUpgradeResult, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }
    let source = Path::new(&item.summary.file_path)
        .canonicalize()
        .map_err(|_| AppError::IoError)?;
    let lock = state.html_edit_path_lock(&source)?;
    let _guard = lock.lock().map_err(|_| AppError::InternalError)?;
    let source_bytes = fs::read(&source).map_err(|_| AppError::IoError)?;
    if content_hash_bytes(&source_bytes) != payload.expected_source_hash {
        return Err(AppError::EditConflict);
    }
    let html = String::from_utf8(source_bytes).map_err(|_| AppError::InvalidParams)?;
    let runtime_path = legacy_runtime_path(&source)?;
    let runtime_bytes = fs::read(&runtime_path).map_err(|_| AppError::IoError)?;
    let count = known_legacy_source(&html, &runtime_bytes).ok_or(AppError::InvalidParams)?;
    let adapted_html = adapted_legacy_html(&html, count)?;
    let adapted_runtime = adapted_legacy_runtime(
        std::str::from_utf8(&runtime_bytes).map_err(|_| AppError::InvalidParams)?,
    )?;
    let stem = source
        .file_stem()
        .and_then(|stem| stem.to_str())
        .ok_or(AppError::InvalidParams)?;
    let target = source.with_file_name(format!("{stem}.nutbook-presentation.html"));
    let target_runtime = runtime_path.with_file_name("runtime.nutbook.js");
    if target.exists() || target_runtime.exists() {
        return Err(AppError::EditConflict);
    }
    let mut created_runtime = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&target_runtime)
        .map_err(|_| AppError::IoError)?;
    if created_runtime
        .write_all(adapted_runtime.as_bytes())
        .and_then(|_| created_runtime.sync_all())
        .is_err()
    {
        let _ = fs::remove_file(&target_runtime);
        return Err(AppError::IoError);
    }
    let mut created_html = match OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&target)
    {
        Ok(file) => file,
        Err(_) => {
            let _ = fs::remove_file(&target_runtime);
            return Err(AppError::IoError);
        }
    };
    if created_html
        .write_all(adapted_html.as_bytes())
        .and_then(|_| created_html.sync_all())
        .is_err()
    {
        let _ = fs::remove_file(&target);
        let _ = fs::remove_file(&target_runtime);
        return Err(AppError::IoError);
    }
    crate::commands::library::scan_library_once(&state.database, item.summary.library_id)?;
    let canonical = target.canonicalize().map_err(|_| AppError::IoError)?;
    let mut page = 1;
    let item_id = loop {
        let result = state.list_items(&ListItemsQuery {
            library_id: Some(item.summary.library_id),
            include_deleted: Some(false),
            page: Some(page),
            page_size: Some(500),
            ..ListItemsQuery::default()
        })?;
        if let Some(found) = result.items.into_iter().find(|candidate| {
            Path::new(&candidate.file_path)
                .canonicalize()
                .ok()
                .as_deref()
                == Some(canonical.as_path())
        }) {
            break found.id;
        }
        if !result.has_more {
            return Err(AppError::ItemNotFound);
        }
        page += 1;
    };
    Ok(LegacyUpgradeResult {
        item_id,
        file_path: canonical.to_string_lossy().into_owned(),
    })
}

fn validate_pages(pages: &[PresentationPage], active: &str) -> Result<(), AppError> {
    if pages.is_empty() || pages.len() > 500 {
        return Err(AppError::InvalidParams);
    }
    let mut ids = HashSet::new();
    for page in pages {
        if page.id.is_empty()
            || page.id.len() > 256
            || page.title.len() > 512
            || !ids.insert(page.id.as_str())
        {
            return Err(AppError::InvalidParams);
        }
    }
    if !ids.contains(active) {
        return Err(AppError::InvalidParams);
    }
    Ok(())
}

pub(crate) fn validate_notes(pages: &[PresentationPage], notes: &PresentationNotes) -> Result<(), AppError> {
    let ids: HashSet<&str> = pages.iter().map(|page| page.id.as_str()).collect();
    let mut total_bytes = 0usize;
    if notes.len() > pages.len() {
        return Err(AppError::InvalidParams);
    }
    for (id, paragraphs) in notes {
        if !ids.contains(id.as_str()) || paragraphs.len() > 100 {
            return Err(AppError::InvalidParams);
        }
        for paragraph in paragraphs {
            for run in &paragraph.runs {
                total_bytes = total_bytes.saturating_add(run.text.len());
            }
            if paragraph.kind != "paragraph"
                || paragraph.runs.len() > 100
                || paragraph.runs.iter().any(|run| run.text.len() > 10_000)
                || total_bytes > 512 * 1024
            {
                return Err(AppError::InvalidParams);
            }
        }
    }
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbePayload {
    pub item_id: i64,
    pub request_id: String,
    #[serde(default)]
    pub unsupported: bool,
    pub pages: Vec<PresentationPage>,
    #[serde(default)]
    pub notes: PresentationNotes,
    pub active_page_id: String,
}

#[tauri::command]
pub fn native_presentation_probe_command(
    app: tauri::AppHandle,
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    payload: ProbePayload,
) -> Result<bool, AppError> {
    let record = super::preview::content_session_record(&state, &webview)?
        .ok_or(AppError::InvalidSession)?;
    if origin_of_url(
        &webview
            .url()
            .map_err(|_| AppError::InvalidSession)?
            .to_string(),
    )
    .as_deref()
        != Some(record.origin.as_str())
    {
        return Err(AppError::InvalidSession);
    }
    if record.role != ContentSurfaceRole::RuntimeHost
        || record.key != RuntimeKey::Item(payload.item_id)
        || payload.request_id.is_empty()
        || payload.request_id.len() > 128
    {
        return Err(AppError::InvalidSession);
    }
    if payload.unsupported {
        if !payload.pages.is_empty() || !payload.notes.is_empty() || !payload.active_page_id.is_empty() {
            return Err(AppError::InvalidParams);
        }
    } else {
        validate_pages(&payload.pages, &payload.active_page_id)?;
        validate_notes(&payload.pages, &payload.notes)?;
    }
    let main = app.get_webview("main").ok_or(AppError::InternalError)?;
    let wire = serde_json::to_string(&payload).map_err(|_| AppError::InternalError)?;
    main.eval(&format!(
        "window.__NUTBOOK_NATIVE_PRESENTATION_PROBE__?.({wire})"
    ))
    .map_err(|_| AppError::InternalError)?;
    Ok(true)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartPayload {
    pub item_id: i64,
    pub expected_source_hash: String,
    pub monitor_id: String,
    pub pages: Vec<PresentationPage>,
    #[serde(default)]
    pub notes: PresentationNotes,
    pub start_page_id: String,
    pub rehearsal: bool,
    pub language: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveNotesPayload {
    pub item_id: i64,
    pub expected_source_hash: String,
    pub pages: Vec<PresentationPage>,
    pub notes: PresentationNotes,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveNotesResult {
    pub source_hash: String,
}

fn replace_notes_json_block(html: &str, patch: &PresentationNotes) -> Result<String, AppError> {
    replace_notes_json_block_value(html, &serde_json::to_value(patch).map_err(|_| AppError::InternalError)?)
}

pub(crate) fn replace_notes_json_block_value(html: &str, patch: &serde_json::Value) -> Result<String, AppError> {
    let marker = "id=\"nutbook-presentation-notes\"";
    let occurrences: Vec<_> = html.match_indices(marker).collect();
    if occurrences.len() != 1 {
        return Err(AppError::InvalidParams);
    }
    let marker_at = occurrences[0].0;
    let open_at = html[..marker_at]
        .rfind("<script")
        .ok_or(AppError::InvalidParams)?;
    let open_end = html[marker_at..]
        .find('>')
        .map(|index| marker_at + index + 1)
        .ok_or(AppError::InvalidParams)?;
    if html[open_at..open_end].contains("</")
        || !html[open_at..open_end].contains("application/json")
    {
        return Err(AppError::InvalidParams);
    }
    let close_at = html[open_end..]
        .find("</script>")
        .map(|index| open_end + index)
        .ok_or(AppError::InvalidParams)?;
    let mut data: serde_json::Value =
        serde_json::from_str(&html[open_end..close_at]).map_err(|_| AppError::InvalidParams)?;
    if data.get("version").and_then(serde_json::Value::as_u64) != Some(1) {
        return Err(AppError::InvalidParams);
    }
    let notes = data
        .get_mut("pages")
        .and_then(serde_json::Value::as_object_mut)
        .ok_or(AppError::InvalidParams)?;
    for (id, paragraphs) in patch.as_object().ok_or(AppError::InvalidParams)? {
        notes.insert(
            id.clone(),
            paragraphs.clone(),
        );
    }
    let json = serde_json::to_string(&data)
        .map_err(|_| AppError::InternalError)?
        .replace('<', "\\u003c")
        .replace('>', "\\u003e");
    let mut updated = String::with_capacity(html.len() + json.len());
    updated.push_str(&html[..open_end]);
    updated.push_str(&json);
    updated.push_str(&html[close_at..]);
    Ok(updated)
}

fn saved_notes_json_block(html: &str) -> Result<PresentationNotes, AppError> {
    let marker = "id=\"nutbook-presentation-notes\"";
    if html.matches(marker).count() != 1 { return Err(AppError::InvalidParams); }
    let marker_at = html.find(marker).ok_or(AppError::InvalidParams)?;
    let open_at = html[..marker_at].rfind("<script").ok_or(AppError::InvalidParams)?;
    let open_end = html[marker_at..].find('>').map(|at| marker_at + at + 1).ok_or(AppError::InvalidParams)?;
    if html[open_at..open_end].contains("</") || !html[open_at..open_end].contains("application/json") { return Err(AppError::InvalidParams); }
    let close_at = html[open_end..].find("</script>").map(|at| open_end + at).ok_or(AppError::InvalidParams)?;
    let data: serde_json::Value = serde_json::from_str(&html[open_end..close_at]).map_err(|_| AppError::InvalidParams)?;
    if data.get("version").and_then(serde_json::Value::as_u64) != Some(1) { return Err(AppError::InvalidParams); }
    serde_json::from_value(data.get("pages").cloned().ok_or(AppError::InvalidParams)?).map_err(|_| AppError::InvalidParams)
}

/// Replace only the explicit JSON data block. The HTML outside that block is
/// copied byte for byte and the on-disk hash is checked under the path lock.
#[tauri::command]
pub fn save_native_presentation_notes(
    state: tauri::State<'_, AppState>,
    payload: SaveNotesPayload,
) -> Result<SaveNotesResult, AppError> {
    validate_pages(
        &payload.pages,
        &payload.pages.first().ok_or(AppError::InvalidParams)?.id,
    )?;
    validate_notes(&payload.pages, &payload.notes)?;
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }
    let path = Path::new(&item.summary.file_path)
        .canonicalize()
        .map_err(|_| AppError::IoError)?;
    let lock = state.html_edit_path_lock(&path)?;
    let _guard = lock.lock().map_err(|_| AppError::InternalError)?;
    let source = fs::read(&path).map_err(|_| AppError::IoError)?;
    if content_hash_bytes(&source) != payload.expected_source_hash {
        return Err(AppError::EditConflict);
    }
    let html = String::from_utf8(source).map_err(|_| AppError::InvalidParams)?;
    let updated = replace_notes_json_block(&html, &payload.notes)?;
    let temp = path.with_file_name(format!(
        ".nutbook-presentation-notes-{}.tmp",
        uuid::Uuid::new_v4()
    ));
    let write_result = (|| -> Result<(), AppError> {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)
            .map_err(|_| AppError::IoError)?;
        file.set_permissions(
            fs::metadata(&path)
                .map_err(|_| AppError::IoError)?
                .permissions(),
        )
        .map_err(|_| AppError::IoError)?;
        file.write_all(updated.as_bytes())
            .map_err(|_| AppError::IoError)?;
        file.sync_all().map_err(|_| AppError::IoError)?;
        if content_hash_bytes(&fs::read(&path).map_err(|_| AppError::IoError)?)
            != payload.expected_source_hash
        {
            return Err(AppError::EditConflict);
        }
        fs::rename(&temp, &path).map_err(|_| AppError::IoError)?;
        if let Some(parent) = path.parent() {
            let _ = fs::File::open(parent).and_then(|directory| directory.sync_all());
        }
        Ok(())
    })();
    if write_result.is_err() {
        let _ = fs::remove_file(&temp);
    }
    write_result?;
    Ok(SaveNotesResult {
        source_hash: content_hash_bytes(updated.as_bytes()),
    })
}

fn audience_init_script(
    session_id: &str,
    item_id: i64,
    start_page_id: &str,
    generation: u64,
    language: &str,
) -> String {
    let fullscreen_hint = if language == "en-US" {
        "Press F again to exit fullscreen"
    } else {
        "再次按 F 退出全屏"
    };
    let exit_label = if language == "en-US" { "Exit Fullscreen (F)" } else { "退出全屏（F）" };
    format!(
        r#"(() => {{
      const sessionId = {session_id:?}, itemId = {item_id}, startPageId = {start_page_id:?}, generation = {generation};
      window.__NUTBOOK_NATIVE_PRESENTATION_ACTIVE__ = true;
      let hintFadeTimer, hintHideTimer;
      const exitLabel = {exit_label:?};
      let fullscreenExit;
      window.__NUTBOOK_NATIVE_PRESENTATION_SET_FULLSCREEN__ = (active) => {{
        if (!fullscreenExit) {{
          fullscreenExit = document.createElement('div');
          fullscreenExit.id = 'nutbook-native-presentation-fullscreen-exit';
          fullscreenExit.style.cssText = 'position:fixed;right:36px;bottom:36px;z-index:2147483647;display:none;pointer-events:auto;';
          const shadow = fullscreenExit.attachShadow({{ mode: 'closed' }});
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = exitLabel;
          button.setAttribute('aria-label', exitLabel);
          button.style.cssText = 'border:1px solid rgba(255,255,255,.28);border-radius:9px;padding:9px 13px;background:rgba(17,17,19,.72);color:#fff;font:600 13px/1 -apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer;opacity:.24;transition:opacity 160ms ease;';
          button.addEventListener('pointerenter', () => {{ button.style.opacity = '1'; }});
          button.addEventListener('pointerleave', () => {{ button.style.opacity = '.24'; }});
          button.addEventListener('focus', () => {{ button.style.opacity = '1'; }});
          button.addEventListener('blur', () => {{ button.style.opacity = '.24'; }});
          button.addEventListener('click', () => invoke('fullscreen-toggle'));
          shadow.append(button);
          document.documentElement.append(fullscreenExit);
          fullscreenExit.__nutbookButton = button;
        }}
        fullscreenExit.style.display = active ? 'block' : 'none';
        fullscreenExit.__nutbookButton.style.opacity = '.24';
      }};
      window.__NUTBOOK_NATIVE_PRESENTATION_EXIT_HOVER__ = (active) => {{
        if (fullscreenExit?.style.display === 'block') {{
          fullscreenExit.__nutbookButton.style.opacity = active ? '1' : '.24';
        }}
      }};
      window.__NUTBOOK_NATIVE_PRESENTATION_SHOW_FULLSCREEN_HINT__ = () => {{
        let host = document.getElementById('nutbook-native-presentation-fullscreen-hint');
        if (!host) {{
          host = document.createElement('div');
          host.id = 'nutbook-native-presentation-fullscreen-hint';
          host.style.cssText = 'position:fixed;top:18px;left:50%;transform:translateX(-50%);z-index:2147483647;pointer-events:none;';
          const shadow = host.attachShadow({{ mode: 'closed' }});
          const label = document.createElement('div');
          label.textContent = {fullscreen_hint:?};
          label.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 18px;border-radius:12px;background:rgba(17,17,19,.58);color:white;font:600 18px/1 -apple-system,BlinkMacSystemFont,sans-serif;white-space:nowrap;opacity:1;transition:opacity 520ms ease,transform 520ms ease;';
          shadow.append(label);
          document.documentElement.append(host);
          host.__nutbookHintLabel = label;
        }}
        host.style.display = 'block';
        host.__nutbookHintLabel.style.opacity = '1';
        host.__nutbookHintLabel.style.transform = 'translateY(0)';
        clearTimeout(hintFadeTimer);
        clearTimeout(hintHideTimer);
        hintFadeTimer = setTimeout(() => {{ host.__nutbookHintLabel.style.opacity = '0'; host.__nutbookHintLabel.style.transform = 'translateY(-8px)'; }}, 1000);
        hintHideTimer = setTimeout(() => {{ host.style.display = 'none'; }}, 1500);
      }};
      let pendingSequence = 0;
      const invoke = (type, extra = {{}}) => window.__TAURI_INTERNALS__?.invoke('native_presentation_report', {{
        payload: {{ sessionId, itemId, generation, type, ...extra }}
      }}).catch(() => {{}});
      const editableFocus = () => {{
        const active = document.activeElement;
        return !!(active?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active?.tagName || ''));
      }};
      const reportEditableFocus = () => invoke('editable-focus', {{ direction: editableFocus() ? 'true' : 'false' }});
      document.addEventListener('focusin', reportEditableFocus, true);
      document.addEventListener('focusout', () => queueMicrotask(reportEditableFocus), true);
      document.addEventListener('keydown', event => {{
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
        const target = event.target;
        if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || '')) return;
        if (event.code === 'KeyF' || event.key?.toLowerCase() === 'f') {{ event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) invoke('fullscreen-toggle'); return; }}
        if (event.isComposing) return;
        if (event.key === 'Escape') {{ event.preventDefault(); event.stopImmediatePropagation(); invoke('end'); return; }}
        if (event.key === 'ArrowRight' || event.key === 'PageDown') {{ event.preventDefault(); event.stopImmediatePropagation(); invoke('navigation-request', {{ direction: 'next' }}); }}
        if (event.key === 'ArrowLeft' || event.key === 'PageUp') {{ event.preventDefault(); event.stopImmediatePropagation(); invoke('navigation-request', {{ direction: 'previous' }}); }}
      }}, true);
      async function boot() {{
        let bridge;
        for (let attempt = 0; attempt < 100; attempt++) {{
          bridge = window.__NUTBOOK_PRESENTATION__;
          if (bridge && Number(bridge.version) === 1 && bridge.capabilities?.managedPresenter === true) break;
          await new Promise(resolve => setTimeout(resolve, 100));
        }}
        if (!bridge || Number(bridge.version) !== 1 || bridge.capabilities?.managedPresenter !== true) {{
          invoke('error', {{ error: 'presentation_protocol_unavailable' }}); return;
        }}
        try {{
          await bridge.whenReady?.();
          const managed = await bridge.setManagedMode(true);
          if (managed !== true) throw new Error('managed_mode_rejected');
          const pages = (bridge.pages || []).map(page => ({{ id: String(page.id || ''), title: String(page.title || '') }}));
          let controllerReady = false;
          bridge.subscribe(pageId => {{
            if (controllerReady) invoke('page', {{ pageId: String(pageId), sequence: pendingSequence }});
          }});
          if (bridge.activePageId !== startPageId) await bridge.goTo(startPageId);
          await invoke('ready', {{ pages, pageId: String(bridge.activePageId || '') }});
          controllerReady = true;
          window.__NUTBOOK_NATIVE_PRESENTATION_NAVIGATE__ = async (pageId, sequence) => {{
            pendingSequence = sequence;
            try {{
              await bridge.goTo(pageId);
              if (bridge.activePageId === pageId) invoke('page', {{ pageId, sequence }});
            }} catch (error) {{ invoke('error', {{ error: String(error), sequence }}); }}
            finally {{ pendingSequence = 0; }}
          }};
        }} catch (error) {{ invoke('error', {{ error: String(error) }}); }}
      }}
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {{ once: true }});
      else boot();
    }})();"#
    )
}

fn notify_presenter(app: &tauri::AppHandle, session: &NativePresentationSession) {
    if let Some(window) = app.get_webview_window(PRESENTER_LABEL) {
        if let Ok(wire) = serde_json::to_string(&session.view()) {
            let _ = window.eval(&format!(
                "window.__NUTBOOK_NATIVE_PRESENTATION_STATE__?.({wire})"
            ));
        }
    }
}

fn resize_audience_child(app: &tauri::AppHandle) {
    let Some(main) = app.get_window("main") else { return; };
    let (Ok(size), Ok(scale)) = (main.inner_size(), main.scale_factor()) else { return; };
    let audience = app.try_state::<AppState>().and_then(|state|
        state.native_presentation.lock().ok().and_then(|guard|
            guard.as_ref().map(|session| (html_runtime_host_label(session.item_id), session.rehearsal, session.audience_fullscreen_requested, session.audience_fullscreen_transitioning))));
    let native_fullscreen = main.is_fullscreen().unwrap_or(false);
    let screen_filling = match audience.as_ref() {
        Some((_, true, requested, transitioning)) => *requested || *transitioning || native_fullscreen,
        _ => native_fullscreen,
    };
    let top = audience_top_inset(audience.as_ref().is_some_and(|(_, rehearsal, _, _)| *rehearsal), screen_filling);
    if audience.as_ref().is_some_and(|(_, rehearsal, _, _)| *rehearsal) {
        if let Some(host) = app.get_webview("main") {
            let _ = host.eval(format!("document.querySelector('.app-shell')?.classList.toggle('native-audience-screenfill', {screen_filling});"));
        }
    }
    let bounds = tauri::Rect {
        position: tauri::Position::Logical(tauri::LogicalPosition::new(0.0, top)),
        size: tauri::Size::Logical(tauri::LogicalSize::new(
            size.width as f64 / scale,
            (size.height as f64 / scale - top).max(1.0),
        )),
    };
    for label in [audience.as_ref().map(|(label, _, _, _)| label.as_str()).unwrap_or(""), BLACKOUT_LABEL] {
        if let Some(child) = app.get_webview(label) {
            let _ = child.set_bounds(bounds);
        }
    }
}

fn focus_audience_if_main_focused(app: &tauri::AppHandle) {
    let Some(main) = app.get_window("main") else { return; };
    if !main.is_focused().unwrap_or(false)
        || app.get_window(PRESENTER_LABEL)
            .is_some_and(|presenter| presenter.is_focused().unwrap_or(false))
    {
        return;
    }
    let item_id = app.try_state::<AppState>().and_then(|state|
        state.native_presentation.lock().ok().and_then(|guard|
            guard.as_ref().filter(|session|
                session.rehearsal && session.ready && !session.suspended
            ).map(|session| session.item_id)));
    let Some(item_id) = item_id else { return; };
    let _ = crate::core::html_runtime::focus_html_runtime_host(app, item_id, None);
}

#[cfg(target_os = "macos")]
fn set_audience_child_autoresizing(app: &tauri::AppHandle, enabled: bool) {
    let label = app.try_state::<AppState>().and_then(|state|
        state.native_presentation.lock().ok().and_then(|guard|
            guard.as_ref().map(|session| html_runtime_host_label(session.item_id))));
    for label in [label.as_deref().unwrap_or(""), BLACKOUT_LABEL] {
        let Some(webview) = app.get_webview(label) else { continue; };
        let view_for_main = webview.clone();
        let _ = webview.run_on_main_thread(move || {
            let _ = view_for_main.with_webview(move |platform_webview| unsafe {
                let view: &WKWebView = &*platform_webview.inner().cast();
                let mask = if enabled {
                    NSAutoresizingMaskOptions::ViewWidthSizable | NSAutoresizingMaskOptions::ViewHeightSizable
                } else {
                    NSAutoresizingMaskOptions::ViewMinYMargin
                };
                view.setAutoresizingMask(mask);
            });
        });
    }
}

fn install_audience_resize_observer(app: &tauri::AppHandle) {
    let Some(main) = app.get_window("main") else { return; };
    AUDIENCE_RESIZE_OBSERVER.get_or_init(|| {
        let app_handle = app.clone();
        main.on_window_event(move |event| {
            if matches!(event, tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Focused(_)) {
                resize_audience_child(&app_handle);
                if matches!(event, tauri::WindowEvent::Focused(true)) {
                    focus_audience_if_main_focused(&app_handle);
                }
            }
        });
    });
}

#[cfg(target_os = "macos")]
fn install_audience_fullscreen_observer(app: &tauri::AppHandle) {
    let Some(main_webview) = app.get_webview("main") else { return; };
    let webview_for_main = main_webview.clone();
    let app_handle = app.clone();
    let _ = main_webview.run_on_main_thread(move || {
        let _ = webview_for_main.with_webview(move |platform_webview| {
            AUDIENCE_FULLSCREEN_OBSERVER.get_or_init(|| unsafe {
                let window: &NSWindow = &*platform_webview.ns_window().cast();
                let center = NSNotificationCenter::defaultCenter();
                for (name, entered) in [
                    (NSWindowDidEnterFullScreenNotification, true),
                    (NSWindowDidExitFullScreenNotification, false),
                ] {
                    let app_for_event = app_handle.clone();
                    let handler = RcBlock::new(move |_notification: std::ptr::NonNull<NSNotification>| {
                        let Some(state) = app_for_event.try_state::<AppState>() else { return; };
                        let (item_id, restore_presenter) = {
                            let Ok(mut guard) = state.native_presentation.lock() else { return; };
                            let Some(session) = guard.as_mut().filter(|session| !session.suspended) else { return; };
                            let restore_presenter = session.audience_fullscreen_transitioning
                                && session.audience_fullscreen_initiated_by_presenter;
                            session.audience_fullscreen_requested = entered;
                            session.audience_fullscreen_transitioning = false;
                            let timer_changed = if entered { session.start_timer() } else { session.pause_timer() };
                            if timer_changed { notify_presenter(&app_for_event, session); }
                            (session.item_id, restore_presenter)
                        };
                        if !entered { set_audience_child_autoresizing(&app_for_event, false); }
                        resize_audience_child(&app_for_event);
                        if restore_presenter {
                            if let Some(window) = app_for_event.get_webview_window(PRESENTER_LABEL) {
                                let _ = window.set_focus();
                            }
                            if let Some(webview) = app_for_event.get_webview(PRESENTER_LABEL) {
                                let _ = webview.set_focus();
                            }
                            return;
                        }
                        // The OS window can remain key while WebKit leaves the
                        // IME or former child view as its first responder.
                        if app_for_event.get_window("main").is_some_and(|main| main.is_focused().unwrap_or(false)) {
                            let _ = crate::core::html_runtime::focus_html_runtime_host(&app_for_event, item_id, Some(entered));
                        }
                    });
                    let observer = center.addObserverForName_object_queue_usingBlock(
                        Some(name), Some(window), None, &handler,
                    );
                    std::mem::forget(observer);
                }
            });
        });
    });
}

#[cfg(target_os = "macos")]
fn install_audience_key_monitor(app: &tauri::AppHandle) {
    let Some(main_webview) = app.get_webview("main") else { return; };
    let app_handle = app.clone();
    let _ = main_webview.run_on_main_thread(move || {
      AUDIENCE_KEY_MONITOR.get_or_init(|| {
        let app_for_key = app_handle.clone();
        let handler = RcBlock::new(move |event: std::ptr::NonNull<NSEvent>| -> *mut NSEvent {
            let native_event = unsafe { event.as_ref() };
            if native_event.keyCode() != 3
                || native_event.modifierFlags().intersects(
                    NSEventModifierFlags::Command | NSEventModifierFlags::Control | NSEventModifierFlags::Option,
                )
            {
                return event.as_ptr();
            }
            let Some(main) = app_for_key.get_window("main") else { return event.as_ptr(); };
            if !main.is_focused().unwrap_or(false) { return event.as_ptr(); }
            let Some(state) = app_for_key.try_state::<AppState>() else { return event.as_ptr(); };
            let session_id = {
                let Ok(guard) = state.native_presentation.lock() else { return event.as_ptr(); };
                let Some(session) = guard.as_ref().filter(|session|
                    session.rehearsal && session.ready && !session.suspended && !session.audience_editable_focus
                ) else { return event.as_ptr(); };
                session.id.clone()
            };
            if !native_event.isARepeat() {
                let app_for_toggle = app_for_key.clone();
                tauri::async_runtime::spawn(async move {
                    let state = app_for_toggle.state::<AppState>();
                    let _ = toggle_audience_fullscreen(&app_for_toggle, &state, &session_id, "native-key");
                });
            }
            std::ptr::null_mut()
        });
        if let Some(observer) = unsafe {
            NSEvent::addLocalMonitorForEventsMatchingMask_handler(NSEventMask::KeyDown, &handler)
        } {
            std::mem::forget(observer);
        }
      });
    });
}

#[cfg(target_os = "macos")]
fn install_audience_mouse_monitor(app: &tauri::AppHandle) {
    let Some(main_webview) = app.get_webview("main") else { return; };
    let webview_for_main = main_webview.clone();
    let app_handle = app.clone();
    let _ = main_webview.run_on_main_thread(move || {
        let _ = webview_for_main.with_webview(move |platform_webview| {
            let window: &NSWindow = unsafe { &*platform_webview.ns_window().cast() };
            let window_number = window.windowNumber();
            AUDIENCE_MOUSE_MONITOR.get_or_init(|| {
                let app_for_mouse = app_handle.clone();
                let handler = RcBlock::new(move |event: std::ptr::NonNull<NSEvent>| -> *mut NSEvent {
                    let native_event = unsafe { event.as_ref() };
                    if native_event.windowNumber() != window_number { return event.as_ptr(); }
                    let Some(state) = app_for_mouse.try_state::<AppState>() else { return event.as_ptr(); };
                    let label = state.native_presentation.lock().ok().and_then(|guard|
                        guard.as_ref().filter(|session|
                            session.rehearsal && session.audience_fullscreen_requested && !session.suspended
                        ).map(|session| html_runtime_host_label(session.item_id)));
                    let Some(label) = label else { return event.as_ptr(); };
                    let Some(main) = app_for_mouse.get_window("main") else { return event.as_ptr(); };
                    let (Ok(size), Ok(scale)) = (main.inner_size(), main.scale_factor()) else { return event.as_ptr(); };
                    let location = native_event.locationInWindow();
                    let width = size.width as f64 / scale;
                    let near_exit = location.x > width - 190.0 && location.y > 8.0 && location.y < 110.0;
                    if AUDIENCE_EXIT_HOVER.swap(near_exit, Ordering::Relaxed) != near_exit {
                        if let Some(audience) = app_for_mouse.get_webview(&label) {
                            let _ = audience.eval(&format!(
                                "window.__NUTBOOK_NATIVE_PRESENTATION_EXIT_HOVER__?.({near_exit})"
                            ));
                        }
                    }
                    event.as_ptr()
                });
                if let Some(observer) = unsafe {
                    NSEvent::addLocalMonitorForEventsMatchingMask_handler(NSEventMask::MouseMoved, &handler)
                } {
                    std::mem::forget(observer);
                }
            });
        });
    });
}

fn create_audience_surface(
    app: &tauri::AppHandle,
    state: &AppState,
    item: &ItemDetail,
    monitor: &tauri::Monitor,
    session: &NativePresentationSession,
) -> Result<(), AppError> {
    let key = format!("html-runtime:{}:host", session.item_id);
    let url = state.scoped_file_url_for_item(&key, item, Path::new(&item.summary.file_path))?;
    let origin = origin_of_url(&url).ok_or(AppError::InvalidSession)?;
    let runtime = HtmlRuntimeSession::from_item(item, url)?;
    let audience_label = html_runtime_host_label(session.item_id);
    // Preparation normally closes this surface. A late old attach must never
    // be reused without the presentation controller initialization script.
    let _ = set_html_runtime_host_visibility(app, session.item_id, false)?;
    state.content_sessions.register(&audience_label, ContentSessionRecord {
        role: ContentSurfaceRole::RuntimeHost,
        key: RuntimeKey::Item(session.item_id),
        origin,
        runtime_session_id: session.id.clone(),
        generation: session.generation,
        view_state_surface_token: 0,
    })?;
    let main = app.get_window("main").ok_or(AppError::InvalidSession)?;
    install_audience_resize_observer(app);
    #[cfg(target_os = "macos")]
    install_audience_fullscreen_observer(app);
    #[cfg(target_os = "macos")]
    install_audience_key_monitor(app);
    #[cfg(target_os = "macos")]
    install_audience_mouse_monitor(app);
    if session.rehearsal {
        main.set_fullscreen(false).map_err(|_| AppError::InternalError)?;
        main.maximize().map_err(|_| AppError::InternalError)?;
    } else {
        main.set_fullscreen(false).map_err(|_| AppError::InternalError)?;
        main.set_position(tauri::Position::Physical(*monitor.position()))
            .map_err(|_| AppError::InternalError)?;
        main.set_fullscreen(true).map_err(|_| AppError::InternalError)?;
    }
    let size = main.inner_size().map_err(|_| AppError::InternalError)?;
    let scale = main.scale_factor().map_err(|_| AppError::InternalError)?;
    let presentation_script = audience_init_script(
        &session.id,
        session.item_id,
        &session.active_page_id,
        session.generation,
        &session.language,
    );
    let audience_title = if session.language == "en-US" {
        format!("NUTBOOK · Audience Window · {}", item.summary.file_name)
    } else {
        format!("NUTBOOK · 观众窗口 · {}", item.summary.file_name)
    };
    let result = attach_html_runtime_host_for_presentation(
        app,
        &main,
        &runtime,
        RuntimeHostBounds {
            x: 0.0,
            y: audience_top_inset(session.rehearsal, main.is_fullscreen().unwrap_or(false)),
            width: size.width as f64 / scale,
            height: (size.height as f64 / scale
                - audience_top_inset(session.rehearsal, main.is_fullscreen().unwrap_or(false))).max(1.0),
        },
        &presentation_script,
    );
    match result {
        Ok(_) => {
            let _ = main.set_title(&audience_title);
            resize_audience_child(app);
        }
        Err(error) => {
            state.content_sessions.unregister(&audience_label);
            return Err(error);
        }
    }
    Ok(())
}

fn suspend_for_missing_monitor(app: &tauri::AppHandle, state: &AppState, id: &str) {
    let snapshot = {
        let Ok(mut guard) = state.native_presentation.lock() else {
            return;
        };
        let Some(session) = guard
            .as_mut()
            .filter(|session| session.id == id && !session.suspended)
        else {
            return;
        };
        session.timer_was_running_before_suspend = session.timer_started.is_some();
        session.pause_timer();
        session.suspended = true;
        session.ready = false;
        session.black = false;
        session.pending_page_id = None;
        session.error = Some("观众屏幕已断开。重新选择屏幕后手动恢复。".into());
        session.clone()
    };
    if let Some(blackout) = app.get_webview(BLACKOUT_LABEL) {
        let _ = blackout.close();
    }
    let _ = set_html_runtime_host_visibility(app, snapshot.item_id, false);
    state.content_sessions.unregister(&html_runtime_host_label(snapshot.item_id));
    notify_presenter(app, &snapshot);
}

fn start_monitor_watch(app: tauri::AppHandle, id: String) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_secs(2));
        let state = app.state::<AppState>();
        let target = {
            let Ok(guard) = state.native_presentation.lock() else {
                return;
            };
            let Some(session) = guard.as_ref().filter(|session| session.id == id) else {
                return;
            };
            if session.suspended {
                continue;
            }
            session.monitor_id.clone()
        };
        let Ok(all) = monitors(&app) else {
            continue;
        };
        if !all.iter().any(|monitor| monitor_id(monitor) == target) {
            suspend_for_missing_monitor(&app, &state, &id);
        }
    });
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoverPayload {
    pub session_id: String,
    pub monitor_id: String,
    pub rehearsal: bool,
}

#[tauri::command]
pub fn recover_native_presentation(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: RecoverPayload,
) -> Result<NativePresentationView, AppError> {
    let all = monitors(&app)?;
    if all.is_empty() || (all.len() == 1) != payload.rehearsal {
        return Err(AppError::InvalidParams);
    }
    let monitor = all
        .iter()
        .find(|monitor| monitor_id(monitor) == payload.monitor_id)
        .ok_or(AppError::InvalidParams)?;
    let item_id = {
        let guard = state
            .native_presentation
            .lock()
            .map_err(|_| AppError::InternalError)?;
        guard
            .as_ref()
            .filter(|session| session.id == payload.session_id && session.suspended)
            .ok_or(AppError::InvalidSession)?
            .item_id
    };
    let item = state.get_item_detail(item_id)?;
    let current_hash =
        content_hash_bytes(&fs::read(&item.summary.file_path).map_err(|_| AppError::IoError)?);
    let session = {
        let mut guard = state
            .native_presentation
            .lock()
            .map_err(|_| AppError::InternalError)?;
        let session = guard
            .as_mut()
            .filter(|session| session.id == payload.session_id && session.suspended)
            .ok_or(AppError::InvalidSession)?;
        if session.source_hash != current_hash {
            return Err(AppError::EditConflict);
        }
        session.generation += 1;
        session.monitor_id = payload.monitor_id;
        session.rehearsal = payload.rehearsal;
        session.suspended = false;
        session.ready = false;
        session.error = None;
        session.clone()
    };
    if let Some(presenter_monitor) = all
        .iter()
        .find(|candidate| monitor_id(candidate) != session.monitor_id)
    {
        if let Some(presenter) = app.get_webview_window(PRESENTER_LABEL) {
            let scale = presenter_monitor.scale_factor();
            let _ = presenter.set_position(tauri::LogicalPosition::new(
                presenter_monitor.position().x as f64 / scale + 60.0,
                presenter_monitor.position().y as f64 / scale + 60.0,
            ));
        }
    }
    if let Err(error) = create_audience_surface(&app, &state, &item, monitor, &session) {
        let mut guard = state
            .native_presentation
            .lock()
            .map_err(|_| AppError::InternalError)?;
        if let Some(current) = guard
            .as_mut()
            .filter(|current| current.id == session.id && current.generation == session.generation)
        {
            current.suspended = true;
            current.error = Some("恢复观众画面失败，请重新选择屏幕".into());
            notify_presenter(&app, current);
        }
        return Err(error);
    }
    notify_presenter(&app, &session);
    Ok(session.view())
}

#[tauri::command]
pub fn start_native_presentation(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: StartPayload,
) -> Result<NativePresentationView, AppError> {
    validate_pages(&payload.pages, &payload.start_page_id)?;
    validate_notes(&payload.pages, &payload.notes)?;
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }
    let all = monitors(&app)?;
    if all.is_empty() {
        return Err(AppError::InternalError);
    }
    if (all.len() == 1) != payload.rehearsal {
        return Err(AppError::InvalidParams);
    }
    let audience_monitor = all
        .iter()
        .find(|monitor| monitor_id(monitor) == payload.monitor_id)
        .ok_or(AppError::InvalidParams)?;
    let presenter_monitor = if payload.rehearsal {
        audience_monitor
    } else {
        all.iter()
            .find(|monitor| monitor_id(monitor) != payload.monitor_id)
            .ok_or(AppError::InvalidParams)?
    };
    let source = fs::read(&item.summary.file_path).map_err(|_| AppError::IoError)?;
    let source_hash = content_hash_bytes(&source);
    if source_hash != payload.expected_source_hash {
        return Err(AppError::EditConflict);
    }
    // The runtime probe can race a reload after an edit commit. The file is
    // authoritative for notes already written to the explicit JSON block.
    let mut notes = payload.notes;
    let html = std::str::from_utf8(&source).map_err(|_| AppError::InvalidParams)?;
    for (id, paragraphs) in saved_notes_json_block(html)? { notes.insert(id, paragraphs); }
    validate_notes(&payload.pages, &notes)?;
    let session_id = uuid::Uuid::new_v4().to_string();
    let main = app.get_window("main").ok_or(AppError::InvalidSession)?;
    let session = NativePresentationSession {
        id: session_id.clone(),
        item_id: payload.item_id,
        source_hash,
        pages: payload.pages,
        notes,
        active_page_id: payload.start_page_id.clone(),
        ready: false,
        pending_page_id: None,
        sequence: 0,
        error: None,
        rehearsal: payload.rehearsal,
        timer_elapsed: Duration::ZERO,
        timer_started: None,
        timer_has_started: false,
        timer_was_running_before_suspend: false,
        target_minutes: None,
        black: false,
        suspended: false,
        monitor_id: payload.monitor_id.clone(),
        generation: 1,
        language: if payload.language == "en-US" {
            "en-US".into()
        } else {
            "zh-CN".into()
        },
        main_window_position: main.outer_position().map_err(|_| AppError::InternalError)?,
        main_window_size: main.outer_size().map_err(|_| AppError::InternalError)?,
        main_window_fullscreen: main.is_fullscreen().map_err(|_| AppError::InternalError)?,
        audience_fullscreen_requested: !payload.rehearsal,
        audience_fullscreen_transitioning: false,
        audience_fullscreen_initiated_by_presenter: false,
        audience_editable_focus: false,
        main_window_maximized: main.is_maximized().map_err(|_| AppError::InternalError)?,
        main_window_title: main.title().map_err(|_| AppError::InternalError)?,
    };
    {
        let mut current = state
            .native_presentation
            .lock()
            .map_err(|_| AppError::InternalError)?;
        if current.is_some() {
            return Err(AppError::InvalidSession);
        }
        *current = Some(session.clone());
    }
    let presenter_scale = presenter_monitor.scale_factor();
    let px = presenter_monitor.position().x as f64 / presenter_scale;
    let py = presenter_monitor.position().y as f64 / presenter_scale;
    let presenter = tauri::WebviewWindowBuilder::new(
        &app,
        PRESENTER_LABEL,
        tauri::WebviewUrl::App("native-presenter.html".into()),
    )
    .title("NUTBOOK 演讲者")
    .position(px + 60.0, py + 60.0)
    .inner_size(1120.0, 760.0)
    .resizable(true)
    .build();
    if presenter.is_err() {
        stop_session(&app, &state, &session_id);
        return Err(AppError::InternalError);
    }
    #[cfg(target_os = "macos")]
    if payload.rehearsal {
        // A native fullscreen audience gets macOS's own titlebar controls.
        // Keep the presenter eligible to appear in that fullscreen Space.
        if let Some(webview) = app.get_webview(PRESENTER_LABEL) {
            let window_webview = webview.clone();
            let _ = webview.run_on_main_thread(move || {
                let _ = window_webview.with_webview(|platform_webview| unsafe {
                    let window: &NSWindow = &*platform_webview.ns_window().cast();
                    let behavior = window.collectionBehavior()
                        | NSWindowCollectionBehavior::FullScreenAuxiliary
                        | NSWindowCollectionBehavior::CanJoinAllSpaces;
                    window.setCollectionBehavior(behavior);
                });
            });
        }
    }
    if create_audience_surface(&app, &state, &item, audience_monitor, &session).is_err() {
        stop_session(&app, &state, &session_id);
        return Err(AppError::InternalError);
    }
    if let Some(window) = app.get_webview_window(PRESENTER_LABEL) {
        let _ = window.set_focus();
    }
    if let Some(webview) = app.get_webview(PRESENTER_LABEL) {
        let _ = webview.set_focus();
    }
    if let Some(window) = app.get_webview_window(PRESENTER_LABEL) {
        let app_handle = app.clone();
        let id = session_id.clone();
        window.on_window_event(move |event| {
            if matches!(event, tauri::WindowEvent::Destroyed) {
                let state = app_handle.state::<AppState>();
                stop_session(&app_handle, &state, &id);
            }
        });
    }
    start_monitor_watch(app.clone(), session_id.clone());
    Ok(session.view())
}

#[tauri::command]
pub fn native_presentation_state(
    state: tauri::State<'_, AppState>,
) -> Result<Option<NativePresentationView>, AppError> {
    Ok(state
        .native_presentation
        .lock()
        .map_err(|_| AppError::InternalError)?
        .as_ref()
        .map(NativePresentationSession::view))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerPayload {
    pub session_id: String,
    pub action: String,
    pub target_minutes: Option<u32>,
}

#[tauri::command]
pub fn native_presentation_timer(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: TimerPayload,
) -> Result<NativePresentationView, AppError> {
    let snapshot = {
        let mut guard = state
            .native_presentation
            .lock()
            .map_err(|_| AppError::InternalError)?;
        let session = guard
            .as_mut()
            .filter(|session| session.id == payload.session_id)
            .ok_or(AppError::InvalidSession)?;
        match payload.action.as_str() {
            "start" if !session.timer_has_started && session.start_timer() => {}
            "pause" if session.timer_started.is_some() => { session.pause_timer(); }
            "resume" if session.timer_has_started && session.start_timer() => {}
            "reset" if session.timer_has_started => session.reset_timer(),
            "target" => {
                if payload
                    .target_minutes
                    .is_some_and(|value| value == 0 || value > 600)
                {
                    return Err(AppError::InvalidParams);
                }
                session.target_minutes = payload.target_minutes;
            }
            _ => return Err(AppError::InvalidParams),
        }
        session.clone()
    };
    notify_presenter(&app, &snapshot);
    Ok(snapshot.view())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlackoutPayload {
    pub session_id: String,
    pub black: bool,
}

#[tauri::command]
pub fn native_presentation_blackout(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: BlackoutPayload,
) -> Result<NativePresentationView, AppError> {
    let audience = app
        .get_window("main")
        .ok_or(AppError::InvalidSession)?;
    let (rehearsal, screen_filling) = {
        let guard = state
            .native_presentation
            .lock()
            .map_err(|_| AppError::InternalError)?;
        let session = guard
            .as_ref()
            .filter(|session| session.id == payload.session_id && session.ready)
            .ok_or(AppError::InvalidSession)?;
        if session.black == payload.black {
            return Ok(session.view());
        }
        (session.rehearsal, session.audience_fullscreen_requested)
    };
    if payload.black {
        let size = audience.inner_size().map_err(|_| AppError::InternalError)?;
        let scale = audience
            .scale_factor()
            .map_err(|_| AppError::InternalError)?;
        let top = audience_top_inset(rehearsal, screen_filling || audience.is_fullscreen().unwrap_or(false));
        audience
            .add_child(
                tauri::WebviewBuilder::new(
                    BLACKOUT_LABEL,
                    tauri::WebviewUrl::App(
                        format!("native-blackout.html#{}", payload.session_id).into(),
                    ),
                ),
                tauri::LogicalPosition::new(
                    0.0,
                    top,
                ),
                tauri::LogicalSize::new(
                    size.width as f64 / scale,
                    (size.height as f64 / scale - top).max(1.0),
                ),
            )
            .map_err(|_| AppError::InternalError)?;
    } else if let Some(blackout) = app.get_webview(BLACKOUT_LABEL) {
        blackout.close().map_err(|_| AppError::InternalError)?;
    }
    let snapshot = {
        let mut guard = state
            .native_presentation
            .lock()
            .map_err(|_| AppError::InternalError)?;
        let session = guard
            .as_mut()
            .filter(|session| session.id == payload.session_id)
            .ok_or(AppError::InvalidSession)?;
        session.black = payload.black;
        session.clone()
    };
    notify_presenter(&app, &snapshot);
    if let Some(presenter) = app.get_webview_window(PRESENTER_LABEL) {
        let _ = presenter.set_focus();
    }
    Ok(snapshot.view())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThumbnailPayload {
    pub session_id: String,
    pub page_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThumbnailResult {
    pub page_id: String,
    pub data_url: String,
}

#[tauri::command]
pub async fn native_presentation_thumbnail(
    state: tauri::State<'_, AppState>,
    payload: ThumbnailPayload,
) -> Result<ThumbnailResult, AppError> {
    let session = state
        .native_presentation
        .lock()
        .map_err(|_| AppError::InternalError)?
        .as_ref()
        .filter(|session| {
            session.id == payload.session_id
                && session.pages.iter().any(|page| page.id == payload.page_id)
        })
        .cloned()
        .ok_or(AppError::InvalidSession)?;
    let item = state.get_item_detail(session.item_id)?;
    let source = fs::read(&item.summary.file_path).map_err(|_| AppError::IoError)?;
    if content_hash_bytes(&source) != session.source_hash {
        return Err(AppError::InvalidSession);
    }
    let chromium_path =
        find_local_chromium_executable().ok_or(AppError::ThumbnailGenerationFailed)?;
    let url = state.scoped_file_url_for_item(
        &format!(
            "html-runtime:{}:native-presentation-thumbnail",
            session.item_id
        ),
        &item,
        Path::new(&item.summary.file_path),
    )?;
    let page_id = payload.page_id;
    let revision = session.source_hash;
    let result = tauri::async_runtime::spawn_blocking(move || {
        capture_presentation_thumbnail_with_worker(PresentationThumbnailWorkerInput {
            screenshot: PresentationScreenshotInput {
                chromium_path,
                url,
                page_id: page_id.clone(),
                width: 1024,
                height: 576,
                pixel_ratio: 2,
            },
            source_revision: revision,
        })
        .map(|asset| ThumbnailResult {
            page_id,
            data_url: format!(
                "data:{};base64,{}",
                asset.content_type,
                BASE64.encode(asset.bytes)
            ),
        })
    })
    .await
    .map_err(|_| AppError::InternalError)?;
    result.map_err(|_| AppError::ThumbnailGenerationFailed)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NavigatePayload {
    pub session_id: String,
    pub page_id: String,
}

#[tauri::command]
pub fn native_presentation_navigate(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: NavigatePayload,
) -> Result<NativePresentationView, AppError> {
    let view = {
        let mut guard = state
            .native_presentation
            .lock()
            .map_err(|_| AppError::InternalError)?;
        let session = guard.as_mut().ok_or(AppError::InvalidSession)?;
        if session.id != payload.session_id
            || !session.ready
            || session.pending_page_id.is_some()
            || !session.pages.iter().any(|page| page.id == payload.page_id)
        {
            return Err(AppError::InvalidParams);
        }
        session.sequence += 1;
        session.pending_page_id = Some(payload.page_id.clone());
        session.error = None;
        session.view()
    };
    let window = app
        .get_webview(&html_runtime_host_label(view.item_id))
        .ok_or(AppError::InvalidSession)?;
    let page = serde_json::to_string(&payload.page_id).map_err(|_| AppError::InternalError)?;
    let script = format!(
        "window.__NUTBOOK_NATIVE_PRESENTATION_NAVIGATE__?.({page}, {})",
        view.sequence
    );
    if window.eval(&script).is_err() {
        let mut guard = state
            .native_presentation
            .lock()
            .map_err(|_| AppError::InternalError)?;
        if let Some(session) = guard
            .as_mut()
            .filter(|session| session.id == payload.session_id && session.sequence == view.sequence)
        {
            session.pending_page_id = None;
            session.error = Some("观众画面无法接收翻页命令".into());
            notify_presenter(&app, session);
        }
        return Err(AppError::InternalError);
    }
    let app_handle = app.clone();
    let id = payload.session_id;
    let sequence = view.sequence;
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(5));
        let state = app_handle.state::<AppState>();
        if let Ok(mut guard) = state.native_presentation.lock() {
            if let Some(session) = guard.as_mut().filter(|session| {
                session.id == id
                    && session.sequence == sequence
                    && session.pending_page_id.is_some()
            }) {
                session.pending_page_id = None;
                session.error = Some("翻页未获观众画面确认，请重试".into());
                notify_presenter(&app_handle, session);
            }
        };
    });
    Ok(view)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportPayload {
    pub session_id: String,
    pub item_id: i64,
    pub generation: u64,
    #[serde(rename = "type")]
    pub kind: String,
    pub pages: Option<Vec<PresentationPage>>,
    pub page_id: Option<String>,
    pub sequence: Option<u64>,
    pub error: Option<String>,
    pub direction: Option<String>,
}

fn toggle_audience_fullscreen(
    app: &tauri::AppHandle,
    state: &AppState,
    session_id: &str,
    source: &str,
) -> Result<bool, AppError> {
    let main = app.get_window("main").ok_or(AppError::InvalidSession)?;
    let native_fullscreen = main.is_fullscreen().map_err(|_| AppError::InternalError)?;
    let (next, previous_requested, original_fullscreen, rehearsal, exit_native) = {
        let mut guard = state.native_presentation.lock().map_err(|_| AppError::InternalError)?;
        let session = guard.as_mut()
            .filter(|session| session.id == session_id && session.ready && !session.suspended)
            .ok_or(AppError::InvalidSession)?;
        let previous_requested = session.audience_fullscreen_requested;
        let exit_native = session.rehearsal && native_fullscreen;
        session.audience_fullscreen_requested = if exit_native { false } else { !previous_requested };
        session.audience_fullscreen_transitioning = session.rehearsal;
        session.audience_fullscreen_initiated_by_presenter = source == PRESENTER_LABEL;
        (session.audience_fullscreen_requested, previous_requested, session.main_window_fullscreen, session.rehearsal, exit_native)
    };
    #[cfg(target_os = "macos")]
    if rehearsal { set_audience_child_autoresizing(app, true); }
    let result = if exit_native {
        main.set_fullscreen(false)
    } else if rehearsal {
        main.set_simple_fullscreen(next)
    } else {
        main.set_fullscreen(next)
    };
    if result.is_err() {
        if let Ok(mut guard) = state.native_presentation.lock() {
            if let Some(session) = guard.as_mut().filter(|session| session.id == session_id) {
                session.audience_fullscreen_requested = previous_requested;
                session.audience_fullscreen_transitioning = false;
            }
        }
        #[cfg(target_os = "macos")]
        if rehearsal { set_audience_child_autoresizing(app, previous_requested); }
        return Err(AppError::InternalError);
    }
    let session_still_active = state.native_presentation.lock().ok()
        .is_some_and(|guard| guard.as_ref().is_some_and(|session| session.id == session_id));
    if !session_still_active {
        if rehearsal && !exit_native { let _ = main.set_simple_fullscreen(false); }
        let _ = main.set_fullscreen(original_fullscreen);
        return Err(AppError::InvalidSession);
    }
    if rehearsal && !exit_native {
        if let Ok(mut guard) = state.native_presentation.lock() {
            if let Some(session) = guard.as_mut().filter(|session| session.id == session_id) {
                session.audience_fullscreen_transitioning = false;
                let timer_changed = if next { session.start_timer() } else { session.pause_timer() };
                if timer_changed { notify_presenter(app, session); }
            }
        }
    }
    #[cfg(target_os = "macos")]
    if rehearsal { AUDIENCE_EXIT_HOVER.store(false, Ordering::Relaxed); }
    resize_audience_child(app);
    if rehearsal {
        if let Some(label) = state.native_presentation.lock().ok()
            .and_then(|guard| guard.as_ref().filter(|session| session.id == session_id)
                .map(|session| html_runtime_host_label(session.item_id))) {
            if let Some(audience) = app.get_webview(&label) {
                let _ = audience.eval(&format!("window.__NUTBOOK_NATIVE_PRESENTATION_SET_FULLSCREEN__?.({next})"));
            }
        }
        if source != PRESENTER_LABEL {
            focus_audience_if_main_focused(app);
        }
    }
    if next {
        if let Some(label) = state.native_presentation.lock().ok()
            .and_then(|guard| guard.as_ref().filter(|session| session.id == session_id)
                .map(|session| html_runtime_host_label(session.item_id))) {
            if let Some(audience) = app.get_webview(&label) {
                let _ = audience.eval("window.__NUTBOOK_NATIVE_PRESENTATION_SHOW_FULLSCREEN_HINT__?.()");
            }
        }
    }
    Ok(next)
}

#[tauri::command]
pub fn native_presentation_toggle_fullscreen(
    app: tauri::AppHandle,
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    session_id: String,
) -> Result<bool, AppError> {
    let source = webview.label();
    if source != "main" && source != PRESENTER_LABEL {
        return Err(AppError::InvalidSession);
    }
    toggle_audience_fullscreen(&app, &state, &session_id, source)
}

#[tauri::command]
pub fn native_presentation_report(
    app: tauri::AppHandle,
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    payload: ReportPayload,
) -> Result<bool, AppError> {
    let record = super::preview::content_session_record(&state, &webview)?
        .ok_or(AppError::InvalidSession)?;
    if origin_of_url(
        &webview
            .url()
            .map_err(|_| AppError::InvalidSession)?
            .to_string(),
    )
    .as_deref()
        != Some(record.origin.as_str())
    {
        return Err(AppError::InvalidSession);
    }
    if record.role != ContentSurfaceRole::RuntimeHost
        || record.key != RuntimeKey::Item(payload.item_id)
        || webview.label() != html_runtime_host_label(payload.item_id)
        || record.runtime_session_id != payload.session_id
        || record.generation != payload.generation
    {
        return Err(AppError::InvalidSession);
    }
    if payload.kind == "editable-focus" {
        let mut guard = state.native_presentation.lock().map_err(|_| AppError::InternalError)?;
        let session = guard.as_mut().filter(|session| session.id == payload.session_id)
            .ok_or(AppError::InvalidSession)?;
        session.audience_editable_focus = payload.direction.as_deref() == Some("true");
        return Ok(true);
    }
    if payload.kind == "end" {
        return Ok(stop_session(&app, &state, &payload.session_id));
    }
    if payload.kind == "fullscreen-toggle" {
        toggle_audience_fullscreen(&app, &state, &payload.session_id, "audience")?;
        return Ok(true);
    }
    if payload.kind == "navigation-request" {
        let target_id = {
            let guard = state
                .native_presentation
                .lock()
                .map_err(|_| AppError::InternalError)?;
            let session = guard
                .as_ref()
                .filter(|session| session.id == payload.session_id && session.ready)
                .ok_or(AppError::InvalidSession)?;
            let index = session
                .pages
                .iter()
                .position(|page| page.id == session.active_page_id)
                .ok_or(AppError::InvalidSession)?;
            let next = match payload.direction.as_deref() {
                Some("next") => session.pages.get(index + 1),
                Some("previous") => index.checked_sub(1).and_then(|i| session.pages.get(i)),
                _ => return Err(AppError::InvalidParams),
            };
            match next {
                Some(page) => page.id.clone(),
                None => return Ok(false),
            }
        };
        return Ok(native_presentation_navigate(
            app,
            state,
            NavigatePayload {
                session_id: payload.session_id,
                page_id: target_id,
            },
        )
        .is_ok());
    }
    let current_source_hash = if payload.kind == "ready" {
        let item = state.get_item_detail(payload.item_id)?;
        Some(content_hash_bytes(
            &fs::read(&item.summary.file_path).map_err(|_| AppError::IoError)?,
        ))
    } else {
        None
    };
    let snapshot = {
        let mut guard = state
            .native_presentation
            .lock()
            .map_err(|_| AppError::InternalError)?;
        let session = guard.as_mut().ok_or(AppError::InvalidSession)?;
        if session.id != payload.session_id
            || session.item_id != payload.item_id
            || session.generation != payload.generation
            || session.suspended
        {
            return Err(AppError::InvalidSession);
        }
        match payload.kind.as_str() {
            "ready" => {
                let pages = payload.pages.as_ref().ok_or(AppError::InvalidParams)?;
                let active = payload.page_id.as_deref().ok_or(AppError::InvalidParams)?;
                validate_pages(pages, active)?;
                if current_source_hash.as_deref() != Some(session.source_hash.as_str()) {
                    session.error = Some("演示源文件已变化，请结束后重新加载".into());
                } else if pages.iter().map(|p| &p.id).collect::<Vec<_>>()
                    != session.pages.iter().map(|p| &p.id).collect::<Vec<_>>()
                {
                    session.error = Some("演示文档页面与准备时不一致".into());
                } else {
                    session.active_page_id = active.to_string();
                    let became_ready = !session.ready;
                    session.ready = true;
                    session.error = None;
                    if became_ready && (session.timer_was_running_before_suspend
                        || (!session.timer_has_started && session.audience_fullscreen_requested)) {
                        session.start_timer();
                    }
                    session.timer_was_running_before_suspend = false;
                }
            }
            "page" => {
                let id = payload.page_id.as_deref().ok_or(AppError::InvalidParams)?;
                if !session.pages.iter().any(|page| page.id == id) {
                    return Err(AppError::InvalidParams);
                }
                if let Some(pending) = &session.pending_page_id {
                    if payload.sequence != Some(session.sequence) || pending != id {
                        return Ok(false);
                    }
                    session.pending_page_id = None;
                } else if payload.sequence != Some(0) {
                    return Ok(false);
                }
                session.active_page_id = id.to_string();
                session.error = None;
            }
            "error" => {
                if payload
                    .sequence
                    .is_some_and(|sequence| sequence != session.sequence)
                {
                    return Ok(false);
                }
                session.pending_page_id = None;
                session.error = Some(
                    payload
                        .error
                        .unwrap_or_else(|| "观众画面失联".into())
                        .chars()
                        .take(300)
                        .collect(),
                );
            }
            _ => return Err(AppError::InvalidParams),
        }
        session.clone()
    };
    notify_presenter(&app, &snapshot);
    if payload.kind == "ready" && snapshot.ready {
        // Reconcile the audience child bounds with the current OS window mode
        // even if maximize happened before the page finished loading.
        resize_audience_child(&app);
    }
    Ok(true)
}

fn stop_session(app: &tauri::AppHandle, state: &AppState, id: &str) -> bool {
    let session = {
        let Ok(mut guard) = state.native_presentation.lock() else {
            return false;
        };
        if guard.as_ref().is_none_or(|session| session.id != id) {
            return false;
        }
        guard.take().unwrap()
    };
    if let Some(blackout) = app.get_webview(BLACKOUT_LABEL) {
        let _ = blackout.close();
    }
    state.drop_scoped_server(&format!(
        "html-runtime:{}:native-presentation-thumbnail",
        session.item_id
    ));
    let _ = set_html_runtime_host_visibility(app, session.item_id, false);
    state.content_sessions.unregister(&html_runtime_host_label(session.item_id));
    if let Some(main) = app.get_window("main") {
        if session.rehearsal { let _ = main.set_simple_fullscreen(false); }
        let _ = main.set_fullscreen(false);
        let _ = main.unmaximize();
        let _ = main.set_position(tauri::Position::Physical(session.main_window_position));
        let _ = main.set_size(tauri::Size::Physical(session.main_window_size));
        if session.main_window_maximized { let _ = main.maximize(); }
        let _ = main.set_fullscreen(session.main_window_fullscreen);
        let _ = main.set_title(&session.main_window_title);
    }
    if let Some(presenter) = app.get_webview_window(PRESENTER_LABEL) {
        let _ = presenter.close();
    }
    if let Some(main) = app.get_webview("main") {
        let _ = main.eval(&format!(
            "window.__NUTBOOK_NATIVE_PRESENTATION_ENDED__?.({})",
            session.item_id
        ));
    }
    true
}

pub fn stop_native_presentation_on_main_reload(app: &tauri::AppHandle) {
    let Some(state) = app.try_state::<AppState>() else { return; };
    let id = state.native_presentation.lock().ok()
        .and_then(|guard| guard.as_ref().map(|session| session.id.clone()));
    if let Some(id) = id {
        stop_session(app, &state, &id);
    }
}

/// A close request on the shared NUTBOOK window ends presentation first.
/// The caller must prevent that close so a click on the traffic light cannot
/// silently turn into an application exit.
pub fn stop_native_presentation_on_main_close(app: &tauri::AppHandle) -> bool {
    let Some(state) = app.try_state::<AppState>() else { return false; };
    let id = state.native_presentation.lock().ok()
        .and_then(|guard| guard.as_ref().map(|session| session.id.clone()));
    id.is_some_and(|id| stop_session(app, &state, &id))
}

#[tauri::command]
pub fn stop_native_presentation(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    session_id: String,
) -> Result<bool, AppError> {
    Ok(stop_session(&app, &state, &session_id))
}

#[cfg(test)]
mod tests {
    use super::{
        adapted_legacy_html, adapted_legacy_runtime, audience_top_inset, known_legacy_source,
        replace_notes_json_block, validate_notes, validate_pages, NoteParagraph, NoteRun,
        PresentationPage,
    };
    use std::{
        collections::HashMap,
        io::Write,
        process::{Command, Stdio},
    };

    #[test]
    fn fullscreen_audience_uses_the_whole_window() {
        assert_eq!(audience_top_inset(true, false), 36.0);
        assert_eq!(audience_top_inset(true, true), 0.0);
        assert_eq!(audience_top_inset(false, true), 0.0);
    }

    #[test]
    fn legacy_upgrade_uses_real_runtime_and_leaves_source_unchanged() {
        let html = include_str!("../../../docs/presentations/nutbook-product-intro/index.html");
        let runtime =
            include_str!("../../../docs/presentations/nutbook-product-intro/assets/runtime.js");
        let count = known_legacy_source(html, runtime.as_bytes())
            .expect("recognized product intro runtime");
        let adapted_html = adapted_legacy_html(html, count).expect("adapted HTML");
        let adapted_runtime = adapted_legacy_runtime(runtime).expect("adapted runtime");
        assert_eq!(count, 11);
        assert_eq!(
            adapted_html
                .matches("data-nutbook-page-id=\"slide-")
                .count(),
            count
        );
        assert!(adapted_html.contains("src=\"assets/runtime.nutbook.js\""));
        assert!(html.contains("src=\"assets/runtime.js\""));
        assert!(adapted_runtime.contains("window.__NUTBOOK_PRESENTATION__"));
        assert!(adapted_runtime.contains("nativeSubscribers.forEach"));
        let mut child = Command::new("node")
            .arg("--check")
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .spawn()
            .expect("Node is part of the frontend toolchain");
        child
            .stdin
            .take()
            .unwrap()
            .write_all(adapted_runtime.as_bytes())
            .unwrap();
        assert!(
            child.wait().unwrap().success(),
            "adapted runtime must parse as JavaScript"
        );
    }

    #[test]
    fn rejects_duplicate_pages_and_invalid_notes() {
        let pages = vec![
            PresentationPage {
                id: "one".into(),
                title: "One".into(),
            },
            PresentationPage {
                id: "one".into(),
                title: "Again".into(),
            },
        ];
        assert!(validate_pages(&pages, "one").is_err());
        let pages = vec![PresentationPage {
            id: "one".into(),
            title: "One".into(),
        }];
        let notes = HashMap::from([(
            "other".into(),
            vec![NoteParagraph {
                kind: "paragraph".into(),
                runs: vec![NoteRun {
                    text: "text".into(),
                    bold: false,
                }],
            }],
        )]);
        assert!(validate_notes(&pages, &notes).is_err());
        let large_notes = HashMap::from([(
            "one".into(),
            vec![NoteParagraph {
                kind: "paragraph".into(),
                runs: (0..60)
                    .map(|_| NoteRun {
                        text: "x".repeat(10_000),
                        bold: false,
                    })
                    .collect(),
            }],
        )]);
        assert!(validate_notes(&pages, &large_notes).is_err());
    }

    #[test]
    fn notes_patch_preserves_other_html_and_escapes_script_endings() {
        let html = "<html><head><script>window.keep=1</script></head><body><script type=\"application/json\" id=\"nutbook-presentation-notes\">{\"version\":1,\"pages\":{\"old\":[{\"type\":\"paragraph\",\"runs\":[{\"text\":\"untouched\"}]}]}}</script><img src=\"local.png\"></body></html>";
        let notes = HashMap::from([(
            "new".into(),
            vec![NoteParagraph {
                kind: "paragraph".into(),
                runs: vec![NoteRun {
                    text: "</script><img src=evil>".into(),
                    bold: true,
                }],
            }],
        )]);
        let updated = replace_notes_json_block(html, &notes).unwrap();
        assert_eq!(updated.matches("</script>").count(), 2);
        assert!(updated.contains("window.keep=1"));
        assert!(updated.contains("<img src=\"local.png\">"));
        assert!(updated.contains("untouched"));
        assert!(updated.contains("\\u003c/script\\u003e"));
        let saved = super::saved_notes_json_block(&updated).unwrap();
        assert_eq!(saved["new"][0].runs[0].text, "</script><img src=evil>");
        assert_eq!(saved["old"][0].runs[0].text, "untouched");
    }
}
