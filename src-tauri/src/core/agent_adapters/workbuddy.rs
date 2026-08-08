use std::{env, fs, path::{Path, PathBuf}};

use chrono::{Local, NaiveDateTime, SecondsFormat, TimeZone};

use crate::{
    core::agent_adapters::AgentWorkspaceAdapter,
    errors::AppError,
    models::{AgentArtifactEvent, AgentInstallation, AgentScopeDiscoveryPayload, DiscoveredAgentScope},
};

const ADAPTER_ID: &str = "workbuddy";
const ADAPTER_PROFILE: &str = "workbuddy-local-5.3";
const CAPABILITY_SCOPES: &str = "scope-only";

#[derive(Debug, Clone)]
pub struct WorkBuddyAdapter {
    app_path: PathBuf,
    task_root: PathBuf,
}

#[derive(Debug)]
enum DiscoveryFailure {
    NotInstalled,
    RootNotFound,
    Unreadable,
}

impl WorkBuddyAdapter {
    pub fn from_environment() -> Self {
        let home = env::var_os("HOME").map(PathBuf::from).unwrap_or_default();
        let app_path = env::var_os("WORKBUDDY_APP_PATH")
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from("/Applications/WorkBuddy.app"));
        let task_root = env::var_os("WORKBUDDY_TASK_ROOT")
            .map(PathBuf::from)
            .unwrap_or_else(|| home.join("Workbuddy"));
        Self { app_path, task_root }
    }

    #[cfg(test)]
    fn with_paths(app_path: PathBuf, task_root: PathBuf) -> Self {
        Self { app_path, task_root }
    }

    pub fn discovery_payload(&self) -> AgentScopeDiscoveryPayload {
        match self.discover_scopes_internal() {
            Ok((scopes, version)) => AgentScopeDiscoveryPayload {
                installations: vec![AgentInstallation {
                    adapter_id: ADAPTER_ID.to_string(),
                    adapter_profile: Some(ADAPTER_PROFILE.to_string()),
                    status: "ready".to_string(),
                    capability: CAPABILITY_SCOPES.to_string(),
                    cli_version: version,
                    error_kind: None,
                    error_message: None,
                }],
                scopes,
                artifact_summaries: Vec::new(),
            },
            Err(failure) => {
                let (status, error_kind, message) = match failure {
                    DiscoveryFailure::NotInstalled => (
                        "not-found",
                        "not_installed",
                        "The verified WorkBuddy application was not found.",
                    ),
                    DiscoveryFailure::RootNotFound => (
                        "unavailable",
                        "task_root_not_found",
                        "The verified WorkBuddy task root was not found.",
                    ),
                    DiscoveryFailure::Unreadable => (
                        "unavailable",
                        "unreadable",
                        "The WorkBuddy task root could not be read.",
                    ),
                };
                AgentScopeDiscoveryPayload {
                    installations: vec![AgentInstallation {
                        adapter_id: ADAPTER_ID.to_string(),
                        adapter_profile: None,
                        status: status.to_string(),
                        capability: CAPABILITY_SCOPES.to_string(),
                        cli_version: read_bundle_version(&self.app_path),
                        error_kind: Some(error_kind.to_string()),
                        error_message: Some(message.to_string()),
                    }],
                    scopes: Vec::new(),
                    artifact_summaries: Vec::new(),
                }
            }
        }
    }

    fn discover_scopes_internal(
        &self,
    ) -> Result<(Vec<DiscoveredAgentScope>, Option<String>), DiscoveryFailure> {
        if !self.app_path.is_dir() {
            return Err(DiscoveryFailure::NotInstalled);
        }
        let version = read_bundle_version(&self.app_path);
        if !self.task_root.exists() {
            return Err(DiscoveryFailure::RootNotFound);
        }
        let canonical_root = fs::canonicalize(&self.task_root)
            .map_err(|_| DiscoveryFailure::Unreadable)?;
        if !canonical_root.is_dir() {
            return Err(DiscoveryFailure::RootNotFound);
        }
        let entries = fs::read_dir(&canonical_root).map_err(|_| DiscoveryFailure::Unreadable)?;
        let mut scopes = Vec::new();
        for entry in entries {
            let entry = entry.map_err(|_| DiscoveryFailure::Unreadable)?;
            let file_type = entry.file_type().map_err(|_| DiscoveryFailure::Unreadable)?;
            if file_type.is_symlink() || !file_type.is_dir() {
                continue;
            }
            let Some(name) = entry.file_name().to_str().map(str::to_string) else {
                continue;
            };
            let Some(task_time) = parse_task_directory_name(&name) else {
                continue;
            };
            let canonical_date_directory = fs::canonicalize(entry.path())
                .map_err(|_| DiscoveryFailure::Unreadable)?;
            if canonical_date_directory.parent() != Some(canonical_root.as_path()) {
                continue;
            }
            let last_activity_at = Local
                .from_local_datetime(&task_time)
                .earliest()
                .map(|value| value.to_rfc3339_opts(SecondsFormat::Secs, true))
                .unwrap_or_else(|| task_time.and_utc().to_rfc3339_opts(SecondsFormat::Secs, true));
            if has_local_manifest_marker(&canonical_date_directory) {
                scopes.push(DiscoveredAgentScope {
                    adapter_id: ADAPTER_ID.to_string(),
                    adapter_profile: ADAPTER_PROFILE.to_string(),
                    external_scope_id: format!("workbuddy:manifest-task:{name}"),
                    scope_kind: "task".to_string(),
                    root_path: canonical_date_directory.to_string_lossy().into_owned(),
                    display_name: name,
                    last_activity_at,
                    capability: CAPABILITY_SCOPES.to_string(),
                    source_record_count: 1,
                });
                continue;
            }
            let task_entries = fs::read_dir(&canonical_date_directory)
                .map_err(|_| DiscoveryFailure::Unreadable)?;
            for task_entry in task_entries {
                let task_entry = task_entry.map_err(|_| DiscoveryFailure::Unreadable)?;
                let task_file_type = task_entry.file_type()
                    .map_err(|_| DiscoveryFailure::Unreadable)?;
                if task_file_type.is_symlink() || !task_file_type.is_dir() {
                    continue;
                }
                let Some(task_name) = task_entry.file_name().to_str().map(str::to_string) else {
                    continue;
                };
                if task_name.starts_with('.') {
                    continue;
                }
                let canonical_scope = fs::canonicalize(task_entry.path())
                    .map_err(|_| DiscoveryFailure::Unreadable)?;
                if canonical_scope.parent() != Some(canonical_date_directory.as_path()) {
                    continue;
                }
                scopes.push(DiscoveredAgentScope {
                    adapter_id: ADAPTER_ID.to_string(),
                    adapter_profile: ADAPTER_PROFILE.to_string(),
                    external_scope_id: format!("workbuddy:task:{name}:{task_name}"),
                    scope_kind: "task".to_string(),
                    root_path: canonical_scope.to_string_lossy().into_owned(),
                    display_name: task_name,
                    last_activity_at: last_activity_at.clone(),
                    capability: CAPABILITY_SCOPES.to_string(),
                    source_record_count: 1,
                });
            }
        }
        scopes.sort_by(|left, right| {
            right
                .last_activity_at
                .cmp(&left.last_activity_at)
                .then_with(|| left.root_path.cmp(&right.root_path))
        });
        Ok((scopes, version))
    }
}

