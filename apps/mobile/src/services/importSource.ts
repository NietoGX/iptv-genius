import {
  detectXtreamSource,
  parseM3uPlaylist,
  parseXtreamPlaylistUrl,
  XtreamAccount
} from '@iptv-genius/core/src/portable'
import type { Source } from '@iptv-genius/core/src/portable'
import type { AppDatabase, NewChannel } from '../db'
import { refreshEpgForSource } from './epgService'

export interface AddM3uInput {
  name: string
  url: string
}

export interface AddXtreamInput {
  name: string
  baseUrl: string
  username: string
  password: string
}

export interface AddM3uResult {
  source: Source | null
  channelCount: number
  xtreamSuggestion: { baseUrl: string; username: string; password: string } | null
}

/** EPG refresh is intentionally not awaited by callers — it can take a few
 * seconds (download + parse) and the UI shouldn't block on it. Failures are
 * only logged, since a missing guide shouldn't fail the whole "add source" flow. */
function refreshEpgInBackground(db: AppDatabase, source: Source): void {
  refreshEpgForSource(db, source).catch((error: unknown) => {
    console.error(`EPG refresh failed for source ${source.id}:`, error)
  })
}

async function fetchM3uContent(url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Solo se admiten URLs http(s) de listas M3U en la app móvil.')
  }
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to download playlist: HTTP ${response.status}`)
  return response.text()
}

export async function importM3uSource(db: AppDatabase, input: AddM3uInput): Promise<AddM3uResult> {
  const xtreamFromUrl = parseXtreamPlaylistUrl(input.url)
  if (xtreamFromUrl) {
    return { source: null, channelCount: 0, xtreamSuggestion: xtreamFromUrl }
  }

  const content = await fetchM3uContent(input.url)
  const parsed = parseM3uPlaylist(content)

  const source = await db.sources.add({
    type: 'm3u',
    name: input.name,
    url: input.url,
    epgUrl: parsed.epgUrl
  })
  const channels: NewChannel[] = parsed.channels.map((c) => ({ ...c, sourceId: source.id }))
  await db.channels.replaceForSource(source.id, channels)
  await db.sources.markRefreshed(source.id)
  refreshEpgInBackground(db, source)

  const detection = detectXtreamSource(parsed.channels.map((c) => c.streamUrl))

  return {
    source,
    channelCount: channels.length,
    xtreamSuggestion: detection.detected ? detection.credentials : null
  }
}

async function pullXtreamLiveChannels(source: Source, account: XtreamAccount): Promise<NewChannel[]> {
  const categories = await account.listLiveCategories()
  const categoryNames = new Map(categories.map((c) => [c.categoryId, c.categoryName]))
  const liveChannels = await account.listLiveChannels()

  return liveChannels.map((c) => ({
    sourceId: source.id,
    kind: 'live',
    tvgId: c.epgChannelId,
    name: c.name,
    logoUrl: c.logoUrl,
    groupTitle: c.categoryId ? (categoryNames.get(c.categoryId) ?? null) : null,
    streamUrl: account.liveStreamUrl(c.streamId),
    xtreamStreamId: c.streamId
  }))
}

export async function importXtreamSource(db: AppDatabase, input: AddXtreamInput): Promise<Source> {
  const account = new XtreamAccount({
    baseUrl: input.baseUrl,
    username: input.username,
    password: input.password
  })

  const ok = await account.verify()
  if (!ok) {
    throw new Error('No se pudo verificar la cuenta Xtream. Revisa la URL, usuario y contraseña.')
  }

  const source = await db.sources.add({
    type: 'xtream',
    name: input.name,
    url: input.baseUrl,
    username: input.username,
    password: input.password
  })

  const channels = await pullXtreamLiveChannels(source, account)
  await db.channels.replaceForSource(source.id, channels)
  await db.sources.markRefreshed(source.id)
  refreshEpgInBackground(db, source)

  return source
}

export async function refreshSource(db: AppDatabase, sourceId: number): Promise<void> {
  const source = await db.sources.get(sourceId)
  if (!source) throw new Error('Source not found')

  if (source.type === 'm3u') {
    const content = await fetchM3uContent(source.url)
    const parsed = parseM3uPlaylist(content)
    const channels: NewChannel[] = parsed.channels.map((c) => ({ ...c, sourceId: source.id }))
    await db.channels.replaceForSource(source.id, channels)
    await db.sources.setEpgUrl(source.id, parsed.epgUrl)
    refreshEpgInBackground(db, { ...source, epgUrl: parsed.epgUrl })
  } else {
    const account = new XtreamAccount({
      baseUrl: source.url,
      username: source.username ?? '',
      password: source.password ?? ''
    })
    const channels = await pullXtreamLiveChannels(source, account)
    await db.channels.replaceForSource(source.id, channels)
    refreshEpgInBackground(db, source)
  }

  await db.sources.markRefreshed(source.id)
}
