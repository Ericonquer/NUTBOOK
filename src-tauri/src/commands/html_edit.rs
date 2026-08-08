use std::{fs::{self, OpenOptions}, io::Write, path::PathBuf};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};

use crate::{
    core::html_edit::{
        get_html_edit_patch_for_file as get_patch_for_file,
        commit_html_edit_for_file, HtmlEditCommit,
        save_html_edit_conflict_copy_for_file,
        recover_html_edit_commit_journal,
        import_html_edit_asset as import_asset,
        load_html_edit_manifest,
        populate_runtime_asset_urls,
        save_html_edit_patch_for_file as save_patch_for_file,
        save_html_edit_patch_replacing_changes_for_file as replace_patch_for_file, HtmlEditPatchLookup,
        HtmlEditPatchResponse, HtmlEditPatchSave, HtmlEditPatchSaveResponse,
    },
    core::agent_output_manifest::{read_agent_output_manifest, ValidatedAgentOutputManifest},
    core::thumbnail::{capture_presentation_thumbnail_with_worker, find_local_chromium_executable, PresentationScreenshotInput, PresentationThumbnailWorkerInput},
    db::repositories::{ItemRepository, LibraryRepository},
    errors::AppError,
    models::{CommitHtmlEditRequest, CommitHtmlEditResponse, GeneratePresentationThumbnailRequest, GeneratePresentationThumbnailResponse, GetHtmlEditPatchRequest, HtmlEditAssetImport, HtmlEditSessionLeaseRequest, ImportHtmlEditAssetRequest, ImportHtmlEditAssetResponse, Library, ListItemsQuery, SaveHtmlEditConflictCopyRequest, SaveHtmlEditConflictCopyResponse, SaveHtmlEditPatchRequest, WriteEditableHtmlCopyRequest, WriteEditableHtmlCopyResponse, HTML_EDIT_COPY_MAX_BYTES, HTML_EDIT_COPY_MAX_FIELDS},
    state::AppState,
};

/// Returns the converter source from the host bundle instead of asking the main
/// webview to fetch another asset while a child runtime is active.  Conversion
/// begins before the regular editor runtime is installed, so this keeps the
/// hand-off entirely on the already-working Tauri IPC path.
#[tauri::command]
pub fn get_html_edit_converter_script() -> &'static str {
    include_str!("../../../dist/assets/html-edit-converter.js")
}

#[tauri::command]
pub async fn generate_presentation_thumbnail(
    state: tauri::State<'_, AppState>,
    payload: GeneratePresentationThumbnailRequest,
) -> Result<GeneratePresentationThumbnailResponse, AppError> {
    require_html_edit_session_lease(state.html_edit_session_lease_matches(
        payload.item_id,
        &payload.runtime_session_id,
        payload.generation,
    )?)?;
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" { return Err(AppError::UnsupportedFileType); }
    let chromium_path = find_local_chromium_executable().ok_or(AppError::ThumbnailGenerationFailed)?;
    let url = state.local_server_file_url(std::path::Path::new(&item.summary.file_path));
    let page_id = payload.page_id;
    let result = tauri::async_runtime::spawn_blocking(move || {
        capture_presentation_thumbnail_with_worker(PresentationThumbnailWorkerInput {
            screenshot: PresentationScreenshotInput {
                chromium_path,
                url,
                page_id: page_id.clone(),
                width: 480,
                height: 270,
            },
            source_revision: payload.source_file_hash,
        }).map(|asset| (page_id, asset))
    }).await.map_err(|_| AppError::InternalError)?;
    let (page_id, asset) = result.map_err(|_| AppError::ThumbnailGenerationFailed)?;
    Ok(GeneratePresentationThumbnailResponse {
        page_id,
        data_url: format!("data:{};base64,{}", asset.content_type, BASE64.encode(asset.bytes)),
        width: asset.width,
        height: asset.height,
        backend: asset.backend.to_string(),
    })
}

