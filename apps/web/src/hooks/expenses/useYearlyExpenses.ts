import { useQuery } from '@tanstack/react-query'
import { fetchExpensesByYear } from '@family/supabase'
import type { ExpenseWithNames } from '@family/types'

export function useYearlyExpenses(familyId: string, year: number) {
  return useQuery<ExpenseWithNames[]>({
    queryKey: ['expenses', 'yearly', familyId, year],
    queryFn: () => fetchExpensesByYear(familyId, year),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 5,
  })
}
