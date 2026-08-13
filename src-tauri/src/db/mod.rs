pub mod agent_artifacts;
pub mod migrations;
pub mod repositories;

use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use rusqlite::{
    params, params_from_iter, types::Value, Connection, OptionalExtension, Transaction,
};
use url::Url;

use crate::{
    core::{
        document::render_markdown_as_html_for_file,
        thumbnail::{generate_html_thumbnail, HtmlThumbnailInput, ThumbnailBackend},
    },
    db::repositories::{ItemRepository, LibraryRepository, TagRepository, ThumbnailRepository},
    errors::AppError,
    models::{
        ArtifactCandidate, ArtifactCandidateGroupSummary, CreateTagRequest, DeleteTagResponse,
        GenerateThumbnailResponse, IgnoredItemSummary, IndexedItemRecord, ItemDetail, ItemSummary,
        Library, ListItemsQuery, PagedResult, SetItemTagsResponse, SkillBindingSummary, Tag,
        ThumbnailInfo, UpdateTagRequest,
    },
};

pub const INITIAL_SCHEMA_SQL: &str = include_str!("../../migrations/0001_initial.sql");

pub fn initial_schema_sql() -> &'static str {
    INITIAL_SCHEMA_SQL
}

#[derive(Debug, Clone)]
pub struct Database {
    path: PathBuf,
}

pub(crate) fn canonical_root_key_for_path(
    root_path: &str,
    require_exists: bool,
) -> Result<String, AppError> {
    let path = Path::new(root_path);
    if !path.is_absolute() {
        return Err(AppError::InvalidParams);
    }
    if let Ok(canonical) = fs::canonicalize(path) {
        return Ok(canonical.to_string_lossy().into_owned());
    }
    if require_exists {
        return Err(AppError::InvalidParams);
    }

    let mut normalized = PathBuf::new();
    for component in path.components() {
        match component {
            std::path::Component::Prefix(prefix) => normalized.push(prefix.as_os_str()),
            std::path::Component::RootDir => normalized.push(component.as_os_str()),
            std::path::Component::CurDir => {}
            std::path::Component::ParentDir => {
                if !normalized.pop() {
                    return Err(AppError::InvalidParams);
                }
            }
            std::path::Component::Normal(part) => normalized.push(part),
        }
    }
    Ok(normalized.to_string_lossy().into_owned())
}

impl Database {
    pub fn new(path: impl Into<PathBuf>) -> Result<Self, AppError> {
        let database = Self { path: path.into() };
        let database_existed_before_startup = database.path.exists()
            && database
                .path
                .metadata()
                .map(|metadata| metadata.len() > 0)
                .unwrap_or(false);
        database.initialize(database_existed_before_startup)?;
        Ok(database)
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    fn initialize(&self, database_existed_before_startup: bool) -> Result<(), AppError> {
        let mut connection = self.connection()?;
        connection
            .execute_batch(initial_schema_sql())
            .map_err(|_| AppError::DatabaseError)?;
        Self::ensure_baseline_column(
            &connection,
            "libraries",
            "source_kind",
            "ALTER TABLE libraries ADD COLUMN source_kind TEXT NOT NULL DEFAULT 'folder' CHECK (source_kind IN ('folder', 'file'))",
        )?;
        Self::ensure_baseline_column(
            &connection,
            "libraries",
            "path_state",
            "ALTER TABLE libraries ADD COLUMN path_state TEXT NOT NULL DEFAULT 'valid' CHECK (path_state IN ('valid', 'missing'))",
        )?;
        Self::ensure_baseline_column(
            &connection,
            "items",
            "path_state",
            "ALTER TABLE items ADD COLUMN path_state TEXT NOT NULL DEFAULT 'valid' CHECK (path_state IN ('valid', 'missing'))",
        )?;
        Self::ensure_baseline_column(
            &connection,
            "items",
            "is_favorite",
            "ALTER TABLE items ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1))",
        )?;
        Self::ensure_baseline_column(
            &connection,
            "items",
            "last_opened_at",
            "ALTER TABLE items ADD COLUMN last_opened_at TEXT",
        )?;
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_items_is_favorite ON items(is_favorite)",
            [],
        )
        .map_err(|_| AppError::DatabaseError)?;
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_items_last_opened_at ON items(last_opened_at DESC)",
            [],
        )
        .map_err(|_| AppError::DatabaseError)?;
        connection
            .execute_batch(
                "
                CREATE TABLE IF NOT EXISTS ignored_items (
                  item_id INTEGER PRIMARY KEY,
                  library_id INTEGER NOT NULL,
                  file_path TEXT NOT NULL UNIQUE,
                  created_at TEXT NOT NULL,
                  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
                  FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_ignored_items_library_id ON ignored_items(library_id);
                ",
            )
            .map_err(|_| AppError::DatabaseError)?;
        migrations::apply_pending_migrations(
            &mut connection,
            &self.path,
            database_existed_before_startup,
        )?;
        connection
            .execute_batch(
                "
                CREATE TABLE IF NOT EXISTS excluded_skills (
                  normalized_name TEXT PRIMARY KEY,
                  display_name TEXT NOT NULL,
                  created_at TEXT NOT NULL
                );
                ",
            )
            .map_err(|_| AppError::DatabaseError)?;
        connection
            .execute_batch(
                "
                CREATE TABLE IF NOT EXISTS skill_visibility_overrides (
                  normalized_name TEXT PRIMARY KEY,
                  display_name TEXT NOT NULL,
                  mode TEXT NOT NULL CHECK (mode IN ('include', 'exclude')),
                  created_at TEXT NOT NULL
                );
                ",
            )
            .map_err(|_| AppError::DatabaseError)?;
        connection
            .execute_batch(
                "
                CREATE TABLE IF NOT EXISTS library_skill_bindings (
                  library_id INTEGER PRIMARY KEY,
                  normalized_name TEXT NOT NULL,
                  display_name TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
                );
                ",
            )
            .map_err(|_| AppError::DatabaseError)?;
        connection
            .execute_batch(
                "
                DROP TRIGGER IF EXISTS trg_items_ai_fts;
                DROP TRIGGER IF EXISTS trg_items_au_fts;
                DROP TRIGGER IF EXISTS trg_items_soft_delete_fts;
                DROP TRIGGER IF EXISTS trg_items_ad_fts;
                DROP TRIGGER IF EXISTS trg_item_content_ai_fts;
                DROP TRIGGER IF EXISTS trg_item_content_au_fts;
                DROP TRIGGER IF EXISTS trg_item_content_ad_fts;
                ",
            )
            .map_err(|_| AppError::DatabaseError)?;
        Ok(())
    }

    fn connection(&self) -> Result<Connection, AppError> {
        let connection =
            Connection::open(&self.path).map_err(|_| AppError::DatabaseError)?;
        connection
            .pragma_update(None, "foreign_keys", "ON")
            .map_err(|_| AppError::DatabaseError)?;
        Ok(connection)
    }

    fn ensure_baseline_column(
        connection: &Connection,
        table: &str,
        column: &str,
        alter_sql: &str,
    ) -> Result<(), AppError> {
        let pragma = format!("PRAGMA table_info({table})");
        let mut statement = connection
            .prepare(&pragma)
            .map_err(|_| AppError::DatabaseError)?;
        let columns = statement
            .query_map([], |row| row.get::<_, String>(1))
            .map_err(|_| AppError::DatabaseError)?
            .collect::<Result<BTreeSet<_>, _>>()
            .map_err(|_| AppError::DatabaseError)?;
        drop(statement);
        if !columns.contains(column) {
            connection
                .execute(alter_sql, [])
                .map_err(|_| AppError::DatabaseError)?;
        }
        Ok(())
    }

    fn rebuild_fts_index(transaction: &Transaction<'_>) -> Result<(), AppError> {
        transaction
            .execute("DELETE FROM items_fts", [])
            .map_err(|_| AppError::DatabaseError)?;
        transaction
            .execute(
                "INSERT INTO items_fts(rowid, item_id, file_name, title, raw_text)
                 SELECT
                    items.id,
                    items.id,
                    items.file_name,
                    COALESCE(items.title, ''),
                    COALESCE(item_content.raw_text, '')
                 FROM items
                 LEFT JOIN item_content ON item_content.item_id = items.id
                 WHERE items.is_deleted = 0",
                [],
            )
            .map_err(|_| AppError::DatabaseError)?;
        Ok(())
    }