fn has_local_manifest_marker(date_directory: &Path) -> bool {
    let metadata_directory = date_directory.join(".agent-outputs");
    let Ok(metadata) = fs::symlink_metadata(&metadata_directory) else {
        return false;
    };
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return false;
    }
    let Ok(manifest) = fs::symlink_metadata(metadata_directory.join("manifest.json")) else {
        return false;
    };
    !manifest.file_type().is_symlink() && manifest.is_file()
}

impl AgentWorkspaceAdapter for WorkBuddyAdapter {
    fn adapter_id(&self) -> &'static str {
        ADAPTER_ID
    }

    fn detect_installations(&self) -> Result<Vec<AgentInstallation>, AppError> {
        Ok(self.discovery_payload().installations)
    }

    fn discover_scopes(&self) -> Result<Vec<DiscoveredAgentScope>, AppError> {
        Ok(self.discovery_payload().scopes)
    }

    fn discover_artifact_events(
        &self,
        scope: &DiscoveredAgentScope,
    ) -> Result<Vec<AgentArtifactEvent>, AppError> {
        if scope.adapter_id != ADAPTER_ID || scope.scope_kind != "task" {
            return Err(AppError::InvalidParams);
        }
        Ok(Vec::new())
    }
}

fn parse_task_directory_name(name: &str) -> Option<NaiveDateTime> {
    if name.len() != 19 {
        return None;
    }
    let parsed = NaiveDateTime::parse_from_str(name, "%Y-%m-%d-%H-%M-%S").ok()?;
    (parsed.format("%Y-%m-%d-%H-%M-%S").to_string() == name).then_some(parsed)
}

