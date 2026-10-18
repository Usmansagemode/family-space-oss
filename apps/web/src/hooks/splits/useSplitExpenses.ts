import { useQuery } from '@tanstack/react-query'
import { fetchSplitExpenses } from '@family/supabase'
import type { SplitExpenseWithShares } from '@family/types'

export function useSplitExpenses(groupId: string) {
  return useQuery<SplitExpenseWithShares[]>({
    queryKey: ['split-expenses', groupId],
    queryFn: () => fetchSplitExpenses(groupId),
    enabled: !!groupId,
    staleTime: 1000 * 60 * 2,
  })
}
