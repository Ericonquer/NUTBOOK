use std::{
    collections::HashMap,
    fs,
    path::{Component, Path, PathBuf},
};

use crate::{
    errors::AppError,
    models::{DiscoveredSkill, Library, SkillDiscoveryPayload},
};

#[derive(Debug, Clone)]
struct SkillManifest {
    name: String,
    manifest_path: PathBuf,
    skill_root_path: PathBuf,
    artifact_output_dir: Option<String>,
}

const FALLBACK_OUTPUT_DIR_NAMES: &[&str] = &[
    "output",
    "outputs",
    "dist",
    "export",
    "exports",
    "result",
    "results",
    "artifacts",
    "deliverables",
    "reports",
];

pub fn discover_artifact_skills(
    libraries: &[Library],
    visibility_overrides: &[(String, String)],
    library_skill_bindings: &[(i64, String, String)],
) -> Result<SkillDiscoveryPayload, AppError> {
    let roots = default_skill_roots();
    discover_artifact_skills_in_roots(&roots, libraries, visibility_overrides, library_skill_bindings)
}

fn default_skill_roots() -> Vec<PathBuf> {
    let Some(home) = std::env::var_os("HOME").map(PathBuf::from) else {
        return Vec::new();
    };
    let mut roots = vec![
        home.join(".openclaw/workspace/skills"),
        home.join(".openclaw/skills"),
        home.join(".agents/skills"),
        home.join(".codex/skills"),
        home.join(".claude/workspace/skills"),
        home.join(".claude/skills"),
    ];

    if let Ok(cwd) = std::env::current_dir() {
        roots.push(cwd.join(".claude/skills"));
    }

    roots
}

pub fn discover_artifact_skills_in_roots(
    roots: &[PathBuf],
    libraries: &[Library],
    visibility_overrides: &[(String, String)],
    library_skill_bindings: &[(i64, String, String)],
) -> Result<SkillDiscoveryPayload, AppError> {
    let manifests = collect_skill_manifests(roots)?;
    let scanned_skills = manifests.len();
    let connected_paths: Vec<String> = libraries
        .iter()
        .filter(|library| library.source_kind == "folder")
        .map(|library| library.root_path.clone())
        .collect();
    let connected_skill_names: Vec<String> = libraries
        .iter()
        .filter(|library| library.source_kind == "folder")
        .map(|library| library.name.to_lowercase())
        .collect();
    let bound_skill_names = library_skill_bindings
        .iter()
        .map(|(_, normalized_name, _)| normalize_skill_name(normalized_name))
        .collect::<Vec<_>>();
    let library_path_by_id = libraries
        .iter()
        .map(|library| (library.id, library.root_path.clone()))
        .collect::<HashMap<_, _>>();
    let mut bound_skill_paths = HashMap::new();
    for (library_id, normalized_name, _) in library_skill_bindings {
        if let Some(path) = library_path_by_id.get(library_id) {
            bound_skill_paths
                .entry(normalize_skill_name(normalized_name))
                .or_insert_with(|| path.clone());
        }
    }

    let override_lookup = visibility_overrides
        .iter()
        .map(|(normalized_name, mode)| (normalize_skill_name(normalized_name), mode.to_string()))
        .collect::<HashMap<_, _>>();
    let grouped = group_skill_manifests(manifests);
    let mut skills = grouped
        .into_iter()
        .map(|group| {
            resolve_skill_group(
                group,
                &connected_paths,
                &connected_skill_names,
                &bound_skill_names,
                &bound_skill_paths,
                &override_lookup,
            )
        })
        .collect::<Vec<_>>();

    skills.sort_by(|left, right| {
        skill_status_rank(&left.status)
            .cmp(&skill_status_rank(&right.status))
            .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
    });

    Ok(SkillDiscoveryPayload {
        scanned_skills,
        skills,
        bindings_backfilled: false,
    })
}

#[derive(Debug, Clone)]
struct SkillGroup {
    normalized_name: String,
    manifests: Vec<SkillManifest>,
}

