use std::{
    collections::{HashMap, HashSet},
    fs,
    path::PathBuf,
    sync::{
        Arc, Mutex,
    },
};

use notify::RecommendedWatcher;

use crate::{
    core::{
        scan_coordinator::ScanCoordinator,
        watcher::build_library_watcher,
        content_session::ContentSessionRegistry,
        scoped_content_server::ScopedContentServer,
    },
    db::{
        repositories::{ItemRepository, LibraryRepository, TagRepository, ThumbnailRepository},
        Database,
    },
    errors::AppError,
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
    /// PR C Phase 1（D1=A）：每 session 独立 scoped 内容服务器注册表。
    /// key 约定：`preview:{item_id}` / `html-runtime:{item_id}:{surface}` /
    /// `html-edit:{item_id}` / `external:{session_id}`。
    scoped_servers: Mutex<HashMap<String, Arc<ScopedContentServer>>>,
    /// PR C Phase 1（R9/R11）：内容面 webview 会话登记表 —— 宿主创建内容
    /// webview 时登记 {role, item, origin, session, generation}；内容面命令
    /// 与标题桥一律先查登记，导航离开注册 origin 即失效。
    pub content_sessions: ContentSessionRegistry,
    /// PR C Phase 1：缩略图缓存资源服务器（root = app_data_dir/.cache/thumbnails）。
    /// main 可信面展示缩略图的唯一本地来源；root 只含缩略图缓存文件。
    cache_resource_server: Option<Arc<ScopedContentServer>>,
    watched_libraries: Mutex<HashSet<i64>>,
    active_watchers: Mutex<HashMap<i64, RecommendedWatcher>>,
    html_edit_manifest_locks: Mutex<HashMap<i64, Arc<Mutex<()>>>>,
    html_edit_path_locks: Mutex<HashMap<PathBuf, Arc<Mutex<()>>>>,
    html_edit_session_leases: Mutex<HtmlEditSessionLeases>,
    cover_asset_leases: Mutex<CoverAssetLeases>,
    pub active_html_edit_item: Mutex<Option<i64>>,
    thumbnail_settings_path: PathBuf,
    update_settings_path: PathBuf,
    update_download_in_progress: Mutex<bool>,
    system_chrome_thumbnails_enabled: Mutex<bool>,
    // PR B：外部文件会话注册表与应用数据目录；inbox 为进程级全局单例
    //（见 core::external_open::global_inbox），不随 AppState 生命周期。
    pub external_sessions: crate::core::external_open::ExternalSessionRegistry,
    pub app_data_dir: PathBuf,
}

