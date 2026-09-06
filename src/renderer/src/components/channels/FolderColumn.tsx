import { useMemo, useState, type ReactElement } from 'react'
import { List, type RowComponentProps } from 'react-window'
import type { ChannelCategory } from '@iptv-genius/core'
import { useChannelCategories } from '../../queries/useChannels'
import { useFavoriteCategories, useToggleFavoriteCategory } from '../../queries/useFavorites'
import { useUiStore } from '../../state/useUiStore'

const ROW_HEIGHT = 40

interface CategoryRowData {
  items: ChannelCategory[]
  selected: string | null | undefined
  favoriteSet: Set<string | null>
  onOpen: (groupTitle: string | null) => void
  onToggleFavorite: (groupTitle: string | null, isFavorite: boolean) => void
}

function CategoryRow({
  index,
  style,
  items,
  selected,
  favoriteSet,
  onOpen,
  onToggleFavorite
}: RowComponentProps<CategoryRowData>): ReactElement {
  const category = items[index]
  const isActive = category.groupTitle === selected
  const isFavorite = favoriteSet.has(category.groupTitle)

  return (
    <div
      style={style}
      className={`channel-list__row ${isActive ? 'channel-list__row--active' : ''}`}
    >
      <button className="channel-list__category" onClick={() => onOpen(category.groupTitle)}>
        <span>{category.groupTitle ?? 'Sin categoría'}</span>
        <span className="tag">{category.count}</span>
      </button>
      <button
        className={`channel-list__fav ${isFavorite ? 'channel-list__fav--active' : ''}`}
        title={isFavorite ? 'Quitar carpeta de favoritos' : 'Añadir carpeta a favoritos'}
        onClick={() => onToggleFavorite(category.groupTitle, isFavorite)}
      >
        {isFavorite ? '★' : '☆'}
      </button>
    </div>
  )
}

interface FolderColumnProps {
  sourceId: number
}

export function FolderColumn({ sourceId }: FolderColumnProps): ReactElement {
  const selectedCategory = useUiStore((s) => s.selectedCategory)
  const openCategory = useUiStore((s) => s.openCategory)
  const categories = useChannelCategories(sourceId)
  const favoriteCategories = useFavoriteCategories(sourceId)
  const toggleFavoriteCategory = useToggleFavoriteCategory(sourceId)
  const [search, setSearch] = useState('')

  const favoriteSet = useMemo(
    () => new Set((favoriteCategories.data ?? []).map((f) => f.groupTitle)),
    [favoriteCategories.data]
  )

  const items = useMemo(() => {
    const all = categories.data ?? []
    const filtered = search.trim()
      ? all.filter((c) =>
          (c.groupTitle ?? 'Sin categoría').toLowerCase().includes(search.trim().toLowerCase())
        )
      : all
    const favorited = filtered.filter((c) => favoriteSet.has(c.groupTitle))
    const rest = filtered.filter((c) => !favoriteSet.has(c.groupTitle))
    return [...favorited, ...rest]
  }, [categories.data, search, favoriteSet])

  function handleToggleFavorite(groupTitle: string | null, isFavorite: boolean): void {
    toggleFavoriteCategory.mutate({ groupTitle, isFavorite })
  }

  return (
    <div className="folder-column">
      <h3 className="folder-column__title">Carpetas</h3>
      <input
        className="column-search"
        placeholder="Buscar carpetas…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {categories.isLoading && <p>Cargando…</p>}
      {!categories.isLoading && items.length === 0 && (
        <p className="channel-list__empty">
          {search.trim() ? 'Sin resultados.' : 'Esta lista no tiene canales todavía.'}
        </p>
      )}
      {!categories.isLoading && items.length > 0 && (
        <div className="channel-list__virtual">
          <List
            rowComponent={CategoryRow}
            rowCount={items.length}
            rowHeight={ROW_HEIGHT}
            rowProps={{ items, selected: selectedCategory, favoriteSet, onOpen: openCategory, onToggleFavorite: handleToggleFavorite }}
            style={{ height: '100%', width: '100%' }}
          />
        </div>
      )}
    </div>
  )
}
