use std::path::PathBuf;

use tauri::Manager;

use crate::{
    core::nbskill_package::{
        agent_contract, detect_nbskill_agents, install_verified_package, remove_verified_package, stage_verified_package, verify_package,
    },
    core::cli::deploy_bundled_cli,
    errors::AppError,
    models::{InstallNbskillAgentsRequest, NbskillAgentStatus, NbskillInstallResult},
};

#[tauri::command]
pub fn get_nbskill_agent_status(
    app: tauri::AppHandle,
) -> Result<Vec<NbskillAgentStatus>, AppError> {
    let home = app.path().home_dir().map_err(|_| AppError::IoError)?;
    let app_data = app.path().app_data_dir().map_err(|_| AppError::IoError)?;
    Ok(detect_nbskill_agents(&home, &app_data))
}

#[tauri::command]
pub fn install_nbskill_agents(
    app: tauri::AppHandle,
    payload: InstallNbskillAgentsRequest,
) -> Result<Vec<NbskillInstallResult>, AppError> {
    let home = app.path().home_dir().map_err(|_| AppError::IoError)?;
    let app_data = app.path().app_data_dir().map_err(|_| AppError::IoError)?;
    let statuses = detect_nbskill_agents(&home, &app_data);
    let requested = if payload.agent_ids.is_empty() { statuses.iter().filter(|status| status.agent_detected).map(|status| status.agent_id.clone()).collect() } else { payload.agent_ids };
    let resource_dir = app.path().resource_dir().ok();
    if let Err(detail) = deploy_bundled_cli(&app_data, resource_dir.as_deref()) {
        return Ok(requested.into_iter().map(|agent_id| NbskillInstallResult {
            agent_id,
            status: "failed".to_string(),
            detail: Some(format!("shared Nutbook CLI repair failed: {detail}")),
        }).collect());
    }
    let source = packaged_nbskill_source(&app)?;
    let staging = stage_verified_package(&source, &app_data).map_err(|_| AppError::IoError)?;
    let mut results = Vec::new();
    for agent_id in requested {
        let Some(contract) = agent_contract(&agent_id) else { results.push(NbskillInstallResult { agent_id, status: "failed".to_string(), detail: Some("unknown Agent".to_string()) }); continue; };
        let detected = statuses.iter().find(|status| status.agent_id == contract.id).is_some_and(|status| status.agent_detected);
        if !detected { results.push(NbskillInstallResult { agent_id: contract.id.to_string(), status: "skipped".to_string(), detail: Some("Agent was not reliably detected".to_string()) }); continue; }
        let target = home.join(contract.relative_target);
        let backup_root = app_data.join("agent-integration-backups").join(contract.id);
        match install_verified_package(&staging, &target, &backup_root) {
            Ok(status) => results.push(NbskillInstallResult { agent_id: contract.id.to_string(), status: status.to_string(), detail: None }),
            Err(detail) => results.push(NbskillInstallResult { agent_id: contract.id.to_string(), status: "failed".to_string(), detail: Some(detail) }),
        }
    }
    Ok(results)
}

#[tauri::command]
pub fn remove_nbskill_agents(
    app: tauri::AppHandle,
    payload: InstallNbskillAgentsRequest,
) -> Result<Vec<NbskillInstallResult>, AppError> {
    let home = app.path().home_dir().map_err(|_| AppError::IoError)?;
    let app_data = app.path().app_data_dir().map_err(|_| AppError::IoError)?;
    let mut results = Vec::new();
    for agent_id in payload.agent_ids {
        let Some(contract) = agent_contract(&agent_id) else { results.push(NbskillInstallResult { agent_id, status: "failed".to_string(), detail: Some("unknown Agent".to_string()) }); continue; };
        let target = home.join(contract.relative_target);
        let backup_root = app_data.join("agent-integration-backups").join(contract.id);
        match remove_verified_package(&target, &backup_root) {
            Ok(status) => results.push(NbskillInstallResult { agent_id: contract.id.to_string(), status: status.to_string(), detail: None }),
            Err(detail) => results.push(NbskillInstallResult { agent_id: contract.id.to_string(), status: "failed".to_string(), detail: Some(detail) }),
        }
    }
    Ok(results)
}

#[tauri::command]
pub fn repair_nbskill_agents(
    app: tauri::AppHandle,
    payload: InstallNbskillAgentsRequest,
) -> Result<Vec<NbskillInstallResult>, AppError> {
    let home = app.path().home_dir().map_err(|_| AppError::IoError)?;
    let app_data = app.path().app_data_dir().map_err(|_| AppError::IoError)?;
    let statuses = detect_nbskill_agents(&home, &app_data);
    let requested = payload.agent_ids;
    let unhealthy = requested.into_iter().filter(|agent_id| {
        statuses.iter().find(|status| &status.agent_id == agent_id).is_some_and(|status|
            status.agent_detected
                && status.package_status != "missing"
                && status.package_status != "newer_unverified"
                && (status.package_status != "compatible"
                    || status.runtime_status != "verified"
                    || (status.cli_status != "compatible" && status.cli_status != "newer_unverified"))
        )
    }).collect();
    install_nbskill_agents(app, InstallNbskillAgentsRequest { agent_ids: unhealthy })
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
