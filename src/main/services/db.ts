import { app } from 'electron'
import path from 'node:path'
import { createAppDatabase, type AppDatabase } from '@iptv-genius/core'

let instance: AppDatabase | null = null

export function getDatabase(): AppDatabase {
  if (!instance) {
    const filePath = path.join(app.getPath('userData'), 'iptv-genius.sqlite')
    instance = createAppDatabase(filePath)
  }
  return instance
}
