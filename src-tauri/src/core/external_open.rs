//! PR B（计划 §3/§5）：Markdown 外部打开 —— 统一 inbox、外部文件会话与接入协调。
//!
//! 合同要点（docs/plans/2026-09-04-default-file-open-and-external-session-plan.md）：
//! - 所有系统入口（macOS Opened、Windows argv/单实例转交、原生拖放）汇入同一个
//!   pending inbox，请求保持 `{requestId, source, orderedPaths}` 批次边界；
//!   前端 ready 后按 watermark drain-until-empty。
//! - External File Session Registry 保存 sessionId/tabKey（与可空 itemId 分离）、
//!   PathIdentity、打开时 hash/纳秒 mtime/大小、generation 与加入状态。
//!   临时会话不写 SQLite 业务库；「仅打开」只写本地提示记录（非业务库）。
//! - Markdown 保存为 session-scoped：先比对 baseline（hash/mtime/size），
//!   外部变化返回 conflict，文件缺失返回 missing，正常路径原子写盘并返回新 baseline。
//! - 「加入 NUTBOOK」复用 PR A 的接入能力：ignored 显式恢复、folder 范围内
//!   targeted upsert（apply_scan_delta，不触碰 sibling）、库外路径建立独立
//!   single-file source（按 4.3 的受控 overlap 允许保留在排除目录内）。
//! - 已打开外部文件的父目录使用共享非递归 watcher，事件去抖后只做目标文件
//!   baseline 比对并通知前端，不进入 ScanCoordinator，不做递归扫描。

use std::{
    collections::{HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Arc, Mutex,
    },
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use tauri::{Emitter, Manager};
use uuid::Uuid;

use crate::{
    core::{
        document::{content_hash, file_modified_at_string, markdown_summary, render_markdown_as_html_for_file},
        path_identity::path_identity,
        watcher::path_is_candidate,
    },
    db::repositories::{ItemRepository, LibraryRepository},
    errors::AppError,
    models::{IndexedItemRecord, Library, ScanDelta},
    state::AppState,
};

pub const MARKDOWN_EXTENSIONS: &[&str] = &["md", "markdown"];

/// PR C P2（计划 6.1）：`.html` / `.htm` 复用 PR B 的单文件入口、五秒提示、
/// 标签加号与多文件拒绝规则。HTML 只做临时会话（`file_type = "html"`），
/// 不开放 HTML 编辑 / sidecar / editable copy 链路。
pub const HTML_EXTENSIONS: &[&str] = &["html", "htm"];

// ---------------------------------------------------------------------------
// inbox：所有外部打开入口的唯一事实源
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalOpenRequest {
    pub request_id: u64,
    pub source: String,
    pub ordered_paths: Vec<String>,
}

#[derive(Default, Debug)]
pub struct ExternalOpenInbox {
    seq: AtomicU64,
    ready: AtomicBool,
    requests: Mutex<Vec<ExternalOpenRequest>>,
}

/// 进程级全局 inbox：macOS 的 RunEvent::Opened 可能在 tauri setup（AppState
/// manage）之前送达，inbox 必须独立于 AppState 生命周期才能承接冷启动请求
/// （计划 5.1：所有路径先入 inbox，前端 ready 后 drain）。
static EXTERNAL_OPEN_INBOX: std::sync::OnceLock<ExternalOpenInbox> = std::sync::OnceLock::new();

pub fn global_inbox() -> &'static ExternalOpenInbox {
    EXTERNAL_OPEN_INBOX.get_or_init(ExternalOpenInbox::default)
}

impl ExternalOpenInbox {
    /// 入队一个请求；请求整体保留（批次边界不得拆散）。入队即计数，
    /// drain 请求以 watermark 之后的批次为界。
    pub fn enqueue(&self, source: &str, ordered_paths: Vec<String>) {
        if ordered_paths.is_empty() {
            return;
        }
        let request_id = self.seq.fetch_add(1, Ordering::SeqCst) + 1;
        let mut queue = self.requests.lock().expect("external open inbox poisoned");
        queue.push(ExternalOpenRequest {
            request_id,
            source: source.to_string(),
            ordered_paths,
        });
    }

    /// ExternalOpenReady Gate：主 DOM / 事件订阅 / Markdown shell 可用后调用。
    pub fn mark_ready(&self) {
        self.ready.store(true, Ordering::SeqCst);
    }

    pub fn is_ready(&self) -> bool {
        self.ready.load(Ordering::SeqCst)
    }

    /// drain-until-empty：返回 watermark 之后的所有请求并消费；
    /// watermark 单调递增，早于 ready 的冷启动请求不会丢失。
    pub fn drain(&self, after: u64) -> (Vec<ExternalOpenRequest>, u64) {
        let mut queue = self.requests.lock().expect("external open inbox poisoned");
        let pending: Vec<ExternalOpenRequest> = queue
            .iter()
            .filter(|request| request.request_id > after)
            .cloned()
            .collect();
        let watermark = queue.last().map(|request| request.request_id).unwrap_or(after);
        queue.retain(|request| request.request_id > watermark);
        (pending, watermark)
    }
}

// ---------------------------------------------------------------------------
// baseline 与外部文件会话
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalBaseline {
    pub hash: String,
    pub mtime_ns: u128,
    pub size: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExternalResolution {
    /// 资料库外路径（或 folder 内但被扫描策略排除）。
    OutsideLibrary,
    /// 命中 ignored/removed 记录：显式加入解释为恢复。
    Ignored,
    /// 位于已接入 folder 的有效扫描范围内，只是索引尚未收敛：
    /// 临时打开 + 后台 targeted upsert，不显示加入提示。
    FolderPending { library_id: i64 },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum JoinState {
    NotJoined,
    Committed { item_id: i64 },
    Bound { item_id: i64 },
}

#[derive(Debug, Clone)]
pub struct ExternalSession {
    pub session_id: String,
    pub raw_path: String,
    pub identity: Option<String>,
    pub file_type: String,
    pub baseline: ExternalBaseline,
    pub generation: u64,
    pub resolution: ExternalResolution,
    pub join_state: JoinState,
    pub closed: bool,
    /// 加入提交门旗标：begin_join 置位，finish_join / abort_join 清除。
    pub joining: bool,
}

/// 共享父目录 watcher：同一父目录下的多个 external session 复用同一个
/// 非递归 watcher；关闭该目录最后一个 session 后撤销。
struct DirWatchEntry {
    _watcher: RecommendedWatcher,
    sessions: HashSet<String>,
    /// watcher 生命周期旗标：撤销后去抖检查线程退出。
    alive: Arc<AtomicBool>,
}

#[derive(Default)]
pub struct ExternalSessionRegistry {
    sessions: Mutex<HashMap<String, ExternalSession>>,
    dir_watches: Mutex<HashMap<PathBuf, DirWatchEntry>>,
    /// 单个 session 的加入串行锁（同一 session 的并发 join 不重入提交门）。
    join_locks: Mutex<HashMap<String, Arc<Mutex<()>>>>,
    /// 单个 session 的写操作锁（另存 / 保存等有副作用操作串行）。
    op_locks: Mutex<HashMap<String, Arc<Mutex<()>>>>,
}

impl std::fmt::Debug for ExternalSessionRegistry {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("ExternalSessionRegistry")
            .finish_non_exhaustive()
    }
}

pub struct SessionPaths {
    pub identity: Option<String>,
    pub baseline: ExternalBaseline,
}

pub fn read_file_baseline(path: &Path) -> Result<SessionPaths, AppError> {
    let metadata = fs::metadata(path).map_err(|_| AppError::IoError)?;
    if !metadata.is_file() {
        return Err(AppError::InvalidParams);
    }
    let mtime_ns = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_nanos())
        .unwrap_or(0);
    let bytes = fs::read(path).map_err(|_| AppError::IoError)?;
    // 文本解码失败按可恢复错误处理（4.2 的编码策略：不静默中断会话）。
    let text = String::from_utf8(bytes).map_err(|_| AppError::InvalidParams)?;
    let baseline = ExternalBaseline {
        hash: content_hash(&text),
        mtime_ns,
        size: metadata.len(),
    };
    Ok(SessionPaths {
        identity: path_identity(path.to_string_lossy().as_ref()).identity,
        baseline,
    })
}

pub fn supported_markdown_path(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| {
            let normalized = value.to_ascii_lowercase();
            MARKDOWN_EXTENSIONS.contains(&normalized.as_str())
        })
        .unwrap_or(false)
}

/// 外部打开支持的类型：Markdown 或 HTML（计划 6.1）。
pub fn supported_external_path(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| {
            let normalized = value.to_ascii_lowercase();
            MARKDOWN_EXTENSIONS.contains(&normalized.as_str())
                || HTML_EXTENSIONS.contains(&normalized.as_str())
        })
        .unwrap_or(false)
}

/// 外部会话的文件类型（`"markdown"` / `"html"`）。调用方须先通过
/// [`supported_external_path`]；未知扩展名回落到 `markdown` 以保持既有行为。
pub fn external_file_type(path: &Path) -> &'static str {
    let normalized = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .unwrap_or_default();
    if HTML_EXTENSIONS.contains(&normalized.as_str()) {
        "html"
    } else {
        "markdown"
    }
}

impl ExternalSessionRegistry {
    pub fn create_session(
        &self,
        raw_path: &str,
        identity: Option<String>,
        baseline: ExternalBaseline,
        resolution: ExternalResolution,
    ) -> ExternalSession {
        let session = ExternalSession {
            session_id: format!("ext-{}", Uuid::new_v4()),
            raw_path: raw_path.to_string(),
            identity,
            // P2：类型由扩展名派生（md/markdown → markdown，html/htm → html），
            // 同一注册表同时承载两种临时会话。
            file_type: external_file_type(Path::new(raw_path)).to_string(),
            baseline,
            generation: 1,
            resolution,
            join_state: JoinState::NotJoined,
            closed: false,
            joining: false,
        };
        self.sessions
            .lock()
            .expect("external session registry poisoned")
            .insert(session.session_id.clone(), session.clone());
        session
    }

    pub fn get(&self, session_id: &str) -> Option<ExternalSession> {
        self.sessions
            .lock()
            .expect("external session registry poisoned")
            .get(session_id)
            .cloned()
    }

    /// 同一 PathIdentity / 路径的存活会话复用（同路径重复请求聚焦原标签）。
    pub fn find_live_by_path(&self, raw_path: &str) -> Option<ExternalSession> {
        self.sessions
            .lock()
            .expect("external session registry poisoned")
            .values()
            .filter(|session| !session.closed && session.raw_path == raw_path)
            .next()
            .cloned()
    }

    pub fn update_baseline(&self, session_id: &str, baseline: ExternalBaseline) {
        let mut sessions = self
            .sessions
            .lock()
            .expect("external session registry poisoned");
        if let Some(session) = sessions.get_mut(session_id) {
            session.baseline = baseline;
        }
    }

