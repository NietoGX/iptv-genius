import { openDatabase } from './connection'
import { createSourcesRepo } from './queries/sources'
import { createChannelsRepo } from './queries/channels'
import { createFavoritesRepo } from './queries/favorites'
import { createFavoriteCategoriesRepo } from './queries/favoriteCategories'
import { createEpgRepo } from './queries/epg'

export function createAppDatabase(filePath: string) {
  const db = openDatabase(filePath)
  return {
    db,
    sources: createSourcesRepo(db),
    channels: createChannelsRepo(db),
    favorites: createFavoritesRepo(db),
    favoriteCategories: createFavoriteCategoriesRepo(db),
    epg: createEpgRepo(db)
  }
}

export type AppDatabase = ReturnType<typeof createAppDatabase>

export * from './queries/sources'
export * from './queries/channels'
export * from './queries/favorites'
export * from './queries/favoriteCategories'
export * from './queries/epg'
