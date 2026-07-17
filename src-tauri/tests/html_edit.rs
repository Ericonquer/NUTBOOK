use nutbook_backend::core::html_edit::{
    get_html_edit_patch_for_file, library_relative_path, load_html_edit_manifest,
    patch_path, save_html_edit_manifest, save_html_edit_patch_for_file, HtmlEditManifest,
    HtmlEditManifestEntry, HtmlEditPatchLookup, HtmlEditPatchSave,
};
use nutbook_backend::errors::AppError;
use nutbook_backend::models::{
    HtmlEditChange, HtmlEditChangeType, HtmlEditFieldApplyReason, HtmlEditFieldApplyStatus,
    HtmlEditPatch, HtmlEditPatchApplyStatus,
};

fn fixture_path(name: &str) -> std::path::PathBuf {
    std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/html-edit")
        .join(name)
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
        },
    );

    save_html_edit_patch_for_file(&HtmlEditPatchSave {
        library_id: 1,
        library_root: root.path().to_path_buf(),
        item_id: 10,
        file_path: html_path,
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
