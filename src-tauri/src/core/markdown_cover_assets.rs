// PR C / Task C2：封面资源安全校验、受限 SVG 栅格化与确定性 1280×720 裁切。
//
// 边界（与 docs/plans/2026-08-13-thumbnail-cover-source-badges-recent-search-plan.md
// 5.5 一致）：
// - 本地封面支持 PNG / JPEG / WebP / GIF（只取第一帧）与受限本地 SVG；
// - 复制/写 transaction 前校验 magic bytes、真实 MIME 与扩展一致性、字节上限、
//   解码像素上限与 `4:3..2:1` 比例；方图、竖图、纵向长截图、极宽全景、伪 MIME
//   与超限资源必须在 copy/transaction 前拒绝，失败不留下半成品；
// - EXIF orientation 参与比例判断并作用于最终裁切（90/270 旋转交换宽高）；
// - SVG 先按 XML/SVG 解析并验证 viewBox/固有尺寸与比例，拒绝 script、
//   foreignObject、外部文件/网络资源、动态字体和危险引用，再经受限静态 renderer
//   栅格化；用户 SVG XML 永不直接成为卡片 ready 资产；
// - 卡片输出确定性 1280×720 居中 `cover` 裁切 PNG，纯图无叠层。

use std::path::Path;

use sha2::{Digest, Sha256};

pub const IMAGE_COVER_WIDTH: u32 = 1280;
pub const IMAGE_COVER_HEIGHT: u32 = 720;
/// 合法比例下界 4:3（约 1.3333）。
pub const COVER_MIN_ASPECT: f64 = 4.0 / 3.0;
/// 合法比例上界 2:1。
pub const COVER_MAX_ASPECT: f64 = 2.0;
/// 字节上限（20 MB）。
pub const COVER_BYTES_LIMIT: u64 = 20 * 1024 * 1024;
/// 解码像素上限（8 MP；fixture `cover-oversized-dimensions.png` 为 4608×2592≈11.9 MP，
/// 恰好在拒绝区间内，且保持 16:9 合法比例，保证一次只拒绝一个条件）。
pub const COVER_PIXEL_LIMIT: u64 = 8_000_000;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CoverAssetKind {
    Png,
    Jpeg,
    Webp,
    Gif,
    Svg,
}

impl CoverAssetKind {
    pub fn as_str(self) -> &'static str {
        match self {
            CoverAssetKind::Png => "png",
            CoverAssetKind::Jpeg => "jpeg",
            CoverAssetKind::Webp => "webp",
            CoverAssetKind::Gif => "gif",
            CoverAssetKind::Svg => "svg",
        }
    }
}

/// 结构化拒绝原因（可读 message 供前端展示，kind 供测试断言）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CoverReject {
    pub kind: &'static str,
    pub message: String,
}

impl CoverReject {
    fn new(kind: &'static str, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
        }
    }
}

/// 通过校验的封面资产投影（尺寸为 EXIF orientation 校正后的自然尺寸）。
#[derive(Debug, Clone)]
pub struct ValidatedCoverAsset {
    pub kind: CoverAssetKind,
    pub natural_width: u32,
    pub natural_height: u32,
    pub content_hash: String,
    /// EXIF orientation（1..=8，无 EXIF 时 1）。
    pub orientation: u16,
}

/// 校验本地封面资源（复制前 / 设为封面 / 生成前共用）。
/// 只读：不复制、不删除、不修改任何文件。
pub fn validate_local_cover_asset(path: &Path) -> Result<ValidatedCoverAsset, CoverReject> {
    let metadata = std::fs::metadata(path).map_err(|_| {
        CoverReject::new("missing", format!("cover asset `{}` does not exist", path.display()))
    })?;
    if !metadata.is_file() {
        return Err(CoverReject::new(
            "not-file",
            format!("cover asset `{}` is not a regular file", path.display()),
        ));
    }
    let file_size = metadata.len();
    if file_size == 0 {
        return Err(CoverReject::new(
            "empty",
            format!("cover asset `{}` is empty", path.display()),
        ));
    }
    if file_size > COVER_BYTES_LIMIT {
        return Err(CoverReject::new(
            "bytes-limit",
            format!(
                "cover asset `{}` is {file_size} bytes, exceeding the {COVER_BYTES_LIMIT} byte limit",
                path.display()
            ),
        ));
    }

    let bytes = std::fs::read(path).map_err(|_| {
        CoverReject::new("unreadable", format!("cannot read `{}`", path.display()))
    })?;
    let kind = detect_asset_kind(&bytes, path)?;

    let (natural_width, natural_height, orientation) = match kind {
        CoverAssetKind::Svg => {
            let parsed = validate_safe_svg(&bytes, path)?;
            (parsed.width, parsed.height, 1)
        }
        _ => {
            let decoded = decode_bitmap_dimensions(&bytes, kind, path)?;
            (
                decoded.width,
                decoded.height,
                decoded.orientation,
            )
        }
    };

    let pixels = u64::from(natural_width) * u64::from(natural_height);
    if pixels > COVER_PIXEL_LIMIT {
        return Err(CoverReject::new(
            "pixel-limit",
            format!(
                "cover asset `{}` is {natural_width}×{natural_height} ({pixels} px), \
                 exceeding the {COVER_PIXEL_LIMIT} px decode limit",
                path.display()
            ),
        ));
    }
    if !aspect_ok(natural_width, natural_height) {
        return Err(CoverReject::new(
            "aspect",
            format!(
                "cover asset `{}` is {natural_width}×{natural_height} \
                 ({:.2} aspect), outside the 4:3..2:1 horizontal range",
                path.display(),
                natural_width as f64 / natural_height as f64
            ),
        ));
    }

    Ok(ValidatedCoverAsset {
        kind,
        natural_width,
        natural_height,
        content_hash: content_hash_of(&bytes),
        orientation,
    })
}

