import { createServer, type Server } from 'node:http'
import { spawn } from 'node:child_process'
import ffmpegPath from 'ffmpeg-static'

let server: Server | null = null
let serverPort = 0

/** Lazily starts a localhost-only HTTP server that transcodes a source
 * stream's audio to AAC on the fly (video is copied, not re-encoded) —
 * needed because Chromium's MSE has no AC-3/EAC-3 decoder, so streams with
 * that audio play fine in VLC/mpv but fail to play natively in Electron. */
function ensureServer(): Promise<number> {
  if (server) return Promise.resolve(serverPort)

  return new Promise((resolve, reject) => {
    const srv = createServer((req, res) => {
      const requestUrl = new URL(req.url ?? '/', 'http://127.0.0.1')
      const sourceUrl = requestUrl.searchParams.get('url')

      if (requestUrl.pathname !== '/transcode' || !sourceUrl) {
        res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Missing url parameter')
        return
      }

      if (!ffmpegPath) {
        res.writeHead(500, { 'Content-Type': 'text/plain' }).end('ffmpeg binary not available')
        return
      }

      const ffmpeg = spawn(
        ffmpegPath,
        [
          '-loglevel',
          'error',
          '-reconnect',
          '1',
          '-reconnect_streamed',
          '1',
          '-reconnect_delay_max',
          '2',
          '-i',
          sourceUrl,
          '-c:v',
          'copy',
          '-c:a',
          'aac',
          '-f',
          'mpegts',
          'pipe:1'
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      )

      let headersSent = false
      ffmpeg.stdout.once('data', () => {
        if (!headersSent) {
          headersSent = true
          res.writeHead(200, { 'Content-Type': 'video/mp2t' })
        }
      })
      ffmpeg.stdout.pipe(res)

      function cleanup(): void {
        if (!ffmpeg.killed) ffmpeg.kill('SIGKILL')
      }

      ffmpeg.on('error', () => {
        if (!headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end()
      })
      ffmpeg.on('close', () => res.end())
      req.on('close', cleanup)
      res.on('close', cleanup)
    })

    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address()
      if (address && typeof address === 'object') {
        server = srv
        serverPort = address.port
        resolve(serverPort)
      } else {
        reject(new Error('Failed to start transcode proxy server'))
      }
    })
  })
}

export async function getTranscodeUrl(sourceUrl: string): Promise<string> {
  const port = await ensureServer()
  return `http://127.0.0.1:${port}/transcode?url=${encodeURIComponent(sourceUrl)}`
}
