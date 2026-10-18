import { useQuery } from '@tanstack/react-query'
import { fetchExpensesByMonth } from '@family/supabase'
import type { ExpenseWithNames } from '@family/types'

export function useExpenses(familyId: string, year: number, month: number) {
  return useQuery<ExpenseWithNames[]>({
    queryKey: ['expenses', familyId, year, month],
    queryFn: () => fetchExpensesByMonth(familyId, year, month),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 2,
  })
}
