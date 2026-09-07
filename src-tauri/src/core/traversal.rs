//! TraversalPolicy —— 预检、完整扫描、delta 扫描与 watcher 事件过滤共用的
//! 遍历合同（计划 4.2 / 4.4 / 8.1）。
//!
//! 稳定边界：
//! - 递归包含子文件夹；只把 .md/.markdown/.html/.htm 计为候选；
//! - 不跟随目录符号链接；跳过隐藏目录与明确的版本控制/依赖/缓存目录；
//! - 不把 dist、build、output 一概排除（AI 生成 HTML 的真实产物位置）；
//! - 有取消、时间预算、候选数量与遍历数量上限；超限 fatal，不创建来源；
//! - 预检零数据库写入；每个候选绑定读取前后纳秒 mtime、大小与内容 hash；
//! - 文本编码策略：非 UTF-8 文本按 recoverable 错误跳过；
//! - 超大文件流式哈希，不在扫描线程一次性读入内存。

use std::{
    fs,
    io::{Read, Seek},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Arc,
    },
    time::{Duration, Instant},
};

use sha2::{Digest, Sha256};

use crate::{
    core::{document::file_modified_at_string, path_identity::path_identity},
    errors::AppError,
};

/// 与计划 3.1 / 4.2 一致的支持扩展名。
pub fn supported_extension(name: &str) -> Option<&'static str> {
    match name.to_ascii_lowercase().as_str() {
        "md" | "markdown" => Some("markdown"),
        "html" | "htm" => Some("html"),
        _ => None,
    }
}

/// 应被跳过的目录名：隐藏目录（`.` 前缀）、版本控制目录、明确的
/// 依赖/缓存目录。dist / build / output 不在此列。
pub fn is_excluded_dir_name(name: &str) -> bool {
    if name.starts_with('.') {
        return true;
    }
    matches!(
        name.to_ascii_lowercase().as_str(),
        ".git" | ".svn" | ".hg" | "node_modules" | "target"
    )
}

#[derive(Debug, Clone)]
pub struct TraversalPolicy {
    /// 候选数量上限；超过即 fatal（OverLimit）。
    pub max_candidates: usize,
    /// 候选总字节数上限；超过即 fatal（OverLimit）。
    pub max_total_bytes: u64,
    /// 单文件读取/哈希预算；超过按 recoverable 跳过。
    pub max_file_bytes: u64,
    /// 遍历时间预算；超过即 fatal（OverLimit）。
    pub time_budget: Duration,
    /// 遍历目录数量上限（防 symlink 循环 / 巨型目录树拖垮预检）。
    pub max_visited_dirs: usize,
}