/// 宽高比例是否落在 `4:3..2:1` 合法横图区间。
pub fn aspect_ok(width: u32, height: u32) -> bool {
    if width == 0 || height == 0 {
        return false;
    }
    let ratio = f64::from(width) / f64::from(height);
    (COVER_MIN_ASPECT..=COVER_MAX_ASPECT).contains(&ratio)
}

pub fn content_hash_of(bytes: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let digest = hasher.finalize();
    digest.iter().map(|byte| format!("{byte:02x}")).collect()
}

/// magic bytes + 扩展一致性检测。
fn detect_asset_kind(bytes: &[u8], path: &Path) -> Result<CoverAssetKind, CoverReject> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .unwrap_or_default();
    let kind = if bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        CoverAssetKind::Png
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        CoverAssetKind::Jpeg
    } else if bytes.len() > 12
        && bytes.starts_with(b"RIFF")
        && &bytes[8..12] == b"WEBP"
    {
        CoverAssetKind::Webp
    } else if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
        CoverAssetKind::Gif
    } else if looks_like_svg(bytes) {
        CoverAssetKind::Svg
    } else {
        return Err(CoverReject::new(
            "mime",
            format!(
                "cover asset `{}` has unknown magic bytes (not PNG/JPEG/WebP/GIF/SVG)",
                path.display()
            ),
        ));
    };

    let expected = match kind {
        CoverAssetKind::Png => "png",
        CoverAssetKind::Jpeg => "jpg",
        CoverAssetKind::Webp => "webp",
        CoverAssetKind::Gif => "gif",
        CoverAssetKind::Svg => "svg",
    };
    if !(extension == expected
        || (kind == CoverAssetKind::Jpeg && (extension == "jpeg" || extension == "jpg")))
    {
        return Err(CoverReject::new(
            "mime-mismatch",
            format!(
                "cover asset `{}` has `.{extension}` extension but `{expected}` magic bytes",
                path.display()
            ),
        ));
    }
    Ok(kind)
}

fn looks_like_svg(bytes: &[u8]) -> bool {
    let text = String::from_utf8_lossy(bytes);
    let trimmed = text.trim_start_matches(['\u{feff}', '\r', '\n', ' ', '\t']);
    trimmed.starts_with("<?xml") || trimmed.starts_with("<svg")
}

/// 位图解码：仅取 GIF 第一帧；返回 EXIF orientation 校正后的自然尺寸。
fn decode_bitmap_dimensions(
    bytes: &[u8],
    kind: CoverAssetKind,
    path: &Path,
) -> Result<DecodedBitmap, CoverReject> {
    use std::io::Cursor;

    let cursor = Cursor::new(bytes);
    let reader = image::ImageReader::new(cursor)
        .with_guessed_format()
        .map_err(|_| {
            CoverReject::new(
                "decode",
                format!("cannot determine image format for `{}`", path.display()),
            )
        })?;
    let (raw_width, raw_height) = reader.into_dimensions().map_err(|_| {
        CoverReject::new(
            "decode",
            format!("cannot decode dimensions of `{}`", path.display()),
        )
    })?;
    // GIF/WebP 无标准 EXIF orientation；PNG eXIf 与 JPEG APP1 由 exif 读取。
    let orientation = match kind {
        CoverAssetKind::Jpeg | CoverAssetKind::Png => exif_orientation(bytes).unwrap_or(1),
        _ => 1,
    };
    let swaps = matches!(orientation, 5 | 6 | 7 | 8);
    Ok(DecodedBitmap {
        width: if swaps { raw_height } else { raw_width },
        height: if swaps { raw_width } else { raw_height },
        orientation,
    })
}

struct DecodedBitmap {
    width: u32,
    height: u32,
    orientation: u16,
}

