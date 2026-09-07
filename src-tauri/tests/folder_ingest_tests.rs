//! PR A（计划 4.3 / 8.1）：文件夹接入与来源合并集成测试。
//!
//! 覆盖：原子接入建库、single-file 合并（item ID / 收藏保留、冗余 library 删除）、
//! 排除项保留（隐藏目录 pre-added source）、overlap 拒绝、幂等重入、预检计数。

use nutbook_backend::{
    core::{
        folder_ingest::{ingest_folder_with_cancel, preflight_folder_ingest, IngestCommitGate},
        scan_coordinator::ScanCoordinator,
        watcher::build_library_watcher,
    },
    db::{
        repositories::{ItemRepository, LibraryRepository},
        Database,
    },
    errors::AppError,
    models::{
        FolderIngestRequest, FolderPreflightSummary, IndexedItemRecord, Library, ListItemsQuery,
        PreparedContent, PreparedIngestCandidate,
    },
    state::AppState,
};
use std::{
    fs,
    os::unix::fs::PermissionsExt,
    sync::Arc,
    thread,
    time::{Duration, Instant},
};

fn unique_dir(tag: &str) -> std::path::PathBuf {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("clock")
        .as_nanos();
    std::env::temp_dir().join(format!("nutbook-ingest-{tag}-{nanos}"))
}

fn file_library(id: i64, file_path: &str) -> Library {
    Library {
        id,
        name: file_path
            .rsplit('/')
            .next()
            .unwrap_or(file_path)
            .to_string(),
        root_path: file_path.to_string(),
        source_kind: "file".to_string(),
        path_state: "valid".to_string(),
        is_active: true,
        created_at: "1".to_string(),
        updated_at: "1".to_string(),
        last_scanned_at: None,
        skill_binding: None,
    }
}

fn file_record(library_id: i64, file_path: &str, content: &str) -> IndexedItemRecord {
    IndexedItemRecord {
        library_id,
        file_path: file_path.to_string(),
        relative_path: file_path
            .rsplit('/')
            .next()
            .unwrap_or(file_path)
            .to_string(),
        file_name: file_path
            .rsplit('/')
            .next()
            .unwrap_or(file_path)
            .to_string(),
        file_ext: "md".to_string(),
        file_type: "markdown".to_string(),
        file_size: content.len() as i64,
        modified_at: "100.0".to_string(),
        created_at: "1".to_string(),
        updated_at: "1".to_string(),
    }
}

fn prepared_candidate(root: &std::path::Path, relative: &str, content: &str) -> PreparedIngestCandidate {
    let path = root.join(relative);
    let file_name = path.file_name().unwrap().to_string_lossy().into_owned();
    PreparedIngestCandidate {
        file_path: path.to_string_lossy().into_owned(),
        identity: fs::canonicalize(&path)
            .expect("candidate resolvable")
            .to_string_lossy()
            .into_owned(),
        relative_path: relative.to_string(),
        file_name,
        file_ext: "md".to_string(),
        file_type: "markdown".to_string(),
        file_size: content.len() as i64,
        modified_at: "100.0".to_string(),
        snapshot_mtime: "100.0".to_string(),
        snapshot_size: content.len() as i64,
        content: Some(PreparedContent {
            file_hash: {
                use sha2::{Digest, Sha256};
                format!("{:x}", Sha256::digest(content.as_bytes()))
            },
            source_text: content.to_string(),
            raw_text: content.to_string(),
            rendered: Some(format!("<p>{}</p>", content.trim_start_matches("# "))),
            summary: Some(content.chars().take(20).collect()),
        }),
    }
}

fn keyword_total(database: &Database, keyword: &str) -> u64 {
    database
        .list_items(&ListItemsQuery {
            keyword: Some(keyword.to_string()),
            ..ListItemsQuery::default()
        })
        .expect("search")
        .total
}

