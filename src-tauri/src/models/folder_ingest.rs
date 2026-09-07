use crate::models::Library;
use serde::{Deserialize, Serialize};

/// PR A（计划 4.1/4.2）：文件夹预检摘要 —— 预检零数据库写入。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderPreflightSummary {
    pub root_path: String,
    /// 将接入的 Markdown/HTML 候选数（含子文件夹、dist 产物）。
    pub candidate_count: u64,
    /// 预检阶段跳过数（排除目录、不可读、超预算、编码不支持等）。
    pub skipped_count: u64,
    /// 将自动并入 folder 来源的单文件来源数（有效候选清单覆盖）。
    pub merge_single_file_count: u64,
    /// 保留的单文件来源数（位于 folder 内但被扫描策略排除/跳过，
    /// 不转交 folder owner，元数据与独立 watcher 归原来源管理）。
    pub preserve_single_file_count: u64,
    pub total_candidate_bytes: u64,
    /// 超出预检边界（候选数 / 总字节 / 时间 / 目录数）。
    pub over_limit: bool,
    /// 预检被取消。
    pub cancelled: bool,
    /// fatal 错误（root 不可读 / 越界超限），发生时不创建来源。
    pub fatal: Option<String>,
    /// 跳过项摘要（最多 8 条，供确认 UI 说明跳过目录规则）。
    pub skipped_samples: Vec<String>,
    /// 候选集合/内容指纹（Codex review P1-6）：确认与接入之间用于校验
    /// 候选集合或单文件内容是否变化。
    pub fingerprint: String,
    /// 本次预检对应的操作 id（Codex review R2）：确认绑定具体操作及其
    /// 快照；接入请求携带该 id 才能对上用户确认的那一次预检。
    pub op_id: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderIngestRequest {
    pub root_path: String,
    /// 用户确认时的候选数；接入时与最新预检结果不一致则要求重新确认。
    pub confirmed_candidate_count: Option<u64>,
    /// 用户确认的那次预检操作 id（Codex review R2-3）。确认绑定具体操作
    /// 及其快照：同一路径后续的预检不会替换先前操作的快照；接入时按该
    /// id 找到确认对应的快照做指纹校验。缺省时退回该路径最早未消费的
    /// 快照（无任何快照则不做指纹裁决）。
    pub preflight_op_id: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FolderIngestResponse {
    /// 新建的 folder library；needs_reconfirmation / 无来源时为 None。
    pub library: Option<Library>,
    pub created_count: u64,
    /// 合并的单文件 item 数（item ID 与元数据保留）。
    pub merged_item_count: u64,
    /// 已删除的冗余 single-file library 数。
    pub merged_library_count: u64,
    pub preserved_single_file_count: u64,
    /// 命中 ignored 记录而未自动恢复/接入的候选数。
    pub ignored_skip_count: u64,
    /// watcher 激活失败，来源进入「等待同步」可恢复状态。
    pub waiting_sync: bool,
    /// 提交前快照复核发现候选集合/内容变化，需要重新确认。
    pub needs_reconfirmation: bool,
    /// R3：接入在提交边界前被用户取消，零数据库写入。
    pub cancelled: bool,
    pub summary: FolderPreflightSummary,
}

/// 事务外准备好的单个候选（内容读取/解析/渲染在事务外完成，计划 4.3）。
#[derive(Debug, Clone)]
pub struct PreparedIngestCandidate {
    /// DB 内 file_path（以 folder root 前缀存储）。
    pub file_path: String,
    /// canonical 身份（候选在预检时已可解析）。
    pub identity: String,
    pub relative_path: String,
    pub file_name: String,
    pub file_ext: String,
    pub file_type: String,
    pub file_size: i64,
    pub modified_at: String,
    /// 提交前 fingerprint 复核依据（预检快照的纳秒 mtime / 大小）。
    pub snapshot_mtime: String,
    pub snapshot_size: i64,
    pub content: Option<PreparedContent>,
}

#[derive(Debug, Clone)]
pub struct PreparedContent {
    pub file_hash: String,
    pub raw_text: String,
    pub source_text: String,
    /// markdown：渲染后的 HTML（item_content.rendered_cache）。
    pub rendered: Option<String>,
    /// markdown：摘要。
    pub summary: Option<String>,
}

/// 单文件来源合并决策（事务内由数据库当前状态裁决）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SingleFileMerge {
    /// folder 成为唯一 owner，删除该 single-file link/library。
    Merge,
    /// 保留原 single-file library（例如仍拥有 companion item），folder 共享非 owner link。
    KeepLibrary,
}

/// 事务内接入结果（db 层回传，core 层补充 watcher 状态后转 FolderIngestResponse）。
#[derive(Debug, Clone)]
pub struct FolderIngestDbResult {
    /// 新建（或幂等选中的既有）folder library。
    pub library: Option<Library>,
    /// 同一 normalized / identity 路径的 folder 来源已存在：幂等选择，不重扫。
    pub already_existing: bool,
    pub created_count: u64,
    pub merged_item_count: u64,
    pub merged_library_count: u64,
    pub preserved_single_file_count: u64,
}
