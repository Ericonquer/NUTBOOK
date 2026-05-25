use std::{
    cmp::Ordering,
    fs,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};

use crate::{
    errors::AppError,
    models::{GitHubRelease, UpdateCheckResponse, UpdateSettings},
};

const LATEST_RELEASE_URL: &str =
    "https://api.github.com/repos/leeeric202666-prog/NUTBOOK/releases/latest";

fn parse_version_parts(version: &str) -> Option<Vec<u64>> {
    let normalized = version.trim().trim_start_matches(['v', 'V']);
    if normalized.is_empty() {
        return None;
    }

    normalized
        .split(['.', '-'])
        .next()
        .and_then(|_| {
            normalized
                .split('.')
                .map(|part| {
                    let numeric = part
                        .chars()
                        .take_while(|character| character.is_ascii_digit())
                        .collect::<String>();
                    if numeric.is_empty() {
                        None
                    } else {
                        numeric.parse::<u64>().ok()
                    }
                })
                .collect::<Option<Vec<_>>>()
        })
        .filter(|parts| !parts.is_empty())
}

pub fn compare_release_versions(current: &str, latest: &str) -> Option<Ordering> {
    let mut current_parts = parse_version_parts(current)?;
    let mut latest_parts = parse_version_parts(latest)?;
    let len = current_parts.len().max(latest_parts.len());
    current_parts.resize(len, 0);
    latest_parts.resize(len, 0);
    Some(latest_parts.cmp(&current_parts))
}

pub fn load_update_settings(path: &Path) -> Result<UpdateSettings, AppError> {
    if !path.exists() {
        return Ok(UpdateSettings::default());
    }
    let raw = fs::read_to_string(path).map_err(|_| AppError::IoError)?;
    serde_json::from_str::<UpdateSettings>(&raw).map_err(|_| AppError::InvalidParams)
}

pub fn save_update_settings(path: &Path, settings: &UpdateSettings) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|_| AppError::IoError)?;
    }
    let raw = serde_json::to_string_pretty(settings).map_err(|_| AppError::InternalError)?;
    fs::write(path, raw).map_err(|_| AppError::IoError)
}

pub fn current_timestamp_string() -> Option<String> {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .ok()?
        .as_secs();
    Some(seconds.to_string())
}

pub fn fetch_latest_github_release() -> Result<GitHubRelease, String> {
    let response = ureq::get(LATEST_RELEASE_URL)
        .set("User-Agent", "Nutbook Update Checker")
        .set("Accept", "application/vnd.github+json")
        .call()
        .map_err(|error| error.to_string())?;
    response
        .into_json::<GitHubRelease>()
        .map_err(|error| error.to_string())
}

pub fn build_update_response(
    current_version: &str,
    release: Option<&GitHubRelease>,
    checked_at: Option<String>,
    error: Option<String>,
) -> UpdateCheckResponse {
    if let Some(error) = error {
        return UpdateCheckResponse {
            current_version: current_version.to_string(),
            latest_version: None,
            release_url: None,
            has_update: false,
            checked_at,
            status: "error".to_string(),
            error: Some(error),
        };
    }

    let Some(release) = release else {
        return UpdateCheckResponse {
            current_version: current_version.to_string(),
            latest_version: None,
            release_url: None,
            has_update: false,
            checked_at,
            status: "unavailable".to_string(),
            error: None,
        };
    };

    if release.draft {
        return UpdateCheckResponse {
            current_version: current_version.to_string(),
            latest_version: Some(release.tag_name.clone()),
            release_url: Some(release.html_url.clone()),
            has_update: false,
            checked_at,
            status: "unavailable".to_string(),
            error: Some("latest release is a draft".to_string()),
        };
    }

    match compare_release_versions(current_version, &release.tag_name) {
        Some(Ordering::Greater) => UpdateCheckResponse {
            current_version: current_version.to_string(),
            latest_version: Some(release.tag_name.clone()),
            release_url: Some(release.html_url.clone()),
            has_update: true,
            checked_at,
            status: "available".to_string(),
            error: None,
        },
        Some(Ordering::Equal | Ordering::Less) => UpdateCheckResponse {
            current_version: current_version.to_string(),
            latest_version: Some(release.tag_name.clone()),
            release_url: Some(release.html_url.clone()),
            has_update: false,
            checked_at,
            status: "current".to_string(),
            error: None,
        },
        None => UpdateCheckResponse {
            current_version: current_version.to_string(),
            latest_version: Some(release.tag_name.clone()),
            release_url: Some(release.html_url.clone()),
            has_update: false,
            checked_at,
            status: "unavailable".to_string(),
            error: Some("release version is not comparable".to_string()),
        },
    }
}

#[cfg(test)]
mod tests {
    use std::cmp::Ordering;

    use crate::models::UpdateSettings;

    use super::{compare_release_versions, load_update_settings, save_update_settings};

    #[test]
    fn compare_versions_handles_v_prefix_and_numeric_parts() {
        assert_eq!(
            compare_release_versions("0.3.0", "v0.3.1"),
            Some(Ordering::Greater)
        );
        assert_eq!(
            compare_release_versions("0.3.1", "v0.3.1"),
            Some(Ordering::Equal)
        );
        assert_eq!(
            compare_release_versions("0.4.0", "v0.3.9"),
            Some(Ordering::Less)
        );
    }

    #[test]
    fn default_update_settings_enable_auto_check() {
        let settings = UpdateSettings::default();
        assert!(settings.auto_check_enabled);
        assert!(settings.last_checked_at.is_none());
    }

    #[test]
    fn update_settings_round_trip_persists_auto_check_preference() {
        let path = std::env::temp_dir().join(format!(
            "nutbook-update-settings-{}.json",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("time should be valid")
                .as_nanos()
        ));
        let mut settings = UpdateSettings::default();
        settings.auto_check_enabled = false;
        settings.last_checked_at = Some("2026-05-24T00:00:00Z".to_string());

        save_update_settings(&path, &settings).expect("settings should save");
        let loaded = load_update_settings(&path).expect("settings should load");

        assert!(!loaded.auto_check_enabled);
        assert_eq!(
            loaded.last_checked_at.as_deref(),
            Some("2026-05-24T00:00:00Z")
        );
        let _ = std::fs::remove_file(path);
    }
}
