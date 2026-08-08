use crate::{
    core::{
        agent_adapters::{codex::CodexAdapter, workbuddy::WorkBuddyAdapter},
        agent_output_manifest::{
            read_agent_output_manifest, ManifestReadError, MANIFEST_RELATIVE_PATH,
        },
        artifact_discovery::{
            classify_artifact_candidates, observe_project_files_bounded, ArtifactDiscoveryInput,
            ArtifactFileObservation, ArtifactScanLimits,
        },
    },
    errors::AppError,
    models::{
        AcceptAgentArtifactGroupsRequest, AcceptAgentArtifactRequest,
        AgentArtifactAcceptanceResult, AgentArtifactPreviewPayload,
        AgentProjectSourceSummary, AgentScopeDiscoveryPayload, ConnectAgentProjectRequest,
        DiscoveredAgentScope, DiscoveredScopeArtifactSummary, IgnoreAgentArtifactRequest,
        MergeAgentTaskScopeRequest, PreviewAgentProjectArtifactsRequest, RefreshAgentProjectRequest,
        SetAgentProjectDiscoveryRuleRequest,
    },
    state::AppState,
};
use std::{
    sync::atomic::AtomicBool,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

#[tauri::command]
pub async fn discover_agent_projects(
    state: tauri::State<'_, AppState>,
) -> Result<AgentScopeDiscoveryPayload, AppError> {
    let database = state.database.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut payload = merge_scope_discovery_payloads(vec![
            CodexAdapter::from_environment().discovery_payload(),
            WorkBuddyAdapter::from_environment().discovery_payload(),
        ]);
        payload.artifact_summaries = payload
            .scopes
            .iter()
            .map(|scope| discover_scope_artifact_summary(scope, Some(&database)))
            .collect();
        database.save_agent_discovery_cache(&payload, &current_timestamp())?;
        Ok(payload)
    })
    .await
    .map_err(|_| AppError::InternalError)?
}

#[tauri::command]
pub fn get_cached_agent_projects(
    state: tauri::State<'_, AppState>,
) -> Result<Option<AgentScopeDiscoveryPayload>, AppError> {
    state.database.load_agent_discovery_cache()
}

fn merge_scope_discovery_payloads(
    payloads: Vec<AgentScopeDiscoveryPayload>,
) -> AgentScopeDiscoveryPayload {
    let mut merged = AgentScopeDiscoveryPayload {
        installations: Vec::new(),
        scopes: Vec::new(),
        artifact_summaries: Vec::new(),
    };
    for payload in payloads {
        merged.installations.extend(payload.installations);
        merged.scopes.extend(payload.scopes);
        merged.artifact_summaries.extend(payload.artifact_summaries);
    }
    merged
        .installations
            .sort_by(|left, right| left.adapter_id.cmp(&right.adapter_id));
    merged.scopes.sort_by(|left, right| {
        right
            .last_activity_at
            .cmp(&left.last_activity_at)
            .then_with(|| left.root_path.cmp(&right.root_path))
            .then_with(|| left.adapter_id.cmp(&right.adapter_id))
    });
    merged
}

