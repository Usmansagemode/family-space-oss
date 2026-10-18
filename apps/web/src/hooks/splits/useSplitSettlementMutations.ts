import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSplitSettlement, deleteSplitSettlement } from '@family/supabase'

export function useSplitSettlementMutations(groupId: string, familyId: string) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['split-settlements', groupId] })

  const record = useMutation({
    mutationFn: (input: {
      fromParticipantId: string
      toParticipantId: string
      amount: number
      note?: string
      date: string
    }) => createSplitSettlement({ ...input, groupId, familyId }),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: deleteSplitSettlement,
    onSuccess: invalidate,
  })

  return { record, remove }
}
