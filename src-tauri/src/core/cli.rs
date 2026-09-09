use std::{env, fs, io::{self, BufRead, BufReader, Write}, net::TcpStream, path::{Path, PathBuf}, time::{Duration, SystemTime, UNIX_EPOCH}};

use serde::{Deserialize, Serialize};

use crate::{
    commands::{agent_projects::discover_and_store_candidates, library::scan_library_once},
    core::library::select_or_create_library,
    db::{repositories::{ItemRepository, LibraryRepository}, Database},
    models::ListItemsQuery,
    state::AppState,
};

pub const CLI_VERSION: &str = env!("CARGO_PKG_VERSION");

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliRequest {
    pub action: String,
    pub path: String,
    pub caller_agent: Option<String>,
    /// PR B：Windows 单实例热启动转交的打开请求路径批次。CLI 单路径协议
    /// 不受影响（serde default）；批次边界整体保留，不拆散。
    #[serde(default)]
    pub paths: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliResponse {
    pub status: String,
    pub path: String,
    pub library_id: Option<i64>,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliFailure {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliDoctorResponse { pub cli_version: String, pub overall: String, pub app_data_status: String, pub database_status: String, pub ipc_status: String, pub agents: Vec<crate::models::NbskillAgentStatus> }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliIpcEndpoint { pub port: u16, pub token: String, pub pid: u32, pub started_at: String }

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliIpcRequest { pub token: String, pub request: CliRequest }

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ProcessState { Alive, Dead, Unknown }

/// Publish the local IPC endpoint without ever following a pre-existing link.
/// Keeping the previous endpoint until the replacement is ready makes startup
/// reliable on Windows too, where rename cannot overwrite a destination.
pub fn publish_cli_ipc_endpoint(app_data: &Path, endpoint: &CliIpcEndpoint) -> io::Result<()> {
    let endpoint_path = app_data.join("cli-ipc.json");
    let nonce = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos();
    let temporary = app_data.join(format!(".cli-ipc.{}.{}", std::process::id(), nonce));
    let backup = app_data.join(".cli-ipc.previous");
    let write_result = (|| {
        let mut file = fs::OpenOptions::new().write(true).create_new(true).open(&temporary)?;
        file.write_all(&serde_json::to_vec(endpoint).map_err(io::Error::other)?)?;
        file.sync_all()?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&temporary, fs::Permissions::from_mode(0o600))?;
        }
        if let Ok(metadata) = fs::symlink_metadata(&endpoint_path) {
            if metadata.file_type().is_symlink() || !metadata.is_file() {
                return Err(io::Error::other("refusing to replace a non-regular IPC endpoint"));
            }
            validate_private_file_metadata(&metadata, "IPC endpoint")?;
            if let Ok(existing) = fs::read(&endpoint_path)
                .and_then(|bytes| serde_json::from_slice::<CliIpcEndpoint>(&bytes).map_err(io::Error::other))
            {
                match process_state(existing.pid) {
                    ProcessState::Alive if existing.pid != std::process::id() => {
                        return Err(io::Error::new(io::ErrorKind::AlreadyExists, "another live Nutbook IPC owner already exists"));
                    }
                    ProcessState::Unknown => {
                        return Err(io::Error::other("existing Nutbook IPC owner cannot be verified"));
                    }
                    _ => {}
                }
            }
            if let Ok(backup_metadata) = fs::symlink_metadata(&backup) {
                if backup_metadata.file_type().is_symlink() || !backup_metadata.is_file() {
                    return Err(io::Error::other("refusing to replace a non-regular IPC endpoint backup"));
                }
                validate_private_file_metadata(&backup_metadata, "IPC endpoint backup")?;
                fs::remove_file(&backup)?;
            }
            fs::rename(&endpoint_path, &backup)?;
        }
        if let Err(error) = fs::rename(&temporary, &endpoint_path) {
            if backup.exists() { let _ = fs::rename(&backup, &endpoint_path); }
            return Err(error);
        }
        if backup.exists() { fs::remove_file(&backup)?; }
        Ok(())
    })();
    if write_result.is_err() { let _ = fs::remove_file(&temporary); }
    write_result
}

pub struct OfflineLock(PathBuf);
impl Drop for OfflineLock { fn drop(&mut self) { let _ = fs::remove_file(&self.0); } }

pub fn acquire_offline_lock(app_data: &Path) -> Result<OfflineLock, CliFailure> {
    let path = app_data.join("cli-offline.lock");
    if let Ok(text) = fs::read_to_string(&path) {
        if text.trim().parse::<u32>().ok().is_some_and(|pid| process_state(pid) == ProcessState::Dead) {
            let _ = fs::remove_file(&path);
        }
    }
    match fs::OpenOptions::new().write(true).create_new(true).open(&path) {
        Ok(mut file) => { let _ = file.write_all(format!("{}\n", std::process::id()).as_bytes()); Ok(OfflineLock(path)) }
        Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => Err(failure("database_busy", "another Nutbook CLI operation is in progress")),
        Err(_) => Err(failure("lock_unavailable", "Nutbook CLI cannot acquire its operation lock")),
    }
}

pub fn default_app_data_dir() -> Result<PathBuf, CliFailure> {
    if let Some(path) = env::var_os("NUTBOOK_APP_DATA_DIR") {
        return Ok(PathBuf::from(path));
    }
    #[cfg(target_os = "macos")]
    {
        return home_dir().map(|home| home.join("Library/Application Support/com.hayley.nutbook"));
    }
    #[cfg(target_os = "windows")]
    {
        return env::var_os("LOCALAPPDATA")
            .map(PathBuf::from)
            .map(|base| base.join("com.hayley.nutbook"))
            .ok_or_else(|| failure("app_data_unavailable", "LOCALAPPDATA is unavailable"));
    }
    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    {
        home_dir().map(|home| home.join(".local/share/com.hayley.nutbook"))
    }
}

/// Deploy the bundled CLI by copying it into the stable application data directory.
/// The app intentionally never mutates PATH or creates a symlink.
pub fn deploy_bundled_cli(app_data: &Path, resource_dir: Option<&Path>) -> Result<PathBuf, String> {
    let candidates = [
        resource_dir.map(|directory| directory.join("nutbook-cli").join(cli_binary_name())),
        std::env::current_exe().ok().and_then(|path| path.parent().map(|parent| parent.join(cli_binary_name()))),
    ];
    let source = candidates.into_iter().flatten().find(|candidate| {
        fs::symlink_metadata(candidate).is_ok_and(|metadata| metadata.is_file() && !metadata.file_type().is_symlink())
            && candidate != &std::env::current_exe().unwrap_or_default()
    }).ok_or_else(|| "bundled nutbook CLI is unavailable".to_string())?;
    let destination_dir = app_data.join("cli");
    fs::create_dir_all(&destination_dir).map_err(|_| "cannot create CLI directory".to_string())?;
    let destination = destination_dir.join(cli_binary_name());
    let temporary = destination_dir.join(format!(".{}.{}", cli_binary_name(), std::process::id()));
    fs::copy(&source, &temporary).map_err(|_| "cannot copy bundled CLI".to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&temporary, fs::Permissions::from_mode(0o755)).map_err(|_| "cannot mark CLI executable".to_string())?;
    }
    let version = std::process::Command::new(&temporary).arg("--version").output().map_err(|_| "cannot verify copied CLI".to_string())?;
    if !version.status.success() || !String::from_utf8_lossy(&version.stdout).contains(CLI_VERSION) {
        let _ = fs::remove_file(&temporary);
        return Err("copied CLI version verification failed".to_string());
    }
    let backup = destination_dir.join(format!(".{}.previous", cli_binary_name()));
    if destination.exists() {
        let metadata = fs::symlink_metadata(&destination).map_err(|_| "cannot inspect existing CLI".to_string())?;
        if metadata.file_type().is_symlink() || !metadata.is_file() { let _ = fs::remove_file(&temporary); return Err("existing CLI is not a regular Nutbook-owned file".to_string()); }
        let old_version = std::process::Command::new(&destination).arg("--version").output().ok()
            .filter(|output| output.status.success())
            .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string());
        let Some(old_version) = old_version.and_then(|version| version.strip_prefix("nutbook ").and_then(compare_cli_semver)) else {
            let _ = fs::remove_file(&temporary);
            return Err("existing CLI is not a verifiable Nutbook-owned file".to_string());
        };
        let bundled_version = compare_cli_semver(CLI_VERSION).ok_or_else(|| "bundled CLI version is invalid".to_string())?;
        if old_version > bundled_version {
            let _ = fs::remove_file(&temporary);
            return Ok(destination);
        }
        if backup.exists() { let _ = fs::remove_file(&backup); }
        fs::rename(&destination, &backup).map_err(|_| "cannot prepare CLI upgrade".to_string())?;
    }
    if let Err(error) = fs::rename(&temporary, &destination) {
        if backup.exists() { let _ = fs::rename(&backup, &destination); }
        let _ = fs::remove_file(&temporary);
        return Err(format!("cannot publish copied CLI: {error}"));
    }
    if backup.exists() { fs::remove_file(&backup).map_err(|_| "cannot finalize CLI upgrade".to_string())?; }
    Ok(destination)
}

