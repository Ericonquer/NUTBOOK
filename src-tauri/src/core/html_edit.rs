use std::{
    collections::{BTreeMap, HashMap, HashSet},
    fs,
    io::{Read, Write},
    path::{Component, Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

#[cfg(unix)]
use std::{
    ffi::CString,
    os::{fd::{AsRawFd, FromRawFd}, unix::ffi::OsStrExt},
};

use crate::errors::AppError;
use crate::models::{
    HtmlEditAssetImport, HtmlEditChange, HtmlEditFieldApplyReason, HtmlEditFieldApplyResult,
    HtmlEditFieldApplyStatus, HtmlEditPatch, HtmlEditPatchApplyStatus, HtmlEditRole,
    HtmlEditChangeType, ImportHtmlEditAssetResponse, HTML_EDIT_ASSET_MAX_BYTES,
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
    /// Ephemeral local-content-server URLs keyed by persisted asset-relative
    /// path.  This is deliberately outside `HtmlEditPatch`.
    #[serde(default)]
    pub runtime_asset_urls: BTreeMap<String, String>,
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

pub fn import_html_edit_asset(
    import: &HtmlEditAssetImport,
) -> Result<ImportHtmlEditAssetResponse, AppError> {
    validate_artifact_edit_id(&import.artifact_edit_id)?;

    // This path metadata is only a fast rejection before any output path exists.
    // On Unix the security decision is made again from the O_NOFOLLOW source FD.
    let source_metadata = fs::metadata(&import.source_path).map_err(|_| AppError::InvalidParams)?;
    if !source_metadata.is_file() {
        return Err(AppError::InvalidParams);
    }
    if source_metadata.len() > HTML_EDIT_ASSET_MAX_BYTES {
        return Err(AppError::AssetTooLarge);
    }

    #[cfg(unix)]
    let mut source = open_html_edit_asset_source(&import.source_path)?;
    #[cfg(not(unix))]
    let mut source = fs::File::open(&import.source_path).map_err(|_| AppError::InvalidParams)?;
    let opened_metadata = source.metadata().map_err(|_| AppError::InvalidParams)?;
    if !opened_metadata.is_file() {
        return Err(AppError::InvalidParams);
    }
    if opened_metadata.len() > HTML_EDIT_ASSET_MAX_BYTES {
        return Err(AppError::AssetTooLarge);
    }

    let header = read_html_edit_asset_header(&mut source)?;
    let (media_type, extension) = detect_html_edit_image_type(&header)
        .ok_or(AppError::AssetInvalidType)?;

    #[cfg(unix)]
    {
        return import_html_edit_asset_unix(
            &import.library_root,
            &import.artifact_edit_id,
            &mut source,
            &header,
            media_type,
            extension,
        );
    }
    #[cfg(not(unix))]
    {
        let _ = (source, header, media_type, extension);
        Err(AppError::IoError)
    }
}

#[cfg(unix)]
fn open_html_edit_asset_source(path: &Path) -> Result<fs::File, AppError> {
    let path = CString::new(path.as_os_str().as_bytes()).map_err(|_| AppError::InvalidParams)?;
    let fd = unsafe {
        libc::open(
            path.as_ptr(),
            libc::O_RDONLY | libc::O_NOFOLLOW | libc::O_NONBLOCK | libc::O_CLOEXEC,
        )
    };
    if fd < 0 {
        return Err(AppError::InvalidParams);
    }
    let file = unsafe { fs::File::from_raw_fd(fd) };
    let metadata = file.metadata().map_err(|_| AppError::InvalidParams)?;
    if !metadata.is_file() {
        return Err(AppError::InvalidParams);
    }
    if metadata.len() > HTML_EDIT_ASSET_MAX_BYTES {
        return Err(AppError::AssetTooLarge);
    }
    Ok(file)
}

#[cfg(unix)]
fn import_html_edit_asset_unix(
    library_root: &Path,
    artifact_edit_id: &str,
    source: &mut fs::File,
    header: &[u8],
    media_type: &str,
    extension: &str,
) -> Result<ImportHtmlEditAssetResponse, AppError> {
    let asset_dir = open_html_edit_asset_directory(library_root, artifact_edit_id)?;
    let temp_leaf = format!(".tmp-{}", Uuid::new_v4());
    let mut temporary = create_html_edit_asset_temp_in_directory(&asset_dir, &temp_leaf)?;
    let (byte_size, content_hash) = match copy_html_edit_asset_to_file(source, header, &mut temporary) {
        Ok(result) => result,
        Err(error) => {
            let _ = unlink_at(&asset_dir, &temp_leaf);
            return Err(error);
        }
    };
    if temporary.sync_all().is_err() {
        let _ = unlink_at(&asset_dir, &temp_leaf);
        return Err(AppError::IoError);
    }
    drop(temporary);

    let file_name = format!("{content_hash}.{extension}");
    publish_html_edit_asset_temp_no_clobber(
        &asset_dir,
        &temp_leaf,
        &file_name,
        &content_hash,
    )?;

    Ok(ImportHtmlEditAssetResponse {
        relative_path: format!(
            ".nutbook/html-edit/assets/{artifact_edit_id}/{file_name}"
        ),
        runtime_url: None,
        media_type: media_type.to_string(),
        byte_size,
        content_hash,
    })
}

#[cfg(unix)]
fn open_html_edit_asset_directory(
    library_root: &Path,
    artifact_edit_id: &str,
) -> Result<fs::File, AppError> {
    let root = open_directory_path(library_root)?;
    let mut current = root;
    for component in [".nutbook", "html-edit", "assets", artifact_edit_id] {
        mkdir_at_if_missing(&current, component)?;
        current = open_directory_at(&current, component)?;
    }
    Ok(current)
}

#[cfg(unix)]
fn open_directory_path(path: &Path) -> Result<fs::File, AppError> {
    let path = CString::new(path.as_os_str().as_bytes()).map_err(|_| AppError::IoError)?;
    let fd = unsafe {
        libc::open(
            path.as_ptr(),
            libc::O_RDONLY | libc::O_DIRECTORY | libc::O_NOFOLLOW | libc::O_CLOEXEC,
        )
    };
    fd_to_regular_directory(fd)
}

#[cfg(unix)]
fn open_directory_at(parent: &fs::File, name: &str) -> Result<fs::File, AppError> {
    let name = asset_leaf(name)?;
    let fd = unsafe {
        libc::openat(
            parent.as_raw_fd(),
            name.as_ptr(),
            libc::O_RDONLY | libc::O_DIRECTORY | libc::O_NOFOLLOW | libc::O_CLOEXEC,
        )
    };
    fd_to_regular_directory(fd)
}

#[cfg(unix)]
fn fd_to_regular_directory(fd: libc::c_int) -> Result<fs::File, AppError> {
    if fd < 0 {
        return Err(AppError::IoError);
    }
    let file = unsafe { fs::File::from_raw_fd(fd) };
    let metadata = file.metadata().map_err(|_| AppError::IoError)?;
    if !metadata.is_dir() {
        return Err(AppError::IoError);
    }
    Ok(file)
}

#[cfg(unix)]
fn mkdir_at_if_missing(parent: &fs::File, name: &str) -> Result<(), AppError> {
    let name = asset_leaf(name)?;
    let result = unsafe { libc::mkdirat(parent.as_raw_fd(), name.as_ptr(), 0o700) };
    if result == 0 {
        return Ok(());
    }
    if std::io::Error::last_os_error().raw_os_error() == Some(libc::EEXIST) {
        return Ok(());
    }
    Err(AppError::IoError)
}

#[cfg(unix)]
fn asset_leaf(name: &str) -> Result<CString, AppError> {
    if name.is_empty() || name.contains('/') || name.contains('\\') || name == "." || name == ".." {
        return Err(AppError::InvalidParams);
    }
    CString::new(name).map_err(|_| AppError::InvalidParams)
}

#[cfg(unix)]
pub fn create_html_edit_asset_temp_in_directory(
    directory: &fs::File,
    temporary_leaf: &str,
) -> Result<fs::File, AppError> {
    let temporary_leaf = asset_leaf(temporary_leaf)?;
    let fd = unsafe {
        libc::openat(
            directory.as_raw_fd(),
            temporary_leaf.as_ptr(),
            libc::O_WRONLY
                | libc::O_CREAT
                | libc::O_EXCL
                | libc::O_NOFOLLOW
                | libc::O_CLOEXEC,
            0o600,
        )
    };
    if fd < 0 {
        return Err(AppError::IoError);
    }
    Ok(unsafe { fs::File::from_raw_fd(fd) })
}

#[cfg(unix)]
fn regular_leaf_metadata(directory: &fs::File, leaf: &str) -> Result<Option<()>, AppError> {
    let leaf = asset_leaf(leaf)?;
    let mut metadata: libc::stat = unsafe { std::mem::zeroed() };
    let result = unsafe {
        libc::fstatat(
            directory.as_raw_fd(),
            leaf.as_ptr(),
            &mut metadata,
            libc::AT_SYMLINK_NOFOLLOW,
        )
    };
    if result != 0 {
        if std::io::Error::last_os_error().raw_os_error() == Some(libc::ENOENT) {
            return Ok(None);
        }
        return Err(AppError::IoError);
    }
    if metadata.st_mode & libc::S_IFMT != libc::S_IFREG {
        return Err(AppError::IoError);
    }
    Ok(Some(()))
}

#[cfg(unix)]
fn hash_regular_leaf(directory: &fs::File, leaf: &str) -> Result<String, AppError> {
    let leaf = asset_leaf(leaf)?;
    let fd = unsafe {
        libc::openat(
            directory.as_raw_fd(),
            leaf.as_ptr(),
            libc::O_RDONLY | libc::O_NOFOLLOW | libc::O_CLOEXEC,
        )
    };
    if fd < 0 {
        return Err(AppError::IoError);
    }
    let mut file = unsafe { fs::File::from_raw_fd(fd) };
    if !file.metadata().map_err(|_| AppError::IoError)?.is_file() {
        return Err(AppError::IoError);
    }
    hash_reader(&mut file)
}

#[cfg(unix)]
fn unlink_at(directory: &fs::File, leaf: &str) -> Result<(), AppError> {
    let leaf = asset_leaf(leaf)?;
    let result = unsafe { libc::unlinkat(directory.as_raw_fd(), leaf.as_ptr(), 0) };
    if result == 0 {
        Ok(())
    } else {
        Err(AppError::IoError)
    }
}

#[cfg(unix)]
pub fn publish_html_edit_asset_temp_no_clobber(
    directory: &fs::File,
    temporary_leaf: &str,
    destination_leaf: &str,
    expected_hash: &str,
) -> Result<(), AppError> {
    match link_at(directory, temporary_leaf, destination_leaf) {
        Ok(()) => return unlink_at(directory, temporary_leaf),
        Err(error) if error.raw_os_error() == Some(libc::EEXIST) => {}
        Err(_) => {
            let _ = unlink_at(directory, temporary_leaf);
            return Err(AppError::IoError);
        }
    }

    let existing_hash = match regular_leaf_metadata(directory, destination_leaf) {
        Ok(Some(())) => hash_regular_leaf(directory, destination_leaf),
        Ok(None) => Err(AppError::IoError),
        Err(error) => Err(error),
    };
    let _ = unlink_at(directory, temporary_leaf);
    match existing_hash {
        Ok(hash) if hash == expected_hash => Ok(()),
        Ok(_) | Err(_) => Err(AppError::IoError),
    }
}

#[cfg(unix)]
fn link_at(
    directory: &fs::File,
    source_leaf: &str,
    destination_leaf: &str,
) -> Result<(), std::io::Error> {
    let source_leaf = asset_leaf(source_leaf)
        .map_err(|_| std::io::Error::new(std::io::ErrorKind::InvalidInput, "invalid asset leaf"))?;
    let destination_leaf = asset_leaf(destination_leaf)
        .map_err(|_| std::io::Error::new(std::io::ErrorKind::InvalidInput, "invalid asset leaf"))?;
    let result = unsafe {
        libc::linkat(
            directory.as_raw_fd(),
            source_leaf.as_ptr(),
            directory.as_raw_fd(),
            destination_leaf.as_ptr(),
            0,
        )
    };
    if result == 0 {
        Ok(())
    } else {
        Err(std::io::Error::last_os_error())
    }
}

fn detect_html_edit_image_type(header: &[u8]) -> Option<(&'static str, &'static str)> {
    if header.starts_with(b"\x89PNG\r\n\x1a\n") {
        Some(("image/png", "png"))
    } else if header.starts_with(&[0xff, 0xd8, 0xff]) {
        Some(("image/jpeg", "jpg"))
    } else if header.starts_with(b"GIF87a") || header.starts_with(b"GIF89a") {
        Some(("image/gif", "gif"))
    } else if header.len() >= 12 && &header[..4] == b"RIFF" && &header[8..12] == b"WEBP" {
        Some(("image/webp", "webp"))
    } else {
        None
    }
}

fn read_html_edit_asset_header(source: &mut fs::File) -> Result<Vec<u8>, AppError> {
    let mut header = [0_u8; 12];
    let mut header_len = 0;
    while header_len < header.len() {
        let read = source
            .read(&mut header[header_len..])
            .map_err(|_| AppError::IoError)?;
        if read == 0 {
            break;
        }
        header_len += read;
    }
    Ok(header[..header_len].to_vec())
}

pub fn copy_html_edit_asset_reader_to_temp<R: Read>(
    source: &mut R,
    header: &[u8],
    tmp_path: &Path,
) -> Result<(u64, String), AppError> {
    let result = (|| {
        let mut temporary = fs::File::create(tmp_path).map_err(|_| AppError::IoError)?;
        let result = copy_html_edit_asset_to_file(source, header, &mut temporary)?;
        temporary.sync_all().map_err(|_| AppError::IoError)?;
        Ok(result)
    })();
    if result.is_err() {
        let _ = fs::remove_file(tmp_path);
    }
    result
}

fn copy_html_edit_asset_to_file<R: Read>(
    source: &mut R,
    header: &[u8],
    temporary: &mut fs::File,
) -> Result<(u64, String), AppError> {
    let mut hasher = Sha256::new();
    let mut byte_size = 0_u64;
    let mut write_chunk = |bytes: &[u8]| -> Result<(), AppError> {
        byte_size = byte_size
            .checked_add(bytes.len() as u64)
            .ok_or(AppError::AssetTooLarge)?;
        if byte_size > HTML_EDIT_ASSET_MAX_BYTES {
            return Err(AppError::AssetTooLarge);
        }
        temporary.write_all(bytes).map_err(|_| AppError::IoError)?;
        hasher.update(bytes);
        Ok(())
    };

    write_chunk(header)?;
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = source.read(&mut buffer).map_err(|_| AppError::IoError)?;
        if read == 0 {
            break;
        }
        write_chunk(&buffer[..read])?;
    }
    Ok((byte_size, format!("{:x}", hasher.finalize())))
}

fn hash_reader<R: Read>(file: &mut R) -> Result<String, AppError> {
    let mut hasher = Sha256::new();
    let mut buffer = [0_u8; 64 * 1024];
    loop {
        let read = file.read(&mut buffer).map_err(|_| AppError::IoError)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(format!("{:x}", hasher.finalize()))
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
        runtime_asset_urls: BTreeMap::new(),
        patch,
    })
}

/// Resolve a persisted HTML-edit asset reference only when it remains a real,
/// canonical child of this artifact's asset directory.  Callers use this
/// boundary before converting a local file to an ephemeral HTTP URL.
pub fn resolve_html_edit_asset_path(
    library_root: &Path,
    artifact_edit_id: &str,
    relative_path: &str,
) -> Result<PathBuf, AppError> {
    validate_artifact_edit_id(artifact_edit_id)?;
    let asset_prefix = format!(".nutbook/html-edit/assets/{artifact_edit_id}/");
    let leaf = relative_path
        .strip_prefix(&asset_prefix)
        .filter(|leaf| !leaf.is_empty())
        .ok_or(AppError::InvalidParams)?;
    if leaf.contains('/') || leaf.contains('\\') || leaf == "." || leaf == ".." || relative_path.contains("..") {
        return Err(AppError::InvalidParams);
    }

    let canonical_root = library_root.canonicalize().map_err(|_| AppError::InvalidParams)?;
    let expected_dir = canonical_root
        .join(".nutbook/html-edit/assets")
        .join(artifact_edit_id);
    let canonical_dir = expected_dir.canonicalize().map_err(|_| AppError::InvalidParams)?;
    if canonical_dir != expected_dir {
        return Err(AppError::InvalidParams);
    }
    let canonical_asset = canonical_root.join(relative_path).canonicalize().map_err(|_| AppError::InvalidParams)?;
    if canonical_asset.parent() != Some(canonical_dir.as_path())
        || !fs::metadata(&canonical_asset).map_err(|_| AppError::InvalidParams)?.is_file()
    {
        return Err(AppError::InvalidParams);
    }
    Ok(canonical_asset)
}

/// Add runtime-only URLs to a response without ever changing the persisted
/// patch. Invalid or escaped references are omitted rather than exposed.
pub fn populate_runtime_asset_urls<F>(
    response: &mut HtmlEditPatchResponse,
    library_root: &Path,
    mut file_url: F,
) where
    F: FnMut(&Path) -> String,
{
    response.runtime_asset_urls.clear();
    let Some(patch) = response.patch.as_ref() else { return; };
    for change in patch.changes.values() {
        let Some(relative_path) = change.src.as_deref() else { continue; };
        let Ok(path) = resolve_html_edit_asset_path(library_root, &response.artifact_edit_id, relative_path) else { continue; };
        let url = file_url(&path);
        if url.starts_with("http://") || url.starts_with("https://") {
            response.runtime_asset_urls.insert(relative_path.to_string(), url);
        }
    }
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
            normalize_html_edit_change(
                &save.library_root,
                &save.artifact_edit_id,
                field_id,
                change,
            )
            .map(|normalized| (field_id.clone(), normalized))
        })
        .collect::<Result<BTreeMap<_, _>, _>>()?;
    if !replace_changes && normalized_save_changes.values().any(|change| change.deleted) {
        return Err(AppError::InvalidParams);
    }

    let mut changes = if replace_changes {
        normalized_save_changes
    } else if let Some(patch) = current_patch {
        let mut changes = patch.changes;
        changes.extend(normalized_save_changes);
        changes
    } else {
        normalized_save_changes
    };
    // A removed user-inserted frame is carried only across this save request.
    // Do not persist a tombstone, and never let it delete a source-owned field.
    changes.retain(|field_id, change| {
        if !change.deleted {
            return true;
        }
        matches!(change.change_type, HtmlEditChangeType::InsertedImage)
            && change.inserted_image_id.as_deref() == Some(field_id.as_str())
    });
    let deleted_ids = changes
        .iter()
        .filter_map(|(field_id, change)| change.deleted.then_some(field_id.clone()))
        .collect::<Vec<_>>();
    for field_id in deleted_ids {
        changes.remove(&field_id);
    }
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

