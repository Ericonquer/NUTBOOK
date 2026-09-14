use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    thread,
    time::{SystemTime, UNIX_EPOCH},
};

use crate::core::{
    document::{content_hash, file_modified_at_string},
    document_title::DocumentTitle,
    markdown_cover,
    markdown_cover_assets,
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
pub const HTML_CARD_TEMPLATE_VERSION: &str = "html-card-v1";
pub const TITLE_PARSER_VERSION: &str = "title-parser-v1";
/// B4 编辑出版式 hover 安全区修正后 bump：旧 default-cover-v1 居中浅灰缓存、
/// default-cover-v2 书脊缓存、default-cover-v3 色场缓存与 default-cover-v4
/// 顶部横线缓存都不得再被读取为当前 ready，新 key 一律使用 v5。
pub const DEFAULT_COVER_VERSION: &str = "default-cover-v5";
pub const IMAGE_COVER_VERSION: &str = "image-cover-v1";
/// 在线封面只读投影 key 版本。在线封面不下载、不写本地 ready bytes、
/// 不进入本地 CAS；该 key 只标识「源 Markdown 中该 URL 的投影状态」。
pub const REMOTE_COVER_VERSION: &str = "remote-cover-v2";

pub const RENDER_KIND_HTML_SCREENSHOT: &str = "html-screenshot";
pub const RENDER_KIND_MARKDOWN_DEFAULT_COVER: &str = "markdown-default-cover";
pub const RENDER_KIND_MARKDOWN_IMAGE_COVER: &str = "markdown-image-cover";
pub const RENDER_KIND_MARKDOWN_REMOTE_IMAGE_COVER: &str = "markdown-remote-image-cover";
pub const RENDER_KIND_PLACEHOLDER: &str = "placeholder";

pub fn html_desired_key(source_content_hash: &str) -> String {
    format!("html:{source_content_hash}:{HTML_CARD_TEMPLATE_VERSION}")
}

pub fn markdown_default_cover_key(rendered_title_hash: &str) -> String {
    format!(
        "md-default:{rendered_title_hash}:{TITLE_PARSER_VERSION}:{DEFAULT_COVER_VERSION}"
    )
}

/// 在线封面只读投影 key（源 Markdown 中的规范化 http/https URL）。
pub fn markdown_remote_cover_key(remote_url: &str, title_hash: &str) -> String {
    // URL 决定在线图片身份；title hash 决定稳定 fallback。两者任一变化都必须
    // 刷新只读投影，否则同一 URL 下修改标题会长期显示旧 fallback。
    format!(
        "md-remote:{}:{title_hash}:{REMOTE_COVER_VERSION}",
        content_hash(remote_url)
    )
}

/// Markdown 默认封面是否属于当前版本契约（title-parser + default-cover v5）。
/// 读取路径用它对存储的 desired key 做**版本后缀校验**：旧 default-cover-v1、
/// default-cover-v2、default-cover-v3、default-cover-v4、md-screenshot 或任意
/// 其他形状的 key 一律不当作 current key（返回 thumbnail=null，进入自动生成），
/// 不能仅把数据库里已存的 desired key 原样当作 current key。
pub fn markdown_key_is_current(key: &str) -> bool {
    key.starts_with("md-default:")
        && key.ends_with(&format!(":{TITLE_PARSER_VERSION}:{DEFAULT_COVER_VERSION}"))
        || markdown_image_cover_key_is_current(key)
        || markdown_remote_cover_key_is_current(key)
}

/// `md-image:<cover-asset-hash>:image-cover-vN` 当前版本校验。
pub fn markdown_image_cover_key_is_current(key: &str) -> bool {
    key.starts_with("md-image:") && key.ends_with(&format!(":{IMAGE_COVER_VERSION}"))
}

/// `md-remote:<url-hash>:remote-cover-vN` 当前版本校验。
pub fn markdown_remote_cover_key_is_current(key: &str) -> bool {
    key.starts_with("md-remote:") && key.ends_with(&format!(":{REMOTE_COVER_VERSION}"))
}

// ------------------------------------------------------------------
// B4 最终版：编辑出版式封面背景
//
// 8 组固定、低色度、接近相同的浅灰背景。只允许克制的明度/冷暖变化，
// 禁止高饱和色；同一标题每次生成必须得到完全相同的背景与 SVG bytes
// （background index 由标题哈希稳定映射，无 rand / 时间戳 / 进程随机 seed）。
// 背景只是稳定映射的浅灰纸面，不再承担任何装饰语义。
// ------------------------------------------------------------------

pub const MARKDOWN_COVER_BACKGROUND_COUNT: usize = 8;

/// 8 种接近的浅灰背景，全部低色度中性灰阶。
pub const MARKDOWN_COVER_BACKGROUNDS: [&str; MARKDOWN_COVER_BACKGROUND_COUNT] = [
    "#E9E9EA", // 0 中性浅灰
    "#E8EAE8", // 1 微绿浅灰
    "#E7E9EB", // 2 微蓝浅灰
    "#E8EAEB", // 3 冷雾浅灰
    "#EBEAE6", // 4 微暖浅灰
    "#EAE8EB", // 5 微紫浅灰
    "#E7EAEB", // 6 蓝灰浅灰
    "#E8EAE9", // 7 绿雾浅灰
];

/// 从规范化 display title 的标题哈希稳定选择背景 index（确定性，无随机源）。
/// 与 desired key 同源：同一 display title → 同一 title hash → 同一背景。
pub fn stable_background_index(title_hash: &str) -> usize {
    let bytes = title_hash.as_bytes();
    let mut value: u64 = 0;
    for (index, byte) in bytes.iter().take(8).enumerate() {
        value |= (*byte as u64) << (index * 8);
    }
    (value % MARKDOWN_COVER_BACKGROUND_COUNT as u64) as usize
}

/// Markdown 默认封面目标的统一计算入口（B4 合同）：
/// 输入同一次磁盘/raw Markdown 正文与真实 file name，输出 display title、
/// title hash、`md-default` desired key 与 background index。
/// 保存、外部扫描、生成三处共用，保证 key 与背景永远同源。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MarkdownCoverTarget {
    pub display_title: String,
    pub title_hash: String,
    pub desired_key: String,
    pub background_index: usize,
}

pub fn markdown_default_cover_target(raw: &str, file_name: &str) -> MarkdownCoverTarget {
    let title = DocumentTitle::parse(raw, file_name);
    let title_hash = content_hash(&title.display_text);
    let desired_key = markdown_default_cover_key(&title_hash);
    let background_index = stable_background_index(&title_hash);
    MarkdownCoverTarget {
        display_title: title.display_text,
        title_hash,
        desired_key,
        background_index,
    }
}

