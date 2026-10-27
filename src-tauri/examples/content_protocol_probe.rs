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
fn resource_count() -> usize {
    #[cfg(windows)]
    unsafe {
        use windows_sys::Win32::System::Threading::{GetCurrentProcess, GetProcessHandleCount};
        let mut count = 0;
        assert_ne!(GetProcessHandleCount(GetCurrentProcess(), &mut count), 0);
        count as usize
    }
    #[cfg(not(windows))]
    { std::fs::read_dir("/dev/fd").expect("native descriptor counter").count() }
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
        ("frame.html", "<!doctype html><img id='image' src='image.svg'><script>addEventListener('load',()=>parent.postMessage({mappingProbe:location.hash.slice(1),width:document.querySelector('img').naturalWidth},'*'))</script>"),
        ("image.svg","<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\"><rect width=\"10\" height=\"10\"/></svg>"),
    ] { std::fs::write(fixture.join(name),body).unwrap(); }
    // Session churn must not consume ports, FDs or persistent identities.
    let fd_before = resource_count();
    for _ in 0..10_000 {
        drop(ContentResource::start(&fixture).unwrap());
    }
    let fd_after = resource_count();
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
        .on_page_load(|webview, payload| {
            #[cfg(windows)]
            if webview.label() == "protocol-probe" && payload.event() == tauri::webview::PageLoadEvent::Finished {
                use windows_core::{HSTRING, Interface};
                use webview2_com::Microsoft::Web::WebView2::Win32::{ICoreWebView2_3, COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_ALLOW, COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_DENY_CORS};
                let webview = webview.clone();
                std::thread::spawn(move || {
                    let trace = |phase: &str| {
                        if let Ok(output) = std::env::var("NUTBOOK_PROTOCOL_PROBE_OUT") {
                            use std::io::Write;
                            if let Ok(mut file) = std::fs::OpenOptions::new().append(true).create(true).open(format!("{output}.mapping")) { let _ = writeln!(file,"{phase}"); }
                        }
                    };
                    trace("native-mapping-dispatch");
                    let (send, receive) = std::sync::mpsc::sync_channel(1);
                    webview.with_webview(move |platform| unsafe {
                        let native = platform.controller().CoreWebView2().unwrap().cast::<ICoreWebView2_3>().unwrap();
                        let folder = std::env::temp_dir().join(format!("nutbook-protocol-gate-{}", std::process::id()));
                        for (kind, mode) in [("deny", COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_DENY_CORS), ("allow", COREWEBVIEW2_HOST_RESOURCE_ACCESS_KIND_ALLOW)] {
                            native.SetVirtualHostNameToFolderMapping(&HSTRING::from(format!("nb-map-{kind}-{}.invalid",std::process::id())), &HSTRING::from(folder.to_str().unwrap()), mode).unwrap();
                        }
                        let _ = send.send(());
                    }).unwrap();
                    receive.recv_timeout(std::time::Duration::from_secs(3)).unwrap();
                    trace("native-mapping-ready");
                    webview.eval("window.__mappingReadyResolve?.();").unwrap();
                    trace("browser-mapping-test-released");
                });
            }
            #[cfg(not(windows))]
            let _ = (webview, payload);
        })
        .setup(move |app| {
            tauri::WebviewWindowBuilder::new(
                app,
                "protocol-probe",
                tauri::WebviewUrl::External(url.parse().unwrap()),
            )
            .initialization_script(format!(
                "window.probeOther={};window.probeOld={};window.probeFd={{metric:{},before:{fd_before},after:{fd_after},sessions:10000}};",
                serde_json::to_string(&other).unwrap(),
                serde_json::to_string(&std::env::var("NUTBOOK_PROTOCOL_PROBE_OLD_URL").unwrap_or_default()).unwrap(),
                serde_json::to_string(if cfg!(windows) { "process-handles" } else { "file-descriptors" }).unwrap()
            ))
            .initialization_script(format!("window.probeMappingOrigins={};window.probeMappingReady=new Promise(resolve=>window.__mappingReadyResolve=resolve);", if cfg!(windows) {serde_json::json!([format!("http://nb-map-deny-{}.invalid",std::process::id()),format!("http://nb-map-allow-{}.invalid",std::process::id())]).to_string()} else {"null".into()}))
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
