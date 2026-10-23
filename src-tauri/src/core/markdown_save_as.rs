//! Ordinary library Save As: frozen disk source, isolated image copies, and
//! history-protected target publication. The caller owns target selection.
use super::document_versions::{
    capture_markdown, digest, relocate_markdown, CommitResult, Dependency, HistoryError,
    HistoryStore,
};
use std::{
    collections::BTreeMap,
    fs,
    io::Write,
    path::{Path, PathBuf},
};

struct Assets(Option<PathBuf>);
impl Drop for Assets {
    fn drop(&mut self) {
        if let Some(path) = self.0.take() {
            let _ = fs::remove_dir_all(path);
        }
    }
}

/// `expected` is the selected target's hash, or None for a new file. Read it
/// before preparing resources; the history writer checks it again under lock.
pub fn publish(
    store: &HistoryStore,
    source: &Path,
    content: &str,
    target: &Path,
    expected: Option<&str>,
) -> Result<CommitResult, HistoryError> {
    let source = source.canonicalize()?;
    let source_root = source
        .parent()
        .ok_or_else(|| HistoryError::Invalid("source parent".into()))?;
    let target_root = target
        .parent()
        .ok_or_else(|| HistoryError::Invalid("target parent".into()))?
        .canonicalize()?;
    if source_root == target_root {
        return publish_projected(
            store,
            content,
            target,
            expected,
            &BTreeMap::new(),
            &BTreeMap::new(),
            None,
        );
    }
    let captured = capture_markdown(
        &source,
        source_root,
        content.as_bytes(),
        store.settings()?.limit_bytes,
    )?;
    captured.recheck()?;
    publish_projected(
        store,
        content,
        target,
        expected,
        &captured.snapshot.dependencies,
        &captured.objects,
        None,
    )
}

/// Read only immutable archived objects; no source file or live resource access.
pub fn publish_archived(
    store: &HistoryStore,
    document_id: &str,
    version_id: &str,
    target: &Path,
    expected: Option<&str>,
    allow_incomplete: bool,
) -> Result<CommitResult, HistoryError> {
    let head = store.document(document_id)?;
    let version = head
        .versions
        .iter()
        .find(|v| v.id == version_id)
        .ok_or_else(|| HistoryError::Invalid("version does not belong to document".into()))?;
    if !allow_incomplete
        && version
            .snapshot
            .dependencies
            .values()
            .any(|d| !matches!(d, Dependency::Captured { .. }))
    {
        return Err(HistoryError::Invalid(
            "incomplete version requires explicit confirmation".into(),
        ));
    }
    let body = store.object(&version.snapshot.body)?;
    let content = std::str::from_utf8(&body)
        .map_err(|_| HistoryError::Invalid("Markdown is not UTF-8".into()))?;
    let mut objects = BTreeMap::new();
    for dependency in version.snapshot.dependencies.values() {
        if let Dependency::Captured { object, .. } = dependency {
            objects.insert(object.clone(), store.object(object)?);
        }
    }
    publish_projected(
        store,
        content,
        target,
        expected,
        &version.snapshot.dependencies,
        &objects,
        Some(version_id.into()),
    )
}

