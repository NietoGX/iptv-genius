import type { DB, Transaction } from '@op-engineering/op-sqlite'
import type { Channel, ChannelKind } from '@iptv-genius/core/src/portable'

export interface ChannelRow {
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

export function rowToChannel(row: ChannelRow): Channel {
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

const INSERT_CHANNEL_SQL = `INSERT INTO channels (source_id, kind, tvg_id, name, logo_url, group_title, stream_url, xtream_stream_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

export function createChannelsRepo(db: DB) {
  return {
    /** Replaces every channel belonging to a source in one transaction —
     * used on initial import and on scheduled catalog refreshes. */
    async replaceForSource(sourceId: number, channels: NewChannel[]): Promise<void> {
      await db.transaction(async (tx: Transaction) => {
        await tx.execute('DELETE FROM channels WHERE source_id = ?', [sourceId])
        for (const channel of channels) {
          await tx.execute(INSERT_CHANNEL_SQL, [
            sourceId,
            channel.kind,
            channel.tvgId,
            channel.name,
            channel.logoUrl,
            channel.groupTitle,
            channel.streamUrl,
            channel.xtreamStreamId
          ])
        }
        await tx.commit()
      })
    },

    /** Lightweight folder listing — just group titles and counts, never the
     * underlying channel rows, so opening a source with tens of thousands of
     * channels stays instant. */
    async listCategories(sourceId: number, kind?: ChannelKind): Promise<ChannelCategory[]> {
      const { rows } = kind
        ? await db.execute(
            `SELECT group_title, COUNT(*) as count FROM channels
             WHERE source_id = ? AND kind = ?
             GROUP BY group_title
             ORDER BY group_title IS NULL, group_title ASC`,
            [sourceId, kind]
          )
        : await db.execute(
            `SELECT group_title, COUNT(*) as count FROM channels
             WHERE source_id = ?
             GROUP BY group_title
             ORDER BY group_title IS NULL, group_title ASC`,
            [sourceId]
          )
      return (rows as unknown as { group_title: string | null; count: number }[]).map((r) => ({
        groupTitle: r.group_title,
        count: r.count
      }))
    },

    /** Channels within a single folder — the only place we ever load full
     * channel rows in bulk, so a category with thousands of channels only
     * loads once the user actually opens it. */
    async listByCategory(sourceId: number, groupTitle: string | null, kind?: ChannelKind): Promise<Channel[]> {
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

      const { rows } = await db.execute(sql, params)
      return (rows as unknown as ChannelRow[]).map(rowToChannel)
    },

    async get(id: number): Promise<Channel | null> {
      const { rows } = await db.execute('SELECT * FROM channels WHERE id = ?', [id])
      const row = rows[0] as unknown as ChannelRow | undefined
      return row ? rowToChannel(row) : null
    },

    /** Every distinct tvg_id in use by a source — used to drop EPG programme
     * rows for channels that aren't actually in this source before storing
     * them (a full XMLTV/xmltv.php guide often covers far more channels
     * worldwide than any one playlist actually has). */
    async listTvgIds(sourceId: number): Promise<string[]> {
      const { rows } = await db.execute(
        'SELECT DISTINCT tvg_id FROM channels WHERE source_id = ? AND tvg_id IS NOT NULL',
        [sourceId]
      )
      return (rows as unknown as { tvg_id: string }[]).map((r) => r.tvg_id)
    }
  }
}

export type ChannelsRepo = ReturnType<typeof createChannelsRepo>
