use std::{
    collections::{BTreeMap, BTreeSet},
    env,
    fs,
    io::{BufRead, BufReader},
    path::{Component, Path, PathBuf},
};

use chrono::{DateTime, Utc};
use rusqlite::{Connection, OpenFlags};
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::{
    core::agent_adapters::AgentWorkspaceAdapter,
    errors::AppError,
    models::{AgentArtifactEvent, AgentInstallation, AgentScopeDiscoveryPayload, DiscoveredAgentScope},
};

const ADAPTER_ID: &str = "codex";
const ADAPTER_PROFILE: &str = "codex-local-0.146";
const VERIFIED_CLI_VERSION: &str = "0.146.0-alpha.3.1";
const CAPABILITY_PROJECTS: &str = "project-only";
const CAPABILITY_EVENTS: &str = "project-and-verified-events";
const MAX_ROLLOUT_LINE_BYTES: usize = 8 * 1024 * 1024;
const REQUIRED_THREAD_COLUMNS: &[&str] = &[
    "id",
    "rollout_path",
    "updated_at",
    "source",
    "cwd",
    "cli_version",
    "thread_source",
];

#[derive(Debug, Clone)]
pub struct CodexAdapter {
    sqlite_home: PathBuf,
}

#[derive(Debug)]
enum DiscoveryFailure {
    NotInstalled,
    Unreadable,
    UnsupportedFormat,
}

#[derive(Debug)]
struct ThreadProjectRow {
    id: String,
    cwd: String,
    updated_at: i64,
    cli_version: String,
}

#[derive(Debug)]
struct ProjectAccumulator {
    root_path: String,
    cli_version: String,
    last_activity: i64,
    thread_ids: BTreeSet<String>,
}

impl CodexAdapter {
    pub fn from_environment() -> Self {
        let codex_home = env::var_os("CODEX_HOME")
            .map(PathBuf::from)
            .or_else(|| env::var_os("HOME").map(|home| PathBuf::from(home).join(".codex")))
            .unwrap_or_default();
        let sqlite_home = env::var_os("CODEX_SQLITE_HOME")
            .map(PathBuf::from)
            .unwrap_or_else(|| codex_home.clone());
        Self { sqlite_home }
    }

    #[cfg(test)]
    fn with_roots(_codex_home: PathBuf, sqlite_home: PathBuf) -> Self {
        Self { sqlite_home }
    }

    pub fn discovery_payload(&self) -> AgentScopeDiscoveryPayload {
        match self.discover_projects_internal() {
            Ok((scopes, version)) => AgentScopeDiscoveryPayload {
                installations: vec![AgentInstallation {
                    adapter_id: ADAPTER_ID.to_string(),
                    adapter_profile: Some(ADAPTER_PROFILE.to_string()),
                    status: "ready".to_string(),
                    capability: if version.as_deref() == Some(VERIFIED_CLI_VERSION) {
                        CAPABILITY_EVENTS.to_string()
                    } else {
                        CAPABILITY_PROJECTS.to_string()
                    },
                    cli_version: version,
                    error_kind: None,
                    error_message: None,
                }],
                scopes,
                artifact_summaries: Vec::new(),
            },
            Err(failure) => {
                let (status, error_kind, message) = match failure {
                    DiscoveryFailure::NotInstalled => (
                        "not-found",
                        "not_installed",
                        "No readable Codex project index was found.",
                    ),
                    DiscoveryFailure::Unreadable => (
                        "unavailable",
                        "unreadable",
                        "Codex project metadata could not be read.",
                    ),
                    DiscoveryFailure::UnsupportedFormat => (
                        "unsupported",
                        "unsupported_format",
                        "This Codex metadata version is not supported yet.",
                    ),
                };
                AgentScopeDiscoveryPayload {
                    installations: vec![AgentInstallation {
                        adapter_id: ADAPTER_ID.to_string(),
                        adapter_profile: None,
                        status: status.to_string(),
                        capability: CAPABILITY_PROJECTS.to_string(),
                        cli_version: None,
                        error_kind: Some(error_kind.to_string()),
                        error_message: Some(message.to_string()),
                    }],
                    scopes: Vec::new(),
                    artifact_summaries: Vec::new(),
                }
            }
        }
    }