fn discover_scope_artifact_summary(
    scope: &DiscoveredAgentScope,
    database: Option<&crate::db::Database>,
) -> DiscoveredScopeArtifactSummary {
    let project_root = std::path::Path::new(&scope.root_path);
    let limits = if scope.scope_kind == "task" {
        ArtifactScanLimits {
            max_depth: 6,
            max_entries: 5_000,
            max_duration: Duration::from_secs(1),
        }
    } else {
        ArtifactScanLimits {
            max_depth: 8,
            max_entries: 10_000,
            max_duration: Duration::from_secs(2),
        }
    };
    let observation = observe_project_files_bounded(
        project_root,
        limits,
        &AtomicBool::new(false),
    );
    let observation_issue = observation.issue.clone();
    let (events, provider_issue) = if scope.adapter_id == "codex"
        && scope.capability == "project-and-verified-events"
        && scope.scope_kind == "project"
    {
        match CodexAdapter::from_environment().artifact_events_for_project(project_root) {
            Ok(events) => (events, None),
            Err(_) => (Vec::new(), Some("provider_snapshot_failed".to_string())),
        }
    } else {
        (Vec::new(), None)
    };
    let known_paths = database
        .and_then(|database| {
            database
                .known_artifact_paths_for_root(&scope.root_path)
                .ok()
        })
        .unwrap_or_default();
    let (manifest_entries, manifest_issue) = match read_agent_output_manifest(project_root) {
        Ok(manifest) => (
            manifest.map(|manifest| manifest.entries).unwrap_or_default(),
            None,
        ),
        Err(error) => (Vec::new(), Some(manifest_issue_code(error).to_string())),
    };
    let candidates = classify_artifact_candidates(
        project_root,
        &ArtifactDiscoveryInput {
            project_library_id: 0,
            source_adapter_id: scope.adapter_id.clone(),
            scope_kind: scope.scope_kind.clone(),
            observed_files: observation.files,
            events,
            manifest_entries,
        },
    );
    let count = |status: &str| {
        candidates
            .iter()
            .filter(|candidate| {
                candidate.status == status && !known_paths.contains(&candidate.primary_path)
            })
            .count()
            .try_into()
            .unwrap_or(u32::MAX)
    };
    let scan_issue = manifest_issue.or(provider_issue).or(observation_issue);
    let already_indexed_paths = candidates
        .iter()
        .filter(|candidate| known_paths.contains(&candidate.primary_path))
        .map(|candidate| candidate.primary_path.clone())
        .collect();
    DiscoveredScopeArtifactSummary {
        adapter_id: scope.adapter_id.clone(),
        external_scope_id: scope.external_scope_id.clone(),
        suggested_count: count("suggested"),
        pending_count: count("pending"),
        excluded_count: count("excluded"),
        already_indexed_paths,
        scan_status: if scan_issue.is_some() { "partial" } else { "complete" }.to_string(),
        scan_issue,
    }
}

#[tauri::command]
pub fn connect_agent_project(
    state: tauri::State<'_, AppState>,
    payload: ConnectAgentProjectRequest,
) -> Result<AgentProjectSourceSummary, AppError> {
    let project = state.database.connect_agent_project_source(
        &payload.adapter_id,
        payload.adapter_profile.as_deref(),
        &payload.external_scope_id,
        &payload.scope_kind,
        &payload.capability,
        &payload.root_path,
        payload.display_name.as_deref(),
        &current_timestamp(),
    )?;
    discover_and_store_candidates(&state.database, &project)?;
    Ok(project)
}

#[tauri::command]
pub fn preview_agent_project_artifacts(
    state: tauri::State<'_, AppState>,
    payload: PreviewAgentProjectArtifactsRequest,
) -> Result<AgentArtifactPreviewPayload, AppError> {
    preview_payload(&state.database, payload.project_library_id)
}

#[tauri::command]
pub fn accept_agent_artifact_groups(
    state: tauri::State<'_, AppState>,
    payload: AcceptAgentArtifactGroupsRequest,
) -> Result<AgentArtifactAcceptanceResult, AppError> {
    let candidate_ids = state
        .database
        .candidate_ids_for_batches(payload.project_library_id, &payload.batch_keys)?;
    state.database.accept_agent_artifact_candidates(
        payload.project_library_id,
        &candidate_ids,
        &current_timestamp(),
    )
}

#[tauri::command]
pub fn accept_agent_artifact(
    state: tauri::State<'_, AppState>,
    payload: AcceptAgentArtifactRequest,
) -> Result<AgentArtifactAcceptanceResult, AppError> {
    state.database.accept_agent_artifact_candidates(
        payload.project_library_id,
        &[payload.candidate_id],
        &current_timestamp(),
    )
}

#[tauri::command]
pub fn ignore_agent_artifact(
    state: tauri::State<'_, AppState>,
    payload: IgnoreAgentArtifactRequest,
) -> Result<bool, AppError> {
    state
        .database
        .ignore_agent_artifact_candidate(payload.project_library_id, payload.candidate_id)?;
    Ok(true)
}