/// Validates the persisted patch representation at the storage boundary.
/// Image URLs never cross this boundary: `src` is an existing library-relative
/// import owned by this artifact, while local-server URLs exist only at runtime.
pub fn normalize_html_edit_change(
    library_root: &Path,
    artifact_edit_id: &str,
    field_id: &str,
    change: &HtmlEditChange,
) -> Result<HtmlEditChange, AppError> {
    validate_artifact_edit_id(artifact_edit_id)?;
    if matches!(change.change_type, HtmlEditChangeType::InsertedImage) {
        return normalize_inserted_image_change(library_root, artifact_edit_id, field_id, change);
    }
    if field_id.is_empty()
        || field_id.chars().any(|character| {
            !(character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | ':'))
        })
        || change.selector != format!("[data-id=\"{field_id}\"]")
    {
        return Err(AppError::InvalidParams);
    }

    match &change.change_type {
        HtmlEditChangeType::Text | HtmlEditChangeType::RichText => {
            if change.picture_sources.is_some() {
                return Err(AppError::InvalidParams);
            }
            normalize_rich_text_change(change)
        }
        HtmlEditChangeType::Image => normalize_image_change(library_root, artifact_edit_id, change),
        HtmlEditChangeType::BackgroundImage => {
            normalize_background_image_change(library_root, artifact_edit_id, change)
        }
        HtmlEditChangeType::InsertedImage => unreachable!("inserted images are normalized above"),
    }
}

