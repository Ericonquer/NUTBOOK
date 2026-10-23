-- Disposable projections of durable document-versions headers/manifests.
-- Deliberately independent from items: removing a library never deletes history.
CREATE TABLE IF NOT EXISTS history_documents (
    document_id TEXT PRIMARY KEY,
    canonical_path TEXT NOT NULL,
    file_identity TEXT NOT NULL,
    binding_revision INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    source_available INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_history_document_path ON history_documents(canonical_path);
CREATE TABLE IF NOT EXISTS history_versions (
    version_id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES history_documents(document_id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    saved_at TEXT NOT NULL,
    kind TEXT NOT NULL,
    body_hash TEXT NOT NULL,
    incomplete INTEGER NOT NULL,
    UNIQUE(document_id, sequence)
);
CREATE TABLE IF NOT EXISTS history_object_refs (
    version_id TEXT NOT NULL REFERENCES history_versions(version_id) ON DELETE CASCADE,
    object_hash TEXT NOT NULL,
    PRIMARY KEY(version_id, object_hash)
);
CREATE INDEX IF NOT EXISTS idx_history_object_hash ON history_object_refs(object_hash);
CREATE TABLE IF NOT EXISTS history_settings (
    singleton INTEGER PRIMARY KEY CHECK(singleton=1),
    revision INTEGER NOT NULL,
    limit_bytes INTEGER NOT NULL,
    used_bytes INTEGER NOT NULL
);