fn group_skill_manifests(manifests: Vec<SkillManifest>) -> Vec<SkillGroup> {
    let mut grouped: HashMap<String, Vec<SkillManifest>> = HashMap::new();
    for manifest in manifests {
        grouped
            .entry(normalize_skill_name(&manifest.name))
            .or_default()
            .push(manifest);
    }

    grouped
        .into_iter()
        .map(|(normalized_name, mut manifests)| {
            manifests.sort_by_key(|manifest| skill_root_rank(&manifest.skill_root_path));
            SkillGroup {
                normalized_name,
                manifests,
            }
        })
        .collect()
}

fn collect_skill_manifests(roots: &[PathBuf]) -> Result<Vec<SkillManifest>, AppError> {
    let mut manifests = Vec::new();
    for root in roots {
        visit_skill_dir(root, 0, &mut manifests)?;
    }
    Ok(manifests)
}

fn visit_skill_dir(root: &Path, depth: usize, manifests: &mut Vec<SkillManifest>) -> Result<(), AppError> {
    if depth > 4 || !root.exists() || !root.is_dir() {
        return Ok(());
    }

    let skill_manifest = ["SKILL.md", "skill.md"]
        .iter()
        .map(|name| root.join(name))
        .find(|path| path.is_file());

    if let Some(manifest_path) = skill_manifest {
        if let Ok(manifest) = parse_skill_manifest(&manifest_path) {
            manifests.push(manifest);
        }
        return Ok(());
    }

    let entries = match fs::read_dir(root) {
        Ok(entries) => entries,
        Err(_) => return Ok(()),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            visit_skill_dir(&path, depth + 1, manifests)?;
        }
    }

    Ok(())
}

fn parse_skill_manifest(manifest_path: &Path) -> Result<SkillManifest, AppError> {
    let content = fs::read_to_string(manifest_path).map_err(|_| AppError::IoError)?;
    let skill_root_path = manifest_path
        .parent()
        .map(Path::to_path_buf)
        .ok_or(AppError::InvalidParams)?;
    let artifact_output_dir = parse_artifact_output_dir(&content);
    let name = parse_frontmatter_name(&content)
        .or_else(|| skill_root_path.file_name().map(|value| value.to_string_lossy().to_string()))
        .filter(|value| !value.trim().is_empty())
        .ok_or(AppError::InvalidParams)?;

    Ok(SkillManifest {
        name,
        manifest_path: manifest_path.to_path_buf(),
        skill_root_path,
        artifact_output_dir,
    })
}

fn parse_frontmatter_name(content: &str) -> Option<String> {
    parse_frontmatter_value(content, "name")
}

fn parse_artifact_output_dir(content: &str) -> Option<String> {
    parse_frontmatter_value(content, "artifact_output_dir")
}

fn parse_frontmatter_value(content: &str, key: &str) -> Option<String> {
    let mut lines = content.lines();
    if lines.next()?.trim() != "---" {
        return None;
    }

    for line in lines {
        let trimmed = line.trim();
        if trimmed == "---" {
            break;
        }
        let Some((candidate_key, raw_value)) = trimmed.split_once(':') else {
            continue;
        };
        if candidate_key.trim() != key {
            continue;
        }
        let value = raw_value.trim().trim_matches('"').trim_matches('\'');
        if value.is_empty() {
            return None;
        }
        return Some(value.to_string());
    }

    None
}