    pub fn artifact_events_for_project(
        &self,
        project_root: &Path,
    ) -> Result<Vec<AgentArtifactEvent>, AppError> {
        let project_root = fs::canonicalize(project_root).map_err(|_| AppError::InvalidParams)?;
        let database_path = self.find_state_database().ok_or(AppError::IoError)?;
        let connection = Connection::open_with_flags(
            database_path,
            OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
        )
        .map_err(|_| AppError::IoError)?;
        let mut statement = connection
            .prepare(
                "SELECT cwd, rollout_path
                 FROM threads
                 WHERE thread_source = 'user'
                   AND source IN ('cli', 'vscode')
                   AND cli_version = ?1
                   AND rollout_path IS NOT NULL
                 ORDER BY updated_at DESC",
            )
            .map_err(|_| AppError::DatabaseError)?;
        let rollout_paths = statement
            .query_map(
                rusqlite::params![VERIFIED_CLI_VERSION],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)),
            )
            .map_err(|_| AppError::DatabaseError)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)?;
        let mut events = Vec::new();
        for (cwd, rollout_path) in rollout_paths {
            if fs::canonicalize(cwd).ok().as_ref() != Some(&project_root) {
                continue;
            }
            if let Ok(mut rollout_events) =
                self.parse_rollout_events(&project_root, Path::new(&rollout_path))
            {
                events.append(&mut rollout_events);
            }
        }
        events.sort_by(|left, right| left.event_id.cmp(&right.event_id));
        events.dedup_by(|left, right| left.event_id == right.event_id);
        Ok(events)
    }

    fn discover_projects_internal(
        &self,
    ) -> Result<(Vec<DiscoveredAgentScope>, Option<String>), DiscoveryFailure> {
        let database_path = self
            .find_state_database()
            .ok_or(DiscoveryFailure::NotInstalled)?;
        let connection = Connection::open_with_flags(
            &database_path,
            OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
        )
        .map_err(|_| DiscoveryFailure::Unreadable)?;
        let columns = thread_columns(&connection).map_err(|_| DiscoveryFailure::Unreadable)?;
        if REQUIRED_THREAD_COLUMNS
            .iter()
            .any(|required| !columns.contains(*required))
        {
            return Err(DiscoveryFailure::UnsupportedFormat);
        }

        let mut statement = connection
            .prepare(
                "SELECT id, cwd, updated_at, cli_version
                 FROM threads
                 WHERE thread_source = 'user'
                   AND source IN ('cli', 'vscode')
                   AND cwd <> ''
                 ORDER BY updated_at DESC",
            )
            .map_err(|_| DiscoveryFailure::UnsupportedFormat)?;
        let rows = statement
            .query_map([], |row| {
                Ok(ThreadProjectRow {
                    id: row.get(0)?,
                    cwd: row.get(1)?,
                    updated_at: row.get(2)?,
                    cli_version: row.get(3)?,
                })
            })
            .map_err(|_| DiscoveryFailure::Unreadable)?;

        let mut projects = BTreeMap::<String, ProjectAccumulator>::new();
        let mut observed_versions = BTreeSet::new();
        for row in rows {
            let row = row.map_err(|_| DiscoveryFailure::Unreadable)?;
            observed_versions.insert(row.cli_version.clone());
            if row.cli_version != VERIFIED_CLI_VERSION {
                continue;
            }
            let path = PathBuf::from(&row.cwd);
            let Ok(canonical) = fs::canonicalize(&path) else {
                continue;
            };
            if !canonical.is_dir() {
                continue;
            }
            let normalized = canonical.to_string_lossy().into_owned();
            let entry = projects
                .entry(normalized.clone())
                .or_insert_with(|| ProjectAccumulator {
                    root_path: normalized,
                    cli_version: row.cli_version.clone(),
                    last_activity: row.updated_at,
                    thread_ids: BTreeSet::new(),
                });
            entry.last_activity = entry.last_activity.max(row.updated_at);
            entry.thread_ids.insert(row.id);
        }

        if projects.is_empty() && !observed_versions.is_empty() {
            return Err(DiscoveryFailure::UnsupportedFormat);
        }
        let version = observed_versions
            .iter()
            .find(|version| version.as_str() == VERIFIED_CLI_VERSION)
            .cloned()
            .or_else(|| observed_versions.iter().next().cloned());
        let mut discovered = projects
            .into_values()
            .map(project_from_accumulator)
            .collect::<Vec<_>>();
        discovered.sort_by(|left, right| {
            right
                .last_activity_at
                .cmp(&left.last_activity_at)
                .then_with(|| left.root_path.cmp(&right.root_path))
        });
        Ok((discovered, version))
    }

    fn find_state_database(&self) -> Option<PathBuf> {
        if self.sqlite_home.as_os_str().is_empty() || !self.sqlite_home.is_dir() {
            return None;
        }
        let mut candidates = fs::read_dir(&self.sqlite_home)
            .ok()?
            .filter_map(Result::ok)
            .filter_map(|entry| {
                let name = entry.file_name();
                let name = name.to_str()?;
                let version = name
                    .strip_prefix("state_")?
                    .strip_suffix(".sqlite")?
                    .parse::<u32>()
                    .ok()?;
                Some((version, entry.path()))
            })
            .collect::<Vec<_>>();
        candidates.sort_by_key(|(version, _)| *version);
        candidates.pop().map(|(_, path)| path)
    }

    fn parse_rollout_events(
        &self,
        project_root: &Path,
        rollout_path: &Path,
    ) -> Result<Vec<AgentArtifactEvent>, AppError> {
        let project_root = fs::canonicalize(project_root).map_err(|_| AppError::IoError)?;
        let file = fs::File::open(rollout_path).map_err(|_| AppError::IoError)?;
        let mut events = Vec::new();
        let mut session_id = None::<String>;
        for line in BufReader::new(file).lines() {
            let line = line.map_err(|_| AppError::IoError)?;
            if line.trim().is_empty() {
                continue;
            }
            if line.len() > MAX_ROLLOUT_LINE_BYTES {
                return Err(AppError::InvalidParams);
            }
            let record = serde_json::from_str::<Value>(&line).map_err(|_| AppError::InvalidParams)?;
            match record.get("type").and_then(Value::as_str) {
                Some("session_meta") => {
                    let payload = record.get("payload").ok_or(AppError::InvalidParams)?;
                    if payload.get("cli_version").and_then(Value::as_str)
                        != Some(VERIFIED_CLI_VERSION)
                    {
                        return Err(AppError::InvalidParams);
                    }
                    let cwd = payload
                        .get("cwd")
                        .and_then(Value::as_str)
                        .ok_or(AppError::InvalidParams)?;
                    let cwd = fs::canonicalize(cwd).map_err(|_| AppError::InvalidParams)?;
                    if cwd != project_root {
                        return Err(AppError::InvalidParams);
                    }
                    session_id = payload
                        .get("session_id")
                        .or_else(|| payload.get("id"))
                        .and_then(Value::as_str)
                        .map(str::to_string);
                }
                Some("event_msg") => {
                    let payload = record.get("payload").ok_or(AppError::InvalidParams)?;
                    if payload.get("type").and_then(Value::as_str) != Some("patch_apply_end")
                        || payload.get("success").and_then(Value::as_bool) != Some(true)
                    {
                        continue;
                    }
                    let call_id = payload
                        .get("call_id")
                        .and_then(Value::as_str)
                        .ok_or(AppError::InvalidParams)?;
                    let observed_at = record_timestamp(&record)?;
                    let changes = payload
                        .get("changes")
                        .and_then(Value::as_object)
                        .ok_or(AppError::InvalidParams)?;
                    for absolute in changes.keys() {
                        let Some(relative) = project_relative_path(&project_root, Path::new(absolute))
                        else {
                            continue;
                        };
                        events.push(AgentArtifactEvent {
                            event_id: format!(
                                "codex:{call_id}:{}:write",
                                relative.replace('\\', "/")
                            ),
                            project_root: project_root.to_string_lossy().into_owned(),
                            path: relative,
                            kind: "created_by_agent_tool".to_string(),
                            observed_at: observed_at.clone(),
                            run_reference: session_id.clone().unwrap_or_default(),
                            evidence_source: "successful_patch_apply_end".to_string(),
                        });
                    }
                }
                Some("response_item") => {
                    let payload = record.get("payload").ok_or(AppError::InvalidParams)?;
                    if payload.get("type").and_then(Value::as_str) != Some("message")
                        || payload.get("role").and_then(Value::as_str) != Some("assistant")
                        || payload.get("phase").and_then(Value::as_str) != Some("final_answer")
                    {
                        continue;
                    }
                    let item_id = payload
                        .get("id")
                        .and_then(Value::as_str)
                        .ok_or(AppError::InvalidParams)?;
                    let observed_at = record_timestamp(&record)?;
                    let Some(content) = payload.get("content").and_then(Value::as_array) else {
                        continue;
                    };
                    for part in content {
                        let Some(text) = part.get("text").and_then(Value::as_str) else {
                            continue;
                        };
                        for linked_path in markdown_link_targets(text) {
                            let absolute = if linked_path.is_absolute() {
                                linked_path
                            } else {
                                project_root.join(linked_path)
                            };
                            let Some(relative) =
                                project_relative_path(&project_root, &absolute)
                            else {
                                continue;
                            };
                            events.push(AgentArtifactEvent {
                                event_id: format!(
                                    "codex:{item_id}:{}:delivery",
                                    relative.replace('\\', "/")
                                ),
                                project_root: project_root.to_string_lossy().into_owned(),
                                path: relative,
                                kind: "mentioned_in_final_response".to_string(),
                                observed_at: observed_at.clone(),
                                run_reference: session_id.clone().unwrap_or_default(),
                                evidence_source: "final_answer_file_link".to_string(),
                            });
                        }
                    }
                }
                _ => {}
            }
        }
        if session_id.is_none() {
            return Err(AppError::InvalidParams);
        }
        events.sort_by(|left, right| left.event_id.cmp(&right.event_id));
        events.dedup_by(|left, right| left.event_id == right.event_id);
        Ok(events)
    }
}

