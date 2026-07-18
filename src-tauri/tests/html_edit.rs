use nutbook_backend::core::html_edit::{
    copy_html_edit_asset_reader_to_temp, create_html_edit_asset_temp_in_directory,
    get_html_edit_patch_for_file, import_html_edit_asset,
    publish_html_edit_asset_temp_no_clobber,
    library_relative_path, load_html_edit_manifest,
    normalize_html_edit_change, normalize_rich_text_change, patch_path, save_html_edit_manifest,
    save_html_edit_patch_for_file, save_html_edit_patch_replacing_changes_for_file, save_patch_file, HtmlEditManifest, HtmlEditManifestEntry,
    HtmlEditPatchLookup, HtmlEditPatchSave, populate_runtime_asset_urls,
    resolve_html_edit_asset_path,
};
use nutbook_backend::errors::AppError;
use nutbook_backend::models::html_edit::{HtmlEditPictureSource, HtmlEditRole, HtmlEditTextAlign};
use nutbook_backend::models::{
    HtmlEditChange, HtmlEditChangeType, HtmlEditFieldApplyReason, HtmlEditFieldApplyStatus,
    HtmlEditAssetImport, HtmlEditPatch, HtmlEditPatchApplyStatus,
};
use nutbook_backend::state::HtmlEditSessionLeases;
use sha2::{Digest, Sha256};

fn fixture_path(name: &str) -> std::path::PathBuf {
    std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/html-edit")
        .join(name)
}

fn copy_directory(source: &std::path::Path, destination: &std::path::Path) {
    std::fs::create_dir_all(destination).expect("create copied directory");
    for entry in std::fs::read_dir(source).expect("read copied directory") {
        let entry = entry.expect("directory entry");
        let target = destination.join(entry.file_name());
        if entry.file_type().expect("entry type").is_dir() {
            copy_directory(&entry.path(), &target);
        } else {
            std::fs::copy(entry.path(), target).expect("copy file");
        }
    }
}

const MINIMAL_PNG: &[u8] = &[
    0x89, b'P', b'N', b'G', 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
];

fn asset_import(
    library_root: &std::path::Path,
    source_path: std::path::PathBuf,
) -> HtmlEditAssetImport {
    HtmlEditAssetImport {
        library_root: library_root.to_path_buf(),
        artifact_edit_id: "html-edit-acceptance".to_string(),
        source_path,
    }
}

#[test]
fn html_edit_resolves_asset_path_only_inside_current_artifact() {
    let root = tempfile::tempdir().expect("library root");
    let artifact = "html-edit-acceptance";
    let assets = root.path().join(format!(".nutbook/html-edit/assets/{artifact}"));
    std::fs::create_dir_all(&assets).expect("asset directory");
    std::fs::write(assets.join("asset.png"), MINIMAL_PNG).expect("asset");

    let resolved = resolve_html_edit_asset_path(
        root.path(), artifact, ".nutbook/html-edit/assets/html-edit-acceptance/asset.png",
    ).expect("resolves current artifact asset");
    assert_eq!(resolved, assets.join("asset.png").canonicalize().expect("canonical asset"));
    for invalid in [
        ".nutbook/html-edit/assets/other/asset.png",
        ".nutbook/html-edit/assets/html-edit-acceptance/../asset.png",
        "../asset.png",
        "/tmp/asset.png",
    ] {
        assert!(resolve_html_edit_asset_path(root.path(), artifact, invalid).is_err(), "{invalid}");
    }
}

#[test]
fn html_edit_populates_runtime_asset_urls_without_persisting_them() {
    let root = tempfile::tempdir().expect("library root");
    let html_path = root.path().join("editable-image.html");
    std::fs::copy(fixture_path("editable-image.html"), &html_path).expect("copy fixture");
    let artifact = "html-edit-acceptance";
    let assets = root.path().join(format!(".nutbook/html-edit/assets/{artifact}"));
    std::fs::create_dir_all(&assets).expect("asset directory");
    std::fs::write(assets.join("asset.png"), MINIMAL_PNG).expect("asset");
    let mut response = get_html_edit_patch_for_file(&HtmlEditPatchLookup {
        library_id: 1, library_root: root.path().to_path_buf(), item_id: 1,
        file_path: html_path, title_hint: "image".to_string(),
    }).expect("patch response");
    response.artifact_edit_id = artifact.to_string();
    response.patch = Some(HtmlEditPatch {
        version: 1, editable_protocol_version: 1, library_id: "1".to_string(),
        artifact_edit_id: artifact.to_string(), last_known_item_id: 1, patch_revision: 1,
        source_relative_path: response.source_relative_path.clone(),
        source_file_hash: response.source_file_hash.clone(),
        source_modified_at: response.source_modified_at, source_size: response.source_size,
        editable_id_set_hash: "ids".to_string(), editable_structure_hash: "structure".to_string(),
        updated_at: 1,
        changes: std::collections::BTreeMap::from([(
            "brief-hero".to_string(),
            image_change(".nutbook/html-edit/assets/html-edit-acceptance/asset.png"),
        )]),
    });
    populate_runtime_asset_urls(&mut response, root.path(), |_| "http://127.0.0.1:4567/file/token".to_string());
    assert_eq!(response.runtime_asset_urls.len(), 1);
    assert!(response.runtime_asset_urls.values().all(|url| {
        url.starts_with("http://127.0.0.1:") && !url.starts_with("file:")
    }));
    let patch_json = serde_json::to_string(response.patch.as_ref().expect("patch")).expect("patch JSON");
    assert!(!patch_json.contains("runtimeAssetUrls"));
    assert!(!patch_json.contains("127.0.0.1"));
}

#[test]
fn html_edit_active_session_lease_rejects_old_generation_import() {
    let mut leases = HtmlEditSessionLeases::default();
    leases.register(7, "session-old".to_string(), 1);
    leases.register(7, "session-new".to_string(), 2);
    assert!(!leases.matches(7, "session-old", 1));
    assert!(!leases.matches(8, "session-new", 2));
    assert!(leases.matches(7, "session-new", 2));
    assert!(!leases.invalidate(7, "session-old", 1), "old exit cannot invalidate new lease");
    assert!(leases.invalidate(7, "session-new", 2));
    assert!(!leases.matches(7, "session-new", 2));
}

#[test]
fn html_edit_imports_supported_asset_with_content_hash_name() {
    let root = tempfile::tempdir().expect("library root");
    let source = root.path().join("chosen-by-user.png");
    std::fs::write(&source, MINIMAL_PNG).expect("write png");

    let result = import_html_edit_asset(&asset_import(root.path(), source.clone()))
        .expect("imports supported asset");

    assert_eq!(result.media_type, "image/png");
    assert_eq!(result.byte_size, MINIMAL_PNG.len() as u64);
    assert_eq!(result.content_hash, hex_hash(MINIMAL_PNG));
    assert!(result.relative_path.starts_with(
        ".nutbook/html-edit/assets/html-edit-acceptance/"
    ));
    assert!(result.relative_path.ends_with(".png"));
    assert!(!result.relative_path.contains(source.to_string_lossy().as_ref()));
    assert_eq!(result.runtime_url, None);
    assert!(
        !serde_json::to_string(&result)
            .expect("serialize import response")
            .contains(root.path().to_string_lossy().as_ref()),
        "the core response must not leak a library-local absolute path"
    );
    assert!(root.path().join(&result.relative_path).is_file());
}

#[test]
fn html_edit_import_reuses_identical_content() {
    let root = tempfile::tempdir().expect("library root");
    let first_source = root.path().join("first.png");
    let second_source = root.path().join("second.gif");
    std::fs::write(&first_source, MINIMAL_PNG).expect("write first image");
    std::fs::write(&second_source, MINIMAL_PNG).expect("write same image");

    let first = import_html_edit_asset(&asset_import(root.path(), first_source))
        .expect("import first image");
    let second = import_html_edit_asset(&asset_import(root.path(), second_source))
        .expect("reuse identical image");

    assert_eq!(first.relative_path, second.relative_path);
    assert_eq!(first.content_hash, second.content_hash);
    let assets = root
        .path()
        .join(".nutbook/html-edit/assets/html-edit-acceptance");
    assert_eq!(std::fs::read_dir(assets).expect("asset directory").count(), 1);
}

#[test]
fn html_edit_import_rejects_spoofed_extension() {
    let root = tempfile::tempdir().expect("library root");
    let source = root.path().join("not-an-image.png");
    std::fs::write(&source, b"this is not a png").expect("write spoofed asset");

    let error = import_html_edit_asset(&asset_import(root.path(), source))
        .expect_err("rejects spoofed extension");

    assert!(matches!(error, AppError::AssetInvalidType));
    assert_eq!(error.code(), "ASSET_INVALID_TYPE");
}

