use std::{collections::BTreeMap, fs, path::{Path, PathBuf}};

use serde::Deserialize;
use sha2::{Digest, Sha256};

use crate::models::NbskillAgentStatus;

pub const NBSKILL_VERSION: &str = "1.3.5";

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

pub fn detect_nbskill_agents(home: &Path, app_data: &Path) -> Vec<NbskillAgentStatus> {
    AGENT_INSTALL_CONTRACTS.iter().map(|contract| {
        let target = home.join(contract.relative_target);
        detect_installed_package(*contract, &target, cli_status(app_data))
    }).collect()
}

fn detect_installed_package(contract: AgentInstallContract, target: &Path, cli_status: &str) -> NbskillAgentStatus {
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
        agent_detected: detected_agent_evidence(contract.id, target.parent().and_then(Path::parent).and_then(Path::parent).unwrap_or(target)),
        cli_status: cli_status.to_string(),
    };
    if reject_symlink_components(target).is_err() {
        status.package_status = "corrupt".to_string();
        status.detail = Some("install path contains a symbolic link".to_string());
        return status;
    }
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
        Some(std::cmp::Ordering::Greater) => "newer_unverified",
        None => "corrupt",
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

pub fn cli_status(app_data: &Path) -> &'static str {
    let path = app_data.join("cli").join(if cfg!(target_os = "windows") { "nutbook.exe" } else { "nutbook" });
    let Ok(metadata) = fs::symlink_metadata(&path) else { return "missing"; };
    if !metadata.is_file() || metadata.file_type().is_symlink() { return "corrupt"; }
    let Ok(output) = std::process::Command::new(&path).arg("--version").output() else { return "corrupt"; };
    if !output.status.success() { return "corrupt"; }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let Some(installed) = stdout.trim().strip_prefix("nutbook ").and_then(crate::core::cli::compare_cli_semver) else { return "corrupt"; };
    let Some(expected) = crate::core::cli::compare_cli_semver(env!("CARGO_PKG_VERSION")) else { return "corrupt"; };
    match installed.cmp(&expected) {
        std::cmp::Ordering::Equal => "compatible",
        std::cmp::Ordering::Less => "outdated",
        std::cmp::Ordering::Greater => "newer_unverified",
    }
}

fn detected_agent_evidence(agent_id: &str, home: &Path) -> bool {
    match agent_id {
        "codex" => home.join(".codex/sessions").is_dir(),
        "claude-code" => home.join(".claude.json").is_file(),
        "openclaw" => home.join(".openclaw/workspace").is_dir(),
        "hermes" => home.join(".hermes/sessions").is_dir() || home.join(".hermes/history").is_dir(),
        "workbuddy" => home.join(".workbuddy/workbuddy.db").is_file(),
        _ => false,
    }
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

pub fn install_verified_package(source: &Path, target: &Path, backup_root: &Path) -> Result<&'static str, String> {
    verify_package(source)?;
    reject_symlink_components(target)?;
    reject_symlink_components(backup_root)?;
    if target.exists() {
        let metadata = fs::symlink_metadata(target).map_err(|_| "cannot inspect install target".to_string())?;
        if metadata.file_type().is_symlink() { return Err("refusing symbolic-link target".to_string()); }
        let installed = owned_nbskill_version(target)?;
        match compare_semver(&installed, NBSKILL_VERSION) {
            Some(std::cmp::Ordering::Greater) => return Ok("newer_unverified"),
            Some(std::cmp::Ordering::Equal) if verify_package(target).is_ok() => {
                write_self_test(target)?;
                return Ok("already_verified");
            }
            _ => {}
        }
    }
    let parent = target.parent().ok_or_else(|| "invalid install target".to_string())?;
    fs::create_dir_all(parent).map_err(|_| "cannot create Agent skill directory".to_string())?;
    let temporary = parent.join(format!(".nbskill-install-{}", uuid::Uuid::new_v4()));
    copy_package_directory(source, &temporary)?;
    verify_package(&temporary)?;
    write_self_test(&temporary)?;
    let backup = backup_root.join(format!("nbskill-{}", uuid::Uuid::new_v4()));
    let had_target = target.exists();
    if had_target {
        prepare_backup_root(backup_root)?;
        fs::rename(target, &backup).map_err(|_| "cannot backup previous package".to_string())?;
    }
    if let Err(error) = fs::rename(&temporary, target) {
        if had_target { let _ = fs::rename(&backup, target); }
        let _ = fs::remove_dir_all(&temporary);
        return Err(format!("cannot publish package: {error}"));
    }
    Ok("installed")
}

