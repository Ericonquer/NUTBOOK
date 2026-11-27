use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{
    menu::{MenuBuilder, MenuItem, MenuItemBuilder},
    tray::TrayIconBuilder,
    AppHandle, Manager, Wry,
};

static CAPTURE_PENDING: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub fn take_pending_nut_capture(webview: tauri::Webview) -> bool {
    webview.label() == "main" && CAPTURE_PENDING.swap(false, Ordering::AcqRel)
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
    "⌘⌥N"
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
    reveal(app)?;
    CAPTURE_PENDING.store(true, Ordering::Release);
    if let Some(page) = app.get_webview("main") {
        page.eval("window.__NUTBOOK_CAPTURE__?.();")?;
    }
    Ok(())
}

pub fn install(app: &AppHandle) -> tauri::Result<()> {
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
