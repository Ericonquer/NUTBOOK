use serde::{Deserialize, Serialize};

use super::{library::Library, skill::SkillBindingSummary, tag::Tag};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PagedResult<T> {
    pub items: Vec<T>,
    pub page: u32,
    pub page_size: u32,
    pub total: u64,
    pub has_more: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThumbnailInfo {
    pub status: String,
    pub path: Option<String>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub last_generated_at: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ThumbnailBackendStatusPayload {
    pub screenshot_available: bool,
    pub chromium_path: Option<String>,
    pub system_chrome_available: bool,
    pub system_chrome_path: Option<String>,
    pub system_chrome_enabled: bool,
    pub fallback_backend: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemSummary {
    pub id: i64,
    pub library_id: i64,
    pub file_path: String,
    pub relative_path: String,
    pub file_name: String,
    pub file_ext: String,
    pub file_type: String,
    pub file_size: i64,
    pub modified_at: String,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub path_state: String,
    pub is_favorite: bool,
    pub last_opened_at: Option<String>,
    pub skill_binding: Option<SkillBindingSummary>,
    pub tags: Vec<Tag>,
    pub thumbnail: Option<ThumbnailInfo>,
}

#[derive(Debug, Clone)]
pub struct IndexedItemRecord {
    pub library_id: i64,
    pub file_path: String,
    pub relative_path: String,
    pub file_name: String,
    pub file_ext: String,
    pub file_type: String,
    pub file_size: i64,
    pub modified_at: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ItemDetail {
    #[serde(flatten)]
    pub summary: ItemSummary,
    pub file_hash: Option<String>,
    pub extracted_title: Option<String>,
    pub source_text: Option<String>,
    pub raw_text: Option<String>,
    pub rendered_cache: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkdownPreviewPayload {
    pub item_id: i64,
    pub file_type: String,
    pub title: Option<String>,
    pub raw: String,
    pub html: String,
    pub base_dir: String,
    pub editable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HtmlPreviewPayload {
    pub item_id: i64,
    pub file_type: String,
    pub title: Option<String>,
    pub file_path: String,
    pub preview_url: String,
    pub document_html: Option<String>,
    pub base_dir: String,
    pub sandbox: bool,
    pub allow_scripts: bool,
    pub allow_external_resources: bool,
    pub editable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "fileType", rename_all = "camelCase")]
pub enum PreviewPayload {
    Markdown(MarkdownPreviewPayload),
    Html(HtmlPreviewPayload),
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SelectLibraryRequest {
    pub root_path: String,
    pub name: Option<String>,
    pub source_kind: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanLibraryRequest {
    pub library_id: i64,
    pub mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteLibraryRequest {
    pub library_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenLibraryLocationRequest {
    pub library_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepairLibraryRootRequest {
    pub library_id: i64,
    pub root_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanLibraryResponse {
    pub library_id: i64,
    pub mode: String,
    pub scanned_count: u64,
    pub created_count: u64,
    pub updated_count: u64,
    pub deleted_count: u64,
    pub started_at: String,
    pub finished_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ListItemsQuery {
    pub library_id: Option<i64>,
    pub browse_mode: Option<String>,
    pub keyword: Option<String>,
    pub file_types: Option<Vec<String>>,
    pub tag_ids: Option<Vec<i64>>,
    pub include_deleted: Option<bool>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetItemDetailRequest {
    pub item_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleFavoriteRequest {
    pub item_id: i64,
    pub is_favorite: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkItemOpenedRequest {
    pub item_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveItemRequest {
    pub item_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MoveItemToTrashRequest {
    pub item_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IgnoredItemSummary {
    pub item_id: i64,
    pub library_id: i64,
    pub library_name: String,
    pub file_path: String,
    pub file_name: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreIgnoredItemRequest {
    pub item_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncFilesystemStateResponse {
    pub missing_items_marked_missing: u64,
    pub restored_items_marked_valid: u64,
    pub missing_ignored_items_purged: u64,
    pub missing_libraries_marked_missing: u64,
    pub restored_libraries_marked_valid: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportMarkdownRequest {
    pub item_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyMarkdownImageAssetRequest {
    pub markdown_file_path: String,
    pub source_image_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CopyMarkdownImageAssetResponse {
    pub relative_path: String,
    pub asset_path: String,
    pub file_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteMarkdownImageAssetRequest {
    pub markdown_file_path: String,
    pub image_src: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetItemPreviewRequest {
    pub item_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenHtmlWindowRequest {
    pub item_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloseHtmlWindowRequest {
    pub item_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HtmlRuntimeSessionPayload {
    pub item_id: i64,
    pub label: String,
    pub title: String,
    pub runtime_url: String,
    pub detached: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeHostBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HtmlEditToolbarFormatState {
    pub can_format: bool,
    pub bold: bool,
    pub italic: bool,
    pub block: String,
    pub text_align: String,
    pub list: Option<String>,
    pub edit_role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachHtmlRuntimeHostRequest {
    pub item_id: i64,
    pub bounds: RuntimeHostBounds,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachHtmlPresentationPreviewRequest {
    pub item_id: i64,
    pub bounds: RuntimeHostBounds,
    pub runtime_session_id: String,
    pub generation: u64,
    pub active_page_id: String,
    pub preview_instance_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HtmlPresentationPreviewControlRequest {
    pub item_id: i64,
    pub runtime_session_id: String,
    pub generation: u64,
    pub preview_instance_id: String,
    pub visible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetHtmlPresentationPreviewActiveRequest {
    pub item_id: i64,
    pub runtime_session_id: String,
    pub generation: u64,
    pub preview_instance_id: String,
    pub page_id: String,
    #[serde(default)]
    pub follow: bool,
    #[serde(default)]
    pub focus: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachHtmlRuntimeControlsOverlayRequest {
    pub item_id: i64,
    pub bounds: RuntimeHostBounds,
    pub is_favorite: bool,
    pub is_fullscreen: bool,
    #[serde(default)]
    pub is_editing: bool,
    pub custom_tag: Option<Tag>,
    pub available_tags: Vec<Tag>,
    pub skill_tag: Option<String>,
    pub type_tag: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachHtmlEditToolbarOverlayRequest {
    pub item_id: i64,
    pub bounds: RuntimeHostBounds,
    pub runtime_session_id: String,
    pub generation: u64,
    pub dirty: bool,
    pub selected_data_id: Option<String>,
    pub format_state: HtmlEditToolbarFormatState,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachHtmlEditLeaveConfirmOverlayRequest {
    pub item_id: i64,
    pub bounds: RuntimeHostBounds,
    #[serde(default)]
    pub mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachSettingsOverlayRequest {
    pub bounds: RuntimeHostBounds,
    pub tab: Option<String>,
    pub mode: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetHtmlRuntimeHostVisibilityRequest {
    pub item_id: i64,
    pub visible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetHtmlRuntimeControlsOverlayVisibilityRequest {
    pub item_id: i64,
    pub visible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetHtmlEditToolbarOverlayVisibilityRequest {
    pub item_id: i64,
    pub visible: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvalHtmlRuntimeScriptRequest {
    pub item_id: i64,
    pub script: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DispatchHtmlRuntimeShortcutRequest {
    pub item_id: i64,
    pub key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FocusHtmlRuntimeHostRequest {
    pub item_id: i64,
    pub host_fullscreen: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveMarkdownContentRequest {
    pub item_id: i64,
    pub content: String,
    pub expected_file_hash: String,
    pub expected_modified_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveMarkdownContentResponse {
    pub item_id: i64,
    pub modified_at: String,
    pub file_hash: Option<String>,
    pub summary: Option<String>,
    pub rendered_html: Option<String>,
    pub saved: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateThumbnailResponse {
    pub item_id: i64,
    #[serde(flatten)]
    pub thumbnail: ThumbnailInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchLibraryRequest {
    pub library_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatchLibraryResponse {
    pub library_id: i64,
    pub watching: bool,
}

#[allow(dead_code)]
fn _retain_import(_library: Library) {}
