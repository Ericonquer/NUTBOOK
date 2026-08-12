use std::{env, fs, path::{Path, PathBuf}, time::SystemTime};

use crate::{
    core::agent_adapters::{cwd_scopes::{first_json_cwd, is_openclaw_system_workspace_under, scopes_from_cwds}, AgentWorkspaceAdapter},
    errors::AppError,
    models::{AgentArtifactEvent, AgentInstallation, AgentScopeDiscoveryPayload, DiscoveredAgentScope},
};

const ADAPTER_ID: &str = "openclaw";
const ADAPTER_PROFILE: &str = "openclaw-agent-sessions-jsonl-v1";

#[derive(Debug, Clone)]
pub struct OpenClawAdapter {
    agents_root: PathBuf,
    state_root: PathBuf,
}

impl OpenClawAdapter {
    pub fn from_environment() -> Self {
        let state_root = env::var_os("HOME").map(PathBuf::from).unwrap_or_default().join(".openclaw");
        Self { agents_root: state_root.join("agents"), state_root }
    }
    #[cfg(test)]
    fn with_roots(agents_root: PathBuf, state_root: PathBuf) -> Self { Self { agents_root, state_root } }
    pub fn discovery_payload(&self) -> AgentScopeDiscoveryPayload {
        match self.discover_scopes_internal() {
            Ok(scopes) => AgentScopeDiscoveryPayload { installations: vec![installation("ready", None)], scopes, artifact_summaries: Vec::new() },
            Err(message) => AgentScopeDiscoveryPayload { installations: vec![installation("unavailable", Some(message))], scopes: Vec::new(), artifact_summaries: Vec::new() },
        }
    }
    fn discover_scopes_internal(&self) -> Result<Vec<DiscoveredAgentScope>, String> {
        let root = fs::canonicalize(&self.agents_root).map_err(|_| "OpenClaw agent records are unavailable".to_string())?;
        let mut records = Vec::new();
        for agent in fs::read_dir(root).map_err(|_| "OpenClaw agent records are unreadable".to_string())? {
            let agent = agent.map_err(|_| "OpenClaw agent records are unreadable".to_string())?;
            if agent.file_type().map_err(|_| "OpenClaw agent records are unreadable".to_string())?.is_symlink() { continue; }
            let sessions = agent.path().join("sessions"); if !sessions.is_dir() { continue; }
            for session in fs::read_dir(sessions).map_err(|_| "OpenClaw agent records are unreadable".to_string())? {
                let session = session.map_err(|_| "OpenClaw agent records are unreadable".to_string())?;
                let name = session.file_name(); let Some(name) = name.to_str() else { continue; };
                if session.file_type().map_err(|_| "OpenClaw agent records are unreadable".to_string())?.is_symlink() || !name.ends_with(".jsonl") || name.contains(".trajectory") { continue; }
                let Some(cwd) = first_json_cwd(&session.path()) else { continue; };
                let modified_at = session.metadata().ok().and_then(|metadata| metadata.modified().ok()).unwrap_or(SystemTime::UNIX_EPOCH);
                let cwd_path = PathBuf::from(&cwd);
                if is_openclaw_system_workspace_under(&cwd_path, &self.state_root) {
                    records.extend(discover_workspace_child_projects(&cwd_path, modified_at)?);
                } else {
                    records.push((cwd, modified_at));
                }
            }
        }
        Ok(scopes_from_cwds(ADAPTER_ID, ADAPTER_PROFILE, records))
    }
}

fn discover_workspace_child_projects(
    workspace: &Path,
    modified_at: SystemTime,
) -> Result<Vec<(String, SystemTime)>, String> {
    let workspace = fs::canonicalize(workspace)
        .map_err(|_| "OpenClaw workspace is unavailable".to_string())?;
    let entries = fs::read_dir(&workspace)
        .map_err(|_| "OpenClaw workspace is unreadable".to_string())?;
    let mut projects = Vec::new();
    for entry in entries {
        let entry = entry.map_err(|_| "OpenClaw workspace is unreadable".to_string())?;
        let file_type = entry.file_type().map_err(|_| "OpenClaw workspace is unreadable".to_string())?;
        if file_type.is_symlink() || !file_type.is_dir() { continue; }
        let Some(name) = entry.file_name().to_str().map(str::to_string) else { continue; };
        if is_openclaw_system_child(&name) { continue; }
        let canonical = fs::canonicalize(entry.path())
            .map_err(|_| "OpenClaw workspace child is unreadable".to_string())?;
        if canonical.parent() != Some(workspace.as_path()) { continue; }
        projects.push((canonical.to_string_lossy().into_owned(), modified_at));
    }
    Ok(projects)
}

