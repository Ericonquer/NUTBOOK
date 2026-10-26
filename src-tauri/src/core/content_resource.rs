//! Revocable native resource capabilities. No sockets or persistent history.
//! A random authority identifies a live grant; the native WebView label must
//! also be authorized. Root-relative URLs keep their original meaning.
use crate::errors::AppError;
use std::{
    collections::{HashMap, HashSet},
    path::{Component, Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicUsize, Ordering},
        Arc, Mutex, OnceLock, Weak,
    },
};
use tauri::http::{Request, Response};

pub const SCHEME: &str = "nutbook-content";
const MAX_LIVE_GRANTS: usize = 256;
const MAX_READERS: usize = 8;
static READERS: AtomicUsize = AtomicUsize::new(0);
static GRANTS: OnceLock<Mutex<HashMap<String, Weak<Grant>>>> = OnceLock::new();
fn grants() -> &'static Mutex<HashMap<String, Weak<Grant>>> {
    GRANTS.get_or_init(Default::default)
}
#[derive(Debug)]
struct Grant {
    id: String,
    root: PathBuf,
    revoked: AtomicBool,
    surfaces: Mutex<HashSet<String>>,
}
#[derive(Debug)]
pub struct ContentResource {
    grant: Arc<Grant>,
    origin: String,
}

impl ContentResource {
    pub fn start(root: &Path) -> Result<Self, AppError> {
        let root = root.canonicalize().map_err(|_| AppError::IoError)?;
        if !root.is_dir() {
            return Err(AppError::InvalidParams);
        }
        let mut entries = grants().lock().map_err(|_| AppError::InternalError)?;
        entries.retain(|_, grant| grant.strong_count() > 0);
        if entries.len() >= MAX_LIVE_GRANTS {
            return Err(AppError::ContentResourceUnavailable("Too many active document resource sessions; close unused document tabs or history previews and retry.".into()));
        }
        let id = uuid::Uuid::new_v4().simple().to_string();
        let grant = Arc::new(Grant {
            id: id.clone(),
            root,
            revoked: AtomicBool::new(false),
            surfaces: Mutex::new(HashSet::from(["main".into()])),
        });
        entries.insert(id.clone(), Arc::downgrade(&grant));
        Ok(Self {
            grant,
            origin: browser_origin(&id),
        })
    }
    pub fn revoke(&self) {
        self.grant.revoked.store(true, Ordering::SeqCst);
        if let Ok(mut entries) = grants().lock() {
            entries.remove(&self.grant.id);
        }
    }
    pub fn canonical_root(&self) -> &Path {
        &self.grant.root
    }
    pub fn origin(&self) -> &str {
        &self.origin
    }
    pub fn resource_base(&self) -> String {
        self.origin.clone()
    }
    pub fn allow_surface(&self, label: &str) {
        self.grant.surfaces.lock().unwrap().insert(label.into());
    }
    pub fn relative_url(&self, relative: &Path) -> Option<String> {
        let mut encoded = String::new();
        for component in relative.components() {
            let Component::Normal(segment) = component else {
                return None;
            };
            encoded.push('/');
            encoded.push_str(&super::scoped_content_server::percent_encode(
                segment.to_str()?,
            ));
        }
        if encoded.is_empty() {
            return None;
        }
        Some(format!("{}{encoded}", self.origin))
    }
}
impl Drop for ContentResource {
    fn drop(&mut self) {
        self.revoke();
    }
}

