use std::{
    collections::{HashMap, HashSet},
    fs,
    path::PathBuf,
    sync::{Arc, Mutex},
};

use notify::PollWatcher;

use crate::{
    core::scan_coordinator::ScanCoordinator,
    core::watcher::build_library_watcher,
    db::{
        repositories::{ItemRepository, LibraryRepository, TagRepository, ThumbnailRepository},
        Database,
    },
    errors::AppError,
    core::local_server::LocalContentServer,
    models::{
        CreateTagRequest, DeleteTagResponse, GenerateThumbnailResponse, IgnoredItemSummary,
        IndexedItemRecord, ItemDetail, ItemSummary, Library, ListItemsQuery, PagedResult,
        SetItemTagsResponse, SyncLibraryWatchersResponse, Tag, ThumbnailInfo, UpdateTagRequest,
        SyncFilesystemStateResponse,
    },
};

#[derive(Debug)]
pub struct AppState {
    pub database: Database,
    scan_coordinator: ScanCoordinator,
    local_content_server: LocalContentServer,
    watched_libraries: Mutex<HashSet<i64>>,
    active_watchers: Mutex<HashMap<i64, PollWatcher>>,
    html_edit_manifest_locks: Mutex<HashMap<i64, Arc<Mutex<()>>>>,
    html_edit_path_locks: Mutex<HashMap<PathBuf, Arc<Mutex<()>>>>,
    html_edit_session_leases: Mutex<HtmlEditSessionLeases>,
    cover_asset_leases: Mutex<CoverAssetLeases>,
    pub active_html_edit_item: Mutex<Option<i64>>,
    thumbnail_settings_path: PathBuf,
    update_settings_path: PathBuf,
    update_download_in_progress: Mutex<bool>,
    system_chrome_thumbnails_enabled: Mutex<bool>,
}

impl AppState {
    pub fn new(database: Database, app_data_dir: PathBuf) -> Self {
        // B1：启动路径按磁盘真实状态重放 reconciliation marker（目录不存在时为廉价 no-op）。
        if let Err(error) = database.replay_reconciliation_markers() {
            eprintln!("Nutbook startup reconciliation replay failed: {error}");
        }

        #[cfg(test)]
        let local_content_server = LocalContentServer::testing();

        #[cfg(not(test))]
        let local_content_server =
            LocalContentServer::shared().expect("failed to start local content server");

        let thumbnail_settings_path = app_data_dir.join("thumbnail-settings.json");
        let update_settings_path = app_data_dir.join("update-settings.json");
        let system_chrome_enabled = fs::read_to_string(&thumbnail_settings_path)
            .map(|value| value.trim() == "1")
            .unwrap_or(false);

        if system_chrome_enabled {
            std::env::set_var("NUTBOOK_ALLOW_SYSTEM_CHROME_THUMBNAILS", "1");
        } else {
            std::env::remove_var("NUTBOOK_ALLOW_SYSTEM_CHROME_THUMBNAILS");
        }

        Self {
            scan_coordinator: ScanCoordinator::new(database.clone()),
            database,
            local_content_server,
            watched_libraries: Mutex::new(HashSet::new()),
            active_watchers: Mutex::new(HashMap::new()),
            html_edit_manifest_locks: Mutex::new(HashMap::new()),
            html_edit_path_locks: Mutex::new(HashMap::new()),
            html_edit_session_leases: Mutex::new(HtmlEditSessionLeases::default()),
            cover_asset_leases: Mutex::new(CoverAssetLeases::default()),
            active_html_edit_item: Mutex::new(None),
            thumbnail_settings_path,
            update_settings_path,
            update_download_in_progress: Mutex::new(false),
            system_chrome_thumbnails_enabled: Mutex::new(system_chrome_enabled),
        }
    }

    pub fn local_server_origin(&self) -> String {
        self.local_content_server.origin().to_string()
    }

    pub fn local_server_file_url(&self, path: &std::path::Path) -> String {
        self.local_content_server.file_url(path)
    }

    pub fn system_chrome_thumbnails_enabled(&self) -> bool {
        self.system_chrome_thumbnails_enabled
            .lock()
            .map(|value| *value)
            .unwrap_or(false)
    }

