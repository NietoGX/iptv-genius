import type { Channel, ChannelKind } from '@iptv-genius/core/src/portable'
import { getDatabase } from './db'
import type { ChannelCategory } from '../db'

export async function listChannelCategories(sourceId: number, kind?: ChannelKind): Promise<ChannelCategory[]> {
  const db = await getDatabase()
  return db.channels.listCategories(sourceId, kind)
}

export async function listChannelsByCategory(
  sourceId: number,
  groupTitle: string | null,
  kind?: ChannelKind
): Promise<Channel[]> {
  const db = await getDatabase()
  return db.channels.listByCategory(sourceId, groupTitle, kind)
}
