use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::{SystemTime, UNIX_EPOCH},
};

#[cfg(unix)]
use std::{
    fs::File,
    io::{BufRead, BufReader, Write},
    os::{
        fd::{FromRawFd, RawFd},
        unix::process::CommandExt,
    },
    process::{Child, Stdio},
    sync::{Mutex, OnceLock},
    time::{Duration, Instant},
};

#[cfg(unix)]
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
#[cfg(unix)]
use serde_json::{json, Value};

pub const HTML_SCREENSHOT_WIDTH: i32 = 1280;
pub const HTML_SCREENSHOT_HEIGHT: i32 = 720;

// ------------------------------------------------------------------
// B1：确定性 desired key 与 render kind
//
// key 形状（固定模板版本，缓存升级时 bump 版本号即可整体失效）：
//   HTML 截图:         html:<source-content-hash>:html-card-vN
//   Markdown 默认封面:  md-default:<rendered-title-hash>:title-parser-vN:default-cover-vN
//   Markdown 头图:     md-image:<cover-asset-hash>:image-cover-vN
//   Markdown 临时截图: md-screenshot:<source-content-hash>:md-screenshot-vN
//
// render kind 至少区分 html-screenshot / markdown-default-cover /
// markdown-image-cover / placeholder；placeholder 永远不能作为目标 render
// kind 的 ready 成品。
//
// 重要边界（B1 审查修正）：B1 阶段 Markdown 仍走"临时 HTML → Chromium 截图"
// 路径，必须使用独立的过渡 render kind（markdown-html-screenshot）与独立 key
// 前缀（md-screenshot:），**不得**占用未来 B4 静态 SVG 默认封面的
// md-default: key / markdown-default-cover render kind。否则旧截图缓存会在 B4
// 上线后被当成新默认封面缓存，无法证明"旧截图缓存不能冒充新默认封面"。
// ------------------------------------------------------------------

pub const HTML_CARD_TEMPLATE_VERSION: &str = "html-card-v1";
pub const TITLE_PARSER_VERSION: &str = "title-parser-v1";
pub const DEFAULT_COVER_VERSION: &str = "default-cover-v1";
pub const IMAGE_COVER_VERSION: &str = "image-cover-v1";
/// B1 阶段 Markdown 临时截图的独立模板版本；B4 退休旧路径后此 key 前缀不再产生。
pub const MARKDOWN_SCREENSHOT_VERSION: &str = "md-screenshot-v1";

pub const RENDER_KIND_HTML_SCREENSHOT: &str = "html-screenshot";
pub const RENDER_KIND_MARKDOWN_HTML_SCREENSHOT: &str = "markdown-html-screenshot";
pub const RENDER_KIND_MARKDOWN_DEFAULT_COVER: &str = "markdown-default-cover";
pub const RENDER_KIND_MARKDOWN_IMAGE_COVER: &str = "markdown-image-cover";
pub const RENDER_KIND_PLACEHOLDER: &str = "placeholder";

pub fn html_desired_key(source_content_hash: &str) -> String {
    format!("html:{source_content_hash}:{HTML_CARD_TEMPLATE_VERSION}")
}

pub fn markdown_default_cover_key(rendered_title_hash: &str) -> String {
    format!(
        "md-default:{rendered_title_hash}:{TITLE_PARSER_VERSION}:{DEFAULT_COVER_VERSION}"
    )
}

pub fn markdown_image_cover_key(cover_asset_hash: &str) -> String {
    format!("md-image:{cover_asset_hash}:{IMAGE_COVER_VERSION}")
}

/// B1 阶段 Markdown 临时 HTML→Chromium 截图的确定性 key：只依赖源内容 hash，
/// 与未来 B4 的 md-default:<title-hash> 完全不同前缀，旧截图缓存无法冒充默认封面。
pub fn markdown_screenshot_key(source_content_hash: &str) -> String {
    format!("md-screenshot:{source_content_hash}:{MARKDOWN_SCREENSHOT_VERSION}")
}

/// placeholder 不是目标 render kind 的 ready 成品；ready 行必须携带真实 render kind。
pub fn is_placeholder_render_kind(render_kind: Option<&str>) -> bool {
    matches!(render_kind, Some(RENDER_KIND_PLACEHOLDER))
}

/// 根据 item 当前状态计算确定性 desired key：
/// - HTML 使用源内容 hash；
/// - B1 阶段 Markdown 也使用源内容 hash（md-screenshot: 过渡前缀），内容变化即失效；
///   B4 换成 md-default:<rendered-title-hash> 后，旧 md-screenshot 缓存天然不匹配。
/// 无法计算的输入（如缺 hash）返回 None，表示该 item 当前没有可验证的成图目标。
pub fn desired_key_for_item(
    file_type: &str,
    source_content_hash: Option<&str>,
) -> Option<String> {
    match file_type {
        "html" => source_content_hash.map(html_desired_key),
        "markdown" => source_content_hash.map(markdown_screenshot_key),
        _ => None,
    }
}

/// 一次生成任务的不可变快照：生成期间不持有数据库事务，提交时只认
/// desired_key + generation 与当前状态完全一致；同时保存 snapshot 时的磁盘
/// revision（内容 hash + 文件大小 + canonical path + 正文），提交前重读磁盘
/// 比对，截图期间源文件被外部改写（即使扫描尚未触发）也必须丢弃。
///
/// B1 审查修正：`source_body` 是 snapshot 阶段从磁盘读取的**唯一渲染输入**。
/// Markdown 临时 HTML 必须由它渲染；禁止回落到可能陈旧的 item_content.raw_text，
/// 否则 key / source_content_hash 与渲染正文会分属不同磁盘 revision。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ThumbnailGenerationSnapshot {
    pub item_id: i64,
    pub desired_key: String,
    pub render_kind: &'static str,
    pub generation: i64,
    pub source_content_hash: String,
    pub source_file_size: i64,
    /// snapshot 阶段从磁盘读取的纳秒 mtime（claim 事务收敛 items.modified_at 用）。
    pub source_modified_at: String,
    pub canonical_path: String,
    pub file_type: String,
    /// snapshot 阶段从磁盘读取的源正文（Markdown 渲染输入；HTML 仅用于 placeholder 兜底）。
    pub source_body: String,
}

/// 每个 file_type 在 B1 阶段唯一合法的 render kind：
/// - HTML：html-screenshot；
/// - Markdown（临时 HTML→Chromium 截图过渡路径）：markdown-html-screenshot，
///   绝不占用未来 B4 的 markdown-default-cover。
/// 读取路径用它对 render_kind 做**精确相等**校验：placeholder、缺失、以及任意
/// 其他非空 render kind 都必须拒绝，防止旧路径产物冒充当前路径的 ready 成品。
pub fn expected_render_kind_for_item(file_type: &str) -> Option<&'static str> {
    match file_type {
        "html" => Some(RENDER_KIND_HTML_SCREENSHOT),
        "markdown" => Some(RENDER_KIND_MARKDOWN_HTML_SCREENSHOT),
        _ => None,
    }
}


