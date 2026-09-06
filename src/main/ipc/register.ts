import { registerSourcesHandlers } from './handlers/sources'
import { registerChannelsHandlers } from './handlers/channels'
import { registerFavoritesHandlers } from './handlers/favorites'
import { registerPlayerHandlers } from './handlers/player'
import { registerEpgHandlers } from './handlers/epg'

export function registerIpcHandlers(): void {
  registerSourcesHandlers()
  registerChannelsHandlers()
  registerFavoritesHandlers()
  registerPlayerHandlers()
  registerEpgHandlers()
}