fn browser_origin(id: &str) -> String {
    if cfg!(any(target_os = "windows", target_os = "android")) {
        format!("http://{SCHEME}.{id}.localhost")
    } else {
        format!("{SCHEME}://{id}.localhost")
    }
}
fn id_from_url(url: &str) -> Option<String> {
    let url = url::Url::parse(url).ok()?;
    if url.port().is_some() || !url.username().is_empty() || url.password().is_some() {
        return None;
    }
    let host = url.host_str()?;
    let id = if url.scheme() == SCHEME {
        host.strip_suffix(".localhost")?
    } else if url.scheme() == "http" {
        host.strip_prefix("nutbook-content.")?
            .strip_suffix(".localhost")?
    } else {
        return None;
    };
    if id.len() != 32
        || !id
            .bytes()
            .all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
    {
        return None;
    }
    Some(id.into())
}
pub fn is_resource_url(url: &str) -> bool {
    id_from_url(url).is_some()
}
fn lookup(url: &str) -> Option<Arc<Grant>> {
    let id = id_from_url(url)?;
    grants().lock().ok()?.get(&id)?.upgrade()
}
/// Called only by native surface constructors, before initial navigation.
pub fn bind_surface(url: &str, label: &str) -> Result<(), AppError> {
    let Some(grant) = lookup(url) else {
        return Err(AppError::InvalidSession);
    };
    if grant.revoked.load(Ordering::SeqCst) {
        return Err(AppError::InvalidSession);
    }
    grant
        .surfaces
        .lock()
        .map_err(|_| AppError::InternalError)?
        .insert(label.into());
    Ok(())
}
/// Popups inherit only their native opener's grants; a guessed foreign URL
/// never grants access to another document.
pub fn bind_popup(url: &str, opener: &str, popup: &str) -> bool {
    let Some(grant) = lookup(url) else {
        return false;
    };
    if !grant.surfaces.lock().unwrap().contains(opener) {
        return false;
    }
    if let Ok(entries) = grants().lock() {
        for grant in entries.values().filter_map(Weak::upgrade) {
            let mut surfaces = grant.surfaces.lock().unwrap();
            if surfaces.contains(opener) {
                surfaces.insert(popup.into());
            }
        }
    }
    true
}
pub fn unbind_surface(label: &str) {
    // Stable item surface labels are reused when a live tab's native surface
    // is destroyed/recreated. Their grants end with the logical session, not
    // on tab switches. Popup labels are unique and must be removed on close.
    if !label.starts_with("html-runtime-popup-") {
        return;
    }
    if let Ok(entries) = grants().lock() {
        for grant in entries.values().filter_map(Weak::upgrade) {
            if let Ok(mut surfaces) = grant.surfaces.lock() {
                surfaces.remove(label);
            }
        }
    }
}
fn denied(status: u16) -> Response<Vec<u8>> {
    Response::builder()
        .status(status)
        .header("Cache-Control", "no-store")
        .header("Content-Type", "text/plain")
        .body(b"resource unavailable".to_vec())
        .unwrap()
}
struct Reader;
impl Drop for Reader {
    fn drop(&mut self) {
        READERS.fetch_sub(1, Ordering::SeqCst);
    }
}
/// Native request identity is independent of untrusted HTTP headers. At most
/// eight concurrent reads across all documents; no unbounded worker queue.
pub fn serve(label: &str, request: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let Some(grant) = lookup(&request.uri().to_string()) else {
        return denied(403);
    };
    if grant.revoked.load(Ordering::SeqCst) || !grant.surfaces.lock().unwrap().contains(label) {
        return denied(403);
    }
    if request.headers().contains_key("service-worker") {
        return denied(403);
    }
    if !matches!(request.method().as_str(), "GET" | "HEAD") {
        return denied(405);
    }
    if READERS
        .fetch_update(Ordering::SeqCst, Ordering::SeqCst, |n| {
            (n < MAX_READERS).then_some(n + 1)
        })
        .is_err()
    {
        return denied(503);
    }
    let _reader = Reader;
    let response = super::scoped_content_server::resource_response(
        &grant.root,
        request
            .uri()
            .path_and_query()
            .map(|p| p.as_str())
            .unwrap_or("/"),
        request.method() == "HEAD",
    );
    if grant.revoked.load(Ordering::SeqCst) {
        denied(403)
    } else {
        response
    }
}

