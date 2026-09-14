use std::{fs, io, io::{BufRead, BufReader, Read, Write}, net::TcpListener, path::PathBuf, sync::Mutex, time::Duration};

use nutbook_backend::core::external_open;
#[cfg(target_os = "windows")]
use nutbook_backend::core::cli::forward_external_open_via_ipc;
use nutbook_backend::{
    commands,
    core::cli::{deploy_bundled_cli, runtime_app_data_dir},
    core::html_runtime::dispatch_html_runtime_shortcut,
    db::Database,
    errors::AppError,
    models::AgentScopeDiscoveryPayload,
    state::AppState,
};
#[cfg(target_os = "windows")]
use nutbook_backend::core::cli::RELEASE_APP_IDENTIFIER;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, Submenu, SubmenuBuilder},
    Emitter, Manager,
};

const EXIT_PRESENTATION_MENU_ID: &str = "nutbook_exit_runtime_presentation";
const MENU_ADD_FOLDER_ID: &str = "nutbook_add_folder";
const MENU_ADD_FILE_ID: &str = "nutbook_add_file";
const MENU_SCAN_SKILLS_ID: &str = "nutbook_scan_skills";
const MENU_RESCAN_LIBRARY_ID: &str = "nutbook_rescan_library";
const MENU_TOGGLE_SIDEBAR_ID: &str = "nutbook_toggle_sidebar";
const MENU_SHOW_ALL_ID: &str = "nutbook_show_all";
const MENU_SHOW_RECENT_ID: &str = "nutbook_show_recent";
const MENU_SHOW_STARRED_ID: &str = "nutbook_show_starred";
const MENU_TOGGLE_OUTLINE_ID: &str = "nutbook_toggle_outline";
const MENU_UNDO_ID: &str = "nutbook_undo";
const MENU_REDO_ID: &str = "nutbook_redo";
const MAX_CLI_IPC_REQUEST_BYTES: u64 = 64 * 1024;

#[derive(Default)]
struct HtmlEditAppExitState {
    allow_exit_once: Mutex<bool>,
}

fn consume_html_edit_app_exit_allowance(app: &tauri::AppHandle) -> bool {
    let state = app.state::<HtmlEditAppExitState>();
    let Ok(mut allow_exit_once) = state.allow_exit_once.lock() else {
        return false;
    };
    if !*allow_exit_once {
        return false;
    }
    *allow_exit_once = false;
    true
}

fn request_html_edit_app_exit_decision(app: &tauri::AppHandle) {
    if let Some(webview) = app.get_webview("main") {
        let _ = webview.eval("window.__NUTBOOK_REQUEST_HTML_EDIT_APP_EXIT__?.();");
    }
}

#[tauri::command]
fn finalize_html_edit_app_exit_command(
    app: tauri::AppHandle,
    state: tauri::State<'_, HtmlEditAppExitState>,
) {
    if let Ok(mut allow_exit_once) = state.allow_exit_once.lock() {
        *allow_exit_once = true;
    }
    app.exit(0);
}

fn map_agent_discovery_error(
    database_path: &std::path::Path,
    operation: &str,
    error: AppError,
) -> AppError {
    match error {
        AppError::DatabaseError => {
            AppError::agent_discovery_database_unavailable(database_path, operation)
        }
        other => other,
    }
}

#[tauri::command]
async fn discover_agent_projects(
    state: tauri::State<'_, AppState>,
) -> Result<AgentScopeDiscoveryPayload, AppError> {
    let database_path = state.database.path().to_path_buf();
    commands::agent_projects::discover_agent_projects(state)
        .await
        .map_err(|error| map_agent_discovery_error(&database_path, "discover", error))
}

#[tauri::command]
fn get_cached_agent_projects(
    state: tauri::State<'_, AppState>,
) -> Result<Option<AgentScopeDiscoveryPayload>, AppError> {
    let database_path = state.database.path().to_path_buf();
    commands::agent_projects::get_cached_agent_projects(state)
        .map_err(|error| map_agent_discovery_error(&database_path, "load", error))
}

#[cfg(test)]
mod tests {
    use super::{map_agent_discovery_error, AppError};