    pub fn set_join_state(&self, session_id: &str, join_state: JoinState) {
        let mut sessions = self
            .sessions
            .lock()
            .expect("external session registry poisoned");
        if let Some(session) = sessions.get_mut(session_id) {
            session.join_state = join_state;
        }
    }

    pub fn retarget(
        &self,
        session_id: &str,
        raw_path: &str,
        identity: Option<String>,
        baseline: ExternalBaseline,
        resolution: ExternalResolution,
    ) {
        let mut sessions = self
            .sessions
            .lock()
            .expect("external session registry poisoned");
        if let Some(session) = sessions.get_mut(session_id) {
            session.raw_path = raw_path.to_string();
            session.identity = identity;
            session.baseline = baseline;
            session.resolution = resolution;
            // Codex review R2-2：retarget = 换路径 = 旧 itemId 绑定一律失效。
            // 新路径按其解析结果重新走加入/绑定链路；旧 ignored 记录不恢复
            // （resolution 已按新路径重新解析，ignored 目标映射为 OutsideLibrary）。
            session.join_state = JoinState::NotJoined;
        }
    }

    /// 每个 session 一把串行锁：加入提交门与另存等写操作各自独立。
    fn lock_in(map: &Mutex<HashMap<String, Arc<Mutex<()>>>>, session_id: &str) -> Arc<Mutex<()>> {
        map.lock()
            .expect("external session locks poisoned")
            .entry(session_id.to_string())
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone()
    }

    pub fn join_lock(&self, session_id: &str) -> Arc<Mutex<()>> {
        Self::lock_in(&self.join_locks, session_id)
    }

    pub fn op_lock(&self, session_id: &str) -> Arc<Mutex<()>> {
        Self::lock_in(&self.op_locks, session_id)
    }

    pub fn live_session_count(&self) -> usize {
        self.sessions
            .lock()
            .expect("external session registry poisoned")
            .values()
            .filter(|session| !session.closed)
            .count()
    }

    /// 加入提交门入口：会话存活、generation 匹配且未在加入途中才允许进入。
    /// 标记 joining 后，close_session 与 finish_join 都按同一事实裁决。
    pub fn begin_join(&self, session_id: &str, generation: u64) -> Result<ExternalSession, AppError> {
        let mut sessions = self
            .sessions
            .lock()
            .expect("external session registry poisoned");
        let Some(session) = sessions.get_mut(session_id) else {
            return Err(AppError::InvalidSession);
        };
        if session.closed || session.generation != generation {
            return Err(AppError::InvalidSession);
        }
        if session.joining {
            return Err(AppError::EditConflict);
        }
        session.joining = true;
        Ok(session.clone())
    }

    /// 提交门裁决：会话仍存活且 generation 未变 → Bound；否则 Committed
    /// （数据库状态保留，标签不复活，注册表不重建）。
    pub fn finish_join(&self, session_id: &str, generation: u64, item_id: i64) -> JoinOutcome {
        let mut sessions = self
            .sessions
            .lock()
            .expect("external session registry poisoned");
        match sessions.get_mut(session_id) {
            Some(session) if !session.closed && session.generation == generation => {
                session.joining = false;
                session.join_state = JoinState::Bound { item_id };
                JoinOutcome::Bound { item_id }
            }
            _ => {
                if let Some(session) = sessions.get_mut(session_id) {
                    session.joining = false;
                }
                JoinOutcome::Committed { item_id }
            }
        }
    }

    /// 加入失败或未通过提交门：清除途中旗标，会话保持可重试。
    pub fn abort_join(&self, session_id: &str) {
        if let Ok(mut sessions) = self.sessions.lock() {
            if let Some(session) = sessions.get_mut(session_id) {
                session.joining = false;
            }
        }
    }

    /// 提交门在持有 DB 写锁后的复核（等待写锁期间可能已关闭/换代）。
    pub fn is_joinable(&self, session_id: &str, generation: u64) -> bool {
        self.sessions
            .lock()
            .expect("external session registry poisoned")
            .get(session_id)
            .is_some_and(|session| !session.closed && session.generation == generation)
    }

    /// 目标路径是否被其他存活 session 占用（另存目标的占用检查）。
    pub fn is_path_occupied(&self, raw_path: &str, exclude_session: &str) -> bool {
        self.sessions
            .lock()
            .expect("external session registry poisoned")
            .values()
            .any(|session| {
                !session.closed && session.session_id != exclude_session && session.raw_path == raw_path
            })
    }

    /// 关闭会话并释放父目录 watcher（最后一个 session 时撤销）。
    pub fn close_session(&self, session_id: &str) -> bool {
        let removed = {
            let mut sessions = self
                .sessions
                .lock()
                .expect("external session registry poisoned");
            if let Some(session) = sessions.get_mut(session_id) {
                session.closed = true;
                // 从注册表移除，避免长期存活 map 无界增长；调用方持有快照继续工作。
                sessions.remove(session_id);
                true
            } else {
                false
            }
        };
        if removed {
            self.release_dir_watch(session_id);
        }
        removed
    }

    fn session_dir(&self, session_id: &str) -> Option<PathBuf> {
        self.get(session_id)
            .and_then(|session| PathBuf::from(&session.raw_path).parent().map(Path::to_path_buf))
    }

    fn release_dir_watch(&self, session_id: &str) {
        let Some(dir) = self.session_dir(session_id) else {
            return;
        };
        let mut watches = self
            .dir_watches
            .lock()
            .expect("external session dir watches poisoned");
        if let Some(entry) = watches.get_mut(&dir) {
            entry.sessions.remove(session_id);
            if entry.sessions.is_empty() {
                entry.alive.store(false, Ordering::SeqCst);
                watches.remove(&dir);
            }
        }
    }

    /// 为 session 的父目录建立/复用共享非递归 watcher。
    pub fn ensure_dir_watch(
        &self,
        session_id: &str,
        app: tauri::AppHandle,
    ) -> Result<(), AppError> {
        let Some(dir) = self.session_dir(session_id) else {
            return Err(AppError::InvalidParams);
        };
        let mut watches = self
            .dir_watches
            .lock()
            .expect("external session dir watches poisoned");
        if let Some(entry) = watches.get_mut(&dir) {
            entry.sessions.insert(session_id.to_string());
            return Ok(());
        }
        let registry_flag = Arc::new(AtomicBool::new(false));
        let alive = Arc::new(AtomicBool::new(true));
        let event_flag = registry_flag.clone();
        let mut watcher =
            notify::recommended_watcher(move |result: Result<notify::Event, notify::Error>| {
                // 事件到达只做记录；真实比对在去抖线程内完成（见 spawn_change_check）。
                if result.is_err() {
                    return;
                }
                event_flag.store(true, Ordering::SeqCst);
            })
            .map_err(|_| AppError::InternalError)?;
        watcher
            .watch(&dir, RecursiveMode::NonRecursive)
            .map_err(|_| AppError::InternalError)?;
        let mut sessions = HashSet::new();
        sessions.insert(session_id.to_string());
        watches.insert(dir.clone(), DirWatchEntry { _watcher: watcher, sessions, alive: alive.clone() });
        // 共享去抖检查线程：目录事件后短暂等待，再对所有存活 session 做一次
        // baseline 比对。临时文件 → rename/replace 的保存路径因此自然收敛。
        // watcher 撤销（该目录最后一个 session 关闭）后线程退出。
        let poll_registry = registry_flag.clone();
        let poll_alive = alive.clone();
        let _ = &poll_alive;
        std::thread::spawn(move || loop {
            std::thread::sleep(Duration::from_millis(500));
            if !poll_alive.load(Ordering::SeqCst) {
                return;
            }
            if poll_registry.swap(false, Ordering::SeqCst) {
                // 给 rename/replace 序列留出收敛窗口后再比对一次。
                std::thread::sleep(Duration::from_millis(300));
                emit_session_changes(&app, &dir);
            }
        });
        Ok(())
    }
}

/// 去抖后的目标文件 baseline 比对：只通知，不改 baseline（baseline 只随
/// 保存 / reload 更新）。事件不进入 ScanCoordinator，不递归扫描。
fn emit_session_changes(app: &tauri::AppHandle, dir: &Path) {
    let state = app.state::<AppState>();
    let registry = &state.external_sessions;
    let Ok(sessions) = registry.sessions.lock() else {
        return;
    };
    for session in sessions.values() {
        if session.closed {
            continue;
        }
        let session_dir = PathBuf::from(&session.raw_path)
            .parent()
            .map(Path::to_path_buf)
            .unwrap_or_default();
        if session_dir != dir {
            continue;
        }
        let path = Path::new(&session.raw_path);
        let status = match fs::metadata(path) {
            Ok(metadata) if metadata.is_file() => {
                let Ok(current) = read_file_baseline(path) else {
                    continue;
                };
                if current.baseline == session.baseline {
                    continue;
                }
                "modified"
            }
            _ => "deleted",
        };
        let _ = app.emit(
            "nutbook-external-session-changed",
            serde_json::json!({ "sessionId": session.session_id, "status": status }),
        );
    }
}

// ---------------------------------------------------------------------------
// 提示记录（同一路径只主动提示一次；本地偏好状态，非 SQLite 业务库）
// ---------------------------------------------------------------------------

fn hints_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("external-open-hints.json")
}

pub fn load_open_hints(app_data_dir: &Path) -> HashMap<String, String> {
    fs::read_to_string(hints_path(app_data_dir))
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

pub fn record_open_hint(app_data_dir: &Path, identity: &str) {
    let mut hints = load_open_hints(app_data_dir);
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis().to_string())
        .unwrap_or_default();
    hints.insert(identity.to_string(), now);
    if let Ok(text) = serde_json::to_vec(&hints) {
        let path = hints_path(app_data_dir);
        let temporary = app_data_dir.join(format!(".external-open-hints.{}.tmp", std::process::id()));
        if fs::write(&temporary, &text).is_ok() {
            let _ = fs::rename(&temporary, &path);
        }
    }
}

// ---------------------------------------------------------------------------
// 资料库状态解析（5.2 的四分支判定）
// ---------------------------------------------------------------------------

pub struct LibraryPathState {
    pub active_item_id: Option<i64>,
    pub ignored_item_id: Option<i64>,
    pub folder_library_id: Option<i64>,
    pub folder_candidate: bool,
}

