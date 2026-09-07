//! PR A（计划 4.4）：delta watcher。
//!
//! 合同：
//! - 使用 OS 原生文件系统事件（notify recommended watcher：macOS FSEvents /
//!   kqueue，Linux inotify，Windows ReadDirectoryChangesW）。计划 4.4 明确
//!   禁止每 300ms 对整个递归目录执行一次完整扫描（R2-4：PollWatcher +
//!   compare_contents 正是这种语义，已移除）；事件驱动 + 250ms 去抖合并，
//!   再针对受影响路径计算增量批次，经 `ScanCoordinator::apply_delta` 走
//!   `apply_scan_delta` 短事务。
//! - watcher 丢事件 / overflow / 错误由可重复 catch-up 收敛（唯一全量入口）。
//! - folder 排除目录（TraversalPolicy 规则：.git / node_modules / target /
//!   隐藏目录等）的路径事件在进入 coordinator 前丢弃；非候选扩展名不产生批次。
//! - 显式 single-file source 只处理自己的目标路径（含 editable companion），
//!   不继承父 folder 的目录排除规则。
//! - generation fence：watcher 构建时捕获当前 generation；批次提交前重新核对，
//!   不一致（来源被合并 / repair / 删除后 bump）则整体丢弃，旧 watcher 不回写。
//! - 同一有效 generation 内明确配对的实时改名保留 item ID：批次内 removal 与
//!   upsert 大小 + 内容 hash 均一致时配对为 rename；无法配对（离线改名 /
//!   内容已变）按「旧路径移除 + 新路径新增」收敛，不引入 inode 身份。

use std::{
    collections::HashSet,
    fs,
    path::{Path, PathBuf},
    sync::mpsc,
    thread,
    time::Duration,
};

use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use notify::event::ModifyKind;

use crate::{
    core::{
        document::file_modified_at_string,
        scan_coordinator::ScanCoordinator,
        traversal::{is_excluded_dir_name, supported_extension},
    },
    errors::AppError,
    models::{IndexedItemRecord, ScanDelta, ScanDeltaRename},
};

const DEBOUNCE_WINDOW: Duration = Duration::from_millis(250);

pub fn build_library_watcher(
    coordinator: ScanCoordinator,
    library: crate::models::Library,
) -> Result<RecommendedWatcher, AppError> {
    let (tx, rx) = mpsc::channel::<notify::Result<Event>>();
    let root_path = PathBuf::from(&library.root_path);
    // R2-4：file source 监视其父目录（非递归）——FSEvents 等 OS 后端以
    // 目录为监视单位，直接监视单个文件不可靠；classify_path 已按目标
    // 路径 + companion 过滤父目录内无关事件。
    let watch_target = if library.source_kind == "file" {
        root_path
            .parent()
            .map(|parent| parent.to_path_buf())
            .unwrap_or_else(|| root_path.clone())
    } else {
        root_path.clone()
    };
    let recursive_mode = if library.source_kind == "file" {
        RecursiveMode::NonRecursive
    } else {
        RecursiveMode::Recursive
    };
    let callback_tx = tx.clone();

    // 原生 OS 事件后端（计划 4.4：事件驱动，不做周期性全量轮询）。
    let mut watcher = notify::recommended_watcher(move |result| {
        let _ = callback_tx.send(result);
    })
    .map_err(|_| AppError::InternalError)?;

    watcher
        .watch(&watch_target, recursive_mode)
        .map_err(|_| AppError::IoError)?;

    let coordinator_for_scan = coordinator;
    // Codex review P1-4：generation 在 watcher 构建时捕获并绑定到本 watcher
    // 生命周期；此后无论别的线程如何 bump，本 watcher 的批次都携带构建时的
    // 旧值，由 coordinator 在写 fence 内再次核验。不能在批次处理时才读
    // 「当前 generation」——那会让旧 watcher 自动采用新值、绕过 fence。
    let generation = coordinator_for_scan.current_generation(library.id);
    // macOS 上 temp 目录 /Volumes 等路径可能是 symlink：watcher 事件路径来自
    // canonical 解析，而 DB 内路径以 library.root_path 前缀存储。过滤用
    // canonical root 求相对路径，写回 DB 时还原 root_path 前缀，保证
    // delta 路径与完整扫描路径同形。
    let resolved_root = fs::canonicalize(&root_path).unwrap_or_else(|_| root_path.clone());
    // R4 P1：watcher 建立时记录库内既有目录的 inode（有界、排除目录跳过），
    // 后续目录改名才有「旧→新」的明确内核级关联证据可用。
    if library.source_kind == "folder" {
        cache_existing_path_inodes(&coordinator_for_scan, &resolved_root);
    }
    thread::spawn(move || {
        while let Ok(incoming) = rx.recv() {
            // 去抖：收集首个事件后窗口内的后续事件，合并为一个批次。
            let mut batch: Vec<notify::Result<Event>> = vec![incoming];
            while let Ok(extra) = rx.recv_timeout(DEBOUNCE_WINDOW) {
                batch.push(extra);
            }
            handle_event_batch(
                &coordinator_for_scan,
                &library,
                &resolved_root,
                generation,
                batch,
            );
        }
    });

    Ok(watcher)
}

