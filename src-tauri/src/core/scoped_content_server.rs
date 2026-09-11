//! PR C Phase 1（计划 6.3，handoff 裁决 D1=A）：scoped resource origin。
//!
//! 每个 HTML 内容会话一个独立 loopback 服务器实例，origin 根直接映射授权
//! root（folder 资料库 root 或单文件直接父目录）。与旧 `LocalContentServer`
//! 的本质区别：
//!
//! 1. **端口即授权边界**：一个 origin 只服务一个授权 root，`/fs` 绝对路径
//!    路由不复存在；安全边界落在端口与 root 的绑定上，不落在请求头判定
//!    （WKWebView 的 `<img>` 跨源请求不携带 Origin 头，按头判定不可靠）。
//!    **R11-a（Codex 返修）：origin 根 = 授权 root 本身，不在路径上插入
//!    会话 token** —— 计划 §6.3 与 D1 合同明确「origin 根映射 root」，
//!    root-relative 引用（`/assets/...`、`base href=/`）必须可用。会话
//!    隔离与旧 origin 失效改由下列 origin 级机制承担：
//!    - **进程内端口不复用**：进程级 used-ports 集合（跨 Drop 存续），
//!      同进程内任何后续授权都不会再绑到已用过的端口 —— 旧 origin 的
//!      存活页面 / 缓存 / SW 在本进程内永远打不到新会话的 root；
//!    - **跨启动端口身份登记（R11-a 第三轮重设计，Codex 指认墓碑机制三缺口）**：
//!      每个绑定成功的端口持久化到 `used-scoped-ports.json` —— 该文件是
//!      **历史身份的唯一权威**。第五轮（Codex revision 14 复核）收敛为
//!      **锁内候选端口认领事务**：`start` / `start_on_port` 在 bind 之后、
//!      origin 发布之前，于跨进程排他锁内「读磁盘 → 磁盘已含候选端口 =
//!      拒绝认领（Conflict，非幂等成功）→ 否则 union 写回」。这是唯一新
//!      旧身份裁决，与墓碑/外部占用/内存集合均无关；刷新-释放-再 bind 的
//!      TOCTOU 窗口由此消除（读-判-写与认领同临界区）。登记损坏/丢失/
//!      写入失败/超上限一律 fail closed（scoped 会话拒绝启动，错误文案
//!      要求保留文件原样，绝不引导删除记录，绝不自动清空历史）。墓碑 =
//!      可选的单线程有界拒绝应答服务（读 8 KiB / 期限 5 s / 并发 256 上
//!      界），bind 成败不参与任何裁决。第四轮（Codex revision 11）：
//!      初始化标记区分「首次启动」与「登记丢失」；全部登记事务持跨进程
//!      排他锁并按 union 合并写回（多实例共存，任一已发布 origin 的身份
//!      条目不丢失）。
//!    - **拒绝 SW 注册**：Service Worker 脚本请求带 `Service-Worker:
//!      script` 头，一律 404 —— scoped origin 上永远装不上持久拦截器；
//!    - **no-store + revoke 中止**：HTTP 缓存不落盘（`Cache-Control:
//!      no-store`），revoke（Drop）后端口关闭，旧 URL 只能连接失败。
//! 2. **严格解码顺序**：先对整条请求路径做一次 percent-decode，再按 `/`
//!    逐段解析并校验 —— `%2e%2e` 与 `%2f` 在段校验之前就被还原并拦截，
//!    修复基线「decode 后直接交给 OS 解析」的顺序缺陷（P0 特征化实证）。
//! 3. **canonicalize 复核**：解析结果 join root 后 canonicalize，组件级
//!    `starts_with(canonical_root)` 比对，封住 symlink 逃逸。
//! 4. **响应头收敛**：文本类型带 charset；`Cache-Control: no-store` 防
//!    跨会话缓存泄漏；不再发送 `Access-Control-Allow-Origin: *`（同源
//!    session 自用，跨源 fetch 被默认同源策略拒绝）。
//! 5. **资源预算（R12）**：并发连接上限（原子认领，spawn 前占槽，无
//!    load/spawn 竞态）、连接总期限（区别于单次 read 超时）、响应体上限
//!    （超限 413 且服务可恢复）、HEAD 仅元数据、revoke（Drop）后进行中
//!    的流式响应立即中止。
//!
//! 生命周期：close 标签 / 替换 session / promotion teardown / 来源失效时
//! Drop 停止 accept loop（handoff Codex 复核 2026-09-09：普通切换标签只销
//! 毁 surface，不撤销存活 tab 的 scoped capability）。

use std::{
    collections::HashSet,
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicU64, AtomicUsize, Ordering},
        Arc, Mutex,
    },
    thread::{self, JoinHandle},
    time::{Duration, Instant},
};

use crate::errors::AppError;

/// 请求行 + 请求头的总读取上限。超限直接断开，防止慢速/超长请求占住连接线程。
const MAX_REQUEST_HEAD_BYTES: usize = 16 * 1024;
/// 连接级读写超时（单次 read/write 的上界，防止对端挂死）。
const CONNECTION_TIMEOUT: Duration = Duration::from_secs(5);
/// R12：单连接总期限。从连接进入算起，超时后立即断开 —— 慢速分片客户端
/// 无法凭「每次 read 都不超时」无限占用线程。
const REQUEST_TOTAL_DEADLINE: Duration = Duration::from_secs(15);
/// R12：并发连接上限。超限立即 503，服务可恢复。
const MAX_CONCURRENT_CONNECTIONS: usize = 32;
/// R12：响应体上限。root 内 HTML 可引用大文件；超限 413 拒绝且服务可恢复。
const MAX_RESPONSE_BODY_BYTES: u64 = 64 * 1024 * 1024;
/// 流式复制的块大小。
const STREAM_CHUNK_BYTES: usize = 256 * 1024;
/// accept loop 轮询间隔（非阻塞模式下的关闭延迟上界）。
const ACCEPT_POLL_INTERVAL: Duration = Duration::from_millis(25);

/// 单实例共享状态：accept loop 与连接线程都持有 Arc。
struct ServerShared {
    canonical_root: PathBuf,
    shutdown: Arc<AtomicBool>,
    active_connections: AtomicUsize,
    max_body_bytes: u64,
    /// R12-test 调度 seam：置 true 时 worker 线程在入口自旋等待、不推进。
    /// 生产路径恒为 false。用于确定性验证「槽位在 spawn 前认领」：若回退
    /// 到旧实现（worker 内才 fetch_add），该 seam 下计数永不发生，第 33
    /// 个连接不会被 503 —— 测试确定性失败，暴露竞态回归。
    hold_workers_at_entry: Arc<AtomicBool>,
    /// R12-test：worker spawn 成功计数（测试断言「最多分配 MAX 个 worker」）。
    workers_spawned: Arc<AtomicUsize>,
    /// R12-test：spawn 失败注入。>0 时 accept loop 跳过真实 spawn、走真实
    /// 失败回收路径（释放槽位 + 丢弃连接）并递减计数 —— 确定性覆盖线程
    /// 创建失败后的恢复，不依赖真实资源耗尽。生产路径恒为 0。
    spawn_failure_injection: Arc<AtomicUsize>,
}

