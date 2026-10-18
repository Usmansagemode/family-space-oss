import { useQuery } from '@tanstack/react-query'
import { fetchTrackers } from '@family/supabase'
import type { Tracker } from '@family/types'

export function useTrackers(familyId: string) {
  return useQuery<Tracker[]>({
    queryKey: ['trackers', familyId],
    queryFn: () => fetchTrackers(familyId),
    enabled: !!familyId,
    staleTime: 1000 * 60 * 2,
  })
}
