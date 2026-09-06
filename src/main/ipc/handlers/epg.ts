import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@iptv-genius/ipc-contract'
import type { EpgEntry, EpgNowNext, EpgSearchResult } from '@iptv-genius/core'
import { getDatabase } from '../../services/db'
import { getNowNext, getSchedule, hasGuideData, searchEpg } from '../../services/epgService'

export function registerEpgHandlers(): void {
  const db = getDatabase()

  ipcMain.handle(IPC_CHANNELS.epgGetNowNext, async (_event, channelId: number): Promise<EpgNowNext> => {
    const channel = db.channels.get(channelId)
    if (!channel) return { now: null, next: null }

    const source = db.sources.get(channel.sourceId)
    if (!source) return { now: null, next: null }

    return getNowNext(db, channel, source)
  })

  ipcMain.handle(IPC_CHANNELS.epgGetSchedule, async (_event, channelId: number): Promise<EpgEntry[]> => {
    const channel = db.channels.get(channelId)
    if (!channel) return []

    const source = db.sources.get(channel.sourceId)
    if (!source) return []

    return getSchedule(db, channel, source)
  })

  ipcMain.handle(
    IPC_CHANNELS.epgSearch,
    (_event, sourceId: number, query: string): EpgSearchResult[] => searchEpg(db, sourceId, query)
  )

  ipcMain.handle(IPC_CHANNELS.epgHasGuideData, (_event, sourceId: number): boolean =>
    hasGuideData(db, sourceId)
  )
}
