import { useQuery } from '@tanstack/react-query'
import { fetchItems } from '@family/supabase'

export function useItems(spaceId: string) {
  return useQuery({
    queryKey: ['items', spaceId],
    queryFn: () => fetchItems(spaceId),
    enabled: !!spaceId,
    staleTime: 1000 * 60 * 2,
  })
}
