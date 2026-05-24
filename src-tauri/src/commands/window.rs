use crate::errors::AppError;
use serde::Deserialize;
use std::process::Command;

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
        Command::new("open")
            .arg(parsed.as_str())
            .spawn()
            .map_err(|_| AppError::InternalError)?;
        return Ok(true);
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = parsed;
        Err(AppError::UnsupportedFileType)
    }
}
