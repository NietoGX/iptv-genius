import { create } from 'zustand'
import type { Channel } from '@iptv-genius/core'

interface UiState {
  /** Null means "show the playlist picker screen". A real id means the user
   * is browsing that source, full screen, no sidebar. */
  activeSourceId: number | null
  /** Browsing the cross-source favorites list instead of a real source. */
  activeIsFavorites: boolean
  /** The folder currently open within the active source's two-column view.
   * `undefined` = no folder chosen yet; `null` is itself a real folder value
   * (channels with no group_title, shown as "Sin categoría"). */
  selectedCategory: string | null | undefined
  searchQuery: string
  nowPlaying: Channel | null
  openSource: (sourceId: number) => void
  openFavorites: () => void
  closeSource: () => void
  openCategory: (groupTitle: string | null) => void
  setSearchQuery: (value: string) => void
  play: (channel: Channel) => void
}

export const useUiStore = create<UiState>((set) => ({
  activeSourceId: null,
  activeIsFavorites: false,
  selectedCategory: undefined,
  searchQuery: '',
  nowPlaying: null,
  openSource: (sourceId) =>
    set({
      activeSourceId: sourceId,
      activeIsFavorites: false,
      selectedCategory: undefined,
      searchQuery: ''
    }),
  openFavorites: () =>
    set({
      activeSourceId: null,
      activeIsFavorites: true,
      selectedCategory: undefined,
      searchQuery: ''
    }),
  closeSource: () =>
    set({
      activeSourceId: null,
      activeIsFavorites: false,
      selectedCategory: undefined,
      searchQuery: ''
    }),
  openCategory: (groupTitle) => set({ selectedCategory: groupTitle }),
  setSearchQuery: (value) => set({ searchQuery: value }),
  play: (channel) => set({ nowPlaying: channel })
}))