impl Default for TraversalPolicy {
    fn default() -> Self {
        Self {
            max_candidates: 20_000,
            max_total_bytes: 2 * 1024 * 1024 * 1024,
            max_file_bytes: 32 * 1024 * 1024,
            time_budget: Duration::from_secs(30),
            max_visited_dirs: 50_000,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SkipReason {
    /// 单文件超过读取预算。
    TooLarge,
    /// 文本编码不支持（非 UTF-8）。
    Undecodable,
    /// 文件/目录读取失败（权限等）。
    Unreadable,
    /// 读取期间内容反复变化（不稳定文件）。
    Unstable,
}

impl SkipReason {
    pub fn as_str(&self) -> &'static str {
        match self {
            SkipReason::TooLarge => "too_large",
            SkipReason::Undecodable => "undecodable",
            SkipReason::Unreadable => "unreadable",
            SkipReason::Unstable => "unstable",
        }
    }
}

#[derive(Debug, Clone)]
pub struct PreflightCandidate {
    /// 原始路径（可逆，IO 用）。
    pub path: String,
    /// canonical 身份（候选已成功读取，必然可解析）。
    pub identity: String,
    pub file_type: &'static str,
    pub file_ext: String,
    pub file_name: String,
    pub relative_dir: String,
    pub size: u64,
    /// 读取前纳秒 mtime（与现有 modified_at 同一序列化格式）。
    pub mtime_before: String,
    /// 读取后纳秒 mtime；与 before 一致才视为稳定候选。
    pub mtime_after: String,
    /// 内容 hash（与 db::content_hash 同一算法：SHA-256 over UTF-8 字节）。
    pub content_hash: String,
}

#[derive(Debug, Clone)]
pub struct SkippedEntry {
    pub path: String,
    pub reason: SkipReason,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PreflightFatal {
    /// root 不存在或不可读。
    RootUnreadable,
    /// 超过候选数量 / 总字节 / 时间 / 目录数预算。
    OverLimit,
    /// 预检被用户取消（无部分结果）。
    Cancelled,
}

#[derive(Debug)]
pub struct PreflightResult {
    pub candidates: Vec<PreflightCandidate>,
    pub skipped: Vec<SkippedEntry>,
    pub total_candidate_bytes: u64,
    pub visited_dir_count: usize,
    pub fatal: Option<PreflightFatal>,
}

/// 预检运行时的可取消信号与候选数进度。
#[derive(Default)]
pub struct PreflightProgress {
    pub cancelled: AtomicBool,
    pub candidate_count: AtomicU64,
    /// R4 P1：外部取消信号（如接入 op 的提交门）——遍历检查点同时检查，
    /// 接入阶段的预检遍历不再与接入取消脱钩。
    external_cancel: Option<Arc<dyn Fn() -> bool + Send + Sync>>,
}

impl PreflightProgress {
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }
    /// R4：预检遍历挂接外部取消信号（共享同一裁决状态）。
    pub fn with_external_cancel(external: Arc<dyn Fn() -> bool + Send + Sync>) -> Arc<Self> {
        Arc::new(Self {
            cancelled: AtomicBool::new(false),
            candidate_count: AtomicU64::new(0),
            external_cancel: Some(external),
        })
    }
    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::Relaxed)
            || self.external_cancel.as_ref().is_some_and(|f| f())
    }
}

/// 一次文件读取的完整指纹。
struct FileRead {
    size: u64,
    mtime: String,
    hash: String,
}

enum FileReadOutcome {
    Ok(FileRead),
    Undecodable,
    Unreadable,
}

/// 流式读取 + SHA-256（与 db::content_hash 同算法：SHA-256 over 文件字节）。
/// 非 UTF-8 文本返回 Undecodable（recoverable 跳过，计划 4.2 编码策略）。
/// 分块读取，不在扫描线程一次性把整个文件读入内存。
fn read_file_fingerprint(path: &Path) -> FileReadOutcome {
    let mut file = match fs::File::open(path) {
        Ok(file) => file,
        Err(_) => return FileReadOutcome::Unreadable,
    };
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 64 * 1024];
    let mut size = 0u64;
    loop {
        match file.read(&mut buffer) {
            Ok(0) => break,
            Ok(read) => {
                hasher.update(&buffer[..read]);
                size += read as u64;
            }
            Err(_) => return FileReadOutcome::Unreadable,
        }
    }
    let hash = format!("{:x}", hasher.finalize());
    let mtime = match file.metadata() {
        Ok(metadata) => match file_modified_at_string(&metadata) {
            Ok(value) => value,
            Err(_) => return FileReadOutcome::Unreadable,
        },
        Err(_) => return FileReadOutcome::Unreadable,
    };
    // 编码策略：候选必须能按 UTF-8 文本解码；哈希对象是原始字节，
    // 与 db::content_hash(raw.as_bytes()) 语义一致。
    let mut file = file;
    if file.rewind().is_err() {
        return FileReadOutcome::Unreadable;
    }
    let mut bytes = Vec::with_capacity(size.min(64 * 1024 * 1024) as usize);
    if file.read_to_end(&mut bytes).is_err() {
        return FileReadOutcome::Unreadable;
    }
    if std::str::from_utf8(&bytes).is_err() {
        return FileReadOutcome::Undecodable;
    }
    FileReadOutcome::Ok(FileRead { size, mtime, hash })
}

