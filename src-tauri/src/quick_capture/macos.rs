use super::{capture, AppHandle};
use objc2::{rc::Retained, runtime::NSObjectProtocol};
use objc2_app_kit::{NSApplicationActivationOptions, NSRunningApplication, NSWorkspace};
use std::sync::{Mutex, OnceLock};

static APP: OnceLock<AppHandle> = OnceLock::new();

extern "C" {
    fn nut_capture_register(callback: extern "C" fn()) -> i32;
    fn nut_capture_unregister();
}

extern "C" fn pressed() {
    if let Some(app) = APP.get() {
        if let Err(error) = capture(app) {
            eprintln!("NUTBOOK capture: {error}");
        }
    }
}

pub(super) fn register_shortcut(app: &AppHandle) -> Result<(), i32> {
    APP.get_or_init(|| app.clone());
    // Carbon installs the handler on the current (Tauri setup) main thread.
    match unsafe { nut_capture_register(pressed) } {
        0 => Ok(()),
        status => Err(status),
    }
}

pub(super) fn release_shortcut() {
    unsafe { nut_capture_unregister() };
}

static PREVIOUS_APP: Mutex<Option<Retained<NSRunningApplication>>> = Mutex::new(None);

pub(super) fn remember_previous_app(window_visible: bool) {
    let own_app = NSRunningApplication::currentApplication();
    let previous = NSWorkspace::sharedWorkspace()
        .frontmostApplication()
        .filter(|app| !app.isEqual(Some(&own_app)));
    if previous.is_some() || !window_visible {
        *PREVIOUS_APP.lock().unwrap() = previous;
    }
}

pub(super) fn restore_previous_app() {
    let previous = PREVIOUS_APP.lock().unwrap().take();
    if let Some(app) = previous {
        let _ = app.activateWithOptions(NSApplicationActivationOptions::empty());
    }
}