fn handle_event_batch(
    coordinator: &ScanCoordinator,
    library: &crate::models::Library,
    resolved_root: &Path,
    generation: u64,
    batch: Vec<notify::Result<Event>>,
) {
    // watcher 错误 / overflow：完整 catch-up（计划允许的唯一全量入口）。
    // Codex review P1-4：error/catch-up 路径同样受 generation fence 约束，
    // 旧 watcher（被合并 / repair / 删除 bump 过的）不得借错误触发全量回写。
    if batch.iter().any(|result| result.is_err()) {
        let _ = coordinator.run_scan_if_generation(library.id, generation);
        return;
    }
    // R5 P2：OS 后端报告 need_rescan（事件可能缺失）→ 不信任本批次增量，
    // 直接走带 generation fence 的 catch-up 全量收敛。
    if batch
        .iter()
        .filter_map(|result| result.as_ref().ok())
        .any(|event| event.need_rescan())
    {
        let _ = coordinator.run_scan_if_generation(library.id, generation);
        return;
    }

    let now = current_timestamp();
    let mut upserts: Vec<IndexedItemRecord> = Vec::new();
    let mut removals: Vec<String> = Vec::new();
    // Codex review R2：只有 OS 明确报告 rename 语义的事件（FSEvents
    // ITEM_RENAMED / kqueue RenameMode::From|To）才有资格参与实时改名配对。
    // 「删除 A + 移入内容恰好相同的 B」在 OS 侧是独立 remove + rename-in，
    // A 的移除事件没有 rename 标志——内容 hash+size 相同也不得配对，
    // 否则不同文件会继承原 item 身份（收藏/标签被错误转移）。
    // 第一趟：先收集全部 rename 证据路径（同一批次内 rename 事件可能排在
    // 其他种类事件之后，按路径判定而不是按首个事件种类判定）。
    let rename_evidence: HashSet<String> = batch
        .iter()
        .filter_map(|result| result.as_ref().ok())
        .filter(|event| matches!(event.kind, EventKind::Modify(ModifyKind::Name(_))))
        .flat_map(|event| event.paths.iter())
        .map(|path| path.to_string_lossy().to_string())
        .collect();

    // 第二趟：按唯一路径分类；rename 证据（DB 路径键）供配对门控使用。
    let mut rename_flagged: HashSet<String> = HashSet::new();
    let mut seen_paths: Vec<String> = Vec::new();
    for result in &batch {
        let Ok(event) = result else { continue };
        for path in &event.paths {
            let path_text = path.to_string_lossy().to_string();
            if seen_paths.contains(&path_text) {
                continue;
            }
            seen_paths.push(path_text.clone());
            classify_path(
                library,
                resolved_root,
                path,
                &path_text,
                &now,
                &rename_evidence,
                &mut upserts,
                &mut removals,
                &mut rename_flagged,
            );
        }
    }

    // Codex review R3 P1（计划 §4.4）：目录改名必须更新子树。目录 rename
    // 事件不带候选扩展名，path_is_candidate 会丢弃，若不在此显式处理，
    // 子树 item 的 DB 路径会停留在旧位置。必须在文件级空批次早退之前执行。
    let (dir_renames, dir_removals, dir_upserts, dir_walk_incomplete) =
        collect_dir_subtree_updates(coordinator, library, resolved_root, &rename_evidence, &now);
    // R4/R5 P1：批次内仍然存在的目录与候选文件记录当前 inode，供后续批次
    // 的目录 / 文件改名关联使用（rename 事件本身不携带旧→新映射）。
    for path_text in &seen_paths {
        let path = Path::new(path_text);
        let Some(ino) = path_inode_of(path) else { continue };
        let is_dir = path.is_dir();
        let name_allowed = path
            .file_name()
            .map(|name| !is_excluded_dir_name(&name.to_string_lossy()))
            .unwrap_or(false);
        let is_candidate_file = !is_dir
            && path
                .extension()
                .and_then(|value| value.to_str())
                .and_then(supported_extension)
                .is_some();
        if name_allowed && (is_dir || is_candidate_file) {
            coordinator.remember_path_inode(path_text, ino);
        }
    }

    if upserts.is_empty()
        && removals.is_empty()
        && dir_renames.is_empty()
        && dir_removals.is_empty()
        && dir_upserts.is_empty()
    {
        // R6 P2：零变更但子树遍历不完整（预算全耗在目录上 / 目录或候选
        // 读取失败导致一个 upsert 都没有）→ 本批次仍是部分状态，必须
        // 调度带 generation fence 的补扫；不能因「无 delta 可提交」而
        // 提前退出、让缺失部分一直悬空。
        // R6 P2：零变更但子树遍历不完整（预算全耗在目录上 / 目录或候选
        // 读取失败导致一个 upsert 都没有）→ 本批次仍是部分状态，必须
        // 调度带 generation fence 的补扫；不能因「无 delta 可提交」而
        // 提前退出、让缺失部分一直悬空。
        if dir_walk_incomplete {
            let _ = coordinator.run_scan_if_generation(library.id, generation);
        }
        return;
    }
    upserts.extend(dir_upserts);
    removals.extend(dir_removals);

    // 实时 rename 配对：双侧都必须携带 OS rename 证据，再以 DB 既有
    // metadata（hash + size）消解歧义（Codex review P1-5：真实 fs::rename
    // 后旧路径已消失，读磁盘必然失败）。
    let (file_renames, paired_removals) = pair_renames(
        coordinator,
        library,
        resolved_root,
        &upserts,
        &removals,
        &rename_flagged,
    );
    let mut renames = file_renames;
    renames.extend(dir_renames);

    for rename in &renames {
        upserts.retain(|item| item.file_path != rename.to.file_path);
    }
    removals.retain(|path| !paired_removals.contains(path));

    let delta = ScanDelta {
        upserts,
        removals,
        renames,
    };

    // fence：批次提交前核对 generation；旧 watcher 的批次整体丢弃。
    if coordinator.current_generation(library.id) != generation {
        return;
    }
    let _ = coordinator.apply_delta(library.id, generation, &delta);
    // R5 P2：子树有界遍历不完整（预算耗尽 / 读取失败）→ 本批次只是部分
    // 状态，显式调度带 generation fence 的 catch-up 全量收敛——不再依赖
    // 「由 catch-up 收敛」的注释承诺。
    if dir_walk_incomplete {
        let _ = coordinator.run_scan_if_generation(library.id, generation);
    }
}

