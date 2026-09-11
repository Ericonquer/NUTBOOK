//! PR C Phase 1（计划 6.3，D1=A）：scoped resource origin 的**拦截断言**测试。
//!
//! 与 `pr_c_baseline_boundary_characterization.rs`（基线特征化）相反，本文件
//! 断言的是修复后**必须成立**的安全边界。全部用例打真实 `ScopedContentServer`
//! （裸 TcpStream，不经 URL 规范化），编码攻击原样上线路。
//!
//! 覆盖面：
//! - 界内可读，含 root-relative 路径（R11-a：origin 根 = 授权 root，
//!   PHASE1_MUST_HOLD 语义的正向对照）
//! - 字面/编码点段穿越、编码斜杠、双重编码、反斜杠、symlink 逃逸
//! - 响应头（no-store、无 CORS `*`、文本 charset）
//! - 方法限制、根路径拒绝、目录拒绝、Drop 后端口关闭
//! - R11-a：origin 级会话隔离（进程内端口永不复用、SW 注册拒绝、跨启动
//!   登记表 + 墓碑：旧 URL 重放确定性 403，登记端口不再分配给新 server）
//! - R12：资源预算（响应体超限 413 且可恢复、HEAD 仅元数据；并发上限用
//!   worker 入口 seam 做调度时序确定性验证，spawn 失败注入覆盖恢复路径）

use std::{
    fs,
    io::{Read, Write},
    net::TcpStream,
    path::{Path, PathBuf},
    time::Duration,
};

use nutbook_backend::core::scoped_content_server::{
    entomb_registered_ports, entomb_specific_ports, init_used_port_registry,
    set_start_candidate_port_override, set_tombstone_budgets, tombstone_supervisor_threads,
    MAX_REGISTRY_PORTS, ScopedContentServer,
};

/// R11-a：root-relative 路径 —— origin 根直接映射授权 root，无 token 段。
fn tp(_server: &ScopedContentServer, relative: &str) -> String {
    relative.to_string()
}

/// 一次性 HTTP/1.1 请求。服务端固定回 `Connection: close`，读到 EOF 即完整响应。
fn http_get(origin: &str, raw_path: &str) -> (String, Vec<u8>) {
    http_request(origin, "GET", raw_path)
}

/// HEAD 等空 body 响应在并发负载下偶发读到空流，这里自动重试一次。
fn http_request(origin: &str, method: &str, raw_path: &str) -> (String, Vec<u8>) {
    let (head, body) = http_request_once(origin, method, raw_path);
    if head.is_empty() {
        http_request_once(origin, method, raw_path)
    } else {
        (head, body)
    }
}

