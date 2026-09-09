import { create } from 'zustand'
import type { Channel } from '@iptv-genius/core/src/portable'

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
  nowPlaying: Channel | null
  /** Channel whose full EPG schedule modal is open, if any. */
  scheduleChannel: Channel | null
  openSource: (sourceId: number) => void
  openFavorites: () => void
  closeSource: () => void
  openCategory: (groupTitle: string | null) => void
  play: (channel: Channel) => void
  openSchedule: (channel: Channel) => void
  closeSchedule: () => void
}

export const useUiStore = create<UiState>((set) => ({
  activeSourceId: null,
  activeIsFavorites: false,
  selectedCategory: undefined,
  nowPlaying: null,
  scheduleChannel: null,
  openSource: (sourceId) =>
    set({
      activeSourceId: sourceId,
      activeIsFavorites: false,
      selectedCategory: undefined
    }),
  openFavorites: () =>
    set({
      activeSourceId: null,
      activeIsFavorites: true,
      selectedCategory: undefined
    }),
  closeSource: () =>
    set({
      activeSourceId: null,
      activeIsFavorites: false,
      selectedCategory: undefined
    }),
  openCategory: (groupTitle) => set({ selectedCategory: groupTitle }),
  play: (channel) => set({ nowPlaying: channel }),
  openSchedule: (channel) => set({ scheduleChannel: channel }),
  closeSchedule: () => set({ scheduleChannel: null })
}))
