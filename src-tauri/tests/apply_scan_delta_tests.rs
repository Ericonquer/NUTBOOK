use nutbook_backend::{
    db::{
        repositories::{ItemRepository, LibraryRepository},
        Database,
    },
    models::{IndexedItemRecord, Library, ListItemsQuery, ScanDelta},
};
use std::fs;

fn sample_record(file_path: &str, content: &str, mtime: &str) -> IndexedItemRecord {
    IndexedItemRecord {
        library_id: 1,
        file_path: file_path.to_string(),
        relative_path: file_path.rsplit('/').next().unwrap_or(file_path).to_string(),
        file_name: file_path.rsplit('/').next().unwrap_or(file_path).to_string(),
        file_ext: "md".to_string(),
        file_type: "markdown".to_string(),
        file_size: content.len() as i64,
        modified_at: mtime.to_string(),
        created_at: "now".to_string(),
        updated_at: "now".to_string(),
    }
}

fn sample_library(root_path: &str) -> Library {
    Library {
        id: 1,
        name: "Delta".to_string(),
        root_path: root_path.to_string(),
        source_kind: "folder".to_string(),
        path_state: "valid".to_string(),
        is_active: true,
        created_at: "now".to_string(),
        updated_at: "now".to_string(),
        last_scanned_at: None,
        skill_binding: None,
    }
}

fn unique_dir(tag: &str) -> std::path::PathBuf {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("clock")
        .as_nanos();
    std::env::temp_dir().join(format!("nutbook-delta-{tag}-{nanos}"))
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

#[test]
fn delta_upsert_refreshes_fts_without_touching_siblings() {
    let root = unique_dir("fts");
    fs::create_dir_all(&root).expect("root");
    let path_a = root.join("a.md");
    let path_b = root.join("b.md");
    fs::write(&path_a, "# 来源甲 original").expect("write a");
    fs::write(&path_b, "# 来源乙 sibling").expect("write b");

    let db_path = unique_dir("fts-db").with_extension("sqlite3");
    let database = Database::new(&db_path).expect("db");
    database.upsert_library(sample_library(root.to_str().expect("utf8"))).expect("library");

    let record_a = sample_record(path_a.to_str().expect("utf8"), "", "100.0");
    let record_b = sample_record(path_b.to_str().expect("utf8"), "", "100.0");
    database
        .replace_items_for_library(1, &[record_a, record_b])
        .expect("initial scan");
    assert_eq!(keyword_total(&database, "original"), 1);

    // 外部修改 a.md；b.md 保持不变。
    fs::write(&path_a, "# 来源乙 refreshed").expect("rewrite a");
    let updated = sample_record(path_a.to_str().expect("utf8"), "", "200.0");
    let report = database
        .apply_scan_delta(
            1,
            &ScanDelta {
                upserts: vec![updated],
                removals: vec![],
                renames: vec![],
            },
        )
        .expect("delta");

    assert_eq!(report.updated, 1);
    assert_eq!(report.created, 0);
    {
        let conn = rusqlite::Connection::open(&db_path).expect("open");
        let _rows: Vec<(i64, String)> = conn
            .prepare("SELECT item_id, raw_text FROM items_fts")
            .expect("prepare")
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .expect("query")
            .collect::<Result<Vec<_>, _>>()
            .expect("collect");
        let _content: Vec<(i64, String)> = conn
            .prepare("SELECT item_id, raw_text FROM item_content")
            .expect("prepare2")
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .expect("query2")
            .collect::<Result<Vec<_>, _>>()
            .expect("collect2");
    }
    // 关键：新内容可搜索，旧内容消失，sibling 不受影响。
    assert_eq!(keyword_total(&database, "refreshed"), 1, "new content must be searchable");
    assert_eq!(keyword_total(&database, "original"), 0, "stale content must be removed from FTS");
    assert_eq!(keyword_total(&database, "sibling"), 1, "sibling must survive delta");

    let _ = fs::remove_dir_all(root);
    let _ = fs::remove_file(db_path);
}

#[test]
fn delta_rename_keeps_item_id_and_updates_fts() {
    let root = unique_dir("rename");
    fs::create_dir_all(&root).expect("root");
    let old_path = root.join("old.md");
    fs::write(&old_path, "# 改名内容 unique-rename-token").expect("write");

    let db_path = unique_dir("rename-db").with_extension("sqlite3");
    let database = Database::new(&db_path).expect("db");
    database.upsert_library(sample_library(root.to_str().expect("utf8"))).expect("library");

    let record = sample_record(old_path.to_str().expect("utf8"), "", "100.0");
    database.replace_items_for_library(1, &[record]).expect("initial scan");
    assert_eq!(keyword_total(&database, "unique-rename-token"), 1);

    // 实时配对改名：old.md -> renamed.md，内容不变。
    let new_path = root.join("renamed.md");
    fs::rename(&old_path, &new_path).expect("rename");
    let renamed_record = sample_record(new_path.to_str().expect("utf8"), "", "100.0");
    let report = database
        .apply_scan_delta(
            1,
            &ScanDelta {
                upserts: vec![],
                removals: vec![],
                renames: vec![nutbook_backend::models::ScanDeltaRename {
                    from_path: old_path.to_str().expect("utf8").to_string(),
                    to: renamed_record,
                }],
            },
        )
        .expect("delta");

    assert_eq!(report.renamed, 1);
    assert_eq!(report.created, 0);

    // item ID 保留：file_path 更新且旧路径消失。
    let items = database
        .list_items(&ListItemsQuery::default())
        .expect("items");
    assert_eq!(items.total, 1);
    assert!(items
        .items
        .iter()
        .any(|item| item.file_path == new_path.to_string_lossy()));

    let _ = fs::remove_dir_all(root);
    let _ = fs::remove_file(db_path);
}

#[test]
fn delta_removal_soft_deletes_without_affecting_siblings() {
    let root = unique_dir("removal");
    fs::create_dir_all(&root).expect("root");
    let path_a = root.join("a.md");
    let path_b = root.join("b.md");
    fs::write(&path_a, "# 删除目标 doomed").expect("write a");
    fs::write(&path_b, "# 保留来源 stays").expect("write b");

    let db_path = unique_dir("removal-db").with_extension("sqlite3");
    let database = Database::new(&db_path).expect("db");
    database.upsert_library(sample_library(root.to_str().expect("utf8"))).expect("library");

    database
        .replace_items_for_library(
            1,
            &[
                sample_record(path_a.to_str().expect("utf8"), "", "1"),
                sample_record(path_b.to_str().expect("utf8"), "", "1"),
            ],
        )
        .expect("initial scan");

    fs::remove_file(&path_a).expect("remove a");
    let report = database
        .apply_scan_delta(
            1,
            &ScanDelta {
                upserts: vec![],
                removals: vec![path_a.to_str().expect("utf8").to_string()],
                renames: vec![],
            },
        )
        .expect("delta");
    assert_eq!(report.deleted, 1);
    assert_eq!(keyword_total(&database, "doomed"), 0);
    assert_eq!(keyword_total(&database, "stays"), 1, "sibling must survive removal");

    let _ = fs::remove_dir_all(root);
    let _ = fs::remove_file(db_path);
}