/// R11-a 第三轮（Codex revision 9 复核）：**身份拒绝与响应服务彻底分离**。
///
/// - **身份权威 = 登记文件** `used-scoped-ports.json`（全部历史 scoped 端口
///   的持久记录）。第五轮（Codex revision 14 复核）：`start` / `start_on_port`
///   的唯一新旧身份裁决是 bind 之后的**锁内认领事务**（`claim_port_identity`
///   —— 锁内读磁盘，磁盘已含候选端口即拒绝）—— 进程级 `USED_PORTS` 集合
///   退化为内存镜像（init 装载 + 认领事务同步维护），不再参与裁决；裁决
///   与墓碑 bind 成败、外部占用状态完全无关 —— 登记端口即使空闲，bind
///   恰好分到它也会被认领事务确定性拒绝。
/// - **墓碑 = 可选的拒绝应答服务**（a.3 有界资源）：单 supervisor 线程事件
///   环持有全部墓碑 listener（非阻塞 accept 轮询），每连接读上限 8 KiB、
///   总期限 5 s、并发上限 256；线程创建失败仅留痕，身份拒绝仍然完整生效
///   （旧 URL 重放落到连接拒绝而非 403 应答，隔离合同不依赖应答存在）。
/// - **失败关闭**（a.2）：登记文件损坏/丢失/读取错误/写入失败/超上限一律
///   `ScopedRegistryFailed` 错误向上传播，origin 不发布；健康状态 Failed 后
///   一切新会话拒绝。第四轮修正恢复路线：错误文案统一要求**保留文件原样，
///   不要删除或改写**——绝不引导删记录（那会清空全部拒绝历史）；容量耗尽
///   = 永久 fail closed，恢复只经应用版本升级扩展身份空间。
static USED_PORTS: Mutex<Option<HashSet<u16>>> = Mutex::new(None);

/// 登记表健康状态（0=Uninitialized 1=Healthy 2=Failed）。init 失败置
/// Failed 后，`start` 一律拒绝（fail closed）。
static REGISTRY_HEALTH: AtomicUsize = AtomicUsize::new(0);

const REGISTRY_HEALTHY: usize = 1;
const REGISTRY_FAILED: usize = 2;

/// R11-a.2：历史身份空间上限。读超限 = init 失败；写超限 = persist 失败
/// （start 拒绝）。第四轮：4096 → 16384（loopback 可用端口约 64K，上限仍
/// 留 3/4 空间给正常分配；满额文件约 100KB）。耗尽语义 = **永久 fail
/// closed**（错误文案要求保留文件原样，绝不引导删记录）；容量恢复只经
/// 应用版本升级扩展身份空间，机制绝不自动清空历史身份。
pub const MAX_REGISTRY_PORTS: usize = 16384;

/// a.3 墓碑 supervisor 预算（测试可经 `set_tombstone_budgets` 调小）。
static TOMBSTONE_READ_CAP: AtomicUsize = AtomicUsize::new(8 * 1024);
static TOMBSTONE_DEADLINE_MS: AtomicU64 = AtomicU64::new(5_000);
static TOMBSTONE_MAX_CONNS: AtomicUsize = AtomicUsize::new(256);
/// 存活的墓碑 supervisor 线程数（测试断言「全部历史端口共享 1 线程」）。
static TOMBSTONE_SUPERVISOR_THREADS: AtomicUsize = AtomicUsize::new(0);

/// R11-a：跨启动端口登记表文件名（相对 app_data_dir）。
pub const USED_PORTS_FILE_NAME: &str = "used-scoped-ports.json";

static USED_PORT_REGISTRY_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

fn registry_path() -> Option<PathBuf> {
    USED_PORT_REGISTRY_PATH.lock().ok().and_then(|guard| guard.clone())
}

/// 登记路径 → 辅助文件路径（初始化标记 `.initialized` / 跨进程锁 `.lock`）。
/// 两个辅助文件创建后**永不删除**：标记区分「首次启动」与「登记丢失」；
/// 锁文件避免锁落在已删除文件上的竞态。
fn registry_aux_path(registry: &Path, suffix: &str) -> PathBuf {
    let mut os = registry.as_os_str().to_os_string();
    os.push(suffix);
    PathBuf::from(os)
}

fn init_marker_path(registry: &Path) -> PathBuf {
    registry_aux_path(registry, ".initialized")
}

fn lock_file_path(registry: &Path) -> PathBuf {
    registry_aux_path(registry, ".lock")
}

fn registry_failed(message: String) -> AppError {
    AppError::ScopedRegistryFailed(message)
}

/// 登记读取的三态结果（a.2 第四轮）。
enum RegistryRead {
    /// 登记文件与初始化标记都不存在：从未初始化（首次启动，合法空历史）。
    Uninitialized,
    /// 登记文件存在且合法：解析后的历史身份。
    Present(Vec<u16>),
}

/// 三态读登记（a.2 第四轮）：
/// 1. 标记存在而登记不存在 → **登记丢失** = Err（历史身份不可重建，绝不
///    以空表继续 —— 否则已发布 origin 的端口身份被清空复用）；
/// 2. 标记与登记都不存在 → Uninitialized（由调用方在锁内原子创建）；
/// 3. 登记存在 → 解析（损坏/超上限 = Err）并在标记缺失时补建标记（兼容
///    旧版本遗留的登记文件；登记文件本身就是初始化证据）。
fn read_registry_state(registry: &Path) -> Result<RegistryRead, AppError> {
    let marker = init_marker_path(registry);
    let marker_exists = marker.exists();
    let bytes = match std::fs::read(registry) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            if marker_exists {
                return Err(registry_failed(format!(
                    "端口登记表丢失（{}）但存在初始化标记：历史身份已不可重建，为防止历史端口身份被清空复用，scoped 内容会话拒绝启动（fail closed）。请保留现状，不要手动重建登记文件。",
                    registry.display()
                )));
            }
            return Ok(RegistryRead::Uninitialized);
        }
        Err(error) => {
            return Err(registry_failed(format!(
                "读取端口登记表失败（{}）：{error}；scoped 内容会话拒绝启动（fail closed）。请保留该文件原样，不要删除或改写。",
                registry.display()
            )));
        }
    };
    let ports = parse_registry_bytes(registry, &bytes)?;
    if !marker_exists {
        let _ = std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&marker);
    }
    Ok(RegistryRead::Present(ports))
}

fn parse_registry_bytes(registry: &Path, bytes: &[u8]) -> Result<Vec<u16>, AppError> {
    let ports: Vec<u16> = serde_json::from_slice(bytes).map_err(|error| {
        registry_failed(format!(
            "端口登记表损坏（{}）：{error}；历史身份不可重建，scoped 内容会话拒绝启动（fail closed）。请保留该文件原样，不要删除、清空或改写。",
            registry.display()
        ))
    })?;
    if ports.len() > MAX_REGISTRY_PORTS {
        return Err(registry_failed(format!(
            "端口登记表超过 {MAX_REGISTRY_PORTS} 条上限（{}）：无剩余端口身份空间，为不丢失任何历史身份，scoped 内容会话拒绝启动（fail closed）。请保留该文件原样；容量恢复需应用版本升级扩展身份空间。",
            registry.display()
        )));
    }
    Ok(ports)
}

/// R11-a.4：登记跨进程排他锁。unix = `flock(LOCK_EX)`（EINTR 重试），
/// Windows = `LockFileEx` 全文件排他字节锁（不带 FAIL_IMMEDIATELY，阻塞
/// 语义与 flock 一致）。锁文件创建后永不删除。
fn lock_registry_file(registry: &Path) -> Result<std::fs::File, AppError> {
    let lock_path = lock_file_path(registry);
    let file = std::fs::OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .open(&lock_path)
        .map_err(|error| {
            registry_failed(format!(
                "打开端口登记锁文件失败（{}）：{error}；scoped 内容会话拒绝启动（fail closed）",
                lock_path.display()
            ))
        })?;
    acquire_exclusive_lock(&file).map_err(|error| {
        registry_failed(format!(
            "获取端口登记跨进程锁失败：{error}；scoped 内容会话拒绝启动（fail closed）"
        ))
    })?;
    Ok(file)
}