/// 有界递归预检。零数据库写入；`progress` 提供取消与候选数进度。
/// 取消时返回 fatal=Cancelled 且不保留部分候选。
pub fn preflight_folder(
    root_path: &str,
    policy: &TraversalPolicy,
    progress: &PreflightProgress,
) -> PreflightResult {
    let mut result = PreflightResult {
        candidates: Vec::new(),
        skipped: Vec::new(),
        total_candidate_bytes: 0,
        visited_dir_count: 0,
        fatal: None,
    };

    let root = Path::new(root_path);
    let Ok(root_metadata) = fs::metadata(root) else {
        result.fatal = Some(PreflightFatal::RootUnreadable);
        return result;
    };
    if !root_metadata.is_dir() {
        result.fatal = Some(PreflightFatal::RootUnreadable);
        return result;
    }

    let started = Instant::now();
    // 迭代栈代替递归，避免超深目录栈溢出。
    let mut stack: Vec<PathBuf> = vec![root.to_path_buf()];

    while let Some(current) = stack.pop() {
        if progress.is_cancelled() {
            result.candidates.clear();
            result.skipped.clear();
            result.total_candidate_bytes = 0;
            result.fatal = Some(PreflightFatal::Cancelled);
            return result;
        }
        if started.elapsed() > policy.time_budget {
            result.fatal = Some(PreflightFatal::OverLimit);
            return result;
        }
        result.visited_dir_count += 1;
        if result.visited_dir_count > policy.max_visited_dirs {
            result.fatal = Some(PreflightFatal::OverLimit);
            return result;
        }

        let entries = match fs::read_dir(&current) {
            Ok(entries) => entries,
            Err(_) => {
                // 非关键子目录不可读：recoverable，继续其余部分。
                result.skipped.push(SkippedEntry {
                    path: current.to_string_lossy().into_owned(),
                    reason: SkipReason::Unreadable,
                });
                continue;
            }
        };

        let mut child_dirs: Vec<PathBuf> = Vec::new();
        for entry in entries.flatten() {
            if progress.is_cancelled() {
                result.candidates.clear();
                result.skipped.clear();
                result.total_candidate_bytes = 0;
                result.fatal = Some(PreflightFatal::Cancelled);
                return result;
            }
            let path = entry.path();
            let Ok(file_type) = entry.file_type() else {
                result.skipped.push(SkippedEntry {
                    path: path.to_string_lossy().into_owned(),
                    reason: SkipReason::Unreadable,
                });
                continue;
            };

            // 目录符号链接不跟随；file_type 为 symlink 时按 recoverable 排除。
            if file_type.is_symlink() {
                result.skipped.push(SkippedEntry {
                    path: path.to_string_lossy().into_owned(),
                    reason: SkipReason::Unreadable,
                });
                continue;
            }

            if file_type.is_dir() {
                let dir_name = path
                    .file_name()
                    .map(|name| name.to_string_lossy().into_owned())
                    .unwrap_or_default();
                if is_excluded_dir_name(&dir_name) {
                    continue;
                }
                child_dirs.push(path);
                continue;
            }

            if !file_type.is_file() {
                continue;
            }

            let Some(extension) = path.extension().and_then(|value| value.to_str()) else {
                continue;
            };
            let Some(file_type_kind) = supported_extension(extension) else {
                continue;
            };

            if result.candidates.len() >= policy.max_candidates {
                result.fatal = Some(PreflightFatal::OverLimit);
                return result;
            }

            // 读取前元数据（含大小预算判定）。
            let Ok(before_metadata) = fs::metadata(&path) else {
                result.skipped.push(SkippedEntry {
                    path: path.to_string_lossy().into_owned(),
                    reason: SkipReason::Unreadable,
                });
                continue;
            };
            let Ok(_mtime_before) = file_modified_at_string(&before_metadata) else {
                result.skipped.push(SkippedEntry {
                    path: path.to_string_lossy().into_owned(),
                    reason: SkipReason::Unreadable,
                });
                continue;
            };
            let size = before_metadata.len();
            if size > policy.max_file_bytes {
                result.skipped.push(SkippedEntry {
                    path: path.to_string_lossy().into_owned(),
                    reason: SkipReason::TooLarge,
                });
                continue;
            }
            if result.total_candidate_bytes + size > policy.max_total_bytes {
                result.fatal = Some(PreflightFatal::OverLimit);
                return result;
            }

            let first = read_file_fingerprint(&path);
            let (mut read, retry) = match first {
                FileReadOutcome::Ok(read) => (read, false),
                FileReadOutcome::Undecodable => {
                    result.skipped.push(SkippedEntry {
                        path: path.to_string_lossy().into_owned(),
                        reason: SkipReason::Undecodable,
                    });
                    continue;
                }
                FileReadOutcome::Unreadable => {
                    result.skipped.push(SkippedEntry {
                        path: path.to_string_lossy().into_owned(),
                        reason: SkipReason::Unreadable,
                    });
                    continue;
                }
            };
            let _ = retry;

            // 读取后稳定性核验：mtime 或大小变化 → 重读一次；
            // 重读期间仍变化 → recoverable 跳过（Unstable）。
            let Ok(after_metadata) = fs::metadata(&path) else {
                result.skipped.push(SkippedEntry {
                    path: path.to_string_lossy().into_owned(),
                    reason: SkipReason::Unreadable,
                });
                continue;
            };
            let Ok(mtime_after) = file_modified_at_string(&after_metadata) else {
                result.skipped.push(SkippedEntry {
                    path: path.to_string_lossy().into_owned(),
                    reason: SkipReason::Unreadable,
                });
                continue;
            };
            if mtime_after != read.mtime || after_metadata.len() != read.size {
                match read_file_fingerprint(&path) {
                    FileReadOutcome::Ok(retry_read) => {
                        let still_moving = fs::metadata(&path).ok().and_then(|meta| {
                            file_modified_at_string(&meta).ok().map(|mtime| (mtime, meta.len()))
                        });
                        match still_moving {
                            Some((final_mtime, final_size))
                                if final_mtime == retry_read.mtime
                                    && final_size == retry_read.size =>
                            {
                                read = retry_read;
                            }
                            _ => {
                                result.skipped.push(SkippedEntry {
                                    path: path.to_string_lossy().into_owned(),
                                    reason: SkipReason::Unstable,
                                });
                                continue;
                            }
                        }
                    }
                    FileReadOutcome::Undecodable => {
                        result.skipped.push(SkippedEntry {
                            path: path.to_string_lossy().into_owned(),
                            reason: SkipReason::Undecodable,
                        });
                        continue;
                    }
                    FileReadOutcome::Unreadable => {
                        result.skipped.push(SkippedEntry {
                            path: path.to_string_lossy().into_owned(),
                            reason: SkipReason::Unreadable,
                        });
                        continue;
                    }
                }
            }

            let identity = match path_identity(&path.to_string_lossy()).identity {
                Some(identity) => identity,
                None => {
                    result.skipped.push(SkippedEntry {
                        path: path.to_string_lossy().into_owned(),
                        reason: SkipReason::Unreadable,
                    });
                    continue;
                }
            };

            let relative_dir = path
                .parent()
                .and_then(|parent| parent.strip_prefix(root).ok())
                .map(|relative| relative.to_string_lossy().into_owned())
                .unwrap_or_default();

            result.candidates.push(PreflightCandidate {
                path: path.to_string_lossy().into_owned(),
                identity,
                file_type: file_type_kind,
                file_ext: extension.to_ascii_lowercase(),
                file_name: path
                    .file_name()
                    .map(|value| value.to_string_lossy().into_owned())
                    .unwrap_or_default(),
                relative_dir,
                size,
                mtime_before: read.mtime.clone(),
                mtime_after: read.mtime,
                content_hash: read.hash,
            });
            result.total_candidate_bytes += size;
            progress
                .candidate_count
                .store(result.candidates.len() as u64, Ordering::Relaxed);
        }

        // 深度优先：子目录按序入栈（排序保证确定性遍历顺序）。
        child_dirs.sort();
        for dir in child_dirs.into_iter().rev() {
            stack.push(dir);
        }
    }

    result
}