/// 场景（计划 4.3 / 4.5）：单文件合并 + 排除项保留 + 新建候选。
#[test]
fn ingest_merges_single_file_and_preserves_excluded_sources() {
    let root = unique_dir("merge");
    fs::create_dir_all(root.join("docs")).expect("dirs");
    fs::create_dir_all(root.join(".hidden")).expect("dirs");
    fs::write(root.join("overview.md"), "# 单文件合并验收 merged-token").expect("write");
    fs::write(root.join("docs/guide.md"), "# 接入指南 guide-token").expect("write");
    fs::write(root.join(".hidden/secret.md"), "# 隐藏来源 hidden-token").expect("write");

    let db_path = unique_dir("merge-db").with_extension("sqlite3");
    let database = Database::new(&db_path).expect("db");

    // 预先单独加入 overview.md（single-file source，收藏）与隐藏目录文件。
    let overview_path = root.join("overview.md").to_string_lossy().into_owned();
    let secret_path = root.join(".hidden/secret.md").to_string_lossy().into_owned();
    database.upsert_library(file_library(1, &overview_path)).expect("lib 1");
    database.upsert_library(file_library(2, &secret_path)).expect("lib 2");
    database
        .replace_items_for_library(1, &[file_record(1, &overview_path, "")])
        .expect("scan 1");
    database
        .replace_items_for_library(2, &[file_record(2, &secret_path, "")])
        .expect("scan 2");
    let merged_item_id = database
        .list_items(&ListItemsQuery::default())
        .expect("items")
        .items
        .iter()
        .find(|item| item.file_path == overview_path)
        .expect("overview item")
        .id;
    database.set_item_favorite(merged_item_id, true).expect("favorite");

    // 预检：合并 1、保留 1。
    let summary: FolderPreflightSummary = preflight_folder_ingest(
        &database,
        root.to_str().expect("utf8"),
    )
    .expect("preflight");
    assert_eq!(summary.fatal, None);
    assert_eq!(summary.candidate_count, 2, "overview.md + guide.md");
    assert_eq!(summary.merge_single_file_count, 1);
    assert_eq!(summary.preserve_single_file_count, 1);

    // 接入：合并 library 1，保留 library 2。
    let prepared = vec![
        prepared_candidate(&root, "overview.md", "# 单文件合并验收 merged-token"),
        prepared_candidate(&root, "docs/guide.md", "# 接入指南 guide-token"),
    ];
    let result = database
        .ingest_folder_source(
            root.to_str().expect("utf8"),
            &prepared,
            &[1],
            "2000",
        )
        .expect("ingest");

    assert_eq!(result.already_existing, false);
    let folder = result.library.expect("folder library");
    assert_eq!(folder.source_kind, "folder");
    assert_eq!(result.created_count, 1, "only guide.md is new");
    assert_eq!(result.merged_item_count, 1);
    assert_eq!(result.merged_library_count, 1);
    assert_eq!(result.preserved_single_file_count, 1);

    // 库状态：single-file library 1 删除、library 2 保留、folder 建立。
    let libraries = database.list_libraries().expect("libraries");
    assert!(libraries.iter().all(|library| library.id != 1), "redundant single-file library must be deleted");
    assert!(libraries.iter().any(|library| library.id == 2), "excluded single-file library must be preserved");
    assert!(libraries.iter().any(|library| library.id == folder.id));

    // item ID 保留 + 收藏保留 + owner 转移。
    let detail = database.get_item_detail(merged_item_id).expect("detail");
    assert_eq!(detail.summary.is_favorite, true, "favorite must survive merge");
    assert_eq!(
        detail.summary.file_path, overview_path,
        "merged item keeps folder-prefixed path"
    );

    // FTS：新内容可搜索，合并项内容与隐藏来源内容都在。
    assert_eq!(keyword_total(&database, "guide-token"), 1);
    assert_eq!(keyword_total(&database, "merged-token"), 1);
    assert_eq!(keyword_total(&database, "hidden-token"), 1);

    let _ = fs::remove_dir_all(root);
    let _ = fs::remove_file(db_path);
}