#[cfg(unix)]
fn acquire_exclusive_lock(file: &std::fs::File) -> std::io::Result<()> {
    use std::os::fd::AsRawFd;
    loop {
        let result = unsafe { libc::flock(file.as_raw_fd(), libc::LOCK_EX) };
        if result == 0 {
            return Ok(());
        }
        let error = std::io::Error::last_os_error();
        if error.kind() != std::io::ErrorKind::Interrupted {
            return Err(error);
        }
    }
}

#[cfg(windows)]
fn acquire_exclusive_lock(file: &std::fs::File) -> std::io::Result<()> {
    use std::os::windows::io::AsRawHandle;
    use windows_sys::Win32::Storage::FileSystem::{LockFileEx, LOCKFILE_EXCLUSIVE_LOCK};
    use windows_sys::Win32::System::IO::OVERLAPPED;
    let mut overlapped: OVERLAPPED = unsafe { std::mem::zeroed() };
    // 不带 LOCKFILE_FAIL_IMMEDIATELY：阻塞等待，与 unix flock 语义一致。
    let ok = unsafe {
        LockFileEx(
            file.as_raw_handle(),
            LOCKFILE_EXCLUSIVE_LOCK,
            0,
            u32::MAX,
            u32::MAX,
            &mut overlapped,
        )
    };
    if ok == 0 {
        Err(std::io::Error::last_os_error())
    } else {
        Ok(())
    }
}

/// 进程内第一层互斥（避免同进程线程在内核锁上互等）+ 跨进程 flock，
/// 持双锁执行一次登记事务（读-合并-写 / 首启创建）。
fn with_registry_transaction<T>(
    registry: &Path,
    operation: impl FnOnce() -> Result<T, AppError>,
) -> Result<T, AppError> {
    static REGISTRY_IO_LOCK: Mutex<()> = Mutex::new(());
    let _process_guard = REGISTRY_IO_LOCK.lock().map_err(|_| AppError::InternalError)?;
    let _file_guard = lock_registry_file(registry)?;
    operation()
}

/// 首次启动：锁内原子创建登记（`[]`）与初始化标记。**先登记后标记**：
/// 若标记创建失败，下次 init 走「登记存在 → 补建标记」路线，不会楔死；
/// 若登记创建失败，状态仍是 Uninitialized，可直接重试。
fn create_first_start_registry(registry: &Path) -> Result<(), AppError> {
    std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(registry)
        .and_then(|mut file| file.write_all(b"[]"))
        .map_err(|error| {
            registry_failed(format!(
                "创建端口登记表失败（{}）：{error}；scoped 内容会话拒绝启动（fail closed）。请检查 app 数据目录权限；不要手动创建或改写登记文件。",
                registry.display()
            ))
        })?;
    let marker = init_marker_path(registry);
    std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&marker)
        .map_err(|error| {
            registry_failed(format!(
                "创建端口登记初始化标记失败（{}）：{error}；scoped 内容会话拒绝启动（fail closed）。请检查 app 数据目录权限；不要删除或改写该标记。",
                marker.display()
            ))
        })?;
    Ok(())
}

/// 设置跨启动端口登记表路径并加载历史身份（AppState::new 第一步）。
/// 必须在任何 `ScopedContentServer::start` 之前调用；失败时置 Failed
/// （之后 start 一律拒绝）并返回错误。
pub fn init_used_port_registry(path: PathBuf) -> Result<PathBuf, AppError> {
    // 先读后登记：读取/损坏/丢失/超上限失败时不登记路径、置 Failed。
    let historical = match with_registry_transaction(&path, || {
        match read_registry_state(&path)? {
            RegistryRead::Uninitialized => {
                create_first_start_registry(&path)?;
                Ok(Vec::new())
            }
            RegistryRead::Present(ports) => Ok(ports),
        }
    }) {
        Ok(ports) => ports,
        Err(error) => {
            REGISTRY_HEALTH.store(REGISTRY_FAILED, Ordering::SeqCst);
            eprintln!(
                "Nutbook scoped port registry init failed: {error}; all scoped content sessions will refuse to start (fail closed)"
            );
            return Err(error);
        }
    };
    *USED_PORT_REGISTRY_PATH
        .lock()
        .map_err(|_| AppError::InternalError)? = Some(path.clone());
    {
        let mut guard = USED_PORTS.lock().map_err(|_| AppError::InternalError)?;
        let used = guard.get_or_insert_with(HashSet::new);
        used.extend(historical);
    }
    REGISTRY_HEALTH.store(REGISTRY_HEALTHY, Ordering::SeqCst);
    Ok(path)
}

fn ensure_registry_healthy() -> Result<(), AppError> {
    if REGISTRY_HEALTH.load(Ordering::SeqCst) == REGISTRY_FAILED {
        return Err(registry_failed(
            "端口登记表处于故障状态，scoped 内容会话拒绝启动（fail closed）；请查看启动日志，保留登记文件原样，不要删除或改写".to_string(),
        ));
    }
    Ok(())
}

/// 把一批端口并入进程级禁止身份集（内存镜像维护，不参与裁决）。
fn sync_forbidden_from_ports(ports: &[u16]) -> Result<(), AppError> {
    let mut guard = USED_PORTS.lock().map_err(|_| AppError::InternalError)?;
    guard
        .get_or_insert_with(HashSet::new)
        .extend(ports.iter().copied());
    Ok(())
}

/// R11-a.4 第五轮（Codex revision 14 复核）：**候选端口新身份认领事务**。
/// 所有生产入口（`start` / `start_on_port`）统一使用；这是 bind 之后、
/// origin 发布之前的**唯一**新旧身份裁决。锁内（进程内 Mutex + 跨进程
/// flock）执行「读磁盘（三态）→ 磁盘已含候选端口 = **Conflict（拒绝认领，
/// 不是幂等成功）** → 否则 union 写回 + 内存镜像同步」。
///
/// 为什么必须是锁内最终裁决而非 start 开头刷新：刷新释放锁之后、bind 与
/// 持久化之间，另一实例仍可登记同一端口并退出 —— 只有「读-判-写」与认领
/// 发生在同一临界区，「另一实例已发布 origin 的端口不被本进程复用」才是
/// 事务保证而非窗口声明。任何登记故障（丢失/损坏/写失败/超上限）= Err
/// 且置 Failed（fail closed），origin 不发布。
fn claim_port_identity(port: u16) -> Result<ClaimOutcome, AppError> {
    let Some(path) = registry_path() else {
        // 无登记路径（未 init 的测试场景）：进程内集合是唯一身份记录，
        // 已含候选端口同样 = Conflict（本进程早前会话发布的身份不得复用）。
        let mut guard = USED_PORTS.lock().map_err(|_| AppError::InternalError)?;
        let used = guard.get_or_insert_with(HashSet::new);
        return Ok(if used.insert(port) {
            ClaimOutcome::Claimed
        } else {
            ClaimOutcome::Conflict
        });
    };
    let outcome = with_registry_transaction(&path, || {
        let mut ports = match read_registry_state(&path)? {
            RegistryRead::Uninitialized => {
                // 理论不可达：生产路径 init 先行并已创建登记文件；出现即
                // 视为状态未知，绝不在认领时从零重建（那会丢历史）。
                return Err(registry_failed(format!(
                    "端口登记表在身份认领时不存在且无初始化标记（{}）：登记状态未知，拒绝认领（fail closed）。请保留目录现状，不要手动创建登记文件。",
                    path.display()
                )));
            }
            RegistryRead::Present(ports) => ports,
        };
        if ports.contains(&port) {
            // 磁盘已含候选端口：该身份已被某个实例登记（可能是另一实例
            // 刚发布的 origin，也可能是本进程早前会话）。**拒绝认领** ——
            // 不是幂等成功；同时把磁盘全量并入内存镜像（收敛）。
            sync_forbidden_from_ports(&ports)?;
            return Ok(ClaimOutcome::Conflict);
        }
        let mut merged: HashSet<u16> = ports.iter().copied().collect();
        merged.insert(port);
        if merged.len() > MAX_REGISTRY_PORTS {
            return Err(registry_failed(format!(
                "端口登记表已达 {MAX_REGISTRY_PORTS} 条上限（{}）：无剩余端口身份空间，为不丢失任何历史身份，scoped 内容会话拒绝启动（fail closed）。请保留该文件原样；容量恢复需应用版本升级扩展身份空间。",
                path.display()
            )));
        }
        ports = merged.into_iter().collect();
        ports.sort_unstable();
        let bytes = serde_json::to_vec(&ports).map_err(|_| AppError::InternalError)?;
        let tmp = path.with_extension(format!("json.{}.tmp", std::process::id()));
        let write_result = (|| -> std::io::Result<()> {
            let mut file = std::fs::File::create(&tmp)?;
            file.write_all(&bytes)?;
            file.sync_all()?;
            drop(file);
            std::fs::rename(&tmp, &path)?;
            Ok(())
        })();
        if let Err(error) = write_result {
            let _ = std::fs::remove_file(&tmp);
            return Err(registry_failed(format!(
                "端口登记表写入失败（{}）：{error}；scoped 内容会话拒绝启动（fail closed）。请保留登记文件与所在目录原样，不要删除或改写。",
                path.display()
            )));
        }
        sync_forbidden_from_ports(&ports)?;
        Ok(ClaimOutcome::Claimed)
    });
    if outcome.is_err() {
        REGISTRY_HEALTH.store(REGISTRY_FAILED, Ordering::SeqCst);
    }
    outcome
}

