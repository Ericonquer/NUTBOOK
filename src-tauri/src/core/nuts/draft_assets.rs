use std::{
    collections::BTreeSet,
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
};

use base64::{engine::general_purpose::STANDARD, Engine};
use pulldown_cmark::{Event, Parser, Tag};
use rusqlite::{params, Connection, OptionalExtension};

use super::Result;

pub(super) const ASSETS_DIR: &str = "assets";
const LEGACY_ASSET_DIR: &str = "asset";
const MAX_IMAGE: u64 = 10 * 1024 * 1024;
const MAX_TOTAL: usize = 24 * 1024 * 1024;

pub(super) struct Asset {
    name: String,
    bytes: Option<Vec<u8>>,
}

fn asset_path(url: &str) -> Option<(&str, &str)> {
    let (directory, name) = url.strip_prefix("./").unwrap_or(url).split_once('/')?;
    if !matches!(directory, ASSETS_DIR | LEGACY_ASSET_DIR) {
        return None;
    }
    if name.is_empty() || name.contains(['/', '\\', ':']) || name.chars().any(char::is_control) {
        return None;
    }
    match Path::new(name)
        .extension()?
        .to_str()?
        .to_ascii_lowercase()
        .as_str()
    {
        "png" | "jpg" | "jpeg" | "gif" | "webp" => Some((directory, name)),
        _ => None,
    }
}

// Legacy rows use bare filenames. Qualify new rows so both directories can
// contain a different file with the same name.
fn storage_key(directory: &str, name: &str) -> String {
    if directory == LEGACY_ASSET_DIR {
        name.to_owned()
    } else {
        format!("{directory}/{name}")
    }
}

fn stored_path(key: &str) -> Option<(&str, &str)> {
    if key.contains('/') {
        return asset_path(key);
    }
    asset_path(&format!("{LEGACY_ASSET_DIR}/{key}"))?;
    Some((LEGACY_ASSET_DIR, key))
}

fn mime(bytes: &[u8]) -> Option<&'static str> {
    match image::guess_format(bytes).ok()? {
        image::ImageFormat::Png => Some("image/png"),
        image::ImageFormat::Jpeg => Some("image/jpeg"),
        image::ImageFormat::Gif => Some("image/gif"),
        image::ImageFormat::WebP => Some("image/webp"),
        _ => None,
    }
}

pub(super) fn collect(draft_path: &Path, markdown: &str) -> Result<Vec<Asset>> {
    let names = Parser::new(markdown)
        .filter_map(|event| match event {
            Event::Start(Tag::Image { dest_url, .. }) => asset_path(&dest_url).map(|(directory, name)| (directory.to_owned(), name.to_owned())),
            _ => None,
        })
        .collect::<BTreeSet<_>>();
    if names.is_empty() {
        return Ok(Vec::new());
    }
    let draft = draft_path
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let root = draft
        .parent()
        .ok_or("Draft directory is unavailable")?;
    let mut assets = Vec::new();
    let mut total = 0;
    for (directory, filename) in names {
        let name = storage_key(&directory, &filename);
        let path = root.join(&directory).join(&filename);
        let actual = match path.canonicalize() {
            Ok(path) => path,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                assets.push(Asset { name, bytes: None });
                continue;
            }
            Err(error) => return Err(error.to_string()),
        };
        if actual != path || !actual.is_file() {
            return Err(format!(
                "Draft image must be a local file in {directory}/: {filename}"
            ));
        }
        let file = fs::File::open(&actual).map_err(|error| error.to_string())?;
        let mut bytes = Vec::new();
        file.take(MAX_IMAGE + 1)
            .read_to_end(&mut bytes)
            .map_err(|error| error.to_string())?;
        total += bytes.len();
        if mime(&bytes).is_none() || bytes.len() > MAX_IMAGE as usize || total > MAX_TOTAL {
            return Err(format!("Unsupported image format or size: {name}"));
        }
        assets.push(Asset {
            name,
            bytes: Some(bytes),
        });
    }
    Ok(assets)
}

