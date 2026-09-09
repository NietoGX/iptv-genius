import { useQuery } from '@tanstack/react-query'
import { fetchEpgSearch, fetchHasGuideData, fetchNowNext, fetchSchedule } from '../services/epgApi'

export function useNowNext(channelId: number) {
  return useQuery({
    queryKey: ['epg', 'nowNext', channelId],
    queryFn: () => fetchNowNext(channelId),
    staleTime: 60_000,
    refetchInterval: 60_000
  })
}

export function useChannelSchedule(channelId: number | null) {
  return useQuery({
    queryKey: ['epg', 'schedule', channelId],
    queryFn: () => fetchSchedule(channelId as number),
    enabled: channelId !== null,
    staleTime: 60_000
  })
}

export function useEpgSearch(sourceId: number | null, query: string) {
  return useQuery({
    queryKey: ['epg', 'search', sourceId, query],
    queryFn: () => fetchEpgSearch(sourceId as number, query),
    enabled: sourceId !== null && query.trim().length > 0
  })
}

export function useHasGuideData(sourceId: number | null) {
  return useQuery({
    queryKey: ['epg', 'hasGuideData', sourceId],
    queryFn: () => fetchHasGuideData(sourceId as number),
    enabled: sourceId !== null,
    staleTime: 30_000
  })
}
