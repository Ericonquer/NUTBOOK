//! PR A（计划 4.1–4.3）：文件夹接入编排。
//!
//! 稳定边界：
//! - 预检零数据库写入；候选内容读取 / 解析 / 渲染全部在事务外完成；
//! - 接入事务内按 PathIdentity + lexical overlap 重新核验父子来源与 root alias；
//! - 合并集合只包含本次有效候选清单覆盖的 single-file source：复用同一
//!   PathIdentity 对应的 item ID，标签 / 收藏 / 最近打开 / ignored 状态保留；
//! - 隐藏 / 依赖目录、不可读、编码不支持或超预算等排除 / 跳过项不转交
//!   folder owner，原 single-file link/library 保留（受控 overlap 例外）；
//! - 已有 manifest/discovered 结构化 owner 不被抢占，folder 只拿非 owner link；
//! - 合并前冻结旧来源 watcher（generation bump + unwatch），事务失败恢复；
//! - 数据库提交成功后再启动 folder watcher；失败进入 sync_state='waiting_sync'
//!   可恢复状态，由当前会话重试并在下次启动 catch-up 收敛。

use std::{
    collections::{HashMap, HashSet},
    fs,
    path::Path,
    sync::{
        atomic::AtomicU64,
        {Arc, Mutex, OnceLock},
    },
};

use sha2::{Digest, Sha256};

use crate::{
    core::{
        document::{content_hash, markdown_summary, render_markdown_as_html_for_file},
        html_text::extract_indexable_html_text,
        traversal::{preflight_folder, PreflightCandidate, PreflightProgress, TraversalPolicy},
        watcher::build_library_watcher,
    },
    db::{
        repositories::LibraryRepository,
        Database,
    },
    errors::AppError,
    models::{
        FolderIngestDbResult, FolderIngestRequest, FolderIngestResponse, FolderPreflightSummary,
        PreparedContent, PreparedIngestCandidate,
    },
    state::AppState,
};

/// Codex review R2-3：预检操作注册表（进程内）。每次预检是一个独立操作
/// （op），确认绑定具体 op 及其快照；同一路径的后续预检产生新 op，不覆盖
/// 先前 op 的快照。op 同时承载取消/进度信号（R2-2：命令层与预检内部共用
/// 同一个 `PreflightProgress` 实例）与轮询结果（R2-1：前端经 status 命令
/// 轮询，不依赖 Tauri 事件订阅）。
pub enum PreflightOpStatus {
    Running,
    Done(FolderPreflightSummary),
    Failed(String),
}

pub struct PreflightOp {
    /// 归一化 root 路径键（canonicalize 失败时退回 trim 后原路径）。
    pub root_key: String,
    /// 取消 / 进度信号；预检遍历直接使用本实例。
    pub progress: Arc<PreflightProgress>,
    pub status: PreflightOpStatus,
}

static PREFLIGHT_OPS: OnceLock<Mutex<HashMap<u64, PreflightOp>>> = OnceLock::new();
static OP_SEQ: AtomicU64 = AtomicU64::new(1);

fn op_registry() -> &'static Mutex<HashMap<u64, PreflightOp>> {
    PREFLIGHT_OPS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn next_op_id() -> u64 {
    OP_SEQ.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
}

fn snapshot_key(root_path: &str) -> String {
    fs::canonicalize(root_path)
        .map(|canonical| canonical.to_string_lossy().into_owned())
        .unwrap_or_else(|_| root_path.trim_end_matches('/').to_string())
}

/// 完成一次预检 op 的登记（成功时携带摘要快照；fatal/cancelled 也算 Done，
/// 由摘要的 fatal 字段表达，但不登记快照——没有可确认的候选集合）。
fn finish_op(op_id: u64, root_key: String, progress: Arc<PreflightProgress>, summary: FolderPreflightSummary) {
    if let Ok(mut registry) = op_registry().lock() {
        registry.insert(
            op_id,
            PreflightOp {
                root_key,
                progress,
                status: PreflightOpStatus::Done(summary),
            },
        );
    }
}

/// 保留的已完成 op 上限（防长会话累积；超出按 op_id 从小到大逐出）。
const MAX_FINISHED_OPS: usize = 16;

fn evict_finished_ops() {
    if let Ok(mut registry) = op_registry().lock() {
        let finished: Vec<u64> = registry
            .iter()
            .filter(|(_, op)| !matches!(op.status, PreflightOpStatus::Running))
            .map(|(id, _)| *id)
            .collect();
        if finished.len() > MAX_FINISHED_OPS {
            let mut sorted = finished;
            sorted.sort_unstable();
            let evict_count = sorted.len() - MAX_FINISHED_OPS;
            for id in sorted.into_iter().take(evict_count) {
                registry.remove(&id);
            }
        }
    }
}

/// 候选集合指纹：排序后的 `relative_path:content_hash` 行做 SHA-256。
/// 集合替换（同数量不同文件）与单文件内容变化都会改变指纹。
fn compute_candidate_fingerprint(candidates: &[PreflightCandidate]) -> String {
    let mut lines: Vec<String> = candidates
        .iter()
        .map(|candidate| {
            let relative = if candidate.relative_dir.is_empty() {
                candidate.file_name.clone()
            } else {
                format!("{}/{}", candidate.relative_dir, candidate.file_name)
            };
            format!("{}:{}", relative, candidate.content_hash)
        })
        .collect();
    lines.sort();
    let mut hasher = Sha256::new();
    for line in &lines {
        hasher.update(line.as_bytes());
        hasher.update(b"\n");
    }
    format!("{:x}", hasher.finalize())
}

