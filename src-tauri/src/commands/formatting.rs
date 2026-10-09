//! Isolated formatting drafts. The source document is never a write target.
use crate::{
    core::{
        document::content_hash, markdown_cover::parse_cover_metadata,
        markdown_render::render_markdown_html,
    },
    db::repositories::ItemRepository,
    errors::AppError,
    state::AppState,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use std::{
    fs,
    io::{Read, Write},
    path::Path,
    sync::Mutex,
};
static DRAFT_LOCK: Mutex<()> = Mutex::new(());
const MAX_DRAFT: usize = 32 * 1024 * 1024;
fn draft_path(state: &AppState, item_id: i64) -> Result<std::path::PathBuf, AppError> {
    let item = state.get_item_detail(item_id)?;
    if item.summary.file_type != "markdown" {
        return Err(AppError::UnsupportedFileType);
    }
    // Path identity, never title/content deduplication. Moves are not guessed.
    let path = fs::canonicalize(&item.summary.file_path).map_err(|_| AppError::IoError)?;
    Ok(state
        .app_data_dir
        .join("formatting-drafts")
        .join(format!("{}.json", content_hash(&path.to_string_lossy()))))
}
#[tauri::command]
pub fn load_formatting_draft(
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    item_id: i64,
) -> Result<Value, AppError> {
    if webview.label() != "main" {
        return Err(AppError::InvalidParams);
    }
    let _lock = DRAFT_LOCK.lock().map_err(|_| AppError::IoError)?;
    let path = draft_path(&state, item_id)?;
    let item = state.get_item_detail(item_id)?;
    let source = fs::read_to_string(&item.summary.file_path).map_err(|_| AppError::IoError)?;
    if !path.exists() {
        return Ok(json!({"draft": null, "revision": null, "source": source}));
    }
    let raw = fs::read_to_string(path).map_err(|_| AppError::IoError)?;
    Ok(
        json!({"draft": serde_json::from_str::<Value>(&raw).map_err(|_| AppError::InvalidParams)?, "revision": content_hash(&raw), "source": source}),
    )
}
#[tauri::command]
pub fn save_formatting_draft(
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    item_id: i64,
    expected_revision: Option<String>,
    draft: Value,
) -> Result<String, AppError> {
    if webview.label() != "main" {
        return Err(AppError::InvalidParams);
    }
    let _lock = DRAFT_LOCK.lock().map_err(|_| AppError::IoError)?;
    let path = draft_path(&state, item_id)?;
    save_draft_at(&path, expected_revision, draft)
}
fn save_draft_at(
    path: &Path,
    expected_revision: Option<String>,
    draft: Value,
) -> Result<String, AppError> {
    let current = if path.exists() {
        Some(content_hash(
            &fs::read_to_string(&path).map_err(|_| AppError::IoError)?,
        ))
    } else {
        None
    };
    if current != expected_revision {
        return Err(AppError::EditConflict);
    }
    if draft["version"] != 1 || !draft["markdown"].is_string() || !draft["source"].is_string() {
        return Err(AppError::InvalidParams);
    }
    let raw = serde_json::to_string(&draft).map_err(|_| AppError::InvalidParams)?;
    if raw.len() > MAX_DRAFT {
        return Err(AppError::InvalidParams);
    }
    fs::create_dir_all(path.parent().ok_or(AppError::IoError)?).map_err(|_| AppError::IoError)?;
    let temp = path.with_extension(format!("{}.tmp", uuid::Uuid::new_v4()));
    let result = (|| {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)
            .map_err(|_| AppError::IoError)?;
        file.write_all(raw.as_bytes())
            .map_err(|_| AppError::IoError)?;
        file.sync_all().map_err(|_| AppError::IoError)?;
        fs::rename(&temp, &path).map_err(|_| AppError::IoError)?;
        Ok(content_hash(&raw))
    })();
    if result.is_err() {
        let _ = fs::remove_file(temp);
    }
    result
}
#[tauri::command]
pub fn render_formatting_markdown(markdown: String) -> Result<String, AppError> {
    if markdown.len() > MAX_DRAFT {
        return Err(AppError::InvalidParams);
    }
    // Cover identity is source metadata, not published text. Use the shared AST
    // parser so examples in code, lists and prose retain their literal content.
    let cover = parse_cover_metadata(&markdown, None);
    let published = if let Some(cover) = cover.cover {
        markdown
            .split_inclusive('\n')
            .enumerate()
            .filter_map(|(index, line)| (index + 1 != cover.line).then_some(line))
            .collect::<String>()
    } else {
        markdown
    };
    Ok(ammonia::Builder::default()
        .url_schemes(["http", "https", "data"].into_iter().collect())
        .clean(&render_markdown_html(&published))
        .to_string())
}
/// Only relative raster images inside the source's canonical parent are admitted.
/// No network fetch, absolute-path read, SVG, or directory-wide capability grant.
#[tauri::command]
pub fn read_formatting_image(
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    item_id: i64,
    src: String,
) -> Result<String, AppError> {
    if webview.label() != "main" {
        return Err(AppError::InvalidParams);
    }
    let item = state.get_item_detail(item_id)?;
    if item.summary.file_type != "markdown" {
        return Err(AppError::UnsupportedFileType);
    }
    let source = fs::canonicalize(&item.summary.file_path).map_err(|_| AppError::IoError)?;
    read_local_image(&source, &src)
}
fn read_local_image(source: &Path, src: &str) -> Result<String, AppError> {
    let source = fs::canonicalize(source).map_err(|_| AppError::IoError)?;
    let parent = source.parent().ok_or(AppError::InvalidParams)?;
    let decoded =
        crate::core::scoped_content_server::percent_decode(src).ok_or(AppError::InvalidParams)?;
    let src = decoded.as_str();
    let relative = Path::new(src);
    if relative.is_absolute() || src.contains(':') {
        return Err(AppError::InvalidParams);
    }
    let path = fs::canonicalize(parent.join(relative)).map_err(|_| AppError::IoError)?;
    if !path.starts_with(parent) {
        return Err(AppError::InvalidParams);
    }
    let mut bytes = Vec::new();
    fs::File::open(&path)
        .map_err(|_| AppError::IoError)?
        .take(10 * 1024 * 1024 + 1)
        .read_to_end(&mut bytes)
        .map_err(|_| AppError::IoError)?;
    if bytes.len() > 10 * 1024 * 1024 {
        return Err(AppError::InvalidParams);
    }
    let format = image::guess_format(&bytes).map_err(|_| AppError::InvalidParams)?;
    let mime = match format {
        image::ImageFormat::Png => "image/png",
        image::ImageFormat::Jpeg => "image/jpeg",
        image::ImageFormat::WebP => "image/webp",
        _ => return Err(AppError::InvalidParams),
    };
    let mut reader = image::ImageReader::with_format(std::io::Cursor::new(&bytes), format);
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(8192);
    limits.max_image_height = Some(8192);
    limits.max_alloc = Some(128 * 1024 * 1024);
    reader.limits(limits);
    reader.decode().map_err(|_| AppError::InvalidParams)?;
    Ok(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
}

static IMAGE_REQUESTS: std::sync::LazyLock<
    Mutex<std::collections::HashMap<String, std::sync::Arc<std::sync::atomic::AtomicBool>>>,
> = std::sync::LazyLock::new(|| Mutex::new(std::collections::HashMap::new()));
#[tauri::command]
pub async fn fetch_formatting_image(
    webview: tauri::Webview,
    src: String,
    request_id: String,
) -> Result<String, String> {
    if webview.label() != "main" || request_id.len() > 100 {
        return Err("Invalid caller".into());
    }
    let cancelled = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    {
        let mut requests = IMAGE_REQUESTS.lock().map_err(|_| "Image task failed")?;
        if requests.len() >= 8 || requests.contains_key(&request_id) {
            return Err("图片任务繁忙 / Image tasks busy".into());
        }
        requests.insert(request_id.clone(), cancelled.clone());
    }
    let result = tauri::async_runtime::spawn_blocking(move || {
        crate::core::image_import::fetch_raster_cancelable(&src, &cancelled)
    })
    .await
    .map_err(|_| "Image task failed".to_string());
    if let Ok(mut requests) = IMAGE_REQUESTS.lock() {
        requests.remove(&request_id);
    }
    result?
}
#[tauri::command]
pub fn cancel_formatting_image(webview: tauri::Webview, request_id: String) -> bool {
    if webview.label() != "main" {
        return false;
    }
    if let Ok(requests) = IMAGE_REQUESTS.lock() {
        if let Some(cancelled) = requests.get(&request_id) {
            cancelled.store(true, std::sync::atomic::Ordering::Relaxed);
            return true;
        }
    }
    false
}
#[tauri::command]
pub fn validate_formatting_image_data(webview: tauri::Webview, data: String) -> Result<(), String> {
    if webview.label() != "main" {
        return Err("Invalid caller".into());
    }
    crate::core::image_import::decode_raster_data(&data).map(|_| ())
}
#[tauri::command]
pub fn paste_markdown_image_asset(
    webview: tauri::Webview,
    state: tauri::State<'_, AppState>,
    item_id: i64,
    data: String,
) -> Result<crate::models::CopyMarkdownImageAssetResponse, String> {
    if webview.label() != "main" {
        return Err("Invalid caller".into());
    }
    let item = state.get_item_detail(item_id).map_err(|e| e.to_string())?;
    if item.summary.file_type != "markdown" {
        return Err("Invalid file type".into());
    }
    crate::core::image_import::write_pasted_image(Path::new(&item.summary.file_path), &data)
}

/// A standalone raster clipboard item, not an HTML image placeholder.
#[tauri::command]
pub fn write_formatting_image_clipboard(
    webview: tauri::Webview,
    data: String,
) -> Result<Value, String> {
    if webview.label() != "main" {
        return Err("Invalid caller".into());
    }
    let bytes = crate::core::image_import::decode_raster_data(&data)?;
    #[cfg(target_os = "macos")]
    {
        let raster = image::load_from_memory(&bytes).map_err(|e| e.to_string())?;
        let mut output = std::io::Cursor::new(Vec::new());
        raster
            .write_to(&mut output, image::ImageFormat::Png)
            .map_err(|e| e.to_string())?;
        write_native_image_clipboard(
            &objc2_app_kit::NSPasteboard::generalPasteboard(),
            output.get_ref(),
        )?;
        Ok(json!({"verified":true}))
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = bytes;
        Err("Native image clipboard is unavailable".into())
    }
}
#[cfg(target_os = "macos")]
fn write_native_image_clipboard(
    board: &objc2_app_kit::NSPasteboard,
    bytes: &[u8],
) -> Result<(), String> {
    use objc2_app_kit::NSPasteboardTypePNG;
    use objc2_foundation::{NSArray, NSData};
    unsafe {
        board.declareTypes_owner(&NSArray::from_slice(&[NSPasteboardTypePNG]), None);
        if !board.setData_forType(Some(&NSData::with_bytes(bytes)), NSPasteboardTypePNG) {
            return Err("Image clipboard write failed".into());
        }
        if board
            .dataForType(NSPasteboardTypePNG)
            .map(|data| data.to_vec())
            .as_deref()
            != Some(bytes)
        {
            return Err("Image clipboard verification failed".into());
        }
    }
    Ok(())
}

/// Write the exact publishing payload, avoiding WebKit's HTML clipboard rewrite.
/// Readback verifies transport only; it never implies platform acceptance.
#[tauri::command]
pub fn write_formatting_clipboard(
    webview: tauri::Webview,
    html: String,
    plain: String,
) -> Result<Value, AppError> {
    if webview.label() != "main" || html.len() > MAX_DRAFT || plain.len() > MAX_DRAFT {
        return Err(AppError::InvalidParams);
    }
    #[cfg(target_os = "macos")]
    {
        let board = objc2_app_kit::NSPasteboard::generalPasteboard();
        write_native_rich_clipboard(&board, &html, &plain)?;
        Ok(
            json!({"verified": true, "htmlBytes": html.len(), "imageCount": html.matches("<img ").count()}),
        )
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err(AppError::UnsupportedFileType)
    }
}
#[cfg(target_os = "macos")]
fn write_native_rich_clipboard(
    board: &objc2_app_kit::NSPasteboard,
    html: &str,
    plain: &str,
) -> Result<(), AppError> {
    use objc2_app_kit::{NSPasteboardTypeHTML, NSPasteboardTypeString};
    use objc2_foundation::{NSArray, NSString};
    // The Cocoa constants are immutable system pasteboard types. No owner or
    // deferred provider is installed: both formats are written synchronously.
    unsafe {
        let types = NSArray::from_slice(&[NSPasteboardTypeHTML, NSPasteboardTypeString]);
        board.declareTypes_owner(&types, None);
        if !board.setString_forType(&NSString::from_str(html), NSPasteboardTypeHTML)
            || !board.setString_forType(&NSString::from_str(plain), NSPasteboardTypeString)
        {
            return Err(AppError::IoError);
        }
        if board
            .stringForType(NSPasteboardTypeHTML)
            .map(|s| s.to_string())
            .as_deref()
            != Some(html)
            || board
                .stringForType(NSPasteboardTypeString)
                .map(|s| s.to_string())
                .as_deref()
                != Some(plain)
        {
            return Err(AppError::IoError);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn test_png_bytes() -> Vec<u8> {
        let image = image::DynamicImage::ImageRgb8(image::RgbImage::from_pixel(
            2,
            2,
            image::Rgb([120, 160, 200]),
        ));
        let mut output = std::io::Cursor::new(Vec::new());
        image
            .write_to(&mut output, image::ImageFormat::Png)
            .unwrap();
        output.into_inner()
    }
    #[cfg(target_os = "macos")]
    #[test]
    #[ignore = "requires native pasteboard access; run outside the sandbox"]
    fn native_rich_clipboard_preserves_inline_images_and_pixel_line_height() {
        // Use a unique named board, never alter the user's general clipboard.
        let board = objc2_app_kit::NSPasteboard::pasteboardWithUniqueName();
        let png = STANDARD.encode(test_png_bytes());
        let html = format!(
            r#"<section style="font-size:16px;line-height:28.8px"><p>中文</p><img src="data:image/png;base64,{png}"></section>"#
        );
        write_native_rich_clipboard(&board, &html, "中文").unwrap();
    }
    #[cfg(target_os = "macos")]
    #[test]
    #[ignore = "requires native pasteboard access; run outside the sandbox"]
    fn native_image_clipboard_is_standalone_png() {
        let board = objc2_app_kit::NSPasteboard::pasteboardWithUniqueName();
        let bytes = test_png_bytes();
        write_native_rich_clipboard(&board, "<p>old</p>", "old").unwrap();
        write_native_image_clipboard(&board, &bytes).unwrap();
        unsafe {
            assert!(board
                .stringForType(objc2_app_kit::NSPasteboardTypeHTML)
                .is_none());
            assert!(board
                .stringForType(objc2_app_kit::NSPasteboardTypeString)
                .is_none());
            let data = board
                .dataForType(objc2_app_kit::NSPasteboardTypePNG)
                .unwrap()
                .to_vec();
            assert_eq!(image::load_from_memory(&data).unwrap().width(), 2);
            board.clearContents();
        }
    }
    #[test]
    fn draft_compare_and_swap_preserves_last_complete_file() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("draft.json");
        let a = json!({"version":1,"source":"original","markdown":"draft A","assets":{}});
        let revision = save_draft_at(&path, None, a.clone()).unwrap();
        assert!(matches!(
            save_draft_at(&path, None, a.clone()),
            Err(AppError::EditConflict)
        ));
        let b = json!({"version":1,"source":"original","markdown":"draft B","assets":{}});
        save_draft_at(&path, Some(revision.clone()), b.clone()).unwrap();
        assert!(matches!(
            save_draft_at(&path, Some(revision), a),
            Err(AppError::EditConflict)
        ));
        assert_eq!(
            serde_json::from_str::<Value>(&fs::read_to_string(&path).unwrap()).unwrap(),
            b
        );
        assert_eq!(fs::read_dir(dir.path()).unwrap().count(), 1);
    }
    #[test]
    fn publishing_hides_cover_metadata_but_preserves_image_and_examples() {
        for image in [
            "![cover](cover.png)",
            "[![cover](cover.png)](https://example.com)",
        ] {
            for newline in ["\n", "\r\n"] {
                let source = format!(
                    "# Title{newline}{newline}<!-- nutbook-cover -->{newline}{image}{newline}"
                );
                let html = render_formatting_markdown(source).unwrap();
                assert!(!html.contains("nutbook-cover"), "{html}");
                assert!(html.contains("src=\"cover.png\""), "{html}");
            }
        }
        for source in [
            "```md\n<!-- nutbook-cover -->\n![cover](cover.png)\n```",
            "    <!-- nutbook-cover -->\n    ![cover](cover.png)",
            "Example: `<!-- nutbook-cover -->`",
            "<!-- nutbook-cover -->\n\nordinary paragraph\n\n![cover](cover.png)",
        ] {
            assert!(render_formatting_markdown(source.into())
                .unwrap()
                .contains("nutbook-cover"));
        }
    }
    #[test]
    fn static_output_escapes_scripts_and_rejects_dangerous_links() {
        let html = render_formatting_markdown(
            "# 中文\n\n**bold**\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))".into(),
        )
        .unwrap();
        assert!(html.contains("<h1>中文</h1>"));
        assert!(html.contains("<strong>bold</strong>"));
        assert!(!html.contains("<script>"));
        assert!(!html.contains("href=\"javascript:"));
    }
    #[test]
    fn raster_images_are_decoded_and_canonical_parent_is_enforced() {
        let dir = tempfile::tempdir().unwrap();
        let inside = dir.path().join("inside");
        fs::create_dir(&inside).unwrap();
        let source = inside.join("source.md");
        fs::write(&source, "hello").unwrap();
        let bytes = test_png_bytes();
        fs::write(inside.join("中文 image.png"), &bytes).unwrap();
        fs::write(dir.path().join("outside.png"), &bytes).unwrap();
        assert!(read_local_image(&source, "中文 image.png")
            .unwrap()
            .starts_with("data:image/png;base64,"));
        assert!(read_local_image(&source, "../outside.png").is_err());
        assert!(read_local_image(&source, "http://127.0.0.1/a.png").is_err());
        fs::write(inside.join("fake.png"), "not an image").unwrap();
        assert!(read_local_image(&source, "fake.png").is_err());
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(dir.path().join("outside.png"), inside.join("escape.png"))
                .unwrap();
            assert!(read_local_image(&source, "escape.png").is_err());
        }
    }
}
