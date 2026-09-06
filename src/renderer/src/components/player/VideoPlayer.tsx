import { useEffect, useRef, useState, type ReactElement } from 'react'
import Hls from 'hls.js'
import mpegts from 'mpegts.js'
import type { Channel } from '@iptv-genius/core'

interface VideoPlayerProps {
  channel: Channel | null
}

type Engine = 'native' | 'hls' | 'mpegts'

function pickEngine(url: string): Engine {
  const clean = url.split('?')[0].toLowerCase()
  if (clean.endsWith('.m3u8')) return 'hls'
  if (clean.endsWith('.mp4')) return 'native'
  return 'mpegts'
}

export function VideoPlayer({ channel }: VideoPlayerProps): ReactElement {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const mpegtsRef = useRef<ReturnType<typeof mpegts.createPlayer> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [externalStatus, setExternalStatus] = useState<string | null>(null)
  const [transcoding, setTranscoding] = useState(false)

  function teardown(): void {
    hlsRef.current?.destroy()
    hlsRef.current = null
    if (mpegtsRef.current) {
      mpegtsRef.current.unload()
      mpegtsRef.current.detachMediaElement()
      mpegtsRef.current.destroy()
      mpegtsRef.current = null
    }
  }

  function attach(url: string, engineOverride?: Engine): void {
    const video = videoRef.current
    if (!video) return

    teardown()
    setError(null)
    const engine = engineOverride ?? pickEngine(url)

    if (engine === 'hls' && Hls.isSupported()) {
      const hls = new Hls()
      hlsRef.current = hls
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) setError(`No se pudo reproducir (HLS): ${data.details}`)
      })
    } else if (engine === 'mpegts' && mpegts.isSupported()) {
      const player = mpegts.createPlayer({ type: 'mpegts', isLive: true, url })
      mpegtsRef.current = player
      player.attachMediaElement(video)
      player.on(mpegts.Events.ERROR, (type: string, detail: string) => {
        setError(`No se pudo reproducir (MPEG-TS): ${type} ${detail}`)
      })
      player.load()
    } else {
      video.src = url
    }

    video.play().catch(() => {
      /* autoplay can be blocked until the user interacts; controls remain visible */
    })
  }

  useEffect(() => {
    setExternalStatus(null)
    setTranscoding(false)
    if (channel) attach(channel.streamUrl)
    return () => teardown()
  }, [channel])

  async function handleOpenExternal(): Promise<void> {
    if (!channel) return
    setExternalStatus('Abriendo…')
    const result = await window.api.player.openExternal(channel.streamUrl)
    setExternalStatus(
      result.launched
        ? `Abierto en ${result.player === 'vlc' ? 'VLC' : 'mpv'}.`
        : 'No se encontró VLC ni mpv instalado. Instala uno o copia la URL de abajo.'
    )
  }

  async function handleTranscodeRetry(): Promise<void> {
    if (!channel) return
    setTranscoding(true)
    setExternalStatus(null)
    try {
      const proxyUrl = await window.api.player.getTranscodeUrl(channel.streamUrl)
      attach(proxyUrl, 'mpegts')
    } catch (err) {
      setError(
        `No se pudo iniciar la conversión de audio: ${err instanceof Error ? err.message : String(err)}`
      )
    } finally {
      setTranscoding(false)
    }
  }

  if (!channel) {
    return (
      <div className="player player--empty">
        <p>Selecciona un canal para reproducir</p>
      </div>
    )
  }

  return (
    <div className="player">
      <video ref={videoRef} controls autoPlay className="player__video" />
      <div className="player__title">{channel.name}</div>
      {error && (
        <div className="player__error">
          {error}
          <br />
          <button onClick={handleTranscodeRetry} disabled={transcoding}>
            {transcoding ? 'Convirtiendo audio…' : 'Reintentar con audio convertido'}
          </button>
          <button onClick={handleOpenExternal}>Abrir en reproductor externo</button>
          {externalStatus && <span className="player__external-status">{externalStatus}</span>}
          <br />
          <a href={channel.streamUrl} onClick={(e) => e.preventDefault()}>
            {channel.streamUrl}
          </a>
        </div>
      )}
    </div>
  )
}
