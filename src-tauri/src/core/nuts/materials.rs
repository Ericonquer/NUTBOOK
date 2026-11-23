use std::{
    fs,
    io::{self, Read, Write},
    path::Path,
};

use rusqlite::{params, Connection, OptionalExtension};
use super::{board, read_markdown, Result};

const IMAGE_KINDS: &str = "('png', 'jpg', 'jpeg', 'gif', 'webp')";
const ROLES: [&str; 3] = ["extract_info", "illustration", "generation_reference"];

const MAX_BYTES: u64 = 100 * 1024 * 1024;
pub const FORMATS: &[&str] = &[
    "md", "markdown", "txt", "html", "htm", "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "png",
    "jpg", "jpeg", "gif", "webp",
];

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
        return board::add_card(
            data_dir,
            board_id,
            title,
            &read_markdown(path)?,
            "markdown",
            position,
            issue_id,
        );
    }
    let source = fs::File::open(path).map_err(|e| e.to_string())?;
    let metadata = source.metadata().map_err(|e| e.to_string())?;
    if !metadata.is_file() || metadata.len() == 0 || metadata.len() > MAX_BYTES {
        return Err("Choose a nonempty file up to 100 MiB".into());
    }
    let root = data_dir.join("nuts-materials");
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let root = root.canonicalize().map_err(|e| e.to_string())?;
    let mut staged = tempfile::Builder::new()
        .suffix(&format!(".{ext}"))
        .tempfile_in(root)
        .map_err(|e| e.to_string())?;
    let size = io::copy(&mut source.take(MAX_BYTES + 1), &mut staged).map_err(|e| e.to_string())?;
    if size == 0 || size > MAX_BYTES {
        return Err("Choose a nonempty file up to 100 MiB".into());
    }
    staged.flush().map_err(|e| e.to_string())?;
    staged.as_file().sync_all().map_err(|e| e.to_string())?;
    let (_, saved) = staged.keep().map_err(|e| e.to_string())?;
    let content = format!("Local attachment ({ext}): `{}`", saved.display());
    match board::add_card(
        data_dir, board_id, title, &content, &ext, position, issue_id,
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
