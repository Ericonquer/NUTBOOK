use crate::errors::AppError;
use serde::Deserialize;
use std::path::Path;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenExternalUrlRequest {
    pub url: String,
}

#[tauri::command]
pub fn start_window_drag_command(window: tauri::Window) -> Result<bool, AppError> {
    window.start_dragging().map_err(|_| AppError::InternalError)?;
    Ok(true)
}

#[tauri::command]
pub fn open_external_url_command(payload: OpenExternalUrlRequest) -> Result<bool, AppError> {
    let parsed = url::Url::parse(payload.url.trim()).map_err(|_| AppError::InvalidParams)?;
    if !matches!(parsed.scheme(), "http" | "https") {
        return Err(AppError::InvalidParams);
    }

    #[cfg(target_os = "macos")]
    {
        crate::core::platform::command("open")
            .arg(parsed.as_str())
            .spawn()
            .map_err(|_| AppError::InternalError)?;
        return Ok(true);
    }

    #[cfg(target_os = "windows")]
    {
        crate::core::platform::open_shell(parsed.as_str()).map_err(|_| AppError::InternalError)?;
        Ok(true)
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = parsed;
        Err(AppError::UnsupportedFileType)
    }
}

/// This deliberately is not a Tauri command. The caller must provide a file that
/// was just downloaded into the canonical update cache directory.
pub fn open_downloaded_installer(cache_dir: &Path, installer_path: &Path) -> Result<(), AppError> {
    let canonical_cache = cache_dir.canonicalize().map_err(|_| AppError::IoError)?;
    let canonical_installer = installer_path
        .canonicalize()
        .map_err(|_| AppError::IoError)?;
    if !canonical_installer.starts_with(&canonical_cache) || !canonical_installer.is_file() {
        return Err(AppError::UpdateFailed(
            "installer is outside the managed update cache".to_string(),
        ));
    }

    #[cfg(target_os = "macos")]
    {
        let status = crate::core::platform::command("open")
            .arg(&canonical_installer)
            .status()
            .map_err(|_| AppError::UpdateFailed("could not open the downloaded DMG".to_string()))?;
        if !status.success() {
            return Err(AppError::UpdateFailed("could not open the downloaded DMG".to_string()));
        }
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        crate::core::platform::open_shell(&canonical_installer)
            .map_err(|_| AppError::UpdateFailed("could not start the downloaded installer".into()))?;
        return Ok(());
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = canonical_installer;
        Err(AppError::UnsupportedFileType)
    }
}
