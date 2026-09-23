-- Durable, deduplicated search links. Included in the complete SQLite backup.
CREATE TABLE IF NOT EXISTS shared_searches (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