#[tauri::command]
pub fn get_html_edit_patch(
    state: tauri::State<'_, AppState>,
    payload: GetHtmlEditPatchRequest,
) -> Result<HtmlEditPatchResponse, AppError> {
    let has_session = !payload.runtime_session_id.is_empty();
    if has_session {
        require_html_edit_session_lease(state.html_edit_session_lease_matches(
            payload.item_id,
            &payload.runtime_session_id,
            payload.generation,
        )?)?;
    }
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }
    let library = library_for_item(&state, item.summary.library_id)?;
    let title_hint = title_hint(&item);
    let library_root = html_edit_library_root(&library)?;
    // Recovery is intentionally before inspecting sidecars or source hashes:
    // a process crash may have replaced the source but not retired its patch.
    let manifest_lock = state.html_edit_manifest_lock(library.id)?;
    let _manifest_guard = manifest_lock.lock().map_err(|_| AppError::InternalError)?;
    recover_html_edit_commit_journal(&library_root)?;
    let lookup = HtmlEditPatchLookup {
        library_id: library.id,
        library_root: library_root.clone(),
        item_id: item.summary.id,
        file_path: PathBuf::from(&item.summary.file_path),
        title_hint,
    };
    let mut response = get_patch_for_file(&lookup)?;
    response.managed_source_allowed = manifest_managed_source_allowed(
        &state,
        item.summary.id,
        &item.summary.file_path,
    )?;
    let manifest = load_html_edit_manifest(&library_root)?;
    if has_session && !manifest.entries.contains_key(&response.source_relative_path) {
        response.artifact_edit_id = state
            .html_edit_session_provisional_identity(
                payload.item_id,
                &payload.runtime_session_id,
                payload.generation,
            )?
            .ok_or(AppError::InvalidSession)?;
    }
    populate_runtime_asset_urls(&mut response, &library_root, |path| state.local_server_file_url(path));
    Ok(response)
}

#[tauri::command]
pub fn import_html_edit_asset(
    state: tauri::State<'_, AppState>,
    payload: ImportHtmlEditAssetRequest,
) -> Result<ImportHtmlEditAssetResponse, AppError> {
    // Do this before item/library lookup and, critically, before core import
    // opens either user-selected source or a destination directory.
    let session_is_current = !payload.asset_request_id.is_empty()
        && state.html_edit_session_lease_matches(
            payload.item_id,
            &payload.runtime_session_id,
            payload.generation,
        )?;
    require_html_edit_session_lease(session_is_current)?;
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }
    let library = library_for_item(&state, item.summary.library_id)?;
    let manifest_lock = state.html_edit_manifest_lock(library.id)?;
    let _guard = manifest_lock.lock().map_err(|_| AppError::InternalError)?;
    let library_root = html_edit_library_root(&library)?;
    let current_session_identity = state
        .html_edit_session_provisional_identity(
            payload.item_id,
            &payload.runtime_session_id,
            payload.generation,
        )?
        .ok_or(AppError::InvalidSession)?;
    let lookup = HtmlEditPatchLookup {
        library_id: library.id,
        library_root: library_root.clone(),
        item_id: item.summary.id,
        file_path: PathBuf::from(&item.summary.file_path),
        title_hint: title_hint(&item),
    };
    let current = get_patch_for_file(&lookup)?;
    let manifest = load_html_edit_manifest(&library_root)?;
    validate_html_edit_asset_import_identity(
        manifest.entries.get(&current.source_relative_path).map(|entry| entry.artifact_edit_id.as_str()),
        current.patch_revision,
        &current_session_identity,
        &payload.artifact_edit_id,
        payload.expected_patch_revision,
    )?;
    let result = import_asset_for_active_session(
        state.html_edit_session_lease_matches(
            payload.item_id,
            &payload.runtime_session_id,
            payload.generation,
        )?,
        || import_asset(&HtmlEditAssetImport {
            library_root: library_root.clone(),
            artifact_edit_id: payload.artifact_edit_id,
            source_path: PathBuf::from(payload.source_path),
        }),
    )?;
    let absolute_asset = resolve_imported_asset_path(&library, &result.relative_path)?;
    let runtime_url = state.local_server_file_url(&absolute_asset);
    if !runtime_url.starts_with("http://") && !runtime_url.starts_with("https://") {
        return Err(AppError::InternalError);
    }
    Ok(ImportHtmlEditAssetResponse {
        runtime_url: Some(runtime_url),
        ..result
    })
}

