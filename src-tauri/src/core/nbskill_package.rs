use std::{collections::BTreeMap, fs, path::{Path, PathBuf}};

use serde::Deserialize;
use sha2::{Digest, Sha256};

use crate::models::NbskillAgentStatus;

pub const NBSKILL_VERSION: &str = "1.3.1";

#[derive(Debug, Deserialize)]
struct PackageManifest {
    package: String,
    version: String,
    files: Vec<PackageFile>,
}

#[derive(Debug, Deserialize)]
struct PackageFile {
    path: String,
    sha256: String,
    bytes: u64,
}

#[derive(Clone, Copy)]
pub struct AgentInstallContract {
    pub id: &'static str,
    pub display_name: &'static str,
    pub relative_target: &'static str,
}

pub const AGENT_INSTALL_CONTRACTS: &[AgentInstallContract] = &[
    AgentInstallContract { id: "openclaw", display_name: "OpenClaw", relative_target: ".openclaw/skills/nbskill" },
    AgentInstallContract { id: "hermes", display_name: "Hermes", relative_target: ".hermes/skills/nbskill" },
    AgentInstallContract { id: "claude-code", display_name: "Claude Code", relative_target: ".claude/skills/nbskill" },
    AgentInstallContract { id: "codex", display_name: "Codex", relative_target: ".codex/skills/nbskill" },
    AgentInstallContract { id: "workbuddy", display_name: "WorkBuddy", relative_target: ".workbuddy/skills/nbskill" },
];

pub fn agent_contract(agent_id: &str) -> Option<AgentInstallContract> {
    AGENT_INSTALL_CONTRACTS.iter().copied().find(|contract| contract.id == agent_id)
}

pub fn detect_nbskill_agents(home: &Path) -> Vec<NbskillAgentStatus> {
    AGENT_INSTALL_CONTRACTS.iter().map(|contract| {
        let target = home.join(contract.relative_target);
        detect_installed_package(*contract, &target)
    }).collect()
}