    pub fn begin_update_download(&self) -> Result<(), AppError> {
        let mut in_progress = self
            .update_download_in_progress
            .lock()
            .map_err(|_| AppError::InternalError)?;
        if *in_progress {
            return Err(AppError::UpdateFailed(
                "an update download is already in progress".to_string(),
            ));
        }
        *in_progress = true;
        Ok(())
    }

    pub fn finish_update_download(&self) {
        if let Ok(mut in_progress) = self.update_download_in_progress.lock() {
            *in_progress = false;
        }
    }

    pub fn set_system_chrome_thumbnails_enabled(&self, enabled: bool) -> Result<(), AppError> {
        {
            let mut value = self
                .system_chrome_thumbnails_enabled
                .lock()
                .map_err(|_| AppError::InternalError)?;
            *value = enabled;
        }

        fs::write(&self.thumbnail_settings_path, if enabled { "1" } else { "0" })
            .map_err(|_| AppError::IoError)?;

        if enabled {
            std::env::set_var("NUTBOOK_ALLOW_SYSTEM_CHROME_THUMBNAILS", "1");
        } else {
            std::env::remove_var("NUTBOOK_ALLOW_SYSTEM_CHROME_THUMBNAILS");
        }

        Ok(())
    }

    pub fn scan_coordinator(&self) -> &ScanCoordinator {
        &self.scan_coordinator
    }

    pub fn update_settings(&self) -> Result<crate::models::UpdateSettings, AppError> {
        crate::core::update::load_update_settings(&self.update_settings_path)
    }

    pub fn save_update_settings(
        &self,
        settings: &crate::models::UpdateSettings,
    ) -> Result<(), AppError> {
        crate::core::update::save_update_settings(&self.update_settings_path, settings)
    }

    pub fn set_auto_check_updates_enabled(
        &self,
        enabled: bool,
    ) -> Result<crate::models::UpdateSettings, AppError> {
        let mut settings = self.update_settings()?;
        settings.auto_check_enabled = enabled;
        self.save_update_settings(&settings)?;
        Ok(settings)
    }

    pub fn watch_library(
        &self,
        library_id: i64,
        watcher: PollWatcher,
    ) -> Result<bool, AppError> {
        let libraries = self.list_libraries()?;
        if libraries.iter().all(|library| library.id != library_id) {
            return Err(AppError::LibraryNotFound);
        }

        let mut watched = self
            .watched_libraries
            .lock()
            .map_err(|_| AppError::InternalError)?;
        let inserted = watched.insert(library_id);
        if inserted {
            self.active_watchers
                .lock()
                .map_err(|_| AppError::InternalError)?
                .insert(library_id, watcher);
        }
        Ok(true)
    }

    pub fn unwatch_library(&self, library_id: i64) -> Result<bool, AppError> {
        self.watched_libraries.lock().map_err(|_| AppError::InternalError)?.remove(&library_id);
        Ok(self.active_watchers.lock().map_err(|_| AppError::InternalError)?.remove(&library_id).is_some())
    }

    /// 把所有 path_state=valid 且 source_kind 为 folder/file 的资料库纳入监听：
    /// - 为缺失的 watcher 启动监听（幂等）；
    /// - 清理已删除/变 missing/agent_project 的 watcher；
    /// - 对所有有效 folder/file 来源合并进 catch-up pending（同一 root 只做
    ///   一次启动 catch-up，重复调用不重扫已完成来源），worker 持续 drain。
    pub fn sync_library_watchers(&self) -> Result<SyncLibraryWatchersResponse, AppError> {
        let libraries = self.list_libraries()?;
        let expected: Vec<Library> = libraries
            .into_iter()
            .filter(|library| {
                library.path_state == "valid"
                    && (library.source_kind == "folder" || library.source_kind == "file")
            })
            .collect();
        let expected_ids: HashSet<i64> = expected.iter().map(|library| library.id).collect();

        let mut started = 0_u64;
        let mut stopped = 0_u64;
        let mut already = 0_u64;

        // 1) 停止不再期望的 watcher（删除、路径失效、agent_project）。
        let watched_ids: Vec<i64> = {
            let watched = self
                .watched_libraries
                .lock()
                .map_err(|_| AppError::InternalError)?;
            watched.iter().copied().collect()
        };
        for library_id in watched_ids {
            if !expected_ids.contains(&library_id) && self.unwatch_library(library_id)? {
                stopped += 1;
            }
        }

        // 2) 为每个有效 folder/file 启动 watcher（单个失败不阻断其他来源）。
        for library in &expected {
            if self.is_library_watched(library.id) {
                already += 1;
                continue;
            }
            match build_library_watcher(self.scan_coordinator.clone(), library.clone()) {
                Ok(watcher) => {
                    if self.watch_library(library.id, watcher)? {
                        started += 1;
                    }
                }
                Err(error) => {
                    eprintln!(
                        "Nutbook watcher start failed for library {} ({}): {error}",
                        library.id, library.root_path
                    );
                }
            }
        }

        // 3) 合并 catch-up 请求（worker 持续 drain；正在运行时新增来源不会丢；
        //    同一 root 只做一次启动 catch-up）。
        let sources = expected
            .iter()
            .map(|library| (library.id, library.root_path.clone()))
            .collect::<Vec<_>>();
        self.scan_coordinator.request_catch_up(&sources);

        Ok(SyncLibraryWatchersResponse {
            started,
            stopped,
            already,
        })
    }

