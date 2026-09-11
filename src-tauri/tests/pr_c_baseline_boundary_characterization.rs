//! PR C Phase 1：特征化测试**反转完成**（原 Phase 0 基线特征化）。
//!
//! 反转记录（2026-09-09，WorkBuddy 实施，待 Codex 复核）：
//!
//! 1. 旧 `LocalContentServer`（`/fs` 任意绝对路径读取面）已从运行时下线：
//!    `AppState` 不再启动/持有它，`get_local_server_origin` 命令已删除，
//!    全部消费者（preview payload / HTML runtime / html_edit / 前端图片与
//!    缩略图 URL）已切换到 per-session `ScopedContentServer`。`/fs` 从
//!    HTML 可达面移除由编译期接线保证。
//! 2. 原三个 `PHASE1_MUST_INVERT` 用例按下文绊线要求**替换为拦截断言**，
//!    见 `pr_c_scoped_origin_boundary.rs`（17 用例：穿越/编码/symlink/响应
//!    头/方法/生命周期全覆盖）。
//! 3. 原 `PHASE1_MUST_HOLD` 语义（界内内容任何阶段必须可读）由同一文件的
//!    正向对照用例继承。
//! 4. 本文件保留旧类型的最小**类型级特征化**：`LocalContentServer::start()`
//!    在测试内自建实例，与运行时无关。它现在是「禁止接回运行时」的文档性
//!    绊线 —— 若将来要把该类型重新接入 AppState，必须先重新裁决其安全
//!    边界，且本文件的旧行为断言会继续成立。
//!
//! 本文件只依赖 std，不引入 HTTP 客户端依赖。

use std::{
    fs,
    io::{Read, Write},
    net::TcpStream,
    path::{Path, PathBuf},
    time::Duration,
};

use nutbook_backend::core::local_server::LocalContentServer;

/// 一次性 HTTP/1.1 请求。服务端固定回 `Connection: close`，因此读到 EOF 即整个响应。
fn http_get(origin: &str, raw_path: &str) -> (String, Vec<u8>) {
    let authority = origin
        .strip_prefix("http://")
        .expect("origin 应为 http:// 前缀");
    let mut stream = TcpStream::connect(authority).expect("连接本地内容服务失败");
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .expect("设置读超时失败");

    let request = format!("GET {raw_path} HTTP/1.1\r\nHost: {authority}\r\nConnection: close\r\n\r\n");
    stream
        .write_all(request.as_bytes())
        .expect("写入请求失败");

    let mut raw = Vec::new();
    stream.read_to_end(&mut raw).expect("读取响应失败");

    let split = raw
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
        .expect("响应缺少头体分隔");
    let head = String::from_utf8_lossy(&raw[..split]).to_string();
    let body = raw[split + 4..].to_vec();
    (head, body)
}

fn status_code(head: &str) -> u16 {
    head.lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|code| code.parse().ok())
        .expect("响应首行缺少状态码")
}

/// 逐段百分号编码，与 `local_server::encode_path_segments` 的可读等价物。
fn encode_absolute_path(path: &Path) -> String {
    let mut encoded = String::new();
    for segment in path.to_string_lossy().split('/') {
        if segment.is_empty() {
            continue;
        }
        encoded.push('/');
        for byte in segment.bytes() {
            match byte {
                b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                    encoded.push(byte as char)
                }
                _ => encoded.push_str(&format!("%{byte:02X}")),
            }
        }
    }
    encoded
}

struct Fixture {
    _root: PathBuf,
    /// 会话范围内的 HTML，任何阶段都必须可读。
    in_scope_html: PathBuf,
    /// 会话范围内的同目录资源，任何阶段都必须可读。
    in_scope_asset: PathBuf,
    /// 位于会话父目录之外的诱饵，scoped origin 生效后必须不可读。
    out_of_scope_canary: PathBuf,
}

fn fixture() -> Fixture {
    let base = std::env::temp_dir().join(format!(
        "nutbook-pr-c-boundary-{}-{:?}",
        std::process::id(),
        std::thread::current().id()
    ));
    let _ = fs::remove_dir_all(&base);
    let scope = base.join("scope");
    fs::create_dir_all(&scope).expect("创建 fixture 目录失败");

    let in_scope_html = scope.join("index.html");
    fs::write(&in_scope_html, b"<h1>IN-SCOPE-HTML</h1>").expect("写入 fixture HTML 失败");

    let in_scope_asset = scope.join("asset.txt");
    fs::write(&in_scope_asset, b"IN-SCOPE-ASSET").expect("写入 fixture 资源失败");

    // 诱饵放在 scope 的父目录，正是「以父目录为界」时的第一个越界目标。
    let out_of_scope_canary = base.join("OUTSIDE-CANARY.txt");
    fs::write(&out_of_scope_canary, b"OUT-OF-SCOPE-CANARY").expect("写入诱饵失败");

    Fixture {
        _root: base,
        in_scope_html,
        in_scope_asset,
        out_of_scope_canary,
    }
}

// ---------------------------------------------------------------------------
// PHASE1_MUST_HOLD：修复后必须继续通过。
// ---------------------------------------------------------------------------

