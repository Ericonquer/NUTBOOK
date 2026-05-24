use crate::{
    core::skill_discovery::discover_artifact_skills,
    db::repositories::LibraryRepository,
    models::{BindLibrarySkillRequest, ExcludeSkillRequest, Library, RestoreExcludedSkillRequest, SkillDiscoveryPayload},
    errors::AppError,
    state::AppState,
};

fn backfill_library_skill_bindings(
    state: &AppState,
    libraries: &[Library],
    payload: &SkillDiscoveryPayload,
) -> Result<bool, AppError> {
    let existing_bindings = state.database.list_library_skill_bindings()?;
    let mut changed = false;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string());

    for skill in &payload.skills {
        let Some(output_path) = skill.output_path.as_ref() else {
            continue;
        };
        if skill.status != "connected" {
            continue;
        }
        for library in libraries {
            if library.source_kind != "folder" {
                continue;
            }
            if library.root_path != *output_path {
                continue;
            }
            if existing_bindings.iter().any(|(library_id, _, _)| *library_id == library.id) {
                continue;
            }
            state.database.bind_library_to_skill(
                library.id,
                &skill.normalized_name,
                &skill.name,
                &now,
            )?;
            changed = true;
        }
    }

    Ok(changed)
}

#[tauri::command]
pub fn list_discovered_artifact_skills(
    state: tauri::State<'_, AppState>,
) -> Result<SkillDiscoveryPayload, AppError> {
    let libraries = state.list_libraries()?;
    let visibility_overrides = state.database.list_skill_visibility_overrides()?;
    let library_skill_bindings = state.database.list_library_skill_bindings()?;
    let payload = discover_artifact_skills(&libraries, &visibility_overrides, &library_skill_bindings)?;
    if backfill_library_skill_bindings(&state, &libraries, &payload)? {
        let refreshed_bindings = state.database.list_library_skill_bindings()?;
        let mut refreshed =
            discover_artifact_skills(&libraries, &visibility_overrides, &refreshed_bindings)?;
        refreshed.bindings_backfilled = true;
        return Ok(refreshed);
    }
    Ok(payload)
}

#[tauri::command]
pub fn exclude_skill_from_nutbook(
    state: tauri::State<'_, AppState>,
    payload: ExcludeSkillRequest,
) -> Result<bool, AppError> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string());
    state
        .database
        .exclude_skill(&payload.normalized_name, &payload.display_name, &now)?;
    Ok(true)
}

#[tauri::command]
pub fn restore_excluded_skill(
    state: tauri::State<'_, AppState>,
    payload: RestoreExcludedSkillRequest,
) -> Result<bool, AppError> {
    state.database.restore_excluded_skill(&payload.normalized_name)?;
    Ok(true)
}

#[tauri::command]
pub fn bind_library_to_skill(
    state: tauri::State<'_, AppState>,
    payload: BindLibrarySkillRequest,
) -> Result<bool, AppError> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string());
    state.database.bind_library_to_skill(
        payload.library_id,
        &payload.normalized_name,
        &payload.display_name,
        &now,
    )?;
    Ok(true)
}
