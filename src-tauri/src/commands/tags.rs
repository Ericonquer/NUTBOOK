use crate::{
    db::repositories::TagRepository,
    errors::AppError,
    models::{
        CreateTagRequest, DeleteTagRequest, DeleteTagResponse, SetItemTagsRequest,
        SetItemTagsResponse, Tag, UpdateTagRequest, SaveItemTagsRequest,
    },
    state::AppState,
};

#[tauri::command]
pub fn list_tags(state: tauri::State<'_, AppState>) -> Result<Vec<Tag>, AppError> {
    state.list_tags()
}

#[tauri::command]
pub fn create_tag(
    state: tauri::State<'_, AppState>,
    payload: CreateTagRequest,
) -> Result<Tag, AppError> {
    state.create_tag(&payload)
}

#[tauri::command]
pub fn update_tag(
    state: tauri::State<'_, AppState>,
    payload: UpdateTagRequest,
) -> Result<Tag, AppError> {
    state.update_tag(&payload)
}

#[tauri::command]
pub fn delete_tag(
    state: tauri::State<'_, AppState>,
    payload: DeleteTagRequest,
) -> Result<DeleteTagResponse, AppError> {
    state.delete_tag(payload.id)
}

#[tauri::command]
pub fn set_item_tags(
    state: tauri::State<'_, AppState>,
    payload: SetItemTagsRequest,
) -> Result<SetItemTagsResponse, AppError> {
    state.set_item_tags(payload.item_id, &payload.tag_ids)
}

#[cfg(test)]
mod tests {
    use crate::{
        db::repositories::{ItemRepository, LibraryRepository, TagRepository},
        db::Database,
        models::{
            CreateTagRequest, IndexedItemRecord, Library, ListItemsQuery, UpdateTagRequest,
        },
        state::AppState,
    };

    fn temp_db_path() -> std::path::PathBuf {
        // 同 items.rs：系统时钟粒度约 1µs，并行同纳秒槽会撞名，补 pid + 序号。
        static SEQ: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
        let seq = SEQ.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("nutbook-tags-{}-{nanos}-{seq}.sqlite3", std::process::id()))
    }

    #[test]
    fn tag_commands_crud_and_item_assignment_work() {
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
            .expect("item should be inserted");

        let alpha = state
            .create_tag(&CreateTagRequest {
                name: "Alpha".to_string(),
                color: Some("#111111".to_string()),
            })
            .expect("tag should be created");

        let beta = state
            .create_tag(&CreateTagRequest {
                name: "Beta".to_string(),
                color: Some("#222222".to_string()),
            })
            .expect("second tag should be created");

        let updated = state
            .update_tag(&UpdateTagRequest {
                id: beta.id,
                name: Some("Beta Updated".to_string()),
                color: Some("#333333".to_string()),
            })
            .expect("tag should update");
        assert_eq!(updated.name, "Beta Updated");

        let assigned = state
            .set_item_tags(1, &[alpha.id, beta.id])
            .expect("tags should be assigned");
        assert_eq!(assigned.tags.len(), 2);

        let detail = state.get_item_detail(1).expect("detail should load");
        assert_eq!(detail.summary.tags.len(), 2);

        let filtered = state
            .list_items(&ListItemsQuery {
                library_id: Some(1),
                tag_ids: Some(vec![alpha.id, beta.id]),
                ..ListItemsQuery::default()
            })
            .expect("tag filter should work");
        assert_eq!(filtered.total, 1);

        let tags = state.list_tags().expect("tags should list");
        assert_eq!(tags.len(), 2);

        use crate::models::{SaveItemTagsRequest, TagSelection};
        let saved = state.database.save_item_tag_selection(&SaveItemTagsRequest {
            item_id: 1,
            selections: vec![TagSelection { id: Some(alpha.id), name: None }, TagSelection { id: Some(beta.id), name: None }, TagSelection { id: None, name: Some("标签验收青松 100%_".into()) }],
            primary_index: Some(1),
        }).expect("draft commits atomically");
        assert_eq!(saved.tags[0].id, beta.id);
        assert_eq!(saved.tags.len(), 3);
        let unique = saved.tags[2].clone();
        for keyword in ["标签验收青松", "100%_", "青松 100"] {
            let result = state.list_items(&ListItemsQuery { keyword: Some(keyword.into()), ..Default::default() }).expect("tag search");
            assert_eq!(result.total, 1, "{keyword}");
            assert!(result.items[0].snippets.is_empty(), "tag-only hit must not invent body excerpt");
        }
        assert_eq!(state.list_items(&ListItemsQuery { keyword: Some("100XQ".into()), ..Default::default() }).unwrap().total, 0);
        let failed = state.database.save_item_tag_selection(&SaveItemTagsRequest {
            item_id: 1,
            selections: vec![TagSelection { id: None, name: Some("rollback canary".into()) }, TagSelection { id: Some(-1), name: None }],
            primary_index: None,
        });
        assert!(failed.is_err());
        assert!(!state.list_tags().unwrap().iter().any(|tag| tag.name == "rollback canary"));
        assert_eq!(state.get_item_detail(1).unwrap().summary.tags[0].id, beta.id);
        // Remove the primary: the earliest remaining association, not alphabetic order, wins.
        let removed = state.database.save_item_tag_selection(&SaveItemTagsRequest {
            item_id: 1,
            selections: vec![TagSelection { id: Some(unique.id), name: None }, TagSelection { id: Some(alpha.id), name: None }],
            primary_index: None,
        }).unwrap();
        assert_eq!(removed.tags[0].id, alpha.id);
        let reopened = Database::new(&path).unwrap();
        assert_eq!(reopened.get_item_detail(1).unwrap().summary.tags[0].id, alpha.id);
        assert_eq!(reopened.get_item_detail(1).unwrap().summary.tags.len(), 2);

        state.delete_tag(alpha.id).expect("tag should delete");

        let _ = std::fs::remove_file(path);
    }
}
#[tauri::command]
pub fn save_item_tags(
    state: tauri::State<'_, AppState>,
    payload: SaveItemTagsRequest,
) -> Result<SetItemTagsResponse, AppError> {
    state.database.save_item_tag_selection(&payload)
}
