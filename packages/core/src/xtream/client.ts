import { Xtream } from '@iptv/xtream-api'
import type { XtreamCredentials } from '../types/domain'
import { buildStreamUrl } from './urls'
import type {
  XtreamCategory as CoreXtreamCategory,
  XtreamEpisode as CoreXtreamEpisode,
  XtreamLiveChannel,
  XtreamMovie,
  XtreamShortEpgEntry,
  XtreamShow,
  XtreamShowDetail
} from './types'

/** Retries a flaky Xtream panel call with exponential backoff. Some panels
 * intermittently return empty/malformed bodies under load. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt))
      }
    }
  }
  throw lastError
}

function asString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  return String(value)
}

/** Xtream panels are inconsistent about "no data" shapes (empty array vs
 * empty object) even though the client library's types promise an array. */
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/** Many Xtream panels base64-encode EPG title/description fields (so
 * special characters survive their JSON encoding); others send plain text.
 * Short plain-text titles (e.g. "News", "Kids", "Deportes") can coincidentally
 * match the base64 charset/length, so a naive decode-and-check-printable
 * heuristic corrupts them — decoding "Kids" as base64 "succeeds" and produces
 * three garbage-but-printable bytes. Guard against that two ways: require a
 * minimum length (real encoded titles are always longer than that), and
 * require the decoded text to round-trip back to the exact original string —
 * random bytes essentially never do, but genuine base64 always does. */
function decodeMaybeBase64(value: string): string {
  if (value.length < 8 || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    return value
  }
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf-8')
    if (decoded.length > 0 && Buffer.from(decoded, 'utf-8').toString('base64') === value) {
      return decoded
    }
  } catch {
    // Matched the charset but wasn't valid base64 — keep the original.
  }
  return value
}

/** Thin, typed wrapper around @iptv/xtream-api exposing our own domain
 * vocabulary, so the rest of the app never imports the upstream library
 * directly (keeps the door open to swapping it later). */
export class XtreamAccount {
  private readonly client: Xtream
  readonly credentials: XtreamCredentials

  constructor(credentials: XtreamCredentials) {
    this.credentials = credentials
    this.client = new Xtream({
      url: credentials.baseUrl,
      username: credentials.username,
      password: credentials.password
    })
  }

  async verify(): Promise<boolean> {
    try {
      const profile = await withRetry(() => this.client.getProfile())
      return Number(profile?.auth) === 1
    } catch {
      return false
    }
  }

  async listLiveCategories(): Promise<CoreXtreamCategory[]> {
    const categories = asArray<{ category_id: string; category_name: string }>(
      await withRetry(() => this.client.getChannelCategories())
    )
    return categories.map((c) => ({ categoryId: String(c.category_id), categoryName: c.category_name }))
  }

  async listLiveChannels(categoryId?: string): Promise<XtreamLiveChannel[]> {
    const channels = asArray<{
      stream_id: number
      name: string
      category_id: string
      stream_icon: string
      epg_channel_id: string
      url?: string
    }>(await withRetry(() => this.client.getChannels(categoryId ? { categoryId } : undefined)))

    return channels.map((c) => ({
      streamId: String(c.stream_id),
      name: c.name,
      categoryId: asString(c.category_id),
      logoUrl: asString(c.stream_icon),
      epgChannelId: asString(c.epg_channel_id)
    }))
  }

  async listMovieCategories(): Promise<CoreXtreamCategory[]> {
    const categories = asArray<{ category_id: string; category_name: string }>(
      await withRetry(() => this.client.getMovieCategories())
    )
    return categories.map((c) => ({ categoryId: String(c.category_id), categoryName: c.category_name }))
  }

  async listMovies(categoryId?: string): Promise<XtreamMovie[]> {
    const movies = asArray<{
      stream_id: number
      name: string
      category_id: string
      stream_icon: string
      container_extension: string
    }>(await withRetry(() => this.client.getMovies(categoryId ? { categoryId } : undefined)))

    return movies.map((m) => ({
      streamId: String(m.stream_id),
      name: m.name,
      categoryId: asString(m.category_id),
      posterUrl: asString(m.stream_icon),
      extension: m.container_extension || 'mp4'
    }))
  }

  async listSeriesCategories(): Promise<CoreXtreamCategory[]> {
    const categories = asArray<{ category_id: string; category_name: string }>(
      await withRetry(() => this.client.getShowCategories())
    )
    return categories.map((c) => ({ categoryId: String(c.category_id), categoryName: c.category_name }))
  }

  async listSeries(categoryId?: string): Promise<XtreamShow[]> {
    const shows = asArray<{
      series_id: number
      name: string
      category_id: string
      cover: string
      plot: string | null
    }>(await withRetry(() => this.client.getShows(categoryId ? { categoryId } : undefined)))

    return shows.map((s) => ({
      seriesId: String(s.series_id),
      name: s.name,
      categoryId: asString(s.category_id),
      posterUrl: asString(s.cover),
      plot: asString(s.plot)
    }))
  }

  async getSeriesDetail(seriesId: string): Promise<XtreamShowDetail> {
    const show = await withRetry(() => this.client.getShow({ showId: seriesId }))
    const episodesBySeason: Record<number, CoreXtreamEpisode[]> = {}

    for (const [seasonKey, episodes] of Object.entries(show.episodes ?? {})) {
      const season = Number(seasonKey)
      episodesBySeason[season] = asArray<{
        id: string
        episode_num: string
        title: string
        container_extension: string
      }>(episodes).map((e) => ({
        episodeId: String(e.id),
        season,
        episode: Number(e.episode_num),
        title: e.title,
        extension: e.container_extension || 'mp4'
      }))
    }

    return {
      seriesId: String(show.info?.series_id ?? seriesId),
      name: show.info?.name ?? '',
      categoryId: asString(show.info?.category_id),
      posterUrl: asString(show.info?.cover),
      plot: asString(show.info?.plot),
      episodesBySeason
    }
  }

  async getShortEpg(streamId: string, limit = 4): Promise<XtreamShortEpgEntry[]> {
    const response = await withRetry(() => this.client.getShortEPG({ channelId: streamId, limit }))
    const listings = asArray<{ title: string; description: string | null; start: string; end: string }>(
      (response as { epg_listings?: unknown })?.epg_listings
    )
    return listings.map((entry) => {
      const description = asString(entry.description)
      return {
        title: decodeMaybeBase64(entry.title),
        description: description ? decodeMaybeBase64(description) : null,
        start: new Date(entry.start),
        stop: new Date(entry.end)
      }
    })
  }

  liveStreamUrl(streamId: string, extension = 'ts'): string {
    return buildStreamUrl(this.credentials, 'live', streamId, extension)
  }

  movieStreamUrl(streamId: string, extension = 'mp4'): string {
    return buildStreamUrl(this.credentials, 'movie', streamId, extension)
  }

  episodeStreamUrl(episodeId: string, extension = 'mp4'): string {
    return buildStreamUrl(this.credentials, 'series', episodeId, extension)
  }
}
