import type { XtreamCredentials, XtreamDetectionResult } from '../types/domain'
import { XTREAM_URL_PATTERN } from '../xtream/urls'

function tryExtract(url: string): XtreamCredentials | null {
  const match = XTREAM_URL_PATTERN.exec(url.trim())
  if (!match) return null
  const [, host, , username, password] = match
  return { baseUrl: `http://${host}`, username, password }
}

/** Scans a set of playlist stream URLs for the Xtream Codes URL pattern.
 * If a strong majority match the same host/credentials, this is really an
 * Xtream account exported as a flat M3U, and re-importing it as a native
 * Xtream source unlocks VOD/series/EPG the flat playlist can't provide. */
export function detectXtreamSource(streamUrls: string[]): XtreamDetectionResult {
  if (streamUrls.length === 0) {
    return { detected: false, credentials: null, matchRatio: 0 }
  }

  const counts = new Map<string, { credentials: XtreamCredentials; count: number }>()

  for (const url of streamUrls) {
    const credentials = tryExtract(url)
    if (!credentials) continue
    const key = `${credentials.baseUrl}|${credentials.username}|${credentials.password}`
    const existing = counts.get(key)
    if (existing) existing.count += 1
    else counts.set(key, { credentials, count: 1 })
  }

  let best: { credentials: XtreamCredentials; count: number } | null = null
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry
  }

  if (!best) return { detected: false, credentials: null, matchRatio: 0 }

  const matchRatio = best.count / streamUrls.length
  return {
    detected: matchRatio >= 0.6,
    credentials: best.credentials,
    matchRatio
  }
}
