use crate::{
    commands::window::open_downloaded_installer,
    core::update::{
        build_update_response, download_and_verify_update, fetch_latest_github_release,
    },
    errors::AppError,
    models::{
        CheckForUpdatesRequest, DownloadAndInstallUpdateRequest, SetAutoCheckUpdatesRequest,
        UpdateCheckResponse, UpdateSettings,
    },
    state::AppState,
};

#[tauri::command]
pub fn get_update_settings(
    state: tauri::State<'_, AppState>,
) -> Result<UpdateSettings, AppError> {
    state.update_settings()
}

#[tauri::command]
pub fn set_auto_check_updates_enabled(
    state: tauri::State<'_, AppState>,
    payload: SetAutoCheckUpdatesRequest,
) -> Result<UpdateSettings, AppError> {
    state.set_auto_check_updates_enabled(payload.enabled)
}

#[tauri::command]
pub async fn check_for_updates(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: Option<CheckForUpdatesRequest>,
) -> Result<UpdateCheckResponse, AppError> {
    let request = payload.unwrap_or(CheckForUpdatesRequest {
        force: false,
        checked_at: None,
    });
    let settings = state.update_settings()?;
    let current_version = app.package_info().version.to_string();
    let checked_at = request
        .checked_at
        .clone()
        .or_else(crate::core::update::current_timestamp_string);

    if !settings.auto_check_enabled && !request.force {
        return Ok(UpdateCheckResponse {
            current_version,
            latest_version: settings.last_known_latest_version,
            release_url: settings.last_known_release_url,
            release_notes: settings.last_known_release_notes,
            has_update: false,
            checked_at: settings.last_checked_at,
            status: "disabled".to_string(),
            error: None,
            candidate: None,
        });
    }

    let release = tauri::async_runtime::spawn_blocking(fetch_latest_github_release)
        .await
        .map_err(|_| AppError::InternalError)?;

    let mut next_settings = settings;
    next_settings.last_checked_at = checked_at.clone();

    match release {
        Ok(release) => {
            next_settings.last_known_latest_version = Some(release.tag_name.clone());
            next_settings.last_known_release_url = Some(release.html_url.clone());
            next_settings.last_known_release_notes = Some(release.body.clone());
            state.save_update_settings(&next_settings)?;
            Ok(build_update_response(
                &current_version,
                Some(&release),
                checked_at,
                None,
            ))
        }
        Err(message) => {
            state.save_update_settings(&next_settings)?;
            Ok(UpdateCheckResponse {
                current_version,
                latest_version: next_settings.last_known_latest_version,
                release_url: next_settings.last_known_release_url,
                release_notes: next_settings.last_known_release_notes,
                has_update: false,
                checked_at,
                status: "error".to_string(),
                error: Some(message),
                candidate: None,
            })
        }
    }
}

#[tauri::command]
pub async fn download_and_install_update(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    payload: DownloadAndInstallUpdateRequest,
) -> Result<bool, AppError> {
    state.begin_update_download()?;
    let current_version = app.package_info().version.to_string();
    let app_for_download = app.clone();
    let tag = payload.tag;
    let asset_key = payload.asset_key;
    let task = tauri::async_runtime::spawn_blocking(move || {
        let (cache_dir, installer_path) =
            download_and_verify_update(&app_for_download, &current_version, &tag, &asset_key)?;
        open_downloaded_installer(&cache_dir, &installer_path)
    })
    .await;
    state.finish_update_download();
    let result = task.map_err(|_| AppError::InternalError)?;
    result?;
    Ok(true)
}