/// 父子 folder overlap：接入父目录必须拒绝（计划 4.3）。
#[test]
fn ingest_rejects_parent_child_folder_overlap() {
    let root = unique_dir("overlap");
    fs::create_dir_all(root.join("sub")).expect("dirs");
    fs::write(root.join("sub/inner.md"), "# inner").expect("write");
    fs::write(root.join("outer.md"), "# outer").expect("write");

    let db_path = unique_dir("overlap-db").with_extension("sqlite3");
    let database = Database::new(&db_path).expect("db");
    database
        .upsert_library(Library {
            id: 1,
            name: "Sub".to_string(),
            root_path: root.join("sub").to_string_lossy().into_owned(),
            source_kind: "folder".to_string(),
            path_state: "valid".to_string(),
            is_active: true,
            created_at: "1".to_string(),
            updated_at: "1".to_string(),
            last_scanned_at: None,
            skill_binding: None,
        })
        .expect("sub library");

    let prepared = vec![prepared_candidate(
        &root,
        "outer.md",
        "# outer",
    )];
    let error = database
        .ingest_folder_source(root.to_str().expect("utf8"), &prepared, &[], "2000")
        .expect_err("overlap must fail");
    assert!(
        matches!(error, AppError::LibraryPathOverlap),
        "unexpected error: {error:?}"
    );
    assert_eq!(database.list_libraries().expect("libs").len(), 1, "no source created");

    let _ = fs::remove_dir_all(root);
    let _ = fs::remove_file(db_path);
}

/// 同一 folder 重复接入：幂等选择既有来源，不重复建 item。
#[test]
fn ingest_same_folder_is_idempotent() {
    let root = unique_dir("idem");
    fs::create_dir_all(&root).expect("dirs");
    fs::write(root.join("note.md"), "# 幂等 idem-token").expect("write");

    let db_path = unique_dir("idem-db").with_extension("sqlite3");
    let database = Database::new(&db_path).expect("db");

    let prepared = vec![prepared_candidate(&root, "note.md", "# 幂等 idem-token")];
    let first = database
        .ingest_folder_source(root.to_str().expect("utf8"), &prepared, &[], "2000")
        .expect("first ingest");
    assert_eq!(first.created_count, 1);

    let second = database
        .ingest_folder_source(root.to_str().expect("utf8"), &prepared, &[], "2001")
        .expect("second ingest");
    assert!(second.already_existing);
    assert_eq!(second.created_count, 0);
    assert_eq!(
        database.list_items(&ListItemsQuery::default()).expect("items").total,
        1,
        "no duplicate item"
    );

    let _ = fs::remove_dir_all(root);
    let _ = fs::remove_file(db_path);
}

/// R4 P1（确定性）：接入线程阻塞在全局 DB 写锁等待时收到取消——拿锁后的
/// `begin_commit` 裁决必须拦截提交（零数据库写入）。测试线程**先**持有
/// 写锁再启动接入，接入必然在锁上等待；取消在等待期间受理，随后释放锁，
/// 因此裁决点的状态是确定的（CancelRequested 在先）。
#[test]
fn cancel_while_waiting_for_write_lock_must_not_commit() {
    let root = unique_dir("cancel-lock");
    fs::create_dir_all(&root).expect("dirs");
    fs::write(root.join("note.md"), "# 取消等锁 cancel-lock-token").expect("write");

    let base = unique_dir("cancel-lock-state");
    fs::create_dir_all(&base).expect("dirs");
    let db_path = base.join("cancel-lock.sqlite3");
    let database = Database::new(&db_path).expect("db");

    let summary = preflight_folder_ingest(&database, root.to_str().expect("utf8"))
        .expect("preflight");
    assert_eq!(summary.fatal, None);

    let state = Arc::new(AppState::new(database.clone(), base.clone()));
    let gate = Arc::new(IngestCommitGate::new());
    let request = FolderIngestRequest {
        root_path: root.to_string_lossy().into_owned(),
        confirmed_candidate_count: Some(summary.candidate_count),
        preflight_op_id: Some(summary.op_id),
    };

    // 先持有全局写锁，接入线程只能停在锁上等待。
    let write_lock = state.scan_coordinator().db_write_lock();
    let guard = write_lock.lock().expect("test holds write lock");
    let state_for_thread = state.clone();
    let gate_for_thread = gate.clone();
    let worker = thread::spawn(move || {
        ingest_folder_with_cancel(&state_for_thread, &request, Some(gate_for_thread))
    });
    thread::sleep(Duration::from_millis(200));

    // 等锁期间受理取消；释放锁后接入线程的 begin_commit 必须看到取消在先。
    assert!(gate.request_cancel(), "cancel must be accepted before commit");
    drop(guard);
    let response = worker.join().expect("ingest thread").expect("ingest result");
    assert!(response.cancelled, "ingest must report cancelled");
    assert!(response.library.is_none(), "no library may be created");
    assert_eq!(
        keyword_total(&database, "cancel-lock-token"),
        0,
        "cancelled ingest must not commit any item"
    );

    let _ = fs::remove_dir_all(root);
    let _ = fs::remove_dir_all(base);
}

