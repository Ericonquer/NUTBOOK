use crate::{
    core::folder_ingest::{
        cancel_preflight_op, preflight_folder_ingest, preflight_op_snapshot,
        start_background_preflight,
    },
    core::library::select_or_create_library,
    core::scanner::{scan_file_source, scan_library_files},
    core::watcher::build_library_watcher,
    db::repositories::{ItemRepository, LibraryRepository},
    db::Database,
    errors::AppError,
    models::{
        DeleteLibraryRequest, FolderIngestRequest, FolderPreflightSummary,
        Library, OpenLibraryLocationRequest, RepairLibraryRootRequest, ScanLibraryRequest,
        ScanLibraryResponse, SelectLibraryRequest, SyncLibraryWatchersResponse, WatchLibraryRequest,
        WatchLibraryResponse,
    },
    state::AppState,
};
use serde::Deserialize;
use std::path::{Path, PathBuf};
use tauri::Manager;

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

    let path = PathBuf::from(&library.root_path);
    let target = if library.source_kind == "file" {
        path.parent()
            .map(Path::to_path_buf)
            .ok_or(AppError::InvalidParams)?
    } else {
        path
    };
    let open_target = nearest_existing_directory(&target).ok_or(AppError::IoError)?;

    std::process::Command::new("open")
        .arg(open_target)
        .status()
        .map_err(|_| AppError::IoError)?;

    Ok(true)
}

fn nearest_existing_directory(path: &Path) -> Option<PathBuf> {
    let mut current = Some(path);
    while let Some(candidate) = current {
        if candidate.exists() && candidate.is_dir() {
            return Some(candidate.to_path_buf());
        }
        current = candidate.parent();
    }
    None
}