#[test]
fn html_edit_import_rejects_asset_over_20_mb() {
    let root = tempfile::tempdir().expect("library root");
    let source = root.path().join("too-large.png");
    let file = std::fs::File::create(&source).expect("create sparse source");
    file.set_len(20 * 1024 * 1024 + 1).expect("make source too large");

    let error = import_html_edit_asset(&asset_import(root.path(), source))
        .expect_err("rejects oversized asset");

    assert!(matches!(error, AppError::AssetTooLarge));
    assert_eq!(error.code(), "ASSET_TOO_LARGE");
    assert!(
        !root
            .path()
            .join(".nutbook/html-edit/assets/html-edit-acceptance")
            .exists(),
        "metadata must reject oversize input before creating an asset directory"
    );
}

#[test]
fn html_edit_import_rejects_directory_and_escape_artifact_id_without_tmp_files() {
    let root = tempfile::tempdir().expect("library root");
    let directory_source = root.path().join("not-a-regular-file");
    std::fs::create_dir(&directory_source).expect("create directory source");

    let directory_error = import_html_edit_asset(&asset_import(root.path(), directory_source))
        .expect_err("rejects directory");
    assert!(matches!(directory_error, AppError::InvalidParams));

    let png = root.path().join("image.png");
    std::fs::write(&png, MINIMAL_PNG).expect("write png");
    let escape = HtmlEditAssetImport {
        library_root: root.path().to_path_buf(),
        artifact_edit_id: "html-edit-../escape".to_string(),
        source_path: png,
    };
    let escape_error = import_html_edit_asset(&escape).expect_err("rejects escape artifact id");
    assert!(matches!(escape_error, AppError::InvalidParams));
    assert!(!root.path().join(".nutbook/html-edit/assets/escape").exists());
}

#[cfg(unix)]
#[test]
fn html_edit_import_rejects_fifo_before_opening_it() {
    let root = tempfile::tempdir().expect("library root");
    let fifo = root.path().join("untrusted-image-pipe");
    let status = std::process::Command::new("mkfifo")
        .arg(&fifo)
        .status()
        .expect("run mkfifo");
    assert!(status.success(), "mkfifo must create the test FIFO");

    let error = import_html_edit_asset(&asset_import(root.path(), fifo))
        .expect_err("FIFO is not a regular image file");

    assert!(matches!(error, AppError::InvalidParams));
    assert!(
        !root
            .path()
            .join(".nutbook/html-edit/assets/html-edit-acceptance")
            .exists(),
        "FIFO must be rejected by metadata before output creation or blocking open"
    );
}

#[test]
fn html_edit_import_cleans_temporary_file_after_hash_name_collision() {
    let root = tempfile::tempdir().expect("library root");
    let source = root.path().join("image.png");
    std::fs::write(&source, MINIMAL_PNG).expect("write png");
    let assets = root
        .path()
        .join(".nutbook/html-edit/assets/html-edit-acceptance");
    std::fs::create_dir_all(&assets).expect("create asset directory");
    let colliding_destination = assets.join(format!("{}.png", hex_hash(MINIMAL_PNG)));
    std::fs::write(&colliding_destination, b"different existing content")
        .expect("write conflicting destination");

    let error = import_html_edit_asset(&asset_import(root.path(), source))
        .expect_err("refuses a hash-named destination containing different bytes");

    assert!(matches!(error, AppError::IoError));
    assert_eq!(
        std::fs::read_dir(&assets)
            .expect("asset directory")
            .filter_map(Result::ok)
            .filter(|entry| entry.file_name().to_string_lossy().starts_with(".tmp-"))
            .count(),
        0,
        "a failed import must not leave a partial temporary asset behind"
    );
}

#[cfg(unix)]
#[test]
fn html_edit_import_rejects_asset_directory_symlinked_outside_library() {
    use std::os::unix::fs::symlink;

    let root = tempfile::tempdir().expect("library root");
    let outside = tempfile::tempdir().expect("outside root");
    let source = root.path().join("image.png");
    std::fs::write(&source, MINIMAL_PNG).expect("write png");
    symlink(outside.path(), root.path().join(".nutbook")).expect("link .nutbook outside");

    let error = import_html_edit_asset(&asset_import(root.path(), source))
        .expect_err("rejects an assets path that escapes through a symlink");

    assert!(matches!(error, AppError::IoError));
    assert!(
        std::fs::read_dir(outside.path())
            .expect("outside root")
            .next()
            .is_none(),
        "containment rejection must not create output outside the library"
    );
}

#[cfg(unix)]
#[test]
fn html_edit_import_rejects_library_root_symlink_before_any_write() {
    use std::os::unix::fs::symlink;

    let real_root = tempfile::tempdir().expect("real library root");
    let link_parent = tempfile::tempdir().expect("link parent");
    let linked_root = link_parent.path().join("library-link");
    symlink(real_root.path(), &linked_root).expect("link library root");
    let source = link_parent.path().join("image.png");
    std::fs::write(&source, MINIMAL_PNG).expect("write image");

    let error = import_html_edit_asset(&asset_import(&linked_root, source))
        .expect_err("a library root symlink is not a trusted directory root");

    assert!(matches!(error, AppError::IoError));
    assert!(
        !real_root.path().join(".nutbook").exists(),
        "a rejected root symlink must not write outside the supplied root path"
    );
}

#[cfg(unix)]
#[test]
fn html_edit_import_rejects_final_component_source_symlink_before_creating_assets() {
    use std::os::unix::fs::symlink;

    let root = tempfile::tempdir().expect("library root");
    let outside = tempfile::tempdir().expect("outside source root");
    let target = outside.path().join("real-image.png");
    std::fs::write(&target, MINIMAL_PNG).expect("write real image");
    let linked_source = root.path().join("selected-image.png");
    symlink(&target, &linked_source).expect("link selected source");

    let error = import_html_edit_asset(&asset_import(root.path(), linked_source))
        .expect_err("the selected source final component must not be followed as a symlink");

    assert!(matches!(error, AppError::InvalidParams));
    assert!(
        !root
            .path()
            .join(".nutbook/html-edit/assets/html-edit-acceptance")
            .exists(),
        "source symlink rejection happens before asset directory creation"
    );
}

#[cfg(unix)]
#[test]
fn html_edit_import_rejects_same_hash_destination_symlinked_outside_library() {
    use std::os::unix::fs::symlink;

    let root = tempfile::tempdir().expect("library root");
    let outside = tempfile::tempdir().expect("outside root");
    let source = root.path().join("image.png");
    std::fs::write(&source, MINIMAL_PNG).expect("write png");
    let outside_asset = outside.path().join("same-hash.png");
    std::fs::write(&outside_asset, MINIMAL_PNG).expect("write outside png");
    let assets = root
        .path()
        .join(".nutbook/html-edit/assets/html-edit-acceptance");
    std::fs::create_dir_all(&assets).expect("create assets");
    let leaf = assets.join(format!("{}.png", hex_hash(MINIMAL_PNG)));
    symlink(&outside_asset, &leaf).expect("link matching leaf outside");

    let error = import_html_edit_asset(&asset_import(root.path(), source))
        .expect_err("same-content symlink must not be reused");

    assert!(matches!(error, AppError::IoError));
    assert!(std::fs::symlink_metadata(&leaf).expect("leaf remains").file_type().is_symlink());
    assert_eq!(
        std::fs::read_dir(&assets)
            .expect("asset directory")
            .filter_map(Result::ok)
            .filter(|entry| entry.file_name().to_string_lossy().starts_with(".tmp-"))
            .count(),
        0
    );
}

#[cfg(unix)]
#[test]
fn html_edit_import_temp_creation_does_not_follow_hostile_symlink() {
    use std::os::unix::fs::symlink;

    let root = tempfile::tempdir().expect("library root");
    let outside = tempfile::tempdir().expect("outside root");
    let target = outside.path().join("must-not-be-truncated");
    std::fs::write(&target, b"keep this content").expect("write target");
    let assets = root.path().join("assets");
    std::fs::create_dir(&assets).expect("create assets directory");
    symlink(&target, assets.join(".tmp-hostile")).expect("plant hostile temp symlink");
    let assets_fd = std::fs::File::open(&assets).expect("open directory fd");

    let error = create_html_edit_asset_temp_in_directory(&assets_fd, ".tmp-hostile")
        .expect_err("O_EXCL and O_NOFOLLOW reject a hostile temporary leaf");

    assert!(matches!(error, AppError::IoError));
    assert_eq!(std::fs::read(&target).expect("read target"), b"keep this content");
}

