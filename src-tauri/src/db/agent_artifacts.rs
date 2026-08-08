use std::{
    collections::BTreeSet,
    fs,
    path::{Component, Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

use rusqlite::{params, Connection, OptionalExtension, Transaction};
use sha2::{Digest, Sha256};

use crate::{
    errors::AppError,
    models::{
        AgentArtifactAcceptanceResult, AgentArtifactActionItem, AgentProjectAdapterBinding,
        AgentProjectSourceSummary, AgentScopeDiscoveryPayload, ArtifactCandidate,
        DiscoveryEvidence, DiscoveryReasonKind, RelatedArtifactFile,
    },
};

use super::{canonical_root_key_for_path, Database};

#[derive(Debug)]
struct ValidCandidate {
    candidate: ArtifactCandidate,
    absolute_path: PathBuf,
    file_identity: FileIdentity,
    related_files: Vec<(PathBuf, String, FileIdentity)>,
    file_size: i64,
    modified_at: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct FileIdentity {
    device: u64,
    inode: u64,
    len: u64,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ManifestHtmlEditDeclaration {
    pub project_library_id: i64,
    pub manifest_entry_id: String,
    pub edit_contract: Option<String>,
    pub save_policy: Option<String>,
}

impl Database {
    pub fn save_agent_discovery_cache(
        &self,
        payload: &AgentScopeDiscoveryPayload,
        discovered_at: &str,
    ) -> Result<(), AppError> {
        let payload_json = serde_json::to_string(payload).map_err(|_| AppError::DatabaseError)?;
        let connection = self.connection()?;
        connection
            .execute(
                "INSERT INTO agent_discovery_cache (id, payload_json, discovered_at)
                 VALUES (1, ?1, ?2)
                 ON CONFLICT(id) DO UPDATE SET
                   payload_json = excluded.payload_json,
                   discovered_at = excluded.discovered_at",
                params![payload_json, discovered_at],
            )
            .map_err(|_| AppError::DatabaseError)?;
        Ok(())
    }

    pub fn load_agent_discovery_cache(
        &self,
    ) -> Result<Option<AgentScopeDiscoveryPayload>, AppError> {
        let connection = self.connection()?;
        let payload_json = connection
            .query_row(
                "SELECT payload_json FROM agent_discovery_cache WHERE id = 1",
                [],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|_| AppError::DatabaseError)?;
        payload_json
            .map(|payload| {
                serde_json::from_str(&payload).map_err(|_| AppError::DatabaseError)
            })
            .transpose()
    }

    pub fn manifest_html_edit_declarations_for_item(
        &self,
        item_id: i64,
    ) -> Result<Vec<ManifestHtmlEditDeclaration>, AppError> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT DISTINCT project_library_id, manifest_entry_id,
                        edit_contract, save_policy
                 FROM item_provenance
                 WHERE item_id = ?1 AND manifest_entry_id IS NOT NULL
                 ORDER BY project_library_id, manifest_entry_id",
            )
            .map_err(|_| AppError::DatabaseError)?;
        let rows = statement
            .query_map(params![item_id], |row| {
                Ok(ManifestHtmlEditDeclaration {
                    project_library_id: row.get(0)?,
                    manifest_entry_id: row.get(1)?,
                    edit_contract: row.get(2)?,
                    save_policy: row.get(3)?,
                })
            })
            .map_err(|_| AppError::DatabaseError)?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)
    }

    pub fn known_artifact_paths_for_root(
        &self,
        root_path: &str,
    ) -> Result<BTreeSet<String>, AppError> {
        let canonical_root = fs::canonicalize(root_path).map_err(|_| AppError::InvalidParams)?;
        let connection = self.connection()?;
        let mut paths = BTreeSet::new();
        let mut item_statement = connection
            .prepare(
                "SELECT file_path
                 FROM items
                 WHERE path_state = 'valid' AND is_deleted = 0",
            )
            .map_err(|_| AppError::DatabaseError)?;
        let item_rows = item_statement
            .query_map([], |row| row.get::<_, String>(0))
            .map_err(|_| AppError::DatabaseError)?;
        for row in item_rows {
            let file_path = row.map_err(|_| AppError::DatabaseError)?;
            let Ok(canonical_file) = fs::canonicalize(file_path) else {
                continue;
            };
            let Ok(relative_path) = canonical_file.strip_prefix(&canonical_root) else {
                continue;
            };
            if relative_path.as_os_str().is_empty() {
                continue;
            }
            paths.insert(relative_path.to_string_lossy().replace('\\', "/"));
        }
        Ok(paths)
    }

    pub fn reconcile_accepted_agent_candidates(
        &self,
        project_library_id: i64,
        known_paths: &BTreeSet<String>,
        observed_paths: &BTreeSet<String>,
    ) -> Result<(), AppError> {
        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;
        let mut statement = transaction
            .prepare(
                "SELECT id, primary_path
                 FROM artifact_candidates
                 WHERE project_library_id = ?1 AND status = 'accepted'",
            )
            .map_err(|_| AppError::DatabaseError)?;
        let accepted = statement
            .query_map(params![project_library_id], |row| {
                Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|_| AppError::DatabaseError)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)?;
        drop(statement);
        for (candidate_id, primary_path) in accepted {
            if known_paths.contains(&primary_path) || !observed_paths.contains(&primary_path) {
                continue;
            }
            transaction
                .execute(
                    "UPDATE artifact_candidates SET status = 'pending' WHERE id = ?1",
                    params![candidate_id],
                )
                .map_err(|_| AppError::DatabaseError)?;
        }
        transaction.commit().map_err(|_| AppError::DatabaseError)
    }

    pub fn remove_undecided_agent_candidates_for_paths(
        &self,
        project_library_id: i64,
        paths: &BTreeSet<String>,
    ) -> Result<(), AppError> {
        if paths.is_empty() {
            return Ok(());
        }
        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;
        for path in paths {
            transaction
                .execute(
                    "DELETE FROM artifact_candidates
                     WHERE project_library_id = ?1
                       AND primary_path = ?2
                       AND status IN ('suggested', 'pending', 'excluded', 'missing')",
                    params![project_library_id, path],
                )
                .map_err(|_| AppError::DatabaseError)?;
        }
        transaction.commit().map_err(|_| AppError::DatabaseError)
    }

    pub fn connect_agent_project_source(
        &self,
        adapter_id: &str,
        adapter_profile: Option<&str>,
        external_scope_id: &str,
        scope_kind: &str,
        capability: &str,
        root_path: &str,
        display_name: Option<&str>,
        now: &str,
    ) -> Result<AgentProjectSourceSummary, AppError> {
        let adapter_id = adapter_id.trim();
        let external_scope_id = external_scope_id.trim();
        if adapter_id.is_empty()
            || external_scope_id.is_empty()
            || !matches!(scope_kind, "project" | "task")
            || capability.trim().is_empty()
        {
            return Err(AppError::InvalidParams);
        }
        let root = fs::canonicalize(root_path).map_err(|_| AppError::InvalidParams)?;
        if !root.is_dir() {
            return Err(AppError::InvalidParams);
        }
        let root_path = root.to_string_lossy().into_owned();
        let canonical_root_key = canonical_root_key_for_path(&root_path, true)?;
        let display_name = display_name
            .map(str::trim)
            .filter(|name| !name.is_empty())
            .map(str::to_string)
            .or_else(|| {
                root.file_name()
                    .and_then(|name| name.to_str())
                    .map(str::to_string)
            })
            .ok_or(AppError::InvalidParams)?;

        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;
        let previously_bound_root = transaction
            .query_row(
                "SELECT libraries.canonical_root_key
                 FROM agent_project_adapters
                 INNER JOIN libraries ON libraries.id = agent_project_adapters.library_id
                 WHERE agent_project_adapters.adapter_id = ?1
                   AND agent_project_adapters.external_scope_id = ?2",
                params![adapter_id, external_scope_id],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|_| AppError::DatabaseError)?;
        if previously_bound_root
            .as_deref()
            .is_some_and(|bound_root| bound_root != canonical_root_key)
        {
            return Err(AppError::InvalidParams);
        }
        let existing = transaction
            .query_row(
                "SELECT id, name
                 FROM libraries
                 WHERE canonical_root_key = ?1 AND source_kind = 'agent_project'",
                params![canonical_root_key],
                |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)),
            )
            .optional()
            .map_err(|_| AppError::DatabaseError)?;
        let (library_id, stored_name) = if let Some(existing) = existing {
            existing
        } else {
            let library_id: i64 = transaction
                .query_row(
                    "SELECT COALESCE(MAX(id), 0) + 1 FROM libraries",
                    [],
                    |row| row.get(0),
                )
                .map_err(|_| AppError::DatabaseError)?;
            transaction
                .execute(
                    "INSERT INTO libraries (
                       id, name, root_path, canonical_root_key, source_kind, path_state, is_active,
                       created_at, updated_at, last_scanned_at
                     ) VALUES (
                       ?1, ?2, ?3, ?4, 'agent_project', 'valid', 1, ?5, ?5, NULL
                     )",
                    params![library_id, display_name, root_path, canonical_root_key, now],
                )
                .map_err(|_| AppError::DatabaseError)?;
            (library_id, display_name.clone())
        };

        transaction
            .execute(
                "INSERT INTO agent_project_sources (
                   library_id, scope_kind, discovery_mode,
                   manifest_path, auto_import_mode, last_manifest_ok_at,
                   last_scan_status, last_scan_issue
                 ) VALUES (
                   ?1, ?2, 'adapter', NULL, 'explicit', NULL, 'not_scanned', NULL
                 )
                 ON CONFLICT(library_id) DO UPDATE SET
                   scope_kind = CASE
                     WHEN agent_project_sources.scope_kind = 'project' THEN 'project'
                     ELSE excluded.scope_kind
                   END",
                params![library_id, scope_kind],
            )
            .map_err(|_| AppError::DatabaseError)?;
        transaction
            .execute(
                "INSERT INTO agent_project_adapters (
                   library_id, adapter_id, external_scope_id,
                   adapter_profile, capability, snapshot_status,
                   last_attempted_at, last_successful_at,
                   last_error_kind, last_error_message
                 ) VALUES (?1, ?2, ?3, ?4, ?5, 'ready', ?6, ?6, NULL, NULL)
                 ON CONFLICT(adapter_id, external_scope_id) DO UPDATE SET
                   adapter_profile = excluded.adapter_profile,
                   capability = excluded.capability,
                   snapshot_status = 'ready',
                   last_attempted_at = excluded.last_attempted_at,
                   last_successful_at = excluded.last_successful_at,
                   last_error_kind = NULL,
                   last_error_message = NULL",
                params![
                    library_id,
                    adapter_id,
                    external_scope_id,
                    adapter_profile,
                    capability,
                    now
                ],
            )
            .map_err(|_| AppError::DatabaseError)?;
        transaction.commit().map_err(|_| AppError::DatabaseError)?;

        let _ = stored_name;
        self.get_agent_project_source(library_id)
    }

    pub fn get_agent_project_source(
        &self,
        project_library_id: i64,
    ) -> Result<AgentProjectSourceSummary, AppError> {
        let connection = self.connection()?;
        let mut summary = connection
            .query_row(
                "SELECT
                   libraries.id,
                   libraries.root_path,
                   libraries.name,
                   agent_project_sources.scope_kind,
                   agent_project_sources.discovery_mode,
                   agent_project_sources.manifest_path,
                   agent_project_sources.last_manifest_ok_at,
                   agent_project_sources.auto_import_mode,
                   agent_project_sources.last_scan_status,
                   agent_project_sources.last_scan_issue
                 FROM libraries
                 INNER JOIN agent_project_sources
                   ON agent_project_sources.library_id = libraries.id
                 WHERE libraries.id = ?1
                   AND libraries.source_kind = 'agent_project'",
                params![project_library_id],
                |row| {
                    Ok(AgentProjectSourceSummary {
                        library_id: row.get(0)?,
                        root_path: row.get(1)?,
                        display_name: row.get(2)?,
                        scope_kind: row.get(3)?,
                        discovery_mode: row.get(4)?,
                        manifest_path: row.get(5)?,
                        last_manifest_ok_at: row.get(6)?,
                        auto_import_mode: row.get(7)?,
                        last_scan_status: row.get(8)?,
                        last_scan_issue: row.get(9)?,
                        adapters: Vec::new(),
                    })
                },
            )
            .map_err(|_| AppError::LibraryNotFound)?;
        summary.adapters = Self::list_agent_project_adapter_bindings(&connection, project_library_id)?;
        Ok(summary)
    }

    fn list_agent_project_adapter_bindings(
        connection: &Connection,
        project_library_id: i64,
    ) -> Result<Vec<AgentProjectAdapterBinding>, AppError> {
        let mut statement = connection
            .prepare(
                "SELECT adapter_id, external_scope_id, adapter_profile, capability,
                        snapshot_status, last_attempted_at, last_successful_at,
                        last_error_kind, last_error_message
                 FROM agent_project_adapters
                 WHERE library_id = ?1
                 ORDER BY adapter_id, external_scope_id",
            )
            .map_err(|_| AppError::DatabaseError)?;
        let bindings = statement
            .query_map(params![project_library_id], |row| {
                Ok(AgentProjectAdapterBinding {
                    adapter_id: row.get(0)?,
                    external_scope_id: row.get(1)?,
                    adapter_profile: row.get(2)?,
                    capability: row.get(3)?,
                    snapshot_status: row.get(4)?,
                    last_attempted_at: row.get(5)?,
                    last_successful_at: row.get(6)?,
                    last_error_kind: row.get(7)?,
                    last_error_message: row.get(8)?,
                })
            })
            .map_err(|_| AppError::DatabaseError)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)?;
        Ok(bindings)
    }

    pub fn record_agent_adapter_snapshot_failure(
        &self,
        project_library_id: i64,
        adapter_id: &str,
        external_scope_id: &str,
        snapshot_status: &str,
        error_kind: &str,
        error_message: &str,
        attempted_at: &str,
    ) -> Result<(), AppError> {
        if !matches!(snapshot_status, "stale" | "unsupported" | "unavailable") {
            return Err(AppError::InvalidParams);
        }
        let connection = self.connection()?;
        let changed = connection
            .execute(
                "UPDATE agent_project_adapters
                 SET snapshot_status = ?4,
                     last_attempted_at = ?5,
                     last_error_kind = ?6,
                     last_error_message = ?7
                 WHERE library_id = ?1 AND adapter_id = ?2 AND external_scope_id = ?3",
                params![
                    project_library_id,
                    adapter_id,
                    external_scope_id,
                    snapshot_status,
                    attempted_at,
                    error_kind,
                    error_message
                ],
            )
            .map_err(|_| AppError::DatabaseError)?;
        if changed == 0 {
            return Err(AppError::LibraryNotFound);
        }
        Ok(())
    }

    pub fn record_agent_adapter_snapshot_success(
        &self,
        project_library_id: i64,
        adapter_id: &str,
        external_scope_id: &str,
        successful_at: &str,
    ) -> Result<(), AppError> {
        let connection = self.connection()?;
        let changed = connection
            .execute(
                "UPDATE agent_project_adapters
                 SET snapshot_status = 'ready',
                     last_attempted_at = ?4,
                     last_successful_at = ?4,
                     last_error_kind = NULL,
                     last_error_message = NULL
                 WHERE library_id = ?1 AND adapter_id = ?2 AND external_scope_id = ?3",
                params![project_library_id, adapter_id, external_scope_id, successful_at],
            )
            .map_err(|_| AppError::DatabaseError)?;
        if changed == 0 {
            return Err(AppError::LibraryNotFound);
        }
        Ok(())
    }

    pub fn merge_agent_task_scope(
        &self,
        task_library_id: i64,
        project_library_id: i64,
    ) -> Result<AgentProjectSourceSummary, AppError> {
        if task_library_id == project_library_id {
            return Err(AppError::InvalidParams);
        }
        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;
        let scope_kinds = [task_library_id, project_library_id]
            .into_iter()
            .map(|library_id| {
                transaction
                    .query_row(
                        "SELECT scope_kind FROM agent_project_sources WHERE library_id = ?1",
                        params![library_id],
                        |row| row.get::<_, String>(0),
                    )
                    .map_err(|_| AppError::LibraryNotFound)
            })
            .collect::<Result<Vec<_>, _>>()?;
        if scope_kinds != ["task", "project"] {
            return Err(AppError::InvalidParams);
        }

        transaction
            .execute(
                "UPDATE agent_project_sources
                 SET discovery_mode = CASE
                       WHEN discovery_mode = 'hybrid'
                         OR (SELECT discovery_mode FROM agent_project_sources WHERE library_id = ?2) = 'hybrid'
                       THEN 'hybrid' ELSE discovery_mode END,
                     manifest_path = COALESCE(
                       manifest_path,
                       (SELECT manifest_path FROM agent_project_sources WHERE library_id = ?2)
                     ),
                     auto_import_mode = CASE
                       WHEN auto_import_mode = 'confirm'
                         OR (SELECT auto_import_mode FROM agent_project_sources WHERE library_id = ?2) = 'confirm'
                       THEN 'confirm' ELSE 'explicit' END,
                     last_manifest_ok_at = COALESCE(
                       last_manifest_ok_at,
                       (SELECT last_manifest_ok_at FROM agent_project_sources WHERE library_id = ?2)
                     ),
                     last_scan_status = CASE
                       WHEN last_scan_status = 'partial'
                         OR (SELECT last_scan_status FROM agent_project_sources WHERE library_id = ?2) = 'partial'
                       THEN 'partial' ELSE last_scan_status END,
                     last_scan_issue = COALESCE(
                       last_scan_issue,
                       (SELECT last_scan_issue FROM agent_project_sources WHERE library_id = ?2)
                     )
                 WHERE library_id = ?1",
                params![project_library_id, task_library_id],
            )
            .map_err(|_| AppError::DatabaseError)?;

        transaction
            .execute(
                "UPDATE agent_project_adapters SET library_id = ?1 WHERE library_id = ?2",
                params![project_library_id, task_library_id],
            )
            .map_err(|_| AppError::DatabaseError)?;

        let task_candidates = {
            let mut statement = transaction
                .prepare(
                    "SELECT id, primary_path, status
                     FROM artifact_candidates WHERE project_library_id = ?1 ORDER BY id",
                )
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map(params![task_library_id], |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                    ))
                })
                .map_err(|_| AppError::DatabaseError)?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|_| AppError::DatabaseError)?;
            rows
        };
        for (task_candidate_id, primary_path, task_status) in task_candidates {
            let target = transaction
                .query_row(
                    "SELECT id, status FROM artifact_candidates
                     WHERE project_library_id = ?1 AND primary_path = ?2",
                    params![project_library_id, primary_path],
                    |row| Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?)),
                )
                .optional()
                .map_err(|_| AppError::DatabaseError)?;
            if let Some((target_candidate_id, target_status)) = target {
                transaction
                    .execute(
                        "INSERT OR IGNORE INTO artifact_candidate_evidence (
                           candidate_id, evidence_fingerprint, agent_kind, reason_kind,
                           event_id, run_reference_hash, observed_at,
                           skill_normalized_name, skill_display_name,
                           manifest_entry_id, edit_contract, save_policy
                         ) SELECT ?1, evidence_fingerprint, agent_kind, reason_kind,
                                  event_id, run_reference_hash, observed_at,
                                  skill_normalized_name, skill_display_name,
                                  manifest_entry_id, edit_contract, save_policy
                           FROM artifact_candidate_evidence WHERE candidate_id = ?2",
                        params![target_candidate_id, task_candidate_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                transaction
                    .execute(
                        "INSERT OR IGNORE INTO artifact_candidate_related_files (
                           candidate_id, file_path, role
                         ) SELECT ?1, file_path, role
                           FROM artifact_candidate_related_files WHERE candidate_id = ?2",
                        params![target_candidate_id, task_candidate_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                let merged_status = merge_candidate_status(&target_status, &task_status);
                transaction
                    .execute(
                        "UPDATE artifact_candidates SET status = ?2 WHERE id = ?1",
                        params![target_candidate_id, merged_status],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                transaction
                    .execute(
                        "DELETE FROM artifact_candidates WHERE id = ?1",
                        params![task_candidate_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
            } else {
                transaction
                    .execute(
                        "UPDATE artifact_candidates SET project_library_id = ?2 WHERE id = ?1",
                        params![task_candidate_id, project_library_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
            }
        }

        let task_links = {
            let mut statement = transaction
                .prepare(
                    "SELECT item_id, link_kind, is_owner FROM item_sources
                     WHERE library_id = ?1 ORDER BY item_id",
                )
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map(params![task_library_id], |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, i64>(2)?,
                    ))
                })
                .map_err(|_| AppError::DatabaseError)?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|_| AppError::DatabaseError)?;
            rows
        };
        for (item_id, link_kind, is_owner) in task_links {
            let target_link = transaction
                .query_row(
                    "SELECT link_kind, is_owner FROM item_sources
                     WHERE item_id = ?1 AND library_id = ?2",
                    params![item_id, project_library_id],
                    |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?)),
                )
                .optional()
                .map_err(|_| AppError::DatabaseError)?;
            if let Some((target_kind, target_owner)) = target_link {
                let preferred_kind = if target_kind == "manifest" || link_kind != "manifest" {
                    target_kind
                } else {
                    link_kind
                };
                transaction
                    .execute(
                        "DELETE FROM item_sources WHERE item_id = ?1 AND library_id = ?2",
                        params![item_id, task_library_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
                transaction
                    .execute(
                        "UPDATE item_sources SET link_kind = ?3, is_owner = ?4
                         WHERE item_id = ?1 AND library_id = ?2",
                        params![item_id, project_library_id, preferred_kind, is_owner.max(target_owner)],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
            } else {
                transaction
                    .execute(
                        "UPDATE item_sources SET library_id = ?3
                         WHERE item_id = ?1 AND library_id = ?2",
                        params![item_id, task_library_id, project_library_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
            }
            if is_owner == 1 {
                transaction
                    .execute(
                        "UPDATE items SET library_id = ?2 WHERE id = ?1",
                        params![item_id, project_library_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
            }
        }

        transaction
            .execute(
                "INSERT OR IGNORE INTO item_provenance (
                   item_id, project_library_id, agent_kind,
                   skill_normalized_name, skill_display_name,
                   evidence_kind, run_reference_hash, evidence_fingerprint,
                   generated_at, created_at,
                   manifest_entry_id, edit_contract, save_policy
                 ) SELECT item_id, ?1, agent_kind,
                          skill_normalized_name, skill_display_name,
                          evidence_kind, run_reference_hash, evidence_fingerprint,
                          generated_at, created_at,
                          manifest_entry_id, edit_contract, save_policy
                   FROM item_provenance WHERE project_library_id = ?2",
                params![project_library_id, task_library_id],
            )
            .map_err(|_| AppError::DatabaseError)?;
        transaction
            .execute(
                "DELETE FROM item_provenance WHERE project_library_id = ?1",
                params![task_library_id],
            )
            .map_err(|_| AppError::DatabaseError)?;
        transaction
            .execute(
                "UPDATE ignored_items SET library_id = ?1 WHERE library_id = ?2",
                params![project_library_id, task_library_id],
            )
            .map_err(|_| AppError::DatabaseError)?;
        transaction
            .execute("DELETE FROM libraries WHERE id = ?1", params![task_library_id])
            .map_err(|_| AppError::DatabaseError)?;
        transaction.commit().map_err(|_| AppError::DatabaseError)?;
        self.get_agent_project_source(project_library_id)
    }

    pub fn set_agent_project_auto_import_mode(
        &self,
        project_library_id: i64,
        mode: &str,
    ) -> Result<AgentProjectSourceSummary, AppError> {
        if !matches!(mode, "explicit" | "confirm") {
            return Err(AppError::InvalidParams);
        }
        let connection = self.connection()?;
        let changed = connection
            .execute(
                "UPDATE agent_project_sources
                 SET auto_import_mode = ?2
                 WHERE library_id = ?1",
                params![project_library_id, mode],
            )
            .map_err(|_| AppError::DatabaseError)?;
        if changed == 0 {
            return Err(AppError::LibraryNotFound);
        }
        self.get_agent_project_source(project_library_id)
    }

    pub fn record_agent_project_scan_outcome(
        &self,
        project_library_id: i64,
        status: &str,
        issue: Option<&str>,
    ) -> Result<(), AppError> {
        if !matches!(status, "complete" | "partial") {
            return Err(AppError::InvalidParams);
        }
        let connection = self.connection()?;
        let changed = connection
            .execute(
                "UPDATE agent_project_sources
                 SET last_scan_status = ?2, last_scan_issue = ?3
                 WHERE library_id = ?1",
                params![project_library_id, status, issue],
            )
            .map_err(|_| AppError::DatabaseError)?;
        if changed == 0 {
            return Err(AppError::LibraryNotFound);
        }
        Ok(())
    }

    pub fn record_agent_project_manifest_success(
        &self,
        project_library_id: i64,
        manifest_path: &str,
        read_at: &str,
    ) -> Result<(), AppError> {
        let connection = self.connection()?;
        let changed = connection
            .execute(
                "UPDATE agent_project_sources
                 SET discovery_mode = 'hybrid', manifest_path = ?2, last_manifest_ok_at = ?3
                 WHERE library_id = ?1",
                params![project_library_id, manifest_path, read_at],
            )
            .map_err(|_| AppError::DatabaseError)?;
        if changed == 0 {
            return Err(AppError::LibraryNotFound);
        }
        Ok(())
    }

    pub fn candidate_ids_for_batches(
        &self,
        project_library_id: i64,
        batch_keys: &[String],
    ) -> Result<Vec<i64>, AppError> {
        if batch_keys.is_empty() {
            return Ok(Vec::new());
        }
        let selected = batch_keys.iter().collect::<BTreeSet<_>>();
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT id, batch_key
                 FROM artifact_candidates
                 WHERE project_library_id = ?1 AND status = 'suggested'
                 ORDER BY id",
            )
            .map_err(|_| AppError::DatabaseError)?;
        let rows = statement
            .query_map(params![project_library_id], |row| {
                Ok((row.get::<_, i64>(0)?, row.get::<_, String>(1)?))
            })
            .map_err(|_| AppError::DatabaseError)?;
        rows.filter_map(|row| match row {
            Ok((id, batch_key)) if selected.contains(&batch_key) => Some(Ok(id)),
            Ok(_) => None,
            Err(error) => Some(Err(error)),
        })
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| AppError::DatabaseError)
    }

    pub fn candidate_ids_for_manifest_registration(
        &self,
        project_library_id: i64,
    ) -> Result<Vec<i64>, AppError> {
        let connection = self.connection()?;
        let mut statement = connection
            .prepare(
                "SELECT DISTINCT artifact_candidates.id
                 FROM artifact_candidates
                 INNER JOIN artifact_candidate_evidence
                   ON artifact_candidate_evidence.candidate_id = artifact_candidates.id
                 WHERE artifact_candidates.project_library_id = ?1
                   AND artifact_candidates.status = 'suggested'
                   AND artifact_candidate_evidence.manifest_entry_id IS NOT NULL
                 ORDER BY artifact_candidates.id",
            )
            .map_err(|_| AppError::DatabaseError)?;
        let candidate_ids = statement
            .query_map(params![project_library_id], |row| row.get::<_, i64>(0))
            .map_err(|_| AppError::DatabaseError)?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|_| AppError::DatabaseError)?;
        Ok(candidate_ids)
    }

    pub fn ignore_agent_artifact_candidate(
        &self,
        project_library_id: i64,
        candidate_id: i64,
    ) -> Result<(), AppError> {
        let connection = self.connection()?;
        let changed = connection
            .execute(
                "UPDATE artifact_candidates
                 SET status = 'ignored'
                 WHERE id = ?1 AND project_library_id = ?2
                   AND status NOT IN ('accepted', 'missing')",
                params![candidate_id, project_library_id],
            )
            .map_err(|_| AppError::DatabaseError)?;
        if changed == 0 {
            return Err(AppError::InvalidParams);
        }
        Ok(())
    }

    pub fn refresh_agent_project_candidate_paths(
        &self,
        project_library_id: i64,
    ) -> Result<(), AppError> {
        let project = self.get_agent_project_source(project_library_id)?;
        let root = fs::canonicalize(&project.root_path).map_err(|_| AppError::InvalidParams)?;
        let mut connection = self.connection()?;
        let candidates = {
            let mut statement = connection
                .prepare(
                    "SELECT id, primary_path, status
                     FROM artifact_candidates
                     WHERE project_library_id = ?1",
                )
                .map_err(|_| AppError::DatabaseError)?;
            let rows = statement
                .query_map(params![project_library_id], |row| {
                    Ok((
                        row.get::<_, i64>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, String>(2)?,
                    ))
                })
                .map_err(|_| AppError::DatabaseError)?;
            rows.collect::<Result<Vec<_>, _>>()
                .map_err(|_| AppError::DatabaseError)?
        };
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;
        for (candidate_id, primary_path, status) in candidates {
            if status == "ignored" {
                continue;
            }
            if safe_project_file(&root, &primary_path).is_none() {
                transaction
                    .execute(
                        "UPDATE artifact_candidates SET status = 'missing'
                         WHERE id = ?1",
                        params![candidate_id],
                    )
                    .map_err(|_| AppError::DatabaseError)?;
            }
        }
        transaction.commit().map_err(|_| AppError::DatabaseError)?;
        self.sync_filesystem_state()?;
        Ok(())
    }

    pub fn accept_agent_artifact_candidates(
        &self,
        project_library_id: i64,
        candidate_ids: &[i64],
        now: &str,
    ) -> Result<AgentArtifactAcceptanceResult, AppError> {
        let project = self.get_agent_project_source(project_library_id)?;
        let project_root =
            fs::canonicalize(&project.root_path).map_err(|_| AppError::InvalidParams)?;
        let connection = self.connection()?;
        let mut result = AgentArtifactAcceptanceResult {
            accepted: Vec::new(),
            skipped: Vec::new(),
            failed: Vec::new(),
        };
        let mut valid = Vec::new();
        let mut seen = BTreeSet::new();
        for candidate_id in candidate_ids {
            if !seen.insert(*candidate_id) {
                continue;
            }
            let candidate = match load_candidate(&connection, project_library_id, *candidate_id)? {
                Some(candidate) => candidate,
                None => {
                    result.skipped.push(action_item(
                        *candidate_id,
                        "",
                        "candidate_not_found",
                    ));
                    continue;
                }
            };
            if !matches!(candidate.status.as_str(), "suggested" | "pending") {
                result.skipped.push(action_item(
                    *candidate_id,
                    &candidate.primary_path,
                    "candidate_not_actionable",
                ));
                continue;
            }
            let Some(absolute_path) = safe_project_file(&project_root, &candidate.primary_path)
            else {
                result.skipped.push(action_item(
                    *candidate_id,
                    &candidate.primary_path,
                    "path_missing_or_unsafe",
                ));
                continue;
            };
            let Some(file_type) = artifact_file_type(&absolute_path) else {
                result.skipped.push(action_item(
                    *candidate_id,
                    &candidate.primary_path,
                    "unsupported_file_type",
                ));
                continue;
            };
            if file_type != candidate.artifact_kind {
                result.skipped.push(action_item(
                    *candidate_id,
                    &candidate.primary_path,
                    "artifact_kind_changed",
                ));
                continue;
            }
            let metadata = fs::metadata(&absolute_path).map_err(|_| AppError::IoError)?;
            let mut related_files = Vec::new();
            let mut related_invalid = false;
            for related in &candidate.related_files {
                let Some(path) = safe_project_file(&project_root, &related.path) else {
                    related_invalid = true;
                    break;
                };
                let Ok(metadata) = fs::metadata(&path) else {
                    related_invalid = true;
                    break;
                };
                related_files.push((path, related.role.clone(), file_identity(&metadata)));
            }
            if related_invalid {
                result.skipped.push(action_item(
                    *candidate_id,
                    &candidate.primary_path,
                    "related_path_missing_or_unsafe",
                ));
                continue;
            }
            valid.push(ValidCandidate {
                candidate,
                absolute_path,
                file_identity: file_identity(&metadata),
                related_files,
                file_size: i64::try_from(metadata.len()).unwrap_or(i64::MAX),
                modified_at: metadata_timestamp(&metadata),
            });
        }
        drop(connection);

        if valid.is_empty() {
            return Ok(result);
        }
        let valid_actions = valid
            .iter()
            .map(|candidate| {
                action_item(
                    candidate.candidate.id.unwrap_or_default(),
                    &candidate.candidate.primary_path,
                    "accepted",
                )
            })
            .collect::<Vec<_>>();
        let mut connection = self.connection()?;
        let transaction = connection
            .transaction()
            .map_err(|_| AppError::DatabaseError)?;
        let write_result = write_valid_candidates(
            &transaction,
            &project,
            &project_root,
            &valid,
            now,
        )
        .and_then(|_| Database::rebuild_fts_index(&transaction))
        .and_then(|_| transaction.commit().map_err(|_| AppError::DatabaseError));
        if write_result.is_err() {
            result.failed.extend(valid_actions.into_iter().map(|mut item| {
                item.reason = "transaction_rolled_back".to_string();
                item
            }));
            return Ok(result);
        }
        result.accepted.extend(valid_actions);
        Ok(result)
    }
}

fn write_valid_candidates(
    transaction: &Transaction<'_>,
    project: &AgentProjectSourceSummary,
    project_root: &Path,
    candidates: &[ValidCandidate],
    now: &str,
) -> Result<(), AppError> {
    for valid in candidates {
        if valid.candidate.agent_kind.trim().is_empty() {
            return Err(AppError::InvalidParams);
        }
        let current_primary = safe_project_file(project_root, &valid.candidate.primary_path)
            .ok_or(AppError::InvalidParams)?;
        let current_metadata = fs::metadata(&current_primary).map_err(|_| AppError::IoError)?;
        if current_primary != valid.absolute_path
            || file_identity(&current_metadata) != valid.file_identity
        {
            return Err(AppError::InvalidParams);
        }
        for (related_path, _, expected_identity) in &valid.related_files {
            let current = fs::canonicalize(related_path).map_err(|_| AppError::InvalidParams)?;
            current
                .strip_prefix(project_root)
                .map_err(|_| AppError::InvalidParams)?;
            let metadata = fs::metadata(&current).map_err(|_| AppError::IoError)?;
            if &file_identity(&metadata) != expected_identity {
                return Err(AppError::InvalidParams);
            }
        }
        let candidate_id = valid.candidate.id.ok_or(AppError::InvalidParams)?;
        let file_path = valid.absolute_path.to_string_lossy().into_owned();
        let file_name = valid
            .absolute_path
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or(AppError::InvalidParams)?
            .to_string();
        let file_ext = valid
            .absolute_path
            .extension()
            .and_then(|extension| extension.to_str())
            .ok_or(AppError::InvalidParams)?
            .to_ascii_lowercase();
        let existing_item_id = transaction
            .query_row(
                "SELECT id FROM items WHERE file_path = ?1",
                params![file_path],
                |row| row.get::<_, i64>(0),
            )
            .optional()
            .map_err(|_| AppError::DatabaseError)?;
        let item_id = if let Some(item_id) = existing_item_id {
            transaction
                .execute(
                    "UPDATE items SET
                       file_size = ?2,
                       modified_at = ?3,
                       path_state = 'valid',
                       is_deleted = 0,
                       updated_at = ?4
                     WHERE id = ?1",
                    params![item_id, valid.file_size, valid.modified_at, now],
                )
                .map_err(|_| AppError::DatabaseError)?;
            item_id
        } else {
            transaction
                .execute(
                    "INSERT INTO items (
                       library_id, file_path, relative_path, file_name, file_ext,
                       file_type, file_size, modified_at, file_hash, title, summary,
                       path_state, is_favorite, last_opened_at, is_deleted,
                       created_at, updated_at
                     ) VALUES (
                       ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, NULL, NULL,
                       'valid', 0, NULL, 0, ?9, ?9
                     )",
                    params![
                        project.library_id,
                        file_path,
                        valid.candidate.primary_path,
                        file_name,
                        file_ext,
                        valid.candidate.artifact_kind,
                        valid.file_size,
                        valid.modified_at,
                        now,
                    ],
                )
                .map_err(|_| AppError::DatabaseError)?;
            transaction.last_insert_rowid()
        };
        let link_kind = if valid
            .candidate
            .reasons
            .contains(&DiscoveryReasonKind::NbskillRegistered)
        {
            "manifest"
        } else {
            "discovered"
        };
        let is_owner = i64::from(existing_item_id.is_none());
        transaction
            .execute(
                "INSERT INTO item_sources (
                   item_id, library_id, link_kind, is_owner, created_at
                 ) VALUES (?1, ?2, ?3, ?4, ?5)
                 ON CONFLICT(item_id, library_id) DO UPDATE SET
                   link_kind = CASE
                     WHEN excluded.link_kind = 'manifest' THEN 'manifest'
                     ELSE item_sources.link_kind
                   END",
                params![item_id, project.library_id, link_kind, is_owner, now],
            )
            .map_err(|_| AppError::DatabaseError)?;
        transaction
            .execute(
                "DELETE FROM ignored_items WHERE item_id = ?1",
                params![item_id],
            )
            .map_err(|_| AppError::DatabaseError)?;

        let provenance = candidate_provenance(&valid.candidate);
        for evidence in provenance {
            transaction
                .execute(
                    "INSERT OR IGNORE INTO item_provenance (
                       item_id, project_library_id, agent_kind,
                       skill_normalized_name, skill_display_name,
                       evidence_kind, run_reference_hash,
                       evidence_fingerprint, generated_at, created_at,
                       manifest_entry_id, edit_contract, save_policy
                     ) VALUES (
                       ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13
                     )",
                    params![
                        item_id,
                        project.library_id,
                        evidence.agent_kind,
                        evidence.skill_normalized_name,
                        evidence.skill_display_name,
                        evidence.reason.as_str(),
                        evidence.run_reference_hash,
                        evidence.fingerprint,
                        evidence.observed_at,
                        now,
                        evidence.manifest_entry_id,
                        evidence.edit_contract,
                        evidence.save_policy,
                    ],
                )
                .map_err(|_| AppError::DatabaseError)?;
        }
        for (related_path, role, _) in &valid.related_files {
            let relative = related_path
                .strip_prefix(project_root)
                .map_err(|_| AppError::InvalidParams)?;
            if relative.as_os_str().is_empty() {
                return Err(AppError::InvalidParams);
            }
            transaction
                .execute(
                    "INSERT INTO artifact_related_files (
                       item_id, file_path, role, created_at
                     ) VALUES (?1, ?2, ?3, ?4)
                     ON CONFLICT(item_id, file_path) DO UPDATE SET
                       role = excluded.role",
                    params![
                        item_id,
                        related_path.to_string_lossy(),
                        role,
                        now
                    ],
                )
                .map_err(|_| AppError::DatabaseError)?;
        }
        transaction
            .execute(
                "UPDATE artifact_candidates SET status = 'accepted'
                 WHERE id = ?1 AND project_library_id = ?2",
                params![candidate_id, project.library_id],
            )
            .map_err(|_| AppError::DatabaseError)?;
    }
    Ok(())
}

