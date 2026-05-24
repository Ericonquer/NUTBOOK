use std::{borrow::Cow, fs, path::Path};

use tauri::http::{header::CONTENT_TYPE, Response, StatusCode};

pub const HTML_PREVIEW_SCHEME: &str = "nutbook-preview";

pub fn preview_protocol_url(path: &Path) -> String {
    let encoded_path = encode_path_segments(path);
    format!("{HTML_PREVIEW_SCHEME}://localhost/fs{encoded_path}")
}

pub fn handle_preview_protocol(
    request_path: &str,
) -> Response<Cow<'static, [u8]>> {
    let Some(real_path) = decode_protocol_path(request_path) else {
        return text_response(StatusCode::BAD_REQUEST, "invalid preview path");
    };

    match fs::read(&real_path) {
        Ok(bytes) => {
            let content_type = content_type_for_path(&real_path);
            let body = if content_type.starts_with("text/html") {
                inject_preview_bridge(&bytes)
            } else {
                bytes
            };
            Response::builder()
                .status(StatusCode::OK)
                .header(CONTENT_TYPE, content_type)
                .body(Cow::Owned(body))
                .unwrap_or_else(|_| text_response(StatusCode::INTERNAL_SERVER_ERROR, "response build failed"))
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            text_response(StatusCode::NOT_FOUND, "file not found")
        }
        Err(error) if error.kind() == std::io::ErrorKind::PermissionDenied => {
            text_response(StatusCode::FORBIDDEN, "permission denied")
        }
        Err(_) => text_response(StatusCode::INTERNAL_SERVER_ERROR, "failed to read file"),
    }
}

fn text_response(status: StatusCode, body: &str) -> Response<Cow<'static, [u8]>> {
    Response::builder()
        .status(status)
        .header(CONTENT_TYPE, "text/plain; charset=utf-8")
        .body(Cow::Owned(body.as_bytes().to_vec()))
        .unwrap()
}

fn decode_protocol_path(request_path: &str) -> Option<String> {
    let rest = request_path.strip_prefix("/fs/")?;
    let decoded = percent_decode(rest)?;
    if decoded.starts_with('/') {
        Some(decoded)
    } else {
        Some(format!("/{decoded}"))
    }
}

fn encode_path_segments(path: &Path) -> String {
    let path_string = path.to_string_lossy();
    let mut encoded = String::new();
    for segment in path_string.split('/') {
        if segment.is_empty() {
            continue;
        }
        encoded.push('/');
        encoded.push_str(&percent_encode(segment));
    }
    encoded
}

fn percent_encode(input: &str) -> String {
    let mut encoded = String::with_capacity(input.len());
    for byte in input.bytes() {
        match byte {
            b'A'..=b'Z'
            | b'a'..=b'z'
            | b'0'..=b'9'
            | b'-'
            | b'_'
            | b'.'
            | b'~' => encoded.push(byte as char),
            _ => encoded.push_str(&format!("%{:02X}", byte)),
        }
    }
    encoded
}

fn percent_decode(input: &str) -> Option<String> {
    let bytes = input.as_bytes();
    let mut output = Vec::with_capacity(bytes.len());
    let mut index = 0;

    while index < bytes.len() {
        match bytes[index] {
            b'%' if index + 2 < bytes.len() => {
                let hex = std::str::from_utf8(&bytes[index + 1..index + 3]).ok()?;
                let value = u8::from_str_radix(hex, 16).ok()?;
                output.push(value);
                index += 3;
            }
            byte => {
                output.push(byte);
                index += 1;
            }
        }
    }

    String::from_utf8(output).ok()
}

fn content_type_for_path(path: &str) -> &'static str {
    match Path::new(path)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase()
        .as_str()
    {
        "html" | "htm" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        _ => "application/octet-stream",
    }
}

fn inject_preview_bridge(bytes: &[u8]) -> Vec<u8> {
    let Ok(html) = String::from_utf8(bytes.to_vec()) else {
        return bytes.to_vec();
    };

    let bridge = r#"<script>
(function () {
  window.addEventListener('keydown', function (event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      window.parent && window.parent.postMessage({ type: 'nutbook-html-command', command: 'fullscreen' }, '*');
    }
    if (event.key === 's' || event.key === 'S') {
      event.preventDefault();
      window.parent && window.parent.postMessage({ type: 'nutbook-html-command', command: 'presenter' }, '*');
    }
  }, true);
})();
</script>"#;

    if html.contains("</body>") {
        html.replacen("</body>", &format!("{bridge}</body>"), 1).into_bytes()
    } else {
        format!("{html}{bridge}").into_bytes()
    }
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::{decode_protocol_path, preview_protocol_url};

    #[test]
    fn preview_protocol_url_keeps_path_hierarchy() {
        let url = preview_protocol_url(Path::new("/tmp/my slides/index.html"));
        assert_eq!(
            url,
            "nutbook-preview://localhost/fs/tmp/my%20slides/index.html"
        );
    }

    #[test]
    fn decode_protocol_path_restores_absolute_path() {
        let decoded = decode_protocol_path("/fs/tmp/my%20slides/index.html").unwrap();
        assert_eq!(decoded, "/tmp/my slides/index.html");
    }
}