pub fn markdown_image_cover_key(cover_asset_hash: &str) -> String {
    format!("md-image:{cover_asset_hash}:{IMAGE_COVER_VERSION}")
}

// ------------------------------------------------------------------
// PR C / C2：单文件 Markdown 封面模式投影
//
// 唯一 durable 状态源是磁盘 Markdown 正文顶层的 canonical marker。保存、
// 外部扫描、生成与读取四处都从「同一次正文」推导同一投影：
// - 无 marker / duplicate / marker 后无独立图片块 → Default（标题 SVG）；
// - marker + http/https URL → RemoteImage（只读投影，不下载不缓存）；
// - marker + 本地资源 → LocalImage（校验通过 → 资产哈希 key；校验失败 → 保留
//   封面身份、degraded、key 基于 src 路径哈希，资源恢复后 key 变化自动升级）。
// ------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MarkdownCoverMode {
    Default,
    LocalImage,
    RemoteImage,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MarkdownCoverProjection {
    pub mode: MarkdownCoverMode,
    pub desired_key: String,
    pub render_kind: &'static str,
    /// 标题投影（默认封面/降级/在线 fallback 的 SVG 输入，与 B4 同一标题契约）。
    pub display_title: String,
    pub title_hash: String,
    pub background_index: usize,
    /// 本地封面资源绝对路径（LocalImage 行使用；Default/Remote 为空）。
    pub cover_asset_path: String,
    /// 校验通过时的资源 stat（读取路径复核）；资源缺失/校验失败时为 0。
    pub cover_asset_size: i64,
    pub cover_asset_modified_at: String,
    /// 在线封面 URL（RemoteImage 行使用；其余为空）。
    pub remote_cover_url: String,
    /// LocalImage 身份保留但资源缺失/越界/不合格：卡片回退标题 SVG + hover 警告。
    pub degraded: bool,
    pub degraded_reason: Option<String>,
}

/// 从同一份磁盘 Markdown 计算封面模式投影（C2 的 key/render-kind 权威入口）。
/// `file_path` 用于解析资源基准目录与文件名标题回退。
pub fn markdown_cover_projection(raw: &str, file_path: &str) -> MarkdownCoverProjection {
    let file_name = Path::new(file_path)
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_default();
    let target = markdown_default_cover_target(raw, &file_name);
    let base_dir = Path::new(file_path).parent().map(Path::to_path_buf);
    let parse = markdown_cover::parse_cover_metadata(raw, base_dir.as_deref());
    let duplicate = parse
        .diagnostics
        .iter()
        .any(|d| d.kind == markdown_cover::CoverDiagnosticKind::Duplicate);
    let cover = if duplicate { None } else { parse.cover.as_ref() };

    let common = MarkdownCoverProjection {
        mode: MarkdownCoverMode::Default,
        desired_key: target.desired_key.clone(),
        render_kind: RENDER_KIND_MARKDOWN_DEFAULT_COVER,
        display_title: target.display_title.clone(),
        title_hash: target.title_hash.clone(),
        background_index: target.background_index,
        cover_asset_path: String::new(),
        cover_asset_size: 0,
        cover_asset_modified_at: String::new(),
        remote_cover_url: String::new(),
        degraded: false,
        degraded_reason: None,
    };

    let Some(cover) = cover else {
        return common;
    };
    let src = cover.src.trim();
    if src.starts_with("http://") || src.starts_with("https://") {
        let url = src.to_string();
        return MarkdownCoverProjection {
            mode: MarkdownCoverMode::RemoteImage,
            desired_key: markdown_remote_cover_key(&url, &common.title_hash),
            render_kind: RENDER_KIND_MARKDOWN_REMOTE_IMAGE_COVER,
            display_title: common.display_title,
            title_hash: common.title_hash,
            background_index: common.background_index,
            cover_asset_path: String::new(),
            cover_asset_size: 0,
            cover_asset_modified_at: String::new(),
            remote_cover_url: url,
            degraded: false,
            degraded_reason: None,
        };
    }

    // 本地资源：与 markdown_cover::local_resource_diagnostic 同一越界/符号链接语义。
    let resolved = resolve_cover_asset_path(src, base_dir.as_deref().unwrap_or_else(|| Path::new(".")));
    match resolved {
        Some(resolved) => {
            let stat = std::fs::metadata(&resolved).ok();
            let file_size = stat.as_ref().map(|m| m.len() as i64).unwrap_or(0);
            let file_mtime = stat
                .and_then(|m| file_modified_at_string(&m).ok())
                .unwrap_or_default();
            match markdown_cover_assets::validate_local_cover_asset(&resolved) {
                Ok(asset) => MarkdownCoverProjection {
                    mode: MarkdownCoverMode::LocalImage,
                    desired_key: markdown_image_cover_key(&asset.content_hash),
                    render_kind: RENDER_KIND_MARKDOWN_IMAGE_COVER,
                    display_title: common.display_title,
                    title_hash: common.title_hash,
                    background_index: common.background_index,
                    cover_asset_path: resolved.to_string_lossy().to_string(),
                    cover_asset_size: file_size,
                    cover_asset_modified_at: file_mtime,
                    remote_cover_url: String::new(),
                    degraded: false,
                    degraded_reason: None,
                },
                Err(reject) => MarkdownCoverProjection {
                    mode: MarkdownCoverMode::LocalImage,
                    // 资源缺失/不合格：key 基于 src 路径哈希（资源恢复后新 key → 自动升级）。
                    desired_key: markdown_image_cover_key(&content_hash(src)),
                    render_kind: RENDER_KIND_MARKDOWN_IMAGE_COVER,
                    display_title: common.display_title,
                    title_hash: common.title_hash,
                    background_index: common.background_index,
                    cover_asset_path: resolved.to_string_lossy().to_string(),
                    cover_asset_size: 0,
                    cover_asset_modified_at: String::new(),
                    remote_cover_url: String::new(),
                    degraded: true,
                    degraded_reason: Some(reject.message),
                },
            }
        }
        None => MarkdownCoverProjection {
            mode: MarkdownCoverMode::LocalImage,
            desired_key: markdown_image_cover_key(&content_hash(src)),
            render_kind: RENDER_KIND_MARKDOWN_IMAGE_COVER,
            display_title: common.display_title,
            title_hash: common.title_hash,
            background_index: common.background_index,
            cover_asset_path: String::new(),
            cover_asset_size: 0,
            cover_asset_modified_at: String::new(),
            remote_cover_url: String::new(),
            degraded: true,
            degraded_reason: Some(format!("cover src `{src}` cannot be resolved inside the document directory")),
        },
    }
}

