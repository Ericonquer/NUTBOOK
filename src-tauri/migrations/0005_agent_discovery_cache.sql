CREATE TABLE IF NOT EXISTS agent_discovery_cache (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  payload_json TEXT NOT NULL,
  discovered_at TEXT NOT NULL
);
