use crate::{
    db::repositories::TagRepository,
    errors::AppError,
    models::{
        CreateTagRequest, DeleteTagRequest, DeleteTagResponse, SetItemTagsRequest,
        SetItemTagsResponse, Tag, UpdateTagRequest,
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

        state.delete_tag(alpha.id).expect("tag should delete");

        let _ = std::fs::remove_file(path);
    }
}
