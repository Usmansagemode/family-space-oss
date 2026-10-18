import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} from '@family/supabase'
import type { RecurringTransaction } from '@family/types'

export function useRecurringTransactionMutations(familyId: string) {
  const queryClient = useQueryClient()
  const key = ['recurring-transactions', familyId]
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key })

  const create = useMutation({
    mutationFn: (input: {
      direction: 'expense' | 'income'
      description: string
      amount: number
      frequency: RecurringTransaction['frequency']
      startDate: string
      nextDueDate: string
      endDate?: string | null
      categoryId?: string | null
      locationId?: string | null
      paidById?: string | null
      personId?: string | null
      incomeType?: RecurringTransaction['incomeType']
    }) => createRecurringTransaction({ familyId, ...input }),
    onSuccess: () => void invalidate(),
  })

  const update = useMutation({
    mutationFn: ({
      id,
      ...input
    }: { id: string } & Parameters<typeof updateRecurringTransaction>[1]) =>
      updateRecurringTransaction(id, input),
    onSuccess: () => void invalidate(),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteRecurringTransaction(id),
    onSuccess: () => void invalidate(),
  })

  return { create, update, remove }
}