#[tauri::command]
pub fn set_agent_project_discovery_rule(
    state: tauri::State<'_, AppState>,
    payload: SetAgentProjectDiscoveryRuleRequest,
) -> Result<AgentProjectSourceSummary, AppError> {
    state.database.set_agent_project_auto_import_mode(
        payload.project_library_id,
        &payload.auto_import_mode,
    )
}

#[tauri::command]
pub fn refresh_agent_project(
    state: tauri::State<'_, AppState>,
    payload: RefreshAgentProjectRequest,
) -> Result<AgentArtifactPreviewPayload, AppError> {
    state
        .database
        .refresh_agent_project_candidate_paths(payload.project_library_id)?;
    let project = state
        .database
        .get_agent_project_source(payload.project_library_id)?;
    discover_and_store_candidates(&state.database, &project)?;
    preview_payload(&state.database, payload.project_library_id)
}

#[tauri::command]
pub fn merge_agent_task_scope(
    state: tauri::State<'_, AppState>,
    payload: MergeAgentTaskScopeRequest,
) -> Result<AgentProjectSourceSummary, AppError> {
    state
        .database
        .merge_agent_task_scope(payload.task_library_id, payload.project_library_id)
}

fn discover_and_store_candidates(
    database: &crate::db::Database,
    project: &AgentProjectSourceSummary,
) -> Result<ArtifactFileObservation, AppError> {
    let has_codex = project
        .adapters
        .iter()
        .any(|binding| binding.adapter_id == "codex");
    let has_verified_codex_events = project.adapters.iter().any(|binding| {
        binding.adapter_id == "codex"
            && binding.capability == "project-and-verified-events"
            && binding.snapshot_status == "ready"
    });
    let has_workbuddy = project
        .adapters
        .iter()
        .any(|binding| binding.adapter_id == "workbuddy");
    if !has_codex && !has_workbuddy {
        return Err(AppError::InvalidParams);
    }
    let project_root = std::path::Path::new(&project.root_path);
    let now = current_timestamp();
    let (events, provider_issue) = if has_verified_codex_events && project.scope_kind == "project" {
        match CodexAdapter::from_environment().artifact_events_for_project(project_root) {
            Ok(events) => {
                for binding in project
                    .adapters
                    .iter()
                    .filter(|binding| binding.adapter_id == "codex")
                {
                    database.record_agent_adapter_snapshot_success(
                        project.library_id,
                        &binding.adapter_id,
                        &binding.external_scope_id,
                        &now,
                    )?;
                }
                (events, None)
            }
            Err(_) => {
                for binding in project
                    .adapters
                    .iter()
                    .filter(|binding| binding.adapter_id == "codex")
                {
                    database.record_agent_adapter_snapshot_failure(
                        project.library_id,
                        &binding.adapter_id,
                        &binding.external_scope_id,
                        "stale",
                        "provider_snapshot_failed",
                        "Codex project facts could not be refreshed.",
                        &now,
                    )?;
                }
                (Vec::new(), Some("provider_snapshot_failed".to_string()))
            }
        }
    } else {
        (Vec::new(), None)
    };
    let limits = if project.scope_kind == "task" {
        ArtifactScanLimits {
            max_depth: 6,
            max_entries: 5_000,
            max_duration: Duration::from_secs(2),
        }
    } else {
        ArtifactScanLimits::default()
    };
    let observation = observe_project_files_bounded(
        project_root,
        limits,
        &AtomicBool::new(false),
    );
    let known_paths = database.known_artifact_paths_for_root(&project.root_path)?;
    let observed_paths = observation
        .files
        .iter()
        .map(|file| file.path.clone())
        .collect::<std::collections::BTreeSet<_>>();
    database.reconcile_accepted_agent_candidates(
        project.library_id,
        &known_paths,
        &observed_paths,
    )?;
    database.remove_undecided_agent_candidates_for_paths(project.library_id, &known_paths)?;
    let manifest = match read_agent_output_manifest(project_root) {
        Ok(manifest) => manifest,
        Err(error) => {
            let issue = manifest_issue_code(error);
            database.record_agent_project_scan_outcome(project.library_id, "partial", Some(issue))?;
            return Ok(ArtifactFileObservation {
                files: observation.files,
                status: "partial".to_string(),
                issue: Some(issue.to_string()),
            });
        }
    };
    let has_manifest = manifest.is_some();
    if has_manifest {
        database.record_agent_project_manifest_success(
            project.library_id,
            MANIFEST_RELATIVE_PATH,
            &now,
        )?;
    }
    let candidates = classify_artifact_candidates(
        project_root,
        &ArtifactDiscoveryInput {
            project_library_id: project.library_id,
            source_adapter_id: if project.scope_kind == "task" {
                "workbuddy".to_string()
            } else {
                "codex".to_string()
            },
            scope_kind: project.scope_kind.clone(),
            observed_files: observation.files.clone(),
            events,
            manifest_entries: manifest
                .map(|manifest| manifest.entries)
                .unwrap_or_default(),
        },
    )
    .into_iter()
    .filter(|candidate| {
        !known_paths.contains(&candidate.primary_path)
            || candidate
                .reasons
                .contains(&crate::models::DiscoveryReasonKind::NbskillRegistered)
    })
    .collect::<Vec<_>>();
    database.upsert_artifact_candidates(
        project.library_id,
        &candidates,
        &now,
    )?;
    let manifest_auto_import_issue = if has_manifest && project.auto_import_mode == "explicit" {
        let candidate_ids = database.candidate_ids_for_manifest_registration(project.library_id)?;
        let result = database.accept_agent_artifact_candidates(
            project.library_id,
            &candidate_ids,
            &now,
        )?;
        (!result.failed.is_empty()).then(|| "manifest_auto_import_failed".to_string())
    } else {
        None
    };
    let scan_issue = manifest_auto_import_issue
        .or(provider_issue)
        .or(observation.issue.clone());
    let scan_status = if scan_issue.is_some() { "partial" } else { "complete" };
    database.record_agent_project_scan_outcome(
        project.library_id,
        scan_status,
        scan_issue.as_deref(),
    )?;
    Ok(ArtifactFileObservation {
        files: observation.files,
        status: scan_status.to_string(),
        issue: scan_issue,
    })
}