#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HtmlThumbnailInput {
    pub file_name: String,
    pub title: Option<String>,
    pub raw_text: Option<String>,
    pub source_url: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GeneratedThumbnailAsset {
    pub backend: &'static str,
    pub content_type: &'static str,
    pub file_extension: &'static str,
    pub bytes: Vec<u8>,
    pub svg: String,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ChromiumScreenshotInput {
    pub chromium_path: PathBuf,
    pub url: String,
    pub width: i32,
    pub height: i32,
}

/// A deliberately narrow CDP capture request for one verified presentation
/// page. The command never accepts a caller-provided browser path or arbitrary
/// JavaScript, which keeps the desktop IPC boundary scoped to the active item.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PresentationScreenshotInput {
    pub chromium_path: PathBuf,
    pub url: String,
    pub page_id: String,
    pub width: i32,
    pub height: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PresentationThumbnailWorkerInput {
    pub screenshot: PresentationScreenshotInput,
    pub source_revision: String,
}


#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ThumbnailBackend {
    Auto,
    PlaceholderSvg,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ThumbnailBackendStatus {
    pub screenshot_available: bool,
    pub chromium_path: Option<PathBuf>,
    pub system_chrome_available: bool,
    pub system_chrome_path: Option<PathBuf>,
    pub system_chrome_enabled: bool,
    pub fallback_backend: &'static str,
}

pub fn thumbnail_backend_status() -> ThumbnailBackendStatus {
    let chromium_path = find_local_chromium_executable();
    let system_chrome_path = find_system_chromium_executable();
    ThumbnailBackendStatus {
        screenshot_available: chromium_path.is_some(),
        chromium_path,
        system_chrome_available: system_chrome_path.is_some(),
        system_chrome_path,
        system_chrome_enabled: system_chrome_thumbnails_enabled(),
        fallback_backend: "placeholder-svg",
    }
}

pub fn find_local_chromium_executable() -> Option<PathBuf> {
    if let Ok(value) = std::env::var("NUTBOOK_CHROME_PATH") {
        let path = PathBuf::from(value);
        if path.is_file() {
            return Some(path);
        }
    }

    let home = std::env::var("HOME").ok().map(PathBuf::from)?;
    if let Some(path) = playwright_chromium_executable_candidates(&home)
        .into_iter()
        .find(|path| path.is_file())
    {
        return Some(path);
    }

    // GUI browsers can bounce in the Dock/menu bar on macOS even with --headless.
    // Keep them opt-in so first scans never steal focus on fresh installs.
    if system_chrome_thumbnails_enabled() {
        return find_system_chromium_executable();
    }

    None
}

pub fn system_chrome_thumbnails_enabled() -> bool {
    std::env::var("NUTBOOK_ALLOW_SYSTEM_CHROME_THUMBNAILS").ok().as_deref() == Some("1")
}

pub fn playwright_chromium_executable_candidates(home: &Path) -> Vec<PathBuf> {
    vec![
        home.join("Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-x64/chrome-headless-shell"),
        home.join("Library/Caches/ms-playwright/chromium-1208/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
    ]
}

fn system_chromium_executable_candidates() -> Vec<PathBuf> {
    vec![
        PathBuf::from("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
        PathBuf::from("/Applications/Chromium.app/Contents/MacOS/Chromium"),
        PathBuf::from("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
    ]
}

pub fn find_system_chromium_executable() -> Option<PathBuf> {
    system_chromium_executable_candidates()
        .into_iter()
        .find(|path| path.is_file())
}

/// 最窄的截图 capture seam：生产路径使用 [`DefaultThumbnailCaptureAdapter`]，
/// 测试通过显式依赖注入替换为可控延迟实现，从而决定某次 capture 何时完成。
/// B0 只建立 seam 本身，不在此引入 generation / desired key / CAS / 持久化状态。
pub trait ThumbnailCaptureAdapter: Send + Sync {
    fn capture(&self, input: &ChromiumScreenshotInput) -> Result<GeneratedThumbnailAsset, String>;
}

/// 生产默认 adapter：直接调用既有 Chromium 截图实现，行为与 B0 之前完全一致。
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub struct DefaultThumbnailCaptureAdapter;

impl ThumbnailCaptureAdapter for DefaultThumbnailCaptureAdapter {
    fn capture(&self, input: &ChromiumScreenshotInput) -> Result<GeneratedThumbnailAsset, String> {
        capture_html_thumbnail_with_chromium(input.clone())
    }
}

pub fn generate_html_thumbnail(
    input: HtmlThumbnailInput,
    backend: ThumbnailBackend,
) -> GeneratedThumbnailAsset {
    generate_html_thumbnail_with_adapter(input, backend, &DefaultThumbnailCaptureAdapter)
}

/// [`generate_html_thumbnail`] 的可注入形式。生产路径不变，仍由
/// [`generate_html_thumbnail`] 使用默认 adapter 调用；测试注入自定义实现。
pub fn generate_html_thumbnail_with_adapter(
    input: HtmlThumbnailInput,
    backend: ThumbnailBackend,
    adapter: &dyn ThumbnailCaptureAdapter,
) -> GeneratedThumbnailAsset {
    match backend {
        ThumbnailBackend::Auto => {
            if let (Some(chromium_path), Some(source_url)) =
                (find_local_chromium_executable(), input.source_url.clone())
            {
                let request = ChromiumScreenshotInput {
                    chromium_path,
                    url: source_url,
                    width: HTML_SCREENSHOT_WIDTH,
                    height: HTML_SCREENSHOT_HEIGHT,
                };
                if let Ok(asset) = adapter.capture(&request) {
                    return asset;
                }
            }

            build_placeholder_html_thumbnail(input)
        }
        ThumbnailBackend::PlaceholderSvg => build_placeholder_html_thumbnail(input),
    }
}

pub fn capture_html_thumbnail_with_chromium(
    input: ChromiumScreenshotInput,
) -> Result<GeneratedThumbnailAsset, String> {
    if !input.chromium_path.is_file() {
        return Err("chromium executable not found".to_string());
    }

    let output_path = temp_screenshot_path();
    let profile_path = temp_chromium_profile_path();
    let _ = fs::create_dir_all(&profile_path);
    if should_launch_system_browser_via_open(&input.chromium_path) {
        launch_system_browser_screenshot_via_open(&input, &output_path, &profile_path)?;
    } else {
        let args = chromium_screenshot_args(
            &output_path,
            &profile_path,
            &input.url,
            input.width,
            input.height,
        );
        let output = Command::new(&input.chromium_path)
            .args(&args)
            .output()
            .map_err(|error| {
                let _ = fs::remove_dir_all(&profile_path);
                format!("failed to launch chromium: {error}")
            })?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let _ = fs::remove_file(&output_path);
            return Err(format!("chromium screenshot failed: {stderr}"));
        }
    }

    let _ = fs::remove_dir_all(&profile_path);

    let bytes = fs::read(&output_path).map_err(|error| format!("failed to read screenshot: {error}"))?;
    let _ = fs::remove_file(&output_path);

    if !bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        return Err("chromium did not produce a PNG screenshot".to_string());
    }

    Ok(GeneratedThumbnailAsset {
        backend: "screenshot-chromium",
        content_type: "image/png",
        file_extension: "png",
        bytes,
        svg: String::new(),
        width: input.width,
        height: input.height,
    })
}

/// Capture one page of a Nutbook presentation through its public bridge.
/// Unlike the legacy CLI screenshot this does not guess the active slide or
/// rely on a virtual-time budget: CDP waits for navigation, invokes the bridge,
/// waits for local images, and only then captures the viewport.
pub fn capture_presentation_thumbnail_with_chromium(
    input: PresentationScreenshotInput,
) -> Result<GeneratedThumbnailAsset, String> {
    capture_presentation_thumbnail_with_chromium_impl(input)
}

#[cfg(unix)]
fn capture_presentation_thumbnail_with_chromium_impl(
    input: PresentationScreenshotInput,
) -> Result<GeneratedThumbnailAsset, String> {
    if !input.chromium_path.is_file() {
        return Err("chromium executable not found".to_string());
    }
    if !valid_presentation_page_id(&input.page_id) {
        return Err("invalid presentation page id".to_string());
    }

    let mut worker = PresentationThumbnailWorker::new(&input, "one-shot")?;
    let result = worker.capture(&input.page_id);
    worker.close();
    result
}

#[cfg(not(unix))]
fn capture_presentation_thumbnail_with_chromium_impl(
    _input: PresentationScreenshotInput,
) -> Result<GeneratedThumbnailAsset, String> {
    Err("presentation thumbnail CDP capture is not supported on this platform".to_string())
}

#[cfg(unix)]
static PRESENTATION_THUMBNAIL_WORKER: OnceLock<Mutex<Option<PresentationThumbnailWorker>>> = OnceLock::new();

/// Reuses a single hidden Chromium process for all thumbnails from one
/// presentation revision. This is deliberately separate from the old document
/// thumbnail CLI: restarting Chrome for each slide made five initial cards take
/// 10–15 seconds on real desktops.
pub fn capture_presentation_thumbnail_with_worker(
    input: PresentationThumbnailWorkerInput,
) -> Result<GeneratedThumbnailAsset, String> {
    capture_presentation_thumbnail_with_worker_impl(input)
}

#[cfg(unix)]
fn capture_presentation_thumbnail_with_worker_impl(
    input: PresentationThumbnailWorkerInput,
) -> Result<GeneratedThumbnailAsset, String> {
    let worker_slot = PRESENTATION_THUMBNAIL_WORKER.get_or_init(|| Mutex::new(None));
    let mut slot = worker_slot.lock().map_err(|_| "presentation thumbnail worker lock poisoned")?;
    let needs_restart = slot.as_mut().map(|worker| !worker.matches(&input)).unwrap_or(true);
    if needs_restart {
        if let Some(mut previous) = slot.take() { previous.close(); }
        *slot = Some(PresentationThumbnailWorker::new(&input.screenshot, &input.source_revision)?);
    }
    let worker = slot.as_mut().ok_or("presentation thumbnail worker unavailable")?;
    worker.capture(&input.screenshot.page_id)
}

#[cfg(not(unix))]
fn capture_presentation_thumbnail_with_worker_impl(
    _input: PresentationThumbnailWorkerInput,
) -> Result<GeneratedThumbnailAsset, String> {
    Err("presentation thumbnail CDP worker is not supported on this platform".to_string())
}

#[cfg(unix)]
struct PresentationThumbnailWorker {
    pipe: CdpPipe,
    profile_path: PathBuf,
    chromium_path: PathBuf,
    url: String,
    source_revision: String,
    width: i32,
    height: i32,
    session_id: String,
}

#[cfg(unix)]
impl PresentationThumbnailWorker {
    fn new(input: &PresentationScreenshotInput, source_revision: &str) -> Result<Self, String> {
        let profile_path = temp_chromium_profile_path();
        fs::create_dir_all(&profile_path).map_err(|error| format!("failed to create chromium profile: {error}"))?;
        let mut pipe = match CdpPipe::launch(&input.chromium_path, &profile_path) {
            Ok(pipe) => pipe,
            Err(error) => { let _ = fs::remove_dir_all(&profile_path); return Err(error); }
        };
        let setup = (|| {
            let target_id = pipe.call("Target.createTarget", json!({ "url": "about:blank" }), None)?
                .get("targetId").and_then(Value::as_str).ok_or("CDP target id missing")?.to_string();
            let session_id = pipe.call("Target.attachToTarget", json!({ "targetId": target_id, "flatten": true }), None)?
                .get("sessionId").and_then(Value::as_str).ok_or("CDP session id missing")?.to_string();
            pipe.call("Page.enable", json!({}), Some(&session_id))?;
            pipe.call("Emulation.setDeviceMetricsOverride", json!({
                "width": input.width, "height": input.height, "deviceScaleFactor": 1, "mobile": false,
            }), Some(&session_id))?;
            pipe.call("Page.navigate", json!({ "url": input.url }), Some(&session_id))?;
            pipe.wait_for_event("Page.loadEventFired", &session_id, Duration::from_secs(8))?;
            Ok(session_id)
        })();
        match setup {
            Ok(session_id) => Ok(Self { pipe, profile_path, chromium_path: input.chromium_path.clone(), url: input.url.clone(), source_revision: source_revision.to_string(), width: input.width, height: input.height, session_id }),
            Err(error) => { pipe.close(); let _ = fs::remove_dir_all(&profile_path); Err(error) }
        }
    }

    fn matches(&mut self, input: &PresentationThumbnailWorkerInput) -> bool {
        self.chromium_path == input.screenshot.chromium_path
            && self.url == input.screenshot.url
            && self.source_revision == input.source_revision
            && self.width == input.screenshot.width
            && self.height == input.screenshot.height
            && self.pipe.is_running()
    }

    fn capture(&mut self, page_id: &str) -> Result<GeneratedThumbnailAsset, String> {
        let setup = presentation_thumbnail_setup_script(page_id);
        self.pipe.call("Runtime.evaluate", json!({
            "expression": setup, "awaitPromise": true, "returnByValue": true,
        }), Some(&self.session_id))?;
        let captured = self.pipe.call("Page.captureScreenshot", json!({ "format": "png", "fromSurface": true }), Some(&self.session_id))?;
        let encoded = captured.get("data").and_then(Value::as_str).ok_or("CDP screenshot payload missing")?;
        let bytes = BASE64.decode(encoded).map_err(|error| format!("invalid CDP screenshot: {error}"))?;
        if !bytes.starts_with(b"\x89PNG\r\n\x1a\n") { return Err("CDP did not produce a PNG screenshot".to_string()); }
        Ok(GeneratedThumbnailAsset { backend: "presentation-cdp-worker", content_type: "image/png", file_extension: "png", bytes, svg: String::new(), width: self.width, height: self.height })
    }

    fn close(&mut self) { self.pipe.close(); let _ = fs::remove_dir_all(&self.profile_path); }
}

fn valid_presentation_page_id(page_id: &str) -> bool {
    !page_id.is_empty() && page_id.len() <= 160 && page_id.bytes().all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'))
}

fn presentation_thumbnail_setup_script(page_id: &str) -> String {
    let page_id = serde_json::to_string(page_id).unwrap_or_else(|_| "\"\"".to_string());
    format!(r#"(async()=>{{
      const pageId={page_id};
      const bridge=window.__NUTBOOK_PRESENTATION__;
      if(!bridge || typeof bridge.goTo!=="function" || typeof bridge.whenReady!=="function") throw new Error("presentation bridge unavailable");
      await bridge.whenReady();
      await bridge.setEditMode?.(false);
      const moved=await bridge.goTo(pageId);
      if(moved===false) throw new Error("presentation page navigation failed");
      const root=document.querySelector(`[data-nutbook-page-id="${{CSS.escape(pageId)}}"]`);
      if(!root) throw new Error("presentation page root missing");
      const targetDisplay=getComputedStyle(root).display === "none" ? "block" : getComputedStyle(root).display;
      document.documentElement.dataset.nutbookThumbnailMode="1";
      // `hidden` alone loses to a deck's author rule such as `.slide {{display:flex}}`.
      // Force every non-target root out of the paint tree so transition frames
      // from the previous cover page cannot bleed into chapter thumbnails.
      document.querySelectorAll("[data-nutbook-page-id]").forEach((node)=>{{
        const target=node===root;
        node.hidden=!target;
        node.style.setProperty("display",target?targetDisplay:"none","important");
        node.style.setProperty("opacity",target?"1":"0","important");
        node.style.setProperty("transform","none","important");
        node.style.setProperty("transition","none","important");
      }});
      root.hidden=false; root.classList.add("is-active");
      document.querySelectorAll(".deck-controls,.presentation-controls,[data-nutbook-presentation-controls]").forEach((node)=>{{ node.style.setProperty("display","none","important"); }});
      await Promise.all(Array.from(root.querySelectorAll("img")).map(async(image)=>{{ try {{ if(!image.complete) await new Promise((resolve)=>{{ image.addEventListener("load",resolve,{{once:true}}); image.addEventListener("error",resolve,{{once:true}}); }}); if(image.decode) await image.decode(); }} catch(_) {{}} }}));
      await new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      return true;
    }})()"#)
}

