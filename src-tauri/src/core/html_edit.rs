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
    HTML_EDIT_COMMIT_MAX_BYTES,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use chrono::Local;
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

/// The file-write equivalent of a patch save.  All mutations are validated
/// before a journal is written, so a failed request cannot partially rewrite a
/// user document.
#[derive(Debug, Clone)]
pub struct HtmlEditCommit {
    pub library_root: PathBuf,
    pub file_path: PathBuf,
    pub artifact_edit_id: String,
    pub expected_file_hash: String,
    pub expected_modified_at: i64,
    pub changes: BTreeMap<String, HtmlEditChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HtmlEditCommitResponse {
    pub source_file_hash: String,
    pub source_modified_at: i64,
    pub source_size: u64,
    pub normalized_changes: BTreeMap<String, HtmlEditChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HtmlEditCommitJournal {
    version: u32,
    source_relative_path: String,
    artifact_edit_id: String,
    old_hash: String,
    new_hash: String,
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
    _artifact_edit_id: &str,
    relative_path: &str,
) -> Result<PathBuf, AppError> {
    let mut segments = relative_path.split('/');
    if segments.next() != Some(".nutbook")
        || segments.next() != Some("html-edit")
        || segments.next() != Some("assets")
    {
        return Err(AppError::InvalidParams);
    }
    let asset_edit_id = segments.next().ok_or(AppError::InvalidParams)?;
    let leaf = segments.next().filter(|leaf| !leaf.is_empty()).ok_or(AppError::InvalidParams)?;
    if segments.next().is_some()
        || leaf.contains('\\')
        || leaf == "."
        || leaf == ".."
        || relative_path.contains("..")
    {
        return Err(AppError::InvalidParams);
    }
    validate_artifact_edit_id(asset_edit_id)?;

    let canonical_root = library_root.canonicalize().map_err(|_| AppError::InvalidParams)?;
    let expected_asset_root = canonical_root.join(".nutbook/html-edit/assets");
    let canonical_asset_root = expected_asset_root.canonicalize().map_err(|_| AppError::InvalidParams)?;
    if canonical_asset_root != expected_asset_root {
        return Err(AppError::InvalidParams);
    }
    let expected_dir = expected_asset_root.join(asset_edit_id);
    let canonical_dir = expected_dir.canonicalize().map_err(|_| AppError::InvalidParams)?;
    if canonical_dir != expected_dir || canonical_dir.parent() != Some(canonical_asset_root.as_path()) {
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

/// Applies a canonical patch to the current source bytes and makes the source
/// file the durable state.  This deliberately works on a small token stream
/// instead of serializing a browser DOM: scripts, comments, doctype, unknown
/// attributes and untouched whitespace remain byte-for-byte intact.
pub fn commit_html_edit_for_file(
    commit: &HtmlEditCommit,
) -> Result<HtmlEditCommitResponse, AppError> {
    validate_artifact_edit_id(&commit.artifact_edit_id)?;
    recover_html_edit_commit_journal(&commit.library_root)?;
    let source_relative_path = library_relative_path(&commit.library_root, &commit.file_path)?;
    let bytes = fs::read(&commit.file_path).map_err(|_| AppError::IoError)?;
    let metadata = fs::metadata(&commit.file_path).map_err(|_| AppError::IoError)?;
    let old_hash = content_hash_bytes(&bytes);
    if old_hash != commit.expected_file_hash || metadata_modified_at(&metadata)? != commit.expected_modified_at {
        return Err(AppError::EditConflict);
    }
    let source = String::from_utf8(bytes).map_err(|_| AppError::InvalidParams)?;
    let normalized_changes = commit.changes.iter().map(|(id, change)| {
        normalize_html_edit_change(&commit.library_root, &commit.artifact_edit_id, id, change)
            .map(|value| (id.clone(), value))
    }).collect::<Result<BTreeMap<_, _>, _>>()?;
    let rewritten = apply_html_edit_changes_to_source(
        &source,
        &commit.library_root,
        &commit.artifact_edit_id,
        &normalized_changes,
    )?;
    if rewritten.len() > HTML_EDIT_COMMIT_MAX_BYTES { return Err(AppError::AssetTooLarge); }
    let new_hash = content_hash_bytes(rewritten.as_bytes());
    let journal = HtmlEditCommitJournal {
        version: 1,
        source_relative_path: source_relative_path.clone(),
        artifact_edit_id: commit.artifact_edit_id.clone(),
        old_hash,
        new_hash: new_hash.clone(),
    };
    save_html_edit_commit_journal(&commit.library_root, &journal)?;
    atomic_replace_html_file(&commit.file_path, rewritten.as_bytes(), &metadata)?;
    finish_html_edit_commit_cleanup(&commit.library_root, &journal)?;
    let saved_metadata = fs::metadata(&commit.file_path).map_err(|_| AppError::IoError)?;
    Ok(HtmlEditCommitResponse {
        source_file_hash: new_hash,
        source_modified_at: metadata_modified_at(&saved_metadata)?,
        source_size: saved_metadata.len(),
        normalized_changes,
    })
}

/// Conflict copies never overwrite the externally modified source. They still
/// require schema, asset and unique-target validation, but intentionally do
/// not require its old field hashes: the copy is the user's recovery branch.
pub fn save_html_edit_conflict_copy_for_file(commit: &HtmlEditCommit) -> Result<PathBuf, AppError> {
    validate_artifact_edit_id(&commit.artifact_edit_id)?;
    let source = String::from_utf8(fs::read(&commit.file_path).map_err(|_| AppError::IoError)?).map_err(|_| AppError::InvalidParams)?;
    let normalized = commit.changes.iter().map(|(id, change)| normalize_html_edit_change(&commit.library_root, &commit.artifact_edit_id, id, change).map(|value| (id.clone(), value))).collect::<Result<BTreeMap<_, _>, _>>()?;
    let rewritten = apply_html_edit_changes_to_source(&source, &commit.library_root, &commit.artifact_edit_id, &normalized)?;
    if rewritten.len() > HTML_EDIT_COMMIT_MAX_BYTES { return Err(AppError::AssetTooLarge); }
    let parent = commit.file_path.parent().ok_or(AppError::IoError)?;
    let stem = commit.file_path.file_stem().and_then(|value| value.to_str()).ok_or(AppError::InvalidParams)?;
    let timestamp = Local::now().format("%Y%m%d-%H%M%S");
    let target = parent.join(format!("{stem}.nutbook-conflict-{timestamp}.html"));
    if target.exists() { return Err(AppError::EditConflict); }
    atomic_replace_new_html_file(&target, rewritten.as_bytes())?;
    Ok(target)
}

fn finish_html_edit_commit_cleanup(library_root: &Path, journal: &HtmlEditCommitJournal) -> Result<(), AppError> {
    let mut manifest = load_html_edit_manifest(library_root)?;
    if manifest.entries.get(&journal.source_relative_path)
        .is_some_and(|entry| entry.artifact_edit_id == journal.artifact_edit_id) {
        manifest.entries.remove(&journal.source_relative_path);
        save_html_edit_manifest(library_root, &manifest)?;
    }
    let patch = patch_path(library_root, &journal.artifact_edit_id)?;
    if patch.exists() { fs::remove_file(&patch).map_err(|_| AppError::IoError)?; }
    let path = commit_journal_path(library_root);
    if path.exists() { fs::remove_file(path).map_err(|_| AppError::IoError)?; }
    Ok(())
}

pub fn recover_html_edit_commit_journal(library_root: &Path) -> Result<(), AppError> {
    let path = commit_journal_path(library_root);
    if !path.exists() { return Ok(()); }
    let journal: HtmlEditCommitJournal = serde_json::from_slice(&fs::read(&path).map_err(|_| AppError::IoError)?)
        .map_err(|_| AppError::IoError)?;
    let source = library_root.join(&journal.source_relative_path);
    let hash = fs::read(&source).map(|bytes| content_hash_bytes(&bytes)).map_err(|_| AppError::IoError)?;
    if hash == journal.new_hash { return finish_html_edit_commit_cleanup(library_root, &journal); }
    if hash == journal.old_hash { fs::remove_file(path).map_err(|_| AppError::IoError)?; return Ok(()); }
    // A third hash means another application changed the file after an
    // interrupted commit. Preserve both its bytes and the journal for manual
    // recovery rather than guessing which version to delete.
    Err(AppError::EditConflict)
}

fn commit_journal_path(library_root: &Path) -> PathBuf { html_edit_root(library_root).join("commit-pending.json") }
fn save_html_edit_commit_journal(library_root: &Path, journal: &HtmlEditCommitJournal) -> Result<(), AppError> {
    let root = html_edit_root(library_root); fs::create_dir_all(&root).map_err(|_| AppError::IoError)?;
    atomic_write_json(&commit_journal_path(library_root), journal)
}

fn atomic_replace_html_file(path: &Path, bytes: &[u8], original: &fs::Metadata) -> Result<(), AppError> {
    let parent = path.parent().ok_or(AppError::IoError)?;
    let nonce = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|_| AppError::InternalError)?.as_nanos();
    let temporary = parent.join(format!(".nutbook-html-commit-{nonce}.tmp"));
    {
        let mut output = fs::OpenOptions::new().write(true).create_new(true).open(&temporary).map_err(|_| AppError::IoError)?;
        output.set_permissions(original.permissions()).map_err(|_| AppError::IoError)?;
        output.write_all(bytes).map_err(|_| AppError::IoError)?;
        output.sync_all().map_err(|_| AppError::IoError)?;
    }
    fs::rename(&temporary, path).map_err(|_| AppError::IoError)?;
    #[cfg(unix)] { fs::File::open(parent).and_then(|dir| dir.sync_all()).map_err(|_| AppError::IoError)?; }
    Ok(())
}

fn atomic_replace_new_html_file(path: &Path, bytes: &[u8]) -> Result<(), AppError> {
    let parent = path.parent().ok_or(AppError::IoError)?;
    let nonce = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|_| AppError::InternalError)?.as_nanos();
    let temporary = parent.join(format!(".nutbook-html-conflict-{nonce}.tmp"));
    let mut output = fs::OpenOptions::new().write(true).create_new(true).open(&temporary).map_err(|_| AppError::IoError)?;
    output.write_all(bytes).map_err(|_| AppError::IoError)?; output.sync_all().map_err(|_| AppError::IoError)?;
    fs::rename(&temporary, path).map_err(|_| AppError::IoError)?;
    #[cfg(unix)] { fs::File::open(parent).and_then(|dir| dir.sync_all()).map_err(|_| AppError::IoError)?; }
    Ok(())
}

#[derive(Debug, Clone)]
struct HtmlElementSpan { name: String, open_start: usize, open_end: usize, inner_start: usize, inner_end: usize, close_end: usize }

fn apply_html_edit_changes_to_source(source: &str, library_root: &Path, artifact_id: &str, changes: &BTreeMap<String, HtmlEditChange>) -> Result<String, AppError> {
    let mut edits: Vec<(usize, usize, String)> = Vec::new();
    let mut inserted = Vec::new();
    for (field_id, change) in changes {
        if matches!(change.change_type, HtmlEditChangeType::InsertedImage) {
            if !change.deleted { inserted.push((field_id.as_str(), change)); }
            continue;
        }
        let target = find_unique_data_id(source, field_id)?;
        match change.change_type {
            HtmlEditChangeType::Text => {
                if target.name.is_empty() || attribute_value(&source[target.open_start..target.open_end], "data-editable").as_deref() != Some("text") { return Err(AppError::EditConflict); }
                edits.push((target.inner_start, target.inner_end, escape_html_text(change.text.as_deref().ok_or(AppError::InvalidParams)?)));
            }
            HtmlEditChangeType::RichText => {
                if attribute_value(&source[target.open_start..target.open_end], "data-editable").as_deref() != Some("rich-text") { return Err(AppError::EditConflict); }
                let role = change.edit_role.as_ref().ok_or(AppError::InvalidParams)?;
                let role_text = match role { HtmlEditRole::Short => "short", HtmlEditRole::Content => "content", HtmlEditRole::Plain => return Err(AppError::InvalidParams) };
                if attribute_value(&source[target.open_start..target.open_end], "data-edit-role").as_deref() != Some(role_text) { return Err(AppError::EditConflict); }
                let mut tag = source[target.open_start..target.open_end].to_string();
                if let Some(align) = &change.text_align { tag = set_html_attribute(&tag, "style", &merge_text_align(attribute_value(&tag, "style").unwrap_or_default().as_str(), align)); }
                edits.push((target.open_start, target.open_end, tag));
                edits.push((target.inner_start, target.inner_end, change.html.clone().ok_or(AppError::InvalidParams)?));
            }
            HtmlEditChangeType::Image => {
                if target.name != "img" || attribute_value(&source[target.open_start..target.open_end], "data-editable").as_deref() != Some("image") { return Err(AppError::EditConflict); }
                let source_tag = &source[target.open_start..target.open_end];
                let mut tag = source_tag.to_string();
                let data_url = if let Some(path) = change.src.as_deref() { Some(html_edit_asset_data_url(library_root, artifact_id, path)?) } else { None };
                // Keep the imported asset's stable identity in the document as
                // well as its portable data URL.  Runtime history must not
                // infer an ordinary image replacement solely from a transient
                // localhost URL, unlike inserted-image frames which already
                // persist this identity.
                if let Some(data_url) = &data_url {
                    tag = set_html_attribute(&tag, "src", data_url);
                    tag = set_html_attribute(&tag, "data-nutbook-asset-relative-path", change.src.as_deref().expect("data URL requires source path"));
                }
                if let Some(alt) = &change.alt { tag = set_html_attribute(&tag, "alt", alt); }
                if is_image_crop_reset(change) {
                    tag = clear_image_crop_attributes(&tag);
                    if let Some(frame) = crop_frame_parent(source, &target)? {
                        edits.push((frame.open_start, frame.open_end, String::new()));
                        edits.push((frame.inner_end, frame.close_end, String::new()));
                    }
                } else if let Some((scale, x, y, width, height)) = image_crop(change)? {
                    tag = apply_image_crop_attributes(&tag, scale, x, y);
                    if attribute_value(source_tag, "data-nutbook-crop-image").as_deref() != Some("1") {
                        let wrapper = format!("<span data-nutbook-crop-frame=\"1\" style=\"display:inline-block;position:relative;overflow:hidden;box-sizing:border-box;vertical-align:top;width:{width}px;height:{height}px\">");
                        tag = format!("{wrapper}{tag}");
                        edits.push((target.open_end, target.open_end, "</span>".to_string()));
                    }
                }
                edits.push((target.open_start, target.open_end, tag));
                if let Some(picture_sources) = &change.picture_sources {
                    let data_url = data_url.as_deref().ok_or(AppError::InvalidParams)?;
                    let sources = direct_picture_sources(source, &target)?;
                    if sources.len() != picture_sources.len() { return Err(AppError::EditConflict); }
                    for span in &sources {
                        edits.push((span.open_start, span.open_end, set_html_attribute(&source[span.open_start..span.open_end], "srcset", &data_url)));
                    }
                }
            }
            HtmlEditChangeType::BackgroundImage => {
                if attribute_value(&source[target.open_start..target.open_end], "data-editable").as_deref() != Some("background-image") { return Err(AppError::EditConflict); }
                let style = attribute_value(&source[target.open_start..target.open_end], "style").unwrap_or_default();
                let mut next_style = style;
                if let Some(path) = change.src.as_deref() { next_style = replace_background_image_declaration(&next_style, &html_edit_asset_data_url(library_root, artifact_id, path)?); }
                if let Some((scale, x, y, _, _)) = image_crop(change)? { next_style = merge_background_crop(&next_style, scale, x, y); }
                edits.push((target.open_start, target.open_end, set_html_attribute(&source[target.open_start..target.open_end], "style", &next_style)));
            }
            HtmlEditChangeType::InsertedImage => unreachable!(),
        }
    }
    if !inserted.is_empty() || changes.values().any(|change| matches!(change.change_type, HtmlEditChangeType::InsertedImage)) {
        if let Some(root) = find_unique_attribute(source, "data-nutbook-inserted-image-layer", "1")? { edits.push((root.open_start, root.close_end, String::new())); }
        let body = find_unique_tag(source, "body")?;
        let body_tag = &source[body.open_start..body.open_end];
        let body_style = attribute_value(body_tag, "style").unwrap_or_default();
        if !body_style.split(';').any(|declaration| declaration.trim_start().starts_with("position:")) {
            edits.push((body.open_start, body.open_end, set_html_attribute(body_tag, "style", &format!("{}{}position:relative", body_style.trim_end_matches(';'), if body_style.trim().is_empty() { "" } else { ";" }))));
        }
        // This is final document content, not editor chrome. Keep only the
        // geometry and hit-testing constraints Nutbook owns; page-authored
        // visual rules for images intentionally continue to apply.
        let mut html = String::from("<div data-nutbook-inserted-image-layer=\"1\" aria-hidden=\"true\" style=\"position:absolute;left:0;top:0;width:100%;height:100%;z-index:2147483645;pointer-events:none\">");
        for (id, change) in inserted {
            let src = html_edit_asset_data_url(library_root, artifact_id, change.src.as_deref().ok_or(AppError::InvalidParams)?)?;
            let canvas_width = change.canvas_width.ok_or(AppError::InvalidParams)?;
            let canvas_height = change.canvas_height.ok_or(AppError::InvalidParams)?;
            let crop = inserted_image_crop(change)?;
            let (crop_attributes, object_fit, transform) = if let Some((scale, x, y)) = crop {
                let factor = (f64::from(scale) - 1000.0) / 1000.0;
                let translate_x = (500.0 - f64::from(x)) / 1000.0 * factor * 100.0;
                let translate_y = (500.0 - f64::from(y)) / 1000.0 * factor * 100.0;
                (format!(" data-nutbook-crop-scale=\"{scale}\" data-nutbook-crop-x=\"{x}\" data-nutbook-crop-y=\"{y}\""), "contain", format!("translate({translate_x:.3}%,{translate_y:.3}%) scale({:.3})", f64::from(scale) / 1000.0))
            } else { (String::new(), "cover", "none".to_string()) };
            // The runtime records frame geometry in permille.  Emit that same
            // responsive geometry into the saved document instead of freezing
            // the frame in the window's old pixel dimensions.  This is also
            // the coordinate system used when the runtime rehydrates it.
            html.push_str(&format!("<span data-nutbook-inserted-image-frame=\"{}\" style=\"position:absolute;left:{}%;top:{}%;width:{}%;height:{}%;overflow:hidden\"><img data-nutbook-inserted-image-id=\"{}\" data-nutbook-asset-relative-path=\"{}\" data-nutbook-left-permille=\"{}\" data-nutbook-top-permille=\"{}\" data-nutbook-width-permille=\"{}\" data-nutbook-height-permille=\"{}\" data-nutbook-canvas-width=\"{}\" data-nutbook-canvas-height=\"{}\"{} src=\"{}\" alt=\"{}\" style=\"position:absolute;inset:0;display:block;width:100%;height:100%;max-width:none;box-sizing:border-box;border:0;box-shadow:none;object-fit:{};transform-origin:center;transform:{}\"></span>", escape_html_attr(id), f64::from(change.left_permille.unwrap_or(0)) / 10.0, f64::from(change.top_permille.unwrap_or(0)) / 10.0, f64::from(change.width_permille.unwrap_or(0)) / 10.0, f64::from(change.height_permille.unwrap_or(0)) / 10.0, escape_html_attr(id), escape_html_attr(change.src.as_deref().unwrap_or("")), change.left_permille.unwrap_or(0), change.top_permille.unwrap_or(0), change.width_permille.unwrap_or(0), change.height_permille.unwrap_or(0), canvas_width, canvas_height, crop_attributes, escape_html_attr(&src), escape_html_attr(change.alt.as_deref().unwrap_or("")), object_fit, transform));
        }
        html.push_str("</div>");
        edits.push((body.inner_end, body.inner_end, html));
    }
    edits.sort_by(|a, b| b.0.cmp(&a.0));
    let mut output = source.to_string(); let mut last = source.len() + 1;
    for (start, end, value) in edits { if start > end || end > last { return Err(AppError::EditConflict); } output.replace_range(start..end, &value); last = start; }
    Ok(output)
}

fn html_edit_asset_data_url(root: &Path, artifact: &str, relative: &str) -> Result<String, AppError> {
    validate_html_edit_asset_reference(root, artifact, relative)?;
    let path = resolve_html_edit_asset_path(root, artifact, relative)?;
    let bytes = fs::read(path).map_err(|_| AppError::IoError)?;
    if bytes.len() as u64 > HTML_EDIT_ASSET_MAX_BYTES { return Err(AppError::AssetTooLarge); }
    let header = &bytes[..bytes.len().min(32)];
    let (media_type, _) = detect_html_edit_image_type(header).ok_or(AppError::AssetInvalidType)?;
    Ok(format!("data:{media_type};base64,{}", BASE64.encode(bytes)))
}

fn escape_html_text(value: &str) -> String { value.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;") }
fn escape_html_attr(value: &str) -> String { escape_html_text(value).replace('"', "&quot;") }
fn merge_text_align(style: &str, align: &crate::models::HtmlEditTextAlign) -> String {
    let value = match align { crate::models::HtmlEditTextAlign::Left => "left", crate::models::HtmlEditTextAlign::Center => "center", crate::models::HtmlEditTextAlign::Right => "right" };
    let declarations = style.split(';').filter(|part| !part.trim_start().starts_with("text-align:")).collect::<Vec<_>>().join(";");
    format!("{}{}text-align:{}", declarations.trim_end_matches(';'), if declarations.trim().is_empty() { "" } else { ";" }, value)
}
fn replace_background_image_declaration(style: &str, data_url: &str) -> String {
    let replacement = format!("background-image:url('{}')", data_url.replace('\'', "%27"));
    let lower = style.to_ascii_lowercase();
    if let Some(start) = lower.find("background-image:") {
        let end = style[start..].find(';').map(|offset| start + offset + 1).unwrap_or(style.len());
        format!("{}{}{}", &style[..start], replacement, &style[end..])
    } else { format!("{}{}{}", style.trim_end_matches(';'), if style.trim().is_empty() { "" } else { ";" }, replacement) }
}
fn replace_style_declaration(style: &str, property: &str, value: &str) -> String {
    let property = property.to_ascii_lowercase();
    let declarations = style.split(';').filter(|part| !part.trim_start().to_ascii_lowercase().starts_with(&format!("{property}:"))).collect::<Vec<_>>().join(";");
    format!("{}{}{}:{}", declarations.trim_end_matches(';'), if declarations.trim().is_empty() { "" } else { ";" }, property, value)
}
fn apply_image_crop_attributes(tag: &str, scale: u16, x: u16, y: u16) -> String {
    let mut style = attribute_value(tag, "style").unwrap_or_default();
    let crop_position = format!("{}% {}% !important", f64::from(x) / 10.0, f64::from(y) / 10.0);
    for (property, value) in [
        // This must match the runtime crop writer. The frame owns geometry;
        // do not reset author styling such as filters, borders, or radii when
        // persisting a normal-image crop.
        ("position", "absolute !important".to_string()), ("inset", "0 !important".to_string()), ("display", "block !important".to_string()), ("box-sizing", "border-box !important".to_string()), ("width", "100% !important".to_string()), ("height", "100% !important".to_string()), ("max-width", "none !important".to_string()), ("margin", "0 !important".to_string()), ("object-fit", "cover !important".to_string()), ("object-position", crop_position.clone()), ("transform-origin", crop_position),
        ("transform", format!("scale({:.3}) !important", f64::from(scale) / 1000.0)),
    ] { style = replace_style_declaration(&style, property, &value); }
    let mut output = set_html_attribute(tag, "style", &style);
    output = set_html_attribute(&output, "data-nutbook-crop-image", "1");
    output = set_html_attribute(&output, "data-nutbook-crop-model", "v2");
    output = set_html_attribute(&output, "data-nutbook-crop-scale", &scale.to_string());
    output = set_html_attribute(&output, "data-nutbook-crop-x", &x.to_string());
    set_html_attribute(&output, "data-nutbook-crop-y", &y.to_string())
}
fn merge_background_crop(style: &str, scale: u16, x: u16, y: u16) -> String {
    let mut output = replace_style_declaration(style, "background-size", &format!("{}% auto", scale / 10));
    output = replace_style_declaration(&output, "background-position", &format!("{}% {}%", x / 10, y / 10));
    output
}
/// For `image` and `background-image` only, the existing geometry fields are
/// a compact crop tuple: scale, focal x/y, then the first frame's pixel size.
/// Inserted-image keeps its independent left/top/width/height schema.
fn image_crop(change: &HtmlEditChange) -> Result<Option<(u16, u16, u16, u32, u32)>, AppError> {
    let values = (change.left_permille, change.top_permille, change.width_permille, change.canvas_width, change.canvas_height);
    if values == (None, None, None, None, None) { return Ok(None); }
    if is_image_crop_reset(change) { return Ok(None); }
    if change.height_permille.is_some() { return Err(AppError::InvalidParams); }
    let (scale, x, y, width, height) = (values.0.ok_or(AppError::InvalidParams)?, values.1.ok_or(AppError::InvalidParams)?, values.2.ok_or(AppError::InvalidParams)?, values.3.ok_or(AppError::InvalidParams)?, values.4.ok_or(AppError::InvalidParams)?);
    if !(1000..=4000).contains(&scale) || x > 1000 || y > 1000 || width == 0 || height == 0 || width > 100_000 || height > 100_000 { return Err(AppError::InvalidParams); }
    Ok(Some((scale, x, y, width, height)))
}
fn is_image_crop_reset(change: &HtmlEditChange) -> bool {
    change.left_permille == Some(0) && change.top_permille == Some(0) && change.width_permille == Some(0)
        && change.height_permille.is_none() && change.canvas_width.is_none() && change.canvas_height.is_none()
}
/// Inserted images use their geometry fields for the outer frame. Their
/// in-frame crop is a small, versioned token carried in the otherwise unused
/// style-hash slot, so older sidecars remain valid without widening the patch
/// surface for arbitrary style input.
fn inserted_image_crop(change: &HtmlEditChange) -> Result<Option<(u16, u16, u16)>, AppError> {
    let Some(token) = change.original_style_hash.as_deref() else { return Ok(None); };
    let values = token.strip_prefix("nutbook-inserted-crop:v1:").ok_or(AppError::InvalidParams)?
        .split(':').map(str::parse::<u16>).collect::<Result<Vec<_>, _>>().map_err(|_| AppError::InvalidParams)?;
    if values.len() != 3 || !(1000..=4000).contains(&values[0]) || values[1] > 1000 || values[2] > 1000 { return Err(AppError::InvalidParams); }
    Ok(Some((values[0], values[1], values[2])))
}
fn crop_frame_parent(source: &str, target: &HtmlElementSpan) -> Result<Option<HtmlElementSpan>, AppError> {
    Ok(html_open_elements(source)?.into_iter().filter(|span| {
        span.name == "span" && span.open_start < target.open_start && span.inner_start <= target.open_start && span.inner_end >= target.close_end
            && attribute_value(&source[span.open_start..span.open_end], "data-nutbook-crop-frame").as_deref() == Some("1")
    }).max_by_key(|span| span.open_start))
}
fn remove_style_declarations(style: &str, properties: &[&str]) -> String {
    style.split(';').filter(|part| {
        let name = part.split_once(':').map(|(name, _)| name.trim().to_ascii_lowercase()).unwrap_or_default();
        !properties.iter().any(|property| *property == name)
    }).filter(|part| !part.trim().is_empty()).collect::<Vec<_>>().join(";")
}
fn clear_image_crop_attributes(tag: &str) -> String {
    let style = remove_style_declarations(&attribute_value(tag, "style").unwrap_or_default(), &["all", "position", "inset", "left", "top", "display", "box-sizing", "width", "height", "max-width", "margin", "padding", "border", "border-radius", "box-shadow", "filter", "object-fit", "object-position", "transform-origin", "transform"]);
    let mut output = set_html_attribute(tag, "style", &style);
    for attribute in ["data-nutbook-crop-image", "data-nutbook-crop-model", "data-nutbook-crop-scale", "data-nutbook-crop-x", "data-nutbook-crop-y"] { output = remove_html_attribute(&output, attribute); }
    output
}

fn find_unique_data_id(source: &str, id: &str) -> Result<HtmlElementSpan, AppError> { find_unique_attribute(source, "data-id", id)?.ok_or(AppError::EditConflict) }
fn find_unique_tag(source: &str, name: &str) -> Result<HtmlElementSpan, AppError> {
    let values = html_open_elements(source)?.into_iter().filter(|span| span.name == name).collect::<Vec<_>>();
    if values.len() == 1 { Ok(values.into_iter().next().expect("one")) } else { Err(AppError::EditConflict) }
}
fn find_unique_attribute(source: &str, attribute: &str, value: &str) -> Result<Option<HtmlElementSpan>, AppError> {
    let values = html_open_elements(source)?.into_iter().filter(|span| attribute_value(&source[span.open_start..span.open_end], attribute).as_deref() == Some(value)).collect::<Vec<_>>();
    if values.len() > 1 { Err(AppError::EditConflict) } else { Ok(values.into_iter().next()) }
}

fn html_open_elements(source: &str) -> Result<Vec<HtmlElementSpan>, AppError> {
    let mut results = Vec::new(); let mut stack: Vec<(String, usize, usize)> = Vec::new(); let mut cursor = 0;
    while let Some((start, end, tag)) = next_html_tag(source, cursor) {
        cursor = end;
        if tag.starts_with("<!--") || tag.starts_with("<!") || tag.starts_with("<?") { continue; }
        let trimmed = tag.trim_matches(|c| c == '<' || c == '>').trim();
        if let Some(rest) = trimmed.strip_prefix('/') {
            let name = tag_name(rest); if name.is_empty() { continue; }
            if let Some(index) = stack.iter().rposition(|(open, _, _)| open == &name) {
                let (opened, open_start, open_end) = stack.remove(index);
                results.push(HtmlElementSpan { name: opened, open_start, open_end, inner_start: open_end, inner_end: start, close_end: end });
            }
            continue;
        }
        let name = tag_name(trimmed); if name.is_empty() { continue; }
        if is_void_html_tag(&name) || trimmed.ends_with('/') { results.push(HtmlElementSpan { name, open_start: start, open_end: end, inner_start: end, inner_end: end, close_end: end }); }
        else {
            let raw_text_name = matches!(name.as_str(), "script" | "style").then_some(name.clone());
            stack.push((name, start, end));
            // `<` is ordinary script/style text, not HTML markup. Skipping to
            // the matching close tag keeps the scanner deliberately local and
            // prevents a script string from changing editable-element spans.
            if let Some(raw_name) = raw_text_name {
                let close = format!("</{raw_name}");
                if let Some(offset) = source[end..].to_ascii_lowercase().find(&close) {
                    cursor = end + offset;
                } else {
                    return Err(AppError::EditConflict);
                }
            }
        }
    }
    Ok(results)
}

fn next_html_tag(source: &str, from: usize) -> Option<(usize, usize, &str)> {
    let bytes = source.as_bytes(); let mut start = from;
    while start < bytes.len() && bytes[start] != b'<' { start += 1; }
    if start >= bytes.len() { return None; }
    if source[start..].starts_with("<!--") { let end = source[start + 4..].find("-->")? + start + 7; return Some((start, end, &source[start..end])); }
    let mut index = start + 1; let mut quote = 0u8;
    while index < bytes.len() {
        let byte = bytes[index];
        if quote != 0 { if byte == quote { quote = 0; } }
        else if byte == b'\'' || byte == b'"' { quote = byte; }
        else if byte == b'>' { let end = index + 1; return Some((start, end, &source[start..end])); }
        index += 1;
    }
    None
}
fn tag_name(value: &str) -> String { value.trim_start().chars().take_while(|character| character.is_ascii_alphanumeric() || *character == '-' || *character == ':').collect::<String>().to_ascii_lowercase() }
fn is_void_html_tag(name: &str) -> bool { matches!(name, "area"|"base"|"br"|"col"|"embed"|"hr"|"img"|"input"|"link"|"meta"|"param"|"source"|"track"|"wbr") }

fn attribute_value(tag: &str, wanted: &str) -> Option<String> {
    let bytes = tag.as_bytes(); let mut index = 1; let wanted = wanted.to_ascii_lowercase();
    while index < bytes.len() && !bytes[index].is_ascii_whitespace() && bytes[index] != b'>' { index += 1; }
    while index < bytes.len() {
        while index < bytes.len() && bytes[index].is_ascii_whitespace() { index += 1; }
        if index >= bytes.len() || bytes[index] == b'>' || bytes[index] == b'/' { break; }
        let begin = index; while index < bytes.len() && !bytes[index].is_ascii_whitespace() && !matches!(bytes[index], b'='|b'>'|b'/') { index += 1; }
        let name = tag[begin..index].to_ascii_lowercase(); while index < bytes.len() && bytes[index].is_ascii_whitespace() { index += 1; }
        let mut value = String::new(); if index < bytes.len() && bytes[index] == b'=' { index += 1; while index < bytes.len() && bytes[index].is_ascii_whitespace() { index += 1; } let quote = bytes.get(index).copied().filter(|byte| *byte == b'\'' || *byte == b'"'); if let Some(quote) = quote { index += 1; let value_start = index; while index < bytes.len() && bytes[index] != quote { index += 1; } value = tag[value_start..index].to_string(); if index < bytes.len() { index += 1; } } else { let value_start = index; while index < bytes.len() && !bytes[index].is_ascii_whitespace() && bytes[index] != b'>' { index += 1; } value = tag[value_start..index].to_string(); } }
        if name == wanted { return Some(html_unescape(&value)); }
    }
    None
}
fn set_html_attribute(tag: &str, wanted: &str, value: &str) -> String {
    // Attribute values are serialized in double quotes; scanner-derived tag
    // boundaries make this a local replacement, never a document-wide regex.
    let bytes = tag.as_bytes(); let mut index = 1;
    while index < bytes.len() && !bytes[index].is_ascii_whitespace() && bytes[index] != b'>' { index += 1; }
    while index < bytes.len() {
        while index < bytes.len() && bytes[index].is_ascii_whitespace() { index += 1; }
        if index >= bytes.len() || bytes[index] == b'>' || bytes[index] == b'/' { break; }
        let attribute_start = index;
        while index < bytes.len() && !bytes[index].is_ascii_whitespace() && !matches!(bytes[index], b'=' | b'>' | b'/') { index += 1; }
        let name = tag[attribute_start..index].to_ascii_lowercase();
        while index < bytes.len() && bytes[index].is_ascii_whitespace() { index += 1; }
        if index >= bytes.len() || bytes[index] != b'=' { continue; }
        index += 1; while index < bytes.len() && bytes[index].is_ascii_whitespace() { index += 1; }
        let value_start = index;
        if matches!(bytes.get(index), Some(b'\'' | b'"')) { let quote = bytes[index]; index += 1; while index < bytes.len() && bytes[index] != quote { index += 1; } if index < bytes.len() { index += 1; } }
        else { while index < bytes.len() && !bytes[index].is_ascii_whitespace() && bytes[index] != b'>' { index += 1; } }
        if name == wanted.to_ascii_lowercase() { return format!("{}{}=\"{}\"{}", &tag[..attribute_start], wanted, escape_html_attr(value), &tag[index..]); }
        if value_start == index { break; }
    }
    let insert = tag.rfind('>').unwrap_or(tag.len()); let insert = if insert > 0 && tag.as_bytes()[insert.saturating_sub(1)] == b'/' { insert - 1 } else { insert }; format!("{} {}=\"{}\"{}", &tag[..insert], wanted, escape_html_attr(value), &tag[insert..])
}
fn remove_html_attribute(tag: &str, wanted: &str) -> String {
    let bytes = tag.as_bytes(); let mut index = 1;
    while index < bytes.len() && !bytes[index].is_ascii_whitespace() && bytes[index] != b'>' { index += 1; }
    while index < bytes.len() {
        while index < bytes.len() && bytes[index].is_ascii_whitespace() { index += 1; }
        if index >= bytes.len() || bytes[index] == b'>' || bytes[index] == b'/' { break; }
        let attribute_start = index;
        while index < bytes.len() && !bytes[index].is_ascii_whitespace() && !matches!(bytes[index], b'=' | b'>' | b'/') { index += 1; }
        let name = tag[attribute_start..index].to_ascii_lowercase();
        while index < bytes.len() && bytes[index].is_ascii_whitespace() { index += 1; }
        if index < bytes.len() && bytes[index] == b'=' { index += 1; while index < bytes.len() && bytes[index].is_ascii_whitespace() { index += 1; } if matches!(bytes.get(index), Some(b'\'' | b'"')) { let quote = bytes[index]; index += 1; while index < bytes.len() && bytes[index] != quote { index += 1; } if index < bytes.len() { index += 1; } } else { while index < bytes.len() && !bytes[index].is_ascii_whitespace() && bytes[index] != b'>' { index += 1; } } }
        if name == wanted.to_ascii_lowercase() { return format!("{}{}", &tag[..attribute_start], &tag[index..]); }
    }
    tag.to_string()
}
fn html_unescape(value: &str) -> String { value.replace("&quot;", "\"").replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&") }

fn direct_picture_sources(source: &str, image: &HtmlElementSpan) -> Result<Vec<HtmlElementSpan>, AppError> {
    let pictures = html_open_elements(source)?.into_iter().filter(|span| span.name == "picture" && span.open_start < image.open_start && span.close_end >= image.close_end).collect::<Vec<_>>();
    if pictures.len() != 1 { return Err(AppError::EditConflict); }
    let picture = &pictures[0];
    let all = html_open_elements(source)?;
    Ok(all.into_iter().filter(|span| span.name == "source" && span.open_start > picture.inner_start && span.open_end < picture.inner_end && !all_has_enclosing_non_direct_source(source, span, picture)).collect())
}
fn all_has_enclosing_non_direct_source(source: &str, span: &HtmlElementSpan, picture: &HtmlElementSpan) -> bool {
    html_open_elements(source).ok().into_iter().flatten().any(|parent| parent.open_start > picture.inner_start && parent.open_start < span.open_start && parent.close_end >= span.close_end && parent.name != "picture")
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
            || change.original_style_hash.is_some()
            || change.left_permille.is_some()
            || change.top_permille.is_some()
            || change.width_permille.is_some()
            || change.height_permille.is_some()
            || change.canvas_width.is_some()
            || change.canvas_height.is_some()
        {
            return Err(AppError::InvalidParams);
        }
        return Ok(change.clone());
    }
    inserted_image_crop(change)?;
    if change.src.as_deref().filter(|value| !value.is_empty()).is_none() || change.alt.is_none() {
        return Err(AppError::InvalidParams);
    }
    let (left, top, width, height) = (
        change.left_permille.ok_or(AppError::InvalidParams)?,
        change.top_permille.ok_or(AppError::InvalidParams)?,
        change.width_permille.ok_or(AppError::InvalidParams)?,
        change.height_permille.ok_or(AppError::InvalidParams)?,
    );
    let (canvas_width, canvas_height) = (
        change.canvas_width.ok_or(AppError::InvalidParams)?,
        change.canvas_height.ok_or(AppError::InvalidParams)?,
    );
    if canvas_width == 0 || canvas_height == 0 || canvas_width > 100_000 || canvas_height > 10_000_000 {
        return Err(AppError::InvalidParams);
    }
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
    {
        return Err(AppError::InvalidParams);
    }
    let crop = image_crop(change)?;
    if change.src.as_deref().filter(|src| !src.is_empty()).is_none() && crop.is_none() { return Err(AppError::InvalidParams); }
    if let Some(src) = change.src.as_deref() { validate_html_edit_asset_reference(library_root, artifact_edit_id, src)?; }
    if change.alt.is_some() && change.src.is_none() { return Err(AppError::InvalidParams); }
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
    {
        return Err(AppError::InvalidParams);
    }
    let crop = image_crop(change)?;
    if change.src.as_deref().filter(|src| !src.is_empty()).is_none() && crop.is_none() { return Err(AppError::InvalidParams); }
    if let Some(src) = change.src.as_deref() { validate_html_edit_asset_reference(library_root, artifact_edit_id, src)?; }
    Ok(change.clone())
}

fn validate_html_edit_asset_reference(
    library_root: &Path,
    _artifact_edit_id: &str,
    relative_path: &str,
) -> Result<(), AppError> {
    // A document can legitimately reference assets imported by an earlier
    // editing session: after Save -> Undo, the undo snapshot restores that
    // earlier asset.  Require a controlled artifact directory, but do not
    // require it to be the *current* session's directory.
    let mut segments = relative_path.split('/');
    if segments.next() != Some(".nutbook")
        || segments.next() != Some("html-edit")
        || segments.next() != Some("assets")
    {
        return Err(AppError::InvalidParams);
    }
    let asset_edit_id = segments.next().ok_or(AppError::InvalidParams)?;
    let leaf = segments.next().filter(|leaf| !leaf.is_empty()).ok_or(AppError::InvalidParams)?;
    if segments.next().is_some() {
        return Err(AppError::InvalidParams);
    }
    validate_artifact_edit_id(asset_edit_id)?;
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
    let expected_asset_directory = expected_asset_root.join(asset_edit_id);
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
