import type { Database } from 'better-sqlite3'
import type { Channel, EpgEntry, EpgNowNext } from '../../types/domain'
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

export function createEpgRepo(db: Database) {
  const insertStmt = db.prepare(
    `INSERT INTO epg_programmes (source_id, channel_ref, title, description, start_ts, stop_ts)
     VALUES (@sourceId, @channelRef, @title, @description, @startTs, @stopTs)`
  )

  return {
    /** Replaces the whole guide for a source in one transaction — XMLTV
     * refreshes always re-fetch the full file, there's no incremental sync. */
    replaceForSource(sourceId: number, programmes: NewEpgProgramme[]): void {
      const tx = db.transaction((rows: NewEpgProgramme[]) => {
        db.prepare('DELETE FROM epg_programmes WHERE source_id = ?').run(sourceId)
        for (const p of rows) {
          insertStmt.run({
            sourceId,
            channelRef: p.channelRef,
            title: p.title,
            description: p.description,
            startTs: p.startTs,
            stopTs: p.stopTs
          })
        }
      })
      tx(programmes)
    },

    getNowNext(sourceId: number, channelRef: string, nowTs: number): EpgNowNext {
      const now = db
        .prepare(
          `SELECT * FROM epg_programmes
           WHERE source_id = ? AND channel_ref = ? AND start_ts <= ? AND stop_ts > ?
           ORDER BY start_ts DESC LIMIT 1`
        )
        .get(sourceId, channelRef, nowTs, nowTs) as EpgProgrammeRow | undefined

      const next = db
        .prepare(
          `SELECT * FROM epg_programmes
           WHERE source_id = ? AND channel_ref = ? AND start_ts > ?
           ORDER BY start_ts ASC LIMIT 1`
        )
        .get(sourceId, channelRef, nowTs) as EpgProgrammeRow | undefined

      return {
        now: now ? rowToEntry(now) : null,
        next: next ? rowToEntry(next) : null
      }
    },

    /** Every upcoming (or currently airing) programme for one channel —
     * used for the "full schedule" view, as opposed to just now/next. */
    getSchedule(sourceId: number, channelRef: string, fromTs: number, limit = 50): EpgEntry[] {
      const rows = db
        .prepare(
          `SELECT * FROM epg_programmes
           WHERE source_id = ? AND channel_ref = ? AND stop_ts >= ?
           ORDER BY start_ts ASC LIMIT ?`
        )
        .all(sourceId, channelRef, fromTs, limit) as EpgProgrammeRow[]
      return rows.map(rowToEntry)
    },

    /** Searches programme titles across every channel in a source, joining
     * back to `channels` (by tvg_id) so results carry a full, playable
     * Channel rather than just an id the renderer would have to re-fetch. */
    search(sourceId: number, query: string, fromTs: number, limit = 100): EpgSearchResult[] {
      const like = `%${query}%`
      const rows = db
        .prepare(
          `SELECT c.*, e.title, e.description, e.start_ts, e.stop_ts
           FROM epg_programmes e
           JOIN channels c ON c.tvg_id = e.channel_ref AND c.source_id = e.source_id
           WHERE e.source_id = ? AND e.title LIKE ? AND e.stop_ts >= ?
           ORDER BY e.start_ts ASC
           LIMIT ?`
        )
        .all(sourceId, like, fromTs, limit) as EpgSearchRow[]

      return rows.map((r) => ({
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
    hasDataForSource(sourceId: number): boolean {
      const row = db.prepare('SELECT 1 FROM epg_programmes WHERE source_id = ? LIMIT 1').get(sourceId)
      return row !== undefined
    }
  }
}

export type EpgRepo = ReturnType<typeof createEpgRepo>