pub fn resolve_cli_path(value: &str) -> Result<PathBuf, CliFailure> {
    let value = value.trim();
    if value.is_empty() { return Err(failure("invalid_path", "path is empty")); }
    let raw = if value == "~" { home_dir()? } else if let Some(rest) = value.strip_prefix("~/") {
        home_dir()?.join(rest)
    } else { PathBuf::from(value) };
    let absolute = if raw.is_absolute() { raw } else { env::current_dir().map_err(|_| failure("cwd_unavailable", "current directory is unavailable"))?.join(raw) };
    reject_symlink_components(&absolute)?;
    let canonical = fs::canonicalize(&absolute).map_err(|_| failure("path_not_found", "path does not exist"))?;
    reject_protected_root(&canonical)?;
    Ok(canonical)
}

pub fn execute(database: &Database, request: &CliRequest) -> Result<CliResponse, CliFailure> {
    let path = resolve_cli_path(&request.path)?;
    match request.action.as_str() {
        "add" => add(database, &path),
        "remove" => remove(database, &path),
        "add-project" => add_project(database, &path, request.caller_agent.as_deref()),
        "remove-project" => remove_project(database, &path),
        _ => Err(failure("invalid_command", "unsupported command")),
    }
}

/// App-only coordinator: the database mutation remains shared with offline CLI,
/// while watcher ownership stays in AppState and cannot be duplicated by IPC.
///
/// 应用运行期间的 CLI 必须与 GUI 走同一 ScanCoordinator 生命周期：
/// - remove（来源删除）经过 AppState::delete_library（per-library + 全局写锁、
///   unwatch、cancel catch-up），不直接 database.delete_library；
/// - add 触发的 scan 经 ScanCoordinator::run_scan（全局写协调），与
///   watcher/catch-up 的写库互斥。
/// 离线 CLI（无 AppState）仍走 execute() 原数据库路径（应用不运行且有离线锁）。
pub fn execute_with_app_state(state: &AppState, request: &CliRequest) -> Result<CliResponse, CliFailure> {
    let before = state.database.list_libraries().map_err(database_failure)?;
    let mut result = match request.action.as_str() {
        // remove 走 GUI 相同的生命周期：来源删除必须经 delete_library。
        "remove" => remove_with_app_state(state, request),
        // add / add-project / remove-project：其内部 scan / discovery 写库
        // 必须与 watcher / catch-up 的全局写协调一致（同一把全局 DB 写锁）。
        _ => {
            let db_write_lock = state.scan_coordinator().db_write_lock();
            let _db = db_write_lock
                .lock()
                .map_err(|_| failure("operation_failed", "Nutbook could not acquire its database lock"))?;
            execute(&state.database, request)
        }
    }?;
    let after = state.database.list_libraries().map_err(database_failure)?;
    let mut watcher_warnings = Vec::new();
    for library in after.iter().filter(|library| library.source_kind != "agent_project" && !before.iter().any(|old| old.id == library.id)) {
        match crate::core::watcher::build_library_watcher(state.scan_coordinator().clone(), library.clone()) {
            Ok(watcher) => {
                if state.watch_library(library.id, watcher).is_err() {
                    watcher_warnings.push(format!("watcher unavailable for library {}", library.id));
                }
            }
            Err(_) => watcher_warnings.push(format!("watcher unavailable for library {}", library.id)),
        }
    }
    for library in before.iter().filter(|library| !after.iter().any(|current| current.id == library.id)) {
        if state.unwatch_library(library.id).is_err() {
            watcher_warnings.push(format!("watcher cleanup unavailable for library {}", library.id));
        }
    }
    if !watcher_warnings.is_empty() {
        let warning = watcher_warnings.join("; ");
        result.detail = Some(match result.detail.take() {
            Some(detail) => format!("{detail}; {warning}"),
            None => warning,
        });
    }
    Ok(result)
}