#[cfg(unix)]
struct CdpPipe {
    child: Child,
    input: File,
    output: BufReader<File>,
    next_id: u64,
}

#[cfg(unix)]
impl CdpPipe {
    fn launch(chromium_path: &Path, profile_path: &Path) -> Result<Self, String> {
        let (browser_read, host_write) = cdp_os_pipe()?;
        let (host_read, browser_write) = cdp_os_pipe()?;
        let mut command = Command::new(chromium_path);
        command
            .args([
                "--headless=new", "--remote-debugging-pipe", "--no-first-run", "--no-default-browser-check",
                "--disable-background-networking", "--disable-component-update", "--disable-extensions", "--disable-sync",
                "--disable-gpu", "--hide-scrollbars", "--mute-audio", "--run-all-compositor-stages-before-draw",
            ])
            .arg(format!("--user-data-dir={}", profile_path.to_string_lossy()))
            .stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null());
        // Chrome's remote-debugging-pipe transport uses file descriptors 3/4,
        // not stdin/stdout. Keeping this wiring here avoids a WebSocket client
        // and lets the backend terminate the whole capture process reliably.
        unsafe {
            command.pre_exec(move || {
                libc::close(host_write);
                libc::close(host_read);
                if (browser_read != 3 && libc::dup2(browser_read, 3) < 0)
                    || (browser_write != 4 && libc::dup2(browser_write, 4) < 0) {
                    return Err(std::io::Error::last_os_error());
                }
                if browser_read != 3 && browser_read != 4 { libc::close(browser_read); }
                if browser_write != 3 && browser_write != 4 { libc::close(browser_write); }
                Ok(())
            });
        }
        let child = command.spawn().map_err(|error| format!("failed to launch Chromium CDP: {error}"))?;
        unsafe { libc::close(browser_read); libc::close(browser_write); }
        set_nonblocking(host_read)?;
        Ok(Self {
            input: unsafe { File::from_raw_fd(host_write) },
            output: BufReader::new(unsafe { File::from_raw_fd(host_read) }),
            child,
            next_id: 1,
        })
    }

    fn call(&mut self, method: &str, params: Value, session_id: Option<&str>) -> Result<Value, String> {
        let id = self.next_id;
        self.next_id += 1;
        let mut message = json!({ "id": id, "method": method, "params": params });
        if let Some(session_id) = session_id { message["sessionId"] = Value::String(session_id.to_string()); }
        self.write_message(&message)?;
        loop {
            let response = self.read_message(Duration::from_secs(10))?;
            if response.get("id").and_then(Value::as_u64) != Some(id) { continue; }
            if let Some(error) = response.get("error") { return Err(format!("CDP {method} failed: {error}")); }
            return response.get("result").cloned().ok_or_else(|| format!("CDP {method} missing result"));
        }
    }

    fn wait_for_event(&mut self, method: &str, session_id: &str, timeout: Duration) -> Result<(), String> {
        let started = Instant::now();
        while started.elapsed() < timeout {
            let remaining = timeout.saturating_sub(started.elapsed());
            let message = self.read_message(remaining)?;
            if message.get("method").and_then(Value::as_str) == Some(method)
                && message.get("sessionId").and_then(Value::as_str) == Some(session_id) { return Ok(()); }
        }
        Err(format!("CDP timed out waiting for {method}"))
    }

    fn write_message(&mut self, message: &Value) -> Result<(), String> {
        let json = serde_json::to_vec(message).map_err(|error| format!("failed to encode CDP message: {error}"))?;
        self.input.write_all(&json).and_then(|_| self.input.write_all(&[0])).and_then(|_| self.input.flush())
            .map_err(|error| format!("failed to write CDP message: {error}"))
    }

    fn read_message(&mut self, timeout: Duration) -> Result<Value, String> {
        // CDP's pipe transport is NUL-delimited. The timeout is checked before
        // each blocking read; Chromium exits on all terminal failures.
        let started = Instant::now();
        let mut bytes = Vec::new();
        loop {
            if started.elapsed() >= timeout { return Err("CDP response timed out".to_string()); }
            let available = match self.output.fill_buf() {
                Ok(available) => available,
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(10));
                    continue;
                }
                Err(error) => return Err(format!("failed to read CDP response: {error}")),
            };
            if available.is_empty() { return Err("Chromium CDP closed unexpectedly".to_string()); }
            if let Some(position) = available.iter().position(|byte| *byte == 0) {
                bytes.extend_from_slice(&available[..position]);
                self.output.consume(position + 1);
                break;
            }
            bytes.extend_from_slice(available);
            let consumed = available.len();
            self.output.consume(consumed);
        }
        serde_json::from_slice(&bytes).map_err(|error| format!("invalid CDP response: {error}"))
    }

    fn close(&mut self) { let _ = self.child.kill(); let _ = self.child.wait(); }

    fn is_running(&mut self) -> bool { self.child.try_wait().ok().flatten().is_none() }
}