pub fn remove_verified_package(target: &Path, backup_root: &Path) -> Result<&'static str, String> {
    reject_symlink_components(target)?;
    reject_symlink_components(backup_root)?;
    if !target.exists() { return Ok("already_removed"); }
    let metadata = fs::symlink_metadata(target).map_err(|_| "cannot inspect install target".to_string())?;
    if metadata.file_type().is_symlink() { return Err("refusing symbolic-link target".to_string()); }
    let _ = owned_nbskill_version(target)?;
    if verify_package(target).is_ok() { fs::remove_dir_all(target).map_err(|_| "cannot remove verified package".to_string())?; return Ok("removed"); }
    prepare_backup_root(backup_root)?;
    let backup = backup_root.join(format!("modified-nbskill-{}", uuid::Uuid::new_v4()));
    fs::rename(target, &backup).map_err(|_| "cannot preserve modified package".to_string())?;
    Ok("moved_to_backup")
}

fn owned_nbskill_version(target: &Path) -> Result<String, String> {
    let manifest: PackageManifest = serde_json::from_slice(&fs::read(target.join("PACKAGE-MANIFEST.json")).map_err(|_| "existing target has no Nutbook package identity".to_string())?)
        .map_err(|_| "existing target has invalid Nutbook package identity".to_string())?;
    if manifest.package != "nbskill" || manifest.version.is_empty() || manifest.files.is_empty() || manifest.files.iter().any(|file| file.path.is_empty() || file.path.split('/').any(|part| matches!(part, "" | "." | ".."))) {
        return Err("existing target is not a Nutbook-owned package".to_string());
    }
    // The manifest is the ownership identity. VERSION is intentionally not
    // part of this proof: a missing or altered VERSION is a known damaged
    // nbskill package that must be backed up, never mistaken for a stranger.
    Ok(manifest.version)
}

fn write_self_test(target: &Path) -> Result<(), String> {
    fs::write(target.join("SELF-TEST.json"), format!("{{\"packageVersion\":\"{NBSKILL_VERSION}\",\"validatedAt\":\"{}\"}}\n", chrono::Utc::now().to_rfc3339()))
        .map_err(|_| "cannot write package self-test marker".to_string())
}

fn prepare_backup_root(root: &Path) -> Result<(), String> {
    fs::create_dir_all(root).map_err(|_| "cannot create integration backup directory".to_string())?;
    let root_metadata = fs::symlink_metadata(root).map_err(|_| "cannot inspect integration backup directory".to_string())?;
    if root_metadata.file_type().is_symlink() || !root_metadata.is_dir() {
        return Err("integration backup path is not a regular directory".to_string());
    }
    for entry in fs::read_dir(root).map_err(|_| "cannot inspect integration backups".to_string())? {
        let entry = entry.map_err(|_| "cannot inspect integration backup".to_string())?;
        let metadata = fs::symlink_metadata(entry.path()).map_err(|_| "cannot inspect integration backup".to_string())?;
        if metadata.is_dir() && !metadata.file_type().is_symlink() {
            fs::remove_dir_all(entry.path()).map_err(|_| "cannot prune integration backup".to_string())?;
        } else {
            fs::remove_file(entry.path()).map_err(|_| "cannot prune integration backup".to_string())?;
        }
    }
    Ok(())
}