    fn load_tags_for_item(connection: &Connection, item_id: i64) -> Result<Vec<Tag>, AppError> {
        let mut statement = connection
            .prepare(
                "SELECT t.id, t.name, t.color, t.created_at, t.updated_at
                 FROM tags t
                 INNER JOIN item_tags it ON it.tag_id = t.id
                 WHERE it.item_id = ?1
                 ORDER BY t.name COLLATE NOCASE ASC, t.id ASC",
            )
            .map_err(|_| AppError::DatabaseError)?;

        let rows = statement
            .query_map(params![item_id], |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            })
            .map_err(|_| AppError::DatabaseError)?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)
    }

    fn load_skill_binding_for_library(
        connection: &Connection,
        library_id: i64,
    ) -> Result<Option<SkillBindingSummary>, AppError> {
        let mut statement = connection
            .prepare(
                "SELECT normalized_name, display_name
                 FROM library_skill_bindings
                 WHERE library_id = ?1",
            )
            .map_err(|_| AppError::DatabaseError)?;

        match statement.query_row(params![library_id], |row| {
            Ok(SkillBindingSummary {
                normalized_name: row.get(0)?,
                display_name: row.get(1)?,
            })
        }) {
            Ok(binding) => Ok(Some(binding)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(_) => Err(AppError::DatabaseError),
        }
    }

    fn load_thumbnail_info(
        connection: &Connection,
        item_id: i64,
    ) -> Result<Option<ThumbnailInfo>, AppError> {
        let mut statement = connection
            .prepare(
                "SELECT thumbnail_cache.thumb_status, thumbnail_cache.thumb_path, thumbnail_cache.width,
                        thumbnail_cache.height, thumbnail_cache.last_generated_at,
                        thumbnail_cache.error_message, thumbnail_cache.generated_from_hash,
                        items.file_hash, items.file_type, items.summary
                 FROM thumbnail_cache
                 INNER JOIN items ON items.id = thumbnail_cache.item_id
                 WHERE thumbnail_cache.item_id = ?1",
            )
            .map_err(|_| AppError::DatabaseError)?;

        match statement.query_row(params![item_id], |row| {
            let generated_from_hash: Option<String> = row.get(6)?;
            let file_hash: Option<String> = row.get(7)?;
            let file_type: String = row.get(8)?;
            let summary: Option<String> = row.get(9)?;
            Ok((
                ThumbnailInfo {
                    status: row.get(0)?,
                    path: row.get(1)?,
                    width: row.get(2)?,
                    height: row.get(3)?,
                    last_generated_at: row.get(4)?,
                    error_message: row.get(5)?,
                },
                generated_from_hash,
                thumbnail_cache_key(&file_type, file_hash.as_deref(), summary.as_deref()),
            ))
        }) {
            Ok((thumbnail, generated_from_hash, expected_cache_key)) => {
                if generated_from_hash != expected_cache_key {
                    Ok(None)
                } else {
                    Ok(Some(thumbnail))
                }
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(_) => Err(AppError::DatabaseError),
        }
    }

    fn thumbnail_cache_dir(&self) -> PathBuf {
        self.path
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .join(".cache")
            .join("thumbnails")
    }

    fn unique_trash_target(file_path: &Path) -> Result<PathBuf, AppError> {
        let home = std::env::var("HOME").map_err(|_| AppError::IoError)?;
        let trash_dir = Path::new(&home).join(".Trash");
        fs::create_dir_all(&trash_dir).map_err(|_| AppError::IoError)?;

        let file_name = file_path
            .file_name()
            .ok_or(AppError::IoError)?
            .to_string_lossy()
            .to_string();
        let stem = file_path
            .file_stem()
            .map(|value| value.to_string_lossy().to_string())
            .unwrap_or_else(|| file_name.clone());
        let ext = file_path
            .extension()
            .map(|value| value.to_string_lossy().to_string());

        let mut candidate = trash_dir.join(&file_name);
        let mut counter = 1_u32;
        while candidate.exists() {
            let next_name = match ext.as_deref() {
                Some(extension) if !extension.is_empty() => format!("{stem} {counter}.{extension}"),
                _ => format!("{stem} {counter}"),
            };
            candidate = trash_dir.join(next_name);
            counter += 1;
        }

        Ok(candidate)
    }

    fn move_file_to_trash(file_path: &Path) -> Result<(), AppError> {
        let target = Self::unique_trash_target(file_path)?;
        fs::rename(file_path, target).map_err(|_| AppError::IoError)
    }

    pub fn sync_filesystem_state(
        &self,
    ) -> Result<crate::models::SyncFilesystemStateResponse, AppError> {
        let connection = self.connection()?;

        let active_items = {
            let mut statement = connection
                .prepare("SELECT id, file_path, path_state FROM items WHERE is_deleted = 0")
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map([], |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                    ))
                })
                .map_err(|_| AppError::DatabaseError)?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|_| AppError::DatabaseError)?
        };

        let missing_item_ids = active_items
            .iter()
            .filter_map(|(item_id, file_path, path_state)| {
                let path = Path::new(&file_path);
                let exists = path.exists() && path.is_file();
                if !exists && path_state != "missing" {
                    Some(*item_id)
                } else {
                    None
                }
            })
            .collect::<Vec<_>>();

        let restored_item_ids = active_items
            .iter()
            .filter_map(|(item_id, file_path, path_state)| {
                let path = Path::new(&file_path);
                let exists = path.exists() && path.is_file();
                if exists && path_state != "valid" {
                    Some(*item_id)
                } else {
                    None
                }
            })
            .collect::<Vec<_>>();

        let ignored_items = {
            let mut statement = connection
                .prepare("SELECT item_id, file_path FROM ignored_items")
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)))
                .map_err(|_| AppError::DatabaseError)?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|_| AppError::DatabaseError)?
        };

        let stale_ignored_item_ids = ignored_items
            .into_iter()
            .filter_map(|(item_id, file_path)| {
                let path = Path::new(&file_path);
                if path.exists() && path.is_file() {
                    None
                } else {
                    Some(item_id)
                }
            })
            .collect::<Vec<_>>();

        let libraries = {
            let mut statement = connection
                .prepare("SELECT id, root_path, source_kind, path_state FROM libraries")
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map([], |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                        row.get::<_, String>(3)?,
                    ))
                })
                .map_err(|_| AppError::DatabaseError)?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|_| AppError::DatabaseError)?
        };

        let missing_library_ids = libraries
            .iter()
            .filter_map(|(library_id, root_path, source_kind, path_state)| {
                let path = Path::new(root_path);
                let exists = if source_kind == "file" {
                    path.exists() && path.is_file()
                } else {
                    path.exists() && path.is_dir()
                };
                if !exists && path_state != "missing" {
                    Some(*library_id)
                } else {
                    None
                }
            })
            .collect::<Vec<_>>();

        let restored_library_ids = libraries
            .iter()
            .filter_map(|(library_id, root_path, source_kind, path_state)| {
                let path = Path::new(root_path);
                let exists = if source_kind == "file" {
                    path.exists() && path.is_file()
                } else {
                    path.exists() && path.is_dir()
                };
                if exists && path_state != "valid" {
                    Some(*library_id)
                } else {
                    None
                }
            })
            .collect::<Vec<_>>();

        if missing_item_ids.is_empty()
            && restored_item_ids.is_empty()
            && stale_ignored_item_ids.is_empty()
            && missing_library_ids.is_empty()
            && restored_library_ids.is_empty()
        {
            return Ok(crate::models::SyncFilesystemStateResponse {
                missing_items_marked_missing: 0,
                restored_items_marked_valid: 0,
                missing_ignored_items_purged: 0,
                missing_libraries_marked_missing: 0,
                restored_libraries_marked_valid: 0,
            });
        }

        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;

        let mut missing_items_marked_missing = 0_u64;
        for item_id in &missing_item_ids {
            missing_items_marked_missing += transaction
                .execute(
                    "UPDATE items
                     SET path_state = 'missing'
                     WHERE id = ?1 AND is_deleted = 0 AND path_state <> 'missing'",
                    params![item_id],
                )
                .map_err(|_| AppError::DatabaseError)? as u64;
        }

        let mut restored_items_marked_valid = 0_u64;
        for item_id in &restored_item_ids {
            restored_items_marked_valid += transaction
                .execute(
                    "UPDATE items
                     SET path_state = 'valid'
                     WHERE id = ?1 AND is_deleted = 0 AND path_state <> 'valid'",
                    params![item_id],
                )
                .map_err(|_| AppError::DatabaseError)? as u64;
        }

        let mut missing_ignored_items_purged = 0_u64;
        for item_id in &stale_ignored_item_ids {
            missing_ignored_items_purged += transaction
                .execute("DELETE FROM ignored_items WHERE item_id = ?1", params![item_id])
                .map_err(|_| AppError::DatabaseError)? as u64;
        }

        let mut missing_libraries_marked_missing = 0_u64;
        for library_id in &missing_library_ids {
            missing_libraries_marked_missing += transaction
                .execute(
                    "UPDATE libraries
                     SET path_state = 'missing'
                     WHERE id = ?1 AND path_state <> 'missing'",
                    params![library_id],
                )
                .map_err(|_| AppError::DatabaseError)? as u64;
        }

        let mut restored_libraries_marked_valid = 0_u64;
        for library_id in &restored_library_ids {
            restored_libraries_marked_valid += transaction
                .execute(
                    "UPDATE libraries
                     SET path_state = 'valid'
                     WHERE id = ?1 AND path_state <> 'valid'",
                    params![library_id],
                )
                .map_err(|_| AppError::DatabaseError)? as u64;
        }

        transaction.commit().map_err(|_| AppError::DatabaseError)?;

        Ok(crate::models::SyncFilesystemStateResponse {
            missing_items_marked_missing,
            restored_items_marked_valid,
            missing_ignored_items_purged,
            missing_libraries_marked_missing,
            restored_libraries_marked_valid,
        })
    }

    pub fn list_excluded_skills(&self) -> Result<Vec<String>, AppError> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare("SELECT normalized_name FROM excluded_skills ORDER BY display_name COLLATE NOCASE ASC")
            .map_err(|_| AppError::DatabaseError)?;
        let rows = statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|_| AppError::DatabaseError)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)
    }

    pub fn list_skill_visibility_overrides(&self) -> Result<Vec<(String, String)>, AppError> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT normalized_name, mode
                 FROM skill_visibility_overrides
                 ORDER BY display_name COLLATE NOCASE ASC",
            )
            .map_err(|_| AppError::DatabaseError)?;
        let rows = statement
            .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
            .map_err(|_| AppError::DatabaseError)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)
    }

    pub fn exclude_skill(&self, normalized_name: &str, display_name: &str, now: &str) -> Result<(), AppError> {
        let connection = self.connection()?;
        connection
            .execute(
                "INSERT INTO excluded_skills (normalized_name, display_name, created_at)
                 VALUES (?1, ?2, ?3)
                 ON CONFLICT(normalized_name) DO UPDATE SET
                   display_name = excluded.display_name",
                params![normalized_name, display_name, now],
            )
            .map_err(|_| AppError::DatabaseError)?;
        connection
            .execute(
                "INSERT INTO skill_visibility_overrides (normalized_name, display_name, mode, created_at)
                 VALUES (?1, ?2, 'exclude', ?3)
                 ON CONFLICT(normalized_name) DO UPDATE SET
                   display_name = excluded.display_name,
                   mode = excluded.mode",
                params![normalized_name, display_name, now],
            )
            .map_err(|_| AppError::DatabaseError)?;
        Ok(())
    }

    pub fn restore_excluded_skill(&self, normalized_name: &str) -> Result<(), AppError> {
        let connection = self.connection()?;
        connection
            .execute(
                "DELETE FROM excluded_skills WHERE normalized_name = ?1",
                params![normalized_name],
            )
            .map_err(|_| AppError::DatabaseError)?;
        connection
            .execute(
                "INSERT INTO skill_visibility_overrides (normalized_name, display_name, mode, created_at)
                 VALUES (?1, ?1, 'include', strftime('%s','now'))
                 ON CONFLICT(normalized_name) DO UPDATE SET
                   mode = excluded.mode",
                params![normalized_name],
            )
            .map_err(|_| AppError::DatabaseError)?;
        Ok(())
    }

    pub fn list_library_skill_bindings(&self) -> Result<Vec<(i64, String, String)>, AppError> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT library_id, normalized_name, display_name
                 FROM library_skill_bindings",
            )
            .map_err(|_| AppError::DatabaseError)?;
        let rows = statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            })
            .map_err(|_| AppError::DatabaseError)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)
    }

    pub fn bind_library_to_skill(
        &self,
        library_id: i64,
        normalized_name: &str,
        display_name: &str,
        now: &str,
    ) -> Result<(), AppError> {
        let connection = self.connection()?;
        connection
            .execute(
                "INSERT INTO library_skill_bindings (library_id, normalized_name, display_name, created_at)
                 VALUES (?1, ?2, ?3, ?4)
                 ON CONFLICT(library_id) DO UPDATE SET
                   normalized_name = excluded.normalized_name,
                   display_name = excluded.display_name",
                params![library_id, normalized_name, display_name, now],
            )
            .map_err(|_| AppError::DatabaseError)?;
        Ok(())
    }

    pub fn upsert_artifact_candidates(
        &self,
        project_library_id: i64,
        candidates: &[ArtifactCandidate],
        discovered_at: &str,
    ) -> Result<Vec<ArtifactCandidate>, AppError> {
        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;
        let source_kind = transaction
            .query_row(
                "SELECT source_kind FROM libraries WHERE id = ?1",
                params![project_library_id],
                |row| row.get::<_, String>(0),
            )
            .map_err(|_| AppError::LibraryNotFound)?;
        if source_kind != "agent_project" {
            return Err(AppError::InvalidParams);
        }

        let mut persisted = Vec::new();
        for candidate in candidates {
            if candidate.project_library_id != project_library_id {
                return Err(AppError::InvalidParams);
            }
            let previous = transaction
                .query_row(
                    "SELECT id, discovery_fingerprint
                     FROM artifact_candidates
                     WHERE project_library_id = ?1 AND primary_path = ?2",
                    params![project_library_id, candidate.primary_path],
                    |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)),
                )
                .optional()
                .map_err(|_| AppError::DatabaseError)?;
            let reasons_json =
                serde_json::to_string(&candidate.reasons).map_err(|_| AppError::DatabaseError)?;
            transaction
                .execute(
                    "INSERT INTO artifact_candidates (
                       project_library_id, agent_kind, primary_path, artifact_kind, status,
                       batch_key, reasons_json, discovery_fingerprint,
                       file_size, modified_at, first_discovered_at, last_discovered_at
                     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)
                     ON CONFLICT(project_library_id, primary_path) DO UPDATE SET
                       agent_kind = excluded.agent_kind,
                       artifact_kind = excluded.artifact_kind,
                       status = CASE
                         WHEN artifact_candidates.status IN ('accepted', 'ignored')
                           THEN artifact_candidates.status
                         ELSE excluded.status
                       END,
                       batch_key = excluded.batch_key,
                       reasons_json = excluded.reasons_json,
                       discovery_fingerprint = excluded.discovery_fingerprint,
                       file_size = excluded.file_size,
                       modified_at = excluded.modified_at,
                       last_discovered_at = CASE
                         WHEN artifact_candidates.discovery_fingerprint
                              <> excluded.discovery_fingerprint
                           THEN excluded.last_discovered_at
                         ELSE artifact_candidates.last_discovered_at
                       END",
                    params![
                        project_library_id,
                        candidate.agent_kind,
                        candidate.primary_path,
                        candidate.artifact_kind,
                        candidate.status,
                        candidate.batch_key,
                        reasons_json,
                        candidate.discovery_fingerprint,
                        i64::try_from(candidate.file_size).unwrap_or(i64::MAX),
                        candidate.modified_at,
                        discovered_at,
                    ],
                )
                .map_err(|_| AppError::DatabaseError)?;
            let candidate_id = previous
                .as_ref()
                .map(|(id, _)| *id)
                .unwrap_or_else(|| transaction.last_insert_rowid());

            for evidence in &candidate.evidence {
                transaction
                    .execute(
                        "INSERT OR IGNORE INTO artifact_candidate_evidence (
                           candidate_id, evidence_fingerprint, agent_kind,
                           reason_kind, event_id, run_reference_hash, observed_at,
                           skill_normalized_name, skill_display_name,
                           manifest_entry_id, edit_contract, save_policy
                         ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                        params![
                            candidate_id,
                            evidence.fingerprint,
                            evidence.agent_kind,
                            evidence.reason.as_str(),
                            evidence.event_id,
                            evidence.run_reference_hash,
                            evidence.observed_at,
                            evidence.skill_normalized_name,
                            evidence.skill_display_name,
                            evidence.manifest_entry_id,
                            evidence.edit_contract,
                            evidence.save_policy,
                        ],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
            }

            let facts_changed = previous
                .as_ref()
                .is_none_or(|(_, fingerprint)| fingerprint != &candidate.discovery_fingerprint);
            if facts_changed {
                transaction
                    .execute(
                        "DELETE FROM artifact_candidate_related_files
                         WHERE candidate_id = ?1",
                        params![candidate_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                for related in &candidate.related_files {
                    transaction
                        .execute(
                            "INSERT INTO artifact_candidate_related_files (
                               candidate_id, file_path, role
                             ) VALUES (?1, ?2, ?3)",
                            params![candidate_id, related.path, related.role],
                        )
                        .map_err(|_| AppError::DatabaseError)?;
                }
            }

            let mut stored = candidate.clone();
            stored.id = Some(candidate_id);
            if let Some((_, _)) = previous {
                let preserved_status: String = transaction
                    .query_row(
                        "SELECT status FROM artifact_candidates WHERE id = ?1",
                        params![candidate_id],
                        |row| row.get(0),
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                stored.status = preserved_status;
            }
            persisted.push(stored);
        }
        transaction.commit().map_err(|_| AppError::DatabaseError)?;
        Ok(persisted)
    }

    pub fn list_artifact_candidate_groups(
        &self,
        project_library_id: i64,
    ) -> Result<Vec<ArtifactCandidateGroupSummary>, AppError> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT batch_key, status, primary_path
                 FROM artifact_candidates
                 WHERE project_library_id = ?1
                   AND status IN ('suggested', 'pending', 'excluded')
                 ORDER BY batch_key, status, primary_path",
            )
            .map_err(|_| AppError::DatabaseError)?;
        let rows = statement
            .query_map(params![project_library_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            })
            .map_err(|_| AppError::DatabaseError)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)?;
        let candidates = rows
            .into_iter()
            .map(|(batch_key, status, primary_path)| ArtifactCandidate {
                id: None,
                project_library_id,
                agent_kind: String::new(),
                primary_path,
                artifact_kind: String::new(),
                status,
                batch_key,
                reasons: Vec::new(),
                discovery_fingerprint: String::new(),
                file_size: 0,
                modified_at: None,
                related_files: Vec::new(),
                evidence: Vec::new(),
            })
            .collect::<Vec<_>>();
        Ok(crate::core::artifact_discovery::summarize_candidate_groups(
            &candidates,
        ))
    }

    pub fn list_artifact_candidates_for_review(
        &self,
        project_library_id: i64,
    ) -> Result<Vec<ArtifactCandidate>, AppError> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT id, batch_key, status
                 FROM artifact_candidates
                 WHERE project_library_id = ?1
                   AND status IN ('suggested', 'pending')
                 ORDER BY batch_key, status, primary_path",
            )
            .map_err(|_| AppError::DatabaseError)?;
        let rows = statement
            .query_map(params![project_library_id], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            })
            .map_err(|_| AppError::DatabaseError)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)?;
        let mut candidates = Vec::new();
        for (candidate_id, _batch_key, _status) in rows {
            if let Some(candidate) = crate::db::agent_artifacts::load_candidate(
                &connection,
                project_library_id,
                candidate_id,
            )? {
                candidates.push(candidate);
            }
        }
        Ok(candidates)
    }

    pub fn list_indexed_manifest_artifacts(
        &self,
        project_library_id: i64,
    ) -> Result<Vec<ArtifactCandidate>, AppError> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT DISTINCT artifact_candidates.id
                 FROM artifact_candidates
                 INNER JOIN artifact_candidate_evidence
                   ON artifact_candidate_evidence.candidate_id = artifact_candidates.id
                 WHERE artifact_candidates.project_library_id = ?1
                   AND artifact_candidates.status = 'accepted'
                   AND artifact_candidate_evidence.manifest_entry_id IS NOT NULL
                 ORDER BY artifact_candidates.primary_path",
            )
            .map_err(|_| AppError::DatabaseError)?;
        let candidate_ids = statement
            .query_map(params![project_library_id], |row| row.get::<_, i64>(0))
            .map_err(|_| AppError::DatabaseError)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)?;
        let mut candidates = Vec::new();
        for candidate_id in candidate_ids {
            if let Some(candidate) = crate::db::agent_artifacts::load_candidate(
                &connection,
                project_library_id,
                candidate_id,
            )? {
                candidates.push(candidate);
            }
        }
        Ok(candidates)
    }
}

