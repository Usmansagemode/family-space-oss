import { useQuery } from '@tanstack/react-query'
import { fetchSplitSettlements } from '@family/supabase'
import type { SplitSettlement } from '@family/types'

export function useSplitSettlements(groupId: string) {
  return useQuery<SplitSettlement[]>({
    queryKey: ['split-settlements', groupId],
    queryFn: () => fetchSplitSettlements(groupId),
    enabled: !!groupId,
    staleTime: 1000 * 60 * 2,
  })
}
