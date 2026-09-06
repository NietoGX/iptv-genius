CREATE TABLE sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('m3u', 'xtream')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  username TEXT,
  password TEXT,
  created_at INTEGER NOT NULL,
  last_refreshed_at INTEGER
);

CREATE TABLE channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('live', 'vod', 'series')),
  tvg_id TEXT,
  name TEXT NOT NULL,
  logo_url TEXT,
  group_title TEXT,
  stream_url TEXT NOT NULL,
  xtream_stream_id TEXT
);

CREATE INDEX idx_channels_source ON channels (source_id, kind);
CREATE INDEX idx_channels_tvg_id ON channels (tvg_id);

CREATE TABLE series_episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  series_channel_id INTEGER NOT NULL REFERENCES channels (id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  episode INTEGER NOT NULL,
  title TEXT NOT NULL,
  stream_url TEXT NOT NULL
);

CREATE INDEX idx_series_episodes_parent ON series_episodes (series_channel_id, season, episode);

CREATE TABLE epg_programmes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
  channel_ref TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_ts INTEGER NOT NULL,
  stop_ts INTEGER NOT NULL
);

CREATE INDEX idx_epg_channel_time ON epg_programmes (channel_ref, start_ts, stop_ts);

CREATE TABLE favorites (
  channel_id INTEGER PRIMARY KEY REFERENCES channels (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE watch_history (
  channel_id INTEGER PRIMARY KEY REFERENCES channels (id) ON DELETE CASCADE,
  last_position_seconds INTEGER NOT NULL,
  last_watched_at INTEGER NOT NULL
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
