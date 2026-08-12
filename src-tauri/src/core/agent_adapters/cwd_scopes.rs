use std::{collections::BTreeMap, env, fs, io::{BufRead, BufReader}, path::{Path, PathBuf}, time::SystemTime};

use chrono::{DateTime, SecondsFormat, Utc};
use serde_json::Value;

use crate::models::DiscoveredAgentScope;

pub fn first_json_cwd(path: &Path) -> Option<String> {
    let file = fs::File::open(path).ok()?;
    let mut line = String::new();
    BufReader::new(file).read_line(&mut line).ok()?;
    if line.is_empty() { return None; }
    serde_json::from_str::<Value>(&line)
        .ok()?
        .get("cwd")?
        .as_str()
        .map(str::to_owned)
}

pub fn scopes_from_cwds(
    adapter_id: &str,
    adapter_profile: &str,
    records: Vec<(String, SystemTime)>,
) -> Vec<DiscoveredAgentScope> {
    let mut grouped = BTreeMap::<String, (u32, SystemTime)>::new();
    for (cwd, modified_at) in records {
        let Ok(canonical) = fs::canonicalize(cwd) else { continue; };
        if !canonical.is_dir() { continue; }
        if is_openclaw_system_workspace(&canonical) { continue; }
        let root_path = canonical.to_string_lossy().into_owned();
        let entry = grouped.entry(root_path).or_insert((0, modified_at));
        entry.0 += 1;
        if modified_at > entry.1 { entry.1 = modified_at; }
    }
    grouped
        .into_iter()
        .map(|(root_path, (source_record_count, modified_at))| {
            let display_name = Path::new(&root_path)
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or(&root_path)
                .to_string();
            DiscoveredAgentScope {
                adapter_id: adapter_id.to_string(),
                adapter_profile: adapter_profile.to_string(),
                external_scope_id: format!("{adapter_id}:project:{root_path}"),
                scope_kind: "project".to_string(),
                root_path,
                display_name,
                last_activity_at: DateTime::<Utc>::from(modified_at)
                    .to_rfc3339_opts(SecondsFormat::Secs, true),
                capability: "scope-only".to_string(),
                source_record_count,
            }
        })
        .collect()
}

fn is_openclaw_system_workspace(path: &Path) -> bool {
    let Some(home) = env::var_os("HOME") else { return false; };
    is_openclaw_system_workspace_under(path, &PathBuf::from(home).join(".openclaw"))
}

pub(crate) fn is_openclaw_system_workspace_under(path: &Path, openclaw_root: &Path) -> bool {
    let Ok(path) = fs::canonicalize(path) else { return false; };
    let Ok(openclaw_root) = fs::canonicalize(openclaw_root) else { return false; };
    if path == openclaw_root.join("workspace") {
        return true;
    }
    path.parent() == Some(openclaw_root.as_path())
        && path.file_name().and_then(|name| name.to_str()).is_some_and(|name| {
            name.starts_with("workspace-") && name.ends_with("-agent")
        })
}

#[cfg(test)]
mod tests {
    use std::fs;
    use tempfile::tempdir;

    use super::is_openclaw_system_workspace_under;

    #[test]
    fn excludes_only_openclaw_workspace_roots_not_real_child_projects() {
        let home = tempdir().expect("home");
        let openclaw = home.path().join(".openclaw");
        let main_workspace = openclaw.join("workspace");
        let child_project = main_workspace.join("nutbook");
        let subagent_workspace = openclaw.join("workspace-research-agent");
        fs::create_dir_all(&child_project).expect("child project");
        fs::create_dir_all(&subagent_workspace).expect("subagent workspace");

        assert!(is_openclaw_system_workspace_under(&main_workspace, &openclaw));
        assert!(is_openclaw_system_workspace_under(&subagent_workspace, &openclaw));
        assert!(!is_openclaw_system_workspace_under(&child_project, &openclaw));
    }
}