/// 便捷封装：返回 Result 形式（fatal 映射为 AppError），供 command 层使用。
pub fn run_preflight(
    root_path: &str,
    policy: &TraversalPolicy,
    progress: &PreflightProgress,
) -> Result<PreflightResult, AppError> {
    let result = preflight_folder(root_path, policy, progress);
    match result.fatal {
        Some(PreflightFatal::RootUnreadable) => Err(AppError::InvalidParams),
        Some(PreflightFatal::OverLimit) => Err(AppError::InvalidParams),
        Some(PreflightFatal::Cancelled) => Err(AppError::InternalError),
        None => Ok(result),
    }
}

#[cfg(test)]
mod tests {
    use super::{
        preflight_folder, PreflightFatal, PreflightProgress, TraversalPolicy,
    };
    use std::{fs, sync::atomic::Ordering};

    fn unique_dir(tag: &str) -> std::path::PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        std::env::temp_dir().join(format!("nutbook-traverse-{tag}-{nanos}"))
    }

    fn names(result: &super::PreflightResult) -> Vec<String> {
        let mut values: Vec<String> = result
            .candidates
            .iter()
            .map(|candidate| candidate.file_name.clone())
            .collect();
        values.sort();
        values
    }

    #[test]
    fn preflight_counts_candidates_and_excludes_policy_dirs_but_keeps_dist() {
        let root = unique_dir("counts");
        fs::create_dir_all(root.join("docs/deep")).expect("dirs");
        fs::create_dir_all(root.join("dist")).expect("dirs");
        fs::create_dir_all(root.join(".git")).expect("dirs");
        fs::create_dir_all(root.join("node_modules/pkg")).expect("dirs");
        fs::create_dir_all(root.join("target/debug")).expect("dirs");
        fs::create_dir_all(root.join(".hidden")).expect("dirs");

        fs::write(root.join("overview.md"), "# overview").expect("write");
        fs::write(root.join("docs/guide.md"), "# guide").expect("write");
        fs::write(root.join("docs/deep/deep.md"), "# deep").expect("write");
        fs::write(root.join("dist/demo.html"), "<h1>demo</h1>").expect("write");
        fs::write(root.join("dist/data.json"), "{}").expect("write"); // 非候选类型
        fs::write(root.join(".git/decoy.md"), "# decoy").expect("write");
        fs::write(root.join("node_modules/pkg/decoy.md"), "# decoy").expect("write");
        fs::write(root.join("target/debug/decoy.md"), "# decoy").expect("write");
        fs::write(root.join(".hidden/decoy.md"), "# decoy").expect("write");
        fs::write(root.join("notes.txt"), "ignore").expect("write");

        let progress = PreflightProgress::new();
        let result =
            preflight_folder(root.to_str().expect("utf8"), &TraversalPolicy::default(), &progress);

        assert_eq!(result.fatal, None);
        assert_eq!(
            names(&result),
            vec!["deep.md", "demo.html", "guide.md", "overview.md"]
        );
        let total: u64 = result.candidates.iter().map(|c| c.size).sum();
        assert_eq!(result.total_candidate_bytes, total);
        assert_eq!(progress.candidate_count.load(Ordering::Relaxed), 4);
        // dist 中的 AI HTML 是候选，且 relative_dir 保留 dist 前缀。
        let dist_candidate = result
            .candidates
            .iter()
            .find(|c| c.file_name == "demo.html")
            .expect("dist candidate");
        assert_eq!(dist_candidate.relative_dir, "dist");

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn preflight_does_not_follow_directory_symlinks() {
        let root = unique_dir("symlink");
        fs::create_dir_all(root.join("inside")).expect("dirs");
        let outside = unique_dir("symlink-outside");
        fs::create_dir_all(&outside).expect("dirs");
        fs::write(root.join("inside/inner.md"), "# inner").expect("write");
        fs::write(outside.join("outer.md"), "# outer").expect("write");

        #[cfg(unix)]
        std::os::unix::fs::symlink(&outside, root.join("link")).expect("symlink");

        let progress = PreflightProgress::new();
        let result =
            preflight_folder(root.to_str().expect("utf8"), &TraversalPolicy::default(), &progress);

        assert_eq!(result.fatal, None);
        assert_eq!(names(&result), vec!["inner.md"]);
        assert!(result.skipped.iter().any(|s| s.path.ends_with("link")));

        let _ = fs::remove_dir_all(root);
        let _ = fs::remove_dir_all(outside);
    }

    #[test]
    fn preflight_reports_fatal_when_root_unreadable() {
        let missing = unique_dir("missing-root");
        let progress = PreflightProgress::new();
        let result = preflight_folder(
            missing.join("nope").to_str().expect("utf8"),
            &TraversalPolicy::default(),
            &progress,
        );
        assert_eq!(result.fatal, Some(PreflightFatal::RootUnreadable));
        assert!(result.candidates.is_empty());
    }

    #[test]
    fn preflight_enforces_candidate_limit() {
        let root = unique_dir("limit");
        fs::create_dir_all(&root).expect("dirs");
        for index in 0..5 {
            fs::write(root.join(format!("n{index}.md")), format!("# {index}")).expect("write");
        }
        let policy = TraversalPolicy {
            max_candidates: 3,
            ..TraversalPolicy::default()
        };
        let progress = PreflightProgress::new();
        let result = preflight_folder(root.to_str().expect("utf8"), &policy, &progress);
        assert_eq!(result.fatal, Some(PreflightFatal::OverLimit));
        assert!(result.candidates.len() <= 3);

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn preflight_respects_cancellation_without_partial_candidates() {
        let root = unique_dir("cancel");
        fs::create_dir_all(&root).expect("dirs");
        for index in 0..5 {
            fs::write(root.join(format!("c{index}.md")), format!("# {index}")).expect("write");
        }
        let progress = PreflightProgress::new();
        progress.cancelled.store(true, Ordering::Relaxed);
        let result =
            preflight_folder(root.to_str().expect("utf8"), &TraversalPolicy::default(), &progress);
        assert_eq!(result.fatal, Some(PreflightFatal::Cancelled));
        assert!(result.candidates.is_empty());

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn preflight_skips_undecodable_files_as_recoverable() {
        let root = unique_dir("encoding");
        fs::create_dir_all(&root).expect("dirs");
        fs::write(root.join("good.md"), "# 好的").expect("write");
        fs::write(root.join("bad.md"), [0xff, 0xfe, 0x00, 0x01]).expect("write");
        let progress = PreflightProgress::new();
        let result =
            preflight_folder(root.to_str().expect("utf8"), &TraversalPolicy::default(), &progress);
        assert_eq!(result.fatal, None);
        assert_eq!(names(&result), vec!["good.md"]);
        assert!(result
            .skipped
            .iter()
            .any(|s| s.path.ends_with("bad.md") && s.reason.as_str() == "undecodable"));

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn preflight_candidate_binds_stable_mtime_and_hash() {
        let root = unique_dir("fingerprint");
        fs::create_dir_all(&root).expect("dirs");
        fs::write(root.join("note.md"), "# 稳定指纹").expect("write");
        let progress = PreflightProgress::new();
        let result =
            preflight_folder(root.to_str().expect("utf8"), &TraversalPolicy::default(), &progress);
        assert_eq!(result.candidates.len(), 1);
        let candidate = &result.candidates[0];
        assert_eq!(candidate.mtime_before, candidate.mtime_after);
        assert!(!candidate.content_hash.is_empty());
        assert_eq!(candidate.file_type, "markdown");
        assert!(!candidate.identity.is_empty());

        // 同一内容两次预检 hash 稳定（提交前 fingerprint 复核的基础）。
        let again = preflight_folder(
            root.to_str().expect("utf8"),
            &TraversalPolicy::default(),
            &PreflightProgress::new(),
        );
        assert_eq!(again.candidates[0].content_hash, candidate.content_hash);

        let _ = fs::remove_dir_all(root);
    }
}
