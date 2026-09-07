//! Codex acceptance probes for PR A. Isolated temporary files and databases only.
use nutbook_backend::{
    core::{folder_ingest::{ingest_folder, preflight_folder_ingest},
        scan_coordinator::ScanCoordinator, scanner::{scan_file_source, scan_library_files},
        watcher::build_library_watcher},
    db::{Database, repositories::{ItemRepository, LibraryRepository}},
    models::{FolderIngestRequest, Library, ListItemsQuery, ScanDelta},
    state::AppState,
};
use std::{fs, path::PathBuf, thread, time::{Duration, Instant, SystemTime, UNIX_EPOCH}};

struct Fixture { base: PathBuf, root: PathBuf, db: Database }
impl Fixture {
    fn new(tag: &str) -> Self {
        let base = std::env::temp_dir().join(format!("nutbook-codex-review-{tag}-{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()));
        let root = base.join("documents");
        fs::create_dir_all(&root).unwrap();
        let db = Database::new(&base.join("review.sqlite3")).unwrap();
        Self { base, root, db }
    }
    fn library(&self, file: Option<&str>) -> Library {
        Library { id: 1, name: "Review fixture".into(), root_path: file.map(|f| self.root.join(f)).unwrap_or(self.root.clone()).to_string_lossy().into_owned(),
            source_kind: if file.is_some() { "file" } else { "folder" }.into(), path_state: "valid".into(),
            is_active: true, created_at: "1".into(), updated_at: "1".into(), last_scanned_at: None, skill_binding: None }
    }
    fn state(&self) -> AppState { AppState::new(self.db.clone(), self.base.clone()) }
    fn count(&self, keyword: &str) -> u64 {
        self.db.list_items(&ListItemsQuery {keyword: Some(keyword.into()), ..Default::default()}).unwrap().total
    }
}
impl Drop for Fixture { fn drop(&mut self) { let _ = fs::remove_dir_all(&self.base); } }
fn poll_until(mut done: impl FnMut() -> bool) -> bool {
    let deadline = Instant::now() + Duration::from_secs(4);
    loop { if done() { return true; } if Instant::now() >= deadline { return false; } thread::sleep(Duration::from_millis(40)); }
}

#[test]
fn review_missing_confirmation_op_must_not_authorize_changed_files() {
    let f = Fixture::new("expired-confirmation");
    fs::write(f.root.join("approved.md"), "# approved").unwrap();
    let summary = preflight_folder_ingest(&f.db, f.root.to_str().unwrap()).unwrap();
    fs::remove_file(f.root.join("approved.md")).unwrap();
    fs::write(f.root.join("replacement.md"), "# unapproved").unwrap();
    let result = ingest_folder(&f.state(), &FolderIngestRequest {
        root_path: f.root.to_string_lossy().into_owned(),
        confirmed_candidate_count: Some(summary.candidate_count),
        preflight_op_id: Some(u64::MAX),
    });
    assert!(result.is_err() || result.unwrap().needs_reconfirmation,
        "missing confirmation snapshot authorized different files");
    assert_eq!(f.count("unapproved"), 0);
}

#[test]
fn review_directory_rename_must_update_descendant_paths() {
    let f = Fixture::new("directory-rename");
    fs::create_dir(f.root.join("before")).unwrap();
    fs::write(f.root.join("before/note.md"), "# subtreeproof").unwrap();
    let library = f.library(None);
    f.db.upsert_library(library.clone()).unwrap();
    f.db.replace_items_for_library(1, &scan_library_files(1, f.root.to_str().unwrap(), "1").unwrap()).unwrap();
    let id = f.db.list_items(&Default::default()).unwrap().items[0].id;
    let coordinator = ScanCoordinator::new(f.db.clone());
    let _watcher = build_library_watcher(coordinator, library).unwrap();
    thread::sleep(Duration::from_millis(400));
    fs::rename(f.root.join("before"), f.root.join("after")).unwrap();
    assert!(poll_until(|| f.db.list_items(&Default::default()).unwrap().items.iter()
        .any(|item| item.id == id && item.file_path.ends_with("/after/note.md"))),
        "directory rename did not update descendant path while preserving identity");
}

#[test]
fn review_two_directory_renames_must_not_swap_item_identity() {
    let f = Fixture::new("two-directory-renames");
    for (dir, body) in [("a", "# firstidentity"), ("b", "# secondidentity")] {
        fs::create_dir(f.root.join(dir)).unwrap();
        fs::write(f.root.join(dir).join("note.md"), body).unwrap();
    }
    let library = f.library(None);
    f.db.upsert_library(library.clone()).unwrap();
    f.db.replace_items_for_library(1, &scan_library_files(1, f.root.to_str().unwrap(), "1").unwrap()).unwrap();
    let first_id = f.db.list_items(&Default::default()).unwrap().items.iter()
        .find(|item| item.file_path.ends_with("/a/note.md")).unwrap().id;
    let _watcher = build_library_watcher(ScanCoordinator::new(f.db.clone()), library).unwrap();
    thread::sleep(Duration::from_millis(400));
    fs::rename(f.root.join("a"), f.root.join("z")).unwrap();
    fs::rename(f.root.join("b"), f.root.join("y")).unwrap();
    assert!(poll_until(|| f.db.list_items(&Default::default()).unwrap().items.iter()
        .any(|item| item.file_path.ends_with("/z/note.md"))));
    let rows = f.db.list_items(&Default::default()).unwrap().items;
    assert!(!rows.iter().any(|item| item.id == first_id && item.file_path.ends_with("/y/note.md")),
        "unrelated directory inherited the first document identity");
}

#[test]
fn review_move_out_and_unrelated_same_content_move_in_keep_distinct_identity() {
    let f = Fixture::new("independent-moves");
    fs::write(f.root.join("old.md"), "# identical content").unwrap();
    fs::write(f.base.join("independent.md"), "# identical content").unwrap();
    let library = f.library(None);
    f.db.upsert_library(library.clone()).unwrap();
    f.db.replace_items_for_library(1, &scan_library_files(1, f.root.to_str().unwrap(), "1").unwrap()).unwrap();
    let original_id = f.db.list_items(&Default::default()).unwrap().items[0].id;
    let _watcher = build_library_watcher(ScanCoordinator::new(f.db.clone()), library).unwrap();
    thread::sleep(Duration::from_millis(400));
    fs::rename(f.root.join("old.md"), f.base.join("moved-out.md")).unwrap();
    fs::rename(f.base.join("independent.md"), f.root.join("new.md")).unwrap();
    assert!(poll_until(|| f.db.list_items(&Default::default()).unwrap().items.iter()
        .any(|item| item.file_name == "new.md")));
    let rows = f.db.list_items(&Default::default()).unwrap().items;
    let added = rows.iter().find(|item| item.file_name == "new.md").unwrap();
    assert_ne!(added.id, original_id, "unrelated moved-in file inherited moved-out file identity");
}

#[test]
fn review_reconciliation_must_keep_preflight_exclusions() {
    let f = Fixture::new("exclusions");
    fs::write(f.root.join("visible.md"), "# visibleproof").unwrap();
    fs::create_dir_all(f.root.join(".hidden")).unwrap();
    fs::write(f.root.join(".hidden/decoy.md"), "# hiddenproof").unwrap();
    let state = f.state();
    let summary = preflight_folder_ingest(&f.db, f.root.to_str().unwrap()).unwrap();
    assert_eq!(summary.candidate_count, 1);
    let joined = ingest_folder(&state, &FolderIngestRequest { root_path: f.root.to_string_lossy().into_owned(), confirmed_candidate_count: Some(1), preflight_op_id: None }).unwrap();
    assert_eq!(f.count("hiddenproof"), 0);
    state.scan_coordinator().run_scan(joined.library.unwrap().id).unwrap();
    assert_eq!(f.count("hiddenproof"), 0, "catch-up/rescan imported a preflight-excluded file");
}

#[test]
fn review_same_count_replacement_requires_reconfirmation() {
    let f = Fixture::new("confirmation");
    fs::write(f.root.join("approved.md"), "# approved document").unwrap();
    let summary = preflight_folder_ingest(&f.db, f.root.to_str().unwrap()).unwrap();
    fs::remove_file(f.root.join("approved.md")).unwrap();
    fs::write(f.root.join("unapproved.md"), "# different document").unwrap();
    let state = f.state();
    let result = ingest_folder(&state, &FolderIngestRequest { root_path: f.root.to_string_lossy().into_owned(), confirmed_candidate_count: Some(summary.candidate_count), preflight_op_id: None }).unwrap();
    assert!(result.needs_reconfirmation, "different candidate set was committed without reconfirmation");
}

#[test]
fn review_delta_must_not_restore_user_removed_file() {
    let f = Fixture::new("ignored");
    let path = f.root.join("note.md");
    fs::write(&path, "# originalproof").unwrap();
    f.db.upsert_library(f.library(None)).unwrap();
    f.db.replace_items_for_library(1, &scan_library_files(1, f.root.to_str().unwrap(), "1").unwrap()).unwrap();
    let id = f.db.list_items(&Default::default()).unwrap().items[0].id;
    f.db.remove_item_from_nutbook(id, "2").unwrap();
    assert_eq!(f.db.list_ignored_items().unwrap().len(), 1);
    fs::write(&path, "# resurrectedproof").unwrap();
    f.db.apply_scan_delta(1, &ScanDelta { upserts: scan_library_files(1, f.root.to_str().unwrap(), "3").unwrap(), ..Default::default() }).unwrap();
    assert_eq!(f.count("resurrectedproof"), 0, "watcher delta restored an explicitly removed file");
}

#[test]
fn review_single_file_watcher_updates_original_item_path() {
    let f = Fixture::new("single");
    let path = f.root.join("note.md");
    fs::write(&path, "# oldsingleproof").unwrap();
    let library = f.library(Some("note.md"));
    f.db.upsert_library(library.clone()).unwrap();
    f.db.replace_items_for_library(1, &scan_file_source(1, path.to_str().unwrap(), "1").unwrap()).unwrap();
    let coordinator = ScanCoordinator::new(f.db.clone());
    let watcher = build_library_watcher(coordinator, library).unwrap();
    fs::write(&path, "# newsingleproof with changed size").unwrap();
    let refreshed = poll_until(|| f.count("newsingleproof") == 1);
    let rows = f.db.list_items(&Default::default()).unwrap();
    drop(watcher);
    assert!(refreshed, "single-file watcher did not refresh original item; rows={:?}", rows.items.iter().map(|i| &i.file_path).collect::<Vec<_>>());
    assert_eq!(rows.total, 1);
}

#[test]
fn review_real_rename_must_preserve_item_id() {
    let f = Fixture::new("rename");
    fs::write(f.root.join("before.md"), "# renameproof").unwrap();
    let library = f.library(None);
    f.db.upsert_library(library.clone()).unwrap();
    f.db.replace_items_for_library(1, &scan_library_files(1, f.root.to_str().unwrap(), "1").unwrap()).unwrap();
    let old_id = f.db.list_items(&Default::default()).unwrap().items[0].id;
    let watcher = build_library_watcher(ScanCoordinator::new(f.db.clone()), library).unwrap();
    fs::rename(f.root.join("before.md"), f.root.join("after.md")).unwrap();
    assert!(poll_until(|| f.db.list_items(&Default::default()).unwrap().items.iter().any(|i| i.file_name == "after.md")));
    let rows = f.db.list_items(&Default::default()).unwrap();
    let renamed = rows.items.iter().find(|i| i.file_name == "after.md").unwrap();
    drop(watcher);
    assert_eq!(renamed.id, old_id, "real filesystem rename lost item identity");
}

#[test]
fn review_bumped_generation_must_reject_old_watcher() {
    let f = Fixture::new("generation");
    fs::write(f.root.join("note.md"), "# generationoldproof").unwrap();
    let library = f.library(None);
    f.db.upsert_library(library.clone()).unwrap();
    f.db.replace_items_for_library(1, &scan_library_files(1, f.root.to_str().unwrap(), "1").unwrap()).unwrap();
    let coordinator = ScanCoordinator::new(f.db.clone());
    let watcher = build_library_watcher(coordinator.clone(), library).unwrap();
    coordinator.bump_generation(1);
    fs::write(f.root.join("note.md"), "# stalegenerationproof must be rejected").unwrap();
    let stale_write = poll_until(|| f.count("stalegenerationproof") == 1);
    drop(watcher);
    assert!(!stale_write, "old watcher adopted new generation and wrote stale events");
}

#[test]
#[cfg(unix)]
fn review_parent_child_overlap_via_alias_must_be_rejected() {
    let f = Fixture::new("overlap");
    fs::create_dir_all(f.root.join("sub")).unwrap();
    fs::write(f.root.join("visible.md"), "# overlap sample").unwrap();
    let state = f.state();
    ingest_folder(&state, &FolderIngestRequest { root_path: f.root.to_string_lossy().into_owned(), confirmed_candidate_count: Some(1), preflight_op_id: None }).unwrap();
    let alias = f.base.join("sub-alias");
    std::os::unix::fs::symlink(f.root.join("sub"), &alias).unwrap();
    let result = ingest_folder(&state, &FolderIngestRequest { root_path: alias.to_string_lossy().into_owned(), confirmed_candidate_count: Some(0), preflight_op_id: None });
    assert!(result.is_err(), "canonical child folder was accepted through an alias while its parent was already connected");
}

#[test]
fn review_second_preflight_must_not_overwrite_first_confirmation() {
    let f = Fixture::new("snapshot-owner");
    fs::write(f.root.join("first.md"), "# first approved content").unwrap();
    let first = preflight_folder_ingest(&f.db, f.root.to_str().unwrap()).unwrap();
    fs::remove_file(f.root.join("first.md")).unwrap();
    fs::write(f.root.join("replacement.md"), "# different content").unwrap();
    let second = preflight_folder_ingest(&f.db, f.root.to_str().unwrap()).unwrap();
    assert_ne!(first.fingerprint, second.fingerprint);
    let state = f.state();
    let result = ingest_folder(&state, &FolderIngestRequest {
        root_path: f.root.to_string_lossy().into_owned(),
        confirmed_candidate_count: Some(first.candidate_count),
    preflight_op_id: None,}).unwrap();
    assert!(result.needs_reconfirmation, "a second preflight silently replaced the snapshot confirmed by the first operation");
}

#[test]
fn review_same_content_delete_create_must_not_transfer_favorite() {
    let f = Fixture::new("rename-ambiguity");
    let body = "# independent files may have identical template content\n";
    fs::write(f.root.join("old.md"), body).unwrap();
    // Create the new file before watching, outside the watched tree. This is a
    // distinct existing file, not a renamed old.md (even if the OS reuses IDs).
    let independent = f.base.join("independent.md");
    fs::write(&independent, body).unwrap();
    let library = f.library(None);
    f.db.upsert_library(library.clone()).unwrap();
    f.db.replace_items_for_library(1, &scan_library_files(1, f.root.to_str().unwrap(), "1").unwrap()).unwrap();
    let old_id = f.db.list_items(&Default::default()).unwrap().items[0].id;
    f.db.set_item_favorite(old_id, true).unwrap();
    let watcher = build_library_watcher(ScanCoordinator::new(f.db.clone()), library).unwrap();
    fs::remove_file(f.root.join("old.md")).unwrap();
    fs::rename(&independent, f.root.join("new.md")).unwrap();
    assert!(poll_until(|| f.db.list_items(&Default::default()).unwrap().items.iter().any(|i| i.file_name == "new.md")));
    let rows = f.db.list_items(&Default::default()).unwrap();
    let new_item = rows.items.iter().find(|i| i.file_name == "new.md").unwrap();
    drop(watcher);
    assert_ne!(new_item.id, old_id, "a different file inherited the old item's identity and favorite solely because content matched");
}