/// 执行预检并产出摘要（零数据库写入）。进度/取消共用调用方给定的
/// progress 实例（R2-2）；不登记 op——登记由各入口自行决定。
fn run_preflight_summary(
    database: &Database,
    root_path: &str,
    progress: &Arc<PreflightProgress>,
) -> Result<FolderPreflightSummary, AppError> {
    let result = preflight_folder(root_path, &TraversalPolicy::default(), progress);

    let mut summary = FolderPreflightSummary {
        root_path: root_path.to_string(),
        candidate_count: 0,
        skipped_count: 0,
        merge_single_file_count: 0,
        preserve_single_file_count: 0,
        total_candidate_bytes: 0,
        over_limit: false,
        cancelled: false,
        fatal: None,
        skipped_samples: Vec::new(),
        fingerprint: String::new(),
        op_id: 0,
    };

    if let Some(fatal) = &result.fatal {
        summary.fatal = Some(match fatal {
            crate::core::traversal::PreflightFatal::RootUnreadable => "root_unreadable".to_string(),
            crate::core::traversal::PreflightFatal::OverLimit => {
                summary.over_limit = true;
                "over_limit".to_string()
            }
            crate::core::traversal::PreflightFatal::Cancelled => {
                summary.cancelled = true;
                "cancelled".to_string()
            }
        });
        return Ok(summary);
    }

    summary.candidate_count = result.candidates.len() as u64;
    summary.skipped_count = result.skipped.len() as u64;
    summary.total_candidate_bytes = result.total_candidate_bytes;
    summary.fingerprint = compute_candidate_fingerprint(&result.candidates);
    for skipped in result.skipped.iter().take(8) {
        summary.skipped_samples.push(format!(
            "{} ({})",
            skipped.path,
            skipped.reason.as_str()
        ));
    }

    let (merge, preserve) = analyze_single_file_sources(database, root_path, &result.candidates)?;
    summary.merge_single_file_count = merge;
    summary.preserve_single_file_count = preserve;

    Ok(summary)
}

/// 同步预检入口（保留给内部与测试）：创建 op、以同一 progress 实例执行、
/// 成功时登记快照并返回带 op_id 的摘要。
pub fn preflight_folder_ingest(
    database: &Database,
    root_path: &str,
) -> Result<FolderPreflightSummary, AppError> {
    let op_id = next_op_id();
    let progress = PreflightProgress::new();
    let mut summary = run_preflight_summary(database, root_path, &progress)?;
    if summary.fatal.is_none() {
        summary.op_id = op_id;
        finish_op(op_id, snapshot_key(root_path), progress, summary.clone());
    } else {
        summary.op_id = op_id;
        // fatal / cancelled：登记终态但不留快照（无候选集合可确认）。
        finish_op(op_id, snapshot_key(root_path), progress, summary.clone());
    }
    evict_finished_ops();
    Ok(summary)
}

/// 后台预检入口（R2-1/R2-2）：命令立即返回 op_id；预检在独立线程以注册表
/// 内同一 progress 实例执行（取消直达遍历检查点），结果写入 op 状态，
/// 前端经 `preflight_op_snapshot` 轮询，不依赖事件订阅时序。
pub fn start_background_preflight(database: Database, root_path: String) -> u64 {
    let op_id = next_op_id();
    let progress = PreflightProgress::new();
    let root_key = snapshot_key(&root_path);
    if let Ok(mut registry) = op_registry().lock() {
        registry.insert(
            op_id,
            PreflightOp {
                root_key: root_key.clone(),
                progress: progress.clone(),
                status: PreflightOpStatus::Running,
            },
        );
    }
    std::thread::spawn(move || {
        let summary = run_preflight_summary(&database, &root_path, &progress);
        match summary {
            Ok(mut summary) => {
                summary.op_id = op_id;
                finish_op(op_id, root_key, progress, summary);
            }
            Err(error) => {
                if let Ok(mut registry) = op_registry().lock() {
                    if let Some(op) = registry.get_mut(&op_id) {
                        op.status = PreflightOpStatus::Failed(error.to_string());
                    }
                }
            }
        }
        evict_finished_ops();
    });
    op_id
}

/// op 轮询载荷（R2-1：前端 invoke 轮询，无事件竞态）。
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreflightOpSnapshot {
    pub op_id: u64,
    /// running | done | failed
    pub status: String,
    pub candidate_count: u64,
    pub summary: Option<FolderPreflightSummary>,
    pub error: Option<String>,
}

pub fn preflight_op_snapshot(op_id: u64) -> Option<PreflightOpSnapshot> {
    let registry = op_registry().lock().ok()?;
    let op = registry.get(&op_id)?;
    let (status, summary, error) = match &op.status {
        PreflightOpStatus::Running => ("running".to_string(), None, None),
        PreflightOpStatus::Done(summary) => {
            ("done".to_string(), Some(summary.clone()), None)
        }
        PreflightOpStatus::Failed(error) => {
            ("failed".to_string(), None, Some(error.clone()))
        }
    };
    Some(PreflightOpSnapshot {
        op_id,
        candidate_count: op.progress.candidate_count.load(std::sync::atomic::Ordering::Relaxed),
        summary,
        status,
        error,
    })
}

