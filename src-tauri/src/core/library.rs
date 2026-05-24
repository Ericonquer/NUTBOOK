use std::path::Path;

use crate::{
    errors::AppError,
    models::Library,
    utils::path_rules::{libraries_overlap, normalized_path_string},
};

fn derive_library_name(candidate_path: &str, source_kind: &str) -> Result<String, AppError> {
    let path = Path::new(candidate_path);
    let name = if source_kind == "file" {
        path.file_name()
    } else {
        path.file_name()
    };

    name
        .map(|value| value.to_string_lossy().to_string())
        .filter(|value| !value.is_empty())
        .ok_or(AppError::InvalidParams)
}

pub fn validate_library_root(existing_roots: &[String], candidate_root: &str) -> bool {
    let candidate = Path::new(candidate_root);

    existing_roots
        .iter()
        .map(Path::new)
        .any(|existing| libraries_overlap(existing, candidate))
}

pub fn select_or_create_library(
    existing_libraries: &[Library],
    candidate_root: &str,
    preferred_name: Option<&str>,
    source_kind: &str,
    next_id: i64,
    now: &str,
) -> Result<Library, AppError> {
    if !matches!(source_kind, "folder" | "file") {
        return Err(AppError::InvalidParams);
    }

    let normalized_candidate = normalized_path_string(Path::new(candidate_root));

    if let Some(existing) = existing_libraries
        .iter()
        .find(|library| {
            normalized_path_string(Path::new(&library.root_path)) == normalized_candidate
                && library.source_kind == source_kind
        })
    {
        return Ok(existing.clone());
    }

    if existing_libraries.iter().any(|library| {
        libraries_overlap(Path::new(&library.root_path), Path::new(&normalized_candidate))
    }) {
        return Err(AppError::LibraryPathOverlap);
    }

    let name = preferred_name
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .or_else(|| derive_library_name(&normalized_candidate, source_kind).ok())
        .ok_or(AppError::InvalidParams)?;

    Ok(Library {
        id: next_id,
        name,
        root_path: normalized_candidate,
        source_kind: source_kind.to_string(),
        is_active: true,
        created_at: now.to_string(),
        updated_at: now.to_string(),
        last_scanned_at: None,
        skill_binding: None,
    })
}

#[cfg(test)]
mod tests {
    use super::{select_or_create_library, validate_library_root};
    use crate::{errors::AppError, models::Library};

    fn sample_library(id: i64, root_path: &str) -> Library {
        Library {
            id,
            name: "Notes".to_string(),
            root_path: root_path.to_string(),
            source_kind: "folder".to_string(),
            is_active: true,
            created_at: "2026-04-22T00:00:00Z".to_string(),
            updated_at: "2026-04-22T00:00:00Z".to_string(),
            last_scanned_at: None,
            skill_binding: None,
        }
    }

    #[test]
    fn select_library_returns_existing_record_for_same_path() {
        let existing = vec![sample_library(1, "/Users/hayley/Documents/Notes")];

        let result = select_or_create_library(
            &existing,
            "/Users/hayley/Documents/./Notes",
            Some("Ignored"),
            "folder",
            2,
            "2026-04-22T09:00:00Z",
        )
        .expect("same path should reuse the existing library");

        assert_eq!(result.id, 1);
        assert_eq!(result.root_path, "/Users/hayley/Documents/Notes");
    }

    #[test]
    fn select_library_rejects_parent_child_overlap() {
        let existing = vec![sample_library(1, "/Users/hayley/Documents/Notes")];

        let result = select_or_create_library(
            &existing,
            "/Users/hayley/Documents/Notes/Sub",
            None,
            "folder",
            2,
            "2026-04-22T09:00:00Z",
        );

        assert!(matches!(result, Err(AppError::LibraryPathOverlap)));
    }

    #[test]
    fn select_library_creates_new_record_for_distinct_path() {
        let existing = vec![sample_library(1, "/Users/hayley/Documents/Notes")];

        let result = select_or_create_library(
            &existing,
            "/Users/hayley/Documents/Clips",
            None,
            "folder",
            2,
            "2026-04-22T09:00:00Z",
        )
        .expect("distinct path should create a new library");

        assert_eq!(result.id, 2);
        assert_eq!(result.name, "Clips");
        assert_eq!(result.root_path, "/Users/hayley/Documents/Clips");
        assert_eq!(result.source_kind, "folder");
        assert_eq!(result.created_at, "2026-04-22T09:00:00Z");
    }

    #[test]
    fn select_library_creates_file_source() {
        let existing = vec![sample_library(1, "/Users/hayley/Documents/Notes")];

        let result = select_or_create_library(
            &existing,
            "/Users/hayley/Documents/pitch.html",
            None,
            "file",
            2,
            "2026-04-22T09:00:00Z",
        )
        .expect("file source should be created");

        assert_eq!(result.name, "pitch.html");
        assert_eq!(result.source_kind, "file");
        assert_eq!(result.root_path, "/Users/hayley/Documents/pitch.html");
    }

    #[test]
    fn validate_library_root_reports_overlap() {
        let existing = vec!["/Users/hayley/Documents/Notes".to_string()];

        assert!(validate_library_root(
            &existing,
            "/Users/hayley/Documents/Notes/Sub"
        ));
        assert!(!validate_library_root(
            &existing,
            "/Users/hayley/Documents/Clips"
        ));
    }
}
