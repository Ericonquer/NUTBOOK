//! PR C Phase 1（Codex R9/R11）：内容面 webview 会话登记表。
//!
//! D2 闸门按 label 前缀分类只解决了「哪类 webview 存在」，没有解决
//! 「这个 webview 是否是宿主真实创建的内容会话、加载的还是不是当初的
//! scoped origin」。本模块补上会话身份：
//!
//! - 宿主创建每个内容 webview（host / player / presentation preview /
//!   popup）时登记 `{role, item_id, origin, runtime_session_id, generation}`；
//! - 内容面命令（桥消息 / 可编辑副本写入 / view-state 回报）与标题桥
//!   fallback 一律先查登记：未登记、导航离开注册 origin、session/generation
//!   不匹配的调用全部拒绝；
//! - 会话撤销（关闭标签 / 编辑会话失效 / 来源失效）同步注销登记。
//!
//! 纯数据 + 纯函数，便于在无 Tauri 运行时的单元测试中验证裁决规则。

use std::{
    collections::HashMap,
    sync::Mutex,
};

use serde_json::Value;

use crate::errors::AppError;

/// 内容面 webview 角色。label 前缀由宿主创建代码唯一决定，页面 JS 无法伪造。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ContentSurfaceRole {
    /// 内嵌 runtime host（`html-host-{item}`）。
    RuntimeHost,
    /// P2（Codex revision 32）：外部临时会话的内嵌 host
    /// （`html-host-ext-{sessionId}`）。**阅读态**——加入前没有 itemId，
    /// 不得进入编辑 / conversion / sidecar / editable-copy / commit 路径。
    ExternalHost,
    /// 独立 runtime 窗口（`html-player-{item}`）。
    DetachedPlayer,
    /// 演示预览（`html-presentation-preview-{item}`）。
    PresentationPreview,
    /// 内容页 window.open 弹窗（`html-runtime-popup-*`）。
    RuntimePopup,
}

impl ContentSurfaceRole {
    /// 从 webview label 识别内容面角色；非内容面 label 返回 None。
    ///
    /// 注意顺序：`html-host-ext-` 必须先于 `html-host-` 判定，否则外部
    /// 临时 host 会被误认成正式 item host（前缀包含关系）。
    pub fn from_label(label: &str) -> Option<Self> {
        if label.starts_with("html-host-ext-") {
            Some(Self::ExternalHost)
        } else if label.starts_with("html-host-") {
            Some(Self::RuntimeHost)
        } else if label.starts_with("html-player-") {
            Some(Self::DetachedPlayer)
        } else if label.starts_with("html-presentation-preview-") {
            Some(Self::PresentationPreview)
        } else if label.starts_with("html-runtime-popup-") {
            Some(Self::RuntimePopup)
        } else {
            None
        }
    }

    /// R9-b（Codex 返修）：角色允许的桥消息类型。**精确清单，不用前缀** ——
    /// 前缀匹配会随新消息类型静默扩权，也无法区分真实协议。
    ///
    /// 清点来源（真实发送方，非推测）：
    /// - `dist/assets/html-edit-runtime.js`（host/player 内注入的编辑 runtime）
    /// - `dist/index.html` 注入 host webview 的 document-ready / 转换脚本
    /// - `html_runtime.rs` 注入 presentation preview webview 的缩略图脚本
    ///
    /// 权限语义：清单内消息均为「状态回报 / 请求」类（保存/跳转等写操作
    /// 仍由 main 侧以 lease 校验过的命令执行，消息本身无写能力）；发送方
    /// 仍须通过会话登记 + origin + item + lease/generation 全部校验。
    pub fn allows_message_type(&self, message_type: &str) -> bool {
        /// host / player（读写入口）精确允许的消息类型。
        const RUNTIME_TYPES: [&str; 20] = [
            // document ready / 转换探针与结果（转换脚本，R10 结果 item 见
            // payload_item 层的服务端副本校验）
            "html_edit_runtime_document_ready",
            "html_edit_conversion_probe",
            "html_edit_conversion_result",
            // 编辑 runtime 生命周期与状态回报
            "html_edit_ready",
            "html_edit_state_snapshot",
            "html_edit_document_changed",
            "html_edit_mark_saved_result",
            // 用户在 runtime 内发起的保存 / 完成请求（main 侧再校验 lease）
            "html_edit_save_requested_from_runtime",
            "html_edit_done_requested_from_runtime",
            // 章节导航回报
            "html_edit_section_navigation_ready",
            "html_edit_section_navigation_changed",
            "html_edit_section_navigation_result",
            // 演示翻页回报（host/player 内的演示内容）
            "html_edit_presentation_page_changed",
            "html_edit_presentation_navigation_result",
            // 资产 / 插图替换请求（main 侧以 lease 命令执行写入）
            "html_edit_asset_replace_requested",
            "html_edit_inserted_image_confirmed",
            "html_edit_inserted_image_replace_requested",
            "html_edit_inserted_image_unsupported",
            // 补丁字段结果与诊断日志
            "html_edit_patch_field_result",
            "html_edit_history_debug",
        ];
        /// 演示预览精确允许的消息类型（仅缩略图脚本的三种回报）。
        const PREVIEW_TYPES: [&str; 3] = [
            "html_edit_presentation_preview_ready",
            "html_edit_presentation_preview_clicked",
            "html_edit_presentation_preview_navigate",
        ];
        match self {
            Self::RuntimeHost | Self::DetachedPlayer => RUNTIME_TYPES.contains(&message_type),
            Self::PresentationPreview => PREVIEW_TYPES.contains(&message_type),
            // P2 细线：外部临时 host 是**阅读态**，没有 item 身份，也没有编辑
            // 会话。它不与宿主发生任何桥消息往来 —— 阅读内容本身不需要桥。
            // 演示翻页 / find 等阅读能力落地时，必须在此**显式**加入所需类型，
            // 不能借用 RuntimeHost 的清单（Codex revision 32 §4：加入本身不
            // 升级权限，阅读 token 上不叠加编辑命令）。
            Self::ExternalHost => false,
            // 弹窗当前无合法用途，一律拒绝。
            Self::RuntimePopup => false,
        }
    }
}

