pub mod agent_artifacts;
pub mod migrations;
pub mod repositories;

use std::{
    collections::{BTreeMap, BTreeSet, HashMap},
    fs,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use rusqlite::{
    params, params_from_iter, types::Value, Connection, OptionalExtension, Transaction,
};
use serde::{Deserialize, Serialize};
use url::Url;

use crate::{
    core::{
        document::{content_hash, file_modified_at_string, markdown_summary, render_markdown_as_html_for_file},
        thumbnail::{
            desired_key_for_item, expected_render_kind_for_item, generate_html_thumbnail_with_adapter,
            DefaultThumbnailCaptureAdapter, HtmlThumbnailInput,
            ThumbnailBackend, ThumbnailCaptureAdapter, ThumbnailGenerationSnapshot,
            RENDER_KIND_PLACEHOLDER,
        },
    },
    db::repositories::{ItemRepository, LibraryRepository, TagRepository, ThumbnailRepository},
    errors::AppError,
    models::{
        ArtifactCandidate, ArtifactCandidateGroupSummary, CreateTagRequest, DeleteTagResponse,
        DurableSaveSyncReport, GenerateThumbnailResponse, IgnoredItemSummary, IndexedItemRecord,
        ItemDetail, ItemSourceBadge, ItemSummary, Library, ListItemsQuery, PagedResult,
        SetItemTagsResponse, SkillBindingSummary, Tag, ThumbnailInfo, UpdateTagRequest,
    },
};

pub const INITIAL_SCHEMA_SQL: &str = include_str!("../../migrations/0001_initial.sql");

pub fn initial_schema_sql() -> &'static str {
    INITIAL_SCHEMA_SQL
}

// ------------------------------------------------------------------
// B1 审查阻塞 2：最小 test-only hook
//
// 只用于证明"source preparation（磁盘读取 / Markdown 渲染 / 临时 HTML 写入）
// 不持有数据库事务"。hook 挂在 Markdown 磁盘正文读取完成后、HTML 渲染前：
// 生成线程在这里暂停，测试从另一个连接完成写事务；若 prepare 阶段仍持有
// 事务/连接，该写会因 SQLite 锁而失败。生产构建（非 test）中不存在此钩子。
// ------------------------------------------------------------------
#[cfg(test)]
pub(crate) static GENERATION_PREPARE_HOOK: std::sync::Mutex<
    Option<std::sync::Arc<dyn Fn() + Send + Sync>>,
> = std::sync::Mutex::new(None);

// B1 审查阻塞 A：挂在 prepare（阶段 2）与 claim（阶段 3a）之间的 test-only hook。
// 用于证明"保存发生在 snapshot 与 claim 之间"时，claim 必须复核阶段 1 读取的
// file_hash / file_size / modified_at，绝不能把 desired_key 从新 revision 倒退成旧值。
#[cfg(test)]
pub(crate) static GENERATION_CLAIM_HOOK: std::sync::Mutex<
    Option<std::sync::Arc<dyn Fn() + Send + Sync>>,
> = std::sync::Mutex::new(None);

// ------------------------------------------------------------------
// B1：durable source save 与索引同步的 reconciliation marker
//
// 源文件已经 durable 落盘后，索引同步失败不能被伪装成"保存失败"。
// 索引失败时在 app data 原子写入 per-item marker（临时文件 + rename），
// 启动 / list 路径根据磁盘真实状态重放：精确更新同一 item、旧缩略图保持
// stale、marker 只在同步真正成功后删除；恢复失败保留 marker 供下次重试。
// ------------------------------------------------------------------

