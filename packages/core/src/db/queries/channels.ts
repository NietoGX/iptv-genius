import type { Database } from 'better-sqlite3'
import type { Channel, ChannelKind } from '../../types/domain'

interface ChannelRow {
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

function rowToChannel(row: ChannelRow): Channel {
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

export type NewChannel = Omit<Channel, 'id'>

export interface ChannelCategory {
  groupTitle: string | null
  count: number
}

export function createChannelsRepo(db: Database) {
  const insertStmt = db.prepare(
    `INSERT INTO channels (source_id, kind, tvg_id, name, logo_url, group_title, stream_url, xtream_stream_id)
     VALUES (@sourceId, @kind, @tvgId, @name, @logoUrl, @groupTitle, @streamUrl, @xtreamStreamId)`
  )

  return {
    /** Replaces every channel belonging to a source in one transaction —
     * used on initial import and on scheduled catalog refreshes. */
    replaceForSource(sourceId: number, channels: NewChannel[]): void {
      const tx = db.transaction((rows: NewChannel[]) => {
        db.prepare('DELETE FROM channels WHERE source_id = ?').run(sourceId)
        for (const channel of rows) {
          insertStmt.run({
            sourceId,
            kind: channel.kind,
            tvgId: channel.tvgId,
            name: channel.name,
            logoUrl: channel.logoUrl,
            groupTitle: channel.groupTitle,
            streamUrl: channel.streamUrl,
            xtreamStreamId: channel.xtreamStreamId
          })
        }
      })
      tx(channels)
    },

    /** Lightweight folder listing — just group titles and counts, never the
     * underlying channel rows, so opening a source with tens of thousands of
     * channels stays instant. */
    listCategories(sourceId: number, kind?: ChannelKind): ChannelCategory[] {
      const rows = kind
        ? (db
            .prepare(
              `SELECT group_title, COUNT(*) as count FROM channels
               WHERE source_id = ? AND kind = ?
               GROUP BY group_title
               ORDER BY group_title IS NULL, group_title ASC`
            )
            .all(sourceId, kind) as { group_title: string | null; count: number }[])
        : (db
            .prepare(
              `SELECT group_title, COUNT(*) as count FROM channels
               WHERE source_id = ?
               GROUP BY group_title
               ORDER BY group_title IS NULL, group_title ASC`
            )
            .all(sourceId) as { group_title: string | null; count: number }[])
      return rows.map((r) => ({ groupTitle: r.group_title, count: r.count }))
    },

    /** Channels within a single folder — the only place we ever load full
     * channel rows in bulk, so a category with thousands of channels only
     * loads once the user actually opens it. */
    listByCategory(sourceId: number, groupTitle: string | null, kind?: ChannelKind): Channel[] {
      const params: (string | number)[] = [sourceId]
      let sql = 'SELECT * FROM channels WHERE source_id = ?'

      if (groupTitle === null) {
        sql += ' AND group_title IS NULL'
      } else {
        sql += ' AND group_title = ?'
        params.push(groupTitle)
      }
      if (kind) {
        sql += ' AND kind = ?'
        params.push(kind)
      }
      sql += ' ORDER BY name ASC'

      const rows = db.prepare(sql).all(...params) as ChannelRow[]
      return rows.map(rowToChannel)
    },

    get(id: number): Channel | null {
      const row = db.prepare('SELECT * FROM channels WHERE id = ?').get(id) as
        | ChannelRow
        | undefined
      return row ? rowToChannel(row) : null
    }
  }
}

export type ChannelsRepo = ReturnType<typeof createChannelsRepo>