fn http_request_once(origin: &str, method: &str, raw_path: &str) -> (String, Vec<u8>) {
    let authority = origin
        .strip_prefix("http://")
        .expect("origin 应为 http:// 前缀");
    // 并发负载下 accept loop（非阻塞轮询）可能让首次 connect 偶发失败，重试。
    let mut stream = None;
    for _ in 0..10 {
        match TcpStream::connect(authority) {
            Ok(value) => {
                stream = Some(value);
                break;
            }
            Err(_) => std::thread::sleep(Duration::from_millis(20)),
        }
    }
    let mut stream = stream.expect("连接 scoped 服务失败（重试后）");
    stream
        .set_read_timeout(Some(Duration::from_secs(10)))
        .expect("设置读超时失败");

    let request = format!("{method} {raw_path} HTTP/1.1\r\nHost: {authority}\r\nConnection: close\r\n\r\n");
    stream
        .write_all(request.as_bytes())
        .expect("写入请求失败");

    let mut raw = Vec::new();
    stream.read_to_end(&mut raw).expect("读取响应失败");

    let Some(split) = raw
        .windows(4)
        .position(|window| window == b"\r\n\r\n")
    else {
        // 空响应/截断响应：交给上层重试逻辑。
        return (String::new(), Vec::new());
    };
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

struct Fixture {
    base: PathBuf,
    /// 授权 root（canonicalize 前）。
    scope: PathBuf,
    out_of_scope_canary: PathBuf,
}

fn fixture(tag: &str) -> Fixture {
    let base = std::env::temp_dir().join(format!(
        "nutbook-pr-c-scoped-{}-{}-{:?}",
        tag,
        std::process::id(),
        std::thread::current().id()
    ));
    let _ = fs::remove_dir_all(&base);
    let scope = base.join("scope");
    fs::create_dir_all(&scope).expect("创建 fixture 目录失败");

    fs::write(scope.join("index.html"), b"<h1>IN-SCOPE-HTML</h1>").expect("写入 HTML 失败");
    fs::write(scope.join("asset.txt"), b"IN-SCOPE-ASSET").expect("写入资源失败");
    fs::create_dir_all(scope.join("sub dir")).expect("创建子目录失败");
    fs::write(scope.join("sub dir").join("page.html"), b"<p>SUB-DIR-PAGE</p>")
        .expect("写入子目录页面失败");

    let out_of_scope_canary = base.join("OUTSIDE-CANARY.txt");
    fs::write(&out_of_scope_canary, b"OUT-OF-SCOPE-CANARY").expect("写入诱饵失败");

    Fixture {
        base,
        scope,
        out_of_scope_canary,
    }
}

fn body_is(body: &[u8], expected: &str, context: &str) {
    assert_eq!(
        String::from_utf8_lossy(body).trim(),
        expected,
        "{context} 响应正文不符"
    );
}

fn assert_out_of_scope(head: &str, body: &[u8], context: &str) {
    let code = status_code(head);
    assert!(
        code == 403 || code == 404,
        "{context} 必须被拒绝（403/404），实际 {code}：{head}"
    );
    assert!(
        !String::from_utf8_lossy(body).contains("CANARY"),
        "{context} 响应正文不得包含诱饵内容"
    );
}

// ---------------------------------------------------------------------------
// 正向对照：界内内容任何阶段都必须可读。
// ---------------------------------------------------------------------------

#[test]
fn in_scope_documents_and_assets_are_readable() {
    let fixture = fixture("positive");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    let (head, body) = http_get(server.origin(), &tp(&server, "/index.html"));
    assert_eq!(status_code(&head), 200, "会话入口 HTML 应可读：{head}");
    body_is(&body, "<h1>IN-SCOPE-HTML</h1>", "会话入口 HTML");

    let (head, body) = http_get(server.origin(), &tp(&server, "/asset.txt"));
    assert_eq!(status_code(&head), 200, "同会话资源应可读：{head}");
    body_is(&body, "IN-SCOPE-ASSET", "同会话资源");

    // 带空格子目录 + 编码路径。
    let (head, body) = http_get(server.origin(), &tp(&server, "/sub%20dir/page.html"));
    assert_eq!(status_code(&head), 200, "编码子目录路径应可读：{head}");
    body_is(&body, "<p>SUB-DIR-PAGE</p>", "子目录页面");

    // relative_url 生成的完整 URL 必须自带 token 门并可读（R11 正向）。
    let url = server
        .relative_url(std::path::Path::new("asset.txt"))
        .expect("relative_url 应生成 URL");
    let origin = server.origin().to_string();
    let path = url.strip_prefix(&origin).expect("URL 应以 origin 开头");
    let (head, body) = http_get(&origin, path);
    assert_eq!(status_code(&head), 200, "relative_url 产物应可读：{head}");
    body_is(&body, "IN-SCOPE-ASSET", "relative_url 产物");
}

#[test]
fn in_scope_responses_carry_secure_headers() {
    let fixture = fixture("headers");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    let (head, _) = http_get(server.origin(), &tp(&server, "/index.html"));
    assert!(
        head.to_ascii_lowercase().contains("cache-control: no-store"),
        "必须发送 Cache-Control: no-store：{head}"
    );
    assert!(
        !head.to_ascii_lowercase().contains("access-control-allow-origin"),
        "不得发送任何 Access-Control-Allow-Origin（同源自用）：{head}"
    );
    assert!(
        head.to_ascii_lowercase().contains("content-type: text/html; charset=utf-8"),
        "HTML 必须带 charset：{head}"
    );

    let (plain_head, _) = http_get(server.origin(), &tp(&server, "/asset.txt"));
    assert!(
        plain_head
            .to_ascii_lowercase()
            .contains("content-type: text/plain; charset=utf-8"),
        "文本资源必须带 charset（基线渲染空白问题的响应头修复）：{plain_head}"
    );
}

#[test]
fn head_request_returns_headers_without_body() {
    let fixture = fixture("head");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    let (head, body) = http_request(server.origin(), "HEAD", &tp(&server, "/index.html"));
    assert_eq!(status_code(&head), 200, "HEAD 应与 GET 同头：{head}");
    assert!(
        body.is_empty(),
        "HEAD 响应不得携带正文：{}",
        String::from_utf8_lossy(&body)
    );
    // R12：HEAD 只取元数据，但 Content-Length 必须真实（渲染器需要）。
    // `<h1>IN-SCOPE-HTML</h1>` 恰为 22 字节。
    assert!(
        head.to_ascii_lowercase().contains("content-length: 22"),
        "HEAD 必须返回真实 Content-Length（22 字节 HTML）：{head}"
    );
}

// ---------------------------------------------------------------------------
// 越界与穿越：全部拒绝。
// ---------------------------------------------------------------------------

#[test]
fn root_path_is_rejected() {
    let fixture = fixture("root");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    let (head, body) = http_get(server.origin(), &tp(&server, "/"));
    assert_out_of_scope(&head, &body, "会话根路径");
}

#[test]
fn literal_dot_dot_traversal_is_rejected() {
    let fixture = fixture("dotdot");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    let (head, body) = http_get(server.origin(), &tp(&server, "/../../OUTSIDE-CANARY.txt"));
    assert_out_of_scope(&head, &body, "字面 .. 穿越");
}

#[test]
fn encoded_dot_segment_traversal_is_rejected() {
    let fixture = fixture("enc-dotdot");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    // %2e%2e 原样上线路（裸 socket），服务端单遍解码后必须命中段校验。
    let (head, body) = http_get(server.origin(), &tp(&server, "/%2e%2e/OUTSIDE-CANARY.txt"));
    assert_out_of_scope(&head, &body, "%2e%2e 段穿越");
}

#[test]
fn encoded_slash_traversal_is_rejected() {
    let fixture = fixture("enc-slash");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    // %2e%2e%2f 在解码后同时产生 `..` 段与分隔符，必须在段校验前被还原。
    let (head, body) = http_get(server.origin(), &tp(&server, "/%2e%2e%2fOUTSIDE-CANARY.txt"));
    assert_out_of_scope(&head, &body, "%2e%2e%2f 编码斜杠穿越");
}

#[test]
fn encoded_slash_multi_segment_traversal_is_rejected() {
    let fixture = fixture("enc-slash-multi");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    // 与浏览器探针 T06e 同形：%2f 把分隔符编进单段，浏览器不会在发请求前消除它；
    // 服务端单遍解码后必须还原出多级 `..` 段并命中段校验（Codex C-GUI-2 要求两侧严格对应）。
    let (head, body) = http_get(
        server.origin(),
        &tp(&server, "/%2e%2e%2f%2e%2e%2fOUTSIDE-CANARY.txt"),
    );
    assert_out_of_scope(&head, &body, "%2e%2e%2f 多级编码斜杠穿越");
}

#[test]
fn double_encoded_traversal_is_never_a_canary() {
    let fixture = fixture("double-enc");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    // %252e 单遍解码后是字面 `%2e`，不是路径段穿越；最多 404，绝不能读出诱饵。
    let (head, body) = http_get(server.origin(), &tp(&server, "/%252e%252e/OUTSIDE-CANARY.txt"));
    assert_out_of_scope(&head, &body, "双重编码穿越");
}

#[test]
fn backslash_segment_is_rejected() {
    let fixture = fixture("backslash");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    // Windows 路径分隔符形态；跨平台统一拒绝。
    let (head, body) = http_get(server.origin(), &tp(&server, "/..%5COUTSIDE-CANARY.txt"));
    assert_out_of_scope(&head, &body, "反斜杠穿越");
}

#[test]
fn absolute_style_path_cannot_escape_root() {
    let fixture = fixture("absolute");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    // /etc/hosts 形态在 scoped 语义下只能解析为 root/etc/hosts → 不存在 → 404。
    let (head, body) = http_get(server.origin(), &tp(&server, "/etc/hosts"));
    assert_out_of_scope(&head, &body, "绝对路径形态读取");
}

#[cfg(unix)]
#[test]
fn symlink_escape_is_rejected() {
    let fixture = fixture("symlink");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    let link = fixture.scope.join("link.txt");
    std::os::unix::fs::symlink(&fixture.out_of_scope_canary, &link).expect("创建 symlink 失败");

    let (head, body) = http_get(server.origin(), &tp(&server, "/link.txt"));
    assert_out_of_scope(&head, &body, "symlink 逃逸");
}

#[test]
fn missing_file_is_404() {
    let fixture = fixture("404");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    let (head, body) = http_get(server.origin(), &tp(&server, "/nope.txt"));
    assert_eq!(status_code(&head), 404, "界内不存在文件应 404：{head}");
    assert!(
        !String::from_utf8_lossy(&body).contains("CANARY"),
        "404 正文不得包含诱饵内容"
    );
}

#[test]
fn directory_request_is_rejected() {
    let fixture = fixture("dir");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    let (head, body) = http_get(server.origin(), &tp(&server, "/sub%20dir"));
    assert_out_of_scope(&head, &body, "目录请求");
}

// ---------------------------------------------------------------------------
// R11-a：origin 级会话隔离（进程内端口永不复用 + SW 注册拒绝）。
// ---------------------------------------------------------------------------

/// root-relative 引用（页面内 `/assets/...`、`base href=/`）按 D1 合同
/// 原语义可读 —— 这是 R11-a 修复的核心正向断言。
#[test]
fn root_relative_paths_are_served() {
    let fixture = fixture("root-relative");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    for path in ["/index.html", "/asset.txt", "/sub%20dir/page.html"] {
        let (head, body) = http_get(server.origin(), path);
        assert_eq!(status_code(&head), 200, "root-relative 路径 {path} 必须可读：{head}");
        assert!(
            !String::from_utf8_lossy(&body).contains("OUT-OF-SCOPE"),
            "正常路径不得返回越界内容"
        );
    }
}

/// Service Worker 注册请求（`Service-Worker: script`）必须 404：scoped
/// origin 上装不上持久拦截器，端口复用窗口没有 SW 残留可拦。
#[test]
fn service_worker_registration_is_rejected() {
    let fixture = fixture("sw");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");
    fs::write(fixture.scope.join("sw.js"), b"self.onfetch=()=>{}").expect("写入 sw.js 失败");
    let authority = server.origin().strip_prefix("http://").expect("origin 前缀");

    let mut stream = TcpStream::connect(authority).expect("连接失败");
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .expect("设置读超时失败");
    let request = "GET /sw.js HTTP/1.1\r\nHost: x\r\nService-Worker: script\r\nConnection: close\r\n\r\n";
    stream.write_all(request.as_bytes()).expect("写入失败");
    let mut raw = Vec::new();
    let _ = stream.read_to_end(&mut raw);
    let head = String::from_utf8_lossy(&raw).to_string();
    assert_eq!(status_code(&head), 404, "SW 脚本注册必须 404：{head}");

    // 同一文件普通请求仍 200 —— 拒绝只针对 SW 注册语义。
    let (head, _) = http_get(server.origin(), "/sw.js");
    assert_eq!(status_code(&head), 200, "同资源普通请求应正常：{head}");
}

/// 进程内端口永不复用：Drop 后重新 start，新端口不得与本进程出现过的
/// 任何端口相同（含跨实例、跨 root）。
#[test]
fn ports_are_never_reused_within_process() {
    let mut fixtures: Vec<Fixture> = Vec::new();
    let mut seen: Vec<String> = Vec::new();
    for index in 0..10 {
        let fixture = fixture(&format!("port-{index}"));
        let server = ScopedContentServer::start(&fixture.scope).expect("启动失败");
        let origin = server.origin().to_string();
        assert!(!seen.contains(&origin), "第 {index} 个实例复用了已用端口 {origin}");
        seen.push(origin);
        drop(server);
        fixtures.push(fixture);
    }
    drop(fixtures);
}

// ---------------------------------------------------------------------------
// R11-a（Codex 第二轮返修）：跨启动端口复用 —— 登记表 + 墓碑机制。
// ---------------------------------------------------------------------------

/// 跨启动登记表（测试二进制内全局一次）。真实进程里该文件在 app_data_dir，
/// 由 AppState::new 在任何 scoped 服务器启动之前初始化。返回登记文件路径。
fn init_cross_launch_registry() -> PathBuf {
    static REGISTRY_DIR: std::sync::OnceLock<PathBuf> = std::sync::OnceLock::new();
    let dir = REGISTRY_DIR.get_or_init(|| {
        let dir = std::env::temp_dir().join(format!(
            "nutbook-pr-c-port-registry-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ));
        fs::create_dir_all(&dir).expect("创建登记表目录失败");
        dir
    });
    init_used_port_registry(dir.join("used-scoped-ports.json")).expect("登记表 init 失败")
}

/// 旧 URL 重放的确定性正反测试（模拟进程重启）：
/// - 正向：本轮 start 的端口被登记；模拟「新启动」执行 entomb 后，旧
///   origin 的 URL 重放只能打到墓碑（403），即使新 server 使用**同一个
///   授权 root** 也绝不可能再分到该端口（root-relative 语义在新 origin
///   上原样可用）；
/// - 反向（机制原语）：墓碑持有期间，任何 bind 该端口的行为都失败 ——
///   这是「OS 不会把登记端口分给新 server」这一确定性保证的根基。
#[test]
fn cross_launch_replay_hits_tombstone_never_new_root() {
    let registry_path = init_cross_launch_registry();

    let fixture = fixture("cross-launch-a");
    fs::write(fixture.scope.join("index.html"), b"SESSION-A").expect("写入失败");
    let server_a = ScopedContentServer::start(&fixture.scope).expect("启动 A 失败");
    let port_a = server_a
        .origin()
        .strip_prefix("http://127.0.0.1:")
        .expect("origin 形态")
        .parse::<u16>()
        .expect("端口");

    // 持久化：start 后登记文件必须记录该端口（重启后 entomb 的输入）。
    let recorded = fs::read_to_string(&registry_path).expect("登记文件应存在");
    let ports: Vec<u16> =
        serde_json::from_str(&recorded).expect("登记文件应为 u16 数组");
    assert!(ports.contains(&port_a), "登记文件必须包含端口 {port_a}：{ports:?}");

    // 旧会话正常可用。
    let (head, body) = http_get(server_a.origin(), "/index.html");
    assert_eq!(status_code(&head), 200, "旧会话界内资源应可读：{head}");
    body_is(&body, "SESSION-A", "旧会话读取");

    // 会话结束（模拟进程退出释放端口）。
    drop(server_a);

    // 模拟「下一次启动」第一步：定向墓碑化本会话登记的端口（真实进程在
    // 启动时用 entomb_registered_ports 全量墓碑化登记表；测试并行环境下
    // 只处理自己的端口，避免墓碑化其他用例的端口干扰其断言）。
    let entombed = entomb_specific_ports(&[port_a]);
    assert_eq!(entombed, 1, "会话端口 {port_a} 已释放，必须能被墓碑占用");

    // 正向：旧 URL 重放 → 墓碑 403，绝不映射到新会话 root。轮询等待墓碑
    // accept 线程就位（bind 在 entomb 内同步完成，这里只是等响应路径）。
    let deadline = std::time::Instant::now() + Duration::from_secs(10);
    let mut tombstoned = false;
    while std::time::Instant::now() < deadline {
        let (head, _) = http_get(&format!("http://127.0.0.1:{port_a}"), "/index.html");
        let code = status_code(&head);
        assert_ne!(
            code, 200,
            "跨启动旧 URL 重放绝不能拿到会话内容（必须 403/连接失败）"
        );
        if code == 403 {
            tombstoned = true;
            break;
        }
        std::thread::sleep(Duration::from_millis(25));
    }
    assert!(tombstoned, "旧 URL 重放必须命中墓碑（403）");

    // 反向（机制原语）：墓碑持有端口期间，bind 必然失败 —— 新
    // ScopedContentServer（bind 127.0.0.1:0）因此结构上不可能分到该端口。
    assert!(
        std::net::TcpListener::bind(("127.0.0.1", port_a)).is_err(),
        "墓碑持有的端口 {port_a} 不可再被 bind（OS 不会把它分配给新 server）"
    );

    // 同一授权 root 的新会话：拿到不同 origin，root-relative 原样可用。
    let server_b = ScopedContentServer::start(&fixture.scope).expect("启动 B 失败");
    let port_b = server_b
        .origin()
        .strip_prefix("http://127.0.0.1:")
        .expect("origin 形态")
        .parse::<u16>()
        .expect("端口");
    assert_ne!(port_a, port_b, "新会话不得分到墓碑持有的历史端口");
    let (head, body) = http_get(server_b.origin(), "/index.html");
    assert_eq!(status_code(&head), 200, "新 origin 的 root-relative 应可用：{head}");
    body_is(&body, "SESSION-A", "新 origin 读取（同 root）");
}

/// 定向 entomb 的非目标场景：对**本进程存活 server** 持有的端口执行
/// entomb，bind 失败被跳过 —— 墓碑绝不抢占本进程活端口。
#[test]
fn entomb_spares_live_servers_of_this_process() {
    init_cross_launch_registry();

    let fixture = fixture("persist-check");
    fs::write(fixture.scope.join("index.html"), b"PERSIST-CHECK").expect("写入失败");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动失败");
    let port = server
        .origin()
        .strip_prefix("http://127.0.0.1:")
        .expect("origin 形态")
        .parse::<u16>()
        .expect("端口");

    // 存活 server 的端口 bind 失败 → 墓碑跳过，不得影响服务。
    assert_eq!(
        entomb_specific_ports(&[port]),
        0,
        "存活 server 的端口不可被墓碑占用"
    );
    let (head, body) = http_get(server.origin(), "/index.html");
    assert_eq!(status_code(&head), 200, "entomb 不得影响本进程存活 server：{head}");
    body_is(&body, "PERSIST-CHECK", "entomb 后存活 server 读取");
    drop(server);
}

// ---------------------------------------------------------------------------
// R12：资源预算。
// ---------------------------------------------------------------------------

/// 响应体超限 → 413，且服务可恢复（后续正常请求仍 200）。
#[test]
fn oversized_body_is_413_and_service_recovers() {
    let fixture = fixture("413");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    let big = fixture.scope.join("big.bin");
    // 65 MiB > 64 MiB 上限。写大文件较慢，但这是一次性成本。
    let chunk = vec![b'A'; 1024 * 1024];
    let mut file = fs::File::create(&big).expect("创建大文件失败");
    for _ in 0..65 {
        use std::io::Write as _;
        file.write_all(&chunk).expect("写入大文件失败");
    }
    drop(file);

    let (head, body) = http_get(server.origin(), &tp(&server, "/big.bin"));
    assert_eq!(status_code(&head), 413, "超限资源必须 413：{head}");
    assert!(
        !String::from_utf8_lossy(&body).contains('A'),
        "413 不得泄露资源内容"
    );

    // 服务可恢复。
    let (head, body) = http_get(server.origin(), &tp(&server, "/asset.txt"));
    assert_eq!(status_code(&head), 200, "413 后的恢复请求应正常：{head}");
    body_is(&body, "IN-SCOPE-ASSET", "413 后恢复读取");
    // 清理 65MB 大文件。
    let _ = fs::remove_dir_all(&fixture.base);
}

/// R12-test（Codex 第二轮返修）：并发上限的**调度时序确定性验证**。
///
/// 用 worker 入口 seam 把全部 worker 阻塞在推进之前，隔离「OS 线程调度
/// 快慢」这个不可控变量：
/// - 新实现（spawn 前 fetch_add 认领）：32 个 worker 全部阻塞时，槽位已被
///   accept 认领完毕 —— 第 33 个连接必须 503，且 spawn 的 worker 恰好 32 个；
/// - 若回退旧实现（worker 内才计数）：seam 下计数永不发生，第 33 个连接
///   会被正常服务（200），`workers_spawned` 也会超过 32 —— 本测试确定性
///   失败，不依赖随机压力撞竞态窗口。
#[test]
fn concurrency_limit_is_enforced_before_worker_scheduling() {
    let fixture = fixture("concurrency-seam");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");
    let authority = server.origin().strip_prefix("http://").expect("origin 前缀").to_string();

    // 阻塞全部 worker 于入口：之后的计数只可能来自 accept 侧的 spawn 前
    // 认领，调度快慢不再影响结果。
    server.set_worker_entry_gate(true);

    let mut holders: Vec<TcpStream> = Vec::new();
    for _ in 0..32 {
        let mut stream = None;
        for _ in 0..50 {
            match TcpStream::connect(&authority) {
                Ok(value) => {
                    stream = Some(value);
                    break;
                }
                Err(_) => std::thread::sleep(Duration::from_millis(10)),
            }
        }
        holders.push(stream.expect("占位连接失败"));
    }

    // 等 accept loop 把 32 个连接全部 accept + spawn（worker 阻塞在入口，
    // spawn 计数到 32 即说明槽位全部在 spawn 前认领完毕）。
    let deadline = std::time::Instant::now() + Duration::from_secs(10);
    while std::time::Instant::now() < deadline && server.workers_spawned() < 32 {
        std::thread::sleep(Duration::from_millis(10));
    }
    assert_eq!(
        server.workers_spawned(),
        32,
        "上限内必须恰好 spawn 32 个 worker（accept 已预留全部槽位）"
    );

    // 第 33+ 个连接必须 503。worker 全部阻塞、计数不再变化，结果与调度
    // 无关；重试只为等 accept 轮询（25ms）处理连接。
    let deadline = std::time::Instant::now() + Duration::from_secs(10);
    let mut observed_503 = false;
    while std::time::Instant::now() < deadline {
        let Ok(mut extra) = TcpStream::connect(&authority) else {
            std::thread::sleep(Duration::from_millis(25));
            continue;
        };
        let _ = extra.set_read_timeout(Some(Duration::from_secs(5)));
        if extra
            .write_all(b"GET /asset.txt HTTP/1.1\r\nConnection: close\r\n\r\n")
            .is_err()
        {
            continue;
        }
        let mut raw = Vec::new();
        let _ = extra.read_to_end(&mut raw);
        let head = String::from_utf8_lossy(&raw).to_string();
        if head.starts_with("HTTP/1.1 503") {
            observed_503 = true;
            break;
        }
        assert!(
            !head.starts_with("HTTP/1.1 200"),
            "worker 全阻塞时槽位仍须占满，超限连接不得被服务：{head}"
        );
        std::thread::sleep(Duration::from_millis(25));
    }
    assert!(observed_503, "第 33 个连接必须收到 503（槽位在 spawn 前认领）");
    assert_eq!(
        server.workers_spawned(),
        32,
        "超限后不得再 spawn worker（最多分配 32 个）"
    );

    // 恢复：先关占位连接再放开 seam —— worker 醒来读到已关闭的 socket 即
    // 退出，槽位全部释放。
    drop(holders);
    server.set_worker_entry_gate(false);
    let deadline = std::time::Instant::now() + Duration::from_secs(10);
    loop {
        match http_get(server.origin(), "/asset.txt") {
            (head, body) if head.starts_with("HTTP/1.1 200") => {
                body_is(&body, "IN-SCOPE-ASSET", "释放后恢复读取");
                break;
            }
            _ if std::time::Instant::now() >= deadline => {
                panic!("释放占位并放开 seam 后服务必须恢复");
            }
            _ => std::thread::sleep(Duration::from_millis(50)),
        }
    }
}

/// R12-test：线程创建失败的确定性覆盖 —— 注入 1 次 spawn 失败，验证失败
/// 路径释放槽位（不泄漏）且服务恢复。seam 使槽位计数完全受控：31 个阻塞
/// worker 占位 + 1 次注入失败（认领后释放）→ 第 33 个连接仍可 spawn（第
/// 32 个 worker），第 34 个 503。若失败路径不释放槽位，第 33 个连接就会被
/// 503、worker 计数停在 31 —— 测试确定性失败。
#[test]
fn spawn_failure_releases_slot_and_service_recovers() {
    let fixture = fixture("spawn-failure");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");
    let authority = server.origin().strip_prefix("http://").expect("origin 前缀").to_string();

    server.set_worker_entry_gate(true);

    // 31 个阻塞 worker 占位。
    let mut holders: Vec<TcpStream> = Vec::new();
    for _ in 0..31 {
        let mut stream = None;
        for _ in 0..50 {
            match TcpStream::connect(&authority) {
                Ok(value) => {
                    stream = Some(value);
                    break;
                }
                Err(_) => std::thread::sleep(Duration::from_millis(10)),
            }
        }
        holders.push(stream.expect("占位连接失败"));
    }
    let deadline = std::time::Instant::now() + Duration::from_secs(10);
    while std::time::Instant::now() < deadline && server.workers_spawned() < 31 {
        std::thread::sleep(Duration::from_millis(10));
    }
    assert_eq!(server.workers_spawned(), 31, "前置：31 个 worker 已 spawn");

    // 注入 1 次 spawn 失败 —— 在占位之后注入，确保失败精确命中下一个
    // （第 32 个）被 accept 的连接。
    server.inject_spawn_failures(1);

    // 第 32 个连接触发注入的 spawn 失败：槽位认领后走失败回收路径释放。
    // 失败路径不 spawn —— worker 计数停在 31；但槽位已释放。
    let mut injected = TcpStream::connect(&authority).expect("注入连接失败");
    let _ = injected.write_all(b"GET /asset.txt HTTP/1.1\r\nConnection: close\r\n\r\n");
    let mut raw = Vec::new();
    let _ = injected.read_to_end(&mut raw);
    // 失败路径直接断开（无响应）；给 accept 轮询留时间后继续断言。
    std::thread::sleep(Duration::from_millis(100));

    // 第 33 个连接：失败释放的槽位可复用 —— 正常 spawn（第 32 个 worker）。
    let mut recovered = None;
    let deadline = std::time::Instant::now() + Duration::from_secs(10);
    while std::time::Instant::now() < deadline {
        if let Ok(mut stream) = TcpStream::connect(&authority) {
            let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
            let _ = stream.write_all(b"GET /asset.txt HTTP/1.1\r\nConnection: close\r\n\r\n");
            let mut raw = Vec::new();
            let _ = stream.read_to_end(&mut raw);
            // 33 号连接被 spawn（阻塞在入口，不回响应）→ read 超时 EOF 空。
            // 503 说明槽位未释放 —— 断言失败。
            let head = String::from_utf8_lossy(&raw).to_string();
            assert!(
                !head.starts_with("HTTP/1.1 503"),
                "spawn 失败释放的槽位必须可复用（第 33 个连接不得 503）：{head}"
            );
            if head.is_empty() {
                recovered = Some(());
                break;
            }
        }
        std::thread::sleep(Duration::from_millis(25));
    }
    assert!(recovered.is_some(), "第 33 个连接应被 spawn（无 503）");
    assert_eq!(
        server.workers_spawned(),
        32,
        "注入 1 次失败后仍应累计 spawn 32 个 worker（31 占位 + 1 恢复）"
    );

    // 第 34 个连接：32 槽再次占满 → 503（预算仍然硬界）。
    let deadline = std::time::Instant::now() + Duration::from_secs(10);
    let mut observed_503 = false;
    while std::time::Instant::now() < deadline {
        if let Ok(mut extra) = TcpStream::connect(&authority) {
            let _ = extra.set_read_timeout(Some(Duration::from_secs(5)));
            let _ = extra.write_all(b"GET /asset.txt HTTP/1.1\r\nConnection: close\r\n\r\n");
            let mut raw = Vec::new();
            let _ = extra.read_to_end(&mut raw);
            let head = String::from_utf8_lossy(&raw).to_string();
            if head.starts_with("HTTP/1.1 503") {
                observed_503 = true;
                break;
            }
            assert!(
                !head.starts_with("HTTP/1.1 200"),
                "失败恢复后预算仍须硬界，不得服务超限连接：{head}"
            );
        }
        std::thread::sleep(Duration::from_millis(25));
    }
    assert!(observed_503, "第 34 个连接必须 503");

    // 清场恢复：关占位连接、放开 seam、撤销注入。
    drop(holders);
    server.set_worker_entry_gate(false);
    let (head, body) = http_get(server.origin(), "/asset.txt");
    assert_eq!(status_code(&head), 200, "清场后服务必须恢复：{head}");
    body_is(&body, "IN-SCOPE-ASSET", "清场恢复读取");
}

/// HEAD 仅元数据：对超限文件 HEAD 返回真实 Content-Length 而非 413？
/// 不 —— 超限在元数据阶段就 413；本用例验证正常文件 HEAD 的 Content-Length。
#[test]
fn head_metadata_reflects_real_size() {
    let fixture = fixture("head-meta");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    let content = b"0123456789".repeat(100); // 1000 字节
    fs::write(fixture.scope.join("measured.bin"), &content).expect("写入失败");

    let (head, body) = http_request(server.origin(), "HEAD", &tp(&server, "/measured.bin"));
    assert_eq!(status_code(&head), 200, "HEAD 应成功：{head}");
    assert!(body.is_empty(), "HEAD 不得携带正文");
    assert!(
        head.to_ascii_lowercase().contains("content-length: 1000"),
        "HEAD 必须返回真实 Content-Length：{head}"
    );
}

// ---------------------------------------------------------------------------
// 方法与生命周期。
// ---------------------------------------------------------------------------

#[test]
fn non_get_methods_are_rejected() {
    let fixture = fixture("method");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    let (head, _) = http_request(server.origin(), "POST", &tp(&server, "/index.html"));
    assert_eq!(status_code(&head), 405, "POST 应被拒绝：{head}");

    let (head, _) = http_request(server.origin(), "PUT", &tp(&server, "/asset.txt"));
    assert_eq!(status_code(&head), 405, "PUT 应被拒绝：{head}");
}

#[test]
fn oversized_request_head_is_rejected() {
    let fixture = fixture("oversize");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");

    let authority = server.origin().strip_prefix("http://").expect("origin 前缀");
    let mut stream = TcpStream::connect(authority).expect("连接失败");
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .expect("设置读超时失败");
    let junk = "A".repeat(64 * 1024);
    let request = format!("GET /{junk} HTTP/1.1\r\nConnection: close\r\n\r\n");
    let _ = stream.write_all(request.as_bytes());

    let mut raw = Vec::new();
    let _ = stream.read_to_end(&mut raw);
    let head = String::from_utf8_lossy(&raw);
    if !raw.is_empty() {
        let code = status_code(&head);
        assert!(
            code == 400 || code == 403 || code == 414,
            "超长请求行必须被拒绝，实际 {code}：{head}"
        );
    }
    // 连接被直接断开（无响应）也视为通过：上限保护成立。
}

#[test]
fn dropped_server_stops_accepting_connections() {
    let fixture = fixture("shutdown");
    let origin;
    {
        let server = ScopedContentServer::start(&fixture.scope).expect("启动 scoped 服务失败");
        origin = server.origin().to_string();
        let (head, _) = http_get(&origin, &tp(&server, "/index.html"));
        assert_eq!(status_code(&head), 200, "Drop 前应可读：{head}");
    }
    // Drop 后端口必须关闭：connect 应失败（accept loop 退出，listener 随之释放）。
    let authority = origin.strip_prefix("http://").expect("origin 前缀");
    let mut connected = false;
    for _ in 0..50 {
        match TcpStream::connect_timeout(
            &authority
                .parse()
                .expect("authority 应可解析为 SocketAddr"),
            Duration::from_millis(50),
        ) {
            Ok(_) => {
                connected = true;
                std::thread::sleep(Duration::from_millis(20));
            }
            Err(_) => {
                connected = false;
                break;
            }
        }
    }
    assert!(!connected, "Drop 后端口必须不再接受连接");
}

#[test]
fn distinct_servers_get_distinct_origins() {
    let fixture_a = fixture("iso-a");
    let fixture_b = fixture("iso-b");
    let server_a = ScopedContentServer::start(&fixture_a.scope).expect("启动 A 失败");
    let server_b = ScopedContentServer::start(&fixture_b.scope).expect("启动 B 失败");

    assert_ne!(
        server_a.origin(),
        server_b.origin(),
        "两个 scoped 会话必须持有独立 origin（D1=A 核心）"
    );
    // A 的 origin 不得读到 B 的内容。
    let b_relative = server_b
        .origin()
        .strip_prefix("http://")
        .and_then(|authority| authority.rsplit(':').next().map(|port| port.to_string()))
        .expect("B 端口");
    let (head, body) = http_get(server_a.origin(), &format!("/%2F%2F{b_relative}%2Findex.html"));
    assert_out_of_scope(&head, &body, "跨 origin 端口混用");
}

// ---------------------------------------------------------------------------
// R11-a 第三轮（Codex revision 9）：身份集裁决 / 失败关闭 / 有界墓碑。
// 全局登记状态无法在并行测试中安全变异，因此登记表行为用例一律在**独立
// 子进程**中运行（测试二进制以 env 守卫重入）；父进程断言结果文件。
// ---------------------------------------------------------------------------

/// 子进程用例 runner：常规套件运行（无 PRC_CHILD_CASE）时直接返回。
#[test]
fn pr_c_child_case_runner() {
    let Ok(case) = std::env::var("PRC_CHILD_CASE") else {
        return;
    };
    let out_path =
        std::env::var("PRC_CHILD_OUT").expect("PRC_CHILD_OUT 必须设置");
    let result = run_child_case(&case);
    fs::write(&out_path, serde_json::to_vec(&result).expect("序列化结果失败"))
        .expect("写结果文件失败");
}

fn child_workdir(tag: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "nutbook-pr-c-child-{tag}-{}",
        std::process::id()
    ));
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).expect("创建子进程工作目录失败");
    dir
}