    pub fn is_library_watched(&self, library_id: i64) -> bool {
        self.watched_libraries
            .lock()
            .map(|watched| watched.contains(&library_id))
            .unwrap_or(false)
    }

    pub fn sync_filesystem_state(&self) -> Result<SyncFilesystemStateResponse, AppError> {
        self.database.sync_filesystem_state()
    }

    pub fn html_edit_manifest_lock(&self, library_id: i64) -> Result<Arc<Mutex<()>>, AppError> {
        let mut locks = self
            .html_edit_manifest_locks
            .lock()
            .map_err(|_| AppError::InternalError)?;
        Ok(locks
            .entry(library_id)
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone())
    }

    /// Serializes commits by canonical file path, including the case where the
    /// same file has been indexed by two libraries. The hash check remains
    /// authoritative for other processes and external applications.
    pub fn html_edit_path_lock(&self, path: &std::path::Path) -> Result<Arc<Mutex<()>>, AppError> {
        let canonical = path.canonicalize().map_err(|_| AppError::IoError)?;
        let mut locks = self
            .html_edit_path_locks
            .lock()
            .map_err(|_| AppError::InternalError)?;
        Ok(locks
            .entry(canonical)
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone())
    }

    /// Replacing a lease is atomic per item.  A return value is intentionally
    /// not exposed: a session is valid only if it exactly matches the current
    /// item lease at the point an operation begins.
    pub fn register_html_edit_session_lease(
        &self,
        item_id: i64,
        runtime_session_id: String,
        generation: u64,
    ) -> Result<(), AppError> {
        if runtime_session_id.is_empty() {
            return Err(AppError::InvalidParams);
        }
        self.html_edit_session_leases
            .lock()
            .map_err(|_| AppError::InternalError)?
            .register(item_id, runtime_session_id, generation);
        *self.active_html_edit_item.lock().map_err(|_| AppError::InternalError)? = Some(item_id);
        Ok(())
    }

    pub fn html_edit_session_lease_matches(
        &self,
        item_id: i64,
        runtime_session_id: &str,
        generation: u64,
    ) -> Result<bool, AppError> {
        Ok(self.html_edit_session_leases
            .lock()
            .map_err(|_| AppError::InternalError)?
            .matches(item_id, runtime_session_id, generation))
    }

    /// The provisional identity is generated once when the session lease is
    /// registered. It remains stable for that exact lease, but is never
    /// persisted until a patch save creates the manifest entry.
    pub fn html_edit_session_provisional_identity(
        &self,
        item_id: i64,
        runtime_session_id: &str,
        generation: u64,
    ) -> Result<Option<String>, AppError> {
        Ok(self.html_edit_session_leases
            .lock()
            .map_err(|_| AppError::InternalError)?
            .provisional_identity(item_id, runtime_session_id, generation))
    }

    /// Invalidate only the exact lease so an old exit cannot erase a newer
    /// session for the same item.
    pub fn invalidate_html_edit_session_lease(
        &self,
        item_id: i64,
        runtime_session_id: &str,
        generation: u64,
    ) -> Result<bool, AppError> {
        let invalidated = self.html_edit_session_leases
            .lock()
            .map_err(|_| AppError::InternalError)?
            .invalidate(item_id, runtime_session_id, generation);
        if invalidated {
            let mut active = self.active_html_edit_item.lock().map_err(|_| AppError::InternalError)?;
            if *active == Some(item_id) { *active = None; }
        }
        Ok(invalidated)
    }

