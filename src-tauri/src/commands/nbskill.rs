use std::path::PathBuf;

#[cfg(target_os = "macos")]
use objc2_app_kit::{NSPasteboard, NSPasteboardTypeString};
#[cfg(target_os = "macos")]
use objc2_foundation::NSString;

use tauri::Manager;

use crate::{
    core::nbskill_package::{
        agent_contract, detect_nbskill_agents, stage_verified_package, verify_package,
    },
    errors::AppError,
    models::{
        NbskillAgentStatus, NbskillInstallPromptResponse,
        PrepareNbskillInstallPromptRequest,
    },
};

#[tauri::command]
pub fn get_nbskill_agent_status(
    app: tauri::AppHandle,
) -> Result<Vec<NbskillAgentStatus>, AppError> {
    let home = app.path().home_dir().map_err(|_| AppError::IoError)?;
    Ok(detect_nbskill_agents(&home))
}

#[tauri::command]
pub fn prepare_nbskill_install_prompt(
    app: tauri::AppHandle,
    payload: PrepareNbskillInstallPromptRequest,
) -> Result<NbskillInstallPromptResponse, AppError> {
    let contract = agent_contract(&payload.agent_id).ok_or(AppError::InvalidParams)?;
    let home = app.path().home_dir().map_err(|_| AppError::IoError)?;
    let app_data = app.path().app_data_dir().map_err(|_| AppError::IoError)?;
    let source = packaged_nbskill_source(&app)?;
    let staging = stage_verified_package(&source, &app_data).map_err(|_| AppError::IoError)?;
    let target = home.join(contract.relative_target);
    let command = format!(
        "node {} --source {} --target {}",
        shell_quote(&staging.join("scripts/install.mjs")),
        shell_quote(&staging),
        shell_quote(&target),
    );
    let prompt = format!(
        "请为 {name} 安装 NUTBOOK nbskill。\n\n要求：\n1. 先确认目标路径不是符号链接，不要手工编辑 manifest。\n2. 执行下面这条由 NUTBOOK 生成的安装命令；它会验证 SHA-256、拒绝未知或更新版本覆盖、创建备份、临时复制、自检，并在失败时恢复。\n3. 不要修改其他 Skill 或 Agent 配置。\n4. 完成后把命令输出原样回复给我。\n\n```bash\n{command}\n```",
        name = contract.display_name,
    );
    let copied = copy_to_system_clipboard(&prompt);
    Ok(NbskillInstallPromptResponse {
        agent_id: payload.agent_id,
        staging_path: staging.to_string_lossy().into_owned(),
        target_path: target.to_string_lossy().into_owned(),
        prompt,
        copied,
    })
}

#[cfg(target_os = "macos")]
fn copy_to_system_clipboard(text: &str) -> bool {
    let pasteboard = NSPasteboard::generalPasteboard();
    let value = NSString::from_str(text);
    let string_type = unsafe { NSPasteboardTypeString };
    pasteboard.clearContents();
    if !pasteboard.setString_forType(&value, string_type) {
        return false;
    }
    pasteboard
        .stringForType(string_type)
        .is_some_and(|copied| copied.to_string() == text)
}

#[cfg(not(target_os = "macos"))]
fn copy_to_system_clipboard(_text: &str) -> bool {
    false
}

fn packaged_nbskill_source(app: &tauri::AppHandle) -> Result<PathBuf, AppError> {
    let packaged = app.path().resource_dir().map_err(|_| AppError::IoError)?.join("nbskill");
    if verify_package(&packaged).is_ok() {
        return Ok(packaged);
    }
    #[cfg(debug_assertions)]
    {
        let development = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../integrations/nbskill");
        if verify_package(&development).is_ok() {
            return Ok(development);
        }
    }
    Err(AppError::IoError)
}

fn shell_quote(path: &std::path::Path) -> String {
    format!("'{}'", path.to_string_lossy().replace('\'', "'\\''"))
}
