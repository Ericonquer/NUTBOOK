use crate::{core::nuts, state::AppState};

#[tauri::command]
pub fn nuts_list(state: tauri::State<'_, AppState>) -> Result<Vec<nuts::Issue>, String> {
    nuts::list(&state.app_data_dir)
}

#[tauri::command]
pub fn nuts_create(
    state: tauri::State<'_, AppState>,
    title: String,
    source_name: String,
    markdown: String,
) -> Result<String, String> {
    nuts::create(&state.app_data_dir, &title, &source_name, &markdown)
}

#[tauri::command]
pub fn nuts_drafts(
    state: tauri::State<'_, AppState>,
    issue_id: String,
) -> Result<Vec<nuts::Draft>, String> {
    nuts::drafts(&state.app_data_dir, &issue_id)
}

#[tauri::command]
pub fn nuts_reopen(state: tauri::State<'_, AppState>, issue_id: String) -> Result<(), String> {
    nuts::reopen(&state.app_data_dir, &issue_id)
}

#[tauri::command]
pub async fn nuts_save_result(
    app: tauri::AppHandle,
    issue_id: String,
    version: i64,
) -> Result<crate::models::ItemSummary, String> {
    use tauri::Manager;
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        nuts::save_result(&state.app_data_dir, &issue_id, version, |path| {
            let path = path.to_str().ok_or("Invalid result path")?;
            let response = crate::core::cli::execute_with_app_state(
                &state,
                &crate::core::cli::CliRequest {
                    action: "add".into(),
                    path: path.into(),
                    caller_agent: None,
                    paths: None,
                },
            )
            .map_err(|error| error.message)?;
            crate::core::cli::active_item_for_path(&state.database, &response.path)
                .map_err(|error| error.message)?
                .ok_or_else(|| {
                    "The result file was saved but could not be found in the library".into()
                })
        })
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn nuts_board_cards(
    state: tauri::State<'_, AppState>,
    board_id: String,
) -> Result<Vec<nuts::board::Card>, String> {
    nuts::board::list(&state.app_data_dir, &board_id)
}

#[tauri::command]
pub fn nuts_board_note(
    state: tauri::State<'_, AppState>,
    board_id: String,
    markdown: String,
    x: i64,
    y: i64,
) -> Result<String, String> {
    let title: String = markdown
        .trim()
        .lines()
        .next()
        .unwrap_or("")
        .trim()
        .chars()
        .take(100)
        .collect();
    nuts::board::add(
        &state.app_data_dir,
        &board_id,
        &title,
        &markdown,
        "note",
        x,
        y,
    )
}

#[tauri::command]
pub async fn nuts_board_file(
    app: tauri::AppHandle,
    board_id: String,
    path: String,
    x: i64,
    y: i64,
) -> Result<String, String> {
    use tauri::Manager;
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        nuts::materials::import(
            &state.app_data_dir,
            &board_id,
            std::path::Path::new(&path),
            x,
            y,
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn nuts_choose_materials(
    app: tauri::AppHandle,
    language: Option<String>,
) -> Option<Vec<String>> {
    use tauri::Manager;
    let text = if language.as_deref() == Some("en-US") {
        "Choose materials"
    } else {
        "选择白板素材"
    };
    let mut dialog = rfd::FileDialog::new()
        .set_title(text)
        .add_filter(text, nuts::materials::FORMATS);
    if let Some(window) = app.get_webview_window("main") {
        dialog = dialog.set_parent(&window);
    }
    dialog.pick_files().map(|paths| {
        paths
            .into_iter()
            .map(|path| path.to_string_lossy().to_string())
            .collect()
    })
}

#[tauri::command]
pub fn nuts_board_move(
    state: tauri::State<'_, AppState>,
    id: String,
    x: i64,
    y: i64,
) -> Result<(), String> {
    nuts::board::move_card(&state.app_data_dir, &id, x, y)
}

#[tauri::command]
pub fn nuts_board_issue(
    state: tauri::State<'_, AppState>,
    board_id: String,
    title: String,
    card_ids: Vec<String>,
    template: Option<String>,
    goal: String,
) -> Result<String, String> {
    nuts::board::create_issue(
        &state.app_data_dir,
        &board_id,
        &title,
        &card_ids,
        template.as_deref(),
        &goal,
    )
}

#[tauri::command]
pub fn nuts_board_open_issue(state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    nuts::board::open_issue(&state.app_data_dir, &id)
}

#[tauri::command]
pub fn nuts_board_drop_target(
    state: tauri::State<'_, AppState>,
    webview: tauri::Webview,
    active: bool,
) -> Result<(), String> {
    if webview.label() != "main" {
        return Err("NUTS requires the main window".into());
    }
    state
        .nuts_board_drop_target
        .store(active, std::sync::atomic::Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub fn nuts_references(
    state: tauri::State<'_, AppState>,
    issue_id: String,
) -> Result<Vec<nuts::references::Reference>, String> {
    nuts::references::list(&state.app_data_dir, &issue_id)
}

#[tauri::command]
pub fn nuts_adopt_reference(
    state: tauri::State<'_, AppState>,
    issue_id: String,
    id: String,
) -> Result<(), String> {
    nuts::references::adopt(&state.app_data_dir, &issue_id, &id)
}

#[tauri::command]
pub fn nuts_boards(state: tauri::State<'_, AppState>) -> Result<Vec<nuts::board::Board>, String> {
    nuts::board::boards(&state.app_data_dir)
}

#[tauri::command]
pub fn nuts_create_board(
    state: tauri::State<'_, AppState>,
    name: String,
    scene: String,
    language: Option<String>,
) -> Result<String, String> {
    nuts::board::create_board(
        &state.app_data_dir,
        &name,
        &scene,
        language.as_deref().unwrap_or("zh-CN"),
    )
}

#[tauri::command]
pub fn nuts_board_move_group(
    state: tauri::State<'_, AppState>,
    issue_id: String,
    dx: i64,
    dy: i64,
) -> Result<(), String> {
    nuts::board::move_group(&state.app_data_dir, &issue_id, dx, dy)
}

#[tauri::command]
pub fn nuts_scene_catalog(language: Option<String>) -> Result<serde_json::Value, String> {
    nuts::settings::catalog(language.as_deref().unwrap_or("zh-CN"))
}

#[tauri::command]
pub fn nuts_board_config(
    state: tauri::State<'_, AppState>,
    board_id: String,
    language: Option<String>,
) -> Result<serde_json::Value, String> {
    nuts::settings::config(
        &state.app_data_dir,
        &board_id,
        language.as_deref().unwrap_or("zh-CN"),
    )
}

#[tauri::command]
pub fn nuts_save_rules(
    state: tauri::State<'_, AppState>,
    board_id: String,
    name: String,
    text: String,
    expected: i64,
) -> Result<nuts::settings::Rules, String> {
    nuts::settings::save_rules(&state.app_data_dir, &board_id, &name, &text, expected)
}

#[tauri::command]
pub fn nuts_issue_context(
    state: tauri::State<'_, AppState>,
    issue_id: String,
    language: Option<String>,
) -> Result<serde_json::Value, String> {
    nuts::settings::issue_context(
        &state.app_data_dir,
        &issue_id,
        language.as_deref().unwrap_or("zh-CN"),
    )
}

#[tauri::command]
pub fn nuts_board_link(
    state: tauri::State<'_, AppState>,
    board_id: String,
    text: String,
    x: i64,
    y: i64,
) -> Result<String, String> {
    let url = url::Url::parse(text.trim()).map_err(|_| "Invalid web link")?;
    let host = url
        .host_str()
        .filter(|_| {
            matches!(url.scheme(), "http" | "https")
                && url.username().is_empty()
                && url.password().is_none()
        })
        .ok_or("Enter an HTTP or HTTPS link without credentials")?;
    nuts::board::add(
        &state.app_data_dir,
        &board_id,
        host,
        url.as_str(),
        "link",
        x,
        y,
    )
}

#[tauri::command]
pub fn nuts_board_attach_card(
    state: tauri::State<'_, AppState>,
    board_id: String,
    issue_id: String,
    card_id: String,
    x: i64,
    y: i64,
) -> Result<(), String> {
    nuts::board::attach_card(&state.app_data_dir, &board_id, &issue_id, &card_id, x, y)
}

#[tauri::command]
pub fn nuts_attach_library_item(
    state: tauri::State<'_, AppState>,
    issue_id: String,
    item_id: i64,
) -> Result<(), String> {
    use crate::db::repositories::ItemRepository;
    let item = state
        .database
        .get_item_detail(item_id)
        .map_err(|error| error.to_string())?;
    nuts::references::attach_library_item(&state.app_data_dir, &issue_id, &item.summary)
}

#[tauri::command]
pub fn nuts_withdraw(state: tauri::State<'_, AppState>, issue_id: String) -> Result<(), String> {
    nuts::withdraw(&state.app_data_dir, &issue_id)
}

#[tauri::command]
pub async fn nuts_refresh_link_preview(app: tauri::AppHandle, card_id: String) -> Result<bool, String> {
    use tauri::Manager;
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        nuts::link_preview::refresh(&state.app_data_dir, &card_id)
    }).await.map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn nuts_image_usage(state: tauri::State<'_, AppState>, card_id: String, board_id: String,
    issue_id: Option<String>, update: Option<(u8, String)>, scale: Option<u16>) -> Result<(u8, String, u16), String> {
    nuts::materials::image_usage(&state.app_data_dir, &card_id, &board_id, issue_id.as_deref(), update, scale)
}

#[tauri::command]
pub async fn nuts_paste_image(app: tauri::AppHandle, board_id: String, data: String,
    x: i64, y: i64) -> Result<String, String> {
    use tauri::Manager;
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        nuts::materials::paste_image(&state.app_data_dir, &board_id, &data, x, y)
    }).await.map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn nuts_image_thumbnail(app: tauri::AppHandle, card_id: String) -> Result<String, String> {
    use tauri::Manager;
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        nuts::materials::image_thumbnail(&state.app_data_dir, &card_id)
    }).await.map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn nuts_remove_board_cards(
    state: tauri::State<'_, AppState>,
    board_id: String,
    card_ids: Vec<String>,
    issue_id: Option<String>,
) -> Result<(), String> {
    nuts::board::remove(&state.app_data_dir, &board_id, &card_ids, issue_id.as_deref())
}


#[tauri::command]
pub async fn nuts_add_issue_file(
    app: tauri::AppHandle,
    issue_id: String,
    board_id: String,
    path: String,
) -> Result<String, String> {
    use tauri::Manager;
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        nuts::materials::import_for_issue(
            &state.app_data_dir, &board_id, &issue_id, std::path::Path::new(&path),
        )
    }).await.map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn nuts_review_history(
    state: tauri::State<'_, AppState>, issue_id: String, version: i64,
) -> Result<Vec<nuts::review::Comment>, String> {
    nuts::review::history(&state.app_data_dir, &issue_id, version)
}

#[tauri::command]
pub fn nuts_queue_review(
    state: tauri::State<'_, AppState>, issue_id: String, version: i64,
    comments: Vec<nuts::review::Comment>,
) -> Result<(), String> {
    nuts::review::queue(&state.app_data_dir, &issue_id, version, &comments)
}