pub fn resolve_library_path_state(state: &AppState, raw_path: &str) -> Result<LibraryPathState, AppError> {
    let path = Path::new(raw_path);
    let identity = path_identity(raw_path);

    // 1) 既有有效 item（未删除且未被 ignored）：按 file_path 与 identity 双查。
    let active_item_id = active_item_for_external_path(state, raw_path, identity.identity.as_deref())?;

    // 2) ignored 记录（identity 优先，路径兜底）。
    let ignored_item_id = state
        .database
        .list_ignored_items()?
        .into_iter()
        .find(|ignored| {
            ignored.file_path == raw_path
                || identity
                    .identity
                    .as_deref()
                    .is_some_and(|canonical| {
                        fs::canonicalize(&ignored.file_path)
                            .map(|value| value.to_string_lossy() == canonical)
                            .unwrap_or(false)
                    })
        })
        .map(|ignored| ignored.item_id);

    // 3) folder 来源包含（lexical 预判 + 来源有效）与候选策略判定。
    let mut folder_library_id = None;
    let mut folder_candidate = false;
    if active_item_id.is_none() {
        let libraries = state.database.list_libraries()?;
        for library in libraries
            .iter()
            .filter(|library| library.source_kind == "folder" && library.path_state == "valid")
        {
            let resolved_root = fs::canonicalize(&library.root_path).ok();
            let contained = crate::core::path_identity::lexically_contains(&library.root_path, raw_path)
                || resolved_root
                    .as_deref()
                    .is_some_and(|root| path.starts_with(root));
            if !contained {
                continue;
            }
            if folder_library_id.is_none() {
                folder_library_id = Some(library.id);
            }
            let candidate = resolved_root
                .as_deref()
                .is_some_and(|root| path_is_candidate(library, root, path));
            if candidate {
                folder_library_id = Some(library.id);
                folder_candidate = true;
                break;
            }
        }
    }

    Ok(LibraryPathState {
        active_item_id,
        ignored_item_id,
        folder_library_id,
        folder_candidate,
    })
}

fn active_item_for_external_path(
    state: &AppState,
    raw_path: &str,
    identity: Option<&str>,
) -> Result<Option<i64>, AppError> {
    let mut page = 1_u32;
    loop {
        let result = state.database.list_items(&crate::models::ListItemsQuery {
            include_deleted: Some(false),
            page: Some(page),
            page_size: Some(500),
            ..crate::models::ListItemsQuery::default()
        })?;
        let found = result.items.iter().find(|item| {
            if item.file_path == raw_path {
                return true;
            }
            match identity {
                Some(canonical) => fs::canonicalize(&item.file_path)
                    .map(|value| value.to_string_lossy() == canonical)
                    .unwrap_or(false),
                None => false,
            }
        });
        if let Some(item) = found {
            return Ok(Some(item.id));
        }
        if !result.has_more {
            return Ok(None);
        }
        page += 1;
    }
}

/// 路径分类结果（5.2 四分支）。两阶段解析的 inspect 阶段只产出这个只读结果：
/// 不创建 session、不挂 watcher、不写数据库。
pub enum ExternalPathKind {
    /// 拖入/打开的是文件夹：交给 PR A 的预检与确认。
    Folder,
    /// 资料库已有有效 item：直接打开正式 item。
    Indexed { item_id: i64 },
    /// 临时外部会话（resolution 决定加入提示与后续接入方式）。
    External { resolution: ExternalResolution },
}

pub struct ExternalPathPlan {
    pub file_name: String,
    pub kind: ExternalPathKind,
}

/// 只读分类：供 inspect 阶段与 open 阶段共用，保证两阶段判定一致。
pub fn plan_external_path(state: &AppState, raw_path: &str) -> Result<ExternalPathPlan, AppError> {
    let path = Path::new(raw_path);
    let file_name = path
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_else(|| raw_path.to_string());
    if path.is_dir() {
        return Ok(ExternalPathPlan { file_name, kind: ExternalPathKind::Folder });
    }
    if !path.is_file() {
        return Err(AppError::ItemNotFound);
    }
    if !supported_external_path(path) {
        return Err(AppError::UnsupportedFileType);
    }
    let path_state = resolve_library_path_state(state, raw_path)?;
    if let Some(item_id) = path_state.active_item_id {
        return Ok(ExternalPathPlan {
            file_name,
            kind: ExternalPathKind::Indexed { item_id },
        });
    }
    let resolution = if path_state.ignored_item_id.is_some() {
        ExternalResolution::Ignored
    } else if path_state.folder_candidate {
        ExternalResolution::FolderPending {
            library_id: path_state.folder_library_id.ok_or(AppError::InternalError)?,
        }
    } else {
        ExternalResolution::OutsideLibrary
    };
    Ok(ExternalPathPlan {
        file_name,
        kind: ExternalPathKind::External { resolution },
    })
}

// ---------------------------------------------------------------------------
// 加入（3.7）：pending → committed → bound
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum JoinOutcome {
    Committed { item_id: i64 },
    Bound { item_id: i64 },
    AlreadyBound { item_id: i64 },
}

/// 加入入口（3.7）：pending → committed → bound 全部收敛到同一个提交门。
///
/// 提交门规则：
/// - 进入提交门前只做只读裁决（无数据库写入）；
/// - 提交门持有全局 DB 写锁，拿到锁后再次复核会话是否仍存活（等待写锁期间
///   用户可能已经关闭标签）→ 关闭则零入库地放弃；
/// - 数据库写入完成点之后由 `finish_join` 在同一注册表锁内裁决：会话仍存活
///   为 Bound，已关闭为 Committed（库状态保留、标签不复活）。
pub fn join_external_session(state: &AppState, session_id: &str, generation: u64) -> Result<JoinOutcome, AppError> {
    if let Some(session) = state.external_sessions.get(session_id) {
        if let JoinState::Committed { item_id } | JoinState::Bound { item_id } = session.join_state {
            return Ok(JoinOutcome::AlreadyBound { item_id });
        }
    }
    let session = state.external_sessions.begin_join(session_id, generation)?;
    let committed = join_with_commit_gate(state, &session);
    match committed {
        Ok(item_id) => Ok(state.external_sessions.finish_join(session_id, generation, item_id)),
        Err(error) => {
            state.external_sessions.abort_join(session_id);
            Err(error)
        }
    }
}

/// 提交门：会话串行锁 → 各分支最终写入。调用方负责 begin/abort。
///
/// 锁序说明：本函数**不自持**全局 DB 写锁。最终落库统一走
/// [`crate::core::scan_coordinator::ScanCoordinator::apply_delta_if`] /
/// [`crate::core::scan_coordinator::ScanCoordinator::run_scan_if`]，锁序为
/// per-library 锁 → 全局 DB 写锁，与 [`crate::state::AppState::delete_library`]、
/// repair 及一切 scan 路径一致；「拿到写锁后复核会话是否仍存活」由这两个方法
/// 在双锁内调用 `precondition` 完成——等待锁期间被关闭的会话零写入放弃。
/// 旧实现（先持 DB 写锁再取 per-library 锁）与上述顺序相反，会与
/// delete_library 形成 ABBA 死锁，因此裁决下沉为持锁回调而非外层持锁。
fn join_with_commit_gate(state: &AppState, session: &ExternalSession) -> Result<i64, AppError> {
    let session_id = session.session_id.clone();
    let join_lock = state.external_sessions.join_lock(&session_id);
    let _join_guard = join_lock.lock().map_err(|_| AppError::InternalError)?;
    let joinable = || state.external_sessions.is_joinable(&session_id, session.generation);
    // 快速失败：进入分支前先裁决一次，避免已关闭的会话触发前置写入。
    if !joinable() {
        return Err(AppError::InvalidSession);
    }
    match session.resolution {
        ExternalResolution::FolderPending { library_id } => {
            join_via_folder_targeted_upsert(state, session, library_id, joinable)
        }
        ExternalResolution::Ignored => join_via_ignored_restore(state, session, &joinable),
        ExternalResolution::OutsideLibrary => join_via_single_file_source(state, session, &joinable),
    }
}

fn join_via_folder_targeted_upsert(
    state: &AppState,
    session: &ExternalSession,
    library_id: i64,
    joinable: impl Fn() -> bool,
) -> Result<i64, AppError> {
    // 提交前在同一写入协调范围内重新核验（5.2/8.2）：ignored、来源有效、策略。
    let path_state = resolve_library_path_state(state, &session.raw_path)?;
    if let Some(item_id) = path_state.active_item_id {
        return Ok(item_id);
    }
    if path_state.ignored_item_id.is_some() {
        // 排队期间被移除：停止自动接入，保持临时会话（只有显式恢复可解除）。
        return Err(AppError::EditConflict);
    }
    let Some(library) = state
        .database
        .list_libraries()?
        .into_iter()
        .find(|library| library.id == library_id && library.path_state == "valid")
    else {
        return Err(AppError::LibraryNotFound);
    };
    if !path_state.folder_candidate {
        return Err(AppError::InvalidParams);
    }
    let Some(record) = folder_targeted_record(&library, &session.raw_path)? else {
        return Err(AppError::InvalidParams);
    };
    let generation = state.scan_coordinator().current_generation(library_id);
    // apply_delta_if 内部按 per-library 锁 → DB 写锁持锁，并在双锁内回调
    // `joinable` 复核会话存活；复核失败时零写入跳过。
    let report = state.scan_coordinator().apply_delta_if(
        library_id,
        generation,
        &ScanDelta { upserts: vec![record], removals: vec![], renames: vec![] },
        joinable,
    )?;
    if report.created == 0 && report.updated == 0 {
        return Err(AppError::EditConflict);
    }
    active_item_for_external_path(state, &session.raw_path, session.identity.as_deref())?
        .ok_or(AppError::EditConflict)
}

fn folder_targeted_record(
    library: &Library,
    raw_path: &str,
) -> Result<Option<IndexedItemRecord>, AppError> {
    let path = Path::new(raw_path);
    let resolved_root = match fs::canonicalize(&library.root_path) {
        Ok(root) => root,
        Err(_) => return Ok(None),
    };
    let relative = path
        .strip_prefix(&resolved_root)
        .or_else(|_| path.strip_prefix(Path::new(&library.root_path)))
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_default();
    if relative.is_empty() {
        return Ok(None);
    }
    if !path_is_candidate(library, &resolved_root, path) {
        return Ok(None);
    }
    let metadata = fs::metadata(path).map_err(|_| AppError::IoError)?;
    let db_path = Path::new(&library.root_path).join(&relative);
    Ok(Some(IndexedItemRecord {
        library_id: library.id,
        file_path: db_path.to_string_lossy().to_string(),
        relative_path: relative,
        file_name: path
            .file_name()
            .map(|value| value.to_string_lossy().to_string())
            .ok_or(AppError::InvalidParams)?,
        file_ext: path
            .extension()
            .and_then(|value| value.to_str())
            .ok_or(AppError::UnsupportedFileType)?
            .to_string(),
        file_type: "markdown".to_string(),
        file_size: metadata.len() as i64,
        modified_at: file_modified_at_string(&metadata)?,
        created_at: file_modified_at_string(&metadata)?,
        updated_at: file_modified_at_string(&metadata)?,
    }))
}

