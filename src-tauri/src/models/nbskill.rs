use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NbskillAgentStatus {
    pub agent_id: String,
    pub display_name: String,
    pub install_path: String,
    pub package_status: String,
    pub runtime_status: String,
    pub installed_version: Option<String>,
    pub expected_version: String,
    pub last_self_test_at: Option<String>,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrepareNbskillInstallPromptRequest {
    pub agent_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NbskillInstallPromptResponse {
    pub agent_id: String,
    pub staging_path: String,
    pub target_path: String,
    pub prompt: String,
    pub copied: bool,
}
