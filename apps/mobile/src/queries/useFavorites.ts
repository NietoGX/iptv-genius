import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addFavorite,
  addFavoriteCategory,
  listFavoriteCategories,
  listFavorites,
  removeFavorite,
  removeFavoriteCategory
} from '../services/favoritesService'

const favoritesKey = ['favorites'] as const

export function useFavorites() {
  return useQuery({
    queryKey: favoritesKey,
    queryFn: listFavorites
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ channelId, isFavorite }: { channelId: number; isFavorite: boolean }) => {
      if (isFavorite) await removeFavorite(channelId)
      else await addFavorite(channelId)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: favoritesKey })
  })
}

function favoriteCategoriesKey(sourceId: number) {
  return ['favoriteCategories', sourceId] as const
}

export function useFavoriteCategories(sourceId: number) {
  return useQuery({
    queryKey: favoriteCategoriesKey(sourceId),
    queryFn: () => listFavoriteCategories(sourceId)
  })
}

export function useToggleFavoriteCategory(sourceId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ groupTitle, isFavorite }: { groupTitle: string | null; isFavorite: boolean }) => {
      if (isFavorite) await removeFavoriteCategory(sourceId, groupTitle)
      else await addFavoriteCategory(sourceId, groupTitle)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: favoriteCategoriesKey(sourceId) })
  })
}