fn read_bundle_version(app_path: &Path) -> Option<String> {
    let info_plist = fs::read_to_string(app_path.join("Contents/Info.plist")).ok()?;
    let key = "<key>CFBundleShortVersionString</key>";
    let after_key = info_plist.split_once(key)?.1;
    let after_open = after_key.split_once("<string>")?.1;
    let version = after_open.split_once("</string>")?.0.trim();
    (!version.is_empty()).then(|| version.to_string())
}

#[cfg(test)]
mod tests {
    use std::{fs, path::Path};

    use serde_json::Value;
    use tempfile::tempdir;

    use super::{WorkBuddyAdapter, ADAPTER_PROFILE};

    fn create_app(path: &Path, version: &str) {
        fs::create_dir_all(path.join("Contents")).expect("app contents");
        fs::write(
            path.join("Contents/Info.plist"),
            format!(
                "<?xml version=\"1.0\"?><plist><dict><key>CFBundleShortVersionString</key><string>{version}</string></dict></plist>"
            ),
        )
        .expect("info plist");
    }

    #[test]
    fn workbuddy_adapter_discovers_task_folders_below_direct_date_containers() {
        let directory = tempdir().expect("tempdir");
        let app = directory.path().join("WorkBuddy.app");
        create_app(&app, "5.3.5");
        let root = directory.path().join("Workbuddy");
        fs::create_dir_all(root.join("2026-06-26-22-31-57/outputs/sample-delivery"))
            .expect("first task");
        fs::create_dir_all(root.join("2026-06-26-22-31-57/.workbuddy/memory"))
            .expect("internal metadata");
        fs::create_dir_all(root.join("2026-06-26-22-31-57/.agent-outputs"))
            .expect("agent output metadata");
        fs::create_dir_all(root.join("2026-07-17-10-41-23/codexquota"))
            .expect("second task");
        fs::write(
            root.join("2026-07-17-10-41-23/codexquota_feasibility.md"),
            "direct date-container file",
        )
        .expect("direct file");
        fs::create_dir_all(root.join("Claw")).expect("non task");
        fs::create_dir_all(root.join("2026-07-18-invalid")).expect("invalid task");

        let payload = WorkBuddyAdapter::with_paths(app, root.clone()).discovery_payload();

        assert_eq!(payload.installations[0].status, "ready");
        assert_eq!(payload.installations[0].adapter_profile.as_deref(), Some(ADAPTER_PROFILE));
        assert_eq!(payload.scopes.len(), 2);
        assert!(payload.scopes.iter().all(|scope| scope.scope_kind == "task"));
        assert!(payload
            .scopes
            .iter()
            .any(|scope| scope.external_scope_id.ends_with("2026-06-26-22-31-57:outputs")
                && scope.display_name == "outputs"
                && scope.root_path.ends_with("2026-06-26-22-31-57/outputs")));
        assert!(payload
            .scopes
            .iter()
            .any(|scope| scope.external_scope_id.ends_with("2026-07-17-10-41-23:codexquota")
                && scope.display_name == "codexquota"
                && scope.root_path.ends_with("2026-07-17-10-41-23/codexquota")));
        assert!(payload
            .scopes
            .iter()
            .all(|scope| !scope.display_name.starts_with('.')));
    }

