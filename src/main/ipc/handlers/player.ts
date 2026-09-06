import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@iptv-genius/ipc-contract'
import { openInExternalPlayer } from '../../services/externalPlayer'
import { getTranscodeUrl } from '../../services/transcodeProxy'

export function registerPlayerHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.playerOpenExternal, (_event, url: string) =>
    openInExternalPlayer(url)
  )

  ipcMain.handle(IPC_CHANNELS.playerGetTranscodeUrl, (_event, url: string) =>
    getTranscodeUrl(url)
  )
}