impl AgentWorkspaceAdapter for CodexAdapter {
    fn adapter_id(&self) -> &'static str {
        ADAPTER_ID
    }

    fn detect_installations(&self) -> Result<Vec<AgentInstallation>, AppError> {
        Ok(self.discovery_payload().installations)
    }

    fn discover_scopes(&self) -> Result<Vec<DiscoveredAgentScope>, AppError> {
        Ok(self.discovery_payload().scopes)
    }

    fn discover_artifact_events(
        &self,
        scope: &DiscoveredAgentScope,
    ) -> Result<Vec<AgentArtifactEvent>, AppError> {
        if scope.adapter_id != ADAPTER_ID || scope.scope_kind != "project" {
            return Err(AppError::InvalidParams);
        }
        self.artifact_events_for_project(Path::new(&scope.root_path))
    }
}

fn thread_columns(connection: &Connection) -> rusqlite::Result<BTreeSet<String>> {
    let mut statement = connection.prepare("PRAGMA table_info(threads)")?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))?
        .collect();
    columns
}

fn project_from_accumulator(project: ProjectAccumulator) -> DiscoveredAgentScope {
    let display_name = Path::new(&project.root_path)
        .file_name()
        .and_then(|name| name.to_str())
        .filter(|name| !name.is_empty())
        .unwrap_or(&project.root_path)
        .to_string();
    let mut digest = Sha256::new();
    digest.update(project.root_path.as_bytes());
    let external_scope_id = format!("codex:workspace:{:x}", digest.finalize());
    let last_activity_at = DateTime::<Utc>::from_timestamp(project.last_activity, 0)
        .unwrap_or(DateTime::<Utc>::UNIX_EPOCH)
        .to_rfc3339_opts(chrono::SecondsFormat::Secs, true);
    DiscoveredAgentScope {
        adapter_id: ADAPTER_ID.to_string(),
        adapter_profile: ADAPTER_PROFILE.to_string(),
        external_scope_id,
        scope_kind: "project".to_string(),
        root_path: project.root_path,
        display_name,
        last_activity_at,
        capability: if project.cli_version == VERIFIED_CLI_VERSION {
            CAPABILITY_EVENTS.to_string()
        } else {
            CAPABILITY_PROJECTS.to_string()
        },
        source_record_count: project.thread_ids.len().try_into().unwrap_or(u32::MAX),
    }
}