/// Host calls this immediately before injecting the runtime.  It replaces any
/// older lease for this item atomically, so picker results captured by the old
/// generation are rejected by `import_html_edit_asset`.
#[tauri::command]
pub fn register_html_edit_session_lease(
    state: tauri::State<'_, AppState>,
    payload: HtmlEditSessionLeaseRequest,
) -> Result<(), AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }
    state.register_html_edit_session_lease(
        payload.item_id,
        payload.runtime_session_id,
        payload.generation,
    )
}

/// Exact-match invalidation makes a late exit harmless: it cannot remove a
/// newer lease for the same item.
#[tauri::command]
pub fn invalidate_html_edit_session_lease(
    state: tauri::State<'_, AppState>,
    payload: HtmlEditSessionLeaseRequest,
) -> Result<bool, AppError> {
    state.invalidate_html_edit_session_lease(
        payload.item_id,
        &payload.runtime_session_id,
        payload.generation,
    )
}

/// Persists the detached-DOM conversion result. The renderer may choose fields,
/// but never the destination: this command derives the sole companion name from
/// the current source file and rejects stale sessions/source bytes.
#[tauri::command]
pub fn write_editable_html_copy(
    state: tauri::State<'_, AppState>,
    payload: WriteEditableHtmlCopyRequest,
) -> Result<WriteEditableHtmlCopyResponse, AppError> {
    require_html_edit_session_lease(state.html_edit_session_lease_matches(
        payload.item_id, &payload.runtime_session_id, payload.generation,
    )?)?;
    if payload.protocolized_html.len() > HTML_EDIT_COPY_MAX_BYTES
        || payload.text_count.saturating_add(payload.image_count).saturating_add(payload.background_image_count) > HTML_EDIT_COPY_MAX_FIELDS {
        return Err(AppError::InvalidParams);
    }
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" { return Err(AppError::UnsupportedFileType); }
    let source = PathBuf::from(&item.summary.file_path).canonicalize().map_err(|_| AppError::ItemNotFound)?;
    let library = library_for_item(&state, item.summary.library_id)?;
    let root = html_edit_library_root(&library)?.canonicalize().map_err(|_| AppError::LibraryNotFound)?;
    if !source.starts_with(&root) { return Err(AppError::LibraryNotFound); }
    let current_hash = crate::core::html_edit::content_hash_bytes(&fs::read(&source).map_err(|_| AppError::IoError)?);
    if current_hash != payload.expected_source_file_hash { return Err(AppError::EditConflict); }
    let stem = source.file_stem().and_then(|v| v.to_str()).ok_or(AppError::InvalidParams)?;
    let target = source.parent().ok_or(AppError::InvalidParams)?.join(format!("{stem}.nutbook-editable.html"));
    if target.exists() {
        return Ok(copy_response(&state, library.id, &target, "already_exists", 0, 0, 0)?);
    }
    let mut output = match OpenOptions::new().write(true).create_new(true).open(&target) {
        Ok(file) => file,
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => {
            return Ok(copy_response(&state, library.id, &target, "already_exists", 0, 0, 0)?);
        }
        Err(_) => return Err(AppError::IoError),
    };
    output.write_all(payload.protocolized_html.as_bytes()).map_err(|_| AppError::IoError)?;
    output.sync_all().map_err(|_| AppError::IoError)?;
    copy_response(&state, library.id, &target, "created", payload.text_count, payload.image_count, payload.background_image_count)
}

