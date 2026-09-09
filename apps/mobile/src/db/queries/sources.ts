import type { DB } from '@op-engineering/op-sqlite'
import type { Source, SourceType } from '@iptv-genius/core/src/portable'

interface SourceRow {
  id: number
  type: SourceType
  name: string
  url: string
  username: string | null
  password: string | null
  epg_url: string | null
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
    epgUrl: row.epg_url,
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
  epgUrl?: string | null
}

export function createSourcesRepo(db: DB) {
  return {
    async add(source: NewSource): Promise<Source> {
      const createdAt = Date.now()
      const { insertId } = await db.execute(
        `INSERT INTO sources (type, name, url, username, password, epg_url, created_at, last_refreshed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
        [
          source.type,
          source.name,
          source.url,
          source.username ?? null,
          source.password ?? null,
          source.epgUrl ?? null,
          createdAt
        ]
      )

      return {
        id: insertId as number,
        type: source.type,
        name: source.name,
        url: source.url,
        username: source.username,
        password: source.password,
        epgUrl: source.epgUrl ?? null,
        createdAt,
        lastRefreshedAt: null
      }
    },

    async list(): Promise<Source[]> {
      const { rows } = await db.execute('SELECT * FROM sources ORDER BY created_at ASC')
      return (rows as unknown as SourceRow[]).map(rowToSource)
    },

    async get(id: number): Promise<Source | null> {
      const { rows } = await db.execute('SELECT * FROM sources WHERE id = ?', [id])
      const row = rows[0] as unknown as SourceRow | undefined
      return row ? rowToSource(row) : null
    },

    async remove(id: number): Promise<void> {
      await db.execute('DELETE FROM sources WHERE id = ?', [id])
    },

    async markRefreshed(id: number): Promise<void> {
      await db.execute('UPDATE sources SET last_refreshed_at = ? WHERE id = ?', [Date.now(), id])
    },

    async setEpgUrl(id: number, epgUrl: string | null): Promise<void> {
      await db.execute('UPDATE sources SET epg_url = ? WHERE id = ?', [epgUrl, id])
    }
  }
}

export type SourcesRepo = ReturnType<typeof createSourcesRepo>
