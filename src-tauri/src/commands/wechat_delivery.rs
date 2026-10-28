//! Local deterministic delivery worker, restricted to the main WebView.
use crate::state::AppState;
use serde_json::{json, Value};
use std::{
    fs,
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    process::{Child, Stdio},
    sync::{Mutex, OnceLock},
};

struct Task {
    run: String,
    child: Child,
    status: Value,
}
static TASK: OnceLock<Mutex<Option<Task>>> = OnceLock::new();
static START: Mutex<()> = Mutex::new(());
fn tasks() -> &'static Mutex<Option<Task>> {
    TASK.get_or_init(|| Mutex::new(None))
}
fn caller(webview: &tauri::Webview) -> Result<(), String> {
    if webview.label() == "main" {
        Ok(())
    } else {
        Err("Invalid caller".into())
    }
}
fn private_dir(path: &Path) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|_| "Cannot create delivery directory")?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o700))
            .map_err(|_| "Cannot protect delivery directory")?;
    }
    Ok(())
}
fn private_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let mut options = fs::OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options
        .open(path)
        .map_err(|_| "Cannot save delivery input")?;
    file.write_all(bytes)
        .and_then(|_| file.sync_all())
        .map_err(|_| "Cannot save delivery input".into())
}
fn validate(job: &Value) -> Result<String, String> {
    let id = job["id"].as_str().ok_or("Invalid job")?;
    if id.is_empty()
        || id.len() > 80
        || !id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
    {
        return Err("Invalid job".into());
    }
    if job["version"] != 1
        || job["title"]
            .as_str()
            .is_none_or(|s| s.trim().is_empty() || s.chars().count() > 64)
        || job["html"].as_str().is_none_or(|s| s.len() > 2_000_000)
        || job["summary"]
            .as_str()
            .is_none_or(|s| s.chars().count() > 120)
    {
        return Err("Invalid publishing draft".into());
    }
    let images = job["images"].as_array().ok_or("Invalid images")?;
    if images.len() > 50 {
        return Err("Too many images".into());
    }
    let mut total = 0usize;
    for image in images {
        let mime = image["mime"].as_str().ok_or("Invalid image")?;
        if !["image/png", "image/jpeg", "image/webp", "image/gif"].contains(&mime) {
            return Err("Invalid image".into());
        }
        let data = image["base64"].as_str().ok_or("Invalid image")?;
        total = total.saturating_add(data.len());
        if total > 32 * 1024 * 1024 {
            return Err("Images exceed delivery limit".into());
        }
        crate::core::image_import::decode_raster_data(&format!("data:{mime};base64,{data}"))
            .map_err(|_| "Invalid image data")?;
    }
    Ok(id.into())
}
fn stop_task(mut task: Task) {
    if let Some(input) = task.child.stdin.as_mut() {
        let _ = writeln!(input, "cancel");
    }
    for _ in 0..40 {
        if task.child.try_wait().ok().flatten().is_some() {
            return;
        }
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
    let _ = task.child.kill();
    let _ = task.child.wait();
}
pub fn shutdown() {
    if let Ok(mut slot) = tasks().lock() {
        if let Some(task) = slot.take() {
            drop(slot);
            stop_task(task);
        }
    }
}

#[tauri::command]
pub async fn start_wechat_delivery(
    webview: tauri::Webview,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    job: Value,
    remember_login: bool,
    recreate: Option<bool>,
    platform: Option<String>,
) -> Result<Value, String> {
    caller(&webview)?;
    let id = validate(&job)?;
    let destination = platform.unwrap_or_else(|| "wechat".into());
    if destination != "wechat" && destination != "weibo" && destination != "x" {
        return Err("Invalid delivery platform".into());
    }
    if destination == "weibo"
        && (job["title"].as_str().unwrap_or("").chars().count() > 32
            || job["summary"].as_str().unwrap_or("").chars().count() > 44)
    {
        return Err("Weibo title or summary exceeds limit".into());
    }
    let data = state.app_data_dir.join(format!("{destination}-delivery"));
    let runtime_data = state.app_data_dir.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let runtime = super::publishing_runtime::resolve(&app, &runtime_data, &destination)?;
        start(
            runtime,
            data,
            id,
            job,
            remember_login,
            recreate.unwrap_or(false),
            destination,
        )
    })
    .await
    .map_err(|_| "Delivery task failed".to_string())?
}
fn start(
    runtime: super::publishing_runtime::Runtime,
    data: PathBuf,
    id: String,
    job: Value,
    remember: bool,
    recreate: bool,
    destination: String,
) -> Result<Value, String> {
    let _start = START
        .lock()
        .map_err(|_| "Delivery coordinator unavailable")?;
    {
        let mut slot = tasks()
            .lock()
            .map_err(|_| "Delivery coordinator unavailable")?;
        if let Some(task) = slot.as_mut() {
            if task.status["running"] == true {
                return Err("DELIVERY_ALREADY_RUNNING".into());
            }
        }
        // The worker validates the durable per-job status under its job lock.
        // In-memory status is lost on restart and cannot be the recovery authority.
        if let Some(task) = slot.take() {
            drop(slot);
            stop_task(task);
        }
    }
    let node = runtime.node;
    let browser = runtime.browser;
    let root = runtime.source;
    private_dir(&data)?;
    let input = data.join(format!("{id}.input.json"));
    let raw = serde_json::to_vec(&job).map_err(|_| "Invalid job")?;
    // Existing checkpoints own their frozen input; never overwrite a changed job with the same ID.
    if input.exists() && fs::read(&input).map_err(|_| "Cannot read prior job")? != raw {
        return Err("JOB_CONTENT_CHANGED".into());
    }
    private_write(&input, &raw)?;
    let mut command = crate::core::platform::command(node);
    command
        .arg(root.join("worker/run.mjs"))
        .arg(&input)
        .arg(&data)
        .arg(format!("--platform={destination}"))
        .env("NUTBOOK_CHROMIUM_EXECUTABLE", &browser)
        .env("NUTBOOK_X_CHROME_EXECUTABLE", &browser)
        .env_remove("NODE_OPTIONS")
        .env_remove("NODE_PATH")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
    if remember {
        command.arg("--remember-login");
    }
    if recreate {
        command.arg("--recreate");
    }
    let mut child = command
        .spawn()
        .map_err(|_| "Cannot start delivery runtime")?;
    let output = child.stdout.take().ok_or("Cannot read delivery status")?;
    let run = uuid::Uuid::new_v4().to_string();
    let status = json!({"jobId":id,"platform":destination,"runId":run,"running":true,"stage":"connecting","history":[]});
    *tasks()
        .lock()
        .map_err(|_| "Delivery coordinator unavailable")? = Some(Task {
        run: run.clone(),
        child,
        status: status.clone(),
    });
    let status_path = data.join(format!("{id}.status.json"));
    std::thread::spawn(move || {
        for line in BufReader::new(output).lines().map_while(Result::ok) {
            if line.len() > 16_384 {
                continue;
            }
            let Ok(message) = serde_json::from_str::<Value>(&line) else {
                continue;
            };
            let Ok(mut slot) = tasks().lock() else {
                break;
            };
            let Some(task) = slot.as_mut().filter(|t| t.run == run) else {
                break;
            };
            match message["type"].as_str() {
                Some("progress") => {
                    task.status["stage"] = message["stage"].clone();
                    if let Some(history) = task.status["history"].as_array_mut() {
                        if history.last() != Some(&message) {
                            history.push(message);
                        }
                    }
                }
                Some("result") => {
                    task.status["running"] = json!(false);
                    task.status["stage"] = json!("verified");
                    task.status["result"] = message;
                }
                Some("error") => {
                    if message["cancelled"] != true { super::publishing_runtime::invalidate(); }
                    task.status["running"] = json!(false);
                    task.status["stage"] = json!(if message["cancelled"] == true {
                        "cancelled"
                    } else {
                        "failed"
                    });
                    task.status["error"] = message["message"].clone();
                    task.status["canRecreate"] = message["canRecreate"].clone();
                }
                _ => {}
            }
            // Retain progress and failure after the dialog or application closes; no credentials.
            if let Ok(raw) = serde_json::to_vec(&task.status) {
                let _ = private_write(&status_path, &raw);
            }
        }
        if let Ok(mut slot) = tasks().lock() {
            if let Some(task) = slot.as_mut().filter(|t| t.run == run) {
                if task.status["running"] == true {
                    task.status["running"] = json!(false);
                    task.status["stage"] = json!("interrupted");
                    task.status["error"] =
                        json!("Delivery worker exited before reporting a result");
                    if let Ok(raw) = serde_json::to_vec(&task.status) {
                        let _ = private_write(&status_path, &raw);
                    }
                }
            }
        }
    });
    Ok(status)
}
#[tauri::command]
pub fn wechat_delivery_status(webview: tauri::Webview) -> Result<Value, String> {
    caller(&webview)?;
    let slot = tasks()
        .lock()
        .map_err(|_| "Delivery coordinator unavailable")?;
    Ok(slot
        .as_ref()
        .map(|t| t.status.clone())
        .unwrap_or(json!({"running":false,"stage":"idle"})))
}
#[tauri::command]
pub fn control_wechat_delivery(webview: tauri::Webview, action: String) -> Result<(), String> {
    caller(&webview)?;
    if action != "cancel" && action != "view" && action != "login" {
        return Err("Invalid action".into());
    }
    let mut slot = tasks()
        .lock()
        .map_err(|_| "Delivery coordinator unavailable")?;
    let task = slot.as_mut().ok_or("No delivery task")?;
    if action == "login"
        && (task.status["platform"] != "x"
            || task.status["stage"] != "waiting_for_x_login"
            || task.status["running"] != true)
    {
        return Err("No pending X login".into());
    }
    writeln!(
        task.child
            .stdin
            .as_mut()
            .ok_or("Delivery worker unavailable")?,
        "{action}"
    )
    .map_err(|_| "Delivery worker unavailable".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_unsafe_job_paths() {
        let job = json!({"version":1,"id":"../escape","title":"T","html":"<p>A</p>","summary":"","images":[]});
        assert!(validate(&job).is_err());
    }
    #[test]
    fn rejects_invalid_image_payload() {
        let job = json!({"version":1,"id":"safe","title":"T","html":"<p>A</p>","summary":"","images":[{"mime":"image/png","base64":"not-image"}]});
        assert!(validate(&job).is_err());
    }
}