    #[test]
    fn agent_discovery_database_mapping_keeps_actionable_cause() {
        let path = std::env::temp_dir().join(format!(
            "nutbook-agent-discovery-wrapper-missing-{}-{}.sqlite3",
            std::process::id(),
            std::thread::current().name().unwrap_or("test")
        ));
        let error = map_agent_discovery_error(&path, "discover", AppError::DatabaseError);

        assert_eq!(error.code(), "AGENT_DISCOVERY_DATABASE_UNAVAILABLE");
        assert!(error
            .to_string()
            .contains("database file is missing; restart Nutbook to recreate it"));
    }
}

fn main() {
    // PR B（5.1）：先收集 argv 中的外部打开路径；Windows 下若已有存活实例，
    // 经本地 IPC 整体转交后同步退出（不创建第二个主窗口、不走退出确认链路）。
    let cold_start_paths = collect_external_open_argv_paths();
    #[cfg(target_os = "windows")]
    if !cold_start_paths.is_empty() {
        if let Some(app_data) = windows_app_data_dir() {
            if forward_external_open_via_ipc(&app_data, &cold_start_paths)
                .ok()
                .flatten()
                .is_some()
            {
                std::process::exit(0);
            }
        }
    }
    // PR B（5.1）：冷启动路径在 setup 之前直接入进程级全局 inbox；一个请求
    // 整体保留，批次边界不得拆散；前端 ExternalOpenReady 后 drain。
    if !cold_start_paths.is_empty() {
        external_open::global_inbox().enqueue("cold_start", cold_start_paths);
    }

    tauri::Builder::default()
        .menu(|app| {
            let add_folder = MenuItemBuilder::with_id(MENU_ADD_FOLDER_ID, "添加文件夹")
                .accelerator("CmdOrCtrl+O")
                .build(app)?;
            let add_file = MenuItemBuilder::with_id(MENU_ADD_FILE_ID, "添加单文件")
                .accelerator("CmdOrCtrl+Shift+O")
                .build(app)?;
            let scan_skills = MenuItemBuilder::with_id(MENU_SCAN_SKILLS_ID, "扫描 Skill 产物")
                .build(app)?;
            let rescan_library = MenuItemBuilder::with_id(MENU_RESCAN_LIBRARY_ID, "重新扫描当前资料库")
                .accelerator("CmdOrCtrl+R")
                .build(app)?;
            let exit_presentation = MenuItemBuilder::with_id(
                EXIT_PRESENTATION_MENU_ID,
                "退出演示模式",
            )
            .accelerator("Esc")
            .build(app)?;
            let toggle_sidebar = MenuItemBuilder::with_id(MENU_TOGGLE_SIDEBAR_ID, "切换侧边栏")
                .accelerator("CmdOrCtrl+B")
                .build(app)?;
            let show_all = MenuItemBuilder::with_id(MENU_SHOW_ALL_ID, "所有文件")
                .accelerator("CmdOrCtrl+1")
                .build(app)?;
            let show_recent = MenuItemBuilder::with_id(MENU_SHOW_RECENT_ID, "最近文件")
                .accelerator("CmdOrCtrl+2")
                .build(app)?;
            let show_starred = MenuItemBuilder::with_id(MENU_SHOW_STARRED_ID, "收藏文件")
                .accelerator("CmdOrCtrl+3")
                .build(app)?;
            let toggle_outline = MenuItemBuilder::with_id(MENU_TOGGLE_OUTLINE_ID, "Markdown 大纲")
                .accelerator("CmdOrCtrl+Shift+B")
                .build(app)?;
            let undo = MenuItemBuilder::with_id(MENU_UNDO_ID, "撤销")
                .accelerator("CmdOrCtrl+Z")
                .build(app)?;
            let redo = MenuItemBuilder::with_id(MENU_REDO_ID, "重做")
                .accelerator("CmdOrCtrl+Shift+Z")
                .build(app)?;
            let app_menu = SubmenuBuilder::new(app, "NUTBOOK")
                .item(&PredefinedMenuItem::about(app, None, None)?)
                .separator()
                .item(&PredefinedMenuItem::services(app, None)?)
                .separator()
                .item(&PredefinedMenuItem::hide(app, None)?)
                .item(&PredefinedMenuItem::hide_others(app, None)?)
                .item(&PredefinedMenuItem::show_all(app, None)?)
                .separator()
                .item(&PredefinedMenuItem::quit(app, None)?)
                .build()?;
            let file_menu = Submenu::with_items(
                app,
                "文件",
                true,
                &[
                    &add_folder,
                    &add_file,
                    &scan_skills,
                    &PredefinedMenuItem::separator(app)?,
                    &rescan_library,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::close_window(app, None)?,
                ],
            )?;
            let edit_menu = Submenu::with_items(
                app,
                "编辑",
                true,
                &[
                    &undo,
                    &redo,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, None)?,
                    &PredefinedMenuItem::copy(app, None)?,
                    &PredefinedMenuItem::paste(app, None)?,
                    &PredefinedMenuItem::select_all(app, None)?,
                ],
            )?;
            let view_menu = Submenu::with_items(
                app,
                "视图",
                true,
                &[
                    &toggle_sidebar,
                    &PredefinedMenuItem::separator(app)?,
                    &show_all,
                    &show_recent,
                    &show_starred,
                    &PredefinedMenuItem::separator(app)?,
                    &toggle_outline,
                    &PredefinedMenuItem::separator(app)?,
                    &exit_presentation,
                ],
            )?;
            let window_menu = Submenu::with_items(
                app,
                "窗口",
                true,
                &[
                    &PredefinedMenuItem::minimize(app, None)?,
                    &PredefinedMenuItem::maximize(app, None)?,
                ],
            )?;
            MenuBuilder::new(app)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
                .item(&view_menu)
                .item(&window_menu)
                .build()
        })
        .on_menu_event(|app, event| {
            if commands::context_menu::dispatch(app, event.id().as_ref()) { return; }
            let native_history_key = match event.id().as_ref() {
                MENU_UNDO_ID => Some("CmdOrCtrl+Z"),
                MENU_REDO_ID => Some("CmdOrCtrl+Shift+Z"),
                _ => None,
            };
            if let Some(key) = native_history_key {
                let active_item = app.state::<AppState>().active_html_edit_item.lock().ok().and_then(|item| *item);
                if let Some(item_id) = active_item {
                    let _ = dispatch_html_runtime_shortcut(app, item_id, key);
                    return;
                }
            }
            if let Some(window) = app.get_webview_window("main") {
                let script = match event.id().as_ref() {
                    EXIT_PRESENTATION_MENU_ID => {
                        "window.__NUTBOOK_EXIT_RUNTIME_FULLSCREEN__?.('native-escape');"
                    }
                    MENU_ADD_FOLDER_ID => "window.__NUTBOOK_NATIVE_MENU__?.('add-folder');",
                    MENU_ADD_FILE_ID => "window.__NUTBOOK_NATIVE_MENU__?.('add-file');",
                    MENU_SCAN_SKILLS_ID => "window.__NUTBOOK_NATIVE_MENU__?.('scan-skills');",
                    MENU_RESCAN_LIBRARY_ID => "window.__NUTBOOK_NATIVE_MENU__?.('rescan-library');",
                    MENU_TOGGLE_SIDEBAR_ID => "window.__NUTBOOK_NATIVE_MENU__?.('toggle-sidebar');",
                    MENU_SHOW_ALL_ID => "window.__NUTBOOK_NATIVE_MENU__?.('show-all');",
                    MENU_SHOW_RECENT_ID => "window.__NUTBOOK_NATIVE_MENU__?.('show-recent');",
                    MENU_SHOW_STARRED_ID => "window.__NUTBOOK_NATIVE_MENU__?.('show-starred');",
                    MENU_TOGGLE_OUTLINE_ID => "window.__NUTBOOK_NATIVE_MENU__?.('toggle-outline');",
                    MENU_UNDO_ID => "window.__NUTBOOK_NATIVE_MENU__?.('undo');",
                    MENU_REDO_ID => "window.__NUTBOOK_NATIVE_MENU__?.('redo');",
                    _ => return,
                };
                let _ = window.eval(script);
            }
        })
        .setup(|app| {
            app.manage(commands::context_menu::ContextState::default());
            let app_data_dir = prepare_app_data_dir(app.handle())
                .expect("failed to prepare app data dir");
            let database_path = app_data_dir.join("nutbook.sqlite3");
            let database = Database::new(database_path)
                .expect("failed to initialize database");
            app.manage(AppState::new(database, app_data_dir.clone()));
            if let Err(error) = nutbook_backend::core::update::cleanup_update_cache(app.handle()) {
                eprintln!("Nutbook update-cache cleanup skipped: {error}");
            }
            let resource_dir = app.path().resource_dir().ok();
            if let Err(error) = deploy_bundled_cli(
                &app_data_dir,
                resource_dir.as_deref(),
            ) {
                eprintln!("Nutbook CLI deployment skipped: {error}");
            }
            if let Err(error) = start_cli_ipc_server(app.handle().clone(), app_data_dir) {
                eprintln!("Nutbook CLI IPC unavailable: {error}");
            }
            app.manage(HtmlEditAppExitState::default());
            Ok(())
        })
        .invoke_handler({
            // PR C Phase 1（D2=A，deny-by-default 中央闸门）：Tauri 2.10.3
            // 仅在 app 声明 ACL manifest 时才做 ACL 检查，NUTBOOK 没有 ——
            // 约 130 个自有命令对任何 webview 不设防（P0 探针 T12–T14 实证）。
            // 这里按真实 webview label 判定 caller 角色：
            // - 可信宿主面（main / App:// 宿主 overlay）：全量命令；
            // - 内容面（加载不可信 HTML 的 runtime/popup）：只允许演示翻页
            //   回报通道，其余一律拒绝；
            // - 未知 label：拒绝。
            // Box<dyn Fn> 为 generate_handler! 的展开闭包显式定型（推断需要）。
            let handler: Box<
                dyn Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool + Send + Sync,
            > = Box::new(tauri::generate_handler![
            commands::context_menu::show_context_menu,
            commands::context_menu::reveal_context_item,
            commands::context_menu::set_native_ui_language,
            commands::context_menu::context_find_in_document,
            get_cached_agent_projects,
            discover_agent_projects,
            commands::agent_projects::connect_agent_project,
            commands::agent_projects::preview_agent_project_artifacts,
            commands::agent_projects::preview_agent_project_artifacts_by_root,
            commands::agent_projects::accept_agent_artifact_groups,
            commands::agent_projects::accept_agent_artifact,
            commands::agent_projects::accept_agent_artifacts,
            commands::agent_projects::ignore_agent_artifact,
            commands::agent_projects::ignore_agent_artifacts,
            commands::agent_projects::exclude_agent_project_candidates,
            commands::agent_projects::restore_excluded_agent_project_candidates,
            commands::agent_projects::set_agent_project_discovery_rule,
            commands::agent_projects::refresh_agent_project,
            commands::agent_projects::merge_agent_task_scope,
            commands::nbskill::get_nbskill_agent_status,
            commands::nbskill::install_nbskill_agents,
            commands::nbskill::remove_nbskill_agents,
            commands::nbskill::repair_nbskill_agents,
            commands::library::list_libraries,
            commands::library::delete_library,
            commands::library::open_folder_dialog,
            commands::library::open_folder_dialog_at,
            commands::library::open_file_dialog,
            commands::library::open_library_location,
            commands::library::repair_library_root,
            commands::library::select_library,
            commands::library::scan_library,
            commands::library::preflight_folder_ingest_command,
            commands::library::start_folder_preflight,
            commands::library::folder_preflight_status,
            commands::library::cancel_folder_preflight,
            commands::library::start_folder_ingest,
            commands::library::folder_ingest_status,
            commands::library::cancel_folder_ingest,
            commands::library::watch_library,
            commands::library::sync_library_watchers,
            commands::skills::list_discovered_artifact_skills,
            commands::skills::exclude_skill_from_nutbook,
            commands::skills::restore_excluded_skill,
            commands::skills::bind_library_to_skill,
            commands::items::list_items,
            commands::items::suggest_items,
            commands::items::get_item_detail,
            commands::items::find_item_by_path,
            commands::items::toggle_item_favorite,
            commands::items::mark_item_opened,
            commands::items::remove_item_from_nutbook,
            commands::items::move_item_to_trash,
            commands::items::list_ignored_items,
            commands::items::restore_ignored_item,
            commands::items::sync_filesystem_state,
            commands::preview::get_item_preview,
            commands::preview::get_item_inspector_snapshot,
            commands::preview::get_item_content_revision,
            commands::preview::attach_inspector_more_overlay_command,
            commands::preview::close_inspector_more_overlay_command,
            commands::preview::get_cache_resource_info,
            commands::preview::close_html_window,
            commands::preview::close_markdown_overlay_command,
            commands::preview::copy_markdown_image_asset,
            commands::preview::delete_markdown_image_asset,
            commands::preview::copy_markdown_cover_asset,
            commands::preview::validate_markdown_cover_asset,
            commands::preview::release_markdown_cover_lease,
            commands::preview::open_html_window,
            commands::preview::open_html_detached_window,
            commands::preview::open_image_file_dialog,
            commands::preview::open_html_edit_image_file_dialog,
            commands::preview::attach_html_runtime_host_command,
            // P2：外部临时 HTML 的承载命令（与 item host 同一承载层）。
            commands::preview::attach_external_html_runtime_host_command,
            commands::preview::set_external_html_runtime_host_visibility_command,
            commands::preview::close_external_html_runtime_command,
            // P2 / 计划 §6.2：promotion 前的一次性 view state 采集与回报。
            commands::preview::capture_external_html_view_state_command,
            commands::preview::external_html_view_state_report_command,
            // revision 71：外部临时 HTML 的正文查找承载与受限脚本下发。
            commands::preview::attach_external_html_find_overlay_command,
            commands::preview::update_external_html_find_overlay_command,
            commands::preview::set_external_html_find_overlay_bounds_command,
            commands::preview::set_external_html_find_overlay_visibility_command,
            commands::preview::external_html_find_action_command,
            commands::preview::attach_html_presentation_preview_command,
            commands::preview::set_html_presentation_preview_visibility_command,
            commands::preview::set_html_presentation_preview_active_command,
            commands::preview::close_html_presentation_preview_command,
            commands::preview::attach_html_runtime_controls_overlay_command,
            commands::preview::attach_html_find_overlay_command,
            commands::preview::update_html_find_overlay_command,
            commands::preview::set_html_find_overlay_bounds_command,
            commands::preview::attach_html_edit_toolbar_overlay_command,
            commands::preview::attach_html_edit_leave_confirm_overlay_command,
            commands::preview::attach_settings_overlay_command,
            commands::preview::attach_markdown_controls_overlay_command,
            commands::preview::set_html_runtime_host_visibility_command,
            commands::preview::set_html_runtime_controls_overlay_visibility_command,
            commands::preview::set_html_find_overlay_visibility_command,
            commands::preview::set_html_edit_toolbar_overlay_visibility_command,
            commands::preview::close_html_edit_toolbar_overlay_command,
            commands::preview::close_html_edit_leave_confirm_overlay_command,
            commands::preview::eval_html_runtime_script_command,
            commands::preview::html_edit_runtime_message_command,
            commands::preview::html_runtime_view_state_command,
            commands::preview::set_window_fullscreen_command,
            commands::preview::is_window_minimized_command,
            commands::preview::dispatch_html_runtime_shortcut_command,
            commands::preview::focus_html_runtime_host_command,
            commands::preview::focus_main_webview_command,
            commands::html_edit::get_html_edit_converter_script,
            commands::html_edit::generate_presentation_thumbnail,
            commands::html_edit::get_html_edit_patch,
            commands::html_edit::save_html_edit_patch,
            commands::html_edit::commit_html_edit,
            commands::html_edit::save_html_edit_conflict_copy,
            commands::html_edit::import_html_edit_asset,
            commands::html_edit::register_html_edit_session_lease,
            commands::html_edit::invalidate_html_edit_session_lease,
            commands::html_edit::write_editable_html_copy,
            commands::preview::save_markdown_content,
            commands::preview::export_markdown_file,
            commands::tags::list_tags,
            commands::tags::create_tag,
            commands::tags::update_tag,
            commands::tags::delete_tag,
            commands::tags::set_item_tags,
            commands::thumbnails::generate_thumbnail,
            commands::thumbnails::get_thumbnail_backend_status,
            commands::thumbnails::set_system_chrome_thumbnail_enabled,
            commands::updates::get_update_settings,
            commands::updates::set_auto_check_updates_enabled,
            commands::updates::check_for_updates,
            commands::updates::download_and_install_update,
            commands::window::start_window_drag_command,
            commands::window::open_external_url_command,
            commands::external::external_open_ready,
            commands::external::external_open_drain,
            commands::external::external_open_enqueue,
            commands::external::external_session_resolve,
            commands::external::external_session_mark_opened_only,
            commands::external::external_session_close,
            commands::external::external_session_join,
            commands::external::external_session_save,
            commands::external::external_session_overwrite,
            commands::external::external_session_pick_save_target,
            commands::external::external_session_save_copy,
            commands::external::external_session_save_as,
            commands::external::external_session_attach_watch,
            commands::external::external_session_copy_image,
            commands::external::external_session_reload,
            commands::external::open_default_apps_panel,
            commands::external::external_default_app_guide_status,
            commands::external::external_default_app_guide_mark_done,
            commands::default_apps::default_app_status,
            commands::default_apps::set_default_app,
            finalize_html_edit_app_exit_command,
            ]);
            move |invoke: tauri::ipc::Invoke<tauri::Wry>| {
                let label = invoke.message.webview_ref().label().to_string();
                if !webview_may_invoke(&label, invoke.message.command()) {
                    invoke
                        .resolver
                        .reject(format!("command not allowed for webview '{label}'"));
                    return true;
                }
                handler(invoke)
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| match event {
            tauri::RunEvent::WindowEvent {
                label,
                event: tauri::WindowEvent::CloseRequested { api, .. },
                ..
            } if label == "main" => {
                if consume_html_edit_app_exit_allowance(app) {
                    return;
                }
                api.prevent_close();
                request_html_edit_app_exit_decision(app);
            }
            tauri::RunEvent::ExitRequested { api, .. } => {
                if consume_html_edit_app_exit_allowance(app) {
                    return;
                }
                api.prevent_exit();
                request_html_edit_app_exit_decision(app);
            }
            tauri::RunEvent::Exit => {
                if let Ok(directory) = prepare_app_data_dir(app) {
                    nutbook_backend::core::cli::remove_cli_ipc_endpoint_for_pid(&directory, std::process::id());
                }
            }
            // PR B（5.1）：macOS Finder 双击 / 打开方式 / 系统拖入（部分路径）。
            // 冷启动与热启动都走这里；请求整体入 inbox 并通知前端 drain。
            #[cfg(target_os = "macos")]
            tauri::RunEvent::Opened { urls } => {
                let paths = urls
                    .iter()
                    .filter_map(|url| url.to_file_path().ok())
                    .map(|path| path.to_string_lossy().to_string())
                    .collect::<Vec<_>>();
                if !paths.is_empty() {
                    // PR B（5.1）：Opened 事件可能在 setup（AppState manage）之前
                    // 送达，必须只触碰进程级全局 inbox，不得访问 state()。
                    external_open::global_inbox().enqueue("system_open", paths);
                    let _ = app.emit("nutbook-external-open", ());
                }
            }
            // PR B（3.6）：原生文件 Drop 统一在 Rust 侧 enqueue（main 与已登记
            // HTML 正文 surface），emit 既有 nutbook-external-open 通知前端
            // coordinator drain。Codex 复核（2026-09-09 P2）：唯一权威入口是
            // WebviewEvent——真实运行面（unstable 构建 + 宿主日志 diag-r6）
            // 只观察到 WebviewEvent 派发，无同一物理 Drop 双臂派发证据；
            // WindowEvent 臂已在上一轮删除，之前靠路径+时间去重兜底双投递
            // 属猜测性方案，已随时间过滤一并移除。
            tauri::RunEvent::WebviewEvent {
                label,
                event: tauri::WebviewEvent::DragDrop(drag),
                ..
            } => {
                if let tauri::DragDropEvent::Drop { paths, .. } = &drag {
                    enqueue_native_drag_drop(app, &label, paths);
                }
            }
            _ => {}
        });
}

// PR B（3.6）：允许 surface 的原生文件 Drop 统一 enqueue 一次并 emit 既有
// nutbook-external-open，复用 inbox/coordinator；surface 归属校验在后端
// enqueue_native_drop 内完成（格式 allowlist + 已登记 webview 且属于主窗口）。
/// PR C Phase 1（D2=A）：webview → 命令的角色判定表（deny-by-default）。
///
/// 可信宿主面（加载 App 内置资源的宿主 UI）允许全量命令：
/// - `main`：主 webview；
/// - `detached`：外部打开第二实例宿主窗口（external.rs，加载 index.html）；
/// - `settings-overlay`：设置浮层；
/// - `html-controls-` / `html-find-` / `inspector-more-` /
///   `html-edit-toolbar-` / `html-edit-leave-confirm-` 前缀：宿主 overlay。
///
/// 内容面（加载不可信用户 HTML 的 scoped origin webview）只允许四个命令
/// （R9/R10 修订 + P2 promotion 采集），且每个命令内部都会做会话登记 +
/// origin + 角色/lease 校验（`content_session_record` / `verify_bridge_message`），
/// 这里只是第一层命令名过滤：
/// - `html_edit_runtime_message_command`：演示翻页/转换回报通道（R9）；
/// - `write_editable_html_copy`：绑定真实 caller/session/generation、目标
///   服务端推导的最小写入操作（R10）；
/// - `html_runtime_view_state_command`：滚动状态回报（R10 恢复被误伤的
///   正常功能）。
/// - `external_html_view_state_report_command`：P2 §6.2 外部临时 HTML 在
///   promotion 前的一次性滚动/hash 回报（仅 External 角色可用）。
/// - `html-player-`（detached runtime 窗口）
/// - `html-host-`（内嵌 runtime host）
/// - `html-presentation-preview-`（演示预览）
/// - `html-runtime-popup-`（内容面 window.open 弹窗）
///
/// 其余（未知 label）一律拒绝。注意：PR C 不拦截导航/外链，本表只管
/// invoke 命令边界；新页面/弹窗仍按内容面 caller 对待。
fn webview_may_invoke(label: &str, command: &str) -> bool {
    if label == "main" || label == "detached" || label == "settings-overlay" {
        return true;
    }
    const TRUSTED_PREFIXES: [&str; 5] = [
        "html-controls-",
        "html-find-",
        "inspector-more-",
        "html-edit-toolbar-",
        "html-edit-leave-confirm-",
    ];
    if TRUSTED_PREFIXES.iter().any(|prefix| label.starts_with(prefix)) {
        return true;
    }
    const CONTENT_PREFIXES: [&str; 4] = [
        "html-player-",
        "html-host-",
        "html-presentation-preview-",
        "html-runtime-popup-",
    ];
    if CONTENT_PREFIXES.iter().any(|prefix| label.starts_with(prefix)) {
        matches!(
            command,
            "show_context_menu"
                | "context_find_in_document"
                | "html_edit_runtime_message_command"
                | "write_editable_html_copy"
                | "html_runtime_view_state_command"
                // P2 / §6.2：外部阅读面没有常驻 view-state 脚本，promotion 前
                // 的一次性采集靠这条专用回报命令（命令内按 External 角色 +
                // 会话/代次校验，语义只限「回传一次滚动/hash 快照」）。
                | "external_html_view_state_report_command"
        )
    } else {
        false
    }
}

fn enqueue_native_drag_drop(
    app: &tauri::AppHandle,
    label: &str,
    paths: &[std::path::PathBuf],
) {    let string_paths: Vec<String> = paths
        .iter()
        .map(|path| path.to_string_lossy().to_string())
        .collect();
    nutbook_backend::commands::external::enqueue_native_drop(app, label, string_paths);
}

fn start_cli_ipc_server(app: tauri::AppHandle, app_data_dir: PathBuf) -> io::Result<()> {
    let listener = TcpListener::bind("127.0.0.1:0")?;
    listener.set_nonblocking(false)?;
    let token = uuid::Uuid::new_v4().to_string();
    let endpoint = nutbook_backend::core::cli::CliIpcEndpoint {
        port: listener.local_addr()?.port(), token: token.clone(), pid: std::process::id(),
        started_at: chrono::Utc::now().to_rfc3339(),
    };
    nutbook_backend::core::cli::publish_cli_ipc_endpoint(&app_data_dir, &endpoint)?;
    std::thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            let cloned = match stream.try_clone() { Ok(stream) => stream, Err(_) => continue };
            if cloned.set_read_timeout(Some(Duration::from_secs(5))).is_err() { continue; }
            let mut line = String::new();
            let mut reader = BufReader::new(cloned).take(MAX_CLI_IPC_REQUEST_BYTES + 1);
            if reader.read_line(&mut line).is_err() || line.len() as u64 > MAX_CLI_IPC_REQUEST_BYTES || !line.ends_with('\n') { continue; }
            let result = match serde_json::from_str::<nutbook_backend::core::cli::CliIpcRequest>(&line) {
                Ok(wire) if wire.token == token => {
                    let state = app.state::<AppState>();
                    // PR B：第二实例打开请求转交——整体入 inbox（批次边界保留）
                    // 并通知前端 drain；不触发资料库 sync，也不进入 CLI 语义。
                    if wire.request.action == "external-open" {
                        external_open::global_inbox().enqueue(
                            "single_instance",
                            wire.request.paths.clone().unwrap_or_default(),
                        );
                        let _ = app.emit("nutbook-external-open", ());
                        Ok(nutbook_backend::core::cli::CliResponse {
                            status: "forwarded".to_string(),
                            path: wire.request.path.clone(),
                            library_id: None,
                            detail: None,
                        })
                    } else {
                        let result = nutbook_backend::core::cli::execute_with_app_state(&state, &wire.request);
                        if result.is_ok() { let _ = app.emit("nutbook-cli-sync", ()); }
                        result
                    }
                }
                _ => Err(nutbook_backend::core::cli::CliFailure { code: "ipc_unauthorized".to_string(), message: "Nutbook CLI IPC authentication failed".to_string() }),
            };
            let mut stream = stream;
            let _ = stream.write_all(serde_json::to_string(&result).unwrap_or_else(|_| "{\"Err\":{\"code\":\"app_ipc_unavailable\",\"message\":\"response encoding failed\"}}".to_string()).as_bytes());
            let _ = stream.write_all(b"\n");
        }
    });
    Ok(())
}