pub fn cancel_preflight_op(op_id: u64) -> bool {
    let Ok(registry) = op_registry().lock() else {
        return false;
    };
    match registry.get(&op_id) {
        Some(op) => {
            op.progress
                .cancelled
                .store(true, std::sync::atomic::Ordering::Relaxed);
            true
        }
        None => false,
    }
}

/// 接入时解析用户确认绑定的快照（R2-3 / R3 fail closed）：
/// - `Found`：请求显式携带 preflight_op_id 且命中该 op（root 一致、已完成），
///   或未携带 op 时退回该路径最早登记的已完成 op；
/// - `ExplicitOpMissing`：请求**显式**携带 op_id 但无法解析（不存在、被逐出、
///   root 不匹配、op 未完成）。R3 P1：确认合同 fail closed——显式携带的确认
///   找不到对应快照时必须拒绝提交并要求重新确认，不得当作「无快照可校验」
///   放行（否则候选数量相同时未确认的新文件集合会被直接提交）；
/// - `Unavailable`：请求未携带 op 且该路径无任何已完成快照（未走预检的
///   内部/测试路径，保持兼容，不做指纹裁决）。
enum ConfirmationSnapshot {
    Found(FolderPreflightSummary),
    ExplicitOpMissing,
    Unavailable,
}

fn resolve_confirmation_snapshot(
    root_key: &str,
    preflight_op_id: Option<u64>,
) -> ConfirmationSnapshot {
    let fallback = || match preflight_op_id {
        Some(_) => ConfirmationSnapshot::ExplicitOpMissing,
        None => ConfirmationSnapshot::Unavailable,
    };
    let Ok(registry) = op_registry().lock() else {
        return fallback();
    };
    match preflight_op_id {
        Some(op_id) => {
            let Some(op) = registry.get(&op_id) else {
                return ConfirmationSnapshot::ExplicitOpMissing;
            };
            if op.root_key != root_key {
                return ConfirmationSnapshot::ExplicitOpMissing;
            }
            match &op.status {
                PreflightOpStatus::Done(summary) => {
                    ConfirmationSnapshot::Found(summary.clone())
                }
                _ => ConfirmationSnapshot::ExplicitOpMissing,
            }
        }
        None => {
            let mut candidates: Vec<(u64, &FolderPreflightSummary)> = registry
                .iter()
                .filter(|(_, op)| op.root_key == root_key)
                .filter_map(|(id, op)| match &op.status {
                    PreflightOpStatus::Done(summary) => Some((*id, summary)),
                    _ => None,
                })
                .collect();
            candidates.sort_by_key(|(id, _)| *id);
            match candidates.into_iter().next() {
                Some((_, summary)) => ConfirmationSnapshot::Found(summary.clone()),
                None => ConfirmationSnapshot::Unavailable,
            }
        }
    }
}

/// 接入成功后消费该路径全部 op（确认已兑现，快照作废）。
fn consume_ops_for_path(root_key: &str) {
    if let Ok(mut registry) = op_registry().lock() {
        registry.retain(|_, op| op.root_key != root_key);
    }
}

/// 重新确认响应（零数据库写入）：把本次最新摘要登记为新 op，响应携带其
/// op_id，前端可直接对最新摘要重新确认。
fn reconfirmation_response(
    mut summary: FolderPreflightSummary,
    root_key: &str,
) -> FolderIngestResponse {
    let fresh_op_id = next_op_id();
    summary.op_id = fresh_op_id;
    finish_op(
        fresh_op_id,
        root_key.to_string(),
        PreflightProgress::new(),
        summary.clone(),
    );
    evict_finished_ops();
    FolderIngestResponse {
        library: None,
        created_count: 0,
        merged_item_count: 0,
        merged_library_count: 0,
        preserved_single_file_count: 0,
        ignored_skip_count: 0,
        waiting_sync: false,
        needs_reconfirmation: true,
        cancelled: false,
        summary,
    }
}

/// 取消响应（零数据库写入）。R3：确认后、最终提交边界前的取消达到
/// 「什么都没发生」的语义。
fn cancelled_response(mut summary: FolderPreflightSummary) -> FolderIngestResponse {
    summary.cancelled = true;
    FolderIngestResponse {
        library: None,
        created_count: 0,
        merged_item_count: 0,
        merged_library_count: 0,
        preserved_single_file_count: 0,
        ignored_skip_count: 0,
        waiting_sync: false,
        needs_reconfirmation: false,
        cancelled: true,
        summary,
    }
}

fn empty_summary(root_path: &str) -> FolderPreflightSummary {
    FolderPreflightSummary {
        root_path: root_path.to_string(),
        candidate_count: 0,
        skipped_count: 0,
        merge_single_file_count: 0,
        preserve_single_file_count: 0,
        total_candidate_bytes: 0,
        over_limit: false,
        cancelled: false,
        fatal: None,
        skipped_samples: Vec::new(),
        fingerprint: String::new(),
        op_id: 0,
    }
}

/// R3 静态缺口：后台接入 op 注册表。`ingest_folder_command` 原为同步命令，
/// 确认后的遍历 + 内容准备都跑在 UI 命令线程上。改为 op 模型——命令立即
/// 返回 op_id，重活移交独立线程，前端轮询 `folder_ingest_status`；取消
/// 信号经共享 `AtomicBool` 直达提交边界检查点。
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestOpSnapshot {
    pub op_id: u64,
    /// running | done | failed
    pub status: String,
    pub response: Option<FolderIngestResponse>,
    pub error: Option<String>,
}