fn reject_symlink_components(path: &Path) -> Result<(), String> {
    let mut current = PathBuf::new();
    for component in path.components() {
        current.push(component.as_os_str());
        if matches!(component, std::path::Component::Prefix(_) | std::path::Component::RootDir) || current.as_os_str().is_empty() {
            continue;
        }
        match fs::symlink_metadata(&current) {
            Ok(metadata) if metadata.file_type().is_symlink() => return Err("refusing symbolic-link path component".to_string()),
            Ok(_) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => break,
            Err(_) => return Err("cannot inspect integration path".to_string()),
        }
    }
    Ok(())
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
    use tempfile::{Builder, TempDir};
    use super::{detect_nbskill_agents, install_verified_package, remove_verified_package, stage_verified_package, verify_package, NBSKILL_VERSION};

    fn tempdir() -> std::io::Result<TempDir> {
        let canonical_temp = fs::canonicalize(std::env::temp_dir())?;
        Builder::new().prefix("nutbook-nbskill-").tempdir_in(canonical_temp)
    }

    fn package_source() -> std::path::PathBuf {
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../integrations/nbskill")
    }

    fn rewrite_owned_version(target: &std::path::Path, version: &str) {
        fs::write(target.join("VERSION"), format!("{version}\n")).expect("rewrite version");
        let manifest_path = target.join("PACKAGE-MANIFEST.json");
        let mut manifest: serde_json::Value = serde_json::from_slice(&fs::read(&manifest_path).expect("manifest")).expect("manifest JSON");
        manifest["version"] = serde_json::Value::String(version.to_string());
        let bytes = fs::read(target.join("VERSION")).expect("version bytes");
        let entry = manifest["files"].as_array_mut().expect("files").iter_mut()
            .find(|entry| entry["path"] == "VERSION").expect("VERSION entry");
        entry["sha256"] = serde_json::Value::String(format!("{:x}", Sha256::digest(&bytes)));
        entry["bytes"] = serde_json::Value::Number(bytes.len().into());
        fs::write(manifest_path, format!("{}\n", serde_json::to_string_pretty(&manifest).expect("serialize manifest"))).expect("save manifest");
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
        let status = detect_nbskill_agents(directory.path(), directory.path()).into_iter().find(|status| status.agent_id == "codex").expect("Codex status");
        assert_eq!(status.package_status, "compatible");
        assert_eq!(status.runtime_status, "unverified");
    }

    #[test]
    fn nbskill_status_marks_previous_contract_version_outdated() {
        let directory = tempdir().expect("temporary directory");
        let target = directory.path().join(".workbuddy/skills/nbskill");
        fs::create_dir_all(&target).expect("target");
        fs::write(target.join("VERSION"), "1.1.0\n").expect("previous version");
        let status = detect_nbskill_agents(directory.path(), directory.path()).into_iter()
            .find(|status| status.agent_id == "workbuddy")
            .expect("WorkBuddy status");
        assert_eq!(status.installed_version.as_deref(), Some("1.1.0"));
        assert_eq!(status.expected_version, NBSKILL_VERSION);
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

    #[test]
    fn rust_installer_copies_verifies_and_preserves_modified_package() {
        let directory = tempdir().expect("temporary directory");
        let target = directory.path().join("agent/skills/nbskill");
        let backups = directory.path().join("backups");
        assert_eq!(install_verified_package(&package_source(), &target, &backups).expect("install"), "installed");
        verify_package(&target).expect("installed package");
        assert_eq!(install_verified_package(&package_source(), &target, &backups).expect("already verified"), "already_verified");
        fs::write(target.join("SKILL.md"), "modified ordinary file\n").expect("modify target");
        assert_eq!(remove_verified_package(&target, &backups).expect("preserve modified"), "moved_to_backup");
        assert!(!target.exists());
        assert_eq!(fs::read_dir(&backups).expect("backup directory").count(), 1);
    }

    #[test]
    fn known_old_package_is_backed_up_and_upgraded() {
        let directory = tempdir().expect("temporary directory");
        let target = directory.path().join("agent/skills/nbskill");
        let backups = directory.path().join("backups");
        install_verified_package(&package_source(), &target, &backups).expect("install current");
        rewrite_owned_version(&target, "1.2.3");
        fs::create_dir_all(backups.join("older-backup")).expect("older backup");
        fs::write(backups.join("older-backup/marker"), "old").expect("older backup marker");
        assert_eq!(install_verified_package(&package_source(), &target, &backups).expect("upgrade known old"), "installed");
        verify_package(&target).expect("current package restored");
        assert_eq!(fs::read_dir(&backups).expect("backup directory").count(), 1);
    }

    #[test]
    fn known_package_with_damaged_version_is_backed_up_on_remove() {
        let directory = tempdir().expect("temporary directory");
        let target = directory.path().join("agent/skills/nbskill");
        let backups = directory.path().join("backups");
        install_verified_package(&package_source(), &target, &backups).expect("install current");
        fs::write(target.join("VERSION"), "not-a-version\n").expect("damage VERSION");
        assert_eq!(remove_verified_package(&target, &backups).expect("backup known damaged package"), "moved_to_backup");
        assert!(!target.exists());
        assert_eq!(fs::read_dir(&backups).expect("backup directory").count(), 1);
    }

    #[test]
    fn unknown_target_is_never_replaced_or_moved() {
        let directory = tempdir().expect("temporary directory");
        let target = directory.path().join("agent/skills/nbskill");
        let backups = directory.path().join("backups");
        fs::create_dir_all(&target).expect("unknown target");
        fs::write(target.join("notes.txt"), "do not touch").expect("unknown contents");
        assert!(install_verified_package(&package_source(), &target, &backups).is_err());
        assert!(target.join("notes.txt").exists());
        assert!(remove_verified_package(&target, &backups).is_err());
        assert!(target.join("notes.txt").exists());
    }

    #[test]
    fn newer_known_package_is_unverified_and_never_downgraded() {
        let directory = tempdir().expect("temporary directory");
        let target = directory.path().join(".codex/skills/nbskill");
        let backups = directory.path().join("backups");
        install_verified_package(&package_source(), &target, &backups).expect("install current");
        rewrite_owned_version(&target, "9.0.0");
        fs::create_dir_all(directory.path().join(".codex/sessions")).expect("Codex evidence");
        let status = detect_nbskill_agents(directory.path(), directory.path()).into_iter().find(|status| status.agent_id == "codex").expect("Codex status");
        assert_eq!(status.package_status, "newer_unverified");
        assert_eq!(install_verified_package(&package_source(), &target, &backups).expect("do not downgrade"), "newer_unverified");
        assert_eq!(fs::read_to_string(target.join("VERSION")).expect("newer version").trim(), "9.0.0");
    }

    #[cfg(unix)]
    #[test]
    fn installer_rejects_a_symlink_in_the_target_parent_path() {
        use std::os::unix::fs::symlink;
        let directory = tempdir().expect("temporary directory");
        let agent_root = directory.path().join(".codex");
        let outside_skills = directory.path().join("outside-skills");
        fs::create_dir_all(&agent_root).expect("agent root");
        fs::create_dir_all(agent_root.join("sessions")).expect("Codex evidence");
        fs::create_dir_all(&outside_skills).expect("outside skills");
        symlink(&outside_skills, agent_root.join("skills")).expect("skills symlink");
        let target = agent_root.join("skills/nbskill");
        let backups = directory.path().join("backups");
        assert!(install_verified_package(&package_source(), &target, &backups).is_err());
        assert!(!outside_skills.join("nbskill").exists());
        let status = detect_nbskill_agents(directory.path(), directory.path()).into_iter()
            .find(|status| status.agent_id == "codex")
            .expect("Codex status");
        assert!(status.agent_detected);
        assert_eq!(status.package_status, "corrupt");
    }
}
