import type { DB } from '@op-engineering/op-sqlite'
import type { Channel, ChannelKind } from '@iptv-genius/core/src/portable'

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

export function createFavoritesRepo(db: DB) {
  return {
    async add(channelId: number): Promise<void> {
      const { rows } = await db.execute('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM favorites')
      const next = (rows[0] as unknown as { next: number }).next
      await db.execute('INSERT OR IGNORE INTO favorites (channel_id, position, created_at) VALUES (?, ?, ?)', [
        channelId,
        next,
        Date.now()
      ])
    },

    async remove(channelId: number): Promise<void> {
      await db.execute('DELETE FROM favorites WHERE channel_id = ?', [channelId])
    },

    async isFavorite(channelId: number): Promise<boolean> {
      const { rows } = await db.execute('SELECT 1 FROM favorites WHERE channel_id = ?', [channelId])
      return rows.length > 0
    },

    async list(): Promise<Channel[]> {
      const { rows } = await db.execute(
        `SELECT c.* FROM favorites f
         JOIN channels c ON c.id = f.channel_id
         ORDER BY f.position ASC`
      )
      return (rows as unknown as FavoriteChannelRow[]).map(rowToChannel)
    }
  }
}

export type FavoritesRepo = ReturnType<typeof createFavoritesRepo>
