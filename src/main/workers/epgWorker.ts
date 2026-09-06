import { parentPort } from 'node:worker_threads'
import zlib from 'node:zlib'
import { parseXmltv } from '@iptv/xmltv'

interface EpgWorkerRequest {
  sourceId: number
  /** Raw bytes as received over HTTP — decompression happens here, off the
   * main thread, since gunzip + XML parsing are both CPU-bound and XMLTV
   * guides can run into the tens of MB. */
  buffer: Uint8Array
  isGzip: boolean
}

interface EpgWorkerProgramme {
  channelRef: string
  title: string
  description: string | null
  startTs: number
  stopTs: number
}

type EpgWorkerResponse =
  | { ok: true; sourceId: number; programmes: EpgWorkerProgramme[] }
  | { ok: false; sourceId: number; error: string }

parentPort?.on('message', (request: EpgWorkerRequest) => {
  try {
    const raw = Buffer.from(request.buffer)
    const xml = (request.isGzip ? zlib.gunzipSync(raw) : raw).toString('utf-8')
    const parsed = parseXmltv(xml)

    const programmes: EpgWorkerProgramme[] = (parsed.programmes ?? [])
      .filter((p) => p.stop)
      .map((p) => ({
        channelRef: p.channel,
        title: p.title?.[0]?._value ?? '',
        description: p.desc?.[0]?._value ?? null,
        startTs: Math.floor(p.start.getTime() / 1000),
        // Guarded by the filter above, but TS can't see through it.
        stopTs: Math.floor((p.stop as Date).getTime() / 1000)
      }))

    const response: EpgWorkerResponse = { ok: true, sourceId: request.sourceId, programmes }
    parentPort?.postMessage(response)
  } catch (error) {
    const response: EpgWorkerResponse = {
      ok: false,
      sourceId: request.sourceId,
      error: error instanceof Error ? error.message : String(error)
    }
    parentPort?.postMessage(response)
  }
})
