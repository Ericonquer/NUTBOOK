//! Bounded raster import and public-network fetching. No proxy, credentials or cookies.
use base64::{engine::general_purpose::STANDARD, Engine};
use std::{
    io::{Read, Write},
    net::{IpAddr, SocketAddr, ToSocketAddrs},
    path::Path,
    time::{Duration, Instant},
};
pub const MAX_IMAGE: usize = 10 * 1024 * 1024;
pub fn raster_data(bytes: &[u8]) -> Result<String, String> {
    if bytes.len() > MAX_IMAGE {
        return Err("图片超过 10 MB / Image exceeds 10 MB".into());
    }
    let format = image::guess_format(bytes).map_err(|_| "无法识别图片 / Invalid image")?;
    let mime = match format {
        image::ImageFormat::Png => "image/png",
        image::ImageFormat::Jpeg => "image/jpeg",
        image::ImageFormat::WebP => "image/webp",
        _ => return Err("仅支持 PNG / JPEG / WebP".into()),
    };
    let mut reader = image::ImageReader::with_format(std::io::Cursor::new(bytes), format);
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(8192);
    limits.max_image_height = Some(8192);
    limits.max_alloc = Some(128 * 1024 * 1024);
    reader.limits(limits);
    reader
        .decode()
        .map_err(|_| "图片损坏或尺寸过大 / Invalid image or dimensions")?;
    Ok(format!("data:{mime};base64,{}", STANDARD.encode(bytes)))
}
fn public_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v) => {
            let [a, b, c, _] = v.octets();
            !(a == 0
                || a == 10
                || a == 127
                || a >= 224
                || (a == 100 && (64..=127).contains(&b))
                || (a == 169 && b == 254)
                || (a == 172 && (16..=31).contains(&b))
                || (a == 192 && (b == 168 || b == 0 || (b == 88 && c == 99)))
                || (a == 198 && (b == 18 || b == 19 || (b == 51 && c == 100)))
                || (a == 203 && b == 0 && c == 113))
        }
        IpAddr::V6(v) => {
            let s = v.segments();
            (s[0] & 0xe000) == 0x2000
                && s[0] != 0x2001
                && s[0] != 0x2002
                && !(s[0] == 0x3fff && s[1] <= 0x0fff)
        }
    }
}
fn image_url(raw: &str) -> Result<url::Url, String> {
    let u = url::Url::parse(raw).map_err(|_| "图片地址无效 / Invalid image URL")?;
    if !matches!(u.scheme(), "http" | "https")
        || !u.username().is_empty()
        || u.password().is_some()
        || !matches!(u.port(), None | Some(80) | Some(443))
    {
        return Err("图片地址不允许 / Image URL not allowed".into());
    }
    let host = u.host().ok_or("图片地址缺少主机 / Missing host")?;
    match host {
        url::Host::Ipv4(v) if !public_ip(v.into()) => {
            return Err("不允许本机或内网图片 / Private address blocked".into())
        }
        url::Host::Ipv6(v) if !public_ip(v.into()) => {
            return Err("不允许本机或内网图片 / Private address blocked".into())
        }
        url::Host::Domain(d)
            if d == "localhost" || d.ends_with(".localhost") || d.ends_with(".local") =>
        {
            return Err("不允许本机图片 / Local host blocked".into())
        }
        _ => {}
    }
    Ok(u)
}
pub fn fetch_raster(raw: &str) -> Result<String, String> {
    fetch_raster_cancelable(raw, &std::sync::atomic::AtomicBool::new(false))
}
pub fn fetch_raster_cancelable(
    raw: &str,
    cancelled: &std::sync::atomic::AtomicBool,
) -> Result<String, String> {
    fetch_with_transport(raw, cancelled, public_request)
}
fn public_request(u: &url::Url, deadline: Instant) -> Result<ureq::Response, String> {
    let host = u
        .host_str()
        .ok_or("Missing host")?
        .trim_matches(['[', ']'])
        .to_string();
    let port = u.port_or_known_default().ok_or("Invalid port")?;
    // Resolve once, validate every answer, then pin the actual connection to it.
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        let result = (host.as_str(), port)
            .to_socket_addrs()
            .map(|v| v.collect::<Vec<_>>());
        let _ = tx.send(result);
    });
    let remaining = deadline.saturating_duration_since(Instant::now());
    let addresses: Vec<SocketAddr> = rx
        .recv_timeout(remaining.min(Duration::from_secs(3)))
        .map_err(|_| "图片域名解析超时 / DNS timeout")?
        .map_err(|_| "图片域名解析失败 / DNS failed")?;
    if addresses.is_empty() || addresses.iter().any(|a| !public_ip(a.ip())) {
        return Err("不允许内网或特殊网络图片 / Private or reserved address blocked".into());
    }
    let remaining = deadline.saturating_duration_since(Instant::now());
    if remaining.is_zero() {
        return Err("图片下载超时 / Image download timeout".into());
    }
    let agent = ureq::AgentBuilder::new()
        .try_proxy_from_env(false)
        .redirects(0)
        .timeout_connect(Duration::from_secs(3))
        .timeout_read(Duration::from_secs(2))
        .timeout(remaining)
        .resolver(move |_: &str| Ok(addresses.clone()))
        .build();
    let response = agent
        .get(u.as_str())
        .set("Accept", "image/png,image/jpeg,image/webp")
        .call()
        .map_err(|error| match error {
            ureq::Error::Status(code, _) => {
                format!("图片服务器返回 {code} / Image HTTP {code}")
            }
            ureq::Error::Transport(error) => format!(
                "图片连接失败 / Image connection failed ({:?})",
                error.kind()
            ),
        })?;
    Ok(response)
}
fn fetch_with_transport(
    raw: &str,
    cancelled: &std::sync::atomic::AtomicBool,
    mut transport: impl FnMut(&url::Url, Instant) -> Result<ureq::Response, String>,
) -> Result<String, String> {
    let check = || {
        if cancelled.load(std::sync::atomic::Ordering::Relaxed) {
            Err("图片下载已取消 / Image download cancelled".to_string())
        } else {
            Ok(())
        }
    };
    let deadline = Instant::now() + Duration::from_secs(20);
    let mut u = image_url(raw)?;
    for _ in 0..4 {
        check()?;
        let response = transport(&u, deadline)?;
        check()?;
        if (300..400).contains(&response.status()) {
            let next = response
                .header("Location")
                .ok_or("重定向缺少地址 / Invalid redirect")?;
            let next = u.join(next).map_err(|_| "Invalid redirect")?;
            if u.scheme() == "https" && next.scheme() != "https" {
                return Err("不允许降级重定向 / Insecure redirect blocked".into());
            }
            u = image_url(next.as_str())?;
            continue;
        }
        if response.status() != 200 {
            return Err("图片服务器返回异常 / Unexpected image response".into());
        }
        let mime = response
            .header("Content-Type")
            .unwrap_or("")
            .split(';')
            .next()
            .unwrap_or("")
            .trim()
            .to_ascii_lowercase();
        if !matches!(mime.as_str(), "image/png" | "image/jpeg" | "image/webp") {
            return Err("地址未返回 PNG / JPEG / WebP 图片".into());
        }
        if response
            .header("Content-Length")
            .and_then(|s| s.parse::<usize>().ok())
            .is_some_and(|n| n > MAX_IMAGE)
        {
            return Err("图片超过 10 MB / Image exceeds 10 MB".into());
        }
        let mut bytes = Vec::new();
        let mut reader = response.into_reader().take(MAX_IMAGE as u64 + 1);
        let mut chunk = [0u8; 16 * 1024];
        loop {
            check()?;
            if Instant::now() >= deadline {
                return Err("图片下载超时 / Image download timeout".into());
            }
            let count = reader
                .read(&mut chunk)
                .map_err(|_| "图片读取失败 / Image read failed")?;
            if count == 0 {
                break;
            }
            bytes.extend_from_slice(&chunk[..count]);
        }
        check()?;
        let data = raster_data(&bytes)?;
        if !data.starts_with(&format!("data:{mime};")) {
            return Err("图片类型不匹配 / Image type mismatch".into());
        }
        return Ok(data);
    }
    Err("图片重定向过多 / Too many redirects".into())
}
pub fn decode_raster_data(data: &str) -> Result<Vec<u8>, String> {
    if data.len() > MAX_IMAGE * 4 / 3 + 128 {
        return Err("图片超过 10 MB / Image exceeds 10 MB".into());
    }
    let (header, encoded) = data.split_once(',').ok_or("Invalid image data")?;
    if !matches!(
        header,
        "data:image/png;base64" | "data:image/jpeg;base64" | "data:image/webp;base64"
    ) {
        return Err("Unsupported image data".into());
    }
    let bytes = STANDARD.decode(encoded).map_err(|_| "Invalid image data")?;
    let checked = raster_data(&bytes)?;
    if !checked.starts_with(header) {
        return Err("Image type mismatch".into());
    }
    Ok(bytes)
}
pub fn write_pasted_image(
    markdown: &Path,
    data: &str,
) -> Result<crate::models::CopyMarkdownImageAssetResponse, String> {
    let bytes = decode_raster_data(data)?;
    let header = data.split_once(',').ok_or("Invalid image data")?.0;
    let source = markdown.canonicalize().map_err(|_| "Source missing")?;
    if !source.is_file() {
        return Err("Source missing".into());
    }
    let parent = source.parent().ok_or("Invalid source")?;
    let assets = parent.join("assets");
    std::fs::create_dir_all(&assets).map_err(|_| "Cannot create assets")?;
    let assets = assets.canonicalize().map_err(|_| "Invalid assets")?;
    if !assets.starts_with(parent) {
        return Err("Assets directory escapes source".into());
    }
    let ext = match header {
        "data:image/png;base64" => "png",
        "data:image/jpeg;base64" => "jpg",
        _ => "webp",
    };
    let name = format!("pasted-{}.{}", uuid::Uuid::new_v4(), ext);
    let path = assets.join(&name);
    let result = (|| {
        let mut f = std::fs::OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&path)
            .map_err(|_| "Cannot write image")?;
        f.write_all(&bytes).map_err(|_| "Cannot write image")?;
        f.sync_all().map_err(|_| "Cannot sync image")?;
        Ok(crate::models::CopyMarkdownImageAssetResponse {
            relative_path: format!("./assets/{name}"),
            asset_path: path.to_string_lossy().into_owned(),
            file_name: name,
        })
    })();
    if result.is_err() {
        let _ = std::fs::remove_file(&path);
    }
    result
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn blocked_addresses_and_urls() {
        for ip in [
            "127.0.0.1",
            "10.1.2.3",
            "100.64.0.1",
            "169.254.169.254",
            "192.168.1.1",
            "192.0.2.1",
            "198.18.0.1",
            "203.0.113.2",
            "224.0.0.1",
            "::1",
            "::ffff:8.8.8.8",
            "fc00::1",
            "2001:db8::1",
            "2002:0808:0808::1",
        ] {
            assert!(!public_ip(ip.parse().unwrap()), "{ip}");
        }
        assert!(public_ip("8.8.8.8".parse().unwrap()));
        for u in [
            "file:///a.png",
            "https://user:pass@example.com/a.png",
            "http://127.1/a.png",
            "http://localhost/a",
            "https://example.com:8443/a",
        ] {
            assert!(image_url(u).is_err(), "{u}");
        }
    }
    #[test]
    fn redirects_and_response_limits_fail_closed() {
        let cancelled = std::sync::atomic::AtomicBool::new(false);
        for location in [
            "http://127.0.0.1/a.png",
            "https://10.0.0.1/a.png",
            "https://user:pass@example.com/a.png",
            "file:///tmp/a.png",
            "http://example.com/a.png",
        ] {
            let mut calls = 0;
            let result = fetch_with_transport("https://example.com/a.png", &cancelled, |_, _| {
                calls += 1;
                Ok(
                    format!("HTTP/1.1 302 Found\r\nLocation: {location}\r\n\r\n")
                        .parse()
                        .unwrap(),
                )
            });
            assert!(result.is_err(), "{location}");
            assert_eq!(calls, 1, "unsafe redirect must not connect");
        }
        let mut calls = 0;
        assert!(
            fetch_with_transport("https://example.com/a.png", &cancelled, |_, _| {
                calls += 1;
                Ok("HTTP/1.1 302 Found\r\nLocation: /loop.png\r\n\r\n"
                    .parse()
                    .unwrap())
            })
            .unwrap_err()
            .contains("redirects")
        );
        assert_eq!(calls, 4);
        for response in [
            "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html>not image</html>".to_string(),
            format!(
                "HTTP/1.1 200 OK\r\nContent-Type: image/png\r\nContent-Length: {}\r\n\r\n",
                MAX_IMAGE + 1
            ),
            "HTTP/1.1 200 OK\r\nContent-Type: image/png\r\n\r\nnot a PNG".to_string(),
        ] {
            assert!(
                fetch_with_transport("https://example.com/a.png", &cancelled, |_, _| Ok(response
                    .parse()
                    .unwrap()))
                .is_err()
            );
        }
    }
    fn png() -> Vec<u8> {
        let mut out = std::io::Cursor::new(Vec::new());
        image::DynamicImage::new_rgb8(16, 16)
            .write_to(&mut out, image::ImageFormat::Png)
            .unwrap();
        out.into_inner()
    }
    #[test]
    fn raster_import_preserves_bytes_and_source() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("稿.md");
        std::fs::write(&source, "original").unwrap();
        let bytes = png();
        let data = raster_data(&bytes).unwrap();
        let asset = write_pasted_image(&source, &data).unwrap();
        assert_eq!(std::fs::read(&asset.asset_path).unwrap(), bytes);
        assert_eq!(std::fs::read_to_string(&source).unwrap(), "original");
        assert!(asset.relative_path.starts_with("./assets/"));
        assert!(raster_data(&vec![0; MAX_IMAGE + 1]).is_err());
        let mut large = std::io::Cursor::new(Vec::new());
        image::DynamicImage::new_rgb8(8193, 1)
            .write_to(&mut large, image::ImageFormat::Png)
            .unwrap();
        assert!(raster_data(&large.into_inner()).is_err());
        #[cfg(unix)]
        {
            let other = tempfile::tempdir().unwrap();
            let nested = dir.path().join("nested");
            std::fs::create_dir(&nested).unwrap();
            let md = nested.join("a.md");
            std::fs::write(&md, "a").unwrap();
            std::os::unix::fs::symlink(other.path(), nested.join("assets")).unwrap();
            assert!(write_pasted_image(&md, &data).is_err());
            assert_eq!(std::fs::read_dir(other.path()).unwrap().count(), 0);
        }
    }
    #[test]
    fn cancelled_download_never_connects() {
        let cancelled = std::sync::atomic::AtomicBool::new(true);
        assert!(
            fetch_raster_cancelable("https://example.com/a.png", &cancelled)
                .unwrap_err()
                .contains("cancelled")
        );
    }
    #[test]
    #[ignore = "requires explicit public-network test URL"]
    fn public_network_raster_smoke() {
        let url = std::env::var("NUTBOOK_TEST_IMAGE_URL").expect("explicit test image URL");
        let data = fetch_raster(&url).unwrap();
        assert!(data.starts_with("data:image/"));
        assert!(data.len() > 100);
    }
    #[test]
    fn invalid_images_leave_no_asset() {
        let dir = tempfile::tempdir().unwrap();
        let source = dir.path().join("a.md");
        std::fs::write(&source, "original").unwrap();
        assert!(write_pasted_image(&source, "data:image/png;base64,aGVsbG8=").is_err());
        assert!(!dir.path().join("assets").exists());
        assert_eq!(std::fs::read_to_string(source).unwrap(), "original");
    }
}