/// 应用运行期间的 remove：来源删除经 AppState::delete_library（与 GUI 相同
/// 的 ScanCoordinator 生命周期），文件移除走原离线逻辑。
fn remove_with_app_state(state: &AppState, request: &CliRequest) -> Result<CliResponse, CliFailure> {
    let path = resolve_cli_path(&request.path)?;
    let canonical = printable(&path);
    let libraries = state.database.list_libraries().map_err(database_failure)?;
    if let Some(library) = libraries.iter().find(|library| library.source_kind != "agent_project" && library.root_path == canonical) {
        state.delete_library(library.id).map_err(database_failure)?;
        return Ok(response("removed", &path, Some(library.id), Some("source removed; files were kept".to_string())));
    }
    remove(&state.database, &path)
}

pub fn execute_via_ipc(app_data: &Path, request: &CliRequest) -> Result<Option<CliResponse>, CliFailure> {
    let endpoint_path = app_data.join("cli-ipc.json");
    let Some(endpoint) = read_cli_ipc_endpoint(&endpoint_path)? else { return Ok(None); };
    match process_state(endpoint.pid) {
        ProcessState::Dead => {
            let _ = fs::remove_file(&endpoint_path);
            return Ok(None);
        }
        ProcessState::Unknown => return Err(failure("app_ipc_unavailable", "Nutbook IPC owner cannot be verified")),
        ProcessState::Alive => {}
    }
    let mut stream = TcpStream::connect_timeout(&format!("127.0.0.1:{}", endpoint.port).parse().map_err(|_| failure("app_ipc_unavailable", "Nutbook app IPC endpoint is invalid"))?, Duration::from_secs(2))
        .map_err(|_| failure("app_ipc_unavailable", "Nutbook is running but its local IPC is unavailable"))?;
    stream.set_read_timeout(Some(Duration::from_secs(5))).map_err(|_| failure("app_ipc_unavailable", "Nutbook app IPC cannot be read"))?;
    let wire = CliIpcRequest { token: endpoint.token, request: request.clone() };
    stream.write_all(serde_json::to_string(&wire).map_err(|_| failure("app_ipc_unavailable", "Nutbook app IPC request cannot be encoded"))?.as_bytes()).map_err(|_| failure("app_ipc_unavailable", "Nutbook app IPC cannot be written"))?;
    stream.write_all(b"\n").map_err(|_| failure("app_ipc_unavailable", "Nutbook app IPC cannot be written"))?;
    let mut response = String::new();
    BufReader::new(stream).read_line(&mut response).map_err(|_| failure("app_ipc_unavailable", "Nutbook app IPC returned no response"))?;
    serde_json::from_str::<Result<CliResponse, CliFailure>>(&response).map_err(|_| failure("app_ipc_unavailable", "Nutbook app IPC returned an invalid response"))?
        .map(Some)
}

pub fn remove_cli_ipc_endpoint_for_pid(app_data: &Path, pid: u32) {
    let path = app_data.join("cli-ipc.json");
    if read_cli_ipc_endpoint(&path).ok().flatten().is_some_and(|endpoint| endpoint.pid == pid) {
        let _ = fs::remove_file(path);
    }
}

