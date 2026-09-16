use std::{
    cmp::Ordering,
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

use crate::{
    errors::AppError,
    models::{
        GitHubRelease, GitHubReleaseAsset, UpdateCandidate, UpdateCheckResponse,
        UpdateDownloadProgress, UpdateSettings,
    },
};

const GITHUB_REPOSITORY: &str = "Ericonquer/NUTBOOK";
const LATEST_RELEASE_URL: &str = "https://api.github.com/repos/Ericonquer/NUTBOOK/releases/latest";
const MAX_INSTALLER_SIZE: u64 = 2 * 1024 * 1024 * 1024;
const UPDATE_EVENT: &str = "update-download-progress";

#[derive(Debug, Clone, Copy)]
struct PlatformAssetSpec {
    key: &'static str,
    suffix: &'static str,
}

fn platform_asset_spec() -> Option<PlatformAssetSpec> {
    match (std::env::consts::OS, std::env::consts::ARCH) {
        ("macos", "aarch64") => Some(PlatformAssetSpec {
            key: "macos-aarch64-dmg",
            suffix: "_aarch64.dmg",
        }),
        ("macos", "x86_64") => Some(PlatformAssetSpec {
            key: "macos-x86_64-dmg",
            suffix: "_x64.dmg",
        }),
        ("windows", "x86_64") => Some(PlatformAssetSpec {
            key: "windows-x86_64-nsis",
            suffix: "_x64-setup.exe",
        }),
        _ => None,
    }
}

fn expected_asset_name(tag: &str, spec: PlatformAssetSpec) -> String {
    format!(
        "NUTBOOK_{}{}",
        tag.trim_start_matches(['v', 'V']),
        spec.suffix
    )
}

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
    Some(
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .ok()?
            .as_secs()
            .to_string(),
    )
}

fn github_agent() -> ureq::Agent {
    ureq::AgentBuilder::new()
        .timeout(Duration::from_secs(30))
        .build()
}

pub fn fetch_latest_github_release() -> Result<GitHubRelease, String> {
    github_agent()
        .get(LATEST_RELEASE_URL)
        .set("User-Agent", "Nutbook Update Checker")
        .set("Accept", "application/vnd.github+json")
        .call()
        .map_err(|error| error.to_string())?
        .into_json::<GitHubRelease>()
        .map_err(|error| error.to_string())
}

pub fn fetch_github_release_by_tag(tag: &str) -> Result<GitHubRelease, String> {
    if !tag.starts_with('v')
        || !tag[1..]
            .chars()
            .all(|character| character.is_ascii_digit() || character == '.')
    {
        return Err("invalid release tag".to_string());
    }
    let url = format!("https://api.github.com/repos/{GITHUB_REPOSITORY}/releases/tags/{tag}");
    github_agent()
        .get(&url)
        .set("User-Agent", "Nutbook Update Installer")
        .set("Accept", "application/vnd.github+json")
        .call()
        .map_err(|error| error.to_string())?
        .into_json::<GitHubRelease>()
        .map_err(|error| error.to_string())
}

fn release_candidate(release: &GitHubRelease) -> Option<UpdateCandidate> {
    let spec = platform_asset_spec()?;
    let expected_name = expected_asset_name(&release.tag_name, spec);
    let assets: Vec<&GitHubReleaseAsset> = release
        .assets
        .iter()
        .filter(|asset| {
            asset.name == expected_name && asset.size > 0 && asset.size <= MAX_INSTALLER_SIZE
        })
        .collect();
    (assets.len() == 1).then(|| UpdateCandidate {
        tag: release.tag_name.clone(),
        asset_key: spec.key.to_string(),
        name: expected_name,
        size: assets[0].size,
    })
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
            release_notes: None,
            has_update: false,
            checked_at,
            status: "error".to_string(),
            error: Some(error),
            candidate: None,
        };
    }
    let Some(release) = release else {
        return UpdateCheckResponse {
            current_version: current_version.to_string(),
            latest_version: None,
            release_url: None,
            release_notes: None,
            has_update: false,
            checked_at,
            status: "unavailable".to_string(),
            error: None,
            candidate: None,
        };
    };
    if release.draft || release.prerelease {
        return UpdateCheckResponse {
            current_version: current_version.to_string(),
            latest_version: Some(release.tag_name.clone()),
            release_url: Some(release.html_url.clone()),
            release_notes: Some(release.body.clone()),
            has_update: false,
            checked_at,
            status: "unavailable".to_string(),
            error: Some("latest release is not published".to_string()),
            candidate: None,
        };
    }

    match compare_release_versions(current_version, &release.tag_name) {
        Some(Ordering::Greater) => {
            let candidate = release_candidate(release);
            let error = candidate
                .is_none()
                .then(|| "this release has no supported installer for this device".to_string());
            UpdateCheckResponse {
                current_version: current_version.to_string(),
                latest_version: Some(release.tag_name.clone()),
                release_url: Some(release.html_url.clone()),
                release_notes: Some(release.body.clone()),
                has_update: true,
                checked_at,
                status: "available".to_string(),
                error,
                candidate,
            }
        }
        Some(Ordering::Equal | Ordering::Less) => UpdateCheckResponse {
            current_version: current_version.to_string(),
            latest_version: Some(release.tag_name.clone()),
            release_url: Some(release.html_url.clone()),
            release_notes: Some(release.body.clone()),
            has_update: false,
            checked_at,
            status: "current".to_string(),
            error: None,
            candidate: None,
        },
        None => UpdateCheckResponse {
            current_version: current_version.to_string(),
            latest_version: Some(release.tag_name.clone()),
            release_url: Some(release.html_url.clone()),
            release_notes: Some(release.body.clone()),
            has_update: false,
            checked_at,
            status: "unavailable".to_string(),
            error: Some("release version is not comparable".to_string()),
            candidate: None,
        },
    }
}