pub enum IngestOpStatus {
    Running,
    Done(FolderIngestResponse),
    Failed(String),
}

pub struct IngestOpRecord {
    /// R4 P1：取消与「进入提交」的裁决共用同一同步状态。
    pub gate: Arc<IngestCommitGate>,
    pub status: IngestOpStatus,
}

/// R4 P1：接入提交门。取消命令与接入线程的提交边界都经本门裁决，状态由
/// Mutex 串行化，不存在「取消检查之后、拿写锁之前」的竞态窗口：
/// - `request_cancel`：仅在 Open（尚未进入提交）时受理并返回 true；已在
///   Committing / Closed 时返回 false（准确告知取消未受理）；
/// - `begin_commit`：接入线程**拿到 DB 写锁之后**调用——此前已有取消受理
///   则返回 false（禁止提交，零数据库写入），否则原子切到 Committing；
/// - 进入 Committing 后提交不再被打断（短事务保证原子），先受理的取消
///   一定拦截在提交之前。
pub struct IngestCommitGate {
    state: Mutex<GateState>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum GateState {
    Open,
    CancelRequested,
    Committing,
    Closed,
}

impl IngestCommitGate {
    pub fn new() -> Self {
        Self {
            state: Mutex::new(GateState::Open),
        }
    }

    pub fn request_cancel(&self) -> bool {
        let mut state = self.state.lock().expect("ingest gate poisoned");
        if *state == GateState::Open {
            *state = GateState::CancelRequested;
            true
        } else {
            false
        }
    }

    /// 必须在持有 DB 写锁后调用。返回 false = 已有取消在先，禁止提交。
    pub fn begin_commit(&self) -> bool {
        let mut state = self.state.lock().expect("ingest gate poisoned");
        if *state == GateState::Open {
            *state = GateState::Committing;
            true
        } else {
            false
        }
    }

    pub fn is_cancel_requested(&self) -> bool {
        *self.state.lock().expect("ingest gate poisoned") == GateState::CancelRequested
    }

    /// op 终态登记后关闭：之后的取消请求如实返回未受理。
    pub fn finish(&self) {
        let mut state = self.state.lock().expect("ingest gate poisoned");
        if *state != GateState::Committing {
            *state = GateState::Closed;
        }
    }
}

static INGEST_OPS: OnceLock<Mutex<HashMap<u64, IngestOpRecord>>> = OnceLock::new();

fn ingest_op_registry() -> &'static Mutex<HashMap<u64, IngestOpRecord>> {
    INGEST_OPS.get_or_init(|| Mutex::new(HashMap::new()))
}

const MAX_FINISHED_INGEST_OPS: usize = 16;

fn evict_finished_ingest_ops() {
    if let Ok(mut registry) = ingest_op_registry().lock() {
        let finished: Vec<u64> = registry
            .iter()
            .filter(|(_, op)| !matches!(op.status, IngestOpStatus::Running))
            .map(|(id, _)| *id)
            .collect();
        if finished.len() > MAX_FINISHED_INGEST_OPS {
            let mut sorted = finished;
            sorted.sort_unstable();
            let evict_count = sorted.len() - MAX_FINISHED_INGEST_OPS;
            for id in sorted.into_iter().take(evict_count) {
                registry.remove(&id);
            }
        }
    }
}

pub fn register_ingest_op() -> u64 {
    let op_id = next_op_id();
    if let Ok(mut registry) = ingest_op_registry().lock() {
        registry.insert(
            op_id,
            IngestOpRecord {
                gate: Arc::new(IngestCommitGate::new()),
                status: IngestOpStatus::Running,
            },
        );
    }
    op_id
}

pub fn ingest_op_gate(op_id: u64) -> Option<Arc<IngestCommitGate>> {
    let registry = ingest_op_registry().lock().ok()?;
    registry.get(&op_id).map(|op| op.gate.clone())
}

pub fn finish_ingest_op(op_id: u64, result: Result<FolderIngestResponse, AppError>) {
    if let Ok(mut registry) = ingest_op_registry().lock() {
        if let Some(op) = registry.get_mut(&op_id) {
            op.gate.finish();
            op.status = match result {
                Ok(response) => IngestOpStatus::Done(response),
                Err(error) => IngestOpStatus::Failed(error.to_string()),
            };
        }
    }
    evict_finished_ingest_ops();
}

pub fn ingest_op_snapshot(op_id: u64) -> Option<IngestOpSnapshot> {
    let registry = ingest_op_registry().lock().ok()?;
    let op = registry.get(&op_id)?;
    let (status, response, error) = match &op.status {
        IngestOpStatus::Running => ("running".to_string(), None, None),
        IngestOpStatus::Done(response) => (
            "done".to_string(),
            Some(response.clone()),
            None,
        ),
        IngestOpStatus::Failed(error) => ("failed".to_string(), None, Some(error.clone())),
    };
    Some(IngestOpSnapshot {
        op_id,
        status,
        response,
        error,
    })
}

pub fn cancel_ingest_op(op_id: u64) -> bool {
    let Ok(registry) = ingest_op_registry().lock() else {
        return false;
    };
    match registry.get(&op_id) {
        Some(op) => op.gate.request_cancel(),
        None => false,
    }
}