pub const RECONCILIATION_MARKER_VERSION: i64 = 1;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReconciliationMarker {
    pub schema_version: i64,
    pub item_id: i64,
    pub canonical_path: String,
    pub source_hash: String,
    pub modified_at: String,
    pub file_size: i64,
    /// 写入时的 generation 参考值；重放时由 update_item_revision_and_invalidate
    /// 按当前数据库状态重新递增，此字段只用于诊断。
    pub generation: i64,
    pub written_at: String,
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
        // A1.1-PERF：把历史 base64 缩略图迁移为文件路径（幂等）。
        // 对应缓存文件已存在 → 只改数据库路径；缺失 → 清空路径并标 stale 由队列重新生成。
        Self::migrate_base64_thumbnails(&connection, &self.path)?;
        Ok(())
    }

    /// A1.1-PERF：把 thumbnail_cache 中的 data:image base64 路径迁移为绝对文件路径。
    /// 幂等：只处理 thumb_path LIKE 'data:image/%' 的行；缓存文件存在则改路径，
    /// 不存在则清空路径并标 stale（由缩略图队列重新生成）。
    /// 不重新解码 base64 写文件（对应缓存文件已存在），不删除仍有效的缓存文件。
    fn migrate_base64_thumbnails(
        connection: &Connection,
        db_path: &Path,
    ) -> Result<usize, AppError> {
        let rows = {
            let mut statement = connection
                .prepare(
                    "SELECT item_id, thumb_path
                     FROM thumbnail_cache
                     WHERE thumb_path LIKE 'data:image/%'",
                )
                .map_err(|_| AppError::DatabaseError)?;
            let collected = statement
                .query_map([], |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)))
                .map_err(|_| AppError::DatabaseError)?;
            collected
                .collect::<Result<Vec<_>, _>>()
                .map_err(|_| AppError::DatabaseError)?
        };
        if rows.is_empty() {
            return Ok(0);
        }
        // 缓存目录 = <db 目录>/.cache/thumbnails（与 thumbnail_cache_dir 一致）
        let cache_dir = db_path
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .join(".cache")
            .join("thumbnails");

        let mut migrated = 0usize;
        for (item_id, thumb_path) in rows {
            let extension = if thumb_path.starts_with("data:image/svg") {
                "svg"
            } else if thumb_path.starts_with("data:image/png") {
                "png"
            } else if thumb_path.starts_with("data:image/jpeg") || thumb_path.starts_with("data:image/jpg") {
                "jpg"
            } else if thumb_path.starts_with("data:image/webp") {
                "webp"
            } else {
                // 未知 mime，无法推断扩展名：标 stale 重新生成
                connection
                    .execute(
                        "UPDATE thumbnail_cache SET thumb_path = '', thumb_status = 'stale' WHERE item_id = ?1",
                        params![item_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                migrated += 1;
                continue;
            };
            let cached = cache_dir.join(format!("item-{item_id}.{extension}"));
            if cached.exists() {
                let absolute = cached.to_string_lossy().to_string();
                connection
                    .execute(
                        "UPDATE thumbnail_cache SET thumb_path = ?1, thumb_status = 'ready' WHERE item_id = ?2 AND thumb_path LIKE 'data:image/%'",
                        params![absolute, item_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                migrated += 1;
            } else {
                connection
                    .execute(
                        "UPDATE thumbnail_cache SET thumb_path = '', thumb_status = 'stale' WHERE item_id = ?1 AND thumb_path LIKE 'data:image/%'",
                        params![item_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                migrated += 1;
            }
        }
        Ok(migrated)
    }

    fn connection(&self) -> Result<Connection, AppError> {
        let connection =
            Connection::open(&self.path).map_err(|_| AppError::DatabaseError)?;
        connection
            .pragma_update(None, "foreign_keys", "ON")
            .map_err(|_| AppError::DatabaseError)?;
        // 多资料库 watcher / catch-up scan 会并发打开连接写同一文件；
        // 没有 busy timeout 时 SQLite 立即返回 "database is locked"，
        // 导致单个来源扫描失败。
        connection
            .busy_timeout(std::time::Duration::from_secs(5))
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

    /// 批量装配一批 item 的来源徽标（project | skill），一次查询全部来源，
    /// 禁止逐 item / 逐卡执行来源查询（避免 N+1）。
    ///
    /// Project 只读取 item_sources → libraries(source_kind='agent_project')：
    /// source_id = project:<library_id>，label 优先 libraries.name，name 为空
    /// 才回退 root basename；按 is_owner DESC, library_id ASC 排序。
    /// Skill 只读取 item 全部来源库的 library_skill_bindings：
    /// source_id = skill:<normalized_name>，label 用 display_name；owner binding
    /// 优先，再按 normalized_name 稳定排序；同一 source_id 只返回一个 badge。
    /// 不推断 item_provenance.skill_*、路径或文件名。
    /// relation 删除后 badge 消失；relation 仍在但来源 missing/inactive 时
    /// available=false。
    fn load_source_badges_batch(
        connection: &Connection,
        item_ids: &[i64],
    ) -> Result<HashMap<i64, Vec<ItemSourceBadge>>, AppError> {
        let mut badges: HashMap<i64, Vec<ItemSourceBadge>> = HashMap::new();
        if item_ids.is_empty() {
            return Ok(badges);
        }
        let placeholders = vec!["?"; item_ids.len()].join(", ");

        // Project 来源：批量一条 SQL。
        {
            let sql = format!(
                "SELECT src.item_id, l.id, l.name, l.root_path,
                        l.path_state, l.is_active, src.is_owner
                 FROM item_sources src
                 INNER JOIN libraries l ON l.id = src.library_id
                 WHERE src.item_id IN ({placeholders})
                   AND l.source_kind = 'agent_project'
                 ORDER BY src.item_id, src.is_owner DESC, l.id ASC"
            );
            let mut statement = connection
                .prepare(&sql)
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map(params_from_iter(item_ids.iter().map(|id| *id)), |row| {
                    let item_id: i64 = row.get(0)?;
                    let library_id: i64 = row.get(1)?;
                    let name: Option<String> = row.get(2)?;
                    let root_path: String = row.get(3)?;
                    let path_state: String = row.get(4)?;
                    let is_active: i64 = row.get(5)?;
                    let is_owner: i64 = row.get(6)?;
                    let label = match name {
                        Some(name) if !name.trim().is_empty() => name,
                        _ => std::path::Path::new(&root_path)
                            .file_name()
                            .map(|value| value.to_string_lossy().into_owned())
                            .unwrap_or_else(|| root_path.clone()),
                    };
                    Ok((
                        item_id,
                        ItemSourceBadge {
                            kind: "project".to_string(),
                            source_id: format!("project:{library_id}"),
                            label,
                            is_owner: is_owner != 0,
                            available: path_state == "valid" && is_active != 0,
                        },
                    ))
                })
                .map_err(|_| AppError::DatabaseError)?;
            for row in rows {
                let (item_id, badge) = row.map_err(|_| AppError::DatabaseError)?;
                badges.entry(item_id).or_default().push(badge);
            }
        }

        // Skill 来源：批量一条 SQL；同一 item 同一 source_id 只保留第一个
        // （owner binding 优先，再按 normalized_name 稳定排序）。
        {
            let sql = format!(
                "SELECT src.item_id, lbs.normalized_name, lbs.display_name,
                        l.path_state, l.is_active, src.is_owner
                 FROM item_sources src
                 INNER JOIN library_skill_bindings lbs ON lbs.library_id = src.library_id
                 INNER JOIN libraries l ON l.id = src.library_id
                 WHERE src.item_id IN ({placeholders})
                 ORDER BY src.item_id, src.is_owner DESC, lbs.normalized_name ASC"
            );
            let mut statement = connection
                .prepare(&sql)
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map(params_from_iter(item_ids.iter().map(|id| *id)), |row| {
                    let item_id: i64 = row.get(0)?;
                    let normalized_name: String = row.get(1)?;
                    let display_name: String = row.get(2)?;
                    let path_state: String = row.get(3)?;
                    let is_active: i64 = row.get(4)?;
                    let is_owner: i64 = row.get(5)?;
                    Ok((
                        item_id,
                        ItemSourceBadge {
                            kind: "skill".to_string(),
                            source_id: format!("skill:{normalized_name}"),
                            label: display_name,
                            is_owner: is_owner != 0,
                            available: path_state == "valid" && is_active != 0,
                        },
                    ))
                })
                .map_err(|_| AppError::DatabaseError)?;
            for row in rows {
                let (item_id, badge) = row.map_err(|_| AppError::DatabaseError)?;
                let entry = badges.entry(item_id).or_default();
                if !entry.iter().any(|existing| existing.source_id == badge.source_id) {
                    entry.push(badge);
                }
            }
        }

        Ok(badges)
    }

    /// 批量装配一批 item 的 skill_binding（按 library_id 去重后一次查询），
    /// 禁止逐 item 查 binding（避免 list_items N+1）。
    fn load_skill_bindings_batch(
        connection: &Connection,
        item_ids: &[i64],
    ) -> Result<HashMap<i64, Option<SkillBindingSummary>>, AppError> {
        let mut result: HashMap<i64, Option<SkillBindingSummary>> = HashMap::new();
        if item_ids.is_empty() {
            return Ok(result);
        }
        // 每个 item 有一个 library_id；先拿到 item → library 映射，再对 library 去重查询。
        let item_library_sql = format!(
            "SELECT id, library_id FROM items WHERE id IN ({})",
            vec!["?"; item_ids.len()].join(", ")
        );
        let mut item_library: HashMap<i64, i64> = HashMap::new();
        {
            let mut statement = connection
                .prepare(&item_library_sql)
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map(params_from_iter(item_ids.iter().map(|id| *id)), |row| {
                    Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?))
                })
                .map_err(|_| AppError::DatabaseError)?;
            for row in rows {
                let (item_id, library_id) = row.map_err(|_| AppError::DatabaseError)?;
                item_library.insert(item_id, library_id);
            }
        }
        let mut libraries: Vec<i64> = item_library.values().copied().collect::<Vec<_>>();
        libraries.sort_unstable();
        libraries.dedup();
        let binding_sql = format!(
            "SELECT library_id, normalized_name, display_name
             FROM library_skill_bindings
             WHERE library_id IN ({})",
            vec!["?"; libraries.len()].join(", ")
        );
        let mut bindings: HashMap<i64, SkillBindingSummary> = HashMap::new();
        {
            let mut statement = connection
                .prepare(&binding_sql)
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map(params_from_iter(libraries.iter().map(|id| *id)), |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        SkillBindingSummary {
                            normalized_name: row.get(1)?,
                            display_name: row.get(2)?,
                        },
                    ))
                })
                .map_err(|_| AppError::DatabaseError)?;
            for row in rows {
                let (library_id, binding) = row.map_err(|_| AppError::DatabaseError)?;
                bindings.insert(library_id, binding);
            }
        }
        for (item_id, library_id) in item_library {
            result.insert(item_id, bindings.get(&library_id).cloned());
        }
        Ok(result)
    }

    /// 批量装配一批 item 的 tags（一条 SQL + GROUP BY 按 item 分桶），
    /// 禁止逐 item 查 tags（避免 list_items N+1）。
    fn load_tags_batch(
        connection: &Connection,
        item_ids: &[i64],
    ) -> Result<HashMap<i64, Vec<Tag>>, AppError> {
        let mut result: HashMap<i64, Vec<Tag>> = HashMap::new();
        if item_ids.is_empty() {
            return Ok(result);
        }
        let sql = format!(
            "SELECT it.item_id, t.id, t.name, t.color, t.created_at, t.updated_at
             FROM item_tags it
             INNER JOIN tags t ON t.id = it.tag_id
             WHERE it.item_id IN ({})
             ORDER BY it.item_id, t.name COLLATE NOCASE ASC, t.id ASC",
            vec!["?"; item_ids.len()].join(", ")
        );
        let mut statement = connection
            .prepare(&sql)
            .map_err(|_| AppError::DatabaseError)?;
        let rows = statement
            .query_map(params_from_iter(item_ids.iter().map(|id| *id)), |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    Tag {
                        id: row.get(1)?,
                        name: row.get(2)?,
                        color: row.get(3)?,
                        created_at: row.get(4)?,
                        updated_at: row.get(5)?,
                    },
                ))
            })
            .map_err(|_| AppError::DatabaseError)?;
        for row in rows {
            let (item_id, tag) = row.map_err(|_| AppError::DatabaseError)?;
            result.entry(item_id).or_default().push(tag);
        }
        Ok(result)
    }

    /// 批量装配一批 item 的 thumbnail（一条 SQL），并复用 load_thumbnail_info
    /// 相同的 B1 校验：只有 desired key / generation / source revision / render kind /
    /// 磁盘 stat 全部匹配的 ready 行才返回。禁止逐 item 查 thumbnail（避免 N+1）。
    fn load_thumbnails_batch(
        connection: &Connection,
        item_ids: &[i64],
    ) -> Result<HashMap<i64, Option<ThumbnailInfo>>, AppError> {
        let mut result: HashMap<i64, Option<ThumbnailInfo>> = HashMap::new();
        if item_ids.is_empty() {
            return Ok(result);
        }
        let sql = format!(
            "SELECT thumbnail_cache.item_id, thumbnail_cache.thumb_status, thumbnail_cache.thumb_path,
                    thumbnail_cache.width, thumbnail_cache.height, thumbnail_cache.last_generated_at,
                    thumbnail_cache.error_message, thumbnail_cache.generated_from_hash,
                    thumbnail_cache.desired_key, thumbnail_cache.generated_from_key,
                    thumbnail_cache.render_kind, thumbnail_cache.generation,
                    items.file_hash, items.file_type,
                    items.file_path, items.file_size, items.path_state, items.modified_at
             FROM thumbnail_cache
             INNER JOIN items ON items.id = thumbnail_cache.item_id
             WHERE thumbnail_cache.item_id IN ({})",
            vec!["?"; item_ids.len()].join(", ")
        );
        let mut statement = connection
            .prepare(&sql)
            .map_err(|_| AppError::DatabaseError)?;
        let rows = statement
            .query_map(params_from_iter(item_ids.iter().map(|id| *id)), |row| {
                let generated_from_hash: Option<String> = row.get(7)?;
                let desired_key: Option<String> = row.get(8)?;
                let generated_from_key: Option<String> = row.get(9)?;
                let render_kind: Option<String> = row.get(10)?;
                let generation: i64 = row.get(11)?;
                let file_hash: Option<String> = row.get(12)?;
                let file_type: String = row.get(13)?;
                let file_path: String = row.get(14)?;
                let file_size: i64 = row.get(15)?;
                let path_state: String = row.get(16)?;
                let modified_at: String = row.get(17)?;
                Ok((
                    row.get::<_, i64>(0)?,
                    (
                        ThumbnailInfo {
                            status: row.get(1)?,
                            path: row.get(2)?,
                            width: row.get(3)?,
                            height: row.get(4)?,
                            last_generated_at: row.get(5)?,
                            error_message: row.get(6)?,
                            desired_key: desired_key.clone(),
                            generation: Some(generation),
                            render_kind: render_kind.clone(),
                        },
                        generated_from_hash,
                        desired_key,
                        generated_from_key,
                        render_kind,
                        generation,
                        file_hash,
                        file_type,
                        file_path,
                        file_size,
                        path_state,
                        modified_at,
                    ),
                ))
            })
            .map_err(|_| AppError::DatabaseError)?;
        for row in rows {
            let (
                item_id,
                (
                    thumbnail,
                    generated_from_hash,
                    desired_key,
                    generated_from_key,
                    render_kind,
                    generation,
                    file_hash,
                    file_type,
                    file_path,
                    file_size,
                    path_state,
                    modified_at,
                ),
            ) = row.map_err(|_| AppError::DatabaseError)?;
            let current_key = desired_key_for_item(&file_type, file_hash.as_deref());
            let valid = Self::thumbnail_row_is_valid_ready(
                &thumbnail,
                desired_key.as_deref(),
                generated_from_key.as_deref(),
                render_kind.as_deref(),
                generation,
                current_key.as_deref(),
                generated_from_hash.as_deref(),
                file_hash.as_deref(),
                &path_state,
                &file_path,
                file_size,
                &modified_at,
                expected_render_kind_for_item(&file_type),
            );
            result.insert(item_id, if valid { Some(thumbnail) } else { None });
        }
        Ok(result)
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
                        thumbnail_cache.desired_key, thumbnail_cache.generated_from_key,
                        thumbnail_cache.render_kind, thumbnail_cache.generation,
                        items.file_hash, items.file_type,
                        items.file_path, items.file_size, items.path_state, items.modified_at
                 FROM thumbnail_cache
                 INNER JOIN items ON items.id = thumbnail_cache.item_id
                 WHERE thumbnail_cache.item_id = ?1",
            )
            .map_err(|_| AppError::DatabaseError)?;

        match statement.query_row(params![item_id], |row| {
            let generated_from_hash: Option<String> = row.get(6)?;
            let desired_key: Option<String> = row.get(7)?;
            let generated_from_key: Option<String> = row.get(8)?;
            let render_kind: Option<String> = row.get(9)?;
            let generation: i64 = row.get(10)?;
            let file_hash: Option<String> = row.get(11)?;
            let file_type: String = row.get(12)?;
            let file_path: String = row.get(13)?;
            let file_size: i64 = row.get(14)?;
            let path_state: String = row.get(15)?;
            let modified_at: String = row.get(16)?;
            Ok((
                ThumbnailInfo {
                    status: row.get(0)?,
                    path: row.get(1)?,
                    width: row.get(2)?,
                    height: row.get(3)?,
                    last_generated_at: row.get(4)?,
                    error_message: row.get(5)?,
                    desired_key: desired_key.clone(),
                    generation: Some(generation),
                    render_kind: render_kind.clone(),
                },
                generated_from_hash,
                desired_key,
                generated_from_key,
                render_kind,
                generation,
                file_hash,
                file_type,
                file_path,
                file_size,
                path_state,
                modified_at,
            ))
        }) {
            Ok((
                thumbnail,
                generated_from_hash,
                desired_key,
                generated_from_key,
                render_kind,
                generation,
                file_hash,
                file_type,
                file_path,
                file_size,
                path_state,
                modified_at,
            )) => {
                let current_key = desired_key_for_item(&file_type, file_hash.as_deref());
                if Self::thumbnail_row_is_valid_ready(
                    &thumbnail,
                    desired_key.as_deref(),
                    generated_from_key.as_deref(),
                    render_kind.as_deref(),
                    generation,
                    current_key.as_deref(),
                    generated_from_hash.as_deref(),
                    file_hash.as_deref(),
                    &path_state,
                    &file_path,
                    file_size,
                    &modified_at,
                    expected_render_kind_for_item(&file_type),
                ) {
                    Ok(Some(thumbnail))
                } else {
                    Ok(None)
                }
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(_) => Err(AppError::DatabaseError),
        }
    }

    /// B1 读取安全边界：只有满足以下全部条件的行才作为有效 ready 成图返回：
    /// - status == ready；
    /// - render_kind **精确等于**该 file_type 的预期 kind（html-screenshot /
    ///   markdown-html-screenshot）；placeholder、缺失、以及任意其他非空 render
    ///   kind 一律拒绝，防止旧路径产物冒充当前路径的 ready；
    /// - 行内 desired_key / generated_from_key 都与当前计算的确定性 key 一致；
    /// - generated_from_hash（生成时的源内容 hash）== items.file_hash（当前 source revision）；
    /// - generation >= 1（旧 schema 迁移行不得服务）；
    /// - thumb_path 非空，且对应的缓存文件真实存在（缺失时返回 None 使前端重新生成，
    ///   绝不把坏路径伪装成 ready）；
    /// - 源文件存在、path_state=valid，且便宜磁盘 stat（file_size + 纳秒 mtime）
    ///   与索引一致。同尺寸改写（size 相同但 mtime 变化）也会被拒绝，
    ///   不能只因为旧 DB hash 相同就让旧图复活。
    #[allow(clippy::too_many_arguments)]
    fn thumbnail_row_is_valid_ready(
        thumbnail: &ThumbnailInfo,
        desired_key: Option<&str>,
        generated_from_key: Option<&str>,
        render_kind: Option<&str>,
        generation: i64,
        current_key: Option<&str>,
        generated_from_hash: Option<&str>,
        current_file_hash: Option<&str>,
        path_state: &str,
        file_path: &str,
        file_size: i64,
        db_modified_at: &str,
        expected_render_kind: Option<&str>,
    ) -> bool {
        if thumbnail.status != "ready" {
            return false;
        }
        // render kind 必须精确等于预期 kind：placeholder、缺失（旧 schema 行）、
        // 以及任何其他非空值（例如 HTML 行被标成 markdown-html-screenshot）都拒绝。
        if expected_render_kind.is_none() || render_kind != expected_render_kind {
            return false;
        }
        let Some(current_key) = current_key else {
            return false;
        };
        if desired_key != Some(current_key) || generated_from_key != Some(current_key) {
            return false;
        }
        // 旧 schema 迁移行 generation=0：不是任何真实 generation 的成品，不得服务。
        if generation < 1 {
            return false;
        }
        // source revision：生成时的内容 hash 必须等于当前索引的 file_hash。
        if generated_from_hash != current_file_hash {
            return false;
        }
        if path_state != "valid" {
            return false;
        }
        // ready 行必须携带缓存文件路径，且该文件真实存在。缓存 PNG 被删除后
        // 读取必须返回 None（触发前端重新生成），不能继续返回坏路径。
        let Some(thumb_path) = thumbnail.path.as_deref() else {
            return false;
        };
        match std::fs::metadata(thumb_path) {
            Ok(metadata) => {
                if !metadata.is_file() {
                    return false;
                }
            }
            Err(_) => return false,
        }
        // 便宜的磁盘 stat：size + 纳秒 mtime 双比较。同尺寸改写（扫描未触发、
        // DB file_hash 未更新）时 mtime 变化也会拒绝旧图。
        match std::fs::metadata(file_path) {
            Ok(metadata) => {
                let size_ok = metadata.len() as i64 == file_size;
                let mtime_ok = file_modified_at_string(&metadata)
                    .map(|mtime| mtime == db_modified_at)
                    .unwrap_or(false);
                size_ok && mtime_ok
            }
            Err(_) => false,
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

        // Incremental content refresh: remember, for every already-indexed item,
        // its stored modified_at, file_size and whether an item_content row
        // exists. A Markdown file is only re-read/re-rendered when it is new,
        // its content row is missing, or its file metadata (mtime/size) changed.
        // Unchanged files must not be re-read or re-rendered on every scan.
        let mut existing_content_meta = {
            let mut statement = transaction
                .prepare("SELECT id, modified_at, file_size FROM items")
                .map_err(|_| AppError::DatabaseError)?;
            let rows: Vec<(i64, String, i64)> = statement
                .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
                .map_err(|_| AppError::DatabaseError)?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|_| AppError::DatabaseError)?;
            let mut meta: BTreeMap<i64, (String, i64, bool)> = rows
                .into_iter()
                .map(|(item_id, modified_at, file_size)| (item_id, (modified_at, file_size, false)))
                .collect();
            let mut statement = transaction
                .prepare("SELECT item_id FROM item_content")
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map([], |row| row.get::<_, i64>(0))
                .map_err(|_| AppError::DatabaseError)?;
            for item_id in rows.collect::<Result<Vec<_>, _>>().map_err(|_| AppError::DatabaseError)? {
                if let Some(entry) = meta.get_mut(&item_id) {
                    entry.2 = true;
                }
            }
            meta
        };

        let mut created = 0_u64;
        let mut updated = 0_u64;
        let mut scanned_paths = BTreeSet::new();
        for item in items {
            if ignored_paths.iter().any(|path| path == &item.file_path) {
                continue;
            }
            scanned_paths.insert(item.file_path.clone());
            let item_id = if let Some((existing_id, _was_deleted)) = existing_by_path.get(&item.file_path) {
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
                            existing_id,
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
                        params![existing_id, library_id, link_kind, item.created_at],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                updated += 1;
                *existing_id
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
                item_id
            };

            if item.file_type == "html" {
                // B1：HTML 也跟踪源内容 hash —— 新增或文件元数据（高精度 mtime /
                // file_size）变化时读取内容刷新 file_hash。否则外部修改同一 HTML 后，
                // 读路径会用陈旧的 DB file_hash 算出旧 desired key，把保存前的旧缩略图
                // 继续当作有效 ready 返回（"从 A 改 B 后缩略图没更新"根因的扫描侧）。
                let needs_hash_refresh = match existing_content_meta.get(&item_id) {
                    None => true,
                    Some((stored_modified_at, stored_file_size, _)) => {
                        stored_modified_at != &item.modified_at
                            || stored_file_size != &item.file_size
                    }
                };
                if needs_hash_refresh {
                    if let Ok(raw) = fs::read_to_string(&item.file_path) {
                        let hash = content_hash(&raw);
                        transaction
                            .execute(
                                "UPDATE items SET file_hash = ?2 WHERE id = ?1",
                                params![item_id, hash],
                            )
                            .map_err(|_| AppError::DatabaseError)?;
                        existing_content_meta.insert(
                            item_id,
                            (item.modified_at.clone(), item.file_size, true),
                        );
                    }
                }
            } else if item.file_type == "markdown" {
                // 增量刷新：只有新增、item_content 缺失或文件元数据
                // （高精度 mtime / file_size）变化的 Markdown 才重新读取/渲染；
                // 未变化文件跳过，避免每次扫描都重复 render_markdown_as_html_for_file
                // （一次扫描末尾统一 rebuild FTS 一次）。
                let needs_refresh = match existing_content_meta.get(&item_id) {
                    None => true,
                    Some((stored_modified_at, stored_file_size, has_content)) => {
                        !has_content
                            || stored_modified_at != &item.modified_at
                            || stored_file_size != &item.file_size
                    }
                };
                if needs_refresh {
                    if let Ok(raw) = fs::read_to_string(&item.file_path) {
                        let summary = markdown_summary(&raw);
                        let hash = content_hash(&raw);
                        let rendered = render_markdown_as_html_for_file(&raw, &item.file_name);
                        transaction
                            .execute(
                                "UPDATE items SET summary = ?2, file_hash = ?3 WHERE id = ?1",
                                params![item_id, summary, hash],
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
                                params![item_id, raw, raw, rendered, item.modified_at],
                            )
                            .map_err(|_| AppError::DatabaseError)?;
                        existing_content_meta.insert(
                            item_id,
                            (item.modified_at.clone(), item.file_size, true),
                        );
                    }
                }
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
        // B1：进入 list 路径时按磁盘真实状态重放 reconciliation marker
        // （marker 目录不存在时为廉价 no-op；失败保留 marker 供下次重试）。
        let _ = self.replay_reconciliation_markers();
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
                source_badges: Vec::new(),
                tags: Vec::new(),
                thumbnail: None,
            })
        };
        let mut items = statement
            .query_map(params_from_iter(args), mapper)
            .map_err(|_| AppError::DatabaseError)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)?;

        // 来源徽标批量装配：当前批次全部 item 一次查询，禁止逐卡 N+1。
        let page_item_ids = items.iter().map(|item| item.id).collect::<Vec<_>>();
        let badges_by_item = Self::load_source_badges_batch(&connection, &page_item_ids)?;
        let bindings_by_item = Self::load_skill_bindings_batch(&connection, &page_item_ids)?;
        let tags_by_item = Self::load_tags_batch(&connection, &page_item_ids)?;
        let thumbnails_by_item = Self::load_thumbnails_batch(&connection, &page_item_ids)?;

        for item in &mut items {
            item.skill_binding =
                bindings_by_item.get(&item.id).cloned().unwrap_or_default();
            item.source_badges =
                badges_by_item.get(&item.id).cloned().unwrap_or_default();
            item.tags =
                tags_by_item.get(&item.id).cloned().unwrap_or_default();
            item.thumbnail =
                thumbnails_by_item.get(&item.id).cloned().unwrap_or_default();
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
                        source_badges: Vec::new(),
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
        detail.summary.source_badges = Self::load_source_badges_batch(&connection, &[item_id])?
            .remove(&item_id)
            .unwrap_or_default();
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

        // B1：Markdown 保存也是精确 revision 更新 —— 同一事务把旧缩略图设为 stale
        // 并递增持久化 generation，使 in-flight 的旧内容生成任务被 CAS 拒绝，
        // 旧图不能短暂以 ready 落库。
        Self::invalidate_thumbnail_in_transaction(&transaction, item_id, file_hash)?;

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

    fn update_item_revision_and_invalidate(
        &self,
        item_id: i64,
        canonical_path: &str,
        source_hash: &str,
        modified_at: &str,
        file_size: i64,
    ) -> Result<(), AppError> {
        Database::update_item_revision_and_invalidate_impl(
            self,
            item_id,
            canonical_path,
            source_hash,
            modified_at,
            file_size,
        )
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
        self.generate_thumbnail_with_adapter(item_id, &DefaultThumbnailCaptureAdapter)
    }

    fn get_thumbnail_info(&self, item_id: i64) -> Result<Option<ThumbnailInfo>, AppError> {
        let connection = self.connection()?;
        Self::load_thumbnail_info(&connection, item_id)
    }
}

