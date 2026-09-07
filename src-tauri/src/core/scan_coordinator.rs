use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicU64, Ordering},
        Arc, Mutex,
    },
};

use crate::{
    commands::library::{scan_library_once, LibraryScanSnapshot},
    db::repositories::LibraryRepository,
    db::Database,
    errors::AppError,
    models::{ScanDelta, ScanDeltaReport},
};

/// 单个 library 的扫描串行锁 + 启动期 catch-up 队列。
///
/// 设计目标：
/// - scan / delete / repair 对同一 library 必须串行：所有写库扫描统一经过
///   [`ScanCoordinator::run_scan`]，对同一 library 持同一把锁。
/// - catch-up 不丢请求：用 pending 集合 + 持续 drain 的 worker，运行期间
///   新增的来源会合并进 pending，不会被单个 running flag 丢弃。
/// - 同一 (library_id, root) generation 只做一次启动 catch-up：已 pending、
///   in-flight 或 done 的同 generation 都不得重复入队；完成后记录 done，
///   重复 `sync_library_watchers` 不会再次全量扫描已完成来源。
///
/// worker 线程只持有本结构 clone（内部 Arc），不持有 AppState，避免生命周期问题。
#[derive(Debug, Clone)]
pub struct ScanCoordinator {
    inner: Arc<ScanCoordinatorInner>,
}
#[derive(Debug)]
struct ScanCoordinatorInner {
    database: Database,
    scan_locks: Mutex<HashMap<i64, Arc<Mutex<()>>>>,
    /// 全局 DB 写锁：SQLite 单文件同一时刻只能有一个写事务。
    /// per-library 锁只保证同一 library 串行；不同 library 的 scan / delete /
    /// repair 仍会并发写库，必须再经此全局锁互斥，否则 busy_timeout 下
    /// 仍可能出现偶发 DatabaseError。
    db_write_lock: Arc<Mutex<()>>,
    /// 已排队等待 catch-up 的 (library_id -> root generation)。
    catch_up_pending: Mutex<HashMap<i64, String>>,
    /// worker 正在扫描的 (library_id -> root generation)。
    catch_up_in_flight: Mutex<HashMap<i64, String>>,
    /// 已完成 catch-up 的 (library_id -> root generation)。
    catch_up_done: Mutex<HashMap<i64, String>>,
    catch_up_worker_running: Mutex<bool>,
    /// catch-up 扫描计数（确定性测试用）。
    catch_up_scan_count: AtomicU64,
    /// PR A watcher fence（计划 4.3/4.4）：每个 library 的当前 watcher generation。
    /// 接入合并 / repair / 删除来源时 bump；旧 watcher 捕获的 generation 与当前
    /// 不一致时，其事件批次整体丢弃，不回写已删除/已合并来源。
    watch_generations: Mutex<HashMap<i64, u64>>,
    /// R4/R5 P1：路径 inode 缓存（unix，目录 + 候选文件通用）。watcher 构建
    /// 时与批次内记录「仍然存在的路径」的 inode；批次内消失路径的缓存 inode
    /// 与出现路径的当前 inode 相等，才是明确的旧→新 rename 关联（inode 是
    /// 内核赋予的文件身份，rename 不改变它）。无缓存 / 非 unix / 超预算一律
    /// 不参与配对，走保守收敛。
    path_inodes: Mutex<HashMap<String, u64>>,
}

impl ScanCoordinator {
    pub fn new(database: Database) -> Self {
        Self {
            inner: Arc::new(ScanCoordinatorInner {
                database,
                scan_locks: Mutex::new(HashMap::new()),
                db_write_lock: Arc::new(Mutex::new(())),
                catch_up_pending: Mutex::new(HashMap::new()),
                catch_up_in_flight: Mutex::new(HashMap::new()),
                catch_up_done: Mutex::new(HashMap::new()),
                catch_up_worker_running: Mutex::new(false),
                catch_up_scan_count: AtomicU64::new(0),
                watch_generations: Mutex::new(HashMap::new()),
                path_inodes: Mutex::new(HashMap::new()),
            }),
        }
    }

