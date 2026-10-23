use nutbook_backend::{
    core::document_versions::{digest, HistoryStore},
    db::{migrations, Database},
    state::AppState,
};
use rusqlite::Connection;
use std::fs;

#[test]
fn failed_history_migration_preserves_archive_and_blocks_writer_then_rebuilds() {
    let root = tempfile::tempdir().unwrap();
    let app = root.path().join("app");
    fs::create_dir(&app).unwrap();
    let db_path = app.join("nutbook.sqlite3");
    let database = Database::new(db_path.clone()).unwrap();
    let path = root.path().join("sample.md");
    fs::write(&path, b"# A").unwrap();
    let store = HistoryStore::open(&app).unwrap();
    let saved = store.save_markdown(&path, root.path(), &digest(b"# A"), b"# B", None).unwrap();
    let before = fs::read(store.storage_path().join("documents").join(format!("{}.json",saved.document_id))).unwrap();
    let state = AppState::new(database, app.clone());
    let mut connection = Connection::open(&db_path).unwrap();
    connection.execute_batch("PRAGMA foreign_keys=OFF;
        DROP TABLE history_object_refs; DROP TABLE history_versions;
        DROP TABLE history_documents; DROP TABLE history_settings;
        DELETE FROM schema_migrations WHERE version=10;
        CREATE TABLE history_object_refs(incompatible_draft_column INTEGER);").unwrap();
    assert!(migrations::apply_pending_migrations(&mut connection,&db_path,true).is_err());
    assert_eq!(connection.query_row("SELECT count(*) FROM schema_migrations WHERE version=10",[],|r|r.get::<_,i64>(0)).unwrap(),0);
    assert_eq!(connection.query_row("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='history_documents'",[],|r|r.get::<_,i64>(0)).unwrap(),0,"partial tables must roll back");
    assert!(state.document_history().is_err(),"incomplete migration must not enable history publishing");
    connection.execute_batch("CREATE TABLE history_documents(document_id TEXT);").unwrap();
    assert!(state.document_history().is_err(),"a partial draft table is not a committed migration");
    assert_eq!(fs::read(&path).unwrap(),b"# B");
    assert_eq!(fs::read(store.storage_path().join("documents").join(format!("{}.json",saved.document_id))).unwrap(),before);
    assert_eq!(store.object(&digest(b"# A")).unwrap(),b"# A");
    assert_eq!(store.object(&digest(b"# B")).unwrap(),b"# B");
    connection.execute_batch("DROP TABLE history_object_refs; DROP TABLE history_documents;").unwrap();
    let backup=migrations::apply_pending_migrations(&mut connection,&db_path,true).unwrap().unwrap();
    assert!(backup.exists());
    // Rebuild the disposable index with the original missing: never recreate it
    // or register a library item from a durable history document alone.
    fs::remove_file(&path).unwrap();
    let recovered=state.document_history().unwrap();
    assert_eq!(recovered.document(&saved.document_id).unwrap().versions.len(),2);
    assert_eq!(connection.query_row("SELECT count(*) FROM history_versions",[],|r|r.get::<_,i64>(0)).unwrap(),2);
    assert_eq!(connection.query_row("SELECT source_available FROM history_documents WHERE document_id=?1",[&saved.document_id],|r|r.get::<_,i64>(0)).unwrap(),0);
    assert_eq!(connection.query_row("SELECT count(*) FROM items",[],|r|r.get::<_,i64>(0)).unwrap(),0);
    assert!(!path.exists());
}