fn classify_path(
    library: &crate::models::Library,
    resolved_root: &Path,
    path: &Path,
    path_text: &str,
    now: &str,
    rename_evidence: &HashSet<String>,
    upserts: &mut Vec<IndexedItemRecord>,
    removals: &mut Vec<String>,
    rename_flagged: &mut HashSet<String>,
) {
    if library.source_kind == "file" {
        // single-file source 只处理自己的目标路径（含 editable companion），
        // 不继承父 folder 的目录排除规则。路径按 canonical 归一后比较，
        // 避免 /var 与 /private/var 之类的 symlink 拼写差异漏判。
        let canonical_event = fs::canonicalize(path).ok();
        let canonical_target = fs::canonicalize(&library.root_path).ok();
        let is_target = if let (Some(event), Some(target)) = (&canonical_event, &canonical_target) {
            event == target
        } else {
            path_text == library.root_path
        };
        let companion = companion_path(path);
        let companion_is_target = companion
            .as_ref()
            .map(|value| {
                if let (Ok(event), Ok(target)) =
                    (fs::canonicalize(value), fs::canonicalize(&library.root_path))
                {
                    event == target
                } else {
                    value.to_string_lossy() == library.root_path
                }
            })
            .unwrap_or(false);
        if !is_target && !companion_is_target {
            return;
        }
        // Codex review P1-2：file source 的 DB 路径不能把文件当目录再拼一层。
        // 目标文件的 DB 路径就是 root_path 本身（与 scan_file_source 同形）；
        // companion 的 DB 路径是 root_path 同级目录下的 companion 文件名。
        // 拼出 note.md/note.md 伪条目会让原 item 因路径不匹配永不刷新。
        let root = Path::new(&library.root_path);
        let (db_path, db_relative) = if is_target {
            let relative = root
                .file_name()
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_default();
            (root.to_path_buf(), relative)
        } else {
            let file_name = companion
                .as_ref()
                .and_then(|value| value.file_name())
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_default();
            let db_path = root
                .parent()
                .map(|parent| parent.join(&file_name))
                .unwrap_or_else(|| PathBuf::from(&file_name));
            (db_path, file_name)
        };
        if db_relative.is_empty() {
            return;
        }
        let is_rename = rename_evidence.contains(path_text);
        let db_path_text = db_path.to_string_lossy().to_string();
        match fs::metadata(path) {
            Ok(metadata) if metadata.is_file() => {
                if let Ok(record) = build_record(library, path, &db_path_text, &db_relative, &metadata, now) {
                    upserts.push(record);
                    if is_rename {
                        rename_flagged.insert(db_path_text);
                    }
                }
            }
            _ => {
                if is_rename {
                    rename_flagged.insert(db_path_text.clone());
                }
                removals.push(db_path_text);
            }
        }
        return;
    }

    // folder：排除目录 / 非候选扩展名的事件在进入 coordinator 前丢弃。
    if !path_is_candidate(library, resolved_root, path) {
        return;
    }

    // DB 内路径以 library.root_path 前缀存储：事件路径可能以 canonical root
    // （/private/var/...）或被监视原路径（/var/...）报告，两个前缀都尝试，
    // 求出相对路径后还原成 root_path 前缀形式，与完整扫描产物同形。
    let db_relative = path
        .strip_prefix(resolved_root)
        .or_else(|_| path.strip_prefix(Path::new(&library.root_path)))
        .map(|value| value.to_string_lossy().to_string())
        .unwrap_or_default();
    if db_relative.is_empty() {
        return;
    }
    let is_rename = rename_evidence.contains(path_text);
    let db_path = Path::new(&library.root_path).join(&db_relative);
    let db_path_text = db_path.to_string_lossy().to_string();

    match fs::metadata(path) {
        Ok(metadata) if metadata.is_file() => {
            if let Ok(record) = build_record(library, path, &db_path_text, &db_relative, &metadata, now) {
                upserts.push(record);
                if is_rename {
                    rename_flagged.insert(db_path_text);
                }
            }
        }
        _ => {
            if is_rename {
                rename_flagged.insert(db_path_text.clone());
            }
            removals.push(db_path_text);
        }
    }
}