fn copy_response(state: &AppState, library_id: i64, path: &std::path::Path, status: &str, text_count: u32, image_count: u32, background_image_count: u32) -> Result<WriteEditableHtmlCopyResponse, AppError> {
    crate::commands::library::scan_library_once(&state.database, library_id)?;
    let canonical = path.canonicalize().map_err(|_| AppError::IoError)?;
    let item_id = state.list_items(&ListItemsQuery { library_id: Some(library_id), include_deleted: Some(false), page: Some(1), page_size: Some(500), ..ListItemsQuery::default() })?
        .items.into_iter().find(|item| std::path::Path::new(&item.file_path).canonicalize().ok().as_deref() == Some(canonical.as_path())).map(|item| item.id);
    if item_id.is_none() { return Err(AppError::ItemNotFound); }
    Ok(WriteEditableHtmlCopyResponse { status: status.into(), file_path: canonical.to_string_lossy().into(), item_id, text_count, image_count, background_image_count })
}

#[tauri::command]
pub fn save_html_edit_patch(
    state: tauri::State<'_, AppState>,
    payload: SaveHtmlEditPatchRequest,
) -> Result<HtmlEditPatchSaveResponse, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }
    require_html_edit_session_lease(state.html_edit_session_lease_matches(
        item.summary.id,
        &payload.runtime_session_id,
        payload.generation,
    )?)?;
    let library = library_for_item(&state, item.summary.library_id)?;
    let title_hint = title_hint(&item);
    let manifest_lock = state.html_edit_manifest_lock(library.id)?;
    let _guard = manifest_lock.lock().map_err(|_| AppError::InternalError)?;
    let library_root = html_edit_library_root(&library)?;
    let save = HtmlEditPatchSave {
        library_id: library.id,
        library_root,
        item_id: item.summary.id,
        file_path: PathBuf::from(item.summary.file_path),
        title_hint,
        artifact_edit_id: payload.artifact_edit_id,
        expected_file_hash: payload.expected_file_hash,
        expected_modified_at: payload.expected_modified_at,
        expected_patch_revision: payload.expected_patch_revision,
        changes: payload.changes,
    };
    if payload.replace_changes {
        replace_patch_for_file(&save)
    } else {
        save_patch_for_file(&save)
    }
}

/// Materializes the active canonical patch into the source HTML.  The frontend
/// only receives a success response after the source file has been atomically
/// replaced and its old sidecar state has been retired.
#[tauri::command]
pub fn commit_html_edit(
    state: tauri::State<'_, AppState>,
    payload: CommitHtmlEditRequest,
) -> Result<CommitHtmlEditResponse, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" { return Err(AppError::UnsupportedFileType); }
    require_html_edit_session_lease(state.html_edit_session_lease_matches(
        item.summary.id, &payload.runtime_session_id, payload.generation,
    )?)?;
    if !manifest_managed_source_allowed(&state, item.summary.id, &item.summary.file_path)? {
        return Err(AppError::InvalidParams);
    }
    let library = library_for_item(&state, item.summary.library_id)?;
    let file_path = PathBuf::from(&item.summary.file_path);
    let path_lock = state.html_edit_path_lock(&file_path)?;
    let _path_guard = path_lock.lock().map_err(|_| AppError::InternalError)?;
    let manifest_lock = state.html_edit_manifest_lock(library.id)?;
    let _manifest_guard = manifest_lock.lock().map_err(|_| AppError::InternalError)?;
    let library_root = html_edit_library_root(&library)?;
    let commit = HtmlEditCommit {
        library_root,
        file_path,
        artifact_edit_id: payload.artifact_edit_id,
        expected_file_hash: payload.expected_file_hash,
        expected_modified_at: payload.expected_modified_at,
        changes: payload.changes,
    };
    let committed = match commit_html_edit_for_file(&commit) {
        Ok(committed) => committed,
        Err(error) => {
            // Temporary, host-readable diagnostic for the repeated editor
            // save failure. Remove after the rejected field is fixed.
            if let Ok(mut log) = OpenOptions::new().create(true).append(true).open(std::env::temp_dir().join("nutbook-html-edit-debug.log")) {
                let _ = writeln!(log, "event=commit-html-edit-rejected error={error:?} artifact_edit_id={} changes={:?}", commit.artifact_edit_id, commit.changes);
            }
            return Err(error);
        }
    };
    // The commit is already durable. A best-effort refresh must never turn it
    // into an apparent failed save that the user might retry.
    let _ = crate::commands::library::scan_library_once(&state.database, library.id);
    Ok(CommitHtmlEditResponse {
        source_file_hash: committed.source_file_hash,
        source_modified_at: committed.source_modified_at,
        source_size: committed.source_size,
        normalized_changes: committed.normalized_changes,
    })
}