/// PR B（计划 5.1）：Windows 单实例热启动 —— 第二实例经本地 IPC 把整个
/// 打开请求（保持批次边界）转交现有进程。转交成功后第二实例同步退出，
/// 不创建主窗口、不进入 ExitRequested/退出确认链路。
pub fn forward_external_open_via_ipc(
    app_data: &Path,
    paths: &[String],
) -> Result<Option<CliResponse>, CliFailure> {
    let request = CliRequest {
        action: "external-open".to_string(),
        path: paths.first().cloned().unwrap_or_default(),
        caller_agent: None,
        paths: Some(paths.to_vec()),
    };
    execute_via_ipc(app_data, &request)
}

pub fn doctor(app_data: &Path) -> CliDoctorResponse {
    let database_path = app_data.join("nutbook.sqlite3");
    let database_status = if database_path.is_file() && rusqlite::Connection::open_with_flags(&database_path, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY).and_then(|connection| connection.query_row("SELECT 1", [], |_| Ok(1_i64))).is_ok() { "accessible" } else { "unavailable" };
    let ipc_status = match read_cli_ipc_endpoint(&app_data.join("cli-ipc.json")) {
        Ok(None) => "stopped",
        Err(_) => "unavailable",
        Ok(Some(endpoint)) if process_state(endpoint.pid) == ProcessState::Dead => "stale",
        Ok(Some(endpoint)) if process_state(endpoint.pid) == ProcessState::Unknown => "unavailable",
        Ok(Some(endpoint)) if format!("127.0.0.1:{}", endpoint.port).parse().ok().is_some_and(|address| TcpStream::connect_timeout(&address, Duration::from_millis(250)).is_ok()) => "running",
        Ok(Some(_)) => "unavailable",
    }.to_string();
    let home = home_dir().unwrap_or_default();
    let agents = crate::core::nbskill_package::detect_nbskill_agents(&home, app_data);
    let overall = doctor_overall(app_data.is_dir(), database_status, &ipc_status, &agents);
    CliDoctorResponse { cli_version: CLI_VERSION.to_string(), overall: overall.to_string(), app_data_status: if app_data.is_dir() { "accessible" } else { "missing" }.to_string(), database_status: database_status.to_string(), ipc_status, agents }
}

pub fn doctor_overall(app_data_ok: bool, database_status: &str, ipc_status: &str, agents: &[crate::models::NbskillAgentStatus]) -> &'static str {
    if !app_data_ok || database_status != "accessible" || ipc_status == "unavailable" { return "error"; }
    if ipc_status == "stale" || agents.iter().any(|agent| agent.agent_detected && !(agent.package_status == "compatible" && agent.runtime_status == "verified" && agent.cli_status == "compatible")) { "warning" } else { "healthy" }
}

fn add(database: &Database, path: &Path) -> Result<CliResponse, CliFailure> {
    ensure_supported_path(path)?;
    let canonical = printable(path);
    if let Some(ignored) = database.list_ignored_items().map_err(database_failure)?.into_iter().find(|item| item.file_path == canonical) {
        database.restore_ignored_item(ignored.item_id).map_err(database_failure)?;
        return Ok(response("restored", path, Some(ignored.library_id), None));
    }
    if active_item_for_path(database, &canonical)?.is_some() {
        return Ok(response("already_connected", path, None, None));
    }
    let libraries = database.list_libraries().map_err(database_failure)?;
    if path.is_file() {
        if let Some(folder) = libraries.iter().find(|library| library.source_kind == "folder" && path.starts_with(&library.root_path)) {
            let _ = scan_library_once(database, folder.id).map_err(database_failure)?;
            return Ok(response("added", path, Some(folder.id), Some("indexed by existing folder source".to_string())));
        }
    }
    let source_kind = if path.is_dir() { "folder" } else { "file" };
    let library = select_or_create_library(&libraries, &canonical, None, source_kind, database.next_library_id().map_err(database_failure)?, &now())
        .map_err(database_failure)?;
    let existed = libraries.iter().any(|existing| existing.id == library.id);
    if !existed { database.upsert_library(library.clone()).map_err(database_failure)?; }
    let _ = scan_library_once(database, library.id).map_err(database_failure)?;
    Ok(response(if existed { "already_connected" } else { "added" }, path, Some(library.id), None))
}

fn remove(database: &Database, path: &Path) -> Result<CliResponse, CliFailure> {
    let canonical = printable(path);
    let libraries = database.list_libraries().map_err(database_failure)?;
    if let Some(library) = libraries.iter().find(|library| library.source_kind != "agent_project" && library.root_path == canonical) {
        database.delete_library(library.id).map_err(database_failure)?;
        return Ok(response("removed", path, Some(library.id), Some("source removed; files were kept".to_string())));
    }
    if let Some(item) = active_item_for_path(database, &canonical)? {
        database.remove_item_from_nutbook(item.id, &now()).map_err(database_failure)?;
        return Ok(response("removed", path, Some(item.library_id), Some("file was removed from Nutbook only".to_string())));
    }
    if database.list_ignored_items().map_err(database_failure)?.iter().any(|item| item.file_path == canonical) {
        return Ok(response("removed", path, None, Some("already removed from Nutbook".to_string())));
    }
    Err(failure("not_connected", "path is not connected to Nutbook"))
}

fn add_project(database: &Database, path: &Path, caller_agent: Option<&str>) -> Result<CliResponse, CliFailure> {
    if !path.is_dir() { return Err(failure("project_requires_directory", "add-project requires an existing directory")); }
    let canonical = printable(path);
    let agent = caller_agent.filter(|value| !value.trim().is_empty()).unwrap_or("nutbook-cli");
    let existed = database.list_libraries().map_err(database_failure)?.iter()
        .any(|library| library.source_kind == "agent_project" && library.root_path == canonical);
    let source = database.connect_agent_project_source(
        agent,
        Some("nutbook-cli-v1"),
        &format!("{agent}:{}", canonical),
        "project",
        "scope-only",
        &canonical,
        None,
        &now(),
    ).map_err(database_failure)?;
    let observed = discover_and_store_candidates(database, &source).map_err(database_failure)?;
    Ok(response(if existed { "already_connected" } else { "project_connected" }, path, Some(source.library_id), Some(observed.status)))
}

