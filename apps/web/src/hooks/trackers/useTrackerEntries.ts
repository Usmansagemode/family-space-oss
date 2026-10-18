import { useQuery } from '@tanstack/react-query'
import { fetchTrackerEntries } from '@family/supabase'
import type { TrackerEntry } from '@family/types'

export function useTrackerEntries(trackerId: string) {
  return useQuery<TrackerEntry[]>({
    queryKey: ['tracker-entries', trackerId],
    queryFn: () => fetchTrackerEntries(trackerId),
    enabled: !!trackerId,
    staleTime: 1000 * 60 * 2,
  })
}
