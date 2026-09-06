import { useQuery } from '@tanstack/react-query'

export function useNowNext(channelId: number) {
  return useQuery({
    queryKey: ['epg', 'nowNext', channelId],
    queryFn: () => window.api.epg.getNowNext(channelId),
    staleTime: 60_000,
    refetchInterval: 60_000
  })
}

export function useChannelSchedule(channelId: number | null) {
  return useQuery({
    queryKey: ['epg', 'schedule', channelId],
    queryFn: () => window.api.epg.getSchedule(channelId as number),
    enabled: channelId !== null,
    staleTime: 60_000
  })
}

export function useEpgSearch(sourceId: number | null, query: string) {
  return useQuery({
    queryKey: ['epg', 'search', sourceId, query],
    queryFn: () => window.api.epg.search(sourceId as number, query),
    enabled: sourceId !== null && query.trim().length > 0
  })
}

export function useHasGuideData(sourceId: number | null) {
  return useQuery({
    queryKey: ['epg', 'hasGuideData', sourceId],
    queryFn: () => window.api.epg.hasGuideData(sourceId as number),
    enabled: sourceId !== null,
    staleTime: 30_000
  })
}
