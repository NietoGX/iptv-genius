import { ipcMain } from 'electron'
import { IPC_CHANNELS, type AddM3uInput, type AddXtreamInput } from '@iptv-genius/ipc-contract'
import { getDatabase } from '../../services/db'
import { importM3uSource, importXtreamSource, refreshSource } from '../../services/importSource'

export function registerSourcesHandlers(): void {
  const db = getDatabase()

  ipcMain.handle(IPC_CHANNELS.sourcesList, () => db.sources.list())

  ipcMain.handle(IPC_CHANNELS.sourcesAddM3u, (_event, input: AddM3uInput) =>
    importM3uSource(db, input)
  )

  ipcMain.handle(IPC_CHANNELS.sourcesAddXtream, (_event, input: AddXtreamInput) =>
    importXtreamSource(db, input)
  )

  ipcMain.handle(IPC_CHANNELS.sourcesRemove, (_event, id: number) => {
    db.sources.remove(id)
  })

  ipcMain.handle(IPC_CHANNELS.sourcesRefresh, (_event, id: number) => refreshSource(db, id))
}