pub fn update_cache_dir(app: &AppHandle) -> Result<PathBuf, AppError> {
    let path = app
        .path()
        .app_cache_dir()
        .map_err(|_| AppError::IoError)?
        .join("updates");
    fs::create_dir_all(&path).map_err(|_| AppError::IoError)?;
    Ok(path)
}

pub fn cleanup_update_cache(app: &AppHandle) -> Result<(), AppError> {
    let directory = update_cache_dir(app)?;
    for entry in fs::read_dir(directory).map_err(|_| AppError::IoError)? {
        let entry = entry.map_err(|_| AppError::IoError)?;
        if entry.file_type().map_err(|_| AppError::IoError)?.is_file()
            || entry
                .file_type()
                .map_err(|_| AppError::IoError)?
                .is_symlink()
        {
            fs::remove_file(entry.path()).map_err(|_| AppError::IoError)?;
        }
    }
    Ok(())
}

fn checked_asset<'a>(
    release: &'a GitHubRelease,
    expected_name: &str,
) -> Result<&'a GitHubReleaseAsset, AppError> {
    let matches: Vec<&GitHubReleaseAsset> = release
        .assets
        .iter()
        .filter(|asset| asset.name == expected_name)
        .collect();
    if matches.len() != 1 || matches[0].size == 0 || matches[0].size > MAX_INSTALLER_SIZE {
        return Err(AppError::UpdateFailed(
            "release installer asset is missing, duplicated, or too large".to_string(),
        ));
    }
    Ok(matches[0])
}

fn checked_https_url(value: &str) -> Result<(), AppError> {
    let parsed = url::Url::parse(value)
        .map_err(|_| AppError::UpdateFailed("release asset URL is invalid".to_string()))?;
    let allowed_host = matches!(
        parsed.host_str(),
        Some(
            "github.com" | "objects.githubusercontent.com" | "release-assets.githubusercontent.com"
        )
    );
    if parsed.scheme() != "https" || !allowed_host {
        return Err(AppError::UpdateFailed(
            "release asset URL is not an approved HTTPS GitHub host".to_string(),
        ));
    }
    Ok(())
}

fn read_checksum(asset: &GitHubReleaseAsset) -> Result<String, AppError> {
    checked_https_url(&asset.browser_download_url)?;
    let response = github_agent()
        .get(&asset.browser_download_url)
        .call()
        .map_err(|error| AppError::UpdateFailed(format!("cannot download checksum: {error}")))?;
    let mut raw = String::new();
    response
        .into_reader()
        .take(256)
        .read_to_string(&mut raw)
        .map_err(|_| AppError::UpdateFailed("cannot read checksum".to_string()))?;
    let digest = raw.trim();
    if digest.len() != 64
        || !digest
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    {
        return Err(AppError::UpdateFailed(
            "release checksum is not a lowercase SHA-256 digest".to_string(),
        ));
    }
    Ok(digest.to_string())
}

