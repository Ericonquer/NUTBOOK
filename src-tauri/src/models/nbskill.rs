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
    pub agent_detected: bool,
    pub cli_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallNbskillAgentsRequest { pub agent_ids: Vec<String> }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NbskillInstallResult { pub agent_id: String, pub status: String, pub detail: Option<String> }