/// 单文件来源合并 / 保留分析（只读）：
/// - 目标文件身份落在有效候选清单内的 single-file library 计入合并；
/// - 位于 folder root 内但不在候选清单内（隐藏 / 依赖目录、排除或跳过）的
///   single-file library 计入保留。
pub(crate) fn analyze_single_file_sources(
    database: &Database,
    root_path: &str,
    candidates: &[PreflightCandidate],
) -> Result<(u64, u64), AppError> {
    let candidate_identities: HashSet<&str> = candidates
        .iter()
        .map(|candidate| candidate.identity.as_str())
        .collect();

    let root_identity = fs::canonicalize(root_path)
        .ok()
        .map(|path| path.to_string_lossy().into_owned());
    let root_prefix = root_identity.as_deref().map(|identity| format!("{identity}/"));

    let single_file_libraries = database.list_single_file_libraries()?;
    let mut merge_count = 0_u64;
    let mut preserve_count = 0_u64;
    for (_id, file_root) in single_file_libraries {
        let identity = fs::canonicalize(&file_root)
            .ok()
            .map(|path| path.to_string_lossy().into_owned());
        if let Some(identity) = &identity {
            if candidate_identities.contains(identity.as_str()) {
                merge_count += 1;
                continue;
            }
        }
        // 保留判定：canonical 路径位于 root 内；identity 不可解析时退回
        // lexical 前缀判断（missing / 离线路径无法 canonicalize）。
        let inside = match (&root_prefix, &identity) {
            (Some(prefix), Some(identity)) => identity.starts_with(prefix.as_str()),
            _ => Path::new(&file_root).starts_with(root_path),
        };
        if inside {
            preserve_count += 1;
        }
    }
    Ok((merge_count, preserve_count))
}

/// 接入编排（计划 4.1 步骤 4–6 / 4.3）。
///
/// Codex review 修正后的流程：
/// - 全程只跑一次预检；摘要、指纹校验、内容准备共用同一候选明细，
///   不存在「第二次扫描结果与准备失败未复核」的缝隙；
/// - 候选快照校验：当前候选集合/内容指纹必须与用户确认的那次预检一致
///   （数量相同但集合替换、或单文件内容变化 → needs_reconfirmation）；
/// - 预检与内容准备不持全局写锁；写锁只覆盖 watcher 冻结 + 短事务，
///   不再阻塞后台 catch-up 贯穿整个预检。
/// 探针/测试用同步入口（断言保持不变）。生产链路走
/// `ingest_folder_with_cancel`（命令层经 op 注册表传取消信号）。
pub fn ingest_folder(
    state: &AppState,
    request: &FolderIngestRequest,
) -> Result<FolderIngestResponse, AppError> {
    ingest_folder_with_cancel(state, request, None)
}

