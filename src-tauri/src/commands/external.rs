//! PR B：外部打开相关 Tauri commands（计划 §3/§5/§7）。
//!
//! 所有命令都是 session-scoped：以 sessionId + generation 校验，不持有也不
//! 接受「临时 ID 冒充数据库 ID」的输入；只有 join 返回真正的 itemId。

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};

use crate::{
    core::external_open::{
        self, ExternalOpenRequest, ExternalResolution, JoinOutcome, JoinState, SaveAsOutcome, SaveOutcome,
    },
    db::repositories::ItemRepository,
    errors::AppError,
    state::AppState,
};

// ---------------------------------------------------------------------------
// inbox：ready + drain
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalOpenDrainResponse {
    pub requests: Vec<ExternalOpenRequest>,
    pub watermark: u64,
}

#[tauri::command]
pub fn external_open_ready() -> Result<(), AppError> {
    external_open::global_inbox().mark_ready();
    Ok(())
}

#[tauri::command]
pub fn external_open_drain(after: u64) -> Result<ExternalOpenDrainResponse, AppError> {
    let (requests, watermark) = external_open::global_inbox().drain(after);
    Ok(ExternalOpenDrainResponse { requests, watermark })
}

// ---------------------------------------------------------------------------
// 会话解析（5.2 的四分支）
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSessionBaselineDto {
    pub hash: String,
    pub mtime_ns: u128,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSessionOpenResponse {
    /// external 会话的 open token/generation；保存、图片、另存命令都携带它。
    pub generation: u64,
    /// indexed：资料库已有有效 item（不提示，前端直接走正式打开流程）。
    /// folder：拖入的是文件夹（前端转 PR A 预检/确认后端）。
    /// external：临时外部会话（ignored / outside / folder_pending 见 resolution）。
    pub kind: String,
    pub session_id: Option<String>,
    pub item_id: Option<i64>,
    pub prompt_required: bool,
    /// 复用已有会话且磁盘已变化时为 true（前端据此刷新或标记冲突）。
    pub disk_changed: bool,
    pub path: String,
    pub file_name: String,
    /// P2：`markdown` / `html`。前端据此选择标签构造器与内容承载方式
    /// （HTML 走占位 + 延迟 attach，不进入 Markdown 编辑器链路）。
    pub file_type: String,
    pub resolution: Option<String>,
    pub raw: Option<String>,
    pub html: Option<String>,
    pub title: Option<String>,
    pub base_dir: Option<String>,
    pub baseline: Option<ExternalSessionBaselineDto>,
}

/// 会话解析（5.2 的四分支）——两阶段：
/// - `phase = "inspect"`：只读分类，不创建 session、不挂 watcher、不写库，
///   供前端在「是否允许离开当前 HTML 编辑」裁决之前探路（Codex review R1-6）；
/// - 其它值（含缺省）：open 阶段，创建/复用 session 并挂 watcher。
#[tauri::command]
pub fn external_session_resolve(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    payload: ExternalSessionPathRequest,
) -> Result<ExternalSessionOpenResponse, AppError> {
    let raw_path = payload.path.trim().to_string();
    if raw_path.is_empty() {
        return Err(AppError::InvalidParams);
    }
    let inspect_only = payload.phase.as_deref() == Some("inspect");
    let plan = external_open::plan_external_path(&state, &raw_path)?;
    let file_name = plan.file_name.clone();
    // P2：类型由扩展名派生，folder / indexed / external / inspect 四条返回路径
    // 都携带它，前端无需二次推断。
    let file_type = external_open::external_file_type(std::path::Path::new(&raw_path)).to_string();

    let resolution = match plan.kind {
        external_open::ExternalPathKind::Folder => {
            return Ok(ExternalSessionOpenResponse {
                kind: "folder".to_string(),
                generation: 0,
                session_id: None,
                item_id: None,
                prompt_required: false,
                disk_changed: false,
                path: raw_path,
                file_name,
                file_type: file_type.clone(),
                resolution: None,
                raw: None,
                html: None,
                title: None,
                base_dir: None,
                baseline: None,
            });
        }
        external_open::ExternalPathKind::Indexed { item_id } => {
            return Ok(ExternalSessionOpenResponse {
                kind: "indexed".to_string(),
                generation: 0,
                session_id: None,
                item_id: Some(item_id),
                prompt_required: false,
                disk_changed: false,
                path: raw_path,
                file_name,
                file_type: file_type.clone(),
                resolution: None,
                raw: None,
                html: None,
                title: None,
                base_dir: None,
                baseline: None,
            });
        }
        external_open::ExternalPathKind::External { resolution } => resolution,
    };

    let path = PathBuf::from(&raw_path);

    // 同一路径重复请求：复用存活会话并重新核验磁盘状态（不能因去重跳过外部变化）。
    if let Some(existing) = state.external_sessions.find_live_by_path(&raw_path) {
        let disk_changed = external_open::read_file_baseline(&path).map(|current| current.baseline != existing.baseline).unwrap_or(true);
        return Ok(external_session_open_response_from_session(
            &state, &existing, raw_path, file_name, disk_changed,
        ));
    }

    // inspect 阶段到此为止：零副作用（无 session、无 watcher、无入库）。
    if inspect_only {
        return Ok(ExternalSessionOpenResponse {
            kind: "external".to_string(),
            generation: 0,
            session_id: None,
            item_id: None,
            prompt_required: false,
            disk_changed: false,
            path: raw_path,
            file_name,
            file_type: file_type.clone(),
            resolution: Some(resolution_text(resolution).to_string()),
            raw: None,
            html: None,
            title: None,
            base_dir: None,
            baseline: None,
        });
    }

    let paths = external_open::read_file_baseline(&path)?;
    let session = state.external_sessions.create_session(
        &raw_path,
        paths.identity.clone(),
        paths.baseline.clone(),
        resolution,
    );
    state
        .external_sessions
        .ensure_dir_watch(&session.session_id, app.clone())?;

    // 分支 3：folder 范围内索引未收敛 → 后台 targeted upsert（不显示加入提示），
    // 成功后通知前端原地绑定。
    if let ExternalResolution::FolderPending { library_id } = resolution {
        let session_id = session.session_id.clone();
        let handle = app.clone();
        std::thread::spawn(move || {
            let outcome = external_open::join_external_session(
                handle.state::<AppState>().inner(),
                &session_id,
                1,
            );
            if let Ok(JoinOutcome::Bound { item_id }) | Ok(JoinOutcome::Committed { item_id }) = outcome {
                let _ = handle.emit(
                    "nutbook-external-session-bound",
                    serde_json::json!({ "sessionId": session_id, "itemId": item_id }),
                );
            }
        });
        let _ = library_id;
    }

    let mut response = external_session_open_response_from_session(
        &state,
        &session,
        raw_path,
        file_name.clone(),
        false,
    );
    // Markdown：正文由前端编辑器承载，需要 raw + 渲染后 html + 解析标题。
    // HTML（P2，计划 6.2）：正文由真实 child WebView 承载，**不进入** Markdown
    // 编辑器 / 渲染链路 —— 不读 raw、不渲染；仅下发 base_dir 供授权 root
    // （single-file = 文件直接父目录，计划 6.3）与标题。
    if response.file_type == "markdown" {
        response.raw = std::fs::read_to_string(&path).ok();
        if let Some(raw) = response.raw.clone() {
            response.html = Some(crate::core::document::render_markdown_as_html_for_file(
                &raw, &file_name,
            ));
            response.title = Some(
                crate::core::document_title::DocumentTitle::parse(&raw, &file_name).display_text,
            );
        }
    } else {
        response.title = Some(file_name.clone());
    }
    response.base_dir = path
        .parent()
        .map(|value| value.to_string_lossy().to_string());
    Ok(response)
}

fn resolution_text(resolution: ExternalResolution) -> &'static str {
    match resolution {
        ExternalResolution::OutsideLibrary => "outside",
        ExternalResolution::Ignored => "ignored",
        ExternalResolution::FolderPending { .. } => "folder_pending",
    }
}

