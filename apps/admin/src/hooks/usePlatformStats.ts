import { useQuery } from '@tanstack/react-query'
import { fetchPlatformStats } from '@family/supabase'

export function usePlatformStats() {
  return useQuery({
    queryKey: ['admin', 'platform-stats'],
    queryFn: fetchPlatformStats,
    staleTime: 60 * 1000, // refresh every minute
  })
}