fn remove_project(database: &Database, path: &Path) -> Result<CliResponse, CliFailure> {
    if !path.is_dir() { return Err(failure("project_requires_directory", "remove-project requires an existing directory")); }
    let canonical = printable(path);
    let library = database.list_libraries().map_err(database_failure)?.into_iter()
        .find(|library| library.source_kind == "agent_project" && library.root_path == canonical)
        .ok_or_else(|| failure("project_not_connected", "project is not connected to Nutbook"))?;
    database.delete_library(library.id).map_err(database_failure)?;
    Ok(response("removed", path, Some(library.id), Some("project source and bindings removed; files were kept".to_string())))
}

fn active_item_for_path(database: &Database, path: &str) -> Result<Option<crate::models::ItemSummary>, CliFailure> {
    let mut page = 1;
    loop {
        let result = database.list_items(&ListItemsQuery { include_deleted: Some(false), page: Some(page), page_size: Some(500), ..Default::default() }).map_err(database_failure)?;
        if let Some(item) = result.items.into_iter().find(|item| item.file_path == path) { return Ok(Some(item)); }
        if !result.has_more { return Ok(None); }
        page += 1;
    }
}

fn ensure_supported_path(path: &Path) -> Result<(), CliFailure> {
    if path.is_dir() { return Ok(()); }
    if path.is_file() && path.extension().and_then(|value| value.to_str()).is_some_and(|ext| matches!(ext.to_ascii_lowercase().as_str(), "md" | "markdown" | "html" | "htm")) { return Ok(()); }
    Err(failure("unsupported_path", "only existing Markdown and HTML files are supported"))
}

fn reject_protected_root(path: &Path) -> Result<(), CliFailure> {
    if path.parent().is_none() || home_dir().ok().as_deref() == Some(path) {
        return Err(failure("protected_root", "system and home directory roots cannot be connected"));
    }
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn home_dir() -> Result<PathBuf, CliFailure> { env::var_os("HOME").map(PathBuf::from).ok_or_else(|| failure("home_unavailable", "home directory is unavailable")) }
#[cfg(target_os = "windows")]
fn home_dir() -> Result<PathBuf, CliFailure> {
    env::var_os("USERPROFILE").map(PathBuf::from)
        .or_else(|| match (env::var_os("HOMEDRIVE"), env::var_os("HOMEPATH")) { (Some(drive), Some(path)) => Some(PathBuf::from(drive).join(path)), _ => None })
        .ok_or_else(|| failure("home_unavailable", "USERPROFILE is unavailable"))
}
fn reject_symlink_components(path: &Path) -> Result<(), CliFailure> {
    let mut current = PathBuf::new();
    for component in path.components() {
        current.push(component.as_os_str());
        if matches!(component, std::path::Component::Prefix(_) | std::path::Component::RootDir) || current.as_os_str().is_empty() { continue; }
        if fs::symlink_metadata(&current).map_err(|_| failure("path_not_found", "path does not exist"))?.file_type().is_symlink() {
            return Err(failure("symlink_not_allowed", "symbolic-link paths are not supported"));
        }
    }
    Ok(())
}

fn read_cli_ipc_endpoint(path: &Path) -> Result<Option<CliIpcEndpoint>, CliFailure> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err(failure("app_ipc_unavailable", "Nutbook app IPC endpoint is unreadable")),
    };
    if metadata.file_type().is_symlink() || !metadata.is_file() {
        return Err(failure("app_ipc_unavailable", "Nutbook app IPC endpoint is not a private regular file"));
    }
    validate_private_file_metadata(&metadata, "IPC endpoint")
        .map_err(|_| failure("app_ipc_unavailable", "Nutbook app IPC endpoint ownership or permissions are unsafe"))?;
    let bytes = fs::read(path).map_err(|_| failure("app_ipc_unavailable", "Nutbook app IPC endpoint is unreadable"))?;
    serde_json::from_slice(&bytes)
        .map(Some)
        .map_err(|_| failure("app_ipc_unavailable", "Nutbook app IPC endpoint is invalid"))
}

fn validate_private_file_metadata(metadata: &fs::Metadata, label: &str) -> io::Result<()> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::{MetadataExt, PermissionsExt};
        if metadata.uid() != unsafe { libc::geteuid() } || metadata.permissions().mode() & 0o077 != 0 {
            return Err(io::Error::other(format!("{label} has unsafe ownership or permissions")));
        }
    }
    #[cfg(not(unix))]
    let _ = (metadata, label);
    Ok(())
}
#[cfg(unix)]
fn process_state(pid: u32) -> ProcessState {
    if unsafe { libc::kill(pid as i32, 0) } == 0 { return ProcessState::Alive; }
    if std::io::Error::last_os_error().raw_os_error() == Some(libc::ESRCH) { ProcessState::Dead } else { ProcessState::Unknown }
}

#[cfg(any(target_os = "windows", test))]
fn windows_process_state_from_api(exit_code: Option<u32>, open_error: Option<u32>) -> ProcessState {
    match exit_code {
        Some(259) => ProcessState::Alive, // STILL_ACTIVE
        Some(_) => ProcessState::Dead,
        None if open_error == Some(87) => ProcessState::Dead, // ERROR_INVALID_PARAMETER: PID does not exist
        None => ProcessState::Unknown,
    }
}

