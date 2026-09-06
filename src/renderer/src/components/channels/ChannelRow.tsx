import type { ReactElement } from 'react'
import type { RowComponentProps } from 'react-window'
import type { Channel } from '@iptv-genius/core'

export interface ChannelRowData {
  items: Channel[]
  favoriteIds: Set<number>
  activeId: number | null
  onPlay: (channel: Channel) => void
  onToggleFavorite: (channelId: number, isFavorite: boolean) => void
}

export function ChannelRow({
  index,
  style,
  items,
  favoriteIds,
  activeId,
  onPlay,
  onToggleFavorite
}: RowComponentProps<ChannelRowData>): ReactElement {
  const channel = items[index]
  const isFavorite = favoriteIds.has(channel.id)

  return (
    <div
      style={style}
      className={
        activeId === channel.id
          ? 'channel-list__row channel-list__row--active'
          : 'channel-list__row'
      }
    >
      {channel.logoUrl && <img src={channel.logoUrl} alt="" width={28} height={28} />}
      <button className="channel-list__name" onClick={() => onPlay(channel)}>
        {channel.name}
      </button>
      <button
        className={`channel-list__fav ${isFavorite ? 'channel-list__fav--active' : ''}`}
        title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        onClick={() => onToggleFavorite(channel.id, isFavorite)}
      >
        {isFavorite ? '★' : '☆'}
      </button>
    </div>
  )
}