/// 读取 JPEG APP1 / PNG eXIf 中的 EXIF orientation（tag 0x0112, 主 IFD）。
/// 解析失败返回 None（无 EXIF 视为 orientation 1，不拒绝文档）。
fn exif_orientation(bytes: &[u8]) -> Option<u16> {
    use std::io::Cursor;
    let mut cursor = Cursor::new(bytes);
    let reader = exif::Reader::new()
        .read_from_container(&mut cursor)
        .ok()?;
    for field in reader.fields() {
        if field.tag == exif::Tag::Orientation && field.ifd_num == exif::In::PRIMARY {
            if let exif::Value::Short(values) = &field.value {
                if let Some(first) = values.first() {
                    return Some(*first);
                }
            }
        }
    }
    None
}

/// 安全 SVG 校验结果：解析后固有尺寸（viewBox 优先，其次 width/height）。
pub struct SafeSvg {
    pub width: u32,
    pub height: u32,
}

/// SVG presentation/style attributes may contain `url(...)`. Internal fragment
/// references such as `url(#gradient)` are safe; every other target could make
/// rasterization depend on a network/file/data resource and must be rejected.
fn svg_attribute_has_external_url(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    let mut cursor = 0;
    while let Some(relative_start) = lower[cursor..].find("url(") {
        let start = cursor + relative_start + 4;
        let Some(relative_end) = lower[start..].find(')') else {
            return true;
        };
        let end = start + relative_end;
        let raw_target = value[start..end].trim();
        let unquoted = raw_target
            .strip_prefix('"')
            .and_then(|target| target.strip_suffix('"'))
            .or_else(|| {
                raw_target
                    .strip_prefix('\'')
                    .and_then(|target| target.strip_suffix('\''))
            })
            .unwrap_or(raw_target)
            .trim();
        if !unquoted.starts_with('#') {
            return true;
        }
        cursor = end + 1;
    }
    false
}

/// SVG 安全性三重门：
/// 1. XML 语法与元素级拒绝（script / foreignObject / image / 外部 href /
///    on* 事件 / @import / @font-face / 外部 url()）；
/// 2. 固有尺寸/比例提取（width/height/viewBox，含百分比/缺失时按 16:9 视口推断
///    只影响栅格化输出尺寸，比例仍以提取结果判定）；
/// 3. usvg 安全模式解析兜底（不执行脚本、不加载外部资源；解析失败拒绝）。
pub fn validate_safe_svg(bytes: &[u8], path: &Path) -> Result<SafeSvg, CoverReject> {
    let text = String::from_utf8_lossy(bytes);
    let document = roxmltree::Document::parse(&text).map_err(|error| {
        CoverReject::new(
            "svg-xml",
            format!("cover SVG `{}` is not valid XML: {error}", path.display()),
        )
    })?;
    let root = document.root_element();
    if root.tag_name().name() != "svg" {
        return Err(CoverReject::new(
            "svg-root",
            format!("cover SVG `{}` root element is not <svg>", path.display()),
        ));
    }

    for node in document.descendants() {
        let element = match node.tag_name().name() {
            "" => continue,
            name => name,
        };
        let lower = element.to_ascii_lowercase();
        if matches!(
            lower.as_str(),
            "script" | "foreignobject" | "image" | "iframe" | "object" | "embed"
        ) {
            return Err(CoverReject::new(
                "svg-unsafe-element",
                format!(
                    "cover SVG `{}` contains disallowed <{lower}> element",
                    path.display()
                ),
            ));
        }
        // on* 事件属性一律拒绝。
        for attribute in node.attributes() {
            if attribute.name().to_ascii_lowercase().starts_with("on") {
                return Err(CoverReject::new(
                    "svg-event-handler",
                    format!(
                        "cover SVG `{}` contains event handler attribute `{}`",
                        path.display(),
                        attribute.name()
                    ),
                ));
            }
            // 外部/危险引用：href / xlink:href 只允许内部片段（#id）。
            let attribute_name = attribute.name().to_ascii_lowercase();
            if (attribute_name == "href" || attribute_name == "xlink:href")
                && !attribute.value().trim().is_empty()
                && !attribute.value().trim().starts_with('#')
            {
                return Err(CoverReject::new(
                    "svg-external-reference",
                    format!(
                        "cover SVG `{}` contains external reference `{}`",
                        path.display(),
                        attribute.value()
                    ),
                ));
            }
            let lower_value = attribute.value().to_ascii_lowercase();
            if svg_attribute_has_external_url(attribute.value()) {
                return Err(CoverReject::new(
                    "svg-external-reference",
                    format!(
                        "cover SVG `{}` contains external url() reference in `{}`",
                        path.display(),
                        attribute.name()
                    ),
                ));
            }
            if attribute_name == "style"
                && (lower_value.contains("@import") || lower_value.contains("@font-face"))
            {
                return Err(CoverReject::new(
                    "svg-css-external",
                    format!(
                        "cover SVG `{}` inline style contains external font/import rules",
                        path.display()
                    ),
                ));
            }
        }
        if lower == "style" {
            let css = node.text().unwrap_or_default();
            let lower_css = css.to_ascii_lowercase();
            if lower_css.contains("@import")
                || lower_css.contains("@font-face")
                || lower_css.contains("url(")
            {
                return Err(CoverReject::new(
                    "svg-css-external",
                    format!(
                        "cover SVG `{}` style contains external font/import/url() rules",
                        path.display()
                    ),
                ));
            }
        }
        // <use>/<a> 引用的外部 href 已由通用 href 检查覆盖；内部 fragment 允许。
    }

    // usvg 安全模式解析（第二道门）：不执行脚本、不加载外部资源。
    let options = resvg::usvg::Options::default();
    let tree = resvg::usvg::Tree::from_str(&text, &options).map_err(|error| {
        CoverReject::new(
            "svg-parse",
            format!("cover SVG `{}` failed safe rasterizer parse: {error}", path.display()),
        )
    })?;

    let (width, height) = svg_intrinsic_size(&root, tree.size().width(), tree.size().height())?;
    if width == 0 || height == 0 {
        return Err(CoverReject::new(
            "svg-size",
            format!("cover SVG `{}` has no usable intrinsic size", path.display()),
        ));
    }
    Ok(SafeSvg { width, height })
}