/// 认领结果：Conflict = 磁盘已含候选端口（`start` 在预算内关闭重绑重选；
/// `start_on_port` 直接 Err）。登记故障走 `Err(AppError)`，不可重试。
enum ClaimOutcome {
    Claimed,
    Conflict,
}

/// R11-a.4 第五轮测试 seam：设置后，`start` 的 bind 循环首迭代改为绑定指定
/// 端口（仍是真实 bind；被占用则该次 bind 失败进入下一迭代），用于在生产
/// 认领路径上确定性制造「候选端口恰为另一实例已登记身份」的交错。仅注入
/// 候选端口本身；bind → 认领 → 发布与生产完全同一代码路径。
#[doc(hidden)]
pub fn set_start_candidate_port_override(port: Option<u16>) {
    *START_CANDIDATE_PORT_OVERRIDE
        .lock()
        .expect("candidate port override lock poisoned") = port;
}

static START_CANDIDATE_PORT_OVERRIDE: Mutex<Option<u16>> = Mutex::new(None);

/// `start` bind 循环的单次绑定目标：优先消费候选注入；候选端口被外部占用
/// 时降级为 bind(:0)（与生产默认一致），降级 bind 失败才向上传播。
fn bind_listener() -> std::io::Result<TcpListener> {
    let candidate = START_CANDIDATE_PORT_OVERRIDE
        .lock()
        .map_err(|_| std::io::Error::new(std::io::ErrorKind::Other, "candidate override poisoned"))?
        .take();
    if let Some(port) = candidate {
        if let Ok(listener) = TcpListener::bind(("127.0.0.1", port)) {
            return Ok(listener);
        }
    }
    TcpListener::bind("127.0.0.1:0")
}

/// R11-a：进程启动时把登记表内全部历史端口占为「墓碑」应答服务（可选，
/// 资源有界）。身份拒绝不依赖本函数：即使墓碑全部失败（bind 被外部抢占 /
/// 线程创建失败），start 的身份集裁决仍然拒绝历史端口。返回成功占用的
/// 端口数（诊断用）。
pub fn entomb_registered_ports() -> usize {
    let Some(path) = registry_path() else {
        return 0;
    };
    match read_registry_state(&path) {
        Ok(RegistryRead::Present(ports)) => entomb_specific_ports(&ports),
        Ok(RegistryRead::Uninitialized) => 0,
        Err(error) => {
            eprintln!("Nutbook tombstone load failed: {error}; identity rejection remains active");
            0
        }
    }
}

/// 定向墓碑化给定端口（测试/诊断用）：只处理列出的端口，不触碰登记表内
/// 其他端口。全部墓碑共享 **一个** supervisor 线程（a.3：不再每端口一线程）。
#[doc(hidden)]
pub fn entomb_specific_ports(ports: &[u16]) -> usize {
    let mut listeners = Vec::new();
    for &port in ports {
        if let Ok(listener) = TcpListener::bind(("127.0.0.1", port)) {
            let _ = listener.set_nonblocking(true);
            listeners.push(listener);
        }
    }
    if listeners.is_empty() {
        return 0;
    }
    let count = listeners.len();
    let spawned = thread::Builder::new()
        .name("scoped-tombstone-supervisor".to_string())
        .spawn(move || tombstone_supervisor(listeners));
    match spawned {
        Ok(_) => {
            TOMBSTONE_SUPERVISOR_THREADS.fetch_add(1, Ordering::SeqCst);
            count
        }
        Err(error) => {
            eprintln!(
                "Nutbook tombstone supervisor spawn failed: {error}; identity rejection remains active (stale ports refuse connections)"
            );
            0
        }
    }
}

/// 存活的墓碑 supervisor 线程数（测试断言资源上界用）。
#[doc(hidden)]
pub fn tombstone_supervisor_threads() -> usize {
    TOMBSTONE_SUPERVISOR_THREADS.load(Ordering::SeqCst)
}

/// 调整墓碑连接预算（测试用；生产默认 8 KiB / 5 s / 256）。
#[doc(hidden)]
pub fn set_tombstone_budgets(read_cap_bytes: usize, deadline_ms: u64, max_connections: usize) {
    TOMBSTONE_READ_CAP.store(read_cap_bytes, Ordering::Relaxed);
    TOMBSTONE_DEADLINE_MS.store(deadline_ms, Ordering::Relaxed);
    TOMBSTONE_MAX_CONNS.store(max_connections, Ordering::Relaxed);
}

/// 墓碑连接状态（有界：每连接 ≤ 读上限字节，期限由预算决定）。
struct TombstoneConn {
    stream: TcpStream,
    buf: Vec<u8>,
    deadline: Instant,
}

/// 单 supervisor 线程事件环：非阻塞 accept 轮询全部墓碑 listener + 有界
/// 连接状态表推进。任何连接的资源消耗都被上界约束（见模块头）。
fn tombstone_supervisor(listeners: Vec<TcpListener>) {
    let mut conns: Vec<TombstoneConn> = Vec::new();
    let mut scratch = [0u8; 4096];
    loop {
        // 1) 非阻塞 accept：并发上限内进入状态表，超限直接关闭。
        for listener in &listeners {
            while let Ok((stream, _)) = listener.accept() {
                if conns.len() >= TOMBSTONE_MAX_CONNS.load(Ordering::Relaxed) {
                    drop(stream);
                    continue;
                }
                let _ = stream.set_nonblocking(true);
                conns.push(TombstoneConn {
                    stream,
                    buf: Vec::new(),
                    deadline: Instant::now()
                        + Duration::from_millis(TOMBSTONE_DEADLINE_MS.load(Ordering::Relaxed)),
                });
            }
        }
        // 2) 推进：请求头完成 / 读超限 / 期限到 / EOF → 403 + 排干 + 关闭。
        let now = Instant::now();
        let mut remaining = Vec::new();
        for mut conn in conns.drain(..) {
            let head_done = conn.buf.len() >= 4
                && conn.buf.windows(4).any(|window| window == b"\r\n\r\n");
            if head_done
                || conn.buf.len() > TOMBSTONE_READ_CAP.load(Ordering::Relaxed)
                || now >= conn.deadline
            {
                finish_tombstone_conn(&mut conn);
                continue;
            }
            match conn.stream.read(&mut scratch) {
                Ok(0) => finish_tombstone_conn(&mut conn),
                Ok(n) => {
                    conn.buf.extend_from_slice(&scratch[..n]);
                    remaining.push(conn);
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    remaining.push(conn);
                }
                Err(_) => {}
            }
        }
        conns = remaining;
        thread::sleep(ACCEPT_POLL_INTERVAL);
    }
}

