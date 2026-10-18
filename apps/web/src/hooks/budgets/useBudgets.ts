import { useQuery } from '@tanstack/react-query'
import { fetchBudgets } from '@family/supabase'

export function useBudgets(familyId: string) {
  return useQuery({
    queryKey: ['budgets', familyId],
    queryFn: () => fetchBudgets(familyId),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 5,
  })
}
