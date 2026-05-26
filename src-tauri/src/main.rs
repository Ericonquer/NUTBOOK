use std::{fs, io, path::{Path, PathBuf}};

use nutbook_backend::{
    commands,
    db::Database,
    state::AppState,
};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, Submenu, SubmenuBuilder},
    Manager,
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

fn main() {
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
            let app_data_dir = prepare_app_data_dir(app.handle())
                .expect("failed to prepare app data dir");
            let database_path = app_data_dir.join("nutbook.sqlite3");
            migrate_development_database_if_needed(&database_path)
                .expect("failed to prepare database path");
            let database = Database::new(database_path)
                .expect("failed to initialize database");
            app.manage(AppState::new(database, app_data_dir));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::library::list_libraries,
            commands::library::delete_library,
            commands::library::open_folder_dialog,
            commands::library::open_folder_dialog_at,
            commands::library::open_file_dialog,
            commands::library::open_library_location,
            commands::library::repair_library_root,
            commands::library::select_library,
            commands::library::scan_library,
            commands::library::watch_library,
            commands::skills::list_discovered_artifact_skills,
            commands::skills::exclude_skill_from_nutbook,
            commands::skills::restore_excluded_skill,
            commands::skills::bind_library_to_skill,
            commands::items::list_items,
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
            commands::preview::get_local_server_origin,
            commands::preview::close_html_window,
            commands::preview::close_markdown_overlay_command,
            commands::preview::open_html_window,
            commands::preview::open_html_detached_window,
            commands::preview::attach_html_runtime_host_command,
            commands::preview::attach_html_runtime_controls_overlay_command,
            commands::preview::attach_settings_overlay_command,
            commands::preview::attach_markdown_controls_overlay_command,
            commands::preview::set_html_runtime_host_visibility_command,
            commands::preview::set_html_runtime_controls_overlay_visibility_command,
            commands::preview::set_window_fullscreen_command,
            commands::preview::dispatch_html_runtime_shortcut_command,
            commands::preview::focus_html_runtime_host_command,
            commands::preview::focus_main_webview_command,
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
            commands::window::start_window_drag_command,
            commands::window::open_external_url_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn prepare_app_data_dir(app: &tauri::AppHandle) -> io::Result<PathBuf> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| io::Error::new(io::ErrorKind::Other, error))?;
    fs::create_dir_all(&app_data_dir)?;
    Ok(app_data_dir)
}

fn migrate_development_database_if_needed(database_path: &Path) -> io::Result<()> {
    if database_path.exists() {
        return Ok(());
    }

    let Some(dev_database_path) = development_database_path() else {
        return Ok(());
    };
    if dev_database_path == database_path || !dev_database_path.is_file() {
        return Ok(());
    }

    fs::copy(dev_database_path, database_path)?;
    Ok(())
}

fn development_database_path() -> Option<PathBuf> {
    let cwd = std::env::current_dir().ok()?;
    let candidate = if cwd.file_name().and_then(|name| name.to_str()) == Some("src-tauri") {
        cwd.join("nutbook-dev.sqlite3")
    } else {
        cwd.join("src-tauri").join("nutbook-dev.sqlite3")
    };
    Some(candidate)
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    #[test]
    fn development_database_path_points_to_src_tauri_dev_database() {
        let path = super::development_database_path().expect("path should resolve");
        assert_eq!(
            path.file_name().and_then(|name| name.to_str()),
            Some("nutbook-dev.sqlite3")
        );
        assert!(
            path.ends_with(PathBuf::from("src-tauri").join("nutbook-dev.sqlite3"))
                || path.ends_with("nutbook-dev.sqlite3")
        );
    }
}