#[cfg(unix)]
#[test]
fn html_edit_import_atomic_publish_never_overwrites_late_destination() {
    let root = tempfile::tempdir().expect("asset root");
    let assets = root.path().join("assets");
    std::fs::create_dir(&assets).expect("create assets directory");
    let directory = std::fs::File::open(&assets).expect("open assets fd");
    let temporary = create_html_edit_asset_temp_in_directory(&directory, ".tmp-publish")
        .expect("create trusted temporary leaf");
    drop(temporary);
    std::fs::write(assets.join(".tmp-publish"), MINIMAL_PNG).expect("write temp image");
    std::fs::write(assets.join("late.png"), b"attacker content").expect("create late destination");

    let error = publish_html_edit_asset_temp_no_clobber(
        &directory,
        ".tmp-publish",
        "late.png",
        &hex_hash(MINIMAL_PNG),
    )
    .expect_err("late destination with different bytes must not be overwritten");

    assert!(matches!(error, AppError::IoError));
    assert_eq!(std::fs::read(assets.join("late.png")).expect("read destination"), b"attacker content");
    assert!(!assets.join(".tmp-publish").exists(), "failed publish cleans temp");
}

#[test]
fn html_edit_import_rejects_growth_past_limit_and_cleans_temp_file() {
    use std::io::Cursor;

    let root = tempfile::tempdir().expect("temporary output root");
    let temp_path = root.path().join(".tmp-growing");
    let mut remainder = vec![0_u8; 20 * 1024 * 1024];
    remainder[0] = 1;

    let error = copy_html_edit_asset_reader_to_temp(
        &mut Cursor::new(remainder),
        MINIMAL_PNG,
        &temp_path,
    )
    .expect_err("an input that grew after the metadata precheck is rejected while streaming");

    assert!(matches!(error, AppError::AssetTooLarge));
    assert!(!temp_path.exists(), "overflow must remove the temporary output");
}

fn hex_hash(bytes: &[u8]) -> String {
    let digest = Sha256::digest(bytes);
    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}

#[test]
fn html_edit_source_hashes_match_runtime_sha256_vectors() {
    assert_eq!(
        nutbook_backend::core::html_edit::content_hash_bytes(b""),
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    assert_eq!(
        nutbook_backend::core::html_edit::content_hash_bytes(b"abc"),
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
}

#[test]
fn html_edit_patch_model_serializes_text_change() {
    let mut changes = std::collections::BTreeMap::new();
    changes.insert(
        "cover-title".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"cover-title\"]".to_string(),
            original_text_hash: Some("hash-a".to_string()),
            original_src_hash: None,
            original_style_hash: None,
            text: Some("New title".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );

    let patch = HtmlEditPatch {
        version: 1,
        editable_protocol_version: 1,
        library_id: "1".to_string(),
        artifact_edit_id: "artifact-1".to_string(),
        last_known_item_id: 10,
        patch_revision: 1,
        source_relative_path: "slides/demo.html".to_string(),
        source_file_hash: "source-hash".to_string(),
        source_modified_at: 100,
        source_size: 1200,
        editable_id_set_hash: "ids-hash".to_string(),
        editable_structure_hash: "structure-hash".to_string(),
        updated_at: 200,
        changes,
    };

    let json = serde_json::to_string(&patch).expect("serializes patch");
    assert!(json.contains("\"artifactEditId\":\"artifact-1\""));
    assert!(json.contains("\"type\":\"text\""));
    assert_eq!(HtmlEditPatchApplyStatus::Clean.as_str(), "clean");
}

#[test]
fn html_edit_patch_model_serializes_rich_text_change() {
    let mut changes = std::collections::BTreeMap::new();
    changes.insert(
        "article-body".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::RichText,
            selector: "[data-id=\"article-body\"]".to_string(),
            original_text_hash: Some("source-text-hash".to_string()),
            original_src_hash: None,
            original_style_hash: None,
            text: None,
            src: None,
            alt: None,
            html: Some("<p><strong>Bold</strong> copy</p>".to_string()),
            text_align: Some(HtmlEditTextAlign::Center),
            edit_role: Some(HtmlEditRole::Content),
            picture_sources: None,
        },
    );

    let json = serde_json::to_string(&changes).expect("serializes rich text change");
    assert!(json.contains("\"type\":\"rich_text\""));
    assert!(json.contains("\"html\":\"<p><strong>Bold</strong> copy</p>\""));
    assert!(json.contains("\"textAlign\":\"center\""));
    assert!(json.contains("\"editRole\":\"content\""));
}

fn image_change(src: &str) -> HtmlEditChange {
    HtmlEditChange {
        change_type: HtmlEditChangeType::Image,
        selector: "[data-id=\"brief-hero\"]".to_string(),
        original_text_hash: None,
        original_src_hash: Some("source-src-hash".to_string()),
        original_style_hash: None,
        text: None,
        src: Some(src.to_string()),
        alt: Some("新的主图".to_string()),
        html: None,
        text_align: None,
        edit_role: None,
        picture_sources: Some(vec![HtmlEditPictureSource {
            index: 0,
            original_srcset_hash: "source-srcset-hash".to_string(),
        }]),
    }
}

#[test]
fn html_edit_image_patch_round_trips_picture_sources() {
    let change = image_change(".nutbook/html-edit/assets/html-edit-acceptance/asset.png");
    let json = serde_json::to_value(&change).expect("serialize image change");
    let sources = &json["pictureSources"];
    assert_eq!(sources[0]["index"], 0);
    assert_eq!(sources[0]["originalSrcsetHash"], "source-srcset-hash");
    let object = sources[0].as_object().expect("picture source object");
    assert_eq!(object.len(), 2);
    for forbidden in ["src", "url", "media", "type", "sizes"] {
        assert!(!object.contains_key(forbidden));
    }
}

#[test]
fn html_edit_image_patch_rejects_invalid_combinations_and_assets() {
    let root = tempfile::tempdir().expect("library root");
    let artifact = "html-edit-acceptance";
    let assets = root.path().join(format!(".nutbook/html-edit/assets/{artifact}"));
    std::fs::create_dir_all(&assets).expect("assets directory");
    std::fs::write(assets.join("asset.png"), MINIMAL_PNG).expect("asset");

    let valid = image_change(".nutbook/html-edit/assets/html-edit-acceptance/asset.png");
    assert!(normalize_html_edit_change(root.path(), artifact, "brief-hero", &valid).is_ok());
    std::fs::write(assets.join("spoofed.png"), b"not actually an image")
        .expect("write spoofed stored asset");
    let spoofed = image_change(".nutbook/html-edit/assets/html-edit-acceptance/spoofed.png");
    assert!(normalize_html_edit_change(root.path(), artifact, "brief-hero", &spoofed).is_err());

    let mut duplicate = valid.clone();
    duplicate.picture_sources = Some(vec![
        HtmlEditPictureSource { index: 0, original_srcset_hash: "first".to_string() },
        HtmlEditPictureSource { index: 0, original_srcset_hash: "second".to_string() },
    ]);
    assert!(normalize_html_edit_change(root.path(), artifact, "brief-hero", &duplicate).is_err());

    let mut empty_sources = valid.clone();
    empty_sources.picture_sources = Some(vec![]);
    assert!(normalize_html_edit_change(root.path(), artifact, "brief-hero", &empty_sources).is_err());

    for src in [
        "/tmp/asset.png",
        "../asset.png",
        ".nutbook/html-edit/assets/other-artifact/asset.png",
        "https://example.test/asset.png",
        "data:image/png;base64,AAAA",
        ".nutbook/html-edit/assets/html-edit-acceptance/missing.png",
    ] {
        let invalid = image_change(src);
        assert!(normalize_html_edit_change(root.path(), artifact, "brief-hero", &invalid).is_err(), "{src}");
    }

    let mut image_html = valid.clone();
    image_html.html = Some("<p>not image content</p>".to_string());
    assert!(normalize_html_edit_change(root.path(), artifact, "brief-hero", &image_html).is_err());
    let mut image_alignment = valid.clone();
    image_alignment.text_align = Some(HtmlEditTextAlign::Center);
    assert!(normalize_html_edit_change(root.path(), artifact, "brief-hero", &image_alignment).is_err());

    let mut background = valid.clone();
    background.change_type = HtmlEditChangeType::BackgroundImage;
    background.selector = "[data-id=\"brief-delivery-bg\"]".to_string();
    background.original_src_hash = None;
    background.original_style_hash = Some("original-style-hash".to_string());
    background.alt = None;
    background.picture_sources = None;
    assert!(normalize_html_edit_change(root.path(), artifact, "brief-delivery-bg", &background).is_ok());
    let mut background_picture = background.clone();
    background_picture.picture_sources = Some(vec![HtmlEditPictureSource {
        index: 0,
        original_srcset_hash: "source-srcset-hash".to_string(),
    }]);
    assert!(normalize_html_edit_change(root.path(), artifact, "brief-delivery-bg", &background_picture).is_err());
}

#[cfg(unix)]
#[test]
fn html_edit_image_patch_rejects_artifact_asset_directory_symlinked_outside_library() {
    use std::os::unix::fs::symlink;

    let root = tempfile::tempdir().expect("library root");
    let outside = tempfile::tempdir().expect("outside root");
    let artifact = "html-edit-acceptance";
    let asset_root = root.path().join(".nutbook/html-edit/assets");
    std::fs::create_dir_all(&asset_root).expect("asset parent");
    std::fs::write(outside.path().join("asset.png"), MINIMAL_PNG).expect("outside asset");
    symlink(outside.path(), asset_root.join(artifact)).expect("artifact link outside");

    let change = image_change(".nutbook/html-edit/assets/html-edit-acceptance/asset.png");
    assert!(normalize_html_edit_change(root.path(), artifact, "brief-hero", &change).is_err());

    let html_path = root.path().join("editable-image.html");
    std::fs::copy(fixture_path("editable-image.html"), &html_path).expect("copy fixture");
    let current = get_html_edit_patch_for_file(&HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 1,
        file_path: html_path.clone(),
        title_hint: "image".to_string(),
    })
    .expect("current patch");
    let mut changes = std::collections::BTreeMap::new();
    changes.insert("brief-hero".to_string(), change);
    let error = save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 1,
        file_path: html_path,
        title_hint: "image".to_string(),
        artifact_edit_id: artifact.to_string(),
        expected_file_hash: current.source_file_hash,
        expected_modified_at: current.source_modified_at,
        expected_patch_revision: 0,
        changes,
    })
    .expect_err("an outside artifact asset directory cannot be persisted");
    assert!(matches!(error, AppError::InvalidParams));
    assert!(!patch_path(root.path(), artifact).expect("patch path").exists());
}

