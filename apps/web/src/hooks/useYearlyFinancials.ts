import { useQuery } from '@tanstack/react-query'
import { fetchExpensesByYear, fetchIncomeEntries } from '@family/supabase'

export function useYearlyExpenses(familyId: string, year: number) {
  return useQuery({
    queryKey: ['expenses-year', familyId, year],
    queryFn: () => fetchExpensesByYear(familyId, year),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useYearlyIncome(familyId: string, year: number) {
  return useQuery({
    queryKey: ['income-entries-year', familyId, year],
    queryFn: () => fetchIncomeEntries(familyId, year),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 5,
  })
}
