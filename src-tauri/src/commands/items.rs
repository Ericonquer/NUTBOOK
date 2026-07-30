use crate::{
    db::repositories::ItemRepository,
    errors::AppError,
    models::{
        GetItemDetailRequest, IgnoredItemSummary, ItemDetail, ListItemsQuery, MarkItemOpenedRequest,
        MoveItemToTrashRequest, PagedResult, RemoveItemRequest, RestoreIgnoredItemRequest,
        SyncFilesystemStateResponse, ToggleFavoriteRequest,
    },
    state::AppState,
};
use serde::Deserialize;
use std::path::Path;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FindItemByPathRequest {
    pub file_path: String,
}

#[tauri::command]
pub fn list_items(
    state: tauri::State<'_, AppState>,
    query: ListItemsQuery,
) -> Result<PagedResult<crate::models::ItemSummary>, AppError> {
    state.list_items(&query)
}

#[tauri::command]
pub fn get_item_detail(
    state: tauri::State<'_, AppState>,
    payload: GetItemDetailRequest,
) -> Result<ItemDetail, AppError> {
    state.get_item_detail(payload.item_id)
}

#[tauri::command]
pub fn find_item_by_path(
    state: tauri::State<'_, AppState>,
    payload: FindItemByPathRequest,
) -> Result<Option<crate::models::ItemSummary>, AppError> {
    let target_path = normalize_lookup_path(&payload.file_path);
    if target_path.is_empty() {
        return Err(AppError::InvalidParams);
    }

    let mut page = 1;
    loop {
        let result = state.list_items(&ListItemsQuery {
            include_deleted: Some(false),
            page: Some(page),
            page_size: Some(500),
            ..ListItemsQuery::default()
        })?;

        if let Some(item) = result
            .items
            .into_iter()
            .find(|item| normalize_lookup_path(&item.file_path) == target_path)
        {
            return Ok(Some(item));
        }

        if !result.has_more {
            break;
        }
        page += 1;
    }

    Ok(None)
}

fn normalize_lookup_path(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return String::new();
    }
    Path::new(trimmed)
        .to_string_lossy()
        .replace('\\', "/")
        .trim_end_matches('/')
        .to_string()
}

#[tauri::command]
pub fn toggle_item_favorite(
    state: tauri::State<'_, AppState>,
    payload: ToggleFavoriteRequest,
) -> Result<bool, AppError> {
    state.set_item_favorite(payload.item_id, payload.is_favorite)?;
    Ok(payload.is_favorite)
}

#[tauri::command]
pub fn mark_item_opened(
    state: tauri::State<'_, AppState>,
    payload: MarkItemOpenedRequest,
) -> Result<bool, AppError> {
    let opened_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string());
    state.mark_item_opened(payload.item_id, &opened_at)?;
    Ok(true)
}

#[tauri::command]
pub fn remove_item_from_nutbook(
    state: tauri::State<'_, AppState>,
    payload: RemoveItemRequest,
) -> Result<bool, AppError> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string());
    state.remove_item_from_nutbook(payload.item_id, &now)?;
    Ok(true)
}

#[tauri::command]
pub fn move_item_to_trash(
    state: tauri::State<'_, AppState>,
    payload: MoveItemToTrashRequest,
) -> Result<bool, AppError> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string());
    state.move_item_to_trash(payload.item_id, &now)?;
    Ok(true)
}

