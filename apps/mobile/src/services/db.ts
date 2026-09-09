import { createAppDatabase, type AppDatabase } from '../db'

let dbPromise: Promise<AppDatabase> | null = null

export function getDatabase(): Promise<AppDatabase> {
  if (!dbPromise) dbPromise = createAppDatabase()
  return dbPromise
}