#[tauri::command]
pub fn save_html_edit_conflict_copy(state: tauri::State<'_, AppState>, payload: SaveHtmlEditConflictCopyRequest) -> Result<SaveHtmlEditConflictCopyResponse, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    require_html_edit_session_lease(state.html_edit_session_lease_matches(item.summary.id, &payload.runtime_session_id, payload.generation)?)?;
    let library = library_for_item(&state, item.summary.library_id)?;
    let path = PathBuf::from(&item.summary.file_path);
    let path_lock = state.html_edit_path_lock(&path)?; let _path_guard = path_lock.lock().map_err(|_| AppError::InternalError)?;
    let target = save_html_edit_conflict_copy_for_file(&HtmlEditCommit { library_root: html_edit_library_root(&library)?, file_path: path, artifact_edit_id: payload.artifact_edit_id, expected_file_hash: String::new(), expected_modified_at: 0, changes: payload.changes })?;
    // The conflict copy is already durable. Keep refresh failure from
    // misleading the user into retrying and creating a second copy.
    let _ = crate::commands::library::scan_library_once(&state.database, library.id);
    Ok(SaveHtmlEditConflictCopyResponse { file_path: target.to_string_lossy().into_owned() })
}

fn library_for_item(state: &AppState, library_id: i64) -> Result<Library, AppError> {
    state
        .list_libraries()?
        .into_iter()
        .find(|library| library.id == library_id)
        .ok_or(AppError::LibraryNotFound)
}

fn manifest_managed_source_allowed(
    state: &AppState,
    item_id: i64,
    item_path: &str,
) -> Result<bool, AppError> {
    let declarations = state.database.manifest_html_edit_declarations_for_item(item_id)?;
    if declarations.is_empty() {
        // Existing non-Agent protocol HTML keeps its established managed
        // source behavior. Manifest-owned items use the stricter branch below.
        return Ok(true);
    }
    let item_path = fs::canonicalize(item_path).map_err(|_| AppError::IoError)?;
    let libraries = state.list_libraries()?;
    for declaration in declarations {
        if declaration.edit_contract.as_deref() != Some("nutbook-html/v1")
            || declaration.save_policy.as_deref() != Some("managed-source")
        {
            continue;
        }
        let Some(project) = libraries
            .iter()
            .find(|library| library.id == declaration.project_library_id)
        else {
            continue;
        };
        let project_root = PathBuf::from(&project.root_path);
        let Ok(Some(manifest)) = read_agent_output_manifest(&project_root) else {
            continue;
        };
        if active_manifest_authorizes_managed_source(
            &manifest,
            &declaration.manifest_entry_id,
            &project_root,
            &item_path,
        ) {
            return Ok(true);
        }
    }
    Ok(false)
}

