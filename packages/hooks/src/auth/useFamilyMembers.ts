import { useQuery } from '@tanstack/react-query'
import { fetchFamilyMembers } from '@family/supabase'
import type { FamilyMember } from '@family/types'

export function useFamilyMembers(familyId: string | undefined) {
  return useQuery<FamilyMember[]>({
    queryKey: ['family-members', familyId],
    queryFn: () => fetchFamilyMembers(familyId!),
    enabled: !!familyId,
    staleTime: 30_000,
  })
}
