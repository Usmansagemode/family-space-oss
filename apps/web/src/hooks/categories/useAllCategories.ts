import { useQuery } from '@tanstack/react-query'
import { fetchAllCategories } from '@family/supabase'
import type { Category } from '@family/types'

/** All categories including archived — for edit dialogs on historical expenses. */
export function useAllCategories(familyId: string) {
  return useQuery<Category[]>({
    queryKey: ['categories', familyId, 'all'],
    queryFn: () => fetchAllCategories(familyId),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 5,
  })
}
