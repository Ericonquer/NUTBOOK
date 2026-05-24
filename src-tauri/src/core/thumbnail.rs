use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::{SystemTime, UNIX_EPOCH},
};

const HTML_SCREENSHOT_WIDTH: i32 = 1280;
const HTML_SCREENSHOT_HEIGHT: i32 = 720;

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

pub fn generate_html_thumbnail(
    input: HtmlThumbnailInput,
    backend: ThumbnailBackend,
) -> GeneratedThumbnailAsset {
    match backend {
        ThumbnailBackend::Auto => {
            if let (Some(chromium_path), Some(source_url)) =
                (find_local_chromium_executable(), input.source_url.clone())
            {
                if let Ok(asset) = capture_html_thumbnail_with_chromium(ChromiumScreenshotInput {
                    chromium_path,
                    url: source_url,
                    width: HTML_SCREENSHOT_WIDTH,
                    height: HTML_SCREENSHOT_HEIGHT,
                }) {
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
    let display_title = input
        .title
        .filter(|value| !value.trim().is_empty())
        .unwrap_or(input.file_name);
    let preview_line = input
        .raw_text
        .as_deref()
        .map(strip_html_like_text)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "HTML document preview".to_string());

    let svg = format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
<rect width="800" height="500" rx="24" fill="#f2f2f5"/>
<rect x="24" y="24" width="752" height="452" rx="20" fill="#ffffff" stroke="#e2e2e4"/>
<rect x="48" y="52" width="180" height="22" rx="11" fill="#111111" fill-opacity="0.08"/>
<rect x="48" y="104" width="704" height="1" fill="#ececef"/>
<text x="48" y="162" fill="#111111" font-family="Inter, PingFang SC, sans-serif" font-size="34" font-weight="700">{}</text>
<text x="48" y="214" fill="#5e5e63" font-family="Inter, PingFang SC, sans-serif" font-size="20">{}</text>
<rect x="48" y="254" width="248" height="156" rx="14" fill="#f4f4f6" stroke="#ececef"/>
<rect x="320" y="254" width="188" height="14" rx="7" fill="#e7e7ea"/>
<rect x="320" y="282" width="232" height="14" rx="7" fill="#ededf0"/>
<rect x="320" y="310" width="204" height="14" rx="7" fill="#ededf0"/>
<rect x="320" y="356" width="278" height="12" rx="6" fill="#f0f0f2"/>
<rect x="320" y="380" width="244" height="12" rx="6" fill="#f0f0f2"/>
<rect x="48" y="430" width="74" height="24" rx="12" fill="#18181b" fill-opacity="0.75"/>
<text x="85" y="447" fill="#ffffff" text-anchor="middle" font-family="Inter, PingFang SC, sans-serif" font-size="12" font-weight="700">HTML</text>
</svg>"##,
        escape_svg_text(&display_title, 52),
        escape_svg_text(&preview_line, 92),
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

fn strip_html_like_text(raw: &str) -> String {
    let mut text = String::with_capacity(raw.len());
    let mut in_tag = false;
    for ch in raw.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => text.push(ch),
            _ => {}
        }
    }

    text.split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(92)
        .collect()
}

fn escape_svg_text(value: &str, limit: usize) -> String {
    value
        .chars()
        .take(limit)
        .collect::<String>()
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}

#[cfg(test)]
mod tests {
    use super::{
        build_placeholder_html_thumbnail, capture_html_thumbnail_with_chromium,
        chromium_app_bundle_path, chromium_screenshot_args, find_local_chromium_executable, generate_html_thumbnail,
        playwright_chromium_executable_candidates, system_chrome_thumbnails_enabled,
        should_launch_system_browser_via_open, thumbnail_backend_status, ChromiumScreenshotInput,
        HtmlThumbnailInput, ThumbnailBackend, HTML_SCREENSHOT_HEIGHT, HTML_SCREENSHOT_WIDTH,
    };
    use std::{fs, path::{Path, PathBuf}};

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
        assert!(asset.svg.contains("AI Deck"));
        assert!(asset.svg.contains("Slide"));
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
}
