use std::{
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use rusqlite::{backup::Backup, Connection, OptionalExtension, Transaction};

use crate::errors::AppError;

pub const LATEST_SCHEMA_VERSION: i64 = 6;
const MIGRATION_0002_SQL: &str =
    include_str!("../../migrations/0002_agent_artifact_sources.sql");
const MIGRATION_0003_SQL: &str =
    include_str!("../../migrations/0003_agent_artifact_sources_draft_repair.sql");
const MIGRATION_0004_SQL: &str =
    include_str!("../../migrations/0004_agent_manifest_provenance.sql");
const MIGRATION_0005_SQL: &str =
    include_str!("../../migrations/0005_agent_discovery_cache.sql");
const MIGRATION_0006_SQL: &str =
    include_str!("../../migrations/0006_thumbnail_revision_state.sql");

#[derive(Clone, Copy)]
struct Migration {
    version: i64,
    name: &'static str,
    sql: &'static str,
}

const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 2,
        name: "agent_artifact_sources",
        sql: MIGRATION_0002_SQL,
    },
    Migration {
        version: 3,
        name: "agent_artifact_sources_draft_repair",
        sql: MIGRATION_0003_SQL,
    },
    Migration {
        version: 4,
        name: "agent_manifest_provenance",
        sql: MIGRATION_0004_SQL,
    },
    Migration {
        version: 5,
        name: "agent_discovery_cache",
        sql: MIGRATION_0005_SQL,
    },
    Migration {
        version: 6,
        name: "thumbnail_revision_state",
        sql: MIGRATION_0006_SQL,
    },
];

pub fn ensure_migration_registry(connection: &Connection) -> Result<(), AppError> {
    connection
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS schema_migrations (
               version INTEGER PRIMARY KEY,
               name TEXT NOT NULL UNIQUE,
               applied_at TEXT NOT NULL
             );
             INSERT OR IGNORE INTO schema_migrations (version, name, applied_at)
             VALUES (1, 'initial_0_6_baseline', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));",
        )
        .map_err(|_| AppError::DatabaseError)
}

pub fn apply_pending_migrations(
    connection: &mut Connection,
    database_path: &Path,
    database_existed_before_startup: bool,
) -> Result<Option<PathBuf>, AppError> {
    ensure_migration_registry(connection)?;
    let current_version: i64 = connection
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .map_err(|_| AppError::DatabaseError)?;
    if current_version > LATEST_SCHEMA_VERSION {
        return Err(AppError::DatabaseError);
    }

    let pending = MIGRATIONS
        .iter()
        .copied()
        .filter(|migration| migration.version > current_version)
        .collect::<Vec<_>>();
    if pending.is_empty() {
        return Ok(None);
    }

    let backup_path = if database_existed_before_startup {
        Some(create_migration_backup(
            connection,
            database_path,
            pending[0].version,
        )?)
    } else {
        None
    };

    connection
        .pragma_update(None, "foreign_keys", "OFF")
        .map_err(|_| AppError::DatabaseError)?;
    let result = apply_migrations_transaction(connection, &pending);
    let foreign_keys_result = connection
        .pragma_update(None, "foreign_keys", "ON")
        .map_err(|_| AppError::DatabaseError);

    result?;
    foreign_keys_result?;
    Ok(backup_path)
}

fn apply_migrations_transaction(
    connection: &mut Connection,
    migrations: &[Migration],
) -> Result<(), AppError> {
    let transaction = connection
        .transaction()
        .map_err(|_| AppError::DatabaseError)?;
    for migration in migrations {
        let already_has_final_agent_schema = migration.version == 3
            && table_has_column(&transaction, "libraries", "canonical_root_key")?
            && table_has_column(&transaction, "agent_project_sources", "last_scan_status")?
            && table_has_column(&transaction, "agent_project_adapters", "external_scope_id")?;
        if migration.version == 4 {
            apply_manifest_provenance_migration(&transaction)?;
        } else if migration.version == 6 {
            apply_thumbnail_revision_state_migration(&transaction)?;
        } else if !already_has_final_agent_schema {
            transaction
                .execute_batch(migration.sql)
                .map_err(|_| AppError::DatabaseError)?;
        }
        if migration.version == 2 {
            normalize_library_root_keys(&transaction)?;
        }
        transaction
            .execute(
                "INSERT INTO schema_migrations (version, name, applied_at)
                 VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))",
                (migration.version, migration.name),
            )
            .map_err(|_| AppError::DatabaseError)?;
    }
    verify_migrated_database(&transaction)?;
    transaction.commit().map_err(|_| AppError::DatabaseError)
}

