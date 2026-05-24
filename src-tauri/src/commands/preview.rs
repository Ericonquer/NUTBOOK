use crate::{
    core::{
        document::{content_hash, load_document_payload, markdown_summary, render_markdown_as_html},
        html_runtime::{
            attach_controls_overlay, attach_html_runtime_controls_overlay, attach_html_runtime_host, attach_settings_overlay, close_html_runtime_window, dispatch_html_runtime_shortcut,
            focus_html_runtime_host, focus_main_webview,
            open_html_runtime_window, set_html_runtime_controls_overlay_visibility, set_html_runtime_host_visibility,
            HtmlRuntimeSession,
        },
    },
    db::repositories::ItemRepository,
    errors::AppError,
    models::{
        AttachHtmlRuntimeControlsOverlayRequest, AttachHtmlRuntimeHostRequest, AttachSettingsOverlayRequest, CloseHtmlWindowRequest, GetItemPreviewRequest,
        DispatchHtmlRuntimeShortcutRequest,
        FocusHtmlRuntimeHostRequest,
        HtmlRuntimeSessionPayload, OpenHtmlWindowRequest, PreviewPayload, ExportMarkdownRequest,
        SaveMarkdownContentRequest, SaveMarkdownContentResponse,
        SetHtmlRuntimeControlsOverlayVisibilityRequest, SetHtmlRuntimeHostVisibilityRequest,
    },
    state::AppState,
};

#[tauri::command]
pub fn get_item_preview(
    state: tauri::State<'_, AppState>,
    payload: GetItemPreviewRequest,
) -> Result<PreviewPayload, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    load_document_payload(&item, |path| state.local_server_file_url(path))
}

#[tauri::command]
pub fn attach_settings_overlay_command(
    app: tauri::AppHandle,
    window: tauri::Window,
    payload: AttachSettingsOverlayRequest,
) -> Result<bool, AppError> {
    attach_settings_overlay(&app, &window, payload.bounds, payload.tab, payload.mode)
}

#[tauri::command]
pub fn get_local_server_origin(
    state: tauri::State<'_, AppState>,
) -> Result<String, AppError> {
    Ok(state.local_server_origin())
}

#[tauri::command]
pub fn open_html_window(
    state: tauri::State<'_, AppState>,
    payload: OpenHtmlWindowRequest,
) -> Result<HtmlRuntimeSessionPayload, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }

    let runtime_url = state.local_server_file_url(std::path::Path::new(&item.summary.file_path));
    let session = HtmlRuntimeSession::from_item(&item, runtime_url)?;
    Ok(session.to_payload(false))
}

#[tauri::command]
pub fn open_html_detached_window(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: OpenHtmlWindowRequest,
) -> Result<HtmlRuntimeSessionPayload, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }

    let runtime_url = state.local_server_file_url(std::path::Path::new(&item.summary.file_path));
    let session = HtmlRuntimeSession::from_item(&item, runtime_url)?;
    open_html_runtime_window(&app, &session)?;
    Ok(session.to_payload(true))
}

#[tauri::command]
pub fn attach_html_runtime_host_command(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
    payload: AttachHtmlRuntimeHostRequest,
) -> Result<HtmlRuntimeSessionPayload, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }

    let runtime_url = state.local_server_file_url(std::path::Path::new(&item.summary.file_path));
    let session = HtmlRuntimeSession::from_item(&item, runtime_url)?;
    attach_html_runtime_host(&app, &window, &session, payload.bounds)?;
    Ok(session.to_payload(false))
}

#[tauri::command]
pub fn set_html_runtime_host_visibility_command(
    app: tauri::AppHandle,
    payload: SetHtmlRuntimeHostVisibilityRequest,
) -> Result<bool, AppError> {
    set_html_runtime_host_visibility(&app, payload.item_id, payload.visible)
}

#[tauri::command]
pub fn attach_html_runtime_controls_overlay_command(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
    payload: AttachHtmlRuntimeControlsOverlayRequest,
) -> Result<HtmlRuntimeSessionPayload, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" {
        return Err(AppError::UnsupportedFileType);
    }

    let runtime_url = state.local_server_file_url(std::path::Path::new(&item.summary.file_path));
    let session = HtmlRuntimeSession::from_item(&item, runtime_url)?;
    attach_html_runtime_controls_overlay(
        &app,
        &window,
        &session,
        payload.bounds,
        payload.is_favorite,
        payload.is_fullscreen,
        payload.custom_tag,
        payload.available_tags,
        payload.skill_tag,
        payload.type_tag,
    )?;
    Ok(session.to_payload(false))
}

