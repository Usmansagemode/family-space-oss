import { useQuery } from '@tanstack/react-query'
import { fetchSpaces } from '@family/supabase'

export function useSpaces(familyId: string) {
  return useQuery({
    queryKey: ['spaces', familyId],
    queryFn: () => fetchSpaces(familyId),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 5,
  })
}
