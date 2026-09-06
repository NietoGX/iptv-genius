import { useMemo, useState, type ReactElement } from 'react'
import { List } from 'react-window'
import type { Channel } from '@iptv-genius/core'
import { ChannelRow } from './ChannelRow'
import { useFavorites, useToggleFavorite } from '../../queries/useFavorites'
import { useUiStore } from '../../state/useUiStore'

const ROW_HEIGHT = 56

interface ChannelColumnProps {
  channels: Channel[]
  isLoading: boolean
  emptyMessage: string
  placeholderMessage?: string
  searchPlaceholder?: string
}

export function ChannelColumn({
  channels,
  isLoading,
  emptyMessage,
  placeholderMessage,
  searchPlaceholder = 'Buscar canales…'
}: ChannelColumnProps): ReactElement {
  const nowPlaying = useUiStore((s) => s.nowPlaying)
  const play = useUiStore((s) => s.play)
  const favorites = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const [search, setSearch] = useState('')

  const favoriteIds = useMemo(
    () => new Set((favorites.data ?? []).map((c) => c.id)),
    [favorites.data]
  )

  const filtered = useMemo(() => {
    if (!search.trim()) return channels
    const q = search.trim().toLowerCase()
    return channels.filter((c) => c.name.toLowerCase().includes(q))
  }, [channels, search])

  function handleToggleFavorite(channelId: number, isFavorite: boolean): void {
    toggleFavorite.mutate({ channelId, isFavorite })
  }

  return (
    <div className="channel-column">
      {!placeholderMessage && (
        <input
          className="column-search"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      {placeholderMessage && <p className="channel-list__empty">{placeholderMessage}</p>}
      {!placeholderMessage && isLoading && <p>Cargando…</p>}
      {!placeholderMessage && !isLoading && filtered.length === 0 && (
        <p className="channel-list__empty">{search.trim() ? 'Sin resultados.' : emptyMessage}</p>
      )}
      {!placeholderMessage && !isLoading && filtered.length > 0 && (
        <div className="channel-list__virtual">
          <List
            rowComponent={ChannelRow}
            rowCount={filtered.length}
            rowHeight={ROW_HEIGHT}
            rowProps={{
              items: filtered,
              favoriteIds,
              activeId: nowPlaying?.id ?? null,
              onPlay: play,
              onToggleFavorite: handleToggleFavorite
            }}
            style={{ height: '100%', width: '100%' }}
          />
        </div>
      )}
    </div>
  )
}
