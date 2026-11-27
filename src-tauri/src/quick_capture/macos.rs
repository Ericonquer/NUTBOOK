use super::{capture, AppHandle};
use std::sync::OnceLock;

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