fn resolve_skill_group(
    group: SkillGroup,
    connected_paths: &[String],
    connected_skill_names: &[String],
    bound_skill_names: &[String],
    bound_skill_paths: &HashMap<String, String>,
    visibility_overrides: &HashMap<String, String>,
) -> DiscoveredSkill {
    let manifest = group
        .manifests
        .first()
        .expect("skill group should contain at least one manifest")
        .clone();

    let output = if let Some(relative_output_dir) = manifest.artifact_output_dir.as_ref() {
        resolve_declared_output_path(&manifest.skill_root_path, relative_output_dir)
    } else {
        resolve_fallback_output_path(&manifest.skill_root_path)
    };

    let mut output_path = output.as_ref().map(|path| normalized_path_string(path));
    let connected_by_path = output_path
        .as_ref()
        .map(|path| connected_paths.iter().any(|candidate| candidate == path))
        .unwrap_or(false);
    let expected_library_name = format!("{} output", manifest.name).to_lowercase();
    let connected_by_name = connected_skill_names.iter().any(|name| name == &expected_library_name);
    let connected_by_binding = bound_skill_names.iter().any(|name| name == &group.normalized_name);
    let is_connected = connected_by_path || connected_by_name || connected_by_binding;
    if output_path.is_none() && connected_by_binding {
        output_path = bound_skill_paths.get(&group.normalized_name).cloned();
    }
    let source_exists = output
        .as_ref()
        .map(|path| path.exists())
        .or_else(|| output_path.as_ref().map(|path| Path::new(path).exists()))
        .unwrap_or(false);
    let override_mode = visibility_overrides.get(&group.normalized_name).map(String::as_str);
    let default_excluded = is_default_excluded_skill(&group.normalized_name);
    let status = if matches!(override_mode, Some("exclude")) {
        "excluded"
    } else if matches!(override_mode, Some("include")) {
        if is_connected {
            "connected"
        } else if output_path.is_some() {
            "ready"
        } else {
            "manual"
        }
    } else if default_excluded {
        "excluded"
    } else if is_connected {
        "connected"
    } else if output_path.is_some() {
        "ready"
    } else {
        "manual"
    };

    DiscoveredSkill {
        name: manifest.name,
        normalized_name: group.normalized_name,
        manifest_path: normalized_path_string(&manifest.manifest_path),
        skill_root_path: normalized_path_string(&manifest.skill_root_path),
        output_path,
        output_dir_declared: manifest.artifact_output_dir,
        source_exists,
        is_connected,
        status: status.to_string(),
        duplicate_count: group.manifests.len(),
    }
}

fn resolve_fallback_output_path(skill_root: &Path) -> Option<PathBuf> {
    FALLBACK_OUTPUT_DIR_NAMES
        .iter()
        .map(|name| skill_root.join(name))
        .find(|candidate| candidate.exists() && candidate.is_dir() && !is_forbidden_output_path(candidate))
}

fn resolve_declared_output_path(skill_root: &Path, relative_output_dir: &str) -> Option<PathBuf> {
    let relative_path = Path::new(relative_output_dir);
    if relative_path.is_absolute() {
        return None;
    }

    if relative_path.components().any(|component| {
        matches!(component, Component::ParentDir | Component::RootDir | Component::Prefix(_))
    }) {
        return None;
    }

    let candidate = skill_root.join(relative_path);
    if is_forbidden_output_path(&candidate) {
        return None;
    }

    Some(candidate)
}

fn is_forbidden_output_path(candidate: &Path) -> bool {
    let Some(home) = std::env::var_os("HOME").map(PathBuf::from) else {
        return false;
    };

    let forbidden = [
        home.join(".openclaw/workspace"),
        home.join(".openclaw"),
        home.join(".agents"),
        home.join(".codex"),
    ];

    let normalized_candidate = normalized_path_string(candidate);
    forbidden
        .iter()
        .map(|path| normalized_path_string(path))
        .any(|path| path == normalized_candidate)
}

fn normalized_path_string(path: &Path) -> String {
    let mut parts = Vec::new();
    for component in path.components() {
        match component {
            Component::RootDir => parts.push(String::new()),
            Component::CurDir => {}
            Component::Normal(value) => parts.push(value.to_string_lossy().to_string()),
            _ => {}
        }
    }

    if parts.is_empty() {
        return path.to_string_lossy().to_string();
    }

    if parts[0].is_empty() {
        format!("/{}", parts[1..].join("/"))
    } else {
        parts.join("/")
    }
}