#[cfg(target_os = "windows")]
fn process_state(pid: u32) -> ProcessState {
    use windows_sys::Win32::{Foundation::{CloseHandle, GetLastError}, System::Threading::{GetExitCodeProcess, OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION}};
    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if handle.is_null() { return windows_process_state_from_api(None, Some(GetLastError())); }
        let mut exit_code = 0_u32;
        let result = if GetExitCodeProcess(handle, &mut exit_code) != 0 { windows_process_state_from_api(Some(exit_code), None) } else { ProcessState::Unknown };
        let _ = CloseHandle(handle);
        result
    }
}

#[cfg(all(not(unix), not(target_os = "windows")))]
fn process_state(_: u32) -> ProcessState { ProcessState::Unknown }
fn cli_binary_name() -> &'static str { if cfg!(target_os = "windows") { "nutbook.exe" } else { "nutbook" } }
pub(crate) fn compare_cli_semver(value: &str) -> Option<[u64; 3]> {
    let values = value.split('.').map(str::parse::<u64>).collect::<Result<Vec<_>, _>>().ok()?;
    (values.len() == 3).then(|| [values[0], values[1], values[2]])
}
fn printable(path: &Path) -> String { path.to_string_lossy().into_owned() }
fn now() -> String { SystemTime::now().duration_since(UNIX_EPOCH).map(|duration| duration.as_secs().to_string()).unwrap_or_else(|_| "0".to_string()) }
fn response(status: &str, path: &Path, library_id: Option<i64>, detail: Option<String>) -> CliResponse { CliResponse { status: status.to_string(), path: printable(path), library_id, detail } }
fn failure(code: &str, message: &str) -> CliFailure { CliFailure { code: code.to_string(), message: message.to_string() } }
fn database_failure(_: crate::errors::AppError) -> CliFailure { failure("operation_failed", "Nutbook could not complete the operation") }

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::{Builder, TempDir};

    fn tempdir() -> std::io::Result<TempDir> {
        let canonical_temp = fs::canonicalize(env::temp_dir())?;
        Builder::new()
            .prefix("nutbook-cli-")
            .tempdir_in(canonical_temp)
    }

    #[test]
    fn add_remove_and_restore_real_markdown() {
        let root = tempdir().expect("temp root");
        let document = root.path().join("acceptance.md");
        fs::write(&document, "# Acceptance").expect("document");
        let database = Database::new(root.path().join("nutbook.sqlite3")).expect("database");
        let folder_request = CliRequest { action: "add".to_string(), path: root.path().to_string_lossy().into_owned(), caller_agent: None, paths: None };
        assert_eq!(execute(&database, &folder_request).expect("add folder").status, "added");
        let request = CliRequest { action: "add".to_string(), path: document.to_string_lossy().into_owned(), caller_agent: None, paths: None };
        assert_eq!(execute(&database, &request).expect("existing item").status, "already_connected");
        assert_eq!(execute(&database, &CliRequest { action: "remove".to_string(), ..request.clone() }).expect("remove").status, "removed");
        assert_eq!(execute(&database, &request).expect("restore").status, "restored");
    }

    #[test]
    fn project_manifest_auto_imports_active_entry_and_remove_keeps_disk() {
        let root = tempdir().expect("temp root");
        fs::create_dir_all(root.path().join(".agent-outputs")).expect("manifest directory");
        fs::write(root.path().join("registered.md"), "# Registered").expect("registered artifact");
        fs::write(root.path().join("candidate.html"), "<h1>Candidate</h1>").expect("candidate artifact");
        fs::write(root.path().join(".agent-outputs/manifest.json"), r#"{"schemaVersion":1,"projectRoot":".","entries":[{"id":"registered","path":"registered.md","state":"active","skill":{"name":"report-writer"},"kind":"report"}]}"#).expect("manifest");
        let database = Database::new(root.path().join("nutbook.sqlite3")).expect("database");
        let request = CliRequest { action: "add-project".to_string(), path: root.path().to_string_lossy().into_owned(), caller_agent: None, paths: None };
        let connected = execute(&database, &request).expect("connect project");
        assert_eq!(connected.status, "project_connected");
        let items = database.list_items(&ListItemsQuery { page_size: Some(20), ..Default::default() }).expect("items");
        assert!(items.items.iter().any(|item| item.file_name == "registered.md"));
        assert!(!items.items.iter().any(|item| item.file_name == "candidate.html"));
        assert_eq!(execute(&database, &request).expect("idempotent project").status, "already_connected");
        assert_eq!(execute(&database, &CliRequest { action: "remove-project".to_string(), ..request }).expect("remove project").status, "removed");
        assert!(root.path().join("registered.md").exists());
        assert!(root.path().join(".agent-outputs/manifest.json").exists());
    }

    #[test]
    fn app_coordinator_starts_and_stops_folder_watcher_idempotently() {
        let root = tempdir().expect("temp root");
        let source = root.path().join("source");
        fs::create_dir_all(&source).expect("source");
        fs::write(source.join("note.md"), "# note").expect("note");
        let state = AppState::new(Database::new(root.path().join("state.sqlite3")).expect("database"), root.path().to_path_buf());
        let add = CliRequest { action: "add".to_string(), path: source.to_string_lossy().into_owned(), caller_agent: None, paths: None };
        let response = execute_with_app_state(&state, &add).expect("add");
        let library_id = response.library_id.expect("library id");
        assert!(state.is_library_watched(library_id));
        assert_eq!(execute_with_app_state(&state, &add).expect("repeat add").status, "already_connected");
        assert!(state.is_library_watched(library_id));
        assert_eq!(execute_with_app_state(&state, &CliRequest { action: "remove".to_string(), ..add }).expect("remove").status, "removed");
        assert!(!state.is_library_watched(library_id));
    }

    #[test]
    fn cli_remove_during_catch_up_releases_watcher_without_background_database_error() {
        let root = tempdir().expect("temp root");
        let source = root.path().join("source");
        let other = root.path().join("other");
        fs::create_dir_all(&source).expect("source");
        fs::create_dir_all(&other).expect("other");
        // 两个来源都入队 catch-up，制造 worker 运行期间删除的窗口。
        fs::write(source.join("a.md"), "# CLI catchup 甲号 alpha").expect("write a");
        fs::write(other.join("b.md"), "# CLI catchup 乙号 beta").expect("write b");

        let state = AppState::new(
            Database::new(root.path().join("state.sqlite3")).expect("database"),
            root.path().to_path_buf(),
        );
        let add_a = CliRequest { action: "add".to_string(), path: source.to_string_lossy().into_owned(), caller_agent: None, paths: None };
        let add_b = CliRequest { action: "add".to_string(), path: other.to_string_lossy().into_owned(), caller_agent: None, paths: None };
        let id_a = execute_with_app_state(&state, &add_a).expect("add a").library_id.expect("id a");
        let id_b = execute_with_app_state(&state, &add_b).expect("add b").library_id.expect("id b");

        // 应用运行期间的 CLI remove 必须走与 GUI delete 相同的生命周期：
        // watcher 释放、无后台 DatabaseError（delete 与在跑 scan 串行）。
        let remove_a = CliRequest { action: "remove".to_string(), path: source.to_string_lossy().into_owned(), caller_agent: None, paths: None };
        let response = execute_with_app_state(&state, &remove_a).expect("CLI remove during catch-up");
        assert_eq!(response.status, "removed");
        assert!(
            !state.is_library_watched(id_a),
            "CLI remove must release the watcher like GUI delete"
        );
        assert!(state.is_library_watched(id_b), "other library keeps watching");

        // 存活来源仍可索引。
        std::thread::sleep(std::time::Duration::from_millis(1500));
        fs::write(other.join("b.md"), "# CLI catchup 乙号 beta2").expect("rewrite b");
        std::thread::sleep(std::time::Duration::from_millis(2500));

        let libraries = state.database.list_libraries().expect("libraries");
        assert!(!libraries.iter().any(|library| library.id == id_a));
        let _ = state.database.list_items(&ListItemsQuery { page_size: Some(20), ..Default::default() }).expect("items query ok");
    }

    #[cfg(unix)]
    #[test]
    fn deploy_uses_exact_bundled_resource_and_publishes_atomically() {
        use std::os::unix::fs::PermissionsExt;
        let root = tempdir().expect("temp root");
        let resource = root.path().join("resources/nutbook-cli");
        fs::create_dir_all(&resource).expect("resource directory");
        let binary = resource.join("nutbook");
        fs::write(&binary, format!("#!/bin/sh\necho 'nutbook {}'\n", CLI_VERSION)).expect("fake CLI");
        fs::set_permissions(&binary, fs::Permissions::from_mode(0o755)).expect("executable");
        let deployed = deploy_bundled_cli(&root.path().join("app-data"), Some(&root.path().join("resources"))).expect("deploy");
        assert!(deployed.is_file());
        assert!(!deployed.parent().expect("cli parent").join(".nutbook.previous").exists());
        assert_eq!(std::process::Command::new(deployed).arg("--version").output().expect("version").status.success(), true);
        let deployed = deploy_bundled_cli(&root.path().join("app-data"), Some(&root.path().join("resources"))).expect("upgrade existing CLI");
        assert!(deployed.is_file());
    }

    #[cfg(unix)]
    #[test]
    fn deploy_never_downgrades_a_newer_verified_cli() {
        use std::os::unix::fs::PermissionsExt;
        let root = tempdir().expect("temp root");
        let resource = root.path().join("resources/nutbook-cli");
        let destination_dir = root.path().join("app-data/cli");
        fs::create_dir_all(&resource).expect("resource directory");
        fs::create_dir_all(&destination_dir).expect("destination directory");
        let bundled = resource.join("nutbook");
        let installed = destination_dir.join("nutbook");
        fs::write(&bundled, format!("#!/bin/sh\necho 'nutbook {}'\n", CLI_VERSION)).expect("bundled CLI");
        fs::write(&installed, "#!/bin/sh\necho 'nutbook 9.0.0'\n").expect("newer CLI");
        fs::set_permissions(&bundled, fs::Permissions::from_mode(0o755)).expect("bundled executable");
        fs::set_permissions(&installed, fs::Permissions::from_mode(0o755)).expect("installed executable");
        let before = fs::read(&installed).expect("newer bytes");
        let deployed = deploy_bundled_cli(&root.path().join("app-data"), Some(&root.path().join("resources"))).expect("preserve newer CLI");
        assert_eq!(deployed, installed);
        assert_eq!(fs::read(&deployed).expect("preserved bytes"), before);
        assert!(!destination_dir.join(".nutbook.previous").exists());
    }

    #[cfg(unix)]
    #[test]
    fn cli_rejects_symlink_components_before_canonicalization() {
        use std::os::unix::fs::symlink;
        let root = tempdir().expect("temp root");
        let actual = root.path().join("actual");
        fs::create_dir_all(&actual).expect("actual");
        fs::write(actual.join("note.md"), "# note").expect("note");
        let link = root.path().join("link");
        symlink(&actual, &link).expect("symlink");
        assert_eq!(resolve_cli_path(&link.join("note.md").to_string_lossy()).expect_err("reject link").code, "symlink_not_allowed");
    }

    #[test]
    fn doctor_is_read_only_and_has_stable_json_shape() {
        let root = tempdir().expect("temp root");
        fs::create_dir_all(root.path().join("existing/nested")).expect("existing tree");
        fs::write(root.path().join("existing/nested/keep.txt"), "unchanged").expect("existing file");
        let before = tree_snapshot(root.path());
        let report = doctor(root.path());
        assert_eq!(report.cli_version, CLI_VERSION);
        assert_eq!(report.overall, "error");
        assert!(matches!(report.ipc_status.as_str(), "stopped" | "stale" | "unavailable" | "running"));
        assert!(serde_json::to_value(report).expect("doctor json").get("agents").is_some());
        assert_eq!(tree_snapshot(root.path()), before, "doctor must not create, migrate, or touch any app-data entry");
    }

    #[test]
    fn stale_offline_lock_is_reclaimed() {
        let root = tempdir().expect("temp root");
        fs::write(root.path().join("cli-offline.lock"), "999999\n").expect("stale lock");
        let lock = acquire_offline_lock(root.path()).expect("reclaim lock");
        drop(lock);
        assert!(!root.path().join("cli-offline.lock").exists());
    }

    #[test]
    fn doctor_marks_stale_ipc_as_warning() {
        assert_eq!(doctor_overall(true, "accessible", "stale", &[]), "warning");
    }

    #[test]
    fn process_state_classifies_unknown_conservatively() {
        assert_eq!(windows_process_state_from_api(Some(259), None), ProcessState::Alive);
        assert_eq!(windows_process_state_from_api(Some(0), None), ProcessState::Dead);
        assert_eq!(windows_process_state_from_api(None, Some(87)), ProcessState::Dead);
        assert_eq!(windows_process_state_from_api(None, Some(5)), ProcessState::Unknown);
    }

    #[test]
    fn publishing_replaces_a_safe_stale_ipc_endpoint() {
        let root = tempdir().expect("temp root");
        let endpoint_path = root.path().join("cli-ipc.json");
        let backup_path = root.path().join(".cli-ipc.previous");
        fs::write(&endpoint_path, r#"{"port":1,"token":"old","pid":999999,"startedAt":"old"}"#).expect("old endpoint");
        fs::write(&backup_path, r#"{"port":2,"token":"older","pid":999998,"startedAt":"older"}"#).expect("old endpoint backup");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&endpoint_path, fs::Permissions::from_mode(0o600)).expect("secure old endpoint");
            fs::set_permissions(&backup_path, fs::Permissions::from_mode(0o600)).expect("secure old endpoint backup");
        }
        let endpoint = CliIpcEndpoint { port: 43210, token: "new-token".to_string(), pid: std::process::id(), started_at: "new".to_string() };
        publish_cli_ipc_endpoint(root.path(), &endpoint).expect("replace stale endpoint");
        let published: CliIpcEndpoint = serde_json::from_slice(&fs::read(&endpoint_path).expect("published endpoint")).expect("endpoint JSON");
        assert_eq!(published.token, "new-token");
        assert!(!root.path().join(".cli-ipc.previous").exists());
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(fs::metadata(&endpoint_path).expect("endpoint metadata").permissions().mode() & 0o777, 0o600);
        }
        remove_cli_ipc_endpoint_for_pid(root.path(), std::process::id().saturating_add(1));
        assert!(endpoint_path.exists(), "a different process must not remove the active endpoint");
        remove_cli_ipc_endpoint_for_pid(root.path(), std::process::id());
        assert!(!endpoint_path.exists(), "the owning process may remove its endpoint");
    }

    #[cfg(unix)]
    #[test]
    fn ipc_reader_rejects_a_symlink_endpoint() {
        use std::os::unix::fs::symlink;
        let root = tempdir().expect("temp root");
        let outside = root.path().join("outside.json");
        fs::write(&outside, r#"{"port":1,"token":"unsafe","pid":1,"startedAt":"now"}"#).expect("outside endpoint");
        symlink(&outside, root.path().join("cli-ipc.json")).expect("endpoint symlink");
        let error = read_cli_ipc_endpoint(&root.path().join("cli-ipc.json")).expect_err("reject endpoint symlink");
        assert_eq!(error.code, "app_ipc_unavailable");
    }

    fn tree_snapshot(root: &Path) -> Vec<(String, u64, u128)> {
        fn visit(root: &Path, directory: &Path, result: &mut Vec<(String, u64, u128)>) {
            for entry in fs::read_dir(directory).expect("read tree") {
                let entry = entry.expect("tree entry");
                let path = entry.path();
                let metadata = fs::symlink_metadata(&path).expect("tree metadata");
                let modified = metadata.modified().expect("mtime").duration_since(UNIX_EPOCH).expect("valid mtime").as_nanos();
                result.push((path.strip_prefix(root).expect("relative").to_string_lossy().into_owned(), metadata.len(), modified));
                if metadata.is_dir() { visit(root, &path, result); }
            }
        }
        let mut result = Vec::new();
        visit(root, root, &mut result);
        result.sort();
        result
    }

}
