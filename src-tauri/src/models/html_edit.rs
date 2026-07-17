use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetHtmlEditPatchRequest {
    pub item_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveHtmlEditPatchRequest {
    pub item_id: i64,
    pub runtime_session_id: String,
    pub artifact_edit_id: String,
    pub expected_file_hash: String,
    pub expected_modified_at: i64,
    pub expected_patch_revision: u64,
    pub changes: BTreeMap<String, HtmlEditChange>,
}

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
