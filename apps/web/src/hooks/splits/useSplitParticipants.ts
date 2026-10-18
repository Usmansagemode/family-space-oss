import { useQuery } from '@tanstack/react-query'
import { fetchSplitParticipants } from '@family/supabase'
import type { SplitParticipant } from '@family/types'

export function useSplitParticipants(groupId: string) {
  return useQuery<SplitParticipant[]>({
    queryKey: ['split-participants', groupId],
    queryFn: () => fetchSplitParticipants(groupId),
    enabled: !!groupId,
    staleTime: 1000 * 60 * 2,
  })
}
