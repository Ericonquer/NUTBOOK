use std::{
    fs,
    io::{self, Read, Write},
    path::{Path, PathBuf},
};

use rusqlite::{params, Connection, OptionalExtension};
use super::{board, read_markdown, Result};

const IMAGE_KINDS: &str = "('png', 'jpg', 'jpeg', 'gif', 'webp')";
const ROLES: [&str; 3] = ["extract_info", "illustration", "generation_reference"];

const MAX_MIB: u64 = 100;
const MAX_BYTES: u64 = MAX_MIB * 1024 * 1024;
pub const FORMATS: &[&str] = &[
    "md", "markdown", "txt", "html", "htm", "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "png",
    "jpg", "jpeg", "gif", "webp",
];

pub fn system_path(data_dir: &Path, board_id: &str, card_id: &str, issue_id: Option<&str>) -> Result<PathBuf> {
    let (kind, attachment): (String, String) = super::open(data_dir)?
        .query_row(
            "SELECT c.kind, c.markdown FROM board_cards c
             LEFT JOIN nuts_card_boards b ON b.card_id = c.id
             WHERE c.id = ?1 AND c.kind IN ('pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx')
               AND COALESCE(b.board_id, 'default') = ?2 AND (?3 IS NULL OR c.issue_id = ?3)",
            params![card_id, board_id, issue_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or("Material is no longer available")?;
    let saved = Path::new(attachment_path(&kind, &attachment).ok_or("Attachment path is missing")?);
    let file_name = saved.file_name().ok_or("Invalid attachment path")?;
    let root = data_dir.join("nuts-materials");
    let path = root.join(file_name);
    let metadata = fs::symlink_metadata(&path).map_err(|_| "Attachment file is missing")?;
    let canonical_path = path.canonicalize().map_err(|_| "Attachment file is missing")?;
    if !metadata.is_file()
        || path.extension().and_then(|ext| ext.to_str()) != Some(kind.as_str())
        || !saved.is_absolute()
        || saved.canonicalize().ok().as_ref() != Some(&canonical_path)
    {
        return Err("Invalid attachment path".into());
    }
    Ok(path)
}

pub fn markdown_path(data_dir: &Path, board_id: &str, card_id: &str, issue_id: Option<&str>) -> Result<PathBuf> {
    let (body, source): (String, Option<String>) = super::open(data_dir)?
        .query_row(
            "SELECT c.markdown, s.path FROM board_cards c
             LEFT JOIN nuts_markdown_sources s ON s.card_id = c.id
             LEFT JOIN nuts_card_boards b ON b.card_id = c.id
             WHERE c.id = ?1 AND c.kind = 'markdown' AND COALESCE(b.board_id, 'default') = ?2
               AND (?3 IS NULL OR c.issue_id = ?3)",
            params![card_id, board_id, issue_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or("Markdown material is no longer available")?;
    if let Some(source) = source.map(PathBuf::from).filter(|path| path.is_file()) {
        return Ok(source);
    }

    let id = uuid::Uuid::parse_str(card_id).map_err(|error| error.to_string())?;
    let directory = data_dir.join("nuts-materials").join(id.to_string());
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let target = directory.join("material.md");
    if !target.is_file() {
        let mut staged = tempfile::NamedTempFile::new_in(directory).map_err(|error| error.to_string())?;
        staged.write_all(body.as_bytes()).map_err(|error| error.to_string())?;
        match staged.persist_noclobber(&target) {
            Ok(_) => {}
            Err(error) if error.error.kind() == io::ErrorKind::AlreadyExists && target.is_file() => {}
            Err(error) => return Err(error.to_string()),
        }
    }
    Ok(target)
}

pub fn import(data_dir: &Path, board_id: &str, path: &Path, x: i64, y: i64) -> Result<String> {
    import_material(data_dir, board_id, path, (x, y), None)
}

pub fn import_for_issue(
    data_dir: &Path,
    board_id: &str,
    issue_id: &str,
    path: &Path,
) -> Result<String> {
    import_material(data_dir, board_id, path, (0, 0), Some(issue_id))
}

fn import_material(
    data_dir: &Path,
    board_id: &str,
    path: &Path,
    position: (i64, i64),
    issue_id: Option<&str>,
) -> Result<String> {
    let ext = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(str::to_ascii_lowercase)
        .filter(|ext| FORMATS.contains(&ext.as_str()))
        .ok_or("Unsupported material format")?;
    let title = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("Invalid file name")?;
    if matches!(ext.as_str(), "md" | "markdown") {
        let absolute_path = std::path::absolute(path).map_err(|error| error.to_string())?;
        return board::add_card(
            data_dir,
            board_id,
            title,
            &read_markdown(path)?,
            "markdown",
            position,
            issue_id,
            absolute_path.to_str(),
        );
    }
    let source = fs::File::open(path).map_err(|e| e.to_string())?;
    let metadata = source.metadata().map_err(|e| e.to_string())?;
    if !metadata.is_file() || metadata.len() == 0 {
        return Err("Choose a nonempty file".into());
    }
    if metadata.len() > MAX_BYTES {
        return Err(format!("File exceeds the {MAX_MIB} MiB limit"));
    }
    let root = data_dir.join("nuts-materials");
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let root = root.canonicalize().map_err(|e| e.to_string())?;
    let mut staged = tempfile::Builder::new()
        .suffix(&format!(".{ext}"))
        .tempfile_in(root)
        .map_err(|e| e.to_string())?;
    let size = io::copy(&mut source.take(MAX_BYTES + 1), &mut staged).map_err(|e| e.to_string())?;
    if size == 0 {
        return Err("Choose a nonempty file".into());
    }
    if size > MAX_BYTES {
        return Err(format!("File exceeds the {MAX_MIB} MiB limit"));
    }
    staged.flush().map_err(|e| e.to_string())?;
    staged.as_file().sync_all().map_err(|e| e.to_string())?;
    let (_, saved) = staged.keep().map_err(|e| e.to_string())?;
    let content = format!("Local attachment ({ext}): `{}`", saved.display());
    match board::add_card(
        data_dir, board_id, title, &content, &ext, position, issue_id, None,
    ) {
        Ok(id) => Ok(id),
        Err(error) => {
            let _ = fs::remove_file(saved);
            Err(error)
        }
    }
}

#[derive(serde::Serialize)]
pub struct IssueImage {
    pub id: String,
    title: String,
    path: String,
    roles: Vec<&'static str>,
    note: String,
}

pub fn issue_images(db: &Connection, issue_id: &str) -> Result<Vec<IssueImage>> {
    let mut query = db.prepare(&format!(
        "SELECT c.id, c.title, c.kind, c.markdown, COALESCE(u.roles, 0), COALESCE(u.note, '')
         FROM board_cards c LEFT JOIN nuts_image_usage u ON u.card_id = c.id
         WHERE c.issue_id = ?1 AND c.kind IN {IMAGE_KINDS} ORDER BY c.rowid"
    )).map_err(|e| e.to_string())?;
    let rows = query.query_map([issue_id], |row| {
        let kind: String = row.get(2)?;
        let attachment: String = row.get(3)?;
        let roles: i64 = row.get(4)?;
        let Some(path) = attachment_path(&kind, &attachment) else {
            return Ok(None);
        };
        Ok(Some(IssueImage {
            id: row.get(0)?,
            title: row.get(1)?,
            path: path.to_owned(),
            roles: ROLES.into_iter().enumerate().filter_map(|(i, role)|
                (roles & (1 << i) != 0).then_some(role)).collect(),
            note: row.get(5)?,
        }))
    }).map_err(|e| e.to_string())?;
    rows.filter_map(|row| row.transpose()).collect::<rusqlite::Result<_>>().map_err(|e| e.to_string())
}

pub fn image_usage(data_dir: &Path, card_id: &str, board_id: &str, issue_id: Option<&str>,
    update: Option<(u8, String)>, scale: Option<u16>) -> Result<(u8, String, u16)> {
    let mut db = super::open(data_dir)?;
    let tx = db.transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
        .map_err(|e| e.to_string())?;
    let (current_roles, current_note, current_scale) = tx.query_row(&format!(
        "SELECT COALESCE(u.roles, 0), COALESCE(u.note, ''), COALESCE(s.percent, 100) FROM board_cards c
         LEFT JOIN nuts_image_usage u ON c.id = u.card_id
         LEFT JOIN nuts_image_scales s ON c.id = s.card_id
         WHERE c.id = ?1 AND c.issue_id IS ?3 AND c.kind IN {IMAGE_KINDS}
         AND COALESCE((SELECT board_id FROM nuts_card_boards WHERE card_id = c.id), 'default') = ?2"
    ), params![card_id, board_id, issue_id], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .map_err(|e| e.to_string())?;
    let value = if let Some((roles, note)) = update {
        if roles > 7 || note.chars().count() > 1000 || note.contains('\0') {
            return Err("Invalid image usage".into());
        }
        tx.execute("INSERT INTO nuts_image_usage VALUES (?1, ?2, ?3)
            ON CONFLICT(card_id) DO UPDATE SET roles = excluded.roles, note = excluded.note",
            params![card_id, roles, note]).map_err(|e| e.to_string())?;
        (roles, note)
    } else { (current_roles, current_note) };
    if let Some(percent) = scale {
        tx.execute("INSERT INTO nuts_image_scales VALUES (?1, ?2)
            ON CONFLICT(card_id) DO UPDATE SET percent = excluded.percent",
            params![card_id, percent]).map_err(|e| e.to_string())?;
    }
    tx.commit().map_err(|e| e.to_string())?;
    Ok((value.0, value.1, scale.unwrap_or(current_scale)))
}

fn attachment_path<'a>(kind: &str, attachment: &'a str) -> Option<&'a str> {
    attachment.strip_prefix(&format!("Local attachment ({kind}): `"))?.strip_suffix('`')
}

pub fn paste_image(data_dir: &Path, board_id: &str, data: &str, x: i64, y: i64) -> Result<String> {
    let data = if data.starts_with("data:") { data.to_owned() }
        else { crate::core::image_import::fetch_raster(data)? };
    let bytes = crate::core::image_import::decode_raster_data(&data)?;
    let ext = match image::guess_format(&bytes).map_err(|e| e.to_string())? {
        image::ImageFormat::Png => "png",
        image::ImageFormat::Jpeg => "jpg",
        image::ImageFormat::Gif => "gif",
        image::ImageFormat::WebP => "webp",
        _ => return Err("Unsupported image format".into()),
    };
    let temp = tempfile::tempdir().map_err(|e| e.to_string())?;
    let path = temp.path().join(format!("Image.{ext}"));
    fs::write(&path, bytes).map_err(|e| e.to_string())?;
    import(data_dir, board_id, &path, x, y)
}

pub fn image_thumbnail(data_dir: &Path, card_id: &str) -> Result<String> {
    use base64::{engine::general_purpose::STANDARD, Engine};

    let db = super::open(data_dir)?;
    let attachment: Option<(String, String)> = db.query_row(
        "SELECT kind, markdown FROM board_cards
         WHERE id = ?1 AND kind IN ('png', 'jpg', 'jpeg', 'gif', 'webp')",
        [card_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    ).optional().map_err(|error| error.to_string())?;
    drop(db);
    let (kind, attachment) = attachment.ok_or("Image card not found")?;
    let path = attachment_path(&kind, &attachment).ok_or("Image attachment path is missing")?;
    let root = data_dir.join("nuts-materials").canonicalize().map_err(|error| error.to_string())?;
    let path = Path::new(path).canonicalize().map_err(|error| error.to_string())?;
    if path.parent() != Some(root.as_path()) {
        return Err("Image is outside the attachment storage".into());
    }
    let file = fs::File::open(path).map_err(|error| error.to_string())?;
    let metadata = file.metadata().map_err(|error| error.to_string())?;
    if !metadata.is_file() || metadata.len() > MAX_BYTES {
        return Err("Unsupported image file size".into());
    }
    let format = match kind.as_str() {
        "png" => image::ImageFormat::Png,
        "gif" => image::ImageFormat::Gif,
        "webp" => image::ImageFormat::WebP,
        _ => image::ImageFormat::Jpeg,
    };
    let mut reader = image::ImageReader::with_format(io::BufReader::new(file), format);
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(16384);
    limits.max_image_height = Some(16384);
    limits.max_alloc = Some(128 * 1024 * 1024);
    reader.limits(limits);
    let decoded = reader.decode().map_err(|error| error.to_string())?;
    let thumbnail = if decoded.width() > 880 || decoded.height() > 960 {
        decoded.thumbnail(880, 960)
    } else {
        decoded
    };
    let mut encoded = io::Cursor::new(Vec::new());
    thumbnail.write_to(&mut encoded, image::ImageFormat::Png)
        .map_err(|error| error.to_string())?;
    Ok(format!("data:image/png;base64,{}", STANDARD.encode(encoded.into_inner())))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_system_openable_copies_only_for_their_board_and_issue() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        let note = board::add(dir, "default", "Note", "Note", "note", 0, 0).unwrap();
        let issue = board::create_issue(dir, "default", "Issue", &[note], None, "").unwrap();
        for ext in ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"] {
            let original = dir.join(format!("议题附件.{ext}"));
            fs::write(&original, ext).unwrap();
            let card = import_for_issue(dir, "default", &issue, &original).unwrap();
            fs::remove_file(original).unwrap();
            let path = system_path(dir, "default", &card, Some(&issue)).unwrap();
            assert_eq!(fs::read_to_string(&path).unwrap(), ext);
            assert_eq!(system_path(dir, "default", &card, None).unwrap(), path);
            assert!(system_path(dir, "wrong-board", &card, None).is_err());
            assert!(system_path(dir, "default", &card, Some("wrong-issue")).is_err());
            fs::remove_file(path).unwrap();
            assert!(system_path(dir, "default", &card, None).is_err());
        }
        let outside = dir.join("outside.docx");
        fs::write(&outside, b"not imported").unwrap();
        let body = format!("Local attachment (docx): `{}`", outside.display());
        let card = board::add(dir, "default", "Outside", &body, "docx", 0, 0).unwrap();
        assert!(system_path(dir, "default", &card, None).is_err());
    }

    #[test]
    fn rejects_oversized_pdf_without_creating_an_attachment_or_card() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        let original = dir.join("large.pdf");
        fs::File::create(&original).unwrap().set_len(MAX_BYTES + 1).unwrap();
        let error = import(dir, "default", &original, 0, 0).unwrap_err();
        assert_eq!(error, "File exceeds the 100 MiB limit");
        assert!(board::list(dir, "default").unwrap().is_empty());
        assert!(!dir.join("nuts-materials").exists());
    }

    #[test]
    fn pasted_image_usage_follows_the_card_into_the_next_claim() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        let mut original = io::Cursor::new(Vec::new());
        image::DynamicImage::new_rgb8(10, 10)
            .write_to(&mut original, image::ImageFormat::Png).unwrap();
        let data = crate::core::image_import::raster_data(original.get_ref()).unwrap();
        let card = paste_image(dir, "default", &data, 0, 0).unwrap();
        assert_eq!(image_usage(dir, &card, "default", None, None, None).unwrap(), (0, String::new(), 100));
        image_usage(dir, &card, "default", None, Some((5, "保留构图".into())), Some(60)).unwrap();
        let issue = board::create_issue(dir, "default", "Issue", &[card.clone()], None, "").unwrap();
        assert!(image_usage(dir, &card, "default", None, Some((0, String::new())), None).is_err());
        image_usage(dir, &card, "default", Some(&issue), Some((7, "保留构图".into())), None).unwrap();
        assert_eq!(image_usage(dir, &card, "default", Some(&issue), None, None).unwrap().2, 60);
        assert!(image_usage(dir, &card, "default", Some(&issue), None, Some(151)).is_err());
        let cards = serde_json::to_value(board::list(dir, "default").unwrap()).unwrap();
        assert_eq!(cards[0]["image_scale"], 60);
        board::open_issue(dir, &issue).unwrap();

        let claim = super::super::claim(dir, &issue, None).unwrap();
        let json = serde_json::to_value(claim).unwrap();
        let image = &json["images"][0];
        assert_eq!(image["roles"], serde_json::json!(ROLES));
        assert_eq!(image["note"], "保留构图");
        assert_eq!(fs::read(image["path"].as_str().unwrap()).unwrap(), original.into_inner());
    }

    #[test]
    fn thumbnail_uses_the_saved_attachment_and_preserves_aspect_ratio() {
        use base64::{engine::general_purpose::STANDARD, Engine};

        let temp = tempfile::tempdir().unwrap();
        let original = temp.path().join("原图.png");
        image::RgbImage::from_pixel(1800, 900, image::Rgb([20, 80, 160]))
            .save(&original).unwrap();
        let card = import(temp.path(), "default", &original, 0, 0).unwrap();
        fs::remove_file(&original).unwrap();

        let url = image_thumbnail(temp.path(), &card).unwrap();
        let bytes = STANDARD.decode(url.strip_prefix("data:image/png;base64,").unwrap()).unwrap();
        let thumbnail = image::load_from_memory(&bytes).unwrap();
        assert_eq!((thumbnail.width(), thumbnail.height()), (880, 440));
    }

    #[test]
    fn opens_full_markdown_from_the_board_and_its_issue_after_source_removal() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        let source = dir.join("观察记录.md");
        let body = format!("# Observations\n\n{}\n\nLast paragraph.", "Evidence. ".repeat(80));
        fs::write(&source, &body).unwrap();
        let card = import(dir, "default", &source, 0, 0).unwrap();
        let issue = board::create_issue(dir, "default", "Research", &[card.clone()], None, "").unwrap();
        let issue_card = import_for_issue(dir, "default", &issue, &source).unwrap();
        assert_eq!(markdown_path(dir, "default", &card, None).unwrap(), source);
        assert_eq!(markdown_path(dir, "default", &issue_card, Some(&issue)).unwrap(), source);
        fs::remove_file(source).unwrap();

        assert_eq!(fs::read_to_string(markdown_path(dir, "default", &card, None).unwrap()).unwrap(), body);
        assert_eq!(fs::read_to_string(markdown_path(dir, "default", &card, Some(&issue)).unwrap()).unwrap(), body);
        assert_eq!(fs::read_to_string(markdown_path(dir, "default", &issue_card, Some(&issue)).unwrap()).unwrap(), body);
        assert!(markdown_path(dir, "wrong-board", &card, None).is_err());
        assert!(markdown_path(dir, "default", &card, Some("wrong-issue")).is_err());
    }

    #[test]
    fn issue_import_attaches_a_file_without_creating_an_inbox_card() {
        let temp = tempfile::tempdir().unwrap();
        let dir = temp.path();
        let original = dir.join("reference.pdf");
        fs::write(&original, b"%PDF-1.7").unwrap();
        assert!(import_for_issue(dir, "default", "missing", &original).is_err());
        assert!(board::list(dir, "default").unwrap().is_empty());
        assert_eq!(fs::read_dir(dir.join("nuts-materials")).unwrap().count(), 0);

        let note = board::add(dir, "default", "Note", "Note", "note", 0, 0).unwrap();
        let issue = board::create_issue(dir, "default", "Issue", &[note], None, "").unwrap();
        import_for_issue(dir, "default", &issue, &original).unwrap();
        fs::remove_file(original).unwrap();
        board::open_issue(dir, &issue).unwrap();
        let claim = crate::core::nuts::claim(dir, &issue, None).unwrap();
        let serialized = serde_json::to_value(claim).unwrap();
        let source = serialized["source"].as_str().unwrap();
        assert!(source.contains("reference.pdf"));
        assert_eq!(
            fs::read(source.split('`').nth(1).unwrap()).unwrap(),
            b"%PDF-1.7"
        );
    }

    #[test]
    fn imported_file_remains_readable_after_source_is_removed() {
        let temp = tempfile::tempdir().unwrap();
        let html: &[u8] =
            include_bytes!("../../../../tests/fixtures/document-save-versions/ordinary.html");
        for (name, contents) in [("观察.html", html), ("会议记录.TXT", "第一条观察\r\n".as_bytes())] {
            let original = temp.path().join(name);
            fs::write(&original, contents).unwrap();
            let id = import(temp.path(), "default", &original, -450, 2100).unwrap();
            fs::remove_file(original).unwrap();
            let issue =
                board::create_issue(temp.path(), "default", "阅读记录", &[id], None, "").unwrap();
            board::open_issue(temp.path(), &issue).unwrap();
            let claim = crate::core::nuts::claim(temp.path(), &issue, None).unwrap();
            let serialized = serde_json::to_value(claim).unwrap();
            let source = serialized["source"].as_str().unwrap();
            let path = source.split('`').nth(1).unwrap();
            assert_eq!(fs::read(path).unwrap(), contents);
            assert!(source.contains(name));
        }
    }
}