fn project_relative_path(project_root: &Path, path: &Path) -> Option<String> {
    let canonical = fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    let relative = canonical.strip_prefix(project_root).ok()?;
    if relative.as_os_str().is_empty()
        || relative
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
    {
        return None;
    }
    Some(relative.to_string_lossy().replace('\\', "/"))
}

fn markdown_link_targets(text: &str) -> Vec<PathBuf> {
    let mut targets = Vec::new();
    let mut remaining = text;
    while let Some(open) = remaining.find("](") {
        let after_open = &remaining[open + 2..];
        let Some(close) = after_open.find(')') else {
            break;
        };
        let target = after_open[..close].trim();
        if !target.is_empty()
            && !target.starts_with("http://")
            && !target.starts_with("https://")
            && !target.starts_with("file://")
        {
            targets.push(PathBuf::from(target));
        }
        remaining = &after_open[close + 1..];
    }
    targets
}

fn record_timestamp(record: &Value) -> Result<String, AppError> {
    record
        .get("timestamp")
        .and_then(Value::as_str)
        .map(|timestamp| timestamp.trim_end_matches(".000Z").to_string() + "Z")
        .ok_or(AppError::InvalidParams)
}

#[cfg(test)]
mod tests {
    use std::{
        collections::BTreeSet,
        fs,
        path::{Path, PathBuf},
    };

