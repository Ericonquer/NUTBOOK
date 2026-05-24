use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillBindingSummary {
    pub normalized_name: String,
    pub display_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredSkill {
    pub name: String,
    pub normalized_name: String,
    pub manifest_path: String,
    pub skill_root_path: String,
    pub output_path: Option<String>,
    pub output_dir_declared: Option<String>,
    pub source_exists: bool,
    pub is_connected: bool,
    pub status: String,
    pub duplicate_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillDiscoveryPayload {
    pub scanned_skills: usize,
    pub skills: Vec<DiscoveredSkill>,
    pub bindings_backfilled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExcludeSkillRequest {
    pub normalized_name: String,
    pub display_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreExcludedSkillRequest {
    pub normalized_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BindLibrarySkillRequest {
    pub library_id: i64,
    pub normalized_name: String,
    pub display_name: String,
}
