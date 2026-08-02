use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::{Component, Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
    time::{Duration, Instant, UNIX_EPOCH},
};

use sha2::{Digest, Sha256};

use crate::models::{
    AgentArtifactEvent, ArtifactCandidate, ArtifactCandidateGroupSummary, DiscoveryEvidence,
    DiscoveryReasonKind, RelatedArtifactFile,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ObservedProjectFile {
    pub path: String,
    pub file_size: u64,
    pub modified_at: Option<String>,
    pub appeared_during_agent_run: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ManifestArtifactFact {
    pub id: String,
    pub path: String,
    pub state: String,
    pub kind: String,
    pub generated_at: Option<String>,
    pub related_files: Vec<RelatedArtifactFile>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ArtifactScanLimits {
    pub max_depth: usize,
    pub max_entries: usize,
    pub max_duration: Duration,
}

impl Default for ArtifactScanLimits {
    fn default() -> Self {
        Self {
            max_depth: 8,
            max_entries: 20_000,
            max_duration: Duration::from_secs(3),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ArtifactFileObservation {
    pub files: Vec<ObservedProjectFile>,
    pub status: String,
    pub issue: Option<String>,
}

#[derive(Debug, Clone, Default)]
pub struct ArtifactDiscoveryInput {
    pub project_library_id: i64,
    pub source_adapter_id: String,
    pub scope_kind: String,
    pub observed_files: Vec<ObservedProjectFile>,
    pub events: Vec<AgentArtifactEvent>,
    pub manifest_entries: Vec<ManifestArtifactFact>,
}

pub fn observe_project_files(project_root: &Path) -> Vec<ObservedProjectFile> {
    observe_project_files_bounded(
        project_root,
        ArtifactScanLimits::default(),
        &AtomicBool::new(false),
    )
    .files
}

pub fn observe_project_files_bounded(
    project_root: &Path,
    limits: ArtifactScanLimits,
    cancelled: &AtomicBool,
) -> ArtifactFileObservation {
    let Ok(project_root) = fs::canonicalize(project_root) else {
        return ArtifactFileObservation {
            files: Vec::new(),
            status: "partial".to_string(),
            issue: Some("root_unavailable".to_string()),
        };
    };
    let started_at = Instant::now();
    let mut pending_directories = vec![(project_root.clone(), 0_usize)];
    let mut observed = Vec::new();
    let mut visited_entries = 0_usize;
    let mut issue = None;
    while let Some((directory, depth)) = pending_directories.pop() {
        if cancelled.load(Ordering::Relaxed) {
            issue = Some("cancelled".to_string());
            break;
        }
        if started_at.elapsed() >= limits.max_duration {
            issue = Some("time_limit".to_string());
            break;
        }
        let Ok(read_dir) = fs::read_dir(&directory) else {
            issue.get_or_insert_with(|| "unreadable_directory".to_string());
            continue;
        };
        let mut entries = Vec::new();
        for entry in read_dir {
            match entry {
                Ok(entry) => entries.push(entry),
                Err(_) => {
                    issue.get_or_insert_with(|| "unreadable_entry".to_string());
                }
            }
        }
        entries.sort_by_key(|entry| entry.file_name());
        for entry in entries {
            if cancelled.load(Ordering::Relaxed) {
                issue = Some("cancelled".to_string());
                break;
            }
            if started_at.elapsed() >= limits.max_duration {
                issue = Some("time_limit".to_string());
                break;
            }
            if visited_entries >= limits.max_entries {
                issue = Some("entry_limit".to_string());
                break;
            }
            visited_entries += 1;
            let Ok(file_type) = entry.file_type() else {
                issue.get_or_insert_with(|| "unreadable_entry".to_string());
                continue;
            };
            let path = entry.path();
            if file_type.is_symlink() {
                continue;
            }
            if file_type.is_dir() {
                let name = entry.file_name();
                let name = name.to_string_lossy().to_ascii_lowercase();
                if matches!(
                    name.as_str(),
                    ".git" | ".cache" | "node_modules" | "target" | "vendor"
                ) {
                    continue;
                }
                // max_depth is the declared boundary of a bounded scan, not an
                // operational failure. Files within the boundary were fully read.
                if depth < limits.max_depth {
                    pending_directories.push((path, depth + 1));
                }
                continue;
            }
            if !file_type.is_file() {
                continue;
            }
            let Ok(relative) = path.strip_prefix(&project_root) else {
                continue;
            };
            let relative = relative.to_string_lossy().replace('\\', "/");
            if supported_artifact_kind(&relative).is_none() {
                continue;
            }
            let metadata = entry.metadata().ok();
            observed.push(ObservedProjectFile {
                path: relative,
                file_size: metadata.as_ref().map(fs::Metadata::len).unwrap_or(0),
                modified_at: metadata
                    .and_then(|metadata| metadata.modified().ok())
                    .and_then(|modified| modified.duration_since(UNIX_EPOCH).ok())
                    .map(|duration| duration.as_secs().to_string()),
                appeared_during_agent_run: false,
            });
        }
    }
    observed.sort_by(|left, right| left.path.cmp(&right.path));
    ArtifactFileObservation {
        files: observed,
        status: if issue.is_some() { "partial" } else { "complete" }.to_string(),
        issue,
    }
}

pub fn classify_artifact_candidates(
    project_root: &Path,
    input: &ArtifactDiscoveryInput,
) -> Vec<ArtifactCandidate> {
    let Ok(project_root) = fs::canonicalize(project_root) else {
        return Vec::new();
    };
    let observed = input
        .observed_files
        .iter()
        .map(|file| (file.path.clone(), file))
        .collect::<BTreeMap<_, _>>();
    let events = input
        .events
        .iter()
        .filter(|event| event_matches_project(&project_root, event))
        .fold(
        BTreeMap::<String, Vec<&AgentArtifactEvent>>::new(),
        |mut grouped, event| {
            grouped.entry(event.path.clone()).or_default().push(event);
            grouped
        },
        );
    let manifests = input
        .manifest_entries
        .iter()
        .map(|entry| (entry.path.clone(), entry))
        .collect::<BTreeMap<_, _>>();
    let manifest_related = input
        .manifest_entries
        .iter()
        .flat_map(|entry| entry.related_files.iter().map(|file| file.path.clone()))
        .collect::<BTreeSet<_>>();

    let all_paths = observed
        .keys()
        .chain(events.keys())
        .chain(manifests.keys())
        .cloned()
        .collect::<BTreeSet<_>>();
    let mut candidates = Vec::new();

    for path in all_paths {
        if manifest_related.contains(&path) && !manifests.contains_key(&path) {
            continue;
        }
        let Some(artifact_kind) = supported_artifact_kind(&path) else {
            continue;
        };
        let Some(absolute_path) = safe_existing_project_path(&project_root, &path) else {
            continue;
        };
        let manifest = manifests.get(&path).copied();
        let path_events = events.get(&path).cloned().unwrap_or_default();
        let observed_file = observed.get(&path).copied();
        let mut reasons = BTreeSet::new();
        let mut evidence = Vec::new();

        if let Some(entry) = manifest {
            reasons.insert(DiscoveryReasonKind::NbskillRegistered);
            evidence.push(manifest_evidence(entry, &input.source_adapter_id));
        }
        for event in path_events {
            if let Some(reason) = event_reason(&event.kind) {
                reasons.insert(reason.clone());
                evidence.push(event_evidence(event, reason, &input.source_adapter_id));
            }
        }
        if input.scope_kind == "task" && observed_file.is_some() {
            reasons.insert(DiscoveryReasonKind::InsideProviderTaskScope);
        }
        if input.scope_kind == "project"
            && observed_file.is_some()
            && Path::new(&path).components().count() == 1
        {
            reasons.insert(DiscoveryReasonKind::InsideProjectRoot);
        }
        if reasons.is_empty()
            && observed_file.is_some_and(|file| file.appeared_during_agent_run)
        {
            reasons.insert(DiscoveryReasonKind::AppearedDuringAgentRun);
        }
        if reasons.is_empty() {
            reasons.insert(DiscoveryReasonKind::SupportedExtensionOnly);
        }

        let internal = is_internal_project_path(&path) && manifest.is_none();
        let skill_support_document =
            is_skill_support_document(&project_root, &path) && manifest.is_none();
        let status = if internal {
            "excluded"
        } else if let Some(entry) = manifest {
            match entry.state.as_str() {
                "active" => "suggested",
                "superseded" => "superseded",
                _ => "missing",
            }
        } else if skill_support_document
            && !reasons.iter().any(is_strong_delivery_reason)
        {
            "pending"
        } else if reasons.iter().any(is_suggested_reason) {
            "suggested"
        } else if reasons.contains(&DiscoveryReasonKind::AppearedDuringAgentRun)
            || reasons.contains(&DiscoveryReasonKind::InsideProviderTaskScope)
            || reasons.contains(&DiscoveryReasonKind::SupportedExtensionOnly)
        {
            "pending"
        } else {
            "excluded"
        };
        let batch_key = candidate_batch_key(manifest, &evidence, observed_file);
        evidence.sort_by(|left, right| left.fingerprint.cmp(&right.fingerprint));
        evidence.dedup_by(|left, right| left.fingerprint == right.fingerprint);
        let mut related_files = manifest
            .map(|entry| entry.related_files.clone())
            .unwrap_or_default();
        if artifact_kind == "html" && status == "suggested" {
            related_files.extend(discover_html_related_files(
                &project_root,
                &absolute_path,
            ));
        }
        related_files.retain(|file| {
            matches!(file.role.as_str(), "asset" | "data" | "attachment")
                && file.path != path
                && safe_existing_project_path(&project_root, &file.path).is_some()
        });
        related_files.sort_by(|left, right| {
            left.path
                .cmp(&right.path)
                .then_with(|| left.role.cmp(&right.role))
        });
        related_files.dedup_by(|left, right| left.path == right.path);

        let metadata = fs::metadata(&absolute_path).ok();
        let file_size = observed_file
            .map(|file| file.file_size)
            .or_else(|| metadata.as_ref().map(std::fs::Metadata::len))
            .unwrap_or(0);
        let modified_at = observed_file.and_then(|file| file.modified_at.clone());
        let reasons = reasons.into_iter().collect::<Vec<_>>();
        let discovery_fingerprint = candidate_fingerprint(
            &input.source_adapter_id,
            &path,
            status,
            &batch_key,
            &reasons,
            &related_files,
            file_size,
            modified_at.as_deref(),
        );
        candidates.push(ArtifactCandidate {
            id: None,
            project_library_id: input.project_library_id,
            agent_kind: input.source_adapter_id.clone(),
            primary_path: path,
            artifact_kind: artifact_kind.to_string(),
            status: status.to_string(),
            batch_key,
            reasons,
            discovery_fingerprint,
            file_size,
            modified_at,
            related_files,
            evidence,
        });
    }

    candidates.sort_by(|left, right| {
        candidate_status_rank(&left.status)
            .cmp(&candidate_status_rank(&right.status))
            .then_with(|| left.batch_key.cmp(&right.batch_key))
            .then_with(|| left.primary_path.cmp(&right.primary_path))
    });
    candidates
}

pub fn summarize_candidate_groups(
    candidates: &[ArtifactCandidate],
) -> Vec<ArtifactCandidateGroupSummary> {
    let mut grouped = BTreeMap::<(String, String), Vec<String>>::new();
    for candidate in candidates {
        grouped
            .entry((candidate.batch_key.clone(), candidate.status.clone()))
            .or_default()
            .push(candidate.primary_path.clone());
    }
    grouped
        .into_iter()
        .map(|((batch_key, status), mut paths)| {
            paths.sort();
            let count = paths.len().try_into().unwrap_or(u32::MAX);
            paths.truncate(3);
            ArtifactCandidateGroupSummary {
                batch_key,
                status,
                count,
                representative_paths: paths,
            }
        })
        .collect()
}

fn supported_artifact_kind(path: &str) -> Option<&'static str> {
    match Path::new(path)
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_ascii_lowercase())
        .as_deref()
    {
        Some("md" | "markdown") => Some("markdown"),
        Some("html" | "htm") => Some("html"),
        _ => None,
    }
}

fn safe_existing_project_path(project_root: &Path, relative: &str) -> Option<PathBuf> {
    let relative_path = Path::new(relative);
    if relative_path.is_absolute()
        || relative_path
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
    {
        return None;
    }
    let canonical = fs::canonicalize(project_root.join(relative_path)).ok()?;
    canonical.strip_prefix(project_root).ok()?;
    canonical.is_file().then_some(canonical)
}

fn event_matches_project(project_root: &Path, event: &AgentArtifactEvent) -> bool {
    fs::canonicalize(&event.project_root)
        .is_ok_and(|event_root| event_root == project_root)
}

fn is_internal_project_path(path: &str) -> bool {
    let normalized = path.to_ascii_lowercase();
    let components = normalized.split('/').collect::<Vec<_>>();
    let file_name = components.last().copied().unwrap_or_default();
    matches!(file_name, "agents.md" | "memory.md" | "design.md")
        || components.iter().any(|component| {
            matches!(
                *component,
                "test"
                    | "tests"
                    | "fixture"
                    | "fixtures"
                    | "cache"
                    | ".cache"
                    | "node_modules"
                    | "target"
                    | "vendor"
                    | "src"
            )
        })
        || file_name.contains("internal")
        || file_name.contains("debug")
        || file_name.contains("licenses")
}

fn is_skill_support_document(project_root: &Path, path: &str) -> bool {
    let relative = Path::new(path);
    let file_name = relative
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default();
    if file_name.eq_ignore_ascii_case("SKILL.md") {
        return true;
    }
    if !matches!(
        relative
            .extension()
            .and_then(|extension| extension.to_str())
            .map(|extension| extension.to_ascii_lowercase())
            .as_deref(),
        Some("md" | "markdown")
    ) {
        return false;
    }
    let components = relative.components().collect::<Vec<_>>();
    let Some(references_index) = components.iter().position(|component| {
        matches!(
            component,
            Component::Normal(name)
                if name.to_str().is_some_and(|name| name.eq_ignore_ascii_case("references"))
        )
    }) else {
        return false;
    };
    let skill_root = components[..references_index]
        .iter()
        .fold(project_root.to_path_buf(), |root, component| root.join(component.as_os_str()));
    skill_root.join("SKILL.md").is_file() || skill_root.join("skill.md").is_file()
}

fn event_reason(kind: &str) -> Option<DiscoveryReasonKind> {
    match kind {
        "mentioned_in_final_response" => Some(DiscoveryReasonKind::MentionedInFinalResponse),
        "explicit_export_event" => Some(DiscoveryReasonKind::ExplicitExportEvent),
        "created_by_agent_tool" => Some(DiscoveryReasonKind::CreatedByAgentTool),
        "opened_from_agent_delivery" => Some(DiscoveryReasonKind::OpenedFromAgentDelivery),
        "inside_user_confirmed_output" => Some(DiscoveryReasonKind::InsideUserConfirmedOutput),
        "appeared_during_agent_run" => Some(DiscoveryReasonKind::AppearedDuringAgentRun),
        _ => None,
    }
}

fn is_suggested_reason(reason: &DiscoveryReasonKind) -> bool {
    matches!(
        reason,
        DiscoveryReasonKind::NbskillRegistered
            | DiscoveryReasonKind::MentionedInFinalResponse
            | DiscoveryReasonKind::ExplicitExportEvent
            | DiscoveryReasonKind::CreatedByAgentTool
            | DiscoveryReasonKind::OpenedFromAgentDelivery
            | DiscoveryReasonKind::InsideUserConfirmedOutput
            | DiscoveryReasonKind::InsideProjectRoot
    )
}

fn is_strong_delivery_reason(reason: &DiscoveryReasonKind) -> bool {
    matches!(
        reason,
        DiscoveryReasonKind::NbskillRegistered
            | DiscoveryReasonKind::MentionedInFinalResponse
            | DiscoveryReasonKind::ExplicitExportEvent
            | DiscoveryReasonKind::OpenedFromAgentDelivery
            | DiscoveryReasonKind::InsideUserConfirmedOutput
    )
}

fn event_evidence(
    event: &AgentArtifactEvent,
    reason: DiscoveryReasonKind,
    agent_kind: &str,
) -> DiscoveryEvidence {
    let run_reference_hash = (!event.run_reference.is_empty())
        .then(|| sha256_hex(event.run_reference.as_bytes()));
    let fingerprint = sha256_hex(
        format!(
            "event\0{}\0{}\0{}\0{}",
            agent_kind, event.event_id, event.kind, event.run_reference
        )
        .as_bytes(),
    );
    DiscoveryEvidence {
        fingerprint,
        agent_kind: agent_kind.to_string(),
        reason,
        event_id: event.event_id.clone(),
        run_reference_hash,
        observed_at: Some(event.observed_at.clone()),
    }
}

fn manifest_evidence(entry: &ManifestArtifactFact, agent_kind: &str) -> DiscoveryEvidence {
    DiscoveryEvidence {
        fingerprint: sha256_hex(
            format!(
                "manifest\0{}\0{}\0{}\0{}",
                agent_kind, entry.id, entry.path, entry.state
            )
            .as_bytes(),
        ),
        agent_kind: agent_kind.to_string(),
        reason: DiscoveryReasonKind::NbskillRegistered,
        event_id: format!("manifest:{}", entry.id),
        run_reference_hash: None,
        observed_at: entry.generated_at.clone(),
    }
}

fn candidate_batch_key(
    manifest: Option<&ManifestArtifactFact>,
    evidence: &[DiscoveryEvidence],
    observed: Option<&ObservedProjectFile>,
) -> String {
    if let Some(entry) = manifest {
        return format!("manifest:{}", entry.id);
    }
    if let Some(run_hash) = evidence
        .iter()
        .find_map(|item| item.run_reference_hash.as_deref())
    {
        return format!("run:{}", &run_hash[..16.min(run_hash.len())]);
    }
    if observed.is_some_and(|file| file.appeared_during_agent_run) {
        return "run-window:unverified".to_string();
    }
    "unsupported:extension-only".to_string()
}

fn discover_html_related_files(
    project_root: &Path,
    html_path: &Path,
) -> Vec<RelatedArtifactFile> {
    let Ok(html) = fs::read_to_string(html_path) else {
        return Vec::new();
    };
    let mut related = Vec::new();
    for attribute in ["src", "href"] {
        for target in quoted_attribute_values(&html, attribute) {
            if target.is_empty()
                || target.starts_with('#')
                || target.starts_with("data:")
                || target.starts_with("http://")
                || target.starts_with("https://")
                || target.starts_with("//")
            {
                continue;
            }
            let base = html_path.parent().unwrap_or(project_root);
            let Some(canonical) = safe_existing_absolute_project_path(project_root, &base.join(target))
            else {
                continue;
            };
            let Ok(relative) = canonical.strip_prefix(project_root) else {
                continue;
            };
            let relative = relative.to_string_lossy().replace('\\', "/");
            if supported_artifact_kind(&relative).is_none() {
                related.push(RelatedArtifactFile {
                    path: relative,
                    role: "asset".to_string(),
                });
            }
        }
    }
    related
}

fn quoted_attribute_values(html: &str, attribute: &str) -> Vec<String> {
    let lower = html.to_ascii_lowercase();
    let mut values = Vec::new();
    let needle = format!("{attribute}=");
    let mut offset = 0;
    while let Some(index) = lower[offset..].find(&needle) {
        let value_start = offset + index + needle.len();
        let Some(quote) = html[value_start..].chars().next() else {
            break;
        };
        if quote != '"' && quote != '\'' {
            offset = value_start;
            continue;
        }
        let content_start = value_start + quote.len_utf8();
        let Some(end) = html[content_start..].find(quote) else {
            break;
        };
        values.push(html[content_start..content_start + end].to_string());
        offset = content_start + end + quote.len_utf8();
    }
    values
}

fn safe_existing_absolute_project_path(project_root: &Path, path: &Path) -> Option<PathBuf> {
    let canonical = fs::canonicalize(path).ok()?;
    canonical.strip_prefix(project_root).ok()?;
    canonical.is_file().then_some(canonical)
}

fn candidate_fingerprint(
    agent_kind: &str,
    path: &str,
    status: &str,
    batch_key: &str,
    reasons: &[DiscoveryReasonKind],
    related_files: &[RelatedArtifactFile],
    file_size: u64,
    modified_at: Option<&str>,
) -> String {
    let reasons = reasons
        .iter()
        .map(DiscoveryReasonKind::as_str)
        .collect::<Vec<_>>()
        .join(",");
    let related = related_files
        .iter()
        .map(|file| format!("{}:{}", file.role, file.path))
        .collect::<Vec<_>>()
        .join(",");
    sha256_hex(
        format!(
            "{agent_kind}\0{path}\0{status}\0{batch_key}\0{reasons}\0{related}\0{file_size}\0{}",
            modified_at.unwrap_or_default()
        )
        .as_bytes(),
    )
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut digest = Sha256::new();
    digest.update(bytes);
    format!("{:x}", digest.finalize())
}

fn candidate_status_rank(status: &str) -> u8 {
    match status {
        "suggested" => 0,
        "pending" => 1,
        "accepted" => 2,
        "excluded" => 3,
        "ignored" => 4,
        "superseded" => 5,
        "missing" => 6,
        _ => 7,
    }
}

#[cfg(test)]
mod tests {
    use std::{
        fs,
        path::PathBuf,
        sync::atomic::AtomicBool,
        time::Duration,
    };

    use serde::Deserialize;
    use tempfile::tempdir;

    use crate::models::{
        AgentArtifactEvent, ArtifactCandidate, DiscoveryReasonKind, RelatedArtifactFile,
    };

    use super::{
        classify_artifact_candidates, observe_project_files_bounded, summarize_candidate_groups,
        ArtifactDiscoveryInput, ArtifactScanLimits, ManifestArtifactFact, ObservedProjectFile,
    };

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct FixtureManifest {
        entries: Vec<FixtureManifestEntry>,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct FixtureManifestEntry {
        id: String,
        path: String,
        state: String,
        kind: String,
        generated_at: Option<String>,
        #[serde(default)]
        related_files: Vec<RelatedArtifactFile>,
    }

    fn fixture_root() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/agent-artifact-discovery")
    }

    fn fixture_project() -> PathBuf {
        fixture_root().join("projects/sample-agent-project")
    }

    fn fixture_events() -> Vec<AgentArtifactEvent> {
        let mut events: Vec<AgentArtifactEvent> = serde_json::from_str(
            &fs::read_to_string(
                fixture_root().join("provider-records/codex/expected-events.json"),
            )
            .expect("event fixture"),
        )
        .expect("event JSON");
        let project_root = fixture_project().to_string_lossy().into_owned();
        for event in &mut events {
            event.project_root = project_root.clone();
        }
        events
    }

    fn fixture_observed_files() -> Vec<ObservedProjectFile> {
        [
            ("AGENTS.md", false),
            ("MEMORY.md", false),
            ("docs/delivered-report.md", false),
            ("docs/uncertain-plan.md", true),
            ("docs/internal-debug.md", true),
            ("presentation/index.html", false),
            ("tests/preview.html", true),
        ]
        .into_iter()
        .map(|(path, appeared_during_agent_run)| ObservedProjectFile {
            path: path.to_string(),
            file_size: fs::metadata(fixture_project().join(path))
                .expect("fixture metadata")
                .len(),
            modified_at: Some("2026-07-30T06:02:01Z".to_string()),
            appeared_during_agent_run,
        })
        .collect()
    }

    fn fixture_manifest_entries() -> Vec<ManifestArtifactFact> {
        let fixture: FixtureManifest = serde_json::from_str(
            &fs::read_to_string(
                fixture_project().join(".agent-outputs/manifest.json"),
            )
            .expect("manifest fixture"),
        )
        .expect("manifest JSON");
        fixture
            .entries
            .into_iter()
            .map(|entry| ManifestArtifactFact {
                id: entry.id,
                path: entry.path,
                state: entry.state,
                kind: entry.kind,
                generated_at: entry.generated_at,
                related_files: entry.related_files,
            })
            .collect()
    }

    fn paths_with_status(candidates: &[ArtifactCandidate], status: &str) -> Vec<String> {
        let mut paths = candidates
            .iter()
            .filter(|candidate| candidate.status == status)
            .map(|candidate| candidate.primary_path.clone())
            .collect::<Vec<_>>();
        paths.sort();
        paths
    }

    #[test]
    fn classifier_matches_redacted_fixture_without_manifest() {
        let candidates = classify_artifact_candidates(
            &fixture_project(),
            &ArtifactDiscoveryInput {
                project_library_id: 7,
                source_adapter_id: "codex".to_string(),
                scope_kind: "project".to_string(),
                observed_files: fixture_observed_files(),
                events: fixture_events(),
                manifest_entries: Vec::new(),
            },
        );

        assert_eq!(
            paths_with_status(&candidates, "suggested"),
            vec![
                "docs/delivered-report.md".to_string(),
                "presentation/index.html".to_string(),
            ]
        );
        assert_eq!(
            paths_with_status(&candidates, "pending"),
            vec!["docs/uncertain-plan.md".to_string()]
        );
        assert_eq!(
            paths_with_status(&candidates, "excluded"),
            vec![
                "AGENTS.md".to_string(),
                "MEMORY.md".to_string(),
                "docs/internal-debug.md".to_string(),
                "tests/preview.html".to_string(),
            ]
        );
        let presentation = candidates
            .iter()
            .find(|candidate| candidate.primary_path == "presentation/index.html")
            .expect("presentation candidate");
        assert_eq!(
            presentation
                .related_files
                .iter()
                .map(|file| file.path.as_str())
                .collect::<Vec<_>>(),
            vec![
                "presentation/assets/cover.png",
                "presentation/assets/runtime.js",
            ]
        );
        let pending = candidates
            .iter()
            .find(|candidate| candidate.primary_path == "docs/uncertain-plan.md")
            .expect("pending candidate");
        assert_eq!(
            pending.reasons,
            vec![DiscoveryReasonKind::AppearedDuringAgentRun]
        );
        assert!(pending.evidence.is_empty());
    }

    #[test]
    fn manifest_upgrades_candidates_without_duplicate_primary_cards() {
        let mut manifest_entries = fixture_manifest_entries();
        manifest_entries
            .iter_mut()
            .find(|entry| entry.path == "presentation/index.html")
            .expect("presentation manifest entry")
            .related_files
            .push(RelatedArtifactFile {
                path: "presentation/assets/outside-project-link.txt".to_string(),
                role: "asset".to_string(),
            });
        let candidates = classify_artifact_candidates(
            &fixture_project(),
            &ArtifactDiscoveryInput {
                project_library_id: 7,
                source_adapter_id: "codex".to_string(),
                scope_kind: "project".to_string(),
                observed_files: fixture_observed_files(),
                events: fixture_events(),
                manifest_entries,
            },
        );

        for path in [
            "docs/delivered-report.md",
            "presentation/index.html",
            ".agent-outputs/nbskill/editable-report.html",
        ] {
            assert_eq!(
                candidates
                    .iter()
                    .filter(|candidate| candidate.primary_path == path)
                    .count(),
                1
            );
            let candidate = candidates
                .iter()
                .find(|candidate| candidate.primary_path == path)
                .expect("manifest candidate");
            assert_eq!(candidate.status, "suggested");
            assert!(candidate
                .reasons
                .contains(&DiscoveryReasonKind::NbskillRegistered));
        }
        let presentation = candidates
            .iter()
            .find(|candidate| candidate.primary_path == "presentation/index.html")
            .expect("presentation candidate");
        assert!(presentation
            .related_files
            .iter()
            .all(|file| !file.path.contains("outside-project-link")));
    }

    #[test]
    fn nested_supported_extension_alone_stays_pending_for_review() {
        let root = tempdir().expect("project");
        let other_root = tempdir().expect("other project");
        fs::create_dir(root.path().join("notes")).expect("notes");
        fs::write(root.path().join("notes/orphan.md"), "# Orphan").expect("orphan file");
        let candidates = classify_artifact_candidates(
            root.path(),
            &ArtifactDiscoveryInput {
                project_library_id: 1,
                source_adapter_id: "codex".to_string(),
                scope_kind: "project".to_string(),
                observed_files: vec![ObservedProjectFile {
                    path: "notes/orphan.md".to_string(),
                    file_size: 8,
                    modified_at: None,
                    appeared_during_agent_run: false,
                }],
                events: vec![AgentArtifactEvent {
                    event_id: "wrong-project-delivery".to_string(),
                    project_root: other_root.path().to_string_lossy().into_owned(),
                    path: "notes/orphan.md".to_string(),
                    kind: "mentioned_in_final_response".to_string(),
                    observed_at: "2026-07-30T06:03:00Z".to_string(),
                    run_reference: "wrong-project-run".to_string(),
                    evidence_source: "final_answer_file_link".to_string(),
                }],
                manifest_entries: Vec::new(),
            },
        );

        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0].status, "pending");
        assert_eq!(
            candidates[0].reasons,
            vec![DiscoveryReasonKind::SupportedExtensionOnly]
        );
    }

    #[test]
    fn project_root_markdown_is_suggested_without_agent_event() {
        let root = tempdir().expect("project");
        fs::write(root.path().join("brief.md"), "# Brief").expect("brief");
        let candidates = classify_artifact_candidates(
            root.path(),
            &ArtifactDiscoveryInput {
                project_library_id: 1,
                source_adapter_id: "codex".to_string(),
                scope_kind: "project".to_string(),
                observed_files: vec![ObservedProjectFile {
                    path: "brief.md".to_string(),
                    file_size: 7,
                    modified_at: None,
                    appeared_during_agent_run: false,
                }],
                events: Vec::new(),
                manifest_entries: Vec::new(),
            },
        );

        assert_eq!(candidates[0].status, "suggested");
        assert!(candidates[0]
            .reasons
            .contains(&DiscoveryReasonKind::InsideProjectRoot));
    }

    #[test]
    fn design_and_licenses_markdown_are_explicitly_excluded() {
        let root = tempdir().expect("project");
        for path in ["DESIGN.md", "THIRD_PARTY_LICENSES.md", "brief.md"] {
            fs::write(root.path().join(path), format!("# {path}")).expect("project file");
        }
        let observed_files = ["DESIGN.md", "THIRD_PARTY_LICENSES.md", "brief.md"]
            .into_iter()
            .map(|path| ObservedProjectFile {
                path: path.to_string(),
                file_size: 1,
                modified_at: None,
                appeared_during_agent_run: false,
            })
            .collect();
        let candidates = classify_artifact_candidates(
            root.path(),
            &ArtifactDiscoveryInput {
                project_library_id: 1,
                source_adapter_id: "codex".to_string(),
                scope_kind: "project".to_string(),
                observed_files,
                events: Vec::new(),
                manifest_entries: Vec::new(),
            },
        );

        assert_eq!(
            paths_with_status(&candidates, "excluded"),
            vec!["DESIGN.md".to_string(), "THIRD_PARTY_LICENSES.md".to_string()]
        );
        assert_eq!(paths_with_status(&candidates, "suggested"), vec!["brief.md"]);
    }

    #[test]
    fn skill_definition_and_reference_markdown_stay_pending_without_delivery_evidence() {
        let root = tempdir().expect("project");
        fs::create_dir_all(root.path().join("cover-me/references")).expect("skill folders");
        fs::create_dir_all(root.path().join("docs/references")).expect("project references");
        for path in [
            "cover-me/SKILL.md",
            "cover-me/references/ericonquer-style.md",
            "docs/references/source-notes.md",
            "report.md",
        ] {
            fs::write(root.path().join(path), format!("# {path}"))
                .expect("candidate file");
        }
        let event = |event_id: &str, path: &str| AgentArtifactEvent {
            event_id: event_id.to_string(),
            project_root: root.path().to_string_lossy().into_owned(),
            path: path.to_string(),
            kind: "created_by_agent_tool".to_string(),
            observed_at: "2026-08-01T08:00:00Z".to_string(),
            run_reference: "skill-authoring-run".to_string(),
            evidence_source: "tool_write".to_string(),
        };
        let observed_files = [
            "cover-me/SKILL.md",
            "cover-me/references/ericonquer-style.md",
            "docs/references/source-notes.md",
            "report.md",
        ]
        .into_iter()
        .map(|path| ObservedProjectFile {
            path: path.to_string(),
            file_size: fs::metadata(root.path().join(path))
                .expect("metadata")
                .len(),
            modified_at: None,
            appeared_during_agent_run: false,
        })
        .collect();

        let candidates = classify_artifact_candidates(
            root.path(),
            &ArtifactDiscoveryInput {
                project_library_id: 1,
                source_adapter_id: "codex".to_string(),
                scope_kind: "project".to_string(),
                observed_files,
                events: vec![
                    event("skill-write", "cover-me/SKILL.md"),
                    event("reference-write", "cover-me/references/ericonquer-style.md"),
                    event("project-reference-write", "docs/references/source-notes.md"),
                    event("report-write", "report.md"),
                ],
                manifest_entries: Vec::new(),
            },
        );

        assert_eq!(
            paths_with_status(&candidates, "pending"),
            vec![
                "cover-me/SKILL.md".to_string(),
                "cover-me/references/ericonquer-style.md".to_string(),
            ]
        );
        assert_eq!(
            paths_with_status(&candidates, "suggested"),
            vec![
                "docs/references/source-notes.md".to_string(),
                "report.md".to_string(),
            ]
        );
    }

    #[test]
    fn repeated_event_is_idempotent_but_distinct_runs_keep_distinct_evidence() {
        let root = tempdir().expect("project");
        fs::write(root.path().join("report.md"), "# Report").expect("report");
        let event = |event_id: &str, run_reference: &str| AgentArtifactEvent {
            event_id: event_id.to_string(),
            project_root: root.path().to_string_lossy().into_owned(),
            path: "report.md".to_string(),
            kind: "mentioned_in_final_response".to_string(),
            observed_at: "2026-07-30T06:03:00Z".to_string(),
            run_reference: run_reference.to_string(),
            evidence_source: "final_answer_file_link".to_string(),
        };
        let first = event("delivery-1", "run-1");
        let candidates = classify_artifact_candidates(
            root.path(),
            &ArtifactDiscoveryInput {
                project_library_id: 1,
                source_adapter_id: "codex".to_string(),
                scope_kind: "project".to_string(),
                observed_files: Vec::new(),
                events: vec![first.clone(), first, event("delivery-2", "run-2")],
                manifest_entries: Vec::new(),
            },
        );

        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0].evidence.len(), 2);
        assert_ne!(
            candidates[0].evidence[0].run_reference_hash,
            candidates[0].evidence[1].run_reference_hash
        );
    }

    #[test]
    fn bounded_scan_reports_partial_without_overrunning_entry_limit() {
        let root = tempdir().expect("project");
        for index in 0..8 {
            fs::write(root.path().join(format!("report-{index}.md")), "# Report")
                .expect("report");
        }

        let observation = observe_project_files_bounded(
            root.path(),
            ArtifactScanLimits {
                max_depth: 2,
                max_entries: 4,
                max_duration: Duration::from_secs(1),
            },
            &AtomicBool::new(false),
        );

        assert_eq!(observation.status, "partial");
        assert_eq!(observation.issue.as_deref(), Some("entry_limit"));
        assert!(observation.files.len() <= 4);
    }

    #[test]
    fn configured_depth_boundary_is_complete_not_an_operational_failure() {
        let root = tempdir().expect("project");
        fs::create_dir_all(root.path().join("one/two/three")).expect("deep folders");
        fs::write(root.path().join("one/report.md"), "# Report").expect("visible report");
        fs::write(root.path().join("one/two/three/hidden.md"), "# Hidden")
            .expect("out-of-contract report");

        let observation = observe_project_files_bounded(
            root.path(),
            ArtifactScanLimits {
                max_depth: 1,
                max_entries: 100,
                max_duration: Duration::from_secs(1),
            },
            &AtomicBool::new(false),
        );

        assert_eq!(observation.status, "complete");
        assert_eq!(observation.issue, None);
        assert_eq!(observation.files.len(), 1);
    }

    #[cfg(unix)]
    #[test]
    fn bounded_scan_never_follows_directory_symlinks() {
        use std::os::unix::fs::symlink;

        let root = tempdir().expect("project");
        let outside = tempdir().expect("outside");
        fs::write(outside.path().join("outside.md"), "# Outside").expect("outside file");
        symlink(outside.path(), root.path().join("linked-outside")).expect("outside link");

        let observation = observe_project_files_bounded(
            root.path(),
            ArtifactScanLimits::default(),
            &AtomicBool::new(false),
        );

        assert_eq!(observation.status, "complete");
        assert!(observation.files.is_empty());
    }

    #[test]
    fn cancelled_scan_is_partial_and_does_not_claim_completion() {
        let root = tempdir().expect("project");
        fs::write(root.path().join("report.md"), "# Report").expect("report");
        let cancelled = AtomicBool::new(true);

        let observation = observe_project_files_bounded(
            root.path(),
            ArtifactScanLimits::default(),
            &cancelled,
        );

        assert_eq!(observation.status, "partial");
        assert_eq!(observation.issue.as_deref(), Some("cancelled"));
        assert!(observation.files.is_empty());
    }

    #[test]
    fn workbuddy_task_membership_is_pending_not_agent_authorship() {
        let root = tempdir().expect("task");
        fs::write(root.path().join("report.md"), "# Report").expect("report");
        let candidates = classify_artifact_candidates(
            root.path(),
            &ArtifactDiscoveryInput {
                project_library_id: 1,
                source_adapter_id: "workbuddy".to_string(),
                scope_kind: "task".to_string(),
                observed_files: vec![ObservedProjectFile {
                    path: "report.md".to_string(),
                    file_size: 8,
                    modified_at: None,
                    appeared_during_agent_run: false,
                }],
                events: Vec::new(),
                manifest_entries: Vec::new(),
            },
        );

        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0].status, "pending");
        assert_eq!(
            candidates[0].reasons,
            vec![DiscoveryReasonKind::InsideProviderTaskScope]
        );
        assert!(!candidates[0]
            .reasons
            .contains(&DiscoveryReasonKind::CreatedByAgentTool));
    }

    #[test]
    fn two_hundred_candidates_return_compact_group_summaries() {
        let candidates = (0..200)
            .map(|index| ArtifactCandidate {
                id: None,
                project_library_id: 1,
                agent_kind: "codex".to_string(),
                primary_path: format!("reports/report-{index:03}.md"),
                artifact_kind: "markdown".to_string(),
                status: "pending".to_string(),
                batch_key: "run-window:fixture".to_string(),
                reasons: vec![DiscoveryReasonKind::AppearedDuringAgentRun],
                discovery_fingerprint: format!("fingerprint-{index}"),
                file_size: 10,
                modified_at: None,
                related_files: Vec::new(),
                evidence: Vec::new(),
            })
            .collect::<Vec<_>>();

        let groups = summarize_candidate_groups(&candidates);

        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].count, 200);
        assert_eq!(groups[0].representative_paths.len(), 3);
    }
}