#[test]
fn html_edit_reopen_preserves_image_changes_after_library_move() {
    let original = tempfile::tempdir().expect("original library");
    let html_path = original.path().join("editable-image.html");
    std::fs::copy(fixture_path("editable-image.html"), &html_path).expect("copy fixture");
    let artifact = "html-edit-acceptance";
    let assets = original.path().join(format!(".nutbook/html-edit/assets/{artifact}"));
    std::fs::create_dir_all(&assets).expect("assets directory");
    std::fs::write(assets.join("asset.png"), MINIMAL_PNG).expect("asset");
    let current = get_html_edit_patch_for_file(&HtmlEditPatchLookup {
        library_id: 1,
        library_root: original.path().to_path_buf(),
        item_id: 1,
        file_path: html_path.clone(),
        title_hint: "image".to_string(),
    }).expect("current patch");
    let mut changes = std::collections::BTreeMap::new();
    changes.insert("brief-hero".to_string(), image_change(".nutbook/html-edit/assets/html-edit-acceptance/asset.png"));
    save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1, library_root: original.path().to_path_buf(), item_id: 1,
        file_path: html_path, title_hint: "image".to_string(), artifact_edit_id: artifact.to_string(),
        expected_file_hash: current.source_file_hash, expected_modified_at: current.source_modified_at,
        expected_patch_revision: 0, changes,
    }).expect("save image patch");

    let moved_parent = tempfile::tempdir().expect("move parent");
    let moved = moved_parent.path().join("moved-library");
    copy_directory(original.path(), &moved);
    let moved_html = moved.join("editable-image.html");
    let reopened = get_html_edit_patch_for_file(&HtmlEditPatchLookup {
        library_id: 2, library_root: moved.clone(), item_id: 2, file_path: moved_html,
        title_hint: "image".to_string(),
    }).expect("reopen moved patch");
    let patch = reopened.patch.expect("moved patch");
    let change = &patch.changes["brief-hero"];
    assert_eq!(change.src.as_deref(), Some(".nutbook/html-edit/assets/html-edit-acceptance/asset.png"));
    assert_eq!(change.picture_sources.as_ref().expect("picture sources")[0].index, 0);
    assert!(moved.join(change.src.as_deref().expect("relative source")).is_file());
}

#[test]
fn html_edit_mixed_image_patch_keeps_source_and_survives_library_move() {
    let original = tempfile::tempdir().expect("original library");
    let html_path = original.path().join("editable-image.html");
    std::fs::copy(fixture_path("editable-image.html"), &html_path).expect("copy fixture");
    copy_directory(&fixture_path("editable-image-assets"), &original.path().join("editable-image-assets"));
    let source_before = std::fs::read(&html_path).expect("source bytes");
    let artifact = "html-edit-lifecycle";
    let assets = original.path().join(format!(".nutbook/html-edit/assets/{artifact}"));
    std::fs::create_dir_all(&assets).expect("assets directory");
    for name in ["hero.png", "evidence.png", "background.png"] {
        std::fs::write(assets.join(name), MINIMAL_PNG).expect("asset");
    }
    let current = get_html_edit_patch_for_file(&HtmlEditPatchLookup {
        library_id: 1, library_root: original.path().to_path_buf(), item_id: 1,
        file_path: html_path.clone(), title_hint: "image".to_string(),
    }).expect("current patch");
    let relative = |name: &str| format!(".nutbook/html-edit/assets/{artifact}/{name}");
    let image = |id: &str, name: &str, sources: Option<Vec<HtmlEditPictureSource>>| HtmlEditChange {
        change_type: HtmlEditChangeType::Image, selector: format!("[data-id=\"{id}\"]"),
        original_text_hash: None, original_src_hash: Some("a".repeat(64)), original_style_hash: None,
        text: None, src: Some(relative(name)), alt: Some("imported".to_string()), html: None,
        text_align: None, edit_role: None, picture_sources: sources,
    };
    let mut changes = std::collections::BTreeMap::new();
    changes.insert("brief-body".to_string(), HtmlEditChange {
        change_type: HtmlEditChangeType::RichText, selector: "[data-id=\"brief-body\"]".to_string(),
        original_text_hash: Some("b".repeat(64)), original_src_hash: None, original_style_hash: None,
        text: None, src: None, alt: None, html: Some("<p>Updated body</p>".to_string()),
        text_align: None, edit_role: Some(HtmlEditRole::Content), picture_sources: None,
    });
    changes.insert("brief-hero".to_string(), image("brief-hero", "hero.png", None));
    changes.insert("brief-evidence".to_string(), image("brief-evidence", "evidence.png", Some(vec![HtmlEditPictureSource { index: 0, original_srcset_hash: "c".repeat(64) }])));
    changes.insert("brief-delivery-bg".to_string(), HtmlEditChange {
        change_type: HtmlEditChangeType::BackgroundImage, selector: "[data-id=\"brief-delivery-bg\"]".to_string(),
        original_text_hash: None, original_src_hash: None, original_style_hash: Some("d".repeat(64)),
        text: None, src: Some(relative("background.png")), alt: None, html: None,
        text_align: None, edit_role: None, picture_sources: None,
    });
    save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1, library_root: original.path().to_path_buf(), item_id: 1, file_path: html_path.clone(),
        title_hint: "image".to_string(), artifact_edit_id: artifact.to_string(), expected_file_hash: current.source_file_hash,
        expected_modified_at: current.source_modified_at, expected_patch_revision: 0, changes,
    }).expect("save mixed patch");
    assert_eq!(std::fs::read(&html_path).expect("source after"), source_before, "sidecar editing must not write source HTML");

    let moved_parent = tempfile::tempdir().expect("move parent");
    let moved = moved_parent.path().join("moved-library");
    copy_directory(original.path(), &moved);
    let reopened = get_html_edit_patch_for_file(&HtmlEditPatchLookup {
        library_id: 2, library_root: moved.clone(), item_id: 2, file_path: moved.join("editable-image.html"),
        title_hint: "image".to_string(),
    }).expect("reopen moved patch");
    let patch = reopened.patch.expect("moved patch");
    assert_eq!(patch.changes.len(), 4);
    assert_eq!(patch.changes["brief-evidence"].picture_sources.as_ref().expect("picture sources")[0].index, 0);
    for change in patch.changes.values().filter(|change| change.src.is_some()) {
        assert!(moved.join(change.src.as_ref().expect("relative src")).is_file());
        assert!(!change.src.as_ref().expect("relative src").starts_with('/'));
    }
    assert_eq!(std::fs::read(moved.join("editable-image.html")).expect("moved source"), source_before);
}