#[tauri::command]
pub fn set_html_runtime_controls_overlay_visibility_command(
    app: tauri::AppHandle,
    payload: SetHtmlRuntimeControlsOverlayVisibilityRequest,
) -> Result<bool, AppError> {
    set_html_runtime_controls_overlay_visibility(&app, payload.item_id, payload.visible)
}

#[tauri::command]
pub fn attach_markdown_controls_overlay_command(
    app: tauri::AppHandle,
    window: tauri::Window,
    state: tauri::State<'_, AppState>,
    payload: AttachHtmlRuntimeControlsOverlayRequest,
) -> Result<bool, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "html" && item.summary.file_type != "markdown" {
        return Err(AppError::UnsupportedFileType);
    }
    attach_controls_overlay(
        &app,
        &window,
        payload.item_id,
        payload.bounds,
        payload.is_favorite,
        payload.is_fullscreen,
        payload.custom_tag,
        payload.available_tags,
        payload.skill_tag,
        payload.type_tag,
    )?;
    Ok(true)
}

#[tauri::command]
pub fn close_html_window(
    app: tauri::AppHandle,
    payload: CloseHtmlWindowRequest,
) -> Result<bool, AppError> {
    close_html_runtime_window(&app, payload.item_id)
}

#[tauri::command]
pub fn close_markdown_overlay_command(
    app: tauri::AppHandle,
    payload: CloseHtmlWindowRequest,
) -> Result<bool, AppError> {
    close_html_runtime_window(&app, payload.item_id)
}

#[tauri::command]
pub fn set_window_fullscreen_command(
    window: tauri::Window,
    fullscreen: bool,
) -> Result<bool, AppError> {
    window
        .set_fullscreen(fullscreen)
        .map_err(|_| AppError::InternalError)?;
    Ok(true)
}

#[tauri::command]
pub fn dispatch_html_runtime_shortcut_command(
    app: tauri::AppHandle,
    payload: DispatchHtmlRuntimeShortcutRequest,
) -> Result<bool, AppError> {
    dispatch_html_runtime_shortcut(&app, payload.item_id, &payload.key)
}

#[tauri::command]
pub fn focus_html_runtime_host_command(
    app: tauri::AppHandle,
    payload: FocusHtmlRuntimeHostRequest,
) -> Result<bool, AppError> {
    focus_html_runtime_host(&app, payload.item_id, payload.host_fullscreen)
}

#[tauri::command]
pub fn focus_main_webview_command(
    app: tauri::AppHandle,
) -> Result<bool, AppError> {
    focus_main_webview(&app)
}

fn save_markdown_content_impl(
    state: &AppState,
    payload: SaveMarkdownContentRequest,
) -> Result<SaveMarkdownContentResponse, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "markdown" {
        return Err(AppError::UnsupportedFileType);
    }

    let current_raw = std::fs::read_to_string(&item.summary.file_path).map_err(|_| AppError::IoError)?;
    let current_hash = content_hash(&current_raw);
    if current_hash != payload.expected_file_hash {
        return Err(AppError::EditConflict);
    }

    if let Some(expected_modified_at) = payload.expected_modified_at.as_deref() {
        if expected_modified_at != item.summary.modified_at {
            return Err(AppError::EditConflict);
        }
    }

    std::fs::write(&item.summary.file_path, &payload.content).map_err(|_| AppError::MarkdownSaveFailed)?;
    let written_raw = std::fs::read_to_string(&item.summary.file_path).map_err(|_| AppError::IoError)?;
    let new_hash = content_hash(&written_raw);
    let rendered_html = render_markdown_as_html(&written_raw);
    let summary = markdown_summary(&written_raw);
    let modified_at = std::fs::metadata(&item.summary.file_path)
        .and_then(|metadata| metadata.modified())
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|| item.summary.modified_at.clone());

    state.update_markdown_item_content(
        payload.item_id,
        &summary,
        &modified_at,
        &new_hash,
        &written_raw,
        &written_raw,
        &rendered_html,
    )?;

    Ok(SaveMarkdownContentResponse {
        item_id: payload.item_id,
        modified_at,
        file_hash: Some(new_hash),
        summary: Some(summary),
        rendered_html: Some(rendered_html),
        saved: true,
    })
}

#[tauri::command]
pub fn save_markdown_content(
    state: tauri::State<'_, AppState>,
    payload: SaveMarkdownContentRequest,
) -> Result<SaveMarkdownContentResponse, AppError> {
    save_markdown_content_impl(&state, payload)
}

