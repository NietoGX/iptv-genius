import type { Database } from 'better-sqlite3'
import type { Source, SourceType } from '../../types/domain'

interface SourceRow {
  id: number
  type: SourceType
  name: string
  url: string
  username: string | null
  password: string | null
  created_at: number
  last_refreshed_at: number | null
}

function rowToSource(row: SourceRow): Source {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    url: row.url,
    username: row.username ?? undefined,
    password: row.password ?? undefined,
    createdAt: row.created_at,
    lastRefreshedAt: row.last_refreshed_at
  }
}

export interface NewSource {
  type: SourceType
  name: string
  url: string
  username?: string
  password?: string
}

export function createSourcesRepo(db: Database) {
  return {
    add(source: NewSource): Source {
      const createdAt = Date.now()
      const result = db
        .prepare(
          `INSERT INTO sources (type, name, url, username, password, created_at, last_refreshed_at)
           VALUES (@type, @name, @url, @username, @password, @createdAt, NULL)`
        )
        .run({
          type: source.type,
          name: source.name,
          url: source.url,
          username: source.username ?? null,
          password: source.password ?? null,
          createdAt
        })

      return {
        id: Number(result.lastInsertRowid),
        type: source.type,
        name: source.name,
        url: source.url,
        username: source.username,
        password: source.password,
        createdAt,
        lastRefreshedAt: null
      }
    },

    list(): Source[] {
      const rows = db.prepare('SELECT * FROM sources ORDER BY created_at ASC').all() as SourceRow[]
      return rows.map(rowToSource)
    },

    get(id: number): Source | null {
      const row = db.prepare('SELECT * FROM sources WHERE id = ?').get(id) as
        | SourceRow
        | undefined
      return row ? rowToSource(row) : null
    },

    remove(id: number): void {
      db.prepare('DELETE FROM sources WHERE id = ?').run(id)
    },

    markRefreshed(id: number): void {
      db.prepare('UPDATE sources SET last_refreshed_at = ? WHERE id = ?').run(Date.now(), id)
    }
  }
}

export type SourcesRepo = ReturnType<typeof createSourcesRepo>
