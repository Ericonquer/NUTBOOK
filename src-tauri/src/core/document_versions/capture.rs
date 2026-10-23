//! Explicit-save Markdown capture. Uses the Markdown parser and existing
//! portable HTML whitelist; never interprets script or scans while typing.
use super::{digest, Dependency, HistoryError, Result, Snapshot};
use crate::core::document::{
    parse_portable_html_tag, portable_tag_attribute, validate_portable_image_html_structure,
};
use pulldown_cmark::{Event, Options, Parser, Tag};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::{Component, Path, PathBuf},
};

pub struct CapturedMarkdown {
    pub snapshot: Snapshot,
    pub objects: BTreeMap<String, Vec<u8>>,
    reads: BTreeMap<PathBuf, (String, u64)>,
    absent: BTreeSet<PathBuf>,
    bindings: BTreeMap<PathBuf, PathBuf>,
}
impl CapturedMarkdown {
    /// Call under the document save lock immediately before durable prepare.
    pub fn recheck(&self) -> Result<()> {
        for (reference, canonical) in &self.bindings {
            if reference.canonicalize().ok().as_ref() != Some(canonical) {
                return Err(HistoryError::Conflict);
            }
        }
        for path in &self.absent {
            match fs::metadata(path) {
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
                _ => return Err(HistoryError::Conflict),
            }
        }
        for (path, (expected, size)) in &self.reads {
            if digest(&read_regular_bounded(path, *size).map_err(|_| HistoryError::Conflict)?)
                != *expected
            {
                return Err(HistoryError::Conflict);
            }
        }
        Ok(())
    }
}
fn read_regular_bounded(path: &Path, budget: u64) -> Result<Vec<u8>> {
    use std::io::Read;
    let mut options = fs::OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        // Refuse leaf symlink swaps and avoid blocking on a swapped FIFO.
        options.custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK);
    }
    let file = options.open(path)?;
    if !file.metadata()?.is_file() {
        return Err(HistoryError::Invalid(
            "resource is not a regular file".into(),
        ));
    }
    let mut bytes = Vec::new();
    file.take(budget.saturating_add(1))
        .read_to_end(&mut bytes)?;
    if bytes.len() as u64 > budget {
        return Err(HistoryError::Invalid("capture budget exceeded".into()));
    }
    Ok(bytes)
}
fn image_references(markdown: &str) -> BTreeSet<String> {
    let mut refs = BTreeSet::new();
    for event in Parser::new_ext(markdown, Options::all()) {
        match event {
            Event::Start(Tag::Image { dest_url, .. }) => {
                refs.insert(dest_url.into_string());
            }
            Event::Html(raw) | Event::InlineHtml(raw) => {
                let html = raw.trim();
                if !html.contains("src") {
                    continue;
                }
                if validate_portable_image_html_structure(html) {
                    let mut cursor = 0;
                    while cursor < html.len() {
                        if html.as_bytes()[cursor] != b'<' {
                            cursor += 1;
                            continue;
                        }
                        if let Some(tag) = parse_portable_html_tag(html, &mut cursor) {
                            if let Some(src) = portable_tag_attribute(&tag, "src") {
                                refs.insert(src.to_owned());
                            }
                        } else {
                            cursor += 1;
                        }
                    }
                } else {
                    refs.insert("nutbook-unsupported:raw-html".into());
                }
            }
            _ => {}
        }
    }
    refs
}
fn normalize(path: &Path) -> Option<PathBuf> {
    let mut result = PathBuf::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                if !result.pop() {
                    return None;
                }
            }
            other => result.push(other.as_os_str()),
        }
    }
    Some(result)
}
/// Capture only exact references under an already authorized canonical root.
/// Budget includes body and unique resource bytes. Exceeding it is a failure,
/// never a silently truncated "complete" snapshot.
pub fn capture_markdown(
    path: &Path,
    authorized_root: &Path,
    body: &[u8],
    budget: u64,
) -> Result<CapturedMarkdown> {
    let root = authorized_root.canonicalize()?;
    let path = match path.canonicalize() {
        Ok(path) => path,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => path
            .parent()
            .ok_or_else(|| HistoryError::Invalid("missing parent".into()))?
            .canonicalize()?
            .join(
                path.file_name()
                    .ok_or_else(|| HistoryError::Invalid("missing filename".into()))?,
            ),
        Err(e) => return Err(e.into()),
    };
    if !path.starts_with(&root) {
        return Err(HistoryError::Invalid(
            "source outside authorized root".into(),
        ));
    }
    let text = std::str::from_utf8(body)
        .map_err(|_| HistoryError::Invalid("Markdown is not UTF-8".into()))?;
    if body.len() as u64 > budget {
        return Err(HistoryError::Invalid("capture budget exceeded".into()));
    }
    let base = url::Url::from_file_path(&path)
        .map_err(|_| HistoryError::Invalid("invalid file URL".into()))?;
    let mut result = CapturedMarkdown {
        snapshot: Snapshot {
            body: digest(body),
            dependencies: BTreeMap::new(),
        },
        objects: BTreeMap::from([(digest(body), body.to_vec())]),
        reads: BTreeMap::new(),
        absent: BTreeSet::new(),
        bindings: BTreeMap::new(),
    };
    let mut used = body.len() as u64;
    let references = image_references(text);
    if references.len() > 4096 {
        return Err(HistoryError::Invalid("too many image references".into()));
    }
    for reference in references {
        if reference.starts_with("data:") {
            continue;
        }
        let excluded = |reason: &str| Dependency::NotCaptured {
            reason: reason.into(),
        };
        let dependency = (|| -> Result<Dependency> {
            let Ok(mut url) = base.join(&reference) else {
                return Ok(excluded("unresolvable URL"));
            };
            if url.scheme() != "file" {
                return Ok(excluded("remote or unsupported reference"));
            }
            url.set_query(None);
            url.set_fragment(None);
            let Ok(candidate) = url.to_file_path() else {
                return Ok(excluded("unsupported file URL"));
            };
            let Some(candidate) = normalize(&candidate) else {
                return Ok(excluded("invalid path"));
            };
            if !candidate.starts_with(&root) {
                return Ok(excluded("outside authorized root"));
            }
            // Validate nearest existing ancestor even for an absent leaf. This
            // prevents an in-root symlink to an outside missing target.
            let mut ancestor = candidate.as_path();
            loop {
                match fs::symlink_metadata(ancestor) {
                    Ok(_) => {
                        if !ancestor.canonicalize()?.starts_with(&root) {
                            return Ok(excluded("symlink outside authorized root"));
                        }
                        break;
                    }
                    Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                        ancestor = ancestor
                            .parent()
                            .ok_or_else(|| HistoryError::Invalid("missing ancestor".into()))?;
                    }
                    Err(e) => return Err(e.into()),
                }
            }
            let metadata = match fs::metadata(&candidate) {
                Ok(metadata) => metadata,
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                    result.absent.insert(candidate.clone());
                    return Ok(Dependency::MissingAtSave {
                        reason: "not found before capture".into(),
                    });
                }
                Err(e) => return Err(e.into()),
            };
            if !metadata.is_file() {
                return Ok(excluded("not a regular file"));
            }
            let canonical = candidate.canonicalize()?;
            if !canonical.starts_with(&root) {
                return Ok(excluded("symlink outside authorized root"));
            }
            if metadata.len() > budget.saturating_sub(used) {
                return Err(HistoryError::Invalid("capture budget exceeded".into()));
            }
            let bytes = read_regular_bounded(&canonical, budget.saturating_sub(used))?;
            let hash = digest(&bytes);
            if !result.objects.contains_key(&hash) {
                used += bytes.len() as u64;
                result.objects.insert(hash.clone(), bytes.clone());
            }
            result.bindings.insert(candidate.clone(), canonical.clone());
            result
                .reads
                .insert(canonical, (hash.clone(), bytes.len() as u64));
            Ok(Dependency::Captured {
                object: hash,
                bytes: bytes.len() as u64,
            })
        })()?;
        result.snapshot.dependencies.insert(reference, dependency);
    }
    result.recheck()?;
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn parser_handles_references_code_remote_missing_and_dedup() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("note.md");
        fs::write(&path, "source").unwrap();
        fs::write(dir.path().join("图.svg"), b"image").unwrap();
        let body="![a](图.svg)\n\n![b][x]\n\n[x]: %E5%9B%BE.svg \"title\"\n\n![missing](missing.svg)\n\n![remote](https://example.invalid/x)\n\n```md\n![code](code.svg)\n```";
        let captured = capture_markdown(&path, dir.path(), body.as_bytes(), 10000).unwrap();
        assert_eq!(captured.objects.len(), 2);
        assert!(matches!(
            captured.snapshot.dependencies["missing.svg"],
            Dependency::MissingAtSave { .. }
        ));
        assert!(matches!(
            captured.snapshot.dependencies["https://example.invalid/x"],
            Dependency::NotCaptured { .. }
        ));
        assert!(!captured.snapshot.dependencies.contains_key("code.svg"));
        fs::write(dir.path().join("图.svg"), b"changed").unwrap();
        assert!(matches!(captured.recheck(), Err(HistoryError::Conflict)));
    }
    #[cfg(unix)]
    #[test]
    fn boundary_and_symlinks_never_grant_reads() {
        let root = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let path = root.path().join("note.md");
        fs::write(&path, b"source").unwrap();
        fs::write(outside.path().join("secret"), b"secret").unwrap();
        std::os::unix::fs::symlink(outside.path(), root.path().join("escape")).unwrap();
        let captured = capture_markdown(
            &path,
            root.path(),
            b"![a](escape/secret)\n![b](escape/missing)",
            10000,
        )
        .unwrap();
        assert_eq!(captured.objects.len(), 1);
        assert!(captured
            .snapshot
            .dependencies
            .values()
            .all(|d| matches!(d, Dependency::NotCaptured { .. })));
    }
    #[test]
    fn portable_image_preserves_source_and_missing_has_no_object() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("note.md");
        fs::write(&path, b"source").unwrap();
        fs::write(dir.path().join("image.svg"), b"image").unwrap();
        let body=b"<!-- nutbook-cover -->\n\n<img src=\"image.svg\" alt=\"keep\" width=\"120\">\n\n<img src=\"missing.svg\" alt=\"missing\">";
        let captured = capture_markdown(&path, dir.path(), body, 10000).unwrap();
        assert_eq!(captured.objects[&digest(body)], body);
        assert!(matches!(
            captured.snapshot.dependencies["image.svg"],
            Dependency::Captured { .. }
        ));
        assert!(matches!(
            captured.snapshot.dependencies["missing.svg"],
            Dependency::MissingAtSave { .. }
        ));
        assert_eq!(captured.objects.len(), 2);
    }
    #[cfg(unix)]
    #[test]
    fn fifo_resource_fails_without_blocking() {
        use std::ffi::CString;
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("pipe");
        let c = CString::new(path.to_str().unwrap()).unwrap();
        assert_eq!(unsafe { libc::mkfifo(c.as_ptr(), 0o600) }, 0);
        assert!(read_regular_bounded(&path, 100).is_err());
    }
    #[test]
    fn actual_ui_fixture_is_capturable_with_original_source_bytes() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join("tests/fixtures/document-save-versions");
        let path = root.join("markdown.md");
        let body = fs::read(&path).unwrap();
        let captured = capture_markdown(&path, &root, &body, 2_000_000).unwrap();
        assert_eq!(captured.objects[&digest(&body)], body);
        // This is also the user's native acceptance sample. A real restore
        // deliberately relocates its image URLs; do not reset the file or
        // require the pre-acceptance spelling of those URLs.
        assert!(captured.snapshot.dependencies.values().any(|dependency| matches!(dependency, Dependency::Captured { bytes, .. } if *bytes>0)));
        assert!(captured.snapshot.dependencies.values().any(|dependency| matches!(dependency, Dependency::MissingAtSave { reason } if !reason.is_empty())));
        assert!(!captured.snapshot.dependencies.contains_key("secret.png"));
        assert_eq!(captured.objects.len(), 2);
        assert!(capture_markdown(&path, &root, &body, 1).is_err());
    }
    #[test]
    fn resource_appearing_after_missing_capture_is_a_conflict() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        fs::write(&path, b"source").unwrap();
        let captured = capture_markdown(&path, dir.path(), b"![a](missing.svg)", 10000).unwrap();
        fs::write(dir.path().join("missing.svg"), b"appeared during save").unwrap();
        assert!(matches!(captured.recheck(), Err(HistoryError::Conflict)));
    }
    #[cfg(unix)]
    #[test]
    fn changing_in_root_symlink_target_is_a_conflict() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        let link = dir.path().join("image.svg");
        fs::write(&path, b"source").unwrap();
        fs::write(dir.path().join("old.svg"), b"old").unwrap();
        fs::write(dir.path().join("new.svg"), b"new").unwrap();
        std::os::unix::fs::symlink("old.svg", &link).unwrap();
        let captured = capture_markdown(&path, dir.path(), b"![a](image.svg)", 10000).unwrap();
        fs::remove_file(&link).unwrap();
        std::os::unix::fs::symlink("new.svg", &link).unwrap();
        assert!(matches!(captured.recheck(), Err(HistoryError::Conflict)));
    }
}