pub(super) fn load_candidate(
    connection: &Connection,
    project_library_id: i64,
    candidate_id: i64,
) -> Result<Option<ArtifactCandidate>, AppError> {
    let candidate = connection
        .query_row(
            "SELECT
               id, agent_kind, primary_path, artifact_kind, status, batch_key,
               reasons_json, discovery_fingerprint, file_size, modified_at
             FROM artifact_candidates
             WHERE id = ?1 AND project_library_id = ?2",
            params![candidate_id, project_library_id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                    row.get::<_, String>(7)?,
                    row.get::<_, i64>(8)?,
                    row.get::<_, Option<String>>(9)?,
                ))
            },
        )
        .optional()
        .map_err(|_| AppError::DatabaseError)?;
    let Some((
        id,
        agent_kind,
        primary_path,
        artifact_kind,
        status,
        batch_key,
        reasons_json,
        discovery_fingerprint,
        file_size,
        modified_at,
    )) = candidate
    else {
        return Ok(None);
    };
    let reasons =
        serde_json::from_str::<Vec<DiscoveryReasonKind>>(&reasons_json)
            .map_err(|_| AppError::DatabaseError)?;
    let mut evidence_statement = connection
        .prepare(
            "SELECT
               evidence_fingerprint, agent_kind, reason_kind, event_id,
               run_reference_hash, observed_at,
               skill_normalized_name, skill_display_name,
               manifest_entry_id, edit_contract, save_policy
             FROM artifact_candidate_evidence
             WHERE candidate_id = ?1
             ORDER BY evidence_fingerprint",
        )
        .map_err(|_| AppError::DatabaseError)?;
    let evidence = evidence_statement
        .query_map(params![id], |row| {
            let agent_kind: String = row.get(1)?;
            let reason: String = row.get(2)?;
            Ok((
                row.get::<_, String>(0)?,
                agent_kind,
                reason,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, Option<String>>(5)?,
                row.get::<_, Option<String>>(6)?,
                row.get::<_, Option<String>>(7)?,
                row.get::<_, Option<String>>(8)?,
                row.get::<_, Option<String>>(9)?,
                row.get::<_, Option<String>>(10)?,
            ))
        })
        .map_err(|_| AppError::DatabaseError)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| AppError::DatabaseError)?
        .into_iter()
        .map(
            |(fingerprint, agent_kind, reason, event_id, run_reference_hash, observed_at, skill_normalized_name, skill_display_name, manifest_entry_id, edit_contract, save_policy)| {
                Ok(DiscoveryEvidence {
                    fingerprint,
                    agent_kind,
                    reason: DiscoveryReasonKind::from_str(&reason)
                        .ok_or(AppError::DatabaseError)?,
                    event_id,
                    run_reference_hash,
                    observed_at,
                    skill_normalized_name,
                    skill_display_name,
                    manifest_entry_id,
                    edit_contract,
                    save_policy,
                })
            },
        )
        .collect::<Result<Vec<_>, AppError>>()?;
    let mut related_statement = connection
        .prepare(
            "SELECT file_path, role
             FROM artifact_candidate_related_files
             WHERE candidate_id = ?1
             ORDER BY file_path",
        )
        .map_err(|_| AppError::DatabaseError)?;
    let related_files = related_statement
        .query_map(params![id], |row| {
            Ok(RelatedArtifactFile {
                path: row.get(0)?,
                role: row.get(1)?,
            })
        })
        .map_err(|_| AppError::DatabaseError)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| AppError::DatabaseError)?;
    Ok(Some(ArtifactCandidate {
        id: Some(id),
        project_library_id,
        agent_kind,
        primary_path,
        artifact_kind,
        status,
        batch_key,
        reasons,
        discovery_fingerprint,
        file_size: u64::try_from(file_size).unwrap_or(0),
        modified_at,
        related_files,
        evidence,
    }))
}