/// R3 静态缺口 + R4 P1：可取消接入。重活（预检重跑 + 内容准备 + 短事务）
/// 由命令层移交后台线程执行；取消检查点覆盖「开始 → 预检遍历 → 内容准备
/// 逐候选 → 拿写锁后 begin_commit 裁决」。最终提交边界 = **持有 DB 写锁
/// 后**经 `IngestCommitGate::begin_commit` 原子裁决——先受理的取消拦截在
/// 提交之前；先进入 Committing 的提交不再被打断，取消命令返回未受理。
pub fn ingest_folder_with_cancel(
    state: &AppState,
    request: &FolderIngestRequest,
    gate: Option<Arc<IngestCommitGate>>,
) -> Result<FolderIngestResponse, AppError> {
    let is_cancelled =
        || gate.as_ref().is_some_and(|gate| gate.is_cancel_requested());
    let root_path = request.root_path.trim().to_string();
    if root_path.is_empty() {
        return Err(AppError::InvalidParams);
    }
    // 取消检查点 0：尚未做任何工作。
    if is_cancelled() {
        return Ok(cancelled_response(empty_summary(&root_path)));
    }

    // 1) 唯一一次预检：候选明细同时供摘要 / 指纹 / 内容准备使用。
    //    R4：接入阶段的预检遍历直接挂接提交门——取消在遍历检查点即时生效，
    //    不再等到内容准备 / 提交阶段（预检 progress 不再是孤立实例）。
    let progress: Arc<PreflightProgress> = match &gate {
        Some(gate) => {
            let signal = gate.clone();
            PreflightProgress::with_external_cancel(Arc::new(move || signal.is_cancel_requested()))
        }
        None => PreflightProgress::new(),
    };
    let preflight = preflight_folder(&root_path, &TraversalPolicy::default(), &progress);
    if preflight.fatal.is_some() {
        // 预检被取消属于正常退出（零数据库写入），不是参数错误。
        if is_cancelled() {
            return Ok(cancelled_response(empty_summary(&root_path)));
        }
        return Err(AppError::InvalidParams);
    }

    let mut summary = FolderPreflightSummary {
        root_path: root_path.clone(),
        candidate_count: preflight.candidates.len() as u64,
        skipped_count: preflight.skipped.len() as u64,
        merge_single_file_count: 0,
        preserve_single_file_count: 0,
        total_candidate_bytes: preflight.total_candidate_bytes,
        over_limit: false,
        cancelled: false,
        fatal: None,
        skipped_samples: preflight
            .skipped
            .iter()
            .take(8)
            .map(|skipped| format!("{} ({})", skipped.path, skipped.reason.as_str()))
            .collect(),
        fingerprint: compute_candidate_fingerprint(&preflight.candidates),
        op_id: 0,
    };

    // 2) 单文件合并 / 保留分析（只读）。
    let (merge, preserve) =
        analyze_single_file_sources(&state.database, &root_path, &preflight.candidates)?;
    summary.merge_single_file_count = merge;
    summary.preserve_single_file_count = preserve;

    // 2.5) 只读 overlap 预检（Codex review P1-7）：父子 / symlink alias 重叠
    //      以 Err 硬失败返回，先于快照确认闸门，不被 needs_reconfirmation 掩盖。
    state.database.precheck_folder_overlap(&root_path)?;

    // 3) 候选快照校验（Codex review P1-6 / R2-3 / R3 fail closed）：
    //    - 显式携带 op_id：必须命中该 op 且 root 一致，否则 fail closed
    //      （R3 P1：快照失效时拒绝提交并要求重新确认，不得放行未确认集合）；
    //    - 未携带：退回该路径最早登记的快照；都没有则不做指纹裁决；
    //    - 数量与用户确认值不一致 → 重新确认；
    //    - 绑定快照的集合/内容指纹与本次预检不一致 → 重新确认。
    //    同一路径上后续的预检 op 不会替换先前 op 的快照，首次确认始终
    //    可被校验。重新确认路径会把本次预检登记为新 op（响应携带其
    //    op_id），前端可直接对最新摘要重新确认。
    let root_key = snapshot_key(&root_path);
    let confirmed_mismatch = request
        .confirmed_candidate_count
        .map(|confirmed| confirmed != summary.candidate_count)
        .unwrap_or(false);
    match resolve_confirmation_snapshot(&root_key, request.preflight_op_id) {
        ConfirmationSnapshot::Found(saved) => {
            if saved.fingerprint != summary.fingerprint
                || saved.candidate_count != summary.candidate_count
            {
                return Ok(reconfirmation_response(summary, &root_key));
            }
        }
        ConfirmationSnapshot::ExplicitOpMissing => {
            // R3 P1：显式确认引用的快照已失效（不存在 / 被逐出 / root 不匹配
            // / op 未完成）→ 零数据库写入，要求重新确认。
            return Ok(reconfirmation_response(summary, &root_key));
        }
        ConfirmationSnapshot::Unavailable => {}
    }
    if confirmed_mismatch {
        return Ok(reconfirmation_response(summary, &root_key));
    }

    // 4) 事务外内容准备：读取 / 解析 / 渲染；读失败按 recoverable 跳过。
    let ignored_paths: HashSet<String> = state
        .database
        .list_ignored_paths()?
        .into_iter()
        .collect();
    let mut prepared: Vec<PreparedIngestCandidate> = Vec::new();
    let mut ignored_skip_count = 0_u64;
    let mut content_failures = 0_u64;
    for candidate in &preflight.candidates {
        // 取消检查点 1：内容准备逐候选检查（大目录可及时退出）。
        if is_cancelled() {
            return Ok(cancelled_response(summary));
        }
        if ignored_paths.contains(&candidate.path) {
            // ignored / removed 记录不因 folder 接入自动恢复（计划 5.2）。
            ignored_skip_count += 1;
            continue;
        }
        match prepare_candidate(&root_path, candidate) {
            Some(item) => prepared.push(item),
            None => content_failures += 1,
        }
    }
    if content_failures > 0 {
        // 提交前完整复核：确认后仍有候选读不出来 → 以最新计数要求重新确认，
        // 不允许「确认 5 个、悄悄接入 4 个」。本次预检登记为新 op，响应携带
        // op_id 供前端直接对最新摘要重新确认。
        summary.skipped_count += content_failures;
        return Ok(reconfirmation_response(summary, &root_key));
    }

    // 取消检查点 2（快速路径）：已受理的取消在等锁前直接退出，避免无谓
    // 等待全局写锁。权威裁决见下方 begin_commit（R4 P1）。
    if is_cancelled() {
        return Ok(cancelled_response(summary));
    }

    // 5) 合并前冻结旧来源 watcher + 短事务：从这里开始才持全局 DB 写锁，
    //    预检 / 内容准备不再阻塞后台 catch-up（Codex review 静态缺口）。
    //    R4 P1：等锁可能横跨其他扫描的全过程——真正的提交边界裁决
    //    `begin_commit` 发生在拿到写锁之后，与取消命令经同一把门锁串行化：
    //    先受理的取消在此拦截（零提交）；先进入 Committing 的提交走完，
    //    取消命令返回未受理（准确状态）。
    let db_write_lock = state.scan_coordinator().db_write_lock();
    let _db_guard = db_write_lock.lock().map_err(|_| AppError::InternalError)?;
    if let Some(gate) = &gate {
        if !gate.begin_commit() {
            drop(_db_guard);
            return Ok(cancelled_response(summary));
        }
    }

    let merge_library_ids = merge_library_ids_for(&state.database, &root_path, &preflight.candidates)?;
    for library_id in &merge_library_ids {
        state.scan_coordinator().bump_generation(*library_id);
        if state.unwatch_library(*library_id).is_err() {
            eprintln!("Nutbook watcher freeze failed for library {library_id}");
        }
    }

    let now = current_timestamp();

    let db_result: FolderIngestDbResult = match state.database.ingest_folder_source(
        &root_path,
        &prepared,
        &merge_library_ids,
        &now,
    ) {
        Ok(result) => result,
        Err(error) => {
            restore_frozen_watchers(state, &merge_library_ids);
            return Err(error);
        }
    };
    drop(_db_guard);

    // 5.5) 确认已兑现：消费该路径全部 op 快照（R2-3）。
    consume_ops_for_path(&root_key);

    // 6) 事务成功：为仍存在的旧 single-file 来源恢复 watcher
    //    （合并后 library 被删除的不再恢复；保留来源必须恢复监听）。
    restore_frozen_watchers(state, &merge_library_ids);

    let mut waiting_sync = false;
    if let Some(library) = &db_result.library {
        if !db_result.already_existing {
            // 7) 数据库提交成功后启动 folder watcher；失败进入等待同步。
            match build_library_watcher(state.scan_coordinator().clone(), library.clone()) {
                Ok(watcher) => {
                    if state.watch_library(library.id, watcher).is_err() {
                        waiting_sync = mark_waiting_sync(&state.database, library.id);
                    }
                }
                Err(_) => {
                    waiting_sync = mark_waiting_sync(&state.database, library.id);
                }
            }
        }
    }

    Ok(FolderIngestResponse {
        library: db_result.library,
        created_count: db_result.created_count,
        merged_item_count: db_result.merged_item_count,
        merged_library_count: db_result.merged_library_count,
        preserved_single_file_count: db_result.preserved_single_file_count,
        ignored_skip_count,
        waiting_sync,
        needs_reconfirmation: false,
        cancelled: false,
        summary,
    })
}