fn join_via_ignored_restore(
    state: &AppState,
    session: &ExternalSession,
    joinable: &impl Fn() -> bool,
) -> Result<i64, AppError> {
    let path_state = resolve_library_path_state(state, &session.raw_path)?;
    if let Some(item_id) = path_state.active_item_id {
        return Ok(item_id);
    }
    // 显式加入 = 显式恢复：解除 ignored 记录后按普通加入继续。
    // 恢复写入前在全局 DB 写锁内复核会话存活（等待期间关闭则零写入放弃）。
    // 本分支不取 per-library 锁——只持 DB 写锁时不与其他任何锁序相反。
    if let Some(ignored_item_id) = path_state.ignored_item_id {
        let db_write_lock = state.scan_coordinator().db_write_lock();
        let _db = db_write_lock.lock().map_err(|_| AppError::InternalError)?;
        if !joinable() {
            return Err(AppError::InvalidSession);
        }
        state.database.restore_ignored_item(ignored_item_id)?;
        return active_item_for_external_path(state, &session.raw_path, session.identity.as_deref())?
            .ok_or(AppError::EditConflict);
    }
    join_via_single_file_source(state, session, joinable)
}

/// 库外路径建立独立 single-file source（4.3 受控 overlap）。
///
/// 最终扫描走 [`ScanCoordinator::run_scan_if`]（per-library 锁 → DB 写锁，
/// 双锁内复核 `joinable`）。写库路径的原子失败收敛：本函数新建的 library
/// 在 scan 失败、precondition 失败或未产出 item 时回滚，不留下空来源。
fn join_via_single_file_source(
    state: &AppState,
    session: &ExternalSession,
    joinable: &impl Fn() -> bool,
) -> Result<i64, AppError> {
    let path_state = resolve_library_path_state(state, &session.raw_path)?;
    if let Some(item_id) = path_state.active_item_id {
        return Ok(item_id);
    }

    // 幂等：同一路径已存在 single-file source 时复用（PathIdentity 语义）。
    let libraries = state.database.list_libraries()?;
    if let Some(existing) = libraries
        .iter()
        .filter(|library| library.source_kind == "file")
        .find(|library| {
            fs::canonicalize(&library.root_path)
                .map(|value| {
                    session
                        .identity
                        .as_deref()
                        .is_some_and(|canonical| value.to_string_lossy() == canonical)
                })
                .unwrap_or(false)
                || library.root_path == session.raw_path
        })
    {
        state.scan_coordinator().run_scan_if(existing.id, joinable)?;
        return active_item_for_external_path(state, &session.raw_path, session.identity.as_deref())?
            .ok_or(AppError::EditConflict);
    }

    // folder 内被扫描策略排除的路径：4.3 允许的受控 overlap——
    // 建 single-file source，不转交 folder owner，folder 扫描不删除它。
    //
    // Codex review R2-1（原子提交）：item 记录先在事务外用与扫描完全相同的
    // 纯函数预计算（scan_file_source 无副作用，含 .nutbook-editable.html 伴随
    // 文件语义）；库行与 item 行随后由 `create_single_file_source_atomic` 在
    // **同一事务**内、提交门回调裁决之后发布——提交门外零可见、崩溃零残留，
    // 不再使用「先建库 + 事后回滚」的补偿式写法。
    let now = now_string();
    let records = crate::core::scanner::scan_file_source(0, &session.raw_path, &now)?;
    let name = Path::new(&session.raw_path)
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .ok_or(AppError::InvalidParams)?;

    // 本分支尚无 library id：只持全局 DB 写锁、不取 per-library 锁（无锁序
    // 反转）；事务在锁内执行 → 持锁读者在提交完成前观察不到新来源。
    let db_lock = state.scan_coordinator().db_write_lock();
    let publish = {
        let _db_guard = db_lock.lock().map_err(|_| AppError::InternalError)?;
        state.database.create_single_file_source_atomic(
            &session.raw_path,
            &name,
            &records,
            &now,
            joinable,
        )?
    };
    match publish {
        crate::db::SingleFileSourcePublish::Published { library_id, item_id } => {
            // 与 execute_with_app_state 一致：新来源建立后启动 watcher（失败仅降级）。
            let library = Library {
                id: library_id,
                name,
                root_path: session.raw_path.clone(),
                source_kind: "file".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: now.clone(),
                updated_at: now.clone(),
                last_scanned_at: Some(now.clone()),
                skill_binding: None,
            };
            if let Ok(watcher) = crate::core::watcher::build_library_watcher(
                state.scan_coordinator().clone(),
                library,
            ) {
                let _ = state.watch_library(library_id, watcher);
            }
            Ok(item_id)
        }
        crate::db::SingleFileSourcePublish::AlreadyExisting { library_id } => {
            // 并发竞态下来源已由其他路径建立：退回既有来源的扫描语义。
            state.scan_coordinator().run_scan_if(library_id, joinable)?;
            active_item_for_external_path(state, &session.raw_path, session.identity.as_deref())?
                .ok_or(AppError::EditConflict)
        }
        crate::db::SingleFileSourcePublish::Aborted => Err(AppError::InvalidSession),
    }
}

fn now_string() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

// ---------------------------------------------------------------------------
// 保存 / 另存（5.3 / 5.3.1）
// ---------------------------------------------------------------------------

pub enum SaveOutcome {
    Saved { baseline: ExternalBaseline },
    Conflict { current: ExternalBaseline },
    Missing,
}

fn stat_current(path: &Path) -> Result<Option<ExternalBaseline>, AppError> {
    match fs::metadata(path) {
        Ok(metadata) if metadata.is_file() => {
            let mtime_ns = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                .map(|duration| duration.as_nanos())
                .unwrap_or(0);
            Ok(Some(ExternalBaseline {
                hash: String::new(),
                mtime_ns,
                size: metadata.len(),
            }))
        }
        Ok(_) => Err(AppError::InvalidParams),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(_) => Err(AppError::IoError),
    }
}

fn external_changed(path: &Path, baseline: &ExternalBaseline) -> Result<bool, AppError> {
    match stat_current(path)? {
        None => Ok(true),
        Some(current) => {
            if current.mtime_ns != baseline.mtime_ns || current.size != baseline.size {
                return Ok(true);
            }
            // mtime/size 一致时以内容 hash 复核（低精度文件系统的兜底）。
            let text = fs::read_to_string(path).map_err(|_| AppError::IoError)?;
            Ok(content_hash(&text) != baseline.hash)
        }
    }
}

/// 原子写盘：同目录临时文件 + fsync + rename（保存/覆盖走这条路径；
/// rename 覆盖既有目标在 macOS/Windows 上都是原子的）。
pub fn write_text_atomically(target: &Path, content: &str) -> Result<(), AppError> {
    let dir = target.parent().ok_or(AppError::InvalidParams)?;
    let file_name = target
        .file_name()
        .map(|value| value.to_os_string())
        .ok_or(AppError::InvalidParams)?;
    let temporary = dir.join(format!(
        ".{}.nutbook-save-{}",
        file_name.to_string_lossy(),
        Uuid::new_v4()
    ));
    let write = (|| {
        use std::io::Write;
        let mut file = fs::File::create(&temporary).map_err(|_| AppError::MarkdownSaveFailed)?;
        file.write_all(content.as_bytes())
            .map_err(|_| AppError::MarkdownSaveFailed)?;
        file.sync_all().map_err(|_| AppError::MarkdownSaveFailed)?;
        drop(file);
        fs::rename(&temporary, target).map_err(|_| AppError::MarkdownSaveFailed)?;
        Ok(())
    })();
    if write.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    write
}

/// no-clobber 新建：先写临时文件，再用 hard_link 发布——目标已存在时失败，
/// 不覆盖（5.3.1：最终创建必须具有 no-clobber 语义）。
pub fn publish_new_file_no_clobber(target: &Path, content: &str) -> Result<(), AppError> {
    let dir = target.parent().ok_or(AppError::InvalidParams)?;
    let file_name = target
        .file_name()
        .map(|value| value.to_os_string())
        .ok_or(AppError::InvalidParams)?;
    let temporary = dir.join(format!(
        ".{}.nutbook-new-{}",
        file_name.to_string_lossy(),
        Uuid::new_v4()
    ));
    let write = (|| {
        use std::io::Write;
        let mut file = fs::File::create(&temporary).map_err(|_| AppError::MarkdownSaveFailed)?;
        file.write_all(content.as_bytes())
            .map_err(|_| AppError::MarkdownSaveFailed)?;
        file.sync_all().map_err(|_| AppError::MarkdownSaveFailed)?;
        drop(file);
        fs::hard_link(&temporary, target).map_err(|_| AppError::IoError)?;
        Ok(())
    })();
    let _ = fs::remove_file(&temporary);
    write
}

pub fn save_external_session(
    state: &AppState,
    session_id: &str,
    generation: u64,
    content: &str,
) -> Result<SaveOutcome, AppError> {
    let Some(session) = state.external_sessions.get(session_id) else {
        return Err(AppError::InvalidSession);
    };
    if session.generation != generation {
        return Err(AppError::InvalidSession);
    }
    let path = PathBuf::from(&session.raw_path);
    match stat_current(&path)? {
        None => return Ok(SaveOutcome::Missing),
        Some(_) => {}
    }
    if external_changed(&path, &session.baseline)? {
        let current = read_file_baseline(&path)?.baseline;
        return Ok(SaveOutcome::Conflict { current });
    }
    write_text_atomically(&path, content)?;
    let baseline = read_file_baseline(&path)?.baseline;
    state
        .external_sessions
        .update_baseline(session_id, baseline.clone());
    // 已绑定（或已提交）的会话：写盘成功后按已提交 itemId 更新索引（3.7）。
    if let JoinState::Committed { item_id } | JoinState::Bound { item_id } = session.join_state {
        refresh_bound_item_content(state, item_id, &path, content);
    }
    Ok(SaveOutcome::Saved { baseline })
}

fn refresh_bound_item_content(state: &AppState, item_id: i64, path: &Path, _content: &str) {
    let Ok(text) = fs::read_to_string(path) else {
        return;
    };
    let file_name = path
        .file_name()
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_default();
    let summary = markdown_summary(&text);
    let rendered = render_markdown_as_html_for_file(&text, &file_name);
    let modified_at = fs::metadata(path)
        .ok()
        .and_then(|metadata| file_modified_at_string(&metadata).ok())
        .unwrap_or_default();
    let _ = state.update_markdown_item_content(
        item_id,
        &summary,
        &modified_at,
        &content_hash(&text),
        &text,
        &text,
        &rendered,
    );
}