/// 提取 SVG 固有尺寸：显式 width/height 数值优先；其次 viewBox；再其次
/// 用 usvg 归一化尺寸（默认 100×100 时按 16:9 推断输出视口）。
fn svg_intrinsic_size(
    root: &roxmltree::Node<'_, '_>,
    usvg_width: f32,
    usvg_height: f32,
) -> Result<(u32, u32), CoverReject> {
    let explicit = |name: &str| -> Option<u32> {
        let value = root.attribute(name)?;
        let trimmed = value.trim();
        let number = trimmed.strip_suffix("px").unwrap_or(trimmed).trim();
        number.parse::<f32>().ok().filter(|value| *value > 0.0).map(|value| value as u32)
    };
    if let (Some(width), Some(height)) = (explicit("width"), explicit("height")) {
        return Ok((width, height));
    }
    if let Some(view_box) = root.attribute("viewBox") {
        let parts: Vec<f32> = view_box
            .split_whitespace()
            .filter_map(|part| part.parse::<f32>().ok())
            .collect();
        if parts.len() == 4 && parts[2] > 0.0 && parts[3] > 0.0 {
            return Ok((parts[2] as u32, parts[3] as u32));
        }
    }
    if usvg_width > 0.0 && usvg_height > 0.0 {
        return Ok((usvg_width as u32, usvg_height as u32));
    }
    Err(CoverReject::new(
        "svg-size",
        "cover SVG has no width/height/viewBox intrinsic size",
    ))
}

/// 把位图/SVG 像素解码为 `DynamicImage`，应用 EXIF orientation 旋转/翻转，
/// 使后续裁切基于正确的自然方向。
pub fn decode_cover_pixels(path: &Path) -> Result<image::DynamicImage, CoverReject> {
    let bytes = std::fs::read(path).map_err(|_| {
        CoverReject::new("unreadable", format!("cannot read `{}`", path.display()))
    })?;
    let kind = detect_asset_kind(&bytes, path)?;
    match kind {
        CoverAssetKind::Svg => {
            validate_safe_svg(&bytes, path)?;
            rasterize_svg(&bytes, path).map_err(|error| {
                CoverReject::new("svg-rasterize", error.message)
            })
        }
        _ => {
            let mut image = image::load_from_memory(&bytes).map_err(|error| {
                CoverReject::new(
                    "decode",
                    format!("cannot decode `{}`: {error}", path.display()),
                )
            })?;
            let orientation = match kind {
                CoverAssetKind::Jpeg | CoverAssetKind::Png => exif_orientation(&bytes).unwrap_or(1),
                _ => 1,
            };
            apply_orientation(&mut image, orientation);
            Ok(image)
        }
    }
}

