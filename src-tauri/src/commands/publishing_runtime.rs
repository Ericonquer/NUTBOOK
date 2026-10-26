//! Read-only discovery of shared system tools. Downloads require the explicit setup script.
use crate::state::AppState;
use serde_json::{json, Value};
use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{Mutex, OnceLock},
    time::{Duration, Instant},
};
use tauri::Manager;

#[derive(Clone)]
pub struct Runtime {
    pub source: PathBuf,
    pub node: PathBuf,
    pub browser: PathBuf,
}
fn setup(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let root = app
        .path()
        .resource_dir()
        .map_err(|_| "Setup resources unavailable")?
        .join("publishing-runtime");
    #[cfg(debug_assertions)]
    let root = if root.join("bundle.json").is_file() {
        root
    } else {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("generated-resources/publishing-runtime")
    };
    let descriptor: Value = serde_json::from_slice(
        &fs::read(root.join("bundle.json")).map_err(|_| "Setup resources unavailable")?,
    )
    .map_err(|_| "Invalid setup descriptor")?;
    if descriptor["version"] != 2
        || !root.join("discover-publishing-runtime.mjs").is_file()
        || !root
            .join("node_modules/playwright-core/index.mjs")
            .is_file()
    {
        return Err("Publishing driver is unavailable; reinstall NUTBOOK".into());
    }
    Ok(root)
}
fn output(command: &mut Command, timeout: Duration) -> Result<Vec<u8>, String> {
    command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .env_remove("NODE_OPTIONS")
        .env_remove("NODE_PATH")
        .env_remove("PLAYWRIGHT_BROWSERS_PATH");
    let mut child = command.spawn().map_err(|_| "Cannot run system tool")?;
    let start = Instant::now();
    loop {
        if child
            .try_wait()
            .map_err(|_| "Cannot inspect system tool")?
            .is_some()
        {
            let result = child
                .wait_with_output()
                .map_err(|_| "Cannot read system tool result")?;
            return if result.status.success() {
                Ok(result.stdout)
            } else {
                Err("System tool check failed".into())
            };
        }
        if start.elapsed() > timeout {
            let _ = child.kill();
            let _ = child.wait();
            return Err("System tool check timed out".into());
        }
        std::thread::sleep(Duration::from_millis(30));
    }
}
fn node_candidates(data: &Path) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    let name = if cfg!(windows) { "node.exe" } else { "node" };
    if let Some(path) = std::env::var_os("PATH") {
        paths.extend(
            std::env::split_paths(&path)
                .filter(|p| p.is_absolute())
                .map(|p| p.join(name)),
        );
    }
    if cfg!(windows) {
        for key in ["ProgramFiles", "LOCALAPPDATA"] {
            if let Some(root) = std::env::var_os(key) {
                paths.push(PathBuf::from(root).join("nodejs/node.exe"));
            }
        }
    } else {
        for root in [
            "/opt/homebrew/opt/node@22/bin",
            "/opt/homebrew/opt/node@24/bin",
            "/opt/homebrew/bin",
            "/usr/local/bin",
            "/usr/bin",
        ] {
            paths.push(PathBuf::from(root).join(name));
        }
    }
    if let Some(home) = std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" }) {
        let home = PathBuf::from(home);
        paths.push(home.join(".volta/bin").join(name));
        if let Ok(entries) = fs::read_dir(home.join(".nvm/versions/node")) {
            for entry in entries.flatten() {
                paths.push(entry.path().join("bin").join(name));
            }
        }
    }
    // Previously downloaded copies may be reused, but never downloaded again implicitly.
    if let Ok(entries) = fs::read_dir(data.join("publishing-runtime")) {
        for entry in entries.flatten() {
            let root = entry.path();
            if root.join("runtime.json").is_file() {
                paths.push(root.join(name));
            }
        }
    }
    paths
}
struct CachedStatus {
    source: PathBuf,
    data: PathBuf,
    status: Value,
    created: Instant,
    files: Vec<(PathBuf, std::time::SystemTime, u64)>,
}
static STATUS_CACHE: OnceLock<Mutex<Option<CachedStatus>>> = OnceLock::new();
pub fn invalidate() {
    if let Ok(mut cache) = STATUS_CACHE.get_or_init(|| Mutex::new(None)).lock() {
        *cache = None;
    }
}
fn fingerprint(path: &Path) -> Option<(PathBuf, std::time::SystemTime, u64)> {
    let meta = fs::metadata(path).ok()?;
    Some((path.to_path_buf(), meta.modified().ok()?, meta.len()))
}
fn project_platform(mut status: Value, platform: &str) -> Value {
    if platform == "x" && status["node"]["state"] == "ready" {
        let chrome = status["browsers"]
            .as_array()
            .and_then(|items| items.iter().find(|item| item["name"] == "Google Chrome"))
            .cloned();
        status["ready"] = json!(chrome.is_some());
        status["browser"]=chrome.unwrap_or_else(||json!({"state":if status["failures"].as_array().is_some_and(|items|items.iter().any(|item|item["name"]=="Google Chrome")){"incompatible"}else{"missing"},"name":"Google Chrome"}));
    }
    if let Some(command) = status["installCommand"].as_str() {
        if let Some((prefix, _)) = command.rsplit_once(" --platform ") {
            status["installCommand"] = json!(format!("{prefix} --platform {platform}"));
        }
    }
    status
}
fn cached_status(source: &Path, data: &Path, platform: &str, force: bool) -> Result<Value, String> {
    cached_status_with(source, data, platform, force, || {
        inspect(source, data, "wechat")
    })
}
fn cached_status_with<F: FnOnce() -> Result<Value, String>>(
    source: &Path,
    data: &Path,
    platform: &str,
    force: bool,
    load: F,
) -> Result<Value, String> {
    if !["wechat", "weibo", "x"].contains(&platform) {
        return Err("Invalid platform".into());
    }
    let mut cache = STATUS_CACHE
        .get_or_init(|| Mutex::new(None))
        .lock()
        .map_err(|_| "Dependency cache unavailable")?;
    let valid = !force
        && cache.as_ref().is_some_and(|entry| {
            entry.source == source
                && entry.data == data
                && (entry.status["ready"] == true
                    || entry.created.elapsed() < Duration::from_secs(5))
                && entry.files.iter().all(|(path, time, len)| {
                    fingerprint(path).is_some_and(|(_, now, size)| now == *time && size == *len)
                })
        });
    if !valid {
        let status = load()?;
        let mut paths = vec![source.join("bundle.json")];
        if let Some(node) = status["node"]["path"].as_str() {
            paths.push(PathBuf::from(node));
        }
        if let Some(browsers) = status["browsers"].as_array() {
            for browser in browsers {
                if let Some(path) = browser["path"].as_str() {
                    paths.push(PathBuf::from(path));
                    if let Some((root, _)) = path.split_once(".app/Contents/MacOS/") {
                        paths.push(PathBuf::from(format!("{root}.app/Contents/Info.plist")));
                    }
                }
            }
        }
        let files = paths.iter().filter_map(|path| fingerprint(path)).collect();
        *cache = Some(CachedStatus {
            source: source.to_path_buf(),
            data: data.to_path_buf(),
            status,
            created: Instant::now(),
            files,
        });
    }
    Ok(project_platform(
        cache.as_ref().unwrap().status.clone(),
        platform,
    ))
}
fn compatible(version: &str) -> bool {
    version
        .trim()
        .trim_start_matches('v')
        .split('.')
        .next()
        .is_some_and(|major| major == "22" || major == "24")
}
fn quote(value: &str) -> String {
    if cfg!(windows) {
        format!("'{}'", value.replace('\'', "''"))
    } else {
        format!("'{}'", value.replace('\'', "'\\''"))
    }
}
fn inspect(source: &Path, data: &Path, platform: &str) -> Result<Value, String> {
    if !["wechat", "weibo", "x"].contains(&platform) {
        return Err("Invalid platform".into());
    }
    let mut rejected = Vec::new();
    let mut seen = std::collections::HashSet::new();
    let mut found = None;
    for path in node_candidates(data) {
        let Ok(path) = fs::canonicalize(path) else {
            continue;
        };
        if !seen.insert(path.clone()) {
            continue;
        }
        let checked = output(crate::core::platform::command(&path).arg("--version"), Duration::from_secs(2));
        match checked {
            Ok(bytes) if compatible(&String::from_utf8_lossy(&bytes)) => {
                found = Some(path);
                break;
            }
            Ok(bytes) => rejected.push(String::from_utf8_lossy(&bytes).trim().to_string()),
            Err(_) => rejected.push("cannot execute".into()),
        }
    }
    let mut status = if let Some(node) = &found {
        let raw = output(
            crate::core::platform::command(node)
                .arg(source.join("discover-publishing-runtime.mjs"))
                .arg(data)
                .arg(platform),
            Duration::from_secs(60),
        )?;
        serde_json::from_slice::<Value>(&raw).map_err(|_| "Invalid system tool check result")?
    } else {
        json!({"ready":false,"node":{"state":if rejected.is_empty(){"missing"}else{"incompatible"},"versions":rejected},"browser":{"state":"unchecked"}})
    };
    let executable = found
        .as_ref()
        .map(|p| quote(&p.to_string_lossy()))
        .unwrap_or_else(|| "node".into());
    status["installCommand"] = json!(format!(
        "{}{} {} --source {} --target {} --platform {}",
        if cfg!(windows) { "& " } else { "" },
        executable,
        quote(&source.join("install.mjs").to_string_lossy()),
        quote(&source.to_string_lossy()),
        quote(&data.to_string_lossy()),
        platform
    ));
    Ok(status)
}
pub fn resolve(app: &tauri::AppHandle, data: &Path, platform: &str) -> Result<Runtime, String> {
    let source = setup(app)?;
    let status = cached_status(&source, data, platform, false)?;
    if status["ready"] != true {
        return Err("WECHAT_RUNTIME_UNAVAILABLE".into());
    }
    let node = status["node"]["path"].as_str().ok_or("Invalid Node path")?;
    let browser = status["browser"]["path"]
        .as_str()
        .ok_or("Invalid browser path")?;
    Ok(Runtime {
        source,
        node: PathBuf::from(node),
        browser: PathBuf::from(browser),
    })
}
#[tauri::command]
pub async fn publishing_runtime_status(
    webview: tauri::Webview,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    platform: Option<String>,
    force: Option<bool>,
) -> Result<Value, String> {
    if webview.label() != "main" {
        return Err("Invalid caller".into());
    }
    let source = setup(&app)?;
    let data = state.app_data_dir.clone();
    let platform = platform.unwrap_or_else(|| "wechat".into());
    tauri::async_runtime::spawn_blocking(move || {
        cached_status(&source, &data, &platform, force.unwrap_or(false))
    })
    .await
    .map_err(|_| "System tool check failed".to_string())?
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    #[ignore = "requires existing system Node and browser; checks files without launching browser"]
    fn system_tools_resolve_without_installation() {
        let source = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("generated-resources/publishing-runtime");
        let temporary = tempfile::tempdir().unwrap();
        let data = temporary.path().join("no-app-data-created");
        for platform in ["wechat", "x"] {
            let status = cached_status(&source, &data, platform, false).unwrap();
            assert_eq!(status["ready"], true, "{status}");
            assert!(Path::new(status["node"]["path"].as_str().unwrap()).is_file());
            assert!(Path::new(status["browser"]["path"].as_str().unwrap()).is_file());
            assert!(
                !data.exists(),
                "discovery must not create an installation or login directory"
            );
        }
    }
    #[test]
    fn platform_cache_is_shared_refreshed_and_invalidated() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("source");
        fs::create_dir(&source).unwrap();
        fs::write(source.join("bundle.json"), "fixture").unwrap();
        let browser = dir.path().join("chrome");
        fs::write(&browser, "browser").unwrap();
        let value = json!({"ready":true,"node":{"state":"ready"},"browser":{"state":"available","name":"Google Chrome","path":browser},"browsers":[{"state":"available","name":"Google Chrome","path":browser}],"installCommand":"node setup --platform wechat"});
        let count = std::cell::Cell::new(0);
        let load = || {
            count.set(count.get() + 1);
            Ok(value.clone())
        };
        invalidate();
        for platform in ["wechat", "weibo", "x"] {
            let status = cached_status_with(&source, dir.path(), platform, false, load).unwrap();
            assert_eq!(status["ready"], true);
            assert!(status["installCommand"]
                .as_str()
                .unwrap()
                .ends_with(platform));
        }
        assert_eq!(count.get(), 1, "all platforms share one discovery");
        cached_status_with(&source, dir.path(), "wechat", true, load).unwrap();
        assert_eq!(count.get(), 2);
        fs::remove_file(browser).unwrap();
        cached_status_with(&source, dir.path(), "wechat", false, load).unwrap();
        assert_eq!(count.get(), 3, "deleted executable invalidates cache");
        invalidate();
        let edge = json!({"ready":true,"node":{"state":"ready"},"browser":{"name":"Microsoft Edge","state":"available"},"browsers":[{"name":"Microsoft Edge","state":"available"}]});
        assert_eq!(project_platform(edge.clone(), "weibo")["ready"], true);
        assert_eq!(
            project_platform(edge, "x")["ready"],
            false,
            "X still requires Chrome"
        );
    }
    #[test]
    fn node_versions_are_explicit() {
        assert!(compatible("v22.22.2\n"));
        assert!(compatible("v24.1.0"));
        for v in ["v20.1.0", "v25.0.0", "v222.1.0", "bad"] {
            assert!(!compatible(v));
        }
    }
    #[test]
    fn shell_paths_are_quoted() {
        assert!(quote("space path").starts_with('\''));
        assert!(quote("it's here").contains("here"));
    }
    #[test]
    fn probe_timeout_is_bounded() {
        #[cfg(unix)]
        assert!(output(
            crate::core::platform::command("/bin/sleep").arg("2"),
            Duration::from_millis(50)
        )
        .is_err());
    }
}