    // ---- PR C / C2：Markdown 封面 staged asset lease ----

    pub fn register_cover_asset_lease(&self, lease: CoverAssetLease) -> Result<(), AppError> {
        self.cover_asset_leases
            .lock()
            .map_err(|_| AppError::InternalError)?
            .register(lease);
        Ok(())
    }

    pub fn cover_asset_lease_matches(
        &self,
        item_id: i64,
        tab_id: &str,
        operation_generation: u64,
        staged_asset_id: &str,
    ) -> Result<bool, AppError> {
        Ok(self.cover_asset_leases
            .lock()
            .map_err(|_| AppError::InternalError)?
            .matches(item_id, tab_id, operation_generation, staged_asset_id))
    }

    /// 释放该 (item, tab) 名下 `generation <= operation_generation` 的 staged lease；
    /// 引用安全（当前 draft 与磁盘 baseline 均未引用）的 staged 文件物理删除，
    /// 被引用的只释放登记。使用“截至 generation”而不是只释放恰好一代，确保同一
    /// 编辑器连续选择多张封面后，保存/关闭能收口此前所有 lease；复制晚到释放旧代
    /// 时仍不会触碰更新 generation 的任务。
    pub fn release_cover_asset_leases(
        &self,
        item_id: i64,
        tab_id: &str,
        operation_generation: u64,
        draft_image_srcs: &[String],
        baseline_image_srcs: &[String],
    ) -> Result<Vec<String>, AppError> {
        Ok(self.cover_asset_leases
            .lock()
            .map_err(|_| AppError::InternalError)?
            .release_group(
                item_id,
                tab_id,
                operation_generation,
                draft_image_srcs,
                baseline_image_srcs,
            ))
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HtmlEditSessionLease {
    pub runtime_session_id: String,
    pub generation: u64,
    pub provisional_artifact_edit_id: String,
}

#[derive(Debug, Default)]
pub struct HtmlEditSessionLeases {
    by_item: HashMap<i64, HtmlEditSessionLease>,
}

impl HtmlEditSessionLeases {
    pub fn register(&mut self, item_id: i64, runtime_session_id: String, generation: u64) {
        self.by_item.insert(item_id, HtmlEditSessionLease {
            runtime_session_id,
            generation,
            provisional_artifact_edit_id: crate::core::html_edit::new_artifact_edit_id(),
        });
    }

    pub fn matches(&self, item_id: i64, runtime_session_id: &str, generation: u64) -> bool {
        self.by_item.get(&item_id)
            .is_some_and(|lease| lease.runtime_session_id == runtime_session_id && lease.generation == generation)
    }

    pub fn invalidate(&mut self, item_id: i64, runtime_session_id: &str, generation: u64) -> bool {
        if !self.matches(item_id, runtime_session_id, generation) { return false; }
        self.by_item.remove(&item_id);
        true
    }

    pub fn provisional_identity(&self, item_id: i64, runtime_session_id: &str, generation: u64) -> Option<String> {
        self.by_item.get(&item_id)
            .filter(|lease| lease.runtime_session_id == runtime_session_id && lease.generation == generation)
            .map(|lease| lease.provisional_artifact_edit_id.clone())
    }
}

// ------------------------------------------------------------------
// PR C / C2：Markdown 封面 staged asset lease
//
// 每次「+ → 封面图」复制本地资源到 assets/ 时注册一条 lease，绑定：
//   item_id / Markdown canonical path / tab（editor instance）/ operation
//   generation / staged asset id（uuid）与 staged 相对 src。
//
// 覆盖场景（拒绝把晚到/失效请求写入错误文档）：
// - picker/copy 晚到：返回时校验 active tab + operation generation；
// - 切换标签或关闭标签：按 tab/generation 释放 lease；
// - A→B 身份转移 / 撤销 / 重做：不物理删除（图片仍是正文资源）；
// - 保存失败或冲突后继续编辑：lease 保持；
// - 放弃与关闭：仅清理"本会话新建、磁盘 baseline 未引用、当前 draft 未引用"
//   的 staged 文件（引用检查在 release 命令侧完成，lease 只登记所有权）。
// 严禁删除已提交旧封面、正文仍引用的图片、shared asset。
// ------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CoverAssetLease {
    pub item_id: i64,
    pub markdown_canonical_path: String,
    pub tab_id: String,
    pub operation_generation: u64,
    pub staged_asset_id: String,
    /// staged 复制文件绝对路径。
    pub staged_path: PathBuf,
    /// 写入 Markdown 的相对 src（./assets/xxx.png）。
    pub relative_src: String,
    pub created_at: String,
}

#[derive(Debug, Default)]
pub struct CoverAssetLeases {
    by_staged_id: HashMap<String, CoverAssetLease>,
}

impl CoverAssetLeases {
    pub fn register(&mut self, lease: CoverAssetLease) {
        self.by_staged_id.insert(lease.staged_asset_id.clone(), lease);
    }