#[cfg(unix)]
fn cdp_os_pipe() -> Result<(RawFd, RawFd), String> {
    let mut fds = [-1; 2];
    if unsafe { libc::pipe(fds.as_mut_ptr()) } != 0 {
        return Err(format!("failed to create CDP pipe: {}", std::io::Error::last_os_error()));
    }
    Ok((fds[0], fds[1]))
}

#[cfg(unix)]
fn set_nonblocking(fd: RawFd) -> Result<(), String> {
    let flags = unsafe { libc::fcntl(fd, libc::F_GETFL) };
    if flags < 0 || unsafe { libc::fcntl(fd, libc::F_SETFL, flags | libc::O_NONBLOCK) } < 0 {
        return Err(format!("failed to configure CDP pipe: {}", std::io::Error::last_os_error()));
    }
    Ok(())
}

fn should_launch_system_browser_via_open(chromium_path: &Path) -> bool {
    chromium_path.starts_with("/Applications/") && chromium_app_bundle_path(chromium_path).is_some()
}

fn chromium_app_bundle_path(chromium_path: &Path) -> Option<PathBuf> {
    chromium_path
        .ancestors()
        .find(|path| path.extension().and_then(|value| value.to_str()) == Some("app"))
        .map(Path::to_path_buf)
}

fn launch_system_browser_screenshot_via_open(
    input: &ChromiumScreenshotInput,
    output_path: &Path,
    profile_path: &Path,
) -> Result<(), String> {
    let Some(app_bundle_path) = chromium_app_bundle_path(&input.chromium_path) else {
        return Err("system browser app bundle not found".to_string());
    };

    let args = chromium_screenshot_args(
        output_path,
        profile_path,
        &input.url,
        input.width,
        input.height,
    );
    let output = Command::new("open")
        .arg("-n")
        .arg(&app_bundle_path)
        .arg("--args")
        .args(&args)
        .output()
        .map_err(|error| format!("failed to launch system browser with open: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!(
            "open failed to launch system browser: {}{}",
            stdout,
            if stderr.is_empty() { "" } else { stderr.as_ref() }
        ));
    }

    for _ in 0..40 {
        if output_path.is_file() {
            return Ok(());
        }
        thread::sleep(std::time::Duration::from_millis(250));
    }

    Err("system browser launched, but screenshot file was not produced before timeout; macOS may have blocked the request".to_string())
}

