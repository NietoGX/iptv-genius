export interface XtreamCategory {
  categoryId: string
  categoryName: string
}

export interface XtreamLiveChannel {
  streamId: string
  name: string
  categoryId: string | null
  logoUrl: string | null
  epgChannelId: string | null
}

export interface XtreamMovie {
  streamId: string
  name: string
  categoryId: string | null
  posterUrl: string | null
  extension: string
}

export interface XtreamShow {
  seriesId: string
  name: string
  categoryId: string | null
  posterUrl: string | null
  plot: string | null
}

export interface XtreamEpisode {
  episodeId: string
  season: number
  episode: number
  title: string
  extension: string
}

export interface XtreamShowDetail extends XtreamShow {
  episodesBySeason: Record<number, XtreamEpisode[]>
}

export interface XtreamShortEpgEntry {
  title: string
  description: string | null
  start: Date
  stop: Date
}
