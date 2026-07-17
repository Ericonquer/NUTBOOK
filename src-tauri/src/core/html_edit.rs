use std::{
    collections::{BTreeMap, HashMap, HashSet},
    fs,
    io::Write,
    path::{Component, Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use crate::errors::AppError;
use crate::models::{
    HtmlEditChange, HtmlEditFieldApplyReason, HtmlEditFieldApplyResult, HtmlEditFieldApplyStatus,
    HtmlEditPatch, HtmlEditPatchApplyStatus, HtmlEditRole,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct HtmlEditPatchLookup {
    pub library_id: i64,
    pub library_root: PathBuf,
    pub item_id: i64,
    pub file_path: PathBuf,
    pub title_hint: String,
}

#[derive(Debug, Clone)]
pub struct HtmlEditPatchSave {
    pub library_id: i64,
    pub library_root: PathBuf,
    pub item_id: i64,
    pub file_path: PathBuf,
    pub title_hint: String,
    pub artifact_edit_id: String,
    pub expected_file_hash: String,
    pub expected_modified_at: i64,
    pub expected_patch_revision: u64,
    pub changes: BTreeMap<String, HtmlEditChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HtmlEditPatchResponse {
    pub library_id: i64,
    pub item_id: i64,
    pub artifact_edit_id: String,
    pub source_relative_path: String,
    pub source_file_hash: String,
    pub source_modified_at: i64,
    pub source_size: u64,
    pub patch_revision: u64,
    pub patch_apply_status: HtmlEditPatchApplyStatus,
    pub field_apply_results: BTreeMap<String, HtmlEditFieldApplyResult>,
    pub patch: Option<HtmlEditPatch>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HtmlEditPatchSaveResponse {
    pub artifact_edit_id: String,
    pub patch_revision: u64,
    pub source_file_hash: String,
    pub source_modified_at: i64,
    pub source_size: u64,
    pub updated_at: i64,
    pub normalized_changes: BTreeMap<String, HtmlEditChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HtmlEditManifest {
    pub version: u32,
    pub entries: BTreeMap<String, HtmlEditManifestEntry>,
}

impl Default for HtmlEditManifest {
    fn default() -> Self {
        Self {
            version: 1,
            entries: BTreeMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HtmlEditManifestEntry {
    pub artifact_edit_id: String,
    pub last_known_item_id: i64,
    pub last_known_source_hash: String,
    pub editable_id_set_hash: String,
    pub title_hint: String,
}

pub fn library_relative_path(library_root: &Path, file_path: &Path) -> Result<String, AppError> {
    let normalized_root = normalize_existing_root(library_root)?;
    let normalized_file = if file_path.exists() {
        file_path.canonicalize().map_err(|_| AppError::IoError)?
    } else {
        normalize_new_child_path(&normalized_root, file_path)?
    };
    let relative = normalized_file
        .strip_prefix(&normalized_root)
        .map_err(|_| AppError::LibraryNotFound)?;
    path_to_forward_slash(relative)
}

pub fn content_hash_bytes(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let digest = hasher.finalize();
    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}

pub fn new_artifact_edit_id() -> String {
    format!("html-edit-{}", Uuid::new_v4())
}

pub fn validate_artifact_edit_id(artifact_edit_id: &str) -> Result<(), AppError> {
    let suffix = artifact_edit_id
        .strip_prefix("html-edit-")
        .ok_or(AppError::InvalidParams)?;
    if suffix.is_empty()
        || !suffix
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
    {
        return Err(AppError::InvalidParams);
    }
    Ok(())
}

pub fn get_html_edit_patch_for_file(
    lookup: &HtmlEditPatchLookup,
) -> Result<HtmlEditPatchResponse, AppError> {
    let source_relative_path = library_relative_path(&lookup.library_root, &lookup.file_path)?;
    let bytes = fs::read(&lookup.file_path).map_err(|_| AppError::IoError)?;
    let metadata = fs::metadata(&lookup.file_path).map_err(|_| AppError::IoError)?;
    let source_file_hash = content_hash_bytes(&bytes);
    let source_modified_at = metadata_modified_at(&metadata)?;
    let source_size = metadata.len();

    let manifest = load_html_edit_manifest(&lookup.library_root)?;
    let manifest_entry = manifest.entries.get(&source_relative_path);
    let artifact_edit_id = manifest_entry
        .map(|entry| entry.artifact_edit_id.clone())
        .unwrap_or_else(new_artifact_edit_id);
    let patch = match manifest_entry {
        Some(_) => load_patch_file(&lookup.library_root, &artifact_edit_id)?,
        None => None,
    };
    let patch_revision = patch.as_ref().map(|patch| patch.patch_revision).unwrap_or(0);
    let patch_apply_status = patch
        .as_ref()
        .map(|patch| {
            if patch.source_file_hash == source_file_hash {
                HtmlEditPatchApplyStatus::Clean
            } else {
                HtmlEditPatchApplyStatus::StaleButApplicable
            }
        })
        .unwrap_or(HtmlEditPatchApplyStatus::Clean);
    let field_apply_results = patch
        .as_ref()
        .map(|patch| field_apply_results_for_patch(patch, &patch_apply_status))
        .unwrap_or_default();

    Ok(HtmlEditPatchResponse {
        library_id: lookup.library_id,
        item_id: lookup.item_id,
        artifact_edit_id,
        source_relative_path,
        source_file_hash,
        source_modified_at,
        source_size,
        patch_revision,
        patch_apply_status,
        field_apply_results,
        patch,
    })
}

fn field_apply_results_for_patch(
    patch: &HtmlEditPatch,
    patch_apply_status: &HtmlEditPatchApplyStatus,
) -> BTreeMap<String, HtmlEditFieldApplyResult> {
    let reason = match patch_apply_status {
        HtmlEditPatchApplyStatus::Clean => HtmlEditFieldApplyReason::Clean,
        HtmlEditPatchApplyStatus::StaleButApplicable => {
            HtmlEditFieldApplyReason::StaleButApplicable
        }
        HtmlEditPatchApplyStatus::Conflicted => HtmlEditFieldApplyReason::StructureChanged,
    };
    patch
        .changes
        .keys()
        .map(|field_id| {
            (
                field_id.clone(),
                HtmlEditFieldApplyResult {
                    status: HtmlEditFieldApplyStatus::Applied,
                    reason: reason.clone(),
                },
            )
        })
        .collect()
}

pub fn save_html_edit_patch_for_file(
    save: &HtmlEditPatchSave,
) -> Result<HtmlEditPatchSaveResponse, AppError> {
    save_html_edit_patch_with_mode_for_file(save, false)
}

pub fn save_html_edit_patch_replacing_changes_for_file(
    save: &HtmlEditPatchSave,
) -> Result<HtmlEditPatchSaveResponse, AppError> {
    save_html_edit_patch_with_mode_for_file(save, true)
}

fn save_html_edit_patch_with_mode_for_file(
    save: &HtmlEditPatchSave,
    replace_changes: bool,
) -> Result<HtmlEditPatchSaveResponse, AppError> {
    validate_artifact_edit_id(&save.artifact_edit_id)?;

    let source_relative_path = library_relative_path(&save.library_root, &save.file_path)?;
    let bytes = fs::read(&save.file_path).map_err(|_| AppError::IoError)?;
    let metadata = fs::metadata(&save.file_path).map_err(|_| AppError::IoError)?;
    let source_file_hash = content_hash_bytes(&bytes);
    if source_file_hash != save.expected_file_hash {
        return Err(AppError::EditConflict);
    }
    let source_modified_at = metadata_modified_at(&metadata)?;
    if source_modified_at != save.expected_modified_at {
        return Err(AppError::EditConflict);
    }
    let source_size = metadata.len();

    let mut manifest = load_html_edit_manifest(&save.library_root)?;
    let manifest_entry_exists = match manifest.entries.get(&source_relative_path) {
        Some(entry) if entry.artifact_edit_id != save.artifact_edit_id => {
            return Err(AppError::EditConflict);
        }
        None if save.expected_patch_revision != 0 => return Err(AppError::EditConflict),
        Some(_) => true,
        None => false,
    };

    let current_patch = match load_patch_file(&save.library_root, &save.artifact_edit_id) {
        Ok(patch) => patch,
        Err(_) if manifest_entry_exists => return Err(AppError::EditConflict),
        Err(error) => return Err(error),
    };
    if manifest_entry_exists && current_patch.is_none() {
        return Err(AppError::EditConflict);
    }

    let current_revision = current_patch
        .as_ref()
        .map(|patch| patch.patch_revision)
        .unwrap_or(0);
    if current_revision != save.expected_patch_revision {
        return Err(AppError::EditConflict);
    }

    let normalized_save_changes = save
        .changes
        .iter()
        .map(|(field_id, change)| {
            normalize_rich_text_change(change).map(|normalized| (field_id.clone(), normalized))
        })
        .collect::<Result<BTreeMap<_, _>, _>>()?;

    let changes = if replace_changes {
        normalized_save_changes
    } else if let Some(patch) = current_patch {
        let mut changes = patch.changes;
        changes.extend(normalized_save_changes);
        changes
    } else {
        normalized_save_changes
    };
    let next_revision = current_revision + 1;
    let updated_at = unix_timestamp()?;
    let patch = HtmlEditPatch {
        version: 1,
        editable_protocol_version: 1,
        library_id: save.library_id.to_string(),
        artifact_edit_id: save.artifact_edit_id.clone(),
        last_known_item_id: save.item_id,
        patch_revision: next_revision,
        source_relative_path: source_relative_path.clone(),
        source_file_hash: source_file_hash.clone(),
        source_modified_at,
        source_size,
        editable_id_set_hash: String::new(),
        editable_structure_hash: String::new(),
        updated_at,
        changes,
    };

    save_patch_file(&save.library_root, &patch)?;
    manifest.entries.insert(
        source_relative_path,
        HtmlEditManifestEntry {
            artifact_edit_id: save.artifact_edit_id.clone(),
            last_known_item_id: save.item_id,
            last_known_source_hash: source_file_hash.clone(),
            editable_id_set_hash: String::new(),
            title_hint: save.title_hint.clone(),
        },
    );
    save_html_edit_manifest(&save.library_root, &manifest)?;

    Ok(HtmlEditPatchSaveResponse {
        artifact_edit_id: save.artifact_edit_id.clone(),
        patch_revision: next_revision,
        source_file_hash,
        source_modified_at,
        source_size,
        updated_at,
        normalized_changes: patch.changes.clone(),
    })
}

pub fn normalize_rich_text_change(change: &HtmlEditChange) -> Result<HtmlEditChange, AppError> {
    use crate::models::HtmlEditChangeType;

    if !matches!(&change.change_type, HtmlEditChangeType::RichText) {
        if change.html.is_some() || change.text_align.is_some() {
            return Err(AppError::InvalidParams);
        }
        if matches!(
            change.edit_role.as_ref(),
            Some(HtmlEditRole::Short | HtmlEditRole::Content)
        ) {
            return Err(AppError::InvalidParams);
        }
        return Ok(change.clone());
    }

    if change.text.is_some() || change.src.is_some() || change.alt.is_some() {
        return Err(AppError::InvalidParams);
    }
    let role = change.edit_role.clone().unwrap_or(HtmlEditRole::Content);
    if matches!(&role, HtmlEditRole::Plain) {
        return Err(AppError::InvalidParams);
    }
    let html = change
        .html
        .as_deref()
        .filter(|html| !html.trim().is_empty())
        .ok_or(AppError::InvalidParams)?;
    let allowed_tags = rich_text_allowed_tags(&role);
    if rich_text_contains_disallowed_markup(html, allowed_tags) {
        return Err(AppError::InvalidParams);
    }
    let cleaned = clean_rich_text_html(html, allowed_tags);
    if cleaned != html {
        return Err(AppError::InvalidParams);
    }

    let mut normalized = change.clone();
    normalized.html = Some(cleaned);
    Ok(normalized)
}

fn rich_text_allowed_tags(role: &HtmlEditRole) -> &'static [&'static str] {
    match role {
        HtmlEditRole::Short => &["br", "strong", "em"],
        HtmlEditRole::Content => &[
            "p", "br", "strong", "em", "h1", "h2", "h3", "h4", "ul", "ol", "li",
        ],
        HtmlEditRole::Plain => &[],
    }
}

fn rich_text_contains_disallowed_markup(html: &str, allowed_tags: &[&str]) -> bool {
    let mut remaining = html;
    while let Some(start) = remaining.find('<') {
        let after_open = &remaining[start + 1..];
        let Some(end) = after_open.find('>') else {
            return true;
        };
        let tag = &after_open[..end];
        let tag = tag.trim();
        let tag = tag.strip_prefix('/').unwrap_or(tag).trim();
        let name_end = tag
            .find(|character: char| !character.is_ascii_alphanumeric())
            .unwrap_or(tag.len());
        let (name, suffix) = tag.split_at(name_end);
        let name = name.to_ascii_lowercase();
        if !allowed_tags.contains(&name.as_str()) {
            return true;
        }
        if !rich_text_attribute_is_allowed(&name, suffix.trim()) {
            return true;
        }
        remaining = &after_open[end + 1..];
    }
    false
}

fn rich_text_attribute_is_allowed(tag: &str, suffix: &str) -> bool {
    if suffix.is_empty() || suffix == "/" {
        return true;
    }
    if !matches!(tag, "p" | "h1" | "h2" | "h3" | "h4") {
        return false;
    }
    matches!(
        suffix,
        "style=\"text-align:left\""
            | "style=\"text-align:center\""
            | "style=\"text-align:right\""
    )
}

fn clean_rich_text_html(html: &str, allowed_tags: &[&str]) -> String {
    let allowed_tags = allowed_tags
        .iter()
        .copied()
        .collect::<HashSet<_>>();
    let mut builder = ammonia::Builder::default();
    let supports_block_alignment = allowed_tags.contains(&"p");
    builder
        .tags(allowed_tags)
        .generic_attributes(HashSet::new())
        .tag_attributes(HashMap::new());
    if supports_block_alignment {
        for tag in ["p", "h1", "h2", "h3", "h4"] {
            builder.add_tag_attributes(tag, &["style"]);
        }
        builder.filter_style_properties(HashSet::from(["text-align"]));
    }
    builder.clean(html).to_string()
}

pub fn normalize_existing_root(path: &Path) -> Result<PathBuf, AppError> {
    path.canonicalize().map_err(|_| AppError::LibraryNotFound)
}

pub fn normalize_new_child_path(
    library_root: &Path,
    target_path: &Path,
) -> Result<PathBuf, AppError> {
    let parent = target_path.parent().ok_or(AppError::IoError)?;
    let file_name = target_path.file_name().ok_or(AppError::IoError)?;
    let parent = parent.canonicalize().map_err(|_| AppError::IoError)?;
    if !parent.starts_with(library_root) {
        return Err(AppError::LibraryNotFound);
    }
    let file_name = file_name.to_string_lossy();
    if file_name.is_empty() || file_name.contains('/') || file_name.contains('\\') {
        return Err(AppError::IoError);
    }
    Ok(parent.join(file_name.as_ref()))
}

pub fn path_to_forward_slash(path: &Path) -> Result<String, AppError> {
    let mut parts = Vec::new();
    for component in path.components() {
        match component {
            Component::Normal(value) => parts.push(value.to_string_lossy().to_string()),
            _ => return Err(AppError::IoError),
        }
    }
    if parts.is_empty() {
        return Err(AppError::IoError);
    }
    Ok(parts.join("/"))
}

pub fn html_edit_root(library_root: &Path) -> PathBuf {
    library_root.join(".nutbook").join("html-edit")
}

pub fn manifest_path(library_root: &Path) -> PathBuf {
    html_edit_root(library_root).join("manifest.json")
}

pub fn patch_path(library_root: &Path, artifact_edit_id: &str) -> Result<PathBuf, AppError> {
    validate_artifact_edit_id(artifact_edit_id)?;
    Ok(html_edit_root(library_root)
        .join("patches")
        .join(format!("{artifact_edit_id}.json")))
}

fn load_patch_file(
    library_root: &Path,
    artifact_edit_id: &str,
) -> Result<Option<HtmlEditPatch>, AppError> {
    let path = patch_path(library_root, artifact_edit_id)?;
    if !path.exists() {
        return Ok(None);
    }
    let text = fs::read_to_string(path).map_err(|_| AppError::IoError)?;
    let mut patch: HtmlEditPatch = serde_json::from_str(&text).map_err(|_| AppError::IoError)?;
    patch.changes.retain(|_, change| {
        normalize_rich_text_change(change)
            .map(|normalized| normalized == (*change).clone())
            .unwrap_or(false)
    });
    Ok(Some(patch))
}

pub fn load_patch_revision(library_root: &Path, artifact_edit_id: &str) -> Result<u64, AppError> {
    Ok(load_patch_file(library_root, artifact_edit_id)?
        .map(|patch| patch.patch_revision)
        .unwrap_or(0))
}

pub fn save_patch_file(library_root: &Path, patch: &HtmlEditPatch) -> Result<(), AppError> {
    let final_path = patch_path(library_root, &patch.artifact_edit_id)?;
    atomic_write_json(&final_path, patch)
}

pub fn load_html_edit_manifest(library_root: &Path) -> Result<HtmlEditManifest, AppError> {
    let path = manifest_path(library_root);
    if !path.exists() {
        return Ok(HtmlEditManifest::default());
    }
    let text = fs::read_to_string(path).map_err(|_| AppError::IoError)?;
    serde_json::from_str(&text).map_err(|_| AppError::IoError)
}

pub fn save_html_edit_manifest(
    library_root: &Path,
    manifest: &HtmlEditManifest,
) -> Result<(), AppError> {
    let root = html_edit_root(library_root);
    fs::create_dir_all(&root).map_err(|_| AppError::IoError)?;
    let final_path = manifest_path(library_root);
    atomic_write_json(&final_path, manifest)
}

pub fn atomic_write_json<T: Serialize>(final_path: &Path, value: &T) -> Result<(), AppError> {
    let parent = final_path.parent().ok_or(AppError::IoError)?;
    fs::create_dir_all(parent).map_err(|_| AppError::IoError)?;
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| AppError::InternalError)?
        .as_nanos();
    let tmp_path = parent.join(format!(".{}.tmp", nonce));
    let data = serde_json::to_vec_pretty(value).map_err(|_| AppError::IoError)?;
    {
        let mut file = fs::File::create(&tmp_path).map_err(|_| AppError::IoError)?;
        file.write_all(&data).map_err(|_| AppError::IoError)?;
        file.sync_all().map_err(|_| AppError::IoError)?;
    }
    fs::rename(&tmp_path, final_path).map_err(|_| AppError::IoError)?;
    Ok(())
}

fn metadata_modified_at(metadata: &fs::Metadata) -> Result<i64, AppError> {
    let modified = metadata.modified().map_err(|_| AppError::IoError)?;
    modified
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .map_err(|_| AppError::IoError)
}

pub fn unix_timestamp() -> Result<i64, AppError> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .map_err(|_| AppError::InternalError)
}
