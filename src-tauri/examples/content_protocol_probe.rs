//! Real native WebView gate for the production content transport.
use nutbook_backend::core::content_resource::{self, ContentResource};
use tauri::Manager;
struct ProbeGrants(std::sync::Mutex<Vec<ContentResource>>);
#[tauri::command]
fn protocol_probe_report(app: tauri::AppHandle, report: serde_json::Value) {
    let path = std::env::var("NUTBOOK_PROTOCOL_PROBE_OUT").expect("probe output path");
    std::fs::write(path, serde_json::to_vec_pretty(&report).unwrap()).unwrap();
    app.exit(if report["ok"] == true { 0 } else { 1 });
}
#[tauri::command]
fn protocol_probe_revoke(app: tauri::AppHandle) {
    app.state::<ProbeGrants>().0.lock().unwrap().clear();
}
fn main() {
    #[cfg(unix)]
    unsafe {
        let mut limit: libc::rlimit = std::mem::zeroed();
        assert_eq!(libc::getrlimit(libc::RLIMIT_NOFILE, &mut limit), 0);
        limit.rlim_cur = 256.min(limit.rlim_max);
        assert_eq!(libc::setrlimit(libc::RLIMIT_NOFILE, &limit), 0);
    }
    let fixture =
        std::env::temp_dir().join(format!("nutbook-protocol-gate-{}", std::process::id()));
    std::fs::create_dir_all(&fixture).unwrap();
    for (name,body) in [
        ("index.html",include_str!("content_protocol_probe.html")),
        ("module.js","window.probeModule=true;"),
        ("data.json","{\"canary\":\"A\"}"),
        ("style.css","body { --probe-css: ready; }"),
        ("image.svg","<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\"><rect width=\"10\" height=\"10\"/></svg>"),
    ] { std::fs::write(fixture.join(name),body).unwrap(); }
    // Session churn must not consume ports, FDs or persistent identities.
    let fd_before = std::fs::read_dir("/dev/fd")
        .map(|entries| entries.count())
        .unwrap_or(0);
    for _ in 0..10_000 {
        drop(ContentResource::start(&fixture).unwrap());
    }
    let fd_after = std::fs::read_dir("/dev/fd")
        .map(|entries| entries.count())
        .unwrap_or(0);
    assert!(
        fd_after <= fd_before + 2,
        "closed grants leaked file descriptors"
    );
    let primary = ContentResource::start(&fixture).unwrap();
    let foreign = ContentResource::start(&fixture).unwrap();
    let url = primary
        .relative_url(std::path::Path::new("index.html"))
        .unwrap();
    let other = foreign
        .relative_url(std::path::Path::new("data.json"))
        .unwrap();
    primary.allow_surface("protocol-probe");
    let mut context = tauri::generate_context!();
    context.config_mut().identifier = "com.hayley.nutbook.protocolprobe".into();
    context.config_mut().app.windows.clear();
    tauri::Builder::default()
        .manage(ProbeGrants(std::sync::Mutex::new(vec![primary, foreign])))
        .invoke_handler(tauri::generate_handler![
            protocol_probe_report,
            protocol_probe_revoke
        ])
        .register_asynchronous_uri_scheme_protocol(
            content_resource::SCHEME,
            |ctx, request, responder| {
                content_resource::dispatch(ctx.webview_label().to_owned(), request, responder);
            },
        )
        .setup(move |app| {
            tauri::WebviewWindowBuilder::new(
                app,
                "protocol-probe",
                tauri::WebviewUrl::External(url.parse().unwrap()),
            )
            .initialization_script(format!(
                "window.probeOther={};window.probeOld={};window.probeFd={{before:{fd_before},after:{fd_after},sessions:10000}};",
                serde_json::to_string(&other).unwrap(),
                serde_json::to_string(&std::env::var("NUTBOOK_PROTOCOL_PROBE_OLD_URL").unwrap_or_default()).unwrap()
            ))
            .title("Nutbook resource protocol compatibility gate")
            .build()?;
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(20));
                handle.exit(2);
            });
            Ok(())
        })
        .run(context)
        .expect("probe runtime");
    let _ = std::fs::remove_dir_all(fixture);
}
