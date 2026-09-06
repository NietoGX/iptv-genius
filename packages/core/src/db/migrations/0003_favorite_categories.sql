CREATE TABLE favorite_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
  group_title TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_favorite_categories_source ON favorite_categories (source_id);
