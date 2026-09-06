import type { IptvApi } from '@iptv-genius/ipc-contract'

declare global {
  interface Window {
    api: IptvApi
  }
}