fn run_child_case(case: &str) -> serde_json::Value {
    match case {
        "identity-occupy-release" => child_case_identity_occupy_release(),
        "failclosed-corrupt" => child_case_failclosed_corrupt(),
        "failclosed-write" => child_case_failclosed_write(),
        "tombstone-budget" => child_case_tombstone_budget(),
        "e2e-cross-launch-a" => child_case_e2e_child_a(),
        "e2e-cross-launch-b" => child_case_e2e_child_b(),
        "registry-loss" => child_case_registry_loss(),
        "concurrent-reg-a" | "concurrent-reg-b" => child_case_concurrent_registration(),
        "capacity-full" => child_case_capacity_exhaustion(),
        "claim-conflict-b" => child_case_claim_conflict_b(),
        "claim-conflict-a" => child_case_claim_conflict_a(),
        other => serde_json::json!({ "ok": false, "error": format!("未知用例 {other}") }),
    }
}

fn child_assert(condition: bool, message: &str) -> Option<String> {
    if condition {
        None
    } else {
        Some(message.to_string())
    }
}

fn child_out_dir(case: &str) -> PathBuf {
    let out_dir = std::env::temp_dir().join(format!(
        "nutbook-pr-c-childout-{case}-{}-{:?}",
        std::process::id(),
        std::thread::current().id()
    ));
    let _ = fs::remove_dir_all(&out_dir);
    fs::create_dir_all(&out_dir).expect("创建父进程结果目录失败");
    out_dir
}