/// P2（Codex revision 32「有界 A」）：内容承载对象的**资源身份**。
///
/// 与前端标签的**稳定身份**是两件事：前端标签 id 为 `external:<sessionId>`
/// （promotion 前后不变），而资源身份在 promotion 时由 `External` 受控迁移为
/// `Item`。两者不可互相替代。
///
/// 身份只由宿主创建代码写入，并且**必须**来自后端有效会话（item 详情或
/// external 会话登记）—— 内容页面自报的 itemId / sessionId / label 前缀都不
/// 构成授权依据。
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum RuntimeKey {
    /// 正式资料库条目。旧 item 分支的约束完全不变。
    Item(i64),
    /// 外部临时会话（加入前没有 itemId）。载荷为 external session id。
    External(String),
}

impl RuntimeKey {
    /// webview label 中段。宿主唯一决定，页面 JS 无法伪造。
    ///
    /// - `Item(7)` → `7`，与 P1 之前的标签逐字一致（`html-host-7`）；
    /// - `External("ext-<uuid>")` → `ext-<uuid>`（`html-host-ext-<uuid>`）。
    ///
    /// 两域前缀不冲突：item 段是纯数字，external 段以 `ext-` 开头。
    pub fn label_segment(&self) -> String {
        match self {
            Self::Item(item_id) => item_id.to_string(),
            Self::External(session_id) => {
                // session id 由后端生成（`ext-<uuid>`）；这里再做一次字符集
                // 收窄，保证 label 永远落在 Tauri 合法字符集内。
                let sanitized: String = session_id
                    .chars()
                    .filter(|ch| ch.is_ascii_alphanumeric() || *ch == '-' || *ch == '_')
                    .collect();
                if sanitized.is_empty() {
                    "external-unnamed".to_string()
                } else {
                    sanitized
                }
            }
        }
    }

    pub fn item_id(&self) -> Option<i64> {
        match self {
            Self::Item(item_id) => Some(*item_id),
            Self::External(_) => None,
        }
    }

    pub fn external_session_id(&self) -> Option<&str> {
        match self {
            Self::Item(_) => None,
            Self::External(session_id) => Some(session_id.as_str()),
        }
    }
}

/// 单个内容 webview 的会话登记。
#[derive(Debug, Clone)]
pub struct ContentSessionRecord {
    pub role: ContentSurfaceRole,
    /// P2：资源身份（Item 或 External）。此前这里是 `item_id: i64` —— 外部
    /// 会话没有 itemId，用统一 key 表达，**不**采用 `item_id = 0` 哨兵再分支
    /// 绕校验的做法（Codex revision 32 §3）。
    pub key: RuntimeKey,
    /// webview 创建时下发的 scoped origin（`http://127.0.0.1:{port}`）。
    /// 导航离开该 origin（远程页面）即失去会话授权（R9 导航失效）。
    pub origin: String,
    /// 该 webview 绑定的编辑会话；只读 surface 为空串（消息校验退回
    /// item 当前 lease 匹配）。
    pub runtime_session_id: String,
    pub generation: u64,
    /// R9-c（Codex 返修）：该 webview 初始化脚本注入的 view-state surface
    /// token（`html_runtime_view_state_script` 的 `__NUTBOOK_SURFACE_TOKEN__`）。
    /// 只有宿主按该 token 下发的 surface 才能回报 view-state；未注入
    /// view-state 脚本的 surface（player / presentation / popup）为 0，
    /// 任何 view-state 回报一律拒绝。token 由宿主单调分配，页面 JS 无法
    /// 伪造自己的 token（只能读到），更不能以他人 token 冒充。
    pub view_state_surface_token: u64,
}