fn active_manifest_authorizes_managed_source(
    manifest: &ValidatedAgentOutputManifest,
    entry_id: &str,
    project_root: &std::path::Path,
    canonical_item_path: &std::path::Path,
) -> bool {
    let Some(entry) = manifest.entries.iter().find(|entry| {
        entry.id == entry_id
            && entry.state == "active"
            && entry.edit_contract.as_deref() == Some("nutbook-html/v1")
            && entry.save_policy.as_deref() == Some("managed-source")
    }) else {
        return false;
    };
    fs::canonicalize(project_root.join(&entry.path))
        .is_ok_and(|entry_path| entry_path == canonical_item_path)
}

fn html_edit_library_root(library: &Library) -> Result<PathBuf, AppError> {
    let root = PathBuf::from(&library.root_path);
    if library.source_kind == "file" {
        return root
            .parent()
            .map(PathBuf::from)
            .ok_or(AppError::InvalidParams);
    }
    Ok(root)
}

fn resolve_imported_asset_path(library: &Library, relative_path: &str) -> Result<PathBuf, AppError> {
    let root = html_edit_library_root(library)?;
    let root = root.canonicalize().map_err(|_| AppError::IoError)?;
    let path = root.join(relative_path).canonicalize().map_err(|_| AppError::IoError)?;
    if !path.starts_with(&root) {
        return Err(AppError::InternalError);
    }
    Ok(path)
}

fn title_hint(item: &crate::models::ItemDetail) -> String {
    item.summary
        .title
        .clone()
        .or_else(|| item.extracted_title.clone())
        .unwrap_or_else(|| item.summary.file_name.clone())
}

fn require_html_edit_session_lease(session_is_current: bool) -> Result<(), AppError> {
    if session_is_current { Ok(()) } else { Err(AppError::InvalidSession) }
}

/// A manifest-bound document can only import under its persisted identity and
/// current revision. Before the first save, the one identity held by the exact
/// active lease is accepted at revision zero only.
pub fn validate_html_edit_asset_import_identity(
    bound_artifact_edit_id: Option<&str>,
    current_patch_revision: u64,
    provisional_artifact_edit_id: &str,
    requested_artifact_edit_id: &str,
    expected_patch_revision: u64,
) -> Result<(), AppError> {
    let valid = match bound_artifact_edit_id {
        Some(bound) => requested_artifact_edit_id == bound && expected_patch_revision == current_patch_revision,
        None => requested_artifact_edit_id == provisional_artifact_edit_id && expected_patch_revision == 0,
    };
    if valid { Ok(()) } else { Err(AppError::EditConflict) }
}