#[test]
fn html_edit_load_keeps_valid_legacy_text_and_rich_text_changes() {
    let root = tempfile::tempdir().expect("library root");
    let html_path = root.path().join("editable-basic.html");
    std::fs::copy(fixture_path("editable-basic.html"), &html_path).expect("copy fixture");
    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 1,
        file_path: html_path,
        title_hint: "basic".to_string(),
    };
    let current = get_html_edit_patch_for_file(&lookup).expect("initial patch response");
    let mut changes = std::collections::BTreeMap::new();
    changes.insert(
        "cover-title".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"cover-title\"]".to_string(),
            original_text_hash: Some("legacy-title-hash".to_string()),
            original_src_hash: None,
            original_style_hash: None,
            text: Some("Legacy title".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );
    changes.insert(
        "article-body".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::RichText,
            selector: "[data-id=\"article-body\"]".to_string(),
            original_text_hash: Some("legacy-body-hash".to_string()),
            original_src_hash: None,
            original_style_hash: None,
            text: None,
            src: None,
            alt: None,
            html: Some("<p><strong>Legacy</strong> body</p>".to_string()),
            text_align: Some(HtmlEditTextAlign::Left),
            edit_role: Some(HtmlEditRole::Content),
            picture_sources: None,
        },
    );
    save_patch_file(
        root.path(),
        &HtmlEditPatch {
            version: 1,
            editable_protocol_version: 1,
            library_id: "1".to_string(),
            artifact_edit_id: current.artifact_edit_id.clone(),
            last_known_item_id: 1,
            patch_revision: 1,
            source_relative_path: current.source_relative_path.clone(),
            source_file_hash: current.source_file_hash.clone(),
            source_modified_at: current.source_modified_at,
            source_size: current.source_size,
            editable_id_set_hash: String::new(),
            editable_structure_hash: String::new(),
            updated_at: 1,
            changes,
        },
    )
    .expect("persist legacy-format patch");
    let mut manifest = HtmlEditManifest::default();
    manifest.entries.insert(
        current.source_relative_path.clone(),
        HtmlEditManifestEntry {
            artifact_edit_id: current.artifact_edit_id.clone(),
            last_known_item_id: 1,
            last_known_source_hash: current.source_file_hash.clone(),
            editable_id_set_hash: String::new(),
            title_hint: "Legacy patch".to_string(),
        },
    );
    save_html_edit_manifest(root.path(), &manifest).expect("persist legacy manifest entry");

    let reopened = get_html_edit_patch_for_file(&lookup).expect("load legacy patch");
    let patch = reopened.patch.expect("legacy patch remains loadable");
    assert_eq!(patch.changes.len(), 2);
    assert_eq!(patch.changes["cover-title"].text.as_deref(), Some("Legacy title"));
    assert_eq!(
        patch.changes["article-body"].html.as_deref(),
        Some("<p><strong>Legacy</strong> body</p>")
    );
}

#[test]
fn html_edit_rejects_rich_text_with_disallowed_markup() {
    for html in [
        "<img src=\"https://example.com/image.png\">",
        "<p onclick=\"alert(1)\">unsafe</p>",
        "<a href=\"javascript:alert(1)\">unsafe</a>",
        "<p style=\"color:red\">unsafe</p>",
    ] {
        let change = HtmlEditChange {
            change_type: HtmlEditChangeType::RichText,
            selector: "[data-id=\"article-body\"]".to_string(),
            original_text_hash: Some("source-text-hash".to_string()),
            original_src_hash: None,
            original_style_hash: None,
            text: None,
            src: None,
            alt: None,
            html: Some(html.to_string()),
            text_align: Some(HtmlEditTextAlign::Center),
            edit_role: None,
            picture_sources: None,
        };

        assert!(normalize_rich_text_change(&change).is_err(), "{html}");
    }
}

#[test]
fn html_edit_rich_text_roles_enforce_their_markup_profiles() {
    let rich_change = |role, html: &str| HtmlEditChange {
        change_type: HtmlEditChangeType::RichText,
        selector: "[data-id=\"article-body\"]".to_string(),
        original_text_hash: Some("source-text-hash".to_string()),
        original_src_hash: None,
        original_style_hash: None,
        text: None,
        src: None,
        alt: None,
        html: Some(html.to_string()),
        text_align: Some(HtmlEditTextAlign::Center),
        edit_role: Some(role),
        picture_sources: None,
    };

    assert!(normalize_rich_text_change(&rich_change(
        HtmlEditRole::Short,
        "<strong>Short</strong><br><em>copy</em>",
    ))
    .is_ok());
    for html in ["<p>Paragraph</p>", "<h1>Heading</h1>", "<ul><li>Item</li></ul>"] {
        assert!(normalize_rich_text_change(&rich_change(HtmlEditRole::Short, html)).is_err());
    }

    assert!(normalize_rich_text_change(&rich_change(
        HtmlEditRole::Content,
        "<h2>Heading</h2><p><strong>Body</strong></p><ul><li>Item</li></ul>",
    ))
    .is_ok());
    assert!(normalize_rich_text_change(&rich_change(
        HtmlEditRole::Content,
        "<p style=\"text-align:center\">Aligned paragraph</p>",
    ))
    .is_ok());
    assert!(normalize_rich_text_change(&rich_change(
        HtmlEditRole::Content,
        "<p style=\"color:red\">Unsafe style</p>",
    ))
    .is_err());
    assert!(normalize_rich_text_change(&rich_change(
        HtmlEditRole::Short,
        "<strong style=\"text-align:center\">Unsafe short style</strong>",
    ))
    .is_err());

    let mut legacy_rich = rich_change(HtmlEditRole::Content, "<p>Legacy body</p>");
    legacy_rich.edit_role = None;
    assert!(normalize_rich_text_change(&legacy_rich).is_ok());
    assert!(serde_json::from_str::<HtmlEditChange>(
        r#"{"type":"rich_text","selector":"[data-id=\"article-body\"]","html":"<p>Body</p>","editRole":"unsupported"}"#,
    )
    .is_err());

    let plain = HtmlEditChange {
        change_type: HtmlEditChangeType::Text,
        selector: "[data-id=\"caption\"]".to_string(),
        original_text_hash: Some("source-text-hash".to_string()),
        original_src_hash: None,
        original_style_hash: None,
        text: Some("Plain copy".to_string()),
        src: None,
        alt: None,
        html: None,
        text_align: None,
        edit_role: Some(HtmlEditRole::Plain),
        picture_sources: None,
    };
    assert!(normalize_rich_text_change(&plain).is_ok());

    let mut plain_with_html = plain.clone();
    plain_with_html.html = Some("<strong>not plain</strong>".to_string());
    assert!(normalize_rich_text_change(&plain_with_html).is_err());
}

#[test]
fn html_edit_save_persists_canonical_rich_text_and_returns_normalized_changes() {
    let root = tempfile::tempdir().expect("temp dir");
    let html_path = root.path().join("editable-basic.html");
    std::fs::copy(fixture_path("editable-basic.html"), &html_path).expect("copy fixture");
    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
    };
    let current = get_html_edit_patch_for_file(&lookup).expect("get patch");
    let mut changes = std::collections::BTreeMap::new();
    changes.insert(
        "article-body".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::RichText,
            selector: "[data-id=\"article-body\"]".to_string(),
            original_text_hash: Some("source-text-hash".to_string()),
            original_src_hash: None,
            original_style_hash: None,
            text: None,
            src: None,
            alt: None,
            html: Some("<p><strong>Bold</strong> copy</p>".to_string()),
            text_align: Some(HtmlEditTextAlign::Center),
            edit_role: None,
            picture_sources: None,
        },
    );

    let saved = save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
        artifact_edit_id: current.artifact_edit_id.clone(),
        expected_file_hash: current.source_file_hash,
        expected_modified_at: current.source_modified_at,
        expected_patch_revision: 0,
        changes,
    })
    .expect("save canonical rich text");

    assert_eq!(
        saved.normalized_changes["article-body"].html.as_deref(),
        Some("<p><strong>Bold</strong> copy</p>")
    );
    let reopened = get_html_edit_patch_for_file(&lookup).expect("reopen patch");
    assert_eq!(
        reopened.patch.expect("patch").changes["article-body"]
            .html
            .as_deref(),
        Some("<p><strong>Bold</strong> copy</p>")
    );
}

#[test]
fn html_edit_reopen_preserves_rich_text_and_text_alignment() {
    let root = tempfile::tempdir().expect("temp dir");
    let html_path = root.path().join("editable-rich-text.html");
    std::fs::copy(fixture_path("editable-rich-text.html"), &html_path).expect("copy fixture");
    let source_hash_before = Sha256::digest(std::fs::read(&html_path).expect("read source"));
    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Rich Text Acceptance".to_string(),
    };
    let current = get_html_edit_patch_for_file(&lookup).expect("get patch");
    let saved_html = "<h2>已保存的富文本</h2><p><strong>重点</strong>与<em>上下文</em></p>";
    let mut changes = std::collections::BTreeMap::new();
    changes.insert(
        "article-body".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::RichText,
            selector: "[data-id=\"article-body\"]".to_string(),
            original_text_hash: Some("source-text-hash".to_string()),
            original_src_hash: None,
            original_style_hash: None,
            text: None,
            src: None,
            alt: None,
            html: Some(saved_html.to_string()),
            text_align: Some(HtmlEditTextAlign::Center),
            edit_role: None,
            picture_sources: None,
        },
    );

    save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Rich Text Acceptance".to_string(),
        artifact_edit_id: current.artifact_edit_id,
        expected_file_hash: current.source_file_hash,
        expected_modified_at: current.source_modified_at,
        expected_patch_revision: 0,
        changes,
    })
    .expect("save rich text patch");

    let reopened = get_html_edit_patch_for_file(&lookup).expect("reopen patch");
    let rich_text = &reopened.patch.expect("saved patch").changes["article-body"];
    assert_eq!(rich_text.html.as_deref(), Some(saved_html));
    assert_eq!(rich_text.text_align, Some(HtmlEditTextAlign::Center));
    assert_eq!(
        Sha256::digest(std::fs::read(&html_path).expect("read source after save")),
        source_hash_before,
        "saving the sidecar must not modify the original HTML bytes"
    );
}

