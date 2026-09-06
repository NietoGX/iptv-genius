import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AddM3uInput, AddXtreamInput } from '@iptv-genius/ipc-contract'

const sourcesKey = ['sources'] as const

export function useSources() {
  return useQuery({
    queryKey: sourcesKey,
    queryFn: () => window.api.sources.list()
  })
}

export function useAddM3uSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddM3uInput) => window.api.sources.addM3u(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesKey })
  })
}

export function useAddXtreamSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddXtreamInput) => window.api.sources.addXtream(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesKey })
  })
}

export function useRemoveSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => window.api.sources.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesKey })
  })
}

export function useRefreshSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => window.api.sources.refresh(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] })
  })
}