impl AppState {
    pub fn new(database: Database, app_data_dir: PathBuf) -> Self {
        // B1：启动路径按磁盘真实状态重放 reconciliation marker（目录不存在时为廉价 no-op）。
        if let Err(error) = database.replay_reconciliation_markers() {
            eprintln!("Nutbook startup reconciliation replay failed: {error}");
        }

        // PR C Phase 1（D1=A）：旧共享 LocalContentServer（`/fs` 任意绝对
        // 路径读取面）不再随 AppState 启动 —— 运行时下线，HTML 不可达。
        // 类型保留供 pr_c_baseline_boundary_characterization.rs 做历史
        // 行为特征化。

        let thumbnail_settings_path = app_data_dir.join("thumbnail-settings.json");
        let update_settings_path = app_data_dir.join("update-settings.json");

        // R11-a（Codex 第二轮返修）：跨启动端口隔离。在任何 scoped 服务器
        // 启动之前：设置登记表路径并加载历史身份 → 把登记的上一进程端口
        // 占为墓碑应答服务（可选、单线程有界）。身份裁决由 start 的禁止
        // 集合完成，与墓碑成败无关（R11-a 第三轮）；init 失败 fail closed
        // —— 应用继续启动，但一切 scoped 内容会话拒绝启动。
        let used_ports_path = app_data_dir.join(
            crate::core::scoped_content_server::USED_PORTS_FILE_NAME,
        );
        if let Err(error) =
            crate::core::scoped_content_server::init_used_port_registry(used_ports_path)
        {
            eprintln!("Nutbook scoped port registry init failed: {error}; HTML scoped sessions will refuse to start (fail closed)");
        }
        let entombed = crate::core::scoped_content_server::entomb_registered_ports();
        if entombed > 0 {
            eprintln!("Nutbook entombed {entombed} stale scoped port(s) from previous launches");
        }

        // PR C Phase 1：缩略图缓存资源服务器（root = app_data_dir/.cache/thumbnails）。
        let cache_root = app_data_dir.join(".cache").join("thumbnails");
        let cache_resource_server = match fs::create_dir_all(&cache_root)
            .ok()
            .and_then(|_| ScopedContentServer::start(&cache_root).ok())
        {
            Some(server) => Some(Arc::new(server)),
            None => {
                eprintln!("Nutbook cache resource server unavailable: thumbnails fall back to no local URL");
                None
            }
        };
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
            scoped_servers: Mutex::new(HashMap::new()),
            content_sessions: ContentSessionRegistry::default(),
            cache_resource_server,
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
            external_sessions: crate::core::external_open::ExternalSessionRegistry::default(),
            app_data_dir,
        }
    }

    /// PR C Phase 1：缩略图缓存资源 URL 前缀（R11-a 后即 origin 本身）与
    /// canonical root。未启用时返回空。
    pub fn cache_resource_info(&self) -> (String, String) {
        match &self.cache_resource_server {
            Some(server) => (
                server.resource_base(),
                server.canonical_root().to_string_lossy().to_string(),
            ),
            None => (String::new(), String::new()),
        }
    }

    /// 缩略图缓存路径 → scoped URL。不在 cache root 内或未启用时返回空。
    pub fn cache_resource_url(&self, path: &str) -> String {
        let Some(server) = &self.cache_resource_server else {
            return String::new();
        };
        let Ok(canonical) = std::path::Path::new(path).canonicalize() else {
            return String::new();
        };
        let Ok(relative) = canonical.strip_prefix(server.canonical_root()) else {
            return String::new();
        };
        server.relative_url(relative).unwrap_or_default()
    }

    // ---- PR C Phase 1（D1=A）：scoped resource origin ----
    //
    // 安全边界落在「端口 = 授权 root」绑定上：每个内容会话独立 loopback
    // origin，origin 根直接映射授权 root（folder 资料库 root 或单文件直接
    // 父目录）。旧 `/fs` 绝对路径路由在 Phase 1 收口后不复存在。

    /// 获取（或创建）指定 session 的 scoped 内容服务器。同 key 同 root 复用；
    /// root 漂移（来源被移动/替换）时重建。
    pub fn scoped_server(
        &self,
        session_key: &str,
        root: &std::path::Path,
    ) -> Result<Arc<ScopedContentServer>, AppError> {
        let canonical_root = root.canonicalize().map_err(|_| AppError::IoError)?;
        let mut servers = self
            .scoped_servers
            .lock()
            .map_err(|_| AppError::InternalError)?;
        if let Some(existing) = servers.get(session_key) {
            if existing.canonical_root() == canonical_root.as_path() {
                return Ok(Arc::clone(existing));
            }
            // root 漂移：Drop 旧实例（关闭旧端口），下方重建。
            servers.remove(session_key);
        }
        let server = Arc::new(ScopedContentServer::start(&canonical_root)?);
        servers.insert(session_key.to_string(), Arc::clone(&server));
        Ok(server)
    }

    /// 关闭并移除 session 的 scoped 服务器。生命周期钩子：close 标签 /
    /// 替换 session / promotion teardown / 来源失效。
    pub fn drop_scoped_server(&self, session_key: &str) -> bool {
        self.scoped_servers
            .lock()
            .map(|mut servers| servers.remove(session_key).is_some())
            .unwrap_or(false)
    }

    /// R11：来源失效（item 删除 / 资料库移除）时批量撤销该 item 的全部
    /// scoped 内容能力（服务器 + 会话登记）。已实现入口：item 删除命令。
    /// promotion teardown / external session close 属 Phase 2 接线，随
    /// 对应 hook 落地（handoff 已声明阶段状态）。
    pub fn revoke_content_capabilities_for_item(&self, item_id: i64) {
        let stale: Vec<String> = self
            .scoped_servers
            .lock()
            .map(|servers| {
                servers
                    .keys()
                    .filter(|key| scoped_key_belongs_to_item(key, item_id))
                    .cloned()
                    .collect()
            })
            .unwrap_or_default();
        for key in stale {
            self.drop_scoped_server(&key);
        }
        self.content_sessions.unregister_item(item_id);
    }

    /// item 的授权 root（Codex 合同：相对资源合法性按单文件直接父目录或
    /// folder root 判定）。folder 来源 → library root；file 来源 → 直接父目录。
    pub fn authorization_root_for_item(&self, item: &ItemDetail) -> Result<PathBuf, AppError> {
        let library = self
            .list_libraries()?
            .into_iter()
            .find(|library| library.id == item.summary.library_id)
            .ok_or(AppError::LibraryNotFound)?;
        let root = PathBuf::from(&library.root_path);
        if library.source_kind == "file" {
            return root
                .parent()
                .map(PathBuf::from)
                .ok_or(AppError::InvalidParams);
        }
        Ok(root)
    }

    /// 为 item 的授权 root 生成 scoped 会话内 URL。session key 由调用方按
    /// 入口约定传入；path 必须落在授权 root 内，越界引用返回错误（调用方
    /// 不得回退到其他来源）。
    pub fn scoped_file_url_for_item(
        &self,
        session_key: &str,
        item: &ItemDetail,
        path: &std::path::Path,
    ) -> Result<String, AppError> {
        let root = self.authorization_root_for_item(item)?;
        self.scoped_file_url_in_root(session_key, &root, path)
    }

    /// P2：外部临时会话的 scoped URL。授权 root = 单文件**直接父目录**
    /// （计划 §6.3 与单文件 item 同一规则），root 由后端从会话登记的 raw_path
    /// 推导 —— 内容页面上报的路径不参与判定。
    pub fn scoped_file_url_for_external(
        &self,
        session_key: &str,
        path: &std::path::Path,
    ) -> Result<String, AppError> {
        let root = path.parent().ok_or(AppError::InvalidParams)?;
        self.scoped_file_url_in_root(session_key, root, path)
    }

    fn scoped_file_url_in_root(
        &self,
        session_key: &str,
        root: &std::path::Path,
        path: &std::path::Path,
    ) -> Result<String, AppError> {
        let server = self.scoped_server(session_key, root)?;
        let canonical_root = root.canonicalize().map_err(|_| AppError::IoError)?;
        let canonical_path = path.canonicalize().map_err(|_| AppError::IoError)?;
        let relative = canonical_path
            .strip_prefix(&canonical_root)
            .map_err(|_| AppError::InvalidParams)?;
        server
            .relative_url(relative)
            .ok_or(AppError::InvalidParams)
    }

    /// P2：外部临时会话关闭 / 取消时撤销其全部 scoped 内容能力（服务器 +
    /// 会话登记）。与 `revoke_content_capabilities_for_item` 同语义，按外部
    /// session id 分域，不误伤同号 item。
    pub fn revoke_external_content_capabilities(&self, session_id: &str) {
        let stale: Vec<String> = self
            .scoped_servers
            .lock()
            .map(|servers| {
                servers
                    .keys()
                    .filter(|key| scoped_key_belongs_to_external(key, session_id))
                    .cloned()
                    .collect()
            })
            .unwrap_or_default();
        for key in stale {
            self.drop_scoped_server(&key);
        }
        self.content_sessions.unregister_external(session_id);
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
        watcher: RecommendedWatcher,
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

        // 3) waiting_sync 恢复（Codex review 静态缺口消费者）：watcher 激活
        //    失败进入等待同步的来源，本轮成功挂上 watcher 后清除状态。
        if let Ok(sync_states) = self.database.list_library_sync_states() {
            for (library_id, sync_state) in sync_states {
                if sync_state == "waiting_sync" && self.is_library_watched(library_id) {
                    if let Err(error) = self.database.set_library_sync_state(library_id, "ok") {
                        eprintln!("Nutbook waiting_sync clear failed for library {library_id}: {error}");
                    }
                }
            }
        }

        // 4) 合并 catch-up 请求（worker 持续 drain；正在运行时新增来源不会丢；
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
            // fence bump 让晚到的旧 watcher 批次（含 in-flight delta）失效。
            self.scan_coordinator.bump_generation(library_id);
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
    fn load_search_snippets_batch(
        &self,
        connection: &rusqlite::Connection,
        item_ids: &[i64],
        keyword: &str,
    ) -> Result<std::collections::HashMap<i64, Vec<String>>, AppError> {
        self.database.load_search_snippets_batch(connection, item_ids, keyword)
    }

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

/// R11-b：scoped session key 归属判定的纯函数 seam（`revoke_content_capabilities_for_item`
/// 使用）。key 形态：
/// - `preview:{item_id}` / `html-edit:{item_id}`：完整 key 精确相等；
/// - `html-runtime:{item_id}:{surface}`（host/player/presentation）：带尾分隔符
///   的前缀匹配。
///
/// 旧实现把 `preview:{id}` 也当前缀 —— 撤销 item 1 会误伤 `preview:10` /
/// `preview:100` / `html-edit:10` 的存活资源能力。此处 `1` 不得匹配 `10`/`100`。
fn scoped_key_belongs_to_item(key: &str, item_id: i64) -> bool {
    if key == format!("preview:{item_id}") || key == format!("html-edit:{item_id}") {
        return true;
    }
    key.starts_with(&format!("html-runtime:{item_id}:"))
}

/// P2：外部临时会话的 scoped key 归属判定。key 形如
/// `html-runtime-ext:{session_id}:host`；尾随 `:` 保证 session id 互为前缀时
/// 不误伤（与 item 的 `html-runtime:{id}:` 同一约定）。外部域与 item 域不
/// 相交：item key 以数字段结束标识，外部 key 带 `-ext:` 分隔。
fn scoped_key_belongs_to_external(key: &str, session_id: &str) -> bool {
    key.starts_with(&format!("html-runtime-ext:{session_id}:"))
}

#[cfg(test)]
mod revoke_key_tests {
    use super::{scoped_key_belongs_to_external, scoped_key_belongs_to_item};

    /// R11-b：1/10/100 同存活时，撤销 1 只命中自己的 key（Codex 指定的行为矩阵）。
    #[test]
    fn revoke_matching_does_not_hit_sibling_items() {
        // 精确矩阵：撤销 item 1。
        assert!(scoped_key_belongs_to_item("preview:1", 1));
        assert!(scoped_key_belongs_to_item("html-edit:1", 1));
        assert!(scoped_key_belongs_to_item("html-runtime:1:host", 1));
        assert!(scoped_key_belongs_to_item("html-runtime:1:extra:host", 1));
        assert!(!scoped_key_belongs_to_item("preview:10", 1), "preview:10 不得被 item 1 误伤");
        assert!(!scoped_key_belongs_to_item("preview:100", 1), "preview:100 不得被 item 1 误伤");
        assert!(!scoped_key_belongs_to_item("html-edit:10", 1), "html-edit:10 不得被 item 1 误伤");
        assert!(!scoped_key_belongs_to_item("html-edit:100", 1));
        assert!(!scoped_key_belongs_to_item("html-runtime:10:host", 1), "html-runtime:10:host 不得被 item 1 误伤");
        assert!(!scoped_key_belongs_to_item("html-runtime:100:player", 1));
        // 反向：撤销 item 10 不误伤 1 / 100。
        assert!(!scoped_key_belongs_to_item("preview:1", 10));
        assert!(scoped_key_belongs_to_item("preview:10", 10));
        assert!(!scoped_key_belongs_to_item("preview:100", 10));
        assert!(!scoped_key_belongs_to_item("html-runtime:12:host", 1));
        // 完全无关的 key 不命中。
        assert!(!scoped_key_belongs_to_item("preview:1extra", 1));
        assert!(!scoped_key_belongs_to_item("html-edit:1x", 1));
    }

    /// P2：外部会话 key 分域判定 —— 与 item 域不相交，且 session id 互为
    /// 前缀时不误伤（尾随 `:` 保护）。
    #[test]
    fn external_scoped_key_is_a_separate_namespace() {
        assert!(scoped_key_belongs_to_external("html-runtime-ext:ext-a:host", "ext-a"));
        assert!(scoped_key_belongs_to_external("html-runtime-ext:ext-a:player", "ext-a"));
        // session id 互为前缀：`ext-a` 不得命中 `ext-ab` 的 key，反之亦然。
        assert!(!scoped_key_belongs_to_external("html-runtime-ext:ext-ab:host", "ext-a"));
        assert!(!scoped_key_belongs_to_external("html-runtime-ext:ext-a:host", "ext-ab"));
        // 与 item 域不相交：item 撤销不得关掉外部会话，反之亦然。
        assert!(!scoped_key_belongs_to_item("html-runtime-ext:ext-a:host", 1));
        assert!(!scoped_key_belongs_to_external("html-runtime:1:host", "ext-a"));
        assert!(!scoped_key_belongs_to_external("preview:1", "ext-a"));
        assert!(!scoped_key_belongs_to_external("html-edit:1", "ext-a"));
    }
}