fn is_openclaw_system_child(name: &str) -> bool {
    let normalized = name.to_ascii_lowercase();
    normalized.starts_with('.')
        || normalized.starts_with('_')
        || matches!(
            normalized.as_str(),
            "handoff" | "tasks" | "memory" | "shared-protocols" | "skills" | "state"
        )
}

fn installation(status: &str, error_message: Option<String>) -> AgentInstallation {
    AgentInstallation { adapter_id: ADAPTER_ID.into(), adapter_profile: Some(ADAPTER_PROFILE.into()), status: status.into(), capability: "scope-only".into(), cli_version: None, error_kind: error_message.as_ref().map(|_| "agent_records_unavailable".into()), error_message }
}
impl AgentWorkspaceAdapter for OpenClawAdapter {
    fn adapter_id(&self) -> &'static str { ADAPTER_ID }
    fn detect_installations(&self) -> Result<Vec<AgentInstallation>, AppError> { Ok(self.discovery_payload().installations) }
    fn discover_scopes(&self) -> Result<Vec<DiscoveredAgentScope>, AppError> { Ok(self.discovery_payload().scopes) }
    fn discover_artifact_events(&self, scope: &DiscoveredAgentScope) -> Result<Vec<AgentArtifactEvent>, AppError> { if scope.adapter_id != ADAPTER_ID { return Err(AppError::InvalidParams); } Ok(Vec::new()) }
}

#[cfg(test)]
mod tests {
    use std::fs;
    use tempfile::tempdir;

    use super::OpenClawAdapter;

    #[test]
    fn discovers_project_from_real_session_cwd_record() {
        let directory = tempdir().expect("tempdir");
        let agents = directory.path().join("agents");
        let sessions = agents.join("main/sessions");
        fs::create_dir_all(&sessions).expect("sessions");
        let project = directory.path().join("project");
        fs::create_dir(&project).expect("project");
        fs::write(
            sessions.join("session.jsonl"),
            format!("{{\"cwd\":\"{}\"}}\n", project.display()),
        ).expect("session record");
        fs::write(
            sessions.join("session.trajectory.jsonl"),
            format!("{{\"cwd\":\"{}\"}}\n", directory.path().display()),
        ).expect("trajectory record");

        let payload = OpenClawAdapter::with_roots(agents, directory.path().join(".openclaw")).discovery_payload();

        assert_eq!(payload.installations[0].status, "ready");
        assert_eq!(payload.scopes.len(), 1);
        assert_eq!(payload.scopes[0].scope_kind, "project");
        assert_eq!(payload.scopes[0].root_path, fs::canonicalize(project).expect("canonical project").to_string_lossy());
    }

    #[test]
    fn expands_a_system_workspace_into_only_real_direct_child_projects() {
        let directory = tempdir().expect("tempdir");
        let state_root = directory.path().join(".openclaw");
        let workspace = state_root.join("workspace");
        fs::create_dir_all(workspace.join("nutbook")).expect("project");
        fs::create_dir_all(workspace.join("lq-tts")).expect("project without git");
        fs::create_dir_all(workspace.join("memory")).expect("system memory");
        fs::create_dir_all(workspace.join("skills")).expect("system skills");
        fs::create_dir_all(workspace.join(".openclaw")).expect("system metadata");
        let sessions = state_root.join("agents/main/sessions");
        fs::create_dir_all(&sessions).expect("sessions");
        fs::write(
            sessions.join("session.jsonl"),
            format!("{{\"cwd\":\"{}\"}}\n", workspace.display()),
        ).expect("session record");

        let payload = OpenClawAdapter::with_roots(state_root.join("agents"), state_root).discovery_payload();

        assert_eq!(payload.scopes.len(), 2);
        assert!(payload.scopes.iter().any(|scope| scope.display_name == "nutbook"));
        assert!(payload.scopes.iter().any(|scope| scope.display_name == "lq-tts"));
        assert!(payload.scopes.iter().all(|scope| !matches!(scope.display_name.as_str(), "memory" | "skills" | ".openclaw")));
    }
}
