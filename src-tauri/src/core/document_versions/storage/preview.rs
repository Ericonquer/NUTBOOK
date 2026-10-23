use super::*;
use crate::core::scoped_content_server::ScopedContentServer;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(super) struct PreviewRecord {
    schema: u32,
    owner: String,
    session: String,
    document: String,
    version: String,
    generation: u64,
    manifest_digest: String,
    snapshot: Snapshot,
}
#[derive(Debug)]
pub(super) struct VersionPreviewSession {
    record: PreviewRecord,
    server: ScopedContentServer,
    projection: PathBuf,
}
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewInfo {
    pub session_id: String,
    pub generation: u64,
    pub url: String,
    pub source: String,
    pub html: String,
    pub incomplete: bool,
}

// Hide metadata only in the visual projection. Parser spans keep code examples
// and the immutable archived/source-view bytes untouched.
fn without_cover_markers(source:&str)->String {
    use pulldown_cmark::{Event,Options,Parser};
    let mut ranges=Parser::new_ext(source,Options::all()).into_offset_iter().filter_map(|(event,span)|match event {
        Event::Html(text)|Event::InlineHtml(text) if text.trim()==crate::core::markdown_cover::COVER_MARKER=>Some(span),
        _=>None,
    }).collect::<Vec<_>>();
    let mut projected=source.to_owned();
    ranges.sort_by_key(|range|range.start);
    for range in ranges.into_iter().rev(){projected.replace_range(range,"");}
    projected
}