fn import_asset_for_active_session<T>(
    session_is_current: bool,
    import: impl FnOnce() -> Result<T, AppError>,
) -> Result<T, AppError> {
    require_html_edit_session_lease(session_is_current)?;
    import()
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use crate::{
        core::{agent_output_manifest::read_agent_output_manifest, html_edit::import_html_edit_asset},
        models::{HtmlEditAssetImport, Library},
    };

    use super::{active_manifest_authorizes_managed_source, html_edit_library_root, import_asset_for_active_session, require_html_edit_session_lease, validate_html_edit_asset_import_identity};

    #[test]
    fn manifest_managed_source_requires_current_active_entry_and_exact_path() {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/agent-artifact-discovery/projects/sample-agent-project");
        let manifest = read_agent_output_manifest(&root)
            .expect("valid manifest")
            .expect("manifest exists");
        let editable = root
            .join(".agent-outputs/nbskill/editable-report.html")
            .canonicalize()
            .expect("editable fixture");
        assert!(active_manifest_authorizes_managed_source(
            &manifest,
            "editable-report-v1",
            &root,
            &editable,
        ));
        assert!(!active_manifest_authorizes_managed_source(
            &manifest,
            "discovery-presentation-v1",
            &root,
            &editable,
        ));
        assert!(!active_manifest_authorizes_managed_source(
            &manifest,
            "editable-report-v1",
            &root,
            &root.join("presentation/index.html").canonicalize().expect("presentation"),
        ));
    }

    #[test]
    fn html_edit_asset_import_accepts_provisional_identity_only_at_revision_zero() {
        assert!(validate_html_edit_asset_import_identity(None, 0, "html-edit-provisional", "html-edit-provisional", 0).is_ok());
        assert!(validate_html_edit_asset_import_identity(None, 0, "html-edit-provisional", "html-edit-provisional", 1).is_err());
    }

    #[test]
    fn html_edit_asset_import_rejects_bound_identity_or_revision_mismatch() {
        assert!(validate_html_edit_asset_import_identity(Some("html-edit-bound"), 3, "html-edit-provisional", "html-edit-provisional", 0).is_err());
        assert!(validate_html_edit_asset_import_identity(Some("html-edit-bound"), 3, "html-edit-provisional", "html-edit-bound", 2).is_err());
        assert!(validate_html_edit_asset_import_identity(Some("html-edit-bound"), 3, "html-edit-provisional", "html-edit-bound", 3).is_ok());
    }

    #[test]
    fn html_edit_asset_import_save_race_rejects_late_revision_zero_without_writing_asset() {
        let root = tempfile::tempdir().expect("library root");
        let result = validate_html_edit_asset_import_identity(
            Some("html-edit-bound-after-save"),
            1,
            "html-edit-provisional",
            "html-edit-provisional",
            0,
        );
        assert!(matches!(result, Err(crate::errors::AppError::EditConflict)));
        assert!(
            !root.path().join(".nutbook/html-edit/assets/html-edit-provisional").exists(),
            "a late provisional import must fail before it creates its asset directory"
        );
    }

    #[test]
    fn stale_session_is_rejected_before_import_closure_runs() {
        let root = tempfile::tempdir().expect("library root");
        let missing_source = root.path().join("does-not-exist.png");
        let asset_dir = root.path().join(".nutbook/html-edit/assets/html-edit-test");
        let error = import_asset_for_active_session(false, || import_html_edit_asset(&HtmlEditAssetImport {
            library_root: root.path().to_path_buf(),
            artifact_edit_id: "html-edit-test".to_string(),
            source_path: missing_source.clone(),
        })).expect_err("invalid lease must stop before import");
        assert!(matches!(error, crate::errors::AppError::InvalidSession));
        assert!(!missing_source.exists());
        assert!(!asset_dir.exists(), "invalid lease must not create destination assets");
        assert!(require_html_edit_session_lease(false).is_err());
    }

    #[test]
    fn html_edit_library_root_uses_parent_for_file_source() {
        let library = Library {
            id: 1,
            name: "single html".to_string(),
            root_path: "/tmp/nutbook/editable-basic.html".to_string(),
            source_kind: "file".to_string(),
            path_state: "valid".to_string(),
            is_active: true,
            created_at: "now".to_string(),
            updated_at: "now".to_string(),
            last_scanned_at: None,
            skill_binding: None,
        };

        let root = html_edit_library_root(&library).expect("file library uses parent");

        assert_eq!(root, PathBuf::from("/tmp/nutbook"));
    }

    #[test]
    fn html_edit_library_root_keeps_folder_source() {
        let library = Library {
            id: 1,
            name: "folder".to_string(),
            root_path: "/tmp/nutbook/html-edit-acceptance".to_string(),
            source_kind: "folder".to_string(),
            path_state: "valid".to_string(),
            is_active: true,
            created_at: "now".to_string(),
            updated_at: "now".to_string(),
            last_scanned_at: None,
            skill_binding: None,
        };

        let root = html_edit_library_root(&library).expect("folder library uses root");

        assert_eq!(root, PathBuf::from("/tmp/nutbook/html-edit-acceptance"));
    }
}