#[tauri::command]
pub fn scan_library(
    state: tauri::State<'_, AppState>,
    payload: ScanLibraryRequest,
) -> Result<ScanLibraryResponse, AppError> {
    let mode = payload.mode.unwrap_or_else(|| "full".to_string());
    // 手动扫描与 watcher/catch-up/delete/repair 对同一 library 串行。
    let response = state.scan_coordinator().run_scan(payload.library_id)?;

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

/// repair 的真实生命周期（共享实现，command 与测试都走这里）：
/// 1) 与旧 watcher / 在跑 scan 串行（per-library 锁 + 全局 DB 写锁）；
/// 2) 完成所有不改变状态的校验（含 root 冲突检查），失败则旧 watcher 保持；
/// 3) 停止旧路径 watcher；
/// 4) 更新 root；更新失败则恢复旧路径 watcher 再返回错误；
/// 5) 基于新路径重建 watcher（在扫描之前完成，保证扫描失败后仍有 watcher）；
/// 6) 扫描新 root；失败时 watcher 已就位，向上返回扫描错误。
/// 中途失败不会留下「DB 是新路径、watcher 仍是旧路径」或「无 watcher」状态。
pub fn repair_library_root_lifecycle(
    state: &AppState,
    library_id: i64,
    root_path: &str,
) -> Result<Library, AppError> {
    // 与旧 watcher / 在跑 scan 串行（per-library 锁），并持全局 DB 写锁
    // （与其他 library 的 scan/delete 互斥），避免 repair 期间并发写库。
    let library_lock = state.scan_coordinator().library_lock(library_id);
    let _guard = library_lock.lock().map_err(|_| AppError::InternalError)?;
    let db_write_lock = state.scan_coordinator().db_write_lock();
    let _db = db_write_lock.lock().map_err(|_| AppError::InternalError)?;

    // 2) 校验（不改变任何状态）：拿 current 并计算 repaired。
    //    失败（含 root 被其他来源占用）→ 直接返回，旧 watcher 原样保持。
    let libraries = state.list_libraries()?;
    let current = libraries
        .iter()
        .find(|library| library.id == library_id)
        .cloned()
        .ok_or(AppError::LibraryNotFound)?;

    let other_libraries = libraries
        .into_iter()
        .filter(|library| library.id != library_id)
        .collect::<Vec<_>>();

    let now = current_timestamp();
    let repaired = select_or_create_library(
        &other_libraries,
        root_path,
        None,
        &current.source_kind,
        current.id,
        &now,
    )?;
    // repair 不允许把 root 指向其他已存在 library 的 root：
    // select_or_create_library 对「同 source_kind + 同 root」会返回 existing
    // （id != current.id），此时必须报错，不能把 library 1 悄悄改绑到
    // library 2 的根。此检查发生在任何状态变更之前。
    if repaired.id != current.id {
        return Err(AppError::LibraryPathOverlap);
    }
    let mut repaired = repaired;
    repaired.created_at = current.created_at.clone();
    repaired.updated_at = now.clone();
    repaired.last_scanned_at = current.last_scanned_at.clone();
    repaired.path_state = "valid".to_string();

    // 3) 停止旧路径 watcher（best-effort，失败仅 warning）。
    //    fence bump 同时让旧 watcher 的一切晚到事件批次失效。
    state.scan_coordinator().bump_generation(library_id);
    if state.unwatch_library(library_id).is_err() {
        eprintln!("Nutbook watcher cleanup failed for repaired library {library_id}");
    }

    // 4) 更新 root（DB 新路径）。失败：DB 未变，恢复旧路径 watcher 再返回，
    //    保证仍存在的 library 不会失去监听。
    if let Err(error) = state.update_library(repaired.clone()) {
        if current.source_kind != "agent_project" {
            match build_library_watcher(state.scan_coordinator().clone(), current.clone()) {
                Ok(watcher) => {
                    let _ = state.watch_library(library_id, watcher);
                }
                Err(rebuild_error) => {
                    eprintln!(
                        "Nutbook watcher restore failed for repaired library {library_id}: {rebuild_error}"
                    );
                }
            }
        }
        return Err(error);
    }

    // 5) 基于新路径重建 watcher（扫描之前完成，保证扫描失败后仍有 watcher）。
    let mut watcher_warning = None;
    if repaired.source_kind != "agent_project" {
        match build_library_watcher(state.scan_coordinator().clone(), repaired.clone()) {
            Ok(watcher) => {
                if state.watch_library(library_id, watcher).is_err() {
                    watcher_warning =
                        Some(format!("watcher rebuild failed for library {library_id}"));
                }
            }
            Err(error) => {
                watcher_warning = Some(format!(
                    "watcher rebuild failed for library {library_id}: {error}"
                ));
            }
        }
    }

    // 6) 扫描新 root（已持锁，用 without_locks 版本避免自死锁）。
    //    失败时 watcher 已就位，向上返回扫描错误；不留下无 watcher 状态。
    if let Err(error) = state.scan_coordinator().run_scan_without_locks(library_id) {
        if let Some(warning) = watcher_warning {
            eprintln!("Nutbook {warning}");
        }
        return Err(error);
    }

    state
        .list_libraries()?
        .into_iter()
        .find(|library| library.id == library_id)
        .ok_or(AppError::LibraryNotFound)
}

#[tauri::command]
pub fn repair_library_root(
    state: tauri::State<'_, AppState>,
    payload: RepairLibraryRootRequest,
) -> Result<Library, AppError> {
    repair_library_root_lifecycle(&state, payload.library_id, &payload.root_path)
}

/// PR A（计划 4.1/4.2）：文件夹接入预检 —— 零数据库写入，返回确认 UI 所需计数。
#[tauri::command]
pub fn preflight_folder_ingest_command(
    state: tauri::State<'_, AppState>,
    payload: FolderIngestRequest,
) -> Result<FolderPreflightSummary, AppError> {
    preflight_folder_ingest(&state.database, &payload.root_path)
}

/// Codex review R2：后台预检的启动/轮询/取消载荷（不再使用 Tauri 事件——
/// 运行面 `window.__TAURI__` 未注入时 `event.listen` 不可用，且「先启动预检、
/// 后订阅结果」存在竞态。全部改为 invoke 返回值 + 前端轮询 status 命令）。
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderPreflightStartRequest {
    pub root_path: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderPreflightStartResponse {
    pub op_id: u64,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderPreflightStatusRequest {
    pub op_id: u64,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderPreflightCancelRequest {
    pub op_id: u64,
}

/// Codex review P1-8 / R2-1：预检后台执行——命令立即返回 op_id；预检在
/// 独立线程运行，取消/进度共用注册表内同一 progress 实例（R2-2），结果经
/// `folder_preflight_status` 轮询获取，不依赖事件订阅时序。
#[tauri::command]
pub fn start_folder_preflight(
    state: tauri::State<'_, AppState>,
    payload: FolderPreflightStartRequest,
) -> Result<FolderPreflightStartResponse, AppError> {
    let root_path = payload.root_path.trim().to_string();
    if root_path.is_empty() {
        return Err(AppError::InvalidParams);
    }
    let op_id = start_background_preflight(state.database.clone(), root_path);
    Ok(FolderPreflightStartResponse { op_id })
}

/// R2-1：预检 op 状态轮询（running / done / failed + 实时候选计数）。
#[tauri::command]
pub fn folder_preflight_status(
    payload: FolderPreflightStatusRequest,
) -> Result<crate::core::folder_ingest::PreflightOpSnapshot, AppError> {
    preflight_op_snapshot(payload.op_id).ok_or(AppError::InvalidParams)
}

/// 取消后台预检（有界遍历在下一个检查点终止；progress 与预检内部同一实例，
/// 取消信号直达遍历）。
#[tauri::command]
pub fn cancel_folder_preflight(
    payload: FolderPreflightCancelRequest,
) -> Result<bool, AppError> {
    Ok(cancel_preflight_op(payload.op_id))
}

/// PR A（计划 4.1/4.3）+ Codex review R3：确认后执行文件夹接入。
///
/// R3 静态缺口修复：`ingest_folder_command` 原为同步命令——确认后的预检
/// 重跑、内容准备都跑在 UI 命令线程上，大目录会卡住整个命令通道，且无法
/// 在提交边界前取消。改为 op 模型：本命令立即返回 op_id，重活移交独立
/// 线程（AppHandle 取回 managed state），前端轮询 `folder_ingest_status`，
/// 取消经 `cancel_folder_ingest` 直达提交边界检查点。
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderIngestStartResponse {
    pub op_id: u64,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderIngestOpRequest {
    pub op_id: u64,
}

#[tauri::command]
pub fn start_folder_ingest(
    app: tauri::AppHandle,
    payload: FolderIngestRequest,
) -> Result<FolderIngestStartResponse, AppError> {
    let root_path = payload.root_path.trim().to_string();
    if root_path.is_empty() {
        return Err(AppError::InvalidParams);
    }
    let request = FolderIngestRequest {
        root_path,
        ..payload
    };
    let op_id = crate::core::folder_ingest::register_ingest_op();
    let handle = app.clone();
    std::thread::spawn(move || {
        let state = handle.state::<AppState>();
        let gate = crate::core::folder_ingest::ingest_op_gate(op_id);
        let result =
            crate::core::folder_ingest::ingest_folder_with_cancel(&state, &request, gate);
        crate::core::folder_ingest::finish_ingest_op(op_id, result);
    });
    Ok(FolderIngestStartResponse { op_id })
}

/// R3：接入 op 状态轮询（running / done / failed + 完整响应载荷）。
#[tauri::command]
pub fn folder_ingest_status(
    payload: FolderIngestOpRequest,
) -> Result<crate::core::folder_ingest::IngestOpSnapshot, AppError> {
    crate::core::folder_ingest::ingest_op_snapshot(payload.op_id).ok_or(AppError::InvalidParams)
}

/// R3：取消后台接入（提交边界前生效；事务已开始则走完，短事务保证原子）。
#[tauri::command]
pub fn cancel_folder_ingest(payload: FolderIngestOpRequest) -> Result<bool, AppError> {
    Ok(crate::core::folder_ingest::cancel_ingest_op(payload.op_id))
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
    if library.source_kind == "agent_project" {
        return Err(AppError::InvalidParams);
    }
    let watcher = build_library_watcher(state.scan_coordinator().clone(), library.clone())?;
    state.watch_library(payload.library_id, watcher)?;

    Ok(WatchLibraryResponse {
        library_id: payload.library_id,
        watching: true,
    })
}

/// 让所有有效 folder/file 资料库进入监听（幂等），并安排后台 catch-up scan。
#[tauri::command]
pub fn sync_library_watchers(
    state: tauri::State<'_, AppState>,
) -> Result<SyncLibraryWatchersResponse, AppError> {
    state.sync_library_watchers()
}

#[derive(Debug, Clone, Default)]
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
    } else if library.source_kind == "folder" {
        scan_library_files(library_id, &library.root_path, &started_at)?
    } else {
        return Err(AppError::InvalidParams);
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

    use notify::RecommendedWatcher;

    use crate::{
        commands::library::{repair_library_root_lifecycle, scan_library_once},
        core::scan_coordinator::ScanCoordinator,
        core::watcher::build_library_watcher,
        db::repositories::{ItemRepository, LibraryRepository},
        db::Database,
        models::Library,
        state::AppState,
    };

    fn unique_token() -> String {
        uuid::Uuid::new_v4().to_string()
    }

    fn temp_db_path() -> std::path::PathBuf {
        std::env::temp_dir().join(format!("nutbook-watch-{}.sqlite3", unique_token()))
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
                path_state: "valid".to_string(),
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
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "now".to_string(),
                updated_at: "now".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be created");

        scan_library_once(&database, 1).expect("initial scan should work");
        let watcher = build_library_watcher(
            ScanCoordinator::new(database.clone()),
            Library {
                id: 1,
                name: "Watched".to_string(),
                root_path: root.to_string_lossy().to_string(),
                source_kind: "folder".to_string(),
                path_state: "valid".to_string(),
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

    fn noop_watcher() -> RecommendedWatcher {
        notify::recommended_watcher(|_| {}).expect("watcher should initialize")
    }

    fn sample_library(id: i64, root_path: &str, source_kind: &str) -> Library {
        Library {
            id,
            name: format!("{source_kind}-{id}"),
            root_path: root_path.to_string(),
            source_kind: source_kind.to_string(),
            path_state: "valid".to_string(),
            is_active: true,
            created_at: "2026-07-30T00:00:00Z".to_string(),
            updated_at: "2026-07-30T00:00:00Z".to_string(),
            last_scanned_at: None,
            skill_binding: None,
        }
    }

    fn temp_root(name: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!("nutbook-{name}-{}", unique_token()))
    }

    fn assert_keyword_hit(database: &Database, keyword: &str, expected: usize) {
        let page = database
            .list_items(&crate::models::ListItemsQuery {
                keyword: Some(keyword.to_string()),
                ..crate::models::ListItemsQuery::default()
            })
            .expect("search should work");
        assert_eq!(
            page.total, expected as u64,
            "keyword {keyword:?} should match exactly {expected} items"
        );
    }

    #[test]
    fn sync_library_watchers_watches_all_valid_folder_sources_and_skips_agent_projects() {
        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());

        let root_a = temp_root("sync-a");
        let root_b = temp_root("sync-b");
        let root_agent = temp_root("sync-agent");
        fs::create_dir_all(&root_a).expect("root a");
        fs::create_dir_all(&root_b).expect("root b");
        fs::create_dir_all(&root_agent).expect("root agent");

        state
            .upsert_library(sample_library(1, root_a.to_str().expect("utf8"), "folder"))
            .expect("library a");
        state
            .upsert_library(sample_library(2, root_b.to_str().expect("utf8"), "folder"))
            .expect("library b");
        state
            .upsert_library(sample_library(3, root_agent.to_str().expect("utf8"), "agent_project"))
            .expect("library agent");

        let response = state
            .sync_library_watchers()
            .expect("sync should succeed");
        assert_eq!(response.started, 2, "two folder libraries should start watching");
        assert_eq!(response.already, 0);
        assert_eq!(response.stopped, 0);

        assert!(state.is_library_watched(1), "folder a must be watched");
        assert!(state.is_library_watched(2), "folder b must be watched");
        assert!(
            !state.is_library_watched(3),
            "agent_project must never start a file watcher"
        );

        // 幂等：再次 sync 不应重复启动。
        let second = state
            .sync_library_watchers()
            .expect("second sync should succeed");
        assert_eq!(second.started, 0);
        assert_eq!(second.already, 2);

        let _ = fs::remove_dir_all(root_a);
        let _ = fs::remove_dir_all(root_b);
        let _ = fs::remove_dir_all(root_agent);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn watcher_indexes_external_markdown_change_in_unactivated_second_library() {
        let root_a = temp_root("watcher-a");
        let root_b = temp_root("watcher-b");
        fs::create_dir_all(&root_a).expect("root a");
        fs::create_dir_all(&root_b).expect("root b");
        let file_b = root_b.join("note.md");
        fs::write(&file_b, "# 项目来源验收甲号 alpha").expect("write initial");

        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());
        state
            .upsert_library(sample_library(1, root_a.to_str().expect("utf8"), "folder"))
            .expect("library a");
        state
            .upsert_library(sample_library(2, root_b.to_str().expect("utf8"), "folder"))
            .expect("library b");

        state
            .sync_library_watchers()
            .expect("sync should start both watchers");
        assert!(state.is_library_watched(1));
        assert!(state.is_library_watched(2));

        // library 2 未被激活（没有 select_library），只在外部修改其 Markdown。
        thread::sleep(Duration::from_millis(300));
        fs::write(&file_b, "# 项目来源验收乙号 betas").expect("rewrite externally");
        // 等 watcher poll 周期 + 去抖 drain + 一次扫描。
        thread::sleep(Duration::from_millis(2500));

        assert_keyword_hit(&state.database, "项目来源验收乙号", 1);
        assert_keyword_hit(&state.database, "betas", 1);
        assert_keyword_hit(&state.database, "项目来源验收甲号", 0);

        let _ = fs::remove_dir_all(root_a);
        let _ = fs::remove_dir_all(root_b);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn catch_up_scan_indexes_file_changed_before_app_startup() {
        let root = temp_root("catchup");
        fs::create_dir_all(&root).expect("root");
        // 文件在"启动前"已被外部修改（高精度 mtime 已变化，正文为新词）。
        let file_path = root.join("note.md");
        fs::write(&file_path, "# 项目来源验收丙号 gamma").expect("write before startup");

        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());
        state
            .upsert_library(sample_library(1, root.to_str().expect("utf8"), "folder"))
            .expect("library");

        // 启动期 sync 会启动 watcher 并安排后台 catch-up scan。
        state
            .sync_library_watchers()
            .expect("sync should succeed");
        // 等 catch-up scan 线程完成（scan_library_once 为同步调用，线程内顺序执行）。
        thread::sleep(Duration::from_millis(1500));

        assert_keyword_hit(&state.database, "项目来源验收丙号", 1);
        assert_keyword_hit(&state.database, "gamma", 1);

        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn delete_library_releases_watcher() {
        let root = temp_root("delete");
        fs::create_dir_all(&root).expect("root");

        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());
        state
            .upsert_library(sample_library(1, root.to_str().expect("utf8"), "folder"))
            .expect("library");

        state
            .sync_library_watchers()
            .expect("sync should succeed");
        assert!(state.is_library_watched(1));

        state
            .delete_library(1)
            .expect("delete should succeed");
        assert!(
            !state.is_library_watched(1),
            "deleting a library must release its watcher"
        );

        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn repair_root_stops_old_watcher_and_watches_new_path() {
        let old_root = temp_root("repair-old");
        let new_root = temp_root("repair-new");
        fs::create_dir_all(&old_root).expect("old root");
        fs::create_dir_all(&new_root).expect("new root");

        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());
        state
            .upsert_library(sample_library(1, old_root.to_str().expect("utf8"), "folder"))
            .expect("library");

        state
            .sync_library_watchers()
            .expect("initial sync");
        assert!(state.is_library_watched(1));

        // 走真实生产入口 repair_library_root_lifecycle（command 与测试共用）。
        let repaired = repair_library_root_lifecycle(
            &state,
            1,
            new_root.to_str().expect("utf8"),
        )
        .expect("repair lifecycle should succeed");
        assert_eq!(repaired.root_path, new_root.to_string_lossy());
        assert!(state.is_library_watched(1), "new path watcher must be registered");
        assert!(
            !state.is_library_watched(99),
            "unrelated libraries must stay unwatched"
        );

        // 新路径下外部修改必须能触发扫描并进入 FTS。
        thread::sleep(Duration::from_millis(300));
        fs::write(new_root.join("note.md"), "# 项目来源验收丁号 delta").expect("write new root");
        thread::sleep(Duration::from_millis(2500));

        assert_keyword_hit(&state.database, "项目来源验收丁号", 1);
        assert_keyword_hit(&state.database, "delta", 1);

        let _ = fs::remove_dir_all(old_root);
        let _ = fs::remove_dir_all(new_root);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn delete_during_catch_up_succeeds_without_background_database_error() {
        let root_a = temp_root("del-catchup-a");
        let root_b = temp_root("del-catchup-b");
        fs::create_dir_all(&root_a).expect("root a");
        fs::create_dir_all(&root_b).expect("root b");

        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());
        state
            .upsert_library(sample_library(1, root_a.to_str().expect("utf8"), "folder"))
            .expect("library a");
        state
            .upsert_library(sample_library(2, root_b.to_str().expect("utf8"), "folder"))
            .expect("library b");

        state
            .sync_library_watchers()
            .expect("sync should schedule catch-up for both");
        // 立即删除其中一个：worker 可能正在扫描它。delete 与在跑 scan
        // 对同一 library 串行（per-library 锁），删除成功且随后 worker
        // 对已删除来源的扫描会因 library 不存在而跳过，不写库、无 DatabaseError。
        state
            .delete_library(1)
            .expect("delete during catch-up should succeed");
        assert!(!state.is_library_watched(1), "deleted library must be unwatched");

        // 等 worker 处理完 pending（含已删除的 library 1 与存活的 library 2）。
        thread::sleep(Duration::from_millis(1500));

        // 存活的 library 2 仍可正常索引（其 catch-up 未被删除串扰）。
        fs::write(root_b.join("note.md"), "# 项目来源验收戊号 echo").expect("write b");
        thread::sleep(Duration::from_millis(2500));
        assert_keyword_hit(&state.database, "项目来源验收戊号", 1);

        let _ = fs::remove_dir_all(root_a);
        let _ = fs::remove_dir_all(root_b);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn catch_up_running_then_add_second_source_eventually_indexes_both() {
        let root_a = temp_root("incr-a");
        let root_b = temp_root("incr-b");
        fs::create_dir_all(&root_a).expect("root a");
        fs::create_dir_all(&root_b).expect("root b");
        fs::write(root_a.join("a.md"), "# 来源甲 alpha").expect("write a");
        fs::write(root_b.join("b.md"), "# 来源乙 bravo").expect("write b");

        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());
        state
            .upsert_library(sample_library(1, root_a.to_str().expect("utf8"), "folder"))
            .expect("library a");

        // 第一次 sync：library 1 进入 catch-up pending，worker 开始 drain。
        state
            .sync_library_watchers()
            .expect("first sync");

        // worker 运行期间接入第二个来源：请求必须合并进 pending，不丢失。
        state
            .upsert_library(sample_library(2, root_b.to_str().expect("utf8"), "folder"))
            .expect("library b");
        state
            .sync_library_watchers()
            .expect("second sync while catch-up may still run");

        thread::sleep(Duration::from_millis(1500));

        assert_keyword_hit(&state.database, "来源甲", 1);
        assert_keyword_hit(&state.database, "来源乙", 1);
        assert!(state.is_library_watched(1));
        assert!(state.is_library_watched(2));

        let _ = fs::remove_dir_all(root_a);
        let _ = fs::remove_dir_all(root_b);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn repeated_sync_library_watchers_does_not_rescan_completed_sources() {
        let root_a = temp_root("norescan-a");
        let root_b = temp_root("norescan-b");
        fs::create_dir_all(&root_a).expect("root a");
        fs::create_dir_all(&root_b).expect("root b");
        fs::write(root_a.join("a.md"), "# 仅扫描一次 alpha").expect("write a");
        fs::write(root_b.join("b.md"), "# 仅扫描一次 bravo").expect("write b");

        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());
        state
            .upsert_library(sample_library(1, root_a.to_str().expect("utf8"), "folder"))
            .expect("library a");
        state
            .upsert_library(sample_library(2, root_b.to_str().expect("utf8"), "folder"))
            .expect("library b");

        state
            .sync_library_watchers()
            .expect("first sync");
        thread::sleep(Duration::from_millis(1500));
        assert_keyword_hit(&state.database, "仅扫描一次", 2);

        // 连续多次 sync：已完成（同一 root）的来源不得再次进入 pending。
        for _ in 0..3 {
            state
                .sync_library_watchers()
                .expect("repeat sync");
            thread::sleep(Duration::from_millis(300));
        }
        let coordinator = state.scan_coordinator();
        assert_eq!(
            coordinator.pending_count(),
            0,
            "completed sources must not be re-enqueued for catch-up"
        );

        // 内容仍可搜索，且没有因重复 sync 产生重复 items。
        assert_keyword_hit(&state.database, "仅扫描一次", 2);

        let _ = fs::remove_dir_all(root_a);
        let _ = fs::remove_dir_all(root_b);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn real_repair_old_root_no_longer_triggers_new_root_does() {
        let old_root = temp_root("repair-real-old");
        let new_root = temp_root("repair-real-new");
        fs::create_dir_all(&old_root).expect("old root");
        fs::create_dir_all(&new_root).expect("new root");
        fs::write(old_root.join("old.md"), "# 旧路径 zulu").expect("write old");

        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());
        state
            .upsert_library(sample_library(1, old_root.to_str().expect("utf8"), "folder"))
            .expect("library");

        state
            .sync_library_watchers()
            .expect("initial sync");
        thread::sleep(Duration::from_millis(1500));
        assert_keyword_hit(&state.database, "旧路径", 1);

        // 真实 repair：旧 watcher 停止、root 更新、新 watcher 建立在 new_root。
        let repaired = repair_library_root_lifecycle(
            &state,
            1,
            new_root.to_str().expect("utf8"),
        )
        .expect("repair should succeed");
        assert_eq!(repaired.root_path, new_root.to_string_lossy());
        assert!(state.is_library_watched(1));

        // 旧目录变化不再触发扫描。
        thread::sleep(Duration::from_millis(300));
        fs::write(old_root.join("old.md"), "# 旧路径 yankee").expect("rewrite old root");
        thread::sleep(Duration::from_millis(2500));
        assert_keyword_hit(&state.database, "yankee", 0);

        // 新目录变化可以触发扫描。
        fs::write(new_root.join("new.md"), "# 新路径 xray").expect("write new root");
        thread::sleep(Duration::from_millis(2500));
        assert_keyword_hit(&state.database, "新路径", 1);
        assert_keyword_hit(&state.database, "xray", 1);

        let _ = fs::remove_dir_all(old_root);
        let _ = fs::remove_dir_all(new_root);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn repeated_sync_same_root_generation_is_scanned_exactly_once() {
        let root = temp_root("gen-once");
        fs::create_dir_all(&root).expect("root");
        // 用多个文件让首次扫描有可观察耗时，制造「第一次尚未完成」窗口。
        for index in 0..25 {
            fs::write(root.join(format!("f{index}.md")), format!("# 词{index}")).expect("write");
        }

        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());
        state
            .upsert_library(sample_library(1, root.to_str().expect("utf8"), "folder"))
            .expect("library");

        // 第一次 sync 后立即连续 sync：同一 (library_id, root) generation
        // 已 pending/in-flight/done 时都不得重复入队，实际只扫描一次。
        state
            .sync_library_watchers()
            .expect("first sync");
        state
            .sync_library_watchers()
            .expect("second sync while first may still run");
        state
            .sync_library_watchers()
            .expect("third sync while first may still run");

        // 等 worker 完成（含扫描 + done 写入）。
        thread::sleep(Duration::from_millis(2000));

        assert_eq!(
            state.scan_coordinator().scan_count(),
            1,
            "same root generation must be scanned exactly once despite repeated sync"
        );
        assert_keyword_hit(&state.database, "词0", 1);
        assert_keyword_hit(&state.database, "词24", 1);

        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn repair_to_occupied_root_fails_keeping_watcher_and_original_root() {
        let root_a = temp_root("occ-a");
        let root_b = temp_root("occ-b");
        fs::create_dir_all(&root_a).expect("root a");
        fs::create_dir_all(&root_b).expect("root b");

        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());
        state
            .upsert_library(sample_library(1, root_a.to_str().expect("utf8"), "folder"))
            .expect("library 1");
        state
            .upsert_library(sample_library(2, root_b.to_str().expect("utf8"), "folder"))
            .expect("library 2");

        state
            .sync_library_watchers()
            .expect("initial sync");
        assert!(state.is_library_watched(1));

        // 把 library 1 repair 到已被 library 2 使用的 root：校验阶段必须失败，
        // 且 library 1 仍被监听、DB root 未变。
        let error = repair_library_root_lifecycle(
            &state,
            1,
            root_b.to_str().expect("utf8"),
        )
        .expect_err("repair to an occupied root must fail");
        assert!(
            matches!(error, crate::errors::AppError::LibraryPathOverlap),
            "unexpected error: {error:?}"
        );
        assert!(state.is_library_watched(1), "library 1 must keep its watcher after failed repair");
        let libraries = state.list_libraries().expect("libraries");
        assert_eq!(
            libraries.iter().find(|library| library.id == 1).expect("library 1").root_path,
            root_a.to_string_lossy(),
            "DB root must stay unchanged after failed repair"
        );

        // 旧路径仍可触发扫描（watcher 未失效）。
        fs::write(root_a.join("note.md"), "# 占用校验后仍可扫描 zulu").expect("write a");
        thread::sleep(Duration::from_millis(2500));
        assert_keyword_hit(&state.database, "占用校验后仍可扫描", 1);

        let _ = fs::remove_dir_all(root_a);
        let _ = fs::remove_dir_all(root_b);
        let _ = fs::remove_file(path);
    }
}
