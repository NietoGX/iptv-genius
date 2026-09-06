import { useState, type FormEvent, type ReactElement } from 'react'
import {
  useAddM3uSource,
  useAddXtreamSource,
  useRefreshSource,
  useRemoveSource,
  useSources
} from '../../queries/useSources'
import { useUiStore } from '../../state/useUiStore'

type FormMode = 'm3u' | 'xtream' | null

export function SourcePickerScreen(): ReactElement {
  const { data: sources, isLoading } = useSources()
  const addM3u = useAddM3uSource()
  const addXtream = useAddXtreamSource()
  const removeSource = useRemoveSource()
  const refreshSource = useRefreshSource()
  const { openSource, openFavorites } = useUiStore()

  const [formMode, setFormMode] = useState<FormMode>(null)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  function resetForm(): void {
    setFormMode(null)
    setName('')
    setUrl('')
    setUsername('')
    setPassword('')
    setFormError(null)
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setFormError(null)
    try {
      if (formMode === 'm3u') {
        const result = await addM3u.mutateAsync({ name, url })
        if (result.xtreamSuggestion) {
          const { baseUrl, username: u, password: p } = result.xtreamSuggestion
          const message = result.source
            ? `Esta lista parece ser una cuenta Xtream Codes (${baseUrl}).\n` +
              '¿Quieres importarla también como cuenta Xtream para tener VOD, series y EPG?'
            : `Este enlace es de una cuenta Xtream Codes (${baseUrl}), no una lista M3U estática.\n` +
              '¿Quieres importarlo como cuenta Xtream?'
          const wantsXtream = window.confirm(message)
          if (wantsXtream) {
            const xtreamName = result.source ? `${name} (Xtream)` : name
            const xtreamSource = await addXtream.mutateAsync({
              name: xtreamName,
              baseUrl,
              username: u,
              password: p
            })
            resetForm()
            openSource(xtreamSource.id)
            return
          }
        }
        if (result.source) {
          resetForm()
          openSource(result.source.id)
          return
        }
      } else if (formMode === 'xtream') {
        const source = await addXtream.mutateAsync({ name, baseUrl: url, username, password })
        resetForm()
        openSource(source.id)
        return
      }
      resetForm()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    }
  }

  const busy = addM3u.isPending || addXtream.isPending

  return (
    <div className="picker">
      <div className="picker__panel">
        <div className="picker__header">
          <h1>IPTV Genius</h1>
          <p className="picker__subtitle">Elige una lista para empezar a ver</p>
        </div>

        <div className="picker__actions">
          <button onClick={() => setFormMode(formMode === 'm3u' ? null : 'm3u')}>+ M3U</button>
          <button onClick={() => setFormMode(formMode === 'xtream' ? null : 'xtream')}>
            + Xtream
          </button>
        </div>

        {formMode && (
          <form className="sources-panel__form" onSubmit={handleSubmit}>
            <input
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {formMode === 'm3u' ? (
              <input
                placeholder="URL o ruta local del .m3u/.m3u8"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            ) : (
              <>
                <input
                  placeholder="http://servidor:puerto"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
                <input
                  placeholder="Usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <input
                  placeholder="Contraseña"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </>
            )}
            {formError && <div className="form-error">{formError}</div>}
            <div className="sources-panel__form-actions">
              <button type="submit" disabled={busy}>
                {busy ? 'Añadiendo…' : 'Añadir'}
              </button>
              <button type="button" onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        <button className="picker__item picker__item--favorites" onClick={openFavorites}>
          ★ Favoritos
        </button>

        {isLoading && <p>Cargando…</p>}
        <ul className="picker__list">
          {sources?.map((source) => (
            <li key={source.id} className="picker__item">
              <button className="picker__item-main" onClick={() => openSource(source.id)}>
                {source.name} <span className="tag">{source.type}</span>
              </button>
              <div className="sources-panel__item-actions">
                <button title="Actualizar" onClick={() => refreshSource.mutate(source.id)}>
                  ⟳
                </button>
                <button
                  title="Eliminar"
                  onClick={() => {
                    if (window.confirm(`¿Eliminar "${source.name}"?`)) removeSource.mutate(source.id)
                  }}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
        {!isLoading && (sources?.length ?? 0) === 0 && (
          <p className="channel-list__empty">Añade tu primera lista M3U o cuenta Xtream arriba.</p>
        )}
      </div>
    </div>
  )
}