/// 另存目标校验（5.3.1）：V1 只接受新建 .md/.markdown 目标；磁盘已存在、
/// 被其他存活 session 占用或已有 indexed/ignored 记录的目标均拒绝。
pub fn validate_save_target(
    state: &AppState,
    session_id: &str,
    target: &str,
) -> Result<(), AppError> {
    let path = PathBuf::from(target);
    if !supported_markdown_path(&path) {
        return Err(AppError::UnsupportedFileType);
    }
    if path.exists() {
        return Err(AppError::IoError);
    }
    if state.external_sessions.is_path_occupied(target, session_id) {
        return Err(AppError::InvalidSession);
    }
    if active_item_for_external_path(state, target, None)?.is_some() {
        return Err(AppError::EditConflict);
    }
    if state
        .database
        .list_ignored_items()?
        .iter()
        .any(|ignored| ignored.file_path == target)
    {
        return Err(AppError::EditConflict);
    }
    Ok(())
}

/// 另存副本：只写出副本，当前标签仍绑定原路径并保持 dirty/conflicted。
///
/// 与另存为共用同一资源写出后端（lease + no-clobber + 预算 + 逃逸拒绝）：
/// 跨目录时先复制本地相对资源，正文最后 no-clobber 落盘；正文未 durable
/// 则不保留已复制资源。
pub fn save_copy_external_session(
    state: &AppState,
    session_id: &str,
    generation: u64,
    content: &str,
    target: &str,
    history_resource_paths: &[String],
) -> Result<ExternalBaseline, AppError> {
    let Some(session) = state.external_sessions.get(session_id) else {
        return Err(AppError::InvalidSession);
    };
    if session.generation != generation {
        return Err(AppError::InvalidSession);
    }
    let op_lock = state.external_sessions.op_lock(session_id);
    let _operation = op_lock.lock().map_err(|_| AppError::InternalError)?;
    // 提交前复核：picker 期间会话可能已关闭或换代。
    let current = state
        .external_sessions
        .get(session_id)
        .ok_or(AppError::InvalidSession)?;
    if current.generation != generation {
        return Err(AppError::InvalidSession);
    }
    validate_save_target(state, session_id, target)?;
    let mut lease = ResourceCopyLease::new();
    let source_dir = PathBuf::from(&session.raw_path)
        .parent()
        .map(Path::to_path_buf)
        .ok_or(AppError::InvalidParams)?;
    let target_dir = PathBuf::from(target)
        .parent()
        .map(Path::to_path_buf)
        .ok_or(AppError::InvalidParams)?;
    if !same_directory(&source_dir, &target_dir) {
        copy_referenced_local_resources(&source_dir, &target_dir, content, history_resource_paths, &mut lease)?;
    }
    publish_new_file_no_clobber(Path::new(target), content)?;
    lease.release();
    Ok(read_file_baseline(Path::new(target))?.baseline)
}

/// 删除后的另存为：切换会话路径、更新 PathIdentity/baseline/watcher。
///
/// 顺序与失败语义（5.3.1 + Codex review R1-5）：
/// - 操作锁内复核 session/generation（picker 期间会话可能已关闭或换代）；
/// - 资源先准备且带 lease：正文未 durable 前失败只清理本次新建的资源；
/// - 正文最后以 no-clobber 新建方式持久化，durable 后资源 lease 释放；
/// - 正文 durable 之后 watcher 失败不再回滚正文（不重复创建/覆盖），返回
///   `watch_attached=false`，前端提示并可重试挂 watcher。
pub fn save_as_external_session(
    state: &AppState,
    app: &tauri::AppHandle,
    session_id: &str,
    generation: u64,
    content: &str,
    target: &str,
    history_resource_paths: &[String],
) -> Result<SaveAsOutcome, AppError> {
    save_as_external_session_inner(state, Some(app), session_id, generation, content, target, history_resource_paths)
}

/// 测试友好的内层实现：watcher 附加步骤依赖 AppHandle，测试传 None
/// （watch_attached=false，可重试，不影响 durable 语义断言）。
pub fn save_as_external_session_inner(
    state: &AppState,
    app: Option<&tauri::AppHandle>,
    session_id: &str,
    generation: u64,
    content: &str,
    target: &str,
    history_resource_paths: &[String],
) -> Result<SaveAsOutcome, AppError> {
    let Some(session) = state.external_sessions.get(session_id) else {
        return Err(AppError::InvalidSession);
    };
    if session.generation != generation {
        return Err(AppError::InvalidSession);
    }
    let op_lock = state.external_sessions.op_lock(session_id);
    let _operation = op_lock.lock().map_err(|_| AppError::InternalError)?;
    let current = state
        .external_sessions
        .get(session_id)
        .ok_or(AppError::InvalidSession)?;
    if current.generation != generation {
        return Err(AppError::InvalidSession);
    }
    validate_save_target(state, session_id, target)?;

    // 资源先准备：跨目录另存时枚举本次待写 Markdown 引用的本地相对资源，
    // 仅复制解析后位于原文档父目录内的文件，保持相同相对路径（5.3.1）。
    let source_dir = PathBuf::from(&current.raw_path)
        .parent()
        .map(Path::to_path_buf)
        .ok_or(AppError::InvalidParams)?;
    let target_dir = PathBuf::from(target)
        .parent()
        .map(Path::to_path_buf)
        .ok_or(AppError::InvalidParams)?;
    let mut lease = ResourceCopyLease::new();
    if !same_directory(&source_dir, &target_dir) {
        copy_referenced_local_resources(&source_dir, &target_dir, content, history_resource_paths, &mut lease)?;
    }

    // 资源确认可用后，Markdown 最后以 no-clobber 新建方式持久化。
    publish_new_file_no_clobber(Path::new(target), content)?;
    lease.release();
    // 正文已 durable：此后任何后置步骤失败不再作为 Err 传播——会话保留
    // 原路径，按「已写出副本（待绑定）」恢复（Codex review R2-3 / 5.3.1）。
    let post = (|| -> Result<SaveAsOutcome, AppError> {
        let baseline = read_file_baseline(Path::new(target))?.baseline;
        let identity = path_identity(target).identity;
        let path_state = resolve_library_path_state(state, target)?;
        let resolution = if path_state.ignored_item_id.is_some() {
            ExternalResolution::OutsideLibrary
        } else if path_state.folder_candidate {
            ExternalResolution::FolderPending { library_id: path_state.folder_library_id.unwrap_or_default() }
        } else {
            ExternalResolution::OutsideLibrary
        };
        state
            .external_sessions
            .retarget(session_id, target, identity, baseline.clone(), resolution);
        // 正文已 durable：watcher 失败降级为可重试状态，不回滚正文。
        let watch_attached = match app {
            Some(app) => state
                .external_sessions
                .ensure_dir_watch(session_id, app.clone())
                .is_ok(),
            None => false,
        };
        Ok(SaveAsOutcome::Saved {
            baseline,
            new_path: target.to_string(),
            watch_attached,
        })
    })();
    match post {
        Ok(outcome) => Ok(outcome),
        Err(_) => Ok(SaveAsOutcome::WrittenCopyElsewhere { new_path: target.to_string() }),
    }
}

/// 只补挂父目录 watcher（正文 durable 后 watcher 失败的重试入口）。
pub fn attach_session_dir_watch(
    state: &AppState,
    app: &tauri::AppHandle,
    session_id: &str,
) -> Result<bool, AppError> {
    if state.external_sessions.get(session_id).is_none() {
        return Err(AppError::InvalidSession);
    }
    state
        .external_sessions
        .ensure_dir_watch(session_id, app.clone())?;
    Ok(true)
}

#[derive(Debug)]
pub enum SaveAsOutcome {
    Saved {
        baseline: ExternalBaseline,
        new_path: String,
        /// 正文已 durable 但父目录 watcher 未挂上时 false：可重试，不重建正文。
        watch_attached: bool,
    },
    /// 正文已 durable 但 retarget/后置步骤失败：会话保留原路径，按写出副本
    /// （待绑定）恢复，前端提示且不切换标签（Codex review R2-3）。
    WrittenCopyElsewhere { new_path: String },
}

fn same_directory(left: &Path, right: &Path) -> bool {
    let Some(left_canonical) = fs::canonicalize(left).ok() else {
        return false;
    };
    fs::canonicalize(right)
        .map(|canonical| canonical == left_canonical)
        .unwrap_or(false)
}

// 另存为的相对资源复制预算（5.3.1：单资源/总量受预算约束）。
const SAVE_AS_MAX_RESOURCE_BYTES: u64 = 50 * 1024 * 1024;
const SAVE_AS_MAX_TOTAL_BYTES: u64 = 200 * 1024 * 1024;
const SAVE_AS_MAX_RESOURCE_COUNT: usize = 500;

/// 本操作新建资源的 lease：只清理自己创建的文件，绝不删除用户既有文件。
///
/// 正文 durable 前失败（资源冲突 / 超预算 / 正文写盘失败）由 Drop 自动清理；
/// 正文 durable 后调用 [`Self::release`] 放弃清理责任。
#[derive(Debug, Default)]
pub struct ResourceCopyLease {
    created: Vec<PathBuf>,
    active: bool,
}

impl ResourceCopyLease {
    pub fn new() -> Self {
        Self { created: Vec::new(), active: true }
    }

    pub fn created_count(&self) -> usize {
        self.created.len()
    }

    /// 正文 durable：放弃清理责任，资源随正文一起保留。
    pub fn release(&mut self) {
        self.created.clear();
        self.active = false;
    }

    /// 只删除本操作新建的资源（用户既有文件永不进入 created）。
    pub fn cleanup(&mut self) {
        for path in self.created.drain(..) {
            let _ = fs::remove_file(&path);
        }
        self.active = false;
    }
}

impl Drop for ResourceCopyLease {
    fn drop(&mut self) {
        if self.active {
            self.cleanup();
        }
    }
}