#[test]
fn html_edit_incremental_save_preserves_text_and_rich_text_changes() {
    let root = tempfile::tempdir().expect("temp dir");
    let html_path = root.path().join("editable-rich-text.html");
    std::fs::copy(fixture_path("editable-rich-text.html"), &html_path).expect("copy fixture");
    let source_hash_before = Sha256::digest(std::fs::read(&html_path).expect("read source"));
    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Rich Text Acceptance".to_string(),
    };
    let initial = get_html_edit_patch_for_file(&lookup).expect("get patch");
    let saved_html = "<p><strong>保留的富文本</strong>内容</p>";
    let mut initial_changes = std::collections::BTreeMap::new();
    initial_changes.insert(
        "article-title".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"article-title\"]".to_string(),
            original_text_hash: Some("source-title-hash".to_string()),
            original_src_hash: None,
            original_style_hash: None,
            text: Some("保留的标题".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );
    initial_changes.insert(
        "article-body".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::RichText,
            selector: "[data-id=\"article-body\"]".to_string(),
            original_text_hash: Some("source-body-hash".to_string()),
            original_src_hash: None,
            original_style_hash: None,
            text: None,
            src: None,
            alt: None,
            html: Some(saved_html.to_string()),
            text_align: Some(HtmlEditTextAlign::Center),
            edit_role: None,
            picture_sources: None,
        },
    );

    save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Rich Text Acceptance".to_string(),
        artifact_edit_id: initial.artifact_edit_id,
        expected_file_hash: initial.source_file_hash,
        expected_modified_at: initial.source_modified_at,
        expected_patch_revision: 0,
        changes: initial_changes,
    })
    .expect("save initial mixed patch");

    let reopened = get_html_edit_patch_for_file(&lookup).expect("reopen patch");
    let mut title_update = std::collections::BTreeMap::new();
    title_update.insert(
        "article-title".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"article-title\"]".to_string(),
            original_text_hash: Some("source-title-hash".to_string()),
            original_src_hash: None,
            original_style_hash: None,
            text: Some("第二次保存的标题".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );
    save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Rich Text Acceptance".to_string(),
        artifact_edit_id: reopened.artifact_edit_id,
        expected_file_hash: reopened.source_file_hash,
        expected_modified_at: reopened.source_modified_at,
        expected_patch_revision: reopened.patch_revision,
        changes: title_update,
    })
    .expect("save incremental patch");

    let after_incremental_save = get_html_edit_patch_for_file(&lookup).expect("reopen patch");
    let patch = after_incremental_save.patch.expect("saved patch");
    assert_eq!(
        patch.changes["article-title"].text.as_deref(),
        Some("第二次保存的标题")
    );
    assert_eq!(patch.changes["article-body"].html.as_deref(), Some(saved_html));
    assert_eq!(
        patch.changes["article-body"].text_align,
        Some(HtmlEditTextAlign::Center)
    );
    assert_eq!(
        Sha256::digest(std::fs::read(&html_path).expect("read source after saves")),
        source_hash_before,
        "incremental sidecar saves must not modify the original HTML bytes"
    );
}

#[test]
fn html_edit_save_rejects_mixed_invalid_rich_text_without_writing_sidecar() {
    let root = tempfile::tempdir().expect("temp dir");
    let html_path = root.path().join("editable-basic.html");
    std::fs::copy(fixture_path("editable-basic.html"), &html_path).expect("copy fixture");
    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
    };
    let current = get_html_edit_patch_for_file(&lookup).expect("get patch");
    let mut changes = std::collections::BTreeMap::new();
    changes.insert(
        "cover-title".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"cover-title\"]".to_string(),
            original_text_hash: None,
            original_src_hash: None,
            original_style_hash: None,
            text: Some("Valid text".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );
    changes.insert(
        "article-body".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::RichText,
            selector: "[data-id=\"article-body\"]".to_string(),
            original_text_hash: Some("source-text-hash".to_string()),
            original_src_hash: None,
            original_style_hash: None,
            text: None,
            src: None,
            alt: None,
            html: Some("<p style=\"color:red\">unsafe</p>".to_string()),
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );

    assert!(save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path,
        title_hint: "Editable Basic".to_string(),
        artifact_edit_id: current.artifact_edit_id.clone(),
        expected_file_hash: current.source_file_hash,
        expected_modified_at: current.source_modified_at,
        expected_patch_revision: 0,
        changes,
    })
    .is_err());
    assert!(!patch_path(root.path(), &current.artifact_edit_id)
        .expect("patch path")
        .exists());
    assert!(load_html_edit_manifest(root.path())
        .expect("manifest")
        .entries
        .is_empty());
}

#[test]
fn html_edit_save_rejects_rich_text_requiring_cleaning() {
    let root = tempfile::tempdir().expect("temp dir");
    let html_path = root.path().join("editable-basic.html");
    std::fs::copy(fixture_path("editable-basic.html"), &html_path).expect("copy fixture");
    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
    };
    let current = get_html_edit_patch_for_file(&lookup).expect("get patch");
    let mut changes = std::collections::BTreeMap::new();
    changes.insert(
        "article-body".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::RichText,
            selector: "[data-id=\"article-body\"]".to_string(),
            original_text_hash: Some("source-text-hash".to_string()),
            original_src_hash: None,
            original_style_hash: None,
            text: None,
            src: None,
            alt: None,
            html: Some("<p><br/></p>".to_string()),
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );

    assert!(save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path,
        title_hint: "Editable Basic".to_string(),
        artifact_edit_id: current.artifact_edit_id,
        expected_file_hash: current.source_file_hash,
        expected_modified_at: current.source_modified_at,
        expected_patch_revision: 0,
        changes,
    })
    .is_err());
}

#[test]
fn html_edit_get_drops_stored_rich_text_requiring_recleaning() {
    let root = tempfile::tempdir().expect("temp dir");
    let html_path = root.path().join("editable-basic.html");
    std::fs::copy(fixture_path("editable-basic.html"), &html_path).expect("copy fixture");
    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path,
        title_hint: "Editable Basic".to_string(),
    };
    let current = get_html_edit_patch_for_file(&lookup).expect("get patch");
    let mut changes = std::collections::BTreeMap::new();
    changes.insert(
        "article-body".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::RichText,
            selector: "[data-id=\"article-body\"]".to_string(),
            original_text_hash: Some("source-text-hash".to_string()),
            original_src_hash: None,
            original_style_hash: None,
            text: None,
            src: None,
            alt: None,
            html: Some("<p><br/></p>".to_string()),
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );
    save_patch_file(
        root.path(),
        &HtmlEditPatch {
            version: 1,
            editable_protocol_version: 1,
            library_id: "1".to_string(),
            artifact_edit_id: current.artifact_edit_id.clone(),
            last_known_item_id: 10,
            patch_revision: 1,
            source_relative_path: current.source_relative_path.clone(),
            source_file_hash: current.source_file_hash.clone(),
            source_modified_at: current.source_modified_at,
            source_size: current.source_size,
            editable_id_set_hash: String::new(),
            editable_structure_hash: String::new(),
            updated_at: 1,
            changes,
        },
    )
    .expect("store uncanonical rich patch");
    let mut manifest = HtmlEditManifest::default();
    manifest.entries.insert(
        current.source_relative_path.clone(),
        HtmlEditManifestEntry {
            artifact_edit_id: current.artifact_edit_id,
            last_known_item_id: 10,
            last_known_source_hash: current.source_file_hash,
            editable_id_set_hash: String::new(),
            title_hint: "Editable Basic".to_string(),
        },
    );
    save_html_edit_manifest(root.path(), &manifest).expect("save manifest");

    assert!(get_html_edit_patch_for_file(&lookup)
        .expect("get stored patch")
        .patch
        .expect("stored patch")
        .changes
        .is_empty());
}

#[test]
fn html_edit_rejects_paths_outside_library() {
    let root = tempfile::tempdir().expect("library root");
    let outside_root = tempfile::tempdir().expect("outside root");
    let outside = outside_root.path().join("demo.html");
    std::fs::write(&outside, "<html></html>").expect("outside file");
    let error = library_relative_path(root.path(), &outside).expect_err("outside path rejected");
    assert!(error.to_string().contains("library"));
}

#[test]
fn html_edit_accepts_child_path() {
    let root = tempfile::tempdir().expect("library root");
    let slides = root.path().join("slides");
    std::fs::create_dir_all(&slides).expect("slides dir");
    let child = slides.join("demo.html");
    std::fs::write(&child, "<html></html>").expect("child file");
    let relative = library_relative_path(root.path(), &child).expect("child path accepted");
    assert_eq!(relative, "slides/demo.html");
}

