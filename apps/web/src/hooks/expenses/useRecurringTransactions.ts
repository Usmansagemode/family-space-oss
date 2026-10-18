import { useQuery } from '@tanstack/react-query'
import { fetchRecurringTransactions } from '@family/supabase'

export function useRecurringTransactions(familyId: string) {
  return useQuery({
    queryKey: ['recurring-transactions', familyId],
    queryFn: () => fetchRecurringTransactions(familyId),
    enabled: !!familyId,
  })
}