/// R9-c：view-state 回报的 surface 身份纯校验。发送方登记记录里的
/// surface token 必须与 payload 声明的 `surfaceToken` 精确一致且非零 ——
/// 旧 surface（已被换代）、未注入 view-state 脚本的 surface（token=0）
/// 与伪造他人 token 的回报全部拒绝。item 归属校验见
/// `commands::preview::payload_items_authorized`（两条通道共用）。
pub fn view_state_surface_matches(record: &ContentSessionRecord, payload: &Value) -> bool {
    let token = payload
        .get("surfaceToken")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    token != 0 && token == record.view_state_surface_token
}

/// 桥消息裁决失败原因（可读、可断言）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BridgeRejection {
    Unregistered,
    NavigatedAway,
    ItemMismatch,
    TypeNotAllowed,
    SessionMismatch,
}

impl std::fmt::Display for BridgeRejection {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let text = match self {
            Self::Unregistered => "content session not registered",
            Self::NavigatedAway => "content webview navigated away from registered origin",
            Self::ItemMismatch => "payload item does not match registered session",
            Self::TypeNotAllowed => "message type not allowed for surface role",
            Self::SessionMismatch => "runtime session/generation does not match",
        };
        f.write_str(text)
    }
}

/// 从 URL 提取 origin（`scheme://authority`）。无法解析返回 None。
pub fn origin_of_url(url: &str) -> Option<String> {
    let (scheme, rest) = url.split_once("://")?;
    if scheme != "http" && scheme != "https" {
        return None;
    }
    let authority = rest.split(['/', '?', '#']).next()?;
    if authority.is_empty() {
        return None;
    }
    Some(format!("{scheme}://{authority}"))
}

/// R9：桥消息统一裁决。`record` 为 None = 未登记；`webview_url` 为调用时
/// webview 真实 URL（导航失效依据）；`lease` 为 item 当前生效编辑会话。
///
/// P2（Codex revision 32 §3）：item 身份比较改为按 `RuntimeKey` 形态判定 ——
/// - `Item(id)`：payload 必须自报该 itemId（旧约束不变）；
/// - `External(_)`：payload **不得**自报任何 itemId。外部内容面本来就没有
///   item 身份，自报一律按伪造处理（不为加入伪造 itemId 骗过数据库路径）。
pub fn verify_bridge_message(
    record: Option<&ContentSessionRecord>,
    webview_url: Option<&str>,
    payload_item_id: Option<i64>,
    payload_session_id: &str,
    payload_generation: u64,
    message_type: &str,
    lease: Option<(&str, u64)>,
) -> Result<(), BridgeRejection> {
    let Some(record) = record else {
        return Err(BridgeRejection::Unregistered);
    };
    // 导航失效：当前 URL 的 origin 必须仍是注册 origin。about:blank 是
    // 初始导航的过渡态，放行（消息只会在页面脚本执行后到达）。
    if let Some(url) = webview_url {
        if url != "about:blank" {
            let current = origin_of_url(url).ok_or(BridgeRejection::NavigatedAway)?;
            if current != record.origin {
                return Err(BridgeRejection::NavigatedAway);
            }
        }
    }
    match &record.key {
        RuntimeKey::Item(registered_item_id) => {
            if payload_item_id != Some(*registered_item_id) {
                return Err(BridgeRejection::ItemMismatch);
            }
        }
        RuntimeKey::External(_) => {
            if payload_item_id.is_some() {
                return Err(BridgeRejection::ItemMismatch);
            }
        }
    }
    if !record.role.allows_message_type(message_type) {
        return Err(BridgeRejection::TypeNotAllowed);
    }
    // 会话身份：绑定会话的 surface（演示预览）必须精确匹配登记身份；
    // 只读 surface 按资源身份分流 —— 外部阅读面绑定 external 会话登记时的
    // generation（宿主注入，页面无法伪造），item 面退回 item 当前 lease 匹配
    // （转换脚本由宿主按 lease 注入）。
    if !record.runtime_session_id.is_empty() {
        if payload_session_id != record.runtime_session_id
            || payload_generation != record.generation
        {
            return Err(BridgeRejection::SessionMismatch);
        }
    } else {
        match &record.key {
            RuntimeKey::Item(_) => {
                let Some((lease_session, lease_generation)) = lease else {
                    return Err(BridgeRejection::SessionMismatch);
                };
                if payload_session_id != lease_session || payload_generation != lease_generation {
                    return Err(BridgeRejection::SessionMismatch);
                }
            }
            RuntimeKey::External(_) => {
                if payload_generation != record.generation {
                    return Err(BridgeRejection::SessionMismatch);
                }
            }
        }
    }
    Ok(())
}