/// spawn 一个真实子进程（测试二进制重入）并等待其退出，返回结果 JSON。
/// `extra_env` 用于向子进程传递共享登记目录、历史端口等参数。
fn spawn_child_case(
    case: &str,
    out_dir: &Path,
    extra_env: &[(&str, String)],
) -> serde_json::Value {
    let out_path = out_dir.join(format!("result-{case}.json"));
    let exe = std::env::current_exe().expect("current_exe");
    let mut command = std::process::Command::new(&exe);
    command
        .args(["--exact", "pr_c_child_case_runner", "--nocapture"])
        .env("PRC_CHILD_CASE", case)
        .env("PRC_CHILD_OUT", &out_path);
    for (key, value) in extra_env {
        command.env(key, value);
    }
    let output = command.output().expect("spawn 子进程失败");
    if !output.status.success() {
        panic!(
            "子进程 {case} 失败（exit {:?}）：\n{}",
            output.status.code(),
            String::from_utf8_lossy(&output.stderr)
        );
    }
    let bytes = fs::read(&out_path).unwrap_or_else(|_| panic!("子进程 {case} 未写结果文件"));
    serde_json::from_slice(&bytes).expect("结果 JSON 解析失败")
}

fn run_child_case_and_assert(case: &str) -> serde_json::Value {
    let out_dir = child_out_dir(case);
    let result = spawn_child_case(case, &out_dir, &[]);
    assert_eq!(
        result["ok"], serde_json::json!(true),
        "子进程 {case} 断言失败：{result}"
    );
    result
}

