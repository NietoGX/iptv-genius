import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@iptv-genius/ipc-contract'
import type { ChannelKind } from '@iptv-genius/core'
import { getDatabase } from '../../services/db'

export function registerChannelsHandlers(): void {
  const db = getDatabase()

  ipcMain.handle(
    IPC_CHANNELS.channelsListCategories,
    (_event, sourceId: number, kind?: ChannelKind) => db.channels.listCategories(sourceId, kind)
  )

  ipcMain.handle(
    IPC_CHANNELS.channelsListByCategory,
    (_event, sourceId: number, groupTitle: string | null, kind?: ChannelKind) =>
      db.channels.listByCategory(sourceId, groupTitle, kind)
  )

}