/// PHASE1_MUST_HOLD：会话范围内的 HTML 与同目录资源必须可读。
#[test]
fn in_scope_content_and_sibling_asset_are_readable() {
    let fixture = fixture();
    let server = LocalContentServer::start().expect("启动本地内容服务失败");

    let html_url = server.file_url(&fixture.in_scope_html);
    let html_path = html_url
        .strip_prefix(server.origin())
        .expect("file_url 应以 origin 开头");
    let (head, body) = http_get(server.origin(), html_path);
    assert_eq!(status_code(&head), 200, "范围内 HTML 应可读：{head}");
    assert!(
        String::from_utf8_lossy(&body).contains("IN-SCOPE-HTML"),
        "范围内 HTML 正文不符：{}",
        String::from_utf8_lossy(&body)
    );

    let asset_path = format!("/fs{}", encode_absolute_path(&fixture.in_scope_asset));
    let (head, body) = http_get(server.origin(), &asset_path);
    assert_eq!(status_code(&head), 200, "同目录资源应可读：{head}");
    assert_eq!(
        String::from_utf8_lossy(&body).trim(),
        "IN-SCOPE-ASSET",
        "同目录资源正文不符"
    );
}

/// PHASE1_MUST_HOLD：服务根路径不暴露枚举，基线已返回 400。
#[test]
fn service_root_is_rejected() {
    let _fixture = fixture();
    let server = LocalContentServer::start().expect("启动本地内容服务失败");

    let (head, _) = http_get(server.origin(), "/");
    assert_eq!(
        status_code(&head),
        400,
        "服务根应返回 400 invalid request：{head}"
    );
}

// ---------------------------------------------------------------------------
// PHASE1_MUST_INVERT：以下断言记录基线漏洞。
// 修复后必须失败或被替换为拦截断言；仍然通过即代表修复无效。
// ---------------------------------------------------------------------------

/// PHASE1_MUST_INVERT：任意绝对路径可直接读取，服务端无根边界概念。
#[test]
fn baseline_serves_any_absolute_path_without_scope_check() {
    let fixture = fixture();
    let server = LocalContentServer::start().expect("启动本地内容服务失败");

    let canary_path = format!("/fs{}", encode_absolute_path(&fixture.out_of_scope_canary));
    let (head, body) = http_get(server.origin(), &canary_path);

    assert_eq!(
        status_code(&head),
        200,
        "基线特征：越界绝对路径当前返回 200。若此处不再是 200，说明 Phase 1 已生效，请改写本用例。"
    );
    assert_eq!(
        String::from_utf8_lossy(&body).trim(),
        "OUT-OF-SCOPE-CANARY",
        "基线特征：越界文件内容当前可被完整读出"
    );
}

/// PHASE1_MUST_INVERT：百分号编码的点段绕过。
///
/// 归因说明（2026-09-09 Codex R3 修正）：浏览器与 URL 解析器**会**把 `%2e%2e`
/// 归一化成 `..`，因此浏览器侧 fetch 的成功不能证明「编码点段原样送达服务端」。
/// 本用例的价值在于它用裸 TcpStream 发请求，`%2e%2e` **原样上线路**，
/// 不经过任何 URL 规范化 —— 所以它是「服务端先 percent-decode、再把结果交给
/// `std::fs::read`、`..` 最终由 OS 解析」这一顺序缺陷的**服务端证据**。
/// Phase 1 若只加「URL 里含字面 `..` 就拒绝」的朴素校验，本用例仍会通过 ——
/// 那就意味着修复无效。唯一站得住的修复是：逐段解析 + canonicalize + 与会话根做前缀比对。
#[test]
fn baseline_encoded_dot_segments_escape_the_directory() {
    let fixture = fixture();
    let server = LocalContentServer::start().expect("启动本地内容服务失败");

    let scope_dir = fixture
        .in_scope_html
        .parent()
        .expect("范围内 HTML 应有父目录");
    let traversal = format!(
        "/fs{}/%2e%2e/OUTSIDE-CANARY.txt",
        encode_absolute_path(scope_dir)
    );
    let (head, body) = http_get(server.origin(), &traversal);

    assert_eq!(
        status_code(&head),
        200,
        "基线特征：%2e%2e 穿越当前返回 200：{head}"
    );
    assert_eq!(
        String::from_utf8_lossy(&body).trim(),
        "OUT-OF-SCOPE-CANARY",
        "基线特征：%2e%2e 穿越当前可读到父目录之外的文件"
    );
}

/// PHASE1_MUST_INVERT：响应缺少 `Cache-Control: no-store`，
/// 且 `Access-Control-Allow-Origin: *` 对所有来源开放。
#[test]
fn baseline_response_headers_are_permissive() {
    let fixture = fixture();
    let server = LocalContentServer::start().expect("启动本地内容服务失败");

    let asset_path = format!("/fs{}", encode_absolute_path(&fixture.in_scope_asset));
    let (head, _) = http_get(server.origin(), &asset_path);

    assert!(
        head.contains("Access-Control-Allow-Origin: *"),
        "基线特征：当前对所有来源开放 CORS：{head}"
    );
    assert!(
        !head.to_ascii_lowercase().contains("cache-control"),
        "基线特征：当前不发送 Cache-Control，缓存可跨会话保留内容：{head}"
    );
}
