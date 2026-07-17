use std::path::PathBuf;

use crate::{
    core::html_edit::{
        get_html_edit_patch_for_file as get_patch_for_file,
        save_html_edit_patch_for_file as save_patch_for_file, HtmlEditPatchLookup,
        HtmlEditPatchResponse, HtmlEditPatchSave, HtmlEditPatchSaveResponse,
    },
    db::repositories::{ItemRepository, LibraryRepository},
    errors::AppError,
    models::{GetHtmlEditPatchRequest, Library, SaveHtmlEditPatchRequest},
    state::AppState,
};

#[tauri::command]
pub fn get_html_edit_patch(
    state: tauri::State<'_, AppState>,
    payload: GetHtmlEditPatchRequest,
) -> Result<HtmlEditPatchResponse, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }
    let library = library_for_item(&state, item.summary.library_id)?;
    let title_hint = title_hint(&item);
    let lookup = HtmlEditPatchLookup {
        library_id: library.id,
        library_root: PathBuf::from(library.root_path),
        item_id: item.summary.id,
        file_path: PathBuf::from(item.summary.file_path),
        title_hint,
    };
    get_patch_for_file(&lookup)
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
    if !runtime_session_matches_item(item.summary.id, &payload.runtime_session_id) {
        return Err(AppError::InvalidParams);
    }
    let library = library_for_item(&state, item.summary.library_id)?;
    let title_hint = title_hint(&item);
    let manifest_lock = state.html_edit_manifest_lock(library.id)?;
    let _guard = manifest_lock.lock().map_err(|_| AppError::InternalError)?;
    let save = HtmlEditPatchSave {
        library_id: library.id,
        library_root: PathBuf::from(library.root_path),
        item_id: item.summary.id,
        file_path: PathBuf::from(item.summary.file_path),
        title_hint,
        artifact_edit_id: payload.artifact_edit_id,
        expected_file_hash: payload.expected_file_hash,
        expected_modified_at: payload.expected_modified_at,
        expected_patch_revision: payload.expected_patch_revision,
        changes: payload.changes,
    };
    save_patch_for_file(&save)
}

fn library_for_item(state: &AppState, library_id: i64) -> Result<Library, AppError> {
    state
        .list_libraries()?
        .into_iter()
        .find(|library| library.id == library_id)
        .ok_or(AppError::LibraryNotFound)
}

fn title_hint(item: &crate::models::ItemDetail) -> String {
    item.summary
        .title
        .clone()
        .or_else(|| item.extracted_title.clone())
        .unwrap_or_else(|| item.summary.file_name.clone())
}

fn runtime_session_matches_item(item_id: i64, runtime_session_id: &str) -> bool {
    runtime_session_id.starts_with(&format!("html-edit-{item_id}-"))
}

#[cfg(test)]
mod tests {
    use super::runtime_session_matches_item;

    #[test]
    fn runtime_session_matches_item_id_prefix() {
        assert!(runtime_session_matches_item(42, "html-edit-42-123456"));
        assert!(!runtime_session_matches_item(7, "html-edit-42-123456"));
        assert!(!runtime_session_matches_item(42, ""));
    }
}
