import { parseXmltv } from '@iptv/xmltv'
import { ungzip } from 'pako'
import { buildXmltvUrl, XtreamAccount } from '@iptv-genius/core/src/portable'
import type { Channel, EpgEntry, EpgNowNext, Source } from '@iptv-genius/core/src/portable'
import type { AppDatabase, EpgSearchResult, NewEpgProgramme } from '../db'

function isGzipBuffer(bytes: Uint8Array): boolean {
  // Detects the gzip magic number directly rather than trusting Content-Encoding —
  // many EPG links are plain `.xml.gz` files served as opaque bytes.
  return bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b
}

interface ParsedProgramme {
  channelRef: string
  title: string
  description: string | null
  startTs: number
  stopTs: number
}

function parseXmltvBuffer(bytes: Uint8Array): ParsedProgramme[] {
  // Hermes has no global TextDecoder, and pako's `toText` option uses one
  // internally — decode manually via the Buffer polyfill (already loaded in
  // index.js for the xtream client's base64 decoding) for both branches.
  const rawXml = isGzipBuffer(bytes) ? ungzip(bytes) : bytes
  const xml = Buffer.from(rawXml).toString('utf-8')
  const parsed = parseXmltv(xml)

  return (parsed.programmes ?? [])
    .filter((p) => p.stop)
    .map((p) => ({
      channelRef: p.channel,
      title: p.title?.[0]?._value ?? '',
      description: p.desc?.[0]?._value ?? null,
      startTs: Math.floor(p.start.getTime() / 1000),
      stopTs: Math.floor((p.stop as Date).getTime() / 1000)
    }))
}

/** M3U sources declare their guide via `url-tvg`; Xtream panels always expose
 * the same XMLTV format at a fixed, credential-based endpoint. */
function resolveEpgUrl(source: Source): string | null {
  if (source.type === 'm3u') return source.epgUrl
  if (source.username && source.password) {
    return buildXmltvUrl({ baseUrl: source.url, username: source.username, password: source.password })
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
  const bytes = new Uint8Array(await response.arrayBuffer())
  const programmes = parseXmltvBuffer(bytes)

  // A full guide (especially Xtream's xmltv.php) often covers far more channels
  // worldwide than this one source actually has — keep only rows that can ever
  // be matched back to a real channel.
  const relevantRefs = new Set(await db.channels.listTvgIds(source.id))
  const rows: NewEpgProgramme[] = programmes
    .filter((p) => relevantRefs.has(p.channelRef))
    .map((p) => ({
      channelRef: p.channelRef,
      title: p.title,
      description: p.description,
      startTs: p.startTs,
      stopTs: p.stopTs
    }))
  await db.epg.replaceForSource(source.id, rows)
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

/** Live fallback for channels the stored guide doesn't cover. */
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

async function getNowNextFor(db: AppDatabase, channel: Channel, source: Source): Promise<EpgNowNext> {
  const nowTs = Math.floor(Date.now() / 1000)

  if (channel.tvgId) {
    const local = await db.epg.getNowNext(source.id, channel.tvgId, nowTs)
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

async function getScheduleFor(db: AppDatabase, channel: Channel, source: Source): Promise<EpgEntry[]> {
  const nowTs = Math.floor(Date.now() / 1000)

  if (channel.tvgId) {
    const local = await db.epg.getSchedule(source.id, channel.tvgId, nowTs)
    if (local.length > 0) return local
  }

  if (source.type === 'xtream' && channel.xtreamStreamId) {
    const schedule = await fetchLiveXtreamSchedule(source, channel.xtreamStreamId)
    return schedule.filter((entry) => entry.stopTs >= nowTs)
  }

  return []
}

export async function getNowNext(db: AppDatabase, channelId: number): Promise<EpgNowNext> {
  const channel = await db.channels.get(channelId)
  if (!channel) return { now: null, next: null }
  const source = await db.sources.get(channel.sourceId)
  if (!source) return { now: null, next: null }
  return getNowNextFor(db, channel, source)
}

export async function getSchedule(db: AppDatabase, channelId: number): Promise<EpgEntry[]> {
  const channel = await db.channels.get(channelId)
  if (!channel) return []
  const source = await db.sources.get(channel.sourceId)
  if (!source) return []
  return getScheduleFor(db, channel, source)
}

export async function searchEpg(db: AppDatabase, sourceId: number, query: string): Promise<EpgSearchResult[]> {
  const nowTs = Math.floor(Date.now() / 1000)
  return db.epg.search(sourceId, query, nowTs)
}

export async function hasGuideData(db: AppDatabase, sourceId: number): Promise<boolean> {
  return db.epg.hasDataForSource(sourceId)
}
