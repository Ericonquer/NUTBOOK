use std::{
    path::PathBuf,
    sync::mpsc,
    thread,
    time::Duration,
};

use notify::{Config, Event, PollWatcher, RecursiveMode, Watcher};

use crate::{
    commands::library::scan_library_once,
    db::Database,
    errors::AppError,
    models::Library,
};

pub fn build_library_watcher(
    database: Database,
    library: Library,
) -> Result<PollWatcher, AppError> {
    let (tx, rx) = mpsc::channel::<notify::Result<Event>>();
    let root_path = PathBuf::from(&library.root_path);
    let recursive_mode = if library.source_kind == "file" {
        RecursiveMode::NonRecursive
    } else {
        RecursiveMode::Recursive
    };
    let callback_tx = tx.clone();

    let mut watcher = PollWatcher::new(
        move |result| {
            let _ = callback_tx.send(result);
        },
        Config::default()
            .with_poll_interval(Duration::from_millis(300))
            .with_compare_contents(true),
    )
    .map_err(|_| AppError::InternalError)?;

    watcher
        .watch(&root_path, recursive_mode)
        .map_err(|_| AppError::IoError)?;

    thread::spawn(move || {
        while rx.recv().is_ok() {
            while rx.recv_timeout(Duration::from_millis(250)).is_ok() {}
            let _ = scan_library_once(&database, library.id);
        }
    });

    Ok(watcher)
}