#[test]
fn html_edit_manifest_round_trips() {
    let root = tempfile::tempdir().expect("temp dir");
    let mut manifest = HtmlEditManifest::default();
    manifest.entries.insert(
        "slides/demo.html".to_string(),
        HtmlEditManifestEntry {
            artifact_edit_id: "artifact-1".to_string(),
            last_known_item_id: 42,
            last_known_source_hash: "hash".to_string(),
            editable_id_set_hash: "ids".to_string(),
            title_hint: "Demo".to_string(),
        },
    );

    save_html_edit_manifest(root.path(), &manifest).expect("save manifest");
    let loaded = load_html_edit_manifest(root.path()).expect("load manifest");
    assert_eq!(loaded.entries["slides/demo.html"].artifact_edit_id, "artifact-1");
}

#[test]
fn html_edit_get_returns_provisional_artifact_id() {
    let root = tempfile::tempdir().expect("temp dir");
    let html_path = root.path().join("editable-basic.html");
    std::fs::copy(fixture_path("editable-basic.html"), &html_path).expect("copy fixture");

    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path,
        title_hint: "Editable Basic".to_string(),
    };
    let response = get_html_edit_patch_for_file(&lookup).expect("get patch");

    assert_eq!(response.patch_revision, 0);
    assert_eq!(response.patch_apply_status.as_str(), "clean");
    assert!(response.artifact_edit_id.starts_with("html-edit-"));
    assert!(response.field_apply_results.is_empty());
    assert!(response.patch.is_none());
}

#[test]
fn html_edit_save_initializes_manifest_and_rejects_stale_revision() {
    let root = tempfile::tempdir().expect("temp dir");
    let html_path = root.path().join("editable-basic.html");
    std::fs::copy(fixture_path("editable-basic.html"), &html_path).expect("copy fixture");

    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
    };
    let get_response = get_html_edit_patch_for_file(&lookup).expect("get patch");
    let mut changes = std::collections::BTreeMap::new();
    changes.insert(
        "cover-title".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"cover-title\"]".to_string(),
            original_text_hash: None,
            original_src_hash: None,
            original_style_hash: None,
            text: Some("Updated title".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );

    let save = HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path,
        title_hint: "Editable Basic".to_string(),
        artifact_edit_id: get_response.artifact_edit_id.clone(),
        expected_file_hash: get_response.source_file_hash,
        expected_modified_at: get_response.source_modified_at,
        expected_patch_revision: 0,
        changes,
    };
    let save_response = save_html_edit_patch_for_file(&save).expect("save patch");

    assert_eq!(save_response.patch_revision, 1);
    assert_eq!(save_response.artifact_edit_id, get_response.artifact_edit_id);

    let manifest = load_html_edit_manifest(root.path()).expect("load manifest");
    let entry = manifest
        .entries
        .get("editable-basic.html")
        .expect("manifest entry");
    assert_eq!(entry.artifact_edit_id, get_response.artifact_edit_id);
    assert_eq!(entry.last_known_item_id, 10);

    let stale_error = save_html_edit_patch_for_file(&HtmlEditPatchSave {
        expected_patch_revision: 0,
        ..save
    })
    .expect_err("stale revision rejected");
    assert!(matches!(stale_error, AppError::EditConflict));
}

#[test]
fn html_edit_reopen_loads_saved_patch() {
    let root = tempfile::tempdir().expect("temp dir");
    let html_path = root.path().join("editable-basic.html");
    std::fs::copy(fixture_path("editable-basic.html"), &html_path).expect("copy fixture");

    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
    };
    let get_response = get_html_edit_patch_for_file(&lookup).expect("get patch");
    let mut changes = std::collections::BTreeMap::new();
    changes.insert(
        "cover-title".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"cover-title\"]".to_string(),
            original_text_hash: None,
            original_src_hash: None,
            original_style_hash: None,
            text: Some("Updated title".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );

    save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
        artifact_edit_id: get_response.artifact_edit_id.clone(),
        expected_file_hash: get_response.source_file_hash,
        expected_modified_at: get_response.source_modified_at,
        expected_patch_revision: 0,
        changes,
    })
    .expect("save patch");

    let reopened = get_html_edit_patch_for_file(&lookup).expect("reopen patch");

    assert_eq!(reopened.artifact_edit_id, get_response.artifact_edit_id);
    assert_eq!(reopened.patch_revision, 1);
    let field_result = reopened
        .field_apply_results
        .get("cover-title")
        .expect("cover-title apply result");
    assert_eq!(field_result.status, HtmlEditFieldApplyStatus::Applied);
    assert_eq!(field_result.reason, HtmlEditFieldApplyReason::Clean);
    let patch = reopened.patch.expect("saved patch");
    assert_eq!(patch.patch_revision, 1);
    assert_eq!(
        patch.changes["cover-title"].text.as_deref(),
        Some("Updated title")
    );
}

#[test]
fn html_edit_second_save_merges_incremental_changes_with_existing_patch() {
    let root = tempfile::tempdir().expect("temp dir");
    let html_path = root.path().join("editable-basic.html");
    std::fs::copy(fixture_path("editable-basic.html"), &html_path).expect("copy fixture");

    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
    };
    let get_response = get_html_edit_patch_for_file(&lookup).expect("get patch");
    let mut initial_changes = std::collections::BTreeMap::new();
    initial_changes.insert(
        "cover-title".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"cover-title\"]".to_string(),
            original_text_hash: None,
            original_src_hash: None,
            original_style_hash: None,
            text: Some("First saved title".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );
    initial_changes.insert(
        "cover-body".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"cover-body\"]".to_string(),
            original_text_hash: None,
            original_src_hash: None,
            original_style_hash: None,
            text: Some("First saved body".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );

    save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
        artifact_edit_id: get_response.artifact_edit_id.clone(),
        expected_file_hash: get_response.source_file_hash.clone(),
        expected_modified_at: get_response.source_modified_at,
        expected_patch_revision: 0,
        changes: initial_changes,
    })
    .expect("save initial patch");

    let reopened = get_html_edit_patch_for_file(&lookup).expect("reopen patch");
    assert_eq!(reopened.patch_revision, 1);

    let mut title_only_changes = std::collections::BTreeMap::new();
    title_only_changes.insert(
        "cover-title".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"cover-title\"]".to_string(),
            original_text_hash: None,
            original_src_hash: None,
            original_style_hash: None,
            text: Some("Second saved title".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );

    save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
        artifact_edit_id: reopened.artifact_edit_id,
        expected_file_hash: reopened.source_file_hash,
        expected_modified_at: reopened.source_modified_at,
        expected_patch_revision: 1,
        changes: title_only_changes,
    })
    .expect("save title-only patch");

    let reopened_after_second_save = get_html_edit_patch_for_file(&lookup).expect("reopen patch");

    assert_eq!(reopened_after_second_save.patch_revision, 2);
    let patch = reopened_after_second_save.patch.expect("saved patch");
    assert_eq!(patch.patch_revision, 2);
    assert_eq!(
        patch.changes["cover-title"].text.as_deref(),
        Some("Second saved title")
    );
    assert_eq!(
        patch.changes["cover-body"].text.as_deref(),
        Some("First saved body")
    );

    let mut reconciled_changes = std::collections::BTreeMap::new();
    reconciled_changes.insert(
        "cover-body".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"cover-body\"]".to_string(),
            original_text_hash: None,
            original_src_hash: None,
            original_style_hash: None,
            text: Some("First saved body".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );
    let reconciled = save_html_edit_patch_replacing_changes_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path,
        title_hint: "Editable Basic".to_string(),
        artifact_edit_id: patch.artifact_edit_id.clone(),
        expected_file_hash: reopened_after_second_save.source_file_hash,
        expected_modified_at: reopened_after_second_save.source_modified_at,
        expected_patch_revision: 2,
        changes: reconciled_changes,
    })
    .expect("replace a stale patch with the current full reconciled document state");

    assert_eq!(reconciled.patch_revision, 3);
    let reopened_after_reconciliation = get_html_edit_patch_for_file(&lookup).expect("reopen reconciled patch");
    let reconciled_patch = reopened_after_reconciliation.patch.expect("reconciled patch");
    assert_eq!(reconciled_patch.changes.len(), 1);
    assert_eq!(reconciled_patch.changes["cover-body"].text.as_deref(), Some("First saved body"));
}