fn manifest_issue_code(error: ManifestReadError) -> &'static str {
    match error {
        ManifestReadError::Unreadable => "manifest_unreadable",
        ManifestReadError::InvalidJson => "manifest_invalid_json",
        ManifestReadError::InvalidContract(_) => "manifest_invalid_contract",
    }
}

fn preview_payload(
    database: &crate::db::Database,
    project_library_id: i64,
) -> Result<AgentArtifactPreviewPayload, AppError> {
    let project = database.get_agent_project_source(project_library_id)?;
    let groups = database.list_artifact_candidate_groups(project_library_id)?;
    let review_candidates = database.list_artifact_candidates_for_review(project_library_id)?;
    let indexed_artifacts = database.list_indexed_manifest_artifacts(project_library_id)?;
    let suggested_count = groups
        .iter()
        .filter(|group| group.status == "suggested")
        .map(|group| group.count)
        .sum();
    let pending_count = groups
        .iter()
        .filter(|group| group.status == "pending")
        .map(|group| group.count)
        .sum();
    let excluded_count = groups
        .iter()
        .filter(|group| group.status == "excluded")
        .map(|group| group.count)
        .sum();
    Ok(AgentArtifactPreviewPayload {
        project,
        groups,
        review_candidates,
        indexed_artifacts,
        suggested_count,
        pending_count,
        excluded_count,
    })
}

fn current_timestamp() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

#[cfg(test)]
mod tests {
    use std::fs;

    use crate::models::{
        AgentInstallation, AgentScopeDiscoveryPayload, DiscoveredAgentScope,
    };
    use crate::{db::repositories::ItemRepository, db::Database};
    use tempfile::tempdir;