/// 回 403 并关闭。close 前排干残余请求字节（有界 16 KiB）：socket 内残留
/// 未读数据会触发 RST 作废已写出的 403；排干有上界，客户端持续发送也
/// 不能拖住 supervisor。
fn finish_tombstone_conn(conn: &mut TombstoneConn) {
    let _ = conn.stream.set_write_timeout(Some(Duration::from_secs(1)));
    let _ = write_simple(
        &mut conn.stream,
        "403 Forbidden",
        b"scoped origin expired (stale port)",
    );
    let mut sink = [0u8; 4096];
    let mut drained = 0usize;
    while drained < 16 * 1024 {
        match conn.stream.read(&mut sink) {
            Ok(0) | Err(_) => break,
            Ok(n) => drained += n,
        }
    }
}

pub struct ScopedContentServer {
    origin: String,
    /// canonical 授权根。所有请求路径解析后必须落在它之内。
    canonical_root: PathBuf,
    shutdown: Arc<AtomicBool>,
    /// R12-test 调度 seam（见 ServerShared 同名字段）。
    hold_workers_at_entry: Arc<AtomicBool>,
    workers_spawned: Arc<AtomicUsize>,
    spawn_failure_injection: Arc<AtomicUsize>,
    worker: Option<JoinHandle<()>>,
}

/// 手动实现：JoinHandle 不实现 Debug，而消费方 AppState 派生了 Debug。
impl std::fmt::Debug for ScopedContentServer {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ScopedContentServer")
            .field("origin", &self.origin)
            .field("canonical_root", &self.canonical_root)
            .finish_non_exhaustive()
    }
}

impl ScopedContentServer {
    /// 为授权 root 启动一个独立 loopback 服务器。root 不存在或 canonicalize
    /// 失败时返回错误 —— 调用方（session attach）必须先确认来源有效。
    ///
    /// R11-a 第五轮（Codex revision 14 复核）：bind 流程 = bind（候选注入
    /// 或 :0）→ **锁内认领事务**（磁盘已含候选端口 = Conflict → 关闭重绑，
    /// ≤128 次预算内重选；登记故障 = Err，fail closed 不重试）→ 发布。
    /// 锁内「读-判-写」消除刷新-释放-再 bind 的 TOCTOU 窗口：另一实例在
    /// 任意时刻登记的身份都不可能被本进程发布。绝不发布旧身份。
    pub fn start(root: &Path) -> Result<Self, AppError> {
        ensure_registry_healthy()?;
        let canonical_root = root
            .canonicalize()
            .map_err(|_| AppError::IoError)?;
        if !canonical_root.is_dir() {
            return Err(AppError::InvalidParams);
        }

        let (listener, address) = {
            let mut bound = None;
            for _ in 0..128 {
                let listener = bind_listener().map_err(|_| AppError::IoError)?;
                let address = listener.local_addr().map_err(|_| AppError::IoError)?;
                match claim_port_identity(address.port())? {
                    ClaimOutcome::Claimed => {
                        bound = Some((listener, address));
                        break;
                    }
                    // 候选端口已是登记身份（另一实例已发布/登记）：确定性
                    // 拒绝该端口，关闭重绑 —— 绝不视为幂等成功。
                    ClaimOutcome::Conflict => drop(listener),
                }
            }
            bound.ok_or_else(|| {
                registry_failed("连续 128 次 bind 候选均为已登记端口身份，放弃启动".to_string())
            })?
        };
        Self::spawn_server(canonical_root, listener, address)
    }

    /// 测试 seam：显式在指定端口启动，与 `start` 走**同一认领事务**（bind →
    /// 锁内认领 → 发布）。登记历史端口即使此刻空闲也必须被认领事务拒绝 ——
    /// 「占用后释放」与「另一实例已登记」场景的确定性证明（不依赖 OS 恰好
    /// 把 bind(:0) 分到该端口）。
    #[doc(hidden)]
    pub fn start_on_port(root: &Path, port: u16) -> Result<Self, AppError> {
        ensure_registry_healthy()?;
        let canonical_root = root
            .canonicalize()
            .map_err(|_| AppError::IoError)?;
        if !canonical_root.is_dir() {
            return Err(AppError::InvalidParams);
        }
        let listener = TcpListener::bind(("127.0.0.1", port)).map_err(|_| AppError::IoError)?;
        let address = listener.local_addr().map_err(|_| AppError::IoError)?;
        match claim_port_identity(address.port())? {
            ClaimOutcome::Claimed => {}
            ClaimOutcome::Conflict => {
                return Err(registry_failed(format!(
                    "端口 {port} 属于已登记的历史 scoped 身份（可能为另一实例已发布的 origin），禁止复用（fail closed）"
                )));
            }
        }
        Self::spawn_server(canonical_root, listener, address)
    }

    /// 共用启动尾段：spawn accept worker，组装实例。
    fn spawn_server(
        canonical_root: PathBuf,
        listener: TcpListener,
        address: std::net::SocketAddr,
    ) -> Result<Self, AppError> {
        let origin = format!("http://127.0.0.1:{}", address.port());

        let shutdown = Arc::new(AtomicBool::new(false));
        let shared = Arc::new(ServerShared {
            canonical_root: canonical_root.clone(),
            shutdown: Arc::clone(&shutdown),
            active_connections: AtomicUsize::new(0),
            max_body_bytes: MAX_RESPONSE_BODY_BYTES,
            hold_workers_at_entry: Arc::new(AtomicBool::new(false)),
            workers_spawned: Arc::new(AtomicUsize::new(0)),
            spawn_failure_injection: Arc::new(AtomicUsize::new(0)),
        });
        let worker_shared = Arc::clone(&shared);
        let worker = thread::spawn(move || {
            accept_loop(listener, worker_shared);
        });

        Ok(Self {
            origin,
            canonical_root,
            shutdown: Arc::clone(&shutdown),
            hold_workers_at_entry: Arc::clone(&shared.hold_workers_at_entry),
            workers_spawned: Arc::clone(&shared.workers_spawned),
            spawn_failure_injection: Arc::clone(&shared.spawn_failure_injection),
            worker: Some(worker),
        })
    }

    pub fn origin(&self) -> &str {
        &self.origin
    }

    pub fn canonical_root(&self) -> &Path {
        &self.canonical_root
    }

    /// R12-test 调度 seam：置 true 时 worker 线程在入口阻塞、不推进。
    /// 用于确定性验证并发槽位在 spawn 前认领（见集成测试）。
    #[doc(hidden)]
    pub fn set_worker_entry_gate(&self, held: bool) {
        self.hold_workers_at_entry.store(held, Ordering::SeqCst);
    }

    /// R12-test：worker spawn 成功计数快照。
    #[doc(hidden)]
    pub fn workers_spawned(&self) -> usize {
        self.workers_spawned.load(Ordering::SeqCst)
    }