/// a.1（Codex 探针场景的确定性复现与反向证明）：登记端口 → 外部持有 →
/// entomb 0 → 释放 → **身份集裁决拒绝**（不依赖 bind(:0) 恰好选中）→
/// 正常 start 拿新端口仍可用。
fn child_case_identity_occupy_release() -> serde_json::Value {
    let dir = child_workdir("identity");
    let scope = dir.join("scope");
    fs::create_dir_all(&scope).expect("创建 root 失败");
    fs::write(scope.join("index.html"), b"IDENTITY").expect("写入失败");

    let registry = dir.join("used-scoped-ports.json");
    // 第一步：拿一个当前空闲端口并把它写成「上一进程的历史身份」。
    let server = ScopedContentServer::start(&scope).expect("启动失败");
    let port = server
        .origin()
        .strip_prefix("http://127.0.0.1:")
        .expect("origin 形态")
        .parse::<u16>()
        .expect("端口");
    drop(server);
    fs::write(&registry, serde_json::json!([port]).to_string()).expect("写登记失败");

    // 第二步：init（身份集并入）→ 外部占用 → entomb 必然 0 → 释放。
    init_used_port_registry(registry).expect("init 失败");
    let holder = std::net::TcpListener::bind(("127.0.0.1", port)).expect("外部占用失败");
    let entombed = entomb_registered_ports();
    drop(holder);
    let e1 = child_assert(
        entombed == 0,
        &format!("外部占用期间 entomb 必须跳过（实际 {entombed}）"),
    );

    // 第三步：端口已释放，但历史身份裁决仍然拒绝 —— 确定性，不靠 OS 选中。
    let e2 = child_assert(
        ScopedContentServer::start_on_port(&scope, port).is_err(),
        &format!("释放后的登记端口 {port} 必须被身份集拒绝"),
    );
    // 第四步：正常 start 不受影响，且不落在历史端口上。
    let server2 = ScopedContentServer::start(&scope);
    let e3 = match server2 {
        Ok(server) => {
            let port2 = server
                .origin()
                .strip_prefix("http://127.0.0.1:")
                .expect("origin 形态")
                .parse::<u16>()
                .expect("端口");
            child_assert(port2 != port, "新会话不得落在历史身份端口上")
        }
        Err(error) => Some(format!("正常 start 失败：{error}")),
    };
    let errors: Vec<String> = [e1, e2, e3].into_iter().flatten().collect();
    serde_json::json!({ "ok": errors.is_empty(), "error": errors.join("; ") })
}

/// a.2：登记文件损坏 → init Err → start 一律拒绝（fail closed）。
fn child_case_failclosed_corrupt() -> serde_json::Value {
    let dir = child_workdir("corrupt");
    let scope = dir.join("scope");
    fs::create_dir_all(&scope).expect("创建 root 失败");
    fs::write(scope.join("index.html"), b"CORRUPT").expect("写入失败");
    let registry = dir.join("used-scoped-ports.json");
    fs::write(&registry, b"{not valid json!!").expect("写损坏登记失败");

    let init_result = init_used_port_registry(registry);
    let e1 = child_assert(init_result.is_err(), "损坏登记必须 init Err");
    let e2 = child_assert(
        ScopedContentServer::start(&scope).is_err(),
        "登记故障后 start 必须拒绝（fail closed）",
    );
    let errors: Vec<String> = [e1, e2].into_iter().flatten().collect();
    serde_json::json!({ "ok": errors.is_empty(), "error": errors.join("; ") })
}

/// a.2：init 成功后登记目标被替换为目录 → persist 失败 → start 拒绝且
/// origin 不发布；恢复合法登记文件后重新 init + start 成功（失败后恢复）。
fn child_case_failclosed_write() -> serde_json::Value {
    let dir = child_workdir("writefail");
    let scope = dir.join("scope");
    fs::create_dir_all(&scope).expect("创建 root 失败");
    fs::write(scope.join("index.html"), b"WRITEFAIL").expect("写入失败");
    let registry = dir.join("used-scoped-ports.json");
    fs::write(&registry, "[]").expect("写合法登记失败");
    init_used_port_registry(registry.clone()).expect("init 失败");

    // 登记目标变成目录：写入必失败。
    fs::remove_file(&registry).expect("移除登记文件失败");
    fs::create_dir_all(&registry).expect("创建同名目录失败");
    let start_result = ScopedContentServer::start(&scope);
    let e1 = child_assert(
        start_result.is_err(),
        "持久化失败必须让 start 拒绝（origin 不得发布）",
    );
    let e2 = match &start_result {
        Err(error) => child_assert(
            error.to_string().contains("registry"),
            &format!("错误应可识别为登记故障：{error}"),
        ),
        Ok(_) => Some("意外成功".to_string()),
    };

    // 恢复：移除目录、写入合法文件、重新 init → start 成功。
    fs::remove_dir_all(&registry).expect("移除目录失败");
    fs::write(&registry, "[]").expect("恢复登记失败");
    init_used_port_registry(registry.clone()).expect("恢复后 init 失败");
    let e3 = child_assert(
        ScopedContentServer::start(&scope).is_ok(),
        "恢复合法登记后 start 必须成功",
    );
    let errors: Vec<String> = [e1, e2, e3].into_iter().flatten().collect();
    serde_json::json!({ "ok": errors.is_empty(), "error": errors.join("; ") })
}