fn companion_path(path: &Path) -> Option<PathBuf> {
    let parent = path.parent()?;
    let stem = path.file_stem()?.to_str()?;
    Some(parent.join(format!("{stem}.nutbook-editable.html")))
}

/// folder 来源的事件路径是否为有效候选（位于 root 内、未经排除目录、扩展名受支持）。
/// 事件路径可能以 canonical root 或被监视原路径两种前缀出现，都接受。
fn path_is_candidate(
    library: &crate::models::Library,
    resolved_root: &Path,
    path: &Path,
) -> bool {
    let relative = match path.strip_prefix(resolved_root) {
        Ok(relative) => relative,
        Err(_) => match path.strip_prefix(Path::new(&library.root_path)) {
            Ok(relative) => relative,
            Err(_) => return false,
        },
    };
    let Some(extension) = path.extension().and_then(|value| value.to_str()) else {
        return false;
    };
    if supported_extension(extension).is_none() {
        return false;
    }
    // 相对路径上任一组件命中排除目录名（含隐藏目录）即丢弃。
    relative
        .components()
        .filter_map(|component| component.as_os_str().to_str())
        .all(|segment| !is_excluded_dir_name(segment))
}

fn build_record(
    library: &crate::models::Library,
    path: &Path,
    db_path_text: &str,
    db_relative: &str,
    metadata: &fs::Metadata,
    now: &str,
) -> Result<IndexedItemRecord, AppError> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .ok_or(AppError::UnsupportedFileType)?
        .to_string();
    let file_type = match extension.to_ascii_lowercase().as_str() {
        "md" | "markdown" => "markdown",
        "html" | "htm" => "html",
        _ => return Err(AppError::UnsupportedFileType),
    };
    Ok(IndexedItemRecord {
        library_id: library.id,
        file_path: db_path_text.to_string(),
        relative_path: db_relative.to_string(),
        file_name: path
            .file_name()
            .map(|value| value.to_string_lossy().to_string())
            .ok_or(AppError::IoError)?,
        file_ext: extension,
        file_type: file_type.to_string(),
        file_size: metadata.len() as i64,
        modified_at: file_modified_at_string(metadata)?,
        created_at: now.to_string(),
        updated_at: now.to_string(),
    })
}