fn candidate_provenance(candidate: &ArtifactCandidate) -> Vec<DiscoveryEvidence> {
    if !candidate.evidence.is_empty() {
        return candidate.evidence.clone();
    }
    candidate
        .reasons
        .iter()
        .cloned()
        .map(|reason| DiscoveryEvidence {
            fingerprint: sha256_hex(
                format!(
                    "candidate\0{}\0{}",
                    candidate.discovery_fingerprint,
                    reason.as_str()
                )
                .as_bytes(),
            ),
            agent_kind: candidate.agent_kind.clone(),
            reason,
            event_id: format!(
                "candidate:{}:{}",
                candidate.id.unwrap_or_default(),
                candidate.primary_path
            ),
            run_reference_hash: None,
            observed_at: candidate.modified_at.clone(),
            skill_normalized_name: None,
            skill_display_name: None,
            manifest_entry_id: None,
            edit_contract: None,
            save_policy: None,
        })
        .collect()
}

fn safe_project_file(project_root: &Path, relative_path: &str) -> Option<PathBuf> {
    let relative = Path::new(relative_path);
    if relative.is_absolute()
        || relative
            .components()
            .any(|component| !matches!(component, Component::Normal(_)))
    {
        return None;
    }
    let canonical = fs::canonicalize(project_root.join(relative)).ok()?;
    canonical.strip_prefix(project_root).ok()?;
    canonical.is_file().then_some(canonical)
}