    /// 校验 staged 归属（item + tab + generation + staged id 全部匹配）。
    pub fn matches(
        &self,
        item_id: i64,
        tab_id: &str,
        operation_generation: u64,
        staged_asset_id: &str,
    ) -> bool {
        self.by_staged_id.get(staged_asset_id).is_some_and(|lease| {
            lease.item_id == item_id
                && lease.tab_id == tab_id
                && lease.operation_generation == operation_generation
        })
    }

    /// 取出该 (item, tab) 名下截至 operation_generation 的全部 lease。
    pub fn take_through_generation(
        &mut self,
        item_id: i64,
        tab_id: &str,
        operation_generation: u64,
    ) -> Vec<CoverAssetLease> {
        let matching: Vec<String> = self
            .by_staged_id
            .iter()
            .filter(|(_, lease)| {
                lease.item_id == item_id
                    && lease.tab_id == tab_id
                    && lease.operation_generation <= operation_generation
            })
            .map(|(id, _)| id.clone())
            .collect();
        let mut leases = Vec::new();
        for id in matching {
            if let Some(lease) = self.by_staged_id.remove(&id) {
                leases.push(lease);
            }
        }
        leases
    }

    /// 释放并物理删除 staged 文件（仅在满足引用安全条件后由 release 命令调用）。
    /// 返回已清理的相对 src 列表。
    pub fn release_group(
        &mut self,
        item_id: i64,
        tab_id: &str,
        operation_generation: u64,
        draft_image_srcs: &[String],
        baseline_image_srcs: &[String],
    ) -> Vec<String> {
        let leases = self.take_through_generation(item_id, tab_id, operation_generation);
        let mut cleaned = Vec::new();
        for lease in leases {
            // 引用安全：除了原始字符串相等，还按文档目录解析 canonical 路径。
            // `./assets/a.png` 与 `assets/a.png` 指向同一文件，不能因 Markdown
            // 序列化形式变化而误删正文仍引用的 staged/shared 资源。
            if draft_image_srcs
                .iter()
                .any(|src| cover_reference_matches_lease(src, &lease))
                || baseline_image_srcs
                    .iter()
                    .any(|src| cover_reference_matches_lease(src, &lease))
            {
                // 被引用：lease 释放但文件保留（可能是刚提交的封面）。
                continue;
            }
            match std::fs::remove_file(&lease.staged_path) {
                Ok(()) => cleaned.push(lease.relative_src),
                Err(_) => {}
            }
        }
        cleaned
    }
}

fn cover_reference_matches_lease(src: &str, lease: &CoverAssetLease) -> bool {
    if src == lease.relative_src {
        return true;
    }
    let Some(markdown_dir) = PathBuf::from(&lease.markdown_canonical_path)
        .parent()
        .map(std::path::Path::to_path_buf)
    else {
        return false;
    };
    let Some(resolved) = crate::core::thumbnail::resolve_cover_asset_path(src, &markdown_dir) else {
        return false;
    };
    match (resolved.canonicalize(), lease.staged_path.canonicalize()) {
        (Ok(reference), Ok(staged)) => reference == staged,
        _ => resolved == lease.staged_path,
    }
}

impl LibraryRepository for AppState {
    fn list_libraries(&self) -> Result<Vec<Library>, AppError> {
        self.database.list_libraries()
    }

    fn upsert_library(&self, library: Library) -> Result<Library, AppError> {
        self.database.upsert_library(library)
    }

    fn update_library(&self, library: Library) -> Result<Library, AppError> {
        self.database.update_library(library)
    }

    fn next_library_id(&self) -> Result<i64, AppError> {
        self.database.next_library_id()
    }

