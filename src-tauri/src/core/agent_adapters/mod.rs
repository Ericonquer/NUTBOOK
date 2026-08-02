pub mod codex;
pub mod workbuddy;

use crate::{
    errors::AppError,
    models::{AgentArtifactEvent, AgentInstallation, DiscoveredAgentScope},
};

pub trait AgentWorkspaceAdapter {
    fn adapter_id(&self) -> &'static str;
    fn detect_installations(&self) -> Result<Vec<AgentInstallation>, AppError>;
    fn discover_scopes(&self) -> Result<Vec<DiscoveredAgentScope>, AppError>;
    fn discover_artifact_events(
        &self,
        scope: &DiscoveredAgentScope,
    ) -> Result<Vec<AgentArtifactEvent>, AppError>;
}
