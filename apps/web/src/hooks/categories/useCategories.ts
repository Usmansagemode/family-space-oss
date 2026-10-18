import { useQuery } from '@tanstack/react-query'
import { fetchCategories } from '@family/supabase'
import type { Category } from '@family/types'

export function useCategories(familyId: string) {
  return useQuery<Category[]>({
    queryKey: ['categories', familyId],
    queryFn: () => fetchCategories(familyId),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 5,
  })
}