    fn lock_for(&self, library_id: i64) -> Arc<Mutex<()>> {
        let mut locks = self
            .inner
            .scan_locks
            .lock()
            .expect("scan locks mutex poisoned");
        locks
            .entry(library_id)
            .or_insert_with(|| Arc::new(Mutex::new(())))
            .clone()
    }

    /// 全局 DB 写锁（delete / repair 等外层生命周期使用，保证任意两个
    /// 写库操作不同时进行）。
    pub fn db_write_lock(&self) -> Arc<Mutex<()>> {
        Arc::clone(&self.inner.db_write_lock)
    }

    /// 持 per-library 锁 + 全局 DB 写锁执行一次扫描；写库前重新确认
    /// library 仍存在且 path_state 有效（删除后到达的旧请求直接跳过）。
    pub fn run_scan(&self, library_id: i64) -> Result<LibraryScanSnapshot, AppError> {
        self.inner.catch_up_scan_count.fetch_add(1, Ordering::Relaxed);
        let lock = self.lock_for(library_id);
        let _guard = lock.lock().expect("scan lock poisoned");
        let _db = self
            .inner
            .db_write_lock
            .lock()
            .expect("db write lock poisoned");
        self.run_scan_without_locks(library_id)
    }

    /// 调用方必须已持有同一 library 的锁和全局 DB 写锁（见 [`Self::run_scan`]），
    /// 用于 delete / repair 等外层生命周期操作内部复用，避免自死锁。
    pub fn run_scan_without_locks(&self, library_id: i64) -> Result<LibraryScanSnapshot, AppError> {
        scan_library_once(&self.inner.database, library_id)
    }

    /// 合并来源进 pending。对每个 (library_id, root)：
    /// - 相同 generation 已 pending / in-flight / done 时都不得重复入队；
    /// - 不同 root（repair 后）覆盖 pending 中的旧 generation。
    /// 然后确保 worker 在跑；正在运行时新增的来源不会被丢弃。
    pub fn request_catch_up(&self, sources: &[(i64, String)]) {
        {
            let mut pending = self
                .inner
                .catch_up_pending
                .lock()
                .expect("pending mutex poisoned");
            let in_flight = self
                .inner
                .catch_up_in_flight
                .lock()
                .expect("in-flight mutex poisoned");
            let done = self
                .inner
                .catch_up_done
                .lock()
                .expect("done mutex poisoned");
            for (library_id, root_path) in sources {
                if in_flight.get(library_id) == Some(root_path) {
                    continue;
                }
                if done.get(library_id) == Some(root_path) {
                    continue;
                }
                if pending.get(library_id) == Some(root_path) {
                    continue;
                }
                pending.insert(*library_id, root_path.clone());
            }
        }
        self.ensure_worker();
    }