/// 事件路径相对 root 的目录相对路径（folder 来源专用）：位于 root 内、
/// 任一组件未命中排除目录名、非空。不检查扩展名（目录没有候选扩展名）。
fn relative_dir_inside_root(
    library: &crate::models::Library,
    resolved_root: &Path,
    path: &Path,
) -> Option<String> {
    let relative = path
        .strip_prefix(resolved_root)
        .ok()
        .or_else(|| path.strip_prefix(Path::new(&library.root_path)).ok())?;
    if relative.as_os_str().is_empty() {
        return None;
    }
    let text = relative.to_string_lossy().to_string();
    if text
        .split('/')
        .any(|segment| is_excluded_dir_name(segment))
    {
        return None;
    }
    Some(text)
}

/// 纯新增子树的有界收集（rename-in 兜底：FSEvents 不保证为被改名目录的
/// 子文件派发事件）。返回 incomplete：预算耗尽 / 目录或文件读取失败时为
/// true——调用方必须据此显式调度 catch-up（R5 P2），不允许静默丢失。
const DIR_WALK_BUDGET: usize = 512;

fn collect_subtree_upserts(
    library: &crate::models::Library,
    dir: &Path,
    relative_prefix: &str,
    now: &str,
    upserts: &mut Vec<IndexedItemRecord>,
    budget: &mut usize,
) -> bool {
    let mut incomplete = false;
    if *budget == 0 {
        return true;
    }
    let Ok(entries) = fs::read_dir(dir) else {
        return true;
    };
    for entry in entries.flatten() {
        if *budget == 0 {
            return true;
        }
        let Ok(metadata) = entry.metadata() else {
            incomplete = true;
            continue;
        };
        let name = entry.file_name().to_string_lossy().to_string();
        let child_relative = format!("{relative_prefix}/{name}");
        if metadata.is_dir() {
            if is_excluded_dir_name(&name) {
                continue;
            }
            *budget -= 1;
            incomplete |= collect_subtree_upserts(
                library,
                &entry.path(),
                &child_relative,
                now,
                upserts,
                budget,
            );
        } else if metadata.is_file() {
            let Some(extension) = Path::new(&name).extension().and_then(|value| value.to_str())
            else {
                continue;
            };
            if supported_extension(extension).is_none() {
                continue;
            }
            let db_path = Path::new(&library.root_path).join(&child_relative);
            match build_record(
                library,
                &entry.path(),
                db_path.to_string_lossy().as_ref(),
                &child_relative,
                &metadata,
                now,
            ) {
                Ok(record) => {
                    upserts.push(record);
                    *budget -= 1;
                }
                // R5 P2：单文件读取 / 解析失败不得静默丢失，标记后由
                // catch-up 全量收敛。
                Err(_) => incomplete = true,
            }
        }
    }
    incomplete
}