pub fn chromium_screenshot_args(
    output_path: &Path,
    profile_path: &Path,
    url: &str,
    width: i32,
    height: i32,
) -> Vec<String> {
    vec![
        "--headless=new".to_string(),
        "--no-first-run".to_string(),
        "--no-default-browser-check".to_string(),
        "--disable-background-networking".to_string(),
        "--disable-component-update".to_string(),
        "--disable-extensions".to_string(),
        "--disable-sync".to_string(),
        "--disable-features=Translate,MediaRouter".to_string(),
        "--disable-gpu".to_string(),
        "--disable-dev-shm-usage".to_string(),
        "--disable-breakpad".to_string(),
        "--hide-scrollbars".to_string(),
        "--mute-audio".to_string(),
        "--run-all-compositor-stages-before-draw".to_string(),
        "--virtual-time-budget=3000".to_string(),
        format!("--user-data-dir={}", profile_path.to_string_lossy()),
        format!("--screenshot={}", output_path.to_string_lossy()),
        format!("--window-size={width},{height}"),
        url.to_string(),
    ]
}

fn temp_screenshot_path() -> PathBuf {
    temp_thumbnail_path("png")
}

fn temp_chromium_profile_path() -> PathBuf {
    temp_thumbnail_path("profile")
}

fn temp_thumbnail_path(suffix: &str) -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0);
    std::env::temp_dir().join(format!("nutbook-thumbnail-{nanos}.{suffix}"))
}

pub fn build_placeholder_html_thumbnail(input: HtmlThumbnailInput) -> GeneratedThumbnailAsset {
    let _ = input;

    let svg = format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
<rect width="800" height="500" fill="#ececef"/>
<rect x="60" y="52" width="680" height="396" rx="28" fill="#ffffff" fill-opacity="0.58" stroke="#dddde3" stroke-width="4" stroke-dasharray="14 12"/>
<path d="M330 214 264 250l66 36" fill="none" stroke="#c9c9d1" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M470 214 536 250l-66 36" fill="none" stroke="#c9c9d1" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M428 176 372 324" fill="none" stroke="#d2d2da" stroke-width="18" stroke-linecap="round"/>
</svg>"##,
    );

    GeneratedThumbnailAsset {
        backend: "placeholder-svg",
        content_type: "image/svg+xml",
        file_extension: "svg",
        bytes: svg.as_bytes().to_vec(),
        svg,
        width: 800,
        height: 500,
    }
}

#[cfg(test)]
mod tests {
    use super::{
        build_placeholder_html_thumbnail, capture_html_thumbnail_with_chromium,
        capture_presentation_thumbnail_with_chromium, capture_presentation_thumbnail_with_worker, chromium_app_bundle_path, chromium_screenshot_args, find_local_chromium_executable, generate_html_thumbnail,
        generate_html_thumbnail_with_adapter, playwright_chromium_executable_candidates, system_chrome_thumbnails_enabled,
        should_launch_system_browser_via_open, thumbnail_backend_status, ChromiumScreenshotInput, DefaultThumbnailCaptureAdapter, GeneratedThumbnailAsset, PresentationScreenshotInput, PresentationThumbnailWorkerInput,
        HtmlThumbnailInput, ThumbnailBackend, ThumbnailCaptureAdapter, HTML_SCREENSHOT_HEIGHT, HTML_SCREENSHOT_WIDTH,
    };
    use std::{
        fs,
        path::{Path, PathBuf},
        sync::{mpsc, Arc, Mutex},
        time::Duration,
    };

