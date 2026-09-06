import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@iptv-genius/ipc-contract'
import { getDatabase } from '../../services/db'

export function registerFavoritesHandlers(): void {
  const db = getDatabase()

  ipcMain.handle(IPC_CHANNELS.favoritesList, () => db.favorites.list())

  ipcMain.handle(IPC_CHANNELS.favoritesAdd, (_event, channelId: number) => {
    db.favorites.add(channelId)
  })

  ipcMain.handle(IPC_CHANNELS.favoritesRemove, (_event, channelId: number) => {
    db.favorites.remove(channelId)
  })

  ipcMain.handle(IPC_CHANNELS.favoritesIsFavorite, (_event, channelId: number) =>
    db.favorites.isFavorite(channelId)
  )

  ipcMain.handle(IPC_CHANNELS.favoritesListCategories, (_event, sourceId: number) =>
    db.favoriteCategories.listForSource(sourceId)
  )

  ipcMain.handle(
    IPC_CHANNELS.favoritesAddCategory,
    (_event, sourceId: number, groupTitle: string | null) => {
      db.favoriteCategories.add(sourceId, groupTitle)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.favoritesRemoveCategory,
    (_event, sourceId: number, groupTitle: string | null) => {
      db.favoriteCategories.remove(sourceId, groupTitle)
    }
  )
}