fn normalize_inserted_image_change(
    library_root: &Path,
    artifact_edit_id: &str,
    field_id: &str,
    change: &HtmlEditChange,
) -> Result<HtmlEditChange, AppError> {
    let inserted_image_id = change.inserted_image_id.as_deref().ok_or(AppError::InvalidParams)?;
    let uuid = inserted_image_id.strip_prefix("inserted-image-").ok_or(AppError::InvalidParams)?;
    uuid::Uuid::parse_str(uuid).map_err(|_| AppError::InvalidParams)?;
    if field_id != inserted_image_id
        || change.selector != format!("[data-nutbook-inserted-image-id=\"{inserted_image_id}\"]")
        || change.original_text_hash.is_some()
        || change.original_src_hash.is_some()
        || change.original_style_hash.is_some()
        || change.text.is_some()
        || change.html.is_some()
        || change.text_align.is_some()
        || change.edit_role.is_some()
        || change.picture_sources.is_some()
    {
        return Err(AppError::InvalidParams);
    }
    if change.deleted {
        if change.src.is_some()
            || change.alt.is_some()
            || change.left_permille.is_some()
            || change.top_permille.is_some()
            || change.width_permille.is_some()
            || change.height_permille.is_some()
        {
            return Err(AppError::InvalidParams);
        }
        return Ok(change.clone());
    }
    if change.src.as_deref().filter(|value| !value.is_empty()).is_none() || change.alt.is_none() {
        return Err(AppError::InvalidParams);
    }
    let (left, top, width, height) = (
        change.left_permille.ok_or(AppError::InvalidParams)?,
        change.top_permille.ok_or(AppError::InvalidParams)?,
        change.width_permille.ok_or(AppError::InvalidParams)?,
        change.height_permille.ok_or(AppError::InvalidParams)?,
    );
    if !(1..=1000).contains(&width)
        || !(1..=1000).contains(&height)
        || left > 1000
        || top > 1000
        || left.checked_add(width).filter(|value| *value <= 1000).is_none()
        || top.checked_add(height).filter(|value| *value <= 1000).is_none()
    {
        return Err(AppError::InvalidParams);
    }
    validate_html_edit_asset_reference(library_root, artifact_edit_id, change.src.as_deref().expect("checked above"))?;
    Ok(change.clone())
}