    #[test]
    fn connected_project_auto_imports_active_manifest_entries_only() {
        let project = tempdir().expect("project scope");
        fs::create_dir_all(project.path().join(".agent-outputs")).expect("manifest directory");
        fs::write(project.path().join("registered.md"), "# Registered").expect("registered file");
        fs::write(project.path().join("unregistered.md"), "# Unregistered").expect("unregistered file");
        fs::write(
            project.path().join(".agent-outputs/manifest.json"),
            r#"{"schemaVersion":1,"projectRoot":".","entries":[{"id":"registered","path":"registered.md","state":"active","skill":{"name":"report-writer"},"kind":"report"}]}"#,
        )
        .expect("manifest");
        let database_root = tempdir().expect("database root");
        let database = Database::new(database_root.path().join("manifest-auto.sqlite3"))
            .expect("database");
        let source = database
            .connect_agent_project_source(
                "codex",
                Some("codex-local-test"),
                "codex:manifest-auto",
                "project",
                "project-only",
                project.path().to_str().expect("project path"),
                Some("Manifest auto"),
                "2026-08-02T00:00:00Z",
            )
            .expect("connect project");

        discover_and_store_candidates(&database, &source).expect("hybrid discovery");

        let items = database
            .list_items(&crate::models::ListItemsQuery {
                library_id: Some(source.library_id),
                page_size: Some(100),
                ..Default::default()
            })
            .expect("items");
        assert!(items.items.iter().any(|item| item.file_name == "registered.md"));
        assert!(!items.items.iter().any(|item| item.file_name == "unregistered.md"));
        let refreshed = database
            .get_agent_project_source(source.library_id)
            .expect("hybrid source");
        assert_eq!(refreshed.discovery_mode, "hybrid");
        let preview = preview_payload(&database, source.library_id).expect("hybrid preview");
        assert_eq!(preview.indexed_artifacts.len(), 1);
        assert_eq!(preview.indexed_artifacts[0].primary_path, "registered.md");
        assert_eq!(
            preview.indexed_artifacts[0].evidence[0]
                .skill_display_name
                .as_deref(),
            Some("report-writer")
        );
    }

    use super::{
        discover_and_store_candidates, discover_scope_artifact_summary,
        merge_scope_discovery_payloads, preview_payload,
    };

    fn payload(adapter_id: &str, scope_kind: &str, last_activity_at: &str) -> AgentScopeDiscoveryPayload {
        AgentScopeDiscoveryPayload {
            installations: vec![AgentInstallation {
                adapter_id: adapter_id.to_string(),
                adapter_profile: Some(format!("{adapter_id}-profile")),
                status: "ready".to_string(),
                capability: "scope-only".to_string(),
                cli_version: None,
                error_kind: None,
                error_message: None,
            }],
            scopes: vec![DiscoveredAgentScope {
                adapter_id: adapter_id.to_string(),
                adapter_profile: format!("{adapter_id}-profile"),
                external_scope_id: format!("{adapter_id}:{scope_kind}"),
                scope_kind: scope_kind.to_string(),
                root_path: format!("/fixture/{adapter_id}/{scope_kind}"),
                display_name: format!("{adapter_id} {scope_kind}"),
                last_activity_at: last_activity_at.to_string(),
                capability: "scope-only".to_string(),
                source_record_count: 1,
            }],
            artifact_summaries: Vec::new(),
        }
    }

    #[test]
    fn merged_discovery_keeps_multiple_installations_and_scope_kinds() {
        let merged = merge_scope_discovery_payloads(vec![
            payload("workbuddy", "task", "2026-06-26T22:31:57+08:00"),
            payload("codex", "project", "2026-07-28T09:45:00Z"),
        ]);

        assert_eq!(merged.installations.len(), 2);
        assert_eq!(merged.installations[0].adapter_id, "codex");
        assert_eq!(merged.scopes.len(), 2);
        assert_eq!(merged.scopes[0].scope_kind, "project");
        assert_eq!(merged.scopes[1].scope_kind, "task");
    }

