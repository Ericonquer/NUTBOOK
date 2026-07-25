use std::{collections::BTreeMap, path::PathBuf};

use serde::{Deserialize, Serialize};

pub const HTML_EDIT_COPY_MAX_BYTES: usize = 8 * 1024 * 1024;
pub const HTML_EDIT_COPY_MAX_FIELDS: u32 = 500;
pub const HTML_EDIT_COMMIT_MAX_BYTES: usize = 64 * 1024 * 1024;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteEditableHtmlCopyRequest {
    pub item_id: i64,
    pub runtime_session_id: String,
    pub generation: u64,
    pub expected_source_file_hash: String,
    pub protocolized_html: String,
    pub text_count: u32,
    pub image_count: u32,
    pub background_image_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteEditableHtmlCopyResponse {
    pub status: String,
    pub file_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub item_id: Option<i64>,
    pub text_count: u32,
    pub image_count: u32,
    pub background_image_count: u32,
}

pub const HTML_EDIT_ASSET_MAX_BYTES: u64 = 20 * 1024 * 1024;

fn is_false(value: &bool) -> bool {
    !*value
}

#[derive(Debug, Clone)]
pub struct HtmlEditAssetImport {
    pub library_root: PathBuf,
    pub artifact_edit_id: String,
    pub source_path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportHtmlEditAssetResponse {
    pub relative_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub runtime_url: Option<String>,
    pub media_type: String,
    pub byte_size: u64,
    pub content_hash: String,
}

/// A host request to import one user-selected image into the current HTML edit
/// session.  `source_path` is intentionally command-only input: neither it nor
/// the local-server URL is ever persisted in an HTML edit patch.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportHtmlEditAssetRequest {
    pub item_id: i64,
    pub runtime_session_id: String,
    pub generation: u64,
    pub asset_request_id: String,
    pub artifact_edit_id: String,
    pub expected_patch_revision: u64,
    pub source_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HtmlEditSessionLeaseRequest {
    pub item_id: i64,
    pub runtime_session_id: String,
    pub generation: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetHtmlEditPatchRequest {
    pub item_id: i64,
    #[serde(default)]
    pub runtime_session_id: String,
    #[serde(default)]
    pub generation: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveHtmlEditPatchRequest {
    pub item_id: i64,
    pub runtime_session_id: String,
    pub generation: u64,
    pub artifact_edit_id: String,
    pub expected_file_hash: String,
    pub expected_modified_at: i64,
    pub expected_patch_revision: u64,
    #[serde(default)]
    pub replace_changes: bool,
    pub changes: BTreeMap<String, HtmlEditChange>,
}

/// Commits the current canonical edit state into the real HTML file.  The
/// client never chooses a destination: it can only commit the active item.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitHtmlEditRequest {
    pub item_id: i64,
    pub runtime_session_id: String,
    pub generation: u64,
    pub artifact_edit_id: String,
    pub expected_file_hash: String,
    pub expected_modified_at: i64,
    #[serde(default)]
    pub changes: BTreeMap<String, HtmlEditChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CommitHtmlEditResponse {
    pub source_file_hash: String,
    pub source_modified_at: i64,
    pub source_size: u64,
    pub normalized_changes: BTreeMap<String, HtmlEditChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveHtmlEditConflictCopyRequest {
    pub item_id: i64,
    pub runtime_session_id: String,
    pub generation: u64,
    pub artifact_edit_id: String,
    #[serde(default)]
    pub changes: BTreeMap<String, HtmlEditChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveHtmlEditConflictCopyResponse { pub file_path: String }

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum HtmlEditPatchApplyStatus {
    Clean,
    StaleButApplicable,
    Conflicted,
}

impl HtmlEditPatchApplyStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Clean => "clean",
            Self::StaleButApplicable => "stale-but-applicable",
            Self::Conflicted => "conflicted",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum HtmlEditFieldApplyStatus {
    Applied,
    Skipped,
    Missing,
    Duplicate,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum HtmlEditFieldApplyReason {
    Clean,
    StaleButApplicable,
    TargetNotFound,
    DuplicateDataId,
    OriginalHashMismatch,
    TypeMismatch,
    StructureChanged,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct HtmlEditFieldApplyResult {
    pub status: HtmlEditFieldApplyStatus,
    pub reason: HtmlEditFieldApplyReason,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum HtmlEditChangeType {
    Text,
    Image,
    BackgroundImage,
    InsertedImage,
    #[serde(rename = "rich_text")]
    RichText,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum HtmlEditTextAlign {
    Left,
    Center,
    Right,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum HtmlEditRole {
    Short,
    Content,
    Plain,
}

/// Immutable metadata for one direct `picture > source[srcset]` target.
///
/// The URL is deliberately absent: an image replacement applies one imported
/// library asset to every listed source, while this hash lets replay verify
/// that the source document has not changed underneath the patch.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HtmlEditPictureSource {
    pub index: u32,
    pub original_srcset_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HtmlEditChange {
    #[serde(rename = "type")]
    pub change_type: HtmlEditChangeType,
    pub selector: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_text_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_src_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_style_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub src: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alt: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub html: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text_align: Option<HtmlEditTextAlign>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub edit_role: Option<HtmlEditRole>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub picture_sources: Option<Vec<HtmlEditPictureSource>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub inserted_image_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub left_permille: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_permille: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width_permille: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height_permille: Option<u16>,
    /// Pixel canvas dimensions at the moment the user positioned an inserted
    /// image. They make the saved static layer stable if the document later
    /// reflows to a different height.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub canvas_width: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub canvas_height: Option<u32>,
    /// Only valid for an `inserted-image` change.  It is a transient tombstone
    /// accepted by the save boundary and removed from the persisted patch.
    #[serde(default, skip_serializing_if = "is_false")]
    pub deleted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HtmlEditPatch {
    pub version: u32,
    pub editable_protocol_version: u32,
    pub library_id: String,
    pub artifact_edit_id: String,
    pub last_known_item_id: i64,
    pub patch_revision: u64,
    #[serde(rename = "sourceRelativePath")]
    pub source_relative_path: String,
    #[serde(rename = "sourceFileHash")]
    pub source_file_hash: String,
    #[serde(rename = "sourceModifiedAt")]
    pub source_modified_at: i64,
    #[serde(rename = "sourceSize")]
    pub source_size: u64,
    pub editable_id_set_hash: String,
    pub editable_structure_hash: String,
    pub updated_at: i64,
    pub changes: BTreeMap<String, HtmlEditChange>,
}
