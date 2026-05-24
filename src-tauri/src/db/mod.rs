pub mod repositories;

use std::{
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use rusqlite::{params, params_from_iter, types::Value, Connection, Transaction};
use url::Url;

use crate::{
    core::{
        document::render_markdown_as_html,
        thumbnail::{generate_html_thumbnail, HtmlThumbnailInput, ThumbnailBackend},
    },
    db::repositories::{ItemRepository, LibraryRepository, TagRepository, ThumbnailRepository},
    errors::AppError,
    models::{
        CreateTagRequest, DeleteTagResponse, GenerateThumbnailResponse, IgnoredItemSummary,
        IndexedItemRecord, ItemDetail, ItemSummary, Library, ListItemsQuery, PagedResult,
        SetItemTagsResponse, SkillBindingSummary, Tag, ThumbnailInfo, UpdateTagRequest,
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

impl Database {
    pub fn new(path: impl Into<PathBuf>) -> Result<Self, AppError> {
        let database = Self { path: path.into() };
        database.initialize()?;
        Ok(database)
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    fn initialize(&self) -> Result<(), AppError> {
        let connection = self.connection()?;
        connection
            .execute_batch(initial_schema_sql())
            .map_err(|_| AppError::DatabaseError)?;
        let _ = connection.execute(
            "ALTER TABLE libraries ADD COLUMN source_kind TEXT NOT NULL DEFAULT 'folder' CHECK (source_kind IN ('folder', 'file'))",
            [],
        );
        let _ = connection.execute(
            "ALTER TABLE items ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1))",
            [],
        );
        let _ = connection.execute("ALTER TABLE items ADD COLUMN last_opened_at TEXT", []);
        let _ = connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_items_is_favorite ON items(is_favorite)",
            [],
        );
        let _ = connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_items_last_opened_at ON items(last_opened_at DESC)",
            [],
        );
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
        Connection::open(&self.path).map_err(|_| AppError::DatabaseError)
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
                .prepare("SELECT id, file_path FROM items WHERE is_deleted = 0")
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)))
                .map_err(|_| AppError::DatabaseError)?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|_| AppError::DatabaseError)?
        };

        let missing_item_ids = active_items
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

        let stale_file_library_ids = {
            let mut statement = connection
                .prepare("SELECT id, root_path FROM libraries WHERE source_kind = 'file'")
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)))
                .map_err(|_| AppError::DatabaseError)?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|_| AppError::DatabaseError)?
        }
        .into_iter()
        .filter_map(|(library_id, root_path)| {
            let path = Path::new(&root_path);
            if path.exists() && path.is_file() {
                None
            } else {
                Some(library_id)
            }
        })
        .collect::<Vec<_>>();

        if missing_item_ids.is_empty()
            && stale_ignored_item_ids.is_empty()
            && stale_file_library_ids.is_empty()
        {
            return Ok(crate::models::SyncFilesystemStateResponse {
                missing_items_marked_deleted: 0,
                missing_ignored_items_purged: 0,
                stale_file_libraries_removed: 0,
            });
        }

        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;

        let mut missing_items_marked_deleted = 0_u64;
        for item_id in &missing_item_ids {
            missing_items_marked_deleted += transaction
                .execute(
                    "UPDATE items SET is_deleted = 1 WHERE id = ?1 AND is_deleted = 0",
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

        let mut stale_file_libraries_removed = 0_u64;
        for library_id in &stale_file_library_ids {
            stale_file_libraries_removed += transaction
                .execute("DELETE FROM libraries WHERE id = ?1 AND source_kind = 'file'", params![library_id])
                .map_err(|_| AppError::DatabaseError)? as u64;
        }

        if missing_items_marked_deleted > 0 {
            Self::rebuild_fts_index(&transaction)?;
        }

        transaction.commit().map_err(|_| AppError::DatabaseError)?;

        Ok(crate::models::SyncFilesystemStateResponse {
            missing_items_marked_deleted,
            missing_ignored_items_purged,
            stale_file_libraries_removed,
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
}

impl LibraryRepository for Database {
    fn list_libraries(&self) -> Result<Vec<Library>, AppError> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT id, name, root_path, source_kind, is_active, created_at, updated_at, last_scanned_at
                 FROM libraries
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
                    is_active: row.get::<_, i64>(4)? != 0,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                    last_scanned_at: row.get(7)?,
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
        connection
            .execute(
                "INSERT INTO libraries (id, name, root_path, source_kind, is_active, created_at, updated_at, last_scanned_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                 ON CONFLICT(root_path) DO UPDATE SET
                   name = excluded.name,
                   source_kind = excluded.source_kind,
                   is_active = excluded.is_active,
                   updated_at = excluded.updated_at,
                   last_scanned_at = excluded.last_scanned_at",
                params![
                    library.id,
                    library.name,
                    library.root_path,
                    library.source_kind,
                    if library.is_active { 1 } else { 0 },
                    library.created_at,
                    library.updated_at,
                    library.last_scanned_at,
                ],
            )
            .map_err(|_| AppError::DatabaseError)?;

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

        transaction
            .execute(
                "DELETE FROM thumbnail_cache
                 WHERE item_id IN (SELECT id FROM items WHERE library_id = ?1)",
                params![library_id],
            )
            .map_err(|_| AppError::DatabaseError)?;
        transaction
            .execute(
                "DELETE FROM item_tags
                 WHERE item_id IN (SELECT id FROM items WHERE library_id = ?1)",
                params![library_id],
            )
            .map_err(|_| AppError::DatabaseError)?;
        transaction
            .execute(
                "DELETE FROM item_content
                 WHERE item_id IN (SELECT id FROM items WHERE library_id = ?1)",
                params![library_id],
            )
            .map_err(|_| AppError::DatabaseError)?;
        transaction
            .execute("DELETE FROM items WHERE library_id = ?1", params![library_id])
            .map_err(|_| AppError::DatabaseError)?;
        transaction
            .execute("DELETE FROM ignored_items WHERE library_id = ?1", params![library_id])
            .map_err(|_| AppError::DatabaseError)?;
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

        transaction
            .execute(
                "UPDATE items
                 SET is_deleted = 1
                 WHERE library_id = ?1 AND is_deleted = 0",
                params![library_id],
            )
            .map_err(|_| AppError::DatabaseError)?;

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

        let mut inserted = 0_u64;
        for item in items {
            if ignored_paths.iter().any(|path| path == &item.file_path) {
                continue;
            }
            transaction
                .execute(
                    "INSERT INTO items (
                        library_id, file_path, relative_path, file_name, file_ext, file_type,
                        file_size, modified_at, file_hash, title, summary, is_favorite, last_opened_at, is_deleted, created_at, updated_at
                     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, NULL, NULL, 0, NULL, 0, ?9, ?10)
                     ON CONFLICT(file_path) DO UPDATE SET
                        library_id = excluded.library_id,
                        relative_path = excluded.relative_path,
                        file_name = excluded.file_name,
                        file_ext = excluded.file_ext,
                        file_type = excluded.file_type,
                        file_size = excluded.file_size,
                        modified_at = excluded.modified_at,
                        is_deleted = 0,
                        updated_at = excluded.updated_at",
                    params![
                        item.library_id,
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
            inserted += 1;
        }

        Self::rebuild_fts_index(&transaction)?;
        transaction.commit().map_err(|_| AppError::DatabaseError)?;
        Ok((inserted, 0, 0))
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
            where_clauses.push("library_id = ?".to_string());
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
                    file_size, modified_at, title, summary, is_favorite, last_opened_at
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
                is_favorite: row.get::<_, i64>(11)? != 0,
                last_opened_at: row.get(12)?,
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
                    i.file_type, i.file_size, i.modified_at, i.title, i.summary, i.is_favorite, i.last_opened_at,
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
                        is_favorite: row.get::<_, i64>(11)? != 0,
                        last_opened_at: row.get(12)?,
                        skill_binding: None,
                        tags: Vec::new(),
                        thumbnail: None,
                    },
                    file_hash: row.get(13)?,
                    extracted_title: row.get(14)?,
                    source_text: row.get(15)?,
                    raw_text: row.get(16)?,
                    rendered_cache: row.get(17)?,
                    created_at: row.get(18)?,
                    updated_at: row.get(19)?,
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

        if library.source_kind == "file" {
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

        if library.source_kind == "file" {
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
            "{}:md-thumb-v3",
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
    let html = markdown_thumbnail_document(display_title, &raw);
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

fn markdown_thumbnail_document(title: &str, raw: &str) -> String {
    let rendered = render_markdown_as_html(raw);
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
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::Database;
    use crate::{
        db::repositories::{ItemRepository, LibraryRepository},
        models::{IndexedItemRecord, Library, ListItemsQuery},
    };

    fn unique_db_path() -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("nutbook-test-{nanos}.sqlite3"))
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
    fn database_replaces_items_for_library_and_lists_them() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database should initialize");

        database
            .upsert_library(Library {
                id: 1,
                name: "Clips".to_string(),
                root_path: "/tmp/clips".to_string(),
                source_kind: "folder".to_string(),
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
        assert_eq!(synced.missing_items_marked_deleted, 1);
        assert_eq!(synced.missing_ignored_items_purged, 1);
        assert_eq!(synced.stale_file_libraries_removed, 0);

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
        assert_eq!(listed.total, 0);

        let _ = std::fs::remove_dir_all(root);
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn database_sync_filesystem_state_removes_missing_single_file_sources() {
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
        assert_eq!(synced.missing_items_marked_deleted, 1);
        assert_eq!(synced.stale_file_libraries_removed, 1);

        let libraries = database.list_libraries().expect("libraries should list");
        assert!(libraries.is_empty());

        let listed = database
            .list_items(&ListItemsQuery::default())
            .expect("items should be listed");
        assert_eq!(listed.total, 0);

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
