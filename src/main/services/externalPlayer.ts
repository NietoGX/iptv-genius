import { execFileSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const COMMON_VLC_PATHS = [
  path.join(process.env['ProgramFiles'] ?? 'C:\\Program Files', 'VideoLAN', 'VLC', 'vlc.exe'),
  path.join(
    process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)',
    'VideoLAN',
    'VLC',
    'vlc.exe'
  )
]

const COMMON_MPV_PATHS = [
  path.join(process.env['ProgramFiles'] ?? 'C:\\Program Files', 'mpv', 'mpv.exe'),
  path.join(process.env['LOCALAPPDATA'] ?? '', 'Programs', 'mpv', 'mpv.exe')
]

function findExecutable(candidates: string[]): string | null {
  return candidates.find((p) => existsSync(p)) ?? null
}

/** Custom VLC install locations aren't covered by the common-paths check —
 * the installer records the real directory in the registry. */
function findVlcFromRegistry(): string | null {
  for (const key of ['HKLM\\SOFTWARE\\VideoLAN\\VLC', 'HKLM\\SOFTWARE\\WOW6432Node\\VideoLAN\\VLC']) {
    try {
      const output = execFileSync('reg', ['query', key, '/v', 'InstallDir'], {
        encoding: 'utf-8',
        windowsHide: true
      })
      const match = /InstallDir\s+REG_SZ\s+(.+)/i.exec(output)
      if (match) {
        const exe = path.join(match[1].trim(), 'vlc.exe')
        if (existsSync(exe)) return exe
      }
    } catch {
      // Key not present (VLC not installed, or wrong registry view) — try the next one.
    }
  }
  return null
}

export interface ExternalPlayerResult {
  launched: boolean
  player: 'vlc' | 'mpv' | null
}

/** Some IPTV streams use codecs (AC-3/EAC-3 audio, HEVC in unsupported
 * profiles) that Chromium's Media Source Extensions can't decode even
 * though mpegts.js demuxes them fine — VLC/mpv ship their own decoders and
 * play them without issue, so this is the practical fallback rather than
 * something fixable in the web player. */
export function openInExternalPlayer(url: string): ExternalPlayerResult {
  const vlcPath = findExecutable(COMMON_VLC_PATHS) ?? findVlcFromRegistry()
  if (vlcPath) {
    spawn(vlcPath, [url], { detached: true, stdio: 'ignore' }).unref()
    return { launched: true, player: 'vlc' }
  }

  const mpvPath = findExecutable(COMMON_MPV_PATHS)
  if (mpvPath) {
    spawn(mpvPath, [url], { detached: true, stdio: 'ignore' }).unref()
    return { launched: true, player: 'mpv' }
  }

  return { launched: false, player: null }
}