/// Codex review R3 P1（计划 §4.4）/ R4 P1：目录改名子树更新。
///
/// 合同：
/// - 批次内带 OS rename 证据的路径中，消失的目录（旧位置）与出现的目录
///   （新位置）**仅在 inode 明确相等**时配对为目录改名（R4 P1：rename
///   不改变 inode，这是唯一的内核级旧→新关联证据；同父 / 排序 / 相似
///   内容都不构成证据——多目录同批改名会互相错换身份）；
/// - 配对成功：对 DB 内旧前缀下每个 item 读取新位置 metadata，合成
///   逐文件 rename（保留 item ID / 收藏 / 标签），路径前缀整体平移；
///   新位置文件缺失 / 不可读 → 该 item 退化为移除；
/// - 无法明确关联（无缓存 inode / 非 unix / inode 不唯一命中）：**不转移
///   身份**——消失目录子树按移除收敛，出现目录走有界遍历 upsert 兜底，
///   由 item 重建 + FTS 重建收敛到正确终态；
/// - 未配对的消失目录（改名到库外）：子树按移除收敛（文件确实已不在
///   库内，语义与完整扫描一致）；
/// - 未配对的出现目录（从库外改名进入）：有界遍历合成 upsert 兜底。
/// 返回 (renames, removals, upserts, walk_incomplete)：walk_incomplete
/// 表示有界遍历未完成（R5 P2），调用方必须调度 catch-up。
fn collect_dir_subtree_updates(
    coordinator: &ScanCoordinator,
    library: &crate::models::Library,
    resolved_root: &Path,
    rename_evidence: &HashSet<String>,
    now: &str,
) -> (Vec<ScanDeltaRename>, Vec<String>, Vec<IndexedItemRecord>, bool) {
    let mut renames = Vec::new();
    let mut removals = Vec::new();
    let mut upserts = Vec::new();
    if library.source_kind != "folder" || rename_evidence.is_empty() {
        return (renames, removals, upserts, false);
    }
    let mut appeared: Vec<(String, PathBuf, Option<u64>)> = Vec::new();
    let mut vanished: Vec<String> = Vec::new();
    for path_text in rename_evidence {
        let path = PathBuf::from(&path_text);
        let Some(relative) = relative_dir_inside_root(library, resolved_root, &path) else {
            continue;
        };
        match fs::metadata(&path) {
            Ok(metadata) if metadata.is_dir() => {
                appeared.push((relative, path.clone(), path_inode_of(&path)));
            }
            Err(_) => vanished.push(relative),
            _ => {}
        }
    }
    if vanished.is_empty() && appeared.is_empty() {
        return (renames, removals, upserts, false);
    }
    // rename_evidence 是集合，顺序不稳定：排序保证配对确定性。
    appeared.sort_by(|left, right| left.0.cmp(&right.0));
    vanished.sort();
    let mut consumed: HashSet<String> = HashSet::new();
    let mut walk_incomplete = false;
    for old_relative in &vanished {
        let old_db_prefix = Path::new(&library.root_path).join(old_relative);
        let old_db_prefix_text = old_db_prefix.to_string_lossy().into_owned();
        let item_paths = coordinator
            .item_paths_under_prefix(&old_db_prefix_text)
            .unwrap_or_default();
        if item_paths.is_empty() {
            // R5 P1：无严格子树项（prefix/ 下无 item）→ 消失的是文件（或
            // 空目录 / 未索引路径），不在此做目录级处理，也**不作废**其缓存
            // inode——文件级 rename 配对（pair_renames）依赖该 inode；空目录
            // 无 item，无需收敛。
            continue;
        }
        let old_disk_text = resolved_root
            .join(old_relative)
            .to_string_lossy()
            .into_owned();
        // R4 P1：明确的旧→新关联 = 旧目录缓存 inode 与新目录当前 inode 相等。
        // 缓存缺失 / 无唯一命中 → 不转移身份，走保守收敛。
        let paired = coordinator
            .cached_path_inode(&old_disk_text)
            .and_then(|old_ino| {
                appeared
                    .iter()
                    .find(|(relative, _, new_ino)| {
                        !consumed.contains(relative) && *new_ino == Some(old_ino)
                    })
                    .map(|(relative, _, _)| relative.clone())
            });
        // 旧目录路径已消失：其缓存 inode 记录（含子目录）全部作废。
        coordinator.forget_path_inodes_under(&old_disk_text);
        match paired {
            Some(new_relative) => {
                consumed.insert(new_relative.clone());
                for item_path in &item_paths {
                    let Some(suffix) = item_path.strip_prefix(&format!("{old_db_prefix_text}/"))
                    else {
                        continue;
                    };
                    let new_relative_path = format!("{new_relative}/{suffix}");
                    let disk_path = resolved_root.join(&new_relative_path);
                    let metadata = match fs::metadata(&disk_path) {
                        Ok(metadata) if metadata.is_file() => metadata,
                        _ => {
                            removals.push(item_path.clone());
                            continue;
                        }
                    };
                    let new_db_path = Path::new(&library.root_path).join(&new_relative_path);
                    match build_record(
                        library,
                        &disk_path,
                        new_db_path.to_string_lossy().as_ref(),
                        &new_relative_path,
                        &metadata,
                        now,
                    ) {
                        Ok(record) => renames.push(ScanDeltaRename {
                            from_path: item_path.clone(),
                            to: record,
                        }),
                        Err(_) => removals.push(item_path.clone()),
                    }
                }
                // 新目录下 DB 之外的文件（离线期间放入）靠子文件事件 / catch-up 收敛。
            }
            None => {
                // 目录离开库（改名到库外 / 被替换为同名非目录）：子树移除。
                for item_path in &item_paths {
                    removals.push(item_path.clone());
                }
            }
        }
    }
    let mut budget = DIR_WALK_BUDGET;
    for (new_relative, new_disk, _) in &appeared {
        if consumed.contains(new_relative) {
            continue;
        }
        walk_incomplete |=
            collect_subtree_upserts(library, new_disk, new_relative, now, &mut upserts, &mut budget);
    }
    (renames, removals, upserts, walk_incomplete)
}