    #[test]
    fn placeholder_html_thumbnail_returns_static_svg_asset() {
        let asset = build_placeholder_html_thumbnail(HtmlThumbnailInput {
            file_name: "deck.html".to_string(),
            title: Some("AI Deck".to_string()),
            raw_text: Some("<h1>Slide</h1><script>alert(1)</script>".to_string()),
            source_url: None,
        });

        assert_eq!(asset.backend, "placeholder-svg");
        assert_eq!(asset.content_type, "image/svg+xml");
        assert_eq!(asset.file_extension, "svg");
        assert_eq!(asset.width, 800);
        assert_eq!(asset.height, 500);
        assert!(asset.svg.contains("#ececef"));
        assert!(asset.svg.contains("stroke-dasharray"));
        assert!(!asset.svg.contains("<script>"));
        assert!(asset.bytes.starts_with(b"<svg"));
    }

    #[test]
    fn auto_backend_uses_placeholder_until_screenshot_backend_is_available() {
        let asset = generate_html_thumbnail(
            HtmlThumbnailInput {
                file_name: "deck.html".to_string(),
                title: None,
                raw_text: None,
                source_url: None,
            },
            ThumbnailBackend::Auto,
        );

        assert_eq!(asset.backend, "placeholder-svg");
    }

    #[test]
    #[ignore = "launches local Chromium; run manually when validating auto screenshot backend"]
    fn auto_backend_captures_png_when_source_url_and_browser_are_available() {
        if find_local_chromium_executable().is_none() {
            return;
        }
        let html_path = std::env::temp_dir().join("nutbook-auto-thumbnail-test.html");
        fs::write(
            &html_path,
            "<main style='font:48px sans-serif'>Nutbook Auto</main>",
        )
        .expect("test html should be written");

        let asset = generate_html_thumbnail(
            HtmlThumbnailInput {
                file_name: "deck.html".to_string(),
                title: None,
                raw_text: None,
                source_url: Some(format!("file://{}", html_path.to_string_lossy())),
            },
            ThumbnailBackend::Auto,
        );
        let _ = fs::remove_file(html_path);

        assert_eq!(asset.backend, "screenshot-chromium");
        assert_eq!(asset.content_type, "image/png");
        assert!(asset.bytes.starts_with(b"\x89PNG\r\n\x1a\n"));
        assert_eq!(asset.width, HTML_SCREENSHOT_WIDTH);
        assert_eq!(asset.height, HTML_SCREENSHOT_HEIGHT);
    }