/// 解析本地封面资源路径（词法归一化 + 越界/符号链接检查，语义与
/// `markdown_cover::local_resource_diagnostic` 一致；解析失败返回 None）。
pub fn resolve_cover_asset_path(src: &str, base_dir: &Path) -> Option<std::path::PathBuf> {
    use std::path::{Component, PathBuf};
    if src.is_empty() {
        return None;
    }
    let raw_path = Path::new(src);
    let resolved = if raw_path.is_absolute() {
        raw_path.to_path_buf()
    } else {
        base_dir.join(raw_path)
    };
    let mut normalized = PathBuf::new();
    for component in resolved.components() {
        match component {
            Component::CurDir => {}
            Component::ParentDir => {
                normalized.pop();
            }
            other => normalized.push(other.as_os_str()),
        }
    }
    let base_canonical = base_dir.canonicalize().unwrap_or_else(|_| base_dir.to_path_buf());
    let real = normalized.canonicalize().ok();
    // 资源不存在（含 broken link）时 canonicalize 返回 None：先用父目录的真实路径
    // 做边界比较——macOS /var/folders → /private/var/folders 这类符号链接会令词法
    // 前缀比较把「文档目录内的缺失资源」误判为越界。父目录通常存在（如 assets/）。
    let escaped = match real {
        Some(real) => !real.starts_with(&base_canonical),
        None => match normalized.parent().and_then(|parent| parent.canonicalize().ok()) {
            Some(parent_real) => !parent_real.starts_with(&base_canonical),
            None => !normalized.starts_with(&base_canonical),
        },
    };
    if escaped {
        return None;
    }
    Some(normalized)
}

/// placeholder 不是目标 render kind 的 ready 成品；ready 行必须携带真实 render kind。
pub fn is_placeholder_render_kind(render_kind: Option<&str>) -> bool {
    matches!(render_kind, Some(RENDER_KIND_PLACEHOLDER))
}

