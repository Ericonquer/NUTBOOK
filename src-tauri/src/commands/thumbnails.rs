use crate::{
    core::thumbnail::thumbnail_backend_status,
    db::repositories::ThumbnailRepository,
    errors::AppError,
    models::{GenerateThumbnailResponse, ThumbnailBackendStatusPayload, ThumbnailInfo},
    state::AppState,
};

#[tauri::command]
pub async fn generate_thumbnail(
    state: tauri::State<'_, AppState>,
    item_id: i64,
) -> Result<GenerateThumbnailResponse, AppError> {
    let database = state.database.clone();
    tauri::async_runtime::spawn_blocking(move || database.generate_thumbnail(item_id))
        .await
        .map_err(|_| AppError::InternalError)?
}

#[tauri::command]
pub fn get_thumbnail_backend_status(
    state: tauri::State<'_, AppState>,
) -> Result<ThumbnailBackendStatusPayload, AppError> {
    let status = thumbnail_backend_status();
    Ok(ThumbnailBackendStatusPayload {
        screenshot_available: status.screenshot_available,
        chromium_path: status
            .chromium_path
            .map(|path| path.to_string_lossy().to_string()),
        system_chrome_available: status.system_chrome_available,
        system_chrome_path: status
            .system_chrome_path
            .map(|path| path.to_string_lossy().to_string()),
        system_chrome_enabled: state.system_chrome_thumbnails_enabled(),
        fallback_backend: status.fallback_backend.to_string(),
    })
}

#[tauri::command]
pub fn set_system_chrome_thumbnail_enabled(
    state: tauri::State<'_, AppState>,
    enabled: bool,
) -> Result<ThumbnailBackendStatusPayload, AppError> {
    state.set_system_chrome_thumbnails_enabled(enabled)?;
    get_thumbnail_backend_status(state)
}

#[allow(dead_code)]
fn _retain_thumbnail_info(_thumbnail: ThumbnailInfo) {}

#[cfg(test)]
mod tests {
    use crate::{
        db::repositories::{ItemRepository, LibraryRepository, ThumbnailRepository},
        db::Database,
        models::{IndexedItemRecord, Library, ListItemsQuery},
    };

    fn temp_db_path() -> std::path::PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("nutbook-thumbnails-{nanos}.sqlite3"))
    }

    #[test]
    fn generate_thumbnail_stores_absolute_file_path_for_html() {
        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");

        database
            .upsert_library(Library {
                id: 1,
                name: "Library".to_string(),
                root_path: "/tmp/library".to_string(),
                source_kind: "folder".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "now".to_string(),
                updated_at: "now".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be created");

        database
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: "/tmp/library/a.html".to_string(),
                    relative_path: "a.html".to_string(),
                    file_name: "a.html".to_string(),
                    file_ext: "html".to_string(),
                    file_type: "html".to_string(),
                    file_size: 10,
                    modified_at: "1".to_string(),
                    created_at: "now".to_string(),
                    updated_at: "now".to_string(),
                }],
            )
            .expect("item should be inserted");

        let generated = database
            .generate_thumbnail(1)
            .expect("thumbnail should generate");
        assert_eq!(generated.thumbnail.status, "ready");
        let thumb_path = generated.thumbnail.path.expect("path should exist");
        // A1.1-PERF 合同：thumb_path 必须是绝对文件路径，不是 data URI
        let thumb_path_buf = std::path::PathBuf::from(&thumb_path);
        assert!(
            thumb_path_buf.is_absolute(),
            "thumb_path must be an absolute file path, got: {thumb_path}"
        );
        assert!(
            thumb_path_buf.ends_with(".cache/thumbnails/item-1.png")
                || thumb_path_buf.ends_with(".cache/thumbnails/item-1.svg"),
            "thumb_path must point into .cache/thumbnails, got: {thumb_path}"
        );
        assert!(
            thumb_path_buf.exists(),
            "thumbnail cache file must exist on disk: {thumb_path}"
        );

        let detail = database.get_item_detail(1).expect("detail should load");
        assert_eq!(
            detail
                .summary
                .thumbnail
                .as_ref()
                .and_then(|thumbnail| thumbnail.path.as_deref()),
            Some(thumb_path.as_str())
        );

        // list_items 返回值不得包含 data:image
        let listed = database
            .list_items(&ListItemsQuery::default())
            .expect("list items should load");
        let serialized = serde_json::to_string(&listed).expect("serialize list items");
        assert!(
            !serialized.contains("data:image/"),
            "list_items must not serialize base64 data URIs"
        );

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn generate_thumbnail_stores_absolute_file_path_for_markdown() {
        let path = temp_db_path();
        let markdown_path = std::env::temp_dir().join(format!(
            "nutbook-markdown-thumb-{}.md",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("system time should be after unix epoch")
                .as_nanos()
        ));
        std::fs::write(
            &markdown_path,
            "# Markdown Thumbnail\n\n## Section\n\nA readable document preview.",
        )
        .expect("markdown fixture should be written");

        let database = Database::new(&path).expect("db should initialize");

        database
            .upsert_library(Library {
                id: 1,
                name: "Library".to_string(),
                root_path: "/tmp/library".to_string(),
                source_kind: "folder".to_string(),
                path_state: "valid".to_string(),
                is_active: true,
                created_at: "now".to_string(),
                updated_at: "now".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be created");

        database
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: markdown_path.to_string_lossy().to_string(),
                    relative_path: "a.md".to_string(),
                    file_name: "a.md".to_string(),
                    file_ext: "md".to_string(),
                    file_type: "markdown".to_string(),
                    file_size: 10,
                    modified_at: "1".to_string(),
                    created_at: "now".to_string(),
                    updated_at: "now".to_string(),
                }],
            )
            .expect("item should be inserted");

        let generated = database
            .generate_thumbnail(1)
            .expect("markdown thumbnail should generate");
        assert_eq!(generated.thumbnail.status, "ready");
        let thumb_path = generated.thumbnail.path.expect("path should exist");
        // A1.1-PERF 合同：绝对文件路径 + 落盘存在 + 指向 .cache/thumbnails
        let thumb_path_buf = std::path::PathBuf::from(&thumb_path);
        assert!(
            thumb_path_buf.is_absolute(),
            "thumb_path must be an absolute file path, got: {thumb_path}"
        );
        assert!(
            thumb_path_buf.ends_with(".cache/thumbnails/item-1.png")
                || thumb_path_buf.ends_with(".cache/thumbnails/item-1.svg"),
            "thumb_path must point into .cache/thumbnails, got: {thumb_path}"
        );
        assert!(
            thumb_path_buf.exists(),
            "thumbnail cache file must exist on disk: {thumb_path}"
        );

        let detail = database.get_item_detail(1).expect("detail should load");
        assert_eq!(
            detail
                .summary
                .thumbnail
                .as_ref()
                .and_then(|thumbnail| thumbnail.path.as_deref()),
            Some(thumb_path.as_str())
        );

        let _ = std::fs::remove_file(path);
        let _ = std::fs::remove_file(markdown_path);
    }
}
