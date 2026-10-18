import { useQuery } from '@tanstack/react-query'
import { findOrCreateFamily } from '@family/supabase'
import type { Family } from '@family/types'

export function useUserFamily(userId: string | undefined) {
  return useQuery<Family>({
    queryKey: ['family', 'user', userId],
    queryFn: () => findOrCreateFamily(),
    enabled: !!userId,
    staleTime: Infinity,
  })
}
