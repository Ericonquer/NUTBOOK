//! One native presentation per app. The audience is untrusted document HTML;
//! the presenter is a bundled app page. This module owns their shared lifetime.

use std::{
    collections::{HashMap, HashSet},
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
    time::{Duration, Instant},
};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};
use tauri::Manager;

use crate::{
    core::{
        content_session::{origin_of_url, ContentSessionRecord, ContentSurfaceRole, RuntimeKey},
        html_edit::content_hash_bytes,
        thumbnail::{
            capture_presentation_thumbnail_with_worker, find_local_chromium_executable,
            PresentationScreenshotInput, PresentationThumbnailWorkerInput,
        },
    },
    db::repositories::ItemRepository,
    errors::AppError,
    models::{ItemDetail, ListItemsQuery},
    state::AppState,
};

const AUDIENCE_LABEL: &str = "native-presentation-audience";
const PRESENTER_LABEL: &str = "native-presentation-presenter";
const BLACKOUT_LABEL: &str = "native-presentation-blackout";
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
    pub timer_was_running_before_suspend: bool,
    pub target_minutes: Option<u32>,
    pub black: bool,
    pub suspended: bool,
    pub monitor_id: String,
    pub generation: u64,
    pub language: String,
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
            target_minutes: self.target_minutes,
            black: self.black,
            suspended: self.suspended,
            language: self.language.clone(),
        }
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
    validate_pages(&payload.pages, &payload.active_page_id)?;
    validate_notes(&payload.pages, &payload.notes)?;
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
) -> String {
    format!(
        r#"(() => {{
      const sessionId = {session_id:?}, itemId = {item_id}, startPageId = {start_page_id:?}, generation = {generation};
      let pendingSequence = 0;
      const invoke = (type, extra = {{}}) => window.__TAURI_INTERNALS__?.invoke('native_presentation_report', {{
        payload: {{ sessionId, itemId, generation, type, ...extra }}
      }}).catch(() => {{}});
      document.addEventListener('keydown', event => {{
        if (event.defaultPrevented || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
        const target = event.target;
        if (target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName || '')) return;
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
          bridge.subscribe(pageId => invoke('page', {{ pageId: String(pageId), sequence: pendingSequence }}));
          if (bridge.activePageId !== startPageId) await bridge.goTo(startPageId);
          invoke('ready', {{ pages, pageId: String(bridge.activePageId || '') }});
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

fn create_audience_window(
    app: &tauri::AppHandle,
    state: &AppState,
    item: &ItemDetail,
    monitor: &tauri::Monitor,
    session: &NativePresentationSession,
) -> Result<(), AppError> {
    let key = format!("html-runtime:{}:native-presentation", session.item_id);
    let url = state.scoped_file_url_for_item(&key, item, Path::new(&item.summary.file_path))?;
    let webview_url =
        tauri::WebviewUrl::External(url.parse().map_err(|_| AppError::PreviewLoadFailed)?);
    let origin = origin_of_url(&url).ok_or(AppError::InvalidSession)?;
    state
        .content_sessions
        .register(
            AUDIENCE_LABEL,
            ContentSessionRecord {
                role: ContentSurfaceRole::NativeAudience,
                key: RuntimeKey::Item(session.item_id),
                origin,
                runtime_session_id: session.id.clone(),
                generation: session.generation,
                view_state_surface_token: 0,
            },
        )
        .map_err(|_| AppError::InternalError)?;
    let scale = monitor.scale_factor();
    let mut x = monitor.position().x as f64 / scale;
    let mut y = monitor.position().y as f64 / scale;
    let mut width = monitor.size().width as f64 / scale;
    let mut height = monitor.size().height as f64 / scale;
    if session.rehearsal {
        width = width.min(900.0) * 0.72;
        height = height.min(700.0) * 0.72;
        x += 120.0;
        y += 120.0;
    }
    let init_script = audience_init_script(
        &session.id,
        session.item_id,
        &session.active_page_id,
        session.generation,
    );
    let result = tauri::WebviewWindowBuilder::new(app, AUDIENCE_LABEL, webview_url)
        .title(item.summary.file_name.clone())
        .position(x, y)
        .inner_size(width, height)
        .fullscreen(!session.rehearsal)
        .resizable(session.rehearsal)
        .initialization_script(&init_script)
        .build();
    let window = match result {
        Ok(window) => window,
        Err(_) => {
            state.content_sessions.unregister(AUDIENCE_LABEL);
            state.drop_scoped_server(&key);
            return Err(AppError::InternalError);
        }
    };
    let app_handle = app.clone();
    let id = session.id.clone();
    let generation = session.generation;
    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Resized(_)) {
            if let (Some(audience), Some(blackout)) = (
                app_handle.get_webview_window(AUDIENCE_LABEL),
                app_handle.get_webview(BLACKOUT_LABEL),
            ) {
                if let (Ok(size), Ok(scale)) = (audience.inner_size(), audience.scale_factor()) {
                    let _ = blackout.set_bounds(tauri::Rect {
                        position: tauri::Position::Logical(tauri::LogicalPosition::new(0.0, 0.0)),
                        size: tauri::Size::Logical(tauri::LogicalSize::new(
                            size.width as f64 / scale,
                            size.height as f64 / scale,
                        )),
                    });
                }
            }
        }
        if matches!(event, tauri::WindowEvent::Destroyed) {
            let state = app_handle.state::<AppState>();
            let expected_disconnect = state
                .native_presentation
                .lock()
                .ok()
                .and_then(|guard| {
                    guard.as_ref().map(|current| {
                        current.id == id && current.generation == generation && current.suspended
                    })
                })
                .unwrap_or(false);
            if !expected_disconnect {
                stop_session(&app_handle, &state, &id);
            }
        }
    });
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
        if let Some(started) = session.timer_started.take() {
            session.timer_elapsed += started.elapsed();
        }
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
    state.content_sessions.unregister(AUDIENCE_LABEL);
    if let Some(audience) = app.get_webview_window(AUDIENCE_LABEL) {
        let _ = audience.close();
    }
    state.drop_scoped_server(&format!(
        "html-runtime:{}:native-presentation",
        snapshot.item_id
    ));
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
    if let Err(error) = create_audience_window(&app, &state, &item, monitor, &session) {
        let mut guard = state
            .native_presentation
            .lock()
            .map_err(|_| AppError::InternalError)?;
        if let Some(current) = guard
            .as_mut()
            .filter(|current| current.id == session.id && current.generation == session.generation)
        {
            current.suspended = true;
            current.error = Some("恢复观众窗口失败，请重新选择屏幕".into());
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
        timer_was_running_before_suspend: true,
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
    if create_audience_window(&app, &state, &item, audience_monitor, &session).is_err() {
        stop_session(&app, &state, &session_id);
        return Err(AppError::InternalError);
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
            "pause" if session.timer_started.is_some() => {
                session.timer_elapsed += session.timer_started.take().unwrap().elapsed();
            }
            "resume" if session.ready && session.timer_started.is_none() => {
                session.timer_started = Some(Instant::now())
            }
            "reset" => {
                session.timer_elapsed = Duration::ZERO;
                if session.timer_started.is_some() {
                    session.timer_started = Some(Instant::now());
                }
            }
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
        .get_window(AUDIENCE_LABEL)
        .ok_or(AppError::InvalidSession)?;
    {
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
    }
    if payload.black {
        let size = audience.inner_size().map_err(|_| AppError::InternalError)?;
        let scale = audience
            .scale_factor()
            .map_err(|_| AppError::InternalError)?;
        audience
            .add_child(
                tauri::WebviewBuilder::new(
                    BLACKOUT_LABEL,
                    tauri::WebviewUrl::App(
                        format!("native-blackout.html#{}", payload.session_id).into(),
                    ),
                ),
                tauri::LogicalPosition::new(0.0, 0.0),
                tauri::LogicalSize::new(size.width as f64 / scale, size.height as f64 / scale),
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
                width: 640,
                height: 360,
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
        .get_webview_window(AUDIENCE_LABEL)
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
            session.error = Some("观众窗口无法接收翻页命令".into());
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
                session.error = Some("翻页未获观众窗口确认，请重试".into());
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
    if record.role != ContentSurfaceRole::NativeAudience
        || record.key != RuntimeKey::Item(payload.item_id)
        || record.runtime_session_id != payload.session_id
        || record.generation != payload.generation
    {
        return Err(AppError::InvalidSession);
    }
    if payload.kind == "end" {
        return Ok(stop_session(&app, &state, &payload.session_id));
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
                    session.ready = true;
                    session.error = None;
                    if session.timer_started.is_none() && session.timer_was_running_before_suspend {
                        session.timer_started = Some(Instant::now());
                    }
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
                        .unwrap_or_else(|| "观众窗口失联".into())
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
    state.content_sessions.unregister(AUDIENCE_LABEL);
    if let Some(blackout) = app.get_webview(BLACKOUT_LABEL) {
        let _ = blackout.close();
    }
    state.drop_scoped_server(&format!(
        "html-runtime:{}:native-presentation",
        session.item_id
    ));
    state.drop_scoped_server(&format!(
        "html-runtime:{}:native-presentation-thumbnail",
        session.item_id
    ));
    for label in [AUDIENCE_LABEL, PRESENTER_LABEL] {
        if let Some(window) = app.get_webview_window(label) {
            let _ = window.close();
        }
    }
    if let Some(main) = app.get_webview("main") {
        let _ = main.eval(&format!(
            "window.__NUTBOOK_NATIVE_PRESENTATION_ENDED__?.({})",
            session.item_id
        ));
    }
    true
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
        adapted_legacy_html, adapted_legacy_runtime, known_legacy_source, replace_notes_json_block,
        validate_notes, validate_pages, NoteParagraph, NoteRun, PresentationPage,
    };
    use std::{
        collections::HashMap,
        io::Write,
        process::{Command, Stdio},
    };

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
