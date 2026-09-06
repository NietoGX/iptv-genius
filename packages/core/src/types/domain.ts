export type SourceType = 'm3u' | 'xtream'

export interface Source {
  id: number
  type: SourceType
  name: string
  /** For m3u: the playlist URL or local file path. For xtream: the panel base URL. */
  url: string
  username?: string
  password?: string
  /** XMLTV guide URL declared by the M3U's `url-tvg`/`x-tvg-url` header, if any. */
  epgUrl: string | null
  createdAt: number
  lastRefreshedAt: number | null
}

export type ChannelKind = 'live' | 'vod' | 'series'

export interface Channel {
  id: number
  sourceId: number
  kind: ChannelKind
  tvgId: string | null
  name: string
  logoUrl: string | null
  groupTitle: string | null
  streamUrl: string
  xtreamStreamId: string | null
}

export interface SeriesEpisode {
  id: number
  seriesChannelId: number
  season: number
  episode: number
  title: string
  streamUrl: string
}

export interface EpgProgramme {
  id: number
  sourceId: number
  channelRef: string
  title: string
  description: string | null
  startTs: number
  stopTs: number
}

/** Source-agnostic programme shape used at the IPC/UI boundary — covers
 * both DB-backed XMLTV data and ephemeral Xtream short-EPG entries. */
export interface EpgEntry {
  title: string
  description: string | null
  startTs: number
  stopTs: number
}

export interface EpgNowNext {
  now: EpgEntry | null
  next: EpgEntry | null
}

export interface Favorite {
  channelId: number
  position: number
  createdAt: number
}

export interface WatchHistoryEntry {
  channelId: number
  lastPositionSeconds: number
  lastWatchedAt: number
}

export interface XtreamCredentials {
  baseUrl: string
  username: string
  password: string
}

/** Result of scanning an M3U playlist for embedded Xtream-style URLs. */
export interface XtreamDetectionResult {
  detected: boolean
  credentials: XtreamCredentials | null
  matchRatio: number
}
