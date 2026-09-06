import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@iptv-genius/core': resolve('packages/core/src'),
        '@iptv-genius/ipc-contract': resolve('packages/ipc-contract/src')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@iptv-genius/ipc-contract': resolve('packages/ipc-contract/src')
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@iptv-genius/core': resolve('packages/core/src'),
        '@iptv-genius/ipc-contract': resolve('packages/ipc-contract/src')
      }
    },
    plugins: [react()]
  }
})