    #[test]
    fn workbuddy_adapter_uses_version_as_metadata_not_as_a_gate() {
        let directory = tempdir().expect("tempdir");
        let app = directory.path().join("WorkBuddy.app");
        create_app(&app, "5.3.11");
        let root = directory.path().join("Workbuddy");
        fs::create_dir_all(root.join("2026-07-17-10-41-23/codexquota"))
            .expect("current task shape");

        let payload = WorkBuddyAdapter::with_paths(app, root).discovery_payload();

        assert_eq!(payload.installations[0].status, "ready");
        assert_eq!(payload.installations[0].cli_version.as_deref(), Some("5.3.11"));
        assert_eq!(payload.scopes.len(), 1);
        assert_eq!(payload.scopes[0].scope_kind, "task");
        assert_eq!(payload.scopes[0].display_name, "codexquota");
        assert!(payload.scopes[0].root_path.ends_with("2026-07-17-10-41-23/codexquota"));
    }

    #[test]
    fn workbuddy_adapter_uses_manifest_marked_date_directory_as_one_task_scope() {
        let directory = tempdir().expect("tempdir");
        let app = directory.path().join("WorkBuddy.app");
        create_app(&app, "5.3.11");
        let root = directory.path().join("Workbuddy");
        let date_root = root.join("2026-08-02-21-02-36");
        fs::create_dir_all(date_root.join(".agent-outputs")).expect("manifest directory");
        fs::create_dir_all(date_root.join("output")).expect("output directory");
        fs::write(date_root.join(".agent-outputs/manifest.json"), "{broken")
            .expect("manifest marker");
        fs::write(date_root.join("nbskill-intro.md"), "# nbskill").expect("root artifact");

        let payload = WorkBuddyAdapter::with_paths(app, root).discovery_payload();

        assert_eq!(payload.scopes.len(), 1);
        assert_eq!(
            payload.scopes[0].external_scope_id,
            "workbuddy:manifest-task:2026-08-02-21-02-36"
        );
        assert_eq!(payload.scopes[0].display_name, "2026-08-02-21-02-36");
        assert_eq!(payload.scopes[0].scope_kind, "task");
        assert_eq!(
            payload.scopes[0].root_path,
            fs::canonicalize(date_root)
                .expect("canonical date root")
                .to_string_lossy()
        );
    }

    #[test]
    fn workbuddy_adapter_matches_checked_in_acceptance_fixture() {
        let directory = tempdir().expect("tempdir");
        let app = directory.path().join("WorkBuddy.app");
        create_app(&app, "5.3.5");
        let fixture_base = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/agent-artifact-discovery/provider-records/workbuddy");
        let fixture_root = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/agent-artifact-discovery/projects/sample-workbuddy-root");
        let expected: Value = serde_json::from_str(
            &fs::read_to_string(fixture_base.join("expected-scopes.json"))
                .expect("expected scopes fixture"),
        )
        .expect("valid expected scopes fixture");

        let payload = WorkBuddyAdapter::with_paths(app, fixture_root).discovery_payload();
        let expected_scopes = expected["scopes"]
            .as_array()
            .expect("fixture scopes");

        assert_eq!(payload.installations[0].status, "ready");
        assert_eq!(payload.scopes.len(), expected_scopes.len());
        for expected_scope in expected_scopes {
            let expected_id = expected_scope["externalScopeId"].as_str().expect("scope id");
            let actual = payload
                .scopes
                .iter()
                .find(|scope| scope.external_scope_id == expected_id)
                .expect("expected WorkBuddy task scope");
            assert_eq!(
                actual.display_name,
                expected_scope["displayName"].as_str().expect("display name")
            );
            let expected_path = expected_scope["rootPath"].as_str().expect("root path");
            let expected_suffix = expected_path
                .strip_prefix("/workspace/sample-workbuddy-root/")
                .expect("fixture root placeholder");
            assert!(actual.root_path.ends_with(expected_suffix));
        }
        assert!(payload.scopes.iter().all(|scope| scope.scope_kind == "task"));
    }

    #[test]
    fn workbuddy_adapter_accepts_new_versions_when_the_task_contract_still_matches() {
        let directory = tempdir().expect("tempdir");
        let app = directory.path().join("WorkBuddy.app");
        create_app(&app, "6.0.0");
        let root = directory.path().join("Workbuddy");
        fs::create_dir_all(root.join("2026-06-26-22-31-57/task")).expect("task");

        let payload = WorkBuddyAdapter::with_paths(app, root).discovery_payload();

        assert_eq!(payload.installations[0].status, "ready");
        assert_eq!(payload.installations[0].cli_version.as_deref(), Some("6.0.0"));
        assert_eq!(payload.scopes.len(), 1);
    }