fn skill_status_rank(status: &str) -> u8 {
    match status {
        "connected" => 0,
        "ready" => 1,
        "manual" => 2,
        "excluded" => 3,
        _ => 4,
    }
}

fn is_default_excluded_skill(normalized_name: &str) -> bool {
    const DEFAULT_EXCLUDED_KEYWORDS: &[&str] = &[
        "review",
        "weather",
        "workflow",
        "debug",
        "verify",
        "verification",
        "using",
        "test",
        "development",
        "plan",
        "skillhub",
        "plugin",
        "mcp",
        "install",
        "builder",
        "runner",
        "dispatch",
        "receive",
        "request",
        "git",
        "worktree",
        "skillcreator",
        "skillinstaller",
        "findskills",
    ];
    DEFAULT_EXCLUDED_KEYWORDS
        .iter()
        .any(|keyword| normalized_name.contains(keyword))
}

fn normalize_skill_name(name: &str) -> String {
    name
        .trim()
        .to_lowercase()
        .chars()
        .filter(|ch| !matches!(ch, ' ' | '_' | '-'))
        .collect()
}

fn skill_root_rank(skill_root: &Path) -> usize {
    let path = normalized_path_string(skill_root);
    let ranks = [
        "/.openclaw/skills",
        "/.openclaw/workspace/skills",
        "/.agents/skills",
        "/.codex/skills",
        "/.claude/skills",
        "/.claude/workspace/skills",
    ];
    ranks
        .iter()
        .position(|candidate| path.contains(candidate))
        .unwrap_or(ranks.len())
}

#[cfg(test)]
mod tests {
    use std::{fs, path::PathBuf, time::{SystemTime, UNIX_EPOCH}};

    use crate::models::Library;

    use super::discover_artifact_skills_in_roots;