pub(super) fn store(db: &Connection, id: &str, version: i64, assets: &[Asset]) -> Result<()> {
    for asset in assets {
        if asset.bytes.is_none() {
            db.execute(
                "INSERT INTO nuts_draft_images
                 SELECT issue_id, ?2, name, bytes FROM nuts_draft_images
                 WHERE issue_id = ?1 AND name = ?3 AND version = COALESCE(
                    (SELECT base_version FROM nuts_review_rounds WHERE issue_id = ?1 AND next_version = ?2),
                    (SELECT MAX(version) FROM drafts WHERE issue_id = ?1 AND version < ?2))
                 ON CONFLICT(issue_id,version,name) DO NOTHING",
                params![id,version,asset.name],
            ).map_err(|error| error.to_string())?;
        } else {
            db.execute(
                "INSERT INTO nuts_draft_images VALUES (?1,?2,?3,?4)
                 ON CONFLICT(issue_id,version,name) DO NOTHING",
                params![id, version, asset.name, asset.bytes],
            )
            .map_err(|error| error.to_string())?;
        }
        let matches: Option<bool> = db.query_row(
            "SELECT ?4 IS NULL OR bytes = ?4 FROM nuts_draft_images WHERE issue_id = ?1 AND version = ?2 AND name = ?3",
            params![id,version,asset.name,asset.bytes], |row| row.get(0),
        ).optional().map_err(|error| error.to_string())?;
        match matches {
            Some(true) => {}
            Some(false) => {
                return Err(format!(
                    "This draft already has a different image: {}",
                    asset.name
                ))
            }
            None => {
                return Err(format!(
                    "Draft image is unavailable: {}",
                    asset.name
                ))
            }
        }
    }
    if !assets.is_empty() {
        let total: i64 = db.query_row(
            "SELECT COALESCE(SUM(length(bytes)),0) FROM nuts_draft_images WHERE issue_id = ?1 AND version = ?2",
            params![id,version], |row| row.get(0),
        ).map_err(|error| error.to_string())?;
        if total > MAX_TOTAL as i64 {
            return Err("Draft images exceed the total size limit".into());
        }
    }
    Ok(())
}

pub fn image_url(data_dir: &Path, id: &str, version: i64, url: &str) -> Result<Option<String>> {
    let (directory, name) = asset_path(url).ok_or("Unsupported draft image path")?;
    let name = storage_key(directory, name);
    let bytes: Option<Vec<u8>> = super::open(data_dir)?.query_row(
        "SELECT bytes FROM nuts_draft_images WHERE issue_id = ?1 AND version = ?2 AND name = ?3",
        params![id,version,name], |row| row.get(0),
    ).optional().map_err(|error| error.to_string())?;
    Ok(bytes.and_then(|bytes| {
        mime(&bytes).map(|kind| format!("data:{kind};base64,{}", STANDARD.encode(&bytes)))
    }))
}

pub(super) fn prepare_result(
    db: &Connection,
    id: &str,
    version: i64,
    mut path: PathBuf,
) -> Result<PathBuf> {
    write_result_assets(db, id, version, &mut path, false)?;
    Ok(path)
}

pub(super) fn restore_result_assets(
    db: &Connection,
    id: &str,
    version: i64,
    mut path: PathBuf,
) -> Result<PathBuf> {
    write_result_assets(db, id, version, &mut path, true)?;
    Ok(path)
}

