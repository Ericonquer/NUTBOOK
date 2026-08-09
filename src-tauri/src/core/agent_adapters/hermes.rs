use std::{env, path::PathBuf, time::{Duration, SystemTime, UNIX_EPOCH}};

use rusqlite::{Connection, OpenFlags};
use crate::{
    core::agent_adapters::{cwd_scopes::scopes_from_cwds, AgentWorkspaceAdapter},
    errors::AppError,
    models::{AgentArtifactEvent, AgentInstallation, AgentScopeDiscoveryPayload, DiscoveredAgentScope},
};

const ADAPTER_ID: &str = "hermes";
const ADAPTER_PROFILE: &str = "hermes-state-sqlite-v1";

#[derive(Debug, Clone)]
pub struct HermesAdapter { state_path: PathBuf }
impl HermesAdapter {
    pub fn from_environment() -> Self { Self { state_path: env::var_os("HOME").map(PathBuf::from).unwrap_or_default().join(".hermes/state.db") } }
    #[cfg(test)]
    fn with_state_path(state_path: PathBuf) -> Self { Self { state_path } }
    pub fn discovery_payload(&self) -> AgentScopeDiscoveryPayload {
        match self.discover_scopes_internal() {
            Ok(scopes) => AgentScopeDiscoveryPayload { installations: vec![installation("ready", None)], scopes, artifact_summaries: Vec::new() },
            Err(message) => AgentScopeDiscoveryPayload { installations: vec![installation("unavailable", Some(message))], scopes: Vec::new(), artifact_summaries: Vec::new() },
        }
    }
    fn discover_scopes_internal(&self) -> Result<Vec<DiscoveredAgentScope>, String> {
        if !self.state_path.is_file() { return Err("Hermes state database is unavailable".into()); }
        let connection = Connection::open_with_flags(&self.state_path, OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX).map_err(|_| "Hermes state database is unreadable".to_string())?;
        let mut statement = connection.prepare("SELECT cwd, COALESCE(ended_at, started_at) FROM sessions WHERE cwd IS NOT NULL AND cwd <> ''").map_err(|_| "Hermes session schema is unsupported".to_string())?;
        let records = statement.query_map([], |row| {
            let cwd: String = row.get(0)?; let activity: f64 = row.get(1)?;
            let modified_at = UNIX_EPOCH.checked_add(Duration::from_secs_f64(activity.max(0.0))).unwrap_or(SystemTime::UNIX_EPOCH);
            Ok((cwd, modified_at))
        }).map_err(|_| "Hermes session records are unreadable".to_string())?
          .collect::<Result<Vec<_>, _>>().map_err(|_| "Hermes session records are unreadable".to_string())?;
        Ok(scopes_from_cwds(ADAPTER_ID, ADAPTER_PROFILE, records))
    }
}
fn installation(status: &str, error_message: Option<String>) -> AgentInstallation { AgentInstallation { adapter_id: ADAPTER_ID.into(), adapter_profile: Some(ADAPTER_PROFILE.into()), status: status.into(), capability: "scope-only".into(), cli_version: None, error_kind: error_message.as_ref().map(|_| "state_database_unavailable".into()), error_message } }
impl AgentWorkspaceAdapter for HermesAdapter {
    fn adapter_id(&self) -> &'static str { ADAPTER_ID }
    fn detect_installations(&self) -> Result<Vec<AgentInstallation>, AppError> { Ok(self.discovery_payload().installations) }
    fn discover_scopes(&self) -> Result<Vec<DiscoveredAgentScope>, AppError> { Ok(self.discovery_payload().scopes) }
    fn discover_artifact_events(&self, scope: &DiscoveredAgentScope) -> Result<Vec<AgentArtifactEvent>, AppError> { if scope.adapter_id != ADAPTER_ID { return Err(AppError::InvalidParams); } Ok(Vec::new()) }
}

#[cfg(test)]
mod tests {
    use std::fs;
    use rusqlite::Connection;
    use tempfile::tempdir;

    use super::HermesAdapter;

    #[test]
    fn discovers_project_from_real_session_cwd_column() {
        let directory = tempdir().expect("tempdir");
        let project = directory.path().join("project");
        fs::create_dir(&project).expect("project");
        let project_path = project.to_string_lossy().into_owned();
        let database = directory.path().join("state.db");
        let connection = Connection::open(&database).expect("database");
        connection.execute_batch(
            "CREATE TABLE sessions (cwd TEXT, started_at REAL NOT NULL, ended_at REAL);",
        ).expect("schema");
        connection.execute(
            "INSERT INTO sessions (cwd, started_at, ended_at) VALUES (?1, ?2, ?3)",
            (&project_path, 1_786_178_716.0_f64, 1_786_178_800.0_f64),
        ).expect("session");
        connection.execute(
            "INSERT INTO sessions (cwd, started_at, ended_at) VALUES (?1, ?2, ?3)",
            (&project_path, 1_786_178_900.0_f64, 1_786_179_000.0_f64),
        ).expect("second session");

        let payload = HermesAdapter::with_state_path(database).discovery_payload();

        assert_eq!(payload.installations[0].status, "ready");
        assert_eq!(payload.scopes.len(), 1);
        assert_eq!(payload.scopes[0].scope_kind, "project");
        assert_eq!(payload.scopes[0].root_path, fs::canonicalize(project).expect("canonical project").to_string_lossy());
        assert_eq!(payload.scopes[0].source_record_count, 2);
    }
}
