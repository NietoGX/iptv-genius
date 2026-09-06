import type { ReactElement } from 'react'
import { VideoPlayer } from '../player/VideoPlayer'
import { FolderColumn } from '../channels/FolderColumn'
import { ChannelColumn } from '../channels/ChannelColumn'
import { useUiStore } from '../../state/useUiStore'
import { useSources } from '../../queries/useSources'
import { useChannelsByCategory } from '../../queries/useChannels'
import { useFavorites } from '../../queries/useFavorites'

export function BrowseScreen(): ReactElement {
  const { activeSourceId, activeIsFavorites, selectedCategory, nowPlaying, closeSource } =
    useUiStore()
  const { data: sources } = useSources()
  const activeSource = sources?.find((s) => s.id === activeSourceId) ?? null

  const categoryChannels = useChannelsByCategory(
    !activeIsFavorites ? activeSourceId : null,
    selectedCategory
  )
  const favorites = useFavorites()

  const title = activeIsFavorites ? 'Favoritos' : (activeSource?.name ?? 'Cargando…')

  return (
    <div className="browse">
      <header className="browse__header">
        <button className="browse__back" onClick={closeSource}>
          ← Cambiar lista
        </button>
        <h2 className="browse__title">{title}</h2>
      </header>

      <section className="browse__player">
        <VideoPlayer channel={nowPlaying} />
      </section>

      <section className="browse__body">
        {activeIsFavorites ? (
          <ChannelColumn
            channels={favorites.data ?? []}
            isLoading={favorites.isLoading}
            emptyMessage="No tienes favoritos todavía."
            searchPlaceholder="Buscar en favoritos…"
          />
        ) : (
          activeSourceId !== null && (
            <>
              <FolderColumn sourceId={activeSourceId} />
              <ChannelColumn
                channels={categoryChannels.data ?? []}
                isLoading={categoryChannels.isLoading}
                emptyMessage="Esta categoría está vacía."
                placeholderMessage={
                  selectedCategory === undefined ? 'Selecciona una carpeta' : undefined
                }
                searchPlaceholder="Buscar canales…"
              />
            </>
          )
        )}
      </section>
    </div>
  )
}
