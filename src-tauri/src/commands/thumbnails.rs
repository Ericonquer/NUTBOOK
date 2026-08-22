use crate::{
    core::thumbnail::thumbnail_backend_status,
    db::repositories::ThumbnailRepository,
    errors::AppError,
    models::{GenerateThumbnailResponse, ThumbnailBackendStatusPayload, ThumbnailInfo},
    state::AppState,
};

#[tauri::command]
pub async fn generate_thumbnail(
    state: tauri::State<'_, AppState>,
    item_id: i64,
) -> Result<GenerateThumbnailResponse, AppError> {
    let database = state.database.clone();
    tauri::async_runtime::spawn_blocking(move || database.generate_thumbnail(item_id))
        .await
        .map_err(|_| AppError::InternalError)?
}

#[tauri::command]
pub fn get_thumbnail_backend_status(
    state: tauri::State<'_, AppState>,
) -> Result<ThumbnailBackendStatusPayload, AppError> {
    let status = thumbnail_backend_status();
    Ok(ThumbnailBackendStatusPayload {
        screenshot_available: status.screenshot_available,
        chromium_path: status
            .chromium_path
            .map(|path| path.to_string_lossy().to_string()),
        system_chrome_available: status.system_chrome_available,
        system_chrome_path: status
            .system_chrome_path
            .map(|path| path.to_string_lossy().to_string()),
        system_chrome_enabled: state.system_chrome_thumbnails_enabled(),
        fallback_backend: status.fallback_backend.to_string(),
    })
}

#[tauri::command]
pub fn set_system_chrome_thumbnail_enabled(
    state: tauri::State<'_, AppState>,
    enabled: bool,
) -> Result<ThumbnailBackendStatusPayload, AppError> {
    state.set_system_chrome_thumbnails_enabled(enabled)?;
    get_thumbnail_backend_status(state)
}

#[allow(dead_code)]
fn _retain_thumbnail_info(_thumbnail: ThumbnailInfo) {}

#[cfg(test)]
mod tests {
    use crate::{
        core::{
            document::{content_hash, file_modified_at_string},
            thumbnail::{
                html_desired_key, markdown_default_cover_key, ChromiumScreenshotInput,
                GeneratedThumbnailAsset, ThumbnailCaptureAdapter, HTML_SCREENSHOT_HEIGHT,
                HTML_SCREENSHOT_WIDTH, RENDER_KIND_HTML_SCREENSHOT,
                RENDER_KIND_MARKDOWN_DEFAULT_COVER, RENDER_KIND_PLACEHOLDER,
            },
        },
        db::{
            repositories::{ItemRepository, LibraryRepository, ThumbnailRepository},
            Database, ReconciliationMarker, RECONCILIATION_MARKER_VERSION,
        },
        errors::AppError,
        models::{CommitHtmlEditResponse, IndexedItemRecord, Library, ListItemsQuery},
    };
    use rusqlite::{params, Connection};
    use std::{
        collections::{BTreeMap, VecDeque},
        fs,
        path::{Path, PathBuf},
        sync::{atomic::{AtomicBool, Ordering}, mpsc, Arc, Mutex},
        time::Duration,
    };

    static THUMBNAIL_ENV_LOCK: Mutex<()> = Mutex::new(());

    // 全局 GENERATION_*_HOOK 槽被多个测试共享：并行时一个测试设置的 hook 会被
    // 另一个测试的 generate_thumbnail_with_adapter 流程触发（hook 闭包固定操作
    // 各自测试的数据库，导致对方 generation/断言错乱）。持有该 guard 的测试
    // 独占 hook 槽，配合 db::THUMBNAIL_HOOKS_ACTIVE 线程标记，非 hook 测试的
    // generate 调用永不触发任何 hook。必须覆盖 spawn/join 全程。
    static HOOK_TEST_GUARD: Mutex<()> = Mutex::new(());