fn apply_manifest_provenance_migration(transaction: &Transaction<'_>) -> Result<(), AppError> {
    // One pre-release v2 draft omitted item_provenance entirely. Keep the
    // published ALTER migration as the normal contract, while repairing that
    // known draft before adding the v4 columns.
    transaction
        .execute_batch(
            "CREATE TABLE IF NOT EXISTS item_provenance (
               id INTEGER PRIMARY KEY AUTOINCREMENT,
               item_id INTEGER NOT NULL,
               project_library_id INTEGER NOT NULL,
               agent_kind TEXT NOT NULL,
               skill_normalized_name TEXT,
               skill_display_name TEXT,
               evidence_kind TEXT NOT NULL,
               run_reference_hash TEXT,
               evidence_fingerprint TEXT NOT NULL,
               generated_at TEXT,
               created_at TEXT NOT NULL,
               UNIQUE (item_id, project_library_id, evidence_fingerprint),
               FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
               FOREIGN KEY (project_library_id) REFERENCES libraries(id) ON DELETE CASCADE
             );
             CREATE INDEX IF NOT EXISTS idx_item_provenance_project_library
               ON item_provenance(project_library_id);",
        )
        .map_err(|_| AppError::DatabaseError)?;
    for (table, column, sql_type) in [
        ("artifact_candidate_evidence", "skill_normalized_name", "TEXT"),
        ("artifact_candidate_evidence", "skill_display_name", "TEXT"),
        ("artifact_candidate_evidence", "manifest_entry_id", "TEXT"),
        ("artifact_candidate_evidence", "edit_contract", "TEXT"),
        ("artifact_candidate_evidence", "save_policy", "TEXT"),
        ("item_provenance", "manifest_entry_id", "TEXT"),
        ("item_provenance", "edit_contract", "TEXT"),
        ("item_provenance", "save_policy", "TEXT"),
    ] {
        if !table_has_column(transaction, table, column)? {
            transaction
                .execute_batch(&format!("ALTER TABLE {table} ADD COLUMN {column} {sql_type};"))
                .map_err(|_| AppError::DatabaseError)?;
        }
    }
    Ok(())
}

fn table_has_column(
    transaction: &Transaction<'_>,
    table: &str,
    expected_column: &str,
) -> Result<bool, AppError> {
    let mut statement = transaction
        .prepare(&format!("PRAGMA table_info({table})"))
        .map_err(|_| AppError::DatabaseError)?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|_| AppError::DatabaseError)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| AppError::DatabaseError)?;
    Ok(columns.iter().any(|column| column == expected_column))
}

/// B1：为 thumbnail_cache 增加确定性 desired key / render kind / generation 状态列。
/// 逐列守卫幂等：已含新列的库（例如新库执行完 0001 后）不会再 ALTER，避免
/// "duplicate column name" 报错。旧 ready 行保留原状态与 thumb_path，但
/// generated_from_key 为 NULL，读取路径不会把它们当作有效 ready 成图返回。
/// 表不存在时跳过（兼容不含 thumbnail_cache 的极早期 draft 库修复路径）。
fn apply_thumbnail_revision_state_migration(transaction: &Transaction<'_>) -> Result<(), AppError> {
    if !table_exists(transaction, "thumbnail_cache")? {
        return Ok(());
    }
    for (column, sql_type) in [
        ("desired_key", "TEXT"),
        ("generated_from_key", "TEXT"),
        ("render_kind", "TEXT"),
        ("generation", "INTEGER NOT NULL DEFAULT 0"),
    ] {
        if !table_has_column(transaction, "thumbnail_cache", column)? {
            transaction
                .execute_batch(&format!(
                    "ALTER TABLE thumbnail_cache ADD COLUMN {column} {sql_type};"
                ))
                .map_err(|_| AppError::DatabaseError)?;
        }
    }
    Ok(())
}

