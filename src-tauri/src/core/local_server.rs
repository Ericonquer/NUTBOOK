use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    path::Path,
    sync::OnceLock,
    thread,
};

use crate::errors::AppError;

#[derive(Debug, Clone)]
pub struct LocalContentServer {
    origin: String,
}

static SHARED_LOCAL_CONTENT_SERVER: OnceLock<LocalContentServer> = OnceLock::new();

impl LocalContentServer {
    pub fn shared() -> Result<Self, AppError> {
        if let Some(server) = SHARED_LOCAL_CONTENT_SERVER.get() {
            return Ok(server.clone());
        }

        let server = Self::start()?;
        let _ = SHARED_LOCAL_CONTENT_SERVER.set(server.clone());
        Ok(server)
    }

    pub fn start() -> Result<Self, AppError> {
        let listener = TcpListener::bind("127.0.0.1:0").map_err(|_| AppError::IoError)?;
        let address = listener.local_addr().map_err(|_| AppError::IoError)?;
        let origin = format!("http://127.0.0.1:{}", address.port());

        thread::spawn(move || {
            for stream in listener.incoming().flatten() {
                let _ = handle_connection(stream);
            }
        });

        Ok(Self { origin })
    }

    pub fn origin(&self) -> &str {
        &self.origin
    }

    #[cfg(test)]
    pub fn testing() -> Self {
        Self {
            origin: "http://127.0.0.1:4000".to_string(),
        }
    }

    pub fn file_url(&self, path: &Path) -> String {
        format!("{}/fs{}", self.origin, encode_path_segments(path))
    }
}

fn handle_connection(mut stream: TcpStream) -> Result<(), AppError> {
    let mut buffer = [0_u8; 8192];
    let read = stream.read(&mut buffer).map_err(|_| AppError::IoError)?;
    if read == 0 {
        return Ok(());
    }

    let request = String::from_utf8_lossy(&buffer[..read]);
    let first_line = request.lines().next().unwrap_or_default();
    let path = first_line
        .split_whitespace()
        .nth(1)
        .unwrap_or("/");

    let (status, content_type, body) = match decode_request_path(path) {
        Some(local_path) => match std::fs::read(&local_path) {
            Ok(body) => ("200 OK", content_type_for_path(&local_path), body),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => (
                "404 Not Found",
                "text/plain; charset=utf-8",
                b"file not found".to_vec(),
            ),
            Err(error) if error.kind() == std::io::ErrorKind::PermissionDenied => (
                "403 Forbidden",
                "text/plain; charset=utf-8",
                b"permission denied".to_vec(),
            ),
            Err(_) => (
                "500 Internal Server Error",
                "text/plain; charset=utf-8",
                b"failed to read file".to_vec(),
            ),
        },
        None => (
            "400 Bad Request",
            "text/plain; charset=utf-8",
            b"invalid request".to_vec(),
        ),
    };

    let header = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\n\r\n",
        body.len()
    );
    stream.write_all(header.as_bytes()).map_err(|_| AppError::IoError)?;
    stream.write_all(&body).map_err(|_| AppError::IoError)?;
    Ok(())
}

fn decode_request_path(raw_path: &str) -> Option<String> {
    let path_without_query = raw_path.split('?').next().unwrap_or(raw_path);
    let encoded = path_without_query.strip_prefix("/fs/")?;
    let decoded = percent_decode(encoded)?;
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
                output.push(u8::from_str_radix(hex, 16).ok()?);
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

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::{decode_request_path, LocalContentServer};

    #[test]
    fn local_server_url_keeps_relative_resolution_shape() {
        let server = LocalContentServer {
            origin: "http://127.0.0.1:4000".to_string(),
        };
        let url = server.file_url(Path::new("/tmp/my slides/index.html"));
        assert_eq!(url, "http://127.0.0.1:4000/fs/tmp/my%20slides/index.html");
    }

    #[test]
    fn decode_request_path_restores_absolute_path() {
        let decoded = decode_request_path("/fs/tmp/my%20slides/index.html?preview=1").unwrap();
        assert_eq!(decoded, "/tmp/my slides/index.html");
    }
}
