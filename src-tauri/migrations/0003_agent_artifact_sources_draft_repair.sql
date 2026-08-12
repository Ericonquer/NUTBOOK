CREATE TABLE libraries_v3 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  root_path TEXT NOT NULL,
  canonical_root_key TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'folder'
    CHECK (source_kind IN ('folder', 'file', 'agent_project')),
  path_state TEXT NOT NULL DEFAULT 'valid'
    CHECK (path_state IN ('valid', 'missing')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_scanned_at TEXT
);

INSERT INTO libraries_v3 (
  id, name, root_path, canonical_root_key, source_kind, path_state, is_active,
  created_at, updated_at, last_scanned_at
)
SELECT
  id, name, root_path, root_path, source_kind, path_state, is_active,
  created_at, updated_at, last_scanned_at
FROM libraries;

DROP TABLE libraries;
ALTER TABLE libraries_v3 RENAME TO libraries;

CREATE UNIQUE INDEX idx_libraries_canonical_root_source_kind
  ON libraries(canonical_root_key, source_kind);

ALTER TABLE agent_project_sources RENAME TO agent_project_sources_draft;
ALTER TABLE agent_project_adapters RENAME TO agent_project_adapters_draft;

CREATE TABLE agent_project_sources (
  library_id INTEGER PRIMARY KEY,
  scope_kind TEXT NOT NULL CHECK (scope_kind IN ('project', 'task')),
  discovery_mode TEXT NOT NULL CHECK (discovery_mode IN ('adapter', 'hybrid')),
  manifest_path TEXT,
  auto_import_mode TEXT NOT NULL DEFAULT 'explicit'
    CHECK (auto_import_mode IN ('explicit', 'confirm')),
  last_manifest_ok_at TEXT,
  last_scan_status TEXT NOT NULL DEFAULT 'not_scanned'
    CHECK (last_scan_status IN ('not_scanned', 'complete', 'partial')),
  last_scan_issue TEXT,
  FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
);

INSERT INTO agent_project_sources (
  library_id, scope_kind, discovery_mode, manifest_path,
  auto_import_mode, last_manifest_ok_at, last_scan_status, last_scan_issue
)
SELECT
  library_id, 'project', discovery_mode, manifest_path,
  auto_import_mode, last_manifest_ok_at, 'not_scanned', NULL
FROM agent_project_sources_draft;

CREATE TABLE agent_project_adapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  library_id INTEGER NOT NULL,
  adapter_id TEXT NOT NULL,
  external_scope_id TEXT NOT NULL,
  adapter_profile TEXT,
  capability TEXT NOT NULL,
  snapshot_status TEXT NOT NULL DEFAULT 'ready'
    CHECK (snapshot_status IN ('ready', 'stale', 'unsupported', 'unavailable')),
  last_attempted_at TEXT,
  last_successful_at TEXT,
  last_error_kind TEXT,
  last_error_message TEXT,
  UNIQUE (library_id, adapter_id, external_scope_id),
  UNIQUE (adapter_id, external_scope_id),
  FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
);

INSERT INTO agent_project_adapters (
  library_id, adapter_id, external_scope_id, adapter_profile,
  capability, snapshot_status, last_attempted_at, last_successful_at,
  last_error_kind, last_error_message
)
SELECT
  library_id,
  adapter_id,
  COALESCE(NULLIF(external_project_id, ''), adapter_id || ':legacy:' || library_id),
  adapter_version,
  'project-only',
  CASE WHEN last_error_kind IS NULL THEN 'ready' ELSE 'stale' END,
  last_discovered_at,
  CASE WHEN last_error_kind IS NULL THEN last_discovered_at ELSE NULL END,
  last_error_kind,
  last_error_message
FROM agent_project_sources_draft;

INSERT OR IGNORE INTO agent_project_adapters (
  library_id, adapter_id, external_scope_id, adapter_profile,
  capability, snapshot_status, last_attempted_at, last_successful_at,
  last_error_kind, last_error_message
)
SELECT
  library_id,
  adapter_id,
  COALESCE(NULLIF(external_project_id, ''), adapter_id || ':legacy:' || library_id),
  adapter_version,
  'project-only',
  'ready',
  last_discovered_at,
  last_discovered_at,
  NULL,
  NULL
FROM agent_project_adapters_draft;

DROP TABLE agent_project_adapters_draft;
DROP TABLE agent_project_sources_draft;

CREATE INDEX idx_agent_project_adapters_library
  ON agent_project_adapters(library_id, adapter_id);

ALTER TABLE artifact_candidates
  ADD COLUMN agent_kind TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE artifact_candidate_evidence
  ADD COLUMN agent_kind TEXT NOT NULL DEFAULT 'unknown';
