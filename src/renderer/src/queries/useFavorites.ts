import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

const favoritesKey = ['favorites'] as const

export function useFavorites() {
  return useQuery({
    queryKey: favoritesKey,
    queryFn: () => window.api.favorites.list()
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ channelId, isFavorite }: { channelId: number; isFavorite: boolean }) => {
      if (isFavorite) await window.api.favorites.remove(channelId)
      else await window.api.favorites.add(channelId)
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
    queryFn: () => window.api.favorites.listCategories(sourceId)
  })
}

export function useToggleFavoriteCategory(sourceId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      groupTitle,
      isFavorite
    }: {
      groupTitle: string | null
      isFavorite: boolean
    }) => {
      if (isFavorite) await window.api.favorites.removeCategory(sourceId, groupTitle)
      else await window.api.favorites.addCategory(sourceId, groupTitle)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: favoriteCategoriesKey(sourceId) })
  })
}