fn write_result_assets(
    db: &Connection,
    id: &str,
    version: i64,
    path: &mut PathBuf,
    exact_path: bool,
) -> Result<()> {
    let mut query = db.prepare(
        "SELECT name, bytes FROM nuts_draft_images WHERE issue_id = ?1 AND version = ?2 ORDER BY name",
    ).map_err(|error| error.to_string())?;
    let mut rows = query
        .query(params![id, version])
        .map_err(|error| error.to_string())?;
    let Some(first) = rows.next().map_err(|error| error.to_string())? else {
        return Ok(());
    };
    let mut next = Some(first);
    let filename = path
        .file_name()
        .ok_or("Result filename is missing")?
        .to_os_string();
    let result_dir = path.with_file_name(format!("v{version}"));
    if !exact_path && (!path.is_file() || result_dir.join(&filename).is_file()) {
        create_real_directory(&result_dir)?;
        *path = result_dir.join(filename);
    }
    let parent = path.parent().ok_or("Result directory is missing")?;
    while let Some(row) = next.take() {
        let name: String = row.get(0).map_err(|error| error.to_string())?;
        let (directory, filename) = stored_path(&name).ok_or("Invalid result image name")?;
        let directory = parent.join(directory);
        create_real_directory(&directory)?;
        let bytes: Vec<u8> = row.get(1).map_err(|error| error.to_string())?;
        let target = directory.join(filename);
        if fs::symlink_metadata(&target).is_ok() {
            if !target.is_file() || target.canonicalize().ok().as_ref() != Some(&target) {
                return Err(format!("Result image must not use symlinks: {name}"));
            }
        } else {
            let mut staged =
                tempfile::NamedTempFile::new_in(&directory).map_err(|error| error.to_string())?;
            staged
                .write_all(&bytes)
                .map_err(|error| error.to_string())?;
            staged
                .persist_noclobber(&target)
                .map_err(|error| error.error.to_string())?;
        }
        next = rows.next().map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn create_real_directory(path: &Path) -> Result<()> {
    match fs::create_dir(path) {
        Ok(()) => Ok(()),
        Err(error)
            if error.kind() == std::io::ErrorKind::AlreadyExists
                && path.is_dir()
                && path.canonicalize().ok().as_deref() == Some(path) =>
        {
            Ok(())
        }
        Err(error) => Err(error.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plural_and_legacy_paths_with_the_same_name_round_trip_separately() {
        let root = tempfile::tempdir().unwrap();
        let data = root.path().join("data");
        let draft = root.path().join("draft.md");
        let markdown = "![New](./assets/figure.png)\n\n![Legacy](asset/figure.png)\n";
        fs::write(&draft, markdown).unwrap();
        let pictures = [(ASSETS_DIR, 2), (LEGACY_ASSET_DIR, 3)];
        for (directory, width) in pictures {
            let folder = root.path().join(directory);
            fs::create_dir(&folder).unwrap();
            image::RgbImage::new(width, 2).save(folder.join("figure.png")).unwrap();
        }

        let id = super::super::create(&data, "Test", "sample.md", "Source").unwrap();
        let claim = super::super::claim(&data, &id, None).unwrap();
        let version = super::super::submit_file(&data, &id, &claim.token, &draft).unwrap();
        let result =
            super::super::save_result(&data, &id, version, None, |path| Ok(path.to_path_buf())).unwrap();
        assert_eq!(fs::read_to_string(&result).unwrap(), markdown);
        for (directory, _) in pictures {
            let relative = format!("{directory}/figure.png");
            let bytes = fs::read(root.path().join(&relative)).unwrap();
            assert_eq!(
                image_url(&data, &id, version, &relative).unwrap(),
                Some(format!("data:image/png;base64,{}", STANDARD.encode(&bytes)))
            );
            assert_eq!(fs::read(result.parent().unwrap().join(relative)).unwrap(), bytes);
        }
    }

    #[test]
    fn retry_attaches_image_to_original_version_and_exports_portable_copy() {
        let root = tempfile::tempdir().unwrap();
        let data = root.path().join("data");
        let staging = root.path().join("submission");
        fs::create_dir_all(staging.join("asset")).unwrap();
        let draft = staging.join("draft.md");
        let image_path = staging.join("asset").join("figure.png");
        image::RgbImage::new(2, 3).save(&image_path).unwrap();
        let bytes = fs::read(&image_path).unwrap();
        let markdown = "# Draft\n\n![Figure](asset/figure.png)\n";
        fs::write(&draft, markdown).unwrap();
        let id = super::super::create(&data, "Test", "sample.md", "Source").unwrap();
        let claim = super::super::claim(&data, &id, None).unwrap();
        assert_eq!(
            super::super::submit(&data, &id, &claim.token, markdown).unwrap(),
            1
        );
        assert_eq!(
            super::super::submit_file(&data, &id, &claim.token, &draft).unwrap(),
            1
        );
        assert_eq!(
            image_url(&data, &id, 1, "./asset/figure.png").unwrap(),
            Some(format!("data:image/png;base64,{}", STANDARD.encode(&bytes)))
        );
        assert!(image_url(&data, &id, 2, "asset/figure.png")
            .unwrap()
            .is_none());
        assert!(image_url(&data, &id, 1, "asset/../figure.png").is_err());

        fs::remove_file(&image_path).unwrap();
        let revision = super::super::claim(&data, &id, Some("Revise".into())).unwrap();
        assert_eq!(
            super::super::submit_file(&data, &id, &revision.token, &draft).unwrap(),
            2
        );
        assert_eq!(
            image_url(&data, &id, 2, "asset/figure.png").unwrap(),
            Some(format!("data:image/png;base64,{}", STANDARD.encode(&bytes)))
        );
        fs::remove_dir_all(&staging).unwrap();
        let result =
            super::super::save_result(&data, &id, 1, None, |path| Ok(path.to_path_buf())).unwrap();
        assert_eq!(fs::read_to_string(&result).unwrap(), markdown);
        assert_eq!(
            fs::read(result.parent().unwrap().join("asset/figure.png")).unwrap(),
            bytes
        );
        assert_eq!(
            super::super::save_result(&data, &id, 1, None, |path| Ok(path.to_path_buf())).unwrap(),
            result
        );
    }
}