/// 事务失败后恢复被冻结的 single-file watcher（best-effort；watcher 事件批次
/// 按 generation 复核，重建后的批次携带最新 generation，不会卡 fence）。
fn restore_frozen_watchers(state: &AppState, merge_library_ids: &[i64]) {
    for library_id in merge_library_ids {
        let libraries = match state.list_libraries() {
            Ok(libraries) => libraries,
            Err(_) => continue,
        };
        let Some(library) = libraries.iter().find(|library| library.id == *library_id) else {
            continue;
        };
        if library.source_kind != "file" {
            continue;
        }
        match build_library_watcher(state.scan_coordinator().clone(), library.clone()) {
            Ok(watcher) => {
                if let Err(error) = state.watch_library(*library_id, watcher) {
                    eprintln!("Nutbook watcher restore failed for library {library_id}: {error}");
                }
            }
            Err(error) => {
                eprintln!("Nutbook watcher restore failed for library {library_id}: {error}");
            }
        }
    }
}

fn mark_waiting_sync(database: &Database, library_id: i64) -> bool {
    if let Err(error) = database.set_library_sync_state(library_id, "waiting_sync") {
        eprintln!("Nutbook waiting_sync mark failed for library {library_id}: {error}");
    }
    true
}

/// 合并集合的 library id 列表（事务内还会按数据库当前状态重新核验）。
fn merge_library_ids_for(
    database: &Database,
    root_path: &str,
    candidates: &[PreflightCandidate],
) -> Result<Vec<i64>, AppError> {
    let candidate_identities: HashSet<&str> = candidates
        .iter()
        .map(|candidate| candidate.identity.as_str())
        .collect();
    let single_file_libraries = database.list_single_file_libraries()?;
    let mut ids = Vec::new();
    for (id, file_root) in single_file_libraries {
        if let Ok(identity) = fs::canonicalize(&file_root) {
            if candidate_identities.contains(identity.to_string_lossy().as_ref()) {
                ids.push(id);
            }
        }
    }
    let _ = root_path;
    Ok(ids)
}

