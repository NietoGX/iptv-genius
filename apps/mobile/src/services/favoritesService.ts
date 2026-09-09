import type { Channel } from '@iptv-genius/core/src/portable'
import { getDatabase } from './db'
import type { FavoriteCategory } from '../db'

export async function listFavorites(): Promise<Channel[]> {
  const db = await getDatabase()
  return db.favorites.list()
}

export async function addFavorite(channelId: number): Promise<void> {
  const db = await getDatabase()
  await db.favorites.add(channelId)
}

export async function removeFavorite(channelId: number): Promise<void> {
  const db = await getDatabase()
  await db.favorites.remove(channelId)
}

export async function listFavoriteCategories(sourceId: number): Promise<FavoriteCategory[]> {
  const db = await getDatabase()
  return db.favoriteCategories.listForSource(sourceId)
}

export async function addFavoriteCategory(sourceId: number, groupTitle: string | null): Promise<void> {
  const db = await getDatabase()
  await db.favoriteCategories.add(sourceId, groupTitle)
}

export async function removeFavoriteCategory(sourceId: number, groupTitle: string | null): Promise<void> {
  const db = await getDatabase()
  await db.favoriteCategories.remove(sourceId, groupTitle)
}
