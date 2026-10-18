import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSplitParticipant, deleteSplitParticipant } from '@family/supabase'

export function useSplitParticipantMutations(groupId: string) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['split-participants', groupId] })

  const add = useMutation({
    mutationFn: (name: string) => createSplitParticipant({ groupId, name }),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: deleteSplitParticipant,
    onSuccess: invalidate,
  })

  return { add, remove }
}
