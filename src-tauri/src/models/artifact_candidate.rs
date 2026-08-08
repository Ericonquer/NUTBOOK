use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub enum DiscoveryReasonKind {
    NbskillRegistered,
    MentionedInFinalResponse,
    ExplicitExportEvent,
    CreatedByAgentTool,
    OpenedFromAgentDelivery,
    InsideUserConfirmedOutput,
    AppearedDuringAgentRun,
    InsideProviderTaskScope,
    InsideProjectRoot,
    SupportedExtensionOnly,
}

impl DiscoveryReasonKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::NbskillRegistered => "nbskill_registered",
            Self::MentionedInFinalResponse => "mentioned_in_final_response",
            Self::ExplicitExportEvent => "explicit_export_event",
            Self::CreatedByAgentTool => "created_by_agent_tool",
            Self::OpenedFromAgentDelivery => "opened_from_agent_delivery",
            Self::InsideUserConfirmedOutput => "inside_user_confirmed_output",
            Self::AppearedDuringAgentRun => "appeared_during_agent_run",
            Self::InsideProviderTaskScope => "inside_provider_task_scope",
            Self::InsideProjectRoot => "inside_project_root",
            Self::SupportedExtensionOnly => "supported_extension_only",
        }
    }

    pub fn from_str(value: &str) -> Option<Self> {
        match value {
            "nbskill_registered" => Some(Self::NbskillRegistered),
            "mentioned_in_final_response" => Some(Self::MentionedInFinalResponse),
            "explicit_export_event" => Some(Self::ExplicitExportEvent),
            "created_by_agent_tool" => Some(Self::CreatedByAgentTool),
            "opened_from_agent_delivery" => Some(Self::OpenedFromAgentDelivery),
            "inside_user_confirmed_output" => Some(Self::InsideUserConfirmedOutput),
            "appeared_during_agent_run" => Some(Self::AppearedDuringAgentRun),
            "inside_provider_task_scope" => Some(Self::InsideProviderTaskScope),
            "inside_project_root" => Some(Self::InsideProjectRoot),
            "supported_extension_only" => Some(Self::SupportedExtensionOnly),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveryEvidence {
    pub fingerprint: String,
    pub agent_kind: String,
    pub reason: DiscoveryReasonKind,
    pub event_id: String,
    pub run_reference_hash: Option<String>,
    pub observed_at: Option<String>,
    pub skill_normalized_name: Option<String>,
    pub skill_display_name: Option<String>,
    pub manifest_entry_id: Option<String>,
    pub edit_contract: Option<String>,
    pub save_policy: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct RelatedArtifactFile {
    pub path: String,
    pub role: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ArtifactCandidate {
    pub id: Option<i64>,
    pub project_library_id: i64,
    pub agent_kind: String,
    pub primary_path: String,
    pub artifact_kind: String,
    pub status: String,
    pub batch_key: String,
    pub reasons: Vec<DiscoveryReasonKind>,
    pub discovery_fingerprint: String,
    pub file_size: u64,
    pub modified_at: Option<String>,
    pub related_files: Vec<RelatedArtifactFile>,
    pub evidence: Vec<DiscoveryEvidence>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ArtifactCandidateGroupSummary {
    pub batch_key: String,
    pub status: String,
    pub count: u32,
    pub representative_paths: Vec<String>,
}
