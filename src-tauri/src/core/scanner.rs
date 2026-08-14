use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{
    core::document::file_modified_at_string,
    errors::AppError,
    models::IndexedItemRecord,
};

fn is_supported_file(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| matches!(value.to_ascii_lowercase().as_str(), "md" | "markdown" | "html" | "htm"))
        .unwrap_or(false)
}

fn file_type_for_extension(extension: &str) -> Option<&'static str> {
    match extension.to_ascii_lowercase().as_str() {
        "md" | "markdown" => Some("markdown"),
        "html" | "htm" => Some("html"),
        _ => None,
    }
}

fn timestamp_string(metadata: &fs::Metadata) -> Result<String, AppError> {
    file_modified_at_string(metadata)
}

fn visit_dir(root: &Path, current: &Path, results: &mut Vec<PathBuf>) -> Result<(), AppError> {
    for entry in fs::read_dir(current).map_err(|_| AppError::IoError)? {
        let entry = entry.map_err(|_| AppError::IoError)?;
        let path = entry.path();
        let file_type = entry.file_type().map_err(|_| AppError::IoError)?;

        if file_type.is_dir() {
            visit_dir(root, &path, results)?;
        } else if file_type.is_file() && is_supported_file(&path) {
            let _ = root;
            results.push(path);
        }
    }

    Ok(())
}

fn build_item_record(
    library_id: i64,
    source_root: &Path,
    path: PathBuf,
    now: &str,
) -> Result<IndexedItemRecord, AppError> {
    let metadata = fs::metadata(&path).map_err(|_| AppError::IoError)?;
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .ok_or(AppError::UnsupportedFileType)?;
    let file_type = file_type_for_extension(extension).ok_or(AppError::UnsupportedFileType)?;
    let relative_path = path
        .strip_prefix(source_root)
        .map_err(|_| AppError::IoError)?
        .to_string_lossy()
        .to_string();

    Ok(IndexedItemRecord {
        library_id,
        file_path: path.to_string_lossy().to_string(),
        relative_path: if relative_path.is_empty() {
            path.file_name()
                .map(|value| value.to_string_lossy().to_string())
                .ok_or(AppError::IoError)?
        } else {
            relative_path
        },
        file_name: path
            .file_name()
            .map(|value| value.to_string_lossy().to_string())
            .ok_or(AppError::IoError)?,
        file_ext: extension.to_string(),
        file_type: file_type.to_string(),
        file_size: metadata.len() as i64,
        modified_at: timestamp_string(&metadata)?,
        created_at: now.to_string(),
        updated_at: now.to_string(),
    })
}

pub fn scan_library_files(
    library_id: i64,
    root_path: &str,
    now: &str,
) -> Result<Vec<IndexedItemRecord>, AppError> {
    let root = Path::new(root_path);
    if !root.exists() || !root.is_dir() {
        return Err(AppError::InvalidParams);
    }

    let mut paths = Vec::new();
    visit_dir(root, root, &mut paths)?;
    paths.sort();

    paths.into_iter()
        .map(|path| build_item_record(library_id, root, path, now))
        .collect()
}

pub fn scan_file_source(
    library_id: i64,
    file_path: &str,
    now: &str,
) -> Result<Vec<IndexedItemRecord>, AppError> {
    let path = Path::new(file_path);
    if !path.exists() || !path.is_file() || !is_supported_file(path) {
        return Err(AppError::InvalidParams);
    }

    let parent = path.parent().ok_or(AppError::InvalidParams)?;
    let mut paths = vec![path.to_path_buf()];
    if let Some(stem) = path.file_stem().and_then(|value| value.to_str()) {
        let companion = parent.join(format!("{stem}.nutbook-editable.html"));
        if companion.is_file() { paths.push(companion); }
    }
    paths.into_iter().map(|entry| build_item_record(library_id, parent, entry, now)).collect()
}

#[cfg(test)]
mod tests {
    use std::{fs, time::{SystemTime, UNIX_EPOCH}};

    use super::{scan_file_source, scan_library_files};

    fn unique_dir() -> std::path::PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("nutbook-scan-{nanos}"))
    }

    #[test]
    fn scan_library_files_collects_supported_files_only() {
        let root = unique_dir();
        fs::create_dir_all(root.join("nested")).expect("root dir should be created");
        fs::write(root.join("note.md"), "# hello").expect("markdown file should be written");
        fs::write(root.join("nested/page.html"), "<h1>hi</h1>").expect("html file should be written");
        fs::write(root.join("slides.markdown"), "# slides").expect("markdown file should be written");
        fs::write(root.join("nested/card.htm"), "<h1>htm</h1>").expect("htm file should be written");
        fs::write(root.join("nested/skip.txt"), "ignore").expect("txt file should be written");

        let records = scan_library_files(1, root.to_str().expect("path utf8"), "now")
            .expect("scan should succeed");

        assert_eq!(records.len(), 4);
        assert!(records.iter().filter(|item| item.file_type == "markdown").count() >= 2);
        assert!(records.iter().filter(|item| item.file_type == "html").count() >= 2);

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn scan_file_source_collects_single_supported_file() {
        let root = unique_dir();
        fs::create_dir_all(&root).expect("root dir should be created");
        let file_path = root.join("deck.html");
        fs::write(&file_path, "<h1>deck</h1>").expect("html file should be written");

        let records = scan_file_source(2, file_path.to_str().expect("path utf8"), "now")
            .expect("file scan should succeed");

        assert_eq!(records.len(), 1);
        assert_eq!(records[0].file_name, "deck.html");
        assert_eq!(records[0].relative_path, "deck.html");
        assert_eq!(records[0].library_id, 2);

        let _ = fs::remove_dir_all(root);
    }
}
