use std::{
    collections::BTreeMap,
    fs, io,
    path::{Path, PathBuf},
};

use super::{draft_assets, open, result_file_name, result_path, safe_file_title, Result};
use crate::core::document_versions::{capture_markdown, relocate_markdown, Dependency};
use rusqlite::params;

pub fn export(
    data_dir: &Path,
    issue_id: &str,
    version: i64,
    result: bool,
    destination: &Path,
) -> Result<PathBuf> {
    uuid::Uuid::parse_str(issue_id).map_err(|_| "Invalid issue ID")?;
    let mut db = open(data_dir)?;
    let tx = db.transaction().map_err(|error| error.to_string())?;
    let title: String = tx
        .query_row(
            "SELECT title FROM issues WHERE id = ?1",
            [issue_id],
            |row| row.get(0),
        )
        .map_err(|error| error.to_string())?;
    let filename = result_file_name(&title, version);

    let staging_source = tempfile::tempdir().map_err(|error| error.to_string())?;
    let (source, markdown) = if result {
        tx.query_row(
            "SELECT version FROM results WHERE issue_id = ?1 AND version = ?2",
            params![issue_id, version],
            |_| Ok(()),
        )
        .map_err(|_| "This result version is no longer available")?;
        let path = result_path(&tx, data_dir, issue_id, version, &filename)?;
        if !fs::symlink_metadata(&path).is_ok_and(|metadata| metadata.is_file()) {
            return Err("The saved result file is missing or is not a regular file".into());
        }
        let markdown = fs::read_to_string(&path).map_err(|error| error.to_string())?;
        (path, markdown)
    } else {
        let markdown: String = tx
            .query_row(
                "SELECT markdown FROM drafts WHERE issue_id = ?1 AND version = ?2",
                params![issue_id, version],
                |row| row.get(0),
            )
            .map_err(|error| error.to_string())?;
        let root = staging_source
            .path()
            .canonicalize()
            .map_err(|error| error.to_string())?;
        let path = draft_assets::prepare_result(&tx, issue_id, version, root.join(&filename))?;
        (path, markdown)
    };
    let root = source.parent().ok_or("Source directory is missing")?;
    let snapshot = capture_markdown(&source, root, markdown.as_bytes(), 128 * 1024 * 1024)
        .map_err(|error| error.to_string())?;
    if result && fs::read(&source).map_err(|error| error.to_string())? != markdown.as_bytes() {
        return Err("The saved result changed while it was being read. Try again.".into());
    }
    let staged = tempfile::Builder::new()
        .prefix(".nuts-export-")
        .tempdir_in(destination)
        .map_err(|error| error.to_string())?;
    let mut replacements = BTreeMap::new();
    let assets = staged.path().join(draft_assets::ASSETS_DIR);
    for (reference, dependency) in &snapshot.snapshot.dependencies {
        match dependency {
            Dependency::Captured { object, .. } => {
                let suffix = reference
                    .split(['?', '#'])
                    .next()
                    .and_then(|path| Path::new(path).extension())
                    .and_then(|value| value.to_str())
                    .filter(|value| {
                        value.len() <= 8 && value.bytes().all(|byte| byte.is_ascii_alphanumeric())
                    })
                    .unwrap_or("bin");
                let name = format!("{object}.{suffix}");
                fs::create_dir_all(&assets).map_err(|error| error.to_string())?;
                fs::write(assets.join(&name), &snapshot.objects[object])
                    .map_err(|error| error.to_string())?;
                replacements.insert(reference.clone(), format!("{}/{name}", draft_assets::ASSETS_DIR));
            }
            _ if reference.starts_with("https://")
                || reference.starts_with("http://")
                || reference.starts_with("//") => {}
            _ => return Err(format!("Cannot export local image: {reference}")),
        }
    }
    let markdown =
        relocate_markdown(&markdown, &replacements).map_err(|error| error.to_string())?;
    fs::write(staged.path().join(&filename), markdown).map_err(|error| error.to_string())?;
    let kind = if result { "Result" } else { "Draft" };
    let safe_title = safe_file_title(&title);
    let title = if safe_title.is_empty() {
        "NUTS"
    } else {
        &safe_title
    };
    let folder_name = format!("{title} - {kind} v{version}");
    let mut target = destination.join(&folder_name);
    let mut number = 1;
    loop {
        match publish_directory(staged.path(), &target) {
            Ok(()) => return Ok(target),
            Err(error) if error.kind() == io::ErrorKind::AlreadyExists => {
                number += 1;
                target = destination.join(format!("{folder_name} ({number})"));
            }
            Err(error) => return Err(error.to_string()),
        }
    }
}

