PRAGMA foreign_keys = ON;

-- Frozen from the released 0.6.0 schema after Database::initialize.
-- The fixture intentionally contains representative user state so migration
-- tests prove more than table creation.

CREATE TABLE libraries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  root_path TEXT NOT NULL UNIQUE,
  source_kind TEXT NOT NULL DEFAULT 'folder'
    CHECK (source_kind IN ('folder', 'file')),
  path_state TEXT NOT NULL DEFAULT 'valid'
    CHECK (path_state IN ('valid', 'missing')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_scanned_at TEXT
);

CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  library_id INTEGER NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  relative_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_ext TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('html', 'markdown')),
  file_size INTEGER NOT NULL DEFAULT 0,
  modified_at TEXT NOT NULL,
  file_hash TEXT,
  title TEXT,
  summary TEXT,
  path_state TEXT NOT NULL DEFAULT 'valid'
    CHECK (path_state IN ('valid', 'missing')),
  is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
  last_opened_at TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE INDEX idx_items_library_id ON items(library_id);
CREATE INDEX idx_items_file_type ON items(file_type);
CREATE INDEX idx_items_modified_at ON items(modified_at DESC);
CREATE INDEX idx_items_is_favorite ON items(is_favorite);
CREATE INDEX idx_items_last_opened_at ON items(last_opened_at DESC);
CREATE INDEX idx_items_is_deleted ON items(is_deleted);

CREATE TABLE item_content (
  item_id INTEGER PRIMARY KEY,
  source_text TEXT,
  raw_text TEXT,
  rendered_cache TEXT,
  extracted_title TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE ignored_items (
  item_id INTEGER PRIMARY KEY,
  library_id INTEGER NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE INDEX idx_ignored_items_library_id ON ignored_items(library_id);

CREATE TABLE excluded_skills (
  normalized_name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE skill_visibility_overrides (
  normalized_name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('include', 'exclude')),
  created_at TEXT NOT NULL
);

CREATE TABLE library_skill_bindings (
  library_id INTEGER PRIMARY KEY,
  normalized_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE item_tags (
  item_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (item_id, tag_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_item_tags_tag_id ON item_tags(tag_id);

CREATE TABLE thumbnail_cache (
  item_id INTEGER PRIMARY KEY,
  thumb_path TEXT,
  thumb_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (thumb_status IN ('pending', 'ready', 'failed', 'stale')),
  width INTEGER,
  height INTEGER,
  generated_from_hash TEXT,
  last_generated_at TEXT,
  error_message TEXT,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE VIRTUAL TABLE items_fts USING fts5(
  item_id UNINDEXED,
  file_name,
  title,
  raw_text,
  tokenize = 'unicode61 remove_diacritics 2'
);

INSERT INTO libraries (
  id, name, root_path, source_kind, path_state, is_active,
  created_at, updated_at, last_scanned_at
) VALUES (
  7, 'Published 0.6 Library', '/fixture/published-0.6', 'folder', 'valid',
  1, '2026-07-28T00:00:00Z', '2026-07-29T00:00:00Z',
  '2026-07-29T00:00:00Z'
);

INSERT INTO items (
  id, library_id, file_path, relative_path, file_name, file_ext,
  file_type, file_size, modified_at, file_hash, title, summary,
  path_state, is_favorite, last_opened_at, is_deleted, created_at, updated_at
) VALUES
(
  11, 7, '/fixture/published-0.6/report.md', 'report.md', 'report.md',
  'md', 'markdown', 42, '1785196800', 'fixture-hash',
  'Published report', 'Preserved during migration', 'valid', 1,
  '2026-07-29T00:00:00Z', 0, '2026-07-28T00:00:00Z',
  '2026-07-29T00:00:00Z'
),
(
  12, 7, '/fixture/published-0.6/ignored.html', 'ignored.html', 'ignored.html',
  'html', 'html', 64, '1785196801', 'ignored-hash',
  'Ignored preview', 'Ignored state must survive migration', 'valid', 0,
  NULL, 1, '2026-07-28T00:00:00Z', '2026-07-29T00:00:00Z'
);

INSERT INTO item_content (
  item_id, source_text, raw_text, rendered_cache, extracted_title, updated_at
) VALUES (
  11, '# Published report', 'Published report body', '<h1>Published report</h1>',
  'Published report', '2026-07-29T00:00:00Z'
);

INSERT INTO ignored_items (item_id, library_id, file_path, created_at)
VALUES (12, 7, '/fixture/published-0.6/ignored.html', '2026-07-29T00:00:00Z');

INSERT INTO excluded_skills (normalized_name, display_name, created_at)
VALUES ('review-only', 'Review Only', '2026-07-29T00:00:00Z');

INSERT INTO skill_visibility_overrides (
  normalized_name, display_name, mode, created_at
) VALUES ('html-ppt', 'HTML PPT', 'include', '2026-07-29T00:00:00Z');

INSERT INTO library_skill_bindings (
  library_id, normalized_name, display_name, created_at
) VALUES (7, 'html-ppt', 'HTML PPT', '2026-07-29T00:00:00Z');

INSERT INTO tags (id, name, color, created_at, updated_at)
VALUES (3, 'Published', '#4F46E5', '2026-07-28T00:00:00Z', '2026-07-29T00:00:00Z');

INSERT INTO item_tags (item_id, tag_id, created_at)
VALUES (11, 3, '2026-07-29T00:00:00Z');

INSERT INTO thumbnail_cache (
  item_id, thumb_path, thumb_status, width, height,
  generated_from_hash, last_generated_at, error_message
) VALUES (
  11, '/fixture/cache/report.png', 'ready', 640, 360,
  'fixture-hash', '2026-07-29T00:00:00Z', NULL
);

INSERT INTO items_fts (rowid, item_id, file_name, title, raw_text)
VALUES (11, 11, 'report.md', 'Published report', 'Published report body');
