import type { EpgEntry, EpgNowNext } from '@iptv-genius/core/src/portable'
import { getDatabase } from './db'
import type { EpgSearchResult } from '../db'
import { getNowNext, getSchedule, hasGuideData, searchEpg } from './epgService'

export async function fetchNowNext(channelId: number): Promise<EpgNowNext> {
  const db = await getDatabase()
  return getNowNext(db, channelId)
}

export async function fetchSchedule(channelId: number): Promise<EpgEntry[]> {
  const db = await getDatabase()
  return getSchedule(db, channelId)
}

export async function fetchEpgSearch(sourceId: number, query: string): Promise<EpgSearchResult[]> {
  const db = await getDatabase()
  return searchEpg(db, sourceId, query)
}

export async function fetchHasGuideData(sourceId: number): Promise<boolean> {
  const db = await getDatabase()
  return hasGuideData(db, sourceId)
}
