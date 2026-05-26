use serde::{Deserialize, Serialize};

use super::skill::SkillBindingSummary;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Library {
    pub id: i64,
    pub name: String,
    pub root_path: String,
    pub source_kind: String,
    pub path_state: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub last_scanned_at: Option<String>,
    pub skill_binding: Option<SkillBindingSummary>,
}