pub fn download_and_verify_update(
    app: &AppHandle,
    current_version: &str,
    tag: &str,
    asset_key: &str,
) -> Result<(PathBuf, PathBuf), AppError> {
    let release = fetch_github_release_by_tag(tag).map_err(|message| {
        AppError::UpdateFailed(format!("cannot refresh release metadata: {message}"))
    })?;
    if release.tag_name != tag
        || release.draft
        || release.prerelease
        || compare_release_versions(current_version, &release.tag_name) != Some(Ordering::Greater)
    {
        return Err(AppError::UpdateFailed(
            "the requested release is no longer an available update".to_string(),
        ));
    }
    let spec = platform_asset_spec().ok_or_else(|| {
        AppError::UpdateFailed("this device is not supported for in-app installation".to_string())
    })?;
    if asset_key != spec.key {
        return Err(AppError::UpdateFailed(
            "update asset does not match this device".to_string(),
        ));
    }
    let expected_name = expected_asset_name(tag, spec);
    let installer = checked_asset(&release, &expected_name)?;
    let checksum_asset = checked_asset(&release, &format!("{expected_name}.sha256"))?;
    let checksum = read_checksum(checksum_asset)?;
    checked_https_url(&installer.browser_download_url)?;

    let cache_dir = update_cache_dir(app)?;
    cleanup_update_cache(app)?;
    let final_path = cache_dir.join(&expected_name);
    let temporary_path = cache_dir.join(format!(".{expected_name}.{}.part", Uuid::new_v4()));
    let result = (|| -> Result<(), AppError> {
        let response = github_agent()
            .get(&installer.browser_download_url)
            .call()
            .map_err(|error| {
                AppError::UpdateFailed(format!("cannot download installer: {error}"))
            })?;
        let content_length = response
            .header("Content-Length")
            .and_then(|value| value.parse::<u64>().ok());
        if content_length.is_some_and(|value| value > MAX_INSTALLER_SIZE || value != installer.size)
        {
            return Err(AppError::UpdateFailed(
                "installer size does not match release metadata".to_string(),
            ));
        }
        let mut reader = response.into_reader();
        let file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary_path)
            .map_err(|_| AppError::IoError)?;
        let mut writer = std::io::BufWriter::new(file);
        let mut hasher = Sha256::new();
        let mut downloaded = 0_u64;
        let mut buffer = [0_u8; 64 * 1024];
        loop {
            let count = reader.read(&mut buffer).map_err(|_| {
                AppError::UpdateFailed("installer download was interrupted".to_string())
            })?;
            if count == 0 {
                break;
            }
            downloaded = downloaded
                .checked_add(count as u64)
                .ok_or_else(|| AppError::UpdateFailed("installer is too large".to_string()))?;
            if downloaded > installer.size || downloaded > MAX_INSTALLER_SIZE {
                return Err(AppError::UpdateFailed(
                    "installer exceeds its declared size".to_string(),
                ));
            }
            writer
                .write_all(&buffer[..count])
                .map_err(|_| AppError::IoError)?;
            hasher.update(&buffer[..count]);
            if downloaded == installer.size || downloaded % (512 * 1024) < count as u64 {
                let _ = app.emit(
                    UPDATE_EVENT,
                    UpdateDownloadProgress {
                        tag: tag.to_string(),
                        asset_key: asset_key.to_string(),
                        downloaded_bytes: downloaded,
                        total_bytes: content_length,
                    },
                );
            }
        }
        writer.flush().map_err(|_| AppError::IoError)?;
        if downloaded != installer.size {
            return Err(AppError::UpdateFailed(
                "installer download size did not match release metadata".to_string(),
            ));
        }
        if format!("{:x}", hasher.finalize()) != checksum {
            return Err(AppError::UpdateFailed(
                "installer checksum did not match the release checksum".to_string(),
            ));
        }
        fs::rename(&temporary_path, &final_path).map_err(|_| AppError::IoError)?;
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary_path);
    }
    result?;
    Ok((cache_dir, final_path))
}

#[cfg(test)]
mod tests {
    use super::{
        build_update_response, compare_release_versions, load_update_settings, save_update_settings,
    };
    use crate::models::{GitHubRelease, GitHubReleaseAsset, UpdateSettings};
    use std::{cmp::Ordering, time::{SystemTime, UNIX_EPOCH}};

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
    fn available_update_exposes_only_a_platform_candidate() {
        let release = GitHubRelease {
            tag_name: "v0.9.1".to_string(),
            html_url: "https://github.com/Ericonquer/NUTBOOK/releases/tag/v0.9.1".to_string(),
            body: "- Better update details\n- Safer installation".to_string(),
            draft: false,
            prerelease: false,
            assets: vec![GitHubReleaseAsset {
                name: "NUTBOOK_0.9.1_x64.dmg".to_string(),
                size: 42,
                browser_download_url: "https://github.com/example".to_string(),
            }],
        };
        let response = build_update_response("0.9.0", Some(&release), None, None);
        assert!(response.has_update);
        #[cfg(all(target_os = "macos", target_arch = "x86_64"))]
        assert_eq!(
            response.candidate.expect("candidate").asset_key,
            "macos-x86_64-dmg"
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
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
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