/// R4 P1（确定性）：进入提交 / 完成之后的取消必须如实返回未受理。
#[test]
fn cancel_after_commit_reports_not_accepted() {
    let root = unique_dir("cancel-late");
    fs::create_dir_all(&root).expect("dirs");
    fs::write(root.join("note.md"), "# 完成后取消 cancel-late-token").expect("write");

    let base = unique_dir("cancel-late-state");
    fs::create_dir_all(&base).expect("dirs");
    let db_path = base.join("cancel-late.sqlite3");
    let database = Database::new(&db_path).expect("db");

    let summary = preflight_folder_ingest(&database, root.to_str().expect("utf8"))
        .expect("preflight");
    let state = AppState::new(database.clone(), base.clone());
    let gate = Arc::new(IngestCommitGate::new());
    let request = FolderIngestRequest {
        root_path: root.to_string_lossy().into_owned(),
        confirmed_candidate_count: Some(summary.candidate_count),
        preflight_op_id: Some(summary.op_id),
    };

    let response =
        ingest_folder_with_cancel(&state, &request, Some(gate.clone())).expect("ingest result");
    assert!(!response.cancelled, "ingest must complete");
    assert!(response.library.is_some(), "library must be created");
    assert_eq!(keyword_total(&database, "cancel-late-token"), 1);
    assert!(
        !gate.request_cancel(),
        "cancel after commit/done must report not accepted"
    );

    let _ = fs::remove_dir_all(root);
    let _ = fs::remove_dir_all(base);
}

/// R5 P2：目录整体移入且文件数超过有界遍历预算（512）时，超出部分必须经
/// 带 generation fence 的 catch-up 收敛——不允许一直缺失直到另一次全量同步。
#[test]
fn subtree_walk_over_budget_is_recovered_by_catchup() {
    let root = unique_dir("budget-root");
    fs::create_dir_all(&root).expect("dirs");
    let staged = unique_dir("budget-staged");
    let moving = staged.join("bulk");
    fs::create_dir_all(&moving).expect("dirs");
    for i in 0..600 {
        fs::write(
            moving.join(format!("bulk-{i:03}.md")),
            format!("# bulk {i} budget-token-{i:03}"),
        )
        .expect("write");
    }

    let base = unique_dir("budget-state");
    fs::create_dir_all(&base).expect("dirs");
    let database = Database::new(&base.join("budget.sqlite3")).expect("db");
    let library = Library {
        id: 1,
        name: "Bulk".to_string(),
        root_path: root.to_string_lossy().into_owned(),
        source_kind: "folder".to_string(),
        path_state: "valid".to_string(),
        is_active: true,
        created_at: "1".to_string(),
        updated_at: "1".to_string(),
        last_scanned_at: None,
        skill_binding: None,
    };
    database.upsert_library(library.clone()).expect("lib");
    let coordinator = ScanCoordinator::new(database.clone());
    let _watcher = build_library_watcher(coordinator, library).expect("watcher");
    thread::sleep(Duration::from_millis(400));

    fs::rename(&moving, root.join("bulk")).expect("move in");
    // 600 > 512 预算：预算内靠增量，超出必须由 catch-up 全量补齐。
    let deadline = Instant::now() + Duration::from_secs(20);
    loop {
        let total = database
            .list_items(&ListItemsQuery::default())
            .expect("items")
            .total;
        if total >= 600 {
            break;
        }
        assert!(
            Instant::now() < deadline,
            "items over walk budget were never recovered: {total}/600"
        );
        thread::sleep(Duration::from_millis(200));
    }
    assert_eq!(
        keyword_total(&database, "budget-token-599"),
        1,
        "last file over budget must be searchable"
    );

    let _ = fs::remove_dir_all(root);
    let _ = fs::remove_dir_all(staged);
    let _ = fs::remove_dir_all(base);
}