/// 事务外准备单个候选：读取、解析、渲染。读失败返回 None（recoverable 跳过）。
fn prepare_candidate(root_path: &str, candidate: &PreflightCandidate) -> Option<PreparedIngestCandidate> {
    let raw = fs::read_to_string(&candidate.path).ok()?;
    let hash = content_hash(&raw);

    let relative_path = if candidate.relative_dir.is_empty() {
        candidate.file_name.clone()
    } else {
        format!("{}/{}", candidate.relative_dir, candidate.file_name)
    };
    // DB 内 file_path 统一以 folder root 前缀存储（与完整扫描同形）。
    let file_path = Path::new(root_path)
        .join(&relative_path)
        .to_string_lossy()
        .into_owned();

    let content = match candidate.file_type {
        "markdown" => Some(PreparedContent {
            file_hash: hash,
            source_text: raw.clone(),
            raw_text: raw.clone(),
            rendered: Some(render_markdown_as_html_for_file(&raw, &candidate.file_name)),
            summary: Some(markdown_summary(&raw)),
        }),
        "html" => Some(PreparedContent {
            file_hash: hash,
            source_text: raw.clone(),
            raw_text: extract_indexable_html_text(&raw),
            rendered: None,
            summary: None,
        }),
        _ => None,
    }?;

    Some(PreparedIngestCandidate {
        file_path,
        identity: candidate.identity.clone(),
        relative_path,
        file_name: candidate.file_name.clone(),
        file_ext: candidate.file_ext.clone(),
        file_type: candidate.file_type.to_string(),
        file_size: candidate.size as i64,
        modified_at: candidate.mtime_after.clone(),
        snapshot_mtime: candidate.mtime_before.clone(),
        snapshot_size: candidate.size as i64,
        content: Some(content),
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
    use super::prepare_candidate;
    use crate::core::traversal::{
        preflight_folder, PreflightCandidate, PreflightProgress, TraversalPolicy,
    };
    use std::{fs, path::PathBuf};

    fn unique_dir(tag: &str) -> PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        std::env::temp_dir().join(format!("nutbook-ingest-{tag}-{nanos}"))
    }

    #[test]
    fn prepare_candidate_builds_folder_prefixed_paths_and_content() {
        let root = unique_dir("prepare");
        fs::create_dir_all(root.join("dist")).expect("dirs");
        fs::write(root.join("note.md"), "# 标题\n\n正文内容").expect("write md");
        fs::write(root.join("dist/page.html"), "<html><body>hi</body></html>").expect("write html");

        let progress = PreflightProgress::new();
        let result = preflight_folder(
            root.to_str().expect("utf8"),
            &TraversalPolicy::default(),
            &progress,
        );
        assert!(result.fatal.is_none());
        assert_eq!(result.candidates.len(), 2);

        for candidate in &result.candidates {
            let prepared = prepare_candidate(root.to_str().expect("utf8"), candidate)
                .expect("prepare should succeed");
            assert!(prepared.file_path.starts_with(root.to_string_lossy().as_ref()));
            assert!(prepared.content.is_some());
            let content = prepared.content.as_ref().expect("content");
            assert_eq!(content.file_hash.len(), 64);
            if candidate.file_type == "markdown" {
                assert!(content.rendered.is_some());
                assert!(content.summary.is_some());
            } else {
                assert!(content.rendered.is_none());
                assert!(!content.raw_text.is_empty());
            }
        }

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn prepare_candidate_returns_none_for_unreadable_file() {
        let missing = unique_dir("missing");
        let candidate = PreflightCandidate {
            path: missing.join("gone.md").to_string_lossy().into_owned(),
            identity: String::new(),
            file_type: "markdown",
            file_ext: "md".to_string(),
            file_name: "gone.md".to_string(),
            relative_dir: String::new(),
            size: 10,
            mtime_before: "0".to_string(),
            mtime_after: "0".to_string(),
            content_hash: String::new(),
        };
        assert!(prepare_candidate("/tmp", &candidate).is_none());
    }

    #[test]
    fn ingest_folder_merges_single_file_and_watches_folder() {
        use super::{ingest_folder, preflight_folder_ingest};
        use crate::{
            db::{repositories::{ItemRepository, LibraryRepository}, Database},
            models::{FolderIngestRequest, IndexedItemRecord, Library, ListItemsQuery},
            state::AppState,
        };

        let root = unique_dir("orchestrate");
        fs::create_dir_all(&root).expect("dirs");
        fs::write(root.join("note.md"), "# 编排验收 orchestrate-token").expect("write");

        // 预先单独加入 note.md 作为 single-file source。
        let note_path = root.join("note.md").to_string_lossy().into_owned();
        let single = Library {
            id: 1,
            name: "note.md".to_string(),
            root_path: note_path.clone(),
            source_kind: "file".to_string(),
            path_state: "valid".to_string(),
            is_active: true,
            created_at: "1".to_string(),
            updated_at: "1".to_string(),
            last_scanned_at: None,
            skill_binding: None,
        };
        let path = unique_dir("orchestrate-db").with_extension("sqlite3");
        let database = Database::new(&path).expect("db");
        database.upsert_library(single).expect("single lib");
        database
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: note_path.clone(),
                    relative_path: "note.md".to_string(),
                    file_name: "note.md".to_string(),
                    file_ext: "md".to_string(),
                    file_type: "markdown".to_string(),
                    file_size: 40,
                    modified_at: "100.0".to_string(),
                    created_at: "1".to_string(),
                    updated_at: "1".to_string(),
                }],
            )
            .expect("scan single");

        let state = AppState::new(database, std::env::temp_dir());
        // 真实流程：先预检（保存候选快照），确认后再接入。
        let preflight = preflight_folder_ingest(&state.database, root.to_str().expect("utf8"))
            .expect("preflight");
        assert_eq!(preflight.candidate_count, 1);
        let response = ingest_folder(
            &state,
            &FolderIngestRequest {
                root_path: root.to_string_lossy().into_owned(),
                confirmed_candidate_count: Some(1),
            preflight_op_id: None,},
        )
        .expect("ingest");

        assert!(!response.needs_reconfirmation);
        let folder = response.library.expect("folder library");
        assert_eq!(response.merged_item_count, 1);
        assert_eq!(response.merged_library_count, 1);
        assert_eq!(response.created_count, 0);
        assert!(state.is_library_watched(folder.id), "folder watcher must start");

        // 冗余 single-file library 删除；item 保留（路径不变、可搜索）。
        let libraries = state.list_libraries().expect("libraries");
        assert!(libraries.iter().all(|library| library.id != 1));
        let items = state
            .database
            .list_items(&ListItemsQuery::default())
            .expect("items");
        assert_eq!(items.total, 1);
        assert_eq!(items.items[0].id, {
            // item ID 保留：唯一 item 即合并前的 item。
            let detail = state.database.get_item_detail(items.items[0].id).expect("detail");
            detail.summary.id
        });

        // 确认计数过期：要求重新确认，零数据库写入。
        let stale = ingest_folder(
            &state,
            &FolderIngestRequest {
                root_path: root.to_string_lossy().into_owned(),
                confirmed_candidate_count: Some(999),
            preflight_op_id: None,},
        )
        .expect("stale ingest");
        assert!(stale.needs_reconfirmation);
        assert!(stale.library.is_none());

        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_file(path);
    }
}