fn normalize_image_change(
    library_root: &Path,
    artifact_edit_id: &str,
    change: &HtmlEditChange,
) -> Result<HtmlEditChange, AppError> {
    if change.original_text_hash.is_some()
        || change.original_style_hash.is_some()
        || change.original_src_hash.as_deref().filter(|hash| !hash.is_empty()).is_none()
        || change.text.is_some()
        || change.html.is_some()
        || change.text_align.is_some()
        || change.edit_role.is_some()
        || change.src.as_deref().filter(|src| !src.is_empty()).is_none()
    {
        return Err(AppError::InvalidParams);
    }
    validate_html_edit_asset_reference(
        library_root,
        artifact_edit_id,
        change.src.as_deref().expect("checked above"),
    )?;
    if let Some(sources) = &change.picture_sources {
        if sources.is_empty()
            || sources.iter().enumerate().any(|(index, source)| {
                source.index != index as u32 || source.original_srcset_hash.trim().is_empty()
            })
        {
            return Err(AppError::InvalidParams);
        }
    }
    Ok(change.clone())
}

fn normalize_background_image_change(
    library_root: &Path,
    artifact_edit_id: &str,
    change: &HtmlEditChange,
) -> Result<HtmlEditChange, AppError> {
    if change.original_text_hash.is_some()
        || change.original_src_hash.is_some()
        || change.original_style_hash.as_deref().filter(|hash| !hash.is_empty()).is_none()
        || change.text.is_some()
        || change.alt.is_some()
        || change.html.is_some()
        || change.text_align.is_some()
        || change.edit_role.is_some()
        || change.picture_sources.is_some()
        || change.src.as_deref().filter(|src| !src.is_empty()).is_none()
    {
        return Err(AppError::InvalidParams);
    }
    validate_html_edit_asset_reference(
        library_root,
        artifact_edit_id,
        change.src.as_deref().expect("checked above"),
    )?;
    Ok(change.clone())
}

