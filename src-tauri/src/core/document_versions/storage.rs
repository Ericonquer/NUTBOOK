mod preview;
pub use preview::PreviewInfo;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs::{self, File, OpenOptions},
    io::{self, Write},
    path::{Path, PathBuf},
};
use uuid::Uuid;

pub const DEFAULT_LIMIT_BYTES: u64 = 500_000_000;
pub const MAX_VERSIONS: usize = 10;
const SCHEMA: u32 = 1;

#[derive(Debug, thiserror::Error)]
pub enum HistoryError {
    #[error("version history IO: {0}")]
    Io(#[from] io::Error),
    #[error("invalid or damaged version history: {0}")]
    Invalid(String),
    #[error(
        "version history quota exceeded (used {used}, required {required}, limit {limit} bytes)"
    )]
    Quota {
        used: u64,
        required: u64,
        limit: u64,
    },
    #[error("document changed during save")]
    Conflict,
    #[error("version history requires recovery before writing: {0}")]
    RecoveryRequired(String),
}
pub type Result<T> = std::result::Result<T, HistoryError>;
fn invalid(message: impl Into<String>) -> HistoryError {
    HistoryError::Invalid(message.into())
}
pub fn digest(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
fn valid_hash(hash: &str) -> bool {
    hash.len() == 64
        && hash
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}
fn valid_id(id: &str) -> bool {
    Uuid::parse_str(id).is_ok_and(|v| v.to_string() == id)
}
fn check_id(id: &str) -> Result<()> {
    if valid_id(id) {
        Ok(())
    } else {
        Err(invalid("invalid UUID"))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "state", rename_all = "kebab-case")]
pub enum Dependency {
    Captured { object: String, bytes: u64 },
    MissingAtSave { reason: String },
    NotCaptured { reason: String },
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Snapshot {
    pub body: String,
    /// Keys are original reference identities, never object-store paths.
    pub dependencies: BTreeMap<String, Dependency>,
}
impl Snapshot {
    fn hashes(&self) -> impl Iterator<Item = &str> {
        std::iter::once(self.body.as_str()).chain(self.dependencies.values().filter_map(
            |d| match d {
                Dependency::Captured { object, .. } => Some(object.as_str()),
                _ => None,
            },
        ))
    }
    fn validate(&self) -> Result<()> {
        if self.hashes().all(valid_hash) {
            Ok(())
        } else {
            Err(invalid("invalid object hash"))
        }
    }
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Version {
    pub id: String,
    pub sequence: u64,
    pub saved_at: String,
    pub kind: String,
    pub snapshot: Snapshot,
    pub restored_from: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestoredDirectory {
    pub path: PathBuf,
    pub operation_id: String,
    pub marker_digest: String,
    pub resources: BTreeMap<String, String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentHead {
    pub schema: u32,
    pub id: String,
    pub canonical_path: PathBuf,
    /// Identity of the last published source file. Atomic replacement changes it.
    pub file_identity: String,
    pub binding_revision: u64,
    pub file_type: String,
    /// The authoritative committed set; deleting a version cannot resurrect it
    /// when a disposable SQLite projection is rebuilt.
    pub versions: Vec<Version>,
    pub next_sequence: u64,
    pub restored_directories: Vec<RestoredDirectory>,
}
impl DocumentHead {
    fn validate(&self) -> Result<()> {
        check_id(&self.id)?;
        if self.schema != SCHEMA
            || !self.canonical_path.is_absolute()
            || self.versions.len() > MAX_VERSIONS
        {
            return Err(invalid("document header"));
        }
        let mut previous = 0;
        let mut ids = BTreeSet::new();
        for v in &self.versions {
            check_id(&v.id)?;
            if v.sequence <= previous || !ids.insert(&v.id) || v.sequence >= self.next_sequence {
                return Err(invalid("version order"));
            }
            v.snapshot.validate()?;
            previous = v.sequence;
        }
        Ok(())
    }
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub schema: u32,
    pub revision: u64,
    pub limit_bytes: u64,
}
impl Default for Settings {
    fn default() -> Self {
        Self {
            schema: SCHEMA,
            revision: 1,
            limit_bytes: DEFAULT_LIMIT_BYTES,
        }
    }
}
#[derive(Debug, Clone, Serialize, Deserialize)]
struct VersionManifest {
    schema: u32,
    document: String,
    binding_revision: u64,
    canonical_path: PathBuf,
    file_identity: String,
    version: Version,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
struct Owner {
    schema: u32,
    id: String,
    store: PathBuf,
    pid: u32,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
struct Journal {
    schema: u32,
    id: String,
    owner: String,
    settings_revision: u64,
    reserved_bytes: u64,
    #[serde(default)]
    object_inventory: BTreeMap<String, u64>,
    #[serde(default)]
    new_target: bool,
    old_hash: String,
    new_hash: String,
    before: DocumentHead,
    after: DocumentHead,
    /// All prepared objects must exist before this record is durable-ready.
    state: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RestorePreparation {
    schema: u32,
    owner: String,
    document: String,
    operation: String,
    path: PathBuf,
    marker: String,
    state: String,
}
/// Persistent lock files are never unlinked: replacing a locked inode would
/// create two owners. The OS releases locks after a process crash.
#[derive(Debug)]
struct OsLock {
    _file: File,
}
impl OsLock {
    fn acquire(path: &Path, nonblocking: bool) -> Result<Option<Self>> {
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(path)?;
        match lock_file(&file, nonblocking) {
            Ok(()) => Ok(Some(Self { _file: file })),
            Err(e) if nonblocking && e.kind() == io::ErrorKind::WouldBlock => Ok(None),
            Err(e) => Err(e.into()),
        }
    }
    fn blocking(path: &Path) -> Result<Self> {
        Self::acquire(path, false)?.ok_or_else(|| invalid("blocking lock unavailable"))
    }
}
#[cfg(unix)]
fn lock_file(file: &File, nonblocking: bool) -> io::Result<()> {
    use std::os::fd::AsRawFd;
    loop {
        let flags = libc::LOCK_EX | if nonblocking { libc::LOCK_NB } else { 0 };
        if unsafe { libc::flock(file.as_raw_fd(), flags) } == 0 {
            return Ok(());
        }
        let e = io::Error::last_os_error();
        if e.kind() != io::ErrorKind::Interrupted {
            return Err(e);
        }
    }
}
#[cfg(windows)]
fn lock_file(file: &File, nonblocking: bool) -> io::Result<()> {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::{
        Storage::FileSystem::{LockFileEx, LOCKFILE_EXCLUSIVE_LOCK, LOCKFILE_FAIL_IMMEDIATELY},
        System::IO::OVERLAPPED,
    };
    let mut overlapped: OVERLAPPED = unsafe { std::mem::zeroed() };
    let flags = LOCKFILE_EXCLUSIVE_LOCK
        | if nonblocking {
            LOCKFILE_FAIL_IMMEDIATELY
        } else {
            0
        };
    if unsafe {
        LockFileEx(
            file.as_raw_handle(),
            flags,
            0,
            u32::MAX,
            u32::MAX,
            &mut overlapped,
        )
    } != 0
    {
        return Ok(());
    }
    let e = io::Error::last_os_error();
    if e.raw_os_error() == Some(33) {
        Err(io::ErrorKind::WouldBlock.into())
    } else {
        Err(e)
    }
}
#[cfg(unix)]
pub fn file_identity(path: &Path) -> Result<String> {
    use std::os::unix::fs::MetadataExt;
    let m = fs::metadata(path)?;
    Ok(format!("{}:{}", m.dev(), m.ino()))
}
#[cfg(windows)]
pub fn file_identity(path: &Path) -> Result<String> {
    use std::os::windows::{fs::OpenOptionsExt, io::AsRawHandle};
    use windows_sys::Win32::Storage::FileSystem::{
        GetFileInformationByHandle, BY_HANDLE_FILE_INFORMATION,
    };
    let file = OpenOptions::new().read(true).share_mode(7).open(path)?;
    let mut info: BY_HANDLE_FILE_INFORMATION = unsafe { std::mem::zeroed() };
    if unsafe { GetFileInformationByHandle(file.as_raw_handle(), &mut info) } == 0 {
        return Err(io::Error::last_os_error().into());
    }
    Ok(format!(
        "{}:{}:{}",
        info.dwVolumeSerialNumber, info.nFileIndexHigh, info.nFileIndexLow
    ))
}
fn read_json<T: DeserializeOwned>(path: &Path) -> Result<T> {
    serde_json::from_slice(&fs::read(path)?).map_err(|e| invalid(e.to_string()))
}
fn json_bytes<T: Serialize>(value: &T) -> Result<Vec<u8>> {
    serde_json::to_vec(value).map_err(|e| invalid(e.to_string()))
}
fn sync_directory(path: &Path) -> Result<()> {
    #[cfg(unix)]
    File::open(path)?.sync_all()?;
    #[cfg(windows)]
    let _ = path; // rename durability is handled by the platform replace below.
    Ok(())
}
#[cfg(not(windows))]
fn replace(temp: &Path, target: &Path) -> io::Result<()> {
    fs::rename(temp, target)
}
#[cfg(windows)]
fn replace(temp: &Path, target: &Path) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::{
        MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH,
    };
    let a: Vec<u16> = temp.as_os_str().encode_wide().chain(Some(0)).collect();
    let b: Vec<u16> = target.as_os_str().encode_wide().chain(Some(0)).collect();
    if unsafe {
        MoveFileExW(
            a.as_ptr(),
            b.as_ptr(),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
    } == 0
    {
        Err(io::Error::last_os_error())
    } else {
        Ok(())
    }
}
fn atomic_bytes(path: &Path, bytes: &[u8], preserve_permissions: bool) -> Result<()> {
    let parent = path.parent().ok_or_else(|| invalid("missing parent"))?;
    let temp = parent.join(format!(".nutbook-version-{}.tmp", Uuid::new_v4()));
    let result = (|| {
        let mut f = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)?;
        if preserve_permissions {
            f.set_permissions(fs::metadata(path)?.permissions())?;
        }
        f.write_all(bytes)?;
        f.sync_all()?;
        drop(f);
        replace(&temp, path)?;
        sync_directory(parent)
    })();
    if result.is_err() {
        let _ = fs::remove_file(temp);
    }
    result
}

fn atomic_new_bytes(path: &Path, bytes: &[u8]) -> Result<bool> {
    let parent = path.parent().ok_or_else(|| invalid("new source parent"))?;
    let temp = parent.join(format!(".nutbook-version-new-{}.tmp", Uuid::new_v4()));
    let result = (|| {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)?;
        file.write_all(bytes)?;
        file.sync_all()?;
        drop(file);
        fs::hard_link(&temp, path)?;
        let _ = fs::remove_file(&temp);
        Ok(sync_directory(parent).is_ok())
    })();
    if result.is_err() {
        let _ = fs::remove_file(temp);
    }
    result
}
/// A running instance holds its OS owner lock for its full lifetime.
/// Open once per AppState, not once per command.
#[derive(Debug)]
pub struct HistoryStore {
    root: PathBuf,
    owner: String,
    _owner_lock: OsLock,
    previews: std::sync::Mutex<BTreeMap<String, preview::VersionPreviewSession>>,
}
impl HistoryStore {
    pub fn storage_path(&self)->&Path { &self.root }

    pub fn open(app_data: &Path) -> Result<Self> {
        let root = app_data.join("document-versions");
        fs::create_dir_all(&root)?;
        let root = root.canonicalize()?;
        for name in [
            "documents",
            "objects",
            "manifests",
            "journals",
            "staging",
            "owners",
            "locks",
            "preview-projections",
            "preview-journals",
            "restore-journals",
        ] {
            let path = root.join(name);
            fs::create_dir_all(&path)?;
            if fs::symlink_metadata(&path)?.file_type().is_symlink() {
                return Err(invalid("symlink in version store"));
            }
        }
        let owner = Uuid::new_v4().to_string();
        let owner_lock = OsLock::blocking(&root.join("owners").join(format!("{owner}.lock")))?;
        let metadata = Owner {
            schema: SCHEMA,
            id: owner.clone(),
            store: root.clone(),
            pid: std::process::id(),
        };
        atomic_bytes(
            &root.join("owners").join(format!("{owner}.json")),
            &json_bytes(&metadata)?,
            false,
        )?;
        let store = Self {
            root,
            owner,
            _owner_lock: owner_lock,
            previews: std::sync::Mutex::new(BTreeMap::new()),
        };
        let _quota = store.quota_lock()?;
        if !store.root.join("settings.json").exists() {
            atomic_bytes(
                &store.root.join("settings.json"),
                &json_bytes(&Settings::default())?,
                false,
            )?;
        }
        drop(_quota);
        Ok(store)
    }
    fn quota_lock(&self) -> Result<OsLock> {
        OsLock::blocking(&self.root.join("locks/quota.lock"))
    }
    fn path_lock(&self, path: &Path) -> Result<OsLock> {
        OsLock::blocking(&self.root.join("locks").join(format!(
            "{}.lock",
            digest(path.to_string_lossy().as_bytes())
        )))
    }
    fn head_path(&self, id: &str) -> PathBuf {
        self.root.join("documents").join(format!("{id}.json"))
    }
    fn journal_path(&self, id: &str) -> PathBuf {
        self.root.join("journals").join(format!("{id}.json"))
    }
    fn object_path(&self, hash: &str) -> Result<PathBuf> {
        if !valid_hash(hash) {
            return Err(invalid("invalid hash"));
        }
        Ok(self.root.join("objects").join(hash))
    }
    pub fn settings(&self) -> Result<Settings> {
        let settings: Settings = read_json(&self.root.join("settings.json"))?;
        if settings.schema != SCHEMA || settings.limit_bytes == 0 {
            return Err(invalid("settings"));
        }
        Ok(settings)
    }
    pub fn set_limit_mb(&self, mb: u64) -> Result<Settings> {
        let limit_bytes = mb
            .checked_mul(1_000_000)
            .filter(|n| *n > 0 && *n <= i64::MAX as u64)
            .ok_or_else(|| invalid("capacity must be a positive integer MB"))?;
        let _lock = self.quota_lock()?;
        let mut settings = self.settings()?;
        settings.limit_bytes = limit_bytes;
        settings.revision = settings
            .revision
            .checked_add(1)
            .ok_or_else(|| invalid("settings revision overflow"))?;
        atomic_bytes(
            &self.root.join("settings.json"),
            &json_bytes(&settings)?,
            false,
        )?;
        Ok(settings)
    }
    /// Referenced object bytes deduplicated within this document. Shared objects
    /// may count toward multiple documents; global usage remains separately deduplicated.
    pub fn document_usage_bytes(&self, head: &DocumentHead) -> Result<u64> {
        let mut hashes=BTreeSet::new();
        for version in &head.versions {
            hashes.insert(version.snapshot.body.clone());
            for dep in version.snapshot.dependencies.values() {
                if let Dependency::Captured{object,..}=dep {hashes.insert(object.clone());}
            }
        }
        let mut bytes=0u64;
        for hash in hashes {
            let metadata=fs::symlink_metadata(self.object_path(&hash)?)?;
            if !metadata.file_type().is_file(){return Err(invalid("non-file history object"));}
            bytes=bytes.checked_add(metadata.len()).ok_or_else(||invalid("usage overflow"))?;
        }
        Ok(bytes)
    }
    pub fn documents(&self) -> Result<Vec<DocumentHead>> {
        let mut result = Vec::new();
        for entry in fs::read_dir(self.root.join("documents"))? {
            let entry = entry?;
            if entry.path().extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            if !entry.file_type()?.is_file() {
                return Err(invalid("non-file document header"));
            }
            let head: DocumentHead = read_json(&entry.path())?;
            head.validate()?;
            if self.head_path(&head.id) != entry.path() {
                return Err(invalid("header filename mismatch"));
            }
            result.push(head);
        }
        Ok(result)
    }
    pub fn document(&self, id: &str) -> Result<DocumentHead> {
        check_id(id)?;
        let head: DocumentHead = read_json(&self.head_path(id))?;
        head.validate()?;
        if head.id != id {
            return Err(invalid("header ID mismatch"));
        }
        Ok(head)
    }
    pub fn object(&self, hash: &str) -> Result<Vec<u8>> {
        let path = self.object_path(hash)?;
        if !fs::symlink_metadata(&path)?.file_type().is_file() {
            return Err(invalid("object is not a regular file"));
        }
        let bytes = fs::read(path)?;
        if digest(&bytes) != hash {
            return Err(invalid("object integrity"));
        }
        Ok(bytes)
    }
    pub fn usage_bytes(&self) -> Result<u64> {
        tree_bytes(&self.root)
    }
    fn pending(&self) -> Result<Vec<Journal>> {
        let mut result = Vec::new();
        for entry in fs::read_dir(self.root.join("journals"))? {
            let entry = entry?;
            if entry.path().extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            if !entry.file_type()?.is_file() {
                return Err(invalid("non-file journal"));
            }
            let journal: Journal = read_json(&entry.path())?;
            check_id(&journal.id)?;
            check_id(&journal.owner)?;
            journal.before.validate()?;
            journal.after.validate()?;
            if !["reserved", "durable-ready", "source-published", "conflict"]
                .contains(&journal.state.as_str())
            {
                return Err(invalid("journal phase"));
            }
            if journal.schema != SCHEMA
                || journal.before.id != journal.after.id
                || journal.before.canonical_path != journal.after.canonical_path
                || entry.path() != self.journal_path(&journal.id)
                || !valid_hash(&journal.old_hash)
                || !valid_hash(&journal.new_hash)
            {
                return Err(invalid("journal identity"));
            }
            result.push(journal);
        }
        Ok(result)
    }
    /// Low-level protocol. The path was authorized by the command; snapshots
    /// must be captured and validated under its existing resource capability.
    /// No public Tauri command accepts arbitrary paths into this API.
    pub fn commit(
        &self,
        path: &Path,
        expected: &str,
        old: Snapshot,
        new: Snapshot,
        objects: BTreeMap<String, Vec<u8>>,
        restored_from: Option<String>,
    ) -> Result<CommitResult> {
        let path = path.canonicalize()?;
        let _path = self.path_lock(&path)?;
        self.commit_locked(&path, expected, old, new, objects, restored_from, None)
    }
    fn commit_locked(
        &self,
        path: &Path,
        expected: &str,
        old: Snapshot,
        new: Snapshot,
        objects: BTreeMap<String, Vec<u8>>,
        restored_from: Option<String>,
        fail_at: Option<&str>,
    ) -> Result<CommitResult> {
        self.commit_checked_locked(
            path,
            expected,
            old,
            new,
            objects,
            restored_from,
            fail_at,
            None,
            false,
        )
    }
    fn commit_checked_locked(
        &self,
        path: &Path,
        expected: &str,
        old: Snapshot,
        new: Snapshot,
        objects: BTreeMap<String, Vec<u8>>,
        restored_from: Option<String>,
        fail_at: Option<&str>,
        pre_publish: Option<&dyn Fn() -> Result<()>>,
        new_target: bool,
    ) -> Result<CommitResult> {
        old.validate()?;
        new.validate()?;
        if old.body != expected
            || (!new_target && digest(&fs::read(path)?) != expected)
            || (new_target && fs::symlink_metadata(path).is_ok())
        {
            return Err(HistoryError::Conflict);
        }
        let identity = if new_target {
            "0000000000000000:0000000000000000".into()
        } else {
            file_identity(path)?
        };
        let heads = self.documents()?;
        let matches: Vec<_> = heads
            .into_iter()
            .filter(|h| h.canonical_path == path && h.file_identity == identity)
            .collect();
        if matches.len() > 1 {
            return Err(invalid("ambiguous document binding"));
        }
        let before = matches.into_iter().next().unwrap_or_else(|| DocumentHead {
            schema: SCHEMA,
            id: Uuid::new_v4().to_string(),
            canonical_path: path.to_owned(),
            file_identity: identity,
            binding_revision: 1,
            file_type: path
                .extension()
                .unwrap_or_default()
                .to_string_lossy()
                .into_owned(),
            versions: Vec::new(),
            next_sequence: 1,
            restored_directories: Vec::new(),
        });
        // A resource-only explicit save is a change even when body == baseline.
        if before.versions.last().is_some_and(|v| v.snapshot == new)
            || (before.versions.is_empty() && old == new)
        {
            return Ok(CommitResult {
                document_id: before.id,
                changed: false,
                pending_finalize: false,
            });
        }
        for (hash, bytes) in &objects {
            if !valid_hash(hash) || digest(bytes) != *hash {
                return Err(invalid("supplied object integrity"));
            }
        }
        for hash in old.hashes().chain(new.hashes()) {
            if !objects.contains_key(hash) {
                self.object(hash)?;
            }
        }
        let mut after = before.clone();
        let append = |head: &mut DocumentHead, snapshot, kind: &str, source| {
            let sequence = head.next_sequence;
            head.next_sequence += 1;
            head.versions.push(Version {
                id: Uuid::new_v4().to_string(),
                sequence,
                saved_at: chrono::Utc::now().to_rfc3339(),
                kind: kind.to_owned(),
                snapshot,
                restored_from: source,
            });
        };
        // Preserve current external content too, once conflict adjudication has
        // authorized it. Never assume the last version is the current file.
        if !new_target && after.versions.last().is_none_or(|v| v.snapshot != old) {
            append(&mut after, old, "initial", None);
        }
        append(
            &mut after,
            new.clone(),
            if restored_from.is_some() {
                "restore"
            } else {
                "save"
            },
            restored_from,
        );
        if after.versions.len() > MAX_VERSIONS {
            after.versions.drain(..after.versions.len() - MAX_VERSIONS);
        }
        let operation = Uuid::new_v4().to_string();
        let mut journal = Journal {
            schema: SCHEMA,
            id: operation.clone(),
            owner: self.owner.clone(),
            settings_revision: 0,
            reserved_bytes: 0,
            object_inventory: objects
                .iter()
                .map(|(hash, bytes)| (hash.clone(), bytes.len() as u64))
                .collect(),
            new_target,
            old_hash: expected.to_owned(),
            new_hash: new.body.clone(),
            before,
            after,
            state: "reserved".into(),
        };
        {
            let _quota = self.quota_lock()?;
            if self
                .pending()?
                .iter()
                .any(|j| j.before.canonical_path == path)
            {
                return Err(HistoryError::RecoveryRequired(path.display().to_string()));
            }
            let settings = self.settings()?;
            journal.settings_revision = settings.revision;
            // The ledger is a projection, not an accumulated balance: union
            // pending inventories by hash, subtract already materialized data,
            // and give only this document its successful-retention credit.
            journal.reserved_bytes = journal
                .object_inventory
                .iter()
                .filter(|(hash, _)| !self.root.join("objects").join(hash).exists())
                .map(|(_, size)| *size)
                .sum();
            let projected = self.projected_quota(&journal)?;
            if projected > settings.limit_bytes {
                let used = self.usage_bytes()?;
                return Err(HistoryError::Quota {
                    used,
                    required: projected.saturating_sub(used),
                    limit: settings.limit_bytes,
                });
            }
            atomic_bytes(
                &self.journal_path(&operation),
                &json_bytes(&journal)?,
                false,
            )?;
        }
        if fail_at == Some("reserved") {
            return Err(HistoryError::RecoveryRequired(operation));
        }
        let prepare: Result<()> = (|| {
            if fail_at == Some("object-write") {
                return Err(io::Error::other("injected object write failure").into());
            }
            for (hash, bytes) in &objects {
                let target = self.object_path(hash)?;
                if target.exists() {
                    self.object(hash)?;
                    continue;
                }
                // Immutable CAS object: hard-link is atomic and never overwrites
                // another process's same-hash object.
                let temporary = self
                    .root
                    .join("staging")
                    .join(format!("{}-{hash}", journal.id));
                let mut file = OpenOptions::new()
                    .write(true)
                    .create_new(true)
                    .open(&temporary)?;
                file.write_all(bytes)?;
                file.sync_all()?;
                drop(file);
                match fs::hard_link(&temporary, &target) {
                    Ok(()) => {}
                    Err(e) if e.kind() == io::ErrorKind::AlreadyExists => {
                        self.object(hash)?;
                    }
                    Err(e) => return Err(e.into()),
                }
                sync_directory(&self.root.join("objects"))?;
                fs::remove_file(temporary)?;
            }
            for version in &journal.after.versions {
                let manifest = VersionManifest {
                    schema: SCHEMA,
                    document: journal.after.id.clone(),
                    binding_revision: journal.after.binding_revision,
                    canonical_path: journal.after.canonical_path.clone(),
                    file_identity: journal.before.file_identity.clone(),
                    version: version.clone(),
                };
                let path = self
                    .root
                    .join("manifests")
                    .join(format!("{}.json", version.id));
                if path.exists() {
                    self.verify_manifest(&journal.after.id, version)?;
                } else {
                    atomic_bytes(&path, &json_bytes(&manifest)?, false)?;
                }
            }
            journal.state = "durable-ready".into();
            atomic_bytes(
                &self.journal_path(&operation),
                &json_bytes(&journal)?,
                false,
            )?;
            Ok(())
        })();
        if let Err(error) = prepare {
            self.abort_prepublication(&journal)?;
            return Err(error);
        }
        if fail_at == Some("durable-ready") {
            return Err(HistoryError::RecoveryRequired(operation));
        }
        if (!new_target && digest(&fs::read(path)?) != expected)
            || (new_target && fs::symlink_metadata(path).is_ok())
        {
            self.abort_prepublication(&journal)?;
            return Err(HistoryError::Conflict);
        }
        if let Some(guard) = pre_publish {
            if let Err(error) = guard() {
                self.abort_prepublication(&journal)?;
                return Err(error);
            }
        }
        let body = self.object(&journal.new_hash)?;
        if fail_at == Some("source-write") {
            self.abort_prepublication(&journal)?;
            return Err(io::Error::other("injected source write failure").into());
        }
        if new_target {
            match atomic_new_bytes(path, &body) {
                Ok(true) => {}
                Ok(false) => {
                    return Ok(CommitResult {
                        document_id: journal.after.id,
                        changed: true,
                        pending_finalize: true,
                    })
                }
                Err(error) => {
                    self.abort_prepublication(&journal)?;
                    return Err(error);
                }
            }
        } else if let Err(error) = atomic_bytes(path, &body, true) {
            // rename may already have succeeded before a directory sync error.
            // Preserve a recoverable saved result rather than invite overwrite.
            if fs::read(path).is_ok_and(|bytes| digest(&bytes) == journal.new_hash) {
                return Ok(CommitResult {
                    document_id: journal.after.id,
                    changed: true,
                    pending_finalize: true,
                });
            }
            self.abort_prepublication(&journal)?;
            return Err(error);
        }
        // From this point callers must receive saved, even if finalization or
        // indexing fails. The durable journal proves the new file's history.
        if fail_at == Some("source-published") {
            return Ok(CommitResult {
                document_id: journal.after.id,
                changed: true,
                pending_finalize: true,
            });
        }
        let document_id = journal.after.id.clone();
        let pending_finalize = self.finalize(&mut journal).is_err();
        if !pending_finalize {
            let _ = self.collect_unreferenced_objects();
        }
        Ok(CommitResult {
            document_id,
            changed: true,
            pending_finalize,
        })
    }
    fn projected_quota(&self, candidate: &Journal) -> Result<u64> {
        let mut pending = self.pending()?;
        pending.push(candidate.clone());
        let heads = self.documents()?;
        let mut projected_heads: BTreeMap<String, DocumentHead> =
            heads.into_iter().map(|h| (h.id.clone(), h)).collect();
        projected_heads.insert(candidate.after.id.clone(), candidate.after.clone());
        let mut versions: BTreeMap<String, (String, u64, PathBuf, String, Version)> =
            BTreeMap::new();
        let mut wanted = self.preview_hashes()?;
        let mut inventory = BTreeMap::new();
        let mut total = 0u64;
        let add = |n: &mut u64, size: u64| -> Result<()> {
            *n = n
                .checked_add(size)
                .ok_or_else(|| invalid("quota overflow"))?;
            Ok(())
        };
        for journal in &pending {
            for (hash, size) in &journal.object_inventory {
                if inventory
                    .insert(hash.clone(), *size)
                    .is_some_and(|old| old != *size)
                {
                    return Err(invalid("object inventory size conflict"));
                }
            }
            add(&mut total, json_bytes(journal)?.len() as u64)?;
        }
        for head in projected_heads.values() {
            add(&mut total, json_bytes(head)?.len() as u64)?;
            for version in &head.versions {
                wanted.extend(version.snapshot.hashes().map(str::to_owned));
                versions.insert(
                    version.id.clone(),
                    (
                        head.id.clone(),
                        head.binding_revision,
                        head.canonical_path.clone(),
                        head.file_identity.clone(),
                        version.clone(),
                    ),
                );
            }
        }
        // Other in-flight transactions retain their before-state until they
        // finish. Never borrow another document's possible future eviction.
        for journal in pending.iter().filter(|j| j.id != candidate.id) {
            for head in [&journal.before, &journal.after] {
                for version in &head.versions {
                    wanted.extend(version.snapshot.hashes().map(str::to_owned));
                    versions.entry(version.id.clone()).or_insert((
                        head.id.clone(),
                        head.binding_revision,
                        head.canonical_path.clone(),
                        head.file_identity.clone(),
                        version.clone(),
                    ));
                }
            }
        }
        let own_prunable: BTreeSet<_> = candidate
            .before
            .versions
            .iter()
            .flat_map(|v| v.snapshot.hashes().map(str::to_owned))
            .filter(|h| !wanted.contains(h))
            .collect();
        for entry in fs::read_dir(self.root.join("objects"))? {
            let entry = entry?;
            let name = entry.file_name().to_string_lossy().into_owned();
            if !entry.file_type()?.is_file() || !valid_hash(&name) {
                return Err(invalid("unexpected object quota entry"));
            }
            if !wanted.contains(&name) && !own_prunable.contains(&name) {
                add(&mut total, entry.metadata()?.len())?;
            }
        }
        for hash in wanted {
            let path = self.object_path(&hash)?;
            let size = match fs::symlink_metadata(path) {
                Ok(m) if m.file_type().is_file() => m.len(),
                Ok(_) => return Err(invalid("non-file object in quota ledger")),
                Err(e) if e.kind() == io::ErrorKind::NotFound => *inventory
                    .get(&hash)
                    .ok_or_else(|| invalid("missing object reservation"))?,
                Err(e) => return Err(e.into()),
            };
            add(&mut total, size)?;
        }
        for (id, (document, binding_revision, canonical_path, file_identity, version)) in versions {
            let path = self.root.join("manifests").join(format!("{id}.json"));
            let size = match fs::metadata(path) {
                Ok(m) => m.len(),
                Err(e) if e.kind() == io::ErrorKind::NotFound => json_bytes(&VersionManifest {
                    schema: SCHEMA,
                    document,
                    binding_revision,
                    canonical_path,
                    file_identity,
                    version,
                })?
                .len() as u64,
                Err(e) => return Err(e.into()),
            };
            add(&mut total, size)?;
        }
        // Account for settings, owner/lock metadata, preview and recovery state.
        // In-flight staging is bounded by the durable object inventory; its
        // bytes are already reserved above and cannot become ghost usage.
        for name in [
            "owners",
            "locks",
            "preview-projections",
            "preview-journals",
            "restore-journals",
        ] {
            add(&mut total, tree_bytes(&self.root.join(name))?)?;
        }
        add(
            &mut total,
            fs::metadata(self.root.join("settings.json"))?.len(),
        )?;
        // Bounded metadata headroom covers source file identity length changes
        // and journal phase strings; it is not persisted as permanent usage.
        add(&mut total, 256)?;
        Ok(total)
    }
    fn abort_prepublication(&self, journal: &Journal) -> Result<()> {
        {
            let _quota = self.quota_lock()?;
            self.remove_staging(&journal.id)?;
            fs::remove_file(self.journal_path(&journal.id))?;
            sync_directory(&self.root.join("journals"))?;
        }
        // Object GC is best effort; an interrupted cleanup consumes actual
        // disk space, never a fictional reservation or another document's data.
        let _ = self.collect_unreferenced_objects();
        Ok(())
    }
    fn verify_manifest(&self, document: &str, version: &Version) -> Result<()> {
        check_id(document)?;
        check_id(&version.id)?;
        let path = self
            .root
            .join("manifests")
            .join(format!("{}.json", version.id));
        if !fs::symlink_metadata(&path)?.file_type().is_file() {
            return Err(invalid("manifest is not a regular file"));
        }
        let manifest: VersionManifest = read_json(&path)?;
        if manifest.schema != SCHEMA
            || manifest.document != document
            || !manifest.canonical_path.is_absolute()
            || manifest.binding_revision == 0
            || json_bytes(&manifest.version)? != json_bytes(version)?
        {
            return Err(invalid("manifest integrity"));
        }
        Ok(())
    }
    fn finalize(&self, journal: &mut Journal) -> Result<()> {
        for v in &journal.after.versions {
            self.verify_manifest(&journal.after.id, v)?;
            for hash in v.snapshot.hashes() {
                self.object(hash)?;
            }
        }
        journal.after.file_identity = file_identity(&journal.after.canonical_path)?;
        journal.state = "source-published".into();
        atomic_bytes(
            &self.journal_path(&journal.id),
            &json_bytes(journal)?,
            false,
        )?;
        atomic_bytes(
            &self.head_path(&journal.after.id),
            &json_bytes(&journal.after)?,
            false,
        )?;
        let _quota = self.quota_lock()?;
        fs::remove_file(self.journal_path(&journal.id))?;
        sync_directory(&self.root.join("journals"))?;
        Ok(())
    }
    /// Recover only dead owners, never infer death from PID or age. Conflicts
    /// and lock/metadata errors preserve all materials and block new writes.
    pub fn recover(&self) -> Result<Vec<String>> {
        self.recover_previews()?;
        let mut conflicts = self.recover_restore_directories()?;
        for mut journal in self.pending()? {
            let own = journal.owner == self.owner;
            let _owner = if own {
                None
            } else {
                let Some(lock) = OsLock::acquire(
                    &self
                        .root
                        .join("owners")
                        .join(format!("{}.lock", journal.owner)),
                    true,
                )?
                else {
                    continue;
                };
                Some(lock)
            };
            let owner: Owner = read_json(
                &self
                    .root
                    .join("owners")
                    .join(format!("{}.json", journal.owner)),
            )?;
            if owner.schema != SCHEMA || owner.id != journal.owner || owner.store != self.root {
                return Err(invalid("owner metadata mismatch"));
            }
            let _path = if own {
                let key = digest(journal.before.canonical_path.to_string_lossy().as_bytes());
                let Some(lock) =
                    OsLock::acquire(&self.root.join("locks").join(format!("{key}.lock")), true)?
                else {
                    continue;
                };
                lock
            } else {
                self.path_lock(&journal.before.canonical_path)?
            };
            let Some(_operation) = OsLock::acquire(
                &self
                    .root
                    .join("locks")
                    .join(format!("recovery-{}.lock", journal.id)),
                true,
            )?
            else {
                continue;
            };
            if !self.journal_path(&journal.id).exists() {
                continue;
            }
            let current = fs::read(&journal.before.canonical_path).map(|bytes| digest(&bytes));
            match current {
                Ok(hash) if hash == journal.new_hash && journal.state != "reserved" => {
                    self.finalize(&mut journal)?;
                }
                Err(ref e) if journal.new_target && e.kind() == io::ErrorKind::NotFound => {
                    let _quota = self.quota_lock()?;
                    self.remove_staging(&journal.id)?;
                    fs::remove_file(self.journal_path(&journal.id))?;
                    sync_directory(&self.root.join("journals"))?;
                }
                Ok(hash) if hash == journal.old_hash => {
                    let _quota = self.quota_lock()?;
                    self.remove_staging(&journal.id)?;
                    fs::remove_file(self.journal_path(&journal.id))?;
                    sync_directory(&self.root.join("journals"))?;
                }
                _ => {
                    // Retain material as actual usage, release future capacity.
                    // A repeat pass rewrites the same state, never double-counts.
                    let _quota = self.quota_lock()?;
                    journal.state = "conflict".into();
                    journal.reserved_bytes = 0;
                    atomic_bytes(
                        &self.journal_path(&journal.id),
                        &json_bytes(&journal)?,
                        false,
                    )?;
                    conflicts.push(journal.id.clone());
                }
            }
        }
        Ok(conflicts)
    }
    /// A crashed restore may have projected resources before publishing source.
    /// Recover the durable register only; never infer permission to restore the
    /// document or silently remove a directory beside user files.
    fn recover_restore_directories(&self) -> Result<Vec<String>> {
        let mut conflicts = Vec::new();
        for entry in fs::read_dir(self.root.join("restore-journals"))? {
            let entry = entry?;
            if entry.path().extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            if !entry.file_type()?.is_file() {
                return Err(invalid("non-file restore journal"));
            }
            let pending: RestorePreparation = read_json(&entry.path())?;
            check_id(&pending.owner)?;
            check_id(&pending.document)?;
            check_id(&pending.operation)?;
            if pending.schema != SCHEMA
                || !valid_hash(&pending.marker)
                || pending.state != "prepared"
                || entry.file_name().to_string_lossy() != format!("{}.json", pending.operation)
            {
                return Err(invalid("restore journal identity"));
            }
            if pending.owner == self.owner {
                continue;
            }
            let Some(_owner) = OsLock::acquire(
                &self
                    .root
                    .join("owners")
                    .join(format!("{}.lock", pending.owner)),
                true,
            )?
            else {
                continue;
            };
            let owner: Owner = read_json(
                &self
                    .root
                    .join("owners")
                    .join(format!("{}.json", pending.owner)),
            )?;
            if owner.schema != SCHEMA || owner.id != pending.owner || owner.store != self.root {
                return Err(invalid("restore owner metadata"));
            }
            let initial = self.document(&pending.document)?;
            let _path = self.path_lock(&initial.canonical_path)?;
            let Some(_operation) = OsLock::acquire(
                &self
                    .root
                    .join("locks")
                    .join(format!("restore-{}.lock", pending.operation)),
                true,
            )?
            else {
                continue;
            };
            if !entry.path().exists() {
                continue;
            }
            let mut head = self.document(&pending.document)?;
            let expected = head
                .canonical_path
                .parent()
                .ok_or_else(|| invalid("restore target parent"))?
                .join(format!(
                    ".nutbook-restored-{}-{}",
                    head.id, pending.operation
                ));
            if pending.path != expected {
                return Err(invalid("restore projection path"));
            }
            match fs::symlink_metadata(&pending.path) {
                Err(e) if e.kind() == io::ErrorKind::NotFound => {
                    fs::remove_file(entry.path())?;
                    continue;
                }
                Err(e) => return Err(e.into()),
                Ok(metadata) if !metadata.file_type().is_dir() => {
                    conflicts.push(format!("restore:{}", pending.operation));
                    continue;
                }
                _ => {}
            }
            let marker_path = pending.path.join(".nutbook-owner.json");
            let marker_bytes = match fs::read(&marker_path) {
                Ok(bytes) => bytes,
                Err(_) => {
                    conflicts.push(format!("restore:{}", pending.operation));
                    continue;
                }
            };
            if digest(&marker_bytes) != pending.marker {
                conflicts.push(format!("restore:{}", pending.operation));
                continue;
            }
            let marker: serde_json::Value =
                serde_json::from_slice(&marker_bytes).map_err(|_| invalid("restore marker"))?;
            if marker["schema"] != SCHEMA
                || marker["owner"] != pending.owner
                || marker["document"] != head.id
                || marker["operation"] != pending.operation
            {
                return Err(invalid("restore marker identity"));
            }
            let resources: BTreeMap<String, String> =
                serde_json::from_value(marker["resources"].clone())
                    .map_err(|_| invalid("restore resource register"))?;
            for (name, hash) in &resources {
                if Path::new(name).components().count() != 1
                    || name.starts_with('.')
                    || !valid_hash(hash)
                {
                    return Err(invalid("restore resource path"));
                }
            }
            if !head
                .restored_directories
                .iter()
                .any(|d| d.operation_id == pending.operation)
            {
                head.restored_directories.push(RestoredDirectory {
                    path: pending.path,
                    operation_id: pending.operation,
                    marker_digest: pending.marker,
                    resources,
                });
                atomic_bytes(&self.head_path(&head.id), &json_bytes(&head)?, false)?;
            }
            fs::remove_file(entry.path())?;
            sync_directory(&self.root.join("restore-journals"))?;
        }
        Ok(conflicts)
    }
    fn remove_staging(&self, operation: &str) -> Result<()> {
        check_id(operation)?;
        for entry in fs::read_dir(self.root.join("staging"))? {
            let entry = entry?;
            if entry
                .file_name()
                .to_string_lossy()
                .starts_with(&format!("{operation}-"))
                && entry.file_type()?.is_file()
            {
                fs::remove_file(entry.path())?;
            }
        }
        Ok(())
    }
    /// All capture and rechecks run within the same cross-process path lock.
    /// This is the only Markdown writer future commands should call.
    pub fn save_markdown(
        &self,
        path: &Path,
        root: &Path,
        expected: &str,
        content: &[u8],
        restored_from: Option<String>,
    ) -> Result<CommitResult> {
        let path = path.canonicalize()?;
        let _path = self.path_lock(&path)?;
        let source = fs::read(&path)?;
        if digest(&source) != expected {
            return Err(HistoryError::Conflict);
        }
        let budget = self.settings()?.limit_bytes;
        let before = super::capture_markdown(&path, root, &source, budget)?;
        let after = super::capture_markdown(&path, root, content, budget)?;
        let mut objects = before.objects.clone();
        objects.extend(after.objects.clone());
        let guard = || {
            before.recheck()?;
            after.recheck()
        };
        self.commit_checked_locked(
            &path,
            expected,
            before.snapshot.clone(),
            after.snapshot.clone(),
            objects,
            restored_from,
            None,
            Some(&guard),
            false,
        )
    }
    pub fn publish_new_markdown(
        &self,
        path: &Path,
        root: &Path,
        content: &[u8],
    ) -> Result<CommitResult> {
        let path = path
            .parent()
            .ok_or_else(|| invalid("target parent"))?
            .canonicalize()?
            .join(path.file_name().ok_or_else(|| invalid("target filename"))?);
        let _path = self.path_lock(&path)?;
        if fs::symlink_metadata(&path).is_ok() {
            return Err(HistoryError::Conflict);
        }
        let after = super::capture_markdown(&path, root, content, self.settings()?.limit_bytes)?;
        let mut objects = after.objects.clone();
        objects.insert(digest(b""), Vec::new());
        let old = Snapshot {
            body: digest(b""),
            dependencies: BTreeMap::new(),
        };
        let guard = || after.recheck();
        self.commit_checked_locked(
            &path,
            &digest(b""),
            old,
            after.snapshot.clone(),
            objects,
            None,
            None,
            Some(&guard),
            true,
        )
    }
    /// Restore into an existing authorized Markdown source. The command must
    /// adjudicate drafts first and require explicit incomplete confirmation.
    pub fn restore_markdown(
        &self,
        document_id: &str,
        version_id: &str,
        root: &Path,
        expected: &str,
        allow_incomplete: bool,
    ) -> Result<CommitResult> {
        check_id(version_id)?;
        let head = self.document(document_id)?;
        let path = head.canonical_path.canonicalize()?;
        let root = root.canonicalize()?;
        if !path.starts_with(&root) {
            return Err(invalid("restore target outside authorized root"));
        }
        let _path = self.path_lock(&path)?;
        let mut head = self.document(document_id)?;
        if file_identity(&path)? != head.file_identity || digest(&fs::read(&path)?) != expected {
            return Err(HistoryError::Conflict);
        }
        if self
            .pending()?
            .iter()
            .any(|j| j.before.canonical_path == path)
        {
            return Err(HistoryError::RecoveryRequired(document_id.into()));
        }
        let version = head
            .versions
            .iter()
            .find(|v| v.id == version_id)
            .cloned()
            .ok_or_else(|| invalid("version does not belong to document"))?;
        let body = self.object(&version.snapshot.body)?;
        let source = fs::read(&path)?;
        let budget = self.settings()?.limit_bytes;
        let before = super::capture_markdown(&path, &root, &source, budget)?;
        if before.snapshot == version.snapshot {
            return Ok(CommitResult {
                document_id: head.id,
                changed: false,
                pending_finalize: false,
            });
        }
        if !allow_incomplete
            && version
                .snapshot
                .dependencies
                .values()
                .any(|d| !matches!(d, Dependency::Captured { .. }))
        {
            return Err(invalid("incomplete version requires explicit confirmation"));
        }
        // Resolve all objects and rewrite all tokens before creating anything.
        // Not-captured raw HTML cannot safely be relocated, even if confirmed.
        if version
            .snapshot
            .dependencies
            .contains_key("nutbook-unsupported:raw-html")
        {
            return Err(invalid("raw HTML cannot be safely restored"));
        }
        let operation = Uuid::new_v4().to_string();
        let directory_name = format!(".nutbook-restored-{}-{operation}", head.id);
        let directory = path
            .parent()
            .ok_or_else(|| invalid("restore parent"))?
            .join(&directory_name);
        let mut replacements = BTreeMap::new();
        let mut resources = BTreeMap::new();
        let mut bytes_to_write = BTreeMap::new();
        for (reference, dependency) in &version.snapshot.dependencies {
            match dependency {
                Dependency::Captured { object, .. } => {
                    let bytes = self.object(object)?;
                    // Preserve format, use content hash for collision-free names.
                    let suffix = reference
                        .split(['?', '#'])
                        .next()
                        .and_then(|r| Path::new(r).extension())
                        .and_then(|s| s.to_str())
                        .filter(|s| s.len() <= 8 && s.bytes().all(|b| b.is_ascii_alphanumeric()))
                        .unwrap_or("bin");
                    let name = format!("{object}.{suffix}");
                    replacements.insert(reference.clone(), format!("{directory_name}/{name}"));
                    resources.insert(name.clone(), object.clone());
                    bytes_to_write.insert(name, bytes);
                }
                Dependency::MissingAtSave { .. } => {
                    replacements.insert(
                        reference.clone(),
                        format!("{directory_name}/missing-{}", digest(reference.as_bytes())),
                    );
                }
                Dependency::NotCaptured { .. } => {
                    // Pure remote references stay explicitly incomplete. Local
                    // excluded/raw/dynamic references must never read live data.
                    if !reference.starts_with("https://") && !reference.starts_with("http://") {
                        return Err(invalid(
                            "uncaptured local resource cannot be safely isolated",
                        ));
                    }
                }
            }
        }
        let text = std::str::from_utf8(&body).map_err(|_| invalid("Markdown is not UTF-8"))?;
        let relocated = super::relocate_markdown(text, &replacements)?;
        let marker = serde_json::json!({"schema":SCHEMA,"owner":self.owner,"document":head.id,"operation":operation,"resources":resources});
        let marker_bytes = json_bytes(&marker)?;
        // Register intended creation durably before touching the user directory.
        // Marker and exact hash list are never a broad filesystem authorization.
        let restore_journal = self
            .root
            .join("restore-journals")
            .join(format!("{operation}.json"));
        {
            let _quota = self.quota_lock()?;
            atomic_bytes(
                &restore_journal,
                &json_bytes(
                    &serde_json::json!({"schema":SCHEMA,"owner":self.owner,"document":head.id,"operation":operation,"path":directory,"marker":digest(&marker_bytes),"state":"prepared"}),
                )?,
                false,
            )?;
        }
        // create_dir is exclusive. A collision never grants ownership or cleanup.
        fs::create_dir(&directory)?;
        atomic_bytes(&directory.join(".nutbook-owner.json"), &marker_bytes, false)?;
        for (name, bytes) in &bytes_to_write {
            atomic_bytes(&directory.join(name), bytes, false)?;
        }
        sync_directory(&directory)?;
        head.restored_directories.push(RestoredDirectory {
            path: directory.clone(),
            operation_id: operation,
            marker_digest: digest(&marker_bytes),
            resources,
        });
        atomic_bytes(&self.head_path(document_id), &json_bytes(&head)?, false)?;
        // The durable register owns the directory now, regardless of whether
        // source publication succeeds. Cleanup remains separately confirmed.
        fs::remove_file(restore_journal)?;
        sync_directory(&self.root.join("restore-journals"))?;
        let after = super::capture_markdown(&path, &root, relocated.as_bytes(), budget)?;
        let mut objects = before.objects.clone();
        objects.extend(after.objects.clone());
        let guard = || {
            before.recheck()?;
            after.recheck()
        };
        self.commit_checked_locked(
            &path,
            expected,
            before.snapshot.clone(),
            after.snapshot.clone(),
            objects,
            Some(version_id.into()),
            None,
            Some(&guard),
            false,
        )
    }
    /// ID-only history mutation, with the same source lock as saving. The
    /// atomically replaced header is the durable tombstone for removed IDs.
    /// Callers own confirmation; this never removes source/restored resources.
    pub fn delete_versions(&self, document_id: &str, version_id: Option<&str>) -> Result<()> {
        if self.has_foreign_preview(document_id)? {
            return Err(HistoryError::RecoveryRequired(
                "history is being previewed by another instance".into(),
            ));
        }
        self.close_document_previews(document_id)?;
        let initial = self.document(document_id)?;
        let _path = self.path_lock(&initial.canonical_path)?;
        if self.has_foreign_preview(document_id)? {
            return Err(HistoryError::RecoveryRequired(
                "history is being previewed by another instance".into(),
            ));
        }
        self.close_document_previews(document_id)?;
        let _quota = self.quota_lock()?;
        if self
            .pending()?
            .iter()
            .any(|j| j.before.canonical_path == initial.canonical_path)
        {
            return Err(HistoryError::RecoveryRequired(document_id.into()));
        }
        let mut head = self.document(document_id)?;
        if let Some(id) = version_id {
            check_id(id)?;
            if !head.versions.iter().any(|v| v.id == id) {
                return Err(invalid("version does not belong to document"));
            }
            head.versions.retain(|v| v.id != id);
        } else {
            head.versions.clear();
        }
        atomic_bytes(&self.head_path(document_id), &json_bytes(&head)?, false)?;
        Ok(())
    }
    /// Rebuild disposable SQLite rows only from durable, verified history.
    /// Never recreates an item or guesses a binding from a matching body/name.
    pub fn rebuild_index(&self, connection: &mut rusqlite::Connection) -> Result<()> {
        let _quota = self.quota_lock()?;
        let heads = self.documents()?;
        let settings = self.settings()?;
        let used = self.usage_bytes()?;
        let db_error = |e: rusqlite::Error| invalid(format!("history index: {e}"));
        let tx = connection.transaction().map_err(db_error)?;
        tx.execute_batch("DELETE FROM history_object_refs; DELETE FROM history_versions; DELETE FROM history_documents;").map_err(db_error)?;
        for head in heads {
            let available =
                file_identity(&head.canonical_path).is_ok_and(|id| id == head.file_identity);
            tx.execute(
                "INSERT INTO history_documents VALUES (?1,?2,?3,?4,?5,?6)",
                rusqlite::params![
                    head.id,
                    head.canonical_path.to_string_lossy(),
                    head.file_identity,
                    head.binding_revision,
                    head.file_type,
                    available
                ],
            )
            .map_err(db_error)?;
            for version in head.versions {
                self.verify_manifest(&head.id, &version)?;
                for hash in version.snapshot.hashes() {
                    self.object(hash)?;
                }
                let incomplete = version
                    .snapshot
                    .dependencies
                    .values()
                    .any(|d| !matches!(d, Dependency::Captured { .. }));
                tx.execute(
                    "INSERT INTO history_versions VALUES (?1,?2,?3,?4,?5,?6,?7)",
                    rusqlite::params![
                        version.id,
                        head.id,
                        version.sequence,
                        version.saved_at,
                        version.kind,
                        version.snapshot.body,
                        incomplete
                    ],
                )
                .map_err(db_error)?;
                for hash in version.snapshot.hashes().collect::<BTreeSet<_>>() {
                    tx.execute(
                        "INSERT INTO history_object_refs VALUES (?1,?2)",
                        rusqlite::params![version.id, hash],
                    )
                    .map_err(db_error)?;
                }
            }
        }
        tx.execute(
            "INSERT OR REPLACE INTO history_settings VALUES (1,?1,?2,?3)",
            rusqlite::params![settings.revision, settings.limit_bytes, used],
        )
        .map_err(db_error)?;
        tx.commit().map_err(db_error)
    }
    pub fn collect_unreferenced_objects(&self) -> Result<u64> {
        let _quota = self.quota_lock()?;
        let mut referenced = self.preview_hashes()?;
        for head in self.documents()? {
            for v in head.versions {
                referenced.extend(v.snapshot.hashes().map(str::to_owned));
            }
        }
        for journal in self.pending()? {
            for head in [journal.before, journal.after] {
                for v in head.versions {
                    referenced.extend(v.snapshot.hashes().map(str::to_owned));
                }
            }
        }
        // Preview leases must join the pin set before this primitive is used by
        // UI integration. There are no preview sessions in this first slice.
        let mut removed = 0;
        for entry in fs::read_dir(self.root.join("objects"))? {
            let entry = entry?;
            let hash = entry.file_name().to_string_lossy().into_owned();
            if !valid_hash(&hash) || !entry.file_type()?.is_file() {
                return Err(invalid("unexpected object entry"));
            }
            if !referenced.contains(&hash) {
                removed += entry.metadata()?.len();
                fs::remove_file(entry.path())?;
            }
        }
        let mut retained = self.preview_version_ids()?;
        for head in self.documents()? {
            retained.extend(head.versions.into_iter().map(|v| v.id));
        }
        for journal in self.pending()? {
            for head in [journal.before, journal.after] {
                retained.extend(head.versions.into_iter().map(|v| v.id));
            }
        }
        for entry in fs::read_dir(self.root.join("manifests"))? {
            let entry = entry?;
            let path = entry.path();
            let id = path
                .file_stem()
                .and_then(|s| s.to_str())
                .ok_or_else(|| invalid("manifest filename"))?;
            if path.extension().and_then(|s| s.to_str()) != Some("json")
                || !valid_id(id)
                || !entry.file_type()?.is_file()
            {
                return Err(invalid("unexpected manifest entry"));
            }
            if !retained.contains(id) {
                removed += entry.metadata()?.len();
                fs::remove_file(path)?;
            }
        }
        sync_directory(&self.root.join("objects"))?;
        sync_directory(&self.root.join("manifests"))?;
        Ok(removed)
    }
}
#[derive(Debug)]
pub struct CommitResult {
    pub document_id: String,
    pub changed: bool,
    pub pending_finalize: bool,
}
fn tree_bytes(path: &Path) -> Result<u64> {
    let mut bytes = 0u64;
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let kind = entry.file_type()?;
        let size = if kind.is_dir() {
            tree_bytes(&entry.path())?
        } else if kind.is_file() {
            entry.metadata()?.len()
        } else {
            return Err(invalid("non-regular file in history store"));
        };
        bytes = bytes
            .checked_add(size)
            .ok_or_else(|| invalid("usage overflow"))?;
    }
    Ok(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn snapshot(body: &[u8], resource: Option<&[u8]>) -> (Snapshot, BTreeMap<String, Vec<u8>>) {
        let mut objects = BTreeMap::from([(digest(body), body.to_vec())]);
        let dependencies = resource
            .map(|bytes| {
                objects.insert(digest(bytes), bytes.to_vec());
                BTreeMap::from([(
                    "shared/image.svg".into(),
                    Dependency::Captured {
                        object: digest(bytes),
                        bytes: bytes.len() as u64,
                    },
                )])
            })
            .unwrap_or_default();
        (
            Snapshot {
                body: digest(body),
                dependencies,
            },
            objects,
        )
    }
    fn commit(
        store: &HistoryStore,
        path: &Path,
        old_body: &[u8],
        new_body: &[u8],
        resource: Option<&[u8]>,
        fail: Option<&str>,
    ) -> Result<CommitResult> {
        let (old, mut objects) = snapshot(old_body, resource);
        let (new, more) = snapshot(new_body, resource);
        objects.extend(more);
        let path = path.canonicalize()?;
        let _path = store.path_lock(&path)?;
        store.commit_locked(&path, &digest(old_body), old, new, objects, None, fail)
    }
    #[test]
    fn initial_noop_retention_dedup_and_shared_gc() {
        let dir = tempfile::tempdir().unwrap();
        let a = dir.path().join("a.md");
        let b = dir.path().join("b.md");
        fs::write(&a, "A").unwrap();
        fs::write(&b, "X").unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        assert!(
            !commit(&store, &a, b"A", b"A", Some(b"image"), None)
                .unwrap()
                .changed
        );
        assert!(store.documents().unwrap().is_empty());
        let saved = commit(&store, &a, b"A", b"B", Some(b"image"), None).unwrap();
        assert!(!saved.pending_finalize);
        let id = saved.document_id;
        assert_eq!(store.document(&id).unwrap().versions.len(), 2);
        assert_eq!(store.document_usage_bytes(&store.document(&id).unwrap()).unwrap(),7,"two bodies plus one shared image, deduplicated across versions");
        assert!(
            !commit(&store, &a, b"B", b"B", Some(b"image"), None)
                .unwrap()
                .changed
        );
        commit(&store, &b, b"X", b"Y", Some(b"image"), None).unwrap();
        let mut old = b"B".to_vec();
        for n in 0..12 {
            let new = format!("revision {n}").into_bytes();
            commit(&store, &a, &old, &new, Some(b"image"), None).unwrap();
            old = new;
        }
        let head = store.document(&id).unwrap();
        assert_eq!(head.versions.len(), 10);
        assert_eq!(head.versions.last().unwrap().snapshot.body, digest(&old));
        assert_eq!(store.object(&digest(b"image")).unwrap(), b"image");
        let _ = store.collect_unreferenced_objects().unwrap();
        assert_eq!(store.object(&digest(b"image")).unwrap(), b"image");
        assert_eq!(fs::read(&b).unwrap(), b"Y");
    }
    #[test]
    fn quota_and_storage_errors_never_publish_source() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        fs::write(&path, b"A").unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        store.set_limit_mb(1).unwrap();
        assert!(store.set_limit_mb(0).is_err());
        assert!(store.set_limit_mb(u64::MAX).is_err());
        let large = vec![b'z'; 1_100_000];
        assert!(matches!(
            commit(&store, &path, b"A", &large, None, None),
            Err(HistoryError::Quota { .. })
        ));
        assert_eq!(fs::read(&path).unwrap(), b"A");
        assert!(store.documents().unwrap().is_empty());
        store.set_limit_mb(5).unwrap();
        let saved = commit(&store, &path, b"A", &large, None, None).unwrap();
        assert_eq!(
            store.document(&saved.document_id).unwrap().versions.len(),
            2
        );
        // Corrupt a CAS object: a following commit must fail closed.
        fs::write(store.object_path(&digest(&large)).unwrap(), b"corrupt").unwrap();
        assert!(commit(&store, &path, &large, b"C", None, None).is_err());
        assert_eq!(fs::read(&path).unwrap(), large);
    }
    #[test]
    fn recover_reserved_ready_published_and_external_conflict_idempotently() {
        for stage in ["reserved", "durable-ready", "source-published"] {
            let dir = tempfile::tempdir().unwrap();
            let path = dir.path().join("a.md");
            fs::write(&path, b"A").unwrap();
            let app = dir.path().join("app");
            let store = HistoryStore::open(&app).unwrap();
            let result = commit(&store, &path, b"A", b"B", None, Some(stage));
            if stage == "source-published" {
                assert!(result.unwrap().pending_finalize);
            } else {
                assert!(result.is_err());
            }
            let active = HistoryStore::open(&app).unwrap();
            active.recover().unwrap();
            assert_eq!(
                active.pending().unwrap().len(),
                1,
                "live owner must not be reclaimed"
            );
            drop(active);
            drop(store);
            let recovered = HistoryStore::open(&app).unwrap();
            assert!(recovered.recover().unwrap().is_empty());
            assert!(recovered.recover().unwrap().is_empty());
            assert!(recovered.pending().unwrap().is_empty());
            if stage == "source-published" {
                assert_eq!(fs::read(&path).unwrap(), b"B");
                assert_eq!(recovered.documents().unwrap()[0].versions.len(), 2);
            } else {
                assert_eq!(fs::read(&path).unwrap(), b"A");
                assert!(recovered.documents().unwrap().is_empty());
            }
        }
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        fs::write(&path, b"A").unwrap();
        let app = dir.path().join("app");
        let store = HistoryStore::open(&app).unwrap();
        let _ = commit(&store, &path, b"A", b"B", None, Some("durable-ready"));
        drop(store);
        fs::write(&path, b"third party").unwrap();
        let recovered = HistoryStore::open(&app).unwrap();
        assert_eq!(recovered.recover().unwrap().len(), 1);
        assert_eq!(recovered.recover().unwrap().len(), 1);
        assert_eq!(fs::read(&path).unwrap(), b"third party");
        assert_eq!(recovered.pending().unwrap()[0].reserved_bytes, 0);
        assert!(matches!(
            commit(&recovered, &path, b"third party", b"C", None, None),
            Err(HistoryError::RecoveryRequired(_))
        ));
    }
    #[test]
    fn changed_identity_does_not_merge_history_and_hash_paths_are_checked() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        fs::write(&path, b"A").unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        let first = commit(&store, &path, b"A", b"B", None, None).unwrap();
        let other = dir.path().join("other");
        fs::write(&other, b"X").unwrap();
        fs::rename(&other, &path).unwrap();
        let second = commit(&store, &path, b"X", b"Y", None, None).unwrap();
        assert_ne!(first.document_id, second.document_id);
        assert!(store.object("../../settings.json").is_err());
        assert!(store.document("../escape").is_err());
        assert_eq!(store.documents().unwrap().len(), 2);
    }
    #[test]
    fn missing_resource_is_stable_state_not_fake_hash() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        fs::write(&path, b"A").unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        let (mut old, mut objects) = snapshot(b"A", None);
        let (mut new, more) = snapshot(b"B", None);
        objects.extend(more);
        let missing = Dependency::MissingAtSave {
            reason: "not found before capture".into(),
        };
        old.dependencies
            .insert("missing.svg".into(), missing.clone());
        new.dependencies.insert("missing.svg".into(), missing);
        let saved = store
            .commit(&path, &digest(b"A"), old, new.clone(), objects, None)
            .unwrap();
        assert_eq!(
            store.document(&saved.document_id).unwrap().versions.len(),
            2
        );
        assert_eq!(fs::read(&path).unwrap(), b"B");
        let result = store
            .commit(
                &path,
                &digest(b"B"),
                new.clone(),
                new,
                BTreeMap::new(),
                None,
            )
            .unwrap();
        assert!(!result.changed);
    }
    #[cfg(unix)]
    #[test]
    fn source_permissions_survive_atomic_publication() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        fs::write(&path, b"A").unwrap();
        fs::set_permissions(&path, fs::Permissions::from_mode(0o640)).unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        commit(&store, &path, b"A", b"B", None, None).unwrap();
        assert_eq!(
            fs::metadata(path).unwrap().permissions().mode() & 0o777,
            0o640
        );
    }
    #[test]
    fn active_owner_failure_releases_reservation_and_retry_writes_once() {
        for stage in ["object-write", "source-write"] {
            let dir = tempfile::tempdir().unwrap();
            let path = dir.path().join("a.md");
            fs::write(&path, b"A").unwrap();
            let store = HistoryStore::open(&dir.path().join("app")).unwrap();
            assert!(commit(&store, &path, b"A", b"B", Some(b"resource"), Some(stage)).is_err());
            assert_eq!(fs::read(&path).unwrap(), b"A");
            assert!(store.pending().unwrap().is_empty());
            let saved = commit(&store, &path, b"A", b"B", Some(b"resource"), None).unwrap();
            assert_eq!(
                store.document(&saved.document_id).unwrap().versions.len(),
                2
            );
        }
    }
    #[test]
    fn quota_serializes_competing_documents_and_settings_changes() {
        let dir = tempfile::tempdir().unwrap();
        let app = dir.path().join("app");
        let a = dir.path().join("a.md");
        let b = dir.path().join("b.md");
        fs::write(&a, b"A").unwrap();
        fs::write(&b, b"A").unwrap();
        let store = std::sync::Arc::new(HistoryStore::open(&app).unwrap());
        store.set_limit_mb(1).unwrap();
        let barrier = std::sync::Arc::new(std::sync::Barrier::new(3));
        let handles: Vec<_> = [a, b]
            .into_iter()
            .enumerate()
            .map(|(n, path)| {
                let store = store.clone();
                let barrier = barrier.clone();
                std::thread::spawn(move || {
                    barrier.wait();
                    let new = vec![b'b' + n as u8; 600_000];
                    commit(&store, &path, b"A", &new, None, Some("durable-ready"))
                })
            })
            .collect();
        barrier.wait();
        let results: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();
        assert_eq!(
            results
                .iter()
                .filter(|r| matches!(r, Err(HistoryError::Quota { .. })))
                .count(),
            1
        );
        assert_eq!(store.pending().unwrap().len(), 1);
        store.set_limit_mb(2).unwrap();
        assert_eq!(
            store.pending().unwrap()[0].settings_revision,
            2,
            "quota update must preserve prior reservation revision"
        );
    }
    #[test]
    fn gc_pins_durable_ready_objects_until_owner_recovery() {
        let dir = tempfile::tempdir().unwrap();
        let app = dir.path().join("app");
        let path = dir.path().join("a.md");
        fs::write(&path, b"A").unwrap();
        let store = HistoryStore::open(&app).unwrap();
        let _ = commit(
            &store,
            &path,
            b"A",
            b"B",
            Some(b"shared"),
            Some("durable-ready"),
        );
        assert_eq!(store.collect_unreferenced_objects().unwrap(), 0);
        assert_eq!(store.object(&digest(b"shared")).unwrap(), b"shared");
        drop(store);
        let recovered = HistoryStore::open(&app).unwrap();
        recovered.recover().unwrap();
        assert!(recovered.collect_unreferenced_objects().unwrap() > 0);
        assert_eq!(fs::read(&path).unwrap(), b"A");
    }
    #[test]
    fn markdown_restore_keeps_shared_source_and_survives_history_clear() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        let other = dir.path().join("b.md");
        let image = dir.path().join("image.svg");
        fs::write(&path, b"# A\n\n![alt](image.svg \"title\")").unwrap();
        fs::write(&other, b"![shared](image.svg)").unwrap();
        fs::write(&image, b"old image").unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        let a = fs::read(&path).unwrap();
        let b = b"# B\n\n![alt](image.svg \"title\")";
        let saved = store
            .save_markdown(&path, dir.path(), &digest(&a), b, None)
            .unwrap();
        let initial = store.document(&saved.document_id).unwrap().versions[0]
            .id
            .clone();
        fs::write(&image, b"new shared image").unwrap();
        assert!(
            store
                .save_markdown(&path, dir.path(), &digest(b), b, None)
                .unwrap()
                .changed
        );
        let restored = store
            .restore_markdown(&saved.document_id, &initial, dir.path(), &digest(b), false)
            .unwrap();
        assert!(restored.changed);
        assert!(!restored.pending_finalize);
        let text = fs::read_to_string(&path).unwrap();
        assert!(text.starts_with("# A\n"));
        assert!(text.contains(".nutbook-restored-"));
        assert!(text.contains("alt"));
        assert!(text.contains("title"));
        assert_eq!(fs::read(&image).unwrap(), b"new shared image");
        assert_eq!(fs::read(&other).unwrap(), b"![shared](image.svg)");
        let head = store.document(&saved.document_id).unwrap();
        assert_eq!(head.restored_directories.len(), 1);
        let projected = head.restored_directories[0].path.join(
            head.restored_directories[0]
                .resources
                .keys()
                .next()
                .unwrap(),
        );
        assert_eq!(fs::read(&projected).unwrap(), b"old image");
        store.delete_versions(&saved.document_id, None).unwrap();
        store.collect_unreferenced_objects().unwrap();
        assert_eq!(fs::read(&projected).unwrap(), b"old image");
        assert_eq!(
            store
                .document(&saved.document_id)
                .unwrap()
                .restored_directories
                .len(),
            1
        );
        assert!(store
            .document(&saved.document_id)
            .unwrap()
            .versions
            .is_empty());
    }
    #[test]
    fn index_rebuild_missing_source_and_durable_deletion_do_not_create_items() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        fs::write(&path, b"A").unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        let saved = commit(&store, &path, b"A", b"B", None, None).unwrap();
        let mut db = rusqlite::Connection::open_in_memory().unwrap();
        db.execute_batch("PRAGMA foreign_keys=ON;").unwrap();
        db.execute_batch(include_str!(
            "../../../migrations/0010_document_version_index.sql"
        ))
        .unwrap();
        store.rebuild_index(&mut db).unwrap();
        assert_eq!(
            db.query_row("SELECT count(*) FROM history_versions", [], |r| r
                .get::<_, i64>(0))
                .unwrap(),
            2
        );
        fs::remove_file(&path).unwrap();
        store.rebuild_index(&mut db).unwrap();
        assert_eq!(
            db.query_row("SELECT source_available FROM history_documents", [], |r| {
                r.get::<_, i64>(0)
            })
            .unwrap(),
            0
        );
        let head = store.document(&saved.document_id).unwrap();
        store
            .delete_versions(&saved.document_id, Some(&head.versions[0].id))
            .unwrap();
        store.rebuild_index(&mut db).unwrap();
        assert_eq!(
            db.query_row("SELECT count(*) FROM history_versions", [], |r| r
                .get::<_, i64>(0))
                .unwrap(),
            1
        );
        store.delete_versions(&saved.document_id, None).unwrap();
        store.rebuild_index(&mut db).unwrap();
        assert_eq!(
            db.query_row("SELECT count(*) FROM history_versions", [], |r| r
                .get::<_, i64>(0))
                .unwrap(),
            0
        );
        assert!(!path.exists());
    }
    #[test]
    fn incomplete_restore_requires_confirmation_and_does_not_read_current_namesake() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        let image = dir.path().join("missing.svg");
        let a = b"# A\n![old](missing.svg)";
        let b = b"# B\n![old](missing.svg)";
        fs::write(&path, a).unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        let saved = store
            .save_markdown(&path, dir.path(), &digest(a), b, None)
            .unwrap();
        let initial = store.document(&saved.document_id).unwrap().versions[0]
            .id
            .clone();
        fs::write(&image, b"new unrelated bytes").unwrap();
        assert!(store
            .restore_markdown(&saved.document_id, &initial, dir.path(), &digest(b), false)
            .is_err());
        assert!(store
            .document(&saved.document_id)
            .unwrap()
            .restored_directories
            .is_empty());
        assert_eq!(fs::read(&path).unwrap(), b);
        store
            .restore_markdown(&saved.document_id, &initial, dir.path(), &digest(b), true)
            .unwrap();
        let head = store.document(&saved.document_id).unwrap();
        let latest = head.versions.last().unwrap();
        assert!(latest
            .snapshot
            .dependencies
            .values()
            .all(|d| matches!(d, Dependency::MissingAtSave { .. })));
        assert_eq!(fs::read(&image).unwrap(), b"new unrelated bytes");
        assert!(fs::read_to_string(&path).unwrap().contains("/missing-"));
    }
    #[test]
    fn interrupted_restore_registration_is_recovered_without_publishing_source() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        let app = dir.path().join("app");
        fs::write(&path, b"A").unwrap();
        let store = HistoryStore::open(&app).unwrap();
        let saved = commit(&store, &path, b"A", b"B", None, None).unwrap();
        let operation = Uuid::new_v4().to_string();
        let projection = dir.path().canonicalize().unwrap().join(format!(
            ".nutbook-restored-{}-{operation}",
            saved.document_id
        ));
        let marker=json_bytes(&serde_json::json!({"schema":SCHEMA,"owner":store.owner,"document":saved.document_id,"operation":operation,"resources":{}})).unwrap();
        let pending = RestorePreparation {
            schema: SCHEMA,
            owner: store.owner.clone(),
            document: saved.document_id.clone(),
            operation: operation.clone(),
            path: projection.clone(),
            marker: digest(&marker),
            state: "prepared".into(),
        };
        atomic_bytes(
            &store
                .root
                .join("restore-journals")
                .join(format!("{operation}.json")),
            &json_bytes(&pending).unwrap(),
            false,
        )
        .unwrap();
        fs::create_dir(&projection).unwrap();
        atomic_bytes(&projection.join(".nutbook-owner.json"), &marker, false).unwrap();
        drop(store);
        let recovered = HistoryStore::open(&app).unwrap();
        assert!(recovered.recover().unwrap().is_empty());
        assert!(recovered.recover().unwrap().is_empty());
        assert_eq!(
            recovered
                .document(&saved.document_id)
                .unwrap()
                .restored_directories
                .len(),
            1
        );
        assert_eq!(fs::read(&path).unwrap(), b"B");
        assert!(projection.exists());
    }
    #[test]
    fn shared_pending_objects_are_reserved_once_and_retention_gets_only_own_credit() {
        let dir = tempfile::tempdir().unwrap();
        let a = dir.path().join("a.md");
        let b = dir.path().join("b.md");
        fs::write(&a, b"A").unwrap();
        fs::write(&b, b"A").unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        store.set_limit_mb(1).unwrap();
        let shared = vec![b'x'; 600_000];
        assert!(commit(&store, &a, b"A", &shared, None, Some("durable-ready")).is_err());
        let second = commit(&store, &b, b"A", &shared, None, None).unwrap();
        assert!(!second.pending_finalize);
        assert_eq!(fs::read(&b).unwrap(), shared);
        let other = tempfile::tempdir().unwrap();
        let path = other.path().join("a.md");
        fs::write(&path, b"A").unwrap();
        let store = HistoryStore::open(&other.path().join("app")).unwrap();
        store.set_limit_mb(1).unwrap();
        let mut previous = b"A".to_vec();
        for n in 0..14 {
            let mut body = vec![b'z'; 93_000];
            body[..8].copy_from_slice(format!("{n:08}").as_bytes());
            let saved = commit(&store, &path, &previous, &body, None, None).unwrap();
            assert!(!saved.pending_finalize);
            previous = body;
        }
        assert_eq!(store.documents().unwrap()[0].versions.len(), 10);
        assert!(store.usage_bytes().unwrap() < 1_000_000);
    }
    #[test]
    fn new_copy_has_new_identity_and_never_clobbers_or_publishes_on_quota_failure() {
        let dir = tempfile::tempdir().unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        let target = dir.path().join("copy.md");
        let saved = store
            .publish_new_markdown(&target, dir.path(), b"# Copy")
            .unwrap();
        assert_eq!(
            store.document(&saved.document_id).unwrap().versions.len(),
            1
        );
        assert!(store
            .publish_new_markdown(&target, dir.path(), b"overwrite")
            .is_err());
        assert_eq!(fs::read(&target).unwrap(), b"# Copy");
        store.set_limit_mb(1).unwrap();
        let missing = dir.path().join("missing.md");
        assert!(store
            .publish_new_markdown(&missing, dir.path(), &vec![b'x'; 1_100_000])
            .is_err());
        assert!(!missing.exists());
    }
    #[test]
    fn own_published_journal_can_finalize_without_restart_and_retry_does_not_duplicate() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        fs::write(&path, b"A").unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        let saved = commit(&store, &path, b"A", b"B", None, Some("source-published")).unwrap();
        assert!(saved.pending_finalize);
        assert!(store.recover().unwrap().is_empty());
        assert_eq!(
            store.document(&saved.document_id).unwrap().versions.len(),
            2
        );
        assert!(
            !commit(&store, &path, b"B", b"B", None, None)
                .unwrap()
                .changed
        );
        assert_eq!(
            store.document(&saved.document_id).unwrap().versions.len(),
            2
        );
    }
}