#[tauri::command]
pub fn list_ignored_items(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<IgnoredItemSummary>, AppError> {
    state.list_ignored_items()
}

#[tauri::command]
pub fn restore_ignored_item(
    state: tauri::State<'_, AppState>,
    payload: RestoreIgnoredItemRequest,
) -> Result<bool, AppError> {
    state.restore_ignored_item(payload.item_id)?;
    Ok(true)
}

#[tauri::command]
pub fn sync_filesystem_state(
    state: tauri::State<'_, AppState>,
) -> Result<SyncFilesystemStateResponse, AppError> {
    state.sync_filesystem_state()
}

#[cfg(test)]
mod tests {
    use crate::{
        db::Database,
        db::repositories::{ItemRepository, LibraryRepository},
        models::{IndexedItemRecord, Library, ListItemsQuery},
        state::AppState,
    };

    fn temp_db_path() -> std::path::PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("nutbook-items-{nanos}.sqlite3"))
    }

    #[test]
    fn repository_lists_items_by_library() {
        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());

        state
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

        state
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: "/tmp/library/a.md".to_string(),
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
            .expect("items should be inserted");

        let paged = state
            .list_items(&ListItemsQuery {
                library_id: Some(1),
                ..ListItemsQuery::default()
            })
            .expect("items should be listed");
        assert_eq!(paged.total, 1);
        assert_eq!(paged.items[0].file_name, "a.md");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn repository_removes_single_file_source_from_nutbook() {
        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");

        database
            .upsert_library(Library {
                id: 1,
                name: "Deck".to_string(),
                root_path: "/tmp/deck.html".to_string(),
                source_kind: "file".to_string(),
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
                    file_path: "/tmp/deck.html".to_string(),
                    relative_path: "deck.html".to_string(),
                    file_name: "deck.html".to_string(),
                    file_ext: "html".to_string(),
                    file_type: "html".to_string(),
                    file_size: 10,
                    modified_at: "1".to_string(),
                    created_at: "now".to_string(),
                    updated_at: "now".to_string(),
                }],
            )
            .expect("item should be inserted");

        database
            .remove_item_from_nutbook(1, "now")
            .expect("remove should succeed");

        let libraries = database.list_libraries().expect("libraries should load");
        assert!(libraries.is_empty());
        let listed = database
            .list_items(&ListItemsQuery::default())
            .expect("items should list");
        assert_eq!(listed.total, 0);

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn repository_removes_editable_companion_without_deleting_single_file_source() {
        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");

        database
            .upsert_library(Library {
                id: 1,
                name: "Deck".to_string(),
                root_path: "/tmp/deck.html".to_string(),
                source_kind: "file".to_string(),
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
                &[
                    IndexedItemRecord {
                        library_id: 1,
                        file_path: "/tmp/deck.html".to_string(),
                        relative_path: "deck.html".to_string(),
                        file_name: "deck.html".to_string(),
                        file_ext: "html".to_string(),
                        file_type: "html".to_string(),
                        file_size: 10,
                        modified_at: "1".to_string(),
                        created_at: "now".to_string(),
                        updated_at: "now".to_string(),
                    },
                    IndexedItemRecord {
                        library_id: 1,
                        file_path: "/tmp/deck.nutbook-editable.html".to_string(),
                        relative_path: "deck.nutbook-editable.html".to_string(),
                        file_name: "deck.nutbook-editable.html".to_string(),
                        file_ext: "html".to_string(),
                        file_type: "html".to_string(),
                        file_size: 20,
                        modified_at: "1".to_string(),
                        created_at: "now".to_string(),
                        updated_at: "now".to_string(),
                    },
                ],
            )
            .expect("source and companion should be inserted");

        let listed = database
            .list_items(&ListItemsQuery {
                library_id: Some(1),
                ..ListItemsQuery::default()
            })
            .expect("items should list");
        let companion = listed
            .items
            .iter()
            .find(|item| item.file_name == "deck.nutbook-editable.html")
            .expect("companion should be indexed");

        database
            .remove_item_from_nutbook(companion.id, "later")
            .expect("companion removal should succeed");

        let libraries = database.list_libraries().expect("libraries should load");
        assert_eq!(libraries.len(), 1, "source library must remain");
        let remaining = database
            .list_items(&ListItemsQuery {
                library_id: Some(1),
                ..ListItemsQuery::default()
            })
            .expect("remaining items should list");
        assert_eq!(remaining.total, 1);
        assert_eq!(remaining.items[0].file_path, "/tmp/deck.html");
        let ignored = database
            .list_ignored_items()
            .expect("ignored companion should list");
        assert_eq!(ignored.len(), 1);
        assert_eq!(
            ignored[0].file_path,
            "/tmp/deck.nutbook-editable.html"
        );

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn repository_trashes_editable_companion_without_deleting_single_file_source() {
        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        let unique = path
            .file_stem()
            .expect("db path should have a stem")
            .to_string_lossy();
        let source_path = std::env::temp_dir().join(format!("{unique}.html"));
        let companion_path =
            std::env::temp_dir().join(format!("{unique}.nutbook-editable.html"));
        std::fs::write(&source_path, "<main>source</main>").expect("source should be written");
        std::fs::write(&companion_path, "<main>companion</main>")
            .expect("companion should be written");
        let trash_path = std::env::var_os("HOME")
            .map(std::path::PathBuf::from)
            .expect("home should exist")
            .join(".Trash")
            .join(
                companion_path
                    .file_name()
                    .expect("companion should have a file name"),
            );
        assert!(!trash_path.exists(), "unique trash target should not exist");

        database
            .upsert_library(Library {
                id: 1,
                name: "Deck".to_string(),
                root_path: source_path.to_string_lossy().to_string(),
                source_kind: "file".to_string(),
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
                &[
                    IndexedItemRecord {
                        library_id: 1,
                        file_path: source_path.to_string_lossy().to_string(),
                        relative_path: source_path
                            .file_name()
                            .expect("source should have a file name")
                            .to_string_lossy()
                            .to_string(),
                        file_name: source_path
                            .file_name()
                            .expect("source should have a file name")
                            .to_string_lossy()
                            .to_string(),
                        file_ext: "html".to_string(),
                        file_type: "html".to_string(),
                        file_size: 19,
                        modified_at: "1".to_string(),
                        created_at: "now".to_string(),
                        updated_at: "now".to_string(),
                    },
                    IndexedItemRecord {
                        library_id: 1,
                        file_path: companion_path.to_string_lossy().to_string(),
                        relative_path: companion_path
                            .file_name()
                            .expect("companion should have a file name")
                            .to_string_lossy()
                            .to_string(),
                        file_name: companion_path
                            .file_name()
                            .expect("companion should have a file name")
                            .to_string_lossy()
                            .to_string(),
                        file_ext: "html".to_string(),
                        file_type: "html".to_string(),
                        file_size: 22,
                        modified_at: "1".to_string(),
                        created_at: "now".to_string(),
                        updated_at: "now".to_string(),
                    },
                ],
            )
            .expect("source and companion should be inserted");

        let listed = database
            .list_items(&ListItemsQuery {
                library_id: Some(1),
                ..ListItemsQuery::default()
            })
            .expect("items should list");
        let companion = listed
            .items
            .iter()
            .find(|item| item.file_path == companion_path.to_string_lossy())
            .expect("companion should be indexed");
        database
            .move_item_to_trash(companion.id, "later")
            .expect("companion should move to trash");

        assert!(source_path.exists(), "source file must remain on disk");
        assert!(!companion_path.exists(), "companion must leave its original path");
        assert!(trash_path.exists(), "companion must exist in Trash");
        let libraries = database.list_libraries().expect("libraries should load");
        assert_eq!(libraries.len(), 1, "source library must remain");
        let remaining = database
            .list_items(&ListItemsQuery {
                library_id: Some(1),
                ..ListItemsQuery::default()
            })
            .expect("remaining items should list");
        assert_eq!(remaining.total, 1);
        assert_eq!(remaining.items[0].file_path, source_path.to_string_lossy());

        let _ = std::fs::remove_file(trash_path);
        let _ = std::fs::remove_file(source_path);
        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn repository_returns_item_detail() {
        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());

        state
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

        state
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: "/tmp/library/a.md".to_string(),
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
            .expect("items should be inserted");

        let detail = state
            .get_item_detail(1)
            .expect("item detail should be returned");
        assert_eq!(detail.summary.file_name, "a.md");

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn repository_lists_items_with_sorting_and_pagination() {
        let path = temp_db_path();
        let database = Database::new(&path).expect("db should initialize");
        let state = AppState::new(database, std::env::temp_dir());

        state
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

        state
            .replace_items_for_library(
                1,
                &[
                    IndexedItemRecord {
                        library_id: 1,
                        file_path: "/tmp/library/c.md".to_string(),
                        relative_path: "c.md".to_string(),
                        file_name: "c.md".to_string(),
                        file_ext: "md".to_string(),
                        file_type: "markdown".to_string(),
                        file_size: 10,
                        modified_at: "3".to_string(),
                        created_at: "now".to_string(),
                        updated_at: "now".to_string(),
                    },
                    IndexedItemRecord {
                        library_id: 1,
                        file_path: "/tmp/library/a.md".to_string(),
                        relative_path: "a.md".to_string(),
                        file_name: "a.md".to_string(),
                        file_ext: "md".to_string(),
                        file_type: "markdown".to_string(),
                        file_size: 10,
                        modified_at: "1".to_string(),
                        created_at: "now".to_string(),
                        updated_at: "now".to_string(),
                    },
                    IndexedItemRecord {
                        library_id: 1,
                        file_path: "/tmp/library/b.html".to_string(),
                        relative_path: "b.html".to_string(),
                        file_name: "b.html".to_string(),
                        file_ext: "html".to_string(),
                        file_type: "html".to_string(),
                        file_size: 10,
                        modified_at: "2".to_string(),
                        created_at: "now".to_string(),
                        updated_at: "now".to_string(),
                    },
                ],
            )
            .expect("items should be inserted");

        let paged = state
            .list_items(&ListItemsQuery {
                library_id: Some(1),
                sort_by: Some("fileName".to_string()),
                sort_order: Some("asc".to_string()),
                page: Some(2),
                page_size: Some(1),
                ..ListItemsQuery::default()
            })
            .expect("paged list should load");

        assert_eq!(paged.total, 3);
        assert_eq!(paged.page, 2);
        assert_eq!(paged.page_size, 1);
        assert!(paged.has_more);
        assert_eq!(paged.items.len(), 1);
        assert_eq!(paged.items[0].file_name, "b.html");

        let _ = std::fs::remove_file(path);
    }
}