fn detect_installed_package(contract: AgentInstallContract, target: &Path) -> NbskillAgentStatus {
    let mut status = NbskillAgentStatus {
        agent_id: contract.id.to_string(),
        display_name: contract.display_name.to_string(),
        install_path: target.to_string_lossy().into_owned(),
        package_status: "missing".to_string(),
        runtime_status: "unverified".to_string(),
        installed_version: None,
        expected_version: NBSKILL_VERSION.to_string(),
        last_self_test_at: None,
        detail: None,
    };
    if !target.exists() {
        return status;
    }
    if fs::symlink_metadata(target).is_ok_and(|metadata| metadata.file_type().is_symlink()) {
        status.package_status = "corrupt".to_string();
        status.detail = Some("install target is a symbolic link".to_string());
        return status;
    }
    let version = match fs::read_to_string(target.join("VERSION")) {
        Ok(version) => version.trim().to_string(),
        Err(error) => {
            status.package_status = if error.kind() == std::io::ErrorKind::PermissionDenied { "unreadable" } else { "corrupt" }.to_string();
            status.detail = Some("installed VERSION is unavailable".to_string());
            return status;
        }
    };
    status.installed_version = Some(version.clone());
    status.package_status = match compare_semver(&version, NBSKILL_VERSION) {
        Some(std::cmp::Ordering::Less) => "outdated",
        Some(std::cmp::Ordering::Equal) => "compatible",
        Some(std::cmp::Ordering::Greater) | None => "corrupt",
    }.to_string();
    if status.package_status == "compatible" {
        if let Err(detail) = verify_package(target) {
            status.package_status = "corrupt".to_string();
            status.detail = Some(detail);
            return status;
        }
        if let Ok(bytes) = fs::read(target.join("SELF-TEST.json")) {
            if let Ok(marker) = serde_json::from_slice::<SelfTestMarker>(&bytes) {
                if marker.package_version == NBSKILL_VERSION {
                    status.runtime_status = "verified".to_string();
                    status.last_self_test_at = Some(marker.validated_at);
                }
            }
        }
    }
    status
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SelfTestMarker {
    package_version: String,
    validated_at: String,
}

pub fn verify_package(root: &Path) -> Result<(), String> {
    let bytes = fs::read(root.join("PACKAGE-MANIFEST.json")).map_err(|_| "PACKAGE-MANIFEST.json is unavailable".to_string())?;
    let manifest: PackageManifest = serde_json::from_slice(&bytes).map_err(|_| "PACKAGE-MANIFEST.json is invalid".to_string())?;
    if manifest.package != "nbskill" || manifest.version != NBSKILL_VERSION {
        return Err("package identity or version mismatch".to_string());
    }
    let mut seen = BTreeMap::new();
    for file in manifest.files {
        if file.path.is_empty() || file.path.split('/').any(|part| part.is_empty() || part == "." || part == "..") || seen.insert(file.path.clone(), ()).is_some() {
            return Err("package file list is unsafe or duplicated".to_string());
        }
        let path = root.join(&file.path);
        let metadata = fs::symlink_metadata(&path).map_err(|_| format!("package file is missing: {}", file.path))?;
        if !metadata.is_file() || metadata.file_type().is_symlink() || metadata.len() != file.bytes {
            return Err(format!("package file identity mismatch: {}", file.path));
        }
        let digest = Sha256::digest(fs::read(&path).map_err(|_| format!("package file is unreadable: {}", file.path))?);
        if format!("{digest:x}") != file.sha256 {
            return Err(format!("package hash mismatch: {}", file.path));
        }
    }
    Ok(())
}

pub fn stage_verified_package(source: &Path, app_data: &Path) -> Result<PathBuf, String> {
    verify_package(source)?;
    let source_identity = fs::read(source.join("PACKAGE-MANIFEST.json"))
        .map_err(|_| "cannot read nbskill package identity".to_string())?;
    let parent = app_data.join("nbskill-staging");
    fs::create_dir_all(&parent).map_err(|_| "cannot create nbskill staging directory".to_string())?;
    let destination = parent.join(NBSKILL_VERSION);
    if destination.exists() && verify_package(&destination).is_ok() {
        let staged_identity = fs::read(destination.join("PACKAGE-MANIFEST.json"))
            .map_err(|_| "cannot read staged nbskill package identity".to_string())?;
        if staged_identity == source_identity {
            return Ok(destination);
        }
    }
    let temporary = parent.join(format!(".{}-{}", NBSKILL_VERSION, std::process::id()));
    if temporary.exists() {
        fs::remove_dir_all(&temporary).map_err(|_| "cannot reset temporary staging directory".to_string())?;
    }
    copy_package_directory(source, &temporary)?;
    verify_package(&temporary)?;
    if destination.exists() {
        fs::remove_dir_all(&destination).map_err(|_| "cannot replace invalid staged package".to_string())?;
    }
    fs::rename(&temporary, &destination).map_err(|_| "cannot publish staged package".to_string())?;
    Ok(destination)
}

fn copy_package_directory(source: &Path, destination: &Path) -> Result<(), String> {
    fs::create_dir(destination).map_err(|_| "cannot create package staging directory".to_string())?;
    for entry in fs::read_dir(source).map_err(|_| "cannot read package source".to_string())? {
        let entry = entry.map_err(|_| "cannot read package entry".to_string())?;
        let metadata = entry.file_type().map_err(|_| "cannot inspect package entry".to_string())?;
        let target = destination.join(entry.file_name());
        if metadata.is_symlink() {
            return Err("package source contains a symbolic link".to_string());
        }
        if metadata.is_dir() {
            copy_package_directory(&entry.path(), &target)?;
        } else if metadata.is_file() {
            fs::copy(entry.path(), target).map_err(|_| "cannot copy package file".to_string())?;
        }
    }
    Ok(())
}

fn compare_semver(left: &str, right: &str) -> Option<std::cmp::Ordering> {
    fn parse(value: &str) -> Option<[u64; 3]> {
        let values = value.split('.').map(str::parse::<u64>).collect::<Result<Vec<_>, _>>().ok()?;
        (values.len() == 3).then(|| [values[0], values[1], values[2]])
    }
    Some(parse(left)?.cmp(&parse(right)?))
}

#[cfg(test)]
mod tests {
    use std::fs;
    use sha2::{Digest, Sha256};
    use tempfile::tempdir;
    use super::{detect_nbskill_agents, stage_verified_package, verify_package};

    fn package_source() -> std::path::PathBuf {
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../integrations/nbskill")
    }

    #[test]
    fn nbskill_checked_in_package_hashes_are_valid() {
        verify_package(&package_source()).expect("verified package");
    }

    #[test]
    fn nbskill_staging_and_status_keep_runtime_unverified_without_marker() {
        let directory = tempdir().expect("temporary directory");
        let staged = stage_verified_package(&package_source(), directory.path()).expect("staged package");
        let target = directory.path().join(".codex/skills/nbskill");
        fs::create_dir_all(target.parent().expect("target parent")).expect("parent");
        fs::rename(staged, &target).expect("installed fixture");
        let status = detect_nbskill_agents(directory.path()).into_iter().find(|status| status.agent_id == "codex").expect("Codex status");
        assert_eq!(status.package_status, "compatible");
        assert_eq!(status.runtime_status, "unverified");
    }

    #[test]
    fn nbskill_status_marks_previous_contract_version_outdated() {
        let directory = tempdir().expect("temporary directory");
        let target = directory.path().join(".workbuddy/skills/nbskill");
        fs::create_dir_all(&target).expect("target");
        fs::write(target.join("VERSION"), "1.1.0\n").expect("previous version");
        let status = detect_nbskill_agents(directory.path()).into_iter()
            .find(|status| status.agent_id == "workbuddy")
            .expect("WorkBuddy status");
        assert_eq!(status.installed_version.as_deref(), Some("1.1.0"));
        assert_eq!(status.expected_version, "1.3.1");
        assert_eq!(status.package_status, "outdated");
    }

    #[test]
    fn nbskill_staging_replaces_a_valid_same_version_package_with_different_identity() {
        let directory = tempdir().expect("temporary directory");
        let staged = stage_verified_package(&package_source(), directory.path()).expect("staged package");
        let reference_path = staged.join("references/agent-install-contracts.md");
        let mut reference = fs::read(&reference_path).expect("reference");
        reference.extend_from_slice(b"\n");
        fs::write(&reference_path, &reference).expect("changed reference");

        let manifest_path = staged.join("PACKAGE-MANIFEST.json");
        let mut manifest: serde_json::Value = serde_json::from_slice(&fs::read(&manifest_path).expect("manifest")).expect("manifest json");
        let entry = manifest["files"].as_array_mut().expect("files").iter_mut()
            .find(|entry| entry["path"] == "references/agent-install-contracts.md")
            .expect("reference entry");
        entry["sha256"] = serde_json::Value::String(format!("{:x}", Sha256::digest(&reference)));
        entry["bytes"] = serde_json::Value::Number(reference.len().into());
        fs::write(&manifest_path, format!("{}\n", serde_json::to_string_pretty(&manifest).expect("manifest serialization"))).expect("updated manifest");
        verify_package(&staged).expect("alternate package remains valid");

        let restaged = stage_verified_package(&package_source(), directory.path()).expect("restaged package");
        assert_eq!(
            fs::read(restaged.join("PACKAGE-MANIFEST.json")).expect("restaged identity"),
            fs::read(package_source().join("PACKAGE-MANIFEST.json")).expect("source identity")
        );
    }
}