impl LibraryRepository for Database {
    fn list_libraries(&self) -> Result<Vec<Library>, AppError> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT id, name, root_path, source_kind, path_state, is_active, created_at, updated_at, last_scanned_at
                 FROM libraries
                 WHERE source_kind <> 'agent_project'
                    OR EXISTS (
                      SELECT 1
                      FROM item_sources
                      INNER JOIN items ON items.id = item_sources.item_id
                      WHERE item_sources.library_id = libraries.id
                        AND items.is_deleted = 0
                    )
                 ORDER BY id ASC",
            )
            .map_err(|_| AppError::DatabaseError)?;

        let rows = statement
            .query_map([], |row| {
                Ok(Library {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    root_path: row.get(2)?,
                    source_kind: row.get(3)?,
                    path_state: row.get(4)?,
                    is_active: row.get::<_, i64>(5)? != 0,
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                    last_scanned_at: row.get(8)?,
                    skill_binding: None,
                })
            })
            .map_err(|_| AppError::DatabaseError)?;

        let mut libraries = rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)?;

        for library in &mut libraries {
            library.skill_binding =
                Self::load_skill_binding_for_library(&connection, library.id)?;
        }

        Ok(libraries)
    }

    fn upsert_library(&self, library: Library) -> Result<Library, AppError> {
        let connection = self.connection()?;
        let canonical_root_key = canonical_root_key_for_path(&library.root_path, false)?;
        connection
            .execute(
                "INSERT INTO libraries (id, name, root_path, canonical_root_key, source_kind, path_state, is_active, created_at, updated_at, last_scanned_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                 ON CONFLICT(canonical_root_key, source_kind) DO UPDATE SET
                   name = excluded.name,
                   root_path = excluded.root_path,
                   path_state = excluded.path_state,
                   is_active = excluded.is_active,
                   updated_at = excluded.updated_at,
                   last_scanned_at = excluded.last_scanned_at",
                params![
                    library.id,
                    library.name,
                    library.root_path,
                    canonical_root_key,
                    library.source_kind,
                    library.path_state,
                    if library.is_active { 1 } else { 0 },
                    library.created_at,
                    library.updated_at,
                    library.last_scanned_at,
                ],
            )
            .map_err(|_| AppError::DatabaseError)?;

        Ok(library)
    }

    fn update_library(&self, library: Library) -> Result<Library, AppError> {
        let connection = self.connection()?;
        let canonical_root_key = canonical_root_key_for_path(&library.root_path, false)?;
        let changed = connection
            .execute(
                "UPDATE libraries
                 SET name = ?2,
                     root_path = ?3,
                     canonical_root_key = ?4,
                     source_kind = ?5,
                     path_state = ?6,
                     is_active = ?7,
                     updated_at = ?8,
                     last_scanned_at = ?9
                 WHERE id = ?1",
                params![
                    library.id,
                    library.name,
                    library.root_path,
                    canonical_root_key,
                    library.source_kind,
                    library.path_state,
                    if library.is_active { 1 } else { 0 },
                    library.updated_at,
                    library.last_scanned_at,
                ],
            )
            .map_err(|_| AppError::DatabaseError)?;

        if changed == 0 {
            return Err(AppError::LibraryNotFound);
        }

        Ok(library)
    }

    fn next_library_id(&self) -> Result<i64, AppError> {
        let connection = self.connection()?;
        let max_id: Option<i64> = connection
            .query_row("SELECT MAX(id) FROM libraries", [], |row| row.get(0))
            .map_err(|_| AppError::DatabaseError)?;

        Ok(max_id.unwrap_or(0) + 1)
    }

    fn delete_library(&self, library_id: i64) -> Result<bool, AppError> {
        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;

        let exists = transaction
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM libraries WHERE id = ?1)",
                params![library_id],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|_| AppError::DatabaseError)?;
        if exists == 0 {
            return Err(AppError::LibraryNotFound);
        }

        let source_links = {
            let mut statement = transaction
                .prepare(
                    "SELECT item_id, is_owner
                     FROM item_sources
                     WHERE library_id = ?1
                     ORDER BY item_id",
                )
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map(params![library_id], |row| {
                    Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)? != 0))
                })
                .map_err(|_| AppError::DatabaseError)?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|_| AppError::DatabaseError)?
        };

        for (item_id, is_owner) in source_links {
            if !is_owner {
                transaction
                    .execute(
                        "DELETE FROM item_sources
                         WHERE item_id = ?1 AND library_id = ?2",
                        params![item_id, library_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                transaction
                    .execute(
                        "UPDATE ignored_items
                         SET library_id = (
                           SELECT library_id FROM items WHERE id = ?1
                         )
                         WHERE item_id = ?1 AND library_id = ?2",
                        params![item_id, library_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                continue;
            }

            let replacement = transaction
                .query_row(
                    "SELECT library_id
                     FROM item_sources
                     WHERE item_id = ?1 AND library_id <> ?2
                     ORDER BY CASE link_kind
                       WHEN 'manifest' THEN 0
                       WHEN 'discovered' THEN 1
                       ELSE 2
                     END, library_id
                     LIMIT 1",
                    params![item_id, library_id],
                    |row| row.get::<_, i64>(0),
                )
                .optional()
                .map_err(|_| AppError::DatabaseError)?;

            if let Some(replacement_library_id) = replacement {
                transaction
                    .execute(
                        "UPDATE item_sources SET is_owner = 0
                         WHERE item_id = ?1 AND library_id = ?2",
                        params![item_id, library_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                transaction
                    .execute(
                        "UPDATE item_sources SET is_owner = 1
                         WHERE item_id = ?1 AND library_id = ?2",
                        params![item_id, replacement_library_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                transaction
                    .execute(
                        "UPDATE items SET library_id = ?2 WHERE id = ?1",
                        params![item_id, replacement_library_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                transaction
                    .execute(
                        "UPDATE ignored_items SET library_id = ?2
                         WHERE item_id = ?1",
                        params![item_id, replacement_library_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                transaction
                    .execute(
                        "DELETE FROM item_sources
                         WHERE item_id = ?1 AND library_id = ?2",
                        params![item_id, library_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
            } else {
                transaction
                    .execute("DELETE FROM items WHERE id = ?1", params![item_id])
                    .map_err(|_| AppError::DatabaseError)?;
            }
        }

        transaction
            .execute("DELETE FROM libraries WHERE id = ?1", params![library_id])
            .map_err(|_| AppError::DatabaseError)?;

        Self::rebuild_fts_index(&transaction)?;
        transaction.commit().map_err(|_| AppError::DatabaseError)?;
        Ok(true)
    }
}

impl ItemRepository for Database {
    fn replace_items_for_library(
        &self,
        library_id: i64,
        items: &[IndexedItemRecord],
    ) -> Result<(u64, u64, u64), AppError> {
        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;

        let source_kind: String = transaction
            .query_row(
                "SELECT source_kind FROM libraries WHERE id = ?1",
                params![library_id],
                |row| row.get(0),
            )
            .map_err(|_| AppError::LibraryNotFound)?;
        if source_kind == "agent_project" {
            return Err(AppError::InvalidParams);
        }
        let link_kind = "legacy";

        let ignored_paths = {
            let mut statement = transaction
                .prepare("SELECT file_path FROM ignored_items WHERE library_id = ?1")
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map(params![library_id], |row| row.get::<_, String>(0))
                .map_err(|_| AppError::DatabaseError)?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|_| AppError::DatabaseError)?
        };

        let existing_links = {
            let mut statement = transaction
                .prepare(
                    "SELECT item_sources.item_id, items.file_path, item_sources.is_owner
                     FROM item_sources
                     INNER JOIN items ON items.id = item_sources.item_id
                     WHERE item_sources.library_id = ?1",
                )
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map(params![library_id], |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, i64>(2)? != 0,
                    ))
                })
                .map_err(|_| AppError::DatabaseError)?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|_| AppError::DatabaseError)?
        };
        let mut existing_by_path = {
            let mut statement = transaction
                .prepare("SELECT id, file_path, is_deleted FROM items")
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map([], |row| {
                    Ok((
                        row.get::<_, String>(1)?,
                        (row.get::<_, i64>(0)?, row.get::<_, i64>(2)? != 0),
                    ))
                })
                .map_err(|_| AppError::DatabaseError)?;
            rows.collect::<Result<BTreeMap<_, _>, _>>()
                .map_err(|_| AppError::DatabaseError)?
        };

        let mut created = 0_u64;
        let mut updated = 0_u64;
        let mut scanned_paths = BTreeSet::new();
        for item in items {
            if ignored_paths.iter().any(|path| path == &item.file_path) {
                continue;
            }
            scanned_paths.insert(item.file_path.clone());
            if let Some((item_id, _was_deleted)) = existing_by_path.get(&item.file_path) {
                transaction
                    .execute(
                        "UPDATE items SET
                           relative_path = ?2,
                           file_name = ?3,
                           file_ext = ?4,
                           file_type = ?5,
                           file_size = ?6,
                           modified_at = ?7,
                           path_state = 'valid',
                           is_deleted = 0,
                           updated_at = ?8
                         WHERE id = ?1",
                        params![
                            item_id,
                            item.relative_path,
                            item.file_name,
                            item.file_ext,
                            item.file_type,
                            item.file_size,
                            item.modified_at,
                            item.updated_at,
                        ],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                transaction
                    .execute(
                        "INSERT INTO item_sources (
                           item_id, library_id, link_kind, is_owner, created_at
                         ) VALUES (?1, ?2, ?3, 0, ?4)
                         ON CONFLICT(item_id, library_id) DO UPDATE SET
                           link_kind = CASE
                             WHEN item_sources.link_kind = 'manifest' THEN 'manifest'
                             ELSE excluded.link_kind
                           END",
                        params![item_id, library_id, link_kind, item.created_at],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                updated += 1;
            } else {
                transaction
                    .execute(
                    "INSERT INTO items (
                        library_id, file_path, relative_path, file_name, file_ext, file_type,
                        file_size, modified_at, file_hash, title, summary, path_state, is_favorite, last_opened_at, is_deleted, created_at, updated_at
                     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, NULL, NULL, 'valid', 0, NULL, 0, ?9, ?10)",
                        params![
                            library_id,
                            item.file_path,
                            item.relative_path,
                            item.file_name,
                            item.file_ext,
                            item.file_type,
                            item.file_size,
                            item.modified_at,
                            item.created_at,
                            item.updated_at,
                        ],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                let item_id = transaction.last_insert_rowid();
                transaction
                    .execute(
                        "INSERT INTO item_sources (
                           item_id, library_id, link_kind, is_owner, created_at
                         ) VALUES (?1, ?2, ?3, 1, ?4)",
                        params![item_id, library_id, link_kind, item.created_at],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                existing_by_path.insert(item.file_path.clone(), (item_id, false));
                created += 1;
            }
        }

        let mut deleted = 0_u64;
        for (item_id, file_path, is_owner) in existing_links {
            if scanned_paths.contains(&file_path) {
                continue;
            }
            if !is_owner {
                transaction
                    .execute(
                        "DELETE FROM item_sources
                         WHERE item_id = ?1 AND library_id = ?2",
                        params![item_id, library_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                continue;
            }

            let replacement = transaction
                .query_row(
                    "SELECT library_id
                     FROM item_sources
                     WHERE item_id = ?1 AND library_id <> ?2
                     ORDER BY CASE link_kind
                       WHEN 'manifest' THEN 0
                       WHEN 'discovered' THEN 1
                       ELSE 2
                     END, library_id
                     LIMIT 1",
                    params![item_id, library_id],
                    |row| row.get::<_, i64>(0),
                )
                .optional()
                .map_err(|_| AppError::DatabaseError)?;
            if let Some(replacement_library_id) = replacement {
                transaction
                    .execute(
                        "UPDATE item_sources SET is_owner = 0
                         WHERE item_id = ?1 AND library_id = ?2",
                        params![item_id, library_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                transaction
                    .execute(
                        "UPDATE item_sources SET is_owner = 1
                         WHERE item_id = ?1 AND library_id = ?2",
                        params![item_id, replacement_library_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                transaction
                    .execute(
                        "UPDATE items SET library_id = ?2 WHERE id = ?1",
                        params![item_id, replacement_library_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                transaction
                    .execute(
                        "DELETE FROM item_sources
                         WHERE item_id = ?1 AND library_id = ?2",
                        params![item_id, library_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
            } else {
                deleted += transaction
                    .execute(
                        "UPDATE items SET is_deleted = 1
                         WHERE id = ?1 AND is_deleted = 0",
                        params![item_id],
                    )
                    .map_err(|_| AppError::DatabaseError)? as u64;
            }
        }

        Self::rebuild_fts_index(&transaction)?;
        transaction.commit().map_err(|_| AppError::DatabaseError)?;
        Ok((created, updated, deleted))
    }

    fn list_items(&self, query: &ListItemsQuery) -> Result<PagedResult<ItemSummary>, AppError> {
        let connection = self.connection()?;
        let include_deleted = query.include_deleted.unwrap_or(false);
        let sort_column = match query.sort_by.as_deref() {
            Some("fileName") => "file_name",
            Some("createdAt") => "created_at",
            Some("lastOpenedAt") => "COALESCE(last_opened_at, '0')",
            Some("modifiedAt") | None => "modified_at",
            Some(_) => return Err(AppError::InvalidParams),
        };
        let sort_order = match query.sort_order.as_deref() {
            Some("asc") => "ASC",
            Some("desc") | None => "DESC",
            Some(_) => return Err(AppError::InvalidParams),
        };
        let page = query.page.unwrap_or(1).max(1);
        let page_size = query.page_size.unwrap_or(30).max(1);
        let offset = ((page - 1) * page_size) as i64;

        let mut where_clauses: Vec<String> = Vec::new();
        let mut args = Vec::new();

        if let Some(library_id) = query.library_id {
            where_clauses.push(
                "id IN (
                   SELECT item_id FROM item_sources WHERE library_id = ?
                 )"
                .to_string(),
            );
            args.push(Value::Integer(library_id));
        }

        match query.browse_mode.as_deref() {
            Some("recent") => {
                where_clauses.push("last_opened_at IS NOT NULL".to_string());
            }
            Some("starred") => {
                where_clauses.push("is_favorite = 1".to_string());
            }
            Some("all") | None => {}
            Some(_) => return Err(AppError::InvalidParams),
        }

        if !include_deleted {
            where_clauses.push("is_deleted = 0".to_string());
        }

        if let Some(keyword) = normalize_keyword_query(query.keyword.as_deref()) {
            where_clauses.push(
                "id IN (SELECT rowid FROM items_fts WHERE items_fts MATCH ?)".to_string(),
            );
            args.push(Value::Text(keyword));
        }

        if let Some(file_types) = query.file_types.as_ref() {
            if !file_types.is_empty() {
                let placeholders = vec!["?"; file_types.len()].join(", ");
                where_clauses.push(format!("file_type IN ({placeholders})"));
                for file_type in file_types {
                    args.push(Value::Text(file_type.clone()));
                }
            }
        }

        if let Some(tag_ids) = query.tag_ids.as_ref() {
            if !tag_ids.is_empty() {
                let placeholders = vec!["?"; tag_ids.len()].join(", ");
                where_clauses.push(format!(
                    "id IN (
                        SELECT item_id
                        FROM item_tags
                        WHERE tag_id IN ({placeholders})
                        GROUP BY item_id
                        HAVING COUNT(DISTINCT tag_id) = ?
                    )"
                ));
                for tag_id in tag_ids {
                    args.push(Value::Integer(*tag_id));
                }
                args.push(Value::Integer(tag_ids.len() as i64));
            }
        }

        let where_sql = if where_clauses.is_empty() {
            String::new()
        } else {
            format!("WHERE {}", where_clauses.join(" AND "))
        };

        let count_sql = format!("SELECT COUNT(*) FROM items {where_sql}");
        let total: u64 = connection
            .query_row(&count_sql, params_from_iter(args.clone()), |row| row.get(0))
            .map_err(|_| AppError::DatabaseError)?;

        let sql = format!(
            "SELECT id, library_id, file_path, relative_path, file_name, file_ext, file_type,
                    file_size, modified_at, title, summary, path_state, is_favorite, last_opened_at
             FROM items
             {where_sql}
             ORDER BY {sort_column} {sort_order}, id ASC
             LIMIT ? OFFSET ?"
        );

        args.push(Value::Integer(page_size as i64));
        args.push(Value::Integer(offset));

        let mut statement = connection.prepare(&sql).map_err(|_| AppError::DatabaseError)?;
        let mapper = |row: &rusqlite::Row<'_>| {
            Ok(ItemSummary {
                id: row.get(0)?,
                library_id: row.get(1)?,
                file_path: row.get(2)?,
                relative_path: row.get(3)?,
                file_name: row.get(4)?,
                file_ext: row.get(5)?,
                file_type: row.get(6)?,
                file_size: row.get(7)?,
                modified_at: row.get(8)?,
                title: row.get(9)?,
                summary: row.get(10)?,
                path_state: row.get(11)?,
                is_favorite: row.get::<_, i64>(12)? != 0,
                last_opened_at: row.get(13)?,
                skill_binding: None,
                tags: Vec::new(),
                thumbnail: None,
            })
        };
        let mut items = statement
            .query_map(params_from_iter(args), mapper)
            .map_err(|_| AppError::DatabaseError)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)?;

        for item in &mut items {
            item.skill_binding =
                Self::load_skill_binding_for_library(&connection, item.library_id)?;
            item.tags = Self::load_tags_for_item(&connection, item.id)?;
            item.thumbnail = Self::load_thumbnail_info(&connection, item.id)?;
        }

        Ok(PagedResult {
            items,
            page,
            page_size,
            total,
            has_more: u64::from(page) * u64::from(page_size) < total,
        })
    }

    fn get_item_detail(&self, item_id: i64) -> Result<ItemDetail, AppError> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT
                    i.id, i.library_id, i.file_path, i.relative_path, i.file_name, i.file_ext,
                    i.file_type, i.file_size, i.modified_at, i.title, i.summary, i.path_state, i.is_favorite, i.last_opened_at,
                    i.file_hash, ic.extracted_title, ic.source_text, ic.raw_text, ic.rendered_cache,
                    i.created_at, i.updated_at
                 FROM items i
                 LEFT JOIN item_content ic ON ic.item_id = i.id
                 WHERE i.id = ?1 AND i.is_deleted = 0",
            )
            .map_err(|_| AppError::DatabaseError)?;

        let mut detail = statement
            .query_row(params![item_id], |row| {
                Ok(ItemDetail {
                    summary: ItemSummary {
                        id: row.get(0)?,
                        library_id: row.get(1)?,
                        file_path: row.get(2)?,
                        relative_path: row.get(3)?,
                        file_name: row.get(4)?,
                        file_ext: row.get(5)?,
                        file_type: row.get(6)?,
                        file_size: row.get(7)?,
                        modified_at: row.get(8)?,
                        title: row.get(9)?,
                        summary: row.get(10)?,
                        path_state: row.get(11)?,
                        is_favorite: row.get::<_, i64>(12)? != 0,
                        last_opened_at: row.get(13)?,
                        skill_binding: None,
                        tags: Vec::new(),
                        thumbnail: None,
                    },
                    file_hash: row.get(14)?,
                    extracted_title: row.get(15)?,
                    source_text: row.get(16)?,
                    raw_text: row.get(17)?,
                    rendered_cache: row.get(18)?,
                    created_at: row.get(19)?,
                    updated_at: row.get(20)?,
                })
            })
            .map_err(|_| AppError::ItemNotFound)?;

        detail.summary.skill_binding =
            Self::load_skill_binding_for_library(&connection, detail.summary.library_id)?;
        detail.summary.tags = Self::load_tags_for_item(&connection, item_id)?;
        detail.summary.thumbnail = Self::load_thumbnail_info(&connection, item_id)?;
        Ok(detail)
    }

    fn set_item_favorite(&self, item_id: i64, is_favorite: bool) -> Result<(), AppError> {
        let connection = self.connection()?;
        let changed = connection
            .execute(
                "UPDATE items SET is_favorite = ?2 WHERE id = ?1 AND is_deleted = 0",
                params![item_id, if is_favorite { 1 } else { 0 }],
            )
            .map_err(|_| AppError::DatabaseError)?;
        if changed == 0 {
            return Err(AppError::ItemNotFound);
        }
        Ok(())
    }

    fn mark_item_opened(&self, item_id: i64, opened_at: &str) -> Result<(), AppError> {
        let connection = self.connection()?;
        let changed = connection
            .execute(
                "UPDATE items SET last_opened_at = ?2, updated_at = CASE WHEN updated_at IS NULL OR updated_at = '' THEN ?2 ELSE updated_at END WHERE id = ?1 AND is_deleted = 0",
                params![item_id, opened_at],
            )
            .map_err(|_| AppError::DatabaseError)?;
        if changed == 0 {
            return Err(AppError::ItemNotFound);
        }
        Ok(())
    }

    fn update_markdown_item_content(
        &self,
        item_id: i64,
        summary: &str,
        modified_at: &str,
        file_hash: &str,
        source_text: &str,
        raw_text: &str,
        rendered_cache: &str,
    ) -> Result<(), AppError> {
        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;

        transaction
            .execute(
                "UPDATE items
                 SET summary = ?2, modified_at = ?3, file_hash = ?4, updated_at = ?3
                 WHERE id = ?1",
                params![item_id, summary, modified_at, file_hash],
            )
            .map_err(|_| AppError::DatabaseError)?;

        transaction
            .execute(
                "INSERT INTO item_content (
                    item_id, source_text, raw_text, rendered_cache, extracted_title, updated_at
                 ) VALUES (?1, ?2, ?3, ?4, NULL, ?5)
                 ON CONFLICT(item_id) DO UPDATE SET
                    source_text = excluded.source_text,
                    raw_text = excluded.raw_text,
                    rendered_cache = excluded.rendered_cache,
                    updated_at = excluded.updated_at",
                params![item_id, source_text, raw_text, rendered_cache, modified_at],
            )
            .map_err(|_| AppError::DatabaseError)?;

        Self::rebuild_fts_index(&transaction)?;
        transaction.commit().map_err(|_| AppError::DatabaseError)?;
        Ok(())
    }

    fn remove_item_from_nutbook(&self, item_id: i64, now: &str) -> Result<(), AppError> {
        let item = self.get_item_detail(item_id)?;
        let libraries = self.list_libraries()?;
        let library = libraries
            .into_iter()
            .find(|entry| entry.id == item.summary.library_id)
            .ok_or(AppError::LibraryNotFound)?;

        if library.source_kind == "file"
            && Path::new(&item.summary.file_path) == Path::new(&library.root_path)
        {
            self.delete_library(library.id)?;
            return Ok(());
        }

        let mut connection = self.connection()?;
        let transaction = connection.transaction().map_err(|_| AppError::DatabaseError)?;
        transaction
            .execute(
                "INSERT INTO ignored_items (item_id, library_id, file_path, created_at)
                 VALUES (?1, ?2, ?3, ?4)
                 ON CONFLICT(item_id) DO UPDATE SET
                   library_id = excluded.library_id,
                   file_path = excluded.file_path,
                   created_at = excluded.created_at",
                params![item_id, item.summary.library_id, item.summary.file_path, now],
            )
            .map_err(|_| AppError::DatabaseError)?;
        transaction
            .execute("UPDATE items SET is_deleted = 1 WHERE id = ?1", params![item_id])
            .map_err(|_| AppError::DatabaseError)?;
        if library.source_kind == "agent_project" {
            let project_root = fs::canonicalize(&library.root_path)
                .map_err(|_| AppError::InvalidParams)?;
            let item_path = fs::canonicalize(&item.summary.file_path)
                .map_err(|_| AppError::InvalidParams)?;
            if let Ok(relative_path) = item_path.strip_prefix(project_root) {
                transaction
                    .execute(
                        "UPDATE artifact_candidates
                         SET status = 'pending'
                         WHERE project_library_id = ?1
                           AND primary_path = ?2
                           AND status = 'accepted'",
                        params![
                            library.id,
                            relative_path.to_string_lossy().replace('\\', "/")
                        ],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
            }
        }
        Self::rebuild_fts_index(&transaction)?;
        transaction.commit().map_err(|_| AppError::DatabaseError)?;
        Ok(())
    }

    fn list_ignored_items(&self) -> Result<Vec<IgnoredItemSummary>, AppError> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT ii.item_id, ii.library_id, COALESCE(l.name, '未知来源'), ii.file_path,
                        i.file_name, ii.created_at
                 FROM ignored_items ii
                 LEFT JOIN libraries l ON l.id = ii.library_id
                 LEFT JOIN items i ON i.id = ii.item_id
                 ORDER BY ii.created_at DESC, ii.item_id DESC",
            )
            .map_err(|_| AppError::DatabaseError)?;

        let rows = statement
            .query_map([], |row| {
                let file_path: String = row.get(3)?;
                let file_name = row
                    .get::<_, Option<String>>(4)?
                    .filter(|value| !value.is_empty())
                    .unwrap_or_else(|| {
                        std::path::Path::new(&file_path)
                            .file_name()
                            .and_then(|name| name.to_str())
                            .unwrap_or("未知文件")
                            .to_string()
                    });
                Ok(IgnoredItemSummary {
                    item_id: row.get(0)?,
                    library_id: row.get(1)?,
                    library_name: row.get(2)?,
                    file_path,
                    file_name,
                    created_at: row.get(5)?,
                })
            })
            .map_err(|_| AppError::DatabaseError)?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)
    }

    fn restore_ignored_item(&self, item_id: i64) -> Result<(), AppError> {
        let mut connection = self.connection()?;
        let transaction = connection.transaction().map_err(|_| AppError::DatabaseError)?;
        let changed = transaction
            .execute("DELETE FROM ignored_items WHERE item_id = ?1", params![item_id])
            .map_err(|_| AppError::DatabaseError)?;
        if changed == 0 {
            return Err(AppError::ItemNotFound);
        }
        transaction
            .execute("UPDATE items SET is_deleted = 0 WHERE id = ?1", params![item_id])
            .map_err(|_| AppError::DatabaseError)?;
        Self::rebuild_fts_index(&transaction)?;
        transaction.commit().map_err(|_| AppError::DatabaseError)?;
        Ok(())
    }

    fn move_item_to_trash(&self, item_id: i64, now: &str) -> Result<(), AppError> {
        let item = self.get_item_detail(item_id)?;
        let file_path = PathBuf::from(&item.summary.file_path);
        Self::move_file_to_trash(&file_path)?;

        let libraries = self.list_libraries()?;
        let library = libraries
            .into_iter()
            .find(|entry| entry.id == item.summary.library_id)
            .ok_or(AppError::LibraryNotFound)?;

        if library.source_kind == "file"
            && Path::new(&item.summary.file_path) == Path::new(&library.root_path)
        {
            self.delete_library(library.id)?;
            return Ok(());
        }

        let mut connection = self.connection()?;
        let transaction = connection.transaction().map_err(|_| AppError::DatabaseError)?;
        transaction
            .execute(
                "INSERT INTO ignored_items (item_id, library_id, file_path, created_at)
                 VALUES (?1, ?2, ?3, ?4)
                 ON CONFLICT(item_id) DO UPDATE SET
                   library_id = excluded.library_id,
                   file_path = excluded.file_path,
                   created_at = excluded.created_at",
                params![item_id, item.summary.library_id, item.summary.file_path, now],
            )
            .map_err(|_| AppError::DatabaseError)?;
        transaction
            .execute("UPDATE items SET is_deleted = 1 WHERE id = ?1", params![item_id])
            .map_err(|_| AppError::DatabaseError)?;
        Self::rebuild_fts_index(&transaction)?;
        transaction.commit().map_err(|_| AppError::DatabaseError)?;
        Ok(())
    }
}

impl TagRepository for Database {
    fn list_tags(&self) -> Result<Vec<Tag>, AppError> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT id, name, color, created_at, updated_at
                 FROM tags
                 ORDER BY name COLLATE NOCASE ASC, id ASC",
            )
            .map_err(|_| AppError::DatabaseError)?;

        let rows = statement
            .query_map([], |row| {
                Ok(Tag {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    color: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            })
            .map_err(|_| AppError::DatabaseError)?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)
    }

    fn create_tag(&self, payload: &CreateTagRequest) -> Result<Tag, AppError> {
        let name = payload.name.trim();
        if name.is_empty() {
            return Err(AppError::InvalidParams);
        }

        let now = current_timestamp();
        let connection = self.connection()?;
        let inserted = connection.execute(
            "INSERT INTO tags (name, color, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![name, payload.color.clone(), now, now],
        );

        match inserted {
            Ok(_) => {
                let id = connection.last_insert_rowid();
                Ok(Tag {
                    id,
                    name: name.to_string(),
                    color: payload.color.clone(),
                    created_at: now.clone(),
                    updated_at: now,
                })
            }
            Err(rusqlite::Error::SqliteFailure(err, _))
                if err.extended_code == rusqlite::ffi::SQLITE_CONSTRAINT_UNIQUE =>
            {
                Err(AppError::TagNameExists)
            }
            Err(_) => Err(AppError::DatabaseError),
        }
    }

    fn update_tag(&self, payload: &UpdateTagRequest) -> Result<Tag, AppError> {
        let connection = self.connection()?;
        let existing = connection
            .query_row(
                "SELECT id, name, color, created_at, updated_at FROM tags WHERE id = ?1",
                params![payload.id],
                |row| {
                    Ok(Tag {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        color: row.get(2)?,
                        created_at: row.get(3)?,
                        updated_at: row.get(4)?,
                    })
                },
            )
            .map_err(|_| AppError::TagNotFound)?;

        let next_name = payload
            .name
            .as_deref()
            .map(str::trim)
            .unwrap_or(existing.name.as_str())
            .to_string();
        if next_name.is_empty() {
            return Err(AppError::InvalidParams);
        }
        let next_color = payload.color.clone().or(existing.color.clone());
        let now = current_timestamp();

        let updated = connection.execute(
            "UPDATE tags
             SET name = ?2, color = ?3, updated_at = ?4
             WHERE id = ?1",
            params![payload.id, next_name, next_color, now],
        );

        match updated {
            Ok(changed) if changed == 1 => Ok(Tag {
                id: payload.id,
                name: next_name,
                color: next_color,
                created_at: existing.created_at,
                updated_at: now,
            }),
            Ok(_) => Err(AppError::TagNotFound),
            Err(rusqlite::Error::SqliteFailure(err, _))
                if err.extended_code == rusqlite::ffi::SQLITE_CONSTRAINT_UNIQUE =>
            {
                Err(AppError::TagNameExists)
            }
            Err(_) => Err(AppError::DatabaseError),
        }
    }

    fn delete_tag(&self, tag_id: i64) -> Result<DeleteTagResponse, AppError> {
        let connection = self.connection()?;
        let changed = connection
            .execute("DELETE FROM tags WHERE id = ?1", params![tag_id])
            .map_err(|_| AppError::DatabaseError)?;

        if changed == 0 {
            return Err(AppError::TagNotFound);
        }

        Ok(DeleteTagResponse { success: true })
    }

    fn set_item_tags(&self, item_id: i64, tag_ids: &[i64]) -> Result<SetItemTagsResponse, AppError> {
        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;

        let item_exists = transaction
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM items WHERE id = ?1 AND is_deleted = 0)",
                params![item_id],
                |row| row.get::<_, i64>(0),
            )
            .map_err(|_| AppError::DatabaseError)?;

        if item_exists == 0 {
            return Err(AppError::ItemNotFound);
        }

        if !tag_ids.is_empty() {
            let placeholders = vec!["?"; tag_ids.len()].join(", ");
            let mut args = Vec::new();
            for tag_id in tag_ids {
                args.push(Value::Integer(*tag_id));
            }

            let sql = format!(
                "SELECT COUNT(*) FROM tags WHERE id IN ({placeholders})"
            );
            let found: i64 = transaction
                .query_row(&sql, params_from_iter(args), |row| row.get(0))
                .map_err(|_| AppError::DatabaseError)?;
            if found != tag_ids.len() as i64 {
                return Err(AppError::TagNotFound);
            }
        }

        transaction
            .execute("DELETE FROM item_tags WHERE item_id = ?1", params![item_id])
            .map_err(|_| AppError::DatabaseError)?;

        let now = current_timestamp();
        for tag_id in tag_ids {
            transaction
                .execute(
                    "INSERT INTO item_tags (item_id, tag_id, created_at)
                     VALUES (?1, ?2, ?3)",
                    params![item_id, tag_id, now],
                )
                .map_err(|_| AppError::DatabaseError)?;
        }

        let tags = {
            let mut statement = transaction
                .prepare(
                    "SELECT t.id, t.name, t.color, t.created_at, t.updated_at
                     FROM tags t
                     INNER JOIN item_tags it ON it.tag_id = t.id
                     WHERE it.item_id = ?1
                     ORDER BY t.name COLLATE NOCASE ASC, t.id ASC",
                )
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map(params![item_id], |row| {
                    Ok(Tag {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        color: row.get(2)?,
                        created_at: row.get(3)?,
                        updated_at: row.get(4)?,
                    })
                })
                .map_err(|_| AppError::DatabaseError)?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|_| AppError::DatabaseError)?
        };

        transaction.commit().map_err(|_| AppError::DatabaseError)?;

        Ok(SetItemTagsResponse { item_id, tags })
    }
}

impl ThumbnailRepository for Database {
    fn generate_thumbnail(&self, item_id: i64) -> Result<GenerateThumbnailResponse, AppError> {
        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;

        let (file_type, file_hash, summary): (String, Option<String>, Option<String>) = transaction
            .query_row(
                "SELECT file_type, file_hash, summary
                 FROM items
                 WHERE id = ?1 AND is_deleted = 0",
                params![item_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(|_| AppError::ItemNotFound)?;

        if file_type != "html" && file_type != "markdown" {
            return Err(AppError::UnsupportedFileType);
        }

        let cache_dir = self.thumbnail_cache_dir();
        fs::create_dir_all(&cache_dir).map_err(|_| AppError::IoError)?;

        let (thumbnail_input, temporary_source_path) =
            thumbnail_input_for_item(&transaction, item_id, &file_type)?;
        let asset = generate_html_thumbnail(thumbnail_input, ThumbnailBackend::Auto);
        if let Some(path) = temporary_source_path {
            let _ = fs::remove_file(path);
        }
        let path = cache_dir.join(format!("item-{item_id}.{}", asset.file_extension));
        fs::write(&path, &asset.bytes).map_err(|_| AppError::IoError)?;

        let now = current_timestamp();
        let path_string = thumbnail_data_uri(asset.content_type, &asset.bytes);
        transaction
            .execute(
                "INSERT INTO thumbnail_cache (
                    item_id, thumb_path, thumb_status, width, height, generated_from_hash,
                    last_generated_at, error_message
                 ) VALUES (?1, ?2, 'ready', ?3, ?4, ?5, ?6, NULL)
                 ON CONFLICT(item_id) DO UPDATE SET
                    thumb_path = excluded.thumb_path,
                    thumb_status = excluded.thumb_status,
                    width = excluded.width,
                    height = excluded.height,
                    generated_from_hash = excluded.generated_from_hash,
                    last_generated_at = excluded.last_generated_at,
                    error_message = NULL",
                params![
                    item_id,
                    path_string,
                    asset.width,
                    asset.height,
                    thumbnail_cache_key(&file_type, file_hash.as_deref(), summary.as_deref()),
                    now
                ],
            )
            .map_err(|_| AppError::DatabaseError)?;

        transaction.commit().map_err(|_| AppError::DatabaseError)?;

        Ok(GenerateThumbnailResponse {
            item_id,
            thumbnail: ThumbnailInfo {
                status: "ready".to_string(),
                path: Some(path_string),
                width: Some(asset.width),
                height: Some(asset.height),
                last_generated_at: Some(now),
                error_message: None,
            },
        })
    }

    fn get_thumbnail_info(&self, item_id: i64) -> Result<Option<ThumbnailInfo>, AppError> {
        let connection = self.connection()?;
        Self::load_thumbnail_info(&connection, item_id)
    }
}

fn normalize_keyword_query(keyword: Option<&str>) -> Option<String> {
    let keyword = keyword?;
    let tokens: Vec<String> = keyword
        .split_whitespace()
        .map(|part| part.trim_matches('"').trim())
        .filter(|part| !part.is_empty())
        .map(|part| format!("{part}*"))
        .collect();

    if tokens.is_empty() {
        None
    } else {
        Some(tokens.join(" "))
    }
}

fn thumbnail_data_uri(content_type: &str, bytes: &[u8]) -> String {
    let encoded = base64_encode(bytes);
    format!("data:{content_type};base64,{encoded}")
}

fn thumbnail_cache_key(file_type: &str, file_hash: Option<&str>, summary: Option<&str>) -> Option<String> {
    if file_type == "markdown" {
        let summary_key = summary
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("untitled");
        return Some(format!(
            "{}:md-thumb-v4",
            summary_key
        ));
    }

    file_hash.map(str::to_string)
}

fn base64_encode(bytes: &[u8]) -> String {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut output = String::with_capacity(bytes.len().div_ceil(3) * 4);

    for chunk in bytes.chunks(3) {
        let b0 = chunk[0];
        let b1 = *chunk.get(1).unwrap_or(&0);
        let b2 = *chunk.get(2).unwrap_or(&0);

        let n = ((b0 as u32) << 16) | ((b1 as u32) << 8) | (b2 as u32);
        output.push(TABLE[((n >> 18) & 0x3f) as usize] as char);
        output.push(TABLE[((n >> 12) & 0x3f) as usize] as char);
        output.push(if chunk.len() > 1 {
            TABLE[((n >> 6) & 0x3f) as usize] as char
        } else {
            '='
        });
        output.push(if chunk.len() > 2 {
            TABLE[(n & 0x3f) as usize] as char
        } else {
            '='
        });
    }

    output
}

fn html_thumbnail_input(
    transaction: &Transaction<'_>,
    item_id: i64,
) -> Result<HtmlThumbnailInput, AppError> {
    let (file_path, file_name, title, raw_text): (String, String, Option<String>, Option<String>) = transaction
        .query_row(
            "SELECT items.file_path, items.file_name, items.title, item_content.raw_text
             FROM items
             LEFT JOIN item_content ON item_content.item_id = items.id
             WHERE items.id = ?1",
            params![item_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|_| AppError::DatabaseError)?;

    Ok(HtmlThumbnailInput {
        file_name,
        title,
        raw_text,
        source_url: Url::from_file_path(Path::new(&file_path))
            .ok()
            .map(|url| url.to_string()),
    })
}

fn thumbnail_input_for_item(
    transaction: &Transaction<'_>,
    item_id: i64,
    file_type: &str,
) -> Result<(HtmlThumbnailInput, Option<PathBuf>), AppError> {
    match file_type {
        "html" => Ok((html_thumbnail_input(transaction, item_id)?, None)),
        "markdown" => markdown_thumbnail_input(transaction, item_id),
        _ => Err(AppError::UnsupportedFileType),
    }
}

fn markdown_thumbnail_input(
    transaction: &Transaction<'_>,
    item_id: i64,
) -> Result<(HtmlThumbnailInput, Option<PathBuf>), AppError> {
    let (file_path, file_name, title, raw_text): (String, String, Option<String>, Option<String>) = transaction
        .query_row(
            "SELECT items.file_path, items.file_name, items.title, item_content.raw_text
             FROM items
             LEFT JOIN item_content ON item_content.item_id = items.id
             WHERE items.id = ?1",
            params![item_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|_| AppError::DatabaseError)?;

    let raw = match raw_text {
        Some(value) => value,
        None => fs::read_to_string(&file_path).map_err(|_| AppError::IoError)?,
    };
    let display_title = title
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(file_name.as_str());
    let html = markdown_thumbnail_document(display_title, &file_name, &raw);
    let temporary_path = temp_markdown_thumbnail_path(item_id);
    fs::write(&temporary_path, html).map_err(|_| AppError::IoError)?;

    Ok((
        HtmlThumbnailInput {
            file_name,
            title,
            raw_text: Some(raw),
            source_url: Url::from_file_path(&temporary_path)
                .ok()
                .map(|url| url.to_string()),
        },
        Some(temporary_path),
    ))
}

fn temp_markdown_thumbnail_path(item_id: i64) -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0);
    std::env::temp_dir().join(format!("nutbook-markdown-thumbnail-{item_id}-{nanos}.html"))
}

fn markdown_thumbnail_document(title: &str, file_name: &str, raw: &str) -> String {
    let rendered = render_markdown_as_html_for_file(raw, file_name);
    format!(
        r#"<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * {{ box-sizing: border-box; }}
    html, body {{ margin: 0; width: 100%; min-height: 100%; background: #ffffff; color: #171717; }}
    body {{
      font-family: ui-serif, "Songti SC", "STSong", "Times New Roman", serif;
      padding: 0;
    }}
    .page {{
      width: 100%;
      min-height: 720px;
      background: linear-gradient(180deg, #ffffff 0%, #fbfbfa 100%);
      padding: 56px 68px;
      overflow: hidden;
    }}
    .eyebrow {{
      display: inline-flex;
      align-items: center;
      height: 26px;
      padding: 0 12px;
      border-radius: 999px;
      background: #eeeeec;
      color: #696966;
      font: 700 12px/1 ui-sans-serif, system-ui, sans-serif;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }}
    h1 {{
      margin: 22px 0 26px;
      max-width: 860px;
      font-size: 42px;
      line-height: 1.12;
      letter-spacing: -0.03em;
    }}
    article {{
      max-width: 880px;
      font-size: 18px;
      line-height: 1.72;
      color: #3f3f3d;
    }}
    article h1 {{ margin: 30px 0 12px; font-size: 28px; color: #171717; }}
    article h2 {{ margin: 28px 0 10px; font-size: 23px; color: #1f1f1d; }}
    article h3 {{ margin: 24px 0 8px; font-size: 20px; color: #242422; }}
    article h4, article h5, article h6 {{ margin: 20px 0 8px; font-size: 17px; color: #30302e; }}
    article p {{ margin: 0 0 16px; }}
    .markdown-frontmatter {{
      margin: 0 0 24px;
      padding: 18px 20px;
      border: 1px solid #e5e1d8;
      border-radius: 18px;
      background: #fffaf0;
      color: #3d362d;
    }}
    .markdown-frontmatter-label {{
      margin-bottom: 10px;
      color: #8a6f3d;
      font: 700 12px/1 ui-sans-serif, system-ui, sans-serif;
      letter-spacing: 0.08em;
    }}
    .markdown-frontmatter-row {{
      display: grid;
      grid-template-columns: 150px minmax(0, 1fr);
      gap: 14px;
      padding: 7px 0;
      border-top: 1px solid rgba(138, 111, 61, 0.14);
    }}
    .markdown-frontmatter-row:first-of-type {{ border-top: 0; }}
    .markdown-frontmatter-key {{
      color: #7a6a56;
      font: 600 13px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace;
    }}
    .markdown-frontmatter-values {{
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      min-width: 0;
    }}
    .markdown-frontmatter-value {{
      max-width: 100%;
      padding: 2px 8px;
      border-radius: 8px;
      background: rgba(138, 111, 61, 0.09);
      color: #352f28;
      font-size: 14px;
      line-height: 1.55;
      overflow-wrap: anywhere;
    }}
    article img {{
      display: block;
      width: auto;
      max-width: 100%;
      max-height: 430px;
      height: auto;
      margin: 10px auto 20px;
      border-radius: 12px;
      object-fit: contain;
    }}
    article p:has(> img:only-child) {{ margin: 0 0 18px; }}
  </style>
</head>
<body>
  <main class="page">
    <div class="eyebrow">Markdown</div>
    <h1>{}</h1>
    <article>{}</article>
  </main>
</body>
</html>"#,
        escape_html_text(title),
        rendered,
    )
}

fn escape_html_text(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn current_timestamp() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    use rusqlite::{params, Connection};

    use super::{migrations, Database};
    use crate::{
        db::repositories::{ItemRepository, LibraryRepository},
        models::{
            ArtifactCandidate, DiscoveryEvidence, DiscoveryReasonKind, IndexedItemRecord,
            Library, ListItemsQuery, RelatedArtifactFile,
        },
    };

    fn unique_db_path() -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("nutbook-test-{nanos}.sqlite3"))
    }

    fn sample_library(id: i64, root_path: &str, source_kind: &str) -> Library {
        Library {
            id,
            name: format!("{source_kind}-{id}"),
            root_path: root_path.to_string(),
            source_kind: source_kind.to_string(),
            path_state: "valid".to_string(),
            is_active: true,
            created_at: "2026-07-30T00:00:00Z".to_string(),
            updated_at: "2026-07-30T00:00:00Z".to_string(),
            last_scanned_at: None,
            skill_binding: None,
        }
    }

    fn sample_item(library_id: i64, file_path: &str) -> IndexedItemRecord {
        IndexedItemRecord {
            library_id,
            file_path: file_path.to_string(),
            relative_path: "report.md".to_string(),
            file_name: "report.md".to_string(),
            file_ext: "md".to_string(),
            file_type: "markdown".to_string(),
            file_size: 42,
            modified_at: "1".to_string(),
            created_at: "2026-07-30T00:00:00Z".to_string(),
            updated_at: "2026-07-30T00:00:00Z".to_string(),
        }
    }

    fn schema_objects(connection: &Connection) -> BTreeSet<(String, String)> {
        let mut statement = connection
            .prepare(
                "SELECT type, name
                 FROM sqlite_master
                 WHERE name NOT LIKE 'sqlite_%'
                   AND name NOT LIKE 'items_fts_%'
                 ORDER BY type, name",
            )
            .expect("schema query");
        statement
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .expect("schema rows")
            .collect::<Result<BTreeSet<_>, _>>()
            .expect("schema objects")
    }

    fn assert_item_owner_consistency(connection: &Connection, item_id: i64) {
        let (owner_count, owner_library, item_library): (i64, i64, i64) = connection
            .query_row(
                "SELECT
                   SUM(item_sources.is_owner),
                   MAX(CASE WHEN item_sources.is_owner = 1 THEN item_sources.library_id END),
                   items.library_id
                 FROM items
                 INNER JOIN item_sources ON item_sources.item_id = items.id
                 WHERE items.id = ?1
                 GROUP BY items.id",
                params![item_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("owner consistency row");
        assert_eq!(owner_count, 1);
        assert_eq!(owner_library, item_library);
    }

    #[test]
    fn database_migrates_published_0_6_schema_with_backup_and_idempotency() {
        let path = unique_db_path();
        let connection = Connection::open(&path).expect("published 0.6 database");
        connection
            .execute_batch(include_str!(
                "../../tests/fixtures/database/nutbook-0.6.0-schema.sql"
            ))
            .expect("published schema fixture");
        drop(connection);

        let database = Database::new(&path).expect("published 0.6 database should migrate");
        let connection = database.connection().expect("migrated connection");
        let versions = connection
            .prepare("SELECT version FROM schema_migrations ORDER BY version")
            .expect("migration versions")
            .query_map([], |row| row.get::<_, i64>(0))
            .expect("version rows")
            .collect::<Result<Vec<_>, _>>()
            .expect("versions");
        assert_eq!(
            versions,
            (1..=migrations::LATEST_SCHEMA_VERSION).collect::<Vec<_>>()
        );

        let preserved: (i64, String, i64) = connection
            .query_row(
                "SELECT items.id, items.title, items.is_favorite
                 FROM items WHERE items.id = 11",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("preserved item");
        assert_eq!(preserved, (11, "Published report".to_string(), 1));
        assert_item_owner_consistency(&connection, 11);
        let preserved_user_state: (i64, i64, i64, i64, i64, i64) = connection
            .query_row(
                "SELECT
                   EXISTS(SELECT 1 FROM ignored_items WHERE item_id = 12),
                   EXISTS(SELECT 1 FROM excluded_skills WHERE normalized_name = 'review-only'),
                   EXISTS(SELECT 1 FROM skill_visibility_overrides WHERE normalized_name = 'html-ppt'),
                   EXISTS(SELECT 1 FROM library_skill_bindings WHERE library_id = 7),
                   EXISTS(SELECT 1 FROM item_tags WHERE item_id = 11 AND tag_id = 3),
                   EXISTS(SELECT 1 FROM thumbnail_cache WHERE item_id = 11 AND thumb_status = 'ready')",
                [],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                    ))
                },
            )
            .expect("0.6 user state should remain");
        assert_eq!(preserved_user_state, (1, 1, 1, 1, 1, 1));
        let canonical_root_key: String = connection
            .query_row(
                "SELECT canonical_root_key FROM libraries WHERE id = 7",
                [],
                |row| row.get(0),
            )
            .expect("canonical root key should be backfilled");
        assert_eq!(canonical_root_key, "/fixture/published-0.6");
        let source_columns = connection
            .prepare("PRAGMA table_info(agent_project_sources)")
            .expect("agent project source columns")
            .query_map([], |row| row.get::<_, String>(1))
            .expect("agent project source column rows")
            .collect::<Result<BTreeSet<_>, _>>()
            .expect("agent project source column names");
        assert!(source_columns.contains("scope_kind"));
        assert!(!source_columns.contains("adapter_id"));
        assert!(!source_columns.contains("external_project_id"));
        drop(connection);

        let backup_prefix = format!(
            "{}.pre-migration-0002-",
            path.file_name().unwrap().to_string_lossy()
        );
        let backups = fs::read_dir(path.parent().unwrap())
            .expect("backup directory")
            .filter_map(Result::ok)
            .map(|entry| entry.path())
            .filter(|candidate| {
                candidate
                    .file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| name.starts_with(&backup_prefix))
            })
            .collect::<Vec<_>>();
        assert_eq!(backups.len(), 1);
        let backup_connection =
            Connection::open_with_flags(&backups[0], rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)
                .expect("migration backup should be readable");
        let backup_item: String = backup_connection
            .query_row("SELECT title FROM items WHERE id = 11", [], |row| row.get(0))
            .expect("backup should preserve the original item");
        assert_eq!(backup_item, "Published report");
        let backup_has_v2_tables: i64 = backup_connection
            .query_row(
                "SELECT EXISTS(
                   SELECT 1 FROM sqlite_master
                   WHERE type = 'table' AND name = 'item_sources'
                 )",
                [],
                |row| row.get(0),
            )
            .expect("backup schema lookup");
        assert_eq!(backup_has_v2_tables, 0);
        drop(backup_connection);

        Database::new(&path).expect("second startup should be idempotent");
        let backup_count_after_second_start = fs::read_dir(path.parent().unwrap())
            .expect("backup directory")
            .filter_map(Result::ok)
            .filter(|entry| {
                entry
                    .file_name()
                    .to_str()
                    .is_some_and(|name| name.starts_with(&backup_prefix))
            })
            .count();
        assert_eq!(backup_count_after_second_start, 1);

        for backup in backups {
            let _ = fs::remove_file(backup);
        }
        let _ = fs::remove_file(path);
    }

    #[test]
    fn fresh_and_upgraded_databases_finish_with_equivalent_schema() {
        let fresh_path = unique_db_path();
        let upgraded_path = unique_db_path();
        let fresh = Database::new(&fresh_path).expect("fresh database");
        let published_0_6 =
            Connection::open(&upgraded_path).expect("published 0.6 database");
        published_0_6
            .execute_batch(include_str!(
                "../../tests/fixtures/database/nutbook-0.6.0-schema.sql"
            ))
            .expect("published schema fixture");
        drop(published_0_6);
        let upgraded = Database::new(&upgraded_path).expect("upgraded database");

        assert_eq!(
            schema_objects(&fresh.connection().unwrap()),
            schema_objects(&upgraded.connection().unwrap())
        );

        let prefix = format!(
            "{}.pre-migration-0002-",
            upgraded_path.file_name().unwrap().to_string_lossy()
        );
        for entry in fs::read_dir(upgraded_path.parent().unwrap())
            .expect("backup directory")
            .filter_map(Result::ok)
        {
            if entry
                .file_name()
                .to_str()
                .is_some_and(|name| name.starts_with(&prefix))
            {
                let _ = fs::remove_file(entry.path());
            }
        }
        let _ = fs::remove_file(fresh_path);
        let _ = fs::remove_file(upgraded_path);
    }

    #[test]
    fn draft_v2_database_repairs_without_losing_project_binding() {
        let path = unique_db_path();
        let connection = Connection::open(&path).expect("draft v2 database");
        connection
            .execute_batch(
                "CREATE TABLE schema_migrations (
                   version INTEGER PRIMARY KEY,
                   name TEXT NOT NULL UNIQUE,
                   applied_at TEXT NOT NULL
                 );
                 INSERT INTO schema_migrations VALUES
                   (1, 'initial_0_6_baseline', '2026-07-30T00:00:00Z'),
                   (2, 'agent_artifact_sources', '2026-07-30T01:00:00Z');
                 CREATE TABLE libraries (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   name TEXT NOT NULL,
                   root_path TEXT NOT NULL,
                   source_kind TEXT NOT NULL,
                   path_state TEXT NOT NULL,
                   is_active INTEGER NOT NULL,
                   created_at TEXT NOT NULL,
                   updated_at TEXT NOT NULL,
                   last_scanned_at TEXT
                 );
                 INSERT INTO libraries VALUES (
                   7, 'Draft project', '/fixture/draft-project', 'agent_project',
                   'valid', 1, '2026-07-30T00:00:00Z', '2026-07-30T00:00:00Z', NULL
                 );
                 CREATE TABLE agent_project_sources (
                   library_id INTEGER PRIMARY KEY,
                   adapter_id TEXT NOT NULL,
                   external_project_id TEXT,
                   discovery_mode TEXT NOT NULL,
                   manifest_path TEXT,
                   auto_import_mode TEXT NOT NULL,
                   adapter_version TEXT,
                   last_discovered_at TEXT,
                   last_manifest_ok_at TEXT,
                   last_error_kind TEXT,
                   last_error_message TEXT
                 );
                 INSERT INTO agent_project_sources VALUES (
                   7, 'codex', 'codex:draft', 'adapter', NULL, 'explicit',
                   'codex-local-0.146', '2026-07-30T02:00:00Z', NULL, NULL, NULL
                 );
                 CREATE TABLE agent_project_adapters (
                   library_id INTEGER NOT NULL,
                   adapter_id TEXT NOT NULL,
                   external_project_id TEXT,
                   adapter_version TEXT,
                   last_discovered_at TEXT,
                   PRIMARY KEY (library_id, adapter_id)
                 );
                 INSERT INTO agent_project_adapters VALUES (
                   7, 'codex', 'codex:draft', 'codex-local-0.146',
                   '2026-07-30T02:00:00Z'
                 );
                 CREATE TABLE artifact_candidates (
                   id INTEGER PRIMARY KEY AUTOINCREMENT,
                   project_library_id INTEGER NOT NULL,
                   primary_path TEXT NOT NULL,
                   artifact_kind TEXT NOT NULL,
                   status TEXT NOT NULL,
                   batch_key TEXT NOT NULL,
                   reasons_json TEXT NOT NULL,
                   discovery_fingerprint TEXT NOT NULL,
                   file_size INTEGER NOT NULL,
                   modified_at TEXT,
                   first_discovered_at TEXT NOT NULL,
                   last_discovered_at TEXT NOT NULL,
                   UNIQUE (project_library_id, primary_path)
                 );
                 CREATE TABLE artifact_candidate_evidence (
                   candidate_id INTEGER NOT NULL,
                   evidence_fingerprint TEXT NOT NULL,
                   reason_kind TEXT NOT NULL,
                   event_id TEXT NOT NULL,
                   run_reference_hash TEXT,
                   observed_at TEXT,
                   PRIMARY KEY (candidate_id, evidence_fingerprint)
                 );",
            )
            .expect("draft v2 schema");
        drop(connection);

        let mut connection = Connection::open(&path).expect("draft connection");
        let backup = migrations::apply_pending_migrations(&mut connection, &path, true)
            .expect("draft v2 repair")
            .expect("repair backup");
        let repaired: (String, String, String, String) = connection
            .query_row(
                "SELECT
                   libraries.canonical_root_key,
                   agent_project_sources.scope_kind,
                   agent_project_adapters.external_scope_id,
                   agent_project_adapters.adapter_profile
                 FROM libraries
                 INNER JOIN agent_project_sources
                   ON agent_project_sources.library_id = libraries.id
                 INNER JOIN agent_project_adapters
                   ON agent_project_adapters.library_id = libraries.id
                 WHERE libraries.id = 7",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .expect("repaired project binding");
        assert_eq!(repaired.0, "/fixture/draft-project");
        assert_eq!(repaired.1, "project");
        assert_eq!(repaired.2, "codex:draft");
        assert_eq!(repaired.3, "codex-local-0.146");
        let versions = connection
            .prepare("SELECT version FROM schema_migrations ORDER BY version")
            .expect("versions")
            .query_map([], |row| row.get::<_, i64>(0))
            .expect("version rows")
            .collect::<Result<Vec<_>, _>>()
            .expect("version list");
        assert_eq!(
            versions,
            (1..=migrations::LATEST_SCHEMA_VERSION).collect::<Vec<_>>()
        );
        drop(connection);

        let backup_connection = Connection::open(&backup).expect("repair backup");
        let backup_has_canonical: i64 = backup_connection
            .query_row(
                "SELECT EXISTS(
                   SELECT 1 FROM pragma_table_info('libraries')
                   WHERE name = 'canonical_root_key'
                 )",
                [],
                |row| row.get(0),
            )
            .expect("backup schema");
        assert_eq!(backup_has_canonical, 0);
        drop(backup_connection);
        let _ = fs::remove_file(backup);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn failed_migration_rolls_back_schema_and_registry() {
        let mut connection = Connection::open_in_memory().expect("memory database");
        migrations::ensure_migration_registry(&connection).expect("migration registry");

        let result = migrations::apply_test_migration(
            &mut connection,
            3,
            "intentional_failure",
            "CREATE TABLE must_rollback (id INTEGER PRIMARY KEY);
             INSERT INTO missing_table VALUES (1);",
        );

        assert!(result.is_err());
        let table_exists: i64 = connection
            .query_row(
                "SELECT EXISTS(
                   SELECT 1 FROM sqlite_master
                   WHERE type = 'table' AND name = 'must_rollback'
                 )",
                [],
                |row| row.get(0),
            )
            .expect("table lookup");
        assert_eq!(table_exists, 0);
        let version_exists: i64 = connection
            .query_row(
                "SELECT EXISTS(
                   SELECT 1 FROM schema_migrations WHERE version = 3
                 )",
                [],
                |row| row.get(0),
            )
            .expect("version lookup");
        assert_eq!(version_exists, 0);
    }

    #[test]
    fn database_rejects_unknown_future_migration_version() {
        let path = unique_db_path();
        let mut connection = Connection::open(&path).expect("database");
        migrations::ensure_migration_registry(&connection).expect("migration registry");
        connection
            .execute(
                "INSERT INTO schema_migrations (version, name, applied_at)
                 VALUES (99, 'future_schema', '2026-07-30T00:00:00Z')",
                [],
            )
            .expect("future version marker");

        let result = migrations::apply_pending_migrations(&mut connection, &path, true);

        assert!(result.is_err());
        let _ = fs::remove_file(path);
    }

    #[test]
    fn artifact_candidate_persistence_is_idempotent_and_keeps_distinct_runs() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database");
        database
            .upsert_library(sample_library(
                1,
                "/fixture/candidate-project",
                "agent_project",
            ))
            .expect("Agent source");
        let candidate = ArtifactCandidate {
            id: None,
            project_library_id: 1,
            agent_kind: "codex".to_string(),
            primary_path: "reports/final.md".to_string(),
            artifact_kind: "markdown".to_string(),
            status: "suggested".to_string(),
            batch_key: "run:fixture".to_string(),
            reasons: vec![DiscoveryReasonKind::MentionedInFinalResponse],
            discovery_fingerprint: "candidate-fingerprint-1".to_string(),
            file_size: 42,
            modified_at: Some("2026-07-30T06:03:00Z".to_string()),
            related_files: vec![RelatedArtifactFile {
                path: "reports/assets/cover.png".to_string(),
                role: "asset".to_string(),
            }],
            evidence: vec![
                DiscoveryEvidence {
                    fingerprint: "evidence-run-1".to_string(),
                    agent_kind: "codex".to_string(),
                    reason: DiscoveryReasonKind::MentionedInFinalResponse,
                    event_id: "delivery-1".to_string(),
                    run_reference_hash: Some("run-hash-1".to_string()),
                    observed_at: Some("2026-07-30T06:03:00Z".to_string()),
                    skill_normalized_name: None,
                    skill_display_name: None,
                    manifest_entry_id: None,
                    edit_contract: None,
                    save_policy: None,
                },
                DiscoveryEvidence {
                    fingerprint: "evidence-run-2".to_string(),
                    agent_kind: "codex".to_string(),
                    reason: DiscoveryReasonKind::MentionedInFinalResponse,
                    event_id: "delivery-2".to_string(),
                    run_reference_hash: Some("run-hash-2".to_string()),
                    observed_at: Some("2026-07-30T07:03:00Z".to_string()),
                    skill_normalized_name: None,
                    skill_display_name: None,
                    manifest_entry_id: None,
                    edit_contract: None,
                    save_policy: None,
                },
            ],
        };

        database
            .upsert_artifact_candidates(
                1,
                &[candidate.clone()],
                "2026-07-30T08:00:00Z",
            )
            .expect("first discovery");
        database
            .upsert_artifact_candidates(
                1,
                &[candidate.clone()],
                "2026-07-30T09:00:00Z",
            )
            .expect("repeated discovery");

        let connection = database.connection().expect("connection");
        let counts: (i64, i64, i64, String) = connection
            .query_row(
                "SELECT
                   (SELECT COUNT(*) FROM artifact_candidates),
                   (SELECT COUNT(*) FROM artifact_candidate_evidence),
                   (SELECT COUNT(*) FROM artifact_candidate_related_files),
                   (SELECT last_discovered_at FROM artifact_candidates LIMIT 1)",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .expect("candidate counts");
        assert_eq!(counts, (1, 2, 1, "2026-07-30T08:00:00Z".to_string()));
        connection
            .execute(
                "UPDATE artifact_candidates SET status = 'ignored' WHERE id = 1",
                [],
            )
            .expect("user ignore state");
        drop(connection);

        let mut rediscovered = candidate;
        rediscovered.discovery_fingerprint = "candidate-fingerprint-2".to_string();
        let stored = database
            .upsert_artifact_candidates(
                1,
                &[rediscovered],
                "2026-07-30T10:00:00Z",
            )
            .expect("changed rediscovery");
        assert_eq!(stored[0].status, "ignored");
        let last_discovered: String = database
            .connection()
            .unwrap()
            .query_row(
                "SELECT last_discovered_at FROM artifact_candidates WHERE id = 1",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(last_discovered, "2026-07-30T10:00:00Z");

        let _ = fs::remove_file(path);
    }

    #[test]
    fn artifact_candidate_group_query_keeps_two_hundred_file_payload_compact() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database");
        database
            .upsert_library(sample_library(
                1,
                "/fixture/large-candidate-project",
                "agent_project",
            ))
            .expect("Agent source");
        let candidates = (0..200)
            .map(|index| ArtifactCandidate {
                id: None,
                project_library_id: 1,
                agent_kind: "codex".to_string(),
                primary_path: format!("reports/report-{index:03}.md"),
                artifact_kind: "markdown".to_string(),
                status: "pending".to_string(),
                batch_key: "run-window:large".to_string(),
                reasons: vec![DiscoveryReasonKind::AppearedDuringAgentRun],
                discovery_fingerprint: format!("fingerprint-{index}"),
                file_size: 10,
                modified_at: None,
                related_files: Vec::new(),
                evidence: Vec::new(),
            })
            .collect::<Vec<_>>();
        database
            .upsert_artifact_candidates(1, &candidates, "2026-07-30T08:00:00Z")
            .expect("persist candidates");

        let groups = database
            .list_artifact_candidate_groups(1)
            .expect("group summaries");

        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].count, 200);
        assert_eq!(groups[0].representative_paths.len(), 3);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn overlapping_sources_do_not_steal_owner_and_owner_deletion_promotes_link() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database");
        let root = "/fixture/shared-project";
        let file_path = "/fixture/shared-project/report.md";
        database
            .upsert_library(sample_library(1, root, "folder"))
            .expect("folder source");
        database
            .upsert_library(sample_library(2, root, "agent_project"))
            .expect("Agent source at same root");
        database
            .replace_items_for_library(1, &[sample_item(1, file_path)])
            .expect("folder scan");

        let connection = database.connection().expect("connection");
        connection
            .execute(
                "INSERT INTO item_sources (
                   item_id, library_id, link_kind, is_owner, created_at
                 ) VALUES (1, 2, 'discovered', 0, '2026-07-30T00:00:00Z')",
                [],
            )
            .expect("Agent source link");
        drop(connection);

        database
            .replace_items_for_library(1, &[sample_item(1, file_path)])
            .expect("folder rescan must not steal or duplicate");
        assert_item_owner_consistency(&database.connection().unwrap(), 1);
        assert_eq!(
            database.get_item_detail(1).unwrap().summary.library_id,
            1
        );
        assert_eq!(
            database
                .list_items(&ListItemsQuery {
                    library_id: Some(2),
                    ..ListItemsQuery::default()
                })
                .expect("Agent source filter")
                .total,
            1
        );

        database.delete_library(1).expect("delete folder owner");
        let detail = database.get_item_detail(1).expect("item should survive");
        assert_eq!(detail.summary.library_id, 2);
        assert_item_owner_consistency(&database.connection().unwrap(), 1);

        let _ = fs::remove_file(path);
    }

    #[test]
    fn deleting_owner_uses_manifest_then_discovered_priority() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database");
        database
            .upsert_library(sample_library(1, "/fixture/legacy", "folder"))
            .expect("legacy owner");
        database
            .upsert_library(sample_library(
                2,
                "/fixture/discovered",
                "agent_project",
            ))
            .expect("discovered source");
        database
            .upsert_library(sample_library(
                3,
                "/fixture/manifest",
                "agent_project",
            ))
            .expect("manifest source");
        database
            .replace_items_for_library(
                1,
                &[sample_item(1, "/fixture/shared-priority.md")],
            )
            .expect("legacy item");
        let connection = database.connection().expect("connection");
        connection
            .execute_batch(
                "INSERT INTO item_sources (
                   item_id, library_id, link_kind, is_owner, created_at
                 ) VALUES
                   (1, 2, 'discovered', 0, '2026-07-30T00:00:00Z'),
                   (1, 3, 'manifest', 0, '2026-07-30T00:00:00Z');",
            )
            .expect("alternative sources");
        drop(connection);

        database.delete_library(1).expect("delete legacy owner");
        assert_eq!(
            database.get_item_detail(1).unwrap().summary.library_id,
            3
        );
        assert_item_owner_consistency(&database.connection().unwrap(), 1);

        database.delete_library(3).expect("delete manifest owner");
        assert_eq!(
            database.get_item_detail(1).unwrap().summary.library_id,
            2
        );
        assert_item_owner_consistency(&database.connection().unwrap(), 1);

        let _ = fs::remove_file(path);
    }

    #[test]
    fn reverse_overlap_order_keeps_agent_owner_until_it_is_deleted() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database");
        let root = "/fixture/reverse-project";
        let file_path = "/fixture/reverse-project/report.md";
        database
            .upsert_library(sample_library(1, root, "agent_project"))
            .expect("Agent source");
        database
            .upsert_library(sample_library(2, root, "folder"))
            .expect("folder source at same root");
        let connection = database.connection().expect("connection");
        connection
            .execute(
                "INSERT INTO items (
                   id, library_id, file_path, relative_path, file_name, file_ext,
                   file_type, file_size, modified_at, path_state, is_favorite,
                   is_deleted, created_at, updated_at
                 ) VALUES (
                   1, 1, ?1, 'report.md', 'report.md', 'md', 'markdown',
                   42, '1', 'valid', 0, 0,
                   '2026-07-30T00:00:00Z', '2026-07-30T00:00:00Z'
                 )",
                params![file_path],
            )
            .expect("Agent-owned item");
        connection
            .execute(
                "INSERT INTO item_sources (
                   item_id, library_id, link_kind, is_owner, created_at
                 ) VALUES (1, 1, 'discovered', 1, '2026-07-30T00:00:00Z')",
                [],
            )
            .expect("Agent owner link");
        drop(connection);

        database
            .replace_items_for_library(2, &[sample_item(2, file_path)])
            .expect("folder scan");
        assert_eq!(
            database.get_item_detail(1).unwrap().summary.library_id,
            1
        );
        assert_item_owner_consistency(&database.connection().unwrap(), 1);

        database.delete_library(1).expect("delete Agent owner");
        assert_eq!(
            database.get_item_detail(1).unwrap().summary.library_id,
            2
        );
        assert_item_owner_consistency(&database.connection().unwrap(), 1);

        let _ = fs::remove_file(path);
    }

    #[test]
    fn database_rejects_recursive_replace_for_agent_project_source() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database");
        database
            .upsert_library(sample_library(
                1,
                "/fixture/agent-project",
                "agent_project",
            ))
            .expect("Agent source");

        let result = database.replace_items_for_library(
            1,
            &[sample_item(1, "/fixture/agent-project/internal.md")],
        );

        assert!(matches!(result, Err(crate::errors::AppError::InvalidParams)));
        assert_eq!(
            database
                .list_items(&ListItemsQuery::default())
                .expect("list items")
                .total,
            0
        );
        let _ = fs::remove_file(path);
    }

    #[test]
    fn deleting_owner_preserves_shared_ignored_item_metadata_and_caches() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database");
        let root = "/fixture/preserved-project";
        let file_path = "/fixture/preserved-project/report.md";
        database
            .upsert_library(sample_library(1, root, "folder"))
            .expect("folder source");
        database
            .upsert_library(sample_library(2, root, "agent_project"))
            .expect("Agent source");
        database
            .replace_items_for_library(1, &[sample_item(1, file_path)])
            .expect("folder item");
        database
            .set_item_favorite(1, true)
            .expect("favorite item");
        database
            .update_markdown_item_content(
                1,
                "Preserved summary",
                "2",
                "preserved-hash",
                "# Preserved",
                "Preserved raw text",
                "<h1>Preserved</h1>",
            )
            .expect("content cache");
        let connection = database.connection().expect("connection");
        connection
            .execute(
                "INSERT INTO item_sources (
                   item_id, library_id, link_kind, is_owner, created_at
                 ) VALUES (1, 2, 'manifest', 0, '2026-07-30T00:00:00Z')",
                [],
            )
            .expect("manifest source link");
        connection
            .execute(
                "INSERT INTO thumbnail_cache (
                   item_id, thumb_status, thumb_path, generated_from_hash
                 ) VALUES (1, 'ready', '/fixture/thumb.png', 'preserved-hash')",
                [],
            )
            .expect("thumbnail cache");
        drop(connection);
        database
            .remove_item_from_nutbook(1, "2026-07-30T01:00:00Z")
            .expect("ignore item");

        database.delete_library(1).expect("delete original owner");

        let connection = database.connection().expect("connection");
        let preserved: (i64, i64, String, String, String, i64) = connection
            .query_row(
                "SELECT
                   items.library_id,
                   items.is_favorite,
                   item_content.source_text,
                   item_content.rendered_cache,
                   thumbnail_cache.thumb_path,
                   ignored_items.library_id
                 FROM items
                 INNER JOIN item_content ON item_content.item_id = items.id
                 INNER JOIN thumbnail_cache ON thumbnail_cache.item_id = items.id
                 INNER JOIN ignored_items ON ignored_items.item_id = items.id
                 WHERE items.id = 1 AND items.is_deleted = 1",
                [],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                    ))
                },
            )
            .expect("shared ignored item should retain metadata");
        assert_eq!(preserved.0, 2);
        assert_eq!(preserved.1, 1);
        assert_eq!(preserved.2, "# Preserved");
        assert_eq!(preserved.3, "<h1>Preserved</h1>");
        assert_eq!(preserved.4, "/fixture/thumb.png");
        assert_eq!(preserved.5, 2);
        assert_item_owner_consistency(&connection, 1);

        let _ = fs::remove_file(path);
    }

    #[test]
    fn database_initializes_schema_and_persists_libraries() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database should initialize");

        let next_id = database.next_library_id().expect("next id should work");
        assert_eq!(next_id, 1);

        database
            .upsert_library(Library {
                id: 1,
                name: "Clips".to_string(),
                root_path: "/tmp/clips".to_string(),
                source_kind: "folder".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "2026-04-22T00:00:00Z".to_string(),
                updated_at: "2026-04-22T00:00:00Z".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be inserted");

        let libraries = database.list_libraries().expect("libraries should load");
        assert_eq!(libraries.len(), 1);
        assert_eq!(libraries[0].root_path, "/tmp/clips");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn file_management_lists_only_project_sources_with_connected_items() {
        let path = unique_db_path();
        let project_root = path.with_extension("project");
        fs::create_dir_all(&project_root).expect("project root");
        let report = project_root.join("report.md");
        fs::write(&report, "# Report").expect("report");
        let database = Database::new(&path).expect("database should initialize");
        let project = database
            .connect_agent_project_source(
                "codex",
                Some("5.0.0"),
                "scope:project",
                "project",
                "project-only",
                project_root.to_str().expect("project path"),
                Some("Project"),
                "now",
            )
            .expect("project source");

        assert!(database
            .list_libraries()
            .expect("empty project source list")
            .is_empty());

        let candidates = database
            .upsert_artifact_candidates(
                project.library_id,
                &[ArtifactCandidate {
                    id: None,
                    project_library_id: project.library_id,
                    agent_kind: "codex".to_string(),
                    primary_path: "report.md".to_string(),
                    artifact_kind: "markdown".to_string(),
                    status: "suggested".to_string(),
                    batch_key: "run:project".to_string(),
                    reasons: vec![DiscoveryReasonKind::MentionedInFinalResponse],
                    discovery_fingerprint: "project-report".to_string(),
                    file_size: 8,
                    modified_at: Some("now".to_string()),
                    related_files: Vec::new(),
                    evidence: Vec::new(),
                }],
                "now",
            )
            .expect("project candidate");
        database
            .accept_agent_artifact_candidates(
                project.library_id,
                &[candidates[0].id.expect("candidate id")],
                "now",
            )
            .expect("connected project item");
        let libraries = database
            .list_libraries()
            .expect("connected project source list");
        assert_eq!(libraries.len(), 1);
        assert_eq!(libraries[0].id, project.library_id);

        let item_id = database
            .list_items(&ListItemsQuery::default())
            .expect("project items")
            .items[0]
            .id;
        database
            .remove_item_from_nutbook(item_id, "later")
            .expect("remove project item");
        assert!(database
            .list_libraries()
            .expect("removed project source list")
            .is_empty());

        let _ = fs::remove_dir_all(project_root);
        let _ = fs::remove_file(path);
    }

    #[test]
    fn markdown_thumbnail_document_constrains_images_to_article_width() {
        let html = super::markdown_thumbnail_document(
            "Document with hero image",
            "document.md",
            "![Hero](./assets/hero.png)\n\nBody text",
        );

        assert!(html.contains("article img"));
        assert!(html.contains("max-width: 100%"));
        assert!(html.contains("height: auto"));
        assert!(html.contains("object-fit: contain"));
    }

    #[test]
    fn markdown_thumbnail_cache_key_tracks_image_layout_template_version() {
        let key = super::thumbnail_cache_key("markdown", Some("ignored-file-hash"), Some("Hero Doc"))
            .expect("markdown thumbnail key should exist");

        assert!(key.ends_with(":md-thumb-v4"));
    }

    #[test]
    fn database_replaces_items_for_library_and_lists_them() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database should initialize");

        database
            .upsert_library(Library {
                id: 1,
                name: "Clips".to_string(),
                root_path: "/tmp/clips".to_string(),
                source_kind: "folder".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "2026-04-22T00:00:00Z".to_string(),
                updated_at: "2026-04-22T00:00:00Z".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be inserted");

        let items = vec![
            IndexedItemRecord {
                library_id: 1,
                file_path: "/tmp/clips/a.md".to_string(),
                relative_path: "a.md".to_string(),
                file_name: "a.md".to_string(),
                file_ext: "md".to_string(),
                file_type: "markdown".to_string(),
                file_size: 12,
                modified_at: "1".to_string(),
                created_at: "now".to_string(),
                updated_at: "now".to_string(),
            },
            IndexedItemRecord {
                library_id: 1,
                file_path: "/tmp/clips/b.html".to_string(),
                relative_path: "b.html".to_string(),
                file_name: "b.html".to_string(),
                file_ext: "html".to_string(),
                file_type: "html".to_string(),
                file_size: 24,
                modified_at: "2".to_string(),
                created_at: "now".to_string(),
                updated_at: "now".to_string(),
            },
        ];

        let (created, updated, deleted) = database
            .replace_items_for_library(1, &items)
            .expect("items should be replaced");
        assert_eq!((created, updated, deleted), (2, 0, 0));

        let listed = database
            .list_items(&ListItemsQuery {
                library_id: Some(1),
                ..ListItemsQuery::default()
            })
            .expect("items should be listed");
        assert_eq!(listed.total, 2);
        assert_eq!(listed.items.len(), 2);
        assert_eq!(listed.items[0].library_id, 1);

        let replacement = vec![IndexedItemRecord {
            library_id: 1,
            file_path: "/tmp/clips/c.md".to_string(),
            relative_path: "c.md".to_string(),
            file_name: "c.md".to_string(),
            file_ext: "md".to_string(),
            file_type: "markdown".to_string(),
            file_size: 36,
            modified_at: "3".to_string(),
            created_at: "later".to_string(),
            updated_at: "later".to_string(),
        }];

        database
            .replace_items_for_library(1, &replacement)
            .expect("replacement should succeed");

        let relisted = database
            .list_items(&ListItemsQuery {
                library_id: Some(1),
                ..ListItemsQuery::default()
            })
            .expect("replaced items should be listed");
        assert_eq!(relisted.total, 1);
        assert_eq!(relisted.items[0].file_name, "c.md");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn database_returns_item_detail_for_active_item() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database should initialize");

        database
            .upsert_library(Library {
                id: 1,
                name: "Clips".to_string(),
                root_path: "/tmp/clips".to_string(),
                source_kind: "folder".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "2026-04-22T00:00:00Z".to_string(),
                updated_at: "2026-04-22T00:00:00Z".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be inserted");

        database
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: "/tmp/clips/a.md".to_string(),
                    relative_path: "a.md".to_string(),
                    file_name: "a.md".to_string(),
                    file_ext: "md".to_string(),
                    file_type: "markdown".to_string(),
                    file_size: 12,
                    modified_at: "1".to_string(),
                    created_at: "now".to_string(),
                    updated_at: "now".to_string(),
                }],
            )
            .expect("item should be inserted");

        let detail = database.get_item_detail(1).expect("detail should load");
        assert_eq!(detail.summary.file_name, "a.md");
        assert_eq!(detail.summary.file_type, "markdown");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn database_includes_skill_binding_in_item_summary_and_detail() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database should initialize");

        database
            .upsert_library(Library {
                id: 1,
                name: "html-ppt output".to_string(),
                root_path: "/tmp/html-ppt-output".to_string(),
                source_kind: "folder".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "2026-04-22T00:00:00Z".to_string(),
                updated_at: "2026-04-22T00:00:00Z".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be inserted");

        database
            .bind_library_to_skill(1, "htmlppt", "html-ppt", "2026-04-30T00:00:00Z")
            .expect("binding should be inserted");

        database
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: "/tmp/html-ppt-output/index.html".to_string(),
                    relative_path: "index.html".to_string(),
                    file_name: "index.html".to_string(),
                    file_ext: "html".to_string(),
                    file_type: "html".to_string(),
                    file_size: 12,
                    modified_at: "1".to_string(),
                    created_at: "now".to_string(),
                    updated_at: "now".to_string(),
                }],
            )
            .expect("item should be inserted");

        let listed = database
            .list_items(&ListItemsQuery {
                library_id: Some(1),
                ..ListItemsQuery::default()
            })
            .expect("items should be listed");
        assert_eq!(
            listed.items[0].skill_binding.as_ref().map(|binding| binding.display_name.as_str()),
            Some("html-ppt")
        );

        let detail = database.get_item_detail(1).expect("detail should load");
        assert_eq!(
            detail.summary.skill_binding.as_ref().map(|binding| binding.display_name.as_str()),
            Some("html-ppt")
        );

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn database_updates_markdown_item_content() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database should initialize");

        database
            .upsert_library(Library {
                id: 1,
                name: "Clips".to_string(),
                root_path: "/tmp/clips".to_string(),
                source_kind: "folder".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "2026-04-22T00:00:00Z".to_string(),
                updated_at: "2026-04-22T00:00:00Z".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be inserted");

        database
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: "/tmp/clips/a.md".to_string(),
                    relative_path: "a.md".to_string(),
                    file_name: "a.md".to_string(),
                    file_ext: "md".to_string(),
                    file_type: "markdown".to_string(),
                    file_size: 12,
                    modified_at: "1".to_string(),
                    created_at: "now".to_string(),
                    updated_at: "now".to_string(),
                }],
            )
            .expect("item should be inserted");

        database
            .update_markdown_item_content(
                1,
                "Hello",
                "2",
                "hash",
                "# Hello",
                "# Hello",
                "<pre># Hello</pre>",
            )
            .expect("markdown content should update");

        let detail = database.get_item_detail(1).expect("detail should load");
        assert_eq!(detail.summary.summary.as_deref(), Some("Hello"));
        assert_eq!(detail.file_hash.as_deref(), Some("hash"));
        assert_eq!(detail.source_text.as_deref(), Some("# Hello"));

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn database_sync_filesystem_state_marks_missing_items_and_purges_missing_ignored_items() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database should initialize");
        let root = std::env::temp_dir().join(format!(
            "nutbook-sync-test-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("time should move forward")
                .as_nanos()
        ));
        std::fs::create_dir_all(&root).expect("temp root should be created");
        let file_path = root.join("alive.md");
        let visible_path = root.join("visible.md");
        std::fs::write(&file_path, "# hi").expect("test file should be written");
        std::fs::write(&visible_path, "# visible").expect("visible file should be written");

        database
            .upsert_library(Library {
                id: 1,
                name: "Clips".to_string(),
                root_path: root.to_string_lossy().to_string(),
                source_kind: "folder".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "2026-04-22T00:00:00Z".to_string(),
                updated_at: "2026-04-22T00:00:00Z".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be inserted");

        database
            .replace_items_for_library(
                1,
                &[
                    IndexedItemRecord {
                        library_id: 1,
                        file_path: file_path.to_string_lossy().to_string(),
                        relative_path: "alive.md".to_string(),
                        file_name: "alive.md".to_string(),
                        file_ext: "md".to_string(),
                        file_type: "markdown".to_string(),
                        file_size: 4,
                        modified_at: "1".to_string(),
                        created_at: "now".to_string(),
                        updated_at: "now".to_string(),
                    },
                    IndexedItemRecord {
                        library_id: 1,
                        file_path: visible_path.to_string_lossy().to_string(),
                        relative_path: "visible.md".to_string(),
                        file_name: "visible.md".to_string(),
                        file_ext: "md".to_string(),
                        file_type: "markdown".to_string(),
                        file_size: 9,
                        modified_at: "2".to_string(),
                        created_at: "now".to_string(),
                        updated_at: "now".to_string(),
                    },
                ],
            )
            .expect("item should be inserted");

        database
            .remove_item_from_nutbook(1, "now")
            .expect("item should be ignored");

        std::fs::remove_file(&file_path).expect("test file should be removed");
        std::fs::remove_file(&visible_path).expect("visible file should be removed");

        let synced = database
            .sync_filesystem_state()
            .expect("filesystem sync should succeed");
        assert_eq!(synced.missing_items_marked_missing, 1);
        assert_eq!(synced.missing_ignored_items_purged, 1);
        assert_eq!(synced.missing_libraries_marked_missing, 0);

        let ignored = database
            .list_ignored_items()
            .expect("ignored items should still query");
        assert!(ignored.is_empty());

        let listed = database
            .list_items(&ListItemsQuery {
                library_id: Some(1),
                ..ListItemsQuery::default()
            })
            .expect("items should be listed");
        assert_eq!(listed.total, 1);
        assert_eq!(listed.items[0].path_state, "missing");

        let _ = std::fs::remove_dir_all(root);
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn database_sync_filesystem_state_marks_missing_single_file_sources() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database should initialize");
        let root = std::env::temp_dir().join(format!(
            "nutbook-single-file-sync-test-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("time should move forward")
                .as_nanos()
        ));
        std::fs::create_dir_all(&root).expect("temp root should be created");
        let file_path = root.join("linked.md");
        std::fs::write(&file_path, "# linked").expect("test file should be written");

        database
            .upsert_library(Library {
                id: 1,
                name: "linked.md".to_string(),
                root_path: file_path.to_string_lossy().to_string(),
                source_kind: "file".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "2026-04-22T00:00:00Z".to_string(),
                updated_at: "2026-04-22T00:00:00Z".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("single file library should be inserted");

        database
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: file_path.to_string_lossy().to_string(),
                    relative_path: "linked.md".to_string(),
                    file_name: "linked.md".to_string(),
                    file_ext: "md".to_string(),
                    file_type: "markdown".to_string(),
                    file_size: 8,
                    modified_at: "1".to_string(),
                    created_at: "now".to_string(),
                    updated_at: "now".to_string(),
                }],
            )
            .expect("item should be inserted");

        std::fs::remove_file(&file_path).expect("test file should be removed");

        let synced = database
            .sync_filesystem_state()
            .expect("filesystem sync should succeed");
        assert_eq!(synced.missing_items_marked_missing, 1);
        assert_eq!(synced.missing_libraries_marked_missing, 1);

        let libraries = database.list_libraries().expect("libraries should list");
        assert_eq!(libraries.len(), 1);
        assert_eq!(libraries[0].path_state, "missing");

        let listed = database
            .list_items(&ListItemsQuery::default())
            .expect("items should be listed");
        assert_eq!(listed.total, 1);
        assert_eq!(listed.items[0].path_state, "missing");

        let _ = std::fs::remove_dir_all(root);
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn database_lists_items_with_keyword_search() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database should initialize");

        database
            .upsert_library(Library {
                id: 1,
                name: "Clips".to_string(),
                root_path: "/tmp/clips".to_string(),
                source_kind: "folder".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "2026-04-22T00:00:00Z".to_string(),
                updated_at: "2026-04-22T00:00:00Z".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be inserted");

        database
            .replace_items_for_library(
                1,
                &[
                    IndexedItemRecord {
                        library_id: 1,
                        file_path: "/tmp/clips/alpha.md".to_string(),
                        relative_path: "alpha.md".to_string(),
                        file_name: "alpha.md".to_string(),
                        file_ext: "md".to_string(),
                        file_type: "markdown".to_string(),
                        file_size: 12,
                        modified_at: "1".to_string(),
                        created_at: "now".to_string(),
                        updated_at: "now".to_string(),
                    },
                    IndexedItemRecord {
                        library_id: 1,
                        file_path: "/tmp/clips/beta.html".to_string(),
                        relative_path: "beta.html".to_string(),
                        file_name: "beta.html".to_string(),
                        file_ext: "html".to_string(),
                        file_type: "html".to_string(),
                        file_size: 24,
                        modified_at: "2".to_string(),
                        created_at: "now".to_string(),
                        updated_at: "now".to_string(),
                    },
                ],
            )
            .expect("items should be inserted");

        database
            .update_markdown_item_content(
                1,
                "Prompt note",
                "3",
                "hash-1",
                "# Prompt note",
                "prompt workflow archive",
                "<pre># Prompt note</pre>",
            )
            .expect("markdown content should update");

        let file_name_match = database
            .list_items(&ListItemsQuery {
                library_id: Some(1),
                keyword: Some("beta".to_string()),
                ..ListItemsQuery::default()
            })
            .expect("file name search should work");
        assert_eq!(file_name_match.total, 1);
        assert_eq!(file_name_match.items[0].file_name, "beta.html");

        let content_match = database
            .list_items(&ListItemsQuery {
                library_id: Some(1),
                keyword: Some("workflow".to_string()),
                ..ListItemsQuery::default()
            })
            .expect("content search should work");
        assert_eq!(content_match.total, 1);
        assert_eq!(content_match.items[0].file_name, "alpha.md");

        let _ = std::fs::remove_file(path);
    }
}
