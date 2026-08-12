use std::{env, fs, path::PathBuf, time::SystemTime};

use serde_json::Value;

use crate::{
    core::agent_adapters::{cwd_scopes::scopes_from_cwds, AgentWorkspaceAdapter},
    errors::AppError,
    models::{AgentArtifactEvent, AgentInstallation, AgentScopeDiscoveryPayload, DiscoveredAgentScope},
};

const ADAPTER_ID: &str = "claude-code";
const ADAPTER_PROFILE: &str = "claude-project-index-v1";

#[derive(Debug, Clone)]
pub struct ClaudeCodeAdapter { state_path: PathBuf }

impl ClaudeCodeAdapter {
    pub fn from_environment() -> Self {
        let state_path = env::var_os("HOME").map(PathBuf::from).unwrap_or_default().join(".claude.json");
        Self { state_path }
    }

    #[cfg(test)]
    fn with_state_path(state_path: PathBuf) -> Self { Self { state_path } }

    pub fn discovery_payload(&self) -> AgentScopeDiscoveryPayload {
        match self.discover_scopes_internal() {
            Ok(scopes) => AgentScopeDiscoveryPayload {
                installations: vec![AgentInstallation { adapter_id: ADAPTER_ID.into(), adapter_profile: Some(ADAPTER_PROFILE.into()), status: "ready".into(), capability: "scope-only".into(), cli_version: None, error_kind: None, error_message: None }],
                scopes,
                artifact_summaries: Vec::new(),
            },
            Err(message) => AgentScopeDiscoveryPayload {
                installations: vec![AgentInstallation { adapter_id: ADAPTER_ID.into(), adapter_profile: Some(ADAPTER_PROFILE.into()), status: "unavailable".into(), capability: "scope-only".into(), cli_version: None, error_kind: Some("project_index_unavailable".into()), error_message: Some(message) }],
                scopes: Vec::new(), artifact_summaries: Vec::new(),
            },
        }
    }

    fn discover_scopes_internal(&self) -> Result<Vec<DiscoveredAgentScope>, String> {
        let state = fs::read_to_string(&self.state_path)
            .map_err(|_| "Claude Code project index is unavailable".to_string())?;
        let root: Value = serde_json::from_str(&state)
            .map_err(|_| "Claude Code project index is unreadable".to_string())?;
        let projects = root.get("projects").and_then(Value::as_object)
            .ok_or_else(|| "Claude Code project index has an unsupported schema".to_string())?;
        let modified_at = fs::metadata(&self.state_path).ok()
            .and_then(|metadata| metadata.modified().ok()).unwrap_or(SystemTime::UNIX_EPOCH);
        Ok(scopes_from_cwds(
            ADAPTER_ID,
            ADAPTER_PROFILE,
            projects.keys().cloned().map(|path| (path, modified_at)).collect(),
        ))
    }
}

impl AgentWorkspaceAdapter for ClaudeCodeAdapter {
    fn adapter_id(&self) -> &'static str { ADAPTER_ID }
    fn detect_installations(&self) -> Result<Vec<AgentInstallation>, AppError> { Ok(self.discovery_payload().installations) }
    fn discover_scopes(&self) -> Result<Vec<DiscoveredAgentScope>, AppError> { Ok(self.discovery_payload().scopes) }
    fn discover_artifact_events(&self, scope: &DiscoveredAgentScope) -> Result<Vec<AgentArtifactEvent>, AppError> {
        if scope.adapter_id != ADAPTER_ID { return Err(AppError::InvalidParams); }
        Ok(Vec::new())
    }
}

#[cfg(test)]
mod tests {
    use std::fs;
    use tempfile::tempdir;

    use super::ClaudeCodeAdapter;

    #[test]
    fn discovers_project_from_real_project_index_key() {
        let directory = tempdir().expect("tempdir");
        let project = directory.path().join("project");
        fs::create_dir(&project).expect("project");
        let state_path = directory.path().join("claude.json");
        fs::write(
            &state_path,
            format!("{{\"projects\":{{\"{}\":{{\"allowedTools\":[]}}}}}}", project.display()),
        ).expect("state index");

        let payload = ClaudeCodeAdapter::with_state_path(state_path).discovery_payload();

        assert_eq!(payload.installations[0].status, "ready");
        assert_eq!(payload.scopes.len(), 1);
        assert_eq!(payload.scopes[0].scope_kind, "project");
        assert_eq!(payload.scopes[0].root_path, fs::canonicalize(project).expect("canonical project").to_string_lossy());
    }
}