    #[test]
    fn read_only_scope_summary_exposes_candidate_counts_without_connecting_a_source() {
        let task = tempdir().expect("task scope");
        fs::write(task.path().join("report.md"), "# Report").expect("report");
        let scope = DiscoveredAgentScope {
            adapter_id: "workbuddy".to_string(),
            adapter_profile: "workbuddy-local-5.3".to_string(),
            external_scope_id: "workbuddy:task:fixture:report".to_string(),
            scope_kind: "task".to_string(),
            root_path: task.path().to_string_lossy().into_owned(),
            display_name: "report".to_string(),
            last_activity_at: "2026-08-01T00:00:00Z".to_string(),
            capability: "scope-only".to_string(),
            source_record_count: 1,
        };

        let summary = discover_scope_artifact_summary(&scope, None);

        assert_eq!(summary.suggested_count, 0);
        assert_eq!(summary.pending_count, 1);
        assert_eq!(summary.scan_status, "complete");
    }

    #[test]
    fn read_only_scope_summary_promotes_active_manifest_entry() {
        let project = tempdir().expect("project scope");
        fs::create_dir_all(project.path().join(".agent-outputs")).expect("manifest directory");
        fs::write(project.path().join("report.md"), "# Report").expect("report");
        fs::write(
            project.path().join(".agent-outputs/manifest.json"),
            r#"{"schemaVersion":1,"projectRoot":".","entries":[{"id":"report","path":"report.md","state":"active","skill":{"name":"report-writer"},"kind":"report"}]}"#,
        )
        .expect("manifest");
        let scope = DiscoveredAgentScope {
            adapter_id: "codex".to_string(),
            adapter_profile: "codex-local".to_string(),
            external_scope_id: "codex:fixture".to_string(),
            scope_kind: "project".to_string(),
            root_path: project.path().to_string_lossy().into_owned(),
            display_name: "fixture".to_string(),
            last_activity_at: "2026-08-02T00:00:00Z".to_string(),
            capability: "project-only".to_string(),
            source_record_count: 1,
        };

        let summary = discover_scope_artifact_summary(&scope, None);

        assert_eq!(summary.suggested_count, 1);
        assert_eq!(summary.pending_count, 0);
        assert_eq!(summary.scan_status, "complete");
    }

    #[test]
    fn workbuddy_manifest_task_summary_includes_root_and_child_deliverables() {
        let task_root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/agent-artifact-discovery/projects/sample-workbuddy-root")
            .join("2026-08-02-21-02-36");
        let scope = DiscoveredAgentScope {
            adapter_id: "workbuddy".to_string(),
            adapter_profile: "workbuddy-local-5.3".to_string(),
            external_scope_id: "workbuddy:manifest-task:2026-08-02-21-02-36".to_string(),
            scope_kind: "task".to_string(),
            root_path: task_root.to_string_lossy().into_owned(),
            display_name: "2026-08-02-21-02-36".to_string(),
            last_activity_at: "2026-08-02T21:02:36Z".to_string(),
            capability: "scope-only".to_string(),
            source_record_count: 1,
        };

        let summary = discover_scope_artifact_summary(&scope, None);

        assert_eq!(summary.suggested_count, 2);
        assert_eq!(summary.pending_count, 0);
        assert_eq!(summary.scan_status, "complete");
    }

    #[test]
    fn invalid_manifest_marks_scope_partial_without_hiding_adapter_files() {
        let project = tempdir().expect("project scope");
        fs::create_dir_all(project.path().join(".agent-outputs")).expect("manifest directory");
        fs::write(project.path().join("report.md"), "# Report").expect("report");
        fs::write(project.path().join(".agent-outputs/manifest.json"), "{broken")
            .expect("broken manifest");
        let scope = DiscoveredAgentScope {
            adapter_id: "codex".to_string(),
            adapter_profile: "codex-local".to_string(),
            external_scope_id: "codex:fixture".to_string(),
            scope_kind: "project".to_string(),
            root_path: project.path().to_string_lossy().into_owned(),
            display_name: "fixture".to_string(),
            last_activity_at: "2026-08-02T00:00:00Z".to_string(),
            capability: "project-only".to_string(),
            source_record_count: 1,
        };

        let summary = discover_scope_artifact_summary(&scope, None);

        assert_eq!(summary.suggested_count, 1);
        assert_eq!(summary.scan_status, "partial");
        assert_eq!(summary.scan_issue.as_deref(), Some("manifest_invalid_json"));
    }
}
