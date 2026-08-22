use crate::{
    errors::AppError,
    models::{IgnoredItemSummary, IndexedItemRecord, ItemDetail, ItemSummary, ListItemsQuery, PagedResult},
};

pub trait ItemRepository {
    fn replace_items_for_library(
        &self,
        library_id: i64,
        items: &[IndexedItemRecord],
    ) -> Result<(u64, u64, u64), AppError>;
    fn list_items(&self, query: &ListItemsQuery) -> Result<PagedResult<ItemSummary>, AppError>;
    fn get_item_detail(&self, item_id: i64) -> Result<ItemDetail, AppError>;
    fn set_item_favorite(&self, item_id: i64, is_favorite: bool) -> Result<(), AppError>;
    fn mark_item_opened(&self, item_id: i64, opened_at: &str) -> Result<(), AppError>;
    fn update_markdown_item_content(
        &self,
        item_id: i64,
        summary: &str,
        modified_at: &str,
        file_hash: &str,
        source_text: &str,
        raw_text: &str,
        rendered_cache: &str,
    ) -> Result<(), AppError>;
    /// B1：按 item_id + canonical_path 精确更新 revision，并在同一短事务把旧缩略图
    /// 设为 stale、递增持久化 generation。不依赖 owner library 或 source_kind；
    /// ordinary、agent_project 独占、shared item 都可用。
    fn update_item_revision_and_invalidate(
        &self,
        item_id: i64,
        canonical_path: &str,
        source_hash: &str,
        modified_at: &str,
        file_size: i64,
    ) -> Result<(), AppError>;
    fn list_ignored_items(&self) -> Result<Vec<IgnoredItemSummary>, AppError>;
    fn restore_ignored_item(&self, item_id: i64) -> Result<(), AppError>;
    fn remove_item_from_nutbook(&self, item_id: i64, now: &str) -> Result<(), AppError>;
    fn move_item_to_trash(&self, item_id: i64, now: &str) -> Result<(), AppError>;
}