    fn delete_library(&self, library_id: i64) -> Result<bool, AppError> {
        // 与同 library 的在跑 scan / watcher 串行（per-library 锁），并持全局
        // DB 写锁（与其他 library 的 scan/delete 互斥）：删除期间不允许任何
        // 后台扫描继续写库。
        let library_lock = self.scan_coordinator.library_lock(library_id);
        let _guard = library_lock.lock().map_err(|_| AppError::InternalError)?;
        let db_write_lock = self.scan_coordinator.db_write_lock();
        let _db = db_write_lock.lock().map_err(|_| AppError::InternalError)?;

        let deleted = self.database.delete_library(library_id)?;
        if deleted {
            // 删除成功后，watcher cleanup 只能是 best-effort：unwatch/cancel
            // 失败仅记录 warning，绝不把已成功的数据库删除变成失败。
            if self.unwatch_library(library_id).is_err() {
                eprintln!("Nutbook watcher cleanup failed for deleted library {library_id}");
            }
            self.scan_coordinator.cancel_catch_up(library_id);
        }
        // 删除失败（false 或 Err）：watcher 保持不动，仍存在的 library 不会
        // 永久失去监听。
        Ok(deleted)
    }
}

impl ItemRepository for AppState {
    fn replace_items_for_library(
        &self,
        library_id: i64,
        items: &[IndexedItemRecord],
    ) -> Result<(u64, u64, u64), AppError> {
        self.database.replace_items_for_library(library_id, items)
    }

    fn list_items(&self, query: &ListItemsQuery) -> Result<PagedResult<ItemSummary>, AppError> {
        self.database.list_items(query)
    }

    fn get_item_detail(&self, item_id: i64) -> Result<ItemDetail, AppError> {
        self.database.get_item_detail(item_id)
    }

    fn set_item_favorite(&self, item_id: i64, is_favorite: bool) -> Result<(), AppError> {
        self.database.set_item_favorite(item_id, is_favorite)
    }

    fn mark_item_opened(&self, item_id: i64, opened_at: &str) -> Result<(), AppError> {
        self.database.mark_item_opened(item_id, opened_at)
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
        self.database.update_markdown_item_content(
            item_id,
            summary,
            modified_at,
            file_hash,
            source_text,
            raw_text,
            rendered_cache,
        )
    }

    fn update_item_revision_and_invalidate(
        &self,
        item_id: i64,
        canonical_path: &str,
        source_hash: &str,
        modified_at: &str,
        file_size: i64,
    ) -> Result<(), AppError> {
        self.database.update_item_revision_and_invalidate_impl(
            item_id,
            canonical_path,
            source_hash,
            modified_at,
            file_size,
        )
    }

    fn list_ignored_items(&self) -> Result<Vec<IgnoredItemSummary>, AppError> {
        self.database.list_ignored_items()
    }

    fn restore_ignored_item(&self, item_id: i64) -> Result<(), AppError> {
        self.database.restore_ignored_item(item_id)
    }

    fn remove_item_from_nutbook(&self, item_id: i64, now: &str) -> Result<(), AppError> {
        self.database.remove_item_from_nutbook(item_id, now)
    }

    fn move_item_to_trash(&self, item_id: i64, now: &str) -> Result<(), AppError> {
        self.database.move_item_to_trash(item_id, now)
    }
}

impl TagRepository for AppState {
    fn list_tags(&self) -> Result<Vec<Tag>, AppError> {
        self.database.list_tags()
    }

    fn create_tag(&self, payload: &CreateTagRequest) -> Result<Tag, AppError> {
        self.database.create_tag(payload)
    }

    fn update_tag(&self, payload: &UpdateTagRequest) -> Result<Tag, AppError> {
        self.database.update_tag(payload)
    }

    fn delete_tag(&self, tag_id: i64) -> Result<DeleteTagResponse, AppError> {
        self.database.delete_tag(tag_id)
    }

    fn set_item_tags(&self, item_id: i64, tag_ids: &[i64]) -> Result<SetItemTagsResponse, AppError> {
        self.database.set_item_tags(item_id, tag_ids)
    }
}

impl ThumbnailRepository for AppState {
    fn generate_thumbnail(&self, item_id: i64) -> Result<GenerateThumbnailResponse, AppError> {
        self.database.generate_thumbnail(item_id)
    }

    fn get_thumbnail_info(&self, item_id: i64) -> Result<Option<ThumbnailInfo>, AppError> {
        self.database.get_thumbnail_info(item_id)
    }
}
