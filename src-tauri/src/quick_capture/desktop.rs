use super::{capture, AppHandle};
use global_hotkey::{
    hotkey::{Code, HotKey, Modifiers},
    GlobalHotKeyEvent, GlobalHotKeyManager, HotKeyState,
};
use std::cell::RefCell;
// Win32 binds its message window to the event-loop thread.
thread_local! {
    static REGISTRATION: RefCell<Option<(GlobalHotKeyManager, HotKey)>> = const { RefCell::new(None) };
}

pub(super) fn register_shortcut(app: &AppHandle) -> global_hotkey::Result<()> {
    let key = HotKey::new(Some(Modifiers::CONTROL | Modifiers::ALT), Code::KeyN);
    let manager = GlobalHotKeyManager::new()?;
    manager.register(key)?;
    let app = app.clone();
    GlobalHotKeyEvent::set_event_handler(Some(move |event: GlobalHotKeyEvent| {
        if event.id == key.id() && event.state == HotKeyState::Pressed {
            if let Err(error) = capture(&app) {
                eprintln!("NUTBOOK capture: {error}");
            }
        }
    }));
    REGISTRATION.with(|entry| entry.replace(Some((manager, key))));
    Ok(())
}

pub(super) fn release_shortcut() {
    REGISTRATION.with(|entry| {
        if let Some((manager, key)) = entry.take() {
            let _ = manager.unregister(key);
        }
    });
}
