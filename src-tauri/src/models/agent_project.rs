use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AgentInstallation {
    pub adapter_id: String,
    pub adapter_profile: Option<String>,
    pub status: String,
    pub capability: String,
    pub cli_version: Option<String>,
    pub error_kind: Option<String>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredAgentScope {
    pub adapter_id: String,
    pub adapter_profile: String,
    pub external_scope_id: String,
    pub scope_kind: String,
    pub root_path: String,
    pub display_name: String,
    pub last_activity_at: String,
    pub capability: String,
    pub source_record_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AgentScopeDiscoveryPayload {
    pub installations: Vec<AgentInstallation>,
    pub scopes: Vec<DiscoveredAgentScope>,
    pub artifact_summaries: Vec<DiscoveredScopeArtifactSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredScopeArtifactSummary {
    pub adapter_id: String,
    pub external_scope_id: String,
    pub suggested_count: u32,
    pub pending_count: u32,
    pub excluded_count: u32,
    #[serde(default)]
    pub ignored_count: u32,
    pub already_indexed_paths: Vec<String>,
    pub scan_status: String,
    pub scan_issue: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AgentArtifactEvent {
    pub event_id: String,
    pub project_root: String,
    pub path: String,
    pub kind: String,
    pub observed_at: String,
    pub run_reference: String,
    pub evidence_source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectAgentProjectRequest {
    pub adapter_id: String,
    pub adapter_profile: Option<String>,
    pub external_scope_id: String,
    pub scope_kind: String,
    pub capability: String,
    pub root_path: String,
    pub display_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AgentProjectAdapterBinding {
    pub adapter_id: String,
    pub external_scope_id: String,
    pub adapter_profile: Option<String>,
    pub capability: String,
    pub snapshot_status: String,
    pub last_attempted_at: Option<String>,
    pub last_successful_at: Option<String>,
    pub last_error_kind: Option<String>,
    pub last_error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentProjectSourceSummary {
    pub library_id: i64,
    pub root_path: String,
    pub display_name: String,
    pub scope_kind: String,
    pub discovery_mode: String,
    pub manifest_path: Option<String>,
    pub last_manifest_ok_at: Option<String>,
    pub auto_import_mode: String,
    pub last_scan_status: String,
    pub last_scan_issue: Option<String>,
    pub adapters: Vec<AgentProjectAdapterBinding>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewAgentProjectArtifactsRequest {
    pub project_library_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewAgentProjectArtifactsByRootRequest {
    pub root_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentArtifactPreviewPayload {
    pub project: AgentProjectSourceSummary,
    pub groups: Vec<super::ArtifactCandidateGroupSummary>,
    pub review_candidates: Vec<super::ArtifactCandidate>,
    pub indexed_artifacts: Vec<super::ArtifactCandidate>,
    pub suggested_count: u32,
    pub pending_count: u32,
    pub excluded_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AcceptAgentArtifactGroupsRequest {
    pub project_library_id: i64,
    pub batch_keys: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AcceptAgentArtifactRequest {
    pub project_library_id: i64,
    pub candidate_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AcceptAgentArtifactsRequest {
    pub project_library_id: i64,
    pub candidate_ids: Vec<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IgnoreAgentArtifactRequest {
    pub project_library_id: i64,
    pub candidate_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IgnoreAgentArtifactsRequest {
    pub project_library_id: i64,
    pub candidate_ids: Vec<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetAgentProjectDiscoveryRuleRequest {
    pub project_library_id: i64,
    pub auto_import_mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefreshAgentProjectRequest {
    pub project_library_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeAgentTaskScopeRequest {
    pub task_library_id: i64,
    pub project_library_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AgentArtifactActionItem {
    pub candidate_id: i64,
    pub path: String,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AgentArtifactAcceptanceResult {
    pub accepted: Vec<AgentArtifactActionItem>,
    pub skipped: Vec<AgentArtifactActionItem>,
    pub failed: Vec<AgentArtifactActionItem>,
}