    use rusqlite::Connection;
    use serde_json::Value;
    use tempfile::tempdir;

    use super::{CodexAdapter, ADAPTER_PROFILE, VERIFIED_CLI_VERSION};

    fn create_state_database(
        path: &Path,
        project_root: &Path,
        cli_version: &str,
        include_required_columns: bool,
    ) {
        let connection = Connection::open(path).expect("state database");
        if include_required_columns {
            connection.execute_batch(
                "CREATE TABLE threads (
                    id TEXT PRIMARY KEY,
                    rollout_path TEXT NOT NULL,
                    updated_at INTEGER NOT NULL,
                    source TEXT NOT NULL,
                    cwd TEXT NOT NULL,
                    cli_version TEXT NOT NULL,
                    thread_source TEXT NOT NULL
                );",
            )
            .expect("threads schema");
            connection
                .execute(
                    "INSERT INTO threads (
                        id, rollout_path, updated_at, source, cwd, cli_version, thread_source
                     ) VALUES (?1, ?2, ?3, 'vscode', ?4, ?5, 'user')",
                    (
                        "00000000-0000-7000-8000-000000000001",
                        "/codex-home/sessions/rollout-fixture.jsonl",
                        1_785_391_800_i64,
                        project_root.to_string_lossy().as_ref(),
                        cli_version,
                    ),
                )
                .expect("thread row");
        } else {
            connection
                .execute_batch("CREATE TABLE threads (id TEXT PRIMARY KEY, cwd TEXT NOT NULL);")
                .expect("partial schema");
        }
    }

    fn fixture_root() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests/fixtures/agent-artifact-discovery")
    }

    #[test]
    fn agent_adapter_discovers_projects_from_verified_state_profile() {
        let root = tempdir().expect("temp root");
        let project = root.path().join("sample-agent-project");
        fs::create_dir(&project).expect("project");
        let database = root.path().join("state_5.sqlite");
        create_state_database(&database, &project, VERIFIED_CLI_VERSION, true);
        let adapter = CodexAdapter::with_roots(root.path().to_path_buf(), root.path().to_path_buf());

        let payload = adapter.discovery_payload();

        assert_eq!(payload.installations[0].status, "ready");
        assert_eq!(payload.installations[0].adapter_profile.as_deref(), Some(ADAPTER_PROFILE));
        assert_eq!(payload.scopes.len(), 1);
        assert_eq!(payload.scopes[0].scope_kind, "project");
        assert_eq!(payload.scopes[0].display_name, "sample-agent-project");
        assert_eq!(payload.scopes[0].root_path, fs::canonicalize(project).unwrap().to_string_lossy());
        assert_eq!(payload.scopes[0].last_activity_at, "2026-07-30T06:10:00Z");
    }

    #[test]
    fn agent_adapter_rejects_missing_required_thread_fields() {
        let root = tempdir().expect("temp root");
        let database = root.path().join("state_5.sqlite");
        create_state_database(&database, root.path(), VERIFIED_CLI_VERSION, false);
        let adapter = CodexAdapter::with_roots(root.path().to_path_buf(), root.path().to_path_buf());

        let payload = adapter.discovery_payload();

        assert_eq!(payload.installations[0].status, "unsupported");
        assert_eq!(payload.installations[0].error_kind.as_deref(), Some("unsupported_format"));
        assert!(payload.scopes.is_empty());
    }

    #[test]
    fn agent_adapter_rejects_unknown_cli_version_instead_of_guessing() {
        let root = tempdir().expect("temp root");
        let project = root.path().join("sample-agent-project");
        fs::create_dir(&project).expect("project");
        let database = root.path().join("state_5.sqlite");
        create_state_database(&database, &project, "0.147.0", true);
        let adapter = CodexAdapter::with_roots(root.path().to_path_buf(), root.path().to_path_buf());

        let payload = adapter.discovery_payload();

        assert_eq!(payload.installations[0].status, "unsupported");
        assert!(payload.scopes.is_empty());
    }

    #[test]
    fn agent_adapter_reports_unreadable_state_database() {
        let root = tempdir().expect("temp root");
        fs::create_dir(root.path().join("state_5.sqlite")).expect("database-shaped directory");
        let adapter = CodexAdapter::with_roots(root.path().to_path_buf(), root.path().to_path_buf());

        let payload = adapter.discovery_payload();

        assert_eq!(payload.installations[0].status, "unavailable");
        assert!(payload.scopes.is_empty());
    }

    #[test]
    fn agent_adapter_parses_redacted_real_format_events() {
        let fixture = fixture_root();
        let source_project = fixture.join("projects/sample-agent-project");
        let source_rollout = fixture.join("provider-records/codex/rollout-fixture.jsonl");
        let expected = serde_json::from_str::<Vec<Value>>(
            &fs::read_to_string(fixture.join("provider-records/codex/expected-events.json"))
                .expect("expected events"),
        )
        .expect("expected event JSON");
        let root = tempdir().expect("mapped fixture root");
        let mapped_project = root.path().join("sample-agent-project");
        copy_fixture_project(&source_project, &mapped_project);
        let mapped_rollout = root.path().join("rollout-fixture.jsonl");
        let source_text = fs::read_to_string(source_rollout).expect("source rollout");
        fs::write(
            &mapped_rollout,
            source_text.replace("/workspace/sample-agent-project", &mapped_project.to_string_lossy()),
        )
        .expect("mapped rollout");
        let adapter = CodexAdapter::with_roots(root.path().to_path_buf(), root.path().to_path_buf());

        let events = adapter
            .parse_rollout_events(&mapped_project, &mapped_rollout)
            .expect("fixture events");

        assert_eq!(events.len(), expected.len());
        let actual_pairs = events
            .iter()
            .map(|event| (event.path.as_str(), event.kind.as_str()))
            .collect::<BTreeSet<_>>();
        let expected_pairs = expected
            .iter()
            .map(|event| {
                (
                    event.get("path").and_then(Value::as_str).unwrap(),
                    event.get("kind").and_then(Value::as_str).unwrap(),
                )
            })
            .collect::<BTreeSet<_>>();
        assert_eq!(actual_pairs, expected_pairs);
    }

    fn copy_fixture_project(source: &Path, target: &Path) {
        fs::create_dir_all(target).expect("target");
        for entry in fs::read_dir(source).expect("source") {
            let entry = entry.expect("entry");
            let destination = target.join(entry.file_name());
            if entry.file_type().expect("type").is_dir() {
                copy_fixture_project(&entry.path(), &destination);
            } else if !entry.file_type().expect("type").is_symlink() {
                fs::copy(entry.path(), destination).expect("copy fixture file");
            }
        }
    }
}
