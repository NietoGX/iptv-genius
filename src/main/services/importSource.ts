import fs from 'node:fs/promises'
import {
  detectXtreamSource,
  parseM3uPlaylist,
  parseXtreamPlaylistUrl,
  XtreamAccount,
  type AppDatabase,
  type NewChannel,
  type Source
} from '@iptv-genius/core'
import type { AddM3uInput, AddM3uResult, AddXtreamInput } from '@iptv-genius/ipc-contract'

async function fetchM3uContent(url: string): Promise<string> {
  if (/^https?:\/\//i.test(url)) {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to download playlist: HTTP ${response.status}`)
    return response.text()
  }
  return fs.readFile(url, 'utf-8')
}

export async function importM3uSource(
  db: AppDatabase,
  input: AddM3uInput
): Promise<AddM3uResult> {
  const xtreamFromUrl = parseXtreamPlaylistUrl(input.url)
  if (xtreamFromUrl) {
    // This is a "get.php" Xtream playlist link, not a static M3U file — some
    // panels don't even serve get.php (player_api.php always works), so
    // skip the download attempt entirely and hand off to the Xtream flow.
    return { source: null, channelCount: 0, xtreamSuggestion: xtreamFromUrl }
  }

  const content = await fetchM3uContent(input.url)
  const parsed = parseM3uPlaylist(content)

  const source = db.sources.add({ type: 'm3u', name: input.name, url: input.url })
  const channels: NewChannel[] = parsed.channels.map((c) => ({ ...c, sourceId: source.id }))
  db.channels.replaceForSource(source.id, channels)
  db.sources.markRefreshed(source.id)

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

export async function importXtreamSource(
  db: AppDatabase,
  input: AddXtreamInput
): Promise<Source> {
  const credentials = {
    baseUrl: input.baseUrl,
    username: input.username,
    password: input.password
  }
  const account = new XtreamAccount(credentials)

  const ok = await account.verify()
  if (!ok) {
    throw new Error('No se pudo verificar la cuenta Xtream. Revisa la URL, usuario y contraseña.')
  }

  const source = db.sources.add({
    type: 'xtream',
    name: input.name,
    url: input.baseUrl,
    username: input.username,
    password: input.password
  })

  const channels = await pullXtreamLiveChannels(source, account)
  db.channels.replaceForSource(source.id, channels)
  db.sources.markRefreshed(source.id)

  return source
}

export async function refreshSource(db: AppDatabase, sourceId: number): Promise<void> {
  const source = db.sources.get(sourceId)
  if (!source) throw new Error('Source not found')

  if (source.type === 'm3u') {
    const content = await fetchM3uContent(source.url)
    const parsed = parseM3uPlaylist(content)
    const channels: NewChannel[] = parsed.channels.map((c) => ({ ...c, sourceId: source.id }))
    db.channels.replaceForSource(source.id, channels)
  } else {
    const account = new XtreamAccount({
      baseUrl: source.url,
      username: source.username ?? '',
      password: source.password ?? ''
    })
    const channels = await pullXtreamLiveChannels(source, account)
    db.channels.replaceForSource(source.id, channels)
  }

  db.sources.markRefreshed(source.id)
}
