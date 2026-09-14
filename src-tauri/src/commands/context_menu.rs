use crate::db::repositories::ItemRepository;
// Native contextual actions. Content webviews can request editing menus only;
// file actions are resolved by the trusted main page against its current item.
use std::sync::Mutex;
use tauri::{menu::{ContextMenu, Menu, MenuItem, PredefinedMenuItem}, Manager};

#[derive(Default)]
pub struct ContextState(pub Mutex<Option<PendingMenu>>, pub Mutex<String>);
pub struct PendingMenu {
    menu: Menu<tauri::Wry>,
    owner: String,
    token: String,
    actions: Vec<String>,
}

#[tauri::command]
pub async fn show_context_menu(app: tauri::AppHandle, webview: tauri::Webview, kind: String,
    token: String, language: Option<String>, selected: bool, favorite: Option<bool>) -> Result<(), String> {
    if token.len() > 80 || !token.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') { return Err("Invalid menu token".into()); }
    let trusted = webview.label() == "main";
    let kind = if trusted { kind.as_str() } else if kind == "edit" { "edit" } else { "read" };
    let saved_language = app.state::<ContextState>().1.lock().map_err(|_| "Language unavailable")?.clone();
    let en = language.as_deref().unwrap_or(&saved_language) == "en-US";
    let label = |zh, english| if en { english } else { zh };
    let menu = Menu::new(&app).map_err(|e| e.to_string())?;
    let mut actions = Vec::new();
    let mut add = |action: &str, text: &str, enabled: bool| -> Result<(), String> {
        let id = format!("context:{token}:{action}");
        let item = MenuItem::with_id(&app, id, text, enabled, None::<&str>).map_err(|e| e.to_string())?;
        menu.append(&item).map_err(|e| e.to_string())?;
        actions.push(action.to_string()); Ok(())
    };
    match kind {
        "file" => {
            add("open", label("打开", "Open"), true)?;
            add("favorite", if favorite.unwrap_or(false) { label("取消收藏", "Remove from Favorites") } else { label("收藏", "Add to Favorites") }, true)?;
            add("copy-path", label("复制路径", "Copy Path"), true)?;
            add("reveal", label("在文件管理器中显示", "Show in File Manager"), true)?;
        }
        "tab" => add("close-tab", label("关闭标签页", "Close Tab"), true)?,
        "app" => {
            add("add-folder", label("添加文件夹", "Add Folder"), true)?;
            add("add-file", label("添加文件", "Add File"), true)?;
            menu.append(&PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
            add("rescan-library", label("重新扫描资料库", "Rescan Library"), true)?;
        }
        _ => {
            if kind == "edit" {
                add("undo", label("撤销", "Undo"), true)?;
                add("redo", label("重做", "Redo"), true)?;
                menu.append(&PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
                menu.append(&PredefinedMenuItem::cut(&app, Some(label("剪切", "Cut"))).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
            }
            // Native responder actions preserve the focused editor and selection.
            if selected || kind == "edit" {
                menu.append(&PredefinedMenuItem::copy(&app, Some(label("复制", "Copy"))).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
            }
            if kind == "edit" {
                menu.append(&PredefinedMenuItem::paste(&app, Some(label("粘贴", "Paste"))).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
            }
            menu.append(&PredefinedMenuItem::select_all(&app, Some(label("全选", "Select All"))).map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
            add("find", label("正文搜索", "Find in Document"), true)?;
        }
    }
    *app.state::<ContextState>().0.lock().map_err(|_| "Menu state unavailable")? = Some(PendingMenu {
        menu: menu.clone(), owner: webview.label().into(), token, actions,
    });
    menu.popup(webview.window()).map_err(|e| e.to_string())
}

pub fn dispatch(app: &tauri::AppHandle, id: &str) -> bool {
    if !id.starts_with("context:") { return false; }
    let state = app.state::<ContextState>();
    let Ok(pending) = state.0.lock() else { return true; };
    let Some(entry) = pending.as_ref() else { return true; };
    let prefix = format!("context:{}:", entry.token);
    let Some(action) = id.strip_prefix(&prefix) else { return true; };
    if !entry.actions.iter().any(|a| a == action) { return true; }
    let script = format!("window.__NUTBOOK_CONTEXT_ACTION__?.({}, {});", serde_json::to_string(&entry.token).unwrap(), serde_json::to_string(action).unwrap());
    if let Some(owner) = app.get_webview(&entry.owner) { let _ = owner.eval(&script); }
    // Retain the native menu until the next request; its event can precede popup return.
    let _ = &entry.menu;
    true
}

#[tauri::command]
pub fn set_native_ui_language(app: tauri::AppHandle, webview: tauri::Webview, language: String) -> Result<(), String> {
    if webview.label() != "main" { return Err("Main page only".into()); }
    *app.state::<ContextState>().1.lock().map_err(|_| "Language unavailable")? = language;
    Ok(())
}

#[tauri::command]
pub fn context_find_in_document(app: tauri::AppHandle, webview: tauri::Webview) -> Result<(), String> {
    let state = app.state::<ContextState>();
    let pending = state.0.lock().map_err(|_| "Menu unavailable")?;
    if !pending.as_ref().is_some_and(|p| p.owner == webview.label() && p.actions.iter().any(|a| a == "find")) { return Err("No active context".into()); }
    if let Some(main) = app.get_webview("main") { main.eval("window.__NUTBOOK_CONTEXT_FIND__?.();").map_err(|e| e.to_string())?; }
    Ok(())
}

#[tauri::command]
pub fn reveal_context_item(state: tauri::State<'_, crate::state::AppState>, webview: tauri::Webview, item_id: i64) -> Result<(), String> {
    if webview.label() != "main" { return Err("Main page only".into()); }
    let item = state.get_item_detail(item_id).map_err(|e| e.to_string())?;
    let path = std::path::Path::new(&item.summary.file_path);
    if !path.is_file() { return Err("File no longer exists".into()); }
    #[cfg(target_os = "macos")]
    let result = std::process::Command::new("open").arg("-R").arg(path).status();
    #[cfg(target_os = "windows")]
    let result = std::process::Command::new("explorer.exe").arg(format!("/select,{}", path.display())).status();
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let result = std::process::Command::new("xdg-open").arg(path.parent().ok_or("No parent directory")?).status();
    result.map_err(|e| e.to_string())?.success().then_some(()).ok_or("Could not show file".into())
}
