import type { XtreamCredentials } from '../types/domain'

export type XtreamStreamKind = 'live' | 'movie' | 'series'

/** Matches the standard Xtream Codes stream URL shape:
 * http(s)://host(:port)/(live|movie|series)/username/password/streamId(.ext) */
export const XTREAM_URL_PATTERN =
  /^https?:\/\/([^/]+)\/(live|movie|series)\/([^/]+)\/([^/]+)\/(\d+)(\.\w+)?(?:\?.*)?$/i

export function isXtreamStreamUrl(url: string): boolean {
  return XTREAM_URL_PATTERN.test(url.trim())
}

/** Detects the other common Xtream link shape: a `get.php` "playlist
 * generator" URL (e.g. `http://host/get.php?username=U&password=P&type=m3u`).
 * Resellers hand these out as "your M3U URL", but they're really an Xtream
 * account — and some panels don't even serve get.php, while player_api.php
 * always does — so it's worth detecting before attempting a plain download. */
export function parseXtreamPlaylistUrl(url: string): XtreamCredentials | null {
  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return null
  }

  if (!/\/get\.php$/i.test(parsed.pathname)) return null

  const username = parsed.searchParams.get('username')
  const password = parsed.searchParams.get('password')
  if (!username || !password) return null

  return { baseUrl: `${parsed.protocol}//${parsed.host}`, username, password }
}

export function buildStreamUrl(
  credentials: XtreamCredentials,
  kind: XtreamStreamKind,
  streamId: string,
  extension = kind === 'live' ? 'ts' : 'mp4'
): string {
  const base = credentials.baseUrl.replace(/\/+$/, '')
  return `${base}/${kind}/${credentials.username}/${credentials.password}/${streamId}.${extension}`
}

export function buildPlayerApiUrl(credentials: XtreamCredentials): string {
  const base = credentials.baseUrl.replace(/\/+$/, '')
  return `${base}/player_api.php?username=${encodeURIComponent(
    credentials.username
  )}&password=${encodeURIComponent(credentials.password)}`
}

export function buildXmltvUrl(credentials: XtreamCredentials): string {
  const base = credentials.baseUrl.replace(/\/+$/, '')
  return `${base}/xmltv.php?username=${encodeURIComponent(
    credentials.username
  )}&password=${encodeURIComponent(credentials.password)}`
}