/// R4/R5 P1：unix 下 fs::rename 不改变 inode——这是内核级的旧→新关联
/// 证据（目录与文件同一标准）。非 unix 平台返回 None（改名一律保守收敛）。
#[cfg(unix)]
fn path_inode_of(path: &Path) -> Option<u64> {
    let metadata = fs::metadata(path).ok()?;
    use std::os::unix::fs::MetadataExt;
    Some(metadata.ino())
}

#[cfg(not(unix))]
fn path_inode_of(_path: &Path) -> Option<u64> {
    None
}

/// watcher 构建时的有界 inode 预记录（排除目录不入缓存；目录 + 候选文件；
/// library root 自身的改名不在子树更新语义内）。R5 P1：文件级 rename 配对
/// 同样依赖「旧路径消失前的 inode」缓存。
#[cfg(unix)]
fn cache_existing_path_inodes(coordinator: &ScanCoordinator, resolved_root: &Path) {
    const PATH_INODE_WALK_BUDGET: usize = 4096;
    let mut stack: Vec<PathBuf> = vec![resolved_root.to_path_buf()];
    let mut recorded = 0usize;
    while recorded < PATH_INODE_WALK_BUDGET {
        let Some(dir) = stack.pop() else { break };
        let Ok(entries) = fs::read_dir(&dir) else { continue };
        for entry in entries.flatten() {
            if recorded >= PATH_INODE_WALK_BUDGET {
                return;
            }
            let Ok(file_type) = entry.file_type() else { continue };
            let name = entry.file_name().to_string_lossy().into_owned();
            let path = entry.path();
            if file_type.is_dir() {
                if is_excluded_dir_name(&name) {
                    continue;
                }
                if let Some(ino) = path_inode_of(&path) {
                    coordinator.remember_path_inode(&path.to_string_lossy(), ino);
                    recorded += 1;
                }
                stack.push(path);
            } else if file_type.is_file() {
                let supported = path
                    .extension()
                    .and_then(|value| value.to_str())
                    .and_then(supported_extension)
                    .is_some();
                if supported {
                    if let Some(ino) = path_inode_of(&path) {
                        coordinator.remember_path_inode(&path.to_string_lossy(), ino);
                        recorded += 1;
                    }
                }
            }
        }
    }
}