fn artifact_file_type(path: &Path) -> Option<String> {
    match path
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| extension.to_ascii_lowercase())
        .as_deref()
    {
        Some("md" | "markdown") => Some("markdown".to_string()),
        Some("html" | "htm") => Some("html".to_string()),
        _ => None,
    }
}

fn metadata_timestamp(metadata: &fs::Metadata) -> String {
    metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(current_timestamp)
}

#[cfg(unix)]
fn file_identity(metadata: &fs::Metadata) -> FileIdentity {
    use std::os::unix::fs::MetadataExt;
    FileIdentity {
        device: metadata.dev(),
        inode: metadata.ino(),
        len: metadata.len(),
    }
}

#[cfg(not(unix))]
fn file_identity(metadata: &fs::Metadata) -> FileIdentity {
    FileIdentity {
        device: 0,
        inode: 0,
        len: metadata.len(),
    }
}

fn current_timestamp() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

fn action_item(candidate_id: i64, path: &str, reason: &str) -> AgentArtifactActionItem {
    AgentArtifactActionItem {
        candidate_id,
        path: path.to_string(),
        reason: reason.to_string(),
    }
}

fn merge_candidate_status<'a>(left: &'a str, right: &'a str) -> &'a str {
    let rank = |status: &str| match status {
        "accepted" => 0,
        "ignored" => 1,
        "pending" => 2,
        "suggested" => 3,
        "excluded" => 4,
        "superseded" => 5,
        "missing" => 6,
        _ => 7,
    };
    if rank(left) <= rank(right) { left } else { right }
}

