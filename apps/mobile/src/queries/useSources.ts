import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addM3uSource,
  addXtreamSource,
  listSources,
  refreshSourceById,
  removeSource
} from '../services/sourcesService'
import type { AddM3uInput, AddXtreamInput } from '../services/importSource'

const sourcesKey = ['sources'] as const

export function useSources() {
  return useQuery({
    queryKey: sourcesKey,
    queryFn: listSources
  })
}

export function useAddM3uSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddM3uInput) => addM3uSource(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesKey })
  })
}

export function useAddXtreamSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AddXtreamInput) => addXtreamSource(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesKey })
  })
}

export function useRemoveSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => removeSource(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sourcesKey })
  })
}

export function useRefreshSource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => refreshSourceById(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['channels'] })
  })
}