fn publish_projected(
    store: &HistoryStore,
    content: &str,
    target: &Path,
    expected: Option<&str>,
    dependencies: &BTreeMap<String, Dependency>,
    objects: &BTreeMap<String, Vec<u8>>,
    restored_from: Option<String>,
) -> Result<CommitResult, HistoryError> {
    let target_root = target
        .parent()
        .ok_or_else(|| HistoryError::Invalid("target parent".into()))?
        .canonicalize()?;
    let target = target_root.join(
        target
            .file_name()
            .ok_or_else(|| HistoryError::Invalid("target filename".into()))?,
    );
    let mut assets = Assets(None);
    let mut replacements = BTreeMap::new();
    let mut copies = BTreeMap::new();
    if !dependencies.is_empty() {
        let directory_name = format!("nutbook-assets-{}", uuid::Uuid::new_v4());
        for (reference, dependency) in dependencies {
            match dependency {
                Dependency::Captured { object, .. } => {
                    let suffix = reference
                        .split(['?', '#'])
                        .next()
                        .and_then(|r| Path::new(r).extension())
                        .and_then(|s| s.to_str())
                        .filter(|s| s.len() <= 8 && s.bytes().all(|b| b.is_ascii_alphanumeric()))
                        .unwrap_or("bin");
                    let name = format!("{object}.{suffix}");
                    replacements.insert(reference.clone(), format!("{directory_name}/{name}"));
                    copies.insert(
                        name,
                        objects
                            .get(object)
                            .ok_or_else(|| HistoryError::Invalid("missing archived object".into()))?
                            .clone(),
                    );
                }
                Dependency::MissingAtSave { .. } => {
                    // A same-named target resource must not silently replace a
                    // missing source image. Keep that reference missing.
                    replacements.insert(
                        reference.clone(),
                        format!("{directory_name}/missing-{}", digest(reference.as_bytes())),
                    );
                }
                Dependency::NotCaptured { .. }
                    if reference.starts_with("https://") || reference.starts_with("http://") => {}
                Dependency::NotCaptured { .. } => {
                    return Err(HistoryError::Invalid(
                        "uncaptured local resource cannot be safely exported".into(),
                    ))
                }
            }
        }
        if !replacements.is_empty() {
            let directory = target_root.join(directory_name);
            fs::create_dir(&directory)?; // exclusive ownership, no existing files
            assets.0 = Some(directory.clone());
            for (name, bytes) in copies {
                let mut file = fs::OpenOptions::new()
                    .write(true)
                    .create_new(true)
                    .open(directory.join(name))?;
                file.write_all(&bytes)?;
                file.sync_all()?;
            }
            fs::File::open(&directory)?.sync_all()?;
            fs::File::open(&target_root)?.sync_all()?;
        }
    }
    let projected = if replacements.is_empty() {
        content.to_owned()
    } else {
        relocate_markdown(content, &replacements)?
    };
    let result = match expected {
        Some(hash) => store.save_markdown(
            &target,
            &target_root,
            hash,
            projected.as_bytes(),
            restored_from.clone(),
        ),
        None => store.publish_new_markdown_from(
            &target,
            &target_root,
            projected.as_bytes(),
            restored_from,
        ),
    }?;
    assets.0 = None; // source durable, exported assets belong to the user
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn archived_save_as_survives_deleted_source_and_keeps_target_preimage() {
        let dir = tempfile::tempdir().unwrap();
        let source_dir = dir.path().join("source");
        fs::create_dir(&source_dir).unwrap();
        let source = source_dir.join("a.md");
        let a = "# Archived A\n![image](photo.svg)\n![missing](missing.png)\n";
        fs::write(&source, a).unwrap();
        fs::write(source_dir.join("photo.svg"), b"archived image").unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        let saved = store
            .save_markdown(&source, &source_dir, &digest(a.as_bytes()), b"# B", None)
            .unwrap();
        let head = store.document(&saved.document_id).unwrap();
        let version = &head.versions[0];
        fs::remove_dir_all(&source_dir).unwrap();
        let output = dir.path().join("output");
        fs::create_dir(&output).unwrap();
        let target = output.join("copy.md");
        fs::write(&target, b"target original").unwrap();
        assert!(publish_archived(
            &store,
            &head.id,
            &version.id,
            &target,
            Some(&digest(b"target original")),
            false
        )
        .is_err());
        assert_eq!(fs::read_dir(&output).unwrap().count(), 1);
        let result = publish_archived(
            &store,
            &head.id,
            &version.id,
            &target,
            Some(&digest(b"target original")),
            true,
        )
        .unwrap();
        let restored = store.document(&result.document_id).unwrap();
        assert_eq!(
            store.object(&restored.versions[0].snapshot.body).unwrap(),
            b"target original"
        );
        assert_eq!(
            restored.versions[1].restored_from.as_deref(),
            Some(version.id.as_str())
        );
        assert!(restored.versions[1].snapshot.dependencies.values().any(|d| matches!(d, Dependency::Captured { object, .. } if store.object(object).unwrap() == b"archived image")));
        assert!(
            !source.exists(),
            "must never recreate the missing original path implicitly"
        );
        assert!(fs::read_to_string(&target)
            .unwrap()
            .starts_with("# Archived A"));
        let fresh = output.join("new.md");
        publish_archived(&store, &head.id, &version.id, &fresh, None, true).unwrap();
        let new_head = store
            .documents()
            .unwrap()
            .into_iter()
            .find(|d| d.canonical_path == fresh.canonicalize().unwrap())
            .unwrap();
        assert_eq!(
            new_head.versions.last().unwrap().restored_from.as_deref(),
            Some(version.id.as_str())
        );
        let count = fs::read_dir(&output).unwrap().count();
        assert!(publish_archived(
            &store,
            &head.id,
            &version.id,
            &target,
            Some(&digest(b"target original")),
            true
        )
        .is_err());
        assert_eq!(fs::read_dir(&output).unwrap().count(), count);
    }
    #[test]
    fn quota_failure_retains_target_and_cleans_prepared_assets() {
        let dir = tempfile::tempdir().unwrap();
        let source_dir = dir.path().join("source");
        let output = dir.path().join("output");
        fs::create_dir(&source_dir).unwrap();
        fs::create_dir(&output).unwrap();
        let source = source_dir.join("source.md");
        let target = output.join("copy.md");
        let body = format!("# B\n![image](image.svg)\n{}", "x".repeat(600_000));
        fs::write(&source, &body).unwrap();
        fs::write(source_dir.join("image.svg"), b"image").unwrap();
        let old = "A".repeat(600_000);
        fs::write(&target, &old).unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        store.set_limit_mb(1).unwrap();
        assert!(matches!(
            publish(
                &store,
                &source,
                &body,
                &target,
                Some(&digest(old.as_bytes()))
            ),
            Err(HistoryError::Quota { .. })
        ));
        assert_eq!(fs::read_to_string(&target).unwrap(), old);
        assert_eq!(fs::read_dir(&output).unwrap().count(), 1);
        assert!(store.documents().unwrap().is_empty());
        store.set_limit_mb(2).unwrap();
        publish(
            &store,
            &source,
            &body,
            &target,
            Some(&digest(old.as_bytes())),
        )
        .unwrap();
        assert!(fs::read_to_string(&target).unwrap().starts_with("# B"));
    }
    #[test]
    fn save_as_isolates_images_preserves_preimage_and_rejects_stale_target() {
        let dir = tempfile::tempdir().unwrap();
        let source_dir = dir.path().join("source");
        let output = dir.path().join("output");
        fs::create_dir(&source_dir).unwrap();
        fs::create_dir(&output).unwrap();
        let source = source_dir.join("source.md");
        let target = output.join("copy.md");
        let body = "# B\r\n![image](image.svg)\r\n![gone](gone.png)\r\n`![code](image.svg)`\r\n";
        fs::write(&source, body).unwrap();
        fs::write(source_dir.join("image.svg"), b"source image").unwrap();
        fs::write(output.join("image.svg"), b"target image").unwrap();
        fs::write(output.join("gone.png"), b"unrelated image").unwrap();
        let old = b"# A\n![old](image.svg)\n";
        fs::write(&target, old).unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        let saved = publish(&store, &source, body, &target, Some(&digest(old))).unwrap();
        let head = store.document(&saved.document_id).unwrap();
        assert_eq!(head.versions.len(), 2);
        assert_eq!(store.object(&head.versions[0].snapshot.body).unwrap(), old);
        let image = head.versions[0]
            .snapshot
            .dependencies
            .get("image.svg")
            .unwrap();
        assert!(
            matches!(image, Dependency::Captured { object, .. } if store.object(object).unwrap() == b"target image")
        );
        let after = &head.versions[1].snapshot.dependencies;
        assert!(after
            .iter()
            .any(|(reference, dependency)| reference.contains("/missing-")
                && matches!(dependency, Dependency::MissingAtSave { .. })));
        assert!(after.values().any(|dependency| matches!(dependency, Dependency::Captured { object, .. } if store.object(object).unwrap() == b"source image")));
        let exported = fs::read_to_string(&target).unwrap();
        assert!(exported.contains("nutbook-assets-"));
        assert!(exported.contains("`![code](image.svg)`\r\n"));
        assert_eq!(fs::read(&source).unwrap(), body.as_bytes());
        assert_eq!(fs::read(output.join("image.svg")).unwrap(), b"target image");
        let entries = fs::read_dir(&output).unwrap().count();
        assert!(publish(&store, &source, body, &target, Some(&digest(old))).is_err());
        assert_eq!(
            fs::read_dir(&output).unwrap().count(),
            entries,
            "failed save must remove its own assets"
        );
        assert_eq!(fs::read_to_string(&target).unwrap(), exported);
        let new_target = output.join("new.md");
        publish(&store, &source, body, &new_target, None).unwrap();
        let new_bytes = fs::read(&new_target).unwrap();
        assert!(publish(&store, &source, body, &new_target, None).is_err());
        assert_eq!(fs::read(&new_target).unwrap(), new_bytes);
    }
}