    /// R12-test：注入 n 次「线程创建失败」，accept loop 走真实失败回收路径。
    #[doc(hidden)]
    pub fn inject_spawn_failures(&self, count: usize) {
        self.spawn_failure_injection.store(count, Ordering::SeqCst);
    }

    /// 资源 URL 前缀（R11-a）：即 origin 本身 —— origin 根直接映射授权
    /// root，无 token 路径段。调用方拼接 `/{relative}`。
    /// Markdown payload 的 `resourceOrigin` 下发该前缀，前端拼相对路径
    /// 无需感知。
    pub fn resource_base(&self) -> String {
        self.origin.clone()
    }

    /// 生成会话内相对资源 URL：`{origin}/{token}/{逐段编码的相对路径}`。
    /// `relative` 必须已是 root 内的相对路径（调用方负责从文档引用解析）；
    /// 绝对路径或含 `..` 的输入返回 None，调用方不得回退到其他来源。
    pub fn relative_url(&self, relative: &Path) -> Option<String> {
        let encoded = self.encode_relative(relative)?;
        // R11-a：resource_base 即 origin，encoded 自带首段 `/`，直接拼接。
        Some(format!("{}{}", self.resource_base(), encoded))
    }

    fn encode_relative(&self, relative: &Path) -> Option<String> {
        if relative.is_absolute() {
            return None;
        }
        let mut encoded = String::new();
        for segment in relative.components() {
            let segment = match segment {
                std::path::Component::Normal(part) => part,
                _ => return None,
            };
            encoded.push('/');
            encoded.push_str(&percent_encode(&segment.to_string_lossy()));
        }
        if encoded.is_empty() {
            return None;
        }
        Some(encoded)
    }
}

impl Drop for ScopedContentServer {
    fn drop(&mut self) {
        // R11/R12：revoke。置位后 accept loop 退出、进行中的流式响应在
        // 下一个块边界中止，端口随 listener 释放。
        self.shutdown.store(true, Ordering::SeqCst);
        if let Some(worker) = self.worker.take() {
            // 非阻塞轮询下最多 ACCEPT_POLL_INTERVAL 后退出；join 只兜底。
            let _ = worker.join();
        }
    }
}

/// R12：连接槽 guard —— 认领与释放对称，worker panic / 提前返回都不会泄漏槽位。
struct ConnectionSlot {
    shared: Arc<ServerShared>,
}

impl Drop for ConnectionSlot {
    fn drop(&mut self) {
        self.shared.active_connections.fetch_sub(1, Ordering::SeqCst);
    }
}

fn accept_loop(listener: TcpListener, shared: Arc<ServerShared>) {
    listener
        .set_nonblocking(true)
        .expect("scoped server listener 设置非阻塞失败");
    loop {
        if shared.shutdown.load(Ordering::SeqCst) {
            break;
        }
        match listener.accept() {
            Ok((stream, _)) => {
                // BSD/macOS 上 accept 出的 socket 会继承 listener 的
                // O_NONBLOCK —— 必须显式恢复阻塞模式，否则无数据可读时
                // read 立即 WouldBlock，慢客户端连接被秒断。
                let mut stream = stream;
                let _ = stream.set_nonblocking(false);
                // R12（Codex 返修）：并发上限用 fetch_add **在 spawn 前原子
                // 认领**。旧实现 accept 线程 load 判断、worker 内才
                // fetch_add，worker 尚未调度时后续 accept 可继续通过，
                // 上限不是硬界。超限回退计数后 503，不占连接槽。
                if shared.active_connections.fetch_add(1, Ordering::SeqCst)
                    >= MAX_CONCURRENT_CONNECTIONS
                {
                    shared.active_connections.fetch_sub(1, Ordering::SeqCst);
                    let _ = stream.set_write_timeout(Some(CONNECTION_TIMEOUT));
                    let _ = write_simple(
                        &mut stream,
                        "503 Service Unavailable",
                        b"too many concurrent connections",
                    );
                    continue;
                }
                // R12-test：spawn 失败注入（确定性覆盖创建失败回收路径）。
                if shared.spawn_failure_injection.load(Ordering::SeqCst) > 0 {
                    shared.spawn_failure_injection.fetch_sub(1, Ordering::SeqCst);
                    shared.active_connections.fetch_sub(1, Ordering::SeqCst);
                    // 与真实 Builder::spawn Err 路径一致：释放槽位，连接随
                    // stream drop 关闭（客户端表现为连接断开，可重试）。
                    continue;
                }
                // 每连接一线程：慢客户端不阻塞其他请求。线程数由并发上限
                // 硬约束；Builder 命名 + 创建失败路径回收槽位。
                let worker_shared = Arc::clone(&shared);
                let gate_shared = Arc::clone(&shared);
                let spawned = thread::Builder::new()
                    .name("scoped-content-conn".to_string())
                    .spawn(move || {
                        // R12-test 调度 seam：worker 入口阻塞点（生产恒 false）。
                        // 必须位于任何槽位操作之前 —— 旧实现在这里之后才计数，
                        // seam 即使其永不发生。
                        while gate_shared.hold_workers_at_entry.load(Ordering::SeqCst) {
                            thread::sleep(Duration::from_millis(2));
                        }
                        let _slot = ConnectionSlot { shared: worker_shared };
                        let _ = handle_connection(stream, &_slot.shared);
                    });
                match spawned {
                    Ok(_) => {
                        shared.workers_spawned.fetch_add(1, Ordering::SeqCst);
                    }
                    Err(_) => {
                        // 线程创建失败（资源耗尽）：释放槽位；连接随闭包
                        // drop 关闭（客户端表现为连接断开，可重试）。
                        shared.active_connections.fetch_sub(1, Ordering::SeqCst);
                    }
                }
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                thread::sleep(ACCEPT_POLL_INTERVAL);
            }
            Err(_) => break,
        }
    }
}

fn handle_connection(mut stream: TcpStream, shared: &ServerShared) -> Result<(), AppError> {
    // R12：总期限。后续每次 read/write 前都复核剩余时间，单次 read 超时
    // 取 min(剩余期限, CONNECTION_TIMEOUT)，慢速分片无法延长占用。
    let deadline = Instant::now() + REQUEST_TOTAL_DEADLINE;
    apply_timeouts(&mut stream, deadline)?;
    if shared.shutdown.load(Ordering::SeqCst) {
        return Ok(());
    }

    let request_head = match read_request_head(&mut stream, deadline) {
        Ok(head) => head,
        Err(_) => return Ok(()), // 超时/超限/断开：直接放弃连接
    };
    if shared.shutdown.load(Ordering::SeqCst) {
        return Ok(());
    }
    let Some(request_line) = request_head.lines().next() else {
        return write_simple(&mut stream, "400 Bad Request", b"invalid request");
    };
    // R11-a：拒绝 Service Worker 注册 —— SW 脚本请求带 `Service-Worker:
    // script` 头，一律 404。scoped origin 上装不上持久拦截器，跨进程
    // 端口复用窗口没有 SW 残留可拦。
    if is_service_worker_script_request(&request_head) {
        return write_simple(
            &mut stream,
            "404 Not Found",
            b"service worker registration is not allowed",
        );
    }
    let mut parts = request_line.split_whitespace();
    let method = parts.next().unwrap_or_default();
    let raw_path = parts.next().unwrap_or("/");
    let _version = parts.next();

    // 只允许 GET / HEAD：内容会话不需要写方法，其余一律 405。
    if method != "GET" && method != "HEAD" {
        return write_simple(&mut stream, "405 Method Not Allowed", b"method not allowed");
    }

    let resolved = resolve_request(raw_path, shared);
    write_response(&mut stream, method == "HEAD", resolved, deadline, &shared.shutdown)
}