struct ProjectionGuard<'a> {
    store: &'a HistoryStore,
    session: String,
    path: PathBuf,
    created: bool,
    committed: bool,
}
impl Drop for ProjectionGuard<'_> {
    fn drop(&mut self) {
        if self.committed {
            return;
        }
        let safe = if self.created {
            remove_owned_projection(&self.path).is_ok()
        } else {
            true
        };
        if safe {
            if let Ok(_quota) = self.store.quota_lock() {
                let _ = fs::remove_file(
                    self.store
                        .root
                        .join("preview-journals")
                        .join(format!("{}.json", self.session)),
                );
            }
        }
    }
}
impl HistoryStore {
    pub fn begin_markdown_preview(
        &self,
        document: &str,
        version: &str,
        generation: u64,
    ) -> Result<PreviewInfo> {
        check_id(version)?;
        let initial = self.document(document)?;
        let _path = self.path_lock(&initial.canonical_path)?;
        let head = self.document(document)?;
        let version = head
            .versions
            .iter()
            .find(|v| v.id == version)
            .ok_or_else(|| invalid("unknown preview version"))?;
        self.verify_manifest(document, version)?;
        let session = Uuid::new_v4().to_string();
        let record = PreviewRecord {
            schema: SCHEMA,
            owner: self.owner.clone(),
            session: session.clone(),
            document: document.into(),
            version: version.id.clone(),
            generation,
            manifest_digest: digest(&json_bytes(version)?),
            snapshot: version.snapshot.clone(),
        };
        let projection = self
            .root
            .join("preview-projections")
            .join(&self.owner)
            .join(&session);
        {
            let _quota = self.quota_lock()?;
            atomic_bytes(
                &self
                    .root
                    .join("preview-journals")
                    .join(format!("{session}.json")),
                &json_bytes(&record)?,
                false,
            )?;
        }
        let mut cleanup = ProjectionGuard {
            store: self,
            session: session.clone(),
            path: projection.clone(),
            created: false,
            committed: false,
        };
        // Journal pins objects before any IO. Errors retain owned material for
        // dead-owner cleanup; no broad app-data root is ever served.
        fs::create_dir_all(projection.parent().unwrap())?;
        fs::create_dir(&projection)?;
        cleanup.created = true;
        atomic_bytes(&projection.join("owner.json"), &json_bytes(&record)?, false)?;
        let served = projection.join("content");
        fs::create_dir(&served)?;
        if version.snapshot.html.is_some() {
            let server = ScopedContentServer::start(&served)
                .map_err(|e| invalid(format!("preview server: {e}")))?;
            let objects = version.snapshot.hashes().map(|hash| Ok((hash.to_owned(), self.object(hash)?)))
                .collect::<Result<BTreeMap<_, _>>>()?;
            let projection_html = super::super::html_projection::project(&version.snapshot, &objects, &server.origin())?;
            for (name, bytes) in &projection_html.files {
                atomic_bytes(&served.join(name), bytes, false)?;
            }
            let filename = format!("{session}-preview.html");
            atomic_bytes(&served.join(&filename), projection_html.page.as_bytes(), false)?;
            let url = server.relative_url(Path::new(&filename)).ok_or_else(|| invalid("preview URL"))?;
            let incomplete = projection_html.incomplete;
            self.previews.lock().map_err(|_| invalid("preview lock"))?.insert(session.clone(), VersionPreviewSession { record, server, projection });
            cleanup.committed = true;
            return Ok(PreviewInfo { session_id: session, generation, url, source: projection_html.source, html: projection_html.page, incomplete });
        }
        let mut replacements = BTreeMap::new();
        let mut incomplete = version
            .snapshot
            .dependencies
            .values()
            .any(|d| !matches!(d, Dependency::Captured { .. }));
        for (reference, dep) in &version.snapshot.dependencies {
            let Dependency::Captured { object, .. } = dep else {
                continue;
            };
            let bytes = self.object(object)?;
            let suffix = match image::guess_format(&bytes) {
                Ok(image::ImageFormat::Png) => "png",
                Ok(image::ImageFormat::Jpeg) => "jpg",
                Ok(image::ImageFormat::Gif) => "gif",
                Ok(image::ImageFormat::WebP) => "webp",
                _ if crate::core::markdown_cover_assets::validate_safe_svg(
                    &bytes,
                    Path::new("history.svg"),
                )
                .is_ok() =>
                {
                    "svg"
                }
                _ => {
                    incomplete = true;
                    continue;
                }
            };
            let name = format!("{session}-{object}.{suffix}");
            atomic_bytes(&served.join(&name), &bytes, false)?;
            replacements.insert(reference.clone(), name.clone());
        }
        let source = String::from_utf8(self.object(&version.snapshot.body)?)
            .map_err(|_| invalid("preview Markdown encoding"))?;
        // Unsupported raw HTML remains visible in source view. Render unsafe
        // atoms escaped rather than guessing a rewrite or reading live paths.
        let rendered = crate::core::markdown_render::render_markdown_html(&without_cover_markers(&source));
        let html = ammonia::Builder::default()
            .add_tag_attributes("img", ["width", "height"])
            .attribute_filter(move |tag, attribute, value| {
                if attribute == "href" || attribute == "srcset" {
                    return None;
                }
                if attribute == "src" {
                    return if tag == "img" {
                        replacements.get(value).map(|name| name.clone().into())
                    } else {
                        None
                    };
                }
                Some(value.into())
            })
            .clean(&rendered)
            .to_string();
        let filename = format!("{session}-preview.html");
        let page=format!("<!doctype html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'none'; connect-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; object-src 'none'\"><style>body{{font:16px/1.7 system-ui;margin:24px;overflow-wrap:anywhere}}img{{max-width:100%;height:auto}}pre{{white-space:pre-wrap}}table{{border-collapse:collapse}}td,th{{border:1px solid #bbb;padding:6px}}</style></head><body>{html}</body></html>");
        atomic_bytes(&served.join(&filename), page.as_bytes(), false)?;
        let server = ScopedContentServer::start(&served)
            .map_err(|e| invalid(format!("preview server: {e}")))?;
        let url = server
            .relative_url(Path::new(&filename))
            .ok_or_else(|| invalid("preview URL"))?;
        // Inline projection avoids a second frame navigation from the custom
        // application origin. Only this session's immutable image origin is allowed.
        let inline_page=page.replace("img-src 'self'", &format!("img-src {}",server.origin()))
            .replace("<img src=\"", &format!("<img src=\"{}/",server.origin()));
        self.previews
            .lock()
            .map_err(|_| invalid("preview lock"))?
            .insert(
                session.clone(),
                VersionPreviewSession {
                    record,
                    server,
                    projection,
                },
            );
        cleanup.committed = true;
        Ok(PreviewInfo {
            session_id: session,
            generation,
            url,
            source,
            html: inline_page,
            incomplete,
        })
    }
    pub fn close_preview(&self, session: &str) -> Result<()> {
        check_id(session)?;
        let value = self
            .previews
            .lock()
            .map_err(|_| invalid("preview lock"))?
            .remove(session);
        if let Some(value) = value {
            let VersionPreviewSession {
                record,
                server,
                projection,
            } = value;
            drop(server); // closes origin and waits for worker shutdown first
            remove_owned_projection(&projection)?;
            let _quota = self.quota_lock()?;
            fs::remove_file(
                self.root
                    .join("preview-journals")
                    .join(format!("{}.json", record.session)),
            )?;
        }
        Ok(())
    }
    pub(super) fn preview_records(&self) -> Result<Vec<PreviewRecord>> {
        let mut records = Vec::new();
        for entry in fs::read_dir(self.root.join("preview-journals"))? {
            let entry = entry?;
            // Atomic writes publish only .json journals. A killed writer may
            // leave a partial .tmp; it is not a lease or cleanup authority.
            if entry.path().extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            if !entry.file_type()?.is_file() {
                return Err(invalid("preview journal type"));
            }
            let record: PreviewRecord = read_json(&entry.path())?;
            check_id(&record.owner)?;
            check_id(&record.session)?;
            check_id(&record.document)?;
            check_id(&record.version)?;
            if record.schema != SCHEMA
                || entry.file_name().to_string_lossy() != format!("{}.json", record.session)
                || !valid_hash(&record.manifest_digest)
            {
                return Err(invalid("preview journal identity"));
            }
            record.snapshot.validate()?;
            records.push(record);
        }
        Ok(records)
    }
    pub(super) fn preview_hashes(&self) -> Result<BTreeSet<String>> {
        Ok(self
            .preview_records()?
            .into_iter()
            .flat_map(|r| r.snapshot.hashes().map(str::to_owned).collect::<Vec<_>>())
            .collect())
    }
    pub(super) fn preview_version_ids(&self) -> Result<BTreeSet<String>> {
        Ok(self
            .preview_records()?
            .into_iter()
            .map(|r| r.version)
            .collect())
    }
    pub(super) fn has_foreign_preview(&self, document: &str) -> Result<bool> {
        Ok(self
            .preview_records()?
            .iter()
            .any(|r| r.document == document && r.owner != self.owner))
    }
    pub(super) fn close_document_previews(&self, document: &str) -> Result<()> {
        let ids: Vec<_> = self
            .previews
            .lock()
            .map_err(|_| invalid("preview lock"))?
            .iter()
            .filter(|(_, v)| v.record.document == document)
            .map(|(id, _)| id.clone())
            .collect();
        for id in ids {
            self.close_preview(&id)?;
        }
        Ok(())
    }
    pub(super) fn recover_previews(&self) -> Result<()> {
        for record in self.preview_records()? {
            if record.owner == self.owner {
                continue;
            }
            let Some(_owner) = OsLock::acquire(
                &self
                    .root
                    .join("owners")
                    .join(format!("{}.lock", record.owner)),
                true,
            )?
            else {
                continue;
            };
            let owner: Owner = read_json(
                &self
                    .root
                    .join("owners")
                    .join(format!("{}.json", record.owner)),
            )?;
            if owner.id != record.owner || owner.store != self.root || owner.schema != SCHEMA {
                return Err(invalid("preview owner"));
            }
            let projection = self
                .root
                .join("preview-projections")
                .join(&record.owner)
                .join(&record.session);
            validate_projection_ancestors(&projection)?;
            let exists = match fs::symlink_metadata(&projection) {
                Ok(metadata) => {
                    if !metadata.file_type().is_dir() { return Err(invalid("projection root is not a directory")); }
                    true
                }
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => false,
                Err(error) => return Err(error.into()),
            };
            if exists {
                if projection.join("owner.json").exists() {
                    let marker: PreviewRecord = read_json(&projection.join("owner.json"))?;
                    if json_bytes(&marker)? != json_bytes(&record)? {
                        return Err(invalid("preview marker"));
                    }
                }
                remove_owned_projection(&projection)?;
            }
            let _quota = self.quota_lock()?;
            fs::remove_file(
                self.root
                    .join("preview-journals")
                    .join(format!("{}.json", record.session)),
            )?;
        }
        Ok(())
    }
}
fn remove_owned_projection(path: &Path) -> Result<()> {
    validate_projection_ancestors(path)?;
    validate_projection_tree(path)?;
    remove_validated_projection(path)
}
fn validate_projection_ancestors(path: &Path) -> Result<()> {
    // Both the per-owner directory and projection registry must be physical
    // directories. Checking only the session's final component misses aliases.
    for ancestor in path.ancestors().skip(1).take(2) {
        match fs::symlink_metadata(ancestor) {
            Ok(metadata) if metadata.file_type().is_dir() => {},
            Ok(_) => return Err(invalid("symlink in projection ancestry")),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {},
            Err(error) => return Err(error.into()),
        }
    }
    Ok(())
}
fn validate_projection_tree(path: &Path) -> Result<()> {
    if !fs::symlink_metadata(path)?.file_type().is_dir() {
        return Err(invalid("projection root is not a directory"));
    }
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let kind = entry.file_type()?;
        if kind.is_dir() {
            validate_projection_tree(&entry.path())?;
        } else if !kind.is_file() {
            return Err(invalid("unexpected symlink in preview projection"));
        }
    }
    Ok(())
}
fn remove_validated_projection(path: &Path) -> Result<()> {
    // Recheck during mutation as well; never follow a substituted symlink.
    if !fs::symlink_metadata(path)?.file_type().is_dir() {
        return Err(invalid("projection root is not a directory"));
    }
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        if entry.file_type()?.is_dir() {
            remove_validated_projection(&entry.path())?;
        } else if entry.file_type()?.is_file() {
            fs::remove_file(entry.path())?;
        } else {
            return Err(invalid("unexpected symlink in preview projection"));
        }
    }
    fs::remove_dir(path)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn unpublished_preview_journal_does_not_block_recovery_or_gc() {
        let dir = tempfile::tempdir().unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        let temp = store.root.join("preview-journals/.nutbook-version-interrupted.tmp");
        fs::write(&temp, b"{partial atomic journal").unwrap();
        assert!(store.recover().unwrap().is_empty());
        assert!(store.preview_hashes().unwrap().is_empty());
        store.collect_unreferenced_objects().unwrap();
        assert!(temp.exists(), "unpublished material is not authority to delete unknown files");
        let malformed = store.root.join("preview-journals").join(format!("{}.json",Uuid::new_v4()));
        fs::write(malformed,b"{invalid published journal").unwrap();
        assert!(store.recover().is_err(), "a corrupt published journal must still fail closed");
    }

    #[cfg(unix)]
    #[test]
    fn projection_cleanup_rejects_symlink_before_removing_any_material() {
        let dir = tempfile::tempdir().unwrap();
        let projection = dir.path().join("projection");
        fs::create_dir(&projection).unwrap();
        fs::write(projection.join("owner.json"), b"ownership marker").unwrap();
        fs::create_dir(projection.join("content")).unwrap();
        fs::write(projection.join("content/keep.html"), b"projection").unwrap();
        let external = dir.path().join("external");
        fs::create_dir(&external).unwrap();
        fs::write(external.join("keep.txt"),b"user material").unwrap();
        std::os::unix::fs::symlink(&external,projection.join("content/link")).unwrap();
        assert!(remove_owned_projection(&projection).is_err());
        assert_eq!(fs::read(projection.join("owner.json")).unwrap(),b"ownership marker");
        assert_eq!(fs::read(projection.join("content/keep.html")).unwrap(),b"projection");
        assert_eq!(fs::read(external.join("keep.txt")).unwrap(),b"user material");
        fs::remove_file(projection.join("content/link")).unwrap();
        remove_owned_projection(&projection).unwrap();
        assert_eq!(fs::read(external.join("keep.txt")).unwrap(),b"user material");
    }

    #[cfg(unix)]
    #[test]
    fn projection_cleanup_does_not_follow_a_symlinked_owner_directory() {
        let dir = tempfile::tempdir().unwrap();
        let external = dir.path().join("external");
        let session = external.join("session");
        fs::create_dir_all(&session).unwrap();
        fs::write(session.join("owner.json"),b"keep").unwrap();
        let registry = dir.path().join("registry");
        fs::create_dir(&registry).unwrap();
        std::os::unix::fs::symlink(&external,registry.join("owner")).unwrap();
        assert!(remove_owned_projection(&registry.join("owner/session")).is_err());
        assert_eq!(fs::read(session.join("owner.json")).unwrap(),b"keep");
    }
    #[test]
    fn metadata_hidden_only_in_projection_not_code_or_archived_source(){
        let source="# Title\n\n<!-- nutbook-cover -->\n![cover](image.svg)\n\n`<!-- nutbook-cover -->`\n\n```html\n<!-- nutbook-cover -->\n```\n";
        let projected=without_cover_markers(source);
        assert_eq!(projected.matches("<!-- nutbook-cover -->").count(),2);
        assert!(projected.contains("![cover](image.svg)"));
        assert_eq!(source.matches("<!-- nutbook-cover -->").count(),3);
    }
    #[test]
    fn html_preview_serves_only_archived_projection_and_revokes_it() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.html");
        let body = b"<h1>A</h1><link rel=stylesheet href=style.css><img src=image.svg><script>window.BAD=true</script>";
        fs::write(&path, body).unwrap();
        fs::write(dir.path().join("style.css"), b"@font-face{font-family:HistorySymbols;src:url(symbols.ttf)}body{margin:0;padding:0!important}h1{color:blue}").unwrap();
        let font = Path::new(env!("CARGO_MANIFEST_DIR")).parent().unwrap().join("tests/fixtures/document-save-versions/shared/symbols.ttf");
        fs::write(dir.path().join("symbols.ttf"),fs::read(font).unwrap()).unwrap();
        fs::write(dir.path().join("image.svg"), b"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\"><rect width=\"10\" height=\"10\"/></svg>").unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        let saved = store.save_html(&path, dir.path(), &digest(body), b"<h1>B</h1>", None).unwrap();
        let registry = std::env::temp_dir().join(format!("nutbook-html-history-preview-{}", Uuid::new_v4()));
        fs::create_dir(&registry).unwrap();
        crate::core::scoped_content_server::init_used_port_registry(registry.join("ports.json")).unwrap();
        let head = store.document(&saved.document_id).unwrap();
        fs::write(dir.path().join("style.css"), b"LIVE_CANARY").unwrap();
        fs::remove_file(dir.path().join("symbols.ttf")).unwrap();
        let preview = store.begin_markdown_preview(&head.id, &head.versions[0].id, 1).unwrap();
        let page = ureq::get(&preview.url).call().unwrap().into_string().unwrap();
        assert!(page.contains("<h1>A</h1>"));
        assert!(page.contains("color:blue"));
        assert!(!page.contains("LIVE_CANARY"));
        assert!(!page.contains("window.BAD"));
        assert!(preview.source.contains("window.BAD"));
        if let Ok(script) = std::env::var("NUTBOOK_HTML_HISTORY_BROWSER_SCRIPT") {
            let inline_path = std::env::temp_dir().join(format!("nutbook-html-inline-{}.html", Uuid::new_v4()));
            fs::write(&inline_path, &preview.html).unwrap();
            let status = std::process::Command::new("node").arg(script).arg(&preview.url).arg(&inline_path).status().unwrap();
            let _ = fs::remove_file(inline_path);
            assert!(status.success());
        }

        store.close_preview(&preview.session_id).unwrap();
        assert!(ureq::get(&preview.url).call().is_err());
    }
    #[test]
    fn static_preview_is_scoped_inert_and_revoked_before_history_gc() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        fs::write(dir.path().join("image.svg"),b"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\"><rect width=\"10\" height=\"10\"/></svg>").unwrap();
        let a=b"# A\n\n<!-- nutbook-cover -->\n\n![image](image.svg)\n\n[network](https://example.invalid/)\n\n<img src=\"https://example.invalid/remote.png\" onerror=\"alert(1)\">";
        fs::write(&path, a).unwrap();
        let store = HistoryStore::open(&dir.path().join("app")).unwrap();
        let saved = store
            .save_markdown(&path, dir.path(), &digest(a), b"# B", None)
            .unwrap();
        // A persistent test-only registry directory avoids affecting user data
        // or deleting registry state while parallel tests still use a server.
        let registry =
            std::env::temp_dir().join(format!("nutbook-history-preview-{}", Uuid::new_v4()));
        fs::create_dir(&registry).unwrap();
        crate::core::scoped_content_server::init_used_port_registry(registry.join("ports.json"))
            .unwrap();
        let head = store.document(&saved.document_id).unwrap();
        let version = &head.versions[0];
        let preview = store
            .begin_markdown_preview(&head.id, &version.id, 7)
            .unwrap();
        assert_eq!(preview.generation, 7);
        assert!(preview.incomplete);
        assert!(preview.source.contains("<!-- nutbook-cover -->"));
        assert!(!preview.html.contains("nutbook-cover"));
        let body = ureq::get(&preview.url)
            .call()
            .unwrap()
            .into_string()
            .unwrap();
        assert!(body.contains("script-src 'none'"));
        use html5ever::tendril::TendrilSink;
        let dom =
            html5ever::parse_document(markup5ever_rcdom::RcDom::default(), Default::default())
                .one(body.clone());
        fn check(node: &markup5ever_rcdom::Handle, session: &str) {
            if let markup5ever_rcdom::NodeData::Element { name, attrs, .. } = &node.data {
                assert_ne!(name.local.as_ref(), "script");
                for attr in attrs.borrow().iter() {
                    assert!(!attr.name.local.as_ref().starts_with("on"));
                    assert_ne!(attr.name.local.as_ref(), "href");
                    if attr.name.local.as_ref() == "src" {
                        assert!(attr.value.starts_with(session));
                    }
                }
            }
            for child in node.children.borrow().iter() {
                check(child, session);
            }
        }
        check(&dom.document, &preview.session_id);
        assert!(body.contains(&format!("src=\"{}-", preview.session_id)));
        if std::env::var_os("NUTBOOK_HISTORY_BROWSER_CHECK").is_some() {
            let script = Path::new(env!("CARGO_MANIFEST_DIR"))
                .parent()
                .unwrap()
                .join("scripts/test-document-versions-preview-browser.mjs");
            let inline_path=std::env::temp_dir().join(format!("nutbook-inline-{}.html",Uuid::new_v4()));
            fs::write(&inline_path,&preview.html).unwrap();
            let status = std::process::Command::new("node")
                .arg(script)
                .arg(&preview.url)
                .arg(&inline_path)
                .status()
                .unwrap();
            let _=fs::remove_file(inline_path);
            assert!(status.success());
        }
        let origin = url::Url::parse(&preview.url)
            .unwrap()
            .origin()
            .ascii_serialization();
        for path in [
            "/owner.json",
            "/../../settings.json",
            "/00000000-other-version.svg",
        ] {
            assert!(ureq::get(&format!("{origin}{path}")).call().is_err());
        }
        store.delete_versions(&head.id, None).unwrap();
        assert!(ureq::get(&preview.url).call().is_err());
        assert!(store.preview_records().unwrap().is_empty());
        store.collect_unreferenced_objects().unwrap();
        assert_eq!(fs::read(&path).unwrap(), b"# B");
    }
}
