import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSplitExpense, updateSplitExpense, deleteSplitExpense } from '@family/supabase'
import type { SplitType } from '@family/types'

export function useSplitExpenseMutations(groupId: string, familyId: string) {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['split-expenses', groupId] })

  const create = useMutation({
    mutationFn: (input: {
      paidByParticipantId: string
      amount: number
      description?: string
      date: string
      splitType: SplitType
      shares: Array<{ participantId: string; amount: number }>
    }) => createSplitExpense({ ...input, groupId, familyId }),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: {
        paidByParticipantId?: string
        amount?: number
        description?: string
        date?: string
        splitType?: SplitType
        shares?: Array<{ participantId: string; amount: number }>
      }
    }) => updateSplitExpense(id, input),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: deleteSplitExpense,
    onSuccess: invalidate,
  })

  return { create, update, remove }
}