/// 从 Markdown 正文枚举本地相对图片引用（`![..](..)` 与 `<img src="..">`），
/// 解析后必须位于 original_dir 内且存在；逐个复制到 target_dir 内相同相对路径。
/// 冲突（同名不同内容）或超预算时整体失败，不写正文、不 retarget；失败只清理
/// 本次新建的资源（lease）。
fn copy_referenced_local_resources(
    original_dir: &Path,
    target_dir: &Path,
    content: &str,
    history_resource_paths: &[String],
    lease: &mut ResourceCopyLease,
) -> Result<(), AppError> {
    // Codex review R2-3（5.3.1）+ R3-3（5.3.1 合同）：草稿/撤销历史可达状态
    // 引用的资源也必须随写出收敛——撤销/重做回到含旧图片的历史时，资源已在
    // 新目录就位。history 路径**缺失或越出原文档父目录即硬失败**（不写正文、
    // 不 retarget、lease 清理本次新建，原会话原样保留）：静默跳过会让 redo
    // 恢复后出现失效图片且永不补齐，违反「无法完成则保留原会话」。正文引用
    // 的越界引用维持整体拒绝（既有合同，见下方 canonical 校验）。
    let mut references = collect_relative_image_refs(content);
    if let Ok(canonical_dir) = fs::canonicalize(original_dir) {
        for raw in history_resource_paths {
            let canonical = fs::canonicalize(raw)
                .map_err(|_| AppError::InvalidParams)?;
            if !canonical.starts_with(&canonical_dir) {
                return Err(AppError::InvalidParams);
            }
            let relative = canonical
                .strip_prefix(&canonical_dir)
                .map_err(|_| AppError::InvalidParams)?;
            let value = relative.to_string_lossy().to_string();
            if !references.contains(&value) {
                references.push(value);
            }
        }
    }
    if references.is_empty() {
        return Ok(());
    }
    if references.len() > SAVE_AS_MAX_RESOURCE_COUNT {
        return Err(AppError::AssetTooLarge);
    }
    let canonical_original_dir = fs::canonicalize(original_dir).map_err(|_| AppError::IoError)?;
    let canonical_target_dir = fs::canonicalize(target_dir).map_err(|_| AppError::IoError)?;
    let mut total_bytes: u64 = 0;
    for reference in references {
        let resolved = original_dir.join(&reference);
        // 逐段解析防 `..` 越界：最终 canonical 路径必须仍在 original_dir 内。
        let canonical_resolved = fs::canonicalize(&resolved).map_err(|_| AppError::InvalidParams)?;
        if !canonical_resolved.starts_with(&canonical_original_dir) {
            return Err(AppError::InvalidParams);
        }
        if !canonical_resolved.is_file() {
            return Err(AppError::InvalidParams);
        }
        let size = fs::metadata(&canonical_resolved).map(|metadata| metadata.len()).unwrap_or(0);
        if size > SAVE_AS_MAX_RESOURCE_BYTES {
            return Err(AppError::AssetTooLarge);
        }
        total_bytes += size;
        if total_bytes > SAVE_AS_MAX_TOTAL_BYTES {
            return Err(AppError::AssetTooLarge);
        }
        let relative = canonical_resolved
            .strip_prefix(&canonical_original_dir)
            .map(Path::to_path_buf)
            .map_err(|_| AppError::InvalidParams)?;
        let destination = target_dir.join(&relative);
        if let Some(parent) = destination.parent() {
            fs::create_dir_all(parent).map_err(|_| AppError::IoError)?;
            // 目标父目录必须解析后仍在 target_dir 内（防目录 symlink 逃逸）。
            let canonical_parent = fs::canonicalize(parent).map_err(|_| AppError::IoError)?;
            if !canonical_parent.starts_with(&canonical_target_dir) {
                return Err(AppError::InvalidParams);
            }
        }
        match destination.symlink_metadata() {
            Ok(metadata) => {
                // symlink 一律拒绝：不穿透写入用户可能指向目录外的链接。
                if metadata.file_type().is_symlink() {
                    return Err(AppError::InvalidParams);
                }
                let same = fs::read(&destination)
                    .ok()
                    .zip(fs::read(&canonical_resolved).ok())
                    .is_some_and(|(existing, incoming)| existing == incoming);
                if !same {
                    // 资源冲突：保留用户文件（不删除），整体失败。
                    return Err(AppError::EditConflict);
                }
                continue;
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(_) => return Err(AppError::IoError),
        }
        let bytes = fs::read(&canonical_resolved).map_err(|_| AppError::IoError)?;
        // no-clobber 写出：竞争中创建的目标不会被覆盖（失败即退，不删文件）。
        write_new_file_no_clobber(&destination, &bytes)?;
        lease.created.push(destination);
    }
    Ok(())
}

/// `O_EXCL` 创建 + 写入：目标已存在时不打开也不覆盖（no-clobber）。
/// 只有本函数自己创建成功却写入失败时才删除残留文件。
fn write_new_file_no_clobber(destination: &Path, bytes: &[u8]) -> Result<(), AppError> {
    use std::io::Write;
    let mut file = match fs::OpenOptions::new().write(true).create_new(true).open(destination) {
        Ok(file) => file,
        Err(_) => return Err(AppError::IoError),
    };
    let write = (|| {
        file.write_all(bytes)
            .map_err(|_| AppError::MarkdownSaveFailed)?;
        file.sync_all().map_err(|_| AppError::MarkdownSaveFailed)?;
        Ok(())
    })();
    if write.is_err() {
        let _ = fs::remove_file(destination);
    }
    write
}

fn collect_relative_image_refs(content: &str) -> Vec<String> {
    let mut references = Vec::new();
    let bytes = content.as_bytes();
    let mut index = 0usize;
    while let Some(start) = content[index..].find("![") {
        let open = index + start + 2;
        let Some(close) = content[open..].find(']') else { break };
        let paren = open + close + 1;
        if content[paren..].starts_with('(') {
            if let Some(end) = content[paren + 1..].find(')') {
                let raw = content[paren + 1..paren + 1 + end].trim();
                if let Some(reference) = normalize_relative_ref(raw) {
                    references.push(reference);
                }
                index = paren + 1 + end;
                continue;
            }
        }
        index = open;
        if index >= bytes.len() {
            break;
        }
    }
    // HTML <img src="...">
    for part in content.split("<img") {
        if let Some(src_start) = part.find("src=") {
            let rest = &part[src_start + 4..];
            let quote = rest.chars().next();
            let quote = match quote {
                Some('"') => '"',
                Some('\'') => '\'',
                _ => continue,
            };
            if let Some(end) = rest[1..].find(quote) {
                let raw = rest[1..1 + end].trim();
                if let Some(reference) = normalize_relative_ref(raw) {
                    references.push(reference);
                }
            }
        }
    }
    references.sort();
    references.dedup();
    references
}

fn normalize_relative_ref(raw: &str) -> Option<String> {
    let value = raw
        .split(['#', '?'])
        .next()
        .unwrap_or("")
        .trim()
        .replace('\\', "/");
    if value.is_empty()
        || value.starts_with('/')
        || value.starts_with("data:")
        || value.starts_with("blob:")
        || value.contains("://")
        || value.to_ascii_lowercase().starts_with("file:")
    {
        return None;
    }
    Some(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn review_state(tag: &str) -> (AppState, PathBuf) {
        let root = unique_dir(tag);
        fs::create_dir_all(&root).expect("test root");
        let database = crate::db::Database::new(root.join("nutbook.sqlite3")).expect("database");
        let app_data_dir = root.join("app-data");
        fs::create_dir_all(&app_data_dir).expect("app data dir");
        let state = AppState::new(database, app_data_dir);
        (state, root)
    }

    #[cfg(unix)]
    fn symlink(original: &Path, link: &Path) -> std::io::Result<()> {
        std::os::unix::fs::symlink(original, link)
    }

    #[cfg(not(unix))]
    fn symlink(_original: &Path, _link: &Path) -> std::io::Result<()> {
        // Windows 测试环境不强制 symlink 权限：退化为直接返回错误，调用方跳过。
        Err(std::io::Error::new(std::io::ErrorKind::Unsupported, "symlink unsupported"))
    }

    fn unique_dir(tag: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("time after epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("nutbook-ext-{tag}-{nanos}"))
    }

    #[test]
    fn external_supported_path_covers_markdown_and_html_only() {
        for name in ["doc.md", "doc.markdown", "DOC.MD", "page.html", "page.htm", "PAGE.HTM"] {
            assert!(supported_external_path(Path::new(name)), "{name} 必须被外部打开接受");
        }
        for name in ["doc.txt", "doc.pdf", "doc", "page.html.zip", "note.md.bak"] {
            assert!(!supported_external_path(Path::new(name)), "{name} 必须被拒绝");
        }
    }

    #[test]
    fn external_file_type_derives_from_extension() {
        assert_eq!(external_file_type(Path::new("/tmp/a.html")), "html");
        assert_eq!(external_file_type(Path::new("/tmp/a.htm")), "html");
        assert_eq!(external_file_type(Path::new("/tmp/A.HTML")), "html");
        assert_eq!(external_file_type(Path::new("/tmp/a.md")), "markdown");
        assert_eq!(external_file_type(Path::new("/tmp/a.markdown")), "markdown");
        assert_eq!(external_file_type(Path::new("/tmp/a")), "markdown");
    }

    #[test]
    fn plan_external_path_accepts_html_and_rejects_other_types() {
        let (state, root) = review_state("html-plan");
        let html = root.join("page.html");
        fs::write(&html, "<html><body>hi</body></html>").expect("write html");
        let plan = plan_external_path(&state, &html.to_string_lossy()).expect("html 必须被接受");
        assert!(
            matches!(plan.kind, ExternalPathKind::External { .. }),
            "html 应进入临时外部会话"
        );
        assert_eq!(plan.file_name, "page.html");

        let txt = root.join("page.txt");
        fs::write(&txt, "nope").expect("write txt");
        assert!(
            plan_external_path(&state, &txt.to_string_lossy()).is_err(),
            "非 md/html 必须拒绝"
        );
    }

    #[test]
    fn create_session_derives_file_type_from_path() {
        let registry = ExternalSessionRegistry::default();
        let baseline = ExternalBaseline {
            hash: "h".to_string(),
            mtime_ns: 0,
            size: 0,
        };
        let html = registry.create_session(
            "/tmp/page.html",
            None,
            baseline.clone(),
            ExternalResolution::OutsideLibrary,
        );
        assert_eq!(html.file_type, "html");
        let md = registry.create_session(
            "/tmp/page.md",
            None,
            baseline,
            ExternalResolution::OutsideLibrary,
        );
        assert_eq!(md.file_type, "markdown");
    }

    #[test]
    fn inbox_preserves_batch_boundaries_and_watermark() {
        let inbox = ExternalOpenInbox::default();
        assert!(!inbox.is_ready());
        inbox.enqueue("system_open", vec!["/tmp/a.md".to_string()]);
        inbox.enqueue("system_open", vec!["/tmp/b.md".to_string(), "/tmp/c.html".to_string()]);
        inbox.enqueue("drag_drop", vec!["/tmp/d.md".to_string()]);

        let (batch, watermark) = inbox.drain(0);
        assert_eq!(batch.len(), 3, "requests must keep their batch boundaries");
        assert_eq!(batch[0].ordered_paths, vec!["/tmp/a.md".to_string()]);
        assert_eq!(batch[1].ordered_paths.len(), 2, "multi-path batch must stay whole");
        assert_eq!(batch[1].request_id + 1, batch[2].request_id);
        assert_eq!(watermark, batch[2].request_id);

        inbox.enqueue("drag_drop", vec!["/tmp/e.md".to_string()]);
        let (second, watermark) = inbox.drain(watermark);
        assert_eq!(second.len(), 1);
        assert_eq!(second[0].ordered_paths, vec!["/tmp/e.md".to_string()]);
        let (empty, _) = inbox.drain(watermark);
        assert!(empty.is_empty(), "drain-until-empty must converge");
    }

    #[test]
    fn inbox_empty_paths_are_dropped() {
        let inbox = ExternalOpenInbox::default();
        inbox.enqueue("system_open", vec![]);
        let (batch, _) = inbox.drain(0);
        assert!(batch.is_empty());
    }

    #[test]
    fn write_text_atomically_overwrites_and_publish_new_file_never_clobbers() {
        let dir = unique_dir("write");
        fs::create_dir_all(&dir).expect("dir");
        let target = dir.join("note.md");
        write_text_atomically(&target, "# v1").expect("first write");
        write_text_atomically(&target, "# v2").expect("overwrite write");
        assert_eq!(fs::read_to_string(&target).expect("read"), "# v2");

        publish_new_file_no_clobber(&target, "# other").expect_err("no-clobber must refuse existing target");
        assert_eq!(fs::read_to_string(&target).expect("read"), "# v2", "existing content must survive");

        let fresh = dir.join("fresh.md");
        publish_new_file_no_clobber(&fresh, "# fresh").expect("new target");
        assert_eq!(fs::read_to_string(&fresh).expect("read"), "# fresh");
        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn relative_image_refs_only_collect_local_relative_paths() {
        let content = [
            "![本地](assets/a.png)",
            "![别名](./assets/b.png)",
            "![外部](https://example.com/x.png)",
            "![绝对](/etc/passwd)",
            "![数据](data:image/png;base64,xxx)",
            "<img src=\"assets/c.png\">",
            "<img src='/deep/d.png'>",
        ]
        .join("\n");
        let references = collect_relative_image_refs(&content);
        assert!(references.contains(&"assets/a.png".to_string()));
        assert!(references.contains(&"./assets/b.png".to_string()));
        assert!(references.contains(&"assets/c.png".to_string()));
        assert!(references.contains(&"/deep/d.png".to_string()) == false);
        assert!(!references.iter().any(|value| value.contains("http")));
        assert!(!references.iter().any(|value| value.starts_with('/')));
    }

    #[test]
    fn cross_dir_resource_copy_rejects_escaping_references() {
        let source_dir = unique_dir("res-src");
        let target_dir = unique_dir("res-dst");
        let outside_dir = unique_dir("res-outside");
        fs::create_dir_all(&source_dir).expect("src");
        fs::create_dir_all(&target_dir).expect("dst");
        fs::create_dir_all(&outside_dir).expect("outside");
        fs::write(source_dir.join("doc.md"), "# doc").expect("doc");
        // 越出原文档父目录的资源：必须整体拒绝，不复制。
        let outside_image = outside_dir.join("escape.png");
        fs::write(&outside_image, b"png").expect("png");

        let content = format!("![逃逸](../escape.png)");
        let mut lease = ResourceCopyLease::new();
        let error = copy_referenced_local_resources(&source_dir, &target_dir, &content, &[], &mut lease)
            .expect_err("escaping reference must be rejected");
        assert!(matches!(error, AppError::InvalidParams));
        assert!(
            fs::read_dir(&target_dir).expect("dst listing").count() == 0,
            "rejected copy must leave no partial resources"
        );

        // 目录内资源正常复制，保持相同相对路径。
        fs::create_dir_all(source_dir.join("assets")).expect("assets");
        fs::write(source_dir.join("assets/ok.png"), b"png").expect("png");
        let content = "![正常](assets/ok.png)".to_string();
        let mut lease = ResourceCopyLease::new();
        copy_referenced_local_resources(&source_dir, &target_dir, &content, &[], &mut lease)
            .expect("in-dir copy");
        lease.release();
        assert!(target_dir.join("assets/ok.png").is_file(), "same relative path must be preserved");
        let _ = fs::remove_dir_all(source_dir);
        let _ = fs::remove_dir_all(target_dir);
        let _ = fs::remove_dir_all(outside_dir);
    }

    #[test]
    fn review_resource_conflict_must_preserve_existing_target_asset() {
        let source = unique_dir("review-source");
        let target = unique_dir("review-target");
        fs::create_dir_all(source.join("assets")).unwrap();
        fs::create_dir_all(target.join("assets")).unwrap();
        fs::write(source.join("assets/photo.png"), b"incoming").unwrap();
        fs::write(target.join("assets/photo.png"), b"user-original").unwrap();
        let mut lease = ResourceCopyLease::new();
        let result =
            copy_referenced_local_resources(&source, &target, "![photo](assets/photo.png)", &[], &mut lease);
        let preserved = fs::read(target.join("assets/photo.png")).ok();
        fs::remove_dir_all(source).unwrap();
        fs::remove_dir_all(target).unwrap();
        assert!(result.is_err());
        assert_eq!(preserved.as_deref(), Some(b"user-original".as_slice()), "failed save must not delete a pre-existing user asset");
    }

    // Codex review R1-2 反例 1：冲突时只清理本操作新建的资源，用户既有资源必须存活。
    #[test]
    fn review_resource_copy_conflict_cleans_only_this_operation_files() {
        let source = unique_dir("review-lease-source");
        let target = unique_dir("review-lease-target");
        fs::create_dir_all(source.join("assets")).unwrap();
        fs::create_dir_all(target.join("assets")).unwrap();
        fs::write(source.join("assets/first.png"), b"first-incoming").unwrap();
        fs::write(source.join("assets/second.png"), b"second-incoming").unwrap();
        // 目标已存在且内容不同 → 第二个资源冲突，整体失败。
        fs::write(target.join("assets/second.png"), b"user-original").unwrap();

        let mut lease = ResourceCopyLease::new();
        let result = copy_referenced_local_resources(
            &source,
            &target,
            "![a](assets/first.png)\n![b](assets/second.png)",
            &[],
            &mut lease,
        );
        // 真实路径下 lease 随 `?` 传播在函数出口 Drop；这里显式触发同一清理。
        lease.cleanup();
        let first_after = fs::read(target.join("assets/first.png")).ok();
        let second_after = fs::read(target.join("assets/second.png")).ok();
        fs::remove_dir_all(&source).unwrap();
        fs::remove_dir_all(&target).unwrap();

        assert!(result.is_err(), "conflicting asset must fail the whole operation");
        assert_eq!(
            first_after, None,
            "resources created by the failed operation must be cleaned up"
        );
        assert_eq!(
            second_after.as_deref(),
            Some(b"user-original".as_slice()),
            "a pre-existing user asset must survive a failed copy"
        );
    }

    // Codex review R1-2 反例 2：目标为 symlink 时不得穿透写入目录外。
    #[test]
    fn review_resource_copy_refuses_symlink_target() {
        let source = unique_dir("review-symlink-source");
        let target = unique_dir("review-symlink-target");
        let outside = unique_dir("review-symlink-outside");
        fs::create_dir_all(source.join("assets")).unwrap();
        fs::create_dir_all(target.join("assets")).unwrap();
        fs::create_dir_all(&outside).unwrap();
        fs::write(source.join("assets/photo.png"), b"incoming").unwrap();
        let outside_file = outside.join("photo.png");
        fs::write(&outside_file, b"user-original").unwrap();
        if symlink(&outside_file, &target.join("assets/photo.png")).is_err() {
            // 环境不支持 symlink（Windows 无特权）：跳过而不是伪装通过。
            let _ = fs::remove_dir_all(&source);
            let _ = fs::remove_dir_all(&target);
            let _ = fs::remove_dir_all(&outside);
            return;
        }

        let mut lease = ResourceCopyLease::new();
        let result = copy_referenced_local_resources(
            &source,
            &target,
            "![photo](assets/photo.png)",
            &[],
            &mut lease,
        );
        lease.cleanup();
        let outside_after = fs::read(&outside_file).ok();
        let still_symlink = fs::symlink_metadata(target.join("assets/photo.png"))
            .map(|metadata| metadata.file_type().is_symlink())
            .unwrap_or(false);
        fs::remove_dir_all(&source).unwrap();
        fs::remove_dir_all(&target).unwrap();
        fs::remove_dir_all(&outside).unwrap();

        assert!(result.is_err(), "symlink target must be rejected");
        assert_eq!(
            outside_after.as_deref(),
            Some(b"user-original".as_slice()),
            "copy must never write through a symlink"
        );
        assert!(still_symlink, "the symlink itself must not be replaced");
    }

    // Codex review R2-3：跨目录另存为必须收敛 draft/history 引用的资源——
    // 只被撤销历史引用（当前正文不含）的图片同样要出现在新目录。
    #[test]
    fn review_save_as_must_migrate_history_resources() {
        let (state, root) = review_state("review-history-res");
        let source = root.join("src");
        fs::create_dir_all(source.join("assets")).unwrap();
        let file = source.join("note.md");
        fs::write(&file, "![旧图](assets/old.png)").unwrap();
        fs::write(source.join("assets/old.png"), b"old").unwrap();
        // late.png 只在撤销历史可达状态中被引用，当前正文不含。
        fs::write(source.join("assets/late.png"), b"late").unwrap();
        let raw = file.to_string_lossy().to_string();
        let paths = read_file_baseline(&file).expect("baseline");
        let session = state.external_sessions.create_session(
            &raw,
            paths.identity.clone(),
            paths.baseline.clone(),
            ExternalResolution::OutsideLibrary,
        );

        let target_dir = root.join("dst");
        fs::create_dir_all(&target_dir).unwrap();
        let target = target_dir.join("out.md");
        let content = "![旧图](assets/old.png)\n\n正文已不含 late 图".to_string();
        let history = vec![source.join("assets/late.png").to_string_lossy().to_string()];
        let outcome = save_as_external_session_inner(
            &state,
            None,
            &session.session_id,
            1,
            &content,
            &target.to_string_lossy(),
            &history,
        )
        .expect("save as");
        assert!(
            matches!(outcome, SaveAsOutcome::Saved { watch_attached: false, .. }),
            "durable write must report saved (watcher optional in tests), got {outcome:?}"
        );
        assert_eq!(
            fs::read_to_string(&target).expect("target content"),
            content,
            "durable content must match the snapshot"
        );
        assert!(
            target_dir.join("assets/old.png").is_file(),
            "content-referenced resources must be copied"
        );
        assert!(
            target_dir.join("assets/late.png").is_file(),
            "history-only referenced resources must be migrated for undo recovery"
        );
        let _ = fs::remove_dir_all(root);
    }

    // Codex review R3-3 反例：历史资源路径越出原文档父目录 → 硬失败。
    // 零写出（无目标正文、无部分资源）、原会话原样保留、外部文件不写穿；
    // 静默跳过会让 redo 恢复后出现失效图片，违反「失败保留原会话」合同。
    #[test]
    fn review_save_as_rejects_history_resources_outside_source_dir() {
        let (state, root) = review_state("review-history-escape");
        let source = root.join("src");
        fs::create_dir_all(&source).unwrap();
        let file = source.join("note.md");
        fs::write(&file, "# note").unwrap();
        let outside_image = root.join("outside.png");
        fs::write(&outside_image, b"user-original").unwrap();
        let raw = file.to_string_lossy().to_string();
        let paths = read_file_baseline(&file).expect("baseline");
        let session = state.external_sessions.create_session(
            &raw,
            paths.identity.clone(),
            paths.baseline.clone(),
            ExternalResolution::OutsideLibrary,
        );
        let session_id = session.session_id.clone();

        let target_dir = root.join("dst");
        fs::create_dir_all(&target_dir).unwrap();
        let target = target_dir.join("out.md");
        let history = vec![outside_image.to_string_lossy().to_string()];
        let outcome = save_as_external_session_inner(
            &state,
            None,
            &session_id,
            1,
            "# note",
            &target.to_string_lossy(),
            &history,
        );
        assert!(outcome.is_err(), "out-of-dir history resources must hard-fail, not be skipped");
        assert!(
            !target.exists(),
            "a rejected save-as must not leave a partial body behind"
        );
        assert!(
            !target_dir.join("outside.png").exists(),
            "out-of-dir history resources must not be copied"
        );
        assert_eq!(
            fs::read(&outside_image).expect("outside file"),
            b"user-original".as_slice(),
            "outside files must never be touched"
        );
        let after = state.external_sessions.get(&session_id).expect("session");
        assert_eq!(
            after.raw_path, raw,
            "a failed save-as must keep the session on its original path"
        );
        let _ = fs::remove_dir_all(root);
    }

    // Codex review R3-3 反例：history 资源缺失（外部删除）→ 硬失败且原会话保留，
    // 不留下半个新目录产物。
    #[test]
    fn review_save_as_rejects_missing_history_resources() {
        let (state, root) = review_state("review-history-missing");
        let source = root.join("src");
        fs::create_dir_all(&source).unwrap();
        let file = source.join("note.md");
        fs::write(&file, "# note").unwrap();
        let raw = file.to_string_lossy().to_string();
        let paths = read_file_baseline(&file).expect("baseline");
        let session = state.external_sessions.create_session(
            &raw,
            paths.identity.clone(),
            paths.baseline.clone(),
            ExternalResolution::OutsideLibrary,
        );
        let session_id = session.session_id.clone();

        let target_dir = root.join("dst");
        fs::create_dir_all(&target_dir).unwrap();
        let target = target_dir.join("out.md");
        let history = vec![source.join("assets/gone.png").to_string_lossy().to_string()];
        let outcome = save_as_external_session_inner(
            &state,
            None,
            &session_id,
            1,
            "# note",
            &target.to_string_lossy(),
            &history,
        );
        assert!(outcome.is_err(), "missing history resources must hard-fail");
        assert!(!target.exists(), "no body may be written on rejection");
        let after = state.external_sessions.get(&session_id).expect("session");
        assert_eq!(after.raw_path, raw, "session must stay on the original path");
        let _ = fs::remove_dir_all(root);
    }

    // Codex review R1-2 反例 3：no-clobber 写出——目标已存在时失败且不覆盖。
    #[test]
    fn review_new_file_write_never_clobbers_existing_target() {
        let dir = unique_dir("review-noclobber");
        fs::create_dir_all(&dir).unwrap();
        let target = dir.join("asset.png");
        fs::write(&target, b"user-original").unwrap();
        let result = write_new_file_no_clobber(&target, b"incoming");
        let after = fs::read(&target).ok();
        fs::remove_dir_all(&dir).unwrap();
        assert!(result.is_err());
        assert_eq!(after.as_deref(), Some(b"user-original".as_slice()));
    }

    // Codex review R1-3 反例 1：持有 DB 写锁期间关闭 → 拿到写锁后零入库。
    #[test]
    fn review_join_aborted_by_close_writes_nothing() {
        let (state, root) = review_state("review-join-gate");
        let file_path = root.join("note.md");
        fs::write(&file_path, "# note").unwrap();
        let raw = file_path.to_string_lossy().to_string();
        let paths = read_file_baseline(&file_path).expect("baseline");
        let session = state.external_sessions.create_session(
            &raw,
            paths.identity.clone(),
            paths.baseline.clone(),
            ExternalResolution::OutsideLibrary,
        );
        let session_id = session.session_id.clone();

        let db_write_lock = state.scan_coordinator().db_write_lock();
        std::thread::scope(|scope| {
            let guard = db_write_lock.lock().expect("db write lock");
            let handle = scope.spawn(|| join_external_session(&state, &session_id, 1));
            // 等 join 进入提交门并开始等待写锁。
            std::thread::sleep(Duration::from_millis(80));
            assert!(
                state.external_sessions.close_session(&session_id),
                "the session must still be closable while the join waits"
            );
            drop(guard);
            let outcome = handle.join().expect("join thread must not panic");
            assert!(outcome.is_err(), "a close before commit must abort the join");
        });

        let libraries = state.list_libraries().expect("libraries");
        let items = state
            .list_items(&crate::models::ListItemsQuery::default())
            .expect("items");
        let _ = fs::remove_dir_all(&root);
        assert!(libraries.is_empty(), "aborted join must not create a library");
        assert_eq!(items.total, 0, "aborted join must not create any item");
    }

    // Codex review R1-3 反例 2：commit 先完成时保留库状态，且不复活已关闭标签。
    #[test]
    fn review_join_commit_gate_keeps_committed_state_without_resurrecting_tab() {
        let registry = ExternalSessionRegistry::default();
        let session = registry.create_session(
            "/tmp/nutbook-gate.md",
            None,
            ExternalBaseline { hash: "h".to_string(), mtime_ns: 1, size: 2 },
            ExternalResolution::OutsideLibrary,
        );
        let session_id = session.session_id.clone();
        assert!(matches!(
            registry.finish_join(&session_id, 1, 7),
            JoinOutcome::Bound { item_id: 7 }
        ));
        registry.close_session(&session_id);
        assert!(
            matches!(
                registry.finish_join(&session_id, 1, 9),
                JoinOutcome::Committed { item_id: 9 }
            ),
            "a close after commit must keep the committed fact"
        );
        assert!(
            registry.get(&session_id).is_none(),
            "a closed session must never be resurrected by a late commit"
        );
        assert_eq!(registry.live_session_count(), 0);
    }

    // Codex review R1-3 反例 3：正常加入成功 → Bound，重复加入 AlreadyBound，
    // 关闭后再加入直接失败（库状态保留）。
    #[test]
    fn review_join_success_then_close_keeps_committed_state() {
        let (state, root) = review_state("review-join-bound");
        let file_path = root.join("note.md");
        fs::write(&file_path, "# note").unwrap();
        let raw = file_path.to_string_lossy().to_string();
        let paths = read_file_baseline(&file_path).expect("baseline");
        let session = state.external_sessions.create_session(
            &raw,
            paths.identity.clone(),
            paths.baseline.clone(),
            ExternalResolution::OutsideLibrary,
        );
        let session_id = session.session_id.clone();

        let bound = join_external_session(&state, &session_id, 1).expect("join should succeed");
        let item_id = match bound {
            JoinOutcome::Bound { item_id } => item_id,
            other => panic!("expected a bound session, got {other:?}"),
        };
        assert!(item_id > 0);
        let again = join_external_session(&state, &session_id, 1).expect("repeat join");
        assert!(matches!(again, JoinOutcome::AlreadyBound { .. }));

        state.external_sessions.close_session(&session_id);
        assert!(join_external_session(&state, &session_id, 1).is_err());

        let items = state
            .list_items(&crate::models::ListItemsQuery::default())
            .expect("items");
        let _ = fs::remove_dir_all(&root);
        assert_eq!(items.total, 1, "committed state must survive a later close");
    }

    // Codex review R1-6 反例：inspect 阶段只读，不创建 session、不写库。
    #[test]
    fn review_inspect_plan_is_side_effect_free() {
        let (state, root) = review_state("review-inspect");
        let file_path = root.join("note.md");
        fs::write(&file_path, "# note").unwrap();
        let raw = file_path.to_string_lossy().to_string();

        let plan = plan_external_path(&state, &raw).expect("plan");
        assert!(
            matches!(plan.kind, ExternalPathKind::External { .. }),
            "a markdown file outside any library must classify as external"
        );
        assert_eq!(
            state.external_sessions.live_session_count(),
            0,
            "inspect must not create a session"
        );
        assert!(
            state.list_libraries().expect("libraries").is_empty(),
            "inspect must not create a library"
        );
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn review_join_must_not_publish_source_before_commit_gate() {
        let (state, root) = review_state("review-source-atomic");
        let path = root.join("note.md");
        fs::write(&path, "# note").unwrap();
        let paths = read_file_baseline(&path).unwrap();
        let session = state.external_sessions.create_session(&path.to_string_lossy(), paths.identity, paths.baseline, ExternalResolution::OutsideLibrary);
        let lock = state.scan_coordinator().db_write_lock();
        let visible = std::thread::scope(|scope| {
            let guard = lock.lock().unwrap();
            let worker = scope.spawn(|| join_external_session(&state, &session.session_id, 1));
            let deadline = std::time::Instant::now() + Duration::from_millis(500);
            let mut visible = false;
            while std::time::Instant::now() < deadline {
                if !state.database.list_libraries().unwrap().is_empty() { visible = true; break; }
                std::thread::sleep(Duration::from_millis(5));
            }
            state.external_sessions.close_session(&session.session_id);
            drop(guard);
            let _ = worker.join().unwrap();
            visible
        });
        let _ = fs::remove_dir_all(root);
        assert!(!visible, "library was published while the admission commit gate was blocked");
    }

    #[test]
    fn review_retarget_outside_must_clear_old_item_binding() {
        let registry = ExternalSessionRegistry::default();
        let baseline = ExternalBaseline { hash: "h".into(), mtime_ns: 1, size: 1 };
        let session = registry.create_session("/tmp/old.md", None, baseline.clone(), ExternalResolution::OutsideLibrary);
        registry.set_join_state(&session.session_id, JoinState::Bound { item_id: 7 });
        registry.retarget(&session.session_id, "/tmp/new.md", None, baseline, ExternalResolution::OutsideLibrary);
        let current = registry.get(&session.session_id).unwrap();
        assert!(matches!(current.join_state, JoinState::NotJoined), "Save As to a new external path must not retain the old path's itemId");
    }

    #[test]
    fn open_hint_roundtrip() {
        let dir = unique_dir("hints");
        fs::create_dir_all(&dir).expect("dir");
        assert!(load_open_hints(&dir).is_empty());
        record_open_hint(&dir, "identity-1");
        let hints = load_open_hints(&dir);
        assert!(hints.contains_key("identity-1"));
        let _ = fs::remove_dir_all(dir);
    }
}