/// PR B（5.1）：冷启动 argv 解析。跳过程序名、flag、URL；只保留真实存在的
/// 文件/目录，以及带 Markdown/HTML 扩展名的参数（文件已被移走时保留请求，
/// 由 resolve 返回可见错误）。批次边界整体保留。
fn collect_external_open_argv_paths() -> Vec<String> {
    std::env::args()
        .skip(1)
        .filter(|arg| {
            !arg.starts_with('-')
                && !arg.contains("://")
        })
        .filter(|arg| {
            let path = PathBuf::from(arg);
            if path.exists() {
                return true;
            }
            path.extension()
                .and_then(|value| value.to_str())
                .map(|value| {
                    matches!(
                        value.to_ascii_lowercase().as_str(),
                        "md" | "markdown" | "html" | "htm"
                    )
                })
                .unwrap_or(false)
        })
        .collect()
}

#[cfg(target_os = "windows")]
fn windows_app_data_dir() -> Option<PathBuf> {
    if let Some(path) = std::env::var_os("NUTBOOK_APP_DATA_DIR") {
        return Some(PathBuf::from(path));
    }
    std::env::var_os("APPDATA")
        .map(|base| runtime_app_data_dir(PathBuf::from(base).join(RELEASE_APP_IDENTIFIER)))
}

fn prepare_app_data_dir(app: &tauri::AppHandle) -> io::Result<PathBuf> {
    let base_app_data_dir = if let Some(path) = std::env::var_os("NUTBOOK_APP_DATA_DIR") {
        PathBuf::from(path)
    } else {
        app.path()
            .app_data_dir()
            .map_err(|error| io::Error::new(io::ErrorKind::Other, error))?
    };
    let app_data_dir = runtime_app_data_dir(base_app_data_dir);
    fs::create_dir_all(&app_data_dir)?;
    Ok(app_data_dir)
}
