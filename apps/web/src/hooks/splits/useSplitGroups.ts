import { useQuery } from '@tanstack/react-query'
import { fetchSplitGroups } from '@family/supabase'
import type { SplitGroup } from '@family/types'

export function useSplitGroups(familyId: string) {
  return useQuery<SplitGroup[]>({
    queryKey: ['split-groups', familyId],
    queryFn: () => fetchSplitGroups(familyId),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 2,
  })
}