    fn ensure_worker(&self) {
        let mut running = self
            .inner
            .catch_up_worker_running
            .lock()
            .expect("worker flag mutex poisoned");
        if *running {
            return;
        }
        *running = true;
        drop(running);

        let coordinator = self.clone();
        std::thread::spawn(move || loop {
            let next = {
                let mut pending = coordinator
                    .inner
                    .catch_up_pending
                    .lock()
                    .expect("pending mutex poisoned");
                let next_entry = pending.iter().next().map(|(id, root)| (*id, root.clone()));
                if let Some((library_id, _)) = &next_entry {
                    pending.remove(library_id);
                }
                next_entry
            };
            let Some((library_id, generation_root)) = next else {
                // pending 为空：双检查后尝试退出。期间若有新任务到达
                // （request_catch_up 合并进 pending），则继续循环，防止
                // worker 复位后新任务无人消费。
                let mut running = coordinator
                    .inner
                    .catch_up_worker_running
                    .lock()
                    .expect("worker flag mutex poisoned");
                let pending_empty = coordinator
                    .inner
                    .catch_up_pending
                    .lock()
                    .expect("pending mutex poisoned")
                    .is_empty();
                if pending_empty {
                    *running = false;
                    break;
                }
                continue;
            };
            // worker 开始前记录 in-flight generation。
            coordinator
                .inner
                .catch_up_in_flight
                .lock()
                .expect("in-flight mutex poisoned")
                .insert(library_id, generation_root.clone());

            let scan_result = coordinator.run_scan(library_id);

            // 失败时清除 in-flight，允许后续 sync 重试（不写 done）。
            if scan_result.is_err() {
                coordinator
                    .inner
                    .catch_up_in_flight
                    .lock()
                    .expect("in-flight mutex poisoned")
                    .remove(&library_id);
                continue;
            }
            // 完成时只有 DB 当前 root 仍等于该 generation 才写入 done
            // （repair/删除后 root 已变化则留给新 generation 的 catch-up）。
            let current_root = coordinator
                .inner
                .database
                .list_libraries()
                .ok()
                .and_then(|libraries| {
                    libraries
                        .into_iter()
                        .find(|library| library.id == library_id)
                })
                .map(|library| library.root_path);
            let mut in_flight = coordinator
                .inner
                .catch_up_in_flight
                .lock()
                .expect("in-flight mutex poisoned");
            if current_root.as_deref() == Some(generation_root.as_str()) {
                coordinator
                    .inner
                    .catch_up_done
                    .lock()
                    .expect("done mutex poisoned")
                    .insert(library_id, generation_root);
            }
            in_flight.remove(&library_id);
        });
    }

    /// 取消某个 library 的 catch-up：同时清除 pending / in-flight / done
    /// （用于删除后，防止旧 pending 继续扫、也允许同 root 重新接入时再 catch-up）。
    pub fn cancel_catch_up(&self, library_id: i64) {
        self.inner
            .catch_up_pending
            .lock()
            .expect("pending mutex poisoned")
            .remove(&library_id);
        self.inner
            .catch_up_in_flight
            .lock()
            .expect("in-flight mutex poisoned")
            .remove(&library_id);
        self.inner
            .catch_up_done
            .lock()
            .expect("done mutex poisoned")
            .remove(&library_id);
    }

    /// 获取一个 library 的串行锁（delete / repair 等外层生命周期用）。
    pub fn library_lock(&self, library_id: i64) -> Arc<Mutex<()>> {
        self.lock_for(library_id)
    }

    /// PR A watcher fence：bump 某 library 的 watcher generation。
    /// 接入合并 / repair / 删除来源时调用；此后旧 watcher 的事件批次被丢弃。
    pub fn bump_generation(&self, library_id: i64) -> u64 {
        let mut generations = self
            .inner
            .watch_generations
            .lock()
            .expect("watch generations mutex poisoned");
        let next = generations.get(&library_id).copied().unwrap_or(0) + 1;
        generations.insert(library_id, next);
        next
    }

    /// 当前 watcher generation（未 bump 过为 0）。
    pub fn current_generation(&self, library_id: i64) -> u64 {
        self.inner
            .watch_generations
            .lock()
            .expect("watch generations mutex poisoned")
            .get(&library_id)
            .copied()
            .unwrap_or(0)
    }

    /// PR A：应用一次 watcher / targeted 增量批次。持 per-library 锁 + 全局
    /// DB 写锁，与其他 scan / delete / repair 串行；写库前后重新核验：
    /// - library 仍存在（已删除来源的晚到批次直接跳过，不报错不写库）；
    /// - generation 与 watcher 构建时捕获值一致（Codex review P1-4：
    ///   拿到写 fence 后再次核验，bump 后晚到的旧 watcher 批次整体丢弃）。
    pub fn apply_delta(
        &self,
        library_id: i64,
        generation: u64,
        delta: &ScanDelta,
    ) -> Result<ScanDeltaReport, AppError> {
        let lock = self.lock_for(library_id);
        let _guard = lock.lock().expect("scan lock poisoned");
        let _db = self
            .inner
            .db_write_lock
            .lock()
            .expect("db write lock poisoned");
        if self.current_generation(library_id) != generation {
            return Ok(ScanDeltaReport::default());
        }
        let exists = self
            .inner
            .database
            .list_libraries()?
            .iter()
            .any(|library| library.id == library_id);
        if !exists {
            return Ok(ScanDeltaReport::default());
        }
        self.inner.database.apply_scan_delta(library_id, delta)
    }