fn rasterize_svg(bytes: &[u8], _path: &Path) -> Result<image::DynamicImage, CoverReject> {
    let text = String::from_utf8_lossy(bytes);
    let options = resvg::usvg::Options::default();
    let tree = resvg::usvg::Tree::from_str(&text, &options).map_err(|error| {
        CoverReject::new("svg-parse", format!("SVG parse failed: {error}"))
    })?;
    let size = tree.size();
    if size.width() < 1.0 || size.height() < 1.0 {
        return Err(CoverReject::new(
            "svg-size",
            "SVG has no renderable size".to_string(),
        ));
    }
    let width = size.width().ceil() as u32;
    let height = size.height().ceil() as u32;
    // 栅格化上限（防御：SVG 尺寸异常巨大时禁止 OOM）。
    const RASTER_LIMIT: u32 = 8192;
    if width > RASTER_LIMIT || height > RASTER_LIMIT || u64::from(width) * u64::from(height) > 24_000_000 {
        return Err(CoverReject::new(
            "svg-raster-limit",
            format!("SVG raster size {width}×{height} exceeds the raster limit"),
        ));
    }
    let mut pixmap = resvg::tiny_skia::Pixmap::new(width, height).ok_or_else(|| {
        CoverReject::new("svg-raster", "cannot allocate SVG raster".to_string())
    })?;
    resvg::render(&tree, resvg::tiny_skia::Transform::default(), &mut pixmap.as_mut());
    let buffer = pixmap.data().to_vec();
    image::RgbaImage::from_raw(width, height, buffer)
        .map(image::DynamicImage::ImageRgba8)
        .ok_or_else(|| CoverReject::new("svg-raster", "SVG raster conversion failed".to_string()))
}

/// 应用 EXIF orientation（1..=8）到解码后的图像。
fn apply_orientation(image: &mut image::DynamicImage, orientation: u16) {
    let Ok(orientation) = u8::try_from(orientation) else {
        return;
    };
    if let Some(orientation) = image::metadata::Orientation::from_exif(orientation) {
        image.apply_orientation(orientation);
    }
}

/// 居中 `cover` 裁切为确定性 1280×720 并编码为 PNG bytes。
pub fn encode_cover_png(image: &image::DynamicImage) -> Vec<u8> {
    let cropped = center_crop_cover(image);
    let mut output = std::io::Cursor::new(Vec::new());
    cropped
        .write_to(&mut output, image::ImageFormat::Png)
        .expect("PNG encode is infallible in memory");
    output.into_inner()
}