/// R6 P2：零变更但不完整的批次（目录整体移入库内，其唯一子目录不可读 →
/// 有界遍历零 upsert 且 incomplete=true）不得因空批次提前退出而跳过补扫。
/// 确定性构造：测试线程先持有全局 DB 写锁再触发改名——批次若调度补扫，
/// run_scan_if_generation 必然阻塞在锁上；恢复权限并放锁后补扫可见
/// secret.md 并收敛入库。若未调度补扫（缺口行为），此后再无事件，文件
/// 永不出现 → 超时失败。
#[test]
fn empty_incomplete_batch_must_still_schedule_catchup() {
    let root = unique_dir("empty-inc-root");
    fs::create_dir_all(&root).expect("dirs");
    let staged = unique_dir("empty-inc-staged");
    let moving = staged.join("inbox");
    let locked = moving.join("locked");
    fs::create_dir_all(&locked).expect("dirs");
    fs::write(locked.join("secret.md"), "# hidden locked-secret-token").expect("write");
    // 唯一子目录整体不可读：目录级遍历 zero upsert + incomplete=true，
    // 批次内再无任何可提交 delta。
    let mut perms = fs::metadata(&locked).expect("meta").permissions();
    perms.set_mode(0o000);
    fs::set_permissions(&locked, perms).expect("chmod locked");

    let base = unique_dir("empty-inc-state");
    fs::create_dir_all(&base).expect("dirs");
    let database = Database::new(&base.join("empty-inc.sqlite3")).expect("db");
    let library = Library {
        id: 1,
        name: "EmptyIncomplete".to_string(),
        root_path: root.to_string_lossy().into_owned(),
        source_kind: "folder".to_string(),
        path_state: "valid".to_string(),
        is_active: true,
        created_at: "1".to_string(),
        updated_at: "1".to_string(),
        last_scanned_at: None,
        skill_binding: None,
    };
    database.upsert_library(library.clone()).expect("lib");
    let coordinator = ScanCoordinator::new(database.clone());
    // build_library_watcher 消费 coordinator：持锁用克隆（共享同一 Inner）。
    let lock_coordinator = coordinator.clone();
    let _watcher = build_library_watcher(coordinator, library).expect("watcher");
    thread::sleep(Duration::from_millis(400));

    // 持全局 DB 写锁：批次内的补扫调用（若被调度）必然阻塞在锁上，
    // 排除「补扫在权限恢复前跑完而错过文件」的竞态。
    let write_lock = lock_coordinator.db_write_lock();
    let guard = write_lock.lock().expect("test holds db write lock");

    fs::rename(&moving, root.join("inbox")).expect("move in");
    thread::sleep(Duration::from_millis(600));

    // 恢复权限后放锁：被调度的补扫此时可见 secret.md。
    //（rename 后 locked 已随目录移入库内，恢复的是新位置。）
    let moved_locked = root.join("inbox").join("locked");
    let mut perms = fs::metadata(&moved_locked).expect("meta").permissions();
    perms.set_mode(0o755);
    fs::set_permissions(&moved_locked, perms).expect("chmod back");
    drop(guard);

    let deadline = Instant::now() + Duration::from_secs(20);
    loop {
        if keyword_total(&database, "locked-secret-token") == 1 {
            break;
        }
        assert!(
            Instant::now() < deadline,
            "empty+incomplete batch never scheduled catch-up; secret.md never indexed"
        );
        thread::sleep(Duration::from_millis(200));
    }
    assert_eq!(
        database
            .list_items(&ListItemsQuery::default())
            .expect("items")
            .total,
        1
    );

    let _ = fs::remove_dir_all(root);
    let _ = fs::remove_dir_all(staged);
    let _ = fs::remove_dir_all(base);
}
