import type { ReactElement } from 'react'
import type { RowComponentProps } from 'react-window'
import type { Channel } from '@iptv-genius/core'
import { useNowNext } from '../../queries/useEpg'
import { useUiStore } from '../../state/useUiStore'

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function EpgLine({ channel }: { channel: Channel }): ReactElement | null {
  const { data } = useNowNext(channel.id)
  const openSchedule = useUiStore((s) => s.openSchedule)
  if (!data?.now) return null

  const { now, next } = data
  const nowSec = Date.now() / 1000
  const progress = Math.min(
    100,
    Math.max(0, ((nowSec - now.startTs) / (now.stopTs - now.startTs)) * 100)
  )
  const tooltip = next
    ? `Ahora: ${now.title} (${formatTime(now.startTs)}–${formatTime(now.stopTs)})\nDespués: ${next.title} (${formatTime(next.startTs)})\nClic para ver toda la programación`
    : `Ahora: ${now.title} (${formatTime(now.startTs)}–${formatTime(now.stopTs)})\nClic para ver toda la programación`

  return (
    <button className="channel-list__epg" title={tooltip} onClick={() => openSchedule(channel)}>
      <span className="channel-list__epg-title">{now.title}</span>
      <div className="channel-list__epg-bar">
        <div className="channel-list__epg-bar-fill" style={{ width: `${progress}%` }} />
      </div>
    </button>
  )
}

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
      <div className="channel-list__info">
        <button className="channel-list__name" onClick={() => onPlay(channel)}>
          {channel.name}
        </button>
        {channel.kind === 'live' && <EpgLine channel={channel} />}
      </div>
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