/// thumbnail_cache 当前行的只读投影，供生成流程的 CAS 判断与响应构造使用。
#[derive(Debug, Clone)]
struct ThumbnailCacheRow {
    desired_key: Option<String>,
    generation: i64,
    status: String,
    thumb_path: Option<String>,
    width: Option<i32>,
    height: Option<i32>,
    last_generated_at: Option<String>,
    error_message: Option<String>,
    render_kind: Option<String>,
    generated_from_key: Option<String>,
    generated_from_hash: Option<String>,
}

impl ThumbnailCacheRow {
    fn into_thumbnail_info(self) -> ThumbnailInfo {
        ThumbnailInfo {
            status: self.status,
            path: self.thumb_path,
            width: self.width,
            height: self.height,
            last_generated_at: self.last_generated_at,
            error_message: self.error_message,
            desired_key: self.desired_key,
            generation: Some(self.generation),
            render_kind: self.render_kind,
        }
    }
}

/// 阶段 1 短 DB 读的 item 投影：只有数据库字段，不含任何文件内容。
/// 磁盘 revision 由阶段 2（prepare_thumbnail_snapshot，事务外）读取。
#[derive(Debug, Clone)]
struct ItemThumbnailIdentity {
    file_type: String,
    file_path: String,
    db_file_hash: Option<String>,
    db_file_size: i64,
    db_modified_at: String,
}

/// 阶段 3a claim 的结果：
/// - `Claimed(generation)`：snapshot 仍是当前 revision，已分配 generation；
/// - `Superseded`：snapshot 与 claim 之间发生并发保存/invalidate（当前 DB revision
///   与阶段 1 读取的不一致），本 snapshot 过期，调用方必须丢弃并携带当前 expected key。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ClaimOutcome {
    Claimed(i64),
    Superseded,
}

const THUMBNAIL_ENGINE_UNAVAILABLE_MESSAGE: &str =
    "截图引擎不可用：请启用系统 Chrome 或安装截图后端后重试";

impl Database {
    /// B1 唯一目标的核心：事务外生成 + 异步 CAS。
    ///
    /// 三阶段边界（B1 审查阻塞 2 修正）：
    /// 1. 短 DB 读取 item identity + 现有 thumbnail state（无文件/渲染 I/O，立即释放）；
    /// 2. 事务外 source snapshot：磁盘 metadata / 正文读取 / hash / desired key / render kind；
    /// 3a. 短 DB claim：核对 identity、收敛 items revision、分配 generation、写 pending；
    /// 3b. 事务外 source preparation + capture：Markdown 渲染、临时 HTML 写入、截图
    ///     全部不持有数据库 transaction；commit 前重读磁盘 hash 复核；
    /// 4. 短 DB CAS：只有 item + desired key + generation 全部仍匹配才写 ready；
    /// 5. 不匹配返回 discarded/stale，绝不覆盖新 revision。
    ///
    /// 物理文件使用 generation 唯一路径 item-<id>.<generation>.<ext>；CAS 失败
    /// 只清理该任务自己的未引用文件，不会覆盖或删除新 generation 的成品。
    pub fn generate_thumbnail_with_adapter(
        &self,
        item_id: i64,
        adapter: &dyn ThumbnailCaptureAdapter,
    ) -> Result<GenerateThumbnailResponse, AppError> {
        // 阶段 1：短 DB 读 identity，无文件/渲染 I/O，立即释放连接。
        let identity = self.read_item_thumbnail_identity(item_id)?;

        // 阶段 2：事务外 source snapshot（磁盘读取 + hash + desired key / render kind）。
        let mut snapshot = Self::prepare_thumbnail_snapshot(item_id, &identity)?;

        // B1 审查阻塞 A：prepare 与 claim 之间的 test-only hook。并发保存发生在这个
        // 窗口时，claim 必须通过 revision 复核拒绝旧 snapshot，否则 desired_key 会
        // 从新 revision 倒退成旧值并额外推进 generation。
        #[cfg(test)]
        {
            if let Some(hook) = crate::db::GENERATION_CLAIM_HOOK.lock().unwrap().as_ref() {
                hook();
            }
        }

        // 阶段 3a：短 DB claim——核对 identity、复核阶段 1 revision 未变、收敛 items
        // revision、分配 generation、key 变化时写 pending。commit 后立即释放，之后
        // 的所有文件/渲染 I/O 都不持事务。Superseded 表示 snapshot 期间已有并发保存/
        // invalidate：直接丢弃并携带当前 expected key，绝不倒退 desired_key。
        let generation = match self.claim_thumbnail_generation(item_id, &identity, &snapshot)? {
            ClaimOutcome::Claimed(generation) => generation,
            ClaimOutcome::Superseded => {
                let current = self.read_thumbnail_state(item_id)?;
                return Ok(Self::discarded_thumbnail_response(&snapshot, current));
            }
        };
        snapshot.generation = generation;

        // 阶段 3b：事务外 source preparation。Markdown 渲染正文来自 snapshot.source_body
        // （与 key / source_content_hash 同一磁盘 revision），禁止回落到 item_content.raw_text。
        let (thumbnail_input, temporary_source_path) = {
            let connection = self.connection()?;
            let input = thumbnail_input_for_item(&connection, item_id, &snapshot)?;
            input
        };

        // 事务外生成：截图期间不持有任何数据库 transaction。
        let asset = generate_html_thumbnail_with_adapter(
            thumbnail_input,
            ThumbnailBackend::Auto,
            adapter,
        );
        if let Some(path) = temporary_source_path {
            let _ = fs::remove_file(path);
        }

        // placeholder 不是目标 render kind 的 ready 成品：不写文件、不 commit ready。
        if asset.backend == "placeholder-svg" {
            return self.finish_thumbnail_placeholder(item_id, &snapshot);
        }

        // 重新读取当前 desired key + generation。
        let current = self.read_thumbnail_state(item_id)?;
        let matches = matches!(
            current,
            Some(ref row) if row.desired_key.as_deref() == Some(snapshot.desired_key.as_str())
                && row.generation == snapshot.generation
        );
        if !matches {
            return Ok(Self::discarded_thumbnail_response(&snapshot, current));
        }

        // 重读磁盘 revision（阻塞 1/7 保留）：截图期间源文件被外部进程同尺寸改写、而扫描
        // 尚未触发时，DB 的 key/generation 不会变化，但磁盘内容已不是 snapshot 的
        // revision。此时旧任务仍必须丢弃，绝不能提交错误成图。
        let disk_still_matches = fs::read_to_string(&snapshot.canonical_path)
            .map(|raw| content_hash(&raw) == snapshot.source_content_hash)
            .unwrap_or(false);
        if !disk_still_matches {
            return Ok(Self::discarded_thumbnail_response(&snapshot, current));
        }

        // generation/key 唯一输出路径：临时文件 + rename（原子落盘）。
        let cache_dir = self.thumbnail_cache_dir();
        fs::create_dir_all(&cache_dir).map_err(|_| AppError::IoError)?;
        let final_path = cache_dir.join(format!(
            "item-{item_id}.{}.{}",
            snapshot.generation, asset.file_extension
        ));
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0);
        let temporary_path = cache_dir.join(format!(
            ".item-{item_id}.{}.tmp-{nonce}",
            snapshot.generation
        ));
        fs::write(&temporary_path, &asset.bytes).map_err(|_| AppError::IoError)?;
        if fs::rename(&temporary_path, &final_path).is_err() {
            let _ = fs::remove_file(&temporary_path);
            return Err(AppError::IoError);
        }

        // CAS 提交：事务内再次核对 desired key + generation，防止 re-read 后 invalidate 抢先。
        let now = current_timestamp();
        let committed = self.cas_commit_thumbnail(item_id, &snapshot, &asset, &final_path, now.clone())?;
        if !committed {
            // 只清理本任务自己的未引用文件，绝不动新 generation 的成品。
            let _ = fs::remove_file(&final_path);
            let current_after = self.read_thumbnail_state(item_id)?;
            return Ok(Self::discarded_thumbnail_response(&snapshot, current_after));
        }

