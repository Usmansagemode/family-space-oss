import { useQuery, useQueryClient } from '@tanstack/react-query'
import { searchItems } from '@family/supabase'
import type { Space, SearchResult } from '@family/types'

export type { SearchResult }

export function useSearchItems(
  familyId: string,
  query: string,
): { data: SearchResult[] | undefined; isLoading: boolean } {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['search', familyId, query],
    queryFn: async () => {
      const spaces =
        queryClient.getQueryData<Space[]>(['spaces', familyId]) ?? []
      const spaceIds = spaces.map((s) => s.id)
      const items = await searchItems(spaceIds, query)
      return items.flatMap((item) => {
        const space = spaces.find((s) => s.id === item.spaceId)
        return space ? [{ item, space }] : []
      })
    },
    enabled: query.trim().length >= 1,
    staleTime: 0,
  })
}
