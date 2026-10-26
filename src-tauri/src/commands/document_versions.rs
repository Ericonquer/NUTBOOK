use crate::db::repositories::ItemRepository;
use crate::{
    core::document_versions::{digest, file_identity, DocumentHead, PreviewInfo},
    errors::AppError,
    state::AppState,
};
use serde::{Deserialize, Serialize};
use tauri::Manager;
use std::path::PathBuf;
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryTarget {
    pub item_id: Option<i64>,
    pub session_id: Option<String>,
    pub generation: Option<u64>,
}
fn trusted(webview: &tauri::Webview) -> Result<(), AppError> {
    if matches!(webview.label(), "main" | "settings-overlay") {
        Ok(())
    } else {
        Err(AppError::InvalidSession)
    }
}
fn target(state: &AppState, value: &HistoryTarget) -> Result<(PathBuf, PathBuf), AppError> {
    if let Some(id) = value.item_id {
        let item = state.get_item_detail(id)?;
        if !matches!(item.summary.file_type.as_str(), "markdown" | "html") {
            return Err(AppError::UnsupportedFileType);
        }
        Ok((
            PathBuf::from(&item.summary.file_path),
            state.authorization_root_for_item(&item)?,
        ))
    } else if let Some(id) = &value.session_id {
        let session = state
            .external_sessions
            .get(id)
            .ok_or(AppError::InvalidSession)?;
        if Some(session.generation) != value.generation {
            return Err(AppError::InvalidSession);
        }
        let path = PathBuf::from(session.raw_path);
        let root = path.parent().ok_or(AppError::InvalidParams)?.to_owned();
        Ok((path, root))
    } else {
        Err(AppError::InvalidParams)
    }
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryList {
    documents: Vec<DocumentHead>,
    document_bytes: std::collections::BTreeMap<String,u64>,
    active_document_id: Option<String>,
    used_bytes: u64,
    storage_path: PathBuf,
    limit_bytes: u64,
    availability:std::collections::BTreeMap<String,bool>,
    restore_allowed: bool,
}
#[tauri::command]
pub fn list_document_versions(
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    payload: HistoryTarget,
) -> Result<HistoryList, AppError> {
    trusted(&webview)?;
    let store = state.document_history()?;
    for id in store.pending_index_documents()? { let _=state.synchronize_history_index(&id); }
    let restore_allowed = if let Some(id) = payload.item_id {
        state.get_item_detail(id).ok().is_some_and(|item| item.summary.file_type == "markdown"
            || (item.summary.file_type == "html" && super::html_edit::manifest_managed_source_allowed(&state,id,&item.summary.file_path).unwrap_or(false)))
    } else { payload.session_id.is_some() };
    let documents = store.documents()?;
    let active_document_id = target(&state, &payload).ok().and_then(|(path, _)| {
        let path = path.canonicalize().ok()?;
        let identity = file_identity(&path).ok()?;
        documents
            .iter()
            .find(|h| h.canonical_path == path && h.file_identity == identity)
            .map(|h| h.id.clone())
    });
    let availability=documents.iter().map(|head|(head.id.clone(),file_identity(&head.canonical_path).is_ok_and(|identity|identity==head.file_identity))).collect();
    let document_bytes=documents.iter().map(|head|Ok((head.id.clone(),store.document_usage_bytes(head)?))).collect::<Result<_,crate::core::document_versions::HistoryError>>()?;
    let settings = store.settings()?;
    Ok(HistoryList {
        documents,
        document_bytes,
        active_document_id,
        used_bytes: store.usage_bytes()?,
        storage_path: store.storage_path().to_owned(),
        limit_bytes: settings.limit_bytes,
        availability,
        restore_allowed,
    })
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionSelection {
    pub document_id: String,
    pub version_id: String,
    pub generation: u64,
}
#[tauri::command]
pub fn get_document_version_preview(
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    payload: VersionSelection,
) -> Result<PreviewInfo, AppError> {
    trusted(&webview)?;
    let result=state.document_history()?.begin_markdown_preview(
        &payload.document_id,
        &payload.version_id,
        payload.generation,
    )?;
    Ok(result)
}
#[tauri::command]
pub fn close_document_version_preview(
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    session_id: String,
) -> Result<(), AppError> {
    trusted(&webview)?;
    Ok(state.document_history()?.close_preview(&session_id)?)
}
#[tauri::command]
pub fn set_version_history_limit(
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    megabytes: u64,
) -> Result<(), AppError> {
    trusted(&webview)?;
    state.document_history()?.set_limit_mb(megabytes)?;
    Ok(())
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteHistory {
    document_id: String,
    version_id: Option<String>,
    confirmed: bool,
}
#[tauri::command]
pub fn delete_document_versions(
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    payload: DeleteHistory,
) -> Result<(), AppError> {
    trusted(&webview)?;
    if !payload.confirmed {
        return Err(AppError::InvalidParams);
    }
    let store = state.document_history()?;
    store.delete_versions(&payload.document_id, payload.version_id.as_deref())?;
    store.collect_unreferenced_objects()?;
    state.synchronize_history_index(&payload.document_id);
    Ok(())
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreHistory {
    document_id: String,
    version_id: String,
    target: HistoryTarget,
    expected_hash: String,
    allow_incomplete: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreResult {
    source: String,
    file_hash: String,
    index_synchronized: bool,
    resource_directories: Vec<PathBuf>,
    baseline: crate::core::external_open::ExternalBaseline,
}
#[tauri::command]
pub fn restore_document_version(
    app: tauri::AppHandle,
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    payload: RestoreHistory,
) -> Result<RestoreResult, AppError> {
    trusted(&webview)?;
    let (path, root) = target(&state, &payload.target)?;
    let store = state.document_history()?;
    let head = store.document(&payload.document_id)?;
    if path.canonicalize().map_err(|_| AppError::IoError)? != head.canonical_path {
        return Err(AppError::InvalidSession);
    }
    let html = head.versions.iter().any(|v| v.snapshot.html.is_some());
    if html {
        let id = payload.target.item_id.ok_or(AppError::InvalidSession)?;
        if payload.target.session_id.is_some() { return Err(AppError::InvalidSession); }
        let item = state.get_item_detail(id)?;
        if item.summary.file_type != "html" || !super::html_edit::manifest_managed_source_allowed(&state,id,&item.summary.file_path)? { return Err(AppError::InvalidParams); }
        let path_lock = state.html_edit_path_lock(&path)?;
        let _path_guard = path_lock.lock().map_err(|_| AppError::InternalError)?;
        let manifest_lock = state.html_edit_manifest_lock(item.summary.library_id)?;
        let _manifest_guard = manifest_lock.lock().map_err(|_| AppError::InternalError)?;
        if !super::html_edit::manifest_managed_source_allowed(&state,id,&item.summary.file_path)? { return Err(AppError::InvalidParams); }
        state.with_no_html_edit_session(|| {
            crate::core::html_edit::restore_html_history_for_file(&store,&root,&path,&payload.document_id,&payload.version_id,&payload.expected_hash,payload.allow_incomplete)?;
            // Queue reload before a new editor lease can start. No late frontend
            // callback may reload a newly opened editor and erase its draft.
            let _ = crate::core::html_runtime::eval_html_runtime_script(&app,id,"window.location.reload();");
            Ok(())
        })?;
    } else {
        store.restore_markdown(&payload.document_id,&payload.version_id,&root,&payload.expected_hash,payload.allow_incomplete)?;
    }
    let source = std::fs::read_to_string(&path).map_err(|_| AppError::IoError)?;
    let hash = digest(source.as_bytes());
    if let Some(id) = payload.target.session_id {
        let baseline = crate::core::external_open::read_file_baseline(&path)?.baseline;
        state.external_sessions.update_baseline(&id, baseline);
    }
    let mut index_synchronized = state.synchronize_history_index(&payload.document_id);
    if let Some(id) = payload.target.item_id {
        // Source is already durable; never report a second save failure here.
        let file_name = path.file_name().unwrap_or_default().to_string_lossy();
        let modified = std::fs::metadata(&path)
            .ok()
            .and_then(|m| crate::core::document::file_modified_at_string(&m).ok())
            .unwrap_or_default();
        if html {
            index_synchronized &= state.database.sync_item_revision_after_durable_save(id,&path.to_string_lossy(),&hash,Some(&modified),source.len() as i64).index_synchronized;
        } else {
        index_synchronized &= state
            .update_markdown_item_content(
                id,
                &crate::core::document::markdown_summary(&source),
                &modified,
                &hash,
                &source,
                &source,
                &crate::core::document::render_markdown_as_html_for_file(&source, &file_name),
            )
            .is_ok();
        }
    }
    if html {
        if let (Some(id),Some(main)) = (payload.target.item_id,app.get_webview("main")) {
            let _ = main.eval(&format!("window.__NUTBOOK_HTML_HISTORY_RESTORED__?.({id});"));
        }
    }
    Ok(RestoreResult {
        source,
        file_hash: hash,
        index_synchronized,
        baseline: crate::core::external_open::read_file_baseline(&path)?.baseline,
        resource_directories: store
            .document(&payload.document_id)?
            .restored_directories
            .into_iter()
            .map(|r| r.path)
            .collect(),
    })
}

#[tauri::command]
pub fn open_document_history_location(webview:tauri::Webview,state:tauri::State<'_,AppState>)->Result<(),AppError>{
    trusted(&webview)?;
    let store=state.document_history()?;
    #[cfg(target_os="macos")]
    let result=crate::core::platform::command("open").arg(store.storage_path()).status();
    #[cfg(target_os="windows")]
    let result=crate::core::platform::command("explorer.exe").arg(store.storage_path()).status();
    #[cfg(not(any(target_os="macos",target_os="windows")))]
    let result=crate::core::platform::command("xdg-open").arg(store.storage_path()).status();
    if result.map_err(|_|AppError::IoError)?.success(){Ok(())}else{Err(AppError::IoError)}
}


#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveVersionAs { document_id: String, version_id: String, allow_incomplete: bool }

#[tauri::command]
pub fn save_document_version_as(webview: tauri::Webview, state: tauri::State<'_, AppState>, payload: SaveVersionAs) -> Result<Option<PathBuf>, AppError> {
    trusted(&webview)?;
    let store = state.document_history()?;
    let head = store.document(&payload.document_id)?;
    if !head.versions.iter().any(|v| v.id == payload.version_id) { return Err(AppError::InvalidParams); }
    let name = head.canonical_path.file_name().and_then(|s| s.to_str()).unwrap_or("restored.md");
    let html = head.versions.iter().any(|v| v.snapshot.html.is_some());
    let dialog = rfd::FileDialog::new().set_file_name(name);
    let dialog = if html { dialog.add_filter("HTML", &["html", "htm"]) } else { dialog.add_filter("Markdown", &["md", "markdown"]) };
    let Some(path) = dialog.save_file() else { return Ok(None); };
    let expected = match std::fs::symlink_metadata(&path) {
        Ok(metadata) if metadata.is_file() && !metadata.file_type().is_symlink() => Some(digest(&std::fs::read(&path).map_err(|_| AppError::IoError)?)),
        Ok(_) => return Err(AppError::InvalidParams),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
        Err(_) => return Err(AppError::IoError),
    };
    let commit = if html {
        store.save_archived_html_as(&payload.document_id,&payload.version_id,&path,expected.as_deref(),payload.allow_incomplete)?
    } else { crate::core::markdown_save_as::publish_archived(&store, &payload.document_id, &payload.version_id, &path, expected.as_deref(), payload.allow_incomplete)? };
    state.synchronize_history_index(&commit.document_id);
    Ok(Some(path))
}
