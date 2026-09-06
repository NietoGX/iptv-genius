import { useState, type ReactElement } from 'react'
import { useEpgSearch, useHasGuideData } from '../../queries/useEpg'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useUiStore } from '../../state/useUiStore'

function formatDateTime(ts: number): string {
  return new Date(ts * 1000).toLocaleString([], {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

interface EpgSearchPanelProps {
  sourceId: number
}

export function EpgSearchPanel({ sourceId }: EpgSearchPanelProps): ReactElement {
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 300)
  const { data, isLoading } = useEpgSearch(sourceId, debounced)
  const { data: hasGuideData, isLoading: isCheckingGuide } = useHasGuideData(sourceId)
  const play = useUiStore((s) => s.play)

  const results = data ?? []
  const isSearching = debounced.trim().length > 0

  return (
    <div className="channel-column">
      <input
        className="column-search"
        placeholder="Buscar en la guía (ej. fútbol, noticias)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      {!isSearching && !isCheckingGuide && hasGuideData === false && (
        <p className="channel-list__empty">
          Todavía no se ha descargado la guía completa de esta lista. Pulsa ⟳ en "Cambiar lista"
          para actualizarla, o espera unos segundos si acabas de añadirla.
        </p>
      )}
      {!isSearching && (hasGuideData !== false || isCheckingGuide) && (
        <p className="channel-list__empty">Escribe para buscar programas de hoy en adelante.</p>
      )}
      {isSearching && isLoading && <p>Buscando…</p>}
      {isSearching && !isLoading && results.length === 0 && hasGuideData === false && (
        <p className="channel-list__empty">
          Esta lista todavía no tiene guía descargada, así que no hay nada que buscar. Actualízala
          (⟳) desde "Cambiar lista".
        </p>
      )}
      {isSearching && !isLoading && results.length === 0 && hasGuideData !== false && (
        <p className="channel-list__empty">Sin resultados.</p>
      )}

      {isSearching && !isLoading && results.length > 0 && (
        <ul className="epg-search-list">
          {results.map(({ channel, programme }, index) => (
            <li key={`${channel.id}-${index}`}>
              <button className="epg-search-list__item" onClick={() => play(channel)}>
                {channel.logoUrl && <img src={channel.logoUrl} alt="" width={28} height={28} />}
                <div className="epg-search-list__info">
                  <span className="epg-search-list__title">{programme.title}</span>
                  <span className="epg-search-list__meta">
                    {channel.name} · {formatDateTime(programme.startTs)}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