fn validate_html_edit_asset_reference(
    library_root: &Path,
    artifact_edit_id: &str,
    relative_path: &str,
) -> Result<(), AppError> {
    let asset_prefix = format!(".nutbook/html-edit/assets/{artifact_edit_id}/");
    let leaf = relative_path
        .strip_prefix(&asset_prefix)
        .filter(|leaf| !leaf.is_empty())
        .ok_or(AppError::InvalidParams)?;
    if leaf.contains('/')
        || leaf.contains('\\')
        || leaf == "."
        || leaf == ".."
        || relative_path.starts_with('/')
        || relative_path.contains("..")
    {
        return Err(AppError::InvalidParams);
    }

    let canonical_root = library_root.canonicalize().map_err(|_| AppError::InvalidParams)?;
    let expected_asset_root = canonical_root.join(".nutbook/html-edit/assets");
    let canonical_asset_root = expected_asset_root
        .canonicalize()
        .map_err(|_| AppError::InvalidParams)?;
    // Do not accept an asset root reached through a symlink.  Merely checking
    // the final asset's parent would otherwise allow the artifact directory to
    // resolve outside the library while still comparing equal to itself.
    if canonical_asset_root != expected_asset_root {
        return Err(AppError::InvalidParams);
    }
    let expected_asset_directory = expected_asset_root.join(artifact_edit_id);
    let canonical_asset_directory = expected_asset_directory
        .canonicalize()
        .map_err(|_| AppError::InvalidParams)?;
    if canonical_asset_directory != expected_asset_directory
        || canonical_asset_directory.parent() != Some(canonical_asset_root.as_path())
    {
        return Err(AppError::InvalidParams);
    }
    let canonical_asset = canonical_root
        .join(relative_path)
        .canonicalize()
        .map_err(|_| AppError::InvalidParams)?;
    if canonical_asset.parent() != Some(canonical_asset_directory.as_path()) {
        return Err(AppError::InvalidParams);
    }
    let metadata = fs::metadata(&canonical_asset).map_err(|_| AppError::InvalidParams)?;
    if !metadata.is_file() || metadata.len() > HTML_EDIT_ASSET_MAX_BYTES {
        return Err(AppError::InvalidParams);
    }
    let mut file = fs::File::open(&canonical_asset).map_err(|_| AppError::InvalidParams)?;
    let header = read_html_edit_asset_header(&mut file).map_err(|_| AppError::InvalidParams)?;
    if detect_html_edit_image_type(&header).is_none() {
        return Err(AppError::InvalidParams);
    }
    Ok(())
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
    patch.changes.retain(|field_id, change| {
        normalize_html_edit_change(library_root, artifact_edit_id, field_id, change)
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
