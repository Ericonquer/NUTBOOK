use crate::{
    core::library::select_or_create_library,
    core::scanner::{scan_file_source, scan_library_files},
    core::watcher::build_library_watcher,
    db::repositories::{ItemRepository, LibraryRepository},
    db::Database,
    errors::AppError,
    models::{
        DeleteLibraryRequest, Library, OpenLibraryLocationRequest, ScanLibraryRequest,
        ScanLibraryResponse, SelectLibraryRequest, WatchLibraryRequest, WatchLibraryResponse,
    },
    state::AppState,
};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenFolderDialogAtRequest {
    pub default_path: Option<String>,
}

#[tauri::command]
pub fn select_library(
    state: tauri::State<'_, AppState>,
    payload: SelectLibraryRequest,
) -> Result<Library, AppError> {
    let libraries = state.list_libraries()?;
    let next_id = state.next_library_id()?;

    let library = select_or_create_library(
        &libraries,
        &payload.root_path,
        payload.name.as_deref(),
        payload.source_kind.as_deref().unwrap_or("folder"),
        next_id,
        "2026-04-22T00:00:00Z",
    )?;

    if libraries.iter().all(|existing| existing.id != library.id) {
        state.upsert_library(library.clone())?;
    }

    Ok(library)
}

#[tauri::command]
pub fn list_libraries(state: tauri::State<'_, AppState>) -> Result<Vec<Library>, AppError> {
    state.list_libraries()
}

#[tauri::command]
pub fn delete_library(
    state: tauri::State<'_, AppState>,
    payload: DeleteLibraryRequest,
) -> Result<bool, AppError> {
    state.delete_library(payload.library_id)
}