/// 在总期限约束下刷新单次 read/write 超时。剩余时间不足时返回错误。
fn apply_timeouts(stream: &mut TcpStream, deadline: Instant) -> Result<(), AppError> {
    let remaining = deadline.checked_duration_since(Instant::now()).ok_or(AppError::IoError)?;
    let per_op = remaining.min(CONNECTION_TIMEOUT);
    stream
        .set_read_timeout(Some(per_op))
        .map_err(|_| AppError::IoError)?;
    stream
        .set_write_timeout(Some(per_op))
        .map_err(|_| AppError::IoError)?;
    Ok(())
}

/// 读取请求头（到空行为止），受总期限与总大小双重约束。
fn read_request_head(
    stream: &mut TcpStream,
    deadline: Instant,
) -> Result<String, AppError> {
    let mut buffer = Vec::new();
    let mut chunk = [0_u8; 1024];
    loop {
        apply_timeouts(stream, deadline)?;
        if buffer.len() > MAX_REQUEST_HEAD_BYTES {
            return Err(AppError::InvalidParams);
        }
        let read = stream.read(&mut chunk).map_err(|_| AppError::IoError)?;
        if read == 0 {
            break;
        }
        buffer.extend_from_slice(&chunk[..read]);
        if buffer.windows(4).any(|window| window == b"\r\n\r\n") {
            break;
        }
        // 裸 \n\n 也能终止（宽松兼容），避免畸形客户端挂住线程。
        if buffer.windows(2).any(|window| window == b"\n\n") {
            break;
        }
    }
    Ok(String::from_utf8_lossy(&buffer).to_string())
}

/// R11-a：识别 Service Worker 脚本注册请求（`Service-Worker: script` 头，
/// 大小写不敏感）。头解析只需覆盖合法 HTTP 行形态。
fn is_service_worker_script_request(head: &str) -> bool {
    head.lines().skip(1).any(|line| {
        let Some((name, value)) = line.split_once(':') else {
            return false;
        };
        name.trim().eq_ignore_ascii_case("service-worker")
            && value.trim().eq_ignore_ascii_case("script")
    })
}

/// 请求路径 → 已解析响应。这是安全边界的唯一裁决点。
/// R12：文件只解析出路径与元数据，读文件推迟到流式写出阶段。
enum Resolved {
    File {
        path: PathBuf,
        content_type: &'static str,
        size: u64,
    },
    Simple {
        status: &'static str,
        content_type: &'static str,
        body: &'static [u8],
    },
}

fn resolve_request(raw_path: &str, shared: &ServerShared) -> Resolved {
    let not_found = Resolved::Simple {
        status: "404 Not Found",
        content_type: "text/plain; charset=utf-8",
        body: b"file not found",
    };
    let out_of_scope = || Resolved::Simple {
        status: "403 Forbidden",
        content_type: "text/plain; charset=utf-8",
        body: b"out of scope",
    };

    // 0) R11-a：origin 根 = 授权 root（D1 合同）。无 token 路径段 ——
    //    root-relative 引用（`/assets/...`、`base href=/`）按原语义解析；
    //    会话隔离由「进程内端口不复用 + SW 注册拒绝 + no-store + Drop 关
    //    端口」这些 origin 级机制承担（见模块文档）。
    let path_without_query = raw_path.split('?').next().unwrap_or(raw_path);
    let Some(decoded) = percent_decode(path_without_query) else {
        return out_of_scope();
    };
    if !decoded.starts_with('/') {
        return out_of_scope();
    }
    let mut segments = decoded.split('/');
    let _ = segments.next(); // 跳过首空段

    // 1) 逐段解析：空段丢弃；`..`、`.`、NUL、反斜杠段一律拒绝。
    //    反斜杠在 Windows 是路径分隔符，跨平台统一拒绝（macOS 文件名含
    //    `\` 的场景极少，安全收益大于功能损失）。
    let mut relative = PathBuf::new();
    for segment in segments {
        if segment.is_empty() {
            continue;
        }
        if segment == ".." || segment == "." || segment.contains('\\') || segment.contains('\0') {
            return out_of_scope();
        }
        relative.push(segment);
    }
    if relative.as_os_str().is_empty() {
        // 会话根本身：不暴露目录列表。
        return out_of_scope();
    }

    // 2) join root 后 canonicalize，组件级前缀比对封 symlink 逃逸。
    let candidate = shared.canonical_root.join(&relative);
    let Ok(canonical_candidate) = candidate.canonicalize() else {
        return not_found;
    };
    if !canonical_candidate.starts_with(&shared.canonical_root) {
        return out_of_scope();
    }
    if canonical_candidate.is_dir() {
        return out_of_scope();
    }

    // 3) 元数据先行（R12：HEAD 不读文件体；GET 的体量上限在读之前判定）。
    let Ok(metadata) = std::fs::metadata(&canonical_candidate) else {
        return not_found;
    };
    if !metadata.is_file() {
        return out_of_scope();
    }
    let size = metadata.len();
    if size > shared.max_body_bytes {
        return Resolved::Simple {
            status: "413 Payload Too Large",
            content_type: "text/plain; charset=utf-8",
            body: b"resource exceeds response budget",
        };
    }

    let content_type = content_type_for_path(&canonical_candidate);
    Resolved::File {
        path: canonical_candidate,
        content_type,
        size,
    }
}

fn write_response(
    stream: &mut TcpStream,
    head_only: bool,
    resolved: Resolved,
    deadline: Instant,
    shutdown: &AtomicBool,
) -> Result<(), AppError> {
    match resolved {
        Resolved::Simple {
            status,
            content_type,
            body,
        } => {
            let header = format!(
                "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n",
                body.len()
            );
            apply_timeouts(stream, deadline)?;
            stream.write_all(header.as_bytes()).map_err(|_| AppError::IoError)?;
            if !head_only {
                stream.write_all(body).map_err(|_| AppError::IoError)?;
            }
            Ok(())
        }
        Resolved::File {
            path,
            content_type,
            size,
        } => {
            let header = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n",
                content_type, size
            );
            apply_timeouts(stream, deadline)?;
            stream.write_all(header.as_bytes()).map_err(|_| AppError::IoError)?;
            if head_only {
                // R12：HEAD 仅元数据 —— 不打开/读取文件体。
                return Ok(());
            }
            let mut file = std::fs::File::open(&path).map_err(|_| AppError::IoError)?;
            let mut chunk = vec![0_u8; STREAM_CHUNK_BYTES];
            loop {
                // R11 revoke / R12 总期限：每个块边界复核，Drop 后立即中止。
                if shutdown.load(Ordering::SeqCst) {
                    return Err(AppError::IoError);
                }
                apply_timeouts(stream, deadline)?;
                let read = file.read(&mut chunk).map_err(|_| AppError::IoError)?;
                if read == 0 {
                    return Ok(());
                }
                stream
                    .write_all(&chunk[..read])
                    .map_err(|_| AppError::IoError)?;
            }
        }
    }
}

fn write_simple(stream: &mut TcpStream, status: &str, body: &[u8]) -> Result<(), AppError> {
    let header = format!(
        "HTTP/1.1 {status}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: {}\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n",
        body.len()
    );
    stream.write_all(header.as_bytes()).map_err(|_| AppError::IoError)?;
    stream.write_all(body).map_err(|_| AppError::IoError)?;
    Ok(())
}

/// 注意：不做跨平台保留字符豁免，非安全字符全部编码（与旧
/// `local_server::percent_encode` 行为一致）。
pub fn percent_encode(input: &str) -> String {
    let mut encoded = String::with_capacity(input.len());
    for byte in input.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char)
            }
            _ => encoded.push_str(&format!("%{byte:02X}")),
        }
    }
    encoded
}