/// Single bounded IO worker for all native protocol requests. The WebView
/// callback returns immediately; overload is an explicit retryable 503.
pub fn dispatch(label: String, request: Request<Vec<u8>>, responder: tauri::UriSchemeResponder) {
    type Job = (String, Request<Vec<u8>>, tauri::UriSchemeResponder);
    static QUEUE: OnceLock<Result<std::sync::mpsc::SyncSender<Job>, ()>> = OnceLock::new();
    let queue = QUEUE.get_or_init(|| {
        let (tx, rx) = std::sync::mpsc::sync_channel::<Job>(8);
        std::thread::Builder::new()
            .name("content-resource-io".into())
            .spawn(move || {
                while let Ok((label, request, responder)) = rx.recv() {
                    responder.respond(serve(&label, request));
                }
            })
            .map(|_| tx)
            .map_err(|_| ())
    });
    match queue {
        Ok(tx) => {
            if let Err(error) = tx.try_send((label, request, responder)) {
                let (std::sync::mpsc::TrySendError::Full(job)
                | std::sync::mpsc::TrySendError::Disconnected(job)) = error;
                job.2.respond(denied(503));
            }
        }
        Err(()) => responder.respond(denied(503)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn get(label: &str, url: &str) -> Response<Vec<u8>> {
        serve(label, Request::builder().uri(url).body(Vec::new()).unwrap())
    }
    #[test]
    fn session_grants_revoke_and_isolate_native_surfaces() {
        let a = tempfile::tempdir().unwrap();
        let b = tempfile::tempdir().unwrap();
        std::fs::write(a.path().join("canary.txt"), b"A").unwrap();
        std::fs::write(b.path().join("canary.txt"), b"B").unwrap();
        let ra = ContentResource::start(a.path()).unwrap();
        let rb = ContentResource::start(b.path()).unwrap();
        let ua = ra.relative_url(Path::new("canary.txt")).unwrap();
        let ub = rb.relative_url(Path::new("canary.txt")).unwrap();
        ra.allow_surface("surface-a");
        rb.allow_surface("surface-b");
        assert_eq!(get("surface-a", &ua).body(), b"A");
        assert_eq!(get("surface-a", &ub).status(), 403);
        assert!(!bind_popup(&ub, "surface-a", "popup"));
        assert!(bind_popup(&ua, "surface-a", "popup"));
        assert_eq!(get("popup", &ua).status(), 200);
        assert_eq!(get("popup", &ub).status(), 403);
        drop(ra);
        assert_eq!(get("surface-a", &ua).status(), 403);
        let replacement = ContentResource::start(b.path()).unwrap();
        replacement.allow_surface("surface-a");
        assert_eq!(get("surface-a", &ua).status(), 403);
        assert_ne!(replacement.origin(), rb.origin());
    }
    #[test]
    fn resource_paths_methods_and_worker_registration_are_restricted() {
        let root = tempfile::tempdir().unwrap();
        std::fs::write(root.path().join("data.json"), b"{}").unwrap();
        let resource = ContentResource::start(root.path()).unwrap();
        let url = resource.relative_url(Path::new("data.json")).unwrap();
        assert_eq!(get("unregistered", &url).status(), 403);
        for suffix in [
            "/%2e%2e/data.json",
            "/%2f..%2fdata.json",
            "/%5cdata.json",
            "/",
        ] {
            assert_eq!(
                get("main", &format!("{}{suffix}", resource.origin())).status(),
                403
            );
        }
        let head = serve(
            "main",
            Request::builder()
                .method("HEAD")
                .uri(&url)
                .body(vec![])
                .unwrap(),
        );
        assert_eq!(head.headers()["Content-Length"], "2");
        assert!(head.body().is_empty());
        assert_eq!(
            serve(
                "main",
                Request::builder()
                    .method("POST")
                    .uri(&url)
                    .body(vec![])
                    .unwrap()
            )
            .status(),
            405
        );
        assert_eq!(
            serve(
                "main",
                Request::builder()
                    .uri(&url)
                    .header("Service-Worker", "script")
                    .body(vec![])
                    .unwrap()
            )
            .status(),
            403
        );
        assert_eq!(
            id_from_url("http://nutbook-content.0123456789abcdef0123456789abcdef.localhost/a")
                .as_deref(),
            Some("0123456789abcdef0123456789abcdef")
        );
        assert!(id_from_url("http://nutbook-content.evil.localhost/a").is_none());
        assert!(resource.relative_url(Path::new("../secret")).is_none());
    }
    #[test]
    fn ten_thousand_closed_sessions_do_not_keep_history() {
        let root = tempfile::tempdir().unwrap();
        std::fs::write(root.path().join("alive.txt"), b"alive").unwrap();
        let first = ContentResource::start(root.path()).unwrap();
        let old = first.relative_url(Path::new("alive.txt")).unwrap();
        drop(first);
        for _ in 0..10_000 {
            let grant = ContentResource::start(root.path()).unwrap();
            assert!(lookup(grant.origin()).is_some());
            drop(grant);
        }
        assert_eq!(get("main", &old).status(), 403);
        assert!(!root.path().join("used-scoped-ports.json").exists());
        let db = rusqlite::Connection::open(root.path().join("still-works.sqlite3")).unwrap();
        db.execute_batch("CREATE TABLE canary(id INTEGER)").unwrap();
    }
}