/// 内容面 webview 会话登记表。R9/R11。
#[derive(Default)]
pub struct ContentSessionRegistry {
    sessions: Mutex<HashMap<String, ContentSessionRecord>>,
}

impl std::fmt::Debug for ContentSessionRegistry {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let sessions = self.sessions.lock().map(|sessions| sessions.len()).unwrap_or(0);
        f.debug_struct("ContentSessionRegistry")
            .field("active_sessions", &sessions)
            .finish()
    }
}

impl ContentSessionRegistry {
    /// 宿主创建内容 webview 后登记。同 label 重复登记覆盖（替换 surface）。
    pub fn register(&self, label: &str, record: ContentSessionRecord) -> Result<(), AppError> {
        self.sessions
            .lock()
            .map_err(|_| AppError::InternalError)?
            .insert(label.to_string(), record);
        Ok(())
    }

    pub fn get(&self, label: &str) -> Option<ContentSessionRecord> {
        self.sessions
            .lock()
            .ok()
            .and_then(|sessions| sessions.get(label).cloned())
    }

    /// 注销单个 webview 会话。
    pub fn unregister(&self, label: &str) -> bool {
        self.sessions
            .lock()
            .map(|mut sessions| sessions.remove(label).is_some())
            .unwrap_or(false)
    }

    /// R11：来源失效（item 删除 / 资料库移除）批量注销该 item 的全部登记。
    /// 返回注销数。只命中 `RuntimeKey::Item`，外部临时会话不受影响。
    pub fn unregister_item(&self, item_id: i64) -> usize {
        self.unregister_matching(|record| record.key == RuntimeKey::Item(item_id))
    }

    /// P2：外部临时会话关闭时批量注销其全部登记（host / 未来的 player 等）。
    /// 返回注销数。
    pub fn unregister_external(&self, session_id: &str) -> usize {
        self.unregister_matching(|record| record.key == RuntimeKey::External(session_id.to_string()))
    }

    fn unregister_matching(&self, matches: impl Fn(&ContentSessionRecord) -> bool) -> usize {
        self.sessions
            .lock()
            .map(|mut sessions| {
                let stale: Vec<String> = sessions
                    .iter()
                    .filter(|(_, record)| matches(record))
                    .map(|(label, _)| label.clone())
                    .collect();
                let count = stale.len();
                for label in stale {
                    sessions.remove(&label);
                }
                count
            })
            .unwrap_or(0)
    }

