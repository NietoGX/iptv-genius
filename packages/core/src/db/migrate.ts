import type { Database as DatabaseType } from 'better-sqlite3'
import migration0001 from './migrations/0001_init.sql?raw'
import migration0002 from './migrations/0002_category_index.sql?raw'
import migration0003 from './migrations/0003_favorite_categories.sql?raw'
import migration0004 from './migrations/0004_source_epg_url.sql?raw'
import migration0005 from './migrations/0005_epg_source_index.sql?raw'

interface Migration {
  version: number
  sql: string
}

/** Ordered, hand-written migrations. Add new entries here rather than
 * scanning the migrations folder at runtime, since directory listing is
 * fragile once files are bundled by Vite for the packaged app. */
const MIGRATIONS: Migration[] = [
  { version: 1, sql: migration0001 },
  { version: 2, sql: migration0002 },
  { version: 3, sql: migration0003 },
  { version: 4, sql: migration0004 },
  { version: 5, sql: migration0005 }
]

export function runMigrations(db: DatabaseType): void {
  const currentVersion = db.pragma('user_version', { simple: true }) as number

  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion) continue
    db.exec(migration.sql)
    db.pragma(`user_version = ${migration.version}`)
  }
}