    #[test]
    fn workbuddy_adapter_accepts_new_minor_versions_when_the_task_contract_still_matches() {
        let directory = tempdir().expect("tempdir");
        let app = directory.path().join("WorkBuddy.app");
        create_app(&app, "5.4.0");
        let root = directory.path().join("Workbuddy");
        fs::create_dir_all(root.join("2026-06-26-22-31-57/task")).expect("task");

        let payload = WorkBuddyAdapter::with_paths(app, root).discovery_payload();

        assert_eq!(payload.installations[0].status, "ready");
        assert_eq!(payload.installations[0].cli_version.as_deref(), Some("5.4.0"));
        assert_eq!(payload.scopes.len(), 1);
    }

    #[test]
    fn workbuddy_adapter_does_not_require_version_metadata_to_read_valid_tasks() {
        let directory = tempdir().expect("tempdir");
        let app = directory.path().join("WorkBuddy.app");
        fs::create_dir_all(app.join("Contents")).expect("app contents");
        let root = directory.path().join("Workbuddy");
        fs::create_dir_all(root.join("2026-06-26-22-31-57/task")).expect("task");

        let payload = WorkBuddyAdapter::with_paths(app, root).discovery_payload();

        assert_eq!(payload.installations[0].status, "ready");
        assert_eq!(payload.installations[0].cli_version, None);
        assert_eq!(payload.scopes.len(), 1);
    }

    #[cfg(unix)]
    #[test]
    fn workbuddy_adapter_does_not_follow_task_directory_symlinks() {
        use std::os::unix::fs::symlink;

        let directory = tempdir().expect("tempdir");
        let app = directory.path().join("WorkBuddy.app");
        create_app(&app, "5.3.5");
        let root = directory.path().join("Workbuddy");
        let outside = directory.path().join("outside-task");
        fs::create_dir_all(&root).expect("root");
        fs::create_dir_all(&outside).expect("outside");
        symlink(&outside, root.join("2026-06-26-22-31-57")).expect("task symlink");

        let payload = WorkBuddyAdapter::with_paths(app, root).discovery_payload();

        assert!(payload.scopes.is_empty());
    }

    #[cfg(unix)]
    #[test]
    fn workbuddy_adapter_does_not_follow_task_folder_symlinks() {
        use std::os::unix::fs::symlink;

        let directory = tempdir().expect("tempdir");
        let app = directory.path().join("WorkBuddy.app");
        create_app(&app, "5.3.8");
        let root = directory.path().join("Workbuddy");
        let date_directory = root.join("2026-06-26-22-31-57");
        let outside = directory.path().join("outside-task");
        fs::create_dir_all(&date_directory).expect("date directory");
        fs::create_dir_all(&outside).expect("outside");
        symlink(&outside, date_directory.join("pretend-task")).expect("task folder symlink");

        let payload = WorkBuddyAdapter::with_paths(app, root).discovery_payload();

        assert!(payload.scopes.is_empty());
    }

    #[cfg(unix)]
    #[test]
    fn workbuddy_adapter_does_not_promote_a_symlinked_manifest_marker() {
        use std::os::unix::fs::symlink;

        let directory = tempdir().expect("tempdir");
        let app = directory.path().join("WorkBuddy.app");
        create_app(&app, "5.3.11");
        let root = directory.path().join("Workbuddy");
        let date_root = root.join("2026-08-02-21-02-36");
        let outside = directory.path().join("outside-agent-outputs");
        fs::create_dir_all(date_root.join("output")).expect("task folder");
        fs::create_dir_all(&outside).expect("outside manifest directory");
        fs::write(outside.join("manifest.json"), "{}").expect("outside manifest");
        symlink(&outside, date_root.join(".agent-outputs")).expect("manifest symlink");

        let payload = WorkBuddyAdapter::with_paths(app, root).discovery_payload();

        assert_eq!(payload.scopes.len(), 1);
        assert_eq!(payload.scopes[0].display_name, "output");
        assert!(payload.scopes[0].root_path.ends_with("2026-08-02-21-02-36/output"));
    }
}