#[tauri::command]
pub fn export_markdown_file(
    state: tauri::State<'_, AppState>,
    payload: ExportMarkdownRequest,
) -> Result<bool, AppError> {
    let item = state.get_item_detail(payload.item_id)?;
    if item.summary.file_type != "markdown" {
        return Err(AppError::UnsupportedFileType);
    }

    let default_name = item.summary.file_name.clone();
    let target = rfd::FileDialog::new()
        .set_file_name(&default_name)
        .add_filter("Markdown", &["md", "markdown"])
        .save_file()
        .ok_or(AppError::InvalidParams)?;

    let content = item
        .source_text
        .clone()
        .unwrap_or_else(|| std::fs::read_to_string(&item.summary.file_path).unwrap_or_default());
    std::fs::write(target, content).map_err(|_| AppError::IoError)?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use std::{fs, time::{SystemTime, UNIX_EPOCH}};

    use crate::{
        core::document::{content_hash, load_document_payload},
        db::{repositories::{ItemRepository, LibraryRepository}, Database},
        models::{IndexedItemRecord, Library, PreviewPayload, SaveMarkdownContentRequest},
        state::AppState,
    };

    use super::save_markdown_content_impl;

    fn temp_path(name: &str) -> std::path::PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("nutbook-preview-{name}-{nanos}"))
    }

    #[test]
    fn preview_payload_loads_markdown_file_contents() {
        let root = temp_path("root");
        fs::create_dir_all(&root).expect("root dir should be created");
        let markdown_path = root.join("note.md");
        fs::write(&markdown_path, "# Hello").expect("markdown file should be written");

        let db_path = temp_path("db").with_extension("sqlite3");
        let database = Database::new(&db_path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());

        state
            .upsert_library(Library {
                id: 1,
                name: "Preview".to_string(),
                root_path: root.to_string_lossy().to_string(),
                source_kind: "folder".to_string(),
                is_active: true,
                created_at: "now".to_string(),
                updated_at: "now".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be created");

        state
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: markdown_path.to_string_lossy().to_string(),
                    relative_path: "note.md".to_string(),
                    file_name: "note.md".to_string(),
                    file_ext: "md".to_string(),
                    file_type: "markdown".to_string(),
                    file_size: 7,
                    modified_at: "1".to_string(),
                    created_at: "now".to_string(),
                    updated_at: "now".to_string(),
                }],
            )
            .expect("item should be inserted");

        let item = state.get_item_detail(1).expect("detail should load");
        let payload = load_document_payload(&item, |_| "http://127.0.0.1:4000/fs/note.md".to_string())
            .expect("payload should load");

        match payload {
            PreviewPayload::Markdown(markdown) => {
                assert_eq!(markdown.raw, "# Hello");
                assert!(markdown.html.contains("<h1>Hello</h1>"));
            }
            PreviewPayload::Html(_) => panic!("expected markdown payload"),
        }

        let _ = fs::remove_file(db_path);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn save_markdown_content_writes_file_and_updates_db() {
        let root = temp_path("save-root");
        fs::create_dir_all(&root).expect("root dir should be created");
        let markdown_path = root.join("note.md");
        fs::write(&markdown_path, "# Hello").expect("markdown file should be written");

        let db_path = temp_path("save-db").with_extension("sqlite3");
        let database = Database::new(&db_path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());

        state
            .upsert_library(Library {
                id: 1,
                name: "Preview".to_string(),
                root_path: root.to_string_lossy().to_string(),
                source_kind: "folder".to_string(),
                is_active: true,
                created_at: "1".to_string(),
                updated_at: "1".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be created");

        state
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: markdown_path.to_string_lossy().to_string(),
                    relative_path: "note.md".to_string(),
                    file_name: "note.md".to_string(),
                    file_ext: "md".to_string(),
                    file_type: "markdown".to_string(),
                    file_size: 7,
                    modified_at: "1".to_string(),
                    created_at: "1".to_string(),
                    updated_at: "1".to_string(),
                }],
            )
            .expect("item should be inserted");

        let response = save_markdown_content_impl(
            &state,
            SaveMarkdownContentRequest {
                item_id: 1,
                content: "# Updated".to_string(),
                expected_file_hash: content_hash("# Hello"),
                expected_modified_at: Some("1".to_string()),
            },
        )
        .expect("save should succeed");

        assert_eq!(fs::read_to_string(&markdown_path).expect("file should read"), "# Updated");
        assert_eq!(response.summary.as_deref(), Some("Updated"));

        let detail = state.get_item_detail(1).expect("detail should load");
        assert_eq!(detail.source_text.as_deref(), Some("# Updated"));

        let _ = fs::remove_file(db_path);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn save_markdown_content_keeps_list_detail_and_payload_in_sync() {
        let root = temp_path("consistency-root");
        fs::create_dir_all(&root).expect("root dir should be created");
        let markdown_path = root.join("my note.md");
        fs::write(&markdown_path, "# Original").expect("markdown file should be written");

        let db_path = temp_path("consistency-db").with_extension("sqlite3");
        let database = Database::new(&db_path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());

        state
            .upsert_library(Library {
                id: 1,
                name: "Consistency".to_string(),
                root_path: root.to_string_lossy().to_string(),
                source_kind: "folder".to_string(),
                is_active: true,
                created_at: "1".to_string(),
                updated_at: "1".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be created");

        state
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: markdown_path.to_string_lossy().to_string(),
                    relative_path: "my note.md".to_string(),
                    file_name: "my note.md".to_string(),
                    file_ext: "md".to_string(),
                    file_type: "markdown".to_string(),
                    file_size: 10,
                    modified_at: "1".to_string(),
                    created_at: "1".to_string(),
                    updated_at: "1".to_string(),
                }],
            )
            .expect("item should be inserted");

        save_markdown_content_impl(
            &state,
            SaveMarkdownContentRequest {
                item_id: 1,
                content: "# Updated Title\n\nbody".to_string(),
                expected_file_hash: content_hash("# Original"),
                expected_modified_at: Some("1".to_string()),
            },
        )
        .expect("save should succeed");

        let list = state
            .list_items(&crate::models::ListItemsQuery {
                library_id: Some(1),
                ..crate::models::ListItemsQuery::default()
            })
            .expect("list should load");
        assert_eq!(list.items[0].summary.as_deref(), Some("Updated Title"));

        let detail = state.get_item_detail(1).expect("detail should load");
        assert_eq!(detail.summary.summary.as_deref(), Some("Updated Title"));
        assert_eq!(detail.source_text.as_deref(), Some("# Updated Title\n\nbody"));

        let payload = load_document_payload(&detail, |_| "http://127.0.0.1:4000/fs/note.md".to_string())
            .expect("payload should load");
        match payload {
            PreviewPayload::Markdown(markdown) => {
                assert_eq!(markdown.raw, "# Updated Title\n\nbody");
                assert!(markdown.html.contains("Updated Title"));
            }
            PreviewPayload::Html(_) => panic!("expected markdown payload"),
        }

        let _ = fs::remove_file(db_path);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn preview_payload_loads_html_with_http_url_and_base_dir() {
        let root = temp_path("html-root");
        fs::create_dir_all(&root).expect("root dir should be created");
        let html_path = root.join("my page.html");
        fs::write(&html_path, "<h1>Hello</h1>").expect("html file should be written");

        let db_path = temp_path("html-db").with_extension("sqlite3");
        let database = Database::new(&db_path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());

        state
            .upsert_library(Library {
                id: 1,
                name: "Html".to_string(),
                root_path: root.to_string_lossy().to_string(),
                source_kind: "folder".to_string(),
                is_active: true,
                created_at: "1".to_string(),
                updated_at: "1".to_string(),
                last_scanned_at: None,
                skill_binding: None,
            })
            .expect("library should be created");

        state
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: html_path.to_string_lossy().to_string(),
                    relative_path: "my page.html".to_string(),
                    file_name: "my page.html".to_string(),
                    file_ext: "html".to_string(),
                    file_type: "html".to_string(),
                    file_size: 14,
                    modified_at: "1".to_string(),
                    created_at: "1".to_string(),
                    updated_at: "1".to_string(),
                }],
            )
            .expect("item should be inserted");

        let item = state.get_item_detail(1).expect("detail should load");
        let payload = load_document_payload(
            &item,
            |path| format!("http://127.0.0.1:4000/fs{}", path.to_string_lossy().replace(' ', "%20")),
        )
        .expect("payload should load");

        match payload {
            PreviewPayload::Html(html) => {
                assert!(html.preview_url.starts_with("http://127.0.0.1:4000/"));
                assert!(html.preview_url.contains("my%20page.html"));
                assert_eq!(html.base_dir, root.to_string_lossy().to_string());
            }
            PreviewPayload::Markdown(_) => panic!("expected html payload"),
        }

        let _ = fs::remove_file(db_path);
        let _ = fs::remove_dir_all(root);
    }
}