    /// Codex review P1-4：watcher 错误触发的 catch-up 也不得旁路 generation
    /// fence——持锁后核验 generation，不匹配则跳过（旧 watcher 不写库）。
    pub fn run_scan_if_generation(
        &self,
        library_id: i64,
        generation: u64,
    ) -> Result<LibraryScanSnapshot, AppError> {
        let lock = self.lock_for(library_id);
        let _guard = lock.lock().expect("scan lock poisoned");
        let _db = self
            .inner
            .db_write_lock
            .lock()
            .expect("db write lock poisoned");
        if self.current_generation(library_id) != generation {
            return Ok(LibraryScanSnapshot::default());
        }
        self.run_scan_without_locks(library_id)
    }

    /// Codex review P1-5：读取 DB 中某路径 item 的内容指纹（hash + size），
    /// 供 watcher 实时 rename 配对使用——改名后旧路径已消失，无法从磁盘
    /// 读取旧内容，只能以 DB 既有 metadata 为配对依据。
    pub fn item_fingerprint(&self, file_path: &str) -> Option<(Option<String>, i64)> {
        self.inner
            .database
            .item_fingerprint_by_path(file_path)
            .ok()
            .flatten()
    }

    /// Codex review R3 P1（计划 §4.4）：目录改名子树更新——列出 DB 内位于
    /// 旧目录前缀下的未删除 item 路径，供 watcher 合成子树 rename。
    pub fn item_paths_under_prefix(&self, prefix: &str) -> Result<Vec<String>, AppError> {
        self.inner.database.list_item_paths_under_prefix(prefix)
    }

    /// R4/R5 P1：记录仍然存在的路径（目录 / 候选文件）inode。缓存有上限，
    /// 超限后不再记录（对应改名退化为保守收敛）。
    pub fn remember_path_inode(&self, path: &str, ino: u64) {
        const DIR_INODE_CACHE_CAP: usize = 4096;
        let mut inodes = self
            .inner
            .path_inodes
            .lock()
            .expect("dir inodes mutex poisoned");
        if inodes.contains_key(path) || inodes.len() < DIR_INODE_CACHE_CAP {
            inodes.insert(path.to_string(), ino);
        }
    }

    pub fn cached_path_inode(&self, path: &str) -> Option<u64> {
        self.inner
            .path_inodes
            .lock()
            .expect("dir inodes mutex poisoned")
            .get(path)
            .copied()
    }

    /// 路径改名 / 移除后清理其自身与子目录的陈旧 inode 记录。
    pub fn forget_path_inodes_under(&self, path: &str) {
        let prefix = format!("{path}/");
        let mut inodes = self
            .inner
            .path_inodes
            .lock()
            .expect("dir inodes mutex poisoned");
        inodes.remove(path);
        let stale: Vec<String> = inodes
            .keys()
            .filter(|key| key.starts_with(&prefix))
            .cloned()
            .collect();
        for key in stale {
            inodes.remove(&key);
        }
    }

    #[cfg(test)]
    pub fn pending_count(&self) -> usize {
        self.inner
            .catch_up_pending
            .lock()
            .expect("pending mutex poisoned")
            .len()
    }

    #[cfg(test)]
    pub fn scan_count(&self) -> u64 {
        self.inner.catch_up_scan_count.load(Ordering::Relaxed)
    }

    #[cfg(test)]
    pub fn worker_running(&self) -> bool {
        *self
            .inner
            .catch_up_worker_running
            .lock()
            .expect("worker flag mutex poisoned")
    }
}
