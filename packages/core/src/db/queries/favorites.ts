import type { Database } from 'better-sqlite3'
import type { Channel, ChannelKind } from '../../types/domain'

interface FavoriteChannelRow {
  id: number
  source_id: number
  kind: ChannelKind
  tvg_id: string | null
  name: string
  logo_url: string | null
  group_title: string | null
  stream_url: string
  xtream_stream_id: string | null
}

function rowToChannel(row: FavoriteChannelRow): Channel {
  return {
    id: row.id,
    sourceId: row.source_id,
    kind: row.kind,
    tvgId: row.tvg_id,
    name: row.name,
    logoUrl: row.logo_url,
    groupTitle: row.group_title,
    streamUrl: row.stream_url,
    xtreamStreamId: row.xtream_stream_id
  }
}

export function createFavoritesRepo(db: Database) {
  return {
    add(channelId: number): void {
      const position = db
        .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM favorites')
        .get() as { next: number }
      db.prepare(
        'INSERT OR IGNORE INTO favorites (channel_id, position, created_at) VALUES (?, ?, ?)'
      ).run(channelId, position.next, Date.now())
    },

    remove(channelId: number): void {
      db.prepare('DELETE FROM favorites WHERE channel_id = ?').run(channelId)
    },

    isFavorite(channelId: number): boolean {
      const row = db.prepare('SELECT 1 FROM favorites WHERE channel_id = ?').get(channelId)
      return row !== undefined
    },

    list(): Channel[] {
      const rows = db
        .prepare(
          `SELECT c.* FROM favorites f
           JOIN channels c ON c.id = f.channel_id
           ORDER BY f.position ASC`
        )
        .all() as FavoriteChannelRow[]
      return rows.map(rowToChannel)
    }
  }
}

export type FavoritesRepo = ReturnType<typeof createFavoritesRepo>