#[tauri::command]
pub fn open_folder_dialog() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("选择文件夹")
        .pick_folder()
        .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_folder_dialog_at(payload: OpenFolderDialogAtRequest) -> Option<String> {
    let mut dialog = rfd::FileDialog::new().set_title("选择文件夹");
    if let Some(default_path) = payload.default_path.as_deref() {
        let path = std::path::Path::new(default_path);
        if path.is_dir() {
            dialog = dialog.set_directory(path);
        }
    }
    dialog
        .pick_folder()
        .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_file_dialog() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("选择文件")
        .add_filter("Markdown / HTML 文件", &["md", "markdown", "html", "htm"])
        .pick_file()
        .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn open_library_location(
    state: tauri::State<'_, AppState>,
    payload: OpenLibraryLocationRequest,
) -> Result<bool, AppError> {
    let libraries = state.list_libraries()?;
    let library = libraries
        .into_iter()
        .find(|library| library.id == payload.library_id)
        .ok_or(AppError::LibraryNotFound)?;

    let path = std::path::PathBuf::from(&library.root_path);
    let target = if library.source_kind == "file" {
        path.parent()
            .map(std::path::Path::to_path_buf)
            .ok_or(AppError::InvalidParams)?
    } else {
        path
    };

    std::process::Command::new("open")
        .arg(target)
        .status()
        .map_err(|_| AppError::IoError)?;

    Ok(true)
}

#[tauri::command]
pub fn scan_library(
    state: tauri::State<'_, AppState>,
    payload: ScanLibraryRequest,
) -> Result<ScanLibraryResponse, AppError> {
    let mode = payload.mode.unwrap_or_else(|| "full".to_string());
    let response = scan_library_once(&state.database, payload.library_id)?;

    Ok(ScanLibraryResponse {
        library_id: response.library_id,
        mode,
        scanned_count: response.scanned_count,
        created_count: response.created_count,
        updated_count: response.updated_count,
        deleted_count: response.deleted_count,
        started_at: response.started_at.clone(),
        finished_at: response.finished_at,
    })
}

#[tauri::command]
pub fn watch_library(
    state: tauri::State<'_, AppState>,
    payload: WatchLibraryRequest,
) -> Result<WatchLibraryResponse, AppError> {
    let libraries = state.list_libraries()?;
    let library = libraries
        .into_iter()
        .find(|library| library.id == payload.library_id)
        .ok_or(AppError::LibraryNotFound)?;
    let watcher = build_library_watcher(state.database.clone(), library.clone())?;
    state.watch_library(payload.library_id, watcher)?;

    Ok(WatchLibraryResponse {
        library_id: payload.library_id,
        watching: true,
    })
}

#[derive(Debug, Clone)]
pub struct LibraryScanSnapshot {
    pub library_id: i64,
    pub scanned_count: u64,
    pub created_count: u64,
    pub updated_count: u64,
    pub deleted_count: u64,
    pub started_at: String,
    pub finished_at: String,
}

pub fn scan_library_once(database: &Database, library_id: i64) -> Result<LibraryScanSnapshot, AppError> {
    let libraries = database.list_libraries()?;
    let library = libraries
        .into_iter()
        .find(|library| library.id == library_id)
        .ok_or(AppError::LibraryNotFound)?;
    let started_at = current_timestamp();
    let scanned_items = if library.source_kind == "file" {
        scan_file_source(library_id, &library.root_path, &started_at)?
    } else {
        scan_library_files(library_id, &library.root_path, &started_at)?
    };
    let scanned_count = scanned_items.len() as u64;
    let (created_count, updated_count, deleted_count) =
        database.replace_items_for_library(library_id, &scanned_items)?;
    let mut updated_library = library;
    updated_library.updated_at = started_at.clone();
    updated_library.last_scanned_at = Some(started_at.clone());
    database.upsert_library(updated_library)?;

    Ok(LibraryScanSnapshot {
        library_id,
        scanned_count,
        created_count,
        updated_count,
        deleted_count,
        started_at: started_at.clone(),
        finished_at: started_at,
    })
}

fn current_timestamp() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

#[cfg(test)]
mod tests {
    use std::{fs, thread, time::Duration};

    use notify::{Config, PollWatcher};

    use crate::{
        commands::library::scan_library_once,
        core::watcher::build_library_watcher,
        db::repositories::{ItemRepository, LibraryRepository},
        db::Database,
        models::Library,
        state::AppState,
    };

    fn temp_db_path() -> std::path::PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("nutbook-watch-{nanos}.sqlite3"))
    }

    #[test]
    fn watch_library_requires_existing_library_and_is_idempotent() {
        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());

        let missing = state.watch_library(404, noop_watcher());
        assert!(matches!(missing, Err(crate::errors::AppError::LibraryNotFound)));

        state
            .upsert_library(Library {
                id: 1,
                name: "Library".to_string(),
                root_path: "/tmp/library".to_string(),
                source_kind: "folder".to_string(),
                is_active: true,
                created_at: "now".to_string(),
                updated_at: "now".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be created");

        let first = state
            .watch_library(1, noop_watcher())
            .expect("first watch should succeed");
        let second = state
            .watch_library(1, noop_watcher())
            .expect("second watch should also succeed");
        assert!(first);
        assert!(second);
        assert!(state.is_library_watched(1));

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn watcher_rescans_library_after_file_change() {
        let root = std::env::temp_dir().join(format!(
            "nutbook-watch-root-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("system time should be after unix epoch")
                .as_nanos()
        ));
        fs::create_dir_all(&root).expect("root dir should exist");

        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        database
            .upsert_library(Library {
                id: 1,
                name: "Watched".to_string(),
                root_path: root.to_string_lossy().to_string(),
                source_kind: "folder".to_string(),
                is_active: true,
                created_at: "now".to_string(),
                updated_at: "now".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be created");

        scan_library_once(&database, 1).expect("initial scan should work");
        let watcher = build_library_watcher(
            database.clone(),
            Library {
                id: 1,
                name: "Watched".to_string(),
                root_path: root.to_string_lossy().to_string(),
                source_kind: "folder".to_string(),
                is_active: true,
                created_at: "now".to_string(),
                updated_at: "now".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            },
        )
        .expect("watcher should build");

        let _keep_alive = watcher;
        thread::sleep(Duration::from_millis(350));
        fs::write(root.join("note.md"), "# watched").expect("file should be written");
        thread::sleep(Duration::from_millis(1800));

        let listed = database
            .list_libraries()
            .expect("libraries should load");
        assert_eq!(listed.len(), 1);
        assert!(listed[0].last_scanned_at.is_some());

        let items = database
            .list_items(&crate::models::ListItemsQuery {
                library_id: Some(1),
                ..crate::models::ListItemsQuery::default()
            })
            .expect("items should load");
        assert_eq!(items.total, 1);

        let _ = fs::remove_file(path);
        let _ = fs::remove_dir_all(root);
    }

    fn noop_watcher() -> PollWatcher {
        PollWatcher::new(|_| {}, Config::default()).expect("watcher should initialize")
    }
}
