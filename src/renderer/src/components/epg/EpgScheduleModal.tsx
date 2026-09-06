import { useMemo, type ReactElement } from 'react'
import type { EpgEntry } from '@iptv-genius/core'
import { useUiStore } from '../../state/useUiStore'
import { useChannelSchedule } from '../../queries/useEpg'

const PIXELS_PER_MINUTE = 1.6
const MIN_BLOCK_HEIGHT = 56
const MAX_BLOCK_HEIGHT = 260
/** Gap rendered between items via margin — also fed into the cumulative
 * height math below so the "now" line still lands in the right place. */
const ITEM_GAP = 10

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatShortDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString([], {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  })
}

function formatDay(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString([], {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit'
  })
}

function isToday(ts: number): boolean {
  return new Date(ts * 1000).toDateString() === new Date().toDateString()
}

function blockHeight(entry: EpgEntry): number {
  const minutes = (entry.stopTs - entry.startTs) / 60
  return Math.min(MAX_BLOCK_HEIGHT, Math.max(MIN_BLOCK_HEIGHT, Math.round(minutes * PIXELS_PER_MINUTE)))
}

interface DayGroup {
  label: string
  today: boolean
  items: EpgEntry[]
}

function groupByDay(entries: EpgEntry[]): DayGroup[] {
  const groups: DayGroup[] = []
  for (const entry of entries) {
    const label = formatDay(entry.startTs)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(entry)
    else groups.push({ label, today: isToday(entry.startTs), items: [entry] })
  }
  return groups
}

function TimelineDay({ group }: { group: DayGroup }): ReactElement {
  const nowTs = Date.now() / 1000

  let cumulativeHeight = 0
  let nowOffset: number | null = null
  const rows = group.items.map((entry) => {
    const height = blockHeight(entry)
    const current = group.today && entry.startTs <= nowTs && entry.stopTs > nowTs
    if (current) {
      const fraction = (nowTs - entry.startTs) / (entry.stopTs - entry.startTs)
      nowOffset = cumulativeHeight + fraction * height
    }
    cumulativeHeight += height + ITEM_GAP
    return { entry, height, current }
  })
  // No trailing gap after the last item.
  const trackHeight = Math.max(0, cumulativeHeight - ITEM_GAP)

  return (
    <div className="timeline-day">
      <div className="timeline-day__label">
        {group.label}
        {group.today && ' · Hoy'}
      </div>
      <div className="timeline-track" style={{ height: trackHeight }}>
        {rows.map(({ entry, height, current }, index) => (
          <div
            key={index}
            className={current ? 'timeline-item timeline-item--current' : 'timeline-item'}
            style={{ height, marginBottom: ITEM_GAP }}
          >
            <div className="timeline-item__time">
              <span className="timeline-item__date">{formatShortDate(entry.startTs)}</span>
              <span className="timeline-item__hours">
                {formatTime(entry.startTs)}–{formatTime(entry.stopTs)}
              </span>
            </div>
            <div className="timeline-item__content">
              <span className="timeline-item__title">{entry.title}</span>
              {height >= 90 && entry.description && (
                <span className="timeline-item__desc">{entry.description}</span>
              )}
            </div>
          </div>
        ))}
        {nowOffset !== null && (
          <div className="timeline-now-line" style={{ top: nowOffset }}>
            <span className="timeline-now-line__label">
              {new Date(nowTs * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function EpgScheduleModal(): ReactElement | null {
  const channel = useUiStore((s) => s.scheduleChannel)
  const closeSchedule = useUiStore((s) => s.closeSchedule)
  const { data, isLoading } = useChannelSchedule(channel?.id ?? null)

  const groups = useMemo(() => groupByDay(data ?? []), [data])

  if (!channel) return null

  return (
    <div className="modal-overlay" onClick={closeSchedule}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>{channel.name}</h3>
          <button onClick={closeSchedule}>✕</button>
        </div>
        <div className="modal__body">
          {isLoading && <p>Cargando…</p>}
          {!isLoading && groups.length === 0 && (
            <p className="channel-list__empty">No hay datos de programación para este canal.</p>
          )}
          {!isLoading &&
            groups.map((group, index) => <TimelineDay key={index} group={group} />)}
        </div>
      </div>
    </div>
  )
}