// POSIX rename can replace an existing empty directory. Publish exclusively
// so that collisions, including concurrent exports, preserve the existing entry.
#[cfg(any(target_os = "macos", target_os = "linux"))]
fn publish_directory(source: &Path, target: &Path) -> io::Result<()> {
    use std::{ffi::CString, os::unix::ffi::OsStrExt};
    let source = CString::new(source.as_os_str().as_bytes())?;
    let target = CString::new(target.as_os_str().as_bytes())?;
    // Both C strings are valid for the duration of the system call.
    #[cfg(target_os = "macos")]
    let result = unsafe { libc::renamex_np(source.as_ptr(), target.as_ptr(), libc::RENAME_EXCL) };
    #[cfg(target_os = "linux")]
    let result = unsafe {
        libc::syscall(
            libc::SYS_renameat2,
            libc::AT_FDCWD,
            source.as_ptr(),
            libc::AT_FDCWD,
            target.as_ptr(),
            libc::RENAME_NOREPLACE,
        )
    };
    if result == 0 {
        Ok(())
    } else {
        Err(io::Error::last_os_error())
    }
}

#[cfg(windows)]
fn publish_directory(source: &Path, target: &Path) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows_sys::Win32::Storage::FileSystem::MoveFileExW;
    // Canonicalize the shared parent through the source, so the Win32 call
    // also accepts paths beyond MAX_PATH.
    let source = source.canonicalize()?;
    let target = source.with_file_name(target.file_name().ok_or(io::ErrorKind::InvalidInput)?);
    let source: Vec<_> = source.as_os_str().encode_wide().chain([0]).collect();
    let target: Vec<_> = target.as_os_str().encode_wide().chain([0]).collect();
    // Both strings are NUL-terminated. Zero flags disallow replacement.
    if unsafe { MoveFileExW(source.as_ptr(), target.as_ptr(), 0) } != 0 {
        Ok(())
    } else {
        Err(io::Error::last_os_error())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{document_versions::image_references, nuts};

    #[test]
    fn exports_selected_draft_and_current_result_to_movable_folders() {
        let temp = tempfile::tempdir().unwrap();
        let root = temp.path();
        let data = root.join("data");
        let input = root.join("input.md");
        let assets = root.join("asset");
        fs::create_dir(&assets).unwrap();
        let image = assets.join("figure.png");
        let id = nuts::create(&data, "Export", "source.md", "# Source").unwrap();
        for version in 1..=2 {
            let claim = nuts::claim(&data, &id, (version == 2).then(|| "Revise".into())).unwrap();
            fs::write(
                &input,
                format!("# Draft {version}\n\n![Figure](asset/figure.png)"),
            )
            .unwrap();
            image::RgbImage::new(version, 3).save(&image).unwrap();
            assert_eq!(
                nuts::submit_file(&data, &id, &claim.token, &input).unwrap(),
                i64::from(version)
            );
        }
        let board_folder = nuts::settings::open_folder_path(&data, "default").unwrap();
        assert_eq!(fs::read_dir(board_folder.join("成果")).unwrap().count(), 0);
        let saved = nuts::save_result(&data, &id, 2, None, |path| Ok(path.to_path_buf())).unwrap();
        assert!(saved.starts_with(board_folder.canonicalize().unwrap().join("成果")));
        let edited = "# Manually edited result\n\n![Figure][image]\n\n[image]: asset/figure.png";
        fs::write(&saved, edited).unwrap();
        let destination = root.join("exports");
        fs::create_dir(&destination).unwrap();
        for (version, result, heading) in [
            (1, false, "# Draft 1"),
            (2, true, "# Manually edited result"),
        ] {
            let exported = export(&data, &id, version, result, &destination).unwrap();
            let kind = if result { "Result" } else { "Draft" };
            assert_eq!(
                exported,
                destination.join(format!("Export - {kind} v{version}"))
            );
            let moved = root.join(format!("moved-{version}"));
            fs::rename(exported, &moved).unwrap();
            let markdown =
                fs::read_to_string(moved.join(result_file_name("Export", version))).unwrap();
            assert!(markdown.starts_with(heading));
            let references = image_references(&markdown);
            assert_eq!(references.len(), 1);
            let relative = references.first().unwrap();
            assert!(relative.starts_with("assets/"));
            assert_eq!(
                image::open(moved.join(relative)).unwrap().width(),
                version as u32
            );
        }
        let occupied = destination.join("Export - Draft v1");
        fs::create_dir(&occupied).unwrap();
        let repeated = export(&data, &id, 1, false, &destination).unwrap();
        assert_eq!(repeated, destination.join("Export - Draft v1 (2)"));
        let third = export(&data, &id, 1, false, &destination).unwrap();
        assert_eq!(third, destination.join("Export - Draft v1 (3)"));
        assert_eq!(fs::read_dir(&occupied).unwrap().count(), 0);
        assert!(repeated.join(result_file_name("Export", 1)).is_file());
        for output in [occupied, repeated, third] {
            fs::remove_dir_all(output).unwrap();
        }
        assert_eq!(fs::read_to_string(&saved).unwrap(), edited);
        assert!(nuts::drafts(&data, &id).unwrap()[1]
            .markdown
            .starts_with("# Draft 1"));
        assert!(fs::read_to_string(&input).unwrap().starts_with("# Draft 2"));
        fs::remove_file(saved.parent().unwrap().join("asset/figure.png")).unwrap();
        assert!(export(&data, &id, 2, true, &destination).is_err());
        assert!(export(&data, &id, 1, true, &destination).is_err());
        assert_eq!(fs::read_dir(destination).unwrap().count(), 0);
    }
}
