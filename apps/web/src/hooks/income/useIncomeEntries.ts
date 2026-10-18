import { useQuery } from '@tanstack/react-query'
import { fetchIncomeEntries } from '@family/supabase'

export function useIncomeEntries(familyId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['income-entries', familyId, year, month],
    queryFn: () => fetchIncomeEntries(familyId, year, month),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 2,
  })
}