fn external_session_open_response_from_session(
    state: &AppState,
    session: &crate::core::external_open::ExternalSession,
    path: String,
    file_name: String,
    disk_changed: bool,
) -> ExternalSessionOpenResponse {
    let resolution_text = match session.resolution {
        ExternalResolution::OutsideLibrary => "outside",
        ExternalResolution::Ignored => "ignored",
        ExternalResolution::FolderPending { .. } => "folder_pending",
    };
    let hints = external_open::load_open_hints(&state.app_data_dir);
    let prompt_required = disk_changed == false
        && session.identity
            .as_deref()
            .map(|identity| !hints.contains_key(identity))
            .unwrap_or(true)
        && session.join_state == JoinState::NotJoined;
    ExternalSessionOpenResponse {
        kind: "external".to_string(),
        generation: session.generation,
        session_id: Some(session.session_id.clone()),
        item_id: match session.join_state {
            JoinState::Committed { item_id } | JoinState::Bound { item_id } => Some(item_id),
            JoinState::NotJoined => None,
        },
        prompt_required,
        disk_changed,
        path,
        file_name,
        file_type: session.file_type.clone(),
        resolution: Some(resolution_text.to_string()),
        raw: None,
        html: None,
        title: None,
        base_dir: None,
        baseline: Some(ExternalSessionBaselineDto {
            hash: session.baseline.hash.clone(),
            mtime_ns: session.baseline.mtime_ns,
            size: session.baseline.size,
        }),
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSessionPathRequest {
    pub path: String,
    /// "inspect" = 只读分类（零副作用）；缺省 = open（创建/复用会话）。
    #[serde(default)]
    pub phase: Option<String>,
}

#[tauri::command]
pub fn external_session_mark_opened_only(
    state: tauri::State<'_, AppState>,
    payload: ExternalSessionIdRequest,
) -> Result<(), AppError> {
    let Some(session) = state.external_sessions.get(&payload.session_id) else {
        return Err(AppError::InvalidSession);
    };
    if let Some(identity) = session.identity {
        external_open::record_open_hint(&state.app_data_dir, &identity);
    }
    Ok(())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSessionIdRequest {
    pub session_id: String,
}

#[tauri::command]
pub fn external_session_close(
    state: tauri::State<'_, AppState>,
    payload: ExternalSessionIdRequest,
) -> Result<bool, AppError> {
    Ok(state.external_sessions.close_session(&payload.session_id))
}

// ---------------------------------------------------------------------------
// 加入（3.4 / 3.7）：标签加号与五秒主动作汇入同一接入协调器
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSessionJoinResponse {
    pub status: String,
    pub item_id: Option<i64>,
}

#[tauri::command]
pub fn external_session_join(
    state: tauri::State<'_, AppState>,
    payload: ExternalSessionJoinRequest,
) -> Result<ExternalSessionJoinResponse, AppError> {
    let outcome =
        external_open::join_external_session(&state, &payload.session_id, payload.generation)?;
    let (status, item_id) = match outcome {
        JoinOutcome::Bound { item_id } => ("bound".to_string(), Some(item_id)),
        JoinOutcome::AlreadyBound { item_id } | JoinOutcome::Committed { item_id } => {
            ("committed".to_string(), Some(item_id))
        }
    };
    // 加入动作完成（无论成败路径）即视为已提示过，后续打开不再打断。
    if let Some(session) = state.external_sessions.get(&payload.session_id) {
        if let Some(identity) = session.identity {
            external_open::record_open_hint(&state.app_data_dir, &identity);
        }
    }
    Ok(ExternalSessionJoinResponse { status, item_id })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSessionJoinRequest {
    pub session_id: String,
    pub generation: u64,
}

// ---------------------------------------------------------------------------
// 保存 / 冲突 / 另存（5.3 / 5.3.1）
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSessionSaveResponse {
    /// saved | conflict | missing
    pub status: String,
    pub baseline: Option<ExternalSessionBaselineDto>,
    pub content: Option<String>,
}

#[tauri::command]
pub fn external_session_save(
    state: tauri::State<'_, AppState>,
    payload: ExternalSessionSaveRequest,
) -> Result<ExternalSessionSaveResponse, AppError> {
    let outcome = external_open::save_external_session(
        &state,
        &payload.session_id,
        payload.generation,
        &payload.content,
    )?;
    Ok(match outcome {
        SaveOutcome::Saved { baseline } => ExternalSessionSaveResponse {
            status: "saved".to_string(),
            baseline: Some(baseline_dto(baseline)),
            content: None,
        },
        SaveOutcome::Conflict { current } => {
            let path = state
                .external_sessions
                .get(&payload.session_id)
                .map(|session| session.raw_path)
                .ok_or(AppError::InvalidSession)?;
            ExternalSessionSaveResponse {
                status: "conflict".to_string(),
                baseline: Some(baseline_dto(current)),
                content: std::fs::read_to_string(path).ok(),
            }
        }
        SaveOutcome::Missing => ExternalSessionSaveResponse {
            status: "missing".to_string(),
            baseline: None,
            content: None,
        },
    })
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSessionSaveRequest {
    pub session_id: String,
    pub generation: u64,
    pub content: String,
}

/// 覆盖原文件（冲突对话框的显式授权分支）：跳过 baseline 比对直接原子写盘。
#[tauri::command]
pub fn external_session_overwrite(
    state: tauri::State<'_, AppState>,
    payload: ExternalSessionSaveRequest,
) -> Result<ExternalSessionSaveResponse, AppError> {
    let Some(session) = state.external_sessions.get(&payload.session_id) else {
        return Err(AppError::InvalidSession);
    };
    if session.generation != payload.generation {
        return Err(AppError::InvalidSession);
    }
    let path = PathBuf::from(&session.raw_path);
    if !path.is_file() {
        return Ok(ExternalSessionSaveResponse {
            status: "missing".to_string(),
            baseline: None,
            content: None,
        });
    }
    external_open::write_text_atomically(&path, &payload.content)?;
    let baseline = external_open::read_file_baseline(&path)?.baseline;
    state
        .external_sessions
        .update_baseline(&payload.session_id, baseline.clone());
    if let JoinState::Committed { item_id } | JoinState::Bound { item_id } = session.join_state {
        // 已加入会话的覆盖保存：同步刷新索引内容。
        let text = payload.content.clone();
        let file_name = path
            .file_name()
            .map(|value| value.to_string_lossy().to_string())
            .unwrap_or_default();
        let _ = state.update_markdown_item_content(
            item_id,
            &crate::core::document::markdown_summary(&text),
            "",
            &crate::core::document::content_hash(&text),
            &text,
            &text,
            &crate::core::document::render_markdown_as_html_for_file(&text, &file_name),
        );
    }
    Ok(ExternalSessionSaveResponse {
        status: "saved".to_string(),
        baseline: Some(baseline_dto(baseline)),
        content: None,
    })
}

/// 另存目标选择对话框（另存副本与删除后的另存为共用入口；默认名由前端给）。
#[tauri::command]
pub fn external_session_pick_save_target(
    payload: ExternalSessionPickTargetRequest,
) -> Result<Option<String>, AppError> {
    let dialog = rfd::FileDialog::new()
        .set_title("选择另存位置")
        .add_filter("Markdown", &["md", "markdown"])
        .set_file_name(&payload.default_file_name);
    Ok(dialog
        .save_file()
        .map(|path| path.to_string_lossy().to_string()))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSessionPickTargetRequest {
    pub default_file_name: String,
}

/// 另存副本：只写出副本，当前标签仍绑定原路径并保持 dirty/conflicted。
#[tauri::command]
pub fn external_session_save_copy(
    state: tauri::State<'_, AppState>,
    payload: ExternalSessionSaveAsRequest,
) -> Result<ExternalSessionBaselineDto, AppError> {
    let baseline = external_open::save_copy_external_session(
        &state,
        &payload.session_id,
        payload.generation,
        &payload.content,
        &payload.target_path,
        &payload.history_resource_paths,
    )?;
    Ok(baseline_dto(baseline))
}

/// 删除后的另存为：切换当前会话路径、更新 PathIdentity/baseline/watcher；
/// 跨目录时复制本地相对资源（资源先准备，正文最后 no-clobber 持久化）。
#[tauri::command]
pub fn external_session_save_as(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    payload: ExternalSessionSaveAsRequest,
) -> Result<ExternalSessionSaveAsResponse, AppError> {
    let outcome = external_open::save_as_external_session(
        &state,
        &app,
        &payload.session_id,
        payload.generation,
        &payload.content,
        &payload.target_path,
        &payload.history_resource_paths,
    )?;
    match outcome {
        SaveAsOutcome::Saved { baseline, new_path, watch_attached } => {
            Ok(ExternalSessionSaveAsResponse {
                status: "saved".to_string(),
                new_path,
                baseline: Some(baseline_dto(baseline)),
                watch_attached,
            })
        }
        SaveAsOutcome::WrittenCopyElsewhere { new_path } => {
            // 正文已 durable 但 retarget 失败：会话保留原路径，前端按写出副本提示。
            Ok(ExternalSessionSaveAsResponse {
                status: "written_copy_elsewhere".to_string(),
                new_path,
                baseline: None,
                watch_attached: false,
            })
        }
    }
}

/// 正文 durable 后 watcher 挂接失败的重试入口：只补挂父目录 watcher，
/// 不重新创建/覆盖正文（5.3.1 + Codex review R1-5）。
#[tauri::command]
pub fn external_session_attach_watch(
    state: tauri::State<'_, AppState>,
    app: tauri::AppHandle,
    payload: ExternalSessionIdRequest,
) -> Result<bool, AppError> {
    external_open::attach_session_dir_watch(&state, &app, &payload.session_id)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSessionSaveAsRequest {
    pub session_id: String,
    pub generation: u64,
    pub content: String,
    pub target_path: String,
    /// R2-3（5.3.1）：草稿/撤销历史可达状态引用的本地资源绝对路径
    /// （会话插入过的图片 + 各内容状态的引用解析）。后端会重新校验
    /// 落在原文档父目录内才复制；缺省为空。
    #[serde(default)]
    pub history_resource_paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSessionSaveAsResponse {
    pub status: String,
    pub new_path: String,
    pub baseline: Option<ExternalSessionBaselineDto>,
    /// false = 正文已 durable 但父目录 watcher 未挂上：可重试，不重建正文。
    pub watch_attached: bool,
}

fn baseline_dto(baseline: crate::core::external_open::ExternalBaseline) -> ExternalSessionBaselineDto {
    ExternalSessionBaselineDto {
        hash: baseline.hash,
        mtime_ns: baseline.mtime_ns,
        size: baseline.size,
    }
}

// ---------------------------------------------------------------------------
// 图片资源（5.3）：session-scoped；picker 由前端发起，返回路径携带
// sessionId + generation 交后端校验，晚到回调在 generation 变化后拒绝。
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSessionCopyImageRequest {
    pub session_id: String,
    pub generation: u64,
    pub source_image_path: String,
}

#[tauri::command]
pub fn external_session_copy_image(
    state: tauri::State<'_, AppState>,
    payload: ExternalSessionCopyImageRequest,
) -> Result<crate::models::CopyMarkdownImageAssetResponse, AppError> {
    let Some(session) = state.external_sessions.get(&payload.session_id) else {
        return Err(AppError::InvalidSession);
    };
    if session.generation != payload.generation {
        return Err(AppError::InvalidSession);
    }
    crate::commands::preview::copy_markdown_image_asset_impl(
        crate::models::CopyMarkdownImageAssetRequest {
            markdown_file_path: session.raw_path.clone(),
            source_image_path: payload.source_image_path,
        },
    )
}

// ---------------------------------------------------------------------------
// clean 会话外部变化后的重载（5.3：重新核验磁盘状态，不因去重跳过外部变化）
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExternalSessionReloadResponse {
    pub status: String,
    pub raw: Option<String>,
    pub html: Option<String>,
    pub baseline: Option<ExternalSessionBaselineDto>,
}

#[tauri::command]
pub fn external_session_reload(
    state: tauri::State<'_, AppState>,
    payload: ExternalSessionIdRequest,
) -> Result<ExternalSessionReloadResponse, AppError> {
    let session = state.external_sessions.get(&payload.session_id).ok_or(AppError::InvalidSession)?;
    let path = std::path::PathBuf::from(&session.raw_path);
    let paths = external_open::read_file_baseline(&path)?;
    let status = if paths.baseline == session.baseline { "unchanged" } else { "changed" };
    let raw = std::fs::read_to_string(&path).ok();
    let html = raw
        .as_deref()
        .map(|text| {
            crate::core::document::render_markdown_as_html_for_file(text, &session.raw_path)
        });
    if status == "changed" {
        state.external_sessions.update_baseline(&payload.session_id, paths.baseline.clone());
    }
    Ok(ExternalSessionReloadResponse {
        status: status.to_string(),
        raw,
        html,
        baseline: Some(baseline_dto(paths.baseline)),
    })
}

// ---------------------------------------------------------------------------
// 拖放入口（3.6）：与系统打开共用同一 pending inbox
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn external_open_enqueue(
    app: tauri::AppHandle,
    source: String,
    paths: Vec<String>,
) -> Result<(), AppError> {
    if paths.is_empty() {
        return Ok(());
    }
    external_open::global_inbox().enqueue(&source, paths);
    let _ = app.emit("nutbook-external-open", ());
    Ok(())
}

/// 原生文件 Drop 的格式 allowlist：主视图（main）+ HTML 正文 surface 格式
/// （`html-host-<i64>`，见 core/html_runtime.rs）。这只是格式层判定；真实
/// 运行面归属（webview 已登记且挂在主窗口）由 `enqueue_native_drop` 在触碰
/// inbox 之前核验。任意 popup/未登记 surface 不承接。
pub fn native_drop_surface_allowed(label: &str) -> bool {
    if label == "main" {
        return true;
    }
    label
        .strip_prefix("html-host-")
        .and_then(|value| value.parse::<i64>().ok())
        .is_some()
}

/// 原生 Drop 统一 enqueue（3.6）：main 与 HTML 正文 surface 的文件 Drop 在
/// Rust 侧一次性入队并 emit 既有 `nutbook-external-open`，复用
/// inbox/coordinator。语义与 `external_open_enqueue` 一致：空路径忽略；
/// 多路径保留为一个请求整体处理，不拆散；文件夹/合法性预检由既有
/// pump/resolve 链路负责；编辑器内部 HTML5 拖动不经过原生 drag
/// destination，天然不受影响。返回是否实际入队。
///
/// Codex 复核（2026-09-09 P1）：全部校验（空路径 / 格式 allowlist / 运行面
/// 归属）必须先于任何副作用——校验失败不得触碰 inbox，否则已入队请求仍能
/// 被下一次通知或 fallback drain 消费，归属核验形同虚设。泛型运行面仅为
/// 可测性（mock runtime 单测），生产调用恒为 Wry。
pub fn enqueue_native_drop<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    label: &str,
    paths: Vec<String>,
) -> bool {
    // Codex 复核（2026-09-09 P1）：全部校验必须先于任何副作用——格式
    // allowlist（可单测的第一层）+ 运行面归属（label 对应的 webview 已登记
    // 且挂在主窗口上，防「格式合法但 surface 不存在/属于 detached popup」）
    // 都通过后才允许触碰 inbox；校验失败不得留下任何可被后续通知或
    // fallback drain 消费的入队请求。
    if paths.is_empty() || !native_drop_surface_allowed(label) {
        return false;
    }
    if !app
        .get_webview(label)
        .is_some_and(|webview| webview.window().label() == "main")
    {
        return false;
    }
    external_open::global_inbox().enqueue("drag-drop", paths);
    let _ = app.emit("nutbook-external-open", ());
    true
}



// ---------------------------------------------------------------------------
// 默认应用引导与偏好设置（§7）
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn open_default_apps_panel(
    app: tauri::AppHandle,
    path: Option<String>,
) -> Result<bool, AppError> {
    #[cfg(target_os = "macos")]
    {
        let _ = app;
        // §7.3（2026-09-09 修订）：Finder 图文引导已降级为「设为默认」失败/
        // 不支持时的备用说明。定位文件优先当前真实对应文件（前端传入的
        // Markdown/HTML），没有才使用 app-owned 代表文件；代表文件不入库、
        // 不记最近。
        let target: std::path::PathBuf = match path {
            Some(raw)
                if !raw.trim().is_empty()
                    && ["md", "markdown", "html", "htm"].contains(
                        &raw.rsplit('.').next().unwrap_or("").to_ascii_lowercase().as_str(),
                    )
                    && std::path::Path::new(&raw).is_file() =>
            {
                std::path::PathBuf::from(raw)
            }
            _ => {
                let data_dir = representative_file_dir()?;
                std::fs::create_dir_all(&data_dir).map_err(|_| AppError::IoError)?;
                let representative = data_dir.join("NUTBOOK-文件默认应用.md");
                if !representative.exists() {
                    std::fs::write(
                        &representative,
                        "# 备用方法：在 Finder 中设置文件默认应用\n\n1. 在 Finder 中选中一个 Markdown 文件（本文件即可）。\n2. 按 ⌘I 打开「显示简介」。\n3. 在「打开方式」中选择 NUTBOOK。\n4. 点击「全部更改」，让所有 .md 文件都使用 NUTBOOK。\n\n提示：也可以直接在 NUTBOOK 偏好设置的「文件默认应用」中点击「设为默认」，由系统确认后自动完成。\n",
                    )
                    .map_err(|_| AppError::IoError)?;
                }
                representative
            }
        };
        // 检查实际完成状态：open -R 失败（如 Finder 无法启动）必须报错。
        let status = std::process::Command::new("open")
            .arg("-R")
            .arg(&target)
            .status()
            .map_err(|_| AppError::IoError)?;
        if !status.success() {
            return Err(AppError::DefaultAppActionFailed(
                "open -R exited with failure".to_string(),
            ));
        }
        Ok(true)
    }
    #[cfg(target_os = "windows")]
    {
        let _ = (app, path);
        let status = std::process::Command::new("explorer.exe")
            .arg("ms-settings:defaultapps")
            .status()
            .map_err(|_| AppError::IoError)?;
        if !status.success() {
            return Err(AppError::DefaultAppActionFailed(
                "explorer.exe exited with failure".to_string(),
            ));
        }
        Ok(true)
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = (app, path);
        Err(AppError::UnsupportedFileType)
    }
}

#[cfg(target_os = "macos")]
fn representative_file_dir() -> Result<PathBuf, AppError> {
    dirs_hack()
}

#[cfg(target_os = "macos")]
fn dirs_hack() -> Result<PathBuf, AppError> {
    std::env::var_os("HOME")
        .map(|home| PathBuf::from(home).join("Library/Application Support/com.hayley.nutbook"))
        .ok_or(AppError::IoError)
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DefaultAppGuideStatus {
    pub version: u32,
    pub done: bool,
}

fn guide_path(app_data_dir: &std::path::Path) -> std::path::PathBuf {
    app_data_dir.join("external-default-app-guide.json")
}

const DEFAULT_APP_GUIDE_VERSION: u32 = 1;

#[tauri::command]
pub fn external_default_app_guide_status(
    state: tauri::State<'_, AppState>,
) -> Result<DefaultAppGuideStatus, AppError> {
    let text = std::fs::read_to_string(guide_path(&state.app_data_dir)).unwrap_or_default();
    let value: serde_json::Value = serde_json::from_str(&text).unwrap_or(serde_json::Value::Null);
    Ok(DefaultAppGuideStatus {
        version: value
            .get("version")
            .and_then(|value| value.as_u64())
            .map(|value| value as u32)
            .unwrap_or(0),
        done: value.get("done").and_then(|value| value.as_bool()).unwrap_or(false),
    })
}

#[tauri::command]
pub fn external_default_app_guide_mark_done(
    state: tauri::State<'_, AppState>,
) -> Result<(), AppError> {
    let payload = serde_json::json!({
        "version": DEFAULT_APP_GUIDE_VERSION,
        "done": true,
        "markedAt": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_millis().to_string())
            .unwrap_or_default(),
    });
    std::fs::write(
        guide_path(&state.app_data_dir),
        serde_json::to_vec(&payload).map_err(|_| AppError::InternalError)?,
    )
    .map_err(|_| AppError::IoError)?;
    Ok(())
}

#[cfg(test)]
mod native_drop_tests {
    use super::{enqueue_native_drop, native_drop_surface_allowed};
    use crate::core::external_open::global_inbox;
    use std::sync::{Mutex, MutexGuard, OnceLock};

    // inbox 是进程级全局态，测试必须串行执行避免互相 drain。
    fn global_test_lock() -> MutexGuard<'static, ()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(())).lock().expect("test lock poisoned")
    }

    // mock runtime app + 真实登记的 webview surface：让 enqueue_native_drop 的
    // 运行面归属核验（webview 已登记且宿主窗口为 main）在单测中真实执行，
    // 而不是只断言核验函数存在（Codex 复核 2026-09-09 P1）。
    fn mock_app_with_main_surface() -> tauri::App<tauri::test::MockRuntime> {
        let app = tauri::test::mock_app();
        tauri::webview::WebviewWindowBuilder::new(&app, "main", tauri::WebviewUrl::default())
            .build()
            .expect("mock main webview window must build");
        app
    }

    #[test]
    fn native_drop_surface_allowlist_matches_registered_surfaces() {
        // 主视图允许
        assert!(native_drop_surface_allowed("main"));
        // 已登记 HTML 正文 surface（html-host-<i64>）允许
        assert!(native_drop_surface_allowed("html-host-782"));
        assert!(native_drop_surface_allowed("html-host-0"));
        // 任意 popup / 未登记 / 非法格式一律拒绝
        assert!(!native_drop_surface_allowed("html-host-abc"));
        assert!(!native_drop_surface_allowed("html-host-"));
        assert!(!native_drop_surface_allowed("html-host-12x"));
        assert!(!native_drop_surface_allowed("popup-tool"));
        assert!(!native_drop_surface_allowed(""));
    }

    #[test]
    fn native_drop_enqueues_one_request_and_never_splits_batch() {
        let _guard = global_test_lock();
        let app = mock_app_with_main_surface();
        let watermark = global_inbox().drain(0).1;
        // 空路径：零请求
        assert!(!enqueue_native_drop(app.handle(), "main", vec![]));
        // 非法 surface：零请求
        assert!(!enqueue_native_drop(
            app.handle(),
            "popup-x",
            vec!["/tmp/a.md".to_string()]
        ));
        // 多路径：一个请求整体保留，不拆散
        assert!(enqueue_native_drop(
            app.handle(),
            "main",
            vec!["/tmp/a.md".to_string(), "/tmp/b.md".to_string()]
        ));
        let (requests, _watermark) = global_inbox().drain(watermark);
        assert_eq!(
            requests.len(),
            1,
            "empty/illegal drops must enqueue nothing; multi-path must be one request"
        );
        assert_eq!(requests[0].source, "drag-drop");
        assert_eq!(requests[0].ordered_paths, vec!["/tmp/a.md", "/tmp/b.md"]);
    }

    #[test]
    fn native_drop_rejects_unregistered_or_detached_surface_without_side_effects() {
        // Codex 复核（2026-09-09 P1）：格式合法但未登记（html-host-999）或
        // 挂在非 main 窗口（detached）的 Drop 必须在触碰去重/inbox 之前被
        // 拒绝——队列零变化，不能被下一次通知或 fallback drain 消费。
        let _guard = global_test_lock();
        let app = mock_app_with_main_surface();
        // detached 窗口上的同名格式 webview：已登记但宿主窗口不是 main。
        tauri::webview::WebviewWindowBuilder::new(&app, "detached", tauri::WebviewUrl::default())
            .build()
            .expect("mock detached webview window must build");
        let watermark = global_inbox().drain(0).1;
        // 格式合法但从未登记的 surface
        assert!(!enqueue_native_drop(
            app.handle(),
            "html-host-999",
            vec!["/tmp/ghost.md".to_string()]
        ));
        // 已登记但挂在 detached 窗口：宿主窗口非 main，拒绝
        assert!(!enqueue_native_drop(
            app.handle(),
            "detached",
            vec!["/tmp/detached.md".to_string()]
        ));
        let (requests, _) = global_inbox().drain(watermark);
        assert_eq!(
            requests.len(),
            0,
            "rejected drops must leave the inbox untouched (checks precede all side effects)"
        );
    }

    #[test]
    fn native_drop_consecutive_independent_same_path_drops_all_enqueue() {
        // Codex 复核（2026-09-09 P2）：时间去重已整体移除（无双臂派发证据，
        // 不以路径+时间裁决独立请求）——连续两次独立的同文件拖放必须全部
        // 入队，不得被任何猜测性窗口吞掉。
        let _guard = global_test_lock();
        let app = mock_app_with_main_surface();
        let watermark = global_inbox().drain(0).1;
        let paths = vec!["/tmp/repeat.md".to_string()];
        assert!(enqueue_native_drop(app.handle(), "main", paths.clone()), "first drop enqueues");
        assert!(
            enqueue_native_drop(app.handle(), "main", paths.clone()),
            "second independent drop of the same path must also enqueue (no time-based dedupe)"
        );
        assert!(
            enqueue_native_drop(app.handle(), "main", paths),
            "third independent drop must still enqueue"
        );
        let (requests, _) = global_inbox().drain(watermark);
        assert_eq!(requests.len(), 3, "all independent drops must be enqueued");
    }
}
