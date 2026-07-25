use std::{
    collections::{HashMap, HashSet},
    fs,
    path::PathBuf,
    sync::{Arc, Mutex},
};

use notify::PollWatcher;

use crate::{
    db::{
        repositories::{ItemRepository, LibraryRepository, TagRepository, ThumbnailRepository},
        Database,
    },
    errors::AppError,
    core::local_server::LocalContentServer,
    models::{
        CreateTagRequest, DeleteTagResponse, GenerateThumbnailResponse, IgnoredItemSummary,
        IndexedItemRecord, ItemDetail, ItemSummary, Library, ListItemsQuery, PagedResult,
        SetItemTagsResponse, Tag, ThumbnailInfo, UpdateTagRequest,
        SyncFilesystemStateResponse,
    },
};

#[derive(Debug)]
pub struct AppState {
    pub database: Database,
    local_content_server: LocalContentServer,
    watched_libraries: Mutex<HashSet<i64>>,
    active_watchers: Mutex<Vec<PollWatcher>>,
    html_edit_manifest_locks: Mutex<HashMap<i64, Arc<Mutex<()>>>>,
    html_edit_path_locks: Mutex<HashMap<PathBuf, Arc<Mutex<()>>>>,
    html_edit_session_leases: Mutex<HtmlEditSessionLeases>,
    pub active_html_edit_item: Mutex<Option<i64>>,
    thumbnail_settings_path: PathBuf,
    update_settings_path: PathBuf,
    system_chrome_thumbnails_enabled: Mutex<bool>,
}

impl AppState {
    pub fn new(database: Database, app_data_dir: PathBuf) -> Self {
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
            database,
            local_content_server,
            watched_libraries: Mutex::new(HashSet::new()),
            active_watchers: Mutex::new(Vec::new()),
            html_edit_manifest_locks: Mutex::new(HashMap::new()),
            html_edit_path_locks: Mutex::new(HashMap::new()),
            html_edit_session_leases: Mutex::new(HtmlEditSessionLeases::default()),
            active_html_edit_item: Mutex::new(None),
            thumbnail_settings_path,
            update_settings_path,
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
                .push(watcher);
        }
        Ok(true)
    }

    #[cfg(test)]
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
        self.database.delete_library(library_id)
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