#[test]
fn html_edit_save_rejects_missing_patch_when_manifest_entry_exists() {
    let root = tempfile::tempdir().expect("temp dir");
    let html_path = root.path().join("editable-basic.html");
    std::fs::copy(fixture_path("editable-basic.html"), &html_path).expect("copy fixture");

    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
    };
    let get_response = get_html_edit_patch_for_file(&lookup).expect("get patch");
    let mut changes = std::collections::BTreeMap::new();
    changes.insert(
        "cover-title".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"cover-title\"]".to_string(),
            original_text_hash: None,
            original_src_hash: None,
            original_style_hash: None,
            text: Some("Saved title before patch loss".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );

    save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
        artifact_edit_id: get_response.artifact_edit_id.clone(),
        expected_file_hash: get_response.source_file_hash.clone(),
        expected_modified_at: get_response.source_modified_at,
        expected_patch_revision: 0,
        changes,
    })
    .expect("save patch");

    let manifest = load_html_edit_manifest(root.path()).expect("load manifest");
    let entry = manifest
        .entries
        .get("editable-basic.html")
        .expect("manifest entry exists");
    assert_eq!(entry.artifact_edit_id, get_response.artifact_edit_id);

    let patch_path =
        patch_path(root.path(), &get_response.artifact_edit_id).expect("patch path");
    std::fs::remove_file(&patch_path).expect("remove saved patch");

    let mut replacement_changes = std::collections::BTreeMap::new();
    replacement_changes.insert(
        "cover-body".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"cover-body\"]".to_string(),
            original_text_hash: None,
            original_src_hash: None,
            original_style_hash: None,
            text: Some("Replacement body must not initialize patch".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );

    let error = save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path,
        title_hint: "Editable Basic".to_string(),
        artifact_edit_id: get_response.artifact_edit_id,
        expected_file_hash: get_response.source_file_hash,
        expected_modified_at: get_response.source_modified_at,
        expected_patch_revision: 0,
        changes: replacement_changes,
    })
    .expect_err("missing patch behind manifest entry rejected");

    assert!(matches!(error, AppError::EditConflict));
    assert!(!patch_path.exists());
}

#[test]
fn html_edit_save_rejects_unparseable_patch_when_manifest_entry_exists() {
    let root = tempfile::tempdir().expect("temp dir");
    let html_path = root.path().join("editable-basic.html");
    std::fs::copy(fixture_path("editable-basic.html"), &html_path).expect("copy fixture");

    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
    };
    let get_response = get_html_edit_patch_for_file(&lookup).expect("get patch");
    let mut changes = std::collections::BTreeMap::new();
    changes.insert(
        "cover-title".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"cover-title\"]".to_string(),
            original_text_hash: None,
            original_src_hash: None,
            original_style_hash: None,
            text: Some("Saved title before patch corruption".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );

    save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
        artifact_edit_id: get_response.artifact_edit_id.clone(),
        expected_file_hash: get_response.source_file_hash.clone(),
        expected_modified_at: get_response.source_modified_at,
        expected_patch_revision: 0,
        changes,
    })
    .expect("save patch");

    let manifest = load_html_edit_manifest(root.path()).expect("load manifest");
    let entry = manifest
        .entries
        .get("editable-basic.html")
        .expect("manifest entry exists");
    assert_eq!(entry.artifact_edit_id, get_response.artifact_edit_id);

    let patch_path =
        patch_path(root.path(), &get_response.artifact_edit_id).expect("patch path");
    assert!(patch_path.exists());
    std::fs::write(&patch_path, "{not valid json").expect("corrupt patch file");

    let mut replacement_changes = std::collections::BTreeMap::new();
    replacement_changes.insert(
        "cover-body".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"cover-body\"]".to_string(),
            original_text_hash: None,
            original_src_hash: None,
            original_style_hash: None,
            text: Some("Replacement body must not overwrite corrupt patch".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );

    let error = save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path,
        title_hint: "Editable Basic".to_string(),
        artifact_edit_id: get_response.artifact_edit_id,
        expected_file_hash: get_response.source_file_hash,
        expected_modified_at: get_response.source_modified_at,
        expected_patch_revision: 1,
        changes: replacement_changes,
    })
    .expect_err("unparseable patch behind manifest entry rejected");

    assert!(matches!(error, AppError::EditConflict));
}

#[test]
fn html_edit_get_marks_saved_patch_stale_when_source_hash_changes() {
    let root = tempfile::tempdir().expect("temp dir");
    let html_path = root.path().join("editable-basic.html");
    std::fs::copy(fixture_path("editable-basic.html"), &html_path).expect("copy fixture");

    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
    };
    let get_response = get_html_edit_patch_for_file(&lookup).expect("get patch");
    let mut changes = std::collections::BTreeMap::new();
    changes.insert(
        "cover-title".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"cover-title\"]".to_string(),
            original_text_hash: None,
            original_src_hash: None,
            original_style_hash: None,
            text: Some("Updated title".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );

    save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
        artifact_edit_id: get_response.artifact_edit_id,
        expected_file_hash: get_response.source_file_hash,
        expected_modified_at: get_response.source_modified_at,
        expected_patch_revision: 0,
        changes,
    })
    .expect("save patch");
    std::fs::write(&html_path, "<html><body><h1>Changed source</h1></body></html>")
        .expect("modify source");

    let reopened = get_html_edit_patch_for_file(&lookup).expect("reopen stale patch");

    assert_eq!(
        reopened.patch_apply_status,
        HtmlEditPatchApplyStatus::StaleButApplicable
    );
    let field_result = reopened
        .field_apply_results
        .get("cover-title")
        .expect("cover-title apply result");
    assert_eq!(field_result.status, HtmlEditFieldApplyStatus::Applied);
    assert_eq!(
        field_result.reason,
        HtmlEditFieldApplyReason::StaleButApplicable
    );
}

#[test]
fn html_edit_save_rejects_invalid_artifact_edit_id() {
    let root = tempfile::tempdir().expect("temp dir");
    let html_path = root.path().join("editable-basic.html");
    std::fs::copy(fixture_path("editable-basic.html"), &html_path).expect("copy fixture");

    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
    };
    let get_response = get_html_edit_patch_for_file(&lookup).expect("get patch");

    let error = save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path,
        title_hint: "Editable Basic".to_string(),
        artifact_edit_id: "../escape".to_string(),
        expected_file_hash: get_response.source_file_hash,
        expected_modified_at: get_response.source_modified_at,
        expected_patch_revision: 0,
        changes: std::collections::BTreeMap::new(),
    })
    .expect_err("invalid artifact id rejected");

    assert!(matches!(error, AppError::InvalidParams));
    assert!(!root.path().join(".nutbook/html-edit/escape.json").exists());
}

#[test]
fn html_edit_save_rejects_modified_at_mismatch() {
    let root = tempfile::tempdir().expect("temp dir");
    let html_path = root.path().join("editable-basic.html");
    std::fs::copy(fixture_path("editable-basic.html"), &html_path).expect("copy fixture");

    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
    };
    let get_response = get_html_edit_patch_for_file(&lookup).expect("get patch");

    let error = save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path,
        title_hint: "Editable Basic".to_string(),
        artifact_edit_id: get_response.artifact_edit_id,
        expected_file_hash: get_response.source_file_hash,
        expected_modified_at: get_response.source_modified_at + 1,
        expected_patch_revision: 0,
        changes: std::collections::BTreeMap::new(),
    })
    .expect_err("modified time mismatch rejected");

    assert!(matches!(error, AppError::EditConflict));
}

#[test]
fn html_edit_save_rejects_file_hash_mismatch_without_creating_patch() {
    let root = tempfile::tempdir().expect("temp dir");
    let html_path = root.path().join("editable-basic.html");
    std::fs::copy(fixture_path("editable-basic.html"), &html_path).expect("copy fixture");

    let lookup = HtmlEditPatchLookup {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path.clone(),
        title_hint: "Editable Basic".to_string(),
    };
    let get_response = get_html_edit_patch_for_file(&lookup).expect("get patch");
    let mut changes = std::collections::BTreeMap::new();
    changes.insert(
        "cover-title".to_string(),
        HtmlEditChange {
            change_type: HtmlEditChangeType::Text,
            selector: "[data-id=\"cover-title\"]".to_string(),
            original_text_hash: None,
            original_src_hash: None,
            original_style_hash: None,
            text: Some("Hash mismatch must not create patch".to_string()),
            src: None,
            alt: None,
            html: None,
            text_align: None,
            edit_role: None,
            picture_sources: None,
        },
    );

    let error = save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path,
        title_hint: "Editable Basic".to_string(),
        artifact_edit_id: get_response.artifact_edit_id.clone(),
        expected_file_hash: "definitely-not-the-current-file-hash".to_string(),
        expected_modified_at: get_response.source_modified_at,
        expected_patch_revision: 0,
        changes,
    })
    .expect_err("file hash mismatch rejected");

    assert!(matches!(error, AppError::EditConflict));
    let patch_path =
        patch_path(root.path(), &get_response.artifact_edit_id).expect("patch path");
    assert!(!patch_path.exists());
    let manifest = load_html_edit_manifest(root.path()).expect("load manifest");
    assert!(!manifest.entries.contains_key("editable-basic.html"));
}