    fn temp_root() -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be valid")
            .as_nanos();
        std::env::temp_dir().join(format!("nutbook-skill-discovery-{nanos}"))
    }

    fn write_file(path: &PathBuf, body: &str) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).expect("parent should be created");
        }
        fs::write(path, body).expect("file should be written");
    }

    fn sample_library(root_path: &str) -> Library {
        Library {
            id: 1,
            name: "Output".to_string(),
            root_path: root_path.to_string(),
            source_kind: "folder".to_string(),
            is_active: true,
            created_at: "0".to_string(),
            updated_at: "0".to_string(),
            last_scanned_at: None,
            skill_binding: None,
        }
    }

    #[test]
    fn discover_artifact_skills_prefers_declared_output_dir() {
        let root = temp_root();
        let skill_root = root.join("skills/html-ppt");
        write_file(
            &skill_root.join("SKILL.md"),
            "---\nname: html-ppt\nartifact_output_dir: output\n---\n# html-ppt\n",
        );

        let payload = discover_artifact_skills_in_roots(&[root.join("skills")], &[], &[], &[])
            .expect("skill discovery should succeed");

        assert_eq!(payload.scanned_skills, 1);
        assert_eq!(payload.skills.len(), 1);
        assert_eq!(payload.skills[0].name, "html-ppt");
        assert!(
            payload.skills[0]
                .output_path
                .as_deref()
                .expect("output path should exist")
                .ends_with("/skills/html-ppt/output")
        );
    }

    #[test]
    fn discover_artifact_skills_uses_existing_output_fallback() {
        let root = temp_root();
        let skill_root = root.join("skills/slides");
        write_file(
            &skill_root.join("SKILL.md"),
            "---\nname: slides\n---\n# slides\n",
        );
        fs::create_dir_all(skill_root.join("output")).expect("output dir should exist");

        let payload = discover_artifact_skills_in_roots(&[root.join("skills")], &[], &[], &[])
            .expect("skill discovery should succeed");

        assert_eq!(payload.scanned_skills, 1);
        assert_eq!(payload.skills.len(), 1);
        assert!(payload.skills[0].source_exists);
    }

    #[test]
    fn discover_artifact_skills_uses_whitelisted_fallback_directories() {
        let root = temp_root();
        let skill_root = root.join("skills/reports");
        write_file(
            &skill_root.join("SKILL.md"),
            "---\nname: reports\n---\n# reports\n",
        );
        fs::create_dir_all(skill_root.join("reports")).expect("reports dir should exist");

        let payload = discover_artifact_skills_in_roots(&[root.join("skills")], &[], &[], &[])
            .expect("skill discovery should succeed");

        assert_eq!(payload.scanned_skills, 1);
        assert_eq!(payload.skills.len(), 1);
        assert!(
            payload.skills[0]
                .output_path
                .as_deref()
                .expect("output path should exist")
                .ends_with("/skills/reports/reports")
        );
    }

    #[test]
    fn discover_artifact_skills_marks_connected_sources() {
        let root = temp_root();
        let skill_root = root.join("skills/notebooklm");
        write_file(
            &skill_root.join("SKILL.md"),
            "---\nname: notebooklm\nartifact_output_dir: output\n---\n# notebooklm\n",
        );
        let output_root = skill_root.join("output");

        let payload = discover_artifact_skills_in_roots(
            &[root.join("skills")],
            &[sample_library(&output_root.to_string_lossy())],
            &[],
            &[],
        )
        .expect("skill discovery should succeed");

        assert!(payload.skills[0].is_connected);
    }

    #[test]
    fn discover_artifact_skills_keeps_skills_without_output_as_manual() {
        let root = temp_root();
        let skill_root = root.join("skills/slides-helper");
        write_file(
            &skill_root.join("SKILL.md"),
            "---\nname: slides-helper\n---\n# slides-helper\n",
        );

        let payload = discover_artifact_skills_in_roots(&[root.join("skills")], &[], &[], &[])
            .expect("skill discovery should succeed");

        assert!(payload.scanned_skills >= 1);
        let skill = payload
            .skills
            .iter()
            .find(|skill| skill.name == "slides-helper")
            .expect("slides-helper skill should be present");
        assert_eq!(skill.status, "manual");
        assert!(skill.output_path.is_none());
    }

    #[test]
    fn discover_artifact_skills_marks_excluded_skills() {
        let root = temp_root();
        let skill_root = root.join("skills/review");
        write_file(
            &skill_root.join("SKILL.md"),
            "---\nname: review\n---\n# review\n",
        );

        let payload = discover_artifact_skills_in_roots(
            &[root.join("skills")],
            &[],
            &[(String::from("review"), String::from("exclude"))],
            &[],
        )
        .expect("skill discovery should succeed");

        let review = payload
            .skills
            .iter()
            .find(|skill| skill.name == "review")
            .expect("review skill should be present");
        assert_eq!(review.status, "excluded");
    }

    #[test]
    fn discover_artifact_skills_deduplicates_same_skill_name() {
        let root = temp_root();
        let root_a = root.join("openclaw/html-ppt");
        let root_b = root.join("agents/html_ppt");
        write_file(
            &root_a.join("SKILL.md"),
            "---\nname: html-ppt\nartifact_output_dir: output\n---\n# html-ppt\n",
        );
        write_file(
            &root_b.join("SKILL.md"),
            "---\nname: html_ppt\nartifact_output_dir: output\n---\n# html_ppt\n",
        );

        let payload = discover_artifact_skills_in_roots(
            &[root.join("openclaw"), root.join("agents")],
            &[],
            &[],
            &[],
        )
        .expect("skill discovery should succeed");

        assert_eq!(payload.skills.len(), 1);
        assert_eq!(payload.skills[0].duplicate_count, 2);
    }

    #[test]
    fn discover_artifact_skills_accepts_claude_skill_roots() {
        let root = temp_root();
        let skill_root = root.join(".claude/skills/deck-writer");
        write_file(
            &skill_root.join("SKILL.md"),
            "---\nname: deck-writer\nartifact_output_dir: output\n---\n# deck-writer\n",
        );

        let payload = discover_artifact_skills_in_roots(
            &[root.join(".claude/skills")],
            &[],
            &[],
            &[],
        )
        .expect("skill discovery should succeed");

        assert_eq!(payload.scanned_skills, 1);
        assert_eq!(payload.skills.len(), 1);
        assert_eq!(payload.skills[0].name, "deck-writer");
        assert!(
            payload.skills[0]
                .output_path
                .as_deref()
                .expect("output path should exist")
                .ends_with("/.claude/skills/deck-writer/output")
        );
    }

    #[test]
    fn discover_artifact_skills_excludes_default_keywords_but_can_be_restored() {
        let root = temp_root();
        let skill_root = root.join("skills/reviewer-agent");
        write_file(
            &skill_root.join("SKILL.md"),
            "---\nname: reviewer-agent\n---\n# reviewer-agent\n",
        );

        let payload = discover_artifact_skills_in_roots(&[root.join("skills")], &[], &[], &[])
            .expect("skill discovery should succeed");
        let review = payload
            .skills
            .iter()
            .find(|skill| skill.name == "reviewer-agent")
            .expect("reviewer-agent skill should be present");
        assert_eq!(review.status, "excluded");

        let restored = discover_artifact_skills_in_roots(
            &[root.join("skills")],
            &[],
            &[(String::from("revieweragent"), String::from("include"))],
            &[],
        )
        .expect("skill discovery should succeed");
        let review = restored
            .skills
            .iter()
            .find(|skill| skill.name == "reviewer-agent")
            .expect("reviewer-agent skill should be present");
        assert_ne!(review.status, "excluded");
    }

    #[test]
    fn discover_artifact_skills_excludes_skill_tools_by_default() {
        let root = temp_root();
        let skill_root = root.join("skills/find-skills");
        write_file(
            &skill_root.join("SKILL.md"),
            "---\nname: find-skills\n---\n# find-skills\n",
        );

        let payload = discover_artifact_skills_in_roots(&[root.join("skills")], &[], &[], &[])
            .expect("skill discovery should succeed");
        let skill = payload
            .skills
            .iter()
            .find(|entry| entry.name == "find-skills")
            .expect("find-skills should be present");
        assert_eq!(skill.status, "excluded");
    }

    #[test]
    fn discover_artifact_skills_excludes_keyword_families_by_default() {
        let root = temp_root();
        let skillhub_root = root.join("skills/skillhub-preference");
        let verification_root = root.join("skills/verification-helper");
        let plan_root = root.join("skills/development-plan");
        let plugin_root = root.join("skills/plugin-creator");
        let mcp_root = root.join("skills/mcp-builder");
        let runner_root = root.join("skills/workflow-runner");
        write_file(
            &skillhub_root.join("SKILL.md"),
            "---\nname: skillhub-preference\n---\n# skillhub-preference\n",
        );
        write_file(
            &verification_root.join("SKILL.md"),
            "---\nname: verification-helper\n---\n# verification-helper\n",
        );
        write_file(
            &plan_root.join("SKILL.md"),
            "---\nname: development-plan\n---\n# development-plan\n",
        );
        write_file(
            &plugin_root.join("SKILL.md"),
            "---\nname: plugin-creator\n---\n# plugin-creator\n",
        );
        write_file(
            &mcp_root.join("SKILL.md"),
            "---\nname: mcp-builder\n---\n# mcp-builder\n",
        );
        write_file(
            &runner_root.join("SKILL.md"),
            "---\nname: workflow-runner\n---\n# workflow-runner\n",
        );

        let payload = discover_artifact_skills_in_roots(&[root.join("skills")], &[], &[], &[])
            .expect("skill discovery should succeed");

        for expected in [
            "skillhub-preference",
            "verification-helper",
            "development-plan",
            "plugin-creator",
            "mcp-builder",
            "workflow-runner",
        ] {
            let skill = payload
                .skills
                .iter()
                .find(|entry| entry.name == expected)
                .expect("skill should be present");
            assert_eq!(skill.status, "excluded");
        }
    }
}