    fn temp_dir() -> PathBuf {
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("nutbook-b1-{nanos}"));
        fs::create_dir_all(&dir).expect("temp dir");
        dir
    }

    fn library(id: i64, name: &str, root: &str, source_kind: &str) -> Library {
        Library {
            id,
            name: name.to_string(),
            root_path: root.to_string(),
            source_kind: source_kind.to_string(),
            path_state: "valid".to_string(),
            is_active: true,
            created_at: "now".to_string(),
            updated_at: "now".to_string(),
            last_scanned_at: None,
            skill_binding: None,
        }
    }

    /// 建一个 folder library + 真实 HTML 源文件的 item（file_hash 初始为 NULL，模拟扫描结果）。
    fn setup_html_item() -> (Database, PathBuf, PathBuf) {
        let dir = temp_dir();
        let db_path = dir.join("nutbook.sqlite3");
        let source = dir.join("card.html");
        fs::write(&source, "<main>REVISION A</main>").expect("source html");
        let database = Database::new(&db_path).expect("db");
        database
            .upsert_library(library(1, "B1", dir.to_string_lossy().as_ref(), "folder"))
            .expect("library");
        database
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: source.to_string_lossy().to_string(),
                    relative_path: "card.html".to_string(),
                    file_name: "card.html".to_string(),
                    file_ext: "html".to_string(),
                    file_type: "html".to_string(),
                    file_size: fs::metadata(&source).expect("metadata").len() as i64,
                    modified_at: "1".to_string(),
                    created_at: "now".to_string(),
                    updated_at: "now".to_string(),
                }],
            )
            .expect("item");
        (database, source, db_path)
    }

    /// 建一个 folder library + 真实 Markdown 源文件的 item。
    fn setup_markdown_item() -> (Database, PathBuf, PathBuf) {
        let dir = temp_dir();
        let db_path = dir.join("nutbook.sqlite3");
        let source = dir.join("a.md");
        fs::write(&source, "# Hero Doc\n\nBody").expect("source markdown");
        let database = Database::new(&db_path).expect("db");
        database
            .upsert_library(library(1, "B1", dir.to_string_lossy().as_ref(), "folder"))
            .expect("library");
        database
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: source.to_string_lossy().to_string(),
                    relative_path: "a.md".to_string(),
                    file_name: "a.md".to_string(),
                    file_ext: "md".to_string(),
                    file_type: "markdown".to_string(),
                    file_size: fs::metadata(&source).expect("metadata").len() as i64,
                    modified_at: "1".to_string(),
                    created_at: "now".to_string(),
                    updated_at: "now".to_string(),
                }],
            )
            .expect("item");
        (database, source, db_path)
    }

    /// 用真实 fixture 文件建 item：文件本身不复制、不删除，DB 放在独立临时目录，
    /// 返回 (database, source_path, db_path) 供清理临时目录。
    fn setup_markdown_item_from(source_path: &Path, file_name: &str) -> (Database, PathBuf, PathBuf) {
        let dir = temp_dir();
        let db_path = dir.join("nutbook.sqlite3");
        let database = Database::new(&db_path).expect("db");
        database
            .upsert_library(library(1, "B1", dir.to_string_lossy().as_ref(), "folder"))
            .expect("library");
        database
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: source_path.to_string_lossy().to_string(),
                    relative_path: file_name.to_string(),
                    file_name: file_name.to_string(),
                    file_ext: "md".to_string(),
                    file_type: "markdown".to_string(),
                    file_size: fs::metadata(source_path).expect("metadata").len() as i64,
                    modified_at: "1".to_string(),
                    created_at: "now".to_string(),
                    updated_at: "now".to_string(),
                }],
            )
            .expect("item");
        (database, source_path.to_path_buf(), db_path)
    }

    /// 立即返回预设结果的 stub adapter。
    struct StubCaptureAdapter {
        response: Result<GeneratedThumbnailAsset, String>,
    }

    impl ThumbnailCaptureAdapter for StubCaptureAdapter {
        fn capture(
            &self,
            _input: &ChromiumScreenshotInput,
        ) -> Result<GeneratedThumbnailAsset, String> {
            self.response.clone()
        }
    }

    fn sample_png(payload: &[u8]) -> GeneratedThumbnailAsset {
        let mut bytes = b"\x89PNG\r\n\x1a\n".to_vec();
        bytes.extend_from_slice(payload);
        GeneratedThumbnailAsset {
            backend: "test-png",
            content_type: "image/png",
            file_extension: "png",
            bytes,
            svg: String::new(),
            width: HTML_SCREENSHOT_WIDTH,
            height: HTML_SCREENSHOT_HEIGHT,
        }
    }

    /// 串行化 NUTBOOK_CHROME_PATH 环境依赖；fake chromium 指向真实存在的文件，
    /// 使 Auto 后端确定性地走注入 adapter（adapter 本身不会执行该文件）。
    fn with_fake_chromium_env<T>(f: impl FnOnce() -> T) -> T {
        let _guard = THUMBNAIL_ENV_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let fake = std::env::temp_dir().join(format!(
            "nutbook-b1-fake-chromium-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("time")
                .as_nanos()
        ));
        fs::write(&fake, b"not a real browser; the adapter never executes it")
            .expect("fake chromium");
        std::env::set_var("NUTBOOK_CHROME_PATH", &fake);
        let result = f();
        std::env::remove_var("NUTBOOK_CHROME_PATH");
        let _ = fs::remove_file(&fake);
        result
    }

    /// 可控时序 adapter：每次 capture 注册一个独立 release 槽位，
    /// 测试按调用顺序精确决定哪一次 capture 何时完成、返回什么。
    #[derive(Clone)]
    struct SequencedCaptureAdapter {
        slots: Arc<Mutex<VecDeque<mpsc::Sender<Result<GeneratedThumbnailAsset, String>>>>>,
        captured: Arc<Mutex<Vec<ChromiumScreenshotInput>>>,
    }

    struct SequencedCaptureControl {
        slots: Arc<Mutex<VecDeque<mpsc::Sender<Result<GeneratedThumbnailAsset, String>>>>>,
        captured: Arc<Mutex<Vec<ChromiumScreenshotInput>>>,
    }

    impl SequencedCaptureAdapter {
        fn new() -> (Self, SequencedCaptureControl) {
            let slots = Arc::new(Mutex::new(VecDeque::new()));
            let captured = Arc::new(Mutex::new(Vec::new()));
            (
                Self {
                    slots: slots.clone(),
                    captured: captured.clone(),
                },
                SequencedCaptureControl { slots, captured },
            )
        }
    }

    impl ThumbnailCaptureAdapter for SequencedCaptureAdapter {
        fn capture(
            &self,
            input: &ChromiumScreenshotInput,
        ) -> Result<GeneratedThumbnailAsset, String> {
            self.captured.lock().unwrap().push(input.clone());
            let (tx, rx) = mpsc::channel();
            self.slots.lock().unwrap().push_back(tx);
            rx.recv()
                .map_err(|_| "capture released without a response".to_string())?
        }
    }

    impl SequencedCaptureControl {
        /// 完成第 index 次 capture（0-based，按调用顺序），携带指定响应。
        fn release_with(&self, index: usize, response: Result<GeneratedThumbnailAsset, String>) {
            let sender = self
                .slots
                .lock()
                .unwrap()
                .remove(index)
                .expect("capture slot exists");
            let _ = sender.send(response);
        }

        fn captured_count(&self) -> usize {
            self.captured.lock().unwrap().len()
        }

        fn wait_until(&self, predicate: impl Fn() -> bool) {
            let deadline = std::time::Instant::now() + Duration::from_secs(15);
            while !predicate() {
                if std::time::Instant::now() > deadline {
                    panic!("timed out waiting for capture to register");
                }
                std::thread::sleep(Duration::from_millis(10));
            }
        }
    }

    #[test]
    fn generate_thumbnail_commits_generation_keyed_file_for_html() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            let response = database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"HTML-PAYLOAD")),
                })
                .expect("thumbnail should generate");
            assert_eq!(response.thumbnail.status, "ready");
            let thumb_path = response.thumbnail.path.expect("path should exist");
            let thumb_path_buf = PathBuf::from(&thumb_path);
            assert!(
                thumb_path_buf.is_absolute(),
                "thumb_path must be absolute, got: {thumb_path}"
            );
            assert!(
                thumb_path_buf.ends_with(".cache/thumbnails/item-1.1.png"),
                "generation-keyed path expected, got: {thumb_path}"
            );
            assert!(thumb_path_buf.exists(), "cache file must exist on disk");

            let detail = database.get_item_detail(1).expect("detail");
            assert_eq!(
                detail
                    .summary
                    .thumbnail
                    .as_ref()
                    .and_then(|thumbnail| thumbnail.path.as_deref()),
                Some(thumb_path.as_str())
            );
            // list_items 不得序列化 base64 data URI
            let listed = database
                .list_items(&ListItemsQuery::default())
                .expect("list");
            let serialized = serde_json::to_string(&listed).expect("serialize");
            assert!(
                !serialized.contains("data:image/"),
                "list_items must not serialize base64 data URIs"
            );

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    #[test]
    fn generate_markdown_default_cover_commits_generation_keyed_svg_without_engine() {
        // B4：Markdown 封面由 Rust 直接生成确定性静态 SVG，不依赖 Chromium / adapter。
        // 传入必失败的 adapter——若生成路径误调用 adapter，测试即失败。
        let (database, source, db_path) = setup_markdown_item();
        let response = database
            .generate_thumbnail_with_adapter(
                1,
                &StubCaptureAdapter {
                    response: Err(
                        "markdown default cover must not call the capture adapter".to_string(),
                    ),
                },
            )
            .expect("markdown thumbnail should generate without a screenshot engine");
        assert_eq!(response.thumbnail.status, "ready");
        let thumb_path = response.thumbnail.path.expect("path should exist");
        assert!(
            thumb_path.ends_with(".cache/thumbnails/item-1.1.svg"),
            "generation-keyed svg path expected, got: {thumb_path}"
        );
        assert!(Path::new(&thumb_path).exists(), "cache file must exist");
        // B4 正式目标契约：key = md-default:<rendered-title-hash>:title-parser-v1:default-cover-v5，
        // render kind = markdown-default-cover。# Hero Doc 的 display_text 为 "Hero Doc"。
        let expected = markdown_default_cover_key(&content_hash("Hero Doc"));
        assert_eq!(response.expected_key.as_deref(), Some(expected.as_str()));
        assert_eq!(
            response.thumbnail.render_kind.as_deref(),
            Some(RENDER_KIND_MARKDOWN_DEFAULT_COVER)
        );
        let info = database.get_thumbnail_info(1).expect("info").expect("ready");
        assert_eq!(info.desired_key.as_deref(), Some(expected.as_str()));
        assert_eq!(
            info.render_kind.as_deref(),
            Some(RENDER_KIND_MARKDOWN_DEFAULT_COVER)
        );
        // 生成内容是确定性 SVG，覆盖 16:9 视口并包含磁盘标题。
        let svg = fs::read_to_string(&thumb_path).expect("read svg");
        assert!(
            svg.contains("viewBox=\"0 0 1280 720\""),
            "cover svg must use the 16:9 viewBox"
        );
        assert!(svg.contains("Hero Doc"), "cover svg must contain the disk title");

        let _ = fs::remove_dir_all(source.parent().expect("parent"));
        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn desired_key_generation_round_trip_through_repository_and_list() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            let response = database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"ROUNDTRIP")),
                })
                .expect("generate");
            assert_eq!(response.discarded, false);
            assert_eq!(response.thumbnail.status, "ready");
            let expected = html_desired_key(&content_hash("<main>REVISION A</main>"));
            assert_eq!(response.expected_key.as_deref(), Some(expected.as_str()));
            assert_eq!(response.generated_from_key.as_deref(), Some(expected.as_str()));
            assert_eq!(response.generation, 1);
            assert_eq!(response.thumbnail.generation, Some(1));
            assert_eq!(
                response.thumbnail.render_kind.as_deref(),
                Some(RENDER_KIND_HTML_SCREENSHOT)
            );

            let info = database.get_thumbnail_info(1).expect("info").expect("ready");
            assert_eq!(info.desired_key.as_deref(), Some(expected.as_str()));
            assert_eq!(info.generation, Some(1));
            assert_eq!(
                info.render_kind.as_deref(),
                Some(RENDER_KIND_HTML_SCREENSHOT)
            );

            let listed = database
                .list_items(&ListItemsQuery::default())
                .expect("list");
            let thumb = listed.items[0].thumbnail.as_ref().expect("thumbnail");
            assert_eq!(thumb.desired_key.as_deref(), Some(expected.as_str()));
            assert_eq!(thumb.generation, Some(1));
            assert_eq!(
                thumb.render_kind.as_deref(),
                Some(RENDER_KIND_HTML_SCREENSHOT)
            );
            assert!(
                thumb.path.as_deref().expect("path").ends_with("item-1.1.png"),
                "generation-keyed file path"
            );

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    #[test]
    fn placeholder_is_never_committed_as_ready() {
        // 引擎不可用（adapter 返回 Err → Auto 回退 placeholder）时，绝不写 ready。
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            let response = database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Err("engine exploded".to_string()),
                })
                .expect("generate");
            assert_eq!(response.discarded, false, "placeholder is not a discarded task");
            assert_eq!(response.thumbnail.status, "failed", "must be retryable failed, not ready");
            assert_eq!(
                response.thumbnail.render_kind.as_deref(),
                Some(RENDER_KIND_PLACEHOLDER)
            );
            assert!(response.thumbnail.path.is_none(), "placeholder must not produce a ready path");

            // DB 行不是 ready；列表/详情都不能把它当作成图返回。
            assert!(
                database.get_thumbnail_info(1).expect("info").is_none(),
                "placeholder must never satisfy ready"
            );
            let listed = database
                .list_items(&ListItemsQuery::default())
                .expect("list");
            assert!(
                listed.items[0].thumbnail.is_none(),
                "list must not return placeholder as a ready image"
            );
            // 期望 key 已登记，前端可据此跟踪/重试
            let expected = html_desired_key(&content_hash("<main>REVISION A</main>"));
            assert_eq!(response.expected_key.as_deref(), Some(expected.as_str()));

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    #[test]
    fn r1_late_task_never_overwrites_r2_and_r2_becomes_ready() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            let source_str = source.to_string_lossy().to_string();
            let (adapter, control) = SequencedCaptureAdapter::new();

            // R1 开始生成：snapshot(K_A, gen1) → capture 阻塞。
            let db_a = database.clone();
            let adapter_a = adapter.clone();
            let r1 = std::thread::spawn(move || {
                db_a.generate_thumbnail_with_adapter(1, &adapter_a)
            });
            control.wait_until(|| control.captured_count() >= 1);

            // revision 更新为 R2：磁盘 + 索引都变成 REVISION B，generation 递增。
            fs::write(&source, "<main>REVISION B</main>").expect("write revision b");
            let hash_b = content_hash("<main>REVISION B</main>");
            let size_b = fs::metadata(&source).expect("metadata").len() as i64;
            database
                .update_item_revision_and_invalidate_impl(1, &source_str, &hash_b, "2", size_b)
                .expect("precise revision update");

            // R2 成为当前 desired generation：snapshot(K_B, gen2) → capture 阻塞。
            let db_b = database.clone();
            let adapter_b = adapter.clone();
            let r2 = std::thread::spawn(move || {
                db_b.generate_thumbnail_with_adapter(1, &adapter_b)
            });
            control.wait_until(|| control.captured_count() >= 2);

            // R2 先完成、R1 最晚完成。
            control.release_with(1, Ok(sample_png(b"R2-PAYLOAD")));
            control.release_with(0, Ok(sample_png(b"R1-PAYLOAD")));

            let r1_result = r1.join().expect("r1 thread").expect("r1 generate");
            let r2_result = r2.join().expect("r2 thread").expect("r2 generate");

            // R1 的数据库提交被拒绝（discarded + 指向当前 K_B）。
            assert_eq!(r1_result.discarded, true, "R1 must be discarded");
            assert_eq!(
                r1_result.expected_key.as_deref(),
                Some(html_desired_key(&hash_b).as_str())
            );
            // R2 成为 ready。
            assert_eq!(r2_result.discarded, false);
            assert_eq!(r2_result.thumbnail.status, "ready");
            assert_eq!(
                r2_result.generated_from_key.as_deref(),
                Some(html_desired_key(&hash_b).as_str())
            );
            assert_eq!(r2_result.generation, 2);

            // DB 行：ready + K_B + generation 2 + render kind。
            let info = database
                .get_thumbnail_info(1)
                .expect("info")
                .expect("r2 ready");
            assert_eq!(info.status, "ready");
            assert_eq!(info.desired_key.as_deref(), Some(html_desired_key(&hash_b).as_str()));
            assert_eq!(info.generation, Some(2));
            assert_eq!(
                info.render_kind.as_deref(),
                Some(RENDER_KIND_HTML_SCREENSHOT)
            );

            // 物理文件：DB 引用的成品是 R2（内容 = R2-PAYLOAD），R1 没有覆盖它。
            let thumb_path = info.path.expect("thumb path");
            assert!(
                thumb_path.ends_with("item-1.2.png"),
                "DB must reference R2's generation file: {thumb_path}"
            );
            let disk_bytes = fs::read(&thumb_path).expect("read thumb");
            assert!(
                disk_bytes
                    .windows(b"R2-PAYLOAD".len())
                    .any(|window| window == b"R2-PAYLOAD"),
                "file must hold R2 payload"
            );
            assert!(
                !disk_bytes
                    .windows(b"R1-PAYLOAD".len())
                    .any(|window| window == b"R1-PAYLOAD"),
                "file must not hold R1 payload"
            );

            // 目录里只保留当前 generation 的成品。
            let cache_dir = Path::new(&thumb_path).parent().expect("cache dir");
            let leftovers: Vec<String> = fs::read_dir(cache_dir)
                .expect("read cache dir")
                .flatten()
                .map(|entry| entry.file_name().to_string_lossy().into_owned())
                .filter(|name| name.starts_with("item-1."))
                .collect();
            assert_eq!(
                leftovers,
                vec!["item-1.2.png".to_string()],
                "only R2's artifact may remain: {leftovers:?}"
            );

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    #[test]
    fn discarded_generations_are_requeued_and_final_generation_becomes_ready() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            let source_str = source.to_string_lossy().to_string();
            let (adapter, control) = SequencedCaptureAdapter::new();

            // R1 与 R2 都在 revision 更新前 snapshot（都拿 K_A gen1）。
            let db_a = database.clone();
            let adapter_a = adapter.clone();
            let r1 = std::thread::spawn(move || {
                db_a.generate_thumbnail_with_adapter(1, &adapter_a)
            });
            control.wait_until(|| control.captured_count() >= 1);
            let db_b = database.clone();
            let adapter_b = adapter.clone();
            let r2 = std::thread::spawn(move || {
                db_b.generate_thumbnail_with_adapter(1, &adapter_b)
            });
            control.wait_until(|| control.captured_count() >= 2);

            // revision 更新为 R2。
            fs::write(&source, "<main>REVISION B</main>").expect("write revision b");
            let hash_b = content_hash("<main>REVISION B</main>");
            let size_b = fs::metadata(&source).expect("metadata").len() as i64;
            database
                .update_item_revision_and_invalidate_impl(1, &source_str, &hash_b, "2", size_b)
                .expect("precise revision update");

            // 两个旧任务都晚到完成 → 全部被丢弃。
            // 注意 release 顺序：VecDeque remove(index) 会左移，先释放靠后的槽位。
            control.release_with(1, Ok(sample_png(b"R2-PAYLOAD")));
            control.release_with(0, Ok(sample_png(b"R1-PAYLOAD")));
            let r1_result = r1.join().expect("r1 thread").expect("r1 generate");
            let r2_result = r2.join().expect("r2 thread").expect("r2 generate");
            assert!(r1_result.discarded, "R1 must be discarded");
            assert!(r2_result.discarded, "R2 must be discarded");
            assert_eq!(
                r1_result.expected_key.as_deref(),
                Some(html_desired_key(&hash_b).as_str()),
                "discarded response must carry the current expected key for re-queue"
            );

            // 补排队（前端按 expectedKey 补跑最新 generation）→ R3 最终 ready。
            let r3 = database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"R3-PAYLOAD")),
                })
                .expect("r3 generate");
            assert_eq!(r3.discarded, false, "re-queued task must not be stuck");
            assert_eq!(r3.thumbnail.status, "ready");
            assert_eq!(r3.generation, 2);
            assert_eq!(
                r3.generated_from_key.as_deref(),
                Some(html_desired_key(&hash_b).as_str())
            );

            // 最终 DB 引用与磁盘成品都属于新 generation。
            let info = database
                .get_thumbnail_info(1)
                .expect("info")
                .expect("ready");
            assert_eq!(info.generation, Some(2));
            let path = info.path.expect("path");
            let bytes = fs::read(&path).expect("read thumb");
            assert!(
                bytes
                    .windows(b"R3-PAYLOAD".len())
                    .any(|window| window == b"R3-PAYLOAD"),
                "final artifact must be the re-queued generation"
            );

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    #[test]
    fn capture_does_not_hold_database_write_transaction() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            let source_str = source.to_string_lossy().to_string();
            let (adapter, control) = SequencedCaptureAdapter::new();

            let db_g = database.clone();
            let adapter_g = adapter.clone();
            let generation = std::thread::spawn(move || {
                db_g.generate_thumbnail_with_adapter(1, &adapter_g)
            });
            control.wait_until(|| control.captured_count() >= 1);

            // 截图阻塞期间：另一个写事务必须能完成，不能被长数据库事务阻塞。
            let db_w = database.clone();
            let hash_b = content_hash("<main>REVISION B</main>");
            let (done_tx, done_rx) = mpsc::channel();
            let writer = std::thread::spawn(move || {
                let result = db_w.update_item_revision_and_invalidate_impl(
                    1,
                    &source_str,
                    &hash_b,
                    "2",
                    20,
                );
                let _ = done_tx.send(result.is_ok());
            });
            let completed = done_rx
                .recv_timeout(Duration::from_secs(3))
                .expect("write transaction must complete while capture is in flight");
            assert!(completed, "revision write must not be blocked by the capture");

            control.release_with(0, Ok(sample_png(b"R1-PAYLOAD")));
            let _ = generation.join().expect("generation thread");
            let _ = writer.join();

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    #[test]
    fn precise_revision_update_sets_stale_and_rejects_wrong_path() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            let source_str = source.to_string_lossy().to_string();
            database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"READY")),
                })
                .expect("generate ready");

            // canonical path 不匹配 → InvalidParams，不改任何状态。
            let err = database
                .update_item_revision_and_invalidate_impl(1, "/wrong/path.html", "hash-x", "2", 99)
                .expect_err("wrong path must fail");
            assert!(matches!(err, AppError::InvalidParams));
            let before = database.get_thumbnail_info(1).expect("info").expect("ready");
            assert_eq!(before.status, "ready", "wrong path must not invalidate");

            // 精确更新（item_id + canonical_path）。
            let hash_b = content_hash("<main>REVISION B</main>");
            let size_b = fs::metadata(&source).expect("metadata").len() as i64;
            database
                .update_item_revision_and_invalidate_impl(1, &source_str, &hash_b, "2", size_b)
                .expect("precise update");

            // 旧缩略图立即 stale；读取路径不再返回 ready。
            assert!(
                database.get_thumbnail_info(1).expect("info").is_none(),
                "stale thumbnail must not be served"
            );
            let detail = database.get_item_detail(1).expect("detail");
            assert_eq!(detail.file_hash.as_deref(), Some(hash_b.as_str()));
            assert!(detail.summary.thumbnail.is_none());

            // generation 持久化递增（不是内存态），重启后不回退。
            let connection = Connection::open(&db_path).expect("open db");
            let (status, generation): (String, i64) = connection
                .query_row(
                    "SELECT thumb_status, generation FROM thumbnail_cache WHERE item_id = 1",
                    [],
                    |row| Ok((row.get(0)?, row.get(1)?)),
                )
                .expect("row");
            assert_eq!(status, "stale");
            assert_eq!(generation, 2);
            drop(connection);

            // item 不存在 → ItemNotFound。
            let err = database
                .update_item_revision_and_invalidate_impl(999, "/x", "h", "2", 1)
                .expect_err("missing item must fail");
            assert!(matches!(err, AppError::ItemNotFound));

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    #[test]
    fn precise_update_works_for_ordinary_agent_project_and_shared_items() {
        let dir = temp_dir();
        let db_path = dir.join("nutbook.sqlite3");
        let database = Database::new(&db_path).expect("db");
        let ordinary_root = dir.join("ordinary");
        let project_root = dir.join("project");
        let shared_root = dir.join("shared");
        fs::create_dir_all(&ordinary_root).expect("ordinary root");
        fs::create_dir_all(&project_root).expect("project root");
        fs::create_dir_all(&shared_root).expect("shared root");
        database
            .upsert_library(library(1, "Ordinary", ordinary_root.to_string_lossy().as_ref(), "folder"))
            .expect("ordinary library");
        database
            .upsert_library(library(2, "AgentProject", project_root.to_string_lossy().as_ref(), "agent_project"))
            .expect("agent project library");
        database
            .upsert_library(library(3, "SharedOwner", shared_root.to_string_lossy().as_ref(), "folder"))
            .expect("shared owner library");

        // ordinary item（走正式 replace_items_for_library）。
        let ordinary_file = ordinary_root.join("o.html");
        fs::write(&ordinary_file, "<main>O</main>").expect("ordinary source");
        database
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: ordinary_file.to_string_lossy().to_string(),
                    relative_path: "o.html".to_string(),
                    file_name: "o.html".to_string(),
                    file_ext: "html".to_string(),
                    file_type: "html".to_string(),
                    file_size: fs::metadata(&ordinary_file).expect("meta").len() as i64,
                    modified_at: "1".to_string(),
                    created_at: "now".to_string(),
                    updated_at: "now".to_string(),
                }],
            )
            .expect("ordinary item");

        // agent_project-only item + shared item（replace_items_for_library 会拒绝
        // agent_project，测试直接用 SQL 构造 item_sources 关系，模拟项目接入产物）。
        let project_file = project_root.join("p.html");
        fs::write(&project_file, "<main>P</main>").expect("project source");
        let shared_file = shared_root.join("s.html");
        fs::write(&shared_file, "<main>S</main>").expect("shared source");
        let connection = Connection::open(&db_path).expect("open db");
        connection
            .execute(
                "INSERT INTO items (
                   id, library_id, file_path, relative_path, file_name, file_ext, file_type,
                   file_size, modified_at, file_hash, title, summary, path_state, is_favorite,
                   last_opened_at, is_deleted, created_at, updated_at
                 ) VALUES (2, 2, ?1, 'p.html', 'p.html', 'html', 'html', 0, '1', NULL, NULL, NULL,
                           'valid', 0, NULL, 0, 'now', 'now'),
                         (3, 1, ?2, 's.html', 's.html', 'html', 'html', 0, '1', NULL, NULL, NULL,
                           'valid', 0, NULL, 0, 'now', 'now')",
                params![
                    project_file.to_string_lossy().to_string(),
                    shared_file.to_string_lossy().to_string()
                ],
            )
            .expect("insert items");
        connection
            .execute(
                "INSERT INTO item_sources (item_id, library_id, link_kind, is_owner, created_at)
                 VALUES (2, 2, 'manifest', 1, 'now'),
                        (3, 1, 'legacy', 1, 'now'),
                        (3, 2, 'manifest', 0, 'now')",
                [],
            )
            .expect("insert item_sources");
        drop(connection);

        let cases = [
            (1, ordinary_file),
            (2, project_file),
            (3, shared_file),
        ];
        for (item_id, file) in cases {
            let path_str = file.to_string_lossy().to_string();
            let hash = content_hash(&fs::read_to_string(&file).expect("read"));
            database
                .update_item_revision_and_invalidate_impl(item_id, &path_str, &hash, "2", 9)
                .expect("precise update must work without owner/source_kind dependency");
            let detail = database.get_item_detail(item_id).expect("detail");
            assert_eq!(detail.file_hash.as_deref(), Some(hash.as_str()), "item {item_id} hash");
            let connection = Connection::open(&db_path).expect("open db");
            let status: String = connection
                .query_row(
                    "SELECT thumb_status FROM thumbnail_cache WHERE item_id = ?1",
                    params![item_id],
                    |row| row.get(0),
                )
                .expect("thumbnail row");
            assert_eq!(status, "stale", "item {item_id} must be stale");
            drop(connection);
        }

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn durable_save_partial_success_writes_atomic_marker_and_replay_converges() {
        let (database, source, db_path) = setup_html_item();
        let marker_dir = db_path.parent().expect("parent").join(".cache/reconcile");
        let marker_path = marker_dir.join("reconcile-1.json");

        // 1) source 已 durable，但索引同步失败（canonical_path 不匹配）→ 部分成功 + marker。
        let report = database.sync_item_revision_after_durable_save(
            1,
            "/wrong/path.html",
            "hash-b",
            Some("2"),
            12,
        );
        assert_eq!(report.source_saved, true);
        assert_eq!(report.index_synchronized, false);
        assert!(marker_path.exists(), "marker must be written on index sync failure");
        let marker: ReconciliationMarker =
            serde_json::from_slice(&fs::read(&marker_path).expect("read marker"))
                .expect("marker must be valid JSON (atomic write)");
        assert_eq!(marker.schema_version, RECONCILIATION_MARKER_VERSION);
        assert_eq!(marker.item_id, 1);
        assert_eq!(marker.canonical_path, "/wrong/path.html");

        // 2) 重放失败（路径不匹配）→ marker 保留供下次重试。
        let replayed = database.replay_reconciliation_markers().expect("replay");
        assert_eq!(replayed, 0);
        assert!(marker_path.exists(), "failed replay must keep the marker");

        // 3) 写正确 marker（磁盘真实状态）→ 重放成功 → 精确更新 + 缩略图 stale + marker 删除。
        let source_str = source.to_string_lossy().to_string();
        let disk_raw = fs::read_to_string(&source).expect("read source");
        let hash = content_hash(&disk_raw);
        let size = fs::metadata(&source).expect("meta").len() as i64;
        database
            .write_reconciliation_marker(&ReconciliationMarker {
                schema_version: RECONCILIATION_MARKER_VERSION,
                item_id: 1,
                canonical_path: source_str,
                source_hash: hash.clone(),
                modified_at: "2".to_string(),
                file_size: size,
                generation: 0,
                written_at: "now".to_string(),
            })
            .expect("write marker");
        let replayed = database.replay_reconciliation_markers().expect("replay");
        assert_eq!(replayed, 1);
        assert!(
            !marker_path.exists(),
            "marker must be deleted only after sync truly succeeds"
        );
        let detail = database.get_item_detail(1).expect("detail");
        assert_eq!(detail.file_hash.as_deref(), Some(hash.as_str()));
        assert!(
            detail.summary.thumbnail.is_none(),
            "old thumbnail must stay stale after replay"
        );

        // 4) item 已删除 → 重放只删除 marker，不报错。
        let connection = Connection::open(&db_path).expect("open db");
        connection
            .execute("DELETE FROM items WHERE id = 1", [])
            .expect("delete item");
        drop(connection);
        database
            .write_reconciliation_marker(&ReconciliationMarker {
                schema_version: RECONCILIATION_MARKER_VERSION,
                item_id: 1,
                canonical_path: "whatever".to_string(),
                source_hash: "h".to_string(),
                modified_at: "2".to_string(),
                file_size: 1,
                generation: 0,
                written_at: "now".to_string(),
            })
            .expect("write marker");
        let replayed = database.replay_reconciliation_markers().expect("replay");
        assert_eq!(replayed, 1, "orphan marker for deleted item must be dropped");
        assert!(!marker_path.exists());

        let _ = fs::remove_dir_all(source.parent().expect("parent"));
        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn list_items_replays_pending_reconciliation_markers() {
        let (database, source, db_path) = setup_html_item();
        let marker_path = db_path
            .parent()
            .expect("parent")
            .join(".cache/reconcile/reconcile-1.json");
        let source_str = source.to_string_lossy().to_string();
        // 磁盘实际内容仍是 REVISION A；marker 声称 REVISION B 的 hash。
        // 重放必须以磁盘为准（磁盘是状态源）：绝不能因为 marker file_size 恰好等于
        // 磁盘大小就信任 marker 的 hash（同尺寸改写场景）。
        let marker_hash = content_hash("<main>REVISION B</main>");
        let disk_hash = content_hash("<main>REVISION A</main>");
        let size = fs::metadata(&source).expect("meta").len() as i64;
        database
            .write_reconciliation_marker(&ReconciliationMarker {
                schema_version: RECONCILIATION_MARKER_VERSION,
                item_id: 1,
                canonical_path: source_str,
                source_hash: marker_hash,
                modified_at: "2".to_string(),
                file_size: size,
                generation: 0,
                written_at: "now".to_string(),
            })
            .expect("write marker");
        assert!(marker_path.exists());

        let _ = database.list_items(&ListItemsQuery::default()).expect("list");
        assert!(
            !marker_path.exists(),
            "list path must replay and remove successfully synced markers"
        );
        let detail = database.get_item_detail(1).expect("detail");
        assert_eq!(
            detail.file_hash.as_deref(),
            Some(disk_hash.as_str()),
            "replay must converge to the real disk hash, not trust the marker hash"
        );

        let _ = fs::remove_dir_all(source.parent().expect("parent"));
        let _ = fs::remove_file(db_path);
    }

    #[test]
    fn commit_response_partial_success_contract_serializes() {
        // indexSynchronized=false：sourceSaved=true、warning=index-pending，
        // desiredKey/generation 必须缺失（revision 不确定，禁止前端排队截图）。
        let pending = CommitHtmlEditResponse {
            source_saved: true,
            index_synchronized: false,
            source_file_hash: "hash-b".to_string(),
            source_modified_at: 2,
            source_size: 12,
            normalized_changes: BTreeMap::new(),
            desired_key: None,
            generation: None,
            warning: Some("index-pending".to_string()),
        };
        let json = serde_json::to_value(&pending).expect("serialize");
        assert_eq!(json["sourceSaved"], true, "durable save ack must never be false");
        assert_eq!(json["indexSynchronized"], false);
        assert_eq!(json["warning"], "index-pending", "warning must be a parseable code, not raw prose");
        assert!(json.get("desiredKey").is_none(), "uncertain revision must not expose desiredKey");
        assert!(json.get("generation").is_none());

        // indexSynchronized=true：结构化 desiredKey/generation 供前端排队，无 warning。
        let ready = CommitHtmlEditResponse {
            source_saved: true,
            index_synchronized: true,
            source_file_hash: "hash-b".to_string(),
            source_modified_at: 2,
            source_size: 12,
            normalized_changes: BTreeMap::new(),
            desired_key: Some("html:hash-b:html-card-vN".to_string()),
            generation: Some(3),
            warning: None,
        };
        let json = serde_json::to_value(&ready).expect("serialize");
        assert_eq!(json["sourceSaved"], true);
        assert_eq!(json["indexSynchronized"], true);
        assert_eq!(json["desiredKey"], "html:hash-b:html-card-vN");
        assert_eq!(json["generation"], 3);
        assert!(json.get("warning").is_none());
    }

    #[test]
    fn external_html_scan_change_invalidates_like_save_and_regenerates() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            // A 生成 ready。
            database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"A")),
                })
                .expect("ready A");
            let key_a = html_desired_key(&content_hash("<main>REVISION A</main>"));
            assert_eq!(
                database
                    .get_thumbnail_info(1)
                    .expect("info")
                    .expect("ready")
                    .desired_key
                    .as_deref(),
                Some(key_a.as_str())
            );

            // 磁盘改为 B，模拟外部修改后 folder scan：mtime/size 变化 →
            // replace_items_for_library 刷新 hash + 与保存一致的精确失效。
            fs::write(&source, "<main>REVISION B</main>").expect("write B");
            let size_b = fs::metadata(&source).expect("meta").len() as i64;
            database
                .replace_items_for_library(
                    1,
                    &[IndexedItemRecord {
                        library_id: 1,
                        file_path: source.to_string_lossy().to_string(),
                        relative_path: "card.html".to_string(),
                        file_name: "card.html".to_string(),
                        file_ext: "html".to_string(),
                        file_type: "html".to_string(),
                        file_size: size_b,
                        modified_at: "2".to_string(),
                        created_at: "now".to_string(),
                        updated_at: "now".to_string(),
                    }],
                )
                .expect("scan");

            // 旧 ready 不再服务；DB 行是 stale + 新 desired key + generation 递增
            // （in-flight 旧任务会被 CAS 拒绝，与保存路径一致）。
            assert!(
                database.get_thumbnail_info(1).expect("info").is_none(),
                "old ready must not be served after external change"
            );
            let listed = database.list_items(&ListItemsQuery::default()).expect("list");
            assert!(listed.items[0].thumbnail.is_none(), "list must not serve stale after scan");
            let connection = Connection::open(&db_path).expect("open db");
            let (status, desired_key, generation): (String, String, i64) = connection
                .query_row(
                    "SELECT thumb_status, desired_key, generation
                     FROM thumbnail_cache WHERE item_id = 1",
                    [],
                    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
                )
                .expect("row");
            drop(connection);
            assert_eq!(status, "stale", "scan invalidation must mark stale");
            let key_b = html_desired_key(&content_hash("<main>REVISION B</main>"));
            assert_eq!(desired_key, key_b, "desired key must advance to B");
            assert!(generation >= 2, "generation must advance past A");

            // stale_desired_item_ids 是"需要补排队"的窄入口。
            assert_eq!(
                database.stale_desired_item_ids().expect("stale ids"),
                vec![1],
                "changed item must be re-queueable"
            );

            // 重新生成 → B ready，补排队资格清空。
            let response = database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"B")),
                })
                .expect("generate B");
            assert_eq!(response.discarded, false);
            assert_eq!(response.expected_key.as_deref(), Some(key_b.as_str()));
            assert_eq!(
                response.thumbnail.render_kind.as_deref(),
                Some(RENDER_KIND_HTML_SCREENSHOT)
            );
            assert!(
                database.stale_desired_item_ids().expect("stale after").is_empty(),
                "ready B must clear the re-queue entry"
            );

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    #[test]
    fn external_html_scan_read_failure_cannot_stabilize_old_hash_or_ready() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"A")),
                })
                .expect("ready A");

            // 扫描已观察到 B 的 metadata，但扫描事务读取正文时文件暂时不可读/不存在。
            // 不能提交成“新 metadata + 旧 A hash/ready”的稳定组合。
            fs::remove_file(&source).expect("temporarily remove source");
            let record_b = IndexedItemRecord {
                library_id: 1,
                file_path: source.to_string_lossy().to_string(),
                relative_path: "card.html".to_string(),
                file_name: "card.html".to_string(),
                file_ext: "html".to_string(),
                file_type: "html".to_string(),
                file_size: "<main>REVISION B</main>".len() as i64,
                modified_at: "2".to_string(),
                created_at: "now".to_string(),
                updated_at: "now".to_string(),
            };
            database
                .replace_items_for_library(1, std::slice::from_ref(&record_b))
                .expect("scan with transient read failure");

            assert!(
                database.get_thumbnail_info(1).expect("info after failure").is_none(),
                "old A ready must stop serving as soon as the changed source cannot be hashed"
            );
            let connection = Connection::open(&db_path).expect("open db");
            let (hash_after_failure, status_after_failure, key_after_failure): (
                Option<String>,
                String,
                Option<String>,
            ) = connection
                .query_row(
                    "SELECT items.file_hash, thumbnail_cache.thumb_status, thumbnail_cache.desired_key
                     FROM items INNER JOIN thumbnail_cache ON thumbnail_cache.item_id = items.id
                     WHERE items.id = 1",
                    [],
                    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
                )
                .expect("failed-read state");
            drop(connection);
            assert!(hash_after_failure.is_none(), "unknown source revision must clear the old hash");
            assert_eq!(status_after_failure, "stale");
            assert!(key_after_failure.is_none(), "unknown revision must not keep A as desired key");

            // 文件恢复后 metadata 保持与上次扫描完全相同。下一次扫描仍必须因为
            // hash 未知而重试读取，并收敛到 B，而不是认为 metadata 未变就永久跳过。
            fs::write(&source, "<main>REVISION B</main>").expect("restore B");
            database
                .replace_items_for_library(1, &[record_b])
                .expect("retry scan with identical metadata");
            let (desired_key, _) = database
                .thumbnail_queue_state(1)
                .expect("queue state")
                .expect("thumbnail row");
            let key_b = html_desired_key(&content_hash("<main>REVISION B</main>"));
            assert_eq!(desired_key.as_deref(), Some(key_b.as_str()));
            let response = database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"B")),
                })
                .expect("generate B after retry");
            assert_eq!(response.discarded, false);
            assert_eq!(response.expected_key.as_deref(), Some(key_b.as_str()));

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    #[test]
    fn marker_replay_after_restart_requeues_and_converges_b() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            // 重启前：A 已有 ready。
            database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"A")),
                })
                .expect("ready A");
            let key_a = html_desired_key(&content_hash("<main>REVISION A</main>"));
            assert_eq!(
                database
                    .get_thumbnail_info(1)
                    .expect("info")
                    .expect("ready")
                    .desired_key
                    .as_deref(),
                Some(key_a.as_str())
            );

            // 磁盘已是 B，但索引同步失败（mtime 不可用路径）→ 部分成功 + marker。
            fs::write(&source, "<main>REVISION B</main>").expect("write B");
            let hash_b = content_hash("<main>REVISION B</main>");
            let size_b = fs::metadata(&source).expect("meta").len() as i64;
            let report = database.sync_item_revision_after_durable_save(
                1,
                &source.to_string_lossy().to_string(),
                &hash_b,
                None,
                size_b,
            );
            assert_eq!(report.source_saved, true, "durable save must stay a success");
            assert_eq!(report.index_synchronized, false);
            let marker_path = db_path
                .parent()
                .expect("parent")
                .join(".cache/reconcile/reconcile-1.json");
            assert!(marker_path.exists(), "marker must be written");

            // 模拟重启：启动路径 replay marker → 以磁盘为准收敛，A 不复活。
            let replayed = database.replay_reconciliation_markers().expect("replay");
            assert_eq!(replayed, 1);
            assert!(!marker_path.exists(), "marker must be removed after sync succeeds");
            assert!(
                database.get_thumbnail_info(1).expect("info").is_none(),
                "A must not resurrect after replay"
            );
            assert_eq!(
                database.stale_desired_item_ids().expect("stale"),
                vec![1],
                "replayed item must enter the re-queue path"
            );

            // 补排队 → B 的 desired generation 最终 ready。
            let response = database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"B")),
                })
                .expect("generate B");
            assert_eq!(response.discarded, false);
            let key_b = html_desired_key(&hash_b);
            assert_eq!(response.expected_key.as_deref(), Some(key_b.as_str()));
            let listed = database.list_items(&ListItemsQuery::default()).expect("list");
            assert_eq!(
                listed.items[0].thumbnail.as_ref().expect("thumb").desired_key.as_deref(),
                Some(key_b.as_str()),
                "latest revision must converge to ready"
            );
            assert!(database.stale_desired_item_ids().expect("stale after").is_empty());

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    #[test]
    fn thumbnail_queue_state_accessor_reads_desired_key_and_generation() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            assert!(
                database.thumbnail_queue_state(1).expect("state").is_some(),
                "scan seed must already register a stale desired state"
            );
            database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"Q")),
                })
                .expect("generate ready");
            let (desired_key, generation) = database
                .thumbnail_queue_state(1)
                .expect("state")
                .expect("row");
            let key_a = html_desired_key(&content_hash("<main>REVISION A</main>"));
            assert_eq!(desired_key.as_deref(), Some(key_a.as_str()));
            assert!(generation >= 1);
            assert!(
                database.thumbnail_queue_state(999).expect("missing").is_none(),
                "unknown item must be None"
            );
            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    #[test]
    fn reads_never_serve_stale_placeholder_or_old_generation_rows() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            let source_str = source.to_string_lossy().to_string();
            database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"READY")),
                })
                .expect("generate ready");
            let hash_a = content_hash("<main>REVISION A</main>");
            let key_a = html_desired_key(&hash_a);

            // 1) 精确失效后，旧 ready 立即不可服务。
            let hash_b = content_hash("<main>REVISION B</main>");
            database
                .update_item_revision_and_invalidate_impl(1, &source_str, &hash_b, "2", 20)
                .expect("invalidate");
            assert!(database.get_thumbnail_info(1).expect("info").is_none());
            let listed = database.list_items(&ListItemsQuery::default()).expect("list");
            assert!(listed.items[0].thumbnail.is_none());

            // 2) 强行把行改回"旧 generation ready"（旧 key + 旧 generation）→ 仍不服务。
            let connection = Connection::open(&db_path).expect("open db");
            connection
                .execute(
                    "UPDATE thumbnail_cache
                     SET thumb_status = 'ready', render_kind = 'html-screenshot',
                         desired_key = ?1, generated_from_key = ?1,
                         generated_from_hash = ?2, generation = 1,
                         thumb_path = '/tmp/legacy-b1.png'
                     WHERE item_id = 1",
                    params![key_a, hash_a],
                )
                .expect("force old generation row");
            drop(connection);
            assert!(
                database.get_thumbnail_info(1).expect("info").is_none(),
                "old generation ready must not be served (desired key mismatch)"
            );

            // 3) placeholder 行（render kind placeholder + status failed）→ 不服务。
            let connection = Connection::open(&db_path).expect("open db");
            connection
                .execute(
                    "UPDATE thumbnail_cache
                     SET thumb_status = 'failed', render_kind = 'placeholder',
                         desired_key = ?1, generated_from_key = ?1,
                         generated_from_hash = ?2, generation = 2,
                         thumb_path = NULL
                     WHERE item_id = 1",
                    params![key_a, hash_a],
                )
                .expect("force placeholder row");
            drop(connection);
            assert!(
                database.get_thumbnail_info(1).expect("info").is_none(),
                "placeholder must never be served"
            );

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    #[test]
    fn markdown_save_body_only_keeps_ready_cover_and_advances_generated_hash() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_markdown_item();
            database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"MD-READY")),
                })
                .expect("generate ready");
            let before = database.get_thumbnail_info(1).expect("info").expect("ready");
            let before_key = before.desired_key.clone().expect("desired key");
            let before_path = before.path.clone().expect("path");
            let before_generation = before.generation.expect("generation");

            // 同标题正文保存（标题仍为 "Hero Doc"）：模拟真实保存——写磁盘 + 磁盘 mtime。
            fs::write(&source, "# Hero Doc\n\nBody v2").expect("write body v2");
            let metadata = fs::metadata(&source).expect("metadata");
            let mtime = file_modified_at_string(&metadata).expect("mtime");
            let new_hash = content_hash("# Hero Doc\n\nBody v2");
            database
                .update_markdown_item_content(
                    1,
                    "summary",
                    &mtime,
                    &new_hash,
                    "# Hero Doc\n\nBody v2",
                    "# Hero Doc\n\nBody v2",
                    "<h1>Hero Doc</h1>",
                )
                .expect("markdown save");

            // B4：只改正文不改标题 → 不调用 SVG 生成器/adapter，ready 直接保持。
            let info = database.get_thumbnail_info(1).expect("info").expect("ready kept");
            assert_eq!(
                info.desired_key.as_deref(),
                Some(before_key.as_str()),
                "desired key must stay unchanged for body-only save"
            );
            assert_eq!(info.generation, Some(before_generation), "generation must not bump");
            assert_eq!(
                info.path.as_deref(),
                Some(before_path.as_str()),
                "thumb path must stay unchanged"
            );
            assert_eq!(
                info.render_kind.as_deref(),
                Some(RENDER_KIND_MARKDOWN_DEFAULT_COVER)
            );
            // generated_from_hash 必须推进到新的全文 source hash，否则读取校验会判失效。
            let connection = Connection::open(&db_path).expect("open db");
            let generated_hash: Option<String> = connection
                .query_row(
                    "SELECT generated_from_hash FROM thumbnail_cache WHERE item_id = 1",
                    [],
                    |row| row.get(0),
                )
                .expect("generated hash");
            let file_hash: Option<String> = connection
                .query_row(
                    "SELECT file_hash FROM items WHERE id = 1",
                    [],
                    |row| row.get(0),
                )
                .expect("items hash");
            drop(connection);
            assert_eq!(
                generated_hash.as_deref(),
                Some(new_hash.as_str()),
                "generated_from_hash must advance to the new body hash"
            );
            assert_eq!(
                file_hash.as_deref(),
                Some(new_hash.as_str()),
                "items.file_hash must advance to the new body hash"
            );

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    #[test]
    fn markdown_save_title_change_invalidates_once_and_generation_plus_one() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_markdown_item();
            database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"MD-READY")),
                })
                .expect("generate ready");
            let before = database.get_thumbnail_info(1).expect("info").expect("ready");
            let before_generation = before.generation.expect("generation");

            // 标题变化保存（"# Hero Doc" → "# New Title"）。
            fs::write(&source, "# New Title\n\nBody v2").expect("write");
            let metadata = fs::metadata(&source).expect("metadata");
            let mtime = file_modified_at_string(&metadata).expect("mtime");
            let new_hash = content_hash("# New Title\n\nBody v2");
            database
                .update_markdown_item_content(
                    1,
                    "summary",
                    &mtime,
                    &new_hash,
                    "# New Title\n\nBody v2",
                    "# New Title\n\nBody v2",
                    "<h1>New Title</h1>",
                )
                .expect("markdown save");

            // 旧 ready 立即失效；generation 恰好 +1（不允许 +2）。
            assert!(
                database.get_thumbnail_info(1).expect("info").is_none(),
                "old ready must be invalid after a title change"
            );
            let connection = Connection::open(&db_path).expect("open db");
            let (desired, status, generation): (String, String, i64) = connection
                .query_row(
                    "SELECT desired_key, thumb_status, generation FROM thumbnail_cache WHERE item_id = 1",
                    [],
                    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
                )
                .expect("thumbnail row");
            drop(connection);
            assert_eq!(status, "stale");
            assert_eq!(
                generation,
                before_generation + 1,
                "generation must advance exactly once"
            );
            let expected_key = markdown_default_cover_key(&content_hash("New Title"));
            assert_eq!(desired, expected_key, "desired key must move to the new title key");

            // 重新生成（不调用 adapter）→ ready，使用新标题。
            let response = database
                .generate_thumbnail_with_adapter(
                    1,
                    &StubCaptureAdapter {
                        response: Err("markdown must not call the capture adapter".to_string()),
                    },
                )
                .expect("regenerate");
            assert_eq!(response.thumbnail.status, "ready");
            assert_eq!(
                response.thumbnail.generation,
                Some(before_generation + 1),
                "regeneration must reuse the same generation"
            );
            let svg = fs::read_to_string(response.thumbnail.path.expect("path")).expect("svg");
            assert!(svg.contains("New Title"));

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    /// 模板版本缓存失效：seed 一个 render kind 正确但 key 是 default-cover-v4 的
    /// ready 行（缓存文件真实存在、stat 与 hash 全匹配）——版本后缀校验必须拒绝它；
    /// 自动生成后得到 default-cover-v5、generation 推进、新文件为 hover-safe 编辑出版式。
    #[test]
    fn markdown_v4_top_rule_cache_is_not_served_and_regenerates_v5() {
        let (database, source, db_path) = setup_markdown_item();
        // 收敛 items 到磁盘真实状态，排除 stat 干扰（证明拒绝来自 key 版本校验）。
        let metadata = fs::metadata(&source).expect("meta");
        let mtime = file_modified_at_string(&metadata).expect("mtime");
        let hash = content_hash("# Hero Doc\n\nBody");
        let connection = Connection::open(&db_path).expect("open db");
        connection
            .execute(
                "UPDATE items SET file_hash = ?1, modified_at = ?2, file_size = ?3 WHERE id = 1",
                params![hash, mtime, metadata.len() as i64],
            )
            .expect("converge items");
        // seed v4（顶部横线版）ready 行 + 真实存在的缓存文件。
        let cache_dir = db_path.parent().expect("parent").join(".cache/thumbnails");
        fs::create_dir_all(&cache_dir).expect("cache dir");
        let v4_file = cache_dir.join("item-1.1.svg");
        fs::write(&v4_file, "<svg/>").expect("v4 cache file");
        let v4_key = format!(
            "md-default:{}:title-parser-v1:default-cover-v4",
            content_hash("Hero Doc")
        );
        connection
            .execute(
                "INSERT INTO thumbnail_cache (
                    item_id, thumb_path, thumb_status, width, height, generated_from_hash,
                    last_generated_at, error_message, desired_key, generated_from_key,
                    render_kind, generation
                 ) VALUES (1, ?1, 'ready', 1280, 720, ?2, '1', NULL, ?3, ?3, 'markdown-default-cover', 1)",
                params![
                    v4_file.to_string_lossy().to_string(),
                    hash,
                    v4_key
                ],
            )
            .expect("seed v4 ready");
        drop(connection);

        // v4（旧顶部横线版）不是当前契约：get_thumbnail_info 与 list 都不能返回它。
        assert!(
            database.get_thumbnail_info(1).expect("info").is_none(),
            "default-cover-v4 must not be served as current ready"
        );
        let listed = database.list_items(&ListItemsQuery::default()).expect("list");
        assert!(
            listed.items[0].thumbnail.is_none(),
            "list must not serve the v4 default-cover cache"
        );

        // 自动生成 → v5：新 key、generation 推进一次、新 generation-keyed 文件。
        let response = database
            .generate_thumbnail_with_adapter(
                1,
                &StubCaptureAdapter {
                    response: Err("markdown must not call the capture adapter".to_string()),
                },
            )
            .expect("generate v5");
        assert_eq!(response.thumbnail.status, "ready");
        let info = database.get_thumbnail_info(1).expect("info").expect("v5 ready");
        let expected_key = markdown_default_cover_key(&content_hash("Hero Doc"));
        assert_eq!(
            info.desired_key.as_deref(),
            Some(expected_key.as_str()),
            "v5 key must be the current contract key"
        );
        assert_eq!(info.generation, Some(2), "v4 → v5 must advance generation exactly once");
        let thumb_path = info.path.clone().expect("path");
        assert!(
            thumb_path.ends_with("item-1.2.svg"),
            "v5 must write a new generation-keyed file, got {thumb_path}"
        );
        assert!(Path::new(&thumb_path).exists(), "v5 cache file must exist");
        // 编辑出版式：背景来自八种浅灰之一；唯一左上横线；无色场/书脊。
        let svg = fs::read_to_string(&thumb_path).expect("svg");
        let background = crate::core::thumbnail::MARKDOWN_COVER_BACKGROUNDS
            [crate::core::thumbnail::stable_background_index(&content_hash("Hero Doc"))];
        assert!(
            svg.contains(&format!("fill=\"{background}\"")),
            "background must match stable mapping"
        );
        assert!(
            svg.contains("<rect x=\"96\" y=\"210\" width=\"216\" height=\"6\" fill=\"#5F6366\"/>"),
            "v5 must carry the hover-safe editorial rule"
        );
        assert_eq!(svg.matches("<ellipse").count(), 0, "color field must be gone");
        assert!(!svg.contains("width=\"56\" height=\"720\""), "bookspine must be gone");
        // 旧 v4 文件不再被引用（新 ready 指向 item-1.2.svg）。
        assert_ne!(thumb_path, v4_file.to_string_lossy().to_string());

        let _ = fs::remove_dir_all(source.parent().expect("parent"));
        let _ = fs::remove_file(db_path);
    }

    /// B4 外部扫描合同：只改正文不改标题时保持 ready（key/generation/path 不变，
    /// generated_from_hash 推进）；标题变化时精确失效一次（generation 恰好 +1）。
    #[test]
    fn markdown_external_scan_reconciles_title_key_body_only_and_title_change() {
        let (database, source, db_path) = setup_markdown_item();
        database
            .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                response: Ok(sample_png(b"MD-READY")),
            })
            .expect("generate ready");
        let before = database.get_thumbnail_info(1).expect("info").expect("ready");
        let before_key = before.desired_key.clone().expect("key");
        let before_path = before.path.clone().expect("path");
        let before_generation = before.generation.expect("generation");

        let record = |path: &Path| IndexedItemRecord {
            library_id: 1,
            file_path: path.to_string_lossy().into_owned(),
            relative_path: "a.md".to_string(),
            file_name: "a.md".to_string(),
            file_ext: "md".to_string(),
            file_type: "markdown".to_string(),
            file_size: fs::metadata(path).expect("meta").len() as i64,
            modified_at: file_modified_at_string(&fs::metadata(path).expect("meta")).expect("mtime"),
            created_at: "now".to_string(),
            updated_at: "now".to_string(),
        };

        // body-only 扫描：同标题不同正文。
        fs::write(&source, "# Hero Doc\n\nBody v2").expect("write body v2");
        database
            .replace_items_for_library(1, &[record(&source)])
            .expect("scan body-only");
        let info = database.get_thumbnail_info(1).expect("info").expect("ready kept");
        assert_eq!(
            info.desired_key.as_deref(),
            Some(before_key.as_str()),
            "scan body-only must keep the desired key"
        );
        assert_eq!(info.generation, Some(before_generation), "scan body-only must not bump");
        assert_eq!(info.path.as_deref(), Some(before_path.as_str()));
        let connection = Connection::open(&db_path).expect("open db");
        let generated_hash: Option<String> = connection
            .query_row(
                "SELECT generated_from_hash FROM thumbnail_cache WHERE item_id = 1",
                [],
                |row| row.get(0),
            )
            .expect("generated hash");
        drop(connection);
        assert_eq!(
            generated_hash.as_deref(),
            Some(content_hash("# Hero Doc\n\nBody v2").as_str()),
            "scan body-only must advance generated_from_hash"
        );

        // title-change 扫描：标题变 → 旧 ready 失效、generation 恰好 +1。
        fs::write(&source, "# Scan Title\n\nBody v3").expect("write title");
        database
            .replace_items_for_library(1, &[record(&source)])
            .expect("scan title change");
        assert!(
            database.get_thumbnail_info(1).expect("info").is_none(),
            "old ready must be invalid after a title-change scan"
        );
        let connection = Connection::open(&db_path).expect("open db");
        let (status, generation): (String, i64) = connection
            .query_row(
                "SELECT thumb_status, generation FROM thumbnail_cache WHERE item_id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("thumbnail row");
        drop(connection);
        assert_eq!(status, "stale");
        assert_eq!(
            generation,
            before_generation + 1,
            "scan title change must advance generation exactly once"
        );

        let _ = fs::remove_dir_all(source.parent().expect("parent"));
        let _ = fs::remove_file(db_path);
    }

    /// B4：body-only 保存撞上旧 in-flight 任务——旧任务因磁盘全文 hash 不同被丢弃，
    /// 已有同标题 ready 封面不被错误清除，generation 不额外推进。
    #[test]
    fn body_only_save_with_in_flight_task_discards_stale_task_and_keeps_ready() {
        let _hook_guard = HOOK_TEST_GUARD.lock().unwrap();
        let (database, source, db_path) = setup_markdown_item();
        database
            .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                response: Ok(sample_png(b"MD-READY")),
            })
            .expect("generate ready");
        let before = database.get_thumbnail_info(1).expect("info").expect("ready");
        let before_generation = before.generation.expect("generation");

        // in-flight 任务：hook 阻塞在 claim 之后、SVG 生成之前。
        let (release_tx, release_rx) = mpsc::channel::<()>();
        let release_rx = Arc::new(Mutex::new(release_rx));
        let hook_ran = Arc::new(AtomicBool::new(false));
        let hook_ran_c = hook_ran.clone();
        {
            let mut slot = crate::db::GENERATION_PREPARE_HOOK.lock().unwrap();
            *slot = Some(Arc::new(move || {
                hook_ran_c.store(true, Ordering::SeqCst);
                let _ = release_rx.lock().unwrap().recv();
            }));
        }
        let db_g = database.clone();
        let in_flight = std::thread::spawn(move || {
            crate::db::THUMBNAIL_HOOKS_ACTIVE.with(|active| active.set(true));
            db_g.generate_thumbnail_with_adapter(
                1,
                &StubCaptureAdapter {
                    response: Err("markdown must not call the capture adapter".to_string()),
                },
            )
        });
        let deadline = std::time::Instant::now() + Duration::from_secs(15);
        while !hook_ran.load(Ordering::SeqCst) {
            if std::time::Instant::now() > deadline {
                panic!("generation prepare hook never ran");
            }
            std::thread::sleep(Duration::from_millis(10));
        }

        // in-flight 期间 body-only 保存（同标题，写磁盘 + DB）。
        fs::write(&source, "# Hero Doc\n\nBody v2").expect("write");
        let metadata = fs::metadata(&source).expect("meta");
        let mtime = file_modified_at_string(&metadata).expect("mtime");
        let new_hash = content_hash("# Hero Doc\n\nBody v2");
        database
            .update_markdown_item_content(
                1,
                "summary",
                &mtime,
                &new_hash,
                "# Hero Doc\n\nBody v2",
                "# Hero Doc\n\nBody v2",
                "<h1>Hero Doc</h1>",
            )
            .expect("markdown save");
        // 保存后同标题 ready 封面保持（key 没变）。
        let after_save = database.get_thumbnail_info(1).expect("info").expect("ready kept");
        assert_eq!(after_save.generation, Some(before_generation));

        // 释放 in-flight 任务：磁盘全文 hash 已变 → 必须被丢弃，不得覆盖新 revision。
        let _ = release_tx.send(());
        {
            let mut slot = crate::db::GENERATION_PREPARE_HOOK.lock().unwrap();
            *slot = None;
        }
        let result = in_flight.join().expect("thread").expect("generate");
        assert_eq!(
            result.discarded, true,
            "stale in-flight task must be discarded by the disk full-body hash"
        );
        let final_info = database.get_thumbnail_info(1).expect("info").expect("ready survives");
        assert_eq!(
            final_info.generation,
            Some(before_generation),
            "generation must not be bumped by the stale task"
        );
        assert_eq!(
            final_info.desired_key.as_deref(),
            after_save.desired_key.as_deref(),
            "ready cover must survive the stale in-flight task"
        );

        let _ = fs::remove_dir_all(source.parent().expect("parent"));
        let _ = fs::remove_file(db_path);
    }

    /// 阻塞 1 回归：截图期间源文件被外部**同尺寸**改写（REVISION A → REVISION B，
    /// 字节数相同），且扫描尚未触发（DB file_hash / key / generation 均未感知）时，
    /// 旧任务提交前必须重读磁盘并丢弃，绝不提交错误成图。
    #[test]
    fn late_task_discards_when_source_changed_same_size_during_capture() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            let (adapter, control) = SequencedCaptureAdapter::new();
            // R1 snapshot 磁盘 A → capture 阻塞。
            let db_g = database.clone();
            let adapter_g = adapter.clone();
            let r1 = std::thread::spawn(move || {
                db_g.generate_thumbnail_with_adapter(1, &adapter_g)
            });
            control.wait_until(|| control.captured_count() >= 1);

            // 截图期间同尺寸改写（不 scan、不 invalidate）。
            assert_eq!(
                content_hash("<main>REVISION A</main>").len(),
                content_hash("<main>REVISION B</main>").len(),
                "fixture must be same-size to prove the same-size rewrite case"
            );
            fs::write(&source, "<main>REVISION B</main>").expect("same-size rewrite");

            control.release_with(0, Ok(sample_png(b"R1-PAYLOAD")));
            let result = r1.join().expect("r1 thread").expect("r1 generate");
            // DB key/generation 都没变，但磁盘内容已变 → 必须丢弃。
            assert_eq!(
                result.discarded, true,
                "same-size rewrite during capture must discard the old task"
            );
            assert!(
                database.get_thumbnail_info(1).expect("info").is_none(),
                "no ready may be committed for the discarded task"
            );
            let cache_dir = db_path.parent().expect("parent").join(".cache/thumbnails");
            if cache_dir.exists() {
                let leftovers: Vec<String> = fs::read_dir(&cache_dir)
                    .expect("read cache dir")
                    .flatten()
                    .map(|entry| entry.file_name().to_string_lossy().into_owned())
                    .filter(|name| name.starts_with("item-1."))
                    .collect();
                assert!(
                    leftovers.is_empty(),
                    "a discarded task must not write any artifact: {leftovers:?}"
                );
            }

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    /// 阻塞 2 回归：读取路径只用 file_size 无法识别同尺寸改写；现在 size + 纳秒 mtime
    /// 双比较，外部同尺寸改写且扫描未触发时旧图在读取时即被拒绝（不复活）。
    #[test]
    fn read_path_rejects_same_size_rewrite_without_scan() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"READY-A")),
                })
                .expect("generate a");
            assert!(
                database.get_thumbnail_info(1).expect("info").is_some(),
                "ready before same-size rewrite"
            );

            // 同尺寸改写（REVISION A → REVISION B），不 scan、不 invalidate。
            fs::write(&source, "<main>REVISION B</main>").expect("same-size rewrite");
            std::thread::sleep(Duration::from_millis(5));

            // 读取路径：size 相同但纳秒 mtime 变化 → 拒绝旧图。
            assert!(
                database.get_thumbnail_info(1).expect("info").is_none(),
                "same-size rewrite must invalidate the old ready at read time"
            );
            let listed = database
                .list_items(&ListItemsQuery::default())
                .expect("list");
            assert!(
                listed.items[0].thumbnail.is_none(),
                "list must not resurrect the old image after a same-size rewrite"
            );

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    #[test]
    fn legacy_thumbnail_schema_migrates_forward_and_old_ready_is_not_served() {
        let dir = temp_dir();
        let db_path = dir.join("nutbook-0.6.sqlite3");
        {
            let connection = Connection::open(&db_path).expect("open legacy db");
            connection
                .execute_batch(include_str!(
                    "../../tests/fixtures/database/nutbook-0.6.0-schema.sql"
                ))
                .expect("published 0.6 schema fixture");
        }

        let database = Database::new(&db_path).expect("migrated database");

        // 新列存在（向前迁移成功）。
        let connection = Connection::open(&db_path).expect("open db");
        let columns: Vec<String> = connection
            .prepare("PRAGMA table_info(thumbnail_cache)")
            .expect("pragma")
            .query_map([], |row| row.get::<_, String>(1))
            .expect("columns")
            .collect::<Result<_, _>>()
            .expect("collect columns");
        for column in ["desired_key", "generated_from_key", "render_kind", "generation"] {
            assert!(
                columns.iter().any(|name| name == column),
                "migration must add {column}"
            );
        }

        // 旧 ready 行保留原始状态（status/path），但 generation=0 且无新状态列。
        let (status, thumb_path, generation): (String, String, i64) = connection
            .query_row(
                "SELECT thumb_status, thumb_path, generation
                 FROM thumbnail_cache WHERE item_id = 11",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("legacy thumbnail row");
        assert_eq!(status, "ready");
        assert_eq!(thumb_path, "/fixture/cache/report.png");
        assert_eq!(generation, 0);

        // 旧 ready 行不能作为有效成图返回（generated_from_key NULL / render kind 缺失 /
        // generation=0 / 源文件不存在，任一条都拒绝）。
        assert!(
            database.get_thumbnail_info(11).expect("info").is_none(),
            "legacy ready must not be served after migration"
        );

        // 重新初始化幂等（第二次启动不再 ALTER）。
        Database::new(&db_path).expect("second startup idempotent");

        // 新库（fresh）也必须具备相同新列，schema 等价。
        let fresh_path = dir.join("fresh.sqlite3");
        let _fresh = Database::new(&fresh_path).expect("fresh database");
        let fresh_connection = Connection::open(&fresh_path).expect("open fresh");
        let fresh_columns: Vec<String> = fresh_connection
            .prepare("PRAGMA table_info(thumbnail_cache)")
            .expect("pragma")
            .query_map([], |row| row.get::<_, String>(1))
            .expect("columns")
            .collect::<Result<_, _>>()
            .expect("collect columns");
        for column in ["desired_key", "generated_from_key", "render_kind", "generation"] {
            assert!(
                fresh_columns.iter().any(|name| name == column),
                "fresh database must have {column}"
            );
        }

        let _ = fs::remove_dir_all(&dir);
    }

    /// 回归：HTML 保存后（commit_html_edit → scan_library_once 只更新元数据，
    /// 不更新 HTML 的 file_hash），读路径绝不能用陈旧的 DB file_hash 复活旧图。
    /// 这是用户验收"从 A 改 B 后缩略图没更新"的直接根因回归。
    #[test]
    fn html_save_scan_path_never_resurrects_old_ready_with_stale_db_hash() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            let source_str = source.to_string_lossy().to_string();
            // 1) 生成 REVISION A 的 ready（file_hash 收敛为 hash_A）。
            database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"REVISION-A")),
                })
                .expect("generate ready a");
            assert!(database.get_thumbnail_info(1).expect("info").is_some());
            let hash_a = content_hash("<main>REVISION A</main>");
            let connection = Connection::open(&db_path).expect("open db");
            let db_hash: Option<String> = connection
                .query_row(
                    "SELECT file_hash FROM items WHERE id = 1",
                    [],
                    |row| row.get(0),
                )
                .expect("db file_hash");
            assert_eq!(db_hash.as_deref(), Some(hash_a.as_str()));
            drop(connection);

            // 2) 磁盘改为 REVISION B，然后模拟 commit_html_edit 保存后的
            //    scan_library_once：replace_items_for_library 只更新元数据，
            //    HTML 的 file_hash 保持旧值（正是当前真实保存路径的行为）。
            fs::write(&source, "<main>REVISION B</main>").expect("write revision b");
            database
                .replace_items_for_library(
                    1,
                    &[IndexedItemRecord {
                        library_id: 1,
                        file_path: source_str.clone(),
                        relative_path: "card.html".to_string(),
                        file_name: "card.html".to_string(),
                        file_ext: "html".to_string(),
                        file_type: "html".to_string(),
                        file_size: fs::metadata(&source).expect("meta").len() as i64,
                        modified_at: "2".to_string(),
                        created_at: "now".to_string(),
                        updated_at: "now".to_string(),
                    }],
                )
                .expect("scan after save");

            // 3) 旧 ready 不得被服务：磁盘已是 B，但 DB file_hash 仍是 A 的哈希。
            assert!(
                database.get_thumbnail_info(1).expect("info").is_none(),
                "old REVISION A ready must be invalid immediately after the source changed on disk"
            );
            let listed = database
                .list_items(&ListItemsQuery::default())
                .expect("list");
            assert!(
                listed.items[0].thumbnail.is_none(),
                "list must not resurrect the old REVISION A image from a stale DB hash"
            );

            // 4) 保存路径若精确更新 revision（B1 update_item_revision_and_invalidate），
            //    旧图失效且新 generation 可重新生成。
            let hash_b = content_hash("<main>REVISION B</main>");
            let size_b = fs::metadata(&source).expect("meta").len() as i64;
            database
                .update_item_revision_and_invalidate_impl(1, &source_str, &hash_b, "2", size_b)
                .expect("precise revision update");
            assert!(database.get_thumbnail_info(1).expect("info").is_none());
            let response = database
                .generate_thumbnail_with_adapter(1, &StubCaptureAdapter {
                    response: Ok(sample_png(b"REVISION-B")),
                })
                .expect("generate b");
            assert_eq!(response.thumbnail.status, "ready");
            assert_eq!(
                response.expected_key.as_deref(),
                Some(html_desired_key(&hash_b).as_str())
            );

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    /// B1 Reality Check：真实 Chromium（默认生产 adapter）+ 真实 Database/repository，
    /// 非 mock、非 stub。用 B0 的 editable-thumbnail.html 临时副本验证：
    /// PNG 头/尺寸/文件大小、DB desired key / generated key / render kind /
    /// generation / status / 路径一致、revision 修改后旧 ready 立即失效、
    /// 旧任务晚到不覆盖最终 DB 引用与磁盘成品。
    #[test]
    #[ignore = "launches real Chromium; run manually for the B1 reality check"]
    fn reality_check_real_chromium_generates_png_and_cas_converges() {
        let _env_guard = THUMBNAIL_ENV_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        let Some(chromium) = crate::core::thumbnail::find_local_chromium_executable() else {
            eprintln!("reality check skipped: no local chromium found");
            return;
        };
        let dir = temp_dir();
        let db_path = dir.join("nutbook.sqlite3");
        let source = dir.join("editable-thumbnail.html");
        fs::copy(
            concat!(
                env!("CARGO_MANIFEST_DIR"),
                "/tests/fixtures/card-revisions/editable-thumbnail.html"
            ),
            &source,
        )
        .expect("copy fixture to temp copy");

        // 本 agent 环境（seatbelt 包装的进程树）会拒绝 Chromium 自带的 sandbox 初始化
        // （sandbox initialization failed: Operation not permitted），真实应用在用户
        // 桌面环境不需要 --no-sandbox（B0 Gate 已用同一二进制真实通过）。这里只做
        // 环境适配：用同目录 wrapper 注入 --no-sandbox，capture pipeline 完全真实。
        let wrapper = dir.join("chromium-nosandbox.sh");
        fs::write(
            &wrapper,
            format!("#!/bin/sh\nexec \"{}\" --no-sandbox \"$@\"\n", chromium.display()),
        )
        .expect("write wrapper");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&wrapper, fs::Permissions::from_mode(0o755))
                .expect("chmod wrapper");
        }
        std::env::set_var("NUTBOOK_CHROME_PATH", &wrapper);

        let database = Database::new(&db_path).expect("db");
        database
            .upsert_library(library(1, "Reality", dir.to_string_lossy().as_ref(), "folder"))
            .expect("library");
        database
            .replace_items_for_library(
                1,
                &[IndexedItemRecord {
                    library_id: 1,
                    file_path: source.to_string_lossy().to_string(),
                    relative_path: "editable-thumbnail.html".to_string(),
                    file_name: "editable-thumbnail.html".to_string(),
                    file_ext: "html".to_string(),
                    file_type: "html".to_string(),
                    file_size: fs::metadata(&source).expect("meta").len() as i64,
                    modified_at: "1".to_string(),
                    created_at: "now".to_string(),
                    updated_at: "now".to_string(),
                }],
            )
            .expect("item");

        // 1) 真实 capture（默认生产 adapter，不经任何注入）。
        let response = database.generate_thumbnail(1).expect("generate");
        assert_eq!(response.thumbnail.status, "ready", "real capture must be ready");
        let path = response.thumbnail.path.expect("path");
        let bytes = fs::read(&path).expect("read png");
        assert!(bytes.starts_with(b"\x89PNG\r\n\x1a\n"), "PNG header");
        let width = u32::from_be_bytes(bytes[16..20].try_into().expect("ihdr width"));
        let height = u32::from_be_bytes(bytes[20..24].try_into().expect("ihdr height"));
        assert_eq!((width, height), (1280, 720), "PNG must be 1280x720");
        assert!(bytes.len() > 2000, "PNG must be a real render, got {} bytes", bytes.len());

        // DB 状态：desired key / generated key / render kind / generation / status / 路径一致。
        let info = database.get_thumbnail_info(1).expect("info").expect("ready");
        assert_eq!(info.status, "ready");
        assert_eq!(info.desired_key, response.expected_key);
        assert_eq!(info.render_kind.as_deref(), Some(RENDER_KIND_HTML_SCREENSHOT));
        assert_eq!(info.generation, Some(response.generation));
        assert_eq!(info.path.as_deref(), Some(path.as_str()));
        assert!(
            info.path.as_deref().expect("path").ends_with("item-1.1.png"),
            "first generation file path"
        );

        // 2) 修改源文件 revision（REVISION A → REVISION B）→ 旧 ready 立即失效。
        let raw_a = fs::read_to_string(&source).expect("read source");
        let raw_b = raw_a.replace("REVISION A", "REVISION B");
        fs::write(&source, &raw_b).expect("write revision b");
        let hash_b = content_hash(&raw_b);
        let size_b = raw_b.len() as i64;
        database
            .update_item_revision_and_invalidate_impl(
                1,
                &source.to_string_lossy(),
                &hash_b,
                "2",
                size_b,
            )
            .expect("invalidate b");
        assert!(
            database.get_thumbnail_info(1).expect("info").is_none(),
            "old ready must be invalid immediately after revision update"
        );

        // 3) 重新生成 → 新 generation 成为 DB 引用与磁盘成品；旧文件清理。
        let response_b = database.generate_thumbnail(1).expect("generate b");
        assert_eq!(response_b.thumbnail.status, "ready");
        assert_ne!(
            response_b.expected_key, response.expected_key,
            "key must change with the source revision"
        );
        assert!(
            response_b
                .thumbnail
                .path
                .as_deref()
                .expect("path")
                .ends_with("item-1.2.png"),
            "regeneration must use generation 2 file"
        );
        assert_eq!(
            database.get_thumbnail_info(1).expect("info").expect("ready").generation,
            Some(2)
        );
        let cache_dir = Path::new(&path).parent().expect("cache dir");
        let leftovers: Vec<String> = fs::read_dir(cache_dir)
            .expect("read cache dir")
            .flatten()
            .map(|entry| entry.file_name().to_string_lossy().into_owned())
            .filter(|name| name.starts_with("item-1."))
            .collect();
        assert_eq!(leftovers, vec!["item-1.2.png".to_string()], "old generation file must be cleaned");

        // 4) 制造旧任务晚到：可控 adapter 在 revision C 之后完成 → discarded，
        //    最终 DB 引用与磁盘成品仍属于新 generation，不被旧任务覆盖。
        let (adapter, control) = SequencedCaptureAdapter::new();
        let db_late = database.clone();
        let adapter_late = adapter.clone();
        let late = std::thread::spawn(move || {
            db_late.generate_thumbnail_with_adapter(1, &adapter_late)
        });
        control.wait_until(|| control.captured_count() >= 1);
        let raw_c = raw_b.replace("REVISION B", "REVISION C");
        fs::write(&source, &raw_c).expect("write revision c");
        let hash_c = content_hash(&raw_c);
        let size_c = raw_c.len() as i64;
        database
            .update_item_revision_and_invalidate_impl(
                1,
                &source.to_string_lossy(),
                &hash_c,
                "3",
                size_c,
            )
            .expect("invalidate c");
        control.release_with(0, Ok(sample_png(b"LATE-PAYLOAD")));
        let late_result = late.join().expect("late thread").expect("late generate");
        assert_eq!(late_result.discarded, true, "late task must be discarded");
        assert!(database.get_thumbnail_info(1).expect("info").is_none());
        let leftovers: Vec<String> = fs::read_dir(cache_dir)
            .expect("read cache dir")
            .flatten()
            .map(|entry| entry.file_name().to_string_lossy().into_owned())
            .filter(|name| name.starts_with("item-1."))
            .collect();
        assert_eq!(
            leftovers,
            vec!["item-1.2.png".to_string()],
            "late task must not write any file for the stale generation"
        );

        std::env::remove_var("NUTBOOK_CHROME_PATH");
        let _ = fs::remove_dir_all(&dir);
    }

    // ------------------------------------------------------------------
    // B1 审查阻塞回归测试（第二轮）：磁盘正文 / 事务边界 / placeholder CAS /
    // 精确 render kind / 缓存文件存在性 / 保存路径 mtime 与 marker。
    // ------------------------------------------------------------------

    /// B4 边界 #4：Markdown 封面的标题与 desired key 必须来自**同一次磁盘 snapshot**
    /// 的 DocumentTitle.display_text，禁止回落到可能陈旧的 items.title 或
    /// item_content.raw_text。DB 元数据陈旧（扫描未跑、编辑缓存未刷新）时，
    /// 封面与 key 必须仍然反映磁盘正文。
    #[test]
    fn markdown_cover_uses_disk_snapshot_title_not_stale_db_title() {
        let (database, source, db_path) = setup_markdown_item();
        // DB 元数据保持陈旧：items.title 与 item_content.raw_text 都是与磁盘正文
        // 标题（"Hero Doc"）不同的旧值。磁盘正文不做任何改写。
        let connection = Connection::open(&db_path).expect("open db");
        connection
            .execute("UPDATE items SET title = 'Stale DB Title' WHERE id = 1", [])
            .expect("seed stale items.title");
        connection
            .execute(
                "INSERT INTO item_content (item_id, source_text, raw_text, rendered_cache,
                                           extracted_title, updated_at)
                 VALUES (1, ?1, ?1, '<p>stale A body</p>', NULL, '1')
                 ON CONFLICT(item_id) DO UPDATE SET
                    source_text = excluded.source_text,
                    raw_text = excluded.raw_text",
                params!["# Raw Cached Title\n\nBody"],
            )
            .expect("seed stale item_content with a different title");
        drop(connection);

        // 生成不依赖 Chromium / adapter：传入必失败的 adapter 证明其未被调用。
        let response = database
            .generate_thumbnail_with_adapter(
                1,
                &StubCaptureAdapter {
                    response: Err("markdown must not call the capture adapter".to_string()),
                },
            )
            .expect("generate");
        assert_eq!(response.thumbnail.status, "ready");

        // desired key 必须基于磁盘 snapshot 的 DocumentTitle.display_text（"Hero Doc"），
        // 而不是 stale items.title（"Stale DB Title"）或 stale raw_text 的标题。
        let expected = markdown_default_cover_key(&content_hash("Hero Doc"));
        let info = database.get_thumbnail_info(1).expect("info").expect("ready");
        assert_eq!(info.desired_key.as_deref(), Some(expected.as_str()));
        assert_eq!(
            info.render_kind.as_deref(),
            Some(RENDER_KIND_MARKDOWN_DEFAULT_COVER)
        );
        // generated_from_hash 仍是全文 content hash（source-revision CAS 校验用）。
        let connection = Connection::open(&db_path).expect("open db");
        let generated_hash: Option<String> = connection
            .query_row(
                "SELECT generated_from_hash FROM thumbnail_cache WHERE item_id = 1",
                [],
                |row| row.get(0),
            )
            .expect("generated hash");
        drop(connection);
        assert_eq!(
            generated_hash.as_deref(),
            Some(content_hash("# Hero Doc\n\nBody").as_str()),
            "generated_from_hash must be the disk body hash"
        );
        // 封面 SVG 展示磁盘标题，绝不展示 stale DB 标题。
        let thumb_path = response.thumbnail.path.expect("path");
        let svg = fs::read_to_string(&thumb_path).expect("read svg");
        assert!(svg.contains("Hero Doc"), "cover must show the disk snapshot title");
        assert!(
            !svg.contains("Stale DB Title"),
            "cover must not use stale items.title"
        );
        assert!(
            !svg.contains("Raw Cached Title"),
            "cover must not use stale item_content.raw_text"
        );

        let _ = fs::remove_dir_all(source.parent().expect("parent"));
        let _ = fs::remove_file(db_path);
    }

    /// B4 验收路径：card-revisions 真实 fixture 走完整生成管线（索引 → snapshot →
    /// 内存 SVG → CAS ready）。封面标题与 desired key 必须同源——都来自同一磁盘
    /// 正文的 DocumentTitle.display_text；无 H1 fixture 回退到文件名；长标题确定性
    /// 换行且不产生陈旧标题泄漏。生成不依赖 Chromium / adapter。
    #[test]
    fn markdown_default_cover_acceptance_uses_card_revisions_fixtures() {
        let fixtures_dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/card-revisions");
        let cases = [
            ("markdown-default-cover.md", false),
            ("markdown-no-h1.md", true),
            ("markdown-frontmatter-fake-h1.md", false), // frontmatter 后正文有真实 H1
            ("markdown-code-fence-h1.md", false),       // 文件顶部有真实 H1，fence 内为假 H1
            ("markdown-setext-h1.md", false),
            ("markdown-aligned-h1.md", false),
            ("markdown-multiple-h1.md", false),
            ("markdown-long-cjk-title.md", false),
            ("markdown-long-latin-title.md", false),
        ];
        for (file_name, expect_fallback) in cases {
            let source_path = fixtures_dir.join(file_name);
            let raw = fs::read_to_string(&source_path).expect("read fixture");
            let title = crate::core::document_title::DocumentTitle::parse(&raw, file_name);
            assert_eq!(
                title.is_file_name_fallback, expect_fallback,
                "fixture {file_name} fallback expectation mismatch"
            );
            let expected_title = title.display_text.clone();

            let (database, _, db_path) = setup_markdown_item_from(&source_path, file_name);
            let response = database
                .generate_thumbnail_with_adapter(
                    1,
                    &StubCaptureAdapter {
                        response: Err("markdown must not call the capture adapter".to_string()),
                    },
                )
                .expect("generate");
            assert_eq!(response.thumbnail.status, "ready", "fixture {file_name}");
            // key / render kind 契约：md-default:<title-hash>:title-parser-v1:default-cover-v5。
            let expected_key = markdown_default_cover_key(&content_hash(&expected_title));
            assert_eq!(
                response.expected_key.as_deref(),
                Some(expected_key.as_str()),
                "fixture {file_name}"
            );
            assert_eq!(
                response.thumbnail.render_kind.as_deref(),
                Some(RENDER_KIND_MARKDOWN_DEFAULT_COVER),
                "fixture {file_name}"
            );
            // 封面展示与 key 同源的标题（长标题至少展示开头部分），无陈旧标题泄漏。
            let thumb_path = response.thumbnail.path.expect("path");
            let svg = fs::read_to_string(&thumb_path).expect("read svg");
            let prefix: String = expected_title.chars().take(6).collect();
            assert!(
                svg.contains(&prefix),
                "fixture {file_name}: cover must contain disk title prefix {prefix:?}"
            );
            assert!(
                !svg.contains("Stale"),
                "fixture {file_name}: cover must not contain stale titles"
            );
            // 只清理临时 DB 目录；fixture 文件原地保留。
            let _ = fs::remove_dir_all(db_path.parent().expect("parent"));
        }
    }

    /// 阻塞 2：生成阶段（B4：Markdown 静态 SVG 封面在内存中生成前）期间，
    /// 另一个数据库连接必须能完成写事务。hook 覆盖的是 claim 之后、SVG 生成的
    /// 纯内存边界（不调用 Chromium / adapter）——若该阶段仍持有事务/连接锁，
    /// 写会 SQLITE_BUSY。
    #[test]
    fn source_preparation_does_not_hold_database_write_transaction() {
        let _hook_guard = HOOK_TEST_GUARD.lock().unwrap();
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_markdown_item();
            let hook_ran = Arc::new(AtomicBool::new(false));
            let write_ok = Arc::new(AtomicBool::new(false));
            let hook_ran_c = hook_ran.clone();
            let write_ok_c = write_ok.clone();
            let db_path_c = db_path.clone();
            {
                let mut slot = crate::db::GENERATION_PREPARE_HOOK.lock().unwrap();
                *slot = Some(Arc::new(move || {
                    // 从第二个连接开一个写事务；若 prepare 阶段仍持有数据库事务，
                    // BEGIN IMMEDIATE 会因锁而失败（SQLITE_BUSY）。
                    let connection = Connection::open(&db_path_c).expect("second connection");
                    let ok = connection
                        .execute_batch(
                            "BEGIN IMMEDIATE;
                             UPDATE items SET updated_at = 'prep-hook' WHERE id = 1;
                             COMMIT;",
                        )
                        .is_ok();
                    write_ok_c.store(ok, Ordering::SeqCst);
                    hook_ran_c.store(true, Ordering::SeqCst);
                }));
            }

            let db_g = database.clone();
            let generation = std::thread::spawn(move || {
                crate::db::THUMBNAIL_HOOKS_ACTIVE.with(|active| active.set(true));
                db_g.generate_thumbnail_with_adapter(
                    1,
                    &StubCaptureAdapter {
                        response: Ok(sample_png(b"PREP-HOOK")),
                    },
                )
            });

            let deadline = std::time::Instant::now() + Duration::from_secs(15);
            while !hook_ran.load(Ordering::SeqCst) {
                if std::time::Instant::now() > deadline {
                    panic!("generation prepare hook never ran");
                }
                std::thread::sleep(Duration::from_millis(10));
            }
            // 清理 hook：必须在 join 前，避免残留 hook 影响其他测试。
            {
                let mut slot = crate::db::GENERATION_PREPARE_HOOK.lock().unwrap();
                *slot = None;
            }
            assert!(
                write_ok.load(Ordering::SeqCst),
                "a concurrent write transaction must succeed while source preparation runs"
            );

            let response = generation.join().expect("thread").expect("generate");
            assert_eq!(response.thumbnail.status, "ready");

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    /// 阻塞 4：placeholder task 阻塞期间 source revision 更新并 invalidate generation；
    /// 释放旧 task 后：旧 task discarded=true、新 generation 没被写成 failed（保持
    /// stale）、旧 ready 没有通过响应复活。
    #[test]
    fn placeholder_old_task_discards_when_generation_advanced_during_block() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            let source_str = source.to_string_lossy().to_string();

            // 先产生一个真实 ready（gen1 K_A），作为"旧 ready"。
            database
                .generate_thumbnail_with_adapter(
                    1,
                    &StubCaptureAdapter {
                        response: Ok(sample_png(b"FIRST-READY")),
                    },
                )
                .expect("first ready");
            assert_eq!(
                database.get_thumbnail_info(1).expect("info").expect("ready").status,
                "ready"
            );

            // 旧任务 R1 开始（key 相同复用 gen1）→ capture 阻塞。
            let (adapter, control) = SequencedCaptureAdapter::new();
            let db_a = database.clone();
            let adapter_a = adapter.clone();
            let r1 = std::thread::spawn(move || {
                db_a.generate_thumbnail_with_adapter(1, &adapter_a)
            });
            control.wait_until(|| control.captured_count() >= 1);

            // 期间更新 source revision 并 invalidate generation → stale + K_B + gen2。
            let hash_b = content_hash("<main>REVISION B</main>");
            let size_b = fs::metadata(&source).expect("metadata").len() as i64;
            database
                .update_item_revision_and_invalidate_impl(
                    1, &source_str, &hash_b, "2", size_b,
                )
                .expect("precise invalidate");

            // 释放旧任务：capture 返回引擎失败 → Auto 回退 placeholder。
            control.release_with(0, Err("engine exploded".to_string()));
            let r1_result = r1.join().expect("thread").expect("generate");

            // 旧 task 必须 discarded，且携带当前 expected key（K_B）。
            assert_eq!(r1_result.discarded, true, "old placeholder task must be discarded");
            assert_eq!(
                r1_result.expected_key.as_deref(),
                Some(html_desired_key(&hash_b).as_str())
            );

            // 新 generation 没被写成 failed：仍是 stale。
            let connection = Connection::open(&db_path).expect("open db");
            let status: String = connection
                .query_row(
                    "SELECT thumb_status FROM thumbnail_cache WHERE item_id = 1",
                    [],
                    |row| row.get(0),
                )
                .expect("thumbnail row");
            drop(connection);
            assert_eq!(
                status, "stale",
                "new generation must remain stale, not be marked failed by the old task"
            );

            // 旧 ready 没通过响应复活：读路径 key/generation 不匹配 → None。
            assert!(
                database.get_thumbnail_info(1).expect("info").is_none(),
                "old ready must not resurrect"
            );

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    /// 阻塞 5-1：HTML desired key 正确但 render_kind 被改成 markdown-html-screenshot，
    /// 读取（详情 + 列表）必须返回 None。
    #[test]
    fn read_path_rejects_html_row_marked_with_markdown_render_kind() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            database
                .generate_thumbnail_with_adapter(
                    1,
                    &StubCaptureAdapter {
                        response: Ok(sample_png(b"OK")),
                    },
                )
                .expect("ready");
            assert!(
                database.get_thumbnail_info(1).expect("info").is_some(),
                "ready before tamper"
            );

            let connection = Connection::open(&db_path).expect("open db");
            connection
                .execute(
                    "UPDATE thumbnail_cache SET render_kind = 'markdown-html-screenshot' WHERE item_id = 1",
                    [],
                )
                .expect("tamper render kind");
            drop(connection);

            assert!(
                database.get_thumbnail_info(1).expect("info").is_none(),
                "html row with markdown render kind must not be served"
            );
            let listed = database
                .list_items(&ListItemsQuery::default())
                .expect("list");
            assert!(
                listed.items[0].thumbnail.is_none(),
                "list must also reject the mismatched render kind"
            );

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    /// 阻塞 5-2：Markdown desired key 正确但 render_kind 被改成 html-screenshot，
    /// 读取必须返回 None。
    #[test]
    fn read_path_rejects_markdown_row_marked_with_html_render_kind() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_markdown_item();
            database
                .generate_thumbnail_with_adapter(
                    1,
                    &StubCaptureAdapter {
                        response: Ok(sample_png(b"OK")),
                    },
                )
                .expect("ready");
            assert!(
                database.get_thumbnail_info(1).expect("info").is_some(),
                "ready before tamper"
            );

            let connection = Connection::open(&db_path).expect("open db");
            connection
                .execute(
                    "UPDATE thumbnail_cache SET render_kind = 'html-screenshot' WHERE item_id = 1",
                    [],
                )
                .expect("tamper render kind");
            drop(connection);

            assert!(
                database.get_thumbnail_info(1).expect("info").is_none(),
                "markdown row with html render kind must not be served"
            );
            let listed = database
                .list_items(&ListItemsQuery::default())
                .expect("list");
            assert!(
                listed.items[0].thumbnail.is_none(),
                "list must also reject the mismatched render kind"
            );

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    /// 阻塞 5-3：成功生成后删除实际 PNG，get_thumbnail_info 与 list_items 都必须返回
    /// thumbnail=None；再次生成后恢复 ready。
    #[test]
    fn read_path_returns_none_when_cache_png_deleted_then_regeneration_recovers() {
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            let response = database
                .generate_thumbnail_with_adapter(
                    1,
                    &StubCaptureAdapter {
                        response: Ok(sample_png(b"OK")),
                    },
                )
                .expect("ready");
            let thumb_path = response.thumbnail.path.clone().expect("path");
            assert!(Path::new(&thumb_path).is_file(), "png written");
            assert!(database.get_thumbnail_info(1).expect("info").is_some());

            // 删除实际 PNG：读取必须返回 None（详情 + 列表）。
            fs::remove_file(&thumb_path).expect("delete png");
            assert!(
                database.get_thumbnail_info(1).expect("info").is_none(),
                "deleted png must not be served as ready"
            );
            let listed = database
                .list_items(&ListItemsQuery::default())
                .expect("list");
            assert!(
                listed.items[0].thumbnail.is_none(),
                "list must not serve a deleted png"
            );

            // 再次生成后恢复 ready。
            let response2 = database
                .generate_thumbnail_with_adapter(
                    1,
                    &StubCaptureAdapter {
                        response: Ok(sample_png(b"OK-2")),
                    },
                )
                .expect("regenerate");
            assert_eq!(response2.thumbnail.status, "ready");
            assert!(
                database.get_thumbnail_info(1).expect("info").is_some(),
                "regenerated ready must be served again"
            );

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }

    /// 阻塞 6-1：durable save 拿不到真实 mtime（None）时：source 仍算成功、索引
    /// 同步 pending、写入 reconciliation marker，且**不**污染 index（不写伪造
    /// 零纳秒 mtime，items.file_hash / modified_at 保持原值）。
    #[test]
    fn sync_without_metadata_writes_marker_without_touching_index() {
        let (database, source, db_path) = setup_html_item();
        // 先建 ready（claim 收敛 index），拿到基准 hash。
        database
            .generate_thumbnail_with_adapter(
                1,
                &StubCaptureAdapter {
                    response: Ok(sample_png(b"OK")),
                },
            )
            .expect("ready");
        let before = database.get_item_detail(1).expect("detail");
        let before_hash = before.file_hash.clone();

        let report = database.sync_item_revision_after_durable_save(
            1,
            &source.to_string_lossy(),
            "dummy-hash",
            None,
            42,
        );
        assert_eq!(report.source_saved, true, "durable save stays successful");
        assert_eq!(report.index_synchronized, false, "index sync is pending");

        // index 未被伪造 mtime 污染。
        let after = database.get_item_detail(1).expect("detail");
        assert_eq!(
            after.file_hash.as_deref(),
            before_hash.as_deref(),
            "index must not be touched when mtime is unavailable"
        );

        // marker 已写且保留（重放前不得被删除）。
        let marker_path = db_path
            .parent()
            .expect("parent")
            .join(".cache/reconcile/reconcile-1.json");
        assert!(marker_path.exists(), "marker must be written");

        let _ = fs::remove_dir_all(source.parent().expect("parent"));
        let _ = fs::remove_file(db_path);
    }

    /// 阻塞 6-2：mtime 不可用 → marker 保留；磁盘恢复（文件可用）后重放以磁盘
    /// 真实 hash / 纳秒 mtime / size 收敛，成功后删除 marker。
    #[test]
    fn marker_replay_after_disk_recovers_uses_real_values_and_deletes_marker() {
        let (database, source, db_path) = setup_html_item();
        let report = database.sync_item_revision_after_durable_save(
            1,
            &source.to_string_lossy(),
            "dummy-hash",
            None,
            99,
        );
        assert_eq!(report.index_synchronized, false);
        let marker_path = db_path
            .parent()
            .expect("parent")
            .join(".cache/reconcile/reconcile-1.json");
        assert!(marker_path.exists(), "marker written while mtime unavailable");

        // 磁盘文件真实存在：重放以磁盘为状态源收敛并删除 marker。
        let replayed = database.replay_reconciliation_markers().expect("replay");
        assert_eq!(replayed, 1, "one marker replayed");
        assert!(
            !marker_path.exists(),
            "marker must be deleted only after sync truly succeeds"
        );

        let raw = fs::read_to_string(&source).expect("read source");
        let metadata = fs::metadata(&source).expect("metadata");
        let real_mtime =
            crate::core::document::file_modified_at_string(&metadata).expect("mtime");
        let connection = Connection::open(&db_path).expect("open db");
        let (hash, size, mtime): (Option<String>, i64, String) = connection
            .query_row(
                "SELECT file_hash, file_size, modified_at FROM items WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("items row");
        drop(connection);
        assert_eq!(
            hash.as_deref(),
            Some(content_hash(&raw).as_str()),
            "replay must converge to the real disk hash"
        );
        assert_eq!(size, metadata.len() as i64, "replay must converge to real size");
        assert_eq!(
            mtime, real_mtime,
            "replay must use the real nanosecond mtime, not the empty placeholder"
        );

        let _ = fs::remove_dir_all(source.parent().expect("parent"));
        let _ = fs::remove_file(db_path);
    }

    /// 阻塞 A：保存发生在 snapshot（阶段 2）与 claim（阶段 3a）之间时，claim 必须
    /// 复核阶段 1 读取的 file_hash / file_size / modified_at——旧 snapshot 绝不能把
    /// desired_key 从新 revision 倒退成旧值，也不能额外推进 generation。
    #[test]
    fn save_between_snapshot_and_claim_supersedes_old_snapshot() {
        let _hook_guard = HOOK_TEST_GUARD.lock().unwrap();
        with_fake_chromium_env(|| {
            let (database, source, db_path) = setup_html_item();
            let source_str = source.to_string_lossy().to_string();
            // B2：扫描 seed 本身按"与保存一致"的语义失效，初始行已是 stale + gen1。
            // 记录 setup 后的 generation，断言并发保存只在此基础上递增一次（0→1 的
            // 旧绝对断言已被取代），stale snapshot 的 claim 不得再额外推进。
            let setup_generation: i64 = {
                let connection = Connection::open(&db_path).expect("open db");
                let generation: i64 = connection
                    .query_row(
                        "SELECT generation FROM thumbnail_cache WHERE item_id = 1",
                        [],
                        |row| row.get(0),
                    )
                    .expect("setup thumbnail row");
                drop(connection);
                generation
            };
            assert!(setup_generation >= 1, "scan seed must already register a stale desired state");

            // prepare 与 claim 之间：另一路径把 revision 保存为 B（精确 update + invalidate）。
            let db_hook = database.clone();
            let source_hook = source_str.clone();
            let hook_ran = Arc::new(AtomicBool::new(false));
            let hook_ran_c = hook_ran.clone();
            {
                let mut slot = crate::db::GENERATION_CLAIM_HOOK.lock().unwrap();
                *slot = Some(Arc::new(move || {
                    let hash_b = content_hash("<main>REVISION B</main>");
                    let size_b = fs::metadata(&source_hook).expect("metadata").len() as i64;
                    db_hook
                        .update_item_revision_and_invalidate_impl(
                            1, &source_hook, &hash_b, "2", size_b,
                        )
                        .expect("concurrent save to B between snapshot and claim");
                    hook_ran_c.store(true, Ordering::SeqCst);
                }));
            }

            let db_g = database.clone();
            let generation = std::thread::spawn(move || {
                crate::db::THUMBNAIL_HOOKS_ACTIVE.with(|active| active.set(true));
                db_g.generate_thumbnail_with_adapter(
                    1,
                    &StubCaptureAdapter {
                        response: Ok(sample_png(b"SHOULD-NOT-COMMIT")),
                    },
                )
            });
            let deadline = std::time::Instant::now() + Duration::from_secs(15);
            while !hook_ran.load(Ordering::SeqCst) {
                if std::time::Instant::now() > deadline {
                    panic!("claim hook never ran");
                }
                std::thread::sleep(Duration::from_millis(10));
            }
            // 清理 hook：必须在 join 前。
            {
                let mut slot = crate::db::GENERATION_CLAIM_HOOK.lock().unwrap();
                *slot = None;
            }

            let response = generation.join().expect("thread").expect("generate");
            assert_eq!(
                response.discarded, true,
                "old snapshot superseded by concurrent save must be discarded"
            );
            let hash_b = content_hash("<main>REVISION B</main>");
            assert_eq!(
                response.expected_key.as_deref(),
                Some(html_desired_key(&hash_b).as_str()),
                "discarded response must carry the current B key"
            );

            // desired_key 没有倒退成 A，generation 没有额外推进（保持 invalidate 后的 gen2）。
            let connection = Connection::open(&db_path).expect("open db");
            let (desired, gen, status): (String, i64, String) = connection
                .query_row(
                    "SELECT desired_key, generation, thumb_status FROM thumbnail_cache WHERE item_id = 1",
                    [],
                    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
                )
                .expect("thumbnail row");
            let file_hash: Option<String> = connection
                .query_row(
                    "SELECT file_hash FROM items WHERE id = 1",
                    [],
                    |row| row.get(0),
                )
                .expect("items hash");
            drop(connection);
            assert_eq!(
                desired, html_desired_key(&hash_b),
                "desired_key must stay at B, not regress to A"
            );
            // generation 只被并发 invalidate 递增过一次（setup_gen → setup_gen+1）；
            // stale snapshot 的 claim 被拒绝，没有把 generation 额外推进（若倒退会
            // 发生第二次递增）。
            assert_eq!(
                gen, setup_generation + 1,
                "generation must not be advanced by the stale snapshot"
            );
            assert_eq!(status, "stale", "thumbnail stays stale from the concurrent save");
            assert_eq!(
                file_hash.as_deref(),
                Some(hash_b.as_str()),
                "items.file_hash must stay at B"
            );

            // 磁盘零产物：旧 snapshot 没有写任何 PNG。
            let cache_dir = db_path.parent().expect("parent").join(".cache/thumbnails");
            let files: Vec<String> = if cache_dir.exists() {
                fs::read_dir(&cache_dir)
                    .expect("read cache")
                    .flatten()
                    .map(|entry| entry.file_name().to_string_lossy().into_owned())
                    .filter(|name| name.starts_with("item-1."))
                    .collect()
            } else {
                vec![]
            };
            assert_eq!(files, Vec::<String>::new(), "superseded task must not write files");

            let _ = fs::remove_dir_all(source.parent().expect("parent"));
            let _ = fs::remove_file(db_path);
        });
    }
}
