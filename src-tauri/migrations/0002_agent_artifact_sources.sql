CREATE TABLE libraries_v2 (
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

INSERT INTO libraries_v2 (
  id, name, root_path, canonical_root_key, source_kind, path_state, is_active,
  created_at, updated_at, last_scanned_at
)
SELECT
  id, name, root_path, root_path, source_kind, path_state, is_active,
  created_at, updated_at, last_scanned_at
FROM libraries;

DROP TABLE libraries;
ALTER TABLE libraries_v2 RENAME TO libraries;

CREATE UNIQUE INDEX idx_libraries_canonical_root_source_kind
  ON libraries(canonical_root_key, source_kind);

CREATE TABLE item_sources (
  item_id INTEGER NOT NULL,
  library_id INTEGER NOT NULL,
  link_kind TEXT NOT NULL
    CHECK (link_kind IN ('legacy', 'discovered', 'manifest')),
  is_owner INTEGER NOT NULL DEFAULT 0 CHECK (is_owner IN (0, 1)),
  created_at TEXT NOT NULL,
  PRIMARY KEY (item_id, library_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
);

INSERT INTO item_sources (item_id, library_id, link_kind, is_owner, created_at)
SELECT id, library_id, 'legacy', 1, created_at
FROM items;

CREATE UNIQUE INDEX idx_item_sources_one_owner
  ON item_sources(item_id)
  WHERE is_owner = 1;
CREATE INDEX idx_item_sources_library_id
  ON item_sources(library_id);

CREATE TABLE agent_project_sources (
  library_id INTEGER PRIMARY KEY,
  scope_kind TEXT NOT NULL CHECK (scope_kind IN ('project', 'task')),
  discovery_mode TEXT NOT NULL
    CHECK (discovery_mode IN ('adapter', 'hybrid')),
  manifest_path TEXT,
  auto_import_mode TEXT NOT NULL DEFAULT 'explicit'
    CHECK (auto_import_mode IN ('explicit', 'confirm')),
  last_manifest_ok_at TEXT,
  last_scan_status TEXT NOT NULL DEFAULT 'not_scanned'
    CHECK (last_scan_status IN ('not_scanned', 'complete', 'partial')),
  last_scan_issue TEXT,
  FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
);

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

CREATE INDEX idx_agent_project_adapters_library
  ON agent_project_adapters(library_id, adapter_id);

CREATE TABLE item_provenance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  project_library_id INTEGER NOT NULL,
  agent_kind TEXT NOT NULL,
  skill_normalized_name TEXT,
  skill_display_name TEXT,
  evidence_kind TEXT NOT NULL,
  run_reference_hash TEXT,
  evidence_fingerprint TEXT NOT NULL,
  generated_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (item_id, project_library_id, evidence_fingerprint),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (project_library_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE INDEX idx_item_provenance_project_library
  ON item_provenance(project_library_id);

CREATE TABLE artifact_related_files (
  item_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('asset', 'data', 'attachment')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (item_id, file_path),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE artifact_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_library_id INTEGER NOT NULL,
  agent_kind TEXT NOT NULL,
  primary_path TEXT NOT NULL,
  artifact_kind TEXT NOT NULL CHECK (artifact_kind IN ('markdown', 'html')),
  status TEXT NOT NULL CHECK (
    status IN (
      'suggested', 'pending', 'accepted', 'excluded',
      'ignored', 'superseded', 'missing'
    )
  ),
  batch_key TEXT NOT NULL,
  reasons_json TEXT NOT NULL,
  discovery_fingerprint TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  modified_at TEXT,
  first_discovered_at TEXT NOT NULL,
  last_discovered_at TEXT NOT NULL,
  UNIQUE (project_library_id, primary_path),
  FOREIGN KEY (project_library_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE INDEX idx_artifact_candidates_project_status
  ON artifact_candidates(project_library_id, status, batch_key);

CREATE TABLE artifact_candidate_evidence (
  candidate_id INTEGER NOT NULL,
  evidence_fingerprint TEXT NOT NULL,
  agent_kind TEXT NOT NULL,
  reason_kind TEXT NOT NULL,
  event_id TEXT NOT NULL,
  run_reference_hash TEXT,
  observed_at TEXT,
  PRIMARY KEY (candidate_id, evidence_fingerprint),
  FOREIGN KEY (candidate_id) REFERENCES artifact_candidates(id) ON DELETE CASCADE
);

CREATE TABLE artifact_candidate_related_files (
  candidate_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('asset', 'data', 'attachment')),
  PRIMARY KEY (candidate_id, file_path),
  FOREIGN KEY (candidate_id) REFERENCES artifact_candidates(id) ON DELETE CASCADE
);