fn table_exists(transaction: &Transaction<'_>, table: &str) -> Result<bool, AppError> {
    let mut statement = transaction
        .prepare(
            "SELECT 1 FROM sqlite_master
             WHERE type = 'table' AND name = ?1",
        )
        .map_err(|_| AppError::DatabaseError)?;
    let exists = statement
        .query_row([table], |_| Ok(()))
        .optional()
        .map_err(|_| AppError::DatabaseError)?
        .is_some();
    Ok(exists)
}

fn normalize_library_root_keys(transaction: &Transaction<'_>) -> Result<(), AppError> {
    let libraries = {
        let mut statement = transaction
            .prepare("SELECT id, root_path FROM libraries ORDER BY id")
            .map_err(|_| AppError::DatabaseError)?;
        let rows = statement
            .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)))
            .map_err(|_| AppError::DatabaseError)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)?;
        rows
    };
    for (library_id, root_path) in libraries {
        let canonical_root_key = crate::db::canonical_root_key_for_path(&root_path, false)?;
        transaction
            .execute(
                "UPDATE libraries SET canonical_root_key = ?2 WHERE id = ?1",
                (library_id, canonical_root_key),
            )
            .map_err(|_| AppError::DatabaseError)?;
    }
    Ok(())
}

fn verify_migrated_database(transaction: &Transaction<'_>) -> Result<(), AppError> {
    let foreign_key_violation: i64 = transaction
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM pragma_foreign_key_check)",
            [],
            |row| row.get(0),
        )
        .map_err(|_| AppError::DatabaseError)?;
    if foreign_key_violation != 0 {
        return Err(AppError::DatabaseError);
    }

    let quick_check: String = transaction
        .query_row("PRAGMA quick_check", [], |row| row.get(0))
        .map_err(|_| AppError::DatabaseError)?;
    if quick_check != "ok" {
        return Err(AppError::DatabaseError);
    }
    Ok(())
}

fn create_migration_backup(
    connection: &Connection,
    database_path: &Path,
    target_version: i64,
) -> Result<PathBuf, AppError> {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    let file_name = database_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("nutbook.sqlite3");
    let mut suffix = 0_u32;
    let backup_path = loop {
        let suffix_text = if suffix == 0 {
            String::new()
        } else {
            format!("-{suffix}")
        };
        let candidate = database_path.with_file_name(format!(
            "{file_name}.pre-migration-{target_version:04}-{timestamp}{suffix_text}.bak"
        ));
        if !candidate.exists() {
            break candidate;
        }
        suffix = suffix.saturating_add(1);
    };
    let mut backup_connection =
        Connection::open(&backup_path).map_err(|_| AppError::DatabaseError)?;
    let backup =
        Backup::new(connection, &mut backup_connection).map_err(|_| AppError::DatabaseError)?;
    backup
        .run_to_completion(64, std::time::Duration::from_millis(10), None)
        .map_err(|_| AppError::DatabaseError)?;
    drop(backup);
    backup_connection
        .close()
        .map_err(|_| AppError::DatabaseError)?;
    Ok(backup_path)
}

#[cfg(test)]
pub(super) fn apply_test_migration(
    connection: &mut Connection,
    version: i64,
    name: &'static str,
    sql: &'static str,
) -> Result<(), AppError> {
    apply_migrations_transaction(
        connection,
        &[Migration {
            version,
            name,
            sql,
        }],
    )
}