/// a.3：墓碑 supervisor 资源上界 —— 多端口共享 1 线程；读超限 / 期限 /
/// 并发超限都被有界关闭，且服务持续可用。
fn child_case_tombstone_budget() -> serde_json::Value {
    set_tombstone_budgets(256, 400, 4);
    let dir = child_workdir("budget");
    let mut ports = Vec::new();
    for index in 0..3 {
        let scope = dir.join(format!("scope-{index}"));
        fs::create_dir_all(&scope).expect("创建 root 失败");
        fs::write(scope.join("index.html"), b"BUDGET").expect("写入失败");
        let server = ScopedContentServer::start(&scope).expect("启动失败");
        ports.push(
            server
                .origin()
                .strip_prefix("http://127.0.0.1:")
                .expect("origin 形态")
                .parse::<u16>()
                .expect("端口"),
        );
        drop(server);
    }
    let before = tombstone_supervisor_threads();
    let entombed = entomb_specific_ports(&ports);
    let e1 = child_assert(entombed == 3, "3 个已释放端口必须全部占用");
    // 一次 entomb 调用（N 个端口）只增加 1 个线程。
    let e2 = child_assert(
        tombstone_supervisor_threads() - before == 1,
        &format!(
            "全部墓碑必须共享 1 个 supervisor 线程（before {before}, after {}）",
            tombstone_supervisor_threads()
        ),
    );
    let authority = format!("127.0.0.1:{}", ports[0]);

    // 正常小请求 → 403。
    let deadline = std::time::Instant::now() + Duration::from_secs(10);
    let mut small_403 = false;
    while std::time::Instant::now() < deadline {
        if let Ok(mut stream) = std::net::TcpStream::connect(&authority) {
            let _ = stream.write_all(b"GET /index.html HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n");
            let mut raw = Vec::new();
            let _ = stream.read_to_end(&mut raw);
            if String::from_utf8_lossy(&raw).starts_with("HTTP/1.1 403") {
                small_403 = true;
                break;
            }
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    let e3 = child_assert(small_403, "墓碑必须对小请求回 403");

    // 读超限：发送 512 字节垃圾（> 256 上限）→ 连接被有界关闭（403 或 EOF），
    // 客户端 read_to_end 必须在期限内返回，不能无限挂起。
    let started = std::time::Instant::now();
    if let Ok(mut stream) = std::net::TcpStream::connect(&authority) {
        let garbage = vec![b'x'; 512];
        let _ = stream.write_all(&garbage);
        let mut raw = Vec::new();
        let _ = stream.read_to_end(&mut raw);
    }
    let e4 = child_assert(
        started.elapsed() < Duration::from_secs(3),
        "读超限连接必须被有界关闭",
    );

    // 期限：发送部分请求后挂起 → 400ms 期限后被关闭。
    let started = std::time::Instant::now();
    if let Ok(mut stream) = std::net::TcpStream::connect(&authority) {
        let _ = stream.write_all(b"GET /x HT");
        let mut raw = Vec::new();
        let _ = stream.read_to_end(&mut raw);
    }
    let e5 = child_assert(
        started.elapsed() < Duration::from_secs(3),
        "超期限挂起连接必须被有界关闭",
    );

    // 并发超限：4 个挂起连接占满槽后，新连接仍能拿到 403（服务持续）。
    let mut stalled = Vec::new();
    for _ in 0..4 {
        if let Ok(stream) = std::net::TcpStream::connect(&authority) {
            stalled.push(stream);
        }
    }
    let deadline = std::time::Instant::now() + Duration::from_secs(10);
    let mut recovered_403 = false;
    while std::time::Instant::now() < deadline {
        if let Ok(mut stream) = std::net::TcpStream::connect(&authority) {
            let _ = stream.write_all(b"GET /index.html HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n");
            let mut raw = Vec::new();
            let _ = stream.read_to_end(&mut raw);
            if String::from_utf8_lossy(&raw).starts_with("HTTP/1.1 403") {
                recovered_403 = true;
                break;
            }
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    let e6 = child_assert(recovered_403, "并发超限后服务必须持续可用（槽释放或超限关闭后 403）");
    drop(stalled);
    let errors: Vec<String> = [e1, e2, e3, e4, e5, e6].into_iter().flatten().collect();
    serde_json::json!({ "ok": errors.is_empty(), "error": errors.join("; ") })
}

/// R11-test 第四轮 · 子进程 A（真实生产写入链路）：首次 init（创建标记 +
/// 空登记）→ entomb → start（真实 persist 链路登记端口）→ drop → 退出。
/// 不做任何「父进程代写登记」的模拟 —— A 的身份只能由 A 自己的生产代码
/// 写入磁盘。
fn child_case_e2e_child_a() -> serde_json::Value {
    let registry_dir =
        PathBuf::from(std::env::var("PRC_REGISTRY_DIR").expect("PRC_REGISTRY_DIR 必须设置"));
    let scope = registry_dir.join("scope-a");
    fs::create_dir_all(&scope).expect("创建 root 失败");
    fs::write(scope.join("index.html"), b"SESSION-A").expect("写入失败");
    let registry = registry_dir.join("used-scoped-ports.json");

    // 首次启动：init 必须自己创建登记文件与初始化标记。
    init_used_port_registry(registry.clone()).expect("子进程 A：init 失败");
    let e1 = child_assert(registry.is_file(), "首次 init 必须创建登记文件");
    let e2 = child_assert(
        PathBuf::from(format!("{}.initialized", registry.display())).is_file(),
        "首次 init 必须创建初始化标记",
    );

    let _ = entomb_registered_ports();
    let server = ScopedContentServer::start(&scope).expect("子进程 A：start 失败");
    let port = server
        .origin()
        .strip_prefix("http://127.0.0.1:")
        .expect("origin 形态")
        .parse::<u16>()
        .expect("端口");
    let pid = std::process::id() as u64;
    drop(server); // 会话关闭；身份必须留在磁盘登记中
    let errors: Vec<String> = [e1, e2].into_iter().flatten().collect();
    serde_json::json!({
        "ok": errors.is_empty(),
        "error": errors.join("; "),
        "pid": pid,
        "port": port,
    })
}

/// R11-test 第四轮 · 子进程 B（全新地址空间）：从同一磁盘登记 init（A 的
/// 身份只能来自磁盘）→ start_on_port(A 端口) 必 Err → 墓碑下旧 URL 重放
/// 403 且不含任何会话内容 → 正常新会话 + root-relative 对照 200。
fn child_case_e2e_child_b() -> serde_json::Value {
    let registry_dir =
        PathBuf::from(std::env::var("PRC_REGISTRY_DIR").expect("PRC_REGISTRY_DIR 必须设置"));
    let historical_port: u16 = std::env::var("PRC_HISTORICAL_PORT")
        .expect("PRC_HISTORICAL_PORT 必须设置")
        .parse()
        .expect("历史端口");
    let registry = registry_dir.join("used-scoped-ports.json");
    let scope_b = registry_dir.join("scope-b");
    fs::create_dir_all(&scope_b).expect("创建 root 失败");
    fs::write(scope_b.join("index.html"), b"SESSION-B").expect("写入失败");

    init_used_port_registry(registry).expect("子进程 B：init 失败");

    // a.1/a.4：A 登记的端口即使此刻完全空闲，也必须被身份集拒绝。
    let e1 = child_assert(
        ScopedContentServer::start_on_port(&scope_b, historical_port).is_err(),
        "B 必须拒绝 A 登记的历史端口（身份从磁盘进入 B 的禁止集）",
    );

    // 墓碑 + 旧 URL 重放：403 且绝不含任何会话内容。
    let entombed = entomb_registered_ports();
    let e2 = child_assert(entombed >= 1, "A 的历史端口必须被墓碑占用");
    let (head_p, body_p) = http_get(
        &format!("http://127.0.0.1:{historical_port}"),
        "/index.html",
    );
    let e3 = child_assert(
        head_p.starts_with("HTTP/1.1 403")
            && !String::from_utf8_lossy(&body_p).contains("SESSION"),
        &format!("历史端口重放必须 403 且不含任何会话内容：{head_p}"),
    );

    // B 正常新会话 + root-relative 正常资源对照。
    let server_b = ScopedContentServer::start(&scope_b).expect("子进程 B：start 失败");
    let port_b = server_b
        .origin()
        .strip_prefix("http://127.0.0.1:")
        .expect("origin 形态")
        .parse::<u16>()
        .expect("端口");
    let (head_b, body_b) = http_get(server_b.origin(), "/index.html");
    let e4 = child_assert(
        status_code(&head_b) == 200 && String::from_utf8_lossy(&body_b).trim() == "SESSION-B",
        &format!("B root-relative 正常资源对照失败：{head_b}"),
    );
    let errors: Vec<String> = [e1, e2, e3, e4].into_iter().flatten().collect();
    serde_json::json!({
        "ok": errors.is_empty(),
        "error": errors.join("; "),
        "pid": std::process::id() as u64,
        "port": port_b,
    })
}

/// a.2 第四轮（Codex revision 11 探针场景）：已初始化登记文件被删除 →
/// 再 init 必 Err（不得当首次启动重建空表，否则 A 历史身份丢失）；start
/// fail closed；把登记文件按原内容放回后恢复，历史身份仍被拒绝 —— 恢复
/// 路线保留身份历史，不是删记录重来。
fn child_case_registry_loss() -> serde_json::Value {
    let dir = child_workdir("loss");
    let scope = dir.join("scope");
    fs::create_dir_all(&scope).expect("创建 root 失败");
    fs::write(scope.join("index.html"), b"LOSS").expect("写入失败");
    let registry = dir.join("used-scoped-ports.json");

    // 首次启动 + 真实登记一个端口（生产 persist 链路）。
    init_used_port_registry(registry.clone()).expect("首次 init 失败");
    let server = ScopedContentServer::start(&scope).expect("start 失败");
    let port = server
        .origin()
        .strip_prefix("http://127.0.0.1:")
        .expect("origin 形态")
        .parse::<u16>()
        .expect("端口");
    drop(server);
    let persisted = fs::read_to_string(&registry).expect("读登记文件失败");
    let e0 = child_assert(
        persisted.contains(&port.to_string()),
        "登记文件必须包含已发布 origin 的端口",
    );

    // Codex 探针：删除登记文件（初始化标记保留）。
    fs::remove_file(&registry).expect("删除登记文件失败");
    let e1 = child_assert(
        init_used_port_registry(registry.clone()).is_err(),
        "已初始化登记丢失必须 init Err（不得当首次启动重建空表）",
    );
    let e2 = child_assert(
        ScopedContentServer::start(&scope).is_err(),
        "登记丢失后 start 必须 fail closed",
    );

    // 恢复 = 按原内容放回（保留全部身份历史）→ init + start 成功，
    // 且历史身份仍然被拒绝。
    fs::write(&registry, &persisted).expect("恢复登记文件失败");
    init_used_port_registry(registry).expect("恢复后 init 失败");
    let e3 = child_assert(
        ScopedContentServer::start_on_port(&scope, port).is_err(),
        "恢复后历史身份仍必须被拒绝",
    );
    let e4 = match ScopedContentServer::start(&scope) {
        Ok(new_server) => {
            let new_port = new_server
                .origin()
                .strip_prefix("http://127.0.0.1:")
                .expect("origin 形态")
                .parse::<u16>()
                .expect("端口");
            child_assert(new_port != port, "恢复后的新会话不得落在历史端口上")
        }
        Err(error) => Some(format!("恢复后正常 start 失败：{error}")),
    };
    let errors: Vec<String> = [e0, e1, e2, e3, e4].into_iter().flatten().collect();
    serde_json::json!({ "ok": errors.is_empty(), "error": errors.join("; ") })
}

/// a.4（Codex 要求）：两个真实进程**并发** init + start + persist，登记
/// 文件必须同时保留两个已发布 origin 的端口（flock 串行 + union 合并，
/// 任一身份条目不得丢失）。
fn child_case_concurrent_registration() -> serde_json::Value {
    let registry_dir =
        PathBuf::from(std::env::var("PRC_REGISTRY_DIR").expect("PRC_REGISTRY_DIR 必须设置"));
    let tag = std::env::var("PRC_CHILD_CASE").unwrap_or_default();
    let scope = registry_dir.join(format!("scope-{tag}"));
    fs::create_dir_all(&scope).expect("创建 root 失败");
    fs::write(scope.join("index.html"), b"CONCURRENT").expect("写入失败");

    init_used_port_registry(registry_dir.join("used-scoped-ports.json"))
        .expect("并发 init 失败");
    let server = ScopedContentServer::start(&scope).expect("并发 start 失败");
    let port = server
        .origin()
        .strip_prefix("http://127.0.0.1:")
        .expect("origin 形态")
        .parse::<u16>()
        .expect("端口");
    let pid = std::process::id() as u64;
    drop(server);
    serde_json::json!({ "ok": true, "port": port, "pid": pid })
}

/// a.2 第四轮（容量耗尽语义）：满额（等于上限）init 合法；再登记任何新
/// 端口 = 永久 fail closed 且**错误文案不得引导删除登记记录**；超上限
/// init Err。
fn child_case_capacity_exhaustion() -> serde_json::Value {
    let dir = child_workdir("capacity");
    let scope = dir.join("scope");
    fs::create_dir_all(&scope).expect("创建 root 失败");
    fs::write(scope.join("index.html"), b"CAP").expect("写入失败");
    let registry = dir.join("used-scoped-ports.json");

    // 构造满额登记（MAX 条，端口段 40000..40000+MAX）+ 初始化标记。
    let base: u32 = 40000;
    let full: Vec<u16> = (0..MAX_REGISTRY_PORTS as u32)
        .map(|offset| (base + offset) as u16)
        .collect();
    fs::write(&registry, serde_json::to_string(&full).expect("序列化失败"))
        .expect("写满额登记失败");
    fs::write(format!("{}.initialized", registry.display()), b"")
        .expect("写初始化标记失败");

    init_used_port_registry(registry.clone()).expect("满额（等于上限）init 必须成功");

    // 选一个不在登记段内的空闲端口尝试发布新 origin → persist 满额 →
    // Err，origin 不发布。
    let upper = (base + MAX_REGISTRY_PORTS as u32) as u16;
    let free_port = loop {
        let probe = std::net::TcpListener::bind("127.0.0.1:0").expect("bind 失败");
        let port = probe.local_addr().expect("local_addr 失败").port();
        drop(probe);
        if port < base as u16 || port >= upper {
            break port;
        }
    };
    let start_result = ScopedContentServer::start_on_port(&scope, free_port);
    let e1 = child_assert(
        start_result.is_err(),
        "满额登记必须拒绝发布新 origin（fail closed）",
    );
    let e2 = match &start_result {
        Err(error) => {
            let text = error.to_string();
            let no_delete_guidance =
                !text.contains("归档") && !text.contains("移走") && !text.contains("手动删除");
            child_assert(
                no_delete_guidance,
                &format!("错误文案不得引导删除登记记录：{text}"),
            )
        }
        Ok(_) => Some("满额登记下意外成功发布 origin".to_string()),
    };

    // 超上限（MAX+1 条）→ init Err（fail closed）。
    let mut over = full.clone();
    over.push(59999);
    fs::write(&registry, serde_json::to_string(&over).expect("序列化失败"))
        .expect("写超限登记失败");
    let e3 = child_assert(
        init_used_port_registry(registry).is_err(),
        "超上限登记必须 init Err",
    );
    let errors: Vec<String> = [e1, e2, e3].into_iter().flatten().collect();
    serde_json::json!({ "ok": errors.is_empty(), "error": errors.join("; ") })
}

/// a.1（进程内确定性部分）：start_on_port 对本进程已用身份（含 Drop 后）
/// 一律拒绝；正常 start 不受影响。
#[test]
fn start_on_port_rejects_process_used_identity() {
    let fixture = fixture("start-on-port");
    let server = ScopedContentServer::start(&fixture.scope).expect("启动失败");
    let port = server
        .origin()
        .strip_prefix("http://127.0.0.1:")
        .expect("origin 形态")
        .parse::<u16>()
        .expect("端口");

    assert!(
        ScopedContentServer::start_on_port(&fixture.scope, port).is_err(),
        "存活端口的显式重绑必须被拒绝"
    );
    drop(server);
    assert!(
        ScopedContentServer::start_on_port(&fixture.scope, port).is_err(),
        "Drop 后端口已释放，但进程已用身份仍必须拒绝"
    );
    let other = ScopedContentServer::start(&fixture.scope).expect("新端口启动失败");
    assert_ne!(other.origin(), format!("http://127.0.0.1:{port}"));
}

/// a.1（子进程）：Codex 探针场景 —— 占用后释放仍被身份集拒绝。
#[test]
fn registered_port_rejected_after_external_release() {
    run_child_case_and_assert("identity-occupy-release");
}

/// a.2（子进程）：损坏登记 fail closed。
#[test]
fn corrupt_registry_fails_closed() {
    run_child_case_and_assert("failclosed-corrupt");
}

/// a.2（子进程）：登记写入失败 → origin 不发布 → 恢复后可用。
#[test]
fn registry_write_failure_blocks_origin_publication() {
    run_child_case_and_assert("failclosed-write");
}

/// a.3（子进程）：墓碑 supervisor 资源上界（1 线程 / 有界读写 / 服务持续）。
#[test]
fn tombstone_supervisor_resource_bounds() {
    run_child_case_and_assert("tombstone-budget");
}

/// 真两独立进程端到端（Codex revision 11 指认上一版为同子进程模拟，本版
/// 修正）：子进程 A 走真实生产链路 init + start + persist 后退出；子进程
/// B 从同一磁盘登记启动并拒绝 A 的端口；父进程断言 A/B PID 确实不同。
#[test]
fn cross_launch_two_independent_processes_e2e() {
    let out_dir = child_out_dir("e2e-r4");
    let registry_dir = out_dir.join("data-dir");
    fs::create_dir_all(&registry_dir).expect("创建共享 data-dir 失败");

    let result_a = spawn_child_case(
        "e2e-cross-launch-a",
        &out_dir,
        &[("PRC_REGISTRY_DIR", registry_dir.to_string_lossy().into_owned())],
    );
    assert_eq!(
        result_a["ok"], serde_json::json!(true),
        "子进程 A 断言失败：{result_a}"
    );

    let result_b = spawn_child_case(
        "e2e-cross-launch-b",
        &out_dir,
        &[
            ("PRC_REGISTRY_DIR", registry_dir.to_string_lossy().into_owned()),
            (
                "PRC_HISTORICAL_PORT",
                result_a["port"].to_string(),
            ),
        ],
    );
    assert_eq!(
        result_b["ok"], serde_json::json!(true),
        "子进程 B 断言失败：{result_b}"
    );

    let pid_a = result_a["pid"].as_u64().expect("子进程 A pid");
    let pid_b = result_b["pid"].as_u64().expect("子进程 B pid");
    assert_ne!(pid_a, pid_b, "A/B 必须是不同 OS 进程（真实重启）");
    assert_ne!(
        result_a["port"], result_b["port"],
        "B 新会话端口必须 ≠ A 历史端口"
    );
}

/// a.2（子进程）：已初始化登记丢失必须 fail closed，恢复路线保留身份历史。
#[test]
fn registry_loss_detected_fails_closed() {
    run_child_case_and_assert("registry-loss");
}

/// a.4（并发双进程）：两个真实进程并发登记，登记文件保留全部已发布
/// origin 的端口身份，任一条目不得丢失。
#[test]
fn concurrent_registration_two_processes_no_identity_loss() {
    let out_dir = child_out_dir("concurrent-r4");
    let registry_dir = out_dir.join("data-dir");
    fs::create_dir_all(&registry_dir).expect("创建共享 data-dir 失败");
    let env = [("PRC_REGISTRY_DIR", registry_dir.to_string_lossy().into_owned())];

    let (result_a, result_b) = std::thread::scope(|scope| {
        let handle_a = scope.spawn(|| spawn_child_case("concurrent-reg-a", &out_dir, &env));
        let handle_b = scope.spawn(|| spawn_child_case("concurrent-reg-b", &out_dir, &env));
        (handle_a.join().expect("线程 A"), handle_b.join().expect("线程 B"))
    });
    assert_eq!(
        result_a["ok"], serde_json::json!(true),
        "并发子进程 A 失败：{result_a}"
    );
    assert_eq!(
        result_b["ok"], serde_json::json!(true),
        "并发子进程 B 失败：{result_b}"
    );
    let port_a = result_a["port"].as_u64().expect("A 端口") as u16;
    let port_b = result_b["port"].as_u64().expect("B 端口") as u16;
    assert_ne!(port_a, port_b, "两进程必须各得独立端口");

    let registry = registry_dir.join("used-scoped-ports.json");
    let on_disk: Vec<u16> = serde_json::from_str(
        &fs::read_to_string(&registry).expect("读登记文件失败"),
    )
    .expect("登记文件必须是合法 JSON 数组");
    assert!(
        on_disk.contains(&port_a),
        "登记文件必须保留进程 A 已发布 origin 的端口（实际 {on_disk:?}）"
    );
    assert!(
        on_disk.contains(&port_b),
        "登记文件必须保留进程 B 已发布 origin 的端口（实际 {on_disk:?}）"
    );
}

/// a.2（子进程）：容量耗尽 = 永久 fail closed，错误文案不引导删除登记记录。
#[test]
fn registry_capacity_exhaustion_fails_closed() {
    run_child_case_and_assert("capacity-full");
}

/// a.4 第五轮（Codex revision 14 复核）· 子进程 B：真实生产认领链路登记
/// P（init → start → persist），随后 drop（端口释放、身份留在磁盘登记），
/// 进程退出 —— 模拟「另一实例已发布 origin 后退出」。
fn child_case_claim_conflict_b() -> serde_json::Value {
    let registry_dir =
        PathBuf::from(std::env::var("PRC_REGISTRY_DIR").expect("PRC_REGISTRY_DIR 必须设置"));
    let scope = registry_dir.join("scope-b");
    fs::create_dir_all(&scope).expect("创建 root 失败");
    fs::write(scope.join("index.html"), b"SESSION-B").expect("写入失败");

    init_used_port_registry(registry_dir.join("used-scoped-ports.json"))
        .expect("子进程 B：init 失败");
    let server = ScopedContentServer::start(&scope).expect("子进程 B：start 失败");
    let port = server
        .origin()
        .strip_prefix("http://127.0.0.1:")
        .expect("origin 形态")
        .parse::<u16>()
        .expect("端口");
    let pid = std::process::id() as u64;
    drop(server);
    serde_json::json!({ "ok": true, "port": port, "pid": pid })
}

/// a.4 第五轮 · 子进程 A（Codex 指定交错：A 已初始化 → B 登记 P 并退出 →
/// A 生产 start 的候选端口恰为 P）：生产 `start` 路径上 bind 成功拿到 P
/// （此刻空闲）后，锁内认领事务必须发现磁盘已含 P = **Conflict**，关闭重
/// 绑、预算内重选，绝不发布 P；B 的身份条目在 A 认领后仍完整保留。
/// 候选注入 seam 只改首迭代 bind 目标，bind → 认领 → 发布与生产同一代码路径。
fn child_case_claim_conflict_a() -> serde_json::Value {
    let registry_dir =
        PathBuf::from(std::env::var("PRC_REGISTRY_DIR").expect("PRC_REGISTRY_DIR 必须设置"));
    let peer_port: u16 = std::env::var("PRC_CONFLICT_PORT")
        .expect("PRC_CONFLICT_PORT 必须设置")
        .parse()
        .expect("对端端口");
    let registry = registry_dir.join("used-scoped-ports.json");
    let scope = registry_dir.join("scope-a");
    fs::create_dir_all(&scope).expect("创建 root 失败");
    fs::write(scope.join("index.html"), b"SESSION-A").expect("写入失败");

    init_used_port_registry(registry.clone()).expect("子进程 A：init 失败");
    // 不做 entomb：对端监听已随进程退出释放，候选 bind(P) 必须成功，
    // 让「锁内认领发现磁盘已含 P」成为唯一拒绝路径（OS 占用不参与）。

    // 生产 start + 候选注入：首迭代 bind 恰好拿到对端身份端口 P。
    set_start_candidate_port_override(Some(peer_port));
    let start_result = ScopedContentServer::start(&scope);
    let server = start_result.expect("子进程 A：start 必须在重选后成功");
    let port = server
        .origin()
        .strip_prefix("http://127.0.0.1:")
        .expect("origin 形态")
        .parse::<u16>()
        .expect("端口");
    let e1 = child_assert(
        port != peer_port,
        &format!("生产 start 绝不得发布对端已登记身份端口 {peer_port}（实际 {port}）"),
    );

    // 对端身份与本进程新身份在登记文件中共存（认领 = union 合并）。
    let on_disk: Vec<u16> = serde_json::from_str(
        &fs::read_to_string(&registry).expect("读登记文件失败"),
    )
    .expect("登记文件必须是合法 JSON 数组");
    let e2 = child_assert(
        on_disk.contains(&peer_port),
        &format!("B 已发布身份条目不得被 A 的认领覆盖丢失（实际 {on_disk:?}）"),
    );
    let e3 = child_assert(
        on_disk.contains(&port),
        &format!("A 的新身份必须已登记（实际 {on_disk:?}）"),
    );

    // 新会话正常服务（root-relative 对照）+ 对端旧 URL 403（墓碑）。
    let (head, body) = http_get(server.origin(), "/index.html");
    let e4 = child_assert(
        status_code(&head) == 200 && String::from_utf8_lossy(&body).trim() == "SESSION-A",
        &format!("A 新会话 root-relative 对照失败：{head}"),
    );
    // 对端旧 URL 重放：对端进程已退出（无监听、无墓碑）→ 连接拒绝。用裸
    // connect 断言（隔离合同不依赖应答服务存在；连接拒绝同样是隔离结果）。
    let e5 = child_assert(
        TcpStream::connect_timeout(
            &format!("127.0.0.1:{peer_port}").parse().expect("socket addr"),
            Duration::from_secs(2),
        )
        .is_err(),
        &format!("对端已退出端口 {peer_port} 重放必须连接失败（绝不映射到 A 的新会话）"),
    );
    let errors: Vec<String> = [e1, e2, e3, e4, e5].into_iter().flatten().collect();
    serde_json::json!({
        "ok": errors.is_empty(),
        "error": errors.join("; "),
        "port": port,
        "pid": std::process::id() as u64,
    })
}

/// a.4 第五轮（真双进程交错）：B 真实登记 P 并退出 → A 生产 start 的候选
/// 恰为 P → 锁内认领拒绝并重选，B 的身份条目不丢失。父进程断言两进程
/// PID 不同、发布端口不同 —— 「生产同一认领路径」的确定性证明。
#[test]
fn production_start_rejects_peer_registered_identity_in_lock() {
    let out_dir = child_out_dir("claim-conflict-r5");
    let registry_dir = out_dir.join("data-dir");
    fs::create_dir_all(&registry_dir).expect("创建共享 data-dir 失败");

    let result_b = spawn_child_case(
        "claim-conflict-b",
        &out_dir,
        &[("PRC_REGISTRY_DIR", registry_dir.to_string_lossy().into_owned())],
    );
    assert_eq!(
        result_b["ok"], serde_json::json!(true),
        "子进程 B 失败：{result_b}"
    );

    let result_a = spawn_child_case(
        "claim-conflict-a",
        &out_dir,
        &[
            ("PRC_REGISTRY_DIR", registry_dir.to_string_lossy().into_owned()),
            ("PRC_CONFLICT_PORT", result_b["port"].to_string()),
        ],
    );
    assert_eq!(
        result_a["ok"], serde_json::json!(true),
        "子进程 A 断言失败：{result_a}"
    );

    let pid_b = result_b["pid"].as_u64().expect("子进程 B pid");
    let pid_a = result_a["pid"].as_u64().expect("子进程 A pid");
    assert_ne!(pid_a, pid_b, "A/B 必须是不同 OS 进程");
    assert_ne!(
        result_a["port"], result_b["port"],
        "A 发布端口必须 ≠ B 已登记身份端口"
    );
}