    /// R9：按 scoped origin 反查已登记内容身份 —— 弹窗（window.open）继承
    /// 打开者的 origin，用 origin 归属到对应承载对象（item 或外部会话）。
    /// 远程 URL 无匹配。
    pub fn find_key_by_origin(&self, origin: &str) -> Option<RuntimeKey> {
        self.sessions
            .lock()
            .ok()
            .and_then(|sessions| {
                sessions
                    .values()
                    .find(|record| !record.origin.is_empty() && record.origin == origin)
                    .map(|record| record.key.clone())
            })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn record(role: ContentSurfaceRole, session: &str, generation: u64) -> ContentSessionRecord {
        ContentSessionRecord {
            role,
            key: RuntimeKey::Item(42),
            origin: "http://127.0.0.1:50000".into(),
            runtime_session_id: session.into(),
            generation,
            view_state_surface_token: 7,
        }
    }

    fn record_for_item(role: ContentSurfaceRole, item_id: i64) -> ContentSessionRecord {
        ContentSessionRecord {
            role,
            key: RuntimeKey::Item(item_id),
            origin: "http://127.0.0.1:50000".into(),
            runtime_session_id: String::new(),
            generation: 0,
            view_state_surface_token: 7,
        }
    }

    /// P2：外部临时会话登记（无 itemId，generation 为外部会话 generation）。
    fn record_external(role: ContentSurfaceRole, session_id: &str, generation: u64) -> ContentSessionRecord {
        ContentSessionRecord {
            role,
            key: RuntimeKey::External(session_id.to_string()),
            origin: "http://127.0.0.1:51000".into(),
            runtime_session_id: String::new(),
            generation,
            view_state_surface_token: 0,
        }
    }

    /// R9-c：view-state 回报的 surface 身份裁决。合法 surface（token 匹配）
    /// 放行；伪造他人 token、旧 token、未注入 view-state 脚本的 surface
    /// （token=0）与缺失字段的 payload 全部拒绝。
    #[test]
    fn view_state_surface_matches_enforces_sender_surface_identity() {
        let host = record(ContentSurfaceRole::RuntimeHost, "", 0); // token = 7

        // A→A：自己的 token 合法。
        assert!(view_state_surface_matches(&host, &serde_json::json!({ "surfaceToken": 7 })));
        // A→B：伪造 item B 的当前 token（可被顺序猜测）必须拒绝。
        assert!(!view_state_surface_matches(&host, &serde_json::json!({ "surfaceToken": 2 })));
        // 旧 surface：已被换代下发的旧 token 拒绝。
        assert!(!view_state_surface_matches(&host, &serde_json::json!({ "surfaceToken": 6 })));
        // 未注入 view-state 脚本的 surface：token=0 的登记记录（player /
        // presentation / popup）任何回报都拒绝。
        let mut silent = host.clone();
        silent.view_state_surface_token = 0;
        assert!(!view_state_surface_matches(&silent, &serde_json::json!({ "surfaceToken": 0 })));
        assert!(!view_state_surface_matches(&silent, &serde_json::json!({ "surfaceToken": 7 })));
        // payload 缺字段 / 非数值 → 拒绝（fail-closed）。
        assert!(!view_state_surface_matches(&host, &serde_json::json!({})));
        assert!(!view_state_surface_matches(&host, &serde_json::json!({ "surfaceToken": "7" })));
    }

    #[test]
    fn origin_of_url_parses_authority() {
        assert_eq!(
            origin_of_url("http://127.0.0.1:50000/t/doc.html"),
            Some("http://127.0.0.1:50000".into())
        );
        assert_eq!(origin_of_url("about:blank"), None);
        assert_eq!(origin_of_url("http://"), None);
    }

    /// R8 复现核心：注册 webview + 匹配会话才放行；未注册一律拒绝。
    #[test]
    fn verify_rejects_unregistered_and_mismatched() {
        let registered = record(ContentSurfaceRole::RuntimeHost, "s-1", 3);
        assert_eq!(
            verify_bridge_message(
                Some(&registered),
                Some("http://127.0.0.1:50000/t/doc.html"),
                Some(42),
                "s-1",
                3,
                "html_edit_conversion_result",
                None,
            ),
            Ok(())
        );
        assert_eq!(
            verify_bridge_message(None, Some("http://127.0.0.1:50000/x"), Some(42), "s-1", 3, "html_edit_conversion_result", None),
            Err(BridgeRejection::Unregistered)
        );
        assert_eq!(
            verify_bridge_message(
                Some(&registered),
                Some("http://127.0.0.1:50000/t/doc.html"),
                Some(43),
                "s-1",
                3,
                "html_edit_conversion_result",
                None,
            ),
            Err(BridgeRejection::ItemMismatch)
        );
        assert_eq!(
            verify_bridge_message(
                Some(&registered),
                Some("http://127.0.0.1:50000/t/doc.html"),
                Some(42),
                "s-1",
                4,
                "html_edit_conversion_result",
                None,
            ),
            Err(BridgeRejection::SessionMismatch)
        );
    }

    /// R9：导航离开注册 origin 即失效。
    #[test]
    fn verify_rejects_after_navigation() {
        let registered = record(ContentSurfaceRole::RuntimeHost, "", 0);
        assert_eq!(
            verify_bridge_message(
                Some(&registered),
                Some("https://evil.example/x"),
                Some(42),
                "lease-s",
                1,
                "html_edit_conversion_result",
                Some(("lease-s", 1)),
            ),
            Err(BridgeRejection::NavigatedAway)
        );
        // about:blank 过渡态放行
        assert_eq!(
            verify_bridge_message(
                Some(&registered),
                Some("about:blank"),
                Some(42),
                "lease-s",
                1,
                "html_edit_runtime_document_ready",
                Some(("lease-s", 1)),
            ),
            Ok(())
        );
    }

    /// R9：只读 surface 退回 item 当前 lease 匹配；lease 失效即拒绝。
    #[test]
    fn verify_read_surface_uses_current_lease() {
        let registered = record(ContentSurfaceRole::DetachedPlayer, "", 0);
        assert_eq!(
            verify_bridge_message(
                Some(&registered),
                Some("http://127.0.0.1:50000/t/doc.html"),
                Some(42),
                "lease-s",
                1,
                "html_edit_conversion_result",
                Some(("lease-s", 1)),
            ),
            Ok(())
        );
        // lease 已被更新（旧代次调用拒绝）
        assert_eq!(
            verify_bridge_message(
                Some(&registered),
                Some("http://127.0.0.1:50000/t/doc.html"),
                Some(42),
                "lease-s",
                1,
                "html_edit_conversion_result",
                Some(("lease-s", 2)),
            ),
            Err(BridgeRejection::SessionMismatch)
        );
        // 无 lease（纯阅读，无编辑会话）拒绝
        assert_eq!(
            verify_bridge_message(
                Some(&registered),
                Some("http://127.0.0.1:50000/t/doc.html"),
                Some(42),
                "lease-s",
                1,
                "html_edit_conversion_result",
                None,
            ),
            Err(BridgeRejection::SessionMismatch)
        );
    }

    /// R9：类型按角色分权。
    #[test]
    fn verify_enforces_role_type_permissions() {
        let host = record(ContentSurfaceRole::RuntimeHost, "s-1", 3);
        assert_eq!(
            verify_bridge_message(Some(&host), None, Some(42), "s-1", 3, "html_edit_presentation_preview_ready", None),
            Err(BridgeRejection::TypeNotAllowed)
        );
        let preview = record(ContentSurfaceRole::PresentationPreview, "s-1", 3);
        assert_eq!(
            verify_bridge_message(Some(&preview), None, Some(42), "s-1", 3, "html_edit_conversion_result", None),
            Err(BridgeRejection::TypeNotAllowed)
        );
        assert_eq!(
            verify_bridge_message(Some(&preview), None, Some(42), "s-1", 3, "html_edit_presentation_preview_navigate", None),
            Ok(())
        );
        // 弹窗无合法消息
        let popup = record(ContentSurfaceRole::RuntimePopup, "", 0);
        assert_eq!(
            verify_bridge_message(Some(&popup), None, Some(42), "s-1", 3, "html_edit_conversion_result", Some(("s-1", 3))),
            Err(BridgeRejection::TypeNotAllowed)
        );
    }

    #[test]
    fn registry_register_get_unregister_item() {
        let registry = ContentSessionRegistry::default();
        registry
            .register("html-host-42", record(ContentSurfaceRole::RuntimeHost, "", 0))
            .expect("登记失败");
        registry
            .register("html-player-42", record(ContentSurfaceRole::DetachedPlayer, "", 0))
            .expect("登记失败");
        registry
            .register("html-host-43", record_for_item(ContentSurfaceRole::RuntimeHost, 43))
            .expect("登记失败");

        assert!(registry.get("html-host-42").is_some());
        assert!(registry.unregister("html-player-42"));
        assert_eq!(registry.unregister_item(42), 1);
        assert!(registry.get("html-host-42").is_none());
        assert!(registry.get("html-host-43").is_some(), "其他 item 不受影响");
        assert!(!registry.unregister("html-host-42"));
    }

    /// R9-b：真实协议消息合同。host/player 实际发送的回报/请求消息必须
    /// 全部放行（Codex 复核曾确认 ready / snapshot / section_navigation_ready
    /// 被旧前缀表拒绝）；清单外的 `html_edit_*` 一律拒绝 —— 新消息类型必须
    /// 显式加入合同，不能靠前缀静默扩权。
    #[test]
    fn runtime_role_allows_real_protocol_messages_only() {
        let host = record(ContentSurfaceRole::RuntimeHost, "s-1", 3);
        const REAL_MESSAGES: [&str; 15] = [
            "html_edit_ready",
            "html_edit_state_snapshot",
            "html_edit_document_changed",
            "html_edit_mark_saved_result",
            "html_edit_save_requested_from_runtime",
            "html_edit_done_requested_from_runtime",
            "html_edit_section_navigation_ready",
            "html_edit_section_navigation_changed",
            "html_edit_section_navigation_result",
            "html_edit_presentation_page_changed",
            "html_edit_presentation_navigation_result",
            "html_edit_asset_replace_requested",
            "html_edit_inserted_image_confirmed",
            "html_edit_patch_field_result",
            "html_edit_history_debug",
        ];
        for message_type in REAL_MESSAGES {
            assert!(
                host.role.allows_message_type(message_type),
                "host 必须放行真实协议消息 {message_type}"
            );
            assert_eq!(
                verify_bridge_message(
                    Some(&host),
                    Some("http://127.0.0.1:50000/t/doc.html"),
                    Some(42),
                    "s-1",
                    3,
                    message_type,
                    None,
                ),
                Ok(()),
                "绑定会话 host 发送 {message_type} 应端到端放行"
            );
        }
        // 清单外类型拒绝：前缀漂移 / 变体 / 未知类型不许扩权。
        for message_type in [
            "html_edit_section_navigation_readyX",
            "html_edit_state_snapshot_error",
            "html_edit_unknown_new_type",
            "html_edit_host_save_debug", // 仅可信 main 面发送
        ] {
            assert_eq!(
                verify_bridge_message(
                    Some(&host),
                    Some("http://127.0.0.1:50000/t/doc.html"),
                    Some(42),
                    "s-1",
                    3,
                    message_type,
                    None,
                ),
                Err(BridgeRejection::TypeNotAllowed),
                "清单外消息 {message_type} 必须拒绝"
            );
        }
        // 演示预览精确三种回报。
        let preview = record(ContentSurfaceRole::PresentationPreview, "s-1", 3);
        for message_type in [
            "html_edit_presentation_preview_ready",
            "html_edit_presentation_preview_clicked",
            "html_edit_presentation_preview_navigate",
        ] {
            assert!(preview.role.allows_message_type(message_type));
        }
        for message_type in [
            "html_edit_presentation_page_changed",
            "html_edit_ready",
            "html_edit_presentation_preview_readyX",
        ] {
            assert!(
                !preview.role.allows_message_type(message_type),
                "演示预览不得发送 {message_type}"
            );
        }
    }

    /// R8 恶意 label 前缀不能伪造内容面角色：角色识别只认宿主 label 语法。
    #[test]
    fn role_from_label_is_prefix_strict() {
        assert_eq!(ContentSurfaceRole::from_label("html-host-1"), Some(ContentSurfaceRole::RuntimeHost));
        assert_eq!(ContentSurfaceRole::from_label("main"), None);
        assert_eq!(ContentSurfaceRole::from_label("html-hostx-1"), None);
    }

    /// P2（Codex revision 32）：`html-host-ext-` 必须先于 `html-host-` 判定 ——
    /// 前缀包含关系下若顺序颠倒，外部临时 host 会被当成正式 item host，
    /// 从而误获编辑面消息类型。
    #[test]
    fn role_from_label_separates_external_host_from_item_host() {
        assert_eq!(
            ContentSurfaceRole::from_label("html-host-ext-9f8e7d6c"),
            Some(ContentSurfaceRole::ExternalHost)
        );
        assert_eq!(ContentSurfaceRole::from_label("html-host-42"), Some(ContentSurfaceRole::RuntimeHost));
        // `html-player-` / 预览仍是它们自己的角色，不被外部前缀吞掉。
        assert_eq!(ContentSurfaceRole::from_label("html-player-ext-1"), Some(ContentSurfaceRole::DetachedPlayer));
        assert_eq!(ContentSurfaceRole::from_label("html-host-externalx"), Some(ContentSurfaceRole::RuntimeHost));
    }

    /// P2：label 中段两域互不冲突，且 item 分支与 P1 逐字一致（兼容断言）。
    #[test]
    fn runtime_key_label_segment_keeps_item_labels_and_isolates_external() {
        assert_eq!(RuntimeKey::Item(7).label_segment(), "7");
        assert_eq!(RuntimeKey::Item(0).label_segment(), "0");
        assert_eq!(
            RuntimeKey::External("ext-1a2b3c".to_string()).label_segment(),
            "ext-1a2b3c"
        );
        // 字符集收窄：任何非 [A-Za-z0-9_-] 字符（含 `/`、`.`）都不进 label，
        // 因此即使 session id 被污染也无法把路径分隔符带进 webview label。
        assert_eq!(
            RuntimeKey::External("ext-1/../evil".to_string()).label_segment(),
            "ext-1evil"
        );
        assert_eq!(
            RuntimeKey::External("ext-a b\\c".to_string()).label_segment(),
            "ext-abc"
        );
        assert_eq!(RuntimeKey::External(String::new()).label_segment(), "external-unnamed");
        assert_eq!(RuntimeKey::Item(7).item_id(), Some(7));
        assert_eq!(RuntimeKey::External("ext-1".into()).item_id(), None);
        assert_eq!(RuntimeKey::External("ext-1".into()).external_session_id(), Some("ext-1"));
        assert_eq!(RuntimeKey::Item(7).external_session_id(), None);
    }

    /// P2 核心边界：外部临时 host 是阅读态，**不得**获得任何编辑面桥消息，
    /// 也不能靠「前缀像 host」借用正式 item 的消息清单（Codex revision 32 §4）。
    #[test]
    fn external_host_role_allows_no_bridge_messages() {
        let external = record_external(ContentSurfaceRole::ExternalHost, "ext-1", 1);
        for message_type in [
            "html_edit_conversion_probe",
            "html_edit_conversion_result",
            "html_edit_ready",
            "html_edit_state_snapshot",
            "html_edit_save_requested_from_runtime",
            "html_edit_done_requested_from_runtime",
            "html_edit_asset_replace_requested",
            "html_edit_presentation_page_changed",
            "html_edit_presentation_preview_ready",
        ] {
            assert!(
                !external.role.allows_message_type(message_type),
                "外部阅读面不得放行 {message_type}"
            );
            assert_eq!(
                verify_bridge_message(
                    Some(&external),
                    Some("http://127.0.0.1:51000/index.html"),
                    None,
                    "",
                    1,
                    message_type,
                    None,
                ),
                Err(BridgeRejection::TypeNotAllowed),
                "外部阅读面端到端必须拒绝 {message_type}"
            );
        }
    }

    /// P2：key 形态决定 item 身份比较方式 ——
    /// `External` 记录既不能自报 itemId（伪造），也不能用错 generation。
    ///
    /// 这里用 `RuntimeHost` 角色 + `External` key 的组合，是为了单独验证
    /// *身份比较* 规则本身（细线阶段外部面还没有任何合法消息类型，角色层
    /// 会先拒绝，见上一条用例）。
    #[test]
    fn verify_bridge_message_key_shape_decides_item_identity_rule() {
        let mut external = record_external(ContentSurfaceRole::RuntimeHost, "ext-1", 5);
        external.runtime_session_id = String::new();

        // 外部面自报 itemId → 按伪造拒绝。
        assert_eq!(
            verify_bridge_message(
                Some(&external),
                Some("http://127.0.0.1:51000/index.html"),
                Some(42),
                "",
                5,
                "html_edit_ready",
                None,
            ),
            Err(BridgeRejection::ItemMismatch)
        );
        // generation 不匹配（旧会话 / 换代前）→ 拒绝。
        assert_eq!(
            verify_bridge_message(
                Some(&external),
                Some("http://127.0.0.1:51000/index.html"),
                None,
                "",
                4,
                "html_edit_ready",
                None,
            ),
            Err(BridgeRejection::SessionMismatch)
        );
        // 不自报 item + generation 一致 → 放行（lease 不参与外部面裁决）。
        assert_eq!(
            verify_bridge_message(
                Some(&external),
                Some("http://127.0.0.1:51000/index.html"),
                None,
                "",
                5,
                "html_edit_ready",
                None,
            ),
            Ok(())
        );
        // 外部面即使有 lease 也不改变结果（外部会话没有 item lease 概念）。
        assert_eq!(
            verify_bridge_message(
                Some(&external),
                Some("http://127.0.0.1:51000/index.html"),
                None,
                "",
                5,
                "html_edit_ready",
                Some(("lease-s", 1)),
            ),
            Ok(())
        );
    }

    /// P2：撤销与反查必须按 key 分域 —— 关外部会话不误伤同号 item，
    /// 删 item 不误伤外部会话。
    #[test]
    fn registry_separates_item_and_external_identities() {
        let registry = ContentSessionRegistry::default();
        registry
            .register("html-host-42", record(ContentSurfaceRole::RuntimeHost, "", 0))
            .expect("登记失败");
        let external = record_external(ContentSurfaceRole::ExternalHost, "ext-1", 1);
        registry.register("html-host-ext-1", external.clone()).expect("登记失败");

        // 反查按 origin 返回对应身份。
        assert_eq!(
            registry.find_key_by_origin("http://127.0.0.1:50000"),
            Some(RuntimeKey::Item(42))
        );
        assert_eq!(
            registry.find_key_by_origin("http://127.0.0.1:51000"),
            Some(RuntimeKey::External("ext-1".into()))
        );
        assert_eq!(registry.find_key_by_origin("http://127.0.0.1:59999"), None);

        // 关外部会话不动 item。
        assert_eq!(registry.unregister_external("ext-1"), 1);
        assert!(registry.get("html-host-ext-1").is_none());
        assert!(registry.get("html-host-42").is_some(), "item 登记不受影响");
        assert_eq!(registry.unregister_external("ext-1"), 0);

        // 删 item 不动外部会话。
        registry.register("html-host-ext-2", record_external(ContentSurfaceRole::ExternalHost, "ext-2", 1)).expect("登记失败");
        assert_eq!(registry.unregister_item(42), 1);
        assert!(registry.get("html-host-42").is_none());
        assert!(registry.get("html-host-ext-2").is_some(), "外部登记不受影响");
    }
}