/// 根据 item 当前状态计算确定性 desired key：
/// - HTML 使用源内容 hash；
/// - Markdown B4 的 desired key 依赖**标题哈希**（md-default:<rendered-title-hash>），
///   无法仅从源内容 hash 推导，因此这里对 markdown 返回 None；Markdown 的标题哈希
///   key 由 prepare_thumbnail_snapshot 在持有源正文的 snapshot 阶段、对同一次磁盘
///   revision 的 DocumentTitle.display_text 计算（见 markdown_default_cover_key）。
///   读取/失效路径对 markdown 回落到"存储的 desired_key"自身一致性校验，不要求从
///   content hash 反推标题。
///
/// 无法计算的输入（如 markdown 缺标题、html 缺 hash）返回 None，表示该 item 当前
/// 没有可验证的成图目标。
pub fn desired_key_for_item(
    file_type: &str,
    source_content_hash: Option<&str>,
) -> Option<String> {
    match file_type {
        "html" => source_content_hash.map(html_desired_key),
        // Markdown B4：desired key 需要同一次 snapshot 的标题，无法从 content hash 推导，
        // 由 prepare_thumbnail_snapshot 直接构造 markdown_default_cover_key。
        "markdown" => None,
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
    /// PR C / C2：Markdown 封面模式投影（默认/本地图片/在线）；HTML 为 None。
    pub markdown_cover: Option<MarkdownCoverProjection>,
}

/// 每个 file_type 当前唯一合法的 render kind：
/// - HTML：html-screenshot（仍走 Chromium 截图，B4 不改）；
/// - Markdown：markdown-default-cover（B4 起由 Rust 直接生成确定性静态 SVG，无 Chromium）。
/// 读取路径用它对 render_kind 做**精确相等**校验：placeholder、缺失、以及任意
/// 其他非空 render kind（含已退休的 markdown-html-screenshot）都必须拒绝，
/// 防止旧路径产物冒充当前路径的 ready 成品。
pub fn expected_render_kind_for_item(file_type: &str) -> Option<&'static str> {
    match file_type {
        "html" => Some(RENDER_KIND_HTML_SCREENSHOT),
        "markdown" => Some(RENDER_KIND_MARKDOWN_DEFAULT_COVER),
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

    None
}

pub fn system_chrome_thumbnails_enabled() -> bool {
    std::env::var("NUTBOOK_ALLOW_SYSTEM_CHROME_THUMBNAILS").ok().as_deref() == Some("1")
}

pub fn playwright_chromium_executable_candidates(home: &Path) -> Vec<PathBuf> {
    let cache_root = home.join("Library/Caches/ms-playwright");
    playwright_chromium_executable_candidates_in(&cache_root)
}

fn playwright_chromium_executable_candidates_in(cache_root: &Path) -> Vec<PathBuf> {
    let mut candidates = vec![
        cache_root.join("chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell"),
        cache_root.join("chromium_headless_shell-1208/chrome-headless-shell-mac-x64/chrome-headless-shell"),
        cache_root.join("chromium-1208/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        cache_root.join("chromium-1208/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
    ]
    .into_iter()
    .collect::<Vec<_>>();
    let Ok(entries) = fs::read_dir(cache_root) else { return candidates; };
    let mut versions = entries
        .flatten()
        .filter_map(|entry| {
            let name = entry.file_name();
            let name = name.to_str()?;
            (name.starts_with("chromium_headless_shell-") || name.starts_with("chromium-"))
                .then(|| entry.path())
        })
        .collect::<Vec<_>>();
    versions.sort();
    versions.reverse();
    for version in versions {
        candidates.extend([
            version.join("chrome-headless-shell-mac-arm64/chrome-headless-shell"),
            version.join("chrome-headless-shell-mac-x64/chrome-headless-shell"),
            version.join("chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
            version.join("chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
        ]);
    }
    candidates
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
    let result = (|| {
        let args = chromium_screenshot_args(
            &output_path,
            &profile_path,
            &input.url,
            input.width,
            input.height,
        );
        let output = if should_launch_system_browser_via_open(&input.chromium_path) {
            launch_system_browser_screenshot_via_open(&input, &args)?
        } else {
            Command::new(&input.chromium_path)
                .args(&args)
                .output()
                .map_err(|error| format!("failed to launch chromium: {error}"))?
        };

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("chromium screenshot failed: {stderr}"));
        }

        let bytes = fs::read(&output_path).map_err(|error| format!("failed to read screenshot: {error}"))?;
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
    })();

    // Each capture owns a private profile. On macOS, `open -W -n` waits for the
    // dedicated headless Chrome instance to exit before this profile is removed.
    // Without `-W`, later URLs can be routed into a still-running headless app.
    let _ = fs::remove_dir_all(&profile_path);
    let _ = fs::remove_file(&output_path);
    result
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
    args: &[String],
) -> Result<std::process::Output, String> {
    let Some(app_bundle_path) = chromium_app_bundle_path(&input.chromium_path) else {
        return Err("system browser app bundle not found".to_string());
    };

    Command::new("open")
        .args(["-W", "-n"])
        .arg(app_bundle_path)
        .arg("--args")
        .args(args)
        .output()
        .map_err(|error| format!("failed to launch system browser with open: {error}"))
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

// ------------------------------------------------------------------
// B4：Markdown 静态默认封面（确定、安全、无 Chromium）
//
// 直接在内存中生成原生 SVG，不创建临时 Markdown HTML、不调用 Chromium、
// 不复用 placeholder 失败语义、不依赖任何在线字体/图片。key 为
// md-default:<rendered-title-hash>:title-parser-vN:default-cover-vN，
// render kind 为 markdown-default-cover。
//
// 视觉合同（用户需求 §三）：
// - viewBox 固定 0 0 1280 720，与 16:9 一致；
// - 背景覆盖整个 viewBox（中性浅灰）；
// - 黑色标题（接近 #171717），无内缩白卡、无虚线框、无代码图标；
// - 可有很弱的 "MARKDOWN" 辅助标识（不抢标题、不制造内缩卡片感）；
// - 中文按字符换行、英文优先按单词换行、单个超长 token 强制拆分；
// - 限制最大行数，溢出时确定性省略；
// - 不允许水平滚动或 SVG 内容越界；
// - 只输出纯 SVG text/tspan，禁止 script / 事件属性 / 外部 href /
//   未经 XML 转义的标题（不使用 foreignObject）。
// ------------------------------------------------------------------

const MARKDOWN_COVER_WIDTH: i32 = 1280;
const MARKDOWN_COVER_HEIGHT: i32 = 720;
/// 标题左边距（左对齐，不贴边）。
const MARKDOWN_COVER_TITLE_X: f64 = 96.0;
/// 第一行标题顶部锚定 y（不再垂直居中）；随横线一同下沉，形成更紧密的出版式题签。
const MARKDOWN_COVER_TITLE_TOP: f64 = 280.0;
/// 标题安全宽度（1280 - 96 左边距 - 144 右侧稳定边距）。
const MARKDOWN_COVER_TEXT_MAX_WIDTH: f64 = 1040.0;
/// 底部安全区：最后一行不得越过该基线（720 - ~95px），避免与来源标签/MD 徽标重叠。
const MARKDOWN_COVER_TITLE_SAFE_BOTTOM: f64 = 625.0;
/// 最多四行。
const MARKDOWN_COVER_MAX_LINES: usize = 4;
/// 自适应字号档位（从大到小尝试，完整容纳的最大字号）。
const MARKDOWN_COVER_FONT_SIZES: [f64; 4] = [82.0, 72.0, 64.0, 56.0];
/// 行高系数（约 1.28 倍字号）。
const MARKDOWN_COVER_LINE_HEIGHT_RATIO: f64 = 1.28;
/// 左上粗横线几何：x=96 y=210 width=216 height=6，方形端点（不设 rx）、
/// 不透明、无渐变，颜色固定不随背景变化。y=210 避开宿主卡片左上角约
/// 40px 的 hover 操作安全区，并让横线与标题形成更紧密的出版式题签。
const MARKDOWN_COVER_RULE_X: f64 = 96.0;
const MARKDOWN_COVER_RULE_Y: f64 = 210.0;
const MARKDOWN_COVER_RULE_WIDTH: f64 = 216.0;
const MARKDOWN_COVER_RULE_HEIGHT: f64 = 6.0;
const MARKDOWN_COVER_RULE_FILL: &str = "#5F6366";

/// 选择能完整容纳标题的最大字号；全部档位都放不下时用最小档位并在第四行确定性省略。
/// 返回 (font_size, wrapped_lines)。完整容纳 = 换行后行数 ≤ 4 且未触发省略号截断。
fn adaptive_markdown_cover_font(title: &str) -> (f64, Vec<String>) {
    for size in MARKDOWN_COVER_FONT_SIZES {
        let lines =
            wrap_markdown_cover_title(title, size, MARKDOWN_COVER_TEXT_MAX_WIDTH, MARKDOWN_COVER_MAX_LINES);
        let truncated = lines
            .last()
            .map(|line| line.ends_with('…'))
            .unwrap_or(false);
        if lines.len() <= MARKDOWN_COVER_MAX_LINES && !truncated {
            return (size, lines);
        }
    }
    let lines = wrap_markdown_cover_title(
        title,
        MARKDOWN_COVER_FONT_SIZES[MARKDOWN_COVER_FONT_SIZES.len() - 1],
        MARKDOWN_COVER_TEXT_MAX_WIDTH,
        MARKDOWN_COVER_MAX_LINES,
    );
    (MARKDOWN_COVER_FONT_SIZES[MARKDOWN_COVER_FONT_SIZES.len() - 1], lines)
}

/// 生成 Markdown 默认封面资产（纯内存 SVG，不触碰 Chromium / adapter）。
/// `title_hash` 与 desired key 同源（display title 的哈希），用于稳定选择背景。
pub fn generate_markdown_default_cover_asset(
    display_title: &str,
    title_hash: &str,
) -> GeneratedThumbnailAsset {
    let svg = generate_markdown_default_cover_svg(display_title, title_hash);
    let bytes = svg.clone().into_bytes();
    GeneratedThumbnailAsset {
        backend: "markdown-default-cover",
        content_type: "image/svg+xml",
        file_extension: "svg",
        bytes,
        svg,
        width: MARKDOWN_COVER_WIDTH,
        height: MARKDOWN_COVER_HEIGHT,
    }
}

/// 生成 Markdown 默认封面 SVG 字符串（确定性、安全）。
///
/// 最终版式（编辑出版式）：1280×720 全幅；背景为稳定映射的浅灰纸面（palette 背景
/// 数组）；左上方一条明确的粗横线（x=96 y=210 w=216 h=6 #5F6366，方形端点，
/// 避开宿主 hover 操作安全区）；标题位于中左区域、顶部锚定 y=280、自适应字号
/// （82/72/64/56 从大到小）、
/// 最多四行、底部 ~95px 安全区；右下角不生成任何 SVG 元素（真实卡片已有标签与
/// MD 徽标）；无 "MARKDOWN"/"MD" 文案、无色场/书脊/水印/第二条线/内框/虚线框/
/// 图标/渐变/纹理/圆形或抽象形状。background index 由标题哈希稳定映射，
/// 同一标题每次生成 byte-identical。
pub fn generate_markdown_default_cover_svg(display_title: &str, title_hash: &str) -> String {
    let (font_size, lines) = adaptive_markdown_cover_font(display_title);
    let background = MARKDOWN_COVER_BACKGROUNDS[stable_background_index(title_hash)];
    let line_height = font_size * MARKDOWN_COVER_LINE_HEIGHT_RATIO;
    let line_count = lines.len() as f64;
    // 顶部锚定：第一行字顶固定在 TITLE_TOP，first baseline = TITLE_TOP + ascent
    // （ascent ≈ 0.82 * font_size）。多行时整体向下延伸，不再垂直居中。
    let mut first_baseline = MARKDOWN_COVER_TITLE_TOP + font_size * 0.82;
    // 底部安全区：最后一行（含 descent）不得越过 625，必要时整体上移。
    let bottom = first_baseline + (line_count - 1.0) * line_height + font_size * 0.2;
    if bottom > MARKDOWN_COVER_TITLE_SAFE_BOTTOM {
        first_baseline -= bottom - MARKDOWN_COVER_TITLE_SAFE_BOTTOM;
    }

    let mut tspans = String::new();
    for (index, line) in lines.iter().enumerate() {
        let dy = if index == 0 { 0.0 } else { line_height };
        tspans.push_str(&format!(
            "<tspan x=\"{tx}\" dy=\"{dy:.2}\">{escaped}</tspan>\n",
            tx = MARKDOWN_COVER_TITLE_X,
            dy = dy,
            escaped = escape_svg_text(line)
        ));
    }
    format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
<rect width="{w}" height="{h}" fill="{background}"/>
<rect x="{rx}" y="{ry}" width="{rw}" height="{rh}" fill="{rule_fill}"/>
<text x="{tx}" y="{y0:.2}" font-family="system-ui,-apple-system,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif" font-size="{fs}" font-weight="700" fill="#171717">{tspans}</text>
</svg>"##,
        w = MARKDOWN_COVER_WIDTH,
        h = MARKDOWN_COVER_HEIGHT,
        background = background,
        rx = MARKDOWN_COVER_RULE_X,
        ry = MARKDOWN_COVER_RULE_Y,
        rw = MARKDOWN_COVER_RULE_WIDTH,
        rh = MARKDOWN_COVER_RULE_HEIGHT,
        rule_fill = MARKDOWN_COVER_RULE_FILL,
        tx = MARKDOWN_COVER_TITLE_X,
        y0 = first_baseline,
        fs = font_size,
        tspans = tspans
    )
}

fn escape_svg_text(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn is_cjk_char(ch: char) -> bool {
    let code = ch as u32;
    (0x3000..=0x30FF).contains(&code)
        || (0x3400..=0x4DBF).contains(&code)
        || (0x4E00..=0x9FFF).contains(&code)
        || (0xF900..=0xFAFF).contains(&code)
        || (0xFF00..=0xFFEF).contains(&code)
        || (0x20000..=0x2FA1F).contains(&code)
}

/// 单个字形在给定 font-size 下的近似像素宽度（保守估计，略大于常见渲染，
/// 用以保证换行后不会水平溢出）。CJK 约 1em；空白 0.3em；ASCII 字母数字/
/// 标点约 0.56em；其余符号约 0.62em。
fn svg_char_width(ch: char, font_size: f64) -> f64 {
    if ch.is_whitespace() {
        font_size * 0.3
    } else if is_cjk_char(ch) {
        font_size * 1.0
    } else if ch.is_ascii_alphanumeric() || ch.is_ascii_punctuation() {
        font_size * 0.56
    } else {
        font_size * 0.62
    }
}

fn svg_text_width(text: &str, font_size: f64) -> f64 {
    text.chars().map(|c| svg_char_width(c, font_size)).sum()
}

enum TitleToken {
    Space,
    Glyph(char),
    Word(String),
}

/// 把标题拆成换行/断词单元：空白为分隔符；CJK 每个字单独成单元（任意位置可断）；
/// 连续的非空白非 CJK 字符构成一个 word（仅可在空格处断），超长无空格 word 在
/// 渲染阶段逐字符强制拆分。
fn tokenize_markdown_title(title: &str) -> Vec<TitleToken> {
    let chars: Vec<char> = title.chars().collect();
    let mut tokens = Vec::new();
    let mut i = 0;
    while i < chars.len() {
        let c = chars[i];
        if c.is_whitespace() {
            tokens.push(TitleToken::Space);
            i += 1;
            continue;
        }
        if is_cjk_char(c) {
            tokens.push(TitleToken::Glyph(c));
            i += 1;
            continue;
        }
        let start = i;
        while i < chars.len() && !chars[i].is_whitespace() && !is_cjk_char(chars[i]) {
            i += 1;
        }
        tokens.push(TitleToken::Word(chars[start..i].iter().collect()));
    }
    tokens
}

/// 确定性换行：中文按字符、英文按单词、超长无空格 token 强制拆分；限制最大行数，
/// 溢出时最后一行追加省略号。绝不产生超过 max_width 的行。
fn wrap_markdown_cover_title(
    title: &str,
    font_size: f64,
    max_width: f64,
    max_lines: usize,
) -> Vec<String> {
    let tokens = tokenize_markdown_title(title);
    let space_w = svg_char_width(' ', font_size);
    let mut lines: Vec<String> = Vec::new();
    let mut current = String::new();
    let mut current_w = 0.0_f64;

    for token in tokens {
        match token {
            TitleToken::Space => {
                if !current.is_empty() && !current.ends_with(' ') {
                    current.push(' ');
                    current_w += space_w;
                }
            }
            TitleToken::Glyph(c) => {
                let w = svg_char_width(c, font_size);
                if current.is_empty() || current_w + w <= max_width {
                    current.push(c);
                    current_w += w;
                } else {
                    lines.push(std::mem::take(&mut current));
                    current.push(c);
                    current_w = w;
                }
            }
            TitleToken::Word(word) => {
                let w = svg_text_width(&word, font_size);
                if w > max_width {
                    // 超长无空格 token：即使当前行是空的也必须逐字符强制拆分，
                    // 否则整个 token 会被吞进一行造成水平溢出。
                    for c in word.chars() {
                        let cw = svg_char_width(c, font_size);
                        if current.is_empty() || current_w + cw <= max_width {
                            current.push(c);
                            current_w += cw;
                        } else {
                            lines.push(std::mem::take(&mut current));
                            current.push(c);
                            current_w = cw;
                        }
                    }
                } else if current.is_empty() || current_w + w <= max_width {
                    current.push_str(&word);
                    current_w += w;
                } else {
                    lines.push(std::mem::take(&mut current));
                    current = word;
                    current_w = w;
                }
            }
        }
    }
    if !current.is_empty() {
        lines.push(current);
    }

    if lines.len() > max_lines {
        let mut truncated = lines[..max_lines].to_vec();
        let last = truncated.last_mut().expect("has line");
        let ellipsis_w = svg_char_width('…', font_size);
        // 追加省略号前必须保证最后一行不超宽：先去末尾空白，再逐字符回退
        // 直到"内容宽度 + 省略号宽度"能放下，绝不产生水平溢出。
        while last.ends_with(char::is_whitespace) {
            last.pop();
        }
        while !last.is_empty() && svg_text_width(last, font_size) + ellipsis_w > max_width {
            last.pop();
        }
        last.push('…');
        truncated
    } else {
        lines
    }
}

#[cfg(test)]
mod tests {
    use super::{
        adaptive_markdown_cover_font, build_placeholder_html_thumbnail, capture_html_thumbnail_with_chromium,
        capture_presentation_thumbnail_with_chromium, capture_presentation_thumbnail_with_worker, chromium_app_bundle_path, chromium_screenshot_args, find_local_chromium_executable, generate_html_thumbnail,
        generate_html_thumbnail_with_adapter, generate_markdown_default_cover_asset,
        generate_markdown_default_cover_svg, markdown_cover_projection, markdown_default_cover_key,
        markdown_default_cover_target, markdown_key_is_current, playwright_chromium_executable_candidates, playwright_chromium_executable_candidates_in,
        should_launch_system_browser_via_open, stable_background_index, system_chrome_thumbnails_enabled, MarkdownCoverMode,
        svg_text_width, thumbnail_backend_status, wrap_markdown_cover_title, ChromiumScreenshotInput, DefaultThumbnailCaptureAdapter, GeneratedThumbnailAsset, MARKDOWN_COVER_BACKGROUNDS, MARKDOWN_COVER_LINE_HEIGHT_RATIO, MARKDOWN_COVER_TITLE_SAFE_BOTTOM, MARKDOWN_COVER_TITLE_TOP, PresentationScreenshotInput, PresentationThumbnailWorkerInput,
        HtmlThumbnailInput, ThumbnailBackend, ThumbnailCaptureAdapter, HTML_SCREENSHOT_HEIGHT, HTML_SCREENSHOT_WIDTH,
    };
    use crate::core::document::content_hash;
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

    // ------------------------------------------------------------------
    // B4：Markdown 静态默认封面（确定性、安全、16:9 全幅、无 Chromium）
    // ------------------------------------------------------------------

    #[test]
    fn markdown_default_cover_asset_is_deterministic_16x9_svg() {
        let title = "普通 H1 文档";
        let title_hash = content_hash(title);
        let a = generate_markdown_default_cover_asset(title, &title_hash);
        let b = generate_markdown_default_cover_asset(title, &title_hash);
        assert_eq!(a.bytes, b.bytes, "same title must produce byte-identical cover");
        assert_eq!(a.backend, "markdown-default-cover");
        assert_eq!(a.content_type, "image/svg+xml");
        assert_eq!(a.file_extension, "svg");
        assert_eq!(a.width, 1280);
        assert_eq!(a.height, 720);
        let svg = String::from_utf8(a.bytes).expect("utf8 svg");
        assert!(svg.contains("viewBox=\"0 0 1280 720\""));
        assert!(svg.contains("fill=\"#171717\""));
        assert!(svg.contains("普通 H1 文档"));
        // 编辑出版式：背景必须是八种浅灰之一（由标题哈希稳定映射）。
        let background = MARKDOWN_COVER_BACKGROUNDS[stable_background_index(&title_hash)];
        assert!(
            MARKDOWN_COVER_BACKGROUNDS.contains(&background),
            "background must come from the fixed eight-tone array"
        );
        assert!(svg.contains(&format!("fill=\"{background}\"")), "background must match mapping");
        // 唯一横线：x=96 y=210 width=216 height=6 fill=#5F6366，方形端点、不透明；
        // 下沉后避开宿主卡片左上角 hover 操作安全区。
        assert_eq!(
            svg.matches("width=\"216\" height=\"6\"").count(),
            1,
            "exactly one top-left rule"
        );
        assert!(
            svg.contains("<rect x=\"96\" y=\"210\" width=\"216\" height=\"6\" fill=\"#5F6366\"/>"),
            "rule must use the hover-safe editorial geometry"
        );
        assert!(!svg.contains("rx=\""), "rule must be square-ended (no rounded rx)");
        assert!(!svg.contains("<linearGradient"), "rule must be opaque, no gradient");
        // 无色场/书脊/水印/第二条装饰线。
        assert_eq!(svg.matches("<ellipse").count(), 0, "color field must be gone");
        assert_eq!(svg.matches("<circle").count(), 0, "circles must be gone");
        assert!(!svg.contains("width=\"56\" height=\"720\""), "bookspine must be gone");
        assert!(!svg.contains("width=\"48\" height=\"4\""), "spine rule must be gone");
        // 标题左对齐（x=96）、顶部锚定 TITLE_TOP=280：单行 82px → 基线
        // y = 280 + 82*0.82 = 347.24（不再垂直居中，也不贴左上角）。
        assert!(svg.contains("x=\"96\""), "title must be left-aligned at the left margin");
        assert!(svg.contains("y=\"347.24\""), "single-line title must anchor at TITLE_TOP");
        assert!(!svg.contains("text-anchor=\"middle\""));
        assert!(!svg.contains("MARKDOWN"), "cover must not repeat the file-type label");
        assert!(!svg.contains(">MD<"), "cover must not repeat the file-type label");
        // 无内缩白卡/虚线框/代码图标/渐变/纹理/圆点/其他抽象形状。
        assert!(!svg.contains("stroke-dasharray"));
        assert!(!svg.contains("<linearGradient"));
        assert!(!svg.contains("<path"));
    }

    #[test]
    fn markdown_default_cover_svg_escapes_title_and_never_injects() {
        // 标题必须做 XML 转义：& < > 转义，禁止 script / foreignObject / 事件属性 /
        // 外部 href 注入（纯 text/tspan 渲染）。标题可能被换行拆分，逐片段断言转义。
        let svg = generate_markdown_default_cover_svg("<script>alert(1)</script> & \"Doc\"", "title-hash");
        assert!(svg.contains("&lt;script&gt;"), "script tag must be escaped");
        assert!(svg.contains("alert(1)"));
        assert!(svg.contains("&amp;"), "ampersand must be escaped");
        assert!(!svg.contains("<script>"), "raw script tag must never appear");
        assert!(!svg.contains("foreignObject"));
        assert!(!svg.contains("onload="));
        assert!(!svg.contains("onerror="));
        assert!(!svg.contains("href="));
        assert!(!svg.contains("javascript:"));
    }

    #[test]
    fn markdown_background_is_stable_and_distributed_across_fixture_titles() {
        // 同一标题哈希永远映射同一背景；不同标题至少分布到 3 种以上背景，
        // 证明不是所有封面同色。
        let hash_a = content_hash("普通 H1 文档");
        for _ in 0..10 {
            assert_eq!(
                stable_background_index(&hash_a),
                stable_background_index(&hash_a)
            );
        }
        let fixture_titles = [
            "普通 H1 文档",
            "markdown-no-h1.md",
            "Setext 一级标题用下划线式语法表示",
            "居中容器内的 H1",
            "第一个有效 H1 才是标题",
            "这是一个用于验证超长中文标题换行与截断行为的验收样本标题，它的长度必须明显超过卡片封面可用宽度，从而检验标题封面在 CJK 文本下按字符边界确定性换行、缩小字号或截断且不溢出卡片",
            "The Definitive Guide to Building a Very Long Latin Document Title That Will Absolutely Exceed Any Reasonable Card Thumbnail Width On The Home Screen Grid",
            "正文真正的标题",
            "代码块里的假 H1 不是标题",
        ];
        let indices: std::collections::BTreeSet<usize> = fixture_titles
            .iter()
            .map(|t| stable_background_index(&content_hash(t)))
            .collect();
        assert!(
            indices.len() >= 3,
            "fixture titles must map to at least 3 distinct backgrounds, got {indices:?}"
        );
        assert!(indices.iter().all(|i| *i < MARKDOWN_COVER_BACKGROUNDS.len()));
    }

    #[test]
    fn markdown_cover_font_scales_with_title_length() {
        // 短标题用最大档位字号；长标题 4 行内截断用最小档位。
        let (short_size, short_lines) = adaptive_markdown_cover_font("短标题");
        assert_eq!(short_size, 82.0, "short title must use the largest font size");
        assert_eq!(short_lines.len(), 1);
        let long_cjk = "这是一个用于验证超长中文标题换行与截断行为的验收样本标题，它的长度必须明显超过卡片封面可用宽度，从而检验标题封面在 CJK 文本下按字符边界确定性换行、缩小字号或截断且不溢出卡片";
        let (long_size, long_lines) = adaptive_markdown_cover_font(long_cjk);
        assert!(long_size < 82.0, "long title must use a smaller font size");
        assert!(
            long_lines.len() <= 4,
            "long title must be capped at four lines, got {}",
            long_lines.len()
        );
        for line in &long_lines {
            assert!(svg_text_width(line, long_size) <= 1040.0, "line {line:?} overflows");
        }
    }

    #[test]
    fn markdown_cover_svg_lays_out_four_lines_above_bottom_safe_zone() {
        // 长 CJK 标题：自适应字号落到最小档 56px、最多四行、第四行省略号；
        // 第一行顶部锚定 TITLE_TOP=280；最后一行基线不得越过底部安全区。
        let long_cjk = "这是一个用于验证超长中文标题换行与截断行为的验收样本标题，它的长度必须明显超过卡片封面可用宽度，从而检验标题封面在 CJK 文本下按字符边界确定性换行、缩小字号或截断且不溢出卡片";
        let title_hash = content_hash(long_cjk);
        let svg = generate_markdown_default_cover_svg(long_cjk, &title_hash);
        assert_eq!(svg.matches("<tspan").count(), 4, "must cap at four lines");
        // 解析 text 的 y0 与 font-size（两者均确定性输出；用 <text x="96" y=" 定位）。
        let y0: f64 = svg
            .split("<text x=\"96\" y=\"")
            .nth(1)
            .and_then(|rest| rest.split('"').next())
            .and_then(|value| value.parse().ok())
            .expect("y0");
        let fs: f64 = svg
            .split("font-size=\"")
            .nth(1)
            .and_then(|rest| rest.split('"').next())
            .and_then(|value| value.parse().ok())
            .expect("font size");
        assert_eq!(fs, 56.0, "long title must fall back to the smallest font size");
        // 顶部锚定：y0 - ascent(0.82*fs) == TITLE_TOP。
        assert!(
            (y0 - fs * 0.82 - MARKDOWN_COVER_TITLE_TOP).abs() < 0.01,
            "first line must anchor at TITLE_TOP, y0={y0}"
        );
        let last_baseline = y0 + 3.0 * fs * MARKDOWN_COVER_LINE_HEIGHT_RATIO;
        assert!(
            last_baseline <= MARKDOWN_COVER_TITLE_SAFE_BOTTOM,
            "last line must stay above the bottom safe zone, got {last_baseline}"
        );
        // 无色场/书脊/第二条装饰线。
        assert!(!svg.contains("<ellipse"));
        assert!(!svg.contains("width=\"56\" height=\"720\""));
        assert!(!svg.contains("width=\"48\" height=\"4\""));
        assert_eq!(svg.matches("<rect").count(), 2, "exactly background + one rule");
    }

    #[test]
    fn markdown_key_is_current_accepts_v5_and_rejects_v4_v3_v2_v1_and_screenshot() {
        let current = markdown_default_cover_key("title-hash");
        assert!(markdown_key_is_current(&current), "v5 key must be current");
        assert!(!markdown_key_is_current("md-default:title-hash:title-parser-v1:default-cover-v1"));
        assert!(!markdown_key_is_current("md-default:title-hash:title-parser-v1:default-cover-v2"));
        assert!(!markdown_key_is_current("md-default:title-hash:title-parser-v1:default-cover-v3"));
        assert!(!markdown_key_is_current("md-default:title-hash:title-parser-v1:default-cover-v4"));
        assert!(!markdown_key_is_current("md-screenshot:title-hash:md-screenshot-v1"));
        // PR C / C2：md-image / md-remote 是当前封面路径的合法 key；更早版本拒绝。
        assert!(markdown_key_is_current("md-image:hash:image-cover-v1"));
        assert!(!markdown_key_is_current("md-image:hash:image-cover-v0"));
        assert!(markdown_key_is_current("md-remote:urlhash:titlehash:remote-cover-v2"));
        assert!(!markdown_key_is_current("md-remote:urlhash:remote-cover-v1"));
        assert!(!markdown_key_is_current("html:hash:html-card-v1"));
        assert!(!markdown_key_is_current(""));
    }

    #[test]
    fn remote_cover_key_tracks_url_and_fallback_title_without_rewriting_the_url() {
        let url = "https://example.invalid/cover.png";
        let first = markdown_cover_projection(
            &format!("# First\n\n<!-- nutbook-cover -->\n\n![Hero]({url})\n"),
            "/tmp/note.md",
        );
        let renamed = markdown_cover_projection(
            &format!("# Renamed\n\n<!-- nutbook-cover -->\n\n![Hero]({url})\n"),
            "/tmp/note.md",
        );
        assert_eq!(first.mode, MarkdownCoverMode::RemoteImage);
        assert_eq!(first.remote_cover_url, url);
        assert_eq!(renamed.remote_cover_url, url);
        assert_ne!(
            first.desired_key, renamed.desired_key,
            "fallback title changes must invalidate the remote projection"
        );
    }

    #[test]
    fn markdown_default_cover_target_derives_key_and_background_from_disk_title() {
        let target = markdown_default_cover_target("# Hero Doc\n\nBody", "a.md");
        assert_eq!(target.display_title, "Hero Doc");
        assert_eq!(target.title_hash, content_hash("Hero Doc"));
        assert_eq!(
            target.desired_key,
            markdown_default_cover_key(&content_hash("Hero Doc"))
        );
        assert_eq!(
            target.background_index,
            stable_background_index(&content_hash("Hero Doc"))
        );
        // 无 H1 → 文件名 fallback。
        let fallback = markdown_default_cover_target("no heading here", "b.md");
        assert_eq!(fallback.display_title, "b.md");
        // 只改正文不改标题 → key / background 完全不变。
        let same_title = markdown_default_cover_target("# Hero Doc\n\nDifferent body", "a.md");
        assert_eq!(target.desired_key, same_title.desired_key);
        assert_eq!(target.background_index, same_title.background_index);
    }

    #[test]
    fn markdown_cover_title_wraps_cjk_by_char_without_overflow() {
        let title = "中文标题很长很长的文档名称用于验证逐字换行不会水平溢出";
        let lines = wrap_markdown_cover_title(title, 56.0, 1040.0, 7);
        assert!(lines.len() > 1, "long cjk title must wrap to multiple lines");
        for line in &lines {
            assert!(
                svg_text_width(line, 56.0) <= 1040.0,
                "line {line:?} overflows max width"
            );
        }
        // 逐字可断：任意位置断行后不残留半个词。
        let joined: String = lines.iter().flat_map(|line| line.chars()).collect();
        let expected: String = title.chars().collect();
        assert_eq!(joined, expected, "wrapping must not lose or reorder glyphs");
    }

    #[test]
    fn markdown_cover_title_wraps_english_by_word_without_overflow() {
        let title = "The quick brown fox jumps over the lazy dog while the world keeps turning round and round";
        let lines = wrap_markdown_cover_title(title, 56.0, 1040.0, 7);
        assert!(lines.len() > 1);
        for line in &lines {
            assert!(svg_text_width(line, 56.0) <= 1040.0, "line {line:?} overflows");
        }
        // 非超长单词不允许在中间被拆开。
        for line in &lines {
            for word in line.split(' ').filter(|w| !w.is_empty()) {
                assert!(
                    title.split(' ').any(|original| original == word),
                    "word {word:?} must not be split mid-word"
                );
            }
        }
    }

    #[test]
    fn markdown_cover_title_force_splits_unbroken_long_token() {
        // 单个无空格超长 token（URL / 文件名）必须被强制逐字符拆分且不溢出。
        let token = "a".repeat(300);
        let lines = wrap_markdown_cover_title(&token, 56.0, 1040.0, 7);
        assert!(lines.len() > 1, "unbroken long token must be force-split");
        for line in &lines {
            assert!(svg_text_width(line, 56.0) <= 1040.0, "line {line:?} overflows");
        }
    }

    #[test]
    fn markdown_cover_title_truncates_at_max_lines_with_ellipsis() {
        // 超过 max_lines 时：保留前 max_lines 行，最后一行确定性追加省略号。
        let title = "一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十";
        let lines = wrap_markdown_cover_title(title, 56.0, 1040.0, 7);
        assert_eq!(lines.len(), 7, "must cap at max_lines");
        assert!(
            lines.last().expect("has last").ends_with('…'),
            "truncated last line must end with ellipsis"
        );
    }

    #[test]
    fn markdown_cover_title_single_word_and_no_title_are_stable() {
        // 单个短单词与空标题都不会 panic，且不产生越界行。
        let single = wrap_markdown_cover_title("One", 56.0, 1040.0, 7);
        assert_eq!(single, vec!["One".to_string()]);
        let empty = wrap_markdown_cover_title("", 56.0, 1040.0, 7);
        assert!(empty.is_empty());
        let whitespace = wrap_markdown_cover_title("   \n  ", 56.0, 1040.0, 7);
        assert!(whitespace.is_empty());
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
    fn playwright_chromium_candidates_include_installed_newer_versions() {
        let directory = tempfile::tempdir().expect("temporary cache directory");
        let cache = directory.path();
        fs::create_dir_all(cache.join("chromium_headless_shell-1228/chrome-headless-shell-mac-arm64"))
            .expect("headless shell cache directory");
        let candidates = playwright_chromium_executable_candidates_in(cache);
        assert!(candidates.iter().any(|path| {
            path.ends_with("chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell")
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
    fn system_browser_uses_a_dedicated_app_instance() {
        let chrome = Path::new("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
        assert_eq!(
            chromium_app_bundle_path(chrome),
            Some(PathBuf::from("/Applications/Google Chrome.app"))
        );
        assert!(should_launch_system_browser_via_open(chrome));
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
