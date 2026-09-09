import { open } from '@op-engineering/op-sqlite'
import { runMigrations } from './migrations'
import { createSourcesRepo } from './queries/sources'
import { createChannelsRepo } from './queries/channels'
import { createFavoritesRepo } from './queries/favorites'
import { createFavoriteCategoriesRepo } from './queries/favoriteCategories'
import { createEpgRepo } from './queries/epg'

export async function createAppDatabase(name = 'iptv-genius.sqlite') {
  const db = open({ name })
  // WAL mode defers committed writes to a separate -wal file until the
  // connection closes cleanly and checkpoints it into the main db file.
  // Android can (and does) kill this app's process without warning —
  // e.g. force-stop, task-switcher swipe — losing everything still sitting
  // in the WAL. Desktop uses WAL for concurrent read/write throughput under
  // a long-lived Electron main process; that tradeoff doesn't hold here, so
  // this stays on SQLite's default rollback journal (committed = on disk).
  await db.execute('PRAGMA foreign_keys = ON')
  await runMigrations(db)

  return {
    db,
    sources: createSourcesRepo(db),
    channels: createChannelsRepo(db),
    favorites: createFavoritesRepo(db),
    favoriteCategories: createFavoriteCategoriesRepo(db),
    epg: createEpgRepo(db)
  }
}

export type AppDatabase = Awaited<ReturnType<typeof createAppDatabase>>

export * from './queries/sources'
export * from './queries/channels'
export * from './queries/favorites'
export * from './queries/favoriteCategories'
export * from './queries/epg'