    #[test]
    #[ignore = "launches local Chromium CDP; run manually when validating presentation thumbnails"]
    fn presentation_cdp_capture_selects_a_verified_page() {
        let Some(chromium_path) = find_local_chromium_executable() else { return; };
        let directory = tempfile::tempdir().expect("temporary directory");
        let source = directory.path().join("deck.html");
        fs::write(&source, r#"<!doctype html><html><body>
          <section data-nutbook-page-id="page-one" class="is-active" style="width:480px;height:270px;background:#f00">one</section>
          <section data-nutbook-page-id="page-two" style="display:none;width:480px;height:270px;background:#00f">two</section>
          <script>
            const pages=[...document.querySelectorAll('[data-nutbook-page-id]')];
            window.__NUTBOOK_PRESENTATION__={whenReady:()=>Promise.resolve(),setEditMode:()=>true,goTo:(id)=>{for(const page of pages){page.hidden=page.dataset.nutbookPageId!==id;page.style.display=page.hidden?'none':'block';}return true;}};
          </script>
        </body></html>"#).expect("presentation fixture should be written");
        let asset = capture_presentation_thumbnail_with_chromium(PresentationScreenshotInput {
            chromium_path,
            url: url::Url::from_file_path(&source).expect("file url").to_string(),
            page_id: "page-two".to_string(),
            width: 480,
            height: 270,
        }).expect("presentation screenshot should succeed");
        assert_eq!(asset.backend, "presentation-cdp");
        assert!(asset.bytes.starts_with(b"\x89PNG\r\n\x1a\n"));
    }

    #[test]
    #[ignore = "launches a persistent local Chromium CDP worker; run manually"]
    fn presentation_cdp_worker_reuses_one_deck_for_multiple_pages() {
        let Some(chromium_path) = find_local_chromium_executable() else { return; };
        let directory = tempfile::tempdir().expect("temporary directory");
        let source = directory.path().join("deck.html");
        fs::write(&source, r#"<!doctype html><html><body>
          <section data-nutbook-page-id="page-one" class="is-active">one</section><section data-nutbook-page-id="page-two">two</section>
          <script>let active="page-one";window.__NUTBOOK_PRESENTATION__={whenReady:()=>Promise.resolve(),setEditMode:()=>true,goTo:(id)=>{active=id;for(const page of document.querySelectorAll('[data-nutbook-page-id]'))page.classList.toggle('is-active',page.dataset.nutbookPageId===id);return true;}};</script>
        </body></html>"#).expect("presentation fixture should be written");
        let url = url::Url::from_file_path(&source).expect("file url").to_string();
        let request = |page_id: &str| PresentationThumbnailWorkerInput { screenshot: PresentationScreenshotInput { chromium_path: chromium_path.clone(), url: url.clone(), page_id: page_id.to_string(), width: 480, height: 270 }, source_revision: "worker-test-v1".to_string() };
        let first = capture_presentation_thumbnail_with_worker(request("page-one")).expect("first worker screenshot");
        let second = capture_presentation_thumbnail_with_worker(request("page-two")).expect("second worker screenshot");
        assert_eq!(first.backend, "presentation-cdp-worker");
        assert_eq!(second.backend, "presentation-cdp-worker");
        assert!(second.bytes.starts_with(b"\x89PNG\r\n\x1a\n"));
    }

    #[test]
    fn playwright_chromium_candidates_use_standard_mac_cache_paths() {
        let candidates = playwright_chromium_executable_candidates(Path::new("/Users/example"));

        assert!(candidates.iter().any(|path| {
            path.ends_with("chromium-1208/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing")
        }));
        assert!(candidates.iter().any(|path| {
            path.ends_with("chromium_headless_shell-1208/chrome-headless-shell-mac-x64/chrome-headless-shell")
        }));
    }

    #[test]
    fn backend_status_always_names_placeholder_fallback() {
        let status = thumbnail_backend_status();

        assert_eq!(status.fallback_backend, "placeholder-svg");
    }

    #[test]
    fn system_chrome_requires_explicit_enable_flag() {
        std::env::remove_var("NUTBOOK_ALLOW_SYSTEM_CHROME_THUMBNAILS");
        assert!(!system_chrome_thumbnails_enabled());

        std::env::set_var("NUTBOOK_ALLOW_SYSTEM_CHROME_THUMBNAILS", "1");
        assert!(system_chrome_thumbnails_enabled());

        std::env::remove_var("NUTBOOK_ALLOW_SYSTEM_CHROME_THUMBNAILS");
    }

    #[test]
    fn chromium_screenshot_args_are_headless_and_fixed_size() {
        let args = chromium_screenshot_args(
            Path::new("/tmp/nutbook-shot.png"),
            Path::new("/tmp/nutbook-profile"),
            "http://127.0.0.1:4000/fs/deck.html",
            800,
            500,
        );

        assert!(args.contains(&"--headless=new".to_string()));
        assert!(args.contains(&"--no-first-run".to_string()));
        assert!(args.contains(&"--no-default-browser-check".to_string()));
        assert!(args.contains(&"--disable-gpu".to_string()));
        assert!(args.contains(&"--hide-scrollbars".to_string()));
        assert!(args.contains(&"--run-all-compositor-stages-before-draw".to_string()));
        assert!(args.contains(&"--virtual-time-budget=3000".to_string()));
        assert!(args.contains(&"--user-data-dir=/tmp/nutbook-profile".to_string()));
        assert!(args.contains(&"--screenshot=/tmp/nutbook-shot.png".to_string()));
        assert!(args.contains(&"--window-size=800,500".to_string()));
        assert_eq!(args.last().map(String::as_str), Some("http://127.0.0.1:4000/fs/deck.html"));
    }

    #[test]
    fn system_browser_bundle_path_is_derived_from_app_executable() {
        let bundle = chromium_app_bundle_path(Path::new(
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        ));
        assert_eq!(bundle, Some(PathBuf::from("/Applications/Google Chrome.app")));
    }

    #[test]
    fn system_browser_under_applications_uses_open_launcher() {
        assert!(should_launch_system_browser_via_open(Path::new(
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        )));
        assert!(!should_launch_system_browser_via_open(Path::new(
            "/Users/example/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-x64/chrome-headless-shell",
        )));
    }

    #[test]
    #[ignore = "launches local Chromium; run manually when validating screenshot backend"]
    fn chromium_screenshot_backend_captures_png_when_browser_is_available() {
        let Some(chromium_path) = find_local_chromium_executable() else {
            return;
        };
        let html_path = std::env::temp_dir().join("nutbook-thumbnail-test.html");
        fs::write(
            &html_path,
            "<main style='font:48px sans-serif'>Nutbook</main>",
        )
        .expect("test html should be written");

        let asset = capture_html_thumbnail_with_chromium(ChromiumScreenshotInput {
            chromium_path,
            url: format!("file://{}", html_path.to_string_lossy()),
            width: 800,
            height: 500,
        })
        .expect("chromium should capture screenshot");
        let _ = fs::remove_file(html_path);

        assert_eq!(asset.backend, "screenshot-chromium");
        assert_eq!(asset.content_type, "image/png");
        assert_eq!(asset.file_extension, "png");
        assert!(asset.bytes.starts_with(b"\x89PNG\r\n\x1a\n"));
        assert_eq!(asset.width, 800);
        assert_eq!(asset.height, 500);
    }

    // ------------------------------------------------------------------
    // B0 capture seam：可控延迟 adapter 与 characterization 基线
    // ------------------------------------------------------------------

    /// 测试用 adapter：capture 会阻塞直到测试调用 [`ControlledCaptureControl::release`]，
    /// 从而让测试决定某次 capture 何时完成。不引入全局 sleep。
    struct ControlledCaptureAdapter {
        release_rx: Mutex<mpsc::Receiver<()>>,
        responses: Mutex<Vec<Result<GeneratedThumbnailAsset, String>>>,
        captured_requests: Arc<Mutex<Vec<ChromiumScreenshotInput>>>,
    }

    struct ControlledCaptureControl {
        release_tx: mpsc::Sender<()>,
        captured_requests: Arc<Mutex<Vec<ChromiumScreenshotInput>>>,
    }

    impl ControlledCaptureAdapter {
        fn new() -> (Self, ControlledCaptureControl) {
            let (release_tx, release_rx) = mpsc::channel();
            let captured_requests = Arc::new(Mutex::new(Vec::new()));
            (
                Self {
                    release_rx: Mutex::new(release_rx),
                    responses: Mutex::new(Vec::new()),
                    captured_requests: captured_requests.clone(),
                },
                ControlledCaptureControl {
                    release_tx,
                    captured_requests,
                },
            )
        }

        fn queue_response(&self, response: Result<GeneratedThumbnailAsset, String>) {
            self.responses.lock().unwrap().push(response);
        }
    }

    impl ControlledCaptureControl {
        fn release(&self) {
            let _ = self.release_tx.send(());
        }

        fn captured(&self) -> Vec<ChromiumScreenshotInput> {
            self.captured_requests.lock().unwrap().clone()
        }
    }

    impl ThumbnailCaptureAdapter for ControlledCaptureAdapter {
        fn capture(&self, input: &ChromiumScreenshotInput) -> Result<GeneratedThumbnailAsset, String> {
            self.captured_requests.lock().unwrap().push(input.clone());
            let receiver = self.release_rx.lock().unwrap();
            receiver
                .recv()
                .map_err(|_| "capture released without a response".to_string())?;
            self.responses
                .lock()
                .unwrap()
                .pop()
                .unwrap_or_else(|| Err("no queued response".to_string()))
        }
    }

    fn sample_png_asset() -> GeneratedThumbnailAsset {
        GeneratedThumbnailAsset {
            backend: "test-png",
            content_type: "image/png",
            file_extension: "png",
            bytes: b"\x89PNG\r\n\x1a\ncontrolled-adapter-payload".to_vec(),
            svg: String::new(),
            width: HTML_SCREENSHOT_WIDTH,
            height: HTML_SCREENSHOT_HEIGHT,
        }
    }

    fn sample_request() -> ChromiumScreenshotInput {
        ChromiumScreenshotInput {
            chromium_path: PathBuf::from("/tmp/nutbook-controlled-fake-chromium"),
            url: "file:///tmp/nutbook-controlled-sample.html".to_string(),
            width: HTML_SCREENSHOT_WIDTH,
            height: HTML_SCREENSHOT_HEIGHT,
        }
    }

    /// 可控 adapter 在 release 前必须阻塞，release 后返回预设结果。这是后续
    /// B1 R1/R2 并发验收依赖的核心机制，B0 先把它锁成绿色基线。
    #[test]
    fn controlled_capture_adapter_blocks_until_released() {
        let (adapter, control) = ControlledCaptureAdapter::new();
        adapter.queue_response(Ok(sample_png_asset()));
        let request = sample_request();

        let (done_tx, done_rx) = mpsc::channel();
        std::thread::spawn(move || {
            let result = adapter.capture(&request);
            let _ = done_tx.send(result);
        });

        assert!(
            done_rx
                .recv_timeout(Duration::from_millis(150))
                .is_err(),
            "capture must block until the test releases it"
        );
        control.release();
        let result = done_rx
            .recv_timeout(Duration::from_secs(5))
            .expect("capture should complete after release")
            .expect("capture should succeed");
        assert_eq!(result.backend, "test-png");
        assert_eq!(result.width, HTML_SCREENSHOT_WIDTH);
        assert_eq!(result.height, HTML_SCREENSHOT_HEIGHT);
    }

    /// 可控 adapter 的错误会原样传播给调用方，为「引擎失败 → placeholder/重试」
    /// 的行为保留注入点。
    #[test]
    fn controlled_capture_adapter_propagates_error() {
        let (adapter, control) = ControlledCaptureAdapter::new();
        adapter.queue_response(Err("engine exploded".to_string()));
        let request = sample_request();

        let (done_tx, done_rx) = mpsc::channel();
        std::thread::spawn(move || {
            let result = adapter.capture(&request);
            let _ = done_tx.send(result);
        });

        control.release();
        let result = done_rx
            .recv_timeout(Duration::from_secs(5))
            .expect("capture should complete after release")
            .expect_err("capture error should propagate");
        assert_eq!(result, "engine exploded");
    }

    /// 生产默认 adapter 是既有 capture 实现的薄封装：类型与错误语义保持一致。
    #[test]
    fn default_adapter_is_a_thin_wrapper_over_existing_capture() {
        let adapter = DefaultThumbnailCaptureAdapter;
        let result = adapter.capture(&ChromiumScreenshotInput {
            chromium_path: PathBuf::from("/tmp/nutbook-does-not-exist-chromium"),
            url: "file:///tmp/none.html".to_string(),
            width: 800,
            height: 500,
        });
        assert_eq!(result, Err("chromium executable not found".to_string()));
    }

    /// Auto 分支在缺少 source_url 时不得调用 capture adapter，行为与 B0 之前一致。
    #[test]
    fn auto_backend_without_source_url_never_invokes_capture_adapter() {
        let (adapter, control) = ControlledCaptureAdapter::new();
        let asset = generate_html_thumbnail_with_adapter(
            HtmlThumbnailInput {
                file_name: "deck.html".to_string(),
                title: None,
                raw_text: None,
                source_url: None,
            },
            ThumbnailBackend::Auto,
            &adapter,
        );
        assert_eq!(asset.backend, "placeholder-svg");
        assert!(control.captured().is_empty());
    }

    /// PlaceholderSvg 后端从不调用 capture adapter。
    #[test]
    fn placeholder_backend_never_invokes_capture_adapter() {
        let (adapter, control) = ControlledCaptureAdapter::new();
        let asset = generate_html_thumbnail_with_adapter(
            HtmlThumbnailInput {
                file_name: "deck.html".to_string(),
                title: None,
                raw_text: None,
                source_url: Some("file:///tmp/none.html".to_string()),
            },
            ThumbnailBackend::PlaceholderSvg,
            &adapter,
        );
        assert_eq!(asset.backend, "placeholder-svg");
        assert!(control.captured().is_empty());
    }

    /// 串行化 NUTBOOK_CHROME_PATH 环境依赖，避免与其它会读该变量的并行测试互相干扰。
    static THUMBNAIL_ENV_LOCK: Mutex<()> = Mutex::new(());

    /// 引擎可用（NUTBOOK_CHROME_PATH 指向存在文件）时，Auto 分支必须通过注入的
    /// adapter 完成 capture；请求尺寸来自固定截图常量。adapter 接管后不会执行
    /// 假浏览器文件。
    #[test]
    fn controlled_adapter_capture_is_used_when_engine_is_available() {
        let _guard = THUMBNAIL_ENV_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let fake = std::env::temp_dir().join(format!(
            "nutbook-fake-chromium-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::write(&fake, b"not a real browser; the adapter never executes it")
            .expect("fake chromium should be written");
        std::env::set_var("NUTBOOK_CHROME_PATH", &fake);

        let (adapter, control) = ControlledCaptureAdapter::new();
        adapter.queue_response(Ok(sample_png_asset()));
        let input = HtmlThumbnailInput {
            file_name: "deck.html".to_string(),
            title: None,
            raw_text: None,
            source_url: Some("file:///tmp/nutbook-controlled-sample.html".to_string()),
        };

        let (done_tx, done_rx) = mpsc::channel();
        std::thread::spawn(move || {
            let asset = generate_html_thumbnail_with_adapter(input, ThumbnailBackend::Auto, &adapter);
            let _ = done_tx.send(asset);
        });

        control.release();
        let asset = done_rx
            .recv_timeout(Duration::from_secs(5))
            .expect("generation should complete after release");
        assert_eq!(asset.backend, "test-png");
        assert_eq!(asset.width, HTML_SCREENSHOT_WIDTH);
        assert_eq!(asset.height, HTML_SCREENSHOT_HEIGHT);

        let captured = control.captured();
        assert_eq!(captured.len(), 1, "capture adapter must be invoked exactly once");
        assert_eq!(captured[0].width, HTML_SCREENSHOT_WIDTH);
        assert_eq!(captured[0].height, HTML_SCREENSHOT_HEIGHT);
        assert_eq!(captured[0].url, "file:///tmp/nutbook-controlled-sample.html");

        std::env::remove_var("NUTBOOK_CHROME_PATH");
        let _ = fs::remove_file(&fake);
    }

    /// 注入的 adapter 返回 Err 时，Auto 分支回退 placeholder，与既有失败降级一致。
    #[test]
    fn controlled_adapter_error_falls_back_to_placeholder() {
        let _guard = THUMBNAIL_ENV_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let fake = std::env::temp_dir().join(format!(
            "nutbook-fake-chromium-err-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::write(&fake, b"not a real browser").expect("fake chromium should be written");
        std::env::set_var("NUTBOOK_CHROME_PATH", &fake);

        let (adapter, control) = ControlledCaptureAdapter::new();
        adapter.queue_response(Err("engine exploded".to_string()));
        let input = HtmlThumbnailInput {
            file_name: "deck.html".to_string(),
            title: None,
            raw_text: None,
            source_url: Some("file:///tmp/nutbook-controlled-sample.html".to_string()),
        };

        let (done_tx, done_rx) = mpsc::channel();
        std::thread::spawn(move || {
            let asset = generate_html_thumbnail_with_adapter(input, ThumbnailBackend::Auto, &adapter);
            let _ = done_tx.send(asset);
        });

        control.release();
        let asset = done_rx
            .recv_timeout(Duration::from_secs(5))
            .expect("generation should complete after release");
        assert_eq!(asset.backend, "placeholder-svg");
        assert_eq!(control.captured().len(), 1);

        std::env::remove_var("NUTBOOK_CHROME_PATH");
        let _ = fs::remove_file(&fake);
    }
}
