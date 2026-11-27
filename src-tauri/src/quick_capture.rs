use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};

use tauri::{
    menu::{MenuBuilder, MenuItem, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Manager, Webview, WebviewUrl, WebviewWindowBuilder, Wry,
};

pub const WINDOW: &str = "quick-nut";
static GENERATION: AtomicU32 = AtomicU32::new(0);
static ENGLISH: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub fn quick_nut_generation() -> u32 {
    GENERATION.load(Ordering::Acquire)
}

#[tauri::command]
pub fn quick_nut_language() -> bool {
    ENGLISH.load(Ordering::Acquire)
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WindowAction {
    Drag,
    Pin,
    Unpin,
    Hide,
}

#[tauri::command]
pub fn quick_nut_window_action(
    webview: Webview,
    action: WindowAction,
    generation: u32,
) -> Result<(), String> {
    if webview.label() != WINDOW {
        return Err("Quick NUT window only".into());
    }
    let window = webview.window();
    let result = match action {
        WindowAction::Drag => window.start_dragging(),
        WindowAction::Pin => window.set_always_on_top(true),
        WindowAction::Unpin => window.set_always_on_top(false),
        WindowAction::Hide if generation == quick_nut_generation() => {
            #[cfg(target_os = "macos")]
            let was_focused = window.is_focused().unwrap_or(false);
            let result = window.hide();
            #[cfg(target_os = "macos")]
            if was_focused && result.is_ok() {
                platform::restore_previous_app();
            }
            result
        }
        WindowAction::Hide => Ok(()),
    };
    result.map_err(|error| error.to_string())
}

#[tauri::command]
pub fn notify_quick_nut_saved(webview: Webview, app: AppHandle, board_id: String) {
    if webview.label() == WINDOW {
        if let Some(main) = app.get_webview("main") {
            let board_id = serde_json::to_string(&board_id).unwrap_or_default();
            let _ = main.eval(format!("window.__NUTBOOK_QUICK_NUT_SAVED__?.({board_id});"));
        }
    }
}

pub fn hide_for_quit(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(WINDOW) {
        let _ = window.hide();
    }
}

pub fn request_close(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(WINDOW) {
        let _ = window.eval("window.__NUTBOOK_QUICK_NUT_CLOSE__?.();");
    }
}

const CAPTURE: &str = "nuts_tray_capture";
const SHOW: &str = "nuts_tray_show";
const QUIT: &str = "nuts_tray_quit";
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
use macos as platform;
#[cfg(not(target_os = "macos"))]
mod desktop;
#[cfg(not(target_os = "macos"))]
use desktop as platform;

pub fn release_shortcut() {
    platform::release_shortcut();
}

const KEY_LABEL: &str = if cfg!(target_os = "macos") {
    "Control + N"
} else {
    "Ctrl+Alt+N"
};

pub struct CaptureMenu {
    capture: MenuItem<Wry>,
    show: MenuItem<Wry>,
    quit: MenuItem<Wry>,
    registered: bool,
}

impl CaptureMenu {
    pub fn localize(&self, english: bool) -> tauri::Result<()> {
        ENGLISH.store(english, Ordering::Release);
        let action = if english { "New NUT" } else { "记 NUT" };
        let status = if self.registered {
            KEY_LABEL
        } else if english {
            "shortcut unavailable"
        } else {
            "快捷键不可用"
        };
        self.capture.set_text(format!("{action} ({status})"))?;
        self.show.set_text(if english {
            "Show NUTBOOK"
        } else {
            "显示 NUTBOOK"
        })?;
        self.quit.set_text(if english {
            "Quit NUTBOOK"
        } else {
            "退出 NUTBOOK"
        })
    }
}

pub fn reveal(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_window("main") {
        #[cfg(target_os = "macos")]
        app.show()?;
        window.unminimize()?;
        window.show()?;
        window.set_focus()?;
    }
    Ok(())
}

fn capture(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window(WINDOW) {
        #[cfg(target_os = "macos")]
        platform::remember_previous_app(window.is_visible().unwrap_or(false));
        let generation = GENERATION.fetch_add(1, Ordering::AcqRel).wrapping_add(1);
        window.eval(format!(
            "window.__NUTBOOK_QUICK_NUT_OPEN__?.({generation});"
        ))?;
        window.show()?;
        window.set_focus()?;
    }
    Ok(())
}

pub fn install(app: &AppHandle) -> tauri::Result<()> {
    WebviewWindowBuilder::new(app, WINDOW, WebviewUrl::App("quick-nut.html".into()))
        .title("NUTBOOK")
        .inner_size(380.0, 328.0)
        .center()
        .visible_on_all_workspaces(true)
        .visible(false)
        .focused(false)
        .resizable(false)
        .decorations(false)
        .transparent(true)
        .background_color(tauri::webview::Color(0, 0, 0, 0))
        .shadow(false)
        .skip_taskbar(true)
        .accept_first_mouse(true)
        .build()?;
    let item = MenuItemBuilder::with_id(CAPTURE, "记 NUT").build(app)?;
    let show = MenuItemBuilder::with_id(SHOW, "显示 NUTBOOK").build(app)?;
    let quit = MenuItemBuilder::with_id(QUIT, "退出 NUTBOOK").build(app)?;
    let menu = MenuBuilder::new(app)
        .item(&item)
        .item(&show)
        .separator()
        .item(&quit)
        .build()?;
    let mut tray = TrayIconBuilder::with_id("nuts-capture")
        .tooltip("NUTBOOK")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            let result = match event.id().as_ref() {
                CAPTURE => capture(app),
                SHOW => reveal(app),
                QUIT => {
                    app.exit(0);
                    Ok(())
                }
                _ => return,
            };
            if let Err(error) = result {
                eprintln!("NUTBOOK tray action: {error}");
            }
        });
    #[cfg(target_os = "macos")]
    {
        // Template mask from the compact brand mark in assets/nb-logo.png.
        let icon = image::load_from_memory_with_format(
            include_bytes!("../icons/nutbook-menu-bar.png"),
            image::ImageFormat::Png,
        )
        .map_err(|error| std::io::Error::new(std::io::ErrorKind::InvalidData, error))?
        .into_rgba8();
        let (width, height) = icon.dimensions();
        tray = tray
            .icon(tauri::image::Image::new_owned(
                icon.into_raw(),
                width,
                height,
            ))
            .icon_as_template(true);
    }
    #[cfg(not(target_os = "macos"))]
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    let shortcut = platform::register_shortcut(app);
    if let Err(error) = &shortcut {
        eprintln!("NUTBOOK shortcut {KEY_LABEL}: {error}");
    }
    let state = CaptureMenu {
        capture: item,
        show,
        quit,
        registered: shortcut.is_ok(),
    };
    app.manage(state);
    app.state::<CaptureMenu>().localize(false)
}
