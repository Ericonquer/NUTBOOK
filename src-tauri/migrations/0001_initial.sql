PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS libraries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  root_path TEXT NOT NULL UNIQUE,
  source_kind TEXT NOT NULL DEFAULT 'folder' CHECK (source_kind IN ('folder', 'file')),
  path_state TEXT NOT NULL DEFAULT 'valid' CHECK (path_state IN ('valid', 'missing')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_scanned_at TEXT
);

CREATE TABLE IF NOT EXISTS items (
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
  path_state TEXT NOT NULL DEFAULT 'valid' CHECK (path_state IN ('valid', 'missing')),
  is_favorite INTEGER NOT NULL DEFAULT 0 CHECK (is_favorite IN (0, 1)),
  last_opened_at TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_items_library_id ON items(library_id);
CREATE INDEX IF NOT EXISTS idx_items_file_type ON items(file_type);
CREATE INDEX IF NOT EXISTS idx_items_modified_at ON items(modified_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_is_favorite ON items(is_favorite);
CREATE INDEX IF NOT EXISTS idx_items_last_opened_at ON items(last_opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_is_deleted ON items(is_deleted);

CREATE TABLE IF NOT EXISTS item_content (
  item_id INTEGER PRIMARY KEY,
  source_text TEXT,
  raw_text TEXT,
  rendered_cache TEXT,
  extracted_title TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ignored_items (
  item_id INTEGER PRIMARY KEY,
  library_id INTEGER NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ignored_items_library_id ON ignored_items(library_id);

CREATE TABLE IF NOT EXISTS excluded_skills (
  normalized_name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_visibility_overrides (
  normalized_name TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('include', 'exclude')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS library_skill_bindings (
  library_id INTEGER PRIMARY KEY,
  normalized_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS item_tags (
  item_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (item_id, tag_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags(tag_id);

CREATE TABLE IF NOT EXISTS thumbnail_cache (
  item_id INTEGER PRIMARY KEY,
  thumb_path TEXT,
  thumb_status TEXT NOT NULL DEFAULT 'pending' CHECK (thumb_status IN ('pending', 'ready', 'failed', 'stale')),
  width INTEGER,
  height INTEGER,
  generated_from_hash TEXT,
  last_generated_at TEXT,
  error_message TEXT,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  item_id UNINDEXED,
  file_name,
  title,
  raw_text,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TRIGGER IF NOT EXISTS trg_items_ai_fts
AFTER INSERT ON items
BEGIN
  INSERT INTO items_fts (rowid, item_id, file_name, title, raw_text)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.file_name,
    COALESCE(NEW.title, ''),
    COALESCE((SELECT raw_text FROM item_content WHERE item_id = NEW.id), '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_items_au_fts
AFTER UPDATE OF file_name, title ON items
WHEN NEW.is_deleted = 0
BEGIN
  INSERT INTO items_fts(items_fts, rowid, item_id, file_name, title, raw_text)
  VALUES('delete', NEW.id, OLD.id, OLD.file_name, COALESCE(OLD.title, ''), COALESCE((SELECT raw_text FROM item_content WHERE item_id = OLD.id), ''));

  INSERT INTO items_fts(rowid, item_id, file_name, title, raw_text)
  VALUES(
    NEW.id,
    NEW.id,
    NEW.file_name,
    COALESCE(NEW.title, ''),
    COALESCE((SELECT raw_text FROM item_content WHERE item_id = NEW.id), '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_items_soft_delete_fts
AFTER UPDATE OF is_deleted ON items
BEGIN
  INSERT INTO items_fts(items_fts, rowid, item_id, file_name, title, raw_text)
  VALUES(
    'delete',
    NEW.id,
    OLD.id,
    OLD.file_name,
    COALESCE(OLD.title, ''),
    COALESCE((SELECT raw_text FROM item_content WHERE item_id = OLD.id), '')
  );

  INSERT INTO items_fts(rowid, item_id, file_name, title, raw_text)
  SELECT
    NEW.id,
    NEW.id,
    NEW.file_name,
    COALESCE(NEW.title, ''),
    COALESCE((SELECT raw_text FROM item_content WHERE item_id = NEW.id), '')
  WHERE NEW.is_deleted = 0;
END;

CREATE TRIGGER IF NOT EXISTS trg_items_ad_fts
AFTER DELETE ON items
BEGIN
  INSERT INTO items_fts(items_fts, rowid, item_id, file_name, title, raw_text)
  VALUES('delete', OLD.id, OLD.id, OLD.file_name, COALESCE(OLD.title, ''), COALESCE((SELECT raw_text FROM item_content WHERE item_id = OLD.id), ''));
END;

CREATE TRIGGER IF NOT EXISTS trg_item_content_ai_fts
AFTER INSERT ON item_content
WHEN EXISTS (
  SELECT 1 FROM items
  WHERE id = NEW.item_id AND is_deleted = 0
)
BEGIN
  INSERT INTO items_fts(items_fts, rowid, item_id, file_name, title, raw_text)
  VALUES(
    'delete',
    NEW.item_id,
    NEW.item_id,
    COALESCE((SELECT file_name FROM items WHERE id = NEW.item_id), ''),
    COALESCE((SELECT title FROM items WHERE id = NEW.item_id), ''),
    ''
  );

  INSERT INTO items_fts(rowid, item_id, file_name, title, raw_text)
  VALUES(
    NEW.item_id,
    NEW.item_id,
    COALESCE((SELECT file_name FROM items WHERE id = NEW.item_id), ''),
    COALESCE((SELECT title FROM items WHERE id = NEW.item_id), ''),
    COALESCE(NEW.raw_text, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_item_content_au_fts
AFTER UPDATE OF raw_text ON item_content
WHEN EXISTS (
  SELECT 1 FROM items
  WHERE id = NEW.item_id AND is_deleted = 0
)
BEGIN
  INSERT INTO items_fts(items_fts, rowid, item_id, file_name, title, raw_text)
  VALUES(
    'delete',
    NEW.item_id,
    NEW.item_id,
    COALESCE((SELECT file_name FROM items WHERE id = NEW.item_id), ''),
    COALESCE((SELECT title FROM items WHERE id = NEW.item_id), ''),
    COALESCE(OLD.raw_text, '')
  );

  INSERT INTO items_fts(rowid, item_id, file_name, title, raw_text)
  VALUES(
    NEW.item_id,
    NEW.item_id,
    COALESCE((SELECT file_name FROM items WHERE id = NEW.item_id), ''),
    COALESCE((SELECT title FROM items WHERE id = NEW.item_id), ''),
    COALESCE(NEW.raw_text, '')
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_item_content_ad_fts
AFTER DELETE ON item_content
WHEN EXISTS (
  SELECT 1 FROM items
  WHERE id = OLD.item_id AND is_deleted = 0
)
BEGIN
  INSERT INTO items_fts(items_fts, rowid, item_id, file_name, title, raw_text)
  VALUES(
    'delete',
    OLD.item_id,
    OLD.item_id,
    COALESCE((SELECT file_name FROM items WHERE id = OLD.item_id), ''),
    COALESCE((SELECT title FROM items WHERE id = OLD.item_id), ''),
    COALESCE(OLD.raw_text, '')
  );

  INSERT INTO items_fts(rowid, item_id, file_name, title, raw_text)
  VALUES(
    OLD.item_id,
    OLD.item_id,
    COALESCE((SELECT file_name FROM items WHERE id = OLD.item_id), ''),
    COALESCE((SELECT title FROM items WHERE id = OLD.item_id), ''),
    ''
  );
END;

COMMIT;
