import type { DB, Transaction } from '@op-engineering/op-sqlite'
import type { Channel, EpgEntry, EpgNowNext } from '@iptv-genius/core/src/portable'
import { rowToChannel, type ChannelRow } from './channels'

interface EpgProgrammeRow {
  id: number
  source_id: number
  channel_ref: string
  title: string
  description: string | null
  start_ts: number
  stop_ts: number
}

function rowToEntry(row: EpgProgrammeRow): EpgEntry {
  return {
    title: row.title,
    description: row.description,
    startTs: row.start_ts,
    stopTs: row.stop_ts
  }
}

export interface NewEpgProgramme {
  channelRef: string
  title: string
  description: string | null
  startTs: number
  stopTs: number
}

export interface EpgSearchResult {
  channel: Channel
  programme: EpgEntry
}

type EpgSearchRow = ChannelRow & {
  title: string
  description: string | null
  start_ts: number
  stop_ts: number
}

const INSERT_PROGRAMME_SQL = `INSERT INTO epg_programmes (source_id, channel_ref, title, description, start_ts, stop_ts)
     VALUES (?, ?, ?, ?, ?, ?)`

export function createEpgRepo(db: DB) {
  return {
    /** Replaces the whole guide for a source in one transaction — XMLTV
     * refreshes always re-fetch the full file, there's no incremental sync. */
    async replaceForSource(sourceId: number, programmes: NewEpgProgramme[]): Promise<void> {
      await db.transaction(async (tx: Transaction) => {
        await tx.execute('DELETE FROM epg_programmes WHERE source_id = ?', [sourceId])
        for (const p of programmes) {
          await tx.execute(INSERT_PROGRAMME_SQL, [sourceId, p.channelRef, p.title, p.description, p.startTs, p.stopTs])
        }
        await tx.commit()
      })
    },

    async getNowNext(sourceId: number, channelRef: string, nowTs: number): Promise<EpgNowNext> {
      const nowResult = await db.execute(
        `SELECT * FROM epg_programmes
         WHERE source_id = ? AND channel_ref = ? AND start_ts <= ? AND stop_ts > ?
         ORDER BY start_ts DESC LIMIT 1`,
        [sourceId, channelRef, nowTs, nowTs]
      )
      const nextResult = await db.execute(
        `SELECT * FROM epg_programmes
         WHERE source_id = ? AND channel_ref = ? AND start_ts > ?
         ORDER BY start_ts ASC LIMIT 1`,
        [sourceId, channelRef, nowTs]
      )
      const now = nowResult.rows[0] as unknown as EpgProgrammeRow | undefined
      const next = nextResult.rows[0] as unknown as EpgProgrammeRow | undefined

      return {
        now: now ? rowToEntry(now) : null,
        next: next ? rowToEntry(next) : null
      }
    },

    /** Every upcoming (or currently airing) programme for one channel —
     * used for the "full schedule" view, as opposed to just now/next. */
    async getSchedule(sourceId: number, channelRef: string, fromTs: number, limit = 50): Promise<EpgEntry[]> {
      const { rows } = await db.execute(
        `SELECT * FROM epg_programmes
         WHERE source_id = ? AND channel_ref = ? AND stop_ts >= ?
         ORDER BY start_ts ASC LIMIT ?`,
        [sourceId, channelRef, fromTs, limit]
      )
      return (rows as unknown as EpgProgrammeRow[]).map(rowToEntry)
    },

    /** Searches programme titles across every channel in a source, joining
     * back to `channels` (by tvg_id) so results carry a full, playable
     * Channel rather than just an id the renderer would have to re-fetch. */
    async search(sourceId: number, query: string, fromTs: number, limit = 100): Promise<EpgSearchResult[]> {
      const like = `%${query}%`
      const { rows } = await db.execute(
        `SELECT c.*, e.title, e.description, e.start_ts, e.stop_ts
         FROM epg_programmes e
         JOIN channels c ON c.tvg_id = e.channel_ref AND c.source_id = e.source_id
         WHERE e.source_id = ? AND e.title LIKE ? AND e.stop_ts >= ?
         ORDER BY e.start_ts ASC
         LIMIT ?`,
        [sourceId, like, fromTs, limit]
      )

      return (rows as unknown as EpgSearchRow[]).map((r) => ({
        channel: rowToChannel(r),
        programme: {
          title: r.title,
          description: r.description,
          startTs: r.start_ts,
          stopTs: r.stop_ts
        }
      }))
    },

    /** Whether a source has any guide data stored at all — lets the UI tell
     * "the guide hasn't downloaded yet" apart from "no results for that
     * search term". */
    async hasDataForSource(sourceId: number): Promise<boolean> {
      const { rows } = await db.execute('SELECT 1 FROM epg_programmes WHERE source_id = ? LIMIT 1', [sourceId])
      return rows.length > 0
    }
  }
}

export type EpgRepo = ReturnType<typeof createEpgRepo>