/// 单遍 percent-decode；不完整或非法 `%` 序列返回 None（调用方拒绝请求）。
pub fn percent_decode(input: &str) -> Option<String> {
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
            b'%' => return None,
            byte => {
                output.push(byte);
                index += 1;
            }
        }
    }

    String::from_utf8(output).ok()
}

fn content_type_for_path(path: &Path) -> &'static str {
    match path
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
        "avif" => "image/avif",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        "txt" | "md" | "markdown" => "text/plain; charset=utf-8",
        "mp4" | "m4v" => "video/mp4",
        "webm" => "video/webm",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "ogg" => "audio/ogg",
        "pdf" => "application/pdf",
        "wasm" => "application/wasm",
        _ => "application/octet-stream",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_scope(tag: &str) -> PathBuf {
        let base = std::env::temp_dir().join(format!(
            "nutbook-scoped-server-{}-{:?}-{:?}",
            tag,
            std::process::id(),
            std::thread::current().id()
        ));
        let _ = std::fs::remove_dir_all(&base);
        std::fs::create_dir_all(&base).expect("创建临时目录失败");
        base
    }

    #[test]
    fn start_rejects_missing_root() {
        let base = temp_scope("missing");
        let result = ScopedContentServer::start(&base.join("does-not-exist"));
        assert!(result.is_err(), "不存在的 root 必须启动失败");
    }

    #[test]
    fn start_rejects_file_root() {
        let base = temp_scope("file-root");
        let file = base.join("not-a-dir.txt");
        std::fs::write(&file, b"x").expect("写入文件失败");
        assert!(ScopedContentServer::start(&file).is_err(), "文件 root 必须启动失败");
    }

    #[test]
    fn relative_url_rejects_absolute_and_dot_segments() {
        let base = temp_scope("relative-url");
        std::fs::create_dir_all(&base).expect("创建目录失败");
        let server = ScopedContentServer::start(&base).expect("启动失败");

        assert!(server.relative_url(Path::new("/abs/path.html")).is_none());
        assert!(server.relative_url(Path::new("../outside.html")).is_none());
        assert!(server.relative_url(Path::new("a/../../b.html")).is_none());
        assert!(server.relative_url(Path::new("")).is_none());

        let url = server
            .relative_url(Path::new("sub dir/index.html"))
            .expect("正常相对路径应生成 URL");
        assert!(url.starts_with(&format!("{}/", server.resource_base())), "URL 应以 origin 根开头：{url}");
        assert!(url.ends_with("/sub%20dir/index.html"), "空格应被编码：{url}");
        let _ = std::fs::remove_dir_all(&base);
    }

    #[test]
    fn percent_decode_rejects_truncated_escape() {
        assert_eq!(percent_decode("a%2Fb"), Some("a/b".to_string()));
        assert_eq!(percent_decode("trailing%2"), None);
        assert_eq!(percent_decode("lone%"), None);
        assert_eq!(percent_decode("bad%zz"), None);
    }

    fn test_shared(server: &ScopedContentServer) -> ServerShared {
        ServerShared {
            canonical_root: server.canonical_root.clone(),
            shutdown: Arc::new(AtomicBool::new(false)),
            active_connections: AtomicUsize::new(0),
            max_body_bytes: MAX_RESPONSE_BODY_BYTES,
            hold_workers_at_entry: Arc::new(AtomicBool::new(false)),
            workers_spawned: Arc::new(AtomicUsize::new(0)),
            spawn_failure_injection: Arc::new(AtomicUsize::new(0)),
        }
    }

    /// R11-a：origin 根 = 授权 root —— root-relative 路径（页面内
    /// `/assets/...`、`base href=/` 产生的无前缀 URL）按原语义解析。
    #[test]
    fn resolve_request_serves_root_relative_paths() {
        let base = temp_scope("root-relative");
        std::fs::write(base.join("doc.html"), b"hello").expect("写入失败");
        std::fs::create_dir_all(base.join("assets")).expect("创建目录失败");
        std::fs::write(base.join("assets").join("logo.png"), b"png").expect("写入失败");
        let server = ScopedContentServer::start(&base).expect("启动失败");
        let shared = test_shared(&server);

        assert!(matches!(resolve_request("/doc.html", &shared), Resolved::File { .. }));
        assert!(matches!(resolve_request("/assets/logo.png", &shared), Resolved::File { .. }));
        // relative_url 产物不再携带 token 段。
        let url = server
            .relative_url(Path::new("doc.html"))
            .expect("relative_url 应生成 URL");
        assert_eq!(
            url,
            format!("{}/doc.html", server.origin()),
            "relative_url 产物 = origin + 根相对路径"
        );
        let _ = std::fs::remove_dir_all(&base);
    }

    /// R11-a：穿越防护不变 —— 无 token 路径段不改变段校验语义。
    #[test]
    fn resolve_request_keeps_segment_validation() {
        let base = temp_scope("segments");
        std::fs::write(base.join("doc.html"), b"hello").expect("写入失败");
        let server = ScopedContentServer::start(&base).expect("启动失败");
        let shared = test_shared(&server);
        // `..` 段（字面或编码）一律 403；`%2f` 解码为合法分隔符（a/b.html 不存在 → 404）。
        for path in [
            "/../outside.html",
            "/a/%2e%2e/b.html",
            "/a%2f..%2fb.html",
            "/",
        ] {
            assert!(
                matches!(resolve_request(path, &shared), Resolved::Simple { status: "403 Forbidden", .. }),
                "{path} 必须 403"
            );
        }
        assert!(
            matches!(resolve_request("/a%2fb.html", &shared), Resolved::Simple { status: "404 Not Found", .. }),
            "%2f 解码为分隔符属正常路径解析（a/b.html 不存在 → 404）"
        );
        let _ = std::fs::remove_dir_all(&base);
    }

    /// R11-a：SW 脚本注册请求头识别（大小写不敏感，仅精确值 `script`）。
    #[test]
    fn service_worker_script_requests_are_identified() {
        let head = "GET /sw.js HTTP/1.1\r\nHost: x\r\nService-Worker: script\r\n\r\n";
        assert!(is_service_worker_script_request(head));
        let head_mixed = "GET /sw.js HTTP/1.1\r\nservice-worker: SCRIPT\r\n\r\n";
        assert!(is_service_worker_script_request(head_mixed));
        // 非注册请求不受影响。
        assert!(!is_service_worker_script_request(
            "GET /sw.js HTTP/1.1\r\nService-Worker: navigation\r\n\r\n"
        ));
        assert!(!is_service_worker_script_request(
            "GET /index.html HTTP/1.1\r\nAccept: */*\r\n\r\n"
        ));
    }

    /// R11-a：同进程内端口永不复用 —— Drop 后重新 start，新端口不得与
    /// 本进程任何出现过的端口相同（含跨实例、跨 root）。
    #[test]
    fn ports_are_never_reused_within_process() {
        let base = temp_scope("port-reuse");
        std::fs::create_dir_all(&base).expect("创建目录失败");
        let mut origins = Vec::new();
        for index in 0..12 {
            let server = ScopedContentServer::start(&base).expect("启动失败");
            assert!(
                !origins.contains(&server.origin().to_string()),
                "第 {index} 个实例不得复用已出现过的端口"
            );
            origins.push(server.origin().to_string());
            // Drop 释放端口，但 used-ports 登记仍在 —— 下一个实例不得再绑到它。
            drop(server);
        }
        let _ = std::fs::remove_dir_all(&base);
    }
}
