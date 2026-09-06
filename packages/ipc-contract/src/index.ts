import type {
  Channel,
  ChannelCategory,
  ChannelKind,
  FavoriteCategory,
  Source,
  XtreamCredentials
} from '@iptv-genius/core'

export interface AddM3uInput {
  name: string
  /** Either a remote URL or an absolute local file path. */
  url: string
}

export interface AddM3uResult {
  /** Null when the input URL was itself an Xtream `get.php` playlist link —
   * we skip creating an M3U source entirely and rely on xtreamSuggestion. */
  source: Source | null
  channelCount: number
  /** Present when the playlist looks like a flat export of an Xtream
   * account, so the renderer can offer "import as Xtream instead". */
  xtreamSuggestion: XtreamCredentials | null
}

export interface AddXtreamInput {
  name: string
  baseUrl: string
  username: string
  password: string
}

export interface OpenExternalPlayerResult {
  launched: boolean
  player: 'vlc' | 'mpv' | null
}

export interface IptvApi {
  sources: {
    list(): Promise<Source[]>
    addM3u(input: AddM3uInput): Promise<AddM3uResult>
    addXtream(input: AddXtreamInput): Promise<Source>
    remove(id: number): Promise<void>
    refresh(id: number): Promise<void>
  }
  channels: {
    listCategories(sourceId: number, kind?: ChannelKind): Promise<ChannelCategory[]>
    listByCategory(sourceId: number, groupTitle: string | null, kind?: ChannelKind): Promise<Channel[]>
  }
  favorites: {
    list(): Promise<Channel[]>
    add(channelId: number): Promise<void>
    remove(channelId: number): Promise<void>
    isFavorite(channelId: number): Promise<boolean>
    listCategories(sourceId: number): Promise<FavoriteCategory[]>
    addCategory(sourceId: number, groupTitle: string | null): Promise<void>
    removeCategory(sourceId: number, groupTitle: string | null): Promise<void>
  }
  player: {
    openExternal(url: string): Promise<OpenExternalPlayerResult>
    /** Starts (if needed) a local audio-transcoding proxy for a stream and
     * returns the local URL to play instead — fixes AC-3/EAC-3 audio that
     * Chromium's MSE can't decode natively. */
    getTranscodeUrl(url: string): Promise<string>
  }
}

export const IPC_CHANNELS = {
  sourcesList: 'sources:list',
  sourcesAddM3u: 'sources:addM3u',
  sourcesAddXtream: 'sources:addXtream',
  sourcesRemove: 'sources:remove',
  sourcesRefresh: 'sources:refresh',
  channelsListCategories: 'channels:listCategories',
  channelsListByCategory: 'channels:listByCategory',
  favoritesList: 'favorites:list',
  favoritesAdd: 'favorites:add',
  favoritesRemove: 'favorites:remove',
  favoritesIsFavorite: 'favorites:isFavorite',
  favoritesListCategories: 'favorites:listCategories',
  favoritesAddCategory: 'favorites:addCategory',
  favoritesRemoveCategory: 'favorites:removeCategory',
  playerOpenExternal: 'player:openExternal',
  playerGetTranscodeUrl: 'player:getTranscodeUrl'
} as const
