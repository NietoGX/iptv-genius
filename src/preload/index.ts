import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type IptvApi } from '@iptv-genius/ipc-contract'

const api: IptvApi = {
  sources: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.sourcesList),
    addM3u: (input) => ipcRenderer.invoke(IPC_CHANNELS.sourcesAddM3u, input),
    addXtream: (input) => ipcRenderer.invoke(IPC_CHANNELS.sourcesAddXtream, input),
    remove: (id) => ipcRenderer.invoke(IPC_CHANNELS.sourcesRemove, id),
    refresh: (id) => ipcRenderer.invoke(IPC_CHANNELS.sourcesRefresh, id)
  },
  channels: {
    listCategories: (sourceId, kind) =>
      ipcRenderer.invoke(IPC_CHANNELS.channelsListCategories, sourceId, kind),
    listByCategory: (sourceId, groupTitle, kind) =>
      ipcRenderer.invoke(IPC_CHANNELS.channelsListByCategory, sourceId, groupTitle, kind)
  },
  favorites: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.favoritesList),
    add: (channelId) => ipcRenderer.invoke(IPC_CHANNELS.favoritesAdd, channelId),
    remove: (channelId) => ipcRenderer.invoke(IPC_CHANNELS.favoritesRemove, channelId),
    isFavorite: (channelId) => ipcRenderer.invoke(IPC_CHANNELS.favoritesIsFavorite, channelId),
    listCategories: (sourceId) => ipcRenderer.invoke(IPC_CHANNELS.favoritesListCategories, sourceId),
    addCategory: (sourceId, groupTitle) =>
      ipcRenderer.invoke(IPC_CHANNELS.favoritesAddCategory, sourceId, groupTitle),
    removeCategory: (sourceId, groupTitle) =>
      ipcRenderer.invoke(IPC_CHANNELS.favoritesRemoveCategory, sourceId, groupTitle)
  },
  player: {
    openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.playerOpenExternal, url),
    getTranscodeUrl: (url) => ipcRenderer.invoke(IPC_CHANNELS.playerGetTranscodeUrl, url)
  },
  epg: {
    getNowNext: (channelId) => ipcRenderer.invoke(IPC_CHANNELS.epgGetNowNext, channelId),
    getSchedule: (channelId) => ipcRenderer.invoke(IPC_CHANNELS.epgGetSchedule, channelId),
    search: (sourceId, query) => ipcRenderer.invoke(IPC_CHANNELS.epgSearch, sourceId, query),
    hasGuideData: (sourceId) => ipcRenderer.invoke(IPC_CHANNELS.epgHasGuideData, sourceId)
  }
}

contextBridge.exposeInMainWorld('api', api)
