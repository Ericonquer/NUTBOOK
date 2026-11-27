use crate::{core::nuts, state::AppState};

#[tauri::command]
pub async fn nuts_export_markdown(
    app: tauri::AppHandle,
    issue_id: String,
    version: i64,
    result: bool,
) -> Result<Option<std::path::PathBuf>, String> {
    use tauri::Manager;
    tauri::async_runtime::spawn_blocking(move || {
        let Some(destination) = rfd::FileDialog::new().pick_folder() else {
            return Ok(None);
        };
        let state = app.state::<AppState>();
        nuts::export::export(&state.app_data_dir, &issue_id, version, result, &destination).map(Some)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn nuts_search_cards(
    state: tauri::State<'_, AppState>,
    query: String,
) -> Result<Vec<nuts::board::SearchCard>, String> {
    nuts::board::search_cards(&state.app_data_dir, &query)
}

#[tauri::command]
pub fn nuts_delete_issue(state: tauri::State<'_, AppState>, id: String, delete_cards: Option<bool>) -> Result<(), String> {
    nuts::delete_issue(&state.app_data_dir, &id, delete_cards.unwrap_or(false))
}

#[tauri::command]
pub fn nuts_set_archived(state: tauri::State<'_, AppState>, id: String, archived: bool) -> Result<(), String> {
    nuts::set_archived(&state.app_data_dir, &id, archived)
}

#[tauri::command]
pub fn nuts_board_detach_card(state: tauri::State<'_, AppState>, board_id: String, issue_id: String, card_id: String, x: i64, y: i64) -> Result<(), String> {
    nuts::board::detach_card(&state.app_data_dir, &board_id, &issue_id, &card_id, x, y)
}

#[tauri::command]
pub fn nuts_claim_setup(state: tauri::State<'_, AppState>) -> Result<(std::path::PathBuf, std::path::PathBuf), String> {
    let directory = state.app_data_dir.clone();
    let deployed = directory.join("cli").join(if cfg!(windows) { "nutbook.exe" } else { "nutbook" });
    let cli = if cfg!(debug_assertions) {
        let executable = std::env::current_exe().map_err(|error| error.to_string())?;
        let sibling = executable.with_file_name(if cfg!(windows) { "nutbook-cli-bin.exe" } else { "nutbook-cli-bin" });
        if sibling.is_file() { sibling } else { deployed }
    } else { deployed };
    if !cli.is_file() {
        return Err("NUTBOOK CLI is unavailable for this installation".into());
    }
    Ok((cli, directory))
}

#[tauri::command]
pub fn nuts_claim_number(state: tauri::State<'_, AppState>, issue_id: String) -> Result<String, String> {
    let (cli, directory) = nuts_claim_setup(state)?;
    nuts::handoff::publish(&directory, &cli, &issue_id)
}

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
pub fn nuts_draft_image(
    state: tauri::State<'_, AppState>,
    issue_id: String,
    version: i64,
    url: String,
) -> Result<Option<String>, String> {
    nuts::draft_assets::image_url(&state.app_data_dir, &issue_id, version, &url)
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
pub fn nuts_result_references(
    state: tauri::State<'_, AppState>,
    issue_id: String,
    version: i64,
) -> Result<Option<nuts::result_references::ReferenceSection>, String> {
    nuts::result_references::preview(&state.app_data_dir, &issue_id, version)
}

#[tauri::command]
pub async fn nuts_save_result(
    app: tauri::AppHandle,
    issue_id: String,
    version: i64,
    keep_references: Option<bool>,
) -> Result<crate::models::ItemSummary, String> {
    use tauri::Manager;
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        nuts::save_result(&state.app_data_dir, &issue_id, version, keep_references, |path| {
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
pub fn nuts_open_markdown_material(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    board_id: String,
    card_id: String,
    issue_id: Option<String>,
) -> Result<(), String> {
    let path = nuts::materials::markdown_path(&state.app_data_dir, &board_id, &card_id, issue_id.as_deref())?;
    let path = path.to_str().ok_or("Markdown material path is not valid UTF-8")?;
    super::external::external_open_enqueue(app, "nuts-material".into(), vec![path.into()])
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn nuts_open_system_material(
    app: tauri::AppHandle,
    board_id: String,
    card_id: String,
    issue_id: Option<String>,
) -> Result<(), String> {
    use tauri::Manager;
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let path = nuts::materials::system_path(&state.app_data_dir, &board_id, &card_id, issue_id.as_deref())?;
        crate::core::platform::open_path(&path).map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())?
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
pub fn nuts_revoke_reference(
    state: tauri::State<'_, AppState>,
    issue_id: String,
    id: String,
) -> Result<(), String> {
    nuts::references::revoke(&state.app_data_dir, &issue_id, &id)
}

#[tauri::command]
pub fn nuts_boards(state: tauri::State<'_, AppState>, language: Option<String>) -> Result<Vec<nuts::board::Board>, String> {
    if let Some(language) = language.as_deref() {
        nuts::settings::remember_default_language(&state.app_data_dir, language)?;
    }
    nuts::board::boards(&state.app_data_dir)
}

#[tauri::command]
pub fn nuts_rename_board(state: tauri::State<'_, AppState>, board_id: String, name: String) -> Result<(), String> {
    nuts::board::rename_board(&state.app_data_dir, &board_id, &name)
}

#[tauri::command]
pub fn nuts_remove_empty_board(state: tauri::State<'_, AppState>, board_id: String, check_only: bool) -> Result<bool, String> {
    nuts::board::remove_empty_board(&state.app_data_dir, &board_id, check_only)
}

#[tauri::command]
pub fn nuts_create_board(
    state: tauri::State<'_, AppState>,
    name: String,
    scene: String,
    language: Option<String>,
    rules: Option<String>,
    skills: Option<Vec<nuts::board_files::BoardSkill>>,
) -> Result<String, String> {
    nuts::board::create_board_with_files(
        &state.app_data_dir,
        &name,
        &scene,
        language.as_deref().unwrap_or("zh-CN"),
        rules.as_deref(),
        skills.as_deref().unwrap_or_default(),
    )
}

#[tauri::command]
pub fn nuts_open_board_folder(state: tauri::State<'_, AppState>, board_id: String) -> Result<(), String> {
    let path = nuts::settings::open_folder_path(&state.app_data_dir, &board_id)?;
    crate::core::platform::open_path(&path).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn nuts_open_board_skill_folder(
    state: tauri::State<'_, AppState>,
    board_id: String,
    skill_id: String,
) -> Result<(), String> {
    let path = nuts::settings::open_skill_folder_path(&state.app_data_dir, &board_id, &skill_id)?;
    crate::core::platform::open_path(&path).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn nuts_render_skill_markdown(
    markdown: String,
    file_name: String,
    strip_first_heading: bool,
) -> Result<nuts::board_files::SkillDocumentPreview, String> {
    nuts::board_files::render_preview(&markdown, &file_name, strip_first_heading)
}

#[tauri::command]
pub async fn nuts_choose_board_skill() -> Result<Option<nuts::board_files::BoardSkill>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        rfd::FileDialog::new().pick_folder()
            .map(|path| nuts::board_files::read_skill(&path))
            .transpose()
    }).await.map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn nuts_import_board_skill(
    state: tauri::State<'_, AppState>,
    board_id: String,
    skill: nuts::board_files::BoardSkill,
) -> Result<(), String> {
    nuts::settings::import_skill(&state.app_data_dir, &board_id, &skill)
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
) -> Result<serde_json::Value, String> {
    nuts::settings::config(&state.app_data_dir, &board_id)
}

#[tauri::command]
pub async fn nuts_import_rules() -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        rfd::FileDialog::new()
            .add_filter("Markdown", &["md", "markdown"])
            .pick_file()
            .map(|path| nuts::read_markdown(&path))
            .transpose()
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn nuts_export_rules(
    app: tauri::AppHandle,
    board_id: String,
) -> Result<Option<std::path::PathBuf>, String> {
    use tauri::Manager;
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AppState>();
        let text = nuts::settings::export_rules(&state.app_data_dir, &board_id)?;
        let Some(path) = rfd::FileDialog::new().set_file_name("AGENTS.md")
            .add_filter("Markdown", &["md", "markdown"]).save_file() else {
            return Ok(None);
        };
        use std::io::Write;
        let parent = path.parent().ok_or("Choose an export directory")?;
        let mut staged = tempfile::NamedTempFile::new_in(parent).map_err(|error| error.to_string())?;
        staged.write_all(text.as_bytes()).map_err(|error| error.to_string())?;
        staged.persist(&path).map_err(|error| error.to_string())?;
        Ok(Some(path))
    })
    .await
    .map_err(|error| error.to_string())?
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
pub fn nuts_remove_library_item(
    state: tauri::State<'_, AppState>,
    issue_id: String,
    path: String,
) -> Result<(), String> {
    nuts::references::remove_library_item(&state.app_data_dir, &issue_id, &path)
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