        // 提交成功后清理旧 generation 的成品文件（不会命中 .tmp 或当前 generation）。
        self.cleanup_older_thumbnail_files(item_id, snapshot.generation, asset.file_extension)?;

        let path_string = final_path.to_string_lossy().to_string();
        Ok(GenerateThumbnailResponse {
            item_id,
            generated_from_key: Some(snapshot.desired_key.clone()),
            expected_key: Some(snapshot.desired_key.clone()),
            generation: snapshot.generation,
            discarded: false,
            thumbnail: ThumbnailInfo {
                status: "ready".to_string(),
                path: Some(path_string),
                width: Some(asset.width),
                height: Some(asset.height),
                last_generated_at: Some(now),
                error_message: None,
                desired_key: Some(snapshot.desired_key.clone()),
                generation: Some(snapshot.generation),
                render_kind: Some(snapshot.render_kind.to_string()),
            },
        })
    }

    /// 阶段 1：短 DB 读 item identity。只做 SELECT、不做任何文件/渲染 I/O，
    /// 连接随函数返回立即释放。磁盘 revision 读取在阶段 2（事务外）完成。
    fn read_item_thumbnail_identity(
        &self,
        item_id: i64,
    ) -> Result<ItemThumbnailIdentity, AppError> {
        let connection = self.connection()?;
        let identity = connection
            .query_row(
                "SELECT file_type, file_path, file_hash, file_size, modified_at
                 FROM items
                 WHERE id = ?1 AND is_deleted = 0",
                params![item_id],
                |row| {
                    Ok(ItemThumbnailIdentity {
                        file_type: row.get(0)?,
                        file_path: row.get(1)?,
                        db_file_hash: row.get(2)?,
                        db_file_size: row.get(3)?,
                        db_modified_at: row.get(4)?,
                    })
                },
            )
            .optional()
            .map_err(|_| AppError::DatabaseError)?
            .ok_or(AppError::ItemNotFound)?;
        if identity.file_type != "html" && identity.file_type != "markdown" {
            return Err(AppError::UnsupportedFileType);
        }
        Ok(identity)
    }

    /// 阶段 2：事务外 source snapshot。磁盘 metadata / 正文读取 / content hash /
    /// desired key / render kind 计算全部发生在数据库事务与连接之外。
    /// snapshot 保存本次磁盘读取的正文（source_body），作为 Markdown 渲染的
    /// 唯一输入，与 key / source_content_hash 属于同一个磁盘 revision。
    fn prepare_thumbnail_snapshot(
        item_id: i64,
        identity: &ItemThumbnailIdentity,
    ) -> Result<ThumbnailGenerationSnapshot, AppError> {
        let metadata = fs::metadata(&identity.file_path).map_err(|_| AppError::IoError)?;
        let source_modified_at = file_modified_at_string(&metadata)?;
        let source_file_size = metadata.len() as i64;
        let source_body = fs::read_to_string(&identity.file_path).map_err(|_| AppError::IoError)?;
        let source_content_hash = content_hash(&source_body);
        let desired_key = desired_key_for_item(&identity.file_type, Some(&source_content_hash))
            .ok_or(AppError::UnsupportedFileType)?;
        let render_kind = expected_render_kind_for_item(&identity.file_type)
            .ok_or(AppError::UnsupportedFileType)?;
        Ok(ThumbnailGenerationSnapshot {
            item_id,
            desired_key,
            render_kind,
            generation: 0, // 由阶段 3a claim 分配
            source_content_hash,
            source_file_size,
            source_modified_at,
            canonical_path: identity.file_path.clone(),
            file_type: identity.file_type.clone(),
            source_body,
        })
    }

    /// 阶段 3a：短 DB claim。在同一短事务内：
    /// - 核对 item 仍存在且 canonical path 未变（identity 校验）；
    /// - **复核阶段 1 读取的 file_hash / file_size / modified_at 仍然成立**
    ///   （B1 审查阻塞 A）：若保存发生在 snapshot 与 claim 之间，当前 DB revision
    ///   已与阶段 1 读取的不一致——此时不得用旧 snapshot 覆盖新 revision（否则
    ///   desired_key 会从新 revision 倒退成旧值并额外推进 generation），返回 Superseded；
    /// - revision 未变时：收敛 items revision（与磁盘 snapshot 不一致则更新）、
    ///   读现有 desired_key / generation，desired key 变化时递增持久化 generation 并写 pending。
    /// 事务内不做任何文件/渲染 I/O；commit 后立即释放，供测试证明 prepare/capture
    /// 阶段不阻塞其他写事务。
    fn claim_thumbnail_generation(
        &self,
        item_id: i64,
        identity: &ItemThumbnailIdentity,
        snapshot: &ThumbnailGenerationSnapshot,
    ) -> Result<ClaimOutcome, AppError> {
        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;

        // 事务内重读 items 当前状态（不是阶段 1 的陈旧 identity）。
        let (db_path, current_hash, current_size, current_modified_at): (
            String,
            Option<String>,
            i64,
            String,
        ) = transaction
            .query_row(
                "SELECT file_path, file_hash, file_size, modified_at
                 FROM items
                 WHERE id = ?1 AND is_deleted = 0",
                params![item_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .map_err(|_| AppError::ItemNotFound)?;
        if db_path != identity.file_path {
            return Err(AppError::InvalidParams);
        }

        // 复核阶段 1 读取的 revision 仍然成立：snapshot 与 claim 之间发生并发保存/
        // invalidate 时，当前 DB revision 与阶段 1 读取的不一致 → 本 snapshot 过期，
        // 绝不能把 desired_key 倒退、也不能额外推进 generation。
        let revision_still_valid = current_hash == identity.db_file_hash
            && current_size == identity.db_file_size
            && current_modified_at == identity.db_modified_at;
        if !revision_still_valid {
            transaction.commit().map_err(|_| AppError::DatabaseError)?;
            return Ok(ClaimOutcome::Superseded);
        }

        // 收敛 index：file_hash / file_size / modified_at 与磁盘 snapshot 不一致时更新，
        // 否则读取路径的 stat 校验会一直拒绝刚生成的 ready。此处已由 revision_still_valid
        // 保证没有并发 DB 修改，收敛是安全的。
        if identity.db_file_hash.as_deref() != Some(snapshot.source_content_hash.as_str())
            || identity.db_file_size != snapshot.source_file_size
            || identity.db_modified_at != snapshot.source_modified_at
        {
            transaction
                .execute(
                    "UPDATE items SET file_hash = ?2, file_size = ?3, modified_at = ?4
                     WHERE id = ?1",
                    params![
                        item_id,
                        snapshot.source_content_hash,
                        snapshot.source_file_size,
                        snapshot.source_modified_at,
                    ],
                )
                .map_err(|_| AppError::DatabaseError)?;
        }

        // generation：desired key 变化或行不存在 → 递增并记录；key 相同 → 复用。
        let (stored_desired, stored_generation): (Option<String>, i64) = transaction
            .query_row(
                "SELECT desired_key, generation
                 FROM thumbnail_cache
                 WHERE item_id = ?1",
                params![item_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()
            .map_err(|_| AppError::DatabaseError)?
            .unwrap_or((None, 0));
        let generation = if stored_desired.as_deref() == Some(snapshot.desired_key.as_str()) {
            stored_generation
        } else {
            stored_generation + 1
        };
        if stored_desired.as_deref() != Some(snapshot.desired_key.as_str()) {
            transaction
                .execute(
                    "INSERT INTO thumbnail_cache (
                        item_id, thumb_status, desired_key, generation, error_message
                     ) VALUES (?1, 'pending', ?2, ?3, NULL)
                     ON CONFLICT(item_id) DO UPDATE SET
                        thumb_status = 'pending',
                        desired_key = excluded.desired_key,
                        generation = excluded.generation,
                        error_message = NULL",
                    params![item_id, snapshot.desired_key, generation],
                )
                .map_err(|_| AppError::DatabaseError)?;
        }
        transaction.commit().map_err(|_| AppError::DatabaseError)?;
        Ok(ClaimOutcome::Claimed(generation))
    }

    /// 只读当前 thumbnail_cache 行（不存在返回 None）。
    fn read_thumbnail_state(&self, item_id: i64) -> Result<Option<ThumbnailCacheRow>, AppError> {
        let connection = self.connection()?;
        let row = connection
            .query_row(
                "SELECT desired_key, generation, thumb_status, thumb_path, width, height,
                        last_generated_at, error_message, render_kind,
                        generated_from_key, generated_from_hash
                 FROM thumbnail_cache
                 WHERE item_id = ?1",
                params![item_id],
                |row| {
                    Ok(ThumbnailCacheRow {
                        desired_key: row.get(0)?,
                        generation: row.get(1)?,
                        status: row.get(2)?,
                        thumb_path: row.get(3)?,
                        width: row.get(4)?,
                        height: row.get(5)?,
                        last_generated_at: row.get(6)?,
                        error_message: row.get(7)?,
                        render_kind: row.get(8)?,
                        generated_from_key: row.get(9)?,
                        generated_from_hash: row.get(10)?,
                    })
                },
            )
            .optional()
            .map_err(|_| AppError::DatabaseError)?;
        Ok(row)
    }

    /// CAS 提交：事务内核对 desired_key + generation 全部匹配才写 ready。
    fn cas_commit_thumbnail(
        &self,
        item_id: i64,
        snapshot: &ThumbnailGenerationSnapshot,
        asset: &crate::core::thumbnail::GeneratedThumbnailAsset,
        final_path: &Path,
        now: String,
    ) -> Result<bool, AppError> {
        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;
        let current: Option<(Option<String>, i64)> = transaction
            .query_row(
                "SELECT desired_key, generation
                 FROM thumbnail_cache
                 WHERE item_id = ?1",
                params![item_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()
            .map_err(|_| AppError::DatabaseError)?;
        let matches = matches!(
            current,
            Some((ref key, generation))
                if key.as_deref() == Some(snapshot.desired_key.as_str())
                    && generation == snapshot.generation
        );
        if !matches {
            return Ok(false);
        }

        let path_string = final_path.to_string_lossy().to_string();
        transaction
            .execute(
                "INSERT INTO thumbnail_cache (
                    item_id, thumb_path, thumb_status, width, height, generated_from_hash,
                    last_generated_at, error_message, desired_key, generated_from_key,
                    render_kind, generation
                 ) VALUES (?1, ?2, 'ready', ?3, ?4, ?5, ?6, NULL, ?7, ?8, ?9, ?10)
                 ON CONFLICT(item_id) DO UPDATE SET
                    thumb_path = excluded.thumb_path,
                    thumb_status = excluded.thumb_status,
                    width = excluded.width,
                    height = excluded.height,
                    generated_from_hash = excluded.generated_from_hash,
                    last_generated_at = excluded.last_generated_at,
                    error_message = NULL,
                    desired_key = excluded.desired_key,
                    generated_from_key = excluded.generated_from_key,
                    render_kind = excluded.render_kind,
                    generation = excluded.generation",
                params![
                    item_id,
                    path_string,
                    asset.width,
                    asset.height,
                    snapshot.source_content_hash,
                    now,
                    snapshot.desired_key,
                    snapshot.desired_key,
                    snapshot.render_kind,
                    snapshot.generation,
                ],
            )
            .map_err(|_| AppError::DatabaseError)?;
        transaction.commit().map_err(|_| AppError::DatabaseError)?;
        Ok(true)
    }

    /// 生成结果是 placeholder 时：不写文件、不 commit ready，且与 PNG 路径使用
    /// **相同等级**的 CAS（B1 审查阻塞 4）：
    /// 1. completion 前重读磁盘 revision，源文件已变化 → 直接 discarded；
    /// 2. 同一短事务内读取当前 desired_key / generation / status / path / render_kind
    ///    / generated_from_key / generated_from_hash（不用另一连接的 read_thumbnail_state，
    ///    避免读到事务开始前的过期快照）；
    /// 3. 只有 key + generation 与 snapshot 完全匹配才能继续；
    /// 4. 保留既有 ready 时还必须确认：render kind 精确等于 snapshot.render_kind、
    ///    generated_from_key/hash 与当前 revision 匹配、缓存文件真实存在；
    /// 5. 所有写都通过条件 UPDATE（WHERE item_id + desired_key + generation）并检查
    ///    affected rows：0 行或状态在过程中变化 → 返回 discarded=true + 当前 expected key。
    /// 绝不把旧 generation 的 placeholder/ready 作为非 discarded 结果返回。
    fn finish_thumbnail_placeholder(
        &self,
        item_id: i64,
        snapshot: &ThumbnailGenerationSnapshot,
    ) -> Result<GenerateThumbnailResponse, AppError> {
        // 与 PNG 路径相同的磁盘复核：截图期间源文件被外部改写（扫描未触发）时丢弃。
        let disk_still_matches = fs::read_to_string(&snapshot.canonical_path)
            .map(|raw| content_hash(&raw) == snapshot.source_content_hash)
            .unwrap_or(false);
        if !disk_still_matches {
            let current = self.read_thumbnail_state(item_id)?;
            return Ok(Self::discarded_thumbnail_response(snapshot, current));
        }

        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;

        // 同一短事务内读取当前状态（快照一致性由事务保证）。
        let current: Option<ThumbnailCacheRow> = transaction
            .query_row(
                "SELECT desired_key, generation, thumb_status, thumb_path, width, height,
                        last_generated_at, error_message, render_kind,
                        generated_from_key, generated_from_hash
                 FROM thumbnail_cache
                 WHERE item_id = ?1",
                params![item_id],
                |row| {
                    Ok(ThumbnailCacheRow {
                        desired_key: row.get(0)?,
                        generation: row.get(1)?,
                        status: row.get(2)?,
                        thumb_path: row.get(3)?,
                        width: row.get(4)?,
                        height: row.get(5)?,
                        last_generated_at: row.get(6)?,
                        error_message: row.get(7)?,
                        render_kind: row.get(8)?,
                        generated_from_key: row.get(9)?,
                        generated_from_hash: row.get(10)?,
                    })
                },
            )
            .optional()
            .map_err(|_| AppError::DatabaseError)?;

        // 只有 desired_key + generation 与 snapshot 完全匹配才能继续。
        let matches_current = matches!(
            current,
            Some(ref row)
                if row.desired_key.as_deref() == Some(snapshot.desired_key.as_str())
                    && row.generation == snapshot.generation
        );
        if !matches_current {
            transaction.commit().map_err(|_| AppError::DatabaseError)?;
            return Ok(Self::discarded_thumbnail_response(snapshot, current));
        }

        // 既有 ready 是否真 ready：render kind 精确匹配、generated key/hash 与
        // 当前 revision 匹配、缓存文件真实存在。
        let preserved_ready = matches!(
            current,
            Some(ref row)
                if row.status == "ready"
                    && row.render_kind.as_deref() == Some(snapshot.render_kind)
                    && row.generated_from_key.as_deref() == Some(snapshot.desired_key.as_str())
                    && row.generated_from_hash.as_deref()
                        == Some(snapshot.source_content_hash.as_str())
                    && row.thumb_path.as_deref().map(|p| Path::new(p).is_file()).unwrap_or(false)
        );

        if preserved_ready {
            // 确认写：条件 UPDATE（key + generation + status）作为 CAS，防止
            // 事务快照之后、UPDATE 之前发生并发 invalidate。
            let affected = transaction
                .execute(
                    "UPDATE thumbnail_cache
                     SET thumb_status = 'ready', error_message = NULL
                     WHERE item_id = ?1 AND desired_key = ?2 AND generation = ?3
                       AND thumb_status = 'ready'",
                    params![item_id, snapshot.desired_key, snapshot.generation],
                )
                .map_err(|_| AppError::DatabaseError)?;
            if affected == 0 {
                // 状态在过程中变化：并发 invalidate 抢先。返回 discarded + 当前 expected key。
                transaction.commit().map_err(|_| AppError::DatabaseError)?;
                let current_after = self.read_thumbnail_state(item_id)?;
                return Ok(Self::discarded_thumbnail_response(snapshot, current_after));
            }
            transaction.commit().map_err(|_| AppError::DatabaseError)?;
            return Ok(GenerateThumbnailResponse {
                item_id,
                generated_from_key: Some(snapshot.desired_key.clone()),
                expected_key: Some(snapshot.desired_key.clone()),
                generation: snapshot.generation,
                discarded: false,
                thumbnail: ThumbnailInfo {
                    status: "ready".to_string(),
                    path: current.as_ref().and_then(|row| row.thumb_path.clone()),
                    width: current.as_ref().and_then(|row| row.width),
                    height: current.as_ref().and_then(|row| row.height),
                    last_generated_at: current.as_ref().and_then(|row| row.last_generated_at.clone()),
                    error_message: None,
                    desired_key: Some(snapshot.desired_key.clone()),
                    generation: Some(snapshot.generation),
                    render_kind: Some(snapshot.render_kind.to_string()),
                },
            });
        }

        // 标记 failed（可重试）：条件 UPDATE，检查 affected rows。
        let affected = transaction
            .execute(
                "UPDATE thumbnail_cache
                 SET thumb_status = 'failed',
                     render_kind = ?2,
                     error_message = ?3
                 WHERE item_id = ?1 AND desired_key = ?4 AND generation = ?5",
                params![
                    item_id,
                    RENDER_KIND_PLACEHOLDER,
                    THUMBNAIL_ENGINE_UNAVAILABLE_MESSAGE,
                    snapshot.desired_key,
                    snapshot.generation,
                ],
            )
            .map_err(|_| AppError::DatabaseError)?;
        transaction.commit().map_err(|_| AppError::DatabaseError)?;

        if affected == 0 {
            // 状态在过程中变化：并发 invalidate 抢先。返回 discarded + 当前 expected key。
            let current_after = self.read_thumbnail_state(item_id)?;
            return Ok(Self::discarded_thumbnail_response(snapshot, current_after));
        }

        Ok(GenerateThumbnailResponse {
            item_id,
            generated_from_key: Some(snapshot.desired_key.clone()),
            expected_key: Some(snapshot.desired_key.clone()),
            generation: snapshot.generation,
            discarded: false,
            thumbnail: ThumbnailInfo {
                status: "failed".to_string(),
                path: None,
                width: None,
                height: None,
                last_generated_at: None,
                error_message: Some(THUMBNAIL_ENGINE_UNAVAILABLE_MESSAGE.to_string()),
                desired_key: Some(snapshot.desired_key.clone()),
                generation: Some(snapshot.generation),
                render_kind: Some(RENDER_KIND_PLACEHOLDER.to_string()),
            },
        })
    }

    /// 旧任务晚到（desired key / generation 已变化）的丢弃响应：
    /// 携带 generatedFromKey / expectedKey / generation / discarded=true，
    /// 前端据此不得写回旧图，并按 expectedKey 补跑最新 generation。
    fn discarded_thumbnail_response(
        snapshot: &ThumbnailGenerationSnapshot,
        current: Option<ThumbnailCacheRow>,
    ) -> GenerateThumbnailResponse {
        GenerateThumbnailResponse {
            item_id: snapshot.item_id,
            generated_from_key: Some(snapshot.desired_key.clone()),
            expected_key: current
                .as_ref()
                .and_then(|row| row.desired_key.clone()),
            generation: snapshot.generation,
            discarded: true,
            thumbnail: current
                .map(ThumbnailCacheRow::into_thumbnail_info)
                .unwrap_or_else(|| ThumbnailInfo {
                    status: "pending".to_string(),
                    path: None,
                    width: None,
                    height: None,
                    last_generated_at: None,
                    error_message: None,
                    desired_key: Some(snapshot.desired_key.clone()),
                    generation: Some(snapshot.generation),
                    render_kind: Some(snapshot.render_kind.to_string()),
                }),
        }
    }

    /// CAS 成功后清理该 item 更早 generation 的成品文件；只匹配
    /// item-<id>.<数字>.<扩展名> 形态，不碰带点前缀的临时文件或当前 generation。
    fn cleanup_older_thumbnail_files(
        &self,
        item_id: i64,
        current_generation: i64,
        extension: &str,
    ) -> Result<(), AppError> {
        let cache_dir = self.thumbnail_cache_dir();
        let Ok(entries) = fs::read_dir(&cache_dir) else {
            return Ok(());
        };
        let prefix = format!("item-{item_id}.");
        let current_suffix = format!("{current_generation}.{extension}");
        for entry in entries.flatten() {
            let Some(name) = entry.file_name().to_str().map(str::to_string) else {
                continue;
            };
            if !name.starts_with(&prefix) || name.ends_with(&current_suffix) {
                continue;
            }
            let rest = &name[prefix.len()..];
            let Some((generation_part, ext)) = rest.rsplit_once('.') else {
                continue;
            };
            if generation_part.is_empty()
                || !generation_part.bytes().all(|byte| byte.is_ascii_digit())
            {
                continue;
            }
            if !matches!(ext, "png" | "jpg" | "jpeg" | "webp" | "svg") {
                continue;
            }
            let _ = fs::remove_file(entry.path());
        }
        Ok(())
    }

    /// B1：按 item_id + canonical_path 精确更新 revision，并在同一短事务把旧缩略图
    /// 设为 stale、递增持久化 generation。不依赖 owner library 或 source_kind；
    /// ordinary、agent_project 独占、shared item 都可用；禁止为 agent_project
    /// 调用递归 library scan。
    pub fn update_item_revision_and_invalidate_impl(
        &self,
        item_id: i64,
        canonical_path: &str,
        source_hash: &str,
        modified_at: &str,
        file_size: i64,
    ) -> Result<(), AppError> {
        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;

        let (db_path,): (String,) = transaction
            .query_row(
                "SELECT file_path
                 FROM items
                 WHERE id = ?1 AND is_deleted = 0",
                params![item_id],
                |row| Ok((row.get(0)?,)),
            )
            .map_err(|_| AppError::ItemNotFound)?;
        if db_path != canonical_path {
            return Err(AppError::InvalidParams);
        }

        transaction
            .execute(
                "UPDATE items
                 SET file_hash = ?2, modified_at = ?3, file_size = ?4,
                     updated_at = ?3, path_state = 'valid'
                 WHERE id = ?1 AND file_path = ?5",
                params![item_id, source_hash, modified_at, file_size, canonical_path],
            )
            .map_err(|_| AppError::DatabaseError)?;

        // 同一短事务：旧缩略图设为 stale、递增持久化 generation（使 in-flight
        // 的同 key 旧任务也会被 CAS 拒绝）。
        Self::invalidate_thumbnail_in_transaction(&transaction, item_id, source_hash)?;
        transaction.commit().map_err(|_| AppError::DatabaseError)?;
        Ok(())
    }

    /// 在同一短事务内把 item 的旧缩略图设为 stale，并按当前状态更新 desired key、
    /// 递增持久化 generation。source_hash 是源内容 hash（HTML 直接进 desired key；
    /// Markdown 用于 source-revision 校验）。
    fn invalidate_thumbnail_in_transaction(
        transaction: &Transaction<'_>,
        item_id: i64,
        source_hash: &str,
    ) -> Result<(), AppError> {
        let (file_type,): (String,) = transaction
            .query_row(
                "SELECT file_type
                 FROM items
                 WHERE id = ?1 AND is_deleted = 0",
                params![item_id],
                |row| Ok((row.get(0)?,)),
            )
            .map_err(|_| AppError::ItemNotFound)?;
        let new_desired_key = match desired_key_for_item(&file_type, Some(source_hash)) {
            Some(key) => key,
            None => transaction
                .query_row(
                    "SELECT COALESCE(desired_key, '')
                     FROM thumbnail_cache
                     WHERE item_id = ?1",
                    params![item_id],
                    |row| row.get::<_, String>(0),
                )
                .optional()
                .map_err(|_| AppError::DatabaseError)?
                .unwrap_or_default(),
        };
        let (_, stored_generation): (Option<String>, i64) = transaction
            .query_row(
                "SELECT desired_key, generation
                 FROM thumbnail_cache
                 WHERE item_id = ?1",
                params![item_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()
            .map_err(|_| AppError::DatabaseError)?
            .unwrap_or((None, 0));
        let next_generation = stored_generation + 1;
        transaction
            .execute(
                "INSERT INTO thumbnail_cache (
                    item_id, thumb_status, desired_key, generation, error_message
                 ) VALUES (?1, 'stale', ?2, ?3, NULL)
                 ON CONFLICT(item_id) DO UPDATE SET
                    thumb_status = 'stale',
                    desired_key = excluded.desired_key,
                    generation = excluded.generation,
                    error_message = NULL",
                params![item_id, new_desired_key, next_generation],
            )
            .map_err(|_| AppError::DatabaseError)?;
        Ok(())
    }

    /// durable source save 后的精确索引同步入口（B2 的 HTML commit 会接线调用）。
    /// source 已 durable 时，索引同步失败绝不能被伪装成保存失败；失败时原子写入
    /// 可重放 marker 并返回 index_synchronized=false。
    /// durable save 后的精确 revision 同步（B1 审查阻塞 6）：
    /// - `modified_at = Some(真实纳秒 mtime)`：按 item_id + canonical_path 精确更新
    ///   revision 并在同一短事务把旧缩略图设 stale、递增 generation；
    /// - `modified_at = None`（stat / canonical mtime 获取失败）：**不**写入伪造的
    ///   零纳秒 mtime、不更新 index；source 已 durable → 索引同步 pending，原子写
    ///   reconciliation marker，重放时重新 stat/read/hash 磁盘，成功后删除 marker。
    /// 两种情况下 source save 都算成功（source_saved=true），绝不伪装成保存失败。
    pub fn sync_item_revision_after_durable_save(
        &self,
        item_id: i64,
        canonical_path: &str,
        source_hash: &str,
        modified_at: Option<&str>,
        file_size: i64,
    ) -> DurableSaveSyncReport {
        let mtime = match modified_at {
            Some(mtime) => mtime,
            None => {
                // 拿不到真实 mtime：不碰 index，直接进 marker 队列。
                let generation = self
                    .read_thumbnail_state(item_id)
                    .ok()
                    .flatten()
                    .map(|row| row.generation)
                    .unwrap_or(0);
                let marker = ReconciliationMarker {
                    schema_version: RECONCILIATION_MARKER_VERSION,
                    item_id,
                    canonical_path: canonical_path.to_string(),
                    source_hash: source_hash.to_string(),
                    modified_at: String::new(),
                    file_size,
                    generation,
                    written_at: current_timestamp(),
                };
                if let Err(write_error) = self.write_reconciliation_marker(&marker) {
                    eprintln!(
                        "Nutbook reconciliation marker write failed for item {item_id}: \
                         {write_error} (mtime unavailable)"
                    );
                }
                return DurableSaveSyncReport {
                    source_saved: true,
                    index_synchronized: false,
                };
            }
        };
        match self.update_item_revision_and_invalidate(
            item_id,
            canonical_path,
            source_hash,
            mtime,
            file_size,
        ) {
            Ok(()) => DurableSaveSyncReport {
                source_saved: true,
                index_synchronized: true,
            },
            Err(error) => {
                let generation = self
                    .read_thumbnail_state(item_id)
                    .ok()
                    .flatten()
                    .map(|row| row.generation)
                    .unwrap_or(0);
                let marker = ReconciliationMarker {
                    schema_version: RECONCILIATION_MARKER_VERSION,
                    item_id,
                    canonical_path: canonical_path.to_string(),
                    source_hash: source_hash.to_string(),
                    modified_at: mtime.to_string(),
                    file_size,
                    generation,
                    written_at: current_timestamp(),
                };
                if let Err(write_error) = self.write_reconciliation_marker(&marker) {
                    eprintln!(
                        "Nutbook reconciliation marker write failed for item {item_id}: \
                         {write_error} (index sync error: {error})"
                    );
                }
                DurableSaveSyncReport {
                    source_saved: true,
                    index_synchronized: false,
                }
            }
        }
    }

    /// 原子写入 per-item reconciliation marker（临时文件 + rename，不产生半份 JSON）。
    pub fn write_reconciliation_marker(
        &self,
        marker: &ReconciliationMarker,
    ) -> Result<(), AppError> {
        let dir = self.reconciliation_marker_dir();
        fs::create_dir_all(&dir).map_err(|_| AppError::IoError)?;
        let path = dir.join(format!("reconcile-{}.json", marker.item_id));
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0);
        let temporary = dir.join(format!(".reconcile-{}-{nonce}.tmp", marker.item_id));
        let json = serde_json::to_vec_pretty(marker).map_err(|_| AppError::InternalError)?;
        fs::write(&temporary, json).map_err(|_| AppError::IoError)?;
        fs::rename(&temporary, &path).map_err(|_| AppError::IoError)?;
        Ok(())
    }

    /// 启动 / list 路径：根据磁盘真实状态重放 marker。精确更新同一 item、
    /// 旧缩略图保持 stale、marker 只在同步真正成功后删除；失败保留供下次重试。
    pub fn replay_reconciliation_markers(&self) -> Result<usize, AppError> {
        let dir = self.reconciliation_marker_dir();
        if !dir.exists() {
            return Ok(0);
        }
        let Ok(entries) = fs::read_dir(&dir) else {
            return Ok(0);
        };
        let mut replayed = 0usize;
        for entry in entries.flatten() {
            let path = entry.path();
            let is_marker = path
                .file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name.starts_with("reconcile-") && name.ends_with(".json"));
            if !is_marker {
                continue;
            }
            match self.replay_one_marker(&path) {
                Ok(handled) => {
                    if handled {
                        replayed += 1;
                    }
                }
                Err(error) => {
                    // 恢复失败：保留 marker 供下次重试。
                    eprintln!(
                        "Nutbook reconciliation replay failed for {}: {error}",
                        path.display()
                    );
                }
            }
        }
        Ok(replayed)
    }

    fn replay_one_marker(&self, path: &Path) -> Result<bool, AppError> {
        let bytes = fs::read(path).map_err(|_| AppError::IoError)?;
        let marker: ReconciliationMarker =
            serde_json::from_slice(&bytes).map_err(|_| AppError::IoError)?;
        if marker.schema_version != RECONCILIATION_MARKER_VERSION {
            // 未知版本：保留，不冒险重放。
            return Ok(false);
        }
        let connection = self.connection()?;
        let item_exists = connection
            .query_row(
                "SELECT 1 FROM items WHERE id = ?1",
                params![marker.item_id],
                |_| Ok(()),
            )
            .optional()
            .map_err(|_| AppError::DatabaseError)?
            .is_some();
        if !item_exists {
            // item 已删除：marker 失去意义，删除。
            let _ = fs::remove_file(path);
            return Ok(true);
        }

        // 磁盘是状态源：重放总是重新读取磁盘内容、以磁盘真实 hash / mtime / size
        // 收敛索引，绝不信任 marker 里记录的 hash（同尺寸改写场景下 marker hash
        // 可能已与磁盘不符）。文件缺失 → 保留 marker 等待恢复。
        let metadata = match fs::metadata(&marker.canonical_path) {
            Ok(metadata) => metadata,
            Err(_) => return Ok(false),
        };
        let raw = fs::read_to_string(&marker.canonical_path).map_err(|_| AppError::IoError)?;
        let source_hash = content_hash(&raw);
        let modified_at = file_modified_at_string(&metadata)?;
        let file_size = metadata.len() as i64;
        self.update_item_revision_and_invalidate(
            marker.item_id,
            &marker.canonical_path,
            &source_hash,
            &modified_at,
            file_size,
        )?;
        // 只有同步真正成功后删除 marker。
        fs::remove_file(path).map_err(|_| AppError::IoError)?;
        Ok(true)
    }

    fn reconciliation_marker_dir(&self) -> PathBuf {
        self.path
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .join(".cache")
            .join("reconcile")
    }
}

fn normalize_keyword_query(keyword: Option<&str>) -> Option<String> {
    let keyword = keyword?;
    let tokens: Vec<String> = keyword
        .split_whitespace()
        .map(|part| format!("\"{}\"*", part.replace('"', "\"\"")))
        .collect();

    if tokens.is_empty() {
        None
    } else {
        Some(tokens.join(" "))
    }
}

fn html_thumbnail_input(
    connection: &Connection,
    item_id: i64,
) -> Result<HtmlThumbnailInput, AppError> {
    // 只做 DB SELECT；不持有事务。HTML 的真实渲染输入是磁盘文件本身
    // （Chromium 加载 file:// URL），因此不读取 item_content.raw_text——
    // 那可能是陈旧缓存，会与 key / source hash 分属不同 revision。
    let (file_path, file_name, title): (String, String, Option<String>) = connection
        .query_row(
            "SELECT items.file_path, items.file_name, items.title
             FROM items
             WHERE items.id = ?1",
            params![item_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(|_| AppError::DatabaseError)?;

    Ok(HtmlThumbnailInput {
        file_name,
        title,
        raw_text: None,
        source_url: Url::from_file_path(Path::new(&file_path))
            .ok()
            .map(|url| url.to_string()),
    })
}

fn thumbnail_input_for_item(
    connection: &Connection,
    item_id: i64,
    snapshot: &ThumbnailGenerationSnapshot,
) -> Result<(HtmlThumbnailInput, Option<PathBuf>), AppError> {
    match snapshot.file_type.as_str() {
        "html" => Ok((html_thumbnail_input(connection, item_id)?, None)),
        "markdown" => markdown_thumbnail_input(connection, item_id, snapshot),
        _ => Err(AppError::UnsupportedFileType),
    }
}

fn markdown_thumbnail_input(
    connection: &Connection,
    item_id: i64,
    snapshot: &ThumbnailGenerationSnapshot,
) -> Result<(HtmlThumbnailInput, Option<PathBuf>), AppError> {
    // 事务内只做 DB SELECT（file_name / title，均为展示用元数据）。
    // 渲染正文**必须**来自 snapshot.source_body（snapshot 阶段从磁盘读取、与
    // desired key / source_content_hash 同属一个磁盘 revision）——禁止回落到
    // 可能陈旧的 item_content.raw_text，否则外部改写 Markdown 而 DB 正文缓存
    // 未刷新时，会把旧正文截图提交到新 desired key（B1 审查阻塞 1）。
    let (file_name, title): (String, Option<String>) = connection
        .query_row(
            "SELECT items.file_name, items.title
             FROM items
             WHERE items.id = ?1",
            params![item_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|_| AppError::DatabaseError)?;

    // 最小 test-only hook：磁盘正文已就绪（snapshot 阶段读取完成）、HTML 渲染
    // 尚未开始。若 prepare 阶段仍持有数据库事务/连接锁，另一个连接的写事务会
    // 在此被 SQLite 锁阻塞——测试据此证明 source preparation 不阻塞写事务。
    #[cfg(test)]
    {
        if let Some(hook) = crate::db::GENERATION_PREPARE_HOOK.lock().unwrap().as_ref() {
            hook();
        }
    }

    let display_title = title
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(file_name.as_str());
    let html = markdown_thumbnail_document(display_title, &file_name, &snapshot.source_body);
    let temporary_path = temp_markdown_thumbnail_path(item_id);
    fs::write(&temporary_path, html).map_err(|_| AppError::IoError)?;

    Ok((
        HtmlThumbnailInput {
            file_name,
            title,
            raw_text: Some(snapshot.source_body.clone()),
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
    use std::sync::atomic::{AtomicU64, Ordering};
    use std::time::{SystemTime, UNIX_EPOCH};

    use rusqlite::{params, Connection};

    use super::{migrations, Database};
    use crate::{
        commands::library::scan_library_once,
        db::repositories::{ItemRepository, LibraryRepository},
        models::{
            ArtifactCandidate, DiscoveryEvidence, DiscoveryReasonKind, IndexedItemRecord,
            Library, ListItemsQuery, RelatedArtifactFile,
        },
    };

    /// 进程级单调 nonce：SystemTime 在 macOS 上只有毫秒分辨率，多个 #[test]
    /// 并行启动时同一毫秒内会得到相同 as_nanos()，导致 unique_db_path /
    /// source_badge_unique_root 返回相同路径、两个测试共享同一个 sqlite 文件
    /// 而互相冲突。加上原子计数器后每个调用都严格唯一。
    static TEST_NONCE: AtomicU64 = AtomicU64::new(0);
    fn test_nonce() -> u64 {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos() as u64;
        let counter = TEST_NONCE.fetch_add(1, Ordering::Relaxed);
        nanos.wrapping_add(counter)
    }

    fn unique_db_path() -> PathBuf {
        std::env::temp_dir().join(format!("nutbook-test-{}.sqlite3", test_nonce()))
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
                // B1 起 Markdown 保存会在同一事务创建/更新 thumbnail_cache 行；
                // 用 upsert 把该行置为 ready，保留本测试"缓存状态随共享 item 保留"的语义。
                "INSERT INTO thumbnail_cache (
                   item_id, thumb_status, thumb_path, generated_from_hash
                 ) VALUES (1, 'ready', '/fixture/thumb.png', 'preserved-hash')
                 ON CONFLICT(item_id) DO UPDATE SET
                   thumb_status = 'ready', thumb_path = excluded.thumb_path,
                   generated_from_hash = excluded.generated_from_hash",
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
    fn markdown_thumbnail_cache_key_uses_transition_screenshot_prefix_until_b4() {
        // B1 阶段 Markdown 仍是临时 HTML→Chromium 截图：desired key 必须用独立过渡
        // 前缀 md-screenshot:（依赖源内容 hash），不得占用未来 B4 的 md-default: key，
        // 否则旧截图缓存会在 B4 上线后冒充新默认封面。
        let key = crate::core::thumbnail::desired_key_for_item("markdown", Some("hash-a"))
            .expect("markdown screenshot key should exist");
        assert!(key.starts_with("md-screenshot:"));
        assert!(key.ends_with(":md-screenshot-v1"));
        // 内容变化 → key 变化（B1 阶段截图反映全文）。
        let changed = crate::core::thumbnail::desired_key_for_item("markdown", Some("hash-b"))
            .expect("markdown screenshot key should exist");
        assert_ne!(key, changed);
        // 缺 hash → None（无法验证成图目标）。
        assert!(crate::core::thumbnail::desired_key_for_item("markdown", None).is_none());
        // 未来 B4 的 md-default builder 形状契约（当前不用，仅为退休后旧缓存不匹配）。
        let future_default = crate::core::thumbnail::markdown_default_cover_key("title-hash");
        assert!(future_default.starts_with("md-default:"));
        assert!(future_default.ends_with(":title-parser-v1:default-cover-v1"));
        assert_ne!(key, future_default);
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

    // ---- A1.1 来源徽标 source_badge 测试 ----

    /// 每个测试使用唯一目录根，避免多个 #[test] 并行时共享 /tmp 固定路径
    /// （若任何路径被 stat/扫描/写入，并行测试会互相干扰）。保留 basename。
    /// 用 test_nonce()（毫秒时间戳 + 进程级原子计数）保证并行启动时也严格唯一。
    fn source_badge_unique_root(seed: &str) -> String {
        std::env::temp_dir()
            .join(format!("nutbook-badge-{}-{seed}", test_nonce()))
            .to_string_lossy()
            .into_owned()
    }

    fn source_badge_test_library(id: i64, name: &str, root: &str, source_kind: &str) -> Library {
        Library {
            id,
            name: name.to_string(),
            root_path: root.to_string(),
            source_kind: source_kind.to_string(),
            path_state: "valid".to_string(),
            is_active: true,
            created_at: "2026-08-15T00:00:00Z".to_string(),
            updated_at: "2026-08-15T00:00:00Z".to_string(),
            last_scanned_at: None,
            skill_binding: None,
        }
    }

    fn source_badge_test_item(library_id: i64, _id: i64, path: &str) -> IndexedItemRecord {
        IndexedItemRecord {
            library_id,
            file_path: path.to_string(),
            relative_path: path.to_string(),
            file_name: "shared.md".to_string(),
            file_ext: "md".to_string(),
            file_type: "markdown".to_string(),
            file_size: 10,
            modified_at: "1".to_string(),
            created_at: "2026-08-15T00:00:00Z".to_string(),
            updated_at: "2026-08-15T00:00:00Z".to_string(),
        }
    }

    fn link_source(database: &Database, item_id: i64, library_id: i64, is_owner: bool) {
        let connection = database.connection().expect("connection");
        connection
            .execute(
                "INSERT INTO item_sources (item_id, library_id, link_kind, is_owner, created_at)
                 VALUES (?1, ?2, 'legacy', ?3, '2026-08-15T00:00:00Z')",
                params![item_id, library_id, i64::from(is_owner)],
            )
            .expect("link source");
    }

    /// 用 folder 占位库插入 item（replace_items_for_library 拒绝 agent_project），
    /// 返回数据库分配的真实 item id。每个测试用唯一 root，避免并行共享 /tmp 路径。
    fn insert_item_via_folder(
        database: &Database,
        folder_id: i64,
        seed: &str,
        path: &str,
    ) -> i64 {
        let root = source_badge_unique_root(seed);
        database
            .upsert_library(source_badge_test_library(
                folder_id,
                "seed folder",
                &root,
                "folder",
            ))
            .expect("seed folder library");
        database
            .replace_items_for_library(folder_id, &[source_badge_test_item(folder_id, 0, path)])
            .expect("insert item");
        database
            .list_items(&ListItemsQuery {
                library_id: Some(folder_id),
                ..ListItemsQuery::default()
            })
            .expect("list seed item")
            .items
            .into_iter()
            .next()
            .expect("seed item exists")
            .id
    }

    #[test]
    fn shared_item_source_badges_include_owner_and_non_owner_projects_and_skills() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database should initialize");

        // 两个 agent_project 来源（owner / non-owner）+ 一个 folder 来源（带 skill binding）。
        // 用 folder 库插入 item（replace_items_for_library 拒绝 agent_project），
        // 再把 folder 的 owner 移交给 agent_project 1，验证 owner 优先排序。
        let item_id = insert_item_via_folder(&database, 3, "folder-source_shared_md", &format!("{}/folder-source/shared.md", source_badge_unique_root("folder-source")));
        {
            let connection = database.connection().expect("connection");
            connection
                .execute(
                    "UPDATE item_sources SET is_owner = 0 WHERE item_id = ?1 AND library_id = ?2",
                    params![item_id, 3],
                )
                .expect("release folder owner");
        }
        database
            .bind_library_to_skill(3, "longskillnameforacceptance", "Long Skill Name for Acceptance", "now")
            .expect("skill binding");

        // 两个 agent_project 来源：1 为 owner，2 为 non-owner。
        database
            .upsert_library(source_badge_test_library(
                1,
                "中文验收项目",
                &format!("{}/中文验收项目", source_badge_unique_root("proj-zh")),
                "agent_project",
            ))
            .expect("project library");
        database
            .upsert_library(source_badge_test_library(
                2,
                "English Project",
                &format!("{}/english-project", source_badge_unique_root("proj-en")),
                "agent_project",
            ))
            .expect("second project library");
        link_source(&database, item_id, 1, true);
        link_source(&database, item_id, 2, false);

        let listed = database
            .list_items(&ListItemsQuery {
                library_id: Some(3),
                ..ListItemsQuery::default()
            })
            .expect("list items");
        let item = &listed.items[0];

        let projects = item
            .source_badges
            .iter()
            .filter(|badge| badge.kind == "project")
            .collect::<Vec<_>>();
        // owner 优先（library_id 1 是 owner，library_id 2 非 owner），library_id ASC。
        assert_eq!(projects.len(), 2, "two project badges");
        assert_eq!(projects[0].source_id, "project:1");
        assert_eq!(projects[0].is_owner, true);
        assert_eq!(projects[0].label, "中文验收项目");
        assert_eq!(projects[1].source_id, "project:2");
        assert_eq!(projects[1].is_owner, false);
        assert_eq!(projects[1].label, "English Project");

        // folder 来源不产生 project badge，但它的 skill binding 产生 skill badge。
        let skills = item
            .source_badges
            .iter()
            .filter(|badge| badge.kind == "skill")
            .collect::<Vec<_>>();
        assert_eq!(skills.len(), 1, "one skill badge");
        assert_eq!(skills[0].source_id, "skill:longskillnameforacceptance");
        assert_eq!(skills[0].label, "Long Skill Name for Acceptance");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn project_badge_falls_back_to_root_basename_when_name_is_empty() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database should initialize");
        let item_id = insert_item_via_folder(&database, 99, "seed-folder_a_md", "/tmp/seed-folder/a.md");
        database
            .upsert_library(source_badge_test_library(1, "", &format!("{}/unnamed-project", source_badge_unique_root("unnamed")), "agent_project"))
            .expect("project library");
        link_source(&database, item_id, 1, false);

        let listed = database
            .list_items(&ListItemsQuery {
                library_id: Some(99),
                ..ListItemsQuery::default()
            })
            .expect("list items");
        let project = listed.items[0]
            .source_badges
            .iter()
            .find(|badge| badge.kind == "project")
            .expect("project badge");
        assert_eq!(project.label, "unnamed-project", "empty name falls back to root basename");
        assert_eq!(project.source_id, "project:1");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn missing_or_inactive_source_sets_available_false() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database should initialize");
        let item_id = insert_item_via_folder(&database, 99, "seed-folder_b_md", "/tmp/seed-folder/b.md");
        database
            .upsert_library(Library {
                path_state: "missing".to_string(),
                ..source_badge_test_library(1, "missing project", &format!("{}/missing-project", source_badge_unique_root("missing")), "agent_project")
            })
            .expect("missing project library");
        database
            .upsert_library(Library {
                is_active: false,
                ..source_badge_test_library(2, "inactive project", &format!("{}/inactive-project", source_badge_unique_root("inactive")), "agent_project")
            })
            .expect("inactive project library");
        link_source(&database, item_id, 1, false);
        link_source(&database, item_id, 2, false);

        let listed = database
            .list_items(&ListItemsQuery {
                library_id: Some(99),
                ..ListItemsQuery::default()
            })
            .expect("list items");
        let badges = &listed.items[0].source_badges;
        assert_eq!(badges.len(), 2);
        assert!(
            !badges.iter().any(|badge| badge.source_id == "project:1" && badge.available),
            "missing source must be unavailable"
        );
        assert!(
            !badges.iter().any(|badge| badge.source_id == "project:2" && badge.available),
            "inactive source must be unavailable"
        );

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn deleting_one_relation_removes_only_that_badge() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database should initialize");
        let item_id = insert_item_via_folder(&database, 99, "seed-folder_c_md", "/tmp/seed-folder/c.md");
        database
            .upsert_library(source_badge_test_library(1, "Project A", &format!("{}/proj-a", source_badge_unique_root("proj-a")), "agent_project"))
            .expect("library a");
        database
            .upsert_library(source_badge_test_library(2, "Project B", &format!("{}/proj-b", source_badge_unique_root("proj-b")), "agent_project"))
            .expect("library b");
        link_source(&database, item_id, 1, false);
        link_source(&database, item_id, 2, false);

        let listed_before = database
            .list_items(&ListItemsQuery {
                library_id: Some(99),
                ..ListItemsQuery::default()
            })
            .expect("list items");
        assert_eq!(listed_before.items[0].source_badges.len(), 2);

        // 删除 project:2 的 relation，只移除该 badge。
        let connection = database.connection().expect("connection");
        connection
            .execute(
                "DELETE FROM item_sources WHERE item_id = ?1 AND library_id = ?2",
                params![item_id, 2],
            )
            .expect("delete relation");

        let listed_after = database
            .list_items(&ListItemsQuery {
                library_id: Some(99),
                ..ListItemsQuery::default()
            })
            .expect("list items");
        let badges = &listed_after.items[0].source_badges;
        assert_eq!(badges.len(), 1);
        assert_eq!(badges[0].source_id, "project:1");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn item_provenance_skill_fields_do_not_generate_skill_badges() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database should initialize");
        let item_id = insert_item_via_folder(&database, 99, "seed-folder_d_md", "/tmp/seed-folder/d.md");
        database
            .upsert_library(source_badge_test_library(1, "Project A", &format!("{}/proj-a", source_badge_unique_root("proj-a")), "agent_project"))
            .expect("library a");
        link_source(&database, item_id, 1, false);

        // 只有 item_provenance.skill_*，没有任何 library_skill_bindings。
        let connection = database.connection().expect("connection");
        connection
            .execute(
                "INSERT INTO item_provenance (
                    item_id, project_library_id, agent_kind, skill_normalized_name,
                    skill_display_name, evidence_kind, evidence_fingerprint, created_at
                 ) VALUES (?1, ?2, 'codex', 'phantomskill', 'Phantom Skill',
                    'adapter', 'fp-1', '2026-08-15T00:00:00Z')",
                params![item_id, 1],
            )
            .expect("insert provenance");

        let listed = database
            .list_items(&ListItemsQuery {
                library_id: Some(99),
                ..ListItemsQuery::default()
            })
            .expect("list items");
        let skills = listed.items[0]
            .source_badges
            .iter()
            .filter(|badge| badge.kind == "skill")
            .collect::<Vec<_>>();
        assert!(
            skills.is_empty(),
            "item_provenance.skill_* must not generate a Skill badge"
        );

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn source_badges_are_batch_assembled_for_list_page() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database should initialize");
        database
            .upsert_library(source_badge_test_library(99, "seed folder", &format!("{}/seed-folder", source_badge_unique_root("seed")), "folder"))
            .expect("seed folder library");
        database
            .upsert_library(source_badge_test_library(1, "Project A", &format!("{}/proj-a", source_badge_unique_root("proj-a")), "agent_project"))
            .expect("library a");
        database
            .bind_library_to_skill(1, "skillone", "Skill One", "now")
            .expect("binding");

        // 一页内多个 item，全部共享同一来源；必须一次批量查询装配，
        // 不能逐 item 执行来源查询。
        let mut items = Vec::new();
        for id in 201..240 {
            items.push(source_badge_test_item(
                99,
                id,
                &format!("{}/seed-folder/f{id}.md", source_badge_unique_root("seed")),
            ));
        }
        database.replace_items_for_library(99, &items).expect("insert items");
        let page_item_ids = database
            .list_items(&ListItemsQuery {
                library_id: Some(99),
                page_size: Some(40),
                ..ListItemsQuery::default()
            })
            .expect("list seed items")
            .items
            .iter()
            .map(|item| item.id)
            .collect::<Vec<_>>();
        assert_eq!(page_item_ids.len(), 39, "201..240 covers 39 items");
        for item_id in &page_item_ids {
            link_source(&database, *item_id, 1, false);
        }

        let listed = database
            .list_items(&ListItemsQuery {
                library_id: Some(99),
                page_size: Some(30),
                ..ListItemsQuery::default()
            })
            .expect("list items");
        assert_eq!(listed.items.len(), 30);
        for item in &listed.items {
            assert_eq!(
                item.source_badges.len(),
                2,
                "each item should have project + skill badge from the same batch"
            );
            assert!(item.source_badges.iter().any(|badge| badge.source_id == "project:1"));
            assert!(item.source_badges.iter().any(|badge| badge.source_id == "skill:skillone"));
        }

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

    #[test]
    fn normalize_keyword_query_escapes_fst_literals() {
        use super::normalize_keyword_query;

        assert_eq!(
            normalize_keyword_query(Some("revision-alpha")),
            Some("\"revision-alpha\"*".to_string())
        );
        assert_eq!(
            normalize_keyword_query(Some("foo\"bar")),
            Some("\"foo\"\"bar\"*".to_string())
        );
        assert_eq!(
            normalize_keyword_query(Some("AND")),
            Some("\"AND\"*".to_string())
        );
        assert_eq!(
            normalize_keyword_query(Some("项目来源验收甲号")),
            Some("\"项目来源验收甲号\"*".to_string())
        );
        assert_eq!(
            normalize_keyword_query(Some("foo bar")),
            Some("\"foo\"* \"bar\"*".to_string())
        );
        assert_eq!(
            normalize_keyword_query(Some("revision")),
            Some("\"revision\"*".to_string())
        );
        assert_eq!(normalize_keyword_query(None), None);
        assert_eq!(normalize_keyword_query(Some("   ")), None);
    }

    #[test]
    fn database_keyword_search_treats_special_terms_as_literals() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("database should initialize");
        database
            .upsert_library(sample_library(1, "/tmp/clips", "folder"))
            .expect("library should be inserted");

        let item = |library_id: i64, file_path: &str, file_type: &str, file_ext: &str| {
            IndexedItemRecord {
                library_id,
                file_path: file_path.to_string(),
                relative_path: file_path.rsplit('/').next().unwrap_or(file_path).to_string(),
                file_name: file_path.rsplit('/').next().unwrap_or(file_path).to_string(),
                file_ext: file_ext.to_string(),
                file_type: file_type.to_string(),
                file_size: 1,
                modified_at: "1".to_string(),
                created_at: "now".to_string(),
                updated_at: "now".to_string(),
            }
        };

        database
            .replace_items_for_library(
                1,
                &[
                    item(1, "/tmp/clips/search-revision-alpha.md", "markdown", "md"),
                    item(1, "/tmp/clips/search-revision-beta.md", "markdown", "md"),
                    item(1, "/tmp/clips/search-shared-card.html", "html", "html"),
                ],
            )
            .expect("items should be inserted");

        let hits = |keyword: &str| {
            database
                .list_items(&ListItemsQuery {
                    library_id: Some(1),
                    keyword: Some(keyword.to_string()),
                    ..ListItemsQuery::default()
                })
                .map(|page| {
                    page.items
                        .iter()
                        .map(|item| item.file_name.clone())
                        .collect::<Vec<_>>()
                })
        };

        assert_eq!(
            hits("revision-alpha").expect("hyphenated literal must not raise a syntax error"),
            vec!["search-revision-alpha.md".to_string()]
        );
        assert_eq!(
            hits("revision-beta").expect("hyphenated literal must not raise a syntax error"),
            vec!["search-revision-beta.md".to_string()]
        );
        assert_eq!(
            hits("shared-card").expect("hyphenated literal must not raise a syntax error"),
            vec!["search-shared-card.html".to_string()]
        );

        assert!(hits("AND").is_ok(), "reserved words must be treated as literals");
        assert!(hits("NOT OR NEAR").is_ok(), "reserved words must be treated as literals");
        assert!(hits("foo\"bar").is_ok(), "embedded quotes must be escaped");
        assert!(hits("项目来源验收甲号").is_ok(), "Chinese text must be treated as a literal");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn scan_refreshes_markdown_content_without_opening() {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("nutbook-scan-content-{nanos}"));
        fs::create_dir_all(&dir).expect("dir");
        let file_path = dir.join("note.md");
        fs::write(&file_path, "# 项目来源验收甲号 alpha").expect("write");

        let path = unique_db_path();
        let database = Database::new(&path).expect("database");
        database
            .upsert_library(sample_library(1, dir.to_str().expect("utf8"), "folder"))
            .expect("library");

        let record = |file_path: &std::path::Path, modified_at: &str| IndexedItemRecord {
            library_id: 1,
            file_path: file_path.to_string_lossy().into_owned(),
            relative_path: "note.md".to_string(),
            file_name: "note.md".to_string(),
            file_ext: "md".to_string(),
            file_type: "markdown".to_string(),
            file_size: 1,
            modified_at: modified_at.to_string(),
            created_at: "now".to_string(),
            updated_at: "now".to_string(),
        };

        database
            .replace_items_for_library(1, &[record(&file_path, "1")])
            .expect("first scan");

        let hit = |keyword: &str| {
            database
                .list_items(&ListItemsQuery {
                    library_id: Some(1),
                    keyword: Some(keyword.to_string()),
                    ..ListItemsQuery::default()
                })
                .map(|page| page.total)
                .expect("search should work")
        };

        assert_eq!(hit("项目来源验收甲号"), 1, "scan must index Chinese body text without opening");
        assert_eq!(hit("alpha"), 1, "scan must index English body text without opening");

        // 文件内容与元数据都未变化：增量刷新必须跳过（不会读文件/重渲染），
        // 旧内容仍然可搜。
        database
            .replace_items_for_library(1, &[record(&file_path, "1")])
            .expect("unchanged rescan");
        assert_eq!(hit("项目来源验收甲号"), 1, "unchanged file keeps its indexed content");

        // 修改文件内容并改变 modified_at（模拟磁盘变更）：增量刷新必须重新
        // 提取，新词出现、旧词消失，全程无需打开文件。
        fs::write(&file_path, "# 项目来源验收乙号 beta").expect("rewrite");
        database
            .replace_items_for_library(1, &[record(&file_path, "2")])
            .expect("second scan");

        assert_eq!(hit("项目来源验收乙号"), 1, "rescan must surface the new Chinese term");
        assert_eq!(hit("项目来源验收甲号"), 0, "the old Chinese term must no longer match");
        assert_eq!(hit("beta"), 1, "the new English term must match");

        let _ = std::fs::remove_file(&file_path);
        let _ = std::fs::remove_dir(&dir);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn scan_library_once_refreshes_markdown_after_real_file_change() {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("nutbook-scan-once-{nanos}"));
        fs::create_dir_all(&dir).expect("dir");
        let file_path = dir.join("note.md");
        fs::write(&file_path, "# 项目来源验收甲号 alpha").expect("write");

        let path = unique_db_path();
        let database = Database::new(&path).expect("database");
        database
            .upsert_library(sample_library(1, dir.to_str().expect("utf8"), "folder"))
            .expect("library");

        // 端到端路径：scan_library_once 会真实扫描目录、读文件元数据（mtime）
        // 并调用 replace_items_for_library 做增量内容索引。
        scan_library_once(&database, 1).expect("first scan");

        let hit = |keyword: &str| {
            database
                .list_items(&ListItemsQuery {
                    library_id: Some(1),
                    keyword: Some(keyword.to_string()),
                    ..ListItemsQuery::default()
                })
                .map(|page| page.total)
                .expect("search should work")
        };

        assert_eq!(hit("项目来源验收甲号"), 1, "first scan indexes the initial body");
        assert_eq!(hit("alpha"), 1, "first scan indexes English body text");

        // 立即改写为相同字节长度的新词（"# 项目来源验收甲号 alpha" 与
        // "# 项目来源验收乙号 betas" 均为 32 字节），file_size 不变；只有
        // 高精度 mtime（秒.纳秒）会变化，增量刷新必须因此重新提取，
        // 不要求打开文件。
        fs::write(&file_path, "# 项目来源验收乙号 betas").expect("rewrite");

        scan_library_once(&database, 1).expect("second scan");

        assert_eq!(hit("项目来源验收乙号"), 1, "modified file surfaces the new term without opening");
        assert_eq!(hit("项目来源验收甲号"), 0, "the old term disappears after modification");
        assert_eq!(hit("betas"), 1, "the new English term matches after modification");

        // 未变化的文件再次扫描不应重复提取：再扫一次，内容保持一致。
        scan_library_once(&database, 1).expect("third scan");
        assert_eq!(hit("项目来源验收乙号"), 1, "idempotent rescan keeps the indexed content");

        let _ = std::fs::remove_file(&file_path);
        let _ = std::fs::remove_dir(&dir);
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn scan_keeps_shared_item_as_one_item_across_sources() {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("nutbook-shared-{nanos}"));
        fs::create_dir_all(&dir).expect("dir");
        let file_path = dir.join("shared.md");
        fs::write(&file_path, "# shared 项目来源验收甲号").expect("write");

        let path = unique_db_path();
        let database = Database::new(&path).expect("database");
        let root = dir.to_str().expect("utf8");
        database
            .upsert_library(sample_library(1, root, "folder"))
            .expect("folder source");
        database
            .upsert_library(sample_library(2, root, "agent_project"))
            .expect("Agent source at same root");

        let record = |library_id: i64, file_path: &std::path::Path| IndexedItemRecord {
            library_id,
            file_path: file_path.to_string_lossy().into_owned(),
            relative_path: "shared.md".to_string(),
            file_name: "shared.md".to_string(),
            file_ext: "md".to_string(),
            file_type: "markdown".to_string(),
            file_size: 1,
            modified_at: "1".to_string(),
            created_at: "now".to_string(),
            updated_at: "now".to_string(),
        };

        database
            .replace_items_for_library(1, &[record(1, &file_path)])
            .expect("folder scan");

        {
            let connection = database.connection().expect("connection");
            connection
                .execute(
                    "INSERT INTO item_sources (
                       item_id, library_id, link_kind, is_owner, created_at
                     ) VALUES (
                       (SELECT id FROM items WHERE file_path = ?1 AND is_deleted = 0),
                       2, 'discovered', 0, 'now'
                     )",
                    params![file_path.to_string_lossy().into_owned()],
                )
                .expect("Agent non-owner source");
        }

        let hit = |library_id: Option<i64>| {
            database
                .list_items(&ListItemsQuery {
                    library_id,
                    keyword: Some("项目来源验收甲号".to_string()),
                    ..ListItemsQuery::default()
                })
                .map(|page| page.total)
                .expect("search should work")
        };

        assert_eq!(hit(None), 1, "a shared item must dedupe in a global search");
        assert_eq!(hit(Some(1)), 1, "the owner source must see the shared item");
        assert_eq!(hit(Some(2)), 1, "the non-owner source must see the shared item");

        let _ = std::fs::remove_file(&file_path);
        let _ = std::fs::remove_dir(&dir);
        let _ = std::fs::remove_file(&path);
    }

    // ---- A1.1-PERF 合同：base64 缩略图迁移 ----

    fn insert_base64_thumbnail(
        connection: &Connection,
        item_id: i64,
        mime: &str,
        b64: &str,
    ) {
        connection
            .execute(
                "INSERT INTO thumbnail_cache (item_id, thumb_path, thumb_status)
                 VALUES (?1, ?2, 'ready')",
                params![item_id, format!("data:{mime};base64,{b64}")],
            )
            .expect("insert base64 thumbnail");
    }

    #[test]
    fn migrate_base64_thumbnails_converts_existing_cache_files_to_absolute_paths() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("db should initialize");
        database
            .upsert_library(sample_library(1, "/fixture/thumb-migrate", "folder"))
            .expect("library");
        database
            .replace_items_for_library(
                1,
                &[
                    sample_item(1, "/fixture/thumb-migrate/a.md"),
                    sample_item(1, "/fixture/thumb-migrate/b.md"),
                    sample_item(1, "/fixture/thumb-migrate/c.md"),
                ],
            )
            .expect("items");
        let connection = database.connection().expect("connection");

        // PNG：缓存文件存在 → 迁移为绝对路径
        let cache_dir = path
            .parent()
            .unwrap_or_else(|| std::path::Path::new("."))
            .join(".cache")
            .join("thumbnails");
        std::fs::create_dir_all(&cache_dir).expect("create cache dir");
        let cached_png = cache_dir.join("item-1.png");
        std::fs::write(&cached_png, b"fake-png").expect("write png cache");
        // SVG：缓存文件存在 → 迁移为绝对路径
        let cached_svg = cache_dir.join("item-2.svg");
        std::fs::write(&cached_svg, b"<svg/>").expect("write svg cache");
        // PNG：缓存文件缺失 → 清空路径并标 stale
        insert_base64_thumbnail(&connection, 1, "image/png", "AAAA");
        insert_base64_thumbnail(&connection, 2, "image/svg+xml", "BBBB");
        insert_base64_thumbnail(&connection, 3, "image/png", "CCCC");
        drop(connection);

        let migrated = Database::migrate_base64_thumbnails(
            &database.connection().expect("connection"),
            &path,
        )
        .expect("migration should run");
        assert_eq!(migrated, 3, "all three base64 rows must be processed");

        let connection = database.connection().expect("connection");
        let row = |item_id: i64| -> (String, String) {
            connection
                .query_row(
                    "SELECT thumb_path, thumb_status FROM thumbnail_cache WHERE item_id = ?1",
                    params![item_id],
                    |r| Ok((r.get(0)?, r.get(1)?)),
                )
                .expect("read thumbnail row")
        };
        let (png_path, png_status) = row(1);
        assert_eq!(
            png_path,
            cached_png.to_string_lossy(),
            "existing png cache must migrate to absolute file path"
        );
        assert_eq!(png_status, "ready");
        let (svg_path, svg_status) = row(2);
        assert_eq!(
            svg_path,
            cached_svg.to_string_lossy(),
            "existing svg cache must migrate to absolute file path"
        );
        assert_eq!(svg_status, "ready");
        let (missing_path, missing_status) = row(3);
        assert_eq!(missing_path, "", "missing cache file must clear path");
        assert_eq!(missing_status, "stale", "missing cache file must be marked stale");

        // 迁移后不得残留 data:image
        let remaining: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM thumbnail_cache WHERE thumb_path LIKE 'data:image/%'",
                [],
                |r| r.get(0),
            )
            .expect("count data uris");
        assert_eq!(remaining, 0, "no data:image thumb_path may remain after migration");

        // 有效缓存文件不得被删除
        assert!(cached_png.exists(), "valid png cache must survive migration");
        assert!(cached_svg.exists(), "valid svg cache must survive migration");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn migrate_base64_thumbnails_is_idempotent() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("db should initialize");
        database
            .upsert_library(sample_library(1, "/fixture/thumb-idempotent", "folder"))
            .expect("library");
        database
            .replace_items_for_library(1, &[sample_item(1, "/fixture/thumb-idempotent/a.md")])
            .expect("item");
        let connection = database.connection().expect("connection");
        insert_base64_thumbnail(&connection, 1, "image/png", "AAAA");
        drop(connection);

        let first = Database::migrate_base64_thumbnails(
            &database.connection().expect("connection"),
            &path,
        )
        .expect("first migration");
        let second = Database::migrate_base64_thumbnails(
            &database.connection().expect("connection"),
            &path,
        )
        .expect("second migration");
        assert_eq!(first, 1, "first run migrates the row");
        assert_eq!(second, 0, "second run must be a no-op (idempotent)");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn list_items_serializes_under_256kb_for_100_items() {
        let path = unique_db_path();
        let database = Database::new(&path).expect("db should initialize");
        database
            .upsert_library(sample_library(1, "/fixture/big-list", "folder"))
            .expect("library");
        let items: Vec<IndexedItemRecord> = (1..=100)
            .map(|id| {
                let mut item = sample_item(1, &format!("/fixture/big-list/doc-{id}.md"));
                item.file_name = format!("doc-{id}.md");
                item.relative_path = format!("doc-{id}.md");
                item.file_size = 1024 + id;
                item
            })
            .collect();
        database
            .replace_items_for_library(1, &items)
            .expect("insert 100 items");

        let page = database
            .list_items(&ListItemsQuery {
                page_size: Some(100),
                ..ListItemsQuery::default()
            })
            .expect("list items");
        let serialized = serde_json::to_string(&page).expect("serialize");
        println!(
            "[perf-contract] 100-item list_items JSON = {} bytes",
            serialized.len()
        );
        assert!(
            serialized.len() < 256 * 1024,
            "100-item list_items JSON must stay under 256KB, got {} bytes",
            serialized.len()
        );
        assert!(
            !serialized.contains("data:image/"),
            "list_items JSON must not contain base64 data URIs"
        );

        let _ = std::fs::remove_file(path);
    }
}