fn sha256_hex(bytes: &[u8]) -> String {
    let mut digest = Sha256::new();
    digest.update(bytes);
    format!("{:x}", digest.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::repositories::ItemRepository;
    use tempfile::tempdir;

    fn connected_project(database: &Database, root: &Path) -> AgentProjectSourceSummary {
        database
            .connect_agent_project_source(
                "codex",
                Some("codex-local-0.146"),
                "fixture-project",
                "project",
                "project-and-verified-events",
                root.to_str().expect("UTF-8 root"),
                Some("Fixture project"),
                "2026-07-30T08:00:00Z",
            )
            .expect("connect project")
    }

    fn candidate(
        project_library_id: i64,
        path: &str,
        status: &str,
        batch_key: &str,
        fingerprint: &str,
    ) -> ArtifactCandidate {
        ArtifactCandidate {
            id: None,
            project_library_id,
            agent_kind: "codex".to_string(),
            primary_path: path.to_string(),
            artifact_kind: "markdown".to_string(),
            status: status.to_string(),
            batch_key: batch_key.to_string(),
            reasons: vec![DiscoveryReasonKind::MentionedInFinalResponse],
            discovery_fingerprint: fingerprint.to_string(),
            file_size: 0,
            modified_at: None,
            related_files: Vec::new(),
            evidence: vec![DiscoveryEvidence {
                fingerprint: format!("evidence-{fingerprint}"),
                agent_kind: "codex".to_string(),
                reason: DiscoveryReasonKind::MentionedInFinalResponse,
                event_id: format!("delivery-{fingerprint}"),
                run_reference_hash: Some(format!("run-{fingerprint}")),
                observed_at: Some("2026-07-30T08:00:00Z".to_string()),
                skill_normalized_name: None,
                skill_display_name: None,
                manifest_entry_id: None,
                edit_contract: None,
                save_policy: None,
            }],
        }
    }

    #[test]
    fn agent_discovery_cache_round_trips_the_last_scan_snapshot() {
        let directory = tempdir().expect("tempdir");
        let database = Database::new(directory.path().join("cache.sqlite3"))
            .expect("database");
        assert_eq!(
            database.load_agent_discovery_cache().expect("empty cache"),
            None
        );

        let payload = AgentScopeDiscoveryPayload {
            installations: Vec::new(),
            scopes: Vec::new(),
            artifact_summaries: Vec::new(),
        };
        database
            .save_agent_discovery_cache(&payload, "2026-08-08T00:00:00Z")
            .expect("save discovery cache");

        assert_eq!(
            database.load_agent_discovery_cache().expect("load cache"),
            Some(payload)
        );
    }

    #[cfg(unix)]
    #[test]
    fn canonical_project_identity_aggregates_aliases_and_multiple_agents() {
        use std::os::unix::fs::symlink;

        let directory = tempdir().expect("tempdir");
        let database = Database::new(directory.path().join("identity.sqlite3"))
            .expect("database");
        let project_root = directory.path().join("real-project");
        let alias_root = directory.path().join("project-alias");
        fs::create_dir_all(&project_root).expect("project root");
        symlink(&project_root, &alias_root).expect("project alias");

        let workbuddy = database
            .connect_agent_project_source(
                "workbuddy",
                Some("workbuddy-local-5.3"),
                "workbuddy:project:fixture",
                "project",
                "scope-only",
                alias_root.to_str().expect("alias path"),
                Some("Shared project"),
                "2026-08-01T00:00:00Z",
            )
            .expect("WorkBuddy binding");
        let codex = database
            .connect_agent_project_source(
                "codex",
                Some("codex-local-0.146"),
                "codex:project:fixture",
                "project",
                "project-and-verified-events",
                project_root.to_str().expect("project path"),
                Some("Shared project"),
                "2026-08-01T00:01:00Z",
            )
            .expect("Codex binding");

        assert_eq!(workbuddy.library_id, codex.library_id);
        assert_eq!(codex.scope_kind, "project");
        assert_eq!(codex.adapters.len(), 2);
        assert_eq!(codex.adapters[0].adapter_id, "codex");
        assert_eq!(codex.adapters[1].adapter_id, "workbuddy");
        let project_count: i64 = database
            .connection()
            .expect("connection")
            .query_row(
                "SELECT COUNT(*) FROM libraries WHERE source_kind = 'agent_project'",
                [],
                |row| row.get(0),
            )
            .expect("project count");
        assert_eq!(project_count, 1);
    }

    #[test]
    fn one_agent_can_bind_multiple_external_scopes_to_the_same_project() {
        let directory = tempdir().expect("tempdir");
        let database = Database::new(directory.path().join("bindings.sqlite3"))
            .expect("database");
        let project_root = directory.path().join("project");
        fs::create_dir_all(&project_root).expect("project root");

        for external_scope_id in ["codex:thread:one", "codex:thread:two"] {
            database
                .connect_agent_project_source(
                    "codex",
                    Some("codex-local-0.146"),
                    external_scope_id,
                    "project",
                    "project-and-verified-events",
                    project_root.to_str().expect("project path"),
                    Some("Project"),
                    "2026-08-01T00:00:00Z",
                )
                .expect("Codex scope binding");
        }

        let project = database.get_agent_project_source(1).expect("project");
        assert_eq!(project.adapters.len(), 2);
        assert_eq!(project.adapters[0].external_scope_id, "codex:thread:one");
        assert_eq!(project.adapters[1].external_scope_id, "codex:thread:two");
    }

    #[test]
    fn adapter_failure_is_local_and_preserves_other_binding_and_project() {
        let directory = tempdir().expect("tempdir");
        let database = Database::new(directory.path().join("stale.sqlite3"))
            .expect("database");
        let project_root = directory.path().join("project");
        fs::create_dir_all(&project_root).expect("project root");
        let project = database
            .connect_agent_project_source(
                "codex",
                Some("codex-local-0.146"),
                "codex:project:fixture",
                "project",
                "project-and-verified-events",
                project_root.to_str().expect("project path"),
                Some("Project"),
                "2026-08-01T00:00:00Z",
            )
            .expect("Codex binding");
        database
            .connect_agent_project_source(
                "workbuddy",
                Some("workbuddy-local-5.3"),
                "workbuddy:project:fixture",
                "project",
                "scope-only",
                project_root.to_str().expect("project path"),
                Some("Project"),
                "2026-08-01T00:01:00Z",
            )
            .expect("WorkBuddy binding");

        database
            .record_agent_adapter_snapshot_failure(
                project.library_id,
                "codex",
                "codex:project:fixture",
                "stale",
                "unsupported_format",
                "Codex metadata changed",
                "2026-08-01T00:02:00Z",
            )
            .expect("record local failure");

        let refreshed = database
            .get_agent_project_source(project.library_id)
            .expect("project survives");
        assert_eq!(refreshed.adapters.len(), 2);
        assert_eq!(refreshed.adapters[0].snapshot_status, "stale");
        assert_eq!(refreshed.adapters[1].snapshot_status, "ready");
        assert_eq!(refreshed.adapters[1].last_error_kind, None);
    }

    #[test]
    fn adjacent_project_roots_do_not_collapse_by_string_prefix() {
        let directory = tempdir().expect("tempdir");
        let database = Database::new(directory.path().join("adjacent.sqlite3"))
            .expect("database");
        let first_root = directory.path().join("project");
        let second_root = directory.path().join("project-copy");
        fs::create_dir_all(&first_root).expect("first root");
        fs::create_dir_all(&second_root).expect("second root");

        let first = database
            .connect_agent_project_source(
                "codex",
                None,
                "codex:first",
                "project",
                "project-only",
                first_root.to_str().expect("first path"),
                None,
                "2026-08-01T00:00:00Z",
            )
            .expect("first project");
        let second = database
            .connect_agent_project_source(
                "codex",
                None,
                "codex:second",
                "project",
                "project-only",
                second_root.to_str().expect("second path"),
                None,
                "2026-08-01T00:01:00Z",
            )
            .expect("second project");

        assert_ne!(first.library_id, second.library_id);
    }

    #[test]
    fn external_scope_cannot_silently_move_to_an_unrelated_root() {
        let directory = tempdir().expect("tempdir");
        let database = Database::new(directory.path().join("moved.sqlite3"))
            .expect("database");
        let first_root = directory.path().join("first");
        let second_root = directory.path().join("second");
        fs::create_dir_all(&first_root).expect("first root");
        fs::create_dir_all(&second_root).expect("second root");
        database
            .connect_agent_project_source(
                "codex",
                None,
                "codex:stable-scope",
                "project",
                "project-only",
                first_root.to_str().expect("first path"),
                None,
                "2026-08-01T00:00:00Z",
            )
            .expect("initial binding");

        let moved = database.connect_agent_project_source(
            "codex",
            None,
            "codex:stable-scope",
            "project",
            "project-only",
            second_root.to_str().expect("second path"),
            None,
            "2026-08-01T00:01:00Z",
        );

        assert!(matches!(moved, Err(AppError::InvalidParams)));
        let project_count: i64 = database
            .connection()
            .expect("connection")
            .query_row(
                "SELECT COUNT(*) FROM libraries WHERE source_kind = 'agent_project'",
                [],
                |row| row.get(0),
            )
            .expect("project count");
        assert_eq!(project_count, 1);
    }

    #[test]
    fn workbuddy_task_merges_into_project_without_losing_user_state() {
        let directory = tempdir().expect("tempdir");
        let database = Database::new(directory.path().join("merge.sqlite3"))
            .expect("database");
        let task_root = directory.path().join("2026-06-26-22-31-57");
        let project_root = directory.path().join("project");
        fs::create_dir_all(&task_root).expect("task root");
        fs::create_dir_all(&project_root).expect("project root");
        fs::write(task_root.join("report.md"), "# Task report").expect("task report");
        fs::write(project_root.join("report.md"), "# Project report").expect("project report");
        let task = database
            .connect_agent_project_source(
                "workbuddy",
                Some("workbuddy-local-5.3"),
                "workbuddy:task:2026-06-26-22-31-57",
                "task",
                "scope-only",
                task_root.to_str().expect("task path"),
                Some("WorkBuddy task"),
                "2026-08-01T00:00:00Z",
            )
            .expect("task source");
        let project = database
            .connect_agent_project_source(
                "codex",
                Some("codex-local-0.146"),
                "codex:project:fixture",
                "project",
                "project-and-verified-events",
                project_root.to_str().expect("project path"),
                Some("Project"),
                "2026-08-01T00:01:00Z",
            )
            .expect("project source");
        let mut task_candidate_model = candidate(
            task.library_id,
            "report.md",
            "pending",
            "task:fixture",
            "task-report",
        );
        task_candidate_model.agent_kind = "workbuddy".to_string();
        for evidence in &mut task_candidate_model.evidence {
            evidence.agent_kind = "workbuddy".to_string();
        }
        let task_candidate = database
            .upsert_artifact_candidates(
                task.library_id,
                &[task_candidate_model],
                "2026-08-01T00:02:00Z",
            )
            .expect("task candidate")[0]
            .id
            .expect("task candidate id");
        database
            .upsert_artifact_candidates(
                project.library_id,
                &[candidate(
                    project.library_id,
                    "report.md",
                    "suggested",
                    "run:fixture",
                    "project-report",
                )],
                "2026-08-01T00:03:00Z",
            )
            .expect("project candidate");
        database
            .ignore_agent_artifact_candidate(task.library_id, task_candidate)
            .expect("user ignored task candidate");
        let connection = database.connection().expect("connection");
        connection
            .execute(
                "INSERT INTO items (
                   id, library_id, file_path, relative_path, file_name, file_ext,
                   file_type, file_size, modified_at, path_state, is_favorite,
                   is_deleted, created_at, updated_at
                 ) VALUES (41, ?1, ?2, 'report.md', 'report.md', 'md',
                           'markdown', 13, '1', 'valid', 1, 0, 'now', 'now')",
                params![task.library_id, task_root.join("report.md").to_string_lossy()],
            )
            .expect("task-owned item");
        connection
            .execute(
                "INSERT INTO item_sources (item_id, library_id, link_kind, is_owner, created_at)
                 VALUES (41, ?1, 'discovered', 1, 'now')",
                params![task.library_id],
            )
            .expect("task owner link");
        connection
            .execute(
                "INSERT INTO item_provenance (
                   item_id, project_library_id, agent_kind, evidence_kind,
                   evidence_fingerprint, created_at
                 ) VALUES (41, ?1, 'workbuddy', 'inside_provider_task_scope',
                           'task-evidence', 'now')",
                params![task.library_id],
            )
            .expect("task provenance");
        drop(connection);

        let merged = database
            .merge_agent_task_scope(task.library_id, project.library_id)
            .expect("task merge");

        assert_eq!(merged.adapters.len(), 2);
        let connection = database.connection().expect("connection");
        let task_exists: i64 = connection
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM libraries WHERE id = ?1)",
                params![task.library_id],
                |row| row.get(0),
            )
            .expect("task lookup");
        assert_eq!(task_exists, 0);
        let candidate_state: (i64, String) = connection
            .query_row(
                "SELECT COUNT(*), MIN(status) FROM artifact_candidates
                 WHERE project_library_id = ?1 AND primary_path = 'report.md'",
                params![project.library_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("merged candidate");
        assert_eq!(candidate_state, (1, "ignored".to_string()));
        let item_state: (i64, i64, i64) = connection
            .query_row(
                "SELECT items.library_id, item_sources.library_id,
                        item_provenance.project_library_id
                 FROM items
                 INNER JOIN item_sources ON item_sources.item_id = items.id
                 INNER JOIN item_provenance ON item_provenance.item_id = items.id
                 WHERE items.id = 41",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("merged item state");
        assert_eq!(item_state, (project.library_id, project.library_id, project.library_id));
    }

    #[test]
    fn workbuddy_task_merge_failure_rolls_back_all_moved_state() {
        let directory = tempdir().expect("tempdir");
        let database = Database::new(directory.path().join("merge-rollback.sqlite3"))
            .expect("database");
        let task_root = directory.path().join("2026-07-17-10-41-23");
        let project_root = directory.path().join("project");
        fs::create_dir_all(&task_root).expect("task root");
        fs::create_dir_all(&project_root).expect("project root");
        let task = database
            .connect_agent_project_source(
                "workbuddy",
                None,
                "workbuddy:task:rollback",
                "task",
                "scope-only",
                task_root.to_str().expect("task path"),
                None,
                "now",
            )
            .expect("task");
        let project = database
            .connect_agent_project_source(
                "codex",
                None,
                "codex:project:rollback",
                "project",
                "project-only",
                project_root.to_str().expect("project path"),
                None,
                "now",
            )
            .expect("project");
        let connection = database.connection().expect("connection");
        connection
            .execute_batch(&format!(
                "CREATE TRIGGER fail_task_merge
                 BEFORE DELETE ON libraries
                 WHEN OLD.id = {}
                 BEGIN
                   SELECT RAISE(ABORT, 'forced task merge failure');
                 END;",
                task.library_id
            ))
            .expect("failure trigger");
        drop(connection);

        let result = database.merge_agent_task_scope(task.library_id, project.library_id);

        assert!(matches!(result, Err(AppError::DatabaseError)));
        let task_after = database
            .get_agent_project_source(task.library_id)
            .expect("task survives rollback");
        let project_after = database
            .get_agent_project_source(project.library_id)
            .expect("project survives rollback");
        assert_eq!(task_after.adapters.len(), 1);
        assert_eq!(task_after.adapters[0].adapter_id, "workbuddy");
        assert_eq!(project_after.adapters.len(), 1);
        assert_eq!(project_after.adapters[0].adapter_id, "codex");
    }

    #[test]
    fn project_connection_is_canonical_and_does_not_scan_parent_directories() {
        let directory = tempdir().expect("temporary directory");
        let database = Database::new(directory.path().join("nutbook.sqlite3"))
            .expect("database");
        let project_root = directory.path().join("workspace").join("project");
        fs::create_dir_all(&project_root).expect("project root");
        fs::write(directory.path().join("outside.md"), "# Outside").expect("outside file");

        let project = connected_project(&database, &project_root);

        assert_eq!(
            project.root_path,
            fs::canonicalize(&project_root)
                .expect("canonical project")
                .to_string_lossy()
        );
        let connection = database.connection().expect("connection");
        let counts: (i64, i64) = connection
            .query_row(
                "SELECT
                   (SELECT COUNT(*) FROM libraries),
                   (SELECT COUNT(*) FROM items)",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("counts");
        assert_eq!(counts, (1, 0));
    }

    #[test]
    fn known_artifact_paths_include_existing_single_file_items() {
        let directory = tempdir().expect("temporary directory");
        let database = Database::new(directory.path().join("nutbook.sqlite3"))
            .expect("database");
        let project_root = directory.path().join("project");
        fs::create_dir_all(&project_root).expect("project root");
        let readme = project_root.join("README.md");
        fs::write(&readme, "# Readme").expect("readme");
        let canonical_readme = fs::canonicalize(&readme).expect("canonical readme");
        let connection = database.connection().expect("connection");
        connection
            .execute(
                "INSERT INTO libraries (
                   name, root_path, canonical_root_key, source_kind, path_state,
                   is_active, created_at, updated_at
                 ) VALUES (?1, ?2, ?3, 'file', 'valid', 1, 'now', 'now')",
                params![
                    "README.md",
                    canonical_readme.to_string_lossy(),
                    canonical_readme.to_string_lossy()
                ],
            )
            .expect("single-file library");
        let library_id = connection.last_insert_rowid();
        connection
            .execute(
                "INSERT INTO items (
                   library_id, file_path, relative_path, file_name, file_ext,
                   file_type, file_size, modified_at, path_state, is_deleted,
                   created_at, updated_at
                 ) VALUES (?1, ?2, 'README.md', 'README.md', 'md', 'markdown', 8,
                           'now', 'valid', 0, 'now', 'now')",
                params![library_id, canonical_readme.to_string_lossy()],
            )
            .expect("single-file item");
        drop(connection);

        let known = database
            .known_artifact_paths_for_root(project_root.to_str().expect("project path"))
            .expect("known paths");

        assert!(known.contains("README.md"));
        let project = connected_project(&database, &project_root);
        database
            .upsert_artifact_candidates(
                project.library_id,
                &[candidate(
                    project.library_id,
                    "README.md",
                    "suggested",
                    "root-files",
                    "readme-candidate",
                )],
                "now",
            )
            .expect("cached candidate");
        database
            .remove_undecided_agent_candidates_for_paths(project.library_id, &known)
            .expect("remove duplicate candidate");
        let remaining: i64 = database
            .connection()
            .expect("connection")
            .query_row(
                "SELECT COUNT(*) FROM artifact_candidates WHERE project_library_id = ?1",
                params![project.library_id],
                |row| row.get(0),
            )
            .expect("candidate count");
        assert_eq!(remaining, 0);
    }

    #[test]
    fn stale_accepted_candidate_returns_to_pending_when_its_item_was_removed() {
        let directory = tempdir().expect("temporary directory");
        let database = Database::new(directory.path().join("nutbook.sqlite3"))
            .expect("database");
        let project_root = directory.path().join("project");
        fs::create_dir_all(&project_root).expect("project root");
        fs::write(project_root.join("review.md"), "# Review").expect("review");
        let project = connected_project(&database, &project_root);
        let stored = database
            .upsert_artifact_candidates(
                project.library_id,
                &[candidate(
                    project.library_id,
                    "review.md",
                    "pending",
                    "manual-review",
                    "review",
                )],
                "now",
            )
            .expect("candidate");
        database
            .accept_agent_artifact_candidates(
                project.library_id,
                &[stored[0].id.expect("candidate id")],
                "now",
            )
            .expect("accept");
        database
            .connection()
            .expect("connection")
            .execute(
                "UPDATE items SET is_deleted = 1 WHERE library_id = ?1",
                params![project.library_id],
            )
            .expect("simulate stale removed item");

        let known = database
            .known_artifact_paths_for_root(project_root.to_str().expect("project path"))
            .expect("known paths");
        assert!(!known.contains("review.md"));
        database
            .reconcile_accepted_agent_candidates(
                project.library_id,
                &known,
                &BTreeSet::from(["review.md".to_string()]),
            )
            .expect("reconcile accepted candidate");

        let status: String = database
            .connection()
            .expect("connection")
            .query_row(
                "SELECT status FROM artifact_candidates WHERE project_library_id = ?1",
                params![project.library_id],
                |row| row.get(0),
            )
            .expect("candidate status");
        assert_eq!(status, "pending");
    }

    #[test]
    fn group_accepts_only_suggested_and_single_accept_can_take_pending() {
        let directory = tempdir().expect("temporary directory");
        let database = Database::new(directory.path().join("nutbook.sqlite3"))
            .expect("database");
        let project_root = directory.path().join("project");
        fs::create_dir_all(&project_root).expect("project root");
        fs::write(project_root.join("suggested.md"), "# Suggested").expect("suggested");
        fs::write(project_root.join("pending.md"), "# Pending").expect("pending");
        let project = connected_project(&database, &project_root);
        let stored = database
            .upsert_artifact_candidates(
                project.library_id,
                &[
                    candidate(
                        project.library_id,
                        "suggested.md",
                        "suggested",
                        "run:one",
                        "suggested",
                    ),
                    candidate(
                        project.library_id,
                        "pending.md",
                        "pending",
                        "run:one",
                        "pending",
                    ),
                ],
                "2026-07-30T08:00:00Z",
            )
            .expect("candidates");

        let group_ids = database
            .candidate_ids_for_batches(project.library_id, &["run:one".to_string()])
            .expect("group ids");
        assert_eq!(group_ids, vec![stored[0].id.expect("suggested id")]);
        let group_result = database
            .accept_agent_artifact_candidates(
                project.library_id,
                &group_ids,
                "2026-07-30T09:00:00Z",
            )
            .expect("group acceptance");
        assert_eq!(group_result.accepted.len(), 1);

        let pending_result = database
            .accept_agent_artifact_candidates(
                project.library_id,
                &[stored[1].id.expect("pending id")],
                "2026-07-30T09:01:00Z",
            )
            .expect("single pending acceptance");
        assert_eq!(pending_result.accepted.len(), 1);
        let connection = database.connection().expect("connection");
        let counts: (i64, i64, i64) = connection
            .query_row(
                "SELECT
                   (SELECT COUNT(*) FROM items),
                   (SELECT COUNT(*) FROM item_sources WHERE library_id = ?1),
                   (SELECT COUNT(*) FROM item_provenance
                    WHERE project_library_id = ?1)",
                params![project.library_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("accepted counts");
        assert_eq!(counts, (2, 2, 2));
    }

    #[test]
    fn manifest_provenance_survives_candidate_acceptance() {
        let directory = tempdir().expect("temporary directory");
        let database = Database::new(directory.path().join("nutbook.sqlite3"))
            .expect("database");
        let project_root = directory.path().join("project");
        fs::create_dir_all(&project_root).expect("project root");
        let registered_path = project_root.join("registered.html");
        fs::write(&registered_path, "<main data-editable>Report</main>")
            .expect("registered artifact");
        let canonical_registered = fs::canonicalize(&registered_path).expect("canonical artifact");
        let connection = database.connection().expect("connection");
        connection
            .execute(
                "INSERT INTO libraries (
                   name, root_path, canonical_root_key, source_kind, path_state,
                   is_active, created_at, updated_at
                 ) VALUES ('registered.html', ?1, ?1, 'file', 'valid', 1, 'now', 'now')",
                params![canonical_registered.to_string_lossy()],
            )
            .expect("single-file library");
        let file_library_id = connection.last_insert_rowid();
        connection
            .execute(
                "INSERT INTO items (
                   library_id, file_path, relative_path, file_name, file_ext,
                   file_type, file_size, modified_at, path_state, is_deleted,
                   created_at, updated_at
                 ) VALUES (?1, ?2, 'registered.html', 'registered.html', 'html',
                           'html', 33, 'now', 'valid', 0, 'now', 'now')",
                params![file_library_id, canonical_registered.to_string_lossy()],
            )
            .expect("single-file item");
        let existing_item_id = connection.last_insert_rowid();
        connection
            .execute(
                "INSERT INTO item_sources (
                   item_id, library_id, link_kind, is_owner, created_at
                 ) VALUES (?1, ?2, 'legacy', 1, 'now')",
                params![existing_item_id, file_library_id],
            )
            .expect("single-file source");
        drop(connection);
        let project = connected_project(&database, &project_root);
        let mut registered = candidate(
            project.library_id,
            "registered.html",
            "suggested",
            "manifest:report-v1",
            "manifest-report-v1",
        );
        registered.artifact_kind = "html".to_string();
        registered.reasons = vec![DiscoveryReasonKind::NbskillRegistered];
        let evidence = &mut registered.evidence[0];
        evidence.reason = DiscoveryReasonKind::NbskillRegistered;
        evidence.skill_normalized_name = Some("report-writer".to_string());
        evidence.skill_display_name = Some("report-writer".to_string());
        evidence.manifest_entry_id = Some("report-v1".to_string());
        evidence.edit_contract = Some("nutbook-html/v1".to_string());
        evidence.save_policy = Some("managed-source".to_string());
        let stored = database
            .upsert_artifact_candidates(project.library_id, &[registered], "now")
            .expect("candidate");
        database
            .accept_agent_artifact_candidates(
                project.library_id,
                &[stored[0].id.expect("candidate id")],
                "now",
            )
            .expect("accept candidate");

        let connection = database.connection().expect("connection");
        let provenance: (String, String, String, String) = connection
            .query_row(
                "SELECT skill_normalized_name, manifest_entry_id, edit_contract, save_policy
                 FROM item_provenance WHERE project_library_id = ?1",
                params![project.library_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .expect("manifest provenance");
        let item_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM items WHERE file_path = ?1",
                params![canonical_registered.to_string_lossy()],
                |row| row.get(0),
            )
            .expect("item count");
        let manifest_link_count: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM item_sources
                 WHERE item_id = ?1 AND library_id = ?2 AND link_kind = 'manifest'",
                params![existing_item_id, project.library_id],
                |row| row.get(0),
            )
            .expect("manifest source link");
        assert_eq!(item_count, 1);
        assert_eq!(manifest_link_count, 1);
        assert_eq!(
            provenance,
            (
                "report-writer".to_string(),
                "report-v1".to_string(),
                "nutbook-html/v1".to_string(),
                "managed-source".to_string(),
            )
        );
    }

    #[test]
    fn removing_an_accepted_project_artifact_returns_its_candidate_to_pending() {
        let directory = tempdir().expect("temporary directory");
        let database = Database::new(directory.path().join("nutbook.sqlite3"))
            .expect("database");
        let project_root = directory.path().join("project");
        fs::create_dir_all(&project_root).expect("project root");
        fs::write(project_root.join("review.md"), "# Review").expect("review");
        let project = connected_project(&database, &project_root);
        let stored = database
            .upsert_artifact_candidates(
                project.library_id,
                &[candidate(
                    project.library_id,
                    "review.md",
                    "pending",
                    "manual-review",
                    "review",
                )],
                "now",
            )
            .expect("candidate");
        database
            .accept_agent_artifact_candidates(
                project.library_id,
                &[stored[0].id.expect("candidate id")],
                "now",
            )
            .expect("accept");
        let item_id: i64 = database
            .connection()
            .expect("connection")
            .query_row(
                "SELECT id FROM items WHERE library_id = ?1 AND relative_path = 'review.md'",
                params![project.library_id],
                |row| row.get(0),
            )
            .expect("accepted item");

        database
            .remove_item_from_nutbook(item_id, "later")
            .expect("remove item");

        let status: String = database
            .connection()
            .expect("connection")
            .query_row(
                "SELECT status FROM artifact_candidates WHERE id = ?1",
                params![stored[0].id.expect("candidate id")],
                |row| row.get(0),
            )
            .expect("candidate status");
        assert_eq!(status, "pending");
    }

    #[test]
    fn preflight_skips_missing_files_and_transaction_failure_rolls_back_valid_set() {
        let directory = tempdir().expect("temporary directory");
        let database = Database::new(directory.path().join("nutbook.sqlite3"))
            .expect("database");
        let project_root = directory.path().join("project");
        fs::create_dir_all(&project_root).expect("project root");
        fs::write(project_root.join("valid.md"), "# Valid").expect("valid file");
        fs::write(project_root.join("second.md"), "# Second").expect("second file");
        let project = connected_project(&database, &project_root);
        let stored = database
            .upsert_artifact_candidates(
                project.library_id,
                &[
                    candidate(
                        project.library_id,
                        "valid.md",
                        "suggested",
                        "run:rollback",
                        "valid",
                    ),
                    candidate(
                        project.library_id,
                        "missing.md",
                        "suggested",
                        "run:rollback",
                        "missing",
                    ),
                    candidate(
                        project.library_id,
                        "second.md",
                        "suggested",
                        "run:rollback",
                        "second",
                    ),
                ],
                "2026-07-30T08:00:00Z",
            )
            .expect("candidates");
        let valid_id = stored[0].id.expect("valid id");
        let missing_id = stored[1].id.expect("missing id");
        let second_id = stored[2].id.expect("second id");

        let connection = database.connection().expect("connection");
        connection
            .execute_batch(
                "CREATE TRIGGER fail_agent_provenance
                 BEFORE INSERT ON item_provenance
                 BEGIN
                   SELECT RAISE(ABORT, 'forced provenance failure');
                 END;",
            )
            .expect("failure trigger");
        drop(connection);

        let result = database
            .accept_agent_artifact_candidates(
                project.library_id,
                &[valid_id, missing_id, second_id],
                "2026-07-30T09:00:00Z",
            )
            .expect("grouped failure result");
        assert_eq!(result.accepted.len(), 0);
        assert_eq!(result.skipped.len(), 1);
        assert_eq!(result.skipped[0].candidate_id, missing_id);
        assert_eq!(result.skipped[0].reason, "path_missing_or_unsafe");
        assert_eq!(result.failed.len(), 2);
        assert!(result
            .failed
            .iter()
            .all(|item| item.reason == "transaction_rolled_back"));

        let connection = database.connection().expect("connection");
        let counts: (i64, i64, i64) = connection
            .query_row(
                "SELECT
                   (SELECT COUNT(*) FROM items),
                   (SELECT COUNT(*) FROM item_sources),
                   (SELECT COUNT(*) FROM artifact_candidates
                    WHERE status = 'accepted')",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("rolled back counts");
        assert_eq!(counts, (0, 0, 0));
    }

    #[cfg(unix)]
    #[test]
    fn acceptance_rejects_primary_and_related_paths_swapped_to_outside_symlinks() {
        use std::os::unix::fs::symlink;

        let directory = tempdir().expect("temporary directory");
        let database = Database::new(directory.path().join("symlink.sqlite3"))
            .expect("database");
        let project_root = directory.path().join("project");
        let outside_root = directory.path().join("outside");
        fs::create_dir_all(project_root.join("assets")).expect("project assets");
        fs::create_dir_all(&outside_root).expect("outside root");
        fs::write(project_root.join("report.md"), "# Report").expect("report");
        fs::write(project_root.join("assets/data.json"), "{}\n").expect("related");
        fs::write(outside_root.join("secret.md"), "# Secret").expect("outside primary");
        fs::write(outside_root.join("secret.json"), "{}\n").expect("outside related");
        let project = connected_project(&database, &project_root);
        let mut primary_candidate = candidate(
            project.library_id,
            "report.md",
            "suggested",
            "run:symlink",
            "primary-symlink",
        );
        primary_candidate.related_files = vec![RelatedArtifactFile {
            path: "assets/data.json".to_string(),
            role: "data".to_string(),
        }];
        let stored = database
            .upsert_artifact_candidates(
                project.library_id,
                &[primary_candidate],
                "2026-08-01T00:00:00Z",
            )
            .expect("candidate");
        let candidate_id = stored[0].id.expect("candidate id");

        fs::remove_file(project_root.join("report.md")).expect("remove primary");
        symlink(
            outside_root.join("secret.md"),
            project_root.join("report.md"),
        )
        .expect("swap primary");
        let primary_result = database
            .accept_agent_artifact_candidates(project.library_id, &[candidate_id], "now")
            .expect("primary result");
        assert_eq!(primary_result.skipped[0].reason, "path_missing_or_unsafe");

        fs::remove_file(project_root.join("report.md")).expect("remove primary link");
        fs::write(project_root.join("report.md"), "# Report").expect("restore primary");
        fs::remove_file(project_root.join("assets/data.json")).expect("remove related");
        symlink(
            outside_root.join("secret.json"),
            project_root.join("assets/data.json"),
        )
        .expect("swap related");
        let related_result = database
            .accept_agent_artifact_candidates(project.library_id, &[candidate_id], "now")
            .expect("related result");
        assert_eq!(
            related_result.skipped[0].reason,
            "related_path_missing_or_unsafe"
        );
        let item_count: i64 = database
            .connection()
            .expect("connection")
            .query_row("SELECT COUNT(*) FROM items", [], |row| row.get(0))
            .expect("item count");
        assert_eq!(item_count, 0);
    }
}
