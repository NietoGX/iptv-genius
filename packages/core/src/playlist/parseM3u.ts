import { parseM3U, type M3uChannel } from '@iptv/playlist'
import type { Channel, ChannelKind } from '../types/domain'

export interface ParsedPlaylist {
  channels: Omit<Channel, 'id' | 'sourceId'>[]
  /** EPG XMLTV URL declared via #EXTM3U url-tvg="..." / x-tvg-url, if present. */
  epgUrl: string | null
}

function classifyKind(url: string): ChannelKind {
  if (/\/movie\//i.test(url)) return 'vod'
  if (/\/series\//i.test(url)) return 'series'
  return 'live'
}

function toChannel(entry: M3uChannel & { url: string }): Omit<Channel, 'id' | 'sourceId'> {
  return {
    kind: classifyKind(entry.url),
    tvgId: entry.tvgId ?? null,
    name: entry.name || entry.tvgName || 'Unknown',
    logoUrl: entry.tvgLogo ?? null,
    groupTitle: entry.groupTitle ?? null,
    streamUrl: entry.url,
    xtreamStreamId: null
  }
}

export function parseM3uPlaylist(m3uContent: string): ParsedPlaylist {
  const playlist = parseM3U(m3uContent)

  // Entries without a stream URL can't be played; drop them rather than
  // carrying nulls through the rest of the pipeline.
  const playableChannels = playlist.channels.filter(
    (c): c is M3uChannel & { url: string } => Boolean(c.url)
  )

  const epgUrl = playlist.headers?.urlTvg ?? playlist.headers?.xTvgUrl ?? null

  return {
    channels: playableChannels.map(toChannel),
    epgUrl
  }
}
