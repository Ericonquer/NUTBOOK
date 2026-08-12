use std::{collections::BTreeSet, fs, path::{Component, Path}};

use chrono::DateTime;
use serde::Deserialize;

use crate::{
    core::artifact_discovery::ManifestArtifactFact,
    models::RelatedArtifactFile,
};

pub const MANIFEST_RELATIVE_PATH: &str = ".agent-outputs/manifest.json";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ValidatedAgentOutputManifest {
    pub schema_version: u32,
    pub entries: Vec<ManifestArtifactFact>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ManifestReadError {
    Unreadable,
    InvalidJson,
    InvalidContract(String),
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RawManifest {
    schema_version: u32,
    project_root: String,
    entries: Vec<RawEntry>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RawEntry {
    id: String,
    path: String,
    state: String,
    skill: RawSkill,
    kind: String,
    title: Option<String>,
    generated_at: Option<String>,
    related_files: Option<Vec<RawRelatedFile>>,
    edit_contract: Option<String>,
    save_policy: Option<String>,
    superseded_by: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct RawSkill {
    name: String,
    version: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct RawRelatedFile {
    path: String,
    role: String,
}

pub fn read_agent_output_manifest(
    project_root: &Path,
) -> Result<Option<ValidatedAgentOutputManifest>, ManifestReadError> {
    let project_root = fs::canonicalize(project_root).map_err(|_| ManifestReadError::Unreadable)?;
    let path = project_root.join(MANIFEST_RELATIVE_PATH);
    if !path.exists() {
        return Ok(None);
    }
    let bytes = fs::read(path).map_err(|_| ManifestReadError::Unreadable)?;
    let raw: RawManifest = serde_json::from_slice(&bytes).map_err(|_| ManifestReadError::InvalidJson)?;
    validate_raw_manifest(&project_root, raw).map(Some)
}

fn validate_raw_manifest(
    project_root: &Path,
    raw: RawManifest,
) -> Result<ValidatedAgentOutputManifest, ManifestReadError> {
    contract(raw.schema_version == 1, "schemaVersion must be 1")?;
    contract(raw.project_root == ".", "projectRoot must be .")?;
    let mut ids = BTreeSet::new();
    let mut active_paths = BTreeSet::new();
    for entry in &raw.entries {
        contract(valid_id(&entry.id), "entry id is invalid")?;
        contract(ids.insert(entry.id.clone()), "entry ids must be unique")?;
        validate_relative_path(&entry.path)?;
        contract(matches!(entry.state.as_str(), "active" | "superseded" | "removed"), "entry state is invalid")?;
        contract(matches!(entry.kind.as_str(), "document" | "report" | "presentation" | "interactive"), "entry kind is invalid")?;
        contract(valid_skill_name(&entry.skill.name), "skill name is invalid")?;
        if let Some(version) = &entry.skill.version {
            contract(!version.is_empty() && version.len() <= 64, "skill version is invalid")?;
        }
        if let Some(title) = &entry.title {
            contract(!title.is_empty() && title.chars().count() <= 200, "title is invalid")?;
        }
        if let Some(generated_at) = &entry.generated_at {
            contract(DateTime::parse_from_rfc3339(generated_at).is_ok(), "generatedAt is invalid")?;
        }
        let extension = Path::new(&entry.path).extension().and_then(|value| value.to_str()).map(str::to_ascii_lowercase);
        contract(matches!(extension.as_deref(), Some("md" | "markdown" | "html" | "htm")), "primary path is not Markdown or HTML")?;
        let is_html = matches!(extension.as_deref(), Some("html" | "htm"));
        if entry.state == "active" {
            contract(active_paths.insert(entry.path.clone()), "active paths must be unique")?;
            validate_existing_file(project_root, &entry.path)?;
        } else if project_root.join(&entry.path).exists() {
            validate_existing_file(project_root, &entry.path)?;
        }
        if let Some(edit_contract) = &entry.edit_contract {
            contract(edit_contract == "nutbook-html/v1", "editContract is invalid")?;
            contract(is_html, "editContract requires HTML")?;
        }
        if let Some(save_policy) = &entry.save_policy {
            contract(matches!(save_policy.as_str(), "copy" | "managed-source"), "savePolicy is invalid")?;
            if save_policy == "managed-source" {
                contract(entry.edit_contract.as_deref() == Some("nutbook-html/v1"), "managed-source requires nutbook-html/v1")?;
            }
        }
        contract(is_html || entry.save_policy.is_none(), "savePolicy requires HTML")?;
        if entry.state == "active" && is_html {
            contract(
                entry.edit_contract.as_deref() == Some("nutbook-html/v1")
                    && entry.save_policy.as_deref() == Some("managed-source"),
                "active HTML requires nutbook-html/v1 managed-source editing",
            )?;
        }
        if entry.state == "superseded" {
            contract(entry.superseded_by.as_ref().is_some_and(|target| valid_id(target) && target != &entry.id), "supersededBy is invalid")?;
        } else {
            contract(entry.superseded_by.is_none(), "supersededBy is only valid for superseded entries")?;
        }
        let mut related_paths = BTreeSet::new();
        for related in entry.related_files.as_deref().unwrap_or_default() {
            validate_relative_path(&related.path)?;
            contract(matches!(related.role.as_str(), "asset" | "data" | "attachment"), "related file role is invalid")?;
            contract(related.path != entry.path && related_paths.insert(related.path.clone()), "related paths must be unique")?;
            validate_existing_file(project_root, &related.path)?;
        }
    }
    for entry in &raw.entries {
        if let Some(target) = &entry.superseded_by {
            contract(ids.contains(target), "superseded target does not exist")?;
        }
    }
    Ok(ValidatedAgentOutputManifest {
        schema_version: raw.schema_version,
        entries: raw.entries.into_iter().map(|entry| ManifestArtifactFact {
            id: entry.id,
            path: entry.path,
            state: entry.state,
            kind: entry.kind,
            generated_at: entry.generated_at,
            skill_name: entry.skill.name,
            skill_version: entry.skill.version,
            edit_contract: entry.edit_contract,
            save_policy: entry.save_policy,
            related_files: entry.related_files.unwrap_or_default().into_iter().map(|file| RelatedArtifactFile { path: file.path, role: file.role }).collect(),
        }).collect(),
    })
}

fn validate_relative_path(value: &str) -> Result<(), ManifestReadError> {
    contract(!value.is_empty() && value.len() <= 4096 && !value.contains('\0') && !value.contains('\\'), "path syntax is invalid")?;
    contract(Path::new(value).components().all(|component| matches!(component, Component::Normal(_))), "path must be relative without traversal")
}

fn validate_existing_file(project_root: &Path, relative: &str) -> Result<(), ManifestReadError> {
    let canonical = fs::canonicalize(project_root.join(relative)).map_err(|_| ManifestReadError::InvalidContract("referenced file is missing".into()))?;
    contract(canonical.starts_with(project_root) && canonical.is_file(), "referenced path escapes the project root or is not a file")
}

fn valid_id(value: &str) -> bool {
    !value.is_empty() && value.len() <= 128 && value.as_bytes()[0].is_ascii_alphanumeric() && value.bytes().all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'-'))
}

fn valid_skill_name(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value.as_bytes().first().is_some_and(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit())
        && value.bytes().all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || matches!(byte, b'.' | b'_' | b'-'))
}

fn contract(condition: bool, message: &str) -> Result<(), ManifestReadError> {
    if condition { Ok(()) } else { Err(ManifestReadError::InvalidContract(message.to_string())) }
}

#[cfg(test)]
mod tests {
    use std::{fs, path::PathBuf};

    use super::{read_agent_output_manifest, validate_raw_manifest, RawManifest};

    fn fixture_root() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/agent-artifact-discovery/projects/sample-agent-project")
    }

    #[test]
    fn agent_output_manifest_accepts_checked_in_contract_fixture() {
        let manifest = read_agent_output_manifest(&fixture_root())
            .expect("valid manifest")
            .expect("manifest exists");
        assert_eq!(manifest.schema_version, 1);
        assert_eq!(manifest.entries.len(), 3);
        assert!(manifest.entries.iter().any(|entry| entry.id == "editable-report-v1"));
    }

    #[test]
    fn agent_output_manifest_rejects_every_invalid_contract_vector() {
        let directory = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/agent-artifact-discovery/contract-vectors/invalid");
        for entry in fs::read_dir(directory).expect("invalid vectors") {
            let path = entry.expect("vector entry").path();
            let raw: RawManifest = serde_json::from_slice(&fs::read(&path).expect("vector bytes"))
                .expect("structurally parseable invalid vector");
            assert!(validate_raw_manifest(&fixture_root(), raw).is_err(), "{} must fail", path.display());
        }
    }
}
