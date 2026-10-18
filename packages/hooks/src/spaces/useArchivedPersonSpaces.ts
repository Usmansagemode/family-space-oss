import { useQuery } from '@tanstack/react-query'
import { fetchArchivedPersonSpaces } from '@family/supabase'

export function useArchivedPersonSpaces(familyId: string) {
  return useQuery({
    queryKey: ['spaces-archived', familyId],
    queryFn: () => fetchArchivedPersonSpaces(familyId),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 5,
  })
}