#[cfg(not(unix))]
fn cache_existing_path_inodes(_coordinator: &ScanCoordinator, _resolved_root: &Path) {}

/// 批次内 rename 配对（R5 P1 重写）：唯一旧→新关联证据 = **inode 相等**
/// （unix 下 fs::rename 不改变 inode，与目录改名同一证据标准）。
/// hash+size / 排序 / 双侧 Name 标记都不构成关联——「旧文件移出库 +
/// 库外同内容文件移入」两侧都有 Name 事件且内容一致，却是不同文件
/// （R5 探针 `review_move_out_and_unrelated_same_content_move_in_...`）。
/// 旧路径 inode 从缓存读取（路径已消失，现场读不到）；新路径现场 stat。
/// 无缓存 / 非 unix / 无唯一命中 → 「移除 + 新增」保守收敛，不转移身份。
fn pair_renames(
    coordinator: &ScanCoordinator,
    library: &crate::models::Library,
    resolved_root: &Path,
    upserts: &[IndexedItemRecord],
    removals: &[String],
    rename_flagged: &HashSet<String>,
) -> (Vec<ScanDeltaRename>, Vec<String>) {
    let mut renames = Vec::new();
    let mut paired_removals = Vec::new();
    if upserts.is_empty() || removals.is_empty() {
        return (renames, paired_removals);
    }
    // OS rename 证据仍是配对前提：removed 与 upsert 都必须来自
    // Modify(Name(_)) 事件（R2 探针：删除 + 移入同内容文件不得配对）。
    let rename_removals: Vec<&String> = removals
        .iter()
        .filter(|path| rename_flagged.contains(path.as_str()))
        .collect();
    if rename_removals.is_empty() {
        return (renames, paired_removals);
    }
    let mut consumed: HashSet<usize> = HashSet::new();
    for removed_path in rename_removals {
        // 旧路径已消失，唯一可用证据是其消失前记录的缓存 inode。
        // 缓存键是 canonical 事件路径；removals 是 DB 形态路径（root_path
        // 前缀）——先翻译成 resolved_root 前缀再查缓存（macOS /var vs
        // /private/var 拼写差异），翻译失败视为无证据。
        let old_cache_key = db_path_to_resolved(removed_path, &library.root_path, resolved_root);
        let old_ino = old_cache_key
            .as_deref()
            .and_then(|key| coordinator.cached_path_inode(&key.to_string_lossy()));
        let Some(old_ino) = old_ino else {
            continue;
        };
        let Some(upsert_index) = upserts
            .iter()
            .enumerate()
            .position(|(index, item)| {
                !consumed.contains(&index)
                    && rename_flagged.contains(item.file_path.as_str())
                    && path_inode_of(Path::new(&item.file_path)) == Some(old_ino)
            })
        else {
            continue;
        };
        consumed.insert(upsert_index);
        let to = &upserts[upsert_index];
        renames.push(ScanDeltaRename {
            from_path: removed_path.clone(),
            to: to.clone(),
        });
        paired_removals.push(removed_path.clone());
        // 旧路径已消失：其缓存 inode 记录（canonical 键）作废。
        if let Some(key) = &old_cache_key {
            coordinator.forget_path_inodes_under(&key.to_string_lossy());
        }
    }
    (renames, paired_removals)
}

/// DB 形态路径（library.root_path 前缀）→ canonical 事件路径（resolved_root
/// 前缀）。翻译失败（非 root 内路径 / 单文件来源）返回 None。
fn db_path_to_resolved(db_path: &str, library_root: &str, resolved_root: &Path) -> Option<PathBuf> {
    let relative = Path::new(db_path).strip_prefix(library_root).ok()?;
    Some(resolved_root.join(relative))
}

fn current_timestamp() -> String {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}
