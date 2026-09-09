import type { DB } from '@op-engineering/op-sqlite'

interface Migration {
  version: number
  statements: string[]
}

// Mirrors packages/core/src/db/migrations/*.sql (same schema, same order) —
// split into individual statements because op-sqlite's execute runs one
// statement per call, unlike better-sqlite3's exec() which accepts a script.
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK (type IN ('m3u', 'xtream')),
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        username TEXT,
        password TEXT,
        created_at INTEGER NOT NULL,
        last_refreshed_at INTEGER
      )`,
      `CREATE TABLE channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK (kind IN ('live', 'vod', 'series')),
        tvg_id TEXT,
        name TEXT NOT NULL,
        logo_url TEXT,
        group_title TEXT,
        stream_url TEXT NOT NULL,
        xtream_stream_id TEXT
      )`,
      'CREATE INDEX idx_channels_source ON channels (source_id, kind)',
      'CREATE INDEX idx_channels_tvg_id ON channels (tvg_id)',
      `CREATE TABLE series_episodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        series_channel_id INTEGER NOT NULL REFERENCES channels (id) ON DELETE CASCADE,
        season INTEGER NOT NULL,
        episode INTEGER NOT NULL,
        title TEXT NOT NULL,
        stream_url TEXT NOT NULL
      )`,
      'CREATE INDEX idx_series_episodes_parent ON series_episodes (series_channel_id, season, episode)',
      `CREATE TABLE epg_programmes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
        channel_ref TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        start_ts INTEGER NOT NULL,
        stop_ts INTEGER NOT NULL
      )`,
      'CREATE INDEX idx_epg_channel_time ON epg_programmes (channel_ref, start_ts, stop_ts)',
      `CREATE TABLE favorites (
        channel_id INTEGER PRIMARY KEY REFERENCES channels (id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE watch_history (
        channel_id INTEGER PRIMARY KEY REFERENCES channels (id) ON DELETE CASCADE,
        last_position_seconds INTEGER NOT NULL,
        last_watched_at INTEGER NOT NULL
      )`,
      `CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`
    ]
  },
  {
    version: 2,
    statements: ['CREATE INDEX idx_channels_source_kind_group ON channels (source_id, kind, group_title)']
  },
  {
    version: 3,
    statements: [
      `CREATE TABLE favorite_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
        group_title TEXT,
        created_at INTEGER NOT NULL
      )`,
      'CREATE INDEX idx_favorite_categories_source ON favorite_categories (source_id)'
    ]
  },
  { version: 4, statements: ['ALTER TABLE sources ADD COLUMN epg_url TEXT'] },
  { version: 5, statements: ['CREATE INDEX idx_epg_source_stop ON epg_programmes (source_id, stop_ts)'] }
]

export async function runMigrations(db: DB): Promise<void> {
  const { rows } = await db.execute('PRAGMA user_version')
  const currentVersion = Number((rows[0] as { user_version?: number } | undefined)?.user_version ?? 0)

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue
    await db.executeBatch(migration.statements.map((sql) => [sql] as [string]))
    await db.execute(`PRAGMA user_version = ${migration.version}`)
  }
}
