import { useQuery } from '@tanstack/react-query'
import type { ChannelKind } from '@iptv-genius/core'

export function useChannelCategories(sourceId: number | null, kind?: ChannelKind) {
  return useQuery({
    queryKey: ['channels', 'categories', sourceId, kind ?? null],
    queryFn: () => window.api.channels.listCategories(sourceId as number, kind),
    enabled: sourceId !== null
  })
}

export function useChannelsByCategory(
  sourceId: number | null,
  groupTitle: string | null | undefined,
  kind?: ChannelKind
) {
  return useQuery({
    queryKey: ['channels', 'byCategory', sourceId, groupTitle, kind ?? null],
    queryFn: () => window.api.channels.listByCategory(sourceId as number, groupTitle ?? null, kind),
    enabled: sourceId !== null && groupTitle !== undefined
  })
}