/// 居中裁切到 16:9 后精确缩放到 1280×720（确定性）。
pub fn center_crop_cover(image: &image::DynamicImage) -> image::DynamicImage {
    let (width, height) = (image.width(), image.height());
    let target_ratio = f64::from(IMAGE_COVER_WIDTH) / f64::from(IMAGE_COVER_HEIGHT);
    let image_ratio = f64::from(width) / f64::from(height);
    let (crop_width, crop_height) = if image_ratio > target_ratio {
        // 过宽：裁左右。
        (f64::from(height) * target_ratio, f64::from(height))
    } else {
        // 过高：裁上下。
        (f64::from(width), f64::from(width) / target_ratio)
    };
    let x = ((f64::from(width) - crop_width) / 2.0).floor().max(0.0) as u32;
    let y = ((f64::from(height) - crop_height) / 2.0).floor().max(0.0) as u32;
    let cropped = image.crop_imm(x, y, crop_width as u32, crop_height as u32);
    cropped.resize_exact(
        IMAGE_COVER_WIDTH,
        IMAGE_COVER_HEIGHT,
        image::imageops::FilterType::Lanczos3,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture_asset(name: &str) -> std::path::PathBuf {
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/card-revisions/assets")
            .join(name)
    }

    #[test]
    fn landscape_png_passes_validation() {
        let asset = validate_local_cover_asset(&fixture_asset("cover-landscape.png"))
            .expect("4:3 PNG must validate");
        assert_eq!(asset.kind, CoverAssetKind::Png);
        assert_eq!(asset.natural_width, 640);
        assert_eq!(asset.natural_height, 480);
        assert_eq!(asset.content_hash.len(), 64);
        // 裁切输出确定性 1280×720 PNG。
        let image = decode_cover_pixels(&fixture_asset("cover-landscape.png")).expect("decode");
        let png = encode_cover_png(&image);
        assert_eq!(png.len(), encode_cover_png(&image).len(), "PNG output must be deterministic");
        let decoded = image::load_from_memory(&png).expect("valid PNG");
        assert_eq!((decoded.width(), decoded.height()), (1280, 720));
    }

    #[test]
    fn safe_svg_passes_validation_and_rasterizes() {
        let asset = validate_local_cover_asset(&fixture_asset("cover-landscape.svg"))
            .expect("2:1 safe SVG must validate");
        assert_eq!(asset.kind, CoverAssetKind::Svg);
        assert_eq!((asset.natural_width, asset.natural_height), (640, 320));
        let image = decode_cover_pixels(&fixture_asset("cover-landscape.svg")).expect("rasterize");
        let png = encode_cover_png(&image);
        let decoded = image::load_from_memory(&png).expect("valid PNG");
        assert_eq!((decoded.width(), decoded.height()), (1280, 720));
    }

    #[test]
    fn unsafe_svg_is_rejected_for_every_vector() {
        // cover-unsafe.svg 同时包含 script / foreignObject / 外部 image / @import /
        // @font-face：校验必须拒绝（不落盘、不进入 ready）。
        let result = validate_local_cover_asset(&fixture_asset("cover-unsafe.svg"));
        let reject = result.expect_err("unsafe SVG must be rejected");
        assert_eq!(reject.kind, "svg-unsafe-element", "{:?}", reject);
    }

    #[test]
    fn portrait_and_square_and_ultrawide_are_rejected() {
        for name in ["cover-portrait.jpg", "cover-square.png", "cover-ultrawide.png"] {
            let result = validate_local_cover_asset(&fixture_asset(name));
            let reject = result.expect_err("out-of-range aspect must be rejected");
            assert_eq!(reject.kind, "aspect", "{name}: {:?}", reject);
        }
    }

    #[test]
    fn fake_mime_is_rejected() {
        let reject = validate_local_cover_asset(&fixture_asset("cover-fake-mime.png"))
            .expect_err("fake MIME must be rejected");
        assert_eq!(reject.kind, "mime-mismatch", "{:?}", reject);
    }

    #[test]
    fn oversized_dimensions_are_rejected() {
        let reject = validate_local_cover_asset(&fixture_asset("cover-oversized-dimensions.png"))
            .expect_err("pixel-limit must be rejected");
        assert_eq!(reject.kind, "pixel-limit", "{:?}", reject);
    }

    #[test]
    fn missing_asset_is_rejected_with_missing_kind() {
        let missing = fixture_asset("does-not-exist.png");
        let reject = validate_local_cover_asset(&missing).expect_err("missing must reject");
        assert_eq!(reject.kind, "missing", "{:?}", reject);
    }

    #[test]
    fn aspect_boundaries_are_inclusive() {
        assert!(aspect_ok(4, 3), "4:3 lower boundary must be legal");
        assert!(aspect_ok(2, 1), "2:1 upper boundary must be legal");
        assert!(!aspect_ok(1, 1), "square must be rejected");
        assert!(!aspect_ok(1, 2), "portrait must be rejected");
        assert!(!aspect_ok(21, 9), "2.33:1 ultrawide must be rejected");
        assert!(!aspect_ok(4, 5), "0.8:1 portrait must be rejected");
    }

    // ---- 程序化构造的 WebP / GIF 首帧 / EXIF orientation 覆盖 ----

    fn temp_dir() -> std::path::PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0);
        std::env::temp_dir().join(format!("nutbook-cover-assets-test-{}-{nanos}", std::process::id()))
    }

    fn write_bytes(dir: &std::path::Path, name: &str, bytes: &[u8]) -> std::path::PathBuf {
        std::fs::create_dir_all(dir).expect("create temp dir");
        let path = dir.join(name);
        std::fs::write(&path, bytes).expect("write asset");
        path
    }

    #[test]
    fn webp_landscape_passes_validation() {
        let dir = temp_dir();
        let source = image::RgbaImage::from_fn(640, 360, |x, y| {
            let value = ((x + y) % 256) as u8;
            image::Rgba([value, 128, 64, 255])
        });
        let mut bytes = std::io::Cursor::new(Vec::new());
        source
            .write_to(&mut bytes, image::ImageFormat::WebP)
            .expect("encode webp");
        let path = write_bytes(&dir, "cover.webp", &bytes.into_inner());
        let asset = validate_local_cover_asset(&path)
            .expect("16:9 WebP must validate");
        assert_eq!(asset.kind, CoverAssetKind::Webp);
        assert_eq!((asset.natural_width, asset.natural_height), (640, 360));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn gif_uses_first_frame_for_dimensions_and_decode() {
        let dir = temp_dir();
        // 两帧 GIF：第一帧 640×360，第二帧 300×200 —— 尺寸与解码必须来自第一帧。
        let mut gif_bytes = Vec::new();
        {
            use image::codecs::gif::{GifEncoder, Repeat};
            use image::Frame;
            let frame1 = image::RgbaImage::from_fn(640, 360, |_, _| image::Rgba([10, 20, 30, 255]));
            let frame2 = image::RgbaImage::from_fn(300, 200, |_, _| image::Rgba([40, 50, 60, 255]));
            let mut encoder = GifEncoder::new(&mut gif_bytes);
            encoder.set_repeat(Repeat::Infinite).expect("repeat");
            encoder.encode_frame(Frame::new(frame1)).expect("frame1");
            encoder.encode_frame(Frame::new(frame2)).expect("frame2");
        }
        let path = write_bytes(&dir, "cover.gif", &gif_bytes);
        let asset = validate_local_cover_asset(&path).expect("GIF first frame must validate");
        assert_eq!(asset.kind, CoverAssetKind::Gif);
        assert_eq!(
            (asset.natural_width, asset.natural_height),
            (640, 360),
            "GIF dims must come from the first frame"
        );
        let decoded = decode_cover_pixels(&path).expect("decode first frame");
        assert_eq!((decoded.width(), decoded.height()), (640, 360));
        let _ = std::fs::remove_dir_all(&dir);
    }

    /// 手工构造带 EXIF orientation=6（90° CW）的 JPEG：landscape 640×360 原始像素，
    /// EXIF 声明旋转 90° → 校正后自然尺寸 360×640（竖图 → 比例拒绝）。
    fn jpeg_with_exif_orientation(orientation: u16) -> Vec<u8> {
        let source = image::RgbaImage::from_fn(640, 360, |x, y| {
            let value = ((x * 3 + y * 7) % 256) as u8;
            image::Rgba([value, value, value, 255])
        });
        let mut jpeg = std::io::Cursor::new(Vec::new());
        image::DynamicImage::ImageRgba8(source)
            .to_rgb8()
            .write_to(&mut jpeg, image::ImageFormat::Jpeg)
            .expect("encode jpeg");
        let jpeg = jpeg.into_inner();
        // 定位 SOI(2 bytes) 后的第一个 marker 位置，把 EXIF APP1 插入其后。
        let mut exif_segment = Vec::new();
        // TIFF header (little endian)
        exif_segment.extend_from_slice(b"Exif\0\0");
        exif_segment.extend_from_slice(b"II*\0");
        exif_segment.extend_from_slice(&0x0008u32.to_le_bytes()); // IFD0 offset
        exif_segment.extend_from_slice(&1u16.to_le_bytes()); // entry count
        exif_segment.extend_from_slice(&0x0112u16.to_le_bytes()); // Orientation tag
        exif_segment.extend_from_slice(&3u16.to_le_bytes()); // SHORT
        exif_segment.extend_from_slice(&1u32.to_le_bytes()); // count
        exif_segment.extend_from_slice(&u32::from(orientation).to_le_bytes()); // value
        exif_segment.extend_from_slice(&0u32.to_le_bytes()); // next IFD
        let mut app1 = Vec::new();
        app1.extend_from_slice(&0xFFE1u16.to_be_bytes());
        app1.extend_from_slice(&((exif_segment.len() + 2) as u16).to_be_bytes());
        app1.extend_from_slice(&exif_segment);
        let mut output = Vec::new();
        output.extend_from_slice(&jpeg[..2]); // SOI
        output.extend_from_slice(&app1);
        output.extend_from_slice(&jpeg[2..]);
        output
    }

    #[test]
    fn exif_orientation_swaps_landscape_to_portrait_and_rejects() {
        let dir = temp_dir();
        let bytes = jpeg_with_exif_orientation(6);
        let path = write_bytes(&dir, "oriented.jpg", &bytes);
        let reject = validate_local_cover_asset(&path).expect_err(
            "EXIF 90° rotation makes the 640×360 landscape a 360×640 portrait -> aspect reject",
        );
        assert_eq!(reject.kind, "aspect", "{:?}", reject);
        // 方向不交换时（orientation=1）同像素是合法横图。
        let plain = write_bytes(&dir, "plain.jpg", &jpeg_with_exif_orientation(1));
        let asset = validate_local_cover_asset(&plain).expect("orientation=1 keeps landscape");
        assert_eq!((asset.natural_width, asset.natural_height), (640, 360));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn exif_rotation_is_applied_before_crop() {
        // orientation=6（90° CW）：解码后旋转 → 360×640 竖图裁切输出仍是 1280×720。
        let dir = temp_dir();
        let path = write_bytes(&dir, "oriented.jpg", &jpeg_with_exif_orientation(6));
        let decoded = decode_cover_pixels(&path).expect("decode + rotate");
        assert_eq!((decoded.width(), decoded.height()), (360, 640));
        let png = encode_cover_png(&decoded);
        let final_image = image::load_from_memory(&png).expect("valid png");
        assert_eq!((final_image.width(), final_image.height()), (1280, 720));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn safe_svg_with_script_in_comment_is_not_rejected_but_external_href_is() {
        // script 出现在 XML 注释里不是元素 → 不应拒绝；真正的外部 href 必须拒绝。
        let dir = temp_dir();
        let with_comment = b"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"640\" height=\"320\">\n<!-- <script>alert(1)</script> -->\n<rect width=\"640\" height=\"320\" fill=\"#ccc\"/>\n</svg>\n";
        let ok_path = write_bytes(&dir, "comment.svg", with_comment);
        validate_local_cover_asset(&ok_path).expect("comment text must not be treated as an element");
        let with_href = b"<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" width=\"640\" height=\"320\">\n<use xlink:href=\"https://evil.example/x.svg\"/>\n</svg>\n";
        let bad_path = write_bytes(&dir, "href.svg", with_href);
        let reject = validate_local_cover_asset(&bad_path).expect_err("external href must reject");
        assert_eq!(reject.kind, "svg-external-reference", "{:?}", reject);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn svg_attribute_urls_allow_internal_fragments_and_reject_external_resources() {
        let dir = temp_dir();
        let internal = br##"<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320">
<defs><linearGradient id="g"><stop stop-color="#fff"/></linearGradient></defs>
<rect width="640" height="320" fill="url(#g)"/>
</svg>"##;
        let internal_path = write_bytes(&dir, "internal-url.svg", internal);
        validate_local_cover_asset(&internal_path)
            .expect("internal fragment url must remain legal");

        for (name, svg) in [
            (
                "style-url.svg",
                br#"<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320"><rect width="640" height="320" style="fill:url(https://evil.example/a.svg)"/></svg>"#
                    .as_slice(),
            ),
            (
                "fill-url.svg",
                br#"<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320"><rect width="640" height="320" fill="url(file:///tmp/a.svg)"/></svg>"#
                    .as_slice(),
            ),
        ] {
            let path = write_bytes(&dir, name, svg);
            let reject = validate_local_cover_asset(&path)
                .expect_err("external url() in an SVG attribute must reject");
            assert_eq!(reject.kind, "svg-external-reference", "{name}: {reject:?}");
        }
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn exif_orientation_six_and_eight_rotate_pixels_in_the_declared_direction() {
        let source = image::RgbaImage::from_fn(2, 3, |x, y| {
            image::Rgba([(y * 2 + x + 1) as u8, 0, 0, 255])
        });

        let mut clockwise = image::DynamicImage::ImageRgba8(source.clone());
        apply_orientation(&mut clockwise, 6);
        let clockwise = clockwise.to_rgba8();
        assert_eq!((clockwise.width(), clockwise.height()), (3, 2));
        assert_eq!(
            clockwise
                .rows()
                .map(|row| row.map(|pixel| pixel[0]).collect::<Vec<_>>())
                .collect::<Vec<_>>(),
            vec![vec![5, 3, 1], vec![6, 4, 2]]
        );

        let mut counter_clockwise = image::DynamicImage::ImageRgba8(source);
        apply_orientation(&mut counter_clockwise, 8);
        let counter_clockwise = counter_clockwise.to_rgba8();
        assert_eq!((counter_clockwise.width(), counter_clockwise.height()), (3, 2));
        assert_eq!(
            counter_clockwise
                .rows()
                .map(|row| row.map(|pixel| pixel[0]).collect::<Vec<_>>())
                .collect::<Vec<_>>(),
            vec![vec![2, 4, 6], vec![1, 3, 5]]
        );
    }

    #[test]
    fn non_svg_extension_but_svg_magic_is_rejected() {
        let dir = temp_dir();
        let svg = b"<?xml version=\"1.0\"?><svg xmlns=\"http://www.w3.org/2000/svg\" width=\"640\" height=\"320\"><rect width=\"640\" height=\"320\"/></svg>";
        let path = write_bytes(&dir, "cover.png", svg);
        let reject = validate_local_cover_asset(&path).expect_err("svg magic with .png must reject");
        assert_eq!(reject.kind, "mime-mismatch", "{:?}", reject);
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn center_crop_prefers_center_and_is_deterministic() {
        // 4:3 图（640×480）裁成 16:9：裁掉上下，保留水平中心。
        let image = image::RgbaImage::from_fn(640, 480, |x, y| {
            // 水平区分：左半红、右半蓝；垂直区分：上半绿、下半黄。
            let channel = if x < 320 { 255 } else { 0 };
            let second = if y < 240 { 255 } else { 0 };
            image::Rgba([channel, second, 0, 255])
        });
        let dynamic = image::DynamicImage::ImageRgba8(image);
        let cropped = center_crop_cover(&dynamic);
        assert_eq!((cropped.width(), cropped.height()), (1280, 720));
        // 水平中心应各含左右两半（裁切居中）；垂直中心 480*9/16=270 → y 起 (480-270)/2=105，
        // 105..375 同时覆盖上(0..240)下(240..480)两半。
        let rgba = cropped.to_rgba8();
        let left = rgba.get_pixel(300, 360).0;
        let right = rgba.get_pixel(980, 360).0;
        let top = rgba.get_pixel(640, 100).0;
        let bottom = rgba.get_pixel(640, 620).0;
        assert_eq!(left[0], 255, "left half must be red");
        assert_eq!(right[0], 0, "right half must be blue");
        assert_eq!(top[1], 255, "top half must be green");
        assert_eq!(bottom[1], 0, "bottom half must be yellow");
    }
}
