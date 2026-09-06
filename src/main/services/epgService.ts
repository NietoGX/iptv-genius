import path from 'node:path'
import { Worker } from 'node:worker_threads'
import {
  buildXmltvUrl,
  XtreamAccount,
  type AppDatabase,
  type Channel,
  type EpgEntry,
  type EpgNowNext,
  type EpgSearchResult,
  type NewEpgProgramme,
  type Source
} from '@iptv-genius/core'

interface EpgWorkerProgramme {
  channelRef: string
  title: string
  description: string | null
  startTs: number
  stopTs: number
}

type EpgWorkerResponse =
  | { ok: true; sourceId: number; programmes: EpgWorkerProgramme[] }
  | { ok: false; sourceId: number; error: string }

function isGzipBuffer(buffer: Buffer): boolean {
  // Detects the gzip magic number directly rather than trusting
  // Content-Encoding — many EPG links are plain `.xml.gz` files served
  // as opaque bytes, and Node's fetch already auto-decompresses genuine
  // HTTP-level gzip encoding before we ever see the buffer.
  return buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b
}

function parseXmltvInWorker(sourceId: number, buffer: Buffer): Promise<EpgWorkerProgramme[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, 'epgWorker.js'))

    worker.once('message', (response: EpgWorkerResponse) => {
      worker.terminate()
      if (response.ok) resolve(response.programmes)
      else reject(new Error(response.error))
    })
    worker.once('error', (err) => {
      worker.terminate()
      reject(err)
    })

    worker.postMessage({ sourceId, buffer, isGzip: isGzipBuffer(buffer) })
  })
}

/** M3U sources declare their guide via `url-tvg`; Xtream panels always
 * expose the same XMLTV format at a fixed, credential-based endpoint. */
function resolveEpgUrl(source: Source): string | null {
  if (source.type === 'm3u') return source.epgUrl
  if (source.username && source.password) {
    return buildXmltvUrl({
      baseUrl: source.url,
      username: source.username,
      password: source.password
    })
  }
  return null
}

export async function refreshEpgForSource(db: AppDatabase, source: Source): Promise<void> {
  const epgUrl = resolveEpgUrl(source)
  if (!epgUrl) return

  const response = await fetch(epgUrl)
  if (!response.ok) {
    throw new Error(`Failed to download EPG: HTTP ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())

  const programmes = await parseXmltvInWorker(source.id, buffer)

  // A full guide (especially Xtream's xmltv.php) often covers far more
  // channels worldwide than this one source actually has — keep only rows
  // that can ever be matched back to a real channel, so we're not storing
  // (and later scanning) hundreds of thousands of irrelevant rows.
  const relevantRefs = new Set(db.channels.listTvgIds(source.id))
  const rows: NewEpgProgramme[] = programmes
    .filter((p) => relevantRefs.has(p.channelRef))
    .map((p) => ({
      channelRef: p.channelRef,
      title: p.title,
      description: p.description,
      startTs: p.startTs,
      stopTs: p.stopTs
    }))
  db.epg.replaceForSource(source.id, rows)
}

const xtreamAccountCache = new Map<number, XtreamAccount>()

function getXtreamAccount(source: Source): XtreamAccount {
  let account = xtreamAccountCache.get(source.id)
  if (!account) {
    account = new XtreamAccount({
      baseUrl: source.url,
      username: source.username ?? '',
      password: source.password ?? ''
    })
    xtreamAccountCache.set(source.id, account)
  }
  return account
}

/** Live fallback for channels the stored guide doesn't cover — either the
 * panel's xmltv.php omits them, or they have no epg_channel_id at all, so
 * there's nothing in `epg_programmes` to match against by tvg_id. */
async function fetchLiveXtreamSchedule(source: Source, streamId: string): Promise<EpgEntry[]> {
  const account = getXtreamAccount(source)
  const listings = await account.getShortEpg(streamId, 10)
  return listings.map((entry) => ({
    title: entry.title,
    description: entry.description,
    startTs: entry.start.getTime() / 1000,
    stopTs: entry.stop.getTime() / 1000
  }))
}

export async function getNowNext(
  db: AppDatabase,
  channel: Channel,
  source: Source
): Promise<EpgNowNext> {
  const nowTs = Math.floor(Date.now() / 1000)

  if (channel.tvgId) {
    const local = db.epg.getNowNext(source.id, channel.tvgId, nowTs)
    if (local.now || local.next) return local
  }

  if (source.type === 'xtream' && channel.xtreamStreamId) {
    const schedule = await fetchLiveXtreamSchedule(source, channel.xtreamStreamId)
    let now: EpgEntry | null = null
    let next: EpgEntry | null = null
    for (const entry of schedule) {
      if (entry.startTs <= nowTs && entry.stopTs > nowTs) now = entry
      else if (entry.startTs > nowTs && !next) next = entry
    }
    return { now, next }
  }

  return { now: null, next: null }
}

export async function getSchedule(
  db: AppDatabase,
  channel: Channel,
  source: Source
): Promise<EpgEntry[]> {
  const nowTs = Math.floor(Date.now() / 1000)

  if (channel.tvgId) {
    const local = db.epg.getSchedule(source.id, channel.tvgId, nowTs)
    if (local.length > 0) return local
  }

  if (source.type === 'xtream' && channel.xtreamStreamId) {
    const schedule = await fetchLiveXtreamSchedule(source, channel.xtreamStreamId)
    return schedule.filter((entry) => entry.stopTs >= nowTs)
  }

  return []
}

export function searchEpg(db: AppDatabase, sourceId: number, query: string): EpgSearchResult[] {
  const nowTs = Math.floor(Date.now() / 1000)
  return db.epg.search(sourceId, query, nowTs)
}

export function hasGuideData(db: AppDatabase, sourceId: number): boolean {
  return db.epg.hasDataForSource(sourceId)
}
